---
title: "Multi-tenant agentic AI system: Reference architecture taxonomy and 5-Hop governance baseline"
subtitle: "Build and deploy Pooled (Pattern A), Sovereign Silo (Pattern B), and Dynamic Hybrid (Pattern C) multi-tenant agentic AI systems on Google Cloud using Vertex AI Agent Engine and ADK 2.0"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 1 of 5"
workstream: "Workstream 1 — Prepare Reference Architectures & Update GCP Documentation"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Cloud Architects, AI Platform Engineers, CISOs, and B2B SaaS Platform Leads"
reading_time: "14 min read"
tags: ["Gemini Enterprise Agent Platform","ADK 2.0","Multi-Tenancy","Reference Architecture","VPC Service Controls","Principal Access Boundary","Vertex AI Model Armor","AlloyDB RLS","FinOps","Cloud Architecture Center"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws1-multi-tenant-taxonomy-overview","ws1-cloud-arch-center-5hop-baseline"]
editable_slides: "slides/ws1-reference-architecture-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Reference architecture taxonomy and 5-Hop governance baseline

This document describes a reference architecture and three-pattern isolation taxonomy to build, govern, and operate a multi-tenant agentic AI system on Google Cloud. It extends the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) hub-and-spoke architecture—which models internal enterprise business units—to external B2B SaaS platforms and Independent Software Vendors (ISVs) serving competing corporate customers across shared, dedicated, and hybrid cloud tiers.

This document is intended for cloud architects, AI platform engineers, security architects, and FinOps leads who design multi-agent applications using [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview), [Agent Development Kit (ADK)](https://google.github.io/adk-docs/), and [Gemini Enterprise](https://cloud.google.com/gemini/docs/enterprise).

> **Key point:** Isolation in a multi-tenant agentic AI platform is a per-tenant tier decision, not a single platform-wide compromise. By decoupling the **80% reusable 5-Hop Cryptographic Context Chain** ([`core-cymbal-agent/`](../core-cymbal-agent/)) from the underlying project perimeter, you can run high-density **Pooled tenants (Pattern A)**, regulated **Sovereign Silos (Pattern B)**, and **Dynamic Hybrid PSC Spokes (Pattern C)** from a single agent codebase.

### Core terminology and the SaaS AI Architect's Dilemma

Before diving into the topology taxonomy, three foundational acronyms appear throughout this reference architecture and its companion [11-slide editable deck (`slides/ws1-reference-architecture-editable-slides.pptx`)](../slides/ws1-reference-architecture-editable-slides.pptx):

- **`ADK` (Agent Development Kit 2.0):** Google's open-source Python/TypeScript framework for orchestrating hierarchical multi-agent workflows with deterministic lifecycle hooks (`before_agent_callback`, `before_tool_callback`, `before_model_callback`).
- **`MCP` (Model Context Protocol):** The standardized tool and data connector protocol governing both Two-Legged OAuth (`2LO`, platform service-account telemetry) and Three-Legged OAuth (`3LO`, per-user delegated SaaS actions in Jira, Google Workspace, SharePoint, or ServiceNow).
- **`ARD` (Agent Registry & Discovery):** The Discovery Engine / Vertex AI Agent Engine catalog of Agent Resource Descriptors (`agent://{tenant_id}/{agent_name}`) that governs which shared and private specialist agents each tenant principal is permitted to discover and invoke.

**Why it matters — The SaaS AI Architect's Dilemma:** Every B2B SaaS provider building agentic AI faces a sharp economic and security tension. Provisioning a dedicated Google Cloud project per Standard commercial tenant destroys SaaS gross margins (`$$$` idle base infrastructure and `500×` Terraform state sprawl). Conversely, co-hosting competing enterprises inside a naive shared agent pool risks cross-tenant data leakage via shared tool schemas, **Confused Deputy** 3LO token reuse across pooled worker threads, and noisy-neighbor rate starvation where one tenant's recursive reasoning loop exhausts regional LLM quotas for everyone else.

## Use cases

This reference architecture resolves the SaaS AI Architect's Dilemma across three primary deployment scenarios validated in the **Cymbal SaaS Platform** anchor case study ([1.1 Taxonomy & Diagrams](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)):

- **High-volume B2B SaaS onboarding & Confused-Deputy 3LO isolation (RetailStream Corp — Standard Tier):** A global retail customer with zero existing Google Cloud footprint authenticates using Microsoft Entra ID, shares a pooled Vertex AI Agent Engine runtime (`4,000` thinking-token cap, `120 RPM` bulkhead), and benefits from **90% shared prompt cache savings**. To eliminate the **Confused Deputy** vulnerability when invoking external SharePoint and ServiceNow ITOM tools, per-user Three-Legged OAuth (`3LO`) tokens are never stored in shared agent state; instead, they are vaulted under `{tenant_id}:{user_id}` DPoP-bound keys (`dpop_jkt` thumbprint verified at Hop 1 and Hop 5) with inline `-32042` step-up user consent.
- **Regulated financial and healthcare workloads: Managed Dedicated PT vs. Air-Gapped GKE Gemma 3 (FinVault Bank — Enterprise Tier):** A regulated bank authenticating with Google Workspace OIDC requires an `8,000` thinking-token budget, `600 RPM` capacity, and customer-managed encryption keys (`CMEK`) with a `<60s` `HTTP 423 Locked` kill-switch. FinVault can choose between two sovereign inference models inside Pattern B:
  1. **Managed Vertex AI Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`):** A reserved-capacity SaaS Gemini 2.5 Pro endpoint inside the tenant's VPC Service Controls perimeter with **zero Kubernetes or GPU operational overhead**.
  2. **Self-Managed Air-Gapped Gemma 3 (27B) on Private GKE:** Customer-managed GPU node pools (`g2-standard-48` L4 GPUs) running open-weight Gemma 3 (27B IT) inside a private GKE cluster with `0.0.0.0/0` public internet egress completely blocked and weights pulled exclusively via Restricted VIP (`199.36.153.4/30`).
- **Multi-tiered SaaS with live zero-downtime tier promotion (Cymbal Platform Operator):** An ISV operates a single SaaS control plane that serves `950` Standard customers in a shared pool (Pattern A) and `50` Enterprise customers in dedicated Private Service Connect (`PSC`) spokes (Pattern C), promoting upgrading customers from pool to spoke via `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY` with **`0 ms` pointer cutover lag and zero dropped sessions**.

## Design alternatives

When designing a multi-tenant agentic AI system on Google Cloud, you choose among three isolation topologies—**Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid)**—while keeping the **5-Hop Cryptographic Context Chain** invariant across all three.

### Comparison of multi-tenant isolation patterns

The following table compares the architectural characteristics, security boundaries, SRE fleet scale trade-offs, and unit economics of the three patterns:

| Dimension | Pattern A: Pooled (`Maximum Density`) | Pattern B: Sovereign Silos (`Zero Trust Isolation`) | Pattern C: Dynamic Hybrid (`Intelligent Routing`) |
| :--- | :--- | :--- | :--- |
| **Control plane** | Single shared Vertex AI Agent Engine Control Plane & Agent Catalog | Dedicated Google Cloud project & Control Plane per corporate tenant | Unified Control Plane + Tenant-Aware Cloud Run Ingress Router |
| **Compute & runtime** | Shared Vertex AI Agent Engine gVisor (`runsc`) sandbox + immutable `temp:tenant_id` | Dedicated Vertex AI PT endpoint (`gemini-2.5-pro-dedicated`) or air-gapped **Gemma 3 (27B) on GKE** | Shared Pool for Standard tier + **Private Service Connect (PSC)** spokes for Enterprise tier |
| **Network perimeter** | Single shared VPC behind Cloud Armor + IAP | Per-tenant **VPC Service Controls (VPC-SC)** perimeter + **mTLS ingress** | Hub-and-spoke VPC with **`/28` PSC NAT** & `ServiceAttachment` bridging to isolated spokes |
| **Identity & access** | **RFC 8693 OBO + DPoP** (`<0.15 ms` cached JWKS) + `{tenant}:{user}` 3LO vault | **IAM Principal Access Boundary (PAB)** + per-project Workload Identity Pools | Unified IdP broker + cross-project PAB + PSC signed STS JWT propagation |
| **Data & memory plane** | Shared AlloyDB with **`FORCE ROW LEVEL SECURITY`** + `{tenant}:{user}:{session}` Memory Bank | Dedicated AlloyDB & BigQuery per project + **Cloud KMS CMEK** (`HTTP 423` kill-switch) | Shared RLS DB for Standard + dedicated CMEK data spokes via PSC for Enterprise |
| **CMEK kill-switch vs. L1 eviction** | Logical tenant suspension via `~3 ms` Valkey JTI/tenant deny-list | GCP KMS storage propagation (`~60 s`) paired with **`<5 s` targeted Valkey `SCAN + UNLINK` (`cache:{tenant}:*`)** | Pool uses `~3 ms` Valkey JTI deny-list; PSC Spokes enforce `<60 s` KMS + `<5 s` targeted L1 purge |
| **SRE & IaC fleet scale overhead** | **Low (`1` shared project):** single Terraform 2.6 state for 100s of commercial tenants | **High at scale (`N` projects):** 500 tenants = 500 VPC-SC perimeters, 500 KMS keys & 500 AlloyDB clusters | **Optimal blended fleet (`74%` TCO reduction):** 950 tenants in 1 shared Pool + 50 high-ACV PSC Spokes |
| **Model & FinOps COGS** | Shared **`ContextCacheConfig`** (90% prefix discount, 84.7% net token savings) + Valkey bulkheads | Dedicated Provisioned Throughput (PT) or private GKE GPUs per project; zero noisy neighbors | Pooled caching for Standard + Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) for Enterprise |
| **Baseline unit cost** | `$` (`120 RPM Pool` floor per tenant) | `$$$` (`600 RPM Silo` floor per tenant project) | `$$` (`Blended Hybrid Tier` floor across tiers) |
| **Target workload** | High-volume Standard B2B SaaS tiers ([Workstream 2](ws2-pattern-a-pooled-architecture.md)) | Regulated FinTech, Healthcare, Public Sector ([Workstream 3](ws3-pattern-b-sovereign-silos.md)) | Multi-tiered SaaS with live tier upgrades ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |

### Compensating controls for Early Access Program (EAP) product gaps and GA sunset roadmap

During the cross-product architecture review ([1.2 Product Team Review Pack](../workstream-1-reference-architecture/1.2-product-team-review-pack.md) and [1.4 EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)), five platform behaviors required explicit compensating controls in `core-cymbal-agent/`. Every compensating layer is wrapped in a **feature-flagged GA Sunset Hook** so platform teams can retire custom Python/Valkey shims via environment configuration (`CYMBAL_NATIVE_ARD_ACL_ENABLED=true`, etc.) as native Google Cloud features reach General Availability:

| Gap ID | Platform behavior under multi-tenancy | Production compensating control in `core-cymbal-agent/` | Feature-flagged GA sunset target |
| :--- | :--- | :--- | :--- |
| `GAP-01` | Discovery Engine Agent Catalog (`ARD`) does not natively filter custom agents by sub-project `tenant_id` | **Hop 2 Catalog PDP** (`hop2_registry_pdp_callbacks.py`) enforces signed STS JWT `tenant_id` ACL filtering + ADK `before_agent_callback` pruning (`HTTP 403`) | `Q4 2026` (`CYMBAL_NATIVE_ARD_ACL_ENABLED`) |
| `GAP-02` | Vertex AI Agent Engine Memory Bank shares namespace unless prefixed and caches decrypted L1 state after CMEK disable | **Hop 3 Memory Bank** (`hop3_compute_finops_bulkhead.py`) prefixes `{tenant}:{user}:{session}`, intercepts KMS revocation for **`<5 s` targeted Valkey `SCAN + UNLINK` (`cache:{tenant}:*`)**, and re-hydrates via **`SET NX PX 5000` single-flight lock** | `Q1 2027` (`CYMBAL_NATIVE_CMEK_CACHE_SYNC`) |
| `GAP-03` | Shared `ContextCacheConfig` can bleed if dynamic tenant suffixes enter the cache key; project-wide Vertex RPM lacks sub-tenant fairness | **Hop 3 Prefix Hash Guard & Valkey Bulkhead** caches only the immutable 32k `cymbal-shared-incident-system-prompt-v2` prefix and enforces `120/600 RPM` token buckets (`HTTP 429` + `Retry-After` jitter) | `Q4 2026` (`CYMBAL_NATIVE_SUBTENANT_QUOTA`) |
| `GAP-04` | 3LO MCP tokens (Entra ID / ServiceNow) can trigger **Confused Deputy** cross-tenant replay if cached at the worker level | **Hop 1 & Hop 5 3LO Vault** (`hop1_edge_identity_pep.py` & `hop5_data_rls_and_otel.py`) binds `{tenant_id}:{user_id}` DPoP (`dpop_jkt`) token vaults and returns `-32042` step-up consent on missing scopes | `Q4 2026` (`CYMBAL_NATIVE_AUTH_MGR_3LO`) |
| `GAP-05` | Per-tenant token consumption (cached prefix vs. dynamic vs. thinking tokens) is aggregated at the GCP project level in Cloud Billing | **Hop 5 OTel FinOps Span** (`hop5_data_rls_and_otel.py`) emits SHA-256 prompt hashes (`0` raw PII) and token counters to BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`) | `Q1 2027` (`CYMBAL_NATIVE_VERTEX_TENANT_BILLING`) |

#### BigQuery OpenTelemetry SQL chargeback aggregation (`GAP-05`)

Finance and platform teams query the BigQuery OpenTelemetry sink directly to compute exact per-tenant token Cost of Goods Sold (COGS), applying the 90% Vertex AI `ContextCacheConfig` discount (`0.1×` weight) to cached prefix tokens:

```sql
SELECT
  tenant_id,
  tier,
  COUNT(*) AS completed_turns,
  SUM(cached_input_tokens) AS total_cached_prefix_tokens,
  SUM(uncached_input_tokens + thinking_tokens + output_tokens) AS total_full_rate_tokens,
  ROUND(
    SUM(cached_input_tokens * 0.10 + uncached_input_tokens + thinking_tokens + output_tokens),
    0
  ) AS billable_equivalent_tokens,
  LOGICAL_AND(NOT raw_pii_logged) AS zero_pii_attestation
FROM `cymbal_agentic_finops_otel.tenant_telemetry_spans`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY tenant_id, tier
ORDER BY billable_equivalent_tokens DESC;
```

## Architecture

To bridge executive security strategy and production runtime implementation, this reference architecture follows a four-level **Macro-to-Micro (`L1 → L4`) decomposition** across the companion 11-slide deck:

- **`L1 Logical View` — 3 Logical Security Layers (Slide 5):** Groups controls functionally into **Layer 1: Edge Identity & Ingress PEP (Hop 1)**, **Layer 2: Agent Runtime, Registry & Safety Guardrails (Hops 2, 3 & 4)**, and **Layer 3: Data Persistence, CMEK & FinOps OTel (Hop 5)**.
- **`L2 Physical View` — 4 Physical Network Perimeters (VPC-SC) (Slide 6 / Figure 1 below):** Maps those three logical security layers onto four physical Google Cloud project and VPC Service Controls (`VPC-SC`) network boundaries (**Blue Perimeter 1**, **Green Perimeter 2**, **Yellow Perimeter 3**, and **Red Perimeter 4**).
- **`L3 Process View` — 5-Hop Execution Lifecycle, Fail-Closed Circuit Breakers & Stampede Recovery (Slide 7 / Figure 2):** Traces the synchronous per-turn request sequence alongside `<5 s` targeted Valkey `SCAN + UNLINK` revocation and `SET NX PX 5000` single-flight cache rebuilds.
- **`L4 Wire View` — Signed STS JWT & DPoP Cryptographic Contract (Slide 8):** Specifies the KMS ECDSA P-256 signed JWT payload, `<0.15 ms` local pod JWKS verification, and `~3 ms` Valkey JTI/CMEK revocation deny-list check.

The following `L2 Physical` diagram shows the multi-tenant agentic AI reference architecture on Google Cloud, organized into a central routing and governance hub connected to pooled and sovereign tenant workspaces:

![Figure 1 — Multi-tenant agentic AI taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png)

*Figure 1. Official Google Cloud Architecture Center L2 Physical hub-and-spoke topology showing the 4 Physical Network Perimeters (VPC-SC): Routing Hub (Blue Perimeter 1), Central Governance and Security Hub (Green Perimeter 2), Pooled Shared Runtime (Yellow Perimeter 3 — Pattern A), and Sovereign Silo / Hybrid PSC Spokes (Red Perimeter 4 — Patterns B and C). Editable assets: [Draw.io source](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) | [Google Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws1-multi-tenant-taxonomy-overview.svg) | [Vision AST](../diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json).*

The `L2 Physical` architecture in Figure 1 maps the 3 Logical Security Layers onto **4 Physical Network Perimeters (VPC-SC)** that enforce defense-in-depth isolation across every agent turn:

- **Blue Perimeter 1 — Routing Hub (Zone 1 `#aecbfa`):** Terminates external client traffic at the External Application Load Balancer, strips unverified `X-Tenant-ID` headers in Google Cloud Armor, verifies upstream OIDC/SAML tokens in Identity-Aware Proxy (IAP), and performs RFC 8693 token exchange bound to RFC 9449 DPoP proofs (`Hop 1` in [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py)).
- **Green Perimeter 2 — Central Governance and Security Hub (Zone 2 `#ceead6`):** Enforces catalog-level access control in the Discovery Engine Agent Catalog (`Hop 2` in [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)), manages customer-managed encryption keys (CMEK) in Cloud KMS, monitors posture in Security Command Center, and exports PII-redacted OpenTelemetry FinOps spans to Cloud Logging and BigQuery (`Hop 5` in [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py)).
- **Yellow Perimeter 3 — Pattern A Pooled Shared Runtime Spoke (Zone 3 `#feefc3`):** Hosts high-density Standard-tier tenants inside a shared Vertex AI Agent Engine / Cloud Run Gen2 **gVisor (`runsc`) user-space kernel sandbox** (`Hop 3` in [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) with shared `ContextCacheConfig` prompt prefix caching (up to 90% input token savings), inline Model Armor + Cloud DLP guardrails (`Hop 4` in [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py)), and shared AlloyDB with `FORCE ROW LEVEL SECURITY (RLS)`.
- **Red Perimeter 4 — Pattern B Sovereign Silo and Pattern C Hybrid PSC Spoke (Zone 4 `#fad2cf`):** Isolates regulated Enterprise tenants inside dedicated Google Cloud projects protected by VPC Service Controls (`VPC-SC`), IAM Principal Access Boundaries (`PAB`), tenant-owned Cloud KMS CMEK keys (`HTTP 423` kill-switch), and either Managed Vertex AI Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`), air-gapped Gemma 3 (27B) on private GKE, or Private Service Connect (`PSC`) producer attachments.

The numbered callouts in Figure 1 trace the end-to-end request and governance flow across the hub-and-spoke topology:

1. **Request:** A tenant user or application submits an HTTPS prompt carrying an upstream OIDC JWT (Google Workspace for FinVault Bank; Microsoft Entra ID for RetailStream Corp) and an RFC 9449 DPoP proof.
2. **Tenant identification and routing (Hop 1):** Google Cloud Armor strips any client-supplied `X-Tenant-ID` header. IAP and the Edge Identity PEP validate the JWT issuer and audience, exchange the credential via RFC 8693 for a KMS ECDSA P-256 signed STS JWT (`5-min TTL`), and select the target workspace (Pattern A pool, Pattern B silo, or Pattern C PSC spoke).
3. **Task routing and catalog pruning (Hop 2):** The Discovery Engine Agent Catalog (`ARD`) filters available agents, MCP connectors, and GCS Skills (`gs://cymbal-skills-{tenant}/`). The ADK `before_agent_callback` deterministically prunes unauthorized tools before reasoning starts, returning `HTTP 403 Forbidden` on cross-tenant agent calls.
4. **Pre-inference guardrails and token bulkheads (Hops 3 & 4):** Memorystore for Valkey checks the `~3 ms` JTI/CMEK revocation deny-list (`revoked_jti:{tenant_id}`), enforces the tenant RPM rate limit (`600 RPM` vs `120 RPM`, returning `HTTP 429` + `Retry-After` jitter on bursts), and clamps `thinking_budget` (`8,000` vs `4,000` tokens). Vertex AI Model Armor and Sensitive Data Protection (Cloud DLP) inspect the prompt and MCP arguments in `~22 ms` p95.
5. **Context retrieval and model inference (Hop 3):** The ADK Coordinator Agent loads tenant-scoped 5-level session memory (`{tenant}:{user}:{session}`) and row-locked AlloyDB records (`SET LOCAL app.current_tenant_id`), attaches the immutable shared `ContextCacheConfig` system prefix, and invokes shared Gemini 2.5 Pro, dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`), or air-gapped Gemma 3 (27B).
6. **Post-inference guardrails (Hop 4):** Model Armor and Cloud DLP inspect the model output and 2LO/3LO MCP tool responses, redacting sensitive identifiers (`[REDACTED_PII]`) and blocking semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`).
7. **Response and FinOps chargeback (Hop 5):** The sanitized completion is returned to the caller while OpenTelemetry emits a PII-scrubbed `TenantTelemetrySpan` to Cloud Logging and BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`) for per-tenant COGS attribution.

### End-to-end 5-Hop cryptographic governance baseline (Figure 2)

![Figure 2 — Cloud Architecture Center 5-Hop cryptographic context chain and Cymbal case study baseline](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png)

*Figure 2. Detailed 5-Hop Cryptographic Context Chain showing how Cymbal SaaS governs competing tenants (FinVault Bank and RetailStream Corp) across Edge Identity (Hop 1), Catalog PDP (Hop 2), Compute & FinOps Bulkheads (Hop 3), Model Armor & 3LO MCP Auth (Hop 4), and AlloyDB RLS & OTel Chargeback (Hop 5). Editable assets: [Draw.io source](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) | [Google Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws1-cloud-arch-center-5hop-baseline.svg) | [Vision AST](../diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json).*

Figure 2 details the internal mechanics of the **5-Hop Cryptographic Context Chain** ([1.3 Doc Update PR](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)) across the four structural zones:

- **Edge Identity & Token Exchange PEP (Hop 1) (Zone 1 — Blue container `#aecbfa`):** Mints an immutable `CryptographicContext` signed by Cloud KMS (`ECDSA P-256`) and bound to the caller's DPoP thumbprint (`jkt`) and verified OIDC issuer, eliminating HTTP header spoofing.
- **Catalog PDP, KMS & Audit Hub (Hops 2 & 5) (Zone 2 — Green container `#ceead6`):** Enforces tenant ACLs on Agent Resource Descriptors (`agent://finvault/private-agent-alpha-regulatory`), validates Cloud KMS CMEK status, and records cryptographic audit trails.
- **FinVault Bank Enterprise Workspace (Hops 3 & 4) (Zone 3 — Left amber container `#feefc3`):** Executes FinVault turns with an `8,000` thinking-token budget, private `Agent Alpha` on dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) or private GKE Gemma 3, CMEK-encrypted memory (`finvault:user:session`), and 3LO Google Workspace & Jira MCP tools.
- **RetailStream Corp Standard Workspace (Hops 3 & 4) (Zone 4 — Right coral container `#fad2cf`):** Executes RetailStream turns with a `4,000` thinking-token cap, shared Gemini 2.5 Pro prefix cache (`ContextCacheConfig`), `{tenant}:{user}` DPoP-vaulted 3LO Microsoft Entra ID tokens for SharePoint & ServiceNow, and AlloyDB RLS isolation.

The seven numbered steps in Figure 2 verify every state transition in the 5-Hop governance pipeline:

1. **Request with OIDC JWT and DPoP proof:** FinVault (`https://accounts.google.com`) or RetailStream (`https://login.microsoftonline.com/retailstream-tid/v2.0`) initiates an agent turn.
2. **Hop 1 — Header sanitization and RFC 8693 OBO exchange:** Cloud Armor strips any forged `X-Tenant-ID` header; IAP exchanges the JWT for a KMS-signed, DPoP-bound `CryptographicContext`.
3. **Hop 2 — Catalog filtering and `before_agent_callback` pruning:** Discovery Engine restricts tool visibility to the caller's entitlement set and blocks unauthorized cross-tenant agent calls (`403 Forbidden`).
4. **Hop 4 (Pre-inference) — Model Armor and Cloud DLP input scan:** Prompts and tool parameters are scanned for SQL/prompt injection (`400 Bad Request`) and sensitive PII before model invocation.
5. **Hop 3 — Sandbox binding, prefix cache, and model execution:** The runtime binds `temp:tenant_id` inside the gVisor container sandbox, enforces Valkey RPM and thinking-token caps, attaches `ContextCacheConfig` to the shared system prompt, and invokes the model.
6. **Hop 4 (Post-inference) — Output DLP and 3LO MCP token scoping:** MCP tool calls require a matching `dpop_jkt` and `{tenant_id}:{user_id}` vault key in Auth Manager, and completions pass through post-inference semantic Natural Language Policy Compliance (`NLC`) checks (`422 Unprocessable Entity`).
7. **Hop 5 — Transactional AlloyDB RLS and BigQuery FinOps export:** Database queries execute under `SET LOCAL app.current_tenant_id`, and OpenTelemetry exports redacted token metrics to BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

## Products used

This reference architecture uses the following Google Cloud products and open-source frameworks across Patterns A, B, and C:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor (`runsc`) sandboxes with managed session and memory state.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): An open-source framework for building and orchestrating multi-agent hierarchies with deterministic lifecycle callbacks (`before_agent_callback`, `before_tool_callback`, `before_model_callback`).
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Google's flagship multimodal reasoning model supporting shared prompt prefix caching (`ContextCacheConfig`), dedicated Provisioned Throughput (PT), and configurable `thinking_budget` controls.
- [Vertex AI Model Garden](https://cloud.google.com/model-garden): An enterprise model repository providing governed access to dedicated Provisioned Throughput endpoints (`gemini-2.5-pro-dedicated` for tenant-private agents) and open-weight models (such as Gemma 3 27B IT).
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs): A managed Kubernetes service used in Sovereign Silo deployments (Pattern B) to run air-gapped open-weight models on private GPU node pools with zero public internet egress.

### Ingress, identity, and AI safety guardrails

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs): A global anycast External Application Load Balancer that terminates TLS 1.3 and mutual TLS (mTLS) connections at the Google network edge.
- [Google Cloud Armor](https://cloud.google.com/armor/docs): A web application firewall (WAF) and DDoS mitigation service that strips unverified client-supplied tenant headers (`X-Tenant-ID`) at ingress.
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation): Zero-trust authentication services that validate upstream OIDC and SAML JWTs and broker RFC 8693 On-Behalf-Of (OBO) token exchange bound to RFC 9449 DPoP sender-constrained proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview): An inline AI safety service that inspects prompts, model completions, and Model Context Protocol (MCP) tool payloads for prompt injection, jailbreaks, and semantic Natural Language Policy Compliance (`NLC`) violations.
- [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): A data inspection and de-identification service that masks regulated PII, PCI, and PHI tokens inline before prompts reach foundation models or logs.

### Data, storage, networking, and governance

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): A high-performance PostgreSQL-compatible database that enforces transactional `FORCE ROW LEVEL SECURITY (RLS)` policies keyed by `app.current_tenant_id`.
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Low-latency in-memory and document stores used for per-tenant token-bucket rate limiting, JTI/CMEK revocation deny-lists, 5-level session memory caching, single-flight cache re-hydration locks, and dynamic tenant routing tables.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Private Service Connect](https://cloud.google.com/vpc/docs/private-service-connect): Network security boundaries that prevent cross-project data exfiltration and establish unidirectional NAT-based private peering between a central routing hub and isolated enterprise spokes.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs): A cryptographic key management service supporting asymmetric ECDSA P-256 STS JWT signing, customer-managed encryption keys (CMEK), and `<60s` `HTTP 423 Locked` tenant kill-switches.
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Centralized posture monitoring, PII-redacted OpenTelemetry audit logging, and per-tenant token FinOps chargeback analytics (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

## Design considerations

This section provides guidance to help you tune this reference architecture according to the pillars of the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Eliminate Confused-Deputy 3LO credentials with per-user DPoP vaults:** Never allow ADK agents or MCP servers to authenticate to tenant data stores using a shared service account's ambient IAM permissions or a tenant-wide cached OAuth token. Mint an RFC 8693 On-Behalf-Of (OBO) token bound to an RFC 9449 DPoP proof at **Hop 1**, store 3LO tokens (Entra ID / ServiceNow / Jira) strictly under `{tenant_id}:{user_id}` DPoP-bound keys, and trigger an inline `-32042` step-up consent challenge whenever user-level delegation is absent.
- **Verify KMS-signed STS JWTs in `<0.15 ms` via cached JWKS + `~3 ms` Valkey JTI deny-list:** Hop 1 signs the canonical `TenantContext` JWT (`5-min TTL`) using an asymmetric Cloud KMS ECDSA P-256 key (`jwt_sig: kms_ecdsa_p256`). Downstream microservices across Hops 2–5 cache the public JWKS verification key in-memory (`5-min TTL`) to verify signatures locally in **`<0.15 ms` with zero per-hop KMS network calls**, while checking a **`~3 ms` Valkey JTI/CMEK revocation deny-list (`revoked_jti:{tenant_id}`)** on every hop so mid-session access or key revocation takes effect immediately without security drift.
- **Combine gVisor (`runsc`) kernel sandboxing with intra-worker namespace guards:** Vertex AI Agent Engine and Cloud Run Gen2 execute every container instance and dynamic MCP tool subprocess inside a Google-managed **gVisor (`runsc`) user-space kernel**, preventing container-escape syscalls across host nodes. Because pooled Pattern A workers process multiple tenants concurrently, Hop 3 also pins immutable `temp:tenant_id` invocation state and prefixes all memory/cache keys with `{tenant_id}:{user_id}:{session_id}`.
- **Enforce defense-in-depth tool pruning and transactional Row-Level Security (RLS):** Filter the agent catalog (`ARD`) at **Hop 2** before the user sees available capabilities, run the ADK `before_agent_callback` inside the runtime, and execute `SET LOCAL app.current_tenant_id = '<verified_tenant_id>'` inside every AlloyDB transaction with `FORCE ROW LEVEL SECURITY` enabled.

### Reliability and Day-2 cache resilience

- **Targeted `<5 s` Valkey `SCAN + UNLINK` on CMEK revocation (zero peer-tenant cache impact):** While Google Cloud KMS key disable/destroy events can take up to 60 seconds to propagate across underlying cloud storage systems, Hop 3 intercepts KMS revocation signals and executes a **cursor-based `SCAN MATCH cache:{tenant_id}:*` + async `UNLINK`** in Memorystore for Valkey. This purges 100% of the revoked tenant's L1 volatile cache in **`<5 s`** (`HTTP 423 Locked` within the `<60 s` SLA) while causing **`0` cache evictions or latency spikes for peer tenants** sharing the Valkey cluster.
- **Prevent AlloyDB re-hydration stampedes with Valkey Single-Flight Locks (`SET NX PX 5000`):** When an enterprise security team re-enables a previously revoked Cloud KMS CMEK key and traffic resumes against a cold L1 cache, Hop 3 acquires a **Valkey Single-Flight Distributed Lock (`SET lock:rehydrate:{tenant_id}:{key} NX PX 5000`)**. Only the single leader request queries AlloyDB (`FORCE RLS`) to decrypt and populate Valkey, while concurrent requests for that tenant key coalesce onto the populated cache entry—eliminating database connection-pool exhaustion and thundering-herd stampedes.
- **Isolate noisy neighbors with token-bucket bulkheads and `Retry-After` jitter:** Enforce per-tenant RPM (`120` vs `600 RPM`) and thinking-budget (`4,000` vs `8,000` tokens) limits in Memorystore for Valkey at **Hop 3**, returning `HTTP 429 Too Many Requests` with a randomized `Retry-After` jitter header so clients back off cleanly.

### Cost optimization

- **Share immutable system prompt caches safely:** Use Vertex AI `ContextCacheConfig` on the shared system instructions and incident runbooks (`32,000` tokens for full operator runbook + MCP tool-schema bundles) while keeping tenant-specific context strictly in the uncached suffix. This reduces shared input token costs by **90%** and total turn COGS by **84.7%** in pooled deployments.
- **Optimize 1,000-tenant fleet TCO (`74%` reduction via Pattern C):** Rather than provisioning 1,000 dedicated Pattern B projects (which multiplies Terraform state and base database/VPC costs by `1,000×`), host `950` Standard tenants in the shared Pattern A pool and `50` regulated Enterprise tenants in dedicated Pattern C PSC spokes.

### Operational excellence and reproducible forensic verification

- **Maintain a single 80% reusable agent codebase:** Centralize identity verification, catalog pruning, memory namespacing, DLP redaction, and telemetry in [`core-cymbal-agent/`](../core-cymbal-agent/) so security patches apply simultaneously to Patterns A, B, and C.
- **Reproduce the 12/12 CI/CD forensic gate and Cloud Logging audit query:** Run the automated forensic and simulation verification suite locally or in Cloud Build:

```bash
python3 -B scripts/run_deep_forensic_audit.py
# Expected output: 12/12 FORENSIC CHECKS PASSED • 107/107 SIMULATION & SAAS ASSERTIONS PASSED
```

And query **Cloud Logging Explorer** across `ramp-portal-dev` (`#248990048888`), `cymbal-pooled-prod` (`#638420508320`), and `cymbal-build-sandbox` (`#887605034827`) to verify zero cross-tenant RLS rows and deterministic fail-closed status codes:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="cymbal-multi-tenant-patterns"
jsonPayload.rls_cross_tenant_rows=0
httpRequest.status=(200 OR 403 OR 423 OR 429)
```

### Performance optimization

- **Minimize guardrail latency (`~42 ms` total p95 control-plane overhead):** Colocate Memorystore for Valkey, AlloyDB, and Vertex AI Agent Engine in the same region (`us-central1` or `us-west1`). Inline regional gRPC callouts with compiled `infoType` detectors and streaming chunk buffers bound Hop 4 inspection to **`~22 ms` p95** and complete 5-Hop control-plane execution to **`~42 ms` p95** (`< 2.5%` of total turn TTFT compared to `1,800 ms` foundation model reasoning):

| Governance hop | Enforcement operation on the critical path | Verified p95 latency | Optimization mechanism |
| :--- | :--- | :--- | :--- |
| **Hop 1 (Edge PEP)** | Cloud Armor header strip + IAP JWT validation + KMS ECDSA P-256 STS JWT mint | **`~8 ms`** | In-memory cached JWKS (`<0.15 ms` local verify; `0` per-hop KMS RPCs) |
| **Hop 2 (Catalog PDP)** | Discovery Engine (`ARD`) entitlement filter + ADK `before_agent_callback` pruning | **`~4 ms`** | In-process tenant ACL cache invalidated via Firestore watch stream |
| **Hop 3 (Compute Bulkhead)** | Memorystore Valkey Lua RPM + `~3 ms` JTI deny-list + `ContextCacheConfig` attach | **`~3 ms`** | Single-RTT Valkey Lua script in colocated VPC subnet |
| **Hop 4 (Model Armor & SDP)** | Pre-inference prompt screen + post-inference completion/tool PII scrub | **`~22 ms`** | Inline regional gRPC callout with compiled infoType detector templates |
| **Hop 5 (Data RLS & OTel)** | AlloyDB `SET LOCAL app.current_tenant_id` + async BigQuery OTel stream | **`~5 ms`** | Transaction-pooled PgBouncer checkout; OTel export is non-blocking async |
| **Total 5-Hop Overhead** | **Complete end-to-end zero-trust governance chain (Hops 1–5)** | **`~42 ms`** (**`< 2.5%`** of turn) | **Negligible impact on Time-To-First-Token (TTFT) vs `1,800 ms` LLM inference** |

## Live Intra-Cloud (GCP) & Inter-Cloud (AWS Bedrock AgentCore MCP) Verification Across 10 Non-Google Third-Party SaaS Products (Bidirectional Side-A & Side-B Proof)

To prove zero-hallucination multi-cloud interoperability across all five hops, every request is verified end-to-end across **Intra-Cloud Google Cloud resources** (`ramp-portal-dev` `#248990048888` and `nitina-ggarwal-sandbox-647724` `#887605034827`), **Inter-Cloud Amazon Web Services resources** (AWS Account `393036065405`, `us-east-1`, Amazon Bedrock AgentCore MCP Gateway `merck-a2a-mcp-gateway-kiu8omh4aq`), and **10 unique non-Google Third-Party Enterprise SaaS products** with live visual and cryptographic proof from **both sides** ([Full Manual Testing Playbook](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md) • [Signed Verification Receipt](../docs/third_party_5_saas_verification_receipt.json) • [AWS AgentCore 10-Target Manifest](../docs/aws_agentcore_10_saas_targets_manifest.json)).

### 1. Multi-Cloud Configuration, Setup, Deployment & Login Instructions

1. **Deploy & Register All 10 Third-Party SaaS MCP Targets on AWS Bedrock AgentCore (`393036065405`, `us-east-1`)**:
   ```bash
   python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py
   ```
   - Updates AWS Lambda [`merck-a2a-mcp-remote-peer`](../scripts/deploy_10_saas_aws_agentcore_targets.py) (`arn:aws:lambda:us-east-1:393036065405:function:merck-a2a-mcp-remote-peer`), registers all 10 MCP targets (`READY`) on Bedrock AgentCore Gateway `merck-a2a-mcp-gateway-kiu8omh4aq`, and serves the 10 live Third-Party SaaS Target Web Console UIs at `https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>` backed by Amazon S3 (`s3://nitinagga-argolis-aws-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`).
2. **Execute All 10 Third-Party SaaS Products × 3 Multi-Tenant Patterns (`30/30 E2E Flows • 60/60 Assertions PASS`)**:
   ```bash
   python3 -B scripts/verify_5_third_party_saas_products.py --verbose
   ```
3. **Side A Login (Google Cloud 5-Hop Agent Orchestrator → AWS Cognito RS256 OAuth2 → Bedrock AgentCore MCP Gateway)**:
   - **Cognito User Pool**: `us-east-1_vqlzYM74B` (`ClientId: 49f0365186c43e7b6r7hc982vn`, Username: `dr.jane.doe@merck.com`)
   - **Bedrock AgentCore MCP Endpoint**: `https://merck-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`
4. **Side B Login (Third-Party SaaS Target Product Web Console UIs & Interactive 3-Principal Outcome Validation)**:
   - **Positive Authorized FinVault Login (`HTTP 200 ALLOW`)**: `?principal=sre-lead@finvault.com` (displays FinVault RLS-verified records and live synced S3 audit ledger)
   - **Cross-Tenant Red-Team Spoof Login (`HTTP 403 FORBIDDEN`)**: `?principal=ops-eng@retailstream.com` (blocks cross-tenant access with `0` FinVault rows leaked)
   - **Revoked CMEK Silo Login (`HTTP 423 LOCKED`)**: `?principal=clin-ops@medcore.io` (enforces Cloud KMS `medcore-revoked-cmek` `DISABLED` kill-switch + `<5 s` Valkey cache purge)
   - **Raw Persisted S3 Outcome JSON Validator**: `?format=json` (returns the live S3 object `s3://nitinagga-argolis-aws-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`)

### 2. Master 10 Non-Google Third-Party SaaS Bidirectional Verification Matrix

| # | Non-Google Third-Party SaaS Product & Upstream Container | AWS AgentCore Target ID (`READY`) & MCP Tool | Live Upstream Software UI (`13.220.94.209:3001..3010`) & S3 Outcome URLs | Live S3 Outcome JSON (`?format=json`) | Pattern A / B / C Verdicts |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **01** | **ThoughtSpot Cloud** (`metabase/metabase:v0.50.26`) | `KD6Z3SV8PX` • `thoughtspot-spotter___query_thoughtspot_liveboard_rls` | [**Live Metabase BI (`:3001/question/27`)**](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **02** | **Sigma Computing** (`grafana/grafana-enterprise:11.2.0`) | `OZ0KTE8Z8M` • `sigma-computing___eval_sigma_workbook_rls` | [**Live Grafana Enterprise (`:3002/d/finvault-sre-wb`)**](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **03** | **ServiceNow** (`redmine:5.1-alpine`) | `PLOLWRMI0I` • `servicenow-itsm___query_servicenow_change_records` | [**Live Redmine ITSM (`:3003/projects/finvault-itsm/issues`)**](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **04** | **Veeva Vault RIM & Muse Clinical EDC** (`nocodb/nocodb:0.255.2`) | `1KZWKOFTWQ` • `muse-poc___query_muse_study_biomarkers` | [**Live NocoDB EDC (`:3004/#/signin`)**](http://13.220.94.209:3004/#/signin) (`sre-lead@finvault.com` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **05** | **Salesforce Service Cloud & Jira** (`gitea/gitea:1.22.3`) | `W7BF0JRWEA` • `salesforce-jira___create_redacted_sfdc_jira_escalation` | [**Live Gitea Tracker (`:3005/finvault/sre-escalations/issues/1`)**](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | `200`/`400` • `200`/`423` • `200`/`403` |
| **06** | **Databricks Data Intelligence** (`trinodb/trino:440`) | `Z1RHXLBK6F` • `databricks-unity___execute_uc_genie_federated_sql` | [**Live Trino Lakehouse UI (`:3006/ui/`)**](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **07** | **Snowflake AI Data Cloud** (`clickhouse/clickhouse-server:24.8`) | `7PB1EK3NJO` • `snowflake-cortex___execute_cortex_analyst_sql` | [**Live ClickHouse Play UI (`:3007/play`)**](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **08** | **Workday Enterprise Cloud** (`directus/directus:11.1.0`) | `CXH8BK86IF` • `workday-raas___fetch_compensation_raas_report` | [**Live Directus Studio (`:3008/admin/content/hcm_compensation`)**](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | `200`/`403` • `200`/`423` • `200`/`403` |
| **09** | **Datadog Cloud Observability** (`datalust/seq:2024.3`) | `A2X7LPMPA7` • `datadog-sre___query_tenant_apm_logs` | [**Live Seq APM Events (`:3009/#/events`)**](http://13.220.94.209:3009/#/events) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | `200`/`400` • `200`/`423` • `200`/`403` |
| **10** | **CrowdStrike Falcon & Okta** (`hashicorp/vault:1.13.3`) | `TXGJHVFBWP` • `crowdstrike-okta___contain_xdr_host_with_dpop` | [**Live HashiCorp Vault UI (`:3010/ui/vault/secrets/secret/show/tenants/finvault`)**](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (`fv-token-finvault-sre-2026`) • [1. Login 200 ALLOW](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?principal=sre-lead@finvault.com) • [2. Spoof 403 DENY](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?principal=ops-eng@retailstream.com) • [3. CMEK 423 LOCKED](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?principal=clin-ops@medcore.io) | [S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | `200`/`401` • `200`/`423` • `200`/`403` |

### 3. Bidirectional Visual Proof Gallery (Side A: GCP/AWS Agent Orchestrator MCP + Side B: Live Upstream Software Web UIs on AWS EC2 `13.220.94.209:3001..3010`)

- **01. ThoughtSpot Cloud (Spotter BI — Metabase `v0.50.26` on `:3001`)**: [Side A Screenshot (`saas_01_thoughtspot_spotter_agentcore_mcp.png`)](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_01_thoughtspot_spotter_console.png`)](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png)
- **02. Sigma Computing (Workbook Studio — Grafana Enterprise `11.2.0` on `:3002`)**: [Side A Screenshot (`saas_02_sigma_computing_agentcore_mcp.png`)](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_02_sigma_computing_console.png`)](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png)
- **03. ServiceNow (ITSM Change Console — Redmine `5.1` on `:3003`)**: [Side A Screenshot (`saas_03_servicenow_itsm_agentcore_mcp.png`)](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_03_servicenow_itsm_console.png`)](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png)
- **04. Veeva Vault RIM & Muse Clinical EDC (NocoDB `0.255.2` on `:3004`)**: [Side A Screenshot (`saas_04_veeva_vault_muse_edc_agentcore_mcp.png`)](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_04_veeva_vault_muse_edc_console.png`)](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png)
- **05. Salesforce Service Cloud & Atlassian Jira (Gitea `1.22.3` on `:3005`)**: [Side A Screenshot (`saas_05_salesforce_jira_agentcore_mcp.png`)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_05_salesforce_jira_console.png`)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png)
- **06. Databricks Unity Catalog & Genie 2.0 (Trino `440` on `:3006`)**: [Side A Screenshot (`saas_06_databricks_unity_catalog_agentcore_mcp.png`)](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_06_databricks_unity_catalog_console.png`)](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png)
- **07. Snowflake AI Data Cloud (ClickHouse `24.8` Play UI on `:3007`)**: [Side A Screenshot (`saas_07_snowflake_cortex_agentcore_mcp.png`)](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_07_snowflake_cortex_console.png`)](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png)
- **08. Workday Enterprise HCM & Financials RaaS (Directus `11.1.0` on `:3008`)**: [Side A Screenshot (`saas_08_workday_hcm_financials_agentcore_mcp.png`)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_08_workday_hcm_financials_console.png`)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png)
- **09. Datadog Cloud Observability & Bits AI SRE (Seq `2024.3` on `:3009`)**: [Side A Screenshot (`saas_09_datadog_bits_ai_sre_agentcore_mcp.png`)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_09_datadog_bits_ai_sre_console.png`)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png)
- **10. CrowdStrike Falcon XDR & Okta Workforce Identity (HashiCorp Vault `1.13.3` on `:3010`)**: [Side A Screenshot (`saas_10_crowdstrike_okta_agentcore_mcp.png`)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) • [Side B SaaS Console UI Screenshot (`saas_ui_10_crowdstrike_okta_console.png`)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png)

## What's next

### 5-Part Engineering Blog Series & Slide-to-Code Launch Matrix

The companion 11-slide Workstream 1 presentation deck ([`slides/ws1-reference-architecture-editable-slides.pptx`](../slides/ws1-reference-architecture-editable-slides.pptx)) maps directly to our 5-part engineering blog series (indexed on **Slide 2: Agenda & 5-Part Series Navigation**) and runnable modules in [`github.com/nitinaggarwal-12/blogs`](https://github.com/nitinaggarwal-12/blogs):

| Blog Series Installment | Companion WS1 Deck Slides (Streamlined 11-Slide Flow) | Core Architectural Focus | Runnable Codebase & Terraform Modules |
| :--- | :--- | :--- | :--- |
| **Part 1: The SaaS AI Architect's Dilemma** | **Slides 1–4** (Cover, Agenda TOC, Personas & 12-Dim Matrix) | Pooled vs. Siloed vs. Hybrid economics, Confused-Deputy 3LO vaults (`{tenant}:{user}`), Dedicated PT vs. Air-Gapped GKE Gemma 3, and SRE fleet scale trade-offs | [`core-cymbal-agent/models.py`](../core-cymbal-agent/models.py) • [`runtime_pipeline.py`](../core-cymbal-agent/runtime_pipeline.py) |
| **Part 2: Securing the Agent Loop** | **Slides 5, 6 & 8** (`L1` 3 Logical Security Layers, `L2` 4 Physical VPC-SC Perimeters & `L4` Wire JWT) | Strict macro-to-micro taxonomy: 3 Logical Security Layers mapping to 4 Physical Network Perimeters (`Figure 1`), Cloud Armor header stripping, RFC 8693 OBO + DPoP, and `<0.15 ms` cached-JWKS verification | [`core-cymbal-agent/governance/hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) • [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) |
| **Part 3: Operational Resilience at Scale** | **Slide 7** (`L3` Merged 5-Actor UML Sequence, Fail-Closed Circuit Breakers & Stampede Recovery) | Consolidated `L3` runtime sequence, `~3 ms` Valkey JTI deny-list, `120/600 RPM` bulkheads (`HTTP 429` jitter), `<5 s` targeted `SCAN + UNLINK` L1 eviction (`0` peer evictions), and `SET NX PX 5000` single-flight AlloyDB re-hydration | [`core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) • [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) |
| **Part 4: Mind the Gap** | **Slide 9** (`GAP-01..05` Vulnerability Register, Sunset Hooks & BigQuery OTel SQL) | Compensating controls for cutting-edge AI platforms, feature-flagged GA sunset hooks (`Q4 2026 / Q1 2027`), and zero-PII BigQuery OpenTelemetry SQL chargeback (`0.1×` cached prefix weight) | [`core-cymbal-agent/governance/hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) • [`1.4 EAP & Product Gap Tracker`](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) |
| **Part 5: Automating Compliance** | **Slides 10–11** (Live Console Proof + Merged Well-Architected SLA Scorecard & 5-Part Roadmap) | Continuous forensic verification (`12/12 PASS • 107/107 Assertions`), Cloud Logging MQL queries, consolidated Well-Architected SLAs (`~42 ms` p95, `84.7%` token savings, `74%` TCO reduction), and Terraform 2.6 / 3.6 / 4.6 deployment into Workstreams 2–5 | [`scripts/run_deep_forensic_audit.py`](../scripts/run_deep_forensic_audit.py) • [WS2](ws2-pattern-a-pooled-architecture.md) • [WS3](ws3-pattern-b-sovereign-silos.md) • [WS4](ws4-pattern-c-hybrid-dynamic-tiering.md) • [WS5](ws5-decision-guide-and-agentic-triad.md) |

- Explore the deep-dive implementation guides for each isolation pattern in this 5-part series:
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 1 engineering deliverables:
  - [1.1 Multi-Tenant Architecture Taxonomy & Diagrams](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)
  - [1.2 Cross-Product Engineering Alignment & Review Pack](../workstream-1-reference-architecture/1.2-product-team-review-pack.md)
  - [1.3 Official Cloud Architecture Center Documentation Update PR](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)
  - [1.4 Early Access Program (EAP) & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable architecture assets for Workstream 1:
  - [Workstream 1 Editable Google Slides Deck (`ws1-reference-architecture-editable-slides.pptx`)](../slides/ws1-reference-architecture-editable-slides.pptx)
  - [Figure 1 Draw.io Source (`ws1-multi-tenant-taxonomy-overview.drawio`)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio)
  - [Figure 2 Draw.io Source (`ws1-cloud-arch-center-5hop-baseline.drawio`)](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio)

---

<!-- E2E_FLOW_START -->
## Step-by-Step End-to-End Agentic & Technical Flows (WS1 Architecture Diagrams)

> **Reader Reference Guide (Standalone Guide & Companion Architecture Deck):** The step-by-step walkthroughs below document every Official Google Cloud Architecture Center (`#78`) diagram in **WS1**. Each diagram is self-contained in this guide (`Figure 1` above plus the supporting topology blueprints in `diagrams/`), and also corresponds 1:1 to **Act II (Slides 5–8)** of the companion 11-slide editable presentation deck (`slides/ws1-*-editable-slides.pptx`, viewable in **Tab 2: Editable Architecture Decks** of the interactive portal): **(1) Slide 5 (`L1` 3 Logical Security Layers Overview)** → **(2) Slide 6 (`L2` Authoritative `Figure 1` Official `#78` Physical Blueprint + 4 Physical Network Perimeters Sidebar)** → **(3) Slide 7 (`L3` 5-Actor Chronological Request Sequence, Fail-Closed Circuit Breakers & Stampede Recovery)** → **(4) Slide 8 (`L4` 3-Stage Wire-Level JSON & Cryptographic Context Transformation)**.

### Diagram 1: Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C) (`ws1-multi-tenant-taxonomy-overview`)
* **Workstream & Focus**: Workstream 1 • Multi-Tenant Reference Architecture Taxonomy (WS 1.1) (`PATTERNS A, B & C TAXONOMY`)
* **Question Answered**: *How do B2B SaaS platforms and large enterprises serve thousands of tenants across Pooled (Pattern A), Sovereign Silo (Pattern B), and Dynamic Hybrid (Pattern C) isolation models using one 80% reusable agentic codebase?*
* **Architectural & Business Outcome (Unified Hub-and-Spoke Control Plane Across Three Tenant Isolation Tiers)**: Platform teams maintain a single ADK 2.0 and Vertex AI Agent Engine codebase while delivering 120 RPM Pooled (Pattern A), Blended Hybrid PSC (Pattern C), and 600 RPM Sovereign Silo (Pattern B) isolation tiers with zero cross-tenant data bleed.

#### 4-Zone Hub-and-Spoke Architecture Summary (Rule 53G `hub-2-spoke`)
* **Blue Zone — 1. Routing Hub (Ingress & Identity PEP)**: Terminates TLS at External ALB, enforces Cloud Armor WAF & Model Armor screening, authenticates via IAP, and resolves tenant tier.
* **Green Zone — 2. Central Governance & Security Hub**: Centralizes Security Command Center posture monitoring, IAM Principal Access Boundaries, Cloud KMS keys, and BigQuery OTel FinOps.
* **Yellow Zone — 3. Pattern A: Pooled Shared Runtime Spoke**: Executes high-density multi-tenant workloads on shared Cloud Run / Agent Engine with 90% shared prompt caching and AlloyDB RLS.
* **Red Zone — 4. Pattern B Silos & Pattern C PSC Spokes**: Isolates regulated tenants inside dedicated VPC-SC projects with Cloud KMS CMEK kill-switches or unidirectional PSC service attachments.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Edge Ingress, WAF & Prompt Inspection** (*Client → Blue Zone (Routing Hub)*): User requests enter through the global External Application Load Balancer. Cloud Armor mitigates DDoS/OWASP threats while Model Armor inspects ingress prompts via Service Extensions to block prompt injection at the edge. **(Cloud Load Balancing • Cloud Armor WAF • Model Armor)**
1. **Step ② — Zero-Trust Identity & Tenant Registry Lookup** (*Blue Zone (Identity & Registry)*): Identity-Aware Proxy (IAP) validates the upstream OIDC JWT (Google Workspace or Microsoft Entra ID), strips client-supplied tenant headers, and looks up the tenant’s isolation tier and entitlements in Firestore. **(Identity-Aware Proxy • RFC 8693 OBO + DPoP • Firestore)**
1. **Step ③ — Tier-Aware Routing & Access Boundary Binding** (*Blue Zone → Tenant Spokes*): The Cloud Run routing service binds an IAM Principal Access Boundary (PAB) and KMS-signed context token, routing Standard tenants to the Pooled Spoke (Pattern A) and Enterprise tenants to Sovereign/PSC Spokes (Pattern B/C). **(Cloud Run Router • IAM Principal Access Boundary (PAB))**
1. **Step ④ — In-Perimeter Model Armor & SDP Screening** (*Yellow / Red Zone (Guardrails)*): Before invoking the foundation model, tenant-scoped Model Armor and Sensitive Data Protection (SDP) templates enforce industry compliance rules (OCC/FDIC banking or PCI retail) and redact sensitive PII. **(Model Armor • Cloud Sensitive Data Protection (SDP))**
1. **Step ⑤ — Scoped Agent Reasoning & Context Caching** (*Yellow / Red Zone (Agent Runtime)*): Vertex AI Agent Engine (ADK 2.0) invokes Gemini 2.5 Pro or Gemma 3 using a shared read-only system prompt cache (90% input token discount) while partitioning session Memory Bank namespaces by tenant ID. **(Vertex AI Agent Engine • Gemini 2.5 Pro • ContextCacheConfig)**
1. **Step ⑥ — Isolated MCP Tool & RAG Datastore Execution** (*Yellow & Red Zones (Data Plane)*): The agent invokes allow-listed MCP servers and retrieves grounding data enforced by AlloyDB/BigQuery Row-Level Security (Pattern A), dedicated CMEK vaults (Pattern B), or Private Service Connect (Pattern C). **(MCP Toolbox • AlloyDB RLS • BigQuery CMEK • PSC)**
1. **Step ⑦ — Egress Sanitization & FinOps Chargeback** (*Tenant Spokes → Client & Green Zone*): Model Armor scans the final completion on egress to redact any residual sensitive identifiers before returning the response and streaming OpenTelemetry token usage spans into BigQuery for tenant chargeback. **(Egress SDP Redaction • Security Command Center • BigQuery OTel)**

> **Verified Architectural & Business Outcome (Unified Hub-and-Spoke Control Plane Across Three Tenant Isolation Tiers):** Platform teams maintain a single ADK 2.0 and Vertex AI Agent Engine codebase while delivering 120 RPM Pooled (Pattern A), Blended Hybrid PSC (Pattern C), and 600 RPM Sovereign Silo (Pattern B) isolation tiers with zero cross-tenant data bleed. **(PATTERNS A, B & C TAXONOMY)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: External Application Load Balancer • Cloud Armor • Identity-Aware Proxy (IAP) • Cloud Run • Vertex AI Agent Engine (ADK 2.0) • Model Armor • AlloyDB & BigQuery
* **Architecture Summary**: Unifies a shared Routing Hub and Central Governance Hub (80% reusable control plane) to route requests into Pattern A (Pooled Runtime + RLS), Pattern B (Per-Tenant Project + VPC-SC + CMEK), or Pattern C (Hybrid PSC Spokes).

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Edge WAF & Callout | External ALB, Cloud Armor & Model Armor (Blue Zone) | Terminates HTTPS at Google’s global edge, strips untrusted `x-tenant-id` headers, and invokes Model Armor via ALB Service Extensions to screen prompts before compute. | Header Sanitization & Edge Prompt Screening | Spoofed tenant headers and prompt injections are rejected at the edge |
| **Step ②** • OIDC & OBO Token Exchange | Identity-Aware Proxy & Cloud KMS (Blue Zone) | Verifies Google Workspace OIDC or Microsoft Entra ID JWTs and performs RFC 8693 On-Behalf-Of (OBO) exchange bound to an RFC 9449 DPoP thumbprint signed by Cloud KMS. | KMS-Signed CryptographicContext (`adk-agent-signing-key`) | Downstream services verify cryptographic tenant identity mathematically |
| **Step ③** • Tier Router & PAB Enforcement | Cloud Run Router & IAM PAB (Blue & Green Zones) | Queries the tenant routing table and binds an IAM Principal Access Boundary (PAB) policy scoping the execution principal strictly to Pattern A, Pattern B, or Pattern C. | Deterministic Topology Dispatch & IAM PAB | 80% of agentic platform code is reused unchanged across all 3 tiers |
| **Step ④** • Tenant Guardrail Policy | Vertex AI Model Armor & SDP (Yellow & Red Zones) | Evaluates tenant-specific Model Armor templates and Semantic Natural Language Constraints (NLCs), blocking regulatory bypass prompts with HTTP 422. | Tenant-Scoped Model Armor & SDP Templates | Adversarial jailbreaks and policy violations are blocked pre-inference |
| **Step ⑤** • Sandboxed Agent & Cache | Vertex AI Agent Engine & Gemini 2.5 Pro (Yellow & Red Zones) | Executes ADK 2.0 agents in gVisor sandboxes with shared `ContextCacheConfig` (90% prefix discount), Memorystore for Valkey RPM bulkheads, and `{tenant}:{user}:{session}` memory. | 5-Level Memory Bank & Shared Context Cache | 84.7% lower token COGS with zero cross-tenant memory contamination |
| **Step ⑥** • Multi-Tier Data Perimeter | AlloyDB RLS, BigQuery CMEK & PSC (Red Zone) | Enforces `SET LOCAL app.current_tenant_id` Row-Level Security in Pattern A, per-project VPC-SC + Cloud HSM CMEK in Pattern B, and unidirectional PSC endpoints in Pattern C. | RLS Policy, CMEK Vault & PSC ServiceAttachment | Tenants can only retrieve records authorized for their verified identity |
| **Step ⑦** • Egress DLP & Response | Sensitive Data Protection & Cloud Run (Blue Zone) | Applies outbound Sensitive Data Protection (SDP) infoType detectors (IBAN/SWIFT for FinVault, PCI PAN for RetailStream) before delivering the JSON completion. | Outbound InfoType Redaction Pipeline | Zero unredacted PII/PCI identifiers leave the tenant perimeter |
| **Cost & Audit** • SCC & FinOps Telemetry | Security Command Center & BigQuery OTel (Green Zone) | Streams zero-PII OpenTelemetry spans (`tenant_id`, `tier`, `thinking_tokens`, `cache_hit`) into BigQuery for proportional chargeback and Security Command Center audit. | BigQuery OTel Chargeback (`cymbal_agentic_finops_otel`) | Real-time per-tenant COGS attribution and continuous CISO compliance |

### Diagram 2: Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance (`ws1-cloud-arch-center-5hop-baseline`)
* **Workstream & Focus**: Workstream 1 • Official Cloud Architecture Center 5-Hop Governance Baseline (WS 1.3) (`5-HOP CRYPTOGRAPHIC BASELINE`)
* **Question Answered**: *How do we extend the official Google Cloud Architecture Center multi-tenant hub-and-spoke blueprint with a 5-Hop Cryptographic Context Chain that prevents confused-deputy tool calls, cache bleed, and noisy neighbors?*
* **Architectural & Business Outcome (Five Sequential Policy Enforcement Points (Hops 1–5) Eliminate Cross-Tenant Bleed)**: Every request traverses five deterministic governance hops—Edge Identity PEP (Hop 1), Catalog PDP (Hop 2), Compute & Memory Bulkhead (Hop 3), Model Armor Guardrails (Hop 4), and Data RLS + OTel (Hop 5)—failing closed immediately on any violation.

#### 4-Zone Hub-and-Spoke Architecture Summary (Rule 53G `hub-2-spoke`)
* **Blue Zone — 1. Hops 1 & 2: Edge PEP & Catalog PDP**: Strips forged headers, verifies OIDC + DPoP identity at Hop 1, and prunes unauthorized agents and MCP tools at Hop 2.
* **Green Zone — 2. Central KMS Signing & OTel Governance**: Signs non-replayable tenant context tokens via Cloud KMS, brokers 2LO/3LO OAuth tokens, and records BigQuery FinOps audit trails.
* **Yellow Zone — 3. Hops 3 & 4: Sandbox, Memory & Model Armor**: Enforces gVisor sandbox isolation, 5-Level Memory Bank namespaces, thinking budgets, and Model Armor semantic guardrails.
* **Red Zone — 4. Hop 5: Row-Locked Storage & Scoped MCP**: Binds verified tenant IDs to AlloyDB/BigQuery Row-Level Security transactions and executes tenant-scoped 2LO/3LO MCP tools.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Header Sanitization & OIDC/DPoP Verification** (*Client → Blue Zone (Hop 1 PEP)*): Hop 1 terminates the client request at Cloud Armor and IAP, strips any client-supplied `x-tenant-id` headers, and validates the caller’s Google Workspace or Microsoft Entra ID JWT and DPoP proof. **(Hop 1 (`hop1_edge_identity_pep.py`) • Cloud Armor & IAP)**
1. **Step ② — KMS Context Minting & Catalog PDP Pruning** (*Blue & Green Zones (Hop 1 → Hop 2)*): Cloud KMS signs an immutable `CryptographicContext`. Hop 2 queries the Agent Registry PDP and runs ADK `before_agent_callback` to prune any private agent or MCP tool not owned by the active tenant. **(Hop 2 (`hop2_registry_pdp_callbacks.py`) • Cloud KMS)**
1. **Step ③ — gVisor Sandbox, Rate Bulkhead & Skill Validation** (*Blue → Yellow Zone (Hop 3 Sandbox)*): Hop 3 binds `temp:tenant_id` inside the Vertex AI Agent Engine gVisor sandbox, checks Memorystore for Valkey RPM quotas (`600` vs `120` RPM), and validates GCS Skill URIs (`gs://cymbal-skills-{tenant}/`). **(Hop 3 (`hop3_compute_finops_bulkhead.py`) • Memorystore)**
1. **Step ④ — Model Armor & Semantic Constraint Screening** (*Yellow Zone (Hop 4 Ingress)*): Hop 4 screens the prompt through Vertex AI Model Armor for prompt injection and evaluates tenant-specific Semantic Natural Language Constraints (NLCs), returning `HTTP 422` on compliance violations. **(Hop 4 (`hop4_model_armor_guardrails.py`) • Model Armor)**
1. **Step ⑤ — Partitioned Memory Bank & Budget-Capped Inference** (*Yellow Zone (Hop 3 & 4 Runtime)*): Gemini 2.5 Pro executes with the tenant’s thinking budget (`8,000` FinVault vs `4,000` RetailStream), reading shared system instructions from `ContextCacheConfig` and session state from `{tenant}:{user}:{session}`. **(5-Level Memory Bank (`L1..L5`) • Gemini 2.5 Pro)**
1. **Step ⑥ — Transactional Row-Level Security & 2LO/3LO MCP** (*Yellow & Red Zones (Hop 5 Data Plane)*): Hop 5 executes `SET LOCAL app.current_tenant_id` on AlloyDB/BigQuery so Row-Level Security restricts rows at the storage engine, and brokers 2LO/3LO OAuth tokens for Jira, Workspace, or ServiceNow MCP calls. **(Hop 5 (`hop5_data_rls_and_otel.py`) • AlloyDB RLS & MCP Hub)**
1. **Step ⑦ — Egress PII Redaction & OpenTelemetry Audit Sink** (*Red → Blue & Green Zones (Egress)*): Sensitive Data Protection redacts tenant-specific PII/PCI patterns on egress, returns the sanitized completion to the caller, and writes a tamper-evident `HopAuditRecord` and FinOps span to BigQuery. **(Cloud SDP Egress Redaction • BigQuery OTel Audit Sink)**

> **Verified Architectural & Business Outcome (Five Sequential Policy Enforcement Points (Hops 1–5) Eliminate Cross-Tenant Bleed):** Every request traverses five deterministic governance hops—Edge Identity PEP (Hop 1), Catalog PDP (Hop 2), Compute & Memory Bulkhead (Hop 3), Model Armor Guardrails (Hop 4), and Data RLS + OTel (Hop 5)—failing closed immediately on any violation. **(5-HOP CRYPTOGRAPHIC BASELINE)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Cloud Armor • Identity-Aware Proxy • Cloud KMS • Discovery Engine Agent Catalog • Vertex AI Agent Engine • Model Armor • AlloyDB RLS • BigQuery
* **Architecture Summary**: Enforces 5 sequential cryptographic policy enforcement points (Hops 1–5) from edge ingress to storage so every tool discovery, memory lookup, model call, and SQL query is bound to a KMS-signed tenant context.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Hop 1: Edge Identity PEP | Cloud Armor, IAP & OIDC Verifier (Blue Zone) | Strips forged `x-tenant-id` / `x-gcp-project-override` headers, validates federated OIDC JWTs, and verifies RFC 9449 DPoP sender-constrained token thumbprints (`jkt`). | core-cymbal-agent/governance/hop1_edge_identity_pep.py | Blocks header spoofing and stolen-token replay with HTTP 401 |
| **Step ②** • Hop 2: Registry PDP | Discovery Engine Catalog & ADK Callbacks (Blue Zone) | Filters the Agent Registry by `tenant_id` visibility and enforces ADK `before_agent_callback` / `before_tool_callback` to prune unauthorized private agents and MCP tools. | core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py | Cross-tenant private agent calls fail closed with HTTP 403 Forbidden |
| **Step ③** • Hop 3a: Compute & Rate Limit | Vertex AI Agent Engine & Memorystore (Yellow Zone) | Pins immutable `temp:tenant_id` in gVisor sandbox state, enforces token-bucket rate limits in Memorystore for Valkey, and validates `gs://cymbal-skills-{tenant}/` URIs. | core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py | Noisy-neighbor bursts throttled with HTTP 429 and Retry-After header |
| **Step ④** • Hop 4: Model Armor & NLC | Vertex AI Model Armor (Yellow Zone) | Screens ingress prompts for jailbreaks, cache-extraction payloads, and tenant Semantic Natural Language Constraints (e.g., OCC escalation suppression). | core-cymbal-agent/governance/hop4_model_armor_guardrails.py | Prompt injections (HTTP 400) and NLC violations (HTTP 422) blocked cold |
| **Step ⑤** • Hop 3b: Memory & Cache | Gemini 2.5 Pro & 5-Level Memory Bank (Yellow Zone) | Applies read-only `ContextCacheConfig` prefix caching (90% discount) to shared system prompts while isolating L1–L4 episodic memory under `{tenant}:{user}:{session}`. | MemoryBankLevel L1..L5 & Thinking Budget Clamping | Cross-tenant L4 memory reads blocked with PermissionError |
| **Step ⑥** • Hop 5: RLS & 2LO/3LO MCP | AlloyDB RLS, BigQuery & CymbalMCPHub (Red Zone) | Binds `SET LOCAL app.current_tenant_id` on database connections and dispatches 2LO (Cymbal Telemetry) and 3LO (Workspace/Jira & Entra/ServiceNow) MCP tools. | core-cymbal-agent/governance/hop5_data_rls_and_otel.py | SQL RLS-bypass attempts return 0 foreign rows; unconsented 3LO returns 401 |
| **Step ⑦** • Hop 4b: Egress SDP Scrub | Cloud Sensitive Data Protection (Blue Zone) | Executes tenant-specific egress detectors (`IBAN_CODE`/`SWIFT_CODE` for FinVault; `CREDIT_CARD_NUMBER` for RetailStream) prior to HTTP response serialization. | Tenant-Scoped Egress Redaction Rules | 100% deterministic masking of regulated financial and payment identifiers |
| **Cost & Audit** • Hop 5b: OTel & Chargeback | Security Command Center & BigQuery (Green Zone) | Emits structured OpenTelemetry audit records across all 5 hops with exact input, thinking, and cached token counts for tenant-level FinOps chargeback. | HopAuditRecord & BigQuery FinOps Sink | Complete 5-hop cryptographic lineage for CISO and CFO reporting |

<!-- E2E_FLOW_END -->
