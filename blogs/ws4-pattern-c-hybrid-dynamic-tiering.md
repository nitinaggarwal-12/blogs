---
title: "Multi-tenant agentic AI system: Pattern C dynamic hybrid routing and zero-downtime tier upgrades"
subtitle: "Route Standard tenants to a shared pool and Enterprise tenants over Private Service Connect to isolated CMEK spokes from one unified control plane—with live 0-dropped-turn tier migration"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 4 of 5"
workstream: "Workstream 4 • Milestone 3 (Weeks 7–10) • Pattern C — Dynamic Hybrid Architecture"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Cloud Architects, Platform Product Managers, and FinOps Leads operating tiered B2B SaaS on Google Cloud"
reading_time: "13 min read"
tags: ["Pattern C","Hybrid Architecture","Private Service Connect","Hub-and-Spoke","Zero-Downtime Migration","Vertex AI Agent Engine","ADK 2.0","CMEK","AlloyDB RLS","FinOps","Multi-Tenancy"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws4-pattern-c-hybrid-psc-and-migration","ws4-hub-and-spoke-demo-env-setup-topology","ws4-zero-downtime-tier-upgrade-sequence","ws4-terraform-hybrid-psc-blueprint-resource-graph"]
editable_slides: "slides/ws4-pattern-c-hybrid-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Pattern C dynamic hybrid routing and zero-downtime tier upgrades

This document describes **Pattern C (Dynamic Hybrid Hub-and-Spoke Architecture)** for building and operating a multi-tiered agentic AI SaaS platform on Google Cloud. Pattern C combines the high-density unit economics of [Pattern A (Pooled Architecture)](ws2-pattern-a-pooled-architecture.md) with the physical project and encryption isolation of [Pattern B (Sovereign Silos)](ws3-pattern-b-sovereign-silos.md) behind a single unified control plane (`cymbal-hybrid-hub-prod`). A tenant-aware [Cloud Run](https://cloud.google.com/run/docs) router directs Standard-tier customers to a shared pooled runtime while bridging regulated Enterprise-tier customers across [Private Service Connect (PSC)](https://cloud.google.com/vpc/docs/private-service-connect) into dedicated CMEK-encrypted spoke projects.

This document is part 4 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (introduced in [Part 1: Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)). It also details a **3-phase zero-downtime tier migration engine** that promotes a live customer from the shared pool into a dedicated PSC spoke with **zero dropped turns**.

> **Key point:** Pattern C eliminates the need to maintain separate SaaS products for Standard and Enterprise tiers. All customers connect to one SaaS URL, authenticate through one Hop 1 gateway, and run on the same **80% reusable 5-Hop agent core**—while upgrading from the shared pool to a dedicated PSC spoke requires only a single atomic Firestore route flip (`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY`).

## Architecture

The following diagram shows the Pattern C dynamic hybrid hub-and-spoke architecture, connecting the central routing and governance hub to both the shared pooled runtime and dedicated Enterprise Private Service Connect (PSC) spokes:

![Figure 1 — Pattern C: Dynamic hybrid hub-and-spoke architecture, Private Service Connect (PSC) spokes, and live tier migration](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.png)

*Figure 1. Official Google Cloud Architecture Center hub-and-spoke topology showing the Unified Hybrid Routing Hub (`cymbal-hybrid-hub-prod`), Federated Agent Catalog & Migration Control Hub, Shared Pooled Runtime Spoke (Standard Tier), and Dedicated Enterprise PSC Spoke (`cymbal-finvault-silo-prod` / promoted `cymbal-retailstream-spoke-prod`). Editable assets: [Draw.io source](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.svg) | [Vision AST](../diagrams/vision_metadata/ws4-pattern-c-hybrid-psc-and-migration.vision.json).*

Figure 1 organizes the hybrid platform across four functional zones:

- **Unified Hybrid Routing and Identity Hub (`cymbal-hybrid-hub-prod`) (Zone 1 — Blue container `#aecbfa`):** Terminates all Standard and Enterprise traffic at one External Application Load Balancer, strips forged headers in Cloud Armor, verifies OIDC/Entra JWTs in IAP (`Hop 1`), and queries the Firestore Route Table in the Cloud Run Hybrid Router to dispatch turns to `pool://` or `psc://`.
- **Federated Agent Catalog, KMS, and Live Migration Hub (Zone 2 — Green container `#ceead6`):** Synchronizes private spoke agent descriptors (`Agent Alpha`) into the hub's Discovery Engine Catalog PDP (`Hop 2`), orchestrates the 3-phase Zero-Downtime Tier Migration Engine (`pattern_c_hybrid_router_and_migrator.py`), and aggregates cross-tier BigQuery FinOps telemetry (`Hop 5`).
- **Shared Pooled Runtime Spoke (Standard Tier — `pool://`) (Zone 3 — Left amber container `#feefc3`):** Serves Standard-tier tenants (`RetailStream Corp` prior to upgrade) inside the shared Vertex AI Agent Engine runtime (`4,000` token cap, `120 RPM`) with 90% shared `ContextCacheConfig` savings and shared AlloyDB RLS.
- **Dedicated Enterprise PSC Spoke (`psc://10.10.0.50/...`) (Zone 4 — Right coral container `#fad2cf`):** Serves Enterprise tenants (`FinVault Bank` and upgraded `RetailStream Corp`) across unidirectional Private Service Connect (`ServiceAttachment`) inside a dedicated VPC-SC perimeter with `8,000` thinking-token budgets, dedicated CMEK AlloyDB, and private `Agent Alpha` (`Claude 3.7 Sonnet`).

The numbered callouts in Figure 1 trace dynamic tier routing and cross-project PSC execution:

1. **Unified SaaS request:** Standard and Enterprise customers send HTTPS requests to the same public Cymbal SaaS hostname.
2. **Hop 1 — Cryptographic identity verification and Firestore route lookup:** IAP and the Edge PEP derive `ctx.tenant_id` from the JWT and look up the tenant's active route (`PATTERN_C_HYBRID_POOL` vs `PATTERN_C_HYBRID_PSC_SPOKE`) in Firestore.
3. **Hop 2 — Federated Agent Catalog PDP and tool pruning:** The hub catalog resolves both shared pool agents and federated PSC spoke agents, blocking cross-tenant calls (`HTTP 403`) and pruning unauthorized MCP tools.
4. **Hop 4 (Pre-inference) — Model Armor and Cloud DLP inspection:** Prompts and tool arguments pass through inline injection and PII guardrails before traversing either the pool or the PSC forwarding rule.
5. **Hop 3 — Dynamic dispatch to Shared Pool (`pool://`) or PSC Spoke (`psc://`):** Standard tenants execute in the shared pool (`4,000` token cap); Enterprise tenants traverse the consumer PSC endpoint (`10.10.0.50`) into their dedicated spoke producer attachment (`8,000` token budget + CMEK verification).
6. **Hop 4 (Post-inference) — Output DLP and tier-scoped 3LO MCP execution:** Responses and 3LO MCP calls are validated against the caller's DPoP proof and NLC compliance rules.
7. **Hop 5 — Tier-isolated persistence and unified BigQuery FinOps chargeback:** Data persists in shared AlloyDB RLS (Standard) or dedicated CMEK AlloyDB (Enterprise), while redacted OTel spans stream to the hub BigQuery ledger.

### Cross-project Private Service Connect (PSC) network topology (Figure 2)

![Figure 2 — Pattern C: Hub-and-spoke VPC and Private Service Connect (PSC) NAT peering topology](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio.png)

*Figure 2. Cross-project network architecture (`workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md`) showing consumer PSC endpoints in `cymbal-hybrid-hub-prod` connecting to producer `ServiceAttachment` resources in isolated Enterprise spoke projects without CIDR overlap. Editable assets: [Draw.io source](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.svg) | [Vision AST](../diagrams/vision_metadata/ws4-hub-and-spoke-demo-env-setup-topology.vision.json).*

Figure 2 illustrates the network architecture detailed in [4.2 Hub-and-Spoke Demo Environment Setup](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md):

- **Hub VPC and Cloud Run Direct VPC Egress (`10.10.0.0/20`) (Zone 1 — Blue container `#aecbfa`):** Hosts the Cloud Run Hybrid Router with Direct VPC Egress to internal consumer PSC forwarding rules (`10.10.0.50`, `10.10.0.51`).
- **PSC Producer-Consumer Handshake and VPC-SC Ingress Bridge (Zone 2 — Green container `#ceead6`):** Enforces `ACCEPT_MANUAL` consumer accept lists on each spoke `ServiceAttachment` and binds VPC-SC ingress rules exclusively to the hub router service account.
- **FinVault Enterprise PSC Spoke (`10.40.0.0/20`) (Zone 3 — Left amber container `#feefc3`):** Dedicated spoke project publishing `finvault-agent-spoke-psc` in front of an Internal Application Load Balancer, Agent Engine runtime, and CMEK AlloyDB.
- **RetailStream Promoted Enterprise PSC Spoke (`10.40.0.0/20` reused) (Zone 4 — Right coral container `#fad2cf`):** Demonstrates non-overlapping CIDR reuse: because PSC uses source NAT, every enterprise spoke can reuse `10.40.0.0/20` without IP exhaustion.

The seven numbered steps in Figure 2 trace packet flow across the Private Service Connect boundary:

1. **Ingress at hub External Application Load Balancer:** Traffic enters `cymbal-hybrid-hub-prod` over TLS 1.3 and passes Cloud Armor and IAP (`Hop 1`).
2. **Cloud Run Router resolves PSC target URI:** Firestore returns `psc://10.10.0.50/projects/cymbal-finvault-silo-prod/serviceAttachments/finvault-agent-spoke-psc`.
3. **Direct VPC Egress to consumer PSC forwarding rule:** The router sends the signed `CryptographicContext` to internal IP `10.10.0.50` inside the hub VPC.
4. **Unidirectional PSC NAT traversal into producer spoke:** Google Andromeda translates packet headers across the producer `ServiceAttachment` (`cymbal-psc-nat-us-west1`); the spoke cannot initiate reverse connections into the hub.
5. **Spoke Internal ALB and Agent Engine execution:** The spoke Internal ALB forwards the request to the isolated Vertex AI Agent Engine runtime (`Hop 3` & `Hop 4`).
6. **Spoke-local CMEK AlloyDB and 3LO MCP access:** The agent queries dedicated CMEK AlloyDB and spoke-local MCP connectors inside the spoke VPC-SC perimeter (`Hop 5`).
7. **Synchronous response and hub OTel aggregation:** The response returns over the PSC connection and emits a redacted FinOps span to the hub.

### 3-phase zero-downtime live tier upgrade sequence (Figure 3)

![Figure 3 — Pattern C: 3-phase zero-downtime live tier migration (Pool to Enterprise PSC Spoke)](../diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio.png)

*Figure 3. Three-phase live migration state machine (`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY`) promoting `RetailStream Corp` from the shared Pattern A pool into a dedicated Enterprise PSC spoke (`cymbal-retailstream-spoke-prod`) with `0` dropped turns. Editable assets: [Draw.io source](../diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-zero-downtime-tier-upgrade-sequence.svg) | [Vision AST](../diagrams/vision_metadata/ws4-zero-downtime-tier-upgrade-sequence.vision.json).*

Figure 3 details the live migration state machine implemented in [`pattern_c_hybrid_router_and_migrator.py`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py):

- **Phase 1 — Background Shadow Sync (`SHADOW_SYNC`) (Zone 1 — Blue container `#aecbfa`):** Streams RetailStream's AlloyDB RLS rows (`WHERE tenant_id = 'retailstream'`) via Database Migration Service (DMS) CDC and Dual-Writes Memory Bank vectors into `cymbal-retailstream-spoke-prod` while live turns continue on the pool.
- **Phase 2 — Single-Document Atomic Route Cutover (`ATOMIC_CUTOVER`) (Zone 2 — Green container `#ceead6`):** Once CDC replication lag reaches `0 ms`, commits a single Firestore transaction flipping RetailStream from `pool://` (`4,000` token cap) to `psc://10.10.0.51/...` (`8,000` token budget + CMEK).
- **Pre-Cutover Source — Shared Pooled Runtime (`Turn N`) (Zone 3 — Left amber container `#feefc3`):** Serves Turn N before cutover and gracefully drains in-flight pooled sessions during Phase 3 (`DRAIN_AND_VERIFY`).
- **Post-Cutover Target — Dedicated RetailStream PSC Spoke (`Turn N+1`) (Zone 4 — Right coral container `#fad2cf`):** Immediately serves Turn N+1 with full conversation history intact, `8,000` thinking-token entitlement, and dedicated CMEK encryption (`projects/cymbal-retailstream-spoke-prod/.../agent-memory-cmek`).

The seven numbered steps in Figure 3 trace a live customer upgrade mid-conversation:

1. **Turn N executes on Shared Pool (`STANDARD` tier):** RetailStream runs on `pool://cymbal-shared-pooled-runtime-v2` with its `4,000` thinking-token cap.
2. **Provision dedicated Enterprise PSC spoke via Terraform:** Terraform stamps out `cymbal-retailstream-spoke-prod`, its Cloud KMS CMEK key, and its PSC `ServiceAttachment`.
3. **Phase 1 (`SHADOW_SYNC`) — CDC replication and memory dual-write:** DMS streams RetailStream rows from shared AlloyDB RLS to spoke CMEK AlloyDB until `replication_lag_ms == 0`.
4. **Verify parity checksums across pool and spoke:** The migration controller verifies row counts, vector embeddings, and KMS encryption status in the target spoke.
5. **Phase 2 (`ATOMIC_CUTOVER`) — Sub-10ms Firestore route flip:** A single Firestore transaction updates RetailStream's route to `psc://10.10.0.51/...`, tier to `ENTERPRISE`, and token budget to `8,000`.
6. **Turn N+1 routes to Dedicated PSC Spoke with `0` dropped turns:** The very next user turn routes over PSC to `cymbal-retailstream-spoke-prod` with full session memory preserved.
7. **Phase 3 (`DRAIN_AND_VERIFY`) — Cryptographic purge of pooled rows:** In-flight pooled requests finish, and RetailStream's legacy rows in the shared AlloyDB pool are cryptographically purged.

### Dual-provider Terraform hybrid PSC resource graph (Figure 4)

![Figure 4 — Pattern C: Multi-project Terraform hybrid hub and PSC spoke resource graph](../diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio.png)

*Figure 4. Declarative multi-project Terraform DAG (`workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/`) using `google.hub` and `google.spoke` provider aliases to wire PSC producer attachments and consumer endpoints. Editable assets: [Draw.io source](../diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.svg) | [Vision AST](../diagrams/vision_metadata/ws4-terraform-hybrid-psc-blueprint-resource-graph.vision.json).*

Figure 4 maps the dual-provider Terraform blueprint ([`4.6-terraform-hybrid-psc-blueprint/main.tf`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)):

- **Hub Provider (`google.hub`) Edge and Router Resources (Zone 1 — Blue container `#aecbfa`):** Provisions `google_cloud_run_v2_service.hybrid_router`, Direct VPC Egress subnets, and Firestore routing collections in `cymbal-hybrid-hub-prod`.
- **Cross-Project PSC Handshake and Federated Registry (Zone 2 — Green container `#ceead6`):** Links `google_compute_forwarding_rule.psc_consumer` in the hub to `google_compute_service_attachment.psc_producer` in each spoke with `ACCEPT_MANUAL` project allowlists.
- **Shared Pool Resources in Hub Project (Zone 3 — Left amber container `#feefc3`):** Provisions the pooled Vertex AI Agent Engine runtime, Memorystore for Valkey, and shared AlloyDB RLS cluster.
- **Spoke Provider (`google.spoke`) Sovereign Resources (Zone 4 — Right coral container `#fad2cf`):** Provisions isolated spoke VPCs, `cymbal-psc-nat-us-west1` NAT subnets, Internal ALBs, spoke Agent Engine runtimes, and CMEK AlloyDB clusters.

The seven numbered steps in Figure 4 trace the multi-project Terraform deployment:

1. **Initialize `google.hub` and `google.spoke` Terraform providers:** Configure provider aliases targeting `cymbal-hybrid-hub-prod` and `cymbal-{tenant}-spoke-prod`.
2. **Provision hub VPC, Cloud Armor, IAP, andShared Pool:** Deploy the shared Pattern A pool components inside the hub project.
3. **Provision spoke VPC, PSC NAT subnet, and Internal ALB:** Create the isolated spoke network and `/24` `PRIVATE_SERVICE_CONNECT` NAT subnet.
4. **Publish spoke `google_compute_service_attachment`:** Expose the spoke Internal ALB via a PSC producer attachment with `consumer_accept_lists` restricted to the hub project.
5. **Create hub `google_compute_forwarding_rule` PSC endpoint:** Bind a static internal IP (`10.10.0.50`) in the hub VPC to the spoke's `ServiceAttachment` URI.
6. **Deploy Cloud Run Hybrid Router and Firestore route table:** Configure the router with Direct VPC Egress and seed tenant routing rules.
7. **Run 4-point hybrid and live-migration test suite:** Execute `test_pattern_c_hybrid_and_migration.py` to validate routing, catalog isolation, and zero-downtime promotion.

## Products used

This architecture uses the following Google Cloud products and open-source frameworks:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor sandboxes with managed session and memory state.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): An open-source framework for building and orchestrating multi-agent hierarchies with deterministic lifecycle callbacks (`before_agent_callback`, `before_tool_callback`, `before_model_callback`).
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Google's flagship multimodal reasoning model supporting shared prompt prefix caching (`ContextCacheConfig`) and configurable `thinking_budget` controls.
- [Vertex AI Model Garden](https://cloud.google.com/model-garden): An enterprise model repository providing governed access to partner models (such as Anthropic Claude 3.7 Sonnet for tenant-private agents) and open-weight models (such as Gemma 3 27B).
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

## Use cases

Pattern C is the recommended production architecture for multi-tiered B2B SaaS platforms ([4.1 Case Study & Solution Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)):

- **Tiered SaaS product packaging (Standard vs Enterprise):** Offer a low-cost self-service Standard tier on shared pooled infrastructure alongside a premium Enterprise tier with dedicated Google Cloud projects and customer-managed encryption keys—without maintaining two separate codebases or URLs.
- **Land-and-expand customer lifecycle with live upgrades:** Onboard new logos into the shared pool in seconds (**RetailStream Corp** at `$42/mo` floor) and promote them live into a dedicated PSC spoke (`$1,850/mo` spoke floor) when they sign an Enterprise expansion contract, with **zero downtime and zero lost chat history**.
- **Cross-project private agent federation:** Allow Enterprise customers (**FinVault Bank**) to run private custom agents (`Agent Alpha` on Claude 3.7 Sonnet) inside their isolated spoke while surfacing those agents seamlessly through the unified SaaS UI.

## Design alternatives

### VPC Network Peering vs Private Service Connect (PSC) for hub-to-spoke connectivity

A critical architectural decision in Pattern C is how the central routing hub communicates with dozens or hundreds of isolated Enterprise tenant projects ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)):

| Networking dimension | Traditional VPC Network Peering | Private Service Connect (PSC) (`ServiceAttachment`) |
| :--- | :--- | :--- |
| **Scale & quota limits** | Caps out at 25 peered VPC networks per hub VPC | Scales to **hundreds of Enterprise tenant spokes** per hub VPC |
| **IP address management** | Requires globally non-overlapping CIDR blocks across all tenants | **NAT-based:** every spoke can reuse the exact same `10.40.0.0/20` CIDR |
| **Directionality & blast radius** | Bi-directional L3 routing between peered subnets | **Strictly unidirectional** (Hub consumer -> Spoke producer only) |
| **Authorization model** | Network-level peering handshake | Explicit `ACCEPT_MANUAL` project allowlist + VPC-SC ingress policy |

### 4-point hybrid routing and live migration verification matrix

Every Pattern C deployment is verified using the automated test suite ([`run_tier_migration_suite.py`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py)):

| Test ID | Hybrid & migration scenario | Verified runtime outcome |
| :--- | :--- | :--- |
| **Hybrid Test 1** | Initial tier routing (`RetailStream` Standard vs `FinVault` Enterprise) | RetailStream routes to `pool://` (`4,000` cap); FinVault routes to `psc://10.10.0.50/...` (`8,000` budget) |
| **Hybrid Test 2** | Cross-tier private agent isolation (`RetailStream` calling FinVault's `Agent Alpha`) | Blocked at Hop 2 Federated Catalog PDP with **`HTTP 403 Forbidden`** |
| **Hybrid Test 3** | 3-phase live tier upgrade of `RetailStream` (`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY`) | **`0` dropped turns**, `0 ms` final CDC lag, route flipped to `psc://10.10.0.51/...` |
| **Hybrid Test 4** | Post-upgrade RetailStream turn verification | Executes in dedicated spoke with `8,000` token budget + CMEK key `projects/cymbal-retailstream-spoke-prod/...` |

## Design considerations

This section provides guidance for operating Pattern C according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Index routing tables exclusively by cryptographically verified `tenant_id`:** In `route_and_invoke()`, always execute **Hop 1** (`hop1.authenticate_and_mint_context()`) before querying the Firestore route table so a client cannot spoof an HTTP header to route into another tenant's PSC spoke.
- **Scope tenant profiles per runtime instance:** Store `tenant_profiles` on `self._tenant_profiles` per runtime instance rather than mutating a global class dictionary, ensuring that promoting a tenant in one router instance never causes cross-instance state pollution.
- **Configure `ACCEPT_MANUAL` on all PSC ServiceAttachments:** Explicitly list only the hub project (`cymbal-hybrid-hub-prod`) in each spoke's `consumer_accept_lists` and set a connection limit to prevent unauthorized PSC attachment attempts.

### Reliability

- **Zero-downtime cutover via atomic Firestore transactions:** Perform all data synchronization (AlloyDB DMS CDC and Memory Bank dual-writes) during `SHADOW_SYNC` before flipping the single Firestore routing document in `ATOMIC_CUTOVER`.

### Cost optimization

- **Blend pooled and sovereign unit economics (`$680/month` blended floor):** Keep 80–90% of high-volume Standard customers in the shared pool (`$42/mo` floor with 90% `ContextCacheConfig` savings) while provisioning dedicated PSC spokes (`$1,850/mo`) only for high-ACV Enterprise contracts ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)).

### Operational excellence

- **Use dual-provider Terraform modules:** Manage the hub and spoke lifecycle in a single declarative graph using `google.hub` and `google.spoke` provider aliases ([4.6 Terraform Hybrid PSC Blueprint](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)).

### Performance optimization

- **Cache Firestore routing entries with pub/sub invalidation:** Cache active tenant route descriptors in local Cloud Run memory with a 5-second TTL and immediate Firestore watch invalidation so `ATOMIC_CUTOVER` propagates globally in under `10 ms`.

## What's next

- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 4 engineering deliverables and master lab:
  - [4.1 Pattern C Case Study & Dynamic Hybrid Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)
  - [4.2 Hub-and-Spoke Demo Environment & PSC Network Setup](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md)
  - [4.3 Hybrid Router & 3-Phase Live Tier Migrator (`pattern_c_hybrid_router_and_migrator.py`)](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py)
  - [4.4 Product Collaboration: PSC Scaling & Cross-Project Agent Catalog](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)
  - [4.5 4-Point Hybrid Routing & Zero-Downtime Migration Tests (`run_tier_migration_suite.py`)](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py)
  - [4.6 Dual-Provider Terraform Hybrid PSC Blueprint (`main.tf`)](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)
  - [4.8 90-Minute Master Codelab: Multi-Pattern Routing & Live Tier Upgrades](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md)
- Download or open the editable slides:
  - [Workstream 4 Editable Google Slides Deck (`ws4-pattern-c-hybrid-editable-slides.pptx`)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
## Step-by-Step End-to-End Agentic & Technical Flows (WS4 Architecture Diagrams)

Every architecture diagram in **WS4** is accompanied by a **3-slide sequence** in the editable presentation deck: **(1) 100% Native Editable Architecture Diagram (56 Shapes + 23 Connectors + Component Sidebar)** → **(2) Step-by-Step Agentic Flow (Steps ①–⑦)** → **(3) Component Architecture & Well-Architected Specification Table**.

### Diagram 6: Pattern C: Dynamic Hybrid Hub-and-Spoke, Private Service Connect (PSC) & Live Tier Migration (`ws4-pattern-c-hybrid-psc-and-migration`)
* **Workstream & Focus**: Workstream 4 • Pattern C: Dynamic Hybrid Hub-and-Spoke, PSC & Live Tier Migration (WS 4.1) (`PATTERN C • HYBRID PSC & MIGRATION`)
* **Question Answered**: *How do we serve both high-density Standard tenants (Pooled) and regulated Enterprise tenants (Dedicated Spokes) behind a single unified SaaS URL—and upgrade a live tenant from Pooled to a Dedicated Spoke with zero dropped sessions?*
* **Architectural & Business Outcome (Single Unified SaaS URL Routing Across Pooled & PSC Spokes + Zero-Downtime Tier Upgrades)**: Standard tenants (RetailStream baseline) run in the cost-optimal shared pool while Enterprise tenants (FinVault) route over Private Service Connect to dedicated spokes—and growing tenants promote live (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) with 0 dropped sessions.

#### 4-Zone Hub-and-Spoke Architecture Summary
* **Blue Zone — 1. Unified Ingress Hub & Tier-Aware Router**: Fronts all customers behind one SaaS URL, verifies identity at Hop 1, queries the Firestore route table, and filters the cross-project Agent Catalog.
* **Green Zone — 2. 3-Phase Zero-Downtime Migration Engine**: Orchestrates live Standard → Enterprise promotions across `SHADOW_SYNC` (0ms lag), `ATOMIC_CUTOVER`, and `DRAIN_AND_VERIFY` (0 dropped sessions).
* **Yellow Zone — 3. Left Spoke: Shared Pooled Runtime (Standard)**: Executes Standard-tier workloads (`pool://`, 4,000 thinking cap, 90% shared cache, AlloyDB RLS) and streams state during live tier upgrades.
* **Red Zone — 4. Right Spoke: Dedicated Enterprise PSC Spokes**: Connects via unidirectional Private Service Connect (`psc://`, `/28` NAT subnet) to dedicated CMEK-encrypted Enterprise spokes (8,000 thinking budget).

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Single Unified SaaS URL & Identity Verification** (*Standard & Enterprise Users → Blue Zone*): Both Standard (RetailStream) and Enterprise (FinVault) users connect to the same `agent.cymbal.cloud` URL. Hop 1 Cloud Armor and IAP verify OIDC/Entra tokens and mint a KMS-signed `CryptographicContext`. **(Unified SaaS Ingress • Cloud Armor & IAP OBO/DPoP)**
1. **Step ② — Firestore Tier Lookup & Cross-Project Catalog PDP** (*Blue Zone (Catalog & Route Lookup)*): The Cloud Run Hybrid Router looks up the tenant’s active routing record in Firestore (`pool://` vs `psc://`) and filters the federated Vertex AI Agent Engine Registry so private spoke agents are only visible to their owner. **(Firestore Routing Table • Cross-Project Agent Catalog PDP)**
1. **Step ③ — Dynamic Dispatch: Shared Pool vs. Unidirectional PSC** (*Blue Zone → Left or Right Spoke*): Standard tenants route directly to the Left Spoke (`pool://cymbal-shared-pooled-runtime-v2`), while Enterprise tenants traverse a Private Service Connect consumer endpoint (`psc://finvault-agent-spoke-psc`) into the Right Spoke. **(Dynamic Tier Router • Private Service Connect (PSC))**
1. **Step ④ — Tier-Scoped Model Armor & Thinking Budget Enforcement** (*Yellow & Red Zones (Tiered Guardrails)*): In the Pooled Spoke, shared Model Armor enforces Standard policies and clamps reasoning to 4,000 tokens. In the Enterprise PSC Spoke, dedicated Model Armor templates run with an 8,000-token budget. **(Tiered Model Armor Templates • 4,000 vs. 8,000 Token Budget)**
1. **Step ⑤ — 3-Phase Zero-Downtime Tier Promotion Engine** (*Green, Yellow & Red Zones (Live Upgrade)*): When RetailStream upgrades from Standard to Enterprise mid-conversation, the Migration Engine runs (1) `SHADOW_SYNC` (streaming memory & RLS rows to the new CMEK spoke to 0ms lag), (2) `ATOMIC_CUTOVER` in Firestore, and (3) `DRAIN_AND_VERIFY`. **(SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY)**
1. **Step ⑥ — Seamless Next-Turn Execution in Dedicated PSC Spoke** (*Red Zone (Promoted Enterprise Spoke)*): In-flight pooled turns finish draining gracefully, while the very next message in RetailStream’s active `session_id` routes over Private Service Connect to `cymbal-retailstream-silo-prod` with 8,000 tokens and dedicated CMEK encryption. **(Zero Dropped Sessions • Dedicated CMEK Spoke Execution)**
1. **Step ⑦ — Unified Response Delivery & Blended FinOps Telemetry** (*Spokes → Caller & Green Zone FinOps*): The caller receives a seamless response without re-authenticating or changing URLs, while BigQuery OTel records the transition from Pooled ($0.0042/turn) to Hybrid PSC ($0.0079/turn) chargeback. **(Seamless Session Continuity • BigQuery Blended FinOps)**
1. **Outcome — Single Unified SaaS URL Routing Across Pooled & PSC Spokes + Zero-Downtime Tier Upgrades** (*Architectural & Business Outcome*): Standard tenants (RetailStream baseline) run in the cost-optimal shared pool while Enterprise tenants (FinVault) route over Private Service Connect to dedicated spokes—and growing tenants promote live (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) with 0 dropped sessions. **(PATTERN C • HYBRID PSC & MIGRATION)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: External ALB • Cloud Armor & IAP • Cloud Run Hybrid Router • Firestore Route Table • Private Service Connect (PSC) • Vertex AI Agent Engine • AlloyDB RLS & CMEK Spokes
* **Architecture Summary**: Combines a single multi-tenant ingress hub with a Firestore tier routing table that dispatches Standard tenants to the shared pool (`pool://`) and Enterprise tenants across unidirectional Private Service Connect (PSC) bridges (`psc://`), plus a 3-phase zero-downtime live tier migrator.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Unified Ingress & PEP | External ALB, Cloud Armor & IAP (Blue Zone) | Terminates all customer tiers at one Anycast IP and mints a KMS-signed `CryptographicContext` derived from the verified OIDC/Entra issuer. | hop1_edge_identity_pep.py • Unified SaaS Hostname | Customers never change URLs or OAuth redirect URIs when upgrading tiers |
| **Step ②** • Federated Catalog & Route | Firestore Route Table & Cross-Project Registry (Blue Zone) | Resolves the tenant’s live target URI (`pool://` vs `psc://`) and filters cross-project `agent://` descriptors by tenant ownership. | route_tenant_request() in pattern_c_hybrid_router_and_migrator.py | Deterministic sub-millisecond tier routing and catalog isolation |
| **Step ③** • Standard Pool Dispatch | Shared Cloud Run Gen2 & AlloyDB RLS (Yellow Zone) | Routes Standard-tier tenants to the shared pooled runtime with 90% shared `ContextCacheConfig` caching, 120 RPM quota, and 4,000 thinking token cap. | pool://cymbal-shared-pooled-runtime-v2 | Preserves 85–90% COGS savings for high-volume commercial tenants |
| **Step ④** • Enterprise PSC Dispatch | Hub VPC (`cymbal-pattern-c-hub-vpc`) & PSC NAT (Red Zone) | Routes Enterprise tenants via Direct VPC Egress and `cymbal-psc-nat-us-west1` (`10.240.0.0/28`) to the spoke’s `ServiceAttachment` without public IPs. | psc://projects/.../serviceAttachments/{tenant}-agent-spoke-psc | Unidirectional hub-to-spoke connectivity with zero CIDR overlap |
| **Step ⑤** • Phase 1: SHADOW_SYNC | Live Tier Migrator (`execute_zero_downtime_tier_upgrade`) (Green Zone) | Provisions the target Enterprise spoke project, CMEK key, and PSC attachment while streaming the tenant’s L4 Memory Bank and RLS rows to `0ms` replication lag. | Phase 1 SHADOW_SYNC • Background State Replication | 100% of active session history replicated without pausing user traffic |
| **Step ⑥** • Phase 2: ATOMIC_CUTOVER | Firestore Atomic Pointer Flip (Blue & Green Zones) | Atomically updates the tenant’s instance-scoped profile (`tier: STANDARD → ENTERPRISE`, `thinking_budget: 4000 → 8000`, `target: pool:// → psc://`). | Phase 2 ATOMIC_CUTOVER • Instance-Scoped Profile Mutation | Verified F-09: Sub-50ms cutover with zero global state bleed across instances |
| **Step ⑦** • Phase 3: DRAIN_AND_VERIFY | Promoted PSC Spoke (`cymbal-retailstream-silo-prod`) (Red Zone) | Drains in-flight pooled requests cleanly while routing the next turn of the active `session_id` to the new CMEK-encrypted PSC spoke. | Phase 3 DRAIN_AND_VERIFY • run_tier_migration_suite.py (4/4 PASS) | Verified 4/4 tests: 0 dropped sessions, 8,000 budget unlocked, CMEK active |
| **Cost & Audit** • Blended Tier Chargeback | BigQuery OTel (`pattern_c_hybrid_psc_Spoke_telemetry`) (Green Zone) | Streams real-time telemetry tagged with `routing_plane` (`POOLED` vs `PSC_SPOKE`) and `migration_phase` into BigQuery for tiered invoicing. | BigQuery Hybrid FinOps & Migration Audit Sink | Verified live in BigQuery: $0.0079/turn hybrid telemetry recorded |

### Diagram 12: Pattern C Demo Environment: Central Ingress Hub, Shared Pool & PSC Service Attachment Spokes (`ws4-hub-and-spoke-demo-env-setup-topology`)
* **Workstream & Focus**: Workstream 4 • Pattern C: Hub-and-Spoke Demo Environment & PSC ServiceAttachment Topology (WS 4.2) (`PATTERN C • PSC HUB & SPOKE`)
* **Question Answered**: *How do we wire a central multi-tenant Hub VPC to dozens of isolated Enterprise Spoke VPCs using Google Cloud Private Service Connect (PSC) Service Attachments so spokes can reuse overlapping CIDRs (`10.40.0.0/20`) and never initiate reverse traffic into the hub?*
* **Architectural & Business Outcome (Unidirectional Private Service Connect Bridging with Zero CIDR Overlap)**: Every Enterprise spoke can use the exact same internal IP CIDR (`10.40.0.0/20`) without VPC peering limits or IP collisions, and because PSC is NAT-based and unidirectional, a spoke can never initiate a reverse connection back into the central hub.

#### 4-Zone Hub-and-Spoke Architecture Summary
* **Blue Zone — 1. Central Hub Project (`cymbal-hybrid-hub-prod`)**: Hosts the Global ALB + Cloud Armor + IAP ingress, the Cloud Run Hybrid Router, and the Hub VPC (`10.10.0.0/20`).
* **Green Zone — 2. Consumer PSC Endpoint & Accept-List Control**: Reserves internal Hub IP `10.10.0.50` (`psc-consumer-finvault`) and enforces explicit `ACCEPT_MANUAL` consumer project allow-lists.
* **Yellow Zone — 3. Shared Pool & `/28` PSC NAT Translation**: Runs the Standard-tier shared pool and translates hub-to-spoke packets across the dedicated `PRIVATE_SERVICE_CONNECT` NAT subnet.
* **Red Zone — 4. Producer Enterprise Spoke (`10.40.0.0/20`)**: Publishes the spoke’s Internal Load Balancer via `finvault-agent-spoke-psc` (`ServiceAttachment`) inside the tenant’s VPC-SC perimeter.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Unified Ingress at Central Hybrid Hub Project** (*Caller → Blue Zone (Hub Ingress)*): Traffic arrives at the central hub project (`cymbal-hybrid-hub-prod`). Global External ALB, Cloud Armor, and IAP authenticate the caller and forward the signed context to the Cloud Run Hybrid Router. **(cymbal-hybrid-hub-prod • Global ALB, Cloud Armor & IAP)**
1. **Step ② — Resolving Tenant Target (`pool://` vs. `psc://`)** (*Blue Zone (Route Table & Registry)*): The router queries Firestore and the cross-project Vertex AI Agent Engine registry: Standard tenants resolve to `pool://cymbal-shared-pooled-runtime-v2`, while Enterprise tenants resolve to their internal PSC IP (`10.10.0.50`). **(Firestore Route Table • Internal PSC IP (`10.10.0.50`))**
1. **Step ③ — Routing to the Hub Consumer PSC Forwarding Rule** (*Blue → Green Zone (Consumer PSC)*): For FinVault (Enterprise), the Cloud Run router sends the request via Direct VPC Egress into `cymbal-pattern-c-hub-vpc` (`10.10.0.0/20`) to the reserved internal forwarding rule `psc-consumer-finvault` (`10.10.0.50`). **(cymbal-pattern-c-hub-vpc • psc-consumer-finvault (`10.10.0.50`))**
1. **Step ④ — Verifying `ACCEPT_MANUAL` Consumer Project Allow-List** (*Green & Red Zones (Handshake)*): The spoke’s `ServiceAttachment` (`finvault-agent-spoke-psc`) checks its `consumer_accept_lists` to confirm that `cymbal-hybrid-hub-prod` is explicitly authorized (with a connection limit of `10`). **(ServiceAttachment (`ACCEPT_MANUAL`) • Consumer Allow-List)**
1. **Step ⑤ — Source NAT Translation Across `/28` PSC Subnet** (*Yellow Zone (PSC NAT Subnet)*): Google Cloud Private Service Connect translates the packet’s source IP using the dedicated `PRIVATE_SERVICE_CONNECT` NAT subnet (`cymbal-psc-nat-us-west1`), allowing every spoke to reuse `10.40.0.0/20` with zero IP collisions. **(cymbal-psc-nat-us-west1 (`10.240.0.0/28` / `10.40.240.0/24`))**
1. **Step ⑥ — Executing in Spoke ILB, Agent Runtime & CMEK DB** (*Red Zone (Unidirectional Spoke)*): The translated packet reaches the spoke’s Internal Application Load Balancer, invoking the dedicated Vertex AI Agent Engine runtime and CMEK AlloyDB. Because PSC is unidirectional, the spoke cannot initiate connections back to the hub. **(Unidirectional Producer Spoke • Internal ALB & CMEK AlloyDB)**
1. **Step ⑦ — Private Backbone Return & Verification Check** (*Red → Blue & Green Zones*): The response returns over the established PSC session to the hub router, passes final egress SDP checks, and completes the 4-test hybrid routing and live upgrade verification suite. **(Zero-Public-IP PSC Return • 4/4 Hybrid Verification Suite)**
1. **Outcome — Unidirectional Private Service Connect Bridging with Zero CIDR Overlap** (*Architectural & Business Outcome*): Every Enterprise spoke can use the exact same internal IP CIDR (`10.40.0.0/20`) without VPC peering limits or IP collisions, and because PSC is NAT-based and unidirectional, a spoke can never initiate a reverse connection back into the central hub. **(PATTERN C • PSC HUB & SPOKE)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Hub VPC (`cymbal-pattern-c-hub-vpc`) • Consumer PSC Forwarding Rule (`10.10.0.50`) • PSC `/28` NAT Subnet (`cymbal-psc-nat-us-west1`) • Producer `ServiceAttachment` • Internal ALB
* **Architecture Summary**: Connects the central Hub VPC (`10.10.0.0/20`) to isolated Enterprise Spoke VPCs (`10.40.0.0/20`) via Consumer PSC Forwarding Rules (`10.10.0.50`) bound to Producer `ServiceAttachment` resources (`ACCEPT_MANUAL`) backed by `/28` PSC NAT subnets.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Hub VPC Foundation | Cloud VPC (`cymbal-pattern-c-hub-vpc`) (Blue Zone) | Provisions the central Hub VPC and `10.10.0.0/20` subnet (`Private Google Access` enabled) hosting Direct VPC Egress from the Cloud Run Hybrid Router. | workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md | Verified live in `nitina-ggarwal-sandbox-647724`: `cymbal-pattern-c-hub-vpc` |
| **Step ②** • Consumer PSC IP & Rule | Consumer Forwarding Rule (`10.10.0.50`) (Blue & Green Zones) | Reserves internal IP `psc-endpoint-finvault-ip` (`10.10.0.50`) in the hub subnet and binds `psc-consumer-finvault` to the target spoke `ServiceAttachment` URI. | google_compute_address & google_compute_forwarding_rule | Hub router addresses the spoke via a private local IP (`10.10.0.50`) |
| **Step ③** • Dedicated PSC NAT Subnet | PSC NAT Subnet (`cymbal-psc-nat-us-west1`) (Yellow Zone) | Allocates a dedicated subnet with `--purpose=PRIVATE_SERVICE_CONNECT` (`10.240.0.0/28` / `10.40.240.0/24`) exclusively for PSC packet NAT translation. | Verified Live Subnet `cymbal-psc-nat-us-west1` (`10.240.0.0/28`) | 100+ Enterprise spokes can reuse `10.40.0.0/20` with 0 CIDR conflicts |
| **Step ④** • Producer ServiceAttachment | Compute ServiceAttachment (`finvault-agent-spoke-psc`) (Red Zone) | Publishes the spoke’s Internal Load Balancer with `connection_preference = ACCEPT_MANUAL` and `consumer_accept_lists` restricted to the Hub project. | google_compute_service_attachment.spoke_psc_producer | Unauthorized GCP projects are rejected at the Andromeda SDN layer |
| **Step ⑤** • Unidirectional Security | Google Andromeda SDN Data Plane (Yellow → Red Zone) | Allows only hub-initiated request flows across the ServiceAttachment; any spoke-initiated packet targeting the hub VPC is dropped at the hypervisor. | Unidirectional PSC State Machine | Compromised spoke environment can never pivot into the central hub |
| **Step ⑥** • Cross-Project Registry | Federated Vertex AI Agent Engine Catalog (Blue & Red Zones) | Maps `agent://finvault/private-agent-alpha-regulatory` in the hub catalog to the spoke’s PSC endpoint while hiding it from all Standard tenants. | Cross-Project Agent Descriptor Resolution | Unified agent discovery with physical spoke execution isolation |
| **Step ⑦** • In-Spoke CMEK Execution | Spoke Agent Runtime & CMEK AlloyDB (Red Zone) | Executes the agent inside the spoke’s VPC-SC perimeter with 8,000 thinking tokens and CMEK-encrypted AlloyDB/Memory Bank. | Dedicated Spoke Runtime & KMS CMEK Binding | Combines SaaS control-plane simplicity with Pattern B data sovereignty |
| **Cost & Audit** • PSC Connection Telemetry | Cloud Monitoring & BigQuery OTel (Green Zone) | Monitors `pscConnectionStatus = ACCEPTED`, active NAT port utilization, and per-spoke token economics in BigQuery. | PSC Health & Hybrid FinOps Dashboard | Sub-2ms PSC forwarding overhead with full audit visibility |

### Diagram 13: Zero-Downtime Tier Upgrade Test Sequence: SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY (4/4 PASS) (`ws4-zero-downtime-tier-upgrade-sequence`)
* **Workstream & Focus**: Workstream 4 • Pattern C: Zero-Downtime Live Tier Upgrade Sequence (WS 4.5) (`PATTERN C • ZERO-DOWNTIME UPGRADE`)
* **Question Answered**: *How do we promote a live customer (RetailStream Corp) from the Standard Pooled tier (`Pattern A`) into a dedicated Enterprise PSC Spoke (`Pattern B/C`) mid-conversation with 0ms replication lag, 0 dropped sessions, and zero global state bleed?*
* **Architectural & Business Outcome (3-Phase Live Tier Promotion (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) with 0 Dropped Sessions)**: RetailStream begins in the shared pool (`4,000` budget) during an active chat session, replicates state to its new CMEK spoke at `0ms` lag, flips its Firestore route atomically, and continues the exact same `session_id` in the dedicated PSC spoke (`8,000` budget).

#### 4-Zone Hub-and-Spoke Architecture Summary
* **Blue Zone — 1. Test 1 Baseline: Hybrid Router & Firestore**: Verifies pre-upgrade baseline: RetailStream routes to `POOLED_SHARED_RUNTIME` (`4,000` cap) while FinVault routes to `DEDICATED_PSC_SPOKE` (`8,000` cap).
* **Green Zone — 2. Tests 2 & 3: 3-Phase Live Migration Engine**: Executes `Phase 1: SHADOW_SYNC` (`0ms` lag, PSC `ACCEPTED`), `Phase 2: ATOMIC_CUTOVER` in Firestore, and `Phase 3: DRAIN_AND_VERIFY` (`0` dropped sessions).
* **Yellow Zone — 3. Source Plane: Shared Pooled Runtime**: Serves RetailStream’s initial chat turn (`sess-live-upgrade-99`), streams L4 Memory Bank and AlloyDB RLS rows to the spoke, and drains in-flight turns.
* **Red Zone — 4. Target Plane: RetailStream Dedicated PSC Spoke**: Test 4 Post-Cutover: serves the next turn of `sess-live-upgrade-99` in `cymbal-retailstream-silo-prod` with `8,000` thinking tokens and dedicated CMEK.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Baseline Dual-Tenant Routing Verification** (*Test 1 Baseline → Blue & Yellow Zones*): In Test 1, RetailStream (`sess-live-upgrade-99`) routes to `pool://cymbal-shared-pooled-runtime-v2` with thinking clamped from 6,000 to `4,000` tokens, while FinVault routes via PSC (`psc://finvault-agent-spoke-psc`) with `8,000` tokens. **(Test 1 PASS • Baseline Pooled (4k) vs. PSC Spoke (8k))**
1. **Step ② — Provisioning Target Spoke, CMEK & PSC Handshake** (*Green & Red Zones (Phase 1 Setup)*): When RetailStream upgrades to Enterprise, Phase 1 (`SHADOW_SYNC`) provisions `cymbal-retailstream-silo-prod`, creates `retailstream-kr/agent-memory-cmek`, and verifies `psc_connection_status = ACCEPTED`. **(Phase 1a • Spoke Project, CMEK & PSC Handshake (`ACCEPTED`))**
1. **Step ③ — Background Shadow Sync to 0ms Replication Lag** (*Yellow → Red Zone (Phase 1 Sync)*): While RetailStream employees continue chatting in the shared pool without interruption, Phase 1 streams RetailStream’s L4 Memory Bank namespaces and AlloyDB RLS rows into the new CMEK spoke until `replication_lag_ms == 0.0`. **(Phase 1b (`SHADOW_SYNC`) • `replication_lag_ms = 0.0`)**
1. **Step ④ — Atomic Firestore Routing & Entitlement Flip** (*Blue & Green Zones (Phase 2 Cutover)*): In Phase 2 (`ATOMIC_CUTOVER`), a single atomic update flips RetailStream’s instance-scoped routing record: `tier: STANDARD → ENTERPRISE`, `thinking_budget_cap: 4000 → 8000`, and `target_uri: pool:// → psc://retailstream-agent-spoke-psc`. **(Phase 2 (`ATOMIC_CUTOVER`) • Atomic Pointer & Quota Flip)**
1. **Step ⑤ — Graceful In-Flight Session Drain (0 Dropped)** (*Yellow & Green Zones (Phase 3 Drain)*): In Phase 3 (`DRAIN_AND_VERIFY`), any turn already mid-inference in the shared pool finishes normally before the pooled worker slot closes, guaranteeing `dropped_sessions == 0`. **(Phase 3 (`DRAIN_AND_VERIFY`) • `dropped_sessions = 0`)**
1. **Step ⑥ — Seamless Next Turn in Dedicated PSC Spoke** (*Red Zone (Test 4 Post-Cutover)*): In Test 4, the very next message on the exact same live session (`sess-live-upgrade-99`) routes automatically over `DEDICATED_PSC_SPOKE` to `cymbal-retailstream-silo-prod` with `6,000` unclamped thinking tokens and active CMEK. **(Test 4 PASS • Same `session_id` Served by New PSC Spoke)**
1. **Step ⑦ — Instance-Scoped Isolation & Zero Global State Bleed** (*All Zones → Forensic Gate (F-09)*): Forensic check `F-09` verifies that mutating RetailStream’s tier inside `engine.runtime.tenant_profiles` never mutates the global `TENANT_PROFILES` dictionary, ensuring 100% deterministic multi-instance test isolation. **(Forensic Check F-09 PASS • Zero Global State Bleed)**
1. **Outcome — 3-Phase Live Tier Promotion (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) with 0 Dropped Sessions** (*Architectural & Business Outcome*): RetailStream begins in the shared pool (`4,000` budget) during an active chat session, replicates state to its new CMEK spoke at `0ms` lag, flips its Firestore route atomically, and continues the exact same `session_id` in the dedicated PSC spoke (`8,000` budget). **(PATTERN C • ZERO-DOWNTIME UPGRADE)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Cloud Run Hybrid Router • Firestore Atomic Routing Table • Private Service Connect (PSC) • Cloud KMS CMEK • Vertex AI Memory Bank & AlloyDB Replication
* **Architecture Summary**: Executes a 3-phase live promotion state machine (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) validated by 4 automated assertion suites (`TEST 1`–`TEST 4`) with instance-scoped tenant profile isolation (`F-09`).

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Test 1: Baseline Routing | PatternCHybridRouterAndMigrator (Blue & Yellow Zones) | Verifies that RetailStream routes to `POOLED_SHARED_RUNTIME` (`budget=4000`) and FinVault routes to `DEDICATED_PSC_SPOKE` (`budget=8000`) prior to upgrade. | run_tier_migration_suite.py • TEST 1 Baseline Check | Verified TEST 1 PASS: Dual-tier routing and token clamping confirmed |
| **Step ②** • Phase 1: SHADOW_SYNC | AlloyDB/Memory Bank Replicator & PSC (Yellow → Red Zone) | Streams RetailStream’s L4 episodic memory and AlloyDB RLS rows into `cymbal-retailstream-silo-prod` under CMEK encryption until `replication_lag_ms == 0.0`. | execute_zero_downtime_tier_upgrade() • SHADOW_SYNC | Verified TEST 2 PASS: `replication_lag_ms = 0.0` & `psc = ACCEPTED` |
| **Step ③** • Phase 2: ATOMIC_CUTOVER | Firestore Routing Table (`tenant_routing_table`) (Blue Zone) | Atomically commits the new `TenantRoutingRecord` (`tier=ENTERPRISE`, `routing_plane=DEDICATED_PSC_SPOKE`, `thinking_budget_cap=8000`, `cmek_key_uri`). | execute_zero_downtime_tier_upgrade() • ATOMIC_CUTOVER | Verified TEST 3 PASS: Atomic pointer flip with zero half-migrated state |
| **Step ④** • Phase 3: DRAIN_AND_VERIFY | Cloud Run Connection Drainer (Yellow & Green Zones) | Allows in-flight HTTP/gRPC streams on the pooled revision to complete before retiring the pooled route pointer (`dropped_sessions = 0`). | execute_zero_downtime_tier_upgrade() • DRAIN_AND_VERIFY | Verified `dropped_sessions == 0` and `migration_state == COMPLETED_LIVE` |
| **Step ⑤** • Test 4: Live Session Continuity | Promoted PSC Spoke (`cymbal-retailstream-silo-prod`) (Red Zone) | Reuses active `session_id="sess-live-upgrade-99"` immediately post-cutover, routing over `retailstream-agent-spoke-psc` with `6,000` unclamped thinking tokens. | run_tier_migration_suite.py • TEST 4 Post-Cutover Check | Verified TEST 4 PASS: Active chat continues seamlessly in dedicated spoke |
| **Step ⑥** • F-09: Instance Isolation | CymbalMultiTenantRuntime (`self.tenant_profiles`) (Green Zone) | Deep-copies `TENANT_PROFILES` per runtime instance so live tier promotions mutate only the active runtime instance without polluting global module state. | core-cymbal-agent/runtime_pipeline.py (F-09 Certified) | Verified F-09 PASS: Global `TENANT_PROFILES["retailstream"]` remains `STANDARD` |
| **Step ⑦** • CMEK & RPM Promotion | Cloud KMS & Memorystore Bulkhead (Green & Red Zones) | Upgrades RetailStream’s rate bulkhead from `120` RPM to `600` RPM and binds `retailstream-kr/cryptoKeys/agent-memory-cmek` on every subsequent turn. | Promoted Enterprise Profile Enforcement | Full Enterprise SLA and customer key custody active immediately |
| **Cost & Audit** • Migration Lineage Receipt | BigQuery OTel & Cloud Audit Logs (Green Zone) | Logs the 3-phase migration receipt (`SHADOW_SYNC`, `ATOMIC_CUTOVER`, `DRAIN_AND_VERIFY`) and transitions FinOps chargeback to the Enterprise tier. | 4/4 Tier Migration Verification Receipt | Turns Standard → Enterprise upsells into a 1-click zero-downtime feature |

### Diagram 14: Terraform Hybrid PSC Blueprint Resource Graph: Hub VPC → Consumer PSC Endpoint → Producer ServiceAttachment in Enterprise Spoke (`ws4-terraform-hybrid-psc-blueprint-resource-graph`)
* **Workstream & Focus**: Workstream 4 • Pattern C: Dual-Provider Terraform Hybrid PSC Blueprint Graph (WS 4.6) (`PATTERN C • TERRAFORM PSC DAG`)
* **Question Answered**: *How do we codify both sides of the Pattern C Hybrid Hub-and-Spoke network—the central `google.hub` consumer VPC/endpoint and the isolated `google.spoke` producer VPC, `/24` PSC NAT subnet, and `ServiceAttachment`—in a single Terraform blueprint?*
* **Architectural & Business Outcome (Dual-Provider Terraform Blueprint Wires Hub-to-Spoke PSC in 5 Minutes)**: A single declarative Terraform module provisions both the Producer Spoke (`ServiceAttachment` + PSC NAT subnet) and the Consumer Hub (`10.10.0.50` forwarding rule), outputting the exact URIs needed by the Firestore tenant routing table.

#### 4-Zone Hub-and-Spoke Architecture Summary
* **Blue Zone — 1. Provider `google.hub`: Central Hub VPC**: Provisions `google_compute_network.hub_vpc` (`cymbal-hybrid-hub-vpc`) and `google_compute_subnetwork.hub_subnet` (`10.10.0.0/20`).
* **Green Zone — 2. Consumer Bridge & Firestore Outputs**: Reserves internal IP `10.10.0.50`, binds `google_compute_forwarding_rule.psc_consumer_endpoint`, and exports `spoke_service_attachment_uri`.
* **Yellow Zone — 3. Provider `google.spoke`: Spoke VPC & PSC NAT**: Provisions `google_compute_network.spoke_vpc` (`10.40.0.0/20`) and `google_compute_subnetwork.spoke_psc_nat_subnet` (`purpose = PRIVATE_SERVICE_CONNECT`).
* **Red Zone — 4. Producer `ServiceAttachment` (`ACCEPT_MANUAL`)**: Publishes the spoke’s Internal Load Balancer via `google_compute_service_attachment.spoke_psc_producer`, allow-listing `hub_project_id` (`limit = 10`).

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Initializing `google.hub` and `google.spoke` Providers** (*Terraform CLI → Dual Providers*): Engineers set 5 input variables (`hub_project_id`, `spoke_project_id`, `tenant_id`, `region`, `spoke_ilb_forwarding_rule_uri`) in `terraform.tfvars` to drive both the hub and spoke Google Cloud providers simultaneously. **(4.6-terraform-hybrid-psc-blueprint/variables.tf & tfvars)**
1. **Step ② — Provisioning the Central Hybrid Hub VPC (`10.10.0.0/20`)** (*Blue Zone (`google.hub` Network)*): Using `provider = google.hub`, Terraform creates `cymbal-hybrid-hub-vpc` and `cymbal-hybrid-hub-subnet` (`10.10.0.0/20`) with `private_ip_google_access = true` to host the Cloud Run Hybrid Router. **(google_compute_network.hub_vpc & hub_subnet (`10.10.0.0/20`))**
1. **Step ③ — Provisioning the Isolated Enterprise Spoke VPC (`10.40.0.0/20`)** (*Yellow Zone (`google.spoke` Network)*): In parallel, using `provider = google.spoke`, Terraform creates `cymbal-{tenant}-spoke-vpc` and its primary workload subnet (`10.40.0.0/20`) inside the tenant’s dedicated spoke project. **(google_compute_network.spoke_vpc & spoke_subnet (`10.40.0.0/20`))**
1. **Step ④ — Allocating the Dedicated `PRIVATE_SERVICE_CONNECT` NAT Subnet** (*Yellow Zone (PSC NAT Subnet)*): Terraform provisions `google_compute_subnetwork.spoke_psc_nat_subnet` (`10.40.240.0/24` / `10.240.0.0/28`) with `purpose = "PRIVATE_SERVICE_CONNECT"` so packets entering from the hub undergo source NAT. **(spoke_psc_nat_subnet (`purpose = PRIVATE_SERVICE_CONNECT`))**
1. **Step ⑤ — Publishing the Producer `ServiceAttachment` (`ACCEPT_MANUAL`)** (*Red Zone (Producer Attachment)*): Terraform creates `google_compute_service_attachment.spoke_psc_producer`, binding the spoke’s Internal Load Balancer, attaching the PSC NAT subnet, and allow-listing `var.hub_project_id` (`connection_limit = 10`). **(google_compute_service_attachment (`ACCEPT_MANUAL`))**
1. **Step ⑥ — Binding the Hub Consumer Endpoint (`10.10.0.50`)** (*Green Zone (Consumer Forwarding Rule)*): Once the producer `ServiceAttachment` exists, `provider = google.hub` reserves internal IP `10.10.0.50` (`psc_endpoint_ip`) and creates `google_compute_forwarding_rule.psc_consumer_endpoint` pointing directly to `spoke_psc_producer.id`. **(google_compute_forwarding_rule (`10.10.0.50` → Spoke URI))**
1. **Step ⑦ — Exporting PSC URI & Hub IP to Firestore Route Table** (*Green → Blue Zone (Firestore Sync)*): Terraform emits `spoke_service_attachment_uri` and `hub_psc_endpoint_ip` (`10.10.0.50`), which register directly in the central Firestore tenant routing table for zero-downtime cutover. **(Terraform Outputs → Firestore `tenant_routing_table`)**
1. **Outcome — Dual-Provider Terraform Blueprint Wires Hub-to-Spoke PSC in 5 Minutes** (*Architectural & Business Outcome*): A single declarative Terraform module provisions both the Producer Spoke (`ServiceAttachment` + PSC NAT subnet) and the Consumer Hub (`10.10.0.50` forwarding rule), outputting the exact URIs needed by the Firestore tenant routing table. **(PATTERN C • TERRAFORM PSC DAG)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Terraform Dual Provider (`google.hub` & `google.spoke`) • Hub VPC (`10.10.0.0/20`) • Spoke VPC (`10.40.0.0/20`) • PSC NAT Subnet (`10.40.240.0/24`) • `ServiceAttachment` • Consumer `ForwardingRule` (`10.10.0.50`)
* **Architecture Summary**: Uses two Terraform provider aliases (`google.hub` and `google.spoke`) parameterized by 5 variables to provision the Hub VPC, Spoke VPC, PSC NAT subnet, Producer `ServiceAttachment`, and Consumer `ForwardingRule` (`10.10.0.50`) in one run.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Dual-Alias Providers | Terraform `google.hub` & `google.spoke` (Blue & Yellow Zones) | Declares two scoped Google provider configurations in `main.tf` so cross-project PSC producer and consumer resources deploy atomically. | workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf | Eliminates multi-team manual ticket handoffs during spoke onboarding |
| **Step ②** • Hub VPC & Subnet | Cloud VPC (`cymbal-hybrid-hub-vpc` / `10.10.0.0/20`) (Blue Zone) | Provisions the central Hub VPC network and regional subnet with Private Google Access for the Cloud Run Hybrid Router. | main.tf • google_compute_network.hub_vpc | Verified live in `nitina-ggarwal-sandbox-647724`: `cymbal-pattern-c-hub-vpc` |
| **Step ③** • Spoke VPC & Subnet | Spoke VPC (`cymbal-{tenant}-spoke-vpc` / `10.40.0.0/20`) (Yellow Zone) | Provisions the tenant’s isolated spoke VPC using a standardized `10.40.0.0/20` CIDR block that can be repeated across every Enterprise tenant. | main.tf • google_compute_network.spoke_vpc | Zero IP CIDR coordination required across 100+ Enterprise tenants |
| **Step ④** • PSC NAT Subnet | PSC Subnet (`cymbal-psc-nat-us-west1`) (Yellow Zone) | Creates the dedicated `PRIVATE_SERVICE_CONNECT` NAT subnet required by Google Cloud to translate consumer packets into the spoke VPC. | main.tf • google_compute_subnetwork.spoke_psc_nat_subnet | Verified live in `nitina-ggarwal-sandbox-647724`: `cymbal-psc-nat-us-west1` |
| **Step ⑤** • Producer Attachment | Compute ServiceAttachment (`{tenant}-agent-spoke-psc`) (Red Zone) | Exposes `var.spoke_ilb_forwarding_rule_uri` over PSC with `ACCEPT_MANUAL` preference and explicit `consumer_accept_lists` pinned to `var.hub_project_id`. | main.tf • google_compute_service_attachment.spoke_psc_producer | Strict mutual project authentication at the network attachment layer |
| **Step ⑥** • Consumer Endpoint IP | Internal Address (`10.10.0.50`) & ForwardingRule (Green Zone) | Reserves `10.10.0.50` in the Hub subnet and creates the consumer PSC forwarding rule bound to `spoke_psc_producer.id` (`load_balancing_scheme = ""`). | main.tf • google_compute_forwarding_rule.psc_consumer_endpoint | Establishes a one-way private bridge with zero public internet exposure |
| **Step ⑦** • Firestore Route Outputs | Terraform Outputs (`spoke_service_attachment_uri`) (Green Zone) | Exports the provisioned ServiceAttachment URI and internal Hub IP so `PatternCHybridRouterAndMigrator` can cut over traffic immediately. | outputs.tf / main.tf • Firestore Routing Integration | Ready for immediate Phase 2 `ATOMIC_CUTOVER` in under 5 minutes |
| **Cost & Audit** • IaC Hygiene Certification | Forensic Gate F-10 (`run_deep_forensic_audit.py`) (Green Zone) | Verifies that `main.tf`, `variables.tf`, `README.md`, and `terraform.tfvars.example` are complete and match live GCP resource state. | Forensic Check F-10 PASS | 100% turnkey Infrastructure-as-Code across all 3 architecture patterns |

<!-- E2E_FLOW_END -->
