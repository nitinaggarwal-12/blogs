"""
Hop 3 — Compute Plane, Dynamic Firestore/Memorystore Config, 5-Level Memory Bank & FinOps Bulkheads.

Enforces Governance Pillar 3 (Model, Memory & FinOps):
1. Binds immutable `temp:tenant_id` inside the GEAP Agent Runtime gVisor sandbox.
2. Dynamically loads per-tenant prompts, thinking budgets & GCS Skills (`gs://...`)
   via Firestore + Memorystore (Slide 7 Cymbal Platform Operator spec).
3. Enforces per-tenant thinking-token budgets (8,000 for FinVault Enterprise vs.
   4,000 for RetailStream Standard) and Memorystore for Redis RPM/token bulkheads.
4. Implements the 5-Level Memory Bank (`L1_TURN_EPHEMERAL` .. `L5_PLATFORM_SHARED_SKILLS`)
   keyed by `{tenant}:{user}:{session}` and verifies Cloud KMS CMEK key state.
5. Attaches shared Prompt Prefix Caching (`ContextCacheConfig`) for shared
   system instructions (yielding up to 90% COGS savings without cross-tenant bleed).
"""

from typing import Dict, Optional, Tuple
from ..models import (
    CryptographicContext,
    HopAuditRecord,
    IsolationTopology,
    MemoryBankLevel,
    TENANT_PROFILES,
    TenantProfile,
)


class ComputeFinOpsBulkhead:
    """Simulates GEAP Runtime + Firestore/Memorystore Config + 5-Level Memory Bank at Hop 3."""

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES
        self._redis_rpm_counters: Dict[str, int] = {}
        # 5-Level Memory Bank storage keyed by `{tenant_id}:{level.value}:{namespace_key}`
        self._memory_bank_store: Dict[str, Dict[str, str]] = {}
        self._disabled_cmek_keys: set[str] = set()

    def disable_cmek_key(self, cmek_uri: str) -> None:
        """Used in Workstream 3 (Pattern B) to simulate customer CMEK revocation kill-switch."""
        self._disabled_cmek_keys.add(cmek_uri)

    def enable_cmek_key(self, cmek_uri: str) -> None:
        self._disabled_cmek_keys.discard(cmek_uri)

    def load_dynamic_runtime_config(self, ctx: CryptographicContext) -> Dict[str, object]:
        """
        Loads per-tenant prompts, thinking budgets & GCS Skills via Firestore + Memorystore (Slide 7).
        Validates that every loaded GCS Skill URI matches `gs://cymbal-skills-{ctx.tenant_id}/`.
        """
        profile = self.tenant_profiles[ctx.tenant_id]
        expected_prefix = f"gs://cymbal-skills-{ctx.tenant_id}/"
        for skill_uri in profile.gcs_skills_uris:
            if not skill_uri.startswith(expected_prefix):
                raise PermissionError(
                    f"Cross-Tenant GCS Skill Bleed Detected: '{skill_uri}' does not match '{expected_prefix}'."
                )
        return {
            "config_source": "Firestore+Memorystore",
            "tenant_id": ctx.tenant_id,
            "system_prompt_template": profile.system_prompt_template,
            "thinking_token_budget": profile.thinking_token_budget,
            "gcs_skills_uris": list(profile.gcs_skills_uris),
        }

    def write_memory_bank(
        self,
        ctx: CryptographicContext,
        level: MemoryBankLevel,
        key: str,
        value: str,
    ) -> str:
        """Writes an entry to one of the 5 Memory Bank levels under the tenant's isolated namespace."""
        if level == MemoryBankLevel.L5_PLATFORM_SHARED_SKILLS:
            raise PermissionError("L5_PLATFORM_SHARED_SKILLS is immutable read-only for tenants.")
        partition_key = f"{ctx.memory_bank_namespace}:{level.value}"
        if partition_key not in self._memory_bank_store:
            self._memory_bank_store[partition_key] = {}
        self._memory_bank_store[partition_key][key] = value
        return partition_key

    def read_memory_bank(
        self,
        caller_ctx: CryptographicContext,
        target_namespace: str,
        level: MemoryBankLevel,
        key: str,
    ) -> str:
        """
        Reads from the 5-Level Memory Bank.
        Strictly blocks cross-tenant reads if `target_namespace` does not start with `{caller_ctx.tenant_id}:`.
        """
        if not target_namespace.startswith(f"{caller_ctx.tenant_id}:"):
            raise PermissionError(
                f"Hop 3 5-Level Memory Bank Access Denied: Tenant '{caller_ctx.tenant_id}' "
                f"cannot read memory namespace '{target_namespace}'."
            )
        partition_key = f"{target_namespace}:{level.value}"
        return self._memory_bank_store.get(partition_key, {}).get(key, "")

    def enforce_compute_and_finops(
        self,
        ctx: CryptographicContext,
        requested_thinking_tokens: int,
        simulated_current_rpm: int = 1,
    ) -> Tuple[Dict[str, object], HopAuditRecord]:
        profile = self.tenant_profiles[ctx.tenant_id]

        # Resolve effective CMEK key (Pattern B Siloed enforces silo_cmek_key_uri for all tenants)
        active_cmek = (
            profile.silo_cmek_key_uri
            if ctx.active_topology == IsolationTopology.PATTERN_B_SILOED
            else profile.cmek_key_uri
        )

        # 1. Verify CMEK status if tenant or topology mandates CMEK encryption
        if active_cmek and active_cmek in self._disabled_cmek_keys:
            return {}, HopAuditRecord(
                hop_number=3,
                hop_name="Hop 3 • Compute Plane, Memory Bank & FinOps Bulkhead",
                decision="DENY",
                status_code=423,
                detail=(
                    f"KMS_KEY_DISABLED: Tenant '{ctx.tenant_id}' CMEK key '{active_cmek}' "
                    f"has been revoked. Halting Memory Bank & Runtime execution immediately."
                ),
                metadata={"cmek_key_uri": active_cmek},
            )

        # 2. Enforce Redis rate-limit bulkhead (Noisy Neighbor protection)
        self._redis_rpm_counters[ctx.tenant_id] = simulated_current_rpm
        if simulated_current_rpm > profile.redis_rpm_limit:
            return {}, HopAuditRecord(
                hop_number=3,
                hop_name="Hop 3 • Compute Plane, Memory Bank & FinOps Bulkhead",
                decision="DENY",
                status_code=429,
                detail=(
                    f"429 Too Many Requests: Tenant '{ctx.tenant_id}' exceeded Redis token bulkhead "
                    f"({simulated_current_rpm} RPM > {profile.redis_rpm_limit} RPM limit)."
                ),
                metadata={
                    "current_rpm": simulated_current_rpm,
                    "redis_rpm_limit": profile.redis_rpm_limit,
                },
            )

        # 3. Dynamically load per-tenant prompt, thinking budget & GCS Skills from Firestore + Memorystore
        dynamic_cfg = self.load_dynamic_runtime_config(ctx)

        # 4. Clamp runaway thinking-token budget based on tenant tier
        effective_thinking_budget = min(requested_thinking_tokens, profile.thinking_token_budget)
        clamped = requested_thinking_tokens > profile.thinking_token_budget

        # 5. Record active turn state in L2_SESSION_SHORT_TERM Memory Bank
        self.write_memory_bank(
            ctx=ctx,
            level=MemoryBankLevel.L2_SESSION_SHORT_TERM,
            key="last_thinking_budget",
            value=str(effective_thinking_budget),
        )

        runtime_config = {
            "sandbox": "gvisor-isolated",
            "immutable_state_key": ctx.temp_tenant_id,
            "memory_namespace": ctx.memory_bank_namespace,
            "memory_levels_enabled": [lvl.value for lvl in MemoryBankLevel],
            "cmek_key_uri": active_cmek or "google-managed-encryption",
            "dynamic_firestore_config": dynamic_cfg,
            "effective_thinking_budget": effective_thinking_budget,
            "requested_thinking_tokens": requested_thinking_tokens,
            "thinking_budget_clamped": clamped,
            "context_cache_config": {
                "cache_id": "cache://cymbal-operator/shared-diagnostic-system-prefix-v2",
                "mode": "READ_ONLY_IMMUTABLE_PREFIX",
                "estimated_cogs_savings_pct": 90,
                "tenant_suffix_isolated": True,
            },
        }

        audit = HopAuditRecord(
            hop_number=3,
            hop_name="Hop 3 • Compute Plane, Memory Bank & FinOps Bulkhead",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Bound '{ctx.temp_tenant_id}', 5-Level Memory '{ctx.memory_bank_namespace}', "
                f"& {len(dynamic_cfg['gcs_skills_uris'])} GCS Skill(s). "
                f"Thinking budget={effective_thinking_budget} (clamped={clamped})."
            ),
            metadata=runtime_config,
        )
        return runtime_config, audit
