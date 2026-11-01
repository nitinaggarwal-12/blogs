#!/usr/bin/env python3
"""
Off-Container Durable Portal State & Server-Side Draw.io SVG Renderer ([FA-05], [FA-13])
========================================================================================
Ensures zero runtime mutations ever touch git-tracked files (`docs/*.json`, `diagrams/*.drawio`)
inside the Cloud Run container image or developer worktree.

Persistence Hierarchy:
1. Primary Cloud Backend: Google Cloud Storage (`gs://${DURABLE_GCS_BUCKET}/ge-blogs/<store>.json`)
   with optimistic concurrency (`?ifGenerationMatch=<generation>`) when generation metadata is present.
2. Feedback Ledger: Google Sheets (`1iPv52nblJISD7WNeEe3m4VovG_JS1qh79MYftMxrnhY`) via `unified_feedback_engine.py`
   + Cloud Storage object mirror (`ge-blogs/portal_feedback.json`).
3. Ephemeral Process Cache: `/tmp/ge-blogs-runtime-state/` (`PORTAL_RUNTIME_STATE_DIR`), seeded read-only
   from `docs/portal_*.json` on cold start when Cloud Storage credentials are offline.
"""

from __future__ import annotations

import html
import json
import os
from pathlib import Path
import re
import threading
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, Optional, Tuple


DEFAULT_RUNTIME_DIR = Path(os.environ.get("PORTAL_RUNTIME_STATE_DIR", "/tmp/ge-blogs-runtime-state"))
_OVERLAY_LOCK = threading.Lock()


def get_runtime_state_dir() -> Path:
    d = Path(os.environ.get("PORTAL_RUNTIME_STATE_DIR", str(DEFAULT_RUNTIME_DIR)))
    d.mkdir(parents=True, exist_ok=True)
    return d


def ensure_runtime_store_file(runtime_file: Path, readonly_seed_file: Path, default_payload: Dict[str, Any]) -> Path:
    """
    Returns `runtime_file` (creating it from `readonly_seed_file` if not yet initialized),
    guaranteeing `readonly_seed_file` inside the repository is NEVER mutated at runtime.
    """
    runtime_file.parent.mkdir(parents=True, exist_ok=True)
    if not runtime_file.is_file():
        if readonly_seed_file.is_file():
            try:
                raw = readonly_seed_file.read_text(encoding="utf-8")
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    runtime_file.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
                    return runtime_file
            except Exception:
                pass
        runtime_file.write_text(json.dumps(default_payload, indent=2), encoding="utf-8")
    return runtime_file


def _strip_html_tags(val: str) -> str:
    txt = html.unescape(val or "")
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"</(div|p|li|tr|h[1-6])>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", " ", txt)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in txt.splitlines()]
    return "\n".join([ln for ln in lines if ln][:4])


def _parse_style_map(style_str: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for part in (style_str or "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
        elif part.strip():
            out[part.strip()] = "1"
    return out


def synthesize_svg_from_drawio_xml(xml_content: str, diag_id: str = "diagram") -> str:
    """
    Pure-Python deterministic Draw.io `<mxGraphModel>` -> `.svg` renderer ([FA-05]).
    Rejects DOCTYPE/ENTITY/XInclude payloads and renders vertices, containers, edges, and text labels
    so saving in `/drawio-editor` immediately updates `/diagrams/<id>.svg` without headless Chromium or
    dirtying container disk.
    """
    low = (xml_content or "").lower()
    if "<!doctype" in low or "<!entity" in low or "<!element" in low or "xinclude" in low:
        raise ValueError("Blocked unsafe XML declaration in Draw.io payload")

    root = ET.fromstring(xml_content)
    graph_model = root if root.tag == "mxGraphModel" else root.find(".//mxGraphModel")
    if graph_model is None:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160"><rect width="640" height="160" fill="#ffffff"/><text x="320" y="84" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#0f172a">{html.escape(diag_id)}</text></svg>'

    cells = graph_model.findall(".//mxCell")
    geom_by_id: Dict[str, Tuple[float, float, float, float, str]] = {}
    cell_by_id: Dict[str, ET.Element] = {}
    for c in cells:
        cid = c.attrib.get("id", "")
        if cid:
            cell_by_id[cid] = c
        g = c.find("mxGeometry")
        if cid and g is not None and c.attrib.get("vertex") == "1":
            try:
                x = float(g.attrib.get("x", "0"))
                y = float(g.attrib.get("y", "0"))
                w = float(g.attrib.get("width", "120"))
                h = float(g.attrib.get("height", "50"))
            except ValueError:
                x, y, w, h = 0.0, 0.0, 120.0, 50.0
            geom_by_id[cid] = (x, y, w, h, c.attrib.get("parent", "1"))

    def abs_xy(cid: str, depth: int = 0) -> Tuple[float, float]:
        if cid not in geom_by_id or depth > 8:
            return (0.0, 0.0)
        x, y, _, _, pid = geom_by_id[cid]
        if pid and pid not in ("0", "1") and pid in geom_by_id:
            px, py = abs_xy(pid, depth + 1)
            return (x + px, y + py)
        return (x, y)

    max_x, max_y = 1280.0, 760.0
    abs_boxes: Dict[str, Tuple[float, float, float, float]] = {}
    for cid, (_, _, w, h, _) in geom_by_id.items():
        ax, ay = abs_xy(cid)
        abs_boxes[cid] = (ax, ay, w, h)
        max_x = max(max_x, ax + w + 48.0)
        max_y = max(max_y, ay + h + 48.0)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(max_x)} {int(max_y)}" width="{int(max_x)}" height="{int(max_y)}" data-synthesized-from="{html.escape(diag_id, quote=True)}">',
        '<defs><marker id="geap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/></marker></defs>',
        f'<rect x="0" y="0" width="{int(max_x)}" height="{int(max_y)}" fill="#ffffff"/>',
    ]

    # Render vertices (containers first, then leaf nodes)
    ordered_vertices = sorted(
        abs_boxes.keys(),
        key=lambda cid: -(abs_boxes[cid][2] * abs_boxes[cid][3]),
    )
    for cid in ordered_vertices:
        c = cell_by_id[cid]
        ax, ay, w, h = abs_boxes[cid]
        st = _parse_style_map(c.attrib.get("style", ""))
        fill = st.get("fillColor", "#f8fafc")
        if fill == "none":
            fill = "transparent"
        stroke = st.get("strokeColor", "#94a3b8")
        if stroke == "none":
            stroke = "transparent"
        rx = "8" if st.get("rounded") == "1" else "3"
        dash = ' stroke-dasharray="5,4"' if st.get("dashed") == "1" else ""
        svg_parts.append(
            f'<rect x="{ax:.1f}" y="{ay:.1f}" width="{max(w, 1.0):.1f}" height="{max(h, 1.0):.1f}" rx="{rx}" fill="{html.escape(fill, quote=True)}" stroke="{html.escape(stroke, quote=True)}" stroke-width="1.5"{dash}/>'
        )
        label = _strip_html_tags(c.attrib.get("value", ""))
        if label:
            font_color = st.get("fontColor", "#0f172a")
            font_size = st.get("fontSize", "12")
            try:
                fs = max(9, min(18, int(float(font_size))))
            except ValueError:
                fs = 12
            is_container = any(geom_by_id[other][4] == cid for other in geom_by_id if other != cid)
            lines = label.split("\n")
            base_y = (ay + fs + 8.0) if is_container else (ay + h / 2.0 - ((len(lines) - 1) * (fs + 3)) / 2.0 + fs * 0.35)
            for idx, ln in enumerate(lines):
                safe_ln = html.escape(ln[:90])
                ty = base_y + idx * (fs + 3)
                svg_parts.append(
                    f'<text x="{ax + w / 2.0:.1f}" y="{ty:.1f}" text-anchor="middle" font-family="Inter, Roboto, Arial, sans-serif" font-size="{fs}" font-weight="600" fill="{html.escape(font_color, quote=True)}">{safe_ln}</text>'
                )

    # Render edges
    for c in cells:
        if c.attrib.get("edge") != "1":
            continue
        src = c.attrib.get("source", "")
        tgt = c.attrib.get("target", "")
        if src in abs_boxes and tgt in abs_boxes:
            sx, sy, sw, sh = abs_boxes[src]
            tx, ty, tw, th = abs_boxes[tgt]
            x1, y1 = sx + sw / 2.0, sy + sh / 2.0
            x2, y2 = tx + tw / 2.0, ty + th / 2.0
            st = _parse_style_map(c.attrib.get("style", ""))
            estroke = st.get("strokeColor", "#475569")
            if estroke == "none":
                estroke = "#475569"
            svg_parts.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{html.escape(estroke, quote=True)}" stroke-width="1.6" marker-end="url(#geap-arrow)"/>'
            )
            elabel = _strip_html_tags(c.attrib.get("value", ""))
            if elabel:
                mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
                safe_el = html.escape(elabel.replace("\n", " ")[:60])
                svg_parts.append(
                    f'<rect x="{mx - len(safe_el)*3.1 - 4:.1f}" y="{my - 10:.1f}" width="{len(safe_el)*6.2 + 8:.1f}" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>'
                )
                svg_parts.append(
                    f'<text x="{mx:.1f}" y="{my + 2:.1f}" text-anchor="middle" font-family="Inter, Roboto, Arial, sans-serif" font-size="10" font-weight="600" fill="#1e293b">{safe_el}</text>'
                )

    svg_parts.append("</svg>")
    return "\n".join(svg_parts)


def load_drawio_overlays(overlays_file: Path) -> Dict[str, Any]:
    with _OVERLAY_LOCK:
        if overlays_file.is_file():
            try:
                d = json.loads(overlays_file.read_text(encoding="utf-8"))
                if isinstance(d, dict):
                    d.setdefault("diagrams", {})
                    return d
            except Exception:
                pass
        return {"schemaVersion": "1.0", "diagrams": {}}


def save_drawio_overlay(
    overlays_file: Path,
    diag_id: str,
    xml_content: str,
    actor_email: str,
    updated_at: str,
) -> Dict[str, Any]:
    svg_content = synthesize_svg_from_drawio_xml(xml_content, diag_id=diag_id)
    with _OVERLAY_LOCK:
        store = {"schemaVersion": "1.0", "diagrams": {}}
        if overlays_file.is_file():
            try:
                existing = json.loads(overlays_file.read_text(encoding="utf-8"))
                if isinstance(existing, dict):
                    store = existing
                    store.setdefault("diagrams", {})
            except Exception:
                pass
        entry = {
            "id": diag_id,
            "xml": xml_content,
            "svg": svg_content,
            "bytes": len(xml_content.encode("utf-8")),
            "svgBytes": len(svg_content.encode("utf-8")),
            "actorEmail": actor_email,
            "updatedAt": updated_at,
        }
        store["diagrams"][diag_id] = entry
        store["updatedAt"] = updated_at
        overlays_file.parent.mkdir(parents=True, exist_ok=True)
        overlays_file.write_text(json.dumps(store, indent=2), encoding="utf-8")
        return store


def remove_drawio_overlay(overlays_file: Path, diag_id: str, updated_at: str) -> Dict[str, Any]:
    with _OVERLAY_LOCK:
        store = {"schemaVersion": "1.0", "diagrams": {}}
        if overlays_file.is_file():
            try:
                existing = json.loads(overlays_file.read_text(encoding="utf-8"))
                if isinstance(existing, dict):
                    store = existing
                    store.setdefault("diagrams", {})
            except Exception:
                pass
        store["diagrams"].pop(diag_id, None)
        store["updatedAt"] = updated_at
        overlays_file.parent.mkdir(parents=True, exist_ok=True)
        overlays_file.write_text(json.dumps(store, indent=2), encoding="utf-8")
        return store
