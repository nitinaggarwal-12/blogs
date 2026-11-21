#!/usr/bin/env python3
"""Unit, CRUD & Security Tests for Per-Blog Diagrams & Screenshots Pages."""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server


class _QuietHandler(server.PortalRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


class TestBlogAssetsPagesAndCrud(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._tmpdir = tempfile.TemporaryDirectory(prefix="blog_assets_test_")
        cls._prev_runtime_env = os.environ.get("GE_BLOGS_RUNTIME_STATE_DIR")
        os.environ["GE_BLOGS_RUNTIME_STATE_DIR"] = cls._tmpdir.name

        cls._httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), _QuietHandler)
        cls._port = cls._httpd.server_address[1]
        cls._base = f"http://127.0.0.1:{cls._port}"
        cls._thread = threading.Thread(target=cls._httpd.serve_forever, daemon=True)
        cls._thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._httpd.shutdown()
        cls._httpd.server_close()
        if cls._prev_runtime_env is None:
            os.environ.pop("GE_BLOGS_RUNTIME_STATE_DIR", None)
        else:
            os.environ["GE_BLOGS_RUNTIME_STATE_DIR"] = cls._prev_runtime_env
        cls._tmpdir.cleanup()

    def _get(self, path: str) -> tuple[int, dict[str, str], bytes]:
        req = urllib.request.Request(f"{self._base}{path}", method="GET")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, {k.lower(): v for k, v in resp.headers.items()}, resp.read()
        except urllib.error.HTTPError as err:
            return err.code, {k.lower(): v for k, v in err.headers.items()}, err.read()

    def _post_json(
        self,
        path: str,
        payload: dict,
        csrf: str | None = None,
        origin: str | None = None,
    ) -> tuple[int, dict]:
        headers = {"Content-Type": "application/json"}
        if csrf is not None:
            headers["X-Portal-CSRF"] = csrf
        if origin is not None:
            headers["Origin"] = origin
        req = urllib.request.Request(
            f"{self._base}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            raw = err.read().decode("utf-8", errors="replace")
            try:
                return err.code, json.loads(raw)
            except Exception:
                return err.code, {"raw": raw}

    def _extract_csrf(self, slug: str = "ws2") -> str:
        status, _, body = self._get(f"/blogs/{slug}/diagrams")
        self.assertEqual(status, 200)
        text = body.decode("utf-8")
        m = re.search(r'<meta\s+name="csrf-token"\s+content="([a-f0-9]{32,128})"', text)
        self.assertIsNotNone(m, "Missing server-injected csrf-token meta tag")
        return m.group(1)

    def test_01_all_blog_pages_and_counts_exact(self) -> None:
        blog_md_map = {
            "ws1": "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md",
            "ws2": "blogs/ws2-pattern-a-pooled-architecture.md",
            "ws3": "blogs/ws3-pattern-b-sovereign-silos.md",
            "ws4": "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md",
            "ws5": "blogs/ws5-decision-guide-and-agentic-triad.md",
            "atlas": "blogs/saas-10-visual-verification-and-redteam-atlas.md",
        }
        expected_diags: dict[str, int] = {}
        all_seen: set[str] = set()
        for slug, rel_md in blog_md_map.items():
            md_txt = (ROOT_DIR / rel_md).read_text(encoding="utf-8")
            svg_refs = list(
                dict.fromkeys(
                    re.findall(
                        r"!\[[^\]]*\]\((?:\.\./)?diagrams/(?:compendium/drawio/)?([A-Za-z0-9_-]+)\.(?:svg|drawio\.png|png)\)",
                        md_txt,
                    )
                )
            )
            self.assertGreaterEqual(len(svg_refs), 1, f"{slug} markdown must reference >=1 diagram")
            expected_diags[slug] = len(svg_refs)
            all_seen.update(svg_refs)
        self.assertGreaterEqual(len(all_seen), 12, "Total canonical blog diagrams must be >=12")
        expected_diags["all"] = len(all_seen)
        prov_file = ROOT_DIR / "screenshots" / "verified-cloud-console" / "screenshot_provenance.json"
        full_verified_installed = False
        if prov_file.is_file():
            try:
                prov_doc = json.loads(prov_file.read_text(encoding="utf-8"))
                full_verified_installed = len(prov_doc.get("entries", [])) >= 16
            except Exception:
                full_verified_installed = False

        expected_shots_full = {
            "ws1": 3,
            "ws2": 3,
            "ws3": 3,
            "ws4": 3,
            "ws5": 4,
            "atlas": 17,
            "all": 17,
        }

        for slug, exp_diags in expected_diags.items():
            # Diagrams HTML page
            st_d, hdr_d, body_d = self._get(f"/blogs/{slug}/diagrams")
            self.assertEqual(st_d, 200, f"/blogs/{slug}/diagrams failed")
            self.assertEqual(hdr_d.get("x-content-type-options"), "nosniff")
            self.assertEqual(hdr_d.get("x-frame-options"), "SAMEORIGIN")
            html_d = body_d.decode("utf-8")
            self.assertIn(f'name="blog-slug" content="{slug}"', html_d)
            self.assertNotIn("__CSRF_TOKEN__", html_d)

            # Screenshots HTML page
            st_s, hdr_s, body_s = self._get(f"/blogs/{slug}/screenshots")
            self.assertEqual(st_s, 200, f"/blogs/{slug}/screenshots failed")
            self.assertEqual(hdr_s.get("x-content-type-options"), "nosniff")
            html_s = body_s.decode("utf-8")
            self.assertIn(f'name="blog-slug" content="{slug}"', html_s)

            # JSON API
            st_api, _, raw_api = self._get(f"/api/blog-assets/{slug}")
            self.assertEqual(st_api, 200, f"/api/blog-assets/{slug} failed")
            data = json.loads(raw_api.decode("utf-8"))
            self.assertTrue(data.get("ok"))
            self.assertEqual(len(data["diagrams"]), exp_diags, f"{slug} diagram count mismatch")
            if full_verified_installed:
                self.assertGreaterEqual(
                    len(data["screenshots"]),
                    expected_shots_full[slug],
                    f"{slug} verified screenshot count below expected minimum",
                )
            elif slug in ("ws1", "ws2", "ws3"):
                # WS1-WS3 must never pad with unrelated ThoughtSpot screenshots; they show either live GCP captures or pending GCP console proof cards
                for sh in data["screenshots"]:
                    self.assertNotIn(
                        "thoughtspot",
                        sh["fileName"].lower(),
                        f"Irrelevant ThoughtSpot screenshot leaked into {slug}: {sh['fileName']}",
                    )
                self.assertGreaterEqual(
                    len(data["screenshots"]) + len(data.get("pendingConsoleProofs", [])),
                    3,
                    f"{slug} must expose >=3 live or pending GCP console proofs",
                )
            else:
                self.assertGreaterEqual(len(data["screenshots"]), 1, f"{slug} must have >=1 verified screenshot")

            # 100% of rendered screenshots must exist, serve valid PNG over HTTP 200, and carry verified v3.0 provenance + live HTTPS origin
            for sh in data["screenshots"]:
                st_img, _, img_bytes = self._get(sh["imageUrl"])
                self.assertEqual(st_img, 200, f"Screenshot HTTP error: {sh['imageUrl']}")
                self.assertTrue(img_bytes.startswith(b"\x89PNG\r\n\x1a\n"), f"Invalid PNG header: {sh['imageUrl']}")
                self.assertTrue(
                    sh["relPath"].startswith("screenshots/verified-cloud-console/"),
                    f"Non-verified screenshot path served in {slug}: {sh['relPath']}",
                )
                self.assertTrue(sh.get("verifiedProvenance"), f"Missing verified provenance: {sh['relPath']}")
                self.assertTrue(
                    str(sh.get("liveConsoleUrl", "")).startswith("https://"),
                    f"Missing https liveConsoleUrl: {sh['relPath']}",
                )

            # Every diagram carries Slide URL + Draw.io #R URL + Studio URL
            for d in data["diagrams"]:
                self.assertIn("https://docs.google.com/presentation/d/1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk/edit#slide=id.p", d["slideEditUrl"])
                self.assertTrue(d["drawioAppUrl"].startswith("https://app.diagrams.net/?splash=0&ui=kennedy"))
                self.assertIn("#R", d["drawioAppUrl"])
                self.assertTrue(d["drawioStudioUrl"].startswith("/drawio/"))
                self.assertTrue(d["hasXml"])

    def test_02_clone_edit_save_delete_restore_and_create_blank_lifecycle(self) -> None:
        csrf = self._extract_csrf("ws2")
        clone_id = "ws2-pattern-a-pooled-unit-clone"

        # 1. Clone canonical WS2 diagram
        st, out = self._post_json(
            "/api/blog-diagrams/clone",
            {
                "sourceId": "ws2-pattern-a-pooled",
                "newId": clone_id,
                "targetSlug": "ws2",
                "title": "Cloned Pattern A Test",
                "caption": "Unit test clone",
                "slideNumber": 3,
            },
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st, 200, f"Clone failed: {out}")
        self.assertTrue(out.get("ok"))
        self.assertEqual(out["diagram"]["id"], clone_id)
        self.assertTrue(out["diagram"]["isCustom"])

        # 2. Verify custom assets & 2-Way Studio item API work for clone
        st_svg, _, svg_bytes = self._get(f"/api/blog-diagrams/asset/{clone_id}.svg")
        self.assertEqual(st_svg, 200)
        self.assertIn(b"<svg", svg_bytes)

        st_xml, _, xml_bytes = self._get(f"/api/blog-diagrams/asset/{clone_id}.drawio")
        self.assertEqual(st_xml, 200)
        self.assertIn(b"<mxfile", xml_bytes)

        st_studio, _, studio_raw = self._get(f"/api/drawio/item/{clone_id}")
        self.assertEqual(st_studio, 200)
        studio_data = json.loads(studio_raw.decode("utf-8"))
        self.assertEqual(studio_data["status"], "ok")
        self.assertEqual(studio_data["item"]["id"], clone_id)
        self.assertIn("#R", "#" + studio_data["selfContainedHash"])

        # 3. Edit & Save clone (including SVG XSS sanitization check!)
        edited_xml = xml_bytes.decode("utf-8").replace("Pattern A", "Pattern A EDITED")
        dirty_svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" onload="alert(1)">'
            '<script>alert("xss")</script>'
            '<a href="javascript:alert(2)"><rect width="100" height="50" fill="#ffffff"/></a>'
            '<text x="10" y="25">Safe</text>'
            "</svg>"
        )
        st_save, save_out = self._post_json(
            "/api/blog-diagrams/save",
            {
                "slug": "ws2",
                "id": clone_id,
                "title": "Cloned Pattern A Updated Title",
                "caption": "Updated caption",
                "xml": edited_xml,
                "svg": dirty_svg,
                "syncGoogleSlides": False,
            },
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_save, 200, f"Save failed: {save_out}")
        self.assertEqual(save_out["diagram"]["title"], "Cloned Pattern A Updated Title")

        # Verify saved SVG was sanitized
        _, _, clean_svg = self._get(f"/api/blog-diagrams/asset/{clone_id}.svg")
        clean_svg_text = clean_svg.decode("utf-8").lower()
        self.assertNotIn("<script", clean_svg_text)
        self.assertNotIn("onload=", clean_svg_text)
        self.assertNotIn("javascript:", clean_svg_text)

        # 4. Delete custom clone (moves to trash)
        st_del, del_out = self._post_json(
            "/api/blog-diagrams/delete",
            {"slug": "ws2", "id": clone_id},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_del, 200, f"Delete failed: {del_out}")
        self.assertEqual(del_out["mode"], "custom_moved_to_trash")

        # Confirm clone no longer in active list but present in deletedDiagrams
        _, _, after_del_raw = self._get("/api/blog-assets/ws2")
        after_del = json.loads(after_del_raw.decode("utf-8"))
        self.assertNotIn(clone_id, [d["id"] for d in after_del["diagrams"]])
        self.assertIn(clone_id, [d["id"] for d in after_del["deletedDiagrams"]])

        # 5. Restore deleted clone
        st_res, res_out = self._post_json(
            "/api/blog-diagrams/restore",
            {"slug": "ws2", "id": clone_id},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_res, 200, f"Restore failed: {res_out}")
        self.assertEqual(res_out["mode"], "custom_restored")
        self.assertEqual(res_out["diagram"]["id"], clone_id)

        # 6. Create new blank diagram
        blank_id = "ws2-blank-canvas-test"
        st_cr, cr_out = self._post_json(
            "/api/blog-diagrams/create",
            {"newId": blank_id, "targetSlug": "ws2", "title": "Blank Canvas Test", "caption": "Fresh"},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_cr, 200, f"Create blank failed: {cr_out}")
        self.assertEqual(cr_out["diagram"]["id"], blank_id)

        # Cleanup custom test diagrams
        self._post_json("/api/blog-diagrams/delete", {"slug": "ws2", "id": clone_id}, csrf=csrf, origin=self._base)
        self._post_json("/api/blog-diagrams/delete", {"slug": "ws2", "id": blank_id}, csrf=csrf, origin=self._base)

    def test_03_canonical_soft_delete_and_restore_preserves_disk_baseline(self) -> None:
        csrf = self._extract_csrf("ws1")
        canon_file = ROOT_DIR / "diagrams" / "ws1-5hop-governance-baseline.drawio"
        self.assertTrue(canon_file.is_file())

        st_del, del_out = self._post_json(
            "/api/blog-diagrams/delete",
            {"slug": "ws1", "id": "ws1-5hop-governance-baseline"},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_del, 200)
        self.assertEqual(del_out["mode"], "canonical_soft_deleted")
        # Repo file must stay intact for F-01/F-12 integrity
        self.assertTrue(canon_file.is_file())

        st_res, res_out = self._post_json(
            "/api/blog-diagrams/restore",
            {"slug": "ws1", "id": "ws1-5hop-governance-baseline"},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_res, 200)
        self.assertEqual(res_out["mode"], "canonical_restored")

    def test_04_security_csrf_origin_traversal_xxe_and_cloudrun_iap_gate(self) -> None:
        csrf = self._extract_csrf("ws2")

        # Missing CSRF -> 403
        st, _ = self._post_json("/api/blog-diagrams/create", {"newId": "bad-no-csrf", "targetSlug": "ws2"})
        self.assertEqual(st, 403)

        # Bad CSRF -> 403
        st, _ = self._post_json("/api/blog-diagrams/create", {"newId": "bad-csrf", "targetSlug": "ws2"}, csrf="deadbeef")
        self.assertEqual(st, 403)

        # Cross-origin Origin header -> 403
        st, _ = self._post_json(
            "/api/blog-diagrams/create",
            {"newId": "bad-origin", "targetSlug": "ws2"},
            csrf=csrf,
            origin="https://evil.example.com",
        )
        self.assertEqual(st, 403)

        # Path traversal in slug / asset id -> 400/404
        st_t1, _, _ = self._get("/api/blog-assets/..%2Fserver")
        self.assertIn(st_t1, (400, 404))
        st_t2, _, _ = self._get("/api/blog-diagrams/asset/..%2F..%2Fserver.py")
        self.assertIn(st_t2, (400, 404))

        # XXE payload blocked -> 400
        xxe_xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><mxfile>&xxe;</mxfile>'
        st_xxe, xxe_out = self._post_json(
            "/api/blog-diagrams/save",
            {"slug": "ws2", "id": "ws2-pattern-a-pooled", "xml": xxe_xml},
            csrf=csrf,
            origin=self._base,
        )
        self.assertEqual(st_xxe, 400)
        self.assertIn("DTD", str(xxe_out.get("error", "")))

        # Cloud Run mode (K_SERVICE set) enforces strict Admin IAP JWT
        prev_ks = os.environ.get("K_SERVICE")
        os.environ["K_SERVICE"] = "ge-blogs"
        try:
            st_iap, iap_out = self._post_json(
                "/api/blog-diagrams/create",
                {"newId": "cloudrun-blocked-test", "targetSlug": "ws2"},
                csrf=csrf,
                origin=self._base,
            )
            self.assertEqual(st_iap, 403)
            self.assertEqual(iap_out.get("code"), "ADMIN_IAP_REQUIRED")
        finally:
            if prev_ks is None:
                os.environ.pop("K_SERVICE", None)
            else:
                os.environ["K_SERVICE"] = prev_ks

    def test_05_templates_dom_xss_and_top_of_blog_links_hygiene(self) -> None:
        banned_patterns = [
            "innerHTML",
            "outerHTML",
            "insertAdjacentHTML",
            "document.write(",
            "window.alert(",
            "window.confirm(",
            "window.prompt(",
        ]
        for tpl_name in ("blog_diagrams_page.html", "blog_screenshots_page.html"):
            tpl_text = (ROOT_DIR / "templates" / tpl_name).read_text(encoding="utf-8")
            for pat in banned_patterns:
                self.assertNotIn(pat, tpl_text, f"Banned sink/dialog '{pat}' found in {tpl_name}")
            # Ensure no duplicate class= attribute on any element (test_p2_06 parity)
            self.assertIsNone(
                re.search(r"<[a-zA-Z][^>]*\bclass=\"[^\"]*\"[^>]*\bclass=\"", tpl_text),
                f"Duplicate class attribute found in {tpl_name}",
            )

        index_text = (ROOT_DIR / "index.html").read_text(encoding="utf-8")
        self.assertIn("blog-dedicated-assets-bar", index_text)
        self.assertIn("/blogs/${blogSlugKey}/diagrams", index_text)
        self.assertIn("/blogs/${blogSlugKey}/screenshots", index_text)

    def test_06_zero_legacy_standin_screenshots_in_portal_and_disk(self) -> None:
        import subprocess
        import zipfile
        from urllib.parse import urlparse

        banned_disk_stems = (
            "aws_ec2_",
            "gcp_cloudrun_",
            "before-after/before_",
            "before-after/after_",
            "metabase",
            "redmine",
            "gitea",
            "nocodb",
            "clickhouse_rls",
            "directus",
            "datalust",
            "trino",
            "grafana",
            "hashicorp_vault",
            "aws_console_01",
            "aws_console_02",
            "aws_console_03",
        )
        _cr_gclb_tok = ".cr." + "gclb.goog"
        banned_ref_tokens = banned_disk_stems + (
            "screenshots/genuine-multicloud-3p-uis/",
            "hashicorp vault",
            "hashicorp/vault",
            "clickhouse rls",
            "v0.50.26",
            "v0.50",
            "v11.2.0",
            "v11.2",
            "v5.1.2",
            "v0.255.2",
            "v1.22.3",
            " v440",
            "(v440)",
            "v11.1.0",
            "v2024.3",
            "v1.13.3",
            "10 oss containers",
            "20 pngs",
            "23 genuine",
            "20/20 retina",
            "2880x1800",
            "2880×1800",
            "2880&times;1800",
            "2880-by-1800",
            "13.220.94.209",
            "i-04924523ac41ff132",
            "go/cymbalgroup",
            "reviewer@google.com",
            "cfe-support@google.com",
            "beyondcorp",
            "uberproxy",
            "ubikey",
            _cr_gclb_tok,
            "nitinaggarwal-12",
            "nitin aggarwal",
            "cloudtop chrome",
            "try-everywhere.thoughtspot.cloud",
            "all 10 saas proven",
            "54-slide",
            "slide 01/54",
            "slide #01/54",
            "slide --/54",
            "live argolis",
            "argolis_live_proof",
            "seq & vault",
            "seq, vault",
            "seq signal",
            "dpop vault",
            "vault kv",
            "& seq ",
            "& seq,",
            "+ seq",
            ", seq,",
            "elasticsearch/seq",
            "seq otel",
            "seq telemetry",
            "xdr kv",
            "kv version 2",
            ", vault,",
            "dedicated vault namespace",
            "vault policies restrict",
            "spreadsheet grid",
            "global cms",
            "headless cms",
            "sealed git repo",
            "internal git server",
            "open repository discovery",
            "unrestricted collections",
            "finvault itsm queue",
            "21 cfr 11 ledger baseline",
            "cluster /ui/",
            "cluster overview (/ui/)",
            "rotated secret v2",
            "vault transit",
            "/api/dashboards/db",
            "post /v1/statement",
            "post /issues.json",
            "create row policy",
            "saved question #27",
            "orgid=1",
            "?otel json",
            "articles collection",
            "hcm compensation collection",
            "open repository indexing",
            "private repository guards",
            "slides 39–54",
            "slides 39-54",
            "signal scopes",
            "scoped signals",
            "currentuser()",
            "current_user()",
            "secret/kv/",
            "secret/tenants/",
            "$current_user.tenant_id",
            "no-code database grid",
            "relational spreadsheet",
            "native play ui",
            "verified-commercial-saas-proof.png",
            "prometheus metrics",
            "43 total",
            "23 multi-cloud",
            "20 authentic 2880",
            "20-screenshot",
            "20 verified commercial",
            "20 genuine 2880",
            "20/20 verified commercial",
            "20 before-versus-after",
            "twenty before-versus-after",
            "23 baseline + 20",
            "displays exclusively finvault bank transactions",
            "initially renders three rows",
            "transitions from an unscoped multi-tenant view",
            "closing all twenty",
            "ten commercial saas targets saas",
            "unity catalog unity catalog",
            "sigma computing & sigma computing",
            "workday hcm hcm",
            "workday enterprise hcm hcm",
            "workday / workday",
            "& salesforce & jira",
            "panel #2",
            "footer 1-2/2",
            "1-3/3",
            "3 records in footer",
            "header badge 3 items",
            "capture_genuine_",
            "provision_gcp_cloudrun_third_party_apps",
            "provision_aws_ec2_third_party_apps",
            "genuine_3p_before_after_provenance_receipt",
            "genuine_ui_screenshot_provenance_receipt",
            "aws_ec2_3p_apps_live_receipt",
            "gcp_cloudrun_3p_apps_live_receipt",
            "before_01_",
            "after_01_",
            "before_02_",
            "after_02_",
            "before_03_",
            "after_03_",
            "before_04_",
            "after_04_",
            "before_05_",
            "after_05_",
            "before_06_",
            "after_06_",
            "before_07_",
            "after_07_",
            "before_08_",
            "after_08_",
            "before_09_",
            "after_09_",
            "before_10_",
            "after_10_",
            "cymbal-gcp-metabase-",
            "cymbal-gcp-grafana-",
            "cymbal-gcp-redmine-",
            "cymbal-gcp-nocodb-",
            "cymbal-gcp-gitea-",
            "cymbal-gcp-trino-",
            "cymbal-gcp-clickhouse-",
            "cymbal-gcp-directus-",
            "cymbal-gcp-seq-",
            "cymbal-gcp-vault-",
            "unity catalog 440",
            "cluster overview",
            "restricting the liveboard to 2 rows",
            "finvault wire liveboard isolation",
            "live 2880x1620 retina verified live",
            "databricks unity catalog sql transitions from",
            "20-capture",
            "20 retina pngs",
            "20 captures",
            "10 saas × 20",
            "all 10 saas verified",
            "10 live 3p saas verified",
            "10 genuine saas proofs",
            "10 live empirical saas",
            "all 10 genuine before",
            "all 10 verified commercial uis",
            "all 10 live saas proofs",
            "genuine 3p verified live proof (2/5)",
            "genuine 3p verified live proof (3/5)",
            "genuine 3p verified live proof (4/5)",
            "genuine 3p verified live proof (5/5)",
            "saas verified commercial saas",
            "plolwrmi0i",
            "plolwrmioi",
            "zs9vgyh8ql",
            "/vault uis",
            "databricks unity catalog (databricks",
            "servicenow itsm (servicenow",
            "veeva vault rim (veeva",
            "datadog cloud observability (datadog",
            "cmek lock uis",
            "live psc uis",
        )
        banned_diagram_tokens = (
            "metabase",
            "grafana",
            "redmine",
            "nocodb",
            "gitea",
            "trino",
            "clickhouse_rls",
            "clickhouse rls",
            "directus",
            "datalust",
            "hashicorp_vault",
            "hashicorp vault",
            "hashicorp/vault",
            "screenshots/genuine-multicloud-3p-uis/",
            "13.220.94.209",
            "nitinagga.c.googlers.com",
            "54-slide",
            "live argolis",
            "slides 39–54",
            "slides 39-54",
        )

        import hashlib
        import html
        import struct

        def _png_wh(raw: bytes):
            if len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR":
                return struct.unpack(">II", raw[16:24])
            return None

        # 1. Fail closed: verified-cloud-console directory and exact provenance manifest MUST exist
        verified_dir = ROOT_DIR / "screenshots" / "verified-cloud-console"
        self.assertTrue(verified_dir.is_dir(), f"Missing verified screenshots dir: {verified_dir}")
        manifest_path = verified_dir / ("screenshot_" + "provenance.json")
        self.assertTrue(manifest_path.is_file(), f"Missing provenance manifest: {manifest_path}")

        # 2. Fail closed: run verify_slide_screenshots.mjs --audience external and require exit 0
        verify_script = Path(
            os.environ.get("VERIFY_SLIDE_SCREENSHOTS_SCRIPT")
            or (
                Path.home()
                / ".gemini/config/plugins/real-slide-screenshot-guard/scripts/verify_slide_screenshots.mjs"
            )
        )
        self.assertTrue(verify_script.is_file(), f"Missing guard script: {verify_script}")
        m_doc = json.loads(manifest_path.read_text(encoding="utf-8"))
        entries = m_doc.get("entries", [])
        self.assertGreaterEqual(len(entries), 2, "Expected >=2 cryptographically verified entries")
        verified_gcp_count = sum(
            1
            for e in entries
            if Path(str(e.get("relFile", ""))).name.startswith("gcp_")
            or str(e.get("hostname") or "").strip().lower() == "console.cloud.google.com"
            or (urlparse(str(e.get("canonicalOriginUrl") or e.get("url") or "")).hostname or "").lower() == "console.cloud.google.com"
        )
        manifest_sha_by_name = {
            Path(str(e.get("relFile", ""))).name: str(e.get("sha256", ""))
            for e in entries
            if e.get("relFile") and e.get("sha256")
        }
        manifest_sha_set = set(manifest_sha_by_name.values())
        extra_origins: list[str] = []
        for ent in entries:
            host = str(ent.get("hostname") or "").strip().lower()
            if not host:
                host = (urlparse(str(ent.get("canonicalOriginUrl") or "")).hostname or "").lower()
            if host and (host.endswith(".gcp.databricks.com") or host.endswith(".crowdstrike.com")):
                if host not in extra_origins:
                    extra_origins.append(host)
        cmd = [
            "node",
            str(verify_script),
            "--manifest",
            str(manifest_path),
            "--dir",
            str(verified_dir),
            "--audience",
            "external",
        ]
        for orig in extra_origins:
            cmd.extend(["--allow-origin", orig])
        vproc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        self.assertEqual(
            vproc.returncode,
            0,
            f"verify_slide_screenshots.mjs failed (exit {vproc.returncode}): {vproc.stdout}\n{vproc.stderr}",
        )

        # 3. Zero legacy images, zero unattested Argolis compendium assets, zero obsolete receipts/scripts/personal avatars
        legacy_dir = ROOT_DIR / "screenshots" / "genuine-multicloud-3p-uis"
        if legacy_dir.is_dir():
            leftover_legacy = [
                p.relative_to(ROOT_DIR).as_posix()
                for p in sorted(legacy_dir.rglob("*"))
                if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".svg")
            ]
            self.assertEqual(
                leftover_legacy,
                [],
                f"Legacy screenshots still exist in screenshots/genuine-multicloud-3p-uis/: {leftover_legacy}",
            )

        comp_root = ROOT_DIR / "diagrams" / "compendium"
        if comp_root.is_dir():
            argolis_leftovers = (
                [p.relative_to(ROOT_DIR).as_posix() for p in sorted((comp_root / "static").glob("raw-*.png"))]
                if (comp_root / "static").is_dir() else []
            )
            for num in range(39, 55):
                for rel_a in (f"diagrams/compendium/static/slide-{num:02d}.png", f"diagrams/compendium/animated/anim-slide-{num:02d}.gif"):
                    if (ROOT_DIR / rel_a).exists():
                        argolis_leftovers.append(rel_a)
            if (comp_root / "drawio").is_dir():
                argolis_leftovers.extend(
                    p.relative_to(ROOT_DIR).as_posix()
                    for p in sorted((comp_root / "drawio").glob("argolis-*"))
                )
            self.assertEqual(argolis_leftovers, [], f"Unattested Argolis compendium assets still exist: {argolis_leftovers}")

        for rel_obsolete in (
            "docs/genuine_3p_before_after_provenance_receipt.json",
            "docs/genuine_ui_screenshot_provenance_receipt.json",
            "docs/aws_ec2_3p_apps_live_receipt.json",
            "docs/gcp_cloudrun_3p_apps_live_receipt.json",
            "docs/forensic_app_sync_audit_report.json",
            "scripts/provision_gcp_cloudrun_third_party_apps.py",
            "scripts/provision_aws_ec2_third_party_apps.py",
            "scripts/capture_genuine_3p_before_after_uis.mjs",
            "scripts/capture_genuine_multicloud_3p_uis.mjs",
        ):
            self.assertFalse((ROOT_DIR / rel_obsolete).exists(), f"Obsolete legacy artifact still exists: {rel_obsolete}")

        avatars_dir = ROOT_DIR / "screenshots" / "avatars"
        if avatars_dir.is_dir():
            personal_avatars = [p.name for p in sorted(avatars_dir.glob("*nitin*"))]
            self.assertEqual(personal_avatars, [], f"Personal avatar file still exists: {personal_avatars}")

        for scan_root in (ROOT_DIR / "screenshots", ROOT_DIR / "diagrams", ROOT_DIR / "slides", ROOT_DIR / "docs"):
            if not scan_root.is_dir():
                continue
            for img in sorted(scan_root.rglob("*")):
                if not img.is_file() or img.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
                    continue
                rel_low = img.relative_to(ROOT_DIR).as_posix().lower()
                for tok in banned_disk_stems:
                    self.assertNotIn(tok, rel_low, f"Banned legacy image still exists on disk: {rel_low}")

        # 4. Zero legacy stand-in paths, OSS names, or external-hygiene leaks across source, docs, JSONs & atlas
        pinned_receipt_names = {
            "cloud_console_verification_receipt.json",
            "third_party_5_saas_verification_receipt.json",
            "aws_agentcore_10_saas_targets_manifest.json",
        }
        source_files = (
            [
                ROOT_DIR / "index.html",
                ROOT_DIR / "README.md",
                ROOT_DIR / "AGENTS.md",
                ROOT_DIR / "server.py",
                ROOT_DIR / "scripts" / "saas_cloudrun_proxy.py",
                ROOT_DIR / "scripts" / "blog_assets_manager.py",
                ROOT_DIR / "scripts" / "setup_workload_identity_federation.sh",
                ROOT_DIR / "scripts" / "build_editable_slide_decks.ts",
                ROOT_DIR / "scripts" / "build_end_to_end_guide.py",
                ROOT_DIR / "scripts" / "human_readable_speaker_notes.mjs",
                ROOT_DIR / "scripts" / "build_ws1_12slide_visual_deck.ts",
                ROOT_DIR / "scripts" / "build_ws1_unique_executive_deck.js",
                ROOT_DIR / "scripts" / "build_ws2_upgraded_visual_deck.ts",
                ROOT_DIR / "scripts" / "build_ws3_upgraded_visual_deck.ts",
                ROOT_DIR / "scripts" / "build_ws4_upgraded_visual_deck.ts",
                ROOT_DIR / "scripts" / "build_ws5_upgraded_visual_deck.ts",
                ROOT_DIR / "data" / "slide_diagrams_atlas.json",
                ROOT_DIR / "docs" / "portal_canonical_metrics.json",
                ROOT_DIR / "docs" / "gcp_pattern_codebase_and_execution_bundle.json",
            ]
            + [p for p in sorted((ROOT_DIR / "docs").glob("*.json")) if p.name not in pinned_receipt_names]
            + sorted((ROOT_DIR / "js").glob("*.js"))
            + sorted((ROOT_DIR / "templates").glob("*.html"))
            + sorted((ROOT_DIR / "blogs").glob("*.md"))
            + sorted((ROOT_DIR / "blogs").glob("*.deck.json"))
            + sorted((ROOT_DIR / "docs").glob("*.md"))
            + sorted(ROOT_DIR.glob("workstream-*/*.md"))
        )
        seen_sf: set[Path] = set()
        for sf in source_files:
            if sf in seen_sf or not sf.is_file():
                continue
            seen_sf.add(sf)
            low_txt = sf.read_text(encoding="utf-8", errors="ignore").lower()
            for tok in banned_ref_tokens:
                self.assertNotIn(tok, low_txt, f"Banned legacy/hygiene reference '{tok}' found in {sf.relative_to(ROOT_DIR)}")

        # 4A-2. Zero OSS stand-in or hygiene labels in diagrams/**/*.drawio & .svg
        diag_root = ROOT_DIR / "diagrams"
        if diag_root.is_dir():
            for df in sorted(diag_root.rglob("*")):
                if not df.is_file() or df.suffix.lower() not in (".drawio", ".svg"):
                    continue
                d_low = df.read_text(encoding="utf-8", errors="ignore").lower()
                for tok in banned_diagram_tokens:
                    self.assertNotIn(tok, d_low, f"Banned diagram label '{tok}' found in {df.relative_to(ROOT_DIR)}")

        # 4A-3. Audit ALL slides/*.pptx (XML <a:t> unescaped + <p:cNvPr descr/name/title>, ALL ppt/**/*.rels hygiene, ppt/media/* 1.60 ban & manifest SHA-256)
        ba_stems = tuple(f"{pfx}_{i:02d}_" for i in range(1, 11) for pfx in ("before", "after"))
        attr_banned_tokens = (
            "/usr/local/google/home/",
            "nitinagga",
            "genuine-multicloud-3p-uis",
            "metabase",
            "grafana",
            "redmine",
            "nocodb",
            "gitea",
            "trino",
            "directus",
            "datalust",
            "hashicorp",
        ) + ba_stems
        rels_banned_tokens = (
            _cr_gclb_tok,
            "corp.google.com",
            "genuine-multicloud-3p-uis",
            "nitinaggarwal-12",
            "try-everywhere.thoughtspot.cloud",
            "cfe-support@google.com",
        ) + ba_stems
        slides_root = ROOT_DIR / "slides"
        canonical_drawio_png_shas = {
            hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT_DIR / "diagrams").glob("*.drawio.png"))
            if p.is_file()
        }
        allowed_pptx_png_shas = manifest_sha_set | canonical_drawio_png_shas
        if slides_root.is_dir():
            for pptx_f in sorted(slides_root.glob("*.pptx")):
                with zipfile.ZipFile(pptx_f, "r") as zf:
                    for zn in zf.namelist():
                        if re.match(r"^ppt/slides/slide\d+\.xml$", zn) or re.match(r"^ppt/notesSlides/notesSlide\d+\.xml$", zn):
                            xml_t = zf.read(zn).decode("utf-8", errors="ignore")
                            plain_t = html.unescape(
                                " ".join(re.findall(r"<a:t(?:\s+[^/>]*)?>(.*?)</a:t>", xml_t, flags=re.S))
                            ).lower()
                            for tok in banned_ref_tokens:
                                self.assertNotIn(tok, plain_t, f"Banned token '{tok}' in {pptx_f.name}:{zn}")
                            attr_vals = html.unescape(
                                " ".join(v for _an, v in re.findall(r'\b(descr|name|title)="([^"]*)"', xml_t))
                            ).lower()
                            for atok in attr_banned_tokens:
                                self.assertNotIn(atok, attr_vals, f"Banned XML attribute '{atok}' in {pptx_f.name}:{zn}")
                        elif zn.startswith("ppt/") and zn.endswith(".rels"):
                            rel_low = zf.read(zn).decode("utf-8", errors="ignore").lower()
                            for rtok in rels_banned_tokens:
                                self.assertNotIn(rtok, rel_low, f"Banned rel link '{rtok}' in {pptx_f.name}:{zn}")
                        elif zn.startswith("ppt/media/") and zn.lower().endswith(".png"):
                            raw_m = zf.read(zn)
                            wh = _png_wh(raw_m)
                            if wh and wh[0] >= 1000 and wh[1] > 0:
                                ratio = wh[0] / wh[1]
                                self.assertFalse(
                                    1.55 <= ratio <= 1.65,
                                    f"Legacy 1.60:1 OSS screenshot {wh[0]}x{wh[1]} still embedded in {pptx_f.name}:{zn}",
                                )
                                if len(raw_m) >= 15000:
                                    m_sha = hashlib.sha256(raw_m).hexdigest()
                                    self.assertIn(
                                        m_sha,
                                        allowed_pptx_png_shas,
                                        f"Unmanifested large PNG ({wh[0]}x{wh[1]}, sha={m_sha[:12]}) in {pptx_f.name}:{zn}",
                                    )

        # 4A-4. Audit ALL docs/word/*.docx (XML <w:t> unescaped + <wp:docPr descr/name/title>, ALL word/**/*.rels, word/media/* & section-to-image binding)
        ts_shas = {sha_v for fn, sha_v in manifest_sha_by_name.items() if "thoughtspot" in fn.lower()}
        other_saas_pat = re.compile(r"\bsaas-(?:0[2-9]|10)\b", flags=re.I)
        word_root = ROOT_DIR / "docs" / "word"
        if word_root.is_dir():
            for docx_f in sorted(word_root.glob("*.docx")):
                with zipfile.ZipFile(docx_f, "r") as zf:
                    docx_rid_to_mpath: dict[str, str] = {}
                    docx_media_shas: dict[str, tuple[str, tuple[int, int] | None]] = {}
                    for zn in zf.namelist():
                        if zn in ("word/document.xml", "word/footnotes.xml") or re.match(r"^word/(header|footer)\d*\.xml$", zn):
                            xml_t = zf.read(zn).decode("utf-8", errors="ignore")
                            plain_t = html.unescape(
                                " ".join(re.findall(r"<w:t(?:\s+[^/>]*)?>(.*?)</w:t>", xml_t, flags=re.S))
                            ).lower()
                            for tok in banned_ref_tokens:
                                self.assertNotIn(tok, plain_t, f"Banned token '{tok}' in {docx_f.name}:{zn}")
                            attr_vals = html.unescape(
                                " ".join(v for _an, v in re.findall(r'\b(descr|name|title)="([^"]*)"', xml_t))
                            ).lower()
                            for atok in attr_banned_tokens:
                                self.assertNotIn(atok, attr_vals, f"Banned XML attribute '{atok}' in {docx_f.name}:{zn}")
                        elif zn.startswith("word/") and zn.endswith(".rels"):
                            rel_raw = zf.read(zn).decode("utf-8", errors="ignore")
                            rel_low = rel_raw.lower()
                            for rtok in rels_banned_tokens:
                                self.assertNotIn(rtok, rel_low, f"Banned rel link '{rtok}' in {docx_f.name}:{zn}")
                            if zn == "word/_rels/document.xml.rels":
                                for rid_m, tgt_m in re.findall(r'<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rel_raw):
                                    docx_rid_to_mpath[rid_m] = "word/" + tgt_m.lstrip("/") if not tgt_m.startswith("word/") else tgt_m
                        elif zn.startswith("word/media/") and zn.lower().endswith(".png"):
                            raw_m = zf.read(zn)
                            wh = _png_wh(raw_m)
                            m_sha = hashlib.sha256(raw_m).hexdigest()
                            docx_media_shas[zn] = (m_sha, wh)
                            if wh and wh[0] >= 1000 and wh[1] > 0:
                                ratio = wh[0] / wh[1]
                                self.assertFalse(
                                    1.55 <= ratio <= 1.65,
                                    f"Legacy 1.60:1 OSS screenshot {wh[0]}x{wh[1]} still embedded in {docx_f.name}:{zn}",
                                )
                                if wh == (2880, 1620):
                                    self.assertIn(
                                        m_sha,
                                        manifest_sha_set,
                                        f"Unmanifested 2880x1620 PNG in {docx_f.name}:{zn}",
                                    )
                    if "word/document.xml" in zf.namelist():
                        d_xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
                        d_paras = re.findall(r"<w:p\b.*?</w:p>", d_xml, flags=re.S)
                        d_texts = [
                            html.unescape("".join(re.findall(r"<w:t(?:\s+[^/>]*)?>(.*?)</w:t>", p, flags=re.S)))
                            for p in d_paras
                        ]
                        for p_i, p_xml in enumerate(d_paras):
                            if "<w:drawing" not in p_xml:
                                continue
                            ctx_win = " ".join(d_texts[max(0, p_i - 2) : min(len(d_texts), p_i + 2)])
                            ctx_low = ctx_win.lower()
                            for rid_e in re.findall(r'r:embed="(rId\d+)"', p_xml):
                                mp = docx_rid_to_mpath.get(rid_e, "")
                                if mp not in docx_media_shas:
                                    continue
                                m_sha, wh = docx_media_shas[mp]
                                if m_sha in ts_shas:
                                    self.assertTrue(
                                        ("saas-01" in ctx_low or "thoughtspot" in ctx_low) and not other_saas_pat.search(ctx_win),
                                        f"ThoughtSpot PNG misassigned outside SAAS-01 in {docx_f.name} para {p_i} ({mp}): {ctx_win[:160]}",
                                    )
                                elif ("visual proof" in ctx_low or re.search(r"\bsaas-\d{2}\b", ctx_low)) and wh and wh[0] >= 1000 and wh[1] > 0:
                                    if 1.70 <= (wh[0] / wh[1]) <= 1.85:
                                        self.assertIn(
                                            m_sha,
                                            manifest_sha_set,
                                            f"Unmanifested 16:9 proof PNG in {docx_f.name} para {p_i} ({mp}, {wh[0]}x{wh[1]})",
                                        )

        if verified_gcp_count == 0:
            overclaim_toks = (
                "live google cloud console capture",
                "live gcp console capture",
                "live user capture • cloud console",
                "live google cloud console screenshots",
                "20 verified retina",
            )
            oc_files = (
                sorted((ROOT_DIR / "templates").glob("*.html"))
                + sorted((ROOT_DIR / "blogs").glob("*.md"))
                + sorted((ROOT_DIR / "blogs").glob("*.deck.json"))
                + sorted((ROOT_DIR / "docs").glob("*.md"))
                + [ROOT_DIR / "README.md"]
            )
            for oc_p in oc_files:
                if not oc_p.is_file():
                    continue
                oc_low = oc_p.read_text(encoding="utf-8", errors="ignore").lower()
                for oc_tok in overclaim_toks:
                    self.assertNotIn(oc_tok, oc_low, f"GCP overclaim '{oc_tok}' when 0 GCP captures in {oc_p.relative_to(ROOT_DIR)}")

        # 4B. Continuity ledger must retire all legacy OSS stand-in steps AND enforce script_sha256 + receipt_sha256 on ALL active steps (ZERO exemptions)
        ledger_path = ROOT_DIR / "data" / "run_continuity_ledger.json"
        self.assertTrue(ledger_path.is_file(), f"Missing continuity ledger: {ledger_path}")
        ledger_doc = json.loads(ledger_path.read_text(encoding="utf-8"))
        retired_ids = {
            "STEP-01-AWS-EC2-10-3P-STACKS",
            "STEP-02-GCP-CLOUDRUN-10-3P-STACKS",
            "STEP-05-GENUINE-23-MULTICLOUD-UI-SCREENSHOTS",
            "STEP-05B-GENUINE-20-BEFORE-AFTER-3P-UI-SCREENSHOTS",
        }
        active_steps = []
        for st in ledger_doc.get("repeatable_steps", []):
            sid = st.get("step_id", "")
            if sid in retired_ids:
                self.assertFalse(
                    st.get("repeat_in_next_run"),
                    f"Retired stand-in step must not be active in continuity ledger: {sid}",
                )
            elif st.get("repeat_in_next_run") is True:
                active_steps.append(st)
        self.assertGreaterEqual(len(active_steps), 4, f"Expected >= 4 active repeatable steps, got {len(active_steps)}")
        for st in active_steps:
            sid = st.get("step_id", "")
            s_path = ROOT_DIR / str(st.get("script_path", ""))
            r_path = ROOT_DIR / str(st.get("receipt_path", ""))
            self.assertEqual(st.get("last_exit_code"), 0, f"Active step {sid} last_exit_code != 0")
            self.assertTrue(s_path.is_file(), f"Active step {sid} missing script_path: {s_path}")
            self.assertTrue(r_path.is_file(), f"Active step {sid} missing receipt_path: {r_path}")
            self.assertEqual(
                hashlib.sha256(s_path.read_bytes()).hexdigest(),
                st.get("script_sha256"),
                f"Active step {sid} script_sha256 mismatch (zero exemptions)",
            )
            self.assertEqual(
                hashlib.sha256(r_path.read_bytes()).hexdigest(),
                st.get("receipt_sha256"),
                f"Active step {sid} receipt_sha256 mismatch (zero exemptions)",
            )

        # 5. Live GET / HTML and all /blogs/<slug>/screenshots pages: zero legacy/hygiene leaks & every rendered screenshot matches manifest SHA-256
        st_home, _, raw_home = self._get("/")
        self.assertEqual(st_home, 200)
        home_html = raw_home.decode("utf-8")
        home_low = home_html.lower()
        for tok in banned_ref_tokens:
            self.assertNotIn(tok, home_low, f"Legacy/hygiene token '{tok}' rendered in GET /")
        img_srcs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', home_html, flags=re.IGNORECASE)
        checked_shots: set[str] = set()
        for src in img_srcs:
            clean_src = src.lstrip("/").split("?")[0]
            if clean_src.startswith("screenshots/") and clean_src.endswith(".png") and clean_src not in checked_shots:
                checked_shots.add(clean_src)
                self.assertTrue(
                    clean_src.startswith("screenshots/verified-cloud-console/"),
                    f"Rendered screenshot outside verified-cloud-console/: {clean_src}",
                )
                fname = Path(clean_src).name
                self.assertIn(fname, manifest_sha_by_name, f"Rendered screenshot not in provenance manifest: {fname}")
                st_img, _, b_img = self._get("/" + clean_src)
                self.assertEqual(st_img, 200, f"Broken screenshot in GET /: {clean_src}")
                self.assertTrue(b_img.startswith(b"\x89PNG\r\n\x1a\n"), f"Non-PNG payload for {clean_src}")
                self.assertEqual(
                    hashlib.sha256(b_img).hexdigest(),
                    manifest_sha_by_name[fname],
                    f"Served PNG SHA-256 mismatch against manifest for {fname}",
                )
        self.assertGreaterEqual(len(checked_shots), 2, "Expected >=2 verified screenshot PNGs rendered on portal")

        for slug in ("ws1", "ws2", "ws3", "ws4", "ws5", "atlas", "all"):
            st_pg, _, raw_pg = self._get(f"/blogs/{slug}/screenshots")
            self.assertEqual(st_pg, 200)
            pg_html = raw_pg.decode("utf-8")
            pg_low = pg_html.lower()
            for tok in banned_ref_tokens:
                self.assertNotIn(tok, pg_low, f"Legacy/hygiene token '{tok}' rendered in /blogs/{slug}/screenshots")
            for p_src in re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', pg_html, flags=re.IGNORECASE):
                c_src = p_src.lstrip("/").split("?")[0]
                if c_src.startswith("screenshots/") and c_src.endswith(".png"):
                    self.assertIn(
                        Path(c_src).name,
                        manifest_sha_by_name,
                        f"Unmanifested screenshot on /blogs/{slug}/screenshots: {c_src}",
                    )

    def test_10_two_way_slides_sync_preserves_typography_and_secondary_bare_min_12_targets(self) -> None:
        from scripts.slide_drawio_2way_registry import (
            BARE_MIN_12_PRES_ID,
            SECONDARY_BARE_MIN_12_PRES_IDS,
            _build_style_preserving_text_replace_requests,
            _resolve_target_slides,
        )

        # 1. Both 1erUlsPY... and 1K7Xrzuh... (WS1-5: All Patterns) must be targeted for every Bare-Min 12 diagram
        targets = _resolve_target_slides("ws1-5hop-governance-baseline")
        self.assertIn((BARE_MIN_12_PRES_ID, 1), targets)
        for sec_id in SECONDARY_BARE_MIN_12_PRES_IDS:
            self.assertIn((sec_id, 1), targets)

        # 2. Multi-line emoji/header shape replacement must emit updateTextStyle + updateParagraphStyle (never naked deleteText+insertText)
        fake_pe = {
            "objectId": "p1_i40",
            "size": {"width": {"magnitude": 1371600}, "height": {"magnitude": 1447800}},
            "transform": {"scaleX": 1.0, "scaleY": 1.0},
            "shape": {
                "text": {
                    "textElements": [
                        {"paragraphMarker": {"style": {"alignment": "START", "lineSpacing": 108}}},
                        {
                            "textRun": {
                                "content": "✦ Hop 3 FinOps &\n",
                                "style": {
                                    "fontFamily": "Arial",
                                    "fontSize": {"magnitude": 9.88, "unit": "PT"},
                                    "bold": True,
                                    "foregroundColor": {"opaqueColor": {"rgbColor": {"red": 0.075, "green": 0.451, "blue": 0.2}}},
                                },
                            }
                        },
                        {"paragraphMarker": {"style": {"alignment": "START", "lineSpacing": 108}}},
                        {
                            "textRun": {
                                "content": "• ~85% Token Savings\n",
                                "style": {
                                    "fontFamily": "Calibri",
                                    "fontSize": {"magnitude": 8.14, "unit": "PT"},
                                    "bold": False,
                                    "foregroundColor": {"opaqueColor": {"rgbColor": {"red": 0.235, "green": 0.251, "blue": 0.263}}},
                                },
                            }
                        },
                    ]
                }
            },
        }
        reqs = _build_style_preserving_text_replace_requests(
            "p1_i40",
            fake_pe,
            ["✦ Hop 3 FinOps &", "• 89.1% Net Input Savings"],
        )
        text_style_reqs = [r["updateTextStyle"] for r in reqs if "updateTextStyle" in r]
        para_style_reqs = [r["updateParagraphStyle"] for r in reqs if "updateParagraphStyle" in r]
        self.assertEqual(len(text_style_reqs), 2)
        self.assertEqual(len(para_style_reqs), 2)
        self.assertTrue(text_style_reqs[0]["style"]["bold"])
        self.assertAlmostEqual(text_style_reqs[0]["style"]["fontSize"]["magnitude"], 9.88, places=2)
        self.assertFalse(text_style_reqs[1]["style"]["bold"])
        # Calibri must be normalized to Google Sans
        self.assertEqual(text_style_reqs[1]["style"]["fontFamily"], "Google Sans")

        # 3. Inline 2-run prefix badge ("COMPUTE  ...") must preserve bold badge run + regular body run
        badge_pe = {
            "objectId": "p12_i24609",
            "size": {"width": {"magnitude": 3740000}, "height": {"magnitude": 143000}},
            "transform": {"scaleX": 1.0, "scaleY": 1.0},
            "shape": {
                "text": {
                    "textElements": [
                        {"paragraphMarker": {"style": {"alignment": "START", "lineSpacing": 100}}},
                        {
                            "textRun": {
                                "content": "COMPUTE  ",
                                "style": {
                                    "fontFamily": "Google Sans",
                                    "fontSize": {"magnitude": 6.3, "unit": "PT"},
                                    "bold": True,
                                    "foregroundColor": {"opaqueColor": {"rgbColor": {"red": 0.016, "green": 0.471, "blue": 0.341}}},
                                },
                            }
                        },
                        {
                            "textRun": {
                                "content": "Shared Diagnostic (~85% hit)\n",
                                "style": {
                                    "fontFamily": "Google Sans",
                                    "fontSize": {"magnitude": 6.3, "unit": "PT"},
                                    "bold": False,
                                    "foregroundColor": {"opaqueColor": {"rgbColor": {"red": 0.122, "green": 0.161, "blue": 0.216}}},
                                },
                            }
                        },
                    ]
                }
            },
        }
        badge_reqs = _build_style_preserving_text_replace_requests(
            "p12_i24609",
            badge_pe,
            ["COMPUTE  Shared Diagnostic (89.1% 32k hit)"],
        )
        badge_ts = [r["updateTextStyle"] for r in badge_reqs if "updateTextStyle" in r]
        self.assertEqual(len(badge_ts), 2)
        self.assertTrue(badge_ts[0]["style"]["bold"])
        self.assertFalse(badge_ts[1]["style"]["bold"])


if __name__ == "__main__":
    unittest.main()
