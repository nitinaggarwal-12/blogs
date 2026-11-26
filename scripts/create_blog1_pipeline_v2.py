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
    "a2a_agents, adk, agent_gateway, agent_registry, alloydb, api_gateway, apigee, artifact_registry, "
    "bigquery, bigtable, cloud_armor, cloud_build, cloud_dlp, cloud_iam, cloud_kms, cloud_load_balancing, "
    "cloud_logging, cloud_monitoring, cloud_nat, cloud_run, cloud_sql, cloud_storage, compute_engine, "
    "dataflow, eventarc, finops, firestore, gcp_cloud, gemini, gke, google_g, iap, looker, mcp_tools, "
    "memorystore, model_armor, psc, pubsub, saas_globe, scc, secret_manager, spanner, vertex_ai, vpc_sc, workflows"
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
        "Provide strictly grounded bullet points prioritizing official site:cloud.google.com documentation covering:\n"
        "1. Exact current GA/Preview Google Cloud product names, model lifecycles & deprecations (e.g., flag legacy names like 'Matching Engine' -> 'Vertex AI Vector Search'; note embedding model retirement dates such as text-embedding-005 -> gemini-embedding-001).\n"
        "2. Official syntax/DDL/API features relevant to this topic (e.g., Cloud Spanner Graph ISO GQL `CREATE PROPERTY GRAPH` / `GRAPH_TABLE` 2-stage ANN `MATCH (@{FORCE_INDEX=...}) ... NEXT MATCH`, Fine-Grained Access Control vs RLS & 100-role/database limit, Cloud Run v2 Terraform `google_cloud_run_v2_service` & `metadata.annotations['run.googleapis.com/ingress']`).\n"
        "3. Exact verified SLA (e.g., Enterprise regional 99.99% vs Enterprise Plus multi-region 99.999%), quota, pricing, or limit numbers from official cloud.google.com docs.\n"
        "4. Canonical https://cloud.google.com/... documentation URLs matching each verified topic (never link KNN docs for ANN vector indexes).\n"
        "Be strictly factual; if uncertain, explicitly state 'unverified'."
    )
    _supported_search_models = (
        "gemini-4-neon",
        "gemini-4-carbon",
        "gemini-4-argon",
        "gemini-4-hydrogen",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-3.1-pro-preview",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    )
    clean_model = model if model in _supported_search_models else "gemini-3.8-flash"
    is_g4 = clean_model.startswith("gemini-4")
    is_g3 = clean_model.startswith("gemini-3")
    if is_g4:
        # Gemini 4 requires global endpoint, thinkingLevel (not thinkingBudget), omits temperature,
        # and counts thinking tokens inside maxOutputTokens.
        gen_cfg: Dict[str, Any] = {
            "maxOutputTokens": 4096,
            "thinkingConfig": {"thinkingLevel": "LOW"},
        }
    elif is_g3:
        gen_cfg = {
            "temperature": 0.1,
            "maxOutputTokens": 4096,
            "thinkingConfig": {"thinkingLevel": "LOW"},
        }
    else:
        gen_cfg = {
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "thinkingConfig": {"thinkingBudget": 256},
        }
    body_obj = {
        "contents": [{"role": "user", "parts": [{"text": q_prompt}]}],
        "tools": [{"googleSearch": {}}],
        "generationConfig": gen_cfg,
    }
    payload = json.dumps(body_obj).encode("utf-8")
    eff_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()

    if eff_key:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": eff_key}
        mode = "gemini_api_google_search"
    else:
        token = get_bearer_token()
        if not token:
            return {"status": "UNAVAILABLE", "reason": "No bearer token available.", "summary": "", "queries": [], "sources": []}
        if is_g4 or is_g3:
            endpoint = (
                "https://aiplatform.googleapis.com/v1/projects/"
                f"{urllib.parse.quote(vertex_project, safe='')}/locations/global"
                f"/publishers/google/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
            )
        else:
            endpoint = (
                f"https://{vertex_location}-aiplatform.googleapis.com/v1/projects/"
                f"{urllib.parse.quote(vertex_project, safe='')}/locations/{urllib.parse.quote(vertex_location, safe='')}"
                f"/publishers/google/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
            )
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
        mode = "vertex_ai_google_search"

    t0 = time.perf_counter()
    data = None
    last_reason = ""
    for attempt in range(2):
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=max(float(timeout_s), 55.0)) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                break
        except urllib.error.HTTPError as exc:
            msg = ""
            try:
                msg = exc.read().decode("utf-8", errors="replace")[:260]
            except Exception:
                pass
            last_reason = f"Google Search grounding returned HTTP {exc.code}: {msg}"
            if exc.code in (429, 500, 502, 503, 504) and attempt == 0:
                time.sleep(2.0)
                continue
            break
        except Exception as exc:
            last_reason = str(exc)[:220]
            if attempt == 0:
                time.sleep(1.5)
                continue
            break
    if data is None:
        return {
            "status": "UNAVAILABLE",
            "mode": mode,
            "reason": last_reason,
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
    ver = str(starter_files.get("verify.sh") or "")
    py_app = str(starter_files.get("app.py") or "")
    sql_ddl = str(starter_files.get("schema.sql") or "")
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
    if "spec.template.metadata.annotations['run.googleapis.com/ingress']" in ver or 'spec.template.metadata.annotations["run.googleapis.com/ingress"]' in ver:
        findings.append({
            "id": "SH-BUG-01",
            "severity": "HIGH",
            "detail": "verify.sh reads Cloud Run ingress from spec.template.metadata.annotations (wrong revision path); must use top-level metadata.annotations['run.googleapis.com/ingress'].",
        })
    if re.search(r'\bCREATE\s+ROLE\b', sql_ddl, re.IGNORECASE) and re.search(r'roles/spanner\.databaseUser', active_tf):
        findings.append({
            "id": "TF-FGAC-01",
            "severity": "HIGH",
            "detail": "main.tf grants roles/spanner.databaseUser which bypasses Spanner FGAC roles defined in schema.sql; grant roles/spanner.fineGrainedAccessUser + roles/spanner.databaseRoleUser with a databaseRoles IAM condition instead.",
        })
    if "X-Goog-IAP-JWT-Assertion" in py_app and "verify_token" not in py_app:
        findings.append({
            "id": "PY-AUTH-01",
            "severity": "HIGH",
            "detail": "app.py reads X-Goog-IAP-JWT-Assertion without cryptographically verifying it via google.oauth2.id_token.verify_token(..., certs_url='https://www.gstatic.com/iap/verify/public_key-jwk').",
        })
    req_envs = sorted(set(re.findall(r'os\.environ\[\s*["\']([A-Z0-9_]+)["\']\s*\]', py_app)))
    if req_envs and active_tf:
        missing_tf_envs = [ev for ev in req_envs if ev not in active_tf]
        if missing_tf_envs:
            findings.append({
                "id": "PY-ENV-01",
                "severity": "HIGH",
                "detail": f"app.py requires os.environ keys {missing_tf_envs} that are missing from main.tf (guaranteed KeyError crash on startup).",
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
        "3. NEVER invent real customer emails, employee names, synthetic tenant placeholders ('acme', 'PolicyGraph'), internal shortlinks (go/...), issue IDs (b/...), or fake benchmarks. Anchor the technical narrative in ONE continuous, realistic enterprise workload scenario across sections (e.g., an on-call SRE or security engineer operating a regulated workload such as FinVault or RetailStream) so every control is grounded in a concrete request path.\n"
        "4. Write DEEP, publication-clean Google Cloud blog prose — keep inline `codeBlocks` surgical and concise (`8` to `22` lines proving ONE architectural invariant, policy, SQL/GQL query, or FinOps equation; give inline snippets descriptive architectural captions rather than filenames like `main.tf` or `app.py`, leaving full multi-resource files to `codeStarter`). Use exact language tags (`sql`, `hcl` for Terraform NEVER `yaml`, `python`, `bash`, `formula`), crisp comparative tables, failure modes, and compensating controls.\n"
        "5. Tag EVERY numeric claim/SLA/latency/cost assumption in `claimLedger` strictly as one of: "
        "GCP_DOCUMENTED | DERIVED_MODEL | EXAMPLE_TARGET | USER_SUPPLIED.\n"
        "6. Use current live Vertex AI model names (Gemini 4: gemini-4-neon / carbon / argon / hydrogen with location='global'; Gemini 3.x: gemini-3.8-flash; Gemini 2.5: gemini-2.5-pro / flash; embeddings: prefer gemini-embedding-001, or explicitly note text-embedding-005 retirement April 1, 2027) — NEVER invent non-existent model IDs like `gemini-4.0-flash` or `gemini-4-pro`, and NEVER reference retired Gemini 1.0/1.5 checkpoints.\n"
        "7. STRICT GCP ENGINEERING ACCURACY:\n"
        "   - External B2B SaaS Identity: ALWAYS use Identity Platform multi-tenancy + Workload Identity Federation (WIF) for external B2B SaaS customer tenants; NEVER recommend Workforce Identity Federation for external B2B SaaS users (Workforce WIF is strictly for an organization's own workforce/employees).\n"
        "   - Disaggregated Agentic Architecture (where agentic AI applies): separate the stateless Brain (Cloud Run v2 / Vertex AI Agent Engine), isolated zero-credential Hands (Agent Sandboxes in Gemini / gVisor), out-of-process Vault (Auth Manager / Secret Manager + Cloud KMS minting short-lived task-scoped 2LO/3LO credentials), and Policy Gateways (Model Armor + Cloud DLP).\n"
        "   - Gemini Context Caching: shared immutable system/tool prefix requires a 4,096-token minimum (delivering up to 90% input token savings); NEVER cite a stale 32,768-token minimum.\n"
        "   - Memory Bank in Gemini & Agent Identity: enforce exact-match scope keys plus perimeter Cloud IAM CEL conditions on `aiplatform.googleapis.com/memoryScope` (`roles/aiplatform.memoryUser`), and note Cloud Run Agent Identity (SPIFFE X.509 mTLS, Preview) where service-to-service agent auth applies.\n"
        "   - Google Cloud Model Armor ALWAYS requires a regional API endpoint (`modelarmor.<region>.rep.googleapis.com` via `ClientOptions(api_endpoint=...)`) and regional template resource paths (`projects/<project>/locations/<region>/templates/<template>`); NEVER use `locations/global/templates/...` or an unconfigured default `ModelArmorClient()`.\n"
        "   - Cloud Spanner Graph + ANN vector search (`APPROX_COSINE_DISTANCE`) MUST use the 2-stage pattern `MATCH (@{FORCE_INDEX=...} src:Label) ... ORDER BY distance LIMIT @k NEXT MATCH (src)-[rel:...]->(dst:...)` (a single-stage join silently defeats the vector index!).\n"
        "   - Cloud Spanner FGAC has a hard quota of 100 database roles per database (use workload/service-tier roles + mandatory parameterized `@tenantId`, NEVER claim 1:1 per-tenant DB roles for >100 SaaS tenants!). Grant `roles/spanner.fineGrainedAccessUser` + conditional `roles/spanner.databaseRoleUser`, NEVER `roles/spanner.databaseUser` when using FGAC; ensure the runtime role actually has `INSERT`/`UPDATE` privileges on every table it mutates.\n"
        "   - Cloud Spanner Editions: Enterprise is regional-only (99.99% SLA; us-central1 list rate $1.23/hr per 1,000 PUs = 3 replicas x $0.41/replica-hr); 99.999% multi-region SLA requires Enterprise Plus.\n"
        "   - Cloud Run ingress describe MUST check top-level `metadata.annotations['run.googleapis.com/ingress']` (NEVER `spec.template.metadata.annotations`).\n"
        "   - IAP JWTs expire in 600s (10 min), verify via `google.oauth2.id_token.verify_token(..., certs_url='https://www.gstatic.com/iap/verify/public_key-jwk')`, and extract identity via `email`/`sub`/`hd` or `gcip.firebase.tenant`.\n"
        "   - NEVER reference services (like Memorystore) in diagrams unless provisioned in Terraform and costed in FinOps.\n"
        "8. Zero emojis in headings, bullets, tables, or labels. Real public https://cloud.google.com/ URLs matching each exact topic (use `/spanner/docs/find-approximate-nearest-neighbors` for ANN vector indexes, NOT `/find-k-nearest-neighbors`)."
    )


def prose_stage_user_prompt(
    prompt: str,
    title_hint: str,
    domain: str,
    audience: str,
    grounding: Dict[str, Any],
    category_meta: Optional[Dict[str, Any]] = None,
    outline: Optional[List[Dict[str, Any]]] = None,
    include_starter_code: bool = True,
) -> str:
    g_text = (grounding.get("summary") or "").strip()
    g_block = (
        f"LIVE_SEARCH_GROUNDING (status={grounding.get('status')}, verified {grounding.get('checkedAt', '')}):\n{g_text[:4800]}\n\n"
        if g_text
        else "LIVE_SEARCH_GROUNDING: unavailable (be conservative; mark unverified numbers as EXAMPLE_TARGET or DERIVED_MODEL).\n\n"
    )
    enabled_secs = [
        str(x.get("title") or "").strip()
        for x in (outline or [])
        if isinstance(x, dict) and x.get("type") == "section" and x.get("enabled") and str(x.get("title") or "").strip()
    ]
    cat_name = str((category_meta or {}).get("name") or "Reference Architecture (Full Stack)")
    cat_desc = str((category_meta or {}).get("description") or "")
    schema = {
        "title": "Concise flagship technical title (<= 85 chars, plain text, zero emojis)",
        "subtitle": "One-sentence Google Cloud Architecture Center subtitle (<= 135 chars)",
        "slugHint": "short-kebab-case-slug",
        "summary": "2-4 sentence executive BLUF stating problem, architecture thesis, core trade-off, and scope",
        "audience": audience,
        "domain": domain,
        "estimatedReadMinutes": 16 if len(enabled_secs) >= 6 else 10,
        "keyTakeaways": ["4 crisp actionable takeaways (plain text, ZERO **bold** markers or emojis)"],
        "sections": [
            {
                "heading": "Section heading (e.g. '1. Executive Thesis & Architectural Problem')",
                "paragraphs": ["2-4 detailed, meaty technical paragraphs (~120-180 words each) with concrete mechanisms, edge cases, and design rationale."],
                "bullets": ["Crisp engineering bullet points (include concrete parameters/flags)"],
                "codeBlocks": [
                    {"language": "sql|hcl|bash|formula|python", "caption": "Short descriptive label", "code": "Real runnable/verified DDL, ISO GQL query, HCL policy, FinOps latency/cost formula, or CLI command."}
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
    if enabled_secs:
        sec_lines = "\n".join(f"  {i}. {h}" for i, h in enumerate(enabled_secs, 1))
        code_req = (
            "- Include `codeBlocks` on at least 3 sections (realistic SQL/DDL/GQL, formula math, HCL/bash verify)."
            if include_starter_code
            else "- Starter code kit is DISABLED for this category; include `formula` math or policy `codeBlocks` only where genuinely helpful (no forced Terraform boilerplate)."
        )
        depth_block = (
            f"BLOG CATEGORY: {cat_name}" + (f" — {cat_desc}" if cat_desc else "") + "\n"
            f"REQUIRED EXACT ORDERED SECTIONS ({len(enabled_secs)} sections — match the user's outline order 1:1!):\n"
            f"{sec_lines}\n"
            f"- Author ALL {len(enabled_secs)} sections in that exact order, totaling ~{max(1800, len(enabled_secs) * 480)} to {max(2800, len(enabled_secs) * 720)} words of authentic technical depth.\n"
            f"- Include structured `table` on at least {min(4, max(2, len(enabled_secs) - 1))} sections (`<= 6` columns, `4-7` concrete rows each).\n"
            f"{code_req}\n"
            "- Include 6 to 12 `claimLedger` entries covering EVERY SLA, latency, quota, or cost target in prose/formulas.\n"
            "- Include 5 to 7 sharp `faq` items addressing real failure modes, cost surprises, and migration complexity.\n"
            "- Include 6 to 12 verified public `https://cloud.google.com/` URLs in `references`.\n\n"
        )
    else:
        depth_block = (
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
        )
    return (
        f"{g_block}"
        f"USER TOPIC / PROMPT:\n{prompt.strip()}\n\n"
        f"TITLE HINT: {title_hint.strip() or '(derive crisp title)'}\n"
        f"DOMAIN / PILLAR: {domain.strip() or 'Enterprise AI Architecture'}\n"
        f"PRIMARY AUDIENCE: {audience.strip() or 'Solutions Architects & Platform Engineers'}\n\n"
        f"{depth_block}"
        "Return ONLY JSON matching:\n" + json.dumps(schema, indent=2)
    )


def topology_stage_system_prompt(slide_plan: Optional[Dict[str, Any]] = None) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_slides = int((slide_plan or {}).get("totalSlides") or 12)
    inc_code = bool((slide_plan or {}).get("includeStarterCode", True))
    code_rule = (
        "5. Hardened `codeStarter` MUST be 100% consistent with `blog.md` (same graph/table/column/env-var/service names — NEVER use placeholder 'PolicyGraph' or 'acme'!):\n"
        "   - `terraformMain`: MUST use `google_cloud_run_v2_service` with `ingress = \"INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER\"`, ZERO `allUsers` or `allAuthenticatedUsers`, set EVERY `os.environ[...]` variable read by `pythonApp`, declare any `data` block referenced, and when using Spanner FGAC grant `roles/spanner.fineGrainedAccessUser` + conditional `roles/spanner.databaseRoleUser` (NEVER `roles/spanner.databaseUser`!).\n"
        "   - `pythonApp`: MUST be complete, syntactically valid Python 3.11 (`ast.parse()` verified), cryptographically verify `X-Goog-IAP-JWT-Assertion` via `google.oauth2.id_token.verify_token(..., certs_url='https://www.gstatic.com/iap/verify/public_key-jwk')`, use `from google import genai` with valid live Vertex AI model IDs (`gemini-4-neon` with `location='global'`, or `gemini-2.5-pro`/`gemini-2.5-flash` — NEVER invent `gemini-4.0-flash`), configure regional `ClientOptions(api_endpoint=f'modelarmor.{region}.rep.googleapis.com')` and regional `locations/{region}/templates/...` whenever using Model Armor, pass `database_role=...` for Spanner FGAC, and ONLY reference tables/columns/graphs that exist verbatim in `schemaSql`!\n"
        "   - `dockerfile` & `requirementsTxt`: MUST be complete and runnable for `gcloud builds submit`.\n"
        "   - `deploySh`: MUST use `--no-allow-unauthenticated` and pass the exact same env vars & service account as `terraformMain`.\n"
        "   - `verifySh`: MUST check Cloud Run ingress via top-level `metadata.annotations['run.googleapis.com/ingress']` (NEVER `spec.template.metadata.annotations`), verify zero `allUsers|allAuthenticatedUsers`, and match what the closing slide describes.\n"
        if inc_code
        else "5. Starter code kit is DISABLED for this category: set `codeStarter` to `{}` (do NOT generate Terraform, Dockerfile, or Python boilerplate!).\n"
    )
    return (
        f"Today is {today}. You are a Principal Google Cloud Solutions Architect generating the structured "
        f"{total_slides}-slide executive deck"
        + (" and hardened Terraform v2 + Python 3.11 + Dockerfile starter kit " if inc_code else " ")
        + "matching a flagship blog article with 100% SINGLE-SOURCE-OF-TRUTH consistency. STRICT RULES:\n"
        "1. Output ONLY valid JSON (no markdown wrappers outside JSON).\n"
        "2. ZERO emojis and ZERO inline markdown asterisks (**bold** or `backticks`) inside diagram labels, "
        "slide titles, slide bullets, table cells, or speaker notes! Write clean plain English text everywhere.\n"
        "3. NEVER print raw enum names like `(EXAMPLE_TARGET)` or `(DERIVED_MODEL)` on slides; use natural language.\n"
        "4. `iconKey` MUST be selected strictly from this allowed list:\n"
        f"   {ALLOWED_ICON_KEYS_LIST}\n"
        f"{code_rule}"
        f"6. Speaker notes for ALL {total_slides} slides must be natural, humanized, conversational spoken narration "
        "(2-4 clear sentences each, ~55-90 words, zero markdown punctuation, never say 'Slide 1' or 'Architecture 1') AND MUST match the EXACT visual content on each slide."
    )


def topology_stage_user_prompt(
    prose_bp: Dict[str, Any],
    prompt: str,
    grounding: Dict[str, Any],
    slide_plan: Optional[Dict[str, Any]] = None,
) -> str:
    sec_brief = [
        {"heading": s.get("heading"), "hasTable": bool(s.get("table")), "hasCode": bool(s.get("codeBlocks"))}
        for s in (prose_bp.get("sections") or [])
    ]
    inline_code_ctx = []
    for s in (prose_bp.get("sections") or []):
        for cb in (s.get("codeBlocks") or []):
            if isinstance(cb, dict) and cb.get("code"):
                inline_code_ctx.append({"section": s.get("heading"), "language": cb.get("language"), "caption": cb.get("caption"), "code": str(cb.get("code"))})
    g_snippet = (grounding.get("summary") or "")
    total_slides = int((slide_plan or {}).get("totalSlides") or 12)
    inc_code = bool((slide_plan or {}).get("includeStarterCode", True))
    code_slide = (slide_plan or {}).get("codeSlide", 9 if inc_code else None)
    proof_slide = int((slide_plan or {}).get("proofSlide") or (10 if inc_code else 9))
    table_slide = int((slide_plan or {}).get("tableSlide") or (11 if inc_code else 10))
    closing_slide = int((slide_plan or {}).get("closingSlide") or total_slides)
    enabled_diags = list((slide_plan or {}).get("enabledDiagrams") or [])

    schema: Dict[str, Any] = {
        "slides": [
            {
                "number": 1,
                "kicker": "EXECUTIVE BRIEF",
                "title": "Clean plain-text title (<= 60 chars, no ** or emojis)",
                "subtitle": "Concise action subtitle (<= 100 chars)",
                "bullets": ["3-4 crisp plain-text bullets (no ** or emojis, <= 95 chars each)"],
                "calloutLabel": "Optional metric label",
                "calloutValue": "Clean grounded figure ONLY (e.g. '1,200 ms p95 TTFT' — NO raw '(EXAMPLE_TARGET)' enum!)",
                "table": {"headers": ["Col A", "Col B", "Col C"], "rows": [["v1", "v2", "v3"]]},
                "codeSnippet": f"Short verified snippet from schemaSql (slide {code_slide} ONLY)" if code_slide else "",
                "speakerNotes": "Conversational spoken narration (55-90 words, plain prose, strictly matching this slide's visual).",
            }
        ],
    }
    if inc_code:
        schema["codeStarter"] = {
            "readmeSummary": "Review, security-scan, and terraform plan notes listing all included files including schema.sql, Dockerfile, and requirements.txt.",
            "schemaSql": "-- Complete valid DDL/SQL/ISO GQL matching the data/security sections verbatim",
            "terraformMain": "# Complete hardened Terraform using google_cloud_run_v2_service (NO allUsers, NO roles/spanner.databaseUser if FGAC!)",
            "terraformVars": "# Terraform variable declarations matching every var.* in terraformMain",
            "pythonApp": "# Complete syntactically valid Python 3.11 FastAPI app with IAP JWT verify_token + google-genai + exact schemaSql tables/columns",
            "dockerfile": "FROM python:3.11-slim\n...",
            "requirementsTxt": "fastapi\nuvicorn\n...",
            "deploySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
            "verifySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
        }
    else:
        schema["codeStarter"] = {}

    diag_lines: List[str] = []
    if enabled_diags:
        for d in enabled_diags:
            diag_lines.append(
                f"  {d['slideNumber']}=Figure {d['figureNum']} {d['title']} ({d['layer']} — narrate the exact visual diagram faithfully)"
            )
    else:
        diag_lines = [
            "  3=Figure 1 Master Platform Architecture (C4 L2 — narrate the 3-plane 5-stage platform flow)",
            "  4=Figure 2 Cloud Architecture Center Hub-and-Spoke Blueprint (narrate the hub-and-spoke VPC-SC perimeter & sync/async spokes)",
            "  5=Figure 3 End-to-End Request Lifecycle Sequence (C4 L3 — narrate the actual 6 actor-to-actor hops)",
            "  6=Figure 4 Trust Perimeter & Defense-in-Depth Security Boundary (C4 L1 — narrate the 4 layers, threats & HTTP 401/403/422/429 breakers)",
            "  7=Figure 5 Wire-Protocol & Payload Transformation (C4 L4 — narrate the 4 wire hops accurately)",
            "  8=Figure 6 Async State, CDC Export & Recovery Loop (narrate Change Streams -> Dataflow -> BigQuery + GCS Dead-Letter Bucket)",
        ]

    cadence_lines = [
        f"EXACT {total_slides}-SLIDE CADENCE REQUIRED (MUST MATCH RENDERED DIAGRAMS 1:1):",
        f"- `slides`: EXACTLY {total_slides} slides:",
        "  1=Cover & BLUF (3 concise takeaways <= 145 chars each so nothing ever clips!)",
        "  2=Challenge & Design Goals (with clean callout metric — zero '(EXAMPLE_TARGET)' enum!)",
        *diag_lines,
    ]
    if code_slide:
        cadence_lines.append(
            f"  {code_slide}=Implementation Guardrails & Starter Code (include concise verified `codeSnippet` matching `schemaSql` verbatim — NEVER 'PolicyGraph'!)"
        )
    cadence_lines.extend([
        f"  {proof_slide}=Verified Live Console & SaaS Proofs (specify 2 crisp BEFORE/AFTER capture bullets <= 85 chars each; no fake screenshots)",
        f"  {table_slide}=Latency Budget, Cost Math & Service Trade-Offs (table MUST include explicit monthly dollar cost estimates + latency column, consistent with prose!)",
        f"  {closing_slide}=Production Readiness Checklist & Rollout Plan (crisp actionable rollout steps"
        + (" — Step 4 MUST accurately describe what `verify.sh` actually checks!" if inc_code else "")
        + ")",
    ])
    return (
        f"ALIGN WITH BLOG TITLE: {prose_bp.get('title')}\n"
        f"SUBTITLE: {prose_bp.get('subtitle')}\n"
        f"SUMMARY: {prose_bp.get('summary')}\n"
        f"SECTIONS: {json.dumps(sec_brief)}\n"
        f"INLINE CODE IN BLOG (codeStarter MUST share identical graph/table/column/service/env names!):\n{json.dumps(inline_code_ctx, indent=2)}\n\n"
        f"CLAIMS: {json.dumps(prose_bp.get('claimLedger') or [])}\n"
        f"ORIGINAL PROMPT:\n{prompt.strip()}\n\n"
        + (f"GROUNDING NOTES:\n{g_snippet}\n\n" if g_snippet else "")
        + "\n".join(cadence_lines)
        + "\n\nReturn ONLY JSON matching:\n" + json.dumps(schema, indent=2)
    )


def build_auto_revision_prompt(
    bp: Dict[str, Any],
    judge_r1: Dict[str, Any],
    tf_findings: List[Dict[str, str]],
    grounding: Dict[str, Any],
) -> Tuple[str, str]:
    sys_p = (
        "You are a Principal Google Cloud Solutions Architect performing a surgical peer-review revision. "
        "Apply IN-PLACE targeted fixes for EVERY genuine P0/P1 DDL/SQL/security/clarity finding and Terraform security finding. "
        "NEVER remove or downgrade real current GA/Preview Google Cloud products or Gemini 4 / Gemini 3.x / Gemini 2.5 models verified in the grounding dossier. "
        "NEVER replace the customer-facing `summary` with a changelog note like 'Revised the architecture document...'. "
        "Do NOT invent fake claims, fake benchmarks, emojis, internal links, or `allUsers` bindings. "
        "Output ONLY a JSON object with any subset of these keys:\n"
        '{"summary":"optional updated READER-FACING executive BLUF (leave empty to keep existing)",'
        '"keyTakeaways":["optional full 4 corrected plain-text takeaways (<=145 chars each)"],'
        '"appliedFixes":["short description of each actual in-place fix applied"],'
        '"textReplacements":[{"old":"exact buggy substring inside prose/code/slides/diagrams/DDL","new":"exact corrected replacement"}],'
        '"sectionPatches":[{"headingMatch":"substring heading","appendParagraph":"...","replaceTable":null,"replaceCodeBlocks":[{"language":"sql|hcl|python|bash|formula","caption":"...","code":"..."}]}],'
        '"schemaSql":"full corrected schema.sql DDL string",'
        '"pythonApp":"full corrected Python 3.11 app.py string (with cryptographic IAP JWT verify_token + exact schemaSql tables/columns)",'
        '"claimLedger":[...full updated ledger array if fixing claims...],'
        '"terraformMain":"full hardened main.tf (google_cloud_run_v2_service, zero allUsers, FGAC role IAM instead of databaseUser)",'
        '"deploySh":"full hardened deploy.sh (--no-allow-unauthenticated)",'
        '"verifySh":"full corrected verify.sh (metadata.annotations[\'run.googleapis.com/ingress\'])"}'
    )
    findings = judge_r1.get("findings") or []
    code_excerpts = []
    for s in (bp.get("sections") or [])[:10]:
        for cb in (s.get("codeBlocks") or [])[:4]:
            if isinstance(cb, dict) and cb.get("code"):
                code_excerpts.append({
                    "section": s.get("heading"),
                    "language": cb.get("language"),
                    "caption": cb.get("caption"),
                    "code": str(cb.get("code") or ""),
                })
    starter = bp.get("codeStarter") or {}
    schema_sql = str(starter.get("schemaSql") or "")
    py_app = str(starter.get("pythonApp") or "")
    tf_main = str(starter.get("terraformMain") or "")
    dep_sh = str(starter.get("deploySh") or "")
    ver_sh = str(starter.get("verifySh") or "")
    user_p = (
        f"TITLE: {bp.get('title')}\n"
        f"KEY TAKEAWAYS: {json.dumps(bp.get('keyTakeaways') or [])}\n"
        f"ROUND 1 JUDGE: verdict={judge_r1.get('verdict')} score={judge_r1.get('score')}\n"
        f"JUDGE SUMMARY: {judge_r1.get('summary')}\n\n"
        f"JUDGE FINDINGS TO FIX IN PLACE:\n{json.dumps(findings, indent=2)}\n\n"
        f"DETERMINISTIC SECURITY / CODE FINDINGS (D-11):\n{json.dumps(tf_findings, indent=2)}\n\n"
        f"LIVE GOOGLE SEARCH GROUNDING DOSSIER:\n{(grounding.get('summary') or 'N/A')}\n\n"
        f"CURRENT SECTION HEADINGS:\n{json.dumps([s.get('heading') for s in (bp.get('sections') or [])])}\n\n"
        f"CURRENT INLINE CODE BLOCKS (fix any buggy SQL/DDL/Python/HCL/ingress syntax using `textReplacements` or `sectionPatches[].replaceCodeBlocks`):\n"
        f"{json.dumps(code_excerpts, indent=2)}\n\n"
        + (f"CURRENT schema.sql:\n{schema_sql}\n\n" if schema_sql else "")
        + (f"CURRENT starter app.py:\n{py_app}\n\n" if py_app else "")
        + f"CURRENT CLAIM LEDGER:\n{json.dumps(bp.get('claimLedger') or [], indent=2)}\n\n"
        + (f"CURRENT main.tf:\n{tf_main}\n\n" if tf_main else "")
        + (f"CURRENT deploy.sh:\n{dep_sh}\n\n" if dep_sh else "")
        + (f"CURRENT verify.sh:\n{ver_sh}\n\n" if ver_sh else "")
        + "\nReturn ONLY the JSON patch object now."
    )
    return sys_p, user_p


def _is_meta_changelog_summary(text: str) -> bool:
    low = str(text or "").strip().lower()
    prefixes = (
        "revised the ",
        "revised this ",
        "updated the architecture document",
        "updated the blog",
        "addressed critical",
        "applied fixes",
        "changes made:",
        "this revision ",
    )
    return any(low.startswith(p) for p in prefixes)


def _walk_replace_strings(obj: Any, repls: List[Tuple[str, str]]) -> Tuple[Any, int]:
    """Recursively applies exact string replacements across nested dicts/lists and counts actual matches."""
    if isinstance(obj, str):
        out = obj
        hits = 0
        for o, n in repls:
            if o in out:
                cnt = out.count(o)
                out = out.replace(o, n)
                hits += cnt
        return out, hits
    if isinstance(obj, list):
        total = 0
        new_l = []
        for item in obj:
            nv, h = _walk_replace_strings(item, repls)
            new_l.append(nv)
            total += h
        return new_l, total
    if isinstance(obj, dict):
        total = 0
        new_d = {}
        for k, v in obj.items():
            nv, h = _walk_replace_strings(v, repls)
            new_d[k] = nv
            total += h
        return new_d, total
    return obj, 0


def apply_revision_patch(
    bp: Dict[str, Any],
    patch: Dict[str, Any],
    *,
    allowed_tags: Tuple[str, ...],
    sanitize_fn: Callable[[str], str],
    strip_emoji_fn: Callable[[str], str],
) -> List[str]:
    """
    Applies a surgical LLM auto-revision JSON patch in-place onto `bp`.
    HONESTY INVARIANT: Never blindly echoes unverified LLM `appliedFixes` claims — returns ONLY
    programmatically verified mutations where `before != after` actually changed in `bp`.
    """
    verified_applied: List[str] = []
    new_sum = str(patch.get("summary") or "").strip()
    if len(new_sum) >= 40 and not _is_meta_changelog_summary(new_sum):
        cleaned_sum = sanitize_fn(new_sum)
        if cleaned_sum != bp.get("summary"):
            bp["summary"] = cleaned_sum
            verified_applied.append("Updated executive BLUF summary in-place.")

    if isinstance(patch.get("keyTakeaways"), list) and len(patch["keyTakeaways"]) >= 3:
        new_kts = [strip_emoji_fn(sanitize_fn(str(x))).strip() for x in patch["keyTakeaways"] if str(x).strip()][:6]
        if new_kts and new_kts != (bp.get("keyTakeaways") or []):
            bp["keyTakeaways"] = new_kts
            verified_applied.append(f"Updated {len(new_kts)} Executive Summary Key Takeaways in-place.")

    # True in-place string replacements across ALL user-visible fields (including keyTakeaways & all 6 diagrams!)
    # Protect live GA/Preview models (Gemini 4 / Gemini 3.x / Gemini 2.5) from spurious downgrade to Gemini 1.0/1.5
    _downgrade_old_re = re.compile(r"gemini[-\s]*(?:2\.5|3(?:\.\d+)?|4(?:[-\s]*(?:neon|carbon|argon|hydrogen))?)", re.IGNORECASE)
    _downgrade_new_re = re.compile(r"gemini[-\s]*(?:1\.0|1\.5)", re.IGNORECASE)
    repls: List[Tuple[str, str]] = []
    for rr in (patch.get("textReplacements") or [])[:32]:
        if isinstance(rr, dict):
            old_s = str(rr.get("old") or "")
            new_s = str(rr.get("new") or "")
            if _downgrade_old_re.search(old_s) and _downgrade_new_re.search(new_s):
                continue
            if len(old_s.strip()) >= 4 and old_s != new_s:
                repls.append((old_s, sanitize_fn(new_s)))

    if repls:
        for o, n in repls:
            single_hits = 0
            # Apply across title, subtitle, summary, keyTakeaways, sections, slides, codeStarter, faq, and all 7 diagrams
            for top_k in ("title", "subtitle", "summary", "keyTakeaways", "sections", "slides", "codeStarter", "faq",
                          "conceptDiagram", "platformDiagram", "cloudArchDiagram", "sequenceDiagram", "securityDiagram", "wireDiagram", "asyncDiagram"):
                if top_k in bp and bp[top_k] is not None:
                    nv, h = _walk_replace_strings(bp[top_k], [(o, n)])
                    if h:
                        bp[top_k] = nv
                        single_hits += h
            if single_hits > 0:
                short_o = o.replace("\n", " ").strip()
                short_n = n.replace("\n", " ").strip()
                if len(short_o) > 48:
                    short_o = short_o[:45] + "..."
                if len(short_n) > 48:
                    short_n = short_n[:45] + "..."
                verified_applied.append(f"Verified replacement ({single_hits}x): '{short_o}' -> '{short_n}'.")

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
        sec_name = str(target.get("heading") or "section")
        ap = str(sp.get("appendParagraph") or "").strip()
        if len(ap) >= 24:
            cleaned_ap = sanitize_fn(ap)
            target.setdefault("paragraphs", []).append(cleaned_ap)
            verified_applied.append(f"Appended clarifying paragraph to '{sec_name}'.")
        rcb = sp.get("replaceCodeBlocks")
        if isinstance(rcb, list) and rcb:
            cleaned_cbs = []
            for cb in rcb[:4]:
                if isinstance(cb, dict) and str(cb.get("code") or "").strip():
                    lang_raw = re.sub(r"[^a-zA-Z0-9_-]", "", str(cb.get("language") or "sql")) or "sql"
                    code_full = sanitize_fn(str(cb.get("code") or "").strip())
                    if lang_raw.lower() == "yaml" and ('resource "' in code_full or 'provider "' in code_full):
                        lang_raw = "hcl"
                    cleaned_cbs.append({
                        "language": lang_raw,
                        "caption": strip_emoji_fn(sanitize_fn(str(cb.get("caption") or "Verified snippet"))),
                        "code": code_full,
                    })
            if cleaned_cbs:
                target["codeBlocks"] = cleaned_cbs
                verified_applied.append(f"Replaced {len(cleaned_cbs)} full code block(s) in '{sec_name}' (zero truncation).")
        cb = sp.get("addCodeBlock")
        if isinstance(cb, dict) and str(cb.get("code") or "").strip():
            lang_raw = re.sub(r"[^a-zA-Z0-9_-]", "", str(cb.get("language") or "sql")) or "sql"
            code_full = sanitize_fn(str(cb.get("code") or "").strip())
            if lang_raw.lower() == "yaml" and ('resource "' in code_full or 'provider "' in code_full):
                lang_raw = "hcl"
            target.setdefault("codeBlocks", []).append({
                "language": lang_raw,
                "caption": strip_emoji_fn(sanitize_fn(str(cb.get("caption") or "Verified snippet"))),
                "code": code_full,
            })
            verified_applied.append(f"Added verified code block in '{sec_name}'.")
        rt = sp.get("replaceTable")
        if isinstance(rt, dict) and isinstance(rt.get("headers"), list) and rt["headers"] and isinstance(rt.get("rows"), list) and rt["rows"]:
            hdrs = [strip_emoji_fn(sanitize_fn(str(h))) for h in rt["headers"][:6]]
            rows = []
            for rr in rt["rows"][:10]:
                if isinstance(rr, list) and rr:
                    row = [strip_emoji_fn(sanitize_fn(str(c))) for c in rr[: len(hdrs)]]
                    while len(row) < len(hdrs):
                        row.append("")
                    rows.append(row)
            if rows:
                target["table"] = {"headers": hdrs, "rows": rows}
                verified_applied.append(f"Updated comparison/data table in '{sec_name}'.")

    if isinstance(patch.get("claimLedger"), list) and len(patch["claimLedger"]) >= 3:
        updated_claims = []
        for ci, rc in enumerate(patch["claimLedger"][:16], 1):
            if not isinstance(rc, dict):
                continue
            prov = str(rc.get("provenance") or "EXAMPLE_TARGET").strip().upper()
            if prov not in allowed_tags:
                prov = "EXAMPLE_TARGET"
            updated_claims.append({
                "id": strip_emoji_fn(str(rc.get("id") or f"CLM-{ci:02d}")),
                "claim": strip_emoji_fn(sanitize_fn(str(rc.get("claim") or ""))),
                "value": strip_emoji_fn(sanitize_fn(str(rc.get("value") or ""))),
                "provenance": prov,
                "basis": strip_emoji_fn(sanitize_fn(str(rc.get("basis") or ""))),
            })
        if updated_claims and updated_claims != (bp.get("claimLedger") or []):
            bp["claimLedger"] = updated_claims
            verified_applied.append(f"Updated Claim Provenance Ledger ({len(updated_claims)} claims).")

    cs = bp.setdefault("codeStarter", {})
    for p_key, cs_key, min_len, label in (
        ("schemaSql", "schemaSql", 60, "starter schema.sql"),
        ("pythonApp", "pythonApp", 80, "starter app.py"),
        ("terraformMain", "terraformMain", 120, "starter main.tf"),
        ("terraformVars", "terraformVars", 30, "starter variables.tf"),
        ("deploySh", "deploySh", 24, "starter deploy.sh"),
        ("verifySh", "verifySh", 24, "starter verify.sh"),
    ):
        val = str(patch.get(p_key) or "").strip()
        if p_key == "deploySh" and not val:
            val = str(patch.get("deployScript") or "").strip()
        if len(val) >= min_len:
            if p_key == "terraformMain" and "resource " not in val:
                continue
            cleaned_v = sanitize_fn(val)
            if cleaned_v != cs.get(cs_key):
                cs[cs_key] = cleaned_v
                verified_applied.append(f"Updated full {label} in-place ({len(cleaned_v)} chars, zero truncation).")
    return verified_applied


def diagram_architect_system_prompt() -> str:
    return (
        "You are a Principal Google Cloud Architecture Center Illustrator & Systems Architect. "
        "Your ONLY job is to synthesize extraordinarily dense, quantified, WS1-grade technical blueprints for the requested diagrams "
        "driving a deterministic 1600x900 parametric Draw.io / SVG / DrawingML compiler.\n\n"
        "RULES — CRITICAL FOR TECHNICAL DEPTH:\n"
        "- NEVER write vague marketing blurbs ('Hosts the API', 'Stores data', 'Secures traffic').\n"
        "- EVERY card bullet MUST contain concrete engineering specifics matching the blog prose & Claim Ledger EXACTLY (same latency budget, same `min_instance_count`, same edition/SLA, same graph/role/column names!). NEVER contradict the blog's latency budget or invent services like Memorystore that are NOT provisioned in Terraform!\n"
        "- NEVER use placeholder names like 'acme', 'tenant_acme_reader', or 'PolicyGraph'.\n"
        "- For `conceptDiagram`, design a crisp 6-card executive mental-model diagram: 3 concrete left `pillars` (kicker, title, detail <=110 chars, icon), 1 central `gate` (kicker, title, icon, 4 bullets <=48 chars), `allowOutcome` (kicker, title, icon, 3 bullets), `denyOutcome` (kicker, title, icon, 3 bullets), and 5 short `principles` (<=30 chars each).\n"
        "- For bi-temporal queries in `wireDiagram`, ALWAYS use valid point-in-time predicates `(r.superseded_at IS NULL OR r.superseded_at > @asOf)` (NEVER bare `superseded_at IS NULL`!), use the exact graph/label names from the blog, and emit valid syntax.\n"
        "- For `securityDiagram`, align `threats[0..3]` 1-to-1 with `layers[0..3]` and set `layerIndex` (0..3) explicitly so every dashed arrow connects each threat to its exact defending layer!\n"
        "- For `sequenceDiagram`, set exact `fromIdx` (0..4) and `toIdx` (0..4) on EVERY step matching the REAL call graph (e.g., API actor 2 calls AI actor 3 AND Data actor 4, then API actor 2 returns HTTP 200 to Caller actor 0 — NEVER draw Vertex AI calling Spanner!). Include `iconKey` on all 5 actors.\n"
        "- For `cloudArchDiagram`, provide accurate `edgeLabels` (`sec0`, `sec1`, `sec2`, `spokeA`, `spokeB`), set `spokeB.mode` to `'async'` when Spoke B is Change Streams/CDC (fed from Spoke A, NOT from Cloud Run!), and place Private Service Connect / Entry at Spoke A `nodes[0]`, Primary Data Engine at `nodes[1]`, Vertex AI at `nodes[2]`, KMS/Secondary at `nodes[3]`.\n"
        "- Keep strings concise so they fit neatly inside their boxes (headings <= 30 chars, caller tier titles <= 24 chars, short bullets <= 34 chars).\n"
        "- Use ONLY valid icon keys from: " + ALLOWED_ICON_KEYS_LIST + " (use `dataflow` for Cloud Dataflow!).\n"
        "- Reference current Vertex AI models requested by the prompt (e.g., Gemini 4 Neon, Gemini 3.8 Flash, Gemini 2.5 Pro) — NEVER write retired 'Gemini 1.5 Pro' or 'Gemini 1.0'.\n"
        "- Zero emojis. Zero markdown `**bold**` asterisks. Zero internal/corp URLs.\n\n"
        "Output ONLY a single JSON object containing the requested subset of these top-level diagram keys:\n"
        "{\n"
        '  "conceptDiagram": {\n'
        '    "headline": "Core Design Principle & Isolation Invariants — concise topic headline",\n'
        '    "pillars": [\n'
        '      {"kicker":"1 · LOCK 1","title":"concise lock title (<=38 chars)","detail":"1 crisp engineering sentence <=105 chars","icon":"cloud_iam"}, ... 3 pillars exact\n'
        '    ],\n'
        '    "gate": {"kicker":"NON-NEGOTIABLE INVARIANT GATE","title":"concise gate name <=38 chars","icon":"model_armor","bullets":["b1 <=46 chars","b2","b3","b4"]},\n'
        '    "allowOutcome": {"kicker":"VERIFIED ALLOWED PATH (200 OK)","title":"concise allowed outcome <=38 chars","icon":"spanner","bullets":["b1 <=48 chars","b2","b3"]},\n'
        '    "denyOutcome": {"kicker":"DETERMINISTIC BLOCK (401 / 403 / 429)","title":"concise blocked outcome <=38 chars","icon":"scc","bullets":["b1 <=48 chars","b2","b3"]},\n'
        '    "principles": ["Principle 1","Principle 2","Principle 3","Principle 4","Principle 5"]\n'
        '  },\n'
        '  "platformDiagram": {\n'
        '    "controlPlaneTitle": "Google Cloud — Shared Governance & Control Plane (exact target from Claim Ledger)",\n'
        '    "callerLabel": "Caller Tiers",\n'
        '    "targetsLabel": "Targets & APIs",\n'
        '    "controlCards": [\n'
        '      {"title":"Stage 1 · Auth & IAP","icon":"cloud_iam","bullets":["line 1 (<=42 chars)","line 2 (<=42 chars)"]}, ... 3 cards exact\n'
        '    ],\n'
        '    "callerTiers": [\n'
        '      {"title":"Tier 1: ... (<=24 chars)","subtitle":"short metric/role"}, ... 3 tiers exact\n'
        '    ],\n'
        '    "identityStage": {"title":"Stage 1A · ...","icon":"cloud_iam","bullets":["b1","b2","b3","b4"]},\n'
        '    "ingressStage": {"title":"Stage 1B · ...","icon":"cloud_load_balancing","bullets":["b1","b2","b3","b4"]},\n'
        '    "frontEnd": {"title":"Front End","subtitle":"Entry stack","tiles":[{"icon":"gemini","label":"Gemini"},{"icon":"cloud_run","label":"Run v2"},{"icon":"spanner","label":"Spanner"},{"icon":"bigquery","label":"BQ Audit"}]},\n'
        '    "inboundGateway": {"header":"Ingress PEP","title":"Stage 2 · ...","icon":"agent_gateway","bullets":["b1","b2","b3","b4"]},\n'
        '    "coreRuntime": {"title":"Stage 3 · ...","service":"Cloud Run v2 (Private)","subtitle":"Orchestrator Name","icon":"cloud_run","bullets":["b1","b2","b3","b4","b5"]},\n'
        '    "outboundGateway": {"header":"Egress PEP","title":"Stage 4 · ...","icon":"agent_gateway","bullets":["b1","b2","b3","b4"]},\n'
        '    "targets": [{"title":"...","subtitle":"..."}, ... 4 targets exact],\n'
        '    "hotStateCard": {"title":"Tenant Context &","title2":"Policy Guard","icon":"cloud_iam","bullets":["ONLY services provisioned in Terraform — NEVER invent Memorystore!","b2","b3","b4"]},\n'
        '    "dataBankCard": {"title":"Primary Data & Isolation Tiers","tiers":["Row 1 (<=48 chars)","Row 2 (<=48 chars)","Row 3 (<=48 chars)"]},\n'
        '    "finopsCard": {"title":"FinOps &","title2":"Bulkhead","icon":"finops","bullets":["Match Section 6 cost & min_instance_count!","b2","b3","b4"]},\n'
        '    "observabilityBar": {"title":"Observability & Fail-Closed Breakers — HTTP 401 / 403 / 422 / 429","subtitle":"short pipe-separated summary <= 95 chars"},\n'
        '    "planeGuide": {\n'
        '      "title":"WHO RUNS WHAT — PLANE OWNERSHIP GUIDE",\n'
        '      "rows":[\n'
        '        {"plane":"CONTROL","headline":"short scope","detail":"1 concise sentence naming concrete components"},\n'
        '        {"plane":"COMPUTE","headline":"short scope","detail":"1 concise sentence naming concrete components"},\n'
        '        {"plane":"DATA","headline":"short scope","detail":"1 concise sentence naming concrete components"}\n'
        '      ],\n'
        '      "footnote":"1 crisp orientation sentence"\n'
        '    }\n'
        '  },\n'
        '  "cloudArchDiagram": {\n'
        '    "caller": {"title":"Authenticated Client / Agent","subtitle":"HTTPS TLS 1.3 + IAP JWT"},\n'
        '    "perimeterLabel":"Google Cloud Edge + VPC Service Controls Organization Perimeter",\n'
        '    "vpcLabel":"VPC • Zero-Trust Private Ingress & Private Service Connect",\n'
        '    "edgeLabels":{"sec0":"WAF / L7 policy","sec1":"IAP JWT verify","sec2":"VPC-SC perimeter","spokeA":"CMEK & PITR","spokeB":"Streaming load"},\n'
        '    "routingHub": {\n'
        '      "title":"Routing Hub (Ingress & Policy Enforcement)",\n'
        '      "subtitle":"short description",\n'
        '      "securityNodes":[{"title":"...","subtitle":"...","icon":"cloud_armor"}, ... 3 nodes matching sec0..sec2],\n'
        '      "alb":{"title":"External Application LB","subtitle":"...","icon":"cloud_load_balancing"},\n'
        '      "runtime":{"title":"Cloud Run v2 API","subtitle":"...","icon":"cloud_run"}\n'
        '    },\n'
        '    "governanceHub": {\n'
        '      "title":"Central Governance & Security Hub",\n'
        '      "subtitle":"short description",\n'
        '      "nodes":[{"title":"...","subtitle":"...","icon":"scc"}, ... 3 nodes]\n'
        '    },\n'
        '    "spokeA": {\n'
        '      "outerLabel":"Isolation Boundary A • Primary Sync Path",\n'
        '      "title":"...","subtitle":"...",\n'
        '      "nodes":[{"title":"Private Service Connect","subtitle":"...","icon":"psc"}, {"title":"Primary Data Engine","subtitle":"...","icon":"spanner"}, {"title":"Vertex AI Model","subtitle":"...","icon":"gemini"}, {"title":"KMS CMEK / PITR","subtitle":"...","icon":"cloud_kms"}]\n'
        '    },\n'
        '    "spokeB": {\n'
        '      "mode":"async",\n'
        '      "outerLabel":"Isolation Boundary B • Async CDC & Compliance Analytics",\n'
        '      "title":"...","subtitle":"...",\n'
        '      "nodes":[{"title":"Change Streams","subtitle":"...","icon":"spanner"}, {"title":"Cloud Dataflow","subtitle":"...","icon":"dataflow"}, {"title":"GCS Archive & DLQ","subtitle":"...","icon":"cloud_storage"}, {"title":"BigQuery Analytics","subtitle":"...","icon":"bigquery"}]\n'
        '    }\n'
        '  },\n'
        '  "sequenceDiagram": {\n'
        '    "actors": [\n'
        '      {"box":"CALLER","label":"...","planes":[],"iconKey":"saas_globe"},\n'
        '      {"box":"EDGE","label":"ALB + Armor + IAP","planes":["CONTROL"],"iconKey":"iap"},\n'
        '      {"box":"API","label":"Cloud Run v2 API","planes":["CONTROL","COMPUTE"],"iconKey":"cloud_run"},\n'
        '      {"box":"AI / KMS","label":"Vertex AI & KMS","planes":["COMPUTE"],"iconKey":"gemini"},\n'
        '      {"box":"DATA","label":"Primary Data Store","planes":["DATA"],"iconKey":"spanner"}\n'
        '    ],\n'
        '    "steps": [{"fromIdx":0,"toIdx":1,"kind":"request","title":"action name WITHOUT leading 1. number","detail":"concise 6-10 word detail","wire":"arrow label <=28 chars"}, ... 6 steps exact with ACCURATE fromIdx/toIdx!],\n'
        '    "guardBadge":"short 2-3 word tag",\n'
        '    "highlightBox":{"title":"...","subtitle":"...","metric":"..."},\n'
        '    "otelBullets":["bullet 1 <=28 chars","bullet 2 <=28 chars"],\n'
        '    "stageSummaries":[{"title":"1. ...","headline":"Exact latency matching Section 6!","detail":"..."}, ... 3 stages],\n'
        '    "legendStrip":{"control":"...","compute":"...","data":"..."}\n'
        '  },\n'
        '  "securityDiagram": {\n'
        '    "layers":[{"layer":"L1 · ...","name":"...","detail":"...","iconKey":"..."}, ... 4 layers],\n'
        '    "threats":[{"id":"T-01","layerIndex":0,"vector":"Threat stopped by L1","control":"..."}, ... 4 threats aligned 1:1 with layers 0..3!],\n'
        '    "breakers":[{"code":"HTTP 401","trigger":"..."}, {"code":"HTTP 403","trigger":"..."}, {"code":"HTTP 422","trigger":"..."}, {"code":"HTTP 429","trigger":"..."}]\n'
        '  },\n'
        '  "wireDiagram": {\n'
        '    "hops":[{"hop":"HOP 1 · ...","name":"concise envelope name","transport":"HTTPS / TLS 1.3","iconKey":"...","added":["+ REQUIRED field/header 1","+ REQUIRED field/header 2","+ REQUIRED field/header 3"],"stripped":["- header1","- field2"],"payload":"3-4 short \\n-escaped lines using exact blog schema (ZERO acme, ZERO PolicyGraph, valid bi-temporal predicates!)"}, ... 4 hops EXACT]\n'
        '  },\n'
        '  "asyncDiagram": {\n'
        '    "stages":[{"stage":"1. ...","service":"...","cadence":"Continuous","iconKey":"...","slo":"Stage 1 · ...","bullets":["b1","b2","b3","b4"]}, ... 4 stages (use iconKey=dataflow for Dataflow!)],\n'
        '    "dlqNote":"1-2 sentences on GCS dead-letter bucket, backoff & audit reconciliation",\n'
        '    "feedbackLabel":"Drift Alert & Ops Reconciliation"\n'
        '  }\n'
        "}\n"
    )


def diagram_architect_user_prompt(
    prose_raw: Dict[str, Any],
    topic_prompt: str,
    grounding: Dict[str, Any],
    enabled_kinds: Optional[List[str]] = None,
) -> str:
    sec_headings = [s.get("heading", "") for s in (prose_raw.get("sections") or [])[:10] if isinstance(s, dict)]
    claims = (prose_raw.get("claimLedger") or [])[:8]
    g_sum = str((grounding or {}).get("summary") or "").strip()[:2800]
    kind_to_bp = {
        "concept": "conceptDiagram",
        "architecture": "platformDiagram",
        "cloudarch": "cloudArchDiagram",
        "sequence": "sequenceDiagram",
        "security": "securityDiagram",
        "wire": "wireDiagram",
        "async": "asyncDiagram",
    }
    req_keys = [kind_to_bp[k] for k in (enabled_kinds or list(kind_to_bp.keys())) if k in kind_to_bp]
    if not req_keys:
        req_keys = list(kind_to_bp.values())
    diag_instruction = (
        f"Synthesize the ultra-crisp, domain-specific JSON specification for ONLY these {len(req_keys)} enabled diagram keys: {', '.join(req_keys)}. Omit disabled diagram keys. Output ONLY valid raw JSON."
    )
    return (
        f"TITLE: {prose_raw.get('title', '')}\n"
        f"SUBTITLE: {prose_raw.get('subtitle', '')}\n"
        f"EXECUTIVE SUMMARY: {str(prose_raw.get('summary') or '')[:900]}\n"
        f"SECTION HEADINGS: {json.dumps(sec_headings)}\n"
        f"VERIFIED CLAIMS SAMPLE: {json.dumps(claims)[:1400]}\n\n"
        f"ORIGINAL USER REQUEST:\n{topic_prompt[:2000]}\n\n"
        + (f"LIVE GOOGLE SEARCH GROUNDING DOSSIER:\n{g_sum}\n\n" if g_sum else "")
        + diag_instruction
    )

