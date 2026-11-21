"""Pure-Python Hop 1-5 governance policy primitives for Blog 1 (WS1).

Separated from FastAPI / GCP network calls so both unit tests and the live
Cloud Run container execute the exact same fail-closed validation logic.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from dataclasses import dataclass
from typing import Any

TENANT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,39}$")

# Hop 2: Agent Registry Discovery (ARD) visibility matrix
AGENT_CATALOG: dict[str, dict[str, Any]] = {
    "agent://cymbal/shared-diagnostic-v2": {"visibility": "PUBLIC", "owner": "cymbal"},
    "agent://finvault/private-agent-alpha": {"visibility": "PRIVATE", "owner": "finvault"},
}

# Hop 4: Tenant-specific Semantic Natural Language Constraints (NLCs)
SEMANTIC_NLC_RULES: dict[str, list[re.Pattern[str]]] = {
    "finvault": [
        re.compile(r"suppress\s+occ\s+escalation", re.IGNORECASE),
        re.compile(r"exfiltrate\s+cross-tenant", re.IGNORECASE),
    ],
    "retailstream": [
        re.compile(r"exfiltrate\s+cross-tenant", re.IGNORECASE),
    ],
}

# Hop 4: Egress PII redaction patterns (SSN, IBAN)
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")


@dataclass(frozen=True)
class HopDecision:
    allowed: bool
    http_status: int
    code: str
    detail: str


def validate_tenant_id(tenant_id: str) -> str:
    cleaned = str(tenant_id or "").strip().lower()
    if not TENANT_ID_RE.fullmatch(cleaned):
        raise ValueError("Invalid tenant_id format")
    return cleaned


def enforce_hop1_anti_spoofing(
    verified_tenant_id: str,
    forged_header_tenant: str | None,
) -> HopDecision:
    """Hop 1 PEP: Reject requests whose untrusted X-Tenant-ID disagrees with the verified identity."""
    vt = validate_tenant_id(verified_tenant_id)
    if forged_header_tenant:
        fh = str(forged_header_tenant).strip().lower()
        if fh != vt:
            return HopDecision(
                allowed=False,
                http_status=403,
                code="HOP1_HEADER_SPOOF_BLOCKED",
                detail="Untrusted X-Tenant-ID header does not match authenticated caller context.",
            )
    return HopDecision(allowed=True, http_status=200, code="HOP1_ALLOW", detail="Verified caller context accepted.")


def enforce_hop2_ard_visibility(verified_tenant_id: str, agent_uri: str) -> HopDecision:
    """Hop 2 PDP: Enforce tenant visibility boundaries across Agent Registry Discovery."""
    vt = validate_tenant_id(verified_tenant_id)
    meta = AGENT_CATALOG.get(agent_uri)
    if meta is None:
        return HopDecision(False, 404, "HOP2_AGENT_NOT_FOUND", "Requested agent URI is not registered.")
    if meta["visibility"] == "PRIVATE" and meta["owner"] != vt:
        return HopDecision(
            allowed=False,
            http_status=403,
            code="HOP2_ARD_FORBIDDEN",
            detail="Caller tenant is not authorized to invoke this private agent.",
        )
    return HopDecision(True, 200, "HOP2_ALLOW", "Agent URI authorized by ARD catalog policy.")


def enforce_hop4_semantic_nlc(verified_tenant_id: str, prompt: str) -> HopDecision:
    """Hop 4: Evaluate deterministic tenant regulatory constraints before inference."""
    vt = validate_tenant_id(verified_tenant_id)
    for pattern in SEMANTIC_NLC_RULES.get(vt, ()):
        if pattern.search(prompt or ""):
            return HopDecision(
                allowed=False,
                http_status=422,
                code="HOP4_SEMANTIC_NLC_VIOLATION",
                detail="Prompt violated tenant regulatory constraint policy.",
            )
    return HopDecision(True, 200, "HOP4_NLC_ALLOW", "No semantic NLC violation detected.")


def redact_egress_pii(text: str) -> str:
    """Hop 4 Egress DLP fallback scrubber for SSN/IBAN patterns."""
    masked = _SSN_RE.sub("[REDACTED-SSN]", text or "")
    return _IBAN_RE.sub("[REDACTED-IBAN]", masked)


def build_unsigned_jwt_input(tenant_id: str, actor_sub: str, ttl_seconds: int = 300) -> tuple[str, dict[str, Any]]:
    """Build RFC 7515 ES256 signing input for Cloud KMS EC_SIGN_P256_SHA256."""
    vt = validate_tenant_id(tenant_id)
    now = int(time.time())
    header = {"alg": "ES256", "typ": "JWT"}
    payload = {
        "iss": "cymbal-hop1-pep",
        "sub": actor_sub[:120],
        "tenant_id": vt,
        "iat": now,
        "exp": now + max(60, min(ttl_seconds, 900)),
    }
    b64 = lambda obj: base64.urlsafe_b64encode(
        json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signing_input = f"{b64(header)}.{b64(payload)}"
    return signing_input, payload


def hash_prompt_zero_pii(prompt: str) -> str:
    """Compute SHA-256 prompt digest for zero-PII audit logs."""
    return hashlib.sha256((prompt or "").encode("utf-8")).hexdigest()
