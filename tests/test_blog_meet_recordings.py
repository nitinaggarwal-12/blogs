#!/usr/bin/env python3
"""
Hermetic Unit & Contract Tests for Blog Meet-Style Digital Twin Recordings,
RFC 7233 HTTP Range Streaming, WebVTT MIME, Security Controls & Storage Budget.

100% hermetic in GitHub Actions (zero Demoes-GE filesystem dependency; ffprobe
metadata assertions are automatically guarded by shutil.which("ffprobe")).
"""

from __future__ import annotations

import hashlib
import http.client
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server as portal_server  # noqa: E402


BANNED_RECORDING_TOKENS = (
    "nitin aggarwal",
    "nitinaggarwal-12",
    "custom-nitin",
    "nitin_aggarwal",
    "authuser=",
    "@google.com",
    "corp.google.com",
    "beyondcorp",
    "uberproxy",
    "cloudtop chrome",
    "live argolis",
)

MAX_SINGLE_MP4_BYTES = 18 * 1024 * 1024
MAX_TOTAL_RECORDINGS_BYTES = 95 * 1024 * 1024


class TestBlogMeetRecordingsContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._httpd = portal_server.ThreadingHTTPServer(
            ("127.0.0.1", 0), portal_server.PortalRequestHandler
        )
        cls._port = cls._httpd.server_address[1]
        cls._thread = threading.Thread(target=cls._httpd.serve_forever, daemon=True)
        cls._thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._httpd.shutdown()
        cls._httpd.server_close()

    def _req(self, method: str, path: str, headers: dict[str, str] | None = None):
        conn = http.client.HTTPConnection("127.0.0.1", self._port, timeout=10)
        try:
            conn.request(method, path, headers=headers or {})
            resp = conn.getresponse()
            body = resp.read()
            return resp.status, {k.lower(): v for k, v in resp.getheaders()}, body
        finally:
            conn.close()

    def test_01_registry_parity_unique_saas_and_gcloudignore(self) -> None:
        reg_path = ROOT_DIR / "data" / "blog_video_registry.json"
        self.assertTrue(reg_path.is_file(), "data/blog_video_registry.json missing")
        raw = reg_path.read_text(encoding="utf-8")
        low = raw.lower()
        for tok in BANNED_RECORDING_TOKENS:
            self.assertNotIn(tok, low, f"Banned token '{tok}' in blog_video_registry.json")

        reg = json.loads(raw)
        self.assertEqual(reg.get("presenterName"), "AI Digital Twin · Google Cloud")
        self.assertEqual(reg.get("previewBadge"), "AI-GENERATED DIGITAL TWIN")
        self.assertEqual(reg.get("personaId"), "cloud-ai-digital-twin")

        blogs = reg.get("blogs", {})
        self.assertEqual(set(blogs.keys()), {"ws1", "ws2", "ws3", "ws4", "ws5"})
        saas_ids = []
        for slug, entry in blogs.items():
            self.assertEqual(entry["slug"], slug)
            self.assertTrue((ROOT_DIR / entry["blogMarkdown"]).is_file(), f"Missing {entry['blogMarkdown']}")
            self.assertEqual(entry["recordingDir"], f"recordings/{slug}")
            saas_ids.append(entry["saasTarget"]["saasId"])
        self.assertEqual(len(set(saas_ids)), 5, f"Duplicate SaaS targets across blogs: {saas_ids}")

        gcloudignore = (ROOT_DIR / ".gcloudignore").read_text(encoding="utf-8")
        self.assertIn("!recordings/**/*.mp4", gcloudignore)
        self.assertIn(".local_backup/", gcloudignore)

    def test_02_meet_player_js_zero_xss_and_zero_tts_impersonation(self) -> None:
        js_path = ROOT_DIR / "js" / "blog_meet_player.js"
        self.assertTrue(js_path.is_file(), "js/blog_meet_player.js missing")
        src = js_path.read_text(encoding="utf-8")
        for banned in (
            "innerHTML",
            "outerHTML",
            "insertAdjacentHTML",
            "document.write(",
            "speechSynthesis",
            "SpeechSynthesisUtterance",
            "/api/narrate",
            "track.default = true",
        ):
            self.assertNotIn(banned, src, f"Disallowed sink or TTS call '{banned}' in js/blog_meet_player.js")
        self.assertIn("track.kind = 'captions'", src)
        self.assertIn("hydrateBlogMeetRecordingCard", src)

    def test_03_server_rfc7233_range_head_vtt_cache_and_security_headers(self) -> None:
        rec_tmp_dir = ROOT_DIR / "recordings" / "_unit_test_tmp"
        rec_tmp_dir.mkdir(parents=True, exist_ok=True)
        mp4_sample = rec_tmp_dir / "sample.mp4"
        vtt_sample = rec_tmp_dir / "sample.vtt"
        payload = bytes(range(256)) * 16  # 4096 bytes deterministic payload
        vtt_body = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nSample verified caption.\n"
        try:
            mp4_sample.write_bytes(payload)
            vtt_sample.write_text(vtt_body, encoding="utf-8")

            # 1. Full GET 200 + Accept-Ranges + Cache-Control + ETag + Last-Modified + security headers
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.mp4")
            self.assertEqual(st, 200)
            self.assertEqual(body, payload)
            self.assertEqual(hdrs.get("content-type"), "video/mp4")
            self.assertEqual(hdrs.get("accept-ranges"), "bytes")
            self.assertEqual(hdrs.get("cache-control"), "public, max-age=3600")
            self.assertTrue(hdrs.get("etag"))
            self.assertTrue(hdrs.get("last-modified"))
            self.assertEqual(hdrs.get("x-content-type-options"), "nosniff")
            self.assertEqual(hdrs.get("x-frame-options"), "SAMEORIGIN")

            # 2. Single-range 206 Partial Content (bytes=100-199)
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.mp4", {"Range": "bytes=100-199"})
            self.assertEqual(st, 206)
            self.assertEqual(body, payload[100:200])
            self.assertEqual(hdrs.get("content-range"), f"bytes 100-199/{len(payload)}")
            self.assertEqual(hdrs.get("content-length"), "100")
            self.assertEqual(hdrs.get("accept-ranges"), "bytes")
            self.assertEqual(hdrs.get("x-content-type-options"), "nosniff")

            # 3. Open-ended range (bytes=4080-)
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.mp4", {"Range": "bytes=4080-"})
            self.assertEqual(st, 206)
            self.assertEqual(body, payload[4080:])
            self.assertEqual(hdrs.get("content-range"), f"bytes 4080-4095/{len(payload)}")

            # 4. Suffix range (bytes=-32)
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.mp4", {"Range": "bytes=-32"})
            self.assertEqual(st, 206)
            self.assertEqual(body, payload[-32:])
            self.assertEqual(hdrs.get("content-range"), f"bytes 4064-4095/{len(payload)}")

            # 5. Unsatisfiable range -> 416 with Content-Range: bytes */N and security headers
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.mp4", {"Range": "bytes=999999-"})
            self.assertEqual(st, 416)
            self.assertEqual(body, b"")
            self.assertEqual(hdrs.get("content-range"), f"bytes */{len(payload)}")
            self.assertEqual(hdrs.get("x-content-type-options"), "nosniff")

            # 6. HEAD returns headers only with full Content-Length and empty body
            st, hdrs, body = self._req("HEAD", "/recordings/_unit_test_tmp/sample.mp4")
            self.assertEqual(st, 200)
            self.assertEqual(body, b"")
            self.assertEqual(hdrs.get("content-length"), str(len(payload)))
            self.assertEqual(hdrs.get("accept-ranges"), "bytes")

            # 7. WebVTT MIME check
            st, hdrs, body = self._req("GET", "/recordings/_unit_test_tmp/sample.vtt")
            self.assertEqual(st, 200)
            self.assertEqual(hdrs.get("content-type"), "text/vtt; charset=utf-8")
            self.assertEqual(body.decode("utf-8"), vtt_body)

            # 8. Traversal / dotfile / sensitive paths blocked even when Range header is supplied
            for bad_path in (
                "/recordings/..%2F..%2F.git/config",
                "/.gitignore",
                "/recordings/_unit_test_tmp/../../server.py",
            ):
                st_bad, _, _ = self._req("GET", bad_path, {"Range": "bytes=0-10"})
                self.assertIn(st_bad, (400, 403, 404), f"Expected blocked status for {bad_path}, got {st_bad}")
        finally:
            shutil.rmtree(rec_tmp_dir, ignore_errors=True)
            rec_root = ROOT_DIR / "recordings"
            if rec_root.is_dir() and not any(rec_root.iterdir()):
                rec_root.rmdir()

    def test_04_committed_recordings_integrity_budget_and_hygiene(self) -> None:
        rec_root = ROOT_DIR / "recordings"
        if not rec_root.is_dir():
            return

        total_bytes = 0
        ffprobe_bin = shutil.which("ffprobe")
        for slug_dir in sorted(p for p in rec_root.iterdir() if p.is_dir() and not p.name.startswith("_")):
            manifest_path = slug_dir / "meet_recording_manifest.json"
            slide_manifest_path = slug_dir / "slide_deck_delivery_manifest.json"
            if not manifest_path.is_file() and not slide_manifest_path.is_file():
                continue

            if slide_manifest_path.is_file():
                raw_sm = slide_manifest_path.read_text(encoding="utf-8")
                for tok in BANNED_RECORDING_TOKENS:
                    self.assertNotIn(tok, raw_sm.lower(), f"Banned token '{tok}' in {slide_manifest_path}")
                sm = json.loads(raw_sm)
                self.assertEqual(sm.get("videoType"), "slide_deck_delivery")
                s_mp4 = slug_dir / "slide_deck_delivery_recording.mp4"
                s_poster = slug_dir / "slide_deck_delivery_poster.jpg"
                s_vtt = slug_dir / "slide_captions.vtt"
                for req_f in (s_mp4, s_poster, s_vtt):
                    self.assertTrue(req_f.is_file(), f"Missing slide presentation artifact: {req_f}")
                self.assertLessEqual(s_mp4.stat().st_size, MAX_SINGLE_MP4_BYTES)
                self.assertEqual(hashlib.sha256(s_mp4.read_bytes()).hexdigest(), sm.get("videoSha256"))
                s_vtt_text = s_vtt.read_text(encoding="utf-8")
                self.assertTrue(s_vtt_text.startswith("WEBVTT"))
                for tok in BANNED_RECORDING_TOKENS:
                    self.assertNotIn(tok, s_vtt_text.lower(), f"Banned token '{tok}' in {s_vtt}")
                s_chapters = sm.get("chapters", [])
                self.assertGreaterEqual(len(s_chapters), 1)
                for sch in s_chapters:
                    thumb_rel = str(sch.get("thumbnailUrl") or "").lstrip("/")
                    self.assertTrue((ROOT_DIR / thumb_rel).is_file(), f"Missing slide thumb {thumb_rel}")
                if ffprobe_bin:
                    fp_s = subprocess.run(
                        [ffprobe_bin, "-v", "error", "-show_format", "-show_chapters", "-of", "json", str(s_mp4)],
                        capture_output=True,
                        text=True,
                        check=True,
                        timeout=15,
                    )
                    probe_s = json.loads(fp_s.stdout)
                    tags_s = {k.lower(): str(v) for k, v in (probe_s.get("format", {}).get("tags") or {}).items()}
                    self.assertEqual(tags_s.get("artist"), "AI Digital Twin · Google Cloud")
                    self.assertIn("Pure Omni 1.2", tags_s.get("comment", ""))
                    self.assertEqual(len(probe_s.get("chapters", [])), len(s_chapters))
                    for tok in BANNED_RECORDING_TOKENS:
                        self.assertNotIn(tok, json.dumps(tags_s).lower(), f"Banned token '{tok}' in MP4 tags of {s_mp4}")

            if not manifest_path.is_file():
                for f in slug_dir.rglob("*"):
                    if f.is_file():
                        total_bytes += f.stat().st_size
                continue

            raw_manifest = manifest_path.read_text(encoding="utf-8")
            for tok in BANNED_RECORDING_TOKENS:
                self.assertNotIn(tok, raw_manifest.lower(), f"Banned token '{tok}' in {manifest_path}")
            manifest = json.loads(raw_manifest)

            mp4_path = slug_dir / "meet_live_execution_recording.mp4"
            poster_path = slug_dir / "meet_recording_poster.jpg"
            vtt_path = slug_dir / "captions.vtt"
            prov_path = slug_dir / "chapter_provenance.json"

            for req_f in (mp4_path, poster_path, vtt_path, prov_path):
                self.assertTrue(req_f.is_file(), f"Missing required recording artifact: {req_f}")

            mp4_bytes = mp4_path.stat().st_size
            self.assertLessEqual(
                mp4_bytes,
                MAX_SINGLE_MP4_BYTES,
                f"{mp4_path.name} ({mp4_bytes} B) exceeds {MAX_SINGLE_MP4_BYTES} B cap",
            )
            self.assertEqual(
                hashlib.sha256(mp4_path.read_bytes()).hexdigest(),
                manifest.get("videoSha256"),
                f"SHA-256 mismatch for {mp4_path}",
            )

            vtt_text = vtt_path.read_text(encoding="utf-8")
            self.assertTrue(vtt_text.startswith("WEBVTT"), f"{vtt_path} missing WEBVTT header")
            for tok in BANNED_RECORDING_TOKENS:
                self.assertNotIn(tok, vtt_text.lower(), f"Banned token '{tok}' in {vtt_path}")

            prov = json.loads(prov_path.read_text(encoding="utf-8"))
            self.assertEqual(
                hashlib.sha256(poster_path.read_bytes()).hexdigest(),
                prov.get("poster", {}).get("sha256"),
            )
            chapters = manifest.get("chapters", [])
            self.assertGreaterEqual(len(chapters), 1)
            for ch in chapters:
                pad = f"{int(ch['chapterNum']):02d}"
                thumb = slug_dir / "chapters" / f"ch-{pad}.png"
                self.assertTrue(thumb.is_file(), f"Missing chapter thumbnail {thumb}")
                prov_ch = next((c for c in prov.get("chapters", []) if c.get("chapterNum") == ch["chapterNum"]), None)
                self.assertIsNotNone(prov_ch, f"Missing chapter_provenance entry for chapter {ch['chapterNum']}")
                self.assertEqual(hashlib.sha256(thumb.read_bytes()).hexdigest(), prov_ch["sha256"])
                self.assertIn("captureProvenance", ch)
                self.assertIn("-f", ch["captureProvenance"].get("ffmpegArgv", []))
                self.assertIn("x11grab", ch["captureProvenance"].get("ffmpegArgv", []))

            if ffprobe_bin:
                fp = subprocess.run(
                    [ffprobe_bin, "-v", "error", "-show_format", "-show_chapters", "-of", "json", str(mp4_path)],
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=15,
                )
                probe = json.loads(fp.stdout)
                tags = {k.lower(): str(v) for k, v in (probe.get("format", {}).get("tags") or {}).items()}
                self.assertEqual(tags.get("artist"), "AI Digital Twin · Google Cloud")
                self.assertIn("Pure Omni 1.2", tags.get("comment", ""))
                self.assertEqual(len(probe.get("chapters", [])), len(chapters))
                tags_low = json.dumps(tags).lower()
                for tok in BANNED_RECORDING_TOKENS:
                    self.assertNotIn(tok, tags_low, f"Banned token '{tok}' in MP4 tags of {mp4_path}")

            for f in slug_dir.rglob("*"):
                if f.is_file():
                    total_bytes += f.stat().st_size

        self.assertLessEqual(
            total_bytes,
            MAX_TOTAL_RECORDINGS_BYTES,
            f"Total recordings/ size ({total_bytes} B) exceeds {MAX_TOTAL_RECORDINGS_BYTES} B cap",
        )


if __name__ == "__main__":
    unittest.main()
