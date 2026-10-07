"""
Hop 2 — Registry PDP, ARD Catalog Filtering & ADK `before_agent_callback` Tool Pruning.

Enforces Governance Pillar 1 (Catalog & Agent Visibility):
1. Filters GEAP Agent Registry (PDP) by cryptographic tenant labels.
2. Filters ARD (Agent Resource Descriptor) catalog entries so tenants cannot
   enumerate private agents or MCP connectors belonging to other tenants.
3. Blocks unauthorized direct agent invocations with `403 Forbidden`
   (e.g., RetailStream attempting to invoke FinVault's private 'Agent Alpha').
4. Executes ADK 2.0 `before_agent_callback` deterministic tool pruning so an
   agent cannot discover or invoke another tenant's MCP connectors mid-turn.
"""

from typing import Dict, List, Optional, Tuple
from ..models import CryptographicContext, HopAuditRecord, TENANT_PROFILES, TenantProfile


GLOBAL_AGENT_REGISTRY = {
    "agent://cymbal/shared-incident-diagnostic-v2": {
        "owner": "cymbal-platform",
        "visibility": "shared",
        "tenant_allowlist": ["finvault", "retailstream"],
    },
    "agent://finvault/private-agent-alpha-regulatory": {
        "owner": "finvault",
        "visibility": "private",
        "tenant_allowlist": ["finvault"],
    },
}

GLOBAL_MCP_CATALOG = [
    "mcp://cymbal/core-telemetry-2lo",
    "mcp://finvault/google-workspace-3lo",
    "mcp://finvault/jira-enterprise-3lo",
    "mcp://retailstream/sharepoint-runbooks-3lo",
    "mcp://retailstream/servicenow-itom-3lo",
]


class RegistryPDP:
    """Simulates GEAP Agent Registry PDP + ARD Catalog Filtering + ADK `before_agent_callback` at Hop 2."""

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES

    def filter_ard_catalog(self, ctx: CryptographicContext) -> Dict[str, List[str]]:
        """
        ARD (Agent Resource Descriptor) Catalog Filtering (Slide 8 Pillar 1).
        Returns strictly the agents, MCP connectors, and GCS Skills scoped to `ctx.tenant_id`.
        """
        profile = self.tenant_profiles[ctx.tenant_id]
        return {
            "visible_agents": list(profile.allowed_agents),
            "visible_mcp_connectors": list(profile.allowed_mcp_connectors),
            "visible_gcs_skills": list(profile.gcs_skills_uris),
        }

    def list_visible_agents(self, ctx: CryptographicContext) -> List[str]:
        return self.filter_ard_catalog(ctx)["visible_agents"]

    def authorize_agent_and_prune_tools(
        self,
        ctx: CryptographicContext,
        requested_agent_uri: str,
        requested_mcp_tools: List[str],
    ) -> Tuple[List[str], HopAuditRecord]:
        profile = self.tenant_profiles[ctx.tenant_id]
        ard_catalog = self.filter_ard_catalog(ctx)

        # 1. Verify agent visibility in GEAP Agent Registry PDP & ARD Catalog
        if requested_agent_uri not in ard_catalog["visible_agents"]:
            audit = HopAuditRecord(
                hop_number=2,
                hop_name="Hop 2 • GEAP Registry PDP, ARD Filter & ADK before_agent_callback",
                decision="DENY",
                status_code=403,
                detail=(
                    f"403 Forbidden: Tenant '{ctx.tenant_id}' is not authorized to discover or invoke "
                    f"'{requested_agent_uri}'."
                ),
                metadata={
                    "requested_agent": requested_agent_uri,
                    "ard_filtered_catalog": ard_catalog,
                },
            )
            return [], audit

        # 2. ADK `before_agent_callback`: Prune any MCP tool not explicitly in the tenant's ARD catalog
        pruned_tools = [t for t in requested_mcp_tools if t in ard_catalog["visible_mcp_connectors"]]
        removed_tools = [t for t in requested_mcp_tools if t not in ard_catalog["visible_mcp_connectors"]]

        audit = HopAuditRecord(
            hop_number=2,
            hop_name="Hop 2 • GEAP Registry PDP, ARD Filter & ADK before_agent_callback",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Authorized '{requested_agent_uri}' for tenant '{ctx.tenant_id}'. "
                f"ARD catalog bound {len(pruned_tools)} MCP tool(s) & {len(ard_catalog['visible_gcs_skills'])} GCS Skill(s); "
                f"pruned {len(removed_tools)} unauthorized tool(s)."
            ),
            metadata={
                "authorized_agent": requested_agent_uri,
                "ard_filtered_catalog": ard_catalog,
                "bound_mcp_tools": pruned_tools,
                "pruned_unauthorized_tools": removed_tools,
            },
        )
        return pruned_tools, audit
