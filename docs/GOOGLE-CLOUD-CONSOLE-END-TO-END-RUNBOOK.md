# End-to-End Google Cloud Console, Cloud Run `Source` & Docked Cloud Shell SSH Process Runbook

> **100% Cloud-Native Execution & Visual Proof (Zero Local Desktop Dependency & Zero Synthetic Blue Cards)**
> This runbook documents the exact end-to-end Setup, Execution, Validation, and Deployment workflow inside **Google Cloud Console (`pantheon.corp.google.com` / `console.cloud.google.com`)** for the **Cymbal Multi-Tenant Agentic AI Platform (`cymbal-multi-tenant-patterns`)** in project **`nitina-ggarwal-sandbox-647724`** (`#887605034827`, region `us-west1`) and Control Plane project **`ramp-portal-dev`** (`#248990048888`). Every stage below is paired with a full-resolution **Pantheon Cloud Run (`Source` / `Revision History` / `Networking`) + Docked `CLOUD SHELL Terminal` (`root@localhost:/app#`)** screenshot.

---

## 1. Live User Capture — Pantheon Cloud Run `Source` Tab + Docked Cloud Shell SSH (`200 OK`)

![Live User Capture — Pantheon Cloud Run Source Tab (server.py) + Docked Cloud Shell SSH Terminal (root@localhost:/app#) Executing Live BigQuery Audit Stream (200 OK)](../screenshots/cloud-console/pantheon_live_user_capture_ssh_verify.png)

---

## 2. Cloud Console Environment & Service Inventory

| Dimension | Provisioned Google Cloud Value | Direct Google Cloud Console URL |
| :--- | :--- | :--- |
| **Data & Runtime Project** | `nitina-ggarwal-sandbox-647724` (`#887605034827`) | [Open Project Dashboard ↗](https://console.cloud.google.com/home/dashboard?project=nitina-ggarwal-sandbox-647724) |
| **Control Plane Project** | `ramp-portal-dev` (`#248990048888`) | [Open Control Plane Dashboard ↗](https://console.cloud.google.com/home/dashboard?project=ramp-portal-dev) |
| **Cloud Run Service** | `cymbal-multi-tenant-patterns` (`us-west1`, Gen2) | [Open Cloud Run Service ↗](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/revisions?project=nitina-ggarwal-sandbox-647724) |
| **Active Revision** | `cymbal-multi-tenant-patterns-00003-wfh` (`100%` Traffic) | [Open Source Tab in Console ↗](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/source?project=nitina-ggarwal-sandbox-647724) |
| **Cloud Storage Codebase** | `gs://nitina-ggarwal-sandbox-647724-cymbal-multi-tenant-artifacts/codebase/` | [Open GCS Bucket Browser ↗](https://console.cloud.google.com/storage/browser/nitina-ggarwal-sandbox-647724-cymbal-multi-tenant-artifacts/codebase?project=nitina-ggarwal-sandbox-647724) |
| **BigQuery Datasets** | `cymbal_agentic_finops_otel` (`US`) & `cymbal_silo_finvault_usw1` (`us-west1`) | [Open BigQuery Studio ↗](https://console.cloud.google.com/bigquery?project=nitina-ggarwal-sandbox-647724) |
| **Cloud KMS KeyRing** | `cymbal-multi-tenant-kr` (`4` CryptoKeys in `us-west1`) | [Open Cloud KMS Keys ↗](https://console.cloud.google.com/security/kms/keyrings/manage/us-west1/cymbal-multi-tenant-kr?project=nitina-ggarwal-sandbox-647724) |
| **Hybrid PSC VPCs** | `cymbal-pattern-c-hub-vpc` + `cymbal-psc-nat-us-west1` (`/28`) + `cymbal-pattern-c-finvault-spoke-vpc` | [Open VPC Networks ↗](https://console.cloud.google.com/networking/networks/list?project=nitina-ggarwal-sandbox-647724) |

---

## 3. Stage-by-Stage End-to-End Execution Process (`Stages 1–8`)

### Stage 1 — Setup & SSH Connect: Cloud Run `Revision History`, `>_ SSH Preview` & Tunnel into `root@localhost:/app#`

1. Open [Cloud Run Service `cymbal-multi-tenant-patterns` (`Revision History`)](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/revisions?project=nitina-ggarwal-sandbox-647724&cloudshell=true).
2. Click **`>_ SSH`** on the active revision `cymbal-multi-tenant-patterns-00003-wfh` (or run the command below in the docked **Cloud Shell Terminal**):

```bash
gcloud beta run services ssh cymbal-multi-tenant-patterns \
  --project=nitina-ggarwal-sandbox-647724 \
  --region=us-west1
```

3. Once inside `root@localhost:/app#`, verify the container workspace:

```bash
pwd && ls -la
```

![Stage 1 — Cloud Run Source Editor: Write & Inspect Multi-Tenant Pattern A/B/C Code in Cloud Run Source Tab](../screenshots/cloud-console/gcp_console_01_cloud_run_source_editor.png)

---

### Stage 2 — Cloud Run Revisions & Deployment: Active Revision & 100% Traffic Verification

1. Click the **`Revisions`** tab in Google Cloud Console to verify the active deployed Cloud Run revision and inspect `core-cymbal-agent/runtime_pipeline.py` and all 24 files directly in Google Cloud Console.
2. In the bottom `root@localhost:/app#` terminal, list all 24 Python & Terraform files:

```bash
find core-cymbal-agent workstream-2-pattern-a-pooled workstream-3-pattern-b-siloed workstream-4-pattern-c-hybrid \
  -maxdepth 3 -type f \( -name "*.py" -o -name "*.tf" \) | sort
```

![Stage 2 — Cloud Run Revisions & Deployment (100% Traffic)](../screenshots/cloud-console/gcp_console_02_cloud_run_revisions_deploy.png)

---

### Stage 3 — Execution: Pattern A (Pooled 5-Hop Runtime & BigQuery RLS) — 10-Vector Breach Simulation Suite (`10/10 PASS`)

```bash
PYTHONPATH=. python3 workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py
```

![Stage 3 — BigQuery Studio: Pattern A Pooled RLS Table & Policy](../screenshots/cloud-console/gcp_console_03_bigquery_studio_pattern_a_rls.png)

---

### Stage 4 — Execution: Pattern B (Sovereign Silos, VPC-SC & Cloud KMS CMEK Kill-Switch) — 6-Point Suite (`6/6 PASS`)

```bash
PYTHONPATH=. python3 workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py
```

![Stage 4 — BigQuery Studio: Pattern B Sovereign Silo CMEK Vault](../screenshots/cloud-console/gcp_console_04_bigquery_studio_pattern_b_cmek.png)

---

### Stage 5 — Execution: Pattern C (Hybrid Control Plane + Private Service Connect Spoke & Cloud KMS Keyring) — 4-Point Suite (`4/4 PASS`)

```bash
PYTHONPATH=. python3 workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py
```

![Stage 5 — Cloud KMS: Cryptographic Keys & ECDSA Signing Keyring](../screenshots/cloud-console/gcp_console_05_cloud_kms_keyring_live.png)

---

### Stage 6 — Validation: Core 5-Hop Pipeline (`9/9 PASS`) + VPC PSC NAT Subnet (`10.240.0.0/28`), Cloud KMS ECDSA P-256 & BigQuery Audit Stream (`200 OK`)

```bash
PYTHONPATH=. python3 -m unittest core-cymbal-agent/tests/test_five_hop_pipeline.py -v && \
CYMBAL_LIVE_GCP=1 PYTHONPATH=. python3 -c "
from core_cymbal_agent.gcp_live_bridge import (
    kms_asymmetric_sign_digest,
    kms_encrypt_decrypt_roundtrip,
    bigquery_stream_audit_row,
)
sig = kms_asymmetric_sign_digest('cymbal-hop1-dpop-proof-finvault')
enc = kms_encrypt_decrypt_roundtrip('finvault', 'L4-episodic-memory-vector-payload')
bq  = bigquery_stream_audit_row('finvault', 'PATTERN_B_SILOED', 'ALLOW', 200, 'Live Cloud Run SSH Verification')
print('1. KMS ECDSA P-256 Sign :', sig)
print('2. KMS CMEK Roundtrip   :', enc)
print('3. BigQuery Audit Row   :', bq)
"
```

![Stage 6 — VPC Networks: Pattern C Hub VPC & /28 PSC NAT Subnet](../screenshots/cloud-console/gcp_console_06_vpc_psc_nat_subnet_live.png)

---

### Stage 7 — Validation: Cloud Logging Logs Explorer Live Execution (`20/20 PASS`), Terraform HCL Resource DAGs (`2.6`, `3.6`, `4.6`) & Container `/api/health`

```bash
grep -rn "^resource " \
  workstream-2-pattern-a-pooled/2.6-terraform-starter/ \
  workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/ \
  workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/ && \
python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8080/api/health').read().decode())"
```

![Stage 7 — Cloud Logging: Logs Explorer Live Execution (20/20 PASS)](../screenshots/cloud-console/gcp_console_07_logs_explorer_20_20_pass.png)

---

### Stage 8 — Deployment: Gemini Enterprise & Vertex AI Agent Builder Live Console, Cloud Storage Sync & Cloud Run Gen2 Rollout (`00003-wfh`)

```bash
gcloud storage cp -r \
  core-cymbal-agent \
  workstream-2-pattern-a-pooled \
  workstream-3-pattern-b-siloed \
  workstream-4-pattern-c-hybrid \
  gs://nitina-ggarwal-sandbox-647724-cymbal-multi-tenant-artifacts/codebase/ \
  --project=nitina-ggarwal-sandbox-647724

gcloud run deploy cymbal-multi-tenant-patterns \
  --source=. \
  --project=nitina-ggarwal-sandbox-647724 \
  --region=us-west1 \
  --execution-environment=gen2 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=nitina-ggarwal-sandbox-647724,CYMBAL_LIVE_GCP=1"
```

![Stage 8 — Gemini Enterprise & Vertex AI Agent Builder Live Console](../screenshots/cloud-console/gcp_console_09_vertex_ai_agent_builder_engines.png)
