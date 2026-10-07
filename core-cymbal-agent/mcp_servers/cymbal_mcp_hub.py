"""
Unified Cymbal MCP Hub (`cymbal_mcp_hub.py`).
Routes 2LO and 3LO MCP tool invocations across:
- `CymbalTelemetry2LOMCPServer` (`mcp://cymbal/core-telemetry-2lo`)
- `GoogleWorkspaceJira3LOMCPServer` (`mcp://finvault/google-workspace-3lo`, `mcp://finvault/jira-enterprise-3lo`)
- `MicrosoftServiceNow3LOMCPServer` (`mcp://retailstream/sharepoint-runbooks-3lo`, `mcp://retailstream/servicenow-itom-3lo`)
"""

from typing import Dict
from ..models import CryptographicContext
from .cymbal_telemetry_2lo_mcp import CymbalTelemetry2LOMCPServer
from .google_workspace_jira_3lo_mcp import GoogleWorkspaceJira3LOMCPServer
from .microsoft_servicenow_3lo_mcp import MicrosoftServiceNow3LOMCPServer


class CymbalMCPHub:
    def __init__(self) -> None:
        self.telemetry_2lo = CymbalTelemetry2LOMCPServer()
        self.google_jira_3lo = GoogleWorkspaceJira3LOMCPServer()
        self.msft_servicenow_3lo = MicrosoftServiceNow3LOMCPServer()

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
        raise ValueError(f"Unknown MCP connector URI: '{connector_uri}'")
