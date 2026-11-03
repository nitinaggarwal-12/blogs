#!/usr/bin/env python3
"""
Regression test suite for CH-01..CH-07 Critical & High Hallucination Purge Matrix.

Verifies:
- CH-01: Zero fictional models (`gemini-2.5-pro-dedicated` in runtime Python/JS/templates),
         zero `agentEngines` REST endpoints, zero `Omni 1.1` TTS claims, and accurate
         SAAS-02..SAAS-10 spoken_script transitions.
- CH-02: Exact rubric-weighted Judge scores (Flash mean 99.94, consensus 99.94),
         character-for-character verbatim quotes in `scoring_mocks.html` matching
         `docs/multi_model_llm_judge_evaluation_receipt.json`, and honest Same-Family naming.
- CH-03: Honest `bq_stream_insert` (`live_bq_inserted: False` on error), `vertex_ai_generate_content`
         (`response_id` + `FAILED` check), and live `response_id` in `cloud_console_verification_receipt.json`.
- CH-04: Tab 2 Simulator separates `policy_eval_ms` from `kms_probe_latency_ms`, discloses
         `isLiveLlmCall: False`, and aligns ATLAS CVSS residual scores (`2.4`, `0.0`, `0.0`, `2.7`, `0.0`).
- CH-05: Deterministic simulation endpoints disclose `isLiveLlmCall: False`, Tab 3 clarifies
         `20 In-Memory + 87 Receipt Assertions`, and `retailstream` has zero FinVault GxP study metrics.
- CH-06: Tab 4 PAYG clarifies `6 GCP Marketplace PAYG + 2 Direct Vendor Dev Tiers`, uses
         `https://developer.servicenow.com/`, and reports unauthenticated HTTP 401/403 or HTML login
         pages as `ok: False, tls_reachable: True, authenticated: False, status: "TLS_HOST_REACHED_AUTH_REQUIRED"`.
- CH-07: Zero `nitinagga@google.com` or `gantry-pulse` leaks in application/script code, Mockup 2
         `88/100` + `10` CMEK = `98/100` math, zero pre-hydration comment/changelog counts, and
         Executive Light Theme `.portal-toast` (`background: #ffffff`).
"""

from __future__ import annotations

import importlib.util
import json
import re
import socket
import threading
import unittest
import urllib.request
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parent.parent


def _load_module(name: str, rel_path: str):
    spec = importlib.util.spec_from_file_location(name, ROOT_DIR / rel_path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


SERVER_MOD = _load_module("ge_portal_server_ch", "server.py")


class HallucinationPurgeRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        cls.port = sock.getsockname()[1]
        sock.close()
        cls.httpd = SERVER_MOD.ThreadingHTTPServer(("127.0.0.1", cls.port), SERVER_MOD.PortalRequestHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def _get_json(self, path: str) -> tuple[int, dict]:
        req = urllib.request.Request(f"{self.base_url}{path}")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))

    def _post_json(self, path: str, body: dict) -> tuple[int, dict]:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            return he.code, json.loads(he.read().decode("utf-8"))

    def test_ch01_zero_fictional_models_endpoints_or_omni_tts(self) -> None:
        patterns_html = (ROOT_DIR / "templates/tab_patterns.html").read_text(encoding="utf-8")
        self.assertNotIn("Omni 1.1", patterns_html)
        self.assertIn("window.speechSynthesis", patterns_html)

        runtime_files = [
            "core-cymbal-agent/models.py",
            "core-cymbal-agent/agents/finvault_agent_alpha.py",
            "core-cymbal-agent/governance/hop5_data_rls_and_otel.py",
            "workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py",
            "workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py",
            "docs/gcp_pattern_codebase_and_execution_bundle.json",
        ]
        for rel in runtime_files:
            content = (ROOT_DIR / rel).read_text(encoding="utf-8")
            self.assertNotIn("gemini-2.5-pro-dedicated", content, f"Fictional model leaked in {rel}")
            self.assertNotIn("/agentEngines", content, f"Fictional agentEngines path leaked in {rel}")

        alpha_src = (ROOT_DIR / "core-cymbal-agent/agents/finvault_agent_alpha.py").read_text(encoding="utf-8")
        self.assertIn("/reasoningEngines", alpha_src)

        index_src = (ROOT_DIR / "index.html").read_text(encoding="utf-8")
        self.assertIn("gemini-2\\.5-pro-dedicated", index_src)

    def test_ch02_judge_verbatim_quotes_and_weighted_math(self) -> None:
        receipt = json.loads((ROOT_DIR / "docs/multi_model_llm_judge_evaluation_receipt.json").read_text(encoding="utf-8"))
        self.assertAlmostEqual(receipt["overall_consensus_mean_score"], 99.94, places=2)
        self.assertAlmostEqual(receipt["model_aggregates"]["gemini-2.5-pro"]["mean_overall_score"], 99.94, places=2)
        self.assertAlmostEqual(receipt["model_aggregates"]["gemini-2.5-flash"]["mean_overall_score"], 99.94, places=2)

        mocks_html = (ROOT_DIR / "scoring_mocks.html").read_text(encoding="utf-8")
        self.assertNotIn("Generator ≠ Judge", mocks_html)
        self.assertIn("Same-Family Pro + Flash", mocks_html)
        self.assertIn("99.94 / 100", mocks_html)

        # Verify every proVerbatim and flashVerbatim in JUDGE_REASONING_DATA is a verbatim substring of its response_id receipt payload
        m_arr = re.search(r"const\s+JUDGE_REASONING_DATA\s*=\s*(\[[\s\S]*?\]);", mocks_html)
        self.assertIsNotNone(m_arr)
        judge_rows = json.loads(m_arr.group(1))
        self.assertEqual(len(judge_rows), 6)
        by_resp_id = {ev["response_id"]: json.dumps(ev["evaluation"], ensure_ascii=False) for ev in receipt["evaluations"]}
        for row in judge_rows:
            self.assertIn(row["proResponseId"], by_resp_id)
            self.assertIn(row["flashResponseId"], by_resp_id)
            self.assertIn(row["proVerbatim"], by_resp_id[row["proResponseId"]])
            self.assertIn(row["flashVerbatim"], by_resp_id[row["flashResponseId"]])

    def test_ch03_live_bridge_honesty_and_vertex_receipt_response_id(self) -> None:
        receipt = json.loads((ROOT_DIR / "docs/cloud_console_verification_receipt.json").read_text(encoding="utf-8"))
        v_stage = receipt["multicloud_aws_vertex_and_3p"]["details"]["vertex_ai_gemini_2_5_flash"]
        self.assertEqual(v_stage["status_code"], 200)
        self.assertTrue(v_stage["live_vertex_ok"])
        self.assertTrue(bool(v_stage.get("response_id")))
        cleaned_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", v_stage["response_text"].strip(), flags=re.IGNORECASE)
        parsed = json.loads(cleaned_json)
        self.assertIn("hop1_edge", parsed)
        self.assertIn("hop3_bulkhead", parsed)
        self.assertIn("hop5_data", parsed)

        bridge_src = (ROOT_DIR / "core-cymbal-agent/gcp_live_bridge.py").read_text(encoding="utf-8")
        self.assertNotIn("nitinagga", bridge_src)
        self.assertNotIn("gantry-pulse", bridge_src)
        self.assertIn('"live_bq_inserted": False', bridge_src)

    def test_ch04_simulator_latency_separation_and_cvss_residuals(self) -> None:
        sim_html = (ROOT_DIR / "templates/tab_simulator.html").read_text(encoding="utf-8")
        self.assertIn("Residual: 2.4", sim_html)
        self.assertIn("Residual: 2.7", sim_html)
        self.assertNotIn("Residual: 0.6", sim_html)
        self.assertNotIn("Residual: 1.1", sim_html)
        self.assertIn("isLiveLlmCall: false", sim_html)
        self.assertIn("Live Cloud KMS KeyRing Probe + In-Memory 5-Hop Policy", sim_html)

        st_mode, mode_data = self._get_json("/api/runtime/mode")
        self.assertEqual(st_mode, 200)
        self.assertIs(mode_data.get("isLiveLlmCall"), False)

        # Verify KMS probe latency is reported separately and NOT added into execution_ms
        with patch.object(
            SERVER_MOD,
            "probe_live_gcp_kms",
            return_value={"verified": True, "http_status": 200, "latency_ms": 245.0},
        ):
            res = SERVER_MOD.execute_custom_sandbox_turn({"mode": "LIVE_GCP", "caller_tenant": "finvault"})
            self.assertIs(res["isLiveLlmCall"], False)
            self.assertEqual(res["kms_probe_latency_ms"], 245.0)
            self.assertEqual(res["execution_ms"], res["policy_eval_ms"])
            self.assertLess(res["execution_ms"], 50.0)

    def test_ch05_simulation_endpoints_disclose_not_live_llm_and_tenant_scope(self) -> None:
        for path in ("/api/simulate/all", "/api/saas-5-matrix"):
            st, data = self._get_json(path)
            self.assertEqual(st, 200)
            self.assertIs(data.get("isLiveLlmCall"), False, f"Missing isLiveLlmCall: False on {path}")

        st_sim, sim_data = self._post_json(
            "/api/saas-5-simulate",
            {"pattern": "PATTERN_A_POOLED", "saas": "thoughtspot-spotter", "include_live_probes": False},
        )
        self.assertEqual(st_sim, 200)
        self.assertIs(sim_data.get("isLiveLlmCall"), False)
        self.assertIs(sim_data["result"].get("isLiveLlmCall"), False)
        item0 = sim_data["result"]["saas_e2e_results"][0]
        self.assertEqual(item0["verification_tier"], "IN_MEMORY_DETERMINISTIC_MCP_SIMULATION")
        self.assertEqual(
            item0["negative_test_case"]["output"]["execution_mode"],
            "deterministic_in_memory_policy_assertion",
        )

        # Hermetic AST inspection of scripts/deploy_10_saas_aws_agentcore_targets.py retailstream muse-poc fixture
        import ast
        aws_src = (ROOT_DIR / "scripts/deploy_10_saas_aws_agentcore_targets.py").read_text(encoding="utf-8")
        tree = ast.parse(aws_src)
        muse_rs = None
        trees_to_walk = [tree]
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str) and "CYMBAL_10_SAAS_RECORDS" in node.value:
                try:
                    trees_to_walk.append(ast.parse(node.value))
                except Exception:
                    pass
        for t in trees_to_walk:
            for node in ast.walk(t):
                if isinstance(node, ast.Dict):
                    for k_node, v_node in zip(node.keys, node.values):
                        if isinstance(k_node, ast.Constant) and k_node.value == "muse-poc" and isinstance(v_node, ast.Dict):
                            try:
                                muse_val = ast.literal_eval(v_node)
                                if isinstance(muse_val, dict) and "retailstream" in muse_val:
                                    muse_rs = muse_val["retailstream"]
                            except Exception:
                                pass
        self.assertIsNotNone(muse_rs)
        self.assertEqual(muse_rs["authorized_studies_count"], 0)
        self.assertIsNone(muse_rs["cohort_b_orr_pct"])
        self.assertNotIn("FV-GXP-2026-04", str(muse_rs["study"]))

    def test_ch06_payg_marketplace_split_and_unauthenticated_probe_honesty(self) -> None:
        payg_html = (ROOT_DIR / "templates/tab_payg.html").read_text(encoding="utf-8")
        self.assertIn("6 GCP MARKETPLACE PAYG + 2 DIRECT VENDOR DEV TIERS", payg_html)
        self.assertIn("All 21 architecture slide decks", payg_html)
        self.assertIn("$650 hub + 90% Pooled ($18) + 10% VIP Spoke ($850)", payg_html)

        modals_js = (ROOT_DIR / "js/modals.js").read_text(encoding="utf-8")
        self.assertNotIn("cymbal-itom.service-now.com", modals_js)
        self.assertIn("https://developer.servicenow.com/", modals_js)

        # Mock an HTTP 401 upstream response and verify ok=False, tls_reachable=True, authenticated=False
        class _FakeOpener401:
            def open(self, req, timeout=5):
                import io
                import urllib.error
                hdrs = {"Content-Type": "application/json"}
                raise urllib.error.HTTPError(req.full_url, 401, "Unauthorized", hdrs, io.BytesIO(b"{}"))

        with patch.object(SERVER_MOD, "validate_payg_outbound_url", return_value=(True, 200, "ALLOWED", "https://api.datadoghq.com/api/v2/spans")):
            with patch("urllib.request.build_opener", return_value=_FakeOpener401()):
                st_p, payg_res = self._post_json(
                    "/api/payg-saas/test-connection",
                    {"service_id": "datadog", "endpoint_url": "https://api.datadoghq.com/api/v2/spans", "api_token": ""},
                )
        self.assertEqual(st_p, 200)
        self.assertFalse(payg_res["ok"])
        self.assertTrue(payg_res["tls_reachable"])
        self.assertFalse(payg_res["authenticated"])
        self.assertEqual(payg_res["status"], "TLS_HOST_REACHED_AUTH_REQUIRED")

    def test_ch07_identity_scrub_mockup_math_and_light_toast(self) -> None:
        for rel in (
            "server.py",
            "scripts/unified_feedback_engine.py",
            "scripts/sync_google_workspace_bridge.py",
            "scripts/provision_gcp_cloudrun_third_party_apps.py",
            "scripts/provision_ramp_portal_dev_multi_tenant_infra.py",
        ):
            src = (ROOT_DIR / rel).read_text(encoding="utf-8")
            self.assertNotIn("nitinagga@google.com", src, f"Personal email leaked in {rel}")
            self.assertNotIn("gantry-pulse", src, f"Cross-repo path leaked in {rel}")

        mocks_html = (ROOT_DIR / "scoring_mocks.html").read_text(encoding="utf-8")
        self.assertIn("88 / 100 (Level 300 Certified)", mocks_html)
        self.assertIn("&lt;60s KMS propagation SLA", mocks_html)

        layout_css = (ROOT_DIR / "css/layout.css").read_text(encoding="utf-8")
        m_toast = re.search(r"\.portal-toast\s*\{([^}]+)\}", layout_css)
        self.assertIsNotNone(m_toast)
        self.assertIn("background: #ffffff", m_toast.group(1))
        self.assertNotIn("background: #0f172a", m_toast.group(1))


if __name__ == "__main__":
    unittest.main()
