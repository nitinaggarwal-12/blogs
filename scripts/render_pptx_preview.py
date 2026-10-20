#!/usr/bin/env python3 -B
"""
Lightweight PPTX → HTML → PNG preview renderer (verification only).

Parses the DrawingML of every slide in a .pptx (shapes, lines, pictures, text runs, tables)
and renders an HTML twin per slide, then screenshots it with headless Chrome
(Rule 52: --headless=new, isolated /tmp/chrome_headless_* profile).

Usage:
  python3 -B scripts/render_pptx_preview.py slides/ws1-reference-architecture-editable-slides.pptx [--slides 1,3,4]
Outputs:
  slides/previews/<deck-stem>/slide_NN.png
"""
import sys

sys.dont_write_bytecode = True

import argparse
import base64
import html
import os
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
EMU_PER_PX = 9525  # 96 dpi


def emu_px(v):
    return int(v) / EMU_PER_PX


def q(tag):
    pfx, name = tag.split(":")
    return f"{{{NS[pfx]}}}{name}"


def solid_fill(el):
    if el is None:
        return None
    sf = el.find("a:solidFill", NS)
    if sf is None:
        return None
    clr = sf.find("a:srgbClr", NS)
    return f"#{clr.get('val')}" if clr is not None else None


def line_props(sppr, is_line=False):
    ln = sppr.find("a:ln", NS) if sppr is not None else None
    if ln is None:
        return None
    if ln.find("a:noFill", NS) is not None:
        return None
    color = solid_fill(ln)
    if color is None:
        if is_line:
            color = "#1e293b"
        else:
            return None
    w = emu_px(ln.get("w", "9525"))
    dash = ln.find("a:prstDash", NS)
    dashed = dash is not None and dash.get("val") not in (None, "solid")
    head = ln.find("a:headEnd", NS)
    tail = ln.find("a:tailEnd", NS)
    return {
        "color": color,
        "w": max(0.75, w),
        "dashed": dashed,
        "head": head is not None and head.get("type") not in (None, "none"),
        "tail": tail is not None and tail.get("type") not in (None, "none"),
    }


def runs_to_html(txbody):
    if txbody is None:
        return [], None
    paras = []
    body_pr = txbody.find("a:bodyPr", NS)
    no_wrap = body_pr is not None and body_pr.get("wrap") == "none"
    for p in txbody.findall("a:p", NS):
        ppr = p.find("a:pPr", NS)
        align = ppr.get("algn") if ppr is not None else None
        bullet = ppr is not None and ppr.find("a:buChar", NS) is not None
        spc_aft = 0.0
        ln_spc = 1.18
        if ppr is not None:
            sa = ppr.find("a:spcAft/a:spcPts", NS)
            if sa is not None and sa.get("val"):
                spc_aft = int(sa.get("val")) / 100.0 * 1.333
            ls = ppr.find("a:lnSpc/a:spcPct", NS)
            if ls is not None and ls.get("val"):
                ln_spc = max(0.88, min(1.4, int(ls.get("val")) / 100000.0 * 1.12))

        lines_in_p = [[]]
        line_sizes = [[]]
        for child in p:
            if child.tag == q("a:r"):
                rpr = child.find("a:rPr", NS)
                t = child.find("a:t", NS)
                txt = html.escape(t.text or "") if t is not None else ""
                size = rpr.get("sz") if rpr is not None else None
                bold = rpr is not None and rpr.get("b") == "1"
                italic = rpr is not None and rpr.get("i") == "1"
                color = solid_fill(rpr) if rpr is not None else None
                style = []
                if size:
                    px_sz = int(size) / 100.0 * 1.333
                    style.append(f"font-size:{px_sz:.1f}px")
                    line_sizes[-1].append(px_sz)
                if bold:
                    style.append("font-weight:700")
                if italic:
                    style.append("font-style:italic")
                if color:
                    style.append(f"color:{color}")
                lines_in_p[-1].append(f'<span style="{";".join(style)}">{txt}</span>')
            elif child.tag == q("a:br"):
                lines_in_p.append([])
                line_sizes.append([])

        base_css = []
        if align == "ctr":
            base_css.append("text-align:center")
        elif align == "r":
            base_css.append("text-align:right")
        if no_wrap:
            base_css.append("white-space:nowrap")
        if spc_aft > 0:
            base_css.append(f"margin-bottom:{spc_aft:.1f}px")
        elif bullet:
            base_css.append("margin-bottom:6px")

        for idx_l, sub_line in enumerate(lines_in_p):
            if not sub_line and len(lines_in_p) > 1:
                continue
            css = list(base_css)
            sz_list = line_sizes[idx_l] if idx_l < len(line_sizes) else []
            max_px = max(sz_list) if sz_list else 12.0
            css.append(f"font-size:{max_px:.1f}px")
            css.append(f"line-height:{ln_spc:.2f}")
            prefix = '<span style="color:#1A73E8;font-size:0.85em;margin-right:6px">&#9632;</span>' if bullet else ""
            paras.append(f'<div style="{";".join(css)}">{prefix}{"".join(sub_line)}</div>')
    anchor = body_pr.get("anchor") if body_pr is not None else None
    return paras, anchor


def render_slide(zf, slide_path, rels, out_html):
    root = ET.fromstring(zf.read(slide_path))
    bg = root.find("p:cSld/p:bg", NS)
    bg_color = "#ffffff"
    if bg is not None:
        c = solid_fill(bg.find("p:bgPr", NS))
        if c:
            bg_color = c
    items = []
    tree = root.find("p:cSld/p:spTree", NS)
    for el in tree:
        tag = el.tag
        if tag == q("p:sp"):
            sppr = el.find("p:spPr", NS)
            xfrm = sppr.find("a:xfrm", NS) if sppr is not None else None
            if xfrm is None:
                continue
            off = xfrm.find("a:off", NS)
            ext = xfrm.find("a:ext", NS)
            x, y = emu_px(off.get("x")), emu_px(off.get("y"))
            w, h = emu_px(ext.get("cx")), emu_px(ext.get("cy"))
            flip_h = xfrm.get("flipH") == "1"
            flip_v = xfrm.get("flipV") == "1"
            geom = sppr.find("a:prstGeom", NS)
            prst = geom.get("prst") if geom is not None else "rect"
            is_line_shape = prst in ("line", "straightConnector1")
            fill = solid_fill(sppr)
            ln = line_props(sppr, is_line=is_line_shape)
            txbody = el.find("p:txBody", NS)
            if is_line_shape:
                x1, y1, x2, y2 = x, y, x + w, y + h
                if flip_h:
                    x1, x2 = x2, x1
                if flip_v:
                    y1, y2 = y2, y1
                if ln:
                    dash_attr = 'stroke-dasharray="4 3"' if ln["dashed"] else ""
                    end_attr = 'marker-end="url(#arrow)"' if ln["tail"] else ""
                    start_attr = 'marker-start="url(#arrowrev)"' if ln["head"] else ""
                    items.append(
                        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ln["color"]}" '
                        f'stroke-width="{ln["w"]:.2f}" {dash_attr} {end_attr} {start_attr}/>'
                    )
                continue
            style = [f"left:{x:.1f}px", f"top:{y:.1f}px", f"width:{w:.1f}px", f"height:{h:.1f}px"]
            if fill:
                style.append(f"background:{fill}")
            if ln:
                style.append(f'border:{ln["w"]:.2f}px {"dashed" if ln["dashed"] else "solid"} {ln["color"]}')
            if prst == "roundRect":
                radius_px = 8 if min(w, h) > 28 else 5
                style.append(f"border-radius:{radius_px}px")
                if fill and ln and w > 90 and h > 40:
                    style.append("box-shadow:0 2px 6px rgba(15,23,42,0.06)")
            elif prst == "ellipse":
                style.append("border-radius:50%")
            inner = ""
            if txbody is not None:
                paras, anchor = runs_to_html(txbody)
                body_pr = txbody.find("a:bodyPr", NS)
                pad = "2px 4px"
                if body_pr is not None:
                    l = body_pr.get("lIns")
                    t = body_pr.get("tIns")
                    if l is not None or t is not None:
                        pad = f"{emu_px(t or 0):.1f}px {emu_px(l or 0):.1f}px"
                just = {"ctr": "center", "b": "flex-end"}.get(anchor, "flex-start")
                inner = (
                    f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:{just};'
                    f'padding:{pad};overflow:hidden;line-height:1.28">{"".join(paras)}</div>'
                )
            items.append(f'<div class="sp" style="{";".join(style)}">{inner}</div>')
        elif tag == q("p:pic"):
            sppr = el.find("p:spPr", NS)
            xfrm = sppr.find("a:xfrm", NS)
            off = xfrm.find("a:off", NS)
            ext = xfrm.find("a:ext", NS)
            x, y = emu_px(off.get("x")), emu_px(off.get("y"))
            w, h = emu_px(ext.get("cx")), emu_px(ext.get("cy"))
            blip = el.find("p:blipFill/a:blip", NS)
            rid = blip.get(q("r:embed")) if blip is not None else None
            target = rels.get(rid)
            if not target:
                continue
            media_path = os.path.normpath(os.path.join(os.path.dirname(slide_path), target)).replace("\\", "/")
            data = zf.read(media_path)
            mime = "image/png" if media_path.endswith(".png") else "image/jpeg"
            b64 = base64.b64encode(data).decode()
            items.append(
                f'<img class="pic" src="data:{mime};base64,{b64}" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h:.1f}px"/>'
            )
        elif tag == q("p:graphicFrame"):
            xfrm = el.find("p:xfrm", NS)
            off = xfrm.find("a:off", NS)
            ext = xfrm.find("a:ext", NS)
            x, y = emu_px(off.get("x")), emu_px(off.get("y"))
            w = emu_px(ext.get("cx"))
            h = emu_px(ext.get("cy", "0"))
            tbl = el.find(".//a:tbl", NS)
            if tbl is None:
                continue
            colgroup_cols = []
            tbl_grid = tbl.find("a:tblGrid", NS)
            if tbl_grid is not None:
                for gc in tbl_grid.findall("a:gridCol", NS):
                    cw = emu_px(gc.get("w", "0"))
                    if cw > 0:
                        colgroup_cols.append(f'<col style="width:{cw:.1f}px"/>')
            colgroup_html = f"<colgroup>{''.join(colgroup_cols)}</colgroup>" if colgroup_cols else ""
            rows_html = []
            for tr in tbl.findall("a:tr", NS):
                tr_h_px = emu_px(tr.get("h", "0"))
                tr_style = f' style="height:{tr_h_px:.1f}px"' if tr_h_px > 0 else ""
                cells = []
                for tc in tr.findall("a:tc", NS):
                    paras, _ = runs_to_html(tc.find("a:txBody", NS))
                    tcpr = tc.find("a:tcPr", NS)
                    bgc = solid_fill(tcpr) or "#ffffff"
                    anchor = tcpr.get("anchor") if tcpr is not None else None
                    valign = {"ctr": "middle", "b": "bottom"}.get(anchor, "middle")
                    pad_t = emu_px(tcpr.get("marT", "45720")) if tcpr is not None else 4.8
                    pad_l = emu_px(tcpr.get("marL", "91440")) if tcpr is not None else 9.6
                    cells.append(
                        f'<td style="background:{bgc};border:0.5px solid #cbd5e1;padding:{max(2.0, min(5.0, pad_t)):.1f}px {max(5.0, pad_l):.1f}px;vertical-align:{valign};box-sizing:border-box">{"".join(paras)}</td>'
                    )
                rows_html.append(f"<tr{tr_style}>{''.join(cells)}</tr>")
            tbl_h_style = f";height:{h:.1f}px" if h > 0 else ""
            items.append(
                f'<table class="tbl" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px{tbl_h_style};table-layout:fixed;border-collapse:collapse">{colgroup_html}{"".join(rows_html)}</table>'
            )
    svg_lines = [i for i in items if i.startswith("<line")]
    html_items = [i for i in items if not i.startswith("<line")]
    # Preserve z-order: render SVG lines layer at the position of the first line relative to shapes is complex;
    # instead interleave by wrapping each line in its own absolutely positioned svg.
    ordered = []
    for i in items:
        if i.startswith("<line"):
            ordered.append(
                '<svg class="ln" width="1280" height="720" style="position:absolute;left:0;top:0;pointer-events:none;overflow:visible">'
                '<defs><marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="6.5" markerHeight="6.5" refX="5.8" refY="3.25" orient="auto"><path d="M0,0.4 L6,3.25 L0,6.1" fill="none" stroke="context-stroke" stroke-width="1.35"/></marker>'
                '<marker id="arrowrev" markerUnits="userSpaceOnUse" markerWidth="6.5" markerHeight="6.5" refX="0.7" refY="3.25" orient="auto"><path d="M6,0.4 L0,3.25 L6,6.1" fill="none" stroke="context-stroke" stroke-width="1.35"/></marker></defs>'
                + i
                + "</svg>"
            )
        else:
            ordered.append(i)
    doc = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    html,body{{margin:0;padding:0;width:1280px;height:720px;overflow:hidden;background:{bg_color};font-family:Arial,Helvetica,sans-serif}}
    .slide{{position:relative;width:1280px;height:720px;background:{bg_color}}}
    .sp,.pic,.tbl{{position:absolute;box-sizing:border-box}}
    .pic{{object-fit:fill}}
    </style></head><body><div class="slide">{"".join(ordered)}</div></body></html>"""
    Path(out_html).write_text(doc, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--slides", default="", help="comma-separated 1-based slide numbers (default all)")
    args = ap.parse_args()
    pptx_path = Path(args.pptx)
    out_dir = pptx_path.parent / "previews" / pptx_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    wanted = {int(s) for s in args.slides.split(",") if s.strip()} if args.slides else None
    if wanted is None:
        for old_png in out_dir.glob("slide_*.png"):
            old_png.unlink(missing_ok=True)

    with zipfile.ZipFile(pptx_path) as zf:
        pres = ET.fromstring(zf.read("ppt/presentation.xml"))
        pres_rels = ET.fromstring(zf.read("ppt/_rels/presentation.xml.rels"))
        rid_to_target = {r.get("Id"): r.get("Target") for r in pres_rels}
        slide_ids = pres.find("p:sldIdLst", NS)
        order = [rid_to_target[s.get(q("r:id"))] for s in slide_ids]
        tmp = Path(tempfile.mkdtemp(prefix="pptx_preview_"))
        rendered = []
        for idx, target in enumerate(order, start=1):
            if wanted and idx not in wanted:
                continue
            slide_path = "ppt/" + target if not target.startswith("/") else target.lstrip("/")
            rels_path = slide_path.replace("slides/", "slides/_rels/") + ".rels"
            rels = {}
            if rels_path in zf.namelist():
                rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(zf.read(rels_path))}
            out_html = tmp / f"slide_{idx:02d}.html"
            render_slide(zf, slide_path, rels, out_html)
            rendered.append((idx, out_html))

    node_script = Path(__file__).resolve().parent / "screenshot_html_dir.mjs"
    try:
        subprocess.run(["node", str(node_script), str(tmp), str(out_dir), "1280", "720"], check=True, timeout=600)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"✅ {len(rendered)} slide previews → {out_dir}")


if __name__ == "__main__":
    main()
