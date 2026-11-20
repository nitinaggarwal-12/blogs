---
title: "Multi-tenant agentic AI system: Executive decision guide and the multi-tenant agentic triad"
subtitle: "Select deterministically between Pool (Pattern A), Governed Hub-and-Spoke Hybrid (Pattern C), and Sovereign Silo (Pattern B), orchestrate shared + private agents with dynamic GCS skills, and federate cleanly across Google Cloud, AWS Bedrock AgentCore, and 10 enterprise SaaS platforms"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 5 of 5"
workstream: "Workstream 5 — Executive Decision Guide, Agentic Triad & Multi-Cloud Federation"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "CTOs, CISOs, VP Engineering, Enterprise Architects, and Multi-Cloud AI Platform Leads"
reading_time: "14 min read"
tags: ["Decision Guide", "Agentic Triad", "Dynamic GCS Skills", "A2A Delegation", "Multi-Cloud Federation", "AWS Bedrock AgentCore", "FinOps OTel", "Pattern A B C", "GA Roadmap"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws5-decision-tree-and-triad", "ws5-c4-l3-dynamic-skill-delegation-swimlane", "saas10-multicloud-a2a-mcp-bridge"]
editable_slides: "slides/ws5-12slide-visual-deck.pptx"
status: "PUBLISH_READY"
---

This document is **Part 5 (Capstone)** of the Multi-Tenant Agentic AI series on Google Cloud. It brings together **Patterns A, B, and C** into a deterministic **3-Gate Architecture Pattern Selector**, demonstrates how **Shared Diagnostic Agents** securely delegate over **A2A** to **Tenant-Private Agents** with hot-swapped **Dynamic GCS Skills** (`0` container image rebuilds) and **Zero-PII BigQuery FinOps OTel** attribution, and details the live **Multi-Cloud Federation Plane** linking Google Cloud (`cymbal-pooled-saas-prod` / `cymbal-finvault-silo-prod` reference verification sandbox) to **AWS Bedrock AgentCore MCP Gateway** and **10 commercial enterprise SaaS stacks**.

> **Approved 3-Diagram WS5 Baseline & Live 2-Way Draw.io Sync:** All three diagrams in this capstone are synchronized 2-way with the **[Approved 12-Slide Architecture Deck (WS5 = Slides 10–12) ↗](https://docs.google.com/presentation/d/1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk/edit#slide=id.p10)** and backed by live `.drawio` XML + crisp vector `.svg` files. Review the [WS5 12-Slide Visual Deck (`.pptx`)](../slides/ws5-12slide-visual-deck.pptx), the [WS5 Google Docs Spec ↗](https://docs.google.com/document/d/1ate8K63qHrYP6OUQ7qO0H6Quq8S5g3TnLbDhbaAZ_SU/edit?resourcekey=0-XWkODR5elYC9-fuGO6aBaQ), [`5.1 Pattern Comparison & Decision Guide`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md), [`5.2 Capstone Backlog & GA Roadmap`](../workstream-5-wrap-up-and-backlog/5.2-capstone-backlog-and-ga-roadmap.md), or the [Multi-Cloud Console & Live SaaS Verification Atlas](saas-10-visual-verification-and-redteam-atlas.md).

---

## Architecture pattern selector: Pool (A) vs. Hybrid (C) vs. Silo (B) (Figure 1)

Choosing a multi-tenant isolation model should never rely on ad-hoc opinions. Figure 1 codifies the **3-Gate Binary Governance Selector** that maps every tenant's compliance and latency contract directly to its target infrastructure tier while holding **three platform invariants** constant across the entire fleet.

![Figure 1 (Approved Slide 10/12) — WS5 - PART 5 - Architecture Pattern Selector: Pool (A) vs. Hybrid (C) vs. Silo (B)](../diagrams/ws5-decision-tree-and-triad.svg)

*Figure 1 (Approved Slide 10/12). Architecture Pattern Selector mapping Tenant Tiers & Compliance through three binary governance gates to Pattern A (`Pool • 1.0x COGS`), Pattern C (`Hybrid /28 PSC • 1.8x–2.8x COGS`), and Pattern B (`Sovereign Silo • ~15x COGS`) under three non-negotiable platform invariants.*

### Deterministic 3-gate selector rule & three universal invariants

```formula
Let (q_spoke, q_silo) ∈ {0, 1}² where:
  • q_spoke = 1 if tenant requires dedicated CMEK data store, regional residency, or private MCP spoke
  • q_silo  = 1 if tenant mandates dedicated GCP project, VPC-SC (0.0.0.0/0 denied), or air-gapped SEV-SNP compute

TargetPattern(q_spoke, q_silo) =
  • Gate 1 (q_spoke = 0, q_silo = 0) → Pattern A: Pool (WS2)                  [1.0x COGS • 1,000+ Tenants • ~85% Prefix Cache]
  • Gate 2 (q_spoke = 1, q_silo = 0) → Pattern C: Governed Hub & Spoke (WS4)  [1.8x–2.8x COGS • 0ms Cutover • /28 PSC Spokes]
  • Gate 3 (q_silo  = 1)             → Pattern B: Sovereign Silo (WS3)        [~15x COGS • 41.2s CMEK Halt • GKE SEV-SNP]
```

Regardless of which gate a tenant clears, **three non-negotiable architectural invariants** never change:

1. **Invariant 1 — Dual Agent Gateways & Non-Spoofable Identity**: Every tenant traverses explicit **Client-to-Agent** and **Agent-to-Target** gateways with Cloud Armor header stripping, `RFC 8693 OBO` + `RFC 9449 DPoP` proof validation, and 5-minute Cloud KMS `ECDSA P-256` STS JWTs (`<0.15 ms` JWKS verify).
2. **Invariant 2 — `80%` Reusable ADK Core Package (`TENANT_ISOLATION_MODE`)**: One single Python ADK codebase (`core-cymbal-agent/`) runs across Pool, Hybrid, and Silo—eliminating multi-branch security drift. Only declarative configuration (`TENANT_ISOLATION_MODE = POOLED | HYBRID_PSC | SOVEREIGN_SILO`) and Terraform perimeter modules change.
3. **Invariant 3 — Deterministic Security & FinOps Guardrails**: Every tier enforces ARD `-94%` schema pruning, inline `<8 ms` Model Armor screening, Cloud SDP egress redaction, Valkey `120/600 RPM` fairness + thinking-token clamps (`4k`/`8k`), and Zero-PII SHA-256 BigQuery OTel attribution.

### Master executive comparison matrix (Patterns A vs. C vs. B)

| Decision Criterion | Pattern A: High-Density Pool ([WS2](ws2-pattern-a-pooled-architecture.md)) | Pattern C: Governed Hub & `/28` PSC ([WS4](ws4-pattern-c-hybrid-dynamic-tiering.md)) | Pattern B: Sovereign Silo ([WS3](ws3-pattern-b-sovereign-silos.md)) |
| :--- | :--- | :--- | :--- |
| **Target Tenant Profile** | `1,000+` Commercial / PLG / Mid-Market SaaS | Enterprise B2B requiring CMEK storage & private tools | Regulated Banking, Healthcare GxP, EU DORA, Defense |
| **Relative Infrastructure COGS** | **`1.0x` Baseline** | **`1.8x` (`950/50`) to `~2.8x` (`15%` Enterprise)** | **`~15x` Sovereign Silo** |
| **Compute Isolation** | Cloud Run Gen2 `gVisor` `concurrency=1` + Mode A `CoW --max-requests=1` / Mode B WarmPool `403` latch | Shared Hub `gVisor` `CoW` runtime + optional regional CMEK inference | Dedicated GCP Project + Confidential GKE `AMD SEV-SNP` (**Gemma 3 27B**) or Vertex PT |
| **Data & Network Boundary** | Shared AlloyDB **`FORCE ROW LEVEL SECURITY`** (`0` foreign rows) | Unidirectional **`/28` PSC Spoke** to dedicated CMEK AlloyDB (`0` CIDR overlap) | Dedicated Project AlloyDB + **`VPC-SC` (`0.0.0.0/0` denied)** + **`IAM PAB`** |
| **CMEK Kill-Switch SLA** | Platform key (`<5s` Valkey `SCAN + UNLINK`) | Customer CMEK on spoke data (`<5s` Valkey purge + spoke lock) | Customer **FIPS 140-3 L3 HSM CMEK** (`41.2s` verified full enclave halt, `HTTP 423`) |
| **Live Upgrade Path** | Native starting tier (`Mode A` or `Mode B`) | **`0 ms` Atomic CAS Promotion** (`SHADOW_SYNC → CAS Flip → 30s Drain`) | Dedicated Terraform project cutover with `SHA-256` parity verification |

---

## Shared + private agents, dynamic GCS skills & FinOps OTel (Figure 2)

Real B2B SaaS platforms rarely deploy one monolithic prompt. Instead, they operate the **Multi-Tenant Agentic Triad**: a shared platform **Diagnostic Agent** (`core-cymbal-agent/agents/shared_diagnostic_agent.py`) that routes specialized work over **A2A** to **Tenant-Private Agents** (such as FinVault's regulatory `finvault_agent_alpha.py`), while dynamically hydrating customer-owned **GCS Skill Packs** without rebuilding or redeploying container images.

![Figure 2 (Approved Slide 12/12) — WS5 - PART 5 - Shared + Private Agents, Dynamic GCS Skills & FinOps OTel](../diagrams/ws5-c4-l3-dynamic-skill-delegation-swimlane.svg)

*Figure 2 (Approved Slide 12/12). Five-actor UML sequence swimlane tracing Shared Diagnostic Agent to Private Tenant Agent A2A delegation, ARD visibility enforcement, zero-rebuild dynamic GCS skill hot-swap, `32k` prefix cache hit, `2LO/3LO` MCP execution, and Zero-PII BigQuery FinOps OTel logging.*

### Step-by-step agentic triad execution trace (5 actors in Figure 2)

1. **Ingress Identity & ARD Visibility Scope (`CALLER → DIAG`)**: The Enterprise Caller authenticates via `OIDC + DPoP`. Hop 2 **ARD** verifies that `finvault` is entitled to invoke `Agent Alpha` (while deterministically rejecting `retailstream` attempts to discover or invoke `Agent Alpha` with **`HTTP 403`**).
2. **Scoped A2A Delegation & Dynamic GCS Skill Hot-Swap (`DIAG → PRIV`)**:
   - The **Shared Diagnostic Agent** delegates over **Agent-to-Agent (`A2A`)** passing the exact signed STS JWT (never downgrading to a generic service account).
   - The **Private Tenant Agent** loads its tenant-signed playbooks and prompt rubrics dynamically from `gs://<tenant-skills-bucket>/v2/skill.yaml` (verified against a pinned SHA-256 digest and cached under `cache:{tenant}:skill:*`)—enabling **zero-downtime skill updates with `0` container image rebuilds**.
3. **Prefix Cache Hit, Thinking Clamp & `2LO/3LO` MCP Dispatch (`PRIV → MCP`)**:
   - Inference hits the immutable **`32k` shared prefix cache (`~85%` turn token savings)** while enforcing the tenant's **`8,000`-token thinking clamp**.
   - Outbound tool execution calls the **2LO/3LO MCP Hub** (`core-cymbal-agent/mcp_servers/cymbal_mcp_hub.py`) with Hop 4 Cloud SDP redaction and per-user DPoP-bound `3LO` tokens.
4. **Zero-PII BigQuery FinOps Chargeback (`MCP → OTel`)**: Every delegated sub-agent hop emits a linked **OpenTelemetry (`OTel`)** span containing `tenant_id`, `agent_id`, `skill_sha256`, `cached_input_tokens`, `thinking_tokens`, and `raw_pii_logged = FALSE` into BigQuery for accurate per-customer margin accounting.

---

## Multi-cloud federation: Google Cloud plane ↔ AWS Bedrock AgentCore & 10 SaaS (Figure 3)

Enterprise customers store operational records across both Google Cloud and AWS-hosted SaaS estates. Figure 3 documents our live, keyless **Multi-Cloud Federation Plane**—proving that zero-trust 5-Hop isolation extends seamlessly across cloud boundaries with **`0` static AWS IAM keys** and **`30/30` multi-cloud verification gates PASS** across all three patterns (`A • B • C`).

![Figure 3 (Approved Slide 11/12) — WS5 - PART 5 - Multi-Cloud Federation: Google Cloud Plane ↔ AWS & 10 SaaS](../diagrams/saas10-multicloud-a2a-mcp-bridge.svg)

*Figure 3 (Approved Slide 11/12). Multi-Cloud Federation architecture bridging the Google Cloud 5-Hop Control & Runtime Plane (`cymbal-pooled-saas-prod` / `cymbal-finvault-silo-prod` reference verification sandbox) via keyless OIDC STS federation to AWS Bedrock AgentCore MCP Gateway (`us-east-1`), 10 enterprise SaaS targets, and immutable Amazon S3 audit ledgers.*

### Two-plane multi-cloud architecture breakdown (Figure 3)

- **Left Plane — Google Cloud Control & Runtime Plane (`cymbal-pooled-saas-prod` / `cymbal-finvault-silo-prod` reference verification sandbox)**: Executes Identity/WIF, Inbound PEP, Auth Manager + keyless **AWS STS OIDC federation (`0` long-lived AWS keys)**, ARD 10-SaaS MCP schemas, ADK Agent Runtime, Outbound Agent Gateway (`Model Armor` + `Cloud SDP`), Valkey (`0.4 ms`), and AlloyDB `FORCE RLS` partitions—attested across **`30/30` Multi-Cloud Verification Gates PASS (`60/60` positive and adversarial assertions)**.
- **Right Plane — AWS & 10-SaaS Plane (`us-east-1` federation verification sandbox)**: Hosts **AWS Bedrock AgentCore MCP Gateway (`cymbal-a2a-mcp-gateway-suyxm3caof`)**, Amazon Cognito `RS256` OAuth2 validation, **Lakehouse & Agentic BI MCP** (`ThoughtSpot`, `Sigma`, `Databricks`, `Snowflake`), **Enterprise ITSM / CRM / HR / Clinical / SecOps MCP** (`ServiceNow`, `Veeva/Muse`, `Salesforce/Jira`, `Workday`, `Datadog`, `CrowdStrike/Okta`), and the immutable **Amazon S3 Audit Bucket** (`s3://cymbal-aws-federation-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`).

### Unified 10-SaaS multi-cloud governance matrix (`30/30` Flows PASS across Patterns A, B & C)

| SaaS & Target ID (`READY`) | Pattern A (Pool) Proof | Pattern B (Silo) Proof | Pattern C (Hybrid PSC) Proof | Live S3 Ledger |
| :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot (`HXGGFMZBKE`)** | Org-ID RLS (`403` spoof block) | VPC-SC + CMEK (`423` halt) | `0 ms` Liveboard spoke cutover | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) |
| **`SAAS-02` Sigma Computing (`IZVODT083Q`)** | `ua_tenant_id` tamper (`403`) | KMS org attestation (`423`) | Workbook PSC spoke cutover (`403` spoof) | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) |
| **`SAAS-03` ServiceNow ITSM (`ZS9VGYHBQL`)** | `3LO` Vault (`401 -32042`) | Siloed change KMS (`423`) | Hub→Spoke 3LO ticket promotion | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) |
| **`SAAS-04` Veeva / Muse EDC (`TWQU0KSRVF`)** | Hop 2 ARD ACL (`403` deny) | `21 CFR Part 11` ECDSA (`423`) | `/28` PSC clinical enclave route | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) |
| **`SAAS-05` Salesforce & Jira (`K5JAEFCQ6E`)** | Cloud SDP IBAN/SWIFT mask | VPC-SC + SDP (`423` halt) | Zero-leak spoke escalation cutover | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) |
| **`SAAS-06` Databricks Unity (`TERCK8SLBP`)** | Schema binding (`403` SQL guard) | Dedicated catalog + CMEK (`423`) | Dynamic Pool→Spoke SQL cutover | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) |
| **`SAAS-07` Snowflake Cortex (`CCMDEVZV2S`)** | `SECONDARY ROLES NONE` (`403`) | Tri-Secret CMEK (`423` halt) | Spoke CMEK warehouse pinning | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) |
| **`SAAS-08` Workday HCM RaaS (`RAOTMUMJTZ`)** | Principal `3LO` (`401` replay) | Sovereign HCM + SSN mask (`423`) | Continuous 3LO across CAS flip | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) |
| **`SAAS-09` Datadog SRE (`G767QR3TQZ`)** | Model Armor log screen (`400`) | Isolated OTel sink (`423` halt) | Zero-drop `@tenant_id` telemetry | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) |
| **`SAAS-10` CrowdStrike / Okta (`C7EYM614F2`)** | `DPoP` `jkt` proof (`401` replay) | SPIFFE mTLS + CMEK (`423` halt) | Continuous `DPoP` over PSC spoke | [S3 Ledger JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) |

---

## Executive GA roadmap & capstone product backlog (`5.2-capstone-backlog-and-ga-roadmap.md`)

As tracked in [`5.2 Capstone Backlog & GA Roadmap`](../workstream-5-wrap-up-and-backlog/5.2-capstone-backlog-and-ga-roadmap.md), every compensating hook in `core-cymbal-agent/` is explicitly feature-flagged for frictionless retirement as native Google Cloud Agent Engine capabilities reach General Availability:

1. **Phase 1 (Immediate Production Baseline — Verified Today)**: Deploy the shared 5-Hop ADK core (`GAP-01..05` hooks enabled), Mode A `CoW` / Mode B WarmPool `403` latch, AlloyDB `FORCE RLS`, `/28` PSC spokes, and keyless AWS Bedrock AgentCore federation.
2. **Phase 2 (Native Control-Plane Consolidation)**: Flip `CYMBAL_NATIVE_ARD_ACL_ENABLED` and `CYMBAL_NATIVE_AUTH_MGR_3LO` to retire custom Hop 2/Hop 5 middleware shims onto native Agent Engine RBAC and managed 3LO OAuth vaults.
3. **Phase 3 (Native Sub-Tenant FinOps & KMS Event Bus)**: Flip `CYMBAL_NATIVE_CMEK_CACHE_SYNC`, `CYMBAL_NATIVE_SUBTENANT_QUOTA`, and `CYMBAL_NATIVE_VERTEX_TENANT_BILLING` for zero-glue event-driven CMEK memory eviction and native per-tenant token billing exports.

<!-- GENUINE_3P_BEFORE_AFTER_START -->

## Verified Live Commercial SaaS Proofs for WS5 (GCP Console & Marketplace Captures Pending 1-Tap SSO)

> [!IMPORTANT]
> **Verified Live Commercial SaaS Proofs (2 Retina Captures • GCP Console: 0/15 Pending 1-Tap SSO):** Currently showing 2 cryptographically verified live commercial SaaS Retina captures (ThoughtSpot Cloud on team2.thoughtspot.cloud, verified exit 0 by verify_slide_screenshots.mjs --audience external). Google Cloud Console & Gemini Enterprise captures (0/15) are pending 1-tap Google SSO in an authenticated browser session; zero open-source stand-ins or unattested legacy images remain. Backend multi-cloud protocol verification receipts (AWS Bedrock AgentCore MCP gateway targets and S3 federation ledgers in `data/saas_10_live_3pattern_receipt.json`) are server-side cryptographic API proofs and are strictly distinct from live commercial browser UI screenshots. Open the dedicated gallery at `/blogs/ws5/screenshots` or inspect the full [Multi-Cloud Console & Live SaaS Verification Atlas](saas-10-visual-verification-and-redteam-atlas.md).

### SAAS-01A: ThoughtSpot Cloud — Live Executive Analytics Liveboard
**Provider:** ThoughtSpot Cloud (Live Commercial SaaS) • **Scope:** team2.thoughtspot.cloud • **Resource:** Retail Sales Liveboard (team2.thoughtspot.cloud) • Provenance SHA-256 fd5cb15c0902 (2880x1620 Retina) • **[Open Live Console ↗](https://team2.thoughtspot.cloud/)**

![Live commercial ThoughtSpot Cloud SaaS Liveboard rendered directly from team2.thoughtspot.cloud.](../screenshots/verified-cloud-console/saas_01_thoughtspot_liveboard.png)
*Genuine commercial ThoughtSpot Cloud Liveboard (team2.thoughtspot.cloud) captured live at 2880x1620 Retina with cryptographic SHA-256 provenance verification.*

### SAAS-01B: ThoughtSpot Cloud — Live Governed Saved Answer Query
**Provider:** ThoughtSpot Cloud (Live Commercial SaaS) • **Scope:** team2.thoughtspot.cloud • **Resource:** Stock-Out & Spoilage Analytics Answer (team2.thoughtspot.cloud) • Provenance SHA-256 3fcab795d1e5 (2880x1620 Retina) • **[Open Live Console ↗](https://team2.thoughtspot.cloud/)**

![Live commercial ThoughtSpot Cloud Saved Answer analytics table rendered directly from team2.thoughtspot.cloud.](../screenshots/verified-cloud-console/saas_02_thoughtspot_saved_answer.png)
*Genuine commercial ThoughtSpot Cloud Saved Answer query (team2.thoughtspot.cloud) demonstrating live governed BI analytics consumption.*

<!-- GENUINE_3P_BEFORE_AFTER_END -->

---

## What's next

- **Approved Architecture Presentations & Editable Diagrams (WS5 = Slides 10–12):**
  - [Open Approved 12-Slide Architecture Deck in Google Slides (WS5 = Slides 10–12) ↗](https://docs.google.com/presentation/d/1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk/edit#slide=id.p10) • [Download WS5 12-Slide Visual Deck (`.pptx`)](../slides/ws5-12slide-visual-deck.pptx)
  - [Figure 1 Pattern Selector (`.drawio`)](../diagrams/ws5-decision-tree-and-triad.drawio) • [Figure 2 Dynamic GCS Skills & OTel (`.drawio`)](../diagrams/ws5-c4-l3-dynamic-skill-delegation-swimlane.drawio) • [Figure 3 Multi-Cloud Federation Bridge (`.drawio`)](../diagrams/saas10-multicloud-a2a-mcp-bridge.drawio)
- **Workstream 5 Capstone Deliverables & Agentic Triad Codebase:**
  - **Decision Guide & GA Roadmap:** [`5.1 Pattern Comparison & Decision Guide`](../workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md) • [`5.2 Capstone Backlog & GA Roadmap`](../workstream-5-wrap-up-and-backlog/5.2-capstone-backlog-and-ga-roadmap.md)
  - **Multi-Agent Codebase:** [`shared_diagnostic_agent.py`](../core-cymbal-agent/agents/shared_diagnostic_agent.py) • [`finvault_agent_alpha.py`](../core-cymbal-agent/agents/finvault_agent_alpha.py) • [`cymbal_mcp_hub.py`](../core-cymbal-agent/mcp_servers/cymbal_mcp_hub.py)
  - **Editable Whitepaper:** [Open WS5 Google Doc ↗](https://docs.google.com/document/d/1ate8K63qHrYP6OUQ7qO0H6Quq8S5g3TnLbDhbaAZ_SU/edit?resourcekey=0-XWkODR5elYC9-fuGO6aBaQ) • [Download `.docx`](../docs/word/ws5-decision-guide-and-agentic-triad.docx)
- **Complete Series Navigation:**
  - **Part 1 (`WS1`):** [Reference Architecture & 5-Hop Governance Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md) • **Part 2 (`WS2`):** [Pattern A: Pooled](ws2-pattern-a-pooled-architecture.md) • **Part 3 (`WS3`):** [Pattern B: Sovereign Silos](ws3-pattern-b-sovereign-silos.md) • **Part 4 (`WS4`):** [Pattern C: Dynamic Hybrid](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - **Companion Visual Atlas (`ATLAS`):** [10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas](saas-10-visual-verification-and-redteam-atlas.md)

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
