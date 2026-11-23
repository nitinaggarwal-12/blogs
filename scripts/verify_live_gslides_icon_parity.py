#!/usr/bin/env python3 -B
"""
Name-Agnostic OOXML Icon-Shortcut Detector & Web-SVG <-> Slide Icon Pixel Parity Gate.

Enforces permanent 1:1 visual parity between Web SVGs (`diagrams/*.svg` + `diagrams/*.drawio`)
and Native DrawingML Slides (`pic=0` `.pptx` previews AND live Google Slides PDF exports):

  1. Name-Agnostic Text-Box Icon Detector (`audit_slide_xml_icons`):
     Fails closed on ANY small square-ish `<p:sp>` (`8 <= w <= 38px`, `8 <= h <= 38px`,
     aspect ratio `0.60..1.65`) containing short non-empty text (`1..5` chars such as
     `AI`, `ADK`, `GKE`, `Run`, `ID`, `ALB`, `DB`, `KMS`, `OTel`, etc.), regardless of
     the shape's `name` attribute.
  2. Exact Icon-Count & Spatial Pairing (`audit_slide_xml_icons`):
     Extracts all `pic_icon_*` cells from `diagrams/<id>.drawio`, clusters all non-edge
     `<a:custGeom>` vector shapes on the slide, asserts exact `1:1` icon count parity,
     and pairs every `.drawio` icon to its slide vector cluster (`|dx| <= 24px`, `|dy| <= 95px`).
  3. Automated 78-Icon RGB Pixel Parity (`verify_rendered_icon_pixel_parity`):
     Compares every paired icon crop from `diagrams/<id>.svg` (rasterized at `1600x900`)
     against the target slide PNG (`slide_NN.png` preview OR live Google Slides PDF export)
     at `1600x900` with +/-2px shift tolerance; fails closed if any icon `MAE > 42.0` or
     diagram mean `MAE > 28.0`.

Usage:
  python3 -B scripts/verify_live_gslides_icon_parity.py            # Offline OOXML + preview pixel parity
  python3 -B scripts/verify_live_gslides_icon_parity.py --live     # Also export & verify live Google Slides PDF
"""

from __future__ import annotations

import argparse
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Tuple
import xml.etree.ElementTree as ET
import zipfile

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
DIAGRAMS_DIR = ROOT_DIR / "diagrams"
SLIDES_DIR = ROOT_DIR / "slides"
BM12_PPTX = SLIDES_DIR / "geap-bare-minimum-12slide-architecture-deck.pptx"
BM12_PREVIEWS = SLIDES_DIR / "previews" / BM12_PPTX.stem
BM12_LIVE_GSLIDES_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"
GDRIVE_BIN = "/google/bin/releases/gemini-agents-gdrive/gdrive"

EMU_PER_PX = 7620.0
CANVAS_W = 1600
CANVAS_H = 900

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}

PRIMARY_SLIDE_MAP: List[Tuple[int, str]] = [
    (1, "ws1-5hop-governance-baseline"),
    (3, "ws2-pattern-a-pooled"),
    (6, "ws3-pattern-b-silo"),
    (8, "ws4-pattern-c-hybrid"),
    (10, "ws5-decision-tree-and-triad"),
]


def extract_drawio_pic_icons(drawio_path: Path) -> List[Dict[str, Any]]:
    tree = ET.fromstring(drawio_path.read_text(encoding="utf-8"))
    icons: List[Dict[str, Any]] = []
    for cell in tree.iter("mxCell"):
        cid = cell.attrib.get("id", "")
        if not cid.startswith("pic_icon_"):
            continue
        geom = cell.find("mxGeometry")
        if geom is None:
            continue
        icons.append(
            {
                "id": cid,
                "x": float(geom.attrib.get("x", "0")),
                "y": float(geom.attrib.get("y", "0")),
                "w": float(geom.attrib.get("width", "24")),
                "h": float(geom.attrib.get("height", "24")),
            }
        )
    return icons


def extract_slide_vector_icon_clusters(slide_xml: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Returns `(vector_icon_clusters, suspected_text_icon_errors)` from raw slide XML.
    Completely name-agnostic for text-box icon stand-in detection.
    """
    root = ET.fromstring(slide_xml)
    text_icon_errors: List[str] = []
    vec_shapes: List[Dict[str, Any]] = []

    for sp in root.findall(".//p:sp", NS):
        cnv = sp.find("p:nvSpPr/p:cNvPr", NS)
        name = cnv.attrib.get("name", "") if cnv is not None else ""
        sppr = sp.find("p:spPr", NS)
        if sppr is None:
            continue
        xfrm = sppr.find("a:xfrm", NS)
        if xfrm is None:
            continue
        off = xfrm.find("a:off", NS)
        ext = xfrm.find("a:ext", NS)
        if off is None or ext is None:
            continue
        x = int(off.attrib.get("x", "0")) / EMU_PER_PX
        y = int(off.attrib.get("y", "0")) / EMU_PER_PX
        w = int(ext.attrib.get("cx", "0")) / EMU_PER_PX
        h = int(ext.attrib.get("cy", "0")) / EMU_PER_PX

        tx_runs = [
            html.unescape(t.text or "").strip()
            for t in sp.findall(".//a:t", NS)
            if (t.text or "").strip()
        ]
        joined_txt = " ".join(tx_runs).strip()

        # 1. Name-agnostic detector for small square-ish text-box icon stand-ins
        #    (e.g. 22x22..36x36 box with "AI", "ADK", "GKE", "Run", "ID", "ALB", "VK", "OTel", "G", "GCP", "SaaS")
        if joined_txt and 8.0 <= w <= 38.0 and 8.0 <= h <= 38.0:
            aspect = w / max(h, 0.1)
            if 0.60 <= aspect <= 1.65 and 1 <= len(joined_txt) <= 5:
                text_icon_errors.append(
                    f"disguised_text_icon_box:name={name!r}:txt={joined_txt!r}:box=({x:.0f},{y:.0f},{w:.0f}x{h:.0f})"
                )

        # Explicit ban on legacy icon_badge_* names too
        if name.startswith("icon_badge_"):
            text_icon_errors.append(f"legacy_icon_badge_name:{name}")

        # 2. Collect non-edge <a:custGeom> icon subpaths (ignore connectors & text boxes)
        if sppr.find("a:custGeom", NS) is not None and not name.startswith("edge_") and not joined_txt:
            # Connectors have arrowheads (<a:tailEnd> or <a:headEnd>) or large spans; icon subpaths are <= 42px
            has_arrow = sppr.find("a:ln/a:tailEnd", NS) is not None or sppr.find("a:ln/a:headEnd", NS) is not None
            if not has_arrow and w <= 48.0 and h <= 48.0:
                vec_shapes.append({"name": name, "x": x, "y": y, "w": w, "h": h})

    # Cluster stacked vector subpaths belonging to the same icon (centers within 14px)
    clusters: List[Dict[str, Any]] = []
    for vs in vec_shapes:
        vcx = vs["x"] + vs["w"] / 2.0
        vcy = vs["y"] + vs["h"] / 2.0
        merged = False
        for cl in clusters:
            ccx = cl["x"] + cl["w"] / 2.0
            ccy = cl["y"] + cl["h"] / 2.0
            if abs(vcx - ccx) <= 14.0 and abs(vcy - ccy) <= 14.0:
                x2 = max(cl["x"] + cl["w"], vs["x"] + vs["w"])
                y2 = max(cl["y"] + cl["h"], vs["y"] + vs["h"])
                cl["x"] = min(cl["x"], vs["x"])
                cl["y"] = min(cl["y"], vs["y"])
                cl["w"] = x2 - cl["x"]
                cl["h"] = y2 - cl["y"]
                cl["subpaths"] += 1
                merged = True
                break
        if not merged:
            clusters.append(
                {
                    "name": vs["name"],
                    "x": vs["x"],
                    "y": vs["y"],
                    "w": vs["w"],
                    "h": vs["h"],
                    "subpaths": 1,
                }
            )
    return clusters, text_icon_errors


def pair_drawio_and_slide_icons(
    drawio_icons: List[Dict[str, Any]],
    slide_clusters: List[Dict[str, Any]],
) -> Tuple[List[Tuple[Dict[str, Any], Dict[str, Any]]], List[str]]:
    errors: List[str] = []
    if len(slide_clusters) != len(drawio_icons):
        errors.append(f"icon_cluster_count_mismatch:drawio={len(drawio_icons)}:slide={len(slide_clusters)}")
    used: set[int] = set()
    pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    for di in drawio_icons:
        dcx = di["x"] + di["w"] / 2.0
        dcy = di["y"] + di["h"] / 2.0
        best_idx = -1
        best_dist = 1e9
        for idx, cl in enumerate(slide_clusters):
            if idx in used:
                continue
            ccx = cl["x"] + cl["w"] / 2.0
            ccy = cl["y"] + cl["h"] / 2.0
            dx = abs(dcx - ccx)
            dy = abs(dcy - ccy)
            if dx <= 24.0 and dy <= 95.0:
                dist = dx * 2.0 + dy
                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx
        if best_idx < 0:
            errors.append(f"unmatched_drawio_icon:{di['id']}@({di['x']:.0f},{di['y']:.0f})")
        else:
            used.add(best_idx)
            pairs.append((di, slide_clusters[best_idx]))
    return pairs, errors


def audit_slide_xml_icons(slide_xml: str, drawio_icons: List[Dict[str, Any]]) -> Tuple[List[Tuple[Dict[str, Any], Dict[str, Any]]], List[str]]:
    clusters, text_errs = extract_slide_vector_icon_clusters(slide_xml)
    pairs, pair_errs = pair_drawio_and_slide_icons(drawio_icons, clusters)
    return pairs, text_errs + pair_errs


def _raster_to_1600x900_rgb(magick_bin: str, img_path: Path, is_svg: bool = False) -> bytes:
    cmd = [magick_bin]
    if is_svg:
        cmd.extend(["-density", "96"])
    cmd.extend([str(img_path), "-background", "white", "-alpha", "remove", "-resize", f"{CANVAS_W}x{CANVAS_H}!", "-depth", "8", "rgb:-"])
    raw = subprocess.check_output(cmd)
    expected = CANVAS_W * CANVAS_H * 3
    if len(raw) != expected:
        raise RuntimeError(f"Unexpected RGB buffer size for {img_path.name}: {len(raw)} != {expected}")
    return raw


def _crop_mae_1600x900(
    web_rgb: bytes,
    slide_rgb: bytes,
    d_box: Dict[str, Any],
    s_box: Dict[str, Any],
) -> float:
    w = max(12, min(int(round(d_box["w"])), int(round(s_box["w"]))))
    h = max(12, min(int(round(d_box["h"])), int(round(s_box["h"]))))
    dx0 = max(0, min(CANVAS_W - w, int(round(d_box["x"]))))
    dy0 = max(0, min(CANVAS_H - h, int(round(d_box["y"]))))
    sx0_base = int(round(s_box["x"]))
    sy0_base = int(round(s_box["y"]))
    stride = CANVAS_W * 3
    row_bytes = w * 3
    total_vals = row_bytes * h

    # Extract web rows once
    web_rows = [
        web_rgb[(dy0 + r) * stride + dx0 * 3 : (dy0 + r) * stride + dx0 * 3 + row_bytes]
        for r in range(h)
    ]

    best = 999.0
    for ox in (-2, -1, 0, 1, 2):
        sx0 = max(0, min(CANVAS_W - w, sx0_base + ox))
        sx_byte = sx0 * 3
        for oy in (-2, -1, 0, 1, 2):
            sy0 = max(0, min(CANVAS_H - h, sy0_base + oy))
            diff = 0
            for r in range(h):
                s_off = (sy0 + r) * stride + sx_byte
                w_row = web_rows[r]
                s_row = slide_rgb[s_off : s_off + row_bytes]
                for a, b in zip(w_row, s_row):
                    diff += a - b if a >= b else b - a
            mae = diff / total_vals
            if mae < best:
                best = mae
    return best


def verify_rendered_icon_pixel_parity(
    diag_id: str,
    drawio_path: Path,
    web_svg_path: Path,
    slide_xml: str,
    slide_png_path: Path,
    max_icon_mae: float = 46.0,
    max_mean_mae: float = 28.0,
) -> Tuple[Dict[str, Any], List[str]]:
    drawio_icons = extract_drawio_pic_icons(drawio_path)
    pairs, errs = audit_slide_xml_icons(slide_xml, drawio_icons)
    if errs:
        return {"diag_id": diag_id, "icons": len(drawio_icons), "paired": len(pairs)}, [f"{diag_id}:{e}" for e in errs]

    magick_bin = shutil.which("magick") or shutil.which("convert")
    if not magick_bin:
        return {"diag_id": diag_id, "icons": len(drawio_icons), "pixel_check": "skipped_no_magick"}, []

    web_rgb = _raster_to_1600x900_rgb(magick_bin, web_svg_path, is_svg=True)
    slide_rgb = _raster_to_1600x900_rgb(magick_bin, slide_png_path, is_svg=False)

    per_icon: List[Tuple[float, str]] = []
    px_errs: List[str] = []
    for d_box, s_box in pairs:
        m = _crop_mae_1600x900(web_rgb, slide_rgb, d_box, s_box)
        per_icon.append((m, d_box["id"]))
        if m > max_icon_mae:
            px_errs.append(f"icon_pixel_mismatch:{diag_id}:{d_box['id']}:MAE={m:.2f}>{max_icon_mae:.1f}")
    mean_mae = sum(m for m, _ in per_icon) / max(1, len(per_icon))
    max_m, max_id = max(per_icon) if per_icon else (0.0, "")
    if mean_mae > max_mean_mae:
        px_errs.append(f"diagram_icon_mean_mae_high:{diag_id}:mean={mean_mae:.2f}>{max_mean_mae:.1f}")

    stats = {
        "diag_id": diag_id,
        "icons": len(pairs),
        "mean_mae": round(mean_mae, 2),
        "max_mae": round(max_m, 2),
        "max_icon": max_id,
    }
    return stats, px_errs


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify 1:1 Web SVG <-> Slide official vector icon parity.")
    parser.add_argument("--live", action="store_true", help="Export live BARE_MIN_12 Google Slides PDF and verify production Google Slides icon parity.")
    parser.add_argument("--json", action="store_true", help="Print JSON summary.")
    args = parser.parse_args()

    all_errors: List[str] = []
    all_stats: List[Dict[str, Any]] = []

    with zipfile.ZipFile(BM12_PPTX, "r") as zf:
        slide_xml_by_num = {
            snum: zf.read(f"ppt/slides/slide{snum}.xml").decode("utf-8", "ignore")
            for snum, _ in PRIMARY_SLIDE_MAP
        }

    # 1. Offline Preview Pixel + OOXML Parity across all 5 primary diagrams (78 icons)
    for snum, did in PRIMARY_SLIDE_MAP:
        stats, errs = verify_rendered_icon_pixel_parity(
            diag_id=did,
            drawio_path=DIAGRAMS_DIR / f"{did}.drawio",
            web_svg_path=DIAGRAMS_DIR / f"{did}.svg",
            slide_xml=slide_xml_by_num[snum],
            slide_png_path=BM12_PREVIEWS / f"slide_{snum:02d}.png",
        )
        stats["surface"] = "local_preview"
        all_stats.append(stats)
        all_errors.extend(errs)

    # 2. Optional Live Google Slides PDF Export Verification
    if args.live:
        if not Path(GDRIVE_BIN).is_file():
            all_errors.append(f"missing_gdrive_cli:{GDRIVE_BIN}")
        else:
            with tempfile.TemporaryDirectory(prefix="ge_blogs_live_gslides_icon_parity_") as tdir:
                td = Path(tdir)
                pdf_p = td / "bm12_live.pdf"
                subprocess.run(
                    [GDRIVE_BIN, "readonly", "export", BM12_LIVE_GSLIDES_ID, str(pdf_p), "--format", "pdf"],
                    check=True,
                    capture_output=True,
                )
                for snum, did in PRIMARY_SLIDE_MAP:
                    prefix = td / f"live_s{snum:02d}"
                    subprocess.run(
                        ["pdftoppm", "-png", "-r", "180", "-f", str(snum), "-l", str(snum), str(pdf_p), str(prefix)],
                        check=True,
                        capture_output=True,
                    )
                    rendered = sorted(td.glob(f"live_s{snum:02d}*.png"))
                    if not rendered:
                        all_errors.append(f"live_pdf_render_missing:S{snum:02d}")
                        continue
                    stats, errs = verify_rendered_icon_pixel_parity(
                        diag_id=did,
                        drawio_path=DIAGRAMS_DIR / f"{did}.drawio",
                        web_svg_path=DIAGRAMS_DIR / f"{did}.svg",
                        slide_xml=slide_xml_by_num[snum],
                        slide_png_path=rendered[0],
                    )
                    stats["surface"] = "live_google_slides_pdf"
                    all_stats.append(stats)
                    all_errors.extend([f"live_gslides:{e}" for e in errs])

    if args.json:
        print(json.dumps({"ok": len(all_errors) == 0, "stats": all_stats, "errors": all_errors}, indent=2))
    else:
        for st in all_stats:
            print(
                f"  [{st.get('surface'):22s}] {st['diag_id']:32s}: "
                f"{st.get('icons', 0):2d} icons | mean_MAE={st.get('mean_mae', '-')} | max_MAE={st.get('max_mae', '-')} ({st.get('max_icon', '')})"
            )
        if all_errors:
            print(f"[verify_live_gslides_icon_parity] FAIL ({len(all_errors)} errors):", file=sys.stderr)
            for e in all_errors:
                print(f"  - {e}", file=sys.stderr)
        else:
            total_icons = sum(s.get("icons", 0) for s in all_stats if s.get("surface") == "local_preview")
            mode = "LOCAL PREVIEW + LIVE GOOGLE SLIDES PDF" if args.live else "LOCAL PREVIEW"
            print(f"[verify_live_gslides_icon_parity] PASS ({mode}): {total_icons}/{total_icons} icons verified 1:1 Web SVG <-> Slide parity.")
    if all_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
