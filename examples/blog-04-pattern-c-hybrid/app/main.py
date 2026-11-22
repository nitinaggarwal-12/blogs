"""Blog 4 (WS4) — Pattern C Dynamic Hybrid Hub Router, Shared Pool & Enterprise PSC Spoke."""
from __future__ import annotations

import logging
import os
from typing import Any

import google.auth.transport.requests
import google.oauth2.id_token
import httpx
from fastapi import FastAPI, Header, HTTPException, Request, Response
from google.cloud import firestore
from pydantic import BaseModel, Field

from core import build_atomic_promotion_plan, validate_tenant_id

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("cymbal.blog04")

SERVICE_ROLE = os.environ.get("SERVICE_ROLE", "hub_router")
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
FIRESTORE_DB = os.environ.get("FIRESTORE_DB", "")
POOL_SERVICE_URL = os.environ.get("POOL_SERVICE_URL", "")
SPOKE_SERVICE_URL = os.environ.get("SPOKE_SERVICE_URL", "")
PSC_CONSUMER_IP = os.environ.get("PSC_CONSUMER_IP", "")
PSC_ATTACHMENT_URI = os.environ.get("PSC_ATTACHMENT_URI", "")

# Strict allow-list of internal backend origins provisioned by Terraform (prevents SSRF)
_ALLOWED_BACKENDS = {u for u in (POOL_SERVICE_URL, SPOKE_SERVICE_URL) if u}

app = FastAPI(title=f"Cymbal WS4 — Pattern C ({SERVICE_ROLE})", docs_url=None, redoc_url=None)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp: Response = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


class HybridTurnRequest(BaseModel):
    tenant_id: str = Field(..., min_length=2, max_length=40)
    prompt: str = Field(..., min_length=1, max_length=1000)


class PromoteRequest(BaseModel):
    tenant_id: str = Field(..., min_length=2, max_length=40)


def _fetch_oidc_id_token(audience: str) -> str:
    auth_req = google.auth.transport.requests.Request()
    return google.oauth2.id_token.fetch_id_token(auth_req, audience)


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "role": SERVICE_ROLE}


@app.post("/v1/backend/execute")
def backend_execute(
    req: HybridTurnRequest,
    authorization: str | None = Header(default=None),
    x_serverless_authorization: str | None = Header(default=None, alias="X-Serverless-Authorization"),
) -> dict[str, Any]:
    _auth = authorization or x_serverless_authorization
    if not _auth or not _auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")
    tenant = validate_tenant_id(req.tenant_id)
    return {
        "executed_by_role": SERVICE_ROLE,
        "project_id": PROJECT_ID,
        "tenant_id": tenant,
        "isolation_mode": "DEDICATED_ENTERPRISE_PSC_SPOKE" if SERVICE_ROLE == "enterprise_spoke" else "SHARED_MULTI_TENANT_POOL",
        "message": f"Handled turn for {tenant} on {SERVICE_ROLE}",
    }


@app.post("/v1/hybrid/turn")
def route_hybrid_turn(
    req: HybridTurnRequest,
    authorization: str | None = Header(default=None),
    x_serverless_authorization: str | None = Header(default=None, alias="X-Serverless-Authorization"),
) -> dict[str, Any]:
    _auth = authorization or x_serverless_authorization
    if not _auth or not _auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")
    try:
        tenant = validate_tenant_id(req.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id format.")

    fs = firestore.Client(project=PROJECT_ID, database=FIRESTORE_DB)
    snap = fs.collection("tenant_routes").document(tenant).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Tenant routing record not found.")

    route = snap.to_dict() or {}
    target_url = str(route.get("target_url", ""))
    if target_url not in _ALLOWED_BACKENDS:
        raise HTTPException(status_code=403, detail="Target backend URL failed allow-list verification.")

    id_token = _fetch_oidc_id_token(target_url)
    with httpx.Client(timeout=15.0) as http:
        upstream = http.post(
            f"{target_url}/v1/backend/execute",
            headers={"X-Serverless-Authorization": f"Bearer {id_token}", "Authorization": f"Bearer {id_token}", "Content-Type": "application/json"},
            json={"tenant_id": tenant, "prompt": req.prompt},
        )
    if upstream.status_code != 200:
        LOGGER.error("Backend %s returned %s", target_url, upstream.status_code)
        raise HTTPException(status_code=502, detail="Downstream topology backend failed.")

    return {
        "status": "ALLOW",
        "hub_route": {
            "tenant_id": tenant,
            "tier": route.get("tier"),
            "topology": route.get("topology"),
            "route_version": route.get("route_version"),
            "psc_consumer_ip": route.get("psc_endpoint") or None,
            "psc_attachment_uri": PSC_ATTACHMENT_URI if route.get("psc_endpoint") else None,
        },
        "backend_response": upstream.json(),
    }


@app.post("/v1/admin/promote")
def promote_tenant_zero_downtime(
    req: PromoteRequest,
    authorization: str | None = Header(default=None),
    x_serverless_authorization: str | None = Header(default=None, alias="X-Serverless-Authorization"),
) -> dict[str, Any]:
    """Execute 3-phase atomic Firestore CAS promotion (Standard Pool -> Enterprise PSC Spoke)."""
    _auth = authorization or x_serverless_authorization
    if not _auth or not _auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")
    tenant = validate_tenant_id(req.tenant_id)
    fs = firestore.Client(project=PROJECT_ID, database=FIRESTORE_DB)
    doc_ref = fs.collection("tenant_routes").document(tenant)

    @firestore.transactional
    def _atomic_cas_promote(txn):
        snap = doc_ref.get(transaction=txn)
        if not snap.exists:
            raise HTTPException(status_code=404, detail="Tenant routing record not found.")
        plan = build_atomic_promotion_plan(snap.to_dict() or {}, SPOKE_SERVICE_URL, PSC_CONSUMER_IP)
        txn.set(doc_ref, plan.next_route)
        return plan

    plan = _atomic_cas_promote(fs.transaction())
    return {
        "status": "PROMOTED",
        "tenant_id": plan.tenant_id,
        "phases_completed": plan.phases,
        "previous_version": plan.previous_version,
        "route_version": plan.next_version,
        "new_route": plan.next_route,
    }
