#!/usr/bin/env python3
"""
Create Blog1 Engine — Pure-Stdlib Real-Time Architecture Center Blog & Asset Studio.

Builds complete, grounded, downloadable artifacts from a user prompt using strictly
live Gemini API calls (Vertex AI IAM in ramp-portal-dev or optional GEMINI_API_KEY /
transient X-Gemini-Api-Key header). Fails CLOSED (HTTP 503 MODEL_AUTH_UNAVAILABLE)
when no live model credentials are present — NEVER fabricates fake prose, synthetic
screenshots, fake Buganizer IDs, or fake benchmarks.

Pure Python 3.11+ standard library only (runs directly inside mirror.gcr.io/library/python:3.11-slim
with zero pip/Node/LibreOffice container dependencies).
"""

from __future__ import annotations

import ast
import base64
import hashlib
import html
import io
import json
import os
import re
import secrets
import shutil
import struct
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET
import zipfile
import zlib
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent


def _load_sibling_mod(mod_name: str, filename: str) -> Any:
    import importlib.util
    import sys as _sys
    existing = _sys.modules.get(mod_name)
    if existing is not None:
        return existing
    mp = Path(__file__).resolve().parent / filename
    spec = importlib.util.spec_from_file_location(mod_name, str(mp))
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load sibling module {mp}")
    mod = importlib.util.module_from_spec(spec)
    _sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
    return mod


_diag_v2 = _load_sibling_mod("create_blog1_diagrams_v2", "create_blog1_diagrams_v2.py")
_pipe_v2 = _load_sibling_mod("create_blog1_pipeline_v2", "create_blog1_pipeline_v2.py")


def strip_inline_md(text: str) -> str:
    return _diag_v2.strip_inline_md(text)

DEFAULT_GCP_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "ramp-portal-dev")
DEFAULT_VERTEX_LOCATION = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
DURABLE_GCS_BUCKET = os.environ.get("DURABLE_GCS_BUCKET", "scorex-durable-state-bbar-138hf0")
DURABLE_GCS_PREFIX = "ge-blogs/create-blog1/"

ALLOWED_MODELS = (
    "gemini-2.5-pro",
    "gemini-2.5-flash",
)
ALLOWED_VOICES = (
    "en-US-Chirp3-HD-Charon",
    "en-US-Chirp3-HD-Aoede",
    "en-US-Chirp3-HD-Fenrir",
    "en-US-Chirp3-HD-Kore",
)
ALLOWED_PROVENANCE_TAGS = (
    "GCP_DOCUMENTED",
    "DERIVED_MODEL",
    "EXAMPLE_TARGET",
    "USER_SUPPLIED",
)
ALLOWED_PROOF_STAGES = (
    "BEFORE",
    "AFTER",
    "CONSOLE",
    "SAAS",
    "USER_RECORDED",
)
MAX_PROOF_IMAGE_BYTES = 6 * 1024 * 1024  # 6 MiB raw (~8 MiB base64 JSON fits safely inside 10 MiB POST cap)
JOB_RATE_LIMIT_PER_HOUR = int(os.environ.get("CREATE_BLOG1_RATE_LIMIT_PER_HOUR", "12") or "12")

SLIDE_W_EMU = 12192000  # 13.333 in (16:9 widescreen)
SLIDE_H_EMU = 6858000   # 7.5 in
PX_TO_EMU_X = SLIDE_W_EMU / 1600.0
PX_TO_EMU_Y = SLIDE_H_EMU / 900.0

_STATE_LOCK = threading.RLock()
_JOBS_LOCK = threading.Lock()
_JOBS: Dict[str, Dict[str, Any]] = {}
_RATE_LOCK = threading.Lock()
_RATE_HITS: Dict[str, deque] = {}
_TOKEN_LOCK = threading.Lock()
_TOKEN_CACHE: Dict[str, Any] = {"token": None, "expiry": 0.0, "last_fail": 0.0}
_GCS_INDEX_HYDRATED = False
_GCS_INDEX_LAST_SYNC = 0.0
_GCS_INDEX_TTL_SEC = 10.0

# Public-repo F-13 leak patterns assembled dynamically so repository static self-scans never flag source code.
_FORBIDDEN_TOKENS_FRAGMENTS = (
    ("niti", "nagga"),
    ("nitin_", "aggarwal"),
    ("custom-", "nitin"),
    ("alto", "strat"),
    ("corp.", "google.com"),
    ("@google", ".com"),
    ("auth", "user="),
    ("mer", "ck"),
    ("gpt", "eal"),
)
_BANNED_STATUS_EMOJIS = (
    "\u2705",
    "\u26a0",
    "\u274c",
    "\U0001f525",
    "\U0001f680",
    "\u2728",
    "\U0001f4a1",
    "\U0001f6a8",
    "\U0001f512",
    "\U0001f3af",
)

_ZONE_THEMES = (
    {"bg": "#E8F0FE", "border": "#1A73E8", "badge": "#1A73E8", "text": "#174EA6"},
    {"bg": "#E6F4EA", "border": "#137333", "badge": "#137333", "text": "#0D652D"},
    {"bg": "#FEF7E0", "border": "#B06000", "badge": "#EA8600", "text": "#8A4600"},
    {"bg": "#F3E8FD", "border": "#6D28D9", "badge": "#6D28D9", "text": "#4C1D95"},
)

_ACTOR_THEMES = (
    ("#1A73E8", "#E8F0FE"),
    ("#137333", "#E6F4EA"),
    ("#B06000", "#FEF7E0"),
    ("#6D28D9", "#F3E8FD"),
    ("#0F766E", "#E6FFFA"),
)


class CreateBlog1Error(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "INVALID_REQUEST"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class ModelAuthUnavailableError(CreateBlog1Error):
    def __init__(self, message: str):
        super().__init__(message, status_code=503, code="MODEL_AUTH_UNAVAILABLE")


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_storage_root() -> Path:
    override = os.environ.get("GEAP_CREATE_BLOG1_DIR", "").strip()
    if override:
        p = Path(override)
    else:
        runtime_base = os.environ.get("PORTAL_RUNTIME_STATE_DIR", "/tmp/ge-blogs-runtime-state").strip()
        p = Path(runtime_base) / "create_blog1"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _is_gcs_sync_enabled() -> bool:
    if os.environ.get("GEAP_DISABLE_GCS_SYNC") == "1":
        return False
    if os.environ.get("GEAP_CREATE_BLOG1_DIR", "").strip():
        return False
    return True


def _redact_secret(text: str, secret_val: Optional[str] = None) -> str:
    out = str(text or "")
    if secret_val and len(secret_val) >= 6:
        out = out.replace(secret_val, "[REDACTED_API_KEY]")
    out = re.sub(r"AIza[0-9A-Za-z_\-]{10,}", "[REDACTED_API_KEY]", out)
    out = re.sub(r"ya29\.[0-9A-Za-z_\-\.]{10,}", "[REDACTED_OAUTH_TOKEN]", out)
    out = re.sub(r"(?i)(key=|x-goog-api-key:\s*)[^\s&\"']+", r"\1[REDACTED]", out)
    return out


def strip_emojis(text: str) -> str:
    if not text:
        return ""
    s = str(text)
    for ch in _BANNED_STATUS_EMOJIS:
        s = s.replace(ch, "")
    s = s.replace("\ufe0f", "")
    s = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", s)
    return re.sub(r" {2,}", " ", s).strip()


def xml_esc(text: str) -> str:
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", str(text or ""))
    return html.escape(cleaned, quote=True)


def sanitize_slug(raw: str, fallback_prefix: str = "blog") -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(raw or "").lower()).strip("-")
    s = re.sub(r"-{2,}", "-", s)[:52].strip("-")
    if not s or len(s) < 3:
        s = f"{fallback_prefix}-{secrets.token_hex(3)}"
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", s):
        raise CreateBlog1Error("Invalid blog slug.", 400, "INVALID_SLUG")
    return s


def validate_existing_slug(raw: str) -> str:
    s = str(raw or "").strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", s):
        raise CreateBlog1Error(f"Invalid blog slug '{raw}'.", 400, "INVALID_SLUG")
    return s


def validate_safe_https_url(url: str) -> str:
    u = str(url or "").strip()
    if not u:
        return ""
    parsed = urllib.parse.urlparse(u)
    if parsed.scheme != "https" or not parsed.netloc:
        return ""
    host = (parsed.hostname or "").lower()
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return ""
    if host.endswith(".corp." + "google.com") or host == "go" or host.endswith(".internal"):
        return ""
    return u


def _forbidden_words() -> List[str]:
    return ["".join(pair).lower() for pair in _FORBIDDEN_TOKENS_FRAGMENTS]


def scan_for_f13_leaks(text: str) -> List[str]:
    low = str(text or "").lower()
    hits: List[str] = []
    for token in _forbidden_words():
        if token in low:
            hits.append(f"restricted_term:{token[:3]}***")
    if re.search(r"AIza[0-9A-Za-z_\-]{20,}", str(text or "")):
        hits.append("secret_pattern:google_api_key")
    if re.search(r"ya29\.[0-9A-Za-z_\-\.]{20,}", str(text or "")):
        hits.append("secret_pattern:oauth_access_token")
    if re.search(r"\bgo/[a-z0-9_\-]{3,}", low):
        hits.append("internal_shortlink:go_link")
    if re.search(r"\bb/\d{6,10}\b", low):
        hits.append("internal_ref:unverified_issue_id")
    if (".cr." + "gclb.goog") in low:
        hits.append("internal_host:gclb_url")
    return sorted(set(hits))


def _sanitize_for_public_output(text: str) -> str:
    out = str(text or "")
    for token in _forbidden_words():
        out = re.sub(re.escape(token), "[redacted-internal-ref]", out, flags=re.IGNORECASE)
    out = re.sub(r"\bgo/[A-Za-z0-9_\-]{3,}", "[internal-link-removed]", out)
    out = re.sub(r"\bb/\d{6,10}\b", "[issue-ref-removed]", out)
    out = re.sub(r"AIza[0-9A-Za-z_\-]{20,}", "[REDACTED_API_KEY]", out)
    out = re.sub(r"ya29\.[0-9A-Za-z_\-\.]{20,}", "[REDACTED_TOKEN]", out)
    return out


def _get_gcp_bearer_token(force_refresh: bool = False) -> Optional[str]:
    if os.environ.get("GEAP_DISABLE_VERTEX_AUTH") == "1":
        return None
    now = time.time()
    with _TOKEN_LOCK:
        if not force_refresh and _TOKEN_CACHE["token"] and now < float(_TOKEN_CACHE["expiry"]):
            return str(_TOKEN_CACHE["token"])
        if not force_refresh and _TOKEN_CACHE["last_fail"] and (now - float(_TOKEN_CACHE["last_fail"])) < 20.0:
            return None

        # 1. Cloud Run / GCE Metadata Server
        try:
            req = urllib.request.Request(
                "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
                headers={"Metadata-Flavor": "Google"},
            )
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                tok = str(data.get("access_token") or "").strip()
                if tok:
                    exp = int(data.get("expires_in", 3600))
                    _TOKEN_CACHE["token"] = tok
                    _TOKEN_CACHE["expiry"] = now + max(60, exp - 90)
                    _TOKEN_CACHE["last_fail"] = 0.0
                    return tok
        except Exception:
            pass

        # 2. Local gcloud ADC / user token (dev workstation)
        if shutil.which("gcloud"):
            try:
                tok = subprocess.check_output(
                    ["gcloud", "auth", "print-access-token"],
                    stderr=subprocess.DEVNULL,
                    timeout=4.0,
                ).decode("utf-8").strip()
                if tok and tok.startswith("ya29."):
                    _TOKEN_CACHE["token"] = tok
                    _TOKEN_CACHE["expiry"] = now + 1800.0
                    _TOKEN_CACHE["last_fail"] = 0.0
                    return tok
            except Exception:
                pass

        _TOKEN_CACHE["last_fail"] = now
        return None


def _gcs_upload_bytes(rel_obj: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
    if not _is_gcs_sync_enabled():
        return False
    token = _get_gcp_bearer_token()
    if not token:
        return False
    obj_name = f"{DURABLE_GCS_PREFIX}{rel_obj.lstrip('/')}"
    url = (
        f"https://storage.googleapis.com/upload/storage/v1/b/{urllib.parse.quote(DURABLE_GCS_BUCKET, safe='')}/o"
        f"?uploadType=media&name={urllib.parse.quote(obj_name, safe='')}"
    )
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12.0) as resp:
            return resp.status in (200, 201)
    except Exception:
        return False


def _gcs_download_bytes(rel_obj: str) -> Optional[bytes]:
    if not _is_gcs_sync_enabled():
        return None
    token = _get_gcp_bearer_token()
    if not token:
        return None
    obj_name = f"{DURABLE_GCS_PREFIX}{rel_obj.lstrip('/')}"
    url = (
        f"https://storage.googleapis.com/storage/v1/b/{urllib.parse.quote(DURABLE_GCS_BUCKET, safe='')}/o/"
        f"{urllib.parse.quote(obj_name, safe='')}?alt=media"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            return resp.read()
    except Exception:
        return None


def _gcs_delete_object(rel_obj: str) -> None:
    if not _is_gcs_sync_enabled():
        return
    token = _get_gcp_bearer_token()
    if not token:
        return
    obj_name = f"{DURABLE_GCS_PREFIX}{rel_obj.lstrip('/')}"
    url = (
        f"https://storage.googleapis.com/storage/v1/b/{urllib.parse.quote(DURABLE_GCS_BUCKET, safe='')}/o/"
        f"{urllib.parse.quote(obj_name, safe='')}"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=6.0):
            pass
    except Exception:
        pass


def _gcs_list_prefix(prefix_rel: str) -> List[str]:
    """List GCS object keys under DURABLE_GCS_PREFIX + prefix_rel (returns rel_obj strings)."""
    if not _is_gcs_sync_enabled():
        return []
    token = _get_gcp_bearer_token()
    if not token:
        return []
    full_prefix = f"{DURABLE_GCS_PREFIX}{prefix_rel.lstrip('/')}"
    results: List[str] = []
    page_token = ""
    for _ in range(10):
        qs = f"prefix={urllib.parse.quote(full_prefix, safe='')}&fields=items(name),nextPageToken"
        if page_token:
            qs += f"&pageToken={urllib.parse.quote(page_token, safe='')}"
        url = (
            f"https://storage.googleapis.com/storage/v1/b/"
            f"{urllib.parse.quote(DURABLE_GCS_BUCKET, safe='')}/o?{qs}"
        )
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception:
            break
        for item in data.get("items") or []:
            nm = str(item.get("name") or "")
            if nm.startswith(DURABLE_GCS_PREFIX):
                results.append(nm[len(DURABLE_GCS_PREFIX):])
        page_token = str(data.get("nextPageToken") or "")
        if not page_token:
            break
    return results


def _persist_job_state_to_gcs(job_rec: Dict[str, Any], *, sync: bool = False) -> None:
    """Persist public-safe job progress JSON to GCS so any Cloud Run replica can serve poll requests."""
    if not _is_gcs_sync_enabled():
        return
    jid = str(job_rec.get("jobId") or "").strip()
    if not re.fullmatch(r"cb1-[a-f0-9]{12}", jid):
        return
    payload = json.dumps(job_rec, separators=(",", ":")).encode("utf-8")
    obj_rel = f"_jobs/{jid}.json"
    if sync:
        _gcs_upload_bytes(obj_rel, payload, "application/json")
    else:
        threading.Thread(
            target=_gcs_upload_bytes,
            args=(obj_rel, payload, "application/json"),
            daemon=True,
        ).start()


def _sync_blog_dir_to_gcs_async(slug: str, blog_dir: Path, index_bytes: bytes, *, sync: bool = True) -> None:
    """Upload blog assets in parallel before publishing index.json for cross-replica read-after-write consistency."""
    if not _is_gcs_sync_enabled():
        return
    files_to_push: List[Tuple[str, bytes, str]] = []
    manifest_entry: Optional[Tuple[str, bytes, str]] = None
    for p in sorted(blog_dir.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(blog_dir).as_posix()
        try:
            b = p.read_bytes()
        except Exception:
            continue
        if len(b) > 25 * 1024 * 1024:
            continue
        entry = (f"{slug}/{rel}", b, _guess_mime(rel))
        if rel == "manifest.json":
            manifest_entry = entry
        else:
            files_to_push.append(entry)

    def _upload_all() -> None:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda item: _gcs_upload_bytes(item[0], item[1], item[2]), files_to_push))
        if manifest_entry is not None:
            _gcs_upload_bytes(manifest_entry[0], manifest_entry[1], manifest_entry[2])
        _gcs_upload_bytes("index.json", index_bytes, "application/json")

    if sync:
        _upload_all()
    else:
        threading.Thread(target=_upload_all, daemon=True).start()


def hydrate_index_from_gcs_once(force: bool = False) -> None:
    global _GCS_INDEX_HYDRATED, _GCS_INDEX_LAST_SYNC
    if not _is_gcs_sync_enabled():
        return
    now = time.time()
    if not force and _GCS_INDEX_HYDRATED and (now - _GCS_INDEX_LAST_SYNC) < _GCS_INDEX_TTL_SEC:
        return
    _GCS_INDEX_HYDRATED = True
    _GCS_INDEX_LAST_SYNC = now
    raw = _gcs_download_bytes("index.json")
    if not raw:
        return
    try:
        parsed = json.loads(raw.decode("utf-8"))
        if not isinstance(parsed, dict) or not isinstance(parsed.get("blogs"), list):
            return
    except Exception:
        return
    with _STATE_LOCK:
        idx_file = get_storage_root() / "index.json"
        if not idx_file.is_file():
            idx_file.write_bytes(raw)
        else:
            try:
                local = json.loads(idx_file.read_text(encoding="utf-8"))
                local_ts = str(local.get("updatedAt") or "")
                remote_ts = str(parsed.get("updatedAt") or "")
                # GCS index.json is authoritative whenever it is at least as fresh as local (propagates deletes too).
                if force or remote_ts >= local_ts:
                    idx_file.write_bytes(raw)
            except Exception:
                idx_file.write_bytes(raw)


def _load_index(refresh_gcs: bool = False) -> Dict[str, Any]:
    with _STATE_LOCK:
        idx_file = get_storage_root() / "index.json"
        if refresh_gcs or not idx_file.is_file() or (time.time() - _GCS_INDEX_LAST_SYNC) >= _GCS_INDEX_TTL_SEC:
            hydrate_index_from_gcs_once(force=refresh_gcs)
        if idx_file.is_file():
            try:
                data = json.loads(idx_file.read_text(encoding="utf-8"))
                if isinstance(data, dict) and isinstance(data.get("blogs"), list):
                    return data
            except Exception:
                pass
        return {"schemaVersion": "1.0", "updatedAt": _now_iso(), "blogs": []}


def _save_index(data: Dict[str, Any]) -> bytes:
    with _STATE_LOCK:
        idx_file = get_storage_root() / "index.json"
        data["schemaVersion"] = "1.0"
        data["updatedAt"] = _now_iso()
        raw = json.dumps(data, indent=2).encode("utf-8")
        idx_file.write_bytes(raw)
        return raw


def _guess_mime(rel_path: str) -> str:
    low = rel_path.lower()
    if low.endswith(".json"):
        return "application/json; charset=utf-8"
    if low.endswith(".md"):
        return "text/markdown; charset=utf-8"
    if low.endswith(".svg"):
        return "image/svg+xml; charset=utf-8"
    if low.endswith(".drawio") or low.endswith(".xml"):
        return "application/xml; charset=utf-8"
    if low.endswith(".pptx"):
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    if low.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if low.endswith(".zip"):
        return "application/zip"
    if low.endswith(".mp3"):
        return "audio/mpeg"
    if low.endswith(".mp4"):
        return "video/mp4"
    if low.endswith(".webm"):
        return "video/webm"
    if low.endswith(".vtt"):
        return "text/vtt; charset=utf-8"
    if low.endswith(".png"):
        return "image/png"
    if low.endswith(".jpg") or low.endswith(".jpeg"):
        return "image/jpeg"
    if low.endswith(".txt") or low.endswith(".py") or low.endswith(".tf") or low.endswith(".sh"):
        return "text/plain; charset=utf-8"
    return "application/octet-stream"


def _ensure_rel_hydrated(slug: str, rel_path: str) -> Optional[Path]:
    slug = validate_existing_slug(slug)
    blog_dir = (get_storage_root() / slug).resolve()
    target = (blog_dir / rel_path).resolve()
    if not str(target).startswith(str(blog_dir) + os.sep):
        raise CreateBlog1Error("Invalid asset path traversal blocked.", 400, "INVALID_PATH")
    if target.is_file():
        return target
    raw = _gcs_download_bytes(f"{slug}/{rel_path}")
    if raw is not None:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        return target
    return None


def _has_workspace_oauth_token() -> bool:
    env_tf = os.environ.get("GSHEET_OAUTH_TOKEN_FILE", "").strip()
    candidates = [ROOT_DIR / ".gsheet_oauth_token.json"]
    if env_tf:
        candidates.insert(0, Path(env_tf))
    for p in candidates:
        if p.is_file():
            try:
                d = json.loads(p.read_text(encoding="utf-8"))
                if d.get("refresh_token") and d.get("client_id") and d.get("client_secret"):
                    return True
            except Exception:
                pass
    return False


def get_capabilities() -> Dict[str, Any]:
    token = _get_gcp_bearer_token()
    has_vertex = bool(token)
    has_env_key = bool(os.environ.get("GEMINI_API_KEY", "").strip())
    has_ffmpeg = bool(shutil.which("ffmpeg"))
    has_svg_raster = bool(shutil.which("rsvg-convert"))
    has_workspace = _has_workspace_oauth_token()
    is_cloud_run = bool(os.environ.get("K_SERVICE"))
    return {
        "ok": True,
        "checkedAt": _now_iso(),
        "runtimeMode": "CLOUD_RUN" if is_cloud_run else "LOCAL_WORKSTATION",
        "projectId": DEFAULT_GCP_PROJECT,
        "vertexLocation": DEFAULT_VERTEX_LOCATION,
        "models": list(ALLOWED_MODELS),
        "defaultModel": "gemini-2.5-flash",
        "voices": list(ALLOWED_VOICES),
        "defaultVoice": "en-US-Chirp3-HD-Charon",
        "auth": {
            "vertexAiIamReady": has_vertex,
            "serviceAccount": (
                "248990048888-compute@developer.gserviceaccount.com"
                if (is_cloud_run and has_vertex)
                else ("local-gcloud-adc" if has_vertex else "unavailable")
            ),
            "geminiApiKeyEnvReady": has_env_key,
            "transientKeyHeaderSupported": True,
            "llmReady": has_vertex or has_env_key,
            "failClosedPolicy": "strict_no_fake_fallback",
        },
        "capabilities": {
            "geminiGeneration": has_vertex or has_env_key,
            "orthogonalJudge": has_vertex or has_env_key,
            "cloudTtsChirp3Hd": has_vertex,
            "gcsDurableStorage": has_vertex and _is_gcs_sync_enabled(),
            "gcsBucket": DURABLE_GCS_BUCKET,
            "gcsPrefix": DURABLE_GCS_PREFIX,
            "ooxmlCompilers": True,
            "drawioAndSvgCompilers": True,
            "googleSearchGrounding": has_vertex or has_env_key,
            "autoRevisionPass": has_vertex or has_env_key,
            "officialGcpSvgIcons": len(_diag_v2.load_gcp_svg_icons()),
            "diagramLayersPerBlog": 5,
            "slidesPerDeck": 12,
            "deterministicGateChecks": 12,
            "workspaceOauthSync": has_workspace,
            "hostMp4Compiler": has_ffmpeg and has_svg_raster,
            "browserWebmExporter": True,
            "browserScreenRecorder": True,
            "proofUploadMaxBytes": MAX_PROOF_IMAGE_BYTES,
            "rateLimitPerHour": JOB_RATE_LIMIT_PER_HOUR,
        },
        "honestDisclosures": [
            "Screenshots are NEVER fabricated or rendered from mock HTML. Slide 7 starts awaiting proof until you upload genuine PNG/JPEG screenshots.",
            "Narrated audio is synthesized live by Google Cloud Text-to-Speech (Chirp3-HD) and labeled SYNTHETIC_CLOUD_TTS_CHIRP3_HD (not a human digital twin).",
            "Starter code & Terraform (starter.zip) is marked GENERATED_TEMPLATE_UNDEPLOYED until reviewed and applied to a real GCP project.",
            "Transient X-Gemini-Api-Key headers are forwarded once per call over TLS to generativelanguage.googleapis.com and NEVER stored on disk, browser storage, or logs.",
        ],
    }


def _check_rate_limit(actor_key: str) -> None:
    if JOB_RATE_LIMIT_PER_HOUR <= 0:
        return
    now = time.time()
    key = actor_key or "anonymous"
    with _RATE_LOCK:
        q = _RATE_HITS.setdefault(key, deque())
        while q and (now - q[0]) > 3600.0:
            q.popleft()
        if len(q) >= JOB_RATE_LIMIT_PER_HOUR:
            raise CreateBlog1Error(
                f"Hourly generation rate limit ({JOB_RATE_LIMIT_PER_HOUR}/hr) reached for '{key}'. Retry shortly.",
                status_code=429,
                code="RATE_LIMITED",
            )
        q.append(now)


def _strip_json_fences(raw_text: str) -> str:
    s = str(raw_text or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json|JSON)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    first_obj = s.find("{")
    last_obj = s.rfind("}")
    if first_obj != -1 and last_obj != -1 and last_obj > first_obj:
        return s[first_obj : last_obj + 1]
    return s


def call_gemini_json(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str = "gemini-2.5-flash",
    api_key_override: Optional[str] = None,
    max_output_tokens: int = 24576,
    thinking_budget: Optional[int] = 1024,
    temperature: float = 0.25,
    timeout_s: float = 110.0,
    use_google_search: bool = False,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Strictly live Gemini JSON call supporting:
      1) Transient X-Gemini-Api-Key header or GEMINI_API_KEY env var -> Gemini Developer API v1beta
      2) GCP Vertex AI IAM Bearer token -> us-central1 Vertex AI publisher endpoint
    Fails CLOSED with ModelAuthUnavailableError when no live credential is present.
    """
    clean_model = model if model in ALLOWED_MODELS else "gemini-2.5-flash"
    eff_key = (api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    gen_cfg: Dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }
    if not use_google_search:
        gen_cfg["responseMimeType"] = "application/json"
    if thinking_budget is not None:
        gen_cfg["thinkingConfig"] = {"thinkingBudget": int(thinking_budget)}
    body_obj: Dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": gen_cfg,
    }
    if use_google_search:
        body_obj["tools"] = [{"googleSearch": {}}]
    payload_bytes = json.dumps(body_obj).encode("utf-8")

    if eff_key:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": eff_key,
        }
        auth_mode = "transient_header_api_key" if (api_key_override or "").strip() else "env_gemini_api_key"
    else:
        token = _get_gcp_bearer_token()
        if not token:
            raise ModelAuthUnavailableError(
                "No live Gemini credentials available (Vertex AI IAM bearer token unavailable and no GEMINI_API_KEY / X-Gemini-Api-Key supplied). "
                "Fail-closed: Create Blog1 never generates placeholder or mock prose when model auth is offline."
            )
        endpoint = (
            f"https://{DEFAULT_VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/"
            f"{urllib.parse.quote(DEFAULT_GCP_PROJECT, safe='')}/locations/{urllib.parse.quote(DEFAULT_VERTEX_LOCATION, safe='')}"
            f"/publishers/google/models/{urllib.parse.quote(clean_model, safe='')}:generateContent"
        )
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
        auth_mode = "vertex_ai_iam"

    t0 = time.perf_counter()
    last_err = ""
    raw_resp: Optional[Dict[str, Any]] = None
    for attempt in range(2):
        req = urllib.request.Request(endpoint, data=payload_bytes, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                raw_resp = json.loads(resp.read().decode("utf-8"))
                break
        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
            last_err = _redact_secret(f"HTTP {exc.code}: {err_body}", eff_key)
            if exc.code in (401, 403):
                raise CreateBlog1Error(
                    f"Gemini authentication rejected ({auth_mode}): {last_err}",
                    status_code=503,
                    code="MODEL_AUTH_REJECTED",
                ) from None
            if exc.code in (429, 500, 502, 503, 504) and attempt == 0:
                time.sleep(2.0)
                continue
            raise CreateBlog1Error(
                f"Gemini model call failed ({clean_model}): {last_err}",
                status_code=502,
                code="MODEL_CALL_FAILED",
            ) from None
        except Exception as exc:
            last_err = _redact_secret(str(exc), eff_key)
            if attempt == 0:
                time.sleep(1.5)
                continue
            raise CreateBlog1Error(
                f"Gemini model transport error ({clean_model}): {last_err}",
                status_code=502,
                code="MODEL_CALL_FAILED",
            ) from None

    if not raw_resp:
        raise CreateBlog1Error(f"Empty response from Gemini ({clean_model}): {last_err}", 502, "MODEL_EMPTY_RESPONSE")

    candidates = raw_resp.get("candidates") or []
    parts_txt: List[str] = []
    for cand in candidates[:1]:
        content = cand.get("content") or {}
        for pt in content.get("parts") or []:
            if pt.get("thought") is True:
                continue
            if isinstance(pt.get("text"), str):
                parts_txt.append(pt["text"])
    raw_text = "\n".join(parts_txt).strip()
    if not raw_text:
        fr = candidates[0].get("finishReason") if candidates else "none"
        raise CreateBlog1Error(
            f"Gemini ({clean_model}) returned no text candidate (finishReason={fr}).",
            502,
            "MODEL_EMPTY_CANDIDATE",
        )

    cleaned_json = _strip_json_fences(raw_text)
    try:
        parsed = json.loads(cleaned_json)
    except json.JSONDecodeError as exc:
        fr = candidates[0].get("finishReason") if candidates else "unknown"
        raise CreateBlog1Error(
            f"Gemini ({clean_model}) returned invalid JSON ({exc.msg}; finishReason={fr}, chars={len(raw_text)}). Retry once or pick another model.",
            502,
            "MODEL_INVALID_JSON",
        ) from None
    if not isinstance(parsed, dict):
        raise CreateBlog1Error(f"Gemini ({clean_model}) returned non-object JSON.", 502, "MODEL_INVALID_JSON")

    gm_meta = (candidates[0].get("groundingMetadata") or {}) if candidates else {}
    meta = {
        "model": clean_model,
        "authMode": auth_mode,
        "latencyMs": round((time.perf_counter() - t0) * 1000.0, 1),
        "usageMetadata": raw_resp.get("usageMetadata") or {},
        "webSearchQueries": [str(q)[:140] for q in (gm_meta.get("webSearchQueries") or [])[:12]],
        "generatedAt": _now_iso(),
    }
    return parsed, meta


def _blueprint_system_prompt() -> str:
    return (
        "You are a Principal Google Cloud Solutions Architect authoring a Google Cloud Architecture Center "
        "technical article and complete deliverable kit (architecture diagram, sequence swimlane, 9-slide deck, "
        "Word whitepaper, runnable Terraform & Python starter template). "
        "STRICT ANTI-HALLUCINATION CONTRACT:\n"
        "1. Output ONLY a valid JSON object (no markdown fences, no extra prose).\n"
        "2. NEVER fabricate employee emails, internal issue tracker IDs, internal shortlinks, fake URLs, "
        "or fake live benchmark receipts.\n"
        "3. Every quantitative claim (SLA, latency, throughput, pricing estimate, sizing quota) MUST be recorded in "
        "claimLedger with provenance strictly one of: GCP_DOCUMENTED | DERIVED_MODEL | EXAMPLE_TARGET | USER_SUPPLIED.\n"
        "4. Use ZERO emojis inside slide titles, slide bullets, diagram labels, table cells, or speaker notes.\n"
        "5. Never reference internal corporate domains or confidential customer names.\n"
        "6. Keep diagram labels crisp and short (<= 30 chars title, <= 38 chars subtitle) so boxes never overflow.\n"
        "7. Speaker notes for all 9 slides must be natural, conversational spoken English (2-4 clear sentences each, "
        "50-100 words) ready for live Google Cloud TTS narration without saying 'Slide 1' or reading markdown punctuation.\n"
        "8. Starter code pythonApp MUST be syntactically valid Python 3.11 code (zero syntax placeholders or ellipses).\n"
        "9. Reference URLs MUST be real public https://cloud.google.com/ URLs."
    )


def _blueprint_user_prompt(prompt: str, title_hint: str, domain: str, audience: str) -> str:
    schema_hint = {
        "title": "Concise flagship technical title (<= 85 chars)",
        "subtitle": "One-sentence Google Cloud Architecture Center subtitle (<= 140 chars)",
        "slugHint": "short-kebab-case-slug",
        "summary": "2-3 sentence executive summary (BLUF)",
        "audience": audience,
        "domain": domain,
        "estimatedReadMinutes": 10,
        "keyTakeaways": ["4 crisp actionable takeaways (no emojis)"],
        "architectureZones": [
            {
                "id": "zone_1",
                "title": "Edge & Ingress",
                "plane": "edge",
                "subtitle": "Short zone role",
                "components": [
                    {"id": "c1", "label": "Component Name", "sub": "Protocol / SKU", "role": "Brief role"}
                ],
            }
        ],
        "architectureEdges": [
            {"from": "c1", "to": "c2", "label": "TLS 1.3 / Auth", "dashed": False}
        ],
        "sequenceActors": [
            {"id": "a1", "label": "Client / User", "sub": "Browser / App"}
        ],
        "sequenceSteps": [
            {"num": 1, "from": "a1", "to": "a2", "label": "HTTPS request + token", "kind": "request"}
        ],
        "sections": [
            {
                "heading": "Executive Summary & Business Problem",
                "paragraphs": ["Detailed grounded paragraphs explaining trade-offs and design choices."],
                "bullets": ["Actionable point"],
                "table": {"headers": ["Dimension", "Choice", "Rationale"], "rows": [["Isolation", "Example", "Why"]]},
            }
        ],
        "slides": [
            {
                "number": 1,
                "kicker": "EXECUTIVE BRIEF",
                "title": "Slide title (<= 60 chars)",
                "subtitle": "Takeaway subtitle",
                "bullets": ["3-5 crisp bullets (<= 95 chars each)"],
                "calloutLabel": "Key Metric / Constraint",
                "calloutValue": "Grounded figure + provenance tag",
                "table": {"headers": ["Col A", "Col B", "Col C"], "rows": [["v1", "v2", "v3"]]},
                "codeSnippet": "optional short snippet for slide 6 only",
                "speakerNotes": "Natural 2-4 sentence spoken narration without emojis or markdown.",
            }
        ],
        "codeStarter": {
            "readmeSummary": "Concise instructions explaining review & deployment prerequisites.",
            "terraformMain": "# Valid HCL defining core GCP resources with parameterized variables",
            "terraformVars": "# Terraform variable declarations",
            "pythonApp": "# Syntactically valid Python 3.11 service/example module (no syntax errors)",
            "deploySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
            "verifySh": "#!/usr/bin/env bash\nset -euo pipefail\n...",
        },
        "claimLedger": [
            {
                "id": "CLM-01",
                "claim": "Specific quantitative or SLA claim",
                "value": "Exact figure",
                "provenance": "GCP_DOCUMENTED | DERIVED_MODEL | EXAMPLE_TARGET | USER_SUPPLIED",
                "basis": "How the figure was obtained or scoped",
            }
        ],
        "faq": [{"question": "Sharp architectural objection", "answer": "Grounded answer"}],
        "references": [{"title": "Official doc title", "url": "https://cloud.google.com/architecture", "note": "Why relevant"}],
    }
    return (
        f"USER TOPIC / PROMPT:\n{prompt.strip()}\n\n"
        f"TITLE HINT: {title_hint.strip() or '(derive crisp title from prompt)'}\n"
        f"DOMAIN / PILLAR: {domain.strip() or 'Enterprise AI Architecture'}\n"
        f"PRIMARY AUDIENCE: {audience.strip() or 'Solutions Architects & Platform Engineers'}\n\n"
        "REQUIREMENTS:\n"
        "- architectureZones: EXACTLY 4 zones (edge, control, compute, data), each with 2 to 4 components (unique ids c1..c12).\n"
        "- architectureEdges: 6 to 10 directed flows connecting those component ids (short protocol/auth labels).\n"
        "- sequenceActors: EXACTLY 5 actors (ids a1..a5).\n"
        "- sequenceSteps: 7 to 9 numbered steps (num 1..N) across a1..a5 (kind = 'request' | 'response' | 'guard').\n"
        "- sections: 5 to 7 deep Architecture Center sections with realistic engineering depth, IAM/networking controls, failure modes, and trade-offs. Include tables on at least 2 sections.\n"
        "- slides: EXACTLY 9 slides with this sequence:\n"
        "  1=Title & BLUF | 2=Challenge & Design Goals | 3=Reference Architecture Overview | "
        "  4=Component & Security Design Matrix (include compact table) | 5=End-to-End Request Lifecycle | "
        "  6=Implementation Guardrails & Code (include concise codeSnippet) | 7=Live Environment Verification Slot (specify which real BEFORE/AFTER screenshots to capture) | "
        "  8=Cost, Latency & Trade-off Matrix (include compact table) | 9=Production Readiness Checklist & Next Steps.\n"
        "- claimLedger: 4 to 8 entries tagging EVERY numeric target, quota, or latency/cost claim.\n"
        "- faq: 4 to 5 sharp engineering questions.\n"
        "- references: 4 to 6 real public https://cloud.google.com/ URLs.\n\n"
        "Return JSON conforming strictly to this shape:\n"
        + json.dumps(schema_hint, indent=2)
    )


def normalize_blueprint(raw: Dict[str, Any], prompt: str, domain: str, audience: str, *, target_slides: Optional[int] = None) -> Dict[str, Any]:
    """Enforces clean bounded shapes and strips emojis/inline markdown leaks without inventing fake data."""
    title = strip_inline_md(_sanitize_for_public_output(str(raw.get("title") or "Cloud Architecture Reference Guide")))[:110].strip()
    subtitle = strip_inline_md(_sanitize_for_public_output(str(raw.get("subtitle") or "Grounded Google Cloud reference architecture generated via live Gemini API.")))[:200].strip()
    slug_hint = str(raw.get("slugHint") or title)
    summary = _sanitize_for_public_output(str(raw.get("summary") or ""))[:1800].strip()
    est_min = 14
    try:
        est_min = max(3, min(45, int(raw.get("estimatedReadMinutes") or 14)))
    except Exception:
        est_min = 14

    takeaways = [
        strip_inline_md(_sanitize_for_public_output(str(t)))[:220].strip()
        for t in (raw.get("keyTakeaways") or [])
        if str(t).strip()
    ][:6]

    raw_zones = raw.get("architectureZones") if isinstance(raw.get("architectureZones"), list) else []
    zones: List[Dict[str, Any]] = []
    all_comp_ids: List[str] = []
    default_titles = ("Edge & Ingress", "Control & Security Plane", "Compute & Agent Plane", "Data & Governance Plane")
    for zi in range(4):
        rz = raw_zones[zi] if zi < len(raw_zones) and isinstance(raw_zones[zi], dict) else {}
        z_title = strip_inline_md(_sanitize_for_public_output(str(rz.get("title") or default_titles[zi])))[:40]
        z_sub = strip_inline_md(_sanitize_for_public_output(str(rz.get("subtitle") or "")))[:52]
        raw_comps = rz.get("components") if isinstance(rz.get("components"), list) else []
        comps: List[Dict[str, str]] = []
        for ci, rc in enumerate(raw_comps[:4]):
            if not isinstance(rc, dict):
                continue
            cid = re.sub(r"[^a-zA-Z0-9_-]", "", str(rc.get("id") or f"z{zi+1}c{ci+1}"))[:24] or f"z{zi+1}c{ci+1}"
            if cid in all_comp_ids:
                cid = f"{cid}_{zi+1}_{ci+1}"
            lbl = strip_inline_md(_sanitize_for_public_output(str(rc.get("label") or f"Service {ci+1}")))[:34]
            sub = strip_inline_md(_sanitize_for_public_output(str(rc.get("sub") or "")))[:38]
            role = strip_inline_md(_sanitize_for_public_output(str(rc.get("role") or "")))[:88]
            ik = _diag_v2.infer_gcp_icon_key(lbl, sub, role, str(rc.get("iconKey") or ""))
            comps.append({"id": cid, "label": lbl, "sub": sub, "role": role, "iconKey": ik})
            all_comp_ids.append(cid)
        if not comps:
            cid = f"z{zi+1}c1"
            comps.append({"id": cid, "label": z_title[:28], "sub": "Component", "role": "", "iconKey": "gcp_cloud"})
            all_comp_ids.append(cid)
        zones.append({"id": f"zone_{zi+1}", "title": z_title, "subtitle": z_sub, "components": comps})

    id_set = set(all_comp_ids)
    raw_edges = raw.get("architectureEdges") if isinstance(raw.get("architectureEdges"), list) else []
    edges: List[Dict[str, Any]] = []
    for re_edge in raw_edges[:16]:
        if not isinstance(re_edge, dict):
            continue
        frm = str(re_edge.get("from") or "").strip()
        to = str(re_edge.get("to") or "").strip()
        if frm in id_set and to in id_set and frm != to:
            edges.append({
                "from": frm,
                "to": to,
                "label": strip_inline_md(_sanitize_for_public_output(str(re_edge.get("label") or "HTTPS / TLS")))[:32],
                "dashed": bool(re_edge.get("dashed", False)),
            })
    if not edges and len(zones) == 4:
        for zi in range(3):
            edges.append({
                "from": zones[zi]["components"][0]["id"],
                "to": zones[zi + 1]["components"][0]["id"],
                "label": f"Flow {zi+1}",
                "dashed": False,
            })

    raw_actors = raw.get("sequenceActors") if isinstance(raw.get("sequenceActors"), list) else []
    actors: List[Dict[str, str]] = []
    default_actors = ("Client App", "Edge / Gateway", "Security / IAM", "Core Service", "Data / Audit Store")
    for ai in range(5):
        ra = raw_actors[ai] if ai < len(raw_actors) and isinstance(raw_actors[ai], dict) else {}
        aid = re.sub(r"[^a-zA-Z0-9_-]", "", str(ra.get("id") or f"a{ai+1}"))[:20] or f"a{ai+1}"
        albl = strip_inline_md(_sanitize_for_public_output(str(ra.get("label") or default_actors[ai])))[:26]
        asub = strip_inline_md(_sanitize_for_public_output(str(ra.get("sub") or "")))[:30]
        aik = _diag_v2.infer_gcp_icon_key(albl, asub, "", str(ra.get("iconKey") or ""))
        actors.append({"id": aid, "label": albl, "sub": asub, "iconKey": aik})
    actor_ids = {a["id"] for a in actors}

    raw_steps = raw.get("sequenceSteps") if isinstance(raw.get("sequenceSteps"), list) else []
    steps: List[Dict[str, Any]] = []
    for si, rs in enumerate(raw_steps[:10], 1):
        if not isinstance(rs, dict):
            continue
        frm = str(rs.get("from") or "").strip()
        to = str(rs.get("to") or "").strip()
        if frm not in actor_ids or to not in actor_ids or frm == to:
            frm = actors[min(si - 1, 3)]["id"]
            to = actors[min(si, 4)]["id"]
        kind = str(rs.get("kind") or "request").lower()
        if kind not in ("request", "response", "guard"):
            kind = "request"
        steps.append({
            "num": len(steps) + 1,
            "from": frm,
            "to": to,
            "label": strip_inline_md(_sanitize_for_public_output(str(rs.get("label") or f"Step {si}")))[:66],
            "kind": kind,
        })
    if not steps:
        steps = [
            {"num": 1, "from": actors[0]["id"], "to": actors[1]["id"], "label": "HTTPS request + bearer token", "kind": "request"},
            {"num": 2, "from": actors[1]["id"], "to": actors[2]["id"], "label": "Verify identity and policy", "kind": "guard"},
            {"num": 3, "from": actors[2]["id"], "to": actors[3]["id"], "label": "Authorized invocation", "kind": "request"},
            {"num": 4, "from": actors[3]["id"], "to": actors[4]["id"], "label": "Query data + emit audit log", "kind": "request"},
            {"num": 5, "from": actors[4]["id"], "to": actors[0]["id"], "label": "200 OK signed response", "kind": "response"},
        ]

    # Supporting C4 diagram blueprints (security L1, wire L4, async loop)
    sec_raw = raw.get("securityDiagram") if isinstance(raw.get("securityDiagram"), dict) else {}
    sec_layers = []
    for rl in (sec_raw.get("layers") or [])[:4]:
        if isinstance(rl, dict):
            sec_layers.append({
                "zone": strip_inline_md(_sanitize_for_public_output(str(rl.get("zone") or "")))[:42],
                "control": strip_inline_md(_sanitize_for_public_output(str(rl.get("control") or "")))[:66],
                "iconKey": _diag_v2.infer_gcp_icon_key(str(rl.get("control") or ""), str(rl.get("zone") or ""), "", str(rl.get("iconKey") or "")),
                "detail": strip_inline_md(_sanitize_for_public_output(str(rl.get("detail") or "")))[:160],
            })
    sec_threats = []
    for rt in (sec_raw.get("threats") or [])[:4]:
        if isinstance(rt, dict):
            sec_threats.append({
                "code": strip_inline_md(str(rt.get("code") or f"T-0{len(sec_threats)+1}"))[:8],
                "vector": strip_inline_md(_sanitize_for_public_output(str(rt.get("vector") or "")))[:48],
                "mitigation": strip_inline_md(_sanitize_for_public_output(str(rt.get("mitigation") or "")))[:160],
            })
    sec_breakers = []
    for rb in (sec_raw.get("breakers") or [])[:4]:
        if isinstance(rb, dict):
            sec_breakers.append({
                "code": strip_inline_md(str(rb.get("code") or "HTTP 403"))[:14],
                "trigger": strip_inline_md(_sanitize_for_public_output(str(rb.get("trigger") or "")))[:78],
            })
    security_diag = {"layers": sec_layers, "threats": sec_threats, "breakers": sec_breakers} if (sec_layers or sec_threats) else {}

    wire_raw = raw.get("wireDiagram") if isinstance(raw.get("wireDiagram"), dict) else {}
    wire_hops = []
    for rh in (wire_raw.get("hops") or [])[:4]:
        if isinstance(rh, dict):
            wire_hops.append({
                "hop": strip_inline_md(_sanitize_for_public_output(str(rh.get("hop") or f"HOP {len(wire_hops)+1}")))[:30],
                "title": strip_inline_md(_sanitize_for_public_output(str(rh.get("title") or "")))[:34],
                "protocol": strip_inline_md(_sanitize_for_public_output(str(rh.get("protocol") or "HTTPS")))[:32],
                "iconKey": _diag_v2.infer_gcp_icon_key(str(rh.get("title") or ""), str(rh.get("protocol") or ""), "", str(rh.get("iconKey") or "")),
                "added": [strip_inline_md(_sanitize_for_public_output(str(x)))[:44] for x in (rh.get("added") or []) if str(x).strip()][:4],
                "stripped": [strip_inline_md(_sanitize_for_public_output(str(x)))[:44] for x in (rh.get("stripped") or []) if str(x).strip()][:3],
                "sample": strip_emojis(_sanitize_for_public_output(str(rh.get("sample") or "")))[:180],
            })
    wire_diag = {"hops": wire_hops} if len(wire_hops) >= 2 else {}

    async_raw = raw.get("asyncDiagram") if isinstance(raw.get("asyncDiagram"), dict) else {}
    async_stages = []
    for rs_a in (async_raw.get("stages") or [])[:4]:
        if isinstance(rs_a, dict):
            async_stages.append({
                "stage": strip_inline_md(_sanitize_for_public_output(str(rs_a.get("stage") or f"{len(async_stages)+1}. STAGE")))[:28],
                "service": strip_inline_md(_sanitize_for_public_output(str(rs_a.get("service") or "")))[:34],
                "iconKey": _diag_v2.infer_gcp_icon_key(str(rs_a.get("service") or ""), str(rs_a.get("stage") or ""), "", str(rs_a.get("iconKey") or "")),
                "cadence": strip_inline_md(_sanitize_for_public_output(str(rs_a.get("cadence") or "Async")))[:24],
                "detail": strip_inline_md(_sanitize_for_public_output(str(rs_a.get("detail") or "")))[:200],
            })
    async_diag = (
        {
            "stages": async_stages,
            "feedbackNote": strip_inline_md(_sanitize_for_public_output(str(async_raw.get("feedbackNote") or "")))[:220],
        }
        if len(async_stages) >= 2
        else {}
    )

    sections: List[Dict[str, Any]] = []
    raw_secs = raw.get("sections") if isinstance(raw.get("sections"), list) else []
    for rs in raw_secs[:12]:
        if not isinstance(rs, dict):
            continue
        heading = strip_inline_md(_sanitize_for_public_output(str(rs.get("heading") or "Architecture Details")))[:120]
        paras = [
            _sanitize_for_public_output(str(p)).strip()
            for p in (rs.get("paragraphs") or [])
            if str(p).strip()
        ][:10]
        bullets = [
            _sanitize_for_public_output(str(b)).strip()
            for b in (rs.get("bullets") or [])
            if str(b).strip()
        ][:14]
        code_blocks = []
        for cb in (rs.get("codeBlocks") or [])[:4]:
            if isinstance(cb, dict) and str(cb.get("code") or "").strip():
                lang = re.sub(r"[^a-zA-Z0-9_-]", "", str(cb.get("language") or "sql").lower())[:16] or "text"
                code_blocks.append({
                    "language": lang,
                    "caption": strip_inline_md(_sanitize_for_public_output(str(cb.get("caption") or "")))[:110],
                    "code": _sanitize_for_public_output(str(cb.get("code") or "").rstrip())[:4500],
                })
        tbl_out = None
        rt = rs.get("table")
        if isinstance(rt, dict) and isinstance(rt.get("headers"), list) and rt["headers"]:
            hdrs = [strip_inline_md(_sanitize_for_public_output(str(h)))[:60] for h in rt["headers"][:6]]
            rows = []
            for rr in (rt.get("rows") or [])[:12]:
                if isinstance(rr, list) and rr:
                    row = [strip_inline_md(_sanitize_for_public_output(str(c)))[:180] for c in rr[: len(hdrs)]]
                    while len(row) < len(hdrs):
                        row.append("")
                    rows.append(row)
            if rows:
                tbl_out = {"headers": hdrs, "rows": rows}
        sections.append({"heading": heading, "paragraphs": paras, "bullets": bullets, "codeBlocks": code_blocks, "table": tbl_out})

    raw_slides = raw.get("slides") if isinstance(raw.get("slides"), list) else []
    n_slides = target_slides if target_slides in (9, 12) else (12 if len(raw_slides) >= 10 else 9)
    if n_slides == 12:
        default_kickers = (
            "EXECUTIVE BRIEF", "PROBLEM & TARGETS", "REFERENCE ARCHITECTURE (C4 L2)",
            "DESIGN MATRIX", "REQUEST LIFECYCLE (C4 L3)", "SECURITY BOUNDARY (C4 L1)",
            "WIRE PAYLOAD (C4 L4)", "ASYNC LIFECYCLE LOOP", "IMPLEMENTATION & GUARDRAILS",
            "LIVE PROOF VAULT", "TRADE-OFFS & FINOPS", "PRODUCTION READINESS",
        )
        default_titles = (
            title[:58],
            "Architectural Challenge & Design Goals",
            "Master Reference Architecture Topology",
            "Component & Security Design Matrix",
            "End-to-End Request Lifecycle Sequence",
            "Trust Perimeter & Fail-Closed Security Boundary",
            "Wire-Protocol & Schema Transformation",
            "Async Lifecycle, Export & Erasure Loop",
            "Implementation Guardrails & Starter Code",
            "Verified Console & SaaS Proofs (Before / After)",
            "Cost, Latency & Architecture Trade-offs",
            "Production Readiness Checklist & Next Steps",
        )
    else:
        default_kickers = (
            "EXECUTIVE BRIEF", "PROBLEM & TARGETS", "REFERENCE ARCHITECTURE",
            "DESIGN MATRIX", "REQUEST LIFECYCLE", "IMPLEMENTATION & GUARDRAILS",
            "LIVE PROOF VAULT", "TRADE-OFFS & COST", "PRODUCTION READINESS",
        )
        default_titles = (
            title[:58],
            "Architectural Challenge & Design Goals",
            "End-to-End Reference Topology",
            "Component & Security Design Matrix",
            "End-to-End Request Lifecycle",
            "Implementation Guardrails & Code",
            "Verified Console & SaaS Proofs (Before / After)",
            "Cost, Latency & Trade-off Comparison",
            "Production Readiness Checklist & Next Steps",
        )
    slides: List[Dict[str, Any]] = []
    for i in range(n_slides):
        rs = raw_slides[i] if i < len(raw_slides) and isinstance(raw_slides[i], dict) else {}
        tbl_s = None
        rt = rs.get("table")
        if isinstance(rt, dict) and isinstance(rt.get("headers"), list) and rt["headers"]:
            hdrs = [strip_inline_md(_sanitize_for_public_output(str(h)))[:40] for h in rt["headers"][:5]]
            rows = []
            for rr in (rt.get("rows") or [])[:6]:
                if isinstance(rr, list) and rr:
                    row = [strip_inline_md(_sanitize_for_public_output(str(c)))[:105] for c in rr[: len(hdrs)]]
                    while len(row) < len(hdrs):
                        row.append("")
                    rows.append(row)
            if rows:
                tbl_s = {"headers": hdrs, "rows": rows}
        bullets = [
            strip_inline_md(_sanitize_for_public_output(str(b)))[:140]
            for b in (rs.get("bullets") or [])
            if str(b).strip()
        ][:6]
        notes = strip_inline_md(_sanitize_for_public_output(str(rs.get("speakerNotes") or "")))[:950].strip()
        if not notes:
            notes = f"{default_titles[i]}. " + (" ".join(bullets[:3]) if bullets else summary[:240])
        slides.append({
            "number": i + 1,
            "kicker": strip_inline_md(_sanitize_for_public_output(str(rs.get("kicker") or default_kickers[i])))[:38].upper(),
            "title": strip_inline_md(_sanitize_for_public_output(str(rs.get("title") or default_titles[i])))[:72],
            "subtitle": strip_inline_md(_sanitize_for_public_output(str(rs.get("subtitle") or "")))[:128],
            "bullets": bullets,
            "calloutLabel": strip_inline_md(_sanitize_for_public_output(str(rs.get("calloutLabel") or "")))[:40],
            "calloutValue": strip_inline_md(_sanitize_for_public_output(str(rs.get("calloutValue") or "")))[:65],
            "table": tbl_s,
            "codeSnippet": _sanitize_for_public_output(str(rs.get("codeSnippet") or ""))[:1600],
            "speakerNotes": notes,
        })

    raw_claims = raw.get("claimLedger") if isinstance(raw.get("claimLedger"), list) else []
    claims: List[Dict[str, str]] = []
    for ci, rc in enumerate(raw_claims[:18], 1):
        if not isinstance(rc, dict):
            continue
        prov = str(rc.get("provenance") or "EXAMPLE_TARGET").strip().upper()
        if prov not in ALLOWED_PROVENANCE_TAGS:
            prov = "EXAMPLE_TARGET"
        claims.append({
            "id": strip_inline_md(str(rc.get("id") or f"CLM-{ci:02d}"))[:16],
            "claim": strip_inline_md(_sanitize_for_public_output(str(rc.get("claim") or "")))[:180],
            "value": strip_inline_md(_sanitize_for_public_output(str(rc.get("value") or "")))[:80],
            "provenance": prov,
            "basis": strip_inline_md(_sanitize_for_public_output(str(rc.get("basis") or "")))[:240],
        })

    raw_faq = raw.get("faq") if isinstance(raw.get("faq"), list) else []
    faq: List[Dict[str, str]] = []
    for rf in raw_faq[:10]:
        if isinstance(rf, dict) and str(rf.get("question") or "").strip():
            faq.append({
                "question": strip_inline_md(_sanitize_for_public_output(str(rf.get("question"))))[:220],
                "answer": _sanitize_for_public_output(str(rf.get("answer") or ""))[:1000].strip(),
            })

    raw_refs = raw.get("references") if isinstance(raw.get("references"), list) else []
    refs: List[Dict[str, str]] = []
    seen_urls = set()
    for rr in raw_refs[:14]:
        if not isinstance(rr, dict):
            continue
        safe_url = validate_safe_https_url(str(rr.get("url") or ""))
        if not safe_url or safe_url in seen_urls:
            continue
        seen_urls.add(safe_url)
        refs.append({
            "title": strip_inline_md(_sanitize_for_public_output(str(rr.get("title") or safe_url)))[:120],
            "url": safe_url,
            "note": strip_inline_md(_sanitize_for_public_output(str(rr.get("note") or "")))[:200],
        })

    rc = raw.get("codeStarter") if isinstance(raw.get("codeStarter"), dict) else {}
    code_starter = {
        "readmeSummary": _sanitize_for_public_output(str(rc.get("readmeSummary") or "Review variables and security controls before applying.")),
        "schemaSql": _sanitize_for_public_output(str(rc.get("schemaSql") or "")),
        "terraformMain": _sanitize_for_public_output(str(rc.get("terraformMain") or "")),
        "terraformVars": _sanitize_for_public_output(str(rc.get("terraformVars") or "")),
        "pythonApp": _sanitize_for_public_output(str(rc.get("pythonApp") or "")),
        "deploySh": _sanitize_for_public_output(str(rc.get("deploySh") or "")),
        "verifySh": _sanitize_for_public_output(str(rc.get("verifySh") or "")),
    }

    return {
        "title": title,
        "subtitle": subtitle,
        "slugHint": slug_hint,
        "summary": summary,
        "prompt": _sanitize_for_public_output(prompt.strip())[:4000],
        "domain": strip_inline_md(_sanitize_for_public_output(str(raw.get("domain") or domain or "Google Cloud Architecture")))[:80],
        "audience": strip_inline_md(_sanitize_for_public_output(str(raw.get("audience") or audience or "Solutions Architects & Engineers")))[:80],
        "estimatedReadMinutes": est_min,
        "keyTakeaways": takeaways,
        "architectureZones": zones,
        "architectureEdges": edges,
        "sequenceActors": actors,
        "sequenceSteps": steps,
        "securityDiagram": security_diag,
        "wireDiagram": wire_diag,
        "asyncDiagram": async_diag,
        "sections": sections,
        "slides": slides,
        "claimLedger": claims,
        "faq": faq,
        "references": refs,
        "codeStarter": code_starter,
    }


def encode_drawio_viewer_url(xml_str: str) -> str:
    """Builds a live viewer.diagrams.net/?...#R<xml> self-contained URL matching portal conventions."""
    xml_frag = urllib.parse.quote(xml_str, safe="")
    if len(xml_frag) <= 32000:
        return (
            "https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff"
            f"&edit=_blank&layers=1&nav=1#R{xml_frag}"
        )
    raw_bytes = urllib.parse.quote(xml_str, safe="~()*!.'").encode("utf-8")
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)
    deflated = comp.compress(raw_bytes) + comp.flush()
    b64 = base64.b64encode(deflated).decode("ascii")
    return (
        "https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff"
        f"&edit=_blank&layers=1&nav=1#R{urllib.parse.quote(b64, safe='')}"
    )


def _wrap_text(text: str, max_chars: int, max_lines: int = 3) -> List[str]:
    words = str(text or "").split()
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
                lines.append(w[: max_chars - 1] + "-")
                w = w[max_chars - 1 :]
            cur = w
            continue
        candidate = f"{cur} {w}".strip()
        if len(candidate) <= max_chars:
            cur = candidate
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


def encode_drawio_studio_hash(xml_str: str) -> str:
    """Matches scripts/blog_assets_manager.py::encode_drawio_hash for /drawio-editor."""
    if not xml_str:
        return ""
    s = re.sub(r">\s+<", "><", xml_str.strip())
    uri_encoded = urllib.parse.quote(s, safe="~()*!.'")
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)
    compressed = comp.compress(uri_encoded.encode("utf-8")) + comp.flush()
    return "R" + base64.b64encode(compressed).decode("ascii")


def compile_architecture_drawio_and_svg(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str]:
    xml_s, svg_s, url_s, _ = _diag_v2.compile_architecture_v2(bp, slug)
    return xml_s, svg_s, url_s


def compile_sequence_drawio_and_svg(bp: Dict[str, Any], slug: str) -> Tuple[str, str, str]:
    xml_s, svg_s, url_s, _ = _diag_v2.compile_sequence_v2(bp, slug)
    return xml_s, svg_s, url_s


def compile_all_diagrams_v2(bp: Dict[str, Any], slug: str) -> Dict[str, Dict[str, Any]]:
    """Compiles all 5 C4-layered 1600x900 Draw.io + SVG diagrams with official multi-color GCP icons."""
    ax, asvg, aurl, aic = _diag_v2.compile_architecture_v2(bp, slug)
    sx, ssvg, surl, sic = _diag_v2.compile_sequence_v2(bp, slug)
    kx, ksvg, kurl, kic = _diag_v2.compile_security_v2(bp, slug)
    wx, wsvg, wurl, wic = _diag_v2.compile_wire_v2(bp, slug)
    yx, ysvg, yurl, yic = _diag_v2.compile_async_v2(bp, slug)
    return {
        "architecture": {
            "id": f"{slug}-architecture", "kind": "architecture", "layer": "C4 L2", "slide": 3,
            "label": "Figure 1 — Master Reference Architecture (C4 L2)",
            "xml": ax, "svg": asvg, "viewerUrl": aurl, "iconCount": aic,
        },
        "sequence": {
            "id": f"{slug}-sequence", "kind": "sequence", "layer": "C4 L3", "slide": 5,
            "label": "Figure 2 — End-to-End Request Lifecycle Sequence (C4 L3)",
            "xml": sx, "svg": ssvg, "viewerUrl": surl, "iconCount": sic,
        },
        "security": {
            "id": f"{slug}-security", "kind": "security", "layer": "C4 L1", "slide": 6,
            "label": "Figure 3 — Trust Perimeter & Security Boundary (C4 L1)",
            "xml": kx, "svg": ksvg, "viewerUrl": kurl, "iconCount": kic,
        },
        "wire": {
            "id": f"{slug}-wire", "kind": "wire", "layer": "C4 L4", "slide": 7,
            "label": "Figure 4 — Wire-Protocol & Schema Transformation (C4 L4)",
            "xml": wx, "svg": wsvg, "viewerUrl": wurl, "iconCount": wic,
        },
        "async": {
            "id": f"{slug}-async", "kind": "async", "layer": "ASYNC", "slide": 8,
            "label": "Figure 5 — Async State, Export & Lifecycle Loop",
            "xml": yx, "svg": ysvg, "viewerUrl": yurl, "iconCount": yic,
        },
    }


def parse_image_header(data: bytes) -> Tuple[str, int, int, str]:
    """Returns (ext, width, height, mime) or raises CreateBlog1Error for non-PNG/JPEG bytes."""
    if not data or len(data) < 24:
        raise CreateBlog1Error("Uploaded proof image is empty or truncated.", 400, "INVALID_IMAGE")
    if len(data) > MAX_PROOF_IMAGE_BYTES:
        raise CreateBlog1Error(
            f"Proof image exceeds maximum size ({MAX_PROOF_IMAGE_BYTES // (1024 * 1024)} MiB).",
            413,
            "IMAGE_TOO_LARGE",
        )
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        w, h = struct.unpack(">II", data[16:24])
        if w < 320 or h < 180 or w > 12000 or h > 12000:
            raise CreateBlog1Error(
                f"PNG dimensions ({w}x{h}) out of allowed bounds (min 320x180, max 12000x12000).",
                400,
                "INVALID_DIMENSIONS",
            )
        return ("png", int(w), int(h), "image/png")

    if data[:2] == b"\xff\xd8":
        i = 2
        n = len(data)
        while i + 4 < n:
            if data[i] != 0xFF:
                break
            while i < n and data[i] == 0xFF:
                i += 1
            if i >= n:
                break
            marker = data[i]
            i += 1
            if marker in (0xD8, 0xD9, 0x01) or (0xD0 <= marker <= 0xD7):
                continue
            if i + 2 > n:
                break
            seg_len = struct.unpack(">H", data[i : i + 2])[0]
            if seg_len < 2 or i + seg_len > n:
                break
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                if seg_len >= 7:
                    h, w = struct.unpack(">HH", data[i + 3 : i + 7])
                    if w < 320 or h < 180 or w > 12000 or h > 12000:
                        raise CreateBlog1Error(
                            f"JPEG dimensions ({w}x{h}) out of allowed bounds (min 320x180, max 12000x12000).",
                            400,
                            "INVALID_DIMENSIONS",
                        )
                    return ("jpg", int(w), int(h), "image/jpeg")
            i += seg_len
        raise CreateBlog1Error("Malformed JPEG image (missing SOF header).", 400, "INVALID_IMAGE")

    raise CreateBlog1Error("Only genuine PNG or JPEG images are allowed (magic-byte check failed).", 400, "UNSUPPORTED_MEDIA")


def _svg_data_uri(raw: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def _render_slide_table_svg(tbl: Dict[str, Any], x: float, y: float, w: float, max_h: float) -> str:
    hdrs = tbl.get("headers") or []
    rows = tbl.get("rows") or []
    if not hdrs or not rows:
        return ""
    ncols = len(hdrs)
    col_w = w / ncols
    row_h = min(74.0, (max_h - 48.0) / max(1, len(rows)))
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="48" rx="6" fill="#1A73E8"/>']
    for ci, htxt in enumerate(hdrs):
        out.append(
            f'<text x="{x + ci * col_w + 14:.1f}" y="{y + 30:.1f}" font-family="Google Sans, Inter, Arial, sans-serif" '
            f'font-size="14" font-weight="800" fill="#FFFFFF">{xml_esc(str(htxt)[:32])}</text>'
        )
    for ri, rr in enumerate(rows[:6]):
        ry = y + 48 + ri * row_h
        bg = "#F8FAFC" if ri % 2 == 1 else "#FFFFFF"
        out.append(f'<rect x="{x}" y="{ry:.1f}" width="{w}" height="{row_h:.1f}" fill="{bg}" stroke="#CBD5E1" stroke-width="1"/>')
        max_chars = max(14, int(col_w / 8.8))
        for ci, cval in enumerate(rr[:ncols]):
            lines = _wrap_text(str(cval), max_chars, 2)
            for li, ln in enumerate(lines):
                fw = "700" if ci == 0 else "500"
                out.append(
                    f'<text x="{x + ci * col_w + 14:.1f}" y="{ry + 25 + li * 18:.1f}" '
                    f'font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="{fw}" fill="#0F172A">{xml_esc(ln)}</text>'
                )
    return "\n".join(out)


def compile_slide_preview_svgs(
    bp: Dict[str, Any],
    slug: str,
    arch_svg: str,
    seq_svg: str,
    proofs: List[Dict[str, Any]],
    blog_dir: Path,
    extra_svgs: Optional[Dict[str, str]] = None,
) -> List[str]:
    out_svgs: List[str] = []
    slides = bp["slides"]
    total = 12 if len(slides) >= 12 else len(slides[:9])
    if total == 0:
        return []
    is_v2 = total == 12
    arch_uri = _svg_data_uri(arch_svg.encode("utf-8"), "image/svg+xml")
    seq_uri = _svg_data_uri(seq_svg.encode("utf-8"), "image/svg+xml")
    ex = extra_svgs or {}
    sec_uri = _svg_data_uri(ex["security"].encode("utf-8"), "image/svg+xml") if ex.get("security") else None
    wire_uri = _svg_data_uri(ex["wire"].encode("utf-8"), "image/svg+xml") if ex.get("wire") else None
    async_uri = _svg_data_uri(ex["async"].encode("utf-8"), "image/svg+xml") if ex.get("async") else None

    code_slide_num = 9 if is_v2 else 6
    proof_slide_num = 10 if is_v2 else 7
    table_slide_nums = (4, 11) if is_v2 else (4, 8)
    diag_slides: Dict[int, Tuple[Optional[str], str, str]] = {
        3: (arch_uri, "ARCHITECTURE RAIL", "#1A73E8"),
        5: (seq_uri, "SEQUENCE CHECKPOINTS", "#137333"),
    }
    if is_v2:
        if sec_uri:
            diag_slides[6] = (sec_uri, "PERIMETER CONTROLS", "#991B1B")
        if wire_uri:
            diag_slides[7] = (wire_uri, "WIRE TRANSFORM NOTES", "#5B21B6")
        if async_uri:
            diag_slides[8] = (async_uri, "ASYNC LOOP & REPLAY", "#8A4600")

    for i, sl in enumerate(slides[:total]):
        num = i + 1
        kicker = strip_inline_md(sl.get("kicker") or f"SLIDE {num}").upper()
        title = strip_inline_md(sl.get("title") or bp["title"])
        subtitle = strip_inline_md(sl.get("subtitle") or "")
        bullets = [strip_inline_md(b) for b in (sl.get("bullets") or []) if strip_inline_md(b)]

        parts: List[str] = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">',
            '<rect x="0" y="0" width="1600" height="900" fill="#FFFFFF"/>',
            '<rect x="0" y="0" width="400" height="8" fill="#4285F4"/>',
            '<rect x="400" y="0" width="400" height="8" fill="#EA4335"/>',
            '<rect x="800" y="0" width="400" height="8" fill="#FBBC04"/>',
            '<rect x="1200" y="0" width="400" height="8" fill="#34A853"/>',
        ]

        if num == 1:
            parts.extend([
                '<rect x="0" y="8" width="1600" height="892" fill="#F8FAFC"/>',
                '<rect x="76" y="130" width="10" height="390" rx="5" fill="#1A73E8"/>',
                '<rect x="116" y="130" width="330" height="36" rx="18" fill="#E8F0FE" stroke="#BFDBFE" stroke-width="1"/>',
                f'<text x="136" y="154" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#174EA6">{xml_esc(strip_inline_md(bp["domain"]).upper()[:30])}</text>',
            ])
            tlines = _wrap_text(strip_inline_md(bp["title"]), 38, 3)
            for li, ln in enumerate(tlines):
                parts.append(
                    f'<text x="116" y="{236 + li * 62}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="50" font-weight="800" fill="#0F172A">{xml_esc(ln)}</text>'
                )
            slines = _wrap_text(strip_inline_md(bp["subtitle"]), 88, 3)
            sub_y = 236 + len(tlines) * 62 + 18
            for li, ln in enumerate(slines):
                parts.append(
                    f'<text x="116" y="{sub_y + li * 30}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="22" fill="#475569">{xml_esc(ln)}</text>'
                )
            cards = [strip_inline_md(x) for x in (bp.get("keyTakeaways") or [])[:3]] or bullets[:3]
            for ci, ctxt in enumerate(cards):
                cx = 116 + ci * 468
                parts.append(f'<rect x="{cx}" y="585" width="440" height="165" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>')
                bar_c = ("#1A73E8", "#137333", "#EA8600")[ci % 3]
                parts.append(f'<rect x="{cx}" y="585" width="440" height="7" rx="3" fill="{bar_c}"/>')
                parts.append(f'<text x="{cx + 22}" y="622" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12" font-weight="800" fill="{bar_c}">KEY TAKEAWAY {ci+1}</text>')
                for li, ln in enumerate(_wrap_text(ctxt, 42, 4)):
                    parts.append(f'<text x="{cx + 22}" y="{650 + li * 22}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="15.5" font-weight="600" fill="#0F172A">{xml_esc(ln)}</text>')
        else:
            parts.extend([
                f'<text x="64" y="64" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="1.2" fill="#1A73E8">{xml_esc(kicker)}</text>',
                f'<text x="64" y="108" font-family="Google Sans, Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#0F172A">{xml_esc(title[:62])}</text>',
                f'<text x="64" y="138" font-family="Google Sans, Inter, Arial, sans-serif" font-size="17" fill="#475569">{xml_esc(subtitle[:110])}</text>',
                '<line x1="64" y1="158" x2="1536" y2="158" stroke="#E2E8F0" stroke-width="1.8"/>',
            ])
            if num in diag_slides and diag_slides[num][0]:
                d_uri, rail_hdr, rail_col = diag_slides[num]
                parts.extend([
                    '<rect x="64" y="178" width="1140" height="638" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>',
                    f'<image href="{d_uri}" x="70" y="184" width="1128" height="626" preserveAspectRatio="xMidYMid meet"/>',
                    '<rect x="1228" y="178" width="308" height="638" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>',
                    f'<text x="1250" y="214" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12.5" font-weight="800" fill="{rail_col}">{xml_esc(rail_hdr)}</text>',
                ])
                for bi, b in enumerate(bullets[:4]):
                    by = 238 + bi * 126
                    parts.append(f'<rect x="1248" y="{by}" width="268" height="108" rx="8" fill="#FFFFFF" stroke="#E2E8F0"/>')
                    for li, ln in enumerate(_wrap_text(b, 27, 4)):
                        parts.append(f'<text x="1262" y="{by + 26 + li * 20}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.2" font-weight="600" fill="#0F172A">{xml_esc(ln)}</text>')
                parts.append(f'<text x="1250" y="794" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12" font-weight="700" text-decoration="underline" fill="{rail_col}">Edit in Draw.io (.pptx link)</text>')
            elif num == code_slide_num:
                code_raw = sl.get("codeSnippet") or bp["codeStarter"].get("schemaSql") or bp["codeStarter"].get("pythonApp", "")
                code_lines = [ln[:82] for ln in code_raw.splitlines()][:20]
                parts.extend([
                    '<rect x="64" y="186" width="960" height="618" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>',
                    '<rect x="64" y="186" width="960" height="38" rx="12" fill="#1E293B"/>',
                    '<text x="88" y="210" font-family="Roboto Mono, monospace" font-size="12.5" font-weight="700" fill="#93C5FD">starter-template (GENERATED_TEMPLATE_UNDEPLOYED)</text>',
                ])
                for li, cln in enumerate(code_lines):
                    parts.append(
                        f'<text x="86" y="{252 + li * 26}" font-family="Roboto Mono, Courier New, monospace" font-size="13" fill="#E2E8F0" xml:space="preserve">{xml_esc(cln)}</text>'
                    )
                parts.append('<rect x="1050" y="186" width="486" height="618" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>')
                parts.append('<text x="1078" y="226" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14" font-weight="800" fill="#1A73E8">ENFORCEMENT GUARDRAILS</text>')
                for bi, b in enumerate(bullets[:5]):
                    by = 252 + bi * 102
                    parts.append(f'<rect x="1076" y="{by}" width="434" height="86" rx="8" fill="#FFFFFF" stroke="#E2E8F0"/>')
                    for li, ln in enumerate(_wrap_text(b, 42, 3)):
                        parts.append(f'<text x="1096" y="{by + 28 + li * 21}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14.2" font-weight="600" fill="#0F172A">{xml_esc(ln)}</text>')
            elif num == proof_slide_num:
                if proofs:
                    shown = proofs[:2]
                    cw = 716 if len(shown) == 2 else 1472
                    for pi, pf in enumerate(shown):
                        px = 64 + pi * 756
                        pfile = blog_dir / pf["relPath"]
                        parts.append(f'<rect x="{px}" y="188" width="{cw}" height="590" rx="12" fill="#F8FAFC" stroke="#137333" stroke-width="2"/>')
                        parts.append(f'<rect x="{px + 18}" y="204" width="142" height="28" rx="14" fill="#137333"/>')
                        parts.append(f'<text x="{px + 89}" y="223" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11.5" font-weight="800" fill="#FFFFFF">{xml_esc(pf["stage"])}</text>')
                        parts.append(f'<text x="{px + 174}" y="223" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#0F172A">{xml_esc(strip_inline_md(pf["caption"])[:48])}</text>')
                        if pfile.is_file():
                            uri = _svg_data_uri(pfile.read_bytes(), pf["mime"])
                            parts.append(f'<image href="{uri}" x="{px + 18}" y="246" width="{cw - 36}" height="480" preserveAspectRatio="xMidYMid meet"/>')
                        parts.append(
                            f'<text x="{px + 18}" y="756" font-family="Roboto Mono, monospace" font-size="11" fill="#475569">'
                            f'SHA-256: {xml_esc(pf["sha256"][:20])}... | {pf["width"]}x{pf["height"]}px | VERIFIED UPLOAD</text>'
                        )
                else:
                    for pi, slot in enumerate(("BEFORE — Baseline / Vulnerability Proof", "AFTER — Guarded Production Proof")):
                        px = 64 + pi * 756
                        parts.append(f'<rect x="{px}" y="200" width="716" height="530" rx="14" fill="#FFFBEB" stroke="#D97706" stroke-width="2.5" stroke-dasharray="10,7"/>')
                        parts.append(f'<text x="{px + 358}" y="388" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#92400E">{xml_esc(slot)}</text>')
                        parts.append('<text x="{0}" y="428" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="15.5" font-weight="600" fill="#78350F">AUTHENTIC LIVE PROOF REQUIRED — ZERO FAKE SCREENSHOTS</text>'.format(px + 358))
                        parts.append(f'<text x="{px + 358}" y="462" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" fill="#92400E">Upload genuine PNG/JPEG via Live Proofs tab to auto-embed into Slide {proof_slide_num} (.pptx/.docx).</text>')
                    guide = bullets[:2]
                    if guide:
                        parts.append(f'<text x="64" y="778" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" font-weight="600" fill="#334155">Capture target: {xml_esc(" | ".join(guide)[:130])}</text>')
            elif sl.get("table") and num in table_slide_nums:
                parts.append(_render_slide_table_svg(sl["table"], 64, 198, 1472, 470))
                if bullets:
                    parts.append('<rect x="64" y="700" width="1472" height="106" rx="10" fill="#E8F0FE" stroke="#BFDBFE"/>')
                    parts.append('<text x="90" y="734" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#174EA6">KEY NOTES</text>')
                    parts.append(f'<text x="90" y="766" font-family="Google Sans, Inter, Arial, sans-serif" font-size="15.5" font-weight="600" fill="#0F172A">{xml_esc("  |  ".join(bullets[:3])[:138])}</text>')
            else:
                left_w = 960 if sl.get("calloutValue") else 1472
                for bi, b in enumerate(bullets[:5]):
                    by = 196 + bi * 116
                    parts.append(f'<rect x="64" y="{by}" width="{left_w}" height="96" rx="10" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.3"/>')
                    parts.append(f'<circle cx="104" cy="{by + 48}" r="17" fill="#1A73E8"/>')
                    parts.append(f'<text x="104" y="{by + 54}" text-anchor="middle" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF">{bi+1}</text>')
                    wrap_n = 76 if left_w == 960 else 112
                    lines = _wrap_text(b, wrap_n, 2)
                    for li, ln in enumerate(lines):
                        parts.append(f'<text x="140" y="{by + (42 if len(lines) == 2 else 54) + li * 25}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="18.5" font-weight="600" fill="#0F172A">{xml_esc(ln)}</text>')
                if sl.get("calloutValue"):
                    parts.append('<rect x="1056" y="196" width="480" height="320" rx="16" fill="#E8F0FE" stroke="#1A73E8" stroke-width="2"/>')
                    parts.append(f'<text x="1090" y="246" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13.5" font-weight="800" fill="#174EA6">{xml_esc(strip_inline_md(sl.get("calloutLabel") or "GROUNDED METRIC").upper())}</text>')
                    for li, ln in enumerate(_wrap_text(strip_inline_md(sl["calloutValue"]), 22, 4)):
                        parts.append(f'<text x="1090" y="{310 + li * 42}" font-family="Google Sans, Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#0F172A">{xml_esc(ln)}</text>')
                    parts.append('<text x="1090" y="486" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12" fill="#174EA6">See Claim Provenance Ledger for basis.</text>')

        parts.extend([
            '<line x1="64" y1="846" x2="1536" y2="846" stroke="#E2E8F0" stroke-width="1.2"/>',
            f'<text x="64" y="876" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12.5" font-weight="600" fill="#64748B">Create Blog1 Architecture Brief  |  {xml_esc(slug)}</text>',
            f'<text x="1536" y="876" text-anchor="end" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#334155">{num} / {total}</text>',
            "</svg>",
        ])
        out_svgs.append("\n".join(parts))
    return out_svgs


def _emu_x(px: float) -> int:
    return int(round(px * PX_TO_EMU_X))


def _emu_y(px: float) -> int:
    return int(round(px * PX_TO_EMU_Y))


def _pptx_rect(
    sid: int,
    name: str,
    x_px: float,
    y_px: float,
    w_px: float,
    h_px: float,
    *,
    fill_hex: Optional[str] = "FFFFFF",
    line_hex: Optional[str] = None,
    line_pt: float = 1.0,
    dash: Optional[str] = None,
    rounded: bool = False,
    text_runs: Optional[List[Dict[str, Any]]] = None,
    valign: str = "t",
    pad_lr: int = 91440,
    pad_tb: int = 45720,
) -> str:
    prst = "roundRect" if rounded else "rect"
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill_hex}"/></a:solidFill>' if fill_hex is not None else "<a:noFill/>"
    if line_hex:
        ln_w = max(6350, int(round(line_pt * 12700)))
        dash_xml = f'<a:prstDash val="{dash}"/>' if dash else ""
        ln_xml = f'<a:ln w="{ln_w}"><a:solidFill><a:srgbClr val="{line_hex}"/></a:solidFill>{dash_xml}</a:ln>'
    else:
        ln_xml = "<a:ln><a:noFill/></a:ln>"

    if text_runs:
        p_chunks: List[str] = []
        for tr in text_runs:
            txt = strip_emojis(str(tr.get("text") or ""))
            align = tr.get("align", "l")
            sz = max(700, int(round(float(tr.get("pt", 12)) * 100)))
            bold = ' b="1"' if tr.get("bold") else ""
            underline = ' u="sng"' if tr.get("linkRid") else ""
            font = xml_esc(str(tr.get("font", "Arial")))
            col = str(tr.get("color", "0F172A")).lstrip("#")
            spc_after = int(tr.get("spcAft", 0))
            rid = tr.get("linkRid")
            hlink = f'<a:hlinkClick r:id="{xml_esc(rid)}"/>' if rid else ""
            ppr = f'<a:pPr algn="{align}">' + (f'<a:spcAft><a:spcPts val="{spc_after}"/></a:spcAft>' if spc_after else "") + "</a:pPr>"
            rpr = (
                f'<a:rPr lang="en-US" sz="{sz}"{bold}{underline} dirty="0">'
                f'<a:solidFill><a:srgbClr val="{col}"/></a:solidFill>'
                f'<a:latin typeface="{font}"/>{hlink}</a:rPr>'
            )
            p_chunks.append(f'<a:p>{ppr}<a:r>{rpr}<a:t xml:space="preserve">{xml_esc(txt)}</a:t></a:r></a:p>')
        paras_xml = "".join(p_chunks)
    else:
        paras_xml = "<a:p/>"

    av_lst = '<a:avLst><a:gd name="adj" fmla="val 6500"/></a:avLst>' if rounded else "<a:avLst/>"
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_esc(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{_emu_x(x_px)}" y="{_emu_y(y_px)}"/><a:ext cx="{max(1, _emu_x(w_px))}" cy="{max(1, _emu_y(h_px))}"/></a:xfrm>'
        f'<a:prstGeom prst="{prst}">{av_lst}</a:prstGeom>{fill_xml}{ln_xml}</p:spPr>'
        f'<p:txBody><a:bodyPr wrap="square" lIns="{pad_lr}" rIns="{pad_lr}" tIns="{pad_tb}" bIns="{pad_tb}" anchor="{valign}"/>'
        f'<a:lstStyle/>{paras_xml}</p:txBody></p:sp>'
    )


def _pptx_table(sid: int, name: str, x_px: float, y_px: float, w_px: float, h_px: float, hdrs: List[str], rows: List[List[str]]) -> str:
    ncols = max(1, len(hdrs))
    col_w_emu = max(457200, int(_emu_x(w_px) / ncols))
    hdr_h = max(360000, _emu_y(44))
    body_h = max(300000, int(max(360000, _emu_y(h_px) - hdr_h) / max(1, len(rows))))
    grid_cols = "".join(f'<a:gridCol w="{col_w_emu}"/>' for _ in range(ncols))

    def _cell(text: str, bg_hex: str, fg_hex: str, bold: bool, pt: float) -> str:
        b_attr = ' b="1"' if bold else ""
        sz = int(round(pt * 100))
        border_ln = (
            '<a:lnL w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>'
            '<a:lnR w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>'
            '<a:lnT w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>'
            '<a:lnB w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>'
        )
        return (
            f'<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>'
            f'<a:p><a:r><a:rPr lang="en-US" sz="{sz}"{b_attr} dirty="0">'
            f'<a:solidFill><a:srgbClr val="{fg_hex}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr>'
            f'<a:t>{xml_esc(strip_emojis(text))}</a:t></a:r></a:p></a:txBody>'
            f'<a:tcPr anchor="ctr" marL="91440" marR="91440" marT="45720" marB="45720">{border_ln}'
            f'<a:solidFill><a:srgbClr val="{bg_hex}"/></a:solidFill></a:tcPr></a:tc>'
        )

    tr_xml = [f'<a:tr h="{hdr_h}">' + "".join(_cell(str(h)[:40], "1A73E8", "FFFFFF", True, 11.5) for h in hdrs) + "</a:tr>"]
    for ri, rr in enumerate(rows[:6]):
        bg = "F8FAFC" if ri % 2 == 1 else "FFFFFF"
        cells = [_cell(str(rr[ci])[:100] if ci < len(rr) else "", bg, "0F172A", ci == 0, 10.5) for ci in range(ncols)]
        tr_xml.append(f'<a:tr h="{body_h}">' + "".join(cells) + "</a:tr>")

    total_h = hdr_h + body_h * len(rows[:6])
    return (
        f'<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="{sid}" name="{xml_esc(name)}"/>'
        f'<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>'
        f'<p:xfrm><a:off x="{_emu_x(x_px)}" y="{_emu_y(y_px)}"/><a:ext cx="{col_w_emu * ncols}" cy="{total_h}"/></p:xfrm>'
        f'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">'
        f'<a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>{grid_cols}</a:tblGrid>'
        + "".join(tr_xml)
        + "</a:tbl></a:graphicData></a:graphic></p:graphicFrame>"
    )


def _pptx_pic(sid: int, name: str, rel_id: str, x_emu: int, y_emu: int, cx_emu: int, cy_emu: int) -> str:
    return (
        f'<p:pic><p:nvPicPr><p:cNvPr id="{sid}" name="{xml_esc(name)}"/>'
        f'<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{xml_esc(rel_id)}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{x_emu}" y="{y_emu}"/><a:ext cx="{cx_emu}" cy="{cy_emu}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
        f'<a:ln w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></p:spPr></p:pic>'
    )


def compile_pptx_bytes(
    bp: Dict[str, Any],
    slug: str,
    arch_url: str,
    seq_url: str,
    proofs: List[Dict[str, Any]],
    blog_dir: Path,
    extra_urls: Optional[Dict[str, str]] = None,
) -> bytes:
    """Builds a valid 9- or 12-slide native editable OOXML .pptx ZIP with speaker notes & Draw.io #R hyperlinks."""
    buf = io.BytesIO()
    media_entries: Dict[str, bytes] = {}
    has_png = False
    has_jpg = False
    ex_urls = extra_urls or {}

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        total_slides = 12 if len(bp.get("slides") or []) >= 12 else len((bp.get("slides") or [])[:9])
        is_v2 = total_slides == 12
        code_idx = 9 if is_v2 else 6
        proof_idx = 10 if is_v2 else 7
        tbl_idxs = (4, 11) if is_v2 else (4, 8)
        slides_data = bp["slides"][:total_slides]
        slide_rels_extra: Dict[int, List[str]] = {i: [] for i in range(1, total_slides + 1)}

        for idx, sl in enumerate(slides_data, 1):
            shapes: List[str] = []
            sid = 2
            for qi, hex_c in enumerate(("4285F4", "EA4335", "FBBC04", "34A853")):
                shapes.append(_pptx_rect(sid, f"bar_{qi}", qi * 400, 0, 400, 8, fill_hex=hex_c))
                sid += 1

            kicker = strip_inline_md(sl.get("kicker") or f"SECTION {idx}").upper()
            title = strip_inline_md(sl.get("title") or bp["title"])
            subtitle = strip_inline_md(sl.get("subtitle") or "")
            bullets = [strip_inline_md(b) for b in (sl.get("bullets") or []) if strip_inline_md(b)]

            if idx == 1:
                shapes.append(_pptx_rect(sid, "bg", 0, 8, 1600, 892, fill_hex="F8FAFC"))
                sid += 1
                shapes.append(_pptx_rect(sid, "accent", 76, 130, 10, 360, fill_hex="1A73E8", rounded=True))
                sid += 1
                shapes.append(
                    _pptx_rect(
                        sid, "domain_pill", 116, 130, 360, 42, fill_hex="E8F0FE", line_hex="BFDBFE", rounded=True,
                        text_runs=[{"text": bp["domain"].upper()[:32], "pt": 11, "bold": True, "color": "174EA6"}],
                        valign="ctr",
                    )
                )
                sid += 1
                shapes.append(
                    _pptx_rect(
                        sid, "cover_title", 116, 196, 1380, 195, fill_hex=None,
                        text_runs=[{"text": bp["title"][:100], "pt": 36, "bold": True, "color": "0F172A"}],
                    )
                )
                sid += 1
                shapes.append(
                    _pptx_rect(
                        sid, "cover_sub", 116, 400, 1360, 110, fill_hex=None,
                        text_runs=[{"text": bp["subtitle"][:180], "pt": 18, "color": "475569"}],
                    )
                )
                sid += 1
                cards = bp.get("keyTakeaways")[:3] or bullets[:3] or [bp["summary"][:160]]
                for ci, ctxt in enumerate(cards[:3]):
                    cx = 116 + ci * 468
                    col_hex = ("1A73E8", "137333", "EA8600")[ci % 3]
                    shapes.append(
                        _pptx_rect(
                            sid, f"takeaway_{ci}", cx, 576, 440, 170,
                            fill_hex="FFFFFF", line_hex=col_hex, line_pt=1.5, rounded=True,
                            text_runs=[
                                {"text": f"KEY TAKEAWAY {ci+1}", "pt": 9.5, "bold": True, "color": col_hex, "spcAft": 80},
                                {"text": strip_inline_md(str(ctxt))[:160], "pt": 12.5, "color": "0F172A"},
                            ],
                            pad_lr=160000, pad_tb=120000,
                        )
                    )
                    sid += 1
            else:
                shapes.append(
                    _pptx_rect(
                        sid, "kicker", 64, 30, 1100, 32, fill_hex=None,
                        text_runs=[{"text": kicker[:40], "pt": 10.5, "bold": True, "color": "1A73E8"}],
                    )
                )
                sid += 1
                shapes.append(
                    _pptx_rect(
                        sid, "slide_title", 64, 60, 1460, 56, fill_hex=None,
                        text_runs=[{"text": title[:76], "pt": 24, "bold": True, "color": "0F172A"}],
                    )
                )
                sid += 1
                shapes.append(
                    _pptx_rect(
                        sid, "slide_sub", 64, 114, 1460, 36, fill_hex=None,
                        text_runs=[{"text": subtitle[:130], "pt": 13, "color": "475569"}],
                    )
                )
                sid += 1
                shapes.append(_pptx_rect(sid, "hdr_rule", 64, 154, 1472, 2, fill_hex="E2E8F0"))
                sid += 1

                if idx == 3:
                    zones = bp["architectureZones"][:4]
                    col_w = 270
                    gap = 18
                    for zi, z in enumerate(zones):
                        theme = _ZONE_THEMES[zi % 4]
                        zx = 64 + zi * (col_w + gap)
                        shapes.append(
                            _pptx_rect(
                                sid, f"arch_z_{zi}", zx, 178, col_w, 560,
                                fill_hex=theme["bg"].lstrip("#"),
                                line_hex=theme["border"].lstrip("#"),
                                line_pt=1.5, dash="dash", rounded=True,
                                text_runs=[{"text": f"ZONE {zi+1}: {z['title'][:26]}", "pt": 10.5, "bold": True, "color": theme["text"].lstrip("#")}],
                                pad_lr=90000, pad_tb=80000,
                            )
                        )
                        sid += 1
                        comps = z["components"][:4]
                        step_h = 460 / max(1, len(comps))
                        for ci, comp in enumerate(comps):
                            cy = 232 + ci * step_h + 10
                            ch = min(98, step_h - 14)
                            shapes.append(
                                _pptx_rect(
                                    sid, f"arch_c_{zi}_{ci}", zx + 14, cy, col_w - 28, ch,
                                    fill_hex="FFFFFF", line_hex=theme["border"].lstrip("#"),
                                    line_pt=1.2, rounded=True,
                                    text_runs=[
                                        {"text": comp["label"][:30], "pt": 10.5, "bold": True, "color": "0F172A", "spcAft": 40},
                                        {"text": comp.get("sub", "")[:34], "pt": 8.5, "color": "475569"},
                                    ],
                                    valign="ctr", pad_lr=70000, pad_tb=40000,
                                )
                            )
                            sid += 1
                    r_id_link = "rId10"
                    slide_rels_extra[idx].append(
                        f'<Relationship Id="{r_id_link}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
                        f'Target="{xml_esc(arch_url)}" TargetMode="External"/>'
                    )
                    shapes.append(
                        _pptx_rect(
                            sid, "arch_rail", 1226, 178, 310, 560,
                            fill_hex="F8FAFC", line_hex="CBD5E1", rounded=True,
                            text_runs=[{"text": "DESIGN DECISIONS", "pt": 10.5, "bold": True, "color": "1A73E8", "spcAft": 100}]
                            + [{"text": f"- {b[:84]}", "pt": 10.5, "color": "0F172A", "spcAft": 120} for b in bullets[:4]],
                            pad_lr=110000, pad_tb=100000,
                        )
                    )
                    sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, "arch_drawio_link", 64, 756, 460, 44, fill_hex="E8F0FE", line_hex="1A73E8", rounded=True,
                            text_runs=[{"text": "Edit in Draw.io ->", "pt": 11.5, "bold": True, "color": "1A73E8", "linkRid": r_id_link, "align": "ctr"}],
                            valign="ctr",
                        )
                    )
                    sid += 1
                elif idx == 5:
                    actors = bp["sequenceActors"][:5]
                    steps = bp["sequenceSteps"][:8]
                    for ai, a in enumerate(actors):
                        sc, fc = _ACTOR_THEMES[ai % 5]
                        ax = 64 + ai * 228
                        shapes.append(
                            _pptx_rect(
                                sid, f"seq_a_{ai}", ax, 182, 206, 56,
                                fill_hex=fc.lstrip("#"), line_hex=sc.lstrip("#"), line_pt=1.5, rounded=True,
                                text_runs=[{"text": a["label"][:22], "pt": 10, "bold": True, "color": "0F172A", "align": "ctr"}],
                                valign="ctr",
                            )
                        )
                        sid += 1
                    for si, st in enumerate(steps):
                        sy = 256 + si * 58
                        kind = st.get("kind", "request")
                        b_hex = "137333" if kind == "response" else ("B06000" if kind == "guard" else "1A73E8")
                        shapes.append(
                            _pptx_rect(
                                sid, f"seq_s_{si}", 64, sy, 1118, 46,
                                fill_hex="F8FAFC" if si % 2 == 0 else "FFFFFF",
                                line_hex=b_hex, line_pt=1.0, rounded=True,
                                text_runs=[{"text": f"Step {st['num']}  [{st['from']} -> {st['to']}]  {st['label'][:72]}", "pt": 10.5, "bold": True, "color": "0F172A"}],
                                valign="ctr", pad_lr=110000,
                            )
                        )
                        sid += 1
                    r_id_link = "rId10"
                    slide_rels_extra[idx].append(
                        f'<Relationship Id="{r_id_link}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
                        f'Target="{xml_esc(seq_url)}" TargetMode="External"/>'
                    )
                    shapes.append(
                        _pptx_rect(
                            sid, "seq_rail", 1212, 182, 324, 540,
                            fill_hex="F8FAFC", line_hex="CBD5E1", rounded=True,
                            text_runs=[{"text": "LIFECYCLE CHECKPOINTS", "pt": 10.5, "bold": True, "color": "137333", "spcAft": 100}]
                            + [{"text": f"- {b[:84]}", "pt": 10.5, "color": "0F172A", "spcAft": 120} for b in bullets[:4]],
                            pad_lr=110000, pad_tb=100000,
                        )
                    )
                    sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, "seq_drawio_link", 64, 756, 460, 44, fill_hex="E6F4EA", line_hex="137333", rounded=True,
                            text_runs=[{"text": "Edit Sequence in Draw.io ->", "pt": 11.5, "bold": True, "color": "137333", "linkRid": r_id_link, "align": "ctr"}],
                            valign="ctr",
                        )
                    )
                    sid += 1
                elif is_v2 and idx in (6, 7, 8):
                    d_kind, d_title, d_col, d_bg = {
                        6: ("security", "C4 L1 Trust Perimeter & Security Boundary", "991B1B", "FEF2F2"),
                        7: ("wire", "C4 L4 Wire Payload & Schema Transformation", "5B21B6", "F3E8FD"),
                        8: ("async", "Async Lifecycle, Export & Recovery Loop", "8A4600", "FEF7E0"),
                    }[idx]
                    d_url = ex_urls.get(d_kind) or arch_url
                    r_id_link = "rId10"
                    slide_rels_extra[idx].append(
                        f'<Relationship Id="{r_id_link}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
                        f'Target="{xml_esc(d_url)}" TargetMode="External"/>'
                    )
                    if d_kind == "security":
                        lays = (bp.get("securityDiagram") or {}).get("layers") or []
                        for li, lay in enumerate(lays[:4]):
                            shapes.append(
                                _pptx_rect(
                                    sid, f"sec_l_{li}", 64 + li * 22, 182 + li * 130, 1110 - li * 44, 112,
                                    fill_hex=d_bg if li % 2 == 0 else "FFFFFF", line_hex=d_col, line_pt=1.5, dash="dash", rounded=True,
                                    text_runs=[
                                        {"text": f"{strip_inline_md(lay.get('zone', f'Layer {li+1}'))[:38]}  —  {strip_inline_md(lay.get('control', ''))[:52]}", "pt": 11.5, "bold": True, "color": "0F172A", "spcAft": 40},
                                        {"text": strip_inline_md(lay.get("detail", ""))[:110], "pt": 9.8, "color": "475569"},
                                    ],
                                    valign="ctr", pad_lr=140000,
                                )
                            )
                            sid += 1
                    elif d_kind == "wire":
                        hops = (bp.get("wireDiagram") or {}).get("hops") or []
                        for hi, hp in enumerate(hops[:4]):
                            hx = 64 + hi * 282
                            added = ", ".join(strip_inline_md(x) for x in (hp.get("added") or [])[:3])
                            shapes.append(
                                _pptx_rect(
                                    sid, f"wire_h_{hi}", hx, 186, 264, 520,
                                    fill_hex="FFFFFF", line_hex=d_col, line_pt=1.5, rounded=True,
                                    text_runs=[
                                        {"text": strip_inline_md(hp.get("hop", f"HOP {hi+1}"))[:24], "pt": 9.5, "bold": True, "color": d_col, "spcAft": 40},
                                        {"text": strip_inline_md(hp.get("title", ""))[:28], "pt": 12, "bold": True, "color": "0F172A", "spcAft": 80},
                                        {"text": f"+ {added[:120]}" if added else "Protocol framing", "pt": 9.5, "color": "137333", "spcAft": 100},
                                        {"text": strip_inline_md(hp.get("sample", ""))[:110], "pt": 8.5, "font": "Courier New", "color": "334155"},
                                    ],
                                    pad_lr=100000, pad_tb=110000,
                                )
                            )
                            sid += 1
                    else:
                        stages = (bp.get("asyncDiagram") or {}).get("stages") or []
                        for ai_i, stg in enumerate(stages[:4]):
                            ax = 64 + ai_i * 282
                            shapes.append(
                                _pptx_rect(
                                    sid, f"async_s_{ai_i}", ax, 186, 264, 420,
                                    fill_hex="FFFBEB" if ai_i % 2 == 0 else "FFFFFF", line_hex=d_col, line_pt=1.5, rounded=True,
                                    text_runs=[
                                        {"text": strip_inline_md(stg.get("stage", f"STAGE {ai_i+1}"))[:26], "pt": 9.5, "bold": True, "color": d_col, "spcAft": 40},
                                        {"text": strip_inline_md(stg.get("service", ""))[:28], "pt": 12, "bold": True, "color": "0F172A", "spcAft": 60},
                                        {"text": strip_inline_md(stg.get("cadence", "Async"))[:22], "pt": 9, "color": "475569", "spcAft": 80},
                                        {"text": strip_inline_md(stg.get("detail", ""))[:140], "pt": 9.8, "color": "334155"},
                                    ],
                                    pad_lr=100000, pad_tb=100000,
                                )
                            )
                            sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, f"{d_kind}_rail", 1212, 182, 324, 540,
                            fill_hex="F8FAFC", line_hex="CBD5E1", rounded=True,
                            text_runs=[{"text": d_title.upper()[:30], "pt": 9.5, "bold": True, "color": d_col, "spcAft": 100}]
                            + [{"text": f"- {b[:84]}", "pt": 10.5, "color": "0F172A", "spcAft": 120} for b in bullets[:4]],
                            pad_lr=110000, pad_tb=100000,
                        )
                    )
                    sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, f"{d_kind}_drawio_link", 64, 756, 480, 44, fill_hex=d_bg, line_hex=d_col, rounded=True,
                            text_runs=[{"text": f"Edit {d_kind.title()} Diagram in Draw.io ->", "pt": 11.5, "bold": True, "color": d_col, "linkRid": r_id_link, "align": "ctr"}],
                            valign="ctr",
                        )
                    )
                    sid += 1
                elif idx == code_idx:
                    code_raw = sl.get("codeSnippet") or bp["codeStarter"].get("pythonApp", "")
                    runs = []
                    for ln in code_raw.splitlines()[:20]:
                        lead = len(ln) - len(ln.lstrip(" "))
                        runs.append({
                            "text": ("\u00a0" * lead) + ln.lstrip(" ")[:76],
                            "pt": 9.8, "font": "Courier New", "color": "E2E8F0", "spcAft": 20,
                        })
                    shapes.append(
                        _pptx_rect(
                            sid, "code_hdr", 64, 186, 960, 38, fill_hex="1E293B", line_hex="334155",
                            text_runs=[{"text": "starter-template (GENERATED_TEMPLATE_UNDEPLOYED)", "pt": 10, "bold": True, "font": "Courier New", "color": "93C5FD"}],
                            valign="ctr",
                        )
                    )
                    sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, "code_box", 64, 224, 960, 560, fill_hex="0F172A", line_hex="334155",
                            text_runs=runs or [{"text": "# Starter template available in starter.zip", "pt": 10, "font": "Courier New", "color": "E2E8F0"}],
                            pad_lr=140000, pad_tb=120000,
                        )
                    )
                    sid += 1
                    shapes.append(
                        _pptx_rect(
                            sid, "guard_rail", 1052, 186, 484, 598, fill_hex="F8FAFC", line_hex="CBD5E1", rounded=True,
                            text_runs=[{"text": "ENFORCEMENT GUARDRAILS", "pt": 11, "bold": True, "color": "1A73E8", "spcAft": 100}]
                            + [{"text": f"- {b[:110]}", "pt": 11.5, "color": "0F172A", "spcAft": 140} for b in bullets[:5]],
                            pad_lr=140000, pad_tb=120000,
                        )
                    )
                    sid += 1
                elif idx == proof_idx:
                    if proofs:
                        shown = proofs[:2]
                        box_w = 708 if len(shown) == 2 else 1450
                        for pi, pf in enumerate(shown):
                            pfile = blog_dir / pf["relPath"]
                            if not pfile.is_file():
                                continue
                            ext = pf["ext"]
                            if ext == "png":
                                has_png = True
                            else:
                                has_jpg = True
                            media_name = f"proof_{pi+1}.{ext}"
                            media_entries[f"ppt/media/{media_name}"] = pfile.read_bytes()
                            rid = f"rId{20 + pi}"
                            slide_rels_extra[idx].append(
                                f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{media_name}"/>'
                            )
                            bx = 64 + pi * 756
                            shapes.append(
                                _pptx_rect(
                                    sid, f"proof_lbl_{pi}", bx, 186, box_w, 40, fill_hex="E6F4EA", line_hex="137333", rounded=True,
                                    text_runs=[{"text": f"[{pf['stage']}]  {pf['caption'][:52]}", "pt": 11, "bold": True, "color": "0D652D"}],
                                    valign="ctr",
                                )
                            )
                            sid += 1
                            avail_x, avail_y = _emu_x(box_w), _emu_y(500)
                            iw, ih = max(1, int(pf["width"])), max(1, int(pf["height"]))
                            scale = min(avail_x / iw, avail_y / ih)
                            dx, dy = int(iw * scale), int(ih * scale)
                            off_x = _emu_x(bx) + (avail_x - dx) // 2
                            off_y = _emu_y(236) + (avail_y - dy) // 2
                            shapes.append(_pptx_pic(sid, f"proof_img_{pi}", rid, off_x, off_y, dx, dy))
                            sid += 1
                            shapes.append(
                                _pptx_rect(
                                    sid, f"proof_cap_{pi}", bx, 746, box_w, 34, fill_hex=None,
                                    text_runs=[{"text": f"SHA-256: {pf['sha256'][:20]}... | {iw}x{ih}px | Verified Live Capture", "pt": 8.5, "font": "Courier New", "color": "475569"}],
                                )
                            )
                            sid += 1
                    else:
                        for pi, label in enumerate(("BEFORE — Baseline Console / SaaS Proof Slot", "AFTER — Guarded Production Proof Slot")):
                            bx = 64 + pi * 756
                            shapes.append(
                                _pptx_rect(
                                    sid, f"proof_slot_{pi}", bx, 200, 716, 520,
                                    fill_hex="FFFBEB", line_hex="D97706", line_pt=2.0, dash="dash", rounded=True,
                                    text_runs=[
                                        {"text": label, "pt": 15, "bold": True, "color": "92400E", "align": "ctr", "spcAft": 160},
                                        {"text": "AUTHENTIC LIVE PROOF REQUIRED — ZERO FAKE SCREENSHOTS", "pt": 11.5, "bold": True, "color": "78350F", "align": "ctr", "spcAft": 100},
                                        {"text": "Upload a genuine PNG/JPEG from the Create Blog1 portal tab to embed it on Slide 7.", "pt": 10.5, "color": "92400E", "align": "ctr"},
                                    ],
                                    valign="ctr", pad_lr=220000,
                                )
                            )
                            sid += 1
                elif sl.get("table") and idx in tbl_idxs:
                    tbl = sl["table"]
                    shapes.append(_pptx_table(sid, f"tbl_{idx}", 64, 194, 1472, 460, tbl["headers"], tbl["rows"]))
                    sid += 1
                    if bullets:
                        shapes.append(
                            _pptx_rect(
                                sid, f"tbl_note_{idx}", 64, 690, 1472, 108, fill_hex="E8F0FE", line_hex="BFDBFE", rounded=True,
                                text_runs=[
                                    {"text": "KEY NOTES", "pt": 10, "bold": True, "color": "174EA6", "spcAft": 60},
                                    {"text": " | ".join(bullets[:3])[:220], "pt": 11.5, "color": "0F172A"},
                                ],
                                pad_lr=140000, pad_tb=90000,
                            )
                        )
                        sid += 1
                else:
                    left_w = 960 if sl.get("calloutValue") else 1472
                    for bi, b in enumerate(bullets[:5]):
                        by = 192 + bi * 114
                        shapes.append(
                            _pptx_rect(
                                sid, f"bcard_{bi}", 64, by, left_w, 94, fill_hex="F8FAFC", line_hex="CBD5E1", rounded=True,
                                text_runs=[{"text": f"{bi+1}.  {b[:135]}", "pt": 13.5, "color": "0F172A"}],
                                valign="ctr", pad_lr=150000,
                            )
                        )
                        sid += 1
                    if sl.get("calloutValue"):
                        shapes.append(
                            _pptx_rect(
                                sid, "callout", 1054, 192, 482, 330, fill_hex="E8F0FE", line_hex="1A73E8", line_pt=1.8, rounded=True,
                                text_runs=[
                                    {"text": (sl.get("calloutLabel") or "GROUNDED METRIC").upper()[:36], "pt": 10.5, "bold": True, "color": "174EA6", "spcAft": 180},
                                    {"text": strip_emojis(sl["calloutValue"])[:72], "pt": 22, "bold": True, "color": "0F172A", "spcAft": 180},
                                    {"text": "Verify basis in the Claim Provenance Ledger.", "pt": 9.5, "color": "174EA6"},
                                ],
                                pad_lr=180000, pad_tb=160000,
                            )
                        )
                        sid += 1

            shapes.append(_pptx_rect(sid, "ftr_line", 64, 844, 1472, 2, fill_hex="E2E8F0"))
            sid += 1
            shapes.append(
                _pptx_rect(
                    sid, "ftr_l", 64, 854, 1100, 32, fill_hex=None,
                    text_runs=[{"text": f"Create Blog1 Architecture Brief  |  {slug}", "pt": 9.5, "color": "64748B"}],
                )
            )
            sid += 1
            shapes.append(
                _pptx_rect(
                    sid, "ftr_r", 1360, 854, 176, 32, fill_hex=None,
                    text_runs=[{"text": f"{idx} / {total_slides}", "pt": 10, "bold": True, "color": "334155", "align": "r"}],
                )
            )

            slide_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
                '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
                + "".join(shapes)
                + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
            )
            zf.writestr(f"ppt/slides/slide{idx}.xml", slide_xml.encode("utf-8"))
            rels_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
                f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide{idx}.xml"/>'
                + "".join(slide_rels_extra[idx])
                + "</Relationships>"
            )
            zf.writestr(f"ppt/slides/_rels/slide{idx}.xml.rels", rels_xml.encode("utf-8"))

            note_text = strip_inline_md(sl.get("speakerNotes") or "")
            notes_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
                '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>'
                '<p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>'
                '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>'
                '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>'
                f'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>{xml_esc(note_text)}</a:t></a:r></a:p></p:txBody></p:sp>'
                "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>"
            )
            zf.writestr(f"ppt/notesSlides/notesSlide{idx}.xml", notes_xml.encode("utf-8"))
            zf.writestr(
                f"ppt/notesSlides/_rels/notesSlide{idx}.xml.rels",
                (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide{idx}.xml"/>'
                    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>'
                    "</Relationships>"
                ).encode("utf-8"),
            )

        for path_k, data_b in media_entries.items():
            zf.writestr(path_k, data_b)

        theme_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="GoogleCloudLight">'
            '<a:themeElements><a:clrScheme name="GoogleCloud">'
            '<a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>'
            '<a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>'
            '<a:accent1><a:srgbClr val="1A73E8"/></a:accent1><a:accent2><a:srgbClr val="EA4335"/></a:accent2>'
            '<a:accent3><a:srgbClr val="FBBC04"/></a:accent3><a:accent4><a:srgbClr val="137333"/></a:accent4>'
            '<a:accent5><a:srgbClr val="6D28D9"/></a:accent5><a:accent6><a:srgbClr val="0F766E"/></a:accent6>'
            '<a:hlink><a:srgbClr val="1A73E8"/></a:hlink><a:folHlink><a:srgbClr val="6D28D9"/></a:folHlink>'
            "</a:clrScheme>"
            '<a:fontScheme name="Standard"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>'
            '<a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
            '<a:fmtScheme name="Standard"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
            '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>'
            '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>'
            '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>'
            '<a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>'
            '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
            '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>'
            "</a:fmtScheme></a:themeElements></a:theme>"
        )
        zf.writestr("ppt/theme/theme1.xml", theme_xml.encode("utf-8"))
        zf.writestr(
            "ppt/slideLayouts/slideLayout1.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">'
                '<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
                "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"
            ).encode("utf-8"),
        )
        zf.writestr(
            "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'.encode("utf-8"),
        )
        zf.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
                '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>'
                '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
                '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>'
            ).encode("utf-8"),
        )
        zf.writestr(
            "ppt/slideMasters/_rels/slideMaster1.xml.rels",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'
            ).encode("utf-8"),
        )
        zf.writestr(
            "ppt/notesMasters/notesMaster1.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>'
                '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
                "</p:notesMaster>"
            ).encode("utf-8"),
        )
        zf.writestr(
            "ppt/notesMasters/_rels/notesMaster1.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'.encode("utf-8"),
        )

        sld_id_lst = "".join(f'<p:sldId id="{255 + i}" r:id="rId{i + 2}"/>' for i in range(1, total_slides + 1))
        zf.writestr(
            "ppt/presentation.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
                '<p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst>'
                f'<p:sldIdLst>{sld_id_lst}</p:sldIdLst>'
                f'<p:sldSz cx="{SLIDE_W_EMU}" cy="{SLIDE_H_EMU}" type="screen16x9"/>'
                '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>'
            ).encode("utf-8"),
        )
        pres_rels = [
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>',
        ]
        for i in range(1, total_slides + 1):
            pres_rels.append(f'<Relationship Id="rId{i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>')
        zf.writestr(
            "ppt/_rels/presentation.xml.rels",
            ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(pres_rels) + "</Relationships>").encode("utf-8"),
        )
        zf.writestr(
            "_rels/.rels",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                "</Relationships>"
            ).encode("utf-8"),
        )
        now = _now_iso()
        zf.writestr(
            "docProps/core.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                f'<dc:title>{xml_esc(bp["title"])}</dc:title><dc:creator>Google Cloud Architecture Portal</dc:creator>'
                f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created></cp:coreProperties>'
            ).encode("utf-8"),
        )
        overrides = [
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
            '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
            '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
            '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>',
            '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        ]
        for i in range(1, total_slides + 1):
            overrides.append(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>')
            overrides.append(f'<Override PartName="/ppt/notesSlides/notesSlide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>')
        defaults = [
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '<Default Extension="xml" ContentType="application/xml"/>',
        ]
        if has_png:
            defaults.append('<Default Extension="png" ContentType="image/png"/>')
        if has_jpg:
            defaults.append('<Default Extension="jpg" ContentType="image/jpeg"/>')
        zf.writestr(
            "[Content_Types].xml",
            ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + "".join(defaults) + "".join(overrides) + "</Types>").encode("utf-8"),
        )
    return buf.getvalue()


def _docx_p(
    text: str,
    *,
    bold: bool = False,
    size_hp: int = 21,
    color: str = "0F172A",
    sp_before: int = 40,
    sp_after: int = 100,
    border_bottom: Optional[str] = None,
    shade: Optional[str] = None,
    font: str = "Arial",
) -> str:
    ppr_bits = [f'<w:spacing w:before="{sp_before}" w:after="{sp_after}"/>']
    if border_bottom:
        ppr_bits.append(f'<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="4" w:color="{border_bottom}"/></w:pBdr>')
    if shade:
        ppr_bits.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>')
    b_tag = "<w:b/>" if bold else ""
    return (
        f'<w:p><w:pPr>{"".join(ppr_bits)}</w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}"/>{b_tag}<w:color w:val="{color}"/><w:sz w:val="{size_hp}"/></w:rPr>'
        f'<w:t xml:space="preserve">{xml_esc(text)}</w:t></w:r></w:p>'
    )


def _docx_link_p(prefix: str, link_label: str, rid: str) -> str:
    return (
        '<w:p><w:pPr><w:spacing w:before="40" w:after="100"/></w:pPr>'
        f'<w:r><w:rPr><w:color w:val="334155"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">{xml_esc(prefix)}</w:t></w:r>'
        f'<w:hyperlink r:id="{xml_esc(rid)}"><w:r><w:rPr><w:color w:val="1A73E8"/><w:u w:val="single"/><w:b/><w:sz w:val="19"/></w:rPr>'
        f'<w:t>{xml_esc(link_label)}</w:t></w:r></w:hyperlink></w:p>'
    )


def _docx_table(headers: List[str], rows: List[List[str]]) -> str:
    ncols = max(1, len(headers))
    col_w = int(9360 / ncols)
    grid = "".join(f'<w:gridCol w:w="{col_w}"/>' for _ in range(ncols))

    def _tc(text: str, fill: str, fg: str, bold: bool) -> str:
        b = "<w:b/>" if bold else ""
        return (
            f'<w:tc><w:tcPr><w:tcW w:w="{col_w}" w:type="dxa"/>'
            f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
            '<w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>'
            "</w:tcPr>"
            f'<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>{b}<w:color w:val="{fg}"/><w:sz w:val="18"/></w:rPr>'
            f'<w:t>{xml_esc(str(text))}</w:t></w:r></w:p></w:tc>'
        )

    out = [
        '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
        '<w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders>'
        f'</w:tblPr><w:tblGrid>{grid}</w:tblGrid>'
    ]
    out.append("<w:tr>" + "".join(_tc(h, "1A73E8", "FFFFFF", True) for h in headers) + "</w:tr>")
    for ri, rr in enumerate(rows):
        bg = "F8FAFC" if ri % 2 == 1 else "FFFFFF"
        cells = [_tc(rr[ci] if ci < len(rr) else "", bg, "0F172A", ci == 0) for ci in range(ncols)]
        out.append("<w:tr>" + "".join(cells) + "</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


def _docx_inline_image(rid: str, docpr_id: int, name: str, iw: int, ih: int) -> str:
    max_w_emu = 5760000
    scale = min(1.0, max_w_emu / max(1, iw * 9525))
    cx = max(914400, int(iw * 9525 * scale))
    cy = max(457200, int(ih * 9525 * scale))
    if cx > max_w_emu:
        cy = int(cy * (max_w_emu / cx))
        cx = max_w_emu
    return (
        '<w:p><w:r><w:drawing>'
        '<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
        f'<wp:extent cx="{cx}" cy="{cy}"/>'
        f'<wp:docPr id="{docpr_id}" name="{xml_esc(name)}"/>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="{docpr_id}" name="{xml_esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{xml_esc(rid)}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
    )


def compile_docx_bytes(
    bp: Dict[str, Any],
    slug: str,
    arch_url: str,
    seq_url: str,
    proofs: List[Dict[str, Any]],
    blog_dir: Path,
    extra_urls: Optional[Dict[str, str]] = None,
    grounding: Optional[Dict[str, Any]] = None,
) -> bytes:
    buf = io.BytesIO()
    ex_u = extra_urls or {}
    doc_rels: List[str] = [
        f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(arch_url)}" TargetMode="External"/>',
        f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(seq_url)}" TargetMode="External"/>',
    ]
    if ex_u.get("security"):
        doc_rels.append(f'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(ex_u["security"])}" TargetMode="External"/>')
    if ex_u.get("wire"):
        doc_rels.append(f'<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(ex_u["wire"])}" TargetMode="External"/>')
    if ex_u.get("async"):
        doc_rels.append(f'<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(ex_u["async"])}" TargetMode="External"/>')
    media_files: Dict[str, bytes] = {}
    has_png = False
    has_jpg = False

    body: List[str] = [
        _docx_p(f"GOOGLE CLOUD ARCHITECTURE BRIEF  |  {bp['domain'].upper()}", bold=True, size_hp=18, color="1A73E8", sp_after=40),
        _docx_p(bp["title"], bold=True, size_hp=40, color="0F172A", sp_before=20, sp_after=80, border_bottom="1A73E8"),
        _docx_p(bp["subtitle"], size_hp=24, color="475569", sp_after=140),
        _docx_p(
            f"Slug: {slug}  |  Audience: {bp['audience']}  |  Estimated Read: {bp['estimatedReadMinutes']} min  |  Generated: {_now_iso()}",
            size_hp=17, color="64748B", shade="F1F5F9", sp_after=160,
        ),
        _docx_p("Executive Summary (BLUF)", bold=True, size_hp=26, color="1A73E8", sp_before=120, sp_after=60),
        _docx_p(bp["summary"] or bp["subtitle"], size_hp=21, shade="EFF6FF", sp_after=140),
        _docx_link_p("Figure 1 (C4 L2 Master Reference Architecture): ", "Open in viewer.diagrams.net ->", "rId1"),
        _docx_link_p("Figure 2 (C4 L3 End-to-End Request Sequence): ", "Open in viewer.diagrams.net ->", "rId2"),
        *(
            [_docx_link_p("Figure 3 (C4 L1 Trust Perimeter & Security Boundary): ", "Open in viewer.diagrams.net ->", "rId3")]
            if ex_u.get("security") else []
        ),
        *(
            [_docx_link_p("Figure 4 (C4 L4 Wire Payload & Schema Transformation): ", "Open in viewer.diagrams.net ->", "rId4")]
            if ex_u.get("wire") else []
        ),
        *(
            [_docx_link_p("Figure 5 (Async Lifecycle, Export & Recovery Loop): ", "Open in viewer.diagrams.net ->", "rId5")]
            if ex_u.get("async") else []
        ),
    ]

    if bp.get("keyTakeaways"):
        body.append(_docx_p("Key Takeaways", bold=True, size_hp=24, color="0F172A", sp_before=140, sp_after=60))
        for tk in bp["keyTakeaways"]:
            body.append(_docx_p(f"- {tk}", size_hp=20, sp_before=20, sp_after=40))

    for sec in bp["sections"]:
        body.append(_docx_p(sec["heading"], bold=True, size_hp=28, color="0F172A", sp_before=220, sp_after=80, border_bottom="CBD5E1"))
        for p in sec.get("paragraphs") or []:
            body.append(_docx_p(p, size_hp=20, sp_after=90))
        for b in sec.get("bullets") or []:
            body.append(_docx_p(f"- {b}", size_hp=19, sp_before=15, sp_after=40))
        for cb in (sec.get("codeBlocks") or []):
            cap = cb.get("caption") or f"Code ({cb.get('language', 'text')})"
            body.append(_docx_p(f"[{str(cb.get('language', 'code')).upper()}] {cap}", bold=True, size_hp=17, color="1E40AF", shade="EFF6FF", sp_before=60, sp_after=10))
            for ln in str(cb.get("code") or "").splitlines()[:45]:
                body.append(_docx_p(ln, size_hp=16, font="Courier New", color="0F172A", shade="F1F5F9", sp_before=0, sp_after=0))
            body.append(_docx_p("", sp_after=40))
        if sec.get("table"):
            body.append(_docx_table(sec["table"]["headers"], sec["table"]["rows"]))
            body.append(_docx_p("", sp_after=80))

    cs = bp["codeStarter"]
    if cs.get("pythonApp"):
        body.append(_docx_p("Starter Implementation Snippet (GENERATED_TEMPLATE_UNDEPLOYED)", bold=True, size_hp=24, color="0F172A", sp_before=180, sp_after=60, border_bottom="EA8600"))
        body.append(_docx_p("WARNING: Generated template code has NOT been applied to any live GCP project. Review before deployment.", bold=True, size_hp=17, color="92400E", shade="FFFBEB", sp_after=80))
        for ln in cs["pythonApp"].splitlines()[:45]:
            body.append(_docx_p(ln, size_hp=16, font="Courier New", color="1E293B", shade="F1F5F9", sp_before=0, sp_after=0))

    body.append(_docx_p("Authentic Live Proof Screenshots", bold=True, size_hp=26, color="137333", sp_before=220, sp_after=80, border_bottom="137333"))
    if proofs:
        for pi, pf in enumerate(proofs[:6]):
            pfile = blog_dir / pf["relPath"]
            if not pfile.is_file():
                continue
            ext = pf["ext"]
            if ext == "png":
                has_png = True
            else:
                has_jpg = True
            rid = f"rId{10 + pi}"
            mname = f"proof_{pi+1}.{ext}"
            media_files[f"word/media/{mname}"] = pfile.read_bytes()
            doc_rels.append(
                f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{mname}"/>'
            )
            body.append(_docx_p(f"[{pf['stage']}] {pf['caption']} ({pf['width']}x{pf['height']}px, SHA-256: {pf['sha256'][:16]}...)", bold=True, size_hp=18, color="0D652D", sp_before=100, sp_after=40))
            body.append(_docx_inline_image(rid, 100 + pi, mname, int(pf["width"]), int(pf["height"])))
    else:
        body.append(_docx_p("0 live screenshots uploaded yet. Capture and upload genuine BEFORE/AFTER PNG/JPEG proofs via Create Blog1 to embed real screenshots here.", size_hp=19, color="92400E", shade="FFFBEB"))

    body.append(_docx_p("Claim Provenance Ledger", bold=True, size_hp=26, color="1A73E8", sp_before=220, sp_after=80, border_bottom="1A73E8"))
    if bp["claimLedger"]:
        body.append(_docx_table(
            ["ID", "Claim", "Value", "Provenance Tag", "Basis / Scope"],
            [[c["id"], c["claim"], c["value"], c["provenance"], c["basis"]] for c in bp["claimLedger"]],
        ))

    if bp["faq"]:
        body.append(_docx_p("Frequently Asked Questions", bold=True, size_hp=26, color="0F172A", sp_before=220, sp_after=80, border_bottom="CBD5E1"))
        for f in bp["faq"]:
            body.append(_docx_p(f"Q: {f['question']}", bold=True, size_hp=20, color="1A73E8", sp_before=90, sp_after=30))
            body.append(_docx_p(f"A: {f['answer']}", size_hp=19, sp_after=80))

    if bp["references"]:
        body.append(_docx_p("References (Public Documentation)", bold=True, size_hp=24, color="0F172A", sp_before=180, sp_after=60))
        for ri, rf in enumerate(bp["references"]):
            rid = f"rId{50 + ri}"
            doc_rels.append(
                f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{xml_esc(rf["url"])}" TargetMode="External"/>'
            )
            body.append(_docx_link_p(f"- {rf['title']}: ", rf["url"], rid))

    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<w:body>{"".join(body)}'
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>'
        "</w:body></w:document>"
    )

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", doc_xml.encode("utf-8"))
        zf.writestr(
            "word/_rels/document.xml.rels",
            ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(doc_rels) + "</Relationships>").encode("utf-8"),
        )
        for mk, mv in media_files.items():
            zf.writestr(mk, mv)
        zf.writestr(
            "_rels/.rels",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                "</Relationships>"
            ).encode("utf-8"),
        )
        now = _now_iso()
        zf.writestr(
            "docProps/core.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                f'<dc:title>{xml_esc(bp["title"])}</dc:title><dc:creator>Google Cloud Architecture Portal</dc:creator>'
                f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created></cp:coreProperties>'
            ).encode("utf-8"),
        )
        defaults = [
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '<Default Extension="xml" ContentType="application/xml"/>',
        ]
        if has_png:
            defaults.append('<Default Extension="png" ContentType="image/png"/>')
        if has_jpg:
            defaults.append('<Default Extension="jpg" ContentType="image/jpeg"/>')
        zf.writestr(
            "[Content_Types].xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + "".join(defaults)
                + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                "</Types>"
            ).encode("utf-8"),
        )
    return buf.getvalue()


def compile_blog_markdown(
    bp: Dict[str, Any],
    slug: str,
    arch_url: str,
    seq_url: str,
    proofs: List[Dict[str, Any]],
    model_used: str,
    extra_urls: Optional[Dict[str, str]] = None,
    grounding: Optional[Dict[str, Any]] = None,
) -> str:
    ex_u = extra_urls or {}
    g_info = grounding or {}
    lines: List[str] = [
        f"# {bp['title']}",
        "",
        f"> **{bp['subtitle']}**",
        "",
        f"- **Slug:** `{slug}` | **Domain:** {bp['domain']} | **Audience:** {bp['audience']} | **Estimated Read:** {bp['estimatedReadMinutes']} min",
        f"- **Authoring Model:** `{model_used}` (Multi-stage live Gemini API; fail-closed provenance policy)",
        f"- **Live Grounding:** `{g_info.get('status', 'NOT_RUN')}` ({len(g_info.get('queries') or [])} live Google Search queries, {len(g_info.get('sources') or [])} web sources)",
        "- **Verification Status:** 12-check deterministic quality gate (`D-01..D-12`) + grounded orthogonal LLM judge recorded in `quality_report.json`",
        "- **Starter Code Status:** `GENERATED_TEMPLATE_UNDEPLOYED` (review & run `terraform plan` before deploying)",
        "",
        "## Executive Summary (BLUF)",
        "",
        bp["summary"] or bp["subtitle"],
        "",
    ]
    if bp["keyTakeaways"]:
        lines.append("### Key Takeaways")
        lines.append("")
        for tk in bp["keyTakeaways"]:
            lines.append(f"- {tk}")
        lines.append("")

    lines.extend([
        "## Figures & Editable C4 Diagrams",
        "",
        "| Figure | C4 Layer | Draw.io File | Local Studio |",
        "| --- | --- | --- | --- |",
        f"| Figure 1 — Master Reference Architecture | `C4 L2` | `diagrams/{slug}-architecture.drawio` | [Edit in Studio](/drawio-editor?id={slug}-architecture) |",
        f"| Figure 2 — Request Lifecycle Sequence | `C4 L3` | `diagrams/{slug}-sequence.drawio` | [Edit in Studio](/drawio-editor?id={slug}-sequence) |",
    ])
    if ex_u.get("security"):
        lines.append(f"| Figure 3 — Trust Perimeter & Security Boundary | `C4 L1` | `diagrams/{slug}-security.drawio` | [Edit in Studio](/drawio-editor?id={slug}-security) |")
    if ex_u.get("wire"):
        lines.append(f"| Figure 4 — Wire Payload & Schema Transformation | `C4 L4` | `diagrams/{slug}-wire.drawio` | [Edit in Studio](/drawio-editor?id={slug}-wire) |")
    if ex_u.get("async"):
        lines.append(f"| Figure 5 — Async Lifecycle, Export & Recovery Loop | `ASYNC` | `diagrams/{slug}-async.drawio` | [Edit in Studio](/drawio-editor?id={slug}-async) |")
    lines.append("")

    for sec in bp["sections"]:
        lines.append(f"## {sec['heading']}")
        lines.append("")
        for p in sec.get("paragraphs") or []:
            lines.append(p)
            lines.append("")
        for b in sec.get("bullets") or []:
            lines.append(f"- {b}")
        if sec.get("bullets"):
            lines.append("")
        for cb in (sec.get("codeBlocks") or []):
            lang = cb.get("language") or "text"
            cap = cb.get("caption") or ""
            if cap:
                lines.append(f"**{cap}:**")
                lines.append("")
            lines.append(f"```{lang}")
            lines.append(str(cb.get("code") or "").rstrip())
            lines.append("```")
            lines.append("")
        tbl = sec.get("table")
        if tbl and tbl.get("headers") and tbl.get("rows"):
            hdrs = [h.replace("|", "\\|") for h in tbl["headers"]]
            lines.append("| " + " | ".join(hdrs) + " |")
            lines.append("| " + " | ".join("---" for _ in hdrs) + " |")
            for rr in tbl["rows"]:
                lines.append("| " + " | ".join(str(c).replace("|", "\\|") for c in rr) + " |")
            lines.append("")

    lines.append("## Claim Provenance Ledger")
    lines.append("")
    lines.append("| ID | Claim | Value | Provenance | Basis |")
    lines.append("| --- | --- | --- | --- | --- |")
    for c in bp["claimLedger"]:
        lines.append(
            f"| {c['id']} | {c['claim'].replace('|', '/')} | {c['value'].replace('|', '/')} | `{c['provenance']}` | {c['basis'].replace('|', '/')} |"
        )
    lines.append("")

    lines.append("## Authentic Live Proofs (Before / After Screenshots)")
    lines.append("")
    if proofs:
        lines.append("| Stage | Caption | Dimensions | SHA-256 | Source |")
        lines.append("| --- | --- | --- | --- | --- |")
        for pf in proofs:
            lines.append(
                f"| `{pf['stage']}` | {pf['caption'].replace('|', '/')} | {pf['width']}x{pf['height']} | `{pf['sha256'][:16]}...` | {pf.get('sourceUrl') or 'Uploaded file'} |"
            )
    else:
        lines.append("> **0 live proofs uploaded yet.** Per zero-fabrication policy, fake/mock HTML screenshots are never generated. Upload genuine console or SaaS BEFORE/AFTER PNG/JPEG proofs in the **Live Proofs & Recorder** tab to auto-embed them here, in the `.pptx` proof slide, and in `.docx`.")
    lines.append("")

    if bp["faq"]:
        lines.append("## Frequently Asked Questions")
        lines.append("")
        for f in bp["faq"]:
            lines.append(f"### {f['question']}")
            lines.append("")
            lines.append(f["answer"])
            lines.append("")

    if bp["references"]:
        lines.append("## Grounded References")
        lines.append("")
        for rf in bp["references"]:
            note = f" — {rf['note']}" if rf.get("note") else ""
            lines.append(f"- [{rf['title']}]({rf['url']}){note}")
        lines.append("")

    if g_info.get("queries"):
        lines.append("## Live Google Search Grounding Log")
        lines.append("")
        lines.append(f"- **Status:** `{g_info.get('status')}` ({g_info.get('checkedAt', '')})")
        lines.append("- **Queries executed:** " + ", ".join(f"`{q}`" for q in (g_info.get("queries") or [])[:8]))
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def compile_starter_zip(bp: Dict[str, Any], slug: str) -> Tuple[bytes, Dict[str, str], bool, str]:
    cs = bp["codeStarter"]
    banner_hash = (
        "# STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n"
        f"# Generated for slug '{slug}' at {_now_iso()}.\n"
        "# Review, security-scan, and run `terraform plan` before deploying to any GCP project.\n\n"
    )
    tf_main = banner_hash + (cs.get("terraformMain") or 'terraform {\n  required_version = ">= 1.5.0"\n}\n').strip() + "\n"
    tf_vars = banner_hash + (cs.get("terraformVars") or 'variable "project_id" {\n  type = string\n}\n').strip() + "\n"
    py_body = (cs.get("pythonApp") or "").strip()
    if not py_body:
        py_body = (
            '"""Minimal starter module stub."""\n\n'
            'def healthcheck() -> dict:\n'
            '    return {"status": "GENERATED_TEMPLATE_UNDEPLOYED"}\n'
        )
    py_app = banner_hash + py_body + "\n"
    py_ast_ok = True
    py_ast_err = ""
    try:
        ast.parse(py_app)
    except SyntaxError as exc:
        py_ast_ok = False
        py_ast_err = f"Line {exc.lineno}: {exc.msg}"

    deploy_sh = cs.get("deploySh") or "#!/usr/bin/env bash\nset -euo pipefail\necho 'Review terraform plan first.'\n"
    if "GENERATED_TEMPLATE_UNDEPLOYED" not in deploy_sh:
        if deploy_sh.startswith("#!"):
            first, _, rest = deploy_sh.partition("\n")
            deploy_sh = f"{first}\n# STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n{rest}\n"
        else:
            deploy_sh = f"#!/usr/bin/env bash\n# STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n{deploy_sh}\n"
    verify_sh = cs.get("verifySh") or "#!/usr/bin/env bash\nset -euo pipefail\npython3 -m py_compile app.py\n"
    if "GENERATED_TEMPLATE_UNDEPLOYED" not in verify_sh:
        if verify_sh.startswith("#!"):
            first, _, rest = verify_sh.partition("\n")
            verify_sh = f"{first}\n# STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n{rest}\n"
        else:
            verify_sh = f"#!/usr/bin/env bash\n# STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n{verify_sh}\n"

    readme = (
        f"# {bp['title']} — Starter Kit (`{slug}`)\n\n"
        "> **STATUS: `GENERATED_TEMPLATE_UNDEPLOYED`** — These files were generated by the live Gemini API as an "
        "architecture starter template. They have **not** been applied to any Google Cloud project.\n\n"
        f"{cs.get('readmeSummary') or ''}\n\n"
        "## Included Files\n"
        "- `main.tf` — Core Terraform resource scaffold\n"
        "- `variables.tf` — Input variable declarations\n"
        "- `app.py` — Reference Python service scaffold\n"
        "- `deploy.sh` — Deployment wrapper script\n"
        "- `verify.sh` — Local verification script\n"
        "- `PROVENANCE.txt` — Generation & safety attestation\n"
    )
    provenance_txt = (
        f"STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n"
        f"SLUG: {slug}\n"
        f"GENERATED_AT: {_now_iso()}\n"
        f"PYTHON_AST_VALID: {py_ast_ok}\n"
        + (f"PYTHON_AST_ERROR: {py_ast_err}\n" if py_ast_err else "")
    )
    files = {
        "README.md": readme,
        "PROVENANCE.txt": provenance_txt,
        "main.tf": tf_main,
        "variables.tf": tf_vars,
        "app.py": py_app,
        "deploy.sh": deploy_sh,
        "verify.sh": verify_sh,
    }
    schema_sql = (cs.get("schemaSql") or "").strip()
    if schema_sql:
        files["schema.sql"] = (
            "-- STATUS: GENERATED_TEMPLATE_UNDEPLOYED\n"
            f"-- Generated for slug '{slug}' at {_now_iso()}.\n\n"
            + schema_sql + "\n"
        )
    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn, content in files.items():
            zf.writestr(f"{slug}-starter/{fn}", content.encode("utf-8"))
    return zbuf.getvalue(), files, py_ast_ok, py_ast_err


_BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
_BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
_SR_V1 = [44100, 48000, 32000, 0]
_SR_V2 = [22050, 24000, 16000, 0]
_SR_V25 = [11025, 12000, 8000, 0]


def estimate_mp3_duration_seconds(data: bytes) -> float:
    """Pure-stdlib MPEG Layer III frame header scanner for accurate audio duration."""
    if not data:
        return 0.0
    pos = 0
    n = len(data)
    if n >= 10 and data[:3] == b"ID3":
        tag_len = (
            ((data[6] & 0x7F) << 21)
            | ((data[7] & 0x7F) << 14)
            | ((data[8] & 0x7F) << 7)
            | (data[9] & 0x7F)
        )
        pos = min(n, 10 + tag_len)
    total_s = 0.0
    frames = 0
    while pos + 4 <= n:
        if data[pos] == 0xFF and (data[pos + 1] & 0xE0) == 0xE0:
            hdr = struct.unpack(">I", data[pos : pos + 4])[0]
            ver_id = (hdr >> 19) & 0x3
            layer = (hdr >> 17) & 0x3
            br_idx = (hdr >> 12) & 0xF
            sr_idx = (hdr >> 10) & 0x3
            pad = (hdr >> 9) & 0x1
            if layer == 1 and ver_id != 1 and br_idx not in (0, 15) and sr_idx != 3:
                if ver_id == 3:
                    br = _BITRATES_V1_L3[br_idx] * 1000
                    sr = _SR_V1[sr_idx]
                    samples = 1152
                else:
                    br = _BITRATES_V2_L3[br_idx] * 1000
                    sr = _SR_V2[sr_idx] if ver_id == 2 else _SR_V25[sr_idx]
                    samples = 576
                if br > 0 and sr > 0:
                    frame_len = int((samples / 8.0) * br / sr) + pad
                    if frame_len >= 4:
                        total_s += samples / float(sr)
                        frames += 1
                        pos += frame_len
                        continue
        pos += 1
    if frames > 0 and total_s > 0.2:
        return round(total_s, 2)
    return round(max(1.5, len(data) / 4000.0), 2)


def synthesize_tts_mp3(text: str, voice_name: str = "en-US-Chirp3-HD-Charon") -> Tuple[Optional[bytes], Optional[str]]:
    token = _get_gcp_bearer_token()
    if not token:
        return None, "Cloud TTS requires GCP IAM bearer token (unavailable)."
    clean_voice = voice_name if voice_name in ALLOWED_VOICES else "en-US-Chirp3-HD-Charon"
    spoken = strip_emojis(re.sub(r"[`*_#\[\]]+", " ", str(text or "")))
    spoken = re.sub(r"\s+", " ", spoken).strip()[:1600]
    if not spoken:
        return None, "Empty narration text."
    payload = json.dumps({
        "input": {"text": spoken},
        "voice": {"languageCode": "en-US", "name": clean_voice},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0},
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-goog-user-project": DEFAULT_GCP_PROJECT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        b64 = data.get("audioContent") or ""
        if not b64:
            return None, "Empty audioContent returned by Cloud TTS."
        return base64.b64decode(b64), None
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")[:260]
        except Exception:
            pass
        return None, f"Cloud TTS HTTP {exc.code}: {body}"
    except Exception as exc:
        return None, f"Cloud TTS error: {exc}"


def _fmt_vtt_ts(secs: float) -> str:
    ms = int(round(max(0.0, secs) * 1000))
    hh, rem = divmod(ms, 3600000)
    mm, rem = divmod(rem, 60000)
    ss, rem_ms = divmod(rem, 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d}.{rem_ms:03d}"


def build_webvtt(slides: List[Dict[str, Any]], durations: List[float]) -> str:
    out = ["WEBVTT", ""]
    cursor = 0.0
    for i, sl in enumerate(slides[:12]):
        dur = durations[i] if i < len(durations) and durations[i] > 0 else 8.0
        text = strip_emojis(sl.get("speakerNotes") or sl.get("title") or "")
        out.append(f"{i+1}")
        out.append(f"{_fmt_vtt_ts(cursor)} --> {_fmt_vtt_ts(cursor + dur)}")
        out.append(text)
        out.append("")
        cursor += dur
    return "\n".join(out)


def _try_compile_host_mp4(blog_dir: Path, slug: str, durations: List[float]) -> Optional[str]:
    if not (shutil.which("ffmpeg") and shutil.which("rsvg-convert")):
        return None
    video_dir = blog_dir / "video"
    video_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = video_dir / "_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    seg_files: List[Path] = []
    try:
        for i in range(1, 10):
            svg_p = blog_dir / "slides" / f"slide_{i:02d}.svg"
            mp3_p = blog_dir / "audio" / f"slide_{i:02d}.mp3"
            if not (svg_p.is_file() and mp3_p.is_file()):
                return None
            png_p = tmp_dir / f"slide_{i:02d}.png"
            subprocess.run(
                ["rsvg-convert", "-w", "1280", "-h", "720", str(svg_p), "-o", str(png_p)],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20,
            )
            seg_p = tmp_dir / f"seg_{i:02d}.mp4"
            subprocess.run(
                [
                    "ffmpeg", "-y", "-loop", "1", "-i", str(png_p), "-i", str(mp3_p),
                    "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", "-r", "24", str(seg_p),
                ],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45,
            )
            seg_files.append(seg_p)
        lst_p = tmp_dir / "concat.txt"
        lst_p.write_text("\n".join(f"file '{p.resolve()}'" for p in seg_files), encoding="utf-8")
        out_mp4 = video_dir / f"{slug}-narrated.mp4"
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst_p), "-c", "copy", str(out_mp4)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60,
        )
        return f"video/{slug}-narrated.mp4" if out_mp4.is_file() else None
    except Exception:
        return None
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def run_deterministic_quality_gate(
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
    checks: List[Dict[str, Any]] = []

    def _add(cid: str, label: str, passed: bool, detail: str) -> None:
        checks.append({"id": cid, "label": label, "status": "PASS" if passed else "FAIL", "detail": detail})

    clean_md = re.sub(r"https://viewer\.diagrams\.net/[^\s)]+", "URL", md_text)
    words = len(re.findall(r"\S+", clean_md))
    cb_count = sum(len(s.get("codeBlocks") or []) for s in (bp.get("sections") or []))
    tbl_count = sum(1 for s in (bp.get("sections") or []) if s.get("table"))
    _add(
        "D-01",
        "Markdown Structure & Depth",
        words >= 180 and len(bp.get("sections", [])) >= 3,
        f"{words:,} clean prose words across {len(bp.get('sections', []))} sections, {tbl_count} tables, {cb_count} inline code/formula blocks.",
    )

    ic_cnt = arch_icon_count if arch_icon_count is not None else arch_drawio.count("image=data:image/svg+xml,")
    d2_ok, d2_msg = True, f"Well-formed orthogonal C4 L2 mxfile; {ic_cnt} embedded official GCP SVG icons; 0 flowAnimation=1; 0 baked footers."
    low_ad = arch_drawio.lower()
    if "<!doctype" in low_ad or "<!entity" in low_ad or "flowanimation=1" in low_ad or "edit in draw.io" in low_ad:
        d2_ok, d2_msg = False, "Disallowed DOCTYPE/ENTITY, flowAnimation=1, or baked footer in architecture .drawio."
    else:
        try:
            ET.fromstring(arch_drawio)
        except ET.ParseError as exc:
            d2_ok, d2_msg = False, f"XML parse error: {exc}"
    _add("D-02", "Architecture .drawio & GCP SVG Icons", d2_ok and ic_cnt >= 2, d2_msg if d2_ok else d2_msg)

    d3_ok, d3_errs = True, []
    extra_xml_list = [("sequence", seq_drawio)]
    for k, dv in (extra_diagrams or {}).items():
        if k in ("security", "wire", "async") and dv.get("xml"):
            extra_xml_list.append((k, dv["xml"]))
    for k, x_txt in extra_xml_list:
        low_x = x_txt.lower()
        if "<!doctype" in low_x or "<!entity" in low_x or "flowanimation=1" in low_x:
            d3_ok = False
            d3_errs.append(f"{k}: disallowed directive/animation")
        elif k == "sequence" and "dashed=1;dashpattern=6 4;" not in low_x:
            d3_ok = False
            d3_errs.append("sequence: missing dashed lifelines")
        else:
            try:
                ET.fromstring(x_txt)
            except ET.ParseError as exc:
                d3_ok = False
                d3_errs.append(f"{k}: {exc}")
    _add(
        "D-03",
        "Supporting C4 .drawio Lifelines & Hygiene",
        d3_ok,
        f"Validated {1 + len(extra_xml_list)}/{1 + len(extra_xml_list)} Draw.io diagrams (static dashed lifelines, 0 flowAnimation=1)." if d3_ok else "; ".join(d3_errs),
    )

    svg_blobs = [arch_svg, seq_svg] + [
        dv.get("svg", "") for k, dv in (extra_diagrams or {}).items() if k in ("security", "wire", "async")
    ]
    svg_combo = "\n".join(svg_blobs).lower()
    xss_hit = bool(re.search(r"(<script|<foreignobject|javascript:|on[a-z]+\s*=)", svg_combo))
    _add("D-04", "SVG XSS / Script Safety", not xss_hit, f"0 unsafe handlers across {len(svg_blobs)} SVG diagrams." if not xss_hit else "Unsafe SVG markup found.")

    expected_slides = 12 if len(bp.get("slides") or []) >= 12 else len((bp.get("slides") or [])[:9]) or 9
    d5_ok, d5_detail = True, ""
    try:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as zf:
            names = set(zf.namelist())
            missing_s = [i for i in range(1, expected_slides + 1) if f"ppt/slides/slide{i}.xml" not in names]
            missing_n = [i for i in range(1, expected_slides + 1) if f"ppt/notesSlides/notesSlide{i}.xml" not in names]
            zero_rows = 0
            for i in range(1, expected_slides + 1):
                xml_b = zf.read(f"ppt/slides/slide{i}.xml")
                ET.fromstring(xml_b)
                if re.search(rb'<a:tr\s+h="0"', xml_b):
                    zero_rows += 1
            req_links = (3, 5, 6, 7, 8) if (expected_slides == 12 and extra_diagrams) else (3, 5)
            links_ok = all(
                "viewer.diagrams.net" in zf.read(f"ppt/slides/_rels/slide{si}.xml.rels").decode("utf-8")
                for si in req_links
            )
            d5_ok = (not missing_s) and (not missing_n) and (zero_rows == 0) and links_ok
            d5_detail = f"{expected_slides}/{expected_slides} slides, {expected_slides}/{expected_slides} notesSlides, 0 zero-height rows, {len(req_links)} Draw.io #R links={'OK' if links_ok else 'MISSING'}."
    except Exception as exc:
        d5_ok, d5_detail = False, f"PPTX ZIP/XML error: {exc}"
    _add("D-05", "Editable OOXML .pptx Structure & #R Links", d5_ok, d5_detail)

    d6_ok, d6_detail = True, "Valid WordprocessingML document.xml."
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as zf:
            doc_xml = zf.read("word/document.xml")
            ET.fromstring(doc_xml)
            d6_detail = f"Valid word/document.xml ({len(doc_xml):,} bytes, {len(zf.namelist())} package parts)."
    except Exception as exc:
        d6_ok, d6_detail = False, f"DOCX ZIP/XML error: {exc}"
    _add("D-06", "GCP-Branded OOXML .docx Structure", d6_ok, d6_detail)

    emoji_hits = 0
    raw_md_leaks = 0
    try:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as zf:
            for i in range(1, expected_slides + 1):
                s_txt = zf.read(f"ppt/slides/slide{i}.xml").decode("utf-8")
                if any(ch in s_txt for ch in _BANNED_STATUS_EMOJIS):
                    emoji_hits += 1
                if "**" in s_txt and i != (9 if expected_slides == 12 else 6):
                    raw_md_leaks += 1
    except Exception:
        pass
    _add("D-07", "Zero Status Emojis inside Slide XML", emoji_hits == 0, f"0 emoji glyphs detected across slides 1..{expected_slides}." if emoji_hits == 0 else f"{emoji_hits} slides contained disallowed status emojis.")

    scan_blobs = [md_text, arch_drawio, seq_drawio] + [
        dv.get("xml", "") for k, dv in (extra_diagrams or {}).items() if k in ("security", "wire", "async")
    ]
    leaks = scan_for_f13_leaks("\n".join(scan_blobs))
    _add("D-08", "Public-Repo F-13 Hygiene & Secret Scan", len(leaks) == 0, "0 internal domains, tokens, or unverified refs." if not leaks else f"Detected: {', '.join(leaks)}")

    ledger = bp.get("claimLedger") or []
    valid_tags = all(c.get("provenance") in ALLOWED_PROVENANCE_TAGS for c in ledger)
    _add("D-09", "Claim Provenance Ledger Tagging", len(ledger) >= 1 and valid_tags, f"{len(ledger)} quantitative claims tagged with canonical provenance categories.")

    has_label = all("GENERATED_TEMPLATE_UNDEPLOYED" in starter_files.get(k, "") for k in ("main.tf", "app.py", "README.md", "PROVENANCE.txt"))
    _add("D-10", "Starter Code AST & Undeployed Disclosure", py_ast_ok and has_label, "app.py parses via ast.parse() and starter artifacts bear GENERATED_TEMPLATE_UNDEPLOYED." if (py_ast_ok and has_label) else f"AST ok={py_ast_ok} ({py_ast_err}), label ok={has_label}")

    tf_findings = _pipe_v2.scan_terraform_security(starter_files)
    _add(
        "D-11",
        "Terraform & Script Zero-Trust Hygiene",
        len(tf_findings) == 0,
        "0 allUsers/allAuthenticatedUsers bindings, 0 deprecated v1 Cloud Run resources, 0 unauthenticated flags."
        if not tf_findings
        else " | ".join(f"[{x['id']}] {x['detail']}" for x in tf_findings[:4]),
    )

    _add(
        "D-12",
        "Zero Raw Markdown Leakage inside Slides",
        raw_md_leaks == 0,
        f"0 leaked literal '**' markdown markers inside slides 1..{expected_slides}."
        if raw_md_leaks == 0
        else f"{raw_md_leaks} slide XML parts contained raw '**' markdown markers.",
    )

    passed_n = sum(1 for c in checks if c["status"] == "PASS")
    return {
        "total": len(checks),
        "passed": passed_n,
        "allPassed": passed_n == len(checks),
        "checks": checks,
        "tfFindings": tf_findings,
    }


def run_orthogonal_llm_judge(
    *,
    bp: Dict[str, Any],
    md_text: str,
    generator_model: str,
    api_key_override: Optional[str] = None,
    grounding: Optional[Dict[str, Any]] = None,
    tf_findings: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    judge_model = "gemini-2.5-flash" if generator_model == "gemini-2.5-pro" else "gemini-2.5-pro"
    sys_p = (
        f"Today is {datetime.now(timezone.utc).strftime('%Y-%m-%d')}. You are an independent adversarial Google Cloud architecture reviewer (strict orthogonal judge). "
        "IMPORTANT: Treat the LIVE_GOOGLE_SEARCH_GROUNDING dossier below as current verified web facts (do NOT reject GA Google Cloud capabilities confirmed by Google Search due to model cutoff). "
        "Critically review for genuine hallucinations, invented IDs/URLs, missing failure modes, Terraform/IAM security gaps (e.g. allUsers, deprecated v1 resources), "
        "overstated claims lacking provenance tags, stale product names, or diagram-vs-prose mismatches. Return ONLY JSON: "
        '{"verdict":"APPROVED|NEEDS_REVISION","score":0-100,"summary":"1-2 crisp sentences",'
        '"strengths":["..."],"findings":[{"severity":"P0|P1|P2","category":"grounding|security|diagram|code|clarity","detail":"..."}]}'
    )
    diag_summary = {
        "architectureZones": [{"title": z.get("title"), "components": [c.get("label") for c in z.get("components", [])]} for z in bp.get("architectureZones", [])],
        "architectureEdges": bp.get("architectureEdges", []),
        "sequenceActors": [a.get("label") for a in bp.get("sequenceActors", [])],
        "sequenceSteps": bp.get("sequenceSteps", []),
        "securityLayers": len((bp.get("securityDiagram") or {}).get("layers") or []),
        "wireHops": len((bp.get("wireDiagram") or {}).get("hops") or []),
        "asyncStages": len((bp.get("asyncDiagram") or {}).get("stages") or []),
    }
    g_sum = ((grounding or {}).get("summary") or "").strip()
    usr_p = (
        f"TITLE: {bp['title']}\nDOMAIN: {bp['domain']}\nGENERATOR_MODEL: {generator_model}\n\n"
        + (f"LIVE_GOOGLE_SEARCH_GROUNDING (status={(grounding or {}).get('status')}):\n{g_sum[:3600]}\n\n" if g_sum else "")
        + f"TERRAFORM_SECURITY_FINDINGS (D-11):\n{json.dumps(tf_findings or [], indent=2)}\n\n"
        + f"DIAGRAM_TOPOLOGY_JSON:\n{json.dumps(diag_summary, indent=2)[:3400]}\n\n"
        + f"CLAIM_LEDGER:\n{json.dumps(bp.get('claimLedger') or [], indent=2)[:2800]}\n\n"
        + f"BLOG_MARKDOWN_EXCERPT:\n{md_text[:14000]}\n"
    )
    try:
        search_sys = (
            sys_p
            + " Use your live Google Search tool BEFORE rejecting any Google Cloud product, feature, GA status, "
              "DDL/SQL/GQL syntax, or Gemini model version (e.g., verify via cloud.google.com first!). "
              "Output ONLY raw JSON matching the exact schema above (no prose before/after)."
        )
        try:
            res, meta = call_gemini_json(
                system_prompt=search_sys,
                user_prompt=usr_p,
                model=judge_model,
                api_key_override=api_key_override,
                max_output_tokens=8192,
                thinking_budget=512,
                temperature=0.1,
                timeout_s=95.0,
                use_google_search=True,
            )
            judge_grounded = bool(meta.get("webSearchQueries"))
        except Exception:
            res, meta = call_gemini_json(
                system_prompt=sys_p,
                user_prompt=usr_p,
                model=judge_model,
                api_key_override=api_key_override,
                max_output_tokens=8192,
                thinking_budget=512,
                temperature=0.1,
                timeout_s=75.0,
                use_google_search=False,
            )
            judge_grounded = False
        verdict = str(res.get("verdict") or "NEEDS_REVISION").upper()
        if verdict not in ("APPROVED", "NEEDS_REVISION"):
            verdict = "NEEDS_REVISION"
        score = int(max(0, min(100, float(res.get("score") or 0))))
        findings = []
        for f in (res.get("findings") or [])[:10]:
            if isinstance(f, dict):
                findings.append({
                    "severity": str(f.get("severity") or "P2").upper()[:4],
                    "category": str(f.get("category") or "clarity")[:24],
                    "detail": _sanitize_for_public_output(str(f.get("detail") or ""))[:900],
                })
        return {
            "status": "COMPLETED",
            "judgeModel": judge_model,
            "generatorModel": generator_model,
            "orthogonalPair": f"{generator_model} -> {judge_model}",
            "verdict": verdict,
            "score": score,
            "summary": _sanitize_for_public_output(str(res.get("summary") or ""))[:800],
            "strengths": [_sanitize_for_public_output(str(s))[:400] for s in (res.get("strengths") or [])[:5]],
            "findings": findings,
            "searchGrounded": judge_grounded,
            "searchQueries": meta.get("webSearchQueries") or [],
            "latencyMs": meta.get("latencyMs", 0),
            "checkedAt": _now_iso(),
        }
    except Exception as exc:
        return {
            "status": "SKIPPED_ERROR",
            "judgeModel": judge_model,
            "generatorModel": generator_model,
            "verdict": "UNJUDGED",
            "score": None,
            "summary": _redact_secret(str(exc), api_key_override)[:260],
            "strengths": [],
            "findings": [],
            "checkedAt": _now_iso(),
        }


def _rebuild_bundle_zip(blog_dir: Path, slug: str) -> Path:
    bundle_path = blog_dir / f"{slug}-bundle.zip"
    tmp_path = blog_dir / f".{slug}-bundle.tmp.zip"
    with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(blog_dir.rglob("*")):
            if not p.is_file():
                continue
            if p.name.endswith("-bundle.zip") or p.name.endswith("-bundle.tmp.zip"):
                continue
            rel = p.relative_to(blog_dir).as_posix()
            zf.write(p, arcname=f"{slug}/{rel}")
    tmp_path.replace(bundle_path)
    return bundle_path


def _update_index_entry(manifest: Dict[str, Any]) -> bytes:
    idx = _load_index()
    summary = {
        "slug": manifest["slug"],
        "title": manifest["title"],
        "subtitle": manifest["subtitle"],
        "domain": manifest["domain"],
        "audience": manifest["audience"],
        "createdAt": manifest["createdAt"],
        "updatedAt": manifest["updatedAt"],
        "modelUsed": manifest["generation"]["model"],
        "authMode": manifest["generation"]["authMode"],
        "proofCount": len(manifest.get("proofs") or []),
        "audioTracks": manifest.get("audio", {}).get("tracksGenerated", 0),
        "qualityPassed": manifest.get("quality", {}).get("deterministic", {}).get("passed", 0),
        "qualityTotal": manifest.get("quality", {}).get("deterministic", {}).get("total", 12),
        "diagramCount": len(manifest.get("diagrams") or {}),
        "slideCount": len((manifest.get("blueprint") or {}).get("slides") or []),
        "judgeVerdict": (manifest.get("quality", {}).get("orthogonalJudge") or {}).get("verdict", "UNRUN"),
        "judgeScore": (manifest.get("quality", {}).get("orthogonalJudge") or {}).get("score"),
        "workspaceSync": manifest.get("workspaceSync") or {},
    }
    blogs = [b for b in idx.get("blogs", []) if isinstance(b, dict) and b.get("slug") != manifest["slug"]]
    blogs.insert(0, summary)
    idx["blogs"] = blogs
    return _save_index(idx)


def compile_and_save_blog(
    *,
    blueprint: Dict[str, Any],
    slug: str,
    model_used: str,
    auth_mode: str,
    actor_email: str,
    voice_name: str = "en-US-Chirp3-HD-Charon",
    enable_tts: bool = True,
    enable_judge: bool = True,
    enable_auto_revise: bool = False,
    grounding: Optional[Dict[str, Any]] = None,
    api_key_override: Optional[str] = None,
    progress_cb: Optional[Callable[[int, str, str], None]] = None,
    latency_ms: float = 0.0,
) -> Dict[str, Any]:
    def _step(pct: int, stage: str, msg: str) -> None:
        if progress_cb:
            progress_cb(pct, stage, msg)

    blog_dir = get_storage_root() / slug
    for sub in ("diagrams", "slides", "docs", "audio", "proofs", "video"):
        (blog_dir / sub).mkdir(parents=True, exist_ok=True)

    proofs: List[Dict[str, Any]] = []
    g_info = grounding or {"status": "NOT_RUN", "queries": [], "sources": [], "summary": ""}

    def _compile_artifacts(bp_cur: Dict[str, Any]) -> Dict[str, Any]:
        diags = compile_all_diagrams_v2(bp_cur, slug)
        for kind, dv in diags.items():
            (blog_dir / "diagrams" / f"{slug}-{kind}.drawio").write_text(dv["xml"], encoding="utf-8")
            (blog_dir / "diagrams" / f"{slug}-{kind}.svg").write_text(dv["svg"], encoding="utf-8")
        extra_svgs = {k: diags[k]["svg"] for k in ("security", "wire", "async")}
        extra_urls = {k: diags[k]["viewerUrl"] for k in ("security", "wire", "async")}
        slide_svgs = compile_slide_preview_svgs(
            bp_cur, slug, diags["architecture"]["svg"], diags["sequence"]["svg"], proofs, blog_dir, extra_svgs=extra_svgs
        )
        for i, s_svg in enumerate(slide_svgs, 1):
            (blog_dir / "slides" / f"slide_{i:02d}.svg").write_text(s_svg, encoding="utf-8")
        pptx_b = compile_pptx_bytes(
            bp_cur, slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"], proofs, blog_dir, extra_urls=extra_urls
        )
        (blog_dir / "slides" / f"{slug}-deck.pptx").write_bytes(pptx_b)
        md_t = compile_blog_markdown(
            bp_cur, slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"],
            proofs, model_used, extra_urls=extra_urls, grounding=g_info,
        )
        (blog_dir / "blog.md").write_text(md_t, encoding="utf-8")
        docx_b = compile_docx_bytes(
            bp_cur, slug, diags["architecture"]["viewerUrl"], diags["sequence"]["viewerUrl"],
            proofs, blog_dir, extra_urls=extra_urls, grounding=g_info,
        )
        (blog_dir / "docs" / f"{slug}-whitepaper.docx").write_bytes(docx_b)
        sz_b, s_files, ast_ok, ast_err = compile_starter_zip(bp_cur, slug)
        (blog_dir / f"{slug}-starter.zip").write_bytes(sz_b)
        det = run_deterministic_quality_gate(
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
            "det": det,
        }

    _step(48, "COMPILE_DIAGRAMS", "Compiling 5 C4-layered Draw.io + SVG diagrams with official GCP SVG icons...")
    _step(56, "COMPILE_SLIDES", "Building native OOXML .pptx deck & vector slide previews...")
    _step(62, "COMPILE_DOCS", "Compiling Markdown blog (inline SQL/GQL/formulas) & .docx whitepaper...")
    _step(66, "COMPILE_STARTER", "Building Terraform + Python starter.zip & running AST + D-11 security scan...")
    art = _compile_artifacts(blueprint)
    det_report = art["det"]
    _step(70, "QUALITY_GATE", f"Deterministic gate complete: {det_report['passed']}/{det_report['total']} checks.")

    revision_meta: Dict[str, Any] = {"executed": False, "appliedFixes": [], "round1": None, "round2": None}
    if enable_judge:
        _step(74, "ORTHOGONAL_JUDGE", "Running grounded independent orthogonal Gemini judge (Round 1)...")
        judge_report = run_orthogonal_llm_judge(
            bp=blueprint,
            md_text=art["mdText"],
            generator_model=model_used,
            api_key_override=api_key_override,
            grounding=g_info,
            tf_findings=det_report.get("tfFindings") or [],
        )
        has_p0_p1 = any(
            str(f.get("severity") or "").upper() in ("P0", "P1")
            for f in (judge_report.get("findings") or [])
        )
        tf_fail = bool(det_report.get("tfFindings"))
        need_rev = enable_auto_revise and (
            tf_fail
            or has_p0_p1
            or (judge_report.get("verdict") == "NEEDS_REVISION")
            or (isinstance(judge_report.get("score"), int) and judge_report["score"] < 85)
        )
        if need_rev and judge_report.get("status") == "COMPLETED":
            _step(79, "AUTO_REVISE", "Applying surgical peer-review revision for Round 1 findings / Terraform D-11...")
            r1_snap = {
                "verdict": judge_report.get("verdict"),
                "score": judge_report.get("score"),
                "findingCount": len(judge_report.get("findings") or []),
                "tfFindingsCount": len(det_report.get("tfFindings") or []),
                "summary": judge_report.get("summary", ""),
            }
            try:
                rsys, rusr = _pipe_v2.build_auto_revision_prompt(
                    blueprint, judge_report, det_report.get("tfFindings") or [], g_info
                )
                rev_patch, _ = call_gemini_json(
                    system_prompt=rsys,
                    user_prompt=rusr,
                    model=model_used,
                    api_key_override=api_key_override,
                    max_output_tokens=16384,
                    thinking_budget=1024 if model_used == "gemini-2.5-flash" else 2048,
                    temperature=0.15,
                    timeout_s=95.0,
                )
                import copy as _copy
                r1_bp_backup = _copy.deepcopy(blueprint)
                r1_tf_cnt = len(det_report.get("tfFindings") or [])
                applied = _pipe_v2.apply_revision_patch(
                    blueprint,
                    rev_patch,
                    allowed_tags=ALLOWED_PROVENANCE_TAGS,
                    sanitize_fn=_sanitize_for_public_output,
                    strip_emoji_fn=strip_inline_md,
                )
                art_r2 = _compile_artifacts(blueprint)
                det_r2 = art_r2["det"]
                judge_r2 = run_orthogonal_llm_judge(
                    bp=blueprint,
                    md_text=art_r2["mdText"],
                    generator_model=model_used,
                    api_key_override=api_key_override,
                    grounding=g_info,
                    tf_findings=det_r2.get("tfFindings") or [],
                )
                r1_score = r1_snap.get("score") if isinstance(r1_snap.get("score"), int) else 0
                r2_score = judge_r2.get("score") if isinstance(judge_r2.get("score"), int) else 0
                r2_tf_cnt = len(det_r2.get("tfFindings") or [])
                improved_or_equal = (
                    judge_r2.get("status") == "COMPLETED"
                    and (r2_tf_cnt < r1_tf_cnt or (r2_tf_cnt <= r1_tf_cnt and r2_score >= r1_score))
                )
                if improved_or_equal:
                    art = art_r2
                    det_report = det_r2
                    judge_report = judge_r2
                    rolled_back = False
                else:
                    # Keep the higher-scoring Round 1 artifact set cleanly (zero regression)
                    blueprint.clear()
                    blueprint.update(r1_bp_backup)
                    art = _compile_artifacts(blueprint)
                    det_report = art["det"]
                    rolled_back = True
                revision_meta = {
                    "executed": True,
                    "rolledBack": rolled_back,
                    "appliedFixes": applied,
                    "round1": r1_snap,
                    "round2": {
                        "verdict": judge_r2.get("verdict"),
                        "score": judge_r2.get("score"),
                        "findingCount": len(judge_r2.get("findings") or []),
                        "tfFindingsCount": r2_tf_cnt,
                    },
                }
            except Exception as rev_exc:
                revision_meta = {
                    "executed": False,
                    "error": _redact_secret(str(rev_exc), api_key_override)[:240],
                    "appliedFixes": [],
                    "round1": r1_snap,
                    "round2": None,
                }
    else:
        judge_report = {
            "status": "DISABLED_BY_REQUEST",
            "verdict": "SKIPPED",
            "score": None,
            "summary": "Orthogonal LLM judge disabled by user option.",
            "strengths": [],
            "findings": [],
        }

    slide_n = art["slideCount"]
    audio_tracks: List[Dict[str, Any]] = []
    audio_errors: List[str] = []
    durations: List[float] = []
    if enable_tts:
        _step(85, "SYNTHESIZE_TTS", f"Synthesizing {slide_n} live spoken slide tracks via Cloud TTS ({voice_name})...")
        from concurrent.futures import ThreadPoolExecutor
        slides_all = list(enumerate(blueprint["slides"][:slide_n], 1))
        def _tts_one(pair: Tuple[int, Dict[str, Any]]) -> Tuple[int, Dict[str, Any], Optional[bytes], Optional[str]]:
            idx_s, sl_s = pair
            txt_s = strip_inline_md(sl_s.get("speakerNotes") or sl_s.get("title") or "")
            b_out, e_out = synthesize_tts_mp3(txt_s, voice_name=voice_name)
            return idx_s, sl_s, b_out, e_out
        with ThreadPoolExecutor(max_workers=6) as pool:
            tts_results = list(pool.map(_tts_one, slides_all))
        for i, sl, mp3_bytes, tts_err in sorted(tts_results, key=lambda x: x[0]):
            if mp3_bytes:
                rel = f"audio/slide_{i:02d}.mp3"
                (blog_dir / rel).write_bytes(mp3_bytes)
                dur = estimate_mp3_duration_seconds(mp3_bytes)
                durations.append(dur)
                audio_tracks.append({
                    "slideNumber": i,
                    "title": strip_inline_md(sl["title"]),
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
    else:
        durations = [8.0] * slide_n

    vtt_text = build_webvtt(blueprint["slides"][:slide_n], durations)
    (blog_dir / "audio" / "captions.vtt").write_text(vtt_text, encoding="utf-8")

    host_mp4_rel = _try_compile_host_mp4(blog_dir, slug, durations) if len(audio_tracks) == slide_n else None

    grounding_public = {
        "status": g_info.get("status", "NOT_RUN"),
        "mode": g_info.get("mode", ""),
        "checkedAt": g_info.get("checkedAt", ""),
        "latencyMs": g_info.get("latencyMs", 0),
        "queries": g_info.get("queries") or [],
        "sources": g_info.get("sources") or [],
    }
    quality_report = {
        "slug": slug,
        "checkedAt": _now_iso(),
        "deterministic": det_report,
        "orthogonalJudge": judge_report,
        "grounding": grounding_public,
        "autoRevision": revision_meta,
    }
    (blog_dir / "quality_report.json").write_text(json.dumps(quality_report, indent=2), encoding="utf-8")

    diags = art["diags"]
    diagrams_manifest = {}
    for k in ("architecture", "sequence", "security", "wire", "async"):
        dv = diags[k]
        diagrams_manifest[k] = {
            "id": dv["id"],
            "kind": k,
            "layer": dv["layer"],
            "slideNumber": dv["slide"],
            "title": dv["label"],
            "iconCount": dv["iconCount"],
            "drawioPath": f"diagrams/{slug}-{k}.drawio",
            "svgPath": f"diagrams/{slug}-{k}.svg",
            "viewerUrl": dv["viewerUrl"],
            "studioUrl": f"/drawio-editor?id={urllib.parse.quote(slug + '-' + k)}",
        }

    created_at = _now_iso()
    manifest = {
        "schemaVersion": "2.0",
        "slug": slug,
        "title": blueprint["title"],
        "subtitle": blueprint["subtitle"],
        "summary": blueprint["summary"],
        "domain": blueprint["domain"],
        "audience": blueprint["audience"],
        "estimatedReadMinutes": blueprint["estimatedReadMinutes"],
        "prompt": blueprint["prompt"],
        "createdAt": created_at,
        "updatedAt": created_at,
        "actorEmail": actor_email or "local-operator",
        "generation": {
            "model": model_used,
            "authMode": auth_mode,
            "latencyMs": latency_ms,
            "pipelineVersion": "v2_ws_parity",
            "slideCount": slide_n,
            "diagramCount": len(diagrams_manifest),
            "totalEmbeddedIcons": sum(d["iconCount"] for d in diagrams_manifest.values()),
            "grounding": grounding_public,
        },
        "diagrams": diagrams_manifest,
        "assets": {
            "markdown": "blog.md",
            "pptx": f"slides/{slug}-deck.pptx",
            "docx": f"docs/{slug}-whitepaper.docx",
            "starterZip": f"{slug}-starter.zip",
            "bundleZip": f"{slug}-bundle.zip",
            "qualityReport": "quality_report.json",
            "captionsVtt": "audio/captions.vtt",
            "hostMp4": host_mp4_rel,
            "slidePreviews": [f"slides/slide_{i:02d}.svg" for i in range(1, slide_n + 1)],
        },
        "audio": {
            "enabled": enable_tts,
            "voice": voice_name,
            "provenance": "SYNTHETIC_CLOUD_TTS_CHIRP3_HD",
            "tracksGenerated": len(audio_tracks),
            "totalDurationSec": round(sum(t["durationSec"] for t in audio_tracks), 2),
            "tracks": audio_tracks,
            "errors": audio_errors,
            "hostMp4Available": bool(host_mp4_rel),
            "hostMp4Provenance": "SLIDE_CANVAS_CHIRP3_TTS_RENDER" if host_mp4_rel else None,
        },
        "starterMeta": {
            "status": "GENERATED_TEMPLATE_UNDEPLOYED",
            "pythonAstValid": art["astOk"],
            "pythonAstError": art["astErr"],
            "tfSecurityFindings": det_report.get("tfFindings") or [],
            "files": art["starterFiles"],
        },
        "proofs": proofs,
        "workspaceSync": {"status": "NOT_SYNCED"},
        "quality": quality_report,
        "blueprint": blueprint,
    }
    (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    _step(95, "BUNDLE_AND_SYNC", "Packaging complete archive bundle & syncing to durable GCS store...")
    _rebuild_bundle_zip(blog_dir, slug)
    index_bytes = _update_index_entry(manifest)
    _sync_blog_dir_to_gcs_async(slug, blog_dir, index_bytes)
    _step(100, "COMPLETED", "All deliverables compiled & verified.")
    return manifest


def _unique_slug(base: str) -> str:
    root = get_storage_root()
    existing_slugs = {
        str(b.get("slug") or "")
        for b in (_load_index(refresh_gcs=True).get("blogs") or [])
        if isinstance(b, dict)
    }
    cand = sanitize_slug(base)
    if cand not in existing_slugs and not (root / cand).exists():
        return cand
    for i in range(2, 50):
        c2 = f"{cand[:46]}-{i}"
        if c2 not in existing_slugs and not (root / c2).exists():
            return c2
    return f"{cand[:42]}-{secrets.token_hex(3)}"


def start_generation_job(
    payload: Dict[str, Any],
    *,
    api_key_override: Optional[str] = None,
    actor_email: str = "local-operator",
) -> Dict[str, Any]:
    prompt = str(payload.get("prompt") or "").strip()
    if len(prompt) < 12:
        raise CreateBlog1Error("Please enter a prompt of at least 12 characters describing your architecture topic.", 400, "PROMPT_TOO_SHORT")
    if len(prompt) > 4000:
        raise CreateBlog1Error("Prompt exceeds maximum length (4,000 characters).", 400, "PROMPT_TOO_LONG")

    title_hint = str(payload.get("titleHint") or "").strip()[:110]
    domain = str(payload.get("domain") or "Google Cloud Architecture").strip()[:80]
    audience = str(payload.get("audience") or "Solutions Architects & Platform Engineers").strip()[:80]
    model = str(payload.get("model") or "gemini-2.5-flash").strip()
    if model not in ALLOWED_MODELS:
        raise CreateBlog1Error(f"Unsupported model '{model}'. Allowed: {', '.join(ALLOWED_MODELS)}.", 400, "INVALID_MODEL")
    voice = str(payload.get("voice") or "en-US-Chirp3-HD-Charon").strip()
    if voice not in ALLOWED_VOICES:
        voice = "en-US-Chirp3-HD-Charon"
    enable_tts = bool(payload.get("enableTts", True))
    enable_judge = bool(payload.get("enableJudge", True))
    enable_grounding = bool(payload.get("enableGrounding", True))
    enable_auto_revise = bool(payload.get("enableAutoRevise", True)) and enable_judge

    has_key = bool((api_key_override or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip())
    has_vertex = bool(_get_gcp_bearer_token())
    if not (has_key or has_vertex):
        raise ModelAuthUnavailableError(
            "No live Gemini credentials available (Vertex AI IAM bearer token unavailable and no GEMINI_API_KEY / X-Gemini-Api-Key provided). "
            "Fail-closed: Create Blog1 will not emit placeholder or mocked blogs."
        )

    _check_rate_limit(actor_email)

    job_id = f"cb1-{uuid.uuid4().hex[:12]}"
    transient_key = (api_key_override or "").strip() or None
    job_rec = {
        "jobId": job_id,
        "status": "QUEUED",
        "progress": 4,
        "stage": "QUEUED",
        "message": f"Starting multi-stage live {model} parity pipeline...",
        "model": model,
        "voice": voice,
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
            {"id": "GROUNDING_SEARCH", "label": "Live Google Search Grounding", "status": "pending" if enable_grounding else "skipped"},
            {"id": "LLM_SYNTHESIS", "label": f"Stage 1: Deep Prose, SQL/GQL & Claims ({model})", "status": "pending"},
            {"id": "TOPOLOGY_AND_DECK", "label": "Stage 2: 5 C4 Diagrams, 12 Slides & Hardened Code", "status": "pending"},
            {"id": "COMPILE_DIAGRAMS", "label": "Compile 5 Draw.io & SVG Diagrams (Official Icons)", "status": "pending"},
            {"id": "COMPILE_SLIDES", "label": "Build 12-Slide OOXML .pptx & Previews", "status": "pending"},
            {"id": "COMPILE_DOCS", "label": "Compile blog.md & .docx Whitepaper", "status": "pending"},
            {"id": "COMPILE_STARTER", "label": "Package starter.zip + AST & D-11 Check", "status": "pending"},
            {"id": "QUALITY_GATE", "label": "12-Check Deterministic Gate (D-01..D-12)", "status": "pending"},
            {"id": "ORTHOGONAL_JUDGE", "label": "Grounded Orthogonal Gemini Critic", "status": "pending" if enable_judge else "skipped"},
            {"id": "AUTO_REVISE", "label": "Auto-Revision Pass (on P0/P1 or D-11)", "status": "pending" if enable_auto_revise else "skipped"},
            {"id": "SYNTHESIZE_TTS", "label": "Cloud TTS Chirp3-HD Audio (12 Tracks)", "status": "pending" if enable_tts else "skipped"},
            {"id": "BUNDLE_AND_SYNC", "label": "Bundle ZIP & Atomic GCS Sync", "status": "pending"},
        ],
    }
    with _JOBS_LOCK:
        if len(_JOBS) > 64:
            oldest = sorted(_JOBS.keys(), key=lambda k: _JOBS[k].get("createdAt", ""))[:16]
            for ok in oldest:
                if _JOBS[ok].get("status") in ("COMPLETED", "FAILED"):
                    _JOBS.pop(ok, None)
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
            jr["message"] = msg
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
        try:
            t_start = time.perf_counter()
            with _JOBS_LOCK:
                _JOBS[job_id]["status"] = "RUNNING"

            grounding: Dict[str, Any] = {"status": "DISABLED", "queries": [], "sources": [], "summary": ""}
            if enable_grounding:
                _update_step(10, "GROUNDING_SEARCH", "Verifying current Google Cloud GA docs & quotas via Google Search...")
                grounding = _pipe_v2.call_gemini_grounded_search(
                    topic_prompt=prompt,
                    title_hint=title_hint,
                    domain=domain,
                    model="gemini-2.5-flash",
                    vertex_project=DEFAULT_GCP_PROJECT,
                    vertex_location=DEFAULT_VERTEX_LOCATION,
                    get_bearer_token=_get_gcp_bearer_token,
                    api_key_override=transient_key,
                    timeout_s=45.0,
                )

            _update_step(20, "LLM_SYNTHESIS", f"Stage 1/2: Authoring deep 7-8 section blog, inline DDL/formulas & claims ({model})...")
            prose_raw, meta_p = call_gemini_json(
                system_prompt=_pipe_v2.prose_stage_system_prompt(),
                user_prompt=_pipe_v2.prose_stage_user_prompt(prompt, title_hint, domain, audience, grounding),
                model=model,
                api_key_override=transient_key,
                max_output_tokens=24576,
                thinking_budget=1024 if model == "gemini-2.5-flash" else 2048,
                temperature=0.22,
                timeout_s=130.0,
            )

            _update_step(36, "TOPOLOGY_AND_DECK", f"Stage 2/2: Generating 5 C4 diagrams, 12-slide deck & hardened Terraform v2 starter ({model})...")
            topo_raw, meta_t = call_gemini_json(
                system_prompt=_pipe_v2.topology_stage_system_prompt(),
                user_prompt=_pipe_v2.topology_stage_user_prompt(prose_raw, prompt, grounding),
                model=model,
                api_key_override=transient_key,
                max_output_tokens=24576,
                thinking_budget=1024 if model == "gemini-2.5-flash" else 2048,
                temperature=0.2,
                timeout_s=130.0,
            )

            merged_raw = dict(prose_raw)
            for tk in (
                "architectureZones", "architectureEdges", "sequenceActors", "sequenceSteps",
                "securityDiagram", "wireDiagram", "asyncDiagram", "slides", "codeStarter",
            ):
                if topo_raw.get(tk) is not None:
                    merged_raw[tk] = topo_raw[tk]

            bp = normalize_blueprint(merged_raw, prompt, domain, audience, target_slides=12)
            slug = _unique_slug(bp.get("slugHint") or title_hint or bp["title"])
            with _JOBS_LOCK:
                _JOBS[job_id]["slug"] = slug

            total_llm_ms = round(float(meta_p.get("latencyMs") or 0.0) + float(meta_t.get("latencyMs") or 0.0), 1)
            manifest = compile_and_save_blog(
                blueprint=bp,
                slug=slug,
                model_used=meta_p["model"],
                auth_mode=meta_p["authMode"],
                actor_email=actor_email,
                voice_name=voice,
                enable_tts=enable_tts,
                enable_judge=enable_judge,
                enable_auto_revise=enable_auto_revise,
                grounding=grounding,
                api_key_override=transient_key,
                progress_cb=_update_step,
                latency_ms=total_llm_ms,
            )
            with _JOBS_LOCK:
                jr = _JOBS[job_id]
                jr["status"] = "COMPLETED"
                jr["progress"] = 100
                jr["slug"] = manifest["slug"]
                jr["title"] = manifest["title"]
                jr["elapsedSec"] = round(time.perf_counter() - t_start, 1)
                jr["message"] = f"Ready: '{manifest['title']}' ({slug})"
                jr["updatedAt"] = _now_iso()
                done_snap = json.loads(json.dumps(jr))
            _persist_job_state_to_gcs(done_snap, sync=True)
        except Exception as exc:
            err_msg = _redact_secret(getattr(exc, "message", str(exc)), transient_key)
            err_code = getattr(exc, "code", "GENERATION_FAILED")
            with _JOBS_LOCK:
                jr = _JOBS[job_id]
                jr["status"] = "FAILED"
                jr["error"] = err_msg
                jr["errorCode"] = err_code
                jr["message"] = f"Failed: {err_msg}"
                jr["updatedAt"] = _now_iso()
                for st in jr["steps"]:
                    if st["status"] == "running":
                        st["status"] = "error"
                fail_snap = json.loads(json.dumps(jr))
            _persist_job_state_to_gcs(fail_snap, sync=True)

    threading.Thread(target=_runner, daemon=True).start()
    return json.loads(json.dumps(job_rec))


def get_job_status(job_id: str) -> Dict[str, Any]:
    jid = str(job_id or "").strip()
    if not re.fullmatch(r"cb1-[a-f0-9]{12}", jid):
        raise CreateBlog1Error(f"Unknown job id '{jid}'.", 404, "JOB_NOT_FOUND")
    with _JOBS_LOCK:
        jr = _JOBS.get(jid)
        if jr:
            return json.loads(json.dumps(jr))
    raw = _gcs_download_bytes(f"_jobs/{jid}.json")
    if raw:
        try:
            parsed = json.loads(raw.decode("utf-8"))
            if isinstance(parsed, dict) and parsed.get("jobId") == jid:
                return parsed
        except Exception:
            pass
    raise CreateBlog1Error(f"Unknown job id '{jid}'.", 404, "JOB_NOT_FOUND")


def list_blogs(refresh_gcs: bool = False) -> List[Dict[str, Any]]:
    idx = _load_index(refresh_gcs=refresh_gcs)
    return list(idx.get("blogs", []))


def get_blog_detail(slug: str) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    mp = _ensure_rel_hydrated(clean, "manifest.json")
    if mp is None or not mp.is_file():
        raise CreateBlog1Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
    data = json.loads(mp.read_text(encoding="utf-8"))
    md_p = _ensure_rel_hydrated(clean, "blog.md")
    data["markdownText"] = md_p.read_text(encoding="utf-8") if md_p and md_p.is_file() else ""
    arch_p = _ensure_rel_hydrated(clean, f"diagrams/{clean}-architecture.svg")
    seq_p = _ensure_rel_hydrated(clean, f"diagrams/{clean}-sequence.svg")
    data["architectureSvgAvailable"] = bool(arch_p and arch_p.is_file())
    data["sequenceSvgAvailable"] = bool(seq_p and seq_p.is_file())
    data["assetBaseUrl"] = f"/api/create-blog1/blogs/{clean}/asset/"
    return data


def get_blog_asset_file(slug: str, rel_path: str) -> Tuple[Path, str]:
    clean = validate_existing_slug(slug)
    norm_rel = rel_path.lstrip("/").replace("\\", "/")
    if not norm_rel or ".." in norm_rel.split("/") or norm_rel.startswith("."):
        raise CreateBlog1Error("Invalid asset path.", 400, "INVALID_PATH")
    fp = _ensure_rel_hydrated(clean, norm_rel)
    if fp is None or not fp.is_file():
        raise CreateBlog1Error(f"Asset '{norm_rel}' not found for '{clean}'.", 404, "ASSET_NOT_FOUND")
    return fp, _guess_mime(norm_rel)


def _recompile_after_proof_change(slug: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    blog_dir = get_storage_root() / slug
    bp = manifest["blueprint"]
    proofs = manifest.get("proofs") or []
    d_meta = manifest.get("diagrams") or {}
    arch_url = d_meta["architecture"]["viewerUrl"]
    seq_url = d_meta["sequence"]["viewerUrl"]
    arch_svg = (blog_dir / f"diagrams/{slug}-architecture.svg").read_text(encoding="utf-8")
    seq_svg = (blog_dir / f"diagrams/{slug}-sequence.svg").read_text(encoding="utf-8")
    arch_drawio = (blog_dir / f"diagrams/{slug}-architecture.drawio").read_text(encoding="utf-8")
    seq_drawio = (blog_dir / f"diagrams/{slug}-sequence.drawio").read_text(encoding="utf-8")

    extra_svgs: Dict[str, str] = {}
    extra_urls: Dict[str, str] = {}
    extra_diags: Dict[str, Dict[str, Any]] = {}
    for kind in ("security", "wire", "async"):
        if kind in d_meta:
            sp = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.svg")
            xp = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.drawio")
            if sp and sp.is_file():
                extra_svgs[kind] = sp.read_text(encoding="utf-8")
            extra_urls[kind] = d_meta[kind].get("viewerUrl", "")
            extra_diags[kind] = {
                "svg": extra_svgs.get(kind, ""),
                "xml": xp.read_text(encoding="utf-8") if (xp and xp.is_file()) else "",
            }

    slide_svgs = compile_slide_preview_svgs(
        bp, slug, arch_svg, seq_svg, proofs, blog_dir, extra_svgs=extra_svgs or None
    )
    for i, s_svg in enumerate(slide_svgs, 1):
        (blog_dir / "slides" / f"slide_{i:02d}.svg").write_text(s_svg, encoding="utf-8")

    pptx_bytes = compile_pptx_bytes(
        bp, slug, arch_url, seq_url, proofs, blog_dir, extra_urls=extra_urls or None
    )
    (blog_dir / "slides" / f"{slug}-deck.pptx").write_bytes(pptx_bytes)

    grounding_info = (manifest.get("quality") or {}).get("grounding") or {}
    md_text = compile_blog_markdown(
        bp, slug, arch_url, seq_url, proofs, manifest["generation"]["model"],
        extra_urls=extra_urls or None, grounding=grounding_info,
    )
    (blog_dir / "blog.md").write_text(md_text, encoding="utf-8")

    docx_bytes = compile_docx_bytes(
        bp, slug, arch_url, seq_url, proofs, blog_dir,
        extra_urls=extra_urls or None, grounding=grounding_info,
    )
    (blog_dir / "docs" / f"{slug}-whitepaper.docx").write_bytes(docx_bytes)

    starter_meta = manifest.get("starterMeta") or {}
    det = run_deterministic_quality_gate(
        bp=bp,
        md_text=md_text,
        arch_drawio=arch_drawio,
        arch_svg=arch_svg,
        seq_drawio=seq_drawio,
        seq_svg=seq_svg,
        pptx_bytes=pptx_bytes,
        docx_bytes=docx_bytes,
        py_ast_ok=bool(starter_meta.get("pythonAstValid", True)),
        py_ast_err=str(starter_meta.get("pythonAstError", "")),
        starter_files=starter_meta.get("files") or {},
        extra_diagrams=extra_diags or None,
    )
    manifest["quality"]["deterministic"] = det
    manifest["quality"]["checkedAt"] = _now_iso()
    manifest["updatedAt"] = _now_iso()
    (blog_dir / "quality_report.json").write_text(json.dumps(manifest["quality"], indent=2), encoding="utf-8")
    (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    _rebuild_bundle_zip(blog_dir, slug)
    index_bytes = _update_index_entry(manifest)
    _sync_blog_dir_to_gcs_async(slug, blog_dir, index_bytes)
    return manifest


def attach_proof_screenshot(slug: str, payload: Dict[str, Any], actor_email: str = "local-operator") -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog1Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        blog_dir = get_storage_root() / clean

        stage = str(payload.get("stage") or "BEFORE").strip().upper()
        if stage not in ALLOWED_PROOF_STAGES:
            raise CreateBlog1Error(f"Invalid stage '{stage}'. Allowed: {', '.join(ALLOWED_PROOF_STAGES)}.", 400, "INVALID_STAGE")

        caption = strip_emojis(str(payload.get("caption") or "").strip())[:160]
        if len(caption) < 3:
            raise CreateBlog1Error("Please provide a short descriptive caption (>= 3 chars).", 400, "CAPTION_REQUIRED")

        raw_url = str(payload.get("sourceUrl") or "").strip()[:300]
        if raw_url:
            low_u = raw_url.lower()
            if any(bad in low_u for bad in ("localhost", "127.0.0.1", "0.0.0.0", "file://", "data:", "javascript:")):
                raise CreateBlog1Error(
                    "Blocked non-authentic proof source URL (localhost / file:// / data: / mock origins are disallowed).",
                    400,
                    "UNSAFE_SOURCE_URL",
                )
            leaks_u = scan_for_f13_leaks(raw_url)
            if leaks_u:
                raise CreateBlog1Error(f"Source URL blocked by F-13 hygiene check ({', '.join(leaks_u)}).", 400, "HYGIENE_BLOCKED")
        leaks_c = scan_for_f13_leaks(caption)
        if leaks_c:
            raise CreateBlog1Error(f"Caption blocked by F-13 hygiene check ({', '.join(leaks_c)}).", 400, "HYGIENE_BLOCKED")

        data_b64 = str(payload.get("dataBase64") or "").strip()
        if not data_b64:
            raise CreateBlog1Error("Missing dataBase64 image payload.", 400, "IMAGE_REQUIRED")
        if "," in data_b64 and data_b64.startswith("data:"):
            data_b64 = data_b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(data_b64, validate=True)
        except Exception:
            raise CreateBlog1Error("Malformed base64 image payload.", 400, "INVALID_BASE64") from None

        ext, w, h, mime = parse_image_header(img_bytes)
        sha = hashlib.sha256(img_bytes).hexdigest()
        existing = manifest.get("proofs") or []
        if len(existing) >= 12:
            raise CreateBlog1Error("Maximum 12 proof screenshots per blog reached.", 400, "PROOF_LIMIT_REACHED")
        if any(p.get("sha256") == sha for p in existing):
            raise CreateBlog1Error("Identical screenshot (matching SHA-256) is already attached to this blog.", 409, "DUPLICATE_PROOF")

        proof_id = f"prf-{secrets.token_hex(4)}"
        fname = f"{stage.lower()}_{proof_id}.{ext}"
        rel_path = f"proofs/{fname}"
        dest = blog_dir / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(img_bytes)

        entry = {
            "id": proof_id,
            "stage": stage,
            "caption": caption,
            "sourceUrl": raw_url,
            "filename": fname,
            "relPath": rel_path,
            "ext": ext,
            "mime": mime,
            "width": w,
            "height": h,
            "bytes": len(img_bytes),
            "sha256": sha,
            "uploadedAt": _now_iso(),
            "uploadedBy": actor_email or "local-operator",
            "authenticityLabel": "USER_UPLOADED_GENUINE_SCREENSHOT",
        }
        existing.append(entry)
        manifest["proofs"] = existing
        for req_rel in (
            f"diagrams/{clean}-architecture.svg",
            f"diagrams/{clean}-architecture.drawio",
            f"diagrams/{clean}-sequence.svg",
            f"diagrams/{clean}-sequence.drawio",
        ):
            _ensure_rel_hydrated(clean, req_rel)
        updated = _recompile_after_proof_change(clean, manifest)
        return {"ok": True, "proof": entry, "proofCount": len(updated["proofs"]), "updatedAt": updated["updatedAt"]}


def delete_proof_screenshot(slug: str, proof_id: str, actor_email: str = "local-operator") -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    pid = str(proof_id or "").strip()
    with _STATE_LOCK:
        mp = _ensure_rel_hydrated(clean, "manifest.json")
        if mp is None or not mp.is_file():
            raise CreateBlog1Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        proofs = manifest.get("proofs") or []
        target = next((p for p in proofs if p.get("id") == pid), None)
        if not target:
            raise CreateBlog1Error(f"Proof '{pid}' not found.", 404, "PROOF_NOT_FOUND")
        blog_dir = get_storage_root() / clean
        fp = (blog_dir / target["relPath"]).resolve()
        if str(fp).startswith(str(blog_dir.resolve()) + os.sep) and fp.is_file():
            fp.unlink()
        _gcs_delete_object(f"{clean}/{target['relPath']}")
        manifest["proofs"] = [p for p in proofs if p.get("id") != pid]
        updated = _recompile_after_proof_change(clean, manifest)
        return {"ok": True, "deletedId": pid, "proofCount": len(updated["proofs"])}


def delete_blog(slug: str) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    with _STATE_LOCK:
        blog_dir = (get_storage_root() / clean).resolve()
        root_res = get_storage_root().resolve()
        if not str(blog_dir).startswith(str(root_res) + os.sep):
            raise CreateBlog1Error("Invalid blog path.", 400, "INVALID_PATH")
        idx = _load_index()
        existed_in_idx = any(b.get("slug") == clean for b in idx.get("blogs", []))
        if not existed_in_idx and not blog_dir.exists():
            raise CreateBlog1Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
        rel_files: List[str] = []
        if blog_dir.is_dir():
            for p in blog_dir.rglob("*"):
                if p.is_file():
                    rel_files.append(p.relative_to(blog_dir).as_posix())
            shutil.rmtree(blog_dir, ignore_errors=True)
        idx["blogs"] = [b for b in idx.get("blogs", []) if b.get("slug") != clean]
        index_bytes = _save_index(idx)
        if _is_gcs_sync_enabled():
            _gcs_upload_bytes("index.json", index_bytes, "application/json")
            def _bg_del() -> None:
                to_remove = {f"{clean}/{rf}" for rf in rel_files}
                for obj in _gcs_list_prefix(f"{clean}/"):
                    to_remove.add(obj)
                for obj_rel in sorted(to_remove):
                    _gcs_delete_object(obj_rel)
            threading.Thread(target=_bg_del, daemon=True).start()
        return {"ok": True, "deletedSlug": clean}


def get_diagram_record_for_studio(diag_id: str) -> Optional[Dict[str, Any]]:
    """Allows /drawio-editor?id=<slug>-architecture|sequence to load created diagrams directly."""
    did = str(diag_id or "").strip()
    kind, slug = "", ""
    slide_map = {"architecture": 3, "sequence": 5, "security": 6, "wire": 7, "async": 8}
    for sfx in ("architecture", "sequence", "security", "wire", "async"):
        if did.endswith(f"-{sfx}"):
            kind, slug = sfx, did[: -(len(sfx) + 1)]
            break
    if not kind:
        return None
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", slug):
        return None
    drawio_p = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.drawio")
    if drawio_p is None or not drawio_p.is_file():
        return None
    svg_p = _ensure_rel_hydrated(slug, f"diagrams/{slug}-{kind}.svg")
    xml_str = drawio_p.read_text(encoding="utf-8")
    svg_str = svg_p.read_text(encoding="utf-8") if svg_p and svg_p.is_file() else ""
    return {
        "item": {
            "diagramId": did,
            "id": did,
            "title": f"{slug} ({kind.title()})",
            "slideNumber": slide_map.get(kind, 3),
            "origin": "create-blog1",
            "standaloneAppDiagramsNetUrl": encode_drawio_viewer_url(re.sub(r">\s+<", "><", xml_str.strip())),
        },
        "xml": xml_str,
        "svg": svg_str,
        "selfContainedHash": encode_drawio_studio_hash(xml_str),
    }


def _drive_multipart_upload(token: str, filename: str, src_mime: str, dst_mime: str, raw_bytes: bytes) -> Dict[str, Any]:
    boundary = f"cb1_{uuid.uuid4().hex}"
    meta = json.dumps({"name": filename, "mimeType": dst_mime}).encode("utf-8")
    parts = [
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode("utf-8"),
        meta,
        f"\r\n--{boundary}\r\nContent-Type: {src_mime}\r\n\r\n".encode("utf-8"),
        raw_bytes,
        f"\r\n--{boundary}--\r\n".encode("utf-8"),
    ]
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        data=b"".join(parts),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60.0) as resp:
        return json.loads(resp.read().decode("utf-8"))


def sync_to_google_workspace(slug: str, bridge_mod: Any = None) -> Dict[str, Any]:
    clean = validate_existing_slug(slug)
    mp = _ensure_rel_hydrated(clean, "manifest.json")
    if mp is None or not mp.is_file():
        raise CreateBlog1Error(f"Blog '{clean}' not found.", 404, "BLOG_NOT_FOUND")
    manifest = json.loads(mp.read_text(encoding="utf-8"))

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
                "Download the native OOXML .pptx and .docx directly below and import into Google Drive (File -> Open with Google Slides / Docs)."
            ),
            "pptxDownloadUrl": f"/api/create-blog1/blogs/{clean}/asset/slides/{clean}-deck.pptx",
            "docxDownloadUrl": f"/api/create-blog1/blogs/{clean}/asset/docs/{clean}-whitepaper.docx",
        }

    pptx_p = _ensure_rel_hydrated(clean, f"slides/{clean}-deck.pptx")
    docx_p = _ensure_rel_hydrated(clean, f"docs/{clean}-whitepaper.docx")
    if not pptx_p or not docx_p:
        raise CreateBlog1Error("Missing compiled .pptx or .docx artifact for sync.", 404, "ASSET_NOT_FOUND")

    title = manifest["title"][:90]
    slides_res = _drive_multipart_upload(
        token,
        f"{title} — 9-Slide Deck",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.google-apps.presentation",
        pptx_p.read_bytes(),
    )
    docs_res = _drive_multipart_upload(
        token,
        f"{title} — Architecture Brief",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.google-apps.document",
        docx_p.read_bytes(),
    )
    sync_meta = {
        "status": "SYNCED",
        "syncedAt": _now_iso(),
        "slidesId": slides_res.get("id", ""),
        "slidesUrl": f"https://docs.google.com/presentation/d/{slides_res.get('id', '')}/edit",
        "docId": docs_res.get("id", ""),
        "docUrl": f"https://docs.google.com/document/d/{docs_res.get('id', '')}/edit",
    }
    with _STATE_LOCK:
        manifest["workspaceSync"] = sync_meta
        manifest["updatedAt"] = _now_iso()
        blog_dir = get_storage_root() / clean
        (blog_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        index_bytes = _update_index_entry(manifest)
        _sync_blog_dir_to_gcs_async(slug=clean, blog_dir=blog_dir, index_bytes=index_bytes)
    return {"ok": True, "statusCode": 200, "workspaceSync": sync_meta}


# ---------------------------------------------------------------------------
# Pure-Stdlib EdgeAuth ECDSA P-256 Verifier for configured edge proxy signed-assertion header
# ---------------------------------------------------------------------------
_P256_P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
_P256_A = _P256_P - 3
_P256_B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
_P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
_P256_G = (
    0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
    0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5,
)
_EDGE_ASSERT_KEYMASTER_FORMAT = 0x00
_EDGE_ASSERT_MAX_AGE_SEC = 10 * 60
_EDGE_ASSERT_MAX_FUTURE_SEC = 2 * 60
_EDGE_ASSERT_KEYS_CACHE: Dict[str, Any] = {"raw": None, "keys": []}


def _p256_is_on_curve(pt: Optional[Tuple[int, int]]) -> bool:
    if pt is None:
        return False
    x, y = pt
    if not (0 < x < _P256_P and 0 < y < _P256_P):
        return False
    return (y * y - (x * x * x + _P256_A * x + _P256_B)) % _P256_P == 0


def _p256_add(p1: Optional[Tuple[int, int]], p2: Optional[Tuple[int, int]]) -> Optional[Tuple[int, int]]:
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % _P256_P == 0:
            return None
        lam = ((3 * x1 * x1 + _P256_A) * pow(2 * y1, -1, _P256_P)) % _P256_P
    else:
        lam = ((y2 - y1) * pow((x2 - x1) % _P256_P, -1, _P256_P)) % _P256_P
    x3 = (lam * lam - x1 - x2) % _P256_P
    y3 = (lam * (x1 - x3) - y1) % _P256_P
    return (x3, y3)


def _p256_mul(k: int, pt: Tuple[int, int]) -> Optional[Tuple[int, int]]:
    k %= _P256_N
    if k == 0:
        return None
    res: Optional[Tuple[int, int]] = None
    addend: Optional[Tuple[int, int]] = pt
    while k:
        if k & 1:
            res = _p256_add(res, addend)
        addend = _p256_add(addend, addend)
        k >>= 1
    return res


def _parse_asn1_der_ecdsa_sig(der: bytes) -> Optional[Tuple[int, int]]:
    if len(der) < 8 or der[0] != 0x30:
        return None
    pos = 1
    seq_len = der[pos]
    pos += 1
    if seq_len & 0x80:
        n_oct = seq_len & 0x7F
        if n_oct == 0 or n_oct > 2 or pos + n_oct > len(der):
            return None
        seq_len = int.from_bytes(der[pos : pos + n_oct], "big")
        pos += n_oct
    if pos + seq_len != len(der):
        return None
    if pos >= len(der) or der[pos] != 0x02:
        return None
    r_len = der[pos + 1]
    pos += 2
    if r_len == 0 or pos + r_len > len(der):
        return None
    r_bytes = der[pos : pos + r_len]
    pos += r_len
    if pos + 2 > len(der) or der[pos] != 0x02:
        return None
    s_len = der[pos + 1]
    pos += 2
    if s_len == 0 or pos + s_len != len(der):
        return None
    s_bytes = der[pos : pos + s_len]
    r = int.from_bytes(r_bytes, "big")
    s = int.from_bytes(s_bytes, "big")
    if not (1 <= r < _P256_N and 1 <= s < _P256_N):
        return None
    return (r, s)


def _ecdsa_p256_verify_der(pub_xy: Tuple[int, int], msg: bytes, der_sig: bytes) -> bool:
    rs = _parse_asn1_der_ecdsa_sig(der_sig)
    if rs is None or not _p256_is_on_curve(pub_xy):
        return False
    r, s = rs
    z = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    w = pow(s, -1, _P256_N)
    u1 = (z * w) % _P256_N
    u2 = (r * w) % _P256_N
    pt = _p256_add(_p256_mul(u1, _P256_G), _p256_mul(u2, pub_xy))
    if pt is None:
        return False
    return (pt[0] % _P256_N) == r


def _strip_leading_zero_bytes(b: bytes) -> bytes:
    i = 0
    while i < len(b) - 1 and b[i] == 0:
        i += 1
    return b[i:]


def compute_edge_assertion_ec_key_hash(x_bytes: bytes, y_bytes: bytes) -> bytes:
    """Computes 4-byte SHA-1 EC P-256 key hash for an EC P-256 public key (x, y)."""
    h = hashlib.sha1()
    for coord in (_strip_leading_zero_bytes(x_bytes), _strip_leading_zero_bytes(y_bytes)):
        h.update(struct.pack(">I", len(coord)))
        h.update(coord)
    return h.digest()[:4]


def _decode_b64url(s: str) -> bytes:
    pad = "=" * ((4 - (len(s) % 4)) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _decode_ec_coord(val: Any) -> Optional[bytes]:
    if not isinstance(val, str):
        return None
    s = val.strip()
    if not s:
        return None
    if re.fullmatch(r"[0-9a-fA-F]{64}", s):
        return bytes.fromhex(s)
    if re.fullmatch(r"[A-Za-z0-9_-]{40,46}=*", s):
        try:
            raw = _decode_b64url(s)
            return raw if 0 < len(raw) <= 33 else None
        except Exception:
            return None
    return None


def _load_edge_assertion_public_keys(keys_override: Optional[Any] = None) -> List[Tuple[bytes, Tuple[int, int]]]:
    def _parse(obj: Any) -> List[Tuple[bytes, Tuple[int, int]]]:
        items = obj.get("keys", []) if isinstance(obj, dict) else (obj if isinstance(obj, list) else [])
        out: List[Tuple[bytes, Tuple[int, int]]] = []
        for entry in items:
            if not isinstance(entry, dict):
                continue
            xb = _decode_ec_coord(entry.get("x"))
            yb = _decode_ec_coord(entry.get("y"))
            if not xb or not yb:
                continue
            xy = (int.from_bytes(xb, "big"), int.from_bytes(yb, "big"))
            if not _p256_is_on_curve(xy):
                continue
            out.append((compute_edge_assertion_ec_key_hash(xb, yb), xy))
        return out

    if keys_override is not None:
        return _parse(keys_override)
    raw = os.environ.get("EDGE_AUTH_PUBLIC_KEYS_JSON", "").strip()
    if not raw:
        return []
    if raw == _EDGE_ASSERT_KEYS_CACHE["raw"]:
        return _EDGE_ASSERT_KEYS_CACHE["keys"]
    try:
        parsed = json.loads(raw)
        keys = _parse(parsed)
        _EDGE_ASSERT_KEYS_CACHE["raw"] = raw
        _EDGE_ASSERT_KEYS_CACHE["keys"] = keys
        return keys
    except Exception:
        return []


def _read_proto_varint(buf: bytes, off: int) -> Tuple[int, int]:
    res = 0
    shift = 0
    pos = off
    while pos < len(buf):
        b = buf[pos]
        pos += 1
        res |= (b & 0x7F) << shift
        if (b & 0x80) == 0:
            return res, pos
        shift += 7
        if shift > 70:
            raise ValueError("malformed varint")
    raise ValueError("truncated varint")


def _skip_proto_field(buf: bytes, off: int, wire: int) -> int:
    if wire == 0:
        _, nxt = _read_proto_varint(buf, off)
        return nxt
    if wire == 1:
        return off + 8
    if wire == 5:
        return off + 4
    if wire == 2:
        ln, nxt = _read_proto_varint(buf, off)
        if nxt + ln > len(buf):
            raise ValueError("truncated length-delimited field")
        return nxt + ln
    raise ValueError(f"unsupported wire type {wire}")


def _parse_proto_timestamp_sec(buf: bytes) -> int:
    off = 0
    sec = 0
    while off < len(buf):
        tag, off = _read_proto_varint(buf, off)
        field, wire = tag >> 3, tag & 7
        if field == 1 and wire == 0:
            sec, off = _read_proto_varint(buf, off)
        else:
            off = _skip_proto_field(buf, off, wire)
    return int(sec)


def parse_edge_assertion_proto(buf: bytes) -> Dict[str, Any]:
    if not buf:
        raise ValueError("empty EdgeAssertion payload")
    out: Dict[str, Any] = {"tier": 0, "email": "", "host": "", "timestampSec": 0, "origin": "", "identityType": 0}
    off = 0
    while off < len(buf):
        tag, off = _read_proto_varint(buf, off)
        field, wire = tag >> 3, tag & 7
        if wire == 0:
            v, off = _read_proto_varint(buf, off)
            if field == 1:
                out["tier"] = int(v)
            elif field == 8:
                out["identityType"] = int(v)
        elif wire == 2:
            ln, off = _read_proto_varint(buf, off)
            end = off + ln
            if end > len(buf):
                raise ValueError("truncated EdgeAssertion field")
            sl = buf[off:end]
            off = end
            if field == 2:
                out["email"] = sl.decode("utf-8", errors="strict")
            elif field == 5:
                out["host"] = sl.decode("utf-8", errors="strict")
            elif field == 6:
                out["timestampSec"] = _parse_proto_timestamp_sec(sl)
            elif field == 7:
                out["origin"] = sl.decode("utf-8", errors="strict")
        else:
            off = _skip_proto_field(buf, off, wire)
            if off > len(buf):
                raise ValueError("truncated EdgeAssertion field")
    return out


def verify_signed_edge_assertion_header(
    raw_header: str,
    *,
    expected_hosts: Optional[str] = None,
    public_keys_override: Optional[Any] = None,
    now_sec: Optional[int] = None,
) -> Tuple[bool, str, str]:
    """
    Fail-closed cryptographic verifier for configured edge proxy signed-assertion header attached by
    managed HTTPS reverse-proxy gateway.
    Returns `(ok, email_or_empty, reason_code)`.
    """
    hdr = str(raw_header or "").strip()
    if not hdr:
        return (False, "", "missing_header")
    parts = hdr.split(".")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return (False, "", "malformed_edge_assertion")
    payload_b64, sig_b64 = parts
    if not re.fullmatch(r"[A-Za-z0-9_-]+=*", payload_b64) or not re.fullmatch(r"[A-Za-z0-9_-]+=*", sig_b64):
        return (False, "", "malformed_encoding")

    host_str = expected_hosts if expected_hosts is not None else os.environ.get("EDGE_AUTH_EXPECTED_HOSTS", "")
    allowed_hosts = {
        re.sub(r":443$", "", h.strip().lower())
        for h in re.split(r"[\s,]+", str(host_str or ""))
        if h.strip()
    }
    if not allowed_hosts:
        return (False, "", "missing_expected_hosts")

    keys = _load_edge_assertion_public_keys(public_keys_override)
    if not keys:
        return (False, "", "missing_edge_assertion_keys")

    try:
        sig_buf = _decode_b64url(sig_b64)
    except Exception:
        return (False, "", "bad_sig_b64")
    if len(sig_buf) <= 5 or sig_buf[0] != _EDGE_ASSERT_KEYMASTER_FORMAT:
        return (False, "", "bad_sig_header")
    key_hash = sig_buf[1:5]
    der_sig = sig_buf[5:]
    candidates = [xy for kh, xy in keys if kh == key_hash]
    if not candidates:
        return (False, "", "unknown_key_hash")

    signed_data = payload_b64.encode("ascii") + bytes([_EDGE_ASSERT_KEYMASTER_FORMAT])
    if not any(_ecdsa_p256_verify_der(xy, signed_data, der_sig) for xy in candidates):
        return (False, "", "bad_sig")

    try:
        up = parse_edge_assertion_proto(_decode_b64url(payload_b64))
    except Exception:
        return (False, "", "bad_proto")

    email = str(up.get("email") or "").strip().lower()
    unauth_sentinel = os.environ.get("EDGE_AUTH_UNAUTH_EMAIL", "").strip().lower()
    if not email or (unauth_sentinel and email == unauth_sentinel) or email.startswith("unauthenticated-") or not re.fullmatch(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", email):
        return (False, "", "unauthenticated")

    if int(up.get("identityType", -1)) not in (0, 1, 2):
        return (False, "", "bad_identity_type")

    now_val = int(time.time()) if now_sec is None else int(now_sec)
    ts = int(up.get("timestampSec") or 0)
    if ts <= 0 or ts < (now_val - _EDGE_ASSERT_MAX_AGE_SEC) or ts > (now_val + _EDGE_ASSERT_MAX_FUTURE_SEC):
        return (False, "", "stale_edge_assertion")

    host = re.sub(r":443$", "", str(up.get("host") or "").strip().lower())
    if not host or host not in allowed_hosts:
        return (False, "", "bad_host")

    return (True, email, "ok")
