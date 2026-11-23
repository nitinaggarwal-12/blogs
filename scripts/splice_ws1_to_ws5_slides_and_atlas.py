#!/usr/bin/env python3
"""
Lossless 12-Deck Native DrawingML Splicer, Atlas #R Regenerator & Static Render Refresher.

Updates ALL 12 PPTX decks in place:
  1. BARE_MIN_12 (`slides/geap-bare-minimum-12slide-architecture-deck.pptx`):
     - Replaces S01, S03, S06, S08, S10 with 100% native editable DrawingML (`pic=0`)
       compiled by `scripts/build_ws1_to_ws5_canonical_diagrams.mjs`.
     - Cleans banned pictorial emojis, stale `"▶ 4-State Hybrid & Draw.io ↗"` chips, and `🔗`
       across S02, S04, S05, S07, S09, S11, S12 while preserving `[Slide NN/12 • ...]` in a
       single `<a:t>` run.
     - Refreshes `rId3` Draw.io `#R` hyperlinks for ALL 12 slides from the current `.drawio` XML.
  2. All 5 Lean Visual Decks (`WS1..WS5`), all 5 Executive 10-Slide Decks (`WS1_EXEC..WS5_EXEC`),
     and Deck #12 `ATLAS` (`slides/saas-10-visual-verification-atlas-16slide-deck.pptx` S03):
     - Splices updated `BARE_MIN_12` slides cleanly, preserving target `slideLayout` (`rId1`),
       `notesSlide` (`rId2`), speaker notes, and rewriting `[Slide XX/12 • ...]` -> `[Slide NN/TT • ...]`
       in a single `<a:t>` run.
     - Cleans lean WS4 S04 `🔗` footer while preserving `viewer.diagrams.net`,
       `"Pooled SaaS API Gateway"`, and `[Slide 04/09`.
  3. Regenerates `drawioStandaloneHashUrl` in BOTH `data/slide_diagrams_atlas.json` and
     `js/diagrams_atlas_data.js` for all 12 canonical diagram IDs via `encode_drawio_self_contained_hash()`.
  4. Runs FULL `scripts/render_pptx_preview.py` (without `--slides`) across ALL 12 decks AFTER
     the final `.pptx` write so every `slide_NN.png` has `mtime >= pptx mtime`.
  5. Copies refreshed `BARE_MIN_12` previews into `slides/static_renders/bare-minimum-12slide-editable-2way/`
     and updates `diagrams/compendium/animated/anim-slide-{10,17,23,29,32}.gif` via ImageMagick `magick`.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

sys.dont_write_bytecode = True

SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPTS_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.slide_drawio_2way_registry import (  # noqa: E402
    BARE_MIN_12_SLIDE_MAP,
    encode_drawio_self_contained_hash,
)

DIAGRAMS_DIR = ROOT_DIR / "diagrams"
SLIDES_DIR = ROOT_DIR / "slides"
BM12_PATH = SLIDES_DIR / "geap-bare-minimum-12slide-architecture-deck.pptx"
BUNDLE_PATH = Path(tempfile.gettempdir()) / "ge_blogs_ws1_ws5_slides_bundle.json"

SLIDE_NUM_TO_DIAG_ID: Dict[int, str] = {v: k for k, v in BARE_MIN_12_SLIDE_MAP.items()}

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
ET.register_namespace("a", NS["a"])
ET.register_namespace("r", NS["r"])
ET.register_namespace("p", NS["p"])

TEXT_CLEANUPS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"▶\s*4-State Hybrid\s*&\s*Draw\.io\s*↗"), "Edit in Draw.io ↗"),
    (re.compile(r"▶\s*Edit in Draw\.io\s*↗"), "Edit in Draw.io ↗"),
    (re.compile(r"✏️\s*Edit in Draw\.io\s*↗"), "Edit in Draw.io ↗"),
    (re.compile(r"🔗\s*Edit in Draw\.io\s*↗"), "Edit in Draw.io ↗"),
    (re.compile(r"▶\s*"), "→ "),
    (re.compile(r"✅\s*"), "✓ "),
    (re.compile(r"❌\s*"), "✕ "),
    (re.compile(r"⚡\s*"), ""),
    (re.compile(r"🛡️\s*|🛡\s*"), ""),
    (re.compile(r"⚙️\s*|⚙\s*"), ""),
    (re.compile(r"🌐\s*"), ""),
    (re.compile(r"🔒\s*|🔑\s*|🔄\s*|🔐\s*|🔍\s*|📊\s*|✦\s*|🔗\s*|✏️\s*|✏\s*"), ""),
    (re.compile(r"❖"), "GW"),
    (re.compile(r"\uFE0F"), ""),
    (re.compile(r"Gemini\s+3\.8", re.I), "Gemini 2.5"),
]

# Exact verified downstream splice table across decks #2-#12:
# (key, rel_pptx, total_slides, [(target_slide, bm12_slide, footer_section_label), ...])
DOWNSTREAM_SPLICE_SPECS: List[Tuple[str, str, int, List[Tuple[int, int, str]]]] = [
    ("WS1", "slides/ws1-12slide-visual-deck.pptx", 10, [
        (4, 1, "PART 1 (WS1)"),
        (5, 2, "PART 1 (WS1)"),
    ]),
    ("WS2", "slides/ws2-12slide-visual-deck.pptx", 8, [
        (3, 3, "PART 2 (WS2)"),
        (4, 4, "PART 2 (WS2)"),
        (5, 5, "PART 2 (WS2)"),
    ]),
    ("WS3", "slides/ws3-12slide-visual-deck.pptx", 7, [
        (3, 6, "PART 3 (WS3)"),
        (4, 7, "PART 3 (WS3)"),
    ]),
    ("WS4", "slides/ws4-12slide-visual-deck.pptx", 9, [
        (3, 8, "PART 4 (WS4)"),
        (5, 9, "PART 4 (WS4)"),
    ]),
    ("WS5", "slides/ws5-12slide-visual-deck.pptx", 9, [
        (3, 10, "PART 5 (WS5)"),
        (4, 11, "PART 5 (WS5)"),
        (5, 12, "PART 5 (WS5)"),
    ]),
    ("WS1_EXEC", "slides/ws1-executive-architecture-23slide-deck.pptx", 11, [
        (5, 1, "PART 1 (WS1)"),
        (6, 2, "PART 1 (WS1)"),
    ]),
    ("WS2_EXEC", "slides/ws2-executive-architecture-10slide-deck.pptx", 10, [
        (4, 3, "PART 2 (WS2)"),
        (5, 4, "PART 2 (WS2)"),
        (6, 5, "PART 2 (WS2)"),
    ]),
    ("WS3_EXEC", "slides/ws3-executive-architecture-10slide-deck.pptx", 10, [
        (4, 6, "PART 3 (WS3)"),
        (5, 7, "PART 3 (WS3)"),
    ]),
    ("WS4_EXEC", "slides/ws4-executive-architecture-10slide-deck.pptx", 10, [
        (4, 8, "PART 4 (WS4)"),
        (5, 9, "PART 4 (WS4)"),
    ]),
    ("WS5_EXEC", "slides/ws5-executive-architecture-10slide-deck.pptx", 10, [
        (4, 10, "PART 5 (WS5)"),
        (5, 11, "PART 5 (WS5)"),
        (6, 12, "PART 5 (WS5)"),
    ]),
    ("ATLAS", "slides/saas-10-visual-verification-atlas-16slide-deck.pptx", 17, [
        (3, 11, "10-SAAS ATLAS"),
    ]),
]


def build_drawio_viewer_url(diag_id: str) -> str:
    xml_path = DIAGRAMS_DIR / f"{diag_id}.drawio"
    xml_str = xml_path.read_text(encoding="utf-8")
    h = encode_drawio_self_contained_hash(xml_str)
    return (
        f"https://viewer.diagrams.net/?highlight=1a73e8&edit=_blank&layers=1&nav=1"
        f"&title={diag_id}.drawio#{h}"
    )


def build_drawio_standalone_app_url(diag_id: str) -> str:
    xml_path = DIAGRAMS_DIR / f"{diag_id}.drawio"
    xml_str = xml_path.read_text(encoding="utf-8")
    h = encode_drawio_self_contained_hash(xml_str)
    return f"https://app.diagrams.net/?splash=0&ui=kennedy&title={diag_id}.drawio#{h}"


def clean_slide_xml_text(xml_bytes: bytes, target_slide: int | None = None, total_slides: int | None = None, section_label: str | None = None) -> bytes:
    root = ET.fromstring(xml_bytes)
    for t_el in root.findall(".//a:t", NS):
        txt = t_el.text
        if not txt:
            continue
        new_txt = txt
        for pat, rep in TEXT_CLEANUPS:
            new_txt = pat.sub(rep, new_txt)
        if target_slide is not None and total_slides is not None and "[Slide " in new_txt:
            if section_label:
                new_txt = re.sub(
                    r"\[Slide\s+\d+/\d+\s*•[^\]]*\]",
                    f"[Slide {target_slide:02d}/{total_slides:02d} • {section_label}]",
                    new_txt,
                )
            else:
                new_txt = re.sub(
                    r"\[Slide\s+\d+/\d+",
                    f"[Slide {target_slide:02d}/{total_slides:02d}",
                    new_txt,
                )
        if new_txt != txt:
            t_el.text = new_txt
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_slide_rels_drawio_link(rels_bytes: bytes, viewer_url: str) -> bytes:
    ET.register_namespace("", NS["rel"])
    root = ET.fromstring(rels_bytes)
    found_rid3 = False
    for rel in root.findall("rel:Relationship", NS):
        rid = rel.attrib.get("Id", "")
        rtype = rel.attrib.get("Type", "")
        if rtype.endswith("/hyperlink") and (rid == "rId3" or "diagrams.net" in rel.attrib.get("Target", "")):
            rel.attrib["Target"] = viewer_url
            rel.attrib["TargetMode"] = "External"
            if rid == "rId3":
                found_rid3 = True
    if not found_rid3:
        el = ET.SubElement(
            root,
            f"{{{NS['rel']}}}Relationship",
            {
                "Id": "rId3",
                "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
                "Target": viewer_url,
                "TargetMode": "External",
            },
        )
        _ = el
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def rewrite_pptx_zip(pptx_path: Path, replacements: Dict[str, bytes]) -> None:
    tmp_path = pptx_path.with_suffix(".pptx.tmp")
    with zipfile.ZipFile(pptx_path, "r") as zin, zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = replacements.get(info.filename, zin.read(info.filename))
            zout.writestr(info, data)
    os.replace(tmp_path, pptx_path)


def update_bm12(bundle: Dict[str, dict], viewer_urls: Dict[str, str]) -> Dict[int, Tuple[bytes, str]]:
    print("=== 1. Updating BARE_MIN_12 (S01..S12) ===")
    bm_replacements: Dict[str, bytes] = {}
    final_bm_slides: Dict[int, Tuple[bytes, str]] = {}

    with zipfile.ZipFile(BM12_PATH, "r") as zf:
        for snum in range(1, 13):
            diag_id = SLIDE_NUM_TO_DIAG_ID[snum]
            slide_part = f"ppt/slides/slide{snum}.xml"
            rels_part = f"ppt/slides/_rels/slide{snum}.xml.rels"
            v_url = viewer_urls[diag_id]

            if diag_id in bundle:
                raw_xml = bundle[diag_id]["slideXml"].encode("utf-8")
            else:
                raw_xml = clean_slide_xml_text(zf.read(slide_part))

            # Defensive check: zero 'h="0"' on custGeom paths
            assert 'h="0"' not in raw_xml.decode("utf-8"), f"Zero-height path found in BM12 S{snum:02d}"
            bm_replacements[slide_part] = raw_xml
            bm_replacements[rels_part] = update_slide_rels_drawio_link(zf.read(rels_part), v_url)
            final_bm_slides[snum] = (raw_xml, v_url)
            print(f"  BM12 S{snum:02d} ({diag_id}): xml={len(raw_xml):,}B, urlLen={len(v_url):,}")

    rewrite_pptx_zip(BM12_PATH, bm_replacements)
    return final_bm_slides


def update_downstream_decks(final_bm_slides: Dict[int, Tuple[bytes, str]]) -> List[Path]:
    print("\n=== 2. Splicing Updated Diagram Slides into Decks #2–#12 ===")
    touched: List[Path] = [BM12_PATH]
    for key, rel_pptx, total_slides, splices in DOWNSTREAM_SPLICE_SPECS:
        pptx_path = ROOT_DIR / rel_pptx
        replacements: Dict[str, bytes] = {}
        with zipfile.ZipFile(pptx_path, "r") as zf:
            for tgt_snum, bm_snum, sec_label in splices:
                src_xml, v_url = final_bm_slides[bm_snum]
                patched_xml = clean_slide_xml_text(src_xml, tgt_snum, total_slides, sec_label)
                # Ensure target footer badge is present
                assert f"[Slide {tgt_snum:02d}/{total_slides:02d}" in patched_xml.decode("utf-8"), (
                    f"Missing footer badge [Slide {tgt_snum:02d}/{total_slides:02d} in {key} S{tgt_snum:02d}"
                )
                slide_part = f"ppt/slides/slide{tgt_snum}.xml"
                rels_part = f"ppt/slides/_rels/slide{tgt_snum}.xml.rels"
                replacements[slide_part] = patched_xml
                replacements[rels_part] = update_slide_rels_drawio_link(zf.read(rels_part), v_url)
            # Also clean 🔗 emoji on WS4 lean S04 (keeping viewer.diagrams.net, Pooled SaaS API Gateway, [Slide 04/09)
            if key == "WS4":
                s4_part = "ppt/slides/slide4.xml"
                replacements[s4_part] = clean_slide_xml_text(zf.read(s4_part))
        rewrite_pptx_zip(pptx_path, replacements)
        touched.append(pptx_path)
        print(f"  Updated {key:8s} ({pptx_path.name}): spliced {len(splices)} slides")
    return touched


def update_atlas_json_and_js() -> None:
    print("\n=== 3. Regenerating Atlas #R Payloads (JSON <-> JS Parity) ===")
    atlas_json_path = ROOT_DIR / "data" / "slide_diagrams_atlas.json"
    atlas_js_path = ROOT_DIR / "js" / "diagrams_atlas_data.js"
    atlas = json.loads(atlas_json_path.read_text(encoding="utf-8"))
    app_urls = {diag_id: build_drawio_standalone_app_url(diag_id) for diag_id in BARE_MIN_12_SLIDE_MAP}
    viewer_urls = {diag_id: build_drawio_viewer_url(diag_id) for diag_id in BARE_MIN_12_SLIDE_MAP}
    updated = 0
    for item in atlas.get("items", []):
        did = item.get("diagramId") or item.get("id") or ""
        if did in app_urls:
            item["drawioStandaloneHashUrl"] = app_urls[did]
            if "drawioViewerHashUrl" in item:
                item["drawioViewerHashUrl"] = viewer_urls[did]
            updated += 1
    serialized = json.dumps(atlas, indent=2, ensure_ascii=False) + "\n"
    atlas_json_path.write_text(serialized, encoding="utf-8")
    atlas_js_path.write_text(f"// Auto-synced from data/slide_diagrams_atlas.json\nwindow.SLIDE_DIAGRAMS_ATLAS = {serialized.rstrip()};\n", encoding="utf-8")
    print(f"  Updated {updated} canonical diagram #R links in data/slide_diagrams_atlas.json & js/diagrams_atlas_data.js")


def rerender_all_previews_and_static(decks: List[Path]) -> None:
    print("\n=== 4. Re-Rendering FULL Previews (No --slides) Across All 12 Decks ===")
    render_script = SCRIPTS_DIR / "render_pptx_preview.py"
    for pptx_path in decks:
        proc = subprocess.run(
            [sys.executable, "-B", str(render_script), str(pptx_path)],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=180,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"render_pptx_preview.py failed on {pptx_path.name}:\n{proc.stdout}\n{proc.stderr}")
        print(f"  Rendered full previews: {pptx_path.name}")

    # Copy refreshed BM12 slide_01..12.png into slides/static_renders/bare-minimum-12slide-editable-2way/
    bm_prev_dir = SLIDES_DIR / "previews" / BM12_PATH.stem
    static_dir = SLIDES_DIR / "static_renders" / "bare-minimum-12slide-editable-2way"
    if static_dir.is_dir():
        for i in range(1, 13):
            src = bm_prev_dir / f"slide_{i:02d}.png"
            dst = static_dir / f"slide_{i:02d}.png"
            if src.is_file():
                shutil.copy2(src, dst)
        print(f"  Refreshed 12 static renders in {static_dir.relative_to(ROOT_DIR)}")

    # Refresh stale animated GIFs for WS1-WS5 using ImageMagick `magick`
    anim_map = {
        "anim-slide-10.gif": DIAGRAMS_DIR / "ws1-5hop-governance-baseline.drawio.png",
        "anim-slide-17.gif": DIAGRAMS_DIR / "ws2-pattern-a-pooled.drawio.png",
        "anim-slide-23.gif": DIAGRAMS_DIR / "ws3-pattern-b-silo.drawio.png",
        "anim-slide-29.gif": DIAGRAMS_DIR / "ws4-pattern-c-hybrid.drawio.png",
        "anim-slide-32.gif": DIAGRAMS_DIR / "ws5-decision-tree-and-triad.drawio.png",
    }
    magick_bin = shutil.which("magick") or shutil.which("convert")
    anim_dir = DIAGRAMS_DIR / "compendium" / "animated"
    if magick_bin and anim_dir.is_dir():
        for gif_name, src_png in anim_map.items():
            dst_gif = anim_dir / gif_name
            if dst_gif.exists() and src_png.is_file():
                subprocess.run(
                    [magick_bin, str(src_png), "-resize", "1280x720!", "-layers", "Optimize", str(dst_gif)],
                    check=True,
                    capture_output=True,
                )
        print("  Refreshed 5 animated preview GIFs via ImageMagick")


def main() -> None:
    if not BUNDLE_PATH.is_file():
        raise FileNotFoundError(f"Missing slide bundle {BUNDLE_PATH}. Run node scripts/build_ws1_to_ws5_canonical_diagrams.mjs first.")
    bundle = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    viewer_urls = {diag_id: build_drawio_viewer_url(diag_id) for diag_id in BARE_MIN_12_SLIDE_MAP}
    for did, u in viewer_urls.items():
        if len(u) > 20000:
            raise RuntimeError(f"Viewer #R URL unexpectedly large for {did}: {len(u)} bytes")
    final_bm = update_bm12(bundle, viewer_urls)
    touched_decks = update_downstream_decks(final_bm)
    update_atlas_json_and_js()
    rerender_all_previews_and_static(touched_decks)
    print("\nALL 12 PPTX DECKS, ATLAS #R PAYLOADS, PREVIEWS & STATIC RENDERS UPDATED SUCCESSFULLY.")


if __name__ == "__main__":
    main()
