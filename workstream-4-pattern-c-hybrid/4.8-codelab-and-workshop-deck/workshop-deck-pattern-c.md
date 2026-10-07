# Workstream 4.8: Workshop Deck — Dynamic Hybrid Architecture & Live Tier Migration (Pattern C)

> **Presentation Format**: 10-Slide Master Workshop Deck (90-Min Session)  
> **Milestone**: Milestone 3 • Week 10 Release

---

## Slide 1: Title Slide
* **Title**: Pattern C: Dynamic Hybrid Multi-Tenant Agentic AI
* **Subtitle**: Unified Control Plane, Private Service Connect (PSC) Spokes & Zero-Downtime Tenant Tier Upgrades

## Slide 2: The Multi-Tier SaaS Growth Journey
* **Challenge**: B2B SaaS providers need Pooled unit economics (`Pattern A`) for SMB/Standard tiers and Sovereign isolation (`Pattern B`) for Fortune 500 Enterprise tiers—under one control plane.

## Slide 3: Pattern C Hub-and-Spoke Architecture with Private Service Connect (PSC)
* **Central Ingress Hub**: Cloud Armor + IAP + Tenant-Aware Intelligent Router + Cross-Project GEAP Registry.
* **Shared Pool**: Serves Standard tenants (`RetailStream` initial state) with 90% prefix cache savings.
* **Dedicated PSC Spokes**: Serves Enterprise tenants (`FinVault`) inside isolated VPC-SC perimeters.

## Slide 4: Why Private Service Connect (PSC) Is the Ideal Spoke Bridge
* **Benefits**:
  * Zero IP CIDR overlap across hundreds of tenant spokes.
  * Unidirectional producer-consumer security (`ServiceAttachment` allowlists only the Hub project).
  * Compatible with VPC Service Controls ingress/egress policies.

## Slide 5: Cross-Project GEAP Agent & MCP Registry
* **How It Works**: Synchronizes private spoke agent metadata (`Agent Alpha`) to the central PDP so Enterprise users get a unified catalog while Standard users receive `403 Forbidden`.

## Slide 6: The Silent Tenant Tier Upgrade Challenge (`Standard -> Enterprise`)
* **Scenario**: RetailStream upgrades to Enterprise mid-business-day.
* **Requirement**: Zero dropped multi-turn conversations, zero lost Memory Bank context, instant promotion from `4,000` to `8,000` thinking tokens and CMEK encryption.

## Slide 7: 3-Phase Zero-Downtime Migration State Machine
* **Phase 1 (`SHADOW_SYNC`)**: Provision spoke via Terraform; replicate AlloyDB RLS rows & Memory Bank namespaces (`lag == 0ms`).
* **Phase 2 (`ATOMIC_CUTOVER`)**: Atomic Firestore route table update to `psc://10.10.0.51/...`.
* **Phase 3 (`DRAIN_AND_VERIFY`)**: Graceful drain of pooled workers; seamless continuation of active session IDs on the new PSC spoke.

## Slide 8: Live Demo — Upgrading RetailStream Mid-Session with Zero Downtime
* **Walkthrough**: Run `run_tier_migration_suite.py` and inspect pre-upgrade vs. post-upgrade routing receipts on session `sess-rs-live-upgrade-01`.

## Slide 9: GA Field Enablement Decision Matrix
* **Summary**: How FDEs and Customer Engineers guide customers across Patterns A, B, and C in a 15-minute architecture discovery session.

## Slide 10: Program Wrap-Up & Next Steps
* **Call to Action**: Deploy the 3 Terraform blueprints, run the 3 automated verification suites, and review the Capstone Triad Blog.
