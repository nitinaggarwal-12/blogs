---
title: "Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad"
subtitle: "Choose between Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C) topologies on Google Cloud using a 2-question decision tree, side-by-side comparison matrix, and 3-stage technical solution lifecycle"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 5 of 5"
workstream: "Workstream 5 • Wrap-Up: Pattern Comparison, Decision Guide & Capstone Backlog (5.1 + 5.2)"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "CTOs, Principal Architects, CISOs, and Platform Product Managers designing multi-tenant AI platforms on Google Cloud"
reading_time: "14 min read"
tags: ["Multi-Tenancy","Vertex AI Agent Engine","ADK","Decision Guide","Zero Trust","FinOps","OpenTelemetry","VPC-SC","Private Service Connect","AlloyDB RLS"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws5-decision-tree-and-agentic-triad"]
editable_slides: "slides/ws5-wrap-up-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Executive decision guide and the Multi-Tenant Agentic Triad

This document provides an executive decision framework to help you select, combine, and operate the right multi-tenant isolation topology for agentic AI systems on Google Cloud. It synthesizes the architectural patterns, security verification suites, and FinOps benchmarks from across this 5-part series—[Part 1 (Reference Taxonomy & 5-Hop Baseline)](ws1-reference-architecture-taxonomy-and-5hop-baseline.md), [Part 2 (Pattern A Pooled)](ws2-pattern-a-pooled-architecture.md), [Part 3 (Pattern B Sovereign Silos)](ws3-pattern-b-sovereign-silos.md), and [Part 4 (Pattern C Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md)—into a two-question decision tree and the **Multi-Tenant Agentic Triad**.

This document is intended for CTOs, principal cloud architects, CISOs, and AI product leaders evaluating [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/) for multi-customer B2B SaaS or internal enterprise platform deployments.

> **Key point:** Two gating questions determine your topology: (1) *Do 100% of your customers legally mandate dedicated Google Cloud projects, VPC Service Controls perimeters, or air-gapped open-weight models?* If yes, deploy **Pattern B (Sovereign Silos)**. (2) *If not, do you sell multiple pricing tiers (a shared Standard tier plus a dedicated Enterprise tier)?* If no, deploy **Pattern A (Pooled)**; if yes, deploy **Pattern C (Dynamic Hybrid)**.

## Use cases

Use the following decision rules ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)) to map your business model to the appropriate architecture:

- **Choose Pattern A (Pooled Architecture)** when you operate a uniform, high-volume B2B SaaS product where fast self-service onboarding, 90% shared prompt cache savings, and lowest unit COGS (`120 RPM Pool` baseline) are primary goals, and customers accept cryptographic/logical isolation within a shared project.
- **Choose Pattern B (Sovereign Silos)** when 100% of your customers are regulated financial, healthcare, or public-sector entities whose contracts prohibit shared compute pools or shared databases and mandate per-customer VPC Service Controls perimeters, customer-managed KMS kill-switches, or air-gapped Gemma 3 on GKE.
- **Choose Pattern C (Dynamic Hybrid)** when you sell multi-tiered SaaS packaging (such as a Standard tier alongside a regulated Enterprise tier) and need a single control plane that can promote live customers from the shared pool into dedicated Private Service Connect spokes with zero downtime.

## Design alternatives

### End-to-end comparison of Pattern A, Pattern B, and Pattern C

The following executive matrix summarizes all 20 verified runtime simulations and architectural trade-offs across the three patterns:

| Architectural dimension | Pattern A: Pooled ([WS2](ws2-pattern-a-pooled-architecture.md)) | Pattern B: Sovereign Silos ([WS3](ws3-pattern-b-sovereign-silos.md)) | Pattern C: Dynamic Hybrid ([WS4](ws4-pattern-c-hybrid-dynamic-tiering.md)) |
| :--- | :--- | :--- | :--- |
| **GCP project topology** | 1 shared project (`cymbal-pooled-saas-prod`) | 1 dedicated project per tenant (`cymbal-{tenant}-silo-prod`) | 1 hub project + shared pool + N dedicated PSC spoke projects |
| **80% reusable agent core** | `core-cymbal-agent/` (5-Hop Chain) | Unchanged `core-cymbal-agent/` + Sovereign Shell | Unchanged `core-cymbal-agent/` + Hybrid Router & Migrator |
| **Network isolation** | Shared VPC + Cloud Armor + IAP | Per-project **VPC-SC perimeter** + **mTLS SPIFFE** | Hub VPC + unidirectional **Private Service Connect (PSC)** NAT |
| **Database & memory isolation** | Shared AlloyDB **`FORCE ROW LEVEL SECURITY`** + composite memory keys | Dedicated **CMEK AlloyDB** & Memory Bank per project | Shared RLS for Standard + dedicated CMEK AlloyDB via PSC for Enterprise |
| **Encryption kill-switch** | Logical key check in Hop 3 | Project-wide **Cloud KMS CMEK** (`HTTP 423 Locked`) | Per-spoke **Cloud KMS CMEK** (`HTTP 423 Locked`) for Enterprise tier |
| **Model & caching strategy** | Shared Gemini 2.5 Pro + **90% `ContextCacheConfig` savings** | Dedicated Vertex AI PT or **air-gapped Gemma 3 (27B) on GKE** | Pooled caching for Standard + Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) for Enterprise |
| **Live tier upgrade path** | Requires migration to Pattern C | Static sovereign project | **Built-in 3-phase live migration** (`0` dropped turns) |
| **Baseline monthly cost floor** | **`120 RPM Pool / mo`** per tenant (`$`) | **`600 RPM Silo / mo`** per silo (`$$$`) | **`Hybrid PSC / mo`** blended across tiers (`$$`) |
| **Automated verification suite** | `10/10` red-team breach tests PASS | `6/6` sovereign security tests PASS | `4/4` hybrid & live migration tests PASS |

### The 5-Hop Cryptographic Context Chain invariant

Regardless of which topology you select, the same five governance modules in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) execute on every turn:

| Hop | Governance module | Security, FinOps, or observability invariant |
| :--- | :--- | :--- |
| **Hop 1** | [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Strips `X-Tenant-ID`; validates OIDC/Entra JWT; mints RFC 8693 OBO token bound to RFC 9449 DPoP `jkt` |
| **Hop 2** | [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | Enforces Discovery Engine Catalog ACLs (`403` on private `Agent Alpha`) + ADK `before_agent_callback` tool pruning |
| **Hop 3** | [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | Binds `temp:tenant_id`; enforces Valkey RPM (`429`), token clamp (`4k/8k`), `ContextCacheConfig`, and CMEK (`423`) |
| **Hop 4** | [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Runs bi-directional Model Armor (`400`/`422`) + Cloud DLP redaction + DPoP-bound 3LO MCP verification (`401`) |
| **Hop 5** | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Enforces transactional AlloyDB `FORCE ROW LEVEL SECURITY` (`SET LOCAL app.current_tenant_id`) and exports PII-scrubbed OTel FinOps spans to BigQuery |

## Architecture

The following diagram shows the executive topology decision tree and the **Multi-Tenant Agentic Triad** (Zero-Trust Security, Predictable FinOps Economics, and Privacy-Preserving Observability) governing all three patterns:

![Figure 1 — Executive decision tree, Pattern A/B/C selector, and the Multi-Tenant Agentic Triad](../diagrams/ws5-decision-tree-and-agentic-triad.drawio.png)

*Figure 1. Rule 53G 3-Outcome Decision-Tree Blueprint (46 vertices, 19 edges) showing the 2-Question Executive Topology Selector (Zone 1 `#aecbfa`), the Multi-Tenant Agentic Triad 80% Reusable Core (Zone 2 `#ceead6`), and the three side-by-side Pattern Outcome Columns: Pattern B Sovereign Silos (`#fad2cf`, Step 4), Pattern A Pooled (`#feefc3`, Step 5), and Pattern C Hybrid PSC (`#e8eaed`, Step 6). Editable assets: [Draw.io source](../diagrams/ws5-decision-tree-and-agentic-triad.drawio) | [Google Slides (.pptx)](../slides/ws5-wrap-up-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws5-decision-tree-and-agentic-triad.svg) | [Vision AST](../diagrams/vision_metadata/ws5-decision-tree-and-agentic-triad.vision.json).*

Figure 1 brings together the 2-question topology decision tree, the three operational pillars of the **Multi-Tenant Agentic Triad**, and the three side-by-side Pattern Outcome Columns ([5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)):

- **1. The 2-Question Executive Topology Selector (Zone 1 — Top-left blue container `#aecbfa`):** Evaluates `Decision inputs` (`Tenant tier, compliance & pricing model`), `Q1 · Compliance gate` (`100% mandate VPC-SC or air-gap?`), and `Q2 · Tier gate` (`Multi-tier Standard + Enterprise?`) before branching into the three Pattern Outcome Columns.
- **2. The Agentic Triad (80% reusable core) (Zone 2 — Top-right green container `#ceead6`):** Unifies `Pillar 1 • Zero-Trust 5-Hop` (`OBO/DPoP + Model Armor`), `Pillar 2 • Predictable FinOps` (`90% cache + Valkey cap`), and `Pillar 3 • Zero-PII OTel Chargeback` (`SDP -> BigQuery FinOps`) above the `AGENTIC TRIAD CORE` banner (`Shared across Pattern A, B & C`).
- **Pattern B — Sovereign Silos • $$$ • Terraform module 3.6 (Outcome Column 1 — Left coral container `#fad2cf`):** Triggered by `Q1 = YES (100% regulated)`: provisions `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`).
- **Pattern A — Pooled • $ • Terraform module 2.6 (Outcome Column 2 — Center amber container `#feefc3`):** Triggered by `Q2 = NO (Single tier)`: provisions `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`).
- **Pattern C — Hybrid PSC • $$ • Terraform module 4.6 (Outcome Column 3 — Right slate container `#e8eaed`):** Triggered by `Q2 = YES (Multi-tier)`: provisions `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`).

The seven numbered callouts in Figure 1 trace the 2-question decision flow and the three resulting pattern deployments:

1. **Step 1 — Ingest decision inputs (Tenant tier, compliance & pricing model):** Evaluate the SaaS product's regulatory surface area, customer contract mandates, and pricing tier packaging.
2. **Step 2 — Evaluate Q1 · Compliance gate (100% mandate VPC-SC or air-gap?):** If `Q1 = YES (100% regulated)`, route directly to **Pattern B — Sovereign Silos** (`Step 4`); if `Q1 = NO`, proceed to `Q2 · Tier gate` (`Step 3`).
3. **Step 3 — Evaluate Q2 · Tier gate (Multi-tier Standard + Enterprise?):** If `Q2 = NO (Single tier)`, route to **Pattern A — Pooled** (`Step 5`); if `Q2 = YES (Multi-tier)`, route to **Pattern C — Hybrid PSC** (`Step 6`).
4. **Step 4 — Deploy Pattern B Sovereign Silos (Terraform module 3.6):** Provision `Per-Tenant Project & VPC-SC` (`IAM PAB + KMS CMEK 423`) and `Dedicated Agent & Gemma 3` (`600 RPM • 8k budget • 6/6 tests`).
5. **Step 5 — Deploy Pattern A Pooled (Terraform module 2.6):** Provision `Shared Agent Engine Pool` (`120 RPM • 4k cap • 90% cache`) and `Shared AlloyDB & BigQuery RLS` (`FORCE RLS • 10/10 breach tests`).
6. **Step 6 — Deploy Pattern C Hybrid PSC (Terraform module 4.6):** Provision `Hybrid Router & PSC Hub` (`Pool + PSC 10.10.0.50`) and `3-Phase Live Tier Migrator` (`0-downtime upgrade • 4/4 tests`).
7. **Step 7 — Enforce the Agentic Triad Core across all patterns:** Apply `Pillar 1 • Zero-Trust 5-Hop`, `Pillar 2 • Predictable FinOps`, and `Pillar 3 • Zero-PII OTel Chargeback` (`SDP -> BigQuery FinOps`) uniformly across Pattern A, Pattern B, and Pattern C.

## Products used

This reference architecture uses the following Google Cloud products and open-source frameworks across Patterns A, B, and C:

### Agentic AI and foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview): A managed runtime environment that deploys, scales, and isolates multi-agent workloads inside gVisor sandboxes with managed session and memory state.
- [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): An open-source framework for building and orchestrating multi-agent hierarchies with deterministic lifecycle callbacks (`before_agent_callback`, `before_tool_callback`, `before_model_callback`).
- [Gemini 2.5 Pro on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models): Google's flagship multimodal reasoning model supporting shared prompt prefix caching (`ContextCacheConfig`), dedicated Provisioned Throughput (PT), and configurable `thinking_budget` controls.
- [Vertex AI Model Garden](https://cloud.google.com/model-garden): An enterprise model repository providing governed access to dedicated Provisioned Throughput endpoints (`gemini-2.5-pro-dedicated` for tenant-private agents) and open-weight models (such as Gemma 3 27B IT).
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs): A managed Kubernetes service used in Sovereign Silo deployments (Pattern B) to run air-gapped open-weight models on private GPU node pools with zero public internet egress.

### Ingress, identity, and AI safety guardrails

- [Cloud Load Balancing](https://cloud.google.com/load-balancing/docs): A global anycast External Application Load Balancer that terminates TLS 1.3 and mutual TLS (mTLS) connections at the Google network edge.
- [Google Cloud Armor](https://cloud.google.com/armor/docs): A web application firewall (WAF) and DDoS mitigation service that strips unverified client-supplied tenant headers (`X-Tenant-ID`) at ingress.
- [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap/docs) and [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation): Zero-trust authentication services that validate upstream OIDC and SAML JWTs and broker RFC 8693 On-Behalf-Of (OBO) token exchange bound to RFC 9449 DPoP sender-constrained proofs.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview): An inline AI safety service that inspects prompts, model completions, and Model Context Protocol (MCP) tool payloads for prompt injection, jailbreaks, and semantic Natural Language Policy Compliance (`NLC`) violations.
- [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): A data inspection and de-identification service that masks regulated PII, PCI, and PHI tokens inline before prompts reach foundation models or logs.

### Data, storage, networking, and governance

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs): A high-performance PostgreSQL-compatible database that enforces transactional `FORCE ROW LEVEL SECURITY (RLS)` policies keyed by `app.current_tenant_id`.
- [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview) and [Firestore](https://cloud.google.com/firestore/docs): Low-latency in-memory and document stores used for per-tenant token-bucket rate limiting, 5-level session memory caching, and dynamic tenant routing tables.
- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Private Service Connect](https://cloud.google.com/vpc/docs/private-service-connect): Network security boundaries that prevent cross-project data exfiltration and establish unidirectional NAT-based private peering between a central routing hub and isolated enterprise spokes.
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs): A cryptographic key management service supporting customer-managed encryption keys (CMEK) and instant `HTTP 423 Locked` tenant kill-switches.
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Centralized posture monitoring, PII-redacted OpenTelemetry audit logging, and per-tenant token FinOps chargeback analytics (`cymbal_agentic_finops_otel.tenant_telemetry_spans`).

## Design considerations

This section summarizes the **Multi-Tenant Agentic Triad** and maps it to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance (Pillar 1 of the Agentic Triad)

- **Defense-in-depth across all 5 hops:** Never rely on a single perimeter control. Combine Hop 1 DPoP token binding, Hop 2 deterministic callback pruning, Hop 3 memory namespacing and CMEK verification, Hop 4 inline Model Armor and DLP scanning, and Hop 5 database Row-Level Security.
- **Track Early Access Program (EAP) product roadmap transitions:** As documented in [5.1 Pattern Comparison & Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), keep the `core-cymbal-agent/` compensating controls active until native sub-project `tenant_id` ACLs in Discovery Engine and native per-tenant `ContextCacheConfig` IAM bindings reach General Availability (GA).

### Reliability

- **Prevent cascading failures across tenants:** Isolate Standard-tier tenants with Memorystore for Valkey RPM/TPM bulkheads and isolate Enterprise-tier tenants in dedicated PSC spokes with dedicated Vertex AI Provisioned Throughput quotas.

### Cost optimization (Pillar 2 of the Agentic Triad)

- **Match infrastructure cost to customer ARR:** Start with **Pattern A** in Stage 1 to capture **90% shared prompt cache savings** and `120 RPM Pool` baseline economics. Introduce **Pattern B** or **Pattern C PSC spokes** in Stages 2–3 only for Enterprise contracts that justify dedicated infrastructure.

### Operational excellence (Pillar 3 of the Agentic Triad)

- **Privacy-preserving FinOps observability:** Emit a `TenantTelemetrySpan` at **Hop 5** on every turn so product and finance teams have real-time visibility into per-tenant token consumption, cache hit ratios, and guardrail blocks in BigQuery (`cymbal_agentic_finops_otel.tenant_telemetry_spans`)—with zero raw PII stored in logs.
- **Extend the 5-Hop core across Multi-Cloud (AWS) and 3P SaaS connectors:** When enterprise tenants invoke workloads spanning Google Cloud, AWS, and third-party SaaS platforms, map each hop to its verified cross-cloud equivalent:

| 5-Hop Governance Layer | Google Cloud Primary Control | AWS Federated Equivalent (`Account 393036065405`) | 3P SaaS & Identity Connector Control |
| :--- | :--- | :--- | :--- |
| **Hop 1 (Identity PEP)** | Cloud Armor + IAP + Cloud KMS DPoP sign | AWS STS `AssumeRole` + IAM Session Tags (`TenantID`) | Google Workspace OIDC & Microsoft Entra ID v2.0 JWT |
| **Hop 2 (Catalog PDP)** | Discovery Engine Catalog + ADK `before_agent_callback` | IAM Role Inline Policy Scoping per Tenant Tag | Per-tenant MCP connector allowlist in Firestore |
| **Hop 3 (Compute & CMEK)** | Vertex AI Agent Engine + Valkey + Cloud KMS CMEK (`423`) | AWS KMS Customer-Managed Key (`ScheduleKeyDeletion` kill-switch) | Scoped 3LO token vault (`{tenant_id}:{connector_uri}`) |
| **Hop 4 (AI Guardrails)** | Vertex AI Model Armor + Cloud SDP (`400`/`422`) | Amazon Bedrock Guardrails (`ApplyGuardrail` PII/Injection) | Pre-tool & post-tool DPoP `jkt` + PII scrub |
| **Hop 5 (Data RLS & OTel)** | AlloyDB `SET LOCAL app.current_tenant_id` + BigQuery OTel | DynamoDB `LeadingKeys` RLS (`cymbal-multi-tenant-rls-vault`) + S3 SSE-KMS | ThoughtSpot, Sigma, ServiceNow, Veeva/Muse, Salesforce/Jira, Databricks, Snowflake, Workday, Datadog & CrowdStrike/Okta MCP |


### Performance optimization

- **3-stage technical solution lifecycle & progressive tier evolution:**
  - **Stage 1 (Pattern A Pooled Foundation):** Deploy `core-cymbal-agent/` and Pattern A Pooled Architecture ([Workstream 2](ws2-pattern-a-pooled-architecture.md)).
  - **Stage 2 (Pattern B Sovereign Silo Stamp-Out):** Stamp out Pattern B Sovereign Silos via Terraform for regulated anchor customers ([Workstream 3](ws3-pattern-b-sovereign-silos.md)).
  - **Stage 3 (Pattern C Dynamic Hybrid & Zero-Downtime Promotion):** Enable the Pattern C Hybrid Router and 3-phase zero-downtime live tier migrator ([Workstream 4](ws4-pattern-c-hybrid-dynamic-tiering.md)).



## Live Intra-Cloud (Google Cloud Console) & Inter-Cloud (10 Third-Party Enterprise Apps) Validation Proof — Executive Decision Guide & Unified 3-Pattern Matrix

> **Dual-Plane Live Cloud & Stateful Execution Twin Verification (Unified `30/30` Matrix (`Pattern A` vs `Pattern B` vs `Pattern C`)):** Every architectural claim in **WS5** is verified across three live Google Cloud project tiers (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#887605034827`) and a **Dual-Plane Inter-Cloud Verification Harness** on AWS (`us-east-1`, Account `393036065405`): (1) **Side A — Commercial Vendor Control-Plane & AWS Bedrock AgentCore MCP Gateway** (`kiu8omh4aq`, Targets `KD6Z3SV8PX`..`TXGJHVFBWP`), and (2) **Side B — 10 Stateful Open-Source Data/RLS Execution Twins on AWS EC2** (`i-04924523ac41ff132`, `http://13.220.94.209:3001..3010`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`) so destructive cross-tenant red-team tests execute safely without polluting shared commercial SaaS tenants.

### Part I — Intra-Cloud (Google Cloud Console) Live Validation Screenshots (WS5)

![Intra-Cloud WS5 Capstone Stage 1 — Live Google Cloud Console (`Cloud Run Source` + Docked Cloud Shell SSH) verifying the unified 80% shared 5-Hop core across Patterns A, B, and C](../screenshots/cloud-console/pantheon_live_user_capture_ssh_verify.png)

![Intra-Cloud WS5 Capstone Stage 2 — Cloud Run `cymbal-multi-tenant-agent` Source Editor (`main.py` & `runtime_pipeline.py`)](../screenshots/cloud-console/gcp_console_01_cloud_run_source_editor.png)

![Intra-Cloud WS5 Capstone Stage 3 — Cloud Run Gen2 Revisions serving the multi-pattern verification suite](../screenshots/cloud-console/gcp_console_02_cloud_run_revisions_deploy.png)

![Intra-Cloud WS5 Capstone Stage 4 — Pattern A Pooled BigQuery Studio `ROW ACCESS POLICY` (`pattern_a_pooled_rls_entities`)](../screenshots/cloud-console/gcp_console_03_bigquery_studio_pattern_a_rls.png)

![Intra-Cloud WS5 Capstone Stage 5 — Pattern B Sovereign Silo BigQuery CMEK Vault (`pattern_b_silo_finvault_cmek_vault`)](../screenshots/cloud-console/gcp_console_04_bigquery_studio_pattern_b_cmek.png)

![Intra-Cloud WS5 Capstone Stage 6 — Cloud KMS KeyRing (`cymbal-multi-tenant-kr`: `finvault-silo-cmek` `ENABLED` vs `medcore-revoked-cmek` `DISABLED`)](../screenshots/cloud-console/gcp_console_05_cloud_kms_keyring_live.png)

![Intra-Cloud WS5 Capstone Stage 7 — Pattern C Hub VPC (`cymbal-pattern-c-hub-vpc`) & `/28` PSC NAT Subnet (`10.240.0.0/28`)](../screenshots/cloud-console/gcp_console_06_vpc_psc_nat_subnet_live.png)

![Intra-Cloud WS5 Capstone Stage 8 — Cloud Logging Explorer (`20/20 PASS` across Pattern A `10/10`, Pattern B `6/6`, and Pattern C `4/4`)](../screenshots/cloud-console/gcp_console_07_logs_explorer_20_20_pass.png)

![Intra-Cloud WS5 Capstone Stage 9 — Gemini Enterprise & Vertex AI Agent Builder engines (`cymbal-pooled-prod` `#638420508320`)](../screenshots/cloud-console/gcp_console_09_vertex_ai_agent_builder_engines.png)

### Part II — Inter-Cloud Third-Party App Testing & Validation Matrix (WS5 • 10 Live AWS AgentCore MCP Targets + 10 Stateful Execution Twins on `13.220.94.209:3001..3010`)

- **Plane 1 — AWS Bedrock AgentCore MCP & Commercial SaaS Control Plane (`Side A`)**: Run `python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py` and `python3 -B scripts/verify_5_third_party_saas_products.py` to mint a live Amazon Cognito RS256 OAuth2 token (`us-east-1_vqlzYM74B`) and execute `tools/call` across all 10 targets (`KD6Z3SV8PX`..`TXGJHVFBWP`) on `https://cymbal-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`.
- **Plane 2 — Stateful Open-Source Data/RLS Execution Twins (`Side B` on `http://13.220.94.209:3001..3010`)**: Inspect each live containerized execution twin (`Metabase v0.50.26`, `Grafana Enterprise 11.2.0`, `Redmine 5.1`, `NocoDB 0.255.2`, `Gitea 1.22.3`, `Trino 440`, `ClickHouse 24.8`, `Directus 11.1.0`, `Datalust Seq 2024.3`, and `HashiCorp Vault 1.13.3`) and its live Amazon S3 Audit Ledger JSON (`?format=json`). *(Note: Public review sandboxes expose read-accessible ports `:3001..3010` and reviewer credentials for instant auditability; production deployments enforce HTTPS ALB/WAF TLS 1.3 termination, private VPC-only listener bindings, and 5-minute DPoP-bound OAuth2 tokens.)*

| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Live Execution Twin UI (`13.220.94.209:3001..3010`) & S3 Ledger JSON | Side-A (AgentCore MCP) & Side-B (Live Software UI) Screenshots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud (Spotter Agentic BI v2.0)** • [Vendor API (`try-everywhere.thoughtspot.cloud`)](https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom) | Target **`KD6Z3SV8PX`** (`READY`) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` • Shared Pool + Spotter `runtime_filter.tenant_id` -> BigQuery RLS • Silo `cymbal-finvault-silo-prod` + mTLS SPIFFE + `finvault-silo-cmek` • `SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN` (`psc-neg-finvault-silo-usw1`) | **In:** `tenant="finvault"`, `org="finvault-org-01"` • **Out:** `HTTP 200` • `row_count=2` (`ENT-FV-001..002`), `cache_discount=0.90` | **In:** `tenant="retailstream"` spoofing `org="finvault-org-01"` • **Out:** **`HTTP 403`** `CROSS_TENANT_THOUGHTSPOT_ORG_SPOOF_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Metabase BI (`:3001`)](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | [Side-A MCP (`saas_01`)](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_01`)](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png) |
| **`SAAS-02` Sigma Computing (Workbooks & Dataset API v2)** • [Vendor API (`api.sigmacomputing.com`)](https://api.sigmacomputing.com/v2/auth/token) | Target **`OZ0KTE8Z8M`** (`READY`) • `mcp://cymbal/sigma-computing-workbooks-3lo` • Shared Pool + `ua_tenant_id` warehouse RLS pushdown • Silo `cymbal-finvault-silo-prod` + CMEK + `ua_tenant_id=finvault` • Zero-downtime workbook promotion Pool -> PSC Spoke | **In:** `tenant="retailstream"`, `workbook="wb-sigma-retailstream-checkout-02"` • **Out:** `HTTP 200` • `row_count=1` (`ENT-RS-001`), live Sigma `requestId` | **In:** `tenant="retailstream"` tampering `ua_tenant_id="finvault"` • **Out:** **`HTTP 403`** `DENY_SIGMA_UA_TENANT_TAMPERING` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Grafana BI (`:3002`)](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | [Side-A MCP (`saas_02`)](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_02`)](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png) |
| **`SAAS-03` ServiceNow ITSM & ITOM (`CHG0049218`)** • [Vendor Status (`status.servicenow.com`)](https://status.servicenow.com) | Target **`PLOLWRMI0I`** (`READY`) • `mcp://retailstream/servicenow-itom-3lo` • Shared Pool + Hop 5 3LO Vault (`3lo_token_sn_rs_valid`) • Silo VPC-SC egress allowlist -> AWS AgentCore `CHG0049218` • Dynamic Hybrid routing (Standard Pool vs Enterprise PSC Spoke) | **In:** `tenant="retailstream"`, `change="CHG0049218"`, `3lo=True` • **Out:** `HTTP 200` • Live AWS AgentCore `CHG0049218` returned | **In:** `tenant="retailstream"`, `seed_3lo=False` (unconsented) • **Out:** **`HTTP 401`** `CHALLENGE_3LO_OAUTH` (`MCP -32042`) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Redmine ITSM (`:3003`)](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | [Side-A MCP (`saas_03`)](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_03`)](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png) |
| **`SAAS-04` Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)** • [Vendor Portal (`veevavault.com`)](https://login.veevavault.com) | Target **`1KZWKOFTWQ`** (`READY`) • `mcp://finvault/veeva-muse-clinical-3lo` • Shared Pool + Hop 2 Catalog ACL + Cloud KMS 21 CFR Part 11 sig • GxP Silo + Cloud KMS asymmetric P-256 `21 CFR Part 11` signature • GxP Clinical EDC promoted to Enterprise PSC Spoke | **In:** `tenant="finvault"`, `study="FV-GXP-2026-04"`, `cohort="Cohort-B"` • **Out:** `HTTP 200` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** `tenant="retailstream"` invoking restricted clinical MCP • **Out:** **`HTTP 403`** `TENANT_CONNECTOR_ACL_DENIED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live NocoDB EDC (`:3004`)](http://13.220.94.209:3004/#/nc/base) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | [Side-A MCP (`saas_04`)](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_04`)](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png) |
| **`SAAS-05` Salesforce CRM (`NA224`) & Atlassian Jira Cloud** • [Vendor API (`api.status.salesforce.com`)](https://api.status.salesforce.com/v1/instances/NA224/status) | Target **`W7BF0JRWEA`** (`READY`) • `mcp://finvault/salesforce-jira-escalation-3lo` • Shared Pool + Hop 4 Egress Cloud SDP IBAN/SWIFT mask • Silo VPC-SC + Hop 4 Cloud SDP IBAN/SWIFT redaction • Hybrid PSC Spoke escalation + Hop 4 Cloud SDP redaction | **In:** `tenant="finvault"`, `instance="NA224"`, raw IBAN/SWIFT in notes • **Out:** `HTTP 200` • Live `NA224` (`Winter '27 Patch 8.6`) + `[REDACTED-FINVAULT-IBAN]` | **In:** Inspect egress payload for unredacted `DE893704...` • **Out:** **`PASS`** (`raw_pii_leaked=False`, 100% masked before SaaS call) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Gitea Tracker (`:3005`)](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | [Side-A MCP (`saas_05`)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_05`)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png) |
| **`SAAS-06` Databricks Data Intelligence Platform (Unity Catalog)** • [Vendor API (`community.cloud.databricks.com`)](https://community.cloud.databricks.com/api/2.0/clusters/list) | Target **`Z1RHXLBK6F`** (`READY`) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Shared Pool + `cymbal_uc_prod.<tenant>_gold` binding • Silo VPC-SC -> Dedicated `cymbal_uc_prod.finvault_gold` catalog • Zero-downtime Unity Catalog schema cutover to PSC Spoke | **In:** `tenant="finvault"`, `schema="finvault_gold"` • **Out:** `HTTP 200` • `Server: databricks`, `row_count=2` (`ENT-FV-001..002`) | **In:** `tenant="retailstream"`, `schema="finvault_gold"` + `EXECUTE IMMEDIATE` • **Out:** **`HTTP 403`** `UNITY_CATALOG_CROSS_TENANT_SCHEMA_OR_DYNAMIC_SQL_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Trino UI (`:3006`)](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | [Side-A MCP (`saas_06`)](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_06`)](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png) |
| **`SAAS-07` Snowflake AI Data Cloud (Cortex Analyst & SQL v2)** • [Vendor API (`snowflakecomputing.com`)](https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements) | Target **`7PB1EK3NJO`** (`READY`) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Shared Pool + `ROLE_CYMBAL_<TENANT>` & `SECONDARY ROLES NONE` • Silo VPC-SC + Tri-Secret Secure CMEK + `ROLE_CYMBAL_FINVAULT` • Zero-downtime Snowflake Cortex role & warehouse cutover over PSC | **In:** `tenant="retailstream"`, `role="ROLE_CYMBAL_RETAILSTREAM"` • **Out:** `HTTP 200` • `Server: SF-LB-T1`, `row_count=1` (`ENT-RS-001`) | **In:** `sql_override="USE SECONDARY ROLES ALL; SELECT * FROM FINVAULT"` • **Out:** **`HTTP 403`** `SNOWFLAKE_SECONDARY_ROLES_OR_CROSS_ROLE_ESCALATION_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live ClickHouse UI (`:3007`)](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | [Side-A MCP (`saas_07`)](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_07`)](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png) |
| **`SAAS-08` Workday Enterprise HCM & Financial Management** • [Vendor API (`wd5-services1.myworkday.com`)](https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token) | Target **`CXH8BK86IF`** (`READY`) • `mcp://finvault/workday-hcm-financials-raas-3lo` • Shared Pool + Principal-Scoped 3LO + Hop 4 SSN/IBAN SDP • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN Cloud SDP • Hybrid PSC Spoke RaaS promotion + Hop 4 SSN/IBAN redaction | **In:** `tenant="finvault"`, `user="alice@finvault.com"`, `org="SUP-ORG-FINVAULT-NA"` • **Out:** `HTTP 200` • Live Workday CCX probe + `[REDACTED_US_SSN]` | **In:** `user="bob@finvault.com"` reusing Alice's 3LO token • **Out:** **`HTTP 401`** `WORKDAY_INTRA_TENANT_PRINCIPAL_3LO_MISMATCH` (`MCP -32042`) • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Directus HCM (`:3008`)](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | [Side-A MCP (`saas_08`)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_08`)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png) |
| **`SAAS-09` Datadog Cloud Observability & Bits AI SRE** • [Vendor API (`api.datadoghq.com`)](https://api.datadoghq.com/api/v1/validate) | Target **`A2X7LPMPA7`** (`READY`) • `mcp://cymbal/datadog-observability-sre-3lo` • Shared Pool + `@tenant_id` log filter + Hop 4 Model Armor • Silo VPC-SC + `@tenant_id:finvault` + Hop 4 Model Armor • Zero-downtime OTel & Datadog APM log stream cutover to PSC Spoke | **In:** `tenant="finvault"`, `query="service:agent-gateway @tenant_id:finvault"` • **Out:** `HTTP 200` • Live Datadog US1 API + `2` sanitized log spans | **In:** Log payload containing `IGNORE ALL PREVIOUS INSTRUCTIONS...` • **Out:** **`HTTP 400`** `MODEL_ARMOR_LOG_PROMPT_INJECTION_BLOCKED` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Seq APM (`:3009`)](http://13.220.94.209:3009/#/events) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | [Side-A MCP (`saas_09`)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_09`)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png) |
| **`SAAS-10` CrowdStrike Falcon Next-Gen SIEM & Okta Identity** • [Vendor API (`api.crowdstrike.com`)](https://api.crowdstrike.com/oauth2/token) | Target **`TXGJHVFBWP`** (`READY`) • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Shared Pool + Hop 1 RFC 9449 DPoP `jkt` binding • Silo mTLS SPIFFE + Okta DPoP + `<5s` Valkey cache purge on CMEK revoke • Hybrid PSC Spoke DPoP session continuity across live tier promotion | **In:** `tenant="finvault"`, `dpop="dpop_jkt_fv_001"`, `proof="dpop_jkt_fv_001"` • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200` | **In:** Stolen bearer token replay with `proof="dpop_jkt_attacker_stolen_999"` • **Out:** **`HTTP 401`** `OKTA_CROWDSTRIKE_DPOP_PROOF_BINDING_MISMATCH` • Pattern B CMEK: **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` • Pattern C PSC: **`HTTP 403`** `HYBRID_ROUTER_SPOKE_IMPERSONATION_BLOCKED` | [Live Vault UI (`:3010`)](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (Token `fv-token-finvault-sre-2026`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | [Side-A MCP (`saas_10`)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_10`)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png) |

### Part III — Side-A (AgentCore MCP) & Side-B (Live Execution Twin UI on `13.220.94.209:3001..3010`) Visual Proof Gallery (WS5)

![SAAS-01 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target KD6Z3SV8PX (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png)

![SAAS-01 Side B — WS5 Live Metabase BI (`metabase/metabase:v0.50.26`) Execution Twin UI on http://13.220.94.209:3001/question/27 (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png)

![SAAS-02 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target OZ0KTE8Z8M (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png)

![SAAS-02 Side B — WS5 Live Grafana Enterprise (`grafana/grafana-enterprise:11.2.0`) Execution Twin UI on http://13.220.94.209:3002/d/finvault-sre-wb (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png)

![SAAS-03 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target PLOLWRMI0I (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png)

![SAAS-03 Side B — WS5 Live Redmine ITSM (`redmine:5.1-alpine`) Execution Twin UI on http://13.220.94.209:3003/projects/finvault-itsm/issues (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png)

![SAAS-04 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 1KZWKOFTWQ (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png)

![SAAS-04 Side B — WS5 Live NocoDB Clinical EDC (`nocodb/nocodb:0.255.2`) Execution Twin UI on http://13.220.94.209:3004/#/nc/base (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png)

![SAAS-05 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target W7BF0JRWEA (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png)

![SAAS-05 Side B — WS5 Live Gitea Escalation Tracker (`gitea/gitea:1.22.3`) Execution Twin UI on http://13.220.94.209:3005/finvault/sre-escalations/issues/1 (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png)

![SAAS-06 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target Z1RHXLBK6F (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png)

![SAAS-06 Side B — WS5 Live Trino Distributed SQL Lakehouse (`trinodb/trino:440`) Execution Twin UI on http://13.220.94.209:3006/ui/ (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png)

![SAAS-07 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 7PB1EK3NJO (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png)

![SAAS-07 Side B — WS5 Live ClickHouse Analytics Play UI (`clickhouse/clickhouse-server:24.8`) Execution Twin UI on http://13.220.94.209:3007/play (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png)

![SAAS-08 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target CXH8BK86IF (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png)

![SAAS-08 Side B — WS5 Live Directus HCM Data Studio (`directus/directus:11.1.0`) Execution Twin UI on http://13.220.94.209:3008/admin/content/hcm_compensation (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png)

![SAAS-09 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target A2X7LPMPA7 (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png)

![SAAS-09 Side B — WS5 Live Datalust Seq APM & Log Server (`datalust/seq:2024.3`) Execution Twin UI on http://13.220.94.209:3009/#/events (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png)

![SAAS-10 Side A — WS5 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target TXGJHVFBWP (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png)

![SAAS-10 Side B — WS5 Live HashiCorp Vault UI (`hashicorp/vault:1.13.3`) Execution Twin UI on http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png)


## What's next

- Review the complete 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 3 (Workstream 3): Pattern B — Sovereign Silos for Regulated Agentic AI](ws3-pattern-b-sovereign-silos.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
- Explore the Workstream 5 capstone deliverables and complete program guide:
  - [5.1 Executive Pattern Comparison & Topology Decision Guide](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)
  - [1.4 Consolidated EAP & Product Gap Tracker](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)
  - [Complete End-to-End Workstream & 14-Diagram Master Guide](../docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slide decks:
  - [Workstream 5 Editable Google Slides Deck (`ws5-wrap-up-editable-slides.pptx`)](../slides/ws5-wrap-up-editable-slides.pptx)
  - [All-in-One 25-Slide Master Presentation (`geap-multi-tenancy-all-workstreams-editable-slides.pptx`)](../slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
