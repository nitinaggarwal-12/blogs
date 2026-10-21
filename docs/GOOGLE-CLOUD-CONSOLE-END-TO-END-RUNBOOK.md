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

1. Click the **`Revisions`** tab in Google Cloud Console to verify the active deployed Cloud Run revision and inspect `core-cymbal-agent/runtime_pipeline.py` and all 27 files directly in Google Cloud Console.
2. In the bottom `root@localhost:/app#` terminal, list all 27 Python & Terraform files:

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

---

### Stage 9 — Bidirectional 10 Non-Google Third-Party SaaS Verification (Side A: GCP + AWS AgentCore MCP & Side B: Third-Party SaaS Target Web Console UIs)

```bash
# 1. Verify all 10 AWS Bedrock AgentCore MCP Targets (KD6Z3SV8PX..TXGJHVFBWP) & S3 Audit Ledgers
python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py

# 2. Run the 30-Flow / 60-Assertion 10-SaaS x 3-Pattern Bidirectional Suite
python3 -B scripts/verify_5_third_party_saas_products.py --pattern all --verbose

# 3. Capture all 20 Side-A & Side-B Live Screenshots
python3 -B scripts/capture_10_saas_live_screenshots.py
```

* **Complete Manual Playbook & Login Instructions**: [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
* **Live Upstream Enterprise Software Host on AWS EC2 (`i-04924523ac41ff132`, `t3.2xlarge`, `us-east-1`)**: `http://13.220.94.209:3001` – `http://13.220.94.209:3010` (`sre-lead@finvault.com` / `FinVault#2026!`)
* **Live S3 Audit Ledger Mirror & JSON API**: `https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>`

| # | Third-Party SaaS Product & Upstream Container | AWS AgentCore Target ID | Live Upstream Software UI (`13.220.94.209:3001..3010`) & S3 Mirror | Side-A Proof (`agentcore_mcp.png`) | Side-B Proof (`console.png`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **ThoughtSpot Spotter** (`metabase/metabase:v0.50.26`) | `KD6Z3SV8PX` | [Live Metabase BI (`:3001/question/27`)](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [`/saas-ui/thoughtspot-spotter`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter) | [`saas_01_thoughtspot_spotter_agentcore_mcp.png`](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) | [`saas_ui_01_thoughtspot_spotter_console.png`](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png) |
| **02** | **Sigma Computing** (`grafana/grafana-enterprise:11.2.0`) | `OZ0KTE8Z8M` | [Live Grafana Enterprise (`:3002/d/finvault-sre-wb`)](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [`/saas-ui/sigma-computing`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing) | [`saas_02_sigma_computing_agentcore_mcp.png`](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) | [`saas_ui_02_sigma_computing_console.png`](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png) |
| **03** | **ServiceNow ITSM** (`redmine:5.1-alpine`) | `PLOLWRMI0I` | [Live Redmine ITSM (`:3003/projects/finvault-itsm/issues`)](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [`/saas-ui/servicenow-itsm`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm) | [`saas_03_servicenow_itsm_agentcore_mcp.png`](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) | [`saas_ui_03_servicenow_itsm_console.png`](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png) |
| **04** | **Veeva Vault / MUSE Clinical EDC** (`nocodb/nocodb:0.255.2`) | `1KZWKOFTWQ` | [Live NocoDB Clinical EDC (`:3004/#/signin`)](http://13.220.94.209:3004/#/signin) (`sre-lead@finvault.com` / `FinVault#2026!`) • [`/saas-ui/muse-poc`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc) | [`saas_04_veeva_vault_muse_edc_agentcore_mcp.png`](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) | [`saas_ui_04_veeva_vault_muse_edc_console.png`](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png) |
| **05** | **Salesforce Financial Services + Jira** (`gitea/gitea:1.22.3`) | `W7BF0JRWEA` | [Live Gitea Tracker (`:3005/finvault/sre-escalations/issues/1`)](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [`/saas-ui/salesforce-jira`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira) | [`saas_05_salesforce_jira_agentcore_mcp.png`](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) | [`saas_ui_05_salesforce_jira_console.png`](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png) |
| **06** | **Databricks Unity Catalog + Genie** (`trinodb/trino:440`) | `Z1RHXLBK6F` | [Live Trino Lakehouse UI (`:3006/ui/`)](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [`/saas-ui/databricks-unity`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity) | [`saas_06_databricks_unity_catalog_agentcore_mcp.png`](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) | [`saas_ui_06_databricks_unity_catalog_console.png`](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png) |
| **07** | **Snowflake Cortex Analyst** (`clickhouse/clickhouse-server:24.8`) | `7PB1EK3NJO` | [Live ClickHouse Play UI (`:3007/play`)](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [`/saas-ui/snowflake-cortex`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex) | [`saas_07_snowflake_cortex_agentcore_mcp.png`](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) | [`saas_ui_07_snowflake_cortex_console.png`](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png) |
| **08** | **Workday HCM & Financials RaaS** (`directus/directus:11.1.0`) | `CXH8BK86IF` | [Live Directus HCM Studio (`:3008/admin/content/hcm_compensation`)](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [`/saas-ui/workday-raas`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas) | [`saas_08_workday_hcm_financials_agentcore_mcp.png`](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) | [`saas_ui_08_workday_hcm_financials_console.png`](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png) |
| **09** | **Datadog Bits AI SRE** (`datalust/seq:2024.3`) | `A2X7LPMPA7` | [Live Seq APM & Log Events (`:3009/#/events`)](http://13.220.94.209:3009/#/events) • [`/saas-ui/datadog-sre`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre) | [`saas_09_datadog_bits_ai_sre_agentcore_mcp.png`](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) | [`saas_ui_09_datadog_bits_ai_sre_console.png`](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png) |
| **10** | **CrowdStrike Falcon + Okta Workforce** (`hashicorp/vault:1.13.3`) | `TXGJHVFBWP` | [Live HashiCorp Vault UI (`:3010/ui/vault/secrets/secret/show/tenants/finvault`)](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (`fv-token-finvault-sre-2026`) • [`/saas-ui/crowdstrike-okta`](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta) | [`saas_10_crowdstrike_okta_agentcore_mcp.png`](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) | [`saas_ui_10_crowdstrike_okta_console.png`](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png) |


