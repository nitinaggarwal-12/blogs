"""
Cymbal Shared Incident Diagnostic Agent (`agent://cymbal/shared-incident-diagnostic-v2`).

Published by Cymbal SaaS Platform (ISV Operator):
- Correlates outage telemetry, queries tenant runbooks, and proposes remediation.
- Runs Gemini 2.5 Pro with shared Prompt Prefix Caching (`ContextCacheConfig` — up to 90% COGS savings).
- Loads per-tenant prompts, thinking budgets & GCS Skills via Firestore + Memorystore.
"""

from typing import Dict, List, Optional
from ..models import CryptographicContext, TENANT_PROFILES, TenantProfile


class SharedIncidentDiagnosticAgent:
    AGENT_URI = "agent://cymbal/shared-incident-diagnostic-v2"

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES

    def execute_reasoning_turn(
        self,
        ctx: CryptographicContext,
        user_prompt: str,
        bound_tools: List[str],
        rls_incidents: List[Dict[str, str]],
        effective_thinking_budget: int,
    ) -> str:
        profile = self.tenant_profiles[ctx.tenant_id]
        incident_summaries = "; ".join(
            f"[{row['incident_id']}] {row['service']}: {row['summary']}"
            for row in rls_incidents
        )
        skills_loaded = ",".join(profile.gcs_skills_uris)
        return (
            f"[SharedDiagnosticAgent • Model={profile.primary_model} • "
            f"ThinkingBudget={effective_thinking_budget} • "
            f"Memory={ctx.memory_bank_namespace} • "
            f"GCSSkills={skills_loaded} • "
            f"BoundTools={','.join(bound_tools)}] "
            f"Diagnosed tenant '{ctx.tenant_id}' incidents: {incident_summaries}"
        )
