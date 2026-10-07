"""
Hop 5 — Data Plane Row-Level Security (AlloyDB RLS), 2LO/3LO Tool Auth & BigQuery OTel Audit.

Enforces Governance Pillar 2 (2LO/3LO Tool Auth) & Pillar 4 (AlloyDB RLS & BigQuery OTel):
1. Binds `SET LOCAL app.current_tenant = '<tenant_id>'` on every AlloyDB transaction
   so PostgreSQL Row-Level Security (RLS) deterministically restricts rows to the active tenant.
2. Brokers 2LO Implicit Session Passthrough for Cymbal Core Telemetry API and
   3LO OAuth tokens (Google OIDC for FinVault; Microsoft Entra ID with Inline OAuth
   consent challenge for RetailStream when tokens are missing) via `CymbalMCPHub`.
3. Emits structured OpenTelemetry (OTel) FinOps & security audit traces to BigQuery.
"""

from typing import Dict, List, Optional, Tuple
from ..models import CryptographicContext, HopAuditRecord
from ..mcp_servers.cymbal_mcp_hub import CymbalMCPHub


ALLOYDB_INCIDENTS_TABLE = [
    {
        "incident_id": "INC-FV-9001",
        "tenant_id": "finvault",
        "service": "Core-Ledger-Wire-Settlement",
        "severity": "P1",
        "summary": "Latency spike on wire settlement queue; trace contains ACCT-8849201944 and SWIFT-FNVTUS33XXX.",
    },
    {
        "incident_id": "INC-RS-4012",
        "tenant_id": "retailstream",
        "service": "Checkout-Payment-Gateway",
        "severity": "P1",
        "summary": "Timeout in payment capture; raw log includes card 4532-9910-8821-7743.",
    },
]


class DataPlaneRLSAndOTel:
    """Simulates AlloyDB RLS + GCP Agent Identity Auth Manager (2LO/3LO) + BigQuery OTel at Hop 5."""

    def __init__(self) -> None:
        self.mcp_hub = CymbalMCPHub()
        self._3lo_token_vault: Dict[str, str] = {
            "finvault:mcp://finvault/google-workspace-3lo": "ya29.finvault-google-3lo-valid",
            "finvault:mcp://finvault/jira-enterprise-3lo": "jira.finvault-3lo-valid",
        }
        self.bigquery_otel_ledger: List[Dict[str, object]] = []

    def grant_inline_3lo_consent(self, tenant_id: str, mcp_connector_uri: str, token: str) -> None:
        """Simulates ADK interactive mid-session 3LO OAuth consent completion."""
        self._3lo_token_vault[f"{tenant_id}:{mcp_connector_uri}"] = token

    def query_alloydb_with_rls(
        self,
        ctx: CryptographicContext,
        attempted_tenant_filter: Optional[str] = None,
    ) -> Tuple[List[Dict[str, str]], HopAuditRecord]:
        rls_bound_tenant = ctx.tenant_id
        visible_rows = [
            row for row in ALLOYDB_INCIDENTS_TABLE if row["tenant_id"] == rls_bound_tenant
        ]
        if attempted_tenant_filter and attempted_tenant_filter != rls_bound_tenant:
            visible_rows = [
                row for row in visible_rows if row["tenant_id"] == attempted_tenant_filter
            ]

        audit = HopAuditRecord(
            hop_number=5,
            hop_name="Hop 5 • AlloyDB Row-Level Security (RLS)",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Executed `SET LOCAL app.current_tenant = '{rls_bound_tenant}'`. "
                f"Returned {len(visible_rows)} row(s) matching RLS policy."
            ),
            metadata={
                "rls_session_tenant": rls_bound_tenant,
                "attempted_filter": attempted_tenant_filter or rls_bound_tenant,
                "rows_returned": len(visible_rows),
            },
        )
        return visible_rows, audit

    def invoke_mcp_connector(
        self,
        ctx: CryptographicContext,
        mcp_connector_uri: str,
    ) -> Tuple[Dict[str, object], HopAuditRecord]:
        if mcp_connector_uri == "mcp://cymbal/core-telemetry-2lo":
            payload = self.mcp_hub.dispatch(ctx=ctx, connector_uri=mcp_connector_uri)
            return (
                payload,
                HopAuditRecord(
                    hop_number=5,
                    hop_name="Hop 5 • Auth Manager 2LO Connector Execution",
                    decision="ALLOW",
                    status_code=200,
                    detail=f"2LO Implicit Session Passthrough succeeded for '{mcp_connector_uri}' ({ctx.tenant_id}).",
                    metadata=payload,
                ),
            )

        vault_key = f"{ctx.tenant_id}:{mcp_connector_uri}"
        token = self._3lo_token_vault.get(vault_key)
        if not token:
            return (
                {
                    "status": "OAUTH_CONSENT_REQUIRED",
                    "connector": mcp_connector_uri,
                    "consent_url": f"https://login.microsoftonline.com/{ctx.tenant_id}/oauth2/v2.0/authorize?scope={mcp_connector_uri}",
                },
                HopAuditRecord(
                    hop_number=5,
                    hop_name="Hop 5 • Auth Manager 3LO Inline Consent Challenge",
                    decision="CHALLENGE_3LO_OAUTH",
                    status_code=401,
                    detail=(
                        f"Missing 3LO token for '{mcp_connector_uri}' (tenant='{ctx.tenant_id}'). "
                        f"Prompting engineer mid-session via ADK interactive OAuth flow."
                    ),
                ),
            )

        payload = self.mcp_hub.dispatch(ctx=ctx, connector_uri=mcp_connector_uri, access_token=token)
        return (
            payload,
            HopAuditRecord(
                hop_number=5,
                hop_name="Hop 5 • Auth Manager 3LO Connector Execution",
                decision="ALLOW",
                status_code=200,
                detail=f"3LO token verified for '{mcp_connector_uri}' (tenant='{ctx.tenant_id}').",
                metadata=payload,
            ),
        )

    def record_bigquery_otel_span(
        self,
        ctx: CryptographicContext,
        agent_uri: str,
        thinking_tokens_used: int,
        cache_hit: bool,
        hops: List[HopAuditRecord],
    ) -> Dict[str, object]:
        record = {
            "tenant_id": ctx.tenant_id,
            "tier": ctx.tier.value,
            "topology": ctx.active_topology.value,
            "session_id": ctx.session_id,
            "agent_uri": agent_uri,
            "thinking_tokens_used": thinking_tokens_used,
            "prompt_prefix_cache_hit": cache_hit,
            "hop_count": len(hops),
            "all_hops_passed": all(h.decision == "ALLOW" for h in hops),
        }
        self.bigquery_otel_ledger.append(record)
        return record
