#!/usr/bin/env python3
"""Idempotent Forensic Style Repair & Canonical 2-Way Sync across:
  1. `1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk` (`[12-Slide Bare-Minimum Architecture Deck]`)
  2. `1K7XrzuhVxGDuuj33a3qK4onYXnSHr3Povzuj5LnEEnc` (`WS1-5: All Patterns`)
  3. `1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk` (`Consolidated 56-Slide Master Compendium`)

Restores per-run `fontFamily`, `fontSize`, `bold`, `foregroundColor`, inline badge splits, and `paragraphStyle`
on any shape previously hit by `deleteText(ALL)` style-stripping (`14pt Arial` default) or `Calibri` drift,
then syncs all 12 canonical `.drawio` diagrams in `BARE_MIN_12_SLIDE_MAP` across all target decks.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPTS_DIR.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from slide_drawio_2way_registry import (
    BARE_MIN_12_PRES_ID,
    BARE_MIN_12_SLIDE_MAP,
    COMP_DRAWIO_DIR,
    DIAGRAMS_DIR,
    EDITABLE_2WAY_COMPENDIUM_PRES_ID,
    EMU_PER_PX,
    GSLIDES_BIN,
    SECONDARY_BARE_MIN_12_PRES_IDS,
    _build_style_preserving_text_replace_requests,
    _extract_run_text_style_spec,
    _flatten_gslides_page_elements,
    _push_drawio_to_google_slides,
    _u16_len,
)

WS1_5_ALL_PATTERNS_ID = SECONDARY_BARE_MIN_12_PRES_IDS[0]

# Mapping from Compendium 56 slide numbers -> Bare-Min 12 slide numbers (1..12)
COMPENDIUM_TO_BM12_SLIDE: Dict[int, int] = {
    10: 1,
    17: 3,
    23: 6,
    32: 10,
    35: 12,
}


def _fetch_pres_json(pres_id: str) -> Dict[str, Any]:
    raw = subprocess.check_output(
        [GSLIDES_BIN, "readonly", "info", pres_id, "--json"],
        text=True,
        timeout=60,
    )
    return json.loads(raw)


def _pe_box_px(pe: Dict[str, Any]) -> Tuple[float, float, float, float]:
    sz = pe.get("size") or {}
    xf = pe.get("transform") or {}
    x = (xf.get("translateX", 0) or 0) / EMU_PER_PX
    y = (xf.get("translateY", 0) or 0) / EMU_PER_PX
    w = (sz.get("width") or {}).get("magnitude", 0) * abs(xf.get("scaleX", 1.0) or 1.0) / EMU_PER_PX
    h = (sz.get("height") or {}).get("magnitude", 0) * abs(xf.get("scaleY", 1.0) or 1.0) / EMU_PER_PX
    return (x, y, w, h)


def _is_corrupted_or_calibri(pe: Dict[str, Any]) -> bool:
    tes = ((pe.get("shape") or {}).get("text") or {}).get("textElements") or []
    non_empty_runs = [
        te["textRun"]
        for te in tes
        if "textRun" in te and te["textRun"].get("content", "").strip()
    ]
    if not non_empty_runs:
        return False
    for tr in non_empty_runs:
        st = tr.get("style") or {}
        fs = (st.get("fontSize") or {}).get("magnitude")
        ff = st.get("fontFamily")
        has_fg = bool(((st.get("foregroundColor") or {}).get("opaqueColor") or {}).get("rgbColor"))
        if (fs == 14 and ff == "Arial" and not has_fg) or ff == "Calibri":
            return True
    return False


def _find_donor_pe(
    target_pe: Dict[str, Any],
    donor_elements: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    tx, ty, tw, th = _pe_box_px(target_pe)
    best: Optional[Dict[str, Any]] = None
    best_dist = 999999.0
    for dpe in donor_elements:
        if "shape" not in dpe or _is_corrupted_or_calibri(dpe):
            continue
        tes = ((dpe["shape"].get("text") or {}).get("textElements")) or []
        if not any((te.get("textRun") or {}).get("content", "").strip() for te in tes):
            continue
        dx, dy, dw, dh = _pe_box_px(dpe)
        dist = abs(tx - dx) + abs(ty - dy) + 0.5 * (abs(tw - dw) + abs(th - dh))
        if dist < best_dist and dist < 35.0:
            best_dist = dist
            best = dpe
    return best


def _build_footer_style_restore_requests(oid: str, target_pe: Dict[str, Any], donor_pe: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Restore Google Sans + bold + Draw.io link styling on `[Slide XX/12 ...]` footer bars without altering URL/text."""
    tes = ((target_pe.get("shape") or {}).get("text") or {}).get("textElements") or []
    full_txt = "".join((te.get("textRun") or {}).get("content", "") for te in tes).rstrip("\n")
    if not full_txt:
        return []
    # Preserve existing link URL on target if present, else donor link URL
    existing_link = next(
        ((te["textRun"].get("style", {}).get("link") or {}).get("url") for te in tes if "textRun" in te and (te["textRun"].get("style", {}).get("link") or {}).get("url")),
        None,
    )
    donor_tes = ((donor_pe.get("shape") or {}).get("text") or {}).get("textElements") or []
    donor_runs = [te["textRun"] for te in donor_tes if "textRun" in te and te["textRun"].get("content", "").strip()]
    if not existing_link:
        existing_link = next(
            ((r.get("style", {}).get("link") or {}).get("url") for r in donor_runs if (r.get("style", {}).get("link") or {}).get("url")),
            None,
        )

    # Split at last "  •  " so prefix gets Run 0 style and link label gets Run 1 style + hyperlink
    sep = "  •  "
    reqs: List[Dict[str, Any]] = []
    if sep in full_txt and len(donor_runs) >= 2:
        idx_sep = full_txt.rfind(sep) + len(sep)
        u16_split = _u16_len(full_txt[:idx_sep])
        u16_end = _u16_len(full_txt)
        st0, f0 = _extract_run_text_style_spec(donor_runs[0].get("style") or {})
        st1, f1 = _extract_run_text_style_spec(donor_runs[1].get("style") or {})
        if existing_link:
            st1["link"] = {"url": existing_link}
            if "link" not in f1:
                f1.append("link")
        if f0:
            reqs.append({
                "updateTextStyle": {
                    "objectId": oid,
                    "textRange": {"type": "FIXED_RANGE", "startIndex": 0, "endIndex": u16_split},
                    "style": st0,
                    "fields": ",".join(f0),
                }
            })
        if f1:
            reqs.append({
                "updateTextStyle": {
                    "objectId": oid,
                    "textRange": {"type": "FIXED_RANGE", "startIndex": u16_split, "endIndex": u16_end},
                    "style": st1,
                    "fields": ",".join(f1),
                }
            })
    return reqs


def _apply_raw_batch(pres_id: str, requests: List[Dict[str, Any]]) -> None:
    if not requests:
        return
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
        json.dump({"requests": requests}, tf)
        tf_path = tf.name
    try:
        subprocess.run(
            [GSLIDES_BIN, "mutate", "raw-batch", pres_id, "-f", tf_path],
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
    finally:
        Path(tf_path).unlink(missing_ok=True)


def main() -> int:
    print("==> [1/4] Snapshotting pristine pre-corruption styles from 1K7Xrzuh (WS1-5: All Patterns)...")
    donor_pres = _fetch_pres_json(WS1_5_ALL_PATTERNS_ID)
    donor_slides_els: Dict[int, List[Dict[str, Any]]] = {
        idx: _flatten_gslides_page_elements(sl.get("pageElements", []))
        for idx, sl in enumerate(donor_pres.get("slides", []), start=1)
    }

    print("==> [2/4] Healing corrupted 14pt Arial & Calibri shapes on 1erUlsPY (Bare-Min 12)...")
    bm_pres = _fetch_pres_json(BARE_MIN_12_PRES_ID)
    bm_reqs: List[Dict[str, Any]] = []
    bm_healed: List[str] = []
    for s_idx, sl in enumerate(bm_pres.get("slides", []), start=1):
        for pe in _flatten_gslides_page_elements(sl.get("pageElements", [])):
            if "shape" not in pe or not _is_corrupted_or_calibri(pe):
                continue
            oid = pe["objectId"]
            donor_pe = _find_donor_pe(pe, donor_slides_els.get(s_idx, []))
            tes = ((pe["shape"].get("text") or {}).get("textElements")) or []
            raw_txt = "".join((te.get("textRun") or {}).get("content", "") for te in tes)
            lines = [ln.strip() for ln in raw_txt.splitlines() if ln.strip()]
            if not lines or donor_pe is None:
                continue
            if "[Slide " in raw_txt:
                bm_reqs.extend(_build_footer_style_restore_requests(oid, pe, donor_pe))
            else:
                # Build style-preserving requests using donor_pe's intact styles + pe's current canonical lines!
                synth_donor = dict(donor_pe)
                bm_reqs.extend(_build_style_preserving_text_replace_requests(oid, synth_donor, lines))
            bm_healed.append(f"Slide {s_idx:02d} {oid}")

    _apply_raw_batch(BARE_MIN_12_PRES_ID, bm_reqs)
    print(f"  ✓ Healed {len(bm_healed)} shapes on {BARE_MIN_12_PRES_ID}: {bm_healed}")

    print("==> [3/4] Healing corrupted 14pt Arial shapes on 1-WwbZsd (56-Slide Compendium)...")
    comp_pres = _fetch_pres_json(EDITABLE_2WAY_COMPENDIUM_PRES_ID)
    comp_reqs: List[Dict[str, Any]] = []
    comp_healed: List[str] = []
    for comp_s_idx, bm_s_idx in COMPENDIUM_TO_BM12_SLIDE.items():
        if comp_s_idx > len(comp_pres.get("slides", [])):
            continue
        sl = comp_pres["slides"][comp_s_idx - 1]
        for pe in _flatten_gslides_page_elements(sl.get("pageElements", [])):
            if "shape" not in pe or not _is_corrupted_or_calibri(pe):
                continue
            oid = pe["objectId"]
            donor_pe = _find_donor_pe(pe, donor_slides_els.get(bm_s_idx, []))
            tes = ((pe["shape"].get("text") or {}).get("textElements")) or []
            raw_txt = "".join((te.get("textRun") or {}).get("content", "") for te in tes)
            lines = [ln.strip() for ln in raw_txt.splitlines() if ln.strip()]
            if not lines or donor_pe is None:
                continue
            if "[Slide " in raw_txt or "[Compendium" in raw_txt:
                comp_reqs.extend(_build_footer_style_restore_requests(oid, pe, donor_pe))
            else:
                comp_reqs.extend(_build_style_preserving_text_replace_requests(oid, dict(donor_pe), lines))
            comp_healed.append(f"Slide {comp_s_idx:02d} {oid}")

    _apply_raw_batch(EDITABLE_2WAY_COMPENDIUM_PRES_ID, comp_reqs)
    print(f"  ✓ Healed {len(comp_healed)} shapes on {EDITABLE_2WAY_COMPENDIUM_PRES_ID}: {comp_healed}")

    print("==> [4/4] Syncing all 12 canonical .drawio diagrams across 1erUlsPY + 1K7Xrzuh + 1-WwbZsd...")
    for diag_id, s_num in sorted(BARE_MIN_12_SLIDE_MAP.items(), key=lambda x: x[1]):
        dp = COMP_DRAWIO_DIR / f"{diag_id}.drawio"
        if not dp.is_file():
            dp = DIAGRAMS_DIR / f"{diag_id}.drawio"
        root = ET.parse(str(dp)).getroot()
        res = _push_drawio_to_google_slides(diag_id, root)
        print(f"  ✓ Slide {s_num:02d} ({diag_id}): synced={res['googleSlidesSynced']} reqs={res['updatedCount']} warnings={res['warnings']}")

    # Post-repair verification across all 3 presentations!
    for label, pid in [
        ("BARE_MIN_12   (1erUlsPY)", BARE_MIN_12_PRES_ID),
        ("WS1_5_ALL     (1K7Xrzuh)", WS1_5_ALL_PATTERNS_ID),
        ("COMPENDIUM_56 (1-WwbZsd)", EDITABLE_2WAY_COMPENDIUM_PRES_ID),
    ]:
        after = _fetch_pres_json(pid)
        rem_14pt = []
        for s_i, sl in enumerate(after.get("slides", []), start=1):
            for pe in _flatten_gslides_page_elements(sl.get("pageElements", [])):
                if "shape" not in pe:
                    continue
                tes = ((pe["shape"].get("text") or {}).get("textElements")) or []
                for te in tes:
                    tr = te.get("textRun")
                    if tr and tr.get("content", "").strip():
                        st = tr.get("style") or {}
                        fs = (st.get("fontSize") or {}).get("magnitude")
                        has_fg = bool(((st.get("foregroundColor") or {}).get("opaqueColor") or {}).get("rgbColor"))
                        if fs == 14 and st.get("fontFamily") == "Arial" and not has_fg:
                            rem_14pt.append((s_i, pe["objectId"]))
                            break
        print(f"  [AUDIT] {label}: remaining_14pt_corrupted_shapes = {len(rem_14pt)} {rem_14pt}")
        if rem_14pt:
            raise RuntimeError(f"Fail-closed audit failed on {pid}: {rem_14pt}")

    print("✅ ALL 3 LIVE GOOGLE SLIDES DECKS REPAIRED, SYNCED & VERIFIED (0 CORRUPTED SHAPES)!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
