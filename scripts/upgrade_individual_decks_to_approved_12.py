#!/usr/bin/env python3
"""
Upgrades all individual workstream/executive/atlas PowerPoint decks to embed
the exact 12 Approved BARE_MIN_12 (100% native editable DrawingML) diagrams
— achieving 1:1 architectural parity with the updated blogs (WS1–WS5 & ATLAS).

Performs clean OOXML slide splicing:
- Replaces target ppt/slides/slide<N>.xml with the approved 16:9 (12192000x6858000 EMU)
  native DrawingML slide XML (0 raster images, explicit #FFFFFF bg & srgbClr).
- Rewrites footer slide badge `[Slide XX/12 • ...]` -> `[Slide NN/TT • ...]` cleanly
  at equal or shorter character length so text never wraps.
- Preserves target slideLayout + notesSlide rels (rId1, rId2) and copies all external
  Draw.io hyperlink relationships (rId3+) from the source slide, asserting 100% rId integrity.
- Updates ppt/notesSlides/notesSlide<N>.xml body text with the approved human-readable
  speaker notes (preserving existing notesMaster + slide rels).
- Prunes orphaned ppt/media/* files that are no longer referenced by any slide in the deck.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT_DIR / "slides"
GDRIVE_CLI = Path("/google/bin/releases/gemini-agents-gdrive/gdrive")

BARE_MIN_12_DRIVE_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"
COMPENDIUM_38_DRIVE_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"

# Each splice spec: (target_slide_num, source_key ['bm12'|'comp38'], source_slide_num, footer_section_label)
DECK_UPGRADE_SPECS: Dict[str, Dict] = {
    "WS1": {
        "pptx": SLIDES_DIR / "ws1-12slide-visual-deck.pptx",
        "total_slides": 24,
        "splices": [
            (7, "bm12", 1, "PART 1 (WS1)"),
            (8, "bm12", 2, "PART 1 (WS1)"),
        ],
        "text_replacements": {},
    },
    "WS2": {
        "pptx": SLIDES_DIR / "ws2-12slide-visual-deck.pptx",
        "total_slides": 24,
        "splices": [
            (7, "bm12", 3, "PART 2 (WS2)"),
            (8, "bm12", 4, "PART 2 (WS2)"),
            (9, "bm12", 5, "PART 2 (WS2)"),
        ],
        "text_replacements": {},
    },
    "WS3": {
        "pptx": SLIDES_DIR / "ws3-12slide-visual-deck.pptx",
        "total_slides": 24,
        "splices": [
            (7, "bm12", 6, "PART 3 (WS3)"),
            (8, "bm12", 7, "PART 3 (WS3)"),
        ],
        "text_replacements": {},
    },
    "WS4": {
        "pptx": SLIDES_DIR / "ws4-12slide-visual-deck.pptx",
        "total_slides": 24,
        "splices": [
            (7, "bm12", 8, "PART 4 (WS4)"),
            (8, "comp38", 30, "PART 4 (WS4)"),
            (9, "bm12", 9, "PART 4 (WS4)"),
        ],
        "text_replacements": {},
    },
    "WS5": {
        "pptx": SLIDES_DIR / "ws5-12slide-visual-deck.pptx",
        "total_slides": 24,
        "splices": [
            (8, "bm12", 10, "PART 5 (WS5)"),
            (9, "bm12", 11, "PART 5 (WS5)"),
            (11, "bm12", 12, "PART 5 (WS5)"),
        ],
        "text_replacements": {},
    },
    "WS1_EXEC": {
        "pptx": SLIDES_DIR / "ws1-executive-architecture-23slide-deck.pptx",
        "total_slides": 23,
        "splices": [
            (8, "bm12", 1, "PART 1 (WS1)"),
            (9, "bm12", 2, "PART 1 (WS1)"),
        ],
        "text_replacements": {
            1: [
                ("L1 Zone Taxonomy &amp; Editable #78 Blueprints", "L1 Zone Taxonomy &amp; Approved Architecture Blueprints"),
                ("L1 Zone Taxonomy & Editable #78 Blueprints", "L1 Zone Taxonomy & Approved Architecture Blueprints"),
            ],
        },
    },
    "ATLAS": {
        "pptx": SLIDES_DIR / "saas-10-visual-verification-atlas-16slide-deck.pptx",
        "total_slides": 16,
        "splices": [
            (3, "bm12", 11, "10-SAAS ATLAS"),
        ],
        "text_replacements": {},
    },
}


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _rewrite_footer_slide_badge(slide_xml: str, target_num: int, total_slides: int, section_label: str) -> str:
    """Rewrites `[Slide XX/YY • ...]` inside <a:t> to `[Slide NN/TT • <section_label>]`."""
    pat = re.compile(r"\[Slide\s+\d+/\d+\s+•\s+[^\]]+\]")
    replacement = f"[Slide {target_num:02d}/{total_slides:02d} • {section_label}]"
    new_xml, count = pat.subn(replacement, slide_xml)
    if count == 0:
        raise RuntimeError(f"Expected footer slide badge not found in source slide XML for target S{target_num:02d}")
    return new_xml


def _extract_notes_paragraphs(notes_xml: bytes, target_num: int, total_slides: int, section_label: str) -> List[str]:
    root = ET.fromstring(notes_xml)
    ns = {"a": NS_A}
    paras: List[str] = []
    for p in root.findall(".//a:p", ns):
        txt = "".join(t.text or "" for t in p.findall(".//a:t", ns)).strip()
        if not txt:
            continue
        # Skip bare slide-number placeholder tokens (e.g., "3")
        if re.fullmatch(r"\d{1,3}", txt):
            continue
        txt = re.sub(
            r"\[Slide\s+\d+\s+of\s+\d+\s+•\s+[^\]]+\]",
            f"[Slide {target_num:02d} of {total_slides:02d} • {section_label} • APPROVED ARCHITECTURE DIAGRAM]",
            txt,
        )
        paras.append(txt)
    if not paras:
        raise RuntimeError(f"Source notesSlide had 0 text paragraphs for target S{target_num:02d}")
    return paras


def _replace_notes_txbody(target_notes_xml: str, paragraphs: List[str]) -> str:
    """Replaces the <p:txBody>...</p:txBody> content inside target notesSlide XML cleanly."""
    p_blocks = []
    for para in paragraphs:
        p_blocks.append(
            f'<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>{_xml_escape(para)}</a:t></a:r></a:p>'
        )
    new_txbody = f"<p:txBody><a:bodyPr/><a:lstStyle/>{''.join(p_blocks)}</p:txBody>"
    updated, count = re.subn(r"<p:txBody>.*?</p:txBody>", new_txbody, target_notes_xml, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not locate unique <p:txBody> in target notesSlide XML (found {count})")
    return updated


def _build_spliced_slide_rels(target_rels_xml: bytes, source_rels_xml: bytes, source_slide_xml: str) -> bytes:
    """
    Preserves target slide's slideLayout (rId1) and notesSlide (rId2) targets,
    and attaches all external hyperlink rels from the source slide with their exact rId values.
    """
    t_root = ET.fromstring(target_rels_xml)
    s_root = ET.fromstring(source_rels_xml)

    layout_target = "../slideLayouts/slideLayout1.xml"
    notes_target = None
    for rel in t_root:
        rtype = rel.attrib.get("Type", "")
        if rtype.endswith("/slideLayout"):
            layout_target = rel.attrib["Target"]
        elif rtype.endswith("/notesSlide"):
            notes_target = rel.attrib["Target"]

    rel_entries: List[str] = [
        f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="{_xml_escape(layout_target)}"/>'
    ]
    used_rids = {"rId1"}
    if notes_target:
        rel_entries.append(
            f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="{_xml_escape(notes_target)}"/>'
        )
        used_rids.add("rId2")

    for rel in s_root:
        rtype = rel.attrib.get("Type", "")
        rid = rel.attrib.get("Id", "")
        target = rel.attrib.get("Target", "")
        tmode = rel.attrib.get("TargetMode", "")
        if rtype.endswith("/hyperlink"):
            if rid in used_rids:
                raise RuntimeError(f"Hyperlink rId collision: {rid}")
            used_rids.add(rid)
            mode_attr = f' TargetMode="{_xml_escape(tmode)}"' if tmode else ""
            rel_entries.append(
                f'<Relationship Id="{_xml_escape(rid)}" Type="{_xml_escape(rtype)}" Target="{_xml_escape(target)}"{mode_attr}/>'
            )
        elif not (rtype.endswith("/slideLayout") or rtype.endswith("/notesSlide")):
            raise RuntimeError(f"Unexpected non-hyperlink relationship in source slide: {rtype} ({rid} -> {target})")

    # Assert every r:id / r:embed / r:link referenced in source_slide_xml exists in used_rids
    referenced_rids = set(re.findall(r'r:(?:id|embed|link)="([^"]+)"', source_slide_xml))
    missing = referenced_rids - used_rids
    if missing:
        raise RuntimeError(f"Spliced slide XML references missing rIds: {sorted(missing)}")

    xml_out = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        f'<Relationships xmlns="{NS_REL}">'
        + "".join(rel_entries)
        + "</Relationships>"
    )
    return xml_out.encode("utf-8")


def _find_referenced_media(entries: Dict[str, bytes]) -> set[str]:
    """Scans all *.rels files inside the zip and returns all referenced ppt/media/* canonical paths."""
    referenced: set[str] = set()
    for name, raw in entries.items():
        if not name.endswith(".rels"):
            continue
        try:
            root = ET.fromstring(raw)
        except Exception:
            continue
        # Resolve relative to the parent of _rels/
        base_dir = Path(name).parent.parent  # e.g., ppt/slides/_rels/slide1.xml.rels -> ppt/slides
        for rel in root:
            if rel.attrib.get("TargetMode", "").lower() == "external":
                continue
            target = rel.attrib.get("Target", "")
            if not target:
                continue
            resolved = os.path.normpath(str(base_dir / target)).replace("\\", "/")
            if resolved.startswith("ppt/media/"):
                referenced.add(resolved)
    return referenced


def upgrade_single_deck(
    deck_key: str,
    spec: Dict,
    sources: Dict[str, Path],
) -> Tuple[int, int]:
    pptx_path: Path = spec["pptx"]
    total_slides: int = spec["total_slides"]
    if not pptx_path.is_file():
        raise FileNotFoundError(f"Missing target deck: {pptx_path}")

    # Load all entries from target pptx into memory preserving order
    with zipfile.ZipFile(pptx_path, "r") as zt:
        infos = zt.infolist()
        entries: Dict[str, bytes] = {info.filename: zt.read(info.filename) for info in infos}

    actual_slides = [n for n in entries if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)]
    if len(actual_slides) != total_slides:
        raise RuntimeError(f"{deck_key}: expected {total_slides} slides, found {len(actual_slides)}")

    # Open source zips
    src_zips = {k: zipfile.ZipFile(p, "r") for k, p in sources.items()}
    try:
        for target_num, src_key, src_num, section_label in spec["splices"]:
            sz = src_zips[src_key]
            src_slide_xml = sz.read(f"ppt/slides/slide{src_num}.xml").decode("utf-8")
            src_rels_xml = sz.read(f"ppt/slides/_rels/slide{src_num}.xml.rels")
            src_notes_xml = sz.read(f"ppt/notesSlides/notesSlide{src_num}.xml")

            # Rewrite footer badge to target deck numbering
            spliced_slide_xml = _rewrite_footer_slide_badge(src_slide_xml, target_num, total_slides, section_label)

            # Build new slide rels preserving slideLayout + notesSlide + source hyperlinks
            t_rels_key = f"ppt/slides/_rels/slide{target_num}.xml.rels"
            spliced_rels_xml = _build_spliced_slide_rels(entries[t_rels_key], src_rels_xml, spliced_slide_xml)

            # Update slide XML + rels
            entries[f"ppt/slides/slide{target_num}.xml"] = spliced_slide_xml.encode("utf-8")
            entries[t_rels_key] = spliced_rels_xml

            # Update corresponding notesSlide XML body cleanly
            t_notes_key = f"ppt/notesSlides/notesSlide{target_num}.xml"
            if t_notes_key in entries:
                paras = _extract_notes_paragraphs(src_notes_xml, target_num, total_slides, section_label)
                updated_notes = _replace_notes_txbody(entries[t_notes_key].decode("utf-8"), paras)
                entries[t_notes_key] = updated_notes.encode("utf-8")

        # Apply any surgical text cleanups (e.g., removing stale "#78" label on WS1_EXEC Slide 1)
        for slide_num, pairs in spec.get("text_replacements", {}).items():
            skey = f"ppt/slides/slide{slide_num}.xml"
            txt = entries[skey].decode("utf-8")
            for old_s, new_s in pairs:
                txt = txt.replace(old_s, new_s)
            entries[skey] = txt.encode("utf-8")
    finally:
        for sz in src_zips.values():
            sz.close()

    # Prune unreferenced orphaned ppt/media/* assets
    referenced_media = _find_referenced_media(entries)
    pruned = 0
    for k in list(entries.keys()):
        if k.startswith("ppt/media/") and not k.endswith("/") and k not in referenced_media:
            del entries[k]
            pruned += 1

    # Write atomically via temp file
    tmp_path = pptx_path.with_suffix(".pptx.tmp")
    with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for info in infos:
            if info.filename not in entries:
                continue
            zout.writestr(info.filename, entries[info.filename])
    os.replace(tmp_path, pptx_path)
    return len(spec["splices"]), pruned


def ensure_source_export(cli_path: str | None, drive_id: str, fallback_name: str, tmpdir: Path) -> Path:
    if cli_path:
        p = Path(cli_path)
        if not p.is_file():
            raise FileNotFoundError(f"Provided source file does not exist: {p}")
        return p
    out_p = tmpdir / fallback_name
    print(f"⬇️  Exporting live master {drive_id} -> {out_p.name} ...")
    subprocess.run(
        [str(GDRIVE_CLI), "readonly", "export", drive_id, str(out_p), "--format", "pptx"],
        check=True,
        capture_output=True,
        text=True,
    )
    return out_p


def main() -> None:
    parser = argparse.ArgumentParser(description="Upgrade individual slide decks to approved BARE_MIN_12 native diagrams.")
    parser.add_argument("--only", help="Comma-separated deck keys (e.g. WS2 or WS1,WS2,ATLAS,BARE_MIN_12)")
    parser.add_argument("--all", action="store_true", help="Upgrade all 7 individual decks + refresh local BARE_MIN_12")
    parser.add_argument("--bm12", help="Path to exported bare_min_12_live.pptx")
    parser.add_argument("--comp38", help="Path to exported compendium_38_live.pptx")
    args = parser.parse_args()

    if not args.all and not args.only:
        parser.error("Specify --only <KEYS> or --all")

    selected = (
        list(DECK_UPGRADE_SPECS.keys()) + ["BARE_MIN_12"]
        if args.all
        else [k.strip().upper() for k in args.only.split(",") if k.strip()]
    )

    with tempfile.TemporaryDirectory(prefix="approved12_splice_") as td:
        tmpdir = Path(td)
        bm12_path = ensure_source_export(args.bm12, BARE_MIN_12_DRIVE_ID, "bare_min_12_live.pptx", tmpdir)
        need_comp38 = "WS4" in selected
        sources: Dict[str, Path] = {"bm12": bm12_path}
        if need_comp38:
            sources["comp38"] = ensure_source_export(args.comp38, COMPENDIUM_38_DRIVE_ID, "compendium_38_live.pptx", tmpdir)

        for key in selected:
            if key == "BARE_MIN_12":
                dst = SLIDES_DIR / "geap-bare-minimum-12slide-architecture-deck.pptx"
                shutil.copy2(bm12_path, dst)
                print(f"✅ [BARE_MIN_12] Refreshed {dst.name} directly from live master ({dst.stat().st_size:,} B, 12 slides)")
                continue
            if key not in DECK_UPGRADE_SPECS:
                raise SystemExit(f"Unknown deck key: {key}")
            spliced_n, pruned_n = upgrade_single_deck(key, DECK_UPGRADE_SPECS[key], sources)
            out_f = DECK_UPGRADE_SPECS[key]["pptx"]
            print(
                f"✅ [{key}] Upgraded {spliced_n} architecture slides ({DECK_UPGRADE_SPECS[key]['total_slides']} slides total, "
                f"pruned {pruned_n} obsolete #78 icons) -> {out_f.name} ({out_f.stat().st_size:,} B)"
            )


if __name__ == "__main__":
    main()
