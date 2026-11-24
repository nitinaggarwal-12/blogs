#!/usr/bin/env python3
"""
Create Blog1 v2 Diagrams Engine — WS1–WS5 Parity Pure-Stdlib C4 Compiler.

Builds 5 domain-layered, 1600x900 editable Draw.io (.drawio) & pure-vector SVG (.svg)
diagrams with official multi-color Google Cloud SVG icons (loaded from data/gcp_svg_icons.json),
pure orthogonal edge routing (zero curved crossings across cards), zero flowAnimation=1,
zero baked footers, zero <script>/<foreignObject> XSS vectors, and clean plain text
(zero raw markdown **bold** leaks).

Diagrams emitted per blog:
  1. architecture  (C4 L2 — Master Reference Topology: top Control Plane + 3-column flow + bottom Observability strip)
  2. sequence      (C4 L3 — End-to-End Request Lifecycle Swimlane with phase bands & static dashed lifelines)
  3. security      (C4 L1 — Trust Perimeter, Fail-Closed Boundary & Threat Matrix)
  4. wire          (C4 L4 — Wire-Protocol & Schema / Payload Transformation Pipeline)
  5. async         (Async Operations Loop — Event/CDC, Export, Key Rotation/Erasure & DLQ)
"""
from __future__ import annotations

import base64
import html
import json
import re
import urllib.parse
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
_ICONS_PATH = ROOT_DIR / "data" / "gcp_svg_icons.json"
_ICON_CACHE: Optional[Dict[str, Dict[str, str]]] = None

_BANNED_EMOJIS = (
    "\u2705", "\u26a0", "\u274c", "\U0001f525", "\U0001f680",
    "\u2728", "\U0001f4a1", "\U0001f6a8", "\U0001f512", "\U0001f3af",
)

_FALLBACK_ICON = {
    "viewBox": "0 0 24 24",
    "inner": (
        '<circle cx="12" cy="12" r="9.5" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1.6"/>'
        '<path d="M8.5 12h7M12 8.5v7" stroke="#1A73E8" stroke-width="1.8" stroke-linecap="round"/>'
    ),
}

_ICON_KEYWORD_RULES: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    ("spanner", ("spanner", "gql", "graph db", "property graph", "bi-temporal db", "true time", "truetime")),
    ("alloydb", ("alloydb", "postgres", "postgresql", "pgvector", "cloud sql", "rls", "sql db")),
    ("bigquery", ("bigquery", "data warehouse", "analytics", "olap", "bq ", "chargeback")),
    ("cloud_storage", ("cloud storage", "gcs", "bucket", "object store", "archival", "backup")),
    ("memorystore", ("memorystore", "valkey", "redis", "cache", "prefix cache", "session store")),
    ("model_armor", ("model armor", "dlp", "prompt shield", "sensitive data", "redact", "safety filter", "guardrail")),
    ("cloud_armor", ("cloud armor", "waf", "ddos", "edge firewall", "rate limit")),
    ("cloud_load_balancing", ("load balanc", "alb", "gclb", "https lb", "ingress lb", "neg")),
    ("iap", ("identity-aware proxy", "iap", "zero trust proxy", "context-aware")),
    ("cloud_iam", ("cloud iam", "iam", "wif", "workload identity", "oidc", "idp", "jwt", "auth manager", "oauth", "entra", "pab", "rbac", "fgac")),
    ("cloud_kms", ("kms", "cmek", "hsm", "key ring", "encryption key", "crypto", "kill-switch", "erasure")),
    ("vpc_sc", ("vpc-sc", "vpc service", "perimeter", "enclave", "sovereign", "air-gap", "firewall")),
    ("psc", ("private service connect", "psc", "service attachment", "spoke", "peering", "hybrid link")),
    ("cloud_run", ("cloud run", "memory api", "stateless api", "serverless", "run service", "fastapi", "flask")),
    ("gke", ("gke", "kubernetes", "autopilot", "warmpool", "pod", "sandbox", "container", "gvisor")),
    ("vertex_ai", ("vertex ai", "embedding", "vector search", "matching engine", "agent engine", "reasoning")),
    ("gemini", ("gemini", "llm", "gemma", "foundation model", "model inference")),
    ("adk", ("adk", "orchestrator", "agent runtime", "agent app", "coordinator")),
    ("agent_gateway", ("agent gateway", "client-to-agent", "egress gateway", "gateway proxy", "pep")),
    ("agent_registry", ("agent registry", "catalog", "tool registry", "discovery", "registry")),
    ("mcp_tools", ("mcp", "model context protocol", "tool server", "connector")),
    ("a2a_agents", ("a2a", "peer agent", "multi-agent", "federated agent")),
    ("api_gateway", ("api gateway", "apigee", "endpoint", "dataflow", "cdc", "pub/sub", "pubsub", "eventarc", "pipeline", "etl", "dlq", "async")),
    ("cloud_logging", ("logging", "audit log", "audit trail", "otel", "opentelemetry", "telemetry", "trace")),
    ("cloud_monitoring", ("monitoring", "alert", "slo", "metric", "dashboard", "observability")),
    ("scc", ("security command", "scc", "compliance", "gdpr", "hipaa", "soc 2", "dora", "policy check")),
    ("artifact_registry", ("artifact registry", "container image", "docker", "terraform", "hcl")),
    ("finops", ("finops", "cost", "budget", "billing", "quota", "metering")),
    ("google_g", ("workspace", "google doc", "google slide", "gmail", "drive")),
    ("saas_globe", ("client", "user", "browser", "web/mobile", "web / mobile", "tenant", "saas", "external", "end user", "caller", "jira", "servicenow", "salesforce", "snowflake", "databricks")),
    ("gcp_cloud", ("google cloud", "gcp", "cloud", "control plane")),
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def xml_esc(text: str) -> str:
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", str(text or ""))
    return html.escape(cleaned, quote=True)


def strip_emojis(text: str) -> str:
    if not text:
        return ""
    s = str(text)
    for ch in _BANNED_EMOJIS:
        s = s.replace(ch, "")
    s = s.replace("\ufe0f", "")
    s = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", s)
    return re.sub(r" {2,}", " ", s).strip()


def strip_inline_md(text: str) -> str:
    """Removes inline markdown markers (**bold**, __bold__, `code`, [lbl](url)) for slide/diagram text."""
    s = str(text or "")
    if not s:
        return ""
    s = re.sub(r"\[([^\]]+)\]\((?:https?://|/)[^)]+\)", r"\1", s)
    s = re.sub(r"\*\*([^*\n]+)\*\*", r"\1", s)
    s = re.sub(r"__([^_\n]+)__", r"\1", s)
    s = s.replace("**", "").replace("__", "")
    s = re.sub(r"`([^`\n]+)`", r"\1", s)
    s = re.sub(r"(?<!\w)\*([^*\n]+)\*(?!\w)", r"\1", s)
    return strip_emojis(re.sub(r"\s+", " ", s)).strip()


def _wrap(text: str, max_chars: int, max_lines: int = 3) -> List[str]:
    words = strip_inline_md(text).split()
    if not words:
        return []
    lines: List[str] = []
    cur = ""
    for w in words:
        if len(w) > max_chars:
            if cur:
                lines.append(cur)
                cur = ""
            while len(w) > max_chars and len(lines) < max_lines:
                lines.append(w[: max(1, max_chars - 1)] + "-")
                w = w[max(1, max_chars - 1):]
            cur = w
            continue
        cand = f"{cur} {w}".strip()
        if len(cand) <= max_chars:
            cur = cand
        else:
            lines.append(cur)
            cur = w
            if len(lines) >= max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and len(" ".join(words)) > len(" ".join(lines)) + 3:
        last = lines[-1]
        lines[-1] = (last[: max(1, max_chars - 3)].rstrip() + "...") if len(last) >= max_chars - 2 else last
    return lines[:max_lines]


def load_gcp_svg_icons() -> Dict[str, Dict[str, str]]:
    global _ICON_CACHE
    if _ICON_CACHE is not None:
        return _ICON_CACHE
    try:
        if _ICONS_PATH.is_file():
            raw = json.loads(_ICONS_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and raw:
                _ICON_CACHE = raw
                return _ICON_CACHE
    except Exception:
        pass
    _ICON_CACHE = {}
    return _ICON_CACHE


def infer_gcp_icon_key(label: str, sub: str = "", role: str = "", hint: str = "") -> str:
    icons = load_gcp_svg_icons()
    h = re.sub(r"[^a-z0-9_]", "_", str(hint or "").strip().lower()).strip("_")
    if h and h in icons:
        return h
    blob = f" {label} {sub} {role} ".lower()
    for key, terms in _ICON_KEYWORD_RULES:
        if key not in icons:
            continue
        for t in terms:
            if t in blob:
                return key
    return "gcp_cloud" if "gcp_cloud" in icons else ""


def _icon_entry(key: str) -> Dict[str, str]:
    icons = load_gcp_svg_icons()
    return icons.get(key) or _FALLBACK_ICON


def get_standalone_icon_svg(key: str) -> str:
    ent = _icon_entry(key)
    vb = ent.get("viewBox", "0 0 24 24")
    inner = ent.get("inner", "")
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{inner}</svg>'


def drawio_icon_cell(cell_id: str, icon_key: str, x: float, y: float, size: float = 28.0) -> str:
    raw_svg = get_standalone_icon_svg(icon_key).encode("utf-8")
    b64 = base64.b64encode(raw_svg).decode("ascii")
    return (
        f'<mxCell id="{xml_esc(cell_id)}" value="" '
        f'style="shape=image;verticalLabelPosition=bottom;verticalAlign=top;'
        f'imageAspect=0;aspect=fixed;image=data:image/svg+xml,{b64};" '
        f'vertex="1" parent="1">'
        f'<mxGeometry x="{x:.0f}" y="{y:.0f}" width="{size:.0f}" height="{size:.0f}" as="geometry" /></mxCell>'
    )


def svg_inline_icon(icon_key: str, x: float, y: float, size: float = 28.0) -> str:
    ent = _icon_entry(icon_key)
    vb = xml_esc(ent.get("viewBox", "0 0 24 24"))
    inner = ent.get("inner", "")
    return (
        f'<svg x="{x:.1f}" y="{y:.1f}" width="{size:.1f}" height="{size:.1f}" '
        f'viewBox="{vb}" overflow="visible">{inner}</svg>'
    )


def _compress_mxgraph_for_url(drawio_xml: str, diag_id: str, diag_name: str) -> str:
    """Wrap raw mxGraphModel deflated+base64 inside <diagram> for compact viewer.diagrams.net URLs."""
    m = re.search(r"(<mxGraphModel\b[\s\S]*?</mxGraphModel>)", drawio_xml)
    if not m:
        return re.sub(r">\s+<", "><", drawio_xml.strip())
    inner = re.sub(r">\s+<", "><", m.group(1).strip())
    encoded = urllib.parse.quote(inner, safe="~()*!.'").encode("utf-8")
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)
    deflated = comp.compress(encoded) + comp.flush()
    b64 = base64.b64encode(deflated).decode("ascii")
    return (
        f'<mxfile host="ge-blogs" agent="create-blog1-engine" version="24.0.0">'
        f'<diagram id="{xml_esc(diag_id)}" name="{xml_esc(diag_name)}">{b64}</diagram></mxfile>'
    )


def build_viewer_url(drawio_xml: str, diag_id: str, diag_name: str) -> str:
    compact = _compress_mxgraph_for_url(drawio_xml, diag_id, diag_name)
    frag = urllib.parse.quote(compact, safe="")
    return (
        "https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff"
        f"&edit=_blank&layers=1&nav=1#R{frag}"
    )


def _wrap_mxfile(slug: str, suffix: str, tab_name: str, mx_cells: List[str], w: int = 1600, h: int = 900) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<mxfile host="ge-blogs" modified="{_now_iso()}" agent="create-blog1-engine" version="24.0.0">\n'
        f'  <diagram id="{xml_esc(slug)}-{xml_esc(suffix)}" name="{xml_esc(tab_name)}">\n'
        f'    <mxGraphModel dx="{w}" dy="{h}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
        f'page="1" pageScale="1" pageWidth="{w}" pageHeight="{h}" math="0" shadow="0">\n'
        '      <root>\n'
        + "\n".join(f"        {c}" for c in mx_cells)
        + "\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n"
    )


def _svg_header(title: str, subtitle: str, badge_text: str, badge_bg: str, badge_bd: str, badge_fg: str, w: int = 1600, h: int = 900) -> List[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{xml_esc(title)}">',
        "<defs>",
        '<marker id="arr-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="#1A73E8"/></marker>',
        '<marker id="arr-slate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/></marker>',
        '<marker id="arr-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="#137333"/></marker>',
        '<marker id="arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="#B06000"/></marker>',
        '<marker id="arr-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="#6D28D9"/></marker>',
        '<filter id="card-sh" x="-4%" y="-6%" width="108%" height="116%">'
        '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.06"/></filter>',
        "</defs>",
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="#FFFFFF"/>',
        '<rect x="0" y="0" width="400" height="6" fill="#4285F4"/>',
        '<rect x="400" y="0" width="400" height="6" fill="#EA4335"/>',
        '<rect x="800" y="0" width="400" height="6" fill="#FBBC04"/>',
        '<rect x="1200" y="0" width="400" height="6" fill="#34A853"/>',
        f'<text x="40" y="45" font-family="Google Sans, Inter, Arial, sans-serif" font-size="23" font-weight="800" fill="#0F172A">{xml_esc(title)}</text>',
        f'<text x="40" y="70" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" fill="#475569">{xml_esc(subtitle)}</text>',
        f'<rect x="1248" y="22" width="312" height="32" rx="16" fill="{badge_bg}" stroke="{badge_bd}" stroke-width="1.2"/>',
        f'<text x="1404" y="42" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" font-weight="800" fill="{badge_fg}">{xml_esc(badge_text)}</text>',
        '<line x1="40" y1="88" x2="1560" y2="88" stroke="#E2E8F0" stroke-width="1.5"/>',
    ]


def _draw_label_pill(svg_parts: List[str], lx: float, ly: float, text: str, stroke: str = "#CBD5E1", fg: str = "#0F172A", max_len: int = 24) -> None:
    lbl = strip_inline_md(text)[:max_len]
    if not lbl:
        return
    pw = max(56.0, len(lbl) * 6.2 + 18.0)
    clamped_x = max(pw / 2.0 + 18.0, min(1582.0 - pw / 2.0, lx))
    svg_parts.append(
        f'<rect x="{clamped_x - pw/2:.1f}" y="{ly - 9.5:.1f}" width="{pw:.1f}" height="19" rx="4.5" '
        f'fill="#FFFFFF" stroke="{stroke}" stroke-width="1"/>'
    )
    svg_parts.append(
        f'<text x="{clamped_x:.1f}" y="{ly + 3.6:.1f}" text-anchor="middle" '
        f'font-family="Google Sans, Inter, Arial, sans-serif" font-size="9.6" font-weight="700" fill="{fg}">{xml_esc(lbl)}</text>'
    )


def _fit_title_with_suffix(base: str, suffix: str, max_total: int = 74) -> str:
    raw = strip_inline_md(base)
    budget = max(20, max_total - len(suffix))
    if len(raw) <= budget:
        return f"{raw}{suffix}"
    cut = raw[: max(16, budget - 3)].rsplit(" ", 1)[0].rstrip(" ,:-&")
    return f"{cut}...{suffix}"


def _ortho_svg_path(pts: List[Tuple[float, float]], r: float = 8.0) -> str:
    """Build crisp rounded orthogonal polyline path across waypoints."""
    if len(pts) < 2:
        return ""
    if len(pts) == 2:
        return f"M {pts[0][0]:.1f} {pts[0][1]:.1f} L {pts[1][0]:.1f} {pts[1][1]:.1f}"
    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(1, len(pts) - 1):
        px, py = pts[i - 1]
        cx, cy = pts[i]
        nx, ny = pts[i + 1]
        dx1, dy1 = cx - px, cy - py
        dx2, dy2 = nx - cx, ny - cy
        l1 = (dx1 * dx1 + dy1 * dy1) ** 0.5
        l2 = (dx2 * dx2 + dy2 * dy2) ** 0.5
        if l1 < 1.0 or l2 < 1.0:
            parts.append(f"L {cx:.1f} {cy:.1f}")
            continue
        cr = min(r, l1 / 2.5, l2 / 2.5)
        bx, by = cx - (dx1 / l1) * cr, cy - (dy1 / l1) * cr
        ax, ay = cx + (dx2 / l2) * cr, cy + (dy2 / l2) * cr
        parts.append(f"L {bx:.1f} {by:.1f} Q {cx:.1f} {cy:.1f} {ax:.1f} {ay:.1f}")
    parts.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# 1. Architecture Master Topology (C4 L2 — WS1/WS2 plane layout + GCP SVG icons)
# ---------------------------------------------------------------------------
def compile_architecture_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    """Returns (drawio_xml, svg_xml, viewer_url, embedded_icon_count)."""
    zones = bp["architectureZones"]
    edges = bp["architectureEdges"]
    title = strip_inline_md(bp["title"])[:74]
    raw_sub = strip_inline_md(bp["subtitle"])
    subtitle = raw_sub if len(raw_sub) <= 130 else (raw_sub[:127].rsplit(" ", 1)[0] + "...")

    # Separate Zone 2 (Control Plane -> spans top banner, matching WS2 visual grammar)
    z_edge = zones[0]
    z_ctrl = zones[1] if len(zones) > 1 else {"title": "Control & Security Plane", "subtitle": "Governance", "components": []}
    z_comp = zones[2] if len(zones) > 2 else {"title": "Compute & AI Plane", "subtitle": "Runtime", "components": []}
    z_data = zones[3] if len(zones) > 3 else {"title": "Data & Persistence Plane", "subtitle": "Storage", "components": []}

    mx_cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        (
            f'<mxCell id="hdr_title" value="{xml_esc(title)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=22;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="18" width="1160" height="34" as="geometry" /></mxCell>'
        ),
        (
            f'<mxCell id="hdr_sub" value="{xml_esc(subtitle)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=12;fontColor=#475569;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="54" width="1200" height="22" as="geometry" /></mxCell>'
        ),
    ]

    svg_parts = _svg_header(
        title, subtitle,
        "C4 L2  |  CONTROL / COMPUTE / DATA PLANES",
        "#E8F0FE", "#BFDBFE", "#174EA6",
    )

    icon_count = 0
    # Box registry: cid -> (x, y, w, h, plane_key, order_idx)
    boxes: Dict[str, Tuple[float, float, float, float, str, int]] = {}

    # TOP SPANNING CONTROL PLANE (y=102..242)
    ctrl_x, ctrl_y, ctrl_w, ctrl_h = 40.0, 102.0, 1520.0, 134.0
    mx_cells.append(
        f'<mxCell id="zone_ctrl" value="Google Cloud — {xml_esc(strip_inline_md(z_ctrl.get("title") or "Control & Security Plane"))}" '
        'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#F0FDF4;strokeColor=#137333;dashed=1;dashPattern=6 4;'
        'strokeWidth=2;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;fontFamily=Helvetica;fontSize=12;'
        'fontStyle=1;fontColor=#0D652D;container=1;" vertex="1" parent="1">'
        f'<mxGeometry x="{ctrl_x:.0f}" y="{ctrl_y:.0f}" width="{ctrl_w:.0f}" height="{ctrl_h:.0f}" as="geometry" /></mxCell>'
    )
    svg_parts.extend([
        f'<rect x="{ctrl_x:.0f}" y="{ctrl_y:.0f}" width="{ctrl_w:.0f}" height="{ctrl_h:.0f}" rx="14" fill="#F0FDF4" stroke="#137333" stroke-width="1.8" stroke-dasharray="7,5"/>',
        f'<text x="{ctrl_x + 18:.0f}" y="{ctrl_y + 24:.0f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12.5" font-weight="800" fill="#0D652D">Google Cloud — {xml_esc(strip_inline_md(z_ctrl.get("title") or "Control & Governance Plane"))}</text>',
        f'<rect x="{ctrl_x + ctrl_w - 196:.0f}" y="{ctrl_y + 8:.0f}" width="180" height="22" rx="11" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"/>',
        f'<text x="{ctrl_x + ctrl_w - 106:.0f}" y="{ctrl_y + 22.5:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="9.5" font-weight="700" fill="#0D652D">CONTROL · governance</text>',
    ])
    c_comps = (z_ctrl.get("components") or [])[:4]
    nc = max(1, len(c_comps))
    c_gap = 20.0
    cw = min(460.0, (ctrl_w - 40.0 - c_gap * (nc - 1)) / nc)
    total_cw = nc * cw + (nc - 1) * c_gap
    c_start_x = ctrl_x + (ctrl_w - total_cw) / 2.0
    for ci, comp in enumerate(c_comps):
        bx = c_start_x + ci * (cw + c_gap)
        by = ctrl_y + 38.0
        bh = 82.0
        cid = comp["id"]
        ik = infer_gcp_icon_key(comp.get("label", ""), comp.get("sub", ""), comp.get("role", ""), comp.get("iconKey", ""))
        boxes[cid] = (bx, by, cw, bh, "control", ci)
        lbl = strip_inline_md(comp.get("label", ""))[:32]
        sub = strip_inline_md(comp.get("sub", ""))[:36]
        role = strip_inline_md(comp.get("role", ""))[:58]
        val_txt = lbl + (f"\n{sub}" if sub else "")
        mx_cells.append(
            f'<mxCell id="{xml_esc(cid)}" value="{xml_esc(val_txt)}" '
            'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=#137333;'
            'strokeWidth=1.8;align=left;spacingLeft=46;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#0F172A;" '
            'vertex="1" parent="1">'
            f'<mxGeometry x="{bx:.0f}" y="{by:.0f}" width="{cw:.0f}" height="{bh:.0f}" as="geometry" /></mxCell>'
        )
        if ik:
            mx_cells.append(drawio_icon_cell(f"pic_icon_{cid}", ik, bx + 10, by + (bh - 30) / 2.0, 30))
            icon_count += 1
        svg_parts.extend([
            f'<rect x="{bx:.1f}" y="{by:.1f}" width="{cw:.1f}" height="{bh:.1f}" rx="10" fill="#FFFFFF" stroke="#137333" stroke-width="1.6" filter="url(#card-sh)"/>',
            f'<rect x="{bx:.1f}" y="{by:.1f}" width="5.5" height="{bh:.1f}" rx="2.5" fill="#137333"/>',
            f'<rect x="{bx + 14:.1f}" y="{by + 20:.1f}" width="42" height="42" rx="9" fill="#E6F4EA" stroke="#BBF7D0" stroke-width="1"/>',
            svg_inline_icon(ik, bx + 20, by + 26, 30) if ik else "",
            f'<text x="{bx + 68:.1f}" y="{by + 30:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" font-weight="800" fill="#0F172A">{xml_esc(lbl)}</text>',
            f'<text x="{bx + 68:.1f}" y="{by + 48:.1f}" font-family="Roboto Mono, monospace" font-size="10.5" font-weight="600" fill="#0D652D">{xml_esc(sub)}</text>',
        ])
        if role:
            svg_parts.append(
                f'<text x="{bx + 68:.1f}" y="{by + 66:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="10" fill="#475569">{xml_esc(role[:48])}</text>'
            )

    # THREE VERTICAL FLOW COLUMNS WITH WIDE 104px ROUTING CORRIDORS (y=282..736)
    col_defs = [
        ("edge", z_edge, 40.0, 408.0, "#EFF6FF", "#1A73E8", "#174EA6", "#DBEAFE", "EDGE · ingress"),
        ("compute", z_comp, 572.0, 456.0, "#FFFBEB", "#B06000", "#8A4600", "#FEF3C7", "COMPUTE · runtime"),
        ("data", z_data, 1152.0, 408.0, "#FAF5FF", "#6D28D9", "#4C1D95", "#EDE9FE", "DATA · persistence"),
    ]
    col_top, col_h = 282.0, 454.0

    for pkey, zobj, zx, zw, bg, border, fg, chip_bg, pill in col_defs:
        ztitle = strip_inline_md(zobj.get("title") or pkey.title())[:34]
        zsub = strip_inline_md(zobj.get("subtitle") or "")[:44]
        mx_cells.append(
            f'<mxCell id="zone_{pkey}" value="{xml_esc(ztitle)}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor={bg};strokeColor={border};dashed=1;dashPattern=6 4;'
            f'strokeWidth=2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=8;fontFamily=Helvetica;fontSize=12;'
            f'fontStyle=1;fontColor={fg};container=1;" vertex="1" parent="1">'
            f'<mxGeometry x="{zx:.0f}" y="{col_top:.0f}" width="{zw:.0f}" height="{col_h:.0f}" as="geometry" /></mxCell>'
        )
        svg_parts.extend([
            f'<rect x="{zx:.0f}" y="{col_top:.0f}" width="{zw:.0f}" height="{col_h:.0f}" rx="14" fill="{bg}" stroke="{border}" stroke-width="1.8" stroke-dasharray="7,5"/>',
            f'<rect x="{zx + 14:.0f}" y="{col_top + 12:.0f}" width="{zw - 28:.0f}" height="44" rx="8" fill="{border}"/>',
            f'<text x="{zx + 26:.0f}" y="{col_top + 38:.0f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF">{xml_esc(ztitle)}</text>',
            f'<rect x="{zx + zw - 156:.0f}" y="{col_top + 22:.0f}" width="132" height="22" rx="11" fill="#FFFFFF" fill-opacity="0.92"/>',
            f'<text x="{zx + zw - 90:.0f}" y="{col_top + 36.5:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="9" font-weight="700" fill="{fg}">{xml_esc(pill)}</text>',
        ])
        if zsub:
            svg_parts.append(
                f'<text x="{zx + 18:.0f}" y="{col_top + 74:.0f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" font-weight="600" fill="{fg}">{xml_esc(zsub)}</text>'
            )

        comps = (zobj.get("components") or [])[:4]
        n_c = max(1, len(comps))
        usable_h = col_h - 94.0
        slot_h = usable_h / n_c
        card_h = min(98.0, max(68.0, slot_h - 24.0))
        card_w = zw - 52.0
        for ci, comp in enumerate(comps):
            cx = zx + 26.0
            cy = col_top + 84.0 + ci * slot_h + (slot_h - card_h) / 2.0
            cid = comp["id"]
            ik = infer_gcp_icon_key(comp.get("label", ""), comp.get("sub", ""), comp.get("role", ""), comp.get("iconKey", ""))
            boxes[cid] = (cx, cy, card_w, card_h, pkey, ci)
            lbl = strip_inline_md(comp.get("label", ""))[:30]
            sub = strip_inline_md(comp.get("sub", ""))[:36]
            role = strip_inline_md(comp.get("role", ""))[:76]
            val_txt = lbl + (f"\n{sub}" if sub else "")
            mx_cells.append(
                f'<mxCell id="{xml_esc(cid)}" value="{xml_esc(val_txt)}" '
                f'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor={border};'
                f'strokeWidth=1.8;align=left;spacingLeft=48;fontFamily=Helvetica;fontSize=11.5;fontStyle=1;fontColor=#0F172A;" '
                'vertex="1" parent="1">'
                f'<mxGeometry x="{cx:.0f}" y="{cy:.0f}" width="{card_w:.0f}" height="{card_h:.0f}" as="geometry" /></mxCell>'
            )
            if ik:
                mx_cells.append(drawio_icon_cell(f"pic_icon_{cid}", ik, cx + 12, cy + (card_h - 32) / 2.0, 32))
                icon_count += 1
            svg_parts.extend([
                f'<rect x="{cx:.1f}" y="{cy:.1f}" width="{card_w:.1f}" height="{card_h:.1f}" rx="10" fill="#FFFFFF" stroke="{border}" stroke-width="1.6" filter="url(#card-sh)"/>',
                f'<rect x="{cx:.1f}" y="{cy:.1f}" width="6" height="{card_h:.1f}" rx="3" fill="{border}"/>',
                f'<rect x="{cx + 15:.1f}" y="{cy + (card_h - 44)/2:.1f}" width="44" height="44" rx="9" fill="{chip_bg}" stroke="{border}" stroke-opacity="0.28" stroke-width="1"/>',
                svg_inline_icon(ik, cx + 22, cy + (card_h - 30) / 2.0, 30) if ik else "",
            ])
            tx_x = cx + 70.0
            lbl_lines = _wrap(lbl, 26, 2)
            base_y = cy + (26.0 if card_h >= 84 else 22.0)
            for li, ln in enumerate(lbl_lines):
                svg_parts.append(
                    f'<text x="{tx_x:.1f}" y="{base_y + li * 16:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" '
                    f'font-size="13.5" font-weight="800" fill="#0F172A">{xml_esc(ln)}</text>'
                )
            sub_y = base_y + len(lbl_lines) * 16 + 2
            if sub:
                svg_parts.append(
                    f'<text x="{tx_x:.1f}" y="{sub_y:.1f}" font-family="Roboto Mono, monospace" '
                    f'font-size="10.2" font-weight="600" fill="{fg}">{xml_esc(sub[:34])}</text>'
                )
            if role and card_h >= 78:
                for ri, rln in enumerate(_wrap(role, 38, 2)):
                    ry = sub_y + 15.0 + ri * 12.5
                    if ry <= cy + card_h - 6:
                        svg_parts.append(
                            f'<text x="{tx_x:.1f}" y="{ry:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" '
                            f'font-size="9.8" fill="#475569">{xml_esc(rln)}</text>'
                        )

    # BOTTOM OBSERVABILITY & CIRCUIT BREAKER RAIL (y=778..856)
    obs_y, obs_h = 778.0, 74.0
    mx_cells.append(
        '<mxCell id="zone_obs" value="AI Observability, Audit Telemetry &amp; Fail-Closed Circuit Breakers" '
        'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#F8FAFC;strokeColor=#475569;dashed=1;dashPattern=6 4;'
        'strokeWidth=1.6;verticalAlign=middle;align=left;spacingLeft=54;fontFamily=Helvetica;fontSize=11.5;fontStyle=1;fontColor=#0F172A;" '
        'vertex="1" parent="1">'
        f'<mxGeometry x="40" y="{obs_y:.0f}" width="1520" height="{obs_h:.0f}" as="geometry" /></mxCell>'
    )
    mx_cells.append(drawio_icon_cell("pic_icon_obs_log", "cloud_logging", 56, obs_y + 23, 28))
    mx_cells.append(drawio_icon_cell("pic_icon_obs_mon", "cloud_monitoring", 1516, obs_y + 23, 28))
    icon_count += 2
    svg_parts.extend([
        f'<rect x="40" y="{obs_y:.0f}" width="1520" height="{obs_h:.0f}" rx="12" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/>',
        f'<rect x="58" y="{obs_y + 17:.0f}" width="40" height="40" rx="8" fill="#E8F0FE" stroke="#BFDBFE"/>',
        svg_inline_icon("cloud_logging", 64, obs_y + 23, 28),
        f'<rect x="108" y="{obs_y + 17:.0f}" width="40" height="40" rx="8" fill="#E6F4EA" stroke="#BBF7D0"/>',
        svg_inline_icon("cloud_monitoring", 114, obs_y + 23, 28),
        f'<text x="164" y="{obs_y + 34:.0f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" font-weight="800" fill="#0F172A">AI Observability, Audit Telemetry &amp; FinOps Control Plane</text>',
        f'<text x="164" y="{obs_y + 54:.0f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11.2" fill="#475569">OpenTelemetry spans · Cloud Logging &amp; Cloud Trace · Zero-PII payload hashing · BigQuery metering &amp; cost attribution</text>',
        # Circuit-breaker pills on right
        f'<rect x="1040" y="{obs_y + 22:.0f}" width="118" height="30" rx="7" fill="#FEF2F2" stroke="#FCA5A5"/>',
        f'<text x="1099" y="{obs_y + 41:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="10" font-weight="700" fill="#991B1B">401 Unauth</text>',
        f'<rect x="1168" y="{obs_y + 22:.0f}" width="122" height="30" rx="7" fill="#FEF2F2" stroke="#FCA5A5"/>',
        f'<text x="1229" y="{obs_y + 41:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="10" font-weight="700" fill="#991B1B">403 Denied</text>',
        f'<rect x="1300" y="{obs_y + 22:.0f}" width="118" height="30" rx="7" fill="#FEF7E0" stroke="#FCD34D"/>',
        f'<text x="1359" y="{obs_y + 41:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="10" font-weight="700" fill="#92400E">429 Quota</text>',
        f'<rect x="1428" y="{obs_y + 22:.0f}" width="118" height="30" rx="7" fill="#F3E8FD" stroke="#D8B4FE"/>',
        f'<text x="1487" y="{obs_y + 41:.0f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="10" font-weight="700" fill="#5B21B6">422 Policy</text>',
        # Vertical dashed telemetry drops from bottom of columns into Observability bar
        '<line x1="244" y1="736" x2="244" y2="778" stroke="#94A3B8" stroke-width="1.6" stroke-dasharray="5,4" marker-end="url(#arr-slate)"/>',
        '<line x1="800" y1="736" x2="800" y2="778" stroke="#94A3B8" stroke-width="1.6" stroke-dasharray="5,4" marker-end="url(#arr-slate)"/>',
        '<line x1="1356" y1="736" x2="1356" y2="778" stroke="#94A3B8" stroke-width="1.6" stroke-dasharray="5,4" marker-end="url(#arr-slate)"/>',
    ])

    # PURE ORTHOGONAL COLLISION-FREE EDGE ROUTER (dedicated corridor tracks)
    plane_order = {"edge": 0, "compute": 1, "data": 2}
    gutter_ec_idx = 0  # x=448..572 (between edge & compute)
    gutter_cd_idx = 0  # x=1028..1152 (between compute & data)
    top_lane_idx = 0   # y=244..278 (control plane drop corridor)
    bot_lane_idx = 0   # y=742..772 (wide hop bypass corridor)
    side_detour_idx = 0
    edge_label_queue: List[Tuple[float, float, str, str, str]] = []

    for ei, edge in enumerate(edges, 1):
        sb = boxes.get(edge["from"])
        tb = boxes.get(edge["to"])
        if not sb or not tb:
            continue
        sx, sy, sw, sh, sp, s_ord = sb
        tx, ty, tw, th, tp, t_ord = tb
        dashed = bool(edge.get("dashed"))
        lbl_raw = strip_inline_md(edge.get("label") or "")[:24]

        pts: List[Tuple[float, float]] = []
        lx, ly = 0.0, 0.0
        col = "#1A73E8" if not dashed else "#475569"
        mk = "url(#arr-blue)" if not dashed else "url(#arr-slate)"

        if sp == "control" or tp == "control":
            # Route cleanly between top Control Plane and flow columns using corridor y=248..276
            dashed = True
            col = "#137333"
            mk = "url(#arr-green)"
            lane_y = 250.0 + (top_lane_idx % 4) * 7.5
            top_lane_idx += 1
            if sp == "control" and tp == "control":
                if sx < tx:
                    pts = [(sx + sw, sy + sh / 2), (tx - 4, ty + th / 2)]
                else:
                    pts = [(sx, sy + sh / 2), (tx + tw + 4, ty + th / 2)]
                lx, ly = (pts[0][0] + pts[-1][0]) / 2, pts[0][1] - 12
            elif sp == "control":
                cor_x = 468.0 + (top_lane_idx * 18) % 80 if tp == "edge" else (
                    514.0 if tp == "compute" and tx < sx else (
                        1056.0 + (top_lane_idx * 18) % 72 if tp == "data" else 1072.0
                    )
                )
                sx_tap = sx + sw * (0.35 + (top_lane_idx % 3) * 0.15)
                if tp == "edge":
                    enter_x = tx + tw + 4
                    cor_x = 458.0 + ((top_lane_idx % 3) * 14.0)
                    pts = [(sx_tap, sy + sh), (sx_tap, lane_y), (cor_x, lane_y), (cor_x, ty + th * 0.35), (enter_x, ty + th * 0.35)]
                elif tp == "compute":
                    enter_x = tx - 4 if sx_tap < tx + tw / 2 else tx + tw + 4
                    cor_x = (544.0 - (top_lane_idx % 3) * 14.0) if sx_tap < tx + tw / 2 else (1054.0 + (top_lane_idx % 3) * 14.0)
                    pts = [(sx_tap, sy + sh), (sx_tap, lane_y), (cor_x, lane_y), (cor_x, ty + th * 0.35), (enter_x, ty + th * 0.35)]
                else:  # data
                    cor_x = 1126.0 - (top_lane_idx % 3) * 14.0
                    pts = [(sx_tap, sy + sh), (sx_tap, lane_y), (cor_x, lane_y), (cor_x, ty + th * 0.35), (tx - 4, ty + th * 0.35)]
                lx, ly = cor_x, lane_y
            else:  # non-control -> control
                tx_tap = tx + tw * (0.35 + (top_lane_idx % 3) * 0.15)
                if sp == "edge":
                    cor_x = 464.0 + (top_lane_idx % 3) * 14.0
                    pts = [(sx + sw, sy + sh * 0.3), (cor_x, sy + sh * 0.3), (cor_x, lane_y), (tx_tap, lane_y), (tx_tap, ty + th + 4)]
                elif sp == "compute":
                    cor_x = (536.0 - (top_lane_idx % 3) * 14.0) if tx_tap < sx + sw / 2 else (1062.0 + (top_lane_idx % 3) * 14.0)
                    ex_x = sx if tx_tap < sx + sw / 2 else sx + sw
                    pts = [(ex_x, sy + sh * 0.3), (cor_x, sy + sh * 0.3), (cor_x, lane_y), (tx_tap, lane_y), (tx_tap, ty + th + 4)]
                else:  # data -> control
                    cor_x = 1118.0 - (top_lane_idx % 3) * 14.0
                    pts = [(sx, sy + sh * 0.3), (cor_x, sy + sh * 0.3), (cor_x, lane_y), (tx_tap, lane_y), (tx_tap, ty + th + 4)]
                lx, ly = (cor_x + tx_tap) / 2.0, lane_y
        elif sp == tp:
            # Same vertical column: direct straight drop if adjacent, side-rail detour if skipping a card
            if abs(s_ord - t_ord) == 1:
                cx_m = sx + sw / 2.0
                if sy < ty:
                    pts = [(cx_m, sy + sh), (cx_m, ty - 4)]
                else:
                    pts = [(cx_m, sy), (cx_m, ty + th + 4)]
                lx, ly = cx_m, (pts[0][1] + pts[-1][1]) / 2.0
            else:
                # Detour in clear gutter (left side for data column so labels stay inside canvas)
                side_detour_idx += 1
                if sp == "data":
                    dx_rail = sx - 64.0 - (side_detour_idx % 2) * 14.0
                    pts = [
                        (sx, sy + sh * 0.65),
                        (dx_rail, sy + sh * 0.65),
                        (dx_rail, ty + th * 0.35),
                        (tx - 4, ty + th * 0.35),
                    ]
                else:
                    dx_rail = sx + sw + 13.0 + (side_detour_idx % 2) * 8.0
                    pts = [
                        (sx + sw, sy + sh * 0.65),
                        (dx_rail, sy + sh * 0.65),
                        (dx_rail, ty + th * 0.35),
                        (tx + tw + 4, ty + th * 0.35),
                    ]
                lx, ly = dx_rail, (sy + sh * 0.65 + ty + th * 0.35) / 2.0
        else:
            so, to = plane_order[sp], plane_order[tp]
            if abs(so - to) == 1:
                if min(so, to) == 0:  # edge <-> compute corridor x=448..572
                    gutter_ec_idx += 1
                    lane_x = 478.0 + ((gutter_ec_idx - 1) % 4) * 20.0
                    y_off = ((gutter_ec_idx % 3) - 1) * 10.0
                else:  # compute <-> data corridor x=1028..1152
                    gutter_cd_idx += 1
                    lane_x = 1058.0 + ((gutter_cd_idx - 1) % 4) * 20.0
                    y_off = ((gutter_cd_idx % 3) - 1) * 10.0
                if so < to:
                    pts = [(sx + sw, sy + sh / 2.0 + y_off), (lane_x, sy + sh / 2.0 + y_off), (lane_x, ty + th / 2.0 + y_off), (tx - 4, ty + th / 2.0 + y_off)]
                else:
                    pts = [(sx, sy + sh / 2.0 + y_off), (lane_x, sy + sh / 2.0 + y_off), (lane_x, ty + th / 2.0 + y_off), (tx + tw + 4, ty + th / 2.0 + y_off)]
                lx, ly = lane_x, (sy + sh / 2.0 + ty + th / 2.0) / 2.0 + y_off
            else:
                # Wide skip (edge <-> data): route cleanly below compute plane inside bottom corridor (y=742..768)
                by_lane = 744.0 + (bot_lane_idx % 3) * 10.0
                bot_lane_idx += 1
                if so < to:
                    pts = [(sx + sw, sy + sh * 0.8), (460.0, sy + sh * 0.8), (460.0, by_lane), (1140.0, by_lane), (1140.0, ty + th * 0.8), (tx - 4, ty + th * 0.8)]
                else:
                    pts = [(sx, sy + sh * 0.8), (1140.0, sy + sh * 0.8), (1140.0, by_lane), (460.0, by_lane), (460.0, ty + th * 0.8), (tx + tw + 4, ty + th * 0.8)]
                lx, ly = 800.0, by_lane

        dash_xml = "dashed=1;dashPattern=6 4;" if dashed else ""
        mid_pts_xml = ""
        if len(pts) > 2:
            mxml = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}" />' for px, py in pts[1:-1])
            mid_pts_xml = f'<Array as="points">{mxml}</Array>'
        mx_cells.append(
            f'<mxCell id="edge_{ei}" value="{xml_esc(lbl_raw)}" '
            f'style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=0;'
            f'strokeColor={col};strokeWidth=2;{dash_xml}endArrow=block;endFill=1;'
            f'labelBackgroundColor=#FFFFFF;fontFamily=Helvetica;fontSize=9.5;fontStyle=1;fontColor=#0F172A;" '
            f'edge="1" parent="1" source="{xml_esc(edge["from"])}" target="{xml_esc(edge["to"])}">'
            f'<mxGeometry relative="1" as="geometry">{mid_pts_xml}</mxGeometry></mxCell>'
        )
        d_str = _ortho_svg_path(pts, r=8.0)
        dash_svg = ' stroke-dasharray="6,4"' if dashed else ""
        svg_parts.append(
            f'<path d="{d_str}" fill="none" stroke="{col}" stroke-width="2.1"{dash_svg} marker-end="{mk}"/>'
        )
        if lbl_raw:
            edge_label_queue.append((lx, ly, lbl_raw, col, "#0F172A"))

    # Stagger overlapping pill vertical centers slightly so two edge labels never touch
    placed_lbls: List[Tuple[float, float]] = []
    for lx, ly, ltxt, scol, fg in edge_label_queue:
        for px, py in placed_lbls:
            if abs(lx - px) < 95 and abs(ly - py) < 22:
                ly = py + 23.0
        placed_lbls.append((lx, ly))
        _draw_label_pill(svg_parts, lx, ly, ltxt, stroke=scol, fg=fg, max_len=20)

    svg_parts.append(
        '<text x="40" y="882" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" fill="#64748B">'
        'Solid Blue = Primary Synchronous Flow  |  Dashed Green = Control / IAM / KMS Plane  |  Dashed Slate = Async / Telemetry Drop  |  Icons: Official Google Cloud SVG Vector Atlas</text>'
    )
    svg_parts.append("</svg>")

    drawio_xml = _wrap_mxfile(slug, "arch", "C4 L2 Architecture", mx_cells)
    viewer_url = build_viewer_url(drawio_xml, f"{slug}-arch", "C4 L2 Architecture")
    return drawio_xml, "\n".join(svg_parts), viewer_url, icon_count


# ---------------------------------------------------------------------------
# 2. Request Sequence Swimlane (C4 L3 — Official GCP SVG icons + phase bands)
# ---------------------------------------------------------------------------
def compile_sequence_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    actors = bp["sequenceActors"][:5]
    steps = bp["sequenceSteps"][:10]
    title = _fit_title_with_suffix(bp["title"], " — Request Sequence", max_total=76)

    mx_cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        (
            f'<mxCell id="seq_title" value="{xml_esc(title)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=21;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="18" width="1280" height="34" as="geometry" /></mxCell>'
        ),
    ]
    svg_parts = _svg_header(
        title,
        "C4 L3 5-Actor UML Sequence Swimlane · Static Dashed Vertical Lifelines · Zero flowAnimation=1",
        "C4 L3  |  END-TO-END CALL SEQUENCE",
        "#E6F4EA", "#A7F3D0", "#0D652D",
    )

    actor_themes = (
        ("#1A73E8", "#EFF6FF"),
        ("#137333", "#F0FDF4"),
        ("#B06000", "#FFFBEB"),
        ("#6D28D9", "#FAF5FF"),
        ("#0F766E", "#F0FDFA"),
    )
    actor_w, actor_h = 236.0, 68.0
    left_m = 92.0
    span_x = (1600.0 - left_m - 44.0 - actor_w) / 4.0
    actor_cx: Dict[str, float] = {}
    lifeline_top, lifeline_bot = 186.0, 818.0
    icon_count = 0

    # Subtle phase lane backdrops
    n_steps = max(1, len(steps))
    row_gap = (lifeline_bot - lifeline_top - 48.0) / float(n_steps)
    phase_defs = [
        ("AUTH & INGRESS", "#EFF6FF", "#1A73E8", 0, max(1, n_steps // 3)),
        ("POLICY & MEMORY", "#FFFBEB", "#B06000", max(1, n_steps // 3), max(2, (2 * n_steps) // 3)),
        ("REASON & AUDIT", "#F0FDF4", "#137333", max(2, (2 * n_steps) // 3), n_steps),
    ]
    for pname, pbg, pcol, i0, i1 in phase_defs:
        if i1 <= i0:
            continue
        py0 = lifeline_top + 12 + i0 * row_gap
        py1 = lifeline_top + 12 + i1 * row_gap
        ph = max(24.0, py1 - py0 - 6.0)
        svg_parts.extend([
            f'<rect x="34" y="{py0:.1f}" width="1528" height="{ph:.1f}" rx="8" fill="{pbg}" fill-opacity="0.45"/>',
            f'<rect x="34" y="{py0:.1f}" width="5" height="{ph:.1f}" rx="2.5" fill="{pcol}"/>',
            f'<text x="48" y="{py0 + 16:.1f}" font-family="Roboto Mono, monospace" font-size="8.5" font-weight="700" fill="{pcol}">{xml_esc(pname)}</text>',
        ])

    for ai, actor in enumerate(actors):
        sc, fc = actor_themes[ai % len(actor_themes)]
        ax = left_m + ai * span_x
        cx = ax + actor_w / 2.0
        actor_cx[actor["id"]] = cx
        lbl = strip_inline_md(actor.get("label", ""))[:22]
        sub = strip_inline_md(actor.get("sub", ""))[:26]
        ik = infer_gcp_icon_key(lbl, sub, "", actor.get("iconKey", ""))
        mx_cells.append(
            f'<mxCell id="act_{ai+1}" value="{xml_esc(lbl + (chr(10)+sub if sub else ""))}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor={fc};strokeColor={sc};strokeWidth=2;'
            f'align=left;spacingLeft=40;fontFamily=Helvetica;fontSize=11.5;fontStyle=1;fontColor=#0F172A;" '
            'vertex="1" parent="1">'
            f'<mxGeometry x="{ax:.0f}" y="110" width="{actor_w:.0f}" height="{actor_h:.0f}" as="geometry" /></mxCell>'
        )
        if ik:
            mx_cells.append(drawio_icon_cell(f"pic_act_{ai+1}", ik, ax + 10, 129, 28))
            icon_count += 1
        mx_cells.append(
            f'<mxCell id="life_{ai+1}" value="" '
            'style="endArrow=none;dashed=1;dashPattern=6 4;strokeWidth=2;strokeColor=#94A3B8;html=0;" '
            'edge="1" parent="1">'
            '<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{cx:.0f}" y="{lifeline_top:.0f}" as="sourcePoint"/>'
            f'<mxPoint x="{cx:.0f}" y="{lifeline_bot:.0f}" as="targetPoint"/>'
            '</mxGeometry></mxCell>'
        )
        svg_parts.extend([
            f'<rect x="{ax:.1f}" y="110" width="{actor_w:.1f}" height="{actor_h:.1f}" rx="10" fill="{fc}" stroke="{sc}" stroke-width="2" filter="url(#card-sh)"/>',
            f'<rect x="{ax + 10:.1f}" y="126" width="36" height="36" rx="8" fill="#FFFFFF" stroke="{sc}" stroke-opacity="0.35"/>',
            svg_inline_icon(ik, ax + 15, 131, 26) if ik else "",
            f'<text x="{ax + 56:.1f}" y="140" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.2" font-weight="800" fill="#0F172A">{xml_esc(lbl)}</text>',
            f'<text x="{ax + 56:.1f}" y="158" font-family="Roboto Mono, monospace" font-size="9.8" font-weight="600" fill="#475569">{xml_esc(sub)}</text>' if sub else "",
            f'<line x1="{cx:.1f}" y1="{lifeline_top:.1f}" x2="{cx:.1f}" y2="{lifeline_bot:.1f}" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6,4"/>',
            f'<rect x="{ax + 24:.1f}" y="{lifeline_bot:.1f}" width="{actor_w - 48:.1f}" height="28" rx="6" fill="#F8FAFC" stroke="{sc}" stroke-width="1.3"/>',
            f'<text x="{cx:.1f}" y="{lifeline_bot + 18:.1f}" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="10.2" font-weight="700" fill="#334155">{xml_esc(lbl[:20])}</text>',
        ])

    for si, st in enumerate(steps):
        sy = lifeline_top + 40.0 + si * row_gap
        x1 = actor_cx.get(st["from"], 200.0)
        x2 = actor_cx.get(st["to"], 520.0)
        if abs(x1 - x2) < 10:
            x2 = x1 + 140
        kind = st.get("kind", "request")
        if kind == "response":
            col, mk, dash_xml, dash_svg, ktag = "#137333", "url(#arr-green)", "dashed=1;dashPattern=6 4;", ' stroke-dasharray="6,4"', "RETURN"
        elif kind == "guard":
            col, mk, dash_xml, dash_svg, ktag = "#B06000", "url(#arr-amber)", "", "", "GUARD"
        else:
            col, mk, dash_xml, dash_svg, ktag = "#1A73E8", "url(#arr-blue)", "", "", "CALL"
        lbl = f"{st['num']}. {strip_inline_md(st['label'])}"
        mx_cells.append(
            f'<mxCell id="step_{si+1}" value="{xml_esc(lbl)}" '
            f'style="endArrow=block;endFill=1;strokeWidth=2.2;strokeColor={col};{dash_xml}'
            'labelBackgroundColor=#FFFFFF;fontFamily=Helvetica;fontSize=10.5;fontStyle=1;fontColor=#0F172A;html=0;" '
            'edge="1" parent="1">'
            '<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{x1:.0f}" y="{sy:.0f}" as="sourcePoint"/>'
            f'<mxPoint x="{x2:.0f}" y="{sy:.0f}" as="targetPoint"/>'
            '</mxGeometry></mxCell>'
        )
        svg_parts.append(f'<circle cx="{x1:.1f}" cy="{sy:.1f}" r="4.8" fill="{col}"/>')
        tx_end = x2 - 6 if x2 > x1 else x2 + 6
        svg_parts.append(
            f'<line x1="{x1:.1f}" y1="{sy:.1f}" x2="{tx_end:.1f}" y2="{sy:.1f}" stroke="{col}" stroke-width="2.4"{dash_svg} marker-end="{mk}"/>'
        )
        mid_x = (x1 + x2) / 2.0
        lbl_trim = lbl[:62]
        pw = max(130.0, min(540.0, len(lbl_trim) * 6.5 + 64.0))
        svg_parts.extend([
            f'<rect x="{mid_x - pw/2:.1f}" y="{sy - 26:.1f}" width="{pw:.1f}" height="21" rx="5" fill="#FFFFFF" stroke="{col}" stroke-width="1.1"/>',
            f'<rect x="{mid_x - pw/2 + 3:.1f}" y="{sy - 23.5:.1f}" width="44" height="16" rx="3.5" fill="{col}"/>',
            f'<text x="{mid_x - pw/2 + 25:.1f}" y="{sy - 12.2:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="8.2" font-weight="800" fill="#FFFFFF">{ktag}</text>',
            f'<text x="{mid_x + 22:.1f}" y="{sy - 11.5:.1f}" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="10.8" font-weight="700" fill="#0F172A">{xml_esc(lbl_trim)}</text>',
        ])

    svg_parts.append(
        '<text x="40" y="882" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" fill="#64748B">'
        'CALL (Solid Blue) = Sync Request / Invoke  |  GUARD (Solid Amber) = Policy / Auth / Security Gate  |  RETURN (Dashed Green) = Signed Response / Audit Emit</text>'
    )
    svg_parts.append("</svg>")
    drawio_xml = _wrap_mxfile(slug, "seq", "C4 L3 Sequence Swimlane", mx_cells)
    viewer_url = build_viewer_url(drawio_xml, f"{slug}-seq", "C4 L3 Sequence Swimlane")
    return drawio_xml, "\n".join(svg_parts), viewer_url, icon_count


# ---------------------------------------------------------------------------
# 3. Trust Perimeter & Fail-Closed Security Boundary (C4 L1)
# ---------------------------------------------------------------------------
def compile_security_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    title = _fit_title_with_suffix(bp["title"], " — Security Boundary", max_total=74)
    sec_spec = bp.get("securityDiagram") or {}
    layers = sec_spec.get("layers") or [
        {"zone": "L1 · Edge Ingress & WAF", "control": "Cloud Load Balancing + Cloud Armor + IAP", "iconKey": "iap", "detail": "Terminates TLS 1.3, validates OIDC/JWT & blocks unauthenticated calls (HTTP 401/403)."},
        {"zone": "L2 · Identity & Authorization", "control": "Cloud IAM / Workload Identity Federation", "iconKey": "cloud_iam", "detail": "Least-privilege service accounts, Principal Access Boundary & scoped role assertions."},
        {"zone": "L3 · Network & Project Perimeter", "control": "VPC Service Controls + Private Service Connect", "iconKey": "vpc_sc", "detail": "Prevents data exfiltration; internal-and-cloud-load-balancing ingress only (zero public allUsers)."},
        {"zone": "L4 · Encryption & Data Enclave", "control": "Cloud KMS CMEK + Fine-Grained Data Access", "iconKey": "cloud_kms", "detail": "Customer-managed encryption keys, crypto-erasure kill-switch & row-level/tenant filtering."},
    ]
    threats = sec_spec.get("threats") or [
        {"code": "T-01", "vector": "Spoofed identity / header injection", "mitigation": "Strip client headers at ALB; verify signed IAP / JWT assertion."},
        {"code": "T-02", "vector": "Cross-tenant data leakage", "mitigation": "Mandatory tenant scope predicate + IAM/FGAC view isolation."},
        {"code": "T-03", "vector": "Prompt injection / PII egress", "mitigation": "Inline Model Armor & Cloud DLP screening pre/post inference."},
        {"code": "T-04", "vector": "Key / right-to-be-forgotten audit gap", "mitigation": "CMEK version rotation / cryptographic erasure + immutable log."},
    ]
    breakers = sec_spec.get("breakers") or [
        {"code": "HTTP 401", "trigger": "Missing/expired bearer token or invalid IAP assertion", "color": "#DC2626"},
        {"code": "HTTP 403", "trigger": "IAM / FGAC deny, VPC-SC block, or disabled CMEK version", "color": "#B91C1C"},
        {"code": "HTTP 422", "trigger": "Safety / DLP screening trigger or schema validation fault", "color": "#6D28D9"},
        {"code": "HTTP 429", "trigger": "Cloud Armor rate limit or tenant token quota cap reached", "color": "#B06000"},
    ]

    mx_cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        (
            f'<mxCell id="sec_title" value="{xml_esc(title)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=21;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="18" width="1200" height="34" as="geometry" /></mxCell>'
        ),
    ]
    svg_parts = _svg_header(
        title,
        "C4 L1 Nested Defense-in-Depth Perimeters · Threat Mitigations · Fail-Closed HTTP Circuit Breakers",
        "C4 L1  |  TRUST & SECURITY BOUNDARY",
        "#FEF2F2", "#FCA5A5", "#991B1B",
    )

    palette = [
        ("#EFF6FF", "#1A73E8", "#174EA6"),
        ("#F0FDF4", "#137333", "#0D652D"),
        ("#FAF5FF", "#6D28D9", "#4C1D95"),
        ("#FFFBEB", "#B06000", "#8A4600"),
    ]
    icon_count = 0
    # Nested left-side defense-in-depth perimeter rings (x=40..1030, y=108..716)
    base_x, base_y, base_w, base_h = 40.0, 108.0, 990.0, 608.0
    for li, lay in enumerate(layers[:4]):
        bg, bd, fg = palette[li % 4]
        pad_x = li * 26.0
        ry = base_y + li * 136.0
        rw = base_w - pad_x * 2
        rh = base_h - li * 136.0 - li * 8.0
        if rh < 118.0:
            rh = 118.0
        z_lbl = strip_inline_md(lay.get("zone") or f"Layer {li+1}")[:40]
        ctrl = strip_inline_md(lay.get("control") or "")[:64]
        det = strip_inline_md(lay.get("detail") or "")[:120]
        ik = infer_gcp_icon_key(ctrl, z_lbl, det, lay.get("iconKey", ""))
        mx_cells.append(
            f'<mxCell id="sec_l{li+1}" value="{xml_esc(z_lbl + chr(10) + ctrl)}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor={bg};strokeColor={bd};dashed=1;dashPattern=6 4;'
            f'strokeWidth=2;verticalAlign=top;align=left;spacingLeft=56;spacingTop=12;fontFamily=Helvetica;'
            f'fontSize=12;fontStyle=1;fontColor={fg};container=1;" vertex="1" parent="1">'
            f'<mxGeometry x="{base_x + pad_x:.0f}" y="{ry:.0f}" width="{rw:.0f}" height="{rh:.0f}" as="geometry" /></mxCell>'
        )
        if ik:
            mx_cells.append(drawio_icon_cell(f"pic_sec_l{li+1}", ik, base_x + pad_x + 14, ry + 20, 32))
            icon_count += 1
        det_lines = _wrap(det, max(56, int((rw - 124) / 6.8)), 2)
        svg_parts.extend([
            f'<rect x="{base_x + pad_x:.1f}" y="{ry:.1f}" width="{rw:.1f}" height="{rh:.1f}" rx="14" fill="{bg}" stroke="{bd}" stroke-width="2" stroke-dasharray="8,5"/>',
            f'<rect x="{base_x + pad_x + 16:.1f}" y="{ry + 16:.1f}" width="{rw - 32:.1f}" height="96" rx="10" fill="#FFFFFF" stroke="{bd}" stroke-width="1.5" filter="url(#card-sh)"/>',
            f'<rect x="{base_x + pad_x + 16:.1f}" y="{ry + 16:.1f}" width="7" height="96" rx="3" fill="{bd}"/>',
            f'<rect x="{base_x + pad_x + 34:.1f}" y="{ry + 36:.1f}" width="54" height="54" rx="11" fill="{bg}" stroke="{bd}" stroke-opacity="0.35"/>',
            svg_inline_icon(ik, base_x + pad_x + 43, ry + 45, 36) if ik else "",
            f'<text x="{base_x + pad_x + 104:.1f}" y="{ry + 38:.1f}" font-family="Roboto Mono, monospace" font-size="10.2" font-weight="700" fill="{fg}">{xml_esc(z_lbl.upper())}</text>',
            f'<text x="{base_x + pad_x + 104:.1f}" y="{ry + 60:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="15.5" font-weight="800" fill="#0F172A">{xml_esc(ctrl)}</text>',
            *[
                f'<text x="{base_x + pad_x + 104:.1f}" y="{ry + 79 + di * 15:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11.5" fill="#475569">{xml_esc(dln)}</text>'
                for di, dln in enumerate(det_lines)
            ],
        ])
        if li < 3:
            mid_x = base_x + base_w / 2.0
            svg_parts.append(
                f'<line x1="{mid_x:.1f}" y1="{ry + 112:.1f}" x2="{mid_x:.1f}" y2="{ry + 134:.1f}" stroke="{bd}" stroke-width="2.4" marker-end="url(#arr-blue)"/>'
            )

    # Right panel: Threat-Defense Matrix (x=1066..1560)
    mx_cells.append(
        '<mxCell id="sec_threats_box" value="Red-Team Threat Mitigations" '
        'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#F8FAFC;strokeColor=#CBD5E1;strokeWidth=1.6;'
        'verticalAlign=top;align=left;spacingLeft=14;spacingTop=10;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#0F172A;" '
        'vertex="1" parent="1"><mxGeometry x="1066" y="108" width="494" height="608" as="geometry" /></mxCell>'
    )
    svg_parts.extend([
        '<rect x="1066" y="108" width="494" height="608" rx="14" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.6"/>',
        '<rect x="1084" y="124" width="458" height="40" rx="8" fill="#0F172A"/>',
        svg_inline_icon("scc", 1096, 131, 26),
        '<text x="1132" y="149" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" font-weight="800" fill="#FFFFFF">Threat Vector → Active Control Matrix</text>',
    ])
    for ti, th in enumerate(threats[:4]):
        ty = 182.0 + ti * 128.0
        code = strip_inline_md(th.get("code") or f"T-0{ti+1}")[:8]
        vec = strip_inline_md(th.get("vector") or "")[:44]
        mit = strip_inline_md(th.get("mitigation") or "")[:120]
        mx_cells.append(
            f'<mxCell id="threat_{ti+1}" value="{xml_esc(code + ": " + vec + chr(10) + mit)}" '
            'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=#DC2626;strokeWidth=1.4;'
            'align=left;spacingLeft=10;fontFamily=Helvetica;fontSize=10;fontColor=#0F172A;" vertex="1" parent="1">'
            f'<mxGeometry x="1084" y="{ty:.0f}" width="458" height="110" as="geometry" /></mxCell>'
        )
        svg_parts.extend([
            f'<rect x="1084" y="{ty:.1f}" width="458" height="112" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.4" filter="url(#card-sh)"/>',
            f'<rect x="1098" y="{ty + 14:.1f}" width="54" height="22" rx="5" fill="#FEF2F2" stroke="#FCA5A5"/>',
            f'<text x="1125" y="{ty + 29:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="10" font-weight="800" fill="#991B1B">{xml_esc(code)}</text>',
            f'<text x="1162" y="{ty + 30:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#0F172A">{xml_esc(vec)}</text>',
        ])
        for ml_i, ln in enumerate(_wrap(f"Control: {mit}", 54, 3)):
            svg_parts.append(
                f'<text x="1100" y="{ty + 56 + ml_i * 17:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11.5" fill="#334155">{xml_esc(ln)}</text>'
            )

    # Bottom Fail-Closed Circuit-Breaker Strip (y=740..848)
    svg_parts.append('<rect x="40" y="742" width="1520" height="106" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>')
    svg_parts.append('<text x="60" y="766" font-family="Roboto Mono, monospace" font-size="10.5" font-weight="800" fill="#991B1B">FAIL-CLOSED CIRCUIT BREAKERS (ZERO SILENT FALLBACK)</text>')
    bw = 356.0
    for bi, br in enumerate(breakers[:4]):
        bx = 60.0 + bi * (bw + 16.0)
        bcol = br.get("color") if str(br.get("color", "")).startswith("#") else ("#DC2626", "#B91C1C", "#6D28D9", "#B06000")[bi % 4]
        code = strip_inline_md(br.get("code") or f"HTTP {401+bi}")[:14]
        trig = strip_inline_md(br.get("trigger") or "")[:68]
        mx_cells.append(
            f'<mxCell id="brk_{bi+1}" value="{xml_esc(code + " | " + trig)}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#F8FAFC;strokeColor={bcol};strokeWidth=1.8;'
            'fontFamily=Helvetica;fontSize=10;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            f'<mxGeometry x="{bx:.0f}" y="778" width="{bw:.0f}" height="56" as="geometry" /></mxCell>'
        )
        svg_parts.extend([
            f'<rect x="{bx:.1f}" y="778" width="{bw:.1f}" height="56" rx="8" fill="#F8FAFC" stroke="{bcol}" stroke-width="1.6"/>',
            f'<rect x="{bx:.1f}" y="778" width="92" height="56" rx="8" fill="{bcol}"/>',
            f'<text x="{bx + 46:.1f}" y="810" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="12" font-weight="800" fill="#FFFFFF">{xml_esc(code)}</text>',
        ])
        for li, ln in enumerate(_wrap(trig, 36, 3)):
            svg_parts.append(
                f'<text x="{bx + 104:.1f}" y="{794 + li * 13:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="10" font-weight="600" fill="#1E293B">{xml_esc(ln)}</text>'
            )

    svg_parts.append(
        '<text x="40" y="882" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" fill="#64748B">'
        'Concentric trust rings show perimeter containment from Edge WAF/IAP down to encrypted data enclave. No public allUsers ingress permitted.</text>'
    )
    svg_parts.append("</svg>")
    drawio_xml = _wrap_mxfile(slug, "security", "C4 L1 Security Boundary", mx_cells)
    viewer_url = build_viewer_url(drawio_xml, f"{slug}-security", "C4 L1 Security Boundary")
    return drawio_xml, "\n".join(svg_parts), viewer_url, icon_count


# ---------------------------------------------------------------------------
# 4. Wire-Protocol & Data/Schema Transformation (C4 L4)
# ---------------------------------------------------------------------------
def compile_wire_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    title = _fit_title_with_suffix(bp["title"], " — Wire Payload Transform", max_total=72)
    hops = (bp.get("wireDiagram") or {}).get("hops") or [
        {
            "hop": "HOP 1 · CLIENT INGRESS",
            "title": "HTTPS Request Envelope",
            "protocol": "TLS 1.3 · HTTP/2",
            "iconKey": "saas_globe",
            "added": ["query text & context window", "point-in-time parameter (as_of)", "Authorization: Bearer <OIDC>"],
            "stripped": ["spoofed X-Tenant-ID headers", "raw debug cookie strings"],
            "sample": '{"prompt":"policy Q1","as_of":"2026-03-31"}',
        },
        {
            "hop": "HOP 2 · EDGE / AUTH GATE",
            "title": "Verified Assertion Context",
            "protocol": "Signed JWT · ECDSA P-256",
            "iconKey": "iap",
            "added": ["verified caller sub / email", "bound tenant_id claim", "request_id / traceparent"],
            "stripped": ["untrusted caller-supplied role", "expired / mismatched aud tokens"],
            "sample": '{"sub":"user@co","tenant":"t1","iat":17954}',
        },
        {
            "hop": "HOP 3 · DATA / QUERY ENGINE",
            "title": "Scoped Storage & Vector Tuple",
            "protocol": "gRPC · Parameterized Query",
            "iconKey": "spanner",
            "added": ["bind @tenant_id, @valid_at", "bind @as_of_tx timestamp", "embedding vector[768]"],
            "stripped": ["superseded / soft-deleted facts", "unscoped string-interpolated SQL"],
            "sample": 'GRAPH_TABLE(kg MATCH ... WHERE valid_to > @t)',
        },
        {
            "hop": "HOP 4 · RESPONSE & AUDIT",
            "title": "Grounded Answer + OTel Span",
            "protocol": "JSON · Zero-PII Telemetry",
            "iconKey": "cloud_logging",
            "added": ["grounded citations & fact IDs", "SHA-256(prompt) audit digest", "token_in / token_out / latency_ms"],
            "stripped": ["raw PII / secrets (DLP mask)", "internal keys & auth headers"],
            "sample": '{"answer":"...","sha256":"9f86d0...","ms":142}',
        },
    ]

    mx_cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        (
            f'<mxCell id="wire_title" value="{xml_esc(title)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=21;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="18" width="1200" height="34" as="geometry" /></mxCell>'
        ),
    ]
    svg_parts = _svg_header(
        title,
        "C4 L4 Field-Level Envelope Transformation · Added (+), Stripped (-), and Bound Payload Schemas per Hop",
        "C4 L4  |  WIRE PAYLOAD TRANSFORM",
        "#F3E8FD", "#D8B4FE", "#5B21B6",
    )

    cols = [
        ("#1A73E8", "#EFF6FF"),
        ("#137333", "#F0FDF4"),
        ("#B06000", "#FFFBEB"),
        ("#6D28D9", "#FAF5FF"),
    ]
    cw, gap = 342.0, 50.0
    start_x = 40.0
    card_y, card_h = 122.0, 704.0
    icon_count = 0

    for hi, hop in enumerate(hops[:4]):
        bd, bg = cols[hi % 4]
        hx = start_x + hi * (cw + gap)
        h_lbl = strip_inline_md(hop.get("hop") or f"HOP {hi+1}")[:28]
        htitle = strip_inline_md(hop.get("title") or "")[:32]
        proto = strip_inline_md(hop.get("protocol") or "HTTPS")[:30]
        ik = infer_gcp_icon_key(htitle, proto, h_lbl, hop.get("iconKey", ""))
        added = [strip_inline_md(x)[:38] for x in (hop.get("added") or [])][:4]
        stripped = [strip_inline_md(x)[:38] for x in (hop.get("stripped") or [])][:3]
        sample = strip_inline_md(hop.get("sample") or "")[:160]

        mx_cells.append(
            f'<mxCell id="hop_{hi+1}" value="{xml_esc(h_lbl + chr(10) + htitle + chr(10) + proto)}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor={bg};strokeColor={bd};strokeWidth=2;'
            'verticalAlign=top;spacingTop=12;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            f'<mxGeometry x="{hx:.0f}" y="{card_y:.0f}" width="{cw:.0f}" height="{card_h:.0f}" as="geometry" /></mxCell>'
        )
        if ik:
            mx_cells.append(drawio_icon_cell(f"pic_wire_{hi+1}", ik, hx + 16, card_y + 16, 30))
            icon_count += 1
        if hi < 3:
            mx_cells.append(
                f'<mxCell id="wedge_{hi+1}" value="" '
                f'style="edgeStyle=orthogonalEdgeStyle;strokeColor={bd};strokeWidth=2.5;endArrow=block;endFill=1;" '
                f'edge="1" parent="1" source="hop_{hi+1}" target="hop_{hi+2}">'
                '<mxGeometry relative="1" as="geometry" /></mxCell>'
            )
            svg_parts.append(
                f'<line x1="{hx + cw:.1f}" y1="440" x2="{hx + cw + gap - 6:.1f}" y2="440" stroke="{bd}" stroke-width="3" marker-end="url(#arr-blue)"/>'
            )

        svg_parts.extend([
            f'<rect x="{hx:.1f}" y="{card_y:.1f}" width="{cw:.1f}" height="{card_h:.1f}" rx="14" fill="{bg}" stroke="{bd}" stroke-width="2" filter="url(#card-sh)"/>',
            f'<rect x="{hx:.1f}" y="{card_y:.1f}" width="{cw:.1f}" height="82" rx="14" fill="{bd}"/>',
            f'<rect x="{hx:.1f}" y="{card_y + 68:.1f}" width="{cw:.1f}" height="14" fill="{bd}"/>',
            f'<rect x="{hx + 14:.1f}" y="{card_y + 18:.1f}" width="44" height="44" rx="10" fill="#FFFFFF"/>',
            svg_inline_icon(ik, hx + 21, card_y + 25, 30) if ik else "",
            f'<text x="{hx + 70:.1f}" y="{card_y + 32:.1f}" font-family="Roboto Mono, monospace" font-size="9.8" font-weight="700" fill="#FFFFFF" opacity="0.92">{xml_esc(h_lbl)}</text>',
            f'<text x="{hx + 70:.1f}" y="{card_y + 53:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12.8" font-weight="800" fill="#FFFFFF">{xml_esc(htitle[:30])}</text>',
            f'<text x="{hx + 70:.1f}" y="{card_y + 70:.1f}" font-family="Roboto Mono, monospace" font-size="9.5" fill="#FFFFFF" opacity="0.88">{xml_esc(proto)}</text>',
            # Added / Bound box
            f'<rect x="{hx + 16:.1f}" y="{card_y + 104:.1f}" width="{cw - 32:.1f}" height="218" rx="10" fill="#FFFFFF" stroke="#86EFAC" stroke-width="1.4"/>',
            f'<text x="{hx + 28:.1f}" y="{card_y + 128:.1f}" font-family="Roboto Mono, monospace" font-size="10.2" font-weight="800" fill="#137333">+ ADDED / BOUND FIELDS</text>',
        ])
        for ai_i, item in enumerate(added):
            iy = card_y + 150.0 + ai_i * 42.0
            svg_parts.extend([
                f'<rect x="{hx + 26:.1f}" y="{iy:.1f}" width="{cw - 52:.1f}" height="32" rx="6" fill="#F0FDF4" stroke="#BBF7D0"/>',
                f'<text x="{hx + 36:.1f}" y="{iy + 20.5:.1f}" font-family="Roboto Mono, monospace" font-size="10.2" font-weight="600" fill="#0D652D">+ {xml_esc(item[:34])}</text>',
            ])

        # Stripped / Redacted box
        svg_parts.extend([
            f'<rect x="{hx + 16:.1f}" y="{card_y + 340:.1f}" width="{cw - 32:.1f}" height="176" rx="10" fill="#FFFFFF" stroke="#FCA5A5" stroke-width="1.4"/>',
            f'<text x="{hx + 28:.1f}" y="{card_y + 364:.1f}" font-family="Roboto Mono, monospace" font-size="10.2" font-weight="800" fill="#B91C1C">- STRIPPED / REJECTED</text>',
        ])
        for si_i, item in enumerate(stripped):
            iy = card_y + 384.0 + si_i * 40.0
            svg_parts.extend([
                f'<rect x="{hx + 26:.1f}" y="{iy:.1f}" width="{cw - 52:.1f}" height="30" rx="6" fill="#FEF2F2" stroke="#FECACA"/>',
                f'<text x="{hx + 36:.1f}" y="{iy + 19.5:.1f}" font-family="Roboto Mono, monospace" font-size="10" font-weight="600" fill="#991B1B">- {xml_esc(item[:34])}</text>',
            ])

        # Dark wire snippet box
        svg_parts.extend([
            f'<rect x="{hx + 16:.1f}" y="{card_y + 534:.1f}" width="{cw - 32:.1f}" height="150" rx="10" fill="#0F172A" stroke="#334155"/>',
            f'<text x="{hx + 28:.1f}" y="{card_y + 556:.1f}" font-family="Roboto Mono, monospace" font-size="9.5" font-weight="700" fill="#93C5FD">WIRE SAMPLE</text>',
        ])
        for wi, ln in enumerate(_wrap(sample, 36, 4)):
            svg_parts.append(
                f'<text x="{hx + 28:.1f}" y="{card_y + 580 + wi * 20:.1f}" font-family="Roboto Mono, monospace" font-size="10.2" fill="#E2E8F0">{xml_esc(ln)}</text>'
            )

    svg_parts.append(
        '<text x="40" y="882" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" fill="#64748B">'
        'Green (+): Cryptographic claims / query bindings added  |  Red (-): Untrusted headers, stale versions, or PII removed prior to forwarding</text>'
    )
    svg_parts.append("</svg>")
    drawio_xml = _wrap_mxfile(slug, "wire", "C4 L4 Wire Payload", mx_cells)
    viewer_url = build_viewer_url(drawio_xml, f"{slug}-wire", "C4 L4 Wire Payload")
    return drawio_xml, "\n".join(svg_parts), viewer_url, icon_count


# ---------------------------------------------------------------------------
# 5. Async Operations, CDC / Export & Erasure Loop
# ---------------------------------------------------------------------------
def compile_async_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    title = _fit_title_with_suffix(bp["title"], " — Async Lifecycle Loop", max_total=72)
    stages = (bp.get("asyncDiagram") or {}).get("stages") or [
        {"stage": "1. CHANGE CAPTURE", "service": "Primary Datastore Stream", "iconKey": "spanner", "cadence": "Continuous / CDC", "detail": "Captures committed mutation envelopes & temporal supersedes asynchronously without impacting p95 reads."},
        {"stage": "2. ENRICH & TRANSFORM", "service": "Serverless Worker / Dataflow", "iconKey": "cloud_run", "cadence": "Batch / Streaming", "detail": "Normalizes payloads, recomputes vector embeddings, validates schema versions and idempotency keys."},
        {"stage": "3. ARCHIVE & ANALYTICS", "service": "BigQuery & Cloud Storage", "iconKey": "bigquery", "cadence": "Hourly / Streaming", "detail": "Writes append-only audit snapshots & time-travel partitions for point-in-time compliance replay."},
        {"stage": "4. ERASURE & ROTATION", "service": "Cloud KMS Key Lifecycle", "iconKey": "cloud_kms", "cadence": "On-Demand / 90d", "detail": "Executes cryptographic erasure tombstones & key rotation with deterministic verification logs."},
    ]
    dlq_note = strip_inline_md((bp.get("asyncDiagram") or {}).get("feedbackNote") or "Failed events route to dead-letter queue (DLQ) with exponential backoff, idempotent replay, and Cloud Monitoring alerting.")

    mx_cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        (
            f'<mxCell id="asy_title" value="{xml_esc(title)}" '
            'style="text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
            'fontFamily=Helvetica;fontSize=21;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            '<mxGeometry x="40" y="18" width="1200" height="34" as="geometry" /></mxCell>'
        ),
    ]
    svg_parts = _svg_header(
        title,
        "Asynchronous Control Loop · Off-Critical-Path Export, Index Refresh, Key Rotation, & Dead-Letter Replay",
        "ASYNC  |  LIFECYCLE & RECOVERY LOOP",
        "#FEF7E0", "#FCD34D", "#8A4600",
    )

    themes = [
        ("#1A73E8", "#EFF6FF"),
        ("#0F766E", "#F0FDFA"),
        ("#6D28D9", "#FAF5FF"),
        ("#B06000", "#FFFBEB"),
    ]
    cw, ch, gap = 330.0, 290.0, 66.0
    sx0, sy0 = 40.0, 175.0
    icon_count = 0

    for si, st in enumerate(stages[:4]):
        bd, bg = themes[si % 4]
        x = sx0 + si * (cw + gap)
        st_lbl = strip_inline_md(st.get("stage") or f"{si+1}. STAGE")[:26]
        svc = strip_inline_md(st.get("service") or "")[:30]
        cad = strip_inline_md(st.get("cadence") or "Async")[:24]
        det = strip_inline_md(st.get("detail") or "")[:240]
        ik = infer_gcp_icon_key(svc, st_lbl, det, st.get("iconKey", ""))

        mx_cells.append(
            f'<mxCell id="ast_{si+1}" value="{xml_esc(st_lbl + chr(10) + svc + chr(10) + cad)}" '
            f'style="rounded=1;whiteSpace=wrap;html=0;fillColor={bg};strokeColor={bd};strokeWidth=2;'
            'verticalAlign=top;spacingTop=14;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
            f'<mxGeometry x="{x:.0f}" y="{sy0:.0f}" width="{cw:.0f}" height="{ch:.0f}" as="geometry" /></mxCell>'
        )
        if ik:
            mx_cells.append(drawio_icon_cell(f"pic_ast_{si+1}", ik, x + 20, sy0 + 20, 32))
            icon_count += 1
        if si < 3:
            mx_cells.append(
                f'<mxCell id="ae_{si+1}" value="Async Event" '
                f'style="edgeStyle=orthogonalEdgeStyle;strokeColor={bd};strokeWidth=2.4;dashed=1;dashPattern=6 4;endArrow=block;endFill=1;" '
                f'edge="1" parent="1" source="ast_{si+1}" target="ast_{si+2}">'
                '<mxGeometry relative="1" as="geometry" /></mxCell>'
            )
            svg_parts.append(
                f'<line x1="{x + cw:.1f}" y1="{sy0 + ch/2:.1f}" x2="{x + cw + gap - 6:.1f}" y2="{sy0 + ch/2:.1f}" '
                f'stroke="{bd}" stroke-width="2.8" stroke-dasharray="7,4" marker-end="url(#arr-blue)"/>'
            )

        svg_parts.extend([
            f'<rect x="{x:.1f}" y="{sy0:.1f}" width="{cw:.1f}" height="{ch:.1f}" rx="16" fill="{bg}" stroke="{bd}" stroke-width="2.2" filter="url(#card-sh)"/>',
            f'<rect x="{x + 12:.1f}" y="{sy0:.1f}" width="{cw - 24:.1f}" height="6" rx="3" fill="{bd}"/>',
            f'<rect x="{x + 22:.1f}" y="{sy0 + 28:.1f}" width="58" height="58" rx="12" fill="#FFFFFF" stroke="{bd}" stroke-width="1.3"/>',
            svg_inline_icon(ik, x + 31, sy0 + 37, 40) if ik else "",
            f'<rect x="{x + cw - 134:.1f}" y="{sy0 + 30:.1f}" width="114" height="24" rx="12" fill="#FFFFFF" stroke="{bd}" stroke-width="1"/>',
            f'<text x="{x + cw - 77:.1f}" y="{sy0 + 46:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="9.5" font-weight="700" fill="{bd}">{xml_esc(cad[:18])}</text>',
            f'<text x="{x + 22:.1f}" y="{sy0 + 114:.1f}" font-family="Roboto Mono, monospace" font-size="11" font-weight="800" fill="{bd}">{xml_esc(st_lbl)}</text>',
            f'<text x="{x + 22:.1f}" y="{sy0 + 140:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="#0F172A">{xml_esc(svc[:28])}</text>',
        ])
        for li, ln in enumerate(_wrap(det, 42, 6)):
            svg_parts.append(
                f'<text x="{x + 22:.1f}" y="{sy0 + 168 + li * 17:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11.5" fill="#334155">{xml_esc(ln)}</text>'
            )

    # Bottom Dead-Letter Queue / Verification / Feedback Return Corridor
    dlq_y, dlq_h = 568.0, 178.0
    mx_cells.append(
        f'<mxCell id="dlq_box" value="Dead-Letter Queue (DLQ), Alerting &amp; Reconciliation Loop" '
        'style="rounded=1;whiteSpace=wrap;html=0;fillColor=#F8FAFC;strokeColor=#475569;dashed=1;dashPattern=6 4;'
        'strokeWidth=2;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="1">'
        f'<mxGeometry x="260" y="{dlq_y:.0f}" width="1080" height="{dlq_h:.0f}" as="geometry" /></mxCell>'
    )
    mx_cells.append(drawio_icon_cell("pic_dlq_mon", "cloud_monitoring", 286, dlq_y + 30, 32))
    icon_count += 1
    mx_cells.append(
        '<mxCell id="loop_back" value="Idempotent Replay &amp; Attestation" '
        'style="edgeStyle=orthogonalEdgeStyle;dashed=1;dashPattern=6 4;strokeColor=#137333;strokeWidth=2;endArrow=block;endFill=1;" '
        'edge="1" parent="1" source="ast_4" target="ast_1"><mxGeometry relative="1" as="geometry">'
        '<Array as="points"><mxPoint x="1395" y="792"/><mxPoint x="205" y="792"/></Array></mxGeometry></mxCell>'
    )
    svg_parts.extend([
        f'<rect x="260" y="{dlq_y:.1f}" width="1080" height="{dlq_h:.1f}" rx="16" fill="#F8FAFC" stroke="#475569" stroke-width="1.8" stroke-dasharray="7,5"/>',
        f'<rect x="292" y="{dlq_y + 36:.1f}" width="54" height="54" rx="12" fill="#FEF2F2" stroke="#FCA5A5"/>',
        svg_inline_icon("cloud_monitoring", 301, dlq_y + 45, 36),
        f'<text x="366" y="{dlq_y + 52:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="#0F172A">Fault Handling, Dead-Letter Replay &amp; Audit Reconciliation</text>',
        *[
            f'<text x="366" y="{dlq_y + 75 + di * 18:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12.2" fill="#334155">{xml_esc(ln)}</text>'
            for di, ln in enumerate(_wrap(dlq_note, 96, 2))
        ],
        # Three metric chips inside DLQ box
        f'<rect x="366" y="{dlq_y + 112:.1f}" width="290" height="40" rx="8" fill="#FFFFFF" stroke="#CBD5E1"/>',
        f'<text x="511" y="{dlq_y + 137:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="11" font-weight="700" fill="#1A73E8">Exponential Backoff + Jitter</text>',
        f'<rect x="676" y="{dlq_y + 112:.1f}" width="290" height="40" rx="8" fill="#FFFFFF" stroke="#CBD5E1"/>',
        f'<text x="821" y="{dlq_y + 137:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="11" font-weight="700" fill="#137333">Idempotency Key Verified</text>',
        f'<rect x="986" y="{dlq_y + 112:.1f}" width="318" height="40" rx="8" fill="#FFFFFF" stroke="#CBD5E1"/>',
        f'<text x="1145" y="{dlq_y + 137:.1f}" text-anchor="middle" font-family="Roboto Mono, monospace" font-size="11" font-weight="700" fill="#991B1B">Alert on DLQ Depth &gt; 0</text>',
        # Clean orthogonal return loop beneath cards
        f'<path d="M 1395 465 L 1395 802 Q 1395 812 1385 812 L 215 812 Q 205 812 205 802 L 205 472" fill="none" stroke="#137333" stroke-width="2.4" stroke-dasharray="7,5" marker-end="url(#arr-green)"/>',
        # Vertical failure taps from Stage 2 & 3 into DLQ box
        '<line x1="601" y1="465" x2="601" y2="562" stroke="#DC2626" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#arr-slate)"/>',
        '<line x1="997" y1="465" x2="997" y2="562" stroke="#DC2626" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#arr-slate)"/>',
    ])
    _draw_label_pill(svg_parts, 800, 812, "Periodic Verification & Idempotent Reconciliation Feedback", stroke="#137333", fg="#0D652D", max_len=66)
    _draw_label_pill(svg_parts, 601, 514, "Retry / DLQ", stroke="#DC2626", fg="#991B1B", max_len=16)
    _draw_label_pill(svg_parts, 997, 514, "Verify Error", stroke="#DC2626", fg="#991B1B", max_len=16)

    svg_parts.append(
        '<text x="40" y="882" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11" fill="#64748B">'
        'All background lifecycle jobs execute outside the synchronous user request path to keep online read latency predictable.</text>'
    )
    svg_parts.append("</svg>")
    drawio_xml = _wrap_mxfile(slug, "async", "Async Lifecycle Loop", mx_cells)
    viewer_url = build_viewer_url(drawio_xml, f"{slug}-async", "Async Lifecycle Loop")
    return drawio_xml, "\n".join(svg_parts), viewer_url, icon_count
