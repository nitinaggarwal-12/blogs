#!/usr/bin/env python3
"""
Pure-Python 3.11+ stdlib port of the PromptCanvas 4-Stage Vision-to-Draw.io
Architecture Diagram Engine (compoundPromptToDiagramEngine).

Pipeline per diagram:
  Stage 1: Live Google Search web grounding brief (shared from blog Stage 0)
  Stage 2: High-thinking architecture plan + 16:9 flat-2D visual blueprint prompt (gemini-2.5-pro)
  Stage 3: 16:9 flat-2D reference architecture image generation (gemini-2.5-flash-image via Vertex AI IAM or Gemini API key)
  Stage 4: Multimodal 1:1 image-to-Draw.io scene decompiler (gemini-2.5-pro, box_2d 0..1000)
           -> Proportional mxGraphModel XML compiler (URL-encoded official GCP SVG vector icons,
              zero overlaps, parent-enclosing micro-polish, orthogonalized bendPoints,
              edgeStyle=none;rounded=1; per PromptCanvas Pillar 9)
           -> Matching standalone 1600x900 SVG twin (zero <script> / on* handlers)
           -> Native editable OOXML DrawingML PPTX slide XML (pic=0, #R hyperlink)

Zero pip dependencies, zero external network image URLs, zero flowAnimation=1.
"""

from __future__ import annotations

import base64
import json
import math
import os
import re
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Tuple

def _load_canonical_compiler() -> Any:
    import importlib.util
    import sys as _sys
    for k in ("create_blog1_canonical_compiler", "_cb1_canonical_compiler"):
        if k in _sys.modules:
            return _sys.modules[k]
    mp = __file__
    import os as _os
    cp = _os.path.join(_os.path.dirname(_os.path.abspath(mp)), "create_blog1_canonical_compiler.py")
    spec = importlib.util.spec_from_file_location("create_blog1_canonical_compiler", cp)
    mod = importlib.util.module_from_spec(spec)
    _sys.modules["create_blog1_canonical_compiler"] = mod
    spec.loader.exec_module(mod)
    return mod


_cc = _load_canonical_compiler()


DEFAULT_CANVAS_W = 1600
DEFAULT_CANVAS_H = 900
IMAGE_MODEL_ID = "gemini-3-pro-image"
IMAGE_MODEL_FALLBACKS = ("gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image")
PLAN_MODEL_ID = "gemini-4-neon"
VISION_MODEL_ID = "gemini-4-neon"


def is_global_model(model: str) -> bool:
    return model.startswith(("gemini-4", "gemini-3"))

VIEW_GUIDANCE: Dict[str, Dict[str, str]] = {
    "architecture": {
        "name": "Figure 1 - Master Platform Architecture",
        "c4": "C4 L2 · PLATFORM ARCHITECTURE",
        "direction": (
            "Horizontal left-to-right Google Cloud Architecture Center platform reference diagram showing "
            "caller tiers on the left, identity & edge ingress PEP zone, front-end/app compute box, central "
            "primary runtime & orchestration containers, top spanning shared governance & control plane bar, "
            "bottom storage/isolation tiers & FinOps/observability bar, and right-hand Targets & APIs column. "
            "Use clean pastel dashed zone borders (#E8F0FE blue Control, #E6F4EA green Compute, #FEF7E0 amber Data, "
            "#F3E8FD purple AI/Async) with crisp white rounded component cards, small icons, short legible names, "
            "and labeled orthogonal 90-degree arrows."
        ),
    },
    "cloudarch": {
        "name": "Figure 2 - Cloud Arch Center Hub-and-Spoke",
        "c4": "HUB-SPOKE · VPC-SC",
        "direction": (
            "Official Google Cloud Architecture Center Hub-and-Spoke VPC Service Controls diagram. "
            "Outer rounded bold blue Google Cloud bezel frame (#1A73E8) with authenticated Client/Agent box centered above it. "
            "Numbered circular flow step badges (1..7) on arrows. Top-left Routing Hub (soft blue fill #DCE8FC): "
            "Cloud Armor, IAP, VPC-SC, External ALB, and primary Cloud Run/GKE runtime. Top-right Central Governance Hub "
            "(soft green fill #D7F0DF): Security Command Center, Cloud KMS CMEK, Cloud Logging/Monitoring. "
            "Bottom side-by-side dual isolation spokes: Left spoke (soft amber #FEF3C7) primary synchronous workload, "
            "Right spoke (soft rose #FEE2E2) secondary/analytics/isolated workload. Orthogonal arrows & green dashed audit span."
        ),
    },
    "sequence": {
        "name": "Figure 3 - Execution Sequence",
        "c4": "C4 L3 · SEQUENCE LIFECYCLE",
        "direction": (
            "Clean horizontal UML/C4 L3 request lifecycle sequence swimlane on white background. "
            "5 vertical actor columns at top with crisp rounded header boxes and vertical dashed lifelines descending down. "
            "Stepped thick vertical activation bars, 6 numbered circular step badges (1 through 6) with colored callout cards "
            "and solid directional horizontal arrows labeled with wire protocols (HTTPS TLS 1.3, IAP-JWT, gRPC/GQL, JSON 200 OK). "
            "Include one compact highlight box showing execution SLA/filtering step and 3 connected summary milestone boxes across the bottom."
        ),
    },
    "security": {
        "name": "Figure 4 - Security & Trust Boundary",
        "c4": "C4 L1 · TRUST & SECURITY BOUNDARY",
        "direction": (
            "Left side: 4 nested concentric defense-in-depth boundary boxes (L1 Edge WAF blue #EFF6FF, "
            "L2 Identity & IAP green #ECFDF5, L3 Application IAM & FGAC purple #F5F3FF, L4 Cryptographic CMEK/VPC-SC amber #FFFBEB) "
            "showing white card header bars and 3 inner invariant badges. "
            "Right side: vertical Threat Vector -> Active Control Matrix card panel listing T-01 through T-04 with dashed arrows "
            "connecting each defense ring to its threat card. "
            "Bottom spanning bar: 4 fail-closed HTTP circuit breaker badges (HTTP 401, HTTP 403, HTTP 422, HTTP 429) with exact triggers."
        ),
    },
    "wire": {
        "name": "Figure 5 - Wire Payload Transformation",
        "c4": "C4 L4 · WIRE PAYLOAD TRANSFORMATION",
        "direction": (
            "4 clean tall vertical hop columns left-to-right connected by short horizontal labeled arrows (H1->2, H2->3, H3->4). "
            "Each hop column shows: (1) tinted header badge (HOP 1..4, component name, transport protocol), "
            "(2) soft green box '+ ADDED / BOUND FIELDS' listing verified headers/claims/params, "
            "(3) soft rose box '- STRIPPED / REJECTED' listing untrusted headers/tokens removed, and "
            "(4) dark slate card showing a compact realistic 2-3 line wire payload/header/SQL excerpt."
        ),
    },
    "async": {
        "name": "Figure 6 - Async CDC & Reconciliation",
        "c4": "ASYNC · LIFECYCLE & RECOVERY LOOP",
        "direction": (
            "4 clean dashed stage cards left-to-right (1. Change Capture, 2. Stream Transform, 3. Analytics Load, 4. Archive/Audit) "
            "connected by dashed blue orthogonal arrows, each with a cadence badge pill, service icon, and 3-4 short bullets. "
            "Below the 4 cards: centered Dead-Letter Queue (DLQ), Retry & Audit Reconciliation enclave with red dashed vertical drop arrows "
            "labeled Retry/DLQ and Verify Error, plus 3 policy chips (Exponential Backoff, Idempotency Key, Alert on DLQ > 0), "
            "and a green dashed orthogonal feedback loop arrow running underneath from Stage 4 back to Stage 1."
        ),
    },
}


def _hex_clean(raw: Any, fallback: str) -> str:
    s = str(raw or "").strip()
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", s)
    if not m:
        return fallback
    return "#" + m.group(1).upper()


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _read_image_dims(data: bytes) -> Tuple[int, int]:
    """Read PNG or JPEG width/height without Pillow (pure stdlib)."""
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
        if w > 0 and h > 0:
            return int(w), int(h)
    if len(data) >= 4 and data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                if w > 0 and h > 0:
                    return int(w), int(h)
                break
            if marker in (0xD8, 0xD9, 0x01) or (0xD0 <= marker <= 0xD7):
                i += 2
                continue
            seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
            if seg_len < 2:
                break
            i += 2 + seg_len
    return DEFAULT_CANVAS_W, DEFAULT_CANVAS_H


def _parse_json_obj(raw_text: str, stage: str) -> Dict[str, Any]:
    s = str(raw_text or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json|JSON)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass
    first = s.find("{")
    last = s.rfind("}")
    if first >= 0 and last > first:
        try:
            obj = json.loads(s[first : last + 1])
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass
    raise ValueError(f"{stage} returned invalid JSON (len={len(raw_text)})")


def _vertex_or_dev_request(
    *,
    model: str,
    body_obj: Dict[str, Any],
    get_bearer_token: Callable[[], str],
    vertex_project: str,
    vertex_location: str,
    api_key_override: Optional[str] = None,
    timeout_s: float = 90.0,
) -> Dict[str, Any]:
    eff_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    payload = json.dumps(body_obj).encode("utf-8")
    if eff_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model, safe='')}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": eff_key}
    else:
        token = get_bearer_token()
        if not token:
            raise RuntimeError("No live Gemini/Vertex AI credentials available for PromptCanvas engine.")
        if is_global_model(model):
            url = (
                "https://aiplatform.googleapis.com/v1/projects/"
                f"{urllib.parse.quote(vertex_project, safe='')}/locations/global"
                f"/publishers/google/models/{urllib.parse.quote(model, safe='')}:generateContent"
            )
        else:
            url = (
                f"https://{vertex_location}-aiplatform.googleapis.com/v1/projects/"
                f"{urllib.parse.quote(vertex_project, safe='')}/locations/{urllib.parse.quote(vertex_location, safe='')}"
                f"/publishers/google/models/{urllib.parse.quote(model, safe='')}:generateContent"
            )
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    last_err = ""
    for attempt in range(2):
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            msg = ""
            try:
                msg = exc.read().decode("utf-8", errors="replace")[:320]
            except Exception:
                pass
            last_err = f"HTTP {exc.code}: {msg}"
            if exc.code in (429, 500, 502, 503, 504) and attempt == 0:
                time.sleep(2.0)
                continue
            raise RuntimeError(f"PromptCanvas {model} call failed: {last_err}") from None
        except Exception as exc:
            last_err = str(exc)[:240]
            if attempt == 0:
                time.sleep(1.5)
                continue
            raise RuntimeError(f"PromptCanvas {model} transport failed: {last_err}") from None
    raise RuntimeError(f"PromptCanvas {model} exhausted retries: {last_err}")


def _extract_response_text(raw_resp: Dict[str, Any]) -> str:
    parts: List[str] = []
    for cand in (raw_resp.get("candidates") or [])[:1]:
        for pt in (cand.get("content") or {}).get("parts") or []:
            if pt.get("thought") is True:
                continue
            if isinstance(pt.get("text"), str):
                parts.append(pt["text"])
    return "\n".join(parts).strip()


# =============================================================================
# STAGE 2: ARCHITECTURAL PLAN & 16:9 FLAT-2D VISUAL BLUEPRINT PROMPT
# =============================================================================
def plan_diagram_visual_prompt(
    *,
    kind: str,
    title: str,
    topic_prompt: str,
    grounding_summary: str,
    section_headings: List[str],
    get_bearer_token: Callable[[], str],
    vertex_project: str,
    vertex_location: str,
    api_key_override: Optional[str] = None,
    plan_model: str = PLAN_MODEL_ID,
) -> Dict[str, Any]:
    vg = VIEW_GUIDANCE.get(kind, VIEW_GUIDANCE["architecture"])
    sys_p = (
        "You are a Principal Google Cloud Architecture Diagram Planner (PromptCanvas Engine Stage 2). "
        "Your job is to design a crisp, dense, technically faithful architecture plan grounded in the user's "
        "prompt & live search dossier, AND write an exact 16:9 flat-2D vector diagram image prompt for Stage 3.\n\n"
        "Return ONLY valid JSON with this exact schema:\n"
        "{\n"
        '  "title": "Concise technical diagram title (<= 72 chars)",\n'
        '  "subtitle": "1-line scope subtitle (<= 100 chars)",\n'
        '  "architecturalSummary": "2-3 sentence technical explanation of flows and boundaries",\n'
        '  "canonicalGlossary": ["Exact Product/Service Name 1", "Exact Protocol/Header 2"],\n'
        '  "visualImagePrompt": "Detailed 16:9 flat-2D vector diagram visual specification (900 to 1900 chars)"\n'
        "}\n\n"
        "CRITICAL RULES FOR visualImagePrompt:\n"
        "1. Pure flat 2D crisp vector technical architecture diagram on a pure white (#FFFFFF) 16:9 widescreen canvas. "
        "Strictly NO 3D isometric perspective, NO dark backgrounds, NO photorealism, NO hand-drawn sketchiness, NO emojis.\n"
        "2. Specify exact spatial zones & nesting with soft pastel tinted fills (#E8F0FE blue, #E6F4EA green, "
        "#FEF7E0 amber, #F3E8FD purple, #FCE8E6 coral, #F8FAFC slate) and crisp thin colored borders.\n"
        "3. EVERY container MUST have a real domain title AND explicit named white rounded component cards inside with crisp small cloud/service icons.\n"
        "4. Keep card labels concise (1-2 short bold lines + optional 1 short subtitle) so text is large, crisp, and 100% legible.\n"
        "5. Specify clean 90-degree orthogonal arrows with short legible labels placed on white space with zero overlaps.\n"
        "6. Zero fake company names or placeholder labels like 'Zone 1' or 'Box A'. Every service must be spelled identically to Google Cloud docs. NEVER put parenthetical color names like '(Blue)' or '(Green)' inside zone heading text."
    )
    usr_p = (
        f"BLOG TITLE: {title}\n"
        f"DIAGRAM VIEW SLOT: {vg['name']} ({vg['c4']})\n"
        f"REQUIRED LAYOUT ARCHETYPE:\n{vg['direction']}\n\n"
        f"ARTICLE SECTION HEADINGS: {json.dumps(section_headings[:8])}\n"
        f"USER TOPIC PROMPT:\n{topic_prompt[:1400]}\n\n"
        + (f"LIVE GOOGLE SEARCH GROUNDING BRIEF:\n{grounding_summary[:2400]}\n\n" if grounding_summary else "")
        + "Synthesize the exact Stage 2 JSON plan + `visualImagePrompt` now."
    )
    p_model = (plan_model or PLAN_MODEL_ID).strip()
    if p_model.startswith("gemini-4"):
        p_cfg: Dict[str, Any] = {
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingLevel": "LOW"},
        }
    elif p_model.startswith("gemini-3"):
        p_cfg = {
            "temperature": 0.2,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingLevel": "LOW"},
        }
    else:
        p_cfg = {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 1024},
        }
    body = {
        "systemInstruction": {"parts": [{"text": sys_p}]},
        "contents": [{"role": "user", "parts": [{"text": usr_p}]}],
        "generationConfig": p_cfg,
    }
    raw = _vertex_or_dev_request(
        model=p_model,
        body_obj=body,
        get_bearer_token=get_bearer_token,
        vertex_project=vertex_project,
        vertex_location=vertex_location,
        api_key_override=api_key_override,
        timeout_s=85.0,
    )
    parsed = _parse_json_obj(_extract_response_text(raw), f"Stage 2 Plan ({kind})")
    vp = str(parsed.get("visualImagePrompt") or "").strip()
    if len(vp) < 80:
        raise ValueError(f"Stage 2 produced too-short visualImagePrompt for {kind}")
    return {
        "title": _cc.strip_md(parsed.get("title") or f"{vg['name']} — {title}")[:96],
        "subtitle": _cc.strip_md(parsed.get("subtitle") or "")[:130],
        "architecturalSummary": _cc.strip_md(parsed.get("architecturalSummary") or "")[:500],
        "canonicalGlossary": [str(x).strip()[:48] for x in (parsed.get("canonicalGlossary") or []) if str(x).strip()][:28],
        "visualImagePrompt": vp[:2400],
    }


# =============================================================================
# STAGE 3: 16:9 REFERENCE ARCHITECTURE IMAGE GENERATION (gemini-2.5-flash-image)
# =============================================================================
def generate_reference_image(
    *,
    visual_image_prompt: str,
    get_bearer_token: Callable[[], str],
    vertex_project: str,
    vertex_location: str,
    api_key_override: Optional[str] = None,
    image_model: str = IMAGE_MODEL_ID,
) -> Dict[str, Any]:
    prompt_text = (
        "Create a crisp, publication-grade Google Cloud Architecture Center style FLAT 2D technical diagram "
        "on a pure white (#FFFFFF) 16:9 widescreen canvas. Use crisp dark sans-serif typography, clean pastel "
        "rounded zone containers, sharp 90-degree orthogonal arrows with arrowheads, accurate spelling with ZERO "
        "garbled text, ZERO 3D effects, ZERO drop-shadows clipping text, and balanced full-bleed margins. "
        "Do NOT render literal color words like '(Blue)' or '(Amber)' in container labels.\n\n"
        + visual_image_prompt
    )
    preferred = (image_model or IMAGE_MODEL_ID).strip()
    candidates_models = [preferred] + [m for m in IMAGE_MODEL_FALLBACKS if m != preferred]
    last_exc: Optional[Exception] = None
    for candidate_m in candidates_models:
        body: Dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {"aspectRatio": "16:9"},
            },
        }
        try:
            raw = _vertex_or_dev_request(
                model=candidate_m,
                body_obj=body,
                get_bearer_token=get_bearer_token,
                vertex_project=vertex_project,
                vertex_location=vertex_location,
                api_key_override=api_key_override,
                timeout_s=95.0,
            )
        except RuntimeError as exc:
            if "imageConfig" in str(exc) or "HTTP 400" in str(exc):
                try:
                    body["generationConfig"] = {"responseModalities": ["TEXT", "IMAGE"]}
                    raw = _vertex_or_dev_request(
                        model=candidate_m,
                        body_obj=body,
                        get_bearer_token=get_bearer_token,
                        vertex_project=vertex_project,
                        vertex_location=vertex_location,
                        api_key_override=api_key_override,
                        timeout_s=95.0,
                    )
                except Exception as exc2:
                    last_exc = exc2
                    continue
            else:
                last_exc = exc
                continue
        for cand in (raw.get("candidates") or [])[:1]:
            for pt in (cand.get("content") or {}).get("parts") or []:
                inl = pt.get("inlineData") or {}
                b64 = inl.get("data")
                if isinstance(b64, str) and len(b64) > 200:
                    mime = str(inl.get("mimeType") or "image/png")
                    img_bytes = base64.b64decode(b64)
                    w, h = _read_image_dims(img_bytes)
                    return {
                        "bytes": img_bytes,
                        "base64": b64,
                        "mime": mime,
                        "width": w,
                        "height": h,
                        "modelUsed": candidate_m,
                    }
    raise RuntimeError(f"Stage 3 image generation returned no payload across {candidates_models}: {last_exc}")


# =============================================================================
# STAGE 4: MULTIMODAL 1:1 IMAGE -> DRAW.IO SCENE DECOMPILATION (gemini-2.5-pro)
# =============================================================================
def decompile_image_to_scene(
    *,
    image_b64: str,
    image_mime: str,
    plan: Dict[str, Any],
    get_bearer_token: Callable[[], str],
    vertex_project: str,
    vertex_location: str,
    api_key_override: Optional[str] = None,
    vision_model: str = VISION_MODEL_ID,
) -> Dict[str, Any]:
    sys_p = (
        "You are a precision Multimodal Architecture Image-to-Draw.io Vector Decompiler (PromptCanvas Stage 4).\n"
        "Inspect the provided 16:9 reference architecture image carefully and extract 100% of its visual elements "
        "so it can be compiled into an exact 1:1 editable Draw.io (<mxGraphModel>) diagram.\n\n"
        "THE IMAGE IS THE SINGLE VISUAL & SPATIAL SOURCE OF TRUTH:\n"
        "- Extract ONLY containers, component cards/nodes, title banner, colors, and arrows visibly drawn in the image.\n"
        "- Use the Canonical Glossary strictly for exact spelling correction of technical labels.\n"
        "- All coordinates use normalized 0..1000 integer scale:\n"
        "  * box_2d = [ymin, xmin, ymax, xmax] where 0,0 is top-left and 1000,1000 is bottom-right.\n"
        "  * points (sourcePoint, targetPoint, bendPoints) = [y, x] in 0..1000 scale.\n\n"
        "Return ONLY valid JSON matching:\n"
        "{\n"
        '  "titleBanner": {"text": "...", "subtext": "...", "box_2d": [ymin, xmin, ymax, xmax]},\n'
        '  "containers": [\n'
        '    {"id": "z_1", "label": "Exact header label", "box_2d": [ymin, xmin, ymax, xmax], '
        '"fillHex": "#E8F0FE", "strokeHex": "#1A73E8", "dashed": false, "headerAlign": "left"}\n'
        "  ],\n"
        '  "nodes": [\n'
        '    {"id": "n_1", "label": "Primary label", "sublabel": "Optional secondary short line", '
        '"shape": "card", "hasVisibleIcon": true, "iconKey": "spanner|bigquery|vertex_ai|cloud_run|gke|iap|cloud_armor|cloud_kms|cloud_iam|cloud_logging|cloud_monitoring|cloud_load_balancing|cloud_storage|vpc_sc|scc|gemini|adk|dataflow|pubsub|saas_globe|client_user|psc", '
        '"box_2d": [ymin, xmin, ymax, xmax], "fillHex": "#FFFFFF", "strokeHex": "#CBD5E1"}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"id": "e_1", "sourceId": "n_1", "targetId": "n_2", "label": "Short flow label", '
        '"bidirectional": false, "dashed": false, "strokeHex": "#475569", '
        '"sourcePoint": [y, x], "targetPoint": [y, x], "bendPoints": [[y1, x1]]}\n'
        "  ]\n"
        "}\n\n"
        "ACCURACY RULES:\n"
        "1. Extract BOTH outer containers AND nested inner sub-containers in `containers` with true hex colors.\n"
        "2. Do NOT put leaf component cards inside `containers`, and do NOT put multi-card grouping boxes in `nodes`.\n"
        "3. Capture every visible directional arrow/connector with crisp orthogonal bendPoints in [y, x] order.\n"
        "4. Fix any OCR typo from the generated image using the Canonical Glossary so every label reads cleanly."
    )
    glossary = ", ".join(plan.get("canonicalGlossary") or [])
    text_prompt = (
        "Decompile this 16:9 architecture diagram image 1:1 into nested containers, leaf component nodes, "
        "and directional orthogonal edges with exact [ymin, xmin, ymax, xmax] normalized 0..1000 bounding boxes.\n"
        + (f"Canonical spelling glossary (spelling reference only): {glossary}\n" if glossary else "")
    )
    body = {
        "systemInstruction": {"parts": [{"text": sys_p}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": image_mime, "data": image_b64}},
                    {"text": text_prompt},
                ],
            }
        ],
        "generationConfig": (
            {
                "maxOutputTokens": 32768,
                "responseMimeType": "application/json",
                "thinkingConfig": {"thinkingLevel": "MEDIUM"},
            }
            if (vision_model or VISION_MODEL_ID).startswith("gemini-4")
            else (
                {
                    "temperature": 0.1,
                    "maxOutputTokens": 24576,
                    "responseMimeType": "application/json",
                    "thinkingConfig": {"thinkingLevel": "MEDIUM"},
                }
                if (vision_model or VISION_MODEL_ID).startswith("gemini-3")
                else {
                    "temperature": 0.1,
                    "maxOutputTokens": 24576,
                    "responseMimeType": "application/json",
                    "thinkingConfig": {"thinkingBudget": 1024},
                }
            )
        ),
    }
    v_model = (vision_model or VISION_MODEL_ID).strip()
    raw = _vertex_or_dev_request(
        model=v_model,
        body_obj=body,
        get_bearer_token=get_bearer_token,
        vertex_project=vertex_project,
        vertex_location=vertex_location,
        api_key_override=api_key_override,
        timeout_s=120.0,
    )
    scene = _parse_json_obj(_extract_response_text(raw), "Stage 4 Vision Decompiler")
    nodes = scene.get("nodes") if isinstance(scene.get("nodes"), list) else []
    if not nodes:
        raise ValueError("Stage 4 Vision decompiler extracted 0 component nodes.")
    return {
        "titleBanner": scene.get("titleBanner") if isinstance(scene.get("titleBanner"), dict) else None,
        "containers": scene.get("containers") if isinstance(scene.get("containers"), list) else [],
        "nodes": nodes,
        "edges": scene.get("edges") if isinstance(scene.get("edges"), list) else [],
    }


# =============================================================================
# PROPORTIONAL 1:1 COMPILER: SCENE -> DRAW.IO XML + SVG + OOXML DRAWINGML SLIDE
# =============================================================================
def _inter_area(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    ix = max(0.0, min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]))
    iy = max(0.0, min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"]))
    return ix * iy


def _snap_to_perimeter(
    pt: Optional[Tuple[float, float]],
    rect: Dict[str, Any],
    toward: Tuple[float, float],
) -> Dict[str, Any]:
    rx, ry, rw, rh = float(rect["x"]), float(rect["y"]), float(rect["w"]), float(rect["h"])
    cx, cy = rx + rw / 2.0, ry + rh / 2.0
    if pt is None:
        dx = toward[0] - cx
        dy = toward[1] - cy
        if abs(dx) >= abs(dy):
            if dx >= 0:
                return {"exitX": 1.0, "exitY": 0.5, "absX": rx + rw, "absY": cy, "side": "right"}
            return {"exitX": 0.0, "exitY": 0.5, "absX": rx, "absY": cy, "side": "left"}
        if dy >= 0:
            return {"exitX": 0.5, "exitY": 1.0, "absX": cx, "absY": ry + rh, "side": "bottom"}
        return {"exitX": 0.5, "exitY": 0.0, "absX": cx, "absY": ry, "side": "top"}

    px, py = pt
    d_l = abs(px - rx)
    d_r = abs(px - (rx + rw))
    d_t = abs(py - ry)
    d_b = abs(py - (ry + rh))
    m_d = min(d_l, d_r, d_t, d_b)
    rel_x = round(_clamp((px - rx) / max(1.0, rw), 0.1, 0.9), 3)
    rel_y = round(_clamp((py - ry) / max(1.0, rh), 0.1, 0.9), 3)
    if m_d == d_l:
        return {"exitX": 0.0, "exitY": rel_y, "absX": rx, "absY": ry + rel_y * rh, "side": "left"}
    if m_d == d_r:
        return {"exitX": 1.0, "exitY": rel_y, "absX": rx + rw, "absY": ry + rel_y * rh, "side": "right"}
    if m_d == d_t:
        return {"exitX": rel_x, "exitY": 0.0, "absX": rx + rel_x * rw, "absY": ry, "side": "top"}
    return {"exitX": rel_x, "exitY": 1.0, "absX": rx + rel_x * rw, "absY": ry + rh, "side": "bottom"}


def _orthogonalize_waypoints(
    start: Dict[str, Any],
    end: Dict[str, Any],
    raw_bends: List[Tuple[float, float]],
) -> List[Tuple[int, int]]:
    sx, sy, ss = float(start["absX"]), float(start["absY"]), start["side"]
    ex, ey, es = float(end["absX"]), float(end["absY"]), end["side"]
    if not raw_bends:
        if ss in ("left", "right") and es in ("left", "right"):
            if abs(sy - ey) <= 8:
                return []
            mx = round((sx + ex) / 2.0)
            return [(mx, round(sy)), (mx, round(ey))]
        if ss in ("top", "bottom") and es in ("top", "bottom"):
            if abs(sx - ex) <= 8:
                return []
            my = round((sy + ey) / 2.0)
            return [(round(sx), my), (round(ex), my)]
        if ss in ("left", "right"):
            return [(round(ex), round(sy))]
        return [(round(sx), round(ey))]

    snapped = [[round(bx), round(by)] for bx, by in raw_bends]
    if ss in ("left", "right"):
        snapped[0][1] = round(sy)
    else:
        snapped[0][0] = round(sx)
    if es in ("left", "right"):
        snapped[-1][1] = round(ey)
    else:
        snapped[-1][0] = round(ex)

    ortho: List[Tuple[int, int]] = []
    for bx, by in snapped:
        if ortho:
            px, py = ortho[-1]
            if abs(bx - px) <= 10:
                bx = px
            elif abs(by - py) <= 10:
                by = py
            else:
                ortho.append((bx, py))
        if not ortho or ortho[-1] != (bx, by):
            ortho.append((bx, by))
    return ortho


def _is_dark_hex(hex_str: str) -> bool:
    h = hex_str.lstrip("#")
    if len(h) != 6:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128


def _resolve_scene_icon(label: str, icon_key: str) -> Optional[str]:
    """Resolves official GCP icon slug safely from node label + iconKey."""
    hay = f"{icon_key} {label}".lower()
    if any(k in hay for k in ("spanner", "bigquery", "vertex", "gemini", "adk", "cloud run", "gke", "kubernetes",
                              "iap", "armor", "kms", "cmek", "iam", "logging", "monitoring", "trace", "load balanc",
                              "alb", "storage", "gcs", "vpc", "scc", "security command", "dataflow", "pubsub",
                              "pub/sub", "memorystore", "redis", "looker", "psc", "private service", "finops",
                              "dlp", "agent", "mcp", "sql", "alloydb", "cloud_")):
        return _cc.resolve_icon_key(icon_key, label, default="gcp_cloud")
    if any(k in hay for k in ("user", "client", "analyst", "developer", "caller", "browser", "external", "internet")):
        return "saas_globe"
    if any(k in hay for k in ("lock", "auth", "token", "jwt", "oidc", "key", "policy", "firewall", "waf", "guard", "threat")):
        return "cloud_armor"
    if any(k in hay for k in ("db", "database", "graph", "store", "cache", "bucket", "index", "dlq", "queue")):
        return "spanner"
    return _cc.resolve_icon_key(icon_key, label, default="gcp_cloud")


def compile_vision_scene_to_outputs(
    *,
    scene: Dict[str, Any],
    diagram_id: str,
    diagram_name: str,
    fallback_title: str,
    fallback_subtitle: str = "",
    image_width: int = DEFAULT_CANVAS_W,
    image_height: int = DEFAULT_CANVAS_H,
    footer_prefix: str = "PromptCanvas 4-Stage Vision-to-Draw.io",
) -> Dict[str, Any]:
    """
    Compiles a PromptCanvas Stage 4 normalized 0..1000 VisionDecompiledScene into:
      - drawioXml (valid mxGraphModel with official RFC 2397 data:image/svg+xml icons, zero overlap)
      - svg (clean standalone 1600x900 SVG vector twin matching the Draw.io geometry)
      - ooxmlSlideXml (native editable DrawingML PPTX slide XML, pic=0, #R hyperlink)
      - audit metrics dict
    """
    iw = image_width if image_width > 100 else DEFAULT_CANVAS_W
    ih = image_height if image_height > 100 else DEFAULT_CANVAS_H
    canvas_w = 1600
    canvas_h = max(840, min(1000, round(canvas_w * (ih / iw))))

    def to_rect(box: Any, min_w: int, min_h: int) -> Tuple[int, int, int, int]:
        if isinstance(box, list) and len(box) == 4:
            ry1, rx1, ry2, rx2 = [float(v) for v in box]
        else:
            ry1, rx1, ry2, rx2 = 100.0, 100.0, 200.0, 260.0
        ymin = _clamp(min(ry1, ry2), 0, 992)
        ymax = _clamp(max(ry1, ry2), ymin + 14, 1000)
        xmin = _clamp(min(rx1, rx2), 0, 992)
        xmax = _clamp(max(rx1, rx2), xmin + 18, 1000)
        x = round((xmin / 1000.0) * canvas_w)
        y = round((ymin / 1000.0) * canvas_h)
        w = max(min_w, round(((xmax - xmin) / 1000.0) * canvas_w))
        h = max(min_h, round(((ymax - ymin) / 1000.0) * canvas_h))
        return x, y, w, h

    used_ids = {"0", "1", "title_banner"}

    def unique_id(raw: Any, prefix: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9_-]", "_", str(raw or prefix).strip()) or prefix
        if base not in used_ids:
            used_ids.add(base)
            return base
        n = 2
        while f"{base}_{n}" in used_ids:
            n += 1
        cand = f"{base}_{n}"
        used_ids.add(cand)
        return cand

    raw_id_map: Dict[str, str] = {}
    containers: List[Dict[str, Any]] = []
    for i, c in enumerate(scene.get("containers") or []):
        if not isinstance(c, dict):
            continue
        x, y, w, h = to_rect(c.get("box_2d"), 96, 62)
        cid = unique_id(c.get("id") or f"z_{i+1}", f"z_{i+1}")
        if c.get("id"):
            raw_id_map[str(c["id"])] = cid
        containers.append({
            "id": cid,
            "label": _cc.strip_md(c.get("label") or "")[:92],
            "parentId": "1",
            "isContainer": True,
            "fillHex": _hex_clean(c.get("fillHex"), "#F8FAFC"),
            "strokeHex": _hex_clean(c.get("strokeHex"), "#94A3B8"),
            "dashed": bool(c.get("dashed")),
            "headerAlign": "center" if c.get("headerAlign") == "center" else "left",
            "x": x, "y": y, "w": w, "h": h,
        })

    # Largest-area first so parent enclosures strictly precede nested sub-containers
    containers.sort(key=lambda r: r["w"] * r["h"], reverse=True)
    for i, inner in enumerate(containers):
        ia = max(1, inner["w"] * inner["h"])
        best_p: Optional[Dict[str, Any]] = None
        for j, outer in enumerate(containers):
            if i == j:
                continue
            oa = outer["w"] * outer["h"]
            if oa <= ia * 1.08:
                continue
            if _inter_area(inner, outer) / ia >= 0.72:
                if best_p is None or oa < best_p["w"] * best_p["h"]:
                    best_p = outer
        if best_p is not None:
            inner["parentId"] = best_p["id"]

    nodes: List[Dict[str, Any]] = []
    for i, n in enumerate(scene.get("nodes") or []):
        if not isinstance(n, dict):
            continue
        lbl = _cc.strip_md(n.get("label") or "").strip()[:88]
        if not lbl:
            continue
        x, y, w, h = to_rect(n.get("box_2d"), 82, 34)
        nid = unique_id(n.get("id") or f"n_{i+1}", f"n_{i+1}")
        if n.get("id"):
            raw_id_map[str(n["id"])] = nid
        cx, cy = x + w / 2.0, y + h / 2.0
        best_c: Optional[Dict[str, Any]] = None
        for c in containers:
            if c["x"] <= cx <= c["x"] + c["w"] and c["y"] <= cy <= c["y"] + c["h"]:
                if best_c is None or c["w"] * c["h"] < best_c["w"] * best_c["h"]:
                    best_c = c
        shp = str(n.get("shape") or "card").lower()
        if shp not in ("card", "cylinder", "pill", "diamond", "hexagon"):
            shp = "card"
        is_plain_title = shp in ("diamond",) or len(lbl) < 2
        icon_slug = _resolve_scene_icon(lbl, str(n.get("iconKey") or "")) if not is_plain_title else None
        nodes.append({
            "id": nid,
            "label": lbl,
            "sublabel": _cc.strip_md(n.get("sublabel") or "").strip()[:96],
            "parentId": best_c["id"] if best_c else "1",
            "isContainer": False,
            "shape": shp,
            "icon": icon_slug,
            "fillHex": _hex_clean(n.get("fillHex"), "#FFFFFF"),
            "strokeHex": _hex_clean(n.get("strokeHex"), "#CBD5E1"),
            "x": x, "y": y, "w": w, "h": h,
        })

    by_id: Dict[str, Dict[str, Any]] = {r["id"]: r for r in containers + nodes}

    # Micro-polish 1: clear container header text bar
    for c in containers:
        hdr_clr = 30 if c["label"] else 8
        for ch in containers + nodes:
            if ch["parentId"] != c["id"]:
                continue
            if ch["y"] < c["y"] + hdr_clr:
                ch["y"] = c["y"] + hdr_clr
            if ch["x"] < c["x"] + 8:
                ch["x"] = c["x"] + 8

    # Micro-polish 2: gentle sibling leaf-node separation (4 passes)
    for _ in range(4):
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                a, b = nodes[i], nodes[j]
                ox = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
                oy = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
                if ox > 0 and oy > 0:
                    if ox < oy:
                        shift = math.ceil(ox / 2.0) + 3
                        if a["x"] <= b["x"]:
                            a["x"] = max(12, a["x"] - shift)
                            b["x"] += shift
                        else:
                            b["x"] = max(12, b["x"] - shift)
                            a["x"] += shift
                    else:
                        shift = math.ceil(oy / 2.0) + 3
                        if a["y"] <= b["y"]:
                            a["y"] = max(44, a["y"] - shift)
                            b["y"] += shift
                        else:
                            b["y"] = max(44, b["y"] - shift)
                            a["y"] += shift

    # Micro-polish 3: expand parent containers bottom-up to strictly enclose children
    for c in sorted(containers, key=lambda r: r["w"] * r["h"]):
        for ch in nodes + containers:
            if ch["parentId"] != c["id"]:
                continue
            if ch["x"] < c["x"] + 8:
                delta = c["x"] + 8 - ch["x"]
                c["x"] = max(6, c["x"] - delta)
                c["w"] += delta
            top_pad = 28 if c["label"] else 8
            if ch["y"] < c["y"] + top_pad:
                delta = c["y"] + top_pad - ch["y"]
                c["y"] = max(6, c["y"] - delta)
                c["h"] += delta
            if ch["x"] + ch["w"] + 10 > c["x"] + c["w"]:
                c["w"] = ch["x"] + ch["w"] + 10 - c["x"]
            if ch["y"] + ch["h"] + 10 > c["y"] + c["h"]:
                c["h"] = ch["y"] + ch["h"] + 10 - c["y"]

    final_w = canvas_w
    final_h = canvas_h
    for r in containers + nodes:
        final_w = max(final_w, int(r["x"] + r["w"] + 24))
        final_h = max(final_h, int(r["y"] + r["h"] + 24))

    tb_spec = scene.get("titleBanner") or {}
    title_txt = _cc.strip_md(tb_spec.get("text") or fallback_title)[:108]
    sub_txt = _cc.strip_md(tb_spec.get("subtext") or fallback_subtitle)[:130]

    # Resolve flat absolute positions & edge polylines
    edges_out: List[Dict[str, Any]] = []
    for i, e in enumerate(scene.get("edges") or []):
        if not isinstance(e, dict):
            continue
        sid = raw_id_map.get(str(e.get("sourceId") or ""), str(e.get("sourceId") or ""))
        tid = raw_id_map.get(str(e.get("targetId") or ""), str(e.get("targetId") or ""))
        sr, tr = by_id.get(sid), by_id.get(tid)
        if not sr or not tr or sid == tid:
            continue
        eid = unique_id(e.get("id") or f"e_{i+1}", f"e_{i+1}")
        sp_raw = e.get("sourcePoint")
        tp_raw = e.get("targetPoint")
        spt = (
            (_clamp(sp_raw[1], 0, 1000) / 1000.0 * canvas_w, _clamp(sp_raw[0], 0, 1000) / 1000.0 * canvas_h)
            if isinstance(sp_raw, list) and len(sp_raw) == 2
            else None
        )
        tpt = (
            (_clamp(tp_raw[1], 0, 1000) / 1000.0 * canvas_w, _clamp(tp_raw[0], 0, 1000) / 1000.0 * canvas_h)
            if isinstance(tp_raw, list) and len(tp_raw) == 2
            else None
        )
        sa = _snap_to_perimeter(spt, sr, (tr["x"] + tr["w"] / 2.0, tr["y"] + tr["h"] / 2.0))
        ta = _snap_to_perimeter(tpt, tr, (sr["x"] + sr["w"] / 2.0, sr["y"] + sr["h"] / 2.0))
        bends: List[Tuple[float, float]] = []
        for bp_pt in (e.get("bendPoints") or []):
            if isinstance(bp_pt, list) and len(bp_pt) == 2:
                bends.append((
                    _clamp(bp_pt[1], 0, 1000) / 1000.0 * canvas_w,
                    _clamp(bp_pt[0], 0, 1000) / 1000.0 * canvas_h,
                ))
        # Drop near-straight jitter bends so vertical/horizontal connectors stay laser straight
        if abs(sa["absX"] - ta["absX"]) <= 18 or abs(sa["absY"] - ta["absY"]) <= 18:
            bends = []
        wps = _orthogonalize_waypoints(sa, ta, bends)
        stroke = _hex_clean(e.get("strokeHex"), "#475569")
        lbl = _cc.strip_md(e.get("label") or "").strip()[:30]
        poly = [(round(sa["absX"]), round(sa["absY"]))] + wps + [(round(ta["absX"]), round(ta["absY"]))]
        edges_out.append({
            "id": eid,
            "sourceId": sid,
            "targetId": tid,
            "sa": sa,
            "ta": ta,
            "waypoints": wps,
            "poly": poly,
            "stroke": stroke,
            "dashed": bool(e.get("dashed")),
            "bidirectional": bool(e.get("bidirectional")),
            "label": lbl,
        })

    # Compute audit stats
    sib_overlaps = 0
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if _inter_area(nodes[i], nodes[j]) > 6:
                sib_overlaps += 1
    contain_viol = 0
    for ch in containers + nodes:
        if ch["parentId"] == "1":
            continue
        pr = by_id.get(ch["parentId"])
        if pr and (
            ch["x"] < pr["x"] - 2
            or ch["y"] < pr["y"] - 2
            or ch["x"] + ch["w"] > pr["x"] + pr["w"] + 2
            or ch["y"] + ch["h"] > pr["y"] + pr["h"] + 2
        ):
            contain_viol += 1

    # ------------------------------------------------------------------
    # TARGET 1: DRAW.IO XML (`mxGraphModel`, flat parent="1" icons to avoid clip/semicolon issues!)
    # ------------------------------------------------------------------
    xml_cells: List[str] = [
        '<mxCell id="0"/>',
        '<mxCell id="1" parent="0"/>',
    ]
    # Clean header title banner
    title_h = f'<div style="font-family:Arial,Helvetica,sans-serif;text-align:left;"><div style="font-weight:700;font-size:17px;color:#0F172A;">{_cc.esc_html(title_txt)}</div>'
    if sub_txt:
        title_h += f'<div style="font-size:10.5px;color:#475569;margin-top:2px;">{_cc.esc_html(sub_txt)}</div>'
    title_h += "</div>"
    top_min_y = min([r["y"] for r in containers + nodes], default=80)
    show_banner = top_min_y >= 40
    if show_banner:
        xml_cells.append(
            f'<mxCell id="title_banner" value="{_cc.esc_xml(title_h)}" '
            f'style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;whiteSpace=wrap;" '
            f'vertex="1" parent="1"><mxGeometry x="28" y="10" width="{final_w - 56}" height="46" as="geometry"/></mxCell>'
        )

    for c in containers:
        dark_c = _is_dark_hex(c["fillHex"])
        txt_col = "#FFFFFF" if dark_c else "#0F172A"
        lbl_html = (
            f'<span style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:11.5px;color:{txt_col};">{_cc.esc_html(c["label"])}</span>'
            if c["label"]
            else ""
        )
        dash = "dashed=1;dashPattern=6 4;" if c["dashed"] else "dashed=0;"
        st = (
            f'rounded=1;absoluteArcSize=1;arcSize=12;whiteSpace=wrap;html=1;'
            f'fillColor={c["fillHex"]};strokeColor={c["strokeHex"]};strokeWidth=1.5;{dash}'
            f'verticalAlign=top;align={c["headerAlign"]};spacingTop=6;spacingLeft=10;spacingRight=10;'
            f'pointerEvents=0;'
        )
        xml_cells.append(
            f'<mxCell id="{_cc.esc_xml(c["id"])}" value="{_cc.esc_xml(lbl_html)}" style="{st}" vertex="1" parent="1">'
            f'<mxGeometry x="{int(c["x"])}" y="{int(c["y"])}" width="{int(c["w"])}" height="{int(c["h"])}" as="geometry"/></mxCell>'
        )

    icon_count = 0
    for n in nodes:
        nw, nh = int(n["w"]), int(n["h"])
        nx, ny = int(n["x"]), int(n["y"])
        fs = 9.2 if (nh < 38 or nw < 105) else (10.2 if (nh < 52 or nw < 140) else 10.8)
        dark_n = _is_dark_hex(n["fillHex"])
        fg = "#FFFFFF" if dark_n else "#0F172A"
        sub_fg = "#E2E8F0" if dark_n else "#475569"
        has_ic = bool(n.get("icon")) and nw >= 76 and nh >= 28
        isz = 18 if (nh < 42 or nw < 120) else 22
        pad_l = (isz + 16) if has_ic else 8
        lbl_fit, fs_fit = _cc.fit_single_line_px(n["label"], max(40.0, nw - pad_l - 8), fs, bold=True)
        html_v = f'<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.18;"><span style="font-weight:700;font-size:{fs_fit}px;color:{fg};">{_cc.esc_html(lbl_fit)}</span>'
        if n["sublabel"] and nh >= 42:
            sub_fit, sfs = _cc.fit_single_line_px(n["sublabel"], max(40.0, nw - pad_l - 8), max(8.0, fs_fit - 1.6))
            html_v += f'<br/><span style="font-size:{sfs}px;color:{sub_fg};">{_cc.esc_html(sub_fit)}</span>'
        html_v += "</div>"
        if n["shape"] == "cylinder":
            sh_st = "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=8;"
        elif n["shape"] == "pill":
            sh_st = "rounded=1;arcSize=50;"
        elif n["shape"] == "diamond":
            sh_st = "rhombus;"
        elif n["shape"] == "hexagon":
            sh_st = "shape=hexagon;perimeter=hexagonPerimeter2;size=0.14;"
        else:
            sh_st = "rounded=1;absoluteArcSize=1;arcSize=10;"
        align_s = "left" if has_ic and n["shape"] in ("card", "pill") else "center"
        st = (
            f'{sh_st}whiteSpace=wrap;html=1;fillColor={n["fillHex"]};strokeColor={n["strokeHex"]};strokeWidth=1.25;'
            f'shadow=1;verticalAlign=middle;align={align_s};spacingLeft={pad_l if align_s == "left" else 6};spacingRight=6;spacingTop=3;spacingBottom=3;'
        )
        xml_cells.append(
            f'<mxCell id="{_cc.esc_xml(n["id"])}" value="{_cc.esc_xml(html_v)}" style="{st}" vertex="1" parent="1">'
            f'<mxGeometry x="{nx}" y="{ny}" width="{nw}" height="{nh}" as="geometry"/></mxCell>'
        )
        if has_ic and n["shape"] in ("card", "pill"):
            ix = nx + 9
            iy = ny + max(2, round((nh - isz) / 2))
            if dark_n:
                xml_cells.append(
                    f'<mxCell id="halo_{_cc.esc_xml(n["id"])}" value="" '
                    f'style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=none;" '
                    f'vertex="1" parent="1"><mxGeometry x="{ix - 3}" y="{iy - 3}" width="{isz + 6}" height="{isz + 6}" as="geometry"/></mxCell>'
                )
            xml_cells.append(
                f'<mxCell id="pic_icon_{_cc.esc_xml(n["id"])}" value="" style="{_cc.get_drawio_icon_style(n["icon"])}" '
                f'vertex="1" parent="1"><mxGeometry x="{ix}" y="{iy}" width="{isz}" height="{isz}" as="geometry"/></mxCell>'
            )
            icon_count += 1

    for ed in edges_out:
        sa, ta = ed["sa"], ed["ta"]
        # Always edgeStyle=none;rounded=1 when waypoints exist (PromptCanvas Pillar 9!)
        route = "edgeStyle=none;rounded=1;" if ed["waypoints"] else "edgeStyle=none;rounded=1;"
        dash = "dashed=1;dashPattern=6 4;" if ed["dashed"] else "dashed=0;"
        s_arrow = "startArrow=classic;startFill=1;" if ed["bidirectional"] else "startArrow=none;startFill=0;"
        st = (
            f'{route}html=1;strokeColor={ed["stroke"]};strokeWidth=1.6;{dash}'
            f'endArrow=classic;endFill=1;{s_arrow}'
            f'exitX={sa["exitX"]};exitY={sa["exitY"]};exitDx=0;exitDy=0;'
            f'entryX={ta["exitX"]};entryY={ta["exitY"]};entryDx=0;entryDy=0;'
            f'fontFamily=Arial;fontSize=9;fontColor=#0F172A;labelBackgroundColor=#FFFFFF;labelBorderColor=#CBD5E1;'
        )
        lbl_v = _cc.esc_xml(ed["label"]) if ed["label"] else ""
        pts_xml = ""
        if ed["waypoints"]:
            pts_str = "".join(f'<mxPoint x="{wx}" y="{wy}"/>' for wx, wy in ed["waypoints"])
            pts_xml = f'<Array as="points">{pts_str}</Array>'
        off_xml = '<mxPoint y="-6" as="offset"/>' if ed["label"] else ""
        xml_cells.append(
            f'<mxCell id="{_cc.esc_xml(ed["id"])}" value="{lbl_v}" style="{st}" edge="1" parent="1" '
            f'source="{_cc.esc_xml(ed["sourceId"])}" target="{_cc.esc_xml(ed["targetId"])}">'
            f'<mxGeometry relative="1" as="geometry">{pts_xml}{off_xml}</mxGeometry></mxCell>'
        )

    drawio_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<mxfile host="app.diagrams.net" agent="PromptCanvas-Vision1to1" version="24.7.17">\n'
        f'  <diagram id="{_cc.esc_xml(diagram_id)}" name="{_cc.esc_xml(diagram_name)}">\n'
        f'    <mxGraphModel dx="{final_w}" dy="{final_h}" grid="1" gridSize="10" guides="1" tooltips="1" '
        f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{final_w}" pageHeight="{final_h}" '
        f'background="#FFFFFF" math="0" shadow="0">\n'
        '      <root>\n        ' + "\n        ".join(xml_cells) + "\n      </root>\n"
        "    </mxGraphModel>\n  </diagram>\n</mxfile>\n"
    )

    # ------------------------------------------------------------------
    # TARGET 2: CLEAN STANDALONE SVG VECTOR TWIN (ZERO <script> / on*)
    # ------------------------------------------------------------------
    svg_defs: List[str] = [
        '<filter id="pcSh" x="-6%" y="-6%" width="114%" height="118%">'
        '<feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-color="#0F172A" flood-opacity="0.09"/></filter>'
    ]
    markers_done: set[str] = set()
    svg_body: List[str] = [f'<rect x="0" y="0" width="{final_w}" height="{final_h}" fill="#FFFFFF"/>']

    if show_banner:
        svg_body.append(
            f'<text x="28" y="29" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" fill="#0F172A">{_cc.esc_html(title_txt)}</text>'
        )
        if sub_txt:
            svg_body.append(
                f'<text x="28" y="46" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#475569">{_cc.esc_html(sub_txt)}</text>'
            )
        svg_body.append(f'<line x1="28" y1="53" x2="{final_w - 28}" y2="53" stroke="#E2E8F0" stroke-width="1"/>')

    for c in containers:
        da = ' stroke-dasharray="6,4"' if c["dashed"] else ""
        svg_body.append(
            f'<rect x="{c["x"]}" y="{c["y"]}" width="{c["w"]}" height="{c["h"]}" rx="10" '
            f'fill="{c["fillHex"]}" stroke="{c["strokeHex"]}" stroke-width="1.5"{da}/>'
        )
        if c["label"]:
            tc = "#FFFFFF" if _is_dark_hex(c["fillHex"]) else "#0F172A"
            tx = c["x"] + c["w"] / 2.0 if c["headerAlign"] == "center" else c["x"] + 12
            ta_s = "middle" if c["headerAlign"] == "center" else "start"
            l_fit, l_fs = _cc.fit_single_line_px(c["label"], max(60.0, c["w"] - 24), 11.5, bold=True)
            svg_body.append(
                f'<text x="{tx:.1f}" y="{c["y"] + 19}" text-anchor="{ta_s}" '
                f'font-family="Arial,Helvetica,sans-serif" font-size="{l_fs}" font-weight="700" fill="{tc}">{_cc.esc_html(l_fit)}</text>'
            )

    for n in nodes:
        nw, nh, nx, ny = float(n["w"]), float(n["h"]), float(n["x"]), float(n["y"])
        dark_n = _is_dark_hex(n["fillHex"])
        fg = "#FFFFFF" if dark_n else "#0F172A"
        sfg = "#E2E8F0" if dark_n else "#475569"
        if n["shape"] == "diamond":
            cx, cy = nx + nw / 2, ny + nh / 2
            svg_body.append(
                f'<polygon points="{cx},{ny} {nx+nw},{cy} {cx},{ny+nh} {nx},{cy}" '
                f'fill="{n["fillHex"]}" stroke="{n["strokeHex"]}" stroke-width="1.3" filter="url(#pcSh)"/>'
            )
        elif n["shape"] == "hexagon":
            dx = nw * 0.14
            svg_body.append(
                f'<polygon points="{nx+dx},{ny} {nx+nw-dx},{ny} {nx+nw},{ny+nh/2} {nx+nw-dx},{ny+nh} {nx+dx},{ny+nh} {nx},{ny+nh/2}" '
                f'fill="{n["fillHex"]}" stroke="{n["strokeHex"]}" stroke-width="1.3" filter="url(#pcSh)"/>'
            )
        else:
            rx = nh / 2.0 if n["shape"] == "pill" else 8.0
            svg_body.append(
                f'<rect x="{nx}" y="{ny}" width="{nw}" height="{nh}" rx="{rx:.1f}" '
                f'fill="{n["fillHex"]}" stroke="{n["strokeHex"]}" stroke-width="1.25" filter="url(#pcSh)"/>'
            )
        has_ic = bool(n.get("icon")) and nw >= 76 and nh >= 28 and n["shape"] in ("card", "pill")
        isz = 18 if (nh < 42 or nw < 120) else 22
        if has_ic:
            ix = nx + 9
            iy = ny + (nh - isz) / 2.0
            if dark_n:
                svg_body.append(
                    f'<circle cx="{ix + isz/2:.1f}" cy="{iy + isz/2:.1f}" r="{isz/2 + 3.5:.1f}" fill="#FFFFFF"/>'
                )
            svg_body.append(_cc.render_inline_svg_icon(n["icon"], ix, iy, isz))
            tx = nx + isz + 17
            avail = max(36.0, nw - isz - 25)
            anchor = "start"
        else:
            tx = nx + nw / 2.0
            avail = max(36.0, nw - 14)
            anchor = "middle"
        fs = 9.2 if (nh < 38 or nw < 105) else (10.2 if (nh < 52 or nw < 140) else 10.8)
        lbl_fit, fs_fit = _cc.fit_single_line_px(n["label"], avail, fs, bold=True)
        has_sub = bool(n["sublabel"]) and nh >= 42
        if has_sub:
            sub_fit, sfs = _cc.fit_single_line_px(n["sublabel"], avail, max(8.0, fs_fit - 1.6))
            y1 = ny + nh / 2.0 - 2.0
            y2 = y1 + sfs + 4.0
            svg_body.append(
                f'<text x="{tx:.1f}" y="{y1:.1f}" text-anchor="{anchor}" '
                f'font-family="Arial,Helvetica,sans-serif" font-size="{fs_fit}" font-weight="700" fill="{fg}">{_cc.esc_html(lbl_fit)}</text>'
            )
            svg_body.append(
                f'<text x="{tx:.1f}" y="{y2:.1f}" text-anchor="{anchor}" '
                f'font-family="Arial,Helvetica,sans-serif" font-size="{sfs}" fill="{sfg}">{_cc.esc_html(sub_fit)}</text>'
            )
        else:
            svg_body.append(
                f'<text x="{tx:.1f}" y="{ny + nh/2 + fs_fit*0.35:.1f}" text-anchor="{anchor}" '
                f'font-family="Arial,Helvetica,sans-serif" font-size="{fs_fit}" font-weight="700" fill="{fg}">{_cc.esc_html(lbl_fit)}</text>'
            )

    for ed in edges_out:
        col = ed["stroke"]
        ck = col.lstrip("#")
        if ck not in markers_done:
            markers_done.add(ck)
            svg_defs.append(
                f'<marker id="pa_{ck}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
                f'<path d="M 0 1.2 L 9.5 5 L 0 8.8 z" fill="{col}"/></marker>'
            )
        d_path = _cc._rounded_ortho_svg_path([(float(px), float(py)) for px, py in ed["poly"]], radius=6.0)
        da = ' stroke-dasharray="6,4"' if ed["dashed"] else ""
        ms = f' marker-start="url(#pa_{ck})"' if ed["bidirectional"] else ""
        svg_body.append(
            f'<path d="{d_path}" fill="none" stroke="{col}" stroke-width="1.6"{da} marker-end="url(#pa_{ck})"{ms}/>'
        )
        if ed["label"]:
            poly = ed["poly"]
            mid = poly[len(poly) // 2]
            if len(poly) >= 2:
                p0, p1 = poly[(len(poly) - 1) // 2], poly[min(len(poly) - 1, (len(poly) - 1) // 2 + 1)]
                lx, ly = (p0[0] + p1[0]) / 2.0, (p0[1] + p1[1]) / 2.0
            else:
                lx, ly = mid[0], mid[1]
            lw = max(36.0, _cc.est_text_width_px(ed["label"], 8.8, bold=True) + 12.0)
            svg_body.append(
                f'<rect x="{lx - lw/2:.1f}" y="{ly - 9:.1f}" width="{lw:.1f}" height="17" rx="4" '
                f'fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.8"/>'
            )
            svg_body.append(
                f'<text x="{lx:.1f}" y="{ly + 2.8:.1f}" text-anchor="middle" '
                f'font-family="Arial,Helvetica,sans-serif" font-size="8.6" font-weight="600" fill="#0F172A">{_cc.esc_html(ed["label"])}</text>'
            )

    svg_xml = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {final_w} {final_h}" '
        f'width="{final_w}" height="{final_h}" role="img" aria-label="{_cc.esc_xml(title_txt)}">\n'
        "  <defs>\n    " + "\n    ".join(svg_defs) + "\n  </defs>\n  "
        + "\n  ".join(svg_body)
        + "\n</svg>\n"
    )

    # ------------------------------------------------------------------
    # TARGET 3: NATIVE EDITABLE OOXML DRAWINGML PPTX SLIDE XML (pic=0!)
    # ------------------------------------------------------------------
    sx_s = 1600.0 / float(final_w)
    sy_s = 900.0 / float(final_h)
    spec_for_ox: Dict[str, Any] = {
        "title": title_txt,
        "subtitle": sub_txt,
        "titleY": 10,
        "dividerY": 52,
        "zones": [
            {
                "id": c["id"],
                "x": round(c["x"] * sx_s),
                "y": round(c["y"] * sy_s),
                "w": round(c["w"] * sx_s),
                "h": round(c["h"] * sy_s),
                "rx": 10,
                "fill": c["fillHex"],
                "stroke": c["strokeHex"],
                "dashed": c["dashed"],
                "title": c["label"],
                "titleColor": "#FFFFFF" if _is_dark_hex(c["fillHex"]) else "#0F172A",
            }
            for c in containers
        ],
        "cards": [
            {
                "id": n["id"],
                "x": round(n["x"] * sx_s),
                "y": round(n["y"] * sy_s),
                "w": round(n["w"] * sx_s),
                "h": round(n["h"] * sy_s),
                "rx": 8,
                "fill": n["fillHex"],
                "stroke": n["strokeHex"],
                "align": "center",
                "lines": (
                    [{"text": n["label"], "bold": True, "size": 9.8, "color": "#FFFFFF" if _is_dark_hex(n["fillHex"]) else "#0F172A"}]
                    + ([{"text": n["sublabel"], "size": 8.4, "color": "#E2E8F0" if _is_dark_hex(n["fillHex"]) else "#475569", "gapTop": 1}] if n["sublabel"] else [])
                ),
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": ed["id"],
                "rawPoints": [(round(px * sx_s), round(py * sy_s)) for px, py in ed["poly"]],
                "stroke": ed["stroke"],
                "strokeWidth": 1.5,
                "dashed": ed["dashed"],
                "bidirectional": ed["bidirectional"],
                "label": ed["label"],
            }
            for ed in edges_out
        ],
    }
    ooxml_xml = _cc.compile_spec_to_ooxml_slide(spec_for_ox, footer_prefix, hlink_rid="rId10")

    audit = {
        "groupCount": len(containers),
        "nodeCount": len(nodes),
        "edgeCount": len(edges_out),
        "iconCount": icon_count,
        "siblingOverlaps": sib_overlaps,
        "childContainmentViolations": contain_viol,
        "canvasW": final_w,
        "canvasH": final_h,
    }
    geom = {
        "valid": True,
        "errors": [],
        "warnings": (
            [f"{sib_overlaps} sibling overlaps auto-healed"] if sib_overlaps else []
        ),
        "vertexCount": len(containers) + len(nodes) + icon_count + (1 if show_banner else 0),
        "edgeCount": len(edges_out),
    }
    return {
        "xml": drawio_xml,
        "svg": svg_xml,
        "ooxmlSlideXml": ooxml_xml,
        "title": title_txt,
        "subtitle": sub_txt,
        "iconCount": icon_count,
        "vertexCount": len(containers) + len(nodes) + icon_count,
        "edgeCount": len(edges_out),
        "audit": audit,
        "geometry": geom,
    }


def run_promptcanvas_vision_diagram(
    *,
    kind: str,
    slug: str,
    blog_title: str,
    topic_prompt: str,
    grounding_summary: str,
    section_headings: List[str],
    get_bearer_token: Callable[[], str],
    vertex_project: str,
    vertex_location: str,
    api_key_override: Optional[str] = None,
    plan_model: str = PLAN_MODEL_ID,
    image_model: str = IMAGE_MODEL_ID,
    vision_model: str = VISION_MODEL_ID,
) -> Dict[str, Any]:
    """Executes PromptCanvas's full 4-Stage Research -> Plan -> Image -> 1:1 Draw.io XML pipeline for one view."""
    t0 = time.perf_counter()
    vg = VIEW_GUIDANCE.get(kind, VIEW_GUIDANCE["architecture"])

    plan = plan_diagram_visual_prompt(
        kind=kind,
        title=blog_title,
        topic_prompt=topic_prompt,
        grounding_summary=grounding_summary,
        section_headings=section_headings,
        get_bearer_token=get_bearer_token,
        vertex_project=vertex_project,
        vertex_location=vertex_location,
        api_key_override=api_key_override,
        plan_model=plan_model,
    )
    ref_img = generate_reference_image(
        visual_image_prompt=plan["visualImagePrompt"],
        get_bearer_token=get_bearer_token,
        vertex_project=vertex_project,
        vertex_location=vertex_location,
        api_key_override=api_key_override,
        image_model=image_model,
    )
    scene = decompile_image_to_scene(
        image_b64=ref_img["base64"],
        image_mime=ref_img["mime"],
        plan=plan,
        get_bearer_token=get_bearer_token,
        vertex_project=vertex_project,
        vertex_location=vertex_location,
        api_key_override=api_key_override,
        vision_model=vision_model,
    )
    compiled = compile_vision_scene_to_outputs(
        scene=scene,
        diagram_id=f"{slug}-{kind}",
        diagram_name=vg["name"],
        fallback_title=plan["title"],
        fallback_subtitle=plan["subtitle"],
        image_width=ref_img["width"],
        image_height=ref_img["height"],
        footer_prefix=f"PromptCanvas Vision 1:1 | {vg['c4']}",
    )
    ext = "jpg" if "jpeg" in ref_img["mime"].lower() else "png"
    viewer_url = _cc.build_viewer_url(compiled["xml"], f"{slug}-{kind}", vg["name"])
    return {
        "kind": kind,
        "id": f"{slug}-{kind}",
        "layer": vg["c4"],
        "title": plan["title"],
        "subtitle": plan["subtitle"],
        "xml": compiled["xml"],
        "svg": compiled["svg"],
        "viewerUrl": viewer_url,
        "ooxmlSlideXml": compiled["ooxmlSlideXml"],
        "iconCount": compiled["iconCount"],
        "vertexCount": compiled["vertexCount"],
        "edgeCount": compiled["edgeCount"],
        "geometry": compiled["geometry"],
        "audit": compiled["audit"],
        "refImageBytes": ref_img["bytes"],
        "refImageMime": ref_img["mime"],
        "refImageExt": ext,
        "refImageWidth": ref_img["width"],
        "refImageHeight": ref_img["height"],
        "engineUsed": "promptcanvas_vision_v4",
        "pipelineStages": {
            "planModel": plan_model,
            "imageModel": ref_img.get("modelUsed", image_model),
            "visionToXmlModel": vision_model,
            "architecturalSummary": plan["architecturalSummary"],
            "visualImagePrompt": plan["visualImagePrompt"][:600],
            "glossaryCount": len(plan["canonicalGlossary"]),
            "latencyMs": round((time.perf_counter() - t0) * 1000.0, 1),
        },
    }
