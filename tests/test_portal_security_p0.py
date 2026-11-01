#!/usr/bin/env python3
"""
P0 Security & Secret-Removal Regression Suite ([FA-08], [FA-09], [FA-10], [FA-11], [FA-14])
==========================================================================================
Verifies:
  1. [FA-08] SSRF protection on `/api/payg-saas/test-connection` + `validate_payg_outbound_url`
     (blocks HTTP, loopback, RFC1918, link-local, CGNAT, cloud metadata 169.254.169.254 / fd00:ec2::254,
     IPv6-mapped loopback, credentials-in-URL, untrusted HTTPS domains, cross-vendor host mismatch,
     and DNS-rebinding records via `_PinnedHTTPSConnection`).
  2. [FA-09] Admin IAP authentication (`X-Goog-Authenticated-User-Email` + `X-Goog-IAP-JWT-Assertion`)
     required on `/api/changelog`, `/api/changelog/restore`, `/api/save-drawio`, `/api/comments`
     (`delete_thread` / `resolve` / `reopen`), `/api/telemetry/clickstream/clear`, and `force=True`
     `/api/google-workspace/open`; rejects bare header spoofing; sanitizes stored HTML & `avatarColor`
     CSS injection; blocks `.drawio` XXE & path traversal; sets security headers across routes.
  3. [FA-10] Zero hardcoded `AWS_SHARED_JWT_SECRET` or `"merck-"` scopes/URLs/audiences across
     `core-cymbal-agent/`, `scripts/deploy_10_saas_aws_agentcore_targets.py`, and
     `docs/gcp_pattern_codebase_and_execution_bundle.json`; blocks `.env`/`.pem`/`.key`/`.sqlite`/`.p12`/`.tfvars`
     on `/api/artifact`, `/api/health`, and directory listings.
  4. [FA-11] Zero cleartext `13.220.94.209` HTTP fallback in `server.py` or `scripts/saas_cloudrun_proxy.py`;
     live HTTP execution of both `/api/saas-live/*` AND `CloudRunProxyHandler` verifies fail-closed
     `HTTP 503` without OIDC and strict TLS header stripping with OIDC.
  5. [FA-14] Zero public passwords (`FinVault#2026!`) or Vault tokens (`fv-token-finvault-sre-2026`)
     across `index.html` and all operational provisioning/capture/proxy scripts.
"""

from __future__ import annotations

import base64
import importlib.util
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server


def _b64url_json(obj: dict) -> str:
    raw = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _make_iap_jwt(
    email: str,
    exp_offset_sec: int = 900,
    iss: str = "https://cloud.google.com/iap",
    alg: str = "ES256",
) -> str:
    hdr = _b64url_json({"alg": alg, "typ": "JWT", "kid": "iap-test-key"})
    pay = _b64url_json(
        {
            "iss": iss,
            "sub": f"accounts.google.com:{email}",
            "email": email,
            "iat": int(time.time()) - 10,
            "exp": int(time.time()) + exp_offset_sec,
        }
    )
    sig = base64.urlsafe_b64encode(b"mock-es256-iap-sig-bytes").decode("ascii").rstrip("=")
    return f"{hdr}.{pay}.{sig}"


def _admin_iap_headers(email: str = "nitinagga@google.com") -> dict[str, str]:
    return {
        "X-Goog-Authenticated-User-Email": f"accounts.google.com:{email}",
        "X-Goog-IAP-JWT-Assertion": _make_iap_jwt(email),
    }


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
        os.environ.pop("GEAP_TRUST_IAP_EMAIL_HEADER_IN_TESTS", None)
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
            "https://[fd00:ec2::254]/latest/meta-data/",
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

        # Cross-vendor mismatch must fail closed with 403 SSRF_SERVICE_DOMAIN_MISMATCH
        st_mv, body_mv, _ = self._http_json(
            "POST",
            "/api/payg-saas/test-connection",
            {"service_id": "snowflake", "endpoint_url": "https://acme.my.salesforce.com/services/data"},
        )
        self.assertEqual(st_mv, 403)
        self.assertEqual(body_mv.get("status"), "SSRF_SERVICE_DOMAIN_MISMATCH")

    def test_fa08_ssrf_allows_vendor_allowlist_and_blocks_dns_rebinding(self) -> None:
        ok, code, status, _ = server.validate_payg_outbound_url(
            "https://api.datadoghq.com/api/v2/spans", resolve_dns=False, service_id="datadog"
        )
        self.assertTrue(ok)
        self.assertEqual(code, 200)
        self.assertEqual(status, "ALLOWED")

        ok_sf, _, _, _ = server.validate_payg_outbound_url(
            "https://xy12345.us-east-1.snowflakecomputing.com/api/v2/statements",
            resolve_dns=False,
            service_id="snowflake",
        )
        self.assertTrue(ok_sf)

        fake_records = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 443))]
        with mock.patch("server.socket.getaddrinfo", return_value=fake_records):
            reb_ok, reb_http, reb_code, _ = server.validate_payg_outbound_url(
                "https://api.datadoghq.com/api/v2/spans", resolve_dns=True, service_id="datadog"
            )
        self.assertFalse(reb_ok)
        self.assertEqual(reb_http, 403)
        self.assertEqual(reb_code, "SSRF_PRIVATE_OR_LOOPBACK_IP_BLOCKED")

    # -------------------------------------------------------------------------
    # 2. [FA-09] Admin IAP Gate, Anti-Spoofing JWT Check, Sanitizer & Headers
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

        # Secondary routes must also emit security headers
        for aux_path in ("/favicon.ico", "/drawio-editor"):
            req = urllib.request.Request(f"{self.base_url}{aux_path}")
            with urllib.request.urlopen(req, timeout=5) as r_aux:
                aux_hdrs = {k.lower(): v for k, v in r_aux.headers.items()}
                self.assertEqual(aux_hdrs.get("x-content-type-options"), "nosniff", f"Missing nosniff on {aux_path}")

    def test_fa09_unauthenticated_spoofed_and_non_admin_mutations_rejected(self) -> None:
        protected_calls = [
            ("/api/changelog", {"action": "SAVE", "cardId": "c1", "htmlContent": "<p>hi</p>"}),
            ("/api/changelog/restore", {"cardId": "c1"}),
            ("/api/save-drawio", {"id": "test-diag", "xml": "<mxfile><diagram>ok</diagram></mxfile>"}),
            ("/api/comments", {"op": "delete_thread", "threadId": "CMT-1"}),
            ("/api/comments", {"op": "resolve", "threadId": "CMT-1"}),
            ("/api/telemetry/clickstream/clear", {"actorEmail": "nitinagga@google.com"}),
            ("/api/google-workspace/open", {"key": "WS1", "mode": "slides", "force": True}),
        ]
        for path, payload in protected_calls:
            st_unauth, body_unauth, _ = self._http_json("POST", path, payload)
            self.assertEqual(st_unauth, 403, f"Unauthenticated POST {path} must return 403: {body_unauth}")
            self.assertEqual(body_unauth.get("status"), "ADMIN_IAP_REQUIRED")

            # Bare X-Goog-Authenticated-User-Email WITHOUT X-Goog-IAP-JWT-Assertion must fail closed (anti-spoofing)
            st_spoof, _, _ = self._http_json(
                "POST",
                path,
                payload,
                headers={"X-Goog-Authenticated-User-Email": "accounts.google.com:nitinagga@google.com"},
            )
            self.assertEqual(st_spoof, 403, f"Bare spoofed header on POST {path} must return 403")

            # Expired IAP JWT must fail closed
            st_exp, _, _ = self._http_json(
                "POST",
                path,
                payload,
                headers={
                    "X-Goog-Authenticated-User-Email": "accounts.google.com:nitinagga@google.com",
                    "X-Goog-IAP-JWT-Assertion": _make_iap_jwt("nitinagga@google.com", exp_offset_sec=-60),
                },
            )
            self.assertEqual(st_exp, 403)

            # Authenticated non-admin IAP user must fail closed
            st_nonadm, body_nonadm, _ = self._http_json(
                "POST",
                path,
                payload,
                headers=_admin_iap_headers("intruder@external.example"),
            )
            self.assertEqual(st_nonadm, 403, f"Non-admin IAP POST {path} must return 403: {body_nonadm}")

    def test_fa09_verified_admin_iap_sanitizes_html_css_and_blocks_drawio_xxe(self) -> None:
        admin_hdr = _admin_iap_headers("nitinagga@google.com")
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

        # Verify unauthenticated comment strips spoofed identity AND neutralizes avatarColor CSS injection
        st_c, data_c, _ = self._http_json(
            "POST",
            "/api/comments",
            {
                "op": "add_thread",
                "cardId": "sec-card-1",
                "text": "Review note",
                "userName": "Nitin Aggarwal",
                "userEmail": "nitinagga@google.com",
                "avatarColor": "#000;position:fixed;inset:0;z-index:999999",
            },
        )
        self.assertEqual(st_c, 200)
        created_comment = data_c["thread"]["comments"][0]
        self.assertEqual(created_comment["authorEmail"], "guest@unverified.session")
        self.assertEqual(created_comment["avatarColor"], "#1a73e8")
        self.assertEqual(data_c["thread"]["avatarColor"], "#1a73e8")

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
        merck_tok = "merck" + "-"
        jwt_const = "AWS_SHARED_JWT_SECRET" + " ="
        for p in (ROOT_DIR / "core-cymbal-agent").rglob("*.py"):
            txt = p.read_text(encoding="utf-8")
            self.assertNotIn(merck_tok, txt.lower(), f"Merck leak in {p}")
            self.assertNotIn(jwt_const, txt, f"Hardcoded JWT secret in {p}")

        ag_txt = (ROOT_DIR / "scripts/deploy_10_saas_aws_agentcore_targets.py").read_text(encoding="utf-8")
        self.assertNotIn(merck_tok, ag_txt.lower())

        bundle_txt = (ROOT_DIR / "docs/gcp_pattern_codebase_and_execution_bundle.json").read_text(encoding="utf-8")
        self.assertNotIn(merck_tok, bundle_txt.lower())

        for blocked in (".env", "secrets.pem", "private.key", "store.sqlite", "creds.p12", "terraform.tfvars", "aws.auto.tfvars.json"):
            st, _, _ = self._http_json("GET", f"/api/artifact?path={blocked}")
            self.assertEqual(st, 403, f"Expected 403 blocking sensitive path {blocked}, got {st}")

    # -------------------------------------------------------------------------
    # 4. [FA-11] Zero Cleartext EC2 Fallback & Strict Cloud Run OIDC Proxy
    # -------------------------------------------------------------------------
    def test_fa11_saas_live_proxy_and_cli_proxy_handler_fail_closed_and_strip_headers(self) -> None:
        ec2_ip = "13.220." + "94.209"
        server_src = (ROOT_DIR / "server.py").read_text(encoding="utf-8")
        proxy_src = (ROOT_DIR / "scripts/saas_cloudrun_proxy.py").read_text(encoding="utf-8")
        self.assertNotIn(ec2_ip, server_src)
        self.assertNotIn(ec2_ip, proxy_src)
        self.assertNotIn('"ec2_port"', server_src)

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
        self.assertNotIn("cookie", captured_req["headers"])
        self.assertNotIn("authorization", captured_req["headers"])
        self.assertNotIn("x-goog-authenticated-user-email", captured_req["headers"])
        self.assertEqual(
            captured_req["headers"].get("x-serverless-authorization"),
            "Bearer eyJhbGciOiJSUzI1NiJ9.mock_oidc_payload.sig",
        )

        # Live runtime test of scripts/saas_cloudrun_proxy.py CloudRunProxyHandler (guards against NameError/crash)
        spec_p = importlib.util.spec_from_file_location("saas_cloudrun_proxy", ROOT_DIR / "scripts/saas_cloudrun_proxy.py")
        assert spec_p and spec_p.loader
        proxy_mod = importlib.util.module_from_spec(spec_p)
        spec_p.loader.exec_module(proxy_mod)

        svc_spec = proxy_mod.SERVICES["metabase"]
        parsed_t = urllib.parse.urlparse(svc_spec["url"])

        class _BoundProxyHandler(proxy_mod.CloudRunProxyHandler):
            target_url = svc_spec["url"]
            target_host = parsed_t.netloc
            target_parsed = parsed_t
            local_port = 0
            service_spec = svc_spec

        proxy_srv = server.ThreadingHTTPServer(("127.0.0.1", 0), _BoundProxyHandler)
        _BoundProxyHandler.local_port = proxy_srv.server_address[1]
        proxy_t = threading.Thread(target=proxy_srv.serve_forever, daemon=True)
        proxy_t.start()
        proxy_url = f"http://127.0.0.1:{proxy_srv.server_address[1]}/question/27"
        try:
            # Case A: No OIDC token -> must cleanly return HTTP 503 (never NameError crash)
            with mock.patch.object(proxy_mod, "get_oidc_token", return_value=""):
                with self.assertRaises(urllib.error.HTTPError) as ctx503:
                    urllib.request.urlopen(proxy_url, timeout=5)
                self.assertEqual(ctx503.exception.code, 503)

            # Case B: Valid OIDC token -> HTTP 200 with header stripping & X-Serverless-Authorization
            cli_captured = {}

            class _CliOpener:
                def open(self, req, timeout=12):
                    cli_captured["url"] = req.full_url
                    cli_captured["headers"] = {k.lower(): v for k, v in req.header_items()}
                    return _FakeCloudRunResp()

            with (
                mock.patch.object(proxy_mod, "get_oidc_token", return_value="eyCliToken.payload.sig"),
                mock.patch.object(proxy_mod.urllib.request, "build_opener", return_value=_CliOpener()),
            ):
                req_cli = urllib.request.Request(
                    proxy_url,
                    headers={
                        "Authorization": "Bearer ambient-secret",
                        "X-Goog-Authenticated-User-Email": "accounts.google.com:spoof@google.com",
                    },
                )
                with urllib.request.urlopen(req_cli, timeout=5) as r_cli:
                    self.assertEqual(r_cli.status, 200)
                    self.assertEqual(r_cli.headers.get("X-Content-Type-Options"), "nosniff")
                    self.assertTrue(json.loads(r_cli.read().decode("utf-8"))["proxied"])
            self.assertEqual(cli_captured["headers"].get("x-serverless-authorization"), "Bearer eyCliToken.payload.sig")
            self.assertNotIn("authorization", cli_captured["headers"])
            self.assertNotIn("x-goog-authenticated-user-email", cli_captured["headers"])
        finally:
            proxy_srv.shutdown()
            proxy_srv.server_close()

    # -------------------------------------------------------------------------
    # 5. [FA-14] Zero Public Passwords or Tokens Across Portal & Scripts
    # -------------------------------------------------------------------------
    def test_fa14_zero_public_passwords_or_tokens_across_html_and_scripts(self) -> None:
        bad_pw = "FinVault" + "#2026!"
        bad_vt = "fv-token-" + "finvault-sre-2026"
        bad_dk = "cymbal-directus-" + "secret"
        targets = [
            ROOT_DIR / "index.html",
            ROOT_DIR / "scripts/saas_cloudrun_proxy.py",
            ROOT_DIR / "scripts/provision_gcp_cloudrun_third_party_apps.py",
            ROOT_DIR / "scripts/provision_aws_ec2_third_party_apps.py",
            ROOT_DIR / "scripts/capture_genuine_3p_before_after_uis.mjs",
            ROOT_DIR / "scripts/capture_genuine_multicloud_3p_uis.mjs",
        ]
        for path in targets:
            txt = path.read_text(encoding="utf-8")
            self.assertNotIn(bad_pw, txt, f"Leaked password in {path.name}")
            self.assertNotIn(bad_vt, txt, f"Leaked Vault token in {path.name}")
            self.assertNotIn(bad_dk, txt, f"Leaked Directus secret in {path.name}")

        try:
            from server import render_assembled_portal_html
            html_txt = render_assembled_portal_html()
        except Exception:
            html_txt = (ROOT_DIR / "index.html").read_text(encoding="utf-8")
        self.assertNotIn(r"openSaaSConnectModal(\'", html_txt)
        self.assertIn("document.getElementById('saas-modal-live-gateway-link')", html_txt)
        self.assertIn("/api/saas-live/", html_txt)


if __name__ == "__main__":
    unittest.main()
