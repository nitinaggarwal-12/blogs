---
title: "Beyond Business Units: A Reference Architecture Taxonomy for Multi-Tenant Agentic AI on Google Cloud"
subtitle: "How Pooled, Sovereign Silo, and Dynamic Hybrid topologies — governed by a 5-Hop Cryptographic Context Chain — extend the official Cloud Architecture Center hub-and-spoke reference to B2B ISV SaaS"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 1 of 5"
workstream: "Workstream 1 — Prepare Reference Architectures & Update GCP Documentation"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Principal Architects, AI Platform Engineers, CISOs, and B2B SaaS Platform Leads"
reading_time: "14 minutes"
tags:
  - gemini-enterprise-agent-platform
  - adk-2.0
  - multi-tenancy
  - reference-architecture
  - vpc-service-controls
  - principal-access-boundary
  - model-armor
  - alloydb-row-level-security
  - finops
  - cloud-architecture-center
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams:
  - ws1-multi-tenant-taxonomy-overview
  - ws1-cloud-arch-center-5hop-baseline
editable_slides: "slides/ws1-reference-architecture-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Beyond Business Units: A Reference Architecture Taxonomy for Multi-Tenant Agentic AI on Google Cloud

> **Executive TL;DR**
>
> **Problem.** The official [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference models an *intra-enterprise* topology — one spoke project per internal business unit. Field engagements show that 90%+ of B2B SaaS providers cannot stand up a dedicated Google Cloud project for every $500/month Standard-tier customer, yet their Fortune 500 FinTech and healthcare customers still demand physical and cryptographic isolation. Autonomous agents make this harder: dynamic MCP tool discovery, confused-deputy ambient credentials, shared context-cache bleed, and noisy-neighbor runaway reasoning loops are failure modes classic SaaS tenancy never had to address.
>
> **Solution.** Workstream 1 defines a three-pattern taxonomy — **Pattern A: Pooled**, **Pattern B: Sovereign Silos**, **Pattern C: Dynamic Hybrid** — built on an **80% reusable core** ([`core-cymbal-agent/`](../core-cymbal-agent/)) plus a 20% topology-specific delta. Every pattern enforces the same **5-Hop Cryptographic Context Chain** (Edge PEP → Registry PDP → Compute & FinOps Bulkheads → Model Armor & Semantic NLCs → Data RLS, 2LO/3LO Auth Manager & BigQuery OTel), expressed as five Python governance modules and two Cloud Architecture Center-style blueprints.
>
> **Outcome.** A drop-in documentation PR ([1.3](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)) that extends the Architecture Center article to B2B ISVs, a product review pack ([1.2](../workstream-1-reference-architecture/1.2-product-team-review-pack.md)) aligning GEAP, ADK 2.0, Auth Manager, Model Armor and VPC-SC/PAB teams, and a consolidated EAP & product-gap ledger ([1.4](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)) with three P0 gaps already carrying engineered workarounds. Everything feeds Milestones 1–3 (Weeks 4, 7, 10) in Workstreams 2–4.

---

## 1. Why agentic multi-tenancy breaks classic SaaS tenancy

Traditional multi-tenant web applications rely on static API routes and deterministic database queries: a tenant ID flows through a request header, a middleware layer stamps it into a `WHERE` clause, and the blast radius of a bug is bounded by the code path you wrote. Autonomous agents built on **Gemini Enterprise Agent Platform (GEAP)** and **Agent Development Kit (ADK 2.0)** do not behave this way. They reason over multiple turns, discover and invoke Model Context Protocol (MCP) tools dynamically, share prompt caches and session memory for cost efficiency, and increasingly run *tenant-authored* custom agents side by side with the operator's shared agents.

The Workstream 1.3 Doc PR names the four new failure modes that result:

1. **Dynamic MCP tool discovery mid-turn.** An agent that queries a shared MCP registry during reasoning can discover — and invoke — another tenant's private connectors or custom agents.
2. **Confused-deputy ambient credentials.** If tool calls execute under a shared service account's ambient IAM permissions, a prompt-injection payload can trick the agent into reading another tenant's storage buckets or APIs.
3. **Shared context-cache bleed.** Prompt caches or session memory shared across tenants without cryptographic prefix separation can leak one tenant's context into another tenant's completion.
4. **Noisy-neighbor runaway loops.** Unbounded `thinking_budget` or recursive tool retries from one tenant can exhaust shared model TPM quotas and degrade availability for everyone else.

None of these are solved by a `tenant_id` column. They require controls at the network edge, the agent registry, the runtime sandbox, the model guardrail layer, and the data plane — and they require those controls to be *the same* regardless of whether a tenant is pooled, siloed, or somewhere in between. That is the design brief for Workstream 1.

### The anchor scenario: Cymbal, FinVault, and RetailStream

Every artifact in this program uses one case study so that the controls can be tested against real, competing tenants:

* **Cymbal SaaS Platform (ISV / platform operator)** publishes a **Shared Incident Diagnostic Agent** on **Gemini 2.5 Pro**, uses shared **Prompt Prefix Caching (`ContextCacheConfig`)** for up to **90% COGS savings**, loads per-tenant prompts, thinking budgets, and GCS Skills from **Firestore + Memorystore for Redis**, and reaches its own Core Telemetry API via **2LO Implicit Session Passthrough**.
* **FinVault Bank (Tenant Alpha, Enterprise tier)** is a regulated digital bank on Google Workspace and Jira, entitled to an **8,000 thinking-token budget**, authenticating with **3LO Google OIDC**, and self-provisioning a private **Regulatory Escalation Agent (`Agent Alpha`)** on **Claude Sonnet via Vertex AI Model Garden** with **CMEK-encrypted memory (`finvault:user:session`)**.
* **RetailStream Corp (Tenant Beta, Standard tier)** is a global retailer with a **zero Google footprint** — 100% Microsoft 365 and ServiceNow — authenticating through **Microsoft Entra ID**, capped at a **4,000 thinking-token budget** behind a **Redis rate-limit bulkhead**, and using **Inline 3LO OAuth Consent** mid-session for SharePoint runbooks and ServiceNow ITOM.

The hard requirement is symmetrical invisibility: RetailStream gets `403 Forbidden` on any direct call to `Agent Alpha`, and RetailStream's ServiceNow MCP connector never appears in FinVault's catalog.

---

## 2. The three-pattern taxonomy: Pooled, Sovereign Silos, and Dynamic Hybrid

Workstream 1.1 ([`1.1-architecture-taxonomy-and-diagrams.md`](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)) decomposes the design space along seven dimensions. The key insight is that **isolation is a per-tenant tier decision, not a per-platform decision** — which is why Pattern C exists.

| Taxonomy Dimension | Pattern A: Pooled Architecture (`Maximum Density`) | Pattern B: Sovereign Silos (`Zero Trust Isolation`) | Pattern C: Dynamic Hybrid (`Intelligent Routing`) |
| :--- | :--- | :--- | :--- |
| **Control Plane** | Single shared GEAP Control Plane & Agent Registry | Dedicated GCP Project & GEAP Control Plane per corporate tenant | Unified GEAP Control Plane + Tenant-Aware Ingress Router |
| **Compute & Runtime** | Shared GEAP Agent Runtime (gVisor sandbox) + immutable `temp:tenant_id` | Dedicated GEAP Runtime or air-gapped **Gemma 3 on GKE** per tenant project | Shared Pool for Standard tier + **Private Service Connect (PSC)** spokes for Enterprise tier |
| **Network Perimeter** | Single shared VPC behind Cloud Armor + IAP | Per-tenant **VPC Service Controls (VPC-SC)** perimeter + **mTLS Ingress** | Hub-and-Spoke VPC with **PSC Service Attachments** bridging to isolated tenant perimeters |
| **Identity & Access** | **RFC 8693 OBO + DPoP** + **GCP Agent Identity (Auth Manager)** 2LO/3LO | **IAM Principal Access Boundary (PAB)** + per-project Workload Identity Pools | Unified IdP Broker + cross-project PAB + PSC identity propagation |
| **Data & Memory Isolation** | Shared AlloyDB with **Row-Level Security (RLS)** + `{tenant}:{user}:{session}` Memory Bank | Dedicated AlloyDB / BigQuery per tenant project + **Cloud KMS CMEK** | Shared RLS DB for Standard + dedicated CMEK data spokes via PSC for Enterprise |
| **Model & FinOps COGS** | Shared **Prompt Prefix Caching (`ContextCacheConfig`)** (up to 90% COGS savings) + Redis token bulkheads | Dedicated Provisioned Throughput (PT) endpoints per project; zero noisy neighbors | Pooled caching for Standard + dedicated PT / Model Garden (Claude Sonnet) for Enterprise |
| **Target Customer Segment** | High-volume Standard B2B SaaS tiers (e.g., *RetailStream Corp*) | Regulated FinTech, Healthcare, Public Sector (e.g., *FinVault Bank*) | Multi-tiered SaaS serving SMB to Fortune 500 with live tier upgrades |
| **Delivery Milestone** | Milestone 1 • Week 4 (Workstream 2) | Milestone 2 • Week 7 (Workstream 3) | Milestone 3 • Week 10 (Workstream 4) |

**Pattern A** optimises for unit economics. Everything is shared — runtime, VPC, AlloyDB, prompt cache — so isolation must be logical *and* cryptographic, which is exactly what the 5-Hop chain provides. **Pattern B** optimises for blast radius: a dedicated project, VPC-SC perimeter, PAB policy and CMEK key per tenant, with the customer holding a kill-switch on their own key. **Pattern C** acknowledges that most real SaaS businesses need both at once, and adds a tenant-aware router, a cross-project registry, and PSC spokes so an Enterprise tenant can be promoted from the pool to a dedicated spoke with zero dropped sessions.

![Figure 1 — GEAP Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png)

*Figure 1 — One shared control plane and governance perimeter serving a pooled shared-runtime spoke (Pattern A) on the left and a dedicated sovereign / PSC spoke (Patterns B & C) on the right, with the 5-Hop chain enforced identically in both. Editable: [Draw.io](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) • [Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) • [Cloud Architecture Center SVG](../diagrams/ws1-multi-tenant-taxonomy-overview.svg) • [Vision AST](../diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json)*

### Reading Figure 1

Read the blueprint from the outside in, following the numbered step badges.

* **Outer Google Cloud frame and actor.** At the top sits the actor card **"Competing B2B Tenants FinVault (OIDC) & RetailStream (Entra)"**. Step badge **1 "Request"** enters the platform and step badge **7 "Response"** returns to the same actor — the whole diagram is the path between those two badges.
* **Shared hubs and VPC wrappers.** The outer container is **"Shared Control Plane & Multi-Tenant Governance Perimeter (80% Reusable Core + 20% Topology Delta)"**; nested inside it is **"VPC & 5-Hop Cryptographic Context Chain"**. These two wrappers make the program's core principle visual: the governance perimeter is shared code, and the chain lives inside the VPC regardless of pattern.
* **Routing hub.** The zone **"Routing hub (Hop 1 & Hop 2 PEP/PDP)"** holds the edge controls. On the left column: **"Cloud Armor & IAP Strip Forged X-Tenant-ID"** (annotated **"Header & WAF policies"**), **"Model Armor Ingress Prompt Screen"** (annotated **"Sanitize prompt"**), and **"RFC 8693 OBO + DPoP Sender-Constrained JWT"** (annotated **"OBO + DPoP verification"**). On the right column: the **"External Application Load Balancer"** and the **"Cloud Run Topology Router & ARD PDP"**. Step badge **2 "Request"** and its paired **7 "Response"** sit between the ALB and the router, marking where a sanitized request is handed to Hop 2.
* **Central governance hub.** To the right, **"Central governance and FinOps observability hub"** stacks **"Security Command Center"**, **"Central IAM & PAB Agent Identity (2LO/3LO)"**, and **"Cloud Logging & BQ Zero-PII OTel & Chargeback"**. The dashed governance line labelled **"Security, OTel & FinOps chargeback telemetry"** drops from this hub into both spokes — it is the only edge that crosses tenant boundaries, and it carries telemetry, never tenant data.
* **Trunk routing.** Below the routing hub, step badge **3 "Route by tenant tier (Pool, Silo or PSC)"** is the topology decision; its paired **7 "Sanitized response with SDP redaction"** confirms that every response, from any spoke, is scrubbed on the way back.
* **Left spoke — Pattern A.** The wrapper **"Pattern A: Pooled Shared Runtime (Standard & High-Density SaaS)"** contains **"Tenant Pool (Shared Runtime)"**. Step **4 "Sanitize request"** hits **"Model Armor Tenant NLCs & SDP PII"**; the request flows to **"Agent Runtime gVisor + temp:tenant_id"**, which reaches **"MCP servers 2LO + 3LO OIDC/Entra"** via **"Scoped MCP & RAG"** and **"Shared AlloyDB Row-Level Security (RLS)"** via **"SET LOCAL current_tenant"**. Step **5 "Generates response"** runs on **"Gemini 2.5 Pro 90% Prefix Cache Savings"**, and step **6 "Sanitize response"** returns through Model Armor.
* **Right spoke — Patterns B & C.** The wrapper **"Pattern B (Sovereign Silos) & Pattern C (Hybrid PSC Spokes)"** contains **"Dedicated Sovereign Tenant Project"**. The same five cards appear with sovereign substitutions: **"Model Armor Sovereign Silo Guardrails"**, **"Gemini / Gemma 3 Claude 3.7 or Private GKE"**, **"Agent Runtime"**, **"MCP servers Local Silo 3LO Connectors"** reached via **"Air-Gapped Silo RAG"**, and **"CMEK Datastore AlloyDB, BQ & KMS 423 Lock"** reached via **"CMEK-Encrypted State & Tools"**. The `423 Lock` annotation is the customer CMEK kill-switch surfacing as an HTTP status.

The visual symmetry between the two spokes is deliberate: the 80% core is identical; only the trust boundary around it changes.

---

## 3. The 5-Hop Cryptographic Context Chain

The chain is implemented as five governance modules in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/). Each hop consumes the signed `CryptographicContext` minted at Hop 1, enforces one or two governance pillars, and emits a `HopAuditRecord`. Because the modules are topology-agnostic, the same code runs in Patterns A, B, and C.

### Hop 1 — Edge Identity & Token Exchange PEP (`hop1_edge_identity_pep.py`)

[`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) simulates Cloud Armor + Identity-Aware Proxy + RFC 8693 at the network edge. It strips every client-supplied or forged tenant header (`x-tenant-id`, `x-cymbal-tenant`, `x-cymbal-tier`, `x-gcp-project-override`), verifies the upstream IdP JWT against a strict issuer map (Google Workspace OIDC for FinVault, Microsoft Entra ID v2.0 for RetailStream), and performs an **RFC 8693 On-Behalf-Of** token exchange bound to an **RFC 9449 DPoP** public-key thumbprint (`jkt`). The output is a `CryptographicContext` whose `tenant_id` is derived from the verified issuer — never from anything the client sent.

### Hop 2 — Registry PDP & Deterministic Tool Pruning (`hop2_registry_pdp_callbacks.py`)

[`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) treats the **GEAP Agent Registry** as a Policy Decision Point. It filters the Agent Resource Descriptor (ARD) catalog so a tenant sees only its allow-listed agents, MCP connectors, and GCS Skills; it returns `403 Forbidden` on direct invocation of another tenant's private agent (RetailStream calling `agent://finvault/private-agent-alpha-regulatory`); and it executes the ADK 2.0 `before_agent_callback` to prune any MCP tool descriptor not authorised for the active tenant *before* reasoning begins. This closes failure mode 1 deterministically rather than relying on the model to behave.

### Hop 3 — Compute Sandbox, Memory Bank & FinOps Bulkheads (`hop3_compute_finops_bulkhead.py`)

[`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) binds an immutable `temp:tenant_id` inside the GEAP Agent Runtime gVisor sandbox, loads per-tenant prompts, thinking budgets and GCS Skills from Firestore + Memorystore (rejecting any skill URI that does not match `gs://cymbal-skills-{tenant_id}/`), enforces the 8,000 vs 4,000 thinking-token budgets and Redis RPM bulkheads, implements the **5-Level Memory Bank** (`L1_TURN_EPHEMERAL` through `L5_PLATFORM_SHARED_SKILLS`) keyed by `{tenant}:{user}:{session}`, and verifies Cloud KMS CMEK key state. It also attaches shared **`ContextCacheConfig`** strictly to the shared system instructions, which is how the pool achieves up to 90% COGS savings without a tenant's conversation suffix ever entering the shared cache key (failure modes 3 and 4).

### Hop 4 — Vertex AI Model Armor & Semantic NLCs (`hop4_model_armor_guardrails.py`)

[`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) screens ingress prompts for injection, jailbreak, context-cache extraction (`dump context cache`), and SQL RLS-bypass payloads (`SET LOCAL app.current_tenant`, `switch tenant to`). It evaluates tenant-specific **Semantic Natural Language Constraints** — blocking attempts to suppress FinVault's OCC/FDIC regulatory escalation or bypass RetailStream's PCI redaction — and on egress applies **Sensitive Data Protection** detectors tailored per tenant: bank account, IBAN and SWIFT redaction for FinVault; payment-card PAN redaction for RetailStream.

### Hop 5 — Data RLS, 2LO/3LO Auth Manager & BigQuery OTel (`hop5_data_rls_and_otel.py`)

[`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) binds `SET LOCAL app.current_tenant = '<tenant_id>'` on every AlloyDB transaction so PostgreSQL Row-Level Security restricts rows at the storage engine, independent of what the agent asked for. It brokers **2LO Implicit Session Passthrough** for the Cymbal Core Telemetry API and **3LO OAuth** tokens through `CymbalMCPHub` — Google OIDC for FinVault, Microsoft Entra ID with an inline consent challenge for RetailStream when a SharePoint or ServiceNow token is missing — which eliminates ambient-credential confused-deputy attacks (failure mode 2). Finally, it emits OpenTelemetry spans tagged with `tenant_id`, `tier`, `thinking_tokens`, and `cache_hit` into BigQuery for security lineage and proportional FinOps chargeback.

---

## 4. Extending the Cloud Architecture Center hub-and-spoke reference

The official article already establishes the right skeleton: a **routing hub** that terminates ingress, a **central governance and security hub** that holds Security Command Center, IAM and Cloud Logging, and **tenant spokes** behind an organisation-level **VPC Service Controls** perimeter with **Principal Access Boundary** policies. Workstream 1.3 keeps that skeleton intact and overlays the five hops onto it, so the Doc PR reads as an *expansion* rather than a replacement.

![Figure 2 — Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png)

*Figure 2 — The official hub-and-spoke reference architecture annotated with Hop 1–2 in the routing hub, Hop 3–5 inside each PAB-bounded tenant spoke, and the central governance hub acting as the shared Auth Manager and audit sink. Editable: [Draw.io](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) • [Slides (.pptx)](../slides/ws1-reference-architecture-editable-slides.pptx) • [Cloud Architecture Center SVG](../diagrams/ws1-cloud-arch-center-5hop-baseline.svg) • [Vision AST](../diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json)*

### Reading Figure 2

This blueprint keeps the Architecture Center's own vocabulary so the PR can be reviewed line-by-line against the published diagram.

* **Outer Google Cloud frame and actor.** The actor is **"User OIDC / Entra JWT"** — a single end user carrying either identity provider's token. Step badge **1 "Request"** and step badge **7 "Response"** bracket the flow exactly as in the published article.
* **Shared hubs and VPC wrappers.** The outer wrapper is **"Shared hubs (VPC Service Controls Organization Perimeter)"** and inside it a plain **"VPC"**. This is the organisation-level VPC-SC perimeter from the original reference; nothing in the PR weakens it.
* **Routing hub.** Zone **"Routing hub (Hop 1 & Hop 2)"** maps the article's existing edge components to the first two hops: **"Cloud Armor Strips Forged X-Tenant-ID"** (annotated **"Security policies"**), **"Model Armor Edge Prompt Injection Gate"** (annotated **"Sanitize prompt"**), and **"IAP RFC 8693 OBO + DPoP"** (annotated **"User authentication"**), alongside the **"External Application Load Balancer"** and **"Cloud Run"**. Step badge **2 "Request"** / **7 "Response"** sit between them.
* **Central governance hub.** **"Central governance and security hub"** holds **"Security Command Center"**, **"Central IAM Auth Manager (2LO / 3LO)"**, and **"Cloud Logging BigQuery OTel Audit Sink"**. The dashed governance line labelled **"Security and observability"** fans out to both spokes; in the PR this is where Hop 5's OTel spans and Hop 1/5's token brokering are anchored.
* **Trunk routing.** Step **3 "Route request to tenant"** is the hub's existing routing step; its paired **7 "Sanitized response from tenant"** makes explicit that the hub never forwards a raw tenant response.
* **Left spoke — Tenant A.** The wrapper **"PAB • Hop 3–5 Isolation Boundary (Tenant Alpha)"** encloses **"Tenant A (FinVault Bank)"**. Step **4 "Sanitize request"** enters **"Model Armor Hop 4: Bank SDP & OCC NLC"**, proceeds to **"Agent Runtime"**, which reaches **"MCP servers"** via **"Secure RAG"** and **"Datastore"** via **"Agent-tool interaction"**. Step **5 "Generates response"** executes on **"Gemini & Claude Agent Platform (8k Budget)"** — the shared diagnostic agent plus private `Agent Alpha` — and step **6 "Sanitize response"** returns through Model Armor.
* **Right spoke — Tenant B.** The wrapper **"PAB • Hop 3–5 Isolation Boundary (Tenant Beta)"** encloses **"Tenant B (RetailStream Corp)"**, with **"Model Armor Hop 4: PCI PAN SDP & NLC"**, **"Gemini Agent Platform (4k Cap)"**, **"Agent Runtime Hop 3: Shared Diagnostic"**, **"MCP servers Hop 5: SharePoint & SNOW"** via **"Secure RAG"**, and **"Datastore"** via **"Agent-tool interaction"**. The 8k vs 4k labels and the bank-vs-PCI SDP templates are the per-tenant deltas; the structure is identical.

### What the Doc PR (1.3) actually changes

The PR titled `feat(arch-center): Expand Multi-Tenant Agentic AI System to B2B ISV SaaS Topologies (Pooled, Siloed, Hybrid) & 5-Hop GEAP Governance` makes three edits to the published article:

1. **Rewrites the introduction** to name two audiences — B2B SaaS & ISVs protecting gross margins across competing external customers, and large decentralised enterprises governing agents across regulated business units — and positions GEAP + ADK 2.0 as the implementation surface.
2. **Adds a "Choose a multi-tenant agentic topology" section** with the Pattern A / B / C decision table (isolation model, best-suited workloads, and the key Google Cloud & GEAP controls for each).
3. **Inserts a new "Enforcing the 5-Hop Cryptographic Context Chain" section** immediately after the architecture diagram, carrying the four failure modes, the five hops, and the Cymbal / FinVault / RetailStream case study as a replacement for the internal retail-division example.

The full drop-in markdown patch is in [`1.3-cloud-architecture-center-doc-update-pr.md`](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md).

---

## 5. Product alignment, EAP asks, and known gaps

Workstream 1.2 ([`1.2-product-team-review-pack.md`](../workstream-1-reference-architecture/1.2-product-team-review-pack.md)) maps the five hops onto four governance pillars and records a verification status for each. Pillar 4 (Guardrails, Data & Audit) is validated end-to-end. The remaining pillars are validated with engineered workarounds while native product capabilities land through Early Access Programs. The consolidated ledger in [`1.4-eap-and-product-gap-tracker.md`](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) tracks nine gaps; the three **P0** items block Pattern A at GA quality and are summarised below.

| Gap ID | Component | Failure Mode | Engineered Workaround | EAP / Allowlist | Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GAP-P0-01`** | GEAP Agent Registry (PDP) | Native list/get APIs filter by IAM project principal, not by sub-project cryptographic `tenant_id` inside a shared project | Tenant label check in the Cloud Run Gateway PEP + ADK `before_agent_callback` pruning in `hop2_registry_pdp_callbacks.py`, returning `403 Forbidden` | `geap-registry-tenant-label-pdp-eap` | Q4 2026 |
| **`GAP-P0-02`** | GEAP 5-Level Memory Bank | Project-level CMEK supported, but no native per-`tenant_id` namespace CMEK binding (`finvault:user:session`) | Envelope encryption per tenant namespace via Cloud KMS `Encrypt`/`Decrypt` in `hop3_compute_finops_bulkhead.py`, or route CMEK-mandated tenants to a Pattern C PSC Memory Spoke | `geap-memory-bank-per-tenant-cmek-eap` | Q4 2026 |
| **`GAP-P0-03`** | GCP Agent Identity (Auth Manager) | RFC 8693 OBO with RFC 9449 DPoP sender-constrained tokens from external Entra ID tenants needs custom verification before Auth Manager brokering | Verify DPoP `jkt` thumbprint and strip forged `X-Tenant-ID` in `hop1_edge_identity_pep.py` before invoking the 3LO token broker | `gcp-agent-identity-dpop-entra-eap` | Q4 2026 |

The P1 and P2 items follow the same shape and are owned by the later workstreams: unified prompt-cache semantics across Gemini `ContextCacheConfig` and Model Garden partner models (`GAP-P1-01`), stateless ADK OAuth checkpointing for inline 3LO consent (`GAP-P1-02`), VPC-SC egress bridges for remote MCP (`GAP-P1-03`), sub-second CMEK revocation propagation returning `423 Locked` (`GAP-P1-04`), a cross-project federated registry over PSC (`GAP-P2-01`), and the zero-downtime live tier migrator (`GAP-P2-02`).

Three sign-off questions from the review pack deserve a CISO's attention because they define the trust model rather than a feature:

* **Immutability of `temp:` state.** Can LLM tool-call arguments or `transfer_to_agent` sub-agent transfers ever overwrite `temp:tenant_id` injected by the runner? The design assumes no; the GEAP Runtime and ADK 2.0 teams are asked to confirm it.
* **Zero-Google-footprint federation.** Can Auth Manager federate Entra ID v2.0 with DPoP binding without a Google Workspace shadow account? RetailStream's entire onboarding depends on the answer.
* **CMEK revocation SLA.** When FinVault disables a key version, do Memory Bank reads, AlloyDB queries, and Vertex AI context caches halt within 60 seconds across the perimeter?

Before any of this is deployed in a customer or FDE sandbox, the allowlist onboarding checklist in 1.4 enables the required APIs (`aiplatform`, `discoveryengine`, `modelarmor`, `dlp`, `run`, `alloydb`, `redis`, `cloudkms`, `accesscontextmanager`, `bigquery`, `telemetry`, and peers) and verifies Claude 3.7 Sonnet access in Vertex AI Model Garden for `Agent Alpha`.

---

## 6. Next steps: from taxonomy to running code

Workstream 1 is the design week of the program's `1W Design • 2W Build • 1W Launch` rhythm. The next four workstreams each take one pattern — or the comparison across them — from blueprint to Terraform, breach simulation, codelab, and demo:

* **Workstream 2 — Pattern A: Pooled (Milestone 1, Week 4).** Full solution architecture, 3P auth sandbox, a 10-point cross-tenant breach-defense simulation suite, Terraform starter, and the pooled governance blog. Start at [`2.1-case-study-and-solution-architecture.md`](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md).
* **Workstream 3 — Pattern B: Sovereign Silos (Milestone 2, Week 7).** Multi-project silo and CMEK setup, VPC-SC product sign-off, exfiltration and CMEK-revocation tests, and the silo Terraform blueprint. Start at [`3.1-case-study-and-solution-architecture.md`](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md).
* **Workstream 4 — Pattern C: Dynamic Hybrid (Milestone 3, Week 10).** Hub-and-spoke demo environment, PSC and cross-project registry collaboration, the zero-downtime tier-upgrade suite, and the hybrid PSC Terraform blueprint. Start at [`4.1-case-study-and-solution-architecture.md`](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md).
* **Workstream 5 — Wrap-Up & Backlog.** The pattern comparison and executive decision guide plus the capstone "Multi-Tenant Agentic Triad" blog. Start at [`5.1-pattern-comparison-and-decision-guide.md`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md).

If you are choosing a topology today: default to **Pattern A** for Standard tiers, reserve **Pattern B** for tenants whose regulators require a dedicated perimeter and customer-held keys, and plan for **Pattern C** the moment you have both kinds of customers — because the 5-Hop chain means you will not have to rewrite your governance code when you get there.

---

## 7. Assets & Editable Diagrams

All Workstream 1 artifacts are versioned in the repository and designed to be edited, not just viewed.

| Asset | Format | Location |
| :--- | :--- | :--- |
| Figure 1 — Taxonomy Overview (Pattern A, B & C) | Draw.io render | [`ws1-multi-tenant-taxonomy-overview.drawio.png`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png) |
| Figure 1 — editable source | Draw.io / XML | [`.drawio`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) • [`.drawio.xml`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.xml) |
| Figure 1 — Cloud Architecture Center export | SVG / PNG | [`.svg`](../diagrams/ws1-multi-tenant-taxonomy-overview.svg) • [`.png`](../diagrams/ws1-multi-tenant-taxonomy-overview.png) |
| Figure 1 — Vision AST (addressable objects) | JSON | [`ws1-multi-tenant-taxonomy-overview.vision.json`](../diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json) |
| Figure 2 — Cloud Arch Center 5-Hop Baseline | Draw.io render | [`ws1-cloud-arch-center-5hop-baseline.drawio.png`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png) |
| Figure 2 — editable source | Draw.io / XML | [`.drawio`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) • [`.drawio.xml`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.xml) |
| Figure 2 — Cloud Architecture Center export | SVG / PNG | [`.svg`](../diagrams/ws1-cloud-arch-center-5hop-baseline.svg) • [`.png`](../diagrams/ws1-cloud-arch-center-5hop-baseline.png) |
| Figure 2 — Vision AST (addressable objects) | JSON | [`ws1-cloud-arch-center-5hop-baseline.vision.json`](../diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json) |
| Editable slide deck (both figures + talking points) | PowerPoint | [`ws1-reference-architecture-editable-slides.pptx`](../slides/ws1-reference-architecture-editable-slides.pptx) |
| 1.1 Architecture Taxonomy & Diagrams | Markdown | [`1.1-architecture-taxonomy-and-diagrams.md`](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md) |
| 1.2 Product Team Review Pack | Markdown | [`1.2-product-team-review-pack.md`](../workstream-1-reference-architecture/1.2-product-team-review-pack.md) |
| 1.3 Cloud Architecture Center Doc Update PR | Markdown + diff | [`1.3-cloud-architecture-center-doc-update-pr.md`](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md) |
| 1.4 EAP & Product Gap Tracker | Markdown | [`1.4-eap-and-product-gap-tracker.md`](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) |
| 5-Hop governance modules (Hop 1–5) | Python | [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) |
| Program overview & deliverable map | Markdown | [`README.md`](../README.md) |

*Canonical reference: [Multi-tenant agentic AI system — Google Cloud Architecture Center](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system).*
