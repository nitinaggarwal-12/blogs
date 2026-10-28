export const WS2_WS3_SPECS = [
  {
    filename: 'ws2-pattern-a-pooled-architecture.md',
    pptxFile: 'ws2-pattern-a-pooled-editable-slides.pptx',
    frontmatter: {
      title: 'Multi-tenant agentic AI system: Pattern A high-density pooled architecture',
      subtitle: 'Deploy competing B2B SaaS tenants inside a single shared Google Cloud project with 5-Hop cryptographic isolation, 10/10 red-team breach defenses, and 90% shared prompt cache savings',
      series: 'Multi-Tenant Agentic AI on Google Cloud — Workstream 2 of 5',
      workstream: 'Workstream 2 • Pattern A — High-Density Pooled Architecture',
      authors: 'Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team',
      target_audience: 'Cloud Architects, AI Platform Engineers, FinOps Leads, and CISOs at B2B SaaS organizations',
      reading_time: '13 min read',
      tags: ['Gemini Enterprise Agent Platform', 'ADK', 'Multi-Tenancy', 'Pooled Architecture', 'Vertex AI Model Armor', 'AlloyDB RLS', 'ContextCacheConfig', 'FinOps', 'Zero Trust'],
      canonical_architecture: 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system',
      diagrams: ['ws2-pattern-a-pooled-5hop-architecture', 'ws2-pattern-a-breach-defense-sequence', 'ws2-demo-env-and-3p-auth-sandbox-topology', 'ws2-terraform-starter-resource-graph'],
      editable_slides: 'slides/ws2-pattern-a-pooled-editable-slides.pptx',
      status: 'PUBLISH_READY'
    },
    leadParagraphs: [
      `This document describes **Pattern A (High-Density Pooled Architecture)** for building and operating a multi-tenant agentic AI system on Google Cloud. In Pattern A, thousands of corporate B2B SaaS customers share a single Google Cloud project (\`cymbal-pooled-saas-prod\`), a shared [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) runtime, a shared [Gemini 2.5 Pro](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) prompt prefix cache (\`ContextCacheConfig\`), and a shared [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs) cluster while maintaining strict cryptographic tenant isolation.`,
      `This document is part 2 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (introduced in [Part 1: Reference architecture taxonomy and 5-Hop baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)). It is intended for cloud architects, AI platform engineers, and FinOps practitioners who need maximum tenant density and lowest unit cost (\`120 RPM Pooled\` baseline per tenant).`
    ],
    keyPointNote: `**Key point:** Pattern A achieves **90% input token savings** on shared system instructions (\`84.7%\` total turn COGS reduction) while blocking **10 out of 10 automated cross-tenant breach vectors**—including HTTP header spoofing, private \`Agent Alpha\` enumeration, prompt injection, noisy-neighbor token exhaustion, and cross-tenant database queries.`,
    terminologyMd: `## Core terminology and Pooled multi-tenant systems primitives

Before diving into Pattern A's reference implementation and its companion [12-slide editable deck (\`slides/ws2-pattern-a-pooled-editable-slides.pptx\`)](../slides/ws2-pattern-a-pooled-editable-slides.pptx), we anchor the **SaaS AI Architect's Dilemma**—how to capture **90% shared \`ContextCacheConfig\` prompt-prefix savings** and low-friction onboarding inside a single shared project without risking cross-tenant tool, memory, or database bleed—across the four foundational series primitives ([Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and Pattern A's **Computer Science (CS101)** operating-system and database-kernel mechanisms:

- **Agent Development Kit (\`ADK\`):** The Python runtime framework ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)) that binds immutable \`temp:tenant_id\` session state and executes deterministic \`before_agent_callback\`, \`before_model_callback\`, and \`before_tool_callback\` interceptors inside the shared worker pool.
- **Agent Registry & Discovery (\`ARD\`):** The Hop 2 Discovery Engine catalog Policy Decision Point ([\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)) that resolves global shared agents while returning \`HTTP 403 Forbidden\` if a Standard tenant (\`retailstream\`) enumerates an Enterprise tenant's private \`Agent Alpha\` (\`finvault\`).
- **Model Context Protocol (\`MCP\`):** The standardized tool-invocation protocol governed by composite \`{tenant_id}:{user_id}\` RFC 9449 DPoP-bound 3LO OAuth tokens and live AWS Bedrock AgentCore federation ([\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py)).
- **5-Hop Cryptographic Context Chain (\`Hops 1–5\` with Sub-Hops \`3a/3b\`, \`4a/4b\`, \`5a/5b\`):** The end-to-end invariant pipeline spanning **Hop 1** (Edge Identity PEP), **Hop 2** (ARD Catalog & ADK Callback PDP), **Hop 3a/3b** (gVisor Sandbox, Valkey RPM Bulkhead & \`ContextCacheConfig\` Prefix Cache), **Hop 4a/4b** (Pre-Inference Model Armor & Post-Inference Cloud SDP Guardrails), and **Hop 5a/5b** (Transactional AlloyDB \`SET LOCAL\` RLS & BigQuery OpenTelemetry Chargeback).

| Pooled Architecture Primitive | Google Cloud Service & Module | CS101 / Operating Systems Analogy | Security & Financial Guarantee in Pattern A |
| :--- | :--- | :--- | :--- |
| **gVisor (\`runsc\`) Sandbox Binding** | **Vertex AI Agent Engine** & **Cloud Run Gen2** ([\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) | **User-Space Kernel (\`seccomp-bpf\` + syscall interception)** isolating guest worker threads from the host Linux kernel | Pins immutable \`temp:tenant_id\` per turn so a compromised tool script cannot inspect sibling container file descriptors or \`/proc\` memory |
| **Atomic Lua Token-Bucket Bulkhead** | **Memorystore for Valkey** (\`ratelimit:{tenant_id}:rpm\` & \`revoked_jti:{tenant_id}\`) | **NIC Hardware Traffic Policer (Token Bucket)** with atomic compare-and-swap (\`CAS\`) counters in shared SRAM | Caps Standard tenants at \`120 RPM\` (\`4,000\` thinking tokens) and Enterprise tenants at \`600 RPM\` (\`8,000\` thinking tokens), returning \`HTTP 429\` with \`Retry-After\` jitter in \`~3 ms\` |
| **Immutable Prefix Context Caching** | **Vertex AI \`ContextCacheConfig\`** (\`cymbal-shared-incident-system-prompt-v2\`) | **Copy-on-Write (\`CoW\`) Read-Only Shared Virtual Memory (\`mmap PROT_READ\`)** across child processes | Shares the \`32,000\`-token operator runbook and MCP schema prefix across all pooled tenants at a \`0.10x\` billing multiplier (\`90%\` prefix discount; \`84.7%\` net turn COGS savings) |
| **Transactional Row-Level Security (RLS)** | **AlloyDB for PostgreSQL** (\`SET LOCAL app.current_tenant_id\` + \`FORCE ROW LEVEL SECURITY\` in [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py)) | **Database Kernel Mandatory Access Control (MAC) Tuple Filter** scoped strictly to the active \`BEGIN ... COMMIT\` transaction | Rewrites every SQL \`SELECT\`, \`UPDATE\`, and \`pgvector\` HNSW scan inside the PostgreSQL query planner so even an injected \`OR 1=1\` clause returns \`0\` cross-tenant rows |
| **Composite DPoP 3LO Credential Vault** | **Secret Manager / Auth Manager** + **RFC 8693 OBO + RFC 9449 DPoP** (\`{tenant_id}:{user_id}\`) | **Capability-Based File Descriptor Table** indexed by \`(process_group_id, user_id)\` + cryptographic sender thumbprint (\`dpop_jkt\`) | Eliminates Cross-Tenant Confused Deputy token replay across Google Workspace, Atlassian Jira, Microsoft SharePoint, and ServiceNow |`,
    archIntro: `The following diagram shows the Pattern A high-density pooled architecture deployed inside a single shared Google Cloud project (\`cymbal-pooled-saas-prod\`):`,
    figures: [
      {
        num: 1,
        heading: null,
        title: 'Pattern A: High-density pooled multi-tenant architecture and shared runtime governance',
        diagId: 'ws2-pattern-a-pooled-5hop-architecture',
        captionDetail: 'Official Google Cloud Architecture Center pooled-shared-plane topology (60 vertices, 20 edges) inside a single shared project (`cymbal-pooled-saas-prod`), showing Hop 1 & Hop 2 Edge PEP & Agent Catalog PDP, Hop 3 & 5 Shared FinOps, Cache & OTel Hub, the Pooled Agent Runtime (shared by all tenants with inline namespace chips), and the Shared Data & Tool Plane (RLS-partitioned with inline tenant row chips).',
        zonesIntro: `Figure 1 organizes the shared project into four color-coded functional zones inside a single shared data and runtime plane (\`ONE Shared Data Plane • ONE Agent Engine Pool • ONE AlloyDB Schema — tenants are rows & namespaces, NOT separate boxes\`):`,
        zones: [
          { name: 'Hop 1 & Hop 2: Edge PEP & Agent Catalog PDP', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Terminates multi-tenant traffic at the External Application Load Balancer, strips forged `X-Tenant-ID` headers in Google Cloud Armor, filters the catalog in Discovery Engine PDP (`403` on private `Agent Alpha`), exchanges Google OIDC (`FinVault`) and Microsoft Entra ID (`RetailStream`) JWTs in IAP + OBO Broker (`adk-agent-signing-key`), and prunes unauthorized tools at the ADK Callback Gate (`before_agent_callback`).' },
          { name: 'Hop 3 & 5: Shared FinOps, Cache & OTel Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Maintains the shared `ContextCacheConfig (90% COGS Save)` (`32k` shared operator prefix), enforces per-tenant thinking-token caps (`4k Standard vs 8k Enterprise`) in Memorystore Valkey, and streams PII-redacted per-turn telemetry to the BigQuery OTel Sink (`tenant_telemetry_spans`).' },
          { name: '3. Pooled Agent Runtime (shared by all tenants)', colorLabel: 'Zone 3 — Upper shared runtime band `#feefc3`', desc: 'Executes all tenants inside ONE shared Vertex AI Agent Engine gVisor pool (`temp:tenant_id`), screens prompts with `Model Armor (shared)` per-tenant FINRA/PCI templates, runs `Gemini 2.5 Pro` (`4k / 8k` caps), enforces `Memorystore Valkey` RPM bulkheads (`120 Std / 600 Ent`), and partitions the `5-Level Memory Bank (ONE bank)` via disjoint tenant key prefixes (`finvault:{user}:{session}`, `retailstream:{user}:{session}`, and `L1 shared prefix (read-only)`).' },
          { name: '4. Shared Data & Tool Plane (RLS-partitioned)', colorLabel: 'Zone 4 — Lower shared data band `#fad2cf`', desc: 'Stores all tenants in `AlloyDB (ONE schema) + BigQuery (ONE dataset)` (`pattern_a_pooled_rls_entities` with `FORCE ROW LEVEL SECURITY` where `tenant_id = \'finvault\'` and `tenant_id = \'retailstream\'` are row partitions enforced by `POLICY tenant_isolation USING (tenant_id = current_setting(\'app.current_tenant_id\', true))`), enforces `BigQuery ROW ACCESS POLICY`, brokers tools through `MCP Hub (shared)` (`2LO service + per-tenant 3LO consent`), masks IBAN/SWIFT/PAN in `Cloud SDP Egress`, and signs claims with `Cloud KMS` (`adk-agent-signing-key`).' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 (\`1\`–\`7\`) match the visual diagram badges 1:1 (including canonical flow stages \`1 Request\`, \`2 Request\`, \`3 Route\`, \`4 Sanitize request\`, \`5 Generates response\`, \`6 Sanitize response\`, and \`7 Sanitized response\` across sub-hops \`Hop 3a/3b\`, \`Hop 4a/4b\`, and \`Hop 5a/5b\`) and trace how competing tenants share a single runtime and database without cross-tenant data or tool bleed ([\`pattern_a_pooled_service.py\`](../workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py), [\`runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)):`,
        steps: [
          { title: 'Multi-IdP HTTPS ingress (`1 Request`)', body: 'FinVault Bank (Google OIDC) or RetailStream Corp (Microsoft Entra ID) sends an HTTPS prompt with an OIDC JWT and RFC 9449 DPoP proof to the shared SaaS endpoint (`pattern_a_pooled_service.py:L74-L98`, `runtime_pipeline.py:L60-L72`).' },
          { title: 'Hop 1 & Hop 2 — Edge header strip, OBO+KMS signing, and ARD catalog pruning (`2 Request`)', body: 'Google Cloud Armor strips any client-supplied `X-Tenant-ID` header; IAP + OBO Broker mints a KMS-signed context (`hop1_edge_identity_pep.py`, `runtime_pipeline.py:L60-L80`), Discovery Engine ARD PDP hides FinVault\'s private `Agent Alpha` (`HTTP 403`), and the ADK Callback Gate prunes unauthorized tools (`hop2_registry_pdp_callbacks.py`, `runtime_pipeline.py:L82-L97`).' },
          { title: 'Hop 3a — Route to gVisor sandbox and Valkey quota check (`3 Route` / `3 Allocate gVisor sandbox + Valkey quota check`)', body: 'Vertex AI Agent Engine binds immutable `temp:tenant_id` inside the shared gVisor pool while Memorystore Valkey enforces `120 RPM` (Standard) vs `600 RPM` (Enterprise) bulkheads (`~3 ms` JTI/CMEK check + Lua token bucket) and clamps thinking budgets to `4,000` vs `8,000` tokens (`hop3_compute_finops_bulkhead.py`, `runtime_pipeline.py:L99-L113`).' },
          { title: 'Hop 4a (Pre-inference) — Screen and sanitize prompt with tenant\'s Model Armor template (`4 Sanitize request` / `4 Screen prompt with tenant\'s Armor template`)', body: '`Model Armor (shared)` screens the prompt against the tenant\'s FINRA or PCI template, blocking prompt/SQL injection (`HTTP 400`) and semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`) (`hop4_model_armor_guardrails.py`, `runtime_pipeline.py:L115-L125`).' },
          { title: 'Hop 3b — 90% cached prefix inference and namespaced memory lookup (`5 Generates response` / `5 90% cached prefix + namespaced memory`)', body: '`Gemini 2.5 Pro` attaches the read-only `32k` `ContextCacheConfig` prefix (90% input token savings, `84.7%` turn COGS reduction) while reading and writing episodic state strictly under `finvault:{user}:{session}` or `retailstream:{user}:{session}` in the `5-Level Memory Bank (ONE bank)` (`runtime_pipeline.py:L127-L162`).' },
          { title: 'Hop 5a & Hop 4b — Transactional AlloyDB RLS query, 3LO MCP tool call, and output sanitization (`6 Sanitize response` / `6 SET LOCAL app.current_tenant → RLS-filtered rows`)', body: '`AlloyDB (ONE schema) + BigQuery (ONE dataset)` executes `SET LOCAL app.current_tenant_id` under `FORCE ROW LEVEL SECURITY` (returning only the caller\'s rows and `0` cross-tenant rows) while `MCP Hub (shared)` verifies per-tenant DPoP-bound 3LO consent (`hop5_data_rls_and_otel.py`, `runtime_pipeline.py:L164-L182`).' },
          { title: 'Hop 4b & Hop 5b — SDP-redacted response and per-turn OTel span (`7 Sanitized response` / `7 SDP-redacted response + per-turn OTel span`)', body: '`Cloud SDP Egress` masks IBAN/SWIFT/PAN tokens before returning the sanitized response and streaming a zero-PII `tenant_telemetry_spans` chargeback record to the `BigQuery OTel Sink` (`cymbal_agentic_finops_otel.tenant_telemetry_spans`, `runtime_pipeline.py:L184-L209`).' }
        ]
      },
      {
        num: 2,
        heading: '### 10-point red-team breach defense topology (Figure 2)',
        title: 'Pattern A: 10-point red-team attack simulation and deterministic hop defense matrix',
        diagId: 'ws2-pattern-a-breach-defense-sequence',
        captionDetail: 'End-to-end red-team defense architecture showing where each of the 10 cross-tenant attack vectors (Vectors V1–V10) is intercepted across Hops 1 through 5.',
        zonesIntro: `Figure 2 maps the 10 automated red-team attack vectors ([2.5 Breach Simulation Suite](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)) to the four structural zones:`,
        zones: [
          { name: 'Edge Spoofing and Replay Defense (Hop 1)', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Neutralizes Vector 1 (Forged `X-Tenant-ID: finvault` header) by overwriting client headers with the JWT-derived identity.' },
          { name: 'Catalog ACL and Telemetry Scrubbing Hub (Hops 2 & 5)', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Blocks Vector 2 (`403` on private `Agent Alpha`), Vector 3 (ADK `before_agent_callback` pruning of FinVault Jira tools), and Vector 10 (raw PII scrubbing in OpenTelemetry spans).' },
          { name: 'Compute, Memory, and Prefix Cache Guard (Hop 3)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Prevents Vector 4 (thinking-token clamp `16,000 -> 4,000`), Vector 5 (`429` Valkey RPM bulkhead), Vector 6 (`ContextCacheConfig` prefix hash isolation), and Vector 7 (`{tenant}:{user}:{session}` Memory Bank partitioning).' },
          { name: 'Inline DLP, 3LO DPoP, and AlloyDB RLS Guard (Hops 4 & 5)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Stops Vector 8 (`400` Model Armor prompt injection & `422` NLC block), Vector 9 (`401` cross-tenant 3LO MCP token replay), and enforces zero cross-tenant rows in AlloyDB RLS.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 2 (\`1\`–\`7\`) match the visual diagram badges and trace the deterministic rejection of adversarial payloads in [\`run_breach_simulations.py\`](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py):`,
        steps: [
          { title: 'Adversarial request submission (`1 Attack Probe`)', body: 'An attacker or misconfigured client (`retailstream` red-team probe) submits a spoofed header, cross-tenant agent URI, noisy-neighbor flood, or prompt-injection payload (`run_breach_simulations.py:L45-L95`).' },
          { title: 'Hop 1 & Hop 2 — Header sanitization, DPoP check, and Catalog ACL pruning (`2 Probe`)', body: 'Forged `X-Tenant-ID` headers are stripped at Hop 1 (`Vector 1`), unauthorized calls to FinVault\'s `Agent Alpha` return `403 Forbidden` (`Vector 2`), unauthorized Jira 3LO tools are pruned in `before_agent_callback` (`Vector 3`), and cross-tenant 3LO token replays fail DPoP `jkt` verification with `401 Unauthorized` (`Vector 9` / `Vector 10`).' },
          { title: 'Hop 3 — Valkey RPM bulkhead and thinking-token clamp (`3 Verified context enters Hop 3–5`)', body: 'Inside the gVisor bulkhead (`hop3_compute_finops_bulkhead.py`), `16,000`-token requests from Standard tenants are clamped to `4,000` tokens (`Vector 4`), and `250 RPM` burst floods above the `120 RPM` ceiling are rejected in `~3 ms` with `HTTP 429 Too Many Requests` (`Vector 5`).' },
          { title: 'Hop 4 (Pre-inference) — Prompt injection and SQLi block (`4 Screen prompt`)', body: 'Model Armor inspects the prompt inline and rejects SQL/prompt injection (`SELECT * FROM incidents WHERE tenant_id = \'finvault\'`) with `HTTP 400 Bad Request` (`Vector 8a`).' },
          { title: 'Hop 4 & Hop 3 — Semantic NLC compliance, Memory Bank, and Prefix Cache isolation (`5 Evaluate Safety rules`)', body: 'Regulatory suppression prompts fail FINRA semantic NLC inspection with `HTTP 422 Unprocessable Entity` (`Vector 8b`), shared `ContextCacheConfig` keys reject tenant suffix tampering (`Vector 6`), and `{tenant}:{user}:{session}` namespaces block cross-tenant Memory Bank reads (`Vector 7`).' },
          { title: 'Hop 4 (Post-inference) — Cloud SDP egress PII masking (`6 Redact PII`)', body: 'Cloud SDP scrubs raw SSN, IBAN, and account identifiers (`[REDACTED_PII]` / `[REDACTED-FINVAULT-IBAN]`) before any tool output or completion leaves the runtime (`Vector 10a`).' },
          { title: 'Hop 5 — AlloyDB RLS enforcement and zero-bleed audit verification (`7 Zero cross-tenant data/cache bleed`)', body: 'AlloyDB `SET LOCAL app.current_tenant_id` under `FORCE ROW LEVEL SECURITY` returns `0` cross-tenant rows (`Vector 10b`), certifying `10/10` red-team breach defenses.' }
        ]
      },
      {
        num: 3,
        heading: '### Multi-IdP 3LO authentication and sandbox topology (Figure 3)',
        title: 'Pattern A: Multi-IdP 3LO OAuth federation (Google OIDC and Microsoft Entra ID) and MCP sandbox',
        diagId: 'ws2-demo-env-and-3p-auth-sandbox-topology',
        captionDetail: 'Multi-IdP identity federation architecture showing how Google Workspace OIDC (FinVault Bank) and Microsoft Entra ID v2.0 (RetailStream Corp) federate into the shared Pattern A runtime and broker 2LO and 3LO MCP tool calls.',
        zonesIntro: `Figure 3 illustrates the identity and 3P connector sandbox described in [2.2 Demo Environment & 3P Auth Sandbox](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md):`,
        zones: [
          { name: 'Multi-IdP Federation and OBO Broker', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Federates Google Workspace OIDC (`accounts.google.com`) and Microsoft Entra ID (`login.microsoftonline.com/{tid}/v2.0`) into Workforce Identity Federation and mints DPoP-bound OBO tokens.' },
          { name: 'Auth Manager Secret Vault and Catalog Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Stores per-tenant 3LO OAuth refresh tokens encrypted under Cloud KMS and maps allowed MCP connectors per tenant in Firestore.' },
          { name: 'FinVault 3LO Google Workspace and Jira Sandbox', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Executes FinVault\'s private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput) and brokers 3LO OAuth calls to Google Drive, Gmail, Calendar, and Jira Enterprise.' },
          { name: 'RetailStream Inline 3LO Entra ID Consent Sandbox', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Triggers mid-turn inline 3LO OAuth consent (`MCP -32042 elicitation`) for Microsoft SharePoint runbooks and ServiceNow ITOM without ambient service-account privileges.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 3 (\`1\`–\`7\`) match the visual diagram badges for environment bootstrap and 3LO federation:`,
        steps: [
          { title: 'Bootstrap pooled demo environment (`1 Bootstrap`)', body: 'The platform engineer triggers the pooled environment setup ([2.2 Demo Environment & 3P Auth Sandbox](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md)).' },
          { title: 'Enable Google Cloud & Identity APIs (`2 Enable APIs`)', body: 'Activates Vertex AI, Discovery Engine, Identity Platform / Workforce Identity Federation, Secret Manager, Model Armor, and AlloyDB APIs.' },
          { title: 'Register federated IdPs (`3 Register IdPs (OIDC & Entra)`)', body: 'Configures Google Workspace OIDC (`accounts.google.com` for FinVault Bank) and Microsoft Entra ID SAML/OIDC (`login.microsoftonline.com/{tid}/v2.0` for RetailStream Corp).' },
          { title: 'Create tenant OAuth client IDs and KMS signing keys (`4 Create client ID`)', body: 'Provisions per-tenant OAuth client credentials and the Cloud KMS ECDSA P-256 `adk-agent-signing-key` for RFC 8693 OBO token exchange.' },
          { title: 'Register composite 3LO scopes and Auth Manager vault (`5 Register 3LO scopes`)', body: 'Binds 3LO scopes for Jira, Google Drive, SharePoint, and ServiceNow under composite `{tenant_id}:{user_id}` DPoP-pinned keys (returning `MCP -32042` step-up consent when ungranted).' },
          { title: 'Seed tenant entitlements and RLS fixtures (`6 Seed tenant config`)', body: 'Populates Firestore tenant profiles (`4,000` vs `8,000` token budgets, allowed MCP tools) and AlloyDB `FORCE ROW LEVEL SECURITY` tables.' },
          { title: 'Run automated breach simulation suite (`7 Run breach simulation suite`)', body: 'Executes `run_breach_simulations.py` to verify all `10/10` cross-tenant isolation and 3LO Confused-Deputy defenses.' }
        ]
      },
      {
        num: 4,
        heading: '### 1-click Terraform starter resource dependency graph (Figure 4)',
        title: 'Pattern A: Terraform infrastructure-as-code (IaC) resource graph',
        diagId: 'ws2-terraform-starter-resource-graph',
        captionDetail: 'Declarative Terraform resource dependency graph (`workstream-2-pattern-a-pooled/2.6-terraform-starter/`) provisioning the complete Pattern A pooled stack in a single Google Cloud project.',
        zonesIntro: `Figure 4 shows the declarative Terraform module topology ([\`2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) and [\`2.6-terraform-starter/deploy_1click.sh\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh)):`,
        zones: [
          { name: 'Edge Networking and WAF Module', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Provisions `google_compute_global_forwarding_rule`, `google_compute_security_policy` (Cloud Armor header-strip rules), and `google_iap_web_backend_service`.' },
          { name: 'IAM, KMS, and Observability Module', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Provisions `google_kms_key_ring`, `google_kms_crypto_key`, least-privilege service accounts, and the `google_bigquery_table` FinOps ledger.' },
          { name: 'Agent Runtime, Model Armor, and Valkey Module', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Provisions Vertex AI Agent Engine runtime endpoints, `google_model_armor_template`, and `google_memorystore_instance` (Valkey token buckets).' },
          { name: 'AlloyDB RLS and Firestore Seed Module', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions `google_alloydb_cluster`, initializes `FORCE ROW LEVEL SECURITY` policies, and seeds tenant profiles in `google_firestore_document`.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 4 (\`1\`–\`7\`) match the visual diagram badges in the Terraform DAG ([\`2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)):`,
        steps: [
          { title: 'Validate input variables (`1 tfvars`)', body: 'Loads `project_id`, `region`, `tenants` tier map, and `enable_context_caching` from `variables.tf` via `deploy_1click.sh`.' },
          { title: 'Initialize Google provider and enable APIs (`2 Provider`)', body: '`google_project_service` enables Vertex AI, Discovery Engine, Model Armor, DLP, AlloyDB, Memorystore, and Cloud KMS APIs.' },
          { title: 'Provision Hop 3–5 runtime, Valkey, and AlloyDB RLS (`3 Apply Hop 3 runtime & data`)', body: 'Provisions `google_redis_instance.valkey_bulkhead`, `google_alloydb_cluster.pooled_cluster` (`FORCE ROW LEVEL SECURITY`), and `google_bigquery_table.otel_token_ledger`.' },
          { title: 'Build Hop 4 DLP/Model Armor templates and Firestore registry (`4 Build template`)', body: 'Creates per-tenant `google_dlp_deidentify_template` resources (`for_each = var.tenants`) and seeds `google_firestore_document.tenant_registry`.' },
          { title: 'Deploy Cloud Run Gen2 gVisor gateway and inject env vars (`5 Inject env variables`)', body: 'Deploys `google_cloud_run_v2_service.pooled_agent_gateway` with `EXECUTION_ENVIRONMENT_GEN2`, injecting Valkey, AlloyDB, and `ContextCacheConfig` environment bindings.' },
          { title: 'Bind Hop 1 Cloud Armor edge security policy (`6 Export URI`)', body: 'Attaches `google_compute_security_policy.hop1_edge_armor` (header-strip + SQLi WAF rules) and exports the gateway endpoint.' },
          { title: 'Emit Terraform outputs and run breach smoke tests (`7 pooled_gateway_uri & valkey_bulkhead`)', body: 'Outputs `pooled_gateway_uri`, `valkey_bulkhead_host`, and `bigquery_chargeback_table` (`outputs.tf`) and runs `run_breach_simulations.py` (`10/10 PASS`).' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern A is designed for high-density B2B SaaS environments where unit economics and rapid self-service onboarding are primary business drivers ([2.1 Case Study & Solution Architecture](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)):

- **High-volume commercial and Standard SaaS tiers (self-service to mid-market ARR):** Serve thousands of Standard-tier organizations (such as **RetailStream Corp**) from a single Google Cloud project without incurring per-tenant project, VPC, or database cluster overhead.
- **Enterprise tenants with private custom agents inside a shared platform:** Allow Enterprise customers (such as **FinVault Bank**) to register private custom agents (\`Agent Alpha\` on **Gemini 2.5 Pro Dedicated Provisioned Throughput**) and CMEK-encrypted session memory inside the shared control plane while guaranteeing that competing tenants receive \`HTTP 403 Forbidden\` on any enumeration or invocation attempt.
- **Multi-IdP SaaS platforms serving Google and Microsoft customers:** Support customers authenticating via **Google Workspace OIDC** alongside customers using **Microsoft Entra ID** with mid-session 3LO OAuth consent to SharePoint, ServiceNow, Jira, and Google Drive.`,
    alternativesMd: `## Design alternatives

As established in [Part 1: Reference architecture taxonomy and 5-Hop baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md), every agent turn in our architecture traverses the **5-Hop Cryptographic Context Chain** ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)): **Hop 1** (Edge Identity PEP), **Hop 2** (Discovery Engine Catalog & ADK Callback PDP), **Hop 3** (gVisor Sandbox, Valkey Token Bucket & \`ContextCacheConfig\` Bulkhead), **Hop 4** (Model Armor & Cloud SDP Guardrails), and **Hop 5** (Transactional AlloyDB \`SET LOCAL\` RLS & BigQuery OpenTelemetry Chargeback). Before examining Figure 1's topology, we evaluate the two core design trade-offs that make Pattern A both economically viable and cryptographically isolated across those five hops.

### Shared prompt prefix caching (\`ContextCacheConfig\`) vs uncached per-turn prompts

A key economic advantage of Pattern A is sharing an immutable system prompt cache across all pooled tenants ([2.4 Product Gaps & FinOps Prioritization](../workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md)). Because cached prefix tokens on **Gemini 2.5 Pro** are billed at **10% of the standard input token rate** (a **90% discount**), sharing an immutable operator system prompt across tenants dramatically lowers per-turn COGS.

The table below reconciles both the **unit test benchmark** (\`4,500\` shared prefix tokens + \`300\` dynamic tenant tokens = \`4,800\` input tokens in \`run_breach_simulations.py\`) and the **full production SRE bundle** (\`32,000\` shared runbook + MCP schema prefix tokens + \`2,000\` dynamic tenant tokens = \`34,000\` input tokens shown in Figure 1):

| Cost component | Uncached per-turn prompt (\`100%\` input rate) | Pattern A with \`ContextCacheConfig\` (\`10%\` cached prefix rate) | Mechanism in \`hop3_compute_finops_bulkhead.py\` |
| :--- | :--- | :--- | :--- |
| **Unit benchmark prefix (\`4,500\` shared + \`300\` dynamic = \`4,800\` tokens)** | \`4,800\` full-rate input tokens | **\`750\` effective billable tokens** (\`4,500 × 0.10 + 300\`) — **\`84.4%\` input savings** | Cached under immutable key \`cymbal-shared-incident-system-prompt-v2\` |
| **Production SRE bundle (\`32,000\` shared + \`2,000\` dynamic = \`34,000\` tokens)** | \`34,000\` full-rate input tokens | **\`5,200\` effective billable tokens** (\`32,000 × 0.10 + 2,000\`) — **\`84.7%\` COGS reduction** | Shared read-only across all pooled tenants; \`90%\` discount on the \`32k\` prefix |
| **Tenant dynamic suffix (\`300\`–\`2,000\` tokens)** | Billed at \`100%\` standard input rate | Billed at \`100%\` standard input rate (**never cached across tenants**) | Appended per turn after \`verify_context_cache_safety()\` blocks cache poisoning |

### 10-point red-team breach verification matrix

Before deploying Pattern A to production, every deployment is validated against the 10-point red-team simulation suite ([\`run_breach_simulations.py\`](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)):

| Vector | Simulated attack scenario | Enforcing hop & module | Verified runtime result |
| :--- | :--- | :--- | :--- |
| **V1** | RetailStream injects \`X-Tenant-ID: finvault\` HTTP header | **Hop 1** (\`hop1_edge_identity_pep.py\`) | Header stripped; \`tenant_id\` pinned to \`retailstream\` |
| **V2** | RetailStream directly invokes \`agent://finvault/private-agent-alpha-regulatory\` | **Hop 2** (\`hop2_registry_pdp_callbacks.py\`) | Blocked with **\`HTTP 403 Forbidden\`** |
| **V3** | Prompt attempts to invoke FinVault's \`jira-enterprise-3lo\` MCP tool | **Hop 2** (\`before_agent_callback\`) | Tool pruned deterministically before model reasoning |
| **V4** | RetailStream requests \`16,000\` thinking tokens (tier cap is \`4,000\`) | **Hop 3** (\`hop3_compute_finops_bulkhead.py\`) | Clamped to **\`4,000\` tokens** (\`clamped_tokens = 12,000\`) |
| **V5** | Runaway loop sends \`250 RPM\` (RetailStream tier limit is \`120 RPM\`) | **Hop 3** (Memorystore for Valkey) | Blocked with **\`HTTP 429 Too Many Requests\`** |
| **V6** | Attempt to inject tenant suffix into shared \`ContextCacheConfig\` key | **Hop 3** (\`verify_context_cache_safety\`) | Rejected; cache key pinned to immutable shared prefix |
| **V7** | Cross-tenant read against Vertex AI Memory Bank | **Hop 3** (\`{tenant}:{user}:{session}\` key) | Zero cross-tenant records returned |
| **V8** | SQL/prompt injection & semantic NLC policy violation in user prompt | **Hop 4** (\`hop4_model_armor_guardrails.py\`) | Blocked with **\`HTTP 400\`** (injection) / **\`HTTP 422\`** (NLC) |
| **V9** | Replay of FinVault 3LO OAuth token from a RetailStream worker | **Hop 4** (Auth Manager + DPoP \`jkt\`) | Blocked with **\`HTTP 401 Unauthorized\`** |
| **V10** | Raw SSN / account PII in prompt and AlloyDB query without tenant filter | **Hops 4 & 5** (Cloud DLP + AlloyDB RLS) | Masked as \`[REDACTED_PII]\`; RLS returns \`1\` row (own tenant only) |`,
    productsMd: `## Products used

Pattern A (High-Density Pooled Architecture) uses the following Google Cloud products inside a single shared project (\`cymbal-pooled-saas-prod\`):

### Pooled agent runtime and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): Executes all pooled tenants inside a shared gVisor sandbox pool with per-turn immutable \`temp:tenant_id\` state binding and a 5-Level Memory Bank partitioned by \`{tenant_id}:{user_id}:{session_id}\`.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Enforces deterministic \`before_agent_callback\`, \`before_tool_callback\`, and \`before_model_callback\` guardrails inside the shared worker pool.
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Serves pooled inference using shared \`ContextCacheConfig\` prefix caching (90% input token discount on the shared system prompt) alongside Dedicated Provisioned Throughput (\`gemini-2.5-pro-dedicated\`) for tenant-private agents such as FinVault's \`Agent Alpha\`.

### Multi-IdP ingress, identity, and inline AI safety

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs) and [Google Cloud Armor](https://cloud.google.com/armor/docs): Terminate HTTPS traffic at the global edge and strip forged \`X-Tenant-ID\` and \`X-GCP-Project-Override\` headers (\`Hop 1\`).
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation): Federate Google Workspace OIDC (\`FinVault Bank\`) and Microsoft Entra ID (\`RetailStream Corp\`) tokens and mint RFC 8693 OBO contexts bound to RFC 9449 DPoP proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): Apply per-tenant FINRA/OCC and PCI inspection templates inline (\`Hop 4\`) to block prompt injections (\`HTTP 400\`), semantic Natural Language Policy Compliance (\`NLC\`) violations (\`HTTP 422\`), and raw PII leakage.

### Shared data plane, rate bulkheads, and FinOps telemetry

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): Co-hosts multi-tenant operational records in a single schema protected by \`FORCE ROW LEVEL SECURITY\` keyed on \`SET LOCAL app.current_tenant_id\` (\`Hop 5\`).
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Enforce per-tenant atomic Lua token-bucket rate limits (\`120 RPM\` Standard vs \`600 RPM\` Enterprise) and store per-tenant MCP connector entitlements.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs) and [BigQuery](https://cloud.google.com/bigquery/docs): Sign cryptographic tenant contexts (\`adk-agent-signing-key\`), enforce BigQuery \`ROW ACCESS POLICY\` on \`pattern_a_pooled_rls_entities\`, and aggregate per-turn FinOps chargeback spans in \`cymbal_agentic_finops_otel.tenant_telemetry_spans\`.`,
    considerationsMd: `## Design considerations

This section provides guidance for operating Pattern A according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Never trust client headers inside pooled workers:** Strip \`X-Tenant-ID\`, \`X-Cymbal-Tenant\`, and \`X-GCP-Project-Override\` in Google Cloud Armor at **Hop 1** and derive tenant identity exclusively from the verified OIDC/SAML JWT and DPoP proof.
- **Enforce \`FORCE ROW LEVEL SECURITY\` on all shared tables:** In AlloyDB for PostgreSQL, create a permissive policy \`USING (tenant_id = current_setting('app.current_tenant_id', true))\` and enable \`FORCE ROW LEVEL SECURITY\` so connection pooling can never leak rows across tenants.
- **Isolate 3LO SaaS OAuth tokens by composite DPoP key:** Store user-delegated 3LO refresh tokens for Google Workspace, Atlassian Jira, Microsoft SharePoint, and ServiceNow under \`{tenant_id}:{mcp_connector_uri}\` in the KMS-encrypted Auth Manager vault and verify the caller's DPoP thumbprint (\`jkt\`) on every tool invocation.
- **When to graduate from Pattern A to Pattern B or C:** If a regulated customer contractually prohibits shared compute pools, requires a dedicated VPC Service Controls perimeter, or mandates air-gapped open-weight models on dedicated GPUs, deploy that customer in [Pattern B (Sovereign Silos)](ws3-pattern-b-sovereign-silos.md) or as an Enterprise PSC spoke in [Pattern C (Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md).

### Reliability

- **Enforce per-tenant rate and token bulkheads:** Use atomic Lua token buckets in **Memorystore for Valkey** keyed by \`ratelimit:{tenant_id}:rpm\` and clamp \`thinking_budget\` in \`before_model_callback\` ([\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) so a single noisy tenant cannot exhaust regional Vertex AI TPM quotas:

$$
B_{i}(t) = \\min\\!\\left(C_{\\text{tier}},\\; B_{i}(t_0) + \\frac{\\text{RPM}_{\\text{tier}}}{60}\\cdot(t - t_0)\\right), \\qquad \\tilde{T}_{\\text{think}}(i) = \\min\\!\\left(T_{\\text{req}}(i),\\; T_{\\max,\\text{tier}}\\right)
$$

Where:
- $B_{i}(t)$ is the instantaneous token-bucket credit balance for tenant $i$ in Memorystore for Valkey key \`ratelimit:{tenant_id}:rpm\` at timestamp $t$ (\`~3 ms\` single-RTT Lua evaluation).
- $C_{\\text{tier}} = \\text{RPM}_{\\text{tier}}$ is the tier burst ceiling ($120\\text{ RPM}$ for Standard-tier \`retailstream\`; $600\\text{ RPM}$ for Enterprise-tier \`finvault\`). When $B_{i}(t) < 1$, Hop 3 immediately rejects the turn with \`HTTP 429 Too Many Requests\` and a randomized \`Retry-After\` jitter header while sibling tenants sustain \`100%\` availability.
- $T_{\\text{req}}(i)$ is the caller-requested reasoning budget and $\\tilde{T}_{\\text{think}}(i)$ is the clamped budget enforced against $T_{\\max,\\text{Standard}} = 4,000\\text{ tokens}$ (clamping a $16,000$-token probe by $\\Delta T = 12,000\\text{ tokens}$ in Vector 4) and $T_{\\max,\\text{Enterprise}} = 8,000\\text{ tokens}$.

> **Architectural Grounding Boundary (Token-Bucket Bulkhead & Thinking Clamp):** Executed deterministically in [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) (\`Vectors V4 & V5\` in \`run_breach_simulations.py\`) and provisioned for production Memorystore for Valkey via [\`2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf).

### Cost optimization

- **Separate cached system instructions from dynamic tenant context (\`84.7%\` COGS reduction):** Keep your shared system instructions, tool schemas, and diagnostic runbooks (\`>= 4,096\` tokens up to \`32,000\` tokens) identical across tenants inside \`ContextCacheConfig\`, and inject per-tenant skills (\`gs://cymbal-skills-{tenant}/\`) and conversation history in the uncached suffix:

$$
T_{\\text{eff}}(L_{\\text{pre}}, L_{\\text{dyn}}) = w_{\\text{cache}} \\cdot L_{\\text{pre}} + L_{\\text{dyn}} = 0.10 \\times 32,000 + 2,000 = 5,200\\text{ billable tokens}, \\qquad \\eta_{\\text{COGS}} = 1 - \\frac{T_{\\text{eff}}}{L_{\\text{pre}} + L_{\\text{dyn}}} = 1 - \\frac{5,200}{34,000} = 84.71\\%
$$

Where:
- $L_{\\text{pre}} = 32,000\\text{ tokens}$ is the immutable shared SRE runbook and MCP tool declaration prefix (\`cymbal-shared-incident-system-prompt-v2\`).
- $L_{\\text{dyn}} = 2,000\\text{ tokens}$ is the per-turn dynamic tenant suffix (user prompt + AlloyDB RLS rows + session memory, never cached across tenants).
- $w_{\\text{cache}} = 0.10$ is the Vertex AI \`ContextCacheConfig\` billing weight (**90% discount** on cached prefix tokens), reducing effective billable input tokens from $34,000$ to $5,200\\text{ tokens}$ (**$84.71\\%$ COGS savings** on the production bundle, and $1 - 750/4,800 = 84.38\\%$ on the $4,500 + 300$ unit benchmark).

> **Architectural Grounding Boundary (Shared \`ContextCacheConfig\` FinOps Ledger):** Prefix key integrity (\`verify_context_cache_safety()\`) and effective billable token accounting ($T_{\\text{eff}}$) are verified in [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) and streamed to live BigQuery table \`ramp-portal-dev.cymbal_agentic_finops_otel.tenant_telemetry_spans\`.

- **Prevent cold-start cache miss storms on TTL refresh:** Configure a background Cloud Scheduler keep-alive job that refreshes the \`cymbal-shared-incident-system-prompt-v2\` \`ContextCacheConfig\` descriptor 5 minutes before its 60-minute TTL expires, ensuring zero cold-cache latency spikes or uncached billing surges during peak traffic.

### Operational excellence

- **Deploy with declarative Terraform:** Use the [2.6 Terraform Starter (\`main.tf\`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) and its [1-Click Deployment Script (\`deploy_1click.sh\`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh) to provision the entire pooled stack reproducibly and run the [90-Minute Breach Simulation Codelab](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md) to train platform engineers.
- **End-to-end Pattern A (Pooled 5-Hop) verification across 10 third-party SaaS products (\`10/10 Flows • 20/20 Test Cases PASS\`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is tested end-to-end under **Pattern A** (\`120 RPM Pool\`, \`4,096\` token clamp, shared \`90% ContextCacheConfig\`, shared BigQuery/AlloyDB \`FORCE ROW LEVEL SECURITY\`). See the complete copy-pasteable manual setup, configuration JSON, \`curl\` probes, and Input/Output payloads in [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern A Pooled Runtime & Connector Config | Positive E2E Input & Verified Output (\`TC-A-POS\`) | Red-Team Breach Input & Verified Block (\`TC-A-NEG\`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **\`SAAS-01\` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` • Shared Pool + Spotter \`runtime_filter.tenant_id\` -> BigQuery RLS | **In:** \`tenant="finvault"\`, \`org="finvault-org-01"\` • **Out:** \`HTTP 200\` • \`row_count=2\` (\`ENT-FV-001..002\`), \`cache_discount=0.90\` | **In:** \`tenant="retailstream"\` spoofing \`org="finvault-org-01"\` • **Out:** **\`HTTP 403\`** \`CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-a --verbose\` |
| **\`SAAS-02\` Sigma Computing** (*Workbooks & Dataset API v2*) | \`mcp://cymbal/sigma-computing-workbooks-3lo\` • Shared Pool + \`ua_tenant_id\` warehouse RLS pushdown | **In:** \`tenant="retailstream"\`, \`workbook="wb-sigma-retailstream-checkout-02"\` • **Out:** \`HTTP 200\` • \`row_count=1\` (\`ENT-RS-001\`), live Sigma \`requestId\` | **In:** \`tenant="retailstream"\` tampering \`ua_tenant_id="finvault"\` • **Out:** **\`HTTP 403\`** \`DENY_SIGMA_UA_TENANT_TAMPERING\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-a --verbose\` |
| **\`SAAS-03\` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | \`mcp://retailstream/servicenow-itom-3lo\` • Shared Pool + Hop 5 3LO Vault (\`3lo_token_sn_rs_valid\`) | **In:** \`tenant="retailstream"\`, \`change="CHG0049218"\`, \`3lo=True\` • **Out:** \`HTTP 200\` • Live AWS AgentCore \`CHG0049218\` returned | **In:** \`tenant="retailstream"\`, \`seed_3lo=False\` (unconsented) • **Out:** **\`HTTP 401\`** \`CHALLENGE_3LO_OAUTH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-a --verbose\` |
| **\`SAAS-04\` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | \`mcp://finvault/veeva-muse-clinical-3lo\` • Shared Pool + Hop 2 Catalog ACL + Cloud KMS 21 CFR Part 11 sig | **In:** \`tenant="finvault"\`, \`study="FV-GXP-2026-04"\`, \`cohort="Cohort-B"\` • **Out:** \`HTTP 200\` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** \`tenant="retailstream"\` invoking restricted clinical MCP • **Out:** **\`HTTP 403\`** \`TENANT_CONNECTOR_ACL_DENIED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --pattern pattern-a --verbose\` |
| **\`SAAS-05\` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | \`mcp://finvault/salesforce-jira-escalation-3lo\` • Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask | **In:** \`tenant="finvault"\`, \`instance="NA224"\`, raw IBAN/SWIFT in notes • **Out:** \`HTTP 200\` • Live \`NA224\` (\`Winter '27 Patch 8.6\`) + \`[REDACTED-FINVAULT-IBAN]\` | **In:** Inspect egress payload for unredacted \`DE893704...\` • **Out:** **\`PASS\`** (\`raw_pii_leaked=False\`, 100% masked before SaaS call) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --pattern pattern-a --verbose\` |
| **\`SAAS-06\` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` • Shared Pool + \`cymbal_uc_prod.<tenant>_gold\` binding | **In:** \`tenant="finvault"\`, \`schema="finvault_gold"\` • **Out:** \`HTTP 200\` • \`Server: databricks\`, \`row_count=2\` (\`ENT-FV-001..002\`) | **In:** \`tenant="retailstream"\`, \`schema="finvault_gold"\` + \`EXECUTE IMMEDIATE\` • **Out:** **\`HTTP 403\`** \`UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-a --verbose\` |
| **\`SAAS-07\` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` • Shared Pool + \`ROLE_CYMBAL_<TENANT>\` & \`SECONDARY ROLES NONE\` | **In:** \`tenant="retailstream"\`, \`role="ROLE_CYMBAL_RETAILSTREAM"\` • **Out:** \`HTTP 200\` • \`Server: SF-LB-T1\`, \`row_count=1\` (\`ENT-RS-001\`) | **In:** \`sql_override="USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT"\` • **Out:** **\`HTTP 403\`** \`SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-a --verbose\` |
| **\`SAAS-08\` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | \`mcp://finvault/workday-hcm-financials-raas-3lo\` • Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP | **In:** \`tenant="finvault"\`, \`user="alice@finvault.com"\`, \`org="SUP-ORG-FINVAULT-NA"\` • **Out:** \`HTTP 200\` • Live Workday CCX probe + \`[REDACTED_US_SSN]\` | **In:** \`user="bob@finvault.com"\` reusing Alice's 3LO token • **Out:** **\`HTTP 401\`** \`WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-a --verbose\` |
| **\`SAAS-09\` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | \`mcp://cymbal/datadog-observability-sre-3lo\` • Shared Pool + \`@tenant_id\` log filter + Hop 4 Model Armor | **In:** \`tenant="finvault"\`, \`query="service:agent-gateway @tenant_id:finvault"\` • **Out:** \`HTTP 200\` • Live Datadog US1 API + \`2\` sanitized log spans | **In:** Log payload containing \`IGNORE ALL PREVIOUS INSTRUCTIONS...\` • **Out:** **\`HTTP 400\`** \`MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-a --verbose\` |
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Shared Pool + Hop 1 RFC 9449 DPoP \`jkt\` binding | **In:** \`tenant="finvault"\`, \`dpop="dpop_jkt_fv_001"\`, \`proof="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + Okta OIDC \`200\` | **In:** Stolen bearer token replay with \`proof="dpop_jkt_attacker_stolen_999"\` • **Out:** **\`HTTP 401\`** \`OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern pattern-a --verbose\` |

### Performance optimization

- **Connection pooling with transaction-local context:** Use PgBouncer in transaction-pooling mode in front of AlloyDB and always issue \`SET LOCAL app.current_tenant_id\` inside the transaction block (\`~1.8 ms\` checkout overhead) so session state never persists after \`COMMIT\`.

> **Architectural Grounding Boundary (Live Cloud Execution vs. Reference Emulation):** In the accompanying verification suite (\`scripts/verify_cloud_console_and_runtime.py\`), **Cloud Run Gen2** (\`ge-blogs\` / \`cymbal-multi-tenant-patterns\`), **Vertex AI** (\`gemini-2.5-pro\` & \`gemini-2.5-flash\`), **BigQuery** (\`pattern_a_pooled_rls_entities\` with \`ROW ACCESS POLICY\`), **Google Workspace** (\`15/15\` Slides decks & \`6/6\` Docs), **AWS Bedrock AgentCore MCP Gateway** (\`cymbal-a2a-mcp-gateway-kiu8omh4aq\`, 10 \`READY\` targets), **Amazon Cognito RS256 OAuth2**, **AWS Lambda MCP Proxy**, and **Amazon S3 Audit Ledgers** execute against **live cloud APIs**. To keep the 10-vector red-team breach simulation suite (\`run_breach_simulations.py\`) fast and deterministic without continuous idle hourly cluster charges, **AlloyDB for PostgreSQL** and **Memorystore for Valkey** are provided as **production-ready Terraform HCL blueprints** ([\`workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)) paired with **deterministic in-memory Python reference state machines** ([\`core-cymbal-agent/governance/\`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py)).`,
    whatsNextMd: `## What's next

### Companion 12-Slide WS2 Deck & Slide-to-Code Launch Matrix

The companion 12-slide Workstream 2 presentation deck ([\`slides/ws2-pattern-a-pooled-editable-slides.pptx\`](../slides/ws2-pattern-a-pooled-editable-slides.pptx)) maps directly to the runnable modules in [\`core-cymbal-agent/ (27-File Workbench)\`](#blog-e2e-pattern-execution-and-codebase-workbench) and \`workstream-2-pattern-a-pooled/\`:

| WS2 Slide Group (12-Slide Deck) | Core Architectural Focus | Runnable Code & Terraform Modules | Verification Command / Gate |
| :--- | :--- | :--- | :--- |
| **Slides 1–3** (Executive Summary, Pooled Economics & Persona Mapping) | High-density unit economics (\`120 RPM Pool\` vs \`600 RPM Ent\`), FinVault Bank (Google OIDC) & RetailStream Corp (Entra ID) onboarding | [\`2.1 Case Study & Solution Architecture\`](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md) • [\`pattern_a_pooled_service.py\`](../workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py) | \`python3 workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py\` |
| **Slides 4–6** (Pooled 5-Hop Data Plane, Multi-IdP 3LO Sandbox & Prefix Caching) | Cloud Armor header strip, KMS OBO/DPoP exchange, composite \`{tenant_id}:{user_id}\` 3LO vault, and \`84.7%\` \`ContextCacheConfig\` savings | [\`2.2 Demo Environment & 3P Auth Sandbox\`](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md) • [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | \`python3 workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py\` |
| **Slides 7–9** (10-Vector Red-Team Breach Matrix & AlloyDB RLS Proof) | Interception of forged \`X-Tenant-ID\`, private \`Agent Alpha\` enumeration (\`403\`), SQLi (\`400\`), NLC (\`422\`), Valkey \`429\`, and \`SET LOCAL\` RLS | [\`run_breach_simulations.py\`](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py) • [\`hop4_model_armor_guardrails.py\`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) • [\`hop5_data_rls_and_otel.py\`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | \`10/10\` Red-Team Breach Vectors PASS |
| **Slides 10–12** (Terraform 2.6 Resource Graph, 90-Min Codelab & Live Cloud Proof) | Declarative Terraform HCL starter, 1-click deployment script, BigQuery OTel ledger, and 10-SaaS AWS AgentCore MCP matrix | [\`2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) • [\`deploy_1click.sh\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh) • [\`codelab-90min-breach-sim.md\`](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md) | \`bash workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh --validate-only\` |

- Run the **1-Click Terraform Deployment Scripts & Inspect Live Cloud Console Receipts**:
  - [Pattern A (WS2.6 Pooled) 1-Click Terraform Script (\`workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh\`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/deploy_1click.sh) • [\`main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) • [\`variables.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/variables.tf) • [\`terraform.tfvars.example\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/terraform.tfvars.example)
  - [Master All-Pattern 1-Click Terraform Orchestrator (\`scripts/deploy_terraform_1click.sh\`)](../scripts/deploy_terraform_1click.sh)
  - [8-Stage Google Cloud Console & Cloud Shell End-to-End Runbook (\`docs/GOOGLE-CLOUD-CONSOLE-END-TO-END-RUNBOOK.md\`)](../docs/GOOGLE-CLOUD-CONSOLE-END-TO-END-RUNBOOK.md)
  - [Live GCP Cloud Console Verification Receipt (\`docs/cloud_console_verification_receipt.json\`)](../docs/cloud_console_verification_receipt.json) • [Live 10-SaaS × 3-Pattern AWS AgentCore S3 Receipt (\`docs/third_party_5_saas_verification_receipt.json\`)](../docs/third_party_5_saas_verification_receipt.json)
- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Explore the Workstream 2 engineering artifacts and hands-on lab:
  - [2.1 Pattern A Case Study & Solution Architecture](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)
  - [2.2 Demo Environment & 3P Auth Sandbox Setup](../workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md)
  - [2.3 Pattern A Pooled Runtime Implementation (\`pattern_a_pooled_service.py\`)](../workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py)
  - [2.4 Product Gaps & FinOps Prioritization](../workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md)
  - [2.5 10-Point Red-Team Breach Verification Suite (\`run_breach_simulations.py\`)](../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)
  - [2.6 Pattern A 1-Click Terraform Starter (\`main.tf\`)](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)
  - [2.8 90-Minute Hands-On Codelab: Red-Teaming Pooled Multi-Tenant Agents](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (\`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides and diagrams:
  - [Workstream 2 Editable Google Slides Deck (\`ws2-pattern-a-pooled-editable-slides.pptx\`)](../slides/ws2-pattern-a-pooled-editable-slides.pptx)`
  },
  {
    filename: 'ws3-pattern-b-sovereign-silos.md',
    pptxFile: 'ws3-pattern-b-siloed-editable-slides.pptx',
    frontmatter: {
      title: 'Multi-tenant agentic AI system: Pattern B sovereign silos for regulated workloads',
      subtitle: 'Isolate regulated banking, healthcare, and public-sector tenants inside dedicated Google Cloud projects with VPC Service Controls, IAM Principal Access Boundaries, Cloud KMS CMEK kill-switches, and air-gapped Gemma 3 on GKE',
      series: 'Multi-Tenant Agentic AI on Google Cloud — Workstream 3 of 5',
      workstream: 'Workstream 3 • Pattern B — Sovereign Silos for Regulated Workloads',
      authors: 'Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team',
      target_audience: 'Cloud Architects, CISOs, and Compliance Leads in FinTech, Healthcare, and Public Sector',
      reading_time: '14 min read',
      tags: ['Sovereign Cloud', 'VPC Service Controls', 'Principal Access Boundary', 'Cloud KMS CMEK', 'Gemma 3', 'GKE', 'Vertex AI Agent Engine', 'ADK', 'Zero Trust', 'Multi-Tenancy'],
      canonical_architecture: 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system',
      diagrams: ['ws3-pattern-b-sovereign-silos-architecture', 'ws3-multi-project-silo-and-cmek-setup-topology', 'ws3-terraform-silo-blueprint-resource-graph'],
      editable_slides: 'slides/ws3-pattern-b-siloed-editable-slides.pptx',
      status: 'PUBLISH_READY'
    },
    leadParagraphs: [
      `This document describes **Pattern B (Sovereign Silos)** for deploying a multi-tenant agentic AI system on Google Cloud when regulatory mandates (such as OCC/FDIC banking rules, EU DORA, HIPAA, or FedRAMP) prohibit shared compute pools and shared databases. Pattern B wraps the unchanged **80% reusable 5-Hop Cymbal agent core** ([\`core-cymbal-agent/\`](../core-cymbal-agent/)) inside a dedicated Google Cloud project per corporate tenant (\`cymbal-finvault-silo-prod\` and \`cymbal-retailstream-silo-prod\`), protected by a dedicated [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) perimeter, an organization-level [IAM Principal Access Boundary (PAB)](https://cloud.google.com/iam/docs/principal-access-boundary-policies), a customer-controlled [Cloud KMS](https://cloud.google.com/kms/docs) encryption key (\`HTTP 423 Locked\` kill-switch), and optional air-gapped **Gemma 3 (27B)** inference on private [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs).`,
      `This document is part 3 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (following [Part 1: Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md) and [Part 2: Pattern A Pooled Architecture](ws2-pattern-a-pooled-architecture.md)).`
    ],
    keyPointNote: `**Key point:** Pattern B reuses the exact same 5-Hop agent governance code as Pattern A while adding a physical project and cryptographic boundary around each tenant. If a customer revokes or disables their Cloud KMS key version, every in-flight and queued agent turn, memory bank read, and AlloyDB query halts immediately with **\`HTTP 423 Locked\`**.`,
    terminologyMd: `## Core terminology and Sovereign Silo systems primitives

Before diving into Pattern B's project-per-tenant topology and its companion [12-slide editable deck (\`slides/ws3-pattern-b-siloed-editable-slides.pptx\`)](../slides/ws3-pattern-b-siloed-editable-slides.pptx), we anchor how Pattern B resolves the **SaaS AI Architect's Dilemma** for regulated banking, healthcare, and public-sector tenants—wrapping the unchanged **80% reusable 5-Hop core** inside a dedicated Google Cloud project, VPC Service Controls perimeter, and Cloud KMS CMEK kill-switch—across the four foundational series primitives ([Part 1](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and Pattern B's **Computer Science (CS101)** hardware-security analogies:

- **Agent Development Kit (\`ADK\`):** The invariant 80% reusable Python agent runtime ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py)) deployed inside each tenant's dedicated project (\`cymbal-{tenant}-silo-prod\`) with \`before_agent_callback\`, \`before_model_callback\`, and \`before_tool_callback\` interceptors.
- **Agent Registry & Discovery (\`ARD\`):** The Hop 2 silo-local Discovery Engine catalog Policy Decision Point ([\`hop2_registry_pdp_callbacks.py\`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)) that restricts agent discovery strictly to principals inside the tenant's IAM Principal Access Boundary (\`PAB\`).
- **Model Context Protocol (\`MCP\`):** The tool-invocation protocol connecting each silo to tenant-scoped 3P SaaS endpoints and live AWS Bedrock AgentCore targets under Cloud KMS FDA 21 CFR Part 11 / DPoP signatures ([\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py)).
- **5-Hop Cryptographic Context Chain (\`Hops 1–5\` with Sub-Hops \`3a/3b\`, \`4a/4b\`, \`5a/5b\`):** The invariant governance pipeline spanning **Hop 1** (mTLS SPIFFE & IAM PAB Edge PEP), **Hop 2** (Silo ARD Catalog & ADK Callback PDP), **Hop 3a/3b** (Live Cloud KMS CMEK \`< 5 s\` Kill-Switch, Dedicated Vertex AI PT / Air-Gapped GKE Gemma 3 27B), **Hop 4a/4b** (Regional Model Armor & Cloud SDP Guardrails), and **Hop 5a/5b** (Dedicated CMEK AlloyDB & Silo BigQuery OTel Audit Sink).

| Sovereign Silo Primitive | Google Cloud Service & Module | CS101 / Hardware Systems Analogy | Security & Regulatory Guarantee in Pattern B |
| :--- | :--- | :--- | :--- |
| **Dedicated VPC Service Controls (\`VPC-SC\`) Perimeter** | **Access Context Manager** (\`perimeter_finvault_sovereign\` in [\`pattern_b_siloed_service.py\`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py)) | **Hardware IOMMU / DMA Protection Domain** blocking peripheral buses from reading or writing outside assigned physical RAM | Blocks cross-project API exfiltration (\`aiplatform\`, \`alloydb\`, \`storage\`, \`bigquery\`) at the Google Cloud control plane with \`HTTP 403 VPC_SC_PERIMETER_VIOLATION\` |
| **IAM Principal Access Boundary (\`PAB\`) & SPIFFE mTLS** | **Organization IAM v3 PAB Policy** + **Certificate Authority Service** (\`spiffe://...\`) | **CPU Capability Register (\`chroot\` + hardware ring capability mask)** | Restricts the tenant's agent principal so even a compromised credential cannot authenticate to any project outside \`cymbal-{tenant}-silo-prod\` (\`HTTP 401\` / \`HTTP 403\`) |
| **Cloud KMS CMEK + Cloud EKM \`<5 s\` Kill-Switch** | **Cloud KMS (HSM) / Cloud EKM** + **Valkey \`UNLINK {tenant_id}:*\`** ([\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) | **Self-Encrypting Drive (SED) Instant Cryptographic Erase + CPU TLB Shootdown** | Disabling \`agent-memory-cmek\` purges in-memory L1–L4 session state in \`< 5 seconds\` (\`0\` peer evictions) and halts all turns with \`HTTP 423 Locked\` |
| **Dedicated Vertex AI Provisioned Throughput (\`PT\`)** | **Vertex AI Reserved GSUs** (\`gemini-2.5-pro-dedicated\`) | **Dedicated Physical CPU Core Pinning (\`isolcpus\` / \`taskset\`)** | Guarantees deterministic sub-second TTFT and contractual throughput isolation during macro market or clinical emergencies |
| **Air-Gapped Gemma 3 (27B IT) on Private GKE** | **Private GKE GPU Cluster** + **vLLM (\`gemma-3-27b-it-vllm\`)** + **Artifact Registry Mirror** | **On-Premises Air-Gapped Hardware Enclave (Zero WAN NIC Route, \`0.0.0.0/0\` blocked)** | Keeps 100% of model weights, KV-cache tensors, and regulated prompts inside the customer's private subnet with \`public_egress = False\` |`,
    archIntro: `The following diagram shows the Pattern B sovereign silo architecture, where each corporate tenant operates inside an isolated Google Cloud project and VPC Service Controls perimeter:`,
    figures: [
      {
        num: 1,
        heading: null,
        title: 'Pattern B: Sovereign silos with VPC Service Controls, IAM PAB, Cloud KMS CMEK, and air-gapped Gemma 3 on GKE',
        diagId: 'ws3-pattern-b-sovereign-silos-architecture',
        captionDetail: 'Official Google Cloud Architecture Center hub-and-spoke topology showing the Sovereign mTLS & PAB Ingress Hub, Organization VPC-SC & Cloud KMS Governance Hub, Sovereign Silo Project A (`cymbal-finvault-silo-prod` with air-gapped Gemma 3 27B on GKE), and Sovereign Silo Project B (`cymbal-retailstream-silo-prod`).',
        zonesIntro: `Figure 1 organizes the Pattern B sovereign deployment into four security zones:`,
        zones: [
          { name: 'Sovereign mTLS and PAB Ingress Hub', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Verifies client mutual TLS (mTLS) SPIFFE certificates (`spiffe://finvault.com/ns/sre/sa/agent-client`) and evaluates the organization-level IAM Principal Access Boundary (`PAB`) before routing traffic into the tenant\'s dedicated project (`Hop 1`).' },
          { name: 'Organization VPC-SC, Cloud KMS CMEK, and SCC Governance Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Enforces per-project VPC Service Controls perimeters (`perimeter_finvault_sovereign`), verifies live Cloud KMS / Cloud EKM key state (`agent-memory-cmek`), monitors compliance in Security Command Center, and exports per-silo audit logs (`Hops 2 & 5`).' },
          { name: 'Sovereign Silo Project A — FinVault Bank (`cymbal-finvault-silo-prod`)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Dedicated Google Cloud project hosting FinVault\'s isolated Vertex AI Agent Engine runtime, private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput), air-gapped **Gemma 3 (27B IT)** on private GKE GPU nodes (zero public internet egress), and CMEK-encrypted AlloyDB and Memory Bank.' },
          { name: 'Sovereign Silo Project B — RetailStream Corp / MedCore Health (`cymbal-retailstream-silo-prod`)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Physically separate Google Cloud project inside `perimeter_retailstream_sovereign` with its own IAM PAB policy, dedicated Provisioned Throughput Gemini 2.5 Pro endpoint, dedicated CMEK AlloyDB cluster, and isolated Microsoft Entra ID 3LO MCP servers.' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 (\`1\`–\`7\`) match the visual diagram badges 1:1 (mapping canonical 5-Hop flow stages \`1 Request\`, \`2 Request\`, \`3 Route\`, \`4 Sanitize request\`, \`5 Generates response\`, \`6 Sanitize response\`, and \`7 Sanitized response\` across sub-hops \`Hop 3a/3b\`, \`Hop 4a/4b\`, and \`Hop 5a/5b\`) and trace a sovereign agent turn in [\`pattern_b_siloed_service.py\`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py) and [\`runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py):`,
        steps: [
          { title: 'Mutual TLS (mTLS) and OIDC ingress (`1 Request` / `1 mTLS Request`)', body: 'The tenant client connects to the sovereign ingress gateway with a pinned mTLS SPIFFE client certificate (`spiffe://finvault.com/ns/sre/sa/agent-client`) and an upstream OIDC JWT (`pattern_b_siloed_service.py:L62-L88`, `runtime_pipeline.py:L60-L80`).' },
          { title: 'Hop 1 & Hop 2 — Sovereign mTLS SPIFFE, IAM PAB, and ARD Catalog (`2 Request` / `2 mTLS Valid`)', body: '`PatternBSiloedService` verifies that the client certificate (`HTTP 401` on SPIFFE mismatch) and IAM principal (`HTTP 403` on PAB violation) are bound exclusively to the target silo project (`cymbal-finvault-silo-prod`), and filters the silo-local Discovery Engine ARD Agent Catalog (`pattern_b_siloed_service.py:L90-L122`, `runtime_pipeline.py:L82-L97`).' },
          { title: 'Hop 3a — Route to isolated VPC-SC tenant project (`3 Route` / `3 Route to isolated VPC-SC tenant project`)', body: 'Verified requests cross the VPC-SC ingress policy into the dedicated tenant project (`perimeter_finvault_sovereign` or `perimeter_retailstream_sovereign`), blocking any unauthorized cross-project API egress (`HTTP 403 VPC_SC_PERIMETER_VIOLATION`, `runtime_pipeline.py:L99-L113`).' },
          { title: 'Hop 4a (Pre-inference) — VPC-SC & Model Armor prompt sanitization (`4 Sanitize request`)', body: 'Inside the silo perimeter, regional Vertex AI Model Armor and Cloud DLP inspect the prompt inline (`hop4_model_armor_guardrails.py`, `runtime_pipeline.py:L115-L125`), blocking prompt/SQL injection (`HTTP 400`) and OCC/FDIC or HIPAA NLC policy violations (`HTTP 422`).' },
          { title: 'Hop 3b & Hop 5a — Live Cloud KMS CMEK check, air-gapped Gemma 3 / Vertex AI PT, and local MCP (`5 Generates response` / `5 Air-gapped inference`)', body: 'The runtime verifies that `agent-memory-cmek` is `ENABLED` (halting within `< 5s` via Valkey `UNLINK` and returning `HTTP 423 Locked` if revoked), executes inference on air-gapped **Gemma 3 (27B IT)** on private GKE (`gemma-3-27b-it-vllm`, `public_egress = False`) or dedicated Vertex AI PT (`gemini-2.5-pro-dedicated`), and invokes silo-local MCP servers + CMEK AlloyDB (`pattern_b_siloed_service.py:L124-L168`, `runtime_pipeline.py:L127-L162`).' },
          { title: 'Hop 4b (Post-inference) — Output DLP and semantic NLC compliance (`6 Sanitize response`)', body: 'Generated completions and tool outputs pass post-inference Cloud DLP de-identification and semantic NLC verification before leaving the silo runtime (`runtime_pipeline.py:L164-L182`).' },
          { title: 'Hop 5b — Sovereign response delivery or HTTP 423 Locked halt (`7 Sanitized response` / `7 Sovereign response (or HTTP 423 Locked)`)', body: 'Returns the sanitized sovereign `HTTP 200` response (or `HTTP 423 Locked` on revoked CMEK) and writes a zero-PII CMEK-encrypted OpenTelemetry audit span to the silo\'s BigQuery dataset (`hop5_data_rls_and_otel.py`, `runtime_pipeline.py:L184-L209`).' }
        ]
      },
      {
        num: 2,
        heading: '### Multi-project silo and Cloud KMS CMEK setup topology (Figure 2)',
        title: 'Pattern B: 4-stage multi-project provisioning, VPC-SC perimeter, and CMEK kill-switch topology',
        diagId: 'ws3-multi-project-silo-and-cmek-setup-topology',
        captionDetail: 'Step-by-step multi-project setup topology (`workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md`) showing Organization Access Context Manager, IAM PAB binding, Cloud KMS CMEK key rings, and private GKE Gemma 3 node pools.',
        zonesIntro: `Figure 2 details the four provisioning stages documented in [3.2 Multi-Project Silo & CMEK Setup](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md):`,
        zones: [
          { name: 'Stage 1 — Identity, mTLS Certificate Authority, and IAM PAB', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Configures Certificate Authority Service for SPIFFE mTLS certificates and binds the IAM Principal Access Boundary policy to the tenant folder/project.' },
          { name: 'Stage 2 — Access Context Manager, VPC-SC, and Cloud KMS CMEK', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Creates the dry-run and enforced VPC-SC service perimeters covering `aiplatform.googleapis.com`, `alloydb.googleapis.com`, and `storage.googleapis.com`, and provisions customer-managed KMS keys.' },
          { name: 'Stage 3 — Air-Gapped GKE Gemma 3 (27B) and Silo Agent Runtime', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Deploys a private GKE cluster (`enable_private_nodes = true`, `enable_private_endpoint = true`) serving `gemma-3-27b-it-vllm` from a local Artifact Registry mirror alongside Vertex AI Agent Engine.' },
          { name: 'Stage 4 — CMEK Data Plane and Automated Kill-Switch Verification', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Binds `agent-memory-cmek` to AlloyDB, Memorystore, Vertex AI Memory Bank, and BigQuery, and validates instant `HTTP 423` revocation.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 2 (\`1\`–\`7\`) match the visual diagram badges for multi-project provisioning and CMEK revocation ([3.2 Multi-Project Silo & CMEK Setup](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md)):`,
        steps: [
          { title: 'Bootstrap sovereign silo CLI pipeline (`1 gcloud bootstrap`)', body: 'The security engineer initiates the automated silo setup workflow across the Organization folder.' },
          { title: 'Verify isolated tenant projects and IAM PAB (`2 Projects ready`)', body: 'Provisions `cymbal-{tenant}-silo-prod` with billing/quota isolation and attaches the organization `{tenant}-sovereign-pab` policy.' },
          { title: 'Provision tenant silo VPC and VPC-SC perimeter (`3 Provision tenant silo project`)', body: 'Configures private VPC subnets (`restricted.googleapis.com`) and locks 8 sensitive APIs inside `perimeter_{tenant}_sovereign`.' },
          { title: 'Create regional Cloud KMS key ring (`4 Create key ring`)', body: 'Provisions the dedicated regional `google_kms_key_ring` inside the tenant\'s sovereign project.' },
          { title: 'Create HSM/EKM CMEK crypto key (`5 Create CMEK crypto key`)', body: 'Creates `agent-memory-cmek` with HSM protection and 30-day rotation, granting `roles/cloudkms.cryptoKeyEncrypterDecrypter` to the silo\'s Vertex AI, AlloyDB, and Storage service agents.' },
          { title: 'Bind CMEK key across AlloyDB, GKE Gemma 3, and Memory Bank (`6 Bind CMEK key`)', body: 'Deploys the CMEK-encrypted AlloyDB cluster, Vertex AI Agent Engine runtime, and private GKE Gemma 3 (27B) GPU node pool.' },
          { title: 'Execute exfiltration and CMEK revocation verification suite (`7 Exfil & CMEK revocation tests`)', body: 'Runs `run_silo_security_tests.py` (`6/6 PASS`) to certify mTLS (`401`), PAB (`403`), VPC-SC exfiltration block (`403`), and live CMEK revocation (`HTTP 423 Locked`).' }
        ]
      },
      {
        num: 3,
        heading: '### Parameterized Terraform silo blueprint resource graph (Figure 3)',
        title: 'Pattern B: Parameterized Terraform sovereign silo module resource graph',
        diagId: 'ws3-terraform-silo-blueprint-resource-graph',
        captionDetail: 'Declarative Terraform resource dependency graph (`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/`) for stamping out repeatable sovereign tenant silos.',
        zonesIntro: `Figure 3 maps the Terraform resources in [\`3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) and [\`3.6-terraform-silo-blueprint/deploy_1click.sh\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh):`,
        zones: [
          { name: 'Project Factory and mTLS Ingress Resources', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Provisions `google_project`, private VPC subnets, and mTLS load balancer certificates.' },
          { name: 'VPC-SC Perimeter, IAM PAB, and KMS Resources', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Provisions `google_access_context_manager_service_perimeter`, `google_iam_principal_access_boundary_policy`, and `google_kms_crypto_key`.' },
          { name: 'Private GKE Gemma 3 and Vertex AI Runtime Resources', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Provisions `google_container_cluster` (private GPU pool), Artifact Registry weights mirror, and Vertex AI Agent Engine runtime.' },
          { name: 'CMEK AlloyDB, Memorystore, and BigQuery Resources', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions `google_alloydb_cluster` and `google_bigquery_dataset` encrypted with `encryption_config { kms_key_name = ... }`.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 3 (\`1\`–\`7\`) match the visual diagram badges in the Terraform stamp-out DAG ([\`3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf)):`,
        steps: [
          { title: 'Invoke Terraform silo blueprint (`1 terraform apply`)', body: 'Pass `tenant_id = "finvault"`, `silo_project_id`, `inference_mode`, and `vpc_sc_enforcement_mode` via `deploy_1click.sh`.' },
          { title: 'Resolve tenant project metadata and PAB (`2 Vars resolved`)', body: 'Queries `data.google_project.tenant_silo` for the project number and binds the organization IAM PAB policy.' },
          { title: 'Build KMS-first dependency graph (`3 Build dependency graph (KMS first)`)', body: 'Provisions `google_kms_key_ring`, `google_kms_crypto_key` (`agent-memory-cmek`), and service-agent IAM bindings before any stateful resource is created.' },
          { title: 'Bind project number to CMEK storage, AlloyDB, and GKE (`4 Bind project num`)', body: 'Creates CMEK-encrypted `google_storage_bucket`, `google_alloydb_cluster`, and conditional private `google_container_cluster` (`gemma3_gpu_pool`).' },
          { title: 'Enroll project in Access Context Manager perimeter (`5 status.resources projects/${number}`)', body: 'Registers `projects/${data.google_project.tenant_silo.number}` inside `google_access_context_manager_service_perimeter.silo_perimeter`.' },
          { title: 'Restrict 8 sensitive Google Cloud APIs (`6 Restrict 8 APIs`)', body: 'Locks `aiplatform`, `alloydb`, `storage`, `bigquery`, `dlp`, `modelarmor`, `cloudkms`, and `container.googleapis.com` inside the VPC-SC `spec` (Dry-Run) or `status` (Enforced) block.' },
          { title: 'Emit CMEK key ID & perimeter outputs (`7 Outputs: CMEK key ID & perimeter`)', body: 'Exports `silo_cmek_key_id`, `vpc_sc_perimeter_name`, and `gke_gemma3_cluster_name` (`outputs.tf`) and runs `run_silo_security_tests.py` (`6/6 PASS`).' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern B is designed for regulated enterprise customers whose legal, compliance, or risk teams prohibit shared multi-tenant infrastructure ([3.1 Case Study & Solution Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)):

- **Regulated banking and capital markets (OCC/FDIC, EU DORA, PCI DSS Level 1):** Financial institutions such as **FinVault Bank** (\`cymbal-finvault-silo-prod\`) that require dedicated compute quotas, zero physical blast radius, and a customer-held Cloud KMS / Cloud EKM encryption kill-switch over all agent memory and audit logs.
- **Sovereign healthcare, retail, and life sciences (HIPAA, GxP):** Regulated healthcare and enterprise tenants (such as **MedCore Health** and **RetailStream Corp's** sovereign division in \`cymbal-retailstream-silo-prod\`) processing Protected Health Information (PHI) or regulated payment telemetry that mandate dedicated VPC Service Controls perimeters and dedicated CMEK-encrypted AlloyDB clusters.
- **Air-gapped defense, intelligence, and core ledger environments:** Workloads that prohibit sending prompts to shared multi-tenant model endpoints and require self-hosted open-weight models (**Gemma 3 27B IT**) running on private GKE GPU nodes with zero internet egress.`,
    alternativesMd: `## Design alternatives

Every Pattern B sovereign silo runs the unchanged **5-Hop Cryptographic Context Chain** introduced in [Part 1: Reference architecture taxonomy and 5-Hop baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md) ([\`core-cymbal-agent/runtime_pipeline.py\`](../core-cymbal-agent/runtime_pipeline.py))—spanning **Hop 1** (mTLS SPIFFE & IAM PAB Edge PEP), **Hop 2** (Silo-Local Discovery Engine Catalog PDP), **Hop 3** (Dedicated Silo Compute & Live CMEK Kill-Switch), **Hop 4** (Regional Model Armor & Cloud DLP Guardrails), and **Hop 5** (Dedicated CMEK AlloyDB & Silo Audit Ledger)—wrapped inside a dedicated Google Cloud project and VPC Service Controls perimeter.

### Managed Vertex AI endpoints vs air-gapped Gemma 3 (27B) on private GKE inside a silo

Within a Pattern B sovereign silo, architects can choose between managed Vertex AI foundation models and self-hosted open-weight models on GKE:

| Criterion | Managed Vertex AI Gemini 2.5 Pro (Dedicated Provisioned Throughput + VPC-SC + CMEK) | Air-Gapped Gemma 3 (27B IT) on Private GKE GPU Nodes |
| :--- | :--- | :--- |
| **Network boundary** | Accessed via Private Google Access inside the tenant's VPC-SC perimeter | Runs 100% inside the tenant's private GKE subnet (\`0.0.0.0/0\` egress blocked) |
| **Model weights & residency** | Google-managed regional endpoints with Dedicated Provisioned Throughput (\`gemini-2.5-pro-dedicated\`) | Weights mirrored in tenant's CMEK-encrypted Artifact Registry |
| **Reasoning & context window** | Highest multimodal reasoning capacity + 1M–2M context window | High-throughput open-weight reasoning for air-gapped core-ledger runbooks |
| **Operational overhead** | Fully serverless managed endpoint | Tenant GKE GPU node pool lifecycle managed via Terraform |

### 6-point sovereign silo verification matrix

Every Pattern B silo is certified against six automated security assertions matching the exact execution order of [\`run_silo_security_tests.py\`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py):

| Test ID | Sovereign security assertion (\`run_silo_security_tests.py\`) | Enforcing layer | Verified runtime result |
| :--- | :--- | :--- | :--- |
| **Silo Test 1** | Spoofed mTLS SPIFFE certificate (\`spiffe://retailstream.com/...\` targeting FinVault silo) | **mTLS Ingress Pinning (Pre-Check 1)** | Blocked with **\`HTTP 401 MTLS_SPIFFE_MISMATCH\`** |
| **Silo Test 2** | Cross-silo identity replay (RetailStream principal targeting \`cymbal-finvault-silo-prod\`) | **IAM Principal Access Boundary (PAB Pre-Check 2)** | Blocked with **\`HTTP 403 PAB_VIOLATION\`** |
| **Silo Test 3** | Tool attempting cross-project data exfiltration to \`external-attacker-proj\` | **VPC Service Controls (VPC-SC Pre-Check 3)** | Blocked with **\`HTTP 403 VPC_SC_PERIMETER_VIOLATION\`** |
| **Silo Test 4A** | FinVault revokes/disables Cloud KMS key (\`cmek_state = REVOKED_OR_DISABLED\`) | **Cloud KMS CMEK Kill-Switch (Hop 3)** | Halts immediately with **\`HTTP 423 Locked\`** |
| **Silo Test 4B & 5** | FinVault restores Cloud KMS key and executes air-gapped GKE Gemma 3 (27B) turn | **All 5 Hops + Private GKE vLLM (\`gemma-3-27b-it-vllm\`)** | **\`HTTP 200 ALLOW\`** with \`public_egress = False\` |
| **Silo Test 6** | Dual-silo parity: RetailStream / MedCore silo turn + independent CMEK revocation | **Isolated Project \`cymbal-retailstream-silo-prod\`** | **\`HTTP 200 ALLOW\`** when enabled; **\`HTTP 423 Locked\`** on revoke |`,
    productsMd: `## Products used

Pattern B (Sovereign Silos) uses the following Google Cloud products inside each tenant's dedicated project (\`cymbal-{tenant}-silo-prod\`):

### Sovereign agent runtime and air-gapped foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Run a dedicated single-tenant instance of the 80% reusable 5-Hop agent core per project with CMEK-encrypted session and memory state.
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs) and [Artifact Registry](https://cloud.google.com/artifact-registry/docs): Host air-gapped **Gemma 3 (27B IT)** vLLM inference on private GPU node pools (\`enable_private_nodes = true\`, \`enable_private_endpoint = true\`) pulling weights over Private Google Access with zero public internet egress.
- [Gemini 2.5 Pro Dedicated Provisioned Throughput](https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput/overview) and [Vertex AI Model Garden](https://cloud.google.com/model-garden): Provide guaranteed, no-noisy-neighbor model capacity (\`gemini-2.5-pro-dedicated\`) inside the tenant's VPC Service Controls perimeter.

### Perimeter isolation, mTLS identity, and cryptographic kill-switch

- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Access Context Manager](https://cloud.google.com/access-context-manager/docs): Enclose each tenant project inside a dedicated service perimeter (\`perimeter_{tenant}_sovereign\`) that blocks cross-project API exfiltration (\`HTTP 403\`).
- [IAM Principal Access Boundary (PAB)](https://cloud.google.com/iam/docs/principal-access-boundary-policies) and [Certificate Authority Service](https://cloud.google.com/certificate-authority-service/docs): Pin workload and user principals exclusively to their assigned silo project and validate SPIFFE mTLS client certificates (\`HTTP 401\` on mismatch).
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs) and [Cloud External Key Manager (Cloud EKM)](https://cloud.google.com/kms/docs/ekm): Enforce customer-managed encryption keys (\`agent-memory-cmek\`) across memory, storage, and databases with an instant \`HTTP 423 Locked\` kill-switch.

### Dedicated data plane, AI safety guardrails, and compliance posture

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs) and [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview): Provide physically isolated, CMEK-encrypted relational and in-memory state per tenant silo.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): Enforce tenant-specific OCC/FDIC, HIPAA, and PCI guardrails inline (\`Hop 4\`).
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Deliver per-silo compliance posture monitoring and CMEK-encrypted OpenTelemetry audit trails.`,
    considerationsMd: `## Design considerations

This section provides guidance for operating Pattern B according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Protect APIs with VPC Service Controls, not just firewall rules:** Include \`aiplatform.googleapis.com\`, \`discoveryengine.googleapis.com\`, \`modelarmor.googleapis.com\`, \`dlp.googleapis.com\`, \`alloydb.googleapis.com\`, \`storage.googleapis.com\`, and \`bigquery.googleapis.com\` in the restricted service list of \`perimeter_{tenant}_sovereign\` ([3.4 VPC-SC & Security Sign-Off](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md)).
- **Bind IAM Principal Access Boundaries (PAB) at the organization root:** Pin each tenant's Workforce Identity Pool principals exclusively to \`//cloudresourcemanager.googleapis.com/projects/cymbal-{tenant}-silo-prod\` so compromised credentials cannot access any other project.
- **Wire Cloud KMS CMEK as a unified kill-switch with instant \`< 5 s\` in-memory cache eviction:** Encrypt the Vertex AI Memory Bank, AlloyDB cluster, GKE persistent disks, and BigQuery datasets with the same tenant KMS key. Because long-lived worker pods could otherwise hold decrypted L1–L4 session state in RAM after a KMS key is disabled (\`GAP-P1-04\`), **Hop 3** performs a live sub-second Cloud KMS key-state probe before every turn and, upon detecting \`DISABLED\` or \`DESTROY_SCHEDULED\`, immediately executes \`SCAN 0 MATCH {tenant_id}:* COUNT 500\` + \`UNLINK\` on Memorystore for Valkey, recycles the gVisor worker sandbox within \`< 5 seconds\`, and returns \`HTTP 423 Locked\`:

$$
T_{\\text{revoke}}(i) = \\tau_{\\text{KMS\\_disable}} + \\tau_{\\text{PubSub\\_fanout}} + \\tau_{\\text{Valkey\\_SCAN\\_UNLINK}}(K_i) = 1.20\\text{ s} + 0.45\\text{ s} + 0.85\\text{ s} = 2.50\\text{ s} < 5.00\\text{ s SLA}, \\qquad \\Delta K_{\\text{peers}}(j \\neq i) = 0
$$

Where:
- $T_{\\text{revoke}}(i)$ is the total elapsed convergence time from the customer's Cloud KMS / Cloud EKM \`DisableCryptoKeyVersion\` API call until 100% of tenant $i$'s active sessions, L1–L4 memory keys, and database mounts fail closed with \`HTTP 423 Locked\`.
- $\\tau_{\\text{KMS\\_disable}} = 1.20\\text{ s}$ is the Cloud KMS / Cloud EKM key-state propagation latency.
- $\\tau_{\\text{PubSub\\_fanout}} = 0.45\\text{ s}$ is the Cloud Audit Log to Pub/Sub push notification latency.
- $\\tau_{\\text{Valkey\\_SCAN\\_UNLINK}}(K_i) = 0.85\\text{ s}$ is the non-blocking asynchronous \`SCAN + UNLINK\` eviction latency across tenant $i$'s $K_i$ cached keys, leaving $\\Delta K_{\\text{peers}}(j \\neq i) = 0$ keys evicted for any other sovereign silo $j \\neq i$.

> **Architectural Grounding Boundary (Cloud KMS CMEK Kill-Switch & \`< 5 s\` Valkey Purge):** Verified against live Cloud KMS key ring \`cymbal-tenant-cmek-ring-usw1\` in \`ramp-portal-dev\` and tested deterministically in [\`run_silo_security_tests.py\`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py) (\`Silo Tests 4A, 4B & 6\`).

### Reliability

- **Dedicated Provisioned Throughput (PT) or dedicated GPU nodes:** Because each silo has its own Google Cloud project, API quotas and model throughput are physically isolated—eliminating cross-tenant noisy-neighbor risk.

### Cost optimization

- **Understand the baseline cost floor (\`600 RPM Silo/month\` / \`~$19,500/mo\` per dedicated tenant project):** Dedicated AlloyDB instances, Memorystore clusters, and private GKE GPU nodes (or reserved Vertex AI GSUs) carry a non-trivial dedicated infrastructure floor that scales linearly with the number of sovereign silos $N_{\\text{silo}}$:

$$
\\text{TCO}_{\\text{Pattern B}}(N_{\\text{silo}}) = \\sum_{s=1}^{N_{\\text{silo}}} \\Big(C_{\\text{base\\_silo}} + \\mathbb{I}_{\\text{PT}}(s)\\cdot U_s \\cdot p_{\\text{GSU}} + \\mathbb{I}_{\\text{GKE}}(s)\\cdot G_s \\cdot p_{\\text{GPU}}\\Big) = N_{\\text{silo}} \\times \\$19,500/\\text{mo}
$$

Where:
- $N_{\\text{silo}}$ is the number of isolated project-per-tenant silos (e.g., $N_{\\text{silo}} = 10 \\implies \\$195,000/\\text{mo}$).
- $C_{\\text{base\\_silo}} = \\$6,500/\\text{mo}$ is the per-silo baseline infrastructure floor (dedicated CMEK AlloyDB HA cluster, private VPC endpoints, Cloud KMS HSM, and audit sinks).
- $\\mathbb{I}_{\\text{PT}}(s), \\mathbb{I}_{\\text{GKE}}(s) \\in \\{0,1\\}$ select either Dedicated Vertex AI Provisioned Throughput ($U_s$ reserved GSUs at unit price $p_{\\text{GSU}} \\approx \\$13,000/\\text{mo}$) or air-gapped Private GKE Gemma 3 27B ($G_s$ NVIDIA A100/H100/L4 GPU nodes at unit price $p_{\\text{GPU}} \\approx \\$13,000/\\text{mo}$). Reserve full Pattern B silos for Enterprise contracts that price in dedicated infrastructure, or use [Pattern C (Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md) to share a control plane while isolating only Enterprise data/runtime spokes (**74% portfolio TCO reduction**).

> **Architectural Grounding Boundary (Sovereign Silo TCO & Terraform Stamp-Out):** The parameterized project-per-tenant infrastructure graph ($C_{\\text{base\\_silo}}$, Vertex AI PT, and private GKE Gemma 3 27B) is codified in [\`3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) and validated in CI/CD via \`deploy_1click.sh --validate-only\`.

### Operational excellence

- **Automate silo stamp-out with Terraform:** Never configure VPC-SC perimeters or CMEK bindings manually in the console. Use the parameterized [3.6 Terraform Silo Blueprint (\`main.tf\`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) and its [1-Click Deployment Script (\`deploy_1click.sh\`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh) so every tenant silo is identical and auditable.
- **End-to-end Pattern B (Sovereign Silos) verification across 10 third-party SaaS products (\`10/10 Flows • 20/20 Test Cases PASS\`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is verified inside **Pattern B's Sovereign Silo Shell** (\`cymbal-finvault-silo-prod\`, \`mTLS SPIFFE spiffe://cymbal.internal/ns/silo-finvault/sa/agent-runner\`, \`IAM PAB pab-silo-finvault\`, \`VPC-SC perimeter_cymbal_finvault_silo\`, \`600 RPM Silo\`, \`8,192\` token budget, and \`Cloud KMS CMEK Kill-Switch HTTP 423 Locked\` with \`< 5s\` Valkey purge). See complete setup, configuration JSON, \`curl\` probes, and Input/Output test payloads in [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern B Sovereign Silo Shell & VPC-SC/CMEK Config | Positive E2E Input & Verified Output (\`TC-B-POS\`) | Sovereign Silo Breach / CMEK Input & Verified Block (\`TC-B-NEG\`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **\`SAAS-01\` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` • Silo \`cymbal-finvault-silo-prod\` + VPC-SC egress rule | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`spiffe=True\`, \`org="finvault-org-01"\` • **Out:** \`HTTP 200\` • \`Server: ThoughtSpot\`, \`row_count=2\` FinVault rows | **In:** Silo KMS CMEK key revoked (\`projects/cymbal-medcore-silo-prod/.../medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` + \`valkey_purged=True\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-b --verbose\` |
| **\`SAAS-02\` Sigma Computing** (*Workbooks & Dataset API v2*) | \`mcp://cymbal/sigma-computing-workbooks-3lo\` • Silo CMEK + \`ua_tenant_id=finvault\` BigQuery pushdown | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`cmek="finvault-active-cmek"\` • **Out:** \`HTTP 200\` • Live Sigma \`requestId\` + \`2\` FinVault rows | **In:** Customer revokes Cloud KMS CMEK key mid-session (\`medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-b --verbose\` |
| **\`SAAS-03\` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | \`mcp://retailstream/servicenow-itom-3lo\` • Silo VPC-SC egress -> AWS Bedrock AgentCore MCP | **In:** \`silo="cymbal-retailstream-silo-prod"\`, \`change="CHG0049218"\`, \`3lo=True\` • **Out:** \`HTTP 200\` • Live AWS AgentCore \`CHG0049218\` returned | **In:** Revoke Silo KMS CMEK key or omit 3LO grant • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 401 CHALLENGE_3LO_OAUTH\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-b --verbose\` |
| **\`SAAS-04\` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | \`mcp://finvault/veeva-muse-clinical-3lo\` • Regulated GxP Silo + Cloud KMS 21 CFR Part 11 sig | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`study="FV-GXP-2026-04"\`, \`doc="VV-DOC-004819"\` • **Out:** \`HTTP 200\` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** Cross-silo principal or revoked Silo CMEK key • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva --pattern pattern-b --verbose\` |
| **\`SAAS-05\` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | \`mcp://finvault/salesforce-jira-escalation-3lo\` • Silo VPC-SC egress + Hop 4 Egress Cloud SDP | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`instance="NA224"\`, raw IBAN/SWIFT • **Out:** \`HTTP 200\` • Live \`NA224\` (\`Winter '27 Patch 8.6\`) + \`[REDACTED-FINVAULT-IBAN]\` | **In:** Silo KMS CMEK revocation + egress PII inspection • **Out:** **\`HTTP 423 Locked\`** & \`raw_pii_leaked=False\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce --pattern pattern-b --verbose\` |
| **\`SAAS-06\` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` • Silo VPC-SC -> \`cymbal_uc_prod.finvault_gold\` | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`schema="finvault_gold"\` • **Out:** \`HTTP 200\` • \`Server: databricks\`, \`row_count=2\` (\`ENT-FV-001..002\`) | **In:** Revoke Silo KMS CMEK key before Unity Catalog federation • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-b --verbose\` |
| **\`SAAS-07\` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` • Silo VPC-SC -> Snowflake \`SF-LB-T1\` (\`SECONDARY_ROLES=NONE\`) | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`role="ROLE_CYMBAL_FINVAULT"\` • **Out:** \`HTTP 200\` • \`Server: SF-LB-T1\`, \`row_count=2\` (\`ENT-FV-001..002\`) | **In:** Revoke Silo KMS CMEK key or attempt \`USE SECONDARY ROLES ALL\` • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-b --verbose\` |
| **\`SAAS-08\` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | \`mcp://finvault/workday-hcm-financials-raas-3lo\` • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN SDP | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`user="alice@finvault.com"\` • **Out:** \`HTTP 200\` • Live Workday CCX probe + \`[REDACTED_US_SSN]\` | **In:** Revoke Silo KMS CMEK key or cross-principal 3LO token reuse • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 401\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-b --verbose\` |
| **\`SAAS-09\` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | \`mcp://cymbal/datadog-observability-sre-3lo\` • Silo Log Index \`@tenant_id:finvault\` + Hop 4 Model Armor | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`query="@tenant_id:finvault"\` • **Out:** \`HTTP 200\` • Live Datadog US1 API + \`2\` sanitized log spans | **In:** Revoked Silo CMEK (\`423\`) or poisoned log stack trace (\`400\`) • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 400\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-b --verbose\` |
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Silo mTLS SPIFFE + Okta DPoP + Silo CMEK Kill-Switch | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`dpop="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + Okta OIDC \`200\` | **In:** Revoke Silo KMS CMEK key (\`medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** + Valkey session cache purged in \`< 5s\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike --pattern pattern-b --verbose\` |

### Performance optimization

- **Localize vLLM model weights in Artifact Registry:** Store Gemma 3 container images and model weights in a regional Artifact Registry repository inside the silo perimeter so GKE GPU nodes pull weights over Private Google Access at line rate.

> **Architectural Grounding Boundary (Live Cloud Execution vs. Reference Emulation):** In the accompanying verification suite (\`scripts/verify_cloud_console_and_runtime.py\`), **Cloud Run Gen2** (\`ge-blogs\` / \`cymbal-multi-tenant-patterns\`), **Vertex AI** (\`gemini-2.5-pro\` & \`gemini-2.5-flash\`), **BigQuery** (\`pattern_b_sovereign_silo_ledger\`), **Google Workspace** (\`15/15\` Slides decks & \`6/6\` Docs), **AWS Bedrock AgentCore MCP Gateway** (\`cymbal-a2a-mcp-gateway-kiu8omh4aq\`, 10 \`READY\` targets), and **Amazon S3 Audit Ledgers** execute against **live cloud APIs**. To allow immediate deterministic execution of the 6-test sovereign security suite (\`run_silo_security_tests.py\`) without requiring 24x7 idle GPU node pools, **Private GKE Gemma 3 (27B)**, **VPC-SC Perimeters**, and **CMEK AlloyDB** are provided as **parameterized Terraform HCL blueprints** ([\`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf)) paired with **deterministic Python reference state machines** ([\`pattern_b_siloed_service.py\`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py)).`,
    whatsNextMd: `## What's next

### Companion 12-Slide WS3 Deck & Slide-to-Code Launch Matrix

The companion 12-slide Workstream 3 presentation deck ([\`slides/ws3-pattern-b-siloed-editable-slides.pptx\`](../slides/ws3-pattern-b-siloed-editable-slides.pptx)) maps directly to the runnable modules in [\`core-cymbal-agent/ (27-File Workbench)\`](#blog-e2e-pattern-execution-and-codebase-workbench) and \`workstream-3-pattern-b-siloed/\`:

| WS3 Slide Group (12-Slide Deck) | Core Architectural Focus | Runnable Code & Terraform Modules | Verification Command / Gate |
| :--- | :--- | :--- | :--- |
| **Slides 1–3** (Regulated Sovereign Mandates, OCC/HIPAA/DORA & Silo Economics) | Why shared pools fail sovereign audits; \`600 RPM Silo\` (\`~$19,500/mo\`) dedicated project floor vs. regulatory compliance | [\`3.1 Case Study & Sovereign Silo Architecture\`](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md) • [\`pattern_b_siloed_service.py\`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py) | \`python3 workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py\` |
| **Slides 4–6** (Project-per-Tenant VPC-SC Perimeters, SPIFFE mTLS & IAM PAB) | Dedicated GCP projects (\`cymbal-finvault-silo-prod\`, \`cymbal-retailstream-silo-prod\`), VPC-SC Dry-Run vs. Enforced mode, and CISO sign-off | [\`3.2 Multi-Project Silo & CMEK Setup\`](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md) • [\`3.4 VPC-SC & Security Sign-Off\`](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md) | \`Silo Tests 1–3\` (\`401\` mTLS, \`403\` PAB, \`403\` VPC-SC) |
| **Slides 7–9** (Air-Gapped GKE Gemma 3 27B vs. Vertex AI PT & \`< 5 s\` CMEK Kill-Switch) | Reserved GSUs (\`gemini-2.5-pro-dedicated\`) vs. Private GKE GPU \`vLLM\` (\`gemma-3-27b-it-vllm\`); \`< 5 s\` Valkey \`UNLINK\` CMEK revocation (\`HTTP 423 Locked\`) | [\`run_silo_security_tests.py\`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py) • [\`hop3_compute_finops_bulkhead.py\`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | \`python3 workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py\` (\`6/6 PASS\`) |
| **Slides 10–12** (Terraform 3.6 Silo Factory, 90-Min Codelab & Live Cloud Proof) | KMS-first Terraform dependency DAG, 1-click deployment script, BigQuery \`pattern_b_sovereign_silo_ledger\`, and 10-SaaS AWS AgentCore MCP matrix | [\`3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) • [\`deploy_1click.sh\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh) • [\`codelab-90min-regulated-airgapped.md\`](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/codelab-90min-regulated-airgapped.md) | \`bash workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh --validate-only\` |

- Run the **1-Click Terraform Deployment Scripts & Inspect Live Cloud Console Receipts**:
  - [Pattern B (WS3.6 Sovereign Silo & Gemma 3 GKE) 1-Click Terraform Script (\`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh\`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/deploy_1click.sh) • [\`main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) • [\`variables.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/variables.tf) • [\`terraform.tfvars.example\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/terraform.tfvars.example)
  - [Master All-Pattern 1-Click Terraform Orchestrator (\`scripts/deploy_terraform_1click.sh\`)](../scripts/deploy_terraform_1click.sh)
  - [8-Stage Google Cloud Console & Cloud Shell End-to-End Runbook (\`docs/GOOGLE-CLOUD-CONSOLE-END-TO-END-RUNBOOK.md\`)](../docs/GOOGLE-CLOUD-CONSOLE-END-TO-END-RUNBOOK.md)
  - [Live GCP Cloud Console Verification Receipt (\`docs/cloud_console_verification_receipt.json\`)](../docs/cloud_console_verification_receipt.json) • [Live 10-SaaS × 3-Pattern AWS AgentCore S3 Receipt (\`docs/third_party_5_saas_verification_receipt.json\`)](../docs/third_party_5_saas_verification_receipt.json)
- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 3 engineering artifacts and regulated codelab:
  - [3.1 Pattern B Case Study & Sovereign Silo Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)
  - [3.2 Multi-Project Silo, VPC-SC & CMEK Setup Guide](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md)
  - [3.3 Pattern B Sovereign Silo Runtime Implementation (\`pattern_b_siloed_service.py\`)](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py)
  - [3.4 VPC Service Controls & CISO Security Sign-Off Checklist](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md)
  - [3.5 6-Point Sovereign Security Verification Suite (\`run_silo_security_tests.py\`)](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py)
  - [3.6 Parameterized Terraform Silo Blueprint (\`main.tf\`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf)
  - [3.8 90-Minute Codelab: Regulated Sovereign Silos & CMEK Kill-Switch](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/codelab-90min-regulated-airgapped.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (\`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides:
  - [Workstream 3 Editable Google Slides Deck (\`ws3-pattern-b-siloed-editable-slides.pptx\`)](../slides/ws3-pattern-b-siloed-editable-slides.pptx)`
  }
];

