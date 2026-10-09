# Gemini Enterprise Agent Platform (GEAP): Multi-Tenancy Architecture & Enablement Program

> **Anchor Reference**: [Multi-tenant agentic AI system — Google Cloud Architecture Center](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system)  
> **Program Sprint Rhythm**: `1W Design • 2W Build • 1W Launch` (Weeks 1–10)  
> **Core Engineering Principle**: **80% Reusable Core Code** (`core-cymbal-agent/`) + **20% Pattern-Specific Delta** across Pooled (Pattern A), Siloed (Pattern B), and Hybrid (Pattern C).

---

## 1. Program Overview & Three Core Multi-Tenant Patterns

As B2B Independent Software Vendors (ISVs) and enterprise platform teams embed autonomous AI agents using **Gemini Enterprise Agent Platform (GEAP)** and **Agent Development Kit (ADK 2.0)**, they must govern multi-turn reasoning loops, dynamic Model Context Protocol (MCP) tool calls, shared context caches, and tenant-built custom agents across competing enterprise customers—without eroding SaaS gross margins (COGS) or risking cross-tenant data bleed.

| Dimension | Pattern A: Pooled Architecture (`Maximum Density`) | Pattern B: Sovereign Silos (`Zero Trust Isolation`) | Pattern C: Dynamic Hybrid (`Intelligent Routing`) |
| :--- | :--- | :--- | :--- |
| **Isolation Model** | Shared runtime & compute pools with logical + cryptographic isolation (`5-Hop Context Chain`) | Dedicated GCP project, VPC-SC perimeter, PAB policy & CMEK per corporate tenant | Unified control plane & tenant-aware gateway routing across mixed Pooled & Sovereign tiers |
| **Compute & Runtime** | Shared GEAP Agent Runtime (gVisor sandbox) + immutable `temp:tenant_id` | Dedicated per-tenant GEAP Runtime or air-gapped **Gemma 3 on GKE** | Shared Pool for Standard tenants + **Private Service Connect (PSC)** spokes for Enterprise tenants |
| **Data & Memory Plane** | Shared AlloyDB with **Row-Level Security (RLS)** + tenant-prefixed 5-Level Memory Bank | Dedicated AlloyDB / BigQuery per project + **Cloud KMS CMEK** kill-switch | Shared RLS DB for Standard + PSC bridge to dedicated CMEK data spokes for Enterprise |
| **FinOps & COGS Profile** | Lowest unit cost; **Prompt Prefix Caching (`ContextCacheConfig`)** yields up to **90% COGS savings** | Dedicated project quotas & Provisioned Throughput; zero noisy neighbors | Pooled efficiency for SMB/Standard + dedicated SLA & zero-downtime live tier upgrades |
| **Ideal Workload Fit** | Standard B2B SaaS tiers & high-volume tasks | Healthcare, FinTech & regulated enterprises | Tiered SaaS models serving SMB to Fortune 500 |
| **Delivery Milestone** | **Milestone 1 • Week 4** (`workstream-2-pattern-a-pooled/`) | **Milestone 2 • Week 7** (`workstream-3-pattern-b-siloed/`) | **Milestone 3 • Week 10** (`workstream-4-pattern-c-hybrid/`) |

### Google Cloud Architecture Center & PromptCanvas Vision Draw.io Blueprints — 14 Diagrams (`.drawio` • `.drawio.png` • `.svg` • `.png` • `.vision.json`)

The **WS x.y** label is the *source deliverable* each diagram was drawn from (e.g. `2.6` = `2.6-terraform-starter/`). Seven cover the architecture documents (x.1, 1.3, 2.5, 5.1); seven cover the environment-setup guides (x.2), Terraform blueprints (x.6) and the zero-downtime tier-upgrade suite (4.5).

![GEAP Multi-Tenant Agentic AI Taxonomy Overview (Draw.io Render)](diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png)

| Workstream | Blueprint Title | Draw.io Render (`.drawio.png`) | Editable Draw.io (`.drawio` / `.xml`) | Vision AST (`.vision.json`) | Cloud Arch PNG / SVG |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WS 1.1** | **GEAP Multi-Tenant Agentic AI Taxonomy: Pattern A, B & C Overview** | [`Draw.io PNG`](diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png) | [`.drawio`](diagrams/ws1-multi-tenant-taxonomy-overview.drawio) • [`.xml`](diagrams/ws1-multi-tenant-taxonomy-overview.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json) | [`PNG`](diagrams/ws1-multi-tenant-taxonomy-overview.png) • [`SVG`](diagrams/ws1-multi-tenant-taxonomy-overview.svg) |
| **WS 1.3** | **Cloud Architecture Center 5-Hop Cryptographic Context Chain Baseline** | [`Draw.io PNG`](diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png) | [`.drawio`](diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) • [`.xml`](diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json) | [`PNG`](diagrams/ws1-cloud-arch-center-5hop-baseline.png) • [`SVG`](diagrams/ws1-cloud-arch-center-5hop-baseline.svg) |
| **WS 2.1** | **Pattern A: High-Density Pooled Multi-Tenant Architecture & 90% COGS Cache** | [`Draw.io PNG`](diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio.png) | [`.drawio`](diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio) • [`.xml`](diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws2-pattern-a-pooled-5hop-architecture.vision.json) | [`PNG`](diagrams/ws2-pattern-a-pooled-5hop-architecture.png) • [`SVG`](diagrams/ws2-pattern-a-pooled-5hop-architecture.svg) |
| **WS 2.5** | **Pattern A: 10-Point Cross-Tenant Breach Defense & Guardrail Matrix** | [`Draw.io PNG`](diagrams/ws2-pattern-a-breach-defense-sequence.drawio.png) | [`.drawio`](diagrams/ws2-pattern-a-breach-defense-sequence.drawio) • [`.xml`](diagrams/ws2-pattern-a-breach-defense-sequence.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws2-pattern-a-breach-defense-sequence.vision.json) | [`PNG`](diagrams/ws2-pattern-a-breach-defense-sequence.png) • [`SVG`](diagrams/ws2-pattern-a-breach-defense-sequence.svg) |
| **WS 3.1** | **Pattern B: Zero-Trust Sovereign Silos (VPC-SC, PAB, CMEK & Air-Gapped Gemma 3)** | [`Draw.io PNG`](diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.png) | [`.drawio`](diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio) • [`.xml`](diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws3-pattern-b-sovereign-silos-architecture.vision.json) | [`PNG`](diagrams/ws3-pattern-b-sovereign-silos-architecture.png) • [`SVG`](diagrams/ws3-pattern-b-sovereign-silos-architecture.svg) |
| **WS 4.1** | **Pattern C: Dynamic Hybrid Hub-and-Spoke, PSC Bridge & Live Tier Migration** | [`Draw.io PNG`](diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.png) | [`.drawio`](diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio) • [`.xml`](diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws4-pattern-c-hybrid-psc-and-migration.vision.json) | [`PNG`](diagrams/ws4-pattern-c-hybrid-psc-and-migration.png) • [`SVG`](diagrams/ws4-pattern-c-hybrid-psc-and-migration.svg) |
| **WS 5.1** | **Executive Topology Decision Tree & The Multi-Tenant Agentic Triad** | [`Draw.io PNG`](diagrams/ws5-decision-tree-and-agentic-triad.drawio.png) | [`.drawio`](diagrams/ws5-decision-tree-and-agentic-triad.drawio) • [`.xml`](diagrams/ws5-decision-tree-and-agentic-triad.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws5-decision-tree-and-agentic-triad.vision.json) | [`PNG`](diagrams/ws5-decision-tree-and-agentic-triad.png) • [`SVG`](diagrams/ws5-decision-tree-and-agentic-triad.svg) |
| **WS 2.2** | **Pattern A Demo Environment & 3P Auth Sandbox: Pooled Project, Federated IdPs, OAuth 2LO/3LO Apps, Redis & Firestore Tenant Config** | [`Draw.io PNG`](diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.drawio.png) | [`.drawio`](diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.drawio) • [`.xml`](diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws2-demo-env-and-3p-auth-sandbox-topology.vision.json) | [`PNG`](diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.png) • [`SVG`](diagrams/ws2-demo-env-and-3p-auth-sandbox-topology.svg) |
| **WS 2.6** | **Pattern A 1-Click Terraform Starter: Provider → Cloud Armor WAF → Cloud Run v2 GEAP Gateway → Redis / KMS CMEK → BigQuery OTel Resource Graph** | [`Draw.io PNG`](diagrams/ws2-terraform-starter-resource-graph.drawio.png) | [`.drawio`](diagrams/ws2-terraform-starter-resource-graph.drawio) • [`.xml`](diagrams/ws2-terraform-starter-resource-graph.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws2-terraform-starter-resource-graph.vision.json) | [`PNG`](diagrams/ws2-terraform-starter-resource-graph.png) • [`SVG`](diagrams/ws2-terraform-starter-resource-graph.svg) |
| **WS 3.2** | **Pattern B Provisioning Topology: Org → Per-Tenant Silo Projects, VPC-SC Perimeters, IAM PAB & Cloud KMS CMEK Keys** | [`Draw.io PNG`](diagrams/ws3-multi-project-silo-and-cmek-setup-topology.drawio.png) | [`.drawio`](diagrams/ws3-multi-project-silo-and-cmek-setup-topology.drawio) • [`.xml`](diagrams/ws3-multi-project-silo-and-cmek-setup-topology.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws3-multi-project-silo-and-cmek-setup-topology.vision.json) | [`PNG`](diagrams/ws3-multi-project-silo-and-cmek-setup-topology.png) • [`SVG`](diagrams/ws3-multi-project-silo-and-cmek-setup-topology.svg) |
| **WS 3.6** | **Terraform Blueprint Resource Graph: Provider → Cloud KMS CMEK → VPC-SC Perimeter → Sovereign VPC → Private Air-Gapped GKE (Gemma 3)** | [`Draw.io PNG`](diagrams/ws3-terraform-silo-blueprint-resource-graph.drawio.png) | [`.drawio`](diagrams/ws3-terraform-silo-blueprint-resource-graph.drawio) • [`.xml`](diagrams/ws3-terraform-silo-blueprint-resource-graph.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws3-terraform-silo-blueprint-resource-graph.vision.json) | [`PNG`](diagrams/ws3-terraform-silo-blueprint-resource-graph.png) • [`SVG`](diagrams/ws3-terraform-silo-blueprint-resource-graph.svg) |
| **WS 4.2** | **Pattern C Demo Environment: Central Ingress Hub, Shared Pool & PSC Service Attachment Spokes** | [`Draw.io PNG`](diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio.png) | [`.drawio`](diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio) • [`.xml`](diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws4-hub-and-spoke-demo-env-setup-topology.vision.json) | [`PNG`](diagrams/ws4-hub-and-spoke-demo-env-setup-topology.png) • [`SVG`](diagrams/ws4-hub-and-spoke-demo-env-setup-topology.svg) |
| **WS 4.5** | **Zero-Downtime Tier Upgrade Test Sequence: SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY (4/4 PASS)** | [`Draw.io PNG`](diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio.png) | [`.drawio`](diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio) • [`.xml`](diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws4-zero-downtime-tier-upgrade-sequence.vision.json) | [`PNG`](diagrams/ws4-zero-downtime-tier-upgrade-sequence.png) • [`SVG`](diagrams/ws4-zero-downtime-tier-upgrade-sequence.svg) |
| **WS 4.6** | **Terraform Hybrid PSC Blueprint Resource Graph: Hub VPC → Consumer PSC Endpoint → Producer ServiceAttachment in Enterprise Spoke** | [`Draw.io PNG`](diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio.png) | [`.drawio`](diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio) • [`.xml`](diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio.xml) | [`JSON`](diagrams/vision_metadata/ws4-terraform-hybrid-psc-blueprint-resource-graph.vision.json) | [`PNG`](diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.png) • [`SVG`](diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.svg) |

### 🎨 Portal Themes

The interactive portal (`python3 -B server.py` → <http://127.0.0.1:8095/>) has a header theme picker with **Midnight** (default), **Light**, **Google Cloud**, **Slate**, **Solarized Dark**, **High Contrast** and **Auto (follow OS)**. Every colour in `index.html` is a CSS custom property under `:root` / `[data-theme=…]`, the choice persists in `localStorage` (`geap-portal-theme`) and is applied before first paint, and `window.setPortalTheme('<name>')` switches it programmatically.

### 🔗 Portal Routing

Any repository Markdown file can be opened directly in the portal reader — `http://127.0.0.1:8095/<path>.md` redirects to `/?doc=<path>` (append `?raw=1` for the raw file), links between documents stay inside the reader, and every other asset (`.pptx`, `.drawio`, `.svg`, `.png`, `.tf`, `.py`, `.json`, …) is served as a static download from the same origin.

### 📚 End-to-End Guide — Every Workstream, Every Diagram

[`docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md`](docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md) is the single linear read of the whole program: program foundations (5-Hop chain, anchor case study, visual language), then for each Workstream 1–5 the objective, a map of **every** numbered deliverable, the end-to-end flow, and for each of the **14 blueprints** a metadata table, the question it answers, a zone-by-zone walkthrough of every card and label, the steps 1–7 narrative, grounding in the source deliverable, design trade-offs, honest caveats and edit/reuse notes — plus a consolidated product-gap backlog and appendices. Regenerate with `python3 -B scripts/build_end_to_end_guide.py`.

### Per-Workstream Explanatory Blogs & 100% Editable Slide Decks (PromptCanvas Vision Module → `.pptx`)

Every diagram is embedded in PowerPoint / Google Slides as **native editable shapes, icons and connectors** (not a picture) via the PromptCanvas Vision Decompiler (`appendEditableDrawioSlides`). Each deck follows: Title → Executive TL;DR → Section narrative → per diagram [1:1 Master image • Decomposed editable slide with talking-points sidebar & speaker notes • Component spec table] → Key Takeaways → Asset index. Rebuild with `scripts/build_editable_slide_decks.ts`; preview with `python3 -B scripts/render_pptx_preview.py slides/<deck>.pptx`.

| Workstream | Explanatory Blog | Editable Slide Deck (`.pptx`) | Diagrams Embedded | Slides • Shapes • Connectors |
| :--- | :--- | :--- | :--- | :--- |
| **WS 1** | [Reference Architecture: Taxonomy & 5-Hop Baseline](blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md) | [`ws1-reference-architecture-editable-slides.pptx`](slides/ws1-reference-architecture-editable-slides.pptx) | WS 1.1 • WS 1.3 | 16 • 112 • 46 |
| **WS 2** | [Pattern A: High-Density Pooled Architecture](blogs/ws2-pattern-a-pooled-architecture.md) | [`ws2-pattern-a-pooled-editable-slides.pptx`](slides/ws2-pattern-a-pooled-editable-slides.pptx) | WS 2.1 • 2.2 • 2.5 • 2.6 | 21 • 224 • 92 |
| **WS 3** | [Pattern B: Zero-Trust Sovereign Silos](blogs/ws3-pattern-b-sovereign-silos.md) | [`ws3-pattern-b-siloed-editable-slides.pptx`](slides/ws3-pattern-b-siloed-editable-slides.pptx) | WS 3.1 • 3.2 • 3.6 | 19 • 168 • 69 |
| **WS 4** | [Pattern C: Hybrid Hub-and-Spoke & Dynamic Tiering](blogs/ws4-pattern-c-hybrid-dynamic-tiering.md) | [`ws4-pattern-c-hybrid-editable-slides.pptx`](slides/ws4-pattern-c-hybrid-editable-slides.pptx) | WS 4.1 • 4.2 • 4.5 • 4.6 | 22 • 224 • 92 |
| **WS 5** | [Decision Guide & The Agentic Triad](blogs/ws5-decision-guide-and-agentic-triad.md) | [`ws5-wrap-up-editable-slides.pptx`](slides/ws5-wrap-up-editable-slides.pptx) | WS 5.1 / 5.2 | 13 • 56 • 23 |
| **ALL** | All five blogs | [`geap-multi-tenancy-all-workstreams-editable-slides.pptx`](slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx) | All 14 blueprints | 60 • 784 • 322 |

Manifest: [`slides/slides_manifest.json`](slides/slides_manifest.json).

---

## 2. Anchor Case Study: The "Cymbal" B2B SaaS Scenario

All workstreams share a unified anchor case study: **Cymbal SaaS Platform**, a B2B SaaS provider for IT observability and incident management.

1. **Platform Operator (ISV) — Cymbal SaaS Platform**:
   * Publishes the **Shared Incident Diagnostic Agent** (correlates outage telemetry, queries tenant runbooks, and proposes remediation).
   * Runs **Gemini 2.5 Pro** with shared **Prompt Prefix Caching (`ContextCacheConfig`)** for up to **90% COGS savings**.
   * Dynamically loads per-tenant prompts, thinking budgets, and GCS Skills via **Firestore + Memorystore for Redis**.
   * Connects to Cymbal Core Telemetry API via **2LO Implicit Session Passthrough**.
2. **Tenant Alpha (Enterprise Tier) — FinVault Bank**:
   * Regulated digital bank running on **Google Workspace & Jira**.
   * Entitled to an extended **8,000 thinking-token budget** on the Shared Diagnostic Agent.
   * Provisions a private self-service **Regulatory Escalation Agent (`Agent Alpha`)** via REST API / `agents-cli`, running **Claude Sonnet on Vertex AI Model Garden** with hot-swappable model configuration.
   * Uses **3LO Google OIDC** for Google Drive, Calendar post-mortems, and Gmail incident briefs, plus **CMEK-encrypted memory (`finvault:user:session`)**.
3. **Tenant Beta (Standard Tier) — RetailStream Corp**:
   * Global e-commerce retailer on **100% Microsoft 365 & ServiceNow** (Zero Google Footprint).
   * Uses the Shared Diagnostic Agent only, capped at a **4,000 thinking-token budget** and a **Redis rate-limit bulkhead**.
   * Authenticates via **Microsoft Entra ID** and connects to **SharePoint runbooks & ServiceNow ITOM** using **Inline 3LO OAuth Consent** mid-session.
   * Enforces strict boundaries: zero visibility into FinVault's `Agent Alpha` (`403 Forbidden` on direct API call), and RetailStream's ServiceNow MCP connector is invisible to FinVault.

---

## 3. Repository & Workstream Deliverable Map

### Reusable Core Engine (`80% Shared Code`)
* [`core-cymbal-agent/`](core-cymbal-agent)
  * [`models.py`](core-cymbal-agent/models.py) — Cryptographic context, tenant tiers, and governance receipt data structures.
  * [`governance/hop1_edge_identity_pep.py`](core-cymbal-agent/governance/hop1_edge_identity_pep.py) — Cloud Armor/IAP header sanitization (`X-Tenant-ID` stripping), RFC 8693 OBO + DPoP, and Auth Manager binding.
  * [`governance/hop2_registry_pdp_callbacks.py`](core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) — GEAP Agent Registry PDP filtering & ADK `before_agent_callback` tool pruning.
  * [`governance/hop3_compute_finops_bulkhead.py`](core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) — gVisor `temp:tenant_id` binding, 5-Level Memory Bank, `ContextCacheConfig`, and Redis Token Bulkheads.
  * [`governance/hop4_model_armor_guardrails.py`](core-cymbal-agent/governance/hop4_model_armor_guardrails.py) — Vertex AI Model Armor ingress prompt screen, Semantic NLCs, and egress SDP PII redaction.
  * [`governance/hop5_data_rls_and_otel.py`](core-cymbal-agent/governance/hop5_data_rls_and_otel.py) — 2LO/3LO token broker, AlloyDB Row-Level Security (RLS), and BigQuery OpenTelemetry audit sink.
  * [`agents/shared_diagnostic_agent.py`](core-cymbal-agent/agents/shared_diagnostic_agent.py) & [`agents/finvault_agent_alpha.py`](core-cymbal-agent/agents/finvault_agent_alpha.py) — Shared Gemini Pro diagnostic agent and FinVault private Claude Sonnet regulatory agent.
  * [`mcp_servers/cymbal_mcp_hub.py`](core-cymbal-agent/mcp_servers/cymbal_mcp_hub.py) — 2LO Telemetry MCP, 3LO Google Workspace/Jira MCP, and 3LO Microsoft Entra ID SharePoint/ServiceNow MCP.

### Workstream 1: Prepare Reference Architectures & Update GCP Documentation
* [`workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md`](workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md)
* [`workstream-1-reference-architecture/1.2-product-team-review-pack.md`](workstream-1-reference-architecture/1.2-product-team-review-pack.md)
* [`workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md`](workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)
* [`workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md`](workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)

### Workstream 2: Case Study — Pooled Architecture (Pattern A) [Weeks 1–4 Priority]
* [`workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md`](workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md)
* [`workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md`](workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md)
* [`workstream-2-pattern-a-pooled/2.3-solution-implementation/`](workstream-2-pattern-a-pooled/2.3-solution-implementation)
* [`workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md`](workstream-2-pattern-a-pooled/2.4-product-gaps-prioritization.md)
* [`workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py`](workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py)
* [`workstream-2-pattern-a-pooled/2.6-terraform-starter/`](workstream-2-pattern-a-pooled/2.6-terraform-starter)
* [`workstream-2-pattern-a-pooled/2.7-blog-pooled-architecture-governance.md`](workstream-2-pattern-a-pooled/2.7-blog-pooled-architecture-governance.md)
* [`workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck/`](workstream-2-pattern-a-pooled/2.8-codelab-and-workshop-deck)
* [`workstream-2-pattern-a-pooled/2.9-go-demos-and-video-script.md`](workstream-2-pattern-a-pooled/2.9-go-demos-and-video-script.md)

### Workstream 3: Case Study — Siloed Architecture (Pattern B) [Weeks 4–7]
* [`workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md`](workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)
* [`workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md`](workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md)
* [`workstream-3-pattern-b-siloed/3.3-solution-implementation/`](workstream-3-pattern-b-siloed/3.3-solution-implementation)
* [`workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md`](workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md)
* [`workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py`](workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py)
* [`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/`](workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint)
* [`workstream-3-pattern-b-siloed/3.7-blog-sovereign-silos.md`](workstream-3-pattern-b-siloed/3.7-blog-sovereign-silos.md)
* [`workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/`](workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck)
* [`workstream-3-pattern-b-siloed/3.9-go-demos-and-video-script.md`](workstream-3-pattern-b-siloed/3.9-go-demos-and-video-script.md)

### Workstream 4: Case Study — Hybrid Architecture (Pattern C) [Weeks 7–10]
* [`workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md`](workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md)
* [`workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md`](workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md)
* [`workstream-4-pattern-c-hybrid/4.3-solution-implementation/`](workstream-4-pattern-c-hybrid/4.3-solution-implementation)
* [`workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md`](workstream-4-pattern-c-hybrid/4.4-product-collaboration-psc-and-registry.md)
* [`workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py`](workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py)
* [`workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/`](workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint)
* [`workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md`](workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md)
* [`workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck/`](workstream-4-pattern-c-hybrid/4.8-codelab-and-workshop-deck)
* [`workstream-4-pattern-c-hybrid/4.9-go-demos-and-video-script.md`](workstream-4-pattern-c-hybrid/4.9-go-demos-and-video-script.md)

### Workstream 5: Wrap-Up & Capstone Backlog
* [`workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md`](workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md)
* [`workstream-5-wrap-up-and-backlog/5.2-blog-multi-tenant-agentic-triad.md`](workstream-5-wrap-up-and-backlog/5.2-blog-multi-tenant-agentic-triad.md)
