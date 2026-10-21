export const WS4_WS5_SPECS = [
  {
    filename: 'ws4-pattern-c-hybrid-dynamic-tiering.md',
    pptxFile: 'ws4-pattern-c-hybrid-editable-slides.pptx',
    frontmatter: {
      title: 'Multi-tenant agentic AI system: Pattern C dynamic hybrid routing and zero-downtime tier upgrades',
      subtitle: 'Route Standard tenants to a shared pool and Enterprise tenants over Private Service Connect to isolated CMEK spokes from one unified control plane—with live 0-dropped-turn tier migration',
      series: 'Multi-Tenant Agentic AI on Google Cloud — Workstream 4 of 5',
      workstream: 'Workstream 4 • Pattern C — Dynamic Hybrid Hub-and-Spoke Architecture',
      authors: 'Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team',
      target_audience: 'Cloud Architects, Platform Product Managers, and FinOps Leads operating tiered B2B SaaS on Google Cloud',
      reading_time: '13 min read',
      tags: ['Pattern C', 'Hybrid Architecture', 'Private Service Connect', 'Hub-and-Spoke', 'Zero-Downtime Migration', 'Vertex AI Agent Engine', 'ADK 2.0', 'CMEK', 'AlloyDB RLS', 'FinOps', 'Multi-Tenancy'],
      canonical_architecture: 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system',
      diagrams: ['ws4-pattern-c-hybrid-psc-and-migration', 'ws4-hub-and-spoke-demo-env-setup-topology', 'ws4-zero-downtime-tier-upgrade-sequence', 'ws4-terraform-hybrid-psc-blueprint-resource-graph'],
      editable_slides: 'slides/ws4-pattern-c-hybrid-editable-slides.pptx',
      status: 'PUBLISH_READY'
    },
    leadParagraphs: [
      `This document describes **Pattern C (Dynamic Hybrid Hub-and-Spoke Architecture)** for building and operating a multi-tiered agentic AI SaaS platform on Google Cloud. Pattern C combines the high-density unit economics of [Pattern A (Pooled Architecture)](ws2-pattern-a-pooled-architecture.md) with the physical project and encryption isolation of [Pattern B (Sovereign Silos)](ws3-pattern-b-sovereign-silos.md) behind a single unified control plane (\`cymbal-hybrid-hub-prod\`). A tenant-aware [Cloud Run](https://cloud.google.com/run/docs) router directs Standard-tier customers to a shared pooled runtime while bridging regulated Enterprise-tier customers across [Private Service Connect (PSC)](https://cloud.google.com/vpc/docs/private-service-connect) into dedicated CMEK-encrypted spoke projects.`,
      `This document is part 4 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (introduced in [Part 1: Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)). It also details a **3-phase zero-downtime tier migration engine** that promotes a live customer from the shared pool into a dedicated PSC spoke with **zero dropped turns**.`
    ],
    keyPointNote: `**Key point:** Pattern C eliminates the need to maintain separate SaaS products for Standard and Enterprise tiers. All customers connect to one SaaS URL, authenticate through one Hop 1 gateway, and run on the same **80% reusable 5-Hop agent core**—while upgrading from the shared pool to a dedicated PSC spoke requires only a single atomic Firestore route flip (\`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY\`).`,
    archIntro: `The following diagram shows the Pattern C dynamic hybrid hub-and-spoke architecture, connecting the central routing and governance hub to both the shared pooled runtime and dedicated Enterprise Private Service Connect (PSC) spokes:`,
    figures: [
      {
        num: 1,
        heading: null,
        title: 'Pattern C: Dynamic hybrid hub-and-spoke architecture, Private Service Connect (PSC) spokes, and live tier migration',
        diagId: 'ws4-pattern-c-hybrid-psc-and-migration',
        captionDetail: 'Official Google Cloud Architecture Center hub-and-spoke topology showing the Unified Hybrid Routing Hub (`cymbal-hybrid-hub-prod`), Federated Agent Catalog & Migration Control Hub, Shared Pooled Runtime Spoke (Standard Tier), and Dedicated Enterprise PSC Spoke (`cymbal-finvault-silo-prod` / promoted `cymbal-retailstream-spoke-prod`).',
        zonesIntro: `Figure 1 organizes the hybrid platform across four functional zones:`,
        zones: [
          { name: 'Unified Hybrid Routing and Identity Hub (`cymbal-hybrid-hub-prod`)', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Terminates all Standard and Enterprise traffic at one External Application Load Balancer, strips forged headers in Cloud Armor, verifies OIDC/Entra JWTs in IAP (`Hop 1`), and queries the Firestore Route Table in the Cloud Run Hybrid Router to dispatch turns to `pool://` or `psc://`.' },
          { name: 'Federated Agent Catalog, KMS, and Live Migration Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Synchronizes private spoke agent descriptors (`Agent Alpha`) into the hub\'s Discovery Engine Catalog PDP (`Hop 2`), orchestrates the 3-phase Zero-Downtime Tier Migration Engine (`pattern_c_hybrid_router_and_migrator.py`), and aggregates cross-tier BigQuery FinOps telemetry (`Hop 5`).' },
          { name: 'Shared Pooled Runtime Spoke (Standard Tier — `pool://`)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Serves Standard-tier tenants (`RetailStream Corp` prior to upgrade) inside the shared Vertex AI Agent Engine runtime (`4,000` token cap, `120 RPM`) with 90% shared `ContextCacheConfig` savings and shared AlloyDB RLS.' },
          { name: 'Dedicated Enterprise PSC Spoke (`psc://10.10.0.50/...`)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Serves Enterprise tenants (`FinVault Bank` and upgraded `RetailStream Corp`) across unidirectional Private Service Connect (`ServiceAttachment`) inside a dedicated VPC-SC perimeter with `8,000` thinking-token budgets, dedicated CMEK AlloyDB, and private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput).' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 trace dynamic tier routing and cross-project PSC execution:`,
        steps: [
          { title: 'Unified SaaS request', body: 'Standard and Enterprise customers send HTTPS requests to the same public Cymbal SaaS hostname.' },
          { title: 'Hop 1 — Cryptographic identity verification and Firestore route lookup', body: 'IAP and the Edge PEP derive `ctx.tenant_id` from the JWT and look up the tenant\'s active route (`PATTERN_C_HYBRID_POOL` vs `PATTERN_C_HYBRID_PSC_SPOKE`) in Firestore.' },
          { title: 'Hop 2 — Federated Agent Catalog PDP and tool pruning', body: 'The hub catalog resolves both shared pool agents and federated PSC spoke agents, blocking cross-tenant calls (`HTTP 403`) and pruning unauthorized MCP tools.' },
          { title: 'Hop 4 (Pre-inference) — Model Armor and Cloud DLP inspection', body: 'Prompts and tool arguments pass through inline injection and PII guardrails before traversing either the pool or the PSC forwarding rule.' },
          { title: 'Hop 3 — Dynamic dispatch to Shared Pool (`pool://`) or PSC Spoke (`psc://`)', body: 'Standard tenants execute in the shared pool (`4,000` token cap); Enterprise tenants traverse the consumer PSC endpoint (`10.10.0.50`) into their dedicated spoke producer attachment (`8,000` token budget + CMEK verification).' },
          { title: 'Hop 4 (Post-inference) — Output DLP and tier-scoped 3LO MCP execution', body: 'Responses and 3LO MCP calls are validated against the caller\'s DPoP proof and semantic Natural Language Policy Compliance (`NLC`) rules.' },
          { title: 'Hop 5 — Tier-isolated persistence and unified BigQuery FinOps chargeback', body: 'Data persists in shared AlloyDB RLS (`SET LOCAL app.current_tenant_id` for Standard) or dedicated CMEK AlloyDB (Enterprise), while redacted OTel spans stream to the hub BigQuery ledger (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).' }
        ]
      },
      {
        num: 2,
        heading: '### Cross-project Private Service Connect (PSC) network topology (Figure 2)',
        title: 'Pattern C: Hub-and-spoke VPC and Private Service Connect (PSC) NAT peering topology',
        diagId: 'ws4-hub-and-spoke-demo-env-setup-topology',
        captionDetail: 'Cross-project network architecture (`workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md`) showing consumer PSC endpoints in `cymbal-hybrid-hub-prod` connecting to producer `ServiceAttachment` resources in isolated Enterprise spoke projects without CIDR overlap.',
        zonesIntro: `Figure 2 illustrates the network architecture detailed in [4.2 Hub-and-Spoke Demo Environment Setup](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md):`,
        zones: [
          { name: 'Hub VPC and Cloud Run Direct VPC Egress (`10.10.0.0/20`)', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Hosts the Cloud Run Hybrid Router with Direct VPC Egress to internal consumer PSC forwarding rules (`10.10.0.50`, `10.10.0.51`).' },
          { name: 'PSC Producer-Consumer Handshake and VPC-SC Ingress Bridge', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Enforces `ACCEPT_MANUAL` consumer accept lists on each spoke `ServiceAttachment` and binds VPC-SC ingress rules exclusively to the hub router service account.' },
          { name: 'FinVault Enterprise PSC Spoke (`10.40.0.0/20`)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Dedicated spoke project publishing `finvault-agent-spoke-psc` in front of an Internal Application Load Balancer, Agent Engine runtime, and CMEK AlloyDB.' },
          { name: 'RetailStream Promoted Enterprise PSC Spoke (`10.40.0.0/20` reused)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Demonstrates non-overlapping CIDR reuse: because PSC uses source NAT (`/28` subnet `10.240.0.0/28`), every enterprise spoke can reuse `10.40.0.0/20` without IP exhaustion.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 2 trace packet flow across the Private Service Connect boundary:`,
        steps: [
          { title: 'Ingress at hub External Application Load Balancer', body: 'Traffic enters `cymbal-hybrid-hub-prod` over TLS 1.3 and passes Cloud Armor and IAP (`Hop 1`).' },
          { title: 'Cloud Run Router resolves PSC target URI', body: 'Firestore returns `psc://10.10.0.50/projects/cymbal-finvault-silo-prod/serviceAttachments/finvault-agent-spoke-psc`.' },
          { title: 'Direct VPC Egress to consumer PSC forwarding rule', body: 'The router sends the signed `CryptographicContext` to internal IP `10.10.0.50` inside the hub VPC.' },
          { title: 'Unidirectional PSC NAT traversal into producer spoke', body: 'Google Andromeda translates packet headers across the producer `ServiceAttachment` (`cymbal-psc-nat-us-west1`, `10.240.0.0/28`); the spoke cannot initiate reverse connections into the hub.' },
          { title: 'Spoke Internal ALB and Agent Engine execution', body: 'The spoke Internal ALB forwards the request to the isolated Vertex AI Agent Engine runtime (`Hop 3` & `Hop 4`).' },
          { title: 'Spoke-local CMEK AlloyDB and 3LO MCP access', body: 'The agent queries dedicated CMEK AlloyDB and spoke-local MCP connectors inside the spoke VPC-SC perimeter (`Hop 5`).' },
          { title: 'Synchronous response and hub OTel aggregation', body: 'The response returns over the PSC connection and emits a redacted FinOps span to the hub.' }
        ]
      },
      {
        num: 3,
        heading: '### 3-phase zero-downtime live tier upgrade sequence (Figure 3)',
        title: 'Pattern C: 3-phase zero-downtime live tier migration (Pool to Enterprise PSC Spoke)',
        diagId: 'ws4-zero-downtime-tier-upgrade-sequence',
        captionDetail: 'Three-phase live migration state machine (`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY`) promoting `RetailStream Corp` from the shared Pattern A pool into a dedicated Enterprise PSC spoke (`cymbal-retailstream-spoke-prod`) with `0` dropped turns.',
        zonesIntro: `Figure 3 details the live migration state machine implemented in [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py):`,
        zones: [
          { name: 'Phase 1 — Background Shadow Sync (`SHADOW_SYNC`)', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Streams RetailStream\'s AlloyDB RLS rows (`WHERE tenant_id = \'retailstream\'`) via Database Migration Service (DMS) CDC and Dual-Writes Memory Bank vectors into `cymbal-retailstream-spoke-prod` while live turns continue on the pool.' },
          { name: 'Phase 2 — Single-Document Atomic Route Cutover (`ATOMIC_CUTOVER`)', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Once CDC replication lag reaches `0 ms`, commits a single Firestore transaction flipping RetailStream from `pool://` (`4,000` token cap) to `psc://10.10.0.51/...` (`8,000` token budget + CMEK).' },
          { name: 'Pre-Cutover Source — Shared Pooled Runtime (`Turn N`)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Serves Turn N before cutover and gracefully drains in-flight pooled sessions during Phase 3 (`DRAIN_AND_VERIFY`).' },
          { name: 'Post-Cutover Target — Dedicated RetailStream PSC Spoke (`Turn N+1`)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Immediately serves Turn N+1 with full conversation history intact, `8,000` thinking-token entitlement, and dedicated CMEK encryption (`projects/cymbal-retailstream-spoke-prod/.../agent-memory-cmek`).' }
        ],
        stepsIntro: `The seven numbered steps in Figure 3 trace a live customer upgrade mid-conversation:`,
        steps: [
          { title: 'Turn N executes on Shared Pool (`STANDARD` tier)', body: 'RetailStream runs on `pool://cymbal-shared-pooled-runtime-v2` with its `4,000` thinking-token cap.' },
          { title: 'Provision dedicated Enterprise PSC spoke via Terraform', body: 'Terraform stamps out `cymbal-retailstream-spoke-prod`, its Cloud KMS CMEK key, and its PSC `ServiceAttachment`.' },
          { title: 'Phase 1 (`SHADOW_SYNC`) — CDC replication and memory dual-write', body: 'DMS streams RetailStream rows from shared AlloyDB RLS to spoke CMEK AlloyDB until `replication_lag_ms == 0`.' },
          { title: 'Verify parity checksums across pool and spoke', body: 'The migration controller verifies row counts, vector embeddings, and KMS encryption status in the target spoke.' },
          { title: 'Phase 2 (`ATOMIC_CUTOVER`) — Sub-10ms Firestore route flip', body: 'A single Firestore transaction updates RetailStream\'s route to `psc://10.10.0.51/...`, tier to `ENTERPRISE`, and token budget to `8,000`.' },
          { title: 'Turn N+1 routes to Dedicated PSC Spoke with `0` dropped turns', body: 'The very next user turn routes over PSC to `cymbal-retailstream-spoke-prod` with full session memory preserved.' },
          { title: 'Phase 3 (`DRAIN_AND_VERIFY`) — Cryptographic purge of pooled rows', body: 'In-flight pooled requests finish, and RetailStream\'s legacy rows in the shared AlloyDB pool are cryptographically purged.' }
        ]
      },
      {
        num: 4,
        heading: '### Dual-provider Terraform hybrid PSC resource graph (Figure 4)',
        title: 'Pattern C: Multi-project Terraform hybrid hub and PSC spoke resource graph',
        diagId: 'ws4-terraform-hybrid-psc-blueprint-resource-graph',
        captionDetail: 'Declarative multi-project Terraform DAG (`workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/`) using `google.hub` and `google.spoke` provider aliases to wire PSC producer attachments and consumer endpoints.',
        zonesIntro: `Figure 4 maps the dual-provider Terraform blueprint ([\`4.6-terraform-hybrid-psc-blueprint/main.tf\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)):`,
        zones: [
          { name: 'Hub Provider (`google.hub`) Edge and Router Resources', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Provisions `google_cloud_run_v2_service.hybrid_router`, Direct VPC Egress subnets, and Firestore routing collections in `cymbal-hybrid-hub-prod`.' },
          { name: 'Cross-Project PSC Handshake and Federated Registry', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Links `google_compute_forwarding_rule.psc_consumer` in the hub to `google_compute_service_attachment.psc_producer` in each spoke with `ACCEPT_MANUAL` project allowlists.' },
          { name: 'Shared Pool Resources in Hub Project', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Provisions the pooled Vertex AI Agent Engine runtime, Memorystore for Valkey, and shared AlloyDB RLS cluster.' },
          { name: 'Spoke Provider (`google.spoke`) Sovereign Resources', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions isolated spoke VPCs, `cymbal-psc-nat-us-west1` (`/28` `10.240.0.0/28`) NAT subnets, Internal ALBs, spoke Agent Engine runtimes, and CMEK AlloyDB clusters.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 4 trace the multi-project Terraform deployment:`,
        steps: [
          { title: 'Initialize `google.hub` and `google.spoke` Terraform providers', body: 'Configure provider aliases targeting `cymbal-hybrid-hub-prod` and `cymbal-{tenant}-spoke-prod`.' },
          { title: 'Provision hub VPC, Cloud Armor, IAP, and Shared Pool', body: 'Deploy the shared Pattern A pool components inside the hub project.' },
          { title: 'Provision spoke VPC, PSC NAT subnet, and Internal ALB', body: 'Create the isolated spoke network and `/28` `PRIVATE_SERVICE_CONNECT` NAT subnet (`10.240.0.0/28`).' },
          { title: 'Publish spoke `google_compute_service_attachment`', body: 'Expose the spoke Internal ALB via a PSC producer attachment with `consumer_accept_lists` restricted to the hub project.' },
          { title: 'Create hub `google_compute_forwarding_rule` PSC endpoint', body: 'Bind a static internal IP (`10.10.0.50`) in the hub VPC to the spoke\'s `ServiceAttachment` URI.' },
          { title: 'Deploy Cloud Run Hybrid Router and Firestore route table', body: 'Configure the router with Direct VPC Egress and seed tenant routing rules.' },
          { title: 'Run 4-point hybrid and live-migration test suite', body: 'Execute `run_tier_migration_suite.py` to validate routing, catalog isolation, and zero-downtime promotion.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern C is the recommended production architecture for multi-tiered B2B SaaS platforms ([4.1 Case Study & Solution Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)):

- **Tiered SaaS product packaging (Standard vs Enterprise):** Offer a low-cost self-service Standard tier on shared pooled infrastructure alongside a premium Enterprise tier with dedicated Google Cloud projects and customer-managed encryption keys—without maintaining two separate codebases or URLs.
- **Land-and-expand customer lifecycle with live upgrades:** Onboard new logos into the shared pool in seconds (**RetailStream Corp** at \`120 RPM Pool\` floor) and promote them live into a dedicated PSC spoke (\`600 RPM Silo\` spoke floor) when they sign an Enterprise expansion contract, with **zero downtime and zero lost chat history**.
- **Cross-project private agent federation:** Allow Enterprise customers (**FinVault Bank**) to run private custom agents (\`Agent Alpha\` on Dedicated Provisioned Throughput \`gemini-2.5-pro-dedicated\`) inside their isolated spoke while surfacing those agents seamlessly through the unified SaaS UI.`,
    alternativesMd: `## Design alternatives

### VPC Network Peering vs Private Service Connect (PSC) for hub-to-spoke connectivity

A critical architectural decision in Pattern C is how the central routing hub communicates with dozens or hundreds of isolated Enterprise tenant projects ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)):

| Networking dimension | Traditional VPC Network Peering | Private Service Connect (PSC) (\`ServiceAttachment\`) |
| :--- | :--- | :--- |
| **Scale & quota limits** | Caps out at 25 peered VPC networks per hub VPC | Scales to **hundreds of Enterprise tenant spokes** per hub VPC |
| **IP address management** | Requires globally non-overlapping CIDR blocks across all tenants | **NAT-based (\`/28\` \`10.240.0.0/28\`):** every spoke can reuse the exact same \`10.40.0.0/20\` CIDR |
| **Directionality & blast radius** | Bi-directional L3 routing between peered subnets | **Strictly unidirectional** (Hub consumer -> Spoke producer only) |
| **Authorization model** | Network-level peering handshake | Explicit \`ACCEPT_MANUAL\` project allowlist + VPC-SC ingress policy |

### 4-point hybrid routing and live migration verification matrix

Every Pattern C deployment is verified using the automated test suite ([\`run_tier_migration_suite.py\`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py)):

| Test ID | Hybrid & migration scenario | Verified runtime outcome |
| :--- | :--- | :--- |
| **Hybrid Test 1** | Initial tier routing (\`RetailStream\` Standard vs \`FinVault\` Enterprise) | RetailStream routes to \`pool://\` (\`4,000\` cap); FinVault routes to \`psc://10.10.0.50/...\` (\`8,000\` budget) |
| **Hybrid Test 2** | Cross-tier private agent isolation (\`RetailStream\` calling FinVault's \`Agent Alpha\`) | Blocked at Hop 2 Federated Catalog PDP with **\`HTTP 403 Forbidden\`** |
| **Hybrid Test 3** | 3-phase live tier upgrade of \`RetailStream\` (\`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY\`) | **\`0\` dropped turns**, \`0 ms\` final CDC lag, route flipped to \`psc://10.10.0.51/...\` |
| **Hybrid Test 4** | Post-upgrade RetailStream turn verification | Executes in dedicated spoke with \`8,000\` token budget + CMEK key \`projects/cymbal-retailstream-spoke-prod/...\` |`,
    productsMd: `## Products used

Pattern C (Dynamic Hybrid Hub-and-Spoke Architecture) uses the following Google Cloud products across the central routing hub (\`cymbal-hybrid-hub-prod\`) and dedicated Enterprise PSC spoke projects:

### Dynamic routing, cross-project PSC networking, and live migration

- [Cloud Run](https://cloud.google.com/run/docs) with Direct VPC Egress: Hosts the stateless Tenant-Aware Hybrid Router (\`pattern_c_hybrid_router_and_migrator.py\`) that dispatches turns either to the local shared pool (\`pool://\`) or to consumer Private Service Connect endpoints (\`psc://10.10.0.50\`).
- [Private Service Connect (PSC)](https://cloud.google.com/vpc/docs/private-service-connect): Establishes unidirectional, NAT-translated (\`/28\` subnet \`10.240.0.0/28\`) private connectivity from hub consumer forwarding rules to producer \`ServiceAttachment\` resources in isolated Enterprise spoke projects—allowing every spoke to reuse identical VPC CIDRs (\`10.40.0.0/20\`).
- [Firestore](https://cloud.google.com/firestore/docs) and [Database Migration Service (DMS)](https://cloud.google.com/database-migration/docs): Store the sub-10ms atomic tenant routing table (\`tenant_routing_table\`) and stream continuous Change Data Capture (CDC) from the shared AlloyDB RLS pool into dedicated CMEK AlloyDB spokes during \`SHADOW_SYNC\`.

### Federated agent catalog, runtime tiers, and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Power both the shared Standard-tier runtime pool in the hub project and the isolated Enterprise-tier runtimes in each PSC spoke project.
- [Discovery Engine Agent Catalog](https://cloud.google.com/generative-ai-app-builder/docs): Federates spoke-private agent descriptors (\`agent://finvault/private-agent-alpha-regulatory\`) into the central Hop 2 Policy Decision Point while enforcing \`HTTP 403 Forbidden\` against unauthorized callers.
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Combines shared \`ContextCacheConfig\` (90% prefix discount) for Standard-tier pooled tenants with Dedicated Provisioned Throughput (\`gemini-2.5-pro-dedicated\`) in Enterprise spokes.

### Perimeter security, CMEK data spokes, and unified FinOps telemetry

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs), [Google Cloud Armor](https://cloud.google.com/armor/docs), and [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs): Provide a single unified SaaS ingress URL and Hop 1 DPoP-bound token exchange across all customer tiers.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs), [Cloud KMS](https://cloud.google.com/kms/docs), and [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): Combine shared \`FORCE ROW LEVEL SECURITY\` in the hub with per-spoke VPC-SC perimeters and customer-managed KMS encryption keys (\`HTTP 423\` kill-switch) in Enterprise spokes.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview), [Sensitive Data Protection](https://cloud.google.com/sensitive-data-protection/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Enforce bi-directional Hop 4 prompt/output guardrails and aggregate cross-tier OpenTelemetry FinOps spans in \`cymbal_agentic_finops_otel.tenant_telemetry_spans\`.`,
    considerationsMd: `## Design considerations

This section provides guidance for operating Pattern C according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Index routing tables exclusively by cryptographically verified \`tenant_id\`:** In \`route_and_invoke()\`, always execute **Hop 1** (\`hop1.authenticate_and_mint_context()\`) before querying the Firestore route table so a client cannot spoof an HTTP header to route into another tenant's PSC spoke.
- **Scope tenant profiles per runtime instance:** Store \`tenant_profiles\` on \`self._tenant_profiles\` per runtime instance rather than mutating a global class dictionary, ensuring that promoting a tenant in one router instance never causes cross-instance state pollution.
- **Configure \`ACCEPT_MANUAL\` on all PSC ServiceAttachments:** Explicitly list only the hub project (\`cymbal-hybrid-hub-prod\`) in each spoke's \`consumer_accept_lists\` and set a connection limit to prevent unauthorized PSC attachment attempts.

### Reliability

- **Zero-downtime cutover via atomic Firestore transactions:** Perform all data synchronization (AlloyDB DMS CDC and Memory Bank dual-writes) during \`SHADOW_SYNC\` before flipping the single Firestore routing document in \`ATOMIC_CUTOVER\`.
- **Deterministic migration abort, rollback, and in-flight SSE/3LO session drain:**
  - *If \`SHADOW_SYNC\` parity verification fails* (for example, if DMS CDC lag exceeds threshold, row checksums mismatch, or the target spoke's Cloud KMS CMEK key returns \`HTTP 423\`), the migration controller aborts before \`ATOMIC_CUTOVER\`. Because the Firestore route document still points to \`pool://\`, the customer experiences zero disruption while dual-write buffers are discarded.
  - *If a user is mid-stream on a Server-Sent Events (SSE) turn or mid-redirect in an inline 3LO OAuth consent flow during \`ATOMIC_CUTOVER\`*, the active turn carries an immutable \`route_epoch\` lease pinned to the worker that initiated it. Phase 3 (\`DRAIN_AND_VERIFY\`) holds a 30-second drain window on the shared pool and synchronizes final OAuth token grants into the spoke vault before cryptographically purging the tenant's legacy rows from the shared AlloyDB table.

### Cost optimization

- **Blend pooled and sovereign unit economics (\`Blended Hybrid Tier\` floor):** Keep 80–90% of high-volume Standard customers in the shared pool (\`120 RPM Pool\` floor with 90% \`ContextCacheConfig\` savings) while provisioning dedicated PSC spokes (\`600 RPM Silo\`) only for high-ACV Enterprise contracts ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)).

### Operational excellence

- **Use dual-provider Terraform modules:** Manage the hub and spoke lifecycle in a single declarative graph using \`google.hub\` and \`google.spoke\` provider aliases ([4.6 Terraform Hybrid PSC Blueprint](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)).
- **End-to-end Pattern C (Dynamic Hybrid PSC & Zero-Downtime Tier Migration) verification across 10 third-party SaaS products (\`10/10 Flows • 20/20 Test Cases PASS\`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is verified across **Pattern C's 3-phase live tier migration** (\`Phase 0 Pooled Standard\` -> \`Phase 1-2 Dual-Write Shadow Sync\` -> \`Phase 3 Atomic PSC Cutover 10.10.0.50:443\` with \`0\` dropped turns and \`3/3\` memory parity). Full manual setup, configuration JSON, \`curl\` commands, and Input/Output payloads are in [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern C Dynamic Hybrid PSC & Migration Routing | Positive E2E Input & Verified Output (\`TC-C-POS\`) | Red-Team Breach Input & Verified Block (\`TC-C-NEG\`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **\`SAAS-01\` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` • \`HYBRID_PSC_SPOKE\` (\`10.10.0.50:443\`) post-cutover | **In:** \`tenant="finvault"\` (promoted to PSC spoke), \`org="finvault-org-01"\` • **Out:** \`HTTP 200\` • \`route=DEDICATED_PSC_SPOKE\`, \`dropped_turns=0\`, \`row_count=2\` (\`ENT-FV-001..002\`) | **In:** Pooled \`retailstream\` spoofing Enterprise PSC \`finvault-org-01\` • **Out:** **\`HTTP 403\`** \`CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-c --verbose\` |
| **\`SAAS-02\` Sigma Computing** (*Workbooks & Dataset API v2*) | \`mcp://cymbal/sigma-computing-workbooks-3lo\` • Pooled Standard route + Spoke CMEK check | **In:** \`tenant="retailstream"\` (\`POOLED_SHARED_HUB\`), \`workbook="wb-sigma-retailstream-checkout-02"\` • **Out:** \`HTTP 200\` • \`route=POOLED_SHARED_HUB\`, \`row_count=1\` (\`ENT-RS-001\`) | **In:** Enterprise PSC spoke with revoked KMS CMEK key • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-c --verbose\` |
| **\`SAAS-03\` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | \`mcp://retailstream/servicenow-itom-3lo\` • Hybrid Router + Hop 5 3LO Vault (\`3lo_token_sn_rs_valid\`) | **In:** \`tenant="retailstream"\`, \`change="CHG0049218"\`, \`3lo=True\` • **Out:** \`HTTP 200\` • Live AWS AgentCore \`CHG0049218\` + \`0\` dropped turns | **In:** Unconsented 3LO during hybrid turn (\`seed_3lo=False\`) • **Out:** **\`HTTP 401\`** \`CHALLENGE_3LO_OAUTH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-c --verbose\` |
| **\`SAAS-04\` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | \`mcp://finvault/veeva-muse-clinical-3lo\` • Promoted Enterprise PSC Spoke (\`10.10.0.50:443\`) + Cloud KMS 21 CFR Part 11 | **In:** \`tenant="finvault"\` (PSC Spoke), \`study="FV-GXP-2026-04"\` • **Out:** \`HTTP 200\` • \`route=DEDICATED_PSC_SPOKE\`, \`memory_parity=3/3\` | **In:** Pooled \`retailstream\` attempting Enterprise spoke clinical MCP • **Out:** **\`HTTP 403\`** \`TENANT_CONNECTOR_ACL_DENIED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --pattern pattern-c --verbose\` |
| **\`SAAS-05\` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | \`mcp://finvault/salesforce-jira-escalation-3lo\` • Enterprise PSC Spoke + Hop 4 Egress SDP masking | **In:** \`tenant="finvault"\` (PSC Spoke), \`instance="NA224"\`, raw IBAN/SWIFT • **Out:** \`HTTP 200\` • Live \`NA224\` + \`[REDACTED-FINVAULT-IBAN]\` via PSC spoke | **In:** Verify zero raw IBAN/SWIFT leakage across Pool->Spoke cutover • **Out:** **\`PASS\`** (\`raw_pii_leaked=False\`, \`dropped_turns=0\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --pattern pattern-c --verbose\` |
| **\`SAAS-06\` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` • Enterprise PSC Spoke -> \`cymbal_uc_prod.finvault_gold\` | **In:** \`tenant="finvault"\` (PSC Spoke), \`schema="finvault_gold"\` • **Out:** \`HTTP 200\` • \`Server: databricks\`, \`route=DEDICATED_PSC_SPOKE\`, \`row_count=2\` (\`ENT-FV-001..002\`) | **In:** Pooled \`retailstream\` querying \`finvault_gold\` via \`EXECUTE IMMEDIATE\` • **Out:** **\`HTTP 403\`** \`UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-c --verbose\` |
| **\`SAAS-07\` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` • Pooled Hub route + \`USE SECONDARY ROLES NONE\` | **In:** \`tenant="retailstream"\` (\`POOLED_SHARED_HUB\`), \`role="ROLE_CYMBAL_RETAILSTREAM"\` • **Out:** \`HTTP 200\` • \`Server: SF-LB-T1\`, \`row_count=1\` (\`ENT-RS-001\`) | **In:** \`USE SECONDARY ROLES ALL\` cross-tier escalation to Enterprise role • **Out:** **\`HTTP 403\`** \`SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-c --verbose\` |
| **\`SAAS-08\` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | \`mcp://finvault/workday-hcm-financials-raas-3lo\` • Enterprise PSC Spoke + Principal 3LO + SSN/IBAN SDP | **In:** \`tenant="finvault"\` (PSC Spoke), \`user="alice@finvault.com"\` • **Out:** \`HTTP 200\` • \`route=DEDICATED_PSC_SPOKE\`, \`[REDACTED_US_SSN]\` | **In:** \`user="bob@finvault.com"\` reusing Alice's 3LO token on PSC spoke • **Out:** **\`HTTP 401\`** \`WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-c --verbose\` |
| **\`SAAS-09\` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | \`mcp://cymbal/datadog-observability-sre-3lo\` • Enterprise PSC Spoke + Hop 4 Model Armor log scan | **In:** \`tenant="finvault"\` (PSC Spoke), \`query="@tenant_id:finvault"\` • **Out:** \`HTTP 200\` • Live Datadog US1 API + \`route=DEDICATED_PSC_SPOKE\` | **In:** Poisoned stack trace \`IGNORE ALL PREVIOUS INSTRUCTIONS...\` • **Out:** **\`HTTP 400\`** \`MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-c --verbose\` |
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Enterprise PSC Spoke + RFC 9449 DPoP + Spoke CMEK | **In:** \`tenant="finvault"\` (PSC Spoke), \`dpop="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + \`route=DEDICATED_PSC_SPOKE\` | **In:** Stolen bearer token replay (\`401\`) & spoke CMEK kill-switch (\`423\`) • **Out:** **\`HTTP 401\`** & **\`HTTP 423 Locked\`** verified on PSC spoke | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern pattern-c --verbose\` |

### Performance optimization

- **Cache Firestore routing entries with pub/sub invalidation:** Cache active tenant route descriptors in local Cloud Run memory with a 5-second TTL and immediate Firestore watch invalidation so \`ATOMIC_CUTOVER\` propagates globally in under \`10 ms\`.`,
    whatsNextMd: `## What's next

- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 4 engineering deliverables and master lab:
  - [4.1 Pattern C Case Study & Dynamic Hybrid Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)
  - [4.2 Hub-and-Spoke Demo Environment & PSC Network Setup](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md)
  - [4.3 Hybrid Router & 3-Phase Live Tier Migrator (\`pattern_c_hybrid_router_and_migrator.py\`)](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py)
  - [4.4 Product Collaboration: PSC Scaling & Cross-Project Agent Catalog](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)
  - [4.5 4-Point Hybrid Routing & Zero-Downtime Migration Tests (\`run_tier_migration_suite.py\`)](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py)
  - [4.6 Dual-Provider Terraform Hybrid PSC Blueprint (\`main.tf\`)](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)
  - [4.8 90-Minute Master Codelab: Multi-Pattern Routing & Live Tier Upgrades](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (\`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides:
  - [Workstream 4 Editable Google Slides Deck (\`ws4-pattern-c-hybrid-editable-slides.pptx\`)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx)`
  },
  {
    filename: 'ws5-decision-guide-and-agentic-triad.md',
    pptxFile: 'ws5-wrap-up-editable-slides.pptx',
    frontmatter: {
      title: 'Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad',
      subtitle: 'Choose between Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C) topologies on Google Cloud using a 2-question decision tree, side-by-side comparison matrix, and 3-stage technical solution lifecycle',
      series: 'Multi-Tenant Agentic AI on Google Cloud — Workstream 5 of 5',
      workstream: 'Workstream 5 • Wrap-Up: Pattern Comparison, Decision Guide & Capstone Backlog (5.1 + 5.2)',
      authors: 'Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team',
      target_audience: 'CTOs, Principal Architects, CISOs, and Platform Product Managers designing multi-tenant AI platforms on Google Cloud',
      reading_time: '14 min read',
      tags: ['Multi-Tenancy', 'Vertex AI Agent Engine', 'ADK 2.0', 'Decision Guide', 'Zero Trust', 'FinOps', 'OpenTelemetry', 'VPC-SC', 'Private Service Connect', 'AlloyDB RLS'],
      canonical_architecture: 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system',
      diagrams: ['ws5-decision-tree-and-agentic-triad'],
      editable_slides: 'slides/ws5-wrap-up-editable-slides.pptx',
      status: 'PUBLISH_READY'
    },
    leadParagraphs: [
      `This document provides an executive decision framework to help you select, combine, and operate the right multi-tenant isolation topology for agentic AI systems on Google Cloud. It synthesizes the architectural patterns, security verification suites, and FinOps benchmarks from across this 5-part series—[Part 1 (Reference Taxonomy & 5-Hop Baseline)](ws1-reference-architecture-taxonomy-and-5hop-baseline.md), [Part 2 (Pattern A Pooled)](ws2-pattern-a-pooled-architecture.md), [Part 3 (Pattern B Sovereign Silos)](ws3-pattern-b-sovereign-silos.md), and [Part 4 (Pattern C Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md)—into a two-question decision tree and the **Multi-Tenant Agentic Triad**.`,
      `This document is intended for CTOs, principal cloud architects, CISOs, and AI product leaders evaluating [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/) for multi-customer B2B SaaS or internal enterprise platform deployments.`
    ],
    keyPointNote: `**Key point:** Two gating questions determine your topology: (1) *Do 100% of your customers legally mandate dedicated Google Cloud projects, VPC Service Controls perimeters, or air-gapped open-weight models?* If yes, deploy **Pattern B (Sovereign Silos)**. (2) *If not, do you sell multiple pricing tiers (a shared Standard tier plus a dedicated Enterprise tier)?* If no, deploy **Pattern A (Pooled)**; if yes, deploy **Pattern C (Dynamic Hybrid)**.`,
    archIntro: `The following diagram shows the executive topology decision tree and the **Multi-Tenant Agentic Triad** (Zero-Trust Security, Predictable FinOps Economics, and Privacy-Preserving Observability) governing all three patterns:`,
    figures: [
      {
        num: 1,
        heading: null,
        title: 'Executive decision tree, Pattern A/B/C selector, and the Multi-Tenant Agentic Triad',
        diagId: 'ws5-decision-tree-and-agentic-triad',
        captionDetail: 'Rule 53G 3-Outcome Decision-Tree Blueprint (46 vertices, 19 edges) showing the 2-Question Executive Topology Selector (Zone 1 `#aecbfa`), the Multi-Tenant Agentic Triad 80% Reusable Core (Zone 2 `#ceead6`), and the three side-by-side Pattern Outcome Columns: Pattern B Sovereign Silos (`#fad2cf`, Step 4), Pattern A Pooled (`#feefc3`, Step 5), and Pattern C Hybrid PSC (`#e8eaed`, Step 6).',
        zonesIntro: `Figure 1 brings together the 2-question topology decision tree, the three operational pillars of the **Multi-Tenant Agentic Triad**, and the three side-by-side Pattern Outcome Columns ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)):`,
        zones: [
          { name: '1. The 2-Question Executive Topology Selector', colorLabel: 'Zone 1 — Top-left blue container `#aecbfa`', desc: 'Evaluates `Decision inputs` (`Tenant tier, compliance & pricing model`), `Q1 · Compliance gate` (`100% mandate VPC-SC or air-gap?`), and `Q2 · Tier gate` (`Multi-tier Standard + Enterprise?`) before branching into the three Pattern Outcome Columns.' },
          { name: '2. The Agentic Triad (80% reusable core)', colorLabel: 'Zone 2 — Top-right green container `#ceead6`', desc: 'Unifies `Pillar 1 • Zero-Trust 5-Hop` (`OBO/DPoP + Model Armor`), `Pillar 2 • Predictable FinOps` (`90% cache + Valkey cap`), and `Pillar 3 • Zero-PII OTel Chargeback` (`SDP -> BigQuery FinOps`) above the `AGENTIC TRIAD CORE` banner (`Shared across Pattern A, B & C`).' },
          { name: 'Pattern B — Sovereign Silos • $$$ • Terraform module 3.6', colorLabel: 'Outcome Column 1 — Left coral container `#fad2cf`', desc: 'Triggered by `Q1 = YES (100% regulated)`: provisions `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`).' },
          { name: 'Pattern A — Pooled • $ • Terraform module 2.6', colorLabel: 'Outcome Column 2 — Center amber container `#feefc3`', desc: 'Triggered by `Q2 = NO (Single tier)`: provisions `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`).' },
          { name: 'Pattern C — Hybrid PSC • $$ • Terraform module 4.6', colorLabel: 'Outcome Column 3 — Right slate container `#e8eaed`', desc: 'Triggered by `Q2 = YES (Multi-tier)`: provisions `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`).' }
        ],
        stepsIntro: `The seven numbered callouts in Figure 1 trace the 2-question decision flow and the three resulting pattern deployments:`,
        steps: [
          { title: 'Step 1 — Ingest decision inputs (Tenant tier, compliance & pricing model)', body: 'Evaluate the SaaS product\'s regulatory surface area, customer contract mandates, and pricing tier packaging.' },
          { title: 'Step 2 — Evaluate Q1 · Compliance gate (100% mandate VPC-SC or air-gap?)', body: 'If `Q1 = YES (100% regulated)`, route directly to **Pattern B — Sovereign Silos** (`Step 4`); if `Q1 = NO`, proceed to `Q2 · Tier gate` (`Step 3`).' },
          { title: 'Step 3 — Evaluate Q2 · Tier gate (Multi-tier Standard + Enterprise?)', body: 'If `Q2 = NO (Single tier)`, route to **Pattern A — Pooled** (`Step 5`); if `Q2 = YES (Multi-tier)`, route to **Pattern C — Hybrid PSC** (`Step 6`).' },
          { title: 'Step 4 — Deploy Pattern B Sovereign Silos (Terraform module 3.6)', body: 'Provision `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`).' },
          { title: 'Step 5 — Deploy Pattern A Pooled (Terraform module 2.6)', body: 'Provision `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`).' },
          { title: 'Step 6 — Deploy Pattern C Hybrid PSC (Terraform module 4.6)', body: 'Provision `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`).' },
          { title: 'Step 7 — Enforce the Agentic Triad Core across all patterns', body: 'Apply `Pillar 1 • Zero-Trust 5-Hop`, `Pillar 2 • Predictable FinOps`, and `Pillar 3 • Zero-PII OTel Chargeback` (`SDP -> BigQuery FinOps`) uniformly across Pattern A, Pattern B, and Pattern C.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Use the following decision rules ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)) to map your business model to the appropriate architecture:

- **Choose Pattern A (Pooled Architecture)** when you operate a uniform, high-volume B2B SaaS product where fast self-service onboarding, 90% shared prompt cache savings, and lowest unit COGS (\`120 RPM Pool\` baseline) are primary goals, and customers accept cryptographic/logical isolation within a shared project.
- **Choose Pattern B (Sovereign Silos)** when 100% of your customers are regulated financial, healthcare, or public-sector entities whose contracts prohibit shared compute pools or shared databases and mandate per-customer VPC Service Controls perimeters, customer-managed KMS kill-switches, or air-gapped Gemma 3 on GKE.
- **Choose Pattern C (Dynamic Hybrid)** when you sell multi-tiered SaaS packaging (such as a Standard tier alongside a regulated Enterprise tier) and need a single control plane that can promote live customers from the shared pool into dedicated Private Service Connect spokes with zero downtime.`,
    alternativesMd: `## Design alternatives

### End-to-end comparison of Pattern A, Pattern B, and Pattern C

The following executive matrix summarizes all 20 verified runtime simulations and architectural trade-offs across the three patterns:

| Architectural dimension | Pattern A: Pooled ([WS2](ws2-pattern-a-pooled-architecture.md)) | Pattern B: Sovereign Silos ([WS3](ws3-pattern-b-sovereign-silos.md)) | Pattern C: Dynamic Hybrid ([WS4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |
| :--- | :--- | :--- | :--- |
| **GCP project topology** | 1 shared project (\`cymbal-pooled-saas-prod\`) | 1 dedicated project per tenant (\`cymbal-{tenant}-silo-prod\`) | 1 hub project + shared pool + N dedicated PSC spoke projects |
| **80% reusable agent core** | \`core-cymbal-agent/\` (5-Hop Chain) | Unchanged \`core-cymbal-agent/\` + Sovereign Shell | Unchanged \`core-cymbal-agent/\` + Hybrid Router & Migrator |
| **Network isolation** | Shared VPC + Cloud Armor + IAP | Per-project **VPC-SC perimeter** + **mTLS SPIFFE** | Hub VPC + unidirectional **Private Service Connect (PSC)** NAT |
| **Database & memory isolation** | Shared AlloyDB **\`FORCE ROW LEVEL SECURITY\`** + composite memory keys | Dedicated **CMEK AlloyDB** & Memory Bank per project | Shared RLS for Standard + dedicated CMEK AlloyDB via PSC for Enterprise |
| **Encryption kill-switch** | Logical key check in Hop 3 | Project-wide **Cloud KMS CMEK** (\`HTTP 423 Locked\`) | Per-spoke **Cloud KMS CMEK** (\`HTTP 423 Locked\`) for Enterprise tier |
| **Model & caching strategy** | Shared Gemini 2.5 Pro + **90% \`ContextCacheConfig\` savings** | Dedicated Vertex AI PT or **air-gapped Gemma 3 (27B) on GKE** | Pooled caching for Standard + Dedicated Provisioned Throughput (\`gemini-2.5-pro-dedicated\`) for Enterprise |
| **Live tier upgrade path** | Requires migration to Pattern C | Static sovereign project | **Built-in 3-phase live migration** (\`0\` dropped turns) |
| **Baseline monthly cost floor** | **\`120 RPM Pool / mo\`** per tenant (\`$\`) | **\`600 RPM Silo / mo\`** per silo (\`$$$\`) | **\`Hybrid PSC / mo\`** blended across tiers (\`$$\`) |
| **Automated verification suite** | \`10/10\` red-team breach tests PASS | \`6/6\` sovereign security tests PASS | \`4/4\` hybrid & live migration tests PASS |

### The 5-Hop Cryptographic Context Chain invariant

Regardless of which topology you select, the same five governance modules in [\`core-cymbal-agent/governance/\`](../core-cymbal-agent/governance/) execute on every turn:

| Hop | Governance module | Security, FinOps, or observability invariant |
| :--- | :--- | :--- |
| **Hop 1** | [\`hop1_edge_identity_pep.py\`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Strips \`X-Tenant-ID\`; validates OIDC/Entra JWT; mints RFC 8693 OBO token bound to RFC 9449 DPoP \`jkt\` |
| **Hop 2** | [\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | Enforces Discovery Engine Catalog ACLs (\`403\` on private \`Agent Alpha\`) + ADK \`before_agent_callback\` tool pruning |
| **Hop 3** | [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | Binds \`temp:tenant_id\`; enforces Valkey RPM (\`429\`), token clamp (\`4k/8k\`), \`ContextCacheConfig\`, and CMEK (\`423\`) |
| **Hop 4** | [\`hop4_model_armor_guardrails.py\`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Runs bi-directional Model Armor (\`400\`/\`422\`) + Cloud DLP redaction + DPoP-bound 3LO MCP verification (\`401\`) |
| **Hop 5** | [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Enforces transactional AlloyDB \`FORCE ROW LEVEL SECURITY\` (\`SET LOCAL app.current_tenant_id\`) and exports PII-scrubbed OTel FinOps spans to BigQuery |`,
    considerationsMd: `## Design considerations

This section summarizes the **Multi-Tenant Agentic Triad** and maps it to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance (Pillar 1 of the Agentic Triad)

- **Defense-in-depth across all 5 hops:** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the \`core-cymbal-agent/\` compensating controls active until native sub-project \`tenant_id\` ACLs in Discovery Engine and native per-tenant \`ContextCacheConfig\` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.

### Cost optimization (Pillar 2 of the Agentic Triad)

- **Match infrastructure cost to customer ARR:** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and \`120 RPM Pool\` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.

### Operational excellence (Pillar 3 of the Agentic Triad)

- **Privacy-preserving FinOps observability:** Emit a \`TenantTelemetrySpan\` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery (\`cymbal_agentic_finops_otel.tenant_telemetry_spans\`)—with zero raw PII stored in logs.
- **Extend the 5-Hop core across Multi-Cloud (AWS) and 3P SaaS connectors:** When enterprise tenants invoke workloads spanning Google Cloud, AWS, and third-party SaaS platforms, map each hop to its verified cross-cloud equivalent:

| 5-Hop Governance Layer | Google Cloud Primary Control | AWS Federated Equivalent (\`Account 393036065405\`) | 3P SaaS & Identity Connector Control |
| :--- | :--- | :--- | :--- |
| **Hop 1 (Identity PEP)** | Cloud Armor + IAP + Cloud KMS DPoP sign | AWS STS \`AssumeRole\` + IAM Session Tags (\`TenantID\`) | Google Workspace OIDC & Microsoft Entra ID v2.0 JWT |
| **Hop 2 (Catalog PDP)** | Discovery Engine Catalog + ADK \`before_agent_callback\` | IAM Role Inline Policy Scoping per Tenant Tag | Per-tenant MCP connector allowlist in Firestore |
| **Hop 3 (Compute & CMEK)** | Vertex AI Agent Engine + Valkey + Cloud KMS CMEK (\`423\`) | AWS KMS Customer-Managed Key (\`ScheduleKeyDeletion\` kill-switch) | Scoped 3LO token vault (\`{tenant_id}:{connector_uri}\`) |
| **Hop 4 (AI Guardrails)** | Vertex AI Model Armor + Cloud SDP (\`400\`/\`422\`) | Amazon Bedrock Guardrails (\`ApplyGuardrail\` PII/Injection) | Pre-tool & post-tool DPoP \`jkt\` + PII scrub |
| **Hop 5 (Data RLS & OTel)** | AlloyDB \`SET LOCAL app.current_tenant_id\` + BigQuery OTel | DynamoDB \`LeadingKeys\` RLS (\`cymbal-multi-tenant-rls-vault\`) + S3 SSE-KMS | ThoughtSpot, Sigma, ServiceNow, Veeva/Muse, Salesforce/Jira, Databricks, Snowflake, Workday, Datadog & CrowdStrike/Okta MCP |

- **Live verification across 10 unique third-party SaaS, Lakehouse, ERP, Observability & SecOps products × all 3 Patterns (\`30/30 E2E Flows • 60/60 Test Cases PASS\` in [\`scripts/verify_5_third_party_saas_products.py\`](../scripts/verify_5_third_party_saas_products.py) & [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)):** Every external SaaS integration is governed by [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) and tested end-to-end across **Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid PSC & Live Tier Migration)**:

| # | Third-Party SaaS Product & MCP URI | Live Cloud Endpoint & Mechanism Tested | Pattern A (Pooled) • Pattern B (Sovereign Silo) • Pattern C (Hybrid PSC) E2E Verification (\`30/30 Flows • 60/60 Tests PASS\`) | Manual Self-Test CLI Command (\`--pattern all\`) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) • \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` | \`POST https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom\` (\`Server: ThoughtSpot\`) + Spotter \`runtime_filter\` -> BigQuery RLS | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: \`finvault-org-01\` returns strictly \`2\` FinVault rows (\`ENT-FV-001..002\`, \`0\` leaks); Cross-Org spoofing (\`retailstream\` -> \`finvault-org-01\`) blocked with **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern all --verbose\` |
| **2** | **Sigma Computing** (*Workbooks & Dataset API v2*) • \`mcp://cymbal/sigma-computing-workbooks-3lo\` | \`POST https://api.sigmacomputing.com/v2/auth/token\` (live \`requestId\`) + \`status.sigmacomputing.com\` (\`200\`) + \`ua_tenant_id\` warehouse RLS | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Live BigQuery pushdown returns strictly the caller's authorized rows (\`2\` FinVault or \`1\` RetailStream); Pattern A \`ua_tenant_id\` tampering -> **\`HTTP 403\`** & Pattern B/C revoked KMS CMEK key (\`medcore-revoked-cmek\`) -> **\`HTTP 423 Locked\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern all --verbose\` |
| **3** | **ServiceNow ITSM & ITOM** (*Change & Incident MCP*) • \`mcp://retailstream/servicenow-itom-3lo\` | Live **Amazon Bedrock AgentCore MCP Gateway** (\`merck-a2a-mcp-gateway-kiu8omh4aq\`) invoking \`query_servicenow_change_records\` (\`CHG0049218\`) | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Consented 3LO call fetches live \`CHG0049218\` (**\`HTTP 200\`**); unconsented 3LO call triggers Hop 5 **\`HTTP 401 CHALLENGE_3LO_OAUTH\`** (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern all --verbose\` |
| **4** | **Veeva Vault RIM & Muse Clinical EDC** (*GxP SaaS*) • \`mcp://finvault/veeva-muse-clinical-3lo\` | Live **AWS Bedrock AgentCore MCP Gateway** invoking \`query_muse_study_biomarkers\` (\`FV-GXP-2026-04\`) + Veeva Vault \`VV-DOC-004819\` | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Cloud KMS FDA 21 CFR Part 11 signature bound to tenant; unauthorized \`retailstream\` blocked at Hop 2 with **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --pattern all --verbose\` |
| **5** | **Salesforce Enterprise CRM & Atlassian Jira Cloud** • \`mcp://finvault/salesforce-jira-escalation-3lo\` | Live **Salesforce Trust API** (\`NA224\`, \`Winter '27 Patch 8.6\`, \`HTTP 200\`) + **Atlassian Jira Cloud API** (\`HTTP 200\`) | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Live \`NA224\` & Jira status verified; Hop 4 Egress Cloud SDP masks raw \`IBAN_CODE\` (\`[REDACTED-FINVAULT-IBAN]\`) & \`SWIFT_CODE\` (\`raw_pii_leaked=False\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --pattern all --verbose\` |
| **6** | **Databricks Data Intelligence Platform** (*Unity Catalog*) • \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` | \`GET https://community.cloud.databricks.com/api/2.0/clusters/list\` (\`Server: databricks\`, live \`[ReqId]\`) + \`cymbal_uc_prod.<tenant>_gold\` | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: \`cymbal_uc_prod.finvault_gold\` returns \`2\` FinVault rows (\`ENT-FV-001..002\`); cross-schema query & \`EXECUTE IMMEDIATE\` dynamic SQL blocked with **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern all --verbose\` |
| **7** | **Snowflake AI Data Cloud** (*Cortex Analyst & SQL v2*) • \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` | \`POST https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements\` (\`Server: SF-LB-T1\`) + \`status.snowflake.com\` (\`HTTP 200\`) | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Enforces \`ROLE_CYMBAL_RETAILSTREAM\` (\`row_count=1\`, \`ENT-RS-001\`) with \`SECONDARY_ROLES=NONE\`; \`USE SECONDARY ROLES ALL\` escalation blocked with **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern all --verbose\` |
| **8** | **Workday Enterprise HCM & Financial Management** • \`mcp://finvault/workday-hcm-financials-raas-3lo\` | \`POST https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token\` (live Workday CCX OAuth2 gateway) + Supervisory Org RaaS | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Hop 4 SDP masks \`US_SOCIAL_SECURITY_NUMBER\` (\`[REDACTED_US_SSN]\`); intra-tenant cross-principal 3LO token reuse blocked with **\`HTTP 401\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern all --verbose\` |
| **9** | **Datadog Cloud Observability & Bits AI SRE** • \`mcp://cymbal/datadog-observability-sre-3lo\` | \`GET https://api.datadoghq.com/api/v1/validate\` + \`status.datadoghq.com\` (\`Datadog US1\`, \`HTTP 200\`) + \`@tenant_id\` log index filter | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Tenant-pinned \`@tenant_id:finvault\` query verified; indirect prompt injection inside log stack trace blocked by Hop 4 Model Armor (**\`HTTP 400\`**) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern all --verbose\` |
| **10** | **CrowdStrike Falcon XDR & Okta Workforce Identity** • \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` | \`POST https://api.crowdstrike.com/oauth2/token\` (live Falcon \`meta.trace_id\`) + \`GET https://okta.okta.com/.well-known/openid-configuration\` (\`200\`) | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Live Falcon \`trace_id\` + Okta OIDC DPoP (\`dpop_jkt_fv_001\`) verified; stolen bearer replay -> **\`HTTP 401\`** & revoked CMEK -> **\`HTTP 423 Locked\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern all --verbose\` |

### Performance optimization

- **3-stage technical solution lifecycle & progressive tier evolution:**
  - **Stage 1 (Pattern A Pooled Foundation):** Deploy ` + '`core-cymbal-agent/`' + ` and Pattern A Pooled Architecture ([Workstream 2](ws2-pattern-a-pooled-architecture.md)).
  - **Stage 2 (Pattern B Sovereign Silo Stamp-Out):** Stamp out Pattern B Sovereign Silos via Terraform for regulated anchor customers ([Workstream 3](ws3-pattern-b-sovereign-silos.md)).
  - **Stage 3 (Pattern C Dynamic Hybrid & Zero-Downtime Promotion):** Enable the Pattern C Hybrid Router and 3-phase zero-downtime live tier migrator ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)).`,
    whatsNextMd: `## What's next

- Review the complete 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
- Explore the Workstream 5 capstone deliverables and complete program guide:
  - [5.1 Executive Pattern Comparison & Topology Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)
  - [1.4 Consolidated EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)
  - [Complete End-to-End Workstream & 14-Diagram Master Guide](../docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (\`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slide decks:
  - [Workstream 5 Editable Google Slides Deck (\`ws5-wrap-up-editable-slides.pptx\`)](../slides/ws5-wrap-up-editable-slides.pptx)
  - [All-in-One 25-Slide Master Presentation (\`geap-multi-tenancy-all-workstreams-editable-slides.pptx\`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx)`
  }
];
