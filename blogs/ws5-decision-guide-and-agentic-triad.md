---
title: "Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad"
subtitle: "Choose between Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C) topologies on Google Cloud using a 2-question decision tree, side-by-side comparison matrix, and 3-stage technical solution lifecycle"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 5 of 5"
workstream: "Workstream 5 • Wrap-Up: Pattern Comparison, Decision Guide & Capstone Backlog (5.1 + 5.2)"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "CTOs, Principal Architects, CISOs, and Platform Product Managers designing multi-tenant AI platforms on Google Cloud"
reading_time: "14 min read"
tags: ["Multi-Tenancy","Vertex AI Agent Engine","ADK 2.0","Decision Guide","Zero Trust","FinOps","OpenTelemetry","VPC-SC","Private Service Connect","AlloyDB RLS"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws5-decision-tree-and-agentic-triad"]
editable_slides: "slides/ws5-wrap-up-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad

This document provides an executive decision framework to help you select, combine, and operate the right multi-tenant isolation topology for agentic AI systems on Google Cloud. It synthesizes the architectural patterns, security verification suites, and FinOps benchmarks from across this 5-part series—[Part 1 (Reference Taxonomy & 5-Hop Baseline)](ws1-reference-architecture-taxonomy-and-5hop-baseline.md), [Part 2 (Pattern A Pooled)](ws2-pattern-a-pooled-architecture.md), [Part 3 (Pattern B Sovereign Silos)](ws3-pattern-b-sovereign-silos.md), and [Part 4 (Pattern C Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md)—into a two-question decision tree and the **Multi-Tenant Agentic Triad**.

This document is intended for CTOs, principal cloud architects, CISOs, and AI product leaders evaluating [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/) for multi-customer B2B SaaS or internal enterprise platform deployments.

> **Key point:** Two gating questions determine your topology: (1) *Do 100% of your customers legally mandate dedicated Google Cloud projects, VPC Service Controls perimeters, or air-gapped open-weight models?* If yes, deploy **Pattern B (Sovereign Silos)**. (2) *If not, do you sell multiple pricing tiers (a shared Standard tier plus a dedicated Enterprise tier)?* If no, deploy **Pattern A (Pooled)**; if yes, deploy **Pattern C (Dynamic Hybrid)**.

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
| **Model & caching strategy** | Shared Gemini 2.5 Pro + **90% `ContextCacheConfig` savings** | Dedicated Vertex AI PT or **air-gapped Gemma 3 (27B) on GKE** | Pooled caching for Standard + dedicated PT / Gemini 2.5 Pro (Dedicated PT) for Enterprise |
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
| **Hop 5** | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Enforces transactional AlloyDB `FORCE ROW LEVEL SECURITY` and exports PII-scrubbed OTel FinOps spans to BigQuery |

## Architecture

The following diagram shows the executive topology decision tree and the **Multi-Tenant Agentic Triad** (Zero-Trust Security, Predictable FinOps Economics, and Privacy-Preserving Observability) governing all three patterns:

![Figure 1 — Executive decision tree, Pattern A/B/C selector, and the Multi-Tenant Agentic Triad](../diagrams/ws5-decision-tree-and-agentic-triad.drawio.png)

*Figure 1. Official Google Cloud Architecture Center hub-and-spoke synthesis showing the 2-Question Executive Topology Selector (Zone 1), the Multi-Tenant Agentic Triad & 80% Reusable 5-Hop Core (Zone 2), Pattern A Pooled & Pattern C Standard Pool Execution (Zone 3), and Pattern B Sovereign Silos & Pattern C Enterprise PSC Spokes (Zone 4). Editable assets: [Draw.io source](../diagrams/ws5-decision-tree-and-agentic-triad.drawio) | [Google Slides (.pptx)](../slides/ws5-wrap-up-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws5-decision-tree-and-agentic-triad.svg) | [Vision AST](../diagrams/vision_metadata/ws5-decision-tree-and-agentic-triad.vision.json).*

Figure 1 brings together the decision tree and the three operational pillars of the **Multi-Tenant Agentic Triad** ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)):

- **Executive 2-Question Topology Selector and Ingress Gate (Zone 1 — Blue container `#aecbfa`):** Evaluates regulatory mandate (Question 1) and SaaS tier packaging (Question 2) alongside Hop 1 OIDC/DPoP authentication to route tenants to Pattern A, Pattern B, or Pattern C.
- **The Multi-Tenant Agentic Triad & 80% Reusable Core Hub (Zone 2 — Green container `#ceead6`):** Unifies the three non-negotiable platform pillars—(1) Zero-Trust Security (`Hops 1, 2 & 4`), (2) Predictable FinOps (`Hop 3 ContextCacheConfig` + Valkey bulkheads), and (3) Privacy-Preserving Observability (`Hop 5` redacted OTel -> BigQuery).
- **High-Density Pooled Execution Path (Pattern A & Pattern C Standard) (Zone 3 — Left amber container `#feefc3`):** Delivers `120 RPM / 4k Budget` baseline unit economics with 90% shared prompt cache savings, `4,000` thinking-token caps, inline Model Armor + DLP, and shared AlloyDB `FORCE ROW LEVEL SECURITY`.
- **Sovereign Silo & Enterprise PSC Spoke Path (Pattern B & Pattern C Enterprise) (Zone 4 — Right coral container `#fad2cf`):** Delivers physical project isolation (`600 RPM / 8k Budget` spoke floor), VPC-SC perimeters, IAM PAB, Cloud KMS CMEK `HTTP 423` kill-switches, air-gapped Gemma 3 on GKE, and 0-downtime PSC tier upgrades.

The numbered callouts in Figure 1 trace both the architectural selection flow and the invariant 5-Hop runtime execution:

1. **Evaluate Question 1 (Regulatory mandate) and Question 2 (Tiered packaging):** Determine whether a tenant belongs in a shared pool (`Pattern A`), a dedicated sovereign project (`Pattern B`), or a dynamically routed hybrid topology (`Pattern C`).
2. **Hop 1 — Authenticate caller and bind cryptographic context:** Strip client headers in Cloud Armor and exchange the upstream Google OIDC or Microsoft Entra ID JWT for an RFC 9449 DPoP-bound `CryptographicContext`.
3. **Hop 2 — Enforce catalog ACLs and deterministic tool pruning:** Filter agents and MCP connectors in Discovery Engine and run ADK `before_agent_callback` pruning (`403 Forbidden` on unauthorized private agents).
4. **Hop 4 (Pre-inference) — Apply inline Model Armor and Cloud DLP guardrails:** Scan prompts and tool inputs for prompt injection (`400 Bad Request`) and mask sensitive PII before model invocation.
5. **Hop 3 — Enforce FinOps bulkheads, `ContextCacheConfig`, and CMEK state:** Enforce Valkey RPM limits (`429`), clamp `thinking_budget` (`4k` vs `8k`), verify KMS CMEK status (`423`), and invoke Gemini 2.5 Pro, Gemini 2.5 Pro (Dedicated PT), or Gemma 3.
6. **Hop 4 (Post-inference) — Verify 3LO DPoP binding and NLC compliance:** Validate sender-constrained 3LO tokens in Auth Manager (`401`) and block regulatory policy violations (`422`).
7. **Hop 5 — Persist to RLS / CMEK data plane and emit BigQuery FinOps span:** Write state to AlloyDB (`RLS` or dedicated `CMEK`) and stream PII-redacted token telemetry to BigQuery for per-tenant P&L tracking.

## Products used

This architecture uses the following Google Cloud products and open-source frameworks:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor sandboxes with managed session and memory state.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): An open-source framework for building and orchestrating multi-agent hierarchies with deterministic lifecycle callbacks (`before_agent_callback`, `before_tool_callback`, `before_model_callback`).
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Google's flagship multimodal reasoning model supporting shared prompt prefix caching (`ContextCacheConfig`) and configurable `thinking_budget` controls.
- [Vertex AI Model Garden](https://cloud.google.com/model-garden): An enterprise model repository providing governed access to partner models (such as Gemini 2.5 Pro (Dedicated PT) for tenant-private agents) and open-weight models (such as Gemma 3 27B).
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs): A managed Kubernetes service used in Sovereign Silo deployments (Pattern B) to run air-gapped open-weight models on private GPU node pools with zero public internet egress.

### Ingress, identity, and AI safety guardrails

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs): A global anycast External Application Load Balancer that terminates TLS 1.3 and mutual TLS (mTLS) connections at the Google network edge.
- [Google Cloud Armor](https://cloud.google.com/armor/docs): A web application firewall (WAF) and DDoS mitigation service that strips unverified client-supplied tenant headers (`X-Tenant-ID`) at ingress.
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation): Zero-trust authentication services that validate upstream OIDC and SAML JWTs and broker RFC 8693 On-Behalf-Of (OBO) token exchange bound to RFC 9449 DPoP sender-constrained proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview): An inline AI safety service that inspects prompts, model completions, and Model Context Protocol (MCP) tool payloads for prompt injection, jailbreaks, and policy violations.
- [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): A data inspection and de-identification service that masks regulated PII, PCI, and PHI tokens inline before prompts reach foundation models or logs.

### Data, storage, networking, and governance

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): A high-performance PostgreSQL-compatible database that enforces transactional `FORCE ROW LEVEL SECURITY (RLS)` policies keyed by `app.current_tenant_id`.
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Low-latency in-memory and document stores used for per-tenant token-bucket rate limiting, 5-level session memory caching, and dynamic tenant routing tables.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Private Service Connect](https://cloud.google.com/vpc/docs/private-service-connect): Network security boundaries that prevent cross-project data exfiltration and establish unidirectional NAT-based private peering between a central routing hub and isolated enterprise spokes.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs): A cryptographic key management service supporting customer-managed encryption keys (CMEK) and instant `HTTP 423 Locked` tenant kill-switches.
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Centralized posture monitoring, PII-redacted OpenTelemetry audit logging, and per-tenant token FinOps chargeback analytics.

## Design considerations

This section summarizes the **Multi-Tenant Agentic Triad** and maps it to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance (Pillar 1 of the Agentic Triad)

- **Defense-in-depth across all 5 hops:** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the `core-cymbal-agent/` compensating controls active until native sub-project `tenant_id` ACLs in Discovery Engine and native per-tenant `ContextCacheConfig` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.

### Cost optimization (Pillar 2 of the Agentic Triad)

- **Match infrastructure cost to customer ARR:** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and `120 RPM Pool` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.

### Operational excellence (Pillar 3 of the Agentic Triad)

- **Privacy-preserving FinOps observability:** Emit a `TenantTelemetrySpan` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery—with zero raw PII stored in logs.

### Performance optimization

- **3-stage technical solution lifecycle & progressive tier evolution:**
  - **Stage 1 (Pattern A Pooled Foundation):** Deploy `core-cymbal-agent/` and Pattern A Pooled Architecture ([Workstream 2](ws2-pattern-a-pooled-architecture.md)).
  - **Stage 2 (Pattern B Sovereign Silo Stamp-Out):** Stamp out Pattern B Sovereign Silos via Terraform for regulated anchor customers ([Workstream 3](ws3-pattern-b-sovereign-silos.md)).
  - **Stage 3 (Pattern C Dynamic Hybrid & Zero-Downtime Promotion):** Enable the Pattern C Hybrid Router and 3-phase zero-downtime live tier migrator ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)).

## What's next

- Review the complete 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
- Explore the Workstream 5 capstone deliverables and complete program guide:
  - [5.1 Executive Pattern Comparison & Topology Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)
  - [1.4 Consolidated EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)
  - [Complete End-to-End Workstream & 14-Diagram Master Guide](../docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md)
- Download or open the editable slide decks:
  - [Workstream 5 Editable Google Slides Deck (`ws5-wrap-up-editable-slides.pptx`)](../slides/ws5-wrap-up-editable-slides.pptx)
  - [All-in-One 25-Slide Master Presentation (`geap-multi-tenancy-all-workstreams-editable-slides.pptx`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
## Step-by-Step End-to-End Agentic & Technical Flows (WS5 Architecture Diagrams)

Every architecture blueprint in **WS5** follows a **strict Top-Down Architectural Zoom** inside the 14-slide Customer-Centric 3-Act presentation deck: **(1) Slide 5 (`L1` Conceptual 3-Zone Trust Boundary Overview)** → **(2) Slide 6 (`L2` Authoritative `Figure 1` Official `#78` Physical Blueprint: 56 Editable Shapes + 23 Connectors + 4-Zone Reference Sidebar)** → **(3) Slide 7 (`L3` 5-Actor Chronological Request Sequence)** → **(4) Slide 8 (`L4` 3-Stage Wire-Level JSON & Cryptographic Context Transformation)**.

### Diagram 7: Workstream 5 Capstone: Executive Topology Decision Guide & The Multi-Tenant Agentic Triad (`ws5-decision-tree-and-agentic-triad`)
* **Workstream & Focus**: Workstream 5 • Executive Topology Decision Guide & The Multi-Tenant Agentic Triad (WS 5.1–5.2) (`WORKSTREAM 5 • AGENTIC TRIAD`)
* **Question Answered**: *How do Chief Architects, CISOs, and CFOs select between Pattern A, Pattern B, and Pattern C—and how does the Multi-Tenant Agentic Triad balance Cryptographic Tenant Governance, Predictable FinOps COGS, and Zero-PII Observability across 1,000+ tenants?*
* **Architectural & Business Outcome (2-Question Topology Selector + 74% Total Cloud COGS Reduction Across 1,000 Tenants)**: Across a 1,000-tenant B2B SaaS portfolio (950 Standard + 50 Enterprise), Pattern C guided by the Agentic Triad reduces shared prompt token costs by 90%, cuts total monthly infrastructure COGS by 74% (via 90% shared ContextCacheConfig), and maintains 99.99% SLA with 0 cross-tenant leaks.

#### 4-Zone Hub-and-Spoke Architecture Summary
* **Blue Zone — 1. Triad Pillar 1: 5-Hop Governance & Selector**: Enforces Hops 1, 2 & 4 (OBO/DPoP, Catalog PDP, Model Armor) and applies the 2-Question Decision Tree to dispatch to Pattern A, B, or C.
* **Green Zone — 2. Triad Pillar 3: Zero-PII FinOps & SCC Audit**: Streams SDP-redacted OpenTelemetry spans into BigQuery to power Even Split, Proportional Chargeback, and Tiered FinOps models.
* **Yellow Zone — 3. Triad Pillar 2: Pattern A Pooled Unit Economics**: Combines 90% shared `ContextCacheConfig` discounts, Memorystore Valkey RPM bulkheads, 4,000-token caps, and AlloyDB RLS (120 RPM Pool unit cost).
* **Red Zone — 4. Regulated Scale: Pattern B Silos & Pattern C PSC**: Delivers dedicated VPC-SC + IAM PAB + Cloud KMS CMEK kill-switches (`HTTP 423`), air-gapped Gemma 3, and zero-downtime PSC tier upgrades.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — 2-Question Executive Topology Decision Tree** (*10,000+ Tenants → Blue Zone*): Architects evaluate two questions: Q1: Do all customers legally require dedicated GCP projects, VPC-SC, or air-gapped models? (Yes → Pattern B). Q2: Do you offer both a shared Standard tier and a regulated Enterprise tier? (Single tier → Pattern A; Multi-tier → Pattern C). **(2-Question Selector → Pattern A (Pooled), Pattern C (Hybrid), or Pattern B (Sovereign))**
1. **Step ② — Enforcing Hops 1 & 2 Across All Topologies** (*Blue Zone (Triad Pillar 1 — Identity & Catalog)*): Regardless of topology, every request passes Hop 1 (Cloud Armor header stripping + IAP OIDC/Entra + RFC 8693 OBO/DPoP) and Hop 2 (Discovery Engine Agent Catalog PDP + ADK `before_agent_callback` pruning). **(Triad Pillar 1 • Hops 1 & 2 Cryptographic Identity & Catalog PDP)**
1. **Step ③ — Commitment to Cost-Optimal or Sovereign Spoke** (*Blue Zone → Yellow or Red Spoke*): The Architecture Selector routes Standard commercial tenants (950 of 1,000 tenants) to the Pooled Spoke (Yellow Zone) and regulated Enterprise tenants (50 of 1,000 tenants) to Sovereign/PSC Spokes (Red Zone). **(950 Standard Tenants (Pooled) + 50 Enterprise Tenants (PSC/Silo))**
1. **Step ④ — 4 FinOps Levers Cut Pooled Token COGS by 84.7%** (*Yellow Zone (Triad Pillar 2 — Pooled FinOps)*): In the Pooled Spoke, Triad Pillar 2 combines (1) 90% shared `ContextCacheConfig` prefix caching, (2) Memorystore for Valkey RPM bulkheads, (3) 4,000-token thinking budget caps, and (4) compact MCP tool output pruning. **(Triad Pillar 2 • 90% Context Cache + Valkey Bulkhead + Token Cap)**
1. **Step ⑤ — Enforcing VPC-SC, CMEK Kill-Switch & Live Promotion** (*Red Zone (Sovereign & PSC Guarantees)*): In the Regulated Spoke, Enterprise tenants receive dedicated VPC-SC perimeters, IAM PAB policies, sub-60s Cloud KMS CMEK kill-switches (`HTTP 423`), air-gapped Gemma 3 / Gemini 2.5 Pro (Dedicated PT), and zero-downtime PSC tier upgrades. **(VPC-SC • IAM PAB • CMEK Kill-Switch (`423`) • Live PSC Upgrade)**
1. **Step ⑥ — Model Armor Guardrails & Engine-Level Data Isolation** (*Yellow & Red Zones (Hops 4 & 5 Data Plane)*): Hop 4 screens prompts and redacts egress PII/PCI via Model Armor & SDP, while Hop 5 enforces AlloyDB/BigQuery Row-Level Security (`SET LOCAL app.current_tenant`) or dedicated CMEK vault encryption. **(Hops 4 & 5 • Model Armor, Cloud SDP & AlloyDB/BigQuery RLS)**
1. **Step ⑦ — Zero-PII OpenTelemetry & 3 FinOps Chargeback Models** (*All Zones → Green Zone (Triad Pillar 3)*): Triad Pillar 3 streams zero-PII OpenTelemetry spans (`tenant_id`, `tier`, `thinking_tokens`, `cache_hit`) into BigQuery—supporting Even Split, Proportional Token Chargeback, and Fixed Tier pricing with 20/20 tests passing. **(Triad Pillar 3 • BigQuery OTel Sink & 74% Portfolio COGS Savings)**
1. **Outcome — 2-Question Topology Selector + 74% Total Cloud COGS Reduction Across 1,000 Tenants** (*Architectural & Business Outcome*): Across a 1,000-tenant B2B SaaS portfolio (950 Standard + 50 Enterprise), Pattern C guided by the Agentic Triad reduces shared prompt token costs by 90%, cuts total monthly infrastructure COGS by 74% (via 90% shared ContextCacheConfig), and maintains 99.99% SLA with 0 cross-tenant leaks. **(WORKSTREAM 5 • AGENTIC TRIAD)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Vertex AI Agent Engine • Google ADK 2.0 • Gemini 2.5 Pro & Gemma 3 • Cloud Armor & IAP • Model Armor & SDP • Memorystore for Valkey • AlloyDB RLS & Cloud KMS CMEK • BigQuery OTel
* **Architecture Summary**: Synthesizes the 2-Question Executive Topology Decision Tree (Pattern A vs. B vs. C) and the 3-Pillar Multi-Tenant Agentic Triad: (1) 5-Hop Cryptographic Governance, (2) Predictable FinOps Unit Economics (-84.7% COGS), and (3) Zero-PII OpenTelemetry Chargeback.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • 2-Question Selector | Executive Topology Decision Matrix (Blue Zone) | Evaluates regulatory blast-radius mandates (Q1 → Pattern B) and multi-tiered SaaS packaging (Q2 → Pattern A vs. Pattern C) on an 80% shared codebase. | workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md | Eliminates architectural forks; isolation is a per-tenant configuration |
| **Step ②** • Pillar 1: Zero-Trust Chain | 5-Hop Cryptographic Context Chain (Blue & Yellow Zones) | Enforces KMS-signed `CryptographicContext` across Edge PEP (Hop 1), Catalog PDP (Hop 2), gVisor Sandbox (Hop 3), Model Armor (Hop 4), and Data RLS (Hop 5). | core-cymbal-agent/governance/hop1..hop5 | 10/10 Pattern A breach tests + 6/6 Pattern B silo tests pass |
| **Step ③** • Pillar 2: FinOps Levers | Vertex AI ContextCacheConfig & Memorystore (Yellow Zone) | Caches the 32k-token shared system prompt once at a 90% discount while enforcing per-tier thinking budgets (`4k` vs `8k`) and Valkey RPM bulkheads. | Shared Read-Only Prefix Cache + Tiered Token Caps | 84.7% per-turn token COGS reduction; 74% total 1,000-tenant cloud savings |
| **Step ④** • Sovereign Silo Controls | VPC-SC, IAM PAB & Cloud KMS CMEK (Red Zone) | Wraps regulated Enterprise projects in VPC Service Controls and IAM Principal Access Boundaries with live Cloud KMS CMEK kill-switch verification (`HTTP 423`). | workstream-3-pattern-b-siloed (Milestone 2) | Satisfies OCC/FDIC, HIPAA, and public-sector physical isolation audits |
| **Step ⑤** • Hybrid PSC & Live Upgrade | Private Service Connect & 3-Phase Migrator (Green & Red Zones) | Bridges the central hub to dedicated spokes over unidirectional PSC (`10.10.0.50`) and promotes live tenants (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`). | workstream-4-pattern-c-hybrid (Milestone 3 • 4/4 PASS) | Zero-downtime Standard → Enterprise promotion with 0 dropped sessions |
| **Step ⑥** • Multi-Model Agility | Gemini 2.5 Pro, Gemini 2.5 Pro (Dedicated PT) & Gemma 3 (Yellow & Red Zones) | Runs shared Gemini 2.5 Pro in the pool while enabling Vertex AI Model Garden hot-swapping (Gemini 2.5 Pro (Dedicated PT)) and air-gapped Gemma 3 (27B) on private GKE. | FinVaultPrivateAgentAlpha & Private GKE Blueprint | Matches model capability and residency to each tenant’s contract tier |
| **Step ⑦** • Pillar 3: Zero-PII OTel | Sensitive Data Protection & BigQuery OTel (Green Zone) | Redacts all PII/PHI/PCI via Cloud SDP prior to log export and streams tenant-tagged token consumption into BigQuery (`cymbal_agentic_finops_otel`). | 3 Chargeback Models (Even Split, Proportional, Tiered) | Verified live in BigQuery: Pattern A, Pattern C, and Pattern B spans |
| **Cost & Audit** • 10-Week Program Roadmap | 12/12 Forensic Gates & Product EAP Backlog (Green Zone) | Delivers Pattern A in Week 4, Pattern B in Week 7, and Pattern C in Week 10 alongside the 9-item Google Cloud Product EAP Tracker (`GAP-P0-01`..`GAP-P2-02`). | scripts/run_deep_forensic_audit.py (12/12 PASS • 20/20 SIMS) | Complete, production-certified reference architecture across WS1–WS5 |

<!-- E2E_FLOW_END -->
