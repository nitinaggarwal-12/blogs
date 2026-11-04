#!/usr/bin/env python3
"""
Builds the v2 Streamlined Edition of the GEAP 5-Part Multi-Tenant Agentic AI Series
+ Standalone 10-SaaS Multi-Cloud Visual Verification & Red-Team Atlas as COMPLETELY NEW
links (Google Slides, Google Docs, Word .docx, and Portal Markdown), without mutating
any existing v1 files, Google Docs, or Google Slides decks.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from build_gcp_branded_blog_docs import (
    GDOCS_BIN,
    GDRIVE_BIN,
    GITHUB_BLOB_BASE,
    PORTAL_BASE,
    ROOT_DIR,
    SCRATCH_OPS_DIR,
    get_shareable_doc_url,
    get_shareable_drive_url,
    parse_frontmatter,
    preprocess_markdown_for_gdocs,
    sanitize_currency_outside_math,
)

GSLIDES_BIN = "/google/bin/releases/gemini-agents-gslides/gslides"
V2_BLOGS_DIR = ROOT_DIR / "blogs" / "v2-edition"
V2_WORD_DIR = ROOT_DIR / "docs" / "word" / "v2-edition"
V2_MANIFEST_PATH = ROOT_DIR / "slides" / "v2_streamlined_edition_manifest.json"

# Source v1 IDs (READ-ONLY templates to clone via gdrive mutate cp; NEVER mutated)
SOURCE_V1_DOC_TEMPLATE_ID = "1Ts1-tKdzPJEvjZNgh-1_ZtdXJn86dAkMIljf9qTp8Os"
SOURCE_V1_SLIDES_IDS: Dict[str, str] = {
    "ATLAS": "12hpWYalbclWRdvSrd9DYZQsZWcA7zYiqWe7SS2vTscQ",
    "WS1": "12hpWYalbclWRdvSrd9DYZQsZWcA7zYiqWe7SS2vTscQ",
    "WS2": "1tELjvuuFKkt-Z9W3es8CsNITbmAGAp2S7qMiTYEQOGE",
    "WS3": "1PdLfTBPSat-6M-8yOo4MEi5uGChRqyRm7AJLNvei7ZM",
    "WS4": "1p6UOu0JPurkx46lAnXrpvob1R9Cwb-SL8k1vBCwWo-s",
    "WS5": "1Pl3XOh9-eN1AeYcnbvGua8wYWx2EewTzExu_VoO_AqU",
}

V2_SPECS: List[Dict[str, Any]] = [
    {
        "key": "ATLAS",
        "src_md_rel": "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "v2_md_rel": "blogs/v2-edition/saas-10-visual-verification-and-redteam-atlas.md",
        "v2_docx_rel": "docs/word/v2-edition/saas-10-visual-verification-and-redteam-atlas.docx",
        "doc_title": "[V2 ATLAS] GEAP 10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas — Editable Google Docs",
        "slides_title": "[V2 ATLAS — 16 SLIDES] GEAP 10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas — Editable Google Slides",
        "series_badge": "Companion Visual Atlas • 10 SaaS × 30/30 Flows",
        "slides_label": "16 Slides",
        "target_slide_count": 16,
        # Keep p1, p2, p8, p20, p21..p30, p33, p34 (delete the other 18 slides from WS1 34-slide copy)
        "delete_pages": [
            "p3", "p4", "p5", "p6", "p7", "p9", "p10", "p11", "p12",
            "p13", "p14", "p15", "p16", "p17", "p18", "p19", "p31", "p32",
        ],
        "signature_saas_ids": [f"SAAS-{i:02d}" for i in range(1, 11)],
    },
    {
        "key": "WS1",
        "src_md_rel": "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "v2_md_rel": "blogs/v2-edition/ws1-v2-reference-architecture-and-5hop-baseline.md",
        "v2_docx_rel": "docs/word/v2-edition/ws1-v2-reference-architecture-and-5hop-baseline.docx",
        "doc_title": "[V2 STREAMLINED] WS1 — Reference Architecture, Taxonomy & 5-Hop Baseline (Hard Quotas & 2-SaaS Edition) — Editable Google Docs",
        "slides_title": "[V2 STREAMLINED — 24 SLIDES] WS1 — Reference Architecture, Taxonomy & 5-Hop Baseline — Editable Google Slides",
        "series_badge": "Workstream 1 of 5 (v2 Edition) • Foundation",
        "slides_label": "24 Slides",
        "target_slide_count": 24,
        # Delete p6, p7 (2 text-summary cards duplicating Fig 1/2) + p23..p30 (8 non-signature SaaS slides; keep p21 Metabase & p22 Trino)
        "delete_pages": ["p6", "p7", "p23", "p24", "p25", "p26", "p27", "p28", "p29", "p30"],
        "signature_saas_ids": ["SAAS-01", "SAAS-06"],
        "caveats_page": "p19",
        "act4_page": "p20",
    },
    {
        "key": "WS2",
        "src_md_rel": "blogs/ws2-pattern-a-pooled-architecture.md",
        "v2_md_rel": "blogs/v2-edition/ws2-v2-pattern-a-pooled-architecture.md",
        "v2_docx_rel": "docs/word/v2-edition/ws2-v2-pattern-a-pooled-architecture.docx",
        "doc_title": "[V2 STREAMLINED] WS2 — Pattern A: High-Density Pooled Architecture (Hard Quotas & 2-SaaS Edition) — Editable Google Docs",
        "slides_title": "[V2 STREAMLINED — 24 SLIDES] WS2 — Pattern A: High-Density Pooled Architecture — Editable Google Slides",
        "series_badge": "Workstream 2 of 5 (v2 Edition) • Pattern A (Pooled)",
        "slides_label": "24 Slides",
        "target_slide_count": 24,
        # Delete p6, p11 (principles summary + Terraform graph) + 8 non-signature SaaS slides (keep p26 ClickHouse & p27 Redmine)
        "delete_pages": ["p6", "p11", "p21", "p22", "p23", "p24", "p25", "p28", "p29", "p30"],
        "signature_saas_ids": ["SAAS-03", "SAAS-07"],
        "caveats_page": "p19",
        "act4_page": "p20",
    },
    {
        "key": "WS3",
        "src_md_rel": "blogs/ws3-pattern-b-sovereign-silos.md",
        "v2_md_rel": "blogs/v2-edition/ws3-v2-pattern-b-sovereign-silos.md",
        "v2_docx_rel": "docs/word/v2-edition/ws3-v2-pattern-b-sovereign-silos.docx",
        "doc_title": "[V2 STREAMLINED] WS3 — Pattern B: Zero-Trust Sovereign Silos (Hard Quotas & 2-SaaS Edition) — Editable Google Docs",
        "slides_title": "[V2 STREAMLINED — 24 SLIDES] WS3 — Pattern B: Zero-Trust Sovereign Silos — Editable Google Slides",
        "series_badge": "Workstream 3 of 5 (v2 Edition) • Pattern B (Silos)",
        "slides_label": "24 Slides",
        "target_slide_count": 24,
        # Delete p6, p10 (principles summary + Terraform graph) + 8 non-signature SaaS slides (keep p26 HashiCorp Vault CMEK & p29 NocoDB GxP)
        "delete_pages": ["p6", "p10", "p22", "p23", "p24", "p25", "p27", "p28", "p30", "p31"],
        "signature_saas_ids": ["SAAS-04", "SAAS-10"],
        "caveats_page": "p20",
        "act4_page": "p21",
    },
    {
        "key": "WS4",
        "src_md_rel": "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md",
        "v2_md_rel": "blogs/v2-edition/ws4-v2-pattern-c-hybrid-dynamic-tiering.md",
        "v2_docx_rel": "docs/word/v2-edition/ws4-v2-pattern-c-hybrid-dynamic-tiering.docx",
        "doc_title": "[V2 STREAMLINED] WS4 — Pattern C: Dynamic Hybrid Hub-and-Spoke & Tier Upgrade (Hard Quotas & 2-SaaS Edition) — Editable Google Docs",
        "slides_title": "[V2 STREAMLINED — 24 SLIDES] WS4 — Pattern C: Dynamic Hybrid Hub-and-Spoke & Tier Upgrade — Editable Google Slides",
        "series_badge": "Workstream 4 of 5 (v2 Edition) • Pattern C (Hybrid)",
        "slides_label": "24 Slides",
        "target_slide_count": 24,
        # Delete p6, p11 (principles summary + Terraform graph) + 8 non-signature SaaS slides (keep p24 Grafana & p30 Gitea SRE)
        "delete_pages": ["p6", "p11", "p22", "p23", "p25", "p26", "p27", "p28", "p29", "p31"],
        "signature_saas_ids": ["SAAS-02", "SAAS-05"],
        "caveats_page": "p20",
        "act4_page": "p21",
    },
    {
        "key": "WS5",
        "src_md_rel": "blogs/ws5-decision-guide-and-agentic-triad.md",
        "v2_md_rel": "blogs/v2-edition/ws5-v2-decision-guide-and-agentic-triad.md",
        "v2_docx_rel": "docs/word/v2-edition/ws5-v2-decision-guide-and-agentic-triad.docx",
        "doc_title": "[V2 STREAMLINED] WS5 — Executive Decision Guide & Multi-Tenant Agentic Triad (Hard Quotas & 2-SaaS Edition) — Editable Google Docs",
        "slides_title": "[V2 STREAMLINED — 24 SLIDES] WS5 — Executive Decision Guide & Multi-Tenant Agentic Triad — Editable Google Slides",
        "series_badge": "Workstream 5 of 5 (v2 Edition) • Capstone Guide",
        "slides_label": "24 Slides",
        "target_slide_count": 24,
        # Delete p9, p11 (duplicate Pattern A/C recap diagrams) + 8 non-signature SaaS slides (keep p25 Datalust Seq & p31 Directus HCM)
        "delete_pages": ["p9", "p11", "p22", "p23", "p24", "p26", "p27", "p28", "p29", "p30"],
        "signature_saas_ids": ["SAAS-08", "SAAS-09"],
        "caveats_page": "p20",
        "act4_page": "p21",
    },
]


DISQUALIFIERS_BY_WS: Dict[str, str] = {
    "WS1": """## When NOT to Use a Single Static Multi-Tenant Pattern (Architectural Disqualifiers)

> [!WARNING]
> **Architectural Disqualifier Checklist — Do NOT Force a Single Pattern Across All Tenants When:**
> - **Mixed Regulatory Tiers Coexist in One Portfolio:** If your commercial cohort (`950+` tenants) requires sub-second onboarding and `84.7%` shared prompt cache savings while your regulated enterprise cohort (`20–50` banking/pharma tenants) mandates dedicated GCP projects, VPC Service Controls (`VPC-SC`), and customer-held Cloud KMS CMEK kill-switches, forcing everyone into **Pattern A** fails compliance audits, whereas forcing everyone into **Pattern B** destroys unit economics (`USD 8,400+/mo` per tenant) and exhausts GCP organization perimeter quotas.
> - **Sub-32,768 Token System Prompts with High Per-Tenant Schema Variance:** If every tenant injects a completely bespoke tool catalog with `< 32,768` shared static tokens, Vertex AI `ContextCacheConfig` cannot amortize a shared prefix (`alpha_cache = 0.10` requires `>= 32,768` immutable tokens).
> - **Non-Idempotent External 3rd-Party SaaS Mutations Without Outbox Ledgers:** If ADK agents invoke state-mutating MCP tools (ServiceNow, Jira, Workday) without deterministic `X-Idempotency-Key` headers and an asynchronous compensating saga ledger, mid-flight `HTTP 423 Locked` CMEK revocations or `HTTP 429` bulkheads will leave orphaned third-party side-effects.""",

    "WS2": """## When NOT to Use Pattern A High-Density Pooled Architecture (Architectural Disqualifiers)

> [!WARNING]
> **Pattern A Disqualifiers — Immediately Route the Tenant to Pattern B (Silo) or Pattern C (Hybrid PSC Spoke) If Any Condition Below Holds:**
> - **Disqualifier 1 — Hardware-Enforced Network Perimeter Mandate (OCC 2013-29, EU DORA, HIPAA/GxP):** The customer contract legally prohibits shared container kernels (`Cloud Run Gen2` / `Vertex AI Agent Engine`), shared Memorystore for Valkey instances, or shared AlloyDB clusters—even with `FORCE ROW LEVEL SECURITY`—and requires a dedicated GCP project (`cymbal-{tenant}-silo-prod`) bounded by a dedicated **VPC Service Controls (`VPC-SC`)** perimeter.
> - **Disqualifier 2 — Independent Customer-Held Cloud KMS CMEK / EKM Kill-Switch SLA (`< 60s`):** The customer requires unilateral cryptographic revocation via their own external HSM (**Cloud EKM**) or dedicated Cloud KMS key ring such that disabling their key physically halts all database I/O and inference without affecting any other tenant on the platform.
> - **Disqualifier 3 — Custom Fine-Tuned Weights or Air-Gapped Open-Weight Models (`Gemma 3 27B`):** The tenant requires dedicated GPU node pools (`g2-standard-48` on private GKE with AMD SEV-SNP Confidential VMs) and `0.0.0.0/0` internet egress disabled.
> - **Disqualifier 4 — Non-Transactional Legacy Connection Pooling (`PgBouncer Session Mode`):** If downstream data services use session-mode pooling without `DISCARD ALL` or prepared-statement reset hooks, `SET LOCAL app.current_tenant_id` guarantees are violated; Pattern A is strictly disqualified until transaction-mode pooling (`hop5_data_rls_and_otel.py`) is enforced.""",

    "WS3": """## When NOT to Use Pattern B Dedicated Sovereign Silos (Architectural Disqualifiers)

> [!WARNING]
> **Pattern B Disqualifiers — Do NOT Provision Dedicated Single-Tenant Silos When:**
> - **Disqualifier 1 — High-Velocity Commercial Onboarding (`> 250` Tenants or `< 60s` Self-Serve Signup):** Provisioning a dedicated GCP project, VPC-SC perimeter, Cloud KMS key ring, dedicated AlloyDB cluster, and private GKE node pool takes `12–18 minutes` via Terraform and hits Google Cloud organization quotas (`100` standard VPC-SC perimeters per organization without folder-level shared-perimeter grouping; project creation rate limits of `~30/hour`).
> - **Disqualifier 2 — Unit-Cost Sensitivity Below `USD 8,400/Month` Recurring Tenant ARR:** Because Pattern B eliminates cross-tenant compute pooling and requires dedicated AlloyDB primary/read-pool nodes plus dedicated Vertex AI Provisioned Throughput (`PT`) or private GKE `g2-standard-48` GPUs, idle infrastructure floor costs make Pattern B economically unviable for mid-market or freemium tiers.
> - **Disqualifier 3 — Seamless Mid-Lifecycle Promotion from Commercial Trial to Enterprise:** If tenants start on a self-serve commercial tier and later upgrade to sovereign isolation without changing ingress URLs, DNS records, or OAuth redirect URIs, standalone Pattern B silos require a disruptive endpoint cutover—use **Pattern C (Dynamic Hybrid Hub-and-Spoke over Private Service Connect)** instead.""",

    "WS4": """## When NOT to Use Pattern C Dynamic Hybrid Hub-and-Spoke (Architectural Disqualifiers)

> [!WARNING]
> **Pattern C Disqualifiers — Do NOT Use Shared-Hub Dynamic PSC Routing When:**
> - **Disqualifier 1 — Zero-Shared-Ingress Sovereign Mandate (Air-Gapped Defense / Classified Workloads):** Even though Pattern C routes regulated tenant execution and storage into a dedicated PSC spoke project, **Hop 1 (Cloud Armor + IAP + STS JWT Mint)** and **Hop 2 (Discovery Engine ARD Catalog + Firestore Routing Table)** remain in the shared multi-tenant Ingress Hub (`cymbal-control-plane`). Customers whose regulators forbid *any* shared control-plane ingress must use **Pattern B (Full Sovereign Silo with Dedicated Ingress Load Balancer)**.
> - **Disqualifier 2 — Bidirectional Spoke-to-Hub Initiation Requirements:** Private Service Connect (`PSC`) `ServiceAttachment` endpoints enforce **unidirectional NAT** (`Hub Consumer -> Spoke Producer`). If a workload inside the spoke VPC must initiate unsolicited inbound TCP connections back into the shared hub VPC, PSC NAT blocks the reverse initiation by design.
> - **Disqualifier 3 — Spoke Fleet Exceeding `1,000` PSC Endpoints per Hub VPC Without Sharded HubVPCs:** Google Cloud enforces hard limits on PSC forwarding rules per VPC network (`1,024` default ceiling) and consumer accept-list entries per `ServiceAttachment` (`1,000` projects). Beyond `800` enterprise spokes, you must shard ingress across regional Hub VPCs.""",

    "WS5": """## When NOT to Use Each Topology in the Agentic Triad (Executive Disqualifier Matrix)

> [!WARNING]
> **Executive Topology Disqualifiers — Avoid the 3 Classic Enterprise Multi-Tenancy Anti-Patterns:**
> - **Never Use Pattern A (Pooled)** when a customer contract mandates customer-revocable Cloud KMS CMEK/EKM keys, VPC Service Controls (`VPC-SC`) hardware perimeters, or air-gapped open-weight models (`Gemma 3 27B` on private GKE).
> - **Never Use Pattern B (Full Sovereign Silo)** for `> 100` commercial/mid-market tenants or self-serve PLG onboarding: Terraform control-plane state locking, VPC-SC per-organization perimeter quotas (`100` default limit), and dedicated AlloyDB/GPU idle floors (`USD 8,400+/mo/silo`) will stall platform velocity.
> - **Never Use Pattern C (Dynamic Hybrid PSC)** when a defense or sovereign banking regulator prohibits a shared Layer-7 Ingress & Identity Hub (`Hop 1`–`Hop 2`), even when compute and data (`Hop 3`–`Hop 5`) reside in an isolated PSC spoke project.""",
}


HARD_QUOTAS_AND_EDGE_CASES_BY_WS: Dict[str, str] = {
    "WS1": """## Hard Google Cloud Quotas, Control-Plane Scaling Limits & Asynchronous Edge Cases

Production deployments of the 5-Hop Cryptographic Context Chain at `1,000+` tenant scale encounter four hard cloud platform boundaries and distributed systems failure modes that must be engineered around explicitly:

### 1. Hard Google Cloud Platform Quotas & Control-Plane Ceilings

| Platform Subsystem & Hop | Hard Google Cloud Quota / Limit | Failure Mode at Scale | Mandatory Production Engineering Mitigation |
| :--- | :--- | :--- | :--- |
| **Hop 1: Cloud KMS Asymmetric Signing (`ECDSA P-256`)** | Regional HSM crypto-operations quota (`~10,000 ops/sec` software, `~1,500–2,500 ops/sec` Cloud HSM per region) | Signing or verifying STS JWTs via remote KMS RPCs on every microservice hop exhausts KMS quota at `> 500 RPS`. | Mint the STS JWT **once at Hop 1**, and verify downstream at Hops 2–5 in **`< 0.15 ms`** using an in-memory cached JWKS public key (`60-min` TTL, `0` per-hop KMS RPCs). |
| **Hop 3: Vertex AI `ContextCacheConfig` Prefix Floor** | **Minimum `32,768` tokens** per cached content object; TTL expiry causes simultaneous cache-miss re-tokenization | Sub-`32,768` token prefixes fail cache creation (`INVALID_ARGUMENT`); simultaneous 1-hour TTL expiry triggers `10x` input-token billing spikes. | Pad/consolidate immutable system instructions + OpenAPI tool schemas above **`32,768` tokens** (`cymbal-shared-incident-system-prompt-v2`) and rotate cache handles asynchronously at **`t = 55 min`** (`5-min` overlap window). |
| **Hop 3/4: `locations/global` vs. Regional CMEK Residency** | Vertex AI `locations/global` dynamic routing does **not** support single-region customer-managed encryption keys (`CMEK`) | Regulated tenants requiring `us-central1` CMEK data residency fail validation if routed to `locations/global`. | Route **Pattern A** commercial tenants via `locations/global` for maximum throughput, while pinning **Pattern B & C** CMEK-bound tenants strictly to regional endpoints (`us-central1` / `us-west1`). |
| **Hop 5: AlloyDB PgBouncer Connection Pool Modes** | `SET LOCAL app.current_tenant_id` is transaction-scoped (`COMMIT`/`ROLLBACK`); session-mode pooling retains state | Reusing a session-pooled connection without resetting GUC variables leaks the prior tenant's RLS context (`Cross-Tenant Bleed`). | Enforce **PgBouncer `pool_mode = transaction`**, wrap every checkout in an explicit `BEGIN ... COMMIT` block, and execute `DISCARD ALL` on connection return. |

### 2. Non-Rollbackable External 3rd-Party SaaS Side-Effects During Mid-Flight CMEK Revocation (`HTTP 423`) or Rate Bulkheads

Database transactions (`AlloyDB RLS`) roll back cleanly on error, but **multi-step agentic tool chains mutating external 3rd-party SaaS APIs (`ServiceNow`, `Jira`, `Workday`, `Salesforce`) cannot be rolled back by PostgreSQL `ROLLBACK`**.

- **Failure Scenario (Mid-Turn CMEK Kill-Switch):** Suppose an ADK agent servicing `finvault` executes Step 1 (`ServiceNow ITSM` change ticket `CHG0049218` created at $t = 140\\text{ ms}$) and Step 2 (AlloyDB audit row staged), and at $t = 310\\text{ ms}$ the customer's security operations center revokes their Cloud KMS CMEK key. Hop 3/4 immediately traps `FAILED_PRECONDITION`, purges Valkey (`SCAN + UNLINK cache:finvault:*` in `< 5\\text{ s}`), rolls back the local AlloyDB transaction, and returns **`HTTP 423 Locked`** before Step 3 (`Jira Cloud` escalation comment) executes. Without compensation, `CHG0049218` remains orphaned in ServiceNow, and retrying the turn after key restoration creates a duplicate change ticket.
- **Production Mitigation — Deterministic `X-Idempotency-Key` & Compensating Outbox Saga Ledger:**
  1. Every outbound MCP tool invocation attaches a deterministic idempotency token derived from the signed `TenantContext`:
     $$\\text{IdempotencyKey} = \\text{SHA256}(\\texttt{tenant\\_id} \\,\\|\\, \\texttt{session\\_id} \\,\\|\\, \\texttt{turn\\_id} \\,\\|\\, \\texttt{tool\\_name} \\,\\|\\, \\texttt{canonical\\_args\\_hash})$$
  2. Before dispatching any external `POST`/`PATCH` tool call over AWS Bedrock AgentCore MCP, Hop 5 writes a `PENDING_EXTERNAL_MUTATION` intent record to the append-only **Outbox Saga Ledger** (`cymbal_agentic_finops_otel.external_tool_saga_ledger`).
  3. If `HTTP 423 Locked`, `HTTP 429`, or `ATOMIC_CUTOVER` aborts the turn mid-flight, the reconciliation worker marks the saga entry `COMPENSATION_REQUIRED` and dispatches either a compensating reversal (`close_orphaned_change_ticket`) or resumes idempotently using the identical `X-Idempotency-Key` once the tenant key is re-enabled.""",

    "WS2": """## Hard Google Cloud Quotas, Control-Plane Scaling Limits & Asynchronous Edge Cases (Pattern A Pooled)

When operating **Pattern A (High-Density Pooled Architecture)** across `950+` commercial tenants in a single shared GCP project (`cymbal-pooled-prod`), platform engineers must design around four concrete cloud limits and edge cases:

### 1. Pattern A Pooled Quotas & Shared-Runtime Bottlenecks

| Pooled Resource / Hop | Hard Google Cloud / Engine Limit | Edge-Case Failure Mode | Mandatory Pattern A Engineering Control |
| :--- | :--- | :--- | :--- |
| **Vertex AI `ContextCacheConfig` (`Hop 3`)** | **Minimum `32,768` tokens**; cache handle TTL expiry (`3,600s` default) | If the shared cache expires at `:00` across `950` active tenants simultaneously, `100%` of concurrent turns pay full uncached input rates (`10x` cost spike) and hit TPM quotas. | Enforce a **staggered dual-handle blue/green cache warmer** that mints `cache_handle_v(N+1)` at **`t = 55 min`** and atomically swaps the pointer in Memorystore for Valkey with zero uncached gap. |
| **Cloud Run Gen2 Shared Worker Pool (`Hop 3`)** | Max `1,000` instances per service default quota; `80–250` concurrent requests/instance; `/tmp` shares in-memory tmpfs | A runaway tenant streaming large MCP JSON payloads can exhaust container memory (`OOMKilled`), crashing co-located turns from peer tenants on the same container instance. | Set **`--concurrency=16`** (or `--concurrency=1` for untrusted code-execution tools), cap response buffers at `4 MB` in Hop 4, and bind ephemeral scratch paths to `/tmp/{tenant_id}/{turn_uuid}` with post-turn `shutil.rmtree()`. |
| **AlloyDB Pooled RLS & `PgBouncer` (`Hop 5`)** | Max connections per AlloyDB instance (`1,000–4,000`); `SET LOCAL` only lasts until transaction end | Using PgBouncer in `session` mode or executing autocommit queries outside a `BEGIN ... COMMIT` block causes `app.current_tenant_id` to reset or bleed across pooled checkouts. | Mandate **`pool_mode = transaction`**, reject any SQL execution where `current_setting('app.current_tenant_id', true)` is empty (`FORCE ROW LEVEL SECURITY`), and run `DISCARD ALL` on checkin. |
| **Memorystore for Valkey Key Eviction (`Hop 3`)** | Single-threaded Lua script execution budget (`< 5 ms`); blocking `KEYS *` or `FLUSHALL` freezes all `950` tenants | Executing `KEYS cache:tenant_a:*` or `FLUSHALL` during tenant offboarding blocks the Valkey event loop for `200–800 ms`, tripping Hop 3 circuit breakers platform-wide. | Use non-blocking cursor iteration **`SCAN 0 MATCH cache:{tenant_id}:* COUNT 500`** paired with asynchronous **`UNLINK`** (`O(1)` main-thread deallocation in `< 5 s`). |

### 2. Mid-Flight External 3LO Tool Failure & Idempotent Outbox Saga Reconciliation

In Pattern A, when a tenant hits their **`120 RPM` Valkey token-bucket ceiling (`HTTP 429`)** or triggers a **Hop 4 post-inference Cloud SDP block** *after* an external 3LO tool (`ServiceNow`, `Jira`, `ClickHouse`) has already executed Step 1 of a multi-tool chain, PostgreSQL `ROLLBACK` only reverts local AlloyDB rows. To prevent duplicate tickets on client retry (`Retry-After`), `core-cymbal-agent/governance/hop5_data_rls_and_otel.py` binds every external MCP mutation to a deterministic **`X-Idempotency-Key: SHA256(tenant_id:session_id:turn_id:tool_call_index)`** recorded in the tenant-scoped outbox table before external network dispatch.""",

    "WS3": """## Hard Google Cloud Quotas, Control-Plane Scaling Limits & Asynchronous Edge Cases (Pattern B Sovereign Silos)

While **Pattern B (Dedicated Sovereign Silos)** eliminates cross-tenant runtime sharing, scaling dedicated single-tenant GCP projects (`cymbal-{tenant}-silo-prod`) introduces severe **Google Cloud control-plane quota ceilings and asynchronous propagation windows** that architects must address before onboarding regulated cohorts:

### 1. Hard Google Cloud Organization Quotas & Control-Plane Limits for Silos

| Control-Plane Dimension | Hard Google Cloud Platform Quota / SLA | What Breaks When Scaling Silos (`N > 50`) | Production Architectural Solution in `workstream-3/` |
| :--- | :--- | :--- | :--- |
| **VPC Service Controls (`VPC-SC`) Perimeters** | **`100` Service Perimeters per GCP Organization** (default hard quota; up to `10,000` protected projects total) | Assigning `1` dedicated VPC-SC perimeter per tenant fails hard at **Tenant #101** (`QUOTA_EXCEEDED`). | Group sovereign silo projects under **Regulated Folder Shards** (`folders/banking-silos-us`), enforce **1 Folder-Scoped IAM Principal Access Boundary (PAB)** per tenant, and use **Shared VPC-SC Perimeters with per-project Ingress/Egress Rules** once $N > 80$. |
| **IAM & VPC-SC Propagation vs. CMEK Kill-Switch** | IAM policy bindings & VPC-SC perimeter updates take **`up to 60 seconds`** (`eventual consistency`); KMS key disable takes **`up to 60s–180s`** to propagate to passive storage mounts | During an active breach, waiting `60–180 seconds` for passive IAM/KMS cache expiration allows dozens of in-flight agent turns to exfiltrate cached L1 memory. | Pair passive Cloud KMS CMEK disablement with an **active Cloud Pub/Sub KMS Audit Log interceptor** at Hop 3/4 that executes **`SCAN + UNLINK cache:{tenant}:*`** in Valkey and trips the **`HTTP 423 Locked`** circuit breaker in **`< 3–5 seconds`**. |
| **Project Creation & Terraform State Contention** | GCP project creation rate limit (`~30 projects/hour` per billing account); monolithic Terraform `.tfstate` lock contention | Running `terraform apply` across `50` silos in a single state file causes `15-minute` plan locks and blast-radius risk across all silos. | Partition Terraform state into **1 isolatedGCS backend state per silo** (`gs://cymbal-tf-state-prod/silos/{tenant_id}/default.tfstate`) orchestrated via pre-warmed project pool buffers. |
| **Private GKE `Gemma 3 27B` GPU Node Cold Starts** | `g2-standard-48` (`4x NVIDIA L4`) node provisioning + `54 GB` container image pull takes **`4–7 minutes`** on cold scale-up | Autoscale-from-zero inside an air-gapped VPC (`0.0.0.0/0` blocked) times out synchronous agent turns (`HTTP 504`). | Maintain a **`min_node_count = 1` Confidential VM warm pool** per active silo and mirror Gemma 3 weights into a **VPC-SC-protected Artifact Registry + Secondary Boot Disk image** (`< 35s` pod readiness). |

### 2. Mid-Flight CMEK Revocation (`HTTP 423 Locked`) During Multi-Step Regulated SaaS Workflows

In regulated pharma (`Veeva Vault RIM` / `NocoDB 21 CFR Part 11`) and banking (`HashiCorp Vault` / `ServiceNow`) workflows, a customer key custodian may revoke their Cloud KMS / EKM key mid-turn while an ADK agent is executing a multi-step compliance attestation. Because external SaaS mutations committed at $t < t_{\\text{revoke}}$ cannot be cryptographically shredded inside the third-party vendor's cloud, Hop 4/5 enforces a **Two-Phase Cryptographic Commit Envelope**: external SaaS write payloads carry only **tokenized surrogate references (`[TOKEN-FV-99412]`)**, while the reversible PII mapping table resides exclusively inside the customer's CMEK-encrypted AlloyDB silo. The instant the CMEK key is revoked (`HTTP 423`), the external SaaS record becomes permanently non-attributable ciphertext without requiring external API rollback.""",

    "WS4": """## Hard Google Cloud Quotas, Control-Plane Scaling Limits & Asynchronous Edge Cases (Pattern C Dynamic Hybrid)

**Pattern C (Dynamic Hybrid Hub-and-Spoke over Private Service Connect)** gives enterprises a zero-downtime upgrade path from the shared pool to a dedicated spoke project, but introduces specific **Google Cloud networking quotas and distributed dual-write edge cases**:

### 1. Private Service Connect (PSC) & Hybrid Networking Quotas

| Networking / Migration Resource | Hard Google Cloud Platform Quota | Failure Mode at Scale or Cutover | Mandatory Pattern C Engineering Mitigation |
| :--- | :--- | :--- | :--- |
| **PSC `ServiceAttachment` Consumer Accept-Lists** | **`1,000` consumer projects** per `ServiceAttachment`; **`1,024` PSC forwarding rules** per consumer VPC network | A single shared Hub VPC (`cymbal-control-plane`) cannot terminate more than `1,024` dedicated tenant PSC endpoints (`QUOTA_EXCEEDED`). | Shard enterprise spoke connectivity across **Regional Hub VPCs (`us-central1`, `us-west1`, `eu-west1`)** or multiplex spokes via **Cloud Service Mesh / Internal Application Load Balancer (`ILB`) PSC Backends**. |
| **Cloud NAT Ephemeral Port Exhaustion (`SSE / MCP`)** | **`64,512` ephemeral source ports** per Cloud NAT IP address; long-lived SSE/MCP streams hold ports open for `30–120s` | High-concurrency agent turns streaming tokens over PSC NAT exhaust ephemeral ports, causing intermittent `SYN` drops (`HTTP 503`). | Enable **Dynamic Port Allocation (`minPortsPerVm = 1024`, `maxPortsPerVm = 32768`)** with multiple regional NAT IPs and pool persistent gRPC/HTTP2 connections across turns. |
| **Unidirectional PSC NAT Initiation Rule** | PSC endpoints only permit **`Consumer (Hub) -> Producer (Spoke)`** packet initiation | Spoke workers attempting to open new TCP connections back to Hub Valkey or Firestore over the same PSC endpoint fail with `CONNECTION_TIMED_OUT`. | Push routing/revocation deltas from Hub to Spoke over **Hub-initiated gRPC streaming channels** or **Cloud Pub/Sub push subscriptions** authenticated via SPIFFE mTLS. |
| **Long-Running Agent Turns During `ATOMIC_CUTOVER`** | Agentic reasoning + tool loops can run for **`15–90 seconds`**, spanning across the `< 50 ms` Firestore pointer flip | If `Phase 2 (ATOMIC_CUTOVER)` severes the pooled AlloyDB connection while a pre-cutover turn is still on Step 3 of 4, the turn crashes mid-flight. | Pin each turn's target topology **`execution_tier_snapshot`** inside the signed `TenantContext` JWT at **Hop 1**, and keep the pooled path in **read/drain compatibility for `120 seconds`** (`Phase 3: DRAIN_AND_VERIFY`) until `inflight_pooled_turns == 0`. |

### 2. Dual-Write Idempotency & Preventing Duplicate 3rd-Party SaaS Calls During `SHADOW_SYNC`

A critical pitfall in `Phase 1 (SHADOW_SYNC)` is accidentally replaying **external state-mutating MCP tool calls** (`ServiceNow`, `Grafana`, `Gitea`) against both the Shared Pool and the Enterprise PSC Spoke—which would create duplicate change tickets or double-charge financial ledgers! In `core-cymbal-agent/`, **`SHADOW_SYNC` replicates ONLY internal state stores** (`AlloyDB` WAL stream + `Memorystore for Valkey` session/memory keys + `Vertex AI Memory Bank` vectors). External 3LO MCP tool calls execute **strictly once** through the primary active tier (`Pool` during Phase 1; `PSC Spoke` after the Phase 2 atomic pointer flip), guarded by `X-Idempotency-Key` deduplication.""",

    "WS5": """## Hard Google Cloud Quotas, Crossover Thresholds & Multi-Cloud Federation Edge Cases (Agentic Triad)

At the portfolio level (**WS5 Capstone**), principal architects governing a hybrid fleet across **Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid PSC)** must enforce three quantitative operational boundaries:

### 1. Portfolio-Wide Control-Plane Quotas & Cross-Cloud Federation Limits

| Portfolio Governance Layer | Hard Platform Limit / Latency Ceiling | Architectural Failure Mode | Mandatory Portfolio Control (`WS5`) |
| :--- | :--- | :--- | :--- |
| **Cross-Cloud OIDC -> AWS Cognito / STS Exchange** | **`~18–35 ms` cross-cloud TLS + JWT exchange** (`GCP us-central1 <-> AWS us-east-1`); Cognito token endpoint rate limits (`120 RPS` default) | Minting a new AWS Cognito RS256 OAuth token on every MCP tool call adds `35 ms` per tool and hits AWS `TooManyRequestsException` under burst load. | Cache tenant-scoped, DPoP-bound AWS AgentCore bearer tokens in **Memorystore for Valkey (`TTL = 50 min`)** keyed by `{tenant_id}:{target_id}:{dpop_jkt}`, reducing cross-cloud auth overhead to **`< 1.5 ms`**. |
| **Triad Crossover Threshold ($N_{\\text{silo}} > 80$)** | **`100` VPC-SC perimeters/org** + Terraform state lock contention + `USD 8,400/mo` minimum silo floor | Allowing sales teams to sell standalone Pattern B silos to mid-market customers exhausts org-level VPC-SC quotas and balloons baseline cloud COGS. | Enforce the **Two-Question Executive Gate**: require **Pattern C (PSC Spoke)** for tenants needing dedicated data/CMEK without dedicated L7 ingress, and reserve **Pattern B** strictly for `Tier-0` sovereign contracts (`ARR >= USD 250k/yr`). |
| **Cross-Tier Schema & Prompt Drift (`80/20` Rule)** | Divergent ADK agent codebases across Pooled vs. Siloed environments cause security regression drift | Patching a Hop 4 Model Armor bypass in Pattern A while forgetting to update 40 standalone Pattern B silos leaves regulated tenants vulnerable. | Enforce the **Immutable 80% Core Package (`core-cymbal-agent`)**: all 3 patterns deploy the **exact same container digest (`sha256:...`)**, parameterized solely by environment-injected `TENant_ISOLATION_MODE=POOLED|SILO|HYBRID_PSC`. |

### 2. End-to-End Compensating Outbox Saga Across the Agentic Triad

Whether a tenant runs in **Pattern A**, **Pattern B**, or **Pattern C**, any mid-turn failure (`HTTP 400` Model Armor block on tool output, `HTTP 423` CMEK revocation, `HTTP 429` token-bucket exhaustion, or `Phase 2` tier cutover) during a multi-tool chain reconciles deterministically via the **Triad Outbox Saga Ledger** (`cymbal_agentic_finops_otel.external_tool_saga_ledger`) using `X-Idempotency-Key` binding so zero orphaned mutations remain in external SaaS systems.""",
}


def extract_saas_blocks(raw_md: str) -> Tuple[str, Dict[str, str], str]:
    """Splits a blog markdown at GENUINE_3P_BEFORE_AFTER_START..(END or next H2) and extracts individual SAAS-XX blocks."""
    m = re.search(
        r"(<!-- GENUINE_3P_BEFORE_AFTER_START -->)(.*?)(?:(<!-- GENUINE_3P_BEFORE_AFTER_END -->)|(?=\n## (?:What's next|Frequently asked questions)))",
        raw_md,
        flags=re.DOTALL,
    )
    if not m:
        return raw_md, {}, ""

    before_part = raw_md[: m.start()]
    inner = m.group(2)
    after_part = raw_md[m.end() :]

    saas_blocks: Dict[str, str] = {}
    parts = re.split(r"(?=\n### SAAS-\d+:)", inner)
    for part in parts:
        sm = re.match(r"^\s*### (SAAS-\d+):", part)
        if sm:
            saas_blocks[sm.group(1)] = part.strip()
    return before_part, saas_blocks, after_part


def relocate_terraform_figure_to_bottom(body: str, ws_key: str) -> str:
    """Moves the Terraform resource graph diagram section out of the mid-article narrative into What's next -> Terraform."""
    tf_patterns = {
        "WS2": r"\n### 1-click Terraform starter resource dependency graph \(Figure 4\)\n.*?(?=\n## Products used\b)",
        "WS3": r"\n### Parameterized Terraform silo blueprint resource graph \(Figure 3\)\n.*?(?=\n#### Level 3:|\n## Products used\b)",
        "WS4": r"\n### Dual-provider Terraform hybrid PSC resource graph \(Figure 4\)\n.*?(?=\n#### Level 3:|\n## Products used\b)",
    }
    pat = tf_patterns.get(ws_key)
    if not pat:
        return body

    m = re.search(pat, body, flags=re.DOTALL)
    if not m:
        return body

    tf_section = m.group(0).strip()
    body_without_tf = body[: m.start()] + "\n" + body[m.end() :]

    # Insert right after ### 1. Production Terraform Kit & Hands-On Codelab (or before ## What's next end)
    anchor_pat = r"(### 1\. Production Terraform Kit[^\n]*\n(?:.*?\n)*?)(?=\n### 2\.)"
    am = re.search(anchor_pat, body_without_tf, flags=re.DOTALL)
    if am:
        insert_pos = am.end()
        body_without_tf = (
            body_without_tf[:insert_pos]
            + "\n"
            + tf_section
            + "\n\n"
            + body_without_tf[insert_pos:]
        )
    return body_without_tf


def build_v2_24slide_launch_matrix(
    ws_key: str,
    new_slides_id: str,
    atlas_doc_id: str,
    atlas_slides_id: str,
) -> str:
    """Generates the updated 24-Slide 5-Act Launch Matrix table pointing to the brand-new 24-Slide Google Slides deck."""
    slides_url = f"https://docs.google.com/presentation/d/{new_slides_id}/edit"
    atlas_doc_url = f"https://docs.google.com/document/d/{atlas_doc_id}/edit"
    atlas_slides_url = f"https://docs.google.com/presentation/d/{atlas_slides_id}/edit"

    sig_desc = {
        "WS1": "`SAAS-01` Metabase BI RLS (`Slide 19`) & `SAAS-06` Trino Distributed SQL Catalog Scoping (`Slide 20`)",
        "WS2": "`SAAS-07` ClickHouse Columnar RLS (`Slide 19`) & `SAAS-03` Redmine ITSM 3LO DPoP (`Slide 20`)",
        "WS3": "`SAAS-10` HashiCorp Vault `<60s` CMEK Kill-Switch (`Slide 19`) & `SAAS-04` NocoDB GxP `21 CFR Part 11` (`Slide 20`)",
        "WS4": "`SAAS-02` Grafana Enterprise Workbook Promotion (`Slide 19`) & `SAAS-05` Gitea SRE Egress DLP (`Slide 20`)",
        "WS5": "`SAAS-09` Datalust Seq Model Armor Log Shield (`Slide 19`) & `SAAS-08` Directus HCM Principal 3LO (`Slide 20`)",
    }[ws_key]

    return f"""### Companion 24-Slide Streamlined Visual Deck, Standalone 10-SaaS Visual Atlas & Slide-to-Code Launch Matrix

> [!IMPORTANT]
> **Streamlined v2 Edition Architecture (`24` Slides + Dedicated `10-SaaS` Visual Atlas):** This v2 edition right-sizes the executive presentation to **24 high-impact slides** (replacing the 10-slide SaaS screenshot loop with the **2 signature Before/After proofs** for **{ws_key}** plus an expanded **Hard GCP Quotas, Async Saga & Disqualifiers** slide) and pairs it with the dedicated **[10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (Google Docs)]({atlas_doc_url})** and **[16-Slide 10-SaaS Visual Verification Atlas Deck (Google Slides)]({atlas_slides_url})**.

| 5-Act Presentation Arc | Slide Range & Direct Launch Links | Core Architectural Content & C4 Abstraction | Companion Codebase & Verification Assets |
| :--- | :--- | :--- | :--- |
| **Act I: Executive Storyline, Threat Surface & Disqualifiers** | **[Slides 1–4]({slides_url}#slide=id.p1)** | Title Cover (`Slide 1`), 5-Act Executive Roadmap (`Slide 2`), Core Multi-Tenancy Dilemma (`Slide 3`), and Adversarial Threat / Compliance Matrix (`Slide 4`). | [`core-cymbal-agent/runtime_pipeline.py`](../core-cymbal-agent/runtime_pipeline.py) |
| **Act II: C4 L1–L2 Topologies & `#78` Architecture Blueprints** | **[Slides 5–9]({slides_url}#slide=id.p5)** | Act II Breaker (`Slide 5`), `L1` Logical Security Layers (`Slide 6`), and Decompiled `L2` Physical `#78` Architecture Blueprints (`Slides 7–9`). | [`diagrams/`](../diagrams/) (`100%` Native DrawingML) |
| **Act III: 5-Hop Control Plane, Hard GCP Quotas & Disqualifiers** | **[Slides 10–17]({slides_url}#slide=id.p12)** | Act III Breaker (`Slide 10`), `L3` UML Sequence (`Slide 11`), `L4` Wire JWT Normalization (`Slide 12`), Hops 1–5 Deep Dives (`Slides 13–16`), and **Hard GCP Quotas, Async 3P Saga & Disqualifiers (`Slide 17`)**. | [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) |
| **Act IV: Signature 3rd-Party SaaS Before/After Retina Proofs** | **[Slides 18–20]({slides_url}#slide=id.p20)** | Act IV Breaker (`Slide 18`) + **2 Signature `2880×1800` Retina Proofs**: {sig_desc}. *(All 10 SaaS proofs in the [16-Slide Companion Visual Atlas]({atlas_slides_url}))*. | [`scripts/verify_5_third_party_saas_products.py`](../scripts/verify_5_third_party_saas_products.py) |
| **Act V: 10-Week Rollout Roadmap, 30/30 Scorecard & CISO FAQ** | **[Slides 21–24]({slides_url}#slide=id.p31)** | Act V Breaker, 10-Week Phased Enterprise Implementation Roadmap, Quantified Multi-Cloud `30/30` Isolation Scorecard, and Executive CISO FAQ Decision Guide. | [`scripts/run_all_repeatable_e2e_verifications.py`](../scripts/run_all_repeatable_e2e_verifications.py) |"""


def generate_atlas_markdown(
    ws1_raw_md: str,
    atlas_slides_id: str,
    v2_doc_ids: Dict[str, str],
) -> str:
    """Generates the standalone 10-SaaS Multi-Cloud Visual Verification & Red-Team Atlas Markdown."""
    _, raw_body = parse_frontmatter(ws1_raw_md)
    _, saas_blocks, _ = extract_saas_blocks(raw_body)

    # Extract the 10-SaaS table section from WS1
    m_table = re.search(
        r"(## Live Multi-Cloud \(Google Cloud \+ AWS Bedrock AgentCore MCP\) 10-SaaS Verification Matrix.*?)(?=<!-- GENUINE_3P_BEFORE_AFTER_START -->)",
        raw_body,
        flags=re.DOTALL,
    )
    saas_table_md = m_table.group(1).strip() if m_table else ""

    atlas_slides_url = f"https://docs.google.com/presentation/d/{atlas_slides_id}/edit"

    ordered_saas = [f"SAAS-{i:02d}" for i in range(1, 11)]
    workstream_mapping = {
        "SAAS-01": ("WS1 (5-Hop Baseline)", "Metabase BI v0.50.26", "HXGGFMZBKE", "p21", 5),
        "SAAS-02": ("WS4 (Pattern C Dynamic Hybrid)", "Grafana Enterprise v11.2.0", "IZVODT083Q", "p23", 7),
        "SAAS-03": ("WS2 (Pattern A Pooled)", "Redmine ITSM v5.1.3", "ZS9VGYHBQL", "p27", 11),
        "SAAS-04": ("WS3 (Pattern B Sovereign Silos)", "NocoDB GxP v0.255.2", "TWQU0KSRVF", "p28", 12),
        "SAAS-05": ("WS4 (Pattern C Dynamic Hybrid)", "Gitea SRE v1.22.3", "K5JAEFCQ6E", "p29", 13),
        "SAAS-06": ("WS1 (5-Hop Baseline)", "Trino Distributed SQL v440", "TERCK8SLBP", "p22", 6),
        "SAAS-07": ("WS2 (Pattern A Pooled)", "ClickHouse Data Warehouse v24.8", "CCMDEVZV2S", "p26", 10),
        "SAAS-08": ("WS5 (Agentic Triad Capstone)", "Directus Data Studio v11.1.0", "RAOTMUMJTZ", "p30", 14),
        "SAAS-09": ("WS5 (Agentic Triad Capstone)", "Datalust Seq Observability v2024.3", "G767QR3TQZ", "p24", 8),
        "SAAS-10": ("WS3 (Pattern B Sovereign Silos)", "HashiCorp Vault CMEK v1.13.3", "C7EYM614F2", "p25", 9),
    }

    gallery_sections: List[str] = []
    for sid in ordered_saas:
        block = saas_blocks.get(sid, "")
        if not block:
            continue
        # Fix relative paths because v2-edition is under blogs/v2-edition/ (2 levels deep from ROOT_DIR)
        block = block.replace("](../screenshots/", "](../../screenshots/").replace("](../docs/", "](../../docs/")
        ws_owner, stack_name, target_id, page_id, atlas_slide_num = workstream_mapping[sid]
        header_inject = (
            f"\n> **Primary Signature Workstream:** `{ws_owner}` • **Upstream Stack:** `{stack_name}` • "
            f"**AWS AgentCore Target:** `{target_id}` (`READY`) • "
            f"**Companion Atlas Slide:** [Slide {atlas_slide_num} / 16 (`#{page_id}`)]({atlas_slides_url}#slide=id.{page_id})\n"
        )
        lines = block.splitlines()
        out_block = "\n".join([lines[0], header_inject, *lines[1:]])
        gallery_sections.append(out_block)

    saas_table_md = (
        saas_table_md.replace("](../screenshots/", "](../../screenshots/")
        .replace("](../docs/", "](../../docs/")
        .replace("](../scripts/", "](../../scripts/")
        .replace("](../data/", "](../../data/")
    )

    frontmatter = """---
title: "GEAP 10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (30/30 Flows)"
subtitle: "Dedicated visual evidence compendium unifying all 20 genuine 2880x1800 Retina Before/After 3rd-Party SaaS UI captures, 30/30 AWS Bedrock AgentCore MCP flows, and S3 cryptographic audit ledgers."
target_audience: "CISOs, Principal Cloud Architects, Security Auditors, and AI Platform Engineers"
reading_time: "18 min read"
---
"""

    intro = f"""# GEAP 10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (30/30 Flows)

> [!IMPORTANT]
> **Why This Dedicated Visual Verification Atlas Exists:** To keep the 5 core architectural whitepapers (**WS1–WS5 Streamlined v2 Edition**) focused on deep systems engineering, hard Google Cloud platform quotas, mathematical FinOps/latency proofs, and code walkthroughs, each workstream blog embeds only its **2 signature Before/After SaaS proofs (`4` screenshots)**. This standalone **Visual Verification & Red-Team Atlas** houses the complete, unabridged **10-SaaS × 3-Pattern (`30/30` Flows) Multi-Cloud Verification Matrix** and all **20 genuine `2880×1800` Retina Before/After UI Proofs** (`SAAS-01` through `SAAS-10`) in one dedicated audit artifact.

## Executive Architecture & Multi-Cloud Verification Topology

![Figure 1 — End-to-end 5-Hop cryptographic governance baseline spanning Google Cloud Run Gen2 and AWS Bedrock AgentCore MCP](../../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png)

*Figure 1. Official Google Cloud Architecture Center (`#78`) 5-Hop Cryptographic Context Chain governing all 10 third-party SaaS targets across Google Cloud (`ramp-portal-dev` `#248990048888`, `bbar-138hf0` `#48439189383`) and AWS Bedrock AgentCore MCP Gateway (`cymbal-a2a-mcp-gateway-suyxm3caof`, AWS Account `393036065405`, `us-east-1`).*

### Signature Workstream-to-SaaS Allocation Map (`WS1`–`WS5` v2 Edition)

| Workstream v2 Whitepaper | Signature SaaS Pair Embedded Inline (`4` Retina Captures) | Primary Governance Invariant Verified | Companion 16-Slide Atlas Deep Links |
| :--- | :--- | :--- | :--- |
| **WS1 v2 — 5-Hop Baseline & Taxonomy** | **`SAAS-01` Metabase BI** (`HXGGFMZBKE`) & **`SAAS-06` Trino SQL** (`TERCK8SLBP`) | Hop 5 AlloyDB/BigQuery RLS (`0` cross-tenant rows) & Hop 2 ARD Catalog Scoping | [Slide 5 (`#p21`)]({atlas_slides_url}#slide=id.p21) • [Slide 6 (`#p22`)]({atlas_slides_url}#slide=id.p22) |
| **WS2 v2 — Pattern A Pooled Runtime** | **`SAAS-03` Redmine ITSM** (`ZS9VGYHBQL`) & **`SAAS-07` ClickHouse RLS** (`CCMDEVZV2S`) | Hop 5 DPoP-bound 3LO OAuth (`-32042` step-up) & Columnar SIMD Row Policy | [Slide 10 (`#p26`)]({atlas_slides_url}#slide=id.p26) • [Slide 11 (`#p27`)]({atlas_slides_url}#slide=id.p27) |
| **WS3 v2 — Pattern B Sovereign Silos** | **`SAAS-04` NocoDB GxP** (`TWQU0KSRVF`) & **`SAAS-10` HashiCorp Vault** (`C7EYM614F2`) | Cloud KMS `21 CFR Part 11` P-256 signing & `<5s` CMEK Kill-Switch (`HTTP 423 Locked`) | [Slide 9 (`#p25`)]({atlas_slides_url}#slide=id.p25) • [Slide 12 (`#p28`)]({atlas_slides_url}#slide=id.p28) |
| **WS4 v2 — Pattern C Dynamic Hybrid** | **`SAAS-02` Grafana Enterprise** (`IZVODT083Q`) & **`SAAS-05` Gitea SRE** (`K5JAEFCQ6E`) | Zero-downtime Pool $\\rightarrow$ PSC Spoke promotion & Hop 4 Cloud SDP IBAN/SWIFT masking | [Slide 7 (`#p23`)]({atlas_slides_url}#slide=id.p23) • [Slide 13 (`#p29`)]({atlas_slides_url}#slide=id.p29) |
| **WS5 v2 — Agentic Triad Decision Guide** | **`SAAS-08` Directus HCM** (`RAOTMUMJTZ`) & **`SAAS-09` Datalust Seq** (`G767QR3TQZ`) | Intra-tenant user-scoped 3LO (`alice` vs `bob`) & Hop 4 Model Armor log-injection shield | [Slide 8 (`#p24`)]({atlas_slides_url}#slide=id.p24) • [Slide 14 (`#p30`)]({atlas_slides_url}#slide=id.p30) |

{saas_table_md}

## Complete 10-SaaS Before-vs-After Retina UI Proof Gallery (`SAAS-01` – `SAAS-10` • 20 Captures)

> [!NOTE]
> **100% Authentic Live Container Captures (`Rule 57` & `Rule 60A–60C`):** Every `BEFORE` and `AFTER` screenshot below (`2880×1800` Retina) was captured against the live upstream Docker containers on Google Cloud Run Gen2 (`bbar-138hf0`) and AWS EC2 (`i-04924523ac41ff132`) and cryptographically attested in [`docs/genuine_3p_before_after_provenance_receipt.json`](../../docs/genuine_3p_before_after_provenance_receipt.json).

""" + "\n\n".join(gallery_sections) + f"""

## Companion 16-Slide Visual Verification Atlas Deck & Reproducible CLI Harness

- **Open the 16-Slide Native Editable Google Slides Atlas:** [GEAP 10-SaaS Multi-Cloud Before/After Visual Verification Atlas (`16 Slides`)]({atlas_slides_url})
- **Run the 30/30 Live Multi-Cloud Verification Suite:**
```bash
python3 -B scripts/verify_5_third_party_saas_products.py
python3 -B scripts/run_all_repeatable_e2e_verifications.py
```
"""
    return frontmatter + "\n" + intro.strip() + "\n"


def generate_streamlined_ws_markdown(
    spec: Dict[str, Any],
    new_slides_id: str,
    atlas_doc_id: str,
    atlas_slides_id: str,
) -> str:
    """Transforms a v1 workstream blog into its streamlined v2 edition."""
    ws_key = spec["key"]
    src_path = ROOT_DIR / spec["src_md_rel"]
    raw_md = src_path.read_text(encoding="utf-8")
    meta, raw_body = parse_frontmatter(raw_md)

    # 1. Relocate Terraform resource graph (Fig 4 in WS2/WS4, Fig 3 in WS3) to the Terraform section at the bottom
    body = relocate_terraform_figure_to_bottom(raw_body, ws_key)

    # 2. Inject 'When NOT to Use This Pattern (Architectural Disqualifiers)' right after Executive Summary section
    disq_md = DISQUALIFIERS_BY_WS[ws_key]
    m_exec_end = re.search(r"(\n## Core terminology[^\n]*\n)", body)
    if m_exec_end:
        body = body[: m_exec_end.start()] + "\n\n" + disq_md + "\n" + body[m_exec_end.start() :]

    # 3. Inject 'Hard Google Cloud Quotas, Control-Plane Scaling Limits & Asynchronous Edge Cases' before 10-SaaS Matrix or Before/After
    quotas_md = HARD_QUOTAS_AND_EDGE_CASES_BY_WS[ws_key]
    m_saas_anchor = re.search(
        r"(\n## Compensating controls|\n## Live Multi-Cloud|\n<!-- GENUINE_3P_BEFORE_AFTER_START -->)",
        body,
    )
    if m_saas_anchor:
        body = body[: m_saas_anchor.start()] + "\n\n" + quotas_md + "\n" + body[m_saas_anchor.start() :]

    # 4. Trim inline Before/After screenshots from 20 down to the 2 Signature SaaS pairs (4 screenshots) + link to Atlas
    before_ba, saas_blocks, after_ba = extract_saas_blocks(body)
    sig_ids = spec["signature_saas_ids"]
    atlas_doc_url = f"https://docs.google.com/document/d/{atlas_doc_id}/edit"
    atlas_slides_url = f"https://docs.google.com/presentation/d/{atlas_slides_id}/edit"
    atlas_portal_url = f"{PORTAL_BASE}/?doc=blogs/v2-edition/saas-10-visual-verification-and-redteam-atlas.md"

    selected_blocks = [saas_blocks[sid] for sid in sig_ids if sid in saas_blocks]
    streamlined_ba_section = (
        "<!-- GENUINE_3P_BEFORE_AFTER_START -->\n\n"
        f"## Signature 3rd-Party SaaS Before-vs-After UI Proofs for {ws_key} ({', '.join(sig_ids)} • 2880×1800 Retina)\n\n"
        "> [!IMPORTANT]\n"
        f"> **Streamlined 2-SaaS Visual Proof Edition (`4` Inline Captures + Standalone `10-SaaS` Atlas):** To keep this architectural guide focused, we embed the **2 signature Before/After UI proof pairs ({', '.join(sig_ids)})** most directly governed by **{ws_key}** below. For the complete 20-image gallery (`SAAS-01` through `SAAS-10`) across all 10 commercial stacks, open the dedicated **[10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (Google Docs)]({atlas_doc_url})**, the **[16-Slide 10-SaaS Visual Verification Atlas (Google Slides)]({atlas_slides_url})**, or the **[Interactive Web Atlas Reader]({atlas_portal_url})**.\n\n"
        + "\n\n".join(selected_blocks)
        + "\n\n<!-- GENUINE_3P_BEFORE_AFTER_END -->"
    )
    body = before_ba + streamlined_ba_section + after_ba

    # 5. Replace the 34-Slide Launch Matrix in ## What's next with the new 24-Slide Launch Matrix
    new_launch_matrix = build_v2_24slide_launch_matrix(
        ws_key=ws_key,
        new_slides_id=new_slides_id,
        atlas_doc_id=atlas_doc_id,
        atlas_slides_id=atlas_slides_id,
    )
    body = re.sub(
        r"### (?:Companion 34-Slide|5-Part Engineering Blog Series & 34-Slide).*?(?=\n### 1\.|\Z)",
        new_launch_matrix + "\n\n",
        body,
        flags=re.DOTALL,
    )

    # 6. Fix relative paths from `blogs/v2-edition/*.md` (`../` -> `../../` for diagrams, screenshots, docs, scripts, workstream-*)
    body = re.sub(
        r"(\]\()(\.\./(?:diagrams|screenshots|docs|scripts|core-cymbal-agent|workstream-|slides|data)/)",
        r"\1../\2",
        body,
    )

    # Reconstruct frontmatter with updated v2 title & reading time
    v2_title = meta.get("title", f"{ws_key} Streamlined v2 Edition") + " (v2 Streamlined Edition)"
    v2_sub = meta.get(
        "subtitle",
        "Streamlined 24-slide architecture edition with explicit disqualifiers, hard Google Cloud platform quotas, async 3P saga idempotency, and signature Retina UI proofs.",
    )
    fm_out = "\n".join([
        "---",
        f'title: "{v2_title}"',
        f'subtitle: "{v2_sub}"',
        f'target_audience: "{meta.get("target_audience", "Principal Cloud Architects, CISOs, AI Platform Engineers, and FinOps Leads")}"',
        'reading_time: "14 min read"',
        "---",
        "",
    ])
    return fm_out + body.lstrip()


def copy_drive_file(src_id: str, new_title: str) -> str:
    """Clones a Google Drive file (Slides) with retry & gslides mutate copy fallback, inheriting domain sharing."""
    safe_title = new_title.replace("/", "-")
    last_err = ""
    for attempt in range(1, 4):
        res = subprocess.run(
            [GDRIVE_BIN, "mutate", "cp", src_id, safe_title],
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            out = res.stdout.strip() + "\n" + res.stderr.strip()
            m = re.search(r"\b([a-zA-Z0-9_-]{28,48})\b", out)
            if m:
                new_id = m.group(1)
                subprocess.run(
                    [GDRIVE_BIN, "mutate", "share", new_id, "--role", "reader", "--type", "domain", "--domain", "google.com"],
                    capture_output=True,
                    text=True,
                )
                return new_id
        last_err = f"rc={res.returncode} stdout={res.stdout} stderr={res.stderr}"
        # Fallback to gslides mutate copy
        res2 = subprocess.run(
            [GSLIDES_BIN, "mutate", "copy", src_id, safe_title],
            capture_output=True,
            text=True,
        )
        if res2.returncode == 0:
            out2 = res2.stdout.strip() + "\n" + res2.stderr.strip()
            m2 = re.search(r"\b([a-zA-Z0-9_-]{28,48})\b", out2)
            if m2:
                new_id = m2.group(1)
                subprocess.run(
                    [GDRIVE_BIN, "mutate", "share", new_id, "--role", "reader", "--type", "domain", "--domain", "google.com"],
                    capture_output=True,
                    text=True,
                )
                return new_id
        time.sleep(2 * attempt)
    raise RuntimeError(f"Failed to copy Drive file {src_id}: {last_err}")


def create_new_google_doc(new_title: str) -> str:
    """Creates a brand-new blank Google Doc via gdocs mutate create and shares it with google.com domain."""
    safe_title = new_title.replace("/", "-")
    res = subprocess.run(
        [GDOCS_BIN, "mutate", "create", safe_title],
        capture_output=True,
        text=True,
        check=True,
    )
    out = res.stdout.strip() + "\n" + res.stderr.strip()
    m = re.search(r"docs\.google\.com/document/d/([a-zA-Z0-9_-]{25,48})", out) or re.search(
        r"\b([a-zA-Z0-9_-]{28,48})\b", out
    )
    if not m:
        raise RuntimeError(f"Could not parse doc_id from gdocs mutate create:\n{out}")
    doc_id = m.group(1)
    subprocess.run(
        [GDRIVE_BIN, "mutate", "share", doc_id, "--role", "reader", "--type", "domain", "--domain", "google.com"],
        capture_output=True,
        text=True,
    )
    return doc_id


def build_v2_google_slides_deck(spec: Dict[str, Any], existing_slides_id: Optional[str] = None) -> Dict[str, Any]:
    """Clones the source 34-slide deck into a brand-new Google Slides deck and mutates it to 24 (or 16) slides."""
    key = spec["key"]
    src_slides_id = SOURCE_V1_SLIDES_IDS[key]
    if existing_slides_id:
        # Re-clone fresh from source if slide count is not already target_slide_count
        read_res = subprocess.run(
            [GSLIDES_BIN, "readonly", "read-all", existing_slides_id, "--json"],
            capture_output=True,
            text=True,
        )
        if read_res.returncode == 0:
            s_data = json.loads(read_res.stdout)
            s_list = s_data if isinstance(s_data, list) else s_data.get("slides", [])
            if len(s_list) == spec["target_slide_count"]:
                share_url = get_shareable_drive_url(existing_slides_id)
                print(f"✅ [{key}] Reusing already-built {len(s_list)}-slide new Google Slides deck: {share_url}")
                return {
                    "key": key,
                    "slides_id": existing_slides_id,
                    "slides_url": share_url,
                    "slide_count": len(s_list),
                }

    new_slides_id = copy_drive_file(src_slides_id, spec["slides_title"])
    print(f"🆕 [{key}] Cloned new Google Slides deck from {src_slides_id} -> {new_slides_id}")

    requests: List[Dict[str, Any]] = []

    # 1. Delete pruned slides
    for page_id in spec["delete_pages"]:
        requests.append({"deleteObject": {"objectId": page_id}})

    # 2. Renumber remaining slide counter badges (1 / 24 .. 24 / 24 or 1 / 16 .. 16 / 16)
    all_pages = [f"p{i}" for i in range(1, 35)]
    kept_pages = [p for p in all_pages if p not in set(spec["delete_pages"])]
    total_slides = spec["target_slide_count"]
    assert len(kept_pages) == total_slides, f"Expected {total_slides} kept pages, got {len(kept_pages)}"

    for new_idx, page_id in enumerate(kept_pages, 1):
        old_num = int(page_id[1:])
        for old_tot in (34, 33, 32, 31):
            requests.append(
                {
                    "replaceAllText": {
                        "pageObjectIds": [page_id],
                        "containsText": {"text": f"{old_num} / {old_tot}", "matchCase": False},
                        "replaceText": f"{new_idx} / {total_slides}",
                    }
                }
            )

    # 3. Customize titles & content on Cover, Agenda, Caveats/Quotas, and Act IV Breaker
    if key == "ATLAS":
        requests.extend(
            [
                {
                    "replaceAllText": {
                        "pageObjectIds": ["p1"],
                        "containsText": {"text": "REFERENCE ARCHITECTURE & TAXONOMY", "matchCase": False},
                        "replaceText": "10-SAAS MULTI-CLOUD VISUAL VERIFICATION ATLAS",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": ["p2"],
                        "containsText": {"text": "The 5-Act Architecture Journey: From Threat Model to Production GA", "matchCase": False},
                        "replaceText": "16-Slide Visual Verification Atlas: All 10 SaaS Before/After Retina Proofs (30/30 Flows)",
                    }
                },
            ]
        )
    else:
        caveats_page = spec["caveats_page"]
        act4_page = spec["act4_page"]
        sig_pair_str = " & ".join(spec["signature_saas_ids"])
        requests.extend(
            [
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "ARCHITECTURAL CAVEATS", "matchCase": False},
                        "replaceText": "QUOTAS, SAGA & DISQUALIFIERS",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "Architectural Caveats & Operational Nuances: 4 Non-Negotiable Production Guardrails", "matchCase": False},
                        "replaceText": "Hard GCP Quotas, Async 3P Outbox Saga & Explicit Pattern Disqualifiers (When NOT to Use)",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "Architectural Caveats & Operational Nuances: 4 Non-Negotiable Pattern A Guardrails", "matchCase": False},
                        "replaceText": "Hard GCP Quotas (32k Cache Floor, PgBouncer), Async 3P Saga & Pattern A Disqualifiers",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "Architectural Caveats & Nuances: Production Realities of Pattern B", "matchCase": False},
                        "replaceText": "Hard GCP Quotas (100 VPC-SC Limit, 60s IAM Window), CMEK Saga & Pattern B Disqualifiers",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "Architectural Caveats & Nuances: Production Realities of Pattern C", "matchCase": False},
                        "replaceText": "Hard GCP Quotas (1,000 PSC Consumers, 64k NAT Ports), Cutover Saga & Pattern C Disqualifiers",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [caveats_page],
                        "containsText": {"text": "Architectural Caveats & Nuances: Production Realities of Agentic Triad", "matchCase": False},
                        "replaceText": "Triad Crossover Quotas (>50 TF Shards, Cross-Cloud STS), Outbox Saga & Disqualifiers",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [act4_page],
                        "containsText": {"text": "10 Genuine SaaS Proofs", "matchCase": False},
                        "replaceText": f"2 Signature SaaS Proofs ({sig_pair_str}) + 10-SaaS Atlas",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [act4_page],
                        "containsText": {"text": "10 SaaS Gallery", "matchCase": False},
                        "replaceText": f"2 Signature SaaS Proofs ({sig_pair_str}) + 10-SaaS Atlas",
                    }
                },
                {
                    "replaceAllText": {
                        "pageObjectIds": [act4_page],
                        "containsText": {"text": "10 Sovereign Receipts", "matchCase": False},
                        "replaceText": f"2 Signature SaaS Proofs ({sig_pair_str}) + 10-SaaS Atlas",
                    }
                },
            ]
        )

    SCRATCH_OPS_DIR.mkdir(parents=True, exist_ok=True)
    batch_file = SCRATCH_OPS_DIR / f"v2_slides_batch_{key.lower()}.json"
    batch_file.write_text(json.dumps({"requests": requests}, indent=2), encoding="utf-8")

    subprocess.run(
        [GSLIDES_BIN, "mutate", "raw-batch", new_slides_id, "-f", str(batch_file)],
        check=True,
        capture_output=True,
        text=True,
    )

    # Verify final slide count
    verify_res = subprocess.run(
        [GSLIDES_BIN, "readonly", "list-slides", new_slides_id, "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    v_data = json.loads(verify_res.stdout)
    v_slides = v_data if isinstance(v_data, list) else v_data.get("slides", [])
    actual_count = len(v_slides)
    if actual_count != total_slides:
        raise RuntimeError(f"[{key}] Expected {total_slides} slides after pruning, got {actual_count}")

    share_url = get_shareable_drive_url(new_slides_id)
    print(f"✅ [{key}] Built & verified {actual_count}-slide Google Slides deck -> {share_url}")
    return {
        "key": key,
        "slides_id": new_slides_id,
        "slides_url": share_url,
        "slide_count": actual_count,
    }


def prepend_v2_executive_header_banner(
    doc_id: str,
    spec: Dict[str, Any],
    meta: Dict[str, str],
    slides_url: str,
    atlas_doc_url: str,
) -> None:
    """Prepends the Google Cloud 1-Row, 2-Column Executive Header Banner with links to the new 24-Slide Deck & 10-SaaS Atlas."""
    SCRATCH_OPS_DIR.mkdir(parents=True, exist_ok=True)
    subtitle = sanitize_currency_outside_math(
        meta.get(
            "subtitle",
            "Streamlined v2 multi-tenant agentic AI reference architecture with explicit disqualifiers, hard GCP quotas, and signature Retina SaaS UI proofs.",
        )
    )
    audience = meta.get(
        "target_audience",
        "Principal Cloud Architects, CISOs, AI Platform Engineers, and FinOps Leads",
    )
    reading_time = meta.get("reading_time", "14 min read")
    portal_url = f"{PORTAL_BASE}/?doc={spec['v2_md_rel']}"
    word_url = f"{PORTAL_BASE}/{spec['v2_docx_rel']}"
    github_url = f"{GITHUB_BLOB_BASE}/{spec['v2_md_rel']}"

    insert_ops = [
        {
            "op": "insert-table",
            "rows": 1,
            "cols": 2,
            "table_col_widths": [175, 395],
            "table_font_family": "Roboto",
            "table_font_size": 9,
            "table_border_color": "#ffffff",
            "table_border_width": 0.5,
            "table_rich_data": [
                [
                    [
                        {
                            "text": "GOOGLE CLOUD\n",
                            "bold": True,
                            "italic": False,
                            "font_family": "Google Sans",
                            "font_size": 8.5,
                            "text_color": "#1a73e8",
                        },
                        {
                            "text": "Architecture Center (v2)\n",
                            "bold": True,
                            "italic": False,
                            "font_family": "Google Sans",
                            "font_size": 12.0,
                            "text_color": "#202124",
                        },
                        {
                            "text": f"{spec['series_badge']}\n",
                            "bold": True,
                            "italic": False,
                            "font_family": "Google Sans",
                            "font_size": 8.5,
                            "text_color": "#137333",
                        },
                        {
                            "text": f"{reading_time}  •  STREAMLINED V2\nHard Quotas + Disqualifiers",
                            "bold": False,
                            "italic": False,
                            "font_family": "Roboto",
                            "font_size": 8.0,
                            "text_color": "#5f6368",
                        },
                    ],
                    [
                        {
                            "text": "STREAMLINED V2 EDITION & COMPANION ASSETS\n",
                            "bold": True,
                            "italic": False,
                            "font_family": "Google Sans",
                            "font_size": 8.5,
                            "text_color": "#1a73e8",
                        },
                        {
                            "text": f"{subtitle}\n",
                            "bold": False,
                            "italic": False,
                            "font_family": "Roboto",
                            "font_size": 9.0,
                            "text_color": "#202124",
                        },
                        {
                            "text": f"Audience: {audience}\n",
                            "bold": False,
                            "italic": True,
                            "font_family": "Roboto",
                            "font_size": 8.0,
                            "text_color": "#5f6368",
                        },
                        {
                            "text": "New v2 Links: ",
                            "bold": True,
                            "italic": False,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#3c4043",
                        },
                        {
                            "text": "Portal Reader (v2)",
                            "bold": True,
                            "italic": False,
                            "underline": True,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#1155cc",
                            "url": portal_url,
                        },
                        {
                            "text": "  |  ",
                            "bold": False,
                            "italic": False,
                            "underline": False,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#5f6368",
                        },
                        {
                            "text": f"Google Slides ({spec['slides_label']})",
                            "bold": True,
                            "italic": False,
                            "underline": True,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#1155cc",
                            "url": slides_url,
                        },
                        {
                            "text": "  |  ",
                            "bold": False,
                            "italic": False,
                            "underline": False,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#5f6368",
                        },
                        {
                            "text": "10-SaaS Visual Atlas Doc",
                            "bold": True,
                            "italic": False,
                            "underline": True,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#1155cc",
                            "url": atlas_doc_url,
                        },
                        {
                            "text": "  |  ",
                            "bold": False,
                            "italic": False,
                            "underline": False,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#5f6368",
                        },
                        {
                            "text": "Word (.docx)",
                            "bold": True,
                            "italic": False,
                            "underline": True,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#1155cc",
                            "url": word_url,
                        },
                        {
                            "text": "  |  ",
                            "bold": False,
                            "italic": False,
                            "underline": False,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#5f6368",
                        },
                        {
                            "text": "GitHub Source",
                            "bold": True,
                            "italic": False,
                            "underline": True,
                            "font_family": "Roboto",
                            "font_size": 8.5,
                            "text_color": "#1155cc",
                            "url": github_url,
                        },
                    ],
                ]
            ],
        }
    ]

    insert_ops_file = SCRATCH_OPS_DIR / f"v2_header_insert_{spec['key'].lower()}.json"
    insert_ops_file.write_text(json.dumps(insert_ops, indent=2), encoding="utf-8")

    subprocess.run(
        [
            GDOCS_BIN,
            "mutate",
            "batch",
            doc_id,
            "--index",
            "1",
            "--tab",
            "t.0",
            "--direct",
            "--auto-fit-tables=false",
            "-f",
            str(insert_ops_file),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    dump_res = subprocess.run(
        [GDOCS_BIN, "readonly", "dump-body", doc_id, "--tab", "t.0"],
        check=True,
        capture_output=True,
        text=True,
    )
    body_json = json.loads(dump_res.stdout)
    first_table_start: Optional[int] = None
    for elem in body_json.get("content", []):
        if "table" in elem:
            first_table_start = int(elem["startIndex"])
            break

    if first_table_start is not None:
        style_ops = [
            {
                "op": "raw",
                "raw_request": {
                    "updateTableCellStyle": {
                        "tableStartLocation": {"index": first_table_start, "tabId": "t.0"},
                        "tableCellStyle": {
                            "backgroundColor": {
                                "color": {"rgbColor": {"red": 1.0, "green": 1.0, "blue": 1.0}}
                            },
                            "borderTop": {
                                "color": {"color": {"rgbColor": {"red": 0.102, "green": 0.451, "blue": 0.910}}},
                                "width": {"magnitude": 3.0, "unit": "PT"},
                                "dashStyle": "SOLID",
                            },
                            "borderBottom": {
                                "color": {"color": {"rgbColor": {"red": 0.855, "green": 0.863, "blue": 0.878}}},
                                "width": {"magnitude": 1.0, "unit": "PT"},
                                "dashStyle": "SOLID",
                            },
                            "borderLeft": {
                                "color": {"color": {"rgbColor": {"red": 1.0, "green": 1.0, "blue": 1.0}}},
                                "width": {"magnitude": 0.0, "unit": "PT"},
                                "dashStyle": "SOLID",
                            },
                            "borderRight": {
                                "color": {"color": {"rgbColor": {"red": 1.0, "green": 1.0, "blue": 1.0}}},
                                "width": {"magnitude": 0.0, "unit": "PT"},
                                "dashStyle": "SOLID",
                            },
                            "paddingTop": {"magnitude": 7.0, "unit": "PT"},
                            "paddingBottom": {"magnitude": 8.0, "unit": "PT"},
                            "paddingLeft": {"magnitude": 6.0, "unit": "PT"},
                            "paddingRight": {"magnitude": 6.0, "unit": "PT"},
                        },
                        "fields": "backgroundColor,borderTop,borderBottom,borderLeft,borderRight,paddingTop,paddingBottom,paddingLeft,paddingRight",
                    }
                },
            }
        ]
        style_ops_file = SCRATCH_OPS_DIR / f"v2_header_style_{spec['key'].lower()}.json"
        style_ops_file.write_text(json.dumps(style_ops, indent=2), encoding="utf-8")
        subprocess.run(
            [
                GDOCS_BIN,
                "mutate",
                "batch",
                doc_id,
                "--tab",
                "t.0",
                "--direct",
                "--auto-fit-tables=false",
                "-f",
                str(style_ops_file),
            ],
            check=True,
            capture_output=True,
            text=True,
        )


def build_v2_google_doc(
    spec: Dict[str, Any],
    slides_url: str,
    atlas_doc_url: str,
    existing_doc_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Creates (or updates) the brand-new v2 Google Doc from spec['v2_md_rel']."""
    key = spec["key"]
    doc_id = existing_doc_id or create_new_google_doc(spec["doc_title"])
    if not existing_doc_id:
        print(f"🆕 [{key}] Created brand-new Google Doc -> {doc_id}")

    md_path = ROOT_DIR / spec["v2_md_rel"]
    md_dir = md_path.parent
    raw_md = md_path.read_text(encoding="utf-8")
    meta, raw_body = parse_frontmatter(raw_md)

    assets_dir = md_dir / f"gdoc-assets-v2-{key.lower()}"
    staged_md_path = md_dir / f"{md_path.stem}-gdoc.md"

    try:
        cleaned_md, expected_images = preprocess_markdown_for_gdocs(
            raw_body=raw_body,
            md_dir=md_dir,
            assets_dir=assets_dir,
            spec_md_rel=spec["v2_md_rel"],
        )
        staged_md_path.write_text(cleaned_md, encoding="utf-8")
        print(
            f"[{key}] Staged {staged_md_path.relative_to(ROOT_DIR)} "
            f"({len(cleaned_md):,} chars, {expected_images} figures)"
        )

        imp_res = subprocess.run(
            [
                GDOCS_BIN,
                "mutate",
                "import-md",
                str(staged_md_path),
                "--update",
                doc_id,
                "--tab",
                "t.0",
                "--preset",
                "bluedoc",
                "--pageless=false",
                "--max-image-width",
                "530",
                "--register-golink=false",
                "--ignore-sharing-checks",
            ],
            capture_output=True,
            text=True,
        )
        if imp_res.returncode != 0:
            raise RuntimeError(
                f"[{key}] gdocs mutate import-md failed:\nSTDOUT: {imp_res.stdout}\nSTDERR: {imp_res.stderr}"
            )
    finally:
        if staged_md_path.exists():
            staged_md_path.unlink()
        if assets_dir.exists():
            shutil.rmtree(assets_dir, ignore_errors=True)

    subprocess.run(
        [GDRIVE_BIN, "mutate", "rename", doc_id, spec["doc_title"]],
        check=True,
        capture_output=True,
        text=True,
    )

    final_atlas_url = atlas_doc_url or get_shareable_doc_url(doc_id)
    prepend_v2_executive_header_banner(doc_id, spec, meta, slides_url, final_atlas_url)

    imgs_res = subprocess.run(
        [GDOCS_BIN, "readonly", "list-images", doc_id, "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    imgs_json = json.loads(imgs_res.stdout) if imgs_res.stdout.strip() else []
    img_count = len(imgs_json) if isinstance(imgs_json, list) else len(imgs_json.get("images", []))

    V2_WORD_DIR.mkdir(parents=True, exist_ok=True)
    docx_out = ROOT_DIR / spec["v2_docx_rel"]
    try:
        subprocess.run(
            [GDRIVE_BIN, "readonly", "export", doc_id, str(docx_out), "--format", "docx"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"   ⚠️  [{key}] .docx export warning: {e.stderr}")

    share_url = get_shareable_doc_url(doc_id)
    print(
        f"✅ [{key}] Built brand-new Google Doc ({img_count}/{expected_images} inline images) -> {share_url}"
    )
    return {
        "key": key,
        "doc_id": doc_id,
        "doc_url": share_url,
        "images": img_count,
        "expected_images": expected_images,
        "v2_md_rel": spec["v2_md_rel"],
        "v2_docx_rel": spec["v2_docx_rel"],
        "portal_url": f"{PORTAL_BASE}/?doc={spec['v2_md_rel']}",
    }


def load_v2_manifest() -> Dict[str, Any]:
    if V2_MANIFEST_PATH.is_file():
        try:
            return json.loads(V2_MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"updatedAt": "", "entries": {}}


def save_v2_manifest(manifest: Dict[str, Any]) -> None:
    manifest["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    V2_MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v2 Streamlined Edition as brand-new links.")
    parser.add_argument("--only", type=str, default="", help="Comma-separated keys (e.g. ATLAS,WS1)")
    args = parser.parse_args()

    only_keys = {k.strip().upper() for k in args.only.split(",") if k.strip()}
    V2_BLOGS_DIR.mkdir(parents=True, exist_ok=True)
    V2_WORD_DIR.mkdir(parents=True, exist_ok=True)

    manifest = load_v2_manifest()
    entries = manifest.setdefault("entries", {})

    # Always ensure ATLAS has a Slides ID and Doc ID first so WS1..WS5 can cross-link to it
    atlas_spec = next(s for s in V2_SPECS if s["key"] == "ATLAS")
    if "ATLAS" not in entries or not entries["ATLAS"].get("slides_id"):
        s_info = build_v2_google_slides_deck(atlas_spec)
        entries.setdefault("ATLAS", {}).update(s_info)
        save_v2_manifest(manifest)

    atlas_slides_id = entries["ATLAS"]["slides_id"]
    ws1_raw_md = (ROOT_DIR / "blogs" / "ws1-reference-architecture-taxonomy-and-5hop-baseline.md").read_text(encoding="utf-8")
    atlas_md_content = generate_atlas_markdown(ws1_raw_md, atlas_slides_id, {})
    (ROOT_DIR / atlas_spec["v2_md_rel"]).write_text(atlas_md_content, encoding="utf-8")

    if "ATLAS" not in entries or not entries["ATLAS"].get("doc_id") or ("ATLAS" in only_keys or not only_keys):
        d_info = build_v2_google_doc(
            spec=atlas_spec,
            slides_url=entries["ATLAS"]["slides_url"],
            atlas_doc_url=entries["ATLAS"].get("doc_url", ""),
            existing_doc_id=entries["ATLAS"].get("doc_id"),
        )
        entries["ATLAS"].update(d_info)
        save_v2_manifest(manifest)

    atlas_doc_id = entries["ATLAS"]["doc_id"]
    atlas_doc_url = entries["ATLAS"]["doc_url"]

    for spec in V2_SPECS:
        key = spec["key"]
        if key == "ATLAS":
            continue
        if only_keys and key not in only_keys:
            continue

        cur = entries.setdefault(key, {})
        s_info = build_v2_google_slides_deck(spec, existing_slides_id=cur.get("slides_id"))
        cur.update(s_info)
        save_v2_manifest(manifest)

        # Generate streamlined v2 markdown cross-linking to the new 24-slide deck and the new 10-SaaS Atlas
        v2_md = generate_streamlined_ws_markdown(
            spec=spec,
            new_slides_id=cur["slides_id"],
            atlas_doc_id=atlas_doc_id,
            atlas_slides_id=atlas_slides_id,
        )
        (ROOT_DIR / spec["v2_md_rel"]).write_text(v2_md, encoding="utf-8")

        d_info = build_v2_google_doc(
            spec=spec,
            slides_url=cur["slides_url"],
            atlas_doc_url=atlas_doc_url,
            existing_doc_id=cur.get("doc_id"),
        )
        cur.update(d_info)
        save_v2_manifest(manifest)

    print(f"🎉 Completed v2 Streamlined Edition build -> {V2_MANIFEST_PATH.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()
