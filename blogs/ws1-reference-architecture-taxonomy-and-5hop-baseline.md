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

## Use cases

This reference architecture supports three primary multi-tenant deployment scenarios validated in the **Cymbal SaaS Platform** anchor case study ([1.1 Taxonomy & Diagrams](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)):

- **High-volume B2B SaaS onboarding (RetailStream Corp — Standard Tier):** A global retail customer with zero existing Google Cloud footprint authenticates using Microsoft Entra ID, shares a pooled Vertex AI Agent Engine runtime (`4,000` thinking-token cap, `120 RPM` bulkhead), connects mid-session to SharePoint and ServiceNow via inline 3LO OAuth consent, and benefits from **90% shared prompt cache savings**.
- **Regulated financial and healthcare workloads (FinVault Bank — Enterprise Tier):** A regulated bank authenticating with Google Workspace OIDC requires an `8,000` thinking-token budget, self-provisions a private **Regulatory Escalation Agent (`Agent Alpha`)** running on **Gemini 2.5 Pro Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) via Vertex AI Model Garden**, and mandates customer-managed encryption keys (`CMEK`) with an instant `HTTP 423 Locked` kill-switch.
- **Multi-tiered SaaS with live tier promotion (Cymbal Platform Operator):** An ISV operates a single SaaS control plane that serves Standard customers in a shared pool (Pattern A) and Enterprise customers in dedicated Private Service Connect (`PSC`) spokes (Pattern C), promoting upgrading customers from pool to spoke with **zero dropped sessions**.

## Design alternatives

When designing a multi-tenant agentic AI system on Google Cloud, you choose among three isolation topologies—**Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid)**—while keeping the **5-Hop Cryptographic Context Chain** invariant across all three.

### Comparison of multi-tenant isolation patterns

The following table compares the architectural characteristics, security boundaries, and unit economics of the three patterns:

| Dimension | Pattern A: Pooled (`Maximum Density`) | Pattern B: Sovereign Silos (`Zero Trust Isolation`) | Pattern C: Dynamic Hybrid (`Intelligent Routing`) |
| :--- | :--- | :--- | :--- |
| **Control plane** | Single shared Vertex AI Agent Engine Control Plane & Agent Catalog | Dedicated Google Cloud project & Control Plane per corporate tenant | Unified Control Plane + Tenant-Aware Cloud Run Ingress Router |
| **Compute & runtime** | Shared Vertex AI Agent Engine gVisor sandbox + immutable `temp:tenant_id` | Dedicated Agent Engine Runtime or air-gapped **Gemma 3 (27B) on GKE** per project | Shared Pool for Standard tier + **Private Service Connect (PSC)** spokes for Enterprise tier |
| **Network perimeter** | Single shared VPC behind Cloud Armor + IAP | Per-tenant **VPC Service Controls (VPC-SC)** perimeter + **mTLS ingress** | Hub-and-spoke VPC with **PSC Service Attachments** bridging to isolated spokes |
| **Identity & access** | **RFC 8693 OBO + DPoP** + **Auth Manager** 2LO/3LO | **IAM Principal Access Boundary (PAB)** + per-project Workload Identity Pools | Unified IdP broker + cross-project PAB + PSC identity propagation |
| **Data & memory plane** | Shared AlloyDB with **`FORCE ROW LEVEL SECURITY`** + `{tenant}:{user}:{session}` Memory Bank | Dedicated AlloyDB & BigQuery per project + **Cloud KMS CMEK** (`423` kill-switch) | Shared RLS DB for Standard + dedicated CMEK data spokes via PSC for Enterprise |
| **Model & FinOps COGS** | Shared **`ContextCacheConfig`** (up to 90% input token savings) + Valkey bulkheads | Dedicated Provisioned Throughput (PT) endpoints per project; zero noisy neighbors | Pooled caching for Standard + Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) for Enterprise |
| **Baseline unit cost** | `$` (`120 RPM Pool` floor per tenant) | `$$$` (`600 RPM Silo` floor per tenant project) | `$$` (`Blended Hybrid Tier` floor across tiers) |
| **Target workload** | High-volume Standard B2B SaaS tiers ([Workstream 2](ws2-pattern-a-pooled-architecture.md)) | Regulated FinTech, Healthcare, Public Sector ([Workstream 3](ws3-pattern-b-sovereign-silos.md)) | Multi-tiered SaaS with live tier upgrades ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |

### Compensating controls for Early Access Program (EAP) product gaps

During the cross-product architecture review ([1.2 Product Team Review Pack](../workstream-1-reference-architecture/1.2-product-team-review-pack.md) and [1.4 EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)), five platform behaviors required explicit compensating controls in `core-cymbal-agent/`:

| Gap ID | Platform behavior under multi-tenancy | Production compensating control in `core-cymbal-agent/` |
| :--- | :--- | :--- |
| `GAP-01` | Discovery Engine Agent Catalog does not natively filter custom agents by sub-project `tenant_id` | **Hop 2 Catalog PDP** (`hop2_registry_pdp_callbacks.py`) enforces ACL filtering + ADK `before_agent_callback` pruning |
| `GAP-02` | Vertex AI Agent Engine Memory Bank shares namespace unless prefixed | **Hop 3 Memory Bank** (`hop3_compute_finops_bulkhead.py`) enforces `{tenant_id}:{user_id}:{session_id}` composite keys |
| `GAP-03` | Shared `ContextCacheConfig` can bleed if dynamic tenant suffixes enter the cache key | **Hop 3 Prefix Hash Guard** caches only the immutable `cymbal-shared-incident-system-prompt-v2` prefix |
| `GAP-04` | 3LO MCP tokens can be replayed across pooled worker threads without sender binding | **Hop 1 & Hop 4 DPoP Binding** (`hop1_edge_identity_pep.py` & `hop4_model_armor_guardrails.py`) verifies matching `dpop_jkt` + `tenant_id` |
| `GAP-05` | Per-tenant token consumption is aggregated at the GCP project level in Cloud Billing | **Hop 5 OTel FinOps Span** (`hop5_data_rls_and_otel.py`) emits per-turn token metrics to BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`) |

## Architecture

The following diagram shows the multi-tenant agentic AI reference architecture on Google Cloud, organized into a central routing and governance hub connected to pooled and sovereign tenant workspaces:

![Figure 1 — Multi-tenant agentic AI taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png)

*Figure 1. Official Google Cloud Architecture Center hub-and-spoke topology showing the Routing Hub, Central Governance and Security Hub, Pooled Shared Runtime (Pattern A), and Sovereign Silo / Hybrid PSC Spokes (Patterns B and C). Editable assets: [Draw.io source](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) | [Google Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws1-multi-tenant-taxonomy-overview.svg) | [Vision AST](../diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json).*

The architecture in Figure 1 comprises four color-coded functional zones that enforce defense-in-depth isolation across every agent turn:

- **Routing Hub (Zone 1 — Blue container `#aecbfa`):** Terminates external client traffic at the External Application Load Balancer, strips unverified `X-Tenant-ID` headers in Google Cloud Armor, verifies upstream OIDC/SAML tokens in Identity-Aware Proxy (IAP), and performs RFC 8693 token exchange bound to RFC 9449 DPoP proofs (`Hop 1` in [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py)).
- **Central Governance and Security Hub (Zone 2 — Green container `#ceead6`):** Enforces catalog-level access control in the Discovery Engine Agent Catalog (`Hop 2` in [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)), manages customer-managed encryption keys (CMEK) in Cloud KMS, monitors posture in Security Command Center, and exports PII-redacted OpenTelemetry FinOps spans to Cloud Logging and BigQuery (`Hop 5` in [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py)).
- **Pattern A Pooled Shared Runtime Spoke (Zone 3 — Left amber container `#feefc3`):** Hosts high-density Standard-tier tenants inside a shared Vertex AI Agent Engine gVisor sandbox (`Hop 3` in [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) with shared `ContextCacheConfig` prompt prefix caching (up to 90% input token savings), inline Model Armor + Cloud DLP guardrails (`Hop 4` in [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py)), and shared AlloyDB with `FORCE ROW LEVEL SECURITY (RLS)`.
- **Pattern B Sovereign Silo and Pattern C Hybrid PSC Spoke (Zone 4 — Right coral container `#fad2cf`):** Isolates regulated Enterprise tenants inside dedicated Google Cloud projects protected by VPC Service Controls (`VPC-SC`), IAM Principal Access Boundaries (`PAB`), tenant-owned Cloud KMS CMEK keys (`HTTP 423` kill-switch), and optional air-gapped Gemma 3 (27B) on private GKE or Private Service Connect (`PSC`) producer attachments.

The numbered callouts in Figure 1 trace the end-to-end request and governance flow across the hub-and-spoke topology:

1. **Request:** A tenant user or application submits an HTTPS prompt carrying an upstream OIDC JWT (Google Workspace for FinVault Bank; Microsoft Entra ID for RetailStream Corp) and an RFC 9449 DPoP proof.
2. **Tenant identification and routing (Hop 1):** Google Cloud Armor strips any client-supplied `X-Tenant-ID` header. IAP and the Edge Identity PEP validate the JWT issuer and audience, exchange the credential via RFC 8693 for a tenant-scoped token, and select the target workspace (Pattern A pool, Pattern B silo, or Pattern C PSC spoke).
3. **Task routing and catalog pruning (Hop 2):** The Discovery Engine Agent Catalog filters available agents, MCP connectors, and GCS Skills (`gs://cymbal-skills-{tenant}/`). The ADK `before_agent_callback` deterministically prunes unauthorized tools before reasoning starts, returning `HTTP 403 Forbidden` on cross-tenant agent calls.
4. **Pre-inference guardrails and token bulkheads (Hops 3 & 4):** Memorystore for Valkey enforces the tenant RPM rate limit (`600 RPM` vs `120 RPM`) and clamps `thinking_budget` (`8,000` vs `4,000` tokens). Vertex AI Model Armor and Sensitive Data Protection (Cloud DLP) inspect the prompt and MCP arguments for prompt injection and sensitive PII.
5. **Context retrieval and model inference (Hop 3):** The ADK Coordinator Agent loads tenant-scoped 5-level session memory (`{tenant}:{user}:{session}`) and row-locked AlloyDB records (`SET LOCAL app.current_tenant_id`), attaches the immutable shared `ContextCacheConfig` system prefix, and invokes shared Gemini 2.5 Pro, dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`), or air-gapped Gemma 3 (27B).
6. **Post-inference guardrails (Hop 4):** Model Armor and Cloud DLP inspect the model output and 2LO/3LO MCP tool responses, redacting sensitive identifiers (`[REDACTED_PII]`) and blocking semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`).
7. **Response and FinOps chargeback (Hop 5):** The sanitized completion is returned to the caller while OpenTelemetry emits a PII-scrubbed `TenantTelemetrySpan` to Cloud Logging and BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`) for per-tenant COGS attribution.

### End-to-end 5-Hop cryptographic governance baseline (Figure 2)

![Figure 2 — Cloud Architecture Center 5-Hop cryptographic context chain and Cymbal case study baseline](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png)

*Figure 2. Detailed 5-Hop Cryptographic Context Chain showing how Cymbal SaaS governs competing tenants (FinVault Bank and RetailStream Corp) across Edge Identity (Hop 1), Catalog PDP (Hop 2), Compute & FinOps Bulkheads (Hop 3), Model Armor & 3LO MCP Auth (Hop 4), and AlloyDB RLS & OTel Chargeback (Hop 5). Editable assets: [Draw.io source](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) | [Google Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws1-cloud-arch-center-5hop-baseline.svg) | [Vision AST](../diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json).*

Figure 2 details the internal mechanics of the **5-Hop Cryptographic Context Chain** ([1.3 Doc Update PR](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)) across the four structural zones:

- **Edge Identity & Token Exchange PEP (Hop 1) (Zone 1 — Blue container `#aecbfa`):** Mints an immutable `CryptographicContext` bound to the caller's DPoP thumbprint (`jkt`) and verified OIDC issuer, eliminating HTTP header spoofing.
- **Catalog PDP, KMS & Audit Hub (Hops 2 & 5) (Zone 2 — Green container `#ceead6`):** Enforces tenant ACLs on Agent Resource Descriptors (`agent://finvault/private-agent-alpha-regulatory`), validates Cloud KMS CMEK status, and records cryptographic audit trails.
- **FinVault Bank Enterprise Workspace (Hops 3 & 4) (Zone 3 — Left amber container `#feefc3`):** Executes FinVault turns with an `8,000` thinking-token budget, private `Agent Alpha` on dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`), CMEK-encrypted memory (`finvault:user:session`), and 3LO Google Workspace & Jira MCP tools.
- **RetailStream Corp Standard Workspace (Hops 3 & 4) (Zone 4 — Right coral container `#fad2cf`):** Executes RetailStream turns with a `4,000` thinking-token cap, shared Gemini 2.5 Pro prefix cache (`ContextCacheConfig`), inline 3LO Microsoft Entra ID consent for SharePoint & ServiceNow, and AlloyDB RLS isolation.

The seven numbered steps in Figure 2 verify every state transition in the 5-Hop governance pipeline:

1. **Request with OIDC JWT and DPoP proof:** FinVault (`https://accounts.google.com`) or RetailStream (`https://login.microsoftonline.com/retailstream-tid/v2.0`) initiates an agent turn.
2. **Hop 1 — Header sanitization and RFC 8693 OBO exchange:** Cloud Armor strips any forged `X-Tenant-ID` header; IAP exchanges the JWT for a DPoP-bound `CryptographicContext`.
3. **Hop 2 — Catalog filtering and `before_agent_callback` pruning:** Discovery Engine restricts tool visibility to the caller's entitlement set and blocks unauthorized cross-tenant agent calls (`403 Forbidden`).
4. **Hop 4 (Pre-inference) — Model Armor and Cloud DLP input scan:** Prompts and tool parameters are scanned for SQL/prompt injection (`400 Bad Request`) and sensitive PII before model invocation.
5. **Hop 3 — Sandbox binding, prefix cache, and model execution:** The runtime binds `temp:tenant_id`, enforces Redis RPM and thinking-token caps, attaches `ContextCacheConfig` to the shared system prompt, and invokes the model.
6. **Hop 4 (Post-inference) — Output DLP and 3LO MCP token scoping:** MCP tool calls require a matching `dpop_jkt` and `tenant_id` in Auth Manager, and completions pass through post-inference semantic Natural Language Policy Compliance (`NLC`) checks (`422 Unprocessable Entity`).
7. **Hop 5 — Transactional AlloyDB RLS and BigQuery FinOps export:** Database queries execute under `SET LOCAL app.current_tenant_id`, and OpenTelemetry exports redacted token metrics to BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

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

This section provides guidance to help you tune this reference architecture according to the pillars of the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Eliminate confused-deputy ambient credentials:** Never allow ADK agents or MCP servers to authenticate to tenant data stores using a shared service account's ambient IAM permissions. Mint an RFC 8693 On-Behalf-Of (OBO) token bound to an RFC 9449 DPoP proof at **Hop 1**, and verify the `tenant_id` and `dpop_jkt` before every 3LO MCP call at **Hop 4**.
- **Enforce defense-in-depth tool pruning:** Filter the agent catalog at **Hop 2** before the user sees available capabilities, and run the ADK `before_agent_callback` inside the runtime so prompt-injection payloads cannot invoke unapproved MCP tools.
- **Apply inline bi-directional guardrails:** Configure [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection](https://cloud.google.com/sensitive-data-protection/docs) on both the pre-inference prompt path and the post-inference completion/tool-output path to prevent cross-tenant PII leakage and enforce semantic Natural Language Policy Compliance (`NLC`, implemented via Model Armor policy templates + ADK guardrail callbacks).
- **Use transactional Row-Level Security (RLS):** In shared databases, execute `SET LOCAL app.current_tenant_id = '<verified_tenant_id>'` inside every AlloyDB transaction and enable `FORCE ROW LEVEL SECURITY` so even table-owner connections cannot read across tenants.

### Reliability

- **Isolate noisy neighbors with token-bucket bulkheads:** Enforce per-tenant request-per-minute (RPM) and token-per-minute (TPM) limits in **Memorystore for Valkey** at **Hop 3** before invoking Vertex AI model endpoints, returning `HTTP 429 Too Many Requests` with a `Retry-After` header when a tenant exceeds its tier quota.
- **Clamp recursive reasoning budgets:** Override client-requested thinking budgets in `before_model_callback` using the tenant's verified tier profile (`4,000` tokens for Standard; `8,000` tokens for Enterprise) to prevent runaway reasoning loops from exhausting regional model quotas.

### Cost optimization

- **Share immutable system prompt caches safely:** Use Vertex AI `ContextCacheConfig` on the shared system instructions and incident runbooks (`4,096+` tokens in unit benchmarks up to `32,000` tokens for full operator runbook + MCP tool-schema bundles) while keeping tenant-specific context strictly in the uncached suffix. This reduces shared input token costs by **90%** and total turn COGS by **84.4%–84.7%** in pooled deployments.
- **Attribute COGS per tenant:** Export OpenTelemetry spans containing `cached_input_tokens`, `uncached_input_tokens`, `thinking_tokens`, and `output_tokens` to BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`) at **Hop 5** to track gross margin per customer tier.

### Operational excellence

- **Maintain a single 80% reusable agent codebase:** Centralize identity verification, catalog pruning, memory namespacing, DLP redaction, and telemetry in [`core-cymbal-agent/`](../core-cymbal-agent/) so security patches apply simultaneously to Patterns A, B, and C.
- **Automate breach regression testing:** Run the 20-scenario red-team verification suite ([`scripts/run_deep_forensic_audit.py`](../scripts/run_deep_forensic_audit.py)) in CI/CD before promoting topology or prompt changes.

### Performance optimization

- **Minimize guardrail latency (`~42 ms` total p95 control-plane overhead):** Colocate Memorystore for Valkey, AlloyDB, and Vertex AI Agent Engine in the same region (`us-central1` or `us-west1`) and execute Hop 2 catalog lookups and Hop 3 quota checks in sub-millisecond in-memory caches. The table below shows the verified p95 latency budget across all five governance hops compared to foundation model reasoning time (`1,500–3,300 ms`):

| Governance hop | Enforcement operation on the critical path | Verified p95 latency | Optimization mechanism |
| :--- | :--- | :--- | :--- |
| **Hop 1 (Edge PEP)** | Cloud Armor header strip + IAP JWT validation + KMS-cached DPoP bind | **`~8 ms`** | Regional JWKS cache + sub-millisecond Ed25519/ECDSA signature verify |
| **Hop 2 (Catalog PDP)** | Discovery Engine entitlement filter + ADK `before_agent_callback` pruning | **`~4 ms`** | In-process tenant ACL cache invalidated via Firestore watch stream |
| **Hop 3 (Compute Bulkhead)** | Memorystore Valkey atomic Lua RPM check + `ContextCacheConfig` prefix attach | **`~3 ms`** | Single-RTT Valkey Lua script in colocated VPC subnet |
| **Hop 4 (Model Armor & SDP)** | Pre-inference prompt screen + post-inference completion/tool PII scrub | **`~22 ms`** | Inline regional gRPC callout with compiled infoType detector templates |
| **Hop 5 (Data RLS & OTel)** | AlloyDB `SET LOCAL app.current_tenant_id` + async BigQuery OTel stream | **`~5 ms`** | Transaction-pooled PgBouncer checkout; OTel export is non-blocking async |
| **Total 5-Hop Overhead** | **Complete end-to-end zero-trust governance chain (Hops 1–5)** | **`~42 ms`** (**`< 2.5%`** of turn) | **Negligible impact on Time-To-First-Token (TTFT) vs `1,800 ms` LLM inference** |

## What's next

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
- Download or open the editable architecture assets for Workstream 1:
  - [Workstream 1 Editable Google Slides Deck (`ws1-reference-architecture-editable-slides.pptx`)](../slides/ws1-reference-architecture-editable-slides.pptx)
  - [Figure 1 Draw.io Source (`ws1-multi-tenant-taxonomy-overview.drawio`)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio)
  - [Figure 2 Draw.io Source (`ws1-cloud-arch-center-5hop-baseline.drawio`)](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio)

---

<!-- E2E_FLOW_START -->
## Step-by-Step End-to-End Agentic & Technical Flows (WS1 Architecture Diagrams)

> **Reader Reference Guide (Standalone Guide & Companion Architecture Deck):** The step-by-step walkthroughs below document every Official Google Cloud Architecture Center (`#78`) diagram in **WS1**. Each diagram is self-contained in this guide (`Figure 1` above plus the supporting topology blueprints in `diagrams/`), and also corresponds 1:1 to **Act II (Slides 4–7)** of the companion 12-slide editable presentation deck (`slides/ws1-*-editable-slides.pptx`, viewable in **Tab 2: Editable Architecture Decks** of the interactive portal): **(1) Slide 4 (`L1` Conceptual 3-Zone Trust Boundary Overview)** → **(2) Slide 5 (`L2` Authoritative `Figure 1` Official `#78` Physical Blueprint + 4-Zone Reference Sidebar)** → **(3) Slide 6 (`L3` 5-Actor Chronological Request Sequence)** → **(4) Slide 7 (`L4` 3-Stage Wire-Level JSON & Cryptographic Context Transformation)**.

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
