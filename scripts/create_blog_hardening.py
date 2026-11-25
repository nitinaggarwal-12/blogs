#!/usr/bin/env python3
"""
Hardening & Grounding Verification Primitives for the Unified Create Blog Studio.

Ports and consolidates all high-value production safeguards:
  1. Google Search grounding redirect resolution + groundingSupports segment binding + D-13 numeric claim gate.
  2. Static in-memory Python AST safety validator + Terraform/shell destructive command scanner.
  3. Post-build OOXML (.pptx/.docx) package integrity & residual exemplar leak validator.
  4. PNG/JPEG EXIF/XMP/ancillary metadata stripping + Gemini Vision OCR F-13/PII leak scanner.
  5. Strict SVG XSS/foreignObject/external-href sanitizer.
  6. Multi-replica Cloud Run GCS ifGenerationMatch CAS locking, 36 MiB resumable uploads & 256 MiB /tmp LRU eviction.
  7. Stateless HMAC-SHA256 CSRF token minting & verification.
"""

from __future__ import annotations

import ast
import base64
from datetime import datetime, timezone
import hashlib
import hmac
import http.client
import io
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import socket
import ssl
import struct
import sys
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

sys.dont_write_bytecode = True

DEFAULT_GCP_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "ramp-portal-dev"
DEFAULT_VERTEX_LOCATION = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
TMP_CACHE_BUDGET_BYTES = 256 * 1024 * 1024
RESUMABLE_THRESHOLD_BYTES = 36 * 1024 * 1024
CSRF_TOKEN_TTL_SEC = 8 * 3600

_REDIRECT_HOST = "vertexaisearch.cloud.google.com"
_REDIRECT_PATH_PREFIX = "/grounding-api-redirect/"
_ALLOWED_DOC_HOSTS = frozenset({"cloud.google.com", "docs.cloud.google.com"})
_ALLOWED_DOC_URL_RE = re.compile(r"^https://(?:docs\.)?cloud\.google\.com/[A-Za-z0-9/_#?=&.%+-]+$")

_SAFE_PNG_CHUNKS: Set[bytes] = {
    b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB", b"bKGD", b"pHYs",
}

TEMPLATE_LEAK_TOKENS: Tuple[str, ...] = (
    "FinVault", "RetailStream", "Cymbal Bank", "MedCore", "Globex",
    "cymbal-ge-hub-2026", "cymbal-ge-silo-2026", "HXGGFMZBKE", "IZVODT083Q",
    "ZS9VGYHBQL", "TWQU0KSRVF", "K5JAEFCQ6E", "TERCK8SLBP", "CCMDEVZV2S",
    "RAOTMUMJTZ", "G767QR3TQZ", "C7EYM614F2",
)

# Optional test-only dependency injection hooks (kept None in production)
_TEST_REDIRECT_RESOLVER_FN: Optional[Callable[[str], str]] = None
_TEST_URL_HEAD_FN: Optional[Callable[[str], bool]] = None
_TEST_OCR_INSPECTOR_FN: Optional[Callable[[bytes, str], str]] = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# 1. Grounding Redirect Resolution, HEAD Verification & Segment Binding
# ---------------------------------------------------------------------------
def _is_public_global_ip(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        if not infos:
            return False
        for info in infos:
            ip_obj = ipaddress.ip_address(info[4][0])
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
                or ip_obj.is_unspecified
            ):
                return False
        return True
    except Exception:
        return False


def resolve_grounding_redirect_url(uri: str, resolver_fn: Optional[Callable[[str], str]] = None) -> str:
    """Resolves Vertex AI grounding redirect URLs pinned strictly to vertexaisearch.cloud.google.com."""
    u = str(uri or "").strip()
    if not u:
        return ""
    if _ALLOWED_DOC_URL_RE.fullmatch(u):
        return u
    fn = resolver_fn or _TEST_REDIRECT_RESOLVER_FN
    if fn is not None:
        resolved = str(fn(u) or "").strip()
        return resolved if _ALLOWED_DOC_URL_RE.fullmatch(resolved) else ""
    parsed = urllib.parse.urlparse(u)
    if (
        parsed.scheme != "https"
        or (parsed.hostname or "").lower() != _REDIRECT_HOST
        or not parsed.path.startswith(_REDIRECT_PATH_PREFIX)
    ):
        return ""
    if not _is_public_global_ip(_REDIRECT_HOST):
        return ""
    ctx = ssl.create_default_context()
    conn = http.client.HTTPSConnection(_REDIRECT_HOST, 443, timeout=6.0, context=ctx)
    try:
        path_q = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        conn.request("GET", path_q, headers={"Host": _REDIRECT_HOST, "User-Agent": "GEAP-Grounding-Verifier/1.0"})
        resp = conn.getresponse()
        loc = str(resp.getheader("Location") or "").strip()
        if resp.status in (301, 302, 303, 307, 308) and _ALLOWED_DOC_URL_RE.fullmatch(loc):
            return loc
        return ""
    except Exception:
        return ""
    finally:
        try:
            conn.close()
        except Exception:
            pass


def verify_cloud_google_doc_url(url: str, head_fn: Optional[Callable[[str], bool]] = None) -> bool:
    """FA-08-safe HTTPS HEAD verification pinned strictly to cloud.google.com and docs.cloud.google.com."""
    cur = str(url or "").strip()
    if not _ALLOWED_DOC_URL_RE.fullmatch(cur):
        return False
    fn = head_fn or _TEST_URL_HEAD_FN
    if fn is not None:
        return bool(fn(cur))
    ctx = ssl.create_default_context()
    for _ in range(4):
        parsed = urllib.parse.urlparse(cur)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or host not in _ALLOWED_DOC_HOSTS:
            return False
        if not _is_public_global_ip(host):
            return False
        path_q = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")
        conn = http.client.HTTPSConnection(host, 443, timeout=6.0, context=ctx)
        try:
            conn.request("HEAD", path_q, headers={"Host": host, "User-Agent": "GEAP-Doc-Link-Verifier/1.0"})
            resp = conn.getresponse()
            status = resp.status
            loc = str(resp.getheader("Location") or "").strip()
        except Exception:
            return False
        finally:
            try:
                conn.close()
            except Exception:
                pass
        if status in (200, 206):
            return True
        if status in (301, 302, 303, 307, 308) and loc:
            cur = f"https://{host}{loc}" if loc.startswith("/") else loc
            if not _ALLOWED_DOC_URL_RE.fullmatch(cur):
                return False
            continue
        return False
    return False


def _extract_numeric_tokens_from_value(val: str) -> List[str]:
    s = str(val or "").strip()
    tokens = re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?(?:\s*%|[KMBkmb])?", s)
    return [t.strip() for t in tokens if t.strip()]


def bind_and_validate_grounding_metadata(
    grounding_meta: Dict[str, Any],
    bp: Dict[str, Any],
    *,
    allowed_provenance_tags: Tuple[str, ...],
    sanitize_fn: Callable[[str], str],
    redirect_resolver: Optional[Callable[[str], str]] = None,
    head_checker: Optional[Callable[[str], bool]] = None,
) -> Dict[str, Any]:
    """
    1. Resolves Pass-1 groundingChunks[].web.uri redirect URLs and HEAD-verifies against cloud.google.com.
    2. Maps groundingSupports[].segment.text to resolved chunk URLs (requiring confidence >= 0.6 when present).
    3. Enforces two-condition GCP_DOCUMENTED rule on bp['claimLedger'] when groundingSupports are present.
    4. Filters & enriches bp['references'] with verified cloud.google.com URLs.
    """
    raw_chunks = grounding_meta.get("groundingChunks") or []
    if not raw_chunks and isinstance(grounding_meta.get("sources"), list):
        raw_chunks = [
            {"web": {"uri": s.get("url") or s.get("uri") or "", "title": s.get("title") or ""}}
            for s in grounding_meta["sources"]
            if isinstance(s, dict)
        ]

    resolved_chunk_urls: Dict[int, str] = {}
    verified_sources: List[Dict[str, str]] = []
    seen_urls: Set[str] = set()

    for idx, ch in enumerate(raw_chunks):
        web = (ch.get("web") if isinstance(ch, dict) else None) or {}
        raw_uri = str(web.get("uri") or "").strip()
        title = sanitize_fn(str(web.get("title") or "Google Cloud Documentation"))[:140]
        resolved = resolve_grounding_redirect_url(raw_uri, resolver_fn=redirect_resolver)
        if resolved and verify_cloud_google_doc_url(resolved, head_fn=head_checker):
            resolved_chunk_urls[idx] = resolved
            if resolved not in seen_urls:
                seen_urls.add(resolved)
                verified_sources.append({"title": title, "url": resolved})

    supports = grounding_meta.get("groundingSupports") or []
    url_to_support_texts: Dict[str, List[str]] = {}
    for sup in supports:
        if not isinstance(sup, dict):
            continue
        seg = sup.get("segment") or {}
        seg_text = str(seg.get("text") or "").strip()
        if not seg_text:
            continue
        conf_list = sup.get("confidenceScores") or []
        if conf_list and all(isinstance(c, (int, float)) and float(c) < 0.6 for c in conf_list):
            continue
        for c_idx in (sup.get("groundingChunkIndices") or []):
            if isinstance(c_idx, int) and c_idx in resolved_chunk_urls:
                u = resolved_chunk_urls[c_idx]
                url_to_support_texts.setdefault(u, []).append(seg_text)

    # Validate & enrich references[]
    valid_refs: List[Dict[str, str]] = []
    seen_ref_urls: Set[str] = set()
    for ref in (bp.get("references") or []):
        if not isinstance(ref, dict):
            continue
        ru = str(ref.get("url") or "").strip()
        if _ALLOWED_DOC_URL_RE.fullmatch(ru) and verify_cloud_google_doc_url(ru, head_fn=head_checker):
            if ru not in seen_ref_urls:
                seen_ref_urls.add(ru)
                valid_refs.append({
                    "title": sanitize_fn(str(ref.get("title") or "Google Cloud Documentation"))[:140],
                    "url": ru,
                    "note": sanitize_fn(str(ref.get("note") or "Verified reference"))[:180],
                })
    for vs in verified_sources:
        if vs["url"] not in seen_ref_urls:
            seen_ref_urls.add(vs["url"])
            valid_refs.append({"title": vs["title"], "url": vs["url"], "note": "Pass-1 Search Grounded Source"})
    if valid_refs:
        bp["references"] = valid_refs[:10]

    # Enforce strict two-condition GCP_DOCUMENTED provenance rule on claimLedger
    downgraded_claims: List[str] = []
    if supports or verified_sources:
        for clm in (bp.get("claimLedger") or []):
            if not isinstance(clm, dict):
                continue
            prov = str(clm.get("provenance") or "EXAMPLE_TARGET").strip().upper()
            if prov not in allowed_provenance_tags:
                prov = "EXAMPLE_TARGET"
            src_url = str(clm.get("sourceUrl") or "").strip()
            val_str = str(clm.get("value") or "").strip()
            if prov == "GCP_DOCUMENTED":
                sup_segments = url_to_support_texts.get(src_url) or []
                sup_blob = " ".join(sup_segments).lower()
                val_low = val_str.lower()
                num_toks = _extract_numeric_tokens_from_value(val_str)
                cond1 = src_url in url_to_support_texts
                cond2 = bool(sup_segments) and (
                    (val_low and val_low in sup_blob)
                    or (num_toks and all(nt.lower() in sup_blob for nt in num_toks))
                )
                if not (cond1 and cond2):
                    clm["provenance"] = "DERIVED_MODEL"
                    clm["basis"] = (
                        f"{clm.get('basis') or 'Model synthesis'} "
                        "(reclassified from GCP_DOCUMENTED: unverified in Pass-1 grounding segment)"
                    )
                    downgraded_claims.append(str(clm.get("id") or clm.get("claim") or ""))
            else:
                clm["provenance"] = prov

    return {
        "status": "GROUNDED" if verified_sources else str(grounding_meta.get("status") or "UNGROUNDED"),
        "checkedAt": _now_iso(),
        "queries": [
            sanitize_fn(str(q))[:160]
            for q in (grounding_meta.get("webSearchQueries") or grounding_meta.get("queries") or [])[:8]
        ],
        "sources": verified_sources,
        "resolvedChunkCount": len(resolved_chunk_urls),
        "supportSegmentCount": sum(len(v) for v in url_to_support_texts.values()),
        "downgradedClaims": downgraded_claims,
    }


# ---------------------------------------------------------------------------
# 2. Deterministic Gate D-13: Numeric Claim & Provenance Coverage
# ---------------------------------------------------------------------------
_D13_QUANT_REGEX = re.compile(
    r"""(?ix)
    (?:
        \$\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[KMBT]\b)?
        |
        \b\d+(?:,\d{3})*(?:\.\d+)?\s*USD\b
        |
        \b\d+(?:,\d{3})*(?:\.\d+)?
        (?:\s*-\s*|\s+)?
        (?:
            %
            | [KMB]\s*-\s*tokens?\b
            | [KMB]\s+tokens?\b
            | tokens?\b
            | ns\b | µs\b | us\b | ms\b | sec\b | secs\b | seconds?\b
            | mins?\b | minutes?\b | hrs?\b | hours?\b | days?\b
            | KiB\b | MiB\b | GiB\b | TiB\b | PiB\b
            | KB\b | MB\b | GB\b | TB\b | PB\b | bytes\b
            | req/s\b | rps\b | qps\b | tps\b | iops\b | rpm\b | tpm\b
            | bps\b | kbps\b | mbps\b | gbps\b | tbps\b | mb/s\b | gb/s\b
            | vcpus?\b | cpus?\b | cores?\b | nodes?\b | instances?\b | replicas?\b
            | pods?\b | workers?\b | shards?\b | tenants?\b | regions?\b | zones?\b
            | x\b
        )
        |
        \b\d{1,3}(?:,\d{3})+\b
        |
        \b\d{3,}\s+[a-z]{3,16}\b
    )
    """
)

_D13_STRUCTURAL_ALLOW_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(
        r"(?i)^(?:http|status|code|error)?\s*"
        r"(?:100|101|200|201|202|204|206|301|302|303|304|307|308|"
        r"400|401|403|404|405|409|412|413|416|422|423|429|500|502|503|504)"
        r"(?:\s+[a-z]+)?$"
    ),
    re.compile(r"(?i)^(?:199\d|20[0-3]\d)(?:\s+[a-z]+)?$"),
    re.compile(r"(?i)^(?:1|2|3|4|5|6|7|8|9|10|11|12)\s*(?:layers?|steps?|hops?|slides?)$"),
    re.compile(r"(?i)^(?:256|384|512|1024|1280|1440|1600|1920|2048|2560|4096)\s*[a-z]*$"),
    re.compile(r"(?i)^(?:100%)\s*$"),
    re.compile(r"(?i)^0\s+[a-z/]+$"),
)

_D13_CONTEXT_EXEMPT_RE = re.compile(
    r"(?i)(?:tls\s*1\.[23]|http/[123](?:\.\d)?|rfc\s*\d{3,5}|sha-\d{3}|p-\d{3}|aes-\d{3}|gcm-\d{3}|rsa-\d{3,4}|"
    r"oauth\s*2\.[01]|openid\s*1\.0|21\s*cfr\s*part\s*11|ipv[46]|169\.254\.169\.254|127\.0\.0\.1|"
    r"1600x900|1920x1080|1280x720|2560x1440|slide\s+\d+|step\s+\d+|hop\s+\d+|phase\s+\d+|part\s+\d+|"
    r"layer\s+\d+|section\s+\d+|figure\s+\d+|table\s+\d+|round\s+\d+|d-\d{2})"
)


def strip_fenced_code_blocks_keep_inline(md_text: str) -> str:
    """Strips ```...``` fenced code blocks and YAML frontmatter while keeping inline `...` code spans."""
    text = re.sub(r"\A---\n.*?\n---\n", "\n", str(md_text or ""), flags=re.S)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    return text


def check_d13_numeric_claim_coverage(bp: Dict[str, Any], md_text: str) -> Tuple[bool, List[str]]:
    """Scans non-fenced prose across blog.md, slides, and speaker notes against bp['claimLedger']."""
    ledger = bp.get("claimLedger") or []
    ledger_values_raw: List[str] = []
    ledger_numbers: Set[str] = set()
    for c in ledger:
        if not isinstance(c, dict):
            continue
        v = str(c.get("value") or "").strip()
        if not v:
            continue
        ledger_values_raw.append(v.lower())
        for n in re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?", v):
            ledger_numbers.add(n)
            ledger_numbers.add(n.replace(",", ""))

    prose_chunks: List[str] = [strip_fenced_code_blocks_keep_inline(md_text)]
    for sl in (bp.get("slides") or []):
        if not isinstance(sl, dict):
            continue
        for fld in ("title", "subtitle", "calloutLabel", "calloutValue", "speakerNotes"):
            if sl.get(fld):
                prose_chunks.append(str(sl[fld]))
        for b in (sl.get("bullets") or []):
            prose_chunks.append(str(b))
        tbl = sl.get("table")
        if isinstance(tbl, dict):
            for row in (tbl.get("rows") or []):
                if isinstance(row, list):
                    for cell in row:
                        prose_chunks.append(str(cell))

    combined = _D13_CONTEXT_EXEMPT_RE.sub(" ", "\n".join(prose_chunks))

    unledgered: List[str] = []
    for m in _D13_QUANT_REGEX.finditer(combined):
        expr = re.sub(r"\s+", " ", m.group(0).strip())
        expr_low = expr.lower()
        if any(pat.fullmatch(expr) for pat in _D13_STRUCTURAL_ALLOW_PATTERNS):
            continue
        nums = re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?", expr)
        if not nums:
            continue
        matched = False
        if any(expr_low in lv or lv in expr_low for lv in ledger_values_raw):
            matched = True
        elif all((n in ledger_numbers or n.replace(",", "") in ledger_numbers) for n in nums):
            matched = True
        if not matched and expr not in unledgered:
            unledgered.append(expr)

    return (len(unledgered) == 0, unledgered)


def auto_bind_unledgered_claims_in_place(bp: Dict[str, Any], unledgered: List[str]) -> None:
    """Binds unledgered quantitative expressions into claimLedger as EXAMPLE_TARGET during normalization/auto-revision."""
    ledger = bp.setdefault("claimLedger", [])
    existing_vals = {str(c.get("value") or "").strip().lower() for c in ledger if isinstance(c, dict)}
    next_idx = len(ledger) + 1
    for expr in unledgered[:24]:
        if expr.strip().lower() in existing_vals:
            continue
        ledger.append({
            "id": f"CLM-{next_idx:02d}",
            "claim": f"Modeled architectural metric ({expr})",
            "value": expr,
            "provenance": "EXAMPLE_TARGET",
            "basis": "Auto-bound illustrative engineering target during D-13 numeric coverage pass",
        })
        existing_vals.add(expr.strip().lower())
        next_idx += 1


# ---------------------------------------------------------------------------
# 3. In-Memory Static Python AST & Destructive Command Guard
# ---------------------------------------------------------------------------
_BANNED_PYTHON_MODULES: Set[str] = {
    "subprocess", "pty", "ctypes", "cffi", "socket", "multiprocessing",
    "pickle", "marshal", "shelve", "importlib", "builtins",
}
_BANNED_PYTHON_CALLS: Set[str] = {
    "eval", "exec", "compile", "__import__", "open",
    "os.system", "os.popen", "os.spawn", "os.spawnl", "os.spawnle", "os.spawnlp",
    "os.spawnlpe", "os.spawnv", "os.spawnve", "os.spawnvp", "os.spawnvpe",
    "os.execl", "os.execle", "os.execlp", "os.execlpe", "os.execv", "os.execve",
    "os.execvp", "os.execvpe", "os.fork", "os.kill", "os.remove", "os.unlink",
    "shutil.rmtree",
}


def validate_generated_python_ast_safe(py_source: str) -> Tuple[bool, str]:
    """Static in-memory AST check blocking dangerous imports, exec primitives, and metadata IP literals."""
    src = str(py_source or "")
    if "169.254.169.254" in src or "metadata.google.internal" in src:
        return (False, "Disallowed metadata server endpoint literal in generated Python code.")
    try:
        tree = ast.parse(src, filename="app.py")
    except SyntaxError as exc:
        return (False, f"SyntaxError at line {exc.lineno}: {exc.msg}")

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                top = (alias.name or "").split(".")[0]
                if top in _BANNED_PYTHON_MODULES:
                    return (False, f"Disallowed import '{alias.name}' in generated starter code.")
        elif isinstance(node, ast.ImportFrom):
            mod = (node.module or "").split(".")[0]
            if mod in _BANNED_PYTHON_MODULES:
                return (False, f"Disallowed from-import '{node.module}' in generated starter code.")
        elif isinstance(node, ast.Call):
            fn_name = ""
            if isinstance(node.func, ast.Name):
                fn_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name):
                    fn_name = f"{node.func.value.id}.{node.func.attr}"
                else:
                    fn_name = node.func.attr
            if fn_name in _BANNED_PYTHON_CALLS or fn_name.startswith(("os.exec", "os.spawn", "subprocess.")):
                return (False, f"Disallowed call '{fn_name}' in generated starter code.")
    return (True, "")


_DESTRUCTIVE_CMD_PATTERNS: Tuple[Tuple[str, str], ...] = (
    (r"(?i)\bgcloud\s+projects\s+delete\b", "SH-DESTRUCT-01: gcloud projects delete is forbidden"),
    (r"(?i)\b(?:gsutil|gcloud\s+storage)\s+rm\b", "SH-DESTRUCT-02: cloud storage rm is forbidden"),
    (r"(?i)\bDROP\s+(?:TABLE|DATABASE|SCHEMA|VIEW)\b", "SQL-DESTRUCT-01: DROP statement is forbidden"),
    (r"(?i)\bTRUNCATE\s+TABLE\b", "SQL-DESTRUCT-02: TRUNCATE statement is forbidden"),
    (r"(?i)\bterraform\s+destroy\b", "TF-DESTRUCT-01: automated terraform destroy is forbidden"),
)


def scan_starter_security_and_destructive_cmds(
    starter_files: Dict[str, str],
    base_tf_scanner: Optional[Callable[[Dict[str, str]], List[Dict[str, str]]]] = None,
) -> List[Dict[str, str]]:
    findings = list(base_tf_scanner(starter_files)) if base_tf_scanner is not None else []
    for fname, content in (starter_files or {}).items():
        txt = str(content or "")
        for pat, msg in _DESTRUCTIVE_CMD_PATTERNS:
            if re.search(pat, txt):
                cid, detail = msg.split(": ", 1)
                findings.append({"id": cid, "file": fname, "severity": "P0", "detail": detail})
    return findings


# ---------------------------------------------------------------------------
# 4. Post-Build OOXML Package Integrity & Template-Leak Validator
# ---------------------------------------------------------------------------
def validate_ooxml_package_integrity(
    pptx_bytes: bytes,
    docx_bytes: bytes,
    prompt_text: str = "",
    expected_slides: int = 12,
) -> Dict[str, Any]:
    errors: List[str] = []
    prompt_low = str(prompt_text or "").lower()
    active_forbid = [tok for tok in TEMPLATE_LEAK_TOKENS if tok.lower() not in prompt_low]

    try:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as zf:
            names = set(zf.namelist())
            if "[Content_Types].xml" not in names or "ppt/presentation.xml" not in names:
                errors.append("pptx: missing [Content_Types].xml or ppt/presentation.xml")
            else:
                ct_root = ET.fromstring(zf.read("[Content_Types].xml"))
                overrides = {
                    el.attrib.get("PartName", "").lstrip("/")
                    for el in ct_root
                    if el.tag.endswith("Override")
                }
                default_exts = {
                    el.attrib.get("Extension", "").lower()
                    for el in ct_root
                    if el.tag.endswith("Default")
                }
                for member in names:
                    if member == "[Content_Types].xml" or member.endswith("/"):
                        continue
                    ext = member.rsplit(".", 1)[-1].lower() if "." in member else ""
                    if member not in overrides and ext not in default_exts:
                        errors.append(f"pptx: uncovered part in [Content_Types].xml: {member}")

                pres_root = ET.fromstring(zf.read("ppt/presentation.xml"))
                sld_ids = [el for el in pres_root.iter() if el.tag.endswith("sldId")]
                if len(sld_ids) != expected_slides:
                    errors.append(f"pptx: sldIdLst count {len(sld_ids)} != expected {expected_slides}")

                referenced_media: Set[str] = set()
                for rel_name in [n for n in names if n.endswith(".rels")]:
                    rel_root = ET.fromstring(zf.read(rel_name))
                    base_dir = Path(rel_name).parent.parent
                    for rel_el in rel_root:
                        if not rel_el.tag.endswith("Relationship"):
                            continue
                        tgt = rel_el.attrib.get("Target", "")
                        tmode = rel_el.attrib.get("TargetMode", "")
                        if tmode == "External":
                            if not tgt.startswith("https://"):
                                errors.append(f"pptx: non-HTTPS external relationship target {tgt} in {rel_name}")
                            continue
                        norm_p = os.path.normpath(os.path.join(base_dir.as_posix(), tgt)).lstrip("./")
                        if norm_p not in names:
                            errors.append(f"pptx: broken internal relationship {tgt} -> {norm_p} in {rel_name}")
                        if norm_p.startswith("ppt/media/"):
                            referenced_media.add(norm_p)

                for media_part in [n for n in names if n.startswith("ppt/media/")]:
                    if media_part not in referenced_media:
                        errors.append(f"pptx: orphan unreferenced media part {media_part}")

                for i in range(1, expected_slides + 1):
                    sp = f"ppt/slides/slide{i}.xml"
                    np = f"ppt/notesSlides/notesSlide{i}.xml"
                    if sp not in names:
                        errors.append(f"pptx: missing {sp}")
                        continue
                    if np not in names:
                        errors.append(f"pptx: missing {np}")
                        continue
                    s_xml = zf.read(sp)
                    n_xml = zf.read(np)
                    s_root = ET.fromstring(s_xml)
                    n_root = ET.fromstring(n_xml)
                    if re.search(rb'<a:tr\s+h="0"', s_xml):
                        errors.append(f"pptx: zero-height table row in {sp}")
                    combined_txt = " ".join(
                        [t.text or "" for t in s_root.iter() if t.tag.endswith("t")]
                        + [t.text or "" for t in n_root.iter() if t.tag.endswith("t")]
                    )
                    for tok in active_forbid:
                        if re.search(rf"\b{re.escape(tok)}\b", combined_txt, flags=re.I):
                            errors.append(f"pptx: residual exemplar token '{tok}' leaked in slide {i}")
    except Exception as exc:
        errors.append(f"pptx exception: {exc}")

    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as zf:
            names = set(zf.namelist())
            if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                errors.append("docx: missing [Content_Types].xml or word/document.xml")
            else:
                doc_root = ET.fromstring(zf.read("word/document.xml"))
                doc_txt = " ".join(t.text or "" for t in doc_root.iter() if t.tag.endswith("t"))
                for tok in active_forbid:
                    if re.search(rf"\b{re.escape(tok)}\b", doc_txt, flags=re.I):
                        errors.append(f"docx: residual exemplar token '{tok}' leaked in word/document.xml")
                referenced_media_d: Set[str] = set()
                for rel_name in [n for n in names if n.endswith(".rels")]:
                    rel_root = ET.fromstring(zf.read(rel_name))
                    base_dir = Path(rel_name).parent.parent
                    for rel_el in rel_root:
                        if not rel_el.tag.endswith("Relationship"):
                            continue
                        tgt = rel_el.attrib.get("Target", "")
                        tmode = rel_el.attrib.get("TargetMode", "")
                        if tmode == "External":
                            if not tgt.startswith("https://"):
                                errors.append(f"docx: non-HTTPS external relationship target {tgt}")
                            continue
                        norm_p = os.path.normpath(os.path.join(base_dir.as_posix(), tgt)).lstrip("./")
                        if norm_p not in names:
                            errors.append(f"docx: broken internal relationship {tgt} -> {norm_p} in {rel_name}")
                        if norm_p.startswith("word/media/"):
                            referenced_media_d.add(norm_p)
                for media_part in [n for n in names if n.startswith("word/media/")]:
                    if media_part not in referenced_media_d:
                        errors.append(f"docx: orphan unreferenced media part {media_part}")
    except Exception as exc:
        errors.append(f"docx exception: {exc}")

    return {"valid": len(errors) == 0, "errors": errors}


# ---------------------------------------------------------------------------
# 5. Media Hardening: EXIF/Metadata Stripping, OCR Leak Gate & Strict SVG
# ---------------------------------------------------------------------------
def strip_image_metadata_bytes(img_bytes: bytes, ext: str) -> bytes:
    """Strips ancillary PNG text/EXIF chunks (tEXt, zTXt, iTXt, eXIf, tIME) and JPEG APP1..APP15/COM segments."""
    if ext == "png" and img_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        out = bytearray(b"\x89PNG\r\n\x1a\n")
        pos = 8
        n = len(img_bytes)
        while pos + 8 <= n:
            length = struct.unpack(">I", img_bytes[pos : pos + 4])[0]
            ctype = img_bytes[pos + 4 : pos + 8]
            chunk_end = pos + 8 + length + 4
            if chunk_end > n:
                break
            if ctype in _SAFE_PNG_CHUNKS:
                out.extend(img_bytes[pos:chunk_end])
            pos = chunk_end
            if ctype == b"IEND":
                break
        return bytes(out)
    if ext in ("jpg", "jpeg") and img_bytes.startswith(b"\xff\xd8"):
        out = bytearray(b"\xff\xd8")
        pos = 2
        n = len(img_bytes)
        while pos + 2 <= n:
            if img_bytes[pos] != 0xFF:
                out.extend(img_bytes[pos:])
                break
            marker = img_bytes[pos + 1]
            if marker == 0xD9:
                out.extend(b"\xff\xd9")
                break
            if marker == 0xDA:
                out.extend(img_bytes[pos:])
                break
            if pos + 4 > n:
                break
            seg_len = struct.unpack(">H", img_bytes[pos + 2 : pos + 4])[0]
            seg_end = pos + 2 + seg_len
            if seg_end > n:
                break
            if not (0xE1 <= marker <= 0xEF or marker == 0xFE):
                out.extend(img_bytes[pos:seg_end])
            pos = seg_end
        return bytes(out)
    return img_bytes


_EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")


def scan_ocr_transcript_for_leaks(
    ocr_text: str,
    f13_scanner: Callable[[str], List[str]],
) -> List[str]:
    """Scans OCR transcript for F-13 forbidden tokens, non-allowlisted PII email domains, and auth walls."""
    hits = list(f13_scanner(ocr_text))
    allowed_domains = {"example.com", "example.org"}
    extra_env = (
        os.environ.get("CREATE_BLOG_ALLOWED_DEMO_DOMAINS", "").strip()
        or os.environ.get("CREATE_BLOG2_ALLOWED_DEMO_DOMAINS", "").strip()
    )
    for d in extra_env.split(","):
        if d.strip():
            allowed_domains.add(d.strip().lower())
    for m in _EMAIL_REGEX.finditer(str(ocr_text or "")):
        dom = m.group(1).lower()
        if dom.endswith(".gserviceaccount.com") or dom in allowed_domains:
            continue
        hits.append(f"pii_email_domain:{dom}")
    low = str(ocr_text or "").lower()
    if "accounts.google.com/servicelogin" in low or "sign in with google" in low:
        hits.append("auth_wall:google_signin_prompt")
    return sorted(set(hits))


def inspect_media_pixels_for_f13_leaks(
    media_bytes: bytes,
    mime_type: str,
    *,
    f13_scanner: Callable[[str], List[str]],
    get_bearer_token: Callable[[], Optional[str]],
    redact_secret: Callable[[str, Optional[str]], str],
    ocr_inspector_fn: Optional[Callable[[bytes, str], str]] = None,
    api_key_override: Optional[str] = None,
    require_ocr: bool = False,
) -> Tuple[bool, List[str], str, str]:
    """
    Runs pixel-level Gemini 2.5 Flash Vision OCR at MEDIA_RESOLUTION_HIGH.
    Returns (passed, leaks, transcript, ocr_status).
    Raises RuntimeError with 'OCR_INSPECTOR_UNAVAILABLE' only when require_ocr=True and credentials are offline.
    """
    inspector = ocr_inspector_fn or _TEST_OCR_INSPECTOR_FN
    if inspector is not None:
        transcript = str(inspector(media_bytes, mime_type) or "")
        leaks = scan_ocr_transcript_for_leaks(transcript, f13_scanner)
        return (len(leaks) == 0, leaks, transcript, "VERIFIED_OCR")

    api_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    tok = get_bearer_token()
    if not (api_key or tok):
        if require_ocr:
            raise RuntimeError("OCR_INSPECTOR_UNAVAILABLE: live Vertex AI or GEMINI_API_KEY required.")
        return (True, [], "", "SKIPPED_OFFLINE")

    b64_data = base64.b64encode(media_bytes).decode("ascii")
    prompt_txt = (
        "Transcribe verbatim ALL visible text in this image or video, including browser URL bars, query parameters, "
        "account chips, email addresses, project IDs, tab titles, and console banners. Return plain text only."
    )
    body_obj: Dict[str, Any] = {
        "contents": [{
            "role": "user",
            "parts": [
                {"inlineData": {"mimeType": mime_type, "data": b64_data}},
                {"text": prompt_txt},
            ],
        }],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 4096,
            "mediaResolution": "MEDIA_RESOLUTION_HIGH",
        },
    }
    if tok:
        url = (
            f"https://{DEFAULT_VERTEX_LOCATION}-aiplatform.googleapis.com/v1beta1/"
            f"projects/{DEFAULT_GCP_PROJECT}/locations/{DEFAULT_VERTEX_LOCATION}/"
            f"publishers/google/models/gemini-2.5-flash:generateContent"
        )
        hdrs = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    else:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={urllib.parse.quote(api_key)}"
        )
        hdrs = {"Content-Type": "application/json"}

    req = urllib.request.Request(url, data=json.dumps(body_obj).encode("utf-8"), headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30.0) as resp:
            resp_obj = json.loads(resp.read().decode("utf-8"))
        parts = (((resp_obj.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        transcript = "\n".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
    except Exception as exc:
        if require_ocr:
            raise RuntimeError(f"OCR_INSPECTOR_UNAVAILABLE: {redact_secret(str(exc), api_key)[:180]}") from None
        return (True, [], "", "SKIPPED_OCR_ERROR")

    leaks = scan_ocr_transcript_for_leaks(transcript, f13_scanner)
    return (len(leaks) == 0, leaks, transcript, "VERIFIED_OCR")


def sanitize_svg_strict(svg_str: str, base_sanitizer: Optional[Callable[[str], str]] = None) -> str:
    """Rejects script/foreignObject/DTD/inline event handlers/external hrefs before optional base sanitization."""
    s = str(svg_str or "").strip()
    low = s.lower()
    if "<script" in low or "<foreignobject" in low or "javascript:" in low or "<!doctype" in low or "<!entity" in low:
        raise ValueError("Disallowed script, foreignObject, or DTD construct in SVG.")
    if re.search(r"<[^>]+\son[a-z]+\s*=", low):
        raise ValueError("Disallowed inline event handler attribute in SVG.")
    if re.search(r'\b(?:xlink:)?href\s*=\s*["\']\s*(?:https?:|//)', low):
        raise ValueError("Disallowed external href in SVG.")
    return base_sanitizer(s) if base_sanitizer is not None else s


# ---------------------------------------------------------------------------
# 6. Multi-Replica Cloud Run Hardening: GCS CAS, Resumable Upload & /tmp LRU
# ---------------------------------------------------------------------------
def gcs_get_with_generation(
    *,
    bucket: str,
    prefix: str,
    rel_path: str,
    get_bearer_token: Callable[[], Optional[str]],
    mem_store: Optional[Dict[str, Tuple[bytes, int]]] = None,
) -> Tuple[Optional[bytes], Optional[int]]:
    if mem_store is not None:
        ent = mem_store.get(rel_path)
        return (None, 0) if ent is None else (ent[0], ent[1])
    tok = get_bearer_token()
    if not tok:
        return (None, None)
    obj_name = urllib.parse.quote(f"{prefix}{rel_path.lstrip('/')}", safe="")
    meta_url = f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/{obj_name}"
    try:
        req_m = urllib.request.Request(meta_url, headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req_m, timeout=8.0) as resp_m:
            meta = json.loads(resp_m.read().decode("utf-8"))
            gen = int(meta.get("generation", 0))
        req_d = urllib.request.Request(f"{meta_url}?alt=media", headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req_d, timeout=12.0) as resp_d:
            return (resp_d.read(), gen)
    except urllib.error.HTTPError as he:
        return (None, 0) if he.code == 404 else (None, None)
    except Exception:
        return (None, None)


def gcs_upload_resumable(
    *,
    bucket: str,
    obj_full_name: str,
    data: bytes,
    mime: str,
    tok: str,
    if_gen_match: Optional[int] = None,
) -> Tuple[bool, int]:
    q = f"uploadType=resumable&name={urllib.parse.quote(obj_full_name, safe='')}"
    if if_gen_match is not None:
        q += f"&ifGenerationMatch={int(if_gen_match)}"
    init_url = f"https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?{q}"
    req = urllib.request.Request(
        init_url,
        data=b"{}",
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": mime,
            "X-Upload-Content-Length": str(len(data)),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            session_uri = resp.headers.get("Location") or ""
        if not session_uri:
            return (False, 500)
        chunk_sz = 8 * 1024 * 1024
        total = len(data)
        offset = 0
        while offset < total:
            end = min(offset + chunk_sz, total)
            chunk = data[offset:end]
            put_req = urllib.request.Request(
                session_uri,
                data=chunk,
                headers={
                    "Content-Length": str(len(chunk)),
                    "Content-Range": f"bytes {offset}-{end - 1}/{total}",
                },
                method="PUT",
            )
            try:
                with urllib.request.urlopen(put_req, timeout=60.0) as put_resp:
                    if put_resp.status in (200, 201):
                        return (True, put_resp.status)
            except urllib.error.HTTPError as he:
                if he.code == 308:
                    offset = end
                    continue
                return (False, he.code)
            offset = end
        return (True, 200)
    except urllib.error.HTTPError as he:
        return (False, he.code)
    except Exception:
        return (False, 500)


def gcs_upload_bytes_cas(
    *,
    bucket: str,
    prefix: str,
    rel_path: str,
    data: bytes,
    mime: str,
    get_bearer_token: Callable[[], Optional[str]],
    if_generation_match: Optional[int] = None,
    mem_store: Optional[Dict[str, Tuple[bytes, int]]] = None,
) -> Tuple[bool, int]:
    if mem_store is not None:
        cur = mem_store.get(rel_path)
        cur_gen = cur[1] if cur is not None else 0
        if if_generation_match is not None and int(if_generation_match) != cur_gen:
            return (False, 412)
        mem_store[rel_path] = (bytes(data), cur_gen + 1 if cur_gen > 0 else 1)
        return (True, 200)
    tok = get_bearer_token()
    if not tok:
        return (False, 0)
    obj_name = f"{prefix}{rel_path.lstrip('/')}"
    if len(data) > RESUMABLE_THRESHOLD_BYTES:
        return gcs_upload_resumable(
            bucket=bucket, obj_full_name=obj_name, data=data, mime=mime, tok=tok, if_gen_match=if_generation_match
        )
    q = f"uploadType=media&name={urllib.parse.quote(obj_name, safe='')}"
    if if_generation_match is not None:
        q += f"&ifGenerationMatch={int(if_generation_match)}"
    url = f"https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?{q}"
    req = urllib.request.Request(
        url, data=data, headers={"Authorization": f"Bearer {tok}", "Content-Type": mime}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20.0) as resp:
            return (resp.status in (200, 201), resp.status)
    except urllib.error.HTTPError as he:
        return (False, he.code)
    except Exception:
        return (False, 500)


def update_gcs_json_with_cas(
    *,
    bucket: str,
    prefix: str,
    rel_path: str,
    mutator_fn: Callable[[Dict[str, Any]], Dict[str, Any]],
    get_bearer_token: Callable[[], Optional[str]],
    max_retries: int = 4,
    mem_store: Optional[Dict[str, Tuple[bytes, int]]] = None,
) -> Dict[str, Any]:
    """Reads JSON + GCS generation, applies mutator_fn, and writes back with ifGenerationMatch CAS."""
    for attempt in range(max_retries):
        raw, gen = gcs_get_with_generation(
            bucket=bucket, prefix=prefix, rel_path=rel_path,
            get_bearer_token=get_bearer_token, mem_store=mem_store,
        )
        if raw:
            try:
                cur_obj = json.loads(raw.decode("utf-8"))
            except Exception:
                cur_obj = {}
        else:
            cur_obj = {}
            gen = 0 if gen is None else gen
        updated = mutator_fn(cur_obj)
        payload = json.dumps(updated, indent=2).encode("utf-8")
        ok, status = gcs_upload_bytes_cas(
            bucket=bucket, prefix=prefix, rel_path=rel_path, data=payload,
            mime="application/json", get_bearer_token=get_bearer_token,
            if_generation_match=gen, mem_store=mem_store,
        )
        if ok or status != 412:
            return updated
        time.sleep(0.05 * (attempt + 1))
    raise RuntimeError(f"CAS_CONFLICT: concurrent update conflict on {rel_path} after {max_retries} attempts.")


def enforce_tmp_cache_budget(
    storage_root: Path,
    *,
    max_bytes: int = TMP_CACHE_BUDGET_BYTES,
    protected_slugs: Optional[Set[str]] = None,
) -> int:
    """Evicts oldest cached binary artifacts in /tmp when total cache exceeds max_bytes (256 MiB default)."""
    if not storage_root.is_dir():
        return 0
    protected = set(protected_slugs or set())
    candidates: List[Tuple[float, int, Path]] = []
    total_bytes = 0
    for p in storage_root.rglob("*"):
        if not p.is_file():
            continue
        try:
            st = p.stat()
        except Exception:
            continue
        total_bytes += st.st_size
        if p.name in ("index.json", "manifest.json", "quality_report.json", "blog.md"):
            continue
        rel_parts = p.relative_to(storage_root).parts
        slug_part = rel_parts[0] if rel_parts else ""
        if slug_part in protected:
            continue
        candidates.append((st.st_mtime, st.st_size, p))
    if total_bytes <= max_bytes:
        return 0
    candidates.sort(key=lambda x: x[0])
    evicted = 0
    for _, sz, fp in candidates:
        if total_bytes <= max_bytes:
            break
        try:
            fp.unlink()
            total_bytes -= sz
            evicted += sz
        except Exception:
            pass
    return evicted


# ---------------------------------------------------------------------------
# 7. Stateless HMAC-SHA256 CSRF Token Helpers (Multi-Replica Cloud Run Safe)
# ---------------------------------------------------------------------------
def mint_stateless_csrf_token(
    actor_email: str = "local-operator",
    *,
    secret_bytes: Optional[bytes] = None,
    now_ts: Optional[int] = None,
) -> str:
    key = secret_bytes or (
        os.environ.get("PORTAL_CSRF_HMAC_SECRET", "").strip()
        or os.environ.get("LOCAL_DEV_CSRF_SECRET", "local-workstation-dev-csrf-hmac-key-2026")
    ).encode("utf-8")
    ts = int(time.time()) if now_ts is None else int(now_ts)
    ts_hex = f"{ts:08x}"
    nonce_hex = secrets.token_hex(12)
    norm_actor = str(actor_email or "local-operator").strip().lower()
    msg = f"{ts_hex}.{nonce_hex}.{norm_actor}".encode("utf-8")
    sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
    return f"{ts_hex}.{nonce_hex}.{sig}"


def verify_stateless_csrf_token(
    token: str,
    actor_email: str = "local-operator",
    *,
    secret_bytes: Optional[bytes] = None,
    portal_csrf_fallback: str = "",
    now_ts: Optional[int] = None,
) -> bool:
    tok = str(token or "").strip()
    if not tok:
        return False
    parts = tok.split(".")
    if len(parts) == 3:
        ts_hex, nonce_hex, sig_hex = parts
        if not (
            re.fullmatch(r"[0-9a-f]{8}", ts_hex)
            and re.fullmatch(r"[0-9a-f]{24}", nonce_hex)
            and re.fullmatch(r"[0-9a-f]{64}", sig_hex)
        ):
            return False
        key = secret_bytes or (
            os.environ.get("PORTAL_CSRF_HMAC_SECRET", "").strip()
            or os.environ.get("LOCAL_DEV_CSRF_SECRET", "local-workstation-dev-csrf-hmac-key-2026")
        ).encode("utf-8")
        issued_ts = int(ts_hex, 16)
        now_val = int(time.time()) if now_ts is None else int(now_ts)
        if issued_ts > (now_val + 120) or (now_val - issued_ts) > CSRF_TOKEN_TTL_SEC:
            return False
        for candidate_actor in (str(actor_email or "").strip().lower(), "local-operator", ""):
            msg = f"{ts_hex}.{nonce_hex}.{candidate_actor}".encode("utf-8")
            expected_sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
            if secrets.compare_digest(sig_hex, expected_sig):
                return True
        return False
    if portal_csrf_fallback and secrets.compare_digest(tok, portal_csrf_fallback):
        return True
    return False
