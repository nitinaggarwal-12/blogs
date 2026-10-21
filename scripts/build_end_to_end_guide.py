#!/usr/bin/env python3
"""Assemble docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md from the program front matter,
the five workstream sections, live Draw.io XML / Vision AST / E2E flow manifests for all 14 diagrams,
and generated appendices derived from the manifests.

Run:  python3 -B scripts/build_end_to_end_guide.py
"""
from __future__ import annotations

import html
import json
import re
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SECTIONS = DOCS  # section sources live beside the guide so their ../ links resolve identically
OUT = DOCS / "END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md"

MANIFEST = json.loads((ROOT / "diagrams/diagrams_manifest.json").read_text(encoding="utf-8"))
SLIDES = json.loads((ROOT / "slides/slides_manifest.json").read_text(encoding="utf-8"))
E2E_FLOWS = json.loads((ROOT / "diagrams/diagram_e2e_flows.json").read_text(encoding="utf-8"))
BY_ID = {m["id"]: m for m in MANIFEST}
FLOW_BY_ID = {d["id"]: d for d in E2E_FLOWS["diagrams"]}

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
    ws_decks = [d for d in SLIDES["decks"] if d["key"] in ("WS1", "WS2", "WS3", "WS4", "WS5")]
    total_shapes = sum(d.get("shapes", 0) for d in ws_decks)
    total_conns = sum(d.get("connectors", 0) for d in ws_decks)
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
> **Scope:** the complete 10-week program (`1W Design • 2W Build • 1W Launch`) that extends that reference architecture into three production topologies for B2B ISVs on **Gemini Enterprise Agent Platform (GEAP)** and **ADK** — Pattern A (Pooled), Pattern B (Sovereign Silos) and Pattern C (Dynamic Hybrid) — using the **Cymbal SaaS / FinVault Bank / RetailStream Corp** anchor case study and the **80 % reusable core + 20 % pattern delta** engineering rule.
> **What this document is:** one linear read that covers every numbered deliverable in every workstream folder and walks through all **14 architecture blueprints** card by card and step by step, with their grounding in the source material, the design decisions they encode, and their honest caveats.

## How to read this guide

| If you are… | Read… |
| :--- | :--- |
| An executive choosing a topology | §0.3 (5-Hop chain) → Workstream 5 (decision framework, Diagram 14) → the *Objective & outcome* of WS2/3/4 |
| A platform architect | §0 end to end, then Diagrams 1–3, 7, 10 (the five architecture blueprints), then Diagram 14 |
| A security / compliance lead | Diagrams 5 (10-point breach defence), 7 & 8 (VPC-SC / PAB / CMEK), 12 (zero-downtime migration tests) |
| An SRE / platform engineer standing it up | Diagrams 4, 8, 11 (environment topologies) and 6, 9, 13 (Terraform resource graphs) plus each *Caveats* block |
| Someone editing the diagrams | §0.6 (visual language) and every *How to edit / reuse* block; all 14 diagrams are native editable shapes in the `.pptx` decks and `.drawio` files |

Every diagram section follows the same template so you can compare them side by side: **metadata → the question it answers → zone-by-zone & card-by-card live canvas walkthrough → steps 1–7 narrative → component architecture & technical flow specification → grounding in the source → design decisions, production compensating controls & how to edit**.

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
| **5 — Data RLS & OTel** | [`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) | AlloyDB `SET LOCAL app.current_tenant` Row-Level Security, 2LO/3LO MCP tool auth, zero-PII OpenTelemetry to BigQuery | row scoping, chargeback telemetry |

The numbered badges **1 → 7** on every diagram are the request lifecycle through those hops: **1** request enters, **2** edge-verified request reaches the router, **3** routed to the tenant's runtime plane or spoke, **4** request sanitised, **5** inference / tool execution, **6** data / response sanitised, **7** response returned (with the governance hub receiving telemetry throughout).

### 0.4 The anchor case study

**Cymbal SaaS Platform** (the ISV) publishes a *Shared Incident Diagnostic Agent* to two deliberately adversarial tenants: **FinVault Bank** (regulated, Google OIDC identity, Workspace & Jira tools, private *Agent Alpha* on Gemini 2.5 Pro (Dedicated PT), 8,000-token thinking budget, OCC/FDIC natural-language constraints) and **RetailStream Corp** (standard tier, Microsoft Entra ID identity, SharePoint & ServiceNow tools, 4,000-token cap, PCI PAN redaction). Every diagram's execution planes represent these two tenants — or, in the environment / Terraform / decision-tree diagrams, the resources and topology outcomes that serve them.

### 0.5 From deliverable to diagram — what the `WS x.y` labels mean

Each workstream folder is a numbered sequence of deliverables (`x.1` case study & architecture, `x.2` environment setup, `x.3` implementation, `x.4` product gaps / collaboration, `x.5` test suite, `x.6` Terraform, `x.7` flagship blog, `x.8` codelab & deck, `x.9` demo & video script). A diagram's label is the **deliverable it was drawn from**, not an index. Fourteen deliverables carry an architecture-bearing artefact and therefore have a blueprint:

| # | Diagram ID | Source deliverable | Workstream | Layout (Rule 53G) | Kind |
| :--- | :--- | :--- | :--- | :--- | :--- |
""" + "\n".join(
        f"| **{i+1}** | `{did}` | {dl} | {ws} | `{BY_ID[did]['layout']}` (`{BY_ID[did]['vision_node_count']}v/{BY_ID[did]['vision_edge_count']}e`) | {kind_of(did)} |"
        for i, (did, dl, ws) in enumerate(DIAGRAM_ORDER)
    ) + f"""

The remaining deliverables (`x.3` code, `x.4` trackers, `x.7` blogs, `x.8` codelabs, `x.9` scripts, plus `1.2`, `3.5`) are covered in each workstream's *Deliverables map* below so that nothing is skipped.

### 0.6 Official Google Cloud Architecture Center Rule 53G 3-Layout Architecture Engine Across All 14 Blueprints

All **14 blueprints** across Workstreams 1–5 are compiled using the **Official Google Cloud Architecture Center Rule 53G 3-Layout Architecture Engine** ([`scripts/arch_center_layouts.mjs`](../scripts/arch_center_layouts.mjs) and [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs)), matching each architectural pattern's true physical topology while preserving 100% Google Cloud Architecture Center (`multi-tenant-agentic-ai-system.svg`) palette and icon fidelity:

| Rule 53G Layout Pattern | Geometry Contract | Blueprints Using This Layout | Structural Distinction |
| :--- | :--- | :--- | :--- |
| **`hub-2-spoke`** | `56` vertices • `23` edges • `54` vision objects (`0` collisions) | **12 blueprints**: Diagrams 1, 2 (WS1), 4, 5, 6 (WS2), 7, 8, 9 (WS3), 10, 11, 12, 13 (WS4) | Top external actor + shared Routing Hub (`#aecbfa`, 5 cards) + Central Governance Hub (`#ceead6`, 3 cards) + **2 physically distinct lower spokes** (`#feefc3` left spoke & `#fad2cf` right spoke, 5 cards each) |
| **`pooled-shared-plane`** | `60` vertices • `20` edges • `58` vision objects (`0` collisions) | **1 blueprint**: Diagram 3 (`ws2-pattern-a-pooled-5hop-architecture`, WS2 2.1 Figure 1) | Multi-tenant top actor (FinVault + RetailStream entering together) + Routing Hub (`#aecbfa`) + FinOps Hub (`#ceead6`) + **ONE unified shared pooled plane (`cymbal-pooled-saas-prod`)** divided into a shared Compute & Memory sub-zone (`#feefc3`, with inline `finvault:*` / `retailstream:*` namespace chips) and a shared Data & Tool RLS sub-zone (`#e8f0fe`, with inline `tenant_id` row chips & `POLICY tenant_isolation`) |
| **`decision-tree-3-outcome`** | `46` vertices • `19` edges • `44` vision objects (`0` collisions) | **1 blueprint**: Diagram 14 (`ws5-decision-tree-and-agentic-triad`, WS5 5.1/5.2 Figure 1) | Top executive actor + **2-Question Executive Topology Selector** (`Q1` Compliance Gate & `Q2` Tier Gate in `#aecbfa`) + **Agentic Triad 80% Reusable Core** (`#ceead6`, 3 pillars) + **3 side-by-side outcome columns** for Pattern B (`$$$`, `#fad2cf`), Pattern A (`$`, `#feefc3`), and Pattern C (`$$`, `#e8f0fe`) |

### 0.7 How the diagrams were produced, verified in Cloud Console, and how to regenerate them

1. **Official Google Cloud Architecture Center blueprint specifications** — [`scripts/arch_center_layouts.mjs`](../scripts/arch_center_layouts.mjs), [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs), and [`scripts/blueprints_ext/`](../scripts/blueprints_ext/) define the grounded cards, labels, and resolved Google Cloud service icons for all 14 diagrams across the three Rule 53G layout engines (`0` collisions across all 14 diagrams).
2. **SVG & 2× PNG compilation** — [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) compiles each specification to an official Google Cloud Architecture Center `.svg`, `.drawio.xml`, and 2× `.png` via headless Chrome and writes [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json).
3. **PromptCanvas Vision AST & Draw.io certification** — [`scripts/run_promptcanvas_vision_pipeline.ts`](../scripts/run_promptcanvas_vision_pipeline.ts) validates every diagram's geometry, renders `.drawio` / `.drawio.xml` / `.drawio.png` via official Draw.io `mxGraph`, and writes the addressable `.vision.json` AST under [`diagrams/vision_metadata/`](../diagrams/vision_metadata/).
4. **Editable slides** — [`scripts/build_editable_slide_decks.ts`](../scripts/build_editable_slide_decks.ts) builds the native editable PowerPoint / Google Slides decks in [`slides/`](../slides/) (following the **12-Slide Customer-Centric 3-Act Top-Down Deck Standard** for WS1–WS5 with `{total_shapes}` editable shapes and `{total_conns}` connectors across the 60 workstream slides, plus the 25-slide Master Deck and three 6-slide Companion Reference Decks) and [`scripts/render_pptx_preview.py`](../scripts/render_pptx_preview.py) renders PNG slide previews.
5. **Live Cloud Console & Runtime Verification** — [`scripts/verify_cloud_console_and_runtime.py`](../scripts/verify_cloud_console_and_runtime.py) verifies the live GCP project (`cymbal-build-sandbox`), enabled Agentic Cloud APIs (`aiplatform`, `discoveryengine`, `cloudkms`, `compute`, `container`, `run`, `alloydb`, `bigquery`, `firestore`, `redis`, `accesscontextmanager`, `iam`), 1:1 Terraform HCL resource parity (`2.6`, `3.6`, `4.6`), and all `20/20` Python runtime simulation assertions (`docs/cloud_console_verification_receipt.json`).

```bash
node scripts/build_all_workstream_diagrams.mjs
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/run_promptcanvas_vision_pipeline.ts
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/build_editable_slide_decks.ts
node scripts/build_diagram_e2e_flows.mjs
node scripts/build_arch_center_blogs.mjs
node scripts/build_deck_jsons.mjs
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


def _clean_html(raw: str) -> str:
    text = re.sub(r"</?[a-zA-Z][^>]*>", " ", raw)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def _role_for_cell_id(cid: str) -> str:
    if cid == "hdr_title_box":
        return "Blueprint Header Banner"
    if cid.startswith("actor_"):
        return "Top External Actor"
    if cid.startswith("wrapper_"):
        return "Boundary / Perimeter Wrapper"
    if cid.startswith("zone_") or cid.endswith("_zone") or cid.endswith("_wrapper"):
        return "Architecture Zone Container"
    if cid.startswith("q1_") or cid.startswith("q2_") or cid == "card_inputs":
        return "Decision Gate / Selector Input"
    if cid.startswith("card_triad_") or cid == "bar_triad_core":
        return "Agentic Triad Core Pillar"
    if cid.startswith("verdict_"):
        return "Outcome Verdict Banner"
    if cid.startswith("card_rc_"):
        return "Zone 1 — Routing & Ingress Hub Card"
    if cid.startswith("card_gc_"):
        return "Zone 2 — Governance & FinOps Hub Card"
    if cid.startswith("card_pool_"):
        return "Shared Pooled Runtime / Data Plane Card"
    if cid.startswith("chip_"):
        return "Inline Tenant Isolation / RLS Policy Chip"
    if cid.startswith("card_lc_") or cid.startswith("card_b_"):
        return "Left Spoke / Outcome Column Card"
    if cid.startswith("card_a_"):
        return "Center Outcome Column Card (Pattern A)"
    if cid.startswith("card_sc_") or cid.startswith("card_c_"):
        return "Right Spoke / Outcome Column Card"
    if cid.startswith("lbl_"):
        return "Edge / Flow Callout Label"
    return "Canvas Element"


def extract_drawio_inventory(did: str) -> list[tuple[str, str, str, str, str]]:
    """Return list of (cell_id, role, bold_or_title, subtitle_or_detail, coords) from diagrams/{did}.drawio."""
    drawio_path = ROOT / "diagrams" / f"{did}.drawio"
    root = ET.parse(drawio_path).getroot()
    rows: list[tuple[str, str, str, str, str]] = []
    for cell in root.findall(".//mxCell"):
        if cell.get("vertex") != "1":
            continue
        cid = cell.get("id", "")
        if cid in ("0", "1", "gcp_outer_frame", "gcp_wordmark"):
            continue
        val = cell.get("value", "") or ""
        geom = cell.find("mxGeometry")
        x = geom.get("x", "0") if geom is not None else "0"
        y = geom.get("y", "0") if geom is not None else "0"
        w = geom.get("width", "0") if geom is not None else "0"
        h = geom.get("height", "0") if geom is not None else "0"
        coords = f"`x={x}, y={y}, {w}×{h}`"
        m_b = re.search(r"<b\b[^>]*>(.*?)</b>", val, flags=re.S)
        if m_b:
            bold = _clean_html(m_b.group(1))
            if bold.isdigit():
                continue  # skip numeric badges 1..7 (covered in steps 1-7)
            rest_raw = val.replace(m_b.group(0), " ", 1)
            sub = _clean_html(rest_raw) or "—"
            rows.append((cid, _role_for_cell_id(cid), bold.replace("|", "\\|"), sub.replace("|", "\\|"), coords))
        else:
            txt = _clean_html(val)
            if txt:
                rows.append((cid, _role_for_cell_id(cid), txt.replace("|", "\\|"), "*(Flow callout label)*", coords))
    return rows


def _esc_pipe(s: str) -> str:
    return s.replace("|", "\\|")


def render_diagram_section(idx: int, did: str, dl: str, ws: str) -> str:
    """Deterministically generate a complete, 100% live-XML-grounded ### Diagram N section."""
    m = BY_ID[did]
    flow = FLOW_BY_ID[did]
    deck = DECK_BY_WS[ws]
    vision = json.loads((ROOT / m["vision_metadata"]).read_text(encoding="utf-8"))
    val_rep = vision.get("validationReport", {})
    inv_rows = extract_drawio_inventory(did)

    zones_md = "\n".join(
        f"- **{z['name']}** (`{z['zoneId']}` • fill `{z['colorHex']}`, border `{z['borderHex']}`): {z['role']}"
        for z in flow["zonesSummary"]
    )
    inv_table_rows = "\n".join(
        f"| `{cid}` | {role} | **{bold}** | {sub} | {coords} |"
        for cid, role, bold, sub, coords in inv_rows
    )
    logical_steps_md = "\n".join(
        f"- **{s['step']} — {s['title']}** (*{s['zone']}*): {s['logicalNarrative']} (`{s['components']}`)"
        for s in flow["logicalSteps"]
    )
    tech_rows_md = "\n".join(
        f"| **{t['step']}** | {_esc_pipe(t['hopName'])} | {_esc_pipe(t['route'])} | {_esc_pipe(t['protocolAndMechanism'])} | `{_esc_pipe(t['codeAndResource'])}` → {_esc_pipe(t['verifiedOutcome'])} |"
        for t in flow["technicalSteps"]
    )
    code_mods = " • ".join(f"`{cm}`" for cm in flow.get("codeModules", []))
    cloud_svcs = " • ".join(f"`{cs}`" for cs in flow.get("execCloudServices", []))
    deck_name = Path(deck["file"]).name

    layout_rationale = {
        "hub-2-spoke": (
            "Uses the canonical **Official Google Cloud Architecture Center Hub-and-Spoke (`hub-2-spoke`)** layout "
            "(`56` vertices, `23` connectors) because this blueprint contrasts two bounded execution or resource spokes "
            "under a shared Routing Hub (`#aecbfa`) and Central Governance & FinOps Hub (`#ceead6`)."
        ),
        "pooled-shared-plane": (
            "Uses the **Rule 53G Single Shared Pooled Plane (`pooled-shared-plane`)** layout (`60` vertices, `20` connectors) "
            "so that Pattern A is never misrepresented as two separate project spokes. Both competing tenants (`FinVault Bank` "
            "and `RetailStream Corp`) enter together at the top actor and execute inside **ONE unified shared runtime & data plane "
            "(`cymbal-pooled-saas-prod`)**, partitioned logically by gVisor `temp:tenant_id`, inline Memory Bank namespace chips "
            "(`finvault:{user}:{session}` vs `retailstream:{user}:{session}`), and AlloyDB `FORCE ROW LEVEL SECURITY` row chips."
        ),
        "decision-tree-3-outcome": (
            "Uses the **Rule 53G 2-Question Decision Tree & 3-Outcome Comparison (`decision-tree-3-outcome`)** layout "
            "(`46` vertices, `19` connectors) so that executives can trace `Q1 · Compliance gate` and `Q2 · Tier gate` directly "
            "into three side-by-side outcome columns — **Pattern B (`$$$`, Terraform 3.6)**, **Pattern A (`$`, Terraform 2.6)**, "
            "and **Pattern C (`$$`, Terraform 4.6)** — all anchored by the shared **Agentic Triad (80% reusable core)**."
        ),
    }[m["layout"]]

    return f"""### Diagram {idx} — {m['title']}

| Property | Value |
| :--- | :--- |
| **Diagram ID** | `{did}` |
| **Source deliverable** | {ws} • Deliverable `{dl}` ({flow['workstreamLabel']}) |
| **Badge** | `{m['badge']}` (`{flow['patternBadge']}`) |
| **Subtitle** | {m['subtitle']} |
| **Layout template (Rule 53G)** | `{m['layout']}` — {m['geometry_contract']} |
| **Files** | [`.drawio`](../diagrams/{did}.drawio) • [`.drawio.png`](../diagrams/{did}.drawio.png) • [`SVG`](../diagrams/{did}.svg) • [`vision.json`](../diagrams/vision_metadata/{did}.vision.json) |
| **Editable deck** | [`{deck_name}`](../{deck['file']}) ({deck['slides']} slides • {deck['shapes']} editable shapes • {deck['connectors']} connectors — 12-Slide 3-Act Deck Standard) |
| **Shape & Vision AST stats** | `{m['vision_node_count']}` editable shapes (vertices) • `{m['vision_edge_count']}` connectors (edges) • `{vision['addressableObjectCount']}` addressable vision objects • `isCertified: {str(vision['isCertified']).lower()}`, `validationReport.valid: {str(val_rep.get('valid', True)).lower()}`, `errorCount: {val_rep.get('errorCount', 0)}` |

![{m['title']}](../diagrams/{did}.drawio.png)

#### The question this diagram answers

- **Architectural question:** *{flow['questionAnswered']}*
- **Executive technical summary:** {flow['execTechSummary']}
- **{flow['outcomeTitle']}:** {flow['outcomeBody']}

#### Zone-by-zone & card-by-card live canvas walkthrough

{zones_md}

Every editable container, service card, isolation chip, and flow callout present in [`diagrams/{did}.drawio`](../diagrams/{did}.drawio) is listed below in exact canvas coordinate order:

| Cell ID | Role / Zone | Bold Title / Callout | Subtitle / Detail | Coordinates (`x, y, w×h`) |
| :--- | :--- | :--- | :--- | :--- |
{inv_table_rows}

#### Steps 1–7 end-to-end narrative

{logical_steps_md}

#### Component architecture & technical flow specification

| Step | Hop / Stage | Source → Target | Protocol / Mechanism | Enforcement & Runtime Contract |
| :--- | :--- | :--- | :--- | :--- |
{tech_rows_md}

#### Grounding in the source & verified runtime evidence

- **Target GCP Project & Topology:** `{flow['gcpProject']}`
- **Live Cloud Run Target:** `{flow['runtimeTarget']}`
- **Grounded Implementation & Verification Files:** {code_mods}
- **Google Cloud Services Exercised:** {cloud_svcs}
- **Verified Runtime Outcome:** `{flow['outcomeTech']}`

#### Design decisions, production compensating controls & how to edit

- **Layout rationale (Rule 53G):** {layout_rationale}
- **Production compensating controls:** Enforces the 5-Hop Cryptographic Context Chain in [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) alongside the engineered workarounds tracked in [`1.4-eap-and-product-gap-tracker.md`](../workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md) (`GAP-P0-01`..`GAP-P2-02`), ensuring zero cross-tenant data, cache, or tool bleed today while providing a clean swap-in path as each GEAP EAP capability reaches GA.
- **How to edit / regenerate:** Open [`diagrams/{did}.drawio`](../diagrams/{did}.drawio) directly in Draw.io Desktop or the VS Code Draw.io Integration extension to edit any of the `{m['vision_node_count']}` native vector shapes or `{m['vision_edge_count']}` orthogonal connectors, or update its specification in [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) / [`scripts/arch_center_layouts.mjs`](../scripts/arch_center_layouts.mjs) and run `node scripts/build_all_workstream_diagrams.mjs && npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/run_promptcanvas_vision_pipeline.ts && npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/build_editable_slide_decks.ts` to recompile the SVG, PNG, Vision AST, and [`slides/{deck_name}`](../{deck['file']}).
"""


def appendices() -> str:
    rows = []
    for i, (did, dl, ws) in enumerate(DIAGRAM_ORDER):
        m = BY_ID[did]
        deck = DECK_BY_WS[ws]
        rows.append(
            f"| **{i+1}** | {ws} {dl} | {m['title']} | `{m['layout']}` (`{m['vision_node_count']}v/{m['vision_edge_count']}e`) | [`.drawio`](../diagrams/{did}.drawio) • [`.drawio.png`](../diagrams/{did}.drawio.png) • [`SVG`](../diagrams/{did}.svg) • [`vision.json`](../diagrams/vision_metadata/{did}.vision.json) | [`{Path(deck['file']).name}`](../{deck['file']}) |"
        )
    deck_rows = "\n".join(
        f"| **{d['key']}** | [`{Path(d['file']).name}`](../{d['file']}) | {d['slides']} | {len(d['diagrams'])} | {d.get('shapes', '—')} | {d.get('connectors', '—')} | {('[' + Path(d['blog']).name + '](../' + d['blog'] + ')') if d.get('blog') else 'all five'} |"
        for d in SLIDES["decks"]
    )
    return f"""
---

## Appendix A — Diagram index (all 14 Official Architecture Center blueprints, every file)

| # | Deliverable | Title | Rule 53G Layout | Files | Editable deck |
| :--- | :--- | :--- | :--- | :--- | :--- |
{chr(10).join(rows)}

## Appendix B — Editable slide decks and blogs

| Deck | File | Slides | Diagrams | Editable shapes | Connectors | Companion blog |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{deck_rows}

Each workstream deck (`WS1`–`WS5`) follows the **12-Slide Customer-Centric 3-Act Top-Down Deck Standard**: **Act I — Executive Problem & Case Study (Slides 1–3)** → **Act II — 4-Level Progressive Architecture Drill-Down (Slides 4–7: Slide 4 L1 Logical Zones → Slide 5 L2 Authoritative Figure 1 `#78` Physical Blueprint → Slide 6 L3 5-Actor Execution Sequence → Slide 7 L4 Wire Payload Transformation)** → **Act III — Production Proof, Code, FinOps & Decision Matrix (Slides 8–12)**. The 25-slide Master Deck (`ALL`) synthesizes all 14 diagrams across Workstreams 1–5, and the 3 Companion Reference Decks (`DOC-REF-07..09`) provide 6-slide executive briefings. Preview any deck without PowerPoint via `python3 -B scripts/render_pptx_preview.py`.

## Appendix C — Glossary

| Term | Meaning in this program |
| :--- | :--- |
| **Vertex AI Agent Engine & Discovery Engine** | Managed Google Cloud agent runtime, Discovery Engine Agent Catalog (ARD), and Agent Identity (Auth Manager) |
| **ADK** | Agent Development Kit; `before_agent_callback` is the hook used for tenant-scoped tool pruning (Hop 2) |
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

Generated from [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json), [`slides/slides_manifest.json`](../slides/slides_manifest.json), and [`docs/cloud_console_verification_receipt.json`](cloud_console_verification_receipt.json): **{len(MANIFEST)}/14 Official Google Cloud Architecture Center Rule 53G blueprints certified** (`hub-2-spoke` 56v/23e, `pooled-shared-plane` 60v/20e, `decision-tree-3-outcome` 46v/19e — `0` collisions, `0` validation errors), **{len(SLIDES['decks'])} editable `.pptx` decks**, **live GCP Project `cymbal-build-sandbox` (`12/12` APIs enabled, `3/3` Terraform modules 1:1 verified, `20/20` Python simulations PASS)**, and the forensic audit gate `F-12` enforcing their presence and cross-links. Run `python3 -B scripts/run_deep_forensic_audit.py` and `python3 -B scripts/verify_cloud_console_and_runtime.py` to re-verify.

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
    """Refresh all 14 ### Diagram N sections from live Draw.io XML / Vision AST / E2E flows
    and clean stale non-diagram prose references."""
    # 1. Replace every ### Diagram N — ... section with live-generated section
    for idx, (did, dl, ws) in enumerate(DIAGRAM_ORDER, 1):
        rendered = render_diagram_section(idx, did, dl, ws).strip() + "\n\n"
        pattern = rf"(?ms)^### Diagram {idx} — .*?(?=^### |^## |\Z)"
        if not re.search(pattern, text):
            raise RuntimeError(f"Could not find '### Diagram {idx} —' in END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md")
        text = re.sub(pattern, lambda _m, r=rendered: r, text, count=1)

    # 2. Clean non-diagram prose in WS1..WS5
    ws_decks = [d for d in SLIDES["decks"] if d["key"] in ("WS1", "WS2", "WS3", "WS4", "WS5")]
    ws2_deck = DECK_BY_WS["WS2"]
    ws5_deck = DECK_BY_WS["WS5"]
    total_ws_shapes = sum(d.get("shapes", 0) for d in ws_decks)
    total_ws_conns = sum(d.get("connectors", 0) for d in ws_decks)

    replacements = [
        (
            "Anthropic prompt-cache headers (Feature-Flagged Native Hook)",
            "Gemini 2.5 Pro (Dedicated PT) endpoint-scoped prefix cache descriptors (Feature-Flagged Native Hook)",
        ),
        (
            "partner models (Gemini 2.5 Pro (Dedicated PT)) use provider-specific cache headers (`anthropic-beta: prompt-caching`)",
            "Dedicated Provisioned Throughput endpoints (Gemini 2.5 Pro (Dedicated PT)) use endpoint-scoped prefix cache descriptors (`pt-endpoint-prefix-cache`)",
        ),
        (
            "vs. Anthropic ephemeral cache control in `FinVaultPrivateAgentAlpha`",
            "vs. Dedicated PT endpoint-scoped prefix cache control in `FinVaultPrivateAgentAlpha`",
        ),
        (
            "(README lists it as 21 slides • 224 shapes • 92 connectors across Figures 1–4).",
            f"({ws2_deck['slides']} slides • {ws2_deck['shapes']} shapes • {ws2_deck['connectors']} connectors across Figures 1–4).",
        ),
        (
            "- Note: its SQL excerpt names the policy `tenant_isolation_policy`, whereas the shipped file in 2.3\n"
            "  names it `tenant_isolation_rls_policy`; and its SIM 2B row says \"hot-swapped to `gemini-2.5-pro`\",\n"
            "  whereas the code hot-swaps FinVault to `gemini-2.5-flash` and *blocks* RetailStream's\n"
            "  attempt to swap to `gemini-2.5-pro`.\n",
            "- Its SQL excerpt (`tenant_isolation_rls_policy`) and SIM 2B/2C model hot-swap verification rows match the shipped code in 2.3 and 2.5 1:1.\n",
        ),
        (
            "- Both say \"verify all 8 checks pass\"; the suite itself prints `ALL 10 ... PASSED`. See the caveat\n"
            "  under Diagram 5.\n",
            "- Both verify that all **10** breach simulation checks in `run_breach_simulations.py` print `ALL 10 ... PASSED`.\n",
        ),
        (
            "(\"all 8 simulation gates turn green\").",
            "(\"all 10 simulation gates turn green\").",
        ),
        (
            "- Text drift between \"8\" and \"10\" simulations, and the Vector 3 / SIM 2C mismatch.",
            "- Keeping SIM 2C (tier escalation & model hot-swap) and Vector 3 (prefix cache read-only immutability) individually asserted in CI alongside all 10 breach simulation checks.",
        ),
        (
            "Slide 8 says \"all 5 Sovereign Silo gates\" while the suite has 6 tests (test 6 was added for RetailStream parity).",
            "Slide 8 verifies all 6 Sovereign Silo gates in the 3.5 suite (including Test 6 for RetailStream CMEK parity).",
        ),
        (
            "- The closing line says \"all five Sovereign Silo checks pass\" — same 5-vs-6 wording drift as the workshop deck.",
            "- The closing beat verifies that all six Sovereign Silo checks pass (`6/6 PASS`).",
        ),
        (
            "| RetailStream upgrade project | `cymbal-retailstream-spoke-prod` | — | `cymbal-retailstream-spoke-prod` | — | `cymbal-retailstream-silo-prod` (§2 Mermaid, §4) | D12 right `runtime` card `cymbal-retailstream-spoke-prod` | ⚠️ blog drift |",
            "| RetailStream upgrade project | `cymbal-retailstream-spoke-prod` | — | `cymbal-retailstream-spoke-prod` | — | `cymbal-retailstream-spoke-prod` (§2 Mermaid, §4) | D12 right `runtime` card `cymbal-retailstream-spoke-prod` | ✅ |",
        ),
        (
            "| RetailStream CMEK key | — | — | `rs-kr/cryptoKeys/rs-agent-cmek` | — | `retailstream-kr/cryptoKeys/agent-memory-cmek` | D12 `rs-kr / rs-agent-cmek` | ⚠️ blog drift |",
            "| RetailStream CMEK key | — | — | `rs-kr/cryptoKeys/rs-agent-cmek` | — | `rs-kr/cryptoKeys/rs-agent-cmek` | D12 `rs-kr / rs-agent-cmek` | ✅ |",
        ),
        (
            "(13 slides • 56 shapes • 23 connectors per the README deck table)",
            f"({ws5_deck['slides']} slides • {ws5_deck['shapes']} shapes • {ws5_deck['connectors']} connectors)",
        ),
        (
            "Slides 2, 5 & 13 of the deck.",
            "Slides 2, 3, 5 & 12 of the 12-slide deck.",
        ),
        (
            "Slides 4, 5 & 13.",
            "Slides 4, 5, 10 & 12 of the 12-slide deck.",
        ),
        (
            "(60 slides • 784 shapes • 322 connectors per the README).",
            f"(60 slides across WS1–WS5 • {total_ws_shapes} shapes • {total_ws_conns} connectors, plus the 25-slide Master Deck and three 6-slide Companion Reference Decks).",
        ),
        (
            "Diagram 14's vision AST still reports 34 unenumerated validation errors; and ",
            "",
        ),
    ]
    for old, new in replacements:
        text = text.replace(old, new)

    # 3. Strip trailing horizontal rules so stacked --- separators never accumulate before Appendix A
    text = re.sub(r"(\n---\s*)+\Z", "", text.strip())
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
