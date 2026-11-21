"""Pure-Python Agentic Triad (A2A Agent Card + MCP OBO Audience Guard + Zero-PII FinOps) logic."""
from __future__ import annotations

import datetime
import hashlib
import re
import uuid
from dataclasses import dataclass
from typing import Any

TENANT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,39}$")

# MCP Tool Ownership & OAuth 2.1 OBO Scope Registry
MCP_TOOL_ACL: dict[str, dict[str, Any]] = {
    "cymbal-shared-telemetry": {"allowed_tenants": {"finvault", "retailstream", "globex"}, "scope": "telemetry:read"},
    "finvault-wire-ledger": {"allowed_tenants": {"finvault"}, "scope": "finvault:wire:read"},
    "retailstream-pos-inventory": {"allowed_tenants": {"retailstream"}, "scope": "retailstream:pos:read"},
}


@dataclass(frozen=True)
class McpAuthDecision:
    allowed: bool
    http_status: int
    code: str
    detail: str


def validate_tenant_id(tenant_id: str) -> str:
    cleaned = str(tenant_id or "").strip().lower()
    if not TENANT_ID_RE.fullmatch(cleaned):
        raise ValueError("Invalid tenant_id format")
    return cleaned


def authorize_mcp_obo_call(tenant_id: str, tool_name: str) -> McpAuthDecision:
    """Enforce OAuth 2.1 OBO per-tenant audience scoping at the MCP tool gateway."""
    vt = validate_tenant_id(tenant_id)
    meta = MCP_TOOL_ACL.get(tool_name)
    if meta is None:
        return McpAuthDecision(False, 404, "MCP_TOOL_NOT_FOUND", "Requested MCP tool is not registered.")
    if vt not in meta["allowed_tenants"]:
        return McpAuthDecision(
            allowed=False,
            http_status=403,
            code="MCP_OBO_TENANT_SCOPE_DENIED",
            detail="Caller tenant lacks OAuth 2.1 OBO scope for this downstream MCP tool.",
        )
    return McpAuthDecision(True, 200, "MCP_OBO_ALLOW", f"Authorized scope {meta['scope']}.")


def build_a2a_agent_card(service_url: str) -> dict[str, Any]:
    """Build standard A2A /.well-known/agent.json discovery card."""
    return {
        "name": "cymbal-enterprise-specialist",
        "description": "Multi-tenant specialist agent enforcing OAuth 2.1 OBO delegation to MCP tools.",
        "url": service_url,
        "version": "1.0.0",
        "authentication": {"schemes": ["Bearer-OIDC"]},
        "skills": [
            {"id": "wire-diagnostics", "name": "FinVault Wire Diagnostics", "mcp_tool": "finvault-wire-ledger"},
            {"id": "pos-diagnostics", "name": "RetailStream POS Diagnostics", "mcp_tool": "retailstream-pos-inventory"},
            {"id": "shared-telemetry", "name": "Shared Platform Telemetry", "mcp_tool": "cymbal-shared-telemetry"},
        ],
    }


def build_zero_pii_chargeback_row(
    tenant_id: str,
    prompt: str,
    mcp_tool: str,
    http_status: int,
    cached_tokens: int = 32768,
    dynamic_tokens: int = 420,
) -> dict[str, Any]:
    """Construct zero-PII BigQuery FinOps chargeback record (hashes prompt via SHA-256, never stores raw text)."""
    vt = validate_tenant_id(tenant_id)
    # Illustrative Gemini 2.5 Flash cached (0.1x) vs dynamic input token pricing for FinOps attribution
    est_usd = round((cached_tokens * 0.00000003) + (dynamic_tokens * 0.0000003), 8)
    return {
        "trace_id": f"tr-{uuid.uuid4().hex[:12]}",
        "tenant_id": vt,
        "prompt_sha256": hashlib.sha256((prompt or "").encode("utf-8")).hexdigest(),
        "cached_tokens": int(cached_tokens),
        "dynamic_tokens": int(dynamic_tokens),
        "estimated_usd": est_usd,
        "mcp_tool": str(mcp_tool)[:80],
        "http_status": int(http_status),
        "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
