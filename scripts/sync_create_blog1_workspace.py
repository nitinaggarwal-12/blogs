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
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "scripts"))

import create_blog1_engine as _cb1

DEFAULT_BUCKET = os.environ.get("DURABLE_GCS_BUCKET", "scorex-durable-state-bbar-138hf0")
GCS_PREFIX = "ge-blogs/create-blog1"
GDRIVE_CLI = Path("/google/bin/releases/gemini-agents-gdrive/gdrive")


def _rasterize_svgs_to_pngs(svg_paths: Dict[str, Path], out_dir: Path) -> Dict[str, Tuple[bytes, int, int]]:
    """Rasterizes 1600x900 diagram SVGs to crisp PNGs for inline embedding inside Google Docs."""
    result: Dict[str, Tuple[bytes, int, int]] = {}
    if not svg_paths:
        return result
    # Prefer local Puppeteer (100% browser SVG fidelity with embedded data-URI icons & CSS fonts)
    pupp_paths = [
        Path.home() / "node_modules/puppeteer",
        ROOT_DIR / "node_modules" / "puppeteer",
    ]
    pupp_dir = next((p for p in pupp_paths if p.exists()), None)
    if shutil.which("node") and pupp_dir is not None:
        jobs = []
        for k, sp in svg_paths.items():
            out_p = out_dir / f"{k}.png"
            vb_w, vb_h = 1600, 900
            try:
                head = sp.read_text(encoding="utf-8", errors="ignore")[:800]
                m_vb = re.search(r'viewBox="[^"]*?\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"', head)
                if m_vb:
                    vb_w = max(320, int(round(float(m_vb.group(1)))))
                    vb_h = max(320, int(round(float(m_vb.group(2)))))
            except Exception:
                pass
            jobs.append({"key": k, "svg": str(sp), "png": str(out_p), "w": vb_w, "h": vb_h})
        js_script = out_dir / "_raster.mjs"
        js_script.write_text(
            f"""import fs from 'fs';
import puppeteer from '{pupp_dir.as_posix()}/lib/esm/puppeteer/puppeteer.js';
const jobs = JSON.parse(fs.readFileSync({json.dumps(str(out_dir / "_jobs.json"))}, 'utf8'));
const browser = await puppeteer.launch({{ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] }});
try {{
  const page = await browser.newPage();
  for (const j of jobs) {{
    const w = Number(j.w) || 1600;
    const h = Number(j.h) || 900;
    await page.setViewport({{ width: w, height: h, deviceScaleFactor: 2 }});
    const svg = fs.readFileSync(j.svg, 'utf8');
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;background:#fff;overflow:hidden;width:${{w}}px;height:${{h}}px;">${{svg}}</body></html>`, {{ waitUntil: 'load' }});
    await page.screenshot({{ path: j.png, type: 'png', clip: {{ x: 0, y: 0, width: w, height: h }} }});
  }}
}} finally {{
  await browser.close();
}}
""",
            encoding="utf-8",
        )
        (out_dir / "_jobs.json").write_text(json.dumps(jobs), encoding="utf-8")
        try:
            subprocess.run(["node", str(js_script)], check=True, capture_output=True, text=True, timeout=90)
            for j in jobs:
                pp = Path(j["png"])
                if pp.is_file():
                    raw = pp.read_bytes()
                    _, pw, ph, _ = _cb1.parse_image_header(raw)
                    result[j["key"]] = (raw, pw, ph)
            if result:
                return result
        except Exception as exc:
            print(f"[WARN] Puppeteer SVG rasterization skipped ({exc}); trying rsvg-convert fallback...")

    if shutil.which("rsvg-convert"):
        for k, sp in svg_paths.items():
            out_p = out_dir / f"{k}.png"
            try:
                subprocess.run(["rsvg-convert", "-w", "1600", "-h", "900", str(sp), "-o", str(out_p)], check=True, timeout=20)
                raw = out_p.read_bytes()
                _, pw, ph, _ = _cb1.parse_image_header(raw)
                result[k] = (raw, pw, ph)
            except Exception:
                pass
    return result


def _patch_bundle_zip(bundle_path: Path, slug: str, updates: Dict[str, bytes]) -> None:
    """Rewrites entries inside `<slug>-bundle.zip` in place, redacting internal emails in manifest.json."""
    if not bundle_path.is_file():
        return
    tmp_p = bundle_path.with_suffix(".tmp.zip")
    prefixed = {f"{slug}/{k.lstrip('/')}": v for k, v in updates.items()}
    seen = set()
    with zipfile.ZipFile(bundle_path, "r") as zin, zipfile.ZipFile(tmp_p, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename in prefixed:
                zout.writestr(item.filename, prefixed[item.filename])
                seen.add(item.filename)
            elif item.filename == f"{slug}/manifest.json":
                zout.writestr(item.filename, _cb1._redact_manifest_for_public_bundle(zin.read(item.filename)))
                seen.add(item.filename)
            else:
                zout.writestr(item, zin.read(item.filename))
        for k, v in prefixed.items():
            if k not in seen:
                zout.writestr(k, v)
    tmp_p.replace(bundle_path)


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
            return {"workspaceSync": prev_ws, "diagrams": manifest.get("diagrams") if isinstance(manifest.get("diagrams"), dict) else {}}

        pptx_p = td_p / f"{slug}-deck.pptx"
        docx_p = td_p / f"{slug}-whitepaper.docx"
        bundle_p = td_p / f"{slug}-bundle.zip"
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/slides/{slug}-deck.pptx", str(pptx_p)], check=True)
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/docs/{slug}-whitepaper.docx", str(docx_p)], check=True)
        subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/{slug}-bundle.zip", str(bundle_p)], check=False)

        # Download SVGs & embed all enabled rasterized diagrams inline into the .docx before uploading to Google Docs
        diag_dir = td_p / "diagrams"
        diag_dir.mkdir(parents=True, exist_ok=True)
        svg_paths: Dict[str, Path] = {}
        d_meta = manifest.get("diagrams") if isinstance(manifest.get("diagrams"), dict) else {}
        for dk in ("concept", "architecture", "cloudarch", "sequence", "security", "wire", "async"):
            if dk in d_meta:
                sp = diag_dir / f"{slug}-{dk}.svg"
                cp_r = subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/diagrams/{slug}-{dk}.svg", str(sp)], capture_output=True)
                if cp_r.returncode == 0 and sp.is_file():
                    svg_paths[dk] = sp
        diagram_pngs = _rasterize_svgs_to_pngs(svg_paths, diag_dir)
        docx_rebuilt = False
        if diagram_pngs and isinstance(manifest.get("blueprint"), dict):
            # Download any attached proofs so they stay embedded
            proofs = manifest.get("proofs") or []
            for pf in proofs:
                rel_p = str(pf.get("relPath") or "")
                if rel_p:
                    dst_pf = td_p / rel_p
                    dst_pf.parent.mkdir(parents=True, exist_ok=True)
                    subprocess.run(["gcloud", "storage", "cp", f"{base}/{slug}/{rel_p}", str(dst_pf)], capture_output=True)
            extra_urls = {k: str(d_meta[k].get("viewerUrl") or "") for k in ("concept", "cloudarch", "security", "wire", "async") if k in d_meta}
            docx_bytes = _cb1.compile_docx_bytes(
                manifest["blueprint"],
                slug,
                str((d_meta.get("architecture") or {}).get("viewerUrl") or ""),
                str((d_meta.get("sequence") or {}).get("viewerUrl") or ""),
                proofs,
                td_p,
                extra_urls=extra_urls,
                grounding=(manifest.get("quality") or {}).get("grounding") or {},
                diagram_pngs=diagram_pngs,
                slide_plan=manifest.get("slidePlan"),
                outline=manifest.get("outline"),
                diags_map=d_meta,
            )
            docx_p.write_bytes(docx_bytes)
            docx_rebuilt = True
            print(f"[DOCX] Embedded {len(diagram_pngs)} crisp diagram PNGs inline into {docx_p.name} ({len(docx_bytes):,} bytes)")

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
            "embeddedDiagramPngs": len(diagram_pngs),
        }
        manifest["workspaceSync"] = ws_meta
        manifest["updatedAt"] = now
        mp_bytes = json.dumps(manifest, indent=2).encode("utf-8")
        mp.write_bytes(mp_bytes)
        subprocess.run(["gcloud", "storage", "cp", str(mp), f"{base}/{slug}/manifest.json"], check=True)
        if docx_rebuilt:
            subprocess.run(["gcloud", "storage", "cp", str(docx_p), f"{base}/{slug}/docs/{slug}-whitepaper.docx"], check=True)
        if bundle_p.is_file():
            bundle_updates: Dict[str, bytes] = {
                "manifest.json": _cb1._redact_manifest_for_public_bundle(mp_bytes),
            }
            if docx_rebuilt:
                bundle_updates[f"docs/{slug}-whitepaper.docx"] = docx_p.read_bytes()
            _patch_bundle_zip(bundle_p, slug, bundle_updates)
            subprocess.run(["gcloud", "storage", "cp", str(bundle_p), f"{base}/{slug}/{slug}-bundle.zip"], check=True)
        print(f"[SYNCED] {slug}\n  Slides: {ws_meta['slidesUrl']}\n  Docs:   {ws_meta['docUrl']}")
        return {"workspaceSync": ws_meta, "diagrams": manifest.get("diagrams") if isinstance(manifest.get("diagrams"), dict) else {}}


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
        d_idx = idx.get("diagramIndex") if isinstance(idx.get("diagramIndex"), dict) else {}
        for sl in targets:
            sync_res = sync_slug(args.bucket, sl, force=args.force)
            ws_meta = sync_res.get("workspaceSync") if isinstance(sync_res, dict) and "workspaceSync" in sync_res else sync_res
            diag_map = sync_res.get("diagrams") if isinstance(sync_res, dict) and isinstance(sync_res.get("diagrams"), dict) else {}
            if diag_map:
                d_idx = {k: v for k, v in d_idx.items() if not (isinstance(v, dict) and v.get("slug") == sl)}
                for dk, dv in diag_map.items():
                    if isinstance(dv, dict) and dv.get("publicId"):
                        d_idx[str(dv["publicId"])] = {
                            "slug": sl,
                            "kind": str(dk),
                            "title": str(dv.get("title") or dk),
                        }
                idx["diagramIndex"] = d_idx
                changed = True
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
