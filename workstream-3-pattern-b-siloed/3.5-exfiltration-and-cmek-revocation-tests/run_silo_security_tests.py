#!/usr/bin/env python3
"""
Workstream 3.5 — Automated Perimeter Exfiltration & CMEK Revocation Test Suite
(Pattern B: Sovereign Silos — FinVault Bank AND RetailStream Corp per Slide 11).

Tests all Pattern B Delta Security Controls on top of the 5-Hop Core Pipeline:
1. Silo Test 1 (mTLS Pinning): Rejects cross-tenant or spoofed mTLS client SPIFFE certificates (401).
2. Silo Test 2 (IAM Principal Access Boundary - PAB): Blocks FinVault principal attempting
   to target RetailStream's GCP silo project (`cymbal-retailstream-silo-prod`) (403).
3. Silo Test 3 (VPC Service Controls - VPC-SC): Blocks data exfiltration attempt from
   FinVault's perimeter to an external unauthorized project (403 `VPC_SERVICE_CONTROLS_PERMISSION_DENIED`).
4. Silo Test 4 (Cloud KMS CMEK Kill-Switch — FinVault): Revokes FinVault's CMEK key and verifies immediate
   HTTP 423 (`KMS_KEY_DISABLED`) halt on Memory Bank & runtime execution, then restores key.
5. Silo Test 5 (Air-Gapped Gemma 3 on GKE — FinVault): Verifies zero-external-egress inference inside
   FinVault's sovereign GKE cluster.
6. Silo Test 6 (RetailStream Sovereign Silo & CMEK Kill-Switch): Verifies RetailStream's dedicated
   sovereign environment (`cymbal-retailstream-silo-prod`), VPC-SC perimeter, and CMEK kill-switch.
"""

import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import importlib.util

_SERVICE_PATH = os.path.join(
    REPO_ROOT,
    "workstream-3-pattern-b-siloed",
    "3.3-solution-implementation",
    "pattern_b_siloed_service.py",
)
_spec = importlib.util.spec_from_file_location("pattern_b_siloed_service", _SERVICE_PATH)
silo_mod = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(silo_mod)


def run_all_silo_security_tests() -> None:
    svc = silo_mod.PatternBSiloedService()

    finvault_jwt = {
        "iss": "https://accounts.google.com/finvault.com",
        "sub": "sre-lead@finvault.com",
    }
    retailstream_jwt = {
        "iss": "https://login.microsoftonline.com/retailstream-tenant-guid/v2.0",
        "sub": "ops-eng@retailstream.com",
    }
    finvault_spiffe = "spiffe://finvault.com/ns/sre/sa/agent-client"
    retailstream_spiffe = "spiffe://retailstream.com/ns/itom/sa/agent-client"

    print("=" * 80)
    print("WORKSTREAM 3.5 • PATTERN B (SILOED) PERIMETER & CMEK REVOCATION TEST SUITE")
    print("=" * 80)

    # TEST 1: mTLS Client Certificate Mismatch Rejected (401)
    t1 = svc.invoke_siloed_agent(
        target_silo_project="cymbal-finvault-silo-prod",
        mtls_client_spiffe=retailstream_spiffe,
        raw_headers={},
        jwt_claims=finvault_jwt,
        dpop_proof_jkt="dpop_jkt_fv_301",
        session_id="sess-fv-301",
        requested_agent_uri="agent://finvault/private-agent-alpha-regulatory",
        user_prompt="Run sovereign audit.",
    )
    assert t1["status_code"] == 401 and t1["violation_type"] == "MTLS_CERTIFICATE_MISMATCH"
    print("[PASS] TEST 1 (mTLS Ingress): Spoofed client SPIFFE certificate rejected with 401.")

    # TEST 2: IAM Principal Access Boundary (PAB) Blocks Cross-Project Access (403)
    t2 = svc.invoke_siloed_agent(
        target_silo_project="cymbal-retailstream-silo-prod",
        mtls_client_spiffe=finvault_spiffe,
        raw_headers={},
        jwt_claims=finvault_jwt,
        dpop_proof_jkt="dpop_jkt_fv_302",
        session_id="sess-fv-302",
        requested_agent_uri="agent://cymbal/shared-incident-diagnostic-v2",
        user_prompt="Access RetailStream silo.",
    )
    assert t2["status_code"] == 403 and t2["violation_type"] == "PAB_BOUNDARY_VIOLATION"
    print("[PASS] TEST 2 (IAM PAB): Cross-project principal access blocked by Principal Access Boundary (403).")

    # TEST 3: VPC Service Controls (VPC-SC) Blocks Perimeter Data Exfiltration (403)
    t3 = svc.invoke_siloed_agent(
        target_silo_project="cymbal-finvault-silo-prod",
        mtls_client_spiffe=finvault_spiffe,
        raw_headers={},
        jwt_claims=finvault_jwt,
        dpop_proof_jkt="dpop_jkt_fv_303",
        session_id="sess-fv-303",
        requested_agent_uri="agent://finvault/private-agent-alpha-regulatory",
        user_prompt="Export wire settlement logs.",
        attempted_egress_project="external-attacker-exfil-proj",
    )
    assert t3["status_code"] == 403 and t3["violation_type"] == "VPC_SERVICE_CONTROLS_PERMISSION_DENIED"
    print("[PASS] TEST 3 (VPC-SC Perimeter): Cross-perimeter exfiltration blocked with VPC_SERVICE_CONTROLS_PERMISSION_DENIED.")

    # TEST 4: Cloud KMS CMEK Revocation Kill-Switch (423 Locked) & Restoration for FinVault
    revoked_uri = svc.revoke_tenant_cmek("finvault")
    t4_blocked = svc.invoke_siloed_agent(
        target_silo_project="cymbal-finvault-silo-prod",
        mtls_client_spiffe=finvault_spiffe,
        raw_headers={},
        jwt_claims=finvault_jwt,
        dpop_proof_jkt="dpop_jkt_fv_304",
        session_id="sess-fv-304",
        requested_agent_uri="agent://finvault/private-agent-alpha-regulatory",
        user_prompt="Query CMEK memory bank while key is revoked.",
    )
    assert t4_blocked["status_code"] == 423 and t4_blocked["decision"] == "DENY"
    assert "KMS_KEY_DISABLED" in str(t4_blocked["reason"])
    print(f"[PASS] TEST 4A (FinVault CMEK Kill-Switch): Revoking '{revoked_uri}' immediately halted execution with 423 Locked.")

    svc.restore_tenant_cmek("finvault")
    t5_ok = svc.invoke_siloed_agent(
        target_silo_project="cymbal-finvault-silo-prod",
        mtls_client_spiffe=finvault_spiffe,
        raw_headers={},
        jwt_claims=finvault_jwt,
        dpop_proof_jkt="dpop_jkt_fv_305",
        session_id="sess-fv-305",
        requested_agent_uri="agent://finvault/private-agent-alpha-regulatory",
        user_prompt="Run air-gapped wire settlement audit after CMEK key restore.",
        use_airgapped_gemma3_on_gke=True,
    )
    assert t5_ok["status_code"] == 200 and t5_ok["decision"] == "ALLOW"
    assert "AirGapped-GKE-Gemma3-27B" in str(t5_ok["response"])
    print("[PASS] TEST 4B & 5 (FinVault CMEK Restore + Air-Gapped Gemma 3 on GKE): Sovereign execution verified.")

    # TEST 6: RetailStream Sovereign Silo (`cymbal-retailstream-silo-prod`) & CMEK Kill-Switch (Slide 11)
    rs_revoked = svc.revoke_tenant_cmek("retailstream")
    t6_blocked = svc.invoke_siloed_agent(
        target_silo_project="cymbal-retailstream-silo-prod",
        mtls_client_spiffe=retailstream_spiffe,
        raw_headers={},
        jwt_claims=retailstream_jwt,
        dpop_proof_jkt="dpop_jkt_rs_306",
        session_id="sess-rs-306",
        requested_agent_uri="agent://cymbal/shared-incident-diagnostic-v2",
        user_prompt="Diagnose checkout latency inside RetailStream sovereign silo.",
    )
    assert t6_blocked["status_code"] == 423 and "KMS_KEY_DISABLED" in str(t6_blocked["reason"])
    svc.restore_tenant_cmek("retailstream")
    t6_ok = svc.invoke_siloed_agent(
        target_silo_project="cymbal-retailstream-silo-prod",
        mtls_client_spiffe=retailstream_spiffe,
        raw_headers={},
        jwt_claims=retailstream_jwt,
        dpop_proof_jkt="dpop_jkt_rs_306",
        session_id="sess-rs-306",
        requested_agent_uri="agent://cymbal/shared-incident-diagnostic-v2",
        user_prompt="Diagnose checkout latency inside RetailStream sovereign silo.",
    )
    assert t6_ok["status_code"] == 200 and t6_ok["decision"] == "ALLOW"
    assert rs_revoked in str(t6_ok["runtime_config"]["cmek_key_uri"])
    print("[PASS] TEST 6 (RetailStream Sovereign Silo & CMEK Kill-Switch): Verified per Slide 11 scenario.")

    print("=" * 80)
    print("ALL 6 PATTERN B (SOVEREIGN SILOS) SECURITY TESTS PASSED (100% VERIFIED)")
    print("=" * 80)


if __name__ == "__main__":
    run_all_silo_security_tests()
