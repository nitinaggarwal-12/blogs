#!/usr/bin/env python3
"""Per-Blog Diagrams & Screenshots Asset Manager + Full CRUD (Save, Clone, Delete, Restore).

Provides:
1. Dynamic extraction of every diagram & Retina screenshot embedded in each blog
   (WS1, WS2, WS3, WS4, WS5, ATLAS, plus aggregated ALL view).
2. Direct linkages to Approved 12-Slide Google Slides Deck, 38-Slide Architecture Compendium,
   Interactive 2-Way Draw.io Sync Studio (`/drawio/<id>`), raw `.drawio`/`.svg` URLs,
   and self-contained `https://app.diagrams.net/#R...` URLs.
3. Persistent runtime CRUD for diagrams:
   - Save edited `.drawio` XML + sanitized `.svg` + title/caption (+ optional 2-way Slides sync).
   - Clone any diagram into the same or another blog (stored in runtime state dir so repo
     hygiene gate F-11 stays 100% clean).
   - Delete with automatic timestamped trash backup and 1-click Restore.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import os
import re
import shutil
import struct
import sys
import tempfile
import threading
import time
import urllib.parse
import xml.etree.ElementTree as ET
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.dont_write_bytecode = True

SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPTS_DIR.parent
DIAGRAMS_DIR = ROOT_DIR / "diagrams"
COMP_DRAWIO_DIR = DIAGRAMS_DIR / "compendium" / "drawio"
ATLAS_PATH = ROOT_DIR / "data" / "slide_diagrams_atlas.json"

BARE_MIN_12_PRES_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"
COMPENDIUM_54_PRES_ID = "1-WwbZsdEFPylp9MtfF-nuifeVps0uuu3bSCfzCCYjjI"

BARE_MIN_12_SLIDE_MAP: Dict[str, int] = {
    "ws1-5hop-governance-baseline": 1,
    "ws1-c4-l3-process-sequence-swimlane": 2,
    "ws2-pattern-a-pooled": 3,
    "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane": 4,
    "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane": 5,
    "ws3-pattern-b-silo": 6,
    "ws3-c4-l3-cmek-killswitch-swimlane": 7,
    "ws4-pattern-c-hybrid": 8,
    "ws4-c4-l3-live-tier-promotion-swimlane": 9,
    "ws5-decision-tree-and-triad": 10,
    "saas10-multicloud-a2a-mcp-bridge": 11,
    "ws5-c4-l3-dynamic-skill-delegation-swimlane": 12,
}

BLOG_CATALOG: List[Dict[str, Any]] = [
    {
        "slug": "ws1",
        "wsKey": "WS1",
        "shortLabel": "WS1 · Baseline",
        "badge": "PART 1 · SLIDES 01–02",
        "title": "WS1: Reference Architecture, Taxonomy & 5-Hop Baseline",
        "subtitle": "Shared 80/20 control plane, 5-Hop cryptographic pipeline (<42ms p95), and verified live Retina captures.",
        "docPath": "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS1&doc=blogs%2Fws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "slideRange": "Slides 01–02",
    },
    {
        "slug": "ws2",
        "wsKey": "WS2",
        "shortLabel": "WS2 · Pattern A Pool",
        "badge": "PART 2 · SLIDES 03–05",
        "title": "WS2: Pattern A — High-Density Pooled Architecture",
        "subtitle": "Mode A CoW Pre-Fork Heap Wipe, Mode B WarmPool 403 Sticky Latch, AlloyDB FORCE RLS, and verified live Retina captures.",
        "docPath": "blogs/ws2-pattern-a-pooled-architecture.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS2&doc=blogs%2Fws2-pattern-a-pooled-architecture.md",
        "slideRange": "Slides 03–05",
    },
    {
        "slug": "ws3",
        "wsKey": "WS3",
        "shortLabel": "WS3 · Pattern B Silo",
        "badge": "PART 3 · SLIDES 06–07",
        "title": "WS3: Pattern B — Sovereign Silos & CMEK Kill-Switch",
        "subtitle": "Dedicated per-tenant projects, VPC-SC perimeters, <60s Cloud KMS CMEK kill-switch, and verified live Retina captures.",
        "docPath": "blogs/ws3-pattern-b-sovereign-silos.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS3&doc=blogs%2Fws3-pattern-b-sovereign-silos.md",
        "slideRange": "Slides 06–07",
    },
    {
        "slug": "ws4",
        "wsKey": "WS4",
        "shortLabel": "WS4 · Pattern C Hybrid",
        "badge": "PART 4 · SLIDES 08–09",
        "title": "WS4: Pattern C — Governed Hybrid PSC & Live Tier Promotion",
        "subtitle": "Hub-and-spoke /28 PSC routing, 3-phase zero-downtime live tenant migration, and verified live Retina captures.",
        "docPath": "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS4&doc=blogs%2Fws4-pattern-c-hybrid-dynamic-tiering.md",
        "slideRange": "Slides 08–09",
    },
    {
        "slug": "ws5",
        "wsKey": "WS5",
        "shortLabel": "WS5 · Decision & Triad",
        "badge": "PART 5 · SLIDES 10–12",
        "title": "WS5: Decision Guide, Agentic Triad & Multi-Cloud SaaS Bridge",
        "subtitle": "3-outcome architecture selector, dynamic GCS skills delegation, and verified live Retina captures.",
        "docPath": "blogs/ws5-decision-guide-and-agentic-triad.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS5&doc=blogs%2Fws5-decision-guide-and-agentic-triad.md",
        "slideRange": "Slides 10–12",
    },
    {
        "slug": "atlas",
        "wsKey": "ATLAS",
        "shortLabel": "ATLAS · Cloud & SaaS Proofs",
        "badge": "EXECUTION ATLAS · SLIDE 11 + VERIFIED LIVE PROOFS",
        "title": "Verified Live Cloud Console & Commercial SaaS Proof Atlas",
        "subtitle": "Cryptographically attested 16:9 Retina captures verified by verify_slide_screenshots.mjs --audience external.",
        "docPath": "blogs/saas-10-visual-verification-and-redteam-atlas.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS5&doc=blogs%2Fsaas-10-visual-verification-and-redteam-atlas.md",
        "slideRange": "Slide 11",
    },
    {
        "slug": "all",
        "wsKey": "ALL",
        "shortLabel": "ALL · Complete Series",
        "badge": "ALL 6 BLOGS · 12 SLIDES + VERIFIED LIVE PROOFS",
        "title": "Complete Series Master Asset Inventory (All 6 Blogs)",
        "subtitle": "Unified view across all 12 Approved 16:9 architecture diagrams and all cryptographically verified Retina live captures.",
        "docPath": "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "blogPortalUrl": "/?tab=patterns&ws=WS1",
        "slideRange": "Slides 01–12",
    },
]

BLOG_BY_SLUG: Dict[str, Dict[str, Any]] = {b["slug"]: b for b in BLOG_CATALOG}

VERIFIED_CONSOLE_META: Dict[str, Dict[str, str]] = {
    "gcp_ws1_01_gemini_enterprise_agent_hub.png": {
        "proofId": "GCP-WS1-01",
        "provider": "Gemini Enterprise",
        "providerTag": "ge",
        "product": "Gemini Enterprise — Cymbal Multi-Tenant Enterprise Agent Hub",
        "resourceLabel": "cymbal-multi-tenant-agent-hub",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "Hop 2 Control Plane · Agent Hub & Engines",
        "pattern": "WS1 · 80/20 Shared Control Plane",
        "liveConsoleUrl": "https://console.cloud.google.com/gen-app-builder/engines?project=ramp-portal-dev",
    },
    "gcp_ws1_02_cloud_armor_waf_hop1.png": {
        "proofId": "GCP-WS1-02",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Cloud Armor — Edge WAF Security Policy (Hop 1 PEP)",
        "resourceLabel": "cymbal-pooled-edge-waf",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Hop 1 Edge Identity & WAF Guard",
        "pattern": "WS1 · 5-Hop Baseline",
        "liveConsoleUrl": "https://console.cloud.google.com/net-security/securitypolicies/details/cymbal-pooled-edge-waf?project=bbar-138hf0",
    },
    "gcp_ws1_03_model_armor_firewall_hop4.png": {
        "proofId": "GCP-WS1-03",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Vertex AI Model Armor — Zero-Trust AI Firewall Templates (Hop 4)",
        "resourceLabel": "ge-zero-trust-ai-firewall",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "Hop 4 Prompt-Injection & Safety Firewall",
        "pattern": "WS1 · 5-Hop Baseline",
        "liveConsoleUrl": "https://console.cloud.google.com/security/model-armor/templates?project=ramp-portal-dev",
    },
    "gcp_ws2_01_bigquery_pooled_rls_finops.png": {
        "proofId": "GCP-WS2-01",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "BigQuery — Pattern A Pooled RLS & FinOps Telemetry Dataset",
        "resourceLabel": "cymbal_agentic_finops_otel",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Hop 5 Pooled RLS & Telemetry Ledger",
        "pattern": "WS2 · Pattern A Pooled",
        "liveConsoleUrl": "https://console.cloud.google.com/bigquery?project=bbar-138hf0&ws=!1m4!1m3!3m2!1sbbar-138hf0!2scymbal_agentic_finops_otel",
    },
    "gcp_ws2_02_cloud_run_pooled_services.png": {
        "proofId": "GCP-WS2-02",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Cloud Run — Pooled Multi-Tenant Patterns & MCP OAuth 2.1 OBO Gateway",
        "resourceLabel": "cymbal-multi-tenant-patterns / mcp-oauth21-obo-gateway",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Hop 3 Pooled Compute & MCP Gateway",
        "pattern": "WS2 · Pattern A Pooled",
        "liveConsoleUrl": "https://console.cloud.google.com/run?project=bbar-138hf0",
    },
    "gcp_ws2_03_secret_manager_hop2.png": {
        "proofId": "GCP-WS2-03",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Secret Manager — OAuth 2.1 Signing Keys & Cross-Cloud AgentCore Secrets",
        "resourceLabel": "mcp-oauth21-rsa-private-pem / aws-cognito-agentcore-config",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Hop 2 Zero-Hardcoded-Secret Vault",
        "pattern": "WS2 · Pattern A Pooled",
        "liveConsoleUrl": "https://console.cloud.google.com/security/secret-manager?project=bbar-138hf0",
    },
    "gcp_ws3_01_cloud_kms_cmek_killswitch.png": {
        "proofId": "GCP-WS3-01",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Cloud KMS — Pattern B Sovereign CMEK Keyring & Live Disabled Kill-Switch",
        "resourceLabel": "cymbal-multi-tenant-kr (medcore-revoked-cmek DISABLED)",
        "projectOrAccount": "bbar-138hf0 (#48439189383 · us-west1)",
        "category": "Cryptographic Kill-Switch (HTTP 423)",
        "pattern": "WS3 · Pattern B Sovereign Silo",
        "liveConsoleUrl": "https://console.cloud.google.com/security/kms/keyring/manage/us-west1/cymbal-multi-tenant-kr/key?project=bbar-138hf0",
    },
    "gcp_ws3_02_bigquery_sovereign_silo_vaults.png": {
        "proofId": "GCP-WS3-02",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "BigQuery — Pattern B Sovereign Silo CMEK Data Vaults",
        "resourceLabel": "cymbal_silo_finvault_usw1",
        "projectOrAccount": "bbar-138hf0 (#48439189383 · us-west1)",
        "category": "Dedicated Tenant CMEK Data Vault",
        "pattern": "WS3 · Pattern B Sovereign Silo",
        "liveConsoleUrl": "https://console.cloud.google.com/bigquery?project=bbar-138hf0&ws=!1m4!1m3!3m2!1sbbar-138hf0!2scymbal_silo_finvault_usw1",
    },
    "gcp_ws3_03_model_armor_silo_obo.png": {
        "proofId": "GCP-WS3-03",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Vertex AI Model Armor — Sovereign Silo OBO Template (Data Residency)",
        "resourceLabel": "mcp-oauth21-obo-armor",
        "projectOrAccount": "bbar-138hf0 (#48439189383 · us-central1)",
        "category": "Hop 4 Sovereign Prompt & Egress Guard",
        "pattern": "WS3 · Pattern B Sovereign Silo",
        "liveConsoleUrl": "https://console.cloud.google.com/security/model-armor/templates?project=bbar-138hf0",
    },
    "gcp_ws4_01_vpc_hub_psc_nat.png": {
        "proofId": "GCP-WS4-01",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "VPC Network — Pattern C Hub VPC & Private Service Connect NAT Subnet",
        "resourceLabel": "cymbal-pattern-c-hub-vpc / cymbal-psc-nat-us-west1",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "Pattern C Hub PSC Routing Plane",
        "pattern": "WS4 · Pattern C Hybrid PSC",
        "liveConsoleUrl": "https://console.cloud.google.com/networking/networks/details/cymbal-pattern-c-hub-vpc?project=ramp-portal-dev",
    },
    "gcp_ws4_02_vpc_finvault_spoke.png": {
        "proofId": "GCP-WS4-02",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "VPC Network — Pattern C Sovereign Tenant Spoke Network",
        "resourceLabel": "cymbal-pattern-c-finvault-spoke-vpc",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Pattern C Isolated Spoke Perimeter",
        "pattern": "WS4 · Pattern C Hybrid PSC",
        "liveConsoleUrl": "https://console.cloud.google.com/networking/networks/details/cymbal-pattern-c-finvault-spoke-vpc?project=bbar-138hf0",
    },
    "gcp_ws4_03_cloud_logging_audit_trail.png": {
        "proofId": "GCP-WS4-03",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Cloud Logging — Live Multi-Tenant Cloud Run Revision Audit Trail",
        "resourceLabel": "Logs Explorer (cloud_run_revision)",
        "projectOrAccount": "bbar-138hf0 (#48439189383)",
        "category": "Immutable Migration & Governance Audit",
        "pattern": "WS4 · Pattern C Hybrid PSC",
        "liveConsoleUrl": "https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22;duration=P7D?project=bbar-138hf0",
    },
    "gcp_atlas_01_cloud_run_a2a_gateway_hub.png": {
        "proofId": "GCP-WS5-01",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Cloud Run — A2A Enterprise Gateway & Orchestrator Hub",
        "resourceLabel": "a2a-gateway / a2a-ge-orchestrator",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "Cross-Cloud A2A & MCP Federation Hub",
        "pattern": "WS5 · Agentic Triad & Multi-Cloud",
        "liveConsoleUrl": "https://console.cloud.google.com/run?project=ramp-portal-dev",
    },
    "gcp_atlas_02_cloud_marketplace_thoughtspot.png": {
        "proofId": "GCP-WS5-02",
        "provider": "Google Cloud Marketplace",
        "providerTag": "gcp",
        "product": "Google Cloud Marketplace — ThoughtSpot Enterprise SaaS Listing",
        "resourceLabel": "thoughtspot-enterprise-saas-gcp",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "3P SaaS Marketplace Provisioning",
        "pattern": "WS5 · Multi-Cloud SaaS Bridge",
        "liveConsoleUrl": "https://console.cloud.google.com/marketplace/product/thoughtspot-public/thoughtspot-enterprise-saas-gcp?project=ramp-portal-dev",
    },
    "gcp_atlas_03_integration_connectors_catalog.png": {
        "proofId": "GCP-WS5-03",
        "provider": "Google Cloud Console",
        "providerTag": "gcp",
        "product": "Google Cloud Integration Connectors — Enterprise SaaS Catalog",
        "resourceLabel": "Integration Connectors (Workday, Veeva, ServiceNow, Salesforce, Snowflake)",
        "projectOrAccount": "ramp-portal-dev (#248990048888)",
        "category": "Managed 1P Enterprise Connectors",
        "pattern": "WS5 · Multi-Cloud SaaS Bridge",
        "liveConsoleUrl": "https://console.cloud.google.com/integration-connectors/connections?project=ramp-portal-dev",
    },
    "saas_01_thoughtspot_liveboard.png": {
        "proofId": "SAAS-TS-01",
        "provider": "ThoughtSpot Cloud SaaS",
        "providerTag": "thoughtspot",
        "product": "ThoughtSpot Cloud — Live Executive Analytics Liveboard",
        "resourceLabel": "Retail Sales Liveboard (team2.thoughtspot.cloud)",
        "projectOrAccount": "team2.thoughtspot.cloud (Live Commercial SaaS)",
        "category": "Genuine 3P Commercial SaaS BI UI",
        "pattern": "WS5 · Live SaaS BI Integration",
        "liveConsoleUrl": "https://team2.thoughtspot.cloud/",
    },
    "saas_02_thoughtspot_saved_answer.png": {
        "proofId": "SAAS-TS-02",
        "provider": "ThoughtSpot Cloud SaaS",
        "providerTag": "thoughtspot",
        "product": "ThoughtSpot Cloud — Live Governed Saved Answer Query",
        "resourceLabel": "Supply & Stock-Out Analytics Answer (team2.thoughtspot.cloud)",
        "projectOrAccount": "team2.thoughtspot.cloud (Live Commercial SaaS)",
        "category": "Genuine 3P Commercial SaaS Query UI",
        "pattern": "WS5 · Live SaaS BI Integration",
        "liveConsoleUrl": "https://team2.thoughtspot.cloud/",
    },
    "saas_03_sigma_workbook.png": {
        "proofId": "SAAS-SIGMA-01",
        "provider": "Sigma Computing SaaS",
        "providerTag": "saas",
        "product": "Sigma Computing — Live Governed Cloud BI Workbook",
        "resourceLabel": "Sigma Workbook (app.sigmacomputing.com)",
        "projectOrAccount": "app.sigmacomputing.com (Live Commercial SaaS)",
        "category": "Genuine 3P Commercial SaaS BI UI",
        "pattern": "WS5 · Live SaaS BI Integration",
        "liveConsoleUrl": "https://app.sigmacomputing.com/",
    },
    "saas_04_servicenow_itsm.png": {
        "proofId": "SAAS-SNOW-01",
        "provider": "ServiceNow ITSM SaaS",
        "providerTag": "saas",
        "product": "ServiceNow — Live ITSM Incident & Change Control Workspace",
        "resourceLabel": "ServiceNow Instance (*.service-now.com)",
        "projectOrAccount": "ServiceNow Live Instance (Commercial SaaS)",
        "category": "Genuine 3P Commercial ITSM UI",
        "pattern": "WS5 · Live SaaS ITSM Integration",
        "liveConsoleUrl": "https://developer.servicenow.com/",
    },
    "saas_05_veeva_vault.png": {
        "proofId": "SAAS-VEEVA-01",
        "provider": "Veeva Vault RIM SaaS",
        "providerTag": "saas",
        "product": "Veeva Vault RIM — Live 21 CFR Part 11 Clinical/Regulatory Workspace",
        "resourceLabel": "Veeva Vault (*.veevavault.com)",
        "projectOrAccount": "Veeva Vault Tenant (Commercial SaaS)",
        "category": "Genuine 3P Commercial GxP UI",
        "pattern": "WS3 · Sovereign GxP Integration",
        "liveConsoleUrl": "https://www.veeva.com/products/vault-rim/",
    },
    "saas_06_atlassian_jira_confluence.png": {
        "proofId": "SAAS-JIRA-01",
        "provider": "Atlassian Jira & Confluence Cloud",
        "providerTag": "saas",
        "product": "Atlassian Cloud — Live Jira & Confluence Escalation Workspace",
        "resourceLabel": "Atlassian Cloud (*.atlassian.net)",
        "projectOrAccount": "Atlassian Cloud Tenant (Live Commercial SaaS)",
        "category": "Genuine 3P Commercial SRE/Issue UI",
        "pattern": "WS4 · Live SaaS Escalation UI",
        "liveConsoleUrl": "https://www.atlassian.com/software/jira",
    },
    "saas_07_salesforce_crm.png": {
        "proofId": "SAAS-SFDC-01",
        "provider": "Salesforce CRM Cloud",
        "providerTag": "saas",
        "product": "Salesforce Lightning — Live Enterprise CRM & Escalation Case View",
        "resourceLabel": "Salesforce Lightning (*.lightning.force.com)",
        "projectOrAccount": "Salesforce Developer/Enterprise Org (Commercial SaaS)",
        "category": "Genuine 3P Commercial CRM UI",
        "pattern": "WS4 · Live SaaS CRM Integration",
        "liveConsoleUrl": "https://login.salesforce.com/",
    },
    "saas_08_databricks_unity.png": {
        "proofId": "SAAS-DBX-01",
        "provider": "Databricks Data Intelligence SaaS",
        "providerTag": "saas",
        "product": "Databricks — Live Unity Catalog & SQL Warehouse Workspace",
        "resourceLabel": "Databricks Workspace (*.databricks.com)",
        "projectOrAccount": "Databricks on GCP Marketplace (Commercial SaaS)",
        "category": "Genuine 3P Commercial Lakehouse UI",
        "pattern": "WS2 · Live Lakehouse SQL Integration",
        "liveConsoleUrl": "https://console.cloud.google.com/marketplace/browse?q=Databricks&project=ramp-portal-dev",
    },
    "saas_09_snowflake_cortex.png": {
        "proofId": "SAAS-SF-01",
        "provider": "Snowflake AI Data Cloud SaaS",
        "providerTag": "saas",
        "product": "Snowflake Snowsight — Live Cortex Analyst & Governed SQL Worksheet",
        "resourceLabel": "Snowsight (app.snowflake.com)",
        "projectOrAccount": "Snowflake on GCP Marketplace (Commercial SaaS)",
        "category": "Genuine 3P Commercial Data Cloud UI",
        "pattern": "WS3 · Live Data Cloud Integration",
        "liveConsoleUrl": "https://console.cloud.google.com/marketplace/browse?q=Snowflake&project=ramp-portal-dev",
    },
    "saas_10_workday_raas.png": {
        "proofId": "SAAS-WD-01",
        "provider": "Workday Enterprise Cloud",
        "providerTag": "saas",
        "product": "Workday — Live Enterprise HCM & RaaS Reporting Workspace",
        "resourceLabel": "Workday Tenant (*.myworkday.com)",
        "projectOrAccount": "Workday Tenant (Commercial SaaS)",
        "category": "Genuine 3P Commercial HCM UI",
        "pattern": "WS5 · Live SaaS HCM Integration",
        "liveConsoleUrl": "https://www.workday.com/",
    },
    "saas_11_datadog_sre.png": {
        "proofId": "SAAS-DD-01",
        "provider": "Datadog Cloud Observability SaaS",
        "providerTag": "saas",
        "product": "Datadog — Live Cloud APM Traces & Bits AI SRE Monitor",
        "resourceLabel": "Datadog APM (app.datadoghq.com)",
        "projectOrAccount": "Datadog on GCP Marketplace (Commercial SaaS)",
        "category": "Genuine 3P Commercial Observability UI",
        "pattern": "WS5 · Live SRE Telemetry UI",
        "liveConsoleUrl": "https://console.cloud.google.com/marketplace/browse?q=Datadog&project=ramp-portal-dev",
    },
    "saas_12_okta_crowdstrike.png": {
        "proofId": "SAAS-SEC-01",
        "provider": "Okta / CrowdStrike Falcon SaaS",
        "providerTag": "saas",
        "product": "Okta / CrowdStrike — Live Workforce Identity & Endpoint Security Console",
        "resourceLabel": "Okta Admin / CrowdStrike Falcon",
        "projectOrAccount": "Commercial Identity / XDR SaaS Tenant",
        "category": "Genuine 3P Commercial SecOps UI",
        "pattern": "WS3 · Live Identity & XDR Proof",
        "liveConsoleUrl": "https://developer.okta.com/",
    },
}

SAFE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,96}$")
MAX_XML_BYTES = 2_500_000
MAX_SVG_BYTES = 4_000_000
_REGISTRY_LOCK = threading.RLock()


def get_runtime_dir(override: Optional[Path] = None) -> Path:
    if override is not None:
        base = Path(override)
    else:
        env_dir = os.environ.get("GE_BLOGS_RUNTIME_STATE_DIR", "").strip()
        base = Path(env_dir) if env_dir else Path("/tmp/ge-blogs-runtime-state")
    base.mkdir(parents=True, exist_ok=True)
    return base


def _assert_within_dir(base_dir: Path, target: Path) -> Path:
    base_res = base_dir.resolve()
    target_res = target.resolve()
    if target.is_symlink():
        raise ValueError("Symlink paths are not allowed.")
    if str(target_res) != str(base_res) and not str(target_res).startswith(str(base_res) + os.sep):
        raise ValueError("Path escapes allowed directory boundary.")
    return target_res


def validate_safe_slug(slug: str) -> str:
    s = (slug or "").strip().lower()
    if s not in BLOG_BY_SLUG:
        raise ValueError(f"Unknown blog slug: {slug}")
    return s


def validate_safe_id(diag_id: str) -> str:
    cid = (diag_id or "").strip()
    if not SAFE_ID_RE.fullmatch(cid):
        raise ValueError("Invalid diagram ID (use 1–97 alphanumeric, '-' or '_' characters starting with a letter/digit).")
    return cid


def validate_drawio_xml_safe(xml_str: str) -> ET.Element:
    if not isinstance(xml_str, str) or not xml_str.strip():
        raise ValueError("Draw.io XML payload is required.")
    raw_bytes = xml_str.encode("utf-8")
    if len(raw_bytes) > MAX_XML_BYTES:
        raise ValueError("Draw.io XML exceeds maximum allowed size (2.5 MB).")
    low = xml_str.lower()
    if "<!doctype" in low or "<!entity" in low:
        raise ValueError("Disallowed XML DTD/ENTITY declaration blocked.")
    if "<mxfile" not in low and "<mxgraphmodel" not in low:
        raise ValueError("XML must contain a valid <mxfile> or <mxGraphModel> root.")
    try:
        return ET.fromstring(xml_str)
    except ET.ParseError as exc:
        raise ValueError(f"Malformed XML: {exc}") from exc


def sanitize_svg_safe(svg_str: str) -> str:
    """Validates and sanitizes an SVG payload before saving to disk."""
    if not isinstance(svg_str, str) or not svg_str.strip():
        return ""
    if len(svg_str.encode("utf-8")) > MAX_SVG_BYTES:
        raise ValueError("SVG payload exceeds maximum allowed size (4 MB).")
    low = svg_str.lower()
    if "<!doctype" in low or "<!entity" in low:
        raise ValueError("Disallowed SVG DTD/ENTITY declaration blocked.")
    if "<svg" not in low:
        raise ValueError("Invalid SVG payload (missing <svg> root).")
    # Strip active script blocks and inline event handlers
    cleaned = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", svg_str, flags=re.IGNORECASE)
    cleaned = re.sub(r"<script\b[^>]*/\s*>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+on[a-z]+\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:href|xlink:href)\s*=\s*([\"'])\s*(?:javascript|vbscript):[^\"']*\1", 'href="#"', cleaned, flags=re.IGNORECASE)
    return cleaned


def encode_drawio_hash(xml_str: str) -> str:
    if not xml_str:
        return ""
    s = re.sub(r'\s*<mxCell id="pic_[^"]*"[^>]*>.*?</mxCell>', "", xml_str, flags=re.S)
    s = re.sub(r'\s*<mxCell id="plane_rail_[^"]*"[^>]*>.*?</mxCell>', "", s, flags=re.S)
    s = re.sub(r">\s+<", "><", s.strip())
    uri_encoded = urllib.parse.quote(s, safe="~()*!.'")
    compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
    compressed = compressor.compress(uri_encoded.encode("utf-8")) + compressor.flush()
    return "R" + base64.b64encode(compressed).decode("ascii")


def _atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".tmp_", suffix=".part", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def _registry_path(runtime_dir: Path) -> Path:
    return runtime_dir / "blog_diagram_registry.json"


def _custom_diagrams_dir(runtime_dir: Path) -> Path:
    d = runtime_dir / "blog_custom_diagrams"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _trash_dir(runtime_dir: Path) -> Path:
    d = runtime_dir / "blog_diagrams_trash"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _backups_dir(runtime_dir: Path) -> Path:
    d = runtime_dir / "blog_diagrams_backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _load_registry(runtime_dir: Path) -> Dict[str, Any]:
    reg_file = _registry_path(runtime_dir)
    if reg_file.is_file():
        try:
            data = json.loads(reg_file.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data.setdefault("customDiagrams", {})
                data.setdefault("metadataOverrides", {})
                data.setdefault("deletedByBlog", {})
                data.setdefault("deletedCustom", {})
                return data
        except Exception:
            pass
    return {
        "schemaVersion": "1.0",
        "customDiagrams": {},
        "metadataOverrides": {},
        "deletedByBlog": {},
        "deletedCustom": {},
    }


def _save_registry(runtime_dir: Path, reg: Dict[str, Any]) -> None:
    reg["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _atomic_write_text(_registry_path(runtime_dir), json.dumps(reg, indent=2) + "\n")


def _load_atlas_map() -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    if ATLAS_PATH.is_file():
        try:
            atlas = json.loads(ATLAS_PATH.read_text(encoding="utf-8"))
            for item in atlas.get("items", []):
                did = item.get("diagramId") or item.get("id")
                if did:
                    out[did] = item
        except Exception:
            pass
    return out


def _read_canonical_xml(diag_id: str) -> Tuple[str, Optional[Path]]:
    for cand in (DIAGRAMS_DIR / f"{diag_id}.drawio", COMP_DRAWIO_DIR / f"{diag_id}.drawio"):
        if cand.is_file() and not cand.is_symlink():
            return cand.read_text(encoding="utf-8"), cand
    return "", None


def _read_canonical_svg_path(diag_id: str) -> Optional[Path]:
    for cand in (DIAGRAMS_DIR / f"{diag_id}.svg", COMP_DRAWIO_DIR / f"{diag_id}.svg"):
        if cand.is_file() and not cand.is_symlink():
            return cand
    return None


def _get_2way_module():
    from scripts import slide_drawio_2way_registry as sdr
    return sdr


def _parse_markdown_images(doc_path: Path) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    """Returns (diagrams_list, screenshots_list) parsed in reading order from a blog Markdown file."""
    if not doc_path.is_file():
        return [], []
    text = doc_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    diagrams: List[Dict[str, str]] = []
    screenshots: List[Dict[str, str]] = []
    seen_diags: set[str] = set()
    seen_shots: set[str] = set()

    img_re = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
    for idx, line in enumerate(lines):
        for m in img_re.finditer(line):
            alt = m.group(1).strip()
            raw_url = m.group(2).strip()
            # Capture optional italic caption on the next non-empty line
            caption = ""
            for nxt in lines[idx + 1 : idx + 4]:
                s = nxt.strip()
                if not s:
                    continue
                if s.startswith("*") and s.endswith("*") and len(s) > 2:
                    caption = s.strip("*").strip()
                    caption = re.sub(r"\*\*([^*]+)\*\*", r"\1", caption)
                    caption = caption.replace("`", "")
                break
            dm = re.search(r"diagrams/(?:compendium/drawio/)?([A-Za-z0-9_-]+)\.(?:svg|drawio\.png|png)", raw_url)
            if dm:
                did = dm.group(1)
                if did not in seen_diags:
                    seen_diags.add(did)
                    diagrams.append({"id": did, "alt": alt, "caption": caption, "rawUrl": raw_url})
                continue
            sm = re.search(r"(screenshots/[^)\s]+?\.(?:png|jpg|jpeg|webp))", raw_url)
            if sm:
                rel_img = sm.group(1)
                if rel_img not in seen_shots:
                    seen_shots.add(rel_img)
                    screenshots.append({"relPath": rel_img, "alt": alt, "caption": caption})
    return diagrams, screenshots


def _build_diagram_record(
    diag_id: str,
    slug: str,
    title: str,
    caption: str,
    is_custom: bool,
    atlas_map: Dict[str, Dict[str, Any]],
    runtime_dir: Path,
    host_origin: str = "",
    custom_entry: Optional[Dict[str, Any]] = None,
    meta_override: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    atlas_item = atlas_map.get(diag_id, {})
    source_id = (custom_entry or {}).get("sourceDiagramId") or diag_id
    bm_slide_num = (
        (custom_entry or {}).get("slideNumber")
        or BARE_MIN_12_SLIDE_MAP.get(diag_id)
        or BARE_MIN_12_SLIDE_MAP.get(source_id)
        or atlas_item.get("bareMinSlideNum")
    )
    comp_slide_num = atlas_item.get("slideNumber") or atlas_item.get("compendiumSlideNum")

    if is_custom:
        cdir = _custom_diagrams_dir(runtime_dir)
        xml_file = cdir / f"{diag_id}.drawio"
        svg_file = cdir / f"{diag_id}.svg"
        xml_str = xml_file.read_text(encoding="utf-8") if xml_file.is_file() else ""
        mtime = int(svg_file.stat().st_mtime * 1000) if svg_file.is_file() else int(time.time() * 1000)
        svg_url = f"/api/blog-diagrams/asset/{urllib.parse.quote(diag_id)}.svg?v={mtime}"
        drawio_xml_url = f"/api/blog-diagrams/asset/{urllib.parse.quote(diag_id)}.drawio"
        xml_bytes = xml_file.stat().st_size if xml_file.is_file() else len(xml_str.encode("utf-8"))
        svg_bytes = svg_file.stat().st_size if svg_file.is_file() else 0
    else:
        xml_str, xml_path = _read_canonical_xml(diag_id)
        svg_path = _read_canonical_svg_path(diag_id)
        mtime = int(svg_path.stat().st_mtime * 1000) if svg_path else int(time.time() * 1000)
        svg_url = f"/diagrams/{urllib.parse.quote(diag_id)}.svg?v={mtime}"
        drawio_xml_url = f"/diagrams/{urllib.parse.quote(diag_id)}.drawio"
        xml_bytes = xml_path.stat().st_size if xml_path else 0
        svg_bytes = svg_path.stat().st_size if svg_path else 0

    sc_hash = encode_drawio_hash(xml_str) if xml_str else ""
    drawio_app_url = (
        f"https://app.diagrams.net/?splash=0&ui=kennedy&title={urllib.parse.quote(diag_id + '.drawio')}#{sc_hash}"
        if sc_hash
        else "https://app.diagrams.net/"
    )
    studio_qs = f"?compSlide={bm_slide_num}&mode=edit" if bm_slide_num else "?mode=edit"
    drawio_studio_path = f"/drawio/{urllib.parse.quote(diag_id)}{studio_qs}"
    drawio_studio_full_url = f"{host_origin}{drawio_studio_path}" if host_origin else drawio_studio_path
    drawio_xml_full_url = f"{host_origin}{drawio_xml_url}" if host_origin else drawio_xml_url

    slide_edit_url = (
        f"https://docs.google.com/presentation/d/{BARE_MIN_12_PRES_ID}/edit#slide=id.p{bm_slide_num}"
        if bm_slide_num
        else f"https://docs.google.com/presentation/d/{BARE_MIN_12_PRES_ID}/edit#slide=id.p1"
    )
    compendium_slide_url = (
        (atlas_item.get("linkages") or {}).get("deck1SlideUrl")
        or (
            f"https://docs.google.com/presentation/d/{COMPENDIUM_54_PRES_ID}/edit#slide=id.p{comp_slide_num}"
            if comp_slide_num
            else ""
        )
    )

    eff_title = (meta_override or {}).get("title") or title or diag_id
    eff_caption = (meta_override or {}).get("caption") if (meta_override and "caption" in meta_override) else caption
    updated_at = (meta_override or {}).get("updatedAt") or (custom_entry or {}).get("updatedAt") or ""

    return {
        "id": diag_id,
        "slug": slug,
        "title": eff_title,
        "caption": eff_caption,
        "isCustom": is_custom,
        "isCanonical": not is_custom,
        "sourceDiagramId": source_id if is_custom else diag_id,
        "slideNumber": int(bm_slide_num) if bm_slide_num else None,
        "compendiumSlideNumber": int(comp_slide_num) if comp_slide_num else None,
        "slideDeckId": BARE_MIN_12_PRES_ID,
        "svgUrl": svg_url,
        "drawioXmlUrl": drawio_xml_url,
        "drawioXmlFullUrl": drawio_xml_full_url,
        "drawioStudioUrl": drawio_studio_path,
        "drawioStudioFullUrl": drawio_studio_full_url,
        "drawioAppUrl": drawio_app_url,
        "slideEditUrl": slide_edit_url,
        "compendiumSlideUrl": compendium_slide_url,
        "can2WaySlideSync": bool(not is_custom and bm_slide_num),
        "xmlBytes": xml_bytes,
        "svgBytes": svg_bytes,
        "updatedAt": updated_at,
        "hasXml": bool(xml_str),
    }


def _strip_authuser_from_url(raw_url: str) -> str:
    if not raw_url:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw_url)
        q_items = [
            (k, v)
            for k, v in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
            if k.lower() != "authuser"
        ]
        new_q = urllib.parse.urlencode(q_items, safe="!:/,;")
        return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_q, parsed.fragment))
    except Exception:
        return raw_url


def _read_png_dimensions(path: Path) -> Tuple[int, int]:
    try:
        if path.is_file():
            head = path.read_bytes()[:24]
            if len(head) >= 24 and head[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", head[16:24])
                return int(w), int(h)
    except Exception:
        pass
    return 0, 0


def _load_verified_provenance_map() -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    prov_path = ROOT_DIR / "screenshots" / "verified-cloud-console" / "screenshot_provenance.json"
    if not prov_path.is_file():
        return out
    try:
        doc = json.loads(prov_path.read_text(encoding="utf-8"))
        for entry in doc.get("entries", []):
            rf = str(entry.get("relFile") or "").strip()
            if rf:
                out[Path(rf).name] = entry
    except Exception:
        pass
    return out


def _enrich_screenshots(raw_shots: List[Dict[str, str]], host_origin: str = "") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    items: List[Dict[str, Any]] = []
    pair_map: Dict[str, Dict[str, Any]] = {}
    pair_order: List[str] = []
    prov_map = _load_verified_provenance_map()

    for idx, sh in enumerate(raw_shots, 1):
        rel_path = sh["relPath"]
        full_file = ROOT_DIR / rel_path
        raw_bytes = full_file.read_bytes() if full_file.is_file() else b""
        size_bytes = len(raw_bytes)
        actual_sha = hashlib.sha256(raw_bytes).hexdigest() if raw_bytes else ""
        w, h = _read_png_dimensions(full_file)
        res_label = f"{w}×{h} Retina" if (w > 0 and h > 0) else "2880×1620 Retina"

        url_path = "/" + rel_path.lstrip("/")
        full_url = f"{host_origin}{url_path}" if host_origin else url_path
        fname = Path(rel_path).name
        m_ba = re.match(r"^(before|after)_(\d{2})_([a-z0-9_]+)\.png$", fname, re.IGNORECASE)
        phase = m_ba.group(1).upper() if m_ba else "LIVE"
        num_key = m_ba.group(2) if m_ba else f"item-{idx:02d}"

        vmeta = VERIFIED_CONSOLE_META.get(fname, {})
        prov = prov_map.get(fname, {})
        meta: Dict[str, Any] = {}

        prov_sha = str(prov.get("sha256") or "")
        verified_prov = bool(
            prov
            and prov_sha
            and actual_sha
            and prov_sha == actual_sha
            and prov.get("captureMethod") in ("cdp_live", "user_uploaded")
            and prov.get("isSecureContext") is True
        )
        raw_origin_url = _strip_authuser_from_url(str(prov.get("canonicalOriginUrl") or ""))
        live_console_url = vmeta.get("liveConsoleUrl") or raw_origin_url or ""

        provider = vmeta.get("provider") or (
            "Google Cloud Console"
            if fname.startswith("gcp_")
            else "ThoughtSpot Cloud SaaS"
            if fname.startswith("saas_")
            else "Live Verified SaaS / Cloud UI"
        )
        provider_tag = vmeta.get("providerTag") or (
            "gcp" if fname.startswith("gcp_") else "thoughtspot" if fname.startswith("saas_") else "saas"
        )

        clean_product = str(vmeta.get("product") or fname).replace("`", "")
        clean_resource = str(vmeta.get("resourceLabel") or prov.get("pageTitle") or "").replace("`", "")
        clean_alt = str(sh["alt"] or "").replace("`", "")
        clean_caption = str(sh["caption"] or sh["alt"] or "").replace("`", "")

        entry = {
            "index": idx,
            "fileName": fname,
            "relPath": rel_path,
            "imageUrl": url_path,
            "fullImageUrl": full_url,
            "phase": phase,
            "isPairMember": bool(m_ba),
            "saasNum": num_key if m_ba else "",
            "saasId": vmeta.get("proofId") or f"LIVE-{idx:02d}",
            "product": clean_product,
            "provider": provider,
            "providerTag": provider_tag,
            "resourceLabel": clean_resource,
            "projectOrAccount": vmeta.get("projectOrAccount") or str(prov.get("hostname") or ""),
            "liveConsoleUrl": live_console_url,
            "hostname": str(prov.get("hostname") or ""),
            "verifiedProvenance": verified_prov,
            "captureMethod": str(prov.get("captureMethod") or "unverified"),
            "capturedAt": str(prov.get("capturedAt") or ""),
            "sha256": actual_sha,
            "sha256Short": actual_sha[:12] if actual_sha else "",
            "targetId": "",
            "category": vmeta.get("category") or "Verified Live Cloud / SaaS Proof",
            "pattern": vmeta.get("pattern") or res_label,
            "s3LedgerUrl": "",
            "alt": clean_alt,
            "caption": clean_caption,
            "sizeBytes": size_bytes,
            "width": w,
            "height": h,
            "resolution": res_label,
        }
        items.append(entry)

        if m_ba:
            if num_key not in pair_map:
                pair_order.append(num_key)
                pair_map[num_key] = {
                    "saasNum": num_key,
                    "saasId": entry["saasId"],
                    "product": entry["product"],
                    "targetId": entry["targetId"],
                    "category": entry["category"],
                    "pattern": entry["pattern"],
                    "s3LedgerUrl": entry["s3LedgerUrl"],
                    "before": None,
                    "after": None,
                }
            if phase == "BEFORE":
                pair_map[num_key]["before"] = entry
            elif phase == "AFTER":
                pair_map[num_key]["after"] = entry

    pairs = [pair_map[k] for k in pair_order]
    return items, pairs


def get_blog_assets(slug: str, host_origin: str = "", runtime_dir: Optional[Path] = None) -> Dict[str, Any]:
    clean_slug = validate_safe_slug(slug)
    rdir = get_runtime_dir(runtime_dir)
    blog_meta = BLOG_BY_SLUG[clean_slug]
    atlas_map = _load_atlas_map()

    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)

    if clean_slug == "all":
        raw_diags: List[Dict[str, str]] = []
        raw_shots: List[Dict[str, str]] = []
        seen_d: set[str] = set()
        seen_s: set[str] = set()
        for b in BLOG_CATALOG:
            if b["slug"] == "all":
                continue
            d_list, s_list = _parse_markdown_images(ROOT_DIR / b["docPath"])
            for d in d_list:
                if d["id"] not in seen_d:
                    seen_d.add(d["id"])
                    raw_diags.append({**d, "originSlug": b["slug"]})
            for s in s_list:
                if s["relPath"] not in seen_s:
                    seen_s.add(s["relPath"])
                    raw_shots.append(s)
    else:
        raw_diags, raw_shots = _parse_markdown_images(ROOT_DIR / blog_meta["docPath"])

    deleted_canonical_ids = set(reg.get("deletedByBlog", {}).get(clean_slug, []))
    meta_overrides = reg.get("metadataOverrides", {})
    custom_map = reg.get("customDiagrams", {})
    deleted_custom_map = reg.get("deletedCustom", {})

    active_diagrams: List[Dict[str, Any]] = []
    deleted_diagrams: List[Dict[str, Any]] = []

    for rd in raw_diags:
        did = rd["id"]
        rec = _build_diagram_record(
            diag_id=did,
            slug=rd.get("originSlug", clean_slug),
            title=rd["alt"] or did,
            caption=rd["caption"],
            is_custom=False,
            atlas_map=atlas_map,
            runtime_dir=rdir,
            host_origin=host_origin,
            meta_override=meta_overrides.get(did),
        )
        if did in deleted_canonical_ids:
            rec["deleted"] = True
            deleted_diagrams.append(rec)
        else:
            rec["deleted"] = False
            active_diagrams.append(rec)

    # Append cloned/custom diagrams belonging to this blog (or all blogs if slug == 'all')
    for cid, centry in sorted(custom_map.items(), key=lambda kv: kv[1].get("createdAt", "")):
        cslug = centry.get("slug", "")
        if clean_slug != "all" and cslug != clean_slug:
            continue
        rec = _build_diagram_record(
            diag_id=cid,
            slug=cslug,
            title=centry.get("title") or cid,
            caption=centry.get("caption") or "",
            is_custom=True,
            atlas_map=atlas_map,
            runtime_dir=rdir,
            host_origin=host_origin,
            custom_entry=centry,
            meta_override=meta_overrides.get(cid),
        )
        rec["deleted"] = False
        active_diagrams.append(rec)

    for cid, dentry in sorted(deleted_custom_map.items(), key=lambda kv: kv[1].get("deletedAt", ""), reverse=True):
        cslug = dentry.get("slug", "")
        if clean_slug != "all" and cslug != clean_slug:
            continue
        deleted_diagrams.append({
            "id": cid,
            "slug": cslug,
            "title": dentry.get("title") or cid,
            "caption": dentry.get("caption") or "",
            "isCustom": True,
            "isCanonical": False,
            "deleted": True,
            "deletedAt": dentry.get("deletedAt", ""),
        })

    shots_items, shot_pairs = _enrich_screenshots(raw_shots, host_origin=host_origin)

    # Compute truthful dynamic subtitle reflecting strictly the planes actually captured on disk
    gcp_count = sum(1 for s in shots_items if s.get("providerTag") in ("gcp", "ge"))
    saas_count = sum(1 for s in shots_items if s.get("providerTag") in ("thoughtspot", "saas"))
    if gcp_count > 0 and saas_count > 0:
        dynamic_subtitle = (
            f"{blog_meta['subtitle']} — {len(shots_items)} cryptographically attested 16:9 Retina captures "
            f"({gcp_count} Google Cloud Console / Gemini Enterprise, {saas_count} live commercial SaaS)."
        )
    elif gcp_count > 0:
        dynamic_subtitle = (
            f"{blog_meta['subtitle']} — {gcp_count} cryptographically attested 16:9 Retina Google Cloud Console "
            "capture(s)."
        )
    elif saas_count > 0:
        dynamic_subtitle = (
            f"{blog_meta['subtitle']} — {saas_count} cryptographically attested 16:9 Retina live commercial SaaS "
            "capture(s) (ThoughtSpot Cloud; Google Cloud Console & Gemini Enterprise captures pending 1-tap SSO)."
        )
    else:
        dynamic_subtitle = blog_meta["subtitle"]

    # Compute summary counts for every blog for switcher badges
    all_blogs_nav = []
    for b in BLOG_CATALOG:
        all_blogs_nav.append({
            "slug": b["slug"],
            "wsKey": b["wsKey"],
            "shortLabel": b["shortLabel"],
            "badge": b["badge"],
            "title": b["title"],
            "diagramsPageUrl": f"/blogs/{b['slug']}/diagrams",
            "screenshotsPageUrl": f"/blogs/{b['slug']}/screenshots",
            "blogPortalUrl": b["blogPortalUrl"],
        })

    return {
        "ok": True,
        "blog": {
            **blog_meta,
            "subtitle": dynamic_subtitle,
            "diagramsPageUrl": f"/blogs/{clean_slug}/diagrams",
            "screenshotsPageUrl": f"/blogs/{clean_slug}/screenshots",
        },
        "allBlogs": all_blogs_nav,
        "diagrams": active_diagrams,
        "deletedDiagrams": deleted_diagrams,
        "screenshots": shots_items,
        "screenshotPairs": shot_pairs,
        "stats": {
            "activeDiagramCount": len(active_diagrams),
            "deletedDiagramCount": len(deleted_diagrams),
            "customDiagramCount": sum(1 for d in active_diagrams if d["isCustom"]),
            "screenshotCount": len(shots_items),
            "verifiedScreenshotCount": sum(1 for s in shots_items if s.get("verifiedProvenance")),
            "screenshotPairCount": len(shot_pairs),
        },
    }


def get_custom_diagram_asset(diag_id: str, ext: str, runtime_dir: Optional[Path] = None) -> Tuple[bytes, str]:
    clean_id = validate_safe_id(diag_id)
    clean_ext = (ext or "").strip().lower()
    if clean_ext not in ("svg", "drawio"):
        raise ValueError("Unsupported diagram asset extension.")
    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    raw_path = cdir / f"{clean_id}.{clean_ext}"
    resolved = _assert_within_dir(cdir, raw_path)
    if not resolved.is_file():
        raise FileNotFoundError(f"Custom diagram asset not found: {clean_id}.{clean_ext}")
    mime = "image/svg+xml; charset=utf-8" if clean_ext == "svg" else "application/xml; charset=utf-8"
    return resolved.read_bytes(), mime


def get_custom_diagram_record_for_studio(diag_id: str, runtime_dir: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    try:
        clean_id = validate_safe_id(diag_id)
    except ValueError:
        return None
    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    xml_file = cdir / f"{clean_id}.drawio"
    svg_file = cdir / f"{clean_id}.svg"
    if not xml_file.is_file():
        return None
    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
    centry = reg.get("customDiagrams", {}).get(clean_id, {})
    xml_str = xml_file.read_text(encoding="utf-8")
    svg_str = svg_file.read_text(encoding="utf-8") if svg_file.is_file() else ""
    return {
        "item": {
            "diagramId": clean_id,
            "id": clean_id,
            "title": centry.get("title") or clean_id,
            "shortTitle": centry.get("title") or clean_id,
            "slideNumber": centry.get("slideNumber") or 1,
            "bareMinSlideNum": centry.get("slideNumber"),
            "isCustom": True,
            "linkages": {
                "deck1SlideUrl": f"https://docs.google.com/presentation/d/{BARE_MIN_12_PRES_ID}/edit#slide=id.p{centry.get('slideNumber') or 1}",
            },
        },
        "xml": xml_str,
        "svg": svg_str,
        "selfContainedHash": encode_drawio_hash(xml_str),
    }


def save_blog_diagram(
    slug: str,
    diag_id: str,
    xml_str: str,
    title: Optional[str] = None,
    caption: Optional[str] = None,
    svg_str: Optional[str] = None,
    comp_slide: Optional[Any] = None,
    sync_google_slides: bool = False,
    host_origin: str = "",
    runtime_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    clean_slug = validate_safe_slug(slug)
    clean_id = validate_safe_id(diag_id)
    root_el = validate_drawio_xml_safe(xml_str)
    sanitized_svg = sanitize_svg_safe(svg_str) if svg_str else ""

    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    bdir = _backups_dir(rdir)
    ts_tag = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    iso_now = datetime.now(timezone.utc).isoformat()

    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
        is_custom = clean_id in reg.get("customDiagrams", {}) or (cdir / f"{clean_id}.drawio").is_file()

    sdr = _get_2way_module()
    gslides_sync_info: Dict[str, Any] = {"googleSlidesSynced": False, "updatedCount": 0, "warnings": []}

    if is_custom:
        xml_target = _assert_within_dir(cdir, cdir / f"{clean_id}.drawio")
        svg_target = _assert_within_dir(cdir, cdir / f"{clean_id}.svg")
        if xml_target.is_file():
            shutil.copy2(xml_target, _assert_within_dir(bdir, bdir / f"{ts_tag}_{clean_id}.drawio"))
        _atomic_write_text(xml_target, xml_str)
        svg_out = sanitized_svg or sdr._render_drawio_xml_to_svg(root_el)
        _atomic_write_text(svg_target, svg_out)
        with _REGISTRY_LOCK:
            reg = _load_registry(rdir)
            centry = reg.setdefault("customDiagrams", {}).setdefault(clean_id, {"slug": clean_slug, "createdAt": iso_now})
            if title is not None and title.strip():
                centry["title"] = title.strip()[:240]
            if caption is not None:
                centry["caption"] = caption.strip()[:1000]
            centry["updatedAt"] = iso_now
            _save_registry(rdir, reg)
    else:
        # Canonical repo diagram: backup first, then save via 2-Way Sync Registry
        prev_xml, prev_path = _read_canonical_xml(clean_id)
        if prev_path is None:
            raise FileNotFoundError(f"Canonical diagram not found: {clean_id}")
        shutil.copy2(prev_path, _assert_within_dir(bdir, bdir / f"{ts_tag}_{clean_id}.drawio"))
        sync_res = sdr.apply_drawio_xml_edit_to_unique_diagram(
            clean_id,
            xml_str,
            comp_slide=comp_slide,
            sync_google_slides=bool(sync_google_slides),
        )
        gslides_sync_info = {
            "googleSlidesSynced": bool(sync_res.get("googleSlidesSynced", False)),
            "updatedCount": int(sync_res.get("updatedCount") or 0),
            "googleSlidesTargets": sync_res.get("googleSlidesTargets") or [],
            "warnings": sync_res.get("warnings") or [],
        }
        # If Draw.io supplied an exact high-fidelity exported SVG, write it atomically to both SVG mirrors
        if sanitized_svg:
            for svg_dest in (DIAGRAMS_DIR / f"{clean_id}.svg", COMP_DRAWIO_DIR / f"{clean_id}.svg"):
                if svg_dest.parent.is_dir():
                    _assert_within_dir(DIAGRAMS_DIR, svg_dest)
                    _atomic_write_text(svg_dest, sanitized_svg)

        with _REGISTRY_LOCK:
            reg = _load_registry(rdir)
            ov = reg.setdefault("metadataOverrides", {}).setdefault(clean_id, {})
            if title is not None and title.strip():
                ov["title"] = title.strip()[:240]
            if caption is not None:
                ov["caption"] = caption.strip()[:1000]
            ov["updatedAt"] = iso_now
            _save_registry(rdir, reg)

    refreshed = get_blog_assets(clean_slug, host_origin=host_origin, runtime_dir=rdir)
    saved_card = next((d for d in refreshed["diagrams"] if d["id"] == clean_id), None)
    return {
        "ok": True,
        "id": clean_id,
        "slug": clean_slug,
        "isCustom": is_custom,
        "savedAt": iso_now,
        "diagram": saved_card,
        **gslides_sync_info,
    }


def clone_blog_diagram(
    source_id: str,
    new_id: str,
    target_slug: str,
    new_title: Optional[str] = None,
    new_caption: Optional[str] = None,
    slide_num: Optional[Any] = None,
    host_origin: str = "",
    runtime_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    clean_src = validate_safe_id(source_id)
    clean_new = validate_safe_id(new_id)
    clean_slug = validate_safe_slug(target_slug)
    if clean_slug == "all":
        clean_slug = "ws1"

    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)

    # Prevent colliding with existing canonical or custom diagram IDs
    if (DIAGRAMS_DIR / f"{clean_new}.drawio").is_file() or (cdir / f"{clean_new}.drawio").is_file():
        raise FileExistsError(f"Diagram ID '{clean_new}' already exists. Choose a unique ID.")

    # Load source XML and SVG (from either custom or canonical store)
    src_xml = ""
    src_svg = ""
    custom_src_xml = cdir / f"{clean_src}.drawio"
    if custom_src_xml.is_file():
        src_xml = _assert_within_dir(cdir, custom_src_xml).read_text(encoding="utf-8")
        custom_src_svg = cdir / f"{clean_src}.svg"
        if custom_src_svg.is_file():
            src_svg = _assert_within_dir(cdir, custom_src_svg).read_text(encoding="utf-8")
    else:
        src_xml, _ = _read_canonical_xml(clean_src)
        svg_p = _read_canonical_svg_path(clean_src)
        if svg_p is not None:
            src_svg = svg_p.read_text(encoding="utf-8")

    if not src_xml:
        raise FileNotFoundError(f"Source diagram XML not found: {clean_src}")

    root_el = validate_drawio_xml_safe(src_xml)
    if not src_svg:
        sdr = _get_2way_module()
        src_svg = sdr._render_drawio_xml_to_svg(root_el)

    dest_xml = _assert_within_dir(cdir, cdir / f"{clean_new}.drawio")
    dest_svg = _assert_within_dir(cdir, cdir / f"{clean_new}.svg")
    _atomic_write_text(dest_xml, src_xml)
    _atomic_write_text(dest_svg, src_svg)

    inherited_slide = None
    if slide_num is not None and str(slide_num).strip().isdigit():
        inherited_slide = int(str(slide_num).strip())
    elif clean_src in BARE_MIN_12_SLIDE_MAP:
        inherited_slide = BARE_MIN_12_SLIDE_MAP[clean_src]

    iso_now = datetime.now(timezone.utc).isoformat()
    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
        if inherited_slide is None and clean_src in reg.get("customDiagrams", {}):
            inherited_slide = reg["customDiagrams"][clean_src].get("slideNumber")
        reg.setdefault("customDiagrams", {})[clean_new] = {
            "id": clean_new,
            "slug": clean_slug,
            "title": (new_title or f"Clone of {clean_src}").strip()[:240],
            "caption": (new_caption or f"Cloned from {clean_src} — fully editable custom architecture diagram.").strip()[:1000],
            "sourceDiagramId": clean_src,
            "slideNumber": inherited_slide,
            "createdAt": iso_now,
            "updatedAt": iso_now,
        }
        reg.get("deletedCustom", {}).pop(clean_new, None)
        _save_registry(rdir, reg)

    refreshed = get_blog_assets(clean_slug, host_origin=host_origin, runtime_dir=rdir)
    cloned_card = next((d for d in refreshed["diagrams"] if d["id"] == clean_new), None)
    return {
        "ok": True,
        "id": clean_new,
        "sourceId": clean_src,
        "slug": clean_slug,
        "diagram": cloned_card,
    }


def create_blank_diagram(
    new_id: str,
    target_slug: str,
    title: Optional[str] = None,
    caption: Optional[str] = None,
    host_origin: str = "",
    runtime_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    clean_new = validate_safe_id(new_id)
    clean_slug = validate_safe_slug(target_slug)
    if clean_slug == "all":
        clean_slug = "ws1"
    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    if (DIAGRAMS_DIR / f"{clean_new}.drawio").is_file() or (cdir / f"{clean_new}.drawio").is_file():
        raise FileExistsError(f"Diagram ID '{clean_new}' already exists.")

    safe_title = (title or f"New Architecture Diagram ({clean_slug.upper()})").strip()[:240]
    blank_xml = (
        f'<mxfile host="app.diagrams.net" modified="{datetime.now(timezone.utc).isoformat()}" version="24.0.0">'
        f'<diagram id="{clean_new}" name="{html.escape(safe_title)}">'
        '<mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
        'fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" background="#ffffff">'
        '<root>'
        '<mxCell id="0"/>'
        '<mxCell id="1" parent="0"/>'
        f'<mxCell id="hdr_box" value="{html.escape(safe_title)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#1a73e8;strokeWidth=2;fontColor=#0f172a;fontSize=16;fontStyle=1;" vertex="1" parent="1">'
        '<mxGeometry x="40" y="30" width="1520" height="60" as="geometry"/>'
        '</mxCell>'
        '<mxCell id="node_1" value="Control Plane / Ingress" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1a73e8;strokeWidth=1.5;fontColor=#0f172a;fontSize=13;" vertex="1" parent="1">'
        '<mxGeometry x="80" y="160" width="320" height="120" as="geometry"/>'
        '</mxCell>'
        '<mxCell id="node_2" value="Agentic Runtime Plane" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#059669;strokeWidth=1.5;fontColor=#0f172a;fontSize=13;" vertex="1" parent="1">'
        '<mxGeometry x="620" y="160" width="340" height="120" as="geometry"/>'
        '</mxCell>'
        '<mxCell id="node_3" value="Isolated Data &amp; Audit Plane" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#7c3aed;strokeWidth=1.5;fontColor=#0f172a;fontSize=13;" vertex="1" parent="1">'
        '<mxGeometry x="1180" y="160" width="340" height="120" as="geometry"/>'
        '</mxCell>'
        '<mxCell id="edge_1" value="Authenticated Request" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#1a73e8;strokeWidth=2;" edge="1" source="node_1" target="node_2" parent="1">'
        '<mxGeometry relative="1" as="geometry"/>'
        '</mxCell>'
        '<mxCell id="edge_2" value="Tenant-Scoped Query" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#059669;strokeWidth=2;" edge="1" source="node_2" target="node_3" parent="1">'
        '<mxGeometry relative="1" as="geometry"/>'
        '</mxCell>'
        '</root>'
        '</mxGraphModel>'
        '</diagram>'
        '</mxfile>'
    )
    root_el = validate_drawio_xml_safe(blank_xml)
    sdr = _get_2way_module()
    blank_svg = sdr._render_drawio_xml_to_svg(root_el)

    _atomic_write_text(_assert_within_dir(cdir, cdir / f"{clean_new}.drawio"), blank_xml)
    _atomic_write_text(_assert_within_dir(cdir, cdir / f"{clean_new}.svg"), blank_svg)

    iso_now = datetime.now(timezone.utc).isoformat()
    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
        reg.setdefault("customDiagrams", {})[clean_new] = {
            "id": clean_new,
            "slug": clean_slug,
            "title": safe_title,
            "caption": (caption or "Custom editable architecture canvas.").strip()[:1000],
            "sourceDiagramId": "",
            "slideNumber": None,
            "createdAt": iso_now,
            "updatedAt": iso_now,
        }
        _save_registry(rdir, reg)

    refreshed = get_blog_assets(clean_slug, host_origin=host_origin, runtime_dir=rdir)
    created_card = next((d for d in refreshed["diagrams"] if d["id"] == clean_new), None)
    return {"ok": True, "id": clean_new, "slug": clean_slug, "diagram": created_card}


def delete_blog_diagram(
    slug: str,
    diag_id: str,
    runtime_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    clean_slug = validate_safe_slug(slug)
    clean_id = validate_safe_id(diag_id)
    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    tdir = _trash_dir(rdir)
    ts_tag = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    iso_now = datetime.now(timezone.utc).isoformat()
    trash_folder = _assert_within_dir(tdir, tdir / f"{ts_tag}_{clean_id}")
    trash_folder.mkdir(parents=True, exist_ok=True)

    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
        custom_map = reg.setdefault("customDiagrams", {})
        if clean_id in custom_map:
            entry = custom_map.pop(clean_id)
            for ext in ("drawio", "svg"):
                src = cdir / f"{clean_id}.{ext}"
                if src.is_file():
                    shutil.move(str(_assert_within_dir(cdir, src)), str(trash_folder / f"{clean_id}.{ext}"))
            entry["deletedAt"] = iso_now
            entry["trashFolder"] = trash_folder.name
            reg.setdefault("deletedCustom", {})[clean_id] = entry
            _save_registry(rdir, reg)
            return {
                "ok": True,
                "id": clean_id,
                "slug": clean_slug,
                "mode": "custom_moved_to_trash",
                "restorable": True,
                "trashBackup": trash_folder.name,
            }

        # Canonical repo diagram: copy snapshot to trash & soft-delete from blog gallery (preserves F-01/F-12 repo baseline)
        xml_text, xml_path = _read_canonical_xml(clean_id)
        svg_path = _read_canonical_svg_path(clean_id)
        if xml_path is None:
            raise FileNotFoundError(f"Diagram not found: {clean_id}")
        shutil.copy2(xml_path, trash_folder / f"{clean_id}.drawio")
        if svg_path is not None:
            shutil.copy2(svg_path, trash_folder / f"{clean_id}.svg")

        del_list = reg.setdefault("deletedByBlog", {}).setdefault(clean_slug, [])
        if clean_id not in del_list:
            del_list.append(clean_id)
        _save_registry(rdir, reg)
        return {
            "ok": True,
            "id": clean_id,
            "slug": clean_slug,
            "mode": "canonical_soft_deleted",
            "restorable": True,
            "trashBackup": trash_folder.name,
        }


def restore_blog_diagram(
    slug: str,
    diag_id: str,
    host_origin: str = "",
    runtime_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    clean_slug = validate_safe_slug(slug)
    clean_id = validate_safe_id(diag_id)
    rdir = get_runtime_dir(runtime_dir)
    cdir = _custom_diagrams_dir(rdir)
    tdir = _trash_dir(rdir)

    restore_mode = ""
    with _REGISTRY_LOCK:
        reg = _load_registry(rdir)
        # Case 1: Restore deleted custom clone from trash
        del_custom = reg.setdefault("deletedCustom", {})
        if clean_id in del_custom:
            entry = del_custom.pop(clean_id)
            tf_name = entry.pop("trashFolder", "")
            entry.pop("deletedAt", None)
            if tf_name:
                tf_path = _assert_within_dir(tdir, tdir / tf_name)
                for ext in ("drawio", "svg"):
                    src = tf_path / f"{clean_id}.{ext}"
                    if src.is_file():
                        shutil.copy2(src, _assert_within_dir(cdir, cdir / f"{clean_id}.{ext}"))
            reg.setdefault("customDiagrams", {})[clean_id] = entry
            _save_registry(rdir, reg)
            restore_mode = "custom_restored"
        else:
            # Case 2: Restore soft-deleted canonical diagram
            del_list = reg.setdefault("deletedByBlog", {}).setdefault(clean_slug, [])
            if clean_id in del_list:
                del_list.remove(clean_id)
                _save_registry(rdir, reg)
                restore_mode = "canonical_restored"

    if not restore_mode:
        raise FileNotFoundError(f"Deleted diagram '{clean_id}' not found for restore.")

    refreshed = get_blog_assets(clean_slug, host_origin=host_origin, runtime_dir=rdir)
    restored_card = next((d for d in refreshed["diagrams"] if d["id"] == clean_id), None)
    return {"ok": True, "id": clean_id, "slug": clean_slug, "mode": restore_mode, "diagram": restored_card}
