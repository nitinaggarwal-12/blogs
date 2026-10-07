"""
End-to-End 5-Hop Cryptographic Context Chain Orchestrator (`CymbalMultiTenantRuntime`).
Used across Workstream 2 (Pattern A Pooled), Workstream 3 (Pattern B Siloed),
and Workstream 4 (Pattern C Hybrid).
"""

from typing import Dict, List, Optional
from .models import (
    HopAuditRecord,
    IsolationTopology,
    TENANT_PROFILES,
    TenantProfile,
)
from .governance.hop1_edge_identity_pep import EdgeIdentityPEP
from .governance.hop2_registry_pdp_callbacks import GLOBAL_MCP_CATALOG, RegistryPDP
from .governance.hop3_compute_finops_bulkhead import ComputeFinOpsBulkhead
from .governance.hop4_model_armor_guardrails import ModelArmorGuardrails
from .governance.hop5_data_rls_and_otel import DataPlaneRLSAndOTel
from .agents.cymbal_agents import (
    FinVaultPrivateAgentAlpha,
    SharedIncidentDiagnosticAgent,
)


class CymbalMultiTenantRuntime:
    """Executes all 5 Cryptographic Hops with isolated instance-scoped tenant profiles."""

    def __init__(self) -> None:
        # Instance-scoped copy prevents cross-test state mutation when upgrading tiers in Pattern C
        self.tenant_profiles: Dict[str, TenantProfile] = dict(TENANT_PROFILES)
        self.hop1 = EdgeIdentityPEP(self.tenant_profiles)
        self.hop2 = RegistryPDP(self.tenant_profiles)
        self.hop3 = ComputeFinOpsBulkhead(self.tenant_profiles)
        self.hop4 = ModelArmorGuardrails(self.tenant_profiles)
        self.hop5 = DataPlaneRLSAndOTel()
        self.shared_agent = SharedIncidentDiagnosticAgent(self.tenant_profiles)
        self.agent_alpha = FinVaultPrivateAgentAlpha(self.tenant_profiles)

    def handle_agent_turn(
        self,
        raw_headers: Dict[str, str],
        jwt_claims: Dict[str, str],
        dpop_proof_jkt: str,
        session_id: str,
        requested_agent_uri: str,
        user_prompt: str,
        requested_thinking_tokens: int = 6000,
        simulated_current_rpm: int = 10,
        attempted_db_tenant_filter: Optional[str] = None,
        requested_mcp_connector: str = "mcp://cymbal/core-telemetry-2lo",
        topology: IsolationTopology = IsolationTopology.PATTERN_A_POOLED,
    ) -> Dict[str, object]:
        hops: List[HopAuditRecord] = []

        # Hop 1: Edge Identity PEP (Cloud Armor / IAP + RFC 8693 OBO + DPoP)
        ctx, h1_audit = self.hop1.authenticate_and_mint_context(
            raw_headers=raw_headers,
            jwt_claims=jwt_claims,
            dpop_proof_jkt=dpop_proof_jkt,
            session_id=session_id,
            topology=topology,
        )
        hops.append(h1_audit)

        # Hop 2: GEAP Registry PDP, ARD Catalog Filter & ADK `before_agent_callback` Tool Pruning
        bound_tools, h2_audit = self.hop2.authorize_agent_and_prune_tools(
            ctx=ctx,
            requested_agent_uri=requested_agent_uri,
            requested_mcp_tools=GLOBAL_MCP_CATALOG,
        )
        hops.append(h2_audit)
        if h2_audit.decision != "ALLOW":
            return {
                "status_code": h2_audit.status_code,
                "decision": "DENY",
                "reason": h2_audit.detail,
                "context": ctx,
                "hops": hops,
            }

        # Hop 3: Compute Plane, Firestore/Memorystore Config, 5-Level Memory Bank & FinOps Bulkhead
        runtime_cfg, h3_audit = self.hop3.enforce_compute_and_finops(
            ctx=ctx,
            requested_thinking_tokens=requested_thinking_tokens,
            simulated_current_rpm=simulated_current_rpm,
        )
        hops.append(h3_audit)
        if h3_audit.decision != "ALLOW":
            return {
                "status_code": h3_audit.status_code,
                "decision": "DENY",
                "reason": h3_audit.detail,
                "context": ctx,
                "hops": hops,
            }

        # Hop 4 (Ingress): Vertex AI Model Armor Prompt Screen & Semantic NLCs
        h4_in_audit = self.hop4.screen_ingress_prompt(ctx=ctx, user_prompt=user_prompt)
        hops.append(h4_in_audit)
        if h4_in_audit.decision != "ALLOW":
            return {
                "status_code": h4_in_audit.status_code,
                "decision": "DENY",
                "reason": h4_in_audit.detail,
                "context": ctx,
                "hops": hops,
            }

        # Hop 5: AlloyDB RLS Query + Auth Manager 2LO/3LO MCP Connector Execution
        if requested_mcp_connector not in bound_tools:
            h5_tool_audit = HopAuditRecord(
                hop_number=5,
                hop_name="Hop 5 • MCP Tool Boundary Enforcement",
                decision="DENY",
                status_code=403,
                detail=(
                    f"403 Forbidden: Connector '{requested_mcp_connector}' was pruned by ADK "
                    f"before_agent_callback for tenant '{ctx.tenant_id}'."
                ),
            )
            hops.append(h5_tool_audit)
            return {
                "status_code": 403,
                "decision": "DENY",
                "reason": h5_tool_audit.detail,
                "context": ctx,
                "hops": hops,
            }

        mcp_payload, h5_mcp_audit = self.hop5.invoke_mcp_connector(
            ctx=ctx, mcp_connector_uri=requested_mcp_connector
        )
        hops.append(h5_mcp_audit)
        if h5_mcp_audit.decision == "CHALLENGE_3LO_OAUTH":
            return {
                "status_code": 401,
                "decision": "CHALLENGE_3LO_OAUTH",
                "oauth_challenge": mcp_payload,
                "reason": h5_mcp_audit.detail,
                "context": ctx,
                "hops": hops,
            }

        rls_rows, h5_rls_audit = self.hop5.query_alloydb_with_rls(
            ctx=ctx, attempted_tenant_filter=attempted_db_tenant_filter
        )
        hops.append(h5_rls_audit)

        # Execute Authorized Agent Reasoning
        effective_budget = int(runtime_cfg["effective_thinking_budget"])
        if requested_agent_uri == SharedIncidentDiagnosticAgent.AGENT_URI:
            raw_output = self.shared_agent.execute_reasoning_turn(
                ctx=ctx,
                user_prompt=user_prompt,
                bound_tools=bound_tools,
                rls_incidents=rls_rows,
                effective_thinking_budget=effective_budget,
            )
        else:
            raw_output = self.agent_alpha.execute_regulatory_escalation(
                ctx=ctx,
                user_prompt=user_prompt,
                rls_incidents=rls_rows,
            )

        # Hop 4 (Egress): Vertex AI Model Armor Sensitive Data Protection (SDP) Redaction
        sanitized_output, h4_out_audit = self.hop4.sanitize_egress_response(
            ctx=ctx, raw_response=raw_output
        )
        hops.append(h4_out_audit)

        # Hop 5 (Telemetry): Record BigQuery OpenTelemetry FinOps & Audit Span
        otel_span = self.hop5.record_bigquery_otel_span(
            ctx=ctx,
            agent_uri=requested_agent_uri,
            thinking_tokens_used=effective_budget,
            cache_hit=True,
            hops=hops,
        )

        return {
            "status_code": 200,
            "decision": "ALLOW",
            "response": sanitized_output,
            "mcp_result": mcp_payload,
            "rls_rows_returned": len(rls_rows),
            "runtime_config": runtime_cfg,
            "otel_span": otel_span,
            "context": ctx,
            "hops": hops,
        }
