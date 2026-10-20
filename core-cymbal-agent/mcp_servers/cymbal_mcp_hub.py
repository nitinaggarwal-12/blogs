"""
Unified Cymbal MCP Hub (`cymbal_mcp_hub.py`).
Routes 2LO and 3LO MCP tool invocations across:
- `CymbalTelemetry2LOMCPServer` (`mcp://cymbal/core-telemetry-2lo`)
- `GoogleWorkspaceJira3LOMCPServer` (`mcp://finvault/google-workspace-3lo`, `mcp://finvault/jira-enterprise-3lo`)
- `MicrosoftServiceNow3LOMCPServer` (`mcp://retailstream/sharepoint-runbooks-3lo`, `mcp://retailstream/servicenow-itom-3lo`)
- `Enterprise5ThirdPartySaaSMCP` (10 Third-Party SaaS, Cloud BI, Lakehouse, ERP & SecOps 3LO connectors)
"""

from typing import Dict
from ..models import CryptographicContext
from .cymbal_telemetry_2lo_mcp import CymbalTelemetry2LOMCPServer
from .google_workspace_jira_3lo_mcp import GoogleWorkspaceJira3LOMCPServer
from .microsoft_servicenow_3lo_mcp import MicrosoftServiceNow3LOMCPServer


class CymbalMCPHub:
    SAAS_10_CONNECTOR_URIS = {
        "mcp://cymbal/thoughtspot-spotter-bi-3lo",
        "mcp://cymbal/sigma-computing-workbooks-3lo",
        "mcp://finvault/veeva-muse-clinical-3lo",
        "mcp://finvault/salesforce-jira-escalation-3lo",
        "mcp://cymbal/databricks-unity-catalog-genie-3lo",
        "mcp://cymbal/snowflake-cortex-analyst-sql-3lo",
        "mcp://finvault/workday-hcm-financials-raas-3lo",
        "mcp://cymbal/datadog-observability-sre-3lo",
        "mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo",
    }

    def __init__(self) -> None:
        self.telemetry_2lo = CymbalTelemetry2LOMCPServer()
        self.google_jira_3lo = GoogleWorkspaceJira3LOMCPServer()
        self.msft_servicenow_3lo = MicrosoftServiceNow3LOMCPServer()
        self._enterprise_saas_mcp = None

    def _get_enterprise_saas_mcp(self):
        if self._enterprise_saas_mcp is None:
            from .enterprise_5_saas_bi_mcp import Enterprise5ThirdPartySaaSMCP

            self._enterprise_saas_mcp = Enterprise5ThirdPartySaaSMCP()
        return self._enterprise_saas_mcp

    def dispatch(
        self, ctx: CryptographicContext, connector_uri: str, access_token: str = ""
    ) -> Dict[str, object]:
        if connector_uri == CymbalTelemetry2LOMCPServer.CONNECTOR_URI:
            return self.telemetry_2lo.query_outage_telemetry(ctx)
        if connector_uri in {
            GoogleWorkspaceJira3LOMCPServer.WORKSPACE_URI,
            GoogleWorkspaceJira3LOMCPServer.JIRA_URI,
        }:
            return self.google_jira_3lo.execute_workspace_or_jira_tool(
                ctx=ctx, connector_uri=connector_uri, access_token=access_token
            )
        if connector_uri in {
            MicrosoftServiceNow3LOMCPServer.SHAREPOINT_URI,
            MicrosoftServiceNow3LOMCPServer.SERVICENOW_URI,
        }:
            return self.msft_servicenow_3lo.execute_sharepoint_or_servicenow_tool(
                ctx=ctx, connector_uri=connector_uri, access_token=access_token
            )
        if connector_uri in self.SAAS_10_CONNECTOR_URIS:
            saas = self._get_enterprise_saas_mcp()
            dispatch_map = {
                "mcp://cymbal/thoughtspot-spotter-bi-3lo": saas.invoke_thoughtspot_spotter_bi,
                "mcp://cymbal/sigma-computing-workbooks-3lo": saas.invoke_sigma_computing_workbook,
                "mcp://finvault/veeva-muse-clinical-3lo": saas.invoke_veeva_vault_and_muse_clinical_edc,
                "mcp://finvault/salesforce-jira-escalation-3lo": saas.invoke_salesforce_and_atlassian_jira_escalation,
                "mcp://cymbal/databricks-unity-catalog-genie-3lo": saas.invoke_databricks_unity_catalog_genie,
                "mcp://cymbal/snowflake-cortex-analyst-sql-3lo": saas.invoke_snowflake_cortex_analyst_sql,
                "mcp://finvault/workday-hcm-financials-raas-3lo": saas.invoke_workday_hcm_financials_raas,
                "mcp://cymbal/datadog-observability-sre-3lo": saas.invoke_datadog_observability_sre_logs,
                "mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo": saas.invoke_crowdstrike_falcon_and_okta_xdr,
            }
            return dispatch_map[connector_uri](ctx)
        raise ValueError(f"Unknown MCP connector URI: '{connector_uri}'")

