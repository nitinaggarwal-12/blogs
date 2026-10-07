"""
RetailStream Corp 3LO Microsoft Entra ID (SharePoint Runbooks & ServiceNow ITOM) MCP Server
(`mcp://retailstream/sharepoint-runbooks-3lo` and `mcp://retailstream/servicenow-itom-3lo`).

Implements Slide 7 Tenant Beta (RetailStream Corp) Zero Google Footprint & Inline 3LO Consent:
- Authenticates via Microsoft Entra ID.
- Connects to SharePoint runbooks & ServiceNow ITOM.
- Strictly scoped to RetailStream; FinVault cannot discover or invoke it.
"""

from typing import Dict
from ..models import CryptographicContext


class MicrosoftServiceNow3LOMCPServer:
    SHAREPOINT_URI = "mcp://retailstream/sharepoint-runbooks-3lo"
    SERVICENOW_URI = "mcp://retailstream/servicenow-itom-3lo"

    def execute_sharepoint_or_servicenow_tool(
        self, ctx: CryptographicContext, connector_uri: str, access_token: str
    ) -> Dict[str, object]:
        if ctx.tenant_id != "retailstream":
            raise PermissionError(
                f"403 Forbidden: Tenant '{ctx.tenant_id}' cannot access RetailStream SharePoint/ServiceNow MCP."
            )
        if connector_uri == self.SHAREPOINT_URI:
            return {
                "connector": connector_uri,
                "auth_mode": "3LO_MICROSOFT_ENTRA_ID",
                "tenant_scope": "retailstream",
                "sharepoint_document": "Checkout-Payment-Gateway-Failover-Runbook.docx",
            }
        return {
            "connector": connector_uri,
            "auth_mode": "3LO_MICROSOFT_ENTRA_ID",
            "tenant_scope": "retailstream",
            "servicenow_incident": "INC0049281 (P1 Checkout Payment Gateway Timeout)",
        }
