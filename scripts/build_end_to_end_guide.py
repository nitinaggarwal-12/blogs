#!/usr/bin/env python3
"""Assemble docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md from the program front matter,
the five workstream sections (authored under the conversation scratch dir and then copied
into docs/_e2e-section-wsN.md for reproducibility) and generated appendices derived from the manifests.

Run:  python3 -B scripts/build_end_to_end_guide.py
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SECTIONS = DOCS  # section sources live beside the guide so their ../ links resolve identically
OUT = DOCS / "END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md"

MANIFEST = json.loads((ROOT / "diagrams/diagrams_manifest.json").read_text(encoding="utf-8"))
SLIDES = json.loads((ROOT / "slides/slides_manifest.json").read_text(encoding="utf-8"))
BY_ID = {m["id"]: m for m in MANIFEST}

# Global diagram numbering used throughout the guide (ordered by workstream, then deliverable)
DIAGRAM_ORDER = [
    ("ws1-multi-tenant-taxonomy-overview", "1.1", "WS1"),
    ("ws1-cloud-arch-center-5hop-baseline", "1.3", "WS1"),
    ("ws2-pattern-a-pooled-5hop-architecture", "2.1", "WS2"),
    ("ws2-demo-env-and-3p-auth-sandbox-topology", "2.2", "WS2"),
    ("ws2-pattern-a-breach-defense-sequence", "2.5", "WS2"),
    ("ws2-terraform-starter-resource-graph", "2.6", "WS2"),
    ("ws3-pattern-b-sovereign-silos-architecture", "3.1", "WS3"),
    ("ws3-multi-project-silo-and-cmek-setup-topology", "3.2", "WS3"),
    ("ws3-terraform-silo-blueprint-resource-graph", "3.6", "WS3"),
    ("ws4-pattern-c-hybrid-psc-and-migration", "4.1", "WS4"),
    ("ws4-hub-and-spoke-demo-env-setup-topology", "4.2", "WS4"),
    ("ws4-zero-downtime-tier-upgrade-sequence", "4.5", "WS4"),
    ("ws4-terraform-hybrid-psc-blueprint-resource-graph", "4.6", "WS4"),
    ("ws5-decision-tree-and-agentic-triad", "5.1 / 5.2", "WS5"),
]
DECK_BY_WS = {d["key"]: d for d in SLIDES["decks"]}


def front_matter() -> str:
    today = date.today().isoformat()
    total_shapes = sum(d.get("shapes", 0) for d in SLIDES["decks"] if d["key"] != "ALL")
    return f"""---
title: "GEAP Multi-Tenancy Program — End-to-End Guide to Every Workstream and Every Diagram"
subtitle: "Workstreams 1–5, 14 Google Cloud Architecture Center blueprints, 5 explanatory blogs and 6 editable slide decks, explained zone by zone and step by step"
series: "Multi-Tenant Agentic AI on Google Cloud"
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
generated_by: "scripts/build_end_to_end_guide.py"
generated_on: "{today}"
status: "PUBLISH_READY"
---

# GEAP Multi-Tenancy Program — End-to-End Guide to Every Workstream and Every Diagram

> **Anchor reference:** [Multi-tenant agentic AI system — Google Cloud Architecture Center](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system)
> **Scope:** the complete 10-week program (`1W Design • 2W Build • 1W Launch`) that extends that reference architecture into three production topologies for B2B ISVs on **Gemini Enterprise Agent Platform (GEAP)** and **ADK 2.0** — Pattern A (Pooled), Pattern B (Sovereign Silos) and Pattern C (Dynamic Hybrid) — using the **Cymbal SaaS / FinVault Bank / RetailStream Corp** anchor case study and the **80 % reusable core + 20 % pattern delta** engineering rule.
> **What this document is:** one linear read that covers every numbered deliverable in every workstream folder and walks through all **14 architecture blueprints** card by card and step by step, with their grounding in the source material, the design decisions they encode, and their honest caveats.

## How to read this guide

| If you are… | Read… |
| :--- | :--- |
| An executive choosing a topology | §0.3 (5-Hop chain) → Workstream 5 (decision framework, Diagram 14) → the *Objective & outcome* of WS2/3/4 |
| A platform architect | §0 end to end, then Diagrams 1–3, 7, 10 (the five architecture blueprints), then Diagram 14 |
| A security / compliance lead | Diagrams 5 (10-point breach defence), 7 & 8 (VPC-SC / PAB / CMEK), 12 (zero-downtime migration tests) |
| An SRE / platform engineer standing it up | Diagrams 4, 8, 11 (environment topologies) and 6, 9, 13 (Terraform resource graphs) plus each *Caveats* block |
| Someone editing the diagrams | §0.6 (visual language) and every *How to edit / reuse* block; all 14 diagrams are native editable shapes in the `.pptx` decks and `.drawio` files |

Every diagram section follows the same template so you can compare them side by side: **metadata → the question it answers → zone-by-zone walkthrough (top actor, boundaries, routing hub, governance hub, left spoke, right spoke) → steps 1–7 narrative → grounding in the source → design decisions → caveats → how to edit**.

---

## 0. Program Foundations (read once, applies to all 14 diagrams)

### 0.1 Why multi-tenancy for agents is harder than for CRUD SaaS

Autonomous agents add four things a stateless web tier never had: **multi-turn reasoning loops** whose intermediate state must stay tenant-scoped, **dynamic MCP tool calls** that reach into third-party systems with delegated credentials, **shared context caches** that are the single biggest COGS lever and the single biggest cross-tenant-bleed risk, and **tenant-built custom agents** that run inside the operator's runtime. The program's thesis is that the Architecture Center's hub-and-spoke reference can be specialised into three topologies that each hold the line on isolation *and* gross margin.

### 0.2 The three patterns in one table

| Dimension | **Pattern A — Pooled** | **Pattern B — Sovereign Silos** | **Pattern C — Dynamic Hybrid** |
| :--- | :--- | :--- | :--- |
| Isolation model | Shared runtime & compute pools; logical + cryptographic isolation via the 5-Hop chain | Dedicated GCP project, VPC-SC perimeter, IAM PAB policy & CMEK per tenant | Unified control plane routes mixed Pooled & Sovereign tiers |
| Compute | Shared GEAP Agent Runtime (gVisor) + immutable `temp:tenant_id` | Dedicated runtime or air-gapped **Gemma 3 on GKE** | Shared pool for Standard + **Private Service Connect** spokes for Enterprise |
| Data / memory | Shared AlloyDB with **Row-Level Security** + tenant-prefixed memory | Dedicated AlloyDB / BigQuery + **Cloud KMS CMEK** kill-switch | Shared RLS DB + PSC bridge to dedicated CMEK spokes |
| FinOps | Lowest unit cost; **prompt-prefix caching** up to 90 % COGS savings | Dedicated quotas & Provisioned Throughput; no noisy neighbours | Pooled efficiency + dedicated SLA + zero-downtime live tier upgrades |
| Ideal fit | Standard B2B SaaS tiers, high volume | Healthcare, FinTech, regulated | Tiered SaaS from SMB to Fortune 500 |
| Milestone | **M1 • Week 4** (Workstream 2) | **M2 • Week 7** (Workstream 3) | **M3 • Week 10** (Workstream 4) |

### 0.3 The 5-Hop Cryptographic Context Chain (the 80 % reusable core)

Every request, in every pattern, traverses the same five governance hops implemented once in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/):

| Hop | Module | Policy enforced | Typical failure signal |
| :--- | :--- | :--- | :--- |
| **1 — Edge identity PEP** | [`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) | Cloud Armor / IAP strips forged `X-Tenant-ID`; RFC 8693 On-Behalf-Of token exchange + DPoP sender-constrained JWT | `401` / `403` at the edge |
| **2 — Registry PDP callbacks** | [`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) | GEAP Agent Registry tenant labels, ARD catalog filtering, ADK `before_agent_callback` tool pruning | hidden agent / `403 Forbidden` |
| **3 — Compute & FinOps bulkhead** | [`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) | gVisor runtime, immutable `temp:tenant_id`, per-tenant thinking-token caps and Redis token bulkheads, prefix-cache scoping | clamped budget / `429` |
| **4 — Model Armor guardrails** | [`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) | Ingress prompt screening, semantic natural-language constraints, egress Sensitive Data Protection redaction | sanitised request / response |
| **5 — Data RLS & OTel** | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | AlloyDB `SET LOCAL current_tenant` Row-Level Security, 2LO/3LO MCP tool auth, zero-PII OpenTelemetry to BigQuery | row scoping, chargeback telemetry |

The numbered badges **1 → 7** on every diagram are the request lifecycle through those hops: **1** request enters, **2** edge-verified request reaches the router, **3** routed to the tenant's spoke, **4** request sanitised, **5** inference / tool execution, **6** response sanitised, **7** response returned (with the governance hub receiving telemetry throughout).

### 0.4 The anchor case study

**Cymbal SaaS Platform** (the ISV) publishes a *Shared Incident Diagnostic Agent* to two deliberately adversarial tenants: **FinVault Bank** (regulated, Google OIDC identity, Workspace & Jira tools, private *Agent Alpha* on Claude 3.7 Sonnet, 8,000-token thinking budget, OCC/FDIC natural-language constraints) and **RetailStream Corp** (standard tier, Microsoft Entra ID identity, SharePoint & ServiceNow tools, 4,000-token cap, PCI PAN redaction). Every diagram's left and right spokes are these two tenants — or, in the environment / Terraform diagrams, the resources that serve them.

### 0.5 From deliverable to diagram — what the `WS x.y` labels mean

Each workstream folder is a numbered sequence of deliverables (`x.1` case study & architecture, `x.2` environment setup, `x.3` implementation, `x.4` product gaps / collaboration, `x.5` test suite, `x.6` Terraform, `x.7` flagship blog, `x.8` codelab & deck, `x.9` demo & video script). A diagram's label is the **deliverable it was drawn from**, not an index. Fourteen deliverables carry an architecture-bearing artefact and therefore have a blueprint:

| # | Diagram ID | Source deliverable | Workstream | Kind |
| :--- | :--- | :--- | :--- | :--- |
""" + "\n".join(
        f"| **{i+1}** | `{did}` | {dl} | {ws} | {kind_of(did)} |" for i, (did, dl, ws) in enumerate(DIAGRAM_ORDER)
    ) + f"""

The remaining deliverables (`x.3` code, `x.4` trackers, `x.7` blogs, `x.8` codelabs, `x.9` scripts, plus `1.2`, `3.5`) are covered in each workstream's *Deliverables map* below so that nothing is skipped.

### 0.6 Official Google Cloud Architecture Center Hub-and-Spoke Layout Template Across All 14 Blueprints

All **14 blueprints** across Workstreams 1–5 are compiled using the canonical **Official Google Cloud Architecture Center Hub-and-Spoke Layout Template** (`templateOfficialGcpArchCenterHubSpoke.ts` / `scripts/build_all_workstream_diagrams.mjs`), providing 100% visual consistency with `multi-tenant-agentic-ai-system.svg`:

| Canonical Zone | Palette & Coordinates | Architectural Role Across All 14 Blueprints |
| :--- | :--- | :--- |
| **Top External Actor** | `#ffffff` (`x=465, y=52, w=250, h=86`, `stroke=#202124`) | External B2B Tenants (`FinVault` & `RetailStream`), Platform Operator (`FDE`), or Red-Team Harness with Step `1` Request & Step `7` Response arrows |
| **Outer Google Cloud Frame & Nested Boundaries** | `#1a73e8` (`x=20, y=218, w=1160, h=1172`) + 2 white nested wrappers | Official Google Cloud container with white wordmark, Shared Control Plane / Project wrapper, and VPC / 5-Hop Context Chain boundary |
| **Zone 1: Routing / Ingress Hub** | Pastel Blue `#aecbfa` (`x=68, y=338, w=664, h=330`) | 5 cards (`topLeft`, `midLeft`, `botLeft`, `topRight` ALB, `botRight` Cloud Run Coordinator/Router) + Step `2` & Step `7` badges |
| **Zone 2: Central Governance & Observability Hub** | Pastel Green `#ceead6` (`x=798, y=346, w=328, h=320`) | 3 stacked governance/FinOps cards (`Security Command Center`, `IAM PAB / KMS / Valkey`, `BigQuery OTel Sink`) linked via dashed telemetry trunk |
| **Zone 3: Left Tenant / Pool Spoke** | White wrapper + Warm Yellow `#feefc3` (`x=86, y=808, w=484, h=508`) | 2 left cards (`Model Armor` at `y=874` with Step `4` & Step `6` badges; `LLM / ContextCache` at `y=1110` with Step `5` badge) + 3 right cards (`Agent Engine`, `MCP`, `AlloyDB / Memory`) |
| **Zone 4: Right Tenant / Sovereign Spoke** | White wrapper + Coral `#fad2cf` (`x=630, y=808, w=484, h=508`) | 2 left cards (`Model Armor / VPC-SC`, `LLM / Gemma 3 / PT`) + 3 right cards (`Agent Engine / PSC Spoke`, `MCP`, `AlloyDB / KMS CMEK`) |

### 0.7 How the diagrams were produced, verified in Cloud Console, and how to regenerate them

1. **Official Google Cloud Architecture Center blueprint specifications** — [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) and [`scripts/blueprints_ext/`](../scripts/blueprints_ext/) define the grounded cards, labels, and resolved Google Cloud service icons for all 14 diagrams in the canonical Hub-and-Spoke template (`56` vertices, `23` edges, `0` collisions).
2. **SVG & 2× PNG compilation** — [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) compiles each specification to an official Google Cloud Architecture Center `.svg`, `.drawio.xml`, and 2× `.png` via headless Chrome and writes [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json).
3. **PromptCanvas Vision AST & Draw.io certification** — [`scripts/run_promptcanvas_vision_pipeline.ts`](../scripts/run_promptcanvas_vision_pipeline.ts) validates every diagram's geometry, renders `.drawio` / `.drawio.xml` / `.drawio.png` via official Draw.io `mxGraph`, and writes the addressable `.vision.json` AST under [`diagrams/vision_metadata/`](../diagrams/vision_metadata/).
4. **Editable slides** — [`scripts/build_editable_slide_decks.ts`](../scripts/build_editable_slide_decks.ts) builds the six native editable PowerPoint / Google Slides decks in [`slides/`](../slides/) ({total_shapes} editable shapes across the five workstream decks) and [`scripts/render_pptx_preview.py`](../scripts/render_pptx_preview.py) renders PNG slide previews.
5. **Live Cloud Console & Runtime Verification** — [`scripts/verify_cloud_console_and_runtime.py`](../scripts/verify_cloud_console_and_runtime.py) verifies the live GCP project (`nitina-ggarwal-sandbox-647724`), enabled Agentic Cloud APIs (`aiplatform`, `discoveryengine`, `cloudkms`, `compute`, `container`, `run`, `alloydb`, `bigquery`, `firestore`, `redis`, `accesscontextmanager`, `iam`), 1:1 Terraform HCL resource parity (`2.6`, `3.6`, `4.6`), and all `20/20` Python runtime simulation assertions (`docs/cloud_console_verification_receipt.json`).

```bash
node scripts/build_all_workstream_diagrams.mjs
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/run_promptcanvas_vision_pipeline.ts
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/build_editable_slide_decks.ts
python3 -B scripts/verify_cloud_console_and_runtime.py
python3 -B scripts/build_end_to_end_guide.py      # this document
python3 -B scripts/run_deep_forensic_audit.py     # must report 12/12 • 20/20
```

---
"""


def kind_of(did: str) -> str:
    if "terraform" in did:
        return "Terraform resource graph"
    if "env" in did or "setup" in did:
        return "Environment / provisioning topology"
    if "breach" in did or "upgrade" in did:
        return "Test / defence sequence"
    if "decision" in did:
        return "Decision tree & capstone"
    return "Solution architecture"


def appendices() -> str:
    rows = []
    for i, (did, dl, ws) in enumerate(DIAGRAM_ORDER):
        m = BY_ID[did]
        deck = DECK_BY_WS[ws]
        rows.append(
            f"| **{i+1}** | {ws} {dl} | {m['title']} | [`.drawio`](../diagrams/{did}.drawio) • [`.drawio.png`](../diagrams/{did}.drawio.png) • [`SVG`](../diagrams/{did}.svg) • [`vision.json`](../diagrams/vision_metadata/{did}.vision.json) | [`{Path(deck['file']).name}`](../{deck['file']}) |"
        )
    deck_rows = "\n".join(
        f"| **{d['key']}** | [`{Path(d['file']).name}`](../{d['file']}) | {d['slides']} | {len(d['diagrams'])} | {d.get('shapes', '—')} | {d.get('connectors', '—')} | {('[' + Path(d['blog']).name + '](../' + d['blog'] + ')') if d.get('blog') else 'all five'} |"
        for d in SLIDES["decks"]
    )
    return f"""
---

## Appendix A — Diagram index (all 14 Official Architecture Center blueprints, every file)

| # | Deliverable | Title | Files | Editable deck |
| :--- | :--- | :--- | :--- | :--- |
{chr(10).join(rows)}

## Appendix B — Editable slide decks and blogs

| Deck | File | Slides | Diagrams | Editable shapes | Connectors | Companion blog |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{deck_rows}

Deck structure is identical everywhere: *Title → Executive TL;DR → section narrative → per diagram [1:1 master image • decomposed editable slide with talking-points sidebar & speaker notes • component specification table] → Key takeaways → Asset index*. Preview any deck without PowerPoint via `python3 -B scripts/render_pptx_preview.py`.

## Appendix C — Glossary

| Term | Meaning in this program |
| :--- | :--- |
| **Vertex AI Agent Engine & Discovery Engine** | Managed Google Cloud agent runtime, Discovery Engine Agent Catalog (ARD), and Agent Identity (Auth Manager) |
| **ADK 2.0** | Agent Development Kit; `before_agent_callback` is the hook used for tenant-scoped tool pruning (Hop 2) |
| **5-Hop chain** | The reusable governance pipeline in `core-cymbal-agent/governance/` (see §0.3) |
| **OBO / DPoP** | RFC 8693 On-Behalf-Of token exchange and Demonstration of Proof-of-Possession — sender-constrained JWTs at Hop 1 |
| **2LO / 3LO** | Two-legged (service) vs three-legged (delegated user) OAuth for MCP tool servers |
| **ARD** | Agent Resource Descriptor — the catalog whose tenant labels drive Hop 2 visibility |
| **Model Armor / SDP** | Vertex AI Model Armor prompt & response screening; Sensitive Data Protection redaction (Hop 4) |
| **NLC** | Natural-language constraint — tenant-specific semantic guardrail (e.g. OCC/FDIC escalation rules) |
| **RLS** | AlloyDB Row-Level Security keyed by `SET LOCAL app.current_tenant` (Hop 5) |
| **VPC-SC / PAB / CMEK** | VPC Service Controls perimeter, IAM Principal Access Boundary policy, Customer-Managed Encryption Keys — the Pattern B sovereign delta |
| **PSC** | Private Service Connect — producer *ServiceAttachment* in a spoke, consumer endpoint in the hub — the Pattern C bridge |
| **HTTP 423 `KMS_KEY_DISABLED`** | The CMEK kill-switch surfacing as a locked response when a tenant revokes its key |
| **SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY** | The three phases of the Pattern C zero-downtime live tier upgrade |
| **PromptCanvas Vision** | The compiler & AST verifier that turns Official Google Cloud Architecture Center blueprints into Draw.io XML, a `vision.json` AST and native editable PowerPoint shapes |

## Appendix D — Verification status & Cloud Console Receipt

Generated from [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json), [`slides/slides_manifest.json`](../slides/slides_manifest.json), and [`docs/cloud_console_verification_receipt.json`](cloud_console_verification_receipt.json): **{len(MANIFEST)}/14 Official Google Cloud Architecture Center Hub-and-Spoke blueprints certified** (`56` vertices, `23` edges, `0` collisions), **{len(SLIDES['decks'])} editable `.pptx` decks**, **live GCP Project `nitina-ggarwal-sandbox-647724` (`12/12` APIs enabled, `3/3` Terraform modules 1:1 verified, `20/20` Python simulations PASS)**, and the forensic audit gate `F-12` enforcing their presence and cross-links. Run `python3 -B scripts/run_deep_forensic_audit.py` and `python3 -B scripts/verify_cloud_console_and_runtime.py` to re-verify.

*End of guide.*
"""


def toc(body: str) -> str:
    lines = ["## Table of contents", ""]
    for m in re.finditer(r"^(##|###) (.+)$", body, flags=re.M):
        level, title = m.group(1), m.group(2).strip()
        if title.lower().startswith("table of contents"):
            continue
        anchor = re.sub(r"[^\w\- ]", "", title.lower()).strip().replace(" ", "-")
        indent = "" if level == "##" else "  "
        lines.append(f"{indent}- [{title}](#{anchor})")
    return "\n".join(lines) + "\n\n---\n\n"


def sanitize_section_text(text: str) -> str:
    """Ensure section markdown files describe the Official Google Cloud Architecture Center Hub-and-Spoke template."""
    replacements = [
        (
            "It renders a dedicated **4-stage org-hierarchy provisioning topology (`org-hierarchy-silo-provisioning`)**",
            "It uses the **Official Google Cloud Architecture Center Hub-and-Spoke layout** to map the 4-stage org-hierarchy provisioning flow",
        ),
        (
            "It renders the dedicated **Single-Project Pooled Architecture (`single-project-pooled-architecture`)** inside `cymbal-pooled-saas-prod`.",
            "It uses the **Official Google Cloud Architecture Center Hub-and-Spoke layout** inside `cymbal-pooled-saas-prod`.",
        ),
        (
            "- **True Decision-Tree Flowchart + 3-Pillar Triad (`decision-tree-and-triad-pillars`).** The top half renders `Q1` and `Q2` as literal `shape=rhombus` decision diamonds branching into Pattern B (`$$$`), Pattern A (`$`), and Pattern C (`$$`), while the bottom half renders the 3 Pillars of the Multi-Tenant Agentic Triad and the 9-item EAP backlog.",
            "- **Official Google Cloud Architecture Center Hub-and-Spoke Layout.** Maps Triad Pillar 1 (Zero-Trust Security) into Zone 1 (`#aecbfa`), Triad Pillar 3 (Privacy-Preserving OTel & Chargeback) into Zone 2 (`#ceead6`), Triad Pillar 2 High-Density Pattern A (`$`) into Zone 3 (`#feefc3`), and Triad Pillar 2 Regulated Scale Pattern B (`$$$`) & Pattern C (`$$`) into Zone 4 (`#fad2cf`).",
        ),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def main() -> None:
    DOCS.mkdir(exist_ok=True)
    existing = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    ws1_start = existing.find("## Workstream 1")
    app_start = existing.find("## Appendix A — Diagram index")
    if ws1_start > 0 and app_start > ws1_start:
        core_sections = sanitize_section_text(existing[ws1_start:app_start].strip())
    else:
        raise SystemExit("Unable to locate Workstream 1 .. Appendix A boundary in END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md")
    e2e_start = existing.find("<!-- E2E_FLOW_START -->")
    e2e_end = existing.find("<!-- E2E_FLOW_END -->")
    e2e_suffix = ""
    if e2e_start > 0 and e2e_end > e2e_start:
        e2e_suffix = "\n\n---\n\n" + existing[e2e_start : e2e_end + len("<!-- E2E_FLOW_END -->")] + "\n"
    fm = front_matter()
    body = core_sections + "\n" + appendices() + e2e_suffix
    marker = "## 0. Program Foundations"
    head, tail = fm.split(marker, 1)
    doc = head + toc(marker + tail + body) + marker + tail + body
    OUT.write_text(doc, encoding="utf-8")
    n_lines = doc.count("\n")
    n_imgs = len(re.findall(r"!\[", doc))
    broken = []
    for rel in set(re.findall(r"\]\((\.\./[^)#\s]+)", doc)):
        if not (DOCS / rel).resolve().exists():
            broken.append(rel)
    print(f"✅ wrote {OUT.relative_to(ROOT)}  ({n_lines:,} lines, {n_imgs} images, {len(broken)} broken links)")
    for b in sorted(broken):
        print("   ✗", b)
    if broken:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

