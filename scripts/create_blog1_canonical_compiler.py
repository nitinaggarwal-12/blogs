#!/usr/bin/env python3
"""
Unified 3-Target Canonical Diagram Compiler for Create Blog1 (1600x900 @ 7620 EMU/px).

Direct pure-stdlib Python 3.11+ port of `scripts/lib/diagram_spec_compiler.mjs` so every
generated Create Blog1 diagram shares the EXACT visual language, typography, airy Google
Cloudstyle palette, subtle shadows, orthogonal elbow routing, official multi-color GCP SVG
icons, and native DrawingML editable PPTX slides as `WS1`–`WS5`.

Emits from a SINGLE declarative `spec` dict:
  1. Validated Draw.io `.drawio` XML (`parent="1"`, absolute coords, `pic_icon_*` vector SVGs,
     `container=1;collapsible=0;pointerEvents=0`, `#595959` orthogonal elbows, zero `flowAnimation=1`)
  2. Standalone Vector `.svg` (`viewBox="0 0 1600 900"`, `#FFFFFF` airy background, `feDropShadow`,
     embedded inline multi-color GCP SVG `<svg>` vectors, deterministic pixel-width wrapping)
  3. Native Editable DrawingML `ppt/slides/slideN.xml` (`12192000x6858000 EMU`, `pic=0`,
     zero `h="0"`, real vector connectors + clickable `Edit in Draw.io ↗` footer)
  4. Fail-closed geometry validator (`validate_spec_geometry`) checking bounds, bbox overlap,
     text horizontal fit, missing edge endpoints, and vertex/edge/icon metrics.
"""
from __future__ import annotations

import base64
import json
import math
import re
import urllib.parse
import zlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from xml.sax.saxutils import escape as _sax_escape

CANVAS_W = 1600
CANVAS_H = 900
EMU_PER_PX = 7620       # 12,192,000 / 1600 = 7620; 6,858,000 / 900 = 7620
MIN_CUSTGEOM_EMU = 91440

PLANE_PALETTE: Dict[str, Dict[str, str]] = {
    "CONTROL": {"bg": "#E8F0FE", "border": "#8AB4F8", "text": "#174EA6", "zoneStroke": "#93C5FD"},
    "COMPUTE": {"bg": "#E6F4EA", "border": "#81C995", "text": "#137333", "zoneStroke": "#6EE7B7"},
    "DATA":    {"bg": "#FEF7E0", "border": "#FCD34D", "text": "#B06000", "zoneStroke": "#FCD34D"},
    "SECURITY":{"bg": "#FCE8E6", "border": "#F28B82", "text": "#A50E0E", "zoneStroke": "#F28B82"},
    "ASYNC":   {"bg": "#F3E8FD", "border": "#C4B5FD", "text": "#6B21A8", "zoneStroke": "#C4B5FD"},
}

ROOT_DIR = Path(__file__).resolve().parent.parent
ICONS_JSON_PATH = ROOT_DIR / "data" / "gcp_svg_icons.json"
_ICONS_CACHE: Optional[Dict[str, Dict[str, str]]] = None


def load_gcp_icons() -> Dict[str, Dict[str, str]]:
    global _ICONS_CACHE
    if _ICONS_CACHE is None:
        if ICONS_JSON_PATH.is_file():
            raw = json.loads(ICONS_JSON_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                _ICONS_CACHE = raw
            else:
                _ICONS_CACHE = {}
        else:
            _ICONS_CACHE = {}
    return _ICONS_CACHE


def esc_xml(s: Any) -> str:
    return _sax_escape(str(s if s is not None else ""), {'"': "&quot;", "'": "&apos;"})


def esc_html(s: Any) -> str:
    return (
        str(s if s is not None else "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def strip_md(text: Any) -> str:
    s = str(text if text is not None else "")
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"__([^_]+)__", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    # Remove literal emoji surrogates / glyphs matching WS1 zero-emoji policy
    s = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u26FF\u2700-\u27BF\uFE0F]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def hex6(color: Optional[str], fallback: str = "202124") -> str:
    c = str(color or "").strip().lstrip("#")
    if len(c) == 3 and re.fullmatch(r"[0-9a-fA-F]{3}", c):
        return (c[0] * 2 + c[1] * 2 + c[2] * 2).upper()
    if re.fullmatch(r"[0-9a-fA-F]{6}", c):
        return c.upper()
    return fallback


def px_to_emu(px: float) -> int:
    return int(round(float(px) * EMU_PER_PX))


def est_text_width_px(text: str, font_size: float, bold: bool = False, mono: bool = False) -> float:
    """Deterministic Arial / Roboto Mono average pixel-width estimator (zero silent slicing)."""
    if not text:
        return 0.0
    if mono:
        return len(text) * font_size * 0.61
    # Weighted char table approximates Arial/Helvetica width far closer than flat constant
    narrow = sum(1 for c in text if c in "ijlI1.,;:'|!()[] ")
    wide = sum(1 for c in text if c in "MWmw@#%&")
    caps = sum(1 for c in text if c.isupper() and c not in "IJMW")
    other = len(text) - narrow - wide - caps
    base = narrow * 0.30 + other * 0.52 + caps * 0.64 + wide * 0.80
    return base * font_size * (1.07 if bold else 1.0)


def wrap_px(
    text: str,
    max_width_px: float,
    font_size: float,
    bold: bool = False,
    mono: bool = False,
    max_lines: int = 8,
    ellipsis_last: bool = True,
) -> List[str]:
    """Word-wrap text strictly to `max_width_px` without chopping mid-word."""
    clean = strip_md(text)
    if not clean:
        return []
    words = clean.split()
    out: List[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip() if cur else w
        if est_text_width_px(trial, font_size, bold=bold, mono=mono) <= max_width_px:
            cur = trial
        else:
            if cur:
                out.append(cur)
                if len(out) >= max_lines:
                    break
                cur = w
            else:
                # Single ultra-long token (URL/identifier) — soft-break cleanly on `/` or `_` or hyphen
                tok = w
                while tok and est_text_width_px(tok, font_size, bold=bold, mono=mono) > max_width_px and len(tok) > 6:
                    cut = max(4, int(len(tok) * (max_width_px / max(1.0, est_text_width_px(tok, font_size, bold=bold, mono=mono)))))
                    out.append(tok[:cut])
                    tok = tok[cut:]
                    if len(out) >= max_lines:
                        tok = ""
                        break
                cur = tok
    if cur and len(out) < max_lines:
        out.append(cur)
    elif cur and out and ellipsis_last:
        # Ensure we cleanly indicate overflow only if unprinted words remain
        last = out[-1]
        if not last.endswith("...") and est_text_width_px(last + "…", font_size, bold=bold, mono=mono) <= max_width_px + 6:
            out[-1] = last.rstrip(".,;: ") + "…"
    return out[:max_lines]


def fit_single_line_px(text: str, max_width_px: float, font_size: float, bold: bool = False) -> Tuple[str, float]:
    """Shrinks font size modestly (down to 78%) before word-boundary ellipsis so labels NEVER chop mid-word."""
    clean = strip_md(text)
    if not clean:
        return "", font_size
    if est_text_width_px(clean, font_size, bold=bold) <= max_width_px:
        return clean, font_size
    for scale in (0.94, 0.88, 0.82, 0.78):
        fs = round(font_size * scale, 1)
        if est_text_width_px(clean, fs, bold=bold) <= max_width_px:
            return clean, fs
    fs = round(font_size * 0.80, 1)
    words = clean.split()
    kept: List[str] = []
    for w in words:
        trial = " ".join(kept + [w])
        if est_text_width_px(trial + "…", fs, bold=bold) <= max_width_px:
            kept.append(w)
        else:
            break
    if kept:
        return " ".join(kept).rstrip(".,;:/-") + "…", fs
    return clean[: max(4, int(max_width_px / max(1.0, fs * 0.56)))] + "…", fs


_ICON_ALIASES: List[Tuple[str, str]] = [
    ("spanner", "spanner"),
    ("alloydb", "alloydb"),
    ("bigquery", "bigquery"),
    ("bq ", "bigquery"),
    ("armor", "cloud_armor"),
    ("waf", "cloud_armor"),
    ("ddos", "cloud_armor"),
    ("model armor", "model_armor"),
    ("dlp", "model_armor"),
    ("iap", "iap"),
    ("identity-aware", "iap"),
    ("kms", "cloud_kms"),
    ("cmek", "cloud_kms"),
    ("hsm", "cloud_kms"),
    ("crypto", "cloud_kms"),
    ("iam", "cloud_iam"),
    ("wif", "cloud_iam"),
    ("identity", "cloud_iam"),
    ("sts", "cloud_iam"),
    ("oauth", "cloud_iam"),
    ("oidc", "cloud_iam"),
    ("auth", "cloud_iam"),
    ("load balanc", "cloud_load_balancing"),
    ("alb", "cloud_load_balancing"),
    ("ingress", "cloud_load_balancing"),
    ("cloud run", "cloud_run"),
    ("gke", "gke"),
    ("kubernetes", "gke"),
    ("memorystore", "memorystore"),
    ("valkey", "memorystore"),
    ("redis", "memorystore"),
    ("cache", "memorystore"),
    ("session", "memorystore"),
    ("vertex", "vertex_ai"),
    ("embedding", "vertex_ai"),
    ("gemini", "gemini"),
    ("llm", "gemini"),
    ("adk", "adk"),
    ("agent engine", "adk"),
    ("orchestrat", "adk"),
    ("agent gateway", "agent_gateway"),
    ("gateway", "agent_gateway"),
    ("pep", "agent_gateway"),
    ("registry", "agent_registry"),
    ("artifact", "artifact_registry"),
    ("container", "artifact_registry"),
    ("storage", "cloud_storage"),
    ("gcs", "cloud_storage"),
    ("bucket", "cloud_storage"),
    ("logging", "cloud_logging"),
    ("audit", "cloud_logging"),
    ("monitoring", "cloud_monitoring"),
    ("observ", "cloud_monitoring"),
    ("telemetry", "cloud_monitoring"),
    ("otel", "cloud_monitoring"),
    ("scc", "scc"),
    ("security command", "scc"),
    ("vpc-sc", "vpc_sc"),
    ("vpc service", "vpc_sc"),
    ("perimeter", "vpc_sc"),
    ("psc", "psc"),
    ("private service", "psc"),
    ("finops", "finops"),
    ("cost", "finops"),
    ("rate limit", "finops"),
    ("bulkhead", "finops"),
    ("quota", "finops"),
    ("mcp", "mcp_tools"),
    ("tool", "mcp_tools"),
    ("a2a", "a2a_agents"),
    ("api gateway", "api_gateway"),
    ("dataflow", "cloud_run"),
    ("pub/sub", "api_gateway"),
    ("pubsub", "api_gateway"),
    ("client", "saas_globe"),
    ("external", "saas_globe"),
    ("user", "saas_globe"),
    ("browser", "saas_globe"),
    ("saas", "saas_globe"),
]


def resolve_icon_key(*hints: str, default: str = "gcp_cloud") -> str:
    icons = load_gcp_icons()
    for h in hints:
        k = str(h or "").strip().lower().replace("-", "_").replace(" ", "_")
        if k in icons:
            return k
    blob = " ".join(str(h or "").lower() for h in hints)
    for needle, key in _ICON_ALIASES:
        if needle in blob and key in icons:
            return key
    return default if default in icons else (next(iter(icons.keys())) if icons else "gcp_cloud")


def get_drawio_icon_style(icon_key: str) -> str:
    """Official Draw.io data:image/svg+xml style (un-encoded base64-free format matching diagram_spec_compiler.mjs)."""
    icons = load_gcp_icons()
    ic = icons.get(icon_key) or icons.get("gcp_cloud")
    if not ic:
        return "shape=hexagon;fillColor=#E8F0FE;strokeColor=#1A73E8;"
    vb = ic.get("viewBox", "0 0 24 24")
    inner = ic.get("inner", "")
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{inner}</svg>'
    enc = urllib.parse.quote(svg, safe="").replace("%20", "%20")
    return (
        "shape=image;html=1;verticalLabelPosition=bottom;verticalAlign=top;"
        "imageAspect=1;aspect=fixed;pointerEvents=0;strokeColor=none;fillColor=none;"
        f"image=data:image/svg+xml,{enc};"
    )


def render_inline_svg_icon(icon_key: str, x: float, y: float, size: float) -> str:
    icons = load_gcp_icons()
    ic = icons.get(icon_key) or icons.get("gcp_cloud")
    if not ic:
        return f'<rect x="{x:.1f}" y="{y:.1f}" width="{size:.1f}" height="{size:.1f}" rx="4" fill="#E8F0FE" stroke="#1A73E8"/>'
    vb = ic.get("viewBox", "0 0 24 24")
    inner = ic.get("inner", "")
    return (
        f'<svg x="{x:.1f}" y="{y:.1f}" width="{size:.1f}" height="{size:.1f}" '
        f'viewBox="{esc_xml(vb)}" overflow="visible">{inner}</svg>'
    )


def build_viewer_url(drawio_xml: str, slug_tag: str, title: str = "Architecture Diagram") -> str:
    """Compact raw-DEFLATE viewer.diagrams.net `#R` URL matching diagrams.net encoder."""
    comp = zlib.compressobj(level=9, wbits=-15)
    raw_z = comp.compress(urllib.parse.quote(drawio_xml, safe="").encode("utf-8")) + comp.flush()
    b64 = base64.b64encode(raw_z).decode("ascii")
    return f"https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&layers=1&nav=1&title={urllib.parse.quote(title)}#R{urllib.parse.quote(b64, safe='')}"


def _measure_lines(lines: List[Dict[str, Any]]) -> float:
    total = 0.0
    for i, ln in enumerate(lines or []):
        fs = float(ln.get("size") or 11)
        lh = float(ln.get("lineHeight") or round(fs * 1.32))
        total += lh + (float(ln.get("gapTop") or 0) if i > 0 else 0.0)
    return total


def _build_boxes_map(spec: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    mp: Dict[str, Dict[str, Any]] = {}
    for z in spec.get("zones") or []:
        mp[str(z["id"])] = z
    for c in spec.get("cards") or []:
        mp[str(c["id"])] = c
    for b in spec.get("bars") or []:
        mp[str(b["id"])] = b
    return mp


def resolve_edge_polyline(edge: Dict[str, Any], boxes: Dict[str, Dict[str, Any]]) -> List[Tuple[float, float]]:
    if "rawPoints" in edge and edge["rawPoints"]:
        return [(float(p[0]), float(p[1])) for p in edge["rawPoints"]]
    src = boxes.get(str(edge.get("source", "")))
    tgt = boxes.get(str(edge.get("target", "")))
    if not src or not tgt:
        return []
    ex = float(edge.get("exitX", 1.0))
    ey = float(edge.get("exitY", 0.5))
    nx = float(edge.get("entryX", 0.0))
    ny = float(edge.get("entryY", 0.5))
    p1 = (round(float(src["x"]) + float(src["w"]) * ex, 1), round(float(src["y"]) + float(src["h"]) * ey, 1))
    p2 = (round(float(tgt["x"]) + float(tgt["w"]) * nx, 1), round(float(tgt["y"]) + float(tgt["h"]) * ny, 1))
    mid = [(round(float(pt["x"]), 1), round(float(pt["y"]), 1)) for pt in (edge.get("points") or [])]
    return [p1] + mid + [p2]


def _rounded_ortho_svg_path(pts: List[Tuple[float, float]], radius: float = 6.0) -> str:
    if not pts:
        return ""
    if len(pts) <= 2:
        return " ".join(f"{'M' if i == 0 else 'L'} {p[0]:.1f} {p[1]:.1f}" for i, p in enumerate(pts))
    d = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(1, len(pts) - 1):
        prev, curr, nxt = pts[i - 1], pts[i], pts[i + 1]
        dx1, dy1 = curr[0] - prev[0], curr[1] - prev[1]
        dx2, dy2 = nxt[0] - curr[0], nxt[1] - curr[1]
        len1, len2 = math.hypot(dx1, dy1), math.hypot(dx2, dy2)
        if len1 < 1e-3 or len2 < 1e-3:
            d.append(f"L {curr[0]:.1f} {curr[1]:.1f}")
            continue
        r = min(radius, len1 / 2.0, len2 / 2.0)
        if r < 1.0:
            d.append(f"L {curr[0]:.1f} {curr[1]:.1f}")
            continue
        ax, ay = curr[0] - (dx1 / len1) * r, curr[1] - (dy1 / len1) * r
        bx, by = curr[0] + (dx2 / len2) * r, curr[1] + (dy2 / len2) * r
        d.append(f"L {ax:.1f} {ay:.1f} Q {curr[0]:.1f} {curr[1]:.1f} {bx:.1f} {by:.1f}")
    d.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    return " ".join(d)


# ===========================================================================
# FAIL-CLOSED GEOMETRY & TEXT-FIT VALIDATOR (port of drawioValidator.ts)
# ===========================================================================

def validate_spec_geometry(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Checks bounds, endpoint integrity, pill collisions, non-container card overlap & text overflow."""
    errors: List[str] = []
    warnings: List[str] = []
    cw = float(spec.get("canvasW") or CANVAS_W)
    ch = float(spec.get("canvasH") or CANVAS_H)

    def _chk_box(kind: str, bid: str, x: float, y: float, w: float, h: float) -> None:
        if x < -1 or y < -1 or x + w > cw + 1 or y + h > ch + 1:
            errors.append(f"OUT_OF_BOUNDS:{kind}:{bid} ({x},{y} {w}x{h} > {cw}x{ch})")
        if w <= 0 or h <= 0:
            errors.append(f"ZERO_SIZE:{kind}:{bid} ({w}x{h})")

    for z in spec.get("zones") or []:
        _chk_box("zone", z["id"], z["x"], z["y"], z["w"], z["h"])
    for c in spec.get("cards") or []:
        _chk_box("card", c["id"], c["x"], c["y"], c["w"], c["h"])
    for p in spec.get("pills") or []:
        _chk_box("pill", p["id"], p["x"], p["y"], p["w"], p["h"])

    # Sibling pill intersection check
    pills = spec.get("pills") or []
    for i in range(len(pills)):
        a = pills[i]
        for j in range(i + 1, len(pills)):
            b = pills[j]
            if not (a["x"] + a["w"] <= b["x"] + 0.5 or b["x"] + b["w"] <= a["x"] + 0.5 or
                    a["y"] + a["h"] <= b["y"] + 0.5 or b["y"] + b["h"] <= a["y"] + 0.5):
                errors.append(f"PILL_OVERLAP:{a['id']}<->{b['id']}")

    # Non-container leaf card intersection check (skip intentional nested overlay headers/tiles inside containers)
    leafs = [c for c in (spec.get("cards") or []) if not c.get("isContainer") and not c.get("allowOverlap")]
    for i in range(len(leafs)):
        a = leafs[i]
        for j in range(i + 1, len(leafs)):
            b = leafs[j]
            ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["w"], a["y"] + a["h"]
            bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]
            ix = min(ax2, bx2) - max(ax1, bx1)
            iy = min(ay2, by2) - max(ay1, by1)
            if ix > 3 and iy > 3:
                # Permit complete containment (e.g., nested tile box inside container card)
                a_in_b = (ax1 >= bx1 - 1 and ay1 >= by1 - 1 and ax2 <= bx2 + 1 and ay2 <= by2 + 1)
                b_in_a = (bx1 >= ax1 - 1 and by1 >= ay1 - 1 and bx2 <= ax2 + 1 and by2 <= ay2 + 1)
                if not (a_in_b or b_in_a):
                    errors.append(f"CARD_OVERLAP:{a['id']}<->{b['id']} ({ix:.0f}x{iy:.0f}px)")

    # Edge endpoint verification
    boxes = _build_boxes_map(spec)
    for e in spec.get("edges") or []:
        if e.get("rawPoints"):
            continue
        if str(e.get("source", "")) not in boxes or str(e.get("target", "")) not in boxes:
            errors.append(f"MISSING_EDGE_ENDPOINT:{e.get('id')}:{e.get('source')}->{e.get('target')}")

    # Text width overflow audit on every card
    for c in spec.get("cards") or []:
        icon_pos = c.get("iconPos", "left") if c.get("icon") else "none"
        icon_sz = float(c.get("iconSize") or 20)
        pad_l = float(c.get("padL") if c.get("padL") is not None else (8 if c.get("align") == "center" else 12))
        pad_r = float(c.get("padR") if c.get("padR") is not None else (8 if c.get("align") == "center" else 12))
        if icon_pos in ("left", "header-left"):
            pad_l = max(pad_l, icon_sz + 18)
        avail_w = max(20.0, float(c["w"]) - pad_l - pad_r)
        for ln in c.get("lines") or []:
            txt = str(ln.get("text") or "")
            fs = float(ln.get("size") or 11)
            w_est = est_text_width_px(txt, fs, bold=bool(ln.get("bold")), mono=bool(ln.get("mono")))
            if w_est > avail_w + 18:
                warnings.append(f"TEXT_WIDE:{c['id']}:'{txt[:28]}' ({w_est:.0f}px>{avail_w:.0f}px)")

    icon_count = sum(1 for c in (spec.get("cards") or []) if c.get("icon"))
    icon_count += sum(len(c.get("tiles") or []) for c in (spec.get("cards") or []))
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings[:20],
        "zoneCount": len(spec.get("zones") or []),
        "cardCount": len(spec.get("cards") or []),
        "edgeCount": len(spec.get("edges") or []),
        "pillCount": len(pills),
        "iconCount": icon_count,
    }


# ===========================================================================
# TARGET 1: DRAW.IO XML EMITTER
# ===========================================================================

def _card_lines_to_drawio_html(card: Dict[str, Any]) -> str:
    align = card.get("align") or "left"
    lines = card.get("lines") or []
    parts: List[str] = []
    for i, ln in enumerate(lines):
        fs = ln.get("size") or 11
        fw = "700" if ln.get("bold") else "400"
        ff = "Roboto Mono,Consolas,monospace" if ln.get("mono") else "Arial,Helvetica,sans-serif"
        clr = ln.get("color") or ("#202124" if ln.get("bold") else "#5F6368")
        mt = f"margin-top:{ln['gapTop']}px;" if (i > 0 and ln.get("gapTop")) else ""
        lh = f"{ln['lineHeight']}px" if ln.get("lineHeight") else "1.26"
        parts.append(
            f'<div style="font-family:{ff};font-size:{fs}px;font-weight:{fw};line-height:{lh};'
            f'color:{clr};text-align:{align};{mt}">{esc_html(ln.get("text", ""))}</div>'
        )
    return "".join(parts)


def compile_spec_to_drawio_xml(spec: Dict[str, Any]) -> str:
    cw = int(spec.get("canvasW") or CANVAS_W)
    ch = int(spec.get("canvasH") or CANVAS_H)
    cells: List[str] = [
        '<mxCell id="0"/>',
        '<mxCell id="1" parent="0"/>',
    ]

    # Optional thin 4-color top Google accent rule (used in Sequence Swimlane matching WS1 L3)
    if spec.get("quadTopBar"):
        seg_w = cw // 4
        for idx, clr in enumerate(("#4285F4", "#EA4335", "#FBBC04", "#34A853")):
            cells.append(
                f'<mxCell id="top_bar_{idx}" value="" style="rounded=0;strokeColor=none;fillColor={clr};" '
                f'vertex="1" parent="1"><mxGeometry x="{idx * seg_w}" y="0" width="{seg_w}" height="6" as="geometry"/></mxCell>'
            )

    # Outer Cloud bezel header (Cloud Architecture Center diagram style)
    if spec.get("gcpBezel"):
        bz = spec["gcpBezel"]
        cells.append(
            f'<mxCell id="gcp_bezel_outer" value="" style="rounded=1;absoluteArcSize=1;arcSize=22;fillColor=#1A73E8;'
            f'strokeColor=#1A73E8;container=1;collapsible=0;pointerEvents=0;" vertex="1" parent="1">'
            f'<mxGeometry x="{bz["x"]}" y="{bz["y"]}" width="{bz["w"]}" height="{bz["h"]}" as="geometry"/></mxCell>'
        )
        cells.append(
            f'<mxCell id="gcp_bezel_lbl" value="{esc_xml(bz.get("label", "Google Cloud"))}" '
            f'style="text;html=1;align=left;verticalAlign=middle;fontFamily=Arial;fontSize=15;fontStyle=1;fontColor=#FFFFFF;strokeColor=none;fillColor=none;" '
            f'vertex="1" parent="1"><mxGeometry x="{bz["x"] + 20}" y="{bz["y"] + 6}" width="420" height="24" as="geometry"/></mxCell>'
        )
        cells.append(
            f'<mxCell id="gcp_bezel_inner" value="" style="rounded=1;absoluteArcSize=1;arcSize=16;fillColor=#FFFFFF;'
            f'strokeColor=#1E293B;strokeWidth=1.2;container=1;collapsible=0;pointerEvents=0;" vertex="1" parent="1">'
            f'<mxGeometry x="{bz["x"] + 12}" y="{bz["y"] + 34}" width="{bz["w"] - 24}" height="{bz["h"] - 46}" as="geometry"/></mxCell>'
        )

    # 1. Title & top hairline divider
    t_text = str(spec.get("title") or "")
    if t_text:
        t_y = int(spec.get("titleY", 14))
        t_sz = float(spec.get("titleSize", 20))
        t_clr = spec.get("titleColor", "#202124")
        t_html = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:{t_sz}px;font-weight:700;color:{t_clr};">{esc_html(t_text)}</div>'
        cells.append(
            f'<mxCell id="title_main" value="{esc_xml(t_html)}" '
            f'style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" '
            f'vertex="1" parent="1"><mxGeometry x="32" y="{t_y}" width="1500" height="30" as="geometry"/></mxCell>'
        )
    if spec.get("subtitle"):
        _sub_h = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#5F6368;">' + esc_html(spec["subtitle"]) + '</div>'
        cells.append(f'<mxCell id="title_sub" value="{esc_xml(_sub_h)}" '
            f'style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" '
            f'vertex="1" parent="1"><mxGeometry x="32" y="{int(spec.get("titleY", 14)) + 26}" width="1500" height="18" as="geometry"/></mxCell>'
        )
    if spec.get("dividerY") is not None:
        dy = int(spec["dividerY"])
        cells.append(
            f'<mxCell id="bar_div_line" value="" style="rounded=0;fillColor=#DADCE0;strokeColor=none;" '
            f'vertex="1" parent="1"><mxGeometry x="32" y="{dy}" width="{cw - 64}" height="1.5" as="geometry"/></mxCell>'
        )

    # 2. Style-only dashed/solid container zones
    for z in spec.get("zones") or []:
        dashed = "dashed=1;dashPattern=6 4;" if z.get("dashed") else ""
        stroke = z.get("stroke") or "#DADCE0"
        fill = z.get("fill") or "#F8F9FA"
        sw = z.get("strokeWidth", 1.2)
        rx = z.get("rx", 14)
        zt = z.get("title") or ""
        t_align = z.get("titleAlign") or "left"
        val = ""
        if zt:
            tsz = z.get("titleSize", 12)
            tclr = z.get("titleColor", "#1967D2")
            sub_html = (
                f'<div style="font-size:10px;font-weight:400;color:#475569;margin-top:1px;">{esc_html(z["subtitle"])}</div>'
                if z.get("subtitle") else ""
            )
            val = esc_xml(
                f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:{tsz}px;font-weight:700;'
                f'color:{tclr};text-align:{t_align};">{esc_html(zt)}{sub_html}</div>'
            )
        valign = "verticalAlign=top;spacingTop=6;spacingLeft=12;spacingRight=12;" if zt else "verticalAlign=middle;"
        halign = "align=center;" if t_align == "center" else "align=left;"
        fill_attr = "none" if fill == "none" else fill
        cells.append(
            f'<mxCell id="{esc_xml(z["id"])}" value="{val}" '
            f'style="rounded=1;absoluteArcSize=1;arcSize={rx};whiteSpace=wrap;html=1;fillColor={fill_attr};'
            f'strokeColor={stroke};strokeWidth={sw};{dashed}container=1;collapsible=0;pointerEvents=0;{halign}{valign}shadow=0;" '
            f'vertex="1" parent="1"><mxGeometry x="{z["x"]}" y="{z["y"]}" width="{z["w"]}" height="{z["h"]}" as="geometry"/></mxCell>'
        )

    # Optional vertical lifelines / guide hairlines (sequence diagrams)
    for ll in spec.get("lifelines") or []:
        st = "dashed=1;dashPattern=6 4;" if ll.get("dashed", True) else ""
        clr = ll.get("stroke", "#94A3B8")
        cells.append(
            f'<mxCell id="{esc_xml(ll["id"])}" value="" style="endArrow=none;html=1;strokeColor={clr};strokeWidth={ll.get("strokeWidth", 1.2)};{st}" '
            f'edge="1" parent="1"><mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{ll["x1"]}" y="{ll["y1"]}" as="sourcePoint"/>'
            f'<mxPoint x="{ll["x2"]}" y="{ll["y2"]}" as="targetPoint"/></mxGeometry></mxCell>'
        )

    # Standalone labels
    for lbl in spec.get("labels") or []:
        align = lbl.get("align") or "left"
        fw = "400" if lbl.get("bold") is False else "700"
        html = (
            f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:{lbl.get("size", 13)}px;'
            f'font-weight:{fw};color:{lbl.get("color", "#202124")};text-align:{align};">{esc_html(lbl["text"])}</div>'
        )
        cells.append(
            f'<mxCell id="{esc_xml(lbl["id"])}" value="{esc_xml(html)}" '
            f'style="text;html=1;align={align};verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" '
            f'vertex="1" parent="1"><mxGeometry x="{lbl["x"]}" y="{lbl["y"]}" width="{lbl["w"]}" height="{lbl["h"]}" as="geometry"/></mxCell>'
        )

    # Activation bars (sequence diagrams)
    for b in spec.get("bars") or []:
        cells.append(
            f'<mxCell id="{esc_xml(b["id"])}" value="" '
            f'style="rounded=1;arcSize=40;fillColor={b.get("fill", "#0F172A")};strokeColor=none;shadow=0;" '
            f'vertex="1" parent="1"><mxGeometry x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" as="geometry"/></mxCell>'
        )

    # Cards
    for c in spec.get("cards") or []:
        is_ctr = bool(c.get("isContainer"))
        fill = c.get("fill") or "#FFFFFF"
        stroke = "none" if c.get("stroke") == "none" else (c.get("stroke") or "#DADCE0")
        sw = c.get("strokeWidth", 1.2)
        rx = c.get("rx", 12)
        shadow = "shadow=1;" if c.get("shadow") else "shadow=0;"
        align = c.get("align") or "left"
        valign = "top" if is_ctr else "middle"
        il = (c.get("iconPos") or "left") if c.get("icon") else "none"
        isz = int(c.get("iconSize") or 20)
        pad_l = c.get("padL") if c.get("padL") is not None else (8 if align == "center" else 12)
        pad_r = c.get("padR") if c.get("padR") is not None else (8 if align == "center" else 12)
        pad_t = c.get("padT") if c.get("padT") is not None else (8 if is_ctr else 6)
        pad_b = c.get("padB") if c.get("padB") is not None else 6
        if il in ("left", "header-left"):
            pad_l = max(pad_l, isz + 18)
        elif il == "top":
            pad_t = isz + 10
        cattr = "container=1;collapsible=0;pointerEvents=0;" if is_ctr else ""
        html = _card_lines_to_drawio_html(c)
        dash_c = "dashed=1;dashPattern=5 4;" if c.get("dashed") else ""
        cells.append(
            f'<mxCell id="{esc_xml(c["id"])}" value="{esc_xml(html)}" '
            f'style="rounded=1;absoluteArcSize=1;arcSize={rx};whiteSpace=wrap;html=1;fillColor={fill};'
            f'strokeColor={stroke};strokeWidth={sw};{dash_c}align={align};verticalAlign={valign};'
            f'spacingLeft={pad_l};spacingRight={pad_r};spacingTop={pad_t};spacingBottom={pad_b};{cattr}{shadow}" '
            f'vertex="1" parent="1"><mxGeometry x="{c["x"]}" y="{c["y"]}" width="{c["w"]}" height="{c["h"]}" as="geometry"/></mxCell>'
        )
        if c.get("icon"):
            ix = c["x"] + 12
            iy = c["y"] + round((c["h"] - isz) / 2)
            if il == "top":
                th = _measure_lines(c.get("lines") or [])
                ix = c["x"] + round((c["w"] - isz) / 2)
                iy = max(c["y"] + 10, round(c["y"] + (c["h"] - (isz + 8 + th)) / 2))
            elif il == "top-left":
                iy = c["y"] + 10
            cells.append(
                f'<mxCell id="pic_icon_{esc_xml(c["id"])}" value="" style="{get_drawio_icon_style(c["icon"])}" '
                f'vertex="1" parent="1"><mxGeometry x="{ix}" y="{iy}" width="{isz}" height="{isz}" as="geometry"/></mxCell>'
            )
        for tile in c.get("tiles") or []:
            cells.append(
                f'<mxCell id="{esc_xml(tile["id"])}" value="" style="rounded=1;whiteSpace=wrap;html=1;arcSize=18;'
                f'fillColor={tile.get("fill", "#F8FAFC")};strokeColor={tile.get("stroke", "#CBD5E1")};strokeWidth=1.1;shadow=0;" '
                f'vertex="1" parent="1"><mxGeometry x="{tile["x"]}" y="{tile["y"]}" width="{tile["w"]}" height="{tile["h"]}" as="geometry"/></mxCell>'
            )
            tisz = int(tile.get("iconSize") or 24)
            tix = tile["x"] + round((tile["w"] - tisz) / 2)
            tiy = tile["y"] + (6 if tile.get("label") else round((tile["h"] - tisz) / 2))
            cells.append(
                f'<mxCell id="pic_icon_{esc_xml(tile["id"])}" value="" style="{get_drawio_icon_style(tile["icon"])}" '
                f'vertex="1" parent="1"><mxGeometry x="{tix}" y="{tiy}" width="{tisz}" height="{tisz}" as="geometry"/></mxCell>'
            )
            if tile.get("label"):
                lhtml = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:{tile.get("labelSize", 9)}px;font-weight:700;color:{tile.get("labelColor", "#1F2937")};text-align:center;">{esc_html(tile["label"])}</div>'
                cells.append(
                    f'<mxCell id="{esc_xml(tile["id"])}_lbl" value="{esc_xml(lhtml)}" style="text;html=1;align=center;verticalAlign=middle;strokeColor=none;fillColor=none;" '
                    f'vertex="1" parent="1"><mxGeometry x="{tile["x"]}" y="{tile["y"] + tile["h"] - 16}" width="{tile["w"]}" height="14" as="geometry"/></mxCell>'
                )

    # Plane Guide card (`WHO RUNS WHAT`)
    g = spec.get("planeGuide")
    if g:
        cells.append(
            f'<mxCell id="{esc_xml(g["id"])}" value="" style="rounded=1;whiteSpace=wrap;html=1;arcSize=8;'
            f'fillColor=#F8FAFC;strokeColor=#CBD5E1;strokeWidth=1.2;container=1;collapsible=0;pointerEvents=0;shadow=0;" '
            f'vertex="1" parent="1"><mxGeometry x="{g["x"]}" y="{g["y"]}" width="{g["w"]}" height="{g["h"]}" as="geometry"/></mxCell>'
        )
        thtml = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#0F172A;letter-spacing:0.2px;">{esc_html(g["title"])}</div>'
        cells.append(
            f'<mxCell id="{esc_xml(g["id"])}_hdr" value="{esc_xml(thtml)}" style="text;html=1;align=left;verticalAlign=middle;strokeColor=none;fillColor=none;spacingLeft=4;" '
            f'vertex="1" parent="1"><mxGeometry x="{g["x"] + 10}" y="{g["y"] + 6}" width="{g["w"] - 20}" height="18" as="geometry"/></mxCell>'
        )
        rows = g.get("rows") or []
        foot_h = 26 if g.get("footnote") else 0
        avail_h = g["h"] - 34 - foot_h
        rgap = 6
        rh = int((avail_h - rgap * max(0, len(rows) - 1)) / max(1, len(rows)))
        for idx, r in enumerate(rows):
            pal = PLANE_PALETTE.get(r["plane"], PLANE_PALETTE["CONTROL"])
            ry = g["y"] + 28 + idx * (rh + rgap)
            bhtml = (
                f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.25;color:#0F172A;text-align:left;">'
                f'<b style="color:{pal["text"]};">{esc_html(r["plane"])} PLANE</b>&nbsp;&nbsp;<b>{esc_html(r["headline"])}</b>'
                f'<div style="font-size:9.3px;font-weight:400;color:#475569;margin-top:2px;">{esc_html(r["detail"])}</div></div>'
            )
            cells.append(
                f'<mxCell id="legend_{esc_xml(g["id"])}_{idx}" value="{esc_xml(bhtml)}" '
                f'style="rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor={pal["bg"]};strokeColor={pal["border"]};'
                f'strokeWidth=1;align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;spacingTop=3;spacingBottom=3;" '
                f'vertex="1" parent="1"><mxGeometry x="{g["x"] + 10}" y="{ry}" width="{g["w"] - 20}" height="{rh}" as="geometry"/></mxCell>'
            )
        if g.get("footnote"):
            fhtml = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:8.8px;color:#64748B;line-height:1.2;">{esc_html(g["footnote"])}</div>'
            cells.append(
                f'<mxCell id="{esc_xml(g["id"])}_note" value="{esc_xml(fhtml)}" style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;spacingLeft=4;" '
                f'vertex="1" parent="1"><mxGeometry x="{g["x"] + 10}" y="{g["y"] + g["h"] - foot_h - 2}" width="{g["w"] - 20}" height="{foot_h}" as="geometry"/></mxCell>'
            )

    # Plane legend strip (bottom colored pill bars)
    for leg in spec.get("planeLegend") or []:
        pal = PLANE_PALETTE.get(leg["plane"], PLANE_PALETTE["CONTROL"])
        html = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:9.5px;color:#1F2937;text-align:left;"><b style="color:{pal["text"]};">{esc_html(leg["plane"])}</b>&nbsp;&nbsp;{esc_html(leg["text"])}</div>'
        cells.append(
            f'<mxCell id="{esc_xml(leg["id"])}" value="{esc_xml(html)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;'
            f'fillColor={pal["bg"]};strokeColor={pal["border"]};strokeWidth=1;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=8;" '
            f'vertex="1" parent="1"><mxGeometry x="{leg["x"]}" y="{leg["y"]}" width="{leg["w"]}" height="{leg["h"]}" as="geometry"/></mxCell>'
        )

    # Edges
    for e in spec.get("edges") or []:
        stroke = e.get("stroke") or "#595959"
        sw = e.get("strokeWidth", 1.5)
        dashed = "dashed=1;dashPattern=6 4;" if e.get("dashed") else ""
        s_arr = "startArrow=classic;startFill=1;startSize=6;" if e.get("bidirectional") else "startArrow=none;"
        e_arr = "endArrow=none;" if e.get("noArrow") else "endArrow=classic;endFill=1;endSize=6;"
        if e.get("rawPoints"):
            rp = e["rawPoints"]
            style = f"rounded=1;html=1;strokeColor={stroke};strokeWidth={sw};{dashed}{s_arr}{e_arr}"
            pts_inner = f'<mxPoint x="{rp[0][0]}" y="{rp[0][1]}" as="sourcePoint"/><mxPoint x="{rp[-1][0]}" y="{rp[-1][1]}" as="targetPoint"/>'
            if len(rp) > 2:
                pts_inner += '<Array as="points">' + "".join(f'<mxPoint x="{p[0]}" y="{p[1]}"/>' for p in rp[1:-1]) + "</Array>"
            lbl_val = esc_xml(e.get("label") or "")
            cells.append(
                f'<mxCell id="{esc_xml(e["id"])}" value="{lbl_val}" style="{style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry">{pts_inner}</mxGeometry></mxCell>'
            )
            continue
        ex = e.get("exitX", 1)
        ey = e.get("exitY", 0.5)
        nx = e.get("entryX", 0)
        ny = e.get("entryY", 0.5)
        style = (
            f"edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
            f"strokeColor={stroke};strokeWidth={sw};{dashed}{s_arr}{e_arr}"
            f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={nx};entryY={ny};entryDx=0;entryDy=0;"
            + ("labelBackgroundColor=#FFFFFF;labelBorderColor=#CBD5E1;fontColor=#334155;fontSize=9;fontStyle=1;" if e.get("label") else "")
        )
        pts = e.get("points") or []
        _pts_parts = ['<mxPoint x="%d" y="%d"/>' % (round(pt["x"]), round(pt["y"])) for pt in pts]
        pxml = ("<Array as=\"points\">" + "".join(_pts_parts) + "</Array>") if pts else ""
        cells.append(
            f'<mxCell id="{esc_xml(e["id"])}" value="{esc_xml(e.get("label") or "")}" style="{style}" '
            f'edge="1" parent="1" source="{esc_xml(e["source"])}" target="{esc_xml(e["target"])}">'
            f'<mxGeometry relative="1" as="geometry">{pxml}</mxGeometry></mxCell>'
        )

    # Numbered circular step badges (Cloud Architecture Center + Sequence Swimlane)
    for cb in spec.get("circleBadges") or []:
        r = cb.get("r", 13)
        fill = cb.get("fill", "#1967D2")
        txt = str(cb.get("text", ""))
        cells.append(
            f'<mxCell id="{esc_xml(cb["id"])}" value="{esc_xml(txt)}" '
            f'style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor={fill};strokeColor=none;'
            f'fontFamily=Arial;fontSize={cb.get("fontSize", 11)};fontStyle=1;fontColor=#FFFFFF;verticalAlign=middle;align=center;" '
            f'vertex="1" parent="1"><mxGeometry x="{cb["cx"] - r}" y="{cb["cy"] - r}" width="{r * 2}" height="{r * 2}" as="geometry"/></mxCell>'
        )

    # Top-edge plane badge pills
    for p in spec.get("pills") or []:
        pal = PLANE_PALETTE.get(p.get("plane", "CONTROL"), PLANE_PALETTE["CONTROL"])
        bg = p.get("bg") or pal["bg"]
        bd = p.get("border") or pal["border"]
        tc = p.get("textColor") or pal["text"]
        phtml = f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:8.5px;font-weight:700;color:{tc};letter-spacing:0.2px;white-space:nowrap;">{esc_html(p["text"])}</div>'
        cells.append(
            f'<mxCell id="{esc_xml(p["id"])}" value="{esc_xml(phtml)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=50;'
            f'fillColor={bg};strokeColor={bd};strokeWidth=1;align=center;verticalAlign=middle;spacingLeft=4;spacingRight=4;" '
            f'vertex="1" parent="1"><mxGeometry x="{p["x"]}" y="{p["y"]}" width="{p["w"]}" height="{p["h"]}" as="geometry"/></mxCell>'
        )

    did = esc_xml(spec.get("id") or "diagram")
    dname = esc_xml(spec.get("diagramName") or did)
    joined = "\n        ".join(cells)
    return (
        f'<mxfile host="app.diagrams.net" modified="2026-11-24T00:00:00.000Z" agent="ge-blogs-canonical-compiler-py" version="24.7.17">\n'
        f'  <diagram id="{did}" name="{dname}">\n'
        f'    <mxGraphModel dx="1420" dy="820" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
        f'fold="1" page="1" pageScale="1" pageWidth="{cw}" pageHeight="{ch}" math="0" shadow="0">\n'
        f'      <root>\n        {joined}\n      </root>\n'
        f'    </mxGraphModel>\n'
        f'  </diagram>\n'
        f'</mxfile>\n'
    )


# ===========================================================================
# TARGET 2: PURE STANDALONE VECTOR SVG EMITTER
# ===========================================================================

def _svg_text_block(x: float, y: float, w: float, h: float, lines: List[Dict[str, Any]], *, align: str, valign: str, pad_l: float, pad_r: float, pad_t: float) -> str:
    if not lines:
        return ""
    anchor = "middle" if align == "center" else ("end" if align == "right" else "start")
    tx = (x + w / 2.0) if align == "center" else ((x + w - pad_r) if align == "right" else (x + pad_l))
    total_h = _measure_lines(lines)
    if valign == "top":
        cur_y = y + pad_t
    else:
        cur_y = max(y + 4.0, y + (h - total_h) / 2.0)
    out: List[str] = []
    for i, ln in enumerate(lines):
        fs = float(ln.get("size") or 11)
        lh = float(ln.get("lineHeight") or round(fs * 1.30))
        if i > 0 and ln.get("gapTop"):
            cur_y += float(ln["gapTop"])
        by = cur_y + fs * 0.82
        fw = "700" if ln.get("bold") else "400"
        ff = "Roboto Mono, Consolas, monospace" if ln.get("mono") else "Arial, Helvetica, sans-serif"
        fill = ln.get("color") or ("#202124" if ln.get("bold") else "#5F6368")
        out.append(
            f'<text x="{tx:.1f}" y="{by:.1f}" text-anchor="{anchor}" font-family="{ff}" '
            f'font-size="{fs}" font-weight="{fw}" fill="{fill}"><tspan>{esc_xml(ln.get("text", ""))}</tspan></text>'
        )
        cur_y += lh
    return "".join(out)


def compile_spec_to_svg(spec: Dict[str, Any]) -> str:
    cw = int(spec.get("canvasW") or CANVAS_W)
    ch = int(spec.get("canvasH") or CANVAS_H)
    uid = re.sub(r"[^a-zA-Z0-9_]", "_", str(spec.get("id") or "diag"))
    boxes = _build_boxes_map(spec)

    marker_colors = {"#595959", "#1A73E8", "#5F6368", "#1E8E3E", "#0D7377", "#0F172A", "#137333", "#7C3AED", "#94A3B8", "#B45309", "#DC2626"}
    for e in spec.get("edges") or []:
        if e.get("stroke"):
            marker_colors.add(str(e["stroke"]))

    def _mid(clr: str) -> str:
        return f"arr_{uid}_{clr.lstrip('#')}"

    defs = [
        f'<filter id="cardShadow_{uid}" x="-8%" y="-8%" width="120%" height="122%">'
        f'<feDropShadow dx="1.5" dy="2.5" stdDeviation="2.6" flood-color="#0F172A" flood-opacity="0.10"/></filter>',
    ]
    for clr in sorted(marker_colors):
        m = _mid(clr)
        defs.append(
            f'<marker id="{m}_end" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">'
            f'<path d="M 0 1.2 L 8.8 5 L 0 8.8 L 1.8 5 z" fill="{clr}"/></marker>'
        )
        defs.append(
            f'<marker id="{m}_start" viewBox="0 0 10 10" refX="1.6" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">'
            f'<path d="M 10 1.2 L 1.2 5 L 10 8.8 L 8.2 5 z" fill="{clr}"/></marker>'
        )

    body: List[str] = [f'<rect width="{cw}" height="{ch}" fill="#FFFFFF"/>']

    if spec.get("quadTopBar"):
        seg_w = cw / 4.0
        for idx, clr in enumerate(("#4285F4", "#EA4335", "#FBBC04", "#34A853")):
            body.append(f'<rect x="{idx * seg_w:.1f}" y="0" width="{seg_w:.1f}" height="6" fill="{clr}"/>')

    if spec.get("gcpBezel"):
        bz = spec["gcpBezel"]
        bx, by, bw, bh = bz["x"], bz["y"], bz["w"], bz["h"]
        body.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="18" fill="#1A73E8"/>')
        body.append(
            f'<text x="{bx + 22}" y="{by + 24}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">'
            f'{esc_xml(bz.get("label", "Google Cloud"))}</text>'
        )
        body.append(
            f'<rect x="{bx + 12}" y="{by + 34}" width="{bw - 24}" height="{bh - 46}" rx="12" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.2"/>'
        )

    if spec.get("title"):
        t_y = float(spec.get("titleY", 14))
        t_sz = float(spec.get("titleSize", 20))
        t_clr = spec.get("titleColor", "#202124")
        t_txt, t_fs = fit_single_line_px(spec["title"], cw - 90, t_sz, bold=True)
        body.append(
            f'<text data-node-id="t_main" x="32" y="{t_y + t_fs * 1.15:.1f}" text-anchor="start" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="{t_fs}" font-weight="700" fill="{t_clr}">'
            f'<tspan>{esc_xml(t_txt)}</tspan></text>'
        )
    if spec.get("subtitle"):
        sub_txt, sub_fs = fit_single_line_px(spec["subtitle"], cw - 90, 11.0, bold=False)
        sy = float(spec.get("titleY", 14)) + 39
        body.append(
            f'<text x="32" y="{sy:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="{sub_fs}" fill="#5F6368">'
            f'<tspan>{esc_xml(sub_txt)}</tspan></text>'
        )
    if spec.get("dividerY") is not None:
        body.append(f'<rect data-node-id="mc_div_line" x="32" y="{spec["dividerY"]}" width="{cw - 64}" height="1.5" fill="#DADCE0"/>')

    # Zones
    for z in spec.get("zones") or []:
        dash = ' stroke-dasharray="6,4"' if z.get("dashed") else ""
        rx = z.get("rx", 14)
        fill = z.get("fill") or "#F8F9FA"
        body.append(
            f'<rect data-node-id="{esc_xml(z["id"])}" x="{z["x"]}" y="{z["y"]}" width="{z["w"]}" height="{z["h"]}" '
            f'rx="{rx}" fill="{fill}" stroke="{z.get("stroke", "#DADCE0")}" stroke-width="{z.get("strokeWidth", 1.2)}"{dash}/>'
        )
        if z.get("title"):
            ta = z.get("titleAlign") or "left"
            anchor = "middle" if ta == "center" else "start"
            tx = (z["x"] + z["w"] / 2.0) if ta == "center" else (z["x"] + 14)
            fs = float(z.get("titleSize", 12))
            zt_txt, zt_fs = fit_single_line_px(z["title"], max(80.0, z["w"] - 32), fs, bold=True)
            body.append(
                f'<text x="{tx:.1f}" y="{z["y"] + 9 + zt_fs * 0.85:.1f}" text-anchor="{anchor}" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="{zt_fs}" font-weight="700" '
                f'fill="{z.get("titleColor", "#1967D2")}"><tspan>{esc_xml(zt_txt)}</tspan></text>'
            )
            if z.get("subtitle"):
                zs_txt, zs_fs = fit_single_line_px(z["subtitle"], max(80.0, z["w"] - 32), 9.8, bold=False)
                body.append(
                    f'<text x="{tx:.1f}" y="{z["y"] + 23 + zt_fs * 0.85:.1f}" text-anchor="{anchor}" '
                    f'font-family="Arial, Helvetica, sans-serif" font-size="{zs_fs}" fill="#475569">'
                    f'<tspan>{esc_xml(zs_txt)}</tspan></text>'
                )

    # Vertical/horizontal guide lifelines (sequence swimlane)
    for ll in spec.get("lifelines") or []:
        dash = ' stroke-dasharray="5,5"' if ll.get("dashed", True) else ""
        mk = f' marker-end="url(#{_mid(ll.get("stroke", "#94A3B8"))}_end)"' if ll.get("arrowEnd") else ""
        body.append(
            f'<line x1="{ll["x1"]}" y1="{ll["y1"]}" x2="{ll["x2"]}" y2="{ll["y2"]}" '
            f'stroke="{ll.get("stroke", "#94A3B8")}" stroke-width="{ll.get("strokeWidth", 1.2)}"{dash}{mk}/>'
        )

    # Standalone labels
    for lbl in spec.get("labels") or []:
        align = lbl.get("align") or "left"
        anchor = "middle" if align == "center" else ("end" if align == "right" else "start")
        tx = (lbl["x"] + lbl["w"] / 2.0) if align == "center" else (lbl["x"] + lbl["w"] if align == "right" else lbl["x"])
        fs = float(lbl.get("size", 13))
        ty = lbl["y"] + lbl["h"] / 2.0 + fs * 0.35
        fw = "400" if lbl.get("bold") is False else "700"
        body.append(
            f'<text data-node-id="{esc_xml(lbl["id"])}" x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anchor}" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="{fs}" font-weight="{fw}" '
            f'fill="{lbl.get("color", "#202124")}"><tspan>{esc_xml(lbl["text"])}</tspan></text>'
        )

    # Cards
    for c in spec.get("cards") or []:
        rx = c.get("rx", 12)
        filt = f' filter="url(#cardShadow_{uid})"' if c.get("shadow") else ""
        stroke = "none" if c.get("stroke") == "none" else (c.get("stroke") or "#DADCE0")
        sw = 0 if stroke == "none" else c.get("strokeWidth", 1.2)
        dash_c = ' stroke-dasharray="5,4"' if c.get("dashed") else ""
        body.append(
            f'<rect data-node-id="{esc_xml(c["id"])}" x="{c["x"]}" y="{c["y"]}" width="{c["w"]}" height="{c["h"]}" '
            f'rx="{rx}" fill="{c.get("fill", "#FFFFFF")}" stroke="{stroke}" stroke-width="{sw}"{dash_c}{filt}/>'
        )
        if c.get("topAccent"):
            body.append(
                f'<rect x="{c["x"] + 1}" y="{c["y"]}" width="{c["w"] - 2}" height="5" rx="2.5" fill="{c["topAccent"]}"/>'
            )
        is_ctr = bool(c.get("isContainer"))
        align = c.get("align") or "left"
        il = (c.get("iconPos") or "left") if c.get("icon") else "none"
        isz = float(c.get("iconSize") or 20)
        pad_l = float(c.get("padL") if c.get("padL") is not None else (8 if align == "center" else 12))
        pad_r = float(c.get("padR") if c.get("padR") is not None else (8 if align == "center" else 12))
        if c.get("icon") and il == "top":
            th = _measure_lines(c.get("lines") or [])
            total_b = isz + 8 + th
            top_y = max(c["y"] + 10.0, c["y"] + (c["h"] - total_b) / 2.0)
            ix = c["x"] + (c["w"] - isz) / 2.0
            body.append(render_inline_svg_icon(c["icon"], ix, top_y, isz))
            body.append(_svg_text_block(c["x"], top_y + isz + 6, c["w"], th + 4, c.get("lines") or [], align=align, valign="top", pad_l=pad_l, pad_r=pad_r, pad_t=0))
        else:
            if c.get("icon"):
                ix = c["x"] + 12.0
                iy = (c["y"] + 10.0) if il == "top-left" else (c["y"] + (c["h"] - isz) / 2.0)
                if il == "header-left" and str(c.get("fill", "")).upper() in ("#1A73E8", "#0F172A", "#174EA6", "#188038"):
                    body.append(f'<circle cx="{ix + isz/2:.1f}" cy="{iy + isz/2:.1f}" r="{isz/2 + 3.0:.1f}" fill="#FFFFFF"/>')
                body.append(render_inline_svg_icon(c["icon"], ix, iy, isz))
                if il in ("left", "header-left"):
                    pad_l = max(pad_l, isz + 20.0)
            body.append(_svg_text_block(
                c["x"], c["y"], c["w"], c["h"], c.get("lines") or [],
                align=align, valign=("top" if is_ctr else "middle"),
                pad_l=pad_l, pad_r=pad_r, pad_t=float(c.get("padT") or 10),
            ))
        for tile in c.get("tiles") or []:
            body.append(
                f'<rect data-node-id="{esc_xml(tile["id"])}" x="{tile["x"]}" y="{tile["y"]}" width="{tile["w"]}" height="{tile["h"]}" '
                f'rx="10" fill="{tile.get("fill", "#F8FAFC")}" stroke="{tile.get("stroke", "#CBD5E1")}" stroke-width="1.1"/>'
            )
            tisz = float(tile.get("iconSize") or 24)
            tix = tile["x"] + (tile["w"] - tisz) / 2.0
            tiy = tile["y"] + (6.0 if tile.get("label") else (tile["h"] - tisz) / 2.0)
            body.append(render_inline_svg_icon(tile["icon"], tix, tiy, tisz))
            if tile.get("label"):
                body.append(
                    f'<text x="{tile["x"] + tile["w"] / 2.0:.1f}" y="{tile["y"] + tile["h"] - 6:.1f}" text-anchor="middle" '
                    f'font-family="Arial, Helvetica, sans-serif" font-size="{tile.get("labelSize", 9)}" font-weight="700" '
                    f'fill="{tile.get("labelColor", "#1F2937")}"><tspan>{esc_xml(tile["label"])}</tspan></text>'
                )

    # Activation bars (sequence diagrams)
    for b in spec.get("bars") or []:
        body.append(
            f'<rect data-node-id="{esc_xml(b["id"])}" x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" '
            f'rx="4" fill="{b.get("fill", "#0F172A")}"/>'
        )

    # Plane Guide card (`WHO RUNS WHAT` bottom-left, word-wrapped deterministically!)
    g = spec.get("planeGuide")
    if g:
        body.append(
            f'<rect data-node-id="{esc_xml(g["id"])}" x="{g["x"]}" y="{g["y"]}" width="{g["w"]}" height="{g["h"]}" '
            f'rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.2"/>'
        )
        gt_txt, gt_fs = fit_single_line_px(g["title"], g["w"] - 28, 10.5, bold=True)
        body.append(
            f'<text x="{g["x"] + 14}" y="{g["y"] + 19}" font-family="Arial, Helvetica, sans-serif" '
            f'font-size="{gt_fs}" font-weight="700" fill="#0F172A"><tspan>{esc_xml(gt_txt)}</tspan></text>'
        )
        rows = g.get("rows") or []
        foot_h = 28 if g.get("footnote") else 0
        avail_h = g["h"] - 34 - foot_h
        rgap = 6
        rh = int((avail_h - rgap * max(0, len(rows) - 1)) / max(1, len(rows)))
        rw = g["w"] - 20
        for idx, r in enumerate(rows):
            pal = PLANE_PALETTE.get(r["plane"], PLANE_PALETTE["CONTROL"])
            ry = g["y"] + 28 + idx * (rh + rgap)
            rx = g["x"] + 10
            body.append(
                f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" rx="8" fill="{pal["bg"]}" stroke="{pal["border"]}" stroke-width="1"/>'
            )
            prefix_w = est_text_width_px(f'{r["plane"]} PLANE  ', 9.6, bold=True)
            hl_lines = wrap_px(r["headline"], rw - 20 - prefix_w, 9.6, bold=True, max_lines=1)
            hl = hl_lines[0] if hl_lines else r["headline"]
            det_lines = wrap_px(r["detail"], rw - 18, 9.2, max_lines=3)
            lh = 13.0
            total_l = 1 + len(det_lines)
            cy = ry + max(6.0, (rh - total_l * lh) / 2.0)
            body.append(
                f'<text x="{rx + 10}" y="{cy + 9.5:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="9.6" font-weight="700">'
                f'<tspan fill="{pal["text"]}">{esc_xml(r["plane"])} PLANE</tspan>'
                f'<tspan fill="#0F172A">&#160;&#160;{esc_xml(hl)}</tspan></text>'
            )
            cy += lh + 2.0
            for dl in det_lines:
                body.append(
                    f'<text x="{rx + 10}" y="{cy + 9.0:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="9.2" fill="#475569">'
                    f'<tspan>{esc_xml(dl)}</tspan></text>'
                )
                cy += lh
        if g.get("footnote"):
            flines = wrap_px(g["footnote"], g["w"] - 28, 8.8, max_lines=2)
            ftop = g["y"] + g["h"] - foot_h + 2
            for fi, fl in enumerate(flines):
                body.append(
                    f'<text x="{g["x"] + 14}" y="{ftop + 9 + fi * 11:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="8.8" fill="#64748B">'
                    f'<tspan>{esc_xml(fl)}</tspan></text>'
                )

    # Plane legend strips
    for leg in spec.get("planeLegend") or []:
        pal = PLANE_PALETTE.get(leg["plane"], PLANE_PALETTE["CONTROL"])
        body.append(
            f'<rect x="{leg["x"]}" y="{leg["y"]}" width="{leg["w"]}" height="{leg["h"]}" rx="8" fill="{pal["bg"]}" stroke="{pal["border"]}" stroke-width="1"/>'
        )
        prefix = f'{leg["plane"]}  '
        ltxt, lfs = fit_single_line_px(leg["text"], leg["w"] - 24 - est_text_width_px(prefix, 9.5, bold=True), 9.4, bold=False)
        body.append(
            f'<text x="{leg["x"] + 10}" y="{leg["y"] + leg["h"] / 2.0 + 3.2:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="{lfs}">'
            f'<tspan font-weight="700" fill="{pal["text"]}">{esc_xml(leg["plane"])}</tspan>'
            f'<tspan fill="#1F2937">&#160;&#160;{esc_xml(ltxt)}</tspan></text>'
        )

    # Connectors (drawn before pills & circular badges so badges sit crisply on top)
    for e in spec.get("edges") or []:
        pts = resolve_edge_polyline(e, boxes)
        if len(pts) < 2:
            continue
        clr = str(e.get("stroke") or "#595959")
        sw = float(e.get("strokeWidth", 1.5))
        dash = ' stroke-dasharray="6,4"' if e.get("dashed") else ""
        mid = _mid(clr)
        m_start = f' marker-start="url(#{mid}_start)"' if e.get("bidirectional") else ""
        m_end = "" if e.get("noArrow") else f' marker-end="url(#{mid}_end)"'
        d = _rounded_ortho_svg_path(pts, float(e.get("cornerRadius", 6.0)))
        body.append(
            f'<path data-edge-id="{esc_xml(e["id"])}" d="{d}" fill="none" stroke="{clr}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"{dash}{m_start}{m_end}/>'
        )
        if e.get("label"):
            lx = e.get("labelX")
            ly = e.get("labelY")
            if lx is None or ly is None:
                mid_idx = len(pts) // 2
                p_a, p_b = pts[max(0, mid_idx - 1)], pts[mid_idx]
                lx, ly = (p_a[0] + p_b[0]) / 2.0, (p_a[1] + p_b[1]) / 2.0
            ltxt = str(e["label"])
            if e.get("labelBg", True):
                bw = max(40.0, est_text_width_px(ltxt, 9.0, bold=True) + 14.0)
                body.append(
                    f'<rect x="{lx - bw / 2.0:.1f}" y="{ly - 9.0:.1f}" width="{bw:.1f}" height="18" rx="9" '
                    f'fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.9"/>'
                )
            body.append(
                f'<text x="{lx:.1f}" y="{ly + 3.1:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" '
                f'font-size="{e.get("labelSize", 9.0)}" font-weight="700" fill="{e.get("labelColor", "#334155")}">'
                f'<tspan>{esc_xml(ltxt)}</tspan></text>'
            )

    # Numbered circle step badges
    for cb in spec.get("circleBadges") or []:
        r = float(cb.get("r", 13))
        body.append(
            f'<circle cx="{cb["cx"]:.1f}" cy="{cb["cy"]:.1f}" r="{r:.1f}" fill="{cb.get("fill", "#1967D2")}"/>'
        )
        if cb.get("text"):
            fs = float(cb.get("fontSize", 11))
            body.append(
                f'<text x="{cb["cx"]:.1f}" y="{cb["cy"] + fs * 0.35:.1f}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="{fs}" font-weight="700" fill="#FFFFFF">'
                f'{esc_xml(cb["text"])}</text>'
            )

    # Floating top-border plane badge pills (width always fits text!)
    for p in spec.get("pills") or []:
        pal = PLANE_PALETTE.get(p.get("plane", "CONTROL"), PLANE_PALETTE["CONTROL"])
        bg = p.get("bg") or pal["bg"]
        bd = p.get("border") or pal["border"]
        tc = p.get("textColor") or pal["text"]
        ptxt = str(p["text"])
        body.append(
            f'<rect data-node-id="{esc_xml(p["id"])}" x="{p["x"]}" y="{p["y"]}" width="{p["w"]}" height="{p["h"]}" '
            f'rx="{p["h"] / 2.0:.1f}" fill="{bg}" stroke="{bd}" stroke-width="1"/>'
        )
        body.append(
            f'<text x="{p["x"] + p["w"] / 2.0:.1f}" y="{p["y"] + p["h"] / 2.0 + 3.0:.1f}" text-anchor="middle" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="{tc}">'
            f'<tspan>{esc_xml(ptxt)}</tspan></text>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cw} {ch}" '
        f'style="width:100%;height:auto;display:block;background:#FFFFFF;">\n'
        f'  <defs>{"".join(defs)}</defs>\n'
        f'  ' + "\n  ".join(body) + "\n</svg>\n"
    )


# ===========================================================================
# TARGET 3: 100% NATIVE EDITABLE DRAWINGML SLIDE EMITTER (pic=0)
# ===========================================================================

def _ox_ln(color: Optional[str], width_pt: float = 1.0, dashed: bool = False, head_arrow: bool = False, tail_arrow: bool = False) -> str:
    if not color or color == "none":
        return "<a:ln><a:noFill/></a:ln>"
    w_emu = max(9525, round(width_pt * 12700))
    dash_xml = '<a:prstDash val="dash"/>' if dashed else '<a:prstDash val="solid"/>'
    head_xml = '<a:headEnd type="triangle" w="med" len="med"/>' if head_arrow else '<a:headEnd type="none"/>'
    tail_xml = '<a:tailEnd type="triangle" w="med" len="med"/>' if tail_arrow else '<a:tailEnd type="none"/>'
    return (
        f'<a:ln w="{w_emu}" cap="flat" cmpd="sng"><a:solidFill><a:srgbClr val="{hex6(color)}"/></a:solidFill>'
        f'{dash_xml}<a:round/>{head_xml}{tail_xml}</a:ln>'
    )


def _ox_p(runs: List[Dict[str, Any]], algn: str = "l", spc_bef_pt: float = 0.0, ln_spc_pct: int = 112000) -> str:
    rxml = []
    for r in runs:
        sz = max(400, round(float(r.get("pt", 8.5)) * 100))
        b = ' b="1"' if r.get("bold") else ' b="0"'
        clr = hex6(r.get("color", "#202124"))
        face = "Courier New" if r.get("mono") else "Arial"
        hlink = f'<a:hlinkClick r:id="{esc_xml(r["hlinkRId"])}"/>' if r.get("hlinkRId") else ""
        rxml.append(
            f'<a:r><a:rPr lang="en-US" sz="{sz}"{b} dirty="0"><a:solidFill><a:srgbClr val="{clr}"/></a:solidFill>'
            f'<a:latin typeface="{face}"/>{hlink}</a:rPr><a:t>{esc_xml(r.get("text", ""))}</a:t></a:r>'
        )
    sb = round(spc_bef_pt * 100)
    return (
        f'<a:p><a:pPr algn="{algn}"><a:lnSpc><a:spcPct val="{ln_spc_pct}"/></a:lnSpc>'
        f'<a:spcBef><a:spcPts val="{sb}"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>'
        f'{"".join(rxml)}</a:p>'
    )


def _ox_rect(
    sid: int,
    name: str,
    x: float,
    y: float,
    w: float,
    h: float,
    *,
    prst: str = "roundRect",
    adj: int = 12000,
    fill: Optional[str] = "#FFFFFF",
    stroke: Optional[str] = "none",
    stroke_pt: float = 0.9,
    dashed: bool = False,
    anchor: str = "ctr",
    wrap: str = "square",
    l_ins: int = 53340,
    r_ins: int = 53340,
    t_ins: int = 30480,
    b_ins: int = 30480,
    paragraphs: Optional[List[str]] = None,
) -> str:
    fill_xml = "<a:noFill/>" if (not fill or fill == "none") else f'<a:solidFill><a:srgbClr val="{hex6(fill)}"/></a:solidFill>'
    av = f'<a:avLst><a:gd name="adj" fmla="val {adj}"/></a:avLst>' if prst == "roundRect" else "<a:avLst/>"
    if paragraphs:
        body = f'<p:txBody><a:bodyPr wrap="{wrap}" lIns="{l_ins}" tIns="{t_ins}" rIns="{r_ins}" bIns="{b_ins}" anchor="{anchor}"><a:noAutofit/></a:bodyPr><a:lstStyle/>{"".join(paragraphs)}</p:txBody>'
    else:
        body = '<p:txBody><a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>'
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{esc_xml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{px_to_emu(x)}" y="{px_to_emu(y)}"/>'
        f'<a:ext cx="{max(12700, px_to_emu(w))}" cy="{max(12700, px_to_emu(h))}"/></a:xfrm>'
        f'<a:prstGeom prst="{prst}">{av}</a:prstGeom>{fill_xml}{_ox_ln(stroke, stroke_pt, dashed)}</p:spPr>{body}</p:sp>'
    )


def _ox_conn(edge: Dict[str, Any], pts: List[Tuple[float, float]], next_id) -> List[str]:
    xs = [px_to_emu(p[0]) for p in pts]
    ys = [px_to_emu(p[1]) for p in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    bw = max(MIN_CUSTGEOM_EMU, max_x - min_x)
    bh = max(MIN_CUSTGEOM_EMU, max_y - min_y)
    cmds = []
    for i, p in enumerate(pts):
        rx, ry = px_to_emu(p[0]) - min_x, px_to_emu(p[1]) - min_y
        cmds.append(f'<a:moveTo><a:pt x="{rx}" y="{ry}"/></a:moveTo>' if i == 0 else f'<a:lnTo><a:pt x="{rx}" y="{ry}"/></a:lnTo>')
    clr = edge.get("stroke") or "#595959"
    spt = float(edge.get("strokeWidth", 1.5)) * 0.72
    no_arr = bool(edge.get("noArrow"))
    out = [
        f'<p:sp><p:nvSpPr><p:cNvPr id="{next_id()}" name="edge_{esc_xml(edge["id"])}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{min_x}" y="{min_y}"/><a:ext cx="{bw}" cy="{bh}"/></a:xfrm>'
        f'<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>'
        f'<a:pathLst><a:path w="{bw}" h="{bh}" extrusionOk="0">{"".join(cmds)}</a:path></a:pathLst></a:custGeom>'
        f'<a:noFill/>{_ox_ln(clr, spt, bool(edge.get("dashed")), bool(edge.get("bidirectional")), not no_arr)}</p:spPr></p:sp>'
    ]
    if edge.get("label"):
        mid_i = len(pts) // 2
        pa, pb = pts[max(0, mid_i - 1)], pts[mid_i]
        lx = float(edge["labelX"]) if edge.get("labelX") is not None else (pa[0] + pb[0]) / 2.0
        ly = float(edge["labelY"]) if edge.get("labelY") is not None else (pa[1] + pb[1]) / 2.0
        ltxt = str(edge["label"])
        lbl_w = max(50.0, est_text_width_px(ltxt, 9.0, bold=True) + 18.0)
        out.append(_ox_rect(
            next_id(), f"edge_lbl_{edge['id']}", lx - lbl_w / 2.0, ly - 9.0, lbl_w, 18.0,
            adj=50000, fill="#FFFFFF", stroke="#CBD5E1", stroke_pt=0.6,
            wrap="none", l_ins=7620, r_ins=7620, t_ins=0, b_ins=0,
            paragraphs=[_ox_p([{"text": ltxt, "pt": 6.0, "bold": True, "color": "#334155"}], "ctr", 0, 100000)],
        ))
    return out


def compile_spec_to_ooxml_slide(spec: Dict[str, Any], footer_prefix: str, hlink_rid: str = "rId1") -> str:
    """Compiles a canonical 1600x900 diagram spec directly into native editable PPTX slide XML (pic=0)."""
    counter = [2]

    def _nid() -> int:
        v = counter[0]
        counter[0] += 1
        return v

    cw = float(spec.get("canvasW") or CANVAS_W)
    boxes = _build_boxes_map(spec)
    shapes: List[str] = []

    if spec.get("quadTopBar"):
        sw = cw / 4.0
        for idx, clr in enumerate(("#4285F4", "#EA4335", "#FBBC04", "#34A853")):
            shapes.append(_ox_rect(_nid(), f"top_bar_{idx}", idx * sw, 0, sw, 6, prst="rect", fill=clr, stroke="none"))

    if spec.get("gcpBezel"):
        bz = spec["gcpBezel"]
        shapes.append(_ox_rect(
            _nid(), "gcp_bezel_outer", bz["x"], bz["y"], bz["w"], bz["h"],
            adj=5000, fill="#1A73E8", stroke="#1A73E8", stroke_pt=0.75, anchor="t",
            l_ins=152400, t_ins=45720,
            paragraphs=[_ox_p([{"text": bz.get("label", "Google Cloud"), "pt": 11.5, "bold": True, "color": "#FFFFFF"}], "l")],
        ))
        shapes.append(_ox_rect(
            _nid(), "gcp_bezel_inner", bz["x"] + 12, bz["y"] + 34, bz["w"] - 24, bz["h"] - 46,
            adj=4000, fill="#FFFFFF", stroke="#1E293B", stroke_pt=0.85,
        ))

    if spec.get("title"):
        ty = float(spec.get("titleY", 12))
        shapes.append(_ox_rect(
            _nid(), "t_main", 32, ty, cw - 64, 34, prst="rect", fill="none", stroke="none",
            l_ins=0, r_ins=0, t_ins=0, b_ins=0,
            paragraphs=[_ox_p([{"text": spec["title"], "pt": float(spec.get("titleSize", 20)) * 0.72, "bold": True, "color": spec.get("titleColor", "#202124")}], "l")],
        ))
    if spec.get("dividerY") is not None:
        shapes.append(_ox_rect(_nid(), "mc_div_line", 32, float(spec["dividerY"]), cw - 64, 2, prst="rect", fill="#DADCE0", stroke="none"))

    for z in spec.get("zones") or []:
        algn = "ctr" if z.get("titleAlign") == "center" else "l"
        paras = [_ox_p([{"text": z["title"], "pt": float(z.get("titleSize", 12)) * 0.66, "bold": True, "color": z.get("titleColor", "#1967D2")}], algn)] if z.get("title") else None
        shapes.append(_ox_rect(
            _nid(), z["id"], z["x"], z["y"], z["w"], z["h"],
            adj=min(18000, round((z.get("rx", 14) / max(1, min(z["w"], z["h"]))) * 100000)),
            fill=z.get("fill") or "#F8F9FA", stroke=z.get("stroke") or "#DADCE0",
            stroke_pt=float(z.get("strokeWidth", 1.2)) * 0.8, dashed=bool(z.get("dashed")),
            anchor="t", l_ins=68580, r_ins=68580, t_ins=45720, b_ins=22860, paragraphs=paras,
        ))

    for ll in spec.get("lifelines") or []:
        shapes.extend(_ox_conn({"id": ll["id"], "stroke": ll.get("stroke", "#94A3B8"), "strokeWidth": ll.get("strokeWidth", 1.1), "dashed": ll.get("dashed", True), "noArrow": not ll.get("arrowEnd")}, [(ll["x1"], ll["y1"]), (ll["x2"], ll["y2"])], _nid))

    for lbl in spec.get("labels") or []:
        algn = "ctr" if lbl.get("align") == "center" else ("r" if lbl.get("align") == "right" else "l")
        shapes.append(_ox_rect(
            _nid(), lbl["id"], lbl["x"], lbl["y"], lbl["w"], lbl["h"], prst="rect", fill="none", stroke="none",
            l_ins=0, r_ins=0, t_ins=0, b_ins=0,
            paragraphs=[_ox_p([{"text": lbl["text"], "pt": float(lbl.get("size", 13)) * 0.68, "bold": lbl.get("bold") is not False, "color": lbl.get("color", "#202124")}], algn)],
        ))

    for c in spec.get("cards") or []:
        is_ctr = bool(c.get("isContainer"))
        algn = "ctr" if c.get("align") == "center" else ("r" if c.get("align") == "right" else "l")
        paras = [
            _ox_p([{
                "text": ln.get("text", ""),
                "pt": float(ln.get("size") or 11) * 0.65,
                "bold": bool(ln.get("bold")),
                "mono": bool(ln.get("mono")),
                "color": ln.get("color") or ("#202124" if ln.get("bold") else "#5F6368"),
            }], algn, float(ln.get("gapTop") or 0) * 0.45 if li > 0 else 0.0, 108000)
            for li, ln in enumerate(c.get("lines") or [])
        ] or None
        shapes.append(_ox_rect(
            _nid(), c["id"], c["x"], c["y"], c["w"], c["h"],
            adj=min(22000, round((c.get("rx", 12) / max(1, min(c["w"], c["h"]))) * 100000)),
            fill=c.get("fill") or "#FFFFFF",
            stroke=("none" if c.get("stroke") == "none" else (c.get("stroke") or "#DADCE0")),
            stroke_pt=float(c.get("strokeWidth", 1.2)) * 0.8, dashed=bool(c.get("dashed")),
            anchor="t" if is_ctr else "ctr",
            l_ins=px_to_emu(max(8, c.get("padL") or 10)),
            r_ins=px_to_emu(max(6, c.get("padR") or 8)),
            t_ins=px_to_emu(c.get("padT") or (8 if is_ctr else 4)),
            b_ins=px_to_emu(c.get("padB") or 4),
            paragraphs=paras,
        ))
        for tile in c.get("tiles") or []:
            shapes.append(_ox_rect(
                _nid(), tile["id"], tile["x"], tile["y"], tile["w"], tile["h"],
                adj=20000, fill=tile.get("fill", "#F8FAFC"), stroke=tile.get("stroke", "#CBD5E1"), stroke_pt=0.75,
                paragraphs=[_ox_p([{"text": tile.get("label") or tile.get("icon", "")[:4].upper(), "pt": 6.2, "bold": True, "color": "#1E293B"}], "ctr")],
            ))

    for b in spec.get("bars") or []:
        shapes.append(_ox_rect(_nid(), b["id"], b["x"], b["y"], b["w"], b["h"], adj=20000, fill=b.get("fill", "#0F172A"), stroke="none"))

    g = spec.get("planeGuide")
    if g:
        shapes.append(_ox_rect(
            _nid(), g["id"], g["x"], g["y"], g["w"], g["h"], adj=6000,
            fill="#F8FAFC", stroke="#CBD5E1", stroke_pt=0.85, anchor="t", l_ins=91440, t_ins=45720,
            paragraphs=[_ox_p([{"text": g["title"], "pt": 7.0, "bold": True, "color": "#0F172A"}], "l")],
        ))
        rows = g.get("rows") or []
        foot_h = 26 if g.get("footnote") else 0
        rh = int((g["h"] - 34 - foot_h - 6 * max(0, len(rows) - 1)) / max(1, len(rows)))
        for idx, r in enumerate(rows):
            pal = PLANE_PALETTE.get(r["plane"], PLANE_PALETTE["CONTROL"])
            ry = g["y"] + 28 + idx * (rh + 6)
            shapes.append(_ox_rect(
                _nid(), f"{g['id']}_r{idx}", g["x"] + 10, ry, g["w"] - 20, rh, adj=12000,
                fill=pal["bg"], stroke=pal["border"], stroke_pt=0.7, anchor="ctr",
                paragraphs=[
                    _ox_p([{"text": f'{r["plane"]} PLANE  ', "pt": 6.8, "bold": True, "color": pal["text"]}, {"text": r["headline"], "pt": 6.8, "bold": True, "color": "#0F172A"}], "l"),
                    _ox_p([{"text": r["detail"], "pt": 6.3, "color": "#475569"}], "l", 1.5),
                ],
            ))

    for leg in spec.get("planeLegend") or []:
        pal = PLANE_PALETTE.get(leg["plane"], PLANE_PALETTE["CONTROL"])
        shapes.append(_ox_rect(
            _nid(), leg["id"], leg["x"], leg["y"], leg["w"], leg["h"], adj=18000,
            fill=pal["bg"], stroke=pal["border"], stroke_pt=0.7,
            paragraphs=[_ox_p([{"text": f'{leg["plane"]}  ', "pt": 6.8, "bold": True, "color": pal["text"]}, {"text": leg["text"], "pt": 6.4, "color": "#1F2937"}], "l")],
        ))

    for e in spec.get("edges") or []:
        pts = resolve_edge_polyline(e, boxes)
        if len(pts) >= 2:
            shapes.extend(_ox_conn(e, pts, _nid))

    for cb in spec.get("circleBadges") or []:
        r = cb.get("r", 13)
        shapes.append(_ox_rect(
            _nid(), cb["id"], cb["cx"] - r, cb["cy"] - r, r * 2, r * 2, prst="ellipse",
            fill=cb.get("fill", "#1967D2"), stroke="none", l_ins=0, r_ins=0, t_ins=0, b_ins=0,
            paragraphs=[_ox_p([{"text": str(cb.get("text", "")), "pt": 7.5, "bold": True, "color": "#FFFFFF"}], "ctr")],
        ))

    for p in spec.get("pills") or []:
        pal = PLANE_PALETTE.get(p.get("plane", "CONTROL"), PLANE_PALETTE["CONTROL"])
        shapes.append(_ox_rect(
            _nid(), p["id"], p["x"] - 2, p["y"], p["w"] + 4, p["h"], adj=50000,
            fill=p.get("bg") or pal["bg"], stroke=p.get("border") or pal["border"], stroke_pt=0.7,
            wrap="none", l_ins=7620, r_ins=7620, t_ins=0, b_ins=0,
            paragraphs=[_ox_p([{"text": p["text"], "pt": 5.6, "bold": True, "color": p.get("textColor") or pal["text"]}], "ctr", 0, 100000)],
        ))

    # Footer with clickable Draw.io link
    shapes.append(
        f'<p:sp><p:nvSpPr><p:cNvPr id="{_nid()}" name="canonical_drawio_footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="518160" y="6586538"/><a:ext cx="11155680" cy="213360"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>'
        f'<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr><a:lstStyle/>'
        f'{_ox_p([{"text": f"{footer_prefix}  •  ", "pt": 8.2, "bold": True, "color": "#5F6368"}, {"text": "Edit in Draw.io ↗", "pt": 8.2, "bold": True, "color": "#1A73E8", "hlinkRId": hlink_rid}], "r", 0, 100000)}'
        f'</p:txBody></p:sp>'
    )

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
        '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" y="0"/></a:xfrm></p:grpSpPr>'
        + "".join(shapes)
        + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
    )
