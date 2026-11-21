"""Blog 3 (WS3) — Live Pattern B Sovereign Silo Service (CMEK Kill-Switch HTTP 423 + Encrypted BQ/GCS)."""
from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, Response
from google.api_core import exceptions as gcp_exceptions
from google.cloud import bigquery, kms, storage
from pydantic import BaseModel, Field

from core import evaluate_cmek_key_state, evaluate_vpc_sc_egress_boundary

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("cymbal.blog03")

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
REGION = os.environ.get("GCP_REGION", "us-central1")
BQ_DATASET = os.environ.get("BQ_DATASET", "")
BQ_TABLE = os.environ.get("BQ_TABLE", "sovereign_cmek_records")
GCS_BUCKET = os.environ.get("GCS_BUCKET", "")
CMEK_KEY_VERSION = os.environ.get("CMEK_KEY_VERSION", "")

app = FastAPI(title="Cymbal WS3 — Pattern B Sovereign Silo", docs_url=None, redoc_url=None)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp: Response = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return resp


class SiloVaultRequest(BaseModel):
    egress_target_project: str | None = Field(default=None, max_length=60)


def _live_cmek_state() -> str:
    client = kms.KeyManagementServiceClient()
    ver = client.get_crypto_key_version(request={"name": CMEK_KEY_VERSION})
    return kms.CryptoKeyVersion.CryptoKeyVersionState(ver.state).name


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "service": "blog-03-pattern-b-siloed"}


@app.post("/v1/silo/vault")
def read_sovereign_vault(
    req: SiloVaultRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authenticated Bearer OIDC token required.")

    egress = evaluate_vpc_sc_egress_boundary(PROJECT_ID, req.egress_target_project)
    if not egress.allowed:
        raise HTTPException(status_code=egress.http_status, detail={"code": egress.code, "message": egress.detail})

    # 1. Fail-closed KMS CMEK state check (HTTP 423 LOCKED when DISABLED/DESTROYED)
    state_name = _live_cmek_state()
    cmek_verdict = evaluate_cmek_key_state(state_name)
    if not cmek_verdict.allowed:
        raise HTTPException(
            status_code=cmek_verdict.http_status,
            detail={
                "code": cmek_verdict.code,
                "kms_key_version": CMEK_KEY_VERSION,
                "kms_state": state_name,
                "message": cmek_verdict.detail,
            },
        )

    # 2. Live CMEK-encrypted BigQuery & GCS read (also independently enforced by GCP KMS!)
    try:
        bq = bigquery.Client(project=PROJECT_ID)
        sql = f"""
            SELECT record_id, tenant_id, regulatory_scope, payload_summary
            FROM `{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}`
            ORDER BY record_id
        """
        rows = [dict(r.items()) for r in bq.query(sql, location=REGION).result()]

        gcs_client = storage.Client(project=PROJECT_ID)
        blob = gcs_client.bucket(GCS_BUCKET).blob("vault_attestation.txt")
        gcs_payload = blob.download_as_text() if blob.exists() else ""
    except gcp_exceptions.GoogleAPICallError:
        LOGGER.warning("CMEK-protected GCP storage/BigQuery call denied")
        raise HTTPException(
            status_code=423,
            detail={"code": "CMEK_CRYPTOGRAPHIC_DENY", "message": "CMEK-encrypted data plane denied decryption."},
        )

    return {
        "status": "ALLOW",
        "topology": "PATTERN_B_SOVEREIGN_SILO",
        "kms_state": state_name,
        "bq_row_count": len(rows),
        "bq_rows": rows,
        "gcs_object_preview": gcs_payload[:160],
    }
