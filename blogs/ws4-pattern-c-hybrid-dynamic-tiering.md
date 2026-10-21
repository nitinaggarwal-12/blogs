---
title: "Multi-tenant agentic AI system: Pattern C dynamic hybrid routing and zero-downtime tier upgrades"
subtitle: "Route Standard tenants to a shared pool and Enterprise tenants over Private Service Connect to isolated CMEK spokes from one unified control plane—with live 0-dropped-turn tier migration"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 4 of 5"
workstream: "Workstream 4 • Pattern C — Dynamic Hybrid Hub-and-Spoke Architecture"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Cloud Architects, Platform Product Managers, and FinOps Leads operating tiered B2B SaaS on Google Cloud"
reading_time: "13 min read"
tags: ["Pattern C","Hybrid Architecture","Private Service Connect","Hub-and-Spoke","Zero-Downtime Migration","Vertex AI Agent Engine","ADK","CMEK","AlloyDB RLS","FinOps","Multi-Tenancy"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws4-pattern-c-hybrid-psc-and-migration","ws4-hub-and-spoke-demo-env-setup-topology","ws4-zero-downtime-tier-upgrade-sequence","ws4-terraform-hybrid-psc-blueprint-resource-graph"]
editable_slides: "slides/ws4-pattern-c-hybrid-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Pattern C dynamic hybrid routing and zero-downtime tier upgrades

This document describes **Pattern C (Dynamic Hybrid Hub-and-Spoke Architecture)** for building and operating a multi-tiered agentic AI SaaS platform on Google Cloud. Pattern C combines the high-density unit economics of [Pattern A (Pooled Architecture)](ws2-pattern-a-pooled-architecture.md) with the physical project and encryption isolation of [Pattern B (Sovereign Silos)](ws3-pattern-b-sovereign-silos.md) behind a single unified control plane (`cymbal-hybrid-hub-prod`). A tenant-aware [Cloud Run](https://cloud.google.com/run/docs) router directs Standard-tier customers to a shared pooled runtime while bridging regulated Enterprise-tier customers across [Private Service Connect (PSC)](https://cloud.google.com/vpc/docs/private-service-connect) into dedicated CMEK-encrypted spoke projects.

This document is part 4 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (introduced in [Part 1: Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)). It also details a **3-phase zero-downtime tier migration engine** that promotes a live customer from the shared pool into a dedicated PSC spoke with **zero dropped turns**.

> **Key point:** Pattern C eliminates the need to maintain separate SaaS products for Standard and Enterprise tiers. All customers connect to one SaaS URL, authenticate through one Hop 1 gateway, and run on the same **80% reusable 5-Hop agent core**—while upgrading from the shared pool to a dedicated PSC spoke requires only a single atomic Firestore route flip (`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY`).

## Use cases

Pattern C is the recommended production architecture for multi-tiered B2B SaaS platforms ([4.1 Case Study & Solution Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)):

- **Tiered SaaS product packaging (Standard vs Enterprise):** Offer a low-cost self-service Standard tier on shared pooled infrastructure alongside a premium Enterprise tier with dedicated Google Cloud projects and customer-managed encryption keys—without maintaining two separate codebases or URLs.
- **Land-and-expand customer lifecycle with live upgrades:** Onboard new logos into the shared pool in seconds (**RetailStream Corp** at `120 RPM Pool` floor) and promote them live into a dedicated PSC spoke (`600 RPM Silo` spoke floor) when they sign an Enterprise expansion contract, with **zero downtime and zero lost chat history**.
- **Cross-project private agent federation:** Allow Enterprise customers (**FinVault Bank**) to run private custom agents (`Agent Alpha` on Dedicated Provisioned Throughput `gemini-2.5-pro-dedicated`) inside their isolated spoke while surfacing those agents seamlessly through the unified SaaS UI.

## Design alternatives

### VPC Network Peering vs Private Service Connect (PSC) for hub-to-spoke connectivity

A critical architectural decision in Pattern C is how the central routing hub communicates with dozens or hundreds of isolated Enterprise tenant projects ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)):

| Networking dimension | Traditional VPC Network Peering | Private Service Connect (PSC) (`ServiceAttachment`) |
| :--- | :--- | :--- |
| **Scale & quota limits** | Caps out at 25 peered VPC networks per hub VPC | Scales to **hundreds of Enterprise tenant spokes** per hub VPC |
| **IP address management** | Requires globally non-overlapping CIDR blocks across all tenants | **NAT-based (`/28` `10.240.0.0/28`):** every spoke can reuse the exact same `10.40.0.0/20` CIDR |
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

## Architecture

The following diagram shows the Pattern C dynamic hybrid hub-and-spoke architecture, connecting the central routing and governance hub to both the shared pooled runtime and dedicated Enterprise Private Service Connect (PSC) spokes:

![Figure 1 — Pattern C: Dynamic hybrid hub-and-spoke architecture, Private Service Connect (PSC) spokes, and live tier migration](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.png)

*Figure 1. Official Google Cloud Architecture Center hub-and-spoke topology showing the Unified Hybrid Routing Hub (`cymbal-hybrid-hub-prod`), Federated Agent Catalog & Migration Control Hub, Shared Pooled Runtime Spoke (Standard Tier), and Dedicated Enterprise PSC Spoke (`cymbal-finvault-silo-prod` / promoted `cymbal-retailstream-spoke-prod`). Editable assets: [Draw.io source](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-pattern-c-hybrid-psc-and-migration.svg) | [Vision AST](../diagrams/vision_metadata/ws4-pattern-c-hybrid-psc-and-migration.vision.json).*

Figure 1 organizes the hybrid platform across four functional zones:

- **Unified Hybrid Routing and Identity Hub (`cymbal-hybrid-hub-prod`) (Zone 1 — Blue container `#aecbfa`):** Terminates all Standard and Enterprise traffic at one External Application Load Balancer, strips forged headers in Cloud Armor, verifies OIDC/Entra JWTs in IAP (`Hop 1`), and queries the Firestore Route Table in the Cloud Run Hybrid Router to dispatch turns to `pool://` or `psc://`.
- **Federated Agent Catalog, KMS, and Live Migration Hub (Zone 2 — Green container `#ceead6`):** Synchronizes private spoke agent descriptors (`Agent Alpha`) into the hub's Discovery Engine Catalog PDP (`Hop 2`), orchestrates the 3-phase Zero-Downtime Tier Migration Engine (`pattern_c_hybrid_router_and_migrator.py`), and aggregates cross-tier BigQuery FinOps telemetry (`Hop 5`).
- **Shared Pooled Runtime Spoke (Standard Tier — `pool://`) (Zone 3 — Left amber container `#feefc3`):** Serves Standard-tier tenants (`RetailStream Corp` prior to upgrade) inside the shared Vertex AI Agent Engine runtime (`4,000` token cap, `120 RPM`) with 90% shared `ContextCacheConfig` savings and shared AlloyDB RLS.
- **Dedicated Enterprise PSC Spoke (`psc://10.10.0.50/...`) (Zone 4 — Right coral container `#fad2cf`):** Serves Enterprise tenants (`FinVault Bank` and upgraded `RetailStream Corp`) across unidirectional Private Service Connect (`ServiceAttachment`) inside a dedicated VPC-SC perimeter with `8,000` thinking-token budgets, dedicated CMEK AlloyDB, and private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput).

The numbered callouts in Figure 1 trace dynamic tier routing and cross-project PSC execution:

1. **Unified SaaS request:** Standard and Enterprise customers send HTTPS requests to the same public Cymbal SaaS hostname.
2. **Hop 1 — Cryptographic identity verification and Firestore route lookup:** IAP and the Edge PEP derive `ctx.tenant_id` from the JWT and look up the tenant's active route (`PATTERN_C_HYBRID_POOL` vs `PATTERN_C_HYBRID_PSC_SPOKE`) in Firestore.
3. **Hop 2 — Federated Agent Catalog PDP and tool pruning:** The hub catalog resolves both shared pool agents and federated PSC spoke agents, blocking cross-tenant calls (`HTTP 403`) and pruning unauthorized MCP tools.
4. **Hop 4 (Pre-inference) — Model Armor and Cloud DLP inspection:** Prompts and tool arguments pass through inline injection and PII guardrails before traversing either the pool or the PSC forwarding rule.
5. **Hop 3 — Dynamic dispatch to Shared Pool (`pool://`) or PSC Spoke (`psc://`):** Standard tenants execute in the shared pool (`4,000` token cap); Enterprise tenants traverse the consumer PSC endpoint (`10.10.0.50`) into their dedicated spoke producer attachment (`8,000` token budget + CMEK verification).
6. **Hop 4 (Post-inference) — Output DLP and tier-scoped 3LO MCP execution:** Responses and 3LO MCP calls are validated against the caller's DPoP proof and semantic Natural Language Policy Compliance (`NLC`) rules.
7. **Hop 5 — Tier-isolated persistence and unified BigQuery FinOps chargeback:** Data persists in shared AlloyDB RLS (`SET LOCAL app.current_tenant_id` for Standard) or dedicated CMEK AlloyDB (Enterprise), while redacted OTel spans stream to the hub BigQuery ledger (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

### Cross-project Private Service Connect (PSC) network topology (Figure 2)

![Figure 2 — Pattern C: Hub-and-spoke VPC and Private Service Connect (PSC) NAT peering topology](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio.png)

*Figure 2. Cross-project network architecture (`workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md`) showing consumer PSC endpoints in `cymbal-hybrid-hub-prod` connecting to producer `ServiceAttachment` resources in isolated Enterprise spoke projects without CIDR overlap. Editable assets: [Draw.io source](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio) | [Google Slides (.pptx)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws4-hub-and-spoke-demo-env-setup-topology.svg) | [Vision AST](../diagrams/vision_metadata/ws4-hub-and-spoke-demo-env-setup-topology.vision.json).*

Figure 2 illustrates the network architecture detailed in [4.2 Hub-and-Spoke Demo Environment Setup](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md):

- **Hub VPC and Cloud Run Direct VPC Egress (`10.10.0.0/20`) (Zone 1 — Blue container `#aecbfa`):** Hosts the Cloud Run Hybrid Router with Direct VPC Egress to internal consumer PSC forwarding rules (`10.10.0.50`, `10.10.0.51`).
- **PSC Producer-Consumer Handshake and VPC-SC Ingress Bridge (Zone 2 — Green container `#ceead6`):** Enforces `ACCEPT_MANUAL` consumer accept lists on each spoke `ServiceAttachment` and binds VPC-SC ingress rules exclusively to the hub router service account.
- **FinVault Enterprise PSC Spoke (`10.40.0.0/20`) (Zone 3 — Left amber container `#feefc3`):** Dedicated spoke project publishing `finvault-agent-spoke-psc` in front of an Internal Application Load Balancer, Agent Engine runtime, and CMEK AlloyDB.
- **RetailStream Promoted Enterprise PSC Spoke (`10.40.0.0/20` reused) (Zone 4 — Right coral container `#fad2cf`):** Demonstrates non-overlapping CIDR reuse: because PSC uses source NAT (`/28` subnet `10.240.0.0/28`), every enterprise spoke can reuse `10.40.0.0/20` without IP exhaustion.

The seven numbered steps in Figure 2 trace packet flow across the Private Service Connect boundary:

1. **Ingress at hub External Application Load Balancer:** Traffic enters `cymbal-hybrid-hub-prod` over TLS 1.3 and passes Cloud Armor and IAP (`Hop 1`).
2. **Cloud Run Router resolves PSC target URI:** Firestore returns `psc://10.10.0.50/projects/cymbal-finvault-silo-prod/serviceAttachments/finvault-agent-spoke-psc`.
3. **Direct VPC Egress to consumer PSC forwarding rule:** The router sends the signed `CryptographicContext` to internal IP `10.10.0.50` inside the hub VPC.
4. **Unidirectional PSC NAT traversal into producer spoke:** Google Andromeda translates packet headers across the producer `ServiceAttachment` (`cymbal-psc-nat-us-west1`, `10.240.0.0/28`); the spoke cannot initiate reverse connections into the hub.
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
- **Spoke Provider (`google.spoke`) Sovereign Resources (Zone 4 — Right coral container `#fad2cf`):** Provisions isolated spoke VPCs, `cymbal-psc-nat-us-west1` (`/28` `10.240.0.0/28`) NAT subnets, Internal ALBs, spoke Agent Engine runtimes, and CMEK AlloyDB clusters.

The seven numbered steps in Figure 4 trace the multi-project Terraform deployment:

1. **Initialize `google.hub` and `google.spoke` Terraform providers:** Configure provider aliases targeting `cymbal-hybrid-hub-prod` and `cymbal-{tenant}-spoke-prod`.
2. **Provision hub VPC, Cloud Armor, IAP, and Shared Pool:** Deploy the shared Pattern A pool components inside the hub project.
3. **Provision spoke VPC, PSC NAT subnet, and Internal ALB:** Create the isolated spoke network and `/28` `PRIVATE_SERVICE_CONNECT` NAT subnet (`10.240.0.0/28`).
4. **Publish spoke `google_compute_service_attachment`:** Expose the spoke Internal ALB via a PSC producer attachment with `consumer_accept_lists` restricted to the hub project.
5. **Create hub `google_compute_forwarding_rule` PSC endpoint:** Bind a static internal IP (`10.10.0.50`) in the hub VPC to the spoke's `ServiceAttachment` URI.
6. **Deploy Cloud Run Hybrid Router and Firestore route table:** Configure the router with Direct VPC Egress and seed tenant routing rules.
7. **Run 4-point hybrid and live-migration test suite:** Execute `run_tier_migration_suite.py` to validate routing, catalog isolation, and zero-downtime promotion.

## Products used

Pattern C (Dynamic Hybrid Hub-and-Spoke Architecture) uses the following Google Cloud products across the central routing hub (`cymbal-hybrid-hub-prod`) and dedicated Enterprise PSC spoke projects:

### Dynamic routing, cross-project PSC networking, and live migration

- [Cloud Run](https://cloud.google.com/run/docs) with Direct VPC Egress: Hosts the stateless Tenant-Aware Hybrid Router (`pattern_c_hybrid_router_and_migrator.py`) that dispatches turns either to the local shared pool (`pool://`) or to consumer Private Service Connect endpoints (`psc://10.10.0.50`).
- [Private Service Connect (PSC)](https://cloud.google.com/vpc/docs/private-service-connect): Establishes unidirectional, NAT-translated (`/28` subnet `10.240.0.0/28`) private connectivity from hub consumer forwarding rules to producer `ServiceAttachment` resources in isolated Enterprise spoke projects—allowing every spoke to reuse identical VPC CIDRs (`10.40.0.0/20`).
- [Firestore](https://cloud.google.com/firestore/docs) and [Database Migration Service (DMS)](https://cloud.google.com/database-migration/docs): Store the sub-10ms atomic tenant routing table (`tenant_routing_table`) and stream continuous Change Data Capture (CDC) from the shared AlloyDB RLS pool into dedicated CMEK AlloyDB spokes during `SHADOW_SYNC`.

### Federated agent catalog, runtime tiers, and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Power both the shared Standard-tier runtime pool in the hub project and the isolated Enterprise-tier runtimes in each PSC spoke project.
- [Discovery Engine Agent Catalog](https://cloud.google.com/generative-ai-app-builder/docs): Federates spoke-private agent descriptors (`agent://finvault/private-agent-alpha-regulatory`) into the central Hop 2 Policy Decision Point while enforcing `HTTP 403 Forbidden` against unauthorized callers.
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Combines shared `ContextCacheConfig` (90% prefix discount) for Standard-tier pooled tenants with Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) in Enterprise spokes.

### Perimeter security, CMEK data spokes, and unified FinOps telemetry

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs), [Google Cloud Armor](https://cloud.google.com/armor/docs), and [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs): Provide a single unified SaaS ingress URL and Hop 1 DPoP-bound token exchange across all customer tiers.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs), [Cloud KMS](https://cloud.google.com/kms/docs), and [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): Combine shared `FORCE ROW LEVEL SECURITY` in the hub with per-spoke VPC-SC perimeters and customer-managed KMS encryption keys (`HTTP 423` kill-switch) in Enterprise spokes.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview), [Sensitive Data Protection](https://cloud.google.com/sensitive-data-protection/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Enforce bi-directional Hop 4 prompt/output guardrails and aggregate cross-tier OpenTelemetry FinOps spans in `cymbal_agentic_finops_otel.tenant_telemetry_spans`.

## Design considerations

This section provides guidance for operating Pattern C according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Index routing tables exclusively by cryptographically verified `tenant_id`:** In `route_and_invoke()`, always execute **Hop 1** (`hop1.authenticate_and_mint_context()`) before querying the Firestore route table so a client cannot spoof an HTTP header to route into another tenant's PSC spoke.
- **Scope tenant profiles per runtime instance:** Store `tenant_profiles` on `self._tenant_profiles` per runtime instance rather than mutating a global class dictionary, ensuring that promoting a tenant in one router instance never causes cross-instance state pollution.
- **Configure `ACCEPT_MANUAL` on all PSC ServiceAttachments:** Explicitly list only the hub project (`cymbal-hybrid-hub-prod`) in each spoke's `consumer_accept_lists` and set a connection limit to prevent unauthorized PSC attachment attempts.

### Reliability

- **Zero-downtime cutover via atomic Firestore transactions:** Perform all data synchronization (AlloyDB DMS CDC and Memory Bank dual-writes) during `SHADOW_SYNC` before flipping the single Firestore routing document in `ATOMIC_CUTOVER`.
- **Deterministic migration abort, rollback, and in-flight SSE/3LO session drain:**
  - *If `SHADOW_SYNC` parity verification fails* (for example, if DMS CDC lag exceeds threshold, row checksums mismatch, or the target spoke's Cloud KMS CMEK key returns `HTTP 423`), the migration controller aborts before `ATOMIC_CUTOVER`. Because the Firestore route document still points to `pool://`, the customer experiences zero disruption while dual-write buffers are discarded.
  - *If a user is mid-stream on a Server-Sent Events (SSE) turn or mid-redirect in an inline 3LO OAuth consent flow during `ATOMIC_CUTOVER`*, the active turn carries an immutable `route_epoch` lease pinned to the worker that initiated it. Phase 3 (`DRAIN_AND_VERIFY`) holds a 30-second drain window on the shared pool and synchronizes final OAuth token grants into the spoke vault before cryptographically purging the tenant's legacy rows from the shared AlloyDB table.

### Cost optimization

- **Blend pooled and sovereign unit economics (`Blended Hybrid Tier` floor):** Keep 80–90% of high-volume Standard customers in the shared pool (`120 RPM Pool` floor with 90% `ContextCacheConfig` savings) while provisioning dedicated PSC spokes (`600 RPM Silo`) only for high-ACV Enterprise contracts ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)).

### Operational excellence

- **Use dual-provider Terraform modules:** Manage the hub and spoke lifecycle in a single declarative graph using `google.hub` and `google.spoke` provider aliases ([4.6 Terraform Hybrid PSC Blueprint](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)).

### Performance optimization

- **Cache Firestore routing entries with pub/sub invalidation:** Cache active tenant route descriptors in local Cloud Run memory with a 5-second TTL and immediate Firestore watch invalidation so `ATOMIC_CUTOVER` propagates globally in under `10 ms`.



## Live Intra-Cloud (Google Cloud Console) & Inter-Cloud (10 Third-Party Enterprise Apps) Validation Proof — Pattern C (Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrade)

> **Dual-Plane Live Cloud & Stateful Execution Twin Verification (Pattern C (`Shared Control Hub` • `/28 PSC NAT` • `0-Drop Live Cutover`)):** Every architectural claim in **WS4** is verified across three live Google Cloud project tiers (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#887605034827`) and a **Dual-Plane Inter-Cloud Verification Harness** on AWS (`us-east-1`, Account `393036065405`): (1) **Side A — Commercial Vendor Control-Plane & AWS Bedrock AgentCore MCP Gateway** (`kiu8omh4aq`, Targets `KD6Z3SV8PX`..`TXGJHVFBWP`), and (2) **Side B — 10 Stateful Open-Source Data/RLS Execution Twins on AWS EC2** (`i-04924523ac41ff132`, `http://13.220.94.209:3001..3010`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`) so destructive cross-tenant red-team tests execute safely without polluting shared commercial SaaS tenants.

### Part I — Intra-Cloud (Google Cloud Console) Live Validation Screenshots (WS4)

![Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 1 — Live Google Cloud VPC Network (`cymbal-pattern-c-hub-vpc`) and `/28` Private Service Connect NAT Subnet (`cymbal-psc-nat-us-west1` `10.240.0.0/28`) bridging the Shared Control Hub to Enterprise Silo Spokes](../screenshots/cloud-console/gcp_console_06_vpc_psc_nat_subnet_live.png)

![Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 2 — Standard Tier Pooled BigQuery RLS table (`pattern_a_pooled_rls_entities`) prior to live tenant tier promotion](../screenshots/cloud-console/gcp_console_03_bigquery_studio_pattern_a_rls.png)

![Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 3 — Enterprise Tier Dedicated CMEK Spoke Vault (`pattern_b_silo_finvault_cmek_vault`) after zero-drop `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` migration](../screenshots/cloud-console/gcp_console_04_bigquery_studio_pattern_b_cmek.png)

![Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 4 — Live Cloud KMS KeyRing (`cymbal-multi-tenant-kr`) enforcing dedicated CMEK keys on promoted Enterprise Spokes](../screenshots/cloud-console/gcp_console_05_cloud_kms_keyring_live.png)

![Intra-Cloud Pattern C (Dynamic Hybrid PSC) Stage 5 — Live Cloud Logging Explorer certifying `4/4` Pattern C Dynamic Hybrid Routing & `0`-Drop Cutover assertions (`PASS`)](../screenshots/cloud-console/gcp_console_07_logs_explorer_20_20_pass.png)

### Part II — Inter-Cloud Third-Party App Testing & Validation Matrix (WS4 • 10 Live AWS AgentCore MCP Targets + 10 Stateful Execution Twins on `13.220.94.209:3001..3010`)

- **Plane 1 — AWS Bedrock AgentCore MCP & Commercial SaaS Control Plane (`Side A`)**: Run `python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py` and `python3 -B scripts/verify_5_third_party_saas_products.py` to mint a live Amazon Cognito RS256 OAuth2 token (`us-east-1_vqlzYM74B`) and execute `tools/call` across all 10 targets (`KD6Z3SV8PX`..`TXGJHVFBWP`) on `https://cymbal-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`.
- **Plane 2 — Stateful Open-Source Data/RLS Execution Twins (`Side B` on `http://13.220.94.209:3001..3010`)**: Inspect each live containerized execution twin (`Metabase v0.50.26`, `Grafana Enterprise 11.2.0`, `Redmine 5.1`, `NocoDB 0.255.2`, `Gitea 1.22.3`, `Trino 440`, `ClickHouse 24.8`, `Directus 11.1.0`, `Datalust Seq 2024.3`, and `HashiCorp Vault 1.13.3`) and its live Amazon S3 Audit Ledger JSON (`?format=json`). *(Note: Public review sandboxes expose read-accessible ports `:3001..3010` and reviewer credentials for instant auditability; production deployments enforce HTTPS ALB/WAF TLS 1.3 termination, private VPC-only listener bindings, and 5-minute DPoP-bound OAuth2 tokens.)*

| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Live Execution Twin UI (`13.220.94.209:3001..3010`) & S3 Ledger JSON | Side-A (AgentCore MCP) & Side-B (Live Software UI) Screenshots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud (Spotter Agentic BI v2.0)** • [Vendor API (`try-everywhere.thoughtspot.cloud`)](https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom) | Target **`KD6Z3SV8PX`** (`READY`) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` • `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` (`psc-neg-finvault-silo-usw1`) | **In:** `tenant="finvault"`, `tier="ENTERPRISE_SILO_SPOKE"` • **Out:** `HTTP 200` • `dropped_requests=0`, `100%` PSC Spoke | **In:** Standard `retailstream` spoofing `x-psc-endpoint-id="psc-neg-finvault-silo-usw1"` • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Metabase BI (`:3001`)](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | [Side-A MCP (`saas_01`)](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_01`)](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png) |
| **`SAAS-02` Sigma Computing (Workbooks & Dataset API v2)** • [Vendor API (`api.sigmacomputing.com`)](https://api.sigmacomputing.com/v2/auth/token) | Target **`OZ0KTE8Z8M`** (`READY`) • `mcp://cymbal/sigma-computing-workbooks-3lo` • Zero-downtime workbook promotion Pool -> PSC Spoke | **In:** `tenant="finvault"` promoted to `ENTERPRISE_SILO_SPOKE` • **Out:** `HTTP 200` • `ua_tenant_id=finvault` over PSC (`0` drops) | **In:** Standard `retailstream` spoofing FinVault PSC workbook route • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Grafana BI (`:3002`)](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | [Side-A MCP (`saas_02`)](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_02`)](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png) |
| **`SAAS-03` ServiceNow ITSM & ITOM (`CHG0049218`)** • [Vendor Status (`status.servicenow.com`)](https://status.servicenow.com) | Target **`PLOLWRMI0I`** (`READY`) • `mcp://retailstream/servicenow-itom-3lo` • Dynamic Hybrid routing (Standard Pool vs Enterprise PSC Spoke) | **In:** `tenant="finvault"`, `change="CHG0049218"` over PSC Spoke • **Out:** `HTTP 200` • `CHG0049218` synced (`dropped_requests=0`) | **In:** Standard `retailstream` spoofing FinVault PSC ServiceNow spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Redmine ITSM (`:3003`)](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | [Side-A MCP (`saas_03`)](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_03`)](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png) |
| **`SAAS-04` Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)** • [Vendor Portal (`veevavault.com`)](https://login.veevavault.com) | Target **`1KZWKOFTWQ`** (`READY`) • `mcp://finvault/veeva-muse-clinical-3lo` • GxP Clinical EDC promoted to Enterprise PSC Spoke | **In:** `tenant="finvault"`, `study="FV-GXP-2026-04"` via PSC Spoke • **Out:** `HTTP 200` • 21 CFR Part 11 KMS sig + `0` dropped calls | **In:** Standard `retailstream` spoofing FinVault PSC clinical spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live NocoDB EDC (`:3004`)](http://13.220.94.209:3004/#/nc/base) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | [Side-A MCP (`saas_04`)](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_04`)](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png) |
| **`SAAS-05` Salesforce CRM (`NA224`) & Atlassian Jira Cloud** • [Vendor API (`api.status.salesforce.com`)](https://api.status.salesforce.com/v1/instances/NA224/status) | Target **`W7BF0JRWEA`** (`READY`) • `mcp://finvault/salesforce-jira-escalation-3lo` • Hybrid PSC Spoke escalation + Hop 4 Cloud SDP redaction | **In:** `tenant="finvault"`, `instance="NA224"` over PSC Spoke • **Out:** `HTTP 200` • `[REDACTED-FINVAULT-IBAN]` + `0` dropped escalations | **In:** Standard `retailstream` spoofing FinVault PSC escalation spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Gitea Tracker (`:3005`)](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | [Side-A MCP (`saas_05`)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_05`)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png) |
| **`SAAS-06` Databricks Data Intelligence Platform (Unity Catalog)** • [Vendor API (`community.cloud.databricks.com`)](https://community.cloud.databricks.com/api/2.0/clusters/list) | Target **`Z1RHXLBK6F`** (`READY`) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Zero-downtime Unity Catalog schema cutover to PSC Spoke | **In:** `tenant="finvault"` promoted to PSC Spoke (`finvault_gold`) • **Out:** `HTTP 200` • `row_count=2`, `dropped_requests=0` | **In:** Standard `retailstream` spoofing FinVault PSC lakehouse spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Trino UI (`:3006`)](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | [Side-A MCP (`saas_06`)](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_06`)](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png) |
| **`SAAS-07` Snowflake AI Data Cloud (Cortex Analyst & SQL v2)** • [Vendor API (`snowflakecomputing.com`)](https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements) | Target **`7PB1EK3NJO`** (`READY`) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Zero-downtime Snowflake Cortex role & warehouse cutover over PSC | **In:** `tenant="finvault"` promoted to PSC Spoke (`ROLE_CYMBAL_FINVAULT`) • **Out:** `HTTP 200` • `dropped_requests=0`, `100%` PSC Spoke | **In:** Standard `retailstream` spoofing FinVault PSC Cortex spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live ClickHouse UI (`:3007`)](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | [Side-A MCP (`saas_07`)](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_07`)](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png) |
| **`SAAS-08` Workday Enterprise HCM & Financial Management** • [Vendor API (`wd5-services1.myworkday.com`)](https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token) | Target **`CXH8BK86IF`** (`READY`) • `mcp://finvault/workday-hcm-financials-raas-3lo` • Hybrid PSC Spoke RaaS promotion + Hop 4 SSN/IBAN redaction | **In:** `tenant="finvault"` promoted to PSC Spoke (`SUP-ORG-FINVAULT-NA`) • **Out:** `HTTP 200` • `[REDACTED_US_SSN]`, `dropped_requests=0` | **In:** Standard `retailstream` spoofing FinVault PSC Workday spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Directus HCM (`:3008`)](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | [Side-A MCP (`saas_08`)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_08`)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png) |
| **`SAAS-09` Datadog Cloud Observability & Bits AI SRE** • [Vendor API (`api.datadoghq.com`)](https://api.datadoghq.com/api/v1/validate) | Target **`A2X7LPMPA7`** (`READY`) • `mcp://cymbal/datadog-observability-sre-3lo` • Zero-downtime OTel & Datadog APM log stream cutover to PSC Spoke | **In:** `tenant="finvault"` promoted to PSC Spoke (`@tenant_id:finvault`) • **Out:** `HTTP 200` • `2` spans, `dropped_requests=0` | **In:** Standard `retailstream` spoofing FinVault PSC Datadog spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Seq APM (`:3009`)](http://13.220.94.209:3009/#/events) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | [Side-A MCP (`saas_09`)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_09`)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png) |
| **`SAAS-10` CrowdStrike Falcon Next-Gen SIEM & Okta Identity** • [Vendor API (`api.crowdstrike.com`)](https://api.crowdstrike.com/oauth2/token) | Target **`TXGJHVFBWP`** (`READY`) • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Hybrid PSC Spoke DPoP session continuity across live tier promotion | **In:** `tenant="finvault"` promoted to PSC Spoke (`dpop_jkt_fv_001`) • **Out:** `HTTP 200` • Zero session drops (`dropped_requests=0`) | **In:** Standard `retailstream` spoofing FinVault PSC XDR spoke • **Out:** **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Vault UI (`:3010`)](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (Token `fv-token-finvault-sre-2026`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | [Side-A MCP (`saas_10`)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_10`)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png) |

### Part III — Side-A (AgentCore MCP) & Side-B (Live Execution Twin UI on `13.220.94.209:3001..3010`) Visual Proof Gallery (WS4)

![SAAS-01 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target KD6Z3SV8PX (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png)

![SAAS-01 Side B — WS4 Live Metabase BI (`metabase/metabase:v0.50.26`) Execution Twin UI on http://13.220.94.209:3001/question/27 (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png)

![SAAS-02 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target OZ0KTE8Z8M (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png)

![SAAS-02 Side B — WS4 Live Grafana Enterprise (`grafana/grafana-enterprise:11.2.0`) Execution Twin UI on http://13.220.94.209:3002/d/finvault-sre-wb (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png)

![SAAS-03 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target PLOLWRMI0I (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png)

![SAAS-03 Side B — WS4 Live Redmine ITSM (`redmine:5.1-alpine`) Execution Twin UI on http://13.220.94.209:3003/projects/finvault-itsm/issues (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png)

![SAAS-04 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 1KZWKOFTWQ (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png)

![SAAS-04 Side B — WS4 Live NocoDB Clinical EDC (`nocodb/nocodb:0.255.2`) Execution Twin UI on http://13.220.94.209:3004/#/nc/base (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png)

![SAAS-05 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target W7BF0JRWEA (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png)

![SAAS-05 Side B — WS4 Live Gitea Escalation Tracker (`gitea/gitea:1.22.3`) Execution Twin UI on http://13.220.94.209:3005/finvault/sre-escalations/issues/1 (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png)

![SAAS-06 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target Z1RHXLBK6F (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png)

![SAAS-06 Side B — WS4 Live Trino Distributed SQL Lakehouse (`trinodb/trino:440`) Execution Twin UI on http://13.220.94.209:3006/ui/ (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png)

![SAAS-07 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 7PB1EK3NJO (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png)

![SAAS-07 Side B — WS4 Live ClickHouse Analytics Play UI (`clickhouse/clickhouse-server:24.8`) Execution Twin UI on http://13.220.94.209:3007/play (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png)

![SAAS-08 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target CXH8BK86IF (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png)

![SAAS-08 Side B — WS4 Live Directus HCM Data Studio (`directus/directus:11.1.0`) Execution Twin UI on http://13.220.94.209:3008/admin/content/hcm_compensation (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png)

![SAAS-09 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target A2X7LPMPA7 (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png)

![SAAS-09 Side B — WS4 Live Datalust Seq APM & Log Server (`datalust/seq:2024.3`) Execution Twin UI on http://13.220.94.209:3009/#/events (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png)

![SAAS-10 Side A — WS4 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target TXGJHVFBWP (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png)

![SAAS-10 Side B — WS4 Live HashiCorp Vault UI (`hashicorp/vault:1.13.3`) Execution Twin UI on http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png)


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
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides:
  - [Workstream 4 Editable Google Slides Deck (`ws4-pattern-c-hybrid-editable-slides.pptx`)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
