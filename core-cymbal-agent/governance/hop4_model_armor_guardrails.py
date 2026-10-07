"""
Hop 4 — Vertex AI Model Armor (Ingress Prompt Screen & Egress DLP) + Semantic NLCs.

Enforces Governance Pillar 4 (Guardrails, Data & Audit — Part 1):
1. Screens ingress user prompts for prompt injection, jailbreaks, cross-tenant
   context cache extraction attempts, and SQL RLS bypass payloads.
2. Actively evaluates and enforces tenant-specific Semantic Natural Language
   Constraints (NLCs) (e.g., blocking attempts to suppress FinVault OCC/FDIC
   regulatory escalation or bypass RetailStream PCI redaction).
3. Scrubs egress responses using Sensitive Data Protection (SDP) detectors
   tailored to each tenant (Bank Account / IBAN / SWIFT redaction for FinVault vs.
   Payment Card PAN redaction for RetailStream).
"""

import re
from typing import Dict, Optional, Tuple
from ..models import CryptographicContext, HopAuditRecord, TENANT_PROFILES, TenantProfile


PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"dump\s+context\s*cache",
    r"select\s+\*\s+from\s+incidents\s+where\s+tenant_id",
    r"set\s+local\s+app\.current_tenant",
    r"switch\s+tenant\s+to",
]

PII_REGEX_DETECTORS = {
    "US_BANK_ACCOUNT_NUMBER": (r"\bACCT-\d{8,12}\b", "[REDACTED-FINVAULT-BANK-ACCOUNT]"),
    "IBAN_CODE": (r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b", "[REDACTED-FINVAULT-IBAN]"),
    "SWIFT_CODE": (r"\bSWIFT-[A-Z]{6}[A-Z0-9]{2,5}\b", "[REDACTED-FINVAULT-SWIFT]"),
    "CREDIT_CARD_NUMBER": (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[REDACTED-RETAILSTREAM-PAYMENT-PAN]"),
    "EMAIL_ADDRESS": (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[REDACTED-EMAIL]"),
}


class ModelArmorGuardrails:
    """Simulates Vertex AI Model Armor + Semantic NLCs + Sensitive Data Protection (SDP) at Hop 4."""

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES

    def evaluate_semantic_nlcs(
        self, ctx: CryptographicContext, text_payload: str
    ) -> Optional[str]:
        """Checks whether a prompt or response violates tenant-specific Semantic NLCs."""
        profile = self.tenant_profiles[ctx.tenant_id]
        for forbidden_pattern in profile.forbidden_nlc_patterns:
            if re.search(forbidden_pattern, text_payload, flags=re.IGNORECASE):
                return forbidden_pattern
        return None

    def screen_ingress_prompt(
        self, ctx: CryptographicContext, user_prompt: str
    ) -> HopAuditRecord:
        # 1. Screen for adversarial prompt injection / cache extraction
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, user_prompt, flags=re.IGNORECASE):
                return HopAuditRecord(
                    hop_number=4,
                    hop_name="Hop 4 • Vertex AI Model Armor (Ingress Screen)",
                    decision="DENY",
                    status_code=400,
                    detail=(
                        f"MODEL_ARMOR_PROMPT_INJECTION_BLOCKED: Detected adversarial pattern "
                        f"matching '{pattern}' from tenant '{ctx.tenant_id}'."
                    ),
                    metadata={"matched_rule": pattern},
                )

        # 2. Enforce tenant-specific Semantic NLCs
        violated_nlc = self.evaluate_semantic_nlcs(ctx=ctx, text_payload=user_prompt)
        if violated_nlc:
            return HopAuditRecord(
                hop_number=4,
                hop_name="Hop 4 • Semantic NLC Enforcement",
                decision="DENY",
                status_code=422,
                detail=(
                    f"SEMANTIC_NLC_VIOLATION: Prompt violated tenant '{ctx.tenant_id}' "
                    f"regulatory/compliance constraint '{violated_nlc}'."
                ),
                metadata={"violated_nlc_pattern": violated_nlc},
            )

        profile = self.tenant_profiles[ctx.tenant_id]
        return HopAuditRecord(
            hop_number=4,
            hop_name="Hop 4 • Vertex AI Model Armor (Ingress Screen & Semantic NLCs)",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Prompt cleared Model Armor ingress screen & {len(profile.semantic_nlc_rules)} "
                f"Semantic NLC rule(s) for '{ctx.tenant_id}'."
            ),
            metadata={"active_nlcs": profile.semantic_nlc_rules},
        )

    def sanitize_egress_response(
        self, ctx: CryptographicContext, raw_response: str
    ) -> Tuple[str, HopAuditRecord]:
        profile = self.tenant_profiles[ctx.tenant_id]
        sanitized = raw_response
        redactions_applied = []

        for detector_name in profile.pii_redaction_detectors:
            if detector_name in PII_REGEX_DETECTORS:
                regex, replacement = PII_REGEX_DETECTORS[detector_name]
                if re.search(regex, sanitized):
                    sanitized = re.sub(regex, replacement, sanitized)
                    redactions_applied.append(detector_name)

        audit = HopAuditRecord(
            hop_number=4,
            hop_name="Hop 4 • Vertex AI Model Armor (Egress SDP Redaction)",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Model Armor Egress DLP completed for '{ctx.tenant_id}'; "
                f"redacted {len(redactions_applied)} detector category(s): {redactions_applied}."
            ),
            metadata={"redacted_detectors": redactions_applied},
        )
        return sanitized, audit
