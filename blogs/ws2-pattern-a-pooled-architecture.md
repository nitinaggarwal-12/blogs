---
title: "Multi-tenant agentic AI system: Pattern A high-density pooled architecture"
subtitle: "Deploy competing B2B SaaS tenants inside a single shared Google Cloud project with 5-Hop cryptographic isolation, 10/10 red-team breach defenses, and 90% shared prompt cache savings"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 2 of 5"
workstream: "Workstream 2 • Pattern A — High-Density Pooled Architecture"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Cloud Architects, AI Platform Engineers, FinOps Leads, and CISOs at B2B SaaS organizations"
reading_time: "13 min read"
tags: ["Gemini Enterprise Agent Platform","ADK 2.0","Multi-Tenancy","Pooled Architecture","Vertex AI Model Armor","AlloyDB RLS","ContextCacheConfig","FinOps","Zero Trust"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws2-pattern-a-pooled-5hop-architecture","ws2-pattern-a-breach-defense-sequence","ws2-demo-env-and-3p-auth-sandbox-topology","ws2-terraform-starter-resource-graph"]
editable_slides: "slides/ws2-pattern-a-pooled-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Pattern A high-density pooled architecture

This document describes **Pattern A (High-Density Pooled Architecture)** for building and operating a multi-tenant agentic AI system on Google Cloud. In Pattern A, thousands of corporate B2B SaaS customers share a single Google Cloud project (`cymbal-pooled-saas-prod`), a shared [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) runtime, a shared [Gemini 2.5 Pro](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) prompt prefix cache (`ContextCacheConfig`), and a shared [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs) cluster while maintaining strict cryptographic tenant isolation.

This document is part 2 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (introduced in [Part 1: Reference architecture taxonomy and 5-Hop baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)). It is intended for cloud architects, AI platform engineers, and FinOps practitioners who need maximum tenant density and lowest unit cost (`120 RPM Pooled` baseline per tenant).

> **Key point:** Pattern A achieves **90% input token savings** on shared system instructions (`84.7%` total turn COGS reduction) while blocking **10 out of 10 automated cross-tenant breach vectors**—including HTTP header spoofing, private `Agent Alpha` enumeration, prompt injection, noisy-neighbor token exhaustion, and cross-tenant database queries.

## Use cases

Pattern A is designed for high-density B2B SaaS environments where unit economics and rapid self-service onboarding are primary business drivers ([2.1 Case Study & Solution Architecture](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)):

- **High-volume commercial and Standard SaaS tiers (self-service to mid-market ARR):** Serve thousands of Standard-tier organizations (such as **RetailStream Corp**) from a single Google Cloud project without incurring per-tenant project, VPC, or database cluster overhead.
- **Enterprise tenants with private custom agents inside a shared platform:** Allow Enterprise customers (such as **FinVault Bank**) to register private custom agents (`Agent Alpha` on **Gemini 2.5 Pro Dedicated Provisioned Throughput**) and CMEK-encrypted session memory inside the shared control plane while guaranteeing that competing tenants receive `HTTP 403 Forbidden` on any enumeration or invocation attempt.
- **Multi-IdP SaaS platforms serving Google and Microsoft customers:** Support customers authenticating via **Google Workspace OIDC** alongside customers using **Microsoft Entra ID** with mid-session 3LO OAuth consent to SharePoint, ServiceNow, Jira, and Google Drive.

## Design alternatives

### Shared prompt prefix caching (`ContextCacheConfig`) vs uncached per-turn prompts

A key economic advantage of Pattern A is sharing an immutable system prompt cache across all pooled tenants ([2.4 Product Gaps & FinOps Prioritization](../workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md)). Because cached prefix tokens on **Gemini 2.5 Pro** are billed at **10% of the standard input token rate** (a **90% discount**), sharing an immutable operator system prompt across tenants dramatically lowers per-turn COGS.

The table below reconciles both the **unit test benchmark** (`4,500` shared prefix tokens + `300` dynamic tenant tokens = `4,800` input tokens in `run_breach_simulations.py`) and the **full production SRE bundle** (`32,000` shared runbook + MCP schema prefix tokens + `2,000` dynamic tenant tokens = `34,000` input tokens shown in Figure 1):

| Cost component | Uncached per-turn prompt (`100%` input rate) | Pattern A with `ContextCacheConfig` (`10%` cached prefix rate) | Mechanism in `hop3_compute_finops_bulkhead.py` |
| :--- | :--- | :--- | :--- |
| **Unit benchmark prefix (`4,500` shared + `300` dynamic = `4,800` tokens)** | `4,800` full-rate input tokens | **`750` effective billable tokens** (`4,500 × 0.10 + 300`) — **`84.4%` input savings** | Cached under immutable key `cymbal-shared-incident-system-prompt-v2` |
| **Production SRE bundle (`32,000` shared + `2,000` dynamic = `34,000` tokens)** | `34,000` full-rate input tokens | **`5,200` effective billable tokens** (`32,000 × 0.10 + 2,000`) — **`84.7%` COGS reduction** | Shared read-only across all pooled tenants; `90%` discount on the `32k` prefix |
| **Tenant dynamic suffix (`300`–`2,000` tokens)** | Billed at `100%` standard input rate | Billed at `100%` standard input rate (**never cached across tenants**) | Appended per turn after `verify_context_cache_safety()` blocks cache poisoning |

### 10-point red-team breach verification matrix

Before deploying Pattern A to production, every deployment is validated against the 10-point red-team simulation suite ([`run_breach_simulations.py`](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)):

| Vector | Simulated attack scenario | Enforcing hop & module | Verified runtime result |
| :--- | :--- | :--- | :--- |
| **V1** | RetailStream injects `X-Tenant-ID: finvault` HTTP header | **Hop 1** (`hop1_edge_identity_pep.py`) | Header stripped; `tenant_id` pinned to `retailstream` |
| **V2** | RetailStream directly invokes `agent://finvault/private-agent-alpha-regulatory` | **Hop 2** (`hop2_registry_pdp_callbacks.py`) | Blocked with **`HTTP 403 Forbidden`** |
| **V3** | Prompt attempts to invoke FinVault's `jira-enterprise-3lo` MCP tool | **Hop 2** (`before_agent_callback`) | Tool pruned deterministically before model reasoning |
| **V4** | RetailStream requests `16,000` thinking tokens (tier cap is `4,000`) | **Hop 3** (`hop3_compute_finops_bulkhead.py`) | Clamped to **`4,000` tokens** (`clamped_tokens = 12,000`) |
| **V5** | Runaway loop sends `250 RPM` (RetailStream tier limit is `120 RPM`) | **Hop 3** (Memorystore for Valkey) | Blocked with **`HTTP 429 Too Many Requests`** |
| **V6** | Attempt to inject tenant suffix into shared `ContextCacheConfig` key | **Hop 3** (`verify_context_cache_safety`) | Rejected; cache key pinned to immutable shared prefix |
| **V7** | Cross-tenant read against Vertex AI Memory Bank | **Hop 3** (`{tenant}:{user}:{session}` key) | Zero cross-tenant records returned |
| **V8** | SQL/prompt injection & semantic NLC policy violation in user prompt | **Hop 4** (`hop4_model_armor_guardrails.py`) | Blocked with **`HTTP 400`** (injection) / **`HTTP 422`** (NLC) |
| **V9** | Replay of FinVault 3LO OAuth token from a RetailStream worker | **Hop 4** (Auth Manager + DPoP `jkt`) | Blocked with **`HTTP 401 Unauthorized`** |
| **V10** | Raw SSN / account PII in prompt and AlloyDB query without tenant filter | **Hops 4 & 5** (Cloud DLP + AlloyDB RLS) | Masked as `[REDACTED_PII]`; RLS returns `1` row (own tenant only) |

## Architecture

The following diagram shows the Pattern A high-density pooled architecture deployed inside a single shared Google Cloud project (`cymbal-pooled-saas-prod`):

![Figure 1 — Pattern A: High-density pooled multi-tenant architecture and shared runtime governance](../diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio.png)

*Figure 1. Official Google Cloud Architecture Center pooled-shared-plane topology (60 vertices, 20 edges) inside a single shared project (`cymbal-pooled-saas-prod`), showing Hop 1 & Hop 2 Edge PEP & Agent Catalog PDP, Hop 3 & 5 Shared FinOps, Cache & OTel Hub, the Pooled Agent Runtime (shared by all tenants with inline namespace chips), and the Shared Data & Tool Plane (RLS-partitioned with inline tenant row chips). Editable assets: [Draw.io source](../diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio) | [Google Slides (.pptx)](../slides/ws2-pattern-a-pooled-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws2-pattern-a-pooled-5hop-architecture.svg) | [Vision AST](../diagrams/vision_metadata/ws2-pattern-a-pooled-5hop-architecture.vision.json).*

Figure 1 organizes the shared project into four color-coded functional zones inside a single shared data and runtime plane (`ONE Shared Data Plane • ONE Agent Engine Pool • ONE AlloyDB Schema — tenants are rows & namespaces, NOT separate boxes`):

- **Hop 1 & Hop 2: Edge PEP & Agent Catalog PDP (Zone 1 — Blue container `#aecbfa`):** Terminates multi-tenant traffic at the External Application Load Balancer, strips forged `X-Tenant-ID` headers in Google Cloud Armor, filters the catalog in Discovery Engine PDP (`403` on private `Agent Alpha`), exchanges Google OIDC (`FinVault`) and Microsoft Entra ID (`RetailStream`) JWTs in IAP + OBO Broker (`adk-agent-signing-key`), and prunes unauthorized tools at the ADK Callback Gate (`before_agent_callback`).
- **Hop 3 & 5: Shared FinOps, Cache & OTel Hub (Zone 2 — Green container `#ceead6`):** Maintains the shared `ContextCacheConfig (90% COGS Save)` (`32k` shared operator prefix), enforces per-tenant thinking-token caps (`4k Standard vs 8k Enterprise`) in Memorystore Valkey, and streams PII-redacted per-turn telemetry to the BigQuery OTel Sink (`tenant_telemetry_spans`).
- **3. Pooled Agent Runtime (shared by all tenants) (Zone 3 — Upper shared runtime band `#feefc3`):** Executes all tenants inside ONE shared Vertex AI Agent Engine gVisor pool (`temp:tenant_id`), screens prompts with `Model Armor (shared)` per-tenant FINRA/PCI templates, runs `Gemini 2.5 Pro` (`4k / 8k` caps), enforces `Memorystore Valkey` RPM bulkheads (`120 Std / 600 Ent`), and partitions the `5-Level Memory Bank (ONE bank)` via disjoint tenant key prefixes (`finvault:{user}:{session}`, `retailstream:{user}:{session}`, and `L1 shared prefix (read-only)`).
- **4. Shared Data & Tool Plane (RLS-partitioned) (Zone 4 — Lower shared data band `#fad2cf`):** Stores all tenants in `AlloyDB (ONE schema) + BigQuery (ONE dataset)` (`pattern_a_pooled_rls_entities` with `FORCE ROW LEVEL SECURITY` where `tenant_id = 'finvault'` and `tenant_id = 'retailstream'` are row partitions enforced by `POLICY tenant_isolation USING (tenant_id = current_setting('app.current_tenant_id', true))`), enforces `BigQuery ROW ACCESS POLICY`, brokers tools through `MCP Hub (shared)` (`2LO service + per-tenant 3LO consent`), masks IBAN/SWIFT/PAN in `Cloud SDP Egress`, and signs claims with `Cloud KMS` (`adk-agent-signing-key`).

The numbered callouts in Figure 1 trace how competing tenants share a single runtime and database without cross-tenant data or tool bleed:

1. **Request:** FinVault Bank (Google OIDC) or RetailStream Corp (Microsoft Entra ID) sends an HTTPS prompt with an OIDC JWT and RFC 9449 DPoP proof to the shared SaaS endpoint.
2. **Hop 1 & Hop 2 — Edge header strip, OBO+KMS signing, and catalog pruning:** Google Cloud Armor strips any client-supplied `X-Tenant-ID` header; IAP + OBO Broker mints a KMS-signed context (`hop1_edge_identity_pep.py`), Discovery Engine PDP hides FinVault's private `Agent Alpha` (`HTTP 403`), and the ADK Callback Gate prunes unauthorized tools (`hop2_registry_pdp_callbacks.py`).
3. **Hop 3 — Allocate gVisor sandbox and Valkey quota check:** Vertex AI Agent Engine binds immutable `temp:tenant_id` inside the shared gVisor pool while Memorystore Valkey enforces `120 RPM` (Standard) vs `600 RPM` (Enterprise) bulkheads and clamps thinking budgets to `4,000` vs `8,000` tokens (`hop3_compute_finops_bulkhead.py`).
4. **Hop 4 (Pre-inference) — Screen prompt with tenant's Model Armor template:** `Model Armor (shared)` screens the prompt against the tenant's FINRA or PCI template, blocking prompt/SQL injection (`HTTP 400`) and semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`) (`hop4_model_armor_guardrails.py`).
5. **Hop 3 — 90% cached prefix inference and namespaced memory lookup:** `Gemini 2.5 Pro` attaches the read-only `32k` `ContextCacheConfig` prefix (90% input token savings) while reading and writing episodic state strictly under `finvault:{user}:{session}` or `retailstream:{user}:{session}` in the `5-Level Memory Bank (ONE bank)`.
6. **Hop 5 — Transactional AlloyDB RLS query and 3LO MCP tool call:** `AlloyDB (ONE schema) + BigQuery (ONE dataset)` executes `SET LOCAL app.current_tenant_id` under `FORCE ROW LEVEL SECURITY` (returning only the caller's 2 rows and 0 cross-tenant rows) while `MCP Hub (shared)` verifies per-tenant 3LO consent (`hop5_data_rls_and_otel.py`).
7. **Hop 4 & Hop 5 — SDP-redacted response and per-turn OTel span:** `Cloud SDP Egress` masks IBAN/SWIFT/PAN tokens before returning the response and streaming a zero-PII `tenant_telemetry_spans` chargeback record to the `BigQuery OTel Sink` (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

### 10-point red-team breach defense topology (Figure 2)

![Figure 2 — Pattern A: 10-point red-team attack simulation and deterministic hop defense matrix](../diagrams/ws2-pattern-a-breach-defense-sequence.drawio.png)

*Figure 2. End-to-end red-team defense architecture showing where each of the 10 cross-tenant attack vectors (Vectors V1–V10) is intercepted across Hops 1 through 5. Editable assets: [Draw.io source](../diagrams/ws2-pattern-a-breach-defense-sequence.drawio) | [Google Slides (.pptx)](../slides/ws2-pattern-a-pooled-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws2-pattern-a-breach-defense-sequence.svg) | [Vision AST](../diagrams/vision_metadata/ws2-pattern-a-breach-defense-sequence.vision.json).*

Figure 2 maps the 10 automated red-team attack vectors ([2.5 Breach Simulation Suite](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)) to the four structural zones:

- **Edge Spoofing and Replay Defense (Hop 1) (Zone 1 — Blue container `#aecbfa`):** Neutralizes Vector 1 (Forged `X-Tenant-ID: finvault` header) by overwriting client headers with the JWT-derived identity.
- **Catalog ACL and Telemetry Scrubbing Hub (Hops 2 & 5) (Zone 2 — Green container `#ceead6`):** Blocks Vector 2 (`403` on private `Agent Alpha`), Vector 3 (ADK `before_agent_callback` pruning of FinVault Jira tools), and Vector 10 (raw PII scrubbing in OpenTelemetry spans).
- **Compute, Memory, and Prefix Cache Guard (Hop 3) (Zone 3 — Left amber container `#feefc3`):** Prevents Vector 4 (thinking-token clamp `16,000 -> 4,000`), Vector 5 (`429` Valkey RPM bulkhead), Vector 6 (`ContextCacheConfig` prefix hash isolation), and Vector 7 (`{tenant}:{user}:{session}` Memory Bank partitioning).
- **Inline DLP, 3LO DPoP, and AlloyDB RLS Guard (Hops 4 & 5) (Zone 4 — Right coral container `#fad2cf`):** Stops Vector 8 (`400` Model Armor prompt injection & `422` NLC block), Vector 9 (`401` cross-tenant 3LO MCP token replay), and enforces zero cross-tenant rows in AlloyDB RLS.

The seven numbered steps in Figure 2 trace the deterministic rejection of adversarial payloads:

1. **Adversarial request submission:** An attacker or misconfigured client submits a spoofed header, cross-tenant agent URI, or prompt-injection payload.
2. **Hop 1 — Header sanitization and DPoP verification:** Forged headers are stripped and recorded in `stripped_headers`; mismatched DPoP proofs are rejected (`401`).
3. **Hop 2 — Catalog ACL and callback pruning:** Unauthorized agent invocations return `403 Forbidden`, and unauthorized MCP tools are removed from the agent's tool list.
4. **Hop 4 (Pre-inference) — Prompt injection and PII block:** Model Armor rejects SQL/prompt injection (`SELECT * FROM incidents WHERE tenant_id = 'finvault'`) with `HTTP 400`.
5. **Hop 3 — Token clamp, RPM bulkhead, and cache key check:** Excessive `thinking_budget` requests are clamped to tier limits, RPM spikes return `HTTP 429`, and cache keys are restricted to the immutable shared prefix.
6. **Hop 4 (Post-inference) — 3LO DPoP check and NLC policy gate:** Cross-tenant MCP token replay is blocked (`401`), and regulatory suppression attempts fail semantic NLC inspection (`422`).
7. **Hop 5 — AlloyDB RLS enforcement and scrubbed audit log:** AlloyDB returns only rows matching `app.current_tenant_id`, and Cloud Logging records the blocked attempt with zero raw PII.

### Multi-IdP 3LO authentication and sandbox topology (Figure 3)

![Figure 3 — Pattern A: Multi-IdP 3LO OAuth federation (Google OIDC and Microsoft Entra ID) and MCP sandbox](../diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.drawio.png)

*Figure 3. Multi-IdP identity federation architecture showing how Google Workspace OIDC (FinVault Bank) and Microsoft Entra ID v2.0 (RetailStream Corp) federate into the shared Pattern A runtime and broker 2LO and 3LO MCP tool calls. Editable assets: [Draw.io source](../diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.drawio) | [Google Slides (.pptx)](../slides/ws2-pattern-a-pooled-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.svg) | [Vision AST](../diagrams/vision_metadata/ws2-demo-env-and-3p-auth-sandbox-topology.vision.json).*

Figure 3 illustrates the identity and 3P connector sandbox described in [2.2 Demo Environment & 3P Auth Sandbox](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md):

- **Multi-IdP Federation and OBO Broker (Zone 1 — Blue container `#aecbfa`):** Federates Google Workspace OIDC (`accounts.google.com`) and Microsoft Entra ID (`login.microsoftonline.com/{tid}/v2.0`) into Workforce Identity Federation and mints DPoP-bound OBO tokens.
- **Auth Manager Secret Vault and Catalog Hub (Zone 2 — Green container `#ceead6`):** Stores per-tenant 3LO OAuth refresh tokens encrypted under Cloud KMS and maps allowed MCP connectors per tenant in Firestore.
- **FinVault 3LO Google Workspace and Jira Sandbox (Zone 3 — Left amber container `#feefc3`):** Executes FinVault's private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput) and brokers 3LO OAuth calls to Google Drive, Gmail, Calendar, and Jira Enterprise.
- **RetailStream Inline 3LO Entra ID Consent Sandbox (Zone 4 — Right coral container `#fad2cf`):** Triggers mid-turn inline 3LO OAuth consent (`MCP -32042 elicitation`) for Microsoft SharePoint runbooks and ServiceNow ITOM without ambient service-account privileges.

The seven numbered steps in Figure 3 trace multi-IdP authentication and 3LO tool execution:

1. **Upstream IdP authentication:** FinVault users sign in via Google OIDC; RetailStream users sign in via Microsoft Entra ID SAML/OIDC.
2. **Workforce Identity Federation and RFC 8693 exchange:** IAP and Workforce Identity Federation validate the upstream token and issue a tenant-bound `CryptographicContext`.
3. **Tenant profile and MCP entitlement lookup:** Firestore resolves the tenant's allowed MCP connectors (`jira-enterprise-3lo` vs `servicenow-itom-3lo`).
4. **Pre-tool DLP and DPoP sender verification:** The ADK `before_tool_callback` verifies that the caller's `dpop_jkt` matches the bound session token and scrubs PII from tool arguments.
5. **2LO implicit passthrough vs 3LO user-delegated token fetch:** First-party Cymbal telemetry uses 2LO session passthrough; third-party SaaS tools request a user-delegated 3LO token from Auth Manager.
6. **Inline 3LO OAuth consent elicitation (when required):** If a RetailStream user has not yet authorized SharePoint or ServiceNow, the runtime returns a structured 3LO consent challenge and resumes the turn upon grant.
7. **Scoped MCP execution and audit emission:** The MCP server executes under the user's delegated 3LO token and logs the tool invocation to BigQuery.

### 1-click Terraform starter resource dependency graph (Figure 4)

![Figure 4 — Pattern A: Terraform infrastructure-as-code (IaC) resource graph](../diagrams/ws2-terraform-starter-resource-graph.drawio.png)

*Figure 4. Declarative Terraform resource dependency graph (`workstream-2-pattern-a-pooled/2.6-terraform-starter/`) provisioning the complete Pattern A pooled stack in a single Google Cloud project. Editable assets: [Draw.io source](../diagrams/ws2-terraform-starter-resource-graph.drawio) | [Google Slides (.pptx)](../slides/ws2-pattern-a-pooled-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws2-terraform-starter-resource-graph.svg) | [Vision AST](../diagrams/vision_metadata/ws2-terraform-starter-resource-graph.vision.json).*

Figure 4 shows the declarative Terraform module topology ([`2.6-terraform-starter/main.tf`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)):

- **Edge Networking and WAF Module (Zone 1 — Blue container `#aecbfa`):** Provisions `google_compute_global_forwarding_rule`, `google_compute_security_policy` (Cloud Armor header-strip rules), and `google_iap_web_backend_service`.
- **IAM, KMS, and Observability Module (Zone 2 — Green container `#ceead6`):** Provisions `google_kms_key_ring`, `google_kms_crypto_key`, least-privilege service accounts, and the `google_bigquery_table` FinOps ledger.
- **Agent Runtime, Model Armor, and Valkey Module (Zone 3 — Left amber container `#feefc3`):** Provisions Vertex AI Agent Engine runtime endpoints, `google_model_armor_template`, and `google_memorystore_instance` (Valkey token buckets).
- **AlloyDB RLS and Firestore Seed Module (Zone 4 — Right coral container `#fad2cf`):** Provisions `google_alloydb_cluster`, initializes `FORCE ROW LEVEL SECURITY` policies, and seeds tenant profiles in `google_firestore_document`.

The seven numbered steps in Figure 4 follow the Terraform dependency DAG from project initialization to live verification:

1. **Enable Google Cloud APIs:** `google_project_service` enables Vertex AI, Discovery Engine, Model Armor, DLP, AlloyDB, Memorystore, and Cloud KMS APIs.
2. **Provision VPC, Cloud Armor, and IAP edge:** Creates the shared VPC network and attaches Cloud Armor header-sanitization rules (`Hop 1`).
3. **Provision Cloud KMS keys and Discovery Engine catalog:** Creates tenant CMEK keys (`finvault-cmek`) and seeds the Agent Catalog ACLs (`Hop 2`).
4. **Deploy Model Armor templates and DLP inspect templates:** Configures inline prompt-injection and PII redaction templates (`Hop 4`).
5. **Deploy Vertex AI Agent Engine runtime and Memorystore for Valkey:** Provisions the pooled ADK runtime and Redis token-bucket rate limiters (`Hop 3`).
6. **Provision AlloyDB cluster and apply RLS migrations:** Creates the PostgreSQL tables with `ENABLE` and `FORCE ROW LEVEL SECURITY` (`Hop 5`).
7. **Provision BigQuery FinOps sink and run smoke tests:** Connects the OpenTelemetry log sink to BigQuery and runs the 10-point breach verification suite.

## Products used

Pattern A (High-Density Pooled Architecture) uses the following Google Cloud products inside a single shared project (`cymbal-pooled-saas-prod`):

### Pooled agent runtime and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): Executes all pooled tenants inside a shared gVisor sandbox pool with per-turn immutable `temp:tenant_id` state binding and a 5-Level Memory Bank partitioned by `{tenant_id}:{user_id}:{session_id}`.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Enforces deterministic `before_agent_callback`, `before_tool_callback`, and `before_model_callback` guardrails inside the shared worker pool.
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Serves pooled inference using shared `ContextCacheConfig` prefix caching (90% input token discount on the shared system prompt) alongside Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) for tenant-private agents such as FinVault's `Agent Alpha`.

### Multi-IdP ingress, identity, and inline AI safety

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs) and [Google Cloud Armor](https://cloud.google.com/armor/docs): Terminate HTTPS traffic at the global edge and strip forged `X-Tenant-ID` and `X-GCP-Project-Override` headers (`Hop 1`).
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation): Federate Google Workspace OIDC (`FinVault Bank`) and Microsoft Entra ID (`RetailStream Corp`) tokens and mint RFC 8693 OBO contexts bound to RFC 9449 DPoP proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): Apply per-tenant FINRA/OCC and PCI inspection templates inline (`Hop 4`) to block prompt injections (`HTTP 400`), semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`), and raw PII leakage.

### Shared data plane, rate bulkheads, and FinOps telemetry

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): Co-hosts multi-tenant operational records in a single schema protected by `FORCE ROW LEVEL SECURITY` keyed on `SET LOCAL app.current_tenant_id` (`Hop 5`).
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Enforce per-tenant atomic Lua token-bucket rate limits (`120 RPM` Standard vs `600 RPM` Enterprise) and store per-tenant MCP connector entitlements.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs) and [BigQuery](https://cloud.google.com/bigquery/docs): Sign cryptographic tenant contexts (`adk-agent-signing-key`), enforce BigQuery `ROW ACCESS POLICY` on `pattern_a_pooled_rls_entities`, and aggregate per-turn FinOps chargeback spans in `cymbal_agentic_finops_otel.tenant_telemetry_spans`.

## Design considerations

This section provides guidance for operating Pattern A according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Never trust client headers inside pooled workers:** Strip `X-Tenant-ID`, `X-Cymbal-Tenant`, and `X-GCP-Project-Override` in Google Cloud Armor at **Hop 1** and derive tenant identity exclusively from the verified OIDC/SAML JWT and DPoP proof.
- **Enforce `FORCE ROW LEVEL SECURITY` on all shared tables:** In AlloyDB for PostgreSQL, create a permissive policy `USING (tenant_id = current_setting('app.current_tenant_id', true))` and enable `FORCE ROW LEVEL SECURITY` so connection pooling can never leak rows across tenants.
- **Isolate 3LO SaaS OAuth tokens by composite DPoP key:** Store user-delegated 3LO refresh tokens for Google Workspace, Atlassian Jira, Microsoft SharePoint, and ServiceNow under `{tenant_id}:{mcp_connector_uri}` in the KMS-encrypted Auth Manager vault and verify the caller's DPoP thumbprint (`jkt`) on every tool invocation.
- **When to graduate from Pattern A to Pattern B or C:** If a regulated customer contractually prohibits shared compute pools, requires a dedicated VPC Service Controls perimeter, or mandates air-gapped open-weight models on dedicated GPUs, deploy that customer in [Pattern B (Sovereign Silos)](ws3-pattern-b-sovereign-silos.md) or as an Enterprise PSC spoke in [Pattern C (Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md).

### Reliability

- **Enforce per-tenant rate and token bulkheads:** Use atomic Lua token buckets in **Memorystore for Valkey** keyed by `ratelimit:{tenant_id}:rpm` and clamp `thinking_budget` in `before_model_callback` so a single noisy tenant cannot exhaust regional Vertex AI TPM quotas.

### Cost optimization

- **Separate cached system instructions from dynamic tenant context:** Keep your shared system instructions, tool schemas, and diagnostic runbooks (`>= 4,096` tokens up to `32,000` tokens) identical across tenants inside `ContextCacheConfig`, and inject per-tenant skills (`gs://cymbal-skills-{tenant}/`) and conversation history in the uncached suffix.
- **Prevent cold-start cache miss storms on TTL refresh:** Configure a background Cloud Scheduler keep-alive job that refreshes the `cymbal-shared-incident-system-prompt-v2` `ContextCacheConfig` descriptor 5 minutes before its 60-minute TTL expires, ensuring zero cold-cache latency spikes or uncached billing surges during peak traffic.

### Operational excellence

- **Deploy with declarative Terraform:** Use the [2.6 Terraform Starter](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) to provision the entire pooled stack reproducibly and run the [90-Minute Breach Simulation Codelab](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md) to train platform engineers.

### Performance optimization

- **Connection pooling with transaction-local context:** Use PgBouncer in transaction-pooling mode in front of AlloyDB and always issue `SET LOCAL app.current_tenant_id` inside the transaction block so session state never persists after `COMMIT`.



## Live Intra-Cloud (Google Cloud Console) & Inter-Cloud (10 Third-Party Enterprise Apps) Validation Proof — Pattern A (High-Density Pooled 5-Hop)

> **Dual-Plane Live Cloud & Stateful Execution Twin Verification (Pattern A (`120 RPM Pool` • `90% ContextCacheConfig` • `FORCE RLS`)):** Every architectural claim in **WS2** is verified across three live Google Cloud project tiers (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#887605034827`) and a **Dual-Plane Inter-Cloud Verification Harness** on AWS (`us-east-1`, Account `393036065405`): (1) **Side A — Commercial Vendor Control-Plane & AWS Bedrock AgentCore MCP Gateway** (`kiu8omh4aq`, Targets `KD6Z3SV8PX`..`TXGJHVFBWP`), and (2) **Side B — 10 Stateful Open-Source Data/RLS Execution Twins on AWS EC2** (`i-04924523ac41ff132`, `http://13.220.94.209:3001..3010`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`) so destructive cross-tenant red-team tests execute safely without polluting shared commercial SaaS tenants.

### Part I — Intra-Cloud (Google Cloud Console) Live Validation Screenshots (WS2)

![Intra-Cloud Pattern A (Pooled) Stage 1 — Live BigQuery Studio (`cymbal_multi_tenant_finops.pattern_a_pooled_rls_entities`) proving `ROW ACCESS POLICY` returns strictly `2` FinVault rows (`ENT-FV-001`, `ENT-FV-002`) and `0` RetailStream rows inside the shared pool](../screenshots/cloud-console/gcp_console_03_bigquery_studio_pattern_a_rls.png)

![Intra-Cloud Pattern A (Pooled) Stage 2 — Live Cloud Run `cymbal-multi-tenant-agent` Source Editor verifying Hop 1 RFC 9449 DPoP binding, Hop 3 Valkey `120 RPM` bulkhead, and `90% ContextCacheConfig` prefix sharing](../screenshots/cloud-console/gcp_console_01_cloud_run_source_editor.png)

![Intra-Cloud Pattern A (Pooled) Stage 3 — Live Cloud Run Gen2 Revisions serving competing tenants (`finvault` and `retailstream`) in one high-density pooled runtime](../screenshots/cloud-console/gcp_console_02_cloud_run_revisions_deploy.png)

![Intra-Cloud Pattern A (Pooled) Stage 4 — Live Cloud Logging Explorer certifying `10/10` Pattern A Red-Team Breach Simulation vectors blocked (`HTTP 403`/`401`/`429`)](../screenshots/cloud-console/gcp_console_07_logs_explorer_20_20_pass.png)

### Part II — Inter-Cloud Third-Party App Testing & Validation Matrix (WS2 • 10 Live AWS AgentCore MCP Targets + 10 Stateful Execution Twins on `13.220.94.209:3001..3010`)

- **Plane 1 — AWS Bedrock AgentCore MCP & Commercial SaaS Control Plane (`Side A`)**: Run `python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py` and `python3 -B scripts/verify_5_third_party_saas_products.py` to mint a live Amazon Cognito RS256 OAuth2 token (`us-east-1_vqlzYM74B`) and execute `tools/call` across all 10 targets (`KD6Z3SV8PX`..`TXGJHVFBWP`) on `https://merck-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`.
- **Plane 2 — Stateful Open-Source Data/RLS Execution Twins (`Side B` on `http://13.220.94.209:3001..3010`)**: Inspect each live containerized execution twin (`Metabase v0.50.26`, `Grafana Enterprise 11.2.0`, `Redmine 5.1`, `NocoDB 0.255.2`, `Gitea 1.22.3`, `Trino 440`, `ClickHouse 24.8`, `Directus 11.1.0`, `Datalust Seq 2024.3`, and `HashiCorp Vault 1.13.3`) and its live Amazon S3 Audit Ledger JSON (`?format=json`). *(Note: Public review sandboxes expose read-accessible ports `:3001..3010` and reviewer credentials for instant auditability; production deployments enforce HTTPS ALB/WAF TLS 1.3 termination, private VPC-only listener bindings, and 5-minute DPoP-bound OAuth2 tokens.)*

| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Live Execution Twin UI (`13.220.94.209:3001..3010`) & S3 Ledger JSON | Side-A (AgentCore MCP) & Side-B (Live Software UI) Screenshots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud (Spotter Agentic BI v2.0)** • [Vendor API (`try-everywhere.thoughtspot.cloud`)](https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom) | Target **`KD6Z3SV8PX`** (`READY`) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` • Shared Pool + Spotter `runtime_filter.tenant_id` -> BigQuery RLS | **In:** `tenant="finvault"`, `org="finvault-org-01"` • **Out:** `HTTP 200` • `row_count=2` (`ENT-FV-001..002`), `cache_discount=0.90` | **In:** `tenant="retailstream"` spoofing `org="finvault-org-01"` • **Out:** **`HTTP 403`** `CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED` | [Live Metabase BI (`:3001`)](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | [Side-A MCP (`saas_01`)](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_01`)](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png) |
| **`SAAS-02` Sigma Computing (Workbooks & Dataset API v2)** • [Vendor API (`api.sigmacomputing.com`)](https://api.sigmacomputing.com/v2/auth/token) | Target **`OZ0KTE8Z8M`** (`READY`) • `mcp://cymbal/sigma-computing-workbooks-3lo` • Shared Pool + `ua_tenant_id` warehouse RLS pushdown | **In:** `tenant="retailstream"`, `workbook="wb-sigma-retailstream-checkout-02"` • **Out:** `HTTP 200` • `row_count=1` (`ENT-RS-001`), live Sigma `requestId` | **In:** `tenant="retailstream"` tampering `ua_tenant_id="finvault"` • **Out:** **`HTTP 403`** `DENY_SIGMA_UA_TENANT_TAMPERING` | [Live Grafana BI (`:3002`)](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | [Side-A MCP (`saas_02`)](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_02`)](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png) |
| **`SAAS-03` ServiceNow ITSM & ITOM (`CHG0049218`)** • [Vendor Status (`status.servicenow.com`)](https://status.servicenow.com) | Target **`PLOLWRMI0I`** (`READY`) • `mcp://retailstream/servicenow-itom-3lo` • Shared Pool + Hop 5 3LO Vault (`3lo_token_sn_rs_valid`) | **In:** `tenant="retailstream"`, `change="CHG0049218"`, `3lo=True` • **Out:** `HTTP 200` • Live AWS AgentCore `CHG0049218` returned | **In:** `tenant="retailstream"`, `seed_3lo=False` (unconsented) • **Out:** **`HTTP 401`** `CHALLENGE_3LO_OAUTH` (`MCP -32042`) | [Live Redmine ITSM (`:3003`)](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | [Side-A MCP (`saas_03`)](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_03`)](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png) |
| **`SAAS-04` Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)** • [Vendor Portal (`veevavault.com`)](https://login.veevavault.com) | Target **`1KZWKOFTWQ`** (`READY`) • `mcp://finvault/veeva-muse-clinical-3lo` • Shared Pool + Hop 2 Catalog ACL + Cloud KMS 21 CFR Part 11 sig | **In:** `tenant="finvault"`, `study="FV-GXP-2026-04"`, `cohort="Cohort-B"` • **Out:** `HTTP 200` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** `tenant="retailstream"` invoking restricted clinical MCP • **Out:** **`HTTP 403`** `TENANT_CONNECTOR_ACL_DENIED` | [Live NocoDB EDC (`:3004`)](http://13.220.94.209:3004/#/nc/base) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | [Side-A MCP (`saas_04`)](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_04`)](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png) |
| **`SAAS-05` Salesforce CRM (`NA224`) & Atlassian Jira Cloud** • [Vendor API (`api.status.salesforce.com`)](https://api.status.salesforce.com/v1/instances/NA224/status) | Target **`W7BF0JRWEA`** (`READY`) • `mcp://finvault/salesforce-jira-escalation-3lo` • Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask | **In:** `tenant="finvault"`, `instance="NA224"`, raw IBAN/SWIFT in notes • **Out:** `HTTP 200` • Live `NA224` (`Winter '27 Patch 8.6`) + `[REDACTED-FINVAULT-IBAN]` | **In:** Inspect egress payload for unredacted `DE893704...` • **Out:** **`PASS`** (`raw_pii_leaked=False`, 100% masked before SaaS call) | [Live Gitea Tracker (`:3005`)](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | [Side-A MCP (`saas_05`)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_05`)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png) |
| **`SAAS-06` Databricks Data Intelligence Platform (Unity Catalog)** • [Vendor API (`community.cloud.databricks.com`)](https://community.cloud.databricks.com/api/2.0/clusters/list) | Target **`Z1RHXLBK6F`** (`READY`) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Shared Pool + `cymbal_uc_prod.<tenant>_gold` binding | **In:** `tenant="finvault"`, `schema="finvault_gold"` • **Out:** `HTTP 200` • `Server: databricks`, `row_count=2` (`ENT-FV-001..002`) | **In:** `tenant="retailstream"`, `schema="finvault_gold"` + `EXECUTE IMMEDIATE` • **Out:** **`HTTP 403`** `UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED` | [Live Trino UI (`:3006`)](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | [Side-A MCP (`saas_06`)](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_06`)](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png) |
| **`SAAS-07` Snowflake AI Data Cloud (Cortex Analyst & SQL v2)** • [Vendor API (`snowflakecomputing.com`)](https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements) | Target **`7PB1EK3NJO`** (`READY`) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Shared Pool + `ROLE_CYMBAL_<TENANT>` & `SECONDARY ROLES NONE` | **In:** `tenant="retailstream"`, `role="ROLE_CYMBAL_RETAILSTREAM"` • **Out:** `HTTP 200` • `Server: SF-LB-T1`, `row_count=1` (`ENT-RS-001`) | **In:** `sql_override="USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT"` • **Out:** **`HTTP 403`** `SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED` | [Live ClickHouse UI (`:3007`)](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | [Side-A MCP (`saas_07`)](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_07`)](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png) |
| **`SAAS-08` Workday Enterprise HCM & Financial Management** • [Vendor API (`wd5-services1.myworkday.com`)](https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token) | Target **`CXH8BK86IF`** (`READY`) • `mcp://finvault/workday-hcm-financials-raas-3lo` • Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP | **In:** `tenant="finvault"`, `user="alice@finvault.com"`, `org="SUP-ORG-FINVAULT-NA"` • **Out:** `HTTP 200` • Live Workday CCX probe + `[REDACTED_US_SSN]` | **In:** `user="bob@finvault.com"` reusing Alice's 3LO token • **Out:** **`HTTP 401`** `WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH` (`MCP -32042`) | [Live Directus HCM (`:3008`)](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | [Side-A MCP (`saas_08`)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_08`)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png) |
| **`SAAS-09` Datadog Cloud Observability & Bits AI SRE** • [Vendor API (`api.datadoghq.com`)](https://api.datadoghq.com/api/v1/validate) | Target **`A2X7LPMPA7`** (`READY`) • `mcp://cymbal/datadog-observability-sre-3lo` • Shared Pool + `@tenant_id` log filter + Hop 4 Model Armor | **In:** `tenant="finvault"`, `query="service:agent-gateway @tenant_id:finvault"` • **Out:** `HTTP 200` • Live Datadog US1 API + `2` sanitized log spans | **In:** Log payload containing `IGNORE ALL PREVIOUS INSTRUCTIONS...` • **Out:** **`HTTP 400`** `MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED` | [Live Seq APM (`:3009`)](http://13.220.94.209:3009/#/events) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | [Side-A MCP (`saas_09`)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_09`)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png) |
| **`SAAS-10` CrowdStrike Falcon Next-Gen SIEM & Okta Identity** • [Vendor API (`api.crowdstrike.com`)](https://api.crowdstrike.com/oauth2/token) | Target **`TXGJHVFBWP`** (`READY`) • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Shared Pool + Hop 1 RFC 9449 DPoP `jkt` binding | **In:** `tenant="finvault"`, `dpop="dpop_jkt_fv_001"`, `proof="dpop_jkt_fv_001"` • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200` | **In:** Stolen bearer token replay with `proof="dpop_jkt_attacker_stolen_999"` • **Out:** **`HTTP 401`** `OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH` | [Live Vault UI (`:3010`)](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (Token `fv-token-finvault-sre-2026`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | [Side-A MCP (`saas_10`)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_10`)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png) |

### Part III — Side-A (AgentCore MCP) & Side-B (Live Execution Twin UI on `13.220.94.209:3001..3010`) Visual Proof Gallery (WS2)

![SAAS-01 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target KD6Z3SV8PX (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png)

![SAAS-01 Side B — WS2 Live Metabase BI (`metabase/metabase:v0.50.26`) Execution Twin UI on http://13.220.94.209:3001/question/27 (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png)

![SAAS-02 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target OZ0KTE8Z8M (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png)

![SAAS-02 Side B — WS2 Live Grafana Enterprise (`grafana/grafana-enterprise:11.2.0`) Execution Twin UI on http://13.220.94.209:3002/d/finvault-sre-wb (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png)

![SAAS-03 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target PLOLWRMI0I (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png)

![SAAS-03 Side B — WS2 Live Redmine ITSM (`redmine:5.1-alpine`) Execution Twin UI on http://13.220.94.209:3003/projects/finvault-itsm/issues (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png)

![SAAS-04 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 1KZWKOFTWQ (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png)

![SAAS-04 Side B — WS2 Live NocoDB Clinical EDC (`nocodb/nocodb:0.255.2`) Execution Twin UI on http://13.220.94.209:3004/#/nc/base (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png)

![SAAS-05 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target W7BF0JRWEA (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png)

![SAAS-05 Side B — WS2 Live Gitea Escalation Tracker (`gitea/gitea:1.22.3`) Execution Twin UI on http://13.220.94.209:3005/finvault/sre-escalations/issues/1 (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png)

![SAAS-06 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target Z1RHXLBK6F (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png)

![SAAS-06 Side B — WS2 Live Trino Distributed SQL Lakehouse (`trinodb/trino:440`) Execution Twin UI on http://13.220.94.209:3006/ui/ (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png)

![SAAS-07 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 7PB1EK3NJO (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png)

![SAAS-07 Side B — WS2 Live ClickHouse Analytics Play UI (`clickhouse/clickhouse-server:24.8`) Execution Twin UI on http://13.220.94.209:3007/play (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png)

![SAAS-08 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target CXH8BK86IF (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png)

![SAAS-08 Side B — WS2 Live Directus HCM Data Studio (`directus/directus:11.1.0`) Execution Twin UI on http://13.220.94.209:3008/admin/content/hcm_compensation (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png)

![SAAS-09 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target A2X7LPMPA7 (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png)

![SAAS-09 Side B — WS2 Live Datalust Seq APM & Log Server (`datalust/seq:2024.3`) Execution Twin UI on http://13.220.94.209:3009/#/events (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png)

![SAAS-10 Side A — WS2 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target TXGJHVFBWP (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png)

![SAAS-10 Side B — WS2 Live HashiCorp Vault UI (`hashicorp/vault:1.13.3`) Execution Twin UI on http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png)


## What's next

- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Explore the Workstream 2 engineering artifacts and hands-on lab:
  - [2.1 Pattern A Case Study & Solution Architecture](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)
  - [2.2 Demo Environment & 3P Auth Sandbox Setup](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md)
  - [2.3 Pattern A Pooled Runtime Implementation (`pattern_a_pooled_service.py`)](../workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py)
  - [2.4 Product Gaps & FinOps Prioritization](../workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md)
  - [2.5 10-Point Red-Team Breach Verification Suite (`run_breach_simulations.py`)](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)
  - [2.6 Pattern A 1-Click Terraform Starter (`main.tf`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)
  - [2.8 90-Minute Hands-On Codelab: Red-Teaming Pooled Multi-Tenant Agents](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides and diagrams:
  - [Workstream 2 Editable Google Slides Deck (`ws2-pattern-a-pooled-editable-slides.pptx`)](../slides/ws2-pattern-a-pooled-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
