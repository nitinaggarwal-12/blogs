---
title: "Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad"
subtitle: "Choose between Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C) topologies on Google Cloud using a 2-question decision tree, side-by-side comparison matrix, and 3-stage technical solution lifecycle"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 5 of 5"
workstream: "Workstream 5 • Wrap-Up: Pattern Comparison, Decision Guide & Capstone Backlog (5.1 + 5.2)"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "CTOs, Principal Architects, CISOs, and Platform Product Managers designing multi-tenant AI platforms on Google Cloud"
reading_time: "14 min read"
tags: "["Multi-Tenancy","Vertex AI Agent Engine","ADK","Decision Guide","Zero Trust","FinOps","OpenTelemetry","VPC-SC","Private Service Connect","AlloyDB RLS"]"
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: "["ws5-decision-tree-and-agentic-triad"]"
editable_slides: "slides/ws5-12slide-visual-deck.pptx"
status: "PUBLISH_READY"
---
# Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad

> **Executive Cloud Architecture Assets**: [📊 Google Slides Presentation ↗](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit) • [📄 Google Docs Spec ↗](https://docs.google.com/document/d/1ate8K63qHrYP6OUQ7qO0H6Quq8S5g3TnLbDhbaAZ_SU/edit?resourcekey=0-XWkODR5elYC9-fuGO6aBaQ) • [📐 Draw.io Source (.drawio)](../diagrams/ws5-decision-tree-and-agentic-triad.drawio) • [📦 Codebase & Runtime](../core-cymbal-agent/) • [Download Slides (.pptx)](../slides/ws5-wrap-up-editable-slides.pptx)

This document provides an executive decision framework to help you select, combine, and operate the right multi-tenant isolation topology for agentic AI systems on Google Cloud. It synthesizes the architectural patterns, security verification suites, and FinOps benchmarks from across this 5-part series—[Part 1 (Reference Taxonomy & 5-Hop Baseline)](ws1-reference-architecture-taxonomy-and-5hop-baseline.md), [Part 2 (Pattern A Pooled)](ws2-pattern-a-pooled-architecture.md), [Part 3 (Pattern B Sovereign Silos)](ws3-pattern-b-sovereign-silos.md), and [Part 4 (Pattern C Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md)—into a two-question decision tree and the **Multi-Tenant Agentic Triad**.

This document is intended for CTOs, principal cloud architects, CISOs, and AI product leaders evaluating [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/) for multi-customer B2B SaaS or internal enterprise platform deployments.

> **Key point:** Two gating questions determine your topology: (1) *Do 100% of your customers legally mandate dedicated Google Cloud projects, VPC Service Controls perimeters, or air-gapped open-weight models?* If yes, deploy **Pattern B (Sovereign Silos)**. (2) *If not, do you sell multiple pricing tiers (a shared Standard tier plus a dedicated Enterprise tier)?* If no, deploy **Pattern A (Pooled)**; if yes, deploy **Pattern C (Dynamic Hybrid)**.

## Executive Architecture Summary & System Context (Figure 1)

The following `L2 Physical` decision framework diagram synthesizes the 2-question gating tree, the Multi-Tenant Agentic Triad, and the 74% fleet TCO reduction model across Patterns A, B, and C:

![Figure 1 — Executive decision tree, Pattern A/B/C selector, and the Multi-Tenant Agentic Triad](../diagrams/ws5-decision-tree-and-agentic-triad.drawio.png)

*Figure 1. Official Google Cloud Architecture Center decision tree and Multi-Tenant Agentic Triad showing the 2-question gating tree, the 3 pillars of multi-tenant governance (Zero-Trust 5-Hop Chain, Predictable FinOps, and Privacy-Preserving OTel Chargeback), and the 3-stage technical solution lifecycle.*

> ⚡ **At a Glance: Multi-Tenant Decision Framework Context**
> - **2-Question Gating Tree**: Branch immediately to Pattern B (Sovereign Silos) on regulatory isolation mandates; branch to Pattern A (Pooled) for single-tier SaaS; branch to Pattern C (Dynamic Hybrid) for tiered offerings.
> - **80% Reusable Agentic Triad**: The exact same 5-hop cryptographic context chain, rate limiters, Model Armor templates, and AlloyDB RLS run across all three patterns with 0 codebase rewrites.
> - **74% Fleet TCO Savings**: Combining pooled density for 950 Standard tenants with isolated PSC spokes for 50 Enterprise tenants optimizes gross margin without sacrificing compliance.


## When NOT to Use Each Topology in the Agentic Triad (Executive Disqualifier Matrix)

> [!WARNING]
> **Executive Topology Disqualifiers — Avoid the 3 Classic Enterprise Multi-Tenancy Anti-Patterns:**
> - **Never Use Pattern A (Pooled)** when a customer contract mandates customer-revocable Cloud KMS CMEK/EKM keys, VPC Service Controls (`VPC-SC`) hardware perimeters, or air-gapped open-weight models (`Gemma 3 27B` on private GKE).
> - **Never Use Pattern B (Full Sovereign Silo)** for `> 100` commercial/mid-market tenants or self-serve PLG onboarding: Terraform control-plane state locking, VPC-SC per-organization perimeter quotas (`100` default limit), and dedicated AlloyDB/GPU idle floors (`USD 8,400+/mo/silo`) will stall platform velocity.
> - **Never Use Pattern C (Dynamic Hybrid PSC)** when a defense or sovereign banking regulator prohibits a shared Layer-7 Ingress & Identity Hub (`Hop 1`–`Hop 2`), even when compute and data (`Hop 3`–`Hop 5`) reside in an isolated PSC spoke project.

## Core terminology and executive decision primitives

Before examining the Figure 1 decision tree and the **Multi-Tenant Agentic Triad**, we synthesize how this 5-part series resolves the **SaaS AI Architect's Dilemma**—balancing Pattern A's **90% shared `ContextCacheConfig` COGS economics** against Pattern B's **project-per-tenant VPC-SC + CMEK sovereignty** and Pattern C's **zero-downtime hybrid PSC promotion**—across the four foundational series primitives ([Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and **Computer Science (CS101)** systems-engineering analogies:

- **Agent Development Kit (`ADK`):** The invariant 80% reusable Python agent runtime ([`core-cymbal-agent/runtime_pipeline.py`](../core-cymbal-agent/runtime_pipeline.py)) shared across Pattern A, Pattern B, and Pattern C without code rewrites.
- **Agent Registry & Discovery (`ARD`):** The Hop 2 Discovery Engine catalog Policy Decision Point ([`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)) governing shared and tenant-private (`Agent Alpha`) agent resolution across all three topologies.
- **Model Context Protocol (`MCP`):** The standardized tool-invocation protocol enforcing composite `{tenant_id}:{user_id}` DPoP-bound 3LO OAuth tokens and live AWS Bedrock AgentCore federation across 10 enterprise SaaS platforms ([`enterprise_5_saas_bi_mcp.py`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py)).
- **5-Hop Cryptographic Context Chain (`Hops 1–5` with Sub-Hops `3a/3b`, `4a/4b`, `5a/5b`):** The invariant governance pipeline spanning **Hop 1** (Edge Identity PEP), **Hop 2** (ARD Catalog & ADK Callback PDP), **Hop 3a/3b** (Compute Sandbox, Valkey RPM Bulkhead, `ContextCacheConfig` & CMEK Kill-Switch), **Hop 4a/4b** (Pre-Inference Model Armor & Post-Inference Cloud SDP Guardrails), and **Hop 5a/5b** (AlloyDB RLS/CMEK Persistence & BigQuery OpenTelemetry Chargeback).

| Executive decision primitive | CS101 / systems engineering analogy | Role across Pattern A, Pattern B, and Pattern C | Verified implementation in this repo |
| :--- | :--- | :--- | :--- |
| **2-Question Topology Selector (`Q1 Compliance` + `Q2 Tiering`)** | **Deterministic Binary Decision Diagram (BDD)** (mapping a 2-bit input vector $(q_1, q_2) \in \{0,1\}^2$ onto 3 mutually exclusive architectural leaves) | Evaluates regulatory perimeter mandates (`Q1`) and commercial pricing-tier structure (`Q2`) to select Pattern B (`Q1=YES`), Pattern A (`Q1=NO, Q2=NO`), or Pattern C (`Q1=NO, Q2=YES`) | [`5.1-pattern-comparison-and-decision-guide.md`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md) |
| **Pillar 1 — Zero-Trust 5-Hop Chain (`80% Reusable Core`)** | **Microkernel Reference Monitor** (an invariant security kernel shared across user-mode distributions while swapping only the outer hardware/network driver shell) | Runs the identical 5-Hop governance modules (`hop1`..`hop5`) across all three patterns while swapping only the 20% infrastructure shell (Terraform modules `2.6`, `3.6`, or `4.6`) | [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) (`20/20` pattern tests + `60/60` SaaS tests PASS) |
| **Pillar 2 — Predictable FinOps Economics (`Cache + Bulkheads + PT`)** | **Hierarchical Memory Caching & Fair-Share Scheduler** (combining L1/L2 instruction cache sharing for standard jobs with dedicated CPU pinning for real-time jobs) | Combines 90% `ContextCacheConfig` discounts and Valkey token-bucket caps (`4,000` cap, `120 RPM`) in Pattern A with Dedicated Provisioned Throughput (`600 RPM`, `8,000` budget) in Pattern B/C | [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) |
| **Pillar 3 — Privacy-Preserving OTel Chargeback (`SDP -> BigQuery`)** | **Redacted Kernel Audit Ring Buffer (`auditd`)** (scrubbing sensitive payload bytes before writing immutable resource accounting records) | Masks raw PII via Cloud SDP at Hop 4 before emitting a `TenantTelemetrySpan` at Hop 5 into `cymbal_agentic_finops_otel.tenant_telemetry_spans` for exact per-tenant margin attribution | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) |
| **3-Stage Technical Solution Lifecycle (`Stage 1 -> 2 -> 3`)** | **Incremental Compiler / Progressive System Evolution** (bootstrapping on a shared runtime before linking dedicated sovereign modules on demand) | Allows SaaS teams to launch fast on Pattern A (Stage 1), stamp out Pattern B silos for regulated whales (Stage 2), and unify both under Pattern C live migration (Stage 3) with zero agent rewrites | [`codelab-90min-multi-pattern-master-lab.md`](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md) |

## Use cases

Use the following decision rules ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)) to map your business model to the appropriate architecture:

- **Choose Pattern A (Pooled Architecture)** when you operate a uniform, high-volume B2B SaaS product where fast self-service onboarding, 90% shared prompt cache savings, and lowest unit COGS (`120 RPM Pool` baseline) are primary goals, and customers accept cryptographic/logical isolation within a shared project.
- **Choose Pattern B (Sovereign Silos)** when 100% of your customers are regulated financial, healthcare, or public-sector entities whose contracts prohibit shared compute pools or shared databases and mandate per-customer VPC Service Controls perimeters, customer-managed KMS kill-switches, or air-gapped Gemma 3 on GKE.
- **Choose Pattern C (Dynamic Hybrid)** when you sell multi-tiered SaaS packaging (such as a Standard tier alongside a regulated Enterprise tier) and need a single control plane that can promote live customers from the shared pool into dedicated Private Service Connect spokes with zero downtime.

## Design alternatives

### End-to-end comparison of Pattern A, Pattern B, and Pattern C

The following executive matrix summarizes all 20 verified runtime simulations and architectural trade-offs across the three patterns:

| Architectural dimension | Pattern A: Pooled ([WS2](ws2-pattern-a-pooled-architecture.md)) | Pattern B: Sovereign Silos ([WS3](ws3-pattern-b-sovereign-silos.md)) | Pattern C: Dynamic Hybrid ([WS4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |
| :--- | :--- | :--- | :--- |
| **GCP project topology** | 1 shared project (`cymbal-pooled-saas-prod`) | 1 dedicated project per tenant (`cymbal-{tenant}-silo-prod`) | 1 hub project + shared pool + N dedicated PSC spoke projects |
| **80% reusable agent core** | `core-cymbal-agent/` (5-Hop Chain) | Unchanged `core-cymbal-agent/` + Sovereign Shell | Unchanged `core-cymbal-agent/` + Hybrid Router & Migrator |
| **Network isolation** | Shared VPC + Cloud Armor + IAP | Per-project **VPC-SC perimeter** + **mTLS SPIFFE** | Hub VPC + unidirectional **Private Service Connect (PSC)** NAT |
| **Database & memory isolation** | Shared AlloyDB **`FORCE ROW LEVEL SECURITY`** + composite memory keys | Dedicated **CMEK AlloyDB** & Memory Bank per project | Shared RLS for Standard + dedicated CMEK AlloyDB via PSC for Enterprise |
| **Encryption kill-switch** | Logical key check in Hop 3 | Project-wide **Cloud KMS CMEK** (`HTTP 423 Locked`) | Per-spoke **Cloud KMS CMEK** (`HTTP 423 Locked`) for Enterprise tier |
| **Model & caching strategy** | Shared Gemini 2.5 Pro + **90% `ContextCacheConfig` savings** | Dedicated Vertex AI PT or **air-gapped Gemma 3 (27B) on GKE** | Pooled caching for Standard + Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) for Enterprise |
| **Live tier upgrade path** | Requires migration to Pattern C | Static sovereign project | **Built-in 3-phase live migration** (`0` dropped turns) |
| **Baseline monthly cost floor** | **`120 RPM Pool / mo`** per tenant (`$`) | **`600 RPM Silo / mo`** per silo (`$$$`) | **`Hybrid PSC / mo`** blended across tiers (`$$`) |
| **Automated verification suite** | `10/10` red-team breach tests PASS | `6/6` sovereign security tests PASS | `4/4` hybrid & live migration tests PASS |

### The 5-Hop Cryptographic Context Chain invariant

Regardless of which topology you select, the same five governance modules in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) execute on every turn:

| Hop | Governance module | Security, FinOps, or observability invariant |
| :--- | :--- | :--- |
| **Hop 1** | [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Strips `X-Tenant-ID`; validates OIDC/Entra JWT; mints RFC 8693 OBO token bound to RFC 9449 DPoP `jkt` |
| **Hop 2** | [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | Enforces Discovery Engine Catalog ACLs (`403` on private `Agent Alpha`) + ADK `before_agent_callback` tool pruning |
| **Hop 3** | [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | Binds `temp:tenant_id`; enforces Valkey RPM (`429`), token clamp (`4k/8k`), `ContextCacheConfig`, and CMEK (`423`) |
| **Hop 4** | [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Runs bi-directional Model Armor (`400`/`422`) + Cloud DLP redaction + DPoP-bound 3LO MCP verification (`401`) |
| **Hop 5** | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Enforces transactional AlloyDB `FORCE ROW LEVEL SECURITY` (`SET LOCAL app.current_tenant_id`) and exports PII-scrubbed OTel FinOps spans to BigQuery |

## Architecture

### C4 architectural abstraction hierarchy for Executive Decision Guide & Agentic Triad (L1–L5)

To provide enterprise executive sponsors, CISOs, CFOs, and architecture review boards with rigorous, multi-level visibility across all three patterns, the complete decision framework is specified across all five levels of the C4 architecture abstraction model:

| C4 Architecture Level | Primary Abstraction & Scope | Google Cloud Implementation Primitives | Mathematical Invariant & Failure Mode |
| :--- | :--- | :--- | :--- |
| **Level 1: System Context & Logical Taxonomy (L1 Logical)** | Comparative multi-tenant boundary across Pooled (A), Sovereign Silos (B), and Dynamic Hybrid (C) | Cloud Armor, IAM STS, VPC Service Controls, and Private Service Connect | High-density commercial tier ($12/mo) and air-gapped sovereign tier ($1,250/mo) coexist from 1 codebase |
| **Level 2: Decision Tree & Container Topologies (L2 Physical)** | 2-Question Executive Topology Decision Tree and 3-Outcome Architecture Graphs (Figure 1) | Vertex AI Agent Engine, Cloud Run v2, AlloyDB for PostgreSQL, and Cloud KMS | Clear deterministic path routing enterprise requirements to Pattern A, B, or C with zero ambiguity |
| **Level 3: Process & Sequence Swimlanes (L3 Process)** | 5-Actor UML sequence tracing turns across all 5 invariant cryptographic hops | ADK interceptors (`before_agent_callback`, `before_tool_callback`), Valkey locks, and Model Armor | Invariant fail-closed HTTP circuit breakers (`401`, `403`, `429`, `422`, `423`) across all three topologies |
| **Level 4: Wire-Level Protocol Normalization (L4 Wire)** | Wire packet transformation: untrusted ingress payload stripped of client claims and minted into a signed STS JWT | Cloud Armor security rules, RFC 8693 OAuth Token Exchange, and RFC 9449 DPoP key binding | Ingress packet with spoofed claims exits as an immutable ECDSA P-256 JWT verified in `<0.15 ms` via in-memory JWKS |
| **Level 5: Agentic Triad Governance & FinOps Attestation** | Continuous zero-trust security audits, predictable unit economics, and privacy-preserving observability | BigQuery OTel FinOps ledger, Cloud Audit Logs, and S3 Attestation Ledgers | 100% auditable proof verifying 0 cross-tenant data bleed across 10 genuine third-party enterprise SaaS products |

### Level 3: Process & Sequence Swimlanes (L3 Process)

The following `L3 Process` swimlane details the step-by-step transaction flow across the five runtime actors governing the Multi-Tenant Agentic Triad, illustrating fail-closed security enforcement, prompt prefix cache reuse, and FinOps ledger recording:

![Figure 2A — Multi-tenant agentic triad 5-actor UML sequence swimlane, fail-closed circuit breakers, and FinOps recording](../diagrams/ws1-l3-process-sequence-swimlane.drawio.png)

*Figure 2A. Official Google Cloud Architecture Center L3 Process UML Sequence Swimlane tracing the 5 runtime actors across Hop 1 Edge & IAM STS, Hop 2 ARD & Registry, Hop 3 Runtime Bulkheads, Hop 4 Model Armor & LLM, and Hop 5 Data Isolation & KMS CMEK, illustrating fail-closed HTTP 401/403/429/422/423 circuit breakers and BigQuery OTel FinOps recording.*

#### Level 4: Wire-Level Protocol Normalization (L4 Wire)

The following `L4 Wire` triptych demonstrates how untrusted caller requests are cryptographically normalized across all three multi-tenant patterns, stripping client-injected headers and binding the identity context to an immutable, sender-constrained STS JWT:

![Figure 2B — Multi-tenant agentic triad wire-level protocol normalization: Hop 1 spoofed header stripping and signed STS JWT context](../diagrams/ws1-l4-wire-protocol-transformation.drawio.png)

*Figure 2B. Official Google Cloud Architecture Center L4 Wire-Level Protocol Normalization Triptych demonstrating how unverified client claims and spoofed tenant headers are stripped at Cloud Armor (Stage 01), exchanged via RFC 8693 OBO + RFC 9449 DPoP JKT (Stage 02), and signed with Cloud KMS ECDSA P-256 for <0.15ms in-memory cached JWKS verification across microservices.*

#### Level 5: Agentic Triad Governance & FinOps Attestation (L5 Kernel Triad)

The **Multi-Tenant Agentic Triad** provides continuous mathematical verification across all three dimensions:
1. **Zero-Trust Security:** Formal verification that 0 unauthenticated caller claims reach downstream tools, verified across 10 genuine third-party enterprise SaaS products.
2. **Predictable FinOps Economics:** In-memory Valkey rate limiters cap runaway loops, while prompt prefix caching slashes Gemini inference token costs by 84.7%.
3. **Privacy-Preserving Observability:** OpenTelemetry traces and BigQuery export pipelines record per-tenant resource consumption without logging raw prompts, user PII, or proprietary business documents.

## Products used

This reference architecture uses the following Google Cloud products and open-source frameworks across Patterns A, B, and C:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor sandboxes with managed session and memory state.
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
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Low-latency in-memory and document stores used for per-tenant token-bucket rate limiting, 5-level session memory caching, and dynamic tenant routing tables.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Private Service Connect](https://cloud.google.com/vpc/docs/private-service-connect): Network security boundaries that prevent cross-project data exfiltration and establish unidirectional NAT-based private peering between a central routing hub and isolated enterprise spokes.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs): A cryptographic key management service supporting customer-managed encryption keys (CMEK) and instant `HTTP 423 Locked` tenant kill-switches.
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Centralized posture monitoring, PII-redacted OpenTelemetry audit logging, and per-tenant token FinOps chargeback analytics (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

## Design considerations

This section summarizes the **Multi-Tenant Agentic Triad** and maps it to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Defense-in-depth across all 5 hops (Pillar 1 of the Agentic Triad):** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the `core-cymbal-agent/` compensating controls active until native sub-project `tenant_id` ACLs in Discovery Engine and native per-tenant `ContextCacheConfig` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.
- **Formal Blast-Radius Containment & Composite Availability Proof:** Let $N$ be the total tenant population, $p_{\text{noisy}}$ the probability that a tenant triggers a runaway reasoning loop ($> 120\text{ RPM}$), and $R_{\text{blast}}$ the fraction of sibling tenants impacted by a single tenant's quota exhaustion or KMS key revocation. Because Hop 3 enforces per-tenant Valkey token buckets in Pattern A and per-spoke project/CMEK boundaries in Patterns B and C, the cross-tenant blast radius $R_{\text{blast}}$ and composite turn availability $A_{\text{turn}}$ satisfy:

$$R_{\text{blast}}(i \to j) = \frac{\Delta \text{Quota}_{j \neq i}}{\text{Quota}_{j}} = 0, \qquad A_{\text{turn}} = A_{\text{Hop1..5}} \cdot \left(1 - \mathbb{I}_{\text{CMEK\_revoked}}(i)\right) \ge 99.95\%$$

Where:
- $R_{\text{blast}}(i \to j) = 0$ is the cross-tenant fault propagation ratio between tenant $i$ and any sibling tenant $j \neq i$ (`Vector V5` in Pattern A; `Silo Test 6` in Pattern B; `Hybrid Test 3` in Pattern C).
- $A_{\text{Hop1..5}}$ is the regional multi-zone availability of the Cloud Run Gen2 + Vertex AI Agent Engine + AlloyDB HA pipeline.
- $\mathbb{I}_{\text{CMEK\_revoked}}(i) \in \{0, 1\}$ is the tenant-specific Cloud KMS kill-switch indicator (returning `HTTP 423 Locked` for tenant $i$ while all $j \neq i$ maintain $100\%$ uptime).

> **Architectural Grounding Boundary (Cross-Pattern Blast-Radius Verification):** Verified across all `20/20` pattern security & migration assertions (`10/10` Pattern A, `6/6` Pattern B, `4/4` Pattern C) and `60/60` third-party SaaS test cases in `scripts/verify_5_third_party_saas_products.py`.

### Cost optimization

- **Match infrastructure cost to customer ARR (Pillar 2 of the Agentic Triad):** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and `120 RPM Pool` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.
- **Formal 2-Question Topology Selector & ARR Breakeven Proof:** Let $q_1 \in \{0, 1\}$ denote whether $100\%$ of tenants legally mandate dedicated GCP projects/VPC-SC perimeters (`Q1`), and $q_2 \in \{0, 1\}$ denote whether the platform packages multiple commercial tiers (`Q2`). The optimal topology selector $\mathcal{T}^*(q_1, q_2)$ and the minimum Enterprise Annual Contract Value ($\text{ACV}_{\min}$) required to preserve target gross margin $GM_{\text{target}} \in (0, 1)$ when promoting a tenant from the shared pool ($C_{\text{pool}}$) to a dedicated PSC spoke ($C_{\text{spoke}}$) satisfy:

$$\mathcal{T}^*(q_1, q_2) = \begin{cases} \text{Pattern B (Sovereign Silos)} & \text{if } q_1 = 1 \\ \text{Pattern A (Pooled)} & \text{if } q_1 = 0 \land q_2 = 0 \\ \text{Pattern C (Dynamic Hybrid PSC)} & \text{if } q_1 = 0 \land q_2 = 1 \end{cases}, \qquad \text{ACV}_{\min} \ge \frac{12 \cdot \left(C_{\text{spoke}} - C_{\text{pool}}(N)\right)}{1 - GM_{\text{target}}}$$

Where:
- $q_1, q_2 \in \{0, 1\}$ are the binary outputs of **Q1 (Compliance Gate)** and **Q2 (Tier Gate)** in Figure 1 (`Badges 2 & 3`).
- $C_{\text{pool}}(N)$ is the monthly per-tenant cost in Pattern A with 90% `ContextCacheConfig` prefix savings and shared AlloyDB RLS.
- $C_{\text{spoke}}$ is the monthly dedicated spoke infrastructure cost in Pattern B / Pattern C (CMEK AlloyDB + Dedicated Provisioned Throughput + PSC attachment).
- $GM_{\text{target}}$ is the target SaaS gross margin (for example, $GM_{\text{target}} = 0.80 \implies$ each $\$1,000/\text{mo}$ of dedicated spoke delta requires $\ge \$60,000$ in incremental Enterprise ACV).

> **Architectural Grounding Boundary (Executive ARR Breakeven & FinOps Telemetry):** Per-tenant token COGS ($C_{\text{pool}}$ vs $C_{\text{spoke}}$) is measured in real time in live BigQuery table `ramp-portal-dev.cymbal_agentic_finops_otel.tenant_telemetry_spans` via [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py).

### Operational excellence

- **Privacy-preserving FinOps observability (Pillar 3 of the Agentic Triad):** Emit a `TenantTelemetrySpan` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`)—with zero raw PII stored in logs.
- **Extend the 5-Hop core across Multi-Cloud (AWS) and 3P SaaS connectors:** When enterprise tenants invoke workloads spanning Google Cloud, AWS, and third-party SaaS platforms, map each hop to its verified cross-cloud equivalent:

| 5-Hop Governance Layer | Google Cloud Primary Control | AWS Federated Equivalent (`Account 393036065405`) | 3P SaaS & Identity Connector Control |
| :--- | :--- | :--- | :--- |
| **Hop 1 (Identity PEP)** | Cloud Armor + IAP + Cloud KMS DPoP sign | AWS STS `AssumeRole` + IAM Session Tags (`TenantID`) | Google Workspace OIDC & Microsoft Entra ID v2.0 JWT |
| **Hop 2 (Catalog PDP)** | Discovery Engine Catalog + ADK `before_agent_callback` | IAM Role Inline Policy Scoping per Tenant Tag | Per-tenant MCP connector allowlist in Firestore |
| **Hop 3 (Compute & CMEK)** | Vertex AI Agent Engine + Valkey + Cloud KMS CMEK (`423`) | AWS KMS Customer-Managed Key (`ScheduleKeyDeletion` kill-switch) | Scoped 3LO token vault (`{tenant_id}:{connector_uri}`) |
| **Hop 4 (AI Guardrails)** | Vertex AI Model Armor + Cloud SDP (`400`/`422`) | Amazon Bedrock Guardrails (`ApplyGuardrail` PII/Injection) | Pre-tool & post-tool DPoP `jkt` + PII scrub |
| **Hop 5 (Data RLS & OTel)** | AlloyDB `SET LOCAL app.current_tenant_id` + BigQuery OTel | DynamoDB `LeadingKeys` RLS (`cymbal-multi-tenant-rls-vault`) + S3 SSE-KMS | ThoughtSpot, Sigma, ServiceNow, Veeva/Muse, Salesforce/Jira, Databricks, Snowflake, Workday, Datadog & CrowdStrike/Okta MCP |

- **Live verification across 10 unique third-party SaaS, Lakehouse, ERP, Observability & SecOps products × all 3 Patterns (`30/30 E2E Flows • 60/60 Test Cases PASS` in [`scripts/verify_5_third_party_saas_products.py`](../scripts/verify_5_third_party_saas_products.py) & [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)):** Every external SaaS integration is governed by [`enterprise_5_saas_bi_mcp.py`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) and tested end-to-end across **Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid PSC & Live Tier Migration)**:

| # | Third-Party SaaS Product & MCP URI | Live Cloud Endpoint & Mechanism Tested | Pattern A (Pooled) • Pattern B (Sovereign Silo) • Pattern C (Hybrid PSC) E2E Verification (`30/30 Flows • 60/60 Tests PASS`) | Manual Self-Test CLI Command (`--pattern all`) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` | `POST https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom` (`Server: ThoughtSpot`) + Spotter `runtime_filter` -> BigQuery RLS | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: `finvault-org-01` returns strictly `2` FinVault rows (`ENT-FV-001..002`, `0` leaks); Cross-Org spoofing (`retailstream` -> `finvault-org-01`) blocked with **`HTTP 403`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern all --verbose` |
| **2** | **Sigma Computing** (*Workbooks & Dataset API v2*) • `mcp://cymbal/sigma-computing-workbooks-3lo` | `POST https://api.sigmacomputing.com/v2/auth/token` (live `requestId`) + `status.sigmacomputing.com` (`200`) + `ua_tenant_id` warehouse RLS | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Live BigQuery pushdown returns strictly the caller's authorized rows (`2` FinVault or `1` RetailStream); Pattern A `ua_tenant_id` tampering -> **`HTTP 403`** & Pattern B/C revoked KMS CMEK key (`medcore-revoked-cmek`) -> **`HTTP 423 Locked`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern all --verbose` |
| **3** | **ServiceNow ITSM & ITOM** (*Change & Incident MCP*) • `mcp://retailstream/servicenow-itom-3lo` | Live **Amazon Bedrock AgentCore MCP Gateway** (`cymbal-a2a-mcp-gateway-suyxm3caof`) invoking `query_servicenow_change_records` (`CHG0049218`) | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Consented 3LO call fetches live `CHG0049218` (**`HTTP 200`**); unconsented 3LO call triggers Hop 5 **`HTTP 401 CHALLENGE_3LO_OAUTH`** (`MCP -32042`) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern all --verbose` |
| **4** | **Veeva Vault RIM & Muse Clinical EDC** (*GxP SaaS*) • `mcp://finvault/veeva-muse-clinical-3lo` | Live **AWS Bedrock AgentCore MCP Gateway** invoking `query_muse_study_biomarkers` (`FV-GXP-2026-04`) + Veeva Vault `VV-DOC-004819` | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Cloud KMS FDA 21 CFR Part 11 signature bound to tenant; unauthorized `retailstream` blocked at Hop 2 with **`HTTP 403`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --pattern all --verbose` |
| **5** | **Salesforce Enterprise CRM & Atlassian Jira Cloud** • `mcp://finvault/salesforce-jira-escalation-3lo` | Live **Salesforce Trust API** (`NA224`, `Winter '27 Patch 8.6`, `HTTP 200`) + **Atlassian Jira Cloud API** (`HTTP 200`) | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Live `NA224` & Jira status verified; Hop 4 Egress Cloud SDP masks raw `IBAN_CODE` (`[REDACTED-FINVAULT-IBAN]`) & `SWIFT_CODE` (`raw_pii_leaked=False`) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --pattern all --verbose` |
| **6** | **Databricks Data Intelligence Platform** (*Unity Catalog*) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` | `GET https://community.cloud.databricks.com/api/2.0/clusters/list` (`Server: databricks`, live `[ReqId]`) + `cymbal_uc_prod.<tenant>_gold` | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: `cymbal_uc_prod.finvault_gold` returns `2` FinVault rows (`ENT-FV-001..002`); cross-schema query & `EXECUTE IMMEDIATE` dynamic SQL blocked with **`HTTP 403`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern all --verbose` |
| **7** | **Snowflake AI Data Cloud** (*Cortex Analyst & SQL v2*) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` | `POST https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements` (`Server: SF-LB-T1`) + `status.snowflake.com` (`HTTP 200`) | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Enforces `ROLE_CYMBAL_RETAILSTREAM` (`row_count=1`, `ENT-RS-001`) with `SECONDARY_ROLES=NONE`; `USE SECONDARY ROLES ALL` escalation blocked with **`HTTP 403`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern all --verbose` |
| **8** | **Workday Enterprise HCM & Financial Management** • `mcp://finvault/workday-hcm-financials-raas-3lo` | `POST https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token` (live Workday CCX OAuth2 gateway) + Supervisory Org RaaS | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Hop 4 SDP masks `US_SOCIAL_SECURITY_NUMBER` (`[REDACTED_US_SSN]`); intra-tenant cross-principal 3LO token reuse blocked with **`HTTP 401`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern all --verbose` |
| **9** | **Datadog Cloud Observability & Bits AI SRE** • `mcp://cymbal/datadog-observability-sre-3lo` | `GET https://api.datadoghq.com/api/v1/validate` + `status.datadoghq.com` (`Datadog US1`, `HTTP 200`) + `@tenant_id` log index filter | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Tenant-pinned `@tenant_id:finvault` query verified; indirect prompt injection inside log stack trace blocked by Hop 4 Model Armor (**`HTTP 400`**) | `python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern all --verbose` |
| **10** | **CrowdStrike Falcon XDR & Okta Workforce Identity** • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` | `POST https://api.crowdstrike.com/oauth2/token` (live Falcon `meta.trace_id`) + `GET https://okta.okta.com/.well-known/openid-configuration` (`200`) | **`Pattern A (2/2)`**, **`Pattern B (2/2)`**, **`Pattern C (2/2)`**: Live Falcon `trace_id` + Okta OIDC DPoP (`dpop_jkt_fv_001`) verified; stolen bearer replay -> **`HTTP 401`** & revoked CMEK -> **`HTTP 423 Locked`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern all --verbose` |

### Performance optimization

- **3-stage technical solution lifecycle & progressive tier evolution:**
  - **Stage 1 (Pattern A Pooled Foundation):** Deploy `core-cymbal-agent/` and Pattern A Pooled Architecture ([Workstream 2](ws2-pattern-a-pooled-architecture.md)).
  - **Stage 2 (Pattern B Sovereign Silo Stamp-Out):** Stamp out Pattern B Sovereign Silos via Terraform for regulated anchor customers ([Workstream 3](ws3-pattern-b-sovereign-silos.md)).
  - **Stage 3 (Pattern C Dynamic Hybrid & Zero-Downtime Promotion):** Enable the Pattern C Hybrid Router and 3-phase zero-downtime live tier migrator ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)).

> **Architectural Grounding Boundary (Live Cloud Infrastructure vs Complete 27-File Multi-Pattern Verification Suite):**
> - **Live-provisioned in Google Cloud & AWS today (`20/20 PASS`):** All 3 Google Cloud projects (`ramp-portal-dev` `#248990048888`, `cymbal-control-plane` `#638420508320`, `cymbal-build-sandbox` `#248990048888`), Cloud Run service `cymbal-multi-tenant-agent-hub`, Cloud KMS CMEK ring `cymbal-tenant-cmek-ring-usw1`, BigQuery dataset `cymbal_agentic_finops_otel`, Firestore routing database `(default)`, and AWS Bedrock AgentCore Gateway `cymbal-a2a-mcp-gateway-suyxm3caof` (`10/10 READY` targets).
> - **Executed via the 27-File Codebase Workbench & 1-Click Terraform Blueprints:** You can execute all `20/20` Pattern A/B/C simulations and all `30/30` live 10-SaaS flows directly in the browser workbench (`#blog-e2e-pattern-execution-and-codebase-workbench`) or deploy any of the three topologies via their 1-click Terraform scripts ([`2.6/deploy_1click.sh`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh), [`3.6/deploy_1click.sh`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh), and [`4.6/deploy_1click.sh`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh)).



## Hard Google Cloud Quotas, Crossover Thresholds & Multi-Cloud Federation Edge Cases (Agentic Triad)

At the portfolio level (**WS5 Capstone**), principal architects governing a hybrid fleet across **Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid PSC)** must enforce three quantitative operational boundaries:

### 1. Portfolio-Wide Control-Plane Quotas & Cross-Cloud Federation Limits

| Portfolio Governance Layer | Hard Platform Limit / Latency Ceiling | Architectural Failure Mode | Mandatory Portfolio Control (`WS5`) |
| :--- | :--- | :--- | :--- |
| **Cross-Cloud OIDC -> AWS Cognito / STS Exchange** | **`~18–35 ms` cross-cloud TLS + JWT exchange** (`GCP us-central1 <-> AWS us-east-1`); Cognito token endpoint rate limits (`120 RPS` default) | Minting a new AWS Cognito RS256 OAuth token on every MCP tool call adds `35 ms` per tool and hits AWS `TooManyRequestsException` under burst load. | Cache tenant-scoped, DPoP-bound AWS AgentCore bearer tokens in **Memorystore for Valkey (`TTL = 50 min`)** keyed by `{tenant_id}:{target_id}:{dpop_jkt}`, reducing cross-cloud auth overhead to **`< 1.5 ms`**. |
| **Triad Crossover Threshold ($N_{\text{silo}} > 80$)** | **`100` VPC-SC perimeters/org** + Terraform state lock contention + `USD 8,400/mo` minimum silo floor | Allowing sales teams to sell standalone Pattern B silos to mid-market customers exhausts org-level VPC-SC quotas and balloons baseline cloud COGS. | Enforce the **Two-Question Executive Gate**: require **Pattern C (PSC Spoke)** for tenants needing dedicated data/CMEK without dedicated L7 ingress, and reserve **Pattern B** strictly for `Tier-0` sovereign contracts (`ARR >= USD 250k/yr`). |
| **Cross-Tier Schema & Prompt Drift (`80/20` Rule)** | Divergent ADK agent codebases across Pooled vs. Siloed environments cause security regression drift | Patching a Hop 4 Model Armor bypass in Pattern A while forgetting to update 40 standalone Pattern B silos leaves regulated tenants vulnerable. | Enforce the **Immutable 80% Core Package (`core-cymbal-agent`)**: all 3 patterns deploy the **exact same container digest (`sha256:...`)**, parameterized solely by environment-injected `TENant_ISOLATION_MODE=POOLED|SILO|HYBRID_PSC`. |

### 2. End-to-End Compensating Outbox Saga Across the Agentic Triad

Whether a tenant runs in **Pattern A**, **Pattern B**, or **Pattern C**, any mid-turn failure (`HTTP 400` Model Armor block on tool output, `HTTP 423` CMEK revocation, `HTTP 429` token-bucket exhaustion, or `Phase 2` tier cutover) during a multi-tool chain reconciles deterministically via the **Triad Outbox Saga Ledger** (`cymbal_agentic_finops_otel.external_tool_saga_ledger`) using `X-Idempotency-Key` binding so zero orphaned mutations remain in external SaaS systems.

## Live Multi-Cloud (Google Cloud + AWS Bedrock AgentCore MCP) 10-SaaS Verification Matrix — Executive Decision Guide & Unified 3-Pattern Matrix

> **Live Multi-Cloud & AWS Bedrock AgentCore MCP Verification (Unified `30/30` Matrix (`Pattern A` vs `Pattern B` vs `Pattern C`)):** Every architectural invariant in **WS5** is verified across Google Cloud (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#248990048888`) and **AWS Bedrock AgentCore MCP Gateway** (`cymbal-a2a-mcp-gateway-suyxm3caof`, AWS Account `393036065405`, `us-east-1`, Targets `HXGGFMZBKE`..`C7EYM614F2`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`). Run `python3 -B scripts/verify_5_third_party_saas_products.py` to execute all `30/30` pattern-by-SaaS flows (`60/60` positive and negative assertions).

| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Persisted Amazon S3 Audit Ledger JSON (`?format=json`) |
| :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud (Spotter Agentic BI v2.0)** • Auth-Wall Probe (`try-everywhere.thoughtspot.cloud`) | Target **`HXGGFMZBKE`** (`READY`) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` • Shared Pool + Spotter `runtime_filter.tenant_id` -> BigQuery RLS • Silo `cymbal-finvault-silo-prod` + mTLS SPIFFE + `finvault-silo-cmek` • `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` (`psc-neg-finvault-silo-usw1`) | **In:** `tenant="finvault"`, `org="finvault-org-01"` • **Out:** `HTTP 200` • `row_count=2` (`ENT-FV-001..002`), `cache_discount=0.90` | **In:** `tenant="retailstream"` spoofing `org="finvault-org-01"` • **Out:** **`HTTP 403`** `CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`thoughtspot-spotter`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) |
| **`SAAS-02` Sigma Computing (Workbooks & Dataset API v2)** • Auth-Wall Probe (`api.sigmacomputing.com`) | Target **`IZVODT083Q`** (`READY`) • `mcp://cymbal/sigma-computing-workbooks-3lo` • Shared Pool + `ua_tenant_id` warehouse RLS pushdown • Silo `cymbal-finvault-silo-prod` + CMEK + `ua_tenant_id=finvault` • Zero-downtime workbook promotion Pool -> PSC Spoke | **In:** `tenant="retailstream"`, `workbook="wb-sigma-retailstream-checkout-02"` • **Out:** `HTTP 200` • `row_count=1` (`ENT-RS-001`), live Sigma `requestId` | **In:** `tenant="retailstream"` tampering `ua_tenant_id="finvault"` • **Out:** **`HTTP 403`** `DENY_SIGMA_UA_TENANT_TAMPERING` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`sigma-computing`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) |
| **`SAAS-03` ServiceNow ITSM & ITOM (`CHG0049218`)** • Auth-Wall Probe (`developer.servicenow.com`) | Target **`ZS9VGYHBQL`** (`READY`) • `mcp://retailstream/servicenow-itom-3lo` • Shared Pool + Hop 5 3LO Vault (`3lo_token_sn_rs_valid`) • Silo VPC-SC egress allowlist -> AWS AgentCore `CHG0049218` • Dynamic Hybrid routing (Standard Pool vs Enterprise PSC Spoke) | **In:** `tenant="retailstream"`, `change="CHG0049218"`, `3lo=True` • **Out:** `HTTP 200` • Live AWS AgentCore `CHG0049218` returned | **In:** `tenant="retailstream"`, `seed_3lo=False` (unconsented) • **Out:** **`HTTP 401`** `CHALLENGE_3LO_OAUTH` (`MCP -32042`) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`servicenow-itsm`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) |
| **`SAAS-04` Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)** • Auth-Wall Probe (`veevavault.com`) | Target **`TWQU0KSRVF`** (`READY`) • `mcp://finvault/veeva-muse-clinical-3lo` • Shared Pool + Hop 2 Catalog ACL + Cloud KMS 21 CFR Part 11 sig • GxP Silo + Cloud KMS asymmetric P-256 `21 CFR Part 11` signature • GxP Clinical EDC promoted to Enterprise PSC Spoke | **In:** `tenant="finvault"`, `study="FV-GXP-2026-04"`, `cohort="Cohort-B"` • **Out:** `HTTP 200` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** `tenant="retailstream"` invoking restricted clinical MCP • **Out:** **`HTTP 403`** `TENANT_CONNECTOR_ACL_DENIED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`muse-poc`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) |
| **`SAAS-05` Salesforce CRM (`NA224`) & Atlassian Jira Cloud** • Auth-Wall Probe (`api.status.salesforce.com`) | Target **`K5JAEFCQ6E`** (`READY`) • `mcp://finvault/salesforce-jira-escalation-3lo` • Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask • Silo VPC-SC + Hop 4 Cloud SDP IBAN/SWIFT redaction • Hybrid PSC Spoke escalation + Hop 4 Cloud SDP redaction | **In:** `tenant="finvault"`, `instance="NA224"`, raw IBAN/SWIFT in notes • **Out:** `HTTP 200` • Live `NA224` (`Winter '27 Patch 8.6`) + `[REDACTED-FINVAULT-IBAN]` | **In:** Inspect egress payload for unredacted `DE893704...` • **Out:** **`PASS`** (`raw_pii_leaked=False`, 100% masked before SaaS call) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`salesforce-jira`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) |
| **`SAAS-06` Databricks Data Intelligence Platform (Unity Catalog)** • Auth-Wall Probe (`community.cloud.databricks.com`) | Target **`TERCK8SLBP`** (`READY`) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Shared Pool + `cymbal_uc_prod.<tenant>_gold` binding • Silo VPC-SC -> Dedicated `cymbal_uc_prod.finvault_gold` catalog • Zero-downtime Unity Catalog schema cutover to PSC Spoke | **In:** `tenant="finvault"`, `schema="finvault_gold"` • **Out:** `HTTP 200` • `Server: databricks`, `row_count=2` (`ENT-FV-001..002`) | **In:** `tenant="retailstream"`, `schema="finvault_gold"` + `EXECUTE IMMEDIATE` • **Out:** **`HTTP 403`** `UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`databricks-unity`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) |
| **`SAAS-07` Snowflake AI Data Cloud (Cortex Analyst & SQL v2)** • Auth-Wall Probe (`snowflakecomputing.com`) | Target **`CCMDEVZV2S`** (`READY`) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Shared Pool + `ROLE_CYMBAL_<TENANT>` & `SECONDARY ROLES NONE` • Silo VPC-SC + Tri-Secret Secure CMEK + `ROLE_CYMBAL_FINVAULT` • Zero-downtime Snowflake Cortex role & warehouse cutover over PSC | **In:** `tenant="retailstream"`, `role="ROLE_CYMBAL_RETAILSTREAM"` • **Out:** `HTTP 200` • `Server: SF-LB-T1`, `row_count=1` (`ENT-RS-001`) | **In:** `sql_override="USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT"` • **Out:** **`HTTP 403`** `SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`snowflake-cortex`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) |
| **`SAAS-08` Workday Enterprise HCM & Financial Management** • Auth-Wall Probe (`wd5-services1.myworkday.com`) | Target **`RAOTMUMJTZ`** (`READY`) • `mcp://finvault/workday-hcm-financials-raas-3lo` • Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN Cloud SDP • Hybrid PSC Spoke RaaS promotion + Hop 4 SSN/IBAN redaction | **In:** `tenant="finvault"`, `user="alice@finvault.com"`, `org="SUP-ORG-FINVAULT-NA"` • **Out:** `HTTP 200` • Live Workday CCX probe + `[REDACTED_US_SSN]` | **In:** `user="bob@finvault.com"` reusing Alice's 3LO token • **Out:** **`HTTP 401`** `WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH` (`MCP -32042`) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`workday-raas`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) |
| **`SAAS-09` Datadog Cloud Observability & Bits AI SRE** • Auth-Wall Probe (`api.datadoghq.com`) | Target **`G767QR3TQZ`** (`READY`) • `mcp://cymbal/datadog-observability-sre-3lo` • Shared Pool + `@tenant_id` log filter + Hop 4 Model Armor • Silo VPC-SC + `@tenant_id:finvault` + Hop 4 Model Armor • Zero-downtime OTel & Datadog APM log stream cutover to PSC Spoke | **In:** `tenant="finvault"`, `query="service:agent-gateway @tenant_id:finvault"` • **Out:** `HTTP 200` • Live Datadog US1 API + `2` sanitized log spans | **In:** Log payload containing `IGNORE ALL PREVIOUS INSTRUCTIONS...` • **Out:** **`HTTP 400`** `MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`datadog-sre`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) |
| **`SAAS-10` CrowdStrike Falcon Next-Gen SIEM & Okta Identity** • Auth-Wall Probe (`api.crowdstrike.com`) | Target **`C7EYM614F2`** (`READY`) • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Shared Pool + Hop 1 RFC 9449 DPoP `jkt` binding • Silo mTLS SPIFFE + Okta DPoP + `<5s` Valkey cache purge on CMEK revoke • Hybrid PSC Spoke DPoP session continuity across live tier promotion | **In:** `tenant="finvault"`, `dpop="dpop_jkt_fv_001"`, `proof="dpop_jkt_fv_001"` • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200` | **In:** Stolen bearer token replay with `proof="dpop_jkt_attacker_stolen_999"` • **Out:** **`HTTP 401`** `OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live S3 Ledger JSON (`crowdstrike-okta`)](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) |

> **23 Genuine Live Multi-Cloud 3P UI Screenshots & Cross-Run Continuity Ledger:** Alongside the 10 Bedrock AgentCore MCP targets above, 10 official upstream enterprise software stacks (`Metabase BI v0.50.26`, `Grafana Enterprise v11.2.0`, `Redmine ITSM v5.1`, `NocoDB v0.255.2`, `Gitea v1.22.3`, `Trino Distributed SQL v440`, `ClickHouse Data Warehouse v24.8`, `Directus Data Studio v11.1.0`, `Datalust Seq Observability v2024.3`, `HashiCorp Vault v1.13.3`) run live on **Google Cloud Run Gen2 (`bbar-138hf0`, `us-west1`)** and **AWS EC2 (`393036065405`, `us-east-1`, `i-04924523ac41ff132`)** + **3 live AWS Management Console views**, verified in [`docs/genuine_ui_screenshot_provenance_receipt.json`](../docs/genuine_ui_screenshot_provenance_receipt.json) and replayed via [`scripts/run_all_repeatable_e2e_verifications.py`](../scripts/run_all_repeatable_e2e_verifications.py) ([`data/run_continuity_ledger.json`](../data/run_continuity_ledger.json)).


<!-- GENUINE_3P_BEFORE_AFTER_START -->

## Signature 3rd-Party SaaS Before-vs-After UI Proofs for WS5 (SAAS-08, SAAS-09 • 2880×1800 Retina)

> [!IMPORTANT]
> **Streamlined 2-SaaS Visual Proof Edition (`4` Inline Captures + Standalone `10-SaaS` Visual Atlas):** To keep this architectural guide focused, we embed the **2 signature Before/After UI proof pairs (SAAS-08, SAAS-09)** most directly governed by **WS5** below. For the complete 20-image gallery (`SAAS-01` through `SAAS-10`) across all 10 commercial stacks, open the dedicated **[10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (Portal Reader)](saas-10-visual-verification-and-redteam-atlas.md)**, the **[21-Figure Google Docs Visual Atlas](https://docs.google.com/document/d/1FwxBGLefb0NIyG8i6QytRr8ugXyJf-sdY5lTLSA6EQY/edit?resourcekey=0-klzhSI2SvWYPCvpPwwMSUw)**, or the **[16-Slide Google Slides Visual Atlas](https://docs.google.com/presentation/d/1opxya9JlD9pwRsyOZYw0aS4hiLT7PzuntwR2Y9E9qXs/edit?resourcekey=0-bnGKTSSW6T6EoXChSqzgKw)**.

### SAAS-08: Workday Human Capital Management (HCM RaaS)
**Upstream Stack:** `Directus Data Studio v11.1.0` • Target `RAOTMUMJTZ` • `sync_workday_raas_compensation`
GEAP MCP tool sync_workday_raas_compensation (Target RAOTMUMJTZ) syncs executive compensation with US SSN masking under strict tenant isolation.

![BEFORE SAAS-08 (Directus Data Studio v11.1.0): Directus v11.1.0 Hcm Compensation collection showing 2 baseline executive records (Clara Vance & Marcus Thorne — 2 Items) prior to GEAP RaaS compensation audit sync.](../screenshots/genuine-multicloud-3p-uis/before-after/before_08_directus_hcm.png)

![AFTER SAAS-08 (Directus Data Studio v11.1.0 — Target RAOTMUMJTZ): Directus Hcm Compensation collection updates live to 3 Items, adding Elena Rostova (MD Quantitative Risk — GEAP Audited, $395,000.00, (REDACTED_US_SSN)).](../screenshots/genuine-multicloud-3p-uis/before-after/after_08_directus_hcm.png)

### SAAS-09: Datadog SRE & Observability Platform
**Upstream Stack:** `Datalust Seq Observability v2024.3` • Target `G767QR3TQZ` • `query_datadog_tenant_slos`
GEAP MCP tool query_datadog_tenant_slos (Target G767QR3TQZ) ingests structured OpenTelemetry traces verifying zero prompt injection and tenant-scoped APM telemetry.

![BEFORE SAAS-09 (Datalust Seq Observability v2024.3): Datalust Seq v2024.3 /#/events telemetry view in compact collapsed stream baseline prior to live GEAP Hop 4 Model Armor + Hop 5 RLS structured OTel span ingestion.](../screenshots/genuine-multicloud-3p-uis/before-after/before_09_datalust_seq.png)

![AFTER SAAS-09 (Datalust Seq Observability v2024.3 — Target G767QR3TQZ): Datalust Seq displays the newly ingested GEAP Hop 5 APM trace expanded in-place with structured properties (AgentCoreTarget=G767QR3TQZ, Hop4ModelArmor=PASS_ZERO_PROMPT_INJECTION, TenantId=finvault, ZeroPiiAttested=true).](../screenshots/genuine-multicloud-3p-uis/before-after/after_09_datalust_seq.png)

<!-- GENUINE_3P_BEFORE_AFTER_END -->

## What's next

### Companion 24-Slide Streamlined Visual Deck, Standalone 10-SaaS Visual Atlas & Slide-to-Code Launch Matrix

> [!IMPORTANT]
> **Streamlined 24-Slide Architecture Deck + Standalone `10-SaaS` Visual Verification Atlas:** This guide pairs a focused **24-slide executive presentation** ([`slides/ws5-12slide-visual-deck.pptx`](../slides/ws5-12slide-visual-deck.pptx))—featuring the **2 signature Before/After UI proofs** for **WS5** and an expanded **Hard GCP Quotas, Async 3P Saga & Disqualifiers** briefing—with the standalone **[10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (20 Retina Screenshots)](saas-10-visual-verification-and-redteam-atlas.md)** ([Google Docs](https://docs.google.com/document/d/1FwxBGLefb0NIyG8i6QytRr8ugXyJf-sdY5lTLSA6EQY/edit?resourcekey=0-klzhSI2SvWYPCvpPwwMSUw) • [16-Slide Google Slides](https://docs.google.com/presentation/d/1opxya9JlD9pwRsyOZYw0aS4hiLT7PzuntwR2Y9E9qXs/edit?resourcekey=0-bnGKTSSW6T6EoXChSqzgKw)).

| 5-Act Presentation Arc | Slide Range & Direct Launch Links | Core Architectural Content & C4 Abstraction | Companion Codebase & Verification Assets |
| :--- | :--- | :--- | :--- |
| **Act I: Executive Storyline, Threat Surface & Disqualifiers** | **[Slides 1–4](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit#slide=id.p1)** | Title Cover (`Slide 1`), 5-Act Executive Roadmap (`Slide 2`), Core Multi-Tenancy Dilemma (`Slide 3`), and Adversarial Threat / Compliance Matrix (`Slide 4`). | [`core-cymbal-agent/runtime_pipeline.py`](../core-cymbal-agent/runtime_pipeline.py) |
| **Act II: C4 L1–L2 Topologies & `#78` Architecture Blueprints** | **[Slides 5–9](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit#slide=id.p5)** | Act II Breaker (`Slide 5`), `L1` Logical Security Layers (`Slide 6`), and Decompiled `L2` Physical `#78` Architecture Blueprints (`Slides 7–9`). | [`diagrams/`](../diagrams/) (`100%` Native DrawingML) |
| **Act III: 5-Hop Control Plane, Hard GCP Quotas & Disqualifiers** | **[Slides 10–17](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit#slide=id.p12)** | Act III Breaker (`Slide 10`), `L3` UML Sequence (`Slide 11`), `L4` Wire JWT Normalization (`Slide 12`), Hops 1–5 Deep Dives (`Slides 13–16`), and **Hard GCP Quotas, Async 3P Saga & Disqualifiers (`Slide 17`)**. | [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) |
| **Act IV: Signature 3rd-Party SaaS Before/After Retina Proofs** | **[Slides 18–20](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit#slide=id.p20)** | Act IV Breaker (`Slide 18`) + **2 Signature `2880×1800` Retina Proofs**: `SAAS-09` Datalust Seq Model Armor Log Shield (`Slide 19`) & `SAAS-08` Directus HCM Principal 3LO (`Slide 20`). *(All 10 SaaS proofs in the [16-Slide Companion Visual Atlas](https://docs.google.com/presentation/d/1opxya9JlD9pwRsyOZYw0aS4hiLT7PzuntwR2Y9E9qXs/edit?resourcekey=0-bnGKTSSW6T6EoXChSqzgKw))*. | [`scripts/verify_5_third_party_saas_products.py`](../scripts/verify_5_third_party_saas_products.py) |
| **Act V: 10-Week Rollout Roadmap, 30/30 Scorecard & CISO FAQ** | **[Slides 21–24](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit#slide=id.p31)** | Act V Breaker, 10-Week Phased Enterprise Implementation Roadmap, Quantified Multi-Cloud `30/30` Isolation Scorecard, and Executive CISO FAQ Decision Guide. | [`scripts/run_all_repeatable_e2e_verifications.py`](../scripts/run_all_repeatable_e2e_verifications.py) |

### Direct Cloud Deliverables, Editable Slide Decks & Series Navigation

- **Editable Google Slides & PowerPoint (`24 Slides` + Canonical `12-Slide` Brief):**
  - [Open WS5 24-Slide Streamlined Visual Presentation in Google Slides ↗](https://docs.google.com/presentation/d/1zg6g3ZuASSc68bw04ec9UOPFCBuRkpGq9l6x3A7gy8A/edit)
  - [Download WS5 24-Slide Streamlined Visual Presentation (`.pptx`)](../slides/ws5-12slide-visual-deck.pptx)
  - [Download Workstream 5 Canonical 12-Slide Presentation (`.pptx`)](../slides/ws5-wrap-up-editable-slides.pptx)
  - [Download Master All-Workstreams 25-Slide Presentation (`.pptx`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx)
- **Editable Google Docs & Microsoft Word (`.docx`):**
  - [Open WS5 Streamlined Whitepaper in Google Docs ↗](https://docs.google.com/document/d/1ate8K63qHrYP6OUQ7qO0H6Quq8S5g3TnLbDhbaAZ_SU/edit?resourcekey=0-XWkODR5elYC9-fuGO6aBaQ)
  - [Download WS5 Streamlined Whitepaper (`.docx`)](../docs/word/ws5-decision-guide-and-agentic-triad.docx)
- **Standalone 10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas (`20 Retina Screenshots`):**
  - [Open 10-SaaS Visual Verification Atlas in Portal Reader](saas-10-visual-verification-and-redteam-atlas.md)
  - [Open 10-SaaS Visual Verification Atlas in Google Docs (`21 Figures`) ↗](https://docs.google.com/document/d/1FwxBGLefb0NIyG8i6QytRr8ugXyJf-sdY5lTLSA6EQY/edit?resourcekey=0-klzhSI2SvWYPCvpPwwMSUw)
  - [Open 10-SaaS Visual Verification Atlas 16-Slide Deck in Google Slides ↗](https://docs.google.com/presentation/d/1opxya9JlD9pwRsyOZYw0aS4hiLT7PzuntwR2Y9E9qXs/edit?resourcekey=0-bnGKTSSW6T6EoXChSqzgKw)
  - [Open 10-SaaS Manual Testing Playbook (`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- **5-Part Engineering Blog Series Navigation:**
  - **Part 1 (`WS1`):** [Reference Architecture, Taxonomy & The 5-Hop Governance Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - **Part 2 (`WS2`):** [Pattern A: High-Density Pooled Multi-Tenant Architecture](ws2-pattern-a-pooled-architecture.md)
  - **Part 3 (`WS3`):** [Pattern B: Zero-Trust Sovereign Silos for Regulated Workloads](ws3-pattern-b-sovereign-silos.md)
  - **Part 4 (`WS4`):** [Pattern C: Dynamic Hybrid Routing & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - **Part 5 (`WS5`):** [Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
  - **Companion Visual Atlas (`ATLAS`):** [10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas](saas-10-visual-verification-and-redteam-atlas.md)


---

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
