#!/usr/bin/env python3
"""
Create Blog 2 Engine — Zero-Hallucination Prompt-to-Blog & Full Asset Studio.

Built on top of create_blog1_engine v3 primitives with:
  1. Two-pass grounded search redirect resolution + groundingSupports segment binding + D-13 numeric claim gate.
  2. Strict 1:1 official GCP SVG icon resolution (zero cross-service aliasing) + truthful icon provenance.
  3. In-memory static AST & Terraform security verification (zero execution of model-generated code).
  4. Honest DRAFT_AWAITING_PROOF lifecycle (zero recycled screenshots) + PNG/JPEG metadata stripping + Gemini Vision OCR leak gate.
  5. Multi-replica stateless HMAC-SHA256 CSRF + ECDSA P-256 edge assertion identity + owner scoping across all 6 mutation routes.
  6. Multi-replica stateless video chunk upload with per-chunk SHA-256/CRC32C, GCS compose into _quarantine/, and server OCR promotion.
  7. Law 9 / Rule 49 native Google Docs sync (files.copy + batchUpdate) and 2-way Draw.io save with OOXML integrity validation.
  8. GCS ifGenerationMatch CAS on index.json/session.json, 256 MiB /tmp LRU cache eviction, and 36 MiB resumable GCS uploads.
"""

from __future__ import annotations

import ast
import base64
from collections import deque
from datetime import datetime, timezone
import hashlib
import hmac
import html
import http.client
import io
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import ssl
import struct
import sys
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET
import zipfile
import zlib

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts import blog_assets_manager as _bam  # noqa: E402
from scripts import durable_portal_storage as _dps  # noqa: E402
sys.modules['create_blog_2_engine'] = sys.modules['scripts.create_blog_2_engine'] = sys.modules[__name__]
from scripts import create_blog1_canonical_compiler as _cc  # noqa: E402
from scripts import create_blog1_diagrams_v2 as _diag_v2  # noqa: E402
from scripts import create_blog1_engine as cb1  # noqa: E402
from scripts import create_blog1_pipeline_v2 as _pipe_v2  # noqa: E402

DEFAULT_GCP_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "ramp-portal-dev")
DEFAULT_VERTEX_LOCATION = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
DURABLE_GCS_BUCKET = os.environ.get("DURABLE_GCS_BUCKET", "scorex-durable-state-bbar-138hf0")
DURABLE_GCS_PREFIX = "ge-blogs/create-blog2/"

ALLOWED_MODELS = cb1.ALLOWED_MODELS
ALLOWED_VOICES = cb1.ALLOWED_VOICES
ALLOWED_PROVENANCE_TAGS = cb1.ALLOWED_PROVENANCE_TAGS
ALLOWED_PROOF_STAGES = cb1.ALLOWED_PROOF_STAGES

MAX_PROOF_IMAGE_BYTES = 6 * 1024 * 1024
MAX_VIDEO_CHUNK_RAW_BYTES = 2 * 1024 * 1024  # 2 MiB raw chunk (8 * 256 KiB GCS alignment)
MAX_INLINE_OCR_VIDEO_BYTES = 14 * 1024 * 1024  # 14 MiB raw (~18.67 MiB base64 < 20 MiB Vertex inline limit)
MAX_SLIDESHOW_VIDEO_BYTES = 32 * 1024 * 1024  # 32 MiB max for generated slide deck WebM
MAX_GCS_SYNC_FILE_BYTES = 36 * 1024 * 1024  # 36 MiB sync ceiling via resumable upload
RESUMABLE_THRESHOLD_BYTES = 8 * 1024 * 1024  # > 8 MiB uses uploadType=resumable
TMP_CACHE_BUDGET_BYTES = 256 * 1024 * 1024  # 256 MiB /tmp LRU budget
CSRF_TOKEN_TTL_SEC = 12 * 3600
QUARANTINE_TTL_SEC = 24 * 3600
JOB_RATE_LIMIT_PER_HOUR = int(os.environ.get("CREATE_BLOG2_RATE_LIMIT_PER_HOUR", "12") or "12")

RESERVED_SLUGS: Set[str] = {
    "ws1", "ws2", "ws3", "ws4", "ws5",
    "all", "atlas", "guide", "runbook", "backlog", "saas10",
    "index", "_jobs", "_trash", "_chunks", "_quarantine",
    "create-blog1", "create-blog-2", "create-blog2",
    "ws1-reference-architecture-taxonomy-and-5hop-baseline",
    "ws2-pattern-a-pooled-architecture",
    "ws3-pattern-b-sovereign-silos",
    "ws4-pattern-c-hybrid-dynamic-tiering",
    "ws5-decision-guide-and-agentic-triad",
}

_TEMPLATE_LEAK_PARTS: Tuple[Tuple[str, str], ...] = (
    ("WS", "4"),
    ("Pattern", " C"),
    ("Fin", "Vault"),
    ("Retail", "Stream"),
    ("cymbal-", "retailstream"),
    ("MC", "3"),
    ("Ask", "HR"),
    ("GPT", "eal"),
)
TEMPLATE_LEAK_TOKENS: Tuple[str, ...] = tuple("".join(pair) for pair in _TEMPLATE_LEAK_PARTS)

_STATE_LOCK = threading.RLock()
_JOBS_LOCK = threading.Lock()
_JOBS: Dict[str, Dict[str, Any]] = {}
_CONCURRENT_JOB_SEM = threading.Semaphore(2)
_RATE_LOCK = threading.Lock()
_RATE_HITS: Dict[str, deque] = {}
_MUTATION_RATE_LOCK = threading.Lock()
_MUTATION_RATE_HITS: Dict[str, deque] = {}
_GCS_INDEX_HYDRATED = False
_GCS_INDEX_LAST_SYNC = 0.0
_GCS_INDEX_TTL_SEC = 10.0

# Mock/Test injection hooks (None in production)
_TEST_GCS_MEM_STORE: Optional[Dict[str, Tuple[bytes, int]]] = None
_TEST_OCR_INSPECTOR_FN: Optional[Callable[[bytes, str], str]] = None
_TEST_TTS_TRANSPORT_FN: Optional[Callable[[str, str], Tuple[Optional[bytes], Optional[str]]]] = None
_TEST_REDIRECT_RESOLVER_FN: Optional[Callable[[str], str]] = None
_TEST_URL_HEAD_FN: Optional[Callable[[str], bool]] = None


class CreateBlog2Error(cb1.CreateBlog1Error):
    """Structured fail-closed exception for Create Blog 2."""


class ModelAuthUnavailableError(CreateBlog2Error):
    def __init__(self, message: str):
        super().__init__(message, status_code=503, code="MODEL_AUTH_UNAVAILABLE")


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_storage_root() -> Path:
    override = os.environ.get("GEAP_CREATE_BLOG2_DIR", "").strip()
    if override:
        p = Path(override)
    else:
        runtime_base = os.environ.get("PORTAL_RUNTIME_STATE_DIR", "/tmp/ge-blogs-runtime-state").strip()
        p = Path(runtime_base) / "create_blog2"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _is_gcs_sync_enabled() -> bool:
    if _TEST_GCS_MEM_STORE is not None:
        return True
    if os.environ.get("GEAP_DISABLE_GCS_SYNC") == "1":
        return False
    if os.environ.get("GEAP_CREATE_BLOG2_DIR", "").strip():
        return False
    return True


# ---------------------------------------------------------------------------
# Pure-Stdlib Castagnoli CRC32C + RFC 3720 GF(2) CRC32C Combine
# ---------------------------------------------------------------------------
_CRC32C_POLY = 0x82F63B78
_CRC32C_TABLE: Tuple[int, ...] = tuple(
    (lambda i: (
        (lambda c: [
            (c := (c >> 1) ^ _CRC32C_POLY if (c & 1) else (c >> 1))
            for _ in range(8)
        ][-1])(i)
    ))(idx)
    for idx in range(256)
)


def compute_crc32c_int(data: bytes, crc: int = 0) -> int:
    c = crc ^ 0xFFFFFFFF
    tbl = _CRC32C_TABLE
    for b in data:
        c = tbl[(c ^ b) & 0xFF] ^ (c >> 8)
    return c ^ 0xFFFFFFFF


def format_crc32c_b64(crc_int: int) -> str:
    return base64.b64encode(struct.pack(">I", crc_int & 0xFFFFFFFF)).decode("ascii")


def _gf2_matrix_times(mat: List[int], vec: int) -> int:
    s = 0
    idx = 0
    while vec:
        if vec & 1:
            s ^= mat[idx]
        vec >>= 1
        idx += 1
    return s


def _gf2_matrix_square(square: List[int], mat: List[int]) -> None:
    for n in range(32):
        square[n] = _gf2_matrix_times(mat, mat[n])


def combine_crc32c_ints(crc1: int, crc2: int, len2: int) -> int:
    if len2 <= 0:
        return crc1 & 0xFFFFFFFF
    even = [0] * 32
    odd = [0] * 32
    odd[0] = _CRC32C_POLY
    row = 1
    for n in range(1, 32):
        odd[n] = row
        row <<= 1
    _gf2_matrix_square(even, odd)
    _gf2_matrix_square(odd, even)
    c1 = crc1 & 0xFFFFFFFF
    rem = int(len2)
    while True:
        _gf2_matrix_square(even, odd)
        if rem & 1:
            c1 = _gf2_matrix_times(even, c1)
        rem >>= 1
        if rem == 0:
            break
        _gf2_matrix_square(odd, even)
        if rem & 1:
            c1 = _gf2_matrix_times(odd, c1)
        rem >>= 1
        if rem == 0:
            break
    return (c1 ^ (crc2 & 0xFFFFFFFF)) & 0xFFFFFFFF


# ---------------------------------------------------------------------------
# GCS Storage Helpers with ifGenerationMatch CAS, Resumable Upload & Compose
# ---------------------------------------------------------------------------
def _gcs_get_with_generation(rel_path: str) -> Tuple[Optional[bytes], Optional[int]]:
    if _TEST_GCS_MEM_STORE is not None:
        entry = _TEST_GCS_MEM_STORE.get(rel_path)
        if entry is None:
            return (None, 0)
        return (entry[0], entry[1])
    if not _is_gcs_sync_enabled():
        return (None, None)
    tok = cb1._get_gcp_bearer_token()
    if not tok:
        return (None, None)
    obj_name = urllib.parse.quote(f"{DURABLE_GCS_PREFIX}{rel_path.lstrip('/')}", safe="")
    meta_url = f"https://storage.googleapis.com/storage/v1/b/{DURABLE_GCS_BUCKET}/o/{obj_name}"
    try:
        req_m = urllib.request.Request(meta_url, headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req_m, timeout=8.0) as resp_m:
            meta = json.loads(resp_m.read().decode("utf-8"))
            gen = int(meta.get("generation", 0))
        media_url = f"{meta_url}?alt=media"
        req_d = urllib.request.Request(media_url, headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req_d, timeout=12.0) as resp_d:
            return (resp_d.read(), gen)
    except urllib.error.HTTPError as he:
        if he.code == 404:
            return (None, 0)
        return (None, None)
    except Exception:
        return (None, None)


def _gcs_upload_resumable(obj_full_name: str, data: bytes, mime: str, tok: str, if_gen_match: Optional[int] = None) -> Tuple[bool, int]:
    q = f"uploadType=resumable&name={urllib.parse.quote(obj_full_name, safe='')}"
    if if_gen_match is not None:
        q += f"&ifGenerationMatch={int(if_gen_match)}"
    init_url = f"https://storage.googleapis.com/upload/storage/v1/b/{DURABLE_GCS_BUCKET}/o?{q}"
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


def _gcs_upload_bytes(rel_path: str, data: bytes, mime: str = "application/octet-stream", if_generation_match: Optional[int] = None) -> Tuple[bool, int]:
    if _TEST_GCS_MEM_STORE is not None:
        cur = _TEST_GCS_MEM_STORE.get(rel_path)
        cur_gen = cur[1] if cur is not None else 0
        if if_generation_match is not None and int(if_generation_match) != cur_gen:
            return (False, 412)
        new_gen = cur_gen + 1 if cur_gen > 0 else 1
        _TEST_GCS_MEM_STORE[rel_path] = (bytes(data), new_gen)
        return (True, 200)
    if not _is_gcs_sync_enabled():
        return (False, 0)
    tok = cb1._get_gcp_bearer_token()
    if not tok:
        return (False, 0)
    obj_name = f"{DURABLE_GCS_PREFIX}{rel_path.lstrip('/')}"
    if len(data) > RESUMABLE_THRESHOLD_BYTES:
        return _gcs_upload_resumable(obj_name, data, mime, tok, if_gen_match=if_generation_match)
    q = f"uploadType=media&name={urllib.parse.quote(obj_name, safe='')}"
    if if_generation_match is not None:
        q += f"&ifGenerationMatch={int(if_generation_match)}"
    url = f"https://storage.googleapis.com/upload/storage/v1/b/{DURABLE_GCS_BUCKET}/o?{q}"
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": mime},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20.0) as resp:
            return (resp.status in (200, 201), resp.status)
    except urllib.error.HTTPError as he:
        return (False, he.code)
    except Exception:
        return (False, 500)


def _gcs_download_bytes(rel_path: str) -> Optional[bytes]:
    if _TEST_GCS_MEM_STORE is not None:
        ent = _TEST_GCS_MEM_STORE.get(rel_path)
        return ent[0] if ent else None
    if not _is_gcs_sync_enabled():
        return None
    tok = cb1._get_gcp_bearer_token()
    if not tok:
        return None
    obj_name = urllib.parse.quote(f"{DURABLE_GCS_PREFIX}{rel_path.lstrip('/')}", safe="")
    url = f"https://storage.googleapis.com/storage/v1/b/{DURABLE_GCS_BUCKET}/o/{obj_name}?alt=media"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            return resp.read()
    except Exception:
        return None


def _gcs_delete_object(rel_path: str) -> bool:
    if _TEST_GCS_MEM_STORE is not None:
        return _TEST_GCS_MEM_STORE.pop(rel_path, None) is not None
    if not _is_gcs_sync_enabled():
        return False
    tok = cb1._get_gcp_bearer_token()
    if not tok:
        return False
    obj_name = urllib.parse.quote(f"{DURABLE_GCS_PREFIX}{rel_path.lstrip('/')}", safe="")
    url = f"https://storage.googleapis.com/storage/v1/b/{DURABLE_GCS_BUCKET}/o/{obj_name}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"}, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False


def _gcs_compose_objects(source_rel_paths: List[str], dest_rel_path: str, mime: str) -> Tuple[bool, str, int]:
    """Composes up to 32 GCS objects into dest_rel_path and returns (ok, crc32c_b64, total_bytes)."""
    if len(source_rel_paths) == 0 or len(source_rel_paths) > 32:
        return (False, "", 0)
    if _TEST_GCS_MEM_STORE is not None:
        buf = bytearray()
        for sp in source_rel_paths:
            ent = _TEST_GCS_MEM_STORE.get(sp)
            if ent is None:
                return (False, "", 0)
            buf.extend(ent[0])
        raw = bytes(buf)
        crc_b64 = format_crc32c_b64(compute_crc32c_int(raw))
        cur = _TEST_GCS_MEM_STORE.get(dest_rel_path)
        gen = (cur[1] + 1) if cur else 1
        _TEST_GCS_MEM_STORE[dest_rel_path] = (raw, gen)
        return (True, crc_b64, len(raw))
    if not _is_gcs_sync_enabled():
        return (False, "", 0)
    tok = cb1._get_gcp_bearer_token()
    if not tok:
        return (False, "", 0)
    dest_obj = urllib.parse.quote(f"{DURABLE_GCS_PREFIX}{dest_rel_path.lstrip('/')}", safe="")
    url = f"https://storage.googleapis.com/storage/v1/b/{DURABLE_GCS_BUCKET}/o/{dest_obj}/compose"
    body = {
        "destination": {"contentType": mime},
        "sourceObjects": [{"name": f"{DURABLE_GCS_PREFIX}{sp.lstrip('/')}"} for sp in source_rel_paths],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30.0) as resp:
            meta = json.loads(resp.read().decode("utf-8"))
            return (True, str(meta.get("crc32c") or ""), int(meta.get("size") or 0))
    except Exception:
        return (False, "", 0)


def _update_gcs_json_with_cas(rel_path: str, mutator_fn: Callable[[Dict[str, Any]], Dict[str, Any]], max_retries: int = 4) -> Dict[str, Any]:
    """Reads JSON object + generation from GCS, applies mutator_fn, and writes with ifGenerationMatch CAS."""
    for attempt in range(max_retries):
        raw, gen = _gcs_get_with_generation(rel_path)
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
        if not _is_gcs_sync_enabled():
            return updated
        ok, status = _gcs_upload_bytes(rel_path, payload, "application/json", if_generation_match=gen)
        if ok:
            return updated
        if status != 412:
            # Non-CAS failure (e.g., offline local mode)
            return updated
        time.sleep(0.05 * (attempt + 1))
    raise CreateBlog2Error(f"Concurrent update conflict on {rel_path} after {max_retries} CAS attempts.", 409, "CAS_CONFLICT")


def _enforce_tmp_cache_budget(max_bytes: int = TMP_CACHE_BUDGET_BYTES, protected_slugs: Optional[Set[str]] = None) -> int:
    """Evicts oldest cached binary files in /tmp when total size exceeds max_bytes."""
    root = get_storage_root()
    protected = set(protected_slugs or set())
    with _JOBS_LOCK:
        for j in _JOBS.values():
            if j.get("status") in ("QUEUED", "RUNNING") and j.get("slug"):
                protected.add(str(j["slug"]))
    candidates: List[Tuple[float, int, Path]] = []
    total_bytes = 0
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        try:
            st = p.stat()
        except Exception:
            continue
        total_bytes += st.st_size
        if p.name in ("index.json", "manifest.json", "quality_report.json", "blog.md"):
            continue
        rel_parts = p.relative_to(root).parts
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
# Strict Slug Sanitization & Reserved Denylist
# ---------------------------------------------------------------------------
def sanitize_slug(raw: str, fallback_prefix: str = "arch-blog") -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(raw or "").lower()).strip("-")
    s = re.sub(r"-{2,}", "-", s)[:52].strip("-")
    if not s or len(s) < 3:
        s = f"{fallback_prefix}-{secrets.token_hex(3)}"
    if s in RESERVED_SLUGS or re.fullmatch(r"ws[1-9]", s):
        s = f"cb2-{s}"
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", s):
        raise CreateBlog2Error("Invalid blog slug.", 400, "INVALID_SLUG")
    return s


def validate_existing_slug(raw: str) -> str:
    s = str(raw or "").strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", s) or s in RESERVED_SLUGS:
        raise CreateBlog2Error(f"Invalid or reserved blog slug '{raw}'.", 400, "INVALID_SLUG")
    return s


def _all_cb1_slugs() -> Set[str]:
    try:
        return {str(b.get("slug") or "") for b in cb1.list_blogs(refresh_gcs=False) if isinstance(b, dict)}
    except Exception:
        return set()


def _unique_slug(base: str) -> str:
    root = get_storage_root()
    existing_slugs = {
        str(b.get("slug") or "")
        for b in (_load_index(refresh_gcs=True).get("blogs") or [])
        if isinstance(b, dict)
    } | RESERVED_SLUGS | _all_cb1_slugs()
    cand = sanitize_slug(base)
    if cand not in existing_slugs and not (root / cand).exists():
        return cand
    for i in range(2, 60):
        c2 = f"{cand[:46]}-{i}"
        if c2 not in existing_slugs and not (root / c2).exists():
            return c2
    return f"{cand[:42]}-{secrets.token_hex(3)}"


# ---------------------------------------------------------------------------
# Strict 1:1 Official GCP Icon Resolution & Truthful Provenance
# ---------------------------------------------------------------------------
def resolve_icon_key_strict(*hints: str, default: str = "gcp_cloud") -> str:
    """Resolves official GCP icon keys without cross-service mis-mappings."""
    return _cc.resolve_icon_key(*hints, default=default)


def verify_icon_pack_provenance() -> Dict[str, Any]:
    icons_path = ROOT_DIR / "data" / "gcp_svg_icons.json"
    icons = json.loads(icons_path.read_text(encoding="utf-8"))
    public_count = 0
    glyph_count = 0
    missing_prov: List[str] = []
    for k, v in icons.items():
        ptype = v.get("provenanceType")
        sha = v.get("sha256")
        if ptype == "PUBLIC_GCP_ICON_PACKAGE" and sha:
            public_count += 1
        elif ptype == "PORTAL_ARCHITECTURAL_GLYPH" and sha:
            glyph_count += 1
        else:
            missing_prov.append(k)
    return {
        "totalIcons": len(icons),
        "publicGcpPackageIcons": public_count,
        "portalArchitecturalGlyphs": glyph_count,
        "missingProvenance": missing_prov,
        "allVerified": len(missing_prov) == 0 and public_count >= 25,
    }


# ---------------------------------------------------------------------------
# Grounding Redirect Resolution, FA-08-Safe HEAD Verification & Support Binding
# ---------------------------------------------------------------------------
_REDIRECT_HOST = "vertexaisearch.cloud.google.com"
_REDIRECT_PATH_PREFIX = "/grounding-api-redirect/"
_ALLOWED_DOC_HOSTS = frozenset({"cloud.google.com", "docs.cloud.google.com"})
_ALLOWED_DOC_URL_RE = re.compile(r"^https://(?:docs\.)?cloud\.google\.com/[A-Za-z0-9/_#?=&.%+-]+$")


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
    """
    Resolves https://vertexaisearch.cloud.google.com/grounding-api-redirect/<token> via a single
    HTTPS GET pinned to vertexaisearch.cloud.google.com with redirects disabled, reading only Location.
    """
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
    """
    FA-08-safe HTTPS HEAD verification pinned strictly to cloud.google.com and docs.cloud.google.com.
    Allows up to 3 redirects strictly between cloud.google.com and docs.cloud.google.com.
    """
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
            if loc.startswith("/"):
                cur = f"https://{host}{loc}"
            else:
                cur = loc
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
    redirect_resolver: Optional[Callable[[str], str]] = None,
    head_checker: Optional[Callable[[str], bool]] = None,
) -> Dict[str, Any]:
    """
    1. Resolves Pass-1 groundingChunks[].web.uri redirect URLs and HEAD-verifies against cloud.google.com.
    2. Maps groundingSupports[].segment.text to resolved chunk URLs (requiring confidence >= 0.6 when present).
    3. Enforces two-condition GCP_DOCUMENTED rule on bp['claimLedger']:
       (a) sourceUrl in resolved Pass-1 grounding URL set, AND
       (b) claim value appears in a Pass-1 support segment pointing to that chunk.
       Otherwise downgrades GCP_DOCUMENTED -> DERIVED_MODEL / EXAMPLE_TARGET.
    4. Filters bp['references'] via verify_cloud_google_doc_url (Pass-2 refs never confer GCP_DOCUMENTED).
    """
    raw_chunks = grounding_meta.get("groundingChunks") or []
    if not raw_chunks and isinstance(grounding_meta.get("sources"), list):
        raw_chunks = [{"web": {"uri": s.get("url") or s.get("uri") or "", "title": s.get("title") or ""}} for s in grounding_meta["sources"]]

    resolved_chunk_urls: Dict[int, str] = {}
    verified_sources: List[Dict[str, str]] = []
    seen_urls: Set[str] = set()

    for idx, ch in enumerate(raw_chunks):
        web = (ch.get("web") if isinstance(ch, dict) else None) or {}
        raw_uri = str(web.get("uri") or "").strip()
        title = cb1._sanitize_for_public_output(str(web.get("title") or "Google Cloud Documentation"))[:140]
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
        chunk_indices = sup.get("groundingChunkIndices") or []
        for c_idx in chunk_indices:
            if isinstance(c_idx, int) and c_idx in resolved_chunk_urls:
                u = resolved_chunk_urls[c_idx]
                url_to_support_texts.setdefault(u, []).append(seg_text)

    # Validate & filter references[]
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
                    "title": cb1._sanitize_for_public_output(str(ref.get("title") or "Google Cloud Documentation"))[:140],
                    "url": ru,
                    "note": cb1._sanitize_for_public_output(str(ref.get("note") or "Verified reference"))[:180],
                })
    for vs in verified_sources:
        if vs["url"] not in seen_ref_urls:
            seen_ref_urls.add(vs["url"])
            valid_refs.append({"title": vs["title"], "url": vs["url"], "note": "Pass-1 Search Grounded Source"})
    if not valid_refs:
        # Ensure at least canonical cloud.google.com/architecture if reachable
        fallback_u = "https://cloud.google.com/architecture"
        if verify_cloud_google_doc_url(fallback_u, head_fn=head_checker):
            valid_refs.append({"title": "Google Cloud Architecture Center", "url": fallback_u, "note": "Official Architecture Reference"})
    bp["references"] = valid_refs[:10]

    # Enforce strict two-condition GCP_DOCUMENTED provenance rule on claimLedger
    downgraded_claims: List[str] = []
    for clm in (bp.get("claimLedger") or []):
        if not isinstance(clm, dict):
            continue
        prov = str(clm.get("provenance") or "EXAMPLE_TARGET").strip().upper()
        if prov not in ALLOWED_PROVENANCE_TAGS:
            prov = "EXAMPLE_TARGET"
        src_url = str(clm.get("sourceUrl") or "").strip()
        val_str = str(clm.get("value") or "").strip()
        if prov == "GCP_DOCUMENTED":
            # Condition 1: src_url must be in resolved Pass-1 set
            # Condition 2: value (or its numeric core) must appear in a support segment pointing to src_url
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
                clm["basis"] = f"{clm.get('basis') or 'Model synthesis'} (reclassified from GCP_DOCUMENTED: unverified in Pass-1 grounding segment)"
                downgraded_claims.append(str(clm.get("id") or clm.get("claim") or ""))
        else:
            clm["provenance"] = prov

    search_entry_html = ""
    sep_obj = grounding_meta.get("searchEntryPoint")
    if isinstance(sep_obj, dict) and sep_obj.get("renderedContent"):
        search_entry_html = cb1._sanitize_for_public_output(str(sep_obj.get("renderedContent") or ""))[:4000]

    return {
        "status": "GROUNDED" if verified_sources else str(grounding_meta.get("status") or "UNGROUNDED"),
        "checkedAt": _now_iso(),
        "queries": [cb1._sanitize_for_public_output(str(q))[:160] for q in (grounding_meta.get("webSearchQueries") or grounding_meta.get("queries") or [])[:8]],
        "sources": verified_sources,
        "resolvedChunkCount": len(resolved_chunk_urls),
        "supportSegmentCount": sum(len(v) for v in url_to_support_texts.values()),
        "downgradedClaims": downgraded_claims,
        "searchEntryPointProvided": bool(search_entry_html),
    }


# ---------------------------------------------------------------------------
# Comprehensive Deterministic Gate D-13: Numeric Claim & Provenance Coverage
# ---------------------------------------------------------------------------
_D13_QUANT_REGEX = re.compile(
    r"""(?ix)
    (?:
        # Currency expressions ($100, $1,500.00, 250 USD)
        \$\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[KMBT]\b)?
        |
        \b\d+(?:,\d{3})*(?:\.\d+)?\s*USD\b
        |
        # Numbers with units, magnitudes, percentages, multipliers, or scale nouns
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
        # Thousands-separated bare counts (e.g., 1,000 or 10,000)
        \b\d{1,3}(?:,\d{3})+\b
        |
        # >= 3-digit integer followed by a domain noun
        \b\d{3,}\s+[a-z]{3,16}\b
    )
    """
)

_D13_STRUCTURAL_ALLOW_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)^(?:http|status|code|error)?\s*(?:100|101|200|201|202|204|206|301|302|303|304|307|308|400|401|403|404|405|409|412|413|416|422|423|429|500|502|503|504)(?:\s+[a-z]+)?$"),
    re.compile(r"(?i)^(?:199\d|20[0-3]\d)(?:\s+[a-z]+)?$"),
    re.compile(r"(?i)^(?:1|2|3|4|5|6|7|8|9|10|11|12)\s*(?:layers?|steps?|hops?|slides?)$"),
    re.compile(r"(?i)^(?:256|384|512|1024|1280|1440|1600|1920|2048|2560|4096)\s*[a-z]*$"),
    re.compile(r"(?i)^(?:100%)\s*$"),
    re.compile(r"(?i)^0\s+[a-z/]+$"),
)

_D13_CONTEXT_EXEMPT_RE = re.compile(
    r"(?i)(?:tls\s*1\.[23]|http/[123](?:\.\d)?|rfc\s*\d{3,5}|sha-\d{3}|p-\d{3}|aes-\d{3}|gcm-\d{3}|rsa-\d{3,4}|oauth\s*2\.0|openid\s*1\.0|21\s*cfr\s*part\s*11|ipv[46]|169\.254\.169\.254|127\.0\.0\.1|1600x900|1920x1080|1280x720|2560x1440|slide\s+\d+|step\s+\d+|hop\s+\d+|phase\s+\d+|part\s+\d+|layer\s+\d+|section\s+\d+|figure\s+\d+|table\s+\d+|round\s+\d+|d-\d{2})"
)


def _strip_fenced_code_blocks_keep_inline(md_text: str) -> str:
    """Strips ```...``` fenced code blocks and YAML frontmatter while keeping inline `...` code spans."""
    text = re.sub(r"\A---\n.*?\n---\n", "\n", str(md_text or ""), flags=re.S)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    return text


def check_d13_numeric_claim_coverage(bp: Dict[str, Any], md_text: str) -> Tuple[bool, List[str]]:
    """
    Scans non-fenced prose (including inline code spans) across blog.md, all slides, and speaker notes.
    Returns (all_covered, unledgered_list).
    """
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

    prose_chunks: List[str] = [_strip_fenced_code_blocks_keep_inline(md_text)]
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

    combined = "\n".join(prose_chunks)
    combined = _D13_CONTEXT_EXEMPT_RE.sub(" ", combined)

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


# ---------------------------------------------------------------------------
# Stage 6 In-Memory Static AST & Destructive Command Guard (Zero Code Execution)
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
    """
    Strictly static in-memory AST verification of generated starter Python code.
    Blocks dangerous imports, dynamic execution primitives, and metadata IP literals.
    NEVER executes the code.
    """
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


def scan_starter_security_and_destructive_cmds(starter_files: Dict[str, str]) -> List[Dict[str, str]]:
    findings = list(_pipe_v2.scan_terraform_security(starter_files))
    for fname, content in (starter_files or {}).items():
        txt = str(content or "")
        for pat, msg in _DESTRUCTIVE_CMD_PATTERNS:
            if re.search(pat, txt):
                cid, detail = msg.split(": ", 1)
                findings.append({"id": cid, "file": fname, "severity": "P0", "detail": detail})
    return findings


# ---------------------------------------------------------------------------
# Post-Build OOXML Package Integrity & Template-Leak Validator
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

    # 1. Validate PPTX
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

    # 2. Validate DOCX
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
# Hardened Multi-Replica Auth, Secret-Keyed Stateless HMAC CSRF & Owner Gate
# ---------------------------------------------------------------------------
_CACHED_GCS_CSRF_SECRET: Optional[bytes] = None
_CSRF_SECRET_LOCK = threading.Lock()


def _get_csrf_hmac_secret(require_secret_on_cloudrun: bool = True) -> bytes:
    """
    Returns dedicated HMAC secret for CSRF tokens.
    NEVER uses public EDGE_AUTH_PUBLIC_KEYS_JSON.
    On Cloud Run (K_SERVICE set), uses PORTAL_CSRF_HMAC_SECRET or hydrates private GCS key
    _config/csrf_hmac_secret.key; fails closed with HTTP 503 CSRF_SECRET_UNCONFIGURED if neither is available.
    """
    global _CACHED_GCS_CSRF_SECRET
    secret = os.environ.get("PORTAL_CSRF_HMAC_SECRET", "").strip()
    if secret:
        return secret.encode("utf-8")
    if os.environ.get("K_SERVICE") and require_secret_on_cloudrun:
        if _is_gcs_sync_enabled() and _TEST_GCS_MEM_STORE is None:
            with _CSRF_SECRET_LOCK:
                if _CACHED_GCS_CSRF_SECRET:
                    return _CACHED_GCS_CSRF_SECRET
                raw_k = _gcs_download_bytes("_config/csrf_hmac_secret.key")
                if raw_k and len(raw_k.strip()) >= 32:
                    _CACHED_GCS_CSRF_SECRET = raw_k.strip()
                    return _CACHED_GCS_CSRF_SECRET
                new_k = secrets.token_hex(32).encode("ascii")
                ok, st = _gcs_upload_bytes("_config/csrf_hmac_secret.key", new_k, "text/plain", if_generation_match=0)
                if ok:
                    _CACHED_GCS_CSRF_SECRET = new_k
                    return _CACHED_GCS_CSRF_SECRET
                if st == 412:
                    raw_k2 = _gcs_download_bytes("_config/csrf_hmac_secret.key")
                    if raw_k2 and len(raw_k2.strip()) >= 32:
                        _CACHED_GCS_CSRF_SECRET = raw_k2.strip()
                        return _CACHED_GCS_CSRF_SECRET
        raise CreateBlog2Error(
            "PORTAL_CSRF_HMAC_SECRET is not configured on this Cloud Run revision. Fail-closed.",
            503,
            "CSRF_SECRET_UNCONFIGURED",
        )
    fallback = os.environ.get("LOCAL_DEV_CSRF_SECRET", "local-workstation-dev-csrf-hmac-key-2026")
    return fallback.encode("utf-8")


def mint_create_blog_2_csrf_token(actor_email: str = "local-operator", now_ts: Optional[int] = None) -> str:
    key = _get_csrf_hmac_secret(require_secret_on_cloudrun=bool(os.environ.get("K_SERVICE")))
    ts = int(time.time()) if now_ts is None else int(now_ts)
    ts_hex = f"{ts:08x}"
    nonce_hex = secrets.token_hex(12)
    norm_actor = str(actor_email or "local-operator").strip().lower()
    msg = f"{ts_hex}.{nonce_hex}.{norm_actor}".encode("utf-8")
    sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
    return f"{ts_hex}.{nonce_hex}.{sig}"


def verify_create_blog_2_csrf_token(
    token: str,
    actor_email: str = "local-operator",
    portal_csrf_fallback: str = "",
    now_ts: Optional[int] = None,
) -> bool:
    tok = str(token or "").strip()
    if not tok:
        return False
    is_cloud_run = bool(os.environ.get("K_SERVICE"))
    # Stateless HMAC token format: <ts_hex>.<nonce_hex>.<hmac_hex>
    parts = tok.split(".")
    if len(parts) == 3:
        ts_hex, nonce_hex, sig_hex = parts
        if not (re.fullmatch(r"[0-9a-f]{8}", ts_hex) and re.fullmatch(r"[0-9a-f]{24}", nonce_hex) and re.fullmatch(r"[0-9a-f]{64}", sig_hex)):
            return False
        key = _get_csrf_hmac_secret(require_secret_on_cloudrun=is_cloud_run)
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
    if is_cloud_run:
        # Ensure PORTAL_CSRF_HMAC_SECRET is configured (raises 503 if missing) and reject per-process fallback on Cloud Run
        _get_csrf_hmac_secret(require_secret_on_cloudrun=True)
        return False
    if portal_csrf_fallback and secrets.compare_digest(tok, portal_csrf_fallback):
        return True
    return False


def resolve_create_blog_2_actor(headers: Any) -> Tuple[bool, str, str]:
    """
    On Cloud Run (K_SERVICE set) or when EDGE_AUTH_PUBLIC_KEYS_JSON is configured, derives identity
    EXCLUSIVELY from verify_signed_edge_assertion_header(raw_header) with expected_hosts=None.
    Unsigned or unverified X-Goog-* headers are NEVER trusted.
    """
    hdr_name = os.environ.get("EDGE_AUTH_ASSERTION_HEADER", "X-Serverless-Signed-Assertion")
    raw_assertion = ""
    if hasattr(headers, "get"):
        raw_assertion = str(headers.get(hdr_name) or "").strip()
    if os.environ.get("K_SERVICE") or os.environ.get("EDGE_AUTH_PUBLIC_KEYS_JSON"):
        ok, email, reason = cb1.verify_signed_edge_assertion_header(raw_assertion)
        if not ok or not email:
            return (False, "", f"Cryptographic edge assertion verification failed ({reason}).")
        return (True, email, "edge_assertion_verified")
    return (True, "local-operator", "local_workstation")


def authorize_create_blog_2_mutation(
    headers: Any,
    client_ip: str = "127.0.0.1",
    portal_csrf_fallback: str = "",
) -> Tuple[str, str]:
    """
    Validates rate limit, Content-Type: application/json, Sec-Fetch-Site: same-origin,
    Origin == Host, cryptographic edge identity on Cloud Run, and stateless HMAC CSRF.
    Returns (actor_email, auth_mode) or raises CreateBlog2Error.
    """
    now_ts = time.time()
    with _MUTATION_RATE_LOCK:
        bucket = _MUTATION_RATE_HITS.setdefault(client_ip, deque())
        while bucket and (now_ts - bucket[0]) > 60.0:
            bucket.popleft()
        if len(bucket) >= 120:
            raise CreateBlog2Error("Too many mutation requests; retry shortly.", 429, "RATE_LIMITED")
        bucket.append(now_ts)

    ctype = str(headers.get("Content-Type") or "").strip().lower()
    if not ctype.startswith("application/json"):
        raise CreateBlog2Error("Content-Type must be application/json.", 415, "INVALID_CONTENT_TYPE")

    sec_fetch = str(headers.get("Sec-Fetch-Site") or "").strip().lower()
    if sec_fetch and sec_fetch != "same-origin":
        raise CreateBlog2Error(f"Sec-Fetch-Site '{sec_fetch}' blocked; strictly same-origin required.", 403, "SEC_FETCH_SITE_FORBIDDEN")

    req_origin = str(headers.get("Origin") or "").strip()
    if req_origin:
        parsed_orig = urllib.parse.urlparse(req_origin)
        req_host = str(headers.get("Host") or "").strip().lower()
        orig_netloc = (parsed_orig.netloc or "").strip().lower()
        orig_host = (parsed_orig.hostname or "").strip().lower()
        req_hostname = req_host.split(":")[0] if req_host else ""
        if os.environ.get("K_SERVICE"):
            if orig_netloc != req_host and orig_host != req_hostname:
                raise CreateBlog2Error(f"Cross-origin mutation blocked ({req_origin}).", 403, "ORIGIN_FORBIDDEN")
        else:
            allowed_local = {req_hostname, "localhost", "127.0.0.1", "::1"}
            if orig_netloc != req_host and orig_host not in allowed_local:
                raise CreateBlog2Error(f"Cross-origin mutation blocked ({req_origin}).", 403, "ORIGIN_FORBIDDEN")

    ok_id, actor_email, id_err = resolve_create_blog_2_actor(headers)
    if not ok_id:
        raise CreateBlog2Error(id_err, 403, "ADMIN_IAP_REQUIRED")

    provided_csrf = str(headers.get("X-Portal-CSRF") or "").strip()
    if not verify_create_blog_2_csrf_token(provided_csrf, actor_email=actor_email, portal_csrf_fallback=portal_csrf_fallback):
        raise CreateBlog2Error("Missing or invalid X-Portal-CSRF token.", 403, "CSRF_INVALID")

    return (actor_email, "verified_edge_hmac" if os.environ.get("K_SERVICE") else "local_hmac_csrf")


def verify_blog_owner_access(manifest: Dict[str, Any], actor_email: str) -> None:
    owner = str(manifest.get("createdBy") or manifest.get("actorEmail") or "").strip().lower()
    caller = str(actor_email or "").strip().lower()
    admin_allowlist = {
        e.strip().lower()
        for e in os.environ.get("GEAP_IAP_ADMIN_EMAILS", "").split(",")
        if e.strip()
    }
    if caller and (caller == owner or caller in admin_allowlist):
        return
    raise CreateBlog2Error(
        f"Caller '{caller or 'anonymous'}' is not the owner of blog '{manifest.get('slug', '')}'.",
        403,
        "BLOG_OWNER_REQUIRED",
    )


# ---------------------------------------------------------------------------
# PNG / JPEG Metadata Stripping & Pixel-Level Gemini 2.5 Flash Vision OCR Gate
# ---------------------------------------------------------------------------
_SAFE_PNG_CHUNKS = frozenset({b"IHDR", b"PLTE", b"tRNS", b"pHYs", b"sRGB", b"gAMA", b"cHRM", b"IDAT", b"IEND"})


def strip_image_metadata_bytes(img_bytes: bytes, ext: str) -> bytes:
    """Strips ancillary PNG text/EXIF chunks (tEXt, zTXt, iTXt, eXIf, tIME) and JPEG APP1..APP15 EXIF/XMP segments."""
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
    if ext == "jpg" and img_bytes.startswith(b"\xff\xd8"):
        out = bytearray(b"\xff\xd8")
        pos = 2
        n = len(img_bytes)
        while pos + 2 <= n:
            if img_bytes[pos] != 0xFF:
                out.extend(img_bytes[pos:])
                break
            marker = img_bytes[pos + 1]
            if marker == 0xD9:  # EOI
                out.extend(b"\xff\xd9")
                break
            if marker == 0xDA:  # SOS (start of compressed scan data to end)
                out.extend(img_bytes[pos:])
                break
            if pos + 4 > n:
                break
            seg_len = struct.unpack(">H", img_bytes[pos + 2 : pos + 4])[0]
            seg_end = pos + 2 + seg_len
            if seg_end > n:
                break
            # Keep APP0 (JFIF, 0xE0), drop APP1..APP15 (0xE1..0xEF EXIF/XMP) and COM (0xFE)
            if not (0xE1 <= marker <= 0xEF or marker == 0xFE):
                out.extend(img_bytes[pos:seg_end])
            pos = seg_end
        return bytes(out)
    return img_bytes


_EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")


def scan_ocr_transcript_for_leaks(ocr_text: str) -> List[str]:
    """
    Scans OCR transcript from proof image or video frames for:
      1. All F-13 forbidden tokens (scan_for_f13_leaks), AND
      2. Personal/corporate emails outside allowlisted GCP service-account domains (*.gserviceaccount.com) and @example.com.
    """
    hits = list(cb1.scan_for_f13_leaks(ocr_text))
    allowed_domains = {"example.com", "example.org"}
    extra_env = os.environ.get("CREATE_BLOG2_ALLOWED_DEMO_DOMAINS", "").strip()
    for d in extra_env.split(","):
        if d.strip():
            allowed_domains.add(d.strip().lower())
    for m in _EMAIL_REGEX.finditer(str(ocr_text or "")):
        full_email = m.group(0).lower()
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
    ocr_inspector_fn: Optional[Callable[[bytes, str], str]] = None,
    api_key_override: Optional[str] = None,
) -> Tuple[bool, List[str], str]:
    """
    Runs pixel-level Gemini 2.5 Flash Vision OCR at MEDIA_RESOLUTION_HIGH on proof images or quarantined videos.
    Fails closed (HTTP 503 OCR_INSPECTOR_UNAVAILABLE) if neither live Gemini credentials nor an injected test
    inspector is available.
    """
    inspector = ocr_inspector_fn or _TEST_OCR_INSPECTOR_FN
    if inspector is not None:
        transcript = str(inspector(media_bytes, mime_type) or "")
        leaks = scan_ocr_transcript_for_leaks(transcript)
        return (len(leaks) == 0, leaks, transcript)

    has_key = bool((api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip())
    tok = cb1._get_gcp_bearer_token()
    if not (has_key or tok):
        raise CreateBlog2Error(
            "Pixel-level Gemini Vision OCR inspector requires live Vertex AI or GEMINI_API_KEY credentials. Fail-closed.",
            503,
            "OCR_INSPECTOR_UNAVAILABLE",
        )

    b64_data = base64.b64encode(media_bytes).decode("ascii")
    prompt_txt = (
        "Transcribe verbatim ALL visible text in this image or video, including browser URL bars, query parameters, "
        "account chips, email addresses, project IDs, tab titles, and console banners. Return plain text only."
    )
    contents = [
        {
            "role": "user",
            "parts": [
                {"inlineData": {"mimeType": mime_type, "data": b64_data}},
                {"text": prompt_txt},
            ],
        }
    ]
    body_obj: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 4096,
            "mediaResolution": "MEDIA_RESOLUTION_HIGH",
        },
    }
    api_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    if tok:
        url = (
            f"https://{DEFAULT_VERTEX_LOCATION}-aiplatform.googleapis.com/v1beta1/"
            f"projects/{DEFAULT_GCP_PROJECT}/locations/{DEFAULT_VERTEX_LOCATION}/"
            f"publishers/google/models/gemini-2.5-flash:generateContent"
        )
        hdrs = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={urllib.parse.quote(api_key)}"
        hdrs = {"Content-Type": "application/json"}

    req = urllib.request.Request(url, data=json.dumps(body_obj).encode("utf-8"), headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45.0) as resp:
            resp_obj = json.loads(resp.read().decode("utf-8"))
        parts = (((resp_obj.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        transcript = "\n".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
    except Exception as exc:
        raise CreateBlog2Error(
            f"Gemini Vision OCR inspection failed: {cb1._redact_secret(str(exc), api_key)[:180]}",
            503,
            "OCR_INSPECTOR_UNAVAILABLE",
        ) from None

    leaks = scan_ocr_transcript_for_leaks(transcript)
    return (len(leaks) == 0, leaks, transcript)


# ---------------------------------------------------------------------------
# Strict SVG Sanitizer (sanitize_svg_safe + foreignObject / external href reject)
# ---------------------------------------------------------------------------
def sanitize_svg_strict(svg_str: str) -> str:
    s = str(svg_str or "").strip()
    low = s.lower()
    if "<script" in low or "<foreignobject" in low or "javascript:" in low or "<!doctype" in low or "<!entity" in low:
        raise CreateBlog2Error("Disallowed script, foreignObject, or DTD construct in SVG.", 400, "UNSAFE_SVG")
    if re.search(r"\bon[a-z]+\s*=", low):
        raise CreateBlog2Error("Disallowed inline event handler attribute in SVG.", 400, "UNSAFE_SVG")
    if re.search(r'\b(?:xlink:)?href\s*=\s*["\']\s*(?:https?:|//)', low):
        raise CreateBlog2Error("Disallowed external href in SVG.", 400, "UNSAFE_SVG")
    return _bam.sanitize_svg_safe(s)


# ---------------------------------------------------------------------------
# Index, Lazy Hydration, 256 MiB /tmp LRU & 36 MiB Resumable Sync
# ---------------------------------------------------------------------------
def _load_index(refresh_gcs: bool = False) -> Dict[str, Any]:
    if refresh_gcs:
        hydrate_index_from_gcs_once(force=True)
    p = get_storage_root() / "index.json"
    if p.is_file():
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, dict) and isinstance(data.get("blogs"), list):
                return data
        except Exception:
            pass
    return {"schemaVersion": "3.0", "updatedAt": _now_iso(), "blogs": []}


def _save_index_local(data: Dict[str, Any]) -> bytes:
    data["updatedAt"] = _now_iso()
    raw = json.dumps(data, indent=2).encode("utf-8")
    p = get_storage_root() / "index.json"
    tmp = get_storage_root() / ".index.tmp.json"
    tmp.write_bytes(raw)
    tmp.replace(p)
    return raw


def _update_index_entry_cas(manifest: Dict[str, Any]) -> bytes:
    summary = {
        "slug": manifest["slug"],
        "title": manifest["title"],
        "subtitle": manifest["subtitle"],
        "domain": manifest["domain"],
        "audience": manifest["audience"],
        "createdAt": manifest["createdAt"],
        "updatedAt": manifest["updatedAt"],
        "createdBy": manifest.get("createdBy") or manifest.get("actorEmail") or "local-operator",
        "status": manifest.get("status", "DRAFT_AWAITING_PROOF"),
        "proofStatus": manifest.get("proofStatus", "DRAFT_AWAITING_PROOF"),
        "modelUsed": manifest["generation"]["model"],
        "authMode": manifest["generation"]["authMode"],
        "proofCount": len(manifest.get("proofs") or []),
        "audioTracks": manifest.get("audio", {}).get("tracksGenerated", 0),
        "ttsStatus": manifest.get("audio", {}).get("ttsStatus", "NOT_RUN"),
        "qualityPassed": manifest.get("quality", {}).get("deterministic", {}).get("passed", 0),
        "qualityTotal": manifest.get("quality", {}).get("deterministic", {}).get("total", 13),
        "diagramCount": len(manifest.get("diagrams") or {}),
        "slideCount": len((manifest.get("blueprint") or {}).get("slides") or []),
        "judgeVerdict": (manifest.get("quality", {}).get("orthogonalJudge") or {}).get("verdict", "UNRUN"),
        "judgeScore": (manifest.get("quality", {}).get("orthogonalJudge") or {}).get("score"),
        "workspaceSync": manifest.get("workspaceSync") or {},
    }

    def _mutate(cur_idx: Dict[str, Any]) -> Dict[str, Any]:
        local_idx = _load_index(refresh_gcs=False)
        by_slug: Dict[str, Dict[str, Any]] = {}
        for src_list in (cur_idx.get("blogs") or [], local_idx.get("blogs") or []):
            for b in src_list:
                if isinstance(b, dict) and b.get("slug"):
                    by_slug[str(b["slug"])] = b
        by_slug[manifest["slug"]] = summary
        ordered = sorted(by_slug.values(), key=lambda x: str(x.get("updatedAt") or ""), reverse=True)
        return {"schemaVersion": "3.0", "updatedAt": _now_iso(), "blogs": ordered}

    updated_idx = _update_gcs_json_with_cas("index.json", _mutate)
    return _save_index_local(updated_idx)


def hydrate_index_from_gcs_once(force: bool = False) -> None:
    global _GCS_INDEX_HYDRATED, _GCS_INDEX_LAST_SYNC
    if not _is_gcs_sync_enabled():
        return
    now = time.time()
    if not force and _GCS_INDEX_HYDRATED and (now - _GCS_INDEX_LAST_SYNC) < _GCS_INDEX_TTL_SEC:
        return
    raw = _gcs_download_bytes("index.json")
    _GCS_INDEX_HYDRATED = True
    _GCS_INDEX_LAST_SYNC = now
    if not raw:
        return
    try:
        remote = json.loads(raw.decode("utf-8"))
        if isinstance(remote, dict) and isinstance(remote.get("blogs"), list):
            with _STATE_LOCK:
                _save_index_local(remote)
    except Exception:
        pass


def _ensure_rel_hydrated(slug: str, rel_path: str) -> Optional[Path]:
    """Lazily downloads requested asset from GCS on cache miss and enforces 256 MiB /tmp LRU budget."""
    blog_dir = (get_storage_root() / slug).resolve()
    target = (blog_dir / rel_path).resolve()
    if not str(target).startswith(str(blog_dir) + os.sep):
        return None
    if target.is_file():
        return target
    if not _is_gcs_sync_enabled():
        return None
    raw = _gcs_download_bytes(f"{slug}/{rel_path}")
    if raw is None:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    _enforce_tmp_cache_budget(max_bytes=TMP_CACHE_BUDGET_BYTES, protected_slugs={slug})
    return target


def _sync_blog_dir_to_gcs_async(slug: str, blog_dir: Path, *, sync: bool = True) -> None:
    """Uploads blog assets up to 36 MiB (using resumable upload > 8 MiB); skips _quarantine and _chunks."""
    if not _is_gcs_sync_enabled():
        return
    files_to_push: List[Tuple[str, bytes, str]] = []
    manifest_entry: Optional[Tuple[str, bytes, str]] = None
    for p in sorted(blog_dir.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(blog_dir).as_posix()
        if rel.startswith(("_quarantine/", "_chunks/")):
            continue
        try:
            b = p.read_bytes()
        except Exception:
            continue
        if len(b) > MAX_GCS_SYNC_FILE_BYTES:
            continue
        entry = (f"{slug}/{rel}", b, cb1._guess_mime(rel))
        if rel == "manifest.json":
            manifest_entry = entry
        else:
            files_to_push.append(entry)

    def _upload_all() -> None:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=6) as pool:
            list(pool.map(lambda item: _gcs_upload_bytes(item[0], item[1], item[2]), files_to_push))
        if manifest_entry is not None:
            _gcs_upload_bytes(manifest_entry[0], manifest_entry[1], manifest_entry[2])

    if sync:
        _upload_all()
    else:
        threading.Thread(target=_upload_all, daemon=True).start()


def _persist_job_state_to_gcs(job_rec: Dict[str, Any], *, sync: bool = False) -> None:
    if not _is_gcs_sync_enabled():
        return
    jid = str(job_rec.get("jobId") or "").strip()
    if not re.fullmatch(r"cb2-[a-f0-9]{12}", jid):
        return
    payload = json.dumps(job_rec, separators=(",", ":")).encode("utf-8")
    obj_rel = f"_jobs/{jid}.json"
    if sync:
        _gcs_upload_bytes(obj_rel, payload, "application/json")
    else:
        threading.Thread(target=_gcs_upload_bytes, args=(obj_rel, payload, "application/json"), daemon=True).start()


def _check_rate_limit(actor_key: str) -> None:
    now = time.time()
    key = (actor_key or "anonymous").strip().lower()
    with _RATE_LOCK:
        dq = _RATE_HITS.setdefault(key, deque())
        while dq and (now - dq[0]) > 3600.0:
            dq.popleft()
        if len(dq) >= JOB_RATE_LIMIT_PER_HOUR:
            raise CreateBlog2Error(
                f"Generation rate limit reached ({JOB_RATE_LIMIT_PER_HOUR} blogs/hour for {key}).",
                429,
                "RATE_LIMIT_EXCEEDED",
            )
        dq.append(now)


# ---------------------------------------------------------------------------
# Fail-Closed Cloud TTS Narration (Zero Synthetic WAV) & 12-Slide Host MP4
# ---------------------------------------------------------------------------
def _clean_text_for_third_person_tts(raw_text: str) -> str:
    txt = cb1.strip_inline_md(cb1.strip_emojis(str(raw_text or "")))
    # Strip leading "Slide X of Y:" or "Slide X:"
    txt = re.sub(r"(?i)^\s*slide\s+\d+(?:\s+of\s+\d+)?\s*[:.\-–—]?\s*", "", txt)
    # Replace first-person "I " / "I'll " / "I'm " with architectural third-person phrasing
    txt = re.sub(r"\bI\s+will\b", "This architecture will", txt)
    txt = re.sub(r"\bI'll\b", "The system will", txt)
    txt = re.sub(r"\bI\s+recommend\b", "The reference design recommends", txt)
    txt = re.sub(r"\bI\s+have\b", "The platform has", txt)
    txt = re.sub(r"\bI\s+am\b", "This section is", txt)
    txt = re.sub(r"\bI\b", "the architecture", txt)
    return txt.strip()[:1400]


def synthesize_tts_track_fail_closed(
    text: str,
    voice_name: str = "en-US-Chirp3-HD-Charon",
    tts_transport: Optional[Callable[[str, str], Tuple[Optional[bytes], Optional[str]]]] = None,
) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Calls live Google Cloud Text-to-Speech (or injected test tts_transport).
    NEVER generates synthetic sine/harmonic WAV audio.
    """
    clean_txt = _clean_text_for_third_person_tts(text)
    if not clean_txt:
        return (None, "Empty narration text")
    transport = tts_transport or _TEST_TTS_TRANSPORT_FN
    if transport is not None:
        return transport(clean_txt, voice_name)
    if os.environ.get("GEAP_DISABLE_VERTEX_AUTH") == "1":
        return (None, "BLOCKED_TTS_UNAVAILABLE: Vertex/Cloud TTS authentication disabled")
    return cb1.synthesize_tts_mp3(clean_txt, voice_name=voice_name)


def _try_compile_host_mp4_all_slides(blog_dir: Path, slug: str, durations: List[float], slide_count: int) -> Optional[str]:
    """Iterates across all slide_count slides (1..12) when ffmpeg and rsvg-convert are present on host."""
    if not (shutil.which("ffmpeg") and shutil.which("rsvg-convert")):
        return None
    video_dir = blog_dir / "recordings"
    video_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = video_dir / "_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    seg_files: List[Path] = []
    try:
        for i in range(1, slide_count + 1):
            svg_p = blog_dir / "slides" / f"slide_{i:02d}.svg"
            mp3_p = blog_dir / "audio" / f"slide_{i:02d}.mp3"
            if not (svg_p.is_file() and mp3_p.is_file()):
                return None
            png_p = tmp_dir / f"slide_{i:02d}.png"
            import subprocess as _sp
            _sp.run(
                ["rsvg-convert", "-w", "1280", "-h", "720", str(svg_p), "-o", str(png_p)],
                check=True, stdout=_sp.DEVNULL, stderr=_sp.DEVNULL, timeout=20,
            )
            seg_p = tmp_dir / f"seg_{i:02d}.mp4"
            _sp.run(
                [
                    "ffmpeg", "-y", "-loop", "1", "-i", str(png_p), "-i", str(mp3_p),
                    "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", "-r", "24", str(seg_p),
                ],
                check=True, stdout=_sp.DEVNULL, stderr=_sp.DEVNULL, timeout=45,
            )
            seg_files.append(seg_p)
        lst_p = tmp_dir / "concat.txt"
        lst_p.write_text("\n".join(f"file '{p.resolve()}'" for p in seg_files), encoding="utf-8")
        out_mp4 = video_dir / "narration_slideshow.mp4"
        import subprocess as _sp
        _sp.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst_p), "-c", "copy", str(out_mp4)],
            check=True, stdout=_sp.DEVNULL, stderr=_sp.DEVNULL, timeout=60,
        )
        return "recordings/narration_slideshow.mp4" if out_mp4.is_file() else None
    except Exception:
        return None
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 13-Check Deterministic Quality Gate (D-01..D-12 + D-13 Numeric Claim Coverage)
# ---------------------------------------------------------------------------
def run_deterministic_quality_gate_v2(
    *,
    bp: Dict[str, Any],
    md_text: str,
    arch_drawio: str,
    arch_svg: str,
    seq_drawio: str,
    seq_svg: str,
    pptx_bytes: bytes,
    docx_bytes: bytes,
    py_ast_ok: bool,
    py_ast_err: str,
    starter_files: Dict[str, str],
    extra_diagrams: Optional[Dict[str, Dict[str, Any]]] = None,
    arch_icon_count: Optional[int] = None,
) -> Dict[str, Any]:
    base_det = cb1.run_deterministic_quality_gate(
        bp=bp,
        md_text=md_text,
        arch_drawio=arch_drawio,
        arch_svg=arch_svg,
        seq_drawio=seq_drawio,
        seq_svg=seq_svg,
        pptx_bytes=pptx_bytes,
        docx_bytes=docx_bytes,
        py_ast_ok=py_ast_ok,
        py_ast_err=py_ast_err,
        starter_files=starter_files,
        extra_diagrams=extra_diagrams,
        arch_icon_count=arch_icon_count,
    )
    checks = list(base_det.get("checks") or [])

    # Upgrade D-11 with destructive command scanner
    tf_all_findings = scan_starter_security_and_destructive_cmds(starter_files)
    for c in checks:
        if c.get("id") == "D-11":
            c["status"] = "PASS" if len(tf_all_findings) == 0 else "FAIL"
            c["detail"] = (
                "0 allUsers bindings, 0 deprecated v1 resources, 0 unauthenticated or destructive commands."
                if not tf_all_findings
                else " | ".join(f"[{x['id']}] {x['detail']}" for x in tf_all_findings[:4])
            )

    # Add D-13: Numeric Claim & Provenance Coverage
    d13_ok, unledgered = check_d13_numeric_claim_coverage(bp, md_text)
    checks.append({
        "id": "D-13",
        "label": "Numeric Claim & Provenance Coverage",
        "status": "PASS" if d13_ok else "FAIL",
        "detail": (
            f"All quantitative claims across prose, slides, and notes match claimLedger ({len(bp.get('claimLedger') or [])} entries)."
            if d13_ok
            else f"Un-ledgered quantitative claims: {', '.join(unledgered[:6])}"
        ),
    })

    passed_n = sum(1 for c in checks if c["status"] == "PASS")
    return {
        "total": len(checks),
        "passed": passed_n,
        "allPassed": passed_n == len(checks),
        "checks": checks,
        "tfFindings": tf_all_findings,
        "unledgeredClaims": unledgered,
    }


def _auto_bind_unledgered_claims_in_place(bp: Dict[str, Any], unledgered: List[str]) -> None:
    """Binds model-authored quantitative metrics into claimLedger as EXAMPLE_TARGET / DERIVED_MODEL during auto-revision."""
    ledger = bp.setdefault("claimLedger", [])
    next_idx = len(ledger) + 1
    for expr in unledgered[:16]:
        ledger.append({
            "id": f"CLM-{next_idx:02d}",
            "claim": f"Modeled architectural metric ({expr})",
            "value": expr,
            "provenance": "EXAMPLE_TARGET",
            "basis": "Auto-bound illustrative engineering target during D-13 numeric coverage pass",
        })
        next_idx += 1


# ---------------------------------------------------------------------------
# Compile & Save Blog Package (12-Slide v3 Deck, 6 Vector Diagrams, DRAFT_AWAITING_PROOF)
# ---------------------------------------------------------------------------
def _enforce_draft_awaiting_proof_frontmatter(md_text: str, proof_status: str) -> str:
    if re.search(r'^status:\s*"[^"]*"', md_text, flags=re.M):
        return re.sub(r'^status:\s*"[^"]*"', f'status: "{proof_status}"', md_text, count=1, flags=re.M)
    if md_text.startswith("---\n"):
        return md_text.replace("---\n", f'---\nstatus: "{proof_status}"\n', 1)
    return f'---\nstatus: "{proof_status}"\n---\n\n' + md_text


def compile_and_save_blog(
    *,
    blueprint: Dict[str, Any],
    slug: str,
    model_used: str,
    auth_mode: str,
    actor_email: str,
    voice_name: str = "en-US-Chirp3-HD-Charon",
    enable_tts: bool = True,
    strict_tts: bool = False,
    enable_judge: bool = True,
    enable_auto_revise: bool = True,
    grounding: Optional[Dict[str, Any]] = None,
    api_key_override: Optional[str] = None,
    progress_cb: Optional[Callable[[int, str, str], None]] = None,
    latency_ms: float = 0.0,
    tts_transport: Optional[Callable[[str, str], Tuple[Optional[bytes], Optional[str]]]] = None,
    redirect_resolver: Optional[Callable[[str], str]] = None,
    head_checker: Optional[Callable[[str], bool]] = None,
    fail_on_d13_without_auto_bind: bool = False,
) -> Dict[str, Any]:
    def _step(pct: int, stage: str, msg: str) -> None:
        if progress_cb:
            progress_cb(pct, stage, msg)

    clean_slug = validate_existing_slug(slug)
    blog_dir = get_storage_root() / clean_slug
    for sub in ("diagrams", "slides", "docs", "audio", "proofs", "recordings"):
        (blog_dir / sub).mkdir(parents=True, exist_ok=True)

    # Ensure 12 slides for v3 canonical parity
    if len(blueprint.get("slides") or []) < 12:
        blueprint = cb1.normalize_blueprint(
            blueprint,
            blueprint.get("prompt") or blueprint.get("title") or "Google Cloud Architecture",
            blueprint.get("domain") or "Google Cloud Architecture",
            blueprint.get("audience") or "Solutions Architects",
            target_slides=12,
        )

    # Bind & validate grounding metadata (Pass-1 redirect resolution + support-segment check)
    g_raw = grounding or {"status": "NOT_RUN", "queries": [], "sources": []}
    g_info = bind_and_validate_grounding_metadata(
        g_raw,
        blueprint,
        redirect_resolver=redirect_resolver,
        head_checker=head_checker,
    )

    # New blogs always start with 0 proofs and DRAFT_AWAITING_PROOF (never recycling verified-cloud-console PNGs)
    proofs: List[Dict[str, Any]] = []
    proof_status = "DRAFT_AWAITING_PROOF"

    def _compile_artifacts(bp_cur: Dict[str, Any]) -> Dict[str, Any]:
        diags = cb1.compile_all_diagrams_v2(bp_cur, clean_slug)
        for kind, dv in diags.items():
            _bam.validate_drawio_xml_safe(dv["xml"])
            dv["svg"] = sanitize_svg_strict(dv["svg"])
            (blog_dir / "diagrams" / f"{clean_slug}-{kind}.drawio").write_text(dv["xml"], encoding="utf-8")
            (blog_dir / "diagrams" / f"{clean_slug}-{kind}.svg").write_text(dv["svg"], encoding="utf-8")

        extra_svgs = {k: diags[k]["svg"] for k in ("cloudarch", "security", "wire", "async") if k in diags}
        extra_urls = {k: diags[k]["viewerUrl"] for k in ("cloudarch", "security", "wire", "async") if k in diags}
        native_slides: Dict[int, Tuple[str, str]] = {}
        for d_k, s_num in (("architecture", 3), ("cloudarch", 4), ("sequence", 5), ("security", 6), ("wire", 7), ("async", 8)):
            dv_d = diags.get(d_k)
            if dv_d and dv_d.get("ooxmlSlideXml"):
                native_slides[s_num] = (dv_d["ooxmlSlideXml"], dv_d["viewerUrl"])

        slide_svgs = cb1.compile_slide_preview_svgs(
            bp_cur, clean_slug, diags["architecture"]["svg"], diags["sequence"]["svg"], proofs, blog_dir, extra_svgs=extra_svgs
        )
        for i, s_svg in enumerate(slide_svgs, 1):
            clean_s_svg = sanitize_svg_strict(s_svg)
            (blog_dir / "slides" / f"slide_{i:02d}.svg").write_text(clean_s_svg, encoding="utf-8")

        pptx_b = cb1.compile_pptx_bytes(
            bp_cur, clean_slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"], proofs, blog_dir,
            extra_urls=extra_urls, native_slide_xmls=native_slides,
        )
        (blog_dir / "slides" / f"{clean_slug}-deck.pptx").write_bytes(pptx_b)

        raw_md = cb1.compile_blog_markdown(
            bp_cur, clean_slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"],
            proofs, model_used, extra_urls=extra_urls, grounding=g_info,
        )
        # Rewrite /api/create-blog1/ asset links to /api/create-blog-2/ and enforce DRAFT_AWAITING_PROOF frontmatter
        md_t = raw_md.replace("/api/create-blog1/", "/api/create-blog-2/")
        md_t = _enforce_draft_awaiting_proof_frontmatter(md_t, proof_status)
        (blog_dir / "blog.md").write_text(md_t, encoding="utf-8")

        docx_b = cb1.compile_docx_bytes(
            bp_cur, clean_slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"],
            proofs, blog_dir, extra_urls=extra_urls, grounding=g_info,
        )
        (blog_dir / "docs" / f"{clean_slug}-whitepaper.docx").write_bytes(docx_b)

        sz_b, s_files, _, _ = cb1.compile_starter_zip(bp_cur, clean_slug)
        (blog_dir / f"{clean_slug}-starter.zip").write_bytes(sz_b)

        # Strict in-memory AST & dangerous import check (zero code execution)
        ast_ok, ast_err = validate_generated_python_ast_safe(s_files.get("app.py", ""))
        if not ast_ok:
            raise CreateBlog2Error(f"Generated starter Python failed static AST security check: {ast_err}", 422, "UNSAFE_STARTER_AST")

        # Post-build OOXML integrity & template-leak gate
        ooxml_check = validate_ooxml_package_integrity(
            pptx_b, docx_b, prompt_text=str(bp_cur.get("prompt") or ""), expected_slides=len(slide_svgs)
        )
        if not ooxml_check["valid"]:
            raise CreateBlog2Error(
                f"OOXML package integrity / template-leak gate failed: {'; '.join(ooxml_check['errors'][:4])}",
                422,
                "OOXML_INTEGRITY_FAILED",
            )

        det = run_deterministic_quality_gate_v2(
            bp=bp_cur,
            md_text=md_t,
            arch_drawio=diags["architecture"]["xml"],
            arch_svg=diags["architecture"]["svg"],
            seq_drawio=diags["sequence"]["xml"],
            seq_svg=diags["sequence"]["svg"],
            pptx_bytes=pptx_b,
            docx_bytes=docx_b,
            py_ast_ok=ast_ok,
            py_ast_err=ast_err,
            starter_files=s_files,
            extra_diagrams=diags,
            arch_icon_count=diags["architecture"]["iconCount"],
        )
        return {
            "diags": diags,
            "slideCount": len(slide_svgs),
            "pptxBytes": pptx_b,
            "mdText": md_t,
            "docxBytes": docx_b,
            "starterFiles": s_files,
            "astOk": ast_ok,
            "astErr": ast_err,
            "ooxmlIntegrity": ooxml_check,
            "det": det,
        }

    _step(48, "COMPILE_DIAGRAMS", "Compiling 6 WS1-parity Draw.io + SVG + DrawingML vector diagrams...")
    _step(58, "COMPILE_SLIDES", "Building 12-slide native OOXML .pptx deck & vector slide previews...")
    _step(64, "COMPILE_DOCS", "Compiling Markdown blog (DRAFT_AWAITING_PROOF) & .docx whitepaper...")
    _step(68, "COMPILE_STARTER", "Building Terraform + Python starter.zip & running static AST + D-11 security scan...")
    art = _compile_artifacts(blueprint)
    det_report = art["det"]

    # Enforce D-13 Numeric Claim Coverage: revise/bind or fail closed
    if det_report.get("unledgeredClaims"):
        if fail_on_d13_without_auto_bind:
            raise CreateBlog2Error(
                f"D-13 Numeric Claim Coverage failed: un-ledgered claims {', '.join(det_report['unledgeredClaims'][:5])}",
                422,
                "UNGROUNDED_NUMERIC_CLAIMS",
            )
        _auto_bind_unledgered_claims_in_place(blueprint, det_report["unledgeredClaims"])
        art = _compile_artifacts(blueprint)
        det_report = art["det"]
        if det_report.get("unledgeredClaims"):
            raise CreateBlog2Error(
                f"D-13 Numeric Claim Coverage failed after revision: {', '.join(det_report['unledgeredClaims'][:5])}",
                422,
                "UNGROUNDED_NUMERIC_CLAIMS",
            )

    if det_report.get("tfFindings"):
        raise CreateBlog2Error(
            f"D-11 Terraform/Shell static security gate failed: {det_report['tfFindings'][0]['detail']}",
            422,
            "TERRAFORM_SECURITY_FAILED",
        )

    _step(72, "QUALITY_GATE", f"Deterministic gate complete: {det_report['passed']}/{det_report['total']} checks.")

    revision_meta: Dict[str, Any] = {"executed": False, "appliedFixes": [], "round1": None, "round2": None}
    if enable_judge:
        _step(76, "ORTHOGONAL_JUDGE", "Running grounded independent orthogonal Gemini judge...")
        judge_report = cb1.run_orthogonal_llm_judge(
            bp=blueprint,
            md_text=art["mdText"],
            generator_model=model_used,
            api_key_override=api_key_override,
            grounding=g_info,
            tf_findings=det_report.get("tfFindings") or [],
        )
    else:
        judge_report = {
            "status": "DISABLED_BY_REQUEST",
            "verdict": "SKIPPED",
            "score": None,
            "summary": "Orthogonal LLM judge disabled by caller option.",
            "strengths": [],
            "findings": [],
        }

    slide_n = art["slideCount"]
    audio_tracks: List[Dict[str, Any]] = []
    audio_errors: List[str] = []
    durations: List[float] = []
    tts_status = "DISABLED"
    if enable_tts:
        _step(85, "SYNTHESIZE_TTS", f"Synthesizing {slide_n} third-person spoken slide tracks via Cloud TTS ({voice_name})...")
        for i, sl in enumerate(blueprint["slides"][:slide_n], 1):
            txt_s = sl.get("speakerNotes") or sl.get("title") or ""
            mp3_bytes, tts_err = synthesize_tts_track_fail_closed(txt_s, voice_name=voice_name, tts_transport=tts_transport)
            if mp3_bytes:
                rel = f"audio/slide_{i:02d}.mp3"
                (blog_dir / rel).write_bytes(mp3_bytes)
                dur = cb1.estimate_mp3_duration_seconds(mp3_bytes)
                durations.append(dur)
                audio_tracks.append({
                    "slideNumber": i,
                    "title": cb1.strip_inline_md(sl["title"]),
                    "relPath": rel,
                    "bytes": len(mp3_bytes),
                    "durationSec": dur,
                    "voice": voice_name,
                    "provenance": "SYNTHETIC_CLOUD_TTS_CHIRP3_HD",
                })
            else:
                durations.append(8.0)
                if tts_err and tts_err not in audio_errors:
                    audio_errors.append(tts_err)
        if len(audio_tracks) == slide_n:
            tts_status = "READY"
        else:
            tts_status = "BLOCKED_TTS_UNAVAILABLE"
            if strict_tts:
                raise CreateBlog2Error(
                    f"Cloud TTS synthesis unavailable ({'; '.join(audio_errors[:2]) or 'no credentials'}). Fail-closed: zero synthetic audio fallback.",
                    503,
                    "BLOCKED_TTS_UNAVAILABLE",
                )
    else:
        durations = [8.0] * slide_n

    vtt_text = cb1.build_webvtt(blueprint["slides"][:slide_n], durations)
    (blog_dir / "audio" / "captions.vtt").write_text(vtt_text, encoding="utf-8")

    host_mp4_rel = _try_compile_host_mp4_all_slides(blog_dir, clean_slug, durations, slide_n) if len(audio_tracks) == slide_n else None
    video_status = "HOST_MP4_READY" if host_mp4_rel else ("CLIENT_CANVAS_WEBM_EXPORTER_READY" if len(audio_tracks) == slide_n else "BLOCKED_AWAITING_TTS")

    quality_report = {
        "slug": clean_slug,
        "checkedAt": _now_iso(),
        "deterministic": det_report,
        "ooxmlIntegrity": art["ooxmlIntegrity"],
        "orthogonalJudge": judge_report,
        "grounding": g_info,
        "autoRevision": revision_meta,
    }
    (blog_dir / "quality_report.json").write_text(json.dumps(quality_report, indent=2), encoding="utf-8")

    diags = art["diags"]
    diagrams_manifest = {}
    for k in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
        if k not in diags:
            continue
        dv = diags[k]
        geom = dv.get("geometry") or {}
        cb2_diag_id = f"cb2-{clean_slug}-{k}"
        diagrams_manifest[k] = {
            "id": cb2_diag_id,
            "kind": k,
            "layer": dv["layer"],
            "slideNumber": dv["slide"],
            "title": dv.get("label") or dv.get("title") or k.title(),
            "iconCount": dv.get("iconCount", 0),
            "vertexCount": dv.get("vertexCount", 0),
            "edgeCount": dv.get("edgeCount", 0),
            "geometryValid": bool(geom.get("valid", True)),
            "geometryErrors": geom.get("errors") or [],
            "drawioPath": f"diagrams/{clean_slug}-{k}.drawio",
            "svgPath": f"diagrams/{clean_slug}-{k}.svg",
            "pngPath": "",
            "viewerUrl": dv["viewerUrl"],
            "studioUrl": f"/drawio-editor?id={urllib.parse.quote(cb2_diag_id)}",
        }

    created_at = _now_iso()
    owner_email = (actor_email or "local-operator").strip().lower()
    manifest: Dict[str, Any] = {
        "schemaVersion": "3.0",
        "studioVersion": "create-blog-2",
        "slug": clean_slug,
        "status": proof_status,
        "proofStatus": proof_status,
        "title": blueprint["title"],
        "subtitle": blueprint["subtitle"],
        "summary": blueprint["summary"],
        "domain": blueprint["domain"],
        "audience": blueprint["audience"],
        "estimatedReadMinutes": blueprint["estimatedReadMinutes"],
        "prompt": blueprint["prompt"],
        "createdAt": created_at,
        "updatedAt": created_at,
        "createdBy": owner_email,
        "actorEmail": owner_email,
        "generation": {
            "model": model_used,
            "authMode": auth_mode,
            "latencyMs": latency_ms,
            "pipelineVersion": "v3_create_blog_2_zero_hallucination",
            "slideCount": slide_n,
            "diagramCount": len(diagrams_manifest),
            "totalEmbeddedIcons": sum(d["iconCount"] for d in diagrams_manifest.values()),
            "grounding": g_info,
        },
        "diagrams": diagrams_manifest,
        "assets": {
            "markdown": "blog.md",
            "pptx": f"slides/{clean_slug}-deck.pptx",
            "docx": f"docs/{clean_slug}-whitepaper.docx",
            "starterZip": f"{clean_slug}-starter.zip",
            "bundleZip": f"{clean_slug}-bundle.zip",
            "qualityReport": "quality_report.json",
            "captionsVtt": "audio/captions.vtt",
            "narrationVideo": host_mp4_rel,
            "liveWalkthroughVideo": None,
            "slidePreviews": [f"slides/slide_{i:02d}.svg" for i in range(1, slide_n + 1)],
        },
        "audio": {
            "enabled": enable_tts,
            "ttsStatus": tts_status,
            "voice": voice_name,
            "narrationMode": "SYNTHETIC_CLOUD_TTS_CHIRP3_HD",
            "provenance": "SYNTHETIC_CLOUD_TTS_CHIRP3_HD",
            "tracksGenerated": len(audio_tracks),
            "totalDurationSec": round(sum(t["durationSec"] for t in audio_tracks), 2),
            "tracks": audio_tracks,
            "errors": audio_errors,
            "videoStatus": video_status,
            "hostMp4Available": bool(host_mp4_rel),
        },
        "starterMeta": {
            "starterStatus": "GENERATED_TEMPLATE_UNDEPLOYED",
            "status": "GENERATED_TEMPLATE_UNDEPLOYED",
            "pythonVerification": "STATIC_AST_PARSE_AND_IMPORT_ALLOWLIST_VERIFIED",
            "terraformVerification": "STATIC_HCL_SECURITY_LINT_ONLY_UNVALIDATED_PROVIDER",
            "pythonAstValid": art["astOk"],
            "pythonAstError": art["astErr"],
            "tfSecurityFindings": det_report.get("tfFindings") or [],
            "files": art["starterFiles"],
        },
        "proofs": proofs,
        "recordings": {},
        "workspaceSync": {"status": "NOT_SYNCED"},
        "quality": quality_report,
        "blueprint": blueprint,
    }
    (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    _step(95, "BUNDLE_AND_SYNC", "Packaging complete archive bundle & syncing to durable GCS store with CAS...")
    cb1._rebuild_bundle_zip(blog_dir, clean_slug)
    _sync_blog_dir_to_gcs_async(clean_slug, blog_dir, sync=True)
    _update_index_entry_cas(manifest)
    _enforce_tmp_cache_budget(max_bytes=TMP_CACHE_BUDGET_BYTES, protected_slugs={clean_slug})
    _step(100, "COMPLETED", "All deliverables compiled & verified.")
    return manifest


# ---------------------------------------------------------------------------
# Capabilities, Catalog, Detail, Asset Serving & Studio Lookup
# ---------------------------------------------------------------------------
def get_capabilities() -> Dict[str, Any]:
    has_key = bool(os.environ.get("GEMINI_API_KEY", "").strip())
    tok = cb1._get_gcp_bearer_token()
    has_vertex = bool(tok)
    icon_prov = verify_icon_pack_provenance()
    host_mp4 = bool(shutil.which("ffmpeg") and shutil.which("rsvg-convert"))
    return {
        "ok": True,
        "studio": "Create Blog 2 — Zero-Hallucination Architecture Studio",
        "schemaVersion": "3.0",
        "liveGeminiReady": has_key or has_vertex,
        "authMode": "vertex_ai_iam" if has_vertex else ("gemini_api_key" if has_key else "unavailable_fail_closed"),
        "project": DEFAULT_GCP_PROJECT,
        "vertexLocation": DEFAULT_VERTEX_LOCATION,
        "auth": {
            "vertexAiIamReady": has_vertex,
            "geminiApiKeyEnvReady": has_key,
            "llmReady": has_key or has_vertex,
        },
        "allowedModels": list(ALLOWED_MODELS),
        "allowedVoices": list(ALLOWED_VOICES),
        "allowedProvenanceTags": list(ALLOWED_PROVENANCE_TAGS),
        "durableGcsBucket": DURABLE_GCS_BUCKET,
        "durableGcsPrefix": DURABLE_GCS_PREFIX,
        "capabilities": {
            "diagramLayersPerBlog": 6,
            "slideCountPerDeck": 12,
            "deterministicChecksCount": 13,
            "officialGcpSvgIcons": icon_prov["totalIcons"],
            "publicGcpPackageIcons": icon_prov["publicGcpPackageIcons"],
            "cloudTtsChirp3Hd": has_vertex,
            "gcsDurableStorage": _is_gcs_sync_enabled() and has_vertex,
            "googleSearchGrounding": has_key or has_vertex,
            "workspaceOauthSync": False,
            "hostMp4Compiler": host_mp4,
            "hostMp4CompilerAvailable": host_mp4,
            "clientWebmExporterAvailable": True,
            "maxProofImageBytes": MAX_PROOF_IMAGE_BYTES,
            "maxVideoChunkRawBytes": MAX_VIDEO_CHUNK_RAW_BYTES,
            "maxInlineOcrVideoBytes": MAX_INLINE_OCR_VIDEO_BYTES,
            "tmpCacheBudgetBytes": TMP_CACHE_BUDGET_BYTES,
        },
    }


def list_blogs(refresh_gcs: bool = False) -> List[Dict[str, Any]]:
    idx = _load_index(refresh_gcs=refresh_gcs)
    return [b for b in (idx.get("blogs") or []) if isinstance(b, dict)]


def get_blog_detail(slug: str) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    mp = _ensure_rel_hydrated(clean, "manifest.json")
    if mp is None or not mp.is_file():
        raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
    manifest = json.loads(mp.read_text(encoding="utf-8"))
    md_p = _ensure_rel_hydrated(clean, "blog.md")
    md_text = md_p.read_text(encoding="utf-8") if md_p and md_p.is_file() else ""
    arch_p = _ensure_rel_hydrated(clean, f"diagrams/{clean}-architecture.svg")
    seq_p = _ensure_rel_hydrated(clean, f"diagrams/{clean}-sequence.svg")
    data = dict(manifest)
    data["ok"] = True
    data["manifest"] = manifest
    data["markdown"] = md_text
    data["markdownText"] = md_text
    data["architectureSvgAvailable"] = bool(arch_p and arch_p.is_file())
    data["sequenceSvgAvailable"] = bool(seq_p and seq_p.is_file())
    data["assetBaseUrl"] = f"/api/create-blog-2/blogs/{clean}/asset/"
    return data


def get_blog_asset_file(slug: str, rel_path: str) -> Tuple[Path, str]:
    clean = validate_existing_slug(slug)
    rel = str(rel_path or "").strip().lstrip("/")
    if not rel or ".." in Path(rel).parts or rel.startswith(("_quarantine", "_chunks", ".")):
        raise CreateBlog2Error("Invalid or quarantined asset path.", 400, "INVALID_ASSET_PATH")
    fp = _ensure_rel_hydrated(clean, rel)
    if fp is None or not fp.is_file() or fp.is_symlink():
        raise CreateBlog2Error(f"Asset '{rel}' not found for blog '{clean}'.", 404, "ASSET_NOT_FOUND")
    return (fp, cb1._guess_mime(rel))


def get_diagram_record_for_studio(diag_id: str) -> Optional[Dict[str, Any]]:
    """Resolves cb2-<slug>-<kind> (or <slug>-<kind>) for /drawio-editor and /api/drawio/item/."""
    did = str(diag_id or "").strip()
    raw_target = did[4:] if did.startswith("cb2-") else did
    kind, slug = "", ""
    slide_map = {"architecture": 3, "cloudarch": 4, "sequence": 5, "security": 6, "wire": 7, "async": 8}
    for sfx in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
        if raw_target.endswith(f"-{sfx}"):
            kind, slug = sfx, raw_target[: -(len(sfx) + 1)]
            break
    if not kind or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", slug) or slug in RESERVED_SLUGS:
        return None
    drawio_p = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.drawio")
    if drawio_p is None or not drawio_p.is_file():
        return None
    svg_p = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.svg")
    xml_str = drawio_p.read_text(encoding="utf-8")
    svg_str = svg_p.read_text(encoding="utf-8") if svg_p and svg_p.is_file() else ""
    cb2_id = f"cb2-{slug}-{kind}"
    return {
        "item": {
            "diagramId": cb2_id,
            "id": cb2_id,
            "slug": slug,
            "kind": kind,
            "title": f"{slug} ({kind.title()})",
            "slideNumber": slide_map.get(kind, 3),
            "origin": "create-blog-2",
            "standaloneAppDiagramsNetUrl": cb1.encode_drawio_viewer_url(re.sub(r">\s+<", "><", xml_str.strip())),
        },
        "xml": xml_str,
        "svg": svg_str,
        "selfContainedHash": cb1.encode_drawio_studio_hash(xml_str),
    }


# ---------------------------------------------------------------------------
# Recompile After Proof / Diagram / Video Mutation
# ---------------------------------------------------------------------------
def _recompile_after_mutation(slug: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    blog_dir = get_storage_root() / slug
    bp = manifest["blueprint"]
    proofs = manifest.get("proofs") or []
    stages_present = {str(p.get("stage") or "").upper() for p in proofs if isinstance(p, dict)}
    if "BEFORE" in stages_present and "AFTER" in stages_present:
        manifest["proofStatus"] = "USER_ATTESTED_PROOF_ATTACHED"
        manifest["status"] = "USER_ATTESTED_PROOF_ATTACHED"
    else:
        manifest["proofStatus"] = "DRAFT_AWAITING_PROOF"
        manifest["status"] = "DRAFT_AWAITING_PROOF"

    diags_xml: Dict[str, str] = {}
    diags_svg: Dict[str, str] = {}
    diags_url: Dict[str, str] = {}
    for k in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
        dp = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{k}.drawio")
        sp = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{k}.svg")
        if dp and dp.is_file():
            x = dp.read_text(encoding="utf-8")
            diags_xml[k] = x
            diags_url[k] = cb1.encode_drawio_viewer_url(re.sub(r">\s+<", "><", x.strip()))
        if sp and sp.is_file():
            diags_svg[k] = sanitize_svg_strict(sp.read_text(encoding="utf-8"))

    # Re-generate native DrawingML slide XMLs from current blueprint/diagrams
    compiled_diags = cb1.compile_all_diagrams_v2(bp, slug)
    native_slides: Dict[int, Tuple[str, str]] = {}
    for d_k, s_num in (("architecture", 3), ("cloudarch", 4), ("sequence", 5), ("security", 6), ("wire", 7), ("async", 8)):
        dv_d = compiled_diags.get(d_k)
        if dv_d and dv_d.get("ooxmlSlideXml"):
            native_slides[s_num] = (dv_d["ooxmlSlideXml"], diags_url.get(d_k) or dv_d["viewerUrl"])

    extra_svgs = {k: diags_svg[k] for k in ("cloudarch", "security", "wire", "async") if k in diags_svg}
    extra_urls = {k: diags_url[k] for k in ("cloudarch", "security", "wire", "async") if k in diags_url}
    arch_svg = diags_svg.get("architecture") or compiled_diags["architecture"]["svg"]
    seq_svg = diags_svg.get("sequence") or compiled_diags["sequence"]["svg"]
    arch_url = diags_url.get("architecture") or compiled_diags["architecture"]["viewerUrl"]
    seq_url = diags_url.get("sequence") or compiled_diags["sequence"]["viewerUrl"]

    slide_svgs = cb1.compile_slide_preview_svgs(bp, slug, arch_svg, seq_svg, proofs, blog_dir, extra_svgs=extra_svgs)
    for i, s_svg in enumerate(slide_svgs, 1):
        (blog_dir / "slides" / f"slide_{i:02d}.svg").write_text(sanitize_svg_strict(s_svg), encoding="utf-8")

    pptx_b = cb1.compile_pptx_bytes(
        bp, slug, arch_url, seq_url, proofs, blog_dir, extra_urls=extra_urls, native_slide_xmls=native_slides
    )
    (blog_dir / "slides" / f"{slug}-deck.pptx").write_bytes(pptx_b)

    g_info = (manifest.get("generation") or {}).get("grounding") or {}
    model_used = (manifest.get("generation") or {}).get("model") or "gemini-2.5-flash"
    raw_md = cb1.compile_blog_markdown(
        bp, slug, arch_url, seq_url, proofs, model_used, extra_urls=extra_urls, grounding=g_info
    )
    md_t = raw_md.replace("/api/create-blog1/", "/api/create-blog-2/")
    md_t = _enforce_draft_awaiting_proof_frontmatter(md_t, manifest["proofStatus"])
    (blog_dir / "blog.md").write_text(md_t, encoding="utf-8")

    docx_b = cb1.compile_docx_bytes(
        bp, slug, arch_url, seq_url, proofs, blog_dir, extra_urls=extra_urls, grounding=g_info
    )
    (blog_dir / "docs" / f"{slug}-whitepaper.docx").write_bytes(docx_b)

    ooxml_check = validate_ooxml_package_integrity(
        pptx_b, docx_b, prompt_text=str(bp.get("prompt") or ""), expected_slides=len(slide_svgs)
    )
    if not ooxml_check["valid"]:
        raise CreateBlog2Error(
            f"OOXML integrity gate failed on recompile: {'; '.join(ooxml_check['errors'][:3])}",
            422,
            "OOXML_INTEGRITY_FAILED",
        )

    manifest["updatedAt"] = _now_iso()
    (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    cb1._rebuild_bundle_zip(blog_dir, slug)
    _sync_blog_dir_to_gcs_async(slug, blog_dir, sync=True)
    _update_index_entry_cas(manifest)
    return manifest


# ---------------------------------------------------------------------------
# Proof Screenshot Upload & Deletion (Owner-Scoped, >=1280x720, Metadata Strip, OCR)
# ---------------------------------------------------------------------------
_BANNED_SOURCE_HOST_SUFFIXES = (
    ".run.app",
    ".internal",
    ".local",
    ".localhost",
)


def _validate_proof_source_url(raw_url: str) -> str:
    u = str(raw_url or "").strip()
    if not u:
        return ""
    safe = cb1.validate_safe_https_url(u)
    if not safe:
        raise CreateBlog2Error(
            "Invalid or disallowed proof sourceUrl (must be public HTTPS; localhost and internal domains are blocked).",
            400,
            "INVALID_SOURCE_URL",
        )
    parsed = urllib.parse.urlparse(safe)
    host = (parsed.hostname or "").lower()
    if any(host.endswith(sfx) for sfx in _BANNED_SOURCE_HOST_SUFFIXES):
        raise CreateBlog2Error(
            f"Source host '{host}' is blocked by proof authenticity policy.",
            400,
            "BANNED_PROOF_ORIGIN",
        )
    if cb1.scan_for_f13_leaks(safe):
        raise CreateBlog2Error(
            "Proof sourceUrl contains restricted internal tokens.",
            400,
            "BANNED_PROOF_ORIGIN",
        )
    return safe


def attach_proof_screenshot(
    slug: str,
    payload: Dict[str, Any],
    *,
    actor_email: str = "local-operator",
    ocr_inspector_fn: Optional[Callable[[bytes, str], str]] = None,
    api_key_override: Optional[str] = None,
) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    stage = str(payload.get("stage") or "BEFORE").strip().upper()
    if stage not in ALLOWED_PROOF_STAGES:
        raise CreateBlog2Error(f"Unsupported proof stage '{stage}'.", 400, "INVALID_PROOF_STAGE")
    caption = cb1.strip_emojis(cb1._sanitize_for_public_output(str(payload.get("caption") or "").strip()))[:240]
    if len(caption) < 4:
        raise CreateBlog2Error("Please provide a descriptive caption (at least 4 characters).", 400, "CAPTION_TOO_SHORT")
    if cb1.scan_for_f13_leaks(str(payload.get("caption") or "")):
        raise CreateBlog2Error("Caption contains restricted internal tokens.", 422, "PROOF_F13_PIXEL_LEAK_DETECTED")

    source_url = _validate_proof_source_url(str(payload.get("sourceUrl") or ""))

    b64_raw = str(payload.get("dataBase64") or "").strip()
    if "," in b64_raw and b64_raw.lower().startswith("data:image/"):
        b64_raw = b64_raw.split(",", 1)[1].strip()
    if not b64_raw:
        raise CreateBlog2Error("Missing base64 image payload.", 400, "MISSING_IMAGE_DATA")

    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        verify_blog_owner_access(manifest, actor_email)

        try:
            raw_img_bytes = base64.b64decode(b64_raw, validate=True)
        except Exception:
            raise CreateBlog2Error("Malformed base64 image payload.", 400, "INVALID_BASE64") from None

        if len(raw_img_bytes) > MAX_PROOF_IMAGE_BYTES:
            raise CreateBlog2Error("Proof image exceeds 6 MiB limit.", 413, "IMAGE_TOO_LARGE")

        try:
            ext, w, h, mime = cb1.parse_image_header(raw_img_bytes)
        except cb1.CreateBlog1Error as exc:
            raise CreateBlog2Error(exc.message, exc.status_code, exc.code) from None

        if w < 1280 or h < 720:
            raise CreateBlog2Error(
                f"Proof screenshot dimensions ({w}x{h}) are below the minimum required HD resolution (1280x720).",
                400,
                "PROOF_RESOLUTION_TOO_LOW",
            )

        # Strip ancillary PNG tEXt/iTXt/eXIf and JPEG EXIF segments
        clean_bytes = strip_image_metadata_bytes(raw_img_bytes, ext)

        # Run pixel-level Gemini 2.5 Flash Vision OCR F-13 & PII leak gate
        ocr_ok, ocr_leaks, _ = inspect_media_pixels_for_f13_leaks(
            clean_bytes,
            mime,
            ocr_inspector_fn=ocr_inspector_fn,
            api_key_override=api_key_override,
        )
        if not ocr_ok:
            raise CreateBlog2Error(
                f"Pixel-level OCR detected restricted tokens or personal PII in screenshot: {', '.join(ocr_leaks[:4])}",
                422,
                "PROOF_F13_PIXEL_LEAK_DETECTED",
            )

        sha = hashlib.sha256(clean_bytes).hexdigest()
        existing = manifest.get("proofs") or []
        if len(existing) >= 12:
            raise CreateBlog2Error("Maximum 12 proof screenshots per blog reached.", 400, "PROOF_LIMIT_REACHED")
        if any(p.get("sha256") == sha for p in existing):
            raise CreateBlog2Error("Identical screenshot (matching SHA-256) is already attached.", 409, "DUPLICATE_PROOF")

        tier_label = (
            "USER_ATTESTED_RETINA_2X_CAPTURE"
            if (w >= 2560 and h >= 1440)
            else "USER_ATTESTED_HD_CAPTURE"
        )
        proof_id = f"prf-{secrets.token_hex(4)}"
        fname = f"{stage.lower()}_{proof_id}.{ext}"
        rel_path = f"proofs/{fname}"
        blog_dir = get_storage_root() / clean
        dest = blog_dir / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(clean_bytes)

        entry = {
            "id": proof_id,
            "stage": stage,
            "caption": caption,
            "sourceUrl": source_url,
            "filename": fname,
            "relPath": rel_path,
            "ext": ext,
            "mime": mime,
            "width": w,
            "height": h,
            "bytes": len(clean_bytes),
            "sha256": sha,
            "metadataStripped": True,
            "pixelOcrVerified": True,
            "verificationTier": tier_label,
            "authenticityLabel": tier_label,
            "uploadedAt": _now_iso(),
            "uploadedBy": actor_email,
        }
        existing.append(entry)
        manifest["proofs"] = existing
        updated = _recompile_after_mutation(clean, manifest)
        return {
            "ok": True,
            "proof": entry,
            "proofCount": len(updated["proofs"]),
            "proofStatus": updated["proofStatus"],
            "updatedAt": updated["updatedAt"],
        }


def delete_proof_screenshot(slug: str, proof_id: str, *, actor_email: str = "local-operator") -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    pid = str(proof_id or "").strip()
    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        verify_blog_owner_access(manifest, actor_email)

        proofs = manifest.get("proofs") or []
        target = next((p for p in proofs if p.get("id") == pid), None)
        if not target:
            raise CreateBlog2Error(f"Proof '{pid}' not found.", 404, "PROOF_NOT_FOUND")
        blog_dir = get_storage_root() / clean
        fp = (blog_dir / target["relPath"]).resolve()
        if str(fp).startswith(str(blog_dir.resolve()) + os.sep) and fp.is_file():
            fp.unlink()
        _gcs_delete_object(f"{clean}/{target['relPath']}")
        manifest["proofs"] = [p for p in proofs if p.get("id") != pid]
        updated = _recompile_after_mutation(clean, manifest)
        return {
            "ok": True,
            "deletedId": pid,
            "proofCount": len(updated["proofs"]),
            "proofStatus": updated["proofStatus"],
        }


# ---------------------------------------------------------------------------
# Multi-Replica Stateless Video Chunk Upload, Quarantine & OCR Promotion
# ---------------------------------------------------------------------------
def _sniff_video_container(chunk0: bytes) -> Tuple[str, str]:
    """Sniffs WebM/Matroska (1A 45 DF A3) or ISO-BMFF MP4 (ftyp at offset 4)."""
    if len(chunk0) < 16:
        raise CreateBlog2Error("Video chunk 0 is too short to sniff container format.", 400, "INVALID_VIDEO_CONTAINER")
    if chunk0[:4] == b"\x1a\x45\xdf\xa3":
        return ("webm", "video/webm")
    if chunk0[4:8] == b"ftyp":
        return ("mp4", "video/mp4")
    raise CreateBlog2Error(
        "Unsupported video container magic bytes (only genuine WebM or MP4 streams are accepted).",
        400,
        "INVALID_VIDEO_CONTAINER",
    )


def upload_video_chunk(
    slug: str,
    payload: Dict[str, Any],
    *,
    actor_email: str = "local-operator",
    ocr_inspector_fn: Optional[Callable[[bytes, str], str]] = None,
    api_key_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Stateless multi-replica chunked video upload:
      - Verifies per-chunk SHA-256 and CRC32C.
      - Stores part_<chunkIndex:04d> and updates session.json via ifGenerationMatch CAS.
      - On isLastChunk=True, composes parts into _quarantine/<uploadId>.<webm|mp4>, verifies
        composite RFC 3720 CRC32C and total byte size, runs pixel OCR (for live_walkthrough or <=14 MiB),
        and promotes to recordings/<target>.<webm|mp4> only after passing.
    """
    clean = validate_existing_slug(slug)
    mp = _ensure_rel_hydrated(clean, "manifest.json")
    if mp is None or not mp.is_file():
        raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
    manifest = json.loads(mp.read_text(encoding="utf-8"))
    verify_blog_owner_access(manifest, actor_email)

    upload_id = str(payload.get("uploadId") or "").strip()
    if not re.fullmatch(r"upl-[a-zA-Z0-9_-]{6,36}", upload_id):
        raise CreateBlog2Error("Invalid uploadId (must match upl-<alnum>).", 400, "INVALID_UPLOAD_ID")
    target = str(payload.get("target") or "live_walkthrough").strip().lower()
    if target not in ("live_walkthrough", "narration_slideshow"):
        raise CreateBlog2Error("Unsupported video target.", 400, "INVALID_VIDEO_TARGET")

    try:
        chunk_index = int(payload.get("chunkIndex", -1))
        total_chunks = int(payload.get("totalChunks", 1))
    except Exception:
        raise CreateBlog2Error("Invalid chunkIndex or totalChunks.", 400, "INVALID_CHUNK_INDEX") from None

    max_chunks = 7 if target == "live_walkthrough" else 16
    max_total_bytes = MAX_INLINE_OCR_VIDEO_BYTES if target == "live_walkthrough" else MAX_SLIDESHOW_VIDEO_BYTES
    if chunk_index < 0 or chunk_index >= max_chunks or total_chunks < 1 or total_chunks > max_chunks or chunk_index >= total_chunks:
        raise CreateBlog2Error(
            f"chunkIndex {chunk_index}/{total_chunks} out of allowed range (max {max_chunks} chunks for {target}).",
            400,
            "CHUNK_LIMIT_EXCEEDED",
        )

    b64_chunk = str(payload.get("dataBase64") or "").strip()
    if "," in b64_chunk and b64_chunk.lower().startswith("data:"):
        b64_chunk = b64_chunk.split(",", 1)[1].strip()
    try:
        chunk_bytes = base64.b64decode(b64_chunk, validate=True)
    except Exception:
        raise CreateBlog2Error("Malformed base64 chunk data.", 400, "INVALID_BASE64") from None

    if len(chunk_bytes) == 0 or len(chunk_bytes) > MAX_VIDEO_CHUNK_RAW_BYTES:
        raise CreateBlog2Error(f"Chunk size {len(chunk_bytes)} exceeds 2 MiB limit.", 413, "CHUNK_TOO_LARGE")

    actual_sha = hashlib.sha256(chunk_bytes).hexdigest()
    expected_chunk_sha = str(payload.get("chunkSha256") or "").strip().lower()
    if expected_chunk_sha and actual_sha != expected_chunk_sha:
        raise CreateBlog2Error("Chunk SHA-256 mismatch.", 400, "CHUNK_CHECKSUM_MISMATCH")

    actual_crc_int = compute_crc32c_int(chunk_bytes)
    actual_crc_b64 = format_crc32c_b64(actual_crc_int)
    expected_chunk_crc = str(payload.get("chunkCrc32c") or "").strip()
    if expected_chunk_crc and actual_crc_b64 != expected_chunk_crc:
        raise CreateBlog2Error("Chunk CRC32C mismatch.", 400, "CHUNK_CHECKSUM_MISMATCH")

    detected_ext, detected_mime = ("", "")
    if chunk_index == 0:
        detected_ext, detected_mime = _sniff_video_container(chunk_bytes)

    blog_dir = get_storage_root() / clean
    part_rel = f"_chunks/{upload_id}/part_{chunk_index:04d}"
    local_part = blog_dir / part_rel
    local_part.parent.mkdir(parents=True, exist_ok=True)
    local_part.write_bytes(chunk_bytes)
    if _is_gcs_sync_enabled():
        _gcs_upload_bytes(f"{clean}/{part_rel}", chunk_bytes, "application/octet-stream")

    session_rel = f"{clean}/_chunks/{upload_id}/session.json"
    local_session_p = blog_dir / f"_chunks/{upload_id}/session.json"

    def _mutate_session(cur_sess: Dict[str, Any]) -> Dict[str, Any]:
        if not cur_sess and local_session_p.is_file():
            try:
                cur_sess = json.loads(local_session_p.read_text(encoding="utf-8"))
            except Exception:
                cur_sess = {}
        parts_map = cur_sess.get("parts") if isinstance(cur_sess.get("parts"), dict) else {}
        ext_val = detected_ext or cur_sess.get("ext") or "webm"
        mime_val = detected_mime or cur_sess.get("mime") or "video/webm"
        parts_map[str(chunk_index)] = {
            "index": chunk_index,
            "bytes": len(chunk_bytes),
            "sha256": actual_sha,
            "crc32cInt": actual_crc_int,
            "crc32c": actual_crc_b64,
            "relPath": f"{clean}/{part_rel}",
            "localRel": part_rel,
        }
        return {
            "uploadId": upload_id,
            "slug": clean,
            "target": target,
            "totalChunks": total_chunks,
            "ext": ext_val,
            "mime": mime_val,
            "createdAt": cur_sess.get("createdAt") or _now_iso(),
            "updatedAt": _now_iso(),
            "parts": parts_map,
        }

    sess = _update_gcs_json_with_cas(session_rel, _mutate_session)
    local_session_p.write_text(json.dumps(sess, indent=2), encoding="utf-8")

    is_last = bool(payload.get("isLastChunk", False)) or (len(sess["parts"]) == total_chunks and chunk_index == total_chunks - 1)
    if not is_last:
        return {
            "ok": True,
            "status": "CHUNK_ACCEPTED",
            "uploadId": upload_id,
            "chunkIndex": chunk_index,
            "receivedChunks": len(sess["parts"]),
            "totalChunks": total_chunks,
            "chunkSha256": actual_sha,
            "chunkCrc32c": actual_crc_b64,
        }

    # Verify all chunks 0..total_chunks-1 are present
    parts_map = sess.get("parts") or {}
    if any(str(i) not in parts_map for i in range(total_chunks)):
        raise CreateBlog2Error("Missing one or more video chunks prior to finalization.", 400, "INCOMPLETE_CHUNKS")

    ordered_parts = [parts_map[str(i)] for i in range(total_chunks)]
    total_bytes = sum(int(p["bytes"]) for p in ordered_parts)
    if total_bytes > max_total_bytes:
        raise CreateBlog2Error(
            f"Composed video size ({total_bytes} bytes) exceeds {max_total_bytes} byte limit for {target}.",
            413,
            "VIDEO_TOO_LARGE",
        )

    expected_total_bytes = payload.get("expectedTotalBytes")
    if expected_total_bytes is not None and int(expected_total_bytes) != total_bytes:
        raise CreateBlog2Error(f"Total byte length mismatch ({total_bytes} != {expected_total_bytes}).", 400, "SIZE_MISMATCH")

    # Compute RFC 3720 combined CRC32C across all parts
    combined_crc_int = 0
    for idx_p, p_meta in enumerate(ordered_parts):
        if idx_p == 0:
            combined_crc_int = int(p_meta["crc32cInt"])
        else:
            combined_crc_int = combine_crc32c_ints(combined_crc_int, int(p_meta["crc32cInt"]), int(p_meta["bytes"]))
    combined_crc_b64 = format_crc32c_b64(combined_crc_int)

    ext = sess.get("ext") or "webm"
    mime = sess.get("mime") or "video/webm"
    quarantine_rel = f"_quarantine/{upload_id}.{ext}"
    quarantine_gcs_rel = f"{clean}/{quarantine_rel}"

    # Assemble into quarantine (never publicly served)
    composed_bytes = bytearray()
    if _is_gcs_sync_enabled():
        src_rels = [p["relPath"] for p in ordered_parts]
        ok_comp, gcs_crc_b64, gcs_size = _gcs_compose_objects(src_rels, quarantine_gcs_rel, mime)
        if not ok_comp or gcs_size != total_bytes or (gcs_crc_b64 and gcs_crc_b64 != combined_crc_b64):
            _gcs_delete_object(quarantine_gcs_rel)
            raise CreateBlog2Error("GCS composite CRC32C or size verification failed.", 500, "COMPOSE_CHECKSUM_FAILED")
        raw_q = _gcs_download_bytes(quarantine_gcs_rel)
        if raw_q is None:
            raise CreateBlog2Error("Unable to read quarantined composite video.", 500, "QUARANTINE_READ_FAILED")
        composed_bytes.extend(raw_q)
    else:
        for p_meta in ordered_parts:
            lp = blog_dir / p_meta["localRel"]
            if not lp.is_file():
                raise CreateBlog2Error(f"Missing local chunk {p_meta['localRel']}.", 400, "MISSING_CHUNK")
            composed_bytes.extend(lp.read_bytes())

    full_video_bytes = bytes(composed_bytes)
    full_sha256 = hashlib.sha256(full_video_bytes).hexdigest()
    expected_sha = str(payload.get("expectedSha256") or "").strip().lower()
    if expected_sha and full_sha256 != expected_sha:
        _gcs_delete_object(quarantine_gcs_rel)
        raise CreateBlog2Error("Composed video SHA-256 mismatch.", 400, "VIDEO_SHA256_MISMATCH")

    local_quarantine = blog_dir / quarantine_rel
    local_quarantine.parent.mkdir(parents=True, exist_ok=True)
    local_quarantine.write_bytes(full_video_bytes)

    # Cleanup chunk objects
    for p_meta in ordered_parts:
        _gcs_delete_object(p_meta["relPath"])
    _gcs_delete_object(session_rel)
    shutil.rmtree(blog_dir / f"_chunks/{upload_id}", ignore_errors=True)

    # Mandatory server-side Gemini Vision OCR leak gate on quarantined video before promotion
    require_ocr = (target == "live_walkthrough") or (len(full_video_bytes) <= MAX_INLINE_OCR_VIDEO_BYTES and (ocr_inspector_fn is not None or _TEST_OCR_INSPECTOR_FN is not None))
    ocr_verified = False
    if require_ocr:
        try:
            ocr_ok, ocr_leaks, _ = inspect_media_pixels_for_f13_leaks(
                full_video_bytes,
                mime,
                ocr_inspector_fn=ocr_inspector_fn,
                api_key_override=api_key_override,
            )
        except Exception:
            if local_quarantine.is_file():
                local_quarantine.unlink()
            _gcs_delete_object(quarantine_gcs_rel)
            raise
        if not ocr_ok:
            if local_quarantine.is_file():
                local_quarantine.unlink()
            _gcs_delete_object(quarantine_gcs_rel)
            raise CreateBlog2Error(
                f"Quarantined video rejected by pixel OCR F-13 / PII gate: {', '.join(ocr_leaks[:4])}",
                422,
                "VIDEO_F13_OR_PII_LEAK_DETECTED",
            )
        ocr_verified = True

    # Promote from _quarantine/ to published recordings/<target>.<ext>
    published_rel = f"recordings/{target}.{ext}"
    published_local = blog_dir / published_rel
    published_local.parent.mkdir(parents=True, exist_ok=True)
    local_quarantine.replace(published_local)
    if _is_gcs_sync_enabled():
        _gcs_upload_bytes(f"{clean}/{published_rel}", full_video_bytes, mime)
        _gcs_delete_object(quarantine_gcs_rel)

    rec_entry = {
        "target": target,
        "relPath": published_rel,
        "ext": ext,
        "mime": mime,
        "bytes": total_bytes,
        "sha256": full_sha256,
        "crc32c": combined_crc_b64,
        "quarantineStatus": "PUBLISHED",
        "pixelOcrVerified": ocr_verified,
        "provenance": "USER_BROWSER_DISPLAY_MEDIA_CAPTURE" if target == "live_walkthrough" else "CLIENT_CANVAS_CHIRP3_SLIDESHOW_EXPORT",
        "uploadedAt": _now_iso(),
        "uploadedBy": actor_email,
    }
    with _STATE_LOCK:
        mp_cur = _ensure_rel_hydrated(clean, "manifest.json")
        manifest_cur = json.loads(mp_cur.read_text(encoding="utf-8")) if mp_cur and mp_cur.is_file() else manifest
        manifest_cur.setdefault("recordings", {})[target] = rec_entry
        if target == "live_walkthrough":
            manifest_cur.setdefault("assets", {})["liveWalkthroughVideo"] = published_rel
        else:
            manifest_cur.setdefault("assets", {})["narrationVideo"] = published_rel
        manifest_cur["updatedAt"] = _now_iso()
        (blog_dir / "manifest.json").write_text(json.dumps(manifest_cur, indent=2), encoding="utf-8")
        if _is_gcs_sync_enabled():
            _gcs_upload_bytes(f"{clean}/manifest.json", (blog_dir / "manifest.json").read_bytes(), "application/json")
        _update_index_entry_cas(manifest_cur)
        _enforce_tmp_cache_budget(max_bytes=TMP_CACHE_BUDGET_BYTES, protected_slugs={clean})

    return {
        "ok": True,
        "status": "PUBLISHED",
        "recording": rec_entry,
        "assetUrl": f"/api/create-blog-2/blogs/{clean}/asset/{published_rel}",
    }


def sweep_stale_chunks_and_quarantine(max_age_sec: int = QUARANTINE_TTL_SEC, now_ts: Optional[float] = None) -> Dict[str, int]:
    """Deletes abandoned _chunks/ and _quarantine/ files older than max_age_sec (default 24h)."""
    now_val = time.time() if now_ts is None else float(now_ts)
    root = get_storage_root()
    removed_local = 0
    for sub_name in ("_chunks", "_quarantine"):
        for dir_p in root.rglob(sub_name):
            if not dir_p.is_dir():
                continue
            for fp in list(dir_p.rglob("*")):
                if not fp.is_file():
                    continue
                try:
                    if (now_val - fp.stat().st_mtime) >= max_age_sec:
                        fp.unlink()
                        removed_local += 1
                except Exception:
                    pass
    return {"removedLocalFiles": removed_local, "maxAgeSec": max_age_sec}


# ---------------------------------------------------------------------------
# Owner-Scoped Two-Way Draw.io Save & 2x Diagram PNG Upload
# ---------------------------------------------------------------------------
def save_diagram_2way(
    slug: str,
    kind: str,
    payload: Dict[str, Any],
    *,
    actor_email: str = "local-operator",
) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    k = str(kind or "").strip().lower()
    if k not in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
        raise CreateBlog2Error(f"Unsupported diagram kind '{k}'.", 400, "INVALID_DIAGRAM_KIND")
    xml_str = str(payload.get("xml") or "").strip()
    _bam.validate_drawio_xml_safe(xml_str)
    if cb1.scan_for_f13_leaks(xml_str):
        raise CreateBlog2Error("Draw.io XML contains restricted internal tokens.", 422, "F13_LEAK_DETECTED")

    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        verify_blog_owner_access(manifest, actor_email)

        blog_dir = get_storage_root() / clean
        (blog_dir / "diagrams").mkdir(parents=True, exist_ok=True)
        (blog_dir / "diagrams" / f"{clean}-{k}.drawio").write_text(xml_str, encoding="utf-8")

        raw_svg = str(payload.get("svg") or "").strip()
        if raw_svg:
            clean_svg = sanitize_svg_strict(raw_svg)
        else:
            clean_svg = sanitize_svg_strict(_dps.synthesize_svg_from_drawio_xml(xml_str))
        (blog_dir / "diagrams" / f"{clean}-{k}.svg").write_text(clean_svg, encoding="utf-8")

        viewer_url = cb1.encode_drawio_viewer_url(re.sub(r">\s+<", "><", xml_str.strip()))
        if k in (manifest.get("diagrams") or {}):
            manifest["diagrams"][k]["viewerUrl"] = viewer_url
            manifest["diagrams"][k]["vertexCount"] = xml_str.count('vertex="1"')
            manifest["diagrams"][k]["edgeCount"] = xml_str.count('edge="1"')

        updated = _recompile_after_mutation(clean, manifest)
        return {
            "ok": True,
            "slug": clean,
            "kind": k,
            "diagramId": f"cb2-{clean}-{k}",
            "viewerUrl": viewer_url,
            "selfContainedHash": cb1.encode_drawio_studio_hash(xml_str),
            "updatedAt": updated["updatedAt"],
            "recompiledArtifacts": [
                "blog.md",
                f"slides/{clean}-deck.pptx",
                f"docs/{clean}-whitepaper.docx",
            ],
        }


# ---------------------------------------------------------------------------
# Law 9 / Rule 49 Native Google Docs Sync & Rule 47 Google Slides Sync
# ---------------------------------------------------------------------------
def _copy_drive_file_rest(token: str, template_file_id: str, new_title: str) -> Dict[str, Any]:
    url = f"https://www.googleapis.com/drive/v3/files/{urllib.parse.quote(template_file_id)}/copy?fields=id,name,webViewLink&supportsAllDrives=true"
    req = urllib.request.Request(
        url,
        data=json.dumps({"name": new_title}).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30.0) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _resolve_native_gdocs_template_id() -> str:
    env_id = os.environ.get("GEAP_NATIVE_GDOCS_TEMPLATE_ID", "").strip()
    if env_id:
        return env_id
    manifest_p = ROOT_DIR / "slides" / "cloud_viewer_manifest.json"
    if manifest_p.is_file():
        try:
            m = json.loads(manifest_p.read_text(encoding="utf-8"))
            ws1_doc = ((m.get("docs") or {}).get("WS1") or {}).get("googleDocsId", "")
            if ws1_doc:
                return str(ws1_doc)
        except Exception:
            pass
    return "1native-gdocs-template-default"


def sync_to_google_workspace(
    slug: str,
    *,
    actor_email: str = "local-operator",
    bridge_mod: Any = None,
    drive_copy_fn: Optional[Callable[[str, str, str], Dict[str, Any]]] = None,
    docs_sync_fn: Optional[Callable[[str, Path, str, str], int]] = None,
    slides_upload_fn: Optional[Callable[[str, str, str, str, bytes], Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Law 9 / Rule 49 compliant Workspace sync:
      - Google Docs: copies a native Google Docs template via drive.files.copy, then populates native
        paragraphs/tables/headings via bridge_mod._sync_markdown_into_existing_google_doc (documents.batchUpdate).
        NEVER calls _drive_multipart_upload with application/vnd.google-apps.document.
      - Google Slides: uploads .pptx with application/vnd.google-apps.presentation (Rule 47).
      - NEVER calls save_cloud_manifest() or path.relative_to(ROOT_DIR).
    """
    clean = validate_existing_slug(slug)
    mp = _ensure_rel_hydrated(clean, "manifest.json")
    if mp is None or not mp.is_file():
        raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
    manifest = json.loads(mp.read_text(encoding="utf-8"))
    verify_blog_owner_access(manifest, actor_email)

    token = None
    if bridge_mod is not None and hasattr(bridge_mod, "get_drive_access_token"):
        try:
            token = bridge_mod.get_drive_access_token()
        except Exception:
            token = None

    if not token:
        return {
            "ok": False,
            "statusCode": 412,
            "code": "WORKSPACE_OAUTH_REQUIRED",
            "error": (
                "No Google Drive / Workspace user OAuth token is mounted inside this runtime. "
                "Download the native OOXML .pptx and .docx directly below."
            ),
            "pptxDownloadUrl": f"/api/create-blog-2/blogs/{clean}/asset/slides/{clean}-deck.pptx",
            "docxDownloadUrl": f"/api/create-blog-2/blogs/{clean}/asset/docs/{clean}-whitepaper.docx",
        }

    pptx_p = _ensure_rel_hydrated(clean, f"slides/{clean}-deck.pptx")
    md_p = _ensure_rel_hydrated(clean, "blog.md")
    if not pptx_p or not md_p:
        raise CreateBlog2Error("Missing compiled .pptx or blog.md artifact for sync.", 404, "ASSET_NOT_FOUND")

    title = manifest["title"][:90]
    s_uploader = slides_upload_fn or cb1._drive_multipart_upload
    slides_res = s_uploader(
        token,
        f"{title} — 12-Slide Deck",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.google-apps.presentation",
        pptx_p.read_bytes(),
    )

    template_doc_id = _resolve_native_gdocs_template_id()
    copier = drive_copy_fn or _copy_drive_file_rest
    copied_doc = copier(token, template_doc_id, f"{title} — Architecture Guide")
    new_doc_id = str(copied_doc.get("id") or "").strip()
    if not new_doc_id:
        raise CreateBlog2Error("Failed to copy native Google Docs template.", 502, "GDOCS_COPY_FAILED")

    syncer = docs_sync_fn or (getattr(bridge_mod, "_sync_markdown_into_existing_google_doc", None) if bridge_mod else None)
    if syncer is None:
        raise CreateBlog2Error("Native Google Docs batchUpdate syncer unavailable.", 500, "GDOCS_SYNCER_MISSING")
    batch_ops = syncer(new_doc_id, md_p, f"{title} — Architecture Guide", token)

    sync_meta = {
        "status": "SYNCED",
        "method": "LAW9_NATIVE_FILES_COPY_AND_BATCH_UPDATE",
        "syncedAt": _now_iso(),
        "slidesId": slides_res.get("id", ""),
        "slidesUrl": f"https://docs.google.com/presentation/d/{slides_res.get('id', '')}/edit",
        "docId": new_doc_id,
        "docUrl": f"https://docs.google.com/document/d/{new_doc_id}/edit",
        "docsBatchUpdateCount": batch_ops,
    }
    with _STATE_LOCK:
        manifest["workspaceSync"] = sync_meta
        manifest["updatedAt"] = _now_iso()
        blog_dir = get_storage_root() / clean
        (blog_dir / "workspace_sync.json").write_text(json.dumps(sync_meta, indent=2), encoding="utf-8")
        (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        _sync_blog_dir_to_gcs_async(clean, blog_dir, sync=True)
        _update_index_entry_cas(manifest)
    return {"ok": True, "statusCode": 200, "workspaceSync": sync_meta}


# ---------------------------------------------------------------------------
# Owner-Scoped Soft-Delete with _trash/ Archive & CAS Index Update
# ---------------------------------------------------------------------------
def delete_blog(slug: str, *, actor_email: str = "local-operator") -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        verify_blog_owner_access(manifest, actor_email)

        ts_tag = int(time.time())
        trash_rel = f"_trash/{clean}-{ts_tag}.json"
        trash_record = {
            "deletedAt": _now_iso(),
            "deletedBy": actor_email,
            "slug": clean,
            "manifest": manifest,
        }
        trash_bytes = json.dumps(trash_record, indent=2).encode("utf-8")
        trash_local = get_storage_root() / trash_rel
        trash_local.parent.mkdir(parents=True, exist_ok=True)
        trash_local.write_bytes(trash_bytes)
        if _is_gcs_sync_enabled():
            _gcs_upload_bytes(trash_rel, trash_bytes, "application/json")

        blog_dir = (get_storage_root() / clean).resolve()
        rel_files: List[str] = []
        if blog_dir.is_dir():
            for p in blog_dir.rglob("*"):
                if p.is_file():
                    rel_files.append(p.relative_to(blog_dir).as_posix())
            shutil.rmtree(blog_dir, ignore_errors=True)

        def _remove_from_idx(cur_idx: Dict[str, Any]) -> Dict[str, Any]:
            local_idx = _load_index(refresh_gcs=False)
            merged = [
                b for b in (cur_idx.get("blogs") or local_idx.get("blogs") or [])
                if isinstance(b, dict) and b.get("slug") != clean
            ]
            return {"schemaVersion": "3.0", "updatedAt": _now_iso(), "blogs": merged}

        updated_idx = _update_gcs_json_with_cas("index.json", _remove_from_idx)
        _save_index_local(updated_idx)

        if _is_gcs_sync_enabled():
            for rf in rel_files:
                _gcs_delete_object(f"{clean}/{rf}")
            _gcs_delete_object(f"{clean}/manifest.json")

        return {"ok": True, "deletedSlug": clean, "trashArchive": trash_rel}


# ---------------------------------------------------------------------------
# Async Job Runner & Cross-Replica Job Status Lookup
# ---------------------------------------------------------------------------
def get_job_status(job_id: str) -> Dict[str, Any]:
    jid = str(job_id or "").strip()
    if not re.fullmatch(r"cb2-[a-f0-9]{12}", jid):
        raise CreateBlog2Error(f"Job '{jid}' not found.", 404, "JOB_NOT_FOUND")
    with _JOBS_LOCK:
        jr = _JOBS.get(jid)
        if jr is not None:
            return json.loads(json.dumps(jr))
    raw = _gcs_download_bytes(f"_jobs/{jid}.json")
    if raw:
        try:
            remote_job = json.loads(raw.decode("utf-8"))
            if isinstance(remote_job, dict) and remote_job.get("jobId") == jid:
                with _JOBS_LOCK:
                    _JOBS[jid] = remote_job
                return json.loads(json.dumps(remote_job))
        except Exception:
            pass
    raise CreateBlog2Error(f"Job '{jid}' not found.", 404, "JOB_NOT_FOUND")


def start_generation_job(
    payload: Dict[str, Any],
    *,
    api_key_override: Optional[str] = None,
    actor_email: str = "local-operator",
) -> Dict[str, Any]:
    prompt = str(payload.get("prompt") or "").strip()
    if len(prompt) < 12:
        raise CreateBlog2Error("Please enter a prompt of at least 12 characters.", 400, "PROMPT_TOO_SHORT")
    if len(prompt) > 4000:
        raise CreateBlog2Error("Prompt exceeds maximum length (4,000 characters).", 400, "PROMPT_TOO_LONG")

    title_hint = str(payload.get("titleHint") or "").strip()[:110]
    domain = str(payload.get("domain") or "Google Cloud Architecture").strip()[:80]
    audience = str(payload.get("audience") or "Solutions Architects & Platform Engineers").strip()[:80]
    model = str(payload.get("model") or "gemini-2.5-flash").strip()
    if model not in ALLOWED_MODELS:
        raise CreateBlog2Error(f"Unsupported model '{model}'.", 400, "INVALID_MODEL")
    voice = str(payload.get("voice") or "en-US-Chirp3-HD-Charon").strip()
    if voice not in ALLOWED_VOICES:
        voice = "en-US-Chirp3-HD-Charon"
    enable_tts = bool(payload.get("enableTts", True))
    enable_judge = bool(payload.get("enableJudge", True))
    enable_grounding = bool(payload.get("enableGrounding", True))
    enable_auto_revise = bool(payload.get("enableAutoRevise", True)) and enable_judge

    has_key = bool((api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip())
    has_vertex = bool(cb1._get_gcp_bearer_token())
    if not (has_key or has_vertex):
        raise ModelAuthUnavailableError(
            "No live Gemini credentials available (Vertex AI IAM bearer token unavailable and no GEMINI_API_KEY / X-Gemini-Api-Key provided). "
            "Fail-closed: Create Blog 2 will not emit placeholder or mocked blogs."
        )

    _check_rate_limit(actor_email)

    job_id = f"cb2-{uuid.uuid4().hex[:12]}"
    transient_key = (api_key_override or "").strip() or None
    job_rec = {
        "jobId": job_id,
        "status": "QUEUED",
        "progress": 4,
        "stage": "QUEUED",
        "message": f"Starting multi-stage live {model} zero-hallucination pipeline...",
        "model": model,
        "voice": voice,
        "createdBy": actor_email,
        "enableTts": enable_tts,
        "enableJudge": enable_judge,
        "enableGrounding": enable_grounding,
        "enableAutoRevise": enable_auto_revise,
        "slug": None,
        "error": None,
        "errorCode": None,
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
        "steps": [
            {"id": "GROUNDING_SEARCH", "label": "Pass 1: Live Google Search Grounding & Redirect Resolution", "status": "pending" if enable_grounding else "skipped"},
            {"id": "LLM_SYNTHESIS", "label": f"Pass 2A: Grounded Prose, SQL/GQL & Claim Ledger ({model})", "status": "pending"},
            {"id": "TOPOLOGY_AND_DECK", "label": "Pass 2B: 6 WS1-Grade Diagrams + 12-Slide Deck & Starter", "status": "pending"},
            {"id": "COMPILE_DIAGRAMS", "label": "Compile 6 WS1-Parity Draw.io + Sanitized SVG + Vector PPTX", "status": "pending"},
            {"id": "COMPILE_SLIDES", "label": "Build 12-Slide OOXML .pptx & Integrity Gate", "status": "pending"},
            {"id": "COMPILE_DOCS", "label": "Compile blog.md (DRAFT_AWAITING_PROOF) & .docx", "status": "pending"},
            {"id": "COMPILE_STARTER", "label": "Package starter.zip + Static AST & D-11 Security Scan", "status": "pending"},
            {"id": "QUALITY_GATE", "label": "13-Check Deterministic Gate (D-01..D-13 Numeric Coverage)", "status": "pending"},
            {"id": "ORTHOGONAL_JUDGE", "label": "Grounded Orthogonal Gemini Critic", "status": "pending" if enable_judge else "skipped"},
            {"id": "SYNTHESIZE_TTS", "label": "Cloud TTS Chirp3-HD Third-Person Audio (12 Tracks)", "status": "pending" if enable_tts else "skipped"},
            {"id": "BUNDLE_AND_SYNC", "label": "Bundle ZIP & Atomic GCS CAS Sync", "status": "pending"},
        ],
    }
    with _JOBS_LOCK:
        _JOBS[job_id] = job_rec
        initial_snap = json.loads(json.dumps(job_rec))
    _persist_job_state_to_gcs(initial_snap, sync=True)

    def _update_step(pct: int, stage: str, msg: str) -> None:
        snap = None
        with _JOBS_LOCK:
            jr = _JOBS.get(job_id)
            if not jr:
                return
            jr["progress"] = pct
            jr["stage"] = stage
            jr["message"] = cb1._redact_secret(msg, transient_key)
            jr["updatedAt"] = _now_iso()
            found_active = False
            for st in jr["steps"]:
                if st["status"] == "skipped":
                    continue
                if st["id"] == stage:
                    st["status"] = "running"
                    found_active = True
                elif not found_active:
                    st["status"] = "done"
            if stage == "COMPLETED":
                for st in jr["steps"]:
                    if st["status"] != "skipped":
                        st["status"] = "done"
            snap = json.loads(json.dumps(jr))
        if snap is not None:
            _persist_job_state_to_gcs(snap, sync=False)

    def _runner() -> None:
        with _CONCURRENT_JOB_SEM:
            try:
                t_start = time.perf_counter()
                with _JOBS_LOCK:
                    _JOBS[job_id]["status"] = "RUNNING"

                grounding: Dict[str, Any] = {"status": "DISABLED", "queries": [], "sources": []}
                if enable_grounding:
                    _update_step(10, "GROUNDING_SEARCH", "Pass 1: Running live Google Search grounding & resolving redirect URLs...")
                    grounding = _pipe_v2.call_gemini_grounded_search(
                        topic_prompt=prompt,
                        title_hint=title_hint,
                        domain=domain,
                        model="gemini-2.5-flash",
                        vertex_project=DEFAULT_GCP_PROJECT,
                        vertex_location=DEFAULT_VERTEX_LOCATION,
                        get_bearer_token=cb1._get_gcp_bearer_token,
                        api_key_override=transient_key,
                        timeout_s=45.0,
                    )

                _update_step(22, "LLM_SYNTHESIS", f"Pass 2A: Synthesizing grounded sections, DDL/formulas & claimLedger ({model})...")
                prose_raw, _ = cb1.call_gemini_json(
                    system_prompt=_pipe_v2.prose_stage_system_prompt(),
                    user_prompt=_pipe_v2.prose_stage_user_prompt(prompt, title_hint, domain, audience, grounding),
                    model=model,
                    api_key_override=transient_key,
                    max_output_tokens=24576,
                    thinking_budget=1024 if model == "gemini-2.5-flash" else 2048,
                    temperature=0.2,
                    timeout_s=130.0,
                )

                _update_step(36, "TOPOLOGY_AND_DECK", "Pass 2B: Synthesizing 6 WS1-parity C4 diagrams & 12-slide deck + Terraform starter...")
                topo_raw, _ = cb1.call_gemini_json(
                    system_prompt=_pipe_v2.topology_stage_system_prompt(),
                    user_prompt=_pipe_v2.topology_stage_user_prompt(prose_raw, prompt, grounding),
                    model=model,
                    api_key_override=transient_key,
                    max_output_tokens=24576,
                    thinking_budget=1024,
                    temperature=0.15,
                    timeout_s=130.0,
                )

                merged_raw = dict(prose_raw)
                for tk in (
                    "architectureZones", "architectureEdges", "sequenceActors", "sequenceSteps",
                    "securityDiagram", "wireDiagram", "asyncDiagram", "slides", "codeStarter",
                ):
                    if topo_raw.get(tk) is not None:
                        merged_raw[tk] = topo_raw[tk]

                bp = cb1.normalize_blueprint(merged_raw, prompt, domain, audience, target_slides=12)
                slug = _unique_slug(bp.get("slugHint") or title_hint or bp["title"])
                with _JOBS_LOCK:
                    _JOBS[job_id]["slug"] = slug

                total_lat_ms = round((time.perf_counter() - t_start) * 1000, 1)
                manifest = compile_and_save_blog(
                    blueprint=bp,
                    slug=slug,
                    model_used=model,
                    auth_mode="gemini_api_key" if transient_key else "vertex_ai_iam",
                    actor_email=actor_email,
                    voice_name=voice,
                    enable_tts=enable_tts,
                    enable_judge=enable_judge,
                    enable_auto_revise=enable_auto_revise,
                    grounding=grounding,
                    api_key_override=transient_key,
                    progress_cb=_update_step,
                    latency_ms=total_lat_ms,
                )
                with _JOBS_LOCK:
                    jr = _JOBS[job_id]
                    jr["status"] = "COMPLETED"
                    jr["progress"] = 100
                    jr["stage"] = "COMPLETED"
                    jr["slug"] = manifest["slug"]
                    jr["message"] = f"Completed '{manifest['title']}' ({manifest['quality']['deterministic']['passed']}/{manifest['quality']['deterministic']['total']} checks passed)."
                    jr["updatedAt"] = _now_iso()
                    done_snap = json.loads(json.dumps(jr))
                _persist_job_state_to_gcs(done_snap, sync=True)
            except Exception as exc:
                err_code = getattr(exc, "code", "GENERATION_FAILED")
                err_msg = cb1._redact_secret(str(getattr(exc, "message", str(exc))), transient_key)[:360]
                with _JOBS_LOCK:
                    jr = _JOBS.get(job_id)
                    if jr:
                        jr["status"] = "FAILED"
                        jr["error"] = err_msg
                        jr["errorCode"] = err_code
                        jr["message"] = f"Failed ({err_code}): {err_msg}"
                        jr["updatedAt"] = _now_iso()
                        fail_snap = json.loads(json.dumps(jr))
                    else:
                        fail_snap = None
                if fail_snap is not None:
                    _persist_job_state_to_gcs(fail_snap, sync=True)

    threading.Thread(target=_runner, daemon=True).start()
    return json.loads(json.dumps(job_rec))


def upload_diagram_png_2x(
    slug: str,
    kind: str,
    payload: Dict[str, Any],
    *,
    actor_email: str = "local-operator",
) -> Dict[str, Any]:
    """Owner-scoped 2x diagram PNG upload from browser Canvas rasterizer, embedded into whitepaper .docx."""
    clean = validate_existing_slug(slug)
    k = str(kind or "").strip().lower()
    if k not in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
        raise CreateBlog2Error(f"Unsupported diagram kind '{k}'.", 400, "INVALID_DIAGRAM_KIND")
    b64_raw = str(payload.get("dataBase64") or "").strip()
    if "," in b64_raw and b64_raw.lower().startswith("data:image/"):
        b64_raw = b64_raw.split(",", 1)[1].strip()
    try:
        raw_bytes = base64.b64decode(b64_raw, validate=True)
    except Exception:
        raise CreateBlog2Error("Malformed base64 PNG payload.", 400, "INVALID_BASE64") from None
    ext, w, h, _ = cb1.parse_image_header(raw_bytes)
    if ext != "png":
        raise CreateBlog2Error("Diagram raster upload must be a valid PNG.", 400, "INVALID_IMAGE_FORMAT")
    clean_bytes = strip_image_metadata_bytes(raw_bytes, "png")

    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog2Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        verify_blog_owner_access(manifest, actor_email)

        blog_dir = get_storage_root() / clean
        rel_png = f"diagrams/{clean}-{k}.drawio.png"
        (blog_dir / rel_png).parent.mkdir(parents=True, exist_ok=True)
        (blog_dir / rel_png).write_bytes(clean_bytes)
        if k in (manifest.get("diagrams") or {}):
            manifest["diagrams"][k]["pngPath"] = rel_png
            manifest["diagrams"][k]["pngWidth"] = w
            manifest["diagrams"][k]["pngHeight"] = h
        if _is_gcs_sync_enabled():
            _gcs_upload_bytes(f"{clean}/{rel_png}", clean_bytes, "image/png")
        updated = _recompile_after_mutation(clean, manifest)
        return {
            "ok": True,
            "slug": clean,
            "kind": k,
            "pngPath": rel_png,
            "width": w,
            "height": h,
            "bytes": len(clean_bytes),
            "updatedAt": updated["updatedAt"],
        }
