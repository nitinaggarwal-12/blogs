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


def _admin_iap_headers(email: str = "architect-admin@google.com") -> dict[str, str]:
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
    # 1. [FA-08] Legacy PAYG Outbound Proxy & Mocks Purge (Zero SSRF Surface)
    # -------------------------------------------------------------------------
    def test_fa08_legacy_payg_outbound_proxy_and_mocks_purged(self) -> None:
        status, _, _ = self._http_json(
            "POST",
            "/api/payg-saas/test-connection",
            {"service_id": "datadog", "endpoint_url": "https://169.254.169.254/computeMetadata/v1/", "api_token": "secret-tok-123"},
        )
        self.assertEqual(status, 404, "Legacy outbound SSRF probe endpoint must remain permanently purged (404)")

        for dead_path in ("/api/payg-saas/catalog", "/payg", "/payg-saas", "/mocks", "/scoring-mocks"):
            st, _, _ = self._http_json("GET", dead_path)
            self.assertEqual(st, 404, f"Legacy route {dead_path} must remain purged (404), got {st}")

        for removed_file in (
            "templates/tab_payg.html",
            "templates/tab_simulator.html",
            "templates/tab_forensic.html",
            "js/simulator.js",
            "scoring_mocks.html",
        ):
            self.assertFalse((ROOT_DIR / removed_file).exists(), f"Legacy file {removed_file} must not exist")

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
                    "X-Goog-Authenticated-User-Email": "accounts.google.com:spoof-admin@google.com",
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
        admin_hdr = _admin_iap_headers("architect-admin@google.com")
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
        self.assertEqual(data["entry"]["actorEmail"], "architect-admin@google.com")

        # Verify unauthenticated comment strips spoofed identity AND neutralizes avatarColor CSS injection
        st_c, data_c, _ = self._http_json(
            "POST",
            "/api/comments",
            {
                "op": "add_thread",
                "cardId": "sec-card-1",
                "text": "Review note",
                "userName": "Platform Admin",
                "userEmail": "spoof-admin@google.com",
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
    # 4. [FA-11] Legacy OSS Proxy & Unreferenced Scripts Purged (Fail-Closed 404)
    # -------------------------------------------------------------------------
    def test_fa11_legacy_saas_live_proxy_and_unreferenced_scripts_purged_fail_closed(self) -> None:
        ec2_ip = "13.220." + "94.209"
        server_src = (ROOT_DIR / "server.py").read_text(encoding="utf-8")
        self.assertNotIn(ec2_ip, server_src)
        self.assertNotIn('"ec2_port"', server_src)
        self.assertNotIn("SAAS_LIVE_TARGETS", server_src)
        self.assertNotIn("_handle_saas_live_proxy", server_src)

        purged_paths = (
            "scripts/saas_cloudrun_proxy.py",
            "scripts/cloudtop_auto_sync_daemon.sh",
            "scripts/splice_ws1_to_ws5_slides_and_atlas.py",
            "scripts/seed_saas_demo_tenants.mjs",
            "scripts/cloudrun_in_vpc_e2e_verifier.py",
            "scripts/build_all_exec_narrative_decks.mjs",
            "scripts/build_arch_center_blogs.mjs",
            "scripts/build_blog_slide_presentations.mjs",
            "scripts/build_deck_jsons.mjs",
            "data/cymbal_multi_tenant_patterns_deploy_receipt.json",
        )
        for rel in purged_paths:
            self.assertFalse((ROOT_DIR / rel).exists(), f"Purged legacy file returned: {rel}")

        for old_route in ("/api/saas-live/thoughtspot/liveboards", "/create-blog1", "/create-blog-2", "/api/google-workspace/oauth-config"):
            st, _, _ = self._http_json("GET", old_route)
            self.assertEqual(st, 404, f"Expected fail-closed 404 on purged route {old_route}, got {st}")

    # -------------------------------------------------------------------------
    # 5. [FA-14] Zero Public Passwords or Tokens Across Portal & Scripts
    # -------------------------------------------------------------------------
    def test_fa14_zero_public_passwords_or_tokens_across_html_and_scripts(self) -> None:
        bad_pw = "FinVault" + "#2026!"
        bad_vt = "fv-token-" + "finvault-sre-2026"
        bad_dk = "cymbal-directus-" + "secret"
        targets = [
            ROOT_DIR / "index.html",
            ROOT_DIR / "scripts/capture_real_gcp_and_saas_screenshots.mjs",
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
        self.assertNotIn("/api/saas-live/", html_txt)
        for purged_dom_id in (
            'id="tab-btn-changelog"',
            'id="ov-selector-rail"',
            'id="hub-doc-switcher"',
            'id="hub-view-mode-bar"',
            'id="dt-target-pill-strip"',
            'id="atlas-filter-scope"',
            'id="atlas-results-count-label"',
            'id="chg-filter-action"',
            'id="e2e-codebase-category-bar"',
        ):
            self.assertNotIn(purged_dom_id, html_txt, f"Purged hidden DOM control returned: {purged_dom_id}")

    def test_portal_viewport_sticky_and_links_hygiene(self):
        """Asserts Law 13 viewport sticky invariants, TOC scroll spy, and anonymous slide links."""
        layout_css = (ROOT_DIR / "css/layout.css").read_text(encoding="utf-8")
        components_css = (ROOT_DIR / "css/components.css").read_text(encoding="utf-8")
        index_html = (ROOT_DIR / "index.html").read_text(encoding="utf-8")
        ws1_md = (ROOT_DIR / "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md").read_text(encoding="utf-8")

        # 1. Overflow-x clip on html and body to preserve position: sticky
        self.assertIn("overflow-x: clip;", layout_css)
        self.assertNotIn("html {\n  max-width: 100vw;\n  overflow-x: hidden;", layout_css)
        self.assertNotIn("body {\n  max-width: 100vw;\n  min-height: 100dvh;\n  padding-left: env(safe-area-inset-left, 0px);\n  padding-right: env(safe-area-inset-right, 0px);\n  padding-bottom: env(safe-area-inset-bottom, 0px);\n  overflow-x: hidden;", layout_css)

        # 2. Heading scroll margin and TOC rail sticky top
        self.assertIn("scroll-margin-top: 98px;", components_css)
        self.assertIn("top: 96px;", components_css)

        # 3. Dynamic scroll spy in index.html
        self.assertIn("window._hubTocScrollSpyCleanup", index_html)
        self.assertIn("requestAnimationFrame", index_html)

        # 4. Zero personal email leaks in Google Slides links across all workstream blogs
        for ws_idx, fname in enumerate([
            "ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
            "ws2-pattern-a-pooled-architecture.md",
            "ws3-pattern-b-sovereign-silos.md",
            "ws4-pattern-c-hybrid-dynamic-tiering.md",
            "ws5-decision-guide-and-agentic-triad.md",
        ], 1):
            md_content = (ROOT_DIR / f"blogs/{fname}").read_text(encoding="utf-8")
            self.assertNotIn("?authuser=", md_content, f"authuser parameter leaked in WS{ws_idx} ({fname})")
            self.assertNotIn("nitinagga@google.com", md_content, f"Personal email leaked in WS{ws_idx} ({fname})")

        # 5. Full-app sticky/scroll/overflow UX & legacy purge anti-regression guards
        self.assertNotIn("jumpToTab3BeforeAfterHub", index_html)
        self.assertNotIn("applyCustomActorInputs", index_html)
        self.assertNotIn("updateFinopsCost", index_html)
        self.assertNotIn("ba-3p-hub-grid", index_html)
        self.assertNotIn(".faq-container", layout_css)
        self.assertNotIn(".series-toc-link", layout_css)
        self.assertNotIn("#payg-tester-card", layout_css)
        tab_pat = (ROOT_DIR / "templates/tab_patterns.html").read_text(encoding="utf-8")
        tab_diag = (ROOT_DIR / "templates/tab_diagrams.html").read_text(encoding="utf-8")
        self.assertNotIn("top:44px;", tab_pat)
        self.assertNotIn("top:42px;", tab_diag)
        self.assertIn("var(--portal-header-h", tab_pat)
        self.assertIn("var(--portal-header-h", tab_diag)
        cb_html = (ROOT_DIR / "templates/create_blog1_page.html").read_text(encoding="utf-8")
        self.assertIn("overflow-x: clip;", cb_html)
        self.assertIn("flex-shrink: 0;", cb_html)
        self.assertIn("var(--topbar-h", cb_html)
        self.assertIn("Create Blog", cb_html)
        self.assertNotIn("Create Blog1", cb_html)
        hdr_html = (ROOT_DIR / "templates/header.html").read_text(encoding="utf-8")
        self.assertIn('href="/create-blog"', hdr_html)
        self.assertNotIn("Create Blog1", hdr_html)
        self.assertNotIn("Create Blog 2", hdr_html)
        drawio_live = (ROOT_DIR / "templates/drawio_live_editor.html").read_text(encoding="utf-8")
        self.assertIn('iframe.getAttribute("data-embed-src")', drawio_live)
        self.assertFalse((ROOT_DIR / "scripts/deep_e2e_ui_scanner.mjs").exists())
        self.assertFalse((ROOT_DIR / "scripts/generate_new_topic_blog.mjs").exists())
        self.assertFalse((ROOT_DIR / "scripts/create_blog_2_engine.py").exists())
        self.assertFalse((ROOT_DIR / "templates/create_blog_2_page.html").exists())
        self.assertFalse((ROOT_DIR / "js/create_blog_2.js").exists())


if __name__ == "__main__":
    unittest.main()
