"""Pure-Python Pattern C Dynamic Hybrid Router & 3-Phase Atomic CAS Cutover state machine."""
from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from typing import Any

TENANT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,39}$")


@dataclass(frozen=True)
class CutoverPlan:
    tenant_id: str
    previous_version: int
    next_version: int
    phases: list[str]
    next_route: dict[str, Any]


def validate_tenant_id(tenant_id: str) -> str:
    cleaned = str(tenant_id or "").strip().lower()
    if not TENANT_ID_RE.fullmatch(cleaned):
        raise ValueError("Invalid tenant_id format")
    return cleaned


def build_atomic_promotion_plan(
    current_route: dict[str, Any],
    spoke_target_url: str,
    psc_consumer_ip: str,
) -> CutoverPlan:
    """Compute an immutable, instance-scoped 3-phase Standard -> Enterprise promotion record."""
    route_copy = copy.deepcopy(current_route)
    tenant = validate_tenant_id(str(route_copy.get("tenant_id", "")))
    prev_ver = int(route_copy.get("route_version", 1))
    next_ver = prev_ver + 1
    next_route = {
        "tenant_id": tenant,
        "tier": "ENTERPRISE",
        "topology": "PATTERN_C_HYBRID_PSC_SPOKE",
        "target_url": spoke_target_url,
        "psc_endpoint": psc_consumer_ip,
        "route_version": next_ver,
        "cutover_status": "ACTIVE_SPOKE",
    }
    return CutoverPlan(
        tenant_id=tenant,
        previous_version=prev_ver,
        next_version=next_ver,
        phases=["SHADOW_SYNC", "ATOMIC_CUTOVER", "DRAIN_AND_VERIFY"],
        next_route=next_route,
    )
