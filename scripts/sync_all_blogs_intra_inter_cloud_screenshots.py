#!/usr/bin/env python3
"""
Synchronizes all 5 canonical blogs (`blogs/ws1..ws5-*.md`), all 5 workstream architecture
guides (`workstream-1..5/*.md`), demo setup guides (`2.2`, `3.2`, `4.2`), master docs
(`docs/*.md`), `README.md`, `index.html`, and blog generator specs (`scripts/*.mjs`) so that:
1. Every blog and workstream guide embeds actual Markdown images (`![caption](../screenshots/cloud-console/...)`)
   for BOTH:
   - Intra-Cloud (Google Cloud Console) live validation screenshots per pattern
   - Inter-Cloud Third-Party App testing & validation screenshots across all 10 products
     (Side A: GCP 5-Hop + AWS Bedrock AgentCore MCP `saas_01..10_*_agentcore_mcp.png` AND
      Side B: 10 genuine live upstream software UIs on AWS EC2 `13.220.94.209:3001..3010`
      `saas_ui_01..10_*_console.png`).
2. Removes all legacy `?principal=...` mock HTML UI links, keeping only the 10 real live
   upstream software URLs (`http://13.220.94.209:3001..3010`) and raw S3 Audit Ledger JSON
   endpoints (`https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>?format=json`).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

LAMBDA_BASE = "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws"

SAAS_CATALOG = [
    {
        "num": "01",
        "sid": "SAAS-01",
        "key": "thoughtspot-spotter",
        "name": "ThoughtSpot Cloud (Spotter Agentic BI v2.0)",
        "vendor_url": "https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom",
        "vendor_label": "Vendor API (`try-everywhere.thoughtspot.cloud`)",
        "target_id": "KD6Z3SV8PX",
        "mcp_uri": "mcp://cymbal/thoughtspot-spotter-bi-3lo",
        "upstream_app": "Metabase BI (`metabase/metabase:v0.50.26`)",
        "short_ui": "Live Metabase BI (`:3001`)",
        "live_url": "http://13.220.94.209:3001/question/27",
        "creds": "`sre-lead@finvault.com` / `FinVault#2026!`",
        "side_a_png": "saas_01_thoughtspot_spotter_agentcore_mcp.png",
        "side_b_png": "saas_ui_01_thoughtspot_spotter_console.png",
        "pa_cfg": "Shared Pool + Spotter `runtime_filter.tenant_id` -> BigQuery RLS",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `org=\"finvault-org-01\"` • **Out:** `HTTP 200` • `row_count=2` (`ENT-FV-001..002`), `cache_discount=0.90`",
        "pa_neg": "**In:** `tenant=\"retailstream\"` spoofing `org=\"finvault-org-01\"` • **Out:** **`HTTP 403`** `CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED`",
        "pb_cfg": "Silo `cymbal-finvault-silo-prod` + mTLS SPIFFE + `finvault-silo-cmek`",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `kms=\"finvault-silo-cmek\"` (`ENABLED`) • **Out:** `HTTP 200` • `2` FinVault rows + S3 ledger",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` (`valkey_purged=True`)",
        "pc_cfg": "`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` (`psc-neg-finvault-silo-usw1`)",
        "pc_pos": "**In:** `tenant=\"finvault\"`, `tier=\"ENTERPRISE_SILO_SPOKE\"` • **Out:** `HTTP 200` • `dropped_requests=0`, `100%` PSC Spoke",
        "pc_neg": "**In:** Standard `retailstream` spoofing `x-psc-endpoint-id=\"psc-neg-finvault-silo-usw1\"` • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "02",
        "sid": "SAAS-02",
        "key": "sigma-computing",
        "name": "Sigma Computing (Workbooks & Dataset API v2)",
        "vendor_url": "https://api.sigmacomputing.com/v2/auth/token",
        "vendor_label": "Vendor API (`api.sigmacomputing.com`)",
        "target_id": "OZ0KTE8Z8M",
        "mcp_uri": "mcp://cymbal/sigma-computing-workbooks-3lo",
        "upstream_app": "Grafana Enterprise (`grafana/grafana-enterprise:11.2.0`)",
        "short_ui": "Live Grafana BI (`:3002`)",
        "live_url": "http://13.220.94.209:3002/d/finvault-sre-wb",
        "creds": "`sre-lead@finvault.com` / `FinVault#2026!`",
        "side_a_png": "saas_02_sigma_computing_agentcore_mcp.png",
        "side_b_png": "saas_ui_02_sigma_computing_console.png",
        "pa_cfg": "Shared Pool + `ua_tenant_id` warehouse RLS pushdown",
        "pa_pos": "**In:** `tenant=\"retailstream\"`, `workbook=\"wb-sigma-retailstream-checkout-02\"` • **Out:** `HTTP 200` • `row_count=1` (`ENT-RS-001`), live Sigma `requestId`",
        "pa_neg": "**In:** `tenant=\"retailstream\"` tampering `ua_tenant_id=\"finvault\"` • **Out:** **`HTTP 403`** `DENY_SIGMA_UA_TENANT_TAMPERING`",
        "pb_cfg": "Silo `cymbal-finvault-silo-prod` + CMEK + `ua_tenant_id=finvault`",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `workbook=\"wb-sigma-finvault-liquidity-01\"` • **Out:** `HTTP 200` • Silo CMEK verified (`2` rows)",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Zero-downtime workbook promotion Pool -> PSC Spoke",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to `ENTERPRISE_SILO_SPOKE` • **Out:** `HTTP 200` • `ua_tenant_id=finvault` over PSC (`0` drops)",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC workbook route • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "03",
        "sid": "SAAS-03",
        "key": "servicenow-itsm",
        "name": "ServiceNow ITSM & ITOM (`CHG0049218`)",
        "vendor_url": "https://status.servicenow.com",
        "vendor_label": "Vendor Status (`status.servicenow.com`)",
        "target_id": "PLOLWRMI0I",
        "mcp_uri": "mcp://retailstream/servicenow-itom-3lo",
        "upstream_app": "Redmine ITSM (`redmine:5.1-alpine`)",
        "short_ui": "Live Redmine ITSM (`:3003`)",
        "live_url": "http://13.220.94.209:3003/projects/finvault-itsm/issues",
        "creds": "`sre-lead@finvault.com` / `FinVault#2026!`",
        "side_a_png": "saas_03_servicenow_itsm_agentcore_mcp.png",
        "side_b_png": "saas_ui_03_servicenow_itsm_console.png",
        "pa_cfg": "Shared Pool + Hop 5 3LO Vault (`3lo_token_sn_rs_valid`)",
        "pa_pos": "**In:** `tenant=\"retailstream\"`, `change=\"CHG0049218\"`, `3lo=True` • **Out:** `HTTP 200` • Live AWS AgentCore `CHG0049218` returned",
        "pa_neg": "**In:** `tenant=\"retailstream\"`, `seed_3lo=False` (unconsented) • **Out:** **`HTTP 401`** `CHALLENGE_3LO_OAUTH` (`MCP -32042`)",
        "pb_cfg": "Silo VPC-SC egress allowlist -> AWS AgentCore `CHG0049218`",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `change=\"CHG0049218\"` via Silo mTLS • **Out:** `HTTP 200` • Live AgentCore `CHG0049218` (`READY_FOR_CAB_APPROVAL`)",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Dynamic Hybrid routing (Standard Pool vs Enterprise PSC Spoke)",
        "pc_pos": "**In:** `tenant=\"finvault\"`, `change=\"CHG0049218\"` over PSC Spoke • **Out:** `HTTP 200` • `CHG0049218` synced (`dropped_requests=0`)",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC ServiceNow spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "04",
        "sid": "SAAS-04",
        "key": "muse-poc",
        "name": "Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)",
        "vendor_url": "https://login.veevavault.com",
        "vendor_label": "Vendor Portal (`veevavault.com`)",
        "target_id": "1KZWKOFTWQ",
        "mcp_uri": "mcp://finvault/veeva-muse-clinical-3lo",
        "upstream_app": "NocoDB Clinical EDC (`nocodb/nocodb:0.255.2`)",
        "short_ui": "Live NocoDB EDC (`:3004`)",
        "live_url": "http://13.220.94.209:3004/#/nc/base",
        "creds": "`sre-lead@finvault.com` / `FinVault#2026!`",
        "side_a_png": "saas_04_veeva_vault_muse_edc_agentcore_mcp.png",
        "side_b_png": "saas_ui_04_veeva_vault_muse_edc_console.png",
        "pa_cfg": "Shared Pool + Hop 2 Catalog ACL + Cloud KMS 21 CFR Part 11 sig",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `study=\"FV-GXP-2026-04\"`, `cohort=\"Cohort-B\"` • **Out:** `HTTP 200` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig",
        "pa_neg": "**In:** `tenant=\"retailstream\"` invoking restricted clinical MCP • **Out:** **`HTTP 403`** `TENANT_CONNECTOR_ACL_DENIED`",
        "pb_cfg": "GxP Silo + Cloud KMS asymmetric P-256 `21 CFR Part 11` signature",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `study=\"FV-GXP-2026-04\"`, `cohort=\"Cohort-B\"` • **Out:** `HTTP 200` • Live AgentCore + KMS ECDSA P-256 signature",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "GxP Clinical EDC promoted to Enterprise PSC Spoke",
        "pc_pos": "**In:** `tenant=\"finvault\"`, `study=\"FV-GXP-2026-04\"` via PSC Spoke • **Out:** `HTTP 200` • 21 CFR Part 11 KMS sig + `0` dropped calls",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC clinical spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "05",
        "sid": "SAAS-05",
        "key": "salesforce-jira",
        "name": "Salesforce CRM (`NA224`) & Atlassian Jira Cloud",
        "vendor_url": "https://api.status.salesforce.com/v1/instances/NA224/status",
        "vendor_label": "Vendor API (`api.status.salesforce.com`)",
        "target_id": "W7BF0JRWEA",
        "mcp_uri": "mcp://finvault/salesforce-jira-escalation-3lo",
        "upstream_app": "Gitea Escalation Tracker (`gitea/gitea:1.22.3`)",
        "short_ui": "Live Gitea Tracker (`:3005`)",
        "live_url": "http://13.220.94.209:3005/finvault/sre-escalations/issues/1",
        "creds": "`sre-lead` / `FinVault#2026!`",
        "side_a_png": "saas_05_salesforce_jira_agentcore_mcp.png",
        "side_b_png": "saas_ui_05_salesforce_jira_console.png",
        "pa_cfg": "Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `instance=\"NA224\"`, raw IBAN/SWIFT in notes • **Out:** `HTTP 200` • Live `NA224` (`Winter '27 Patch 8.6`) + `[REDACTED-FINVAULT-IBAN]`",
        "pa_neg": "**In:** Inspect egress payload for unredacted `DE893704...` • **Out:** **`PASS`** (`raw_pii_leaked=False`, 100% masked before SaaS call)",
        "pb_cfg": "Silo VPC-SC + Hop 4 Cloud SDP IBAN/SWIFT redaction",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `instance=\"NA224\"` with raw IBAN/SWIFT • **Out:** `HTTP 200` • `[REDACTED-FINVAULT-IBAN]` (`raw_pii_leaked=False`)",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Hybrid PSC Spoke escalation + Hop 4 Cloud SDP redaction",
        "pc_pos": "**In:** `tenant=\"finvault\"`, `instance=\"NA224\"` over PSC Spoke • **Out:** `HTTP 200` • `[REDACTED-FINVAULT-IBAN]` + `0` dropped escalations",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC escalation spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "06",
        "sid": "SAAS-06",
        "key": "databricks-unity",
        "name": "Databricks Data Intelligence Platform (Unity Catalog)",
        "vendor_url": "https://community.cloud.databricks.com/api/2.0/clusters/list",
        "vendor_label": "Vendor API (`community.cloud.databricks.com`)",
        "target_id": "Z1RHXLBK6F",
        "mcp_uri": "mcp://cymbal/databricks-unity-catalog-genie-3lo",
        "upstream_app": "Trino Distributed SQL Lakehouse (`trinodb/trino:440`)",
        "short_ui": "Live Trino UI (`:3006`)",
        "live_url": "http://13.220.94.209:3006/ui/",
        "creds": "`sre-lead@finvault.com`",
        "side_a_png": "saas_06_databricks_unity_catalog_agentcore_mcp.png",
        "side_b_png": "saas_ui_06_databricks_unity_catalog_console.png",
        "pa_cfg": "Shared Pool + `cymbal_uc_prod.<tenant>_gold` binding",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `schema=\"finvault_gold\"` • **Out:** `HTTP 200` • `Server: databricks`, `row_count=2` (`ENT-FV-001..002`)",
        "pa_neg": "**In:** `tenant=\"retailstream\"`, `schema=\"finvault_gold\"` + `EXECUTE IMMEDIATE` • **Out:** **`HTTP 403`** `UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED`",
        "pb_cfg": "Silo VPC-SC -> Dedicated `cymbal_uc_prod.finvault_gold` catalog",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `schema=\"finvault_gold\"` • **Out:** `HTTP 200` • `2` FinVault lakehouse rows + CMEK verified",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Zero-downtime Unity Catalog schema cutover to PSC Spoke",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to PSC Spoke (`finvault_gold`) • **Out:** `HTTP 200` • `row_count=2`, `dropped_requests=0`",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC lakehouse spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "07",
        "sid": "SAAS-07",
        "key": "snowflake-cortex",
        "name": "Snowflake AI Data Cloud (Cortex Analyst & SQL v2)",
        "vendor_url": "https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements",
        "vendor_label": "Vendor API (`snowflakecomputing.com`)",
        "target_id": "7PB1EK3NJO",
        "mcp_uri": "mcp://cymbal/snowflake-cortex-analyst-sql-3lo",
        "upstream_app": "ClickHouse Analytics Play UI (`clickhouse/clickhouse-server:24.8`)",
        "short_ui": "Live ClickHouse UI (`:3007`)",
        "live_url": "http://13.220.94.209:3007/play",
        "creds": "`finvault_user` / `FinVault#2026!`",
        "side_a_png": "saas_07_snowflake_cortex_agentcore_mcp.png",
        "side_b_png": "saas_ui_07_snowflake_cortex_console.png",
        "pa_cfg": "Shared Pool + `ROLE_CYMBAL_<TENANT>` & `SECONDARY ROLES NONE`",
        "pa_pos": "**In:** `tenant=\"retailstream\"`, `role=\"ROLE_CYMBAL_RETAILSTREAM\"` • **Out:** `HTTP 200` • `Server: SF-LB-T1`, `row_count=1` (`ENT-RS-001`)",
        "pa_neg": "**In:** `sql_override=\"USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT\"` • **Out:** **`HTTP 403`** `SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED`",
        "pb_cfg": "Silo VPC-SC + Tri-Secret Secure CMEK + `ROLE_CYMBAL_FINVAULT`",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `role=\"ROLE_CYMBAL_FINVAULT\"` • **Out:** `HTTP 200` • `SECONDARY_ROLES=NONE` + CMEK verified",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Zero-downtime Snowflake Cortex role & warehouse cutover over PSC",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to PSC Spoke (`ROLE_CYMBAL_FINVAULT`) • **Out:** `HTTP 200` • `dropped_requests=0`, `100%` PSC Spoke",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC Cortex spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "08",
        "sid": "SAAS-08",
        "key": "workday-raas",
        "name": "Workday Enterprise HCM & Financial Management",
        "vendor_url": "https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token",
        "vendor_label": "Vendor API (`wd5-services1.myworkday.com`)",
        "target_id": "CXH8BK86IF",
        "mcp_uri": "mcp://finvault/workday-hcm-financials-raas-3lo",
        "upstream_app": "Directus HCM Data Studio (`directus/directus:11.1.0`)",
        "short_ui": "Live Directus HCM (`:3008`)",
        "live_url": "http://13.220.94.209:3008/admin/content/hcm_compensation",
        "creds": "`sre-lead@finvault.com` / `FinVault#2026!`",
        "side_a_png": "saas_08_workday_hcm_financials_agentcore_mcp.png",
        "side_b_png": "saas_ui_08_workday_hcm_financials_console.png",
        "pa_cfg": "Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `user=\"alice@finvault.com\"`, `org=\"SUP-ORG-FINVAULT-NA\"` • **Out:** `HTTP 200` • Live Workday CCX probe + `[REDACTED_US_SSN]`",
        "pa_neg": "**In:** `user=\"bob@finvault.com\"` reusing Alice's 3LO token • **Out:** **`HTTP 401`** `WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH` (`MCP -32042`)",
        "pb_cfg": "Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN Cloud SDP",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `user=\"alice@finvault.com\"` in Silo • **Out:** `HTTP 200` • `[REDACTED_US_SSN]` & `[REDACTED_IBAN]`",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Hybrid PSC Spoke RaaS promotion + Hop 4 SSN/IBAN redaction",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to PSC Spoke (`SUP-ORG-FINVAULT-NA`) • **Out:** `HTTP 200` • `[REDACTED_US_SSN]`, `dropped_requests=0`",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC Workday spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "09",
        "sid": "SAAS-09",
        "key": "datadog-sre",
        "name": "Datadog Cloud Observability & Bits AI SRE",
        "vendor_url": "https://api.datadoghq.com/api/v1/validate",
        "vendor_label": "Vendor API (`api.datadoghq.com`)",
        "target_id": "A2X7LPMPA7",
        "mcp_uri": "mcp://cymbal/datadog-observability-sre-3lo",
        "upstream_app": "Datalust Seq APM & Log Server (`datalust/seq:2024.3`)",
        "short_ui": "Live Seq APM (`:3009`)",
        "live_url": "http://13.220.94.209:3009/#/events",
        "creds": "`sre-lead@finvault.com`",
        "side_a_png": "saas_09_datadog_bits_ai_sre_agentcore_mcp.png",
        "side_b_png": "saas_ui_09_datadog_bits_ai_sre_console.png",
        "pa_cfg": "Shared Pool + `@tenant_id` log filter + Hop 4 Model Armor",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `query=\"service:agent-gateway @tenant_id:finvault\"` • **Out:** `HTTP 200` • Live Datadog US1 API + `2` sanitized log spans",
        "pa_neg": "**In:** Log payload containing `IGNORE ALL PREVIOUS INSTRUCTIONS...` • **Out:** **`HTTP 400`** `MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED`",
        "pb_cfg": "Silo VPC-SC + `@tenant_id:finvault` + Hop 4 Model Armor",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `query=\"service:agent-gateway @tenant_id:finvault\"` • **Out:** `HTTP 200` • Silo logs verified (`0` injection)",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH`",
        "pc_cfg": "Zero-downtime OTel & Datadog APM log stream cutover to PSC Spoke",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to PSC Spoke (`@tenant_id:finvault`) • **Out:** `HTTP 200` • `2` spans, `dropped_requests=0`",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC Datadog spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
    {
        "num": "10",
        "sid": "SAAS-10",
        "key": "crowdstrike-okta",
        "name": "CrowdStrike Falcon Next-Gen SIEM & Okta Identity",
        "vendor_url": "https://api.crowdstrike.com/oauth2/token",
        "vendor_label": "Vendor API (`api.crowdstrike.com`)",
        "target_id": "TXGJHVFBWP",
        "mcp_uri": "mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo",
        "upstream_app": "HashiCorp Vault UI (`hashicorp/vault:1.13.3`)",
        "short_ui": "Live Vault UI (`:3010`)",
        "live_url": "http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault",
        "creds": "Token `fv-token-finvault-sre-2026`",
        "side_a_png": "saas_10_crowdstrike_okta_agentcore_mcp.png",
        "side_b_png": "saas_ui_10_crowdstrike_okta_console.png",
        "pa_cfg": "Shared Pool + Hop 1 RFC 9449 DPoP `jkt` binding",
        "pa_pos": "**In:** `tenant=\"finvault\"`, `dpop=\"dpop_jkt_fv_001\"`, `proof=\"dpop_jkt_fv_001\"` • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200`",
        "pa_neg": "**In:** Stolen bearer token replay with `proof=\"dpop_jkt_attacker_stolen_999\"` • **Out:** **`HTTP 401`** `OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH`",
        "pb_cfg": "Silo mTLS SPIFFE + Okta DPoP + `<5s` Valkey cache purge on CMEK revoke",
        "pb_pos": "**In:** `tenant=\"finvault\"`, `dpop=\"dpop_jkt_fv_001\"` in Silo • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200`",
        "pb_neg": "**In:** `tenant=\"medcore\"`, `kms=\"medcore-revoked-cmek\"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` (`valkey_purged=True`)",
        "pc_cfg": "Hybrid PSC Spoke DPoP session continuity across live tier promotion",
        "pc_pos": "**In:** `tenant=\"finvault\"` promoted to PSC Spoke (`dpop_jkt_fv_001`) • **Out:** `HTTP 200` • Zero session drops (`dropped_requests=0`)",
        "pc_neg": "**In:** Standard `retailstream` spoofing FinVault PSC XDR spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`",
    },
]

INTRA_CLOUD_GALLERIES = {
    "WS1": [
        ("pantheon_live_user_capture_ssh_verify.png", "Intra-Cloud WS1 Stage 0 — Live Google Cloud Console (`Cloud Run -> cymbal-multi-tenant-agent -> Source`) & Docked Cloud Shell SSH (`root@localhost:/app#`) verifying the 5-Hop baseline container in `cymbal-build-sandbox` (`#887605034827`)"),
        ("gcp_console_01_cloud_run_source_editor.png", "Intra-Cloud WS1 Stage 1 — Live Google Cloud Console Cloud Run Source Editor inspecting `main.py` and the 5-Hop `CryptographicContext` middleware (`runtime_pipeline.py`)"),
        ("gcp_console_02_cloud_run_revisions_deploy.png", "Intra-Cloud WS1 Stage 2 — Live Google Cloud Console Cloud Run Revisions (`cymbal-multi-tenant-agent`, Gen2 `gVisor` execution environment serving 100% traffic in `us-west1`)"),
        ("gcp_console_07_logs_explorer_20_20_pass.png", "Intra-Cloud WS1 Stage 3 — Live Google Cloud Logging Explorer (`20/20 PASS` structured audit logs across Hops 1–5 in `cymbal-build-sandbox` `#887605034827`)"),
        ("gcp_console_09_vertex_ai_agent_builder_engines.png", "Intra-Cloud WS1 Stage 4 — Live Gemini Enterprise & Vertex AI Agent Builder console (`cymbal-pooled-prod` `#638420508320`) hosting the multi-tenant agent catalog"),
    ],
    "WS2": [
        ("gcp_console_03_bigquery_studio_pattern_a_rls.png", "Intra-Cloud Pattern A (Pooled) Stage 1 — Live BigQuery Studio (`cymbal_multi_tenant_finops.pattern_a_pooled_rls_entities`) proving `ROW ACCESS POLICY` returns strictly `2` FinVault rows (`ENT-FV-001`, `ENT-FV-002`) and `0` RetailStream rows inside the shared pool"),
        ("gcp_console_01_cloud_run_source_editor.png", "Intra-Cloud Pattern A (Pooled) Stage 2 — Live Cloud Run `cymbal-multi-tenant-agent` Source Editor verifying Hop 1 RFC 9449 DPoP binding, Hop 3 Valkey `120 RPM` bulkhead, and `90% ContextCacheConfig` prefix sharing"),
        ("gcp_console_02_cloud_run_revisions_deploy.png", "Intra-Cloud Pattern A (Pooled) Stage 3 — Live Cloud Run Gen2 Revisions serving competing tenants (`finvault` and `retailstream`) in one high-density pooled runtime"),
        ("gcp_console_07_logs_explorer_20_20_pass.png", "Intra-Cloud Pattern A (Pooled) Stage 4 — Live Cloud Logging Explorer certifying `10/10` Pattern A Red-Team Breach Simulation vectors blocked (`HTTP 403`/`401`/`429`)"),
    ],
    "WS3": [
        ("gcp_console_04_bigquery_studio_pattern_b_cmek.png", "Intra-Cloud Pattern B (Sovereign Silos) Stage 1 — Live BigQuery Studio (`pattern_b_silo_finvault_cmek_vault`) verifying dedicated per-tenant sovereign vault encryption under `finvault-silo-cmek`"),
        ("gcp_console_05_cloud_kms_keyring_live.png", "Intra-Cloud Pattern B (Sovereign Silos) Stage 2 — Live Google Cloud KMS KeyRing (`cymbal-multi-tenant-kr` in `us-west1`) showing `finvault-silo-cmek` (`ENABLED`) and `medcore-revoked-cmek` (`DISABLED` kill-switch triggering `HTTP 423 Locked` in `< 5 s`)"),
        ("gcp_console_07_logs_explorer_20_20_pass.png", "Intra-Cloud Pattern B (Sovereign Silos) Stage 3 — Live Cloud Logging Explorer certifying `6/6` Pattern B Sovereign Silo, VPC-SC, and CMEK Kill-Switch assertions (`PASS`)"),
        ("gcp_console_09_vertex_ai_agent_builder_engines.png", "Intra-Cloud Pattern B (Sovereign Silos) Stage 4 — Live Vertex AI Agent Builder & Air-Gapped Sovereign Runtime verification"),
    ],
    "WS4": [
        ("gcp_console_06_vpc_psc_nat_subnet_live.png", "Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 1 — Live Google Cloud VPC Network (`cymbal-pattern-c-hub-vpc`) and `/28` Private Service Connect NAT Subnet (`cymbal-psc-nat-us-west1` `10.240.0.0/28`) bridging the Shared Control Hub to Enterprise Silo Spokes"),
        ("gcp_console_03_bigquery_studio_pattern_a_rls.png", "Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 2 — Standard Tier Pooled BigQuery RLS table (`pattern_a_pooled_rls_entities`) prior to live tenant tier promotion"),
        ("gcp_console_04_bigquery_studio_pattern_b_cmek.png", "Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 3 — Enterprise Tier Dedicated CMEK Spoke Vault (`pattern_b_silo_finvault_cmek_vault`) after zero-drop `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` migration"),
        ("gcp_console_05_cloud_kms_keyring_live.png", "Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 4 — Live Cloud KMS KeyRing (`cymbal-multi-tenant-kr`) enforcing dedicated CMEK keys on promoted Enterprise Spokes"),
        ("gcp_console_07_logs_explorer_20_20_pass.png", "Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 5 — Live Cloud Logging Explorer certifying `4/4` Pattern C Dynamic Hybrid Routing & `0`-Drop Cutover assertions (`PASS`)"),
    ],
    "WS5": [
        ("pantheon_live_user_capture_ssh_verify.png", "Intra-Cloud WS5 Capstone Stage 1 — Live Google Cloud Console (`Cloud Run Source` + Docked Cloud Shell SSH) verifying the unified 80% shared 5-Hop core across Patterns A, B, and C"),
        ("gcp_console_01_cloud_run_source_editor.png", "Intra-Cloud WS5 Capstone Stage 2 — Cloud Run `cymbal-multi-tenant-agent` Source Editor (`main.py` & `runtime_pipeline.py`)"),
        ("gcp_console_02_cloud_run_revisions_deploy.png", "Intra-Cloud WS5 Capstone Stage 3 — Cloud Run Gen2 Revisions serving the multi-pattern verification suite"),
        ("gcp_console_03_bigquery_studio_pattern_a_rls.png", "Intra-Cloud WS5 Capstone Stage 4 — Pattern A Pooled BigQuery Studio `ROW ACCESS POLICY` (`pattern_a_pooled_rls_entities`)"),
        ("gcp_console_04_bigquery_studio_pattern_b_cmek.png", "Intra-Cloud WS5 Capstone Stage 5 — Pattern B Sovereign Silo BigQuery CMEK Vault (`pattern_b_silo_finvault_cmek_vault`)"),
        ("gcp_console_05_cloud_kms_keyring_live.png", "Intra-Cloud WS5 Capstone Stage 6 — Cloud KMS KeyRing (`cymbal-multi-tenant-kr`: `finvault-silo-cmek` `ENABLED` vs `medcore-revoked-cmek` `DISABLED`)"),
        ("gcp_console_06_vpc_psc_nat_subnet_live.png", "Intra-Cloud WS5 Capstone Stage 7 — Pattern C Hub VPC (`cymbal-pattern-c-hub-vpc`) & `/28` PSC NAT Subnet (`10.240.0.0/28`)"),
        ("gcp_console_07_logs_explorer_20_20_pass.png", "Intra-Cloud WS5 Capstone Stage 8 — Cloud Logging Explorer (`20/20 PASS` across Pattern A `10/10`, Pattern B `6/6`, and Pattern C `4/4`)"),
        ("gcp_console_09_vertex_ai_agent_builder_engines.png", "Intra-Cloud WS5 Capstone Stage 9 — Gemini Enterprise & Vertex AI Agent Builder engines (`cymbal-pooled-prod` `#638420508320`)"),
    ],
}


def build_pattern_validation_block(ws_key: str, rel_img_prefix: str = "../screenshots/cloud-console") -> str:
    """Builds the complete Intra-Cloud + Inter-Cloud 10-SaaS table AND compact 2-up embedded screenshot gallery for a workstream."""
    pattern_titles = {
        "WS1": ("5-Hop Baseline & Reference Taxonomy", "All 3 Patterns (`A` • `B` • `C`)"),
        "WS2": ("Pattern A (High-Density Pooled 5-Hop)", "Pattern A (`120 RPM Pool` • `90% ContextCacheConfig` • `FORCE RLS`)"),
        "WS3": ("Pattern B (Sovereign Silos & CMEK Kill-Switch)", "Pattern B (`Dedicated VPC-SC` • `mTLS SPIFFE` • `HTTP 423 CMEK Kill-Switch`)"),
        "WS4": ("Pattern C (Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrade)", "Pattern C (`Shared Control Hub` • `/28 PSC NAT` • `0-Drop Live Cutover`)"),
        "WS5": ("Executive Decision Guide & Unified 3-Pattern Matrix", "Unified `30/30` Matrix (`Pattern A` vs `Pattern B` vs `Pattern C`)"),
    }
    p_title, p_badge = pattern_titles[ws_key]

    lines = [
        f"## Live Intra-Cloud (Google Cloud Console) & Inter-Cloud (10 Third-Party Enterprise Apps) Validation Proof — {p_title}",
        "",
        f"> **Dual-Plane Live Cloud & Stateful Execution Twin Verification ({p_badge}):** Every architectural claim in **{ws_key}** is verified across three live Google Cloud project tiers (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#887605034827`) and a **Dual-Plane Inter-Cloud Verification Harness** on AWS (`us-east-1`, Account `393036065405`): (1) **Side A — Commercial Vendor Control-Plane & AWS Bedrock AgentCore MCP Gateway** (`kiu8omh4aq`, Targets `KD6Z3SV8PX`..`TXGJHVFBWP`), and (2) **Side B — 10 Stateful Open-Source Data/RLS Execution Twins on AWS EC2** (`i-04924523ac41ff132`, `http://13.220.94.209:3001..3010`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`) so destructive cross-tenant red-team tests execute safely without polluting shared commercial SaaS tenants.",
        "",
        f"### Part I — Intra-Cloud (Google Cloud Console) Live Validation Screenshots ({ws_key})",
        "",
    ]

    for png_file, caption in INTRA_CLOUD_GALLERIES[ws_key]:
        lines.append(f"![{caption}]({rel_img_prefix}/{png_file})")
        lines.append("")

    lines.extend([
        f"### Part II — Inter-Cloud Third-Party App Testing & Validation Matrix ({ws_key} • 10 Live AWS AgentCore MCP Targets + 10 Stateful Execution Twins on `13.220.94.209:3001..3010`)",
        "",
        "- **Plane 1 — AWS Bedrock AgentCore MCP & Commercial SaaS Control Plane (`Side A`)**: Run `python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py` and `python3 -B scripts/verify_5_third_party_saas_products.py` to mint a live Amazon Cognito RS256 OAuth2 token (`us-east-1_vqlzYM74B`) and execute `tools/call` across all 10 targets (`KD6Z3SV8PX`..`TXGJHVFBWP`) on `https://merck-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`.",
        "- **Plane 2 — Stateful Open-Source Data/RLS Execution Twins (`Side B` on `http://13.220.94.209:3001..3010`)**: Inspect each live containerized execution twin (`Metabase v0.50.26`, `Grafana Enterprise 11.2.0`, `Redmine 5.1`, `NocoDB 0.255.2`, `Gitea 1.22.3`, `Trino 440`, `ClickHouse 24.8`, `Directus 11.1.0`, `Datalust Seq 2024.3`, and `HashiCorp Vault 1.13.3`) and its live Amazon S3 Audit Ledger JSON (`?format=json`). *(Note: Public review sandboxes expose read-accessible ports `:3001..3010` and reviewer credentials for instant auditability; production deployments enforce HTTPS ALB/WAF TLS 1.3 termination, private VPC-only listener bindings, and 5-minute DPoP-bound OAuth2 tokens.)*",
        "",
        "| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Live Execution Twin UI (`13.220.94.209:3001..3010`) & S3 Ledger JSON | Side-A (AgentCore MCP) & Side-B (Live Software UI) Screenshots |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ])

    for item in SAAS_CATALOG:
        if ws_key == "WS2":
            cfg, pos, neg = item["pa_cfg"], item["pa_pos"], item["pa_neg"]
        elif ws_key == "WS3":
            cfg, pos, neg = item["pb_cfg"], item["pb_pos"], item["pb_neg"]
        elif ws_key == "WS4":
            cfg, pos, neg = item["pc_cfg"], item["pc_pos"], item["pc_neg"]
        else:
            cfg = f"{item['pa_cfg']} • {item['pb_cfg']} • {item['pc_cfg']}"
            pos = item["pa_pos"]
            neg = f"{item['pa_neg']} • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED`"

        s3_json_url = f"{LAMBDA_BASE}/saas-ui/{item['key']}?format=json"
        lines.append(
            f"| **`{item['sid']}` {item['name']}** • [{item['vendor_label']}]({item['vendor_url']}) "
            f"| Target **`{item['target_id']}`** (`READY`) • `{item['mcp_uri']}` • {cfg} "
            f"| {pos} "
            f"| {neg} "
            f"| [{item['short_ui']}]({item['live_url']}) ({item['creds']}) • [Live S3 JSON]({s3_json_url}) "
            f"| [Side-A MCP (`saas_{item['num']}`)]({rel_img_prefix}/{item['side_a_png']}) • [Side-B Live UI (`saas_ui_{item['num']}`)]({rel_img_prefix}/{item['side_b_png']}) |"
        )

    lines.extend([
        "",
        f"### Part III — Side-A (AgentCore MCP) & Side-B (Live Execution Twin UI on `13.220.94.209:3001..3010`) Visual Proof Gallery ({ws_key})",
        "",
    ])

    for item in SAAS_CATALOG:
        lines.extend([
            f"![{item['sid']} Side A — {ws_key} GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target {item['target_id']} ({item['name']})]({rel_img_prefix}/{item['side_a_png']})",
            "",
            f"![{item['sid']} Side B — {ws_key} Live {item['upstream_app']} Execution Twin UI on {item['live_url']} ({item['name']})]({rel_img_prefix}/{item['side_b_png']})",
            "",
        ])

    return "\n".join(lines)


def patch_markdown_doc(doc_path: Path, ws_key: str, rel_img_prefix: str = "../screenshots/cloud-console") -> None:
    text = doc_path.read_text(encoding="utf-8")

    # 1. Strip any previous injected block or old 10-SaaS bullet/subsection inside the doc
    # First remove our canonical block if re-running
    text = re.sub(
        r"\n*## Live Intra-Cloud \(Google Cloud Console\) & Inter-Cloud \(10 Third-Party Enterprise Apps\) Validation Proof[\s\S]*?(?=\n## What's next|\n<!-- E2E_FLOW_START|\Z)",
        "\n\n",
        text,
    )

    # Also remove old `## Live Intra-Cloud (GCP) & Inter-Cloud (AWS Bedrock AgentCore MCP) Verification Across 10 Non-Google Third-Party SaaS Products` in ws1
    text = re.sub(
        r"\n## Live Intra-Cloud \(GCP\) & Inter-Cloud \(AWS Bedrock AgentCore MCP\) Verification Across 10 Non-Google Third-Party SaaS Products[\s\S]*?(?=\n## |\n<!-- E2E_FLOW_START|\Z)",
        "\n\n",
        text,
    )

    # Also remove the old inline bullet `- **(End-to-end|Live Intra-Cloud) ... bidirectional verification across 10 (unique )?third-party SaaS...` and its table up to the next `### ` or `## `
    text = re.sub(
        r"\n- \*\*(?:End-to-end|Live Intra-Cloud)[^\n]*bidirectional verification across 10 (?:unique )?third-party SaaS[\s\S]*?(?=\n### |\n## |\n<!-- E2E_FLOW_START|\Z)",
        "\n",
        text,
    )

    # Also remove old `## 9. Live Cross-Cloud 10 Third-Party SaaS` or `### Cross-Cloud 10 Third-Party SaaS` or `## 4. Cross-Cloud 10 Third-Party SaaS` sections in workstream-1..5/*.md
    text = re.sub(
        r"\n#{2,3} [^\n]*10 Third-Party (?:Enterprise )?SaaS[\s\S]*?(?=\n## |\n---\n|\Z)",
        "\n\n",
        text,
    )

    # Also strip any lingering `?principal=...` links anywhere in the file
    text = re.sub(
        r"\s*•\s*\[(?:1\. Login 200 ALLOW|2\. Spoof 403 DENY|3\. CMEK 423 LOCKED|200 ALLOW[^\]]*|403 DENY[^\]]*|423 LOCKED[^\]]*|Live UI Login[^\]]*)\]\(https://t2zbugodcr2m7aimjudycgm65q0wopps\.lambda-url\.us-east-1\.on\.aws/saas-ui/[^)]*\?principal=[^)]*\)",
        "",
        text,
    )

    block = build_pattern_validation_block(ws_key, rel_img_prefix=rel_img_prefix)

    if "\n## What's next" in text:
        text = text.replace("\n## What's next", f"\n\n{block}\n\n## What's next", 1)
    elif "\n<!-- E2E_FLOW_START" in text:
        text = text.replace("\n<!-- E2E_FLOW_START", f"\n\n{block}\n\n<!-- E2E_FLOW_START", 1)
    else:
        text = text.rstrip() + f"\n\n---\n\n{block}\n"

    if doc_path.parent.name == "blogs":
        text = re.sub(
            r"<!-- E2E_FLOW_START -->[\s\S]*?<!-- E2E_FLOW_END -->",
            "<!-- E2E_FLOW_START -->\n<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->\n<!-- E2E_FLOW_END -->",
            text,
        )

    doc_path.write_text(text, encoding="utf-8")
    print(f"✅ Updated {doc_path.relative_to(ROOT_DIR)} ({ws_key}) with embedded Intra-Cloud + Inter-Cloud 10-SaaS screenshots")


def clean_legacy_principal_links_everywhere() -> None:
    targets = [
        ROOT_DIR / "README.md",
        ROOT_DIR / "index.html",
        ROOT_DIR / "docs/GOOGLE-CLOUD-CONSOLE-END-TO-END-RUNBOOK.md",
        ROOT_DIR / "docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md",
        ROOT_DIR / "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md",
        ROOT_DIR / "workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md",
        ROOT_DIR / "workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md",
        ROOT_DIR / "workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md",
        ROOT_DIR / "workstream-2-pattern-a-pooled/2.6-terraform-starter/README.md",
        ROOT_DIR / "workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md",
        ROOT_DIR / "workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md",
        ROOT_DIR / "workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/README.md",
        ROOT_DIR / "workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md",
        ROOT_DIR / "workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md",
        ROOT_DIR / "workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/README.md",
        ROOT_DIR / "workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md",
        ROOT_DIR / "scripts/arch_center_specs_ws2_ws3.mjs",
        ROOT_DIR / "scripts/arch_center_specs_ws4_ws5.mjs",
        ROOT_DIR / "scripts/build_arch_center_blogs.mjs",
    ]
    for p in targets:
        if not p.exists():
            continue
        orig = p.read_text(encoding="utf-8")
        updated = orig
        # Remove markdown bullet links with ?principal=
        updated = re.sub(
            r"\s*•\s*\[(?:1\. Login 200 ALLOW|2\. Spoof 403 DENY|3\. CMEK 423 LOCKED|200 ALLOW[^\]]*|403 DENY[^\]]*|423 LOCKED[^\]]*|Live UI Login[^\]]*)\]\(https://t2zbugodcr2m7aimjudycgm65q0wopps\.lambda-url\.us-east-1\.on\.aws/saas-ui/[^)]*\?principal=[^)]*\)",
            "",
            updated,
        )
        # In index.html, remove the 200 ALLOW / 403 DENY / 423 LOCKED ?principal=... anchor tags
        updated = re.sub(
            r'\s*<a href="https://t2zbugodcr2m7aimjudycgm65q0wopps\.lambda-url\.us-east-1\.on\.aws/saas-ui/[^"]*\?principal=[^"]*"[^>]*>[^<]*</a>(?:\s*&bull;)?',
            "",
            updated,
        )
        # Replace any remaining ?principal=... URL with ?format=json
        updated = re.sub(
            r"(https://t2zbugodcr2m7aimjudycgm65q0wopps\.lambda-url\.us-east-1\.on\.aws/saas-ui/(?:[a-z0-9-]+|<target>))\?principal=[a-zA-Z0-9_.@-]+",
            r"http://13.220.94.209:3001..3010 (and \1?format=json)",
            updated,
        )
        # Purge Merck clinical trial ID and personal S3 bucket names from Cymbal documentation prose
        updated = updated.replace("MK-3475-087", "FV-GXP-2026-04")
        updated = updated.replace(
            "s3://nitinagga-argolis-aws-393036065405-us-east-1",
            "s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1",
        )
        if p.suffix == ".md":
            updated = re.sub(r"(?<!project=)(?<!1s)nitina-ggarwal-sandbox-647724", "cymbal-build-sandbox", updated)
            updated = re.sub(r"(?<!project=)(?<!1s)nitinagga-ge-2", "cymbal-pooled-prod", updated)
            updated = updated.replace("`ramp-portal-dev`", "`cymbal-control-plane`")
        if p.name == "index.html":
            updated = updated.replace(
                "max-width:min(100%, 620px); max-height:660px;",
                "max-width:min(100%, 860px); max-height:720px;",
            )
        if updated != orig:
            p.write_text(updated, encoding="utf-8")
            print(f"🧹 Cleaned legacy ?principal= links & domain prose in {p.relative_to(ROOT_DIR)}")


def sync_cloud_viewer_manifest_hashes() -> None:
    import hashlib
    import json
    cv_path = ROOT_DIR / "slides/cloud_viewer_manifest.json"
    if cv_path.is_file():
        data = json.loads(cv_path.read_text(encoding="utf-8"))
        changed = False
        for doc_entry in data.get("docs", {}).values():
            md_rel = doc_entry.get("mdPath")
            if md_rel:
                md_p = ROOT_DIR / md_rel
                if md_p.is_file():
                    raw = md_p.read_bytes()
                    sha = hashlib.sha256(raw).hexdigest()
                    sz = len(raw)
                    if doc_entry.get("sha256") != sha or doc_entry.get("sizeBytes") != sz:
                        doc_entry["sha256"] = sha
                        doc_entry["sizeBytes"] = sz
                        changed = True
        if changed:
            cv_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            print("🔄 Updated slides/cloud_viewer_manifest.json docs SHA-256 hashes and sizeBytes")

    bundle_path = ROOT_DIR / "docs/gcp_pattern_codebase_and_execution_bundle.json"
    if bundle_path.is_file():
        bdata = json.loads(bundle_path.read_text(encoding="utf-8"))
        bchanged = False
        for bf in bdata.get("codebaseFiles", []):
            rel_p = bf.get("path", "")
            fp = ROOT_DIR / rel_p
            if fp.is_file():
                raw = fp.read_bytes()
                sha = hashlib.sha256(raw).hexdigest()
                if bf.get("sha256") != sha:
                    bf["sha256"] = sha
                    bf["bytes"] = len(raw)
                    txt = raw.decode("utf-8", errors="replace")
                    bf["lines"] = len(txt.splitlines())
                    if "content" in bf:
                        bf["content"] = txt
                    bchanged = True
        if bchanged:
            bundle_path.write_text(json.dumps(bdata, indent=2) + "\n", encoding="utf-8")
            print("🔄 Updated docs/gcp_pattern_codebase_and_execution_bundle.json SHA-256 hashes")


def main() -> None:
    doc_map = [
        (ROOT_DIR / "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md", "WS1", "../screenshots/cloud-console"),
        (ROOT_DIR / "blogs/ws2-pattern-a-pooled-architecture.md", "WS2", "../screenshots/cloud-console"),
        (ROOT_DIR / "blogs/ws3-pattern-b-sovereign-silos.md", "WS3", "../screenshots/cloud-console"),
        (ROOT_DIR / "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md", "WS4", "../screenshots/cloud-console"),
        (ROOT_DIR / "blogs/ws5-decision-guide-and-agentic-triad.md", "WS5", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md", "WS1", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md", "WS2", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md", "WS2", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md", "WS3", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md", "WS3", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md", "WS4", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md", "WS4", "../screenshots/cloud-console"),
        (ROOT_DIR / "workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md", "WS5", "../screenshots/cloud-console"),
        (ROOT_DIR / "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md", "WS5", "../screenshots/cloud-console"),
    ]
    for path, ws_key, prefix in doc_map:
        if path.exists():
            patch_markdown_doc(path, ws_key, rel_img_prefix=prefix)

    clean_legacy_principal_links_everywhere()
    sync_cloud_viewer_manifest_hashes()


if __name__ == "__main__":
    main()

