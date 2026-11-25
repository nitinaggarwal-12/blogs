#!/usr/bin/env python3
"""
Sync Create Blog1 asset bundles stored in GCS to native editable Google Slides & Google Docs.

Uses the pre-authenticated workstation `gdrive` CLI when available, converting:
  - `slides/<slug>-deck.pptx`       -> native Google Slides (application/vnd.google-apps.presentation)
  - `docs/<slug>-whitepaper.docx`   -> native Google Docs   (application/vnd.google-apps.document)

Updates BOTH `<slug>/manifest.json` and `index.json` inside `gs://<bucket>/ge-blogs/create-blog1/`
so the `/create-blog1` portal immediately opens live Google Slides & Google Docs in new tabs
without prompting users to download `.pptx` or `.docx` files.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_BUCKET = os.environ.get("DURABLE_GCS_BUCKET", "scorex-durable-state-bbar-138hf0")
GCS_PREFIX = "ge-blogs/create-blog1"
GDRIVE_CLI = Path("/google/bin/releases/gemini-agents-gdrive/gdrive")


def _with_rk(base_url: str, resource_key: str) -> str:
    rk = (resource_key or "").strip()
    if not rk:
        return base_url
    sep = "&" if "?" in base_url else "?"
    return f"{base_url}{sep}resourcekey={rk}"


def _upload_or_update(local_file: Path, display_name: str, mime_type: str, existing_id: Optional[str]) -> Dict[str, Any]:
    if not GDRIVE_CLI.is_file():
        raise RuntimeError(f"Missing gdrive CLI at {GDRIVE_CLI}")
    ext = local_file.suffix
    safe_name = re.sub(r'[\\/:*?"<>|]+', "-", display_name).strip()[:120]
    with tempfile.TemporaryDirectory(prefix="cb1_ws_") as td:
        staged = Path(td) / f"{safe_name}{ext}"
        staged.write_bytes(local_file.read_bytes())
        if existing_id:
            upd = subprocess.run(
                [str(GDRIVE_CLI), "mutate", "update", existing_id, str(staged), "--json"],
                capture_output=True, text=True, timeout=90,
            )
            if upd.returncode == 0:
                info = json.loads(upd.stdout.strip() or "{}") if upd.stdout.strip().startswith("{") else {}
                return {"id": str(info.get("id") or existing_id), "resourceKey": str(info.get("resourceKey") or "")}
        res = subprocess.run(
            [str(GDRIVE_CLI), "mutate", "upload", str(staged), "--mime-type", mime_type, "--json"],
            check=True, capture_output=True, text=True, timeout=90,
        )
        return json.loads(res.stdout.strip())


def sync_slug(bucket: str, slug: str, force: bool = False) -> Dict[str, Any]:
    base = f"gs://{bucket}/{GCS_PREFIX}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with tempfile.TemporaryDirectory(prefix="cb1_gcs_") as td:
        td_p = Path(td)
        mp = td_p / "manifest.json"
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/manifest.json", str(mp)], check=True)
        manifest = json.loads(mp.read_text(encoding="utf-8"))
        prev_ws = manifest.get("workspaceSync") if isinstance(manifest.get("workspaceSync"), dict) else {}
        if not force and prev_ws.get("status") == "SYNCED" and prev_ws.get("slidesId") and prev_ws.get("docId"):
            print(f"[SKIP] {slug} already synced -> slides={prev_ws['slidesId']} doc={prev_ws['docId']}")
            return prev_ws

        pptx_p = td_p / f"{slug}-deck.pptx"
        docx_p = td_p / f"{slug}-whitepaper.docx"
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/slides/{slug}-deck.pptx", str(pptx_p)], check=True)
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/docs/{slug}-whitepaper.docx", str(docx_p)], check=True)

        title = str(manifest.get("title") or slug)[:90]
        slide_n = len((manifest.get("blueprint") or {}).get("slides") or []) or 12
        slides_res = _upload_or_update(
            pptx_p,
            f"{title} — {slide_n}-Slide Deck",
            "application/vnd.google-apps.presentation",
            str(prev_ws.get("slidesId") or "").strip() or None,
        )
        docs_res = _upload_or_update(
            docx_p,
            f"{title} — Architecture Brief",
            "application/vnd.google-apps.document",
            str(prev_ws.get("docId") or "").strip() or None,
        )
        sid = str(slides_res["id"])
        did = str(docs_res["id"])
        srk = str(slides_res.get("resourceKey") or "")
        drk = str(docs_res.get("resourceKey") or "")
        ws_meta = {
            "status": "SYNCED",
            "syncedAt": now,
            "provider": "google_drive_native",
            "slidesId": sid,
            "slidesUrl": _with_rk(f"https://docs.google.com/presentation/d/{sid}/edit", srk),
            "slidesEmbedUrl": _with_rk(f"https://docs.google.com/presentation/d/{sid}/embed", srk),
            "docId": did,
            "docUrl": _with_rk(f"https://docs.google.com/document/d/{did}/edit", drk),
        }
        manifest["workspaceSync"] = ws_meta
        manifest["updatedAt"] = now
        mp.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        subprocess.run(["gcloud", "storage", "cp", str(mp), f"{base}/{slug}/manifest.json"], check=True)
        print(f"[SYNCED] {slug}\n  Slides: {ws_meta['slidesUrl']}\n  Docs:   {ws_meta['docUrl']}")
        return ws_meta


def main() -> int:
    ap = argparse.ArgumentParser(description="Convert Create Blog1 GCS blogs to native Google Slides & Docs.")
    ap.add_argument("--bucket", default=DEFAULT_BUCKET)
    ap.add_argument("--slug", default="", help="Single blog slug to sync")
    ap.add_argument("--all", action="store_true", help="Sync every unsynced blog in index.json")
    ap.add_argument("--force", action="store_true", help="Re-upload/update in place even if already SYNCED")
    args = ap.parse_args()

    base = f"gs://{args.bucket}/{GCS_PREFIX}"
    with tempfile.TemporaryDirectory(prefix="cb1_idx_") as td:
        idx_p = Path(td) / "index.json"
        subprocess.run(["gcloud", "storage", "cp", f"{base}/index.json", str(idx_p)], check=True)
        idx = json.loads(idx_p.read_text(encoding="utf-8"))
        targets: List[str] = []
        if args.slug:
            targets = [args.slug.strip()]
        elif args.all:
            targets = [str(b["slug"]) for b in idx.get("blogs", []) if b.get("slug")]
        else:
            ap.error("Pass --slug <slug> or --all")

        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        changed = False
        for sl in targets:
            ws_meta = sync_slug(args.bucket, sl, force=args.force)
            for b in idx.get("blogs", []):
                if b.get("slug") == sl:
                    b["workspaceSync"] = ws_meta
                    b["updatedAt"] = now
                    changed = True
        if changed:
            idx["updatedAt"] = now
            idx_p.write_text(json.dumps(idx, indent=2), encoding="utf-8")
            subprocess.run(["gcloud", "storage", "cp", str(idx_p), f"{base}/index.json"], check=True)
            print("[OK] index.json updated in GCS.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
