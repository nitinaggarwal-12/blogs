#!/usr/bin/env python3
"""
Create Blog1 v2 Multi-Stage Grounded Authoring & Revision Helpers.

Pure Python 3.11+ stdlib module providing:
  - Live Vertex AI / Gemini Developer API Google Search grounding dossier
  - Split multi-stage prompts (Deep Prose + Inline Code/DDL/Formulas -> 5 C4 Diagrams + 12-Slide Deck + Hardened Code)
  - Terraform / starter code security hygiene scanner (D-11)
  - Grounded orthogonal judge & surgical 1-pass auto-revision merger (Round 1 -> Round 2)
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple


ALLOWED_ICON_KEYS_LIST = (
    "cloud_run, gke, vertex_ai, cloud_armor, cloud_load_balancing, cloud_iam, iap, "
    "memorystore, bigquery, cloud_logging, cloud_monitoring, scc, spanner, cloud_storage, "
    "artifact_registry, gemini, adk, agent_gateway, model_armor, agent_registry, cloud_kms, "
    "alloydb, finops, psc, vpc_sc, google_g, gcp_cloud, saas_globe, api_gateway, mcp_tools, a2a_agents"
)


def call_gemini_grounded_search(
    *,
    topic_prompt: str,
    title_hint: str,
    domain: str,
    model: str,
    vertex_project: str,
    vertex_location: str,
    get_bearer_token: Callable[[], Optional[str]],
    api_key_override: Optional[str] = None,
    timeout_s: float = 45.0,
) -> Dict[str, Any]:
    """
    Runs a live Google Search grounded verification query via Vertex AI (or Gemini API)
    using `tools: [{"googleSearch": {}}]`. Fails gracefully (returning `status=UNAVAILABLE`,
    zero fabricated sources) if an account/key blocks Search grounding.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q_prompt = (
        f"Today is {today}. Use Google Search to gather concise, verified, current official Google Cloud facts "
        f"for an Architecture Center article titled '{title_hint or topic_prompt[:90]}' (domain: {domain}).\n\n"
        f"Topic request:\n{topic_prompt[:1400]}\n\n"
        "Provide strictly grounded bullet points covering:\n"
        "1. Exact current GA/Preview Google Cloud product names & deprecations (e.g., flag legacy names like 'Matching Engine' -> 'Vertex AI Vector Search').\n"
        "2. Official syntax/DDL/API features relevant to this topic (e.g., Cloud Spanner Graph ISO GQL `CREATE PROPERTY GRAPH` / `GRAPH_TABLE`, Fine-Grained Access Control vs RLS, Cloud Run v2 Terraform `google_cloud_run_v2_service`).\n"
        "3. Exact verified SLA, quota, or limit numbers from official cloud.google.com docs.\n"
        "4. Canonical https://cloud.google.com/... documentation URLs.\n"
        "Be strictly factual; if uncertain, explicitly state 'unverified'."
    )
    body_obj = {
        "contents": [{"role": "user", "parts": [{"text": q_prompt}]}],
        "tools": [{"googleSearch": {}}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "thinkingConfig": {"thinkingBudget": 256},
        },
    }
    payload = json.dumps(body_obj).encode("utf-8")
    eff_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    clean_model = "gemini-2.5-flash" if model not in ("gemini-2.5-flash", "gemini-2.5-pro") else model

    if eff_key:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": eff_key}
        mode = "gemini_api_google_search"
    else:
        token = get_bearer_token()
        if not token:
            return {"status": "UNAVAILABLE", "reason": "No bearer token available.", "summary": "", "queries": [], "sources": []}
        endpoint = (
            f"https://{vertex_location}-aiplatform.googleapis.com/v1/projects/"
            f"{urllib.parse.quote(vertex_project, safe='')}/locations/{urllib.parse.quote(vertex_location, safe='')}"
            f"/publishers/google/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
        )
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
        mode = "vertex_ai_google_search"

    t0 = time.perf_counter()
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        msg = ""
        try:
            msg = exc.read().decode("utf-8", errors="replace")[:260]
        except Exception:
            pass
        return {
            "status": "UNAVAILABLE",
            "mode": mode,
            "reason": f"Google Search grounding returned HTTP {exc.code}: {msg}",
            "summary": "",
            "queries": [],
            "sources": [],
            "latencyMs": round((time.perf_counter() - t0) * 1000.0, 1),
        }
    except Exception as exc:
        return {
            "status": "UNAVAILABLE",
            "mode": mode,
            "reason": str(exc)[:220],
            "summary": "",
            "queries": [],
            "sources": [],
            "latencyMs": round((time.perf_counter() - t0) * 1000.0, 1),
        }

    cands = data.get("candidates") or []
    if not cands:
        return {"status": "UNAVAILABLE", "mode": mode, "reason": "Empty candidate response", "summary": "", "queries": [], "sources": []}
    cand = cands[0]
    parts = [str(p.get("text") or "") for p in (cand.get("content") or {}).get("parts") or [] if p.get("thought") is not True]
    summary = "\n".join(x for x in parts if x).strip()[:6000]
    gm = cand.get("groundingMetadata") or {}
    queries = [str(q)[:140] for q in (gm.get("webSearchQueries") or [])[:12]]
    sources: List[Dict[str, str]] = []
    seen_titles = set()
    for ch in (gm.get("groundingChunks") or [])[:15]:
        web = ch.get("web") or {}
        ttl = str(web.get("title") or "").strip()[:120]
        uri = str(web.get("uri") or "").strip()
        if ttl and uri and (ttl, uri[:60]) not in seen_titles:
            seen_titles.add((ttl, uri[:60]))
            sources.append({"title": ttl, "uri": uri})
    return {
        "status": "GROUNDED" if (summary and (queries or sources)) else "PARTIAL",
        "mode": mode,
        "model": clean_model,
        "checkedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "latencyMs": round((time.perf_counter() - t0) * 1000.0, 1),
        "queries": queries,
        "sources": sources[:10],
        "summary": summary,
    }


def scan_terraform_security(starter_files: Dict[str, str]) -> List[Dict[str, str]]:
    """Deterministic security & deprecation linter (gate D-11) for generated Terraform/shell code."""
    findings: List[Dict[str, str]] = []
    tf = str(starter_files.get("main.tf") or "")
    tv = str(starter_files.get("variables.tf") or "")
    dep = str(starter_files.get("deploy.sh") or "")
    combined_tf = tf + "\n" + tv

    # Check non-comment lines for public IAM principals
    active_tf_lines = [ln for ln in combined_tf.splitlines() if not ln.lstrip().startswith(("#", "//"))]
    active_tf = "\n".join(active_tf_lines)

    if re.search(r'["\']allUsers["\']', active_tf):
        findings.append({
            "id": "TF-SEC-01",
            "severity": "HIGH",
            "detail": "main.tf binds public principal 'allUsers' (unauthenticated internet access violates zero-trust ingress).",
        })
    if re.search(r'["\']allAuthenticatedUsers["\']', active_tf):
        findings.append({
            "id": "TF-SEC-02",
            "severity": "HIGH",
            "detail": "main.tf binds broad principal 'allAuthenticatedUsers' (any Google account globally).",
        })
    if re.search(r'\bresource\s+"google_cloud_run_service"', active_tf):
        findings.append({
            "id": "TF-DEP-01",
            "severity": "MEDIUM",
            "detail": "Uses legacy Cloud Run v1 resource 'google_cloud_run_service'; prefer 'google_cloud_run_v2_service'.",
        })
    if re.search(r'source_ranges\s*=\s*\[[^\]]*["\']0\.0\.0\.0/0["\']', active_tf) and re.search(r'ports\s*=\s*\[[^\]]*["\'](22|3389|5432|3306|6379)["\']', active_tf):
        findings.append({
            "id": "TF-SEC-03",
            "severity": "HIGH",
            "detail": "Wide-open 0.0.0.0/0 firewall ingress to sensitive management/DB port.",
        })
    if re.search(r'\bingress\s*=\s*["\']INGRESS_TRAFFIC_ALL["\']', active_tf):
        findings.append({
            "id": "TF-SEC-04",
            "severity": "MEDIUM",
            "detail": "Cloud Run ingress set to INGRESS_TRAFFIC_ALL; prefer INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER behind LB/IAP.",
        })
    if re.search(r'(?i)(api_key|secret_key|password)\s*=\s*["\'][A-Za-z0-9_\-]{12,}["\']', active_tf + "\n" + dep):
        findings.append({
            "id": "TF-SEC-05",
            "severity": "HIGH",
            "detail": "Possible hardcoded literal secret/password inside Terraform or deploy script.",
        })
    if re.search(r'--allow-unauthenticated\b', dep):
        findings.append({
            "id": "SH-SEC-01",
            "severity": "HIGH",
            "detail": "deploy.sh includes '--allow-unauthenticated'; remove to enforce IAM / IAP authentication.",
        })
    return findings


def prose_stage_system_prompt() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return (
        f"Today is {today}. You are a Principal Google Cloud Solutions Architect authoring a flagship, "
        "deep-dive Google Cloud Architecture Center article (matching the rigor, concreteness, and depth "
        "of a 4,000-word multi-pattern reference series). "
        "STRICT ANTI-HALLUCINATION CONTRACT:\n"
        "1. Output ONLY a valid JSON object (zero extra text outside JSON).\n"
        "2. Ground EVERY Google Cloud product name, GA/Preview feature, SQL/GQL/API syntax, quota, and SLA in the "
        "LIVE_SEARCH_GROUNDING dossier provided. Replace deprecated terms (e.g., use 'Vertex AI Vector Search', "
        "NOT 'Matching Engine'; use exact product access controls like 'Fine-Grained Access Control' where applicable).\n"
        "3. NEVER invent customer emails, employee names, internal shortlinks (go/...), issue IDs (b/...), or fake benchmarks.\n"
        "4. Write DEEP, concrete engineering prose — include real inline fenced code blocks inside sections "
        "(DDL/SQL/ISO GQL/YAML/bash/formula FinOps equations), comparative tables, failure modes, compensating controls, and math.\n"
        "5. Tag EVERY numeric claim/SLA/latency/cost assumption in `claimLedger` strictly as one of: "
        "GCP_DOCUMENTED | DERIVED_MODEL | EXAMPLE_TARGET | USER_SUPPLIED.\n"
        "6. Zero emojis in headings, bullets, tables, or labels. Real public https://cloud.google.com/ URLs only."
    )


def prose_stage_user_prompt(prompt: str, title_hint: str, domain: str, audience: str, grounding: Dict[str, Any]) -> str:
    g_text = (grounding.get("summary") or "").strip()
    g_block = (
        f"LIVE_SEARCH_GROUNDING (status={grounding.get('status')}, verified {grounding.get('checkedAt', '')}):\n{g_text[:4800]}\n\n"
        if g_text
        else "LIVE_SEARCH_GROUNDING: unavailable (be conservative; mark unverified numbers as EXAMPLE_TARGET or DERIVED_MODEL).\n\n"
    )
    schema = {
        "title": "Concise flagship technical title (<= 85 chars, plain text, zero emojis)",
        "subtitle": "One-sentence Google Cloud Architecture Center subtitle (<= 135 chars)",
        "slugHint": "short-kebab-case-slug",
        "summary": "2-4 sentence executive BLUF stating problem, architecture thesis, core trade-off, and scope",
        "audience": audience,
        "domain": domain,
        "estimatedReadMinutes": 16,
        "keyTakeaways": ["4 crisp actionable takeaways (plain text, ZERO **bold** markers or emojis)"],
        "sections": [
            {
                "heading": "Section heading (e.g. '1. Executive Thesis & Architectural Problem')",
                "paragraphs": ["2-4 detailed, meaty technical paragraphs (~120-180 words each) with concrete mechanisms, edge cases, and design rationale."],
                "bullets": ["Crisp engineering bullet points (include concrete parameters/flags)"],
                "codeBlocks": [
                    {"language": "sql|yaml|bash|formula|python", "caption": "Short descriptive label", "code": "Real runnable/verified DDL, ISO GQL query, YAML policy, FinOps latency/cost formula, or CLI command."}
                ],
                "table": {"headers": ["Col 1", "Col 2", "Col 3", "Col 4"], "rows": [["v1", "v2", "v3", "v4"]]},
            }
        ],
        "claimLedger": [
            {
                "id": "CLM-01",
                "claim": "Specific quantitative SLA, quota, or modeled target",
                "value": "Exact figure + units",
                "provenance": "GCP_DOCUMENTED | DERIVED_MODEL | EXAMPLE_TARGET | USER_SUPPLIED",
                "basis": "Exact scoping & source basis (never fabricate benchmarks)",
            }
        ],
        "faq": [{"question": "Sharp staff-engineer objection or edge-case question", "answer": "Concrete 3-5 sentence answer"}],
        "references": [{"title": "Official Google Cloud doc title", "url": "https://cloud.google.com/...", "note": "What this doc verifies"}],
    }
    return (
        f"{g_block}"
        f"USER TOPIC / PROMPT:\n{prompt.strip()}\n\n"
        f"TITLE HINT: {title_hint.strip() or '(derive crisp title)'}\n"
        f"DOMAIN / PILLAR: {domain.strip() or 'Enterprise AI Architecture'}\n"
        f"PRIMARY AUDIENCE: {audience.strip() or 'Solutions Architects & Platform Engineers'}\n\n"
        "TARGET DEPTH REQUIREMENTS (WS1-WS5 PARITY):\n"
        "- Generate 7 to 8 rich `sections` totaling ~3,200 to 4,800 words of authentic technical depth:\n"
        "  1. Executive Thesis, Problem Statement & Failure Modes of Naive Approaches\n"
        "  2. Core Data Model, Storage / Schema & Query Semantics (MUST include a real `sql` or `yaml` `codeBlock`!)\n"
        "  3. Reference Architecture Planes (Control, Compute, Data) & End-to-End Request Lifecycle\n"
        "  4. Security Perimeter, Identity, Fine-Grained Access Control & Cryptographic Erasure (include table + threat/fail-closed matrix!)\n"
        "  5. Comparative Trade-offs vs. Alternative Google Cloud Services (include detailed comparison table!)\n"
        "  6. Latency Budgeting, FinOps Cost Math & Hard GCP Quotas (MUST include a `formula` `codeBlock` showing explicit math equations!)\n"
        "  7. Async Lifecycle, Point-in-Time Analytics, DR & Operational Runbooks (include a `bash` / `sql` verification `codeBlock`!)\n"
        "  8. Deploy & Verify in Your Own GCP Project + Next Steps (clearly marked GENERATED_TEMPLATE_UNDEPLOYED)\n"
        "- Include structured `table` on at least 4 sections (`<= 6` columns, `4-7` concrete rows each).\n"
        "- Include `codeBlocks` on at least 4 sections (realistic, syntactically accurate SQL/DDL/GQL, formula math, bash verify, YAML).\n"
        "- Include 8 to 12 `claimLedger` entries covering EVERY SLA, latency, quota, or cost target in prose/formulas.\n"
        "- Include 6 to 7 sharp `faq` items addressing real failure modes, cost surprises, and migration complexity.\n"
        "- Include 8 to 12 verified public `https://cloud.google.com/` URLs in `references`.\n\n"
        "Return ONLY JSON matching:\n" + json.dumps(schema, indent=2)
    )


def topology_stage_system_prompt() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return (
        f"Today is {today}. You are a Principal Google Cloud Solutions Architect generating the structured "
        "visual diagrams (5 C4 layers), 12-slide executive deck, and hardened Terraform v2 + Python 3.11 starter kit "
        "matching a flagship blog article. STRICT RULES:\n"
        "1. Output ONLY valid JSON (no markdown wrappers outside JSON).\n"
        "2. ZERO emojis and ZERO inline markdown asterisks (**bold** or `backticks`) inside diagram labels, "
        "slide titles, slide bullets, table cells, or speaker notes! Write clean plain English text everywhere.\n"
        "3. `iconKey` MUST be selected strictly from this allowed list:\n"
        f"   {ALLOWED_ICON_KEYS_LIST}\n"
        "4. Hardened Terraform (`terraformMain`) MUST:\n"
        "   - Use `google_cloud_run_v2_service` (NEVER deprecated v1 `google_cloud_run_service`!)\n"
        "   - Set `ingress = \"INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER\"`\n"
        "   - NEVER grant `allUsers` or `allAuthenticatedUsers` on IAM bindings (zero public unauthenticated access!)\n"
        "   - Declare any `data` block referenced (e.g., `data \"google_project\" \"project\" {}`).\n"
        "5. `deploySh` MUST NEVER pass `--allow-unauthenticated`.\n"
        "6. `pythonApp` MUST be syntactically valid Python 3.11 implementing realistic, topic-specific handlers "
        "(no `...` or incomplete syntax stubs; verified with `ast.parse()`).\n"
        "7. Speaker notes for ALL 12 slides must be natural, humanized, conversational spoken narration "
        "(2-4 clear sentences each, ~55-95 words, zero markdown punctuation, never say 'Slide 1' or 'Architecture 1')."
    )


def topology_stage_user_prompt(prose_bp: Dict[str, Any], prompt: str, grounding: Dict[str, Any]) -> str:
    sec_brief = [
        {"heading": s.get("heading"), "hasTable": bool(s.get("table")), "hasCode": bool(s.get("codeBlocks"))}
        for s in (prose_bp.get("sections") or [])
    ]
    g_snippet = (grounding.get("summary") or "")[:2400]
    schema = {
        "architectureZones": [
            {
                "id": "zone_1",
                "title": "Edge & Ingress",
                "subtitle": "Short zone role (<= 40 chars)",
                "components": [
                    {"id": "c1", "label": "Service Name", "sub": "Protocol / SKU", "role": "1-line crisp role", "iconKey": "saas_globe"}
                ],
            }
        ],
        "architectureEdges": [
            {"from": "c1", "to": "c2", "label": "HTTPS / TLS 1.3", "dashed": False}
        ],
        "sequenceActors": [
            {"id": "a1", "label": "Actor Name", "sub": "Role / Service", "iconKey": "saas_globe"}
        ],
        "sequenceSteps": [
            {"num": 1, "from": "a1", "to": "a2", "label": "Short verb + payload (<= 55 chars)", "kind": "request|guard|response"}
        ],
        "securityDiagram": {
            "layers": [
                {"zone": "L1 · Edge Ingress & WAF", "control": "Service + Feature", "iconKey": "iap", "detail": "Crisp 1-sentence enforcement check"}
            ],
            "threats": [
                {"code": "T-01", "vector": "Specific attack/failure vector", "mitigation": "Active defense control"}
            ],
            "breakers": [
                {"code": "HTTP 401", "trigger": "Exact fail-closed trigger condition"}
            ],
        },
        "wireDiagram": {
            "hops": [
                {
                    "hop": "HOP 1 · CLIENT INGRESS",
                    "title": "Envelope Name (<= 28 chars)",
                    "protocol": "TLS 1.3 / gRPC / SQL",
                    "iconKey": "saas_globe",
                    "added": ["field added 1", "field added 2", "field added 3"],
                    "stripped": ["stripped header/field 1", "stripped field 2"],
                    "sample": "compact realistic wire/query/JSON payload line (<= 110 chars)",
                }
            ]
        },
        "asyncDiagram": {
            "stages": [
                {"stage": "1. STAGE NAME", "service": "GCP Service Name", "iconKey": "spanner", "cadence": "Continuous / Hourly", "detail": "Concise 2-sentence operational role"}
            ],
            "feedbackNote": "Dead-letter queue, retry/backoff, and reconciliation alert note.",
        },
        "slides": [
            {
                "number": 1,
                "kicker": "EXECUTIVE BRIEF",
                "title": "Clean plain-text title (<= 60 chars, no ** or emojis)",
                "subtitle": "Concise action subtitle (<= 100 chars)",
                "bullets": ["3-5 crisp plain-text bullets (no ** or emojis, <= 95 chars each)"],
                "calloutLabel": "Optional metric label",
                "calloutValue": "Grounded value + tag",
                "table": {"headers": ["Col A", "Col B", "Col C"], "rows": [["v1", "v2", "v3"]]},
                "codeSnippet": "Short snippet (slide 9 ONLY)",
                "speakerNotes": "Conversational spoken narration (55-95 words, plain prose).",
            }
        ],
        "codeStarter": {
            "readmeSummary": "Review, security-scan, and terraform plan notes.",
            "schemaSql": "-- Valid DDL/SQL/ISO GQL starter statements tailored to this architecture",
            "terraformMain": "# Complete hardened Terraform using google_cloud_run_v2_service (NO allUsers!)",
            "terraformVars": "# Terraform variable declarations",
            "pythonApp": "# Syntactically valid Python 3.11 Flask/service app tailored to this architecture",
            "deploySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
            "verifySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
        },
    }
    return (
        f"ALIGN WITH BLOG TITLE: {prose_bp.get('title')}\n"
        f"SUBTITLE: {prose_bp.get('subtitle')}\n"
        f"SUMMARY: {prose_bp.get('summary')}\n"
        f"SECTIONS: {json.dumps(sec_brief)}\n"
        f"CLAIMS: {json.dumps((prose_bp.get('claimLedger') or [])[:8])}\n"
        f"ORIGINAL PROMPT:\n{prompt.strip()[:1200]}\n\n"
        + (f"GROUNDING NOTES:\n{g_snippet}\n\n" if g_snippet else "")
        + "EXACT COUNTS REQUIRED:\n"
        "- `architectureZones`: EXACTLY 4 zones in this order: zone_1=Edge & Ingress (2-3 comps), zone_2=Control & Governance Plane (2-4 comps: KMS/IAM/Policy/Registry), zone_3=Compute & AI Plane (2-3 comps), zone_4=Data & Persistence Plane (2-4 comps). Unique ids c1..c12. Set `iconKey` on EVERY component.\n"
        "- `architectureEdges`: 7 to 11 crisp edges connecting those ids (set `dashed: true` for control/async/telemetry taps).\n"
        "- `sequenceActors`: EXACTLY 5 actors (ids a1..a5) with `iconKey`.\n"
        "- `sequenceSteps`: 8 to 10 numbered steps across a1..a5 (`kind`: request | guard | response).\n"
        "- `securityDiagram`: EXACTLY 4 nested layers, 4 threats (`T-01`..`T-04`), 4 breakers (`HTTP 401`, `HTTP 403`, `HTTP 422`, `HTTP 429`).\n"
        "- `wireDiagram.hops`: EXACTLY 4 progressive hops showing field-level `added`, `stripped`, and realistic `sample` payload/query.\n"
        "- `asyncDiagram.stages`: EXACTLY 4 background stages + `feedbackNote`.\n"
        "- `slides`: EXACTLY 12 slides (matching WS1-WS5 12-slide executive deck cadence):\n"
        "  1=Cover & BLUF | 2=Challenge & Design Goals (with callout metric) | 3=Figure 1 Master Reference Architecture (C4 L2) | "
        "  4=Component & Security Design Matrix (include compact table) | 5=Figure 2 End-to-End Request Lifecycle Sequence (C4 L3) | "
        "  6=Figure 3 Trust Perimeter & Security Boundary (C4 L1) | 7=Figure 4 Wire Payload & Schema Transformation (C4 L4) | "
        "  8=Figure 5 Async Lifecycle, Export & Recovery Loop | 9=Implementation Guardrails & Starter Code (include concise `codeSnippet`) | "
        "  10=Verified Live Console & SaaS Proofs (specify exact BEFORE/AFTER capture targets; no fake screenshots) | "
        "  11=Cost, Latency & Architecture Trade-off Matrix (include compact table) | 12=Production Readiness Checklist & Next Steps.\n"
        "- `codeStarter.terraformMain`: MUST use `google_cloud_run_v2_service` with `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`, ZERO `allUsers` or `allAuthenticatedUsers`.\n\n"
        "Return ONLY JSON matching:\n" + json.dumps(schema, indent=2)
    )


def build_auto_revision_prompt(
    bp: Dict[str, Any],
    judge_r1: Dict[str, Any],
    tf_findings: List[Dict[str, str]],
    grounding: Dict[str, Any],
) -> Tuple[str, str]:
    sys_p = (
        "You are a Principal Google Cloud Solutions Architect performing a surgical peer-review revision. "
        "Apply targeted fixes for EVERY genuine P0/P1 DDL/SQL/security/clarity finding and Terraform security finding. NEVER remove or replace real Google Cloud products/features verified in the grounding dossier. "
        "Do NOT invent fake claims, fake benchmarks, emojis, internal links, or `allUsers` bindings. "
        "Output ONLY a JSON object with any subset of these keys to replace/update cleanly:\n"
        '{"summary":"updated executive summary (optional)","appliedFixes":["short description of each fix"],'
        '"sectionPatches":[{"headingMatch":"exact or substring heading","appendParagraph":"...","replaceTable":null,"addCodeBlock":{"language":"sql|yaml|bash|formula","caption":"...","code":"..."}}],'
        '"claimLedger":[...full updated ledger array if fixing claims...],'
        '"terraformMain":"...full hardened main.tf if fixing TF findings (MUST use google_cloud_run_v2_service, zero allUsers)..."}'
    )
    findings = judge_r1.get("findings") or []
    user_p = (
        f"TITLE: {bp.get('title')}\n"
        f"ROUND 1 JUDGE: verdict={judge_r1.get('verdict')} score={judge_r1.get('score')}\n"
        f"JUDGE SUMMARY: {judge_r1.get('summary')}\n\n"
        f"JUDGE FINDINGS TO ADDRESS:\n{json.dumps(findings, indent=2)}\n\n"
        f"DETERMINISTIC TERRAFORM SECURITY FINDINGS (D-11):\n{json.dumps(tf_findings, indent=2)}\n\n"
        f"LIVE GOOGLE SEARCH GROUNDING DOSSIER:\n{(grounding.get('summary') or 'N/A')[:2600]}\n\n"
        f"CURRENT SECTION HEADINGS:\n{json.dumps([s.get('heading') for s in (bp.get('sections') or [])])}\n\n"
        f"CURRENT CLAIM LEDGER:\n{json.dumps(bp.get('claimLedger') or [], indent=2)[:2400]}\n\n"
        + (f"CURRENT main.tf (FIX ALL D-11 ISSUES!):\n{(bp.get('codeStarter') or {}).get('terraformMain', '')[:5000]}\n" if tf_findings else "")
        + "\nReturn ONLY the JSON patch object now."
    )
    return sys_p, user_p


def apply_revision_patch(
    bp: Dict[str, Any],
    patch: Dict[str, Any],
    *,
    allowed_tags: Tuple[str, ...],
    sanitize_fn: Callable[[str], str],
    strip_emoji_fn: Callable[[str], str],
) -> List[str]:
    """Applies a surgical LLM auto-revision JSON patch in-place onto `bp`. Returns applied fix summary list."""
    applied: List[str] = [str(x)[:480] for x in (patch.get("appliedFixes") or []) if str(x).strip()][:10]
    new_sum = str(patch.get("summary") or "").strip()
    if len(new_sum) >= 40:
        bp["summary"] = sanitize_fn(new_sum)[:1600]
    for sp in (patch.get("sectionPatches") or [])[:8]:
        if not isinstance(sp, dict):
            continue
        hm = str(sp.get("headingMatch") or "").strip().lower()
        target = None
        if hm:
            for s in bp.get("sections") or []:
                if hm in str(s.get("heading") or "").lower():
                    target = s
                    break
        if target is None and (bp.get("sections") or []):
            target = bp["sections"][-1]
        if target is None:
            continue
        ap = str(sp.get("appendParagraph") or "").strip()
        if len(ap) >= 24:
            target.setdefault("paragraphs", []).append(sanitize_fn(ap))
        cb = sp.get("addCodeBlock")
        if isinstance(cb, dict) and str(cb.get("code") or "").strip():
            target.setdefault("codeBlocks", []).append({
                "language": re.sub(r"[^a-zA-Z0-9_-]", "", str(cb.get("language") or "sql"))[:16] or "sql",
                "caption": strip_emoji_fn(sanitize_fn(str(cb.get("caption") or "Verified snippet")))[:100],
                "code": sanitize_fn(str(cb.get("code") or "").strip())[:3200],
            })
        rt = sp.get("replaceTable")
        if isinstance(rt, dict) and isinstance(rt.get("headers"), list) and rt["headers"] and isinstance(rt.get("rows"), list) and rt["rows"]:
            hdrs = [strip_emoji_fn(sanitize_fn(str(h)))[:60] for h in rt["headers"][:6]]
            rows = []
            for rr in rt["rows"][:10]:
                if isinstance(rr, list) and rr:
                    row = [strip_emoji_fn(sanitize_fn(str(c)))[:180] for c in rr[: len(hdrs)]]
                    while len(row) < len(hdrs):
                        row.append("")
                    rows.append(row)
            if rows:
                target["table"] = {"headers": hdrs, "rows": rows}
    if isinstance(patch.get("claimLedger"), list) and len(patch["claimLedger"]) >= 3:
        updated_claims = []
        for ci, rc in enumerate(patch["claimLedger"][:16], 1):
            if not isinstance(rc, dict):
                continue
            prov = str(rc.get("provenance") or "EXAMPLE_TARGET").strip().upper()
            if prov not in allowed_tags:
                prov = "EXAMPLE_TARGET"
            updated_claims.append({
                "id": strip_emoji_fn(str(rc.get("id") or f"CLM-{ci:02d}"))[:16],
                "claim": strip_emoji_fn(sanitize_fn(str(rc.get("claim") or "")))[:180],
                "value": strip_emoji_fn(sanitize_fn(str(rc.get("value") or "")))[:80],
                "provenance": prov,
                "basis": strip_emoji_fn(sanitize_fn(str(rc.get("basis") or "")))[:240],
            })
        if updated_claims:
            bp["claimLedger"] = updated_claims
    new_tf = str(patch.get("terraformMain") or "").strip()
    if len(new_tf) >= 100 and "resource " in new_tf:
        bp.setdefault("codeStarter", {})["terraformMain"] = sanitize_fn(new_tf)
        if not any("terraform" in a.lower() for a in applied):
            applied.append("Updated main.tf with hardened Terraform v2 configuration.")
    return applied
