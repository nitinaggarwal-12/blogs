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


# ===========================================================================
# FIGURE 1: WS1-STYLE MASTER PLATFORM ARCHITECTURE (C4 L2, ~90 cells, 22 edges)
# ===========================================================================

def build_architecture_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Cloud Reference Architecture")
    pd = bp.get("platformDiagram") or {}
    domain_lbl = _cc.strip_md(bp.get("domain") or "Google Cloud Architecture")

    # Control Plane top strip (3 rich cards spanning x=504..1570)
    cp_title = _cc.strip_md(pd.get("controlPlaneTitle") or f"Google Cloud — Shared Governance & Control Plane ({domain_lbl})")
    raw_cp = list(pd.get("controlCards") or [])
    defaults_cp = [
        {"title": "Stage 1 · Identity & Auth Broker", "icon": "cloud_iam", "bullets": ["OIDC / WIF short-lived federation", "Strict least-privilege IAM & IAP JWT"]},
        {"title": "Stage 2 · Policy & Key Governance", "icon": "cloud_kms", "bullets": ["CMEK customer-managed encryption keys", "Artifact provenance & VPC-SC perimeter"]},
        {"title": "Stage 4 · Guardrails & Audit DLP", "icon": "model_armor", "bullets": ["Inline prompt & PII/PHI egress screening", "Zero-PII audit logs & policy enforcement"]},
    ]
    while len(raw_cp) < 3:
        raw_cp.append(defaults_cp[len(raw_cp)])

    # Left 3 caller / workload tiers
    raw_tiers = list(pd.get("callerTiers") or [
        {"title": "Tier 1: Interactive", "subtitle": "Low-latency agents (sync)"},
        {"title": "Tier 2: Service Mesh", "subtitle": "OIDC / IAM backend callers"},
        {"title": "Tier 3: Governance", "subtitle": "Audit, batch & compliance"},
    ])
    while len(raw_tiers) < 3:
        raw_tiers.append({"title": f"Workload Tier {len(raw_tiers) + 1}", "subtitle": "Authenticated ingress"})

    # Pipeline nodes along y=256..510
    stage_1a = pd.get("identityStage") or {}
    stage_1b = pd.get("ingressStage") or {}
    fe_cfg = pd.get("frontEnd") or {}
    gw_in = pd.get("inboundGateway") or {}
    runtime = pd.get("coreRuntime") or {}
    gw_out = pd.get("outboundGateway") or {}

    # Right target cards (4 stacked tinted boxes inside x=1384..1574)
    raw_targets = list(pd.get("targets") or [])
    defaults_t = [
        {"title": "Primary Data Plane", "subtitle": "Strongly consistent reads"},
        {"title": "AI / Embedding Target", "subtitle": "Vertex AI Gemini"},
        {"title": "Analytical Export", "subtitle": "BigQuery audit warehouse"},
        {"title": "CMEK & Backup Vault", "subtitle": "Cloud KMS + GCS archival"},
    ]
    while len(raw_targets) < 4:
        raw_targets.append(defaults_t[len(raw_targets)])

    # Bottom row 3 panels (Context/State Guard | Primary Data Bank | FinOps/Bulkhead)
    # Never fabricate a phantom Memorystore cache when the architecture does not provision one!
    sess = pd.get("hotStateCard") or {"title": "Tenant Context &", "title2": "Policy Guard", "icon": "cloud_iam", "bullets": ["Verified IAP JWT claims", "Scoped FGAC role bind", "Parameterized SQL/GQL", "Fail-closed 401/403 check"]}
    dbank = pd.get("dataBankCard") or {}
    db_tiers = list(dbank.get("tiers") or [
        "Primary Store: Strongly consistent multi-region data plane",
        "Access Control: Fine-grained row/tenant boundary enforcement",
        "Key Isolation: CMEK KMS encryption & audit tombstoning",
    ])
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
        t1_lines = _cc.wrap_px(tr.get("title") or f"Tier {i+1}", 130, 10.8, bold=True, max_lines=2, ellipsis_last=False)
        t2, f2 = _cc.fit_single_line_px(tr.get("subtitle") or "", 130, 9.2)
        cards.append({
            "id": ("u_a", "u_b", "u_c")[i],
            "x": 24, "y": 256 + i * 90, "w": 144, "h": 76,
            "fill": bg, "stroke": st, "strokeWidth": 1.4, "shadow": True, "align": "center",
            "lines": [
                *[{"text": ln, "bold": True, "size": 10.6 if len(t1_lines) > 1 else 11.4, "color": c1, "gapTop": 1 if li else 0} for li, ln in enumerate(t1_lines)],
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

    # Bottom 3-panel row: Context / State Guard (`sessions`)
    s_hdr = _cc.wrap_px(sess.get("title") or "Tenant Context &", 148, 11.2, bold=True, max_lines=2)
    if sess.get("title2") and len(s_hdr) == 1:
        s_hdr.append(_cc.strip_md(sess["title2"]))
    s_lines = [{"text": x, "bold": True, "size": 11.0, "color": "#202124"} for x in s_hdr[:2]]
    sblts = _norm_bullets(sess.get("bullets") or [], 4, 142, fs=9.1, max_total_lines=8)
    if sblts:
        sblts[0]["gapTop"] = 6
    s_lines.extend(sblts)
    cards.append({"id": "sessions", "x": 558, "y": 562, "w": 168, "h": 182, "fill": "#FFFFFF", "stroke": "#DADCE0", "rx": 14, "icon": _cc.resolve_icon_key(sess.get("icon", ""), sess.get("title", ""), default="cloud_iam"), "iconPos": "top", "iconSize": 24, "padL": 11, "padR": 9, "lines": s_lines})

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
    if isinstance(obs, str):
        parts_o = [p.strip() for p in obs.split("—", 1)]
        obs = {"title": parts_o[0], "subtitle": parts_o[1] if len(parts_o) > 1 else ""}
    elif not isinstance(obs, dict):
        obs = {}
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


# ===========================================================================
# FIGURE 2: GOOGLE CLOUD ARCHITECTURE CENTER HUB-AND-SPOKE BLUEPRINT
# (matching ws1-cloud-arch-center-5hop-baseline.drawio.png)
# ===========================================================================

def build_cloudarch_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    """Slim 1200x1280 Google Cloud Architecture Center Hub-and-Spoke Blueprint (matching ws1-cloud-arch-center-5hop-baseline)."""
    title = _cc.strip_md(bp.get("title") or "Cloud Architecture Center Blueprint")
    ca = bp.get("cloudArchDiagram") or {}
    caller = ca.get("caller") or {"title": "Authenticated Client / Agent", "subtitle": "OIDC / Bearer JWT"}
    perim_lbl = _cc.strip_md(ca.get("perimeterLabel") or "Google Cloud Edge + VPC Service Controls Organization Perimeter")
    vpc_lbl = _cc.strip_md(ca.get("vpcLabel") or "VPC • Zero-Trust Private Ingress & Private Service Connect")
    rh = ca.get("routingHub") or {}
    gh = ca.get("governanceHub") or {}
    sp_a = ca.get("spokeA") or {}
    sp_b = ca.get("spokeB") or {}
    el_in = ca.get("edgeLabels") if isinstance(ca.get("edgeLabels"), dict) else {}

    def _arch_card(
        cid: str, x: int, y: int, w: int, h: int, title_t: str, sub_t: str, icon: str,
        fill: str = "#FFFFFF", stroke: str = "#1E293B", icon_sz: int = 26, pad_l: int = 48,
    ) -> Dict[str, Any]:
        tt, tfs = _cc.fit_single_line_px(title_t, w - pad_l - 10, 12.6, bold=True)
        st, sfs = _cc.fit_single_line_px(sub_t, w - pad_l - 10, 10.4)
        return {
            "id": cid, "x": x, "y": y, "w": w, "h": h, "fill": fill, "stroke": stroke, "strokeWidth": 1.6, "rx": 10,
            "icon": _cc.resolve_icon_key(icon, title_t, sub_t), "iconPos": "left", "iconSize": icon_sz, "padL": pad_l, "padR": 10,
            "lines": [
                {"text": tt, "bold": True, "size": tfs, "color": "#0F172A"},
                *([{"text": st, "size": sfs, "color": "#475569", "gapTop": 3}] if st else []),
            ],
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
        # External user box centered cleanly above the slim blue Google Cloud bezel
        {
            "id": "ca_user", "x": 440, "y": 60, "w": 320, "h": 70, "fill": "#FFFFFF", "stroke": "#1E293B", "strokeWidth": 1.8, "rx": 10, "align": "center",
            "icon": "saas_globe", "iconPos": "left", "iconSize": 26, "padL": 48,
            "lines": [
                {"text": _cc.fit_single_line_px(caller.get("title", "Client / Agent"), 256, 13.0, bold=True)[0], "bold": True, "size": 12.8, "color": "#0F172A"},
                {"text": _cc.fit_single_line_px(caller.get("subtitle", "OIDC / JWT"), 256, 10.6)[0], "size": 10.5, "color": "#475569", "gapTop": 3},
            ],
        },
    ]
    # Routing hub inner cards (y=396+ leaves generous 20px breathing room below Routing Hub subtitle!)
    for i in range(3):
        nd = rh_nodes[i] if i < len(rh_nodes) else {"title": f"Security Control {i+1}", "subtitle": "Edge check", "icon": "cloud_armor"}
        cards.append(_arch_card(f"rh_s{i}", 88, 396 + i * 84, 214, 68, nd.get("title", ""), nd.get("subtitle", ""), nd.get("icon", "cloud_armor")))
    cards.append(_arch_card("rh_alb", 448, 418, 268, 74, alb_d.get("title", "External ALB"), alb_d.get("subtitle", "TLS 1.3 termination"), alb_d.get("icon", "cloud_load_balancing")))
    cards.append(_arch_card("rh_run", 448, 560, 268, 74, run_d.get("title", "Cloud Run v2"), run_d.get("subtitle", "Stateless API gateway"), run_d.get("icon", "cloud_run")))

    # Governance hub inner cards (y=396+ leaves generous 20px gap below Governance Hub subtitle!)
    for i in range(3):
        nd = gh_nodes[i] if i < len(gh_nodes) else {"title": f"Governance {i+1}", "subtitle": "Audit & IAM", "icon": "scc"}
        cards.append(_arch_card(f"gh_n{i}", 782, 396 + i * 84, 328, 68, nd.get("title", ""), nd.get("subtitle", ""), nd.get("icon", "scc")))

    # Dual bottom isolation spokes (Spoke A gold #FEF7E0 vs Spoke B rose #FCE8E6, 484px wide each like original!)
    def _build_spoke(prefix: str, bx: int, cfg: Dict[str, Any], def_nodes: List[Dict[str, str]]) -> None:
        ns = cfg.get("nodes") or def_nodes
        while len(ns) < 4:
            ns.append(def_nodes[len(ns)])
        # Top-left entry/guard, top-right engine, bottom-left AI/DLQ, bottom-right KMS/analytics (52px central channel!)
        cards.append(_arch_card(f"{prefix}_guard", bx + 14, 858, 200, 76, ns[0].get("title", ""), ns[0].get("subtitle", ""), ns[0].get("icon", "model_armor"), icon_sz=24, pad_l=44))
        cards.append(_arch_card(f"{prefix}_eng",   bx + 264, 858, 198, 76, ns[1].get("title", ""), ns[1].get("subtitle", ""), ns[1].get("icon", "vertex_ai"), icon_sz=24, pad_l=44))
        cards.append(_arch_card(f"{prefix}_llm",   bx + 14, 1066, 200, 76, ns[2].get("title", ""), ns[2].get("subtitle", ""), ns[2].get("icon", "gemini"), icon_sz=24, pad_l=44))
        cards.append(_arch_card(f"{prefix}_store", bx + 264, 1066, 198, 76, ns[3].get("title", ""), ns[3].get("subtitle", ""), ns[3].get("icon", "spanner"), icon_sz=24, pad_l=44))

    _build_spoke(
        "spa", 84, sp_a,
        [
            {"title": "Private Service Connect", "subtitle": "Private gRPC & IAM bind", "icon": "psc"},
            {"title": "Primary Data Engine", "subtitle": "Strongly consistent store", "icon": "spanner"},
            {"title": "Vertex AI Inference", "subtitle": "Embeddings & LLM synthesis", "icon": "gemini"},
            {"title": "KMS CMEK & PITR", "subtitle": "Key isolation & recovery", "icon": "cloud_kms"},
        ],
    )
    _build_spoke(
        "spb", 640, sp_b,
        [
            {"title": "Change Streams CDC", "subtitle": "Ordered mutation stream", "icon": "spanner"},
            {"title": "Cloud Dataflow (Beam)", "subtitle": "Streaming transform & scrub", "icon": "dataflow"},
            {"title": "GCS Archive & DLQ", "subtitle": "CMEK dead-letter bucket", "icon": "cloud_storage"},
            {"title": "BigQuery Analytics", "subtitle": "Partitioned audit tables", "icon": "bigquery"},
        ],
    )

    zones = [
        {"id": "z_perim", "x": 42, "y": 262, "w": 1116, "h": 976, "rx": 12, "fill": "none", "stroke": "#334155", "strokeWidth": 1.2, "title": perim_lbl, "titleColor": "#0F172A", "titleSize": 12.2},
        {"id": "z_vpc", "x": 56, "y": 296, "w": 1088, "h": 928, "rx": 10, "fill": "none", "stroke": "#475569", "strokeWidth": 1.1, "title": vpc_lbl, "titleColor": "#334155", "titleSize": 11.6},
        # Routing Hub (soft Google Blue #D2E3FC)
        {"id": "z_rhub", "x": 70, "y": 332, "w": 666, "h": 330, "rx": 12, "fill": "#D2E3FC", "stroke": "#1A73E8", "strokeWidth": 1.3,
         "title": _cc.strip_md(rh.get("title") or "Routing Hub (Ingress & Policy Enforcement)"),
         "subtitle": _cc.strip_md(rh.get("subtitle") or "Central authentication, WAF enforcement & private service proxy"), "titleColor": "#0F172A", "titleSize": 13.6},
        # Governance Hub (soft Google Green #CEEAD6)
        {"id": "z_ghub", "x": 762, "y": 332, "w": 368, "h": 330, "rx": 12, "fill": "#CEEAD6", "stroke": "#188038", "strokeWidth": 1.3,
         "title": _cc.strip_md(gh.get("title") or "Central Governance & Security Hub"),
         "subtitle": _cc.strip_md(gh.get("subtitle") or "Posture monitoring, KMS rotation & audit logs"), "titleColor": "#0F172A", "titleSize": 13.6},
        # Spoke A outer boundary & gold inner card
        {"id": "z_sp_a_out", "x": 70, "y": 754, "w": 504, "h": 454, "rx": 12, "fill": "none", "stroke": "#475569", "strokeWidth": 1.2,
         "title": _cc.strip_md(sp_a.get("outerLabel") or "Isolation Boundary A • Primary Request & Read Scope"), "titleColor": "#0F172A", "titleSize": 11.4},
        {"id": "z_sp_a", "x": 84, "y": 788, "w": 476, "h": 406, "rx": 10, "fill": "#FEF7E0", "stroke": "#D97706", "strokeWidth": 1.3,
         "title": _cc.strip_md(sp_a.get("title") or "Workload Path A (Primary Sync Path)"),
         "subtitle": _cc.strip_md(sp_a.get("subtitle") or "Fine-grained access control & grounded inference"), "titleColor": "#0F172A", "titleSize": 13.2},
        # Spoke B outer boundary & rose inner card
        {"id": "z_sp_b_out", "x": 626, "y": 754, "w": 504, "h": 454, "rx": 12, "fill": "none", "stroke": "#475569", "strokeWidth": 1.2,
         "title": _cc.strip_md(sp_b.get("outerLabel") or "Isolation Boundary B • Async CDC, Archival & Audit Scope"), "titleColor": "#0F172A", "titleSize": 11.4},
        {"id": "z_sp_b", "x": 640, "y": 788, "w": 476, "h": 406, "rx": 10, "fill": "#FCE8E6", "stroke": "#C5221F", "strokeWidth": 1.3,
         "title": _cc.strip_md(sp_b.get("title") or "Workload Path B (Async CDC & Compliance Export)"),
         "subtitle": _cc.strip_md(sp_b.get("subtitle") or "Ordered change stream export, DLQ & analytics sink"), "titleColor": "#0F172A", "titleSize": 13.2},
    ]

    spoke_b_sync = str(sp_b.get("mode") or "async").strip().lower() == "sync"
    edges = [
        # Top Request (1) / Response (7) pipes
        {"id": "ca_e_req", "rawPoints": [(564, 130), (564, 418)], "stroke": "#0F172A", "strokeWidth": 2.0},
        {"id": "ca_e_rsp", "rawPoints": [(632, 418), (632, 130)], "stroke": "#0F172A", "strokeWidth": 2.0},
        # Routing hub internal security checks
        {"id": "ca_e_waf", "rawPoints": [(302, 430), (420, 430), (420, 444), (448, 444)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        {"id": "ca_e_dlp", "rawPoints": [(302, 514), (420, 514), (420, 470), (448, 470)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        {"id": "ca_e_iap", "rawPoints": [(302, 598), (448, 598)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        # ALB <-> Cloud Run (Step 2 Forward & Return)
        {"id": "ca_e_alb_run", "rawPoints": [(564, 492), (564, 560)], "stroke": "#0F172A", "strokeWidth": 1.8},
        {"id": "ca_e_run_alb", "rawPoints": [(632, 560), (632, 492)], "stroke": "#0F172A", "strokeWidth": 1.8},
        # Run -> Spoke A primary sync path (Step 3)
        {"id": "ca_e_bus_a", "rawPoints": [(564, 634), (564, 706), (322, 706), (322, 754)], "stroke": "#0F172A", "strokeWidth": 2.0},
        # Spoke B feed: dashed async CDC from Spoke A -> Spoke B (or sync bus if explicitly sync)
        (
            {"id": "ca_e_bus_b", "rawPoints": [(604, 634), (604, 706), (878, 706), (878, 754)], "stroke": "#0F172A", "strokeWidth": 2.0}
            if spoke_b_sync
            else {"id": "ca_e_cdc_ab", "rawPoints": [(574, 982), (626, 982)], "stroke": "#C5221F", "strokeWidth": 2.0, "dashed": True}
        ),
        # Telemetry dashed feed from both spokes to Governance Hub
        {"id": "ca_e_gov_a", "rawPoints": [(456, 754), (456, 730), (946, 730), (946, 662)], "stroke": "#188038", "strokeWidth": 1.7, "dashed": True},
        {"id": "ca_e_gov_b", "rawPoints": [(946, 754), (946, 662)], "stroke": "#188038", "strokeWidth": 1.7, "dashed": True},
        # Inside Spoke A: Entry/PSC <-> Data Engine (Step 4), Entry/PSC <-> AI (Step 5), Data Engine <-> KMS (Step 6)
        {"id": "ca_a1", "rawPoints": [(298, 896), (348, 896)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        {"id": "ca_a2", "rawPoints": [(198, 934), (198, 1066)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        {"id": "ca_a3", "rawPoints": [(447, 934), (447, 1066)], "stroke": "#0F172A", "strokeWidth": 1.6, "bidirectional": True},
        # Inside Spoke B: Change Stream -> Dataflow -> BigQuery + Dataflow -> GCS DLQ dashed red
        {"id": "ca_b1", "rawPoints": [(854, 896), (904, 896)], "stroke": "#0F172A", "strokeWidth": 1.6},
        {"id": "ca_b2", "rawPoints": [(1003, 934), (1003, 1066)], "stroke": "#0F172A", "strokeWidth": 1.6},
        {"id": "ca_b3", "rawPoints": [(904, 916), (878, 916), (878, 1104), (854, 1104)], "stroke": "#C5221F", "strokeWidth": 1.5, "dashed": True},
    ]

    badges = [
        {"id": "cb_1", "cx": 564, "cy": 174, "r": 15, "fontSize": 13, "text": "1", "fill": "#1967D2"},
        {"id": "cb_2", "cx": 564, "cy": 526, "r": 14, "fontSize": 12.5, "text": "2", "fill": "#1967D2"},
        {"id": "cb_3", "cx": 446, "cy": 706, "r": 14, "fontSize": 12.5, "text": "3", "fill": "#1967D2"},
        {"id": "cb_4", "cx": 323, "cy": 896, "r": 13, "fontSize": 12, "text": "4", "fill": "#1967D2"},
        {"id": "cb_5", "cx": 198, "cy": 1000, "r": 13, "fontSize": 12, "text": "5", "fill": "#1967D2"},
        {"id": "cb_6", "cx": 447, "cy": 1000, "r": 13, "fontSize": 12, "text": "6", "fill": "#1967D2"},
        {"id": "cb_7", "cx": 632, "cy": 174, "r": 15, "fontSize": 13, "text": "7", "fill": "#137333"},
    ]

    lbl_s0 = _cc.fit_single_line_px(el_in.get("sec0") or "WAF / L7 policy", 108, 10.2)[0]
    lbl_s1 = _cc.fit_single_line_px(el_in.get("sec1") or "Identity / JWT", 108, 10.2)[0]
    lbl_s2 = _cc.fit_single_line_px(el_in.get("sec2") or "Perimeter guard", 128, 10.2)[0]
    lbl_a = _cc.fit_single_line_px(el_in.get("spokeA") or "CMEK & FGAC", 96, 10.2)[0]
    lbl_b = _cc.fit_single_line_px(el_in.get("spokeB") or "Streaming sink", 92, 9.6)[0]
    labels = [
        {"id": "cl_req", "x": 456, "y": 162, "w": 86, "h": 24, "text": "Request", "size": 12.2, "color": "#0F172A", "align": "right", "bold": False},
        {"id": "cl_rsp", "x": 656, "y": 162, "w": 96, "h": 24, "text": "Response", "size": 12.2, "color": "#137333", "align": "left", "bold": False},
        {"id": "cl_req2", "x": 468, "y": 516, "w": 76, "h": 20, "text": "Forward", "size": 11.0, "color": "#0F172A", "align": "right", "bold": False},
        {"id": "cl_rsp2", "x": 644, "y": 516, "w": 74, "h": 20, "text": "Return", "size": 11.0, "color": "#137333", "align": "left", "bold": False},
        {"id": "cl_waf", "x": 308, "y": 404, "w": 108, "h": 20, "text": lbl_s0, "size": 10.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_dlp", "x": 308, "y": 488, "w": 108, "h": 20, "text": lbl_s1, "size": 10.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_iap", "x": 308, "y": 572, "w": 134, "h": 20, "text": lbl_s2, "size": 10.2, "color": "#1E293B", "align": "center", "bold": False},
        {"id": "cl_bus", "x": 366, "y": 672, "w": 164, "h": 20, "text": "Route to boundary", "size": 10.8, "color": "#0F172A", "align": "center", "bold": False},
        {"id": "cl_gov", "x": 958, "y": 686, "w": 176, "h": 22, "text": "Security & telemetry spans", "size": 10.5, "color": "#137333", "align": "left", "bold": False},
        {"id": "cl_a_rw", "x": 334, "y": 990, "w": 90, "h": 20, "text": lbl_a, "size": 10.2, "color": "#78350F", "align": "right", "bold": False},
        {"id": "cl_b_rw", "x": 1012, "y": 990, "w": 94, "h": 20, "text": lbl_b, "size": 9.6, "color": "#991B1B", "align": "left", "bold": False},
    ]
    if not spoke_b_sync:
        labels.append({"id": "cl_cdc", "x": 574, "y": 956, "w": 52, "h": 20, "text": "CDC", "size": 10.8, "color": "#C5221F", "align": "center", "bold": True})

    return {
        "id": f"{slug}-cloudarch",
        "diagramName": "Figure 2 - Cloud Arch Center",
        "canvasW": 1200,
        "canvasH": 1280,
        "title": f"Cloud Architecture Center Hub-and-Spoke Blueprint: {title}",
        "subtitle": "Numbered request flow (1..7) inside Google Cloud Edge & VPC-SC perimeter with sync and async isolation spokes",
        "titleY": 8,
        "titleSize": 15.0,
        "titleColor": "#174EA6",
        "gcpBezel": {"x": 20, "y": 214, "w": 1160, "h": 1046, "label": "Google Cloud"},
        "zones": zones,
        "labels": labels,
        "cards": cards,
        "circleBadges": badges,
        "edges": edges,
    }


# ===========================================================================
# FIGURE 3: WS1 ACTIVATION-BAR SEQUENCE SWIMLANE (C4 L3)
# (matching ws1-c4-l3-process-sequence-swimlane.drawio.png)
# ===========================================================================

def build_sequence_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Request Lifecycle")
    sq = bp.get("sequenceDiagram") or {}
    raw_actors = sq.get("actors") or []
    default_actors = [
        {"box": "CALLER", "label": "Client / Agent", "planes": [], "iconKey": "saas_globe"},
        {"box": "EDGE", "label": "ALB + Armor + IAP", "planes": ["CONTROL"], "iconKey": "iap"},
        {"box": "API", "label": "Cloud Run v2 API", "planes": ["CONTROL", "COMPUTE"], "iconKey": "cloud_run"},
        {"box": "AI / KMS", "label": "Vertex AI & KMS", "planes": ["COMPUTE"], "iconKey": "gemini"},
        {"box": "DATA", "label": "Primary Data Store", "planes": ["DATA"], "iconKey": "spanner"},
    ]
    actors: List[Dict[str, Any]] = []
    for i in range(5):
        if i < len(raw_actors) and isinstance(raw_actors[i], dict):
            a = raw_actors[i]
            lbl_s = _cc.strip_md(a.get("label") or default_actors[i]["label"])
            actors.append({
                "box": _cc.strip_md(a.get("box") or default_actors[i]["box"]),
                "label": lbl_s,
                "planes": a.get("planes") if isinstance(a.get("planes"), list) else default_actors[i]["planes"],
                "iconKey": _cc.resolve_icon_key(a.get("iconKey", ""), a.get("icon", ""), lbl_s, default=default_actors[i]["iconKey"]),
            })
        else:
            actors.append(default_actors[i])

    # X centers evenly spaced across 5 actors with room for right-side telemetry callouts
    lane_x = [132, 396, 668, 948, 1236]
    bar_colors = ["#0F172A", "#0D7377", "#1A73E8", "#1E7E74", "#0B2545"]
    cards: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = []
    labels: List[Dict[str, Any]] = []
    lifelines: List[Dict[str, Any]] = []
    circle_badges: List[Dict[str, Any]] = []

    # Horizontal timeline guide arrow right under actor labels
    lifelines.append({"id": "ll_top_guide", "x1": 132, "y1": 212, "x2": 1520, "y2": 212, "stroke": "#CBD5E1", "strokeWidth": 1.6, "dashed": False, "arrowEnd": True})

    for i, a in enumerate(actors):
        cx = lane_x[i]
        btxt, bfs = _cc.fit_single_line_px(a["box"], 72, 10.2, bold=True)
        cards.append({
            "id": f"act_hdr_{i}", "x": cx - 58, "y": 106, "w": 116, "h": 40,
            "fill": "#FFFFFF", "stroke": "#1E293B" if i == 0 else "#0D7377" if i in (1, 3) else "#1A73E8" if i == 2 else "#475569",
            "strokeWidth": 1.5, "dashed": i in (1, 3), "rx": 8, "align": "left",
            "icon": a["iconKey"], "iconPos": "left", "iconSize": 20, "padL": 38, "padR": 6,
            "lines": [{"text": btxt, "bold": True, "size": bfs, "color": "#0F172A" if i == 0 else "#0F4C5C"}],
        })
        px_cur = cx + 64
        for p_idx, pname in enumerate(a["planes"][:2]):
            pn = str(pname).upper()
            if pn not in PLANE_PALETTE:
                pn = "CONTROL"
            pw = _pick_pill_w(pn, min_w=52, pad=12)
            pills.append({"id": f"apill_{i}_{p_idx}", "plane": pn, "text": pn, "x": px_cur, "y": 117, "w": pw, "h": 18})
            px_cur += pw + 5
        ltxt, lfs = _cc.fit_single_line_px(a["label"], 210, 11.2, bold=True)
        labels.append({"id": f"act_lbl_{i}", "x": cx - 105, "y": 156, "w": 210, "h": 22, "text": ltxt, "size": lfs, "color": "#202124", "align": "center"})
        lifelines.append({"id": f"ll_v_{i}", "x1": cx, "y1": 224, "x2": cx, "y2": 698, "stroke": "#CBD5E1", "strokeWidth": 1.4, "dashed": True})
        circle_badges.append({"id": f"hub_{i}", "cx": cx, "cy": 212, "r": 10, "fill": bar_colors[i], "text": ""})

    # Activation bars spanning actual active intervals (split AI/KMS lane 3 around Step 3 and Step 5 so Step 4 crosses clean white canvas)
    bars = [
        {"id": "bar_0", "x": lane_x[0] - 8, "y": 244, "w": 16, "h": 416, "fill": bar_colors[0]},
        {"id": "bar_1", "x": lane_x[1] - 8, "y": 250, "w": 16, "h": 110, "fill": bar_colors[1]},
        {"id": "bar_2", "x": lane_x[2] - 8, "y": 318, "w": 16, "h": 340, "fill": bar_colors[2]},
        {"id": "bar_3a", "x": lane_x[3] - 8, "y": 384, "w": 16, "h": 46, "fill": bar_colors[3]},
        {"id": "bar_3b", "x": lane_x[3] - 8, "y": 524, "w": 16, "h": 54, "fill": bar_colors[3]},
        {"id": "bar_4", "x": lane_x[4] - 8, "y": 454, "w": 16, "h": 56, "fill": bar_colors[4]},
    ]

    # True actor-to-actor sequence routing (NEVER force a bogus left-to-right staircase!)
    raw_steps = sq.get("steps") or []
    def_steps = [
        {"fromIdx": 0, "toIdx": 1, "title": "Authenticate & Inspect Edge", "detail": "TLS 1.3 + Cloud Armor WAF + IAP ES256 JWT", "wire": "POST /v1/memory/query (IAP JWT)", "kind": "request"},
        {"fromIdx": 1, "toIdx": 2, "title": "Verify JWT & Bind Tenant", "detail": "Verify ES256 signature & bind FGAC role", "wire": "X-Goog-IAP-JWT -> FGAC role", "kind": "guard"},
        {"fromIdx": 2, "toIdx": 3, "title": "Generate Query Embedding", "detail": "Private Google Access embed RPC", "wire": "Vertex AI embed_content -> vector", "kind": "request"},
        {"fromIdx": 2, "toIdx": 4, "title": "Execute Scoped Query", "detail": "2-stage ANN + temporal graph query", "wire": "GRAPH_TABLE -> scoped rows", "kind": "request"},
        {"fromIdx": 2, "toIdx": 3, "title": "Synthesize Grounded Answer", "detail": "LLM reasoning over verified rows", "wire": "Gemini generate -> cited JSON", "kind": "request"},
        {"fromIdx": 2, "toIdx": 0, "title": "Return Grounded Response", "detail": "HTTP 200 JSON + OTel trace span", "wire": "HTTP 200 JSON + traceparent", "kind": "response"},
    ]
    step_list: List[Dict[str, Any]] = []
    for i in range(6):
        d_st = def_steps[i]
        if i < len(raw_steps) and isinstance(raw_steps[i], dict):
            s = raw_steps[i]
            raw_t = _cc.strip_md(s.get("title") or s.get("label") or d_st["title"])
            clean_t = re.sub(r"^(?:step\s*)?\d+[.):\-\s]+\s*", "", raw_t, flags=re.IGNORECASE).strip() or raw_t
            fi = s.get("fromIdx", s.get("from"))
            ti = s.get("toIdx", s.get("to"))
            try:
                fi_i = max(0, min(4, int(fi))) if fi is not None else d_st["fromIdx"]
            except Exception:
                fi_i = d_st["fromIdx"]
            try:
                ti_i = max(0, min(4, int(ti))) if ti is not None else d_st["toIdx"]
            except Exception:
                ti_i = d_st["toIdx"]
            step_list.append({
                "fromIdx": fi_i,
                "toIdx": ti_i,
                "title": clean_t,
                "detail": _cc.strip_md(s.get("detail") or d_st["detail"]),
                "wire": _cc.strip_md(s.get("wire") or s.get("arrowLabel") or d_st["wire"]),
                "kind": str(s.get("kind") or d_st["kind"]).lower(),
            })
        else:
            step_list.append(d_st)

    # Render all 6 real horizontal actor-to-actor arrows across clean non-overlapping rows y=262..622
    row_ys = [262, 332, 402, 474, 546, 622]
    edges: List[Dict[str, Any]] = []
    step_colors = ["#0F172A", "#0D7377", "#1A73E8", "#065F46", "#6D28D9", "#137333"]
    for i, st in enumerate(step_list):
        ry = row_ys[i]
        fi, ti = st["fromIdx"], st["toIdx"]
        clr = step_colors[i]
        is_resp = st["kind"] == "response" or ti < fi
        if fi == ti:
            # Self-guard loop on actor fi
            x0 = lane_x[fi] + 8
            edges.append({
                "id": f"se_{i+1}",
                "rawPoints": [(x0, ry - 12), (x0 + 58, ry - 12), (x0 + 58, ry + 14), (x0, ry + 14)],
                "stroke": clr, "strokeWidth": 1.8, "dashed": False,
            })
            circle_badges.append({"id": f"sb_{i}", "cx": x0 + 58, "cy": ry, "r": 13, "text": str(i + 1), "fill": clr, "fontSize": 11.0})
            lbl_w = _cc.fit_single_line_px(f"{st['title']} — {st['wire']}", 250, 9.2, bold=True)[0]
            labels.append({"id": f"slbl_{i}", "x": x0 + 78, "y": ry - 10, "w": 256, "h": 20, "text": lbl_w, "size": 9.2, "color": clr, "align": "left"})
        else:
            going_right = ti > fi
            x_start = lane_x[fi] + (8 if going_right else -8)
            x_end = lane_x[ti] + (-10 if going_right else 10)
            bx = x_start + (22 if going_right else -22)
            # Reserve clear horizontal gutter past circle badge so text NEVER touches step badge #N
            lbl_x = (bx + 18.0) if going_right else (x_end + 12.0)
            span_w = max(165.0, (x_end - lbl_x - 10.0) if going_right else (bx - 18.0 - lbl_x))
            wire_txt, wire_fs = _cc.fit_single_line_px(f"{st['title']}: {st['wire']}", span_w * 0.90, 9.0, bold=True)
            det_txt, det_fs = _cc.fit_single_line_px(st["detail"], span_w * 0.90, 8.2, bold=False)
            edges.append({
                "id": f"se_{i+1}",
                "rawPoints": [(x_start, ry), (x_end, ry)],
                "stroke": clr,
                "strokeWidth": 2.0,
                "dashed": is_resp,
                "bidirectional": (not is_resp and fi == 2 and ti in (3, 4)),
            })
            circle_badges.append({"id": f"sb_{i}", "cx": bx, "cy": ry, "r": 13, "text": str(i + 1), "fill": clr, "fontSize": 11.0})
            labels.append({"id": f"slbl_t_{i}", "x": lbl_x, "y": ry - 22, "w": span_w, "h": 18, "text": wire_txt, "size": wire_fs, "color": clr, "align": "center"})
            labels.append({"id": f"slbl_d_{i}", "x": lbl_x, "y": ry + 5, "w": span_w, "h": 16, "text": det_txt, "size": det_fs, "color": "#475569", "align": "center", "bold": False})

    # Right-hand Transaction / Consistency Highlight + OTel 200 panel (dedicated clean gutter x=1274..1560)
    hl = sq.get("highlightBox") or {
        "title": "Strongly Consistent Transaction",
        "subtitle": "Scoped ANN + temporal filter",
        "metric": "External Consistency (TrueTime)",
    }
    hl_sub_lines = _cc.wrap_px(str(hl.get("subtitle") or ""), 258, 9.0, bold=True, max_lines=2, ellipsis_last=False)
    hl_met_lines = _cc.wrap_px(str(hl.get("metric") or ""), 258, 8.6, max_lines=2, ellipsis_last=False)
    cards.append({
        "id": "seq_hl_box", "x": 1274, "y": 250, "w": 286, "h": 112,
        "fill": "#E6F4EA", "stroke": "#188038", "strokeWidth": 1.3, "rx": 10, "align": "center", "padL": 12, "padR": 12,
        "lines": [
            {"text": _cc.fit_single_line_px(hl.get("title", ""), 260, 10.6, bold=True)[0], "bold": True, "size": 10.5, "color": "#065F46"},
            *[{"text": ln, "bold": True, "size": 9.0, "color": "#065F46", "gapTop": 4 if idx == 0 else 1} for idx, ln in enumerate(hl_sub_lines)],
            *[{"text": ln, "size": 8.6, "color": "#1E293B", "gapTop": 5 if idx == 0 else 1} for idx, ln in enumerate(hl_met_lines)],
        ],
    })
    cards.append({
        "id": "scard_guard_tag", "x": 1274, "y": 380, "w": 286, "h": 30,
        "fill": "#475569", "stroke": "none", "rx": 6, "align": "center",
        "lines": [{"text": _cc.fit_single_line_px(sq.get("guardBadge") or "FGAC + Parameterized Query", 264, 9.4, bold=True)[0], "bold": True, "size": 9.4, "color": "#FFFFFF"}],
    })
    otel_bullets = sq.get("otelBullets") or ["traceparent propagated end-to-end", "Zero-PII audit span emitted"]
    cards.append({
        "id": "seq_otel_panel", "x": 1274, "y": 428, "w": 286, "h": 110,
        "fill": "#F8FAFC", "stroke": "#CBD5E1", "strokeWidth": 1.1, "rx": 10, "padL": 14, "padR": 82,
        "lines": [
            {"text": "• " + _cc.fit_single_line_px(str(b), 182, 9.0)[0], "size": 9.0, "color": "#334155", "gapTop": 5 if idx else 0}
            for idx, b in enumerate(otel_bullets[:3])
        ],
    })
    cards.append({
        "id": "seq_otel_chip", "x": 1488, "y": 456, "w": 58, "h": 54,
        "fill": "#0F172A", "stroke": "none", "rx": 6, "align": "center", "allowOverlap": True,
        "lines": [{"text": "OTel", "bold": True, "size": 9.8, "color": "#FFFFFF"}, {"text": "200", "bold": True, "size": 9.8, "color": "#6EE7B7", "gapTop": 2}],
    })

    # Bottom 3 connected summary milestone cards (`y=712..810`)
    summaries = sq.get("stageSummaries") or [
        {"title": "1. Ingress Strip & Verify", "headline": "External ALB + Cloud Armor + IAP", "detail": "Verified ES256 IAP JWT & WAF screen"},
        {"title": "2. Scoped Retrieval & AI", "headline": "Stateless API + Private Egress", "detail": "Parameterized query & grounded synthesis"},
        {"title": "3. Enforced Store & Audit", "headline": "Least-Privilege Access + OTel Span", "detail": "0 cross-tenant rows • Immutable logs"},
    ]
    sum_styles = [("#FEF2F2", "#DC2626", "#991B1B"), ("#EFF6FF", "#2563EB", "#1D4ED8"), ("#ECFDF5", "#059669", "#047857")]
    for i in range(3):
        sm = summaries[i] if i < len(summaries) else summaries[-1]
        sx = 64 + i * 504
        bg, bd, tc = sum_styles[i]
        det_lines = _cc.wrap_px(str(sm.get("detail") or ""), 430, 9.2, max_lines=2)
        sum_lines: List[Dict[str, Any]] = [
            {"text": _cc.fit_single_line_px(sm.get("title", ""), 440, 11.4, bold=True)[0], "bold": True, "size": 11.4, "color": tc},
            {"text": _cc.fit_single_line_px(sm.get("headline", ""), 440, 10.4, bold=True)[0], "bold": True, "size": 10.2, "color": "#0F172A", "gapTop": 4},
        ]
        for d_idx, dl in enumerate(det_lines):
            sum_lines.append({"text": dl, "size": 9.2, "color": "#475569", "gapTop": 4 if d_idx == 0 else 1})
        cards.append({
            "id": f"sum_{i}", "x": sx, "y": 714, "w": 464, "h": 98,
            "fill": bg, "stroke": bd, "strokeWidth": 1.4, "rx": 10, "align": "center",
            "padL": 16, "padR": 16, "padT": 10,
            "lines": sum_lines,
        })
        if i < 2:
            edges.append({"id": f"se_sum_{i}", "rawPoints": [(sx + 464, 763), (sx + 504, 763)], "stroke": "#1A73E8" if i == 0 else "#059669", "strokeWidth": 1.8})

    leg_in = sq.get("legendStrip") or {}
    plane_legend = [
        {"id": "pl_ctl", "plane": "CONTROL", "x": 64, "y": 838, "w": 476, "h": 24, "text": leg_in.get("control") or "Edge ALB/WAF, IAP auth verification, policy guard & telemetry"},
        {"id": "pl_cmp", "plane": "COMPUTE", "x": 556, "y": 838, "w": 484, "h": 24, "text": leg_in.get("compute") or "Stateless API runtime, embedding call & grounded reasoning lane"},
        {"id": "pl_dat", "plane": "DATA", "x": 1056, "y": 838, "w": 480, "h": 24, "text": leg_in.get("data") or "Primary datastore isolation, KMS CMEK & immutable audit logs"},
    ]

    return {
        "id": f"{slug}-sequence",
        "diagramName": "Figure 3 - Request Sequence",
        "title": f"Request Lifecycle & Execution Sequence — {title}",
        "quadTopBar": True,
        "titleY": 26,
        "titleSize": 19.5,
        "dividerY": 76,
        "lifelines": lifelines,
        "labels": labels,
        "bars": bars,
        "cards": cards,
        "pills": pills,
        "circleBadges": circle_badges,
        "edges": edges,
        "planeLegend": plane_legend,
    }


# ===========================================================================
# FIGURE 4: 3-LAYER ZERO-TRUST SECURITY TOPOLOGY & THREAT VAULT (C4 L1)
# (matching ws1-c4-l1-logical-security-taxonomy.svg)
# ===========================================================================

def build_security_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Security Boundary")
    sd = bp.get("securityDiagram") or {}
    layers = sd.get("layers") or [
        {"layer": "L1 · EDGE PERIMETER", "name": "Cloud Armor WAF & External ALB", "detail": "OWASP L7 rules, adaptive DDoS throttling & untrusted header stripping", "iconKey": "cloud_armor"},
        {"layer": "L2 · ZERO-TRUST IDENTITY", "name": "Identity-Aware Proxy (IAP)", "detail": "Verifies ES256 JWT assertion, binds tenant_id & blocks anonymous calls", "iconKey": "iap"},
        {"layer": "L3 · VPC-SC & DATA ISOLATION", "name": "Spanner FGAC & VPC-SC", "detail": "Internal-only ingress, FGAC role pool (<=100 roles) & tenant key prefix", "iconKey": "spanner"},
        {"layer": "L4 · CRYPTOGRAPHIC BOUNDARY", "name": "Cloud KMS CMEK Envelope", "detail": "Per-tenant KEK wraps DEK; destroying KEK enforces GDPR Art. 17 erasure", "iconKey": "cloud_kms"},
    ]
    while len(layers) < 4:
        layers.append(layers[-1])
    threats = sd.get("threats") or [
        {"id": "T-01", "vector": "L7 DDoS & Injection", "control": "Cloud Armor WAF blocks malformed requests and bursts at Google edge"},
        {"id": "T-02", "vector": "Spoofed Tenant Identity", "control": "ALB strips client X-Tenant-ID; IAP signs verifiable ES256 JWT"},
        {"id": "T-03", "vector": "Cross-Tenant Exfiltration", "control": "VPC-SC org perimeter + FGAC role pool + mandatory @tenant_id prefix"},
        {"id": "T-04", "vector": "Deleted Data Recovery", "control": "Destroying Cloud KMS KEK renders Spanner & BigQuery ciphertext unreadable"},
    ]
    while len(threats) < 4:
        threats.append({"id": f"T-0{len(threats)+1}", "vector": "Boundary Violation", "control": "Fail-closed perimeter enforcement"})
    breakers = sd.get("breakers") or [
        {"code": "HTTP 401", "trigger": "Missing or expired IAP JWT"},
        {"code": "HTTP 403", "trigger": "FGAC denial or destroyed KEK"},
        {"code": "HTTP 422", "trigger": "Invalid temporal/GQL syntax"},
        {"code": "HTTP 429", "trigger": "Cloud Armor rate cap exceeded"},
    ]
    while len(breakers) < 4:
        breakers.append({"code": f"HTTP 40{len(breakers)}", "trigger": "Fail-closed block"})

    l0, l1, l2, l3 = layers[0], layers[1], layers[2], layers[3]
    t0, t1, t2, t3 = threats[0], threats[1], threats[2], threats[3]

    zones: List[Dict[str, Any]] = [
        # Pillar 1: Edge & Identity Ingress (crisp slate border, airy white-slate fill)
        {
            "id": "sec_p1", "x": 34, "y": 78, "w": 424, "h": 738, "rx": 18,
            "fill": "#F8FAFC", "stroke": "#1E293B", "strokeWidth": 1.8,
            "title": "LAYER 1: EDGE & CALLER IDENTITY", "titleAlign": "center",
            "subtitle": "(Untrusted Ingress & Edge Authentication)", "titleColor": "#0F172A", "titleSize": 14.5,
        },
        # Pillar 2: Control Plane & Data Isolation (Google Teal border, clean white outer)
        {
            "id": "sec_p2", "x": 584, "y": 78, "w": 432, "h": 738, "rx": 18,
            "fill": "#FFFFFF", "stroke": "#0F766E", "strokeWidth": 1.8,
            "title": "LAYER 2: ISOLATION & CRYPTO CONTROL", "titleAlign": "center",
            "subtitle": "(Zero-Trust AuthZ, FGAC & CMEK Governance)", "titleColor": "#0F172A", "titleSize": 14.5,
        },
        # Pillar 3: Threat Interception & Fail-Closed Vault (Google Teal border, deep navy inner vault)
        {
            "id": "sec_p3", "x": 1142, "y": 78, "w": 424, "h": 738, "rx": 18,
            "fill": "#FFFFFF", "stroke": "#0F766E", "strokeWidth": 1.8,
            "title": "LAYER 3: THREATS & CIRCUIT BREAKERS", "titleAlign": "center",
            "subtitle": "(Blocked Attack Vectors & Fail-Closed HTTP)", "titleColor": "#0F172A", "titleSize": 14.5,
        },
    ]

    cards: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    labels: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [
        {"id": "sp_hdr", "plane": "CONTROL", "text": "C4 L1 · ZERO-TRUST SECURITY TOPOLOGY", "x": 1332, "y": 19, "w": 234, "h": 22},
    ]

    # --- PILLAR 1: 3 crisp stacked Edge & Caller Identity controls (x=62, w=368) ---
    p1_items = [
        (
            "sec_p1_0", 162, "#1E293B", "#FFFFFF", "#CBD5E1",
            _cc.resolve_icon_key(l0.get("iconKey", ""), l0.get("name", ""), "cloud_armor"),
            l0.get("layer") or "L1 · EDGE PERIMETER",
            l0.get("name") or "Cloud Armor WAF & ALB",
            l0.get("detail") or "TLS 1.3 + OWASP L7 rules + adaptive rate limiting",
        ),
        (
            "sec_p1_1", 374, "#1A73E8", "#FFFFFF", "#93C5FD",
            _cc.resolve_icon_key(l1.get("iconKey", ""), l1.get("name", ""), "iap"),
            l1.get("layer") or "L2 · ZERO-TRUST AUTH",
            l1.get("name") or "Identity-Aware Proxy (IAP)",
            l1.get("detail") or "Verifies ES256 JWT signature & strips client X-Tenant-ID",
        ),
        (
            "sec_p1_2", 586, "#0F766E", "#FFFFFF", "#99F6E4",
            "vpc_service_controls",
            "PRIVATE INGRESS CONTRACT",
            "Internal ALB + Zero allUsers",
            "Cloud Run rejects direct public traffic; VPC-SC blocks egress exfiltration.",
        ),
    ]
    for cid, cy, acc, bg, bd, ic, tag, nm, det in p1_items:
        nt, nfs = _cc.fit_single_line_px(nm, 290, 13.8, bold=True)
        dls = _cc.wrap_px(det, 290, 11.2, max_lines=3, ellipsis_last=False)
        cards.append({
            "id": cid, "x": 62, "y": cy, "w": 368, "h": 168,
            "fill": bg, "stroke": bd, "strokeWidth": 1.5, "rx": 14, "shadow": True,
            "topAccent": acc, "icon": ic, "iconPos": "left", "iconSize": 34, "padL": 62, "padR": 14,
            "lines": [
                {"text": _cc.fit_single_line_px(tag, 290, 10.2, bold=True)[0], "bold": True, "size": 10.2, "mono": True, "color": acc},
                {"text": nt, "bold": True, "size": nfs, "color": "#0F172A", "gapTop": 4},
                *[{"text": d, "size": 11.2, "color": "#475569", "gapTop": 5 if di == 0 else 2} for di, d in enumerate(dls)],
            ],
        })

    # Merging bus arrow Pillar 1 -> Pillar 2 (vertical trunk at x=470 so bus labels sit 100% in open whitespace!)
    edges.extend([
        {"id": "sec_m_top", "rawPoints": [(430, 246), (470, 246), (470, 458)], "stroke": "#1E293B", "strokeWidth": 1.8, "noArrow": True},
        {"id": "sec_m_bot", "rawPoints": [(430, 670), (470, 670), (470, 458)], "stroke": "#1E293B", "strokeWidth": 1.8, "noArrow": True},
        {"id": "sec_m_mid", "rawPoints": [(430, 458), (584, 458)], "stroke": "#1E293B", "strokeWidth": 2.2},
    ])
    labels.extend([
        {"id": "sec_lbl_1a", "x": 478, "y": 392, "w": 98, "h": 18, "text": "ES256 IAP JWT", "size": 11.2, "color": "#0F172A", "align": "center", "bold": True},
        {"id": "sec_lbl_1b", "x": 478, "y": 412, "w": 98, "h": 18, "text": "+ WAF Verified", "size": 10.4, "color": "#475569", "align": "center", "bold": False},
        {"id": "sec_lbl_1c", "x": 478, "y": 476, "w": 98, "h": 18, "text": "Header Strip", "size": 10.6, "color": "#475569", "align": "center", "bold": True},
        {"id": "sec_lbl_1d", "x": 478, "y": 496, "w": 98, "h": 18, "text": "Zero allUsers", "size": 10.2, "color": "#64748B", "align": "center", "bold": False},
    ])

    # --- PILLAR 2: Soft Gray-Blue Inner Stage + 3 Elevated Control Cards (matching ref_sec.png!) ---
    cards.append({
        "id": "sec_p2_stage", "x": 604, "y": 146, "w": 392, "h": 650,
        "fill": "#EEF2F6", "stroke": "#CBD5E1", "strokeWidth": 1.2, "rx": 14,
        "isContainer": True, "lines": [],
    })
    p2_items = [
        (
            "sec_p2_0", 174, "#1A73E8", "#E8F0FE", "#8AB4F8",
            _cc.resolve_icon_key("cloud_run", "Verified Tenant Context", "cloud_run"),
            "CLAIM EXTRACTION & BINDING",
            "Verified Tenant Context Bind",
            "Cryptographically binds verified @tenant_id from ES256 assertion; drops raw caller headers.",
        ),
        (
            "sec_p2_1", 380, "#C5221F", "#FCE8E6", "#F28B82",
            _cc.resolve_icon_key(l2.get("iconKey", ""), l2.get("name", ""), "spanner"),
            l2.get("layer") or "L3 · DATA ISOLATION",
            l2.get("name") or "Spanner FGAC Role Pool",
            l2.get("detail") or "Pooled FGAC roles (<=100 limit) + mandatory tenant_id primary key prefix.",
        ),
        (
            "sec_p2_2", 586, "#B06000", "#FEF7E0", "#FCD34D",
            _cc.resolve_icon_key(l3.get("iconKey", ""), l3.get("name", ""), "cloud_kms"),
            l3.get("layer") or "L4 · CRYPTO ERASURE",
            l3.get("name") or "Cloud KMS Envelope DEK",
            l3.get("detail") or "Per-tenant KEK wraps DEK; destroying KEK enforces GDPR Art. 17 erasure.",
        ),
    ]
    for cid, cy, tc, pill_bg, pill_bd, ic, tag, nm, det in p2_items:
        nt, nfs = _cc.fit_single_line_px(nm, 286, 13.8, bold=True)
        dls = _cc.wrap_px(det, 286, 11.0, max_lines=3, ellipsis_last=False)
        cards.append({
            "id": cid, "x": 624, "y": cy, "w": 352, "h": 172,
            "fill": "#FFFFFF", "stroke": pill_bd, "strokeWidth": 1.4, "rx": 12, "shadow": True,
            "allowOverlap": True, "icon": ic, "iconPos": "left", "iconSize": 32, "padL": 60, "padR": 14,
            "lines": [
                {"text": _cc.fit_single_line_px(tag, 286, 10.0, bold=True)[0], "bold": True, "size": 10.0, "mono": True, "color": tc},
                {"text": nt, "bold": True, "size": nfs, "color": "#0F172A", "gapTop": 4},
                *[{"text": d, "size": 11.0, "color": "#475569", "gapTop": 5 if di == 0 else 2} for di, d in enumerate(dls)],
            ],
        })
    edges.extend([
        {"id": "sec_p2_e01", "rawPoints": [(800, 346), (800, 380)], "stroke": "#475569", "strokeWidth": 1.8},
        {"id": "sec_p2_e12", "rawPoints": [(800, 552), (800, 586)], "stroke": "#475569", "strokeWidth": 1.8},
    ])

    # Outbound bus arrow Pillar 2 -> Pillar 3
    edges.append({"id": "sec_p2_to_p3", "rawPoints": [(1016, 458), (1142, 458)], "stroke": "#0F766E", "strokeWidth": 2.2})
    labels.extend([
        {"id": "sec_lbl_2a", "x": 1022, "y": 392, "w": 114, "h": 18, "text": "@tenant_id", "size": 11.2, "color": "#0F172A", "align": "center", "bold": True},
        {"id": "sec_lbl_2b", "x": 1022, "y": 412, "w": 114, "h": 18, "text": "+ FGAC Role", "size": 10.4, "color": "#475569", "align": "center", "bold": False},
        {"id": "sec_lbl_2c", "x": 1022, "y": 476, "w": 114, "h": 18, "text": "VPC-SC Lock", "size": 10.6, "color": "#0F766E", "align": "center", "bold": True},
        {"id": "sec_lbl_2d", "x": 1022, "y": 496, "w": 114, "h": 18, "text": "+ KMS CMEK", "size": 10.2, "color": "#64748B", "align": "center", "bold": False},
    ])

    # --- PILLAR 3: Deep Navy Security Vault (#0A2540) with 3 crisp White Defense & Breaker Cards (matching ref_sec.png!) ---
    cards.append({
        "id": "sec_p3_vault", "x": 1160, "y": 146, "w": 388, "h": 650,
        "fill": "#0A2540", "stroke": "#0A2540", "strokeWidth": 1.2, "rx": 16,
        "isContainer": True, "lines": [],
    })

    def _threat_lines(hdr: str, ta: Dict[str, Any], tb: Dict[str, Any], hdr_col: str) -> List[Dict[str, Any]]:
        out_l: List[Dict[str, Any]] = [{"text": hdr, "bold": True, "size": 11.0, "mono": True, "color": hdr_col}]
        for tx in (ta, tb):
            tid = _cc.strip_md(tx.get("id") or "T-0X")
            tvec = _cc.fit_single_line_px(f"{tid} · {tx.get('vector') or 'Threat'}", 322, 12.6, bold=True)[0]
            out_l.append({"text": tvec, "bold": True, "size": 12.6, "color": "#0F172A", "gapTop": 10})
            for wl in _cc.wrap_px(tx.get("control") or "Blocked at perimeter", 322, 11.4, max_lines=2):
                out_l.append({"text": wl, "size": 11.4, "color": "#334155", "gapTop": 3})
        return out_l

    # Card 1 inside Navy Vault: Edge & Auth Threats Blocked (T-01, T-02)
    cards.append({
        "id": "sec_p3_0", "x": 1178, "y": 166, "w": 352, "h": 182,
        "fill": "#FFFFFF", "stroke": "#E2E8F0", "strokeWidth": 1.2, "rx": 12,
        "isContainer": True, "padL": 16, "padR": 14, "padT": 14, "allowOverlap": True,
        "lines": _threat_lines("EDGE & IDENTITY BLOCKS", t0, t1, "#0F766E"),
    })
    # Card 2 inside Navy Vault: Red-Dashed Perimeter Box (T-03, T-04 — iconic ref_sec.png signature!)
    cards.append({
        "id": "sec_p3_1", "x": 1178, "y": 374, "w": 352, "h": 188,
        "fill": "#FFFFFF", "stroke": "#EF4444", "strokeWidth": 2.0, "dashed": True, "rx": 12,
        "isContainer": True, "padL": 16, "padR": 14, "padT": 14, "allowOverlap": True,
        "lines": _threat_lines("ISOLATION & CRYPTO BLOCKS", t2, t3, "#C5221F"),
    })
    edges.append({"id": "sec_p3_e01", "rawPoints": [(1354, 348), (1354, 374)], "stroke": "#94A3B8", "strokeWidth": 1.6})

    # Card 3 inside Navy Vault: Fail-Closed HTTP Circuit Breakers (4 crisp color-coded pill badges)
    cards.append({
        "id": "sec_p3_2", "x": 1178, "y": 588, "w": 352, "h": 190,
        "fill": "#FFFFFF", "stroke": "#E2E8F0", "strokeWidth": 1.2, "rx": 12,
        "isContainer": True, "padL": 16, "padR": 14, "padT": 12, "allowOverlap": True,
        "lines": [{"text": "FAIL-CLOSED HTTP CIRCUIT BREAKERS", "bold": True, "size": 10.2, "mono": True, "color": "#991B1B"}],
    })
    edges.append({"id": "sec_p3_e12", "rawPoints": [(1354, 562), (1354, 588)], "stroke": "#94A3B8", "strokeWidth": 1.6, "bidirectional": True})

    b_colors = ["#C5221F", "#B91C1C", "#6D28D9", "#B45309"]
    for bi in range(4):
        br = breakers[bi]
        by = 620 + bi * 38
        code_t = _cc.strip_md(br.get("code") or f"HTTP 40{bi}").replace("HTTP ", "")
        trig_t, t_fs = _cc.fit_single_line_px(br.get("trigger") or "Blocked", 232, 10.6, bold=False)
        cards.append({
            "id": f"brk_code_{bi}", "x": 1192, "y": by, "w": 72, "h": 30,
            "fill": b_colors[bi], "stroke": "none", "rx": 7, "align": "center", "allowOverlap": True,
            "lines": [{"text": f"HTTP {code_t}" if len(code_t) <= 3 else code_t, "bold": True, "size": 9.8, "mono": True, "color": "#FFFFFF"}],
        })
        cards.append({
            "id": f"brk_txt_{bi}", "x": 1272, "y": by, "w": 244, "h": 30,
            "fill": "#F8FAFC", "stroke": "#E2E8F0", "strokeWidth": 1.0, "rx": 7, "padL": 10, "padR": 8, "allowOverlap": True,
            "lines": [{"text": trig_t, "size": t_fs, "color": "#0F172A"}],
        })

    return {
        "id": f"{slug}-security",
        "diagramName": "Figure 4 - Security Boundary",
        "title": f"Zero-Trust Security Topology & Threat Interception — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "labels": labels,
        "cards": cards,
        "edges": edges,
        "pills": pills,
        "planeLegend": [
            {"id": "sl_1", "plane": "CONTROL", "x": 34, "y": 838, "w": 756, "h": 24, "text": "3-Layer Trust Flow: Edge WAF + IAP JWT -> FGAC Role & KMS CMEK -> Threat Vault"},
            {"id": "sl_2", "plane": "SECURITY", "x": 810, "y": 838, "w": 756, "h": 24, "text": "Fail-closed default: zero public allUsers, zero raw header pass-through, HTTP 401/403/422/429"},
        ],
    }


# ===========================================================================
# FIGURE 5: 3-COLUMN WIRE PAYLOAD & ENVELOPE TRANSFORMATION GATE (C4 L4)
# (matching ws1-c4-l4-wire-protocol-transformation.svg)
# ===========================================================================

def build_wire_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Wire Payload Transform")
    wd = bp.get("wireDiagram") or {}
    hops = wd.get("hops") or [
        {"hop": "HOP 1 · CLIENT INGRESS", "name": "Signed HTTP Request", "transport": "HTTPS / TLS 1.3", "iconKey": "saas_globe", "added": ["+ Authorization: Bearer <OIDC>", "+ X-Request-ID / traceparent"], "stripped": ["- Untrusted client X-Tenant-ID", "- Raw client forward headers"], "payload": "POST /v1/memory/query HTTP/2\n{\"query\": \"Q3 vendor terms\",\n \"as_of\": \"2025-10-15T12:00Z\"}"},
        {"hop": "HOP 2 · IAP AUTHZ", "name": "Verified Edge Assertion", "transport": "mTLS / HTTPS", "iconKey": "iap", "added": ["+ X-Goog-IAP-JWT-Assertion", "+ Verified @tenant_id claim"], "stripped": ["- Raw IAP OIDC JWT token"], "payload": "sub: svc-agent@example.com\nverified_tenant: fin_842"},
        {"hop": "HOP 3 · RUNTIME API", "name": "Embed & Parameterize", "transport": "gRPC / Private Google", "iconKey": "vertex_ai", "added": ["+ 768-dim embedding vector", "+ Valid-time / assert-time params"], "stripped": ["- Direct SQL string interpolation"], "payload": "model: gemini-embedding-001\noutput_dimensionality: 768"},
        {"hop": "HOP 4 · DATA QUERY", "name": "Scoped Graph/SQL Query", "transport": "gRPC / PSC + FGAC", "iconKey": "spanner", "added": ["+ FGAC database role binding", "+ KMS DEK audit & citations"], "stripped": ["- Raw wrapped_dek ciphertext"], "payload": "GRAPH AgentMemoryGraph\nMATCH (e:Entity)-[r:ASSERTED]->(f:Fact)\nWHERE r.tenant_id = @tenant_id"},
    ]
    while len(hops) < 4:
        hops.append(hops[-1])

    h0, h1, h2, h3 = hops[0], hops[1], hops[2], hops[3]

    # Collect unique stripped/rejected claims across hops for Left Red Column
    all_stripped: List[str] = []
    for hx in hops:
        for s in (hx.get("stripped") or []):
            clean_s = _cc.strip_md(s).lstrip("-• ").strip()
            if clean_s and clean_s not in all_stripped:
                all_stripped.append(clean_s)
    if not all_stripped:
        all_stripped = ["Untrusted client X-Tenant-ID header", "Raw unverified caller claims & SQL strings"]
    if len(all_stripped) < 2:
        all_stripped.append("Raw unverified client identity claims")

    # Collect unique verified/bound fields across Hops 2..4 for Right Green Column
    all_added: List[str] = []
    for hx in (h1, h2, h3, h0):
        for a in (hx.get("added") or []):
            clean_a = _cc.strip_md(a).lstrip("+• ").strip()
            if clean_a and clean_a not in all_added:
                all_added.append(clean_a)
    while len(all_added) < 4:
        all_added.append("Cryptographically bound tenant & query parameter")

    zones: List[Dict[str, Any]] = [
        # Left Red-Bordered Untrusted Ingress Column (as a Zone so labels '{', '}', headers paint cleanly on top!)
        {
            "id": "wl_col", "x": 34, "y": 78, "w": 452, "h": 732, "rx": 18,
            "fill": "#FFFFFF", "stroke": "#D93025", "strokeWidth": 2.0,
        },
        # Outer dashed Control perimeter framing the Center Teal Transformation Gate (matching ref_wire.png!)
        {
            "id": "wg_ctrl_outer", "x": 546, "y": 72, "w": 508, "h": 744, "rx": 18,
            "fill": "#FFFFFF", "stroke": "#60A5FA", "strokeWidth": 1.6, "dashed": True,
        },
        # Right Green-Bordered Verified Envelope Column (as a Zone so labels '{', '}' paint cleanly on top!)
        {
            "id": "wr_col", "x": 1114, "y": 78, "w": 452, "h": 732, "rx": 18,
            "fill": "#FFFFFF", "stroke": "#188038", "strokeWidth": 2.0,
        },
    ]
    cards: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    labels: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [
        {"id": "wp_pill", "plane": "ASYNC", "text": "C4 L4 · PAYLOAD TRANSFORMATION", "x": 1340, "y": 19, "w": 226, "h": 22},
        {"id": "wg_gate_pill", "plane": "CONTROL", "text": "CONTROL · 3-Stage Zero-Trust Gate", "x": 574, "y": 86, "w": 216, "h": 22},
    ]

    # =========================================================================
    # LEFT COLUMN (x=34..486, w=452): UNTRUSTED CALLER / INGRESS REQUEST (RED)
    # =========================================================================
    in_tr = _cc.fit_single_line_px(h0.get("transport") or "HTTPS / TLS 1.3", 360, 12.2)[0]
    cards.append({
        "id": "wl_hdr", "x": 54, "y": 96, "w": 412, "h": 68,
        "fill": "#FFFFFF", "stroke": "none", "align": "center", "allowOverlap": True,
        "icon": _cc.resolve_icon_key(h0.get("iconKey", ""), h0.get("name", ""), "saas_globe"),
        "iconPos": "left", "iconSize": 30, "padL": 54,
        "lines": [
            {"text": "Untrusted Caller Ingress", "bold": True, "size": 16.5, "color": "#0F172A"},
            {"text": f"{_cc.fit_single_line_px(h0.get('name') or 'Inbound Request', 210, 12.0)[0]} · {in_tr}", "size": 11.8, "color": "#475569", "gapTop": 3},
        ],
    })
    edges.append({"id": "wl_div", "rawPoints": [(64, 174), (456, 174)], "stroke": "#D93025", "strokeWidth": 1.6, "noArrow": True})
    labels.append({"id": "wl_brace_open", "x": 62, "y": 186, "w": 40, "h": 22, "text": "{", "size": 16.0, "color": "#334155", "align": "left", "bold": True})

    # Soft Blue Pill: Inbound Transport / Auth Header
    h0_added_0 = _cc.strip_md((h0.get("added") or ["Authorization: Bearer <OIDC>"])[0]).lstrip("+ ")
    h0_added_1 = _cc.strip_md((h0.get("added") or ["", "TLS 1.3 ALPN ingress"])[1] if len(h0.get("added") or []) > 1 else "TLS 1.3 ingress").lstrip("+ ")
    cards.append({
        "id": "wl_auth_pill", "x": 62, "y": 216, "w": 396, "h": 68,
        "fill": "#E8F0FE", "stroke": "#8AB4F8", "strokeWidth": 1.2, "rx": 10,
        "padL": 14, "padR": 12, "allowOverlap": True,
        "lines": [
            {"text": _cc.fit_single_line_px(f'"{h0_added_0}"', 368, 11.6, bold=True)[0], "bold": True, "size": 11.6, "mono": True, "color": "#174EA6"},
            {"text": _cc.fit_single_line_px(f'"{h0_added_1}"', 368, 10.6)[0], "size": 10.6, "mono": True, "color": "#1E3A8A", "gapTop": 4},
        ],
    })
    labels.append({"id": "wl_hdr_lbl", "x": 62, "y": 294, "w": 360, "h": 20, "text": '"untrusted_claims_stripped": [', "size": 11.6, "color": "#334155", "align": "left", "bold": True})

    # Soft Red Pill: Stripped Claim #1
    cards.append({
        "id": "wl_strip_1", "x": 62, "y": 322, "w": 396, "h": 62,
        "fill": "#FCE8E6", "stroke": "#F28B82", "strokeWidth": 1.2, "rx": 10,
        "padL": 14, "padR": 12, "allowOverlap": True,
        "lines": [
            {"text": _cc.fit_single_line_px(f'STRIPPED: "{all_stripped[0]}"', 368, 11.4, bold=True)[0], "bold": True, "size": 11.4, "mono": True, "color": "#A50E0E"},
        ],
    })
    # Bold Solid Red Pill: Stripped Claim #2 (exact ref_wire.png high-impact visual alert!)
    cards.append({
        "id": "wl_strip_2", "x": 62, "y": 398, "w": 396, "h": 62,
        "fill": "#EA4335", "stroke": "#C5221F", "strokeWidth": 1.2, "rx": 10,
        "padL": 14, "padR": 12, "allowOverlap": True,
        "lines": [
            {"text": _cc.fit_single_line_px(f'<REJECTED: {all_stripped[1]}>', 368, 11.4, bold=True)[0], "bold": True, "size": 11.4, "mono": True, "color": "#FFFFFF"},
        ],
    })
    labels.append({"id": "wl_arr_close", "x": 62, "y": 468, "w": 160, "h": 18, "text": '], "wire_body":', "size": 11.2, "color": "#334155", "align": "left", "bold": True})

    # Compact Readable Inbound Request Sample Frame (zero dead space — 11.4px bold-crisp mono!)
    raw_in_lines: List[Dict[str, Any]] = [{"text": "INBOUND WIRE REQUEST SAMPLE", "bold": True, "size": 10.2, "mono": True, "color": "#64748B"}]
    for rl in str(h0.get("payload") or "POST /v1/query HTTP/2").splitlines()[:6]:
        if rl.strip():
            for wl in _cc.wrap_px(rl, 366, 11.4, mono=True, max_lines=2):
                raw_in_lines.append({"text": wl, "size": 11.4, "mono": True, "color": "#0F172A", "gapTop": 5})
    cards.append({
        "id": "wl_sample", "x": 62, "y": 494, "w": 396, "h": 194,
        "fill": "#F8FAFC", "stroke": "#CBD5E1", "strokeWidth": 1.2, "rx": 10,
        "isContainer": True, "padL": 14, "padR": 12, "padT": 14, "allowOverlap": True,
        "lines": raw_in_lines[:8],
    })
    labels.append({"id": "wl_brace_close", "x": 62, "y": 698, "w": 40, "h": 22, "text": "}", "size": 16.0, "color": "#334155", "align": "left", "bold": True})
    cards.append({
        "id": "wl_status", "x": 62, "y": 732, "w": 396, "h": 54,
        "fill": "#FCE8E6", "stroke": "#D93025", "strokeWidth": 1.4, "rx": 12, "align": "center", "allowOverlap": True,
        "lines": [{"text": "✕ Unverified Client Claims • Stripped at Edge", "bold": True, "size": 11.6, "color": "#A50E0E"}],
    })

    # =========================================================================
    # CENTER COLUMN (x=560..1040, w=480): DEEP TEAL 3-STAGE SECURITY GATE
    # =========================================================================
    cards.append({
        "id": "wg_teal", "x": 560, "y": 82, "w": 480, "h": 724,
        "fill": "#155E75", "stroke": "#0E7490", "strokeWidth": 1.6, "rx": 16,
        "isContainer": True, "shadow": True, "lines": [],
    })
    cards.append({
        "id": "wg_hdr", "x": 582, "y": 116, "w": 436, "h": 62,
        "fill": "#155E75", "stroke": "none", "align": "center", "allowOverlap": True,
        "lines": [
            {"text": "Zero-Trust Wire & Schema Gate", "bold": True, "size": 17.0, "color": "#FFFFFF"},
            {"text": "Verify Identity -> Transform Context -> Bind Parameters", "size": 11.8, "color": "#BAE6FD", "gapTop": 4},
        ],
    })
    # Subtle lighter teal inner stage track (exact ref_wire.png layered depth!)
    cards.append({
        "id": "wg_track", "x": 588, "y": 196, "w": 424, "h": 584,
        "fill": "#1E6B83", "stroke": "#38BDF8", "strokeWidth": 0.9, "rx": 14,
        "isContainer": True, "allowOverlap": True, "lines": [],
    })
    gate_hops = (h1, h2, h3)
    for si, gh in enumerate(gate_hops):
        sy = 222 + si * 182
        g_name = _cc.fit_single_line_px(gh.get("name") or f"Stage {si+1}", 300, 14.0, bold=True)[0]
        g_tr = _cc.fit_single_line_px(gh.get("transport") or "gRPC / mTLS", 300, 10.8)[0]
        g_bind_raw = (gh.get("added") or ["Verified context binding"])[0]
        g_bind = _cc.fit_single_line_px(_cc.strip_md(g_bind_raw), 300, 10.8)[0]
        g_ic = _cc.resolve_icon_key(gh.get("iconKey", ""), gh.get("name", ""), gh.get("hop", ""))
        cards.append({
            "id": f"wg_stage_{si}", "x": 610, "y": sy, "w": 380, "h": 148,
            "fill": "#0D253F", "stroke": "#94A3B8", "strokeWidth": 1.3, "rx": 12,
            "allowOverlap": True, "icon": g_ic, "iconPos": "header-left", "iconSize": 32, "padL": 64, "padR": 14,
            "lines": [
                {"text": f"STAGE 0{si + 1}", "bold": True, "size": 11.4, "mono": True, "color": "#7DD3FC"},
                {"text": g_name, "bold": True, "size": 14.0, "color": "#FFFFFF", "gapTop": 4},
                {"text": g_tr, "size": 10.8, "mono": True, "color": "#CBD5E1", "gapTop": 4},
                {"text": g_bind, "size": 10.8, "color": "#A7F3D0", "gapTop": 6},
            ],
        })
        if si < 2:
            edges.append({"id": f"wg_se_{si}", "rawPoints": [(800, sy + 148), (800, sy + 182)], "stroke": "#BAE6FD", "strokeWidth": 2.0})

    # Clean Horizontal Gate Arrows (Left -> Center -> Right)
    edges.extend([
        {"id": "wg_in_arr", "rawPoints": [(486, 444), (546, 444)], "stroke": "#D93025", "strokeWidth": 2.6},
        {"id": "wg_out_arr", "rawPoints": [(1054, 444), (1114, 444)], "stroke": "#155E75", "strokeWidth": 2.6},
    ])

    # =========================================================================
    # RIGHT COLUMN (x=1114..1566, w=452): VERIFIED PARAMETERIZED PAYLOAD (GREEN)
    # =========================================================================
    out_tr = _cc.fit_single_line_px(h3.get("transport") or "gRPC / PSC + FGAC", 360, 12.2)[0]
    cards.append({
        "id": "wr_hdr", "x": 1134, "y": 96, "w": 412, "h": 68,
        "fill": "#FFFFFF", "stroke": "none", "align": "center", "allowOverlap": True,
        "icon": _cc.resolve_icon_key(h3.get("iconKey", ""), h3.get("name", ""), "spanner"),
        "iconPos": "left", "iconSize": 30, "padL": 54,
        "lines": [
            {"text": "Verified Bound Envelope", "bold": True, "size": 16.5, "color": "#0F172A"},
            {"text": f"{_cc.fit_single_line_px(h3.get('name') or 'Parameterized Target', 210, 12.0)[0]} · {out_tr}", "size": 11.8, "color": "#475569", "gapTop": 3},
        ],
    })
    edges.append({"id": "wr_div", "rawPoints": [(1144, 174), (1536, 174)], "stroke": "#188038", "strokeWidth": 1.6, "noArrow": True})
    labels.append({"id": "wr_brace_open", "x": 1142, "y": 186, "w": 40, "h": 22, "text": "{", "size": 16.0, "color": "#334155", "align": "left", "bold": True})

    # 4 Crisp Soft-Green Bound-Field Pills (exact ref_wire.png readability!)
    for bi in range(4):
        by = 216 + bi * 72
        btxt = _cc.fit_single_line_px(f"+ {all_added[bi]}", 368, 11.4, bold=True)[0]
        cards.append({
            "id": f"wr_bind_{bi}", "x": 1142, "y": by, "w": 396, "h": 58,
            "fill": "#E6F4EA", "stroke": "#81C995", "strokeWidth": 1.2, "rx": 10,
            "padL": 14, "padR": 12, "allowOverlap": True,
            "lines": [{"text": btxt, "bold": True, "size": 11.4, "mono": True, "color": "#137333"}],
        })

    # Compact Verified Downstream Query / Response Sample Frame (filled richly, 11.2px crisp mono!)
    out_raw = str(h2.get("payload") or h3.get("payload") or "GRAPH_TABLE(...) WHERE tenant_id = @tenant_id").strip()
    if len(out_raw) < 20:
        out_raw = str(h3.get("payload") or "")
    out_pl_lines: List[Dict[str, Any]] = [{"text": "VERIFIED PARAMETERIZED QUERY / RESPONSE", "bold": True, "size": 10.2, "mono": True, "color": "#137333"}]
    for rl in out_raw.splitlines()[:6]:
        if rl.strip():
            for wl in _cc.wrap_px(rl, 366, 11.0, mono=True, max_lines=2):
                out_pl_lines.append({"text": wl, "size": 11.0, "mono": True, "color": "#0F172A", "gapTop": 4})
    cards.append({
        "id": "wr_sample", "x": 1142, "y": 506, "w": 396, "h": 182,
        "fill": "#F8FAFC", "stroke": "#86EFAC", "strokeWidth": 1.2, "rx": 10,
        "isContainer": True, "padL": 14, "padR": 12, "padT": 14, "allowOverlap": True,
        "lines": out_pl_lines[:8],
    })
    labels.append({"id": "wr_brace_close", "x": 1142, "y": 698, "w": 40, "h": 22, "text": "}", "size": 16.0, "color": "#334155", "align": "left", "bold": True})
    cards.append({
        "id": "wr_status", "x": 1142, "y": 732, "w": 396, "h": 54,
        "fill": "#E6F4EA", "stroke": "#188038", "strokeWidth": 1.4, "rx": 12, "align": "center", "allowOverlap": True,
        "lines": [{"text": "✓ Fail-Closed Verified • 0 Untrusted Fields", "bold": True, "size": 11.6, "color": "#137333"}],
    })

    return {
        "id": f"{slug}-wire",
        "diagramName": "Figure 5 - Wire Payload Diff",
        "title": f"Wire-Protocol & Payload Transformation — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "labels": labels,
        "cards": cards,
        "edges": edges,
        "pills": pills,
        "planeLegend": [
            {"id": "wl_1", "plane": "CONTROL", "x": 34, "y": 838, "w": 496, "h": 24, "text": "Edge ALB + IAP strips client headers & verifies ES256 assertion"},
            {"id": "wl_2", "plane": "COMPUTE", "x": 552, "y": 838, "w": 496, "h": 24, "text": "Cloud Run embeds query & binds parameterized variables (0 string concat)"},
            {"id": "wl_3", "plane": "DATA", "x": 1070, "y": 838, "w": 496, "h": 24, "text": "FGAC role + @tenant_id + KMS DEK audit enforce strict isolation"},
        ],
    }


# ===========================================================================
# FIGURE 6: OFF-PATH ASYNC CDC, ANALYTICS & RECOVERY ARCHITECTURE
# ===========================================================================

def build_async_spec_v3(bp: Dict[str, Any], slug: str) -> Dict[str, Any]:
    title = _cc.strip_md(bp.get("title") or "Async Lifecycle Loop")
    ad = bp.get("asyncDiagram") or {}
    stages = ad.get("stages") or [
        {"stage": "1. CHANGE CAPTURE", "service": "Change Streams", "cadence": "Continuous", "iconKey": "spanner", "bullets": ["Streams insert / update / delete ops", "Ordered per-partition mutations", "Runs off online read latency path", "TrueTime commit timestamp preserved"]},
        {"stage": "2. STREAM TRANSFORM", "service": "Cloud Dataflow (Beam)", "cadence": "Sub-second", "iconKey": "dataflow", "bullets": ["Enriches metadata & tenant tags", "Preserves encrypted payload bytes", "Exactly-once window aggregation", "Routes poison pills to GCS DLQ"]},
        {"stage": "3. ANALYTICS LOAD", "service": "BigQuery WORM Lake", "cadence": "Near real-time", "iconKey": "bigquery", "bullets": ["Partitioned by commit timestamp", "Point-in-time historical queries", "Cost & SLO attribution views", "Immutable retention policy lock"]},
        {"stage": "4. ERASURE & OPS", "service": "Cloud KMS & Monitor", "cadence": "On-Demand", "iconKey": "cloud_kms", "bullets": ["Destroys tenant KEK version", "Invalidates Spanner & BQ rows", "Alerts on Dataflow freshness lag", "Reconciles GCS DLQ replay"]},
    ]
    while len(stages) < 4:
        stages.append(stages[-1])

    pal_seq = [
        ("CONTROL", "#EFF6FF", "#60A5FA", "#174EA6"),
        ("COMPUTE", "#ECFDF5", "#34D399", "#065F46"),
        ("ASYNC", "#F5F3FF", "#A78BFA", "#5B21B6"),
        ("DATA", "#FFFBEB", "#FBBF24", "#92400E"),
    ]
    hop_lbls = ("Row CDC", "Beam Stream", "Audit Sync")
    zones: List[Dict[str, Any]] = [
        {
            "id": "as_pipe_z", "x": 34, "y": 74, "w": 1532, "h": 350, "rx": 14,
            "fill": "#F8FAFC", "stroke": "#94A3B8", "dashed": True, "strokeWidth": 1.4,
            "title": "Google Cloud Off-Path Asynchronous Pipeline (Zero Synchronous OLTP Read/Write Impact)",
            "titleColor": "#174EA6", "titleSize": 11.8,
        },
    ]
    cards: List[Dict[str, Any]] = []
    pills: List[Dict[str, Any]] = [
        {"id": "as_top_pill", "plane": "DATA", "text": "ASYNC · OFF-PATH CDC & RECOVERY", "x": 1344, "y": 19, "w": 224, "h": 22},
    ]
    edges: List[Dict[str, Any]] = []

    sw, gap = 338, 46
    for i in range(4):
        st = stages[i]
        x0 = 54 + i * (sw + gap)
        pl, soft_bg, stroke, tc = pal_seq[i]
        cad = _cc.strip_md(st.get("cadence") or "Async")
        pw = _pick_pill_w(cad, min_w=72, pad=14)
        pills.append({"id": f"as_p_{i}", "plane": pl, "text": cad, "x": x0 + sw - pw - 10, "y": 106, "w": pw, "h": 18})

        ic = _cc.resolve_icon_key(st.get("iconKey", ""), st.get("service", ""), st.get("stage", ""))
        svc_t, svc_fs = _cc.fit_single_line_px(st.get("service") or f"Stage {i+1}", sw - 82, 14.2, bold=True)
        raw_b = st.get("bullets") or st.get("detail") or ""
        blts = _norm_bullets(raw_b, 4, sw - 46, fs=11.6, max_total_lines=7)
        for bi_idx, bl in enumerate(blts):
            bl["color"] = "#1E293B"
            if bi_idx > 0 and str(bl.get("text", "")).startswith("•"):
                bl["gapTop"] = 6

        # Tightly fitted stage card (h=292, zero dead air!)
        cards.append({"id": f"as_c_{i}", "x": x0, "y": 116, "w": sw, "h": 292, "fill": "#FFFFFF", "stroke": stroke, "strokeWidth": 1.4, "rx": 12, "isContainer": True, "topAccent": tc, "shadow": True, "lines": []})
        cards.append({
            "id": f"as_hdr_{i}", "x": x0 + 12, "y": 132, "w": sw - 24, "h": 68,
            "fill": soft_bg, "stroke": stroke, "strokeWidth": 1.0, "rx": 9, "allowOverlap": True,
            "icon": ic, "iconPos": "left", "iconSize": 30, "padL": 54,
            "lines": [
                {"text": _cc.strip_md(st.get("stage") or f"{i+1}. STAGE"), "bold": True, "size": 10.0, "mono": True, "color": tc},
                {"text": svc_t, "bold": True, "size": svc_fs, "color": "#0F172A", "gapTop": 2},
            ],
        })
        cards.append({
            "id": f"as_body_{i}", "x": x0 + 12, "y": 210, "w": sw - 24, "h": 144,
            "fill": "#FFFFFF", "stroke": "none", "rx": 6, "isContainer": True, "padL": 8, "padR": 8, "padT": 4, "allowOverlap": True,
            "lines": blts,
        })
        badge_txt = _cc.strip_md(st.get("slo") or f"Stage {i+1} · {cad} · Off-Path")
        cards.append({
            "id": f"as_foot_{i}", "x": x0 + 14, "y": 362, "w": sw - 28, "h": 34,
            "fill": soft_bg, "stroke": stroke, "strokeWidth": 1.0, "rx": 7, "align": "center", "allowOverlap": True,
            "lines": [{"text": badge_txt, "bold": True, "size": 10.2, "mono": True, "color": tc}],
        })
        if i < 3:
            edges.append({"id": f"as_e_{i}", "rawPoints": [(x0 + sw, 260), (x0 + sw + gap, 260)], "stroke": "#1A73E8", "strokeWidth": 2.2, "dashed": True, "label": hop_lbls[i], "labelY": 240})

    # Bottom Dual-Panel Architecture: Left = DLQ & Replay Loop, Right = Governance & Freshness Control
    dlq_note = _cc.strip_md(ad.get("dlqNote") or "Dead-letter bucket isolates malformed events without stalling live stream consumers. Alerts fire on DLQ depth > 0; exponential backoff + idempotency keys ensure zero-duplicate replay.")
    fb_lbl = _cc.strip_md(ad.get("feedbackLabel") or "Freshness & Erasure Check")

    zones.append({
        "id": "as_dlq_z", "x": 34, "y": 484, "w": 958, "h": 332, "rx": 14,
        "fill": "#FFFFFF", "stroke": "#DC2626", "dashed": True, "strokeWidth": 1.4,
        "title": "Fault Handling, Dead-Letter Queue (GCS CMEK) & Idempotent Replay",
        "titleColor": "#991B1B", "titleSize": 12.0,
    })
    cards.append({
        "id": "as_dlq_c", "x": 52, "y": 524, "w": 922, "h": 96,
        "fill": "#FEF2F2", "stroke": "#FCA5A5", "strokeWidth": 1.1, "rx": 10,
        "icon": "cloud_storage", "iconPos": "left", "iconSize": 32, "padL": 58, "padR": 14,
        "lines": [
            {"text": "Dead-Letter Isolation & Replay Contract", "bold": True, "size": 12.8, "color": "#991B1B"},
            *[{"text": wl, "size": 11.4, "color": "#334155", "gapTop": 4 if wi == 0 else 2} for wi, wl in enumerate(_cc.wrap_px(dlq_note, 840, 11.4, max_lines=2))],
        ],
    })
    dlq_cards = [
        ("Exponential Backoff", "Jittered retries prevent downstream BigQuery or Beam quota storms.", "#EFF6FF", "#93C5FD", "#174EA6"),
        ("Idempotent Replay Keys", "Commit timestamp + record sequence guarantee zero duplicate rows.", "#ECFDF5", "#6EE7B7", "#065F46"),
        ("Alert on DLQ Depth > 0", "Cloud Monitoring triggers SRE alert immediately on poison pills.", "#FEF2F2", "#FCA5A5", "#991B1B"),
    ]
    for ci, (ct, cd, cbg, cbd, cfg) in enumerate(dlq_cards):
        cx = 52 + ci * 314
        clines = _cc.wrap_px(cd, 266, 11.2, max_lines=3, ellipsis_last=False)
        cards.append({
            "id": f"as_chip_{ci}", "x": cx, "y": 638, "w": 294, "h": 156,
            "fill": cbg, "stroke": cbd, "strokeWidth": 1.2, "rx": 10, "padL": 14, "padR": 14,
            "lines": [
                {"text": ct, "bold": True, "size": 12.2, "mono": True, "color": cfg},
                *[{"text": ln, "size": 11.2, "color": "#1E293B", "gapTop": 7 if li == 0 else 3} for li, ln in enumerate(clines)],
            ],
        })

    zones.append({
        "id": "as_gov_z", "x": 1022, "y": 484, "w": 544, "h": 332, "rx": 14,
        "fill": "#FFFFFF", "stroke": "#137333", "dashed": True, "strokeWidth": 1.4,
        "title": "Crypto-Erasure & Pipeline Freshness Reconciliation",
        "titleColor": "#065F46", "titleSize": 12.0,
    })
    gov_cards = [
        ("cloud_kms", "GDPR Art. 17 Crypto-Erasure Audit", "Verifies KMS KEK version destruction invalidates all tenant rows across Spanner & BigQuery WORM.", "#FFFBEB", "#FCD34D", "#92400E"),
        ("cloud_monitoring", "End-to-End Lag & Row Parity SLO", "Tracks Change Streams -> Dataflow -> BigQuery lag (< 5s p95) and reconciles replayed DLQ counts.", "#ECFDF5", "#6EE7B7", "#065F46"),
    ]
    for gi, (gic, gt, gd, gbg, gbd, gfg) in enumerate(gov_cards):
        gy = 528 + gi * 138
        glines = _cc.wrap_px(gd, 428, 11.2, max_lines=3, ellipsis_last=False)
        cards.append({
            "id": f"as_gov_{gi}", "x": 1040, "y": gy, "w": 508, "h": 124,
            "fill": gbg, "stroke": gbd, "strokeWidth": 1.2, "rx": 10,
            "icon": gic, "iconPos": "left", "iconSize": 30, "padL": 56, "padR": 14,
            "lines": [
                {"text": gt, "bold": True, "size": 12.6, "color": gfg},
                *[{"text": ln, "size": 11.2, "color": "#1E293B", "gapTop": 5 if li == 0 else 2} for li, ln in enumerate(glines)],
            ],
        })

    edges.extend([
        {"id": "as_err_1", "rawPoints": [(54 + 1 * (sw + gap) + sw / 2.0, 408), (54 + 1 * (sw + gap) + sw / 2.0, 484)], "stroke": "#DC2626", "strokeWidth": 1.8, "dashed": True, "label": "Beam Error / DLQ", "labelY": 448},
        {"id": "as_err_2", "rawPoints": [(54 + 2 * (sw + gap) + 120, 408), (54 + 2 * (sw + gap) + 120, 484)], "stroke": "#DC2626", "strokeWidth": 1.8, "dashed": True, "label": "BQ Load Error", "labelY": 448},
        {"id": "as_fb", "rawPoints": [(54 + 3 * (sw + gap) + sw / 2.0, 408), (54 + 3 * (sw + gap) + sw / 2.0, 484)], "stroke": "#137333", "strokeWidth": 2.0, "dashed": True, "label": _cc.fit_single_line_px(fb_lbl, 180, 9.4, bold=True)[0], "labelY": 448},
    ])

    return {
        "id": f"{slug}-async",
        "diagramName": "Figure 6 - Async Lifecycle Loop",
        "title": f"Async CDC Pipeline, Cold Audit & Recovery Architecture — {title}",
        "titleY": 14,
        "dividerY": 54,
        "zones": zones,
        "cards": cards,
        "pills": pills,
        "edges": edges,
        "planeLegend": [
            {"id": "al_1", "plane": "DATA", "x": 34, "y": 838, "w": 1532, "h": 24, "text": "All Change Streams CDC, Dataflow transforms, BigQuery WORM loads, DLQ replay & KMS erasure audits run strictly off the synchronous read path."},
        ],
    }


# ===========================================================================
# UNIFIED 6-DIAGRAM + NATIVE PPTX SLIDE XML COMPILER ENTRYPOINT
# ===========================================================================

def compile_all_v2_diagrams(
    bp: Dict[str, Any],
    slug: str,
    enabled_kinds: Optional[List[str]] = None,
    slide_plan: Optional[Dict[str, Any]] = None,
) -> Dict[str, Dict[str, Any]]:
    builders_by_kind = {
        "architecture": (build_architecture_spec_v3, "Master Platform Architecture (C4 L2)", "C4 L2", 3),
        "cloudarch":    (build_cloudarch_spec_v3,    "Cloud Architecture Center Blueprint", "HUB-SPOKE", 4),
        "sequence":     (build_sequence_spec_v3,     "Request Lifecycle Sequence (C4 L3)", "C4 L3", 5),
        "security":     (build_security_spec_v3,     "Trust Perimeter & Security Boundary (C4 L1)", "C4 L1", 6),
        "wire":         (build_wire_spec_v3,         "Wire-Protocol & Schema Transformation (C4 L4)", "C4 L4", 7),
        "async":        (build_async_spec_v3,        "Async State, Export & Lifecycle Loop", "ASYNC", 8),
    }
    total_slides = int((slide_plan or {}).get("totalSlides") or 12)
    ordered_entries: List[Tuple[str, str, int, int]] = []
    if isinstance(slide_plan, dict) and isinstance(slide_plan.get("enabledDiagrams"), list) and slide_plan["enabledDiagrams"]:
        for idx, d in enumerate(slide_plan["enabledDiagrams"], 1):
            dk = str(d.get("kind") or "").strip().lower()
            if dk in builders_by_kind:
                default_title = builders_by_kind[dk][1]
                custom_title = _cc.strip_md(d.get("title") or default_title) or default_title
                s_num = int(d.get("slideNumber") or (2 + idx))
                ordered_entries.append((dk, custom_title, idx, s_num))
    else:
        kinds = [k for k in (enabled_kinds or list(builders_by_kind.keys())) if k in builders_by_kind]
        if not kinds:
            kinds = ["architecture"]
        for idx, dk in enumerate(kinds, 1):
            _, default_title, _, default_slide = builders_by_kind[dk]
            s_num = default_slide if enabled_kinds is None else (2 + idx)
            ordered_entries.append((dk, default_title, idx, s_num))

    out: Dict[str, Dict[str, Any]] = {}
    for kind, clean_title, fig_num, slide_num in ordered_entries:
        builder, default_title, layer, default_slide = builders_by_kind[kind]
        title_str = f"Figure {fig_num} — {clean_title}"
        spec = builder(bp, slug)
        public_id = _cc.make_diagram_public_id(slug, kind)
        spec["id"] = public_id
        if slide_num != default_slide or not spec.get("diagramName"):
            spec["diagramName"] = f"Figure {fig_num} - {clean_title[:48]}"
        xml = _cc.compile_spec_to_drawio_xml(spec)
        svg = _cc.compile_spec_to_svg(spec)
        geom = _cc.validate_spec_geometry(spec)
        url = _cc.build_viewer_url(xml, public_id, f"{public_id}.drawio")
        icons = geom["iconCount"]
        slide_xml = _cc.compile_spec_to_ooxml_slide(
            spec,
            f"[Slide {slide_num:02d}/{total_slides:02d} • {layer}]",
            hlink_rid="rId10",
        )
        ooxml_icon_shapes = slide_xml.count('name="ico_')
        out[kind] = {
            "id": f"{slug}-{kind}",
            "publicId": public_id,
            "kind": kind,
            "layer": layer,
            "figureNum": fig_num,
            "slide": slide_num,
            "title": title_str,
            "label": title_str,
            "vertexCount": xml.count('vertex="1"'),
            "edgeCount": xml.count('edge="1"'),
            "xml": xml,
            "svg": svg,
            "viewerUrl": url,
            "iconCount": icons,
            "ooxmlIconShapes": ooxml_icon_shapes,
            "geometry": geom,
            "ooxmlSlideXml": slide_xml,
            "drawioPath": f"diagrams/{slug}-{kind}.drawio",
            "svgPath": f"diagrams/{slug}-{kind}.svg",
        }
    return out
