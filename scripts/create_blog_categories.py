#!/usr/bin/env python3
"""
Blog Categories, Configurable Ordered Outline/Diagram Planner, Dynamic Slide Layout
Engine, and Fast Live Gemini Prompt Preflight (3-Option Triage) for Create Blog.
"""

from __future__ import annotations

import copy
from datetime import datetime, timezone
import re
import sys
from typing import Any, Callable, Dict, List, Optional, Tuple

sys.dont_write_bytecode = True

VALID_DIAGRAM_KINDS: Tuple[str, ...] = (
    "architecture",
    "concept",
    "cloudarch",
    "security",
    "sequence",
    "wire",
    "async",
)

DIAGRAM_KIND_META: Dict[str, Dict[str, str]] = {
    "architecture": {
        "kind": "architecture",
        "layer": "Reference Architecture • Platform & Plane Ownership",
        "defaultTitle": "Reference Platform Architecture & Plane Ownership (C4 L2)",
        "shortLabel": "Reference Architecture",
        "blueprintKey": "platformDiagram",
    },
    "concept": {
        "kind": "concept",
        "layer": "Micro-Concept • Core Mental Model & Invariant Lock",
        "defaultTitle": "Conceptual Mental Model & Invariant Lock",
        "shortLabel": "Concept Micro-View",
        "blueprintKey": "conceptDiagram",
    },
    "cloudarch": {
        "kind": "cloudarch",
        "layer": "Google Cloud Architecture Center • Hub-and-Spoke",
        "defaultTitle": "Cloud Architecture Center Hub-and-Spoke Blueprint",
        "shortLabel": "Cloud Arch Hub-Spoke",
        "blueprintKey": "cloudArchDiagram",
    },
    "security": {
        "kind": "security",
        "layer": "C4 L1 • Trust & Security Boundary",
        "defaultTitle": "Trust Perimeter & Security Boundary (C4 L1)",
        "shortLabel": "Trust Perimeter L1",
        "blueprintKey": "securityDiagram",
    },
    "sequence": {
        "kind": "sequence",
        "layer": "C4 L3 • Request Lifecycle Sequence",
        "defaultTitle": "Request Lifecycle Sequence (C4 L3)",
        "shortLabel": "Sequence L3",
        "blueprintKey": "sequenceDiagram",
    },
    "wire": {
        "kind": "wire",
        "layer": "C4 L4 • Wire Payload & Schema Transformation",
        "defaultTitle": "Wire-Protocol & Schema Transformation (C4 L4)",
        "shortLabel": "Wire Protocol L4",
        "blueprintKey": "wireDiagram",
    },
    "async": {
        "kind": "async",
        "layer": "Async Lifecycle • Export, Recovery & Audit Loop",
        "defaultTitle": "Async Lifecycle, Export & Recovery Loop",
        "shortLabel": "Async / Recovery Loop",
        "blueprintKey": "asyncDiagram",
    },
}

BLOG_CATEGORIES: List[Dict[str, Any]] = [
    {
        "id": "reference_architecture",
        "name": "Reference Architecture (Full Stack)",
        "shortName": "Reference Architecture",
        "badge": "L300–L400 • Full Blueprint",
        "description": "End-to-end Google Cloud reference architecture opening with the 5-hop Reference Platform Architecture & Plane Ownership map, followed by core invariants, hub-and-spoke topology, trust perimeter, request trace, wire locks, and starter Terraform + Python kit.",
        "defaultDomain": "Multi-Tenant Agentic AI",
        "defaultAudience": "Solutions Architects & Platform Engineers",
        "includeStarterCode": True,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Reference Platform Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Core Design Principle & Isolation Invariant Model", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Conceptual Mental Model & Core Isolation Invariants", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Cloud Network Topology & Hub-and-Spoke Isolation", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Google Cloud Reference Architecture (Hub-and-Spoke)", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "Identity, Authorization & Three-Layer Trust Perimeter", "enabled": True},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Three-Layer Identity & Trust Perimeter (C4 L1)", "enabled": True},
            {"id": "sec-5", "type": "section", "title": "End-to-End Fail-Closed Request Lifecycle", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "End-to-End Fail-Closed Request Trace (C4 L3)", "enabled": True},
            {"id": "sec-6", "type": "section", "title": "Wire-Level Context, Memory & Schema Locks", "enabled": True},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Scoped Context, Memory & Wire Locks (C4 L4)", "enabled": True},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle, Export & Recovery Loop", "enabled": False},
        ],
    },
    {
        "id": "pattern_tradeoff",
        "name": "Design Pattern & Trade-Off Guide",
        "shortName": "Pattern & Trade-Offs",
        "badge": "L200–L300 • Decision Guide",
        "description": "Structured comparison opening with the shared Reference Platform Architecture & Plane Ownership map, followed by selection criteria, cloud boundary delta, runtime sequence, and FinOps decision matrix.",
        "defaultDomain": "Multi-Tenant Agentic AI",
        "defaultAudience": "Solutions Architects & Platform Engineers",
        "includeStarterCode": False,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Reference Platform Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Workload Context & Selection Mental Model", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Pattern Trade-Off Mental Model & Selection Criteria", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Pattern Comparison Matrix & Cloud Boundary Delta", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Target Cloud Topology & Boundary Delta", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "Runtime Request Execution & Control-Plane Behavior", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "Control-Plane & Data Execution Comparison", "enabled": True},
            {"id": "sec-5", "type": "section", "title": "FinOps Economics, Quotas & Decision Matrix", "enabled": True},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Security Boundary (C4 L1)", "enabled": False},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Schema Transformation (C4 L4)", "enabled": False},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle & Migration Cutover Loop", "enabled": False},
        ],
    },
    {
        "id": "hands_on_runbook",
        "name": "Hands-On Build / Migration Runbook",
        "shortName": "Hands-On Runbook",
        "badge": "L300–L400 • Builder Guide",
        "description": "Step-by-step production deployment and zero-downtime migration runbook opening with the Target Reference Platform Architecture, followed by cloud topology, cutover sequence, rollback loop, and Terraform + Python starter kit.",
        "defaultDomain": "Serverless & Platform Eng",
        "defaultAudience": "Cloud Infrastructure & SRE",
        "includeStarterCode": True,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Target Reference Platform Architecture, Prerequisites & Quotas", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Cloud Network & VPC/PSC Deployment Topology", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Target Production Deployment Topology", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Step-by-Step Build & Dual-Write Configuration", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "Cutover & Runtime Verification Sequence", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "Security Guardrails, Smoke Tests & Parity Checks", "enabled": True},
            {"id": "sec-5", "type": "section", "title": "Deterministic Rollback & Day-2 Operations", "enabled": True},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Rollback, DLQ & Recovery Loop", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Migration Safety Invariant Lock", "enabled": False},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Security Boundary (C4 L1)", "enabled": False},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Schema Transformation (C4 L4)", "enabled": False},
        ],
    },
    {
        "id": "executive_brief",
        "name": "Executive / CISO Architecture Brief",
        "shortName": "Executive / CISO Brief",
        "badge": "L100–L200 • Lean Deck",
        "description": "Concise leadership briefing opening with the Executive Reference Platform Architecture & Plane Ownership map, followed by business operating guardrails, defense-in-depth compliance perimeter, TCO drivers, and a 90-day roadmap.",
        "defaultDomain": "AI Governance & Compliance",
        "defaultAudience": "Engineering Executives (VP / CTO)",
        "includeStarterCode": False,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Executive Reference Platform Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Business Imperative, Operating Model & Core Guardrails", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Executive Operating Model & Core Guardrails", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Governance, Compliance & Sovereign Perimeter", "enabled": True},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Defense-in-Depth Boundary", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "TCO, FinOps & 30-60-90 Day Adoption Roadmap", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Cloud Architecture Center Hub-and-Spoke Blueprint", "enabled": False},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "Request Lifecycle Sequence (C4 L3)", "enabled": False},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Schema Transformation (C4 L4)", "enabled": False},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle, Export & Recovery Loop", "enabled": False},
        ],
    },
    {
        "id": "security_deep_dive",
        "name": "Security & Incident Deep-Dive",
        "shortName": "Security Deep-Dive",
        "badge": "L300–L400 • Zero-Trust",
        "description": "Threat-driven security deep-dive opening with the Zero-Trust Reference Platform Architecture & Plane Ownership map, followed by disaggregated blast-radius invariants, layered perimeter controls, attack interception sequence, wire locks, and hardened IaC.",
        "defaultDomain": "Cloud Security & Zero Trust",
        "defaultAudience": "CISOs & Security Architects",
        "includeStarterCode": True,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Zero-Trust Reference Platform Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Threat Scenario & Disaggregated Blast-Radius Model", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Disaggregated Brain, Hands & Vault Invariant Lock", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Layered Trust Perimeter & Threat Matrix", "enabled": True},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Threat Control Matrix (C4 L1)", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "End-to-End Attack Interception Sequence", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "Failure & Enforcement Sequence (C4 L3)", "enabled": True},
            {"id": "sec-5", "type": "section", "title": "Wire-Level Token, Memory & IaC Kill-Switches", "enabled": True},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Scope Enforcement (C4 L4)", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Cloud Architecture Center Hub-and-Spoke Blueprint", "enabled": False},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle, Export & Recovery Loop", "enabled": False},
        ],
    },
    {
        "id": "product_launch",
        "name": "Product Launch / What's New Guide",
        "shortName": "Product Launch",
        "badge": "L200 • Feature Launch",
        "description": "Crisp feature-announcement and developer quickstart opening with the Reference Platform Integration Architecture, followed by the core capability mental model and end-to-end execution flow.",
        "defaultDomain": "Multi-Tenant Agentic AI",
        "defaultAudience": "Solutions Architects & Platform Engineers",
        "includeStarterCode": False,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Reference Platform Integration Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "What's Launching & Core Developer Mental Model", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Core Capability & Developer Mental Model", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "How It Works Under the Hood on Google Cloud", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "End-to-End Quickstart Execution Flow", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "Production Guardrails & Get Started Today", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Cloud Reference Topology", "enabled": False},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Security Boundary", "enabled": False},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Schema Transformation", "enabled": False},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle, Export & Recovery Loop", "enabled": False},
        ],
    },
    {
        "id": "case_study_postmortem",
        "name": "Case Study / Benchmark / Incident RCA",
        "shortName": "Case Study & RCA",
        "badge": "L200–L300 • Engineering Story",
        "description": "Narrative engineering postmortem, benchmark deep-dive, or workload transformation story opening with the Remediated Reference Platform Architecture, followed by root-cause delta, hardened cloud topology, and measured impact.",
        "defaultDomain": "Serverless & Platform Eng",
        "defaultAudience": "Cloud Infrastructure & SRE",
        "includeStarterCode": False,
        "recommendedOutline": [
            {"id": "sec-1", "type": "section", "title": "Remediated Reference Platform Architecture & Plane Ownership", "enabled": True},
            {"id": "diag-architecture", "type": "diagram", "kind": "architecture", "title": "Reference Platform Architecture & Plane Ownership (C4 L2)", "enabled": True},
            {"id": "sec-2", "type": "section", "title": "Incident Timeline, Root-Cause Analysis & Architecture Delta", "enabled": True},
            {"id": "diag-concept", "type": "diagram", "kind": "concept", "title": "Root-Cause & Before-vs-After Architecture Delta", "enabled": True},
            {"id": "sec-3", "type": "section", "title": "Hardened Production Cloud Network & VPC Topology", "enabled": True},
            {"id": "diag-cloudarch", "type": "diagram", "kind": "cloudarch", "title": "Hardened Production Cloud Topology", "enabled": True},
            {"id": "sec-4", "type": "section", "title": "Failure Mechanics & Operational Guardrails", "enabled": True},
            {"id": "sec-5", "type": "section", "title": "Measured Latency, Reliability & Key Lessons Learned", "enabled": True},
            {"id": "diag-sequence", "type": "diagram", "kind": "sequence", "title": "Remediated Request Execution Sequence", "enabled": False},
            {"id": "diag-security", "type": "diagram", "kind": "security", "title": "Trust Perimeter & Security Boundary", "enabled": False},
            {"id": "diag-wire", "type": "diagram", "kind": "wire", "title": "Wire-Protocol & Schema Transformation", "enabled": False},
            {"id": "diag-async", "type": "diagram", "kind": "async", "title": "Async Lifecycle, Export & Recovery Loop", "enabled": False},
        ],
    },
]

CATEGORY_BY_ID: Dict[str, Dict[str, Any]] = {c["id"]: c for c in BLOG_CATEGORIES}
DEFAULT_CATEGORY_ID = "reference_architecture"


def get_category(category_id: Optional[str]) -> Dict[str, Any]:
    cid = str(category_id or DEFAULT_CATEGORY_ID).strip().lower()
    return copy.deepcopy(CATEGORY_BY_ID.get(cid) or CATEGORY_BY_ID[DEFAULT_CATEGORY_ID])


def get_categories_catalog() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for cat in BLOG_CATEGORIES:
        item = copy.deepcopy(cat)
        plan = compute_dynamic_slide_plan(item["recommendedOutline"], bool(item["includeStarterCode"]))
        item["recommendedSlideCount"] = plan["totalSlides"]
        item["recommendedDiagramCount"] = len(plan["enabledDiagrams"])
        item["recommendedSectionCount"] = sum(
            1 for x in item["recommendedOutline"] if x.get("type") == "section" and x.get("enabled")
        )
        out.append(item)
    return out


def normalize_blog_outline(
    raw_outline: Any,
    *,
    category_id: str = DEFAULT_CATEGORY_ID,
) -> List[Dict[str, Any]]:
    """
    Validates & normalizes an ordered outline[] array of interleaved sections and diagrams.
    Guarantees >= 2 enabled sections, >= 1 enabled canonical diagram, and no duplicate diagram kinds.
    """
    cat = get_category(category_id)
    if not isinstance(raw_outline, list) or not raw_outline:
        return copy.deepcopy(cat["recommendedOutline"])

    cleaned: List[Dict[str, Any]] = []
    seen_diag_kinds: set[str] = set()
    sec_counter = 0

    for idx, item in enumerate(raw_outline[:24]):
        if not isinstance(item, dict):
            continue
        itype = str(item.get("type") or "").strip().lower()
        enabled = bool(item.get("enabled", True))
        if itype == "section":
            sec_counter += 1
            title = str(item.get("title") or f"Architecture Section {sec_counter}").strip()[:110]
            sid = re.sub(r"[^a-zA-Z0-9_-]", "", str(item.get("id") or f"sec-{sec_counter}"))[:40] or f"sec-{sec_counter}"
            cleaned.append({
                "id": sid,
                "type": "section",
                "title": title,
                "enabled": enabled,
            })
        elif itype == "diagram":
            kind = str(item.get("kind") or "").strip().lower()
            if kind not in VALID_DIAGRAM_KINDS or kind in seen_diag_kinds:
                continue
            seen_diag_kinds.add(kind)
            meta = DIAGRAM_KIND_META[kind]
            title = str(item.get("title") or meta["defaultTitle"]).strip()[:110]
            cleaned.append({
                "id": f"diag-{kind}",
                "type": "diagram",
                "kind": kind,
                "title": title,
                "enabled": enabled,
            })

    enabled_secs = [x for x in cleaned if x["type"] == "section" and x["enabled"]]
    if len(enabled_secs) < 2:
        for d_item in cat["recommendedOutline"]:
            if d_item["type"] == "section" and d_item["enabled"]:
                if not any(x["type"] == "section" and x["title"].lower() == d_item["title"].lower() for x in cleaned):
                    cleaned.append(copy.deepcopy(d_item))
                else:
                    for x in cleaned:
                        if x["type"] == "section" and not x["enabled"]:
                            x["enabled"] = True
                            break
            if sum(1 for x in cleaned if x["type"] == "section" and x["enabled"]) >= 2:
                break

    enabled_diags = [x for x in cleaned if x["type"] == "diagram" and x["enabled"]]
    if len(enabled_diags) < 1:
        # Ensure at least one diagram is enabled (preferring category default first diagram)
        pref_kind = next(
            (x["kind"] for x in cat["recommendedOutline"] if x["type"] == "diagram" and x["enabled"]),
            "architecture",
        )
        found = False
        for x in cleaned:
            if x["type"] == "diagram" and x["kind"] == pref_kind:
                x["enabled"] = True
                found = True
                break
        if not found:
            meta = DIAGRAM_KIND_META[pref_kind]
            cleaned.insert(1 if len(cleaned) >= 1 else 0, {
                "id": f"diag-{pref_kind}",
                "type": "diagram",
                "kind": pref_kind,
                "title": meta["defaultTitle"],
                "enabled": True,
            })

    return cleaned


def compute_dynamic_slide_plan(
    outline: List[Dict[str, Any]],
    include_starter_code: bool = True,
) -> Dict[str, Any]:
    """
    Deterministically computes the exact slide layout from enabled outline diagrams & starter-code flag.
    For reference_architecture (6 diagrams + starter code), produces the exact canonical 12-slide layout:
      Slide 1: Cover | Slide 2: BLUF | Slides 3..8: 6 Diagrams | Slide 9: Code | Slide 10: Proofs | Slide 11: Table | Slide 12: Next Steps
    """
    enabled_diags = [
        {
            "kind": item["kind"],
            "title": item.get("title") or DIAGRAM_KIND_META[item["kind"]]["defaultTitle"],
            "layer": DIAGRAM_KIND_META[item["kind"]]["layer"],
            "figureNum": idx,
        }
        for idx, item in enumerate(
            [x for x in outline if x.get("type") == "diagram" and x.get("enabled") and x.get("kind") in VALID_DIAGRAM_KINDS],
            1,
        )
    ]
    if not enabled_diags:
        enabled_diags = [{
            "kind": "architecture",
            "title": DIAGRAM_KIND_META["architecture"]["defaultTitle"],
            "layer": DIAGRAM_KIND_META["architecture"]["layer"],
            "figureNum": 1,
        }]

    diagram_slide_map: Dict[str, int] = {}
    slide_to_diagram: Dict[int, str] = {}
    cur = 3
    for d in enabled_diags:
        diagram_slide_map[d["kind"]] = cur
        slide_to_diagram[cur] = d["kind"]
        d["slideNumber"] = cur
        cur += 1

    code_slide: Optional[int] = None
    if include_starter_code:
        code_slide = cur
        cur += 1

    proof_slide = cur
    cur += 1
    table_slide = cur
    cur += 1
    closing_slide = cur

    return {
        "totalSlides": closing_slide,
        "coverSlide": 1,
        "blufSlide": 2,
        "diagramSlides": [d["slideNumber"] for d in enabled_diags],
        "diagramSlideMap": diagram_slide_map,
        "slideToDiagram": {str(k): v for k, v in slide_to_diagram.items()},
        "enabledDiagrams": enabled_diags,
        "enabledDiagramKinds": [d["kind"] for d in enabled_diags],
        "includeStarterCode": bool(include_starter_code),
        "codeSlide": code_slide,
        "proofSlide": proof_slide,
        "tableSlide": table_slide,
        "closingSlide": closing_slide,
    }


def hydrate_legacy_manifest_plan(manifest: Dict[str, Any]) -> Dict[str, Any]:
    """Backwards-compat hydrator for older GCS manifests that predate category/outline/slidePlan."""
    if isinstance(manifest.get("slidePlan"), dict) and isinstance(manifest.get("outline"), list):
        return manifest
    cat_id = str(manifest.get("category") or DEFAULT_CATEGORY_ID)
    diags = manifest.get("diagrams") if isinstance(manifest.get("diagrams"), dict) else {}
    legacy_six = ["architecture", "cloudarch", "sequence", "security", "wire", "async"]
    enabled_kinds = [k for k in VALID_DIAGRAM_KINDS if k in diags] or legacy_six
    bp = manifest.get("blueprint") if isinstance(manifest.get("blueprint"), dict) else {}
    secs = bp.get("sections") if isinstance(bp.get("sections"), list) else []
    inc_code = bool((manifest.get("starterMeta") or {}).get("files"))
    outline: List[Dict[str, Any]] = []
    # Interleave existing sections with enabled diagrams cleanly
    if secs:
        for i, s in enumerate(secs):
            outline.append({
                "id": f"sec-{i + 1}",
                "type": "section",
                "title": str(s.get("heading") or f"Section {i + 1}")[:110],
                "enabled": True,
            })
            if i < len(enabled_kinds):
                dk = enabled_kinds[i]
                outline.append({
                    "id": f"diag-{dk}",
                    "type": "diagram",
                    "kind": dk,
                    "title": str((diags.get(dk) or {}).get("title") or DIAGRAM_KIND_META[dk]["defaultTitle"]),
                    "enabled": True,
                })
        for dk in enabled_kinds[len(secs):]:
            outline.append({
                "id": f"diag-{dk}",
                "type": "diagram",
                "kind": dk,
                "title": str((diags.get(dk) or {}).get("title") or DIAGRAM_KIND_META[dk]["defaultTitle"]),
                "enabled": True,
            })
    else:
        outline = get_category(cat_id)["recommendedOutline"]
    manifest["category"] = cat_id
    manifest["outline"] = outline
    slides_len = len(bp.get("slides") or [])
    if slides_len == 9:
        manifest["slidePlan"] = {
            "totalSlides": 9,
            "coverSlide": 1,
            "blufSlide": 2,
            "diagramSlides": [3, 5],
            "diagramSlideMap": {"architecture": 3, "sequence": 5},
            "slideToDiagram": {"3": "architecture", "5": "sequence"},
            "enabledDiagrams": [
                {"kind": "architecture", "title": DIAGRAM_KIND_META["architecture"]["defaultTitle"], "layer": DIAGRAM_KIND_META["architecture"]["layer"], "figureNum": 1, "slideNumber": 3},
                {"kind": "sequence", "title": DIAGRAM_KIND_META["sequence"]["defaultTitle"], "layer": DIAGRAM_KIND_META["sequence"]["layer"], "figureNum": 2, "slideNumber": 5},
            ],
            "enabledDiagramKinds": ["architecture", "sequence"],
            "includeStarterCode": inc_code,
            "codeSlide": 6 if inc_code else None,
            "proofSlide": 7,
            "tableSlide": 8,
            "closingSlide": 9,
        }
    else:
        manifest["slidePlan"] = compute_dynamic_slide_plan(outline, include_starter_code=inc_code)
    return manifest


def _is_gibberish_or_trivial(prompt: str) -> Optional[str]:
    s = str(prompt or "").strip()
    if len(s) < 12:
        return "Prompt is too short (< 12 characters). Describe the cloud architecture topic, components, or trade-offs."
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9_-]*", s)
    if len(words) < 3:
        return "Prompt needs at least 3 meaningful words describing a technical topic."
    if re.search(r"(.)\1{7,}", s):
        return "Prompt appears to contain repeated placeholder characters."
    alpha_ratio = sum(1 for c in s if c.isalpha()) / max(1, len(s))
    if alpha_ratio < 0.35:
        return "Prompt does not contain recognizable natural-language technical intent."
    return None


def _default_fallback_options(prompt: str, category_id: str) -> List[Dict[str, Any]]:
    topic = re.sub(r"\s+", " ", str(prompt or "").strip())[:90] or "Enterprise Agentic AI on Google Cloud"
    return [
        {
            "title": f"Zero-Trust Reference Architecture for {topic[:58]}",
            "category": "reference_architecture",
            "prompt": (
                f"Design a production Google Cloud Reference Architecture for {topic} using Cloud Run v2, "
                "Identity-Aware Proxy (IAP), Cloud Armor WAF, Private Service Connect, AlloyDB or Cloud Spanner "
                "tenant isolation, Cloud KMS CMEK, and OpenTelemetry audit logging with starter Terraform and Python."
            ),
            "angle": "Full-stack L300–L400 architecture with all 6 C4 diagrams and deployable starter kit.",
            "recommendedDiagrams": ["architecture", "cloudarch", "sequence", "security", "wire", "async"],
        },
        {
            "title": f"Design Patterns & FinOps Trade-Offs: {topic[:54]}",
            "category": "pattern_tradeoff",
            "prompt": (
                f"Compare pooled, hybrid, and dedicated-silo Google Cloud architecture patterns for {topic}, "
                "evaluating isolation boundaries, blast radius, quota caps, unit economics, and migration criteria "
                "for enterprise platform teams."
            ),
            "angle": "Decision-oriented L200–L300 comparison with 3 focused diagrams and zero boilerplate code.",
            "recommendedDiagrams": ["architecture", "cloudarch", "sequence"],
        },
        {
            "title": f"Executive & CISO Governance Brief: {topic[:54]}",
            "category": "executive_brief",
            "prompt": (
                f"Author an Executive and CISO briefing for {topic} on Google Cloud covering business value, "
                "zero-trust compliance controls (VPC-SC, IAM, CMEK, DLP), TCO drivers, and a 90-day phased rollout roadmap."
            ),
            "angle": "Crisp L100–L200 leadership brief with 2 executive diagrams and a 7-slide deck.",
            "recommendedDiagrams": ["architecture", "security"],
        },
    ]


def assess_prompt_preflight(
    *,
    prompt: str,
    category_id: str,
    domain: str,
    audience: str,
    enabled_diagrams: List[str],
    call_gemini_json_fn: Callable[..., Tuple[Dict[str, Any], Dict[str, Any]]],
    f13_scanner: Callable[[str], List[str]],
    sanitize_fn: Callable[[str], str],
    api_key_override: Optional[str] = None,
    preflight_model: str = "gemini-2.5-flash",
) -> Dict[str, Any]:
    """
    Fast (<3s) live Gemini prompt assessment.
    - Immediately fails closed on F-13 secret/corp leaks.
    - Returns READY for clear, specific, well-scoped prompts (0 extra user clicks).
    - Returns 3 concrete, actionable sample options whenever prompt is vague, off-topic, or factually flawed.
    """
    clean_prompt = str(prompt or "").strip()
    cat = get_category(category_id)
    leaks = f13_scanner(clean_prompt)
    if leaks:
        return {
            "ok": True,
            "verdict": "OUT_OF_SCOPE",
            "score": 0,
            "canBypass": False,
            "reason": f"Prompt blocked by public-repo hygiene check ({', '.join(leaks[:4])}). Remove internal URLs, tokens, or personal emails.",
            "recommendedCategory": cat["id"],
            "options": _default_fallback_options("Multi-Tenant Agentic AI on Google Cloud", cat["id"]),
            "model": "static_hygiene_guard",
            "latencyMs": 0.0,
        }

    gib_reason = _is_gibberish_or_trivial(clean_prompt)
    if gib_reason:
        return {
            "ok": True,
            "verdict": "NEEDS_CLARIFICATION",
            "score": 15,
            "canBypass": False,
            "reason": gib_reason,
            "recommendedCategory": cat["id"],
            "options": _default_fallback_options("Zero-Trust Multi-Tenant AI Gateway on Google Cloud", cat["id"]),
            "model": "static_preflight_guard",
            "latencyMs": 0.0,
        }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cat_list = ", ".join(f"{c['id']} ({c['shortName']})" for c in BLOG_CATEGORIES)
    sys_prompt = (
        f"Today is {today}. You are a fast Google Cloud Architecture Center prompt preflight assessor.\n"
        "GROUNDING FACTS (NEVER falsely reject these real 2026 GCP capabilities):\n"
        "- Gemini 4 (gemini-4-neon, gemini-4-carbon, gemini-4-argon, gemini-4-hydrogen), Gemini 3.x (3.8/3.7/3.5-flash, 3.1-pro-preview), "
        "and Gemini 2.5 (pro/flash) are all live Vertex AI models.\n"
        "- Cloud Spanner Graph (ISO GQL GRAPH_TABLE, CREATE PROPERTY GRAPH), Spanner vector search, Spanner FGAC (100 roles/db limit; NOT PostgreSQL CREATE POLICY RLS), "
        "AlloyDB for PostgreSQL (DOES support PostgreSQL FORCE ROW LEVEL SECURITY), Cloud Run v2, Identity-Aware Proxy (IAP), VPC Service Controls, Private Service Connect, "
        "Vertex AI Agent Engine, Model Armor, BigQuery RLS, and Cloud KMS CMEK are all real GA Google Cloud capabilities.\n\n"
        "TASK:\n"
        "Evaluate the user's blog prompt + selected filters and return ONLY strict RFC 8259 JSON:\n"
        '{"verdict":"READY|NEEDS_CLARIFICATION|FACTUALLY_FLAWED|OUT_OF_SCOPE",'
        '"score":0-100,'
        '"reason":"1-2 crisp sentences explaining the verdict",'
        '"recommendedCategory":"one of: reference_architecture|pattern_tradeoff|hands_on_runbook|executive_brief|security_deep_dive|product_launch|case_study_postmortem",'
        '"options":[{"title":"...","category":"...","prompt":"60-260 char complete ready-to-generate architecture prompt","angle":"1 crisp sentence","recommendedDiagrams":["concept","cloudarch"]}]}\n\n'
        "RULES:\n"
        "1. Mark READY (score >= 70) whenever the prompt clearly specifies a real cloud/AI/software architecture topic with reasonable scope — do NOT nitpick good prompts!\n"
        "2. Mark NEEDS_CLARIFICATION only if the prompt is overly generic/vague (e.g. 'write about AI' or 'cloud security') or massively overscoped.\n"
        "3. Mark FACTUALLY_FLAWED ONLY for clear technical impossibilities (e.g. 'PostgreSQL CREATE POLICY RLS on Cloud Spanner' or 'public unauthenticated allUsers for zero-trust banking').\n"
        "4. Mark OUT_OF_SCOPE for non-technical/non-cloud topics (recipes, poems, unrelated trivia).\n"
        "5. Whenever verdict != READY, ALWAYS provide EXACTLY 3 distinct, high-value options in `options` (each tailored to a concrete angle/category). "
        "When verdict == READY, `options` may be empty [].\n"
        f"Valid categories: {cat_list}.\n"
        f"Valid diagram kinds: {', '.join(VALID_DIAGRAM_KINDS)}."
    )
    user_prompt = (
        f"Selected Category: {cat['id']} ({cat['name']})\n"
        f"Selected Domain: {domain}\n"
        f"Selected Audience: {audience}\n"
        f"Selected Diagrams: {', '.join(enabled_diagrams) if enabled_diagrams else 'default'}\n"
        f"User Prompt:\n{clean_prompt}"
    )

    raw_obj, meta = call_gemini_json_fn(
        system_prompt=sys_prompt,
        user_prompt=user_prompt,
        model=preflight_model,
        api_key_override=api_key_override,
        max_output_tokens=1600,
        thinking_budget=0,
        thinking_level="LOW",
        temperature=0.15,
        timeout_s=22.0,
    )

    verdict = str(raw_obj.get("verdict") or "READY").strip().upper()
    if verdict not in ("READY", "NEEDS_CLARIFICATION", "FACTUALLY_FLAWED", "OUT_OF_SCOPE"):
        verdict = "READY"
    score_raw = raw_obj.get("score")
    score = int(score_raw) if isinstance(score_raw, (int, float)) else (85 if verdict == "READY" else 45)
    score = max(0, min(100, score))
    rec_cat = str(raw_obj.get("recommendedCategory") or cat["id"]).strip().lower()
    if rec_cat not in CATEGORY_BY_ID:
        rec_cat = cat["id"]
    reason = sanitize_fn(str(raw_obj.get("reason") or (
        "Prompt is clear, specific, and ready for full architecture generation."
        if verdict == "READY"
        else "Prompt can be sharpened — choose one of the 3 tailored architecture options below."
    )))[:280]

    parsed_opts: List[Dict[str, Any]] = []
    if verdict != "READY":
        for opt in (raw_obj.get("options") or [])[:3]:
            if not isinstance(opt, dict):
                continue
            oc = str(opt.get("category") or rec_cat).strip().lower()
            if oc not in CATEGORY_BY_ID:
                oc = rec_cat
            oprompt = sanitize_fn(str(opt.get("prompt") or "")).strip()[:800]
            otitle = sanitize_fn(str(opt.get("title") or "")).strip()[:110]
            oangle = sanitize_fn(str(opt.get("angle") or "")).strip()[:200]
            odiags = [
                str(d).strip().lower()
                for d in (opt.get("recommendedDiagrams") or [])
                if str(d).strip().lower() in VALID_DIAGRAM_KINDS
            ]
            if not odiags:
                odiags = [
                    x["kind"] for x in CATEGORY_BY_ID[oc]["recommendedOutline"]
                    if x["type"] == "diagram" and x["enabled"]
                ]
            if oprompt and len(oprompt) >= 20:
                parsed_opts.append({
                    "title": otitle or f"{CATEGORY_BY_ID[oc]['shortName']} Option",
                    "category": oc,
                    "prompt": oprompt,
                    "angle": oangle or CATEGORY_BY_ID[oc]["description"][:140],
                    "recommendedDiagrams": odiags[:7],
                })
        fb_opts = _default_fallback_options(clean_prompt, rec_cat)
        while len(parsed_opts) < 3:
            parsed_opts.append(fb_opts[len(parsed_opts) % len(fb_opts)])

    can_bypass = verdict != "OUT_OF_SCOPE"
    return {
        "ok": True,
        "verdict": verdict,
        "score": score,
        "canBypass": can_bypass,
        "reason": reason,
        "recommendedCategory": rec_cat,
        "options": parsed_opts[:3],
        "model": meta.get("model", preflight_model),
        "latencyMs": meta.get("latencyMs", 0.0),
    }
