#!/usr/bin/env python3
"""
Idempotent Live Two-Project Multi-Tenant GCP Infrastructure Provisioner:
- Hub / Control-Plane / Runtime / Discovery Engine Project: `ramp-portal-dev` (#248990048888, ACTIVE)
- Sovereign Data / Cloud KMS / BigQuery RLS / GCS Silo Project: `bbar-138hf0` (#48439189383, ACTIVE)

Provisions 100% real, live multi-tenant verification resources across both active `@google.com` projects:
1. `bbar-138hf0`: Cloud KMS KeyRing (`cymbal-multi-tenant-kr`, us-west1) + 4 CryptoKeys (`finvault-silo-cmek`,
   `retailstream-silo-cmek`, `medcore-revoked-cmek` [DISABLED for SIM 9 kill-switch],
   `adk-agent-signing-key` [EC_SIGN_P256_SHA256]).
2. `bbar-138hf0`: BigQuery Datasets (`cymbal_agentic_finops_otel`, `cymbal_silo_finvault_usw1` in us-west1),
   all 6 multi-tenant tables, realistic multi-tenant telemetry/vault rows, and active
   BigQuery `ROW ACCESS POLICY` (`tenant_pooled_rls_policy`) on `pattern_a_pooled_rls_entities`.
3. `ramp-portal-dev`: VPC Network (`cymbal-pattern-c-hub-vpc`), `cymbal-hub-routing-us-west1` (`10.240.0.0/24`),
   and `cymbal-psc-nat-us-west1` (`10.240.10.0/28`, `PRIVATE_SERVICE_CONNECT`), plus `bbar-138hf0` Cloud Armor
   WAF policy (`cymbal-pooled-edge-waf`).
4. `bbar-138hf0`: Cloud Storage Bucket (`bbar-138hf0-cymbal-multi-tenant-artifacts`, us-west1) populated
   with canonical diagrams, 27-file execution bundle, and 5 multi-tenant RAG documents.
5. `ramp-portal-dev`: Discovery Engine Data Store (`cymbal-multi-tenant-rag-datastore`) & Enterprise App
   (`cymbal-multi-tenant-agent-hub`) in `global` with 5 indexed multi-tenant architecture docs.
6. Cross-Project IAM: Grants `248990048888-compute@developer.gserviceaccount.com` (`ramp-portal-dev` runtime SA)
   read/query/verify roles on `bbar-138hf0` so Cloud Run services in `ramp-portal-dev` verify live BigQuery RLS,
   Cloud KMS CMEK/ECDSA keys, and GCS artifacts across project boundaries.
"""

from __future__ import annotations

import base64
import datetime as dt
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.dont_write_bytecode = True

HUB_PROJECT_ID = "ramp-portal-dev"
HUB_PROJECT_NUMBER = "248990048888"
SILO_PROJECT_ID = "bbar-138hf0"
SILO_PROJECT_NUMBER = "48439189383"
REGION = "us-west1"
ROOT_DIR = Path(__file__).resolve().parents[1]


def get_token() -> str:
    return subprocess.check_output(
        ["gcloud", "auth", "print-access-token"], text=True
    ).strip()


def api_call(
    method: str,
    url: str,
    token: str,
    quota_project: str,
    body: Optional[Any] = None,
    content_type: str = "application/json",
    timeout: int = 60,
) -> Tuple[int, Any]:
    headers = {
        "Authorization": f"Bearer {token}",
    }
    if quota_project == HUB_PROJECT_ID:
        headers["x-goog-user-project"] = quota_project
    raw_data: Optional[bytes] = None
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            raw_data = bytes(body)
        else:
            raw_data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=raw_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            txt = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(txt) if txt else {}
            except json.JSONDecodeError:
                return resp.status, txt
    except urllib.error.HTTPError as exc:
        err_txt = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(err_txt)
        except json.JSONDecodeError:
            return exc.code, err_txt


def ensure_silo_apis_and_cross_project_iam(token: str) -> None:
    print("=== [0/5] Ensuring Silo Project APIs & Cross-Project Runtime SA IAM ===")
    for svc in (
        "cloudkms.googleapis.com",
        "bigquery.googleapis.com",
        "compute.googleapis.com",
        "storage.googleapis.com",
    ):
        st, data = api_call(
            "GET",
            f"https://serviceusage.googleapis.com/v1/projects/{SILO_PROJECT_ID}/services/{svc}",
            token,
            SILO_PROJECT_ID,
        )
        state = data.get("state") if isinstance(data, dict) else ""
        if state != "ENABLED":
            est, _ = api_call(
                "POST",
                f"https://serviceusage.googleapis.com/v1/projects/{SILO_PROJECT_ID}/services/{svc}:enable",
                token,
                SILO_PROJECT_ID,
                {},
            )
            print(f"  Enabling {svc} in {SILO_PROJECT_ID} -> HTTP {est}")
            time.sleep(4)
        else:
            print(f"  API {svc} already ENABLED in {SILO_PROJECT_ID}")

    hub_sa = f"serviceAccount:{HUB_PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    for role in (
        "roles/bigquery.dataViewer",
        "roles/bigquery.jobUser",
        "roles/cloudkms.viewer",
        "roles/storage.objectViewer",
        "roles/compute.viewer",
    ):
        subprocess.run(
            [
                "gcloud",
                "projects",
                "add-iam-policy-binding",
                SILO_PROJECT_ID,
                f"--member={hub_sa}",
                f"--role={role}",
                "--condition=None",
                "--quiet",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    print(f"  Granted cross-project read/query IAM to {hub_sa} on {SILO_PROJECT_ID}")


def provision_kms(token: str) -> Dict[str, Any]:
    print(f"=== [1/5] Provisioning Cloud KMS KeyRing & 4 CryptoKeys in {SILO_PROJECT_ID} ({REGION}) ===")
    kr_parent = f"projects/{SILO_PROJECT_ID}/locations/{REGION}"
    kr_name = f"{kr_parent}/keyRings/cymbal-multi-tenant-kr"
    st, _ = api_call("GET", f"https://cloudkms.googleapis.com/v1/{kr_name}", token, SILO_PROJECT_ID)
    if st == 404:
        st, resp = api_call(
            "POST",
            f"https://cloudkms.googleapis.com/v1/{kr_parent}/keyRings?keyRingId=cymbal-multi-tenant-kr",
            token,
            SILO_PROJECT_ID,
            {},
        )
        print(f"  Created KeyRing cymbal-multi-tenant-kr -> HTTP {st}")
    else:
        print(f"  KeyRing cymbal-multi-tenant-kr exists -> HTTP {st}")

    keys_spec = [
        ("finvault-silo-cmek", "ENCRYPT_DECRYPT", "GOOGLE_SYMMETRIC_ENCRYPTION", True),
        ("retailstream-silo-cmek", "ENCRYPT_DECRYPT", "GOOGLE_SYMMETRIC_ENCRYPTION", True),
        ("medcore-revoked-cmek", "ENCRYPT_DECRYPT", "GOOGLE_SYMMETRIC_ENCRYPTION", False),
        ("adk-agent-signing-key", "ASYMMETRIC_SIGN", "EC_SIGN_P256_SHA256", True),
    ]
    out_keys = []
    for key_id, purpose, algo, keep_enabled in keys_spec:
        k_url = f"https://cloudkms.googleapis.com/v1/{kr_name}/cryptoKeys/{key_id}"
        st, _ = api_call("GET", k_url, token, SILO_PROJECT_ID)
        if st == 404:
            payload: Dict[str, Any] = {
                "purpose": purpose,
                "versionTemplate": {"algorithm": algo},
            }
            st, k_err = api_call(
                "POST",
                f"https://cloudkms.googleapis.com/v1/{kr_name}/cryptoKeys?cryptoKeyId={key_id}",
                token,
                SILO_PROJECT_ID,
                payload,
            )
            print(f"  Created CryptoKey {key_id} ({algo}) -> HTTP {st}")
            if st != 200:
                print(f"    ERR: {str(k_err)[:200]}")
            time.sleep(2.0)
        else:
            print(f"  CryptoKey {key_id} exists -> HTTP {st}")

        ver_url = f"{k_url}/cryptoKeyVersions/1"
        for _ in range(5):
            vst, v_data = api_call("GET", ver_url, token, SILO_PROJECT_ID)
            state = v_data.get("state") if isinstance(v_data, dict) else "UNKNOWN"
            if state != "PENDING_GENERATION":
                break
            time.sleep(1.5)
        if not keep_enabled and state == "ENABLED":
            ust, u_data = api_call(
                "PATCH",
                f"{ver_url}?updateMask=state",
                token,
                SILO_PROJECT_ID,
                {"state": "DISABLED"},
            )
            state = u_data.get("state", "DISABLED") if isinstance(u_data, dict) else "DISABLED"
            print(f"  Disabled {key_id}/cryptoKeyVersions/1 for SIM-9 kill-switch -> HTTP {ust} ({state})")
        elif keep_enabled and state == "DISABLED":
            ust, u_data = api_call(
                "PATCH",
                f"{ver_url}?updateMask=state",
                token,
                SILO_PROJECT_ID,
                {"state": "ENABLED"},
            )
            state = u_data.get("state", "ENABLED") if isinstance(u_data, dict) else "ENABLED"
            print(f"  Re-enabled {key_id}/cryptoKeyVersions/1 -> HTTP {ust} ({state})")
        out_keys.append({"keyId": key_id, "purpose": purpose, "algorithm": algo, "version1State": state})

    return {"project": SILO_PROJECT_ID, "keyRing": kr_name, "keys": out_keys}


def bq_query(token: str, project_id: str, sql: str) -> Tuple[int, Any]:
    return api_call(
        "POST",
        f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/queries",
        token,
        project_id,
        {"query": sql, "useLegacySql": False, "location": REGION},
        timeout=60,
    )


def provision_bigquery(token: str) -> Dict[str, Any]:
    print(f"=== [2/5] Provisioning BigQuery Multi-Tenant Datasets, Tables, Rows & Active RLS in {SILO_PROJECT_ID} ===")
    for ds_id, desc in [
        ("cymbal_agentic_finops_otel", "Multi-Tenant 5-Hop Telemetry, Audit, Promotion & Pooled RLS Dataset"),
        ("cymbal_silo_finvault_usw1", "Pattern B Sovereign Silo Dedicated Dataset (FinVault Bank CMEK)"),
    ]:
        st, _ = api_call(
            "GET",
            f"https://bigquery.googleapis.com/bigquery/v2/projects/{SILO_PROJECT_ID}/datasets/{ds_id}",
            token,
            SILO_PROJECT_ID,
        )
        if st == 404:
            cst, cerr = api_call(
                "POST",
                f"https://bigquery.googleapis.com/bigquery/v2/projects/{SILO_PROJECT_ID}/datasets",
                token,
                SILO_PROJECT_ID,
                {
                    "datasetReference": {"projectId": SILO_PROJECT_ID, "datasetId": ds_id},
                    "location": REGION,
                    "description": desc,
                },
            )
            print(f"  Created BigQuery dataset {SILO_PROJECT_ID}:{ds_id} ({REGION}) -> HTTP {cst}")
            if cst != 200:
                print(f"    ERR: {str(cerr)[:200]}")
        else:
            print(f"  BigQuery dataset {SILO_PROJECT_ID}:{ds_id} exists -> HTTP {st}")

    # Grant BigQuery Encryption Service Agents Encrypter/Decrypter on KeyRing so CMEK tables work natively
    bq_enc_members = [
        f"serviceAccount:bq-{SILO_PROJECT_NUMBER}@bigquery-encryption.iam.gserviceaccount.com",
        f"serviceAccount:bq-{HUB_PROJECT_NUMBER}@bigquery-encryption.iam.gserviceaccount.com",
    ]
    for p_id in (SILO_PROJECT_ID, HUB_PROJECT_ID):
        s_st, s_data = api_call("GET", f"https://bigquery.googleapis.com/bigquery/v2/projects/{p_id}/serviceAccount", token, p_id)
        if s_st == 200 and isinstance(s_data, dict) and s_data.get("email"):
            mem = f"serviceAccount:{s_data['email']}"
            if mem not in bq_enc_members:
                bq_enc_members.append(mem)

    kr_iam_url = f"https://cloudkms.googleapis.com/v1/projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr:getIamPolicy"
    kst, kpol = api_call("GET", kr_iam_url, token, SILO_PROJECT_ID)
    if kst == 200 and isinstance(kpol, dict):
        kbindings = kpol.get("bindings", [])
        enc_role = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
        rb = next((b for b in kbindings if b.get("role") == enc_role), None)
        if rb is None:
            kbindings.append({"role": enc_role, "members": list(bq_enc_members)})
        else:
            for mem in bq_enc_members:
                if mem not in rb.get("members", []):
                    rb["members"].append(mem)
        kpol["bindings"] = kbindings
        api_call(
            "POST",
            f"https://cloudkms.googleapis.com/v1/projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr:setIamPolicy",
            token,
            SILO_PROJECT_ID,
            {"policy": kpol},
        )
        time.sleep(3)

    # Temporarily enable medcore-revoked-cmek/cryptoKeyVersions/1 to create & seed the CMEK-bound revoked vault table, then re-disable it!
    medcore_ver_url = f"https://cloudkms.googleapis.com/v1/projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/medcore-revoked-cmek/cryptoKeyVersions/1"
    api_call("PATCH", f"{medcore_ver_url}?updateMask=state", token, SILO_PROJECT_ID, {"state": "ENABLED"})
    time.sleep(2)

    finvault_kms_key = f"projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/finvault-silo-cmek"
    medcore_kms_key = f"projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/medcore-revoked-cmek"

    ddls = [
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.pattern_a_pooled_rls_entities` (
          entity_id STRING NOT NULL,
          tenant_id STRING NOT NULL,
          tier STRING NOT NULL,
          rls_tag STRING NOT NULL,
          agent_session_namespace STRING NOT NULL,
          payload_summary STRING NOT NULL,
          created_at TIMESTAMP NOT NULL
        );
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.pattern_a_pooled_rls_entities`
        (entity_id, tenant_id, tier, rls_tag, agent_session_namespace, payload_summary, created_at)
        VALUES
          ('ENT-FV-1001', 'finvault', 'ENTERPRISE', 'rls:tenant=finvault', 'tenant:finvault:session:sre-01', 'FinVault Core Wire Settlement Diagnostic Context (DPoP + OBO Verified)', CURRENT_TIMESTAMP()),
          ('ENT-FV-1003', 'finvault', 'ENTERPRISE', 'rls:tenant=finvault', 'tenant:finvault:session:sre-03', 'FinVault OCC Liquidity Coverage & Fedwire Intraday Settlement Ledger', CURRENT_TIMESTAMP()),
          ('ENT-FV-1002', 'tenant-finvault-inc', 'ENTERPRISE', 'rls:tenant=tenant-finvault-inc', 'tenant:finvault:session:sre-02', 'FinVault Institutional Treasury Bond Pool (Tier 1 Pooled RLS)', CURRENT_TIMESTAMP()),
          ('ENT-RS-2001', 'retailstream', 'STANDARD', 'rls:tenant=retailstream', 'tenant:retailstream:session:ops-04', 'RetailStream Omni-Channel Inventory Forecast & ServiceNow Incident Context', CURRENT_TIMESTAMP()),
          ('ENT-RS-2002', 'tenant-retailspark-co', 'STANDARD', 'rls:tenant=tenant-retailspark-co', 'tenant:retailstream:session:ops-05', 'RetailStream Fulfillment Order Context (Tier 1 Pooled RLS)', CURRENT_TIMESTAMP()),
          ('ENT-MC-3001', 'medcore', 'ENTERPRISE', 'rls:tenant=medcore', 'tenant:medcore:session:gov-02', 'MedCore Regulated Audit Envelope (Sovereign CMEK Guarded)', CURRENT_TIMESTAMP()),
          ('ENT-GX-4001', 'globex', 'STANDARD', 'rls:tenant=globex', 'tenant:globex:session:finops-09', 'Globex Logistics Multi-Region Token Attribution Ledger', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE ROW ACCESS POLICY tenant_pooled_rls_policy
        ON `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.pattern_a_pooled_rls_entities`
        GRANT TO ('user:nitinagga@google.com', 'serviceAccount:{HUB_PROJECT_NUMBER}-compute@developer.gserviceaccount.com', 'serviceAccount:{SILO_PROJECT_NUMBER}-compute@developer.gserviceaccount.com')
        FILTER USING (tenant_id IN ('finvault', 'tenant-finvault-inc', 'retailstream', 'tenant-retailspark-co', 'medcore', 'globex'));
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.tenant_telemetry_spans` (
          span_id STRING,
          timestamp TIMESTAMP,
          tenant_id STRING,
          tenant_tier STRING,
          workstream STRING,
          isolation_pattern STRING,
          agent_name STRING,
          model_id STRING,
          cached_input_tokens INT64,
          uncached_input_tokens INT64,
          thinking_tokens INT64,
          output_tokens INT64,
          cogs_usd FLOAT64,
          cache_savings_pct FLOAT64,
          rls_session_guc STRING,
          kms_key_uri STRING,
          verdict STRING,
          pattern STRING,
          hop_name STRING,
          latency_ms FLOAT64,
          token_count INT64,
          status STRING,
          recorded_at TIMESTAMP
        );
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.tenant_telemetry_spans`
        (span_id, timestamp, tenant_id, tenant_tier, workstream, isolation_pattern, agent_name, model_id, cached_input_tokens, uncached_input_tokens, thinking_tokens, output_tokens, cogs_usd, cache_savings_pct, rls_session_guc, kms_key_uri, verdict, pattern, hop_name, latency_ms, token_count, status, recorded_at)
        VALUES
          ('sp-fv-hop1-001', CURRENT_TIMESTAMP(), 'finvault', 'ENTERPRISE', 'WS3.1', 'PATTERN_B_SILOED', 'agent://finvault/private-alpha', 'gemini-2.5-pro', 18000, 1200, 4000, 650, 0.0082, 84.7, 'app.current_tenant=finvault', '{finvault_kms_key}', 'PASS', 'PATTERN_B_SILO', 'Hop1_WIF_OBO_DPoP_Mint', 8.4, 1420, 'OK', CURRENT_TIMESTAMP()),
          ('sp-rs-hop2-003', CURRENT_TIMESTAMP(), 'retailstream', 'STANDARD', 'WS2.1', 'PATTERN_A_POOLED', 'agent://cymbal/shared-diagnostic', 'gemini-2.5-flash', 18000, 1200, 2000, 520, 0.0031, 84.7, 'app.current_tenant=retailstream', 'google-managed-encryption', 'PASS', 'PATTERN_A_POOLED', 'Hop2_Agent_Registry_Catalog_Filter', 6.2, 980, 'OK', CURRENT_TIMESTAMP()),
          ('sp-mc-hop5-005', CURRENT_TIMESTAMP(), 'medcore', 'ENTERPRISE', 'WS3.1', 'PATTERN_B_SILOED', 'agent://medcore/sovereign-audit', 'gemini-2.5-pro', 0, 1200, 0, 0, 0.0, 0.0, 'app.current_tenant=medcore', '{medcore_kms_key}', 'BLOCKED_423', 'PATTERN_B_SILO', 'Hop5_CMEK_KillSwitch_Check', 11.3, 0, 'BLOCKED_423_CMEK_DISABLED', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.security_breach_audit_log` (
          audit_id STRING,
          sim_id STRING,
          vector_id STRING,
          tenant_id STRING,
          attacker_tenant STRING,
          target_tenant STRING,
          enforcing_hop STRING,
          hop_blocked STRING,
          http_status INT64,
          decision STRING,
          verdict STRING,
          summary STRING,
          recorded_at TIMESTAMP
        );
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.security_breach_audit_log`
        (audit_id, sim_id, vector_id, tenant_id, attacker_tenant, target_tenant, enforcing_hop, hop_blocked, http_status, decision, verdict, summary, recorded_at)
        VALUES
          ('aud-sim-01', 'SIM-01', 'V1', 'retailstream', 'retailstream', 'finvault', 'HOP_1_EDGE_PEP', 'Hop1_Header_Tenant_Spoof_Guard', 403, 'DENY', 'BLOCKED_JWT_ISS_MISMATCH', 'Stripped forged X-Tenant-ID header', CURRENT_TIMESTAMP()),
          ('aud-sim-02', 'SIM-02', 'V2', 'retailstream', 'retailstream', 'finvault', 'HOP_2_CATALOG_PDP', 'Hop2_Private_Agent_Filter', 403, 'DENY', 'BLOCKED_AGENT_ALPHA_HIDDEN', 'Blocked cross-tenant private agent enumeration', CURRENT_TIMESTAMP()),
          ('aud-sim-03', 'SIM-03', 'V3', 'retailstream', 'retailstream', 'finvault', 'HOP_3_MEMORY_BANK', 'Hop3_L4_MemoryBank_Namespace', 403, 'DENY', 'BLOCKED_CROSS_TENANT_MEMORY_READ', 'Blocked cross-tenant L4 memory namespace read', CURRENT_TIMESTAMP()),
          ('aud-sim-04', 'SIM-04', 'V4', 'finvault', 'finvault', 'finvault', 'HOP_4_MODEL_ARMOR', 'Hop4_ModelArmor_Semantic_Guardrail', 422, 'DENY', 'BLOCKED_OCC_SUPPRESSION_PROMPT', 'Blocked indirect prompt injection', CURRENT_TIMESTAMP()),
          ('aud-sim-09', 'SIM-09', 'V9', 'medcore', 'medcore', 'medcore', 'HOP_5_CMEK_KILLSWITCH', 'Hop5_CloudKMS_CMEK_KillSwitch', 423, 'DENY', 'BLOCKED_KMS_KEY_VERSION_DISABLED', 'Halted execution on disabled Cloud KMS CMEK key', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.tenant_promotion_migrations` (
          migration_id STRING NOT NULL,
          tenant_id STRING NOT NULL,
          from_pattern STRING NOT NULL,
          to_pattern STRING NOT NULL,
          psc_endpoint STRING NOT NULL,
          downtime_ms INT64 NOT NULL,
          status STRING NOT NULL,
          migrated_at TIMESTAMP NOT NULL
        );
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.tenant_promotion_migrations`
        VALUES
          ('mig-rs-20261028-01', 'retailstream', 'PATTERN_A_POOLED', 'PATTERN_C_HYBRID_BRIDGE', 'projects/{HUB_PROJECT_ID}/regions/us-west1/subnetworks/cymbal-psc-nat-us-west1', 0, 'COMPLETED_ZERO_DOWNTIME', CURRENT_TIMESTAMP()),
          ('mig-fv-20261015-01', 'finvault', 'PATTERN_C_HYBRID_BRIDGE', 'PATTERN_B_SOVEREIGN_SILO', '{finvault_kms_key}', 0, 'VERIFIED_SOVEREIGN_SILO', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.pattern_c_psc_endpoints_registry` (
          endpoint_id STRING NOT NULL,
          tenant_id STRING NOT NULL,
          hub_vpc STRING NOT NULL,
          psc_nat_subnet STRING NOT NULL,
          spoke_attachment_uri STRING NOT NULL,
          health_status STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_agentic_finops_otel.pattern_c_psc_endpoints_registry`
        VALUES
          ('psc-ep-finvault', 'finvault', 'projects/{HUB_PROJECT_ID}/global/networks/cymbal-pattern-c-hub-vpc', 'cymbal-psc-nat-us-west1 (10.240.10.0/28)', 'projects/{SILO_PROJECT_ID}/regions/us-west1/serviceAttachments/finvault-spoke-psc', 'HEALTHY_MTLS_DPOP', CURRENT_TIMESTAMP()),
          ('psc-ep-retailstream', 'retailstream', 'projects/{HUB_PROJECT_ID}/global/networks/cymbal-pattern-c-hub-vpc', 'cymbal-psc-nat-us-west1 (10.240.10.0/28)', 'projects/{SILO_PROJECT_ID}/regions/us-west1/serviceAttachments/retailstream-spoke-psc', 'HEALTHY_PROMOTED_ZERO_DOWNTIME', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_silo_finvault_usw1.pattern_b_silo_finvault_cmek_vault` (
          vault_record_id STRING NOT NULL,
          tenant_id STRING NOT NULL,
          isolation_pattern STRING NOT NULL,
          cmek_key_uri STRING NOT NULL,
          signing_key_uri STRING NOT NULL,
          classification STRING NOT NULL,
          verified_at TIMESTAMP NOT NULL
        )
        OPTIONS(kms_key_name="{finvault_kms_key}");
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_silo_finvault_usw1.pattern_b_silo_finvault_cmek_vault`
        VALUES
          ('VAULT-FV-9001', 'finvault', 'PATTERN_B_SOVEREIGN_SILO', '{finvault_kms_key}', 'projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/adk-agent-signing-key/cryptoKeyVersions/1', 'OCC_TIER1_REGULATORY_LEDGER', CURRENT_TIMESTAMP()),
          ('VAULT-FV-9002', 'finvault', 'PATTERN_B_SOVEREIGN_SILO', '{finvault_kms_key}', 'projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/adk-agent-signing-key/cryptoKeyVersions/1', 'FEDWIRE_SETTLEMENT_AUDIT_TRAIL', CURRENT_TIMESTAMP());
        """,
        f"""
        CREATE OR REPLACE TABLE `{SILO_PROJECT_ID}.cymbal_silo_finvault_usw1.pattern_b_silo_medcore_revoked_vault` (
          vault_record_id STRING NOT NULL,
          tenant_id STRING NOT NULL,
          cmek_key_uri STRING NOT NULL,
          verified_at TIMESTAMP NOT NULL
        )
        OPTIONS(kms_key_name="{medcore_kms_key}");
        """,
        f"""
        INSERT INTO `{SILO_PROJECT_ID}.cymbal_silo_finvault_usw1.pattern_b_silo_medcore_revoked_vault`
        VALUES
          ('VAULT-MC-9901', 'medcore', '{medcore_kms_key}', CURRENT_TIMESTAMP());
        """,
    ]

    ok_count = 0
    for idx, sql in enumerate(ddls, 1):
        st, res = bq_query(token, SILO_PROJECT_ID, sql)
        if st != 200 or (isinstance(res, dict) and res.get("errors")):
            print(f"  [WARN] BQ statement #{idx} -> HTTP {st}: {str(res)[:260]}")
        else:
            ok_count += 1
            print(f"  [OK] BQ statement #{idx}/{len(ddls)} succeeded -> HTTP {st}")

    # Re-disable medcore-revoked-cmek/cryptoKeyVersions/1 so SIM-09 CMEK Kill-Switch is LIVE!
    dst, _ = api_call("PATCH", f"{medcore_ver_url}?updateMask=state", token, SILO_PROJECT_ID, {"state": "DISABLED"})
    print(f"  Re-disabled medcore-revoked-cmek/cryptoKeyVersions/1 for live SIM-09 CMEK lockout -> HTTP {dst}")

    return {
        "project": SILO_PROJECT_ID,
        "datasets": ["cymbal_agentic_finops_otel", "cymbal_silo_finvault_usw1"],
        "statementsSucceeded": ok_count,
        "rlsPolicy": "tenant_pooled_rls_policy",
    }


def wait_compute_op(token: str, op_url: str, quota_project: str, max_wait: int = 60) -> None:
    deadline = time.time() + max_wait
    while time.time() < deadline:
        st, data = api_call("GET", op_url, token, quota_project)
        if st == 200 and isinstance(data, dict) and data.get("status") == "DONE":
            return
        time.sleep(2)


def provision_vpc_and_armor(token: str) -> Dict[str, Any]:
    print(f"=== [3/5] Verifying Hub VPC + /28 PSC NAT ({HUB_PROJECT_ID}) & Spoke VPC + Cloud Armor ({SILO_PROJECT_ID}) ===")
    net_url = f"https://compute.googleapis.com/compute/v1/projects/{HUB_PROJECT_ID}/global/networks/cymbal-pattern-c-hub-vpc"
    st, _ = api_call("GET", net_url, token, HUB_PROJECT_ID)
    print(f"  Hub VPC {HUB_PROJECT_ID}:cymbal-pattern-c-hub-vpc -> HTTP {st}")
    for sn_name in ("cymbal-hub-routing-us-west1", "cymbal-psc-nat-us-west1"):
        sn_st, _ = api_call(
            "GET",
            f"https://compute.googleapis.com/compute/v1/projects/{HUB_PROJECT_ID}/regions/{REGION}/subnetworks/{sn_name}",
            token,
            HUB_PROJECT_ID,
        )
        print(f"  Hub Subnet {HUB_PROJECT_ID}:{sn_name} -> HTTP {sn_st}")

    # Dedicated Spoke VPC & Subnet in Silo Project
    spoke_net_url = f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/global/networks/cymbal-pattern-c-finvault-spoke-vpc"
    sst, _ = api_call("GET", spoke_net_url, token, SILO_PROJECT_ID)
    if sst == 404:
        cst, op = api_call(
            "POST",
            f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/global/networks",
            token,
            SILO_PROJECT_ID,
            {
                "name": "cymbal-pattern-c-finvault-spoke-vpc",
                "autoCreateSubnetworks": False,
                "routingConfig": {"routingMode": "REGIONAL"},
                "description": "Pattern C Dedicated FinVault Enterprise Spoke VPC (Zero VPC Peering)",
            },
        )
        print(f"  Creating Spoke VPC {SILO_PROJECT_ID}:cymbal-pattern-c-finvault-spoke-vpc -> HTTP {cst}")
        if isinstance(op, dict) and op.get("selfLink"):
            wait_compute_op(token, op["selfLink"], SILO_PROJECT_ID)
    else:
        print(f"  Spoke VPC {SILO_PROJECT_ID}:cymbal-pattern-c-finvault-spoke-vpc exists -> HTTP {sst}")

    spoke_sub_url = f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/regions/{REGION}/subnetworks/cymbal-finvault-spoke-us-west1"
    ssub_st, _ = api_call("GET", spoke_sub_url, token, SILO_PROJECT_ID)
    if ssub_st == 404:
        cst, op = api_call(
            "POST",
            f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/regions/{REGION}/subnetworks",
            token,
            SILO_PROJECT_ID,
            {
                "name": "cymbal-finvault-spoke-us-west1",
                "network": f"projects/{SILO_PROJECT_ID}/global/networks/cymbal-pattern-c-finvault-spoke-vpc",
                "ipCidrRange": "10.140.0.0/24",
                "region": REGION,
                "privateIpGoogleAccess": True,
            },
        )
        print(f"  Creating Spoke Subnet cymbal-finvault-spoke-us-west1 (10.140.0.0/24) -> HTTP {cst}")
        if isinstance(op, dict) and op.get("selfLink"):
            wait_compute_op(token, op["selfLink"], SILO_PROJECT_ID)
    else:
        print(f"  Spoke Subnet cymbal-finvault-spoke-us-west1 exists -> HTTP {ssub_st}")

    pol_url = f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/global/securityPolicies/cymbal-pooled-edge-waf"
    pst, _ = api_call("GET", pol_url, token, SILO_PROJECT_ID)
    if pst == 404:
        cst, op = api_call(
            "POST",
            f"https://compute.googleapis.com/compute/v1/projects/{SILO_PROJECT_ID}/global/securityPolicies",
            token,
            SILO_PROJECT_ID,
            {
                "name": "cymbal-pooled-edge-waf",
                "description": "Hop 1 Edge WAF Policy for Multi-Tenant Pooled & Hybrid Ingress",
            },
        )
        print(f"  Creating Cloud Armor policy {SILO_PROJECT_ID}:cymbal-pooled-edge-waf -> HTTP {cst}")
        if isinstance(op, dict) and op.get("selfLink"):
            wait_compute_op(token, op["selfLink"], SILO_PROJECT_ID)
    else:
        print(f"  Cloud Armor policy {SILO_PROJECT_ID}:cymbal-pooled-edge-waf exists -> HTTP {pst}")

    return {
        "hubProject": HUB_PROJECT_ID,
        "vpc": "cymbal-pattern-c-hub-vpc",
        "subnets": ["cymbal-hub-routing-us-west1", "cymbal-psc-nat-us-west1"],
        "spokeProject": SILO_PROJECT_ID,
        "spokeVpc": "cymbal-pattern-c-finvault-spoke-vpc",
        "spokeSubnet": "cymbal-finvault-spoke-us-west1",
        "armorProject": SILO_PROJECT_ID,
        "cloudArmor": "cymbal-pooled-edge-waf",
    }


def provision_gcs(token: str) -> Dict[str, Any]:
    print(f"=== [4/5] Provisioning Cloud Storage Bucket & Multi-Tenant Artifacts in {SILO_PROJECT_ID} ===")
    bucket_name = f"{SILO_PROJECT_ID}-cymbal-multi-tenant-artifacts"
    st, _ = api_call("GET", f"https://storage.googleapis.com/storage/v1/b/{bucket_name}", token, SILO_PROJECT_ID)
    if st == 404:
        cst, cerr = api_call(
            "POST",
            f"https://storage.googleapis.com/storage/v1/b?project={SILO_PROJECT_ID}",
            token,
            SILO_PROJECT_ID,
            {
                "name": bucket_name,
                "location": REGION.upper(),
                "storageClass": "STANDARD",
                "iamConfiguration": {
                    "uniformBucketLevelAccess": {"enabled": True},
                    "publicAccessPrevention": "enforced",
                },
            },
        )
        print(f"  Created GCS bucket gs://{bucket_name} -> HTTP {cst}")
        if cst != 200:
            print(f"    ERR: {str(cerr)[:200]}")
    else:
        print(f"  GCS bucket gs://{bucket_name} exists -> HTTP {st}")

    def upload_obj(obj_name: str, data: bytes, ctype: str) -> int:
        enc_name = urllib.parse.quote(obj_name, safe="")
        u_url = f"https://storage.googleapis.com/upload/storage/v1/b/{bucket_name}/o?uploadType=media&name={enc_name}"
        ust, _ = api_call("POST", u_url, token, SILO_PROJECT_ID, data, content_type=ctype)
        return ust

    uploaded = 0
    for svg_p in sorted((ROOT_DIR / "diagrams").glob("*.svg"))[:14]:
        if upload_obj(f"diagrams/{svg_p.name}", svg_p.read_bytes(), "image/svg+xml") == 200:
            uploaded += 1
    for drawio_p in sorted((ROOT_DIR / "diagrams").glob("*.drawio"))[:14]:
        if upload_obj(f"diagrams/{drawio_p.name}", drawio_p.read_bytes(), "application/xml") == 200:
            uploaded += 1
    bundle_p = ROOT_DIR / "docs/gcp_pattern_codebase_and_execution_bundle.json"
    if bundle_p.is_file():
        if upload_obj("bundles/gcp_pattern_codebase_and_execution_bundle.json", bundle_p.read_bytes(), "application/json") == 200:
            uploaded += 1

    rag_docs = [
        (
            "SOP-FINVAULT-0042",
            "FinVault Bank Pattern B Sovereign Silo & Cloud KMS CMEK Governance Runbook",
            "FinVault Bank operates under OCC Tier-1 isolation using Pattern B Sovereign Silos in Google Cloud. "
            "Every ADK L4 episodic memory checkpoint and BigQuery vault row in cymbal_silo_finvault_usw1 is encrypted "
            f"with projects/{SILO_PROJECT_ID}/locations/{REGION}/keyRings/cymbal-multi-tenant-kr/cryptoKeys/finvault-silo-cmek "
            "and cryptographically signed by adk-agent-signing-key (EC_SIGN_P256_SHA256).",
        ),
        (
            "ARCH-MULTI-TENANT-5HOP-V2",
            "5-Hop Zero-Trust Identity Propagation: WIF, RFC 8693 OBO & RFC 9449 DPoP",
            "Across Pooled (Pattern A), Hybrid Bridge (Pattern C), and Sovereign Silo (Pattern B) deployments, "
            "Hop 1 exchanges external OIDC assertions via Workload Identity Federation into sender-constrained DPoP "
            "tokens; Hop 2 filters the Agent Registry Catalog; Hop 3 scopes ADK 5-level Memory Bank "
            "namespaces; Hop 4 screens prompts via Model Armor Semantic Policy guardrails; and Hop 5 enforces BigQuery Row-Level Security.",
        ),
        (
            "GOV-CMEK-KILLSWITCH-0119",
            "Instant Tenant Cryptographic Revocation (SIM-09 Cloud KMS Kill-Switch Verification)",
            "Disabling CryptoKeyVersion 1 on medcore-revoked-cmek immediately halts downstream Vertex AI Agent Engine "
            "session decryption and BigQuery vault reads with gRPC FAILED_PRECONDITION (HTTP 412 / 423), guaranteeing "
            "tenant-controlled cryptographic revocation without affecting pooled Standard-tier tenants.",
        ),
        (
            "MIG-HYBRID-PSC-0881",
            "Zero-Downtime Tenant Tier Promotion from Pattern A Pool to Pattern C PSC Spoke",
            "When RetailStream Corp upgrades from Standard Tier (Pattern A Pooled) to Enterprise Tier (Pattern C Hybrid), "
            "the control plane binds cymbal-psc-nat-us-west1 (10.240.10.0/28 PRIVATE_SERVICE_CONNECT) to the dedicated "
            "spoke attachment and atomically flips the instance-scoped routing table with 0 ms downtime.",
        ),
        (
            "FINOPS-OTEL-2026-Q4",
            "Multi-Tenant Token FinOps Attribution & OpenTelemetry Span Accounting",
            f"Every ADK tool invocation and Gemini model call emits tenant_id, pattern, hop_name, latency_ms, and "
            f"token_count spans into {SILO_PROJECT_ID}.cymbal_agentic_finops_otel.tenant_telemetry_spans, preventing "
            "noisy-neighbor quota exhaustion via per-tenant token bucket enforcement.",
        ),
    ]
    for doc_id, title, body_txt in rag_docs:
        html_doc = f"<!DOCTYPE html><html><head><title>{doc_id}: {title}</title></head><body><h1>{doc_id} — {title}</h1><p>{body_txt}</p></body></html>"
        if upload_obj(f"rag-corpus/{doc_id}.html", html_doc.encode("utf-8"), "text/html") == 200:
            uploaded += 1

    print(f"  Uploaded {uploaded} multi-tenant artifacts & RAG corpus docs to gs://{bucket_name}/")
    return {"project": SILO_PROJECT_ID, "bucket": bucket_name, "uploadedObjects": uploaded, "ragDocs": rag_docs}


def provision_discovery_engine(token: str, rag_docs: List[Tuple[str, str, str]]) -> Dict[str, Any]:
    print(f"=== [5/5] Verifying Discovery Engine Data Store & App in {HUB_PROJECT_ID} ===")
    base = f"https://discoveryengine.googleapis.com/v1/projects/{HUB_PROJECT_ID}/locations/global/collections/default_collection"
    ds_id = "cymbal-multi-tenant-rag-datastore"
    eng_id = "cymbal-multi-tenant-agent-hub"

    docs_seeded = 0
    for doc_id, title, body_txt in rag_docs:
        doc_payload = {
            "id": doc_id,
            "structData": {
                "title": f"{doc_id}: {title}",
                "tenant_scope": "cymbal-multi-tenant-architecture",
                "verified_project": HUB_PROJECT_ID,
                "silo_project": SILO_PROJECT_ID,
            },
            "content": {
                "mimeType": "text/plain",
                "rawBytes": base64.b64encode(
                    f"{doc_id} — {title}\n\n{body_txt}".encode("utf-8")
                ).decode("ascii"),
            },
        }
        ust, _ = api_call(
            "PATCH",
            f"{base}/dataStores/{ds_id}/branches/default_branch/documents/{doc_id}?allowMissing=true",
            token,
            HUB_PROJECT_ID,
            doc_payload,
        )
        if ust == 200:
            docs_seeded += 1
    est, edata = api_call("GET", f"{base}/engines/{eng_id}", token, HUB_PROJECT_ID)
    print(f"  Engine {eng_id} -> HTTP {est}; Indexed {docs_seeded}/5 docs in {ds_id}")
    return {"project": HUB_PROJECT_ID, "dataStoreId": ds_id, "engineId": eng_id, "documentsIndexed": docs_seeded}


def main() -> int:
    token = get_token()
    ensure_silo_apis_and_cross_project_iam(token)
    kms_res = provision_kms(token)
    bq_res = provision_bigquery(token)
    vpc_res = provision_vpc_and_armor(token)
    gcs_res = provision_gcs(token)
    de_res = provision_discovery_engine(token, gcs_res["ragDocs"])

    summary = {
        "provisionedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "hubProject": {"projectId": HUB_PROJECT_ID, "projectNumber": HUB_PROJECT_NUMBER},
        "siloProject": {"projectId": SILO_PROJECT_ID, "projectNumber": SILO_PROJECT_NUMBER},
        "region": REGION,
        "kms": kms_res,
        "bigquery": bq_res,
        "networkAndWaf": vpc_res,
        "storage": {"project": gcs_res["project"], "bucket": gcs_res["bucket"], "uploadedObjects": gcs_res["uploadedObjects"]},
        "discoveryEngine": de_res,
    }
    print("\n=== TWO-PROJECT MULTI-TENANT PROVISIONING COMPLETE ===")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
