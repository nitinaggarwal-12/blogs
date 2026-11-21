"""Pure-Python Pattern A (Pooled) tenant isolation, token clamping, and bulkhead primitives."""
from __future__ import annotations

import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass

TENANT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,39}$")

TIER_MAX_OUTPUT_TOKENS: dict[str, int] = {
    "STANDARD": 4000,
    "ENTERPRISE": 16000,
}

# Seed rows demonstrating 4 competing tenants sharing one pooled BigQuery table
SEED_TENANT_ROWS: list[dict[str, str]] = [
    {"entity_id": "ENT-FV-1001", "tenant_id": "finvault", "domain": "Banking", "record_summary": "OCC Tier-1 Wire Liquidity Ledger", "classification": "CONFIDENTIAL"},
    {"entity_id": "ENT-FV-1003", "tenant_id": "finvault", "domain": "Banking", "record_summary": "Fedwire Settlement Audit Batch", "classification": "CONFIDENTIAL"},
    {"entity_id": "ENT-RS-2001", "tenant_id": "retailstream", "domain": "Retail", "record_summary": "Peak Holiday Checkout Latency Trace", "classification": "INTERNAL"},
    {"entity_id": "ENT-RS-2002", "tenant_id": "retailstream", "domain": "Retail", "record_summary": "POS Inventory Replenishment Feed", "classification": "INTERNAL"},
    {"entity_id": "ENT-GX-3001", "tenant_id": "globex", "domain": "Logistics", "record_summary": "EMEA Freight Routing Manifest", "classification": "CONFIDENTIAL"},
    {"entity_id": "ENT-MC-4001", "tenant_id": "medcore", "domain": "Healthcare", "record_summary": "Phase-III Clinical Trial Biomarker Index", "classification": "RESTRICTED"},
    {"entity_id": "ENT-MC-4002", "tenant_id": "medcore", "domain": "Healthcare", "record_summary": "GxP Batch Release Signoff Log", "classification": "RESTRICTED"},
]


@dataclass(frozen=True)
class BulkheadVerdict:
    allowed: bool
    current_count: int
    limit: int
    retry_after_sec: int


def validate_tenant_id(tenant_id: str) -> str:
    cleaned = str(tenant_id or "").strip().lower()
    if not TENANT_ID_RE.fullmatch(cleaned):
        raise ValueError("Invalid tenant_id format")
    return cleaned


def clamp_output_tokens(tier: str, requested_tokens: int) -> int:
    cap = TIER_MAX_OUTPUT_TOKENS.get(str(tier or "STANDARD").upper(), 4000)
    return max(256, min(int(requested_tokens), cap))


def verify_zero_cross_tenant_leakage(expected_tenant: str, rows: list[dict[str, str]]) -> bool:
    vt = validate_tenant_id(expected_tenant)
    return all(str(r.get("tenant_id", "")).strip().lower() == vt for r in rows)


class TenantSlidingWindowBulkhead:
    """In-process sliding-window fallback (paired with Firestore atomic counter in production)."""

    def __init__(self, rpm_limit: int = 5) -> None:
        self.rpm_limit = max(1, int(rpm_limit))
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check_and_record(self, tenant_id: str, now: float | None = None) -> BulkheadVerdict:
        vt = validate_tenant_id(tenant_id)
        ts = time.monotonic() if now is None else now
        bucket = self._buckets[vt]
        while bucket and ts - bucket[0] >= 60.0:
            bucket.popleft()
        if len(bucket) >= self.rpm_limit:
            retry_after = max(1, int(60.0 - (ts - bucket[0])))
            return BulkheadVerdict(False, len(bucket), self.rpm_limit, retry_after)
        bucket.append(ts)
        return BulkheadVerdict(True, len(bucket), self.rpm_limit, 0)
