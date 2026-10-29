# End-to-End Google Cloud Console, Cloud Run `Source` & Docked Cloud Shell SSH Process Runbook

> **100% Cloud-Native Execution & Visual Proof (Zero Local Desktop Dependency & Zero Synthetic Blue Cards)**
> This runbook documents the exact end-to-end Setup, Execution, Validation, and Deployment workflow inside **Google Cloud Console (`console.cloud.google.com`)** for the **Cymbal Multi-Tenant Agentic AI Platform (`cymbal-multi-tenant-patterns`)** in project **`cymbal-build-sandbox`** (`#887605034827`, region `us-west1`) and Control Plane project **`cymbal-control-plane`** (`#248990048888`). Every stage below is paired with a full-resolution **Google Cloud Console Cloud Run (`Source` / `Revision History` / `Networking`) + Docked `CLOUD SHELL Terminal` (`root@localhost:/app#`)** screenshot.

---

## 2. Cloud Console Environment & Service Inventory

| Dimension | Provisioned Google Cloud Value | Direct Google Cloud Console URL |
| :--- | :--- | :--- |
| **Data & Runtime Project** | `cymbal-build-sandbox` (`#887605034827`) | [Open Project Dashboard ↗](https://console.cloud.google.com/home/dashboard?project=cymbal-build-sandbox) |
| **Control Plane Project** | `cymbal-control-plane` (`#248990048888`) | [Open Control Plane Dashboard ↗](https://console.cloud.google.com/home/dashboard?project=ramp-portal-dev) |
| **Cloud Run Service** | `cymbal-multi-tenant-patterns` (`us-west1`, Gen2) | [Open Cloud Run Service ↗](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/revisions?project=cymbal-build-sandbox) |
| **Active Revision** | `cymbal-multi-tenant-patterns-00003-wfh` (`100%` Traffic) | [Open Source Tab in Console ↗](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/source?project=cymbal-build-sandbox) |
| **Cloud Storage Codebase** | `gs://cymbal-build-sandbox-cymbal-multi-tenant-artifacts/codebase/` | [Open GCS Bucket Browser ↗](https://console.cloud.google.com/storage/browser/cymbal-build-sandbox-cymbal-multi-tenant-artifacts/codebase?project=cymbal-build-sandbox) |
| **BigQuery Datasets** | `cymbal_agentic_finops_otel` (`US`) & `cymbal_silo_finvault_usw1` (`us-west1`) | [Open BigQuery Studio ↗](https://console.cloud.google.com/bigquery?project=cymbal-build-sandbox) |
| **Cloud KMS KeyRing** | `cymbal-multi-tenant-kr` (`4` CryptoKeys in `us-west1`) | [Open Cloud KMS Keys ↗](https://console.cloud.google.com/security/kms/keyrings/manage/us-west1/cymbal-multi-tenant-kr?project=cymbal-build-sandbox) |
| **Hybrid PSC VPCs** | `cymbal-pattern-c-hub-vpc` + `cymbal-psc-nat-us-west1` (`/28`) + `cymbal-pattern-c-finvault-spoke-vpc` | [Open VPC Networks ↗](https://console.cloud.google.com/networking/networks/list?project=cymbal-build-sandbox) |

---

## 3. Stage-by-Stage End-to-End Execution Process (`Stages 1–8`)

### Stage 1 — Setup & SSH Connect: Cloud Run `Revision History`, `>_ SSH Preview` & Tunnel into `root@localhost:/app#`

1. Open [Cloud Run Service `cymbal-multi-tenant-patterns` (`Revision History`)](https://console.cloud.google.com/run/detail/us-west1/cymbal-multi-tenant-patterns/revisions?project=cymbal-build-sandbox&cloudshell=true).
2. Click **`>_ SSH`** on the active revision `cymbal-multi-tenant-patterns-00003-wfh` (or run the command below in the docked **Cloud Shell Terminal**):

```bash
gcloud beta run services ssh cymbal-multi-tenant-patterns \
  --project=cymbal-build-sandbox \
  --region=us-west1
```

3. Once inside `root@localhost:/app#`, verify the container workspace:

```bash
pwd && ls -la
```


---

### Stage 2 — Cloud Run Revisions & Deployment: Active Revision & 100% Traffic Verification

1. Click the **`Revisions`** tab in Google Cloud Console to verify the active deployed Cloud Run revision and inspect `core-cymbal-agent/runtime_pipeline.py` and all 27 files directly in Google Cloud Console.
2. In the bottom `root@localhost:/app#` terminal, list all 27 Python & Terraform files:

```bash
find core-cymbal-agent workstream-2-pattern-a-pooled workstream-3-pattern-b-siloed workstream-4-pattern-c-hybrid \
  -maxdepth 3 -type f \( -name "*.py" -o -name "*.tf" \) | sort
```


---

### Stage 3 — Execution: Pattern A (Pooled 5-Hop Runtime & BigQuery RLS) — 10-Vector Breach Simulation Suite (`10/10 PASS`)

```bash
PYTHONPATH=. python3 workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py
```


---

### Stage 4 — Execution: Pattern B (Sovereign Silos, VPC-SC & Cloud KMS CMEK Kill-Switch) — 6-Point Suite (`6/6 PASS`)

```bash
PYTHONPATH=. python3 workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py
```


---

### Stage 5 — Execution: Pattern C (Hybrid Control Plane + Private Service Connect Spoke & Cloud KMS Keyring) — 4-Point Suite (`4/4 PASS`)

```bash
PYTHONPATH=. python3 workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py
```


---

### Stage 6 — Validation: Core 5-Hop Pipeline (`9/9 PASS`) + VPC PSC NAT Subnet (`10.240.0.0/28`), Cloud KMS ECDSA P-256 & BigQuery Audit Stream (`200 OK`)

```bash
PYTHONPATH=. python3 -B -m unittest core-cymbal-agent/tests/test_five_hop_pipeline.py -v && \
CYMBAL_LIVE_GCP=1 PYTHONPATH=. python3 -B -c "
import importlib
bridge = importlib.import_module('core-cymbal-agent.gcp_live_bridge')
sig = bridge.kms_asymmetric_sign_digest('cymbal-hop1-dpop-proof-finvault')
enc = bridge.kms_encrypt_decrypt_roundtrip('finvault', 'L4-episodic-memory-vector-payload')
bq  = bridge.bigquery_stream_audit_row('finvault', 'PATTERN_B_SILOED', 'ALLOW', 200, 'Live Cloud Run SSH Verification')
print('1. KMS ECDSA P-256 Sign :', sig)
print('2. KMS CMEK Roundtrip   :', enc)
print('3. BigQuery Audit Row   :', bq)
"
```


---

### Stage 7 — Validation: Cloud Logging Logs Explorer Live Execution (`20/20 PASS`), Terraform HCL Resource DAGs (`2.6`, `3.6`, `4.6`) & Container `/api/health`

```bash
grep -rn "^resource " \
  workstream-2-pattern-a-pooled/2.6-terraform-starter/ \
  workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/ \
  workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/ && \
python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8080/api/health').read().decode())"
```


---

### Stage 8 — Deployment: Gemini Enterprise & Vertex AI Agent Builder Live Console, Cloud Storage Sync & Cloud Run Gen2 Rollout (`00003-wfh`)

```bash
gcloud storage cp -r \
  core-cymbal-agent \
  workstream-2-pattern-a-pooled \
  workstream-3-pattern-b-siloed \
  workstream-4-pattern-c-hybrid \
  gs://cymbal-build-sandbox-cymbal-multi-tenant-artifacts/codebase/ \
  --project=cymbal-build-sandbox

gcloud run deploy cymbal-multi-tenant-patterns \
  --source=. \
  --project=cymbal-build-sandbox \
  --region=us-west1 \
  --execution-environment=gen2 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=cymbal-build-sandbox,CYMBAL_LIVE_GCP=1"
```


---

### Stage 9 — Bidirectional 10 Non-Google Third-Party SaaS Verification (Google Cloud 5-Hop Agent Orchestrator + AWS Bedrock AgentCore MCP Gateway + Amazon S3 Audit Ledger)

```bash
# 1. Verify all 10 AWS Bedrock AgentCore MCP Targets (HXGGFMZBKE..C7EYM614F2) & S3 Audit Ledgers
python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py

# 2. Run the 30-Flow / 60-Assertion 10-SaaS x 3-Pattern Verification Suite
python3 -B scripts/verify_5_third_party_saas_products.py --pattern all --verbose
```

* **Complete Manual Playbook & CLI Instructions**: [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
* **Live S3 Audit Ledger JSON API**: `https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>?format=json`

| # | Third-Party SaaS Product | AWS AgentCore Target ID | Persisted Amazon S3 Audit Ledger JSON (`?format=json`) | CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **ThoughtSpot Spotter** | `HXGGFMZBKE` | [`/saas-ui/thoughtspot-spotter?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --verbose` |
| **02** | **Sigma Computing** | `IZVODT083Q` | [`/saas-ui/sigma-computing?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --verbose` |
| **03** | **ServiceNow ITSM** | `ZS9VGYHBQL` | [`/saas-ui/servicenow-itsm?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --verbose` |
| **04** | **Veeva Vault / MUSE Clinical EDC** | `TWQU0KSRVF` | [`/saas-ui/muse-poc?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --verbose` |
| **05** | **Salesforce Financial Services + Jira** | `K5JAEFCQ6E` | [`/saas-ui/salesforce-jira?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --verbose` |
| **06** | **Databricks Unity Catalog + Genie** | `TERCK8SLBP` | [`/saas-ui/databricks-unity?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --verbose` |
| **07** | **Snowflake Cortex Analyst** | `CCMDEVZV2S` | [`/saas-ui/snowflake-cortex?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --verbose` |
| **08** | **Workday HCM & Financials RaaS** | `RAOTMUMJTZ` | [`/saas-ui/workday-raas?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --verbose` |
| **09** | **Datadog Bits AI SRE** | `G767QR3TQZ` | [`/saas-ui/datadog-sre?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --verbose` |
| **10** | **CrowdStrike Falcon + Okta Workforce** | `C7EYM614F2` | [`/saas-ui/crowdstrike-okta?format=json`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --verbose` |

---

### Stage 10 — Multi-Cloud 10 Upstream 3P Enterprise Software Stacks on Google Cloud Run Gen2 (`bbar-138hf0`) & AWS EC2 (`393036065405`) + 23 Genuine Retina UI Captures

```bash
# 1. Provision & seed all 10 upstream 3P software containers on AWS EC2 (393036065405 / us-east-1 / i-04924523ac41ff132)
python3 -B scripts/provision_aws_ec2_third_party_apps.py

# 2. Mirror OCI images, deploy on Google Cloud Run Gen2 (bbar-138hf0 / us-west1), mint OIDC tokens & seed all 10 3P services
python3 -B scripts/provision_gcp_cloudrun_third_party_apps.py --reseed-only

# 3. Capture all 23 genuine live 2880x1800 Retina UI screenshots (10 GCP Cloud Run + 10 AWS EC2 + 3 AWS Management Console)
node scripts/capture_genuine_multicloud_3p_uis.mjs

# 4. Verify SHA-256 provenance & sync Cross-Run Continuity Ledgers
python3 -B scripts/run_all_repeatable_e2e_verifications.py --sync-ledger-only
```

* **GCP Cloud Run Gen2 Live Receipt (`10/10` Services)**: [`docs/gcp_cloudrun_3p_apps_live_receipt.json`](gcp_cloudrun_3p_apps_live_receipt.json) (`cymbal-gcp-metabase-bi`, `cymbal-gcp-grafana-ent`, `cymbal-gcp-redmine-itsm`, `cymbal-gcp-nocodb-edc`, `cymbal-gcp-gitea-sre`, `cymbal-gcp-trino-sql`, `cymbal-gcp-clickhouse-dw`, `cymbal-gcp-directus-hcm`, `cymbal-gcp-seq-apm`, `cymbal-gcp-vault-cmek`)
* **AWS EC2 Live Receipt (`10/10` Containers on `i-04924523ac41ff132`)**: [`docs/aws_ec2_3p_apps_live_receipt.json`](aws_ec2_3p_apps_live_receipt.json)
* **23 Genuine Retina UI Screenshot Provenance Receipt**: [`docs/genuine_ui_screenshot_provenance_receipt.json`](genuine_ui_screenshot_provenance_receipt.json)
* **Cross-Run Continuity Ledger (`6` Repeatable Steps)**: [`data/run_continuity_ledger.json`](../data/run_continuity_ledger.json)

