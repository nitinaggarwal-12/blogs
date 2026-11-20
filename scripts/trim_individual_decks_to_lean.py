#!/usr/bin/env python3
"""
Deterministic, idempotent OOXML deck trimmer for the 5 individual Workstream decks
(WS1..WS5) and WS1 Executive deck (WS1_EXEC).

Eliminates:
  - Act Transition divider slides
  - Duplicate legacy L1/UML/L4 wire text walls (replaced by Approved BARE_MIN_12 diagrams)
  - Boring 4-column prose/bullet text-wall slides
  - Empty "Commercial SaaS Proof Pending Interactive Marketplace Trial / SSO" slots

Preserves & renumbers cleanly:
  - 100% native editable DrawingML Approved BARE_MIN_12 diagrams + external Draw.io links
  - Visual problem/flow/decision diagrams, live SQL/KMS/CAS/FinOps code terminals,
    live 2880x1620 ThoughtSpot Cloud Retina screenshots, and color-coded multi-cloud scorecards
  - Clean sequential OOXML parts: slide1..N.xml, notesSlide1..N.xml, _rels,
    presentation.xml, presentation.xml.rels, [Content_Types].xml, docProps/app.xml
  - Pruned unreferenced ppt/media/* assets

Always reads from scratch backups_24slide/ (creating them first if absent) so reruns
are 100% deterministic and idempotent.
"""
from __future__ import annotations

import argparse
import os
import posixpath
import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import lxml.etree as ET

REPO_ROOT = Path("/usr/local/google/home/nitinagga/Documents/blogs")
DEFAULT_BACKUP_DIR = Path(
    "/usr/local/google/home/nitinagga/.gemini/jetski/brain/"
    "2c7fde92-72d4-42ed-90f2-9fb2672c3870/scratch/lean_trim/backups_24slide"
)

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "ep": "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
}

REL_SLIDE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
REL_NOTES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
CT_SLIDE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
CT_NOTES = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"


# Each slide spec is either:
#   int -> slide index from the deck's own backup .pptx
#   ("WS1", int) -> splice slide from another deck's backup .pptx (e.g. WS1 S19 live ThoughtSpot Retina into WS1_EXEC)
DECK_PLANS: Dict[str, Dict] = {
    "WS1": {
        "file": "slides/ws1-12slide-visual-deck.pptx",
        "part_tag": "PART 1 (WS1)",
        "pad_footer": False,
        "keep": [1, 3, 4, 7, 8, 13, 23],
        "text_replacements": {
            3: {
                "TRANSITION TO ACT II ➔ Moving from the threat landscape to concrete architectural patterns and DrawingML topologies": (
                    "NEXT: REFERENCE ARCHITECTURE ➔ Mapping all 5 attack shields directly onto the Shared 5-Hop Control Plane & Token Sequence"
                ),
            },
        },
    },
    "WS2": {
        "file": "slides/ws2-12slide-visual-deck.pptx",
        "part_tag": "PART 2 (WS2)",
        "pad_footer": False,
        "keep": [1, 4, 7, 8, 9, 16, 23],
        "text_replacements": {},
    },
    "WS3": {
        "file": "slides/ws3-12slide-visual-deck.pptx",
        "part_tag": "PART 3 (WS3)",
        "pad_footer": False,
        "keep": [1, 4, 7, 8, 15, 24],
        "text_replacements": {
            4: {
                "▶ 4-State Hybrid & Draw.io ↗": "✏️ Edit in Draw.io ↗",
            },
        },
    },
    "WS4": {
        "file": "slides/ws4-12slide-visual-deck.pptx",
        "part_tag": "PART 4 (WS4)",
        "pad_footer": False,
        "keep": [1, 4, 7, 8, 9, 15, 24],
        "text_replacements": {},
    },
    "WS5": {
        "file": "slides/ws5-12slide-visual-deck.pptx",
        "part_tag": "PART 5 (WS5)",
        "pad_footer": False,
        "keep": [1, 4, 8, 9, 11, 15, 24],
        "text_replacements": {
            5: {
                "▶ 4-State Hybrid & Draw.io ↗": "✏️ Edit in Draw.io ↗",
            },
        },
    },
    "WS1_EXEC": {
        "file": "slides/ws1-executive-architecture-23slide-deck.pptx",
        "part_tag": "PART 1 (WS1)",
        "pad_footer": True,
        "keep": [1, 2, 5, 6, 8, 9, 15, 16, ("WS1", 19), 22],
        "text_replacements": {
            1: {
                "SLIDES 02–04": "SLIDE 02",
                "The Real Problem & Tenant Conflict": "The Real Problem & 5 Stateful Blast Surfaces",
                "Why stateless CRUD isolation fails on stateful AI agents; the margin-vs.-CISO fork; FinVault vs. RetailStream.": (
                    "Why classic stateless REST isolation breaks the moment you deploy stateful multi-turn AI agents."
                ),
                "SLIDES 05–06": "SLIDES 03–04",
                "SLIDES 07–09": "SLIDES 05–06",
                "L1 Zone Taxonomy & Approved Architecture Blueprints": "Approved Architecture Blueprints (Figures 1 & 2)",
                "3-layer security taxonomy → 4 VPC-SC perimeters + full-height editable Draw.io Figures 1 & 2 (Slides 08–09).": (
                    "Full-height 100% native editable Draw.io Figures 1 & 2 (Slides 05–06): 5-Hop Control Plane & Token Sequence."
                ),
                "SLIDES 10–15": "SLIDES 07–08",
                "Process Flow, Day-2 Lock, Wire JWT & 3LO": "Preview Gap Bridges & Empirical Telemetry",
                "~42ms waterfall, 5-actor UML swimlane, KMS kill-switch & single-flight, Hop 1 JWT, 3LO vault & GAP-01..05.": (
                    "GAP-01..05 feature-flagged shims + 20/20 live GCP & 30/30 AWS AgentCore red-team verification receipts."
                ),
                "SLIDES 16–23": "SLIDES 09–10",
                "Live Proofs (ThoughtSpot + 10 MCP), ROI & CTA": "Live ThoughtSpot UI Proof & Executive ROI",
                "GCP+AWS red-team telemetry, live ThoughtSpot Cloud UIs + 9 F-13 commercial slots, 89.1% token savings, and 14-day rollout.": (
                    "Genuine 2880×1620 ThoughtSpot Cloud Retina captures, 89.1% token savings & ~74% lower infrastructure TCO."
                ),
            },
            7: {
                "05 / PROCESS & WIRE": "04 / ENGINEERING READINESS",
            },
            8: {
                "06 / EMPIRICAL PROOFS": "05 / EMPIRICAL PROOFS",
                "Proof Part 1: 100% Live Pass Rate Across GCP Perimeters & AWS AgentCore Federation": (
                    "Live Telemetry Proof: 100% Pass Rate Across GCP Perimeters & AWS AgentCore Federation"
                ),
            },
            9: {
                "ACT IV • PROOF 1": "05 / LIVE 3P UI PROOF",
                "Proof 1: ThoughtSpot Cloud Spotter BI — Commercial Liveboard & Hop 5 RLS Design": (
                    "Live 3P UI Proof: ThoughtSpot Cloud Spotter BI — Commercial Liveboard & Hop 5 RLS"
                ),
                "Google Cloud Architecture Center  •  Workstream 1 of 5  •  Multi-Tenant Agentic AI System (100% Editable DrawingML)": (
                    "GOOGLE CLOUD AI ARCHITECTURE  •  BLOG 1: MULTI-TENANT AGENTIC AI TAXONOMY & 5-HOP BASELINE"
                ),
            },
            10: {
                "07 / ROI & ACTION PLAN": "06 / EXECUTIVE ROI",
            },
        },
    },
}


def ensure_backups(backup_dir: Path) -> None:
    backup_dir.mkdir(parents=True, exist_ok=True)
    for cfg in DECK_PLANS.values():
        live_path = REPO_ROOT / cfg["file"]
        bak_path = backup_dir / live_path.name
        if not bak_path.exists():
            shutil.copy2(live_path, bak_path)


def rewrite_slide_xml(
    xml_bytes: bytes,
    new_idx: int,
    new_total: int,
    pad_footer: bool,
    extra_replacements: Dict[str, str],
) -> bytes:
    root = ET.fromstring(xml_bytes)
    for el in root.findall(".//a:t", NS):
        txt = el.text
        if not txt:
            continue

        # 1. Exact replacements first
        if txt in extra_replacements:
            el.text = extra_replacements[txt]
            txt = el.text
        else:
            for k, v in extra_replacements.items():
                if k in txt:
                    txt = txt.replace(k, v)
                    el.text = txt

        # 2. Strip "ACT I • ", "ACT III • ", "ACT IV • ", "ACT V • " from top pill badges
        if re.match(r"^ACT\s+[IVX]+\s*•\s*", txt):
            txt = re.sub(r"^ACT\s+[IVX]+\s*•\s*", "", txt)
            el.text = txt

        # 3. Rewrite approved diagram footer "[Slide XX/24 • PART Y (WSY)]" or "[Slide XX/23 • ...]"
        if "[Slide " in txt and re.search(r"\[Slide \d+/\d+", txt):
            txt = re.sub(
                r"\[Slide \d+/\d+",
                f"[Slide {new_idx:02d}/{new_total:02d}",
                txt,
            )
            el.text = txt

        # 4. Rewrite bottom-right page number "N / 24" or "NN / 23"
        if re.fullmatch(r"\s*\d{1,2}\s*/\s*2[34]\s*", txt):
            if pad_footer:
                el.text = f"{new_idx:02d} / {new_total:02d}"
            else:
                el.text = f"{new_idx} / {new_total}"

    return ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def rewrite_notes_xml(xml_bytes: bytes, new_idx: int, new_total: int) -> bytes:
    root = ET.fromstring(xml_bytes)
    for el in root.findall(".//a:t", NS):
        txt = el.text
        if not txt:
            continue
        txt = re.sub(r"\[Slide \d+/\d+", f"[Slide {new_idx:02d}/{new_total:02d}", txt)
        txt = re.sub(
            r"\bSlide\s+\d{1,2}\s+(?:of|/)\s+2[34]\b",
            f"Slide {new_idx} of {new_total}",
            txt,
        )
        txt = re.sub(r"\bACT\s+[IVX]+\s*•\s*", "", txt)
        el.text = txt
    return ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def normalize_target(base_part: str, rel_target: str) -> str:
    base_dir = posixpath.dirname(base_part)
    return posixpath.normpath(posixpath.join(base_dir, rel_target))


def trim_deck(key: str, backup_dir: Path) -> Tuple[int, int, int]:
    cfg = DECK_PLANS[key]
    live_path = REPO_ROOT / cfg["file"]
    src_path = backup_dir / live_path.name
    keep_spec = cfg["keep"]
    new_total = len(keep_spec)
    pad_footer = bool(cfg["pad_footer"])
    repl_map = cfg.get("text_replacements", {})

    # Open source backup + any donor backup needed for cross-deck splicing
    zips: Dict[str, zipfile.ZipFile] = {key: zipfile.ZipFile(src_path, "r")}
    try:
        for item in keep_spec:
            if isinstance(item, tuple):
                donor_key = item[0]
                if donor_key not in zips:
                    donor_path = backup_dir / Path(DECK_PLANS[donor_key]["file"]).name
                    zips[donor_key] = zipfile.ZipFile(donor_path, "r")

        base_z = zips[key]
        old_slides = [
            n for n in base_z.namelist() if re.match(r"^ppt/slides/slide\d+\.xml$", n)
        ]
        old_total = len(old_slides)

        # Output zip parts dictionary
        out_parts: Dict[str, bytes] = {}
        media_needed: set[str] = set()
        extra_media: Dict[str, bytes] = {}

        # Copy all non-slide, non-notesSlide, non-media, non-top-level-manifest files verbatim first
        skip_patterns = (
            r"^ppt/slides/slide\d+\.xml$",
            r"^ppt/slides/_rels/slide\d+\.xml\.rels$",
            r"^ppt/notesSlides/notesSlide\d+\.xml$",
            r"^ppt/notesSlides/_rels/notesSlide\d+\.xml\.rels$",
            r"^ppt/media/",
            r"^ppt/presentation\.xml$",
            r"^ppt/_rels/presentation\.xml\.rels$",
            r"^\[Content_Types\]\.xml$",
            r"^docProps/app\.xml$",
        )
        for name in base_z.namelist():
            if any(re.match(pat, name) for pat in skip_patterns):
                continue
            data = base_z.read(name)
            out_parts[name] = data
            # Track media referenced by slideLayouts, slideMasters, notesMasters, theme, etc.
            if name.endswith(".rels"):
                try:
                    rroot = ET.fromstring(data)
                    owner = name.replace("/_rels/", "/").removesuffix(".rels")
                    for rel in rroot.findall("rel:Relationship", NS):
                        if rel.get("TargetMode") == "External":
                            continue
                        t = rel.get("Target", "")
                        if "media/" in t:
                            media_needed.add(normalize_target(owner, t))
                except Exception:
                    pass

        existing_media_names = {
            posixpath.basename(n)
            for n in base_z.namelist()
            if n.startswith("ppt/media/")
        }

        # Build sequential slide1..N and notesSlide1..N
        for new_i, item in enumerate(keep_spec, 1):
            if isinstance(item, tuple):
                donor_key, old_i = item
                donor_z = zips[donor_key]
                is_donor = donor_key != key
            else:
                donor_key, old_i = key, item
                donor_z = base_z
                is_donor = False

            s_old_path = f"ppt/slides/slide{old_i}.xml"
            s_old_rels_path = f"ppt/slides/_rels/slide{old_i}.xml.rels"

            # 1. Slide XML
            s_xml = rewrite_slide_xml(
                donor_z.read(s_old_path),
                new_idx=new_i,
                new_total=new_total,
                pad_footer=pad_footer,
                extra_replacements=repl_map.get(new_i, {}),
            )
            out_parts[f"ppt/slides/slide{new_i}.xml"] = s_xml

            # 2. Slide .rels + referenced notesSlide & media
            old_notes_path: Optional[str] = None
            rels_root = ET.fromstring(donor_z.read(s_old_rels_path))
            for rel in rels_root.findall("rel:Relationship", NS):
                rtype = rel.get("Type", "")
                tmode = rel.get("TargetMode", "")
                target = rel.get("Target", "")
                if tmode == "External":
                    continue
                if rtype == REL_NOTES or "notesSlides/" in target:
                    old_notes_path = normalize_target(s_old_path, target)
                    rel.set("Target", f"../notesSlides/notesSlide{new_i}.xml")
                elif "media/" in target:
                    full_media = normalize_target(s_old_path, target)
                    if is_donor:
                        # Avoid filename collisions with base deck's media
                        orig_base = posixpath.basename(full_media)
                        new_base = f"spliced_{donor_key.lower()}_s{old_i}_{orig_base}"
                        while new_base in existing_media_names:
                            new_base = f"x_{new_base}"
                        existing_media_names.add(new_base)
                        dest_media = f"ppt/media/{new_base}"
                        extra_media[dest_media] = donor_z.read(full_media)
                        rel.set("Target", f"../media/{new_base}")
                    else:
                        media_needed.add(full_media)

            out_parts[f"ppt/slides/_rels/slide{new_i}.xml.rels"] = ET.tostring(
                rels_root, xml_declaration=True, encoding="UTF-8", standalone=True
            )

            # 3. NotesSlide XML + .rels
            if old_notes_path is None:
                old_notes_path = f"ppt/notesSlides/notesSlide{old_i}.xml"
            old_notes_rels_path = (
                f"ppt/notesSlides/_rels/{posixpath.basename(old_notes_path)}.rels"
            )
            if old_notes_path in donor_z.namelist():
                n_xml = rewrite_notes_xml(
                    donor_z.read(old_notes_path), new_idx=new_i, new_total=new_total
                )
                out_parts[f"ppt/notesSlides/notesSlide{new_i}.xml"] = n_xml
            if old_notes_rels_path in donor_z.namelist():
                nrels_root = ET.fromstring(donor_z.read(old_notes_rels_path))
                for rel in nrels_root.findall("rel:Relationship", NS):
                    rtype = rel.get("Type", "")
                    if rtype == REL_SLIDE or "slides/slide" in rel.get("Target", ""):
                        rel.set("Target", f"../slides/slide{new_i}.xml")
                out_parts[f"ppt/notesSlides/_rels/notesSlide{new_i}.xml.rels"] = (
                    ET.tostring(
                        nrels_root,
                        xml_declaration=True,
                        encoding="UTF-8",
                        standalone=True,
                    )
                )

        # Copy ONLY referenced base media + any spliced donor media
        for mpath in sorted(media_needed):
            if mpath in base_z.namelist():
                out_parts[mpath] = base_z.read(mpath)
        for mpath, mbytes in extra_media.items():
            out_parts[mpath] = mbytes

        # 4. Rebuild ppt/_rels/presentation.xml.rels & ppt/presentation.xml
        pres_rels_root = ET.fromstring(base_z.read("ppt/_rels/presentation.xml.rels"))
        used_rids: set[int] = set()
        for rel in list(pres_rels_root.findall("rel:Relationship", NS)):
            if rel.get("Type") == REL_SLIDE or re.match(
                r"^slides/slide\d+\.xml$", rel.get("Target", "")
            ):
                pres_rels_root.remove(rel)
            else:
                m = re.fullmatch(r"rId(\d+)", rel.get("Id", ""))
                if m:
                    used_rids.add(int(m.group(1)))

        next_rid = max(used_rids, default=0) + 1
        slide_rids: List[str] = []
        for new_i in range(1, new_total + 1):
            rid = f"rId{next_rid}"
            next_rid += 1
            slide_rids.append(rid)
            ET.SubElement(
                pres_rels_root,
                f"{{{NS['rel']}}}Relationship",
                Id=rid,
                Type=REL_SLIDE,
                Target=f"slides/slide{new_i}.xml",
            )
        out_parts["ppt/_rels/presentation.xml.rels"] = ET.tostring(
            pres_rels_root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        pres_root = ET.fromstring(base_z.read("ppt/presentation.xml"))
        sld_id_lst = pres_root.find("p:sldIdLst", NS)
        if sld_id_lst is None:
            raise RuntimeError(f"{key}: missing p:sldIdLst in presentation.xml")
        for child in list(sld_id_lst):
            sld_id_lst.remove(child)
        for offset, rid in enumerate(slide_rids):
            el = ET.SubElement(sld_id_lst, f"{{{NS['p']}}}sldId")
            el.set("id", str(256 + offset))
            el.set(f"{{{NS['r']}}}id", rid)
        out_parts["ppt/presentation.xml"] = ET.tostring(
            pres_root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        # 5. Rebuild [Content_Types].xml
        ct_root = ET.fromstring(base_z.read("[Content_Types].xml"))
        for ov in list(ct_root.findall("ct:Override", NS)):
            pn = ov.get("PartName", "")
            if re.match(r"^/ppt/slides/slide\d+\.xml$", pn) or re.match(
                r"^/ppt/notesSlides/notesSlide\d+\.xml$", pn
            ):
                ct_root.remove(ov)
        # Ensure png/jpeg defaults exist
        existing_exts = {
            d.get("Extension", "").lower() for d in ct_root.findall("ct:Default", NS)
        }
        for ext, ctype in (("png", "image/png"), ("jpg", "image/jpeg"), ("jpeg", "image/jpeg")):
            if ext not in existing_exts and any(
                k.lower().endswith(f".{ext}") for k in out_parts
            ):
                ET.SubElement(
                    ct_root,
                    f"{{{NS['ct']}}}Default",
                    Extension=ext,
                    ContentType=ctype,
                )
        for new_i in range(1, new_total + 1):
            ET.SubElement(
                ct_root,
                f"{{{NS['ct']}}}Override",
                PartName=f"/ppt/slides/slide{new_i}.xml",
                ContentType=CT_SLIDE,
            )
            if f"ppt/notesSlides/notesSlide{new_i}.xml" in out_parts:
                ET.SubElement(
                    ct_root,
                    f"{{{NS['ct']}}}Override",
                    PartName=f"/ppt/notesSlides/notesSlide{new_i}.xml",
                    ContentType=CT_NOTES,
                )
        out_parts["[Content_Types].xml"] = ET.tostring(
            ct_root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        # 6. Update docProps/app.xml if present
        if "docProps/app.xml" in base_z.namelist():
            app_root = ET.fromstring(base_z.read("docProps/app.xml"))
            slides_el = app_root.find("ep:Slides", NS)
            if slides_el is not None:
                slides_el.text = str(new_total)
            notes_el = app_root.find("ep:Notes", NS)
            if notes_el is not None:
                notes_el.text = str(new_total)
            out_parts["docProps/app.xml"] = ET.tostring(
                app_root, xml_declaration=True, encoding="UTF-8", standalone=True
            )

        # Write atomically
        tmp_path = live_path.with_suffix(".pptx.tmp")
        with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED) as oz:
            for part_name in sorted(out_parts.keys()):
                oz.writestr(part_name, out_parts[part_name])
        os.replace(tmp_path, live_path)
        return old_total, new_total, live_path.stat().st_size
    finally:
        for z in zips.values():
            z.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Trim WS1..WS5 & WS1_EXEC decks to lean visual slides.")
    parser.add_argument(
        "--only",
        default="",
        help="Comma-separated subset of keys (e.g. WS1 or WS2,WS3,WS4,WS5,WS1_EXEC). Defaults to all 6.",
    )
    parser.add_argument(
        "--backup-dir",
        default=str(DEFAULT_BACKUP_DIR),
        help="Directory holding the 24/23-slide clean backups.",
    )
    args = parser.parse_args()
    backup_dir = Path(args.backup_dir)
    ensure_backups(backup_dir)

    keys = (
        [k.strip() for k in args.only.split(",") if k.strip()]
        if args.only.strip()
        else list(DECK_PLANS.keys())
    )
    for k in keys:
        if k not in DECK_PLANS:
            print(f"ERROR: unknown deck key {k}", file=sys.stderr)
            return 2
        old_n, new_n, nbytes = trim_deck(k, backup_dir)
        print(f"✅ Trimmed {k:8s}: {old_n:2d} → {new_n:2d} slides ({nbytes:,} bytes) -> {DECK_PLANS[k]['file']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
