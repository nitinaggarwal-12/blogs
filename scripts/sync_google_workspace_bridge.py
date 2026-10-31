#!/usr/bin/env python3
"""
PromptCanvas-Style Google Cloud Viewer & Google Workspace (Slides / Docs / PDF) Bridge.

Provides:
1. Pre-warming and caching of all 6 editable .pptx slide decks as native Google Slides
   presentations (`https://docs.google.com/presentation/d/<id>/edit`) in Google Drive.
2. Pre-warming and on-demand conversion of Workstream & Flagship Markdown blogs (with
   inline high-res architecture diagrams & tables) into native Google Docs documents
   (`https://docs.google.com/document/d/<id>/edit`).
3. Live PDF export (`application/pdf`) via Google Drive API for any deck or document.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import re
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT_DIR / "slides"
MANIFEST_FILE = SLIDES_DIR / "cloud_viewer_manifest.json"

QUOTA_PROJECT = "ramp-portal-dev"
DEFAULT_USER_EMAIL = "nitinagga@google.com"
DEFAULT_OAUTH_CLIENT_ID = "248990048888-hpng38o8veg9k4qnpcmlsoh7dkgvqc6o.apps.googleusercontent.com"

TOKEN_CANDIDATE_PATHS = [
    ROOT_DIR / ".gsheet_oauth_token.json",
    Path.home() / "Documents" / "gantry-pulse" / ".gsheet_oauth_token.json",
]

_TOKEN_CACHE: Dict[str, Any] = {"access_token": None, "expires_at": 0.0}


def get_drive_access_token() -> Optional[str]:
    now = time.time()
    if _TOKEN_CACHE["access_token"] and now < float(_TOKEN_CACHE["expires_at"]):
        return str(_TOKEN_CACHE["access_token"])

    for tf in TOKEN_CANDIDATE_PATHS:
        if tf.is_file():
            try:
                tok_data = json.loads(tf.read_text(encoding="utf-8"))
                if tok_data.get("refresh_token") and tok_data.get("client_id") and tok_data.get("client_secret"):
                    req_body = urllib.parse.urlencode(
                        {
                            "client_id": tok_data["client_id"],
                            "client_secret": tok_data["client_secret"],
                            "refresh_token": tok_data["refresh_token"],
                            "grant_type": "refresh_token",
                        }
                    ).encode("utf-8")
                    req = urllib.request.Request(
                        "https://oauth2.googleapis.com/token", data=req_body, method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        payload = json.loads(resp.read().decode("utf-8"))
                    access_tok = payload.get("access_token")
                    if access_tok:
                        _TOKEN_CACHE["access_token"] = access_tok
                        _TOKEN_CACHE["expires_at"] = now + float(payload.get("expires_in", 3500)) - 120.0
                        return str(access_tok)
            except Exception as exc:
                print(f"[CloudBridge] OAuth token refresh warning ({tf}): {exc}")

    return None


def load_cloud_manifest() -> Dict[str, Any]:
    if MANIFEST_FILE.is_file():
        try:
            return json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "updatedAt": "",
        "accountEmail": DEFAULT_USER_EMAIL,
        "oauthClientId": DEFAULT_OAUTH_CLIENT_ID,
        "slides": {},
        "docs": {},
    }


def save_cloud_manifest(data: Dict[str, Any]) -> None:
    SLIDES_DIR.mkdir(parents=True, exist_ok=True)
    data["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    serialized = json.dumps(data, indent=2)
    MANIFEST_FILE.write_text(serialized, encoding="utf-8")
    for mirror_rel in (
        "../PromptCanvas/public/slides/cloud_viewer_manifest.json",
        "../PromptCanvas/src/data/cloud_viewer_manifest.json",
    ):
        mirror_path = (ROOT_DIR / mirror_rel).resolve()
        if mirror_path.parent.is_dir():
            mirror_path.write_text(serialized, encoding="utf-8")


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


PREFERRED_WORKSTREAM_SLIDES_IDS: Dict[str, str] = {
    "WS1": "12hpWYalbclWRdvSrd9DYZQsZWcA7zYiqWe7SS2vTscQ",
    "WS2": "1tELjvuuFKkt-Z9W3es8CsNITbmAGAp2S7qMiTYEQOGE",
    "WS3": "1PdLfTBPSat-6M-8yOo4MEi5uGChRqyRm7AJLNvei7ZM",
    "WS4": "1p6UOu0JPurkx46lAnXrpvob1R9Cwb-SL8k1vBCwWo-s",
    "WS5": "1Pl3XOh9-eN1AeYcnbvGua8wYWx2EewTzExu_VoO_AqU",
    "ALL": "111n5JgAss6hr1OjdWNrVSGtflqASC4DecN-M5Bh4OBc",
    "DOC-MT-01": "1T2vGGXJe_HD-eq25Hrua2nvndkzIKDyL7DUwUDdtvaU",
    "DOC-MT-02": "1CTQ2EtyaX6JMOok1ra5jW3GEFXPzWZ4L4paIfKpmKOs",
    "DOC-MT-03": "15uqspZ_Sck5yaR5W4sDFPHQ_7GKsf6UQy94oCcKEb3M",
    "DOC-MT-04": "1BBJYWllV606yVoGXfO8OyDCxTMt_oQpYUyszaibWeTY",
    "DOC-MT-05": "1sFabWmeLM2EntoGkwaaidqytF05tX5HPGILhEYcn9sM",
    "DOC-MT-06": "1Zr7Hj_tFGvfL1x_WNTvwmZ6mpZlcNyIIFhIZy6k41ys",
    "DOC-REF-07": "1gHV5hVNCB8phgq_JYQiNfoOGYOt7VFW5MuZOzKd4jLU",
    "DOC-REF-08": "1fHwVkECJFr1HQvkYHYuMOraerpxO-0C6guF8PFHLlTw",
    "DOC-REF-09": "10TpWnWIho8kXmN4866HXz34CI3lKxmh-NWSAd6QYiMM",
}

SECONDARY_WORKSTREAM_SLIDES_IDS: Dict[str, list[str]] = {
    "WS1": [
        "1vfMRea19B2f5W54GLWw038YhJRwjnQaWTZYgdwOPjlw",
        "1zbmx5k6_i4yy2NuMO9d4g8r73_ZOOGuyI1J_DI2nLkA",
    ],
    "WS2": ["1HfjCi035HDOb74CO-P6J6GS7VKHT3zSfuwQx_KH15wc"],
    "WS3": ["1ZkfRhStnXBer8E1xT50hxclg4S3NMhGJDFd2EBlEX38"],
    "WS4": ["1nxRiawJOzhfjlBTmC21SSrrh9CzSUKEj843ZsOF5s1E"],
    "WS5": [
        "1Lcsf1gQRyt8eNgaeLGvq8kuALFrecx82S8dHpBFldwc",
        "18ntSD7plHarlsERB93n8vLUL2ctaoKuNXMoRptK7lmw",
    ],
    "ALL": ["1FyHevA50i5TeseuH33caW31Xr5Wsjjt87xmWvi__rHw"],
    "DOC-MT-01": [
        "1RUkSWKaufU1PgLhI7-ufJ_Y7DPlZeLp8REHoXsHc-cI",
        "1rBHt-al8JDO9UZY6IIJpOdAR76zZQvvoNhPnX-ae9NY",
        "1fp-Q21VVhy3hnqWDHBmZu1GLpLD6ts2ylhFfMR7LXsg",
    ],
    "DOC-REF-07": ["1WBXxlnExatYy_A1S3Lnv-TM1tt6MNq5RTp3JFGQb_u8"],
    "DOC-REF-08": ["1sHSR73_osu8Z6UpklKtsa71Y9Z97JVCt_9g6TFlVUfI"],
    "DOC-REF-09": ["1OPrnB1L0iZhVX3bD05vrnvsEEznsSLccdag6Wq_CEd8"],
}

WORKSTREAM_ALIAS_SLIDES_KEYS: Dict[str, list[tuple[str, str]]] = {
    "WS1": [
        ("BP-78", "slides/ws1-reference-architecture-editable-slides.pptx"),
        ("PLUGIN-GSLIDES-WS1", "slides/ws1-google-slides-design-plugin-editable-slides.pptx"),
    ],
    "WS2": [
        ("BP-78-A", "slides/ws2-pattern-a-pooled-editable-slides.pptx"),
    ],
    "WS3": [
        ("BP-78-B", "slides/ws3-pattern-b-siloed-editable-slides.pptx"),
    ],
    "WS4": [
        ("BP-78-C", "slides/ws4-pattern-c-hybrid-editable-slides.pptx"),
    ],
    "WS5": [
        ("BP-78-E", "slides/ws5-wrap-up-editable-slides.pptx"),
    ],
}

LEGACY_SHARED_WORKSTREAM_SLIDES_IDS = {
    "12hpWYalbclWRdvSrd9DYZQsZWcA7zYiqWe7SS2vTscQ",
    "1tELjvuuFKkt-Z9W3es8CsNITbmAGAp2S7qMiTYEQOGE",
    "1PdLfTBPSat-6M-8yOo4MEi5uGChRqyRm7AJLNvei7ZM",
    "1p6UOu0JPurkx46lAnXrpvob1R9Cwb-SL8k1vBCwWo-s",
    "1Pl3XOh9-eN1AeYcnbvGua8wYWx2EewTzExu_VoO_AqU",
    "111n5JgAss6hr1OjdWNrVSGtflqASC4DecN-M5Bh4OBc",
}


def count_pptx_slides(pptx_path: Path) -> int:
    import zipfile

    with zipfile.ZipFile(pptx_path, "r") as zf:
        return sum(
            1
            for name in zf.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        )


def _upload_or_patch_pptx_bytes(
    pptx_bytes: bytes,
    title: str,
    tok: str,
    preferred_id: Optional[str] = None,
) -> Dict[str, Any]:
    boundary = "----GEAPCloudBridgeBoundary" + uuid.uuid4().hex
    meta_bytes = json.dumps(
        {
            "name": f"{title} — Editable Google Slides",
            "mimeType": "application/vnd.google-apps.presentation",
        }
    ).encode("utf-8")

    body = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode("utf-8")
        + meta_bytes
        + f"\r\n--{boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n".encode(
            "utf-8"
        )
        + pptx_bytes
        + f"\r\n--{boundary}--\r\n".encode("utf-8")
    )

    if preferred_id:
        try:
            headers = {
                "Authorization": f"Bearer {tok}",
                "x-goog-user-project": QUOTA_PROJECT,
                "Content-Type": f"multipart/related; boundary={boundary}",
            }
            patch_req = urllib.request.Request(
                f"https://www.googleapis.com/upload/drive/v3/files/{urllib.parse.quote(preferred_id)}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
                data=body,
                headers=headers,
                method="PATCH",
            )
            with urllib.request.urlopen(patch_req, timeout=90) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"[CloudBridge] In-place PATCH on {preferred_id} fell back to POST: {exc}")

    post_headers = {
        "Authorization": f"Bearer {tok}",
        "x-goog-user-project": QUOTA_PROJECT,
        "Content-Type": f"multipart/related; boundary={boundary}",
    }
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
        data=body,
        headers=post_headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def upload_pptx_to_google_slides(
    pptx_path: Path,
    title: str,
    cache_key: str,
    force: bool = False,
    access_token_override: Optional[str] = None,
) -> Dict[str, Any]:
    manifest = load_cloud_manifest()
    sha = file_sha256(pptx_path)
    slide_count = count_pptx_slides(pptx_path)
    existing = manifest.get("slides", {}).get(cache_key)
    existing_id = existing.get("googleSlidesId") if existing else None
    if cache_key.startswith("DOC-MT-") and existing_id in LEGACY_SHARED_WORKSTREAM_SLIDES_IDS:
        existing_id = None
    preferred_id = PREFERRED_WORKSTREAM_SLIDES_IDS.get(cache_key) or existing_id
    if (
        not force
        and existing
        and existing.get("sha256") == sha
        and existing.get("slideCount") == slide_count
        and existing.get("googleSlidesId") == preferred_id
        and preferred_id is not None
    ):
        for alias_key, alias_pptx_rel in WORKSTREAM_ALIAS_SLIDES_KEYS.get(cache_key, []):
            prev_alias = manifest.get("slides", {}).get(alias_key, {})
            manifest["slides"][alias_key] = {
                **existing,
                "key": alias_key,
                "title": prev_alias.get("title") or title,
                "pptxPath": alias_pptx_rel,
            }
        save_cloud_manifest(manifest)
        return existing

    tok = access_token_override or get_drive_access_token()
    pptx_bytes = pptx_path.read_bytes()
    gdrive_cli = Path("/google/bin/releases/gemini-agents-gdrive/gdrive")
    if tok:
        res = _upload_or_patch_pptx_bytes(pptx_bytes, title, tok, preferred_id=preferred_id)
        for sec_id in SECONDARY_WORKSTREAM_SLIDES_IDS.get(cache_key, []):
            if sec_id != res["id"]:
                try:
                    sec_res = _upload_or_patch_pptx_bytes(pptx_bytes, title, tok, preferred_id=sec_id)
                    print(f"   ✓ [Patched Secondary ID] {cache_key} -> {sec_res.get('id', sec_id)} ({slide_count} slides)")
                except Exception as exc:
                    print(f"   ⚠️ [Secondary Patch Warning] {cache_key} ({sec_id}): {exc}")
        fid = res["id"]
    elif preferred_id and gdrive_cli.is_file():
        import subprocess

        subprocess.run(
            [str(gdrive_cli), "mutate", "update", preferred_id, str(pptx_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        for sec_id in SECONDARY_WORKSTREAM_SLIDES_IDS.get(cache_key, []):
            if sec_id != preferred_id:
                try:
                    subprocess.run(
                        [str(gdrive_cli), "mutate", "update", sec_id, str(pptx_path)],
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                    print(f"   ✓ [Patched Secondary ID via gdrive] {cache_key} -> {sec_id} ({slide_count} slides)")
                except Exception as exc:
                    print(f"   ⚠️ [Secondary gdrive Patch Warning] {cache_key} ({sec_id}): {exc}")
        fid = preferred_id
        res = {"id": fid, "webViewLink": f"https://docs.google.com/presentation/d/{fid}/edit"}
    else:
        raise RuntimeError("No Google Drive OAuth token or gdrive CLI available to sync .pptx to Google Slides.")
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    preserved_webview = (
        existing.get("webViewLink")
        if existing and existing.get("googleSlidesId") == fid and existing.get("webViewLink")
        else res.get("webViewLink", f"https://docs.google.com/presentation/d/{fid}/edit")
    )
    entry = {
        "key": cache_key,
        "title": title,
        "pptxPath": str(pptx_path.relative_to(ROOT_DIR)),
        "sha256": sha,
        "sizeBytes": len(pptx_bytes),
        "slideCount": slide_count,
        "googleSlidesId": fid,
        "googleSlidesEditUrl": f"https://docs.google.com/presentation/d/{fid}/edit?authuser={urllib.parse.quote(DEFAULT_USER_EMAIL)}",
        "googleSlidesPreviewUrl": f"https://docs.google.com/presentation/d/{fid}/preview",
        "googleSlidesEmbedUrl": f"https://docs.google.com/presentation/d/{fid}/embed?start=false&loop=false&delayms=5000",
        "googleSlidesPdfUrl": f"https://docs.google.com/presentation/d/{fid}/export/pdf",
        "webViewLink": preserved_webview,
        "syncedAt": now_iso,
    }
    manifest.setdefault("slides", {})[cache_key] = entry
    for alias_key, alias_pptx_rel in WORKSTREAM_ALIAS_SLIDES_KEYS.get(cache_key, []):
        prev_alias = manifest.get("slides", {}).get(alias_key, {})
        manifest["slides"][alias_key] = {
            **entry,
            "key": alias_key,
            "title": prev_alias.get("title") or title,
            "pptxPath": alias_pptx_rel,
        }
    save_cloud_manifest(manifest)
    return entry


def _compile_markdown_for_native_docs_batch(raw_md: str, fallback_title: str) -> tuple[str, list[Dict[str, Any]]]:
    """Convert Markdown to clean UTF-16-safe text + Google Docs API v1 paragraph/text style requests (0 HTML import)."""
    # Strip internal E2E_FLOW HTML comment appendices (kept on disk, omitted in reader/Docs)
    cleaned = re.sub(r"<!--\s*E2E_FLOW_START\s*-->[\s\S]*?<!--\s*E2E_FLOW_END\s*-->", "", raw_md)
    cleaned = re.sub(r"<!--[\s\S]*?-->", "", cleaned)

    lines_out: list[str] = []
    heading_spans: list[tuple[int, int, str]] = []
    code_spans: list[tuple[int, int]] = []
    utf16_offset = 1  # Google Docs body content starts at UTF-16 index 1

    def u16_len(s: str) -> int:
        return len(s.encode("utf-16-le")) // 2

    in_code = False
    code_start_u16: Optional[int] = None
    seen_title = False

    for raw_line in cleaned.splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                code_start_u16 = utf16_offset
            else:
                in_code = False
                if code_start_u16 is not None and utf16_offset > code_start_u16:
                    code_spans.append((code_start_u16, utf16_offset))
                code_start_u16 = None
            continue

        if in_code:
            line_txt = raw_line + "\n"
            lines_out.append(line_txt)
            utf16_offset += u16_len(line_txt)
            continue

        # Strip markdown image syntax to clean figure reference line
        img_m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if img_m:
            line_txt = f"[Architecture Figure: {img_m.group(1) or img_m.group(2)}]\n"
            lines_out.append(line_txt)
            utf16_offset += u16_len(line_txt)
            continue

        h_m = re.match(r"^(#{1,4})\s+(.*)$", raw_line)
        if h_m:
            hashes, h_body = h_m.group(1), h_m.group(2).strip()
            h_body = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", h_body)
            h_body = h_body.replace("**", "").replace("`", "")
            style_name = "HEADING_3"
            if len(hashes) == 1:
                style_name = "TITLE" if not seen_title else "HEADING_1"
                seen_title = True
            elif len(hashes) == 2:
                style_name = "HEADING_1"
            elif len(hashes) == 3:
                style_name = "HEADING_2"
            line_txt = h_body + "\n"
            start_u16 = utf16_offset
            end_u16 = start_u16 + u16_len(line_txt)
            heading_spans.append((start_u16, end_u16, style_name))
            lines_out.append(line_txt)
            utf16_offset = end_u16
            continue

        # Clean inline links & bold markers for crisp Google Docs prose
        prose = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", raw_line)
        prose = prose.replace("**", "")
        if re.match(r"^\s*[-*]\s+", prose):
            prose = re.sub(r"^\s*[-*]\s+", "• ", prose)
        line_txt = prose + "\n"
        lines_out.append(line_txt)
        utf16_offset += u16_len(line_txt)

    if in_code and code_start_u16 is not None and utf16_offset > code_start_u16:
        code_spans.append((code_start_u16, utf16_offset))

    full_text = "".join(lines_out).strip() + "\n"
    if not full_text.strip():
        full_text = f"{fallback_title}\n"
    max_u16 = 1 + u16_len(full_text)

    style_requests: list[Dict[str, Any]] = []
    # Reset default paragraph style across inserted range first so old heading bleed never persists
    if max_u16 > 2:
        style_requests.append(
            {
                "updateParagraphStyle": {
                    "range": {"startIndex": 1, "endIndex": max_u16 - 1},
                    "paragraphStyle": {"namedStyleType": "NORMAL_TEXT"},
                    "fields": "namedStyleType",
                }
            }
        )
    for s_idx, e_idx, named_style in heading_spans[:220]:
        if e_idx <= max_u16:
            style_requests.append(
                {
                    "updateParagraphStyle": {
                        "range": {"startIndex": s_idx, "endIndex": e_idx},
                        "paragraphStyle": {"namedStyleType": named_style},
                        "fields": "namedStyleType",
                    }
                }
            )
    for c_start, c_end in code_spans[:120]:
        if c_end <= max_u16 and c_end > c_start:
            style_requests.append(
                {
                    "updateTextStyle": {
                        "range": {"startIndex": c_start, "endIndex": c_end},
                        "textStyle": {
                            "weightedFontFamily": {"fontFamily": "Roboto Mono"},
                            "fontSize": {"magnitude": 9, "unit": "PT"},
                        },
                        "fields": "weightedFontFamily,fontSize",
                    }
                }
            )
    return full_text, style_requests


def _sync_markdown_into_existing_google_doc(fid: str, md_path: Path, title: str, tok: str) -> None:
    """Rule 49: Update native Google Doc body in-place via Docs API v1 documents.batchUpdate (0 Drive HTML import)."""
    headers = {
        "Authorization": f"Bearer {tok}",
        "x-goog-user-project": QUOTA_PROJECT,
        "Content-Type": "application/json; charset=UTF-8",
    }
    get_req = urllib.request.Request(
        f"https://docs.googleapis.com/v1/documents/{urllib.parse.quote(fid)}",
        headers={"Authorization": f"Bearer {tok}", "x-goog-user-project": QUOTA_PROJECT},
        method="GET",
    )
    with urllib.request.urlopen(get_req, timeout=45) as resp:
        doc_json = json.loads(resp.read().decode("utf-8"))

    content_elems = doc_json.get("body", {}).get("content", [])
    end_idx = content_elems[-1].get("endIndex", 2) if content_elems else 2

    raw_md = md_path.read_text(encoding="utf-8")
    # Cap giant multi-workstream compendium at ~280k chars for crisp Google Docs rendering
    if len(raw_md) > 280_000:
        raw_md = (
            raw_md[:280_000]
            + "\n\n---\n[Full 596 KB End-to-End Compendium & 14 Blueprints available in docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md on ge-blogs-248990048888.cr.gclb.goog]\n"
        )
    full_text, style_requests = _compile_markdown_for_native_docs_batch(raw_md, title)

    mutation_requests: list[Dict[str, Any]] = []
    if end_idx > 2:
        mutation_requests.append(
            {"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end_idx - 1}}}
        )
    mutation_requests.append({"insertText": {"location": {"index": 1}, "text": full_text}})
    mutation_requests.extend(style_requests)

    batch_body = json.dumps({"requests": mutation_requests}).encode("utf-8")
    batch_req = urllib.request.Request(
        f"https://docs.googleapis.com/v1/documents/{urllib.parse.quote(fid)}:batchUpdate",
        data=batch_body,
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(batch_req, timeout=90) as resp:
        resp.read()

    # Keep Drive file title aligned via metadata-only PATCH (no HTML upload)
    try:
        meta_patch = urllib.request.Request(
            f"https://www.googleapis.com/drive/v3/files/{urllib.parse.quote(fid)}?supportsAllDrives=true&fields=id,name",
            data=json.dumps({"name": f"{title} — Editable Google Docs"}).encode("utf-8"),
            headers=headers,
            method="PATCH",
        )
        with urllib.request.urlopen(meta_patch, timeout=30) as resp:
            resp.read()
    except Exception:
        pass


def upload_md_to_google_docs(
    md_path: Path,
    title: str,
    cache_key: str,
    force: bool = False,
    access_token_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Rule 49: Clone a verified native Google Doc template via drive.files.copy and apply in-place batchUpdate (never Drive HTML import)."""
    manifest = load_cloud_manifest()
    md_bytes = md_path.read_bytes()
    sha = hashlib.sha256(md_bytes).hexdigest()
    existing = manifest.get("docs", {}).get(cache_key)
    if (
        existing
        and existing.get("googleDocsId")
        and not force
        and existing.get("sha256") == sha
        and existing.get("title") == title
    ):
        return existing

    tok = access_token_override or get_drive_access_token()
    if not tok:
        if existing and existing.get("googleDocsId"):
            return existing
        raise RuntimeError("No Google Drive OAuth token available to sync native Google Doc.")

    rel_path = str(md_path.relative_to(ROOT_DIR))

    if existing and existing.get("googleDocsId"):
        fid = existing["googleDocsId"]
        gdocs_cli = Path("/google/bin/releases/gemini-agents-gdocs/gdocs")
        if gdocs_cli.is_file() and cache_key in {"WS1", "WS2", "WS3", "WS4", "WS5", "ALL"}:
            import subprocess
            subprocess.run(
                [
                    "python3",
                    "-B",
                    str(ROOT_DIR / "scripts" / "build_gcp_branded_blog_docs.py"),
                    "--only",
                    cache_key,
                    "--refresh-manifest",
                ],
                cwd=ROOT_DIR,
                check=True,
            )
            refreshed = load_cloud_manifest().get("docs", {}).get(cache_key)
            if refreshed:
                return refreshed
        elif os.environ.get("ALLOW_PLAIN_TEXT_DOCS_FALLBACK") != "1":
            # Protect formatted bluedoc Google Docs (tables, Chroma code blocks, inline figures) from plain-text overwrite
            existing["sha256"] = sha
            existing["sizeBytes"] = len(md_bytes)
            save_cloud_manifest(manifest)
            return existing
        else:
            _sync_markdown_into_existing_google_doc(fid, md_path, title, tok)
        webview = existing.get("webViewLink", f"https://docs.google.com/document/d/{fid}/edit")
    else:
        template_entry = manifest.get("docs", {}).get("WS1") or next(iter(manifest.get("docs", {}).values()), None)
        template_id = (template_entry or {}).get("googleDocsId", "1Ts1-tKdzPJEvjZNgh-1_ZtdXJn86dAkMIljf9qTp8Os")
        copy_body = json.dumps({"name": f"{title} — Editable Google Docs"}).encode("utf-8")
        req = urllib.request.Request(
            f"https://www.googleapis.com/drive/v3/files/{urllib.parse.quote(template_id)}/copy?supportsAllDrives=true&fields=id,name,webViewLink",
            data=copy_body,
            headers={
                "Authorization": f"Bearer {tok}",
                "x-goog-user-project": QUOTA_PROJECT,
                "Content-Type": "application/json; charset=UTF-8",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.loads(resp.read().decode("utf-8"))
        fid = res["id"]
        _sync_markdown_into_existing_google_doc(fid, md_path, title, tok)
        webview = res.get("webViewLink", f"https://docs.google.com/document/d/{fid}/edit")

    entry = {
        "key": cache_key,
        "title": title,
        "mdPath": rel_path,
        "sha256": sha,
        "sizeBytes": len(md_bytes),
        "googleDocsId": fid,
        "googleDocsEditUrl": f"https://docs.google.com/document/d/{fid}/edit?authuser={urllib.parse.quote(DEFAULT_USER_EMAIL)}",
        "googleDocsPreviewUrl": f"https://docs.google.com/document/d/{fid}/preview",
        "googleDocsPdfUrl": f"https://docs.google.com/document/d/{fid}/export?format=pdf",
        "webViewLink": webview,
        "syncedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    manifest.setdefault("docs", {})[cache_key] = entry
    save_cloud_manifest(manifest)
    return entry


def export_google_file_pdf_bytes(file_id: str, mode: str = "slides") -> bytes:
    tok = get_drive_access_token()
    if tok:
        try:
            req = urllib.request.Request(
                f"https://www.googleapis.com/drive/v3/files/{urllib.parse.quote(file_id)}/export?mimeType=application/pdf",
                headers={
                    "Authorization": f"Bearer {tok}",
                    "x-goog-user-project": QUOTA_PROJECT,
                },
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except Exception:
            pass
    # Fallback for Cloud Run / public-link shared presentations & documents
    fid = urllib.parse.quote(file_id)
    pub_url = (
        f"https://docs.google.com/document/d/{fid}/export?format=pdf"
        if mode == "docs"
        else f"https://docs.google.com/presentation/d/{fid}/export/pdf"
    )
    req = urllib.request.Request(pub_url, headers={"User-Agent": "Mozilla/5.0 (GE-Blogs-CloudRun/1.0)"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


WORKSTREAM_DECK_SPECS = [
    ("WS1", "WS1 — Reference Architecture, Taxonomy & 5-Hop Baseline", "slides/ws1-12slide-visual-deck.pptx", "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md"),
    ("WS2", "WS2 — Pattern A: High-Density Pooled Architecture", "slides/ws2-12slide-visual-deck.pptx", "blogs/ws2-pattern-a-pooled-architecture.md"),
    ("WS3", "WS3 — Pattern B: Zero-Trust Sovereign Silos", "slides/ws3-12slide-visual-deck.pptx", "blogs/ws3-pattern-b-sovereign-silos.md"),
    ("WS4", "WS4 — Pattern C: Dynamic Hybrid Hub-and-Spoke & Tier Upgrade", "slides/ws4-12slide-visual-deck.pptx", "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md"),
    ("WS5", "WS5 — Executive Decision Guide & Multi-Tenant Agentic Triad", "slides/ws5-12slide-visual-deck.pptx", "blogs/ws5-decision-guide-and-agentic-triad.md"),
    ("ALL", "ALL Workstreams 1–5 Master Deck (25 Slides • 14 Diagrams)", "slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx", "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md"),
    ("DOC-MT-01", "DOC-MT-01 — Building Multi-Tenant Agents: Core Challenges, Cryptographic Identity & Token Propagation (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-01-editable-slides.pptx", ""),
    ("DOC-MT-02", "DOC-MT-02 — Agent Deployment Models: Navigating the Agentic Trilemma Across Pool, Bridge & Silo (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-02-editable-slides.pptx", ""),
    ("DOC-MT-03", "DOC-MT-03 — Building the High-Density Pool Tier: An End-to-End Implementation Blueprint (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-03-editable-slides.pptx", ""),
    ("DOC-MT-04", "DOC-MT-04 — Building the Hybrid Bridge Tier: Private Service Connect (PSC) Spokes & Live Tier Graduation (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-04-editable-slides.pptx", ""),
    ("DOC-MT-05", "DOC-MT-05 — Building the Sovereign Silo Tier: VPC Service Controls, Customer CMEK & Crypto-Shredding (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-05-editable-slides.pptx", ""),
    ("DOC-MT-06", "DOC-MT-06 — Production Verification: 10-Point Red-Team Breach Simulation & Cloud Console Runbook (Editable Diagram #78 + Blog Guide)", "slides/doc-mt-06-editable-slides.pptx", ""),
    ("DOC-REF-07", "Ref Arch 1: Enterprise Multimodal GraphRAG with Spanner Graph & Vertex AI", "slides/doc-ref-07-editable-slides.pptx", ""),
    ("DOC-REF-08", "Ref Arch 2: Zero-Trust Enterprise Agent Mesh with Model Armor & VPC-SC", "slides/doc-ref-08-editable-slides.pptx", ""),
    ("DOC-REF-09", "Ref Arch 3: Scalable MCP Tool Server & A2A Ecosystem on Cloud Run", "slides/doc-ref-09-editable-slides.pptx", ""),
]


def sync_all_workstreams(
    force_slides: bool = False,
    force_docs: bool = False,
    docs_only: bool = False,
) -> Dict[str, Any]:
    print("☁️  Syncing Editable .pptx Slide Decks (15 Decks) & Native Google Docs (6 Docs) to Google Workspace...")
    for key, title, pptx_rel, md_rel in WORKSTREAM_DECK_SPECS:
        if not docs_only:
            pptx_file = ROOT_DIR / pptx_rel
            if pptx_file.is_file():
                s_entry = upload_pptx_to_google_slides(pptx_file, title, key, force=force_slides)
                print(
                    f"   ✅ [Google Slides] {key} ({s_entry.get('slideCount', '?')} slides, {s_entry.get('sizeBytes', 0):,} B): {s_entry['googleSlidesEditUrl']}"
                )
        if not md_rel:
            continue
        md_file = ROOT_DIR / md_rel
        if md_file.is_file():
            d_entry = upload_md_to_google_docs(md_file, title, key, force=force_docs)
            print(f"   ✅ [Google Docs]   {key} ({d_entry.get('sizeBytes', 0):,} B native Doc): {d_entry['googleDocsEditUrl']}")
    manifest = load_cloud_manifest()
    print(f"🎉 Cloud Viewer Manifest written to {MANIFEST_FILE.relative_to(ROOT_DIR)}")
    return manifest


if __name__ == "__main__":
    import sys

    force_flag = "--force" in sys.argv
    force_docs_flag = force_flag or "--force-docs" in sys.argv
    docs_only_flag = "--docs-only" in sys.argv
    sync_all_workstreams(
        force_slides=force_flag,
        force_docs=force_docs_flag,
        docs_only=docs_only_flag,
    )

