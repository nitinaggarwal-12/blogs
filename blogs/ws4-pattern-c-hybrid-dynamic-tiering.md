---
title: "Pattern C — Dynamic Hybrid: One Control Plane, Pooled and Sovereign Tiers, and Live Zero-Downtime Tier Upgrades"
subtitle: "How a tenant-aware hub routes Standard tenants to a shared pool, bridges Enterprise tenants to CMEK spokes over Private Service Connect, and promotes a live customer between tiers with 0 dropped turns"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 4 of 5"
workstream: "Workstream 4 • Milestone 3 (Weeks 7–10) • Pattern C — Dynamic Hybrid Architecture"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Principal Architects, Platform Product Managers, and FinOps Leads operating tiered B2B SaaS on Gemini Enterprise Agent Platform (GEAP) and ADK 2.0"
reading_time: "13 min read"
tags: ["Pattern C", "Hybrid Architecture", "Private Service Connect", "Hub-and-Spoke", "Zero-Downtime Migration", "GEAP", "ADK 2.0", "CMEK", "AlloyDB RLS", "FinOps", "Multi-Tenancy"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws4-pattern-c-hybrid-psc-and-migration"]
editable_slides: "slides/ws4-pattern-c-hybrid-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Pattern C — Dynamic Hybrid: One Control Plane, Pooled and Sovereign Tiers, and Live Zero-Downtime Tier Upgrades

> **Executive TL;DR**
> - **The tension**: Tiered B2B SaaS platforms sell a Standard tier that only works economically on a shared pool (Pattern A) and an Enterprise tier that only closes with dedicated projects, VPC-SC and CMEK (Pattern B). Running two disconnected stacks doubles the control plane and makes tier upgrades a maintenance-window event.
> - **The design**: **Pattern C (Dynamic Hybrid)** keeps one **Unified Hybrid Control Hub (`cymbal-hybrid-hub-prod`)** with a tenant-aware **Cloud Run Router** backed by a **Firestore Route Table** and a **Cross-Project ARD Federated GEAP Registry**. Standard tenants (**RetailStream Corp**) run in the **Shared Pooled Runtime**; Enterprise tenants (**FinVault Bank**) are reached over **Private Service Connect (PSC)** to **Dedicated Enterprise PSC Spokes** with CMEK AlloyDB.
> - **The proof**: A **3-Phase Zero-Downtime Tier Migration Engine** (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) promotes RetailStream from the pool (`4,000` thinking cap) to its own PSC spoke (`8,000` budget + CMEK) on the *same* live session, verified by the 4-gate suite in `4.5` with `0` replication lag and `0` dropped sessions.
> - **The economics**: Pooled unit cost (up to **90% COGS savings** from `ContextCacheConfig`) for the long tail, dedicated SLA and sovereignty for the enterprise logos, and no re-platforming when a customer moves between them.

This post is the diagram-centric companion to the Workstream 4 flagship deep-dive, [`4.7-blog-dynamic-tiering-and-migration.md`](../workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md). Read this one for the architecture walkthrough; read 4.7 for the networking comparison tables and the full promotion kit.

---

## 1. Why Tiered SaaS Needs Both Pooled and Sovereign

The anchor case study across this series is **Cymbal SaaS Platform**, a B2B IT-observability vendor that publishes a **Shared Incident Diagnostic Agent** on **Gemini 2.5 Pro** (see [`README.md`](../README.md)). Cymbal serves two very different customers from one product:

| Dimension | **RetailStream Corp** (Standard Tier) | **FinVault Bank** (Enterprise Tier) |
| :--- | :--- | :--- |
| Identity | Microsoft Entra ID (zero Google footprint) | Google Workspace OIDC |
| Agents | Shared Diagnostic Agent only | Shared agent **plus** private `Agent Alpha` (Claude Sonnet on Vertex AI Model Garden) |
| Thinking budget | `4,000` tokens, Redis rate-limit bulkhead | `8,000` tokens |
| Data plane | Shared AlloyDB with Row-Level Security | Dedicated CMEK AlloyDB inside a VPC-SC spoke project |
| Tools | SharePoint runbooks + ServiceNow ITOM via inline 3LO consent | Google Drive / Calendar / Gmail + Jira via 3LO OIDC |

Neither pure pattern fits both rows. As [`4.1`](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md) frames it, the Standard tier needs instant self-service onboarding and lowest unit COGS; the Enterprise tier needs Cymbal's single SaaS UX but with every private agent, connector and byte of customer data inside a dedicated, CMEK-encrypted spoke. The decisive requirement is the third one: when RetailStream signs an Enterprise expansion contract, Cymbal must promote them **from the pool to a dedicated spoke with zero downtime and zero lost sessions**.

The product-collaboration triage in [`4.4`](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md) reduces the choice to one question: *"Do you offer tiered SaaS pricing — Standard/Pro on shared infrastructure plus Enterprise/Regulated with dedicated data spokes and custom agents?"* If yes, deploy Pattern C.

---

## 2. The Hybrid Hub-and-Spoke Control Plane

Pattern C is Pattern A and Pattern B sharing one front door. Five building blocks make that possible:

1. **Unified control plane.** A single project, `cymbal-hybrid-hub-prod`, owns the public SaaS URL, the External Application Load Balancer, Cloud Armor and IAP. Standard and Enterprise users never see a different hostname — before, during, or after a tier change.
2. **Tenant-aware gateway routing.** A **Cloud Run Router** resolves the caller's cryptographically verified `tenant_id` (never a client header) against a **Firestore Route Table** that maps each tenant to either `PATTERN_C_HYBRID_POOL` or `PATTERN_C_HYBRID_PSC_SPOKE`. The implementation is [`route_and_invoke()`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) in `PatternCHybridRouterAndMigrator`.
3. **Shared pool for Standard tenants.** RetailStream's initial route is `pool://cymbal-shared-pooled-runtime-v2`: the pooled GEAP runtime with a `4,000` thinking cap, shared `ContextCacheConfig`, a pooled MCP hub and shared AlloyDB RLS.
4. **Private Service Connect spokes for Enterprise tenants.** FinVault's route is `psc://10.10.0.50/projects/cymbal-finvault-silo-prod/serviceAttachments/finvault-agent-spoke-psc`. The hub holds a consumer forwarding rule; the spoke publishes a producer `ServiceAttachment` with `ACCEPT_MANUAL` and a consumer accept list containing **only** the hub project ([`4.2`](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md)). PSC is NAT-based, so every spoke may reuse the same `10.40.0.0/20` range and the spoke can never initiate a lateral connection back into the hub VPC.
5. **Agent registry.** A **Cross-Project ARD Federated GEAP Registry** synchronises private spoke agent cards (`Agent Alpha`) into the hub's Policy Decision Point so Enterprise users see one unified catalog while a Standard user invoking `agent://finvault/private-agent-alpha-regulatory` receives `403 Forbidden`.

The result is a control plane that *routes* isolation instead of *duplicating* it.

---

## 3. Figure 1 — The Pattern C Blueprint

![Figure 1 — Pattern C: Dynamic Hybrid Hub-and-Spoke, Private Service Connect (PSC) & Live Tier Migration](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.png)

*Figure 1 — Unified Hybrid Control Hub routing Standard tenants to the Shared Pooled Runtime and Enterprise tenants over Private Service Connect to Dedicated Enterprise PSC Spokes, with the 3-Phase Zero-Downtime Tier Migration Engine promoting RetailStream live from Pool to PSC Spoke. Editable: [Draw.io](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio) • [Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) • [Cloud Architecture Center SVG](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.svg) • [Vision AST](../diagrams/vision_metadata/ws4-pattern-c-hybrid-psc-and-migration.vision.json)*

### Reading Figure 1

Read the blueprint top-down, then left-to-right. Every label below is the exact addressable object in the Vision AST.

**Outer frame and actor.** The header badge reads **[WORKSTREAM 4.1 • PATTERN C BLUEPRINT]**. Above the Google Cloud frame sits a single actor, **Standard & Enterprise Single Unified SaaS URL** — the whole point of Pattern C is that both tiers enter through one hostname. Step badge **1 Request** descends from the actor; badge **7 Response** returns beside it.

**Wrappers.** The outer container is **Unified Hybrid Control Hub (cymbal-hybrid-hub-prod) + PSC Bridge to Sovereign Spokes**. Inside it, **Hub VPC • Tenant-Aware Router & 3-Phase Live Tier Migrator** frames everything that follows, making explicit that the router and the migrator live in the same VPC and the same project.

**Routing hub (top-left zone).** **Unified Control Plane & Intelligent Router Hub** holds five cards. On the left column: **Cloud Armor & IAP Single SaaS URL + OBO/DPoP** (annotated **Security policies**), **Cross-Project ARD Federated GEAP Registry** (annotated **Resolve agent route**), and **Firestore Route Table Maps Tenant -> Pool or PSC** (annotated **Atomic route lookup**). On the right: the **External Application Load Balancer** feeding the **Cloud Run Router**. Step badges **2 Request** and **7 Response** sit between the ALB and the router, showing that the response path is symmetrical.

**Central governance hub (top-right zone).** **3-Phase Zero-Downtime Tier Migration Engine** stacks the three phase cards in order: **1. SHADOW_SYNC (0ms Lag Copy)**, **2. ATOMIC_CUTOVER**, and **3. DRAIN_AND_VERIFY 0 Dropped Turns (4/4 PASS)**. The `4/4 PASS` is the literal output of the verification suite in Section 5.

**Trunk.** Beneath the routing hub, badge **3** carries the label **Route Standard to Pool or Enterprise via PSC**, and badge **7** carries **Seamless response (0 dropped sessions)**. These two trunks fan out to the two spokes below.

**Left spoke.** **Standard Tier: Shared Pooled Plane (Initial RetailStream Route)** wraps **Shared Pooled Runtime**. Its cards are **Shared Model Armor Multi-Tenant Prompt & SDP** (badges **4 Sanitize request** and **6 Sanitize response**), **Gemini 2.5 Pro 4,000 Thinking Cap + Cache** (badge **5 Pooled inference**), **Pooled Runtime Serves Standard SaaS Tier**, **Pooled MCP Hub 2LO + Delegated 3LO Tools** (annotated **Shared Pool RAG**), and **Shared AlloyDB RLS** (annotated **Streams State to PSC Spoke** — the Phase 1 replication source).

**Right spoke.** **Enterprise Tier: Private Service Connect (PSC) Spokes (FinVault + Upgraded RetailStream)** wraps **Dedicated Enterprise PSC Spokes**. Its mirror-image cards are **Spoke Model Armor Dedicated Spoke DLP & NLC**, **Gemini & Claude 3.7**, **Spoke Runtime** (annotated **Unidirectional PSC Bridge**), **Dedicated Spoke MCP**, and **CMEK Spoke AlloyDB** (annotated **CMEK-Encrypted Spoke Storage**).

**Dashed governance line.** From the migration engine, a dashed edge labelled **Live promotion: Pool -> PSC Spoke** crosses from the left spoke to the right spoke. That single dashed line is the whole story of Section 5: RetailStream begins on the left and, without leaving its session, ends on the right.

---

## 4. The 5-Hop Context Chain in Pattern C

The `core-cymbal-agent/` engine is the same **80% reusable code** used in Patterns A and B. Pattern C contributes a 20% delta — the router, registry federation and migrator — and the five hops behave as follows.

### Hop 1 — Edge Identity & Token Exchange PEP

[`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) strips forged `X-Tenant-ID` / `X-Cymbal-Tier` headers, verifies the upstream IdP JWT (Google Workspace OIDC for FinVault, Microsoft Entra ID for RetailStream), and performs an RFC 8693 On-Behalf-Of exchange bound to a DPoP (RFC 9449) thumbprint. In Pattern C this is the **only** input to routing: `route_and_invoke()` calls `hop1.authenticate_and_mint_context()` first and indexes the route table by `ctx.tenant_id`. A client cannot claim Enterprise tier by setting a header.

### Hop 2 — Registry PDP & ADK `before_agent_callback` Pruning

[`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) filters the GEAP Agent Registry and ARD catalog by cryptographic tenant labels and prunes tools via ADK 2.0 `before_agent_callback`. The Pattern C delta is *federation*: spoke-published agent cards are synced into the hub PDP so FinVault can discover `Agent Alpha` through the unified URL, while the same PDP returns `403 Forbidden` to RetailStream for a direct invocation and keeps RetailStream's ServiceNow MCP connector invisible to FinVault.

### Hop 3 — Compute Plane, Memory Bank & FinOps Bulkheads

[`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) binds the immutable `temp:tenant_id` in the gVisor sandbox, enforces per-tenant thinking budgets (`8,000` Enterprise vs `4,000` Standard), Redis RPM bulkheads, the 5-Level Memory Bank keyed `{tenant}:{user}:{session}`, CMEK key state, and shared `ContextCacheConfig`. This is where **instance-scoped profile mutation** matters most: `ComputeFinOpsBulkhead` accepts an injected `tenant_profiles` dictionary, and the migrator writes the upgraded profile to `self.runtime.tenant_profiles[tenant_id]` — never to the module-level `TENANT_PROFILES`. A tier upgrade on one hub instance therefore has **zero global state bleed** into any other tenant or test.

### Hop 4 — Vertex AI Model Armor Guardrails

[`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) screens ingress prompts for injection, context-cache extraction and RLS-bypass payloads, enforces tenant-specific Semantic NLCs, and redacts egress with tenant-tailored SDP detectors (IBAN/SWIFT for FinVault, payment-card PAN for RetailStream). Figure 1 shows the pooled and spoke instances side by side — **Shared Model Armor Multi-Tenant Prompt & SDP** versus **Spoke Model Armor Dedicated Spoke DLP & NLC** — so a promoted tenant automatically inherits a dedicated guardrail instance.

### Hop 5 — AlloyDB RLS, 2LO/3LO Broker & BigQuery OTel

[`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) sets `SET LOCAL app.current_tenant = '<tenant_id>'` on every AlloyDB transaction, brokers 2LO telemetry passthrough and 3LO tokens through `CymbalMCPHub`, and emits OTel audit traces to BigQuery. In Pattern C the same RLS predicate that isolates RetailStream in the shared pool is what the migrator uses to *select* exactly RetailStream's rows for shadow replication — and the BigQuery OTel sink is where operators confirm post-cutover turns carry `PATTERN_C_HYBRID_PSC_SPOKE`.

---

## 5. Zero-Downtime Live Tier Upgrade: RetailStream Standard → Enterprise

[`execute_zero_downtime_tier_upgrade()`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) runs three deterministic phases while synthetic traffic continues to flow. The [`4.5` suite](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) brackets the migration with pre- and post-upgrade turns on the **same** session id.

| Step | Phase / Gate | What happens | Verified outcome |
| :--- | :--- | :--- | :--- |
| 0 | `TEST 1A` — pre-upgrade | RetailStream turn on `sess-rs-live-upgrade-01` requests `8,000` thinking tokens | Routed to `pool://cymbal-shared-pooled-runtime-v2`; budget clamped to `4,000` (`PASS`) |
| 0 | `TEST 1B` — steady-state spoke | FinVault turn on `sess-fv-hybrid-01` invokes `Agent Alpha` | Routed to `psc://10.10.0.50/.../finvault-agent-spoke-psc`; full `8,000` budget (`PASS`) |
| 1 | `PHASE_1_SHADOW_SYNC` | Terraform provisions `cymbal-retailstream-spoke-prod`, CMEK key `rs-kr/cryptoKeys/rs-agent-cmek`, and `retailstream-agent-spoke-psc`; migrator streams RLS rows (`WHERE tenant_id = 'retailstream'`) and `retailstream:*` Memory Bank namespaces | `replication_lag_ms == 0`; `psc_health_check == PSC_CONNECTION_ACCEPTED` |
| 2 | `PHASE_2_ATOMIC_CUTOVER` | `dataclasses.replace()` builds the upgraded profile (`tier=ENTERPRISE`, `thinking_token_budget=8000`, `redis_rpm_limit=600`, CMEK, `dedicated_project_id`, `psc_service_attachment`); single write to instance-scoped profile and route table | Route becomes `psc://10.10.0.51/...`; `migration_state = UPGRADED_ZERO_DOWNTIME_SPOKE` |
| 3 | `PHASE_3_DRAIN_AND_VERIFY` | In-flight pooled turns finish normally; subsequent turns route over PSC | `dropped_sessions == 0`; `status == MIGRATION_COMPLETE` (`TEST 2 PASS`) |
| 4 | `TEST 3` — post-upgrade | Same `sess-rs-live-upgrade-01`, same `dpop_jkt_rs_401`, requests `8,000` tokens | `tier == ENTERPRISE`; `thinking_budget_clamped is False`; `rs-agent-cmek` bound (`PASS`) |

Run it yourself:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py
```

The final line prints `ALL 4 PATTERN C (DYNAMIC HYBRID & LIVE TIER UPGRADE) TESTS PASSED (100% VERIFIED)` — the `4/4 PASS` embedded in Figure 1's third phase card.

Two details distinguish this from a conventional blue/green cutover. First, the cutover is a **single atomic write** to the Firestore-backed route table, so there is no window in which a tenant is half-pooled, half-spoke. Second, the user's **session id and DPoP binding do not change**, so Hop 1 re-validates the next turn exactly as before and the 5-Level Memory Bank context is already present in the spoke thanks to Phase 1.

---

## 6. PSC & Registry: What Product Collaboration Delivered

Workstream 4.4 aligned field implementation with product engineering on three capabilities ([`4.4`](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)):

| Capability | Product alignment | Field pattern (`4.3` & `4.6`) |
| :--- | :--- | :--- |
| **Cross-Project GEAP Agent Registry** | Spoke-published agent cards discoverable by the hub without exposing the spoke to other tenants | Federated Firestore/Registry sync with cryptographic `tenant_id` PDP enforcement at Hop 2 |
| **PSC Spoke Bridge** | Removes VPC peering CIDR exhaustion across hundreds of spokes; works with VPC-SC ingress rules for the router service account | Producer `google_compute_service_attachment` per spoke + consumer `google_compute_forwarding_rule` in the hub |
| **Zero-Downtime Live Tier Migration** | Upgrade an active customer mid-business-day with `0` dropped turns | 3-Phase state machine `SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY` |

The accompanying **GA Field Enablement Playbook** gives FDEs and CEs a 15-minute triage (three questions → Pattern A, B or C) and a four-step live-upgrade runbook: run the spoke Terraform module, trigger `execute_zero_downtime_tier_upgrade()`, verify `replication_lag_ms == 0` and `PSC_CONNECTION_ACCEPTED`, then confirm in BigQuery OTel that turns now carry `PATTERN_C_HYBRID_PSC_SPOKE` with an `8,000` budget and CMEK.

---

## 7. Terraform Hybrid PSC Blueprint & 90-Minute Codelab

The [`4.6` blueprint](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/README.md) uses two provider aliases (`google.hub`, `google.spoke`) and provisions, in [`main.tf`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf):

- **Hub**: `cymbal-hybrid-hub-vpc` and `cymbal-hybrid-hub-subnet` (`10.10.0.0/20`, Private Google Access on).
- **Spoke**: `<tenant>-spoke-vpc`, a `<tenant>-psc-nat-subnet` (`10.40.240.0/24`, `purpose = PRIVATE_SERVICE_CONNECT`), and the producer `<tenant>-agent-spoke-psc` service attachment with `connection_preference = ACCEPT_MANUAL` and a `consumer_accept_lists` entry for the hub project only (`connection_limit = 20`).
- **Bridge**: a reserved internal address `psc-endpoint-<tenant>-ip` (`10.10.0.50`) and the consumer forwarding rule `psc-consumer-<tenant>` targeting the spoke attachment.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform plan && terraform apply
```

The [90-Minute Master Codelab](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md) (L400) walks four modules: configure the tenant-aware router (`00:00–00:20`), wire producer attachments and consumer endpoints (`00:20–00:45`), execute `SHADOW_SYNC` + `ATOMIC_CUTOVER` (`00:45–01:10`), and verify `DRAIN_AND_VERIFY` session continuity on `sess-rs-live-upgrade-01` (`01:10–01:30`). The matching [10-slide workshop deck](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/workshop-deck-pattern-c.md) and the [`go/demos` 5-minute video script](../workstream-4-pattern-c-hybrid/4.9-go-demos-and-video-script.md) (slug `geap-multi-tenant-pattern-c-hybrid`) are ready for field delivery.

---

## 8. FinOps & SLA Outcomes

| Outcome | Standard tier (pool) | Enterprise tier (PSC spoke) | Why it holds in Pattern C |
| :--- | :--- | :--- | :--- |
| **Unit COGS** | Lowest; shared `ContextCacheConfig` yields up to **90%** savings on shared system-prompt prefixes | Dedicated runtime and quotas, zero noisy neighbours | Pooled density is never sacrificed to serve the enterprise logos |
| **Thinking budget** | `4,000` cap, enforced by clamp at Hop 3 | `8,000`, `thinking_budget_clamped is False` | Budgets live in the instance-scoped tenant profile and flip atomically on upgrade |
| **Rate limiting** | Redis RPM bulkhead | `redis_rpm_limit = 600` after promotion | Bulkhead is part of the same `replace()` profile write |
| **Data sovereignty** | Shared AlloyDB with RLS | CMEK Spoke AlloyDB in a VPC-SC project | Spoke storage is CMEK-encrypted from Phase 1 onward |
| **Network blast radius** | N/A (in-hub) | Unidirectional PSC; spoke cannot reach back into the hub | `ACCEPT_MANUAL` + hub-only accept list |
| **Upgrade SLA** | — | `0 ms` replication lag, `0` dropped sessions, same session id | Atomic route-table write, no URL or re-authentication change |

For Platform PMs the headline is commercial: an upgrade from Standard to Enterprise becomes a **same-day product action**, not a migration project. For FinOps the headline is that the long tail keeps its pooled margin while every enterprise spoke is a cleanly attributable project with its own quotas, keys and audit trail.

---

## 9. Next Steps → Workstream 5

Pattern C completes the three-topology roadmap: **Pattern A** (Milestone 1, Week 4) for maximum density, **Pattern B** (Milestone 2, Week 7) for zero-trust silos, and **Pattern C** (Milestone 3, Week 10) for intelligent routing across both. Workstream 5 consolidates them into an executive decision guide and the capstone blog:

- [`5.1-pattern-comparison-and-decision-guide.md`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md) — the topology decision tree.
- [`5.2-blog-multi-tenant-agentic-triad.md`](../workstream-5-wrap-up-and-backlog/5.2-blog-multi-tenant-agentic-triad.md) — the Multi-Tenant Agentic Triad: cost, privacy-preserving observability and zero-trust security at scale.

If you are starting from zero, run the Pattern A suite first, then the Pattern B silo tests, then this workstream's migration suite — the same `core-cymbal-agent/` engine passes all three.

---

## 10. Assets & Editable Diagrams

| Asset | Path |
| :--- | :--- |
| Figure 1 — Draw.io render | [`ws4-pattern-c-hybrid-psc-and-migration.drawio.png`](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.png) |
| Figure 1 — Editable Draw.io | [`.drawio`](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio) • [`.drawio.xml`](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.xml) |
| Figure 1 — Editable Slides | [`slides/ws4-pattern-c-hybrid-editable-slides.pptx`](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) |
| Figure 1 — Cloud Architecture Center exports | [`SVG`](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.svg) • [`PNG`](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.png) |
| Figure 1 — Vision AST (54 addressable objects) | [`vision.json`](../diagrams/vision_metadata/ws4-pattern-c-hybrid-psc-and-migration.vision.json) |
| Case study & architecture | [`4.1`](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md) |
| Hub-and-spoke demo environment | [`4.2`](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md) |
| Router, registry & migrator | [`4.3/pattern_c_hybrid_router_and_migrator.py`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) |
| Product collaboration & GA playbook | [`4.4`](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md) |
| Zero-downtime tier upgrade suite | [`4.5/run_tier_migration_suite.py`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) |
| Terraform hybrid PSC blueprint | [`4.6`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/README.md) |
| Flagship deep-dive blog | [`4.7`](../workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md) |
| Codelab & workshop deck | [`4.8`](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md) |
| `go/demos` package & video script | [`4.9`](../workstream-4-pattern-c-hybrid/4.9-go-demos-and-video-script.md) |
| Canonical reference architecture | [Multi-tenant agentic AI system — Cloud Architecture Center](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) |

*Previous in series: [Pattern B — Sovereign Silos](../workstream-3-pattern-b-siloed/3.7-blog-sovereign-silos.md). Next: [The Multi-Tenant Agentic Triad](../workstream-5-wrap-up-and-backlog/5.2-blog-multi-tenant-agentic-triad.md).*
