#!/usr/bin/env node
/**
 * Rebuilds all 5 canonical workstream blogs (blogs/ws1..ws5-*.md) using the
 * official Google Cloud Architecture Center format, layout, and section structure:
 * https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system?hl=en
 *
 * Sections enforced across all 5 documents:
 *   - Lead Overview & Target Audience ("This document describes an architecture...")
 *   - ## Architecture (Embeds existing diagrams + 4-Zone Hub-and-Spoke breakdown + Numbered 1-7 Callout Flow)
 *   - ## Products used (Categorized Google Cloud products with official doc links)
 *   - ## Use cases (Concrete multi-tenant B2B SaaS & enterprise scenarios)
 *   - ## Design alternatives (Comparison matrices, 5-Hop Context Chain & EAP compensating controls)
 *   - ## Design considerations (Google Cloud Well-Architected Framework pillars:
 *       ### Security, privacy, and compliance
 *       ### Reliability
 *       ### Cost optimization
 *       ### Operational excellence
 *       ### Performance optimization)
 *   - ## What's next (Actionable links to companion guides, codelabs, Terraform & editable slides)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BLOGS_DIR = path.join(ROOT, 'blogs');

function renderFigureBlock(figNum, title, diagId, pptxFile, captionDetail) {
  return [
    `![Figure ${figNum} — ${title}](../diagrams/${diagId}.drawio.png)`,
    ``,
    `*Figure ${figNum}. ${captionDetail} Editable assets: [Draw.io source](../diagrams/${diagId}.drawio) | [Google Slides (.pptx)](../slides/${pptxFile}) | [Architecture Center SVG](../diagrams/${diagId}.svg) | [Vision AST](../diagrams/vision_metadata/${diagId}.vision.json).*`
  ].join('\n');
}

function renderZoneList(zones) {
  return zones.map(z => `- **${z.name} (${z.colorLabel}):** ${z.desc}`).join('\n');
}

function renderCalloutSteps(steps) {
  return steps.map((s, idx) => `${idx + 1}. **${s.title}:** ${s.body}`).join('\n');
}

const COMMON_PRODUCTS_MD = `## Products used

This architecture uses the following Google Cloud products and open-source frameworks:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor sandboxes with managed session and memory state.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): An open-source framework for building and orchestrating multi-agent hierarchies with deterministic lifecycle callbacks (\`before_agent_callback\`, \`before_tool_callback\`, \`before_model_callback\`).
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Google's flagship multimodal reasoning model supporting shared prompt prefix caching (\`ContextCacheConfig\`) and configurable \`thinking_budget\` controls.
- [Vertex AI Model Garden](https://cloud.google.com/model-garden): An enterprise model repository providing governed access to partner models (such as Gemini 2.5 Pro (Dedicated PT) for tenant-private agents) and open-weight models (such as Gemma 3 27B).
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs): A managed Kubernetes service used in Sovereign Silo deployments (Pattern B) to run air-gapped open-weight models on private GPU node pools with zero public internet egress.

### Ingress, identity, and AI safety guardrails

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs): A global anycast External Application Load Balancer that terminates TLS 1.3 and mutual TLS (mTLS) connections at the Google network edge.
- [Google Cloud Armor](https://cloud.google.com/armor/docs): A web application firewall (WAF) and DDoS mitigation service that strips unverified client-supplied tenant headers (\`X-Tenant-ID\`) at ingress.
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation): Zero-trust authentication services that validate upstream OIDC and SAML JWTs and broker RFC 8693 On-Behalf-Of (OBO) token exchange bound to RFC 9449 DPoP sender-constrained proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview): An inline AI safety service that inspects prompts, model completions, and Model Context Protocol (MCP) tool payloads for prompt injection, jailbreaks, and policy violations.
- [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): A data inspection and de-identification service that masks regulated PII, PCI, and PHI tokens inline before prompts reach foundation models or logs.

### Data, storage, networking, and governance

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): A high-performance PostgreSQL-compatible database that enforces transactional \`FORCE ROW LEVEL SECURITY (RLS)\` policies keyed by \`app.current_tenant_id\`.
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Low-latency in-memory and document stores used for per-tenant token-bucket rate limiting, 5-level session memory caching, and dynamic tenant routing tables.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Private Service Connect](https://cloud.google.com/vpc/docs/private-service-connect): Network security boundaries that prevent cross-project data exfiltration and establish unidirectional NAT-based private peering between a central routing hub and isolated enterprise spokes.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs): A cryptographic key management service supporting customer-managed encryption keys (CMEK) and instant \`HTTP 423 Locked\` tenant kill-switches.
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Centralized posture monitoring, PII-redacted OpenTelemetry audit logging, and per-tenant token FinOps chargeback analytics.`;

const BLOG_SPECS = [
  {
    filename: 'ws1-reference-architecture-taxonomy-and-5hop-baseline.md',
    pptxFile: 'ws1-reference-architecture-editable-slides.pptx',
    frontmatter: {
      title: 'Multi-tenant agentic AI system: Reference architecture taxonomy and 5-Hop governance baseline',
      subtitle: 'Build and deploy Pooled (Pattern A), Sovereign Silo (Pattern B), and Dynamic Hybrid (Pattern C) multi-tenant agentic AI systems on Google Cloud using Vertex AI Agent Engine and ADK 2.0',
      series: 'Multi-Tenant Agentic AI on Google Cloud — Workstream 1 of 5',
      workstream: 'Workstream 1 — Prepare Reference Architectures & Update GCP Documentation',
      authors: 'Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team',
      target_audience: 'Cloud Architects, AI Platform Engineers, CISOs, and B2B SaaS Platform Leads',
      reading_time: '14 minutes',
      tags: ['gemini-enterprise-agent-platform', 'adk-2.0', 'multi-tenancy', 'reference-architecture', 'vpc-service-controls', 'principal-access-boundary', 'model-armor', 'alloydb-row-level-security', 'finops', 'cloud-architecture-center'],
      canonical_architecture: 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system',
      diagrams: ['ws1-multi-tenant-taxonomy-overview', 'ws1-cloud-arch-center-5hop-baseline'],
      editable_slides: 'slides/ws1-reference-architecture-editable-slides.pptx',
      status: 'PUBLISH_READY'
    },
    leadParagraphs: [
      `This document describes a reference architecture and three-pattern isolation taxonomy to build, govern, and operate a multi-tenant agentic AI system on Google Cloud. It extends the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) hub-and-spoke architecture—which models internal enterprise business units—to external B2B SaaS platforms and Independent Software Vendors (ISVs) serving competing corporate customers across shared, dedicated, and hybrid cloud tiers.`,
      `This document is intended for cloud architects, AI platform engineers, security architects, and FinOps leads who design multi-agent applications using [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview), [Agent Development Kit (ADK)](https://google.github.io/adk-docs/), and [Gemini Enterprise](https://cloud.google.com/gemini/docs/enterprise).`
    ],
    keyPointNote: `**Key point:** Isolation in a multi-tenant agentic AI platform is a per-tenant tier decision, not a single platform-wide compromise. By decoupling the **80% reusable 5-Hop Cryptographic Context Chain** ([\`core-cymbal-agent/\`](../core-cymbal-agent/)) from the underlying project perimeter, you can run high-density **Pooled tenants (Pattern A)**, regulated **Sovereign Silos (Pattern B)**, and **Dynamic Hybrid PSC Spokes (Pattern C)** from a single agent codebase.`,
    archIntro: `The following diagram shows the multi-tenant agentic AI reference architecture on Google Cloud, organized into a central routing and governance hub connected to pooled and sovereign tenant workspaces:`,
    figures: [
      {
        num: 1,
        heading: null,
        title: 'Multi-tenant agentic AI taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C)',
        diagId: 'ws1-multi-tenant-taxonomy-overview',
        captionDetail: 'Official Google Cloud Architecture Center hub-and-spoke topology showing the Routing Hub, Central Governance and Security Hub, Pooled Shared Runtime (Pattern A), and Sovereign Silo / Hybrid PSC Spokes (Patterns B and C).',
        zonesIntro: `The architecture in Figure 1 comprises four color-coded functional zones that enforce defense-in-depth isolation across every agent turn:`,
        zones: [
          { name: 'Routing Hub', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Terminates external client traffic at the External Application Load Balancer, strips unverified `X-Tenant-ID` headers in Google Cloud Armor, verifies upstream OIDC/SAML tokens in Identity-Aware Proxy (IAP), and performs RFC 8693 token exchange bound to RFC 9449 DPoP proofs (`Hop 1` in [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py)).' },
          { name: 'Central Governance and Security Hub', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Enforces catalog-level access control in the Discovery Engine Agent Catalog (`Hop 2` in [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py)), manages customer-managed encryption keys (CMEK) in Cloud KMS, monitors posture in Security Command Center, and exports PII-redacted OpenTelemetry FinOps spans to Cloud Logging and BigQuery (`Hop 5` in [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py)).' },
          { name: 'Pattern A Pooled Shared Runtime Spoke', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Hosts high-density Standard-tier tenants inside a shared Vertex AI Agent Engine gVisor sandbox (`Hop 3` in [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py)) with shared `ContextCacheConfig` prompt prefix caching (up to 90% input token savings), inline Model Armor + Cloud DLP guardrails (`Hop 4` in [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py)), and shared AlloyDB with `FORCE ROW LEVEL SECURITY (RLS)`.' },
          { name: 'Pattern B Sovereign Silo and Pattern C Hybrid PSC Spoke', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Isolates regulated Enterprise tenants inside dedicated Google Cloud projects protected by VPC Service Controls (`VPC-SC`), IAM Principal Access Boundaries (`PAB`), tenant-owned Cloud KMS CMEK keys (`HTTP 423` kill-switch), and optional air-gapped Gemma 3 (27B) on private GKE or Private Service Connect (`PSC`) producer attachments.' }
        ],
        stepsIntro: `The numbered callouts in Figure 1 trace the end-to-end request and governance flow across the hub-and-spoke topology:`,
        steps: [
          { title: 'Request', body: 'A tenant user or application submits an HTTPS prompt carrying an upstream OIDC JWT (Google Workspace for FinVault Bank; Microsoft Entra ID for RetailStream Corp) and an RFC 9449 DPoP proof.' },
          { title: 'Tenant identification and routing (Hop 1)', body: 'Google Cloud Armor strips any client-supplied `X-Tenant-ID` header. IAP and the Edge Identity PEP validate the JWT issuer and audience, exchange the credential via RFC 8693 for a tenant-scoped token, and select the target workspace (Pattern A pool, Pattern B silo, or Pattern C PSC spoke).' },
          { title: 'Task routing and catalog pruning (Hop 2)', body: 'The Discovery Engine Agent Catalog filters available agents, MCP connectors, and GCS Skills (`gs://cymbal-skills-{tenant}/`). The ADK `before_agent_callback` deterministically prunes unauthorized tools before reasoning starts, returning `HTTP 403 Forbidden` on cross-tenant agent calls.' },
          { title: 'Pre-inference guardrails and token bulkheads (Hops 3 & 4)', body: 'Memorystore for Valkey enforces the tenant RPM rate limit (`600 RPM` vs `120 RPM`) and clamps `thinking_budget` (`8,000` vs `4,000` tokens). Vertex AI Model Armor and Sensitive Data Protection (Cloud DLP) inspect the prompt and MCP arguments for prompt injection and sensitive PII.' },
          { title: 'Context retrieval and model inference (Hop 3)', body: 'The ADK Coordinator Agent loads tenant-scoped 5-level session memory (`{tenant}:{user}:{session}`) and row-locked AlloyDB records (`SET LOCAL app.current_tenant_id`), attaches the immutable shared `ContextCacheConfig` system prefix, and invokes Gemini 2.5 Pro, Gemini 2.5 Pro (Dedicated PT), or air-gapped Gemma 3.' },
          { title: 'Post-inference guardrails (Hop 4)', body: 'Model Armor and Cloud DLP inspect the model output and 2LO/3LO MCP tool responses, redacting sensitive identifiers (`[REDACTED_PII]`) and blocking Natural Language Policy Compliance (`NLC`) violations (`HTTP 422`).' },
          { title: 'Response and FinOps chargeback (Hop 5)', body: 'The sanitized completion is returned to the caller while OpenTelemetry emits a PII-scrubbed `TenantTelemetrySpan` to Cloud Logging and BigQuery (`finops_telemetry.tenant_token_ledger`) for per-tenant COGS attribution.' }
        ]
      },
      {
        num: 2,
        heading: '### End-to-end 5-Hop cryptographic governance baseline (Figure 2)',
        title: 'Cloud Architecture Center 5-Hop cryptographic context chain and Cymbal case study baseline',
        diagId: 'ws1-cloud-arch-center-5hop-baseline',
        captionDetail: 'Detailed 5-Hop Cryptographic Context Chain showing how Cymbal SaaS governs competing tenants (FinVault Bank and RetailStream Corp) across Edge Identity (Hop 1), Catalog PDP (Hop 2), Compute & FinOps Bulkheads (Hop 3), Model Armor & 3LO MCP Auth (Hop 4), and AlloyDB RLS & OTel Chargeback (Hop 5).',
        zonesIntro: `Figure 2 details the internal mechanics of the **5-Hop Cryptographic Context Chain** ([1.3 Doc Update PR](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)) across the four structural zones:`,
        zones: [
          { name: 'Edge Identity & Token Exchange PEP (Hop 1)', colorLabel: 'Zone 1 — Blue container `#aecbfa`', desc: 'Mints an immutable `CryptographicContext` bound to the caller\'s DPoP thumbprint (`jkt`) and verified OIDC issuer, eliminating HTTP header spoofing.' },
          { name: 'Catalog PDP, KMS & Audit Hub (Hops 2 & 5)', colorLabel: 'Zone 2 — Green container `#ceead6`', desc: 'Enforces tenant ACLs on Agent Resource Descriptors (`agent://finvault/private-agent-alpha-regulatory`), validates Cloud KMS CMEK status, and records cryptographic audit trails.' },
          { name: 'FinVault Bank Enterprise Workspace (Hops 3 & 4)', colorLabel: 'Zone 3 — Left amber container `#feefc3`', desc: 'Executes FinVault turns with an `8,000` thinking-token budget, private `Agent Alpha` on Gemini 2.5 Pro (Dedicated PT), CMEK-encrypted memory (`finvault:user:session`), and 3LO Google Workspace & Jira MCP tools.' },
          { name: 'RetailStream Corp Standard Workspace (Hops 3 & 4)', colorLabel: 'Zone 4 — Right coral container `#fad2cf`', desc: 'Executes RetailStream turns with a `4,000` thinking-token cap, shared Gemini 2.5 Pro prefix cache (`ContextCacheConfig`), inline 3LO Microsoft Entra ID consent for SharePoint & ServiceNow, and AlloyDB RLS isolation.' }
        ],
        stepsIntro: `The seven numbered steps in Figure 2 verify every state transition in the 5-Hop governance pipeline:`,
        steps: [
          { title: 'Request with OIDC JWT and DPoP proof', body: 'FinVault (`https://accounts.google.com`) or RetailStream (`https://login.microsoftonline.com/retailstream-tid/v2.0`) initiates an agent turn.' },
          { title: 'Hop 1 — Header sanitization and RFC 8693 OBO exchange', body: 'Cloud Armor strips any forged `X-Tenant-ID` header; IAP exchanges the JWT for a DPoP-bound `CryptographicContext`.' },
          { title: 'Hop 2 — Catalog filtering and `before_agent_callback` pruning', body: 'Discovery Engine restricts tool visibility to the caller\'s entitlement set and blocks unauthorized cross-tenant agent calls (`403 Forbidden`).' },
          { title: 'Hop 4 (Pre-inference) — Model Armor and Cloud DLP input scan', body: 'Prompts and tool parameters are scanned for SQL/prompt injection (`400 Bad Request`) and sensitive PII before model invocation.' },
          { title: 'Hop 3 — Sandbox binding, prefix cache, and model execution', body: 'The runtime binds `temp:tenant_id`, enforces Redis RPM and thinking-token caps, attaches `ContextCacheConfig` to the shared system prompt, and invokes the model.' },
          { title: 'Hop 4 (Post-inference) — Output DLP and 3LO MCP token scoping', body: 'MCP tool calls require a matching `dpop_jkt` and `tenant_id` in Auth Manager, and completions pass through post-inference NLC compliance checks (`422 Unprocessable Entity`).' },
          { title: 'Hop 5 — Transactional AlloyDB RLS and BigQuery FinOps export', body: 'Database queries execute under `SET LOCAL app.current_tenant_id`, and OpenTelemetry exports redacted token metrics to BigQuery.' }
        ]
      }
    ],
    useCasesMd: `## Use cases

This reference architecture supports three primary multi-tenant deployment scenarios validated in the **Cymbal SaaS Platform** anchor case study ([1.1 Taxonomy & Diagrams](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)):

- **High-volume B2B SaaS onboarding (RetailStream Corp — Standard Tier):** A global retail customer with zero existing Google Cloud footprint authenticates using Microsoft Entra ID, shares a pooled Vertex AI Agent Engine runtime (\`4,000\` thinking-token cap, \`120 RPM\` bulkhead), connects mid-session to SharePoint and ServiceNow via inline 3LO OAuth consent, and benefits from **90% shared prompt cache savings**.
- **Regulated financial and healthcare workloads (FinVault Bank — Enterprise Tier):** A regulated bank authenticating with Google Workspace OIDC requires an \`8,000\` thinking-token budget, self-provisions a private **Regulatory Escalation Agent (\`Agent Alpha\`)** running on **Gemini 2.5 Pro (Dedicated PT) via Vertex AI Model Garden**, and mandates customer-managed encryption keys (\`CMEK\`) with an instant \`HTTP 423 Locked\` kill-switch.
- **Multi-tiered SaaS with live tier promotion (Cymbal Platform Operator):** An ISV operates a single SaaS control plane that serves Standard customers in a shared pool (Pattern A) and Enterprise customers in dedicated Private Service Connect (\`PSC\`) spokes (Pattern C), promoting upgrading customers from pool to spoke with **zero dropped sessions**.`,
    alternativesMd: `## Design alternatives

When designing a multi-tenant agentic AI system on Google Cloud, you choose among three isolation topologies—**Pattern A (Pooled)**, **Pattern B (Sovereign Silos)**, and **Pattern C (Dynamic Hybrid)**—while keeping the **5-Hop Cryptographic Context Chain** invariant across all three.

### Comparison of multi-tenant isolation patterns

The following table compares the architectural characteristics, security boundaries, and unit economics of the three patterns:

| Dimension | Pattern A: Pooled (\`Maximum Density\`) | Pattern B: Sovereign Silos (\`Zero Trust Isolation\`) | Pattern C: Dynamic Hybrid (\`Intelligent Routing\`) |
| :--- | :--- | :--- | :--- |
| **Control plane** | Single shared Vertex AI Agent Engine Control Plane & Agent Catalog | Dedicated Google Cloud project & Control Plane per corporate tenant | Unified Control Plane + Tenant-Aware Cloud Run Ingress Router |
| **Compute & runtime** | Shared Vertex AI Agent Engine gVisor sandbox + immutable \`temp:tenant_id\` | Dedicated Agent Engine Runtime or air-gapped **Gemma 3 (27B) on GKE** per project | Shared Pool for Standard tier + **Private Service Connect (PSC)** spokes for Enterprise tier |
| **Network perimeter** | Single shared VPC behind Cloud Armor + IAP | Per-tenant **VPC Service Controls (VPC-SC)** perimeter + **mTLS ingress** | Hub-and-spoke VPC with **PSC Service Attachments** bridging to isolated spokes |
| **Identity & access** | **RFC 8693 OBO + DPoP** + **Auth Manager** 2LO/3LO | **IAM Principal Access Boundary (PAB)** + per-project Workload Identity Pools | Unified IdP broker + cross-project PAB + PSC identity propagation |
| **Data & memory plane** | Shared AlloyDB with **\`FORCE ROW LEVEL SECURITY\`** + \`{tenant}:{user}:{session}\` Memory Bank | Dedicated AlloyDB & BigQuery per project + **Cloud KMS CMEK** (\`423\` kill-switch) | Shared RLS DB for Standard + dedicated CMEK data spokes via PSC for Enterprise |
| **Model & FinOps COGS** | Shared **\`ContextCacheConfig\`** (up to 90% input token savings) + Valkey bulkheads | Dedicated Provisioned Throughput (PT) endpoints per project; zero noisy neighbors | Pooled caching for Standard + dedicated PT / Model Garden (Gemini 2.5 Pro (Dedicated PT)) for Enterprise |
| **Baseline unit cost** | \`$\` (\`120 RPM Pool\` floor per tenant) | \`$$$\` (\`600 RPM Silo\` floor per tenant project) | \`$$\` (\`Blended Hybrid Tier\` blended floor across tiers) |
| **Target workload** | High-volume Standard B2B SaaS tiers ([Workstream 2](ws2-pattern-a-pooled-architecture.md)) | Regulated FinTech, Healthcare, Public Sector ([Workstream 3](ws3-pattern-b-sovereign-silos.md)) | Multi-tiered SaaS with live tier upgrades ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |

### Compensating controls for Early Access Program (EAP) product gaps

During the cross-product architecture review ([1.2 Product Team Review Pack](../workstream-1-reference-architecture/1.2-product-team-review-pack.md) and [1.4 EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)), five platform behaviors required explicit compensating controls in \`core-cymbal-agent/\`:

| Gap ID | Platform behavior under multi-tenancy | Production compensating control in \`core-cymbal-agent/\` |
| :--- | :--- | :--- |
| \`GAP-01\` | Discovery Engine Agent Catalog does not natively filter custom agents by sub-project \`tenant_id\` | **Hop 2 Catalog PDP** (\`hop2_registry_pdp_callbacks.py\`) enforces ACL filtering + ADK \`before_agent_callback\` pruning |
| \`GAP-02\` | Vertex AI Agent Engine Memory Bank shares namespace unless prefixed | **Hop 3 Memory Bank** (\`hop3_compute_finops_bulkhead.py\`) enforces \`{tenant_id}:{user_id}:{session_id}\` composite keys |
| \`GAP-03\` | Shared \`ContextCacheConfig\` can bleed if dynamic tenant suffixes enter the cache key | **Hop 3 Prefix Hash Guard** caches only the immutable \`cymbal-shared-incident-system-prompt-v2\` prefix |
| \`GAP-04\` | 3LO MCP tokens can be replayed across pooled worker threads without sender binding | **Hop 1 & Hop 4 DPoP Binding** (\`hop4_inline_dlp_and_mcp_auth.py\`) verifies matching \`dpop_jkt\` + \`tenant_id\` |
| \`GAP-05\` | Per-tenant token consumption is aggregated at the GCP project level in Cloud Billing | **Hop 5 OTel FinOps Span** (\`hop5_data_plane_and_otel.py\`) emits per-turn token metrics to BigQuery |`,
    considerationsMd: `## Design considerations

This section provides guidance to help you tune this reference architecture according to the pillars of the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Eliminate confused-deputy ambient credentials:** Never allow ADK agents or MCP servers to authenticate to tenant data stores using a shared service account's ambient IAM permissions. Mint an RFC 8693 On-Behalf-Of (OBO) token bound to an RFC 9449 DPoP proof at **Hop 1**, and verify the \`tenant_id\` and \`dpop_jkt\` before every 3LO MCP call at **Hop 4**.
- **Enforce defense-in-depth tool pruning:** Filter the agent catalog at **Hop 2** before the user sees available capabilities, and run the ADK \`before_agent_callback\` inside the runtime so prompt-injection payloads cannot invoke unapproved MCP tools.
- **Apply inline bi-directional guardrails:** Configure [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection](https://cloud.google.com/sensitive-data-protection/docs) on both the pre-inference prompt path and the post-inference completion/tool-output path to prevent cross-tenant PII leakage.
- **Use transactional Row-Level Security (RLS):** In shared databases, execute \`SET LOCAL app.current_tenant_id = '<verified_tenant_id>'\` inside every AlloyDB transaction and enable \`FORCE ROW LEVEL SECURITY\` so even table-owner connections cannot read across tenants.

### Reliability

- **Isolate noisy neighbors with token-bucket bulkheads:** Enforce per-tenant request-per-minute (RPM) and token-per-minute (TPM) limits in **Memorystore for Valkey** at **Hop 3** before invoking Vertex AI model endpoints, returning \`HTTP 429 Too Many Requests\` with a \`Retry-After\` header when a tenant exceeds its tier quota.
- **Clamp recursive reasoning budgets:** Override client-requested thinking budgets in \`before_model_callback\` using the tenant's verified tier profile (\`4,000\` tokens for Standard; \`8,000\` tokens for Enterprise) to prevent runaway reasoning loops from exhausting regional model quotas.

### Cost optimization

- **Share immutable system prompt caches safely:** Use Vertex AI \`ContextCacheConfig\` on the shared system instructions and incident runbooks (\`4,096+\` tokens) while keeping tenant-specific context strictly in the uncached suffix. This reduces shared input token costs by up to **90%** and total turn COGS by **84.7%** in pooled deployments.
- **Attribute COGS per tenant:** Export OpenTelemetry spans containing \`cache_read_tokens\`, \`uncached_input_tokens\`, \`thinking_tokens\`, and \`output_tokens\` to BigQuery at **Hop 5** to track gross margin per customer tier.

### Operational excellence

- **Maintain a single 80% reusable agent codebase:** Centralize identity verification, catalog pruning, memory namespacing, DLP redaction, and telemetry in [\`core-cymbal-agent/\`](../core-cymbal-agent/) so security patches apply simultaneously to Patterns A, B, and C.
- **Automate breach regression testing:** Run the 20-scenario red-team verification suite ([\`scripts/run_deep_forensic_audit.py\`](../scripts/run_deep_forensic_audit.py)) in CI/CD before promoting topology or prompt changes.

### Performance optimization

- **Minimize guardrail latency:** Colocate Memorystore for Valkey, AlloyDB, and Vertex AI Agent Engine in the same region (\`us-central1\` or \`us-west1\`) and execute Hop 2 catalog lookups and Hop 3 quota checks in sub-millisecond in-memory caches.`,
    whatsNextMd: `## What's next

- Explore the deep-dive implementation guides for each isolation pattern in this 5-part series:
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 1 engineering deliverables:
  - [1.1 Multi-Tenant Architecture Taxonomy & Diagrams](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)
  - [1.2 Cross-Product Engineering Alignment & Review Pack](../workstream-1-reference-architecture/1.2-product-team-review-pack.md)
  - [1.3 Official Cloud Architecture Center Documentation Update PR](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)
  - [1.4 Early Access Program (EAP) & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)
- Download or open the editable architecture assets for Workstream 1:
  - [Workstream 1 Editable Google Slides Deck (\`ws1-reference-architecture-editable-slides.pptx\`)](../slides/ws1-reference-architecture-editable-slides.pptx)
  - [Figure 1 Draw.io Source (\`ws1-multi-tenant-taxonomy-overview.drawio\`)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio)
  - [Figure 2 Draw.io Source (\`ws1-cloud-arch-center-5hop-baseline.drawio\`)](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio)`
  }
];

import { WS2_WS3_SPECS } from './arch_center_specs_ws2_ws3.mjs';
import { WS4_WS5_SPECS } from './arch_center_specs_ws4_ws5.mjs';

const ALL_SPECS = [...BLOG_SPECS, ...WS2_WS3_SPECS, ...WS4_WS5_SPECS];

function buildFrontmatterYaml(fm) {
  return [
    '---',
    `title: ${JSON.stringify(fm.title)}`,
    `subtitle: ${JSON.stringify(fm.subtitle)}`,
    `series: ${JSON.stringify(fm.series)}`,
    `workstream: ${JSON.stringify(fm.workstream)}`,
    `authors: ${JSON.stringify(fm.authors)}`,
    `target_audience: ${JSON.stringify(fm.target_audience)}`,
    `reading_time: ${JSON.stringify(fm.reading_time)}`,
    `tags: ${JSON.stringify(fm.tags)}`,
    `canonical_architecture: ${JSON.stringify(fm.canonical_architecture)}`,
    `diagrams: ${JSON.stringify(fm.diagrams)}`,
    `editable_slides: ${JSON.stringify(fm.editable_slides)}`,
    `status: ${JSON.stringify(fm.status)}`,
    '---'
  ].join('\n');
}

function buildBlogMarkdown(spec) {
  const parts = [];
  parts.push(buildFrontmatterYaml(spec.frontmatter));
  parts.push('');
  parts.push(`# ${spec.frontmatter.title}`);
  parts.push('');
  for (const p of spec.leadParagraphs) {
    parts.push(p);
    parts.push('');
  }
  parts.push(`> ${spec.keyPointNote}`);
  parts.push('');
  // Act I — Outside-In Customer Use Cases & Strategic Design Alternatives / Comparison Matrix
  parts.push(spec.useCasesMd);
  parts.push('');
  parts.push(spec.alternativesMd);
  parts.push('');
  // Act II — Top-Down Architecture (4-Zone Logical Overview -> Figure 1 #78 Physical Blueprint -> 7-Step Chronological Callout Flow)
  parts.push('## Architecture');
  parts.push('');
  parts.push(spec.archIntro);
  parts.push('');

  for (const fig of spec.figures) {
    if (fig.heading) {
      parts.push(fig.heading);
      parts.push('');
    }
    parts.push(renderFigureBlock(fig.num, fig.title, fig.diagId, spec.pptxFile, fig.captionDetail));
    parts.push('');
    parts.push(fig.zonesIntro);
    parts.push('');
    parts.push(renderZoneList(fig.zones));
    parts.push('');
    parts.push(fig.stepsIntro);
    parts.push('');
    parts.push(renderCalloutSteps(fig.steps));
    parts.push('');
  }

  parts.push(COMMON_PRODUCTS_MD);
  parts.push('');
  // Act III — Well-Architected Framework Solution Guarantees, Lifecycle & Next Steps
  parts.push(spec.considerationsMd);
  parts.push('');
  parts.push(spec.whatsNextMd);
  parts.push('');

  return parts.join('\n');
}

for (const spec of ALL_SPECS) {
  const outPath = path.join(BLOGS_DIR, spec.filename);
  const md = buildBlogMarkdown(spec);
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`✅ Rebuilt ${spec.filename} in official Google Cloud Architecture Center format (${md.length.toLocaleString()} bytes)`);
}

console.log('🔄 Synchronizing <!-- E2E_FLOW_START --> blocks via build_diagram_e2e_flows.mjs...');
execSync('node scripts/build_diagram_e2e_flows.mjs', { cwd: ROOT, stdio: 'inherit' });
export { BLOG_SPECS, COMMON_PRODUCTS_MD, renderFigureBlock, renderZoneList, renderCalloutSteps };

