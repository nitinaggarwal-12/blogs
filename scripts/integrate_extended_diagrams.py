#!/usr/bin/env python3
"""Integrate the 7 extended deliverable diagrams into blogs, deck JSONs, index.html and README.
Idempotent: skips any target that already contains the diagram id.
NOTE: the blogs/_fragments/ staging inputs were consumed and deleted after the 2026-10-08 run;
re-running is a no-op unless new fragments are staged there."""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
FRAG = ROOT / "blogs/_fragments"
MANIFEST = json.loads((ROOT / "diagrams/diagrams_manifest.json").read_text())
BY_ID = {m["id"]: m for m in MANIFEST}

PLAN = {
    "ws2": {
        "blog": "blogs/ws2-pattern-a-pooled-architecture.md",
        "ids": ["ws2-demo-env-and-3p-auth-sandbox-topology", "ws2-terraform-starter-resource-graph"],
        "labels": ["WS 2.2", "WS 2.6"],
        "button_names": ["WS 2.2 Demo Env & 3P Auth Sandbox", "WS 2.6 Terraform Starter Graph"],
    },
    "ws3": {
        "blog": "blogs/ws3-pattern-b-sovereign-silos.md",
        "ids": ["ws3-multi-project-silo-and-cmek-setup-topology", "ws3-terraform-silo-blueprint-resource-graph"],
        "labels": ["WS 3.2", "WS 3.6"],
        "button_names": ["WS 3.2 Multi-Project Silo & CMEK Setup", "WS 3.6 Terraform Silo Graph"],
    },
    "ws4": {
        "blog": "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md",
        "ids": [
            "ws4-hub-and-spoke-demo-env-setup-topology",
            "ws4-zero-downtime-tier-upgrade-sequence",
            "ws4-terraform-hybrid-psc-blueprint-resource-graph",
        ],
        "labels": ["WS 4.2", "WS 4.5", "WS 4.6"],
        "button_names": ["WS 4.2 Hub-and-Spoke Env Setup", "WS 4.5 Zero-Downtime Upgrade Sequence", "WS 4.6 Terraform Hybrid PSC Graph"],
    },
}


def frag(did, kind):
    return (FRAG / f"{did}.{kind}").read_text(encoding="utf-8")


# ---------- 1. blogs + deck json ----------
for ws, p in PLAN.items():
    blog_path = ROOT / p["blog"]
    text = blog_path.read_text(encoding="utf-8")
    deck_path = blog_path.with_suffix("").with_suffix(".deck.json")
    deck = json.loads(deck_path.read_text(encoding="utf-8"))

    existing_figs = len(re.findall(r"^## .*Figure \d|^## \d+\. Figure \d", text, flags=re.M)) or len(deck["diagrams"])
    next_fig = len(deck["diagrams"]) + 1

    # locate Assets section heading (last "## N. Assets" heading)
    m = list(re.finditer(r"^## (\d+)\. Assets & Editable Diagrams", text, flags=re.M))
    assert m, f"no assets heading in {blog_path}"
    assets_idx = m[-1].start()
    assets_num = int(m[-1].group(1))

    new_sections = []
    asset_rows = []
    fm_ids = []
    for did, label in zip(p["ids"], p["labels"]):
        if did in text:
            next_fig += 1
            continue
        fig = next_fig
        body = frag(did, "blog-fragment.md").strip("\n")
        body = body.replace("Figure N", f"Figure {fig}")
        # convert the fragment's H2 into a numbered section heading placed before Assets
        body = re.sub(r"^## ", f"## {assets_num}. ", body, count=1, flags=re.M)
        assets_num += 1
        new_sections.append(body + "\n\n")
        asset_rows.append(
            f"| **Figure {fig} ({label}) — Draw.io render / editable** | [`{did}.drawio.png`](../diagrams/{did}.drawio.png) • [`.drawio`](../diagrams/{did}.drawio) • [`SVG`](../diagrams/{did}.svg) • [`vision.json`](../diagrams/vision_metadata/{did}.vision.json) |"
        )
        dj = json.loads(frag(did, "deck-fragment.json"))
        dj["figure"] = f"Figure {fig}"
        deck["diagrams"].append(dj)
        fm_ids.append(did)
        next_fig += 1

    if new_sections:
        # renumber the assets heading
        text = text[:assets_idx] + "".join(new_sections) + re.sub(
            r"^## \d+\. Assets", f"## {assets_num}. Assets", text[assets_idx:], count=1, flags=re.M
        )
        # add asset rows after the table header of the assets section
        text = re.sub(
            r"(## \d+\. Assets & Editable Diagrams\n\n\| Asset \| Path \|\n\| :--- \| :--- \|\n)",
            lambda mm: mm.group(1) + "\n".join(asset_rows) + "\n",
            text,
            count=1,
        )
        # frontmatter diagrams list
        text = re.sub(
            r'^diagrams: \[(.*?)\]',
            lambda mm: "diagrams: [" + mm.group(1) + "".join(f', "{d}"' for d in fm_ids) + "]",
            text,
            count=1,
            flags=re.M,
        )
        blog_path.write_text(text, encoding="utf-8")
        deck_path.write_text(json.dumps(deck, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"✅ {ws}: +{len(new_sections)} figure sections → {blog_path.name}, deck.json now {len(deck['diagrams'])} diagrams")
    else:
        print(f"↷ {ws}: already integrated")

# ---------- 2. index.html gallery buttons + badge ----------
idx_path = ROOT / "index.html"
html = idx_path.read_text(encoding="utf-8")
if "ws4-terraform-hybrid-psc-blueprint-resource-graph" not in html:
    buttons = []
    n = 8
    for ws, p in PLAN.items():
        for did, label, name in zip(p["ids"], p["labels"], p["button_names"]):
            title = BY_ID[did]["title"].replace("'", "&#39;").replace("&", "&amp;")
            buttons.append(
                f'          <button class="sim-btn" onclick="selectBlueprint(\'{did}\', \'{label}: {title}\')">{n}. {name}</button>'
            )
            n += 1
    anchor = "7. WS 5.1/5.2 Decision Tree &amp; Triad</button>\n"
    assert anchor in html
    html = html.replace(anchor, anchor + "\n".join(buttons) + "\n", 1)
    html = html.replace("PromptCanvas Vision Draw.io Certified (7/7)", "PromptCanvas Vision Draw.io Certified (14/14)")
    html = html.replace("Workstream 1–5 Enterprise Architecture Blueprints (1200", "Workstream 1–5 Enterprise Architecture &amp; Deliverable Blueprints — 7 Architecture + 7 Setup / Terraform / Upgrade-Suite (1200")
    html = html.replace("7-Blueprint Gallery", "14-Blueprint Gallery")
    idx_path.write_text(html, encoding="utf-8")
    print("✅ index.html: +7 gallery buttons, badge 14/14")
else:
    print("↷ index.html already integrated")

# ---------- 3. README table rows ----------
readme_path = ROOT / "README.md"
rd = readme_path.read_text(encoding="utf-8")
if "ws4-terraform-hybrid-psc-blueprint-resource-graph" not in rd:
    rows = []
    for ws, p in PLAN.items():
        for did, label in zip(p["ids"], p["labels"]):
            t = BY_ID[did]["title"]
            rows.append(
                f"| **{label}** | **{t}** | [`Draw.io PNG`](diagrams/{did}.drawio.png) | [`.drawio`](diagrams/{did}.drawio) • [`.xml`](diagrams/{did}.drawio.xml) | [`JSON`](diagrams/vision_metadata/{did}.vision.json) | [`PNG`](diagrams/{did}.png) • [`SVG`](diagrams/{did}.svg) |"
            )
    anchor = re.search(r"^\| \*\*WS 5\.1\*\* \|.*$", rd, flags=re.M)
    assert anchor
    rd = rd[: anchor.end()] + "\n" + "\n".join(rows) + rd[anchor.end():]
    rd = rd.replace(
        "### Google Cloud Architecture Center & PromptCanvas Vision Draw.io Blueprints (`.drawio` • `.drawio.png` • `.svg` • `.png` • `.vision.json`)",
        "### Google Cloud Architecture Center & PromptCanvas Vision Draw.io Blueprints — 14 Diagrams (`.drawio` • `.drawio.png` • `.svg` • `.png` • `.vision.json`)\n\nThe **WS x.y** label is the *source deliverable* each diagram was drawn from (e.g. `2.6` = `2.6-terraform-starter/`). Seven cover the architecture documents (x.1, 1.3, 2.5, 5.1); seven cover the environment-setup guides (x.2), Terraform blueprints (x.6) and the zero-downtime tier-upgrade suite (4.5).",
    )
    readme_path.write_text(rd, encoding="utf-8")
    print("✅ README: +7 blueprint rows")
else:
    print("↷ README already integrated")
