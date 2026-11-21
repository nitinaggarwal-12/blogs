"""Blog 1 (WS1) — Live Cloud Run 5-Hop Governance Gateway.

Integrates real Google Cloud services deployed by ../terraform/main.tf:
- Hop 1: Cloud IAM OIDC caller verification + Cloud KMS EC-P256 JWT minting
- Hop 2: Tenant-scoped Agent Registry Discovery (ARD) authorization
- Hop 3: Live Vertex AI Gemini 2.5 Flash inference via google-genai SDK
- Hop 4: Live Vertex AI Model Armor sanitizeUserPrompt API (BEFORE vs AFTER templates)
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
import time
from collections import defaultdict, deque
from typing import Any

import google.auth
import google.auth.transport.requests
import httpx
from fastapi import FastAPI, Header, HTTPException, Request, Response
from google import genai
from google.cloud import kms
from pydantic import BaseModel, Field

from core import (
    build_unsigned_jwt_input,
    enforce_hop1_anti_spoofing,
    enforce_hop2_ard_visibility,
    enforce_hop4_semantic_nlc,
    hash_prompt_zero_pii,
    redact_egress_pii,
    validate_tenant_id,
)

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("cymbal.blog01")

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
REGION = os.environ.get("GCP_REGION", "us-central1")
KMS_KEY_VERSION = os.environ.get("KMS_SIGNING_KEY_VERSION", "")
BEFORE_TEMPLATE = os.environ.get("MODEL_ARMOR_BEFORE_TEMPLATE", "")
AFTER_TEMPLATE = os.environ.get("MODEL_ARMOR_AFTER_TEMPLATE", "")
VERTEX_MODEL = os.environ.get("VERTEX_MODEL", "gemini-2.5-flash")

app = FastAPI(title="Cymbal WS1 — 5-Hop Governance Baseline", docs_url=None, redoc_url=None)

# Lightweight per-tenant sliding-window rate limiter (60 req/min per tenant)
_RATE_WINDOW: dict[str, deque[float]] = defaultdict(deque)
_RATE_LIMIT_PER_MIN = 60


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp: Response = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


class TurnRequest(BaseModel):
    tenant_id: str = Field(default="finvault", min_length=2, max_length=40)
    agent_uri: str = Field(default="agent://cymbal/shared-diagnostic-v2", max_length=160)
    prompt: str = Field(..., min_length=1, max_length=2000)
    mode: str = Field(default="after", pattern="^(before|after)$")


def _check_rate_limit(tenant_id: str) -> None:
    now = time.monotonic()
    bucket = _RATE_WINDOW[tenant_id]
    while bucket and now - bucket[0] > 60.0:
        bucket.popleft()
    if len(bucket) >= _RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Tenant rate limit exceeded.")
    bucket.append(now)


def _sign_tenant_jwt_kms(tenant_id: str, actor_sub: str) -> dict[str, Any]:
    signing_input, payload = build_unsigned_jwt_input(tenant_id, actor_sub)
    if not KMS_KEY_VERSION:
        raise RuntimeError("KMS_SIGNING_KEY_VERSION is not configured")
    client = kms.KeyManagementServiceClient()
    digest = hashlib.sha256(signing_input.encode("utf-8")).digest()
    resp = client.asymmetric_sign(
        request={"name": KMS_KEY_VERSION, "digest": {"sha256": digest}}
    )
    sig_b64 = base64.urlsafe_b64encode(resp.signature).rstrip(b"=").decode("ascii")
    return {
        "alg": "ES256",
        "kms_key_version": KMS_KEY_VERSION,
        "exp": payload["exp"],
        "jwt_preview": f"{signing_input[:24]}...{sig_b64[-12:]}",
    }


def _call_model_armor(template_name: str, prompt: str) -> dict[str, Any]:
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    auth_req = google.auth.transport.requests.Request()
    creds.refresh(auth_req)
    endpoint = f"https://modelarmor.{REGION}.rep.googleapis.com/v1/{template_name}:sanitizeUserPrompt"
    with httpx.Client(timeout=15.0) as http:
        res = http.post(
            endpoint,
            headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
            json={"userPromptData": {"text": prompt}},
        )
    if res.status_code != 200:
        LOGGER.error("Model Armor API failed with status %s", res.status_code)
        raise HTTPException(status_code=502, detail="Model Armor guardrail evaluation failed.")
    body = res.json()
    sanit = body.get("sanitizationResult", {})
    return {
        "template": template_name,
        "filter_match_state": sanit.get("filterMatchState", "UNKNOWN"),
        "invocation_result": sanit.get("invocationResult", "UNKNOWN"),
    }


def _call_vertex_gemini(prompt: str) -> str:
    client = genai.Client(vertexai=True, project=PROJECT_ID, location=REGION)
    resp = client.models.generate_content(
        model=VERTEX_MODEL,
        contents=f"Respond concisely in one sentence to this enterprise SRE diagnostic query: {prompt}",
    )
    return redact_egress_pii(resp.text or "")


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "service": "blog-01-5hop-baseline", "region": REGION}


@app.post("/v1/turn")
def execute_turn(
    req: TurnRequest,
    authorization: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None),
) -> dict[str, Any]:
    # Fail closed if caller arrived without a Bearer OIDC token (Cloud Run IAM also enforces auth)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")

    try:
        tenant = validate_tenant_id(req.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id format.")

    _check_rate_limit(tenant)

    # Hop 1: Anti-spoofing PEP + Cloud KMS EC-P256 TenantContext JWT signing
    h1 = enforce_hop1_anti_spoofing(tenant, x_tenant_id)
    if not h1.allowed:
        raise HTTPException(status_code=h1.http_status, detail={"code": h1.code, "message": h1.detail})

    kms_jwt = _sign_tenant_jwt_kms(tenant, actor_sub=f"oidc:{tenant}")

    # Hop 2: Agent Registry Discovery (ARD) visibility gate
    h2 = enforce_hop2_ard_visibility(tenant, req.agent_uri)
    if not h2.allowed:
        raise HTTPException(status_code=h2.http_status, detail={"code": h2.code, "message": h2.detail})

    # Hop 4: Live Vertex AI Model Armor evaluation (BEFORE unprotected vs AFTER firewall)
    template_name = BEFORE_TEMPLATE if req.mode == "before" else AFTER_TEMPLATE
    armor = _call_model_armor(template_name, req.prompt)

    if req.mode == "after":
        if armor["filter_match_state"] == "MATCH_FOUND":
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "HOP4_MODEL_ARMOR_BLOCKED",
                    "filter_match_state": armor["filter_match_state"],
                    "template": template_name,
                },
            )
        nlc = enforce_hop4_semantic_nlc(tenant, req.prompt)
        if not nlc.allowed:
            raise HTTPException(status_code=nlc.http_status, detail={"code": nlc.code, "message": nlc.detail})

    # Hop 3: Live Vertex AI Gemini 2.5 Flash inference
    answer = _call_vertex_gemini(req.prompt)

    return {
        "status": "ALLOW",
        "mode": req.mode,
        "tenant_id": tenant,
        "agent_uri": req.agent_uri,
        "prompt_sha256": hash_prompt_zero_pii(req.prompt),
        "hop1_kms_jwt": kms_jwt,
        "hop4_model_armor": armor,
        "hop3_answer": answer,
    }
