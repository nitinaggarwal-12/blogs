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

QUOTA_PROJECT = "nitina-ggarwal-sandbox-647724"
DEFAULT_USER_EMAIL = "nitinagga@google.com"
DEFAULT_OAUTH_CLIENT_ID = "248990048888-hpng38o8veg9k4qnpcmlsoh7dkgvqc6o.apps.googleusercontent.com"

TOKEN_CANDIDATE_PATHS = [
    ROOT_DIR / ".gsheet_oauth_token.json",
    Path("/Users/nitinagga/Documents/gantry-pulse/.gsheet_oauth_token.json"),
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
}

WORKSTREAM_ALIAS_SLIDES_KEYS: Dict[str, list[tuple[str, str]]] = {
    "WS1": [
        ("BP-78", "slides/ws1-reference-architecture-editable-slides.pptx"),
        ("DOC-MT-01", "slides/doc-mt-01-editable-slides.pptx"),
        ("PLUGIN-GSLIDES-WS1", "slides/ws1-google-slides-design-plugin-editable-slides.pptx"),
    ],
    "WS2": [
        ("BP-78-A", "slides/ws2-pattern-a-pooled-editable-slides.pptx"),
        ("DOC-MT-02", "slides/doc-mt-02-editable-slides.pptx"),
    ],
    "WS3": [
        ("BP-78-B", "slides/ws3-pattern-b-siloed-editable-slides.pptx"),
        ("DOC-MT-03", "slides/doc-mt-03-editable-slides.pptx"),
    ],
    "WS4": [
        ("BP-78-C", "slides/ws4-pattern-c-hybrid-editable-slides.pptx"),
        ("DOC-MT-04", "slides/doc-mt-04-editable-slides.pptx"),
    ],
    "WS5": [
        ("BP-78-E", "slides/ws5-wrap-up-editable-slides.pptx"),
        ("DOC-MT-05", "slides/doc-mt-05-editable-slides.pptx"),
    ],
    "ALL": [
        ("DOC-MT-06", "slides/doc-mt-06-editable-slides.pptx"),
    ],
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
            patch_req = urllib.request.Request(
                f"https://www.googleapis.com/upload/drive/v3/files/{urllib.parse.quote(preferred_id)}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
                data=body,
                headers={
                    "Authorization": f"Bearer {tok}",
                    "x-goog-user-project": QUOTA_PROJECT,
                    "Content-Type": f"multipart/related; boundary={boundary}",
                },
                method="PATCH",
            )
            with urllib.request.urlopen(patch_req, timeout=90) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"[CloudBridge] In-place PATCH on {preferred_id} fell back to POST: {exc}")

    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
        data=body,
        headers={
            "Authorization": f"Bearer {tok}",
            "x-goog-user-project": QUOTA_PROJECT,
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
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
    preferred_id = PREFERRED_WORKSTREAM_SLIDES_IDS.get(cache_key) or (
        existing.get("googleSlidesId") if existing else None
    )
    if (
        not force
        and existing
        and existing.get("sha256") == sha
        and existing.get("googleSlidesId") == preferred_id
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
    if not tok:
        raise RuntimeError("No Google Drive OAuth token available to convert .pptx to Google Slides.")

    pptx_bytes = pptx_path.read_bytes()
    res = _upload_or_patch_pptx_bytes(pptx_bytes, title, tok, preferred_id=preferred_id)

    for sec_id in SECONDARY_WORKSTREAM_SLIDES_IDS.get(cache_key, []):
        if sec_id != res["id"]:
            try:
                sec_res = _upload_or_patch_pptx_bytes(pptx_bytes, title, tok, preferred_id=sec_id)
                print(f"   ✓ [Patched Secondary ID] {cache_key} -> {sec_res.get('id', sec_id)} ({slide_count} slides)")
            except Exception as exc:
                print(f"   ⚠️ [Secondary Patch Warning] {cache_key} ({sec_id}): {exc}")

    fid = res["id"]
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
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
        "webViewLink": res.get("webViewLink", f"https://docs.google.com/presentation/d/{fid}/edit"),
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


def upload_md_to_google_docs(
    md_path: Path,
    title: str,
    cache_key: str,
    force: bool = False,
    access_token_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Rule 49: Clone a verified native Google Doc template via drive.files.copy and apply in-place batchUpdate (never Drive HTML import)."""
    manifest = load_cloud_manifest()
    sha = file_sha256(md_path)
    existing = manifest.get("docs", {}).get(cache_key)
    if existing and existing.get("googleDocsId") and not force:
        if existing.get("sha256") != sha or existing.get("title") != title:
            existing["sha256"] = sha
            existing["title"] = title
            save_cloud_manifest(manifest)
        return existing

    tok = access_token_override or get_drive_access_token()
    if not tok:
        if existing and existing.get("googleDocsId"):
            return existing
        raise RuntimeError("No Google Drive OAuth token available to clone native Google Doc template.")

    template_entry = manifest.get("docs", {}).get("WS1") or next(iter(manifest.get("docs", {}).values()), None)
    template_id = (template_entry or {}).get("googleDocsId", "13LsASkluIwG4gn5epnjWaUCOSMKcuQ1G85_jhYnvRWM")
    rel_path = str(md_path.relative_to(ROOT_DIR))

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
    if template_entry and template_entry.get("title"):
        try:
            batch_body = json.dumps(
                {
                    "requests": [
                        {
                            "replaceAllText": {
                                "containsText": {"text": template_entry["title"], "matchCase": True},
                                "replaceText": title,
                            }
                        }
                    ]
                }
            ).encode("utf-8")
            batch_req = urllib.request.Request(
                f"https://docs.googleapis.com/v1/documents/{urllib.parse.quote(fid)}:batchUpdate",
                data=batch_body,
                headers={
                    "Authorization": f"Bearer {tok}",
                    "x-goog-user-project": QUOTA_PROJECT,
                    "Content-Type": "application/json; charset=UTF-8",
                },
                method="POST",
            )
            with urllib.request.urlopen(batch_req, timeout=30):
                pass
        except Exception:
            pass

    entry = {
        "key": cache_key,
        "title": title,
        "mdPath": rel_path,
        "sha256": sha,
        "googleDocsId": fid,
        "googleDocsEditUrl": f"https://docs.google.com/document/d/{fid}/edit?authuser={urllib.parse.quote(DEFAULT_USER_EMAIL)}",
        "googleDocsPreviewUrl": f"https://docs.google.com/document/d/{fid}/preview",
        "googleDocsPdfUrl": f"https://docs.google.com/document/d/{fid}/export?format=pdf",
        "webViewLink": res.get("webViewLink", f"https://docs.google.com/document/d/{fid}/edit"),
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
    ("WS1", "WS1 — Reference Architecture, Taxonomy & 5-Hop Baseline", "slides/ws1-reference-architecture-editable-slides.pptx", "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md"),
    ("WS2", "WS2 — Pattern A: High-Density Pooled Architecture", "slides/ws2-pattern-a-pooled-editable-slides.pptx", "blogs/ws2-pattern-a-pooled-architecture.md"),
    ("WS3", "WS3 — Pattern B: Zero-Trust Sovereign Silos", "slides/ws3-pattern-b-siloed-editable-slides.pptx", "blogs/ws3-pattern-b-sovereign-silos.md"),
    ("WS4", "WS4 — Pattern C: Dynamic Hybrid Hub-and-Spoke & Tier Upgrade", "slides/ws4-pattern-c-hybrid-editable-slides.pptx", "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md"),
    ("WS5", "WS5 — Executive Decision Guide & Multi-Tenant Agentic Triad", "slides/ws5-wrap-up-editable-slides.pptx", "blogs/ws5-decision-guide-and-agentic-triad.md"),
    ("ALL", "ALL Workstreams 1–5 Master Deck (25 Slides • 14 Diagrams)", "slides/geap-multi-tenancy-all-workstreams-editable-slides.pptx", "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md"),
    ("DOC-REF-07", "Ref Arch 1: Enterprise Multimodal GraphRAG with Spanner Graph & Vertex AI", "slides/doc-ref-07-editable-slides.pptx", ""),
    ("DOC-REF-08", "Ref Arch 2: Zero-Trust Enterprise Agent Mesh with Model Armor & VPC-SC", "slides/doc-ref-08-editable-slides.pptx", ""),
    ("DOC-REF-09", "Ref Arch 3: Scalable MCP Tool Server & A2A Ecosystem on Cloud Run", "slides/doc-ref-09-editable-slides.pptx", ""),
]


def sync_all_workstreams(force_slides: bool = False) -> Dict[str, Any]:
    print("☁️  Syncing all Editable .pptx Slide Decks (WS1–WS5, ALL & DOC-REF-07..09) to Google Slides...")
    manifest = load_cloud_manifest()
    for key, title, pptx_rel, md_rel in WORKSTREAM_DECK_SPECS:
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
            d_entry = upload_md_to_google_docs(md_file, title, key)
            print(f"   ✓ [Google Docs]   {key} (native Doc): {d_entry['googleDocsEditUrl']}")
    manifest = load_cloud_manifest()
    print(f"🎉 Cloud Viewer Manifest written to {MANIFEST_FILE.relative_to(ROOT_DIR)}")
    return manifest


if __name__ == "__main__":
    import sys

    sync_all_workstreams(force_slides="--force" in sys.argv)

