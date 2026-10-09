## Workstream 1 — Reference Architecture (Milestone 0)

### Objective & outcome

Workstream 1 is the design week of the program's `1W Design • 2W Build • 1W Launch` rhythm. Its brief was to take the published Google Cloud Architecture Center reference, [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) — which models an *intra-enterprise* topology with one spoke project per internal business unit — and extend it to **B2B ISV SaaS** topologies where competing external customers share (or deliberately do not share) runtime, network, data and model capacity.

What it produced:

* A **three-pattern taxonomy** — Pattern A (Pooled), Pattern B (Sovereign Silos), Pattern C (Dynamic Hybrid) — decomposed along seven dimensions in [1.1](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md).
* The **5-Hop Cryptographic Context Chain** (Edge PEP → Registry PDP → Compute & FinOps Bulkheads → Model Armor & Semantic NLCs → Data RLS, 2LO/3LO Auth Manager & BigQuery OTel), implemented once as five Python modules in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) and reused by every later pattern (the "80% reusable core + 20% topology delta" principle stated in [README.md](../README.md)).
* Two Architecture-Center-style blueprints (**Diagram 1** and **Diagram 2** below), a drop-in documentation PR ([1.3](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md)), a product review pack ([1.2](../workstream-1-reference-architecture/1.2-product-team-review-pack.md)), and a consolidated EAP / product-gap ledger ([1.4](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md)).
* An explanatory blog ([ws1-reference-architecture-taxonomy-and-5hop-baseline.md](../blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md)) and a 16-slide editable deck ([ws1-reference-architecture-editable-slides.pptx](../slides/ws1-reference-architecture-editable-slides.pptx), 112 shapes / 46 connectors per [slides_manifest.json](../slides/slides_manifest.json)).

Who consumes it: Workstreams 2–4 (one pattern each, Milestones 1–3 at Weeks 4, 7, 10) take the taxonomy, hop modules and gap IDs as fixed inputs; Workstream 5 builds its decision guide on the same three patterns; the Cloud Architecture Center enablement team receives 1.3 as a reviewable PR; GEAP, ADK 2.0, Auth Manager, Model Armor and VPC-SC/PAB product teams receive 1.2 and 1.4.

The anchor case study used throughout is **Cymbal SaaS Platform** (ISV publishing a Shared Incident Diagnostic Agent on Gemini 2.5 Pro with `ContextCacheConfig` prefix caching), **FinVault Bank** (Tenant Alpha, Enterprise tier, Google Workspace/Jira, Google OIDC, 8,000 thinking-token budget, private `Agent Alpha` on Claude Sonnet via Vertex AI Model Garden, CMEK memory `finvault:user:session`) and **RetailStream Corp** (Tenant Beta, Standard tier, zero Google footprint, Microsoft Entra ID, SharePoint/ServiceNow, 4,000 thinking-token cap behind a Redis bulkhead). The hard requirement is symmetric invisibility: RetailStream receives `403 Forbidden` on any direct call to `Agent Alpha`, and RetailStream's ServiceNow MCP connector never appears in FinVault's catalog.

### Deliverables map

| # | Deliverable | Purpose | Key content | Visualised by |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | [1.1-architecture-taxonomy-and-diagrams.md](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md) | Define the Pattern A / B / C taxonomy and the topology diagrams | 7-dimension taxonomy table (control plane, compute, network, identity, data/memory, model/FinOps, target segment); three Mermaid flowcharts (2.1 Pattern A five-hop flow, 2.2 Pattern B silos, 2.3 Pattern C hybrid); embeds of both blueprints | **Diagram 1** (`ws1-multi-tenant-taxonomy-overview`) |
| 1.2 | [1.2-product-team-review-pack.md](../workstream-1-reference-architecture/1.2-product-team-review-pack.md) | Align product engineering on the 5-Hop chain across the three patterns | 4-pillar verification matrix with hop mapping and status; three sets of sign-off questions (GEAP Runtime/ADK, Auth Manager/MCP, Networking/VPC-SC) | None — see note below |
| 1.3 | [1.3-cloud-architecture-center-doc-update-pr.md](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md) | Drop-in PR expanding the Architecture Center article | PR title, summary of changes, diff patch for intro + "Choose a multi-tenant agentic topology" table, new "Enforcing the 5-Hop Cryptographic Context Chain" section (four failure modes + five hops) | **Diagram 2** (`ws1-cloud-arch-center-5hop-baseline`) |
| 1.4 | [1.4-eap-and-product-gap-tracker.md](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) | Consolidated EAP and product-gap ledger feeding WS2.4 / WS3.4 / WS4.4 | 9 gaps (`GAP-P0-01`..`GAP-P2-02`) with failure mode, engineered workaround, EAP allowlist name and target quarter; `gcloud services enable` onboarding checklist | None — see note below |

**Why 1.2 has no diagram.** It is a review pack, not an architecture: its unit of content is a verification item and a sign-off question. Key content:

* Pillar matrix: Pillar 1 Catalog & Agent Visibility (Hop 2) — validated in ADK 2.0 callback, native Registry PDP tenant-label enforcement tracked as `GAP-P0-01`; Pillar 2 Identity & Tool Auth (Hops 1 & 5) — validated, Entra ID refresh-token rotation tracked as `GAP-P1-02`; Pillar 3 Model, Memory & FinOps (Hop 3) — prefix caching verified, per-namespace CMEK tracked as `GAP-P0-02`; Pillar 4 Guardrails, Data & Audit (Hops 4 & 5) — validated end-to-end.
* Sign-off asks: `temp:` prefixed state keys must not be overwritable by tool-call arguments or `transfer_to_agent`; unified `thinking_budget` and OTel token accounting across Gemini 2.5 Pro and Model Garden partner models; Auth Manager federation of Entra ID v2.0 with DPoP (`rfc9449`) without a Google Workspace shadow account.
* Networking asks: CMEK revocation propagation SLA `<= 60 seconds` across Memory Bank, AlloyDB and Vertex AI context caches (Pattern B); VPC-SC ingress/egress syntax for the routing-hub service account to traverse PSC into a tenant perimeter while preserving PAB (Pattern C).

**Why 1.4 has no diagram.** It is a tracker; its rows are owned by later workstreams and several of them *are* visualised there (e.g. the tier migrator in WS4). Key content:

* Three **P0** gaps, all Pattern A / WS2, all targeting Q4 2026: `GAP-P0-01` GEAP Agent Registry filters by IAM project principal rather than `tenant_id` claim (workaround: Cloud Run gateway PEP + `before_agent_callback` pruning, `403 Forbidden`; EAP `geap-registry-tenant-label-pdp-eap`); `GAP-P0-02` Memory Bank has project-level CMEK only, no per-`tenant_id` namespace key (workaround: envelope encryption via Cloud KMS in `hop3_compute_finops_bulkhead.py`, or route to a Pattern C PSC memory spoke; EAP `geap-memory-bank-per-tenant-cmek-eap`); `GAP-P0-03` OBO + DPoP from external Entra ID needs custom verification before Auth Manager (workaround: `jkt` thumbprint check + header stripping in `hop1_edge_identity_pep.py`; EAP `gcp-agent-identity-dpop-entra-eap`).
* Four **P1** gaps: `GAP-P1-01` unified cache API across Gemini `ContextCacheConfig` and Anthropic prompt-cache headers (Q1 2027); `GAP-P1-02` stateless ADK OAuth checkpointing in Firestore/Redis for inline 3LO consent (Q4 2026); `GAP-P1-03` VPC-SC egress bridge (Envoy/Cloud NAT, FQDN allowlist) for remote MCP (Q4 2026); `GAP-P1-04` CMEK revocation latency — up to 5 minutes in long-lived pods, workaround sub-second KMS probe returning HTTP `423 Locked` (Q1 2027).
* Two **P2** gaps (WS4, Q1 2027): `GAP-P2-01` cross-project federated registry over PSC; `GAP-P2-02` zero-downtime `Standard -> Enterprise` tier migrator (Shadow State Replication → Atomic Firestore Route Cutover → In-Flight Session Drain). Plus the API enablement list (`aiplatform`, `discoveryengine`, `modelarmor`, `dlp`, `compute`, `run`, `alloydb`, `redis`, `cloudkms`, `accesscontextmanager`, `iam`, `bigquery`, `telemetry`) and a Claude 3.7 Sonnet Model Garden access check for `us-central1` / `us-east5`.

### End-to-end flow of the workstream

1. **1.1 defines the design space.** The taxonomy table fixes what differs per pattern (control plane, runtime, perimeter, identity, data, model/FinOps, segment) and what does not (the 5-Hop chain). Diagram 1 is drawn directly from it: one shared control plane, two spokes, identical five-card structure in each.
2. **1.2 exposes the design to product owners.** Every hop in 1.1 is mapped to a governance pillar and a product team; each gets a validation item and a status. Where the status is "tracked in EAP", a gap ID is minted.
3. **1.3 publishes the baseline.** The same chain is overlaid onto the *official* hub-and-spoke diagram vocabulary so the Architecture Center team can review line-by-line. Diagram 2 is the figure for that new section; it deliberately keeps the article's zone names ("Routing hub", "Central governance and security hub", PAB-bounded tenant spokes).
4. **1.4 consolidates the gaps.** Every gap ID referenced in 1.2 lands in one ledger with workaround file, EAP name and target quarter, and is assigned to WS2 (Pattern A), WS3 (Pattern B) or WS4 (Pattern C).
5. **Hand-off to WS2–5.** WS2/3/4 each inherit one pattern column from 1.1, the hop modules from `core-cymbal-agent/governance/`, and their gap rows from 1.4 (surfacing in deliverables 2.4, 3.4 and 4.4). WS5's decision guide compares the three columns of the 1.1 table.

#### Taxonomy at a glance (from 1.1 §1)

| Dimension | Pattern A: Pooled | Pattern B: Sovereign Silos | Pattern C: Dynamic Hybrid |
| :--- | :--- | :--- | :--- |
| Control plane | Single shared GEAP control plane & Agent Registry | Dedicated GCP project & control plane per tenant | Unified control plane + tenant-aware ingress router |
| Compute & runtime | Shared GEAP Agent Runtime (gVisor) + immutable `temp:tenant_id` | Dedicated runtime or air-gapped Gemma 3 on GKE | Shared pool (Standard) + PSC spokes (Enterprise) |
| Network perimeter | Single shared VPC behind Cloud Armor + IAP | Per-tenant VPC-SC perimeter + mTLS ingress | Hub-and-spoke VPC with PSC service attachments |
| Identity & access | RFC 8693 OBO + DPoP; Auth Manager 2LO/3LO | IAM PAB + per-project Workload Identity Pools | Unified IdP broker + cross-project PAB + PSC identity propagation |
| Data & memory | Shared AlloyDB RLS + `{tenant}:{user}:{session}` Memory Bank | Dedicated AlloyDB/BigQuery + Cloud KMS CMEK | Shared RLS DB (Standard) + CMEK spokes via PSC (Enterprise) |
| Model & FinOps | Shared `ContextCacheConfig` (up to 90% COGS savings) + Redis bulkheads | Dedicated Provisioned Throughput per project | Pooled caching (Standard) + PT / Model Garden Claude (Enterprise) |
| Target segment / milestone | Standard B2B SaaS (RetailStream) • WS2, Week 4 | Regulated FinTech/Healthcare (FinVault) • WS3, Week 7 | SMB-to-Fortune-500 tiers with live upgrades • WS4, Week 10 |

#### 5-Hop chain reference (code the diagrams point at)

| Hop | Module | Governance pillar | What it enforces (per module docstring) |
| :--- | :--- | :--- | :--- |
| 1 | [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Pillar 2 (Identity & Tool Auth) | Strips forged `x-tenant-id` / `x-cymbal-tenant` / `x-cymbal-tier` / `x-gcp-project-override`; verifies Google OIDC or Entra ID JWT; RFC 8693 OBO bound to DPoP `jkt`; emits `CryptographicContext` |
| 2 | [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | Pillar 1 (Catalog & Agent Visibility) | Registry PDP by tenant label; ARD catalog filtering; `403 Forbidden` on `agent://finvault/private-agent-alpha-regulatory` from RetailStream; `before_agent_callback` tool pruning |
| 3 | [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | Pillar 3 (Model, Memory & FinOps) | Immutable `temp:tenant_id`; Firestore/Memorystore tenant config and `gs://cymbal-skills-{tenant_id}/` skill scoping; 8,000 vs 4,000 budgets; 5-Level Memory Bank; CMEK key-state check; shared `ContextCacheConfig` |
| 4 | [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Pillar 4 (Guardrails) | Ingress screen for injection / `dump context cache` / `set local app.current_tenant` / `switch tenant to`; tenant Semantic NLCs (OCC/FDIC vs PCI); egress SDP (bank/IBAN/SWIFT vs PAN) |
| 5 | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | Pillars 2 & 4 (Tool Auth, Data & Audit) | `SET LOCAL app.current_tenant` on every AlloyDB transaction; 2LO passthrough + 3LO via `CymbalMCPHub` with inline Entra consent; OTel spans to BigQuery |

Each module consumes the `CryptographicContext` minted at Hop 1 and emits a `HopAuditRecord` (types in [`core-cymbal-agent/models.py`](../core-cymbal-agent/models.py)); the pipeline is sequenced in [`core-cymbal-agent/runtime_pipeline.py`](../core-cymbal-agent/runtime_pipeline.py).

#### Diagram 1 vs Diagram 2 — what changes between the two WS1 figures

Both figures are produced by the same blueprint renderer and share geometry, icon set and shape counts; only labels differ. The table below is the complete label delta, useful when deciding which figure to show.

| Element | Diagram 1 (1.1 Taxonomy) | Diagram 2 (1.3 Doc PR baseline) |
| :--- | :--- | :--- |
| Actor | Competing B2B Tenants / FinVault (OIDC) & RetailStream (Entra) | User / OIDC / Entra JWT |
| Outer boundary | Shared Control Plane & Multi-Tenant Governance Perimeter (80% Reusable Core + 20% Topology Delta) | Shared hubs (VPC Service Controls Organization Perimeter) |
| Inner boundary | VPC & 5-Hop Cryptographic Context Chain | VPC |
| Routing hub title / sub | Routing hub (Hop 1 & Hop 2 PEP/PDP) / Central ingress, OBO+DPoP & ARD catalog filter | Routing hub (Hop 1 & Hop 2) / Central ingress & cryptographic token exchange |
| Top-left card | Cloud Armor & IAP / Strip Forged X-Tenant-ID | Cloud Armor / Strips Forged X-Tenant-ID |
| Mid-left card | Model Armor / Ingress Prompt Screen | Model Armor / Edge Prompt Injection Gate |
| Bottom-left card | RFC 8693 OBO + DPoP / Sender-Constrained JWT | IAP / RFC 8693 OBO + DPoP |
| Cloud Run card | Topology Router & ARD PDP | Frontend portal & Hop 2 PDP |
| Edge labels (TL / ML / BL) | Header & WAF policies / Sanitize prompt / OBO + DPoP verification | Security policies / Sanitize prompt / User authentication |
| Governance hub title | Central governance and FinOps observability hub | Central governance and security hub |
| Governance cards | SCC Cross-Pattern Breach Alerts; Central IAM & PAB Agent Identity (2LO/3LO); Cloud Logging & BQ Zero-PII OTel & Chargeback | SCC Continuous Threat Detection; Central IAM Auth Manager (2LO / 3LO); Cloud Logging BigQuery OTel Audit Sink |
| Step 3 / Step 7 trunk | Route by tenant tier (Pool, Silo or PSC) / Sanitized response with SDP redaction | Route request to tenant / Sanitized response from tenant |
| Dashed governance label | Security, OTel & FinOps chargeback telemetry | Security and observability monitoring |
| Left boundary / zone | Pattern A: Pooled Shared Runtime (Standard & High-Density SaaS) / Tenant Pool (Shared Runtime) — FinVault (8k Cap) & RetailStream (4k Cap) | PAB • Hop 3–5 Isolation Boundary (Tenant Alpha) / Tenant A (FinVault Bank) — Tenant project • Enterprise Tier (Google OIDC) |
| Right boundary / zone | Pattern B (Sovereign Silos) & Pattern C (Hybrid PSC Spokes) / Dedicated Sovereign Tenant Project — VPC-SC + IAM PAB + CMEK Kill-Switch + PSC | PAB • Hop 3–5 Isolation Boundary (Tenant Beta) / Tenant B (RetailStream Corp) — Tenant project • Standard Tier (Entra ID) |
| Left RAG / tool labels | Scoped MCP & RAG / SET LOCAL current_tenant | Secure RAG / Agent-tool interaction |
| Right RAG / tool labels | Air-Gapped Silo RAG / CMEK-Encrypted State & Tools | Secure RAG / Agent-tool interaction |
| Semantics of the two spokes | Two **topologies** (pooled vs sovereign) | Two **tenants** in the official per-project topology |

Rule of thumb: use Diagram 1 when explaining *which pattern to pick*; use Diagram 2 when explaining *where each hop sits* in the published Architecture Center model.

### Diagram 1 — GEAP Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C)

| Field | Value |
| :--- | :--- |
| Diagram ID | `ws1-multi-tenant-taxonomy-overview` |
| Source deliverable | [1.1-architecture-taxonomy-and-diagrams.md](../workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md) (Blueprint 1A) |
| Badge | `WORKSTREAM 1.1 BLUEPRINT` |
| Subtitle | B2B ISV SaaS Reference Architecture Expanding Google Cloud Architecture Center (Cymbal SaaS Serving FinVault & RetailStream) |
| Files | [`.drawio`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) • [`.drawio.xml`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.xml) • [`.drawio.png`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png) • [`.svg`](../diagrams/ws1-multi-tenant-taxonomy-overview.svg) • [`.png`](../diagrams/ws1-multi-tenant-taxonomy-overview.png) • [`vision.json`](../diagrams/vision_metadata/ws1-multi-tenant-taxonomy-overview.vision.json) |
| Editable deck | [ws1-reference-architecture-editable-slides.pptx](../slides/ws1-reference-architecture-editable-slides.pptx) — **Figure 1** |
| Shape stats | 56 editable shapes (vertices), 23 connectors, 54 vision-addressable objects (`isCertified: true`, 0 collisions) |

![GEAP Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C)](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png)

#### The question this diagram answers

"If I run one SaaS platform for competing tenants, some of whom accept a shared runtime and some of whom demand their own project and keys, what stays the same and what changes?" The diagram answers by drawing a single shared control plane and governance perimeter with two spokes beneath it — a pooled shared runtime on the left (Pattern A) and a dedicated sovereign/PSC project on the right (Patterns B and C) — and giving both spokes the same five component cards so that the 5-Hop chain is visibly identical; only the trust boundary and the card subtitles differ.

#### Zone-by-zone walkthrough

##### Top actor

* Card: **Competing B2B Tenants** / *FinVault (OIDC) & RetailStream (Entra)*. Sits outside the Google Cloud frame. Badge **1 "Request"** leaves it downward into the External Application Load Balancer; badge **7 "Response"** returns to it.

##### Outer & inner boundary labels

* Outer white boundary (inside the blue Google Cloud frame): **Shared Control Plane & Multi-Tenant Governance Perimeter (80% Reusable Core + 20% Topology Delta)**.
* Inner white boundary: **VPC & 5-Hop Cryptographic Context Chain**.

##### Routing hub (pastel blue)

Zone title **Routing hub (Hop 1 & Hop 2 PEP/PDP)**, subtitle *Central ingress, OBO+DPoP & ARD catalog filter*. Five cards:

| Position | Icon | Title | Subtitle |
| :--- | :--- | :--- | :--- |
| Top-left | `load_balancer_cloud_armor` (Cloud Armor / LB network icon) | **Cloud Armor & IAP** | Strip Forged X-Tenant-ID |
| Mid-left | `model_armor` (Model Armor sparkle-shield) | **Model Armor** | Ingress Prompt Screen |
| Bottom-left | `iap_iam_shield` (IAM/IAP shield) | **RFC 8693 OBO + DPoP** | Sender-Constrained JWT |
| Top-right | `load_balancer_cloud_armor` | **External Application Load Balancer** | Cloud Load Balancing |
| Bottom-right | `cloud_run` (Cloud Run glyph) | **Cloud Run** | Topology Router & ARD PDP |

Edge labels: ALB → Cloud Armor & IAP **"Header & WAF policies"**; ALB → Model Armor **"Sanitize prompt"**; OBO + DPoP ↔ Cloud Run (bidirectional) **"OBO + DPoP verification"**. Between the ALB and Cloud Run: badge **2 "Request"** (down) and badge **7 "Response"** (up).

##### Central governance hub (pastel green)

Title **Central governance and FinOps observability hub**. Three cards:

* `security_command_center` — **Security Command Center** / *Cross-Pattern Breach Alerts*
* `iap_iam_shield` — **Central IAM & PAB** / *Agent Identity (2LO/3LO)*
* `cloud_logging` — **Cloud Logging & BQ** / *Zero-PII OTel & Chargeback*

A dashed bidirectional line labelled **"Security, OTel & FinOps chargeback telemetry"** connects the hub to the top edge of both spoke boundaries. It is the only edge crossing tenant boundaries and it carries telemetry, not tenant data.

##### Left spoke — Pattern A (pastel yellow)

* Boundary label: **Pattern A: Pooled Shared Runtime (Standard & High-Density SaaS)**
* Zone title / sub: **Tenant Pool (Shared Runtime)** / *FinVault (8k Cap) & RetailStream (4k Cap)*
* Cards: `model_armor` **Model Armor** / *Tenant NLCs & SDP PII*; `gemini_agent_platform` **Gemini 2.5 Pro** / *90% Prefix Cache Savings*; `gemini_agent_platform` **Agent Runtime** / *gVisor + temp:tenant_id*; `mcp_servers` **MCP servers** / *2LO + 3LO OIDC/Entra*; `datastore_alloydb_bq` **Shared AlloyDB** / *Row-Level Security (RLS)*
* Step labels: **4 "Sanitize request"**, **6 "Sanitize response"** (both next to Model Armor), **5 "Generates response"** (next to Gemini 2.5 Pro)
* RAG label (MCP → Agent Runtime): **"Scoped MCP & RAG"**; tool label (AlloyDB → MCP): **"SET LOCAL current_tenant"**

##### Right spoke — Patterns B & C (pastel coral)

* Boundary label: **Pattern B (Sovereign Silos) & Pattern C (Hybrid PSC Spokes)**
* Zone title / sub: **Dedicated Sovereign Tenant Project** / *VPC-SC + IAM PAB + CMEK Kill-Switch + PSC*
* Cards: `model_armor` **Model Armor** / *Sovereign Silo Guardrails*; `gemini_agent_platform` **Gemini / Gemma 3** / *Claude 3.7 or Private GKE*; `gemini_agent_platform` **Agent Runtime** / *Dedicated Silo + Agent Alpha*; `mcp_servers` **MCP servers** / *Local Silo 3LO Connectors*; `datastore_alloydb_bq` **CMEK Datastore** / *AlloyDB, BQ & KMS 423 Lock*
* RAG label: **"Air-Gapped Silo RAG"**; tool label: **"CMEK-Encrypted State & Tools"**
* Note: the blueprint defines step 4/5/6 badges only for the left spoke; the right spoke has none (the renderer draws callouts 4, 6, 5 at left-zone coordinates only). The right spoke's LLM card also sits directly under Model Armor rather than at the bottom-left as on the left spoke.

##### Trunk between hub and spokes

* Badge **3 "Route by tenant tier (Pool, Silo or PSC)"** on the solid trunk leaving Cloud Run down to both Agent Runtimes.
* Badge **7 "Sanitized response with SDP redaction"** on the return path into Cloud Run.

#### Steps 1–7 narrative

1. **Step 1 — Request.** A FinVault (Google OIDC) or RetailStream (Entra ID) user calls the platform; traffic lands on the External Application Load Balancer.
2. **Step 2 — Request (Hop 1 → Hop 2).** The ALB applies Cloud Armor header/WAF policies (forged `X-Tenant-ID` stripped), Model Armor screens the prompt, and the RFC 8693 OBO exchange mints a DPoP sender-constrained JWT. The sanitized request is handed to Cloud Run, which acts as Topology Router and ARD PDP (Hop 2): the catalog is filtered by tenant label and a direct call to another tenant's private agent returns `403 Forbidden` (per 1.1/1.3).
3. **Step 3 — Route by tenant tier.** Cloud Run routes to the pool, a silo or a PSC spoke depending on tier.
4. **Step 4 — Sanitize request (Hop 4 ingress).** Inside the chosen spoke, Model Armor applies tenant NLCs (OCC/FDIC rules for FinVault, PCI rules for RetailStream per 1.1).
5. **Step 5 — Generates response (Hop 3).** The Agent Runtime (gVisor sandbox, immutable `temp:tenant_id`) invokes Gemini 2.5 Pro with shared prefix caching (pool) or Gemini / Gemma 3 / Claude 3.7 (sovereign). MCP servers are reached over scoped 2LO/3LO connectors; AlloyDB is queried with `SET LOCAL current_tenant` so RLS applies (Hop 5). On the sovereign side the datastore is CMEK-encrypted and a revoked key surfaces as a KMS `423` lock.
6. **Step 6 — Sanitize response (Hop 4 egress).** Model Armor + SDP redact tenant-specific PII before the response leaves the spoke.
7. **Step 7 — Response.** The sanitized response travels back through Cloud Run and the ALB to the tenant. OTel/FinOps telemetry from both spokes flows to the governance hub along the dashed line throughout.

#### Grounding in the source

* 1.1 taxonomy row *Compute & Runtime*: Pattern A = "Shared GEAP Agent Runtime (gVisor sandbox) + immutable `temp:tenant_id`" → left card subtitle *gVisor + temp:tenant_id*; Pattern B = "air-gapped Gemma 3 on GKE" → right LLM card *Gemini / Gemma 3 — Claude 3.7 or Private GKE*.
* 1.1 *Model & FinOps COGS*: "Shared Prompt Prefix Caching (`ContextCacheConfig`) (up to 90% COGS savings)" → *90% Prefix Cache Savings*.
* 1.1 Pattern A Mermaid: "Memorystore for Redis Rate Bulkhead & Thinking Cap (8k vs 4k)" → zone subtitle *FinVault (8k Cap) & RetailStream (4k Cap)*.
* 1.1 Hop 5: "SET LOCAL app.current_tenant -> RLS Enforcement" → tool label *SET LOCAL current_tenant* and card *Shared AlloyDB — Row-Level Security (RLS)*.
* 1.1 Pattern B Mermaid: "Cloud KMS CMEK (finvault-kr/agent-memory-cmek) Customer Kill-Switch Enabled" and 1.4 `GAP-P1-04` "returns HTTP `423 Locked`" → *CMEK Kill-Switch* and *KMS 423 Lock*.
* README principle "80% Reusable Core Code + 20% Pattern-Specific Delta" → outer boundary label.

#### Design decisions & trade-offs

* **One diagram for three patterns.** Pattern B and Pattern C share the right spoke (the boundary label names both). This keeps the figure to the official two-spoke layout but means the PSC service attachment and tenant-aware router that distinguish Pattern C are only named in text (*Topology Router*, *PSC*), not drawn as separate components; WS4's diagrams carry that detail.
* **Identical five-card structure per spoke.** Chosen to make the "same chain, different boundary" argument visually; the cost is that pattern-specific components from 1.1 (Memorystore bulkhead, Firestore config, 5-Level Memory Bank, mTLS ingress, PSC attachment) are folded into card subtitles or omitted.
* **Cloud Run labelled as "Topology Router & ARD PDP".** The GEAP Agent Registry PDP from 1.1 Hop 2 is represented by the Cloud Run gateway because, per `GAP-P0-01`, the tenant-label check is enforced in the gateway PEP + ADK callback today rather than natively in the Registry.
* **Governance hub combines security and FinOps.** Unlike the official diagram's security-only hub, this version adds BigQuery chargeback (*Zero-PII OTel & Chargeback*) because Hop 5's per-tenant token accounting is a first-class requirement for ISV COGS.

#### Caveats / known gaps

* The right spoke depicts a **target state**: native per-tenant CMEK in Memory Bank (`GAP-P0-02`), sub-second CMEK revocation (`GAP-P1-04`), VPC-SC egress for remote MCP (`GAP-P1-03`) and cross-project registry over PSC (`GAP-P2-01`) are all tracked EAP items with engineered workarounds, not GA product behaviour.
* "RFC 8693 OBO + DPoP" from external Entra ID tenants requires custom verification before Auth Manager (`GAP-P0-03`); the card implies a single service.
* *Claude 3.7* on the right LLM card depends on Vertex AI Model Garden partner-model access being enabled (1.4 checklist) and on a unified cache API that does not yet exist (`GAP-P1-01`).
* Step badges 4/5/6 are drawn only in the left spoke; the right spoke has no numbered callouts, so the reader must infer the same ordering.
* The sources do not state measured latency, throughput or cost figures for this topology beyond the "up to 90%" caching claim; the diagram asserts none.

#### How to edit / reuse

* Open [`ws1-multi-tenant-taxonomy-overview.drawio`](../diagrams/ws1-multi-tenant-taxonomy-overview.drawio) (or the identical `.drawio.xml`) in draw.io / diagrams.net; icons are embedded base64, edges have deterministic waypoints.
* The PowerPoint figure (Figure 1 in [ws1-reference-architecture-editable-slides.pptx](../slides/ws1-reference-architecture-editable-slides.pptx)) is native shapes/connectors, not an image; edit text directly in PowerPoint or Google Slides.
* To change wording at the source, edit the first entry of `WORKSTREAM_BLUEPRINTS` in [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) (lines ~56–119) and re-run the builder; then run [`scripts/run_promptcanvas_vision_pipeline.ts`](../scripts/run_promptcanvas_vision_pipeline.ts) to regenerate the `.drawio`, `.drawio.png` and `vision.json`, and [`scripts/build_editable_slide_decks.ts`](../scripts/build_editable_slide_decks.ts) to refresh the deck.

### Diagram 2 — Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance

| Field | Value |
| :--- | :--- |
| Diagram ID | `ws1-cloud-arch-center-5hop-baseline` |
| Source deliverable | [1.3-cloud-architecture-center-doc-update-pr.md](../workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md) (section 3 figure; also Blueprint 1B in 1.1) |
| Badge | `WORKSTREAM 1.3 DOC PR BLUEPRINT` |
| Subtitle | Official Hub-and-Spoke Reference Architecture (docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) |
| Files | [`.drawio`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) • [`.drawio.xml`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.xml) • [`.drawio.png`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png) • [`.svg`](../diagrams/ws1-cloud-arch-center-5hop-baseline.svg) • [`.png`](../diagrams/ws1-cloud-arch-center-5hop-baseline.png) • [`vision.json`](../diagrams/vision_metadata/ws1-cloud-arch-center-5hop-baseline.vision.json) |
| Editable deck | [ws1-reference-architecture-editable-slides.pptx](../slides/ws1-reference-architecture-editable-slides.pptx) — **Figure 2** |
| Shape stats | 56 editable shapes (vertices), 23 connectors, 54 vision-addressable objects (`isCertified: true`, 0 collisions) |

![Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio.png)

#### The question this diagram answers

"Where, on the *published* Architecture Center hub-and-spoke diagram, does each of the five hops live?" It keeps the official vocabulary — a single User, an organisation-level VPC Service Controls perimeter, a Routing hub, a Central governance and security hub, and two PAB-bounded tenant projects — and annotates it with Hop 1–2 in the routing hub and Hop 3–5 inside each tenant spoke, so the 1.3 PR can be reviewed against the existing figure line by line.

#### Zone-by-zone walkthrough

##### Top actor

* Card: **User** / *OIDC / Entra JWT*. Badge **1 "Request"** down into the ALB; badge **7 "Response"** back up.

##### Outer & inner boundary labels

* Outer: **Shared hubs (VPC Service Controls Organization Perimeter)**.
* Inner: **VPC**.

##### Routing hub (pastel blue)

Zone title **Routing hub (Hop 1 & Hop 2)**, subtitle *Central ingress & cryptographic token exchange*. Five cards:

| Position | Icon | Title | Subtitle |
| :--- | :--- | :--- | :--- |
| Top-left | `load_balancer_cloud_armor` | **Cloud Armor** | Strips Forged X-Tenant-ID |
| Mid-left | `model_armor` | **Model Armor** | Edge Prompt Injection Gate |
| Bottom-left | `iap_iam_shield` | **IAP** | RFC 8693 OBO + DPoP |
| Top-right | `load_balancer_cloud_armor` | **External Application Load Balancer** | Cloud Load Balancing |
| Bottom-right | `cloud_run` | **Cloud Run** | Frontend portal & Hop 2 PDP |

Edge labels: ALB → Cloud Armor **"Security policies"**; ALB → Model Armor **"Sanitize prompt"**; IAP ↔ Cloud Run **"User authentication"**. Between ALB and Cloud Run: badge **2 "Request"** and badge **7 "Response"**.

##### Central governance hub (pastel green)

Title **Central governance and security hub**. Cards:

* `security_command_center` — **Security Command Center** / *Continuous Threat Detection*
* `iap_iam_shield` — **Central IAM** / *Auth Manager (2LO / 3LO)*
* `cloud_logging` — **Cloud Logging** / *BigQuery OTel Audit Sink*

Dashed line to both spokes labelled **"Security and observability monitoring"** (three lines of text in the render).

##### Left spoke — Tenant A (pastel yellow)

* Boundary label: **PAB • Hop 3–5 Isolation Boundary (Tenant Alpha)**
* Zone title / sub: **Tenant A (FinVault Bank)** / *Tenant project • Enterprise Tier (Google OIDC)*
* Cards: `model_armor` **Model Armor** / *Hop 4: Bank SDP & OCC NLC*; `gemini_agent_platform` **Gemini & Claude** / *Agent Platform (8k Budget)*; `gemini_agent_platform` **Agent Runtime** / *Hop 3: Shared + Agent Alpha*; `mcp_servers` **MCP servers** / *Hop 5: Workspace & Jira 3LO*; `datastore_alloydb_bq` **Datastore** / *BigQuery, AlloyDB RLS, CMEK*
* Step labels: **4 "Sanitize request"**, **6 "Sanitize response"**, **5 "Generates response"**
* RAG label: **"Secure RAG"**; tool label: **"Agent-tool interaction"** (the official diagram's wording)

##### Right spoke — Tenant B (pastel coral)

* Boundary label: **PAB • Hop 3–5 Isolation Boundary (Tenant Beta)**
* Zone title / sub: **Tenant B (RetailStream Corp)** / *Tenant project • Standard Tier (Entra ID)*
* Cards: `model_armor` **Model Armor** / *Hop 4: PCI PAN SDP & NLC*; `gemini_agent_platform` **Gemini** / *Agent Platform (4k Cap)*; `gemini_agent_platform` **Agent Runtime** / *Hop 3: Shared Diagnostic*; `mcp_servers` **MCP servers** / *Hop 5: SharePoint & SNOW*; `datastore_alloydb_bq` **Datastore** / *BigQuery, AlloyDB RLS, Redis*
* RAG label: **"Secure RAG"**; tool label: **"Agent-tool interaction"**
* As in Diagram 1, no numbered callouts are defined for the right spoke.

##### Trunk between hub and spokes

* Badge **3 "Route request to tenant"**; badge **7 "Sanitized response from tenant"**.

#### Steps 1–7 narrative

1. **Step 1 — Request.** The user presents a Google OIDC (FinVault) or Entra ID (RetailStream) JWT to the External Application Load Balancer.
2. **Step 2 — Request (Hop 1).** Cloud Armor strips any client-supplied `X-Tenant-ID`; Model Armor acts as the edge prompt-injection gate; IAP validates the JWT and performs the RFC 8693 OBO exchange bound to an RFC 9449 DPoP thumbprint (1.3 §3, Hop 1). Cloud Run (frontend portal) then performs **Hop 2**: GEAP Registry acts as PDP, filtering the catalog by verified tenant labels; direct calls to another tenant's private agent return `403 Forbidden`, and ADK 2.0 `before_agent_callback` prunes unauthorised MCP tool descriptors before reasoning.
3. **Step 3 — Route request to tenant.** The hub forwards the request into the matching PAB-bounded tenant project (Tenant A or Tenant B); the official architecture's dedicated-project-per-tenant model is preserved.
4. **Step 4 — Sanitize request (Hop 4 ingress).** Tenant-specific Model Armor template: OCC NLC + bank SDP for FinVault; PCI NLC + PAN SDP for RetailStream.
5. **Step 5 — Generates response (Hop 3).** Agent Runtime in a gVisor sandbox with immutable `temp:tenant_id`; Memorystore clamps `thinking_budget` (8,000 Enterprise vs 4,000 Standard) and RPM; the shared operator agent uses read-only `ContextCacheConfig` prefix caching; FinVault additionally runs `Agent Alpha` (Gemini & Claude card). MCP servers (Hop 5) are reached with 2LO/3LO tokens brokered by Auth Manager — Workspace & Jira for FinVault, SharePoint & ServiceNow (with inline consent when a token is missing) for RetailStream. Datastore access binds `SET LOCAL app.current_tenant` for AlloyDB RLS.
6. **Step 6 — Sanitize response (Hop 4 egress).** Model Armor + SDP mask bank-account/SWIFT numbers (FinVault) or payment-card numbers (RetailStream).
7. **Step 7 — Response.** The sanitized response returns via Cloud Run and the ALB. Every hop emits OTel spans tagged `tenant_id`, `tier`, `thinking_tokens`, `cache_hit` into BigQuery (Cloud Logging card), and SCC provides continuous threat detection — the dashed "Security and observability monitoring" line.

#### Grounding in the source

* 1.3 §3 Hop 1: "Google Cloud Armor and Identity-Aware Proxy (IAP) terminate ingress traffic and strip any client-supplied `X-Tenant-ID` headers" → cards *Cloud Armor — Strips Forged X-Tenant-ID* and *IAP — RFC 8693 OBO + DPoP*.
* 1.3 §3 Hop 2: "Direct API calls to another tenant's private agent return `403 Forbidden`" and "`before_agent_callback` hook that prunes any MCP tool descriptor" → *Cloud Run — Frontend portal & Hop 2 PDP*.
* 1.3 §3 Hop 3: "8,000 thinking tokens for Enterprise tenants versus 4,000 for Standard tenants" → *Agent Platform (8k Budget)* vs *Agent Platform (4k Cap)*.
* 1.3 §3 Hop 4: "masking bank account and SWIFT numbers for financial tenants or payment card numbers for retail tenants" → *Hop 4: Bank SDP & OCC NLC* vs *Hop 4: PCI PAN SDP & NLC*.
* 1.3 §3 Hop 5: 3LO tokens "for Google Drive, Jira, SharePoint, or ServiceNow" → *Hop 5: Workspace & Jira 3LO* vs *Hop 5: SharePoint & SNOW*; "OpenTelemetry (OTel) spans … into BigQuery" → *Cloud Logging — BigQuery OTel Audit Sink*.
* 1.3 §1 / 1.1 taxonomy: Pattern B "IAM Principal Access Boundary (PAB)" and "Per-tenant VPC Service Controls" → the two PAB boundary labels and the outer VPC-SC organisation perimeter.

#### Design decisions & trade-offs

* **Fidelity to the published diagram over completeness.** Zone names, the five-card spoke layout, "Secure RAG" and "Agent-tool interaction" edge labels are kept verbatim so the Architecture Center reviewer sees a delta, not a redesign. The price is that Pattern A's shared runtime is *not* drawn here — both tenants appear as dedicated projects, which is the article's original topology.
* **Hop numbers placed in card subtitles.** Rather than adding new shapes, each hop is tagged on an existing card (`Hop 2 PDP`, `Hop 3`, `Hop 4`, `Hop 5`). This keeps shape count identical to Diagram 1 (56/23/54) and makes the two WS1 figures structurally interchangeable in the deck.
* **Auth Manager in the central hub.** 2LO/3LO brokering is anchored on *Central IAM — Auth Manager (2LO / 3LO)* rather than inside each spoke, mirroring 1.3's description of Auth Manager as a shared broker while MCP servers remain per tenant.
* **Model Armor at both edge and spoke.** The edge card is the shared injection gate; the spoke cards carry tenant-specific SDP/NLC templates. This duplicates a service in the figure but matches 1.2 Pillar 4's "ALB Service Extensions + ADK inline hooks invoke tenant-specific Model Armor templates".

#### Caveats / known gaps

* This is a **proposed** PR figure; 1.3 does not record that the PR has been merged or reviewed by the Architecture Center team, and the sources give no PR URL or status.
* The datastore subtitle *BigQuery, AlloyDB RLS, CMEK* on Tenant A presumes per-tenant CMEK on memory/state; in a shared GEAP project that is `GAP-P0-02` (EAP, Q4 2026). In a true per-tenant project (as drawn) project-level CMEK suffices, so the caveat applies only if this figure is read as Pattern A.
* *Gemini & Claude* for FinVault depends on Model Garden partner access and on `GAP-P1-01` for cache parity.
* Inline 3LO consent for RetailStream mid-turn across stateless Cloud Run instances relies on the `GAP-P1-02` checkpoint workaround.
* Right-spoke step badges are absent (same as Diagram 1). The sources do not state SLOs for the hub's routing step or the per-hop latency budget.

#### How to edit / reuse

* Open [`ws1-cloud-arch-center-5hop-baseline.drawio`](../diagrams/ws1-cloud-arch-center-5hop-baseline.drawio) in draw.io; the `.svg` and `.png` are the Architecture-Center-format exports suitable for attaching to the doc PR.
* Figure 2 in the deck is native shapes; speaker notes and a component spec table accompany it (deck structure per [README.md](../README.md) §1).
* Source of truth is the second entry of `WORKSTREAM_BLUEPRINTS` in [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) (lines ~124–187). Regenerate with that script, then [`scripts/run_promptcanvas_vision_pipeline.ts`](../scripts/run_promptcanvas_vision_pipeline.ts) and [`scripts/build_editable_slide_decks.ts`](../scripts/build_editable_slide_decks.ts). Manifest entries live in [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json).

### Workstream 1 summary & hand-off to Workstream 2

* **Fixed vocabulary.** Three patterns (A Pooled, B Sovereign Silos, C Dynamic Hybrid), five hops, four governance pillars, and the Cymbal / FinVault / RetailStream case study are now the shared language for WS2–5; later diagrams reuse the same hub-and-spoke blueprint format, palette and badge numbering 1–7.
* **Code before Terraform.** The chain already exists as `hop1`..`hop5` modules in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/); WS2 wires them behind real Cloud Run / Cloud Armor / Redis / AlloyDB resources rather than redesigning them.
* **Gaps are pre-assigned.** `GAP-P0-01`, `GAP-P0-02`, `GAP-P0-03`, `GAP-P1-01` and `GAP-P1-02` are WS2's to carry (surfacing in 2.4); WS3 inherits `GAP-P1-03` / `GAP-P1-04`; WS4 inherits `GAP-P2-01` / `GAP-P2-02`.
* **Open sign-offs travel with the work.** The 1.2 questions on `temp:` immutability, Entra ID + DPoP federation without a shadow account, and the 60-second CMEK revocation SLA remain open and must be answered by the product teams during the respective build weeks.
* **Next stop.** Workstream 2 — Pattern A: High-Density Pooled (Milestone 1, Week 4) begins at [2.1-case-study-and-solution-architecture.md](../workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md) and its first figure, Diagram 3 (`ws2-pattern-a-pooled-5hop-architecture`), zooms into the left spoke of Diagram 1.
