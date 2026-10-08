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
import re
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


def line_props(sppr):
    ln = sppr.find("a:ln", NS) if sppr is not None else None
    if ln is None:
        return None
    if ln.find("a:noFill", NS) is not None:
        return None
    color = solid_fill(ln) or "#000000"
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
        return ""
    paras = []
    body_pr = txbody.find("a:bodyPr", NS)
    for p in txbody.findall("a:p", NS):
        ppr = p.find("a:pPr", NS)
        align = ppr.get("algn") if ppr is not None else None
        bullet = ppr is not None and ppr.find("a:buChar", NS) is not None
        parts = []
        for r in p.findall("a:r", NS):
            rpr = r.find("a:rPr", NS)
            t = r.find("a:t", NS)
            txt = html.escape(t.text or "") if t is not None else ""
            size = rpr.get("sz") if rpr is not None else None
            bold = rpr is not None and rpr.get("b") == "1"
            italic = rpr is not None and rpr.get("i") == "1"
            color = solid_fill(rpr) if rpr is not None else None
            style = []
            if size:
                style.append(f"font-size:{int(size)/100*1.333:.1f}px")
            if bold:
                style.append("font-weight:700")
            if italic:
                style.append("font-style:italic")
            if color:
                style.append(f"color:{color}")
            parts.append(f'<span style="{";".join(style)}">{txt}</span>')
        if p.find("a:br", NS) is not None and not parts:
            parts.append("<br/>")
        css = []
        if align == "ctr":
            css.append("text-align:center")
        elif align == "r":
            css.append("text-align:right")
        prefix = "&#9632;&nbsp;" if bullet else ""
        paras.append(f'<div style="{";".join(css)}">{prefix}{"".join(parts)}</div>')
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
            fill = solid_fill(sppr)
            ln = line_props(sppr)
            txbody = el.find("p:txBody", NS)
            if prst in ("line", "straightConnector1"):
                x1, y1, x2, y2 = x, y, x + w, y + h
                if flip_h:
                    x1, x2 = x2, x1
                if flip_v:
                    y1, y2 = y2, y1
                if ln:
                    items.append(
                        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ln["color"]}" '
                        f'stroke-width="{ln["w"]:.2f}" {"stroke-dasharray=\"4 3\"" if ln["dashed"] else ""} '
                        f'{"marker-end=\"url(#arrow)\"" if ln["tail"] else ""} {"marker-start=\"url(#arrowrev)\"" if ln["head"] else ""}/>'
                    )
                continue
            style = [f"left:{x:.1f}px", f"top:{y:.1f}px", f"width:{w:.1f}px", f"height:{h:.1f}px"]
            if fill:
                style.append(f"background:{fill}")
            if ln:
                style.append(f'border:{ln["w"]:.2f}px {"dashed" if ln["dashed"] else "solid"} {ln["color"]}')
            if prst == "roundRect":
                style.append("border-radius:6px")
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
                    f'padding:{pad};overflow:hidden;line-height:1.2">{"".join(paras)}</div>'
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
            tbl = el.find(".//a:tbl", NS)
            if tbl is None:
                continue
            rows_html = []
            for tr in tbl.findall("a:tr", NS):
                cells = []
                for tc in tr.findall("a:tc", NS):
                    paras, _ = runs_to_html(tc.find("a:txBody", NS))
                    tcpr = tc.find("a:tcPr", NS)
                    bgc = solid_fill(tcpr) or "#ffffff"
                    cells.append(f'<td style="background:{bgc};border:0.5px solid #cbd5e1;padding:3px 5px;vertical-align:top">{"".join(paras)}</td>')
                rows_html.append(f"<tr>{''.join(cells)}</tr>")
            items.append(
                f'<table class="tbl" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;border-collapse:collapse">{"".join(rows_html)}</table>'
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
                '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.2"/></marker>'
                '<marker id="arrowrev" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8" fill="none" stroke="context-stroke" stroke-width="1.2"/></marker></defs>'
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
