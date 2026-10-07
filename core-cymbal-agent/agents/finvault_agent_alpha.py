"""
FinVault Bank Private 'Agent Alpha' (`agent://finvault/private-agent-alpha-regulatory`).

Built by FinVault Bank (Enterprise Tier) via REST API / `agents-cli`:
- Self-service Regulatory Escalation Agent provisioned via REST API / `agents-cli`.
- Multi-Model Agnosticism: Runs Claude Sonnet (`claude-3-7-sonnet@20250219`) on
  Vertex AI Model Garden with hot-swappable model configuration.
- 100% isolated to `finvault`; returns 403 Forbidden to `retailstream`.
"""

from typing import Dict, List, Optional
from ..models import CryptographicContext, TENANT_PROFILES, TenantProfile


ALLOWED_MODEL_GARDEN_MODELS = {
    "claude-3-7-sonnet@20250219",
    "claude-3-5-sonnet-v2@20241022",
    "gemini-2.5-pro",
    "gemma-3-27b-it",
}


class FinVaultPrivateAgentAlpha:
    AGENT_URI = "agent://finvault/private-agent-alpha-regulatory"

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES
        self.active_model: str = "claude-3-7-sonnet@20250219"
        self.provisioned_manifest: Dict[str, object] = {
            "agent_uri": self.AGENT_URI,
            "owner_tenant": "finvault",
            "provisioned_via": "agents-cli / REST API (POST /v1/projects/cymbal-pooled-saas-prod/locations/us-central1/agents)",
            "model_garden_endpoint": self.active_model,
        }

    def provision_via_agents_cli(
        self, caller_ctx: CryptographicContext, model_id: str = "claude-3-7-sonnet@20250219"
    ) -> Dict[str, object]:
        """Simulates self-service provisioning via `agents-cli deploy --agent=finvault-agent-alpha`."""
        if caller_ctx.tenant_id != "finvault":
            raise PermissionError(
                f"403 Forbidden: Tenant '{caller_ctx.tenant_id}' is not authorized to provision or modify Agent Alpha."
            )
        self.hot_swap_model(caller_ctx=caller_ctx, new_model_id=model_id)
        return dict(self.provisioned_manifest)

    def hot_swap_model(self, caller_ctx: CryptographicContext, new_model_id: str) -> str:
        """Hot-swaps Agent Alpha's backing model on Vertex AI Model Garden without downtime."""
        if caller_ctx.tenant_id != "finvault":
            raise PermissionError(
                f"403 Forbidden: Tenant '{caller_ctx.tenant_id}' cannot hot-swap FinVault Agent Alpha model."
            )
        if new_model_id not in ALLOWED_MODEL_GARDEN_MODELS:
            raise ValueError(f"Unsupported Model Garden identifier '{new_model_id}'.")
        self.active_model = new_model_id
        self.provisioned_manifest["model_garden_endpoint"] = new_model_id
        return self.active_model

    def execute_regulatory_escalation(
        self,
        ctx: CryptographicContext,
        user_prompt: str,
        rls_incidents: List[Dict[str, str]],
        active_model_override: str = "",
    ) -> str:
        if ctx.tenant_id != "finvault":
            raise PermissionError("403 Forbidden: Agent Alpha is strictly isolated to FinVault Bank.")
        profile = self.tenant_profiles["finvault"]
        model_used = active_model_override or self.active_model or profile.custom_agent_model
        incident_summaries = "; ".join(
            f"[{row['incident_id']}] {row['summary']}" for row in rls_incidents
        )
        return (
            f"[FinVault-AgentAlpha • ModelGarden={model_used} • CMEK={profile.cmek_key_uri}] "
            f"Prepared OCC/FDIC regulatory escalation dossier for: {incident_summaries}"
        )
