#!/usr/bin/env python3
"""
Deterministic, idempotent OOXML splicer that synchronizes ALL live verified
2880x1620 Retina BEFORE -> AFTER proof slides into:
  1. WS1..WS5 Primary Lean Visual Decks (`slides/ws{1..5}-12slide-visual-deck.pptx`):
       - WS1: 7 -> 9 slides (inserts WS1-BA-01 Model Armor + WS1-BA-02 Cloud Armor WAF before S09 Scorecard)
       - WS2: 7 -> 8 slides (inserts WS2-BA-01 BigQuery Pattern A RLS before S08 Scorecard)
       - WS3: 6 -> 7 slides (inserts WS3-BA-01 BigQuery CMEK Kill-Switch before S07 Scorecard)
       - WS4: 7 -> 9 slides (inserts WS4-BA-01 Jira '3LO' + WS4-BA-02 Hub->Spoke VPC before S09 Scorecard)
       - WS5: 7 -> 9 slides (inserts WS5-BA-01 ThoughtSpot BI + WS5-BA-02 Connectors->Cloud Run before S09 Scorecard)
     Preserves every existing BARE_MIN_12 native DrawingML diagram at its EXACT original slide index!
  2. 16-Slide Live Visual Verification Atlas (`slides/saas-10-visual-verification-atlas-16slide-deck.pptx`):
       - Splices BARE_MIN_12 S11 (native DrawingML Multi-Cloud A2A/MCP Bridge) into S03,
         keeping all 9 live Retina proof slides (17/17 verified PNGs) on S05..S13!
"""
from __future__ import annotations

import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

import lxml.etree as ET

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.assemble_exec_narrative_decks import (  # noqa: E402
    BARE_MIN_PATH,
    NS,
    SLIDES_DIR,
    assemble_deck,
)

DRAFTS_DIR = SLIDES_DIR / "_ba_drafts"
DONOR_PPTX = DRAFTS_DIR / "live_ba_proof_donors.pptx"
ATLAS_DRAFT = DRAFTS_DIR / "atlas_16slide_draft.pptx"
LEAN_BACKUPS_DIR = Path(
    str(Path.home() / ".gemini/jetski/brain") + "/"
    "2c7fde92-72d4-42ed-90f2-9fb2672c3870/scratch/lean_pre_ba_backups"
)


def _slide_count(pptx_path: Path) -> int:
    with zipfile.ZipFile(pptx_path, "r") as zf:
        return sum(1 for n in zf.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n))


def _ensure_clean_lean_backup(live_path: Path, expected_base_slides: int) -> Path:
    LEAN_BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    bak = LEAN_BACKUPS_DIR / live_path.name
    if not bak.exists():
        cur_n = _slide_count(live_path)
        if cur_n != expected_base_slides:
            raise RuntimeError(
                f"Cannot create clean pre-BA backup of {live_path.name}: "
                f"expected {expected_base_slides} base slides, found {cur_n}"
            )
        shutil.copy2(live_path, bak)
    return bak


def _rewrite_lean_footers_exact(pptx_path: Path, total: int, pad_num: bool = False) -> None:
    """Ensures every slide's bottom footer fraction (`k / N` or `0k / 0N`) and `[Slide 0k/0N` matches `total`."""
    tmp = pptx_path.with_suffix(".tmp.pptx")
    with zipfile.ZipFile(pptx_path, "r") as zin, zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            m = re.match(r"ppt/slides/slide(\d+)\.xml$", info.filename)
            if m:
                snum = int(m.group(1))
                root = ET.fromstring(data)
                for sp in root.findall(".//p:sp", NS):
                    off = sp.find(".//a:xfrm/a:off", NS)
                    y_emu = int(off.get("y", "0")) if off is not None else 0
                    for t_el in sp.findall(".//a:t", NS):
                        tv = t_el.text or ""
                        if not tv:
                            continue
                        if "[Slide " in tv and re.search(r"\[Slide\s+\d+/\d+", tv):
                            t_el.text = re.sub(
                                r"\[Slide\s+\d+/\d+",
                                f"[Slide {snum:02d}/{total:02d}",
                                tv,
                            )
                        elif y_emu >= 5800000 and re.fullmatch(r"\d{1,2}\s*/\s*\d{1,2}", tv.strip()):
                            t_el.text = (
                                f"{snum:02d} / {total:02d}" if pad_num else f"{snum} / {total}"
                            )
                data = ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
            zout.writestr(info, data)
    shutil.move(str(tmp), str(pptx_path))


def main() -> int:
    if not DONOR_PPTX.is_file() or not ATLAS_DRAFT.is_file():
        raise FileNotFoundError(
            f"Run `node scripts/build_before_after_proof_slides_and_atlas.mjs` first; missing {DONOR_PPTX} / {ATLAS_DRAFT}"
        )

    # Donor slide indices in live_ba_proof_donors.pptx:
    #   1: WS1-BA-01 Model Armor
    #   2: WS1-BA-02 Cloud Armor WAF
    #   3: WS2-BA-01 BigQuery Pattern A RLS
    #   4: WS3-BA-01 BigQuery Pattern B CMEK Kill-Switch
    #   5: CTRL-KMS-RUN Cloud KMS Keyring & Cloud Run Hub
    #   6: WS4-BA-01 Atlassian Jira Cloud '3LO'
    #   7: WS4-BA-02 Pattern C Hub -> Spoke VPC
    #   8: WS5-BA-01 ThoughtSpot Cloud BI
    #   9: WS5-BA-02 Integration Connectors -> Cloud Run A2A Hub
    lean_plans: List[Tuple[str, Path, int, List[Tuple[str, int]]]] = [
        (
            "WS1",
            SLIDES_DIR / "ws1-12slide-visual-deck.pptx",
            7,
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BASE", 4), ("BASE", 5), ("BASE", 6), ("BA", 1), ("BA", 2), ("BASE", 7)],
        ),
        (
            "WS2",
            SLIDES_DIR / "ws2-12slide-visual-deck.pptx",
            7,
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BASE", 4), ("BASE", 5), ("BASE", 6), ("BA", 3), ("BASE", 7)],
        ),
        (
            "WS3",
            SLIDES_DIR / "ws3-12slide-visual-deck.pptx",
            6,
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BASE", 4), ("BASE", 5), ("BA", 4), ("BASE", 6)],
        ),
        (
            "WS4",
            SLIDES_DIR / "ws4-12slide-visual-deck.pptx",
            7,
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BASE", 4), ("BASE", 5), ("BASE", 6), ("BA", 6), ("BA", 7), ("BASE", 7)],
        ),
        (
            "WS5",
            SLIDES_DIR / "ws5-12slide-visual-deck.pptx",
            7,
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BASE", 4), ("BASE", 5), ("BASE", 6), ("BA", 8), ("BA", 9), ("BASE", 7)],
        ),
    ]

    for key, out_p, base_n, plan in lean_plans:
        bak_p = _ensure_clean_lean_backup(out_p, base_n)
        n, sz = assemble_deck(
            base_pptx=bak_p,
            out_pptx=out_p,
            donors={"BA": DONOR_PPTX},
            slot_plan=plan,
        )
        _rewrite_lean_footers_exact(out_p, total=n, pad_num=False)
        print(f"✅ Synced {key:6s} ({base_n} -> {n} slides, {out_p.stat().st_size:,} bytes) -> {out_p.name}")

    # Assemble 16-Slide Live Visual Verification Atlas (S03 <- BARE_MIN_12 S11 native DrawingML!)
    atlas_out = SLIDES_DIR / "saas-10-visual-verification-atlas-16slide-deck.pptx"
    atlas_plan = [("BASE", i) if i != 3 else ("BM", 11) for i in range(1, 17)]
    n, sz = assemble_deck(
        base_pptx=ATLAS_DRAFT,
        out_pptx=atlas_out,
        donors={"BM": BARE_MIN_PATH},
        slot_plan=atlas_plan,
        per_slide_replacements={
            3: {
                "PART 5 (WS5)": "10-SAAS ATLAS",
            }
        },
    )
    _rewrite_lean_footers_exact(atlas_out, total=n, pad_num=True)
    print(f"✅ Synced ATLAS  ({n} slides, {atlas_out.stat().st_size:,} bytes) -> {atlas_out.name}")

    if DRAFTS_DIR.exists():
        shutil.rmtree(DRAFTS_DIR)
        print("🧹 Removed temporary slides/_ba_drafts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
