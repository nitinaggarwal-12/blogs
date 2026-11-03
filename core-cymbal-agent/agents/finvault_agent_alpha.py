"""
FinVault Bank Private 'Agent Alpha' (`agent://finvault/private-agent-alpha-regulatory`).

Built by FinVault Bank (Enterprise Tier) via Vertex AI Agent Engine (`reasoningEngines` REST API):
- Self-service Regulatory Escalation Agent deployed to Vertex AI Agent Engine.
- Multi-Model Agnosticism: Runs `gemini-2.5-pro` with Provisioned Throughput
  (`X-Vertex-AI-LLM-Request-Type: dedicated`) and supports hot-swapping across real Model Garden IDs.
- 100% isolated to `finvault`; returns 403 Forbidden to `retailstream`.
"""

from typing import Dict, List, Optional
from ..models import CryptographicContext, TENANT_PROFILES, TenantProfile


ALLOWED_MODEL_GARDEN_MODELS = {
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-27b-it",
}


class FinVaultPrivateAgentAlpha:
    AGENT_URI = "agent://finvault/private-agent-alpha-regulatory"

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES
        self.active_model: str = "gemini-2.5-pro"
        self.request_type: str = "dedicated"
        self.provisioned_manifest: Dict[str, object] = {
            "agent_uri": self.AGENT_URI,
            "owner_tenant": "finvault",
            "provisioned_via": (
                "Vertex AI Agent Engine REST API "
                "(POST /v1beta1/projects/cymbal-pooled-saas-prod/locations/us-central1/reasoningEngines)"
            ),
            "model_garden_endpoint": self.active_model,
            "vertex_llm_request_type": self.request_type,
            "vertex_headers": {"X-Vertex-AI-LLM-Request-Type": self.request_type},
        }

    def provision_via_agents_cli(
        self,
        caller_ctx: CryptographicContext,
        model_id: str = "gemini-2.5-pro",
        request_type: str = "dedicated",
    ) -> Dict[str, object]:
        """Provisions FinVault Agent Alpha via ADK / Vertex AI Agent Engine (`reasoningEngines`)."""
        if caller_ctx.tenant_id != "finvault":
            raise PermissionError(
                f"403 Forbidden: Tenant '{caller_ctx.tenant_id}' is not authorized to provision or modify Agent Alpha."
            )
        self.hot_swap_model(caller_ctx=caller_ctx, new_model_id=model_id, request_type=request_type)
        return dict(self.provisioned_manifest)

    def hot_swap_model(
        self,
        caller_ctx: CryptographicContext,
        new_model_id: str,
        request_type: Optional[str] = None,
    ) -> str:
        """Hot-swaps Agent Alpha's backing model on Vertex AI Model Garden without downtime."""
        if caller_ctx.tenant_id != "finvault":
            raise PermissionError(
                f"403 Forbidden: Tenant '{caller_ctx.tenant_id}' cannot hot-swap FinVault Agent Alpha model."
            )
        normalized_model = new_model_id
        effective_req_type = request_type or self.request_type
        if normalized_model.endswith("-dedicated"):
            normalized_model = normalized_model.removesuffix("-dedicated")
            effective_req_type = "dedicated"
        if normalized_model not in ALLOWED_MODEL_GARDEN_MODELS:
            raise ValueError(f"Unsupported Model Garden identifier '{new_model_id}'.")
        self.active_model = normalized_model
        self.request_type = effective_req_type
        self.provisioned_manifest["model_garden_endpoint"] = normalized_model
        self.provisioned_manifest["vertex_llm_request_type"] = effective_req_type
        self.provisioned_manifest["vertex_headers"] = {"X-Vertex-AI-LLM-Request-Type": effective_req_type}
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
        req_type = profile.custom_agent_request_type or self.request_type
        incident_summaries = "; ".join(
            f"[{row['incident_id']}] {row['summary']}" for row in rls_incidents
        )
        return (
            f"[FinVault-AgentAlpha • ModelGarden={model_used} • RequestType={req_type} • CMEK={profile.cmek_key_uri}] "
            f"Prepared OCC/FDIC regulatory escalation dossier for: {incident_summaries}"
        )
