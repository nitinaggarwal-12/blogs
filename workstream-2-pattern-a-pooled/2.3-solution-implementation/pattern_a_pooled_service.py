"""
Workstream 2.3 — Pattern A (Pooled Architecture) Reference Solution Service.

Wraps the 80% reusable `CymbalMultiTenantRuntime` (`core-cymbal-agent/`) for
Pattern A (Pooled) deployment on GEAP Agent Runtime / Cloud Run.
"""

import os
import sys
from typing import Dict, Optional

# Add repository root so `core-cymbal-agent` can be imported cleanly
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import importlib

core_pipeline = importlib.import_module("core-cymbal-agent.runtime_pipeline")
core_models = importlib.import_module("core-cymbal-agent.models")


class PatternAPooledService:
    """Pattern A (Pooled) Multi-Tenant Gateway & Agent Orchestrator."""

    def __init__(self) -> None:
        self.runtime = core_pipeline.CymbalMultiTenantRuntime()

    def invoke_pooled_agent(
        self,
        raw_headers: Dict[str, str],
        jwt_claims: Dict[str, str],
        dpop_proof_jkt: str,
        session_id: str,
        requested_agent_uri: str,
        user_prompt: str,
        requested_thinking_tokens: int = 6000,
        simulated_current_rpm: int = 10,
        attempted_db_tenant_filter: Optional[str] = None,
        requested_mcp_connector: str = "mcp://cymbal/core-telemetry-2lo",
    ) -> Dict[str, object]:
        return self.runtime.handle_agent_turn(
            raw_headers=raw_headers,
            jwt_claims=jwt_claims,
            dpop_proof_jkt=dpop_proof_jkt,
            session_id=session_id,
            requested_agent_uri=requested_agent_uri,
            user_prompt=user_prompt,
            requested_thinking_tokens=requested_thinking_tokens,
            simulated_current_rpm=simulated_current_rpm,
            attempted_db_tenant_filter=attempted_db_tenant_filter,
            requested_mcp_connector=requested_mcp_connector,
            topology=core_models.IsolationTopology.PATTERN_A_POOLED,
        )
