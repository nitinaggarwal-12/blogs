"""
Core data models for the Cymbal Multi-Tenant Agentic AI Platform (GEAP & ADK 2.0).
Shared across Workstream 2 (Pooled), Workstream 3 (Siloed), and Workstream 4 (Hybrid).
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class TenantTier(str, Enum):
    STANDARD = "STANDARD"       # e.g., RetailStream Corp (Pooled, 4,000 thinking cap)
    ENTERPRISE = "ENTERPRISE"   # e.g., FinVault Bank (8,000 thinking cap, custom agents, CMEK)


class IdentityProvider(str, Enum):
    GOOGLE_WORKSPACE_OIDC = "GOOGLE_WORKSPACE_OIDC"
    MICROSOFT_ENTRA_ID = "MICROSOFT_ENTRA_ID"


class IsolationTopology(str, Enum):
    PATTERN_A_POOLED = "PATTERN_A_POOLED"
    PATTERN_B_SILOED = "PATTERN_B_SILOED"
    PATTERN_C_HYBRID_POOL = "PATTERN_C_HYBRID_POOL"
    PATTERN_C_HYBRID_PSC_SPOKE = "PATTERN_C_HYBRID_PSC_SPOKE"


class MemoryBankLevel(str, Enum):
    L1_TURN_EPHEMERAL = "L1_TURN_EPHEMERAL"
    L2_SESSION_SHORT_TERM = "L2_SESSION_SHORT_TERM"
    L3_USER_WORKING = "L3_USER_WORKING"
    L4_TENANT_EPISODIC = "L4_TENANT_EPISODIC"
    L5_PLATFORM_SHARED_SKILLS = "L5_PLATFORM_SHARED_SKILLS"


@dataclass(frozen=True)
class TenantProfile:
    tenant_id: str
    display_name: str
    tier: TenantTier
    idp: IdentityProvider
    thinking_token_budget: int
    redis_rpm_limit: int
    allowed_agents: List[str]
    allowed_mcp_connectors: List[str]
    primary_model: str
    custom_agent_model: Optional[str]
    cmek_key_uri: Optional[str]
    silo_cmek_key_uri: str
    system_prompt_template: str
    gcs_skills_uris: List[str]
    semantic_nlc_rules: List[str]
    forbidden_nlc_patterns: List[str]
    pii_redaction_detectors: List[str]
    dedicated_project_id: str
    psc_service_attachment: Optional[str] = None


# Canonical Cymbal Anchor Case Study Tenants (Slides 7, 8 & 11)
TENANT_PROFILES: Dict[str, TenantProfile] = {
    "finvault": TenantProfile(
        tenant_id="finvault",
        display_name="FinVault Bank",
        tier=TenantTier.ENTERPRISE,
        idp=IdentityProvider.GOOGLE_WORKSPACE_OIDC,
        thinking_token_budget=8000,
        redis_rpm_limit=600,
        allowed_agents=[
            "agent://cymbal/shared-incident-diagnostic-v2",
            "agent://finvault/private-agent-alpha-regulatory",
        ],
        allowed_mcp_connectors=[
            "mcp://cymbal/core-telemetry-2lo",
            "mcp://finvault/google-workspace-3lo",
            "mcp://finvault/jira-enterprise-3lo",
        ],
        primary_model="gemini-2.5-pro",
        custom_agent_model="claude-3-7-sonnet@20250219",
        cmek_key_uri="projects/cymbal-finvault-silo-prod/locations/us-central1/keyRings/finvault-kr/cryptoKeys/agent-memory-cmek",
        silo_cmek_key_uri="projects/cymbal-finvault-silo-prod/locations/us-central1/keyRings/finvault-kr/cryptoKeys/agent-memory-cmek",
        system_prompt_template="FinVault Regulated Banking SRE Diagnostic Policy (OCC/FDIC Tier-1).",
        gcs_skills_uris=[
            "gs://cymbal-skills-finvault/sre/wire-settlement-runbook-skill.yaml",
            "gs://cymbal-skills-finvault/compliance/occ-fdic-escalation-skill.yaml",
        ],
        semantic_nlc_rules=[
            "NEVER disclose wire routing numbers, SWIFT BICs, or unmasked IBANs in incident summaries.",
            "Escalate any outage exceeding 15 minutes on Core Ledger to OCC/FDIC compliance workflow via Agent Alpha.",
        ],
        forbidden_nlc_patterns=[
            r"suppress\s+occ\s+escalation",
            r"skip\s+fdic\s+audit",
            r"print\s+unmasked\s+iban",
        ],
        pii_redaction_detectors=["US_BANK_ACCOUNT_NUMBER", "IBAN_CODE", "SWIFT_CODE", "EMAIL_ADDRESS"],
        dedicated_project_id="cymbal-finvault-silo-prod",
        psc_service_attachment="projects/cymbal-finvault-silo-prod/regions/us-central1/serviceAttachments/finvault-agent-spoke-psc",
    ),
    "retailstream": TenantProfile(
        tenant_id="retailstream",
        display_name="RetailStream Corp",
        tier=TenantTier.STANDARD,
        idp=IdentityProvider.MICROSOFT_ENTRA_ID,
        thinking_token_budget=4000,
        redis_rpm_limit=120,
        allowed_agents=[
            "agent://cymbal/shared-incident-diagnostic-v2",
        ],
        allowed_mcp_connectors=[
            "mcp://cymbal/core-telemetry-2lo",
            "mcp://retailstream/sharepoint-runbooks-3lo",
            "mcp://retailstream/servicenow-itom-3lo",
        ],
        primary_model="gemini-2.5-pro",
        custom_agent_model=None,
        cmek_key_uri=None,  # Standard Pooled tier uses Google-managed encryption; Pattern B Silo uses silo_cmek_key_uri
        silo_cmek_key_uri="projects/cymbal-retailstream-silo-prod/locations/us-central1/keyRings/retailstream-kr/cryptoKeys/agent-memory-cmek",
        system_prompt_template="RetailStream E-Commerce Checkout & ITOM Diagnostic Policy (PCI-DSS).",
        gcs_skills_uris=[
            "gs://cymbal-skills-retailstream/itom/checkout-latency-skill.yaml",
            "gs://cymbal-skills-retailstream/servicenow/incident-triage-skill.yaml",
        ],
        semantic_nlc_rules=[
            "NEVER output customer credit card PANs, CVVs, or loyalty account tokens in diagnostic logs.",
            "Route P1 checkout latency incidents to ServiceNow ITOM queue.",
        ],
        forbidden_nlc_patterns=[
            r"export\s+raw\s+cvv",
            r"bypass\s+pci\s+redaction",
        ],
        pii_redaction_detectors=["CREDIT_CARD_NUMBER", "CCN_TRACK_DATA", "PHONE_NUMBER"],
        dedicated_project_id="cymbal-retailstream-silo-prod",
        psc_service_attachment=None,
    ),
}


@dataclass(frozen=True)
class CryptographicContext:
    """Immutable 5-Hop Cryptographic Context minted at Hop 1 and verified at Hops 2-5."""
    tenant_id: str
    user_principal: str
    tier: TenantTier
    idp: IdentityProvider
    obo_access_token_hash: str
    dpop_jkt_thumbprint: str
    session_id: str
    stripped_forged_headers: List[str] = field(default_factory=list)
    active_topology: IsolationTopology = IsolationTopology.PATTERN_A_POOLED

    @property
    def temp_tenant_id(self) -> str:
        """Immutable ADK runtime key (`temp:tenant_id`)."""
        return f"temp:tenant_id:{self.tenant_id}"

    @property
    def memory_bank_namespace(self) -> str:
        """5-Level Memory Bank key (`{tenant}:{user}:{session}`)."""
        return f"{self.tenant_id}:{self.user_principal}:{self.session_id}"


@dataclass
class HopAuditRecord:
    hop_number: int
    hop_name: str
    decision: str  # "ALLOW", "DENY", or "CHALLENGE_3LO_OAUTH"
    status_code: int
    detail: str
    metadata: Dict[str, object] = field(default_factory=dict)
