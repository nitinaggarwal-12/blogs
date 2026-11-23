#!/usr/bin/env python3
"""Self-Contained Repo-Relative 2-Way Draw.io <-> Google Slides Sync Registry.

Runs 100% repo-relative inside `<repo-root>` with ZERO
dependency on any external scratch directory:
1. Reads & persists `<mxfile>` XML in both `diagrams/<id>.drawio` and
   `diagrams/compendium/drawio/<id>.drawio` + `slide_overrides.json`.
2. Regenerates `<id>.svg` (and `.drawio.png` when Chrome + viewer-static are
   available locally) immediately on save/pull.
3. Syncs shape text & geometry bi-directionally with live Google Slides decks
   (`BARE_MIN_12_PRES_ID` and `EDITABLE_2WAY_COMPENDIUM_PRES_ID`) via
   `/google/bin/releases/gemini-agents-gslides/gslides` (`list-slides` &
   `mutate raw-batch`) without clobbering native slide object IDs.
"""

from __future__ import annotations

import base64
import difflib
import html
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPTS_DIR.parent
DIAGRAMS_DIR = ROOT_DIR / "diagrams"
COMP_DRAWIO_DIR = DIAGRAMS_DIR / "compendium" / "drawio"
ATLAS_PATH = ROOT_DIR / "data" / "slide_diagrams_atlas.json"
OVERRIDES_PATH = COMP_DRAWIO_DIR / "slide_overrides.json"
MANIFEST_PATH = COMP_DRAWIO_DIR / "manifest.json"
GSLIDES_BIN = "/google/bin/releases/gemini-agents-gslides/gslides"

EDITABLE_2WAY_COMPENDIUM_PRES_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"
ANIMATED_COMPENDIUM_PRES_ID = "111n5JgAss6hr1OjdWNrVSGtflqASC4DecN-M5Bh4OBc"
BARE_MIN_12_PRES_ID = "1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk"
SECONDARY_BARE_MIN_12_PRES_IDS: List[str] = [
    "1K7XrzuhVxGDuuj33a3qK4onYXnSHr3Povzuj5LnEEnc",
]

BARE_MIN_12_SLIDE_MAP: Dict[str, int] = {
    "ws1-5hop-governance-baseline": 1,
    "ws1-c4-l3-process-sequence-swimlane": 2,
    "ws2-pattern-a-pooled": 3,
    "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane": 4,
    "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane": 5,
    "ws3-pattern-b-silo": 6,
    "ws3-c4-l3-cmek-killswitch-swimlane": 7,
    "ws4-pattern-c-hybrid": 8,
    "ws4-c4-l3-live-tier-promotion-swimlane": 9,
    "ws5-decision-tree-and-triad": 10,
    "saas10-multicloud-a2a-mcp-bridge": 11,
    "ws5-c4-l3-dynamic-skill-delegation-swimlane": 12,
}

EMU_PER_PX = 7620.0  # 12,192,000 EMU / 1600 px; 6,858,000 EMU / 900 px

SAFE_DIAG_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$")


def validate_diagram_id(diagram_id: str) -> str:
    cid = (diagram_id or "").strip()
    if not SAFE_DIAG_ID_RE.fullmatch(cid):
        raise ValueError("Invalid diagram_id (must match [A-Za-z0-9][A-Za-z0-9_-]{0,119}).")
    return cid


def validate_drawio_xml(xml_str: str) -> ET.Element:
    low = (xml_str or "").lower()
    if (
        not xml_str
        or len(xml_str.encode("utf-8")) > 2_500_000
        or ("<mxfile" not in xml_str and "<mxgraphmodel" not in low)
        or "<!doctype" in low
        or "<!entity" in low
    ):
        raise ValueError("Invalid or disallowed Draw.io XML payload (DOCTYPE/ENTITY blocked).")
    return ET.fromstring(xml_str)


def encode_drawio_self_contained_hash(xml_str: str) -> str:
    """Encodes a .drawio XML string into a compact diagrams.net #R<deflated_base64> hash."""
    s = re.sub(r'\s*<mxCell id="pic_[^"]*"[^>]*>.*?</mxCell>', "", xml_str, flags=re.S)
    s = re.sub(r'\s*<mxCell id="plane_rail_[^"]*"[^>]*>.*?</mxCell>', "", s, flags=re.S)
    s = re.sub(r">\s+<", "><", s.strip())
    uri_encoded = urllib.parse.quote(s, safe="~()*!.'")
    compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
    compressed = compressor.compress(uri_encoded.encode("utf-8")) + compressor.flush()
    b64 = base64.b64encode(compressed).decode("ascii")
    return "R" + b64


def _norm_para_text(lines: List[str]) -> str:
    return re.sub(r"\s+", "", "".join(lines or []))


def strip_html_to_lines(val_html: str) -> List[str]:
    if not val_html:
        return []
    txt = str(val_html)
    txt = re.sub(r"<\s*br\s*/?\s*>", "\n", txt, flags=re.I)
    txt = re.sub(r"</\s*(?:div|p|li|tr|h[1-6])\s*>", "\n", txt, flags=re.I)
    # Strip actual HTML tags BEFORE html.unescape() so &lt;0.15ms / &lt;8ms are preserved.
    txt = re.sub(r"</?[a-zA-Z!][a-zA-Z0-9:-]*(?:\s+[^>]*)?>", "", txt)
    txt = html.unescape(txt)
    txt = re.sub(r"<\s*br\s*/?\s*>", "\n", txt, flags=re.I)
    txt = re.sub(r"</\s*(?:div|p|li|tr|h[1-6])\s*>", "\n", txt, flags=re.I)
    txt = re.sub(
        r"</?(?:div|span|p|br|b|strong|i|em|u|s|font|sub|sup|code|pre|ul|ol|li|table|thead|tbody|tr|td|th|a|img|hr|h[1-6])(?:\s+[^>]*)?>",
        "",
        txt,
        flags=re.I,
    )
    return [ln.strip() for ln in txt.splitlines() if ln.strip()]


def load_slide_overrides() -> Dict[str, Any]:
    if OVERRIDES_PATH.is_file():
        try:
            return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"[2WaySync] Failed to parse slide_overrides.json: {exc}", file=sys.stderr)
    return {}


def save_slide_overrides(overrides: Dict[str, Any]) -> None:
    COMP_DRAWIO_DIR.mkdir(parents=True, exist_ok=True)
    OVERRIDES_PATH.write_text(json.dumps(overrides, indent=2) + "\n", encoding="utf-8")


def _load_atlas_item(diagram_id: str) -> Dict[str, Any]:
    if ATLAS_PATH.is_file():
        try:
            atlas = json.loads(ATLAS_PATH.read_text(encoding="utf-8"))
            for item in atlas.get("items", []):
                if item.get("diagramId") == diagram_id or item.get("id") == diagram_id:
                    return item
        except Exception as exc:
            print(f"[2WaySync] Failed to read atlas: {exc}", file=sys.stderr)
    return {}


def _resolve_target_slides(
    diagram_id: str,
    presentation_id: Optional[str] = None,
    comp_slide: Optional[Any] = None,
) -> List[Tuple[str, int]]:
    item = _load_atlas_item(diagram_id)
    targets: List[Tuple[str, int]] = []
    bm_num = BARE_MIN_12_SLIDE_MAP.get(diagram_id) or item.get("bareMinSlideNum")
    atlas_slide_num = item.get("slideNumber") or item.get("compendiumSlideNum")

    explicit_comp: Optional[int] = None
    if comp_slide is not None and str(comp_slide).strip().isdigit():
        explicit_comp = int(str(comp_slide).strip())

    if presentation_id:
        if presentation_id in (BARE_MIN_12_PRES_ID, *SECONDARY_BARE_MIN_12_PRES_IDS) and bm_num:
            targets.append((presentation_id, int(bm_num)))
        elif explicit_comp and explicit_comp >= 1:
            targets.append((presentation_id, explicit_comp))
        elif atlas_slide_num:
            targets.append((presentation_id, int(atlas_slide_num)))
        return targets

    if bm_num:
        targets.append((BARE_MIN_12_PRES_ID, int(bm_num)))
        for sec_bm_id in SECONDARY_BARE_MIN_12_PRES_IDS:
            targets.append((sec_bm_id, int(bm_num)))
    in_comp54 = item.get("inCompendium54")
    if explicit_comp and explicit_comp >= 1 and not (bm_num and explicit_comp == int(bm_num)):
        targets.append((EDITABLE_2WAY_COMPENDIUM_PRES_ID, explicit_comp))
    elif (in_comp54 is True or (in_comp54 is None and not bm_num)) and atlas_slide_num and 1 <= int(atlas_slide_num) <= 54:
        targets.append((EDITABLE_2WAY_COMPENDIUM_PRES_ID, int(atlas_slide_num)))
    return targets


def _flatten_gslides_page_elements(page_elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for pe in page_elements or []:
        if "elementGroup" in pe:
            out.extend(_flatten_gslides_page_elements(pe["elementGroup"].get("children", [])))
        else:
            out.append(pe)
    return out


def _parse_style_map(style_str: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for part in (style_str or "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def _render_drawio_xml_to_svg(root: ET.Element) -> str:
    """Renders a clean, standalone SVG representation from any Draw.io mxGraphModel XML."""
    graph_model = root if root.tag == "mxGraphModel" else root.find(".//mxGraphModel")
    w = 1600.0
    h = 900.0
    if graph_model is not None:
        try:
            w = float(graph_model.attrib.get("pageWidth", "1600") or "1600")
            h = float(graph_model.attrib.get("pageHeight", "900") or "900")
        except ValueError:
            pass

    vertices: Dict[str, Tuple[float, float, float, float]] = {}
    rects_svg: List[str] = []
    edges_svg: List[str] = []

    cells = list(root.findall(".//mxCell"))
    # Collect absolute positions including parent container offsets
    raw_boxes: Dict[str, Tuple[str, float, float, float, float]] = {}
    for cell in cells:
        cid = cell.attrib.get("id", "")
        if cid in ("0", "1"):
            continue
        geom = cell.find("mxGeometry")
        if cell.attrib.get("vertex") == "1" and geom is not None:
            raw_boxes[cid] = (
                cell.attrib.get("parent", "1"),
                float(geom.attrib.get("x", 0) or 0),
                float(geom.attrib.get("y", 0) or 0),
                float(geom.attrib.get("width", 0) or 0),
                float(geom.attrib.get("height", 0) or 0),
            )

    def _abs_box(cid: str, seen: Optional[set] = None) -> Tuple[float, float, float, float]:
        if cid not in raw_boxes:
            return (0.0, 0.0, 0.0, 0.0)
        seen = seen or set()
        if cid in seen:
            return (0.0, 0.0, 0.0, 0.0)
        seen.add(cid)
        par, x, y, bw, bh = raw_boxes[cid]
        if par in raw_boxes:
            px, py, _, _ = _abs_box(par, seen)
            return (x + px, y + py, bw, bh)
        return (x, y, bw, bh)

    max_x, max_y = w, h
    for cid in raw_boxes:
        bx, by, bw, bh = _abs_box(cid)
        vertices[cid] = (bx, by, bw, bh)
        max_x = max(max_x, bx + bw + 20)
        max_y = max(max_y, by + bh + 20)

    for cell in cells:
        cid = cell.attrib.get("id", "")
        if cid in ("0", "1"):
            continue
        style = _parse_style_map(cell.attrib.get("style", ""))
        val = cell.attrib.get("value", "")
        lines = strip_html_to_lines(val)
        geom = cell.find("mxGeometry")
        if cell.attrib.get("vertex") == "1" and cid in vertices:
            bx, by, bw, bh = vertices[cid]
            if bw <= 0 or bh <= 0:
                continue
            fill = style.get("fillColor", "#ffffff")
            if fill == "none":
                fill = "none"
            stroke = style.get("strokeColor", "#202124")
            if stroke == "none":
                stroke = "none"
            sw = style.get("strokeWidth", "1.5")
            rx = "8" if style.get("rounded") == "1" else ("999" if "ellipse" in (cell.attrib.get("style", "")) else "3")
            dash = ' stroke-dasharray="6 4"' if style.get("dashed") == "1" else ""
            rects_svg.append(
                f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="{rx}" '
                f'fill="{html.escape(fill)}" stroke="{html.escape(stroke)}" stroke-width="{html.escape(sw)}"{dash} />'
            )
            if lines:
                font_col = style.get("fontColor", "#202124")
                fs = float(style.get("fontSize", "12") or "12")
                fs = max(9.0, min(20.0, fs))
                va = style.get("verticalAlign", "middle")
                al = style.get("align", "center")
                anchor = "middle" if al == "center" else ("end" if al == "right" else "start")
                tx = bx + bw / 2 if anchor == "middle" else (bx + bw - 8 if anchor == "end" else bx + 8)
                start_y = (by + 16) if va == "top" else (by + max(fs + 2, (bh - len(lines) * (fs + 3)) / 2 + fs))
                tspans = "".join(
                    f'<tspan x="{tx:.1f}" y="{start_y + i * (fs + 3.5):.1f}">{html.escape(ln[:140])}</tspan>'
                    for i, ln in enumerate(lines[:10])
                )
                rects_svg.append(
                    f'<text font-family="Google Sans,Roboto,Arial,sans-serif" font-size="{fs:.1f}" '
                    f'fill="{html.escape(font_col)}" text-anchor="{anchor}">{tspans}</text>'
                )
        elif cell.attrib.get("edge") == "1":
            pts: List[Tuple[float, float]] = []
            src = cell.attrib.get("source")
            dst = cell.attrib.get("target")
            if src in vertices:
                sx, sy, sw_b, sh_b = vertices[src]
                pts.append((sx + sw_b / 2, sy + sh_b / 2))
            if geom is not None:
                arr = geom.find("Array")
                if arr is not None:
                    for mp in arr.findall("mxPoint"):
                        pts.append((float(mp.attrib.get("x", 0)), float(mp.attrib.get("y", 0))))
            if dst in vertices:
                dx, dy, dw_b, dh_b = vertices[dst]
                pts.append((dx + dw_b / 2, dy + dh_b / 2))
            if len(pts) >= 2:
                d_str = "M " + " L ".join(f"{px:.1f},{py:.1f}" for px, py in pts)
                stroke = style.get("strokeColor", "#1a73e8")
                if stroke == "none":
                    stroke = "#1a73e8"
                dash = ' stroke-dasharray="5 4"' if style.get("dashed") == "1" else ""
                edges_svg.append(
                    f'<path d="{d_str}" fill="none" stroke="{html.escape(stroke)}" stroke-width="1.8"{dash} marker-end="url(#arrow)" />'
                )
                if lines:
                    mx = (pts[0][0] + pts[-1][0]) / 2
                    my = (pts[0][1] + pts[-1][1]) / 2
                    edges_svg.append(
                        f'<rect x="{mx - 58:.1f}" y="{my - 11:.1f}" width="116" height="18" rx="4" fill="#ffffff" stroke="#e2e8f0" />'
                        f'<text x="{mx:.1f}" y="{my + 2:.1f}" text-anchor="middle" font-family="Google Sans,Roboto,Arial,sans-serif" '
                        f'font-size="10" font-weight="600" fill="#1e293b">{html.escape(" ".join(lines)[:48])}</text>'
                    )

    vb_w = int(round(max_x))
    vb_h = int(round(max_y))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}" width="{vb_w}" height="{vb_h}" '
        f'style="background:#ffffff;"><!-- Auto-rendered minimal Draw.io SVG -->'
        f'<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#1a73e8"/></marker></defs>'
        + "".join(rects_svg)
        + "".join(edges_svg)
        + "</svg>"
    )


def _compute_safe_cell_diffs(cid: str, old_lns: List[str], new_lns: List[str]) -> List[Tuple[str, str, str]]:
    """Computes 1:1 aligned line replacements using SequenceMatcher so line-count shifts never corrupt siblings."""
    if not old_lns or not new_lns or old_lns == new_lns:
        return []
    sm = difflib.SequenceMatcher(None, old_lns, new_lns)
    diffs: List[Tuple[str, str, str]] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "replace" and (i2 - i1) == (j2 - j1):
            for o_ln, n_ln in zip(old_lns[i1:i2], new_lns[j1:j2]):
                if o_ln and n_ln and o_ln != n_ln:
                    diffs.append((cid, o_ln, n_ln))
    return diffs


def _replace_exact_svg_text_nodes(fragment: str, pairs: List[Tuple[str, str]]) -> Tuple[str, bool]:
    """Single-pass full XML text-node replacement inside <text>/<tspan> elements (no partial substrings or chains)."""
    repl_map: Dict[str, str] = {}
    for old_txt, new_txt in pairs:
        if not old_txt or not new_txt or old_txt == new_txt:
            continue
        esc_old = html.escape(old_txt)
        esc_new = html.escape(new_txt)
        repl_map[esc_old] = esc_new
        if esc_old != old_txt:
            repl_map[old_txt] = esc_new
    if not repl_map:
        return fragment, False
    keys = sorted(repl_map.keys(), key=len, reverse=True)
    pat = re.compile(r"(>[^\S\n]*)(" + "|".join(re.escape(k) for k in keys) + r")(\s*</(?:text|tspan)>)")
    changed = False

    def _sub(m: re.Match) -> str:
        nonlocal changed
        changed = True
        return m.group(1) + repl_map[m.group(2)] + m.group(3)

    out = pat.sub(_sub, fragment)
    return out, changed


def _patch_existing_svg_labels(svg_path: Path, cell_diffs: List[Any]) -> bool:
    if not svg_path.is_file() or not cell_diffs:
        return False
    svg_txt = svg_path.read_text(encoding="utf-8")
    scoped_diffs: Dict[str, List[Tuple[str, str]]] = {}
    global_diffs: List[Tuple[str, str]] = []
    for item in cell_diffs:
        if len(item) == 3:
            cid, o_ln, n_ln = item
            if cid and f'data-node-id="{cid}"' in svg_txt:
                scoped_diffs.setdefault(cid, []).append((o_ln, n_ln))
            else:
                global_diffs.append((o_ln, n_ln))
        elif len(item) == 2:
            global_diffs.append((item[0], item[1]))

    changed = False
    for cid, pairs in scoped_diffs.items():
        anchor = f'data-node-id="{cid}"'
        pos = svg_txt.find(anchor)
        if pos == -1:
            global_diffs.extend(pairs)
            continue
        next_pos = svg_txt.find("data-node-id=", pos + len(anchor))
        path_pos = svg_txt.find("marker-end=", pos + len(anchor))
        end_candidates = [p for p in (next_pos, path_pos, len(svg_txt)) if p != -1]
        end = min(end_candidates)
        patched_chunk, c_hit = _replace_exact_svg_text_nodes(svg_txt[pos:end], pairs)
        if c_hit:
            svg_txt = svg_txt[:pos] + patched_chunk + svg_txt[end:]
            changed = True

    if global_diffs:
        svg_txt, g_hit = _replace_exact_svg_text_nodes(svg_txt, global_diffs)
        if g_hit:
            changed = True

    if changed:
        svg_path.write_text(svg_txt, encoding="utf-8")
    return changed


def _refresh_svg_and_png(diagram_id: str, new_root: ET.Element, cell_diffs: List[Any]) -> List[str]:
    updated_files: List[str] = []
    svg_targets = [
        COMP_DRAWIO_DIR / f"{diagram_id}.svg",
        DIAGRAMS_DIR / f"{diagram_id}.svg",
    ]
    for st in svg_targets:
        if not st.is_file():
            if st.parent == COMP_DRAWIO_DIR or (DIAGRAMS_DIR / f"{diagram_id}.drawio").is_file():
                st.parent.mkdir(parents=True, exist_ok=True)
                st.write_text(_render_drawio_xml_to_svg(new_root), encoding="utf-8")
                updated_files.append(str(st.relative_to(ROOT_DIR)))
            continue
        existing = st.read_text(encoding="utf-8")
        if cell_diffs and _patch_existing_svg_labels(st, cell_diffs):
            updated_files.append(str(st.relative_to(ROOT_DIR)))
        elif "<!-- Auto-rendered minimal Draw.io SVG -->" in existing:
            st.write_text(_render_drawio_xml_to_svg(new_root), encoding="utf-8")
            updated_files.append(str(st.relative_to(ROOT_DIR)))

    png_target = DIAGRAMS_DIR / f"{diagram_id}.drawio.png"
    viewer_js = ROOT_DIR / "vendor/drawio/viewer-static.min.js"
    puppet_dir = next(
        (
            cand
            for cand in (
                ROOT_DIR / "node_modules/puppeteer-core",
                Path.home() / "node_modules/puppeteer-core",
            )
            if cand.is_dir()
        ),
        Path.home() / "node_modules/puppeteer-core",
    )
    chrome_bin = "/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else "/usr/bin/chromium"
    if viewer_js.is_file() and puppet_dir.is_dir() and os.path.exists(chrome_bin):
        drawio_src = DIAGRAMS_DIR / f"{diagram_id}.drawio"
        if not drawio_src.is_file():
            drawio_src = COMP_DRAWIO_DIR / f"{diagram_id}.drawio"
        js_code = (
            "const fs = require('fs'); const http = require('http'); "
            f"const puppeteer = require({json.dumps(str(puppet_dir))}); "
            f"const xml = fs.readFileSync({json.dumps(str(drawio_src))}, 'utf8'); "
            f"const vjs = fs.readFileSync({json.dumps(str(viewer_js))}, 'utf8'); "
            "const esc = s => s.replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); "
            "const cfg = JSON.stringify({highlight:'#1a73e8',nav:false,resize:true,toolbar:null,edit:null,border:4,xml}); "
            "const htmlDoc = '<!doctype html><html><head><meta charset=\"utf-8\"></head><body style=\"margin:0;background:#fff;width:1600px;height:900px;overflow:hidden;\">' "
            "+ '<div class=\"mxgraph\" style=\"width:1600px;height:900px;\" data-mxgraph=\"' + esc(cfg) + '\"></div>' "
            "+ '<script src=\"/viewer-static.min.js\"></script></body></html>'; "
            "(async () => { "
            "  const srv = http.createServer((req,res)=>{ "
            "    if (req.url==='/viewer-static.min.js'){res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});res.end(vjs,'utf8');return;} "
            "    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(htmlDoc,'utf8'); "
            "  }); "
            "  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); "
            f"  const br = await puppeteer.launch({{headless:'new',executablePath:{json.dumps(chrome_bin)},args:['--no-sandbox','--disable-setuid-sandbox']}}); "
            "  const pg = await br.newPage(); await pg.setViewport({width:1600,height:900,deviceScaleFactor:2}); "
            "  await pg.goto('http://127.0.0.1:'+srv.address().port+'/',{waitUntil:'networkidle2',timeout:15000}); "
            "  await pg.waitForSelector('.mxgraph svg',{timeout:10000}); await pg.evaluate(()=>document.fonts.ready); "
            "  const el = await pg.$('.mxgraph'); "
            f"  await el.screenshot({{path:{json.dumps(str(png_target))}}}); "
            "  await br.close(); srv.close(); "
            "})().catch(e=>{console.error(e);process.exit(1);});"
        )
        try:
            subprocess.run(["node", "-e", js_code], check=True, capture_output=True, text=True, timeout=20)
            updated_files.append(str(png_target.relative_to(ROOT_DIR)))
        except Exception as exc:
            print(f"[2WaySync] PNG refresh warning ({diagram_id}): {exc}", file=sys.stderr)
    return updated_files


def _record_overrides_from_root(diagram_id: str, root: ET.Element) -> None:
    overrides = load_slide_overrides()
    diag_ov = overrides.get(diagram_id, {"shapes": {}, "tableCells": {}})
    sp_ov = diag_ov.setdefault("shapes", {})
    tc_ov = diag_ov.setdefault("tableCells", {})
    for cell in root.findall(".//mxCell"):
        cid = cell.attrib.get("id", "")
        val = cell.attrib.get("value", "")
        style = cell.attrib.get("style", "")
        geom = cell.find("mxGeometry")
        if cid.startswith("sp_") and geom is not None:
            entry = sp_ov.setdefault(cid, {})
            if "x" in geom.attrib and "y" in geom.attrib:
                entry["x_px"] = float(geom.attrib["x"])
                entry["y_px"] = float(geom.attrib["y"])
            if "width" in geom.attrib and "height" in geom.attrib:
                entry["w_px"] = float(geom.attrib["width"])
                entry["h_px"] = float(geom.attrib["height"])
            m_fill = re.search(r"fillColor=#([0-9A-Fa-f]{6})", style)
            if m_fill:
                entry["fill_hex"] = m_fill.group(1).upper()
            m_stroke = re.search(r"strokeColor=#([0-9A-Fa-f]{6})", style)
            if m_stroke:
                entry["stroke_hex"] = m_stroke.group(1).upper()
            lines = strip_html_to_lines(val)
            if lines:
                entry["lines"] = lines
        elif cid.startswith("tc_"):
            lines = strip_html_to_lines(val)
            if lines:
                tc_ov[cid] = {"text": " ".join(lines)}
    overrides[diagram_id] = diag_ov
    save_slide_overrides(overrides)


def _bump_local_manifest(diagram_id: str, sc_hash: str) -> Dict[str, Any]:
    COMP_DRAWIO_DIR.mkdir(parents=True, exist_ok=True)
    m: Dict[str, Any] = {}
    if MANIFEST_PATH.is_file():
        try:
            m = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            m = {}
    m["manifestVersion"] = int(time.time() * 1000)
    m["lastSyncedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    m["lastDiagramId"] = diagram_id
    m.setdefault("hashes", {})[diagram_id] = sc_hash
    MANIFEST_PATH.write_text(json.dumps(m, indent=2) + "\n", encoding="utf-8")
    return m


def _u16_len(s: str) -> int:
    return len((s or "").encode("utf-16-le")) // 2


def _extract_run_text_style_spec(style_obj: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """Extract clean Google Slides TextStyle + fieldMask from an existing textRun.style (normalizing Calibri -> Google Sans)."""
    spec: Dict[str, Any] = {}
    fields: List[str] = []
    ff = style_obj.get("fontFamily")
    if ff == "Calibri":
        ff = "Google Sans"
    if ff:
        spec["fontFamily"] = ff
        fields.append("fontFamily")
    fs_obj = style_obj.get("fontSize") or {}
    if fs_obj.get("magnitude"):
        spec["fontSize"] = {"magnitude": float(fs_obj["magnitude"]), "unit": fs_obj.get("unit", "PT")}
        fields.append("fontSize")
    spec["bold"] = bool(style_obj.get("bold", False))
    fields.append("bold")
    if "italic" in style_obj:
        spec["italic"] = bool(style_obj.get("italic", False))
        fields.append("italic")
    if "underline" in style_obj:
        spec["underline"] = bool(style_obj.get("underline", False))
        fields.append("underline")
    fg_rgb = (((style_obj.get("foregroundColor") or {}).get("opaqueColor") or {}).get("rgbColor"))
    if fg_rgb:
        spec["foregroundColor"] = {"opaqueColor": {"rgbColor": dict(fg_rgb)}}
        fields.append("foregroundColor")
    lnk = (style_obj.get("link") or {}).get("url")
    if lnk:
        spec["link"] = {"url": lnk}
        fields.append("link")
    return spec, fields


def _build_style_preserving_text_replace_requests(
    oid: str,
    target_pe: Dict[str, Any],
    xml_lines: List[str],
) -> List[Dict[str, Any]]:
    """Replace shape text via `deleteText` + `insertText` while preserving per-paragraph `paragraphStyle`,
    per-line/per-prefix `textStyle` (`fontFamily`, `fontSize`, `bold`, `foregroundColor`), and hyperlinks!
    """
    text_elems = target_pe.get("shape", {}).get("text", {}).get("textElements", [])
    cur_raw = "".join(te.get("textRun", {}).get("content", "") for te in text_elems)
    if not xml_lines:
        return []

    # Never overwrite slide footer navigation links (`[Bare-Min ...]` vs `[Slide ...]`) during Draw.io text sync
    if any((te.get("textRun") or {}).get("style", {}).get("link") for te in text_elems) and (
        "[Slide " in cur_raw or "[Bare-Min " in cur_raw
    ):
        return []

    # Group existing non-empty textRuns by paragraph so header vs. bullet styles and inline prefix badges survive
    paragraphs: List[Tuple[Dict[str, Any], List[Tuple[str, Dict[str, Any]]]]] = []
    cur_pstyle: Dict[str, Any] = {}
    cur_runs: List[Tuple[str, Dict[str, Any]]] = []
    for te in text_elems:
        if "paragraphMarker" in te:
            if cur_runs:
                paragraphs.append((cur_pstyle, cur_runs))
                cur_runs = []
            cur_pstyle = dict((te["paragraphMarker"].get("style") or {}))
        elif "textRun" in te:
            tr = te["textRun"]
            content = tr.get("content", "")
            st = dict(tr.get("style") or {})
            for part_idx, chunk in enumerate(content.split("\n")):
                if part_idx > 0 and cur_runs:
                    paragraphs.append((cur_pstyle, cur_runs))
                    cur_runs = []
                if chunk.strip():
                    cur_runs.append((chunk, st))
    if cur_runs:
        paragraphs.append((cur_pstyle, cur_runs))

    size = target_pe.get("size", {})
    xfrm = target_pe.get("transform", {})
    h_pt = (size.get("height", {}).get("magnitude", 0) * abs(xfrm.get("scaleY", 1.0))) / 12700.0
    # Detect if shape was previously style-stripped to uncolored 14pt Arial
    was_corrupted_14pt = bool(paragraphs) and all(
        ((runs[0][1].get("fontSize") or {}).get("magnitude") == 14 and not runs[0][1].get("foregroundColor"))
        for _, runs in paragraphs
        if runs
    )

    new_text = "\n".join(xml_lines)
    reqs: List[Dict[str, Any]] = []
    if cur_raw.strip():
        reqs.append({"deleteText": {"objectId": oid, "textRange": {"type": "ALL"}}})
    reqs.append({"insertText": {"objectId": oid, "insertionIndex": 0, "text": new_text}})

    # Fallback clean Cloudstyle 2.0 line style if target shape was missing or previously corrupted
    def _fallback_line_style(line_idx: int) -> Tuple[Dict[str, Any], List[str]]:
        is_hdr = (line_idx == 0)
        est_fs = 8.5 if is_hdr else 7.7
        if h_pt > 0 and len(xml_lines) >= 1:
            max_fit = max(6.2, min(9.8, (h_pt / (len(xml_lines) * 1.42))))
            est_fs = round(min(est_fs if len(xml_lines) > 2 else max_fit, max_fit), 2)
        rgb = {"red": 0.125, "green": 0.129, "blue": 0.141} if is_hdr else {"red": 0.235, "green": 0.251, "blue": 0.263}
        st = {
            "fontFamily": "Google Sans",
            "fontSize": {"magnitude": est_fs, "unit": "PT"},
            "bold": is_hdr,
            "foregroundColor": {"opaqueColor": {"rgbColor": rgb}},
        }
        return st, ["fontFamily", "fontSize", "bold", "foregroundColor"]

    u16_cursor = 0
    for idx, ln in enumerate(xml_lines):
        ln_u16 = _u16_len(ln)
        if ln_u16 <= 0:
            u16_cursor += 1
            continue

        src_pstyle: Dict[str, Any] = {}
        src_runs: List[Tuple[str, Dict[str, Any]]] = []
        if paragraphs and not was_corrupted_14pt:
            p_i = min(idx, len(paragraphs) - 1)
            src_pstyle, src_runs = paragraphs[p_i]

        # Preserve paragraph alignment & compact lineSpacing
        p_spec: Dict[str, Any] = {}
        p_fields: List[str] = []
        if src_pstyle.get("alignment"):
            p_spec["alignment"] = src_pstyle["alignment"]
            p_fields.append("alignment")
        if src_pstyle.get("lineSpacing"):
            p_spec["lineSpacing"] = float(src_pstyle["lineSpacing"])
            p_fields.append("lineSpacing")
        if (src_pstyle.get("spaceAbove") or {}).get("magnitude") is not None:
            p_spec["spaceAbove"] = dict(src_pstyle["spaceAbove"])
            p_fields.append("spaceAbove")
        if (src_pstyle.get("spaceBelow") or {}).get("magnitude") is not None:
            p_spec["spaceBelow"] = dict(src_pstyle["spaceBelow"])
            p_fields.append("spaceBelow")
        if p_fields:
            reqs.append({
                "updateParagraphStyle": {
                    "objectId": oid,
                    "textRange": {"type": "FIXED_RANGE", "startIndex": u16_cursor, "endIndex": u16_cursor + ln_u16},
                    "style": p_spec,
                    "fields": ",".join(p_fields),
                }
            })

        # Preserve inline 2-run prefix styling when line starts with the same prefix token (e.g. "COMPUTE  ...")
        if len(src_runs) >= 2 and ln.startswith(src_runs[0][0].strip()):
            pref_len_chars = len(src_runs[0][0])
            if pref_len_chars < len(ln):
                pref_u16 = _u16_len(ln[:pref_len_chars])
                st0, f0 = _extract_run_text_style_spec(src_runs[0][1])
                st1, f1 = _extract_run_text_style_spec(src_runs[1][1])
                if f0:
                    reqs.append({
                        "updateTextStyle": {
                            "objectId": oid,
                            "textRange": {"type": "FIXED_RANGE", "startIndex": u16_cursor, "endIndex": u16_cursor + pref_u16},
                            "style": st0,
                            "fields": ",".join(f0),
                        }
                    })
                if f1:
                    reqs.append({
                        "updateTextStyle": {
                            "objectId": oid,
                            "textRange": {"type": "FIXED_RANGE", "startIndex": u16_cursor + pref_u16, "endIndex": u16_cursor + ln_u16},
                            "style": st1,
                            "fields": ",".join(f1),
                        }
                    })
                u16_cursor += ln_u16 + 1
                continue

        if src_runs:
            st_spec, st_fields = _extract_run_text_style_spec(src_runs[0][1])
            if len(paragraphs) == 1 and len(xml_lines) >= 2 and idx >= 1:
                st_spec["bold"] = False
        else:
            st_spec, st_fields = _fallback_line_style(idx)

        if st_fields:
            reqs.append({
                "updateTextStyle": {
                    "objectId": oid,
                    "textRange": {"type": "FIXED_RANGE", "startIndex": u16_cursor, "endIndex": u16_cursor + ln_u16},
                    "style": st_spec,
                    "fields": ",".join(st_fields),
                }
            })

        u16_cursor += ln_u16 + 1

    return reqs


def _push_drawio_to_google_slides(
    diagram_id: str,
    root: ET.Element,
    comp_slide: Optional[Any] = None,
) -> Dict[str, Any]:
    if not os.path.isfile(GSLIDES_BIN):
        return {"googleSlidesSynced": False, "updatedCount": 0, "reason": "gslides binary not present"}
    targets = _resolve_target_slides(diagram_id, comp_slide=comp_slide)
    if not targets:
        return {
            "googleSlidesSynced": False,
            "updatedCount": 0,
            "reason": f"{diagram_id} saved locally (.drawio + .svg); not embedded in Compendium/Bare-Min Slides",
        }

    # Gather text-bearing vertices from Draw.io XML (resolving ancestor container offsets defensively)
    all_cells_by_id = {c.attrib.get("id", ""): c for c in root.findall(".//mxCell") if c.attrib.get("id")}

    def _parent_offset(c_el: ET.Element) -> Tuple[float, float]:
        ox, oy = 0.0, 0.0
        pid = c_el.attrib.get("parent", "")
        seen: set[str] = set()
        while pid and pid not in ("0", "1") and pid not in seen:
            seen.add(pid)
            p_el = all_cells_by_id.get(pid)
            if p_el is None:
                break
            p_geom = p_el.find("mxGeometry")
            if p_geom is not None:
                ox += float(p_geom.attrib.get("x", 0))
                oy += float(p_geom.attrib.get("y", 0))
            pid = p_el.attrib.get("parent", "")
        return ox, oy

    xml_shapes: List[Tuple[str, float, float, float, float, List[str]]] = []
    for cell in root.findall(".//mxCell"):
        if cell.attrib.get("vertex") != "1":
            continue
        geom = cell.find("mxGeometry")
        if geom is None or "x" not in geom.attrib or "y" not in geom.attrib:
            continue
        lines = strip_html_to_lines(cell.attrib.get("value", ""))
        if not lines:
            continue
        pox, poy = _parent_offset(cell)
        xml_shapes.append(
            (
                cell.attrib.get("id", ""),
                float(geom.attrib.get("x", 0)) + pox,
                float(geom.attrib.get("y", 0)) + poy,
                float(geom.attrib.get("width", 0)),
                float(geom.attrib.get("height", 0)),
                lines,
            )
        )

    total_reqs = 0
    synced_targets: List[str] = []
    warnings: List[str] = []

    for pres_id, slide_num in targets:
        try:
            proc = subprocess.run(
                [GSLIDES_BIN, "readonly", "list-slides", pres_id, "--json"],
                capture_output=True,
                text=True,
                timeout=45,
                check=True,
            )
            pres_json = json.loads(proc.stdout)
            slides = pres_json if isinstance(pres_json, list) else pres_json.get("slides", [])
            if slide_num < 1 or slide_num > len(slides):
                warnings.append(f"{pres_id}: slide {slide_num} out of range (1..{len(slides)})")
                continue

            page_elements = _flatten_gslides_page_elements(slides[slide_num - 1].get("pageElements", []))
            requests: List[Dict[str, Any]] = []
            matched_pe_ids: set[str] = set()

            for cid, x_px, y_px, w_px, h_px, xml_lines in xml_shapes:
                target_pe = None
                best_dist = 999999.0
                for pe in page_elements:
                    oid = pe.get("objectId", "")
                    if not oid or oid in matched_pe_ids or "shape" not in pe:
                        continue
                    size = pe.get("size", {})
                    xfrm = pe.get("transform", {})
                    gw = size.get("width", {}).get("magnitude", 0) * abs(xfrm.get("scaleX", 1.0)) / EMU_PER_PX
                    gh = size.get("height", {}).get("magnitude", 0) * abs(xfrm.get("scaleY", 1.0)) / EMU_PER_PX
                    gx = xfrm.get("translateX", 0) / EMU_PER_PX
                    gy = xfrm.get("translateY", 0) / EMU_PER_PX
                    dist = abs(gx - x_px) + abs(gy - y_px) + 0.5 * (abs(gw - w_px) + abs(gh - h_px))
                    if cid.startswith("sp_") and oid.endswith(cid[3:]):
                        target_pe = pe
                        best_dist = dist
                        break
                    if dist < best_dist and dist < 60.0:
                        best_dist = dist
                        target_pe = pe

                if target_pe is None:
                    continue
                oid = target_pe["objectId"]
                matched_pe_ids.add(oid)
                text_elems = target_pe.get("shape", {}).get("text", {}).get("textElements", [])
                cur_raw = "".join(te.get("textRun", {}).get("content", "") for te in text_elems)
                cur_lines = [ln.strip() for ln in cur_raw.splitlines() if ln.strip()]
                if xml_lines and _norm_para_text(xml_lines) != _norm_para_text(cur_lines) and cur_lines:
                    requests.extend(_build_style_preserving_text_replace_requests(oid, target_pe, xml_lines))

                xfrm = target_pe.get("transform", {})
                gx = xfrm.get("translateX", 0) / EMU_PER_PX
                gy = xfrm.get("translateY", 0) / EMU_PER_PX
                if abs(gx - x_px) > 8.0 or abs(gy - y_px) > 8.0:
                    requests.append(
                        {
                            "updatePageElementTransform": {
                                "objectId": oid,
                                "applyMode": "ABSOLUTE",
                                "transform": {
                                    "scaleX": xfrm.get("scaleX", 1.0),
                                    "scaleY": xfrm.get("scaleY", 1.0),
                                    "shearX": xfrm.get("shearX", 0.0),
                                    "shearY": xfrm.get("shearY", 0.0),
                                    "translateX": round(x_px * EMU_PER_PX),
                                    "translateY": round(y_px * EMU_PER_PX),
                                    "unit": "EMU",
                                },
                            }
                        }
                    )

            if requests:
                with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
                    json.dump({"requests": requests}, tf)
                    tf_path = tf.name
                try:
                    subprocess.run(
                        [GSLIDES_BIN, "mutate", "raw-batch", pres_id, "-f", tf_path],
                        capture_output=True,
                        text=True,
                        timeout=45,
                        check=True,
                    )
                    total_reqs += len(requests)
                finally:
                    try:
                        os.remove(tf_path)
                    except OSError:
                        pass
            synced_targets.append(f"{pres_id}#slide{slide_num}")
        except Exception as exc:
            warnings.append(f"{pres_id}#slide{slide_num}: {exc}")

    return {
        "googleSlidesSynced": bool(synced_targets) and not warnings,
        "updatedCount": total_reqs,
        "googleSlidesTargets": synced_targets,
        "warnings": warnings,
    }


def apply_drawio_xml_edit_to_unique_diagram(
    diagram_id: str,
    xml_str: str,
    comp_slide: Optional[Any] = None,
    sync_google_slides: bool = True,
) -> Dict[str, Any]:
    """Saves Draw.io XML to root + compendium, regenerates SVG/PNG, and syncs live to Google Slides."""
    diag_id = validate_diagram_id(diagram_id)
    new_root = validate_drawio_xml(xml_str)

    # Detect label diffs against existing XML for faithful SVG label patching
    prev_path = DIAGRAMS_DIR / f"{diag_id}.drawio"
    if not prev_path.is_file():
        prev_path = COMP_DRAWIO_DIR / f"{diag_id}.drawio"
    old_labels: Dict[str, List[str]] = {}
    if prev_path.is_file():
        try:
            old_root = ET.fromstring(prev_path.read_text(encoding="utf-8"))
            for c in old_root.findall(".//mxCell"):
                if c.attrib.get("id"):
                    old_labels[c.attrib["id"]] = strip_html_to_lines(c.attrib.get("value", ""))
        except Exception:
            pass

    cell_diffs: List[Tuple[str, str, str]] = []
    for c in new_root.findall(".//mxCell"):
        cid = c.attrib.get("id", "")
        new_lns = strip_html_to_lines(c.attrib.get("value", ""))
        old_lns = old_labels.get(cid, [])
        cell_diffs.extend(_compute_safe_cell_diffs(cid, old_lns, new_lns))

    COMP_DRAWIO_DIR.mkdir(parents=True, exist_ok=True)
    comp_path = COMP_DRAWIO_DIR / f"{diag_id}.drawio"
    comp_path.write_text(xml_str, encoding="utf-8")
    root_path = DIAGRAMS_DIR / f"{diag_id}.drawio"
    if root_path.is_file() or not (COMP_DRAWIO_DIR / f"{diag_id}.drawio").is_file():
        DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)
        root_path.write_text(xml_str, encoding="utf-8")

    _record_overrides_from_root(diag_id, new_root)
    updated_files = _refresh_svg_and_png(diag_id, new_root, cell_diffs)
    sc_hash = encode_drawio_self_contained_hash(xml_str)
    manifest = _bump_local_manifest(diag_id, sc_hash)

    gslides_status: Dict[str, Any] = {"googleSlidesSynced": False, "updatedCount": 0}
    if sync_google_slides:
        gslides_status = _push_drawio_to_google_slides(diag_id, new_root, comp_slide=comp_slide)

    return {
        "status": "ok",
        "diagramId": diag_id,
        "manifestVersion": manifest["manifestVersion"],
        "lastSyncedAt": manifest["lastSyncedAt"],
        "selfContainedHash": sc_hash,
        "updatedFiles": updated_files,
        **gslides_status,
    }


def pull_slide_changes_from_google_slides_any_diagram(
    diagram_id: str,
    gslides_bin: Optional[str] = None,
    presentation_id: Optional[str] = None,
    comp_slide: Optional[Any] = None,
) -> Dict[str, Any]:
    """Pulls live shape position/text edits from Google Slides back into `.drawio`, `.svg`, `.drawio.png`."""
    diag_id = validate_diagram_id(diagram_id)
    gs_bin = gslides_bin or GSLIDES_BIN
    if not os.path.isfile(gs_bin):
        raise RuntimeError(f"gslides binary not found at {gs_bin}")

    targets = _resolve_target_slides(diag_id, presentation_id=presentation_id, comp_slide=comp_slide)
    if not targets:
        raise ValueError(f"Diagram '{diag_id}' has no mapped 2-Way Google Slides presentation.")
    pres_id, target_slide_num = targets[0]

    proc = subprocess.run(
        [gs_bin, "readonly", "list-slides", pres_id, "--json"],
        capture_output=True,
        text=True,
        timeout=60,
        check=True,
    )
    pres_json = json.loads(proc.stdout)
    slides = pres_json if isinstance(pres_json, list) else pres_json.get("slides", [])
    if target_slide_num < 1 or target_slide_num > len(slides):
        raise RuntimeError(f"Slide {target_slide_num} out of range (1..{len(slides)}) in {pres_id}")

    slide_obj = slides[target_slide_num - 1]
    page_elements = _flatten_gslides_page_elements(slide_obj.get("pageElements", []))

    drawio_path = COMP_DRAWIO_DIR / f"{diag_id}.drawio"
    if not drawio_path.is_file():
        drawio_path = DIAGRAMS_DIR / f"{diag_id}.drawio"
    if not drawio_path.is_file():
        raise RuntimeError(f"Missing .drawio file for {diag_id}")

    root = ET.parse(str(drawio_path)).getroot()
    pull_cells_by_id = {c.attrib.get("id", ""): c for c in root.findall(".//mxCell") if c.attrib.get("id")}

    def _pull_parent_offset(c_el: ET.Element) -> Tuple[float, float]:
        ox, oy = 0.0, 0.0
        pid = c_el.attrib.get("parent", "")
        seen: set[str] = set()
        while pid and pid not in ("0", "1") and pid not in seen:
            seen.add(pid)
            p_el = pull_cells_by_id.get(pid)
            if p_el is None:
                break
            p_geom = p_el.find("mxGeometry")
            if p_geom is not None:
                ox += float(p_geom.attrib.get("x", 0))
                oy += float(p_geom.attrib.get("y", 0))
            pid = p_el.attrib.get("parent", "")
        return ox, oy

    text_cells: List[Tuple[ET.Element, float, float, float, float, List[str]]] = []
    all_known_cells: List[Tuple[ET.Element, float, float, float, float, List[str]]] = []
    for cell in root.findall(".//mxCell"):
        if cell.attrib.get("vertex") != "1":
            continue
        geom = cell.find("mxGeometry")
        if geom is None or "x" not in geom.attrib or "y" not in geom.attrib:
            continue
        lines = strip_html_to_lines(cell.attrib.get("value", ""))
        pox, poy = _pull_parent_offset(cell)
        tup = (
            cell,
            float(geom.attrib.get("x", 0)) + pox,
            float(geom.attrib.get("y", 0)) + poy,
            float(geom.attrib.get("width", 0)),
            float(geom.attrib.get("height", 0)),
            lines,
        )
        all_known_cells.append(tup)
        if lines:
            text_cells.append(tup)

    overrides = load_slide_overrides()
    diag_ov = overrides.get(diag_id, {"shapes": {}, "tableCells": {}})
    sp_ov = diag_ov.setdefault("shapes", {})
    changes_applied: List[str] = []
    cell_diffs: List[Tuple[str, str, str]] = []

    for pe in page_elements:
        shape = pe.get("shape")
        if not shape:
            continue
        size = pe.get("size", {})
        xfrm = pe.get("transform", {})
        w_emu = size.get("width", {}).get("magnitude", 0) * abs(xfrm.get("scaleX", 1.0))
        h_emu = size.get("height", {}).get("magnitude", 0) * abs(xfrm.get("scaleY", 1.0))
        x_emu = xfrm.get("translateX", 0)
        y_emu = xfrm.get("translateY", 0)
        if w_emu <= 0 or h_emu <= 0:
            continue
        x_px = round(x_emu / EMU_PER_PX, 1)
        y_px = round(y_emu / EMU_PER_PX, 1)
        w_px = round(w_emu / EMU_PER_PX, 1)
        h_px = round(h_emu / EMU_PER_PX, 1)

        text_elements = shape.get("text", {}).get("textElements", [])
        raw_text = "".join(te.get("textRun", {}).get("content", "") for te in text_elements)
        lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]
        if not lines or any(
            ln.startswith(("CONTROL", "COMPUTE", "DATA", "WHO RUNS WHAT"))
            or "Edit in Draw.io" in ln
            or "2-Way Draw.io Sync" in ln
            for ln in lines
        ):
            continue

        if any(
            _norm_para_text(c_lines) == _norm_para_text(lines)
            and abs(cx - x_px) <= 8.0
            and abs(cy - y_px) <= 8.0
            and abs(cw - w_px) <= 8.0
            and abs(ch - h_px) <= 8.0
            for _, cx, cy, cw, ch, c_lines in all_known_cells
        ):
            continue

        best_cell = None
        best_dist = 999999.0
        oid = pe.get("objectId", "")
        for cell, cx, cy, cw, ch, c_lines in text_cells:
            cid = cell.attrib.get("id", "")
            if cid.startswith("sp_") and oid.endswith(cid[3:]):
                best_cell = cell
                best_dist = 0.0
                break
            dist = abs(cx - x_px) + abs(cy - y_px) + 0.5 * (abs(cw - w_px) + abs(ch - h_px))
            if dist < best_dist and dist < 140.0:
                best_dist = dist
                best_cell = cell

        if best_cell is not None:
            cid = best_cell.attrib["id"]
            cur_lines = strip_html_to_lines(best_cell.attrib.get("value", ""))
            geom = best_cell.find("mxGeometry")
            pox, poy = _pull_parent_offset(best_cell)
            cur_x = float(geom.attrib.get("x", 0)) + pox
            cur_y = float(geom.attrib.get("y", 0)) + poy
            text_changed = _norm_para_text(lines) != _norm_para_text(cur_lines)
            pos_changed = abs(cur_x - x_px) > 8.0 or abs(cur_y - y_px) > 8.0
            if text_changed or pos_changed:
                sp_ov[cid] = {"x_px": x_px, "y_px": y_px, "w_px": w_px, "h_px": h_px, "lines": lines}
                if text_changed:
                    cell_diffs.extend(_compute_safe_cell_diffs(cid, cur_lines, lines))
                    best_cell.attrib["value"] = "<br/>".join(html.escape(ln) for ln in lines)
                if abs(cur_x - x_px) > 8.0:
                    geom.attrib["x"] = str(round(x_px - pox, 1))
                if abs(cur_y - y_px) > 8.0:
                    geom.attrib["y"] = str(round(y_px - poy, 1))
                changes_applied.append(f"{cid}: {' / '.join(lines)[:60]}")

    updated_files: List[str] = []
    if changes_applied:
        overrides[diag_id] = diag_ov
        save_slide_overrides(overrides)
        new_xml = ET.tostring(root, encoding="unicode")
        COMP_DRAWIO_DIR.mkdir(parents=True, exist_ok=True)
        (COMP_DRAWIO_DIR / f"{diag_id}.drawio").write_text(new_xml, encoding="utf-8")
        root_drawio = DIAGRAMS_DIR / f"{diag_id}.drawio"
        if root_drawio.is_file():
            root_drawio.write_text(new_xml, encoding="utf-8")
        updated_files = _refresh_svg_and_png(diag_id, root, cell_diffs)
        sc_hash = encode_drawio_self_contained_hash(new_xml)
        _bump_local_manifest(diag_id, sc_hash)

    return {
        "status": "ok",
        "diagramId": diag_id,
        "presentationId": pres_id,
        "compendiumSlideNum": target_slide_num,
        "changesCount": len(changes_applied),
        "changedCount": len(changes_applied),
        "changesApplied": changes_applied,
        "updatedFiles": updated_files,
    }
