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
import { getDeckSlideNotesList } from './human_readable_speaker_notes.mjs';

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
    title: 'Sandboxed ADK Execution, L1–L5 Memory & Quota Bulkheads',
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
    "workstream": "WS1",
    "deckTitle": "Multi-Tenant Agentic AI on Google Cloud: Reference Taxonomy & 5-Hop Governance (Workstream 1)",
    "deckSubtitle": "Solving the SaaS AI Dilemma: Prevent tool-schema leaks and rogue-tenant quota starvation using Agent Development Kit (ADK), Model Context Protocol (MCP) & Agent Registry Discovery (ARD) across Pooled, Silo & Hybrid tiers",
    "tldr": [
      "Why It Matters (SaaS AI Dilemma): Dedicated projects erode SaaS gross margins, while naive shared agents leak tool schemas and allow quota starvation.",
      "Core Primitives (ADK • MCP • ARD): ADK (syscall scheduler), MCP (tool driver ABI) & ARD (chrooted catalog) isolate every tenant across 5 hops.",
      "Three Topologies & 80/20 Reuse: Pattern A (Pooled RLS), Pattern B (Sovereign Silos), and Pattern C (Hybrid PSC) share 80% identical Python ADK code.",
      "5-Hop Pipeline (~42ms p95 Gate): Enforces KMS-signed OBO/DPoP tokens, ARD pruning, Valkey bulkheads, Model Armor DLP, and AlloyDB FORCE RLS.",
      "Architecture Center & GitHub Kit: Ships 14 Official (#78) blueprints, 27 runnable files (core-cymbal-agent/ (27-File Workbench)), feature-flagged EAP compensating controls (GAP-01..05), and 13/13 forensic + 107/107 runtime assertions."
    ],
    "tldrSpecs": [
      {
        "stack": "Google Cloud Architecture Center (#78) • Cloud Run v2 • Vertex AI Agent Engine",
        "sla": "Prevents Tool-Schema Data Leaks & Rogue-Tenant LLM Rate-Limit Starvation",
        "tag": "Why It Matters: The SaaS AI Dilemma"
      },
      {
        "stack": "ADK (Agent Development Kit) • MCP (Model Context Protocol) • ARD (Agent Registry Discovery)",
        "sla": "Deterministic Lifecycle Callbacks + Sender-Constrained 2LO/3LO Tools + Scoped Catalogs",
        "tag": "Core Definitions: ADK, MCP & ARD"
      },
      {
        "stack": "Shared Core Engine (core-cymbal-agent/) • Terraform Modules (2.6, 3.6, 4.6)",
        "sla": "80% Identical Application Code • 20% Declarative Cloud Boundary Parameterization",
        "tag": "Patterns A, B & C Taxonomy"
      },
      {
        "stack": "Cloud Armor • IAP STS (RFC 8693/9449) • Memorystore Valkey • Model Armor • AlloyDB RLS",
        "sla": "~42ms Total p95 Control-Plane Overhead (<2.5% TTFT) • <0.15ms Cached JWKS Verify",
        "tag": "5-Hop Cryptographic Pipeline"
      },
      {
        "stack": "core-cymbal-agent/ (27-File Workbench) • BigQuery OTel Chargeback • Cloud KMS CMEK",
        "sla": "13/13 Forensic Checks PASS • 107/107 Automated Security, Migration & SaaS Assertions PASS",
        "tag": "Public GitHub & Audit Readiness"
      }
    ],
    "sections": [
      {
        "heading": "Products used — Google Cloud Agentic AI, Security & Data Stack",
        "layout": "cards",
        "bullets": [
          "Agentic AI & Foundation Models: Vertex AI Agent Engine (ADK runtime, Agent Registry & L1–L5 Memory Bank), Gemini 2.5 Pro with ContextCacheConfig (90% shared prefix discount), Vertex AI Model Garden (Dedicated PT), and Gemma 3 (27B) on private GKE.",
          "Ingress, Identity & AI Safety Guardrails: Global External Application Load Balancer, Google Cloud Armor L7 WAF, Identity-Aware Proxy (IAP) & IAM Security Token Service (RFC 8693 OBO + RFC 9449 DPoP), Vertex AI Model Armor, and Cloud Sensitive Data Protection (DLP).",
          "Data, Storage, Networking & Governance: AlloyDB for PostgreSQL (FORCE ROW LEVEL SECURITY), Memorystore for Valkey (per-tenant RPM bulkheads & JTI deny-list) & Firestore, VPC Service Controls (VPC-SC) & Private Service Connect (PSC), Cloud KMS CMEK, and BigQuery OTel.",
          "Shared 80% Reusable Application Core: All three isolation patterns execute the exact same Python ADK 5-hop security pipeline (`core-cymbal-agent/runtime_pipeline.py`), parameterizing only the surrounding 20% Google Cloud project and network boundary."
        ],
        "specs": [
          {
            "stack": "Vertex AI Agent Engine (ADK) • Gemini 2.5 Pro (ContextCacheConfig) • Dedicated PT • Gemma 3 27B",
            "sla": "90% Shared System Prefix Cache Discount + Managed SaaS PT vs. Air-Gapped GKE GPU Hosting",
            "tag": "1. Agentic AI & Models"
          },
          {
            "stack": "Cloud Load Balancing • Cloud Armor WAF • IAP & IAM STS (OBO + DPoP) • Model Armor • Cloud DLP",
            "sla": "Cryptographic Identity Binding (HTTP 401) + Streaming ~22ms Prompt & PII Guardrails (HTTP 400/422)",
            "tag": "2. Ingress, Identity & Safety"
          },
          {
            "stack": "AlloyDB (PostgreSQL RLS) • Memorystore Valkey • Firestore • VPC-SC • PSC • Cloud KMS CMEK • BigQuery",
            "sla": "0 Cross-Tenant Rows • <5s Targeted Valkey SCAN+UNLINK Eviction • Zero-PII FinOps Chargeback",
            "tag": "3. Data, Network & Governance"
          },
          {
            "stack": "core-cymbal-agent/ (models.py, runtime_pipeline.py) + Terraform Modules (2.6, 3.6, 4.6)",
            "sla": "80% Identical Python ADK Codebase Across Pooled (A), Siloed (B) & Hybrid (C) Tiers",
            "tag": "4. Unified Platform Core"
          }
        ]
      },
      {
        "heading": "Use cases — Competing Enterprise Tenants (FinVault vs. RetailStream) & Google Cloud Stack",
        "layout": "cards",
        "bullets": [
          "Cymbal SaaS Control Plane (Shared 32k Prefix Cache): Operates a shared Incident Diagnostic Agent on Vertex AI Agent Engine (ADK, ARD Registry & L1–L5 Memory Bank), caching a 32,000-token SRE runbook prefix once (90% discount -> 84.7% net per-turn token cost reduction).",
          "FinVault Bank (Dedicated PT vs. Private GKE Gemma 3): Regulated bank (600 RPM / 8k thinking, VPC-SC, CMEK) choosing between Vertex AI Dedicated Provisioned Throughput (managed SaaS Gemini 2.5 Pro, 0 K8s ops) or Self-Managed Gemma 3 27B on Private GKE (air-gapped GPU nodes, 0 internet egress).",
          "RetailStream Corp (3LO Token Vault & Anti-Confused-Deputy): Pooled tenant (120 RPM / 4k thinking, Entra ID) invoking ServiceNow ITOM via 3LO step-up consent; per-user OAuth tokens are isolated in {tenant}:{user} DPoP-bound vaults (dpop_jkt verified) so pooled agents never act as a Confused Deputy.",
          "Cryptographic Mutual Invisibility & ~42ms 5-Hop Budget: Cloud Armor WAF, IAP OBO/DPoP, Valkey token buckets, streaming Model Armor/DLP (~22ms), and AlloyDB FORCE RLS run one 80% reusable ADK codebase—blocking cross-tenant probes (HTTP 403) with 0 cross-tenant rows."
        ],
        "specs": [
          {
            "stack": "Vertex AI Agent Engine (ADK, ARD, L1–L5 Memory) • Gemini 2.5 Pro (32k ContextCacheConfig)",
            "sla": "Immutable 32k System Prefix Cache • 84.7% Net Per-Turn Token Cost Reduction • ~42ms 5-Hop Overhead",
            "tag": "1. Platform Control Plane: Cymbal SaaS"
          },
          {
            "stack": "Managed Vertex AI Dedicated PT (SaaS SLA, 0 GPU Ops) vs. Air-Gapped GKE Gemma 3 27B (Customer GPU Nodes)",
            "sla": "Tier: ENTERPRISE (600 RPM Silo) • 8,000 Thinking Budget • VPC-SC • Cloud KMS CMEK (finvault-silo-cmek)",
            "tag": "2. Regulated Silo: FinVault Hosting Trade-Off"
          },
          {
            "stack": "Entra ID OIDC • Per-User DPoP-Bound 3LO Vault ({tenant}:{user}) • ServiceNow & SharePoint MCP",
            "sla": "Tier: STANDARD (120 RPM Pool) • 4,000 Thinking Cap • Eliminates Pooled Confused-Deputy Token Replay",
            "tag": "3. Pooled Tenant: RetailStream & 3LO Security"
          },
          {
            "stack": "Cloud Armor • IAP STS (RFC 8693/9449) • Model Armor • Cloud DLP • AlloyDB RLS • BigQuery OTel",
            "sla": "80% Identical Python ADK Codebase • Verified by 107/107 Automated Security & SaaS Assertions",
            "tag": "4. Cryptographic Invisibility Across Stack"
          }
        ]
      },
      {
        "heading": "Agenda & 5-Part Series Navigation — Streamlined 11-Slide Architecture Roadmap",
        "layout": "table",
        "tableHeaders": [
          "Series Part & Slides",
          "Editorial Blog & Briefing Focus",
          "Core Engineering Question Answered",
          "Key Architectural Deliverable & SLA"
        ],
        "tableColW": [
          2.15,
          3.2,
          3.5,
          3.583
        ],
        "tableRows": [
          [
            "Part 1 • Slides 1–4\nIsolation Topologies",
            "The SaaS AI Architect's Dilemma: High-Density Pooled (A) vs. Sovereign Silos (B) vs. Dynamic Hybrid (C)",
            "How do we serve 950 commercial tenants and 50 regulated banks without margin erosion or 500-silo IaC sprawl?",
            "12-Dimension Decision Matrix • 80/20 ADK Code Reuse • {tenant}:{user} DPoP 3LO Vault"
          ],
          [
            "Part 2 • Slides 5, 6 & 8\n5-Hop Pipeline (L1/L2/L4)",
            "Securing the Agent Loop: L1 3 Logical Security Layers → L2 4 Physical VPC-SC Perimeters → L4 Wire STS JWT",
            "How do we enforce cryptographic tenant identity from edge ingress down to wire packets without per-hop KMS latency?",
            "<0.15ms Cached-JWKS STS JWT • ~3ms Valkey JTI Deny-List • ~42ms p95 5-Hop Control Plane"
          ],
          [
            "Part 3 • Slide 7\nL3 Sequence & Breakers",
            "Operational Resilience: Merged L3 5-Actor UML Sequence, Fail-Closed Circuit Breakers & Valkey L1 Flushes",
            "What happens chronologically during a live turn—and how do we fail closed on RPM floods or CMEK key revocation?",
            "HTTP 401/403/429/422/423 Breakers • <5s Valkey SCAN+UNLINK (cache:{tenant}:*) • SET NX PX 5000 Recovery"
          ],
          [
            "Part 4 • Slide 9\nMind the Gap (GAP-01..05)",
            "Compensating Controls for Vertex AI EAP: Custom Token Buckets, Envelope CMEK & Zero-PII BigQuery OTel FinOps",
            "How do we close current preview platform gaps today while guaranteeing clean retirement at native GCP GA?",
            "Feature-Flagged GAP-01..05 Sunset Hooks (feature-flagged native adapter) • BigQuery OTel Chargeback SQL"
          ],
          [
            "Part 5 • Slides 10–11\nCI/CD Audit & SLAs",
            "Automating Compliance & Well-Architected SLAs: Live GCP Console Receipts, 5 Milestones & Forensic CI/CD Gate",
            "How do we prove zero cross-tenant data bleed continuously in CI/CD and map every Well-Architected SLA to code?",
            "13/13 Forensic + 107/107 Runtime Assertions PASS • 84.7% Token & 74% TCO Savings • <30s HA RTO"
          ]
        ],
        "bullets": [],
        "specs": []
      },
      {
        "heading": "Design alternatives — Comparison of Multi-Tenant Isolation Patterns (A, B & C)",
        "layout": "table",
        "tableHeaders": [
          "Architectural Dimension",
          "Pattern A: High-Density Pooled (WS2)",
          "Pattern B: Sovereign Silos (WS3)",
          "Pattern C: Dynamic Hybrid PSC (WS4)"
        ],
        "tableColW": [
          2.25,
          3.35,
          3.45,
          3.483
        ],
        "tableRows": [
          [
            "Control plane & SRE fleet scale",
            "Single shared GCP project (`cymbal-control-plane`); 1 Terraform state with zero fleet sprawl",
            "Dedicated GCP project per tenant (`cymbal-{tenant}-silo-prod`); 500 tenants = 500 VPC-SC/KMS/DB states",
            "Central Hub + Shared Pool (950 Std) + Dedicated PSC Spokes (50 Ent); avoids 500-silo IaC drift"
          ],
          [
            "Compute & gVisor sandbox",
            "Shared Cloud Run v2 & Agent Engine gVisor (`runsc`) worker pool with `temp:tenant_id`",
            "Dedicated Agent Engine or self-managed air-gapped GKE GPU cluster (Gemma 3 27B)",
            "JWT-driven Firestore router dispatches Standard -> Pool, Enterprise -> unidirectional PSC Spoke"
          ],
          [
            "Network & perimeter isolation",
            "Shared VPC protected by Cloud Armor L7 WAF header stripping",
            "Per-tenant VPC Service Controls (VPC-SC) perimeter + BeyondCorp mTLS pinning",
            "Unidirectional Private Service Connect (PSC) endpoints (`10.10.0.50` -> `/28` NAT subnet)"
          ],
          [
            "Identity & confused-deputy guard",
            "IAP OIDC + IAM STS RFC 8693 OBO & RFC 9449 DPoP (`<0.15ms` cached JWKS verify)",
            "IAM Principal Access Boundaries (PAB) + dedicated per-silo service accounts",
            "Unified Hub OIDC + tier-scoped OBO/DPoP JWT forwarding & Valkey JTI revocation list"
          ],
          [
            "Data, memory & CMEK L1 eviction",
            "Shared AlloyDB `FORCE ROW LEVEL SECURITY` + `{tenant}:{user}:{session}` L1–L5 Memory",
            "Dedicated AlloyDB & CMEK (`<60s` KMS SLA + `<5s` Valkey `SCAN+UNLINK` L1 cache purge -> `423`)",
            "Pooled RLS for Standard; CMEK spoke vault + 3-phase zero-downtime live tier migration"
          ],
          [
            "Model hosting & FinOps COGS",
            "Shared 32k prefix cache (`90%` discount -> `84.7%` net per-turn token savings)",
            "Managed Vertex AI Dedicated PT (0 K8s ops) or self-hosted GKE GPU node pool",
            "Blended portfolio (`74%` lower total cloud spend across 950 Std + 50 Ent tenants)"
          ],
          [
            "Target tier & verification suite",
            "`120 RPM Pool` • High-volume commercial B2B SaaS (`10/10` red-team breach tests PASS)",
            "`600 RPM Silo` • Regulated Banking, Healthcare & Public Sector (`6/6` silo tests PASS)",
            "`120 RPM Pool` (Std) / `600 RPM Spoke` (Ent) • Live tier graduation (`4/4` migration PASS)"
          ]
        ],
        "bullets": [],
        "specs": []
      },
      {
        "heading": "Design alternatives — Compensating Controls for EAP Product Gaps (GAP-01..05)",
        "layout": "table",
        "tableHeaders": [
          "Gap ID & Component",
          "Current Preview / EAP Limitation",
          "Production Compensating Control (core-cymbal-agent/)",
          "Verification Gate & GA Sunset"
        ],
        "tableColW": [
          2.15,
          3.15,
          4.25,
          2.983
        ],
        "tableRows": [
          [
            "GAP-01 (Hop 2)\nAgent Engine Registry",
            "Shared Agent Engine Registry lacks native per-tenant IAM condition predicates on `ListAgents` discovery calls.",
            "`Hop2RegistryPDP.authorize_agent_and_prune_tools` filters ARD by signed JWT `tenant_id` + ADK `before_agent_callback` pruning.",
            "WS2 Test 2 PASS (`HTTP 403` on cross-tenant Agent Alpha probe) • Sunset at Native GA: Feature-Flagged Native Hook"
          ],
          [
            "GAP-02 (Hop 3)\nMemory Bank CMEK",
            "Pooled Vertex AI Memory Bank supports project-level CMEK rather than distinct per-tenant KMS keys in one shared pool.",
            "Envelope encryption + `<5s` tenant-prefixed Valkey `SCAN+UNLINK` (`cache:{tenant_id}:*`) on KMS disable (`<60s` `HTTP 423`) + `SET NX` single-flight re-hydration.",
            "WS3 Tests 4A/4B/6 PASS (`HTTP 423 Locked` <60s, 0 peer cache evictions) • Sunset at GA: Feature-Flagged Native Hook"
          ],
          [
            "GAP-03 (Hop 3)\nPer-Tenant Rate Quotas",
            "Vertex AI quota system enforces regional project-level RPM/TPM limits rather than native per-tenant sub-quotas.",
            "`Hop3ComputeFinOpsBulkhead` enforces atomic Lua token-bucket RPM limits in Valkey (`120` vs. `600` RPM, `HTTP 429 Retry-After`) + `4k/8k` thinking clamps.",
            "WS2 Test 6 PASS (`HTTP 429` on 500-RPM flood; budget clamped to 4k) • Sunset at GA: Feature-Flagged Native Hook"
          ],
          [
            "GAP-04 (Hop 1/4)\nMulti-IdP 3LO Broker",
            "External Microsoft Entra ID OIDC tokens require claims normalization and anti-confused-deputy isolation for 3LO MCP tools.",
            "Hop 1 normalizes Entra `tid`/`sub` into DPoP-bound `{tenant}:{user}` 3LO token vaults with `-32042` step-up consent & `dpop_jkt` verification.",
            "WS2 Test 10 & 10-SaaS Matrix PASS (`HTTP 401` step-up -> `200 OK` ServiceNow) • Sunset at GA: Feature-Flagged Native Hook"
          ],
          [
            "GAP-05 (Hop 5)\nZero-PII Token Billing",
            "Cloud Billing exports aggregate Vertex AI SKU charges by GCP project rather than individual logical SaaS `tenant_id`.",
            "`Hop5DataPlaneRLSAndOTel` streams SHA-256 zero-PII OTel spans to BigQuery (`SELECT tenant_id, SUM(cached_tokens*0.1 + thinking_tokens) GROUP BY tenant_id`).",
            "Forensic Check F-08 PASS (BigQuery OTel chargeback SQL verified) • Sunset at GA: Feature-Flagged Native Hook"
          ]
        ],
        "bullets": [],
        "specs": []
      },
      {
        "heading": "Design considerations — 5-Hop Cryptographic Verification Pipeline",
        "layout": "pipeline",
        "pipelineSteps": [
          {
            "hop": "HOP 01",
            "stage": "Edge & Identity (~8ms)",
            "title": "Perimeter WAF, Federated OIDC & DPoP Token Binding",
            "service": "Cloud Armor • IAP • IAM STS",
            "mechanism": "Strips unauthenticated X-Tenant-Id headers at the L7 load balancer, verifies Google Workspace or Microsoft Entra ID OIDC JWTs, and exchanges credentials via RFC 8693 OBO.",
            "invariant": "KMS ECDSA P-256 JWT + Local JWKS Cache (<0.15ms verify)",
            "gate": "HTTP 401 on Spoofed Header, Replayed DPoP or Revoked JTI"
          },
          {
            "hop": "HOP 02",
            "stage": "Registry PDP (~4ms)",
            "title": "Tenant-Scoped Agent & MCP Tool Catalog Filtering",
            "service": "Vertex AI Agent Engine Registry",
            "mechanism": "Evaluates the signed TenantSecurityContext against Agent Engine Registry metadata before LLM tool-binding, returning only shared platform tools and tenant-owned private agents.",
            "invariant": "Catalog Predicate: resource.visibility IN (\"shared\", ctx.tenant_id)",
            "gate": "HTTP 403 Forbidden on Cross-Tenant Agent or MCP Discovery"
          },
          {
            "hop": "HOP 03",
            "stage": "Runtime & Memory (~3ms)",
            "title": "gVisor Sandbox, L1–L5 Memory & Valkey Bulkheads",
            "service": "Agent Engine • Memorystore Valkey",
            "mechanism": "Executes tool subprocesses in gVisor (runsc) sandboxes, partitions L1–L5 Memory Bank namespaces, and enforces Valkey RPM bulkheads and targeted SCAN+UNLINK CMEK eviction.",
            "invariant": "Namespace: mem://{tenant_id}/L1..L5 • Cap: 4k (Std) / 8k (Ent)",
            "gate": "HTTP 429 on RPM Burst • <5s Targeted L1 Eviction on CMEK Revoke"
          },
          {
            "hop": "HOP 04",
            "stage": "Safety & DLP (~22ms)",
            "title": "Streaming Model Armor Screening & Sensitive Data Redaction",
            "service": "Model Armor • Sensitive Data Protection",
            "mechanism": "Screens ingress prompts and streaming completion chunks via regional gRPC callouts (~22ms p95) for prompt injection, tenant Natural Language Constraints (NLCs), and PII/IBAN/PAN tokens.",
            "invariant": "Policy: Regional gRPC inspectContent + Tenant NLC Rules",
            "gate": "HTTP 400 on Prompt Injection • HTTP 422 on NLC Policy Breach"
          },
          {
            "hop": "HOP 05",
            "stage": "Data & FinOps (~5ms)",
            "title": "Transactional Row-Level Security, CMEK & BigQuery OTel SQL",
            "service": "AlloyDB RLS • Cloud KMS • BigQuery",
            "mechanism": "Binds parameterized PostgreSQL session context (app.current_tenant_id) for FORCE ROW LEVEL SECURITY, verifies Cloud KMS CMEK liveness, and streams zero-PII OTel spans to BigQuery.",
            "invariant": "SQL: SET LOCAL app.current_tenant_id • OTel Chargeback SQL",
            "gate": "0 Unauthorized Rows • HTTP 423 Locked on CMEK Revocation"
          }
        ],
        "bullets": [
          "Hop 1 — Edge WAF & Cached JWKS Identity (~8ms p95): Cloud Armor strips spoofed X-Tenant-Id headers while IAP and IAM STS mint a KMS-signed OBO + DPoP TenantSecurityContext verified locally in <0.15ms.",
          "Hop 2 — Registry Discovery Filtering (~4ms p95): Vertex AI Agent Engine Registry evaluates tenant visibility metadata prior to tool binding, returning HTTP 403 on unauthorized private agents.",
          "Hop 3 — gVisor Runtime, Valkey Bulkheads & Targeted Eviction (~3ms p95): Isolates L1–L5 Memory Bank namespaces, clamps RPM (120/600) and thinking budgets (4k/8k), and evicts only cache:{tenant_id}:* on CMEK revoke.",
          "Hop 4 — Streaming Model Armor & DLP (~22ms p95): Regional gRPC Model Armor + Sensitive Data Protection blocks prompt injection (HTTP 400) and semantic NLC violations (HTTP 422) with <2.5% impact on turn TTFT.",
          "Hop 5 — Transactional RLS, CMEK & BigQuery OTel SQL (~5ms p95): AlloyDB enforces SET LOCAL app.current_tenant_id Row-Level Security, Cloud KMS validates CMEK liveness (HTTP 423), and BigQuery aggregates zero-PII OTel spans."
        ]
      },
      {
        "heading": "Design considerations — Google Cloud Well-Architected Framework Alignment",
        "layout": "cards",
        "bullets": [
          "1. Security, Privacy & Compliance: Enforces zero-trust defense-in-depth across all 5 hops—combining <0.15ms cached-JWKS DPoP verification, per-user 3LO vaults against Confused Deputy attacks, AlloyDB RLS, and revocable Cloud KMS CMEK.",
          "2. Reliability & Anti-Stampede Resilience: Prevents noisy-neighbor outages via Valkey token-bucket bulkheads, targeted SCAN+UNLINK cache:{tenant_id}:* eviction (0 peer cache misses), and Valkey SET NX single-flight lazy re-hydration.",
          "3. Cost Optimization (FinOps): Shares a 32,000-token immutable system prefix in Gemini 2.5 Pro ContextCacheConfig (90% discount, 84.7% net token savings) and attributes COGS via BigQuery OTel SQL chargeback views.",
          "4. Operational Excellence & 5. Performance (~42ms p95): Reuses 80% of the Python ADK codebase across Terraform 2.6/3.6/4.6, bounds total 5-Hop control-plane overhead to ~42ms p95 (<2.5% TTFT), and gates CI/CD on 13/13 + 107/107 tests."
        ],
        "specs": [
          {
            "stack": "Cloud Armor • IAP OBO/DPoP (<0.15ms JWKS) • Per-User 3LO Vault • AlloyDB RLS • VPC-SC • Cloud KMS CMEK",
            "sla": "10/10 Breach Vectors Blocked (WS2) + 6/6 Sovereign Silo & <60s HTTP 423 CMEK Tests PASS (WS3)",
            "tag": "Pillar 1: Security & Compliance"
          },
          {
            "stack": "Memorystore Valkey (120/600 RPM) • Targeted SCAN+UNLINK Eviction • SET NX Single-Flight Re-Hydration",
            "sla": "Zero Peer Thundering Herd on CMEK Flush • Zero AlloyDB Cache Stampede on Restore • 0 Dropped Upgrades",
            "tag": "Pillar 2: Reliability & Bulkheads"
          },
          {
            "stack": "Gemini 2.5 Pro ContextCacheConfig (32k Prefix) • BigQuery OTel SQL Chargeback (GROUP BY tenant_id)",
            "sla": "84.7% Net Per-Turn Token Savings • 74% Portfolio TCO Reduction (950 Pooled + 50 PSC Spokes)",
            "tag": "Pillar 3: Cost Optimization"
          },
          {
            "stack": "core-cymbal-agent/ (80% Reusable Code + GA Sunset Flags) • Terraform 2.6/3.6/4.6 • ~42ms p95 5-Hop Budget",
            "sla": "13/13 Forensic Gates + 107/107 Assertions PASS • ~22ms Streaming DLP (<2.5% TTFT Overhead)",
            "tag": "Pillars 4 & 5: Ops & Performance"
          }
        ]
      }
    ],
    "diagrams": [
      {
        "id": "ws1-multi-tenant-taxonomy-overview",
        "figure": "Figure 1",
        "title": "Vertex AI Agent Engine Multi-Tenant Taxonomy: Pooled (A), Sovereign Silos (B) & Hybrid (C)",
        "talkingPoints": [
          "Blue Perimeter 1 (Routing Hub — Steps 1–3 / Hop 1): Global ALB, Cloud Armor header strip, and IAP OIDC/DPoP exchange (~8ms p95) mint the KMS-signed STS JWT and route by tenant tier.",
          "Green Perimeter 2 (Governance Hub — Hops 2 & 5): Discovery Engine ARD catalog filter (~4ms), Cloud KMS CMEK liveness, Security Command Center, and async BigQuery OTel FinOps (~5ms).",
          "Yellow Perimeter 3 (Pattern A Pool — Steps 4–7 / Hops 3–5): gVisor (runsc) sandbox, Valkey RPM bulkheads (~3ms), Model Armor/DLP screening (Steps 4 & 6, ~22ms), Gemini 2.5 Pro 90% cache (Step 5) & AlloyDB RLS.",
          "Red Perimeter 4 (Pattern B Silos & Pattern C PSC Spokes): Per-tenant VPC-SC perimeters, IAM PAB, Managed Vertex Dedicated PT vs. Private GKE Gemma 3 27B GPUs, <60s CMEK kill-switch & /28 PSC NAT.",
          "Unified L1-to-L2 Taxonomy: Slide 5's 3 Logical Security Layers map cleanly onto these 4 Physical VPC-SC Network Perimeters with ~42ms total p95 control-plane overhead (<2.5% of turn TTFT)."
        ]
      },
      {
        "id": "ws1-cloud-arch-center-5hop-baseline",
        "figure": "Figure 2",
        "title": "Google Cloud Architecture Center (#78): Multi-Tenant Agentic AI with 5-Hop Governance",
        "talkingPoints": [
          "Extends the canonical Google Cloud Architecture Center hub-and-spoke diagram with 5 mandatory cryptographic tenant isolation hops.",
          "Zone 1 (Hops 1 & 2): Cloud Armor, IAP OBO/DPoP (<0.15ms cached JWKS verify), and Agent Engine Registry authenticate callers and prune unauthorized tools before model invocation.",
          "Zone 2 (Hop 5 FinOps & 3LO Vault): DPoP-bound {tenant}:{user} 3LO Auth Broker prevents Confused Deputy calls while BigQuery OTel SQL attributes per-tenant token COGS.",
          "Zone 3 (FinVault Enterprise Workload): Executes with an 8,000-token thinking budget, Managed Dedicated PT or GKE Gemma 3, OCC semantic NLCs, IBAN/SWIFT SDP masking, and Workspace/Jira 3LO.",
          "Zone 4 (RetailStream Standard Workload): Executes with a 4,000-token thinking cap, PCI-DSS PAN masking, Entra ID/ServiceNow 3LO step-up consent, and AlloyDB FORCE RLS."
        ]
      }
    ],
    "takeaways": [
      "1. Part 1 (Slides 1–4) — Isolation Topologies & 5-Hop Core: Clone core-cymbal-agent/ (27-File Workbench) and deploy core-cymbal-agent/ with <0.15ms cached-JWKS STS JWT verification, ~3ms Valkey JTI deny-list, and {tenant}:{user} 3LO token vaulting.",
      "2. Part 2 (Slides 5, 6 & 8) — 5-Hop Pipeline & Pattern A Pool: Apply Terraform 2.6 (2.6-terraform-starter/), certify ~42ms p95 5-Hop overhead (~22ms DLP), ~1.8s cold / ~420ms warm TTFT, 84.7% token savings (90% 32k prefix cache), and pass run_breach_simulations.py (10/10 PASS).",
      "3. Part 3 (Slide 7) — Circuit Breakers, CMEK & Valkey L1 Flush: Apply Terraform 3.6 (3.6-terraform-silo-blueprint/), certify gVisor sandbox, <60s HTTP 423 CMEK kill-switch, <5s Valkey SCAN+UNLINK (cache:{tenant}:*), SET NX PX 5000 recovery, and <30s cross-region RTO (6/6 PASS).",
      "4. Part 4 (Slide 9) — EAP Gap Controls & Pattern C Hybrid FinOps: Apply Terraform 4.6 (4.6-terraform-hybrid-psc-blueprint/), certify 74% portfolio TCO reduction (950 Pooled + 50 PSC Spokes), feature-flagged GAP-01..05 sunset hooks, BigQuery OTel FinOps SQL, and 0ms PSC cutover (4/4 PASS).",
      "5. Part 5 (Slides 10–11) — CI/CD Forensic Audit & Day-2 Operations: Enforce python3 -B scripts/run_deep_forensic_audit.py (13/13 PASS • 107/107 Assertions) and Cloud Logging gate (jsonPayload.rls_cross_tenant_rows=0) across WS1–WS5 in CI/CD."
    ],
    "takeawaySpecs": [
      {
        "stack": "core-cymbal-agent/ (27-File Workbench) • core-cymbal-agent/runtime_pipeline.py • models.py",
        "sla": "SLA: <0.15ms Cached JWKS • ~3ms Valkey JTI Deny-List • {tenant}:{user} 3LO Token Vault (Slides 1–4)",
        "tag": "Part 1: Topologies & Core (Slides 1–4)"
      },
      {
        "stack": "workstream-2-pattern-a-pooled/2.6-terraform-starter/ • run_breach_simulations.py",
        "sla": "SLA: ~42ms p95 5-Hop • ~1.8s Cold / ~420ms Warm TTFT • 84.7% Token Savings • 10/10 PASS (Slides 5, 6, 8)",
        "tag": "Part 2: 5-Hop & Pattern A (Slides 5, 6, 8)"
      },
      {
        "stack": "workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/ • run_silo_security_tests.py",
        "sla": "SLA: <60s CMEK (423) • <5s SCAN+UNLINK • SET NX PX 5000 Recovery • <30s HA RTO • 6/6 PASS (Slide 7)",
        "tag": "Part 3: Breakers & Silos (Slide 7)"
      },
      {
        "stack": "workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/ • run_tier_migration_suite.py",
        "sla": "SLA: 74% TCO Savings (950 Pooled + 50 PSC Spokes) • 0ms Cutover • GAP-01..05 Sunset Hooks • 4/4 PASS (Slide 9)",
        "tag": "Part 4: Gaps & Hybrid PSC (Slide 9)"
      },
      {
        "stack": "scripts/run_deep_forensic_audit.py • blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
        "sla": "SLA: 13/13 Forensic Gate (107/107 Assertions) • 20/20 Breach/Silo/PSC Suite • 0 RLS Bleed (Slides 10–11)",
        "tag": "Part 5: CI/CD Forensic Gate (Slides 10–11)"
      }
    ],
    "callToAction": "Clone core-cymbal-agent/ (27-File Workbench), run python3 -B scripts/run_deep_forensic_audit.py (13/13 • 107/107 PASS), and launch the 5-Part Multi-Tenant Agentic AI Blog Series."
  },

  'blogs/ws2-pattern-a-pooled-architecture.deck.json': {
    workstream: 'WS2',
    deckTitle: 'Pattern A — High-Density Pooled Multi-Tenant Architecture on Google Cloud (Workstream 2)',
    deckSubtitle:
      'Serving hundreds of commercial B2B SaaS tenants on a single shared Cloud Run v2, Vertex AI Agent Engine, and AlloyDB RLS footprint with 84.7% lower inference cost and 10/10 red-team attacks blocked',
    tldr: [
      'Commercial SaaS Margin Equation: Pattern A co-hosts hundreds of commercial tenants in one shared project (`cymbal-control-plane`) at a 120 RPM floor.',
      'Cryptographic Logical Isolation: Rather than spinning up per-tenant VPCs, Pattern A enforces non-bypassable tenant boundaries across all 5 hops.',
      '10/10 Red-Team Attacks Blocked: FinVault Bank and RetailStream Corp share Cloud Run v2 workers and AlloyDB with zero cross-tenant bleed.',
      '84.7% Net Inference Savings: A 32k-token immutable system runbook is cached once in ContextCacheConfig at 90% off (34,000 -> 5,200 tokens).',
      'Turnkey Milestone 1 Production Kit: Includes the 80% reusable ADK runtime pipeline, a 1-click Terraform starter (`2.6-terraform-starter`), a 90-minute hands-on codelab, and the 10-point breach simulation suite.',
    ],
    tldrSpecs: [
      {
        stack: 'Single GCP Project (cymbal-control-plane) • Cloud Run v2 (cymbal-multi-tenant-patterns)',
        sla: '120 RPM Pool Unit Cost per Tenant • Preserves 85%+ SaaS Gross Margin on Standard Tiers',
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
          'Agentic AI & Shared Prefix Caching: Vertex AI Agent Engine (ADK runtime, Agent Registry & L1–L5 Memory Bank) and Gemini 2.5 Pro with ContextCacheConfig caching a 32,000-token immutable system prefix at a 90% discount (84.7% net token savings).',
          'Ingress, Identity & Bidirectional AI Safety: Global External Application Load Balancer, Google Cloud Armor L7 WAF (stripping spoofed X-Tenant-Id headers), IAP + IAM STS (RFC 8693 OBO + RFC 9449 DPoP), Vertex AI Model Armor, and Cloud Sensitive Data Protection.',
          'Rate Bulkheads, Relational RLS & FinOps Telemetry: Memorystore for Valkey (120 vs. 600 RPM token buckets), Firestore tenant profile registry, AlloyDB for PostgreSQL (`FORCE ROW LEVEL SECURITY`), Cloud KMS CMEK, and BigQuery zero-PII OTel chargeback.',
          'High-Density Unit Economics (120 RPM Shared Pool): Co-hosts hundreds of commercial B2B SaaS tenants inside one shared Google Cloud project (`cymbal-control-plane`) while guaranteeing 10/10 red-team breach isolation.',
        ],
        specs: [
          {
            stack: 'Vertex AI Agent Engine (ADK) • Gemini 2.5 Pro ContextCacheConfig (32k Shared System Prefix)',
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
            sla: '120 RPM Pool Baseline Unit Cost per Tenant • 10/10 Red-Team Breach Simulations Verified',
            tag: '4. Turnkey Pattern A Kit',
          },
        ],
      },
      {
        heading: 'Use cases — Co-Hosting FinVault & RetailStream Safely on One Pooled Google Cloud Stack',
        layout: 'cards',
        bullets: [
          'Dynamic Per-Turn Runtime Hydration: A single pooled Diagnostic Agent on Cloud Run v2 & Vertex AI Agent Engine dynamically loads each caller’s Firestore profile, GCS Skills (`gs://cymbal-skills-{tenant}/`), and 32k Gemini 2.5 Pro ContextCacheConfig prefix.',
          'FinVault Bank (Enterprise Slice in Pool): Authenticates via Google Workspace OIDC, unlocks an 8,000-token thinking budget and 600 RPM Valkey quota, and accesses private Agent Alpha (Gemini 2.5 Pro Dedicated PT) plus Workspace/Jira 3LO.',
          'RetailStream Corp (Standard Slice in Pool): Authenticates via Microsoft Entra ID OIDC, runs within a 4,000-token thinking cap and 120 RPM Valkey quota (120 RPM Pool floor), and invokes SharePoint/ServiceNow 3LO with `-32042` step-up consent.',
          'Cryptographic Catalog, Memory & AlloyDB RLS Firewall: Cloud Armor, IAP OBO/DPoP, Hop 2 ARD Filter (HTTP 403), Hop 3 L1–L5 Memory Bank namespaces, Hop 4 Model Armor/DLP, and Hop 5 AlloyDB FORCE RLS guarantee 100% mutual invisibility.',
        ],
        specs: [
          {
            stack: 'Cloud Run v2 • Vertex AI Agent Engine • Gemini 2.5 Pro ContextCacheConfig (32k Prefix)',
            sla: 'Injects Tenant-Specific Prompt & GCS Skills per Turn • 84.7% Net Input Token Cost Reduction',
            tag: '1. Shared Pooled Control Plane',
          },
          {
            stack: 'Google Workspace OIDC • Agent Alpha (Gemini 2.5 Pro Dedicated PT) • 3LO Drive/Gmail/Jira',
            sla: '8,000 Thinking Tokens • 600 RPM Valkey Bucket • OCC NLC (HTTP 422) + IBAN/SWIFT Masking',
            tag: '2. FinVault Pooled Enterprise Slice',
          },
          {
            stack: 'Microsoft Entra ID OIDC • Shared Diagnostic Agent • 3LO SharePoint & ServiceNow ITOM',
            sla: '4,000 Thinking Tokens • 120 RPM Valkey Bucket • PCI-DSS PAN/SSN Masking • 120 RPM Pool Floor',
            tag: '3. RetailStream Pooled Standard Slice',
          },
          {
            stack: 'Cloud Armor • IAP STS • Hop 2 ARD • L1–L5 Memory Bank • Model Armor • AlloyDB FORCE RLS',
            sla: '10/10 Adversarial Red-Team Breach Simulations Blocked • 0 Cross-Tenant SQL Rows',
            tag: '4. Unified Pattern A Security Stack',
          },
        ],
      },
      {
        heading: 'Design alternatives — Pattern A Pooled Architecture vs. Naive Multi-Tenancy vs. Dedicated Silos',
        layout: 'table',
        tableHeaders: [
          'Architectural Dimension',
          'Naive Shared Multi-Tenancy (Anti-Pattern)',
          'Pattern A: Cryptographic Pooled (WS2 Target)',
          'Pattern B: Dedicated Sovereign Silos (WS3)',
        ],
        tableColW: [2.25, 3.30, 3.50, 3.483],
        tableRows: [
          [
            'Ingress & identity binding',
            'Trusts client-supplied `X-Tenant-Id` HTTP header or shared API key in application code',
            'Cloud Armor strips `X-Tenant-Id`; IAP + STS mints RFC 8693 OBO & RFC 9449 DPoP context',
            'BeyondCorp mTLS cert pinning + per-project IAM Principal Access Boundary (PAB)',
          ],
          [
            'Tool catalog & memory state',
            'Global MCP tool list & shared vector collection accessible to any prompt',
            'Hop 2 ARD visibility filter (`HTTP 403`) + `mem://{tenant_id}/L1..L5` namespace isolation',
            'Physical per-project Agent Engine Registry & CMEK-encrypted Memory Bank',
          ],
          [
            'Rate limits & reasoning quotas',
            'Regional Vertex AI RPM/TPM shared first-come, first-served (noisy-neighbor outages)',
            'Memorystore for Valkey RPM buckets (`120`/`600` RPM, `HTTP 429`) + `4k`/`8k` thinking clamps',
            'Dedicated GCP project quota & dedicated Provisioned Throughput / GKE GPUs',
          ],
          [
            'Prompt caching & FinOps COGS',
            '34k prompt billed in full every turn (`32k Uncached/turn`) or unsafe cross-tenant cache bleed',
            '32k immutable prefix in Gemini 2.5 Pro `ContextCacheConfig` (`90%` discount -> `84.7%` savings)',
            'Per-silo prefix cache or dedicated air-gapped GKE Gemma 3 (27B) node pool',
          ],
          [
            'Relational data & PII guardrails',
            'Application-layer `WHERE tenant_id = ?` query (vulnerable to SQLi & prompt injection)',
            'AlloyDB `FORCE ROW LEVEL SECURITY` (`SET LOCAL`) + Model Armor (`400`/`422`) & Cloud DLP',
            'Dedicated CMEK AlloyDB instance + `<60s` `HTTP 423 Locked` customer key kill-switch',
          ],
          [
            'Unit economics & target tier',
            'High breach risk • Fails enterprise CISO security & compliance review',
            '`120 RPM Pool / tenant / month` • High-volume commercial B2B SaaS (`10/10` breach tests PASS)',
            '`600 RPM Silo / tenant / month` • Regulated Banking, Healthcare & Public Sector (`6/6` PASS)',
          ],
        ],
        bullets: [],
        specs: [],
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
          'Competing tenants FinVault Bank (Enterprise) and RetailStream Corp (Standard) enter the single shared GCP project (`cymbal-pooled-saas-prod`) through one External Application Load Balancer.',
          'Zone 1 (Hop 1 Shared Edge PEP): Cloud Armor strips spoofed `X-Tenant-Id` headers and IAP + STS mints RFC 9449 DPoP-bound `CryptographicContext` tokens.',
          'Zone 2 (Hop 2 Central Governance & FinOps): Discovery Engine Agent Catalog filters visible tools, manages the 90% shared `ContextCacheConfig` prefix, and logs BigQuery OTel spans.',
          'Zone 3 Sub-Plane A (Hops 3 & 4 Shared Pooled Runtime): Executes all tenants on one shared Agent Engine pool with Memorystore Valkey RPM bulkheads (`120`/`600` RPM), `4k`/`8k` budget caps, and inline Model Armor + Cloud DLP.',
          'Zone 3 Sub-Plane B (Hop 5 Shared Data Plane): Co-hosts all tenants in one shared AlloyDB (`FORCE ROW LEVEL SECURITY`), 5-level `{tenant_id}:*` Memory Bank, and BigQuery RLS tier with 3LO DPoP binding.',
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
          'Zone 3 (Serverless Agent Compute): Deploys `google_cloud_run_v2_service` (ADK gateway) bound to least-privilege IAM and KMS encryption.',
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
        sla: '120 RPM Pool Baseline Unit Cost per Tenant with 100% Logical Isolation',
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
      'Regulatory Sovereignty Mandates: Banking (OCC/FFIEC), healthcare (HIPAA), and public-sector auditors require zero shared compute or storage.',
      '80% Reusable Core, 20% Perimeter: Pattern B deploys the exact same 5-hop Python ADK runtime inside a dedicated per-tenant GCP project.',
      'Three Hardware Perimeter Walls: Every tenant silo is locked by mTLS + IAM PAB, a VPC Service Controls perimeter, and dedicated Cloud KMS CMEK.',
      'Sub-60s Customer CMEK Kill-Switch: Disabling the tenant Cloud KMS key halts Agent Engine memory, AlloyDB reads, and GKE inference (`HTTP 423`).',
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
        heading: 'Use cases — Regulated Banking, Healthcare & Defense on Sovereign Google Cloud Stack',
        layout: 'cards',
        bullets: [
          'The Regulated CISO Threat Model (Zero Physical Blast Radius): Tier-1 banks (OCC/FFIEC, EU DORA) and healthcare systems (HIPAA) mandate physically separate GCP projects (`cymbal-{tenant}-silo-prod`) with zero shared compute or databases.',
          'FinVault Bank Sovereign Vault (`cymbal-finvault-silo-prod`): Runs air-gapped Gemma 3 (27B IT) on private GKE GPU nodes (`172.16.0.2/28`, 0 public IPs) alongside private Agent Alpha (Gemini 2.5 Pro Dedicated PT) and CMEK AlloyDB.',
          'RetailStream Sovereign Vault (`cymbal-retailstream-silo-prod`): Demonstrates dual-silo parity with its own VPC Service Controls perimeter, IAM Principal Access Boundary (PAB), Entra ID 3LO connectors, and independent Cloud KMS CMEK key ring.',
          '3-Wall Hardware Perimeter & <60s CMEK Kill-Switch Stack: BeyondCorp mTLS, IAM PAB, VPC-SC, Cloud KMS CMEK (`HTTP 423 Locked`), Model Armor, Cloud DLP, AlloyDB, and BigQuery wrap the unchanged 80% reusable ADK core.',
        ],
        specs: [
          {
            stack: 'Dedicated Per-Tenant GCP Project • Dedicated VPC (10.30.0.0/20) • Dedicated AlloyDB & Memory Bank',
            sla: 'Reduces Cross-Tenant Blast Radius to Absolute Zero at the GCP Project & Hypervisor Layer',
            tag: '1. Regulated CISO Sovereignty Mandate',
          },
          {
            stack: 'cymbal-finvault-silo-prod • Air-Gapped GKE Gemma 3 (27B) • Gemini 2.5 Pro PT • finvault-silo-cmek',
            sla: 'Tier: SOVEREIGN (600 RPM Silo) • Zero Public Egress • <60s HTTP 423 CMEK Revocation + L1 Purge',
            tag: '2. FinVault Bank Sovereign Vault',
          },
          {
            stack: 'cymbal-retailstream-silo-prod • Independent VPC-SC Perimeter • Independent IAM PAB & KMS Key Ring',
            sla: 'Verified Dual-Tenant Silo & CMEK Kill-Switch Parity (Forensic Gate F-08 & Silo Test 6 PASS)',
            tag: '3. RetailStream Sovereign Vault',
          },
          {
            stack: 'BeyondCorp mTLS • IAM PAB • VPC-SC • Cloud KMS CMEK • Model Armor • Cloud DLP • 3.6 Terraform',
            sla: '80% Shared ADK Code + 20% Declarative Sovereign Shell • 6/6 Sovereign Security Tests PASS',
            tag: '4. Unified Pattern B Sovereign Stack',
          },
        ],
      },
      {
        heading: 'Design alternatives — Sovereign Silo Architecture & Model Hosting Comparison (Pattern B Options)',
        layout: 'table',
        tableHeaders: [
          'Sovereign Dimension',
          'Pattern A: Logical Pool (120 RPM Pool Baseline)',
          'Pattern B1: VPC-SC + Vertex AI Dedicated PT',
          'Pattern B2: VPC-SC + Air-Gapped GKE Gemma 3',
        ],
        tableColW: [2.25, 3.25, 3.50, 3.533],
        tableRows: [
          [
            'Cloud project & blast radius',
            'Single shared GCP project (`cymbal-control-plane`); logical software isolation',
            'Dedicated GCP project (`cymbal-{tenant}-silo-prod`); zero shared compute or DB',
            'Dedicated GCP project + air-gapped VPC (`10.30.0.0/20`, `0.0.0.0/0` egress blocked)',
          ],
          [
            'Identity & perimeter walls',
            'Cloud Armor WAF + IAP OIDC + RFC 8693 OBO & RFC 9449 DPoP tokens',
            'BeyondCorp mTLS cert pinning + IAM PAB + VPC Service Controls (`Restricted VIP`)',
            'BeyondCorp mTLS + IAM PAB + VPC-SC + private GKE control plane (`172.16.0.2/28`)',
          ],
          [
            'Foundation model hosting',
            'Shared Gemini 2.5 Pro pay-as-you-go with 90% `ContextCacheConfig` prefix cache',
            'Dedicated Gemini 2.5 Pro Provisioned Throughput inside tenant VPC-SC perimeter',
            'Self-hosted open-weight Gemma 3 (27B IT) on private GKE L4/A100 GPU node pool',
          ],
          [
            'CMEK encryption & kill-switch',
            'Envelope KMS encryption per Memory Bank namespace (`mem://{tenant_id}/L1..L5`)',
            'Ubiquitous tenant Cloud KMS CMEK across Vertex AI, AlloyDB, GCS & BigQuery',
            'Ubiquitous Cloud KMS CMEK + GKE boot/etcd disks (`<60s` `HTTP 423 Locked` + L1 purge)',
          ],
          [
            'Provisioning & Terraform IaC',
            'Instant Firestore tenant profile insert (`<50ms` commercial self-service)',
            '4-stage automated silo factory (`3.6-terraform-silo-blueprint`, `<12 min` stamp-out)',
            '4-stage silo factory + private GKE GPU cluster & local Artifact Registry mirror',
          ],
          [
            'Unit economics & target workload',
            '`120 RPM Pool / tenant / month` • High-volume commercial B2B SaaS (`10/10` PASS)',
            '`600 RPM Silo / tenant / month` • OCC/FFIEC banking, HIPAA healthcare & EU DORA (`6/6` PASS)',
            '`Air-Gapped GPU / tenant / month` • Sovereign defense, core ledger & strict open-weight mandates',
          ],
        ],
        bullets: [],
        specs: [],
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
        stack: 'core-cymbal-agent/ (Shared Python ADK) + 3.6-terraform-silo-blueprint',
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
      'Unified SaaS Front Door: Pattern C fronts Standard pooled tenants (120 RPM) and Enterprise PSC spokes (600 RPM) behind one Global ALB URL.',
      'Cryptographic Tier Routing: Cloud Armor, IAP, and the Hybrid Router verify OBO/DPoP tokens and query Firestore to dispatch per tenant tier.',
      'Unidirectional PSC Bridges: Enterprise turns traverse NAT PSC endpoints (`10.10.0.50`) into dedicated spoke projects with zero VPC peering.',
      'Zero-Downtime Tier Promotion: `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY` promotes live tenants to Enterprise spokes with 0 dropped turns.',
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
        heading: 'Use cases — Multi-Tier SaaS Serving Standard Pool & Enterprise Spokes on One Google Cloud Stack',
        layout: 'cards',
        bullets: [
          'Unified SaaS Front Door (`cymbal-hybrid-hub-prod`): Standard and Enterprise customers connect to one public ALB hostname (`agents.cymbal.cloud`), where Cloud Armor, IAP, and the Cloud Run Hybrid Router resolve tier routes in Firestore.',
          'Standard Commercial Tier Profile (RetailStream Baseline -> Live Promotion): Starts in the shared Pattern A pool (120 RPM Pool, 4,000-token cap, 120 RPM, AlloyDB RLS) and upgrades live mid-conversation into a dedicated Enterprise PSC spoke (`0` dropped turns).',
          'Regulated Enterprise Spoke Profile (FinVault Spoke `10.10.0.50`): Traverses a unidirectional Private Service Connect endpoint into a dedicated VPC-SC & Cloud KMS CMEK spoke project (600 RPM Silo, 8,000-token budget, 600 RPM, private Agent Alpha).',
          'Unified Hybrid Google Cloud Stack (`4.6` Dual-Provider Terraform): Combines Cloud Armor, IAP OBO/DPoP, Federated Agent Registry, Firestore Route Table, PSC `ServiceAttachment` (`/24` NAT), Datastream CDC, AlloyDB, and BigQuery OTel.',
        ],
        specs: [
          {
            stack: 'Global ALB • Cloud Armor • IAP STS • Cloud Run Hybrid Router • Firestore Route Table',
            sla: 'Single SaaS Codebase & URL • Sub-2ms Cryptographic Tier Lookup (pool:// vs. psc://)',
            tag: '1. Unified Hybrid Control Plane',
          },
          {
            stack: 'Route: pool://shared-runtime -> Live 3-Phase Promotion -> psc://10.10.0.51 (RetailStream)',
            sla: 'Starts at 120 RPM Pool (4k Cap / 120 RPM) • Upgrades Live to Enterprise Spoke with 0 Dropped Chats',
            tag: '2. Land-and-Expand Tenant (RetailStream)',
          },
          {
            stack: 'Route: psc://10.10.0.50 -> finvault-agent-spoke-psc (ACCEPT_MANUAL) • VPC-SC & CMEK',
            sla: 'Tier: ENTERPRISE (600 RPM Silo) • 600 RPM • 8,000 Thinking Budget • Reuses 10.40.0.0/20 CIDR',
            tag: '3. Sovereign Spoke Tenant (FinVault)',
          },
          {
            stack: 'Private Service Connect (PSC) • Datastream CDC • AlloyDB RLS/CMEK • 4.6 Terraform Blueprint',
            sla: '74% Lower Portfolio Cloud TCO (950 Pool + 50 Spokes) • 4/4 Live Migration Tests PASS',
            tag: '4. Unified Pattern C Hybrid Stack',
          },
        ],
      },
      {
        heading: 'Design alternatives — Cross-Project Connectivity & Live Tier Migration Comparison (Pattern C vs. Legacy)',
        layout: 'table',
        tableHeaders: [
          'Hybrid Connectivity Dimension',
          'Dual Disconnected Products (Pool + Silo Fork)',
          'Legacy VPC Network Peering Hub-and-Spoke',
          'Pattern C: Private Service Connect (PSC) + Live Migrator',
        ],
        tableColW: [2.25, 3.25, 3.45, 3.583],
        tableRows: [
          [
            'SaaS front door & API surface',
            'Two separate URLs & codebases (`app.cymbal.cloud` vs. `{tenant}.cymbal.cloud`)',
            'Single Hub ALB, but flat Layer-3 routed network across tenant projects',
            'Single SaaS URL (`agents.cymbal.cloud`) + Hop 1 Firestore cryptographic tier router',
          ],
          [
            'Cross-project network topology',
            'Public internet egress or manual per-customer IPsec VPN tunnels',
            'Bidirectional VPC Peering (hard `25-peer` quota limit per Hub VPC)',
            'Unidirectional PSC Consumer (`10.10.0.50`) -> Spoke `ServiceAttachment` (`1,000+` spokes)',
          ],
          [
            'IP address & CIDR management',
            'Manual non-overlapping CIDR spreadsheet per enterprise customer',
            'Every spoke requires globally unique RFC 1918 subnets (CIDR exhaustion)',
            'Zero CIDR overlap: `/24` PSC NAT allows all spokes to reuse identical `10.40.0.0/20`',
          ],
          [
            'Lateral movement blast radius',
            'Compromised shared control plane can reach external endpoints',
            'Bidirectional L3 routes allow spoke-to-hub packet initiation if spoke is breached',
            'Strictly unidirectional Hub -> Spoke NAT (`ACCEPT_MANUAL`, hub project allowlist)',
          ],
          [
            'Standard -> Enterprise upgrade',
            'Offline DB dump/restore window; new URL, new API keys & OAuth 3LO re-consent',
            'Manual DB migration + DNS cutover; active user chat sessions dropped',
            '3-phase live migrator (`SHADOW_SYNC` -> `ATOMIC_CUTOVER` -> `0` dropped sessions)',
          ],
          [
            '1,000-tenant portfolio FinOps',
            '2x engineering maintenance overhead + high customer churn on upgrade friction',
            'Hard scaling ceiling at 25 Enterprise tenants per Hub VPC network',
            '`74%` lower TCO (`950 Pooled + 50 Spokes` vs. `1,000 All-Siloed` all-silo) + `4/4` migration tests PASS',
          ],
        ],
        bullets: [],
        specs: [],
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
        bullets: [],
        specs: [],
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
        sla: 'Single SaaS Codebase & URL Serving Both 120 RPM Pool Standard & 600 RPM Silo Enterprise Tiers',
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
      'Workstream 5 capstone: 2-question topology decision tree, side-by-side Well-Architected comparison matrix, 1,000-tenant FinOps TCO model, and 3-stage elastic tenant tier lifecycle',
    tldr: [
      '2-Question Pattern Selector: Q1 checks if 100% of tenants require dedicated projects (Pattern B); Q2 separates single-tier (A) from multi-tier (C).',
      '80% Reusable 5-Hop Codebase: Engineering writes the 5-hop ADK security pipeline once; Patterns A, B, and C parameterize the cloud boundary.',
      'Multi-Tenant Agentic Triad: Balances Zero-Trust 5-Hop Security, Predictable FinOps Unit Economics, and Zero-PII BigQuery OTel Chargeback.',
      '1,000-Tenant Portfolio TCO: Across 950 Standard and 50 Enterprise tenants, Pattern C cuts token spend by 84.7% and total cloud TCO by 74%.',
      'Elastic 3-Stage Tenant Tier Lifecycle: Onboard commercial tenants in <50ms into Pattern A (120 RPM Pool), promote expanding enterprises live into Pattern C PSC spokes (0ms lag, 0 dropped turns), and enforce <60s HTTP 423 CMEK kill-switches in Pattern B silos.',
    ],
    tldrSpecs: [
      {
        stack: 'Q1: Regulatory Silo Mandate? (Yes -> B) • Q2: Multi-Tier Packaging? (No -> A, Yes -> C)',
        sla: 'Deterministic Mapping from Legal/Product Requirements to Cloud Topology',
        tag: '2-Question Decision Tree',
      },
      {
        stack: 'core-cymbal-agent/ (Python ADK) • 5-Hop Security Pipeline • Terraform (2.6, 3.6, 4.6)',
        sla: '80% Identical Application Code Across Pooled, Siloed & Hybrid Deployments',
        tag: 'Unified Engineering Leverage',
      },
      {
        stack: 'Pillar 1: 5-Hop Zero Trust • Pillar 2: 90% Cache & Quotas • Pillar 3: BigQuery OTel',
        sla: 'Eliminates the False Trade-Off Between CISO Security and CFO Gross Margin',
        tag: 'Multi-Tenant Agentic Triad',
      },
      {
        stack: '950 Standard Pooled (120 RPM Pool) + 50 Enterprise PSC Spokes (600 RPM Silo)',
        sla: '74% Lower Total Cloud Spend vs. 1,000 Silos • 84.7% Net Token Cost Reduction',
        tag: '1,000-Tenant FinOps Model',
      },
      {
        stack: 'Stage 1: Pooled (120 RPM Pool) -> Stage 2: Live PSC Promotion (0ms Lag) -> Stage 3: CMEK Silo',
        sla: '13/13 Forensic Gates & 20/20 Automated Simulations Verified Across All 3 Tiers',
        tag: '3-Stage Tenant Lifecycle',
      },
    ],
    sections: [
      {
        heading: 'Use cases — 2-Question Topology Selector, Competing Tenant Profiles & Unified Google Cloud Stack',
        layout: 'cards',
        bullets: [
          'Decision Gate 1 (Universal Regulatory Sovereignty Mandate): Do 100% of your customers legally require dedicated GCP projects, VPC Service Controls, IAM PAB, and customer-revocable CMEK kill-switches? If YES, standardize on Pattern B (600 RPM Silo).',
          'Decision Gate 2 (Single-Tier vs. Multi-Tier SaaS Packaging): If not all customers require physical silos, choose Pattern A (120 RPM Pool shared pool, 90% prefix cache) for one uniform commercial tier, or Pattern C (74% TCO savings) for multi-tier portfolios.',
          'Competing Tenant Profiles (FinVault Bank vs. RetailStream Corp): Co-host RetailStream in the 120 RPM Pool Standard pool (Entra ID, 4k cap, 120 RPM) and isolate FinVault in an 600 RPM Silo Enterprise spoke/silo (Workspace, 8k cap, 600 RPM, Agent Alpha, CMEK).',
          'One 80% Reusable 5-Hop Google Cloud Stack: Cloud Armor, IAP OBO/DPoP, Agent Engine Registry, Memorystore Valkey, Gemini 2.5 Pro / Gemma 3, Model Armor, Cloud DLP, AlloyDB RLS/CMEK, and BigQuery OTel power all three patterns without code forks.',
        ],
        specs: [
          {
            stack: 'Mandate: OCC / HIPAA / FedRAMP High / EU DORA Across 100% of Customer Contracts',
            sla: 'Gate 1: YES -> Select Pattern B (Sovereign Silos • 600 RPM Silo • VPC-SC + PAB + CMEK)',
            tag: '1. Decision Gate 1: Sovereignty',
          },
          {
            stack: 'Uniform Commercial B2B SaaS -> Pattern A • Multi-Tier Standard + Enterprise -> Pattern C',
            sla: 'Gate 2: Select Pattern A (120 RPM Pool) or Pattern C (Pool + PSC Spokes + 0ms Live Upgrade)',
            tag: '2. Decision Gate 2: Packaging',
          },
          {
            stack: 'FinVault Bank (600 RPM Silo Enterprise Spoke/Silo) vs. RetailStream (120 RPM Pool Standard Pool)',
            sla: 'Zero Cross-Tenant Bleed + Live Mid-Conversation Promotion from Pool to PSC Spoke',
            tag: '3. Competing Enterprise Tenants',
          },
          {
            stack: 'Cloud Armor • IAP • Agent Engine • Gemini 2.5 Pro • Valkey • Model Armor • AlloyDB • BigQuery',
            sla: '80% Identical Python ADK Codebase • 13/13 Forensic Gates & 20/20 Simulations PASS',
            tag: '4. Unified 5-Hop Google Cloud Stack',
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
            '`950 Pooled / mo` (1,000 Pooled tenants @ `120 RPM / 4k Budget`; `84.7%` net token cost reduction)',
            '`1,000 Siloed / mo` (1,000 Dedicated Silo projects @ `600 RPM / 8k Budget` sovereign floor)',
            '`950 Pool + 50 Spoke / mo` (950 Pooled + 50 PSC Spokes -> `74%` lower TCO vs. all-siloed)',
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
        heading: 'Design considerations — Unified 5-Hop Module Mapping & 20/20 Verification Matrix Across Patterns A, B & C',
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
            'Cloud Armor WAF strips `X-Tenant-Id` + IAP OIDC + RFC 8693 OBO & RFC 9449 DPoP (`Test 1 PASS`)',
            'BeyondCorp mTLS cert pinning (`HTTP 401`) + IAM Principal Access Boundary (`Tests 1–2 PASS`)',
            'Hub ALB OIDC/DPoP verification + Firestore authoritative route lookup (`Hybrid Test 1 PASS`)',
          ],
          [
            'Hop 2: Registry Discovery\n`Hop2AgentRegistryDiscovery`',
            'Shared Agent Engine Registry filtered by `tenant_id` visibility predicate (`Tests 2–3 PASS`)',
            'Silo-local Agent Registry wrapped inside per-tenant VPC-SC perimeter (`Test 3 PASS`)',
            'Federated Hub-and-Spoke Agent Registry across Pool & PSC Spokes (`Hybrid Test 2 PASS`)',
          ],
          [
            'Hop 3: Runtime & Memory\n`Hop3RuntimeAndMemory`',
            'Cloud Run v2 + Valkey RPM (`120`/`600`, `429`) + L1–L5 Memory namespaces (`Tests 6–7 PASS`)',
            'Live Cloud KMS CMEK heartbeat (`<60s HTTP 423`) + private GKE Gemma 3 27B (`Tests 4A–5 PASS`)',
            'Tiered dispatch: `pool://` (`4k` cap) vs. unidirectional `psc://10.10.0.50` (`8k` cap, `Test 3 PASS`)',
          ],
          [
            'Hop 4: Safety & DLP\n`Hop4ModelArmorAndDlp`',
            'Model Armor (`400` injection / `422` NLC) + Cloud DLP PII masking + `-32042` 3LO (`Tests 4,5,8,10 PASS`)',
            'In-perimeter silo Model Armor & regulatory NLC templates (OCC/HIPAA) (`Silo Gate PASS`)',
            'Shared pool safety floor for Standard; dedicated spoke DLP/NLCs for Enterprise (`Spoke Gate PASS`)',
          ],
          [
            'Hop 5: Data & FinOps\n`Hop5DataAndFinOps`',
            'Shared AlloyDB `FORCE ROW LEVEL SECURITY` (`0` leaked rows) + BigQuery OTel (`Test 9 & F-08 PASS`)',
            'Dedicated CMEK AlloyDB + Dual-Silo RetailStream/FinVault parity (`Test 6 & F-08 PASS`)',
            '3-phase zero-downtime CDC live migrator (`0ms` lag, `0` dropped turns, `Hybrid Test 4 & F-09 PASS`)',
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
          '1,000-Tenant Portfolio Financial Proof: Across 950 Standard and 50 Enterprise tenants, the Agentic Triad saves 90% Cache Hit in cloud infrastructure and reduces per-turn LLM token costs by 84.7%.',
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
            stack: '950 Pooled (950 Pooled Tenants) + 50 Spokes (50 PSC Spoke Tenants) = 950 Pooled + 50 Dedicated PSC Spokes All-Silo',
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
        heading: 'What’s next — 3-Stage Technical Solution Lifecycle & GA Feature Drop-In Continuity',
        layout: 'cards',
        bullets: [
          'Stage 1 (Commercial Self-Service Onboarding — Pattern A Pool): Provision Standard tenants in <50ms via Firestore metadata into the 120 RPM Pool shared pool with 90% prefix caching, AlloyDB RLS, and 10/10 breach defenses.',
          'Stage 2 (Zero-Downtime Enterprise Tier Promotion — Pattern C PSC Spoke): Upgrade expanding tenants live via the 3-phase state machine (`SHADOW_SYNC` -> `ATOMIC_CUTOVER` -> `DRAIN_AND_VERIFY`) over Private Service Connect (`0` dropped sessions).',
          'Stage 3 (Regulated Sovereign Vault & <60s Kill-Switch — Pattern B Silo): Stamp out dedicated per-tenant GCP projects (`3.6-terraform-silo-blueprint`) with VPC-SC, IAM PAB, air-gapped Gemma 3 27B, and `<60s` `HTTP 423` CMEK revocation.',
          'Seamless EAP-to-GA Drop-In Continuity (`GAP-01..05`): All 5 compensating controls in `core-cymbal-agent/` protect production workloads today and swap cleanly as native Agent Registry tenant ACLs and per-tenant Memory CMEK reach GA.',
        ],
        specs: [
          {
            stack: 'Deliverables: WS1 Taxonomy + WS2 Pooled Runtime + 2.6 Terraform Starter',
            sla: 'Gate: 10/10 Breach Simulations PASS & 84.7% Prefix Cache Savings Verified (120 RPM Pool Floor)',
            tag: 'Stage 1: Pattern A Pooled Tier',
          },
          {
            stack: 'Deliverables: WS4 Hybrid PSC Router + 3-Phase Migrator + 4.6 Terraform PSC',
            sla: 'Gate: 4/4 Zero-Downtime Tier Promotion Tests PASS (0ms Lag, 0 Dropped Chats, 74% TCO Savings)',
            tag: 'Stage 2: Pattern C Hybrid PSC Tier',
          },
          {
            stack: 'Deliverables: WS3 Sovereign Silo Engine + 3.6 Terraform Silo Blueprint',
            sla: 'Gate: 6/6 Sovereign Perimeter & Sub-60s HTTP 423 CMEK Kill-Switch Tests PASS (600 RPM Silo Floor)',
            tag: 'Stage 3: Pattern B Sovereign Tier',
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
          'Zone 1 (1. The 2-Question Executive Topology Selector): Evaluates `Decision inputs` (`Step 1`), `Q1 · Compliance gate` (`100% mandate VPC-SC or air-gap?` at `Step 2`), and `Q2 · Tier gate` (`Multi-tier Standard + Enterprise?` at `Step 3`).',
          'Zone 2 (2. The Agentic Triad — 80% Reusable Core): Unifies `Pillar 1 • Zero-Trust 5-Hop`, `Pillar 2 • Predictable FinOps`, and `Pillar 3 • Zero-PII OTel Chargeback` (`Step 7`) above the `AGENTIC TRIAD CORE` banner.',
          'Pattern B Outcome Column (`Q1 = YES` -> `Step 4`): Provisions `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`).',
          'Pattern A Outcome Column (`Q2 = NO` -> `Step 5`): Provisions `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`).',
          'Pattern C Outcome Column (`Q2 = YES` -> `Step 6`): Provisions `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`).',
        ],
      },
    ],
    takeaways: [
      'Resolve Regulatory Mandates Before Product Packaging: Always evaluate whether compliance requires physical per-tenant projects (Gate 1 -> Pattern B) before choosing between single-tier (Pattern A) and multi-tier (Pattern C).',
      'Standardize on One 5-Hop Security Pipeline Across All Tiers: Keep 80% of your Python ADK application code identical across Pooled, Siloed, and Hybrid environments.',
      'Treat Pooled ($), Hybrid ($$), and Siloed ($$$) as One Continuous Platform: Use Firestore routing metadata and Private Service Connect to move tenants across tiers without changing URLs or rewriting agents.',
      'Balance All Three Pillars of the Agentic Triad: Combining 5-hop zero-trust security, 90% prefix caching + Valkey bulkheads, and zero-PII BigQuery OTel chargeback protects both CISO compliance and CFO margins.',
      'Gate Every Production Release on the 13-Point Forensic & 20-Test Simulation Suite: Run `python3 -B scripts/run_deep_forensic_audit.py` to certify code, diagrams, Terraform blueprints, and live GCP resources.',
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
        sla: 'Zero-Downtime Tenant Promotion from 120 RPM Pool to 600 RPM Silo Dedicated Spoke',
        tag: 'Takeaway 3: Elastic Tier Mobility',
      },
      {
        stack: 'Security (5 Hops) + Economics (90% Cache / Valkey) + FinOps (BigQuery OTel)',
        sla: '84.7% Token Cost Reduction • 74% Portfolio Cloud Savings • 99.99% Uptime SLA',
        tag: 'Takeaway 4: The Agentic Triad',
      },
      {
        stack: 'scripts/run_deep_forensic_audit.py • 13/13 Forensic Gates • 20/20 Simulations',
        sla: '100% Automated Verification Across Code, Diagrams, Slides & Live GCP Resources',
        tag: 'Takeaway 5: Continuous Governance',
      },
    ],
    callToAction:
      'Walk through the 2-question topology decision tree with your architecture and security review boards, execute the 20-assertion verification suite, and deploy the 3-stage elastic multi-tenant architecture.',
  },
};

for (const [relPath, content] of Object.entries(DECKS)) {
  const absPath = path.join(ROOT, relPath);
  const enriched = {
    ...content,
    slideSpeakerNotes: getDeckSlideNotesList(content.workstream),
  };
  fs.writeFileSync(absPath, JSON.stringify(enriched, null, 2) + '\n', 'utf8');
  console.log(`✅ Wrote ${relPath} (${enriched.slideSpeakerNotes.length} human-readable speaker notes)`);
}
