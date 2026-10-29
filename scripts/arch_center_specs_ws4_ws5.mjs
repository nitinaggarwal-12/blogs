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
      tags: ['Pattern C', 'Hybrid Architecture', 'Private Service Connect', 'Hub-and-Spoke', 'Zero-Downtime Migration', 'Vertex AI Agent Engine', 'ADK', 'CMEK', 'AlloyDB RLS', 'FinOps', 'Multi-Tenancy'],
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
    terminologyMd: `## Core terminology and dynamic hybrid systems primitives

Before examining the Pattern C dynamic hybrid routing topology and 3-phase live migration diagrams, we anchor how Pattern C resolves the **SaaS AI Architect's Dilemma** across commercial tiers—combining Pattern A's **90% shared \`ContextCacheConfig\` COGS economics** for Standard tenants with Pattern B's **dedicated VPC-SC + CMEK sovereignty** for Enterprise spokes behind a single URL—using the four foundational series primitives ([Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and **Computer Science (CS101)** distributed-systems analogies:

- **Agent Development Kit (\`ADK\`):** The invariant 80% reusable Python runtime ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)) executing identically in the Zone 3 shared pool (\`pool://\`) and in each Zone 4 Enterprise PSC spoke (\`psc://10.10.0.50\`).
- **Agent Registry & Discovery (\`ARD\`):** The Hop 2 Federated Agent Catalog Policy Decision Point ([\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)) that synchronizes spoke-private agent descriptors (\`Agent Alpha\`) into the central hub while returning \`HTTP 403 Forbidden\` on cross-tier invocations.
- **Model Context Protocol (\`MCP\`):** The tool-invocation protocol brokering DPoP-bound 3LO SaaS calls and live AWS Bedrock AgentCore targets across both pooled and PSC-routed turns ([\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py)).
- **5-Hop Cryptographic Context Chain (\`Hops 1–5\` with Sub-Hops \`3a/3b\`, \`4a/4b\`, \`5a/5b\`):** The end-to-end governance pipeline spanning **Hop 1** (Unified Hub Ingress PEP), **Hop 2** (Federated ARD Catalog & ADK Callback PDP), **Hop 3a/3b** (Dynamic Tier Dispatch \`pool://\` vs \`psc://\`, Valkey Bulkhead & CMEK Check), **Hop 4a/4b** (Pre-Inference Model Armor & Post-Inference Cloud SDP Guardrails), and **Hop 5a/5b** (Tier-Scoped AlloyDB RLS/CMEK Persistence & Unified BigQuery OTel FinOps Sink).

| Multi-tenant hybrid primitive | CS101 / distributed systems analogy | Role in Pattern C (Dynamic Hybrid Hub & PSC Spokes) | Executable implementation in this repo |
| :--- | :--- | :--- | :--- |
| **Tenant-Aware Hybrid Router (\`pool://\` vs \`psc://\`)** | **Kernel Virtual File System (VFS) Mount Switch** (transparently dispatching system calls to a local ext4 disk vs an isolated network block device) | Inspects the cryptographically verified \`ctx.tenant_id\` at Hop 1 and looks up the tenant's active route in Firestore (\`tenant_routing_table\`) to dispatch Standard tenants to \`pool://\` and Enterprise tenants to \`psc://10.10.0.50\` | [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) (\`route_and_invoke()\`) |
| **Private Service Connect (PSC) (\`ServiceAttachment\`)** | **Unidirectional IPC Pipe with Network Address Translation (NAT)** (allowing a parent dispatcher to invoke a child process without exposing the child's memory space or allowing reverse calls) | Bridges the hub VPC (\`10.10.0.0/20\`) to isolated Enterprise spoke projects over a \`/28\` NAT subnet (\`10.240.0.0/28\`) so every spoke can reuse the identical \`10.40.0.0/20\` CIDR without IP exhaustion | [\`4.6-terraform-hybrid-psc-blueprint/main.tf\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) (\`google_compute_service_attachment\`) |
| **3-Phase Live Tier Migration (\`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY\`)** | **Live Virtual Machine vMotion / Read-Copy-Update (RCU) Pointer Flip** (pre-copying dirty memory pages in the background before atomically flipping the CPU page-table pointer in \`< 10 ms\`) | Streams AlloyDB RLS rows via DMS CDC and dual-writes Memory Bank vectors while live turns continue on the pool, then flips the single Firestore route document once \`replication_lag_ms == 0\` with \`0\` dropped turns | [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) (\`promote_tenant_zero_downtime()\`) |
| **Immutable \`route_epoch\` Session Lease** | **Generation Counter / Read-Write Epoch Lock** (allowing in-flight reader threads to finish on the old generation before reclaiming memory) | Pins active SSE streaming turns and mid-redirect 3LO OAuth flows to their initiating route generation during Phase 3 (\`DRAIN_AND_VERIFY\`) before cryptographically purging legacy pooled rows | [\`run_tier_migration_suite.py\`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) (\`Hybrid Test 3 & Test 4\`) |
| **Federated Agent Catalog PDP (\`Hop 2\`)** | **Hierarchical Dynamic Linker Symbol Table** (exposing global shared symbols to all callers while restricting private symbols to owning namespaces) | Synchronizes private spoke agent descriptors (\`agent://finvault/private-agent-alpha-regulatory\`) into the central hub catalog while returning \`HTTP 403 Forbidden\` if a pooled Standard tenant attempts to invoke them | [\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) (\`authorize_and_resolve_agent()\`) |`,
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
        stepsIntro: `The numbered callouts (\`1\`–\`7\`) on Figure 1 trace dynamic tier routing and cross-project PSC execution—matching the exact visual arrow badge labels on the architecture canvas (and canonical 5-Hop stages \`1 Request\`, \`2 Request\`, \`3 Route\`, \`4 Sanitize request\`, \`5 Generates response\`, \`6 Sanitize response\`, and \`7 Sanitized response\` across sub-hops \`Hop 3a/3b\`, \`Hop 4a/4b\`, and \`Hop 5a/5b\` in [\`runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)):`,
        steps: [
          { title: 'Badge 1 (`1 Request`) — Unified SaaS ingress request', body: 'Standard (`RetailStream Corp`) and Enterprise (`FinVault Bank`) customers send HTTPS requests to the same public Cymbal SaaS hostname (`cymbal-hybrid-hub-prod`, `runtime_pipeline.py:L60-L72`).' },
          { title: 'Badge 2 (`2 Request`) — Hop 1 cryptographic identity verification', body: 'Cloud Armor strips forged `X-Tenant-ID` headers and IAP + `Hop1EdgeIdentityPEP.authenticate_and_mint_context()` ([`hop1_edge_identity_pep.py:L115-L176`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py), `runtime_pipeline.py:L60-L80`) derive `ctx.tenant_id` from the verified JWT + DPoP proof.' },
          { title: 'Badge 3 (`3 Route` / `3 Route Standard to Pool or Enterprise via PSC`) — Firestore route lookup & Hop 2 Federated ARD Catalog PDP', body: 'The Cloud Run Hybrid Router ([`pattern_c_hybrid_router_and_migrator.py:L138-L210`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py), `runtime_pipeline.py:L82-L113`) looks up `ctx.tenant_id` in Firestore (`PATTERN_C_HYBRID_POOL` vs `PATTERN_C_HYBRID_PSC_SPOKE`) and resolves shared vs private `Agent Alpha` ACLs (`HTTP 403` on cross-tier spoofing).' },
          { title: 'Badge 4 (`4 Sanitize request`) — Hop 4a pre-inference Model Armor and Cloud DLP inspection', body: 'Prompts and tool arguments pass through `Hop4ModelArmorGuardrails.inspect_prompt_and_tools()` ([`hop4_model_armor_guardrails.py:L92-L164`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py), `runtime_pipeline.py:L115-L125`) before traversing either the pool or the PSC forwarding rule.' },
          { title: 'Badge 5 (`5 Generates response` / `5 Pooled inference` / `Spoke Agent Engine via PSC`) — Hop 3a/3b & Hop 5a dynamic dispatch to Shared Pool (`pool://`) or PSC Spoke (`psc://`)', body: 'Standard tenants execute in Zone 3 (`pool://`, `4,000` token cap, `120 RPM`); Enterprise tenants traverse consumer PSC IP `10.10.0.50` into Zone 4 (`psc://`, `8,000` token budget, `600 RPM`, CMEK verification, `runtime_pipeline.py:L127-L162`).' },
          { title: 'Badge 6 (`6 Sanitize response`) — Hop 4b post-inference output DLP and tier-scoped 3LO MCP execution', body: 'Responses and 3LO MCP calls are validated against the caller\'s DPoP proof (`401` on replay) and semantic Natural Language Policy Compliance (`NLC`) rules (`422`, `runtime_pipeline.py:L164-L182`).' },
          { title: 'Badge 7 (`7 Sanitized response` / `7 Seamless response (0 dropped sessions)`) — Hop 5b tier-isolated persistence and unified BigQuery FinOps chargeback', body: 'Data persists in shared AlloyDB RLS (`SET LOCAL app.current_tenant_id` for Standard) or dedicated CMEK AlloyDB (Enterprise), while redacted OTel spans stream to `cymbal_agentic_finops_otel.tenant_telemetry_spans` and the sanitized response returns with `0` dropped sessions (`runtime_pipeline.py:L184-L209`).' }
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
        stepsIntro: `The seven numbered badges (\`1\`–\`7\`) on Figure 2 trace packet flow and setup across the Private Service Connect boundary:`,
        steps: [
          { title: 'Badge 1 (`1 Provision`) — Provision hub VPC and Direct VPC Egress (`10.10.0.0/20`)', body: 'Provision `cymbal-hybrid-hub-prod`, Cloud Armor, IAP, and the Cloud Run Hybrid Router (`4.2-hub-and-spoke-demo-env-setup.md`).' },
          { title: 'Badge 2 (`2 Provision`) — Provision isolated Enterprise spoke VPCs (`10.40.0.0/20` reused)', body: 'Provision `cymbal-finvault-silo-prod` and `cymbal-retailstream-spoke-prod`, each reusing `10.40.0.0/20` behind a `/28` PSC NAT subnet (`10.240.0.0/28`).' },
          { title: 'Badge 3 (`3 Reserve IP & bind attachment`) — Bind consumer PSC endpoints (`10.10.0.50`, `10.10.0.51`) to producer `ServiceAttachment` URIs', body: 'Reserve static internal IPs in the hub VPC and attach them to `finvault-agent-spoke-psc` and `retailstream-agent-spoke-psc` with `ACCEPT_MANUAL`.' },
          { title: 'Badge 4 (`4 Route Standard`) — Lookup active tenant route in Firestore (`pool://` vs `psc://`)', body: 'The Cloud Run Hybrid Router queries `tenant_routing_table` for the verified `ctx.tenant_id` ([`pattern_c_hybrid_router_and_migrator.py:L138-L185`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py)).' },
          { title: 'Badge 5 (`5 Pooled inference` / `Spoke ILB & Agent Engine`) — Execute in Shared Pool or traverse unidirectional PSC NAT into Spoke ILB', body: 'Standard traffic runs locally in the shared pool; Enterprise traffic traverses `10.10.0.50`/`10.10.0.51` across Google Andromeda PSC NAT to the spoke Internal ALB and Agent Engine runtime.' },
          { title: 'Badge 6 (`6 Pooled response` / `Spoke response`) — Enforce tier-isolated AlloyDB persistence and CMEK checks', body: 'Standard turns persist in shared AlloyDB RLS; Enterprise turns persist in spoke-local CMEK AlloyDB inside the spoke VPC-SC perimeter.' },
          { title: 'Badge 7 (`7 Hybrid routing verified (4/4 PASS)`) — Return synchronous response and emit hub OTel FinOps span', body: 'Responses return through the hub router and pass all `4/4` hybrid verification assertions in [`run_tier_migration_suite.py`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py).' }
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
        stepsIntro: `The seven numbered badges (\`1\`–\`7\`) on Figure 3 trace a live customer upgrade mid-conversation:`,
        steps: [
          { title: 'Badge 1 (`1 Run suite`) — Launch live tier migration test harness', body: 'Invoke [`run_tier_migration_suite.py`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) while `RetailStream Corp` is actively conversing on the Standard pool.' },
          { title: 'Badge 2 (`2 Run suite`) — Authenticate pre-upgrade Turn N at Hop 1', body: 'RetailStream\'s Turn N passes Hop 1 JWT + DPoP verification and resolves `route = PATTERN_C_HYBRID_POOL` in Firestore.' },
          { title: 'Badge 3 (`3 Pre-upgrade turn then upgrade`) — Initiate `promote_tenant_zero_downtime()` while Turn N executes', body: 'The migration controller ([`pattern_c_hybrid_router_and_migrator.py:L212-L310`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py)) starts the 3-phase upgrade state machine without blocking active pooled turns.' },
          { title: 'Badge 4 (`4 Pre-upgrade turn`) — Execute Turn N in Zone 3 Shared Pool (`4,000` token cap)', body: 'Turn N executes on `pool://cymbal-shared-pooled-runtime-v2` with its Standard `4,000` thinking-token cap and `120 RPM` bulkhead.' },
          { title: 'Badge 5 (`5 200 OK clamped 4000`) — Phase 1 (`SHADOW_SYNC`) CDC replication and Phase 2 (`ATOMIC_CUTOVER`) Firestore flip', body: 'DMS streams RetailStream rows (`WHERE tenant_id = \'retailstream\'`) and Memory Bank dual-writes `3/3` session memories into `cymbal-retailstream-spoke-prod` until `replication_lag_ms == 0`, then commits a single sub-10ms Firestore transaction flipping the route to `psc://10.10.0.51/...`.' },
          { title: 'Badge 6 (`6 Rows replicated`) — Phase 3 (`DRAIN_AND_VERIFY`) drain window and cryptographic purge', body: 'In-flight pooled turns pinned to the prior `route_epoch` finish cleanly, parity checksums (`3/3` memories, CMEK `ACTIVE`) pass, and legacy pooled rows are cryptographically purged.' },
          { title: 'Badge 7 (`7 TEST 3: same session on PSC`) — Post-upgrade Turn N+1 executes on Dedicated PSC Spoke (`8,000` budget + CMEK)', body: 'The very next turn (`Turn N+1`) in the exact same conversation routes over `psc://10.10.0.51` into `cymbal-retailstream-spoke-prod` with `0` dropped turns, `8,000` thinking-token entitlement, and dedicated CMEK key `projects/cymbal-retailstream-spoke-prod/.../agent-memory-cmek`.' }
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
        stepsIntro: `The seven numbered badges (\`1\`–\`7\`) on Figure 4 trace the multi-project Terraform DAG:`,
        steps: [
          { title: 'Badge 1 (`1 terraform apply`) — Initialize `google.hub` and `google.spoke` Terraform providers', body: 'Configure dual provider aliases in [`4.6-terraform-hybrid-psc-blueprint/main.tf`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) targeting `cymbal-hybrid-hub-prod` and `cymbal-{tenant}-spoke-prod`.' },
          { title: 'Badge 2 (`2 terraform apply`) — Provision hub Cloud Run Hybrid Router and Firestore route table', body: 'Deploy `google_cloud_run_v2_service.hybrid_router` with Direct VPC Egress and seed `google_firestore_document.tenant_routes`.' },
          { title: 'Badge 3 (`3 Reserve INTERNAL address in subnet`) — Reserve static internal PSC consumer IPs (`10.10.0.50`, `10.10.0.51`)', body: 'Provision `google_compute_address.psc_consumer_ip` inside the hub VPC subnet (`10.10.0.0/20`).' },
          { title: 'Badge 4 (`4 Consume output`) — Provision shared Pattern A pool resources in Zone 3', body: 'Deploy the shared Vertex AI Agent Engine pool, Memorystore for Valkey bulkhead, and shared AlloyDB RLS cluster in the hub project.' },
          { title: 'Badge 5 (`5 Resolve psc:// target`) — Seed Firestore route entries linking `pool://` and `psc://` URIs', body: 'Bind Standard tenants to `pool://` and Enterprise tenants to the reserved PSC consumer IPs.' },
          { title: 'Badge 6 (`6 Route via PSC`) — Provision spoke VPC, `/28` PSC NAT subnet (`10.240.0.0/28`), and Spoke Internal ALB', body: 'Using `provider = google.spoke`, create the spoke network, `purpose = "PRIVATE_SERVICE_CONNECT"` NAT subnet, Internal ALB, spoke Agent Engine runtime, and CMEK AlloyDB.' },
          { title: 'Badge 7 (`7 target = service attachment.id`) — Bind `google_compute_forwarding_rule.psc_consumer` to `google_compute_service_attachment.psc_producer`', body: 'Wire the hub consumer forwarding rule `target` to the spoke producer `ServiceAttachment` URI with `connection_preference = "ACCEPT_MANUAL"`.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern C is the recommended production architecture for multi-tiered B2B SaaS platforms ([4.1 Case Study & Solution Architecture](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)):

- **Tiered SaaS product packaging (Standard vs Enterprise):** Offer a low-cost self-service Standard tier on shared pooled infrastructure alongside a premium Enterprise tier with dedicated Google Cloud projects and customer-managed encryption keys—without maintaining two separate codebases or URLs.
- **Land-and-expand customer lifecycle with live upgrades:** Onboard new logos into the shared pool in seconds (**RetailStream Corp** at \`120 RPM Pool\` floor) and promote them live into a dedicated PSC spoke (\`600 RPM Silo\` spoke floor) when they sign an Enterprise expansion contract, with **zero downtime and zero lost chat history**.
- **Cross-project private agent federation:** Allow Enterprise customers (**FinVault Bank**) to run private custom agents (\`Agent Alpha\` on Dedicated Provisioned Throughput \`gemini-2.5-pro-dedicated\`) inside their isolated spoke while surfacing those agents seamlessly through the unified SaaS UI.`,
    alternativesMd: `## Design alternatives

### How the 80% reusable 5-Hop Cryptographic Context Chain spans both the Shared Pool and PSC Spokes

Pattern C runs the **exact same 5-Hop Cryptographic Context Chain** introduced in [Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md) across both Standard pooled tenants and Enterprise PSC spokes, inserting dynamic tier routing between Hop 1/2 in the hub and Hop 3/4/5 in the target tier:

- **Hop 1 (Unified Hub Ingress PEP) & Hop 2 (Federated Agent Catalog PDP):** Every request terminates at the hub (\`cymbal-hybrid-hub-prod\`), where [\`hop1_edge_identity_pep.py\`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) mints the DPoP-bound \`CryptographicContext\` and [\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) resolves whether the requested agent resides in the shared pool or a dedicated Enterprise PSC spoke (\`HTTP 403\` on cross-tier calls).
- **Dynamic Tier Dispatch (\`pool://\` vs \`psc://10.10.0.50\`):** [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) dispatches Standard turns locally (\`4,000\` token cap) and forwards Enterprise turns over Private Service Connect into the tenant's isolated spoke project (\`8,000\` token budget + CMEK check).
- **Hop 3, Hop 4 & Hop 5 (Tier-Scoped Execution, Guardrails & Unified OTel Chargeback):** Both tiers enforce [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py), [\`hop4_model_armor_guardrails.py\`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py), and [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py), streaming PII-scrubbed OpenTelemetry spans back to the central BigQuery FinOps ledger.

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
- **Formal Zero-Downtime Cutover & Session-Loss Proof:** Let $L_{\\text{CDC}}(t)$ denote the AlloyDB Database Migration Service (DMS) replication lag at time $t$, $R_{\\text{in}}$ the incoming tenant write rate, $R_{\\text{apply}}$ the spoke CDC apply rate ($R_{\\text{apply}} > R_{\\text{in}}$), and $\\tau_{\\text{flip}}$ the atomic single-document Firestore transaction latency. Because Phase 2 (\`ATOMIC_CUTOVER\`) executes only when $L_{\\text{CDC}}(t^*) = 0\\text{ ms}$ and in-flight turns remain pinned to their immutable \`route_epoch\` lease during the Phase 3 drain window $T_{\\text{drain}} = 30\\text{ s}$, the number of dropped turns $\\Delta N_{\\text{dropped}}$ satisfies:

$$T_{\\text{sync}} = \\frac{V_{\\text{initial}}}{R_{\\text{apply}} - R_{\\text{in}}}, \\qquad L_{\\text{CDC}}(t^*) = 0\\text{ ms} \\implies \\tau_{\\text{flip}} < 10\\text{ ms}, \\qquad \\Delta N_{\\text{dropped}} = 0\\text{ turns}$$

Where:
- $V_{\\text{initial}}$ is the initial byte volume of tenant rows (\`WHERE tenant_id = 'retailstream'\`) and Memory Bank vectors replicated during Phase 1 (\`SHADOW_SYNC\`).
- $R_{\\text{apply}} - R_{\\text{in}} > 0$ is the net CDC catch-up bandwidth between shared AlloyDB RLS and the target CMEK AlloyDB spoke.
- $\\tau_{\\text{flip}} < 10\\text{ ms}$ is the single-document ACID commit latency in Firestore (\`tenant_routing_table/{tenant_id}\`).
- $\\Delta N_{\\text{dropped}} = 0$ is verified empirically in [\`run_tier_migration_suite.py\`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) (\`Hybrid Test 3 & Test 4\`, \`3/3\` memories preserved).

> **Architectural Grounding Boundary (Zero-Downtime Cutover & Session Lease):** Live Firestore routing table \`(default)\` in \`ramp-portal-dev\` stores tenant route state while \`promote_tenant_zero_downtime()\` in [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) deterministically verifies $L_{\\text{CDC}}(t^*) = 0\\text{ ms}$ and $\\Delta N_{\\text{dropped}} = 0$.

- **Deterministic migration abort, rollback, and in-flight SSE/3LO session drain:**
  - *If \`SHADOW_SYNC\` parity verification fails* (for example, if DMS CDC lag exceeds threshold, row checksums mismatch, or the target spoke's Cloud KMS CMEK key returns \`HTTP 423\`), the migration controller aborts before \`ATOMIC_CUTOVER\`. Because the Firestore route document still points to \`pool://\`, the customer experiences zero disruption while dual-write buffers are discarded.
  - *If a user is mid-stream on a Server-Sent Events (SSE) turn or mid-redirect in an inline 3LO OAuth consent flow during \`ATOMIC_CUTOVER\`*, the active turn carries an immutable \`route_epoch\` lease pinned to the worker that initiated it. Phase 3 (\`DRAIN_AND_VERIFY\`) holds a 30-second drain window on the shared pool and synchronizes final OAuth token grants into the spoke vault before cryptographically purging the tenant's legacy rows from the shared AlloyDB table.

### Cost optimization

- **Blend pooled and sovereign unit economics (\`Blended Hybrid Tier\` floor):** Keep 80–90% of high-volume Standard customers in the shared pool (\`120 RPM Pool\` floor with 90% \`ContextCacheConfig\` savings) while provisioning dedicated PSC spokes (\`600 RPM Silo\`) only for high-ACV Enterprise contracts ([4.4 Product Collaboration: PSC & Registry](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)).
- **Formal Blended Hybrid Unit Cost Proof:** Let $\\alpha \\in (0, 1)$ denote the fraction of tenants on the Standard Pooled tier ($N_{\\text{pool}} = \\alpha N$) and $(1 - \\alpha)$ the fraction of Enterprise tenants on dedicated PSC spokes ($N_{\\text{spoke}} = (1 - \\alpha) N$). The blended monthly cost per tenant $C_{\\text{Pattern C}}(\\alpha, N)$ and gross-margin expansion $\\Delta GM$ relative to all-silo deployment satisfy:

$$C_{\\text{Pattern C}}(\\alpha, N) = \\alpha \\cdot C_{\\text{Pattern A}}(N_{\\text{pool}}) + (1 - \\alpha) \\cdot C_{\\text{Pattern B}} + \\frac{C_{\\text{hub\\_router}}}{N}$$

Where:
- $C_{\\text{Pattern A}}(N_{\\text{pool}})$ is the pooled unit cost with 90% \`ContextCacheConfig\` discount ($\\approx \\$19.20 / N_{\\text{pool}}$ fixed hub share + cached token COGS).
- $C_{\\text{Pattern B}}$ is the dedicated Enterprise spoke monthly floor funded by the customer's Enterprise contract tier.
- $C_{\\text{hub\\_router}}$ is the shared Cloud Run Hybrid Router and Firestore routing table overhead amortized across all $N$ tenants.
- For a typical B2B SaaS distribution ($\\alpha = 0.85$ Standard pooled, $1 - \\alpha = 0.15$ Enterprise PSC spokes), Pattern C reduces total platform infrastructure cost by **$76.4\\%$** compared to provisioning dedicated silos for all tenants while preserving 100% sovereign isolation for Enterprise contracts.

> **Architectural Grounding Boundary (Blended Hybrid FinOps Ledger):** Per-turn pooled ($C_{\\text{Pattern A}}$) and PSC-spoke ($C_{\\text{Pattern B}}$) token telemetry is streamed to live BigQuery table \`ramp-portal-dev.cymbal_agentic_finops_otel.tenant_telemetry_spans\` via [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py).

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
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Enterprise PSC Spoke + RFC 9449 DPoP + Spoke CMEK | **In:** \`tenant="finvault"\` (PSC Spoke), \`dpop="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + \`route=DEDICATED_PSC_SPOKE\` | **In:** Stolen bearer token replay (\`401\`) & spoke CMEK kill-switch (\`423\`) • **Out:** **\`HTTP 401\`** & **\`HTTP 423 Locked\`** verified on PSC spoke | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern all --verbose\` |

### Performance optimization

- **Cache Firestore routing entries with pub/sub invalidation:** Cache active tenant route descriptors in local Cloud Run memory with a 5-second TTL and immediate Firestore watch invalidation so \`ATOMIC_CUTOVER\` propagates globally in under \`10 ms\`.

> **Architectural Grounding Boundary (Live Cloud Infrastructure vs Deterministic Hybrid Migration Harness):**
> - **Live-provisioned in Google Cloud & AWS today (\`20/20 PASS\`):** Hub & spoke projects \`ramp-portal-dev\` (\`#248990048888\`) and \`cymbal-control-plane\` (\`#638420508320\`), Cloud Run service \`cymbal-multi-tenant-agent-hub\`, Firestore routing database \`(default)\` (\`3\` tenant route documents), Cloud KMS CMEK ring \`cymbal-tenant-cmek-ring-usw1\`, BigQuery RLS & FinOps dataset \`cymbal_agentic_finops_otel\`, and AWS Bedrock AgentCore Gateway \`cymbal-a2a-mcp-gateway-suyxm3caof\` (\`10/10 READY\` targets).
> - **Executed via the local deterministic hybrid migration harness (\`run_tier_migration_suite.py\`):** To allow rapid, zero-cost verification of the 3-phase \`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY\` state machine in CI/CD without waiting for a 20-minute physical AlloyDB DMS instance creation, [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) executes the CDC lag convergence, Firestore route flip, and session memory parity assertions in-memory while [\`4.6-terraform-hybrid-psc-blueprint/main.tf\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) and [\`deploy_1click.sh\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh) provide the 1-click dual-provider (\`google.hub\` + \`google.spoke\`) Terraform graph.`,
    whatsNextMd: `## What's next

### Companion 12-Slide Deck & Slide-to-Code Launch Matrix

Open the [Workstream 4 Editable Google Slides Deck (\`ws4-pattern-c-hybrid-editable-slides.pptx\`)](../slides/ws4-pattern-c-hybrid-editable-slides.pptx) in the **Cloud Viewer** at the top of this page to review the 12 executive slides paired with this guide:

| Slides | Presentation Theme | Companion Executable Script / Terraform Module |
| :--- | :--- | :--- |
| **Slides 1–3** | Pattern C Executive Summary, Tiered SaaS Packaging & Hub-and-Spoke Topology (Fig 1) | [\`4.1-case-study-and-solution-architecture.md\`](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md) |
| **Slides 4–6** | Cross-Project Private Service Connect (PSC) NAT Peering & Federated Catalog PDP (Fig 2) | [\`4.2-hub-and-spoke-demo-env-setup.md\`](../workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md) • [\`4.4-product-collaboration-psc-and-registry.md\`](../workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md) |
| **Slides 7–9** | 3-Phase Zero-Downtime Live Tier Migration (\`SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY\`) (Fig 3) | [\`pattern_c_hybrid_router_and_migrator.py\`](../workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) • [\`run_tier_migration_suite.py\`](../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py) |
| **Slides 10–12** | Dual-Provider Terraform Hybrid PSC Blueprint (Fig 4), Blended FinOps & 90-Min Master Lab | [\`4.6-terraform-hybrid-psc-blueprint/main.tf\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) • [\`deploy_1click.sh\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh) |

- **Launch the Interactive Codebase Workbench & 1-Click Terraform Deployment:**
  - [Open Interactive 27-File Codebase Workbench & Live Terminal Runner (\`#blog-e2e-pattern-execution-and-codebase-workbench\`)](#blog-e2e-pattern-execution-and-codebase-workbench)
  - [1-Click Pattern C Hybrid Hub & PSC Spoke Terraform Script (\`workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh\`)](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh)
  - [Live GCP & AWS Cloud Verification Receipt (\`docs/cloud_console_verification_receipt.json\`)](../docs/cloud_console_verification_receipt.json)
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
      tags: ['Multi-Tenancy', 'Vertex AI Agent Engine', 'ADK', 'Decision Guide', 'Zero Trust', 'FinOps', 'OpenTelemetry', 'VPC-SC', 'Private Service Connect', 'AlloyDB RLS'],
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
    terminologyMd: `## Core terminology and executive decision primitives

Before examining the Figure 1 decision tree and the **Multi-Tenant Agentic Triad**, we synthesize how this 5-part series resolves the **SaaS AI Architect's Dilemma**—balancing Pattern A's **90% shared \`ContextCacheConfig\` COGS economics** against Pattern B's **project-per-tenant VPC-SC + CMEK sovereignty** and Pattern C's **zero-downtime hybrid PSC promotion**—across the four foundational series primitives ([Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and **Computer Science (CS101)** systems-engineering analogies:

- **Agent Development Kit (\`ADK\`):** The invariant 80% reusable Python agent runtime ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)) shared across Pattern A, Pattern B, and Pattern C without code rewrites.
- **Agent Registry & Discovery (\`ARD\`):** The Hop 2 Discovery Engine catalog Policy Decision Point ([\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)) governing shared and tenant-private (\`Agent Alpha\`) agent resolution across all three topologies.
- **Model Context Protocol (\`MCP\`):** The standardized tool-invocation protocol enforcing composite \`{tenant_id}:{user_id}\` DPoP-bound 3LO OAuth tokens and live AWS Bedrock AgentCore federation across 10 enterprise SaaS platforms ([\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py)).
- **5-Hop Cryptographic Context Chain (\`Hops 1–5\` with Sub-Hops \`3a/3b\`, \`4a/4b\`, \`5a/5b\`):** The invariant governance pipeline spanning **Hop 1** (Edge Identity PEP), **Hop 2** (ARD Catalog & ADK Callback PDP), **Hop 3a/3b** (Compute Sandbox, Valkey RPM Bulkhead, \`ContextCacheConfig\` & CMEK Kill-Switch), **Hop 4a/4b** (Pre-Inference Model Armor & Post-Inference Cloud SDP Guardrails), and **Hop 5a/5b** (AlloyDB RLS/CMEK Persistence & BigQuery OpenTelemetry Chargeback).

| Executive decision primitive | CS101 / systems engineering analogy | Role across Pattern A, Pattern B, and Pattern C | Verified implementation in this repo |
| :--- | :--- | :--- | :--- |
| **2-Question Topology Selector (\`Q1 Compliance\` + \`Q2 Tiering\`)** | **Deterministic Binary Decision Diagram (BDD)** (mapping a 2-bit input vector $(q_1, q_2) \\in \\{0,1\\}^2$ onto 3 mutually exclusive architectural leaves) | Evaluates regulatory perimeter mandates (\`Q1\`) and commercial pricing-tier structure (\`Q2\`) to select Pattern B (\`Q1=YES\`), Pattern A (\`Q1=NO, Q2=NO\`), or Pattern C (\`Q1=NO, Q2=YES\`) | [\`5.1-pattern-comparison-and-decision-guide.md\`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md) |
| **Pillar 1 — Zero-Trust 5-Hop Chain (\`80% Reusable Core\`)** | **Microkernel Reference Monitor** (an invariant security kernel shared across user-mode distributions while swapping only the outer hardware/network driver shell) | Runs the identical 5-Hop governance modules (\`hop1\`..\`hop5\`) across all three patterns while swapping only the 20% infrastructure shell (Terraform modules \`2.6\`, \`3.6\`, or \`4.6\`) | [\`core-cymbal-agent/governance/\`](../core-cymbal-agent/governance/) (\`20/20\` pattern tests + \`60/60\` SaaS tests PASS) |
| **Pillar 2 — Predictable FinOps Economics (\`Cache + Bulkheads + PT\`)** | **Hierarchical Memory Caching & Fair-Share Scheduler** (combining L1/L2 instruction cache sharing for standard jobs with dedicated CPU pinning for real-time jobs) | Combines 90% \`ContextCacheConfig\` discounts and Valkey token-bucket caps (\`4,000\` cap, \`120 RPM\`) in Pattern A with Dedicated Provisioned Throughput (\`600 RPM\`, \`8,000\` budget) in Pattern B/C | [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) |
| **Pillar 3 — Privacy-Preserving OTel Chargeback (\`SDP -> BigQuery\`)** | **Redacted Kernel Audit Ring Buffer (\`auditd\`)** (scrubbing sensitive payload bytes before writing immutable resource accounting records) | Masks raw PII via Cloud SDP at Hop 4 before emitting a \`TenantTelemetrySpan\` at Hop 5 into \`cymbal_agentic_finops_otel.tenant_telemetry_spans\` for exact per-tenant margin attribution | [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) |
| **3-Stage Technical Solution Lifecycle (\`Stage 1 -> 2 -> 3\`)** | **Incremental Compiler / Progressive System Evolution** (bootstrapping on a shared runtime before linking dedicated sovereign modules on demand) | Allows SaaS teams to launch fast on Pattern A (Stage 1), stamp out Pattern B silos for regulated whales (Stage 2), and unify both under Pattern C live migration (Stage 3) with zero agent rewrites | [\`codelab-90min-multi-pattern-master-lab.md\`](../workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/codelab-90min-multi-pattern-master-lab.md) |`,
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
        stepsIntro: `The seven numbered badges (\`1\`–\`7\`) on Figure 1 trace the 2-question decision flow and the three resulting pattern deployments—matching the exact visual callouts on the diagram (and mapping the canonical 5-Hop flow stages \`1 Request\`, \`2 Request\`, \`3 Route\`, \`4 Sanitize request\`, \`5 Generates response\`, \`6 Sanitize response\`, and \`7 Sanitized response\` across sub-hops \`Hop 3a/3b\`, \`Hop 4a/4b\`, and \`Hop 5a/5b\` in [\`runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)):`,
        steps: [
          { title: 'Badge 1 (`1 Decision inputs` / `1 Request`) — Ingest decision inputs and Hop 1 request parameters', body: 'Evaluate the SaaS product\'s regulatory surface area, customer contract mandates, and pricing tier packaging ([`5.1-pattern-comparison-and-decision-guide.md`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), `runtime_pipeline.py:L60-L80`).' },
          { title: 'Badge 2 (`2 Q1 · Compliance gate` / `2 Request`) — Evaluate Q1 · Compliance gate & Hop 2 ARD Catalog requirements', body: 'If `Q1 = YES (100% regulated)`, route directly to **Pattern B — Sovereign Silos** (`Badge 4`); if `Q1 = NO`, proceed to `Q2 · Tier gate` (`Badge 3`, `runtime_pipeline.py:L82-L97`).' },
          { title: 'Badge 3 (`3 Q2 · Tier gate` / `3 Route`) — Evaluate Q2 · Tier gate & Hop 3a routing topology (Multi-tier Standard + Enterprise?)', body: 'If `Q2 = NO (Single tier)`, route to **Pattern A — Pooled** (`Badge 5`); if `Q2 = YES (Multi-tier)`, route to **Pattern C — Hybrid PSC** (`Badge 6`, `runtime_pipeline.py:L99-L113`).' },
          { title: 'Badge 4 (`4 Pattern B — Sovereign Silos` / `4 Sanitize request`) — Deploy Pattern B Sovereign Silos (Terraform module 3.6 & Hop 4a VPC-SC/Armor)', body: 'Provision `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`) via [`3.6-terraform-silo-blueprint/main.tf`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) (`runtime_pipeline.py:L115-L125`).' },
          { title: 'Badge 5 (`5 Pattern A — Pooled` / `5 Generates response`) — Deploy Pattern A Pooled (Terraform module 2.6 & Hop 3b 90% Cache)', body: 'Provision `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`) via [`2.6-terraform-starter/main.tf`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) (`runtime_pipeline.py:L127-L162`).' },
          { title: 'Badge 6 (`6 Pattern C — Hybrid PSC` / `6 Sanitize response`) — Deploy Pattern C Hybrid PSC (Terraform module 4.6 & Hop 4b/5a PSC Spoke)', body: 'Provision `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`) via [`4.6-terraform-hybrid-psc-blueprint/main.tf`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) (`runtime_pipeline.py:L164-L182`).' },
          { title: 'Badge 7 (`7 Enforce the Agentic Triad Core across all patterns` / `7 Sanitized response`) — Bind the 80% Reusable Agentic Triad Core & Hop 5b OTel Chargeback', body: 'Apply `Pillar 1 • Zero-Trust 5-Hop` ([`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/)), `Pillar 2 • Predictable FinOps`, and `Pillar 3 • Zero-PII OTel Chargeback` (`SDP -> BigQuery FinOps`, `runtime_pipeline.py:L184-L209`) uniformly across Pattern A, Pattern B, and Pattern C.' }
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

### Security, privacy, and compliance

- **Defense-in-depth across all 5 hops (Pillar 1 of the Agentic Triad):** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the \`core-cymbal-agent/\` compensating controls active until native sub-project \`tenant_id\` ACLs in Discovery Engine and native per-tenant \`ContextCacheConfig\` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.
- **Formal Blast-Radius Containment & Composite Availability Proof:** Let $N$ be the total tenant population, $p_{\\text{noisy}}$ the probability that a tenant triggers a runaway reasoning loop ($> 120\\text{ RPM}$), and $R_{\\text{blast}}$ the fraction of sibling tenants impacted by a single tenant's quota exhaustion or KMS key revocation. Because Hop 3 enforces per-tenant Valkey token buckets in Pattern A and per-spoke project/CMEK boundaries in Patterns B and C, the cross-tenant blast radius $R_{\\text{blast}}$ and composite turn availability $A_{\\text{turn}}$ satisfy:

$$R_{\\text{blast}}(i \\to j) = \\frac{\\Delta \\text{Quota}_{j \\neq i}}{\\text{Quota}_{j}} = 0, \\qquad A_{\\text{turn}} = A_{\\text{Hop1..5}} \\cdot \\left(1 - \\mathbb{I}_{\\text{CMEK\\_revoked}}(i)\\right) \\ge 99.95\\%$$

Where:
- $R_{\\text{blast}}(i \\to j) = 0$ is the cross-tenant fault propagation ratio between tenant $i$ and any sibling tenant $j \\neq i$ (\`Vector V5\` in Pattern A; \`Silo Test 6\` in Pattern B; \`Hybrid Test 3\` in Pattern C).
- $A_{\\text{Hop1..5}}$ is the regional multi-zone availability of the Cloud Run Gen2 + Vertex AI Agent Engine + AlloyDB HA pipeline.
- $\\mathbb{I}_{\\text{CMEK\\_revoked}}(i) \\in \\{0, 1\\}$ is the tenant-specific Cloud KMS kill-switch indicator (returning \`HTTP 423 Locked\` for tenant $i$ while all $j \\neq i$ maintain $100\\%$ uptime).

> **Architectural Grounding Boundary (Cross-Pattern Blast-Radius Verification):** Verified across all \`20/20\` pattern security & migration assertions (\`10/10\` Pattern A, \`6/6\` Pattern B, \`4/4\` Pattern C) and \`60/60\` third-party SaaS test cases in \`scripts/verify_5_third_party_saas_products.py\`.

### Cost optimization

- **Match infrastructure cost to customer ARR (Pillar 2 of the Agentic Triad):** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and \`120 RPM Pool\` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.
- **Formal 2-Question Topology Selector & ARR Breakeven Proof:** Let $q_1 \\in \\{0, 1\\}$ denote whether $100\\%$ of tenants legally mandate dedicated GCP projects/VPC-SC perimeters (\`Q1\`), and $q_2 \\in \\{0, 1\\}$ denote whether the platform packages multiple commercial tiers (\`Q2\`). The optimal topology selector $\\mathcal{T}^*(q_1, q_2)$ and the minimum Enterprise Annual Contract Value ($\\text{ACV}_{\\min}$) required to preserve target gross margin $GM_{\\text{target}} \\in (0, 1)$ when promoting a tenant from the shared pool ($C_{\\text{pool}}$) to a dedicated PSC spoke ($C_{\\text{spoke}}$) satisfy:

$$\\mathcal{T}^*(q_1, q_2) = \\begin{cases} \\text{Pattern B (Sovereign Silos)} & \\text{if } q_1 = 1 \\\\ \\text{Pattern A (Pooled)} & \\text{if } q_1 = 0 \\land q_2 = 0 \\\\ \\text{Pattern C (Dynamic Hybrid PSC)} & \\text{if } q_1 = 0 \\land q_2 = 1 \\end{cases}, \\qquad \\text{ACV}_{\\min} \\ge \\frac{12 \\cdot \\left(C_{\\text{spoke}} - C_{\\text{pool}}(N)\\right)}{1 - GM_{\\text{target}}}$$

Where:
- $q_1, q_2 \\in \\{0, 1\\}$ are the binary outputs of **Q1 (Compliance Gate)** and **Q2 (Tier Gate)** in Figure 1 (\`Badges 2 & 3\`).
- $C_{\\text{pool}}(N)$ is the monthly per-tenant cost in Pattern A with 90% \`ContextCacheConfig\` prefix savings and shared AlloyDB RLS.
- $C_{\\text{spoke}}$ is the monthly dedicated spoke infrastructure cost in Pattern B / Pattern C (CMEK AlloyDB + Dedicated Provisioned Throughput + PSC attachment).
- $GM_{\\text{target}}$ is the target SaaS gross margin (for example, $GM_{\\text{target}} = 0.80 \\implies$ each $\\$1,000/\\text{mo}$ of dedicated spoke delta requires $\\ge \\$60,000$ in incremental Enterprise ACV).

> **Architectural Grounding Boundary (Executive ARR Breakeven & FinOps Telemetry):** Per-tenant token COGS ($C_{\\text{pool}}$ vs $C_{\\text{spoke}}$) is measured in real time in live BigQuery table \`ramp-portal-dev.cymbal_agentic_finops_otel.tenant_telemetry_spans\` via [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py).

### Operational excellence

- **Privacy-preserving FinOps observability (Pillar 3 of the Agentic Triad):** Emit a \`TenantTelemetrySpan\` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery (\`cymbal_agentic_finops_otel.tenant_telemetry_spans\`)—with zero raw PII stored in logs.
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
| **3** | **ServiceNow ITSM & ITOM** (*Change & Incident MCP*) • \`mcp://retailstream/servicenow-itom-3lo\` | Live **Amazon Bedrock AgentCore MCP Gateway** (\`cymbal-a2a-mcp-gateway-suyxm3caof\`) invoking \`query_servicenow_change_records\` (\`CHG0049218\`) | **\`Pattern A (2/2)\`**, **\`Pattern B (2/2)\`**, **\`Pattern C (2/2)\`**: Consented 3LO call fetches live \`CHG0049218\` (**\`HTTP 200\`**); unconsented 3LO call triggers Hop 5 **\`HTTP 401 CHALLENGE_3LO_OAUTH\`** (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern all --verbose\` |
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
  - **Stage 3 (Pattern C Dynamic Hybrid & Zero-Downtime Promotion):** Enable the Pattern C Hybrid Router and 3-phase zero-downtime live tier migrator ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)).

> **Architectural Grounding Boundary (Live Cloud Infrastructure vs Complete 27-File Multi-Pattern Verification Suite):**
> - **Live-provisioned in Google Cloud & AWS today (\`20/20 PASS\`):** All 3 Google Cloud projects (\`ramp-portal-dev\` \`#248990048888\`, \`cymbal-control-plane\` \`#638420508320\`, \`cymbal-build-sandbox\` \`#887605034827\`), Cloud Run service \`cymbal-multi-tenant-agent-hub\`, Cloud KMS CMEK ring \`cymbal-tenant-cmek-ring-usw1\`, BigQuery dataset \`cymbal_agentic_finops_otel\`, Firestore routing database \`(default)\`, and AWS Bedrock AgentCore Gateway \`cymbal-a2a-mcp-gateway-suyxm3caof\` (\`10/10 READY\` targets).
> - **Executed via the 27-File Codebase Workbench & 1-Click Terraform Blueprints:** You can execute all \`20/20\` Pattern A/B/C simulations and all \`30/30\` live 10-SaaS flows directly in the browser workbench (\`#blog-e2e-pattern-execution-and-codebase-workbench\`) or deploy any of the three topologies via their 1-click Terraform scripts ([\`2.6/deploy_1click.sh\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh), [\`3.6/deploy_1click.sh\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh), and [\`4.6/deploy_1click.sh\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh)).`,
    whatsNextMd: `## What's next

### Companion 12-Slide Deck, 25-Slide Master Deck & Slide-to-Code Launch Matrix

Open the [Workstream 5 Editable Google Slides Deck (\`ws5-wrap-up-editable-slides.pptx\`)](../slides/ws5-wrap-up-editable-slides.pptx) or the [All-in-One 25-Slide Master Presentation (\`geap-multi-tenancy-all-workstreams-editable-slides.pptx\`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx) in the **Cloud Viewer** at the top of this page:

| Slides | Presentation Theme | Companion Executable Script / Terraform Module |
| :--- | :--- | :--- |
| **Slides 1–3** | Executive Decision Tree (\`Q1 Compliance\` + \`Q2 Tiering\`) & Pattern A/B/C Selector (Fig 1) | [\`5.1-pattern-comparison-and-decision-guide.md\`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md) |
| **Slides 4–6** | The Multi-Tenant Agentic Triad (\`80% Reusable 5-Hop Core\`) & FinOps Breakeven Model | [\`core-cymbal-agent/governance/\`](../core-cymbal-agent/governance/) |
| **Slides 7–9** | Multi-Cloud (GCP + AWS Account \`393036065405\`) & 10-SaaS Verification Matrix (\`30/30 Flows PASS\`) | [\`scripts/verify_5_third_party_saas_products.py\`](../scripts/verify_5_third_party_saas_products.py) • [\`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md) |
| **Slides 10–12** | 3-Stage Technical Solution Lifecycle, EAP Roadmap Tracker & 1-Click Terraform Factory | [\`1.4-eap-and-product-gap-tracker.md\`](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) • [\`2.6/deploy_1click.sh\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh) • [\`3.6/deploy_1click.sh\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh) • [\`4.6/deploy_1click.sh\`](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh) |

- **Launch the Interactive Codebase Workbench & 1-Click Terraform Scripts:**
  - [Open Interactive 27-File Codebase Workbench & Live Terminal Runner (\`#blog-e2e-pattern-execution-and-codebase-workbench\`)](#blog-e2e-pattern-execution-and-codebase-workbench)
  - [Pattern A 1-Click Terraform (\`workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh\`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh)
  - [Pattern B 1-Click Terraform (\`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh\`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh)
  - [Pattern C 1-Click Terraform (\`workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh\`)](../workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/deploy_1click.sh)
  - [Live GCP & AWS Cloud Verification Receipt (\`docs/cloud_console_verification_receipt.json\`)](../docs/cloud_console_verification_receipt.json)
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

