"""Blog 5 (WS5) — Live Agentic Triad (A2A Orchestrator -> A2A Specialist -> MCP OBO Gateway + BQ FinOps)."""
from __future__ import annotations

import logging
import os
from typing import Any

import google.auth.transport.requests
import google.oauth2.id_token
import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from google.cloud import bigquery
from pydantic import BaseModel, Field

from core import (
    authorize_mcp_obo_call,
    build_a2a_agent_card,
    build_zero_pii_chargeback_row,
    validate_tenant_id,
)

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("cymbal.blog05")

TRIAD_ROLE = os.environ.get("TRIAD_ROLE", "a2a_orchestrator")
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
A2A_SPECIALIST_URL = os.environ.get("A2A_SPECIALIST_URL", "")
MCP_GATEWAY_URL = os.environ.get("MCP_GATEWAY_URL", "")
BQ_DATASET = os.environ.get("BQ_DATASET", "")
BQ_TABLE = os.environ.get("BQ_TABLE", "otel_finops_chargeback")

app = FastAPI(title=f"Cymbal WS5 — Agentic Triad ({TRIAD_ROLE})", docs_url=None, redoc_url=None)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp: Response = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


class TriadTaskRequest(BaseModel):
    tenant_id: str = Field(..., min_length=2, max_length=40)
    mcp_tool: str = Field(..., min_length=2, max_length=80)
    prompt: str = Field(..., min_length=1, max_length=1500)


def _fetch_oidc_id_token(audience: str) -> str:
    auth_req = google.auth.transport.requests.Request()
    return google.oauth2.id_token.fetch_id_token(auth_req, audience)


def _record_finops_row(row: dict[str, Any]) -> bool:
    if not (PROJECT_ID and BQ_DATASET and BQ_TABLE):
        return False
    bq = bigquery.Client(project=PROJECT_ID)
    table_ref = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = bq.insert_rows_json(table_ref, [row])
    if errors:
        LOGGER.error("BigQuery FinOps insert errors: %s", errors)
        return False
    return True


def _verify_authenticated_request(request: Request) -> None:
    """Enforce Bearer OIDC locally; on IAM-enforced Cloud Run (K_SERVICE set), GFE validates roles/run.invoker and strips raw OIDC headers."""
    auth = request.headers.get("authorization") or request.headers.get("x-serverless-authorization") or ""
    if auth.startswith("Bearer "):
        return
    if os.environ.get("K_SERVICE") and request.headers.get("x-cloud-trace-context"):
        return
    raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "role": TRIAD_ROLE}


@app.get("/.well-known/agent.json")
def agent_card(request: Request) -> dict[str, Any]:
    return build_a2a_agent_card(str(request.base_url).rstrip("/"))


@app.post("/v1/mcp/invoke")
def mcp_invoke(
    req: TriadTaskRequest,
    request: Request,
) -> dict[str, Any]:
    _verify_authenticated_request(request)
    decision = authorize_mcp_obo_call(req.tenant_id, req.mcp_tool)
    if not decision.allowed:
        raise HTTPException(status_code=decision.http_status, detail={"code": decision.code, "message": decision.detail})
    return {
        "status": "ALLOW",
        "mcp_tool": req.mcp_tool,
        "tenant_id": validate_tenant_id(req.tenant_id),
        "obo_scope": decision.detail,
        "tool_result": f"Executed {req.mcp_tool} inside tenant-scoped OBO boundary.",
    }


@app.post("/v1/a2a/task")
def a2a_specialist_task(
    req: TriadTaskRequest,
    request: Request,
) -> dict[str, Any]:
    _verify_authenticated_request(request)
    tenant = validate_tenant_id(req.tenant_id)
    id_token = _fetch_oidc_id_token(MCP_GATEWAY_URL)
    with httpx.Client(timeout=15.0) as http:
        mcp_res = http.post(
            f"{MCP_GATEWAY_URL}/v1/mcp/invoke",
            headers={"X-Serverless-Authorization": f"Bearer {id_token}", "Authorization": f"Bearer {id_token}", "Content-Type": "application/json"},
            json={"tenant_id": tenant, "mcp_tool": req.mcp_tool, "prompt": req.prompt},
        )
    if mcp_res.status_code != 200:
        raise HTTPException(status_code=mcp_res.status_code, detail=mcp_res.json().get("detail", "MCP tool call denied."))
    return {
        "status": "COMPLETED",
        "specialist": "cymbal-enterprise-specialist",
        "mcp_response": mcp_res.json(),
    }


@app.post("/v1/triad/execute")
def orchestrator_execute(
    req: TriadTaskRequest,
    request: Request,
) -> dict[str, Any]:
    _verify_authenticated_request(request)
    tenant = validate_tenant_id(req.tenant_id)
    id_token = _fetch_oidc_id_token(A2A_SPECIALIST_URL)
    with httpx.Client(timeout=20.0) as http:
        card_res = http.get(
            f"{A2A_SPECIALIST_URL}/.well-known/agent.json",
            headers={"X-Serverless-Authorization": f"Bearer {id_token}", "Authorization": f"Bearer {id_token}"},
        )
        task_res = http.post(
            f"{A2A_SPECIALIST_URL}/v1/a2a/task",
            headers={"X-Serverless-Authorization": f"Bearer {id_token}", "Authorization": f"Bearer {id_token}", "Content-Type": "application/json"},
            json={"tenant_id": tenant, "mcp_tool": req.mcp_tool, "prompt": req.prompt},
        )

    finops_row = build_zero_pii_chargeback_row(
        tenant_id=tenant,
        prompt=req.prompt,
        mcp_tool=req.mcp_tool,
        http_status=task_res.status_code,
    )
    bq_written = _record_finops_row(finops_row)

    if task_res.status_code != 200:
        raise HTTPException(
            status_code=task_res.status_code,
            detail={
                "upstream_error": task_res.json().get("detail", "Specialist/MCP rejected turn."),
                "finops_audit_recorded": bq_written,
                "prompt_sha256": finops_row["prompt_sha256"],
            },
        )

    return {
        "status": "ALLOW",
        "discovered_agent_card": card_res.json().get("name") if card_res.status_code == 200 else "unknown",
        "a2a_result": task_res.json(),
        "zero_pii_finops": {
            "bq_recorded": bq_written,
            "trace_id": finops_row["trace_id"],
            "prompt_sha256": finops_row["prompt_sha256"],
            "cached_tokens": finops_row["cached_tokens"],
            "dynamic_tokens": finops_row["dynamic_tokens"],
            "estimated_usd": finops_row["estimated_usd"],
        },
    }
