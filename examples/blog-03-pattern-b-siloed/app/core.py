"""Pure-Python Pattern B Sovereign Silo fail-closed CMEK kill-switch & egress perimeter logic."""
from __future__ import annotations

import re
from dataclasses import dataclass

PROJECT_ID_RE = re.compile(r"^[a-z][a-z0-9-]{4,29}$")


@dataclass(frozen=True)
class SiloGuardVerdict:
    allowed: bool
    http_status: int
    code: str
    detail: str


def evaluate_cmek_key_state(kms_state: str) -> SiloGuardVerdict:
    """Fail closed with HTTP 423 LOCKED whenever the customer CMEK key version is not ENABLED."""
    normalized = str(kms_state or "").strip().upper()
    if normalized == "ENABLED":
        return SiloGuardVerdict(True, 200, "CMEK_ENABLED", "Customer CMEK key version is ENABLED.")
    return SiloGuardVerdict(
        allowed=False,
        http_status=423,
        code="CMEK_KILLSWITCH_LOCKED",
        detail=f"Vault locked: customer CMEK key version state is {normalized or 'UNKNOWN'} (fail-closed HTTP 423).",
    )


def evaluate_vpc_sc_egress_boundary(allowed_project_id: str, target_project_id: str | None) -> SiloGuardVerdict:
    """Fail closed with HTTP 403 if an agent attempts cross-perimeter data egress outside its silo project."""
    if not target_project_id:
        return SiloGuardVerdict(True, 200, "PERIMETER_INTERNAL_ALLOW", "Request remains inside sovereign silo project.")
    tgt = str(target_project_id).strip().lower()
    if not PROJECT_ID_RE.fullmatch(tgt) or tgt != str(allowed_project_id).strip().lower():
        return SiloGuardVerdict(
            allowed=False,
            http_status=403,
            code="VPC_SC_EGRESS_DENIED",
            detail="Cross-perimeter egress outside the dedicated sovereign silo project is blocked.",
        )
    return SiloGuardVerdict(True, 200, "PERIMETER_ALLOW", "Target project matches sovereign silo boundary.")
