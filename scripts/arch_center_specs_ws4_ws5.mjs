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
          { name: 'Dedicated Enterprise PSC Spoke (`psc://10.10.0.50/...`)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Serves Enterprise tenants (`FinVault Bank` and upgraded `RetailStream Corp`) across unidirectional Private Service Connect (`ServiceAttachment`) inside a dedicated VPC-SC perimeter with `8,000` thinking-token budgets, dedicated CMEK AlloyDB, and private `Agent Alpha` (`Gemini 2.5 Pro (Dedicated PT)`).' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 trace dynamic tier routing and cross-project PSC execution:`,
        steps: [
          { title: 'Unified SaaS request', body: 'Standard and Enterprise customers send HTTPS requests to the same public Cymbal SaaS hostname.' },
          { title: 'Hop 1 — Cryptographic identity verification and Firestore route lookup', body: 'IAP and the Edge PEP derive `ctx.tenant_id` from the JWT and look up the tenant\'s active route (`PATTERN_C_HYBRID_POOL` vs `PATTERN_C_HYBRID_PSC_SPOKE`) in Firestore.' },
          { title: 'Hop 2 — Federated Agent Catalog PDP and tool pruning', body: 'The hub catalog resolves both shared pool agents and federated PSC spoke agents, blocking cross-tenant calls (`HTTP 403`) and pruning unauthorized MCP tools.' },
          { title: 'Hop 4 (Pre-inference) — Model Armor and Cloud DLP inspection', body: 'Prompts and tool arguments pass through inline injection and PII guardrails before traversing either the pool or the PSC forwarding rule.' },
          { title: 'Hop 3 — Dynamic dispatch to Shared Pool (`pool://`) or PSC Spoke (`psc://`)', body: 'Standard tenants execute in the shared pool (`4,000` token cap); Enterprise tenants traverse the consumer PSC endpoint (`10.10.0.50`) into their dedicated spoke producer attachment (`8,000` token budget + CMEK verification).' },
          { title: 'Hop 4 (Post-inference) — Output DLP and tier-scoped 3LO MCP execution', body: 'Responses and 3LO MCP calls are validated against the caller\'s DPoP proof and NLC compliance rules.' },
          { title: 'Hop 5 — Tier-isolated persistence and unified BigQuery FinOps chargeback', body: 'Data persists in shared AlloyDB RLS (Standard) or dedicated CMEK AlloyDB (Enterprise), while redacted OTel spans stream to the hub BigQuery ledger.' }
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
          { name: 'RetailStream Promoted Enterprise PSC Spoke (`10.40.0.0/20` reused)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Demonstrates non-overlapping CIDR reuse: because PSC uses source NAT, every enterprise spoke can reuse `10.40.0.0/20` without IP exhaustion.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 2 trace packet flow across the Private Service Connect boundary:`,
        steps: [
          { title: 'Ingress at hub External Application Load Balancer', body: 'Traffic enters `cymbal-hybrid-hub-prod` over TLS 1.3 and passes Cloud Armor and IAP (`Hop 1`).' },
          { title: 'Cloud Run Router resolves PSC target URI', body: 'Firestore returns `psc://10.10.0.50/projects/cymbal-finvault-silo-prod/serviceAttachments/finvault-agent-spoke-psc`.' },
          { title: 'Direct VPC Egress to consumer PSC forwarding rule', body: 'The router sends the signed `CryptographicContext` to internal IP `10.10.0.50` inside the hub VPC.' },
          { title: 'Unidirectional PSC NAT traversal into producer spoke', body: 'Google Andromeda translates packet headers across the producer `ServiceAttachment` (`cymbal-psc-nat-us-west1`); the spoke cannot initiate reverse connections into the hub.' },
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
          { name: 'Spoke Provider (`google.spoke`) Sovereign Resources', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions isolated spoke VPCs, `cymbal-psc-nat-us-west1` NAT subnets, Internal ALBs, spoke Agent Engine runtimes, and CMEK AlloyDB clusters.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 4 trace the multi-project Terraform deployment:`,
        steps: [
          { title: 'Initialize `google.hub` and `google.spoke` Terraform providers', body: 'Configure provider aliases targeting `cymbal-hybrid-hub-prod` and `cymbal-{tenant}-spoke-prod`.' },
          { title: 'Provision hub VPC, Cloud Armor, IAP, andShared Pool', body: 'Deploy the shared Pattern A pool components inside the hub project.' },
          { title: 'Provision spoke VPC, PSC NAT subnet, and Internal ALB', body: 'Create the isolated spoke network and `/24` `PRIVATE_SERVICE_CONNECT` NAT subnet.' },
          { title: 'Publish spoke `google_compute_service_attachment`', body: 'Expose the spoke Internal ALB via a PSC producer attachment with `consumer_accept_lists` restricted to the hub project.' },
          { title: 'Create hub `google_compute_forwarding_rule` PSC endpoint', body: 'Bind a static internal IP (`10.10.0.50`) in the hub VPC to the spoke\'s `ServiceAttachment` URI.' },
          { title: 'Deploy Cloud Run Hybrid Router and Firestore route table', body: 'Configure the router with Direct VPC Egress and seed tenant routing rules.' },
          { title: 'Run 4-point hybrid and live-migration test suite', body: 'Execute `test_pattern_c_hybrid_and_migration.py` to validate routing, catalog isolation, and zero-downtime promotion.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern C is the recommended production architecture for multi-tiered B2B SaaS platforms ([4.1 Case Study & Solution Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)):

- **Tiered SaaS product packaging (Standard vs Enterprise):** Offer a low-cost self-service Standard tier on shared pooled infrastructure alongside a premium Enterprise tier with dedicated Google Cloud projects and customer-managed encryption keys—without maintaining two separate codebases or URLs.
- **Land-and-expand customer lifecycle with live upgrades:** Onboard new logos into the shared pool in seconds (**RetailStream Corp** at \`$42/mo\` floor) and promote them live into a dedicated PSC spoke (\`$1,850/mo\` spoke floor) when they sign an Enterprise expansion contract, with **zero downtime and zero lost chat history**.
- **Cross-project private agent federation:** Allow Enterprise customers (**FinVault Bank**) to run private custom agents (\`Agent Alpha\` on Gemini 2.5 Pro (Dedicated PT)) inside their isolated spoke while surfacing those agents seamlessly through the unified SaaS UI.`,
    alternativesMd: `## Design alternatives

### VPC Network Peering vs Private Service Connect (PSC) for hub-to-spoke connectivity

A critical architectural decision in Pattern C is how the central routing hub communicates with dozens or hundreds of isolated Enterprise tenant projects ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)):

| Networking dimension | Traditional VPC Network Peering | Private Service Connect (PSC) (\`ServiceAttachment\`) |
| :--- | :--- | :--- |
| **Scale & quota limits** | Caps out at 25 peered VPC networks per hub VPC | Scales to **hundreds of Enterprise tenant spokes** per hub VPC |
| **IP address management** | Requires globally non-overlapping CIDR blocks across all tenants | **NAT-based:** every spoke can reuse the exact same \`10.40.0.0/20\` CIDR |
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
    considerationsMd: `## Design considerations

This section provides guidance for operating Pattern C according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Index routing tables exclusively by cryptographically verified \`tenant_id\`:** In \`route_and_invoke()\`, always execute **Hop 1** (\`hop1.authenticate_and_mint_context()\`) before querying the Firestore route table so a client cannot spoof an HTTP header to route into another tenant's PSC spoke.
- **Scope tenant profiles per runtime instance:** Store \`tenant_profiles\` on \`self._tenant_profiles\` per runtime instance rather than mutating a global class dictionary, ensuring that promoting a tenant in one router instance never causes cross-instance state pollution.
- **Configure \`ACCEPT_MANUAL\` on all PSC ServiceAttachments:** Explicitly list only the hub project (\`cymbal-hybrid-hub-prod\`) in each spoke's \`consumer_accept_lists\` and set a connection limit to prevent unauthorized PSC attachment attempts.

### Reliability

- **Zero-downtime cutover via atomic Firestore transactions:** Perform all data synchronization (AlloyDB DMS CDC and Memory Bank dual-writes) during \`SHADOW_SYNC\` before flipping the single Firestore routing document in \`ATOMIC_CUTOVER\`.

### Cost optimization

- **Blend pooled and sovereign unit economics (\`$680/month\` blended floor):** Keep 80–90% of high-volume Standard customers in the shared pool (\`$42/mo\` floor with 90% \`ContextCacheConfig\` savings) while provisioning dedicated PSC spokes (\`$1,850/mo\`) only for high-ACV Enterprise contracts ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)).

### Operational excellence

- **Use dual-provider Terraform modules:** Manage the hub and spoke lifecycle in a single declarative graph using \`google.hub\` and \`google.spoke\` provider aliases ([4.6 Terraform Hybrid PSC Blueprint](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf)).

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
        captionDetail: 'Official Google Cloud Architecture Center hub-and-spoke synthesis showing the 2-Question Executive Topology Selector (Zone 1), the Multi-Tenant Agentic Triad & 80% Reusable 5-Hop Core (Zone 2), Pattern A Pooled & Pattern C Standard Pool Execution (Zone 3), and Pattern B Sovereign Silos & Pattern C Enterprise PSC Spokes (Zone 4).',
        zonesIntro: `Figure 1 brings together the decision tree and the three operational pillars of the **Multi-Tenant Agentic Triad** ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)):`,
        zones: [
          { name: 'Executive 2-Question Topology Selector and Ingress Gate', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Evaluates regulatory mandate (Question 1) and SaaS tier packaging (Question 2) alongside Hop 1 OIDC/DPoP authentication to route tenants to Pattern A, Pattern B, or Pattern C.' },
          { name: 'The Multi-Tenant Agentic Triad & 80% Reusable Core Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Unifies the three non-negotiable platform pillars—(1) Zero-Trust Security (`Hops 1, 2 & 4`), (2) Predictable FinOps (`Hop 3 ContextCacheConfig` + Valkey bulkheads), and (3) Privacy-Preserving Observability (`Hop 5` redacted OTel -> BigQuery).' },
          { name: 'High-Density Pooled Execution Path (Pattern A & Pattern C Standard)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Delivers `$42/mo` baseline unit economics with 90% shared prompt cache savings, `4,000` thinking-token caps, inline Model Armor + DLP, and shared AlloyDB `FORCE ROW LEVEL SECURITY`.' },
          { name: 'Sovereign Silo & Enterprise PSC Spoke Path (Pattern B & Pattern C Enterprise)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Delivers physical project isolation (`$1,850/mo` spoke floor), VPC-SC perimeters, IAM PAB, Cloud KMS CMEK `HTTP 423` kill-switches, air-gapped Gemma 3 on GKE, and 0-downtime PSC tier upgrades.' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 trace both the architectural selection flow and the invariant 5-Hop runtime execution:`,
        steps: [
          { title: 'Evaluate Question 1 (Regulatory mandate) and Question 2 (Tiered packaging)', body: 'Determine whether a tenant belongs in a shared pool (`Pattern A`), a dedicated sovereign project (`Pattern B`), or a dynamically routed hybrid topology (`Pattern C`).' },
          { title: 'Hop 1 — Authenticate caller and bind cryptographic context', body: 'Strip client headers in Cloud Armor and exchange the upstream Google OIDC or Microsoft Entra ID JWT for an RFC 9449 DPoP-bound `CryptographicContext`.' },
          { title: 'Hop 2 — Enforce catalog ACLs and deterministic tool pruning', body: 'Filter agents and MCP connectors in Discovery Engine and run ADK `before_agent_callback` pruning (`403 Forbidden` on unauthorized private agents).' },
          { title: 'Hop 4 (Pre-inference) — Apply inline Model Armor and Cloud DLP guardrails', body: 'Scan prompts and tool inputs for prompt injection (`400 Bad Request`) and mask sensitive PII before model invocation.' },
          { title: 'Hop 3 — Enforce FinOps bulkheads, `ContextCacheConfig`, and CMEK state', body: 'Enforce Valkey RPM limits (`429`), clamp `thinking_budget` (`4k` vs `8k`), verify KMS CMEK status (`423`), and invoke Gemini 2.5 Pro, Gemini 2.5 Pro (Dedicated PT), or Gemma 3.' },
          { title: 'Hop 4 (Post-inference) — Verify 3LO DPoP binding and NLC compliance', body: 'Validate sender-constrained 3LO tokens in Auth Manager (`401`) and block regulatory policy violations (`422`).' },
          { title: 'Hop 5 — Persist to RLS / CMEK data plane and emit BigQuery FinOps span', body: 'Write state to AlloyDB (`RLS` or dedicated `CMEK`) and stream PII-redacted token telemetry to BigQuery for per-tenant P&L tracking.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Use the following decision rules ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)) to map your business model to the appropriate architecture:

- **Choose Pattern A (Pooled Architecture)** when you operate a uniform, high-volume B2B SaaS product where fast self-service onboarding, 90% shared prompt cache savings, and lowest unit COGS (\`$42/mo\` baseline) are primary goals, and customers accept cryptographic/logical isolation within a shared project.
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
| **Model & caching strategy** | Shared Gemini 2.5 Pro + **90% \`ContextCacheConfig\` savings** | Dedicated Vertex AI PT or **air-gapped Gemma 3 (27B) on GKE** | Pooled caching for Standard + dedicated PT / Gemini 2.5 Pro (Dedicated PT) for Enterprise |
| **Live tier upgrade path** | Requires migration to Pattern C | Static sovereign project | **Built-in 3-phase live migration** (\`0\` dropped turns) |
| **Baseline monthly cost floor** | **\`$42 / mo\`** per tenant (\`$\`) | **\`$1,850 / mo\`** per silo (\`$$$\`) | **\`$680 / mo\`** blended across tiers (\`$$\`) |
| **Automated verification suite** | \`10/10\` red-team breach tests PASS | \`6/6\` sovereign security tests PASS | \`4/4\` hybrid & live migration tests PASS |

### The 5-Hop Cryptographic Context Chain invariant

Regardless of which topology you select, the same five governance modules in [\`core-cymbal-agent/governance/\`](../core-cymbal-agent/governance/) execute on every turn:

| Hop | Governance module | Security, FinOps, or observability invariant |
| :--- | :--- | :--- |
| **Hop 1** | [\`hop1_edge_identity_pep.py\`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Strips \`X-Tenant-ID\`; validates OIDC/Entra JWT; mints RFC 8693 OBO token bound to RFC 9449 DPoP \`jkt\` |
| **Hop 2** | [\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | Enforces Discovery Engine Catalog ACLs (\`403\` on private \`Agent Alpha\`) + ADK \`before_agent_callback\` tool pruning |
| **Hop 3** | [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | Binds \`temp:tenant_id\`; enforces Valkey RPM (\`429\`), token clamp (\`4k/8k\`), \`ContextCacheConfig\`, and CMEK (\`423\`) |
| **Hop 4** | [\`hop4_model_armor_guardrails.py\`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Runs bi-directional Model Armor (\`400\`/\`422\`) + Cloud DLP redaction + DPoP-bound 3LO MCP verification (\`401\`) |
| **Hop 5** | [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Enforces transactional AlloyDB \`FORCE ROW LEVEL SECURITY\` and exports PII-scrubbed OTel FinOps spans to BigQuery |`,
    considerationsMd: `## Design considerations

This section summarizes the **Multi-Tenant Agentic Triad** and maps it to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance (Pillar 1 of the Agentic Triad)

- **Defense-in-depth across all 5 hops:** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the \`core-cymbal-agent/\` compensating controls active until native sub-project \`tenant_id\` ACLs in Discovery Engine and native per-tenant \`ContextCacheConfig\` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.

### Cost optimization (Pillar 2 of the Agentic Triad)

- **Match infrastructure cost to customer ARR:** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and \`$42/mo\` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.

### Operational excellence (Pillar 3 of the Agentic Triad)

- **Privacy-preserving FinOps observability:** Emit a \`TenantTelemetrySpan\` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery—with zero raw PII stored in logs.

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
- Download or open the editable slide decks:
  - [Workstream 5 Editable Google Slides Deck (\`ws5-wrap-up-editable-slides.pptx\`)](../slides/ws5-wrap-up-editable-slides.pptx)
  - [All-in-One 26-Slide Master Presentation (\`geap-multi-tenancy-all-workstreams-editable-slides.pptx\`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx)`
  }
];
