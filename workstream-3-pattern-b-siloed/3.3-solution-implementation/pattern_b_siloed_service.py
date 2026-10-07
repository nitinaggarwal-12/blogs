"""
Workstream 3.3 — Pattern B (Sovereign Silos) Reference Solution Implementation.

Extends the 80% reusable `CymbalMultiTenantRuntime` (`core-cymbal-agent/`) with
Pattern B Sovereign Silo Delta Controls for BOTH FinVault Bank and RetailStream Corp (Slide 11):
1. Mutual TLS (mTLS) client certificate pinning at Silo Ingress.
2. IAM Principal Access Boundary (PAB) enforcement blocking cross-project access.
3. VPC Service Controls (VPC-SC) perimeter exfiltration prevention.
4. Cloud KMS CMEK instant revocation kill-switch (`423 KMS_KEY_DISABLED`) using `silo_cmek_key_uri`.
5. Optional Air-Gapped Gemma 3 (27B) on GKE execution mode inside the perimeter.
"""

import os
import sys
from typing import Dict, Optional

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import importlib

core_pipeline = importlib.import_module("core-cymbal-agent.runtime_pipeline")
core_models = importlib.import_module("core-cymbal-agent.models")


SILO_PERIMETER_MAP = {
    "finvault": {
        "project_id": "cymbal-finvault-silo-prod",
        "vpc_sc_perimeter": "perimeter_finvault_sovereign",
        "expected_mtls_spiffe": "spiffe://finvault.com/ns/sre/sa/agent-client",
        "allowed_egress_projects": {"cymbal-finvault-silo-prod"},
        "airgapped_gke_model": "gke://cymbal-finvault-silo-prod/us-central1/gemma-3-27b-it-vllm",
    },
    "retailstream": {
        "project_id": "cymbal-retailstream-silo-prod",
        "vpc_sc_perimeter": "perimeter_retailstream_sovereign",
        "expected_mtls_spiffe": "spiffe://retailstream.com/ns/itom/sa/agent-client",
        "allowed_egress_projects": {"cymbal-retailstream-silo-prod"},
        "airgapped_gke_model": "gke://cymbal-retailstream-silo-prod/us-central1/gemma-3-27b-it-vllm",
    },
}


class PatternBSiloedService:
    """Pattern B (Sovereign Silos) Multi-Project Perimeter & CMEK Orchestrator."""

    def __init__(self) -> None:
        self.runtime = core_pipeline.CymbalMultiTenantRuntime()

    def revoke_tenant_cmek(self, tenant_id: str) -> str:
        profile = self.runtime.tenant_profiles[tenant_id]
        cmek_uri = profile.silo_cmek_key_uri
        self.runtime.hop3.disable_cmek_key(cmek_uri)
        return cmek_uri

    def restore_tenant_cmek(self, tenant_id: str) -> str:
        profile = self.runtime.tenant_profiles[tenant_id]
        cmek_uri = profile.silo_cmek_key_uri
        self.runtime.hop3.enable_cmek_key(cmek_uri)
        return cmek_uri

    def invoke_siloed_agent(
        self,
        target_silo_project: str,
        mtls_client_spiffe: str,
        raw_headers: Dict[str, str],
        jwt_claims: Dict[str, str],
        dpop_proof_jkt: str,
        session_id: str,
        requested_agent_uri: str,
        user_prompt: str,
        attempted_egress_project: Optional[str] = None,
        use_airgapped_gemma3_on_gke: bool = False,
    ) -> Dict[str, object]:
        ctx, _ = self.runtime.hop1.authenticate_and_mint_context(
            raw_headers=raw_headers,
            jwt_claims=jwt_claims,
            dpop_proof_jkt=dpop_proof_jkt,
            session_id=session_id,
            topology=core_models.IsolationTopology.PATTERN_B_SILOED,
        )
        silo_cfg = SILO_PERIMETER_MAP[ctx.tenant_id]

        # Enforce mTLS Client Certificate Pinning
        if mtls_client_spiffe != silo_cfg["expected_mtls_spiffe"]:
            return {
                "status_code": 401,
                "decision": "DENY",
                "violation_type": "MTLS_CERTIFICATE_MISMATCH",
                "reason": (
                    f"mTLS Handshake Rejected: Expected SPIFFE '{silo_cfg['expected_mtls_spiffe']}', "
                    f"got '{mtls_client_spiffe}'."
                ),
            }

        # Enforce IAM Principal Access Boundary (PAB) on Target Silo Project
        if target_silo_project != silo_cfg["project_id"]:
            return {
                "status_code": 403,
                "decision": "DENY",
                "violation_type": "PAB_BOUNDARY_VIOLATION",
                "reason": (
                    f"IAM Principal Access Boundary (PAB) Denied: Principal '{ctx.user_principal}' "
                    f"(bound to '{silo_cfg['project_id']}') cannot access project '{target_silo_project}'."
                ),
            }

        # Enforce VPC Service Controls (VPC-SC) Perimeter Egress Policy
        if attempted_egress_project and attempted_egress_project not in silo_cfg["allowed_egress_projects"]:
            return {
                "status_code": 403,
                "decision": "DENY",
                "violation_type": "VPC_SERVICE_CONTROLS_PERMISSION_DENIED",
                "reason": (
                    f"VPC-SC Perimeter '{silo_cfg['vpc_sc_perimeter']}' blocked data exfiltration "
                    f"from '{silo_cfg['project_id']}' to unauthorized project '{attempted_egress_project}'."
                ),
            }

        result = self.runtime.handle_agent_turn(
            raw_headers=raw_headers,
            jwt_claims=jwt_claims,
            dpop_proof_jkt=dpop_proof_jkt,
            session_id=session_id,
            requested_agent_uri=requested_agent_uri,
            user_prompt=user_prompt,
            topology=core_models.IsolationTopology.PATTERN_B_SILOED,
        )

        if result["status_code"] == 200 and use_airgapped_gemma3_on_gke:
            result["serving_backend"] = silo_cfg["airgapped_gke_model"]
            result["response"] = (
                f"[AirGapped-GKE-Gemma3-27B • Perimeter={silo_cfg['vpc_sc_perimeter']}] "
                + str(result["response"])
            )

        return result
