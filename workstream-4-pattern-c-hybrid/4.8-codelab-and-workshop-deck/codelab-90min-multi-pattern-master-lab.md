# 90-Minute Master Codelab: Complete Multi-Pattern Hybrid Architecture & Live Tier Migration on GEAP (Pattern C)

> **Workstream 4.8 • Codelab Guide ("Complete Multi-Pattern Master Lab")**  
> **Duration**: 90 Minutes  
> **Level**: Master Architect (L400)  
> **Scenario**: Cymbal SaaS Platform — Unifying Pooled & Sovereign Spokes via Private Service Connect (PSC) and Executing a Live Zero-Downtime Tenant Tier Upgrade

---

## Lab Overview & Schedule

In this capstone 90-minute master codelab, you will operate Cymbal's **Pattern C (Dynamic Hybrid)** control plane—routing Standard tenants (**RetailStream Corp**) to the shared Pooled runtime while routing Enterprise tenants (**FinVault Bank**) over **Private Service Connect (PSC)** to dedicated VPC-SC spokes—and then execute a **live zero-downtime tier upgrade** promoting RetailStream to its own Sovereign PSC Spoke mid-session.

| Module | Time | Focus Area | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Module 1** | `00:00–00:20` | Configure the Tenant-Aware Intelligent Ingress Router | Verify `STANDARD` $\rightarrow$ Pool (`4k` cap) & `ENTERPRISE` $\rightarrow$ PSC Spoke (`8k` cap) |
| **Module 2** | `00:20–00:45` | Wire Producer PSC Service Attachments & Consumer Endpoints | Inspect [`main.tf`](file:///Users/nitinagga/documents/fde-blogs/workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf) NAT subnets & forwarding rules |
| **Module 3** | `00:45–01:10` | Execute Phase 1 (`SHADOW_SYNC`) & Phase 2 (`ATOMIC_CUTOVER`) Live Tier Upgrade | Verify `replication_lag_ms == 0` & atomic Firestore route flip |
| **Module 4** | `01:10–01:30` | Verify Post-Upgrade Session Continuity (`DRAIN_AND_VERIFY`) | Confirm `sess-rs-live-upgrade-01` continues on PSC Spoke with `8,000` thinking budget & CMEK |

---

## Hands-On Execution Steps

1. Inspect [`pattern_c_hybrid_router_and_migrator.py`](file:///Users/nitinagga/documents/fde-blogs/workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) to see how `route_and_invoke()` resolves the caller's verified identity at Hop 1 and selects either `PATTERN_C_HYBRID_POOL` or `PATTERN_C_HYBRID_PSC_SPOKE`.
2. Review [`execute_zero_downtime_tier_upgrade()`](file:///Users/nitinagga/documents/fde-blogs/workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py) to trace the 3-phase migration state machine (`PHASE_1_SHADOW_SYNC`, `PHASE_2_ATOMIC_CUTOVER`, `PHASE_3_DRAIN_AND_VERIFY`).
3. Run the automated verification suite and confirm all 4 Hybrid & Live Tier Upgrade assertions pass:

```bash
python3 workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py
```
