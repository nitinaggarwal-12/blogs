"""Unit, portability, and security verification for examples/blog-01..05 runnable GCP stacks."""
from __future__ import annotations

import ast
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
EXAMPLES_DIR = ROOT_DIR / "examples"

EXPECTED_STACKS = (
    "blog-01-5hop-baseline",
    "blog-02-pattern-a-pooled",
    "blog-03-pattern-b-siloed",
    "blog-04-pattern-c-hybrid",
    "blog-05-agentic-triad",
)

FORBIDDEN_HARDCODED_STRINGS = (
    "cymbal-ge-hub-2026",
    "cymbal-ge-silo-2026",
    "ramp-portal-dev",
    "bbar-138hf0",
    "nitinagga",
    "allUsers",
    "allAuthenticatedUsers",
)


def _load_module(mod_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(mod_name, str(file_path))
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
    return mod


class TestRunnableBlogExamples(unittest.TestCase):
    def test_01_all_five_stacks_complete_portable_and_secure(self) -> None:
        self.assertTrue((EXAMPLES_DIR / "README.md").is_file())
        for stack in EXPECTED_STACKS:
            sdir = EXAMPLES_DIR / stack
            for rel in (
                "README.md",
                "deploy.sh",
                "verify.sh",
                "destroy.sh",
                "terraform/main.tf",
                "terraform/variables.tf",
                "terraform/outputs.tf",
                "app/Dockerfile",
                "app/requirements.txt",
                "app/core.py",
                "app/main.py",
            ):
                fp = sdir / rel
                self.assertTrue(fp.is_file(), f"Missing required runnable file: {fp}")
                txt = fp.read_text(encoding="utf-8")
                for bad in FORBIDDEN_HARDCODED_STRINGS:
                    self.assertNotIn(bad, txt, f"Forbidden hardcoded value '{bad}' found in {fp}")

            # Every Dockerfile must run as non-root user
            df_txt = (sdir / "app/Dockerfile").read_text(encoding="utf-8")
            self.assertIn("USER appuser", df_txt, f"{stack} Dockerfile must run non-root")

            # Every FastAPI app must set strict default security headers & require Bearer auth
            main_txt = (sdir / "app/main.py").read_text(encoding="utf-8")
            ast.parse(main_txt)
            for hdr in (
                "X-Content-Type-Options",
                "X-Frame-Options",
                "Cache-Control",
                "Content-Security-Policy",
                "Permissions-Policy",
                "Bearer ",
            ):
                self.assertIn(hdr, main_txt, f"{stack}/app/main.py missing security control '{hdr}'")

            # Every shell script must use strict mode and pass bash -n
            for sh_name in ("deploy.sh", "verify.sh", "destroy.sh"):
                sh_p = sdir / sh_name
                sh_txt = sh_p.read_text(encoding="utf-8")
                self.assertIn("set -euo pipefail", sh_txt, f"{sh_p} missing strict bash mode")
                proc = subprocess.run(["bash", "-n", str(sh_p)], capture_output=True, text=True)
                self.assertEqual(proc.returncode, 0, f"bash -n failed for {sh_p}: {proc.stderr}")

        # Blog 2 BigQuery query must use parameterized ScalarQueryParameter (zero SQL interpolation)
        b2_main = (EXAMPLES_DIR / "blog-02-pattern-a-pooled/app/main.py").read_text(encoding="utf-8")
        self.assertIn("ScalarQueryParameter", b2_main)
        self.assertIn("WHERE tenant_id = @tenant_id", b2_main)

    def test_02_blog01_five_hop_core_policy_enforcement(self) -> None:
        m = _load_module("ex_blog01_core", EXAMPLES_DIR / "blog-01-5hop-baseline/app/core.py")
        self.assertFalse(m.enforce_hop1_anti_spoofing("retailstream", "finvault").allowed)
        self.assertEqual(m.enforce_hop1_anti_spoofing("retailstream", "finvault").http_status, 403)
        self.assertTrue(m.enforce_hop1_anti_spoofing("finvault", None).allowed)

        self.assertFalse(m.enforce_hop2_ard_visibility("retailstream", "agent://finvault/private-agent-alpha").allowed)
        self.assertTrue(m.enforce_hop2_ard_visibility("finvault", "agent://finvault/private-agent-alpha").allowed)

        self.assertEqual(m.enforce_hop4_semantic_nlc("finvault", "Please suppress OCC escalation").http_status, 422)
        self.assertTrue(m.enforce_hop4_semantic_nlc("finvault", "Summarize Fedwire queue").allowed)

        scrubbed = m.redact_egress_pii("Customer SSN 123-45-6789 IBAN DE89370400440532013000")
        self.assertNotIn("123-45-6789", scrubbed)
        self.assertNotIn("DE89370400440532013000", scrubbed)

        sig_in, payload = m.build_unsigned_jwt_input("finvault", "oidc:finvault")
        self.assertEqual(sig_in.count("."), 1)
        self.assertEqual(payload["tenant_id"], "finvault")
        self.assertEqual(len(m.hash_prompt_zero_pii("secret prompt")), 64)

    def test_03_blog02_pattern_a_pooled_core_isolation_and_bulkhead(self) -> None:
        m = _load_module("ex_blog02_core", EXAMPLES_DIR / "blog-02-pattern-a-pooled/app/core.py")
        self.assertEqual(m.clamp_output_tokens("STANDARD", 16000), 4000)
        self.assertEqual(m.clamp_output_tokens("ENTERPRISE", 16000), 16000)

        fv_rows = [r for r in m.SEED_TENANT_ROWS if r["tenant_id"] == "finvault"]
        self.assertEqual(len(fv_rows), 2)
        self.assertTrue(m.verify_zero_cross_tenant_leakage("finvault", fv_rows))
        self.assertFalse(m.verify_zero_cross_tenant_leakage("finvault", m.SEED_TENANT_ROWS))

        bh = m.TenantSlidingWindowBulkhead(rpm_limit=3)
        for i in range(3):
            self.assertTrue(bh.check_and_record("globex", now=100.0 + i).allowed)
        self.assertFalse(bh.check_and_record("globex", now=105.0).allowed)
        # Tenant isolation: finvault must remain unaffected while globex is throttled
        self.assertTrue(bh.check_and_record("finvault", now=105.0).allowed)

    def test_04_blog03_pattern_b_silo_cmek_killswitch_and_egress(self) -> None:
        m = _load_module("ex_blog03_core", EXAMPLES_DIR / "blog-03-pattern-b-siloed/app/core.py")
        self.assertTrue(m.evaluate_cmek_key_state("ENABLED").allowed)
        for revoked in ("DISABLED", "DESTROY_SCHEDULED", "DESTROYED", ""):
            v = m.evaluate_cmek_key_state(revoked)
            self.assertFalse(v.allowed)
            self.assertEqual(v.http_status, 423)

        self.assertTrue(m.evaluate_vpc_sc_egress_boundary("my-silo-proj", "my-silo-proj").allowed)
        self.assertEqual(m.evaluate_vpc_sc_egress_boundary("my-silo-proj", "attacker-proj").http_status, 403)

    def test_05_blog04_pattern_c_atomic_cutover_immutability(self) -> None:
        m = _load_module("ex_blog04_core", EXAMPLES_DIR / "blog-04-pattern-c-hybrid/app/core.py")
        orig = {
            "tenant_id": "retailstream",
            "tier": "STANDARD",
            "topology": "PATTERN_A_POOLED",
            "target_url": "https://pool.example.run.app",
            "psc_endpoint": "",
            "route_version": 1,
        }
        plan = m.build_atomic_promotion_plan(orig, "https://spoke.example.run.app", "10.10.0.50")
        self.assertEqual(orig["tier"], "STANDARD")
        self.assertEqual(plan.previous_version, 1)
        self.assertEqual(plan.next_version, 2)
        self.assertEqual(plan.phases, ["SHADOW_SYNC", "ATOMIC_CUTOVER", "DRAIN_AND_VERIFY"])
        self.assertEqual(plan.next_route["topology"], "PATTERN_C_HYBRID_PSC_SPOKE")
        self.assertEqual(plan.next_route["psc_endpoint"], "10.10.0.50")

    def test_06_blog05_agentic_triad_a2a_mcp_obo_and_zero_pii_finops(self) -> None:
        m = _load_module("ex_blog05_core", EXAMPLES_DIR / "blog-05-agentic-triad/app/core.py")
        card = m.build_a2a_agent_card("https://spec.example.run.app")
        self.assertEqual(card["name"], "cymbal-enterprise-specialist")
        self.assertEqual(len(card["skills"]), 3)

        self.assertTrue(m.authorize_mcp_obo_call("finvault", "finvault-wire-ledger").allowed)
        deny = m.authorize_mcp_obo_call("retailstream", "finvault-wire-ledger")
        self.assertFalse(deny.allowed)
        self.assertEqual(deny.http_status, 403)

        secret_prompt = "Check wire for SSN 123-45-6789"
        row = m.build_zero_pii_chargeback_row("finvault", secret_prompt, "finvault-wire-ledger", 200)
        self.assertNotIn("123-45-6789", str(row))
        self.assertEqual(len(row["prompt_sha256"]), 64)
        self.assertGreater(row["estimated_usd"], 0.0)


if __name__ == "__main__":
    unittest.main()
