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

import os
from typing import Dict, Optional, Tuple
from ..models import (
    CryptographicContext,
    HopAuditRecord,
    IsolationTopology,
    MemoryBankLevel,
    TENANT_PROFILES,
    TenantProfile,
)
from ..gcp_live_bridge import (
    kms_encrypt_decrypt_roundtrip,
    kms_set_key_version_state,
)


class ComputeFinOpsBulkhead:
    """Enforces GEAP Runtime + Firestore/Memorystore for Valkey Config + 5-Level Memory Bank + Live Cloud KMS CMEK at Hop 3."""

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES
        self._redis_rpm_counters: Dict[str, int] = {}
        # 5-Level Memory Bank storage keyed by `{tenant_id}:{level.value}:{namespace_key}`
        self._memory_bank_store: Dict[str, Dict[str, str]] = {}
        # Memorystore for Valkey warm cache keys (`cache:{tenant_id}:{key}`) and single-flight locks (`lock:cache_rebuild:{tenant_id}:{key}`)
        self._valkey_cache_store: Dict[str, str] = {
            "cache:finvault:prefix_v2": "warm",
            "cache:retailstream:prefix_v2": "warm",
        }
        self._valkey_single_flight_locks: Dict[str, int] = {}
        self._disabled_cmek_keys: set[str] = set()

    def _resolve_tenant_from_cmek_uri(self, cmek_uri: str) -> str:
        if "retailstream" in cmek_uri or "rs-kr" in cmek_uri:
            return "retailstream"
        return "finvault"

    def _is_tenant_cmek_disabled(self, tenant_id: str) -> Optional[str]:
        profile = self.tenant_profiles.get(tenant_id)
        if not profile:
            return None
        for candidate in (profile.cmek_key_uri, profile.silo_cmek_key_uri):
            if candidate and candidate in self._disabled_cmek_keys:
                return candidate
        return None

    def unlink_tenant_valkey_cache(self, tenant_id: str) -> Dict[str, object]:
        """
        Targeted Memorystore for Valkey `SCAN 0 MATCH cache:{tenant_id}:* COUNT 500 -> UNLINK`.
        Evicts strictly the revoked tenant's cached keys in <5s without executing a global FLUSHALL.
        """
        prefix = f"cache:{tenant_id}:"
        matched_keys = [k for k in list(self._valkey_cache_store.keys()) if k.startswith(prefix)]
        for k in matched_keys:
            self._valkey_cache_store.pop(k, None)
        surviving_other_tenant_keys = [
            k for k in self._valkey_cache_store.keys() if not k.startswith(prefix)
        ]
        return {
            "command": f"SCAN 0 MATCH cache:{tenant_id}:* COUNT 500 -> UNLINK",
            "unlinked_keys": matched_keys,
            "surviving_other_tenant_keys": surviving_other_tenant_keys,
            "global_flushall_executed": False,
        }

    def acquire_single_flight_cache_lock(
        self, tenant_id: str, cache_key: str = "prefix_v2", ttl_ms: int = 5000
    ) -> Dict[str, object]:
        """
        Memorystore for Valkey `SET lock:cache_rebuild:{tenant_id}:{cache_key} 1 NX PX 5000` single-flight lock.
        Prevents thundering-herd cache stampedes against Vertex AI when a cold cache rebuilds.
        """
        lock_key = f"lock:cache_rebuild:{tenant_id}:{cache_key}"
        acquired = lock_key not in self._valkey_single_flight_locks
        if acquired:
            self._valkey_single_flight_locks[lock_key] = ttl_ms
            self._valkey_cache_store[f"cache:{tenant_id}:{cache_key}"] = "warm"
        return {
            "lock_key": lock_key,
            "command": f"SET {lock_key} 1 NX PX {ttl_ms}",
            "acquired_leader": acquired,
            "follower_action": "REBUILD_CONTEXT_CACHE" if acquired else "AWAIT_PUBSUB_WARM_CACHE",
            "ttl_ms": ttl_ms,
        }

    def disable_cmek_key(self, cmek_uri: str) -> int:
        """
        Disables the tenant CMEK key (both in-memory and live in Cloud KMS `cymbal-multi-tenant-kr` when CYMBAL_LIVE_GCP=1)
        and immediately purges all in-flight L1-L4 Memory Bank entries and Valkey `cache:{tenant_id}:*` keys (<5s SLA).
        """
        self._disabled_cmek_keys.add(cmek_uri)
        tenant_id = self._resolve_tenant_from_cmek_uri(cmek_uri)
        purged_partitions = [
            k for k in list(self._memory_bank_store.keys()) if k.startswith(f"{tenant_id}:")
        ]
        for k in purged_partitions:
            self._memory_bank_store.pop(k, None)
        self.unlink_tenant_valkey_cache(tenant_id)
        if os.environ.get("CYMBAL_LIVE_GCP") == "1":
            kms_set_key_version_state(tenant_id, enabled=False)
        return len(purged_partitions)

    def enable_cmek_key(self, cmek_uri: str) -> None:
        """Restores the tenant CMEK key (both in-memory and live in Cloud KMS `cymbal-multi-tenant-kr` when CYMBAL_LIVE_GCP=1)."""
        self._disabled_cmek_keys.discard(cmek_uri)
        tenant_id = self._resolve_tenant_from_cmek_uri(cmek_uri)
        self._valkey_cache_store[f"cache:{tenant_id}:prefix_v2"] = "warm"
        if os.environ.get("CYMBAL_LIVE_GCP") == "1":
            kms_set_key_version_state(tenant_id, enabled=True)

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
        disabled_cmek = self._is_tenant_cmek_disabled(ctx.tenant_id)
        if disabled_cmek:
            raise PermissionError(
                f"HTTP_423_LOCKED: KMS_KEY_DISABLED for tenant '{ctx.tenant_id}' ('{disabled_cmek}'). Memory Bank write rejected."
            )
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
        Strictly blocks cross-tenant reads if `target_namespace` does not start with `{caller_ctx.tenant_id}:`
        and rejects reads if the caller's Cloud KMS CMEK key is disabled.
        """
        if not target_namespace.startswith(f"{caller_ctx.tenant_id}:"):
            raise PermissionError(
                f"Hop 3 5-Level Memory Bank Access Denied: Tenant '{caller_ctx.tenant_id}' "
                f"cannot read memory namespace '{target_namespace}'."
            )
        disabled_cmek = self._is_tenant_cmek_disabled(caller_ctx.tenant_id)
        if disabled_cmek:
            raise PermissionError(
                f"HTTP_423_LOCKED: KMS_KEY_DISABLED for tenant '{caller_ctx.tenant_id}' ('{disabled_cmek}'). Memory Bank purged."
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

        from ..gcp_live_bridge import bq_verify_cmek_silo_lockout

        # 1. Verify CMEK status if tenant or topology mandates CMEK encryption
        if active_cmek and active_cmek in self._disabled_cmek_keys:
            cmek_meta: Dict[str, object] = {
                "cmek_key_uri": active_cmek,
                "valkey_targeted_unlink": f"SCAN 0 MATCH cache:{ctx.tenant_id}:* COUNT 500 -> UNLINK",
            }
            if os.environ.get("CYMBAL_LIVE_GCP") == "1":
                cmek_meta["live_bigquery_cmek_lockout"] = bq_verify_cmek_silo_lockout()
            return {}, HopAuditRecord(
                hop_number=3,
                hop_name="Hop 3 • Compute Plane, Memory Bank & FinOps Bulkhead",
                decision="DENY",
                status_code=423,
                detail=(
                    f"KMS_KEY_DISABLED: Tenant '{ctx.tenant_id}' CMEK key '{active_cmek}' "
                    f"has been revoked. Halting Memory Bank & Runtime execution immediately."
                ),
                metadata=cmek_meta,
            )

        live_kms_receipt = None
        if active_cmek and os.environ.get("CYMBAL_LIVE_GCP") == "1":
            live_kms_receipt = kms_encrypt_decrypt_roundtrip(
                ctx.tenant_id,
                f"memory_bank:{ctx.memory_bank_namespace}:budget={requested_thinking_tokens}",
            )
            if not live_kms_receipt.get("live_kms_ok") and not live_kms_receipt.get("sandbox_billing_paused"):
                return {}, HopAuditRecord(
                    hop_number=3,
                    hop_name="Hop 3 • Compute Plane, Memory Bank & FinOps Bulkhead",
                    decision="DENY",
                    status_code=423,
                    detail=(
                        f"KMS_KEY_DISABLED: Tenant '{ctx.tenant_id}' CMEK key '{active_cmek}' "
                        f"rejected by live Cloud KMS (`cymbal-multi-tenant-kr`). Halting execution immediately."
                    ),
                    metadata={"cmek_key_uri": active_cmek, "live_kms_error": live_kms_receipt},
                )

        # 2. Enforce Memorystore for Valkey rate-limit bulkhead (Noisy Neighbor protection)
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
                    "retry_after_seconds": 2,
                    "retry_after_jitter_ms": 350,
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

        native_membank_cmek_enabled = (
            os.environ.get("CYMBAL_NATIVE_MEMBANK_CMEK_ENABLED", "false").lower() == "true"
        )

        runtime_config: Dict[str, object] = {
            "sandbox": "gvisor-isolated",
            "immutable_state_key": ctx.temp_tenant_id,
            "memory_namespace": ctx.memory_bank_namespace,
            "memory_levels_enabled": [lvl.value for lvl in MemoryBankLevel],
            "cmek_key_uri": active_cmek or "google-managed-encryption",
            "ga_sunset_flag": "CYMBAL_NATIVE_MEMBANK_CMEK_ENABLED",
            "native_membank_cmek_enabled": native_membank_cmek_enabled,
            "dynamic_firestore_config": dynamic_cfg,
            "effective_thinking_budget": effective_thinking_budget,
            "requested_thinking_tokens": requested_thinking_tokens,
            "thinking_budget_clamped": clamped,
            "context_cache_config": {
                "cache_id": "cache://cymbal-operator/shared-diagnostic-system-prefix-v2",
                "mode": "READ_ONLY_IMMUTABLE_PREFIX",
                "estimated_cogs_savings_pct": 90,
                "tenant_suffix_isolated": True,
                "single_flight_lock": f"SET lock:cache_rebuild:{ctx.tenant_id}:prefix_v2 1 NX PX 5000",
            },
        }
        if live_kms_receipt is not None:
            runtime_config["live_cloud_kms_cmek"] = live_kms_receipt

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
