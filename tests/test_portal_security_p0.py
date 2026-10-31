#!/usr/bin/env python3
"""
P0 Security & Secret-Removal Regression Suite ([FA-08], [FA-09], [FA-10], [FA-11], [FA-14])
==========================================================================================
Verifies:
  1. [FA-08] SSRF protection on `/api/payg-saas/test-connection` + `validate_payg_outbound_url`
     (blocks HTTP, loopback, RFC1918, link-local, CGNAT, cloud metadata 169.254.169.254, IPv6-mapped
     loopback, credentials-in-URL, untrusted HTTPS domains, and DNS-rebinding records).
  2. [FA-09] Admin IAP authentication (`X-Goog-Authenticated-User-Email`) required on `/api/changelog`,
     `/api/changelog/restore`, `/api/save-drawio`, `/api/comments` (`delete_thread`), and
     `/api/telemetry/clickstream/clear`; server-side HTML allowlist sanitization; XXE & path traversal
     rejection on `.drawio` saves; anti-impersonation actor normalization; security response headers.
  3. [FA-10] Zero hardcoded `AWS_SHARED_JWT_SECRET` or `"merck-"` scopes/URLs/audiences across
     `core-cymbal-agent/` and `docs/gcp_pattern_codebase_and_execution_bundle.json`; sensitive
     artifact suffixes/filenames blocked on `/api/artifact`.
  4. [FA-11] Zero cleartext `13.220.94.209` HTTP fallback in `server.py` or `scripts/saas_cloudrun_proxy.py`;
     `/api/saas-live/*` fails closed (`HTTP 503 OIDC_IDENTITY_REQUIRED`) without Cloud Run OIDC token
     and strips ambient caller cookies/auth headers when proxying to Cloud Run TLS endpoints.
  5. [FA-14] Zero public passwords (`FinVault#2026!`) or Vault tokens (`fv-token-finvault-sre-2026`)
     or invalid `openSaaSConnectModal(\'` quote escapes in `index.html` and `scripts/saas_cloudrun_proxy.py`.
"""

from __future__ import annotations

import json
from pathlib import Path
import socket
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
import urllib.error
import urllib.request

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server


class QuietPortalHandler(server.PortalRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


class TestPortalSecurityP0(unittest.TestCase):
    httpd: server.ThreadingHTTPServer
    thread: threading.Thread
    base_url: str
    tmp_dir: tempfile.TemporaryDirectory
    orig_changelog: Path
    orig_comments: Path
    orig_clickstream: Path

    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp_dir = tempfile.TemporaryDirectory()
        tpath = Path(cls.tmp_dir.name)
        cls.orig_changelog = server.CHANGELOG_FILE
        cls.orig_comments = server.COMMENTS_FILE
        cls.orig_clickstream = server.CLICKSTREAM_FILE
        server.CHANGELOG_FILE = tpath / "portal_change_log.json"
        server.COMMENTS_FILE = tpath / "portal_comments.json"
        server.CLICKSTREAM_FILE = tpath / "portal_clickstream.json"

        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), QuietPortalHandler)
        port = cls.httpd.server_address[1]
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        server.CHANGELOG_FILE = cls.orig_changelog
        server.COMMENTS_FILE = cls.orig_comments
        server.CLICKSTREAM_FILE = cls.orig_clickstream
        cls.tmp_dir.cleanup()

    def _http_json(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, dict, dict[str, str]]:
        hdrs = {"Accept": "application/json"}
        body_bytes = None
        if payload is not None:
            hdrs["Content-Type"] = "application/json"
            body_bytes = json.dumps(payload).encode("utf-8")
        if headers:
            hdrs.update(headers)
        req = urllib.request.Request(f"{self.base_url}{path}", data=body_bytes, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                resp_hdrs = {k.lower(): v for k, v in resp.headers.items()}
                return resp.status, json.loads(resp.read().decode("utf-8")), resp_hdrs
        except urllib.error.HTTPError as he:
            resp_hdrs = {k.lower(): v for k, v in he.headers.items()}
            raw = he.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}
            return he.code, parsed, resp_hdrs

    # -------------------------------------------------------------------------
    # 1. [FA-08] SSRF Protection Tests
    # -------------------------------------------------------------------------
    def test_fa08_ssrf_blocks_loopback_private_metadata_and_untrusted_hosts(self) -> None:
        blocked_vectors = [
            f"{self.base_url}/api/health",
            "http://api.datadoghq.com/api/v2/spans",
            "https://127.0.0.1/api/health",
            "https://localhost/api/health",
            "https://169.254.169.254/computeMetadata/v1/",
            "https://metadata.google.internal/computeMetadata/v1/",
            "https://10.0.0.5/internal",
            "https://172.16.4.9/internal",
            "https://192.168.1.1/admin",
            "https://100.64.0.10/cgnat",
            "https://[::1]/loopback",
            "https://[::ffff:127.0.0.1]/mapped",
            "https://evil-attacker.example.com/steal-token",
            "https://api.datadoghq.com:8080/api/v2/spans",
            "https://user:pass@api.datadoghq.com/api/v2/spans",
        ]
        for bad_url in blocked_vectors:
            status, body, _ = self._http_json(
                "POST",
                "/api/payg-saas/test-connection",
                {"service_id": "datadog", "endpoint_url": bad_url, "api_token": "secret-tok-123"},
            )
            self.assertIn(status, (400, 403), f"Expected 400/403 for {bad_url}, got {status}: {body}")
            self.assertFalse(body.get("ok", True), f"Expected ok=False for {bad_url}")
            self.assertNotIn("secret-tok-123", json.dumps(body))

    def test_fa08_ssrf_allows_vendor_allowlist_and_blocks_dns_rebinding(self) -> None:
        ok, code, status, _ = server.validate_payg_outbound_url(
            "https://api.datadoghq.com/api/v2/spans", resolve_dns=False
        )
        self.assertTrue(ok)
        self.assertEqual(code, 200)
        self.assertEqual(status, "ALLOWED")

        ok_sf, _, _, _ = server.validate_payg_outbound_url(
            "https://xy12345.us-east-1.snowflakecomputing.com/api/v2/statements", resolve_dns=False
        )
        self.assertTrue(ok_sf)

        fake_records = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 443))]
        with mock.patch("server.socket.getaddrinfo", return_value=fake_records):
            reb_ok, reb_http, reb_code, _ = server.validate_payg_outbound_url(
                "https://api.datadoghq.com/api/v2/spans", resolve_dns=True
            )
        self.assertFalse(reb_ok)
        self.assertEqual(reb_http, 403)
        self.assertEqual(reb_code, "SSRF_PRIVATE_OR_LOOPBACK_IP_BLOCKED")

    # -------------------------------------------------------------------------
    # 2. [FA-09] Admin IAP Gate, HTML Sanitizer, XXE Block & Security Headers
    # -------------------------------------------------------------------------
    def test_fa09_security_headers_and_unverified_session_identity(self) -> None:
        status, body, hdrs = self._http_json("GET", "/api/changelog")
        self.assertEqual(status, 200)
        self.assertEqual(hdrs.get("x-content-type-options"), "nosniff")
        self.assertEqual(hdrs.get("x-frame-options"), "SAMEORIGIN")
        self.assertEqual(hdrs.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("camera=()", hdrs.get("permissions-policy", ""))
        self.assertFalse(body["activeActor"]["iapVerified"])
        self.assertFalse(body["activeActor"]["isAdmin"])
        self.assertNotEqual(body["activeActor"]["actorEmail"], "nitinagga@google.com")

    def test_fa09_unauthenticated_and_non_admin_mutations_rejected(self) -> None:
        protected_calls = [
            ("/api/changelog", {"action": "SAVE", "cardId": "c1", "htmlContent": "<p>hi</p>"}),
            ("/api/changelog/restore", {"cardId": "c1"}),
            ("/api/save-drawio", {"id": "test-diag", "xml": "<mxfile><diagram>ok</diagram></mxfile>"}),
            ("/api/comments", {"op": "delete_thread", "threadId": "CMT-1"}),
            ("/api/telemetry/clickstream/clear", {"actorEmail": "nitinagga@google.com"}),
        ]
        for path, payload in protected_calls:
            st_unauth, body_unauth, _ = self._http_json("POST", path, payload)
            self.assertEqual(st_unauth, 403, f"Unauthenticated POST {path} must return 403: {body_unauth}")
            self.assertEqual(body_unauth.get("status"), "ADMIN_IAP_REQUIRED")

            st_nonadm, body_nonadm, _ = self._http_json(
                "POST",
                path,
                payload,
                headers={"X-Goog-Authenticated-User-Email": "accounts.google.com:intruder@external.example"},
            )
            self.assertEqual(st_nonadm, 403, f"Non-admin IAP POST {path} must return 403: {body_nonadm}")

    def test_fa09_verified_admin_iap_sanitizes_html_and_blocks_drawio_xxe_traversal(self) -> None:
        admin_hdr = {"X-Goog-Authenticated-User-Email": "accounts.google.com:nitinagga@google.com"}
        xss_html = (
            '<p onclick="alert(1)">Clean <strong>bold</strong> '
            '<script>window.__pwn=1</script>'
            '<img src="https://example.com/a.png" onerror="alert(2)" />'
            '<svg onload="alert(3)"></svg>'
            '<a href="javascript:alert(4)">bad</a>'
            '<a href="https://cloud.google.com" target="_blank">good</a></p>'
        )
        st, data, _ = self._http_json(
            "POST",
            "/api/changelog",
            {"action": "SAVE", "cardId": "sec-card-1", "cardTitle": "Sec Card", "htmlContent": xss_html},
            headers=admin_hdr,
        )
        self.assertEqual(st, 200)
        stored_html = data["cardOverrides"]["sec-card-1"]["htmlContent"]
        self.assertIn("<strong>bold</strong>", stored_html)
        self.assertNotIn("<script", stored_html.lower())
        self.assertNotIn("<svg", stored_html.lower())
        self.assertNotIn("onerror", stored_html.lower())
        self.assertNotIn("onclick", stored_html.lower())
        self.assertNotIn("javascript:", stored_html.lower())
        self.assertIn('rel="noopener noreferrer"', stored_html)
        self.assertEqual(data["entry"]["actorEmail"], "nitinagga@google.com")

        st_c, data_c, _ = self._http_json(
            "POST",
            "/api/comments",
            {
                "op": "add_thread",
                "cardId": "sec-card-1",
                "text": "Review note",
                "userName": "Nitin Aggarwal",
                "userEmail": "nitinagga@google.com",
            },
        )
        self.assertEqual(st_c, 200)
        created_author_email = data_c["thread"]["comments"][0]["authorEmail"]
        self.assertEqual(created_author_email, "guest@unverified.session")

        st_trav, _, _ = self._http_json(
            "POST",
            "/api/save-drawio",
            {"id": "../evil", "xml": "<mxfile><diagram>ok</diagram></mxfile>"},
            headers=admin_hdr,
        )
        self.assertEqual(st_trav, 400)

        xxe_xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><mxfile>&xxe;</mxfile>'
        st_xxe, _, _ = self._http_json(
            "POST",
            "/api/save-drawio",
            {"id": "ws1-test", "xml": xxe_xml},
            headers=admin_hdr,
        )
        self.assertEqual(st_xxe, 400)

    # -------------------------------------------------------------------------
    # 3. [FA-10] Secret & Merck Leak Purge + Sensitive Artifact Guard
    # -------------------------------------------------------------------------
    def test_fa10_zero_hardcoded_secrets_or_merck_leaks_and_artifact_guard(self) -> None:
        for p in (ROOT_DIR / "core-cymbal-agent").rglob("*.py"):
            txt = p.read_text(encoding="utf-8")
            self.assertNotIn("merck-", txt.lower(), f"Merck leak in {p}")
            self.assertNotIn("AWS_SHARED_JWT_SECRET =", txt, f"Hardcoded JWT secret in {p}")

        bundle_txt = (ROOT_DIR / "docs/gcp_pattern_codebase_and_execution_bundle.json").read_text(encoding="utf-8")
        self.assertNotIn("merck-", bundle_txt.lower())

        for blocked in (".env", "secrets.pem", "private.key", "store.sqlite", "creds.p12"):
            st, _, _ = self._http_json("GET", f"/api/artifact?path={blocked}")
            self.assertEqual(st, 403, f"Expected 403 blocking sensitive path {blocked}, got {st}")

    # -------------------------------------------------------------------------
    # 4. [FA-11] Zero Cleartext EC2 Fallback & Strict Cloud Run OIDC Proxy
    # -------------------------------------------------------------------------
    def test_fa11_saas_live_proxy_drops_cleartext_ec2_fails_closed_and_strips_cookies(self) -> None:
        server_src = (ROOT_DIR / "server.py").read_text(encoding="utf-8")
        proxy_src = (ROOT_DIR / "scripts/saas_cloudrun_proxy.py").read_text(encoding="utf-8")
        self.assertNotIn("13.220.94.209", server_src)
        self.assertNotIn("13.220.94.209", proxy_src)

        orig_urlopen = urllib.request.urlopen

        def _deny_metadata_only(req, timeout=None):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "metadata.google.internal" in url:
                raise urllib.error.URLError("metadata unavailable in test")
            return orig_urlopen(req, timeout=timeout) if timeout is not None else orig_urlopen(req)

        orig_is_file = Path.is_file

        def _hide_oidc_cache(p: Path) -> bool:
            if str(p) == "/tmp/cymbal_gcp_cloudrun_oidc_cache.json":
                return False
            return orig_is_file(p)

        with (
            mock.patch.object(Path, "is_file", _hide_oidc_cache),
            mock.patch("server.urllib.request.urlopen", side_effect=_deny_metadata_only),
        ):
            st, body, _ = self._http_json(
                "GET",
                "/api/saas-live/metabase/question/27",
                headers={"Cookie": "SACSID=secret-session-cookie; other=1"},
            )
        self.assertEqual(st, 503)
        self.assertEqual(body.get("status"), "OIDC_IDENTITY_REQUIRED")
        self.assertIn("[FA-11]", body.get("error", ""))

        # Verify that when OIDC token IS present, upstream request goes strictly to https://*.a.run.app
        # and strips caller Cookie / Authorization / X-Goog-* headers.
        captured_req = {}

        class _FakeCloudRunResp:
            status = 200
            headers = {"Content-Type": "application/json"}

            def read(self) -> bytes:
                return b'{"proxied": true}'

        class _FakeOpener:
            def open(self, req, timeout=12):
                captured_req["url"] = req.full_url
                captured_req["headers"] = {k.lower(): v for k, v in req.header_items()}
                return _FakeCloudRunResp()

        def _fake_metadata_token(req, timeout=None):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "metadata.google.internal" in url:
                class _MetaResp:
                    def __enter__(self):
                        return self

                    def __exit__(self, *args):
                        return False

                    def read(self) -> bytes:
                        return b"eyJhbGciOiJSUzI1NiJ9.mock_oidc_payload.sig"

                return _MetaResp()
            return orig_urlopen(req, timeout=timeout) if timeout is not None else orig_urlopen(req)

        with (
            mock.patch.object(Path, "is_file", _hide_oidc_cache),
            mock.patch("server.urllib.request.urlopen", side_effect=_fake_metadata_token),
            mock.patch("server.urllib.request.build_opener", return_value=_FakeOpener()),
        ):
            st_ok, body_ok, _ = self._http_json(
                "GET",
                "/api/saas-live/metabase/question/27",
                headers={
                    "Cookie": "SACSID=corp-cookie-do-not-forward",
                    "Authorization": "Bearer caller-secret",
                    "X-Goog-Authenticated-User-Email": "accounts.google.com:nitinagga@google.com",
                },
            )
        self.assertEqual(st_ok, 200)
        self.assertTrue(body_ok.get("proxied"))
        self.assertTrue(captured_req["url"].startswith("https://cymbal-gcp-metabase-bi-"))
        self.assertIn(".a.run.app/", captured_req["url"])
        self.assertNotIn("cookie", captured_req["headers"])
        self.assertNotIn("authorization", captured_req["headers"])
        self.assertNotIn("x-goog-authenticated-user-email", captured_req["headers"])
        self.assertEqual(
            captured_req["headers"].get("x-serverless-authorization"),
            "Bearer eyJhbGciOiJSUzI1NiJ9.mock_oidc_payload.sig",
        )

    # -------------------------------------------------------------------------
    # 5. [FA-14] Zero Public Passwords or Broken Escapes in HTML / Proxy
    # -------------------------------------------------------------------------
    def test_fa14_zero_public_passwords_or_tokens_in_html_and_proxy(self) -> None:
        html_txt = (ROOT_DIR / "index.html").read_text(encoding="utf-8")
        proxy_txt = (ROOT_DIR / "scripts/saas_cloudrun_proxy.py").read_text(encoding="utf-8")
        self.assertNotIn("FinVault#2026!", html_txt)
        self.assertNotIn("fv-token-finvault-sre-2026", html_txt)
        self.assertNotIn(r"openSaaSConnectModal(\'", html_txt)
        self.assertNotIn("FinVault#2026!", proxy_txt)
        self.assertNotIn("fv-token-finvault-sre-2026", proxy_txt)
        self.assertIn("document.getElementById('saas-modal-live-gateway-link')", html_txt)
        self.assertIn("/api/saas-live/", html_txt)


if __name__ == "__main__":
    unittest.main()
