#!/usr/bin/env python3
"""Meta-Evaluation & Anti-Gaming Unit Tests for the 8-Pillar Agentic Evaluation Framework (AEF v2.0).

Verifies:
1. Golden trajectory dataset (`24` trajectories) & Red-Team probe dataset (`22` probes) schema integrity.
2. Live Pillar 1 (`EVAL-P1-TRAJECTORY`) achieves `100% pass@1`, `100% pass^5`, `0% leakage` across 120 runs.
3. Synthetic Fault Injection (Anti-Gaming):
   - Injecting a cross-tenant data leak forces `_grade_turn_result` and `compute_release_gate` to FAIL CLOSED (`HOLD`).
   - Injecting a corrupted Draw.io XML or `<script>` SVG forces Pillar 4 (`EVAL-P4-DIAGRAMS`) to FAIL CLOSED.
   - Injecting a tampered/missing screenshot provenance manifest forces Pillar 6 (`EVAL-P6-PROVENANCE`) to FAIL CLOSED.
   - Injecting ANY single failed pillar out of 8 forces `compute_release_gate` to return `HOLD` (never `CERTIFIED`).
4. Live HTTP contract & CSRF security on `GET /api/evals/latest` and `POST /api/evals/run`.
"""

from __future__ import annotations

import json
import os
import re
import shutil
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
from scripts import run_agentic_eval_framework as aef


class _QuietHandler(server.PortalRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


class TestAgenticEvalFrameworkMeta(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._tmpdir = tempfile.TemporaryDirectory(prefix="aef_meta_test_")
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

    def test_01_datasets_schema_and_cardinality(self) -> None:
        trj_path = ROOT_DIR / "evals" / "datasets" / "agentic_trajectories.json"
        rt_path = ROOT_DIR / "evals" / "datasets" / "adversarial_redteam.json"
        self.assertTrue(trj_path.is_file(), "Missing agentic_trajectories.json")
        self.assertTrue(rt_path.is_file(), "Missing adversarial_redteam.json")

        trj_doc = json.loads(trj_path.read_text(encoding="utf-8"))
        rt_doc = json.loads(rt_path.read_text(encoding="utf-8"))

        self.assertEqual(trj_doc.get("schema_version"), "aef-v2.0")
        self.assertGreaterEqual(len(trj_doc.get("trajectories", [])), 24)
        self.assertEqual(len({t["id"] for t in trj_doc["trajectories"]}), len(trj_doc["trajectories"]))

        self.assertEqual(rt_doc.get("schema_version"), "aef-v2.0")
        self.assertGreaterEqual(len(rt_doc.get("probes", [])), 22)
        self.assertEqual(len({p["id"] for p in rt_doc["probes"]}), len(rt_doc["probes"]))

    def test_02_pillar1_live_120_runs_determinism_and_zero_leakage(self) -> None:
        res = aef.evaluate_pillar_1_trajectories()
        self.assertEqual(res["status"], "PASS", f"Pillar 1 failed: {res}")
        m = res["metrics"]
        self.assertGreaterEqual(m["total_executions"], 120)
        self.assertEqual(m["pass_at_1_pct"], 100.0)
        self.assertEqual(m["pass_pow_k_pct"], 100.0)
        self.assertEqual(m["cross_tenant_leak_count"], 0)
        self.assertEqual(m["pii_leak_count"], 0)

    def test_03_anti_gaming_fault_injection_leakage_fails_closed(self) -> None:
        # Synthetic cross-tenant leakage injection MUST fail _grade_turn_result
        leaked_res = {
            "status_code": 200,
            "decision": "ALLOW",
            "response": "Leaked FinVault wire INC-FV-9001 with ACCT-8849201944",
            "rls_rows_returned": 1,
            "runtime_config": {"effective_thinking_level": "MEDIUM", "effective_output_token_cap": 4000},
            "hops": [],
        }
        exp = {
            "status_code": 200,
            "decision": "ALLOW",
            "response_must_not_contain": ["INC-FV-9001", "ACCT-8849201944"],
        }
        ok, detail, ct_leak, pii_leak = aef._grade_turn_result(leaked_res, exp, "retailstream")
        self.assertFalse(ok, "Grader must fail closed on cross-tenant/PII leak")
        self.assertTrue(ct_leak, "Must flag cross_tenant_leak=True")
        self.assertTrue(pii_leak, "Must flag pii_leak=True")
        self.assertIn("FORBIDDEN_LEAK", detail)

    def test_04_anti_gaming_fault_injection_corrupt_diagrams_and_svg_xss(self) -> None:
        with tempfile.TemporaryDirectory(prefix="aef_bad_diag_") as td:
            d = Path(td)
            (d / "broken.drawio").write_text("<mxfile><unclosed>", encoding="utf-8")
            (d / "xss.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', encoding="utf-8")
            res = aef.evaluate_pillar_4_diagrams(diagrams_dir=d)
            self.assertEqual(res["status"], "FAIL", "Pillar 4 must fail closed on invalid XML & SVG script")
            self.assertTrue(any("XML parse error" in i for i in res.get("issues", [])))
            self.assertTrue(any("unsafe script" in i for i in res.get("issues", [])))

    def test_05_anti_gaming_fault_injection_tampered_provenance_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="aef_bad_prov_") as td:
            vdir = Path(td)
            (vdir / "fake.png").write_bytes(b"not-a-png")
            (vdir / ("screenshot_" + "provenance.json")).write_text(
                json.dumps({"entries": [{"relFile": "fake.png", "hostname": "example.com", "sha256": "deadbeef"}]}),
                encoding="utf-8",
            )
            res = aef.evaluate_pillar_6_provenance(verified_dir_override=vdir)
            self.assertEqual(res["status"], "FAIL", "Pillar 6 must fail closed on SHA mismatch / invalid PNG")

    def test_05b_anti_gaming_forbidden_origin_in_valid_manifest_fails_closed(self) -> None:
        # P0-1 & P1-4 discriminating regression test: clone the real, valid v3.0 provenance
        # manifest + genuine non-blank 2880x1620 Retina PNGs so every header, captureMethod
        # ("cdp_live"), SHA-256, rawPixelsSha256, dHash64, isSecureContext, and pixel check
        # passes — then mutate ONLY canonicalOriginUrl/hostname to forbidden internal/custom
        # origins and verify Pillar 6 fails SPECIFICALLY at origin enforcement (validateOriginUrl).
        real_vdir = ROOT_DIR / "screenshots" / "verified-cloud-console"
        real_manifest_path = real_vdir / ("screenshot_" + "provenance.json")
        self.assertTrue(real_manifest_path.is_file(), "Missing verified provenance manifest")
        manifest = json.loads(real_manifest_path.read_text(encoding="utf-8"))
        entries = manifest.get("entries", [])
        self.assertGreaterEqual(len(entries), 2, "Expected >=2 verified entries")

        with tempfile.TemporaryDirectory(prefix="aef_bad_origin_") as td:
            vdir = Path(td)
            for ent in entries:
                fname = Path(str(ent.get("relFile", ""))).name
                shutil.copy2(real_vdir / fname, vdir / fname)

            entries[0]["canonicalOriginUrl"] = "https://critique.corp.google.com/cl/12345"
            entries[0]["hostname"] = "critique.corp.google.com"
            entries[1]["canonicalOriginUrl"] = "https://fake-studio.run.app/demo"
            entries[1]["hostname"] = "fake-studio.run.app"

            (vdir / ("screenshot_" + "provenance.json")).write_text(
                json.dumps(manifest, indent=2), encoding="utf-8"
            )
            res = aef.evaluate_pillar_6_provenance(verified_dir_override=vdir)
            issues_txt = " ".join(res.get("issues", []))
            self.assertEqual(res["status"], "FAIL", f"Pillar 6 MUST fail closed on corp/run.app origins: {res}")
            self.assertNotEqual(res["metrics"].get("verifier_exit_code"), 0)
            self.assertEqual(res["metrics"].get("manifest_allow_origin_overrides"), 0)
            # Confirm verify_slide_screenshots.mjs reached validateOriginUrl (did NOT short-circuit early)
            self.assertNotIn("invalid captureMethod", issues_txt)
            self.assertNotIn("Invalid manifest header", issues_txt)
            self.assertNotIn("whitePixelRatio", issues_txt)
            self.assertTrue(
                ("critique.corp.google.com" in issues_txt or "fake-studio.run.app" in issues_txt or "origin" in issues_txt.lower()),
                f"Expected explicit origin rejection in Pillar 6 issues, got: {issues_txt}",
            )

    def test_06_anti_gaming_release_gate_holds_on_any_single_failure(self) -> None:
        all_pass = [{"pillar_id": f"P{i}", "status": "PASS"} for i in range(1, 9)]
        self.assertEqual(aef.compute_release_gate(all_pass, mode="full")["decision"], "CERTIFIED")
        # P1-3 invariant: fast mode MUST NEVER stamp CERTIFIED
        fast_gate = aef.compute_release_gate(all_pass, mode="fast")
        self.assertEqual(fast_gate["decision"], "FAST_CHECK_PASS")
        self.assertFalse(fast_gate["certified"])

        one_fail = list(all_pass)
        one_fail[4] = {"pillar_id": "P5", "status": "FAIL"}
        gate = aef.compute_release_gate(one_fail, mode="full")
        self.assertEqual(gate["decision"], "HOLD")
        self.assertEqual(gate["failed_pillars"], ["P5"])

        # Missing pillar (< 8) MUST ALSO HOLD
        self.assertEqual(aef.compute_release_gate(all_pass[:7], mode="full")["decision"], "HOLD")

    def test_07_live_http_eval_endpoints_and_security_controls(self) -> None:
        # 1. GET /api/evals/latest must return 200 JSON
        req = urllib.request.Request(f"{self._base}/api/evals/latest", method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIn("framework_version", data)

        # Fetch valid CSRF token from live homepage meta tag
        with urllib.request.urlopen(f"{self._base}/", timeout=10) as home_resp:
            home_html = home_resp.read().decode("utf-8")
        m_csrf = re.search(r'<meta\s+name="csrf-token"\s+content="([^"]+)"', home_html)
        self.assertIsNotNone(m_csrf, "Homepage must emit <meta name='csrf-token'>")
        csrf_tok = m_csrf.group(1)

        # 2. POST /api/evals/run WITHOUT CSRF token MUST be rejected with HTTP 403
        req_no_csrf = urllib.request.Request(
            f"{self._base}/api/evals/run",
            data=json.dumps({"mode": "fast"}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Origin": self._base},
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx1:
            urllib.request.urlopen(req_no_csrf, timeout=10)
        self.assertEqual(ctx1.exception.code, 403)

        # 3. POST /api/evals/run WITH valid CSRF + spoofed external Origin MUST be rejected (HTTP 403)
        req_bad_origin = urllib.request.Request(
            f"{self._base}/api/evals/run",
            data=json.dumps({"mode": "fast"}).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Portal-CSRF": csrf_tok,
                "Origin": "https://evil.example.com",
            },
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx2:
            urllib.request.urlopen(req_bad_origin, timeout=10)
        self.assertEqual(ctx2.exception.code, 403)

        # 4. POST /api/evals/run WITH valid CSRF + invalid mode MUST return HTTP 400
        req_bad_mode = urllib.request.Request(
            f"{self._base}/api/evals/run",
            data=json.dumps({"mode": "invalid_mode"}).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Portal-CSRF": csrf_tok,
                "Origin": self._base,
            },
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx3:
            urllib.request.urlopen(req_bad_mode, timeout=10)
        self.assertEqual(ctx3.exception.code, 400)

        # 5. POST /api/evals/run while _AEF_EVAL_RUN_LOCK is held MUST return HTTP 409
        acquired = server._AEF_EVAL_RUN_LOCK.acquire(blocking=False)
        self.assertTrue(acquired, "Should acquire _AEF_EVAL_RUN_LOCK in isolated test")
        try:
            req_locked = urllib.request.Request(
                f"{self._base}/api/evals/run",
                data=json.dumps({"mode": "fast"}).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "X-Portal-CSRF": csrf_tok,
                    "Origin": self._base,
                },
                method="POST",
            )
            with self.assertRaises(urllib.error.HTTPError) as ctx4:
                urllib.request.urlopen(req_locked, timeout=10)
            self.assertEqual(ctx4.exception.code, 409)
        finally:
            server._AEF_EVAL_RUN_LOCK.release()


    def test_08_pillar5_rejects_legacy_blog_clobber(self) -> None:
        """Anti-regression: Pillar 5 must pass on rebuilt v2 blogs and fail closed if legacy prose or .drawio.png diagrams reappear."""
        ok_cnt, total_cnt, errs = aef.validate_rebuilt_blogs_v2_and_12slide_diagrams(ROOT_DIR / "blogs")
        self.assertEqual(errs, [], f"Live rebuilt blogs failed anti-regression check: {errs}")
        self.assertEqual(ok_cnt, 6)
        self.assertEqual(total_cnt, 6)

        with tempfile.TemporaryDirectory() as tmp:
            td = Path(tmp)
            for md in sorted((ROOT_DIR / "blogs").glob("*.md")):
                shutil.copy2(md, td / md.name)
            ws1 = td / "ws1-reference-architecture-taxonomy-and-5hop-baseline.md"
            ws1.write_text(
                ws1.read_text(encoding="utf-8").replace(
                    "../diagrams/ws1-5hop-governance-baseline.svg",
                    "../diagrams/ws1-multi-tenant-taxonomy-overview.drawio.png",
                ) + "\n$$C_{total} = \\text{legacy}$$\nZone 1 — Blue container\n",
                encoding="utf-8",
            )
            ok2, _, errs2 = aef.validate_rebuilt_blogs_v2_and_12slide_diagrams(td)
            self.assertLess(ok2, 6)
            joined = " | ".join(errs2)
            self.assertIn("legacy raw LaTeX", joined)
            self.assertIn("Zone 1 hex container prose", joined)
            self.assertIn("reverted legacy WS1 .drawio.png", joined)
            self.assertIn("missing approved 12-slide diagram ../diagrams/ws1-5hop-governance-baseline.svg", joined)


    def test_09_pillar5_rejects_legacy_docx_clobber(self) -> None:
        """Anti-regression: Pillar 5 DOCX gate must pass on regenerated docs/word/*.docx and fail closed if legacy Zone 1 / $$ prose appears in word/document.xml."""
        import zipfile

        ok_cnt, total_cnt, errs = aef.validate_docx_rebuilt_v2_content(ROOT_DIR / "docs" / "word")
        self.assertEqual(errs, [], f"Live docs/word/*.docx failed anti-regression check: {errs}")
        self.assertGreaterEqual(ok_cnt, 7)
        self.assertEqual(ok_cnt, total_cnt)

        with tempfile.TemporaryDirectory() as tmp:
            td = Path(tmp)
            poisoned = td / "ws1-poisoned.docx"
            with zipfile.ZipFile(poisoned, "w") as zf:
                zf.writestr(
                    "word/document.xml",
                    "<w:document><w:body><w:p><w:r><w:t>Zone 1 — Blue container $$C = \\text{legacy}$$ ws1-multi-tenant-taxonomy-overview</w:t></w:r></w:p></w:body></w:document>",
                )
            ok2, tot2, errs2 = aef.validate_docx_rebuilt_v2_content(td)
            self.assertEqual(tot2, 1)
            self.assertEqual(ok2, 0)
            joined = " | ".join(errs2)
            self.assertIn("legacy Zone 1 hex container prose in DOCX", joined)
            self.assertIn("legacy raw LaTeX display delimiter ($$) in DOCX", joined)
            self.assertIn("legacy reverted WS1 blueprint reference in DOCX", joined)


if __name__ == "__main__":
    unittest.main()
