#!/usr/bin/env node
/**
 * Generates authoritative Google Cloud Architecture Center slide deck specifications
 * (`blogs/ws1..ws5-*.deck.json`) grounded in:
 *   - https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system
 *   - https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run
 *   - https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components
 *
 * Supports 3 distinct executive slide layouts in `scripts/build_editable_slide_decks.ts`:
 *   - `cards`: Structured Google Cloud Architecture Cards with Inner Technical Spec Boxes (`stack` + `sla`)
 *   - `table`: Multi-Column Google Cloud Architecture Comparison Matrix + Bottom Decision Cards
 *   - `pipeline`: 5-Hop Horizontal Cryptographic Verification Pipeline (`Hop 1` -> `Hop 5`)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const FIVE_HOP_PIPELINE_STEPS = [
  {
    hop: 'HOP 01',
    stage: 'Edge & Identity',
    title: 'Perimeter WAF, Federated OIDC & DPoP Token Binding',
    service: 'Cloud Armor • IAP • IAM STS',
    mechanism:
      'Strips unauthenticated X-Tenant-Id headers at the L7 load balancer, verifies Google Workspace or Microsoft Entra ID OIDC JWTs, and exchanges credentials via RFC 8693 OBO.',
    invariant: 'Cryptographic Claim: tenant_id + tier + DPoP (RFC 9449 jkt)',
    gate: 'HTTP 401 on Spoofed Header or Replayed Bearer Token',
  },
  {
    hop: 'HOP 02',
    stage: 'Registry Discovery',
    title: 'Tenant-Scoped Agent & MCP Tool Catalog Filtering',
    service: 'Vertex AI Agent Engine Registry',
    mechanism:
      'Evaluates the signed TenantSecurityContext against Agent Engine Registry metadata before LLM tool-binding, returning only shared platform tools and tenant-owned private agents.',
    invariant: 'Catalog Predicate: resource.visibility IN ("shared", ctx.tenant_id)',
    gate: 'HTTP 403 Forbidden on Cross-Tenant Agent or MCP Discovery',
  },
  {
    hop: 'HOP 03',
    stage: 'Runtime & Memory',
    title: 'Sandboxed ADK 2.0 Execution, L1–L5 Memory & Quota Bulkheads',
    service: 'Agent Engine • Memorystore Valkey',
    mechanism:
      'Executes agent reasoning inside gVisor-isolated Cloud Run v2 / Agent Engine sandboxes, partitions L1–L5 Memory Bank namespaces, and enforces per-tenant RPM and thinking budgets.',
    invariant: 'Namespace: mem://{tenant_id}/L1..L5 • Cap: 4k (Std) / 8k (Ent)',
    gate: 'HTTP 429 on RPM Burst • HTTP 403 on Cross-Namespace Read',
  },
  {
    hop: 'HOP 04',
    stage: 'Safety & DLP',
    title: 'Bidirectional Model Armor Screening & Sensitive Data Redaction',
    service: 'Model Armor • Sensitive Data Protection',
    mechanism:
      'Screens ingress prompts and retrieved RAG chunks for prompt injection/jailbreaks, enforces tenant Natural Language Constraints (NLCs), and redacts egress PII/PCI/IBAN tokens.',
    invariant: 'Policy: inspectContent + deidentifyContent + Tenant NLC Rules',
    gate: 'HTTP 400 on Prompt Injection • HTTP 422 on NLC Policy Breach',
  },
  {
    hop: 'HOP 05',
    stage: 'Data & FinOps',
    title: 'Transactional Row-Level Security, CMEK & Zero-PII Telemetry',
    service: 'AlloyDB RLS • Cloud KMS • BigQuery',
    mechanism:
      'Binds parameterized PostgreSQL session context (app.current_tenant_id) for mandatory Row-Level Security, verifies Cloud KMS CMEK liveness, and streams zero-PII OTel spans to BigQuery.',
    invariant: 'SQL: SET LOCAL app.current_tenant_id • OTel Chargeback Ledger',
    gate: '0 Unauthorized Rows • HTTP 423 Locked on CMEK Revocation',
  },
];

const DECKS = {
  'blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.deck.json': {
    workstream: 'WS1',
    deckTitle: 'Multi-Tenant Agentic AI on Google Cloud: Reference Taxonomy & 5-Hop Governance (Workstream 1)',
    deckSubtitle:
      'Official Google Cloud Architecture Center hub-and-spoke reference architecture comparing Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C) isolation models',
    tldr: [
      'The Multi-Tenant Agentic Challenge: Provisioning dedicated cloud projects for $500/month commercial tenants erodes SaaS gross margins, whereas naive shared runtimes expose cross-tenant tool, memory, and quota surfaces.',
      'Four Agentic Threat Vectors: Unlike deterministic CRUD applications, autonomous ADK agents dynamically discover MCP tools, persist episodic Memory Bank state, share prompt caches, and consume variable reasoning tokens.',
      'Three Production Isolation Topologies: Pattern A (High-Density Pooled), Pattern B (Zero-Trust Sovereign Silos), and Pattern C (Dynamic Hybrid PSC Spokes) reuse 80% of the same Python ADK 2.0 application codebase.',
      'Five-Hop Cryptographic Defense-in-Depth: Every agent turn enforces verified tenant context across Edge OBO/DPoP (Hop 1), Registry Discovery (Hop 2), Memory & Quotas (Hop 3), Model Armor/SDP (Hop 4), and AlloyDB RLS (Hop 5).',
      'Architecture Center & CISO Deliverable Kit: Ships with the Google Cloud Architecture Center (#78) hub-and-spoke blueprint, 20 automated red-team/migration assertions, and production compensating controls for EAP product gaps.',
    ],
    tldrSpecs: [
      {
        stack: 'Google Cloud Architecture Center (#78) • Cloud Run v2 • Vertex AI Agent Engine',
        sla: 'Target Economics: $42/mo Pooled (Pattern A) to $1,850/mo Sovereign Silo (Pattern B)',
        tag: 'Well-Architected: Cost vs. Isolation',
      },
      {
        stack: 'Vertex AI Agent Engine Registry • Memory Bank (L1–L5) • Model Garden (Gemini 2.5 Pro)',
        sla: 'Mitigates Tool Enumeration, Prompt Injection, Cross-Tenant Memory & Token Exhaustion',
        tag: 'Agentic Threat Model (OWASP LLM)',
      },
      {
        stack: 'Shared Core Engine (core-cymbal-agent/) • Terraform Modules (2.6, 3.6, 4.6)',
        sla: '80% Identical Application Code • 20% Declarative Cloud Boundary Parameterization',
        tag: 'Patterns A, B & C Taxonomy',
      },
      {
        stack: 'Cloud Armor • IAP (RFC 8693/9449) • Memorystore Valkey • Model Armor • AlloyDB RLS',
        sla: '100% Fail-Closed Enforcement Across All 5 Architectural Hops (HTTP 401/403/422/423/429)',
        tag: '5-Hop Cryptographic Pipeline',
      },
      {
        stack: 'BigQuery OTel Chargeback • Security Command Center • Cloud KMS CMEK',
        sla: '12/12 Forensic Checks PASS • 20/20 Automated Security & Migration Simulations PASS',
        tag: 'Production Readiness & Audit',
      },
    ],
    sections: [
      {
        heading: 'Products used — Google Cloud Agentic AI, Security & Data Stack',
        layout: 'cards',
        bullets: [
          'Agentic AI & Foundation Models: Vertex AI Agent Engine (ADK 2.0 runtime, Agent Registry & L1–L5 Memory Bank), Gemini 2.5 Pro with ContextCacheConfig (90% shared prefix discount), Vertex AI Model Garden (Gemini 2.5 Pro (Dedicated PT)), and Gemma 3 (27B) on private GKE.',
          'Ingress, Identity & AI Safety Guardrails: Global External Application Load Balancer, Google Cloud Armor L7 WAF, Identity-Aware Proxy (IAP) & IAM Security Token Service (RFC 8693 OBO + RFC 9449 DPoP), Vertex AI Model Armor, and Cloud Sensitive Data Protection (DLP).',
          'Data, Storage, Networking & Governance: AlloyDB for PostgreSQL (FORCE ROW LEVEL SECURITY), Memorystore for Valkey (per-tenant RPM bulkheads) & Firestore, VPC Service Controls (VPC-SC) & Private Service Connect (PSC), Cloud KMS CMEK (HTTP 423 kill-switch), and BigQuery OTel.',
          'Shared 80% Reusable Application Core: All three isolation patterns execute the exact same Python ADK 2.0 5-hop security pipeline (`core-cymbal-agent/runtime_pipeline.py`), parameterizing only the surrounding 20% Google Cloud project and network boundary.',
        ],
        specs: [
          {
            stack: 'Vertex AI Agent Engine (ADK 2.0) • Gemini 2.5 Pro (ContextCacheConfig) • Gemini 2.5 Pro • Gemma 3 27B',
            sla: '90% Shared System Prefix Cache Discount + Flexible Managed or Air-Gapped Model Hosting',
            tag: '1. Agentic AI & Models',
          },
          {
            stack: 'Cloud Load Balancing • Cloud Armor WAF • IAP & IAM STS (OBO + DPoP) • Model Armor • Cloud DLP',
            sla: 'Cryptographic Identity Binding (HTTP 401) + Bidirectional Prompt & PII Guardrails (HTTP 400/422)',
            tag: '2. Ingress, Identity & Safety',
          },
          {
            stack: 'AlloyDB (PostgreSQL RLS) • Memorystore Valkey • Firestore • VPC-SC • PSC • Cloud KMS CMEK • BigQuery',
            sla: '0 Cross-Tenant Rows • Sub-60s HTTP 423 CMEK Kill-Switch • Zero-PII FinOps Chargeback',
            tag: '3. Data, Network & Governance',
          },
          {
            stack: 'core-cymbal-agent/ (models.py, runtime_pipeline.py) + Terraform Modules (2.6, 3.6, 4.6)',
            sla: '80% Identical Python ADK Codebase Across Pooled (A), Siloed (B) & Hybrid (C) Tiers',
            tag: '4. Unified Platform Core',
          },
        ],
      },
      {
        heading: 'Use cases — Cymbal SaaS Serving Competing Enterprise Tenants',
        layout: 'cards',
        bullets: [
          'Cymbal Multi-Tenant Agentic Platform (Control Plane): Operates a shared Incident Diagnostic Agent on Gemini 2.5 Pro, caching a 32,000-token immutable SRE runbook prefix once to reduce input token costs by 90%.',
          'FinVault Bank (Regulated Enterprise Tenant): Authenticates via Google Workspace OIDC, provisions a private Gemini 2.5 Pro (Dedicated PT) regulatory agent (Agent Alpha), receives an 8,000-token thinking budget, and mandates CMEK.',
          'RetailStream Corp (Standard Commercial Tenant): Authenticates via Microsoft Entra ID OIDC, runs on the pooled Diagnostic Agent with a 4,000-token thinking cap, and invokes ServiceNow ITOM via 3LO employee consent.',
          'Cryptographic Mutual Invisibility: RetailStream callers receive immediate HTTP 403 Forbidden if probing FinVault’s private Agent Alpha, while FinVault is completely isolated from RetailStream’s Entra ID / ServiceNow connectors.',
        ],
        specs: [
          {
            stack: 'Project: ramp-portal-dev • Cloud Run Service: cymbal-multi-tenant-patterns',
            sla: 'Immutable 32k System Prefix Cache • 84.7% Net Per-Turn Token Cost Reduction',
            tag: 'Platform Provider: Cymbal SaaS',
          },
          {
            stack: 'IdP: Google Workspace OIDC • Connectors: Google Drive/Gmail/Jira 3LO • Key: finvault-silo-cmek',
            sla: 'Tier: ENTERPRISE • 600 RPM • 8,000 Thinking Budget • OCC/IBAN/SWIFT DLP Masking',
            tag: 'Tenant A: FinVault Bank',
          },
          {
            stack: 'IdP: Microsoft Entra ID OIDC • Connectors: SharePoint & ServiceNow 3LO • Pooled RLS',
            sla: 'Tier: STANDARD • 120 RPM • 4,000 Thinking Budget • PCI-DSS PAN/SSN DLP Masking',
            tag: 'Tenant B: RetailStream Corp',
          },
          {
            stack: 'Hop 2 ARD Filter + Hop 3 Memory Namespace + Hop 5 AlloyDB Row-Level Security',
            sla: 'Verified by 20 Automated Red-Team Breach, Silo Kill-Switch & Live Migration Tests',
            tag: 'Zero Cross-Tenant Leakage',
          },
        ],
      },
      {
        heading: 'Design alternatives — Comparison of Multi-Tenant Isolation Patterns (A, B & C)',
        layout: 'table',
        tableHeaders: [
          'Architectural Dimension',
          'Pattern A: High-Density Pooled (WS2)',
          'Pattern B: Sovereign Silos (WS3)',
          'Pattern C: Dynamic Hybrid PSC (WS4)',
        ],
        tableColW: [2.25, 3.35, 3.45, 3.483],
        tableRows: [
          [
            'Control plane & project boundary',
            'Single shared GCP project (`ramp-portal-dev`); logical separation in software',
            'Dedicated GCP project per tenant (`cymbal-{tenant}-silo-prod`) under org folder',
            'Central Ingress Hub project + Shared Pool + Dedicated Enterprise Spoke projects',
          ],
          [
            'Compute & agent runtime',
            'Shared Cloud Run v2 & shared Vertex AI Agent Engine worker pool',
            'Dedicated Agent Engine & private GKE GPU cluster (`172.16.0.2/28`, Gemma 3 27B)',
            'Firestore dynamic tier router dispatches Standard -> Pool, Enterprise -> PSC Spoke',
          ],
          [
            'Network & perimeter isolation',
            'Shared VPC protected by Cloud Armor L7 WAF header sanitization',
            'Per-tenant VPC Service Controls (VPC-SC) perimeter + BeyondCorp mTLS pinning',
            'Unidirectional Private Service Connect (PSC) endpoints (`10.10.0.50` -> `/24` NAT)',
          ],
          [
            'Identity & access control',
            'IAP OIDC + IAM STS RFC 8693 OBO & RFC 9449 DPoP sender-constrained tokens',
            'IAM Principal Access Boundaries (PAB) + dedicated per-silo service accounts',
            'Unified Hub OIDC verification + tier-scoped OBO/DPoP token forwarding',
          ],
          [
            'Data, memory & state plane',
            'Shared AlloyDB with `FORCE ROW LEVEL SECURITY` + namespaced L1–L5 Memory Bank',
            'Dedicated AlloyDB & Memory Bank encrypted by tenant Cloud KMS CMEK (`HTTP 423`)',
            'Pooled RLS for Standard; CMEK spoke vault + 3-phase zero-downtime live migration',
          ],
          [
            'Model & FinOps COGS',
            'Shared 32k prefix cache (`90%` discount -> `84.7%` net token cost reduction)',
            'Dedicated Vertex AI Provisioned Throughput or air-gapped GKE GPU node pool',
            'Blended portfolio (`74%` lower total cloud spend across 950 Std + 50 Ent tenants)',
          ],
          [
            'Baseline unit cost & target tier',
            '`$42 / tenant / month` • High-volume commercial B2B SaaS (`10/10` breach tests PASS)',
            '`$1,850 / tenant / month` • Regulated Banking, Healthcare & Public Sector (`6/6` PASS)',
            '`$42` (Std) / `$1,850` (Ent) • Multi-tier SaaS with live tier upsell (`4/4` PASS)',
          ],
        ],
        bullets: [],
        specs: [],
      },
      {
        heading: 'Design alternatives — Compensating Controls for EAP Product Gaps (GAP-01..05)',
        layout: 'table',
        tableHeaders: [
          'Gap ID & Component',
          'Current Preview / EAP Limitation',
          'Production Compensating Control (core-cymbal-agent/)',
          'Verification Gate & Target GA',
        ],
        tableColW: [2.15, 3.15, 4.25, 2.983],
        tableRows: [
          [
            'GAP-01 (Hop 2)\nAgent Engine Registry',
            'Shared Agent Engine Registry lacks native per-tenant IAM condition predicates on `ListAgents` discovery calls.',
            '`Hop2AgentRegistryDiscovery.filter_ard_catalog` validates signed JWT `tenant_id` against visibility metadata before LLM tool binding.',
            'WS2 Test 2 PASS (`HTTP 403` on cross-tenant Agent Alpha discovery) • Target GA: Q4 2026',
          ],
          [
            'GAP-02 (Hop 3)\nMemory Bank CMEK',
            'Pooled Vertex AI Memory Bank supports project-level CMEK rather than distinct per-tenant KMS keys in one shared pool.',
            'Pattern A applies envelope encryption via tenant KMS keys; Pattern B isolates each tenant in a dedicated CMEK project (`HTTP 423`).',
            'WS3 Tests 4A/4B/6 PASS (`HTTP 423 Locked` <60s on key disable) • Target GA: Q4 2026',
          ],
          [
            'GAP-03 (Hop 3)\nPer-Tenant Rate Quotas',
            'Vertex AI quota system enforces regional project-level RPM/TPM limits rather than native per-tenant sub-quotas.',
            '`Hop3RuntimeAndMemory` enforces atomic per-tenant token-bucket RPM limits in Memorystore for Valkey (`120` vs. `600` RPM) + `thinking_budget` clamps.',
            'WS2 Test 6 PASS (`HTTP 429` on 500-RPM flood; budget clamped to 4k) • Target GA: Q4 2026',
          ],
          [
            'GAP-04 (Hop 1/2)\nMulti-IdP 3LO Broker',
            'External Microsoft Entra ID OIDC tokens require custom claims normalization and step-up consent for downstream MCP tools.',
            'Hop 1 Edge STS normalizes Entra ID `tid`/`sub` claims into DPoP-bound `TenantSecurityContext` with `-32042` step-up 3LO elicitation.',
            'WS2 Test 10 PASS (`HTTP 401` step-up challenge -> `200 OK` ServiceNow) • Target GA: Q4 2026',
          ],
          [
            'GAP-05 (Hop 5)\nZero-PII Token Billing',
            'Cloud Billing exports aggregate Vertex AI SKU charges by GCP project rather than individual logical SaaS `tenant_id`.',
            '`Hop5DataAndFinOps` emits zero-PII OpenTelemetry spans (`cached_tokens`, `thinking_tokens`, `output_tokens`) to BigQuery chargeback ledger.',
            'Forensic Check F-08 PASS (3 billing SQL models verified in BigQuery) • Target GA: Q1 2027',
          ],
        ],
        bullets: [],
        specs: [],
      },
      {
        heading: 'Design considerations — 5-Hop Cryptographic Verification Pipeline',
        layout: 'pipeline',
        pipelineSteps: FIVE_HOP_PIPELINE_STEPS,
        bullets: [
          'Hop 1 — Edge WAF & Identity Binding: Cloud Armor strips spoofed X-Tenant-Id headers while IAP and IAM STS mint an RFC 8693 OBO + RFC 9449 DPoP TenantSecurityContext.',
          'Hop 2 — Registry Discovery Filtering: Vertex AI Agent Engine Registry evaluates tenant visibility metadata prior to tool binding, returning HTTP 403 on unauthorized private agents.',
          'Hop 3 — Sandboxed Runtime & Quota Bulkheads: Cloud Run v2 and Memorystore for Valkey isolate L1–L5 Memory Bank namespaces and clamp per-tenant RPM (120/600) and thinking budgets (4k/8k).',
          'Hop 4 — Bidirectional Model Armor & DLP: Model Armor blocks prompt injection (HTTP 400) and semantic NLC violations (HTTP 422), while Sensitive Data Protection masks IBAN/SWIFT/PAN tokens.',
          'Hop 5 — Transactional RLS, CMEK & FinOps: AlloyDB enforces SET LOCAL app.current_tenant_id Row-Level Security, Cloud KMS validates CMEK liveness (HTTP 423), and BigQuery logs zero-PII OTel spans.',
        ],
      },
      {
        heading: 'Design considerations — Google Cloud Well-Architected Framework Alignment',
        layout: 'cards',
        bullets: [
          '1. Security, Privacy & Compliance: Enforces zero-trust defense-in-depth across all 5 hops—combining RFC 9449 DPoP sender-constrained tokens, Model Armor prompt/egress screening, AlloyDB RLS, and revocable Cloud KMS CMEK.',
          '2. Reliability & Fault Isolation: Prevents noisy-neighbor cascading failures through Memorystore for Valkey token-bucket bulkheads, gVisor execution sandboxes, and zero-downtime 3-phase live tier migrations (`0` dropped sessions).',
          '3. Cost Optimization (FinOps): Shares a 32,000-token immutable system prefix in Gemini 2.5 Pro ContextCacheConfig (90% discount, 84.7% net token savings) and streams per-tenant OTel token spans to BigQuery.',
          '4. Operational Excellence & 5. Performance Optimization: Reuses 80% of the Python ADK 2.0 codebase across all 3 patterns, validates 20/20 security simulations in CI/CD, and bounds p99 latency via per-tier thinking budgets (4k vs. 8k).',
        ],
        specs: [
          {
            stack: 'Cloud Armor • IAP OBO/DPoP • Model Armor • Cloud DLP • AlloyDB RLS • VPC-SC • Cloud KMS CMEK',
            sla: '10/10 Breach Vectors Blocked (WS2) + 6/6 Sovereign Silo & HTTP 423 CMEK Tests PASS (WS3)',
            tag: 'Pillar 1: Security & Compliance',
          },
          {
            stack: 'Memorystore for Valkey (120/600 RPM) • Cloud Run v2 gVisor • 3-Phase Live Tier Migrator',
            sla: '99.99% Enterprise Availability SLA • 0ms Replication Lag & 0 Dropped Sessions on Upgrade (WS4)',
            tag: 'Pillar 2: Reliability & Bulkheads',
          },
          {
            stack: 'Gemini 2.5 Pro ContextCacheConfig (32k Prefix) • BigQuery OTel Chargeback Ledger',
            sla: '$42/mo Pooled Floor • 84.7% Per-Turn Token Savings • 74% Portfolio TCO Reduction (1,000 Tenants)',
            tag: 'Pillar 3: Cost Optimization',
          },
          {
            stack: 'core-cymbal-agent/ (80% Reusable Code) • Terraform (2.6, 3.6, 4.6) • 4k/8k Thinking Budget Clamp',
            sla: '12/12 Forensic Gates PASS • Sub-2ms Firestore Tier Lookup • Deterministic Latency Bounds',
            tag: 'Pillars 4 & 5: Ops & Performance',
          },
        ],
      },
    ],
    diagrams: [
      {
        id: 'ws1-multi-tenant-taxonomy-overview',
        figure: 'Figure 1',
        title: 'Vertex AI Agent Engine Multi-Tenant Taxonomy: Pooled (A), Sovereign Silos (B) & Hybrid (C)',
        talkingPoints: [
          'Step 1 & 2 (Zone 1 Routing Hub): Global ALB, Cloud Armor WAF, and IAP authenticate tenant callers, strip spoofed headers, and look up the tenant isolation pattern.',
          'Zone 2 (Central Governance Hub): Security Command Center, Cloud KMS CMEK, and BigQuery OTel centralize threat detection, key lifecycle, and zero-PII chargeback.',
          'Step 3 Tier Dispatch: The 80% reusable ADK control plane routes requests dynamically to Pattern A (Yellow Spoke) or Pattern B/C (Red Spoke).',
          'Zone 3 (Pattern A Pooled Spoke): Enforces Model Armor screening (4/6), Gemini 2.5 Pro 90% prefix caching (5), Valkey RPM bulkheads, and AlloyDB RLS.',
          'Zone 4 (Pattern B Silos & Pattern C PSC Spoke): Enforces VPC-SC perimeters, IAM PAB, air-gapped Gemma 3 / Gemini 2.5 Pro endpoints, and tenant CMEK kill-switches.',
        ],
      },
      {
        id: 'ws1-cloud-arch-center-5hop-baseline',
        figure: 'Figure 2',
        title: 'Google Cloud Architecture Center (#78): Multi-Tenant Agentic AI with 5-Hop Governance',
        talkingPoints: [
          'Extends the canonical Google Cloud Architecture Center hub-and-spoke diagram with 5 mandatory cryptographic tenant isolation hops.',
          'Zone 1 (Hops 1 & 2): Cloud Armor, IAP OBO/DPoP, and Agent Engine Registry authenticate callers and filter the tool catalog before model invocation.',
          'Zone 2 (Hop 5 FinOps & Security): 2LO/3LO Auth Broker, Security Command Center, and BigQuery OTel govern external credentials and per-tenant token attribution.',
          'Zone 3 (FinVault Enterprise Workload): Executes with an 8,000-token thinking budget, OCC semantic NLCs, IBAN/SWIFT SDP masking, and Google Workspace/Jira 3LO.',
          'Zone 4 (RetailStream Standard Workload): Executes with a 4,000-token thinking cap, PCI-DSS PAN masking, Entra ID/ServiceNow 3LO, and AlloyDB RLS.',
        ],
      },
    ],
    takeaways: [
      'Enforce Cryptographic Context Across All 5 Hops: Database row filters alone cannot secure agentic AI; tenant identity must govern ingress, tool discovery, memory namespaces, safety guardrails, and SQL RLS.',
      'Align Isolation Topology to Regulatory & Margin Requirements: Deploy Pattern A ($42/mo) for commercial scale, Pattern B ($1,850/mo) for regulated sovereignty, and Pattern C for multi-tier SaaS portfolios.',
      'Maintain a Single 80% Reusable Agent Codebase: Parameterize isolation boundaries via declarative Firestore profiles and Terraform modules rather than forking separate application codebases.',
      'Capture 90% Prefix Cache Savings Without Cross-Tenant Risk: Bind Gemini 2.5 Pro ContextCacheConfig strictly to immutable platform instructions while isolating tenant episodic state in L1–L5 Memory Bank.',
      'Validate Every Release Against Automated Red-Team Gates: Execute the 20-assertion verification suite (10 Pattern A breach tests, 6 Pattern B silo tests, 4 Pattern C migration tests) in CI/CD.',
    ],
    takeawaySpecs: [
      {
        stack: 'Hops 1–5: Cloud Armor • IAP • Agent Engine Registry • Valkey • Model Armor • AlloyDB',
        sla: 'Zero Trust End-to-End: Every Hop Verifies Signed TenantSecurityContext',
        tag: 'Mandate 1: 5-Hop Defense-in-Depth',
      },
      {
        stack: 'Pattern A ($42/mo) • Pattern B ($1,850/mo) • Pattern C (Hybrid PSC Router)',
        sla: 'Matches Infrastructure Unit Cost Directly to Customer Contract ACV & Compliance',
        tag: 'Mandate 2: Tiered Isolation Economics',
      },
      {
        stack: 'core-cymbal-agent/ (Python ADK 2.0) + Terraform Blueprints (2.6, 3.6, 4.6)',
        sla: 'Zero Codebase Forking • Tier Promotion Becomes a Declarative Metadata Update',
        tag: 'Mandate 3: 80% Code Reusability',
      },
      {
        stack: 'Gemini 2.5 Pro ContextCacheConfig (32k Tokens) + Scoped L1–L5 Memory Bank',
        sla: '84.7% Net Per-Turn Token Savings with 0 Cross-Tenant Prompt Cache Bleed',
        tag: 'Mandate 4: Safe FinOps Caching',
      },
      {
        stack: 'scripts/run_deep_forensic_audit.py • 12/12 Forensic Gates • 20/20 Simulations',
        sla: 'Continuous Automated Compliance Receipts Logged in BigQuery OTel Sink',
        tag: 'Mandate 5: Continuous Verification',
      },
    ],
    callToAction:
      'Review the 14-slide 3-Act executive architecture deck, execute python3 -B scripts/run_deep_forensic_audit.py, and proceed to Workstream 2 (Pattern A Pooled Architecture).',
  },

  'blogs/ws2-pattern-a-pooled-architecture.deck.json': {
    workstream: 'WS2',
    deckTitle: 'Pattern A — High-Density Pooled Multi-Tenant Architecture on Google Cloud (Workstream 2)',
    deckSubtitle:
      'Serving hundreds of commercial B2B SaaS tenants on a single shared Cloud Run v2, Vertex AI Agent Engine, and AlloyDB RLS footprint with 84.7% lower inference cost and 10/10 red-team attacks blocked',
    tldr: [
      'Solving the Commercial SaaS Margin Equation: Pattern A hosts hundreds of $500–$2,000/month commercial tenants inside one shared Google Cloud project (`ramp-portal-dev`) at a $42/month infrastructure floor.',
      'Cryptographic Logical Isolation (Zero Physical Sprawl): Instead of spinning up separate VPCs per tenant, Pattern A enforces non-bypassable tenant boundaries across all 5 runtime hops in software.',
      '10/10 Adversarial Red-Team Attacks Neutralized: Competing tenants FinVault Bank and RetailStream Corp share the exact same Cloud Run v2 workers and AlloyDB cluster with zero cross-tenant data or tool bleed.',
      '84.7% Net Inference Cost Reduction: A 32,000-token immutable platform runbook is cached once in Gemini 2.5 Pro ContextCacheConfig at a 90% discount, cutting billable input tokens from 34,000 to 5,200 per turn.',
      'Turnkey Milestone 1 Production Kit: Includes the 80% reusable ADK 2.0 runtime pipeline, a 1-click Terraform starter (`2.6-terraform-starter`), a 90-minute hands-on codelab, and the 10-point breach simulation suite.',
    ],
    tldrSpecs: [
      {
        stack: 'Single GCP Project (ramp-portal-dev) • Cloud Run v2 (cymbal-multi-tenant-patterns)',
        sla: '$42/mo Unit Cost per Tenant • Preserves 85%+ SaaS Gross Margin on Standard Tiers',
        tag: 'High-Density SaaS Unit Economics',
      },
      {
        stack: 'RFC 8693 OBO + RFC 9449 DPoP • Agent Engine Registry • Memorystore • AlloyDB RLS',
        sla: 'Cryptographic TenantSecurityContext Enforced Across Hops 1 through 5',
        tag: 'Software-Defined Zero Trust',
      },
      {
        stack: 'workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py',
        sla: '10/10 Adversarial Cross-Tenant Breach Vectors Deterministically Blocked',
        tag: 'Adversarial Red-Team Certified',
      },
      {
        stack: 'Gemini 2.5 Pro ContextCacheConfig (32,000 Shared Platform System Tokens)',
        sla: '90% Cached Input Token Discount • 84.7% Total Per-Turn Inference Cost Savings',
        tag: 'Shared Immutable Prefix Cache',
      },
      {
        stack: 'workstream-2-pattern-a-pooled/2.6-terraform-starter (main.tf, variables.tf)',
        sla: 'Provisions WAF, Cloud Run v2, Valkey, KMS CMEK & BigQuery OTel in <10 Minutes',
        tag: '1-Click Terraform & Codelab',
      },
    ],
    sections: [
      {
        heading: 'Products used — Shared Cloud Run v2, Vertex AI, Valkey & AlloyDB RLS',
        layout: 'cards',
        bullets: [
          'Agentic AI & Shared Prefix Caching: Vertex AI Agent Engine (ADK 2.0 runtime, Agent Registry & L1–L5 Memory Bank) and Gemini 2.5 Pro with ContextCacheConfig caching a 32,000-token immutable system prefix at a 90% discount (84.7% net token savings).',
          'Ingress, Identity & Bidirectional AI Safety: Global External Application Load Balancer, Google Cloud Armor L7 WAF (stripping spoofed X-Tenant-Id headers), IAP + IAM STS (RFC 8693 OBO + RFC 9449 DPoP), Vertex AI Model Armor, and Cloud Sensitive Data Protection.',
          'Rate Bulkheads, Relational RLS & FinOps Telemetry: Memorystore for Valkey (120 vs. 600 RPM token buckets), Firestore tenant profile registry, AlloyDB for PostgreSQL (`FORCE ROW LEVEL SECURITY`), Cloud KMS CMEK, and BigQuery zero-PII OTel chargeback.',
          'High-Density Unit Economics ($42/Tenant/Month): Co-hosts hundreds of commercial B2B SaaS tenants inside one shared Google Cloud project (`ramp-portal-dev`) while guaranteeing 10/10 red-team breach isolation.',
        ],
        specs: [
          {
            stack: 'Vertex AI Agent Engine (ADK 2.0) • Gemini 2.5 Pro ContextCacheConfig (32k Shared System Prefix)',
            sla: '90% Cached Input Token Discount • Cuts Billable Input Tokens from 34,000 to 5,200/Turn (84.7% Savings)',
            tag: '1. Agentic AI & Prefix Cache',
          },
          {
            stack: 'Cloud Load Balancing • Cloud Armor WAF • IAP & IAM STS (OBO + DPoP) • Model Armor • Cloud DLP',
            sla: 'Strips Spoofed Headers (401), Blocks Jailbreaks (400) & NLC Violations (422), Masks IBAN/PAN PII',
            tag: '2. Ingress, Identity & Safety',
          },
          {
            stack: 'Memorystore for Valkey (RPM) • Firestore • AlloyDB PostgreSQL RLS • Cloud KMS • BigQuery OTel',
            sla: 'Enforces 120/600 RPM & 4k/8k Thinking Caps • 0 Cross-Tenant SQL Rows • Per-Tenant Token Billing',
            tag: '3. Bulkheads, RLS & FinOps',
          },
          {
            stack: 'workstream-2-pattern-a-pooled/2.6-terraform-starter (main.tf, variables.tf) + 2.4 Codelab',
            sla: '$42/mo Baseline Unit Cost per Tenant • 10/10 Red-Team Breach Simulations Verified',
            tag: '4. Turnkey Pattern A Kit',
          },
        ],
      },
      {
        heading: 'Use cases — FinVault Bank & RetailStream Corp Co-Hosted Safely',
        layout: 'cards',
        bullets: [
          'Dynamic Per-Turn Runtime Hydration: A single pooled Diagnostic Agent dynamically loads each caller’s Firestore profile, GCS Skills (`gs://cymbal-skills-{tenant}/`), and token caps on every turn.',
          'FinVault Bank (Enterprise Slice in Pool): Authenticates via Google Workspace OIDC, unlocks an 8,000-token thinking budget and 600 RPM quota, and accesses private Agent Alpha plus Workspace/Jira 3LO.',
          'RetailStream Corp (Standard Slice in Pool): Authenticates via Microsoft Entra ID OIDC, runs within a 4,000-token thinking cap and 120 RPM quota, and invokes SharePoint/ServiceNow 3LO with employee consent.',
          'Strict Catalog & Namespace Firewall: RetailStream’s catalog discovery call excludes FinVault’s Agent Alpha (HTTP 403), and cross-tenant L4 Episodic Memory Bank reads throw an immediate PermissionError.',
        ],
        specs: [
          {
            stack: 'core-cymbal-agent/runtime_pipeline.py • Hop3RuntimeAndMemory.load_dynamic_runtime_config',
            sla: 'Injects Tenant-Specific System Prompt & Verified GCS Skills URIs per Turn',
            tag: 'Dynamic Context Hydration',
          },
          {
            stack: 'Google Workspace OIDC • Agent Alpha (Gemini 2.5 Pro / Gemini 2.5) • 3LO Drive/Gmail/Jira',
            sla: '8,000 Thinking Tokens • 600 RPM Valkey Bucket • OCC NLC + IBAN/SWIFT Masking',
            tag: 'FinVault Pooled Slice',
          },
          {
            stack: 'Microsoft Entra ID OIDC • Shared Diagnostic Agent • 3LO SharePoint/ServiceNow',
            sla: '4,000 Thinking Tokens • 120 RPM Valkey Bucket • PCI-DSS PAN/SSN Masking',
            tag: 'RetailStream Pooled Slice',
          },
          {
            stack: 'Hop 2 ARD Filter + Hop 3 MemoryBankLevel.L1..L5 + Hop 5 PostgreSQL RLS',
            sla: '100% Mutual Invisibility Between Co-Hosted Competing Tenants',
            tag: 'Cryptographic Partitioning',
          },
        ],
      },
      {
        heading: 'Design alternatives — FinOps Prefix Caching (84.7% Savings) & Terraform Starter',
        layout: 'cards',
        bullets: [
          '84.7% Net Inference Cost Reduction: By caching the 32,000-token immutable Cymbal SRE runbook in Gemini 2.5 Pro ContextCacheConfig (90% discount), effective billable tokens drop from 34,000 to 5,200 per turn.',
          '1-Click Terraform Starter (`2.6-terraform-starter`): Declaratively provisions Cloud Armor WAF policies, Cloud Run v2 ADK workers, Memorystore for Valkey, Cloud KMS CMEK, and the BigQuery OTel billing sink.',
          '90-Minute Hands-On Engineering Codelab (`2.4-hands-on-codelab.md`): Guides platform and security engineers through deploying Pattern A, executing all 10 red-team breach tests, and querying the BigQuery FinOps ledger.',
          'Frictionless Promotion Path to Pattern B/C: Because Pattern A uses the shared 5-hop runtime interface, tenants requiring dedicated VPC-SC silos later upgrade via configuration without agent code rewrites.',
        ],
        specs: [
          {
            stack: 'Gemini 2.5 Pro ContextCacheConfig • 32k Cached Prefix + 2k Dynamic Tenant Turn',
            sla: 'Cuts Input Token Spend by 84.7% While Keeping Tenant Memory 100% Unshared',
            tag: 'FinOps Prefix Caching',
          },
          {
            stack: 'workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf & variables.tf',
            sla: '5 Parameterized Variables • Automated Dependency Graph • Zero Manual Console Clicks',
            tag: 'Infrastructure as Code',
          },
          {
            stack: 'workstream-2-pattern-a-pooled/2.4-hands-on-codelab.md • 10 Live CLI Steps',
            sla: 'Verifies All 10 Breach Defenses & BigQuery Cost Attribution Queries End-to-End',
            tag: 'Developer Enablement',
          },
          {
            stack: 'core-cymbal-agent/models.py • TenantProfile (isolation_pattern: POOLED -> SILO)',
            sla: 'Zero Application Refactoring Required When Scaling into Workstreams 3 & 4',
            tag: 'Architectural Continuity',
          },
        ],
      },
      {
        heading: 'Design considerations — The 5-Hop Cryptographic Chain in Pattern A',
        layout: 'pipeline',
        pipelineSteps: FIVE_HOP_PIPELINE_STEPS,
        bullets: [
          'Hop 1 — Edge Header Stripping & OBO/DPoP Minting: Cloud Armor strips client X-Tenant-Id headers and IAP/STS mints a DPoP-bound TenantSecurityContext.',
          'Hop 2 — Agent Registry Discovery (ARD) Filter: Filters visible agents and MCP servers by tenant_id, blocking unauthorized private agent invocations with HTTP 403.',
          'Hop 3 — L1–L5 Memory Bank & Valkey Bulkheads: Scopes episodic memory to mem://{tenant_id}/L1..L5, enforces 120/600 RPM in Valkey, and clamps thinking_budget (4k/8k).',
          'Hop 4 — Bidirectional Model Armor & Sensitive Data Protection: Screens prompts for jailbreaks (HTTP 400), enforces semantic NLCs (HTTP 422), and masks egress IBAN/SWIFT/PAN PII.',
          'Hop 5 — AlloyDB Row-Level Security & BigQuery OTel: Binds SET LOCAL app.current_tenant_id in PostgreSQL RLS and streams zero-PII token attribution spans to BigQuery.',
        ],
      },
      {
        heading: 'Design considerations — 10-Point Red-Team Breach Simulation Matrix (10/10 PASS)',
        layout: 'table',
        tableHeaders: [
          'Test ID & Attack Vector',
          'Target Hop & Google Cloud Control',
          'Adversarial Payload Simulated',
          'Verified Fail-Closed Outcome (10/10 PASS)',
        ],
        tableColW: [2.35, 2.75, 3.9, 3.533],
        tableRows: [
          [
            'Test 1: Header Spoofing\nTest 2: Private Agent Probe',
            'Hop 1: Cloud Armor + IAP DPoP\nHop 2: Agent Engine Registry ARD',
            'RetailStream injects `X-Tenant-Id: finvault` or attempts to invoke FinVault’s private `Agent Alpha`.',
            'Test 1: Spoof stripped (`HTTP 401`) • Test 2: Agent Alpha discovery blocked (`HTTP 403`)',
          ],
          [
            'Test 3: Cross-Tenant 3LO MCP\nTest 10: Step-Up 3LO Consent',
            'Hop 2: MCP Broker ACL Filter\nHop 2/3: Entra ID `-32042` Elicitation',
            'RetailStream calls FinVault’s Jira 3LO tool (Test 3) or invokes ServiceNow before 3LO consent (Test 10).',
            'Test 3: Cross-tenant MCP blocked (`HTTP 403`) • Test 10: Step-up `401` -> `200 OK` post-consent',
          ],
          [
            'Test 4: Prompt Injection\nTest 5: Semantic NLC Breach',
            'Hop 4: Vertex AI Model Armor\nFloor + Tenant Regulatory NLC',
            'Attacker injects `DROP TABLE` / system-override prompt (Test 4) or asks FinVault agent to skip OCC filing (Test 5).',
            'Test 4: Jailbreak blocked (`HTTP 400`) • Test 5: OCC regulatory NLC violation blocked (`HTTP 422`)',
          ],
          [
            'Test 6: Token & RPM Flood\nTest 7: Cross-Tenant Memory',
            'Hop 3: Valkey Token Bucket +\nL1–L5 Memory Bank Namespace',
            'RetailStream requests 16k thinking budget & floods 500 RPM (Test 6) or reads `mem://finvault/L4` (Test 7).',
            'Test 6: Clamped to 4k & throttled (`HTTP 429`) • Test 7: Memory read blocked (`PermissionError`)',
          ],
          [
            'Test 8: Egress PII/PCI Leak\nTest 9: SQL RLS Bypass',
            'Hop 4: Sensitive Data Protection\nHop 5: AlloyDB PostgreSQL RLS',
            'LLM completion contains raw IBAN/SWIFT/PAN digits (Test 8) or executes `SELECT * FROM incidents` (Test 9).',
            'Test 8: Redacted (`[IBAN_REDACTED]`) • Test 9: `SET LOCAL app.current_tenant_id` -> `0` FinVault rows',
          ],
        ],
        bullets: [],
        specs: [],
      },
    ],
    diagrams: [
      {
        id: 'ws2-pattern-a-pooled-5hop-architecture',
        figure: 'Figure 1',
        title: 'Pattern A: High-Density Pooled Multi-Tenant Architecture & 5-Hop Runtime Governance',
        talkingPoints: [
          'Competing tenants FinVault Bank and RetailStream Corp enter the shared GCP project (ramp-portal-dev) through a single External Application Load Balancer.',
          'Zone 1 (Hops 1 & 2): Cloud Armor strips spoofed headers, IAP + STS mints DPoP-bound OBO tokens, and Agent Engine Registry filters visible tools.',
          'Zone 2 (FinOps & Governance): Gemini 2.5 Pro ContextCacheConfig delivers a 90% shared prefix discount while Memorystore Valkey enforces per-tenant RPM.',
          'Zone 3 (FinVault Enterprise Slice): Runs with an 8,000-token thinking budget, OCC NLC rules, IBAN/SWIFT DLP redaction, and Google Workspace/Jira 3LO.',
          'Zone 4 (RetailStream Standard Slice): Runs with a 4,000-token thinking cap, PCI-DSS PAN redaction, Entra ID/ServiceNow 3LO, and AlloyDB RLS.',
        ],
      },
      {
        id: 'ws2-pattern-a-breach-defense-sequence',
        figure: 'Figure 2',
        title: 'Pattern A: 10-Point Cross-Tenant Breach Simulation & Cryptographic Defense Matrix',
        talkingPoints: [
          'Maps all 10 automated red-team adversarial tests directly onto the 4 Hub-and-Spoke architecture zones to prove defense-in-depth.',
          'Zone 1 Edge & Catalog Defenses (Tests 1–3): Neutralizes X-Tenant-Id header spoofing (401), private Agent Alpha probing (403), and cross-tenant MCP calls (403).',
          'Zone 2 Rate & Consent Governance (Tests 6 & 10): Clamps oversized thinking budgets, throttles 500-RPM bursts (429), and enforces 3LO step-up consent (401).',
          'Zone 3 Safety & DLP Defenses (Tests 4, 5 & 8): Blocks prompt injection (400), enforces OCC semantic NLCs (422), and masks egress IBAN/SWIFT/PAN PII.',
          'Zone 4 Memory & RLS Defenses (Tests 7 & 9): Blocks cross-tenant L4 Memory Bank reads (PermissionError) and restricts AlloyDB queries to 0 unauthorized rows.',
        ],
      },
      {
        id: 'ws2-demo-env-and-3p-auth-sandbox-topology',
        figure: 'Figure 3',
        title: 'Pattern A Demo Environment & Multi-IdP 2LO/3LO Auth Sandbox Topology',
        talkingPoints: [
          'Demonstrates how a single pooled Google Cloud project federates both Google Workspace OIDC and Microsoft Entra ID OIDC without shadow accounts.',
          'Zone 1 (Identity Ingress): Cloud Armor WAF and IAP validate external OIDC JWTs and exchange them via IAM STS for DPoP-bound session tokens.',
          'Zone 3 (FinVault 3LO Sandbox): Brokers Google OAuth 2.0 3LO access to Google Drive runbooks, Calendar, Gmail, and Atlassian Jira.',
          'Zone 4 (RetailStream 3LO Sandbox): Brokers Microsoft Entra ID OIDC 3LO access to SharePoint Online and ServiceNow ITOM with step-up elicitation.',
          'Zone 2 (Shared State & Rate Store): Firestore stores per-tenant tier metadata (8k vs. 4k budget) while Memorystore for Valkey tracks live RPM counters.',
        ],
      },
      {
        id: 'ws2-terraform-starter-resource-graph',
        figure: 'Figure 4',
        title: 'Pattern A 1-Click Terraform Starter: WAF → Cloud Run v2 → Valkey / CMEK → BigQuery OTel',
        talkingPoints: [
          'Illustrates the declarative Terraform resource dependency graph (`2.6-terraform-starter/main.tf`) that provisions Pattern A from 5 input variables.',
          'Zone 1 (Edge Security): Provisions `google_compute_security_policy` (Cloud Armor WAF) to block SQLi/XSS and strip unverified tenant headers.',
          'Zone 3 (Serverless Agent Compute): Deploys `google_cloud_run_v2_service` (ADK 2.0 gateway) bound to least-privilege IAM and KMS encryption.',
          'Zone 4 (Quota & Transactional State): Provisions `google_memorystore_instance` (Valkey HA) and AlloyDB with PostgreSQL Row-Level Security.',
          'Zone 2 (CMEK & FinOps Ledger): Creates `google_kms_crypto_key` (90-day rotation) and `google_bigquery_table` (time-partitioned OTel chargeback sink).',
        ],
      },
    ],
    takeaways: [
      'High-Density Multi-Tenancy Without Compromising Security: Hundreds of commercial tenants can safely share one Cloud Run and AlloyDB footprint when cryptographic tenant context is verified across all 5 hops.',
      'Capture 84.7% Net Inference Savings via Immutable Prefix Caching: Cache shared platform instructions once in Gemini 2.5 Pro ContextCacheConfig (90% discount) while isolating tenant memory in L1–L5 namespaces.',
      'Eliminate Noisy Neighbors with Dual Quota Bulkheads: Pair Memorystore for Valkey token-bucket rate limiters (120 vs. 600 RPM) with per-tier Gemini thinking_budget clamps (4,000 vs. 8,000 tokens).',
      'Prove Isolation Continuously with the 10-Point Breach Suite: Run `run_breach_simulations.py` in CI/CD to verify deterministic HTTP 400/401/403/422/429 enforcement and zero cross-tenant SQL rows.',
      'Graduate Regulated Tenants to Pattern B/C Without Code Rewrites: Keep commercial tenants on Pattern A for maximum gross margin and promote regulated enterprises to dedicated silos via configuration.',
    ],
    takeawaySpecs: [
      {
        stack: 'Single Shared GCP Project • 5-Hop Cryptographic Pipeline • AlloyDB RLS',
        sla: '$42/mo Baseline Unit Cost per Tenant with 100% Logical Isolation',
        tag: 'Takeaway 1: High-Density Zero Trust',
      },
      {
        stack: 'Gemini 2.5 Pro ContextCacheConfig (32,000 Shared Platform Tokens)',
        sla: 'Reduces Billable Input Tokens from 34,000 to 5,200 per Agent Turn (84.7% Savings)',
        tag: 'Takeaway 2: Prefix Cache FinOps',
      },
      {
        stack: 'Memorystore for Valkey (RPM) + Vertex AI thinking_budget (Token Clamp)',
        sla: 'Guarantees Predictable p99 Latency Across Standard & Enterprise Tenants',
        tag: 'Takeaway 3: Dual Quota Bulkheads',
      },
      {
        stack: 'workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py',
        sla: '10/10 Red-Team Attack Vectors Blocked & Logged to BigQuery OTel Audit Trail',
        tag: 'Takeaway 4: Continuous Red-Teaming',
      },
      {
        stack: '80% Reusable Core Engine (core-cymbal-agent/) -> Pattern B & Pattern C',
        sla: 'Zero Application Refactoring Required When Upgrading Tenants to Sovereign Silos',
        tag: 'Takeaway 5: Seamless Tier Evolution',
      },
    ],
    callToAction:
      'Execute the 10-point red-team breach suite (`run_breach_simulations.py`), apply the Pattern A Terraform starter (`2.6-terraform-starter`), and continue to Workstream 3 (Pattern B Sovereign Silos).',
  },

  'blogs/ws3-pattern-b-sovereign-silos.deck.json': {
    workstream: 'WS3',
    deckTitle: 'Pattern B — Zero-Trust Sovereign Silos: Dedicated Projects, VPC-SC & CMEK Kill-Switch (Workstream 3)',
    deckSubtitle:
      'How regulated financial, healthcare, and public-sector enterprises achieve physical Google Cloud project isolation, air-gapped Gemma 3 hosting, and a sub-60-second CMEK kill-switch while reusing 80% of the platform codebase',
    tldr: [
      'Meeting Strict Regulatory Sovereignty Mandates: Banking (OCC/FFIEC), healthcare (HIPAA), and sovereign cloud auditors frequently mandate zero shared compute, zero shared storage, and customer-revocable encryption keys.',
      '80% Reusable ADK Codebase, 20% Dedicated Cloud Perimeter: Pattern B deploys the exact same 5-hop Python ADK 2.0 runtime inside a dedicated per-tenant Google Cloud project (`cymbal-finvault-silo-prod`).',
      'Three Hardware-Enforced Perimeter Walls: Every tenant vault is locked by mTLS + IAM Principal Access Boundaries (PAB), a VPC Service Controls (VPC-SC) perimeter, and dedicated Cloud KMS Customer-Managed Encryption Keys (CMEK).',
      'Sub-60-Second Customer CMEK Kill-Switch (`HTTP 423 Locked`): If a tenant Security Operations Center revokes or disables its Cloud KMS key, all Agent Engine memory, AlloyDB reads, and GKE inference halt immediately with HTTP 423.',
      'Verified 6/6 Sovereign Compliance Suite & Terraform Blueprint: Ships with automated dual-silo security tests (`FinVault` + `RetailStream`), a 4-stage onboarding provisioner, and a 1-click Terraform silo blueprint (`3.6`).',
    ],
    tldrSpecs: [
      {
        stack: 'Dedicated Per-Tenant GCP Project • Zero Shared Compute or Storage',
        sla: 'Satisfies OCC/FFIEC, HIPAA, FedRAMP High & EU DORA Physical Isolation Mandates',
        tag: 'Regulatory Sovereignty',
      },
      {
        stack: 'core-cymbal-agent/ (80% Shared Code) + Dedicated Silo Terraform Wrapper (20%)',
        sla: 'Eliminates Per-Customer Software Forks While Providing Dedicated Cloud Infrastructure',
        tag: 'Single Codebase Architecture',
      },
      {
        stack: 'BeyondCorp mTLS • IAM Principal Access Boundary (PAB) • VPC Service Controls',
        sla: 'Blocks Cross-Tenant Principal Reuse & Cross-Project Data Exfiltration (HTTP 403)',
        tag: '3-Layer Perimeter Defense',
      },
      {
        stack: 'Cloud KMS CMEK (finvault-silo-cmek / medcore-revoked-cmek) • Silo Enforcer',
        sla: 'Deterministic HTTP 423 Locked Across Memory, AlloyDB & GKE Within 60 Seconds',
        tag: 'Customer CMEK Kill-Switch',
      },
      {
        stack: 'workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/',
        sla: '6/6 Sovereign Silo Security & Kill-Switch Assertions Verified Across 2 Tenant Vaults',
        tag: 'Automated Auditor Proof',
      },
    ],
    sections: [
      {
        heading: 'Products used — VPC-SC, IAM PAB, Cloud KMS CMEK & Air-Gapped Gemma 3',
        layout: 'cards',
        bullets: [
          'Wall 1 — mTLS & IAM Principal Access Boundaries (PAB): Every request must present a pinned BeyondCorp client certificate (`cert_sha256`) and pass an IAM PAB rule binding the caller strictly to that tenant’s project.',
          'Wall 2 — VPC Service Controls (VPC-SC) Data Perimeter: Wraps Vertex AI, AlloyDB, Cloud Storage, GKE, and BigQuery inside a service perimeter that blocks unauthorized egress or cross-project copies (HTTP 403).',
          'Wall 3 — Ubiquitous Cloud KMS CMEK Binding: A single tenant-managed Cloud KMS key encrypts AlloyDB tables, Vertex AI Memory Bank state, GKE persistent disks, and BigQuery audit datasets.',
          'Flexible Sovereign Model Hosting: Tenants can run Gemini 2.5 Pro on Provisioned Throughput inside VPC-SC or deploy air-gapped Gemma 3 (27B) on a private GKE GPU node pool (`172.16.0.2/28`, zero public IPs).',
        ],
        specs: [
          {
            stack: 'BeyondCorp Enterprise mTLS + Google Cloud IAM Principal Access Boundary (PAB)',
            sla: 'Neutralizes Stolen Credentials: Principals Cannot Authenticate Outside Their Silo',
            tag: 'Wall 1: Identity & mTLS Boundary',
          },
          {
            stack: 'Google Cloud Access Context Manager + VPC Service Controls (Restricted VIP)',
            sla: 'Blocks All Data Exfiltration to External Projects or Unapproved Buckets (HTTP 403)',
            tag: 'Wall 2: VPC-SC Data Perimeter',
          },
          {
            stack: 'Cloud KMS CryptoKey (90-Day Auto-Rotation + Live Pre-Execution Heartbeat)',
            sla: 'Single Cryptographic Lever Controlling Compute, Memory, Database & Logs',
            tag: 'Wall 3: Unified CMEK Control',
          },
          {
            stack: 'Private GKE Cluster (Gemma 3 27B IT on L4/A100 GPUs) + Vertex AI PT',
            sla: '100% Air-Gapped Model Weights & Prompts Inside the Tenant’s Sovereign VPC',
            tag: 'Sovereign Model Inference',
          },
        ],
      },
      {
        heading: 'Use cases — Regulated Banking, Healthcare & Sovereign Cloud Workloads',
        layout: 'cards',
        bullets: [
          'The Regulated CISO Threat Model: Tier-1 banks and healthcare systems must prove that even an application-layer software bug cannot expose their memory or database rows to another tenant.',
          'Four Non-Negotiable Sovereign Requirements: Zero physical blast radius, cryptographically enforced network non-exfiltration (VPC-SC), customer-controlled KMS kill-switches, and optional air-gapped open-weight models.',
          'Dual Sovereign Vault Verification: Pattern B provisions physically separate Google Cloud projects (`cymbal-finvault-silo-prod` and `cymbal-retailstream-silo-prod`) with zero shared databases or encryption keys.',
          'Preserve Pattern A for Commercial Tiers: Keep standard commercial customers on Pattern A ($42/mo) for 90% shared caching efficiency, and reserve Pattern B ($1,850/mo) for regulated enterprise contracts.',
        ],
        specs: [
          {
            stack: 'Physical Project Isolation • Dedicated VPC • Dedicated AlloyDB & Memory Bank',
            sla: 'Reduces Cross-Tenant Blast Radius to Absolute Zero at the Hypervisor/Project Layer',
            tag: 'Zero Physical Blast Radius',
          },
          {
            stack: 'VPC Service Controls (VPC-SC) • IAM PAB • Cloud KMS CMEK • Air-Gapped GKE',
            sla: 'Hardware & Control-Plane Enforcement Independent of Application Code',
            tag: '4 Sovereign Mandates',
          },
          {
            stack: 'cymbal-finvault-silo-prod (FinVault) • cymbal-retailstream-silo-prod (RetailStream)',
            sla: 'Independent KMS Key Rings, Independent VPC-SC Perimeters & Independent Audit Logs',
            tag: 'Dual-Tenant Silo Parity',
          },
          {
            stack: 'Tiered SaaS Portfolio: Pattern A ($42/mo) + Pattern B ($1,850/mo)',
            sla: 'Aligns Dedicated Infrastructure Spend Directly with Enterprise Contract ACV',
            tag: 'Portfolio Unit Economics',
          },
        ],
      },
      {
        heading: 'Design alternatives — 4-Stage Vault Provisioning, Terraform Blueprint & Economics',
        layout: 'cards',
        bullets: [
          '4-Stage Automated Silo Provisioner: Programmatically creates the dedicated tenant GCP project, enables 8 core APIs, provisions the 90-day rotating Cloud KMS key, and binds VPC-SC + IAM PAB.',
          '1-Click Terraform Silo Blueprint (`3.6-terraform-silo-blueprint`): Deploys the complete sovereign stack—KMS key ring, VPC-SC service perimeter, isolated VPC (`10.30.0.0/20`), and private air-gapped GKE cluster.',
          'Predictable Enterprise Unit Economics ($1,850/mo Floor): Dedicated AlloyDB, VPC-SC, and private GKE nodes establish a clear cost floor designed for $50k–$500k+/year regulated enterprise contracts.',
          'Blending Pattern A and Pattern B into Pattern C: Workstream 4 demonstrates how to front both high-margin Pattern A pools and dedicated Pattern B silos behind one unified SaaS domain.',
        ],
        specs: [
          {
            stack: 'Stage 1: Project/APIs -> Stage 2: Cloud KMS CMEK -> Stage 3: VPC-SC/PAB -> Stage 4: Audit',
            sla: 'Zero-Touch Onboarding Pipeline with Automated 6-Test Compliance Sign-Off',
            tag: '4-Stage Silo Onboarding',
          },
          {
            stack: 'workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint (main.tf, variables.tf)',
            sla: 'Provisions KMS CMEK, Access Context Manager VPC-SC & Private GKE Gemma 3',
            tag: 'Terraform Silo Blueprint',
          },
          {
            stack: 'Dedicated AlloyDB + Private GKE GPU Pool (Optional Add-On) + Dedicated Quota',
            sla: '$1,850/mo Baseline Infrastructure Cost • Zero Noisy-Neighbor Contention',
            tag: 'Sovereign Tier FinOps',
          },
          {
            stack: 'Next Workstream: Pattern C Dynamic Hybrid Router & Private Service Connect',
            sla: 'Connects Central SaaS Hub to Sovereign Spokes via Unidirectional PSC Tunnels',
            tag: 'Bridge to Workstream 4',
          },
        ],
      },
      {
        heading: 'Design considerations — 5-Hop Cryptographic Pipeline Inside a Sovereign Silo',
        layout: 'pipeline',
        pipelineSteps: [
          {
            hop: 'HOP 01',
            stage: 'mTLS & IAM PAB',
            title: 'Client Certificate Pinning & Principal Access Boundary',
            service: 'BeyondCorp mTLS • IAM PAB',
            mechanism:
              'Verifies the caller’s X.509 client certificate SHA-256 fingerprint and evaluates IAM Principal Access Boundary policies before minting a silo-scoped OBO/DPoP token.',
            invariant: 'mTLS cert_sha256 Match + PAB Project == cymbal-{tenant}-silo-prod',
            gate: 'HTTP 401 on Unpinned Cert • HTTP 403 on Cross-Silo Principal',
          },
          {
            hop: 'HOP 02',
            stage: 'Silo Catalog & VPC-SC',
            title: 'Project-Scoped Agent Registry & VPC-SC Ingress Check',
            service: 'Agent Engine Registry • VPC-SC',
            mechanism:
              'Combines VPC Service Controls perimeter validation with Hop 2 Agent Registry filtering so only connectors and agents provisioned inside the tenant silo can resolve.',
            invariant: 'VPC-SC Perimeter Match + Silo-Local MCP & Agent Endpoints',
            gate: 'HTTP 403 VPC_SC_VIOLATION on External Project Resource Call',
          },
          {
            hop: 'HOP 03',
            stage: 'CMEK Liveness & GKE',
            title: 'Pre-Execution KMS Key Heartbeat & Air-Gapped Runtime',
            service: 'Cloud KMS CMEK • Private GKE / ADK',
            mechanism:
              'Polls Cloud KMS CryptoKeyVersion state (`ENABLED` vs. `DISABLED`/`DESTROYED`) prior to hydrating L1–L5 Memory Bank or dispatching inference to private GKE Gemma 3.',
            invariant: 'KMS State == ENABLED • Private GKE Control Plane (172.16.0.2/28)',
            gate: 'HTTP 423 Locked Immediately When Tenant CMEK is Disabled',
          },
          {
            hop: 'HOP 04',
            stage: 'Silo Model Armor',
            title: 'Dedicated In-Perimeter Model Armor & DLP Redaction',
            service: 'Silo Model Armor • Cloud DLP',
            mechanism:
              'Executes tenant-dedicated Model Armor floor templates, regulatory NLC policies (OCC/HIPAA), and Sensitive Data Protection masking inside the tenant’s VPC-SC boundary.',
            invariant: 'Silo-Dedicated Inspection Template + Regulatory NLC Enforcement',
            gate: 'HTTP 400 on Jailbreak • HTTP 422 on Regulatory NLC Breach',
          },
          {
            hop: 'HOP 05',
            stage: 'CMEK AlloyDB & Audit',
            title: 'CMEK-Encrypted AlloyDB Instance & Sovereign Audit Sink',
            service: 'Dedicated AlloyDB • BigQuery CMEK',
            mechanism:
              'Persists relational state in a dedicated CMEK-encrypted AlloyDB instance and writes immutable security and token telemetry to a silo-local BigQuery dataset.',
            invariant: 'Dedicated AlloyDB + Silo BigQuery Encrypted by Tenant KMS Key',
            gate: 'HTTP 423 Storage Halt on Key Revocation • 100% In-Silo Audit',
          },
        ],
        bullets: [
          'Hop 1 — Hardware mTLS & IAM PAB: Validates client certificate fingerprints and blocks any principal attempting to cross into another tenant’s cloud project.',
          'Hop 2 — VPC-SC & Silo Registry: Ensures agent tool discovery and MCP calls cannot egress the tenant’s VPC Service Controls perimeter.',
          'Hop 3 — Live Cloud KMS Heartbeat: Verifies CMEK key state before every turn, halting memory and inference with HTTP 423 Locked within 60 seconds of key revocation.',
          'Hop 4 — Dedicated Model Armor & DLP: Enforces regulatory NLCs and PII redaction using templates hosted inside the tenant’s sovereign project.',
          'Hop 5 — CMEK AlloyDB & BigQuery Audit: Encrypts all relational tables and OTel audit logs with the tenant’s Cloud KMS key.',
        ],
      },
      {
        heading: 'Design considerations — 6-Point Silo & CMEK Kill-Switch Verification Matrix (6/6 PASS)',
        layout: 'table',
        tableHeaders: [
          'Sovereign Test ID & Scenario',
          'Google Cloud Perimeter Control',
          'Simulated Adversarial / SOC Action',
          'Verified Fail-Closed Result (6/6 PASS)',
        ],
        tableColW: [2.45, 2.75, 3.85, 3.483],
        tableRows: [
          [
            'Test 1: mTLS Device Identity\nUnverified Client Certificate',
            'BeyondCorp Enterprise mTLS +\nLoad Balancer Cert Pinning',
            'Caller presents a valid OIDC token for FinVault but omits or spoofs the pinned X.509 client certificate.',
            'Blocked at Hop 1 with `HTTP 401 Unauthorized` (mTLS SHA-256 fingerprint mismatch)',
          ],
          [
            'Test 2: Cross-Silo Principal\nIAM PAB Boundary Violation',
            'Google Cloud IAM Principal Access\nBoundary (PAB Policy)',
            'A FinVault principal attempts to authenticate or invoke an endpoint inside RetailStream’s silo project.',
            'Blocked at Hop 1/2 with `HTTP 403 Forbidden` (IAM PAB project boundary violation)',
          ],
          [
            'Test 3: Data Exfiltration\nCross-Project Bucket Copy',
            'VPC Service Controls (VPC-SC)\nRestricted Service Perimeter',
            'Compromised prompt attempts to copy FinVault AlloyDB/GCS data to `gs://external-attacker-bucket`.',
            'Blocked by VPC-SC with `HTTP 403 VPC_SC_EXFILTRATION_BLOCKED` (`0` bytes egressed)',
          ],
          [
            'Tests 4A & 4B: CMEK Kill-Switch\nFinVault Key Revoke & Restore',
            'Cloud KMS CMEK Heartbeat\n(`finvault-silo-cmek` state check)',
            'FinVault SOC disables its Cloud KMS key during an active incident (4A), then re-enables after clearance (4B).',
            '4A: Immediate `HTTP 423 Locked` across Memory/DB/GKE (<60s) • 4B: `200 OK` cleanly restored',
          ],
          [
            'Test 5: Air-Gapped GKE Inference\nTest 6: RetailStream Silo Parity',
            'Private GKE (`172.16.0.2/28`) +\n`cymbal-retailstream-silo-prod`',
            'Verifies Gemma 3 (27B) air-gapped inference (Test 5) and full CMEK kill-switch parity in RetailStream’s silo (Test 6).',
            'Test 5: Zero public IP egress verified • Test 6: RetailStream `HTTP 423` -> `200 OK` parity PASS',
          ],
        ],
        bullets: [],
        specs: [],
      },
    ],
    diagrams: [
      {
        id: 'ws3-pattern-b-sovereign-silos-architecture',
        figure: 'Figure 1',
        title: 'Pattern B: Zero-Trust Sovereign Silos (VPC-SC, IAM PAB, CMEK & Air-Gapped Gemma 3 on GKE)',
        talkingPoints: [
          'Enterprise callers authenticate at Step 1 with pinned BeyondCorp mTLS certificates and receive a silo-isolated response at Step 7 (or HTTP 423 if CMEK is revoked).',
          'Zone 1 (Silo Ingress & Identity): Validates mTLS device certificates, enforces IAM Principal Access Boundaries, and screens prompts with Model Armor.',
          'Zone 2 (Sovereign Governance Hub): Monitors VPC Service Controls perimeters, polls Cloud KMS CMEK liveness on every turn, and runs all 6 compliance assertions.',
          'Zone 3 (FinVault Sovereign Project): Dedicated GCP project running air-gapped Gemma 3 (27B) on private GKE and CMEK-encrypted AlloyDB/Memory Bank.',
          'Zone 4 (RetailStream Sovereign Project): Dedicated GCP project running Provisioned Throughput Gemini 2.5 Pro and isolated Entra ID / ServiceNow 3LO.',
        ],
      },
      {
        id: 'ws3-multi-project-silo-and-cmek-setup-topology',
        figure: 'Figure 2',
        title: 'Pattern B Provisioning Topology: Org → Per-Tenant Silo Projects, VPC-SC, IAM PAB & CMEK',
        talkingPoints: [
          'Illustrates the 4-stage automated onboarding factory that provisions a physically isolated Google Cloud project for each regulated enterprise tenant.',
          'Zone 1 (Stage 1 — Project & APIs): Creates `cymbal-{tenant}-silo-prod` under the enterprise folder and enables Vertex AI, AlloyDB, GKE, and Cloud KMS.',
          'Zone 2 (Stage 2 — Tenant CMEK): Provisions a dedicated Cloud KMS key ring and 90-day rotating crypto key bound exclusively to the tenant silo.',
          'Zone 3 (Stage 3 — Perimeter Lock): Attaches the IAM Principal Access Boundary and wraps all 8 APIs in a VPC Service Controls perimeter.',
          'Zone 4 (Stage 4 — Live Compliance Gate): Executes the 6-point sovereign security test suite (`6/6 PASS`) before releasing the vault to production traffic.',
        ],
      },
      {
        id: 'ws3-terraform-silo-blueprint-resource-graph',
        figure: 'Figure 3',
        title: 'Pattern B Terraform Resource Graph: KMS CMEK → VPC-SC Perimeter → Sovereign VPC → Private GKE',
        talkingPoints: [
          'Maps the declarative Terraform resource graph (`3.6-terraform-silo-blueprint/main.tf`) parameterized by 5 tenant input variables.',
          'Zone 1 (Cryptographic Root): Provisions `google_kms_key_ring` and `google_kms_crypto_key` with 90-day rotation and service-agent IAM bindings.',
          'Zone 2 (VPC-SC Perimeter): Provisions `google_access_context_manager_service_perimeter` locking down Vertex AI, AlloyDB, GCS, GKE, and BigQuery.',
          'Zone 3 (Isolated Sovereign VPC): Provisions `google_compute_network` and `10.30.0.0/20` subnet with Private Google Access and zero public internet routes.',
          'Zone 4 (Air-Gapped GKE Inference): Deploys `google_container_cluster` (`enable_private_nodes = true`, `/28` master CIDR, CMEK boot/etcd disks) for Gemma 3.',
        ],
      },
    ],
    takeaways: [
      'Deploy Pattern B When Contracts Mandate Physical Isolation or CMEK Kill-Switches: Satisfy banking, healthcare, and public-sector auditors with dedicated projects, VPC-SC, and customer-revocable keys.',
      'Reuse 80% of the Core Agent Codebase Across All Silos: Parameterize project IDs, KMS key URIs, and model endpoints via configuration so engineering maintains a single software release train.',
      'Combine Identity (IAM PAB) and Network (VPC-SC) Perimeters: Pairing Principal Access Boundaries with VPC Service Controls prevents both credential reuse outside the silo and data exfiltration from inside.',
      'Bind Compute, Memory, and Storage to One Tenant CMEK Lever: Validating Cloud KMS key state on every turn guarantees a deterministic sub-60-second HTTP 423 kill-switch across the entire stack.',
      'Certify Every Silo Before Go-Live with Automated Tests: Run `run_silo_security_tests.py` (`6/6 PASS`) during tenant onboarding to hand customer CISOs an auditable verification receipt.',
    ],
    takeawaySpecs: [
      {
        stack: 'Dedicated GCP Project • VPC Service Controls • IAM PAB • Cloud KMS CMEK',
        sla: 'Meets Strictest OCC, HIPAA, FedRAMP & Sovereign Cloud Audit Requirements',
        tag: 'Takeaway 1: Physical Sovereignty',
      },
      {
        stack: 'core-cymbal-agent/ (Shared Python ADK 2.0) + 3.6-terraform-silo-blueprint',
        sla: '80% Code Reuse Across Pooled & Siloed Tiers • Zero Per-Tenant Code Forks',
        tag: 'Takeaway 2: Operational Scale',
      },
      {
        stack: 'BeyondCorp mTLS + IAM Principal Access Boundary + VPC-SC Restricted VIP',
        sla: 'Blocks Both Inbound Credential Spoofing (401/403) & Outbound Exfiltration (403)',
        tag: 'Takeaway 3: Dual Perimeter Lock',
      },
      {
        stack: 'Cloud KMS CryptoKey Live Heartbeat (`finvault-silo-cmek` / `medcore-revoked-cmek`)',
        sla: 'Sub-60-Second Fail-Closed HTTP 423 Halt Across Memory Bank, AlloyDB & GKE',
        tag: 'Takeaway 4: 60s CMEK Kill-Switch',
      },
      {
        stack: 'workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/',
        sla: '6/6 Automated Security & Revocation Assertions Verified Across FinVault & RetailStream',
        tag: 'Takeaway 5: Day-1 CISO Receipt',
      },
    ],
    callToAction:
      'Execute the 6-test sovereign silo suite (`run_silo_security_tests.py`), review the Terraform silo blueprint (`3.6-terraform-silo-blueprint`), and continue to Workstream 4 (Pattern C Dynamic Hybrid).',
  },

  'blogs/ws4-pattern-c-hybrid-dynamic-tiering.deck.json': {
    workstream: 'WS4',
    deckTitle: 'Pattern C — Dynamic Hybrid Hub-and-Spoke, PSC & Zero-Downtime Tier Migration (Workstream 4)',
    deckSubtitle:
      'Unifying high-margin Pooled Standard tenants and sovereign Enterprise spokes behind one SaaS URL using Private Service Connect (PSC) and a 3-phase zero-downtime live tier upgrade engine',
    tldr: [
      'One Unified SaaS Front Door for Every Tier: Pattern C fronts both Standard pooled tenants ($42/mo) and regulated Enterprise sovereign spokes ($1,850/mo) behind a single Global Application Load Balancer URL.',
      'Cryptographic Tier Lookup & Dispatch: Cloud Armor, IAP, and the Cloud Run Hybrid Router inspect the verified OBO/DPoP identity token, query the Firestore routing table, and dispatch traffic per tenant tier.',
      'Unidirectional Private Service Connect (PSC) Bridges: Enterprise requests traverse NAT-based PSC endpoints (`10.10.0.50`) into dedicated spoke projects (`ServiceAttachment`) with zero VPC peering or IP overlap.',
      '3-Phase Zero-Downtime Live Tier Migration (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`): Promotes a live Standard tenant into a dedicated Enterprise PSC spoke mid-conversation without dropping a single turn.',
      '4/4 Automated Migration & Isolation Assertions Verified: Proves 0ms replication lag at cutover, 0 dropped active sessions, immediate 4,000 → 8,000 thinking budget unlock, and zero global state bleed across instances.',
    ],
    tldrSpecs: [
      {
        stack: 'Central Hub Project (cymbal-hybrid-hub-prod) • Global External ALB + Cloud Armor + IAP',
        sla: 'Single SaaS Hostname (`agents.cymbal.cloud`) Serving 10,000+ Multi-Tier Tenants',
        tag: 'Unified SaaS Control Plane',
      },
      {
        stack: 'Firestore Tenant Routing Table • Cross-Project Vertex AI Agent Engine Registry',
        sla: 'Routes Standard -> pool://shared-runtime & Enterprise -> psc://tenant-spoke',
        tag: 'Dynamic Tier Dispatch',
      },
      {
        stack: 'Consumer PSC ForwardingRule (10.10.0.50) -> Producer ServiceAttachment (ACCEPT_MANUAL)',
        sla: 'Unidirectional Hub-to-Spoke NAT • Spokes Reuse 10.40.0.0/20 with 0 CIDR Collisions',
        tag: 'Private Service Connect (PSC)',
      },
      {
        stack: 'pattern_c_hybrid_router_and_migrator.py • 3-Phase Live Tier Upgrade State Machine',
        sla: 'Upgrades Active Standard Tenants to Enterprise Spokes with 0 Dropped Sessions',
        tag: 'Zero-Downtime Tier Promotion',
      },
      {
        stack: 'workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/',
        sla: '4/4 Migration Assertions PASS • Instance-Scoped Profile Mutation (F-09 Verified)',
        tag: 'Automated Cutover Proof',
      },
    ],
    sections: [
      {
        heading: 'Products used — Hub-and-Spoke Control Plane & Private Service Connect (PSC)',
        layout: 'cards',
        bullets: [
          'Central Ingress & Routing Hub (`cymbal-hybrid-hub-prod`): Hosts the Global External ALB, Cloud Armor WAF, IAP OIDC verifier, Cross-Project Agent Registry, and Firestore Tenant Routing Table.',
          'Consumer PSC Endpoint in the Hub (`10.10.0.50`): The Hub VPC (`10.10.0.0/20`) binds an internal Private Service Connect forwarding rule directly to each Enterprise tenant’s spoke ServiceAttachment URI.',
          'Producer ServiceAttachment in Each Spoke (`ACCEPT_MANUAL`): Each Enterprise spoke project exposes its private Cloud Run / GKE agent runtime via a `/24` PSC NAT subnet (`10.40.240.0/24`) whitelisting only the Hub project.',
          'Zero CIDR Overlap & Unidirectional Security: Because PSC performs source NAT at the attachment boundary, all 1,000+ Enterprise spokes can reuse identical `10.40.0.0/20` VPC CIDRs and can never initiate reverse connections into the Hub.',
        ],
        specs: [
          {
            stack: 'Hub VPC: cymbal-pattern-c-hub-vpc (10.10.0.0/20) • Cloud Run Hybrid Router',
            sla: 'Sub-2ms Tier Lookup in Firestore • Enforces Hop 1 OBO/DPoP & Hop 2 Catalog Filter',
            tag: 'Zone 1: Central Routing Hub',
          },
          {
            stack: 'google_compute_address (10.10.0.50) + google_compute_forwarding_rule (PSC Consumer)',
            sla: 'Private Layer-4/7 Tunnel Across Project Boundaries Without Public IP Exposure',
            tag: 'Hub Consumer PSC Endpoint',
          },
          {
            stack: 'google_compute_service_attachment (connection_preference = ACCEPT_MANUAL)',
            sla: 'Explicitly Whitelists Only cymbal-hybrid-hub-prod (Connection Limit = 10)',
            tag: 'Spoke Producer Attachment',
          },
          {
            stack: 'PSC NAT Subnet (cymbal-psc-nat-us-west1 / 10.40.240.0/24) • Identical Spoke CIDRs',
            sla: 'Bypasses 25-Peer VPC Peering Quota & Guarantees One-Way Hub -> Spoke Traffic',
            tag: 'Infinite Spoke Scalability',
          },
        ],
      },
      {
        heading: 'Use cases — Multi-Tier SaaS Serving Both Pooled Standard & Sovereign Enterprise',
        layout: 'cards',
        bullets: [
          'Standard Commercial Tier Profile (RetailStream Baseline): Authenticates via Microsoft Entra ID, runs in the shared Pattern A pool with a 4,000-token thinking cap, and shares an AlloyDB RLS cluster ($42/mo).',
          'Regulated Enterprise Tier Profile (FinVault Spoke): Authenticates via Google Workspace, invokes private Agent Alpha with an 8,000-token budget, and mandates a dedicated CMEK-encrypted spoke project ($1,850/mo).',
          'Why Maintaining Two Separate Products Fails: Operating disconnected Pooled and Siloed platforms doubles CI/CD maintenance, fragments the URL/API surface, and forces offline downtime when customers upgrade tiers.',
          'The Pattern C Solution (Route Isolation, Not Product Duplication): Centralizes identity, WAF, and routing in a shared Hub while dynamically dispatching execution to the shared pool or dedicated PSC spokes.',
        ],
        specs: [
          {
            stack: 'Route: pool://cymbal-shared-pooled-runtime-v2 • AlloyDB RLS • 90% Prefix Cache',
            sla: 'Tier: STANDARD • 120 RPM • 4,000 Thinking Tokens • $42/mo Unit Cost',
            tag: 'Standard Pooled Tier',
          },
          {
            stack: 'Route: psc://finvault-agent-spoke-psc • Dedicated VPC-SC & CMEK Vault',
            sla: 'Tier: ENTERPRISE • 600 RPM • 8,000 Thinking Tokens • $1,850/mo Dedicated SLA',
            tag: 'Enterprise Sovereign Spoke',
          },
          {
            stack: 'Single 80% Reusable ADK 2.0 Codebase • Unified Public Domain & OAuth Redirects',
            sla: 'Eliminates Dual-Product Engineering Overhead & Customer Re-Onboarding Friction',
            tag: 'Zero Product Fragmentation',
          },
          {
            stack: 'Firestore Per-Tenant Routing Metadata (`isolation_pattern`, `target_endpoint`)',
            sla: 'Turns Standard -> Enterprise Upsells into an Instant Software-Defined Flip',
            tag: 'Frictionless Revenue Expansion',
          },
        ],
      },
      {
        heading: 'Design alternatives — Terraform Hybrid PSC Blueprint & Portfolio FinOps',
        layout: 'cards',
        bullets: [
          'Dual-Provider Terraform Blueprint (`4.6-terraform-hybrid-psc-blueprint`): Uses `google.hub` and `google.spoke` provider aliases to wire the Hub VPC, Spoke `/24` PSC NAT subnet, Producer ServiceAttachment, and Consumer Endpoint.',
          'Instance-Scoped Profile Mutation (`Forensic Check F-09`): Deep-copies tenant profiles per runtime instance so live tier upgrades never mutate global module state or bleed across concurrent test suites.',
          '90-Minute Hands-On Hybrid Codelab (`4.4-hands-on-codelab.md`): Walks architects through building the Firestore tier router, establishing the unidirectional PSC bridge, and executing a live mid-session tier upgrade.',
          'Blended Portfolio Economics (74% Total Cloud Savings): Combines 90% shared caching margins on 950 Standard tenants with dedicated sovereign SLAs on 50 Enterprise tenants behind one unified SaaS brand.',
        ],
        specs: [
          {
            stack: 'workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf',
            sla: 'Outputs `spoke_psc_service_attachment_uri` & `hub_psc_consumer_ip` (10.10.0.50)',
            tag: 'Terraform PSC Automation',
          },
          {
            stack: 'core-cymbal-agent/runtime_pipeline.py • copy.deepcopy(TENANT_PROFILES)',
            sla: 'Forensic Check F-09 PASS: Zero Global State Bleed During Live Tier Upgrades',
            tag: 'Thread-Safe State Isolation',
          },
          {
            stack: 'workstream-4-pattern-c-hybrid/4.4-hands-on-codelab.md & 4.5 Migration Suite',
            sla: 'Verifies All 4 Live Migration Gates (`SHADOW_SYNC` -> `DRAIN_AND_VERIFY`)',
            tag: 'Hands-On Codelab & Demo',
          },
          {
            stack: '950 Standard Pooled Tenants ($42/mo) + 50 Enterprise PSC Spokes ($1,850/mo)',
            sla: '74% Lower Total Cloud Spend vs. All-Siloed • 99.99% Enterprise Uptime SLA',
            tag: 'Portfolio FinOps Impact',
          },
        ],
      },
      {
        heading: 'Design considerations — 5-Hop Pipeline Across Hybrid Pooled & PSC Paths',
        layout: 'pipeline',
        pipelineSteps: [
          {
            hop: 'HOP 01',
            stage: 'Hub Ingress & Tier',
            title: 'Edge WAF, OBO/DPoP Minting & Firestore Tier Lookup',
            service: 'Cloud Armor • IAP • Firestore Router',
            mechanism:
              'Strips spoofed headers at the Hub ALB, verifies Workspace or Entra ID OIDC tokens, and resolves the tenant’s live routing descriptor (`POOLED` vs. `PSC_SPOKE`) from Firestore.',
            invariant: 'Signed JWT tenant_id -> Firestore Route (pool:// vs. psc://)',
            gate: 'HTTP 401 on Spoofed Header • Zero Client-Controlled Route Override',
          },
          {
            hop: 'HOP 02',
            stage: 'Federated Catalog',
            title: 'Cross-Project Agent Engine Registry & Tool Filtering',
            service: 'Federated Agent Engine Registry',
            mechanism:
              'Merges shared pooled capabilities and tenant-owned PSC spoke agents into a single discovery view while hiding Enterprise-only agents from Standard callers.',
            invariant: 'Visibility Filter Across Hub & Spoke Agent Descriptors',
            gate: 'HTTP 403 on Cross-Tenant or Unlicensed Tier Tool Discovery',
          },
          {
            hop: 'HOP 03',
            stage: 'Tiered Dispatch',
            title: 'Pooled Runtime (4k Cap) vs. Unidirectional PSC Spoke (8k Cap)',
            service: 'Shared Cloud Run vs. PSC Spoke',
            mechanism:
              'Dispatches Standard turns to the shared pool (120 RPM, 4k thinking cap) and tunnels Enterprise turns across `10.10.0.50` into the dedicated PSC spoke (600 RPM, 8k cap).',
            invariant: 'Standard: 4k/120 RPM Pool • Enterprise: 8k/600 RPM PSC Spoke',
            gate: 'Unidirectional PSC NAT Prevents Spoke-to-Hub Lateral Movement',
          },
          {
            hop: 'HOP 04',
            stage: 'Tiered Guardrails',
            title: 'Pooled Model Armor Floor vs. Spoke Custom Regulatory DLP',
            service: 'Model Armor • Sensitive Data Protection',
            mechanism:
              'Applies baseline prompt-injection and PCI screening in the shared pool while executing custom regulatory NLCs (OCC/HIPAA) and dedicated DLP templates inside each spoke.',
            invariant: 'Per-Tier Safety Templates + Egress IBAN/SWIFT/PAN Redaction',
            gate: 'HTTP 400 on Prompt Injection • HTTP 422 on Regulatory NLC Breach',
          },
          {
            hop: 'HOP 05',
            stage: 'State & Live Sync',
            title: 'AlloyDB RLS / CMEK Spoke Vault & CDC Shadow Replication',
            service: 'AlloyDB RLS • CMEK Spoke • Datastream',
            mechanism:
              'Isolates Standard rows via AlloyDB RLS, isolates Enterprise state in CMEK spoke databases, and streams CDC state during live tier promotions with unified BigQuery OTel billing.',
            invariant: 'Pooled RLS <-> Spoke CMEK Vault • 0ms Lag CDC Cutover',
            gate: '0 Unauthorized Rows • HTTP 423 on Spoke CMEK Revocation',
          },
        ],
        bullets: [
          'Hop 1 — Central Hub Authentication & Tier Resolution: Verifies OIDC identity at the Hub edge and looks up the authoritative pool:// or psc:// route in Firestore.',
          'Hop 2 — Cross-Project Federated Agent Catalog: Resolves shared tools and private spoke agents while enforcing strict tenant visibility.',
          'Hop 3 — Tiered Compute & PSC Dispatch: Routes Standard tenants to the shared 4k-cap pool and tunnels Enterprise tenants over Private Service Connect to their 8k-cap spoke.',
          'Hop 4 — Tiered Model Armor & DLP: Enforces shared safety floors in the pool and custom regulatory NLC/DLP policies inside each Enterprise spoke.',
          'Hop 5 — Hybrid Storage & Unified FinOps: Pairs pooled AlloyDB RLS and dedicated CMEK spoke databases with continuous BigQuery OTel chargeback.',
        ],
      },
      {
        heading: 'Design considerations — Zero-Downtime Live Tier Migration Protocol (4/4 PASS)',
        layout: 'table',
        tableHeaders: [
          'Migration Phase & Test Gate',
          'Control Plane & Infrastructure Action',
          'Data, Session & Quota State Transition',
          'Verified SLA & Assertion (4/4 PASS)',
        ],
        tableColW: [2.45, 3.25, 3.65, 3.183],
        tableRows: [
          [
            'Baseline (Pre-Upgrade)\nTest 1: Dual-Tier Routing',
            'RetailStream (`STANDARD`) and FinVault (`ENTERPRISE`) send concurrent turns through the Hub Router.',
            'RetailStream routes to `pool://shared-runtime` (4,000 token cap); FinVault routes via `psc://finvault-spoke` (8,000 cap).',
            'Test 1 PASS: Verified deterministic tier routing & quota clamping prior to migration',
          ],
          [
            'Phase 1: SHADOW_SYNC\nTest 2: Spoke Provision & CDC',
            'Terraform provisions `cymbal-retailstream-silo-prod`, KMS CMEK, and PSC ServiceAttachment (`ACCEPT_MANUAL`).',
            'Background CDC replicates RetailStream’s AlloyDB RLS rows and L1–L5 Memory Bank into the new CMEK spoke.',
            'Test 2 PASS: `replication_lag_ms == 0` and PSC connection status `ACCEPTED` before cutover',
          ],
          [
            'Phase 2: ATOMIC_CUTOVER\nTest 3: Firestore Route Flip',
            'Single atomic transaction in Firestore updates RetailStream’s profile from `POOLED` to `HYBRID_PSC_SPOKE`.',
            'Atomically binds `psc://retailstream-agent-spoke-psc`, `agent-memory-cmek`, 600 RPM, and 8,000 thinking budget.',
            'Test 3 PASS: Sub-10ms atomic route flip with instance-scoped isolation (0 global state bleed)',
          ],
          [
            'Phase 3: DRAIN_AND_VERIFY\nTest 4: Mid-Session Continuity',
            'In-flight pooled turn completes gracefully while the next turn on the same `session_id` hits the Hub Router.',
            'Active conversation `sess-live-upgrade-99` seamlessly routes across PSC into the new CMEK spoke.',
            'Test 4 PASS: `dropped_sessions == 0`, 8,000 thinking budget active, CMEK encryption verified',
          ],
        ],
        bullets: [
          'Phase 1 (`SHADOW_SYNC`): Provisions the target Enterprise spoke project, Cloud KMS key, and PSC attachment while streaming AlloyDB RLS rows and L1–L5 Memory Bank state to 0ms replication lag.',
          'Phase 2 (`ATOMIC_CUTOVER`): Executes a single atomic Firestore transaction flipping the tenant’s route from `pool://` to `psc://`, unlocking the 8,000-token budget and CMEK binding simultaneously.',
          'Phase 3 (`DRAIN_AND_VERIFY`): Drains any in-flight pooled turn without interruption and routes the very next message in the same active `session_id` into the dedicated PSC spoke (`0` dropped sessions).',
        ],
        specs: [
          {
            stack: 'Terraform Spoke Provisioner + Continuous CDC Replication (AlloyDB + Memory Bank)',
            sla: 'Converges to replication_lag_ms == 0 While Tenant Continues Chatting in Pool',
            tag: 'Phase 1: Shadow Sync',
          },
          {
            stack: 'Firestore Transactional Update (`pattern_c_hybrid_router_and_migrator.py`)',
            sla: 'Flips Route, Quota (120->600 RPM), Budget (4k->8k) & CMEK Atomically',
            tag: 'Phase 2: Atomic Cutover',
          },
          {
            stack: 'Graceful Cloud Run Connection Drain + Session ID Continuity (`sess-live-upgrade-99`)',
            sla: '4/4 Migration Suite Assertions PASS • Zero Re-Authentication Required',
            tag: 'Phase 3: Drain & Verify',
          },
        ],
      },
    ],
    diagrams: [
      {
        id: 'ws4-pattern-c-hybrid-psc-and-migration',
        figure: 'Figure 1',
        title: 'Pattern C: Dynamic Hybrid Hub-and-Spoke, Private Service Connect & Live Tier Migration',
        talkingPoints: [
          'Standard and Enterprise tenants connect to one unified SaaS URL at Step 1 and receive a tier-isolated response at Step 7 (`0` dropped sessions).',
          'Zone 1 (Central Routing Hub): Cloud Armor, IAP OBO/DPoP, Federated Agent Registry, and Firestore Route Table resolve each tenant’s live tier.',
          'Zone 2 (Zero-Downtime Migration Engine): Orchestrates Phase 1 `SHADOW_SYNC` (0ms lag), Phase 2 `ATOMIC_CUTOVER`, and Phase 3 `DRAIN_AND_VERIFY` (`4/4 PASS`).',
          'Zone 3 (Pattern A Shared Pooled Spoke): Serves Standard tenants with a 4,000-token cap, 90% shared prefix cache, and AlloyDB RLS while streaming CDC state.',
          'Zone 4 (Pattern B Dedicated PSC Spoke): Serves Enterprise tenants across unidirectional Private Service Connect (`10.10.0.50`) with an 8,000-token budget and CMEK.',
        ],
      },
      {
        id: 'ws4-hub-and-spoke-demo-env-setup-topology',
        figure: 'Figure 2',
        title: 'Pattern C Demo Environment: Central Ingress Hub, Shared Pool & PSC ServiceAttachment Spokes',
        talkingPoints: [
          'One central Hub project (`cymbal-hybrid-hub-prod`, `10.10.0.0/20`) fronts both tiers behind a single Global External Application Load Balancer.',
          'Zone 1 (Hub Tier Router): Reads verified OBO/DPoP claims and dispatches Standard to `pool://shared-runtime` and Enterprise to `psc://10.10.0.50`.',
          'Zone 2 (PSC Consumer & Migration Control): Binds internal IP `10.10.0.50` to the spoke’s `ServiceAttachment` URI and tracks Firestore cutover state.',
          'Zone 3 (Pooled Runtime Environment): Hosts high-density commercial tenants with Memorystore Valkey rate bulkheads and AlloyDB Row-Level Security.',
          'Zone 4 (Producer PSC Spoke Project): Dedicated `/24` PSC NAT subnet (`10.40.240.0/24`) + `finvault-agent-spoke-psc` (`ACCEPT_MANUAL`, hub limit = 10).',
        ],
      },
      {
        id: 'ws4-zero-downtime-tier-upgrade-sequence',
        figure: 'Figure 3',
        title: 'Zero-Downtime Tier Upgrade Sequence: SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY (4/4 PASS)',
        talkingPoints: [
          'Traces the 4 automated assertions in `run_tier_migration_suite.py` as RetailStream upgrades live from Standard (Pooled) to Enterprise (PSC Spoke).',
          'Zone 1 (Pre- & Post-Cutover Router): Routes `sess-live-upgrade-99` to the shared pool before cutover and seamlessly to the PSC spoke on the next turn.',
          'Zone 2 (3-Phase Migration Coordinator): Verifies `replication_lag_ms == 0` in Phase 1, flips Firestore atomically in Phase 2, and confirms `0` dropped sessions in Phase 3.',
          'Zone 3 (Source Pooled Runtime): Drains RetailStream’s in-flight 4,000-token turn cleanly while streaming L1–L5 memory and AlloyDB RLS rows.',
          'Zone 4 (Target Enterprise PSC Spoke): Takes over `sess-live-upgrade-99` immediately with an 8,000-token thinking budget, 600 RPM, and dedicated KMS CMEK.',
        ],
      },
      {
        id: 'ws4-terraform-hybrid-psc-blueprint-resource-graph',
        figure: 'Figure 4',
        title: 'Pattern C Terraform PSC Resource Graph: Hub VPC → Consumer Endpoint → Spoke ServiceAttachment',
        talkingPoints: [
          'Illustrates the dual-provider Terraform module (`4.6-terraform-hybrid-psc-blueprint/main.tf`) that wires cross-project Private Service Connect.',
          'Zone 1 (`google.hub` Network): Provisions `cymbal-pattern-c-hub-vpc` and `10.10.0.0/20` subnet with Private Google Access enabled.',
          'Zone 3 (`google.spoke` NAT & Producer): Provisions spoke VPC (`10.40.0.0/20`), `PSC_NAT` subnet (`10.40.240.0/24`), and `google_compute_service_attachment`.',
          'Zone 4 (`google.hub` Consumer Bridge): Reserves internal IP `10.10.0.50` and binds `google_compute_forwarding_rule` directly to the spoke attachment.',
          'Zone 2 (Firestore Output Binding): Exports `spoke_psc_service_attachment_uri` and `hub_psc_consumer_ip` directly into the Firestore routing table.',
        ],
      },
    ],
    takeaways: [
      'Route Isolation Instead of Duplicating Products: Serve every customer tier behind one unified SaaS domain and control plane while dispatching requests dynamically to pooled or sovereign boundaries.',
      'Bind Tier Routing Strictly to Cryptographic Identity: Derive routing decisions exclusively from the Hop 1 OBO/DPoP token and Firestore routing table so callers can never spoof headers to access Enterprise spokes.',
      'Scale to 1,000+ Enterprise Spokes with Private Service Connect: NAT-based PSC ServiceAttachments eliminate VPC peering quotas, allow identical spoke CIDRs (`10.40.0.0/20`), and enforce one-way hub-to-spoke calls.',
      'Turn Tier Upgrades into a Zero-Downtime Self-Service Feature: Use the 3-phase migration state machine (`SHADOW_SYNC` → `ATOMIC_CUTOVER` → `DRAIN_AND_VERIFY`) to promote live sessions without dropping a single turn.',
      'Isolate Runtime Profile State per Instance: Deep-copy tenant routing profiles per engine instance (`F-09`) so dynamic tier promotions never cause cross-tenant configuration bleed.',
    ],
    takeawaySpecs: [
      {
        stack: 'Unified Hub ALB + Firestore Tier Router + Pooled & PSC Spoke Runtimes',
        sla: 'Single SaaS Codebase & URL Serving Both $42/mo Standard & $1,850/mo Enterprise Tiers',
        tag: 'Takeaway 1: Unified Hybrid Control Plane',
      },
      {
        stack: 'Hop 1 Cloud Armor + IAP OBO/DPoP + Firestore Authoritative Route Lookup',
        sla: '100% Immune to Client Header Spoofing or Unauthorized Spoke Routing',
        tag: 'Takeaway 2: Cryptographic Tier Routing',
      },
      {
        stack: 'Consumer ForwardingRule (10.10.0.50) -> Producer ServiceAttachment (ACCEPT_MANUAL)',
        sla: 'Zero VPC Peering Limits • Zero CIDR Overlap • Unidirectional Hub -> Spoke Security',
        tag: 'Takeaway 3: Scalable PSC Architecture',
      },
      {
        stack: '3-Phase Migrator: SHADOW_SYNC (0ms Lag) -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY',
        sla: '4/4 Automated Migration Tests PASS • 0 Dropped Active User Conversations',
        tag: 'Takeaway 4: Live Tier Promotion',
      },
      {
        stack: 'workstream-4-pattern-c-hybrid/4.3-solution-implementation/ & Check F-09',
        sla: 'Verified Instance-Scoped Profile Mutation with Zero Global State Contamination',
        tag: 'Takeaway 5: Production State Hygiene',
      },
    ],
    callToAction:
      'Run the 4-test zero-downtime migration suite (`run_tier_migration_suite.py`), deploy the Terraform PSC blueprint (`4.6`), and continue to Workstream 5 (Executive Decision Guide & Agentic Triad).',
  },

  'blogs/ws5-decision-guide-and-agentic-triad.deck.json': {
    workstream: 'WS5',
    deckTitle: 'Pooled, Siloed, or Hybrid? Executive Decision Guide & Multi-Tenant Agentic Triad (Workstream 5)',
    deckSubtitle:
      'Workstream 5 capstone: 2-question topology decision tree, side-by-side Well-Architected comparison matrix, 1,000-tenant FinOps TCO model, and 10-week production rollout roadmap',
    tldr: [
      'Two Architectural Questions Select Your Pattern: First evaluate whether 100% of tenants legally require dedicated cloud projects (Pattern B); second evaluate whether you sell one uniform tier (Pattern A) or multiple tiers (Pattern C).',
      'One 80% Reusable 5-Hop Codebase: Engineering writes the 5-hop ADK 2.0 security and governance pipeline once; Patterns A, B, and C merely parameterize the surrounding Google Cloud isolation boundary.',
      'The Multi-Tenant Agentic Triad: Sustainable enterprise AI platforms balance three interdependent pillars—Zero-Trust Cryptographic Security, Predictable Unit Economics, and Zero-PII FinOps Chargeback.',
      'Proven 1,000-Tenant Portfolio Economics: Across 950 Standard and 50 Enterprise tenants, Pattern C reduces Gemini 2.5 Pro input token spend by 84.7%, lowers total cloud TCO by 74% vs. all-siloed, and maintains a 99.99% SLA.',
      'Phased 10-Week Production Rollout: Launch Pattern A Pooled in Weeks 1–4, add Pattern B Sovereign Silos in Weeks 5–7, and enable Pattern C Dynamic Hybrid PSC routing and live migration in Weeks 8–10.',
    ],
    tldrSpecs: [
      {
        stack: 'Q1: Regulatory Silo Mandate? (Yes -> B) • Q2: Multi-Tier Packaging? (No -> A, Yes -> C)',
        sla: 'Deterministic Mapping from Legal/Product Requirements to Cloud Topology',
        tag: '2-Question Decision Tree',
      },
      {
        stack: 'core-cymbal-agent/ (Python ADK 2.0) • 5-Hop Security Pipeline • Terraform (2.6, 3.6, 4.6)',
        sla: '80% Identical Application Code Across Pooled, Siloed & Hybrid Deployments',
        tag: 'Unified Engineering Leverage',
      },
      {
        stack: 'Pillar 1: 5-Hop Zero Trust • Pillar 2: 90% Cache & Quotas • Pillar 3: BigQuery OTel',
        sla: 'Eliminates the False Trade-Off Between CISO Security and CFO Gross Margin',
        tag: 'Multi-Tenant Agentic Triad',
      },
      {
        stack: '950 Standard Pooled ($42/mo) + 50 Enterprise PSC Spokes ($1,850/mo)',
        sla: '74% Lower Total Cloud Spend vs. 1,000 Silos • 84.7% Net Token Cost Reduction',
        tag: '1,000-Tenant FinOps Model',
      },
      {
        stack: 'Weeks 1–4: Pattern A • Weeks 5–7: Pattern B • Weeks 8–10: Pattern C + Live Migrator',
        sla: '12/12 Forensic Gates & 20/20 Automated Simulations Verified at Every Milestone',
        tag: '10-Week Execution Roadmap',
      },
    ],
    sections: [
      {
        heading: 'Products used — Unified 5-Hop Module Mapping Across Patterns A, B & C',
        layout: 'table',
        tableHeaders: [
          '5-Hop Runtime Module (80% Shared)',
          'Pattern A: High-Density Pooled (WS2)',
          'Pattern B: Sovereign Silos (WS3)',
          'Pattern C: Dynamic Hybrid PSC (WS4)',
        ],
        tableColW: [2.4, 3.3, 3.4, 3.433],
        tableRows: [
          [
            'Hop 1: Edge & Identity\n`Hop1EdgeAndIdentity`',
            'Cloud Armor WAF + IAP OIDC + IAM STS RFC 8693 OBO & RFC 9449 DPoP',
            'BeyondCorp mTLS cert pinning + IAM Principal Access Boundary (PAB) per silo',
            'Hub ALB OIDC/DPoP verification + Firestore authoritative route lookup',
          ],
          [
            'Hop 2: Registry Discovery\n`Hop2AgentRegistryDiscovery`',
            'Shared Agent Engine Registry filtered by `tenant_id` visibility predicate',
            'Silo-local Agent Registry wrapped inside per-tenant VPC-SC perimeter',
            'Federated Hub-and-Spoke Agent Registry across Pool & PSC Spokes',
          ],
          [
            'Hop 3: Runtime & Memory\n`Hop3RuntimeAndMemory`',
            'Shared Cloud Run v2 + Valkey RPM (`120`/`600`) + L1–L5 Memory namespaces',
            'Live Cloud KMS CMEK heartbeat (`HTTP 423`) + private GKE Gemma 3 (27B)',
            'Tiered dispatch: `pool://` (`4k` cap) vs. unidirectional `psc://10.10.0.50` (`8k` cap)',
          ],
          [
            'Hop 4: Safety & DLP\n`Hop4ModelArmorAndDlp`',
            'Shared Model Armor floor + tenant semantic NLCs + Cloud DLP PII masking',
            'In-perimeter silo Model Armor & regulatory NLC templates (OCC/HIPAA)',
            'Shared pool safety floor for Standard; dedicated spoke DLP/NLCs for Enterprise',
          ],
          [
            'Hop 5: Data & FinOps\n`Hop5DataAndFinOps`',
            'Shared AlloyDB `FORCE ROW LEVEL SECURITY` + BigQuery OTel token ledger',
            'Dedicated CMEK-encrypted AlloyDB + silo-local BigQuery audit dataset',
            'Pooled RLS + CMEK spoke vault + 3-phase zero-downtime CDC live migrator',
          ],
        ],
        bullets: [],
        specs: [],
      },
      {
        heading: 'Use cases — 2-Question Topology Decision Tree (Patterns A, B & C)',
        layout: 'cards',
        bullets: [
          'Decision Gate 1 — Universal Regulatory Sovereignty Mandate: Do 100% of your customers legally require dedicated GCP projects, VPC Service Controls, and customer-revocable CMEK kill-switches? If YES, standardize on Pattern B.',
          'Decision Gate 2 — Single-Tier vs. Multi-Tier SaaS Packaging: If not all customers require physical silos, do you sell a single commercial tier or both Standard and Enterprise tiers? Choose Pattern A for one tier, or Pattern C for both.',
          'Non-Destructive Architectural Evolution: Launching on Pattern A in Week 4 never creates technical debt—you evolve into Pattern C in Week 10 by attaching Private Service Connect spokes without rewriting your agent.',
          'Built-In Mid-Contract Upsell Engine: Only Pattern C embeds the 3-phase zero-downtime migration state machine that promotes a live Standard tenant into a dedicated Enterprise spoke without dropping active sessions.',
        ],
        specs: [
          {
            stack: 'Mandate: OCC / HIPAA / FedRAMP High / Sovereign Cloud Across 100% of Tenants',
            sla: 'Select Pattern B (Zero-Trust Sovereign Silos) • $1,850/mo Baseline Floor',
            tag: 'Gate 1: Yes -> Pattern B',
          },
          {
            stack: 'Uniform Commercial B2B SaaS -> Pattern A • Multi-Tier Enterprise SaaS -> Pattern C',
            sla: 'Select Pattern A ($42/mo Pool) or Pattern C (Blended Pool + PSC Spokes)',
            tag: 'Gate 2: Pattern A vs. Pattern C',
          },
          {
            stack: 'Shared 5-Hop Runtime Interface (`core-cymbal-agent/runtime_pipeline.py`)',
            sla: 'Add PSC ServiceAttachment Spokes Declaratively via Terraform (`4.6`)',
            tag: 'Zero-Rewrite Evolution',
          },
          {
            stack: 'SHADOW_SYNC (0ms Lag) -> ATOMIC_CUTOVER (Firestore) -> DRAIN_AND_VERIFY',
            sla: 'Turns Enterprise Tier Upgrades into a Same-Day Automated Product Capability',
            tag: 'Live Tier Promotion',
          },
        ],
      },
      {
        heading: 'Design alternatives — Multi-Tenant Topology Comparison Matrix (A, B & C)',
        layout: 'table',
        tableHeaders: [
          'Evaluation Criterion',
          'Pattern A: High-Density Pooled (WS2)',
          'Pattern B: Sovereign Silos (WS3)',
          'Pattern C: Dynamic Hybrid PSC (WS4)',
        ],
        tableColW: [2.25, 3.35, 3.45, 3.483],
        tableRows: [
          [
            'Tenant Isolation & Network Boundary',
            'Logical isolation in 1 shared GCP project via signed OBO/DPoP JWTs & AlloyDB RLS',
            'Physical isolation in dedicated per-tenant GCP projects with VPC-SC & IAM PAB',
            'Central Ingress Hub + Shared Pool (Std) + Unidirectional PSC Spokes (Ent)',
          ],
          [
            'Model Hosting & Prefix Caching',
            'Shared Gemini 2.5 Pro with 90% ContextCacheConfig discount (4k/8k token caps)',
            'Dedicated Gemini 2.5 Pro PT or air-gapped Gemma 3 (27B) on private GKE GPUs',
            '90% shared prefix cache for Standard pool; dedicated PT / Gemma 3 in Enterprise spokes',
          ],
          [
            'Encryption Sovereignty & Kill-Switch',
            'Project/envelope KMS encryption + L1–L5 Memory Bank namespace separation',
            'Dedicated tenant Cloud KMS CMEK with <60s `HTTP 423` kill-switch across all stores',
            'Pooled RLS for Standard; dedicated CMEK kill-switch + 0ms live upgrade for Enterprise',
          ],
          [
            '1,000-Tenant Portfolio Monthly TCO',
            '`$42,000 / mo` (1,000 Pooled tenants @ `$42/mo`; `84.7%` net token cost reduction)',
            '`$1,850,000 / mo` (1,000 Dedicated Silo projects @ `$1,850/mo` sovereign floor)',
            '`$132,400 / mo` (950 Pooled + 50 PSC Spokes -> `74%` lower TCO vs. all-siloed)',
          ],
          [
            'Automated Verification Gate',
            '`10/10 PASS` (`run_breach_simulations.py` — header spoof, ARD, NLC, DLP, RLS)',
            '`6/6 PASS` (`run_silo_security_tests.py` — mTLS, PAB, VPC-SC, HTTP 423 CMEK)',
            '`4/4 PASS` (`run_tier_migration_suite.py` — 0ms CDC lag, 0 dropped sessions)',
          ],
        ],
        bullets: [],
        specs: [],
      },
      {
        heading: 'Design considerations — Multi-Tenant Agentic Triad (Security, FinOps & OTel)',
        layout: 'cards',
        bullets: [
          'Triad Pillar 1 — Zero-Trust Cryptographic Tenant Security: Enforces non-bypassable identity, tool discovery, memory namespace, prompt safety, and SQL RLS boundaries so tenant assets never commingle.',
          'Triad Pillar 2 — Predictable Unit Economics & Quota Bulkheads: Combines 90% Gemini 2.5 Pro shared prefix caching discounts with Memorystore for Valkey RPM rate limiters and per-tier thinking token caps.',
          'Triad Pillar 3 — Privacy-Safe FinOps Chargeback Telemetry: Streams zero-PII OpenTelemetry spans (`tenant_id`, `cached_tokens`, `thinking_tokens`, `silo_cmek_verify_ms`) into BigQuery for 3-model billing.',
          '1,000-Tenant Portfolio Financial Proof: Across 950 Standard and 50 Enterprise tenants, the Agentic Triad saves $1.58M/year in cloud infrastructure and reduces per-turn LLM token costs by 84.7%.',
        ],
        specs: [
          {
            stack: 'Cloud Armor • IAP (RFC 8693/9449) • Agent Registry • Model Armor • AlloyDB RLS',
            sla: '0 Cross-Tenant Data, Tool, Cache or Memory Leaks Across All 20 Simulations',
            tag: 'Pillar 1: Zero-Trust Security',
          },
          {
            stack: 'Gemini 2.5 Pro ContextCacheConfig (90% Discount) • Valkey RPM • Thinking Caps',
            sla: 'Caps Worst-Case Tenant Token Spend & Protects Shared Pool p99 Latency',
            tag: 'Pillar 2: Unit Economics',
          },
          {
            stack: 'OpenTelemetry Collector -> BigQuery (`cymbal_finops_telemetry.tenant_token_ledger`)',
            sla: 'Powers Token-Pass-Through, Tiered-Subscription & Outcome-Based Chargeback SQL',
            tag: 'Pillar 3: Zero-PII FinOps',
          },
          {
            stack: '950 Pooled ($39.9k/mo) + 50 Spokes ($92.5k/mo) = $132.4k/mo vs. $1.85M/mo All-Silo',
            sla: 'Delivers 82%+ Blended SaaS Gross Margin with Full Regulatory Compliance',
            tag: 'Portfolio Financial Impact',
          },
        ],
      },
      {
        heading: 'Design considerations — Invariant 5-Hop Pipeline Across All Three Patterns',
        layout: 'pipeline',
        pipelineSteps: FIVE_HOP_PIPELINE_STEPS,
        bullets: [
          'Hop 1 — Edge WAF & Identity Binding: Cloud Armor and IAP/STS mint a DPoP-bound TenantSecurityContext across Pooled, Siloed, and Hybrid deployments.',
          'Hop 2 — Registry Discovery Filtering: Vertex AI Agent Engine Registry filters shared and private agents by tenant visibility before prompt assembly.',
          'Hop 3 — Sandboxed Runtime, Memory & Quotas: Enforces L1–L5 Memory Bank namespaces, Valkey RPM bulkheads, and 4k/8k thinking budgets (plus CMEK heartbeat in Silos).',
          'Hop 4 — Bidirectional Model Armor & DLP: Blocks prompt injection (400) and semantic NLC violations (422) while masking egress IBAN/SWIFT/PAN PII.',
          'Hop 5 — Transactional RLS, CMEK & FinOps: Enforces AlloyDB Row-Level Security or dedicated CMEK spoke storage and logs zero-PII OTel spans to BigQuery.',
        ],
      },
      {
        heading: 'What’s next — 10-Week Production Rollout Roadmap & EAP Backlog',
        layout: 'cards',
        bullets: [
          'Weeks 1–4 (Milestone 1 — Pattern A Pooled Launch): Deploy `core-cymbal-agent/`, enable Gemini 2.5 Pro 90% prefix caching, configure AlloyDB RLS, and pass all 10 red-team breach simulations.',
          'Weeks 5–7 (Milestone 2 — Pattern B Sovereign Silos): Automate the 4-stage silo onboarding pipeline (`3.6-terraform-silo-blueprint`), bind VPC-SC + IAM PAB + CMEK kill-switches, and pass all 6 silo tests.',
          'Weeks 8–10 (Milestone 3 — Pattern C Hybrid & Live Migrator): Deploy the Central Hub Router, attach Enterprise spokes via Private Service Connect (`4.6`), and certify the 3-phase zero-downtime upgrade suite.',
          'Q4 2026 – Q1 2027 Product Roadmap Alignment: Tracks native Agent Engine Registry tenant labels (`GAP-01`), per-tenant Memory Bank CMEK (`GAP-02`), and managed cross-project PSC catalogs (`GAP-04`).',
        ],
        specs: [
          {
            stack: 'Deliverables: WS1 Taxonomy + WS2 Pooled Runtime + 2.6 Terraform Starter',
            sla: 'Gate: 10/10 Breach Simulations PASS & 84.7% Prefix Cache Savings Verified',
            tag: 'Weeks 1–4: Pattern A Go-Live',
          },
          {
            stack: 'Deliverables: WS3 Sovereign Silo Engine + 3.6 Terraform Silo Blueprint',
            sla: 'Gate: 6/6 Sovereign Perimeter & Sub-60s HTTP 423 CMEK Kill-Switch Tests PASS',
            tag: 'Weeks 5–7: Pattern B Go-Live',
          },
          {
            stack: 'Deliverables: WS4 Hybrid PSC Router + 3-Phase Migrator + 4.6 Terraform PSC',
            sla: 'Gate: 4/4 Zero-Downtime Tier Promotion Tests PASS (0ms Lag, 0 Dropped Chats)',
            tag: 'Weeks 8–10: Pattern C Go-Live',
          },
          {
            stack: 'workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md',
            sla: 'All Compensating Controls Active Today; Seamless Drop-In Swap as GA Features Ship',
            tag: 'Product Roadmap Continuity',
          },
        ],
      },
    ],
    diagrams: [
      {
        id: 'ws5-decision-tree-and-agentic-triad',
        figure: 'Figure 1',
        title: 'Workstream 5 Capstone: Executive Topology Decision Guide & The Multi-Tenant Agentic Triad',
        talkingPoints: [
          '10,000+ multi-tier tenants enter at Step 1 through a unified front door and receive a zero-bleed, SLA-verified response at Step 7.',
          'Zone 1 (Triad Pillar 1 — Zero-Trust Ingress & Decision Selector): Evaluates Hop 1 Identity, Hop 4 Model Armor, Hop 2 Catalog, and the 2-Question Topology Selector.',
          'Zone 2 (Triad Pillar 3 — FinOps & Security Governance): Security Command Center, 3 Chargeback SQL Models, and BigQuery OTel Sink govern compliance and billing.',
          'Zone 3 (Triad Pillar 2 — Pattern A Pooled Unit Economics): Enforces Memorystore Valkey RPM bulkheads, 4,000 thinking token caps, 90% prefix cache discount, and AlloyDB RLS.',
          'Zone 4 (Pattern B Silos & Pattern C PSC Spokes): Enforces VPC-SC & IAM PAB perimeters, air-gapped Gemma 3 / Gemini 2.5 Pro hosting, PSC spoke routing, and CMEK kill-switches.',
        ],
      },
    ],
    takeaways: [
      'Resolve Regulatory Mandates Before Product Packaging: Always evaluate whether compliance requires physical per-tenant projects (Gate 1 -> Pattern B) before choosing between single-tier (Pattern A) and multi-tier (Pattern C).',
      'Standardize on One 5-Hop Security Pipeline Across All Tiers: Keep 80% of your Python ADK 2.0 application code identical across Pooled, Siloed, and Hybrid environments.',
      'Treat Pooled ($), Hybrid ($$), and Siloed ($$$) as One Continuous Platform: Use Firestore routing metadata and Private Service Connect to move tenants across tiers without changing URLs or rewriting agents.',
      'Balance All Three Pillars of the Agentic Triad: Combining 5-hop zero-trust security, 90% prefix caching + Valkey bulkheads, and zero-PII BigQuery OTel chargeback protects both CISO compliance and CFO margins.',
      'Gate Every Production Release on the 12-Point Forensic & 20-Test Simulation Suite: Run `python3 -B scripts/run_deep_forensic_audit.py` to certify code, diagrams, Terraform blueprints, and live GCP resources.',
    ],
    takeawaySpecs: [
      {
        stack: 'Gate 1: Physical Silo Mandate? -> Gate 2: Single vs. Multi-Tier SaaS Packaging?',
        sla: 'Provides CISO, CFO & VP Engineering Alignment in Under 15 Minutes',
        tag: 'Takeaway 1: Executive Decision Tree',
      },
      {
        stack: 'core-cymbal-agent/ • Hops 1–5 Enforced Identically in Patterns A, B & C',
        sla: 'Eliminates Multi-Branch Maintenance & Guarantees Uniform Security Posture',
        tag: 'Takeaway 2: 80% Reusable Core',
      },
      {
        stack: 'Private Service Connect (PSC) + 3-Phase Live Tier Migration Engine',
        sla: 'Zero-Downtime Tenant Promotion from $42/mo Pool to $1,850/mo Dedicated Spoke',
        tag: 'Takeaway 3: Elastic Tier Mobility',
      },
      {
        stack: 'Security (5 Hops) + Economics (90% Cache / Valkey) + FinOps (BigQuery OTel)',
        sla: '84.7% Token Cost Reduction • 74% Portfolio Cloud Savings • 99.99% Uptime SLA',
        tag: 'Takeaway 4: The Agentic Triad',
      },
      {
        stack: 'scripts/run_deep_forensic_audit.py • 12/12 Forensic Gates • 20/20 Simulations',
        sla: '100% Automated Verification Across Code, Diagrams, Slides & Live GCP Resources',
        tag: 'Takeaway 5: Continuous Governance',
      },
    ],
    callToAction:
      'Walk through the 2-question topology decision tree with your architecture and security review boards, execute the 20-assertion verification suite, and initiate your 10-week production rollout.',
  },
};

for (const [relPath, content] of Object.entries(DECKS)) {
  const absPath = path.join(ROOT, relPath);
  fs.writeFileSync(absPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log(`✅ Wrote ${relPath}`);
}
