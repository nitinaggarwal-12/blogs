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

### 0.6 Visual language shared by all 14 blueprints

All blueprints are rendered in the Google Cloud Architecture Center hub-and-spoke idiom of the anchor reference:

| Element | Meaning |
| :--- | :--- |
| Blue outer frame with the Google Cloud wordmark | Google Cloud organisation / project boundary; its label states the control-plane scope |
| Thin white inner frame | VPC or governance perimeter; its label names the network / policy scope |
| **Light-blue hub (left)** | *Routing hub* — ingress, identity, routing (Hops 1–2); always five cards: three enforcement cards on the left, Load Balancer top-right, Router bottom-right |
| **Light-green hub (right)** | *Central governance & security hub* — three cards (security posture, identity/keys, observability or a state machine) |
| **Yellow spoke (bottom-left)** | Tenant A / pooled / "before" side — five cards: guardrail, model, runtime, tool server, datastore |
| **Red spoke (bottom-right)** | Tenant B / sovereign / "after" side — same five slots |
| Dashed line from governance hub | Telemetry, audit or key-state signal consumed by both spokes |
| Dark-blue numbered circles 1–7 | Request lifecycle (see §0.3) |
| Icons | Official Google Cloud product icons (Cloud Armor / Load Balancing, Model Armor, IAM / IAP, Cloud Run, Security Command Center, Cloud KMS, Cloud Logging, AlloyDB / BigQuery, Gemini / Agent Platform, MCP servers) |

Because the template is fixed, the five spoke slots sometimes hold non-runtime components (Terraform resources, migration phases, provisioning steps); each diagram section says explicitly what each slot represents.

### 0.7 How the diagrams were produced and how to regenerate them

1. **Blueprint config** — one object per diagram in [`scripts/build_all_workstream_diagrams.mjs`](../scripts/build_all_workstream_diagrams.mjs) (the original seven) or one file per diagram in [`scripts/blueprints_ext/`](../scripts/blueprints_ext/) (the seven deliverable blueprints). Every label on every card lives there; this guide quotes them verbatim.
2. **Architecture Center render** — the same script compiles each config to a 1200 × 1410 SVG and a 2× PNG via headless Chrome and writes [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json).
3. **PromptCanvas Vision decompile** — [`scripts/run_promptcanvas_vision_pipeline.ts`](../scripts/run_promptcanvas_vision_pipeline.ts) heals and enriches the XML with official vector icons, validates it, emits `.drawio` / `.drawio.xml` / `.drawio.png` and a `vision.json` AST (54 addressable objects, 56 vertices, 23 orthogonal edges per diagram).
4. **Editable slides** — [`scripts/build_editable_slide_decks.ts`](../scripts/build_editable_slide_decks.ts) inserts every diagram into PowerPoint / Google Slides as native shapes, icons and connectors (not pictures) with a talking-points sidebar and speaker notes, producing the six decks in [`slides/`](../slides/) ({total_shapes} editable shapes across the five workstream decks).
5. **Verification** — [`scripts/run_deep_forensic_audit.py`](../scripts/run_deep_forensic_audit.py) check `F-12` requires all 14 blueprints, 6 decks and 5 blogs to exist, be certified and cross-link correctly.

```bash
node scripts/build_all_workstream_diagrams.mjs
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/run_promptcanvas_vision_pipeline.ts
npx --prefix ../PromptCanvas tsx --tsconfig ../PromptCanvas/tsconfig.json scripts/build_editable_slide_decks.ts
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
            f"| **{i+1}** | {ws} {dl} | {m['title']} | [`.drawio`](../diagrams/{did}.drawio) • [`.xml`](../diagrams/{did}.drawio.xml) • [`.drawio.png`](../diagrams/{did}.drawio.png) • [`SVG`](../diagrams/{did}.svg) • [`PNG`](../diagrams/{did}.png) • [`vision.json`](../diagrams/vision_metadata/{did}.vision.json) | [`{Path(deck['file']).name}`](../{deck['file']}) |"
        )
    deck_rows = "\n".join(
        f"| **{d['key']}** | [`{Path(d['file']).name}`](../{d['file']}) | {d['slides']} | {len(d['diagrams'])} | {d.get('shapes', '—')} | {d.get('connectors', '—')} | {('[' + Path(d['blog']).name + '](../' + d['blog'] + ')') if d.get('blog') else 'all five'} |"
        for d in SLIDES["decks"]
    )
    return f"""
---

## Appendix A — Diagram index (all 14 blueprints, every file)

| # | Deliverable | Title | Files | Editable deck |
| :--- | :--- | :--- | :--- | :--- |
{chr(10).join(rows)}

## Appendix B — Editable slide decks and blogs

| Deck | File | Slides | Diagrams | Editable shapes | Connectors | Companion blog |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{deck_rows}

Deck structure is identical everywhere: *Title → Executive TL;DR → section narrative → per diagram [1:1 master image • decomposed editable slide with talking-points sidebar & speaker notes • component specification table] → Key takeaways → Asset index*. Preview any deck without PowerPoint via `python3 -B scripts/render_pptx_preview.py slides/<deck>.pptx`.

## Appendix C — Glossary

| Term | Meaning in this program |
| :--- | :--- |
| **GEAP** | Gemini Enterprise Agent Platform — managed agent runtime, registry (ARD) and identity (Agent Identity / Auth Manager) |
| **ADK 2.0** | Agent Development Kit; `before_agent_callback` is the hook used for tenant-scoped tool pruning (Hop 2) |
| **5-Hop chain** | The reusable governance pipeline in `core-cymbal-agent/governance/` (see §0.3) |
| **OBO / DPoP** | RFC 8693 On-Behalf-Of token exchange and Demonstration of Proof-of-Possession — sender-constrained JWTs at Hop 1 |
| **2LO / 3LO** | Two-legged (service) vs three-legged (delegated user) OAuth for MCP tool servers |
| **ARD** | Agent Registry & Discovery — the catalog whose tenant labels drive Hop 2 visibility |
| **Model Armor / SDP** | Vertex AI Model Armor prompt & response screening; Sensitive Data Protection redaction (Hop 4) |
| **NLC** | Natural-language constraint — tenant-specific semantic guardrail (e.g. OCC/FDIC escalation rules) |
| **RLS** | AlloyDB Row-Level Security keyed by `SET LOCAL current_tenant` (Hop 5) |
| **VPC-SC / PAB / CMEK** | VPC Service Controls perimeter, IAM Principal Access Boundary policy, Customer-Managed Encryption Keys — the Pattern B sovereign delta |
| **PSC** | Private Service Connect — producer *ServiceAttachment* in a spoke, consumer endpoint in the hub — the Pattern C bridge |
| **HTTP 423 `KMS_KEY_DISABLED`** | The CMEK kill-switch surfacing as a locked response when a tenant revokes its key |
| **SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY** | The three phases of the Pattern C zero-downtime live tier upgrade |
| **PromptCanvas Vision** | The decompiler that turns the Architecture Center SVG into healed Draw.io XML, a `vision.json` AST and native editable PowerPoint shapes |

## Appendix D — Verification status

Generated from [`diagrams/diagrams_manifest.json`](../diagrams/diagrams_manifest.json) and [`slides/slides_manifest.json`](../slides/slides_manifest.json): **{len(MANIFEST)}/14 blueprints certified** (each 56 vertices • 23 edges • 54 vision objects • 0 collisions), **{len(SLIDES['decks'])} decks**, and the forensic audit gate `F-12` enforcing their presence and cross-links. Run `python3 -B scripts/run_deep_forensic_audit.py` to re-verify.

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


def main() -> None:
    DOCS.mkdir(exist_ok=True)
    SECTIONS.mkdir(exist_ok=True)
    scratch = Path("/Users/nitinagga/.gemini/jetski/brain/50ee3ff7-25f3-49cb-b977-ab949eb07952/scratch/e2e_sections")
    parts = []
    for ws in ("ws1", "ws2", "ws3", "ws4", "ws5"):
        src = scratch / f"{ws}.md"
        dst = SECTIONS / f"_e2e-section-{ws}.md"
        if src.exists():
            dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
        if not dst.exists():
            raise SystemExit(f"missing section {dst}")
        parts.append(dst.read_text(encoding="utf-8").strip("\n") + "\n\n---\n")
    fm = front_matter()
    body = "\n".join(parts) + appendices()
    # Insert TOC right after the "How to read" table (before §0)
    marker = "## 0. Program Foundations"
    head, tail = fm.split(marker, 1)
    doc = head + toc(marker + tail + body) + marker + tail + body
    OUT.write_text(doc, encoding="utf-8")
    n_lines = doc.count("\n")
    n_imgs = len(re.findall(r"!\[", doc))
    # link check relative to docs/
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
