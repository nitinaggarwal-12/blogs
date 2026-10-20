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
      tags: ['Gemini Enterprise Agent Platform', 'ADK 2.0', 'Multi-Tenancy', 'Pooled Architecture', 'Vertex AI Model Armor', 'AlloyDB RLS', 'ContextCacheConfig', 'FinOps', 'Zero Trust'],
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
        stepsIntro: `The numbered callouts in Figure 1 trace how competing tenants share a single runtime and database without cross-tenant data or tool bleed:`,
        steps: [
          { title: 'Request', body: 'FinVault Bank (Google OIDC) or RetailStream Corp (Microsoft Entra ID) sends an HTTPS prompt with an OIDC JWT and RFC 9449 DPoP proof to the shared SaaS endpoint.' },
          { title: 'Hop 1 & Hop 2 — Edge header strip, OBO+KMS signing, and catalog pruning', body: 'Google Cloud Armor strips any client-supplied `X-Tenant-ID` header; IAP + OBO Broker mints a KMS-signed context (`hop1_edge_identity_pep.py`), Discovery Engine PDP hides FinVault\'s private `Agent Alpha` (`HTTP 403`), and the ADK Callback Gate prunes unauthorized tools (`hop2_registry_pdp_callbacks.py`).' },
          { title: 'Hop 3 — Allocate gVisor sandbox and Valkey quota check', body: 'Vertex AI Agent Engine binds immutable `temp:tenant_id` inside the shared gVisor pool while Memorystore Valkey enforces `120 RPM` (Standard) vs `600 RPM` (Enterprise) bulkheads and clamps thinking budgets to `4,000` vs `8,000` tokens (`hop3_compute_finops_bulkhead.py`).' },
          { title: 'Hop 4 (Pre-inference) — Screen prompt with tenant\'s Model Armor template', body: '`Model Armor (shared)` screens the prompt against the tenant\'s FINRA or PCI template, blocking prompt/SQL injection (`HTTP 400`) and semantic Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`) (`hop4_model_armor_guardrails.py`).' },
          { title: 'Hop 3 — 90% cached prefix inference and namespaced memory lookup', body: '`Gemini 2.5 Pro` attaches the read-only `32k` `ContextCacheConfig` prefix (90% input token savings) while reading and writing episodic state strictly under `finvault:{user}:{session}` or `retailstream:{user}:{session}` in the `5-Level Memory Bank (ONE bank)`.' },
          { title: 'Hop 5 — Transactional AlloyDB RLS query and 3LO MCP tool call', body: '`AlloyDB (ONE schema) + BigQuery (ONE dataset)` executes `SET LOCAL app.current_tenant_id` under `FORCE ROW LEVEL SECURITY` (returning only the caller\'s 2 rows and 0 cross-tenant rows) while `MCP Hub (shared)` verifies per-tenant 3LO consent (`hop5_data_rls_and_otel.py`).' },
          { title: 'Hop 4 & Hop 5 — SDP-redacted response and per-turn OTel span', body: '`Cloud SDP Egress` masks IBAN/SWIFT/PAN tokens before returning the response and streaming a zero-PII `tenant_telemetry_spans` chargeback record to the `BigQuery OTel Sink` (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).' }
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
        stepsIntro: `The seven numbered steps in Figure 2 trace the deterministic rejection of adversarial payloads:`,
        steps: [
          { title: 'Adversarial request submission', body: 'An attacker or misconfigured client submits a spoofed header, cross-tenant agent URI, or prompt-injection payload.' },
          { title: 'Hop 1 — Header sanitization and DPoP verification', body: 'Forged headers are stripped and recorded in `stripped_headers`; mismatched DPoP proofs are rejected (`401`).' },
          { title: 'Hop 2 — Catalog ACL and callback pruning', body: 'Unauthorized agent invocations return `403 Forbidden`, and unauthorized MCP tools are removed from the agent\'s tool list.' },
          { title: 'Hop 4 (Pre-inference) — Prompt injection and PII block', body: 'Model Armor rejects SQL/prompt injection (`SELECT * FROM incidents WHERE tenant_id = \'finvault\'`) with `HTTP 400`.' },
          { title: 'Hop 3 — Token clamp, RPM bulkhead, and cache key check', body: 'Excessive `thinking_budget` requests are clamped to tier limits, RPM spikes return `HTTP 429`, and cache keys are restricted to the immutable shared prefix.' },
          { title: 'Hop 4 (Post-inference) — 3LO DPoP check and NLC policy gate', body: 'Cross-tenant MCP token replay is blocked (`401`), and regulatory suppression attempts fail semantic NLC inspection (`422`).' },
          { title: 'Hop 5 — AlloyDB RLS enforcement and scrubbed audit log', body: 'AlloyDB returns only rows matching `app.current_tenant_id`, and Cloud Logging records the blocked attempt with zero raw PII.' }
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
        stepsIntro: `The seven numbered steps in Figure 3 trace multi-IdP authentication and 3LO tool execution:`,
        steps: [
          { title: 'Upstream IdP authentication', body: 'FinVault users sign in via Google OIDC; RetailStream users sign in via Microsoft Entra ID SAML/OIDC.' },
          { title: 'Workforce Identity Federation and RFC 8693 exchange', body: 'IAP and Workforce Identity Federation validate the upstream token and issue a tenant-bound `CryptographicContext`.' },
          { title: 'Tenant profile and MCP entitlement lookup', body: 'Firestore resolves the tenant\'s allowed MCP connectors (`jira-enterprise-3lo` vs `servicenow-itom-3lo`).' },
          { title: 'Pre-tool DLP and DPoP sender verification', body: 'The ADK `before_tool_callback` verifies that the caller\'s `dpop_jkt` matches the bound session token and scrubs PII from tool arguments.' },
          { title: '2LO implicit passthrough vs 3LO user-delegated token fetch', body: 'First-party Cymbal telemetry uses 2LO session passthrough; third-party SaaS tools request a user-delegated 3LO token from Auth Manager.' },
          { title: 'Inline 3LO OAuth consent elicitation (when required)', body: 'If a RetailStream user has not yet authorized SharePoint or ServiceNow, the runtime returns a structured 3LO consent challenge and resumes the turn upon grant.' },
          { title: 'Scoped MCP execution and audit emission', body: 'The MCP server executes under the user\'s delegated 3LO token and logs the tool invocation to BigQuery.' }
        ]
      },
      {
        num: 4,
        heading: '### 1-click Terraform starter resource dependency graph (Figure 4)',
        title: 'Pattern A: Terraform infrastructure-as-code (IaC) resource graph',
        diagId: 'ws2-terraform-starter-resource-graph',
        captionDetail: 'Declarative Terraform resource dependency graph (`workstream-2-pattern-a-pooled/2.6-terraform-starter/`) provisioning the complete Pattern A pooled stack in a single Google Cloud project.',
        zonesIntro: `Figure 4 shows the declarative Terraform module topology ([\`2.6-terraform-starter/main.tf\`](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf)):`,
        zones: [
          { name: 'Edge Networking and WAF Module', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Provisions `google_compute_global_forwarding_rule`, `google_compute_security_policy` (Cloud Armor header-strip rules), and `google_iap_web_backend_service`.' },
          { name: 'IAM, KMS, and Observability Module', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Provisions `google_kms_key_ring`, `google_kms_crypto_key`, least-privilege service accounts, and the `google_bigquery_table` FinOps ledger.' },
          { name: 'Agent Runtime, Model Armor, and Valkey Module', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Provisions Vertex AI Agent Engine runtime endpoints, `google_model_armor_template`, and `google_memorystore_instance` (Valkey token buckets).' },
          { name: 'AlloyDB RLS and Firestore Seed Module', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions `google_alloydb_cluster`, initializes `FORCE ROW LEVEL SECURITY` policies, and seeds tenant profiles in `google_firestore_document`.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 4 follow the Terraform dependency DAG from project initialization to live verification:`,
        steps: [
          { title: 'Enable Google Cloud APIs', body: '`google_project_service` enables Vertex AI, Discovery Engine, Model Armor, DLP, AlloyDB, Memorystore, and Cloud KMS APIs.' },
          { title: 'Provision VPC, Cloud Armor, and IAP edge', body: 'Creates the shared VPC network and attaches Cloud Armor header-sanitization rules (`Hop 1`).' },
          { title: 'Provision Cloud KMS keys and Discovery Engine catalog', body: 'Creates tenant CMEK keys (`finvault-cmek`) and seeds the Agent Catalog ACLs (`Hop 2`).' },
          { title: 'Deploy Model Armor templates and DLP inspect templates', body: 'Configures inline prompt-injection and PII redaction templates (`Hop 4`).' },
          { title: 'Deploy Vertex AI Agent Engine runtime and Memorystore for Valkey', body: 'Provisions the pooled ADK runtime and Redis token-bucket rate limiters (`Hop 3`).' },
          { title: 'Provision AlloyDB cluster and apply RLS migrations', body: 'Creates the PostgreSQL tables with `ENABLE` and `FORCE ROW LEVEL SECURITY` (`Hop 5`).' },
          { title: 'Provision BigQuery FinOps sink and run smoke tests', body: 'Connects the OpenTelemetry log sink to BigQuery and runs the 10-point breach verification suite.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern A is designed for high-density B2B SaaS environments where unit economics and rapid self-service onboarding are primary business drivers ([2.1 Case Study & Solution Architecture](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)):

- **High-volume commercial and Standard SaaS tiers (self-service to mid-market ARR):** Serve thousands of Standard-tier organizations (such as **RetailStream Corp**) from a single Google Cloud project without incurring per-tenant project, VPC, or database cluster overhead.
- **Enterprise tenants with private custom agents inside a shared platform:** Allow Enterprise customers (such as **FinVault Bank**) to register private custom agents (\`Agent Alpha\` on **Gemini 2.5 Pro Dedicated Provisioned Throughput**) and CMEK-encrypted session memory inside the shared control plane while guaranteeing that competing tenants receive \`HTTP 403 Forbidden\` on any enumeration or invocation attempt.
- **Multi-IdP SaaS platforms serving Google and Microsoft customers:** Support customers authenticating via **Google Workspace OIDC** alongside customers using **Microsoft Entra ID** with mid-session 3LO OAuth consent to SharePoint, ServiceNow, Jira, and Google Drive.`,
    alternativesMd: `## Design alternatives

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

- **Enforce per-tenant rate and token bulkheads:** Use atomic Lua token buckets in **Memorystore for Valkey** keyed by \`ratelimit:{tenant_id}:rpm\` and clamp \`thinking_budget\` in \`before_model_callback\` so a single noisy tenant cannot exhaust regional Vertex AI TPM quotas.

### Cost optimization

- **Separate cached system instructions from dynamic tenant context:** Keep your shared system instructions, tool schemas, and diagnostic runbooks (\`>= 4,096\` tokens up to \`32,000\` tokens) identical across tenants inside \`ContextCacheConfig\`, and inject per-tenant skills (\`gs://cymbal-skills-{tenant}/\`) and conversation history in the uncached suffix.
- **Prevent cold-start cache miss storms on TTL refresh:** Configure a background Cloud Scheduler keep-alive job that refreshes the \`cymbal-shared-incident-system-prompt-v2\` \`ContextCacheConfig\` descriptor 5 minutes before its 60-minute TTL expires, ensuring zero cold-cache latency spikes or uncached billing surges during peak traffic.

### Operational excellence

- **Deploy with declarative Terraform:** Use the [2.6 Terraform Starter](../workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf) to provision the entire pooled stack reproducibly and run the [90-Minute Breach Simulation Codelab](../workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/codelab-90min-breach-sim.md) to train platform engineers.
- **End-to-end Pattern A (Pooled 5-Hop) verification across 10 third-party SaaS products (\`10/10 Flows • 20/20 Test Cases PASS\`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is tested end-to-end under **Pattern A** (\`120 RPM Pool\`, \`4,096\` token clamp, shared \`90% ContextCacheConfig\`, shared BigQuery/AlloyDB \`FORCE ROW LEVEL SECURITY\`). See the complete copy-pasteable manual setup, configuration JSON, \`curl\` probes, and Input/Output payloads in [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern A Pooled Runtime & Connector Config | Positive E2E Input & Verified Output (\`TC-A-POS\`) | Red-Team Breach Input & Verified Block (\`TC-A-NEG\`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **\`SAAS-01\` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` • Shared Pool + Spotter \`runtime_filter.tenant_id\` -> BigQuery RLS | **In:** \`tenant="finvault"\`, \`org="finvault-org-01"\` • **Out:** \`HTTP 200\` • \`row_count=2\` (\`FV-TX-901..902\`), \`cache_discount=0.90\` | **In:** \`tenant="retailstream"\` spoofing \`org="finvault-org-01"\` • **Out:** **\`HTTP 403\`** \`CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-a --verbose\` |
| **\`SAAS-02\` Sigma Computing** (*Workbooks & Dataset API v2*) | \`mcp://cymbal/sigma-computing-workbooks-3lo\` • Shared Pool + \`ua_tenant_id\` warehouse RLS pushdown | **In:** \`tenant="retailstream"\`, \`workbook="wb-cymbal-finops-3lo"\` • **Out:** \`HTTP 200\` • \`row_count=2\` (\`RS-ORD-101..102\`), live Sigma \`requestId\` | **In:** \`tenant="retailstream"\`, \`cmek="medcore-revoked-cmek"\` • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-a --verbose\` |
| **\`SAAS-03\` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | \`mcp://retailstream/servicenow-itom-3lo\` • Shared Pool + Hop 5 3LO Vault (\`3lo_token_sn_rs_valid\`) | **In:** \`tenant="retailstream"\`, \`change="CHG0049218"\`, \`3lo=True\` • **Out:** \`HTTP 200\` • Live AWS AgentCore \`CHG0049218\` returned | **In:** \`tenant="retailstream"\`, \`seed_3lo=False\` (unconsented) • **Out:** **\`HTTP 401\`** \`CHALLENGE_3LO_OAUTH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-a --verbose\` |
| **\`SAAS-04\` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | \`mcp://finvault/veeva-muse-clinical-3lo\` • Shared Pool + Hop 2 Catalog ACL + FDA 21 CFR Part 11 HMAC | **In:** \`tenant="finvault"\`, \`study="MK-3475-087"\`, \`cohort="Cohort-B"\` • **Out:** \`HTTP 200\` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** \`tenant="retailstream"\` invoking restricted clinical MCP • **Out:** **\`HTTP 403\`** \`TENANT_CONNECTOR_ACL_DENIED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva-muse --pattern pattern-a --verbose\` |
| **\`SAAS-05\` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | \`mcp://finvault/salesforce-jira-escalation-3lo\` • Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask | **In:** \`tenant="finvault"\`, \`instance="NA224"\`, raw IBAN/SWIFT in notes • **Out:** \`HTTP 200\` • Live \`NA224\` (\`Winter '27 Patch 8.6\`) + \`[REDACTED_IBAN_CODE]\` | **In:** Inspect egress payload for unredacted \`DE893704...\` • **Out:** **\`PASS\`** (\`raw_pii_leaked=False\`, 100% masked before SaaS call) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce-jira --pattern pattern-a --verbose\` |
| **\`SAAS-06\` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` • Shared Pool + \`cymbal_uc_prod.<tenant>_gold\` binding | **In:** \`tenant="finvault"\`, \`schema="finvault_gold"\` • **Out:** \`HTTP 200\` • \`Server: databricks\`, \`row_count=2\` FinVault rows | **In:** \`tenant="retailstream"\`, \`schema="finvault_gold"\` + \`EXECUTE IMMEDIATE\` • **Out:** **\`HTTP 403\`** \`UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-a --verbose\` |
| **\`SAAS-07\` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` • Shared Pool + \`ROLE_CYMBAL_<TENANT>\` & \`SECONDARY ROLES NONE\` | **In:** \`tenant="retailstream"\`, \`role="ROLE_CYMBAL_RETAILSTREAM"\` • **Out:** \`HTTP 200\` • \`Server: SF-LB-T1\`, \`row_count=2\` RetailStream rows | **In:** \`sql_override="USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT"\` • **Out:** **\`HTTP 403\`** \`SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-a --verbose\` |
| **\`SAAS-08\` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | \`mcp://finvault/workday-hcm-financials-raas-3lo\` • Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP | **In:** \`tenant="finvault"\`, \`user="alice@finvault.com"\`, \`org="SUP-ORG-FINVAULT-NA"\` • **Out:** \`HTTP 200\` • Live Workday CCX probe + \`[REDACTED_US_SSN]\` | **In:** \`user="bob@finvault.com"\` reusing Alice's 3LO token • **Out:** **\`HTTP 401\`** \`WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH\` (\`MCP -32042\`) | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-a --verbose\` |
| **\`SAAS-09\` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | \`mcp://cymbal/datadog-observability-sre-3lo\` • Shared Pool + \`@tenant_id\` log filter + Hop 4 Model Armor | **In:** \`tenant="finvault"\`, \`query="service:agent-gateway @tenant_id:finvault"\` • **Out:** \`HTTP 200\` • Live Datadog US1 API + \`2\` sanitized log spans | **In:** Log payload containing \`IGNORE ALL PREVIOUS INSTRUCTIONS...\` • **Out:** **\`HTTP 400\`** \`MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-a --verbose\` |
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Shared Pool + Hop 1 RFC 9449 DPoP \`jkt\` binding | **In:** \`tenant="finvault"\`, \`dpop="dpop_jkt_fv_001"\`, \`proof="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + Okta OIDC \`200\` | **In:** Stolen bearer token replay with \`proof="dpop_jkt_attacker_stolen_999"\` • **Out:** **\`HTTP 401\`** \`OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike-okta --pattern pattern-a --verbose\` |

### Performance optimization

- **Connection pooling with transaction-local context:** Use PgBouncer in transaction-pooling mode in front of AlloyDB and always issue \`SET LOCAL app.current_tenant_id\` inside the transaction block so session state never persists after \`COMMIT\`.`,
    whatsNextMd: `## What's next

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
      tags: ['Sovereign Cloud', 'VPC Service Controls', 'Principal Access Boundary', 'Cloud KMS CMEK', 'Gemma 3', 'GKE', 'Vertex AI Agent Engine', 'ADK 2.0', 'Zero Trust', 'Multi-Tenancy'],
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
        stepsIntro: `The numbered callouts in Figure 1 trace a sovereign agent turn and verify physical and cryptographic isolation:`,
        steps: [
          { title: 'Mutual TLS (mTLS) and OIDC request', body: 'The tenant client connects with a pinned mTLS SPIFFE client certificate and an upstream OIDC JWT.' },
          { title: 'Sovereign pre-check 1 & 2 — mTLS SPIFFE and IAM PAB verification', body: '`PatternBSiloedService` verifies that the client certificate (`HTTP 401` on SPIFFE mismatch) and IAM principal (`HTTP 403` on PAB violation) are bound exclusively to the target silo project (`cymbal-finvault-silo-prod`).' },
          { title: 'Hop 2 — Silo-local Agent Catalog and tool pruning', body: 'The silo\'s dedicated Discovery Engine catalog exposes only the tenant\'s approved agents and local MCP connectors.' },
          { title: 'Sovereign pre-check 3 & Hop 4 — VPC-SC perimeter and Model Armor scan', body: 'VPC Service Controls blocks any egress attempt to external projects (`VPC_SC_PERIMETER_VIOLATION_403`), while Model Armor and Cloud DLP inspect the prompt inline.' },
          { title: 'Hop 3 — Live Cloud KMS CMEK check and air-gapped Gemma 3 / Vertex AI inference', body: 'The runtime verifies that `agent-memory-cmek` is `ENABLED` (halting immediately with `HTTP 423 Locked` if disabled) and executes inference on air-gapped Gemma 3 (27B) on private GKE or dedicated Vertex AI endpoints.' },
          { title: 'Hop 4 (Post-inference) — Output DLP and silo-local 3LO MCP execution', body: 'Tool calls execute against silo-local MCP servers using DPoP-bound 3LO tokens and pass post-inference semantic NLC compliance checks.' },
          { title: 'Hop 5 — Dedicated CMEK AlloyDB persistence and silo BigQuery audit', body: 'State is written to the silo\'s dedicated CMEK-encrypted AlloyDB cluster (`SET LOCAL app.current_tenant_id`) and BigQuery audit dataset.' }
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
        stepsIntro: `The seven numbered steps in Figure 2 trace the provisioning and cryptographic revocation workflow:`,
        steps: [
          { title: 'Create isolated tenant GCP project', body: 'Provision `cymbal-{tenant}-silo-prod` under a dedicated Organization folder with billing and quota isolation.' },
          { title: 'Attach IAM Principal Access Boundary (PAB)', body: 'Bind `{tenant}-sovereign-pab` so tenant credentials can never authenticate to resources outside the silo project.' },
          { title: 'Provision Cloud KMS / Cloud EKM key ring', body: 'Create `agent-memory-cmek` and grant the Vertex AI, AlloyDB, and Storage service agents `roles/cloudkms.cryptoKeyEncrypterDecrypter`.' },
          { title: 'Enforce VPC Service Controls perimeter', body: 'Lock restricted Google Cloud APIs inside `perimeter_{tenant}_sovereign` and block unauthorized egress.' },
          { title: 'Deploy private GKE Gemma 3 (27B) and Agent Engine runtime', body: 'Launch vLLM serving Gemma 3 on private A100/H100 GKE nodes with Private Google Access and zero internet egress.' },
          { title: 'Verify 5-Hop turn execution inside the silo', body: 'Execute end-to-end agent turns using the unchanged `core-cymbal-agent/` governance modules.' },
          { title: 'Trigger CMEK kill-switch (`HTTP 423 Locked`)', body: 'Disable the KMS cryptoKeyVersion and confirm that all runtime, memory, and database operations halt immediately with `423 Locked`.' }
        ]
      },
      {
        num: 3,
        heading: '### Parameterized Terraform silo blueprint resource graph (Figure 3)',
        title: 'Pattern B: Parameterized Terraform sovereign silo module resource graph',
        diagId: 'ws3-terraform-silo-blueprint-resource-graph',
        captionDetail: 'Declarative Terraform resource dependency graph (`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/`) for stamping out repeatable sovereign tenant silos.',
        zonesIntro: `Figure 3 maps the Terraform resources in [\`3.6-terraform-silo-blueprint/main.tf\`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf):`,
        zones: [
          { name: 'Project Factory and mTLS Ingress Resources', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Provisions `google_project`, private VPC subnets, and mTLS load balancer certificates.' },
          { name: 'VPC-SC Perimeter, IAM PAB, and KMS Resources', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Provisions `google_access_context_manager_service_perimeter`, `google_iam_principal_access_boundary_policy`, and `google_kms_crypto_key`.' },
          { name: 'Private GKE Gemma 3 and Vertex AI Runtime Resources', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Provisions `google_container_cluster` (private GPU pool), Artifact Registry weights mirror, and Vertex AI Agent Engine runtime.' },
          { name: 'CMEK AlloyDB, Memorystore, and BigQuery Resources', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Provisions `google_alloydb_cluster` and `google_bigquery_dataset` encrypted with `encryption_config { kms_key_name = ... }`.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 3 trace the automated Terraform stamp-out pipeline:`,
        steps: [
          { title: 'Input `tenant_id` and compliance variables', body: 'Pass `tenant_id = "finvault"`, `region = "us-central1"`, and `enable_airgapped_gemma3 = true` to the Terraform module.' },
          { title: 'Create project and attach IAM PAB policy', body: 'Terraform provisions the isolated project and binds the organization PAB policy.' },
          { title: 'Create Cloud KMS CMEK key and IAM grants', body: 'Provisions the customer-managed encryption key before any stateful service is created.' },
          { title: 'Configure Access Context Manager VPC-SC perimeter', body: 'Places the project inside a dedicated service perimeter with restricted Google APIs.' },
          { title: 'Provision private GKE GPU cluster and Agent Engine', body: 'Deploys the air-gapped Gemma 3 inference pool and ADK runtime.' },
          { title: 'Provision CMEK-encrypted AlloyDB and Memory Bank', body: 'Creates the relational and vector stores bound to the tenant\'s KMS key.' },
          { title: 'Run 6-test sovereign verification suite', body: 'Executes `run_silo_security_tests.py` to certify perimeter, PAB, and CMEK kill-switch enforcement before sign-off.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

Pattern B is designed for regulated enterprise customers whose legal, compliance, or risk teams prohibit shared multi-tenant infrastructure ([3.1 Case Study & Solution Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)):

- **Regulated banking and capital markets (OCC/FDIC, EU DORA, PCI DSS Level 1):** Financial institutions such as **FinVault Bank** (\`cymbal-finvault-silo-prod\`) that require dedicated compute quotas, zero physical blast radius, and a customer-held Cloud KMS / Cloud EKM encryption kill-switch over all agent memory and audit logs.
- **Sovereign healthcare, retail, and life sciences (HIPAA, GxP):** Regulated healthcare and enterprise tenants (such as **MedCore Health** and **RetailStream Corp's** sovereign division in \`cymbal-retailstream-silo-prod\`) processing Protected Health Information (PHI) or regulated payment telemetry that mandate dedicated VPC Service Controls perimeters and dedicated CMEK-encrypted AlloyDB clusters.
- **Air-gapped defense, intelligence, and core ledger environments:** Workloads that prohibit sending prompts to shared multi-tenant model endpoints and require self-hosted open-weight models (**Gemma 3 27B IT**) running on private GKE GPU nodes with zero internet egress.`,
    alternativesMd: `## Design alternatives

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
- **Wire Cloud KMS CMEK as a unified kill-switch with instant in-memory cache eviction:** Encrypt the Vertex AI Memory Bank, AlloyDB cluster, GKE persistent disks, and BigQuery datasets with the same tenant KMS key. Because long-lived worker pods could otherwise hold decrypted L1–L4 session state in RAM after a KMS key is disabled (\`GAP-P1-04\`), **Hop 3** performs a live sub-second Cloud KMS key-state probe before every turn and, upon detecting \`DISABLED\` or \`DESTROY_SCHEDULED\`, immediately executes \`UNLINK {tenant_id}:*\` on Memorystore for Valkey, recycles the gVisor worker sandbox within \`< 5 seconds\`, and returns \`HTTP 423 Locked\`.

### Reliability

- **Dedicated Provisioned Throughput (PT) or dedicated GPU nodes:** Because each silo has its own Google Cloud project, API quotas and model throughput are physically isolated—eliminating cross-tenant noisy-neighbor risk.

### Cost optimization

- **Understand the baseline cost floor (\`600 RPM Silo/month\` per dedicated tenant project):** Dedicated AlloyDB instances, Memorystore clusters, and private GKE GPU nodes carry a non-trivial idle cost floor. Reserve full Pattern B silos for Enterprise contracts that price in dedicated infrastructure, or use [Pattern C (Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md) to share a control plane while isolating only Enterprise data/runtime spokes.

### Operational excellence

- **Automate silo stamp-out with Terraform:** Never configure VPC-SC perimeters or CMEK bindings manually in the console. Use the parameterized [3.6 Terraform Silo Blueprint](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) so every tenant silo is identical and auditable.
- **End-to-end Pattern B (Sovereign Silos) verification across 10 third-party SaaS products (\`10/10 Flows • 20/20 Test Cases PASS\`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [\`enterprise_5_saas_bi_mcp.py\`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is verified inside **Pattern B's Sovereign Silo Shell** (\`cymbal-finvault-silo-prod\`, \`mTLS SPIFFE spiffe://cymbal.internal/ns/silo-finvault/sa/agent-runner\`, \`IAM PAB pab-silo-finvault\`, \`VPC-SC perimeter_cymbal_finvault_silo\`, \`600 RPM Silo\`, \`8,192\` token budget, and \`Cloud KMS CMEK Kill-Switch HTTP 423 Locked\` with \`< 5s\` Valkey purge). See complete setup, configuration JSON, \`curl\` probes, and Input/Output test payloads in [\`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md\`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern B Sovereign Silo Shell & VPC-SC/CMEK Config | Positive E2E Input & Verified Output (\`TC-B-POS\`) | Sovereign Silo Breach / CMEK Input & Verified Block (\`TC-B-NEG\`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **\`SAAS-01\` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | \`mcp://cymbal/thoughtspot-spotter-bi-3lo\` • Silo \`cymbal-finvault-silo-prod\` + VPC-SC egress rule | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`spiffe=True\`, \`org="finvault-org-01"\` • **Out:** \`HTTP 200\` • \`Server: ThoughtSpot\`, \`row_count=2\` FinVault rows | **In:** Silo KMS CMEK key revoked (\`projects/cymbal-medcore-silo-prod/.../medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` + \`valkey_purged=True\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-b --verbose\` |
| **\`SAAS-02\` Sigma Computing** (*Workbooks & Dataset API v2*) | \`mcp://cymbal/sigma-computing-workbooks-3lo\` • Silo CMEK + \`ua_tenant_id=finvault\` BigQuery pushdown | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`cmek="finvault-active-cmek"\` • **Out:** \`HTTP 200\` • Live Sigma \`requestId\` + \`2\` FinVault rows | **In:** Customer revokes Cloud KMS CMEK key mid-session (\`medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-b --verbose\` |
| **\`SAAS-03\` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | \`mcp://retailstream/servicenow-itom-3lo\` • Silo VPC-SC egress -> AWS Bedrock AgentCore MCP | **In:** \`silo="cymbal-retailstream-silo-prod"\`, \`change="CHG0049218"\`, \`3lo=True\` • **Out:** \`HTTP 200\` • Live AWS AgentCore \`CHG0049218\` returned | **In:** Revoke Silo KMS CMEK key or omit 3LO grant • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 401 CHALLENGE_3LO_OAUTH\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-b --verbose\` |
| **\`SAAS-04\` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | \`mcp://finvault/veeva-muse-clinical-3lo\` • Regulated GxP Silo + FDA 21 CFR Part 11 HMAC-SHA256 | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`study="MK-3475-087"\`, \`doc="VV-DOC-004819"\` • **Out:** \`HTTP 200\` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** Cross-silo principal or revoked Silo CMEK key • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva-muse --pattern pattern-b --verbose\` |
| **\`SAAS-05\` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | \`mcp://finvault/salesforce-jira-escalation-3lo\` • Silo VPC-SC egress + Hop 4 Egress Cloud SDP | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`instance="NA224"\`, raw IBAN/SWIFT • **Out:** \`HTTP 200\` • Live \`NA224\` (\`Winter '27 Patch 8.6\`) + \`[REDACTED_IBAN_CODE]\` | **In:** Silo KMS CMEK revocation + egress PII inspection • **Out:** **\`HTTP 423 Locked\`** & \`raw_pii_leaked=False\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce-jira --pattern pattern-b --verbose\` |
| **\`SAAS-06\` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | \`mcp://cymbal/databricks-unity-catalog-genie-3lo\` • Silo VPC-SC -> \`cymbal_uc_prod.finvault_gold\` | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`schema="finvault_gold"\` • **Out:** \`HTTP 200\` • \`Server: databricks\`, \`row_count=2\` FinVault rows | **In:** Revoke Silo KMS CMEK key before Unity Catalog federation • **Out:** **\`HTTP 423 Locked\`** \`KMS_CMEK_KEY_REVOKED_KILL_SWITCH\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-b --verbose\` |
| **\`SAAS-07\` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | \`mcp://cymbal/snowflake-cortex-analyst-sql-3lo\` • Silo VPC-SC -> Snowflake \`SF-LB-T1\` (\`SECONDARY_ROLES=NONE\`) | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`role="ROLE_CYMBAL_FINVAULT"\` • **Out:** \`HTTP 200\` • \`Server: SF-LB-T1\`, \`row_count=2\` FinVault rows | **In:** Revoke Silo KMS CMEK key or attempt \`USE SECONDARY ROLES ALL\` • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 403\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-b --verbose\` |
| **\`SAAS-08\` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | \`mcp://finvault/workday-hcm-financials-raas-3lo\` • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN SDP | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`user="alice@finvault.com"\` • **Out:** \`HTTP 200\` • Live Workday CCX probe + \`[REDACTED_US_SSN]\` | **In:** Revoke Silo KMS CMEK key or cross-principal 3LO token reuse • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 401\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-b --verbose\` |
| **\`SAAS-09\` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | \`mcp://cymbal/datadog-observability-sre-3lo\` • Silo Log Index \`@tenant_id:finvault\` + Hop 4 Model Armor | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`query="@tenant_id:finvault"\` • **Out:** \`HTTP 200\` • Live Datadog US1 API + \`2\` sanitized log spans | **In:** Revoked Silo CMEK (\`423\`) or poisoned log stack trace (\`400\`) • **Out:** **\`HTTP 423 Locked\`** / **\`HTTP 400\`** | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-b --verbose\` |
| **\`SAAS-10\` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | \`mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo\` • Silo mTLS SPIFFE + Okta DPoP + Silo CMEK Kill-Switch | **In:** \`silo="cymbal-finvault-silo-prod"\`, \`dpop="dpop_jkt_fv_001"\` • **Out:** \`HTTP 200\` • Live Falcon \`trace_id\` + Okta OIDC \`200\` | **In:** Revoke Silo KMS CMEK key (\`medcore-revoked-cmek\`) • **Out:** **\`HTTP 423 Locked\`** + Valkey session cache purged in \`< 5s\` | \`python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike-okta --pattern pattern-b --verbose\` |

### Performance optimization

- **Localize vLLM model weights in Artifact Registry:** Store Gemma 3 container images and model weights in a regional Artifact Registry repository inside the silo perimeter so GKE GPU nodes pull weights over Private Google Access at line rate.`,
    whatsNextMd: `## What's next

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
