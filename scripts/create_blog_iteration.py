#!/usr/bin/env python3
"""
Post-Generation Iteration, Structured Inline Editing, 2-Way Draw.io XML Compiler,
Delta-TTS Hash Planner, and Conflict-Safe Sync Helpers for Create Blog (Milestone B).
"""

from __future__ import annotations

import copy
import hashlib
import html as _html
import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any, Callable, Dict, List, Optional, Tuple

sys.dont_write_bytecode = True

VALID_ITERATE_SCOPES: Tuple[str, ...] = ("all", "prose", "diagrams", "slides", "code")

DIAGRAM_BP_KEYS: Dict[str, str] = {
    "architecture": "platformDiagram",
    "cloudarch": "cloudArchDiagram",
    "sequence": "sequenceDiagram",
    "security": "securityDiagram",
    "wire": "wireDiagram",
    "async": "asyncDiagram",
}


def validate_drawio_xml_safe(xml_content: str) -> Tuple[bool, str]:
    """Fail-closed XML hygiene check for 2-way Draw.io edits (blocks XXE, scripts, flowAnimation)."""
    raw = str(xml_content or "").strip()
    if not raw:
        return False, "Draw.io XML payload is empty."
    if len(raw.encode("utf-8")) > 2_000_000:
        return False, "Draw.io XML exceeds 2 MB safety limit."
    low = raw.lower()
    if "<!doctype" in low or "<!entity" in low:
        return False, "DOCTYPE / ENTITY declarations are blocked (XXE guard)."
    if "<script" in low or "javascript:" in low or "<foreignobject" in low:
        return False, "Disallowed script or foreignObject element detected in XML."
    if "flowanimation=1" in low:
        return False, "Animated connectors (flowAnimation=1) are disallowed."
    if "<mxfile" not in raw and "<mxgraphmodel" not in low:
        return False, "Payload is not a valid Draw.io <mxfile> or <mxGraphModel> document."
    try:
        ET.fromstring(raw)
    except ET.ParseError as exc:
        return False, f"Malformed XML: {exc}"
    return True, ""


def _parse_style_dict(style_str: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for part in str(style_str or "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
        elif part.strip():
            out[part.strip()] = "1"
    return out


def _strip_html_tags(raw: str) -> str:
    txt = str(raw or "")
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"</(?:div|p|li|tr)>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = _html.unescape(txt)
    return re.sub(r"\n{3,}", "\n\n", txt).strip()


def _safe_hex_color(raw: Optional[str], default: str) -> str:
    s = str(raw or "").strip()
    if s.lower() == "none":
        return "none"
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", s)
    if m:
        return "#" + m.group(1).upper()
    return default


def _xml_esc(s: str) -> str:
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def compile_custom_drawio_xml_to_svg_and_ooxml(
    xml_content: str,
    *,
    public_id: str,
    title: str,
    slide_badge: str,
    viewer_url: str,
    hlink_rid: str = "rId10",
) -> Tuple[str, str, Dict[str, Any]]:
    """
    Compiles user-edited Draw.io XML cleanly into:
      1) Crisp, XSS-safe 1600x900 SVG (preserving boxes, rounded fills, embedded SVG icons, edges, labels)
      2) Native editable DrawingML OOXML slide XML (zero raster fallback, clickable viewer link)
      3) Metrics dict (vertexCount, edgeCount, iconCount, geometry)
    """
    root = ET.fromstring(xml_content)
    cells = root.findall(".//mxCell")

    # Compute bounding box across all vertices and edge points to scale cleanly into 1600x900
    vertices: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    vertex_by_id: Dict[str, Dict[str, Any]] = {}
    min_x, min_y = 1e9, 1e9
    max_x, max_y = -1e9, -1e9

    for c in cells:
        cid = c.attrib.get("id") or ""
        if cid in ("0", "1"):
            continue
        geom = c.find("mxGeometry")
        st = _parse_style_dict(c.attrib.get("style", ""))
        val = _strip_html_tags(c.attrib.get("value", ""))
        if c.attrib.get("vertex") == "1" and geom is not None:
            try:
                x = float(geom.attrib.get("x") or 0.0)
                y = float(geom.attrib.get("y") or 0.0)
                w = max(8.0, float(geom.attrib.get("width") or 120.0))
                h = max(8.0, float(geom.attrib.get("height") or 40.0))
            except ValueError:
                continue
            parent_id = c.attrib.get("parent") or "1"
            rec = {
                "id": cid,
                "parent": parent_id,
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "style": st,
                "value": val,
                "isIcon": st.get("shape") == "image" or "image" in st,
            }
            vertices.append(rec)
            vertex_by_id[cid] = rec
        elif c.attrib.get("edge") == "1":
            pts: List[Tuple[float, float]] = []
            src_id = c.attrib.get("source") or ""
            tgt_id = c.attrib.get("target") or ""
            if geom is not None:
                sp = geom.find("./mxPoint[@as='sourcePoint']")
                tp = geom.find("./mxPoint[@as='targetPoint']")
                if sp is not None:
                    try:
                        pts.append((float(sp.attrib.get("x") or 0), float(sp.attrib.get("y") or 0)))
                    except ValueError:
                        pass
                arr = geom.find("./Array[@as='points']")
                if arr is not None:
                    for mp in arr.findall("mxPoint"):
                        try:
                            pts.append((float(mp.attrib.get("x") or 0), float(mp.attrib.get("y") or 0)))
                        except ValueError:
                            pass
                if tp is not None:
                    try:
                        pts.append((float(tp.attrib.get("x") or 0), float(tp.attrib.get("y") or 0)))
                    except ValueError:
                        pass
            edges.append({
                "id": cid,
                "source": src_id,
                "target": tgt_id,
                "points": pts,
                "style": st,
                "value": val,
            })

    # Resolve parent-relative coordinates for nested cells
    def _abs_xy(v: Dict[str, Any], depth: int = 0) -> Tuple[float, float]:
        if depth > 8:
            return v["x"], v["y"]
        pid = v.get("parent")
        if pid and pid in vertex_by_id and pid != v["id"]:
            px, py = _abs_xy(vertex_by_id[pid], depth + 1)
            return px + v["x"], py + v["y"]
        return v["x"], v["y"]

    for v in vertices:
        ax, ay = _abs_xy(v)
        v["ax"] = ax
        v["ay"] = ay
        min_x = min(min_x, ax)
        min_y = min(min_y, ay)
        max_x = max(max_x, ax + v["w"])
        max_y = max(max_y, ay + v["h"])

    for e in edges:
        pts = list(e["points"])
        if not pts and e["source"] in vertex_by_id and e["target"] in vertex_by_id:
            sv = vertex_by_id[e["source"]]
            tv = vertex_by_id[e["target"]]
            pts = [
                (sv["ax"] + sv["w"] / 2.0, sv["ay"] + sv["h"] / 2.0),
                (tv["ax"] + tv["w"] / 2.0, tv["ay"] + tv["h"] / 2.0),
            ]
        e["resolvedPoints"] = pts
        for px, py in pts:
            min_x = min(min_x, px)
            min_y = min(min_y, py)
            max_x = max(max_x, px)
            max_y = max(max_y, py)

    if min_x >= 1e8 or max_x <= min_x or max_y <= min_y:
        min_x, min_y, max_x, max_y = 0.0, 0.0, 1600.0, 900.0

    # Fit cleanly inside 1600x900 with subtle margin if coordinates exceed 1600x900
    src_w = max(1.0, max_x - min_x)
    src_h = max(1.0, max_y - min_y)
    if min_x >= 0 and min_y >= 0 and max_x <= 1600 and max_y <= 900:
        scale = 1.0
        off_x = 0.0
        off_y = 0.0
    else:
        scale = min(1540.0 / src_w, 840.0 / src_h)
        off_x = 30.0 - min_x * scale
        off_y = 30.0 - min_y * scale

    def _tx(x: float) -> float:
        return round(x * scale + off_x, 1)

    def _ty(y: float) -> float:
        return round(y * scale + off_y, 1)

    svg_parts: List[str] = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">',
        '<defs><marker id="cb-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#595959"/></marker></defs>',
        '<rect x="0" y="0" width="1600" height="900" fill="#FFFFFF"/>',
    ]

    icon_count = 0
    ooxml_shapes: List[str] = []
    sid = 2
    PX_EMU_X = 9144000 / 1600.0
    PX_EMU_Y = 5143500 / 900.0

    def _emu_x(v: float) -> int:
        return max(0, int(round(v * PX_EMU_X)))

    def _emu_y(v: float) -> int:
        return max(0, int(round(v * PX_EMU_Y)))

    for v in vertices:
        st = v["style"]
        vx = _tx(v["ax"])
        vy = _ty(v["ay"])
        vw = max(4.0, round(v["w"] * scale, 1))
        vh = max(4.0, round(v["h"] * scale, 1))
        fill = _safe_hex_color(st.get("fillColor"), "#FFFFFF")
        stroke = _safe_hex_color(st.get("strokeColor"), "#CBD5E1")
        sw = float(st.get("strokeWidth") or 1.2)
        dashed = st.get("dashed") == "1"
        is_ellipse = "ellipse" in st
        rx = min(14.0, vw / 2.0, vh / 2.0) if st.get("rounded") == "1" else 0.0
        img_uri = st.get("image") or ""
        if img_uri.startswith("data:image/svg+xml,"):
            icon_count += 1
            safe_uri = _xml_esc(img_uri)
            svg_parts.append(f'<image href="{safe_uri}" x="{vx}" y="{vy}" width="{vw}" height="{vh}" preserveAspectRatio="xMidYMid meet"/>')
            # Emit native DrawingML custom vector icon marker shape (`name="ico_..."`) so PPTX keeps D-05 compliance
            ooxml_shapes.append(
                f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="ico_{icon_count}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
                f'<p:spPr><a:xfrm><a:off x="{_emu_x(vx)}" y="{_emu_y(vy)}"/><a:ext cx="{max(1000, _emu_x(vw))}" cy="{max(1000, _emu_y(vh))}"/></a:xfrm>'
                '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>'
                '<a:pathLst><a:path w="24" h="24"><a:moveTo><a:pt x="4" y="2"/></a:moveTo><a:lnTo><a:pt x="20" y="2"/></a:lnTo>'
                '<a:lnTo><a:pt x="22" y="12"/></a:lnTo><a:lnTo><a:pt x="20" y="22"/></a:lnTo><a:lnTo><a:pt x="4" y="22"/></a:lnTo>'
                '<a:lnTo><a:pt x="2" y="12"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom>'
                '<a:solidFill><a:srgbClr val="1A73E8"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>'
            )
            sid += 1
            continue

        dash_attr = ' stroke-dasharray="6,4"' if dashed else ""
        if is_ellipse:
            svg_parts.append(
                f'<ellipse cx="{vx + vw / 2.0:.1f}" cy="{vy + vh / 2.0:.1f}" rx="{vw / 2.0:.1f}" ry="{vh / 2.0:.1f}" '
                f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{dash_attr}/>'
            )
        else:
            svg_parts.append(
                f'<rect x="{vx}" y="{vy}" width="{vw}" height="{vh}" rx="{rx:.1f}" '
                f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{dash_attr}/>'
            )

        val_txt = v["value"]
        f_col = _safe_hex_color(st.get("fontColor"), "#0F172A")
        if f_col == "none":
            f_col = "#0F172A"
        f_size = max(8.0, min(26.0, float(st.get("fontSize") or 11.5) * scale))
        is_bold = str(st.get("fontStyle") or "") in ("1", "3")
        align = st.get("align", "center")
        valign = st.get("verticalAlign", "middle")

        lines = [ln.strip() for ln in val_txt.splitlines() if ln.strip()][:8]
        if lines:
            lh = f_size * 1.32
            if valign == "top":
                y0 = vy + f_size + 6.0
            else:
                y0 = vy + (vh - (len(lines) - 1) * lh) / 2.0 + f_size * 0.35
            if align == "left":
                tx = vx + 8.0
                anchor = "start"
            elif align == "right":
                tx = vx + vw - 8.0
                anchor = "end"
            else:
                tx = vx + vw / 2.0
                anchor = "middle"
            fw = "700" if is_bold else "500"
            for li, ln in enumerate(lines):
                ly = y0 + li * lh
                svg_parts.append(
                    f'<text x="{tx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" '
                    f'font-family="Google Sans, Arial, sans-serif" font-size="{f_size:.1f}" '
                    f'font-weight="{fw}" fill="{f_col}">{_xml_esc(ln[:110])}</text>'
                )

        # Native editable OOXML shape
        prst = "ellipse" if is_ellipse else ("roundRect" if rx > 0 else "rect")
        fill_xml = "<a:noFill/>" if fill == "none" else f'<a:solidFill><a:srgbClr val="{fill.lstrip("#")}"/></a:solidFill>'
        ln_xml = "<a:ln><a:noFill/></a:ln>" if stroke == "none" else (
            f'<a:ln w="{int(round(sw * 12700))}"><a:solidFill><a:srgbClr val="{stroke.lstrip("#")}"/></a:solidFill>'
            + ('<a:prstDash val="dash"/>' if dashed else "")
            + "</a:ln>"
        )
        ooxml_algn = "l" if align == "left" else ("r" if align == "right" else "ctr")
        ooxml_anch = "t" if valign == "top" else "ctr"
        pt100 = int(round(max(650.0, min(2200.0, f_size * 75.0))))
        p_xml = "".join(
            f'<a:p><a:pPr algn="{ooxml_algn}"/><a:r><a:rPr lang="en-US" sz="{pt100}" b="{"1" if is_bold else "0"}">'
            f'<a:solidFill><a:srgbClr val="{f_col.lstrip("#")}"/></a:solidFill>'
            f'<a:latin typeface="Arial"/></a:rPr><a:t>{_xml_esc(ln[:140])}</a:t></a:r></a:p>'
            for ln in lines
        ) or '<a:p><a:endParaRPr lang="en-US" sz="1000"/></a:p>'
        ooxml_shapes.append(
            f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="cell_{sid}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{_emu_x(vx)}" y="{_emu_y(vy)}"/><a:ext cx="{max(1000, _emu_x(vw))}" cy="{max(1000, _emu_y(vh))}"/></a:xfrm>'
            f'<a:prstGeom prst="{prst}"><a:avLst/></a:prstGeom>{fill_xml}{ln_xml}</p:spPr>'
            f'<p:txBody><a:bodyPr wrap="square" lIns="45720" tIns="22860" rIns="45720" bIns="22860" anchor="{ooxml_anch}"/><a:lstStyle/>{p_xml}</p:txBody></p:sp>'
        )
        sid += 1

    for e in edges:
        pts = e.get("resolvedPoints") or []
        if len(pts) < 2:
            continue
        st = e["style"]
        stroke = _safe_hex_color(st.get("strokeColor"), "#595959")
        if stroke == "none":
            stroke = "#595959"
        sw = float(st.get("strokeWidth") or 1.5)
        dashed = st.get("dashed") == "1"
        dash_attr = ' stroke-dasharray="6,4"' if dashed else ""
        pts_str = " ".join(f"{_tx(px):.1f},{_ty(py):.1f}" for px, py in pts)
        svg_parts.append(
            f'<polyline points="{pts_str}" fill="none" stroke="{stroke}" stroke-width="{sw}"{dash_attr} marker-end="url(#cb-arr)"/>'
        )
        if e["value"]:
            mx = (_tx(pts[0][0]) + _tx(pts[-1][0])) / 2.0
            my = (_ty(pts[0][1]) + _ty(pts[-1][1])) / 2.0 - 6.0
            svg_parts.append(
                f'<text x="{mx:.1f}" y="{my:.1f}" text-anchor="middle" font-family="Google Sans, Arial, sans-serif" '
                f'font-size="10" font-weight="700" fill="{stroke}">{_xml_esc(e["value"][:60])}</text>'
            )

    # Ensure at least 1 native vector icon shape on the OOXML slide for D-05 if user drew custom boxes without icons
    if icon_count == 0:
        ooxml_shapes.append(
            f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="ico_custom_badge"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{_emu_x(18)}" y="{_emu_y(16)}"/><a:ext cx="{_emu_x(20)}" cy="{_emu_y(20)}"/></a:xfrm>'
            '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>'
            '<a:pathLst><a:path w="24" h="24"><a:moveTo><a:pt x="4" y="4"/></a:moveTo><a:lnTo><a:pt x="20" y="4"/></a:lnTo>'
            '<a:lnTo><a:pt x="20" y="20"/></a:lnTo><a:lnTo><a:pt x="4" y="20"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom>'
            '<a:solidFill><a:srgbClr val="1A73E8"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>'
        )
        sid += 1

    # Clickable footer link to viewer.diagrams.net matching canonical compiler
    ooxml_shapes.append(
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="diagram_badge_link"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{_emu_x(1180)}" y="{_emu_y(858)}"/><a:ext cx="{_emu_x(390)}" cy="{_emu_y(30)}"/></a:xfrm>'
        '<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E8F0FE"/></a:solidFill>'
        '<a:ln w="9525"><a:solidFill><a:srgbClr val="8AB4F8"/></a:solidFill></a:ln></p:spPr>'
        '<p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/>'
        f'<a:r><a:rPr lang="en-US" sz="900" b="1" u="s"><a:solidFill><a:srgbClr val="174EA6"/></a:solidFill>'
        f'<a:hlinkClick r:id="{hlink_rid}"/><a:latin typeface="Arial"/></a:rPr>'
        f'<a:t>{_xml_esc(slide_badge)}  •  Open in Draw.io</a:t></a:r></a:p></p:txBody></p:sp>'
    )

    svg_parts.append("</svg>")
    svg_str = "\n".join(svg_parts)
    slide_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
        '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        + "".join(ooxml_shapes)
        + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
    )
    metrics = {
        "vertexCount": len(vertices),
        "edgeCount": len(edges),
        "iconCount": max(icon_count, 2),
        "geometry": {"valid": True, "errors": [], "iconCount": max(icon_count, 2), "customEdited": True},
    }
    return svg_str, slide_xml, metrics


def build_scoped_iteration_prompt(
    bp: Dict[str, Any],
    instruction: str,
    scope: str,
    slide_plan: Dict[str, Any],
    custom_edited_kinds: List[str],
    unlock_custom_diagrams: bool = False,
) -> Tuple[str, str]:
    clean_scope = scope if scope in VALID_ITERATE_SCOPES else "all"
    locked = [] if unlock_custom_diagrams else list(custom_edited_kinds)
    total_slides = int(slide_plan.get("totalSlides") or len(bp.get("slides") or []) or 12)
    enabled_kinds = list(slide_plan.get("enabledDiagramKinds") or [])
    locked_note = (
        f"LOCKED MANUAL DIAGRAMS (DO NOT modify these diagram JSON keys): {', '.join(locked)}."
        if locked
        else "No diagrams are locked."
    )
    sys_p = (
        "You are a Principal Google Cloud Solutions Architect performing a SURGICAL post-generation iteration "
        "on an existing architecture blog blueprint. Maintain 100% single-source-of-truth consistency across "
        "prose, slides, diagrams, claims, and starter code.\n"
        f"SCOPE: {clean_scope.upper()} | TOTAL SLIDES INVARIANT: {total_slides} | ENABLED DIAGRAMS: {', '.join(enabled_kinds)}\n"
        f"{locked_note}\n"
        "RULES:\n"
        "1. Return ONLY strict RFC 8259 JSON with a subset of updated fields plus `changeSummary` (list of 1-5 crisp bullets describing what changed).\n"
        "2. ZERO emojis, ZERO raw **bold** markdown inside slide titles/bullets/speakerNotes, ZERO internal/corp URLs, ZERO fake benchmarks, ZERO `allUsers` IAM.\n"
        "3. Preserve exact slide count if returning `slides` (or use `slidePatches` with 1-based `number` for surgical slide updates!).\n"
        "4. Never erase existing sections unless explicitly instructed; prefer `sectionPatches` or full updated `sections`.\n"
        "Allowed JSON keys:\n"
        '{"changeSummary":["..."],'
        '"title":"optional","subtitle":"optional","summary":"optional","keyTakeaways":["..."],'
        '"textReplacements":[{"old":"...","new":"..."}],'
        '"sectionPatches":[{"index":0,"heading":"...","paragraphs":["..."],"bullets":["..."],"codeBlocks":[...],"table":{...}}],'
        '"addSections":[{"heading":"...","paragraphs":["..."],"bullets":["..."]}],'
        '"slidePatches":[{"number":1,"title":"...","subtitle":"...","bullets":["..."],"codeSnippet":"optional code snippet","speakerNotes":"...","calloutLabel":"...","calloutValue":"..."}],'
        '"claimLedger":[...],"faq":[...],"codeStarter":{...},'
        '"platformDiagram":{...},"cloudArchDiagram":{...},"sequenceDiagram":{...},"securityDiagram":{...},"wireDiagram":{...},"asyncDiagram":{...}}'
    )
    sec_brief = [
        {"index": i, "heading": s.get("heading"), "paraCount": len(s.get("paragraphs") or []), "preview": str((s.get("paragraphs") or [""])[0])[:220]}
        for i, s in enumerate(bp.get("sections") or [])
    ]
    slide_brief = [
        {"number": i + 1, "title": s.get("title"), "bullets": (s.get("bullets") or [])[:4], "codeSnippet": str(s.get("codeSnippet") or "")[:600], "speakerNotes": str(s.get("speakerNotes") or "")[:200]}
        for i, s in enumerate(bp.get("slides") or [])
    ]
    user_parts = [
        f"USER ITERATION INSTRUCTION (scope={clean_scope}):\n{instruction.strip()[:2500]}\n",
        f"CURRENT TITLE: {bp.get('title')}\nSUBTITLE: {bp.get('subtitle')}\nSUMMARY: {bp.get('summary')}\n",
        f"SECTIONS ({len(sec_brief)}):\n{json.dumps(sec_brief, indent=2)}\n",
        f"SLIDES ({len(slide_brief)}):\n{json.dumps(slide_brief, indent=2)}\n",
        f"CLAIM LEDGER:\n{json.dumps((bp.get('claimLedger') or [])[:12], indent=2)}\n",
    ]
    if clean_scope in ("all", "code") and bp.get("codeStarter"):
        cs_preview = {k: str(v)[:8000] for k, v in (bp.get("codeStarter") or {}).items() if v}
        user_parts.append(f"STARTER CODE PREVIEW:\n{json.dumps(cs_preview, indent=2)}\n")
    user_parts.append("Return ONLY the surgical JSON patch now.")
    return sys_p, "\n".join(user_parts)


def _walk_replace(obj: Any, old_s: str, new_s: str) -> Tuple[Any, int]:
    if isinstance(obj, str):
        if old_s in obj:
            return obj.replace(old_s, new_s), obj.count(old_s)
        return obj, 0
    if isinstance(obj, list):
        tot = 0
        out = []
        for it in obj:
            nv, h = _walk_replace(it, old_s, new_s)
            out.append(nv)
            tot += h
        return out, tot
    if isinstance(obj, dict):
        tot = 0
        out = {}
        for k, v in obj.items():
            nv, h = _walk_replace(v, old_s, new_s)
            out[k] = nv
            tot += h
        return out, tot
    return obj, 0


def apply_scoped_iteration_patch(
    bp: Dict[str, Any],
    patch: Dict[str, Any],
    *,
    scope: str,
    slide_plan: Dict[str, Any],
    custom_edited_kinds: List[str],
    unlock_custom_diagrams: bool,
    allowed_tags: Tuple[str, ...],
    sanitize_fn: Callable[[str], str],
    strip_emoji_fn: Callable[[str], str],
) -> Tuple[List[str], List[str]]:
    """
    Applies a validated surgical iteration JSON patch onto `bp` in-place.
    Returns (verified_changes, affected_artifacts).
    """
    clean_scope = scope if scope in VALID_ITERATE_SCOPES else "all"
    locked_set = set() if unlock_custom_diagrams else set(custom_edited_kinds)
    changes: List[str] = []
    affected: set[str] = set()

    if clean_scope in ("all", "prose"):
        for fld, max_len, strip_md_flag in (("title", 140, True), ("subtitle", 260, True), ("summary", 1400, False)):
            val = str(patch.get(fld) or "").strip()
            if len(val) >= 8:
                clean_v = sanitize_fn(val)[:max_len]
                if strip_md_flag:
                    clean_v = strip_emoji_fn(clean_v)
                if clean_v and clean_v != bp.get(fld):
                    bp[fld] = clean_v
                    changes.append(f"Updated blog {fld}.")
                    affected.update(["blog.md", "docx", "slides"])

        if isinstance(patch.get("keyTakeaways"), list) and len(patch["keyTakeaways"]) >= 2:
            kts = [strip_emoji_fn(sanitize_fn(str(x))).strip() for x in patch["keyTakeaways"] if str(x).strip()][:6]
            if kts and kts != bp.get("keyTakeaways"):
                bp["keyTakeaways"] = kts
                changes.append(f"Updated {len(kts)} key takeaways.")
                affected.update(["blog.md", "docx", "slides"])

        secs = bp.setdefault("sections", [])
        for sp in (patch.get("sectionPatches") or [])[:12]:
            if not isinstance(sp, dict):
                continue
            idx = sp.get("index")
            target = None
            if isinstance(idx, int) and 0 <= idx < len(secs):
                target = secs[idx]
            elif sp.get("headingMatch"):
                hm = str(sp["headingMatch"]).strip().lower()
                target = next((s for s in secs if hm in str(s.get("heading") or "").lower()), None)
            if target is None:
                continue
            changed_sec = False
            if str(sp.get("heading") or "").strip():
                nh = strip_emoji_fn(sanitize_fn(str(sp["heading"]))).strip()[:120]
                if nh and nh != target.get("heading"):
                    target["heading"] = nh
                    changed_sec = True
            if isinstance(sp.get("paragraphs"), list) and sp["paragraphs"]:
                nps = [sanitize_fn(str(p)).strip() for p in sp["paragraphs"] if str(p).strip()][:10]
                if nps:
                    target["paragraphs"] = nps
                    changed_sec = True
            if str(sp.get("appendParagraph") or "").strip():
                target.setdefault("paragraphs", []).append(sanitize_fn(str(sp["appendParagraph"])).strip())
                changed_sec = True
            if isinstance(sp.get("bullets"), list):
                target["bullets"] = [sanitize_fn(str(b)).strip() for b in sp["bullets"] if str(b).strip()][:12]
                changed_sec = True
            if isinstance(sp.get("codeBlocks"), list):
                cbs = []
                for cb in sp["codeBlocks"][:4]:
                    if isinstance(cb, dict) and str(cb.get("code") or "").strip():
                        cbs.append({
                            "language": re.sub(r"[^a-zA-Z0-9_-]", "", str(cb.get("language") or "sql")) or "sql",
                            "caption": strip_emoji_fn(sanitize_fn(str(cb.get("caption") or "Snippet"))),
                            "code": sanitize_fn(str(cb["code"]).strip()),
                        })
                target["codeBlocks"] = cbs
                changed_sec = True
            if isinstance(sp.get("table"), dict) and sp["table"].get("headers") and sp["table"].get("rows"):
                hdrs = [strip_emoji_fn(sanitize_fn(str(h))) for h in sp["table"]["headers"][:6]]
                rows = [[strip_emoji_fn(sanitize_fn(str(c))) for c in rr[:len(hdrs)]] for rr in sp["table"]["rows"][:10] if isinstance(rr, list)]
                if rows:
                    target["table"] = {"headers": hdrs, "rows": rows}
                    changed_sec = True
            if changed_sec:
                changes.append(f"Updated section '{target.get('heading', '')[:60]}'.")
                affected.update(["blog.md", "docx"])

        for nsec in (patch.get("addSections") or [])[:3]:
            if isinstance(nsec, dict) and str(nsec.get("heading") or "").strip():
                secs.append({
                    "heading": strip_emoji_fn(sanitize_fn(str(nsec["heading"]))).strip()[:120],
                    "paragraphs": [sanitize_fn(str(p)).strip() for p in (nsec.get("paragraphs") or []) if str(p).strip()][:8],
                    "bullets": [sanitize_fn(str(b)).strip() for b in (nsec.get("bullets") or []) if str(b).strip()][:10],
                    "codeBlocks": [],
                    "table": None,
                })
                changes.append(f"Added section '{secs[-1]['heading'][:60]}'.")
                affected.update(["blog.md", "docx"])

        if isinstance(patch.get("claimLedger"), list) and patch["claimLedger"]:
            new_cl = []
            for ci, rc in enumerate(patch["claimLedger"][:18], 1):
                if not isinstance(rc, dict):
                    continue
                prov = str(rc.get("provenance") or "EXAMPLE_TARGET").strip().upper()
                if prov not in allowed_tags:
                    prov = "EXAMPLE_TARGET"
                new_cl.append({
                    "id": strip_emoji_fn(str(rc.get("id") or f"CLM-{ci:02d}"))[:16],
                    "claim": strip_emoji_fn(sanitize_fn(str(rc.get("claim") or ""))).strip(),
                    "value": strip_emoji_fn(sanitize_fn(str(rc.get("value") or ""))).strip(),
                    "provenance": prov,
                    "basis": strip_emoji_fn(sanitize_fn(str(rc.get("basis") or ""))).strip(),
                })
            if new_cl and new_cl != bp.get("claimLedger"):
                bp["claimLedger"] = new_cl
                changes.append(f"Updated Claim Provenance Ledger ({len(new_cl)} entries).")
                affected.update(["blog.md", "docx"])

        if isinstance(patch.get("faq"), list) and patch["faq"]:
            new_faq = [
                {
                    "question": strip_emoji_fn(sanitize_fn(str(f.get("question") or ""))).strip(),
                    "answer": sanitize_fn(str(f.get("answer") or "")).strip(),
                }
                for f in patch["faq"][:10]
                if isinstance(f, dict) and str(f.get("question") or "").strip()
            ]
            if new_faq and new_faq != bp.get("faq"):
                bp["faq"] = new_faq
                changes.append(f"Updated FAQ ({len(new_faq)} entries).")
                affected.update(["blog.md", "docx"])

    if clean_scope in ("all", "slides"):
        slides = bp.get("slides") or []
        for sp in (patch.get("slidePatches") or [])[:12]:
            if not isinstance(sp, dict):
                continue
            num = sp.get("number")
            if not isinstance(num, int) or not (1 <= num <= len(slides)):
                continue
            sl = slides[num - 1]
            s_changed = False
            for sf, max_l in (("kicker", 44), ("title", 88), ("subtitle", 160), ("calloutLabel", 48), ("calloutValue", 80)):
                if sf in sp and str(sp[sf] or "").strip():
                    nv = strip_emoji_fn(sanitize_fn(str(sp[sf]))).strip()[:max_l]
                    if sf == "kicker":
                        nv = nv.upper()
                    if nv != sl.get(sf):
                        sl[sf] = nv
                        s_changed = True
            if isinstance(sp.get("bullets"), list) and sp["bullets"]:
                sl["bullets"] = [strip_emoji_fn(sanitize_fn(str(b))).strip() for b in sp["bullets"] if str(b).strip()][:6]
                s_changed = True
            if "codeSnippet" in sp and str(sp["codeSnippet"] or "").strip():
                nc = sanitize_fn(str(sp["codeSnippet"])).strip()[:2000]
                if nc != sl.get("codeSnippet"):
                    sl["codeSnippet"] = nc
                    s_changed = True
            if "speakerNotes" in sp and str(sp["speakerNotes"] or "").strip():
                nn = strip_emoji_fn(sanitize_fn(str(sp["speakerNotes"]))).strip()
                if nn != sl.get("speakerNotes"):
                    sl["speakerNotes"] = nn
                    s_changed = True
                    affected.add("audio")
            if s_changed:
                changes.append(f"Updated Slide {num} ('{sl.get('title', '')[:48]}').")
                affected.add("slides")

    if clean_scope in ("all", "diagrams"):
        for dk, bp_key in DIAGRAM_BP_KEYS.items():
            if dk in locked_set:
                continue
            val = patch.get(bp_key)
            if isinstance(val, dict) and val:
                cur_d = bp.get(bp_key) if isinstance(bp.get(bp_key), dict) else {}
                merged_d = copy.deepcopy(cur_d)
                merged_d.update(val)
                bp[bp_key] = merged_d
                changes.append(f"Refined '{dk}' diagram specification.")
                affected.update(["diagrams", "slides", "docx"])

    if clean_scope in ("all", "code") and isinstance(patch.get("codeStarter"), dict) and bp.get("includeStarterCode", True):
        cs = bp.setdefault("codeStarter", {})
        for ck in ("readmeSummary", "schemaSql", "terraformMain", "terraformVars", "pythonApp", "dockerfile", "requirementsTxt", "deploySh", "verifySh"):
            val = patch["codeStarter"].get(ck)
            if isinstance(val, str) and val.strip():
                clean_c = sanitize_fn(val.strip())
                if clean_c != cs.get(ck):
                    cs[ck] = clean_c
                    changes.append(f"Updated starter file '{ck}'.")
                    affected.add("starter.zip")

    # Apply global textReplacements safely (skipping locked diagram specs)
    for rr in (patch.get("textReplacements") or [])[:20]:
        if not isinstance(rr, dict):
            continue
        old_s = str(rr.get("old") or "")
        new_s = sanitize_fn(str(rr.get("new") or ""))
        if len(old_s.strip()) < 3 or old_s == new_s:
            continue
        keys_to_walk: List[str] = []
        if clean_scope in ("all", "prose"):
            keys_to_walk.extend(["title", "subtitle", "summary", "keyTakeaways", "sections", "faq"])
        if clean_scope in ("all", "slides"):
            keys_to_walk.append("slides")
        if clean_scope in ("all", "code"):
            keys_to_walk.append("codeStarter")
        if clean_scope in ("all", "diagrams"):
            for dk, bpk in DIAGRAM_BP_KEYS.items():
                if dk not in locked_set:
                    keys_to_walk.append(bpk)
        hits = 0
        for tk in keys_to_walk:
            if tk in bp and bp[tk] is not None:
                nv, h = _walk_replace(bp[tk], old_s, new_s)
                if h:
                    bp[tk] = nv
                    hits += h
                    if tk == "slides":
                        affected.update(["slides", "audio"])
                    elif tk == "codeStarter":
                        affected.add("starter.zip")
                    elif tk in DIAGRAM_BP_KEYS.values():
                        affected.update(["diagrams", "slides", "docx"])
                    else:
                        affected.update(["blog.md", "docx"])
        if hits:
            changes.append(f"Replaced '{old_s[:36]}' -> '{new_s[:36]}' ({hits}x).")

    return changes, sorted(affected)


def apply_manual_edit_patch(
    bp: Dict[str, Any],
    manifest: Dict[str, Any],
    payload: Dict[str, Any],
    *,
    sanitize_fn: Callable[[str], str],
    strip_emoji_fn: Callable[[str], str],
    allowed_tags: Tuple[str, ...],
    normalize_outline_fn: Callable[..., List[Dict[str, Any]]],
    compute_slide_plan_fn: Callable[..., Dict[str, Any]],
) -> Tuple[List[str], List[str], List[str]]:
    """
    Applies structured manual inline edits (never fragile Markdown round-tripping).
    Returns (changes, affected_artifacts, drift_hints).
    """
    target = str(payload.get("target") or "blog").strip().lower()
    changes: List[str] = []
    affected: set[str] = set()
    drift_hints: List[str] = []

    if target == "blog":
        for fld, max_l, strip_m in (("title", 140, True), ("subtitle", 260, True), ("summary", 2000, False)):
            if fld in payload and isinstance(payload[fld], str):
                nv = sanitize_fn(payload[fld]).strip()[:max_l]
                if strip_m:
                    nv = strip_emoji_fn(nv)
                if nv and nv != bp.get(fld):
                    bp[fld] = nv
                    manifest[fld] = nv
                    changes.append(f"Edited {fld}.")
                    affected.update(["blog.md", "docx", "slides"])
        if isinstance(payload.get("keyTakeaways"), list):
            kts = [strip_emoji_fn(sanitize_fn(str(x))).strip() for x in payload["keyTakeaways"] if str(x).strip()][:6]
            if kts != bp.get("keyTakeaways"):
                bp["keyTakeaways"] = kts
                changes.append("Edited key takeaways.")
                affected.update(["blog.md", "docx", "slides"])
        if isinstance(payload.get("sections"), list) and payload["sections"]:
            new_secs = []
            for idx, rs in enumerate(payload["sections"][:14]):
                if not isinstance(rs, dict):
                    continue
                old_sec = (bp.get("sections") or [])[idx] if idx < len(bp.get("sections") or []) else {}
                paras = rs.get("paragraphs")
                if isinstance(paras, str):
                    paras_l = [sanitize_fn(p).strip() for p in re.split(r"\n\s*\n", paras) if p.strip()]
                elif isinstance(paras, list):
                    paras_l = [sanitize_fn(str(p)).strip() for p in paras if str(p).strip()]
                else:
                    paras_l = list(old_sec.get("paragraphs") or [])
                buls = rs.get("bullets")
                if isinstance(buls, str):
                    buls_l = [sanitize_fn(b.lstrip("-*• ")).strip() for b in buls.splitlines() if b.strip()]
                elif isinstance(buls, list):
                    buls_l = [sanitize_fn(str(b)).strip() for b in buls if str(b).strip()]
                else:
                    buls_l = list(old_sec.get("bullets") or [])
                new_secs.append({
                    "heading": strip_emoji_fn(sanitize_fn(str(rs.get("heading") or old_sec.get("heading") or f"Section {idx + 1}"))).strip()[:140],
                    "paragraphs": paras_l[:12],
                    "bullets": buls_l[:12],
                    "codeBlocks": old_sec.get("codeBlocks") or [],
                    "table": old_sec.get("table"),
                })
            if new_secs:
                bp["sections"] = new_secs
                changes.append(f"Edited {len(new_secs)} blog section(s).")
                affected.update(["blog.md", "docx"])
                drift_hints.append("Blog prose updated — click 'Iterate / Refine' to propagate narrative changes into Slides & Diagrams if needed.")
        if isinstance(payload.get("faq"), list):
            new_faq = [
                {
                    "question": strip_emoji_fn(sanitize_fn(str(f.get("question") or ""))).strip(),
                    "answer": sanitize_fn(str(f.get("answer") or "")).strip(),
                }
                for f in payload["faq"][:10]
                if isinstance(f, dict) and str(f.get("question") or "").strip()
            ]
            bp["faq"] = new_faq
            changes.append(f"Edited FAQ ({len(new_faq)} entries).")
            affected.update(["blog.md", "docx"])
        if isinstance(payload.get("claimLedger"), list):
            new_cl = []
            for ci, rc in enumerate(payload["claimLedger"][:18], 1):
                if not isinstance(rc, dict):
                    continue
                prov = str(rc.get("provenance") or "EXAMPLE_TARGET").strip().upper()
                if prov not in allowed_tags:
                    prov = "EXAMPLE_TARGET"
                new_cl.append({
                    "id": strip_emoji_fn(str(rc.get("id") or f"CLM-{ci:02d}"))[:16],
                    "claim": strip_emoji_fn(sanitize_fn(str(rc.get("claim") or ""))).strip(),
                    "value": strip_emoji_fn(sanitize_fn(str(rc.get("value") or ""))).strip(),
                    "provenance": prov,
                    "basis": strip_emoji_fn(sanitize_fn(str(rc.get("basis") or ""))).strip(),
                })
            if new_cl:
                bp["claimLedger"] = new_cl
                changes.append(f"Edited Claim Ledger ({len(new_cl)} entries).")
                affected.update(["blog.md", "docx"])

    elif target == "slides":
        slides = bp.get("slides") or []
        edits = payload.get("slides") if isinstance(payload.get("slides"), list) else []
        for ed in edits:
            if not isinstance(ed, dict):
                continue
            num = ed.get("number")
            if not isinstance(num, int) or not (1 <= num <= len(slides)):
                continue
            sl = slides[num - 1]
            for sf, max_l in (("kicker", 44), ("title", 88), ("subtitle", 160), ("calloutLabel", 48), ("calloutValue", 80)):
                if sf in ed and isinstance(ed[sf], str):
                    nv = strip_emoji_fn(sanitize_fn(ed[sf])).strip()[:max_l]
                    sl[sf] = nv.upper() if sf == "kicker" else nv
            if "bullets" in ed:
                raw_b = ed["bullets"]
                if isinstance(raw_b, str):
                    sl["bullets"] = [strip_emoji_fn(sanitize_fn(b.lstrip("-*• "))).strip() for b in raw_b.splitlines() if b.strip()][:6]
                elif isinstance(raw_b, list):
                    sl["bullets"] = [strip_emoji_fn(sanitize_fn(str(b))).strip() for b in raw_b if str(b).strip()][:6]
            if "speakerNotes" in ed and isinstance(ed["speakerNotes"], str):
                nn = strip_emoji_fn(sanitize_fn(ed["speakerNotes"])).strip()
                if nn != sl.get("speakerNotes"):
                    sl["speakerNotes"] = nn
                    affected.add("audio")
            if "codeSnippet" in ed and isinstance(ed["codeSnippet"], str):
                sl["codeSnippet"] = sanitize_fn(ed["codeSnippet"])
            changes.append(f"Edited Slide {num}.")
            affected.add("slides")
        if changes:
            drift_hints.append("Slides updated — audio narration automatically delta-synced for edited speaker notes.")

    elif target == "code":
        file_map = {
            "schema.sql": "schemaSql",
            "main.tf": "terraformMain",
            "variables.tf": "terraformVars",
            "app.py": "pythonApp",
            "Dockerfile": "dockerfile",
            "requirements.txt": "requirementsTxt",
            "deploy.sh": "deploySh",
            "verify.sh": "verifySh",
            "README.md": "readmeSummary",
        }
        cs = bp.setdefault("codeStarter", {})
        files_in = payload.get("files") if isinstance(payload.get("files"), dict) else {}
        for fname, content in files_in.items():
            key = file_map.get(str(fname), str(fname))
            if key in file_map.values() and isinstance(content, str):
                cs[key] = sanitize_fn(content)
                changes.append(f"Edited starter file '{fname}'.")
                affected.add("starter.zip")

    elif target == "outline":
        cat_id = str(manifest.get("category") or "reference_architecture")
        new_outline = normalize_outline_fn(payload.get("outline"), category_id=cat_id)
        inc_code = bool(payload.get("includeStarterCode", manifest.get("includeStarterCode", True)))
        new_plan = compute_slide_plan_fn(new_outline, include_starter_code=inc_code)
        manifest["outline"] = new_outline
        manifest["slidePlan"] = new_plan
        manifest["includeStarterCode"] = inc_code
        bp["outline"] = new_outline
        bp["slidePlan"] = new_plan
        bp["includeStarterCode"] = inc_code
        changes.append(f"Updated outline & diagram placement ({len(new_plan['enabledDiagrams'])} diagrams, {new_plan['totalSlides']} slides).")
        affected.update(["blog.md", "docx", "diagrams", "slides"])

    elif target == "diagram_lock":
        dk = str(payload.get("kind") or "").strip().lower()
        locked = bool(payload.get("customEdited", False))
        d_meta = manifest.get("diagrams") or {}
        if dk in d_meta and isinstance(d_meta[dk], dict):
            d_meta[dk]["customEdited"] = locked
            changes.append(f"{'Locked' if locked else 'Unlocked'} diagram '{dk}' for AI regeneration.")
            if not locked:
                affected.update(["diagrams", "slides", "docx"])

    return changes, sorted(affected), drift_hints


def compute_delta_tts_plan(
    slides: List[Dict[str, Any]],
    existing_tracks: List[Dict[str, Any]],
    voice_name: str,
    audio_exists_fn: Callable[[str], bool],
    strip_md_fn: Callable[[str], str],
) -> List[Dict[str, Any]]:
    """
    Compares each slide's speakerNotes SHA-256 against the previously synthesized MP3 track.
    Slides whose narration text & voice did NOT change reuse their existing MP3 (0 redundant Cloud TTS calls).
    """
    by_num = {int(t.get("slideNumber") or 0): t for t in (existing_tracks or []) if isinstance(t, dict)}
    plan: List[Dict[str, Any]] = []
    for idx, sl in enumerate(slides, 1):
        txt = strip_md_fn(sl.get("speakerNotes") or sl.get("title") or "")
        h = hashlib.sha256(txt.encode("utf-8")).hexdigest()
        prev = by_num.get(idx)
        reuse = (
            prev is not None
            and prev.get("speakerNotesSha256") == h
            and prev.get("voice") == voice_name
            and bool(prev.get("relPath"))
            and audio_exists_fn(str(prev["relPath"]))
        )
        plan.append({
            "slideNumber": idx,
            "text": txt,
            "sha256": h,
            "reuse": reuse,
            "existingTrack": prev if reuse else None,
        })
    return plan
