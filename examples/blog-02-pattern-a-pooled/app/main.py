"""Blog 2 (WS2) — Live Pattern A Pooled Runtime (BigQuery Parameterized RLS + Firestore RPM Bulkhead)."""
from __future__ import annotations

import logging
import os
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, Response
from google.cloud import bigquery, firestore
from pydantic import BaseModel, Field

from core import (
    TenantSlidingWindowBulkhead,
    clamp_output_tokens,
    validate_tenant_id,
    verify_zero_cross_tenant_leakage,
)

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("cymbal.blog02")

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
BQ_DATASET = os.environ.get("BQ_DATASET", "")
BQ_TABLE = os.environ.get("BQ_TABLE", "pooled_rls_entities")
FIRESTORE_DB = os.environ.get("FIRESTORE_DB", "")
RPM_LIMIT = int(os.environ.get("RPM_LIMIT_PER_TENANT", "5"))

app = FastAPI(title="Cymbal WS2 — Pattern A Pooled Runtime", docs_url=None, redoc_url=None)
_LOCAL_BULKHEAD = TenantSlidingWindowBulkhead(rpm_limit=RPM_LIMIT)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp: Response = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


class PooledQueryRequest(BaseModel):
    tenant_id: str = Field(..., min_length=2, max_length=40)
    tier: str = Field(default="STANDARD", pattern="^(STANDARD|ENTERPRISE)$")
    requested_max_output_tokens: int = Field(default=16000, ge=256, le=64000)


def _enforce_distributed_rpm_bulkhead(tenant_id: str) -> dict[str, Any]:
    """Per-tenant fixed-minute atomic bulkhead in Firestore (falls back safely if DB unset)."""
    if FIRESTORE_DB and PROJECT_ID:
        minute_bucket = int(time.time() // 60)
        doc_id = f"{tenant_id}_{minute_bucket}"
        fs = firestore.Client(project=PROJECT_ID, database=FIRESTORE_DB)
        doc_ref = fs.collection("tenant_rpm_windows").document(doc_id)

        @firestore.transactional
        def _increment(txn):
            snap = doc_ref.get(transaction=txn)
            curr = int(snap.to_dict().get("count", 0)) if snap.exists else 0
            if curr >= RPM_LIMIT:
                return False, curr
            txn.set(doc_ref, {"tenant_id": tenant_id, "bucket": minute_bucket, "count": curr + 1})
            return True, curr + 1

        allowed, count = _increment(fs.transaction())
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={"code": "HOP3_TENANT_RPM_BULKHEAD", "tenant_id": tenant_id, "rpm_limit": RPM_LIMIT},
                headers={"Retry-After": "15"},
            )
        return {"backend": "firestore", "count": count, "limit": RPM_LIMIT}

    verdict = _LOCAL_BULKHEAD.check_and_record(tenant_id)
    if not verdict.allowed:
        raise HTTPException(
            status_code=429,
            detail={"code": "HOP3_TENANT_RPM_BULKHEAD", "tenant_id": tenant_id, "rpm_limit": verdict.limit},
            headers={"Retry-After": str(verdict.retry_after_sec)},
        )
    return {"backend": "in_memory", "count": verdict.current_count, "limit": verdict.limit}


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "service": "blog-02-pattern-a-pooled", "rpm_limit": RPM_LIMIT}


@app.post("/v1/pooled/query")
def query_pooled_tenant_rows(
    req: PooledQueryRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")

    try:
        tenant = validate_tenant_id(req.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id format.")

    bulkhead = _enforce_distributed_rpm_bulkhead(tenant)
    clamped_tokens = clamp_output_tokens(req.tier, req.requested_max_output_tokens)

    # Parameterized BigQuery SQL (zero string interpolation of user input!) paired with native BigQuery Row Access Policy
    bq = bigquery.Client(project=PROJECT_ID)
    sql = f"""
        SELECT entity_id, tenant_id, domain, record_summary, classification
        FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}`
        WHERE tenant_id = @tenant_id
        ORDER BY entity_id
    """
    job_cfg = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("tenant_id", "STRING", tenant)]
    )
    rows = [dict(row.items()) for row in bq.query(sql, job_config=job_cfg).result()]

    # Fail-closed defense-in-depth verification
    if not verify_zero_cross_tenant_leakage(tenant, rows):
        LOGGER.error("Cross-tenant row detected for tenant=%s", tenant)
        raise HTTPException(status_code=500, detail="Tenant isolation invariant failed closed.")

    return {
        "status": "ALLOW",
        "topology": "PATTERN_A_POOLED",
        "tenant_id": tenant,
        "clamped_max_output_tokens": clamped_tokens,
        "bulkhead": bulkhead,
        "row_count": len(rows),
        "rows": rows,
    }
