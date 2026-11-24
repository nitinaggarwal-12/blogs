#!/usr/bin/env python3
"""
Create Blog1 v3 — Canonical WS1-Parity Diagram Suite (6 C4 Diagrams, 1600x900 @ 7620 EMU/px).

Built directly on top of `scripts/create_blog1_canonical_compiler.py` (pure Python 3.11+
stdlib port of `scripts/lib/diagram_spec_compiler.mjs`) so EVERY blog produced in
Create Blog1 renders with the EXACT SAME visual language, airy Google Cloudstyle canvas,
subtle shadows, plane pills, `WHO RUNS WHAT` guide, converging/diverging `#595959` elbows,
multi-color official GCP SVG icons, activation-bar UML sequence swimlanes, Google Cloud
Architecture Center hub-and-spoke bezels, AND native DrawingML editable PPTX slides as
the flagship `WS1`–`WS5` series.

Figures emitted per blog (`v3`):
  1. `architecture` — WS1-style 5-Hop Platform Architecture (C4 L2, ~90 cells, 23 edges)
  2. `cloudarch`    — Official Google Cloud Architecture Center Hub-and-Spoke Blueprint (numbered 1..7)
  3. `sequence`     — Activation-Bar Sequence Swimlane (C4 L3, numbered circles 1..6 + bottom summary)
  4. `security`     — Concentric Defense-in-Depth Trust Perimeter & Threat Matrix (C4 L1)
  5. `wire`         — Wire-Protocol Envelope & Schema Transformation (C4 L4)
  6. `async`        — Asynchronous CDC / Export / DLQ & Reconciliation Loop
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

try:
    from scripts import create_blog1_canonical_compiler as _cc
except ImportError:
    import create_blog1_canonical_compiler as _cc  # type: ignore

CANVAS_W = _cc.CANVAS_W
CANVAS_H = _cc.CANVAS_H
PLANE_PALETTE = _cc.PLANE_PALETTE


def load_icon_atlas() -> Dict[str, Dict[str, str]]:
    return _cc.load_gcp_icons()


def strip_inline_md(text: Any) -> str:
    return _cc.strip_md(text)


def infer_gcp_icon_key(*hints: str) -> str:
    return _cc.resolve_icon_key(*hints)


def build_viewer_url(drawio_xml: str, slug_tag: str = "diagram", title: str = "Diagram") -> str:
    return _cc.build_viewer_url(drawio_xml, slug_tag, title)


def _norm_bullets(
    raw: Any,
    max_items: int,
    max_width_px: float,
    fs: float = 9.8,
    bullet: str = "• ",
    max_total_lines: int = 12,
    max_lines_per_item: int = 3,
) -> List[Dict[str, Any]]:
    """Normalizes bullets into pixel-wrapped line dicts without ever slicing mid-bullet or overflowing borders."""
    items: List[str] = []
    if isinstance(raw, list):
        for r in raw:
            t = _cc.strip_md(r).lstrip("•-* ").strip()
            if t:
                items.append(t)
    elif isinstance(raw, str) and raw.strip():
        parts = [p.strip(" •-;") for p in re.split(r"[•;\n]+", _cc.strip_md(raw)) if p.strip(" •-;")]
        items = parts
    out: List[Dict[str, Any]] = []
    for it in items[:max_items]:
        # Indent continuation lines only by 6px visual margin by tightening inner wrap width slightly
        wrapped = _cc.wrap_px(f"{bullet}{it}", max_width_px - 4, fs, max_lines=max_lines_per_item)
        if not wrapped:
            continue
        if len(out) + len(wrapped) > max_total_lines:
            # Never emit half a bullet (e.g. orphaned `• Header:` without its value)
            if len(out) == 0:
                wrapped = wrapped[:max_total_lines]
            else:
                break
        for wi, wln in enumerate(wrapped):
            txt = wln if wi == 0 else f"  {wln}"
            out.append({"text": txt, "size": fs, "color": "#5F6368", "gapTop": 4 if (wi == 0 and out) else 0})
    return out


def _pick_pill_w(text: str, min_w: int = 62, pad: int = 18) -> int:
    return max(min_w, int(round(_cc.est_text_width_px(text, 8.5, bold=True) + pad)))


def _node_by_plane(bp: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """Legacy fallback mapper from `architectureZones` when `platformDiagram` is omitted (e.g., unit tests)."""
    buckets: Dict[str, List[Dict[str, Any]]] = {"edge": [], "control": [], "compute": [], "data": []}
    for z in bp.get("architectureZones") or []:
        zid = str(z.get("id") or z.get("label") or "").lower()
        key = "compute"
        if any(k in zid for k in ("edge", "ingress", "client", "front")):
            key = "edge"
        elif any(k in zid for k in ("control", "gov", "iam", "sec", "kms")):
            key = "control"
        elif any(k in zid for k in ("data", "persist", "store", "db", "storage", "memory")):
            key = "data"
        for n in z.get("nodes") or []:
            if isinstance(n, dict):
                buckets[key].append(n)
    return buckets


# ===========================================================================
# FIGURE 1: WS1-STYLE MASTER PLATFORM ARCHITECTURE (C4 L2, ~90 cells, 22 edges)
# ===========================================================================

def build_architecture_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Cloud Reference Architecture")
    pd = bp.get("platformDiagram") or {}
    buckets = _node_by_plane(bp)
    domain_lbl = _cc.strip_md(bp.get("domain") or "Google Cloud Architecture")

    # Control Plane top strip (3 rich cards spanning x=504..1570)
    cp_title = _cc.strip_md(pd.get("controlPlaneTitle") or f"Google Cloud — Shared Governance & Control Plane ({domain_lbl})")
    raw_cp = pd.get("controlCards") or []
    if len(raw_cp) < 3:
        fb_ctrl = buckets["control"]
        defaults_cp = [
            {"title": "Stage 1 · Identity & Auth Broker", "icon": "cloud_iam", "bullets": ["OIDC / WIF short-lived federation", "Strict least-privilege IAM & IAP JWT"]},
            {"title": "Stage 2 · Policy & Key Governance", "icon": "cloud_kms", "bullets": ["CMEK customer-managed encryption keys", "Artifact provenance & VPC-SC perimeter"]},
            {"title": "Stage 4 · Guardrails & Audit DLP", "icon": "model_armor", "bullets": ["Inline prompt & PII/PHI egress screening", "Zero-PII audit logs & policy enforcement"]},
        ]
        raw_cp = list(raw_cp)
        for i in range(3):
            if i < len(raw_cp):
                continue
            if i < len(fb_ctrl):
                n = fb_ctrl[i]
                raw_cp.append({
                    "title": _cc.strip_md(n.get("label") or defaults_cp[i]["title"]),
                    "icon": _cc.resolve_icon_key(n.get("iconKey", ""), n.get("label", ""), n.get("service", "")),
                    "bullets": [n.get("service") or "", n.get("description") or ""],
                })
            else:
                raw_cp.append(defaults_cp[i])

    # Left 3 caller / workload tiers
    raw_tiers = pd.get("callerTiers") or [
        {"title": "Tier 1: Interactive", "subtitle": "Low-latency agents (sync)"},
        {"title": "Tier 2: Service Mesh", "subtitle": "OIDC / mTLS backend callers"},
        {"title": "Tier 3: Governance", "subtitle": "Audit, batch & compliance"},
    ]
    while len(raw_tiers) < 3:
        raw_tiers.append({"title": f"Workload Tier {len(raw_tiers) + 1}", "subtitle": "Authenticated ingress"})

    # Pipeline nodes along y=256..510
    stage_1a = pd.get("identityStage") or {}
    stage_1b = pd.get("ingressStage") or {}
    if not stage_1a and buckets["edge"]:
        n = buckets["edge"][0]
        stage_1a = {"title": n.get("label", "Identity & Auth"), "icon": n.get("iconKey", "cloud_iam"), "bullets": [n.get("service", "OIDC / WIF"), n.get("description", "Short-lived federated token")]}
    if not stage_1b and len(buckets["edge"]) > 1:
        n = buckets["edge"][1]
        stage_1b = {"title": n.get("label", "Edge PEP & ALB"), "icon": n.get("iconKey", "cloud_load_balancing"), "bullets": [n.get("service", "External ALB + Armor"), n.get("description", "TLS 1.3 + header stripping")]}

    fe_cfg = pd.get("frontEnd") or {}
    gw_in = pd.get("inboundGateway") or {}
    runtime = pd.get("coreRuntime") or {}
    gw_out = pd.get("outboundGateway") or {}

    if not runtime and buckets["compute"]:
        n = buckets["compute"][0]
        runtime = {"title": n.get("label", "Core Runtime"), "service": n.get("service", "Cloud Run v2"), "subtitle": "Core Orchestrator", "icon": n.get("iconKey", "cloud_run"), "bullets": [n.get("description", "Stateless container runtime")]}

    # Right target cards (4 stacked tinted boxes inside x=1384..1574)
    raw_targets = pd.get("targets") or []
    if len(raw_targets) < 4:
        raw_targets = list(raw_targets)
        fb_data = buckets["data"]
        defaults_t = [
            {"title": "Primary Data Plane", "subtitle": "Strongly consistent reads"},
            {"title": "AI / Embedding Target", "subtitle": "Vertex AI Gemini 2.5"},
            {"title": "Analytical Export", "subtitle": "BigQuery audit warehouse"},
            {"title": "CMEK & Backup Vault", "subtitle": "Cloud KMS + GCS archival"},
        ]
        for i in range(4):
            if i < len(raw_targets):
                continue
            if i < len(fb_data):
                raw_targets.append({"title": fb_data[i].get("label", defaults_t[i]["title"]), "subtitle": fb_data[i].get("service", defaults_t[i]["subtitle"])})
            else:
                raw_targets.append(defaults_t[i])

    # Bottom row 3 panels (Sessions/Hot State | Memory/Data Bank | FinOps/Bulkhead)
    sess = pd.get("hotStateCard") or {"title": "Hot State &", "title2": "Session Cache", "icon": "memorystore", "bullets": ["Sub-ms tenant state cache", "Scoped key prefixes", "Rate token bucket lock", "Deterministic TTL flush"]}
    dbank = pd.get("dataBankCard") or {}
    db_tiers = dbank.get("tiers") or [
        "Primary Store: Strongly consistent multi-region data plane",
        "Access Control: Fine-grained row/tenant boundary enforcement",
        "Key Isolation: CMEK KMS encryption & audit tombstoning",
    ]
    while len(db_tiers) < 3:
        db_tiers.append("Immutable backup & archival replication tier")
    finops = pd.get("finopsCard") or {"title": "FinOps & Cost", "title2": "Guardrail Bulkhead", "icon": "finops", "bullets": ["Per-tenant RPM / TPM caps", "Prefix cache cost control", "Latency SLO p95 budgets", "Real-time OTel chargeback"]}
    obs = pd.get("observabilityBar") or {
        "title": "Observability, Audit Telemetry & Fail-Closed Breakers — HTTP 401 / 403 / 429 / 422",
        "subtitle": "Zero-PII SHA-256 request logging  •  Cloud Monitoring SLO alerts  •  OpenTelemetry traces & billing attribution",
    }

    guide_in = pd.get("planeGuide") or {}
    guide_rows = guide_in.get("rows") or [
        {"plane": "CONTROL", "headline": "Identity, Edge WAF/IAP, Gateways, KMS & Telemetry", "detail": "Enforces authentication, least-privilege IAM, CMEK encryption, rate limits, and zero-PII audit spans across every request."},
        {"plane": "COMPUTE", "headline": "Stateless API, Agent Orchestrator & Reasoning Runtime", "detail": "Runs deterministic ingress validation, context orchestration, embedding calls, and private internal egress with zero public IAM."},
        {"plane": "DATA", "headline": "Strongly Consistent Primary Store, Cache & Audit Export", "detail": "Enforces tenant isolation, time-indexed/versioned persistence, change streams, and durable compliance archives."},
    ]

    # Build cards dynamically with ZERO text clipping
    cards: List[Dict[str, Any]] = []

    # 3 top Control Plane cards
    cp_xs = [(518, 334), (868, 334), (1218, 338)]
    for i, ((cx, cw), cd) in enumerate(zip(cp_xs, raw_cp[:3])):
        cid = ("cp_auth", "cp_reg", "cp_sec")[i]
        c_title, tfs = _cc.fit_single_line_px(cd.get("title") or f"Control Node {i+1}", cw - 58, 11.4, bold=True)
        ic = _cc.resolve_icon_key(cd.get("icon", ""), cd.get("title", ""), default=("cloud_iam", "agent_registry", "model_armor")[i])
        lines = [{"text": c_title, "bold": True, "size": tfs, "color": "#202124"}]
        braw = cd.get("bullets") or [cd.get("subtitle", ""), cd.get("detail", "")]
        for bi, bt in enumerate([_cc.strip_md(x) for x in braw if _cc.strip_md(x)][:2]):
            ft, fsz = _cc.fit_single_line_px(bt, cw - 58, 9.7)
            lines.append({"text": ft, "size": fsz, "color": "#5F6368", "gapTop": 3 if bi == 0 else 2})
        cards.append({"id": cid, "x": cx, "y": 108, "w": cw, "h": 80, "fill": "#FFFFFF", "stroke": "#DADCE0", "icon": ic, "iconPos": "left", "iconSize": 22, "lines": lines})

    # 3 Left caller tier cards (`u_a`, `u_b`, `u_c`)
    tier_styles = [
        ("#E8F0FE", "#93C5FD", "#1E3A8A", "#1D4ED8"),
        ("#FEF7E0", "#FCD34D", "#78350F", "#B45309"),
        ("#F3E8FD", "#C4B5FD", "#4C1D95", "#6D28D9"),
    ]
    for i in range(3):
        tr = raw_tiers[i]
        bg, st, c1, c2 = tier_styles[i]
        t1, f1 = _cc.fit_single_line_px(tr.get("title") or f"Tier {i+1}", 126, 12.2, bold=True)
        t2, f2 = _cc.fit_single_line_px(tr.get("subtitle") or "", 126, 9.5)
        cards.append({
            "id": ("u_a", "u_b", "u_c")[i],
            "x": 24, "y": 256 + i * 90, "w": 142, "h": 74,
            "fill": bg, "stroke": st, "strokeWidth": 1.4, "shadow": True, "align": "center",
            "lines": [
                {"text": t1, "bold": True, "size": f1, "color": c1},
                *([{"text": t2, "size": f2, "color": c2, "gapTop": 3}] if t2 else []),
            ],
        })

    # Stage 1A (`idp`) & Stage 1B (`ingress`)
    for cid, cx, cw, st_obj, def_t, def_ic in (
        ("idp", 202, 156, stage_1a, "Stage 1A · Identity", "cloud_iam"),
        ("ingress", 378, 158, stage_1b, "Stage 1B · Edge PEP", "cloud_load_balancing"),
    ):
        hdr_lines = _cc.wrap_px(st_obj.get("title") or def_t, cw - 20, 11.2, bold=True, max_lines=2)
        lines = [{"text": h, "bold": True, "size": 11.0, "color": "#202124"} for h in hdr_lines]
        blts = _norm_bullets(st_obj.get("bullets") or st_obj.get("detail") or ["OIDC / WIF verification", "Zero-trust header check", "TLS 1.3 mutual auth", "JWKS cache + rotation"], 5, cw - 24, fs=9.2, max_total_lines=10)
        if blts:
            blts[0]["gapTop"] = 6
        lines.extend(blts)
        ic = _cc.resolve_icon_key(st_obj.get("icon", ""), st_obj.get("title", ""), default=def_ic)
        cards.append({"id": cid, "x": cx, "y": 256, "w": cw, "h": 254, "fill": "#FFFFFF", "stroke": "#DADCE0", "icon": ic, "iconPos": "top", "iconSize": 24, "padL": 11, "padR": 10, "lines": lines})

    # Front End / App Layer 2x2 GCP SVG Icon Tile Grid (`app_layer`)
    fe_title, fe_fs = _cc.fit_single_line_px(fe_cfg.get("title") or "Front End", 108, 12.0, bold=True)
    fe_sub, fe_sfs = _cc.fit_single_line_px(fe_cfg.get("subtitle") or "Shared Entry", 108, 9.6)
    raw_tiles = fe_cfg.get("tiles") or [
        {"icon": "gemini", "label": "Gemini"},
        {"icon": "adk", "label": "ADK"},
        {"icon": "cloud_run", "label": "Run"},
        {"icon": "spanner", "label": "Data"},
    ]
    tile_pos = [(574, 326, "#EFF6FF", "#93C5FD"), (628, 326, "#EFF6FF", "#93C5FD"), (574, 392, "#ECFDF5", "#86EFAC"), (628, 392, "#EFF6FF", "#93C5FD")]
    fe_tiles = []
    for ti in range(4):
        td = raw_tiles[ti] if ti < len(raw_tiles) else {"icon": "gcp_cloud", "label": "GCP"}
        tx, ty, tf, ts = tile_pos[ti]
        lbl_t, _ = _cc.fit_single_line_px(td.get("label") or "GCP", 42, 8.6, bold=True)
        fe_tiles.append({"id": f"badge_fe_{ti+1}", "x": tx, "y": ty, "w": 46, "h": 52, "icon": _cc.resolve_icon_key(td.get("icon", ""), td.get("label", "")), "iconSize": 24, "label": lbl_t, "labelSize": 8.5, "fill": tf, "stroke": ts})
    cards.append({
        "id": "app_layer", "x": 564, "y": 256, "w": 120, "h": 254,
        "fill": "#FFFFFF", "stroke": "#DADCE0", "isContainer": True, "align": "center", "padT": 14,
        "lines": [{"text": fe_title, "bold": True, "size": fe_fs, "color": "#202124"}, {"text": fe_sub, "size": fe_sfs, "color": "#5F6368", "gapTop": 2}],
        "tiles": fe_tiles,
    })

    # Focal Blue Hero Card 1: Inbound Gateway / PEP (`gw_in_box`)
    def _add_hero_gateway(prefix: str, gx: int, cfg: Dict[str, Any], def_hdr: str, def_sub: str, def_blts: List[str]) -> None:
        hdr_txt, hfs = _cc.fit_single_line_px(cfg.get("header") or def_hdr, 122, 12.2, bold=True)
        sub_txt, sfs = _cc.fit_single_line_px(cfg.get("title") or def_sub, 144, 10.6, bold=True)
        ic = _cc.resolve_icon_key(cfg.get("icon", ""), def_hdr, default="agent_gateway")
        body_lines = [{"text": sub_txt, "bold": True, "size": sfs, "color": "#1E3A8A"}]
        blts = _norm_bullets(cfg.get("bullets") or def_blts, 5, 138, fs=9.1, max_total_lines=10)
        for bl in blts:
            bl["color"] = "#334155"
        if blts:
            blts[0]["gapTop"] = 6
        body_lines.extend(blts)
        cards.append({"id": f"{prefix}_box", "x": gx, "y": 256, "w": 178, "h": 254, "fill": "#FFFFFF", "stroke": "#DADCE0", "isContainer": True, "rx": 14, "lines": []})
        cards.append({"id": f"{prefix}_hdr", "x": gx, "y": 256, "w": 178, "h": 42, "fill": "#1A73E8", "stroke": "none", "rx": 12, "icon": ic, "iconPos": "header-left", "iconSize": 22, "padL": 42, "allowOverlap": True, "lines": [{"text": hdr_txt, "bold": True, "size": hfs, "color": "#FFFFFF"}]})
        cards.append({"id": f"{prefix}_body", "x": gx + 8, "y": 306, "w": 162, "h": 196, "fill": "#F8FAFC", "stroke": "#BFDBFE", "rx": 10, "padL": 10, "padR": 8, "allowOverlap": True, "lines": body_lines})

    _add_hero_gateway("gw_in", 716, gw_in, "Ingress Gate / PEP", "Stage 2 · Policy Gate", ["Verify IAP / STS JWT", "Validate tenant & schema", "Enforce WAF / DLP screen", "Bind trace & quota key"])

    # Central Core Runtime (`runtime` + nested `adk_orch`)
    rt_hdr, rt_fs = _cc.fit_single_line_px(runtime.get("title") or "Stage 3 · Core Runtime", 154, 11.6, bold=True)
    rt_svc, rt_sfs = _cc.fit_single_line_px(runtime.get("service") or "Cloud Run v2 (Private)", 154, 9.6)
    rt_ic = _cc.resolve_icon_key(runtime.get("icon", ""), runtime.get("service", ""), default="cloud_run")
    cards.append({
        "id": "runtime", "x": 926, "y": 256, "w": 208, "h": 254, "fill": "#FFFFFF", "stroke": "#DADCE0",
        "isContainer": True, "rx": 14, "icon": rt_ic, "iconPos": "top-left", "iconSize": 22, "padL": 42, "padT": 12,
        "lines": [{"text": rt_hdr, "bold": True, "size": rt_fs, "color": "#202124"}, {"text": rt_svc, "size": rt_sfs, "color": "#5F6368", "gapTop": 2}],
    })
    orch_title, ofs = _cc.fit_single_line_px(runtime.get("subtitle") or "Stateless Orchestrator", 168, 10.6, bold=True)
    rt_lines = [{"text": orch_title, "bold": True, "size": ofs, "color": "#202124"}]
    rblts = _norm_bullets(runtime.get("bullets") or ["Internal load-balancer ingress", "Vertex AI embedding & reason", "Parameterized read/write txns", "Zero public allUsers IAM"], 5, 164, fs=9.2, max_total_lines=10)
    if rblts:
        rblts[0]["gapTop"] = 6
    rt_lines.extend(rblts)
    cards.append({"id": "adk_orch", "x": 936, "y": 318, "w": 188, "h": 182, "fill": "#F8F9FA", "stroke": "#DADCE0", "rx": 10, "padL": 11, "padR": 9, "allowOverlap": True, "lines": rt_lines})

    # Focal Blue Hero Card 2: Outbound Router / Egress Gate (`gw_out_box`)
    _add_hero_gateway("gw_out", 1166, gw_out, "Data & Egress Gate", "Stage 4 · Downstream PEP", ["Fine-grained access check", "Route sync & async paths", "PII / DLP output screen", "Emit signed audit span"])

    # Right 4 Target Cards inside x=1384..1574
    tgt_styles = [
        ("#ECFDF5", "#34D399", "#065F46", "#047857"),
        ("#EFF6FF", "#60A5FA", "#1E3A8A", "#1D4ED8"),
        ("#F3E8FD", "#C4B5FD", "#6B21A8", "#7E22CE"),
        ("#FFFBEB", "#FBBF24", "#78350F", "#B45309"),
    ]
    tgt_ids = ("mcp_srv", "a2a_srv", "llm_srv", "ent_api")
    eco_tiles = [
        {"id": "badge_tg_1", "x": 1400, "y": 660, "w": 46, "h": 46, "icon": "google_g", "iconSize": 26, "fill": "#FFFFFF", "stroke": "#CBD5E1"},
        {"id": "badge_tg_2", "x": 1456, "y": 660, "w": 46, "h": 46, "icon": "gcp_cloud", "iconSize": 26, "fill": "#FFFFFF", "stroke": "#CBD5E1"},
        {"id": "badge_tg_3", "x": 1512, "y": 660, "w": 46, "h": 46, "icon": "saas_globe", "iconSize": 26, "fill": "#FFFFFF", "stroke": "#CBD5E1"},
    ]
    for i in range(4):
        tg = raw_targets[i]
        bg, st, c1, c2 = tgt_styles[i]
        t1, f1 = _cc.fit_single_line_px(tg.get("title") or f"Target {i+1}", 150, 11.2, bold=True)
        t2, f2 = _cc.fit_single_line_px(tg.get("subtitle") or "", 150, 9.4)
        card = {
            "id": tgt_ids[i], "x": 1396, "y": 288 + i * 90, "w": 166, "h": 78,
            "fill": bg, "stroke": st, "strokeWidth": 1.4, "shadow": True, "align": "center",
            "lines": [{"text": t1, "bold": True, "size": f1, "color": c1}, *([{"text": t2, "size": f2, "color": c2, "gapTop": 3}] if t2 else [])],
        }
        if i == 3:
            card["tiles"] = eco_tiles
        cards.append(card)

    # Bottom 3-panel row: Hot State / Sessions (`sessions`)
    s_hdr = _cc.wrap_px(sess.get("title") or "Hot State & Cache", 148, 11.2, bold=True, max_lines=2)
    if sess.get("title2") and len(s_hdr) == 1:
        s_hdr.append(_cc.strip_md(sess["title2"]))
    s_lines = [{"text": x, "bold": True, "size": 11.0, "color": "#202124"} for x in s_hdr[:2]]
    sblts = _norm_bullets(sess.get("bullets") or [], 4, 142, fs=9.1, max_total_lines=8)
    if sblts:
        sblts[0]["gapTop"] = 6
    s_lines.extend(sblts)
    cards.append({"id": "sessions", "x": 558, "y": 562, "w": 168, "h": 182, "fill": "#FFFFFF", "stroke": "#DADCE0", "rx": 14, "icon": _cc.resolve_icon_key(sess.get("icon", ""), default="memorystore"), "iconPos": "top", "iconSize": 24, "padL": 11, "padR": 9, "lines": s_lines})

    # Bottom center: Memory Bank / Data Store Tiers (`mem_bank` + `mb_1..3`)
    mb_hdr, mfs = _cc.fit_single_line_px(dbank.get("title") or "Primary Persistence & Isolation Tiers", 350, 11.2, bold=True)
    cards.append({"id": "mem_bank", "x": 760, "y": 562, "w": 374, "h": 182, "fill": "#FFFFFF", "stroke": "#DADCE0", "isContainer": True, "rx": 14, "padT": 10, "lines": [{"text": mb_hdr, "bold": True, "size": mfs, "color": "#202124"}]})
    mb_styles = [("#E8F0FE", "#93C5FD", "#1E3A8A"), ("#FEF7E0", "#FCD34D", "#78350F"), ("#F3E8FD", "#C4B5FD", "#4C1D95")]
    for i in range(3):
        bg, st, tc = mb_styles[i]
        tt, tfs = _cc.fit_single_line_px(str(db_tiers[i]), 326, 10.8, bold=True)
        cards.append({"id": f"mb_{i+1}", "x": 774, "y": 596 + i * 48, "w": 346, "h": 40, "fill": bg, "stroke": st, "strokeWidth": 1.3, "shadow": True, "align": "center", "rx": 10, "allowOverlap": True, "lines": [{"text": tt, "bold": True, "size": tfs, "color": tc}]})

    # Bottom right: FinOps / Rate Bulkhead (`finops_bulkhead`)
    f_hdr = _cc.wrap_px(finops.get("title") or "FinOps & Cost", 150, 11.2, bold=True, max_lines=2)
    if finops.get("title2") and len(f_hdr) == 1:
        f_hdr.append(_cc.strip_md(finops["title2"]))
    f_lines = [{"text": x, "bold": True, "size": 11.0, "color": "#137333"} for x in f_hdr[:2]]
    fblts = _norm_bullets(finops.get("bullets") or [], 4, 144, fs=9.1, max_total_lines=8)
    for bl in fblts:
        bl["color"] = "#3C4043"
    if fblts:
        fblts[0]["gapTop"] = 6
    f_lines.extend(fblts)
    cards.append({"id": "finops_bulkhead", "x": 1168, "y": 562, "w": 170, "h": 182, "fill": "#E6F4EA", "stroke": "#81C995", "rx": 14, "icon": _cc.resolve_icon_key(finops.get("icon", ""), default="finops"), "iconPos": "top", "iconSize": 24, "padL": 11, "padR": 9, "lines": f_lines})

    # Bottom spanning telemetry & fail-closed breakers bar (`obs_bar`)
    ot, ofs = _cc.fit_single_line_px(obs.get("title") or "Observability & Fail-Closed Breakers", 710, 11.6, bold=True)
    osub, osfs = _cc.fit_single_line_px(obs.get("subtitle") or "", 710, 9.8)
    cards.append({
        "id": "obs_bar", "x": 558, "y": 780, "w": 780, "h": 58, "fill": "#FFFFFF", "stroke": "#DADCE0", "rx": 12,
        "icon": "cloud_monitoring", "iconPos": "left", "iconSize": 22,
        "lines": [{"text": ot, "bold": True, "size": ofs, "color": "#202124"}, *([{"text": osub, "size": osfs, "color": "#5F6368", "gapTop": 3}] if osub else [])],
    })

    # Target header & caller header pills
    tgt_hdr = _cc.strip_md(pd.get("targetsLabel") or "Target Services")
    caller_hdr = _cc.strip_md(pd.get("callerLabel") or "Caller Tiers")
    zones = [
        {"id": "zone_cp", "x": 504, "y": 74, "w": 1066, "h": 126, "rx": 16, "fill": "#F8F9FA", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True, "title": cp_title, "titleColor": "#1967D2", "titleSize": 11.8},
        {"id": "zone_hop1", "x": 194, "y": 236, "w": 350, "h": 282, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True},
        {"id": "zone_fe", "x": 556, "y": 236, "w": 136, "h": 282, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["COMPUTE"]["zoneStroke"], "dashed": True},
        {"id": "zone_gw_in", "x": 708, "y": 236, "w": 194, "h": 282, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True},
        {"id": "zone_rt", "x": 918, "y": 236, "w": 224, "h": 282, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["COMPUTE"]["zoneStroke"], "dashed": True},
        {"id": "zone_gw_out", "x": 1158, "y": 236, "w": 194, "h": 282, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True},
        {"id": "zone_tgts", "x": 1384, "y": 236, "w": 190, "h": 516, "rx": 16, "fill": "#F8F9FA", "stroke": "#DADCE0", "dashed": False, "title": tgt_hdr, "titleColor": "#202124", "titleSize": 12.0, "titleAlign": "center"},
        {"id": "zone_sess", "x": 550, "y": 548, "w": 184, "h": 204, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["DATA"]["zoneStroke"], "dashed": True},
        {"id": "zone_mem", "x": 752, "y": 548, "w": 390, "h": 204, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["DATA"]["zoneStroke"], "dashed": True},
        {"id": "zone_finops", "x": 1160, "y": 548, "w": 186, "h": 204, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True},
        {"id": "zone_obs", "x": 550, "y": 772, "w": 796, "h": 74, "rx": 14, "fill": "none", "stroke": PLANE_PALETTE["CONTROL"]["zoneStroke"], "dashed": True},
    ]

    pills = [
        {"id": "pill_cp", "plane": "CONTROL", "text": "CONTROL · governance", "x": 1412, "y": 65, "w": 146, "h": 18},
        {"id": "pill_hop1", "plane": "CONTROL", "text": "CONTROL · identity + ingress", "x": 204, "y": 227, "w": 170, "h": 18},
        {"id": "pill_fe", "plane": "COMPUTE", "text": "COMPUTE", "x": 590, "y": 227, "w": 68, "h": 18},
        {"id": "pill_gwin", "plane": "CONTROL", "text": "CONTROL · Ingress PEP", "x": 768, "y": 227, "w": 128, "h": 18},
        {"id": "pill_rt", "plane": "COMPUTE", "text": "COMPUTE", "x": 1064, "y": 227, "w": 68, "h": 18},
        {"id": "pill_gwout", "plane": "CONTROL", "text": "CONTROL · Egress PEP", "x": 1220, "y": 227, "w": 126, "h": 18},
        {"id": "pill_tgts_d", "plane": "DATA", "text": "DATA · targets", "x": 1396, "y": 266, "w": 84, "h": 16},
        {"id": "pill_tgts_c", "plane": "CONTROL", "text": "CONTROL", "x": 1486, "y": 266, "w": 76, "h": 16},
        {"id": "pill_tgts_cmek", "plane": "CONTROL", "text": "CONTROL · CMEK", "x": 1390, "y": 742, "w": 98, "h": 18},
        {"id": "pill_tgts_api", "plane": "DATA", "text": "DATA · APIs", "x": 1494, "y": 742, "w": 74, "h": 18},
        {"id": "pill_sess", "plane": "DATA", "text": "DATA · hot state", "x": 626, "y": 539, "w": 100, "h": 18},
        {"id": "pill_mem_d", "plane": "DATA", "text": "DATA · primary stores", "x": 760, "y": 539, "w": 122, "h": 18},
        {"id": "pill_mem_c", "plane": "CONTROL", "text": "CONTROL · isolation", "x": 888, "y": 539, "w": 120, "h": 18},
        {"id": "pill_fin_c", "plane": "CONTROL", "text": "CONTROL", "x": 1212, "y": 539, "w": 62, "h": 18},
        {"id": "pill_fin_m", "plane": "COMPUTE", "text": "COMPUTE", "x": 1278, "y": 539, "w": 64, "h": 18},
        {"id": "pill_obs", "plane": "CONTROL", "text": "CONTROL · audit + breakers", "x": 1184, "y": 763, "w": 152, "h": 18},
    ]

    # Exact WS1-verified orthogonal converging/diverging elbows (ZERO pill clipping!)
    edges = [
        {"id": "e1", "source": "u_a", "target": "idp", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.42, "points": [{"x": 184, "y": 293}, {"x": 184, "y": 363}]},
        {"id": "e2", "source": "u_b", "target": "idp", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e3", "source": "u_c", "target": "idp", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.58, "points": [{"x": 184, "y": 473}, {"x": 184, "y": 403}]},
        {"id": "e4", "source": "idp", "target": "ingress", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e5", "source": "ingress", "target": "app_layer", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e6", "source": "app_layer", "target": "gw_in_box", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e7", "source": "gw_in_box", "target": "runtime", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e8", "source": "runtime", "target": "gw_out_box", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        # Governance drops clearing every top-border pill
        {"id": "e9", "source": "cp_auth", "target": "gw_in_box", "dashed": True, "stroke": "#1A73E8", "exitX": 0.70, "exitY": 1, "entryX": 0.20, "entryY": 0},
        {"id": "e9b", "source": "cp_auth", "target": "runtime", "stroke": "#5F6368", "exitX": 0.88, "exitY": 1, "entryX": 0.22, "entryY": 0, "points": [{"x": 812, "y": 214}, {"x": 972, "y": 214}]},
        {"id": "e10", "source": "cp_reg", "target": "runtime", "stroke": "#5F6368", "exitX": 0.50, "exitY": 1, "entryX": 0.524, "entryY": 0},
        {"id": "e11", "source": "cp_sec", "target": "gw_out_box", "dashed": True, "stroke": "#1A73E8", "exitX": 0.14, "exitY": 1, "entryX": 0.20, "entryY": 0, "points": [{"x": 1265, "y": 212}, {"x": 1202, "y": 212}]},
        # Bottom data & memory wires
        {"id": "e12", "source": "app_layer", "target": "sessions", "exitX": 0.367, "exitY": 1, "entryX": 0.298, "entryY": 0},
        {"id": "e13", "source": "sessions", "target": "mem_bank", "exitX": 1, "exitY": 0.5, "entryX": 0, "entryY": 0.5},
        {"id": "e14", "source": "runtime", "target": "mem_bank", "bidirectional": True, "exitX": 0.606, "exitY": 1, "entryX": 0.781, "entryY": 0},
        {"id": "e15", "source": "runtime", "target": "finops_bulkhead", "exitX": 0.80, "exitY": 1, "entryX": 0.141, "entryY": 0, "points": [{"x": 1092, "y": 528}, {"x": 1192, "y": 528}]},
        # Observability telemetry drops inside dedicated vertical gutters
        {"id": "e16a", "source": "gw_in_box", "target": "obs_bar", "dashed": True, "stroke": "#595959", "exitX": 0.15, "exitY": 1, "entryX": 0.237, "entryY": 0, "points": [{"x": 743, "y": 524}, {"x": 743, "y": 768}]},
        {"id": "e16", "source": "runtime", "target": "obs_bar", "dashed": True, "stroke": "#595959", "exitX": 0.96, "exitY": 1, "entryX": 0.76, "entryY": 0, "points": [{"x": 1126, "y": 522}, {"x": 1151, "y": 522}, {"x": 1151, "y": 768}]},
        {"id": "e16b", "source": "gw_out_box", "target": "obs_bar", "dashed": True, "stroke": "#595959", "exitX": 0.94, "exitY": 1, "entryX": 1, "entryY": 0.5, "points": [{"x": 1333, "y": 522}, {"x": 1356, "y": 522}, {"x": 1356, "y": 809}]},
        # Right diverging fan-out
        {"id": "e17", "source": "gw_out_box", "target": "mcp_srv", "exitX": 1, "exitY": 0.28, "entryX": 0, "entryY": 0.5},
        {"id": "e18", "source": "gw_out_box", "target": "a2a_srv", "exitX": 1, "exitY": 0.56, "entryX": 0, "entryY": 0.5, "points": [{"x": 1370, "y": 398}, {"x": 1370, "y": 417}]},
        {"id": "e19", "source": "gw_out_box", "target": "llm_srv", "exitX": 1, "exitY": 0.72, "entryX": 0, "entryY": 0.5, "points": [{"x": 1370, "y": 439}, {"x": 1370, "y": 507}]},
        {"id": "e20", "source": "gw_out_box", "target": "ent_api", "exitX": 1, "exitY": 0.86, "entryX": 0, "entryY": 0.5, "points": [{"x": 1370, "y": 474}, {"x": 1370, "y": 597}]},
    ]

    return {
        "id": f"{slug}-architecture",
        "diagramName": "Figure 1 - Platform Architecture",
        "title": f"Reference Platform Architecture — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "labels": [
            {"id": "lbl_users", "x": 24, "y": 228, "w": 142, "h": 20, "text": caller_hdr, "size": 12.5, "align": "center"},
            {"id": "lbl_tgts_sub", "x": 1390, "y": 716, "w": 178, "h": 16, "text": "Google • Google Cloud • APIs", "size": 9.3, "bold": False, "color": "#5F6368", "align": "center"},
        ],
        "cards": cards,
        "planeGuide": {
            "id": "plane_guide", "x": 24, "y": 548, "w": 510, "h": 298,
            "title": _cc.strip_md(guide_in.get("title") or "WHO RUNS WHAT — PLANE OWNERSHIP GUIDE"),
            "rows": [
                {"plane": str(r.get("plane") or "CONTROL").upper(), "headline": _cc.strip_md(r.get("headline") or ""), "detail": _cc.strip_md(r.get("detail") or "")}
                for r in guide_rows[:3]
            ],
            "footnote": _cc.strip_md(guide_in.get("footnote") or "Caller tiers (left) are not a plane. Dashed green/blue control wires separate governance planes from synchronous request execution."),
        },
        "pills": pills,
        "edges": edges,
    }


def compile_architecture_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_architecture_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    val = _cc.validate_spec_geometry(spec)
    url = _cc.build_viewer_url(xml, f"{slug}-architecture", f"{bp.get('title', 'Architecture')} — Platform")
    return xml, svg, url, val["iconCount"]


# ===========================================================================
# FIGURE 2: GOOGLE CLOUD ARCHITECTURE CENTER HUB-AND-SPOKE BLUEPRINT
# (matching ws1-cloud-arch-center-5hop-baseline.drawio.png)
# ===========================================================================

def build_cloudarch_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Cloud Architecture Center Blueprint")
    ca = bp.get("cloudArchDiagram") or {}
    caller = ca.get("caller") or {"title": "Authenticated Client / Agent", "subtitle": "OIDC / Bearer JWT"}
    perim_lbl = _cc.strip_md(ca.get("perimeterLabel") or "Shared hubs (VPC Service Controls Organization Perimeter)")
    vpc_lbl = _cc.strip_md(ca.get("vpcLabel") or "VPC • Zero-Trust Private Ingress & Private Service Connect")
    rh = ca.get("routingHub") or {}
    gh = ca.get("governanceHub") or {}
    sp_a = ca.get("spokeA") or {}
    sp_b = ca.get("spokeB") or {}

    def _small_card(cid: str, x: int, y: int, w: int, h: int, title_t: str, sub_t: str, icon: str, fill: str = "#FFFFFF", stroke: str = "#1E293B") -> Dict[str, Any]:
        tt, tfs = _cc.fit_single_line_px(title_t, w - 54, 11.2, bold=True)
        st, sfs = _cc.fit_single_line_px(sub_t, w - 54, 9.2)
        return {
            "id": cid, "x": x, "y": y, "w": w, "h": h, "fill": fill, "stroke": stroke, "strokeWidth": 1.3, "rx": 10,
            "icon": _cc.resolve_icon_key(icon, title_t, sub_t), "iconPos": "left", "iconSize": 22, "padL": 44,
            "lines": [{"text": tt, "bold": True, "size": tfs, "color": "#0F172A"}, *([{"text": st, "size": sfs, "color": "#475569", "gapTop": 2}] if st else [])],
        }

    rh_nodes = rh.get("securityNodes") or [
        {"title": "Cloud Armor WAF", "subtitle": "L7 DDoS & OWASP policy rules", "icon": "cloud_armor"},
        {"title": "Model Armor / DLP", "subtitle": "Prompt & PII egress guard", "icon": "model_armor"},
        {"title": "Identity-Aware Proxy", "subtitle": "OIDC / JWT ECDSA assertion", "icon": "iap"},
    ]
    gh_nodes = gh.get("nodes") or [
        {"title": "Security Command Center", "subtitle": "Continuous posture & threat telemetry", "icon": "scc"},
        {"title": "Central IAM & Cloud KMS", "subtitle": "Least-privilege SA & CMEK rotation", "icon": "cloud_kms"},
        {"title": "Cloud Logging & BigQuery", "subtitle": "Immutable audit & analytics sink", "icon": "bigquery"},
    ]
    alb_d = rh.get("alb") or {"title": "External Application LB", "subtitle": "TLS 1.3 & header strip", "icon": "cloud_load_balancing"}
    run_d = rh.get("runtime") or {"title": "Cloud Run v2 API", "subtitle": "Private ingress hub", "icon": "cloud_run"}

    cards: List[Dict[str, Any]] = [
        # External user box outside blue Google Cloud bezel
        {
            "id": "ca_user", "x": 620, "y": 54, "w": 360, "h": 54, "fill": "#FFFFFF", "stroke": "#1E293B", "strokeWidth": 1.6, "rx": 10, "align": "center",
            "icon": "saas_globe", "iconPos": "left", "iconSize": 22, "padL": 42,
            "lines": [
                {"text": _cc.fit_single_line_px(caller.get("title", "Client / Agent"), 290, 12, bold=True)[0], "bold": True, "size": 11.8, "color": "#0F172A"},
                {"text": _cc.fit_single_line_px(caller.get("subtitle", "OIDC / JWT"), 290, 9.5)[0], "size": 9.4, "color": "#475569", "gapTop": 2},
            ],
        },
    ]
    # Routing hub inner cards
    for i in range(3):
        nd = rh_nodes[i] if i < len(rh_nodes) else {"title": f"Security Control {i+1}", "subtitle": "Edge check", "icon": "cloud_armor"}
        cards.append(_small_card(f"rh_s{i}", 96, 290 + i * 70, 290, 56, nd.get("title", ""), nd.get("subtitle", ""), nd.get("icon", "cloud_armor")))
    cards.append(_small_card("rh_alb", 560, 316, 300, 62, alb_d.get("title", "External ALB"), alb_d.get("subtitle", "TLS 1.3 termination"), alb_d.get("icon", "cloud_load_balancing")))
    cards.append(_small_card("rh_run", 560, 412, 300, 62, run_d.get("title", "Cloud Run v2"), run_d.get("subtitle", "Stateless API gateway"), run_d.get("icon", "cloud_run")))

    # Governance hub inner cards
    for i in range(3):
        nd = gh_nodes[i] if i < len(gh_nodes) else {"title": f"Governance {i+1}", "subtitle": "Audit & IAM", "icon": "scc"}
        cards.append(_small_card(f"gh_n{i}", 1042, 290 + i * 70, 426, 56, nd.get("title", ""), nd.get("subtitle", ""), nd.get("icon", "scc")))

    # Dual bottom spokes (Spoke A gold #FEF7E0 vs Spoke B rose #FCE8E6)
    def _build_spoke(prefix: str, bx: int, cfg: Dict[str, Any], def_title: str, def_sub: str, def_nodes: List[Dict[str, str]]) -> None:
        ns = cfg.get("nodes") or def_nodes
        while len(ns) < 4:
            ns.append(def_nodes[len(ns)])
        # Top-left safety / model card, top-right compute card, bottom-left LLM/tool card, bottom-right datastore card
        cards.append(_small_card(f"{prefix}_guard", bx + 26, 628, 250, 56, ns[0].get("title", ""), ns[0].get("subtitle", ""), ns[0].get("icon", "model_armor")))
        cards.append(_small_card(f"{prefix}_eng",   bx + 368, 628, 276, 56, ns[1].get("title", ""), ns[1].get("subtitle", ""), ns[1].get("icon", "vertex_ai")))
        cards.append(_small_card(f"{prefix}_llm",   bx + 26, 742, 250, 56, ns[2].get("title", ""), ns[2].get("subtitle", ""), ns[2].get("icon", "gemini")))
        cards.append(_small_card(f"{prefix}_store", bx + 368, 742, 276, 56, ns[3].get("title", ""), ns[3].get("subtitle", ""), ns[3].get("icon", "spanner")))

    _build_spoke(
        "spa", 84, sp_a,
        "Spoke A · Online Sync & Tenant A Isolation", "Primary low-latency read / reasoning path",
        [
            {"title": "FGAC & Policy Filter", "subtitle": "Parameterized role check", "icon": "cloud_iam"},
            {"title": "Sync Read Orchestrator", "subtitle": "Hybrid graph + vector", "icon": "adk"},
            {"title": "Gemini 2.5 Reasoning", "subtitle": "Grounded response synth", "icon": "gemini"},
            {"title": "Primary Data Store", "subtitle": "Bi-temporal read view", "icon": "spanner"},
        ],
    )
    _build_spoke(
        "spb", 826, sp_b,
        "Spoke B · Mutation, Audit & Tenant B Isolation", "Deterministic supersede & export path",
        [
            {"title": "CMEK & Crypto Guard", "subtitle": "Per-tenant KMS binding", "icon": "cloud_kms"},
            {"title": "Write / Tombstone Engine", "subtitle": "Atomic commit & supersede", "icon": "cloud_run"},
            {"title": "Change Stream Pipeline", "subtitle": "Async CDC & enrichment", "icon": "api_gateway"},
            {"title": "Analytics & Archival", "subtitle": "BigQuery + GCS snapshot", "icon": "bigquery"},
        ],
    )

    zones = [
        {"id": "z_perim", "x": 46, "y": 194, "w": 1508, "h": 656, "rx": 12, "fill": "none", "stroke": "#334155", "strokeWidth": 1.1, "title": perim_lbl, "titleColor": "#0F172A", "titleSize": 10.5},
        {"id": "z_vpc", "x": 62, "y": 222, "w": 1476, "h": 616, "rx": 10, "fill": "none", "stroke": "#475569", "strokeWidth": 1.0, "title": vpc_lbl, "titleColor": "#334155", "titleSize": 10.2},
        # Routing Hub (soft Google Blue)
        {"id": "z_rhub", "x": 82, "y": 250, "w": 814, "h": 244, "rx": 12, "fill": "#D2E3FC", "stroke": "#1A73E8", "strokeWidth": 1.3,
         "title": _cc.strip_md(rh.get("title") or "Routing Hub (Ingress & Policy Enforcement)"),
         "subtitle": _cc.strip_md(rh.get("subtitle") or "Central authentication, WAF enforcement & private service proxy"), "titleColor": "#0F172A", "titleSize": 11.8},
        # Governance Hub (soft Google Green)
        {"id": "z_ghub", "x": 1014, "y": 250, "w": 494, "h": 244, "rx": 12, "fill": "#CEEAD6", "stroke": "#188038", "strokeWidth": 1.3,
         "title": _cc.strip_md(gh.get("title") or "Central Governance & Security Hub"),
         "subtitle": _cc.strip_md(gh.get("subtitle") or "Shared posture monitoring, KMS rotation & audit logs"), "titleColor": "#0F172A", "titleSize": 11.8},
        # Spoke A outer boundary & gold inner card
        {"id": "z_sp_a_out", "x": 82, "y": 546, "w": 680, "h": 276, "rx": 12, "fill": "none", "stroke": "#475569", "strokeWidth": 1.1,
         "title": _cc.strip_md(sp_a.get("outerLabel") or "Isolation Boundary A • Primary Request & Read Scope"), "titleColor": "#0F172A", "titleSize": 9.8},
        {"id": "z_sp_a", "x": 96, "y": 572, "w": 652, "h": 240, "rx": 10, "fill": "#FEF7E0", "stroke": "#D97706", "strokeWidth": 1.2,
         "title": _cc.strip_md(sp_a.get("title") or "Workload Path A (Enterprise Read / Sync)"),
         "subtitle": _cc.strip_md(sp_a.get("subtitle") or "Fine-grained access control & grounded inference"), "titleColor": "#0F172A", "titleSize": 11.2},
        # Spoke B outer boundary & rose inner card
        {"id": "z_sp_b_out", "x": 824, "y": 546, "w": 680, "h": 276, "rx": 12, "fill": "none", "stroke": "#475569", "strokeWidth": 1.1,
         "title": _cc.strip_md(sp_b.get("outerLabel") or "Isolation Boundary B • Mutation, Crypto-Erasure & Audit Scope"), "titleColor": "#0F172A", "titleSize": 9.8},
        {"id": "z_sp_b", "x": 838, "y": 572, "w": 652, "h": 240, "rx": 10, "fill": "#FCE8E6", "stroke": "#C5221F", "strokeWidth": 1.2,
         "title": _cc.strip_md(sp_b.get("title") or "Workload Path B (Write / Supersede / Export)"),
         "subtitle": _cc.strip_md(sp_b.get("subtitle") or "Deterministic versioning, CMEK protection & BigQuery sink"), "titleColor": "#0F172A", "titleSize": 11.2},
    ]

    edges = [
        # Top Request (1) / Response (7) pipes
        {"id": "ca_e_req", "rawPoints": [(760, 108), (760, 316)], "stroke": "#0F172A", "strokeWidth": 1.8},
        {"id": "ca_e_rsp", "rawPoints": [(826, 316), (826, 108)], "stroke": "#0F172A", "strokeWidth": 1.8},
        # Routing hub internal security checks
        {"id": "ca_e_waf", "rawPoints": [(386, 318), (528, 318), (528, 336), (560, 336)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_e_dlp", "rawPoints": [(386, 388), (528, 388), (528, 358), (560, 358)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_e_iap", "rawPoints": [(386, 458), (560, 458)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        # ALB <-> Run
        {"id": "ca_e_alb_run", "rawPoints": [(668, 378), (668, 412)], "stroke": "#0F172A", "strokeWidth": 1.6},
        {"id": "ca_e_run_alb", "rawPoints": [(750, 412), (750, 378)], "stroke": "#0F172A", "strokeWidth": 1.6},
        # Run -> Spoke A / Spoke B split bus
        {"id": "ca_e_bus_a", "rawPoints": [(690, 474), (690, 520), (420, 520), (420, 546)], "stroke": "#0F172A", "strokeWidth": 1.8},
        {"id": "ca_e_bus_b", "rawPoints": [(728, 474), (728, 520), (1164, 520), (1164, 546)], "stroke": "#0F172A", "strokeWidth": 1.8},
        # Telemetry dashed feed from both spokes to Governance Hub
        {"id": "ca_e_gov_a", "rawPoints": [(600, 546), (600, 532), (1260, 532), (1260, 494)], "stroke": "#188038", "strokeWidth": 1.5, "dashed": True},
        {"id": "ca_e_gov_b", "rawPoints": [(1260, 546), (1260, 494)], "stroke": "#188038", "strokeWidth": 1.5, "dashed": True},
        # Inside Spoke A
        {"id": "ca_a1", "rawPoints": [(360, 656), (452, 656)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_a2", "rawPoints": [(588, 684), (588, 742)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_a3", "rawPoints": [(360, 770), (452, 770)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        # Inside Spoke B
        {"id": "ca_b1", "rawPoints": [(1102, 656), (1194, 656)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_b2", "rawPoints": [(1330, 684), (1330, 742)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
        {"id": "ca_b3", "rawPoints": [(1102, 770), (1194, 770)], "stroke": "#0F172A", "strokeWidth": 1.4, "bidirectional": True},
    ]

    badges = [
        {"id": "cb_1", "cx": 760, "cy": 134, "r": 12, "text": "1", "fill": "#1967D2"},
        {"id": "cb_7t", "cx": 826, "cy": 134, "r": 12, "text": "7", "fill": "#1967D2"},
        {"id": "cb_2", "cx": 668, "cy": 395, "r": 11, "text": "2", "fill": "#1967D2"},
        {"id": "cb_7m", "cx": 750, "cy": 395, "r": 11, "text": "7", "fill": "#1967D2"},
        {"id": "cb_3", "cx": 524, "cy": 520, "r": 11, "text": "3", "fill": "#1967D2"},
        {"id": "cb_4", "cx": 406, "cy": 656, "r": 11, "text": "4", "fill": "#1967D2"},
        {"id": "cb_5", "cx": 406, "cy": 770, "r": 11, "text": "5", "fill": "#1967D2"},
        {"id": "cb_6", "cx": 588, "cy": 713, "r": 11, "text": "6", "fill": "#1967D2"},
    ]

    labels = [
        {"id": "cl_req", "x": 676, "y": 124, "w": 68, "h": 20, "text": "Request", "size": 10.5, "color": "#0F172A", "align": "right", "bold": False},
        {"id": "cl_rsp", "x": 844, "y": 124, "w": 76, "h": 20, "text": "Response", "size": 10.5, "color": "#0F172A", "align": "left", "bold": False},
        {"id": "cl_req2", "x": 586, "y": 386, "w": 68, "h": 18, "text": "Request", "size": 9.4, "color": "#0F172A", "align": "right", "bold": False},
        {"id": "cl_rsp2", "x": 768, "y": 386, "w": 72, "h": 18, "text": "Response", "size": 9.4, "color": "#0F172A", "align": "left", "bold": False},
        {"id": "cl_waf", "x": 396, "y": 298, "w": 118, "h": 16, "text": "Security policies", "size": 9.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_dlp", "x": 396, "y": 366, "w": 118, "h": 16, "text": "Sanitize & screen", "size": 9.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_iap", "x": 404, "y": 438, "w": 134, "h": 16, "text": "User authentication", "size": 9.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_bus", "x": 544, "y": 500, "w": 138, "h": 16, "text": "Route to boundary", "size": 9.2, "color": "#0F172A", "align": "center", "bold": False},
        {"id": "cl_gov", "x": 1272, "y": 508, "w": 220, "h": 18, "text": "Security & telemetry audit spans", "size": 9.2, "color": "#137333", "align": "left", "bold": False},
        {"id": "cl_a_rw", "x": 604, "y": 702, "w": 110, "h": 18, "text": "Scoped RAG / SQL", "size": 9.0, "color": "#78350F", "align": "left", "bold": False},
        {"id": "cl_b_rw", "x": 1344, "y": 702, "w": 124, "h": 18, "text": "Atomic commit / CDC", "size": 9.0, "color": "#991B1B", "align": "left", "bold": False},
    ]

    return {
        "id": f"{slug}-cloudarch",
        "diagramName": "Figure 2 - Cloud Arch Center",
        "title": f"Cloud Architecture Center Hub-and-Spoke Blueprint: {title}",
        "subtitle": "Numbered flow steps (1..7) inside VPC Service Controls Organization Perimeter with dual workload isolation spokes",
        "titleY": 8,
        "titleSize": 16.5,
        "titleColor": "#174EA6",
        "gcpBezel": {"x": 28, "y": 146, "w": 1544, "h": 726, "label": "Google Cloud"},
        "zones": zones,
        "labels": labels,
        "cards": cards,
        "circleBadges": badges,
        "edges": edges,
    }


def compile_cloudarch_v3(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_cloudarch_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    val = _cc.validate_spec_geometry(spec)
    url = _cc.build_viewer_url(xml, f"{slug}-cloudarch", f"{bp.get('title', 'Architecture')} — Cloud Arch Center")
    return xml, svg, url, val["iconCount"]


# ===========================================================================
# FIGURE 3: WS1 ACTIVATION-BAR SEQUENCE SWIMLANE (C4 L3)
# (matching ws1-c4-l3-process-sequence-swimlane.drawio.png)
# ===========================================================================

def build_sequence_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Request Lifecycle")
    sq = bp.get("sequenceDiagram") or {}
    raw_actors = sq.get("actors") or bp.get("sequenceActors") or []
    default_actors = [
        {"box": "CALLER", "label": "Client / Agent", "planes": []},
        {"box": "HOP 1", "label": "Edge & Auth (ALB / IAP)", "planes": ["CONTROL"]},
        {"box": "HOP 2–3", "label": "API & Orchestrator", "planes": ["CONTROL", "COMPUTE"]},
        {"box": "HOP 4", "label": "AI Model & Guardrails", "planes": ["CONTROL", "COMPUTE"]},
        {"box": "HOP 5", "label": "Data Store & Audit", "planes": ["COMPUTE", "DATA"]},
    ]
    actors: List[Dict[str, Any]] = []
    for i in range(5):
        if i < len(raw_actors) and isinstance(raw_actors[i], dict):
            a = raw_actors[i]
            actors.append({
                "box": _cc.strip_md(a.get("box") or default_actors[i]["box"]),
                "label": _cc.strip_md(a.get("label") or default_actors[i]["label"]),
                "planes": a.get("planes") if isinstance(a.get("planes"), list) else default_actors[i]["planes"],
            })
        else:
            actors.append(default_actors[i])

    # X centers matching WS1 swimlane cadence
    lane_x = [132, 404, 678, 952, 1252]
    bar_colors = ["#0F172A", "#0D7377", "#475569", "#1E7E74", "#0B2545"]
    cards: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = []
    labels: List[Dict[str, Any]] = []
    lifelines: List[Dict[str, Any]] = []
    circle_badges: List[Dict[str, Any]] = []

    # Horizontal timeline guide arrow right under actor labels
    lifelines.append({"id": "ll_top_guide", "x1": 132, "y1": 228, "x2": 1492, "y2": 228, "stroke": "#CBD5E1", "strokeWidth": 1.6, "dashed": False, "arrowEnd": True})

    for i, a in enumerate(actors):
        cx = lane_x[i]
        btxt, bfs = _cc.fit_single_line_px(a["box"], 88, 10.5, bold=True)
        cards.append({
            "id": f"act_hdr_{i}", "x": cx - 50, "y": 116, "w": 100, "h": 40,
            "fill": "#FFFFFF", "stroke": "#1E293B" if i == 0 else "#0D7377" if i in (1, 3) else "#475569",
            "strokeWidth": 1.5, "dashed": i in (1, 3), "rx": 6, "align": "center",
            "lines": [{"text": btxt, "bold": True, "size": bfs, "color": "#0F172A" if i == 0 else "#0F4C5C"}],
        })
        px_cur = cx + 58
        for p_idx, pname in enumerate(a["planes"][:2]):
            pn = str(pname).upper()
            if pn not in PLANE_PALETTE:
                pn = "CONTROL"
            pw = _pick_pill_w(pn, min_w=54, pad=14)
            pills.append({"id": f"apill_{i}_{p_idx}", "plane": pn, "text": pn, "x": px_cur, "y": 127, "w": pw, "h": 18})
            px_cur += pw + 6
        ltxt, lfs = _cc.fit_single_line_px(a["label"], 195, 11.2, bold=True)
        labels.append({"id": f"act_lbl_{i}", "x": cx - 98, "y": 170, "w": 196, "h": 22, "text": ltxt, "size": lfs, "color": "#202124", "align": "center"})
        # Dashed lifeline drop down to bottom
        lifelines.append({"id": f"ll_v_{i}", "x1": cx, "y1": 240, "x2": cx, "y2": 782, "stroke": "#CBD5E1", "strokeWidth": 1.4, "dashed": True})
        # Hub circle dot on top timeline
        circle_badges.append({"id": f"hub_{i}", "cx": cx, "cy": 228, "r": 11, "fill": bar_colors[i], "text": ""})

    # Thick stepped activation bars (exact WS1 choreography)
    bars = [
        {"id": "bar_0", "x": lane_x[0] - 9, "y": 262, "w": 18, "h": 92, "fill": bar_colors[0]},
        {"id": "bar_1", "x": lane_x[1] - 9, "y": 274, "w": 18, "h": 162, "fill": bar_colors[1]},
        {"id": "bar_2", "x": lane_x[2] - 9, "y": 362, "w": 18, "h": 152, "fill": bar_colors[2]},
        {"id": "bar_3", "x": lane_x[3] - 9, "y": 442, "w": 18, "h": 222, "fill": bar_colors[3]},
        {"id": "bar_4", "x": lane_x[4] - 9, "y": 608, "w": 18, "h": 188, "fill": bar_colors[4]},
    ]

    # Steps (extract from rich sequenceDiagram or fallback sequenceSteps)
    raw_steps = sq.get("steps") or []
    legacy_steps = bp.get("sequenceSteps") or []
    def_steps = [
        {"title": "OIDC / Bearer Token Proof", "detail": "Signed client request ingress", "wire": "HTTPS TLS 1.3 + JWT"},
        {"title": "Edge Strip & Policy Verify", "detail": "Cloud Armor WAF + IAP assertion", "wire": "Internal mTLS + trace ID"},
        {"title": "Parse & Authorize Context", "detail": "Validate tenant claims & quota", "wire": "gRPC / JSON-RPC dispatch"},
        {"title": "Embeddings & Model Armor", "detail": "Vertex AI inference + DLP check", "wire": "Vector + GQL params"},
        {"title": "Guardrail & Role Binding", "detail": "Bind tenant scope & valid_at", "wire": "GRAPH_TABLE / SQL txn"},
        {"title": "0 Foreign Rows + OTel", "detail": "Audited result & trace span", "wire": "HTTP 200 JSON"},
    ]
    step_list: List[Dict[str, str]] = []
    for i in range(6):
        if i < len(raw_steps) and isinstance(raw_steps[i], dict):
            s = raw_steps[i]
            raw_t = _cc.strip_md(s.get("title") or s.get("label") or def_steps[i]["title"])
            clean_t = re.sub(r"^(?:step\s*)?\d+[.):\-\s]+\s*", "", raw_t, flags=re.IGNORECASE).strip() or raw_t
            step_list.append({
                "title": clean_t,
                "detail": _cc.strip_md(s.get("detail") or s.get("protocol") or def_steps[i]["detail"]),
                "wire": _cc.strip_md(s.get("wire") or s.get("arrowLabel") or def_steps[i]["wire"]),
            })
        elif i < len(legacy_steps) and isinstance(legacy_steps[i], dict):
            s = legacy_steps[i]
            raw_t = _cc.strip_md(s.get("label") or def_steps[i]["title"])
            clean_t = re.sub(r"^(?:step\s*)?\d+[.):\-\s]+\s*", "", raw_t, flags=re.IGNORECASE).strip() or raw_t
            step_list.append({
                "title": clean_t,
                "detail": _cc.strip_md(s.get("protocol") or def_steps[i]["detail"]),
                "wire": _cc.strip_md(f"{s.get('protocol', 'HTTPS')} -> {s.get('to', '')}"),
            })
        else:
            step_list.append(def_steps[i])

    # Stepped tinted step callouts + bold numbered circles (2-line wrapped detail prevents premature clipping)
    callout_cfg = [
        (0, lane_x[0] + 56, 246, 198, 56, "#F8FAFC", "#CBD5E1", "#0F172A", lane_x[0] + 32, 274, bar_colors[0]),
        (1, lane_x[1] + 56, 326, 198, 56, "#FEF7E0", "#FCD34D", "#92400E", lane_x[1] + 32, 354, bar_colors[1]),
        (2, lane_x[2] + 56, 404, 198, 56, "#E8F0FE", "#93C5FD", "#174EA6", lane_x[2] + 32, 432, bar_colors[2]),
        (3, lane_x[3] + 56, 442, 224, 58, "#ECFDF5", "#6EE7B7", "#065F46", lane_x[3] + 32, 471, bar_colors[3]),
        (5, lane_x[4] + 56, 610, 246, 62, "#ECFDF5", "#6EE7B7", "#065F46", lane_x[4] + 32, 641, bar_colors[4]),
    ]
    for sidx, cx, cy, cw, ch, bg, bd, fg, bx, by, bcol in callout_cfg:
        st = step_list[sidx]
        t_s, f_s = _cc.fit_single_line_px(st["title"], cw - 20, 10.4, bold=True)
        d_lines = _cc.wrap_px(st["detail"], cw - 20, 8.8, max_lines=2)
        badge_num = str(sidx + 1 if sidx < 4 else 6)
        circle_badges.append({"id": f"sb_{sidx}", "cx": bx, "cy": by, "r": 15, "text": badge_num, "fill": bcol, "fontSize": 12.0})
        cards.append({
            "id": f"scard_{sidx}", "x": cx, "y": cy, "w": cw, "h": ch,
            "fill": bg, "stroke": bd, "strokeWidth": 1.2, "rx": 8, "padL": 10, "padR": 10,
            "lines": [{"text": t_s, "bold": True, "size": f_s, "color": fg}]
            + [{"text": dl, "size": 8.8, "color": "#334155", "gapTop": 2 if di == 0 else 1} for di, dl in enumerate(d_lines)],
        })

    # Step 5 badge + soft rose binding card + dark chip (matching WS1 RLS + 3LO motif)
    s5 = step_list[4]
    circle_badges.append({"id": "sb_4", "cx": lane_x[3] + 34, "cy": 640, "r": 16, "text": "5", "fill": bar_colors[3], "fontSize": 12.5})
    cards.append({
        "id": "scard_guard_tag", "x": lane_x[3] - 126, "y": 604, "w": 104, "h": 28,
        "fill": "#475569", "stroke": "none", "rx": 6, "align": "center",
        "lines": [{"text": _cc.fit_single_line_px(sq.get("guardBadge") or "FGAC + Bind", 90, 9.2, bold=True)[0], "bold": True, "size": 9.2, "color": "#FFFFFF"}],
    })
    s5_det_lines = _cc.wrap_px(s5["detail"], 216, 8.9, max_lines=2)
    cards.append({
        "id": "scard_guard_box", "x": lane_x[2] + 14, "y": 640, "w": 238, "h": 58,
        "fill": "#FEF2F2", "stroke": "#FCA5A5", "strokeWidth": 1.2, "rx": 8, "padL": 11, "padR": 11,
        "lines": [
            {"text": _cc.fit_single_line_px(s5["title"], 216, 10.4, bold=True)[0], "bold": True, "size": 10.4, "color": "#991B1B"},
            *[{"text": dl, "size": 8.9, "color": "#334155", "gapTop": 2 if di == 0 else 1} for di, dl in enumerate(s5_det_lines)],
        ],
    })

    # Highlighted middle optimization / cache card between lane 3 & lane 4
    hl = sq.get("highlightBox") or {
        "title": "Strongly Consistent Read Snapshot",
        "subtitle": "Combined vector + graph + temporal filter",
        "metric": "Exact point-in-time isolation • Zero cross-store drift",
    }
    cards.append({
        "id": "seq_hl_box", "x": lane_x[3] + 18, "y": 512, "w": 262, "h": 82,
        "fill": "#E6F4EA", "stroke": "#188038", "strokeWidth": 1.3, "rx": 8, "align": "center",
        "lines": [
            {"text": _cc.fit_single_line_px(hl.get("title", ""), 238, 10.6, bold=True)[0], "bold": True, "size": 10.5, "color": "#065F46"},
            {"text": _cc.fit_single_line_px(hl.get("subtitle", ""), 238, 9.4, bold=True)[0], "bold": True, "size": 9.3, "color": "#065F46", "gapTop": 2},
            {"text": _cc.fit_single_line_px(hl.get("metric", ""), 238, 8.9)[0], "size": 8.9, "color": "#1E293B", "gapTop": 6},
        ],
    })

    # OTel 200 dark telemetry confirmation chip beside final bar
    otel_bullets = sq.get("otelBullets") or ["Enforce FGAC / zero leakage", "Zero-PII audit trace emit"]
    cards.append({
        "id": "seq_otel_panel", "x": lane_x[4] + 22, "y": 698, "w": 266, "h": 86,
        "fill": "#F8FAFC", "stroke": "#CBD5E1", "strokeWidth": 1.1, "rx": 8, "padL": 14, "padR": 78,
        "lines": [
            {"text": "• " + _cc.fit_single_line_px(str(b), 160, 9.0)[0], "size": 8.9, "color": "#334155", "gapTop": 3 if i else 0}
            for i, b in enumerate(otel_bullets[:3])
        ],
    })
    cards.append({
        "id": "seq_otel_chip", "x": lane_x[4] + 216, "y": 714, "w": 58, "h": 54,
        "fill": "#0F172A", "stroke": "none", "rx": 6, "align": "center", "allowOverlap": True,
        "lines": [{"text": "OTel", "bold": True, "size": 9.8, "color": "#FFFFFF"}, {"text": "200", "bold": True, "size": 9.8, "color": "#6EE7B7", "gapTop": 2}],
    })

    # Horizontal transfer arrows between activation bars
    edges = [
        {"id": "se_1", "rawPoints": [(lane_x[0] + 9, 322), (lane_x[1] - 11, 322)], "stroke": bar_colors[0], "strokeWidth": 1.8, "label": _cc.fit_single_line_px(step_list[0]["wire"], 210, 9.0, bold=True)[0], "labelX": (lane_x[0] + lane_x[1]) / 2, "labelY": 310, "labelBg": False},
        {"id": "se_2", "rawPoints": [(lane_x[1] + 9, 412), (lane_x[2] - 11, 412)], "stroke": bar_colors[1], "strokeWidth": 1.8, "label": _cc.fit_single_line_px(step_list[1]["wire"], 210, 9.0, bold=True)[0], "labelX": (lane_x[1] + lane_x[2]) / 2, "labelY": 398, "labelBg": False, "labelColor": "#065F46"},
        {"id": "se_3", "rawPoints": [(lane_x[2] + 9, 492), (lane_x[3] - 11, 492)], "stroke": bar_colors[2], "strokeWidth": 1.8, "label": _cc.fit_single_line_px(step_list[2]["wire"], 210, 9.0, bold=True)[0], "labelX": (lane_x[2] + lane_x[3]) / 2, "labelY": 478, "labelBg": False},
        {"id": "se_4", "rawPoints": [(lane_x[3] + 9, 662), (lane_x[4] - 11, 662)], "stroke": bar_colors[4], "strokeWidth": 1.8, "label": _cc.fit_single_line_px(step_list[4]["wire"], 220, 9.0, bold=True)[0], "labelX": (lane_x[3] + lane_x[4]) / 2, "labelY": 648, "labelBg": False},
    ]

    # Bottom 3 connected summary milestone cards (`y=720..812`)
    summaries = sq.get("stageSummaries") or [
        {"title": "1. Ingress Strip & Verify", "headline": "External ALB + Cloud Armor + IAP", "detail": "Short-lived ECDSA / OIDC assertion"},
        {"title": "2. Context, Filter & AI", "headline": "Stateless API + Model Guardrails", "detail": "DLP screening & bounded latency"},
        {"title": "3. Enforced Store & Audit", "headline": "Fine-Grained Access + OTel Span", "detail": "0 cross-tenant rows • Immutable logs"},
    ]
    sum_styles = [("#FEF2F2", "#DC2626", "#991B1B"), ("#EFF6FF", "#2563EB", "#1D4ED8"), ("#ECFDF5", "#059669", "#047857")]
    for i in range(3):
        sm = summaries[i] if i < len(summaries) else summaries[-1]
        sx = 64 + i * 388
        bg, bd, tc = sum_styles[i]
        cards.append({
            "id": f"sum_{i}", "x": sx, "y": 726, "w": 348, "h": 92,
            "fill": bg, "stroke": bd, "strokeWidth": 1.4, "rx": 10, "align": "center",
            "lines": [
                {"text": _cc.fit_single_line_px(sm.get("title", ""), 320, 11.4, bold=True)[0], "bold": True, "size": 11.4, "color": tc},
                {"text": _cc.fit_single_line_px(sm.get("headline", ""), 320, 10.6, bold=True)[0], "bold": True, "size": 10.4, "color": "#0F172A", "gapTop": 4},
                {"text": _cc.fit_single_line_px(sm.get("detail", ""), 320, 9.5)[0], "size": 9.4, "color": "#475569", "gapTop": 3},
            ],
        })
        if i < 2:
            edges.append({"id": f"se_sum_{i}", "rawPoints": [(sx + 348, 772), (sx + 388, 772)], "stroke": "#1A73E8" if i == 0 else "#059669", "strokeWidth": 1.8})

    leg_in = sq.get("legendStrip") or {}
    plane_legend = [
        {"id": "pl_ctl", "plane": "CONTROL", "x": 64, "y": 844, "w": 476, "h": 24, "text": leg_in.get("control") or "Edge ALB/WAF, IAP auth verification, policy guard & telemetry"},
        {"id": "pl_cmp", "plane": "COMPUTE", "x": 556, "y": 844, "w": 484, "h": 24, "text": leg_in.get("compute") or "Stateless API runtime, embedding call & grounded reasoning lane"},
        {"id": "pl_dat", "plane": "DATA", "x": 1056, "y": 844, "w": 480, "h": 24, "text": leg_in.get("data") or "Cache / scoped keys, primary datastore isolation & audit logs"},
    ]

    return {
        "id": f"{slug}-sequence",
        "diagramName": "Figure 3 - Request Sequence",
        "title": f"Request Lifecycle & Execution Sequence — {title}",
        "quadTopBar": True,
        "titleY": 30,
        "titleSize": 19.5,
        "dividerY": 80,
        "lifelines": lifelines,
        "labels": labels,
        "bars": bars,
        "cards": cards,
        "pills": pills,
        "circleBadges": circle_badges,
        "edges": edges,
        "planeLegend": plane_legend,
    }


def compile_sequence_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_sequence_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    return xml, svg, _cc.build_viewer_url(xml, f"{slug}-sequence", f"{bp.get('title', '')} — Sequence"), 5


# ===========================================================================
# FIGURE 4: DEFENSE-IN-DEPTH TRUST PERIMETER & THREAT MATRIX (C4 L1)
# ===========================================================================

def build_security_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Security Boundary")
    sd = bp.get("securityDiagram") or {}
    layers = sd.get("layers") or [
        {"layer": "L1 · EDGE INGRESS & WAF", "name": "Cloud Armor WAF & External ALB", "detail": "OWASP L7 rules, adaptive DDoS throttling & untrusted header stripping", "iconKey": "cloud_armor"},
        {"layer": "L2 · IDENTITY & NETWORK PERIMETER", "name": "Identity-Aware Proxy & VPC-SC", "detail": "Zero-trust ECDSA JWT assertion, OIDC / WIF federation & egress perimeter", "iconKey": "iap"},
        {"layer": "L3 · APPLICATION & DATA ACCESS", "name": "Least-Privilege IAM & FGAC", "detail": "Dedicated service account, internal-only Cloud Run ingress & scoped database roles", "iconKey": "cloud_iam"},
        {"layer": "L4 · DATA AT REST & CRYPTOGRAPHIC BOUNDARY", "name": "Cloud KMS CMEK & TLS 1.3", "detail": "Customer-managed keys, rotation/kill-switch support & mTLS transit encryption", "iconKey": "cloud_kms"},
    ]
    threats = sd.get("threats") or [
        {"id": "T-01", "vector": "Untrusted Header / Identity Spoof", "control": "ALB strips X-Tenant-ID; IAP signs verifiable ECDSA P-256 assertion"},
        {"id": "T-02", "vector": "Cross-Tenant / Indirect Injection", "control": "Fine-grained DB roles + parameterized queries + inline Model Armor screening"},
        {"id": "T-03", "vector": "Data Exfiltration via Egress", "control": "VPC Service Controls org perimeter & zero public allUsers IAM bindings"},
        {"id": "T-04", "vector": "Stale Policy / Tampered Audit", "control": "Immutable versioned records, CMEK key revocation & zero-PII hashed logs"},
    ]
    breakers = sd.get("breakers") or [
        {"code": "HTTP 401", "trigger": "Missing, expired, or unverified IAP / OIDC bearer token"},
        {"code": "HTTP 403", "trigger": "IAM role denial, VPC-SC boundary drop, or cross-tenant scope violation"},
        {"code": "HTTP 422", "trigger": "Malformed temporal query, schema failure, or guardrail reject"},
        {"code": "HTTP 429", "trigger": "Per-tenant Cloud Armor rate limit or token bulkhead exceeded"},
    ]

    ring_styles = [
        ("#EFF6FF", "#93C5FD", "#174EA6"),
        ("#ECFDF5", "#6EE7B7", "#065F46"),
        ("#F5F3FF", "#C4B5FD", "#5B21B6"),
        ("#FFFBEB", "#FCD34D", "#92400E"),
    ]
    zones: List[Dict[str, Any]] = []
    cards: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [
        {"id": "sp_hdr", "plane": "CONTROL", "text": "C4 L1 · TRUST & SECURITY BOUNDARY", "x": 1358, "y": 19, "w": 210, "h": 22},
    ]

    # Concentric pastel defense rings (left x=38..1050, y=94..678)
    for i in range(min(4, len(layers))):
        ly = layers[i]
        pad = i * 24
        rx0, ry0 = 38 + pad, 94 + i * 116
        rw, rh = 1002 - pad * 2, 580 - i * 116 - pad * 0.5
        bg, st, tc = ring_styles[i]
        zones.append({"id": f"sec_ring_{i}", "x": rx0, "y": ry0, "w": rw, "h": int(rh), "rx": 14, "fill": bg, "stroke": st, "strokeWidth": 1.6, "dashed": i % 2 == 0})
        lname, _ = _cc.fit_single_line_px(ly.get("name") or f"Layer {i+1}", rw - 92, 13.5, bold=True)
        ldet_lines = _cc.wrap_px(ly.get("detail") or "", rw - 92, 10.6, max_lines=2)
        ic = _cc.resolve_icon_key(ly.get("iconKey", ""), ly.get("name", ""), ly.get("layer", ""))
        cards.append({
            "id": f"sec_card_{i}", "x": rx0 + 14, "y": ry0 + 14, "w": rw - 28, "h": 82,
            "fill": "#FFFFFF", "stroke": st, "strokeWidth": 1.3, "rx": 10, "shadow": True,
            "icon": ic, "iconPos": "left", "iconSize": 28, "padL": 54,
            "lines": [
                {"text": _cc.strip_md(ly.get("layer") or f"L{i+1}"), "bold": True, "size": 9.2, "color": tc},
                {"text": lname, "bold": True, "size": 13.0, "color": "#202124", "gapTop": 2},
                *[{"text": d, "size": 10.4, "color": "#5F6368", "gapTop": 2} for d in ldet_lines],
            ],
        })
        if i < 3:
            edges.append({"id": f"se_pierce_{i}", "rawPoints": [(rx0 + rw / 2, ry0 + 96), (rx0 + rw / 2, ry0 + 116)], "stroke": tc, "strokeWidth": 1.6})

    # Airy Threat Matrix panel (right x=1066..1564, y=94..674)
    zones.append({"id": "z_tmat", "x": 1068, "y": 94, "w": 496, "h": 580, "rx": 14, "fill": "#F8FAFC", "stroke": "#CBD5E1", "strokeWidth": 1.3, "title": "Threat Vector → Active Control Matrix", "titleColor": "#0F172A", "titleSize": 12.2})
    for ti in range(min(4, len(threats))):
        t = threats[ti]
        ty = 138 + ti * 130
        tid = _cc.strip_md(t.get("id") or f"T-0{ti+1}")
        vec, vfs = _cc.fit_single_line_px(t.get("vector") or "Threat vector", 360, 11.4, bold=True)
        ctl_lines = _cc.wrap_px(t.get("control") or "Mitigation control", 436, 10.2, max_lines=3)
        cards.append({
            "id": f"thr_{ti}", "x": 1086, "y": ty, "w": 460, "h": 114,
            "fill": "#FFFFFF", "stroke": "#DADCE0", "strokeWidth": 1.2, "rx": 10, "shadow": True, "padL": 16, "padR": 16,
            "lines": [
                {"text": f"{tid}  ·  {vec}", "bold": True, "size": vfs, "color": "#991B1B"},
                *[{"text": c, "size": 10.2, "color": "#334155", "gapTop": 5 if ci == 0 else 2} for ci, c in enumerate(ctl_lines)],
            ],
        })
        # Subtle dashed linking arrow connecting concentric ring edge to matching threat row
        mx_e = 1054
        sy_e = 152 + ti * 116
        ey_e = ty + 54
        edges.append({"id": f"thr_lnk_{ti}", "rawPoints": [(1040 - ti * 24, sy_e), (mx_e, sy_e), (mx_e, ey_e), (1086, ey_e)], "stroke": "#94A3B8", "strokeWidth": 1.2, "dashed": True})

    # Crisp cryptographic invariant badges inside L4 (eliminates empty belly)
    inv_pills = [
        ("CMEK Key Isolation", "Per-tenant Cloud KMS DEK"),
        ("Zero Public allUsers", "Internal ALB + IAP ingress only"),
        ("Immutable Audit Logs", "Zero-PII SHA-256 query trace"),
    ]
    for pi, (ih, isub) in enumerate(inv_pills):
        px = 132 + pi * 270
        cards.append({
            "id": f"l4_inv_{pi}", "x": px, "y": 556, "w": 250, "h": 54,
            "fill": "#FFFFFF", "stroke": "#FCD34D", "strokeWidth": 1.1, "rx": 8, "align": "center", "allowOverlap": True,
            "lines": [{"text": ih, "bold": True, "size": 10.4, "color": "#92400E"}, {"text": isub, "size": 9.2, "color": "#5F6368", "gapTop": 2}],
        })

    # Bottom Fail-Closed Circuit Breakers (`y=708..820`)
    zones.append({"id": "z_brk", "x": 38, "y": 706, "w": 1526, "h": 120, "rx": 12, "fill": "#F8FAFC", "stroke": "#CBD5E1", "strokeWidth": 1.2, "title": "FAIL-CLOSED HTTP CIRCUIT BREAKERS (ZERO SILENT FALLBACK)", "titleColor": "#991B1B", "titleSize": 10.6})
    b_colors = ["#C5221F", "#B91C1C", "#6D28D9", "#B45309"]
    for bi in range(4):
        br = breakers[bi] if bi < len(breakers) else {"code": f"HTTP 40{bi}", "trigger": "Blocked"}
        bx = 56 + bi * 376
        cards.append({"id": f"brk_code_{bi}", "x": bx, "y": 742, "w": 92, "h": 64, "fill": b_colors[bi], "stroke": "none", "rx": 8, "align": "center", "lines": [{"text": _cc.strip_md(br.get("code") or "HTTP 403"), "bold": True, "size": 11.4, "mono": True, "color": "#FFFFFF"}]})
        t_lines = _cc.wrap_px(br.get("trigger") or "", 242, 9.8, max_lines=3)
        cards.append({
            "id": f"brk_txt_{bi}", "x": bx + 100, "y": 742, "w": 262, "h": 64,
            "fill": "#FFFFFF", "stroke": "#DADCE0", "strokeWidth": 1.1, "rx": 8, "padL": 10, "padR": 10,
            "lines": [{"text": ln, "size": 9.8, "color": "#1E293B", "gapTop": 1 if li else 0} for li, ln in enumerate(t_lines)],
        })

    return {
        "id": f"{slug}-security",
        "diagramName": "Figure 4 - Security Boundary",
        "title": f"Trust Perimeter & Defense-in-Depth Boundary — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "cards": cards,
        "edges": edges,
        "pills": pills,
        "planeLegend": [
            {"id": "sl_1", "plane": "CONTROL", "x": 38, "y": 848, "w": 750, "h": 24, "text": "Concentric boundary enforcement: Edge WAF -> IAP JWT -> Private IAM/FGAC -> CMEK encryption"},
            {"id": "sl_2", "plane": "SECURITY", "x": 810, "y": 848, "w": 754, "h": 24, "text": "Fail-closed default: zero public allUsers ingress, zero silent auth bypass"},
        ],
    }


def compile_security_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_security_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    val = _cc.validate_spec_geometry(spec)
    return xml, svg, _cc.build_viewer_url(xml, f"{slug}-security", f"{bp.get('title', '')} — Security Boundary"), val["iconCount"]


# ===========================================================================
# FIGURE 5: WIRE-PROTOCOL & PAYLOAD TRANSFORMATION (C4 L4)
# ===========================================================================

def build_wire_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Wire Payload Transform")
    wd = bp.get("wireDiagram") or {}
    hops = wd.get("hops") or [
        {"hop": "HOP 1 · CLIENT INGRESS", "name": "Signed HTTP Request", "transport": "HTTPS / TLS 1.3", "iconKey": "saas_globe", "added": ["+ Authorization: Bearer <OIDC>", "+ X-Request-ID / traceparent"], "stripped": ["- Any client-forged X-Tenant-ID"], "payload": "GET /v1/memory?at=2026-01-15T00:00Z\nAuthorization: Bearer eyJhbG..."},
        {"hop": "HOP 2 · IAP AUTHZ", "name": "Verified Edge Assertion", "transport": "mTLS / HTTPS", "iconKey": "iap", "added": ["+ X-Goog-IAP-JWT-Assertion", "+ X-Cloud-Trace-Context"], "stripped": ["- Raw browser session cookie"], "payload": "sub: svc-agent@example.com\naud: /projects/248.../apps/mem-api"},
        {"hop": "HOP 3 · RUNTIME API", "name": "Normalized Internal RPC", "transport": "gRPC / Proto", "iconKey": "cloud_run", "added": ["+ Embedding vector[768]", "+ Valid-time / assert-time params"], "stripped": ["- Inbound IAP JWT token"], "payload": "POST /v1/embeddings:embedText\n{\"valid_at\": \"2026-01-15T00:00Z\"}"},
        {"hop": "HOP 4 · DATA QUERY", "name": "Scoped Graph/SQL Query", "transport": "gRPC / Session", "iconKey": "spanner", "added": ["+ FGAC database role binding", "+ Request priority & tag"], "stripped": ["- Plaintext prompt PII fields"], "payload": "SELECT T.policy_id, T.content\nFROM GRAPH_TABLE(AgentKnowledge...)"},
    ]
    while len(hops) < 4:
        hops.append(hops[-1])

    accents = [("#1A73E8", "#EFF6FF", "#93C5FD"), ("#188038", "#ECFDF5", "#81C995"), ("#B06000", "#FEF7E0", "#FCD34D"), ("#6B21A8", "#F3E8FD", "#C4B5FD")]
    cards: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [{"id": "wp_pill", "plane": "ASYNC", "text": "C4 L4 · WIRE PAYLOAD TRANSFORMATION", "x": 1328, "y": 19, "w": 240, "h": 22}]

    cw = 340
    gap = 54
    for i in range(4):
        h = hops[i]
        hx = 38 + i * (cw + gap)
        ac, soft_bg, bd = accents[i]
        ic = _cc.resolve_icon_key(h.get("iconKey", ""), h.get("name", ""), h.get("hop", ""))
        h_lbl, _ = _cc.fit_single_line_px(h.get("hop") or f"HOP {i+1}", cw - 72, 9.4, bold=True)
        h_name, hn_fs = _cc.fit_single_line_px(h.get("name") or f"Stage {i+1}", cw - 72, 13.5, bold=True)
        h_tr, _ = _cc.fit_single_line_px(h.get("transport") or "HTTPS", cw - 72, 9.6)
        # Outer white frame with delicate 5px colored top accent bar (NO heavy full-bleed box header!)
        cards.append({"id": f"wh_{i}", "x": hx, "y": 98, "w": cw, "h": 722, "fill": "#FFFFFF", "stroke": "#CBD5E1", "strokeWidth": 1.3, "rx": 12, "isContainer": True, "topAccent": ac, "shadow": True, "lines": []})
        # Subtle tinted header strip
        cards.append({
            "id": f"wh_hdr_{i}", "x": hx + 12, "y": 116, "w": cw - 24, "h": 74,
            "fill": soft_bg, "stroke": bd, "strokeWidth": 1.0, "rx": 10, "allowOverlap": True,
            "icon": ic, "iconPos": "left", "iconSize": 28, "padL": 52,
            "lines": [
                {"text": h_lbl, "bold": True, "size": 9.2, "color": ac},
                {"text": h_name, "bold": True, "size": hn_fs, "color": "#0F172A", "gapTop": 2},
                {"text": h_tr, "size": 9.4, "mono": True, "color": "#475569", "gapTop": 2},
            ],
        })
        # + ADDED / BOUND section
        added = [str(x) for x in (h.get("added") or []) if str(x).strip()][:4]
        add_lines: List[Dict[str, Any]] = [{"text": "+ ADDED / BOUND FIELDS", "bold": True, "size": 9.2, "color": "#065F46"}]
        for a in added:
            at = a if a.lstrip().startswith("+") else f"+ {a}"
            for wl in _cc.wrap_px(at, cw - 52, 9.5, mono=True, max_lines=2):
                add_lines.append({"text": wl, "size": 9.5, "mono": True, "color": "#064E3B", "gapTop": 6 if wl.startswith("+") else 1})
        cards.append({"id": f"wh_add_{i}", "x": hx + 12, "y": 208, "w": cw - 24, "h": 190, "fill": "#F0FDF4", "stroke": "#86EFAC", "strokeWidth": 1.0, "rx": 8, "isContainer": True, "padL": 12, "padR": 10, "padT": 12, "allowOverlap": True, "lines": add_lines})

        # - STRIPPED / REJECTED section
        stripped = [str(x) for x in (h.get("stripped") or []) if str(x).strip()][:3]
        str_lines: List[Dict[str, Any]] = [{"text": "- STRIPPED / REJECTED", "bold": True, "size": 9.2, "color": "#991B1B"}]
        if stripped:
            for s in stripped:
                st = s if s.lstrip().startswith("-") else f"- {s}"
                for wl in _cc.wrap_px(st, cw - 52, 9.5, mono=True, max_lines=2):
                    str_lines.append({"text": wl, "size": 9.5, "mono": True, "color": "#7F1D1D", "gapTop": 6 if wl.startswith("-") else 1})
        else:
            str_lines.append({"text": "- Untrusted X-Forwarded-* / client identity", "size": 9.1, "mono": True, "color": "#991B1B", "gapTop": 8})
        cards.append({"id": f"wh_str_{i}", "x": hx + 12, "y": 416, "w": cw - 24, "h": 144, "fill": "#FEF2F2", "stroke": "#FCA5A5", "strokeWidth": 1.0, "rx": 8, "isContainer": True, "padL": 12, "padR": 10, "padT": 12, "allowOverlap": True, "lines": str_lines})

        # Dark WIRE SAMPLE excerpt (deterministic mono wrap!)
        raw_pl = str(h.get("payload") or "").strip()
        pl_lines: List[Dict[str, Any]] = [{"text": "WIRE SAMPLE", "bold": True, "size": 8.6, "mono": True, "color": "#93C5FD"}]
        if raw_pl:
            for raw_ln in raw_pl.splitlines()[:8]:
                if not raw_ln.strip():
                    continue
                for wl in _cc.wrap_px(raw_ln, cw - 50, 8.7, mono=True, max_lines=3):
                    pl_lines.append({"text": wl, "size": 8.7, "mono": True, "color": "#E2E8F0", "gapTop": 2})
        else:
            pl_lines.append({"text": f"// {h_tr} wire frame ({h_lbl})", "size": 8.6, "mono": True, "color": "#94A3B8", "gapTop": 6})
        cards.append({"id": f"wh_pay_{i}", "x": hx + 12, "y": 578, "w": cw - 24, "h": 224, "fill": "#0F172A", "stroke": "#334155", "strokeWidth": 1.0, "rx": 8, "isContainer": True, "padL": 12, "padR": 10, "padT": 12, "allowOverlap": True, "lines": pl_lines[:14]})

        if i < 3:
            edges.append({"id": f"we_{i}", "rawPoints": [(hx + cw, 456), (hx + cw + gap, 456)], "stroke": "#595959", "strokeWidth": 2.2, "label": f"H{i+1}→{i+2}", "labelY": 436})

    return {
        "id": f"{slug}-wire",
        "diagramName": "Figure 5 - Wire Payload Diff",
        "title": f"Wire-Protocol & Envelope Transformation — {title}",
        "titleY": 14,
        "dividerY": 54,
        "cards": cards,
        "edges": edges,
        "pills": pills,
        "planeLegend": [
            {"id": "wl_1", "plane": "COMPUTE", "x": 36, "y": 846, "w": 748, "h": 24, "text": "Green (+): verified identity claims, trace context & query parameters bound at hop"},
            {"id": "wl_2", "plane": "SECURITY", "x": 808, "y": 846, "w": 756, "h": 24, "text": "Red (-): untrusted caller headers, raw tokens & PII fields stripped before forwarding"},
        ],
    }


def compile_wire_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_wire_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    val = _cc.validate_spec_geometry(spec)
    return xml, svg, _cc.build_viewer_url(xml, f"{slug}-wire", f"{bp.get('title', '')} — Wire Transform"), val["iconCount"]


# ===========================================================================
# FIGURE 6: ASYNC LIFECYCLE, CDC EXPORT & RECOVERY LOOP
# ===========================================================================

def build_async_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Async Lifecycle Loop")
    ad = bp.get("asyncDiagram") or {}
    stages = ad.get("stages") or [
        {"stage": "1. CHANGE CAPTURE", "service": "Change Streams", "cadence": "Continuous", "iconKey": "spanner", "bullets": ["Streams insert / update / delete ops", "Ordered per-partition mutations", "Zero impact on online read path", "Commit timestamp preserved"]},
        {"stage": "2. STREAM TRANSFORM", "service": "Dataflow (Streaming)", "cadence": "Sub-second", "iconKey": "cloud_run", "bullets": ["Enriches metadata & tenant tags", "Scrubs PII via Cloud DLP", "Exactly-once window aggregation", "Routes poison pills to DLQ"]},
        {"stage": "3. ANALYTICS LOAD", "service": "BigQuery Warehouse", "cadence": "Near real-time", "iconKey": "bigquery", "bullets": ["Partitioned by commit_date", "Point-in-time historical queries", "Cost & SLO attribution views", "Row-level policy alignment"]},
        {"stage": "4. ARCHIVAL & DR", "service": "Cloud Storage (WORM)", "cadence": "Daily / Hourly", "iconKey": "cloud_storage", "bullets": ["Bucket-lock immutable audit snapshots", "CMEK-encrypted coldline exports", "Crypto-erasure verification log", "Multi-region RPO recovery"]},
    ]
    while len(stages) < 4:
        stages.append(stages[-1])

    pal_seq = [
        ("CONTROL", "#93C5FD", "#174EA6"),
        ("COMPUTE", "#6EE7B7", "#065F46"),
        ("ASYNC", "#C4B5FD", "#6B21A8"),
        ("DATA", "#FCD34D", "#B06000"),
    ]
    zones: List[Dict[str, Any]] = []
    cards: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [{"id": "as_top_pill", "plane": "DATA", "text": "ASYNC · LIFECYCLE & RECOVERY LOOP", "x": 1344, "y": 19, "w": 224, "h": 22}]
    edges: List[Dict[str, Any]] = []

    sw, gap = 338, 56
    for i in range(4):
        st = stages[i]
        x0 = 42 + i * (sw + gap)
        pl, stroke, tc = pal_seq[i]
        zones.append({"id": f"as_z_{i}", "x": x0, "y": 146, "w": sw, "h": 356, "rx": 14, "fill": "#F8F9FA", "stroke": stroke, "dashed": True, "strokeWidth": 1.4})
        cad = _cc.strip_md(st.get("cadence") or "Async")
        pw = _pick_pill_w(cad, min_w=76, pad=18)
        pills.append({"id": f"as_p_{i}", "plane": pl, "text": cad, "x": x0 + sw - pw - 14, "y": 137, "w": pw, "h": 18})
        ic = _cc.resolve_icon_key(st.get("iconKey", ""), st.get("service", ""), st.get("stage", ""))
        svc_t, svc_fs = _cc.fit_single_line_px(st.get("service") or f"Stage {i+1}", sw - 40, 14.2, bold=True)
        raw_b = st.get("bullets") or st.get("detail") or ""
        blts = _norm_bullets(raw_b, 5, sw - 68, fs=10.2, max_total_lines=10)
        if blts:
            blts[0]["gapTop"] = 10
        lines = [
            {"text": _cc.strip_md(st.get("stage") or f"{i+1}. STAGE"), "bold": True, "size": 9.8, "mono": True, "color": tc},
            {"text": svc_t, "bold": True, "size": svc_fs, "color": "#202124", "gapTop": 4},
        ] + blts
        cards.append({"id": f"as_c_{i}", "x": x0 + 12, "y": 164, "w": sw - 24, "h": 324, "fill": "#FFFFFF", "stroke": "#DADCE0", "strokeWidth": 1.2, "rx": 12, "shadow": True, "icon": ic, "iconPos": "top", "iconSize": 38, "padL": 22, "padR": 18, "lines": lines})
        badge_txt = _cc.strip_md(st.get("slo") or f"Stage {i+1} · {cad} · Off-Path")
        cards.append({"id": f"as_foot_{i}", "x": x0 + 28, "y": 442, "w": sw - 56, "h": 28, "fill": PLANE_PALETTE.get(pl, PLANE_PALETTE["CONTROL"])["bg"], "stroke": stroke, "strokeWidth": 0.9, "rx": 6, "align": "center", "allowOverlap": True, "lines": [{"text": badge_txt, "bold": True, "size": 9.2, "mono": True, "color": tc}]})
        if i < 3:
            edges.append({"id": f"as_e_{i}", "rawPoints": [(x0 + sw, 324), (x0 + sw + gap, 324)], "stroke": "#1A73E8", "strokeWidth": 2.0, "dashed": True})

    # Bottom Dead-Letter Queue, Replay & Reconciliation Hub
    dlq_note = _cc.strip_md(ad.get("dlqNote") or "Dead-letter queue isolates malformed events without stalling live stream consumers. Alerts fire on DLQ depth > 0; exponential backoff + idempotency key ensures safe zero-duplicate replay.")
    fb_lbl = _cc.strip_md(ad.get("feedbackLabel") or "Periodic Verification & Idempotent Reconciliation Feedback")
    zones.append({"id": "as_dlq_z", "x": 318, "y": 584, "w": 964, "h": 176, "rx": 14, "fill": "#F8FAFC", "stroke": "#64748B", "dashed": True, "strokeWidth": 1.3})
    cards.append({
        "id": "as_dlq_c", "x": 334, "y": 598, "w": 932, "h": 148, "fill": "#FFFFFF", "stroke": "#DADCE0", "rx": 12, "shadow": True,
        "isContainer": True, "icon": "cloud_monitoring", "iconPos": "top-left", "iconSize": 26, "padL": 52, "padT": 14,
        "lines": [
            {"text": "Fault Handling, Dead-Letter Replay & Audit Reconciliation", "bold": True, "size": 12.8, "color": "#0F172A"},
            *[{"text": wl, "size": 10.2, "color": "#475569", "gapTop": 4 if wi == 0 else 1} for wi, wl in enumerate(_cc.wrap_px(dlq_note, 840, 10.2, max_lines=2))],
        ],
    })
    chips = [
        ("CONTROL", "Exponential Backoff + Jitter", 386, "#E8F0FE", "#8AB4F8", "#174EA6"),
        ("COMPUTE", "Idempotency Key Verified", 674, "#E6F4EA", "#81C995", "#137333"),
        ("SECURITY", "Alert on DLQ Depth > 0", 962, "#FCE8E6", "#F28B82", "#A50E0E"),
    ]
    for ci, (_, txt, cx, bg, bd, fg) in enumerate(chips):
        cards.append({"id": f"as_chip_{ci}", "x": cx, "y": 692, "w": 252, "h": 34, "fill": bg, "stroke": bd, "strokeWidth": 1.0, "rx": 8, "align": "center", "allowOverlap": True, "lines": [{"text": txt, "bold": True, "size": 9.8, "mono": True, "color": fg}]})

    edges.extend([
        {"id": "as_err_1", "rawPoints": [(42 + 1 * (sw + gap) + sw / 2, 502), (42 + 1 * (sw + gap) + sw / 2, 584)], "stroke": "#DC2626", "strokeWidth": 1.6, "dashed": True, "label": "Retry / DLQ", "labelY": 544},
        {"id": "as_err_2", "rawPoints": [(42 + 2 * (sw + gap) + sw / 2, 502), (42 + 2 * (sw + gap) + sw / 2, 584)], "stroke": "#DC2626", "strokeWidth": 1.6, "dashed": True, "label": "Verify Error", "labelY": 544},
        {"id": "as_fb", "rawPoints": [(42 + 3 * (sw + gap) + sw / 2, 502), (42 + 3 * (sw + gap) + sw / 2, 814), (42 + sw / 2, 814), (42 + sw / 2, 502)], "stroke": "#137333", "strokeWidth": 1.8, "dashed": True, "label": fb_lbl, "labelX": 800, "labelY": 814},
    ])

    return {
        "id": f"{slug}-async",
        "diagramName": "Figure 6 - Async Lifecycle Loop",
        "title": f"Async State, CDC Export & Reconciliation Loop — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "cards": cards,
        "pills": pills,
        "edges": edges,
        "planeLegend": [
            {"id": "al_1", "plane": "DATA", "x": 42, "y": 850, "w": 1516, "h": 24, "text": "All asynchronous stream processing and DR snapshot loops run strictly off the synchronous user latency path."},
        ],
    }


def compile_async_v2(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str, int]:
    spec = build_async_spec_v3(bp, slug)
    xml = _cc.compile_spec_to_drawio_xml(spec)
    svg = _cc.compile_spec_to_svg(spec)
    val = _cc.validate_spec_geometry(spec)
    return xml, svg, _cc.build_viewer_url(xml, f"{slug}-async", f"{bp.get('title', '')} — Async Lifecycle"), val["iconCount"]


# ===========================================================================
# UNIFIED 6-DIAGRAM + NATIVE PPTX SLIDE XML COMPILER ENTRYPOINT
# ===========================================================================

def compile_all_v2_diagrams(bp: Dict[str, Any], slug: str) -> Dict[str, Dict[str, Any]]:
    builders = [
        ("architecture", build_architecture_spec_v3, "Figure 1 — Master Platform Architecture (C4 L2)", "C4 L2", 3),
        ("cloudarch",    build_cloudarch_spec_v3,    "Figure 2 — Cloud Architecture Center Blueprint", "HUB-SPOKE", 4),
        ("sequence",     build_sequence_spec_v3,     "Figure 3 — Request Lifecycle Sequence (C4 L3)", "C4 L3", 5),
        ("security",     build_security_spec_v3,     "Figure 4 — Trust Perimeter & Security Boundary (C4 L1)", "C4 L1", 6),
        ("wire",         build_wire_spec_v3,         "Figure 5 — Wire-Protocol & Schema Transformation (C4 L4)", "C4 L4", 7),
        ("async",        build_async_spec_v3,        "Figure 6 — Async State, Export & Lifecycle Loop", "ASYNC", 8),
    ]
    out: Dict[str, Dict[str, Any]] = {}
    for kind, builder, title_str, layer, slide_num in builders:
        spec = builder(bp, slug)
        xml = _cc.compile_spec_to_drawio_xml(spec)
        svg = _cc.compile_spec_to_svg(spec)
        geom = _cc.validate_spec_geometry(spec)
        url = _cc.build_viewer_url(xml, f"{slug}-{kind}", title_str)
        icons = geom["iconCount"] if kind != "sequence" else 5
        slide_xml = _cc.compile_spec_to_ooxml_slide(
            spec,
            f"[Slide {slide_num:02d}/12 • {layer}]",
            hlink_rid="rId10",
        )
        out[kind] = {
            "id": f"{slug}-{kind}",
            "kind": kind,
            "layer": layer,
            "slide": slide_num,
            "title": title_str,
            "label": title_str,
            "vertexCount": xml.count('vertex="1"'),
            "edgeCount": xml.count('edge="1"'),
            "xml": xml,
            "svg": svg,
            "viewerUrl": url,
            "iconCount": icons,
            "geometry": geom,
            "ooxmlSlideXml": slide_xml,
            "drawioPath": f"diagrams/{slug}-{kind}.drawio",
            "svgPath": f"diagrams/{slug}-{kind}.svg",
        }
    return out
