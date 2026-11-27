---
title: "10-SaaS Multi-Cloud Before/After Visual Verification & Red-Team Atlas"
subtitle: "Live Before & After Console Evidence Gallery Across Google Cloud Console (WS1–WS5), Patterns A/B/C, Atlassian Jira Cloud & ThoughtSpot Cloud"
series: "Multi-Tenant Agentic AI on Google Cloud — Companion Visual Atlas"
workstream: "Cross-Workstream Visual Verification & Multi-Cloud Proof Atlas (WS1–WS5)"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "CISOs, Enterprise Architects, Platform Security Leads, and Multi-Cloud Engineering Teams"
reading_time: "12 min read"
tags: ["10-SaaS Visual Atlas", "Multi-Cloud Federation", "AWS Bedrock AgentCore", "Google Cloud Run Gen2", "Before & After Console Proofs", "Zero-Trust 5-Hop", "Red-Team Verification"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["saas10-multicloud-a2a-mcp-bridge"]
editable_slides: "slides/saas-10-visual-verification-atlas-16slide-deck.pptx"
status: "PUBLISH_READY"
---

This standalone **Visual Verification Atlas** consolidates all **live console captures** (**9 complete BEFORE → AFTER resolution pairs** + Cloud KMS keyring control plane across Google Cloud Console `cymbal-ge-hub-2026` / `cymbal-ge-silo-2026`, Atlassian Jira Cloud, and ThoughtSpot Cloud — every image verified from live Google Cloud Console and commercial SaaS sessions) alongside the approved **Multi-Cloud Federation Architecture diagram (`Slide 11/12`)** so each core architectural guide (`WS1–WS5`) stays laser-focused while CISOs and architects have one authoritative evidence gallery.

> **Approved Multi-Cloud Bridge & Companion Atlas Assets:**
> - **Approved 12-Slide Architecture Deck (Multi-Cloud Bridge = Slide 11):** [Open Slide 11 in Google Slides ↗](https://docs.google.com/presentation/d/1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk/edit#slide=id.p11) • [Draw.io Source (`.drawio`)](../diagrams/saas10-multicloud-a2a-mcp-bridge.drawio)
> - **Editable Google Docs Visual Atlas (`20` Verified Figures: 1 Multi-Cloud Bridge + 19 Live GCP Console & Commercial SaaS Console Proofs):** [Open 10-SaaS Visual Atlas in Google Docs ↗](https://docs.google.com/document/d/1FwxBGLefb0NIyG8i6QytRr8ugXyJf-sdY5lTLSA6EQY/edit?resourcekey=0-klzhSI2SvWYPCvpPwwMSUw) • [Download `.docx`](../docs/word/saas-10-visual-verification-and-redteam-atlas.docx)
> - **Editable Google Slides Visual Atlas (`17` Native Slides — Cover + 16 Evidence Slides):** [Open 17-Slide Visual Atlas in Google Slides ↗](https://docs.google.com/presentation/d/1opxya9JlD9pwRsyOZYw0aS4hiLT7PzuntwR2Y9E9qXs/edit?resourcekey=0-bnGKTSSW6T6EoXChSqzgKw) • [Download `.pptx`](../slides/saas-10-visual-verification-atlas-16slide-deck.pptx)
> - **Live Verification Receipts:** [`docs/cloud_console_verification_receipt.json`](../docs/cloud_console_verification_receipt.json) • [`docs/cloudrun_to_aws_10_saas_live_receipt.json`](../docs/cloudrun_to_aws_10_saas_live_receipt.json)

---

## Multi-cloud federation plane: Google Cloud ↔ AWS Bedrock AgentCore & 10 SaaS (Figure 1)

Every cross-cloud MCP verification trace below executes from the **Google Cloud 5-Hop ADK Runtime** (`ramp-portal-dev` `#248990048888` backend harness; clean customer demo console projects `cymbal-ge-hub-2026` `#252968359259` & `cymbal-ge-silo-2026` `#495457819919` for all 13 live GCP Console screenshots) using keyless OIDC STS federation (`0` static AWS keys) through **AWS Bedrock AgentCore MCP Gateway** (`cymbal-a2a-mcp-gateway-suyxm3caof`, AWS Account `393036065405`, `us-east-1`), writing immutable audit proofs into Amazon S3. All console screenshots below are captured directly from live Google Cloud Console and commercial SaaS tenants.

![Figure 1 (Approved Slide 11/12) — WS5 - PART 5 - Multi-Cloud Federation: Google Cloud Plane ↔ AWS & 10 SaaS](../diagrams/saas10-multicloud-a2a-mcp-bridge.svg)

*Figure 1 (Approved Slide 11/12). Multi-Cloud Federation topology bridging the Google Cloud 5-Hop Control & Runtime Plane (`cymbal-ge-hub-2026` / `cymbal-ge-silo-2026`) with AWS Bedrock AgentCore MCP Gateway (`cymbal-a2a-mcp-gateway-suyxm3caof`), all 10 third-party SaaS targets (`READY`), and immutable Amazon S3 cryptographic audit ledgers.*

---

## Workstream-to-signature SaaS proof index

To keep each architecture guide scannable, every workstream maps its primary commercial SaaS targets and dedicated `/blogs/<slug>/screenshots` screenshot gallery:

| Workstream Guide | Commercial SaaS Targets | Primary Multi-Tenant Control Proven | Persisted S3 Ledgers (`?format=json`) |
| :--- | :--- | :--- | :--- |
| **[Part 1 (`WS1`)](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)**<br>_5-Hop Governance Baseline_ | **`SAAS-01` ThoughtSpot Cloud** (`HXGGFMZBKE`) & **`SAAS-06` Databricks Unity** (`TERCK8SLBP`) | Hop 1 STS identity propagation + Hop 5 RLS & federated SQL attribution | [`SAAS-01` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) • [`SAAS-06` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) |
| **[Part 2 (`WS2`)](ws2-pattern-a-pooled-architecture.md)**<br>_Pattern A Pooled Runtime_ | **`SAAS-03` ServiceNow ITSM** (`ZS9VGYHBQL`) & **`SAAS-07` Snowflake Cortex** (`CCMDEVZV2S`) | Hop 5 DPoP-bound `3LO` change automation + kernel RLS `0`-row cross-tenant block | [`SAAS-03` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) • [`SAAS-07` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) |
| **[Part 3 (`WS3`)](ws3-pattern-b-sovereign-silos.md)**<br>_Pattern B Sovereign Silos_ | **`SAAS-04` Veeva Vault RIM** (`TWQU0KSRVF`) & **`SAAS-10` Okta & CrowdStrike** (`C7EYM614F2`) | Cloud KMS `21 CFR Part 11` ECDSA signature + sovereign DPoP secret rotation | [`SAAS-04` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) • [`SAAS-10` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) |
| **[Part 4 (`WS4`)](ws4-pattern-c-hybrid-dynamic-tiering.md)**<br>_Pattern C Dynamic Hybrid_ | **`SAAS-02` Sigma Computing** (`IZVODT083Q`) & **`SAAS-05` Salesforce & Jira Cloud** (`K5JAEFCQ6E`) | Pool → `/28` PSC Spoke workbook attestation + Hop 4 Cloud SDP IBAN/SWIFT redaction | [`SAAS-02` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) • [`SAAS-05` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) |
| **[Part 5 (`WS5`)](ws5-decision-guide-and-agentic-triad.md)**<br>_Decision Guide & Triad_ | **`SAAS-08` Workday HCM RaaS** (`RAOTMUMJTZ`) & **`SAAS-09` Datadog SRE** (`G767QR3TQZ`) | Principal-scoped `3LO` SSN redaction + Zero-PII Model Armor OTel span ingestion | [`SAAS-08` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) • [`SAAS-09` JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) |

<!-- GENUINE_3P_BEFORE_AFTER_START -->

## Live Before & After Resolution Proof Gallery (Google Cloud Console & Commercial SaaS)

> [!IMPORTANT]
> **Live Before → After Console Proofs:** Every single screenshot below was captured live from genuine public Google Cloud Console (`console.cloud.google.com`, projects `cymbal-ge-hub-2026` & `cymbal-ge-silo-2026`), Atlassian Jira Cloud (`gcp-team-sbiarllr.atlassian.net`), and ThoughtSpot Cloud (`team2.thoughtspot.cloud`), and passed automated screenshot verification (`exit 0`, zero mock HTML, zero internal domains, zero overrides). Open the interactive Side-by-Side & Split-Slider gallery at **`/blogs/atlas/screenshots`**.

### WS1-BA-01 (BEFORE → AFTER): Hop 4 Model Armor Unprotected Baseline → Live Prompt-Injection Block
**Project:** `cymbal-ge-hub-2026` (`us-central1`) • **BEFORE:** (`No violations detected`) • **AFTER:** (`Template violations detected — Prompt injection & Dangerous Match found`)

![WS1 BEFORE: Live Google Cloud Model Armor unprotected baseline passing cross-tenant SSN prompt injection.](../screenshots/verified-cloud-console/ws1_before_model_armor_unprotected.png)
*WS1-BA-01 BEFORE: `ge-ws1-before-unprotected-baseline` leaves safety detectors `Disabled` — cross-tenant SSN prompt injection passes cleanly (`No violations detected`).*

![WS1 AFTER: Live Google Cloud Model Armor ge-zero-trust-ai-firewall blocking cross-tenant SSN prompt injection with Match found.](../screenshots/verified-cloud-console/ws1_after_model_armor_blocked.png)
*WS1-BA-01 AFTER: `ge-zero-trust-ai-firewall` flags `Template violations detected` (`Dangerous content: Match found` and `Prompt injection and jailbreak: Match found`).*

### WS1-BA-02 (BEFORE → AFTER): Hop 1 Cloud Armor Open Default-Allow → Priority 1000/1100 `Deny (403)` WAF
**Project:** `cymbal-ge-hub-2026` (`global`) • **BEFORE:** (`1 rule: Allow *`) • **AFTER:** (`P1000 X-Tenant-ID spoof Deny 403 + P1100 OWASP SQLi/XSS Deny 403`)

![WS1 BEFORE: Cloud Armor open edge policy cymbal-ws1-before-open-edge with default allow rule only.](../screenshots/verified-cloud-console/ws1_before_open_edge_baseline.png)
*WS1-BA-02 BEFORE: Open edge policy (`cymbal-ws1-before-open-edge`) allows all traffic (`*`) with zero header-spoof or OWASP WAF blocks.*

![WS1 AFTER: Cloud Armor Hop 1 WAF cymbal-pooled-edge-waf enforcing Priority 1000 and 1100 Deny 403 rules.](../screenshots/verified-cloud-console/ws1_after_cloud_armor_hop1_waf.png)
*WS1-BA-02 AFTER: `cymbal-pooled-edge-waf` blocks unauthenticated `X-Tenant-ID` smuggling at Priority `1,000` (`Deny 403`) and OWASP SQLi/XSS at Priority `1,100` (`Deny 403`).*

### WS1-BA-03 (BEFORE → AFTER): ThoughtSpot Cloud Spotter (`SAAS-01`) Unfiltered 6-Product-Line Query → Tenant-Scoped Clinical Analytics Filter
**Provider:** ThoughtSpot Cloud (`team2.thoughtspot.cloud`) • **BEFORE:** (`12 of 12 data points` across all 6 product lines) • **AFTER:** (Locked `Product Line = 'clinical analytics'` filter pill returning strictly `1` row `44.38 / 37.7`)

![WS1 BEFORE: Live ThoughtSpot Cloud Spotter query on team2.thoughtspot.cloud returning all 6 product lines (12 of 12 data points).](../screenshots/verified-cloud-console/ws1_before_thoughtspot_spotter_unscoped.png)
*WS1-BA-03 BEFORE: Unscoped Spotter BI query returns all 6 product lines (`12 of 12 data points`) across competing business units.*

![WS1 AFTER: Live ThoughtSpot Cloud Spotter query on team2.thoughtspot.cloud locked to Product Line = 'clinical analytics' returning strictly 1 row (44.38 / 37.7).](../screenshots/verified-cloud-console/ws1_after_thoughtspot_spotter_scoped.png)
*WS1-BA-03 AFTER: Locked `Product Line = 'clinical analytics'` tenant predicate isolates Spotter strictly to 1 authorized row (`44.38` feature adoption / `37.7` NPS) with `0` foreign product lines.*

### WS2-BA-01 (BEFORE → AFTER): Pattern A Pooled Cross-Tenant Bleed → Kernel RLS Tenant Isolation (BigQuery)
**Project:** `cymbal-ge-hub-2026` (`cymbal_agentic_finops_otel.pattern_a_pooled_rls_entities`) • **BEFORE:** (`1 – 7 of 7` rows across 6 competing tenants) • **AFTER:** (`1 – 2 of 2` FinVault rows, `0` foreign rows)

![WS2 BEFORE: Unscoped pooled BigQuery query leaking 7 rows across competing tenants.](../screenshots/verified-cloud-console/ws2_before_pooled_rls_cross_tenant_bleed.png)
*WS2-BA-01 BEFORE: Unscoped pooled query returns `1 – 7 of 7` rows exposing `finvault`, `globex`, `medcore`, and `retailstream` together.*

![WS2 AFTER: Pattern A JWT tenant-scoped BigQuery query isolating strictly 2 FinVault rows.](../screenshots/verified-cloud-console/ws2_after_pooled_rls_tenant_isolated.png)
*WS2-BA-01 AFTER: Pattern A JWT tenant-context query returns strictly `1 – 2 of 2` authorized FinVault records (`ENT-FV-1001`, `ENT-FV-1003`) with `0` cross-tenant leakage.*

### WS3-BA-01 + WS3-CTRL-02 (BEFORE → AFTER): Pattern B Sovereign Vault CMEK Access → Instant Revocation Kill-Switch
**Project:** `cymbal-ge-silo-2026` (`us-west1`) • **BEFORE:** (`VAULT-FV-9001..9002` decrypted) • **AFTER:** (`Cloud KMS Error: DISABLED`) + KMS Keyring

![WS3 BEFORE: BigQuery sovereign vault decrypting VAULT-FV-9001 and VAULT-FV-9002 while finvault-silo-cmek is enabled.](../screenshots/verified-cloud-console/ws3_before_cmek_enabled_vault_access.png)
*WS3-BA-01 BEFORE: Active `finvault-silo-cmek` decrypts `VAULT-FV-9001` and `VAULT-FV-9002` inside dedicated project `cymbal-ge-silo-2026`.*

![WS3 AFTER: BigQuery sovereign vault failing closed with Cloud KMS Error medcore-revoked-cmek state DISABLED.](../screenshots/verified-cloud-console/ws3_after_cmek_revoked_killswitch_denied.png)
*WS3-BA-01 AFTER: Disabling `medcore-revoked-cmek` causes BigQuery to fail closed live (`Cloud KMS Error: ... current state is: DISABLED.`).*

![WS3 Control Plane: Cloud KMS keyring cymbal-multi-tenant-kr showing finvault-silo-cmek Available and medcore-revoked-cmek Not available.](../screenshots/verified-cloud-console/ws3_after_kms_cmek_keyring_state.png)
*WS3-CTRL-02: Live Cloud KMS keyring `cymbal-multi-tenant-kr` displaying `finvault-silo-cmek` (`Available`) alongside `medcore-revoked-cmek` (`Not available`).*

### WS4-BA-01 (BEFORE → AFTER): Atlassian Jira Cloud Unfiltered Board → Live `'3LO'` Scoped Query View
**Provider:** Atlassian Jira Cloud (`gcp-team-sbiarllr.atlassian.net`) • **BEFORE:** (`6` mixed tickets) • **AFTER:** (`SCRUM-5` & `SCRUM-6` visible • `4` non-matching filtered out)

![WS4 BEFORE: Unfiltered live Atlassian Jira Cloud Scrum board on gcp-team-sbiarllr.atlassian.net exposing 6 mixed tickets.](../screenshots/verified-cloud-console/saas_06_atlassian_jira_confluence.png)
*WS4-BA-01 BEFORE: Unfiltered Jira Cloud Scrum board exposing all 6 mixed cross-domain tickets across 4 columns.*

![WS4 AFTER: Live 3LO-scoped Atlassian Jira Cloud Scrum board on gcp-team-sbiarllr.atlassian.net isolating SCRUM-5 and SCRUM-6.](../screenshots/verified-cloud-console/ws4_after_jira_3lo_scoped_issue.png)
*WS4-BA-01 AFTER: Live interactive `'3LO'` board query isolates strictly `SCRUM-5` & `SCRUM-6` while filtering out 4 non-matching tickets (`To Do 0 · In Review 0 · Done 0`); server-side per-user 3LO OAuth is enforced in Pattern C's MCP gateway.*

### WS4-BA-02 (BEFORE → AFTER): Pattern C Shared Commercial Hub VPC → Dedicated Sovereign FinVault PSC Spoke VPC
**Projects:** `cymbal-ge-hub-2026` → `cymbal-ge-silo-2026` • **BEFORE:** (`10.240.0.0/24` + `/28` PSC NAT `10.240.10.0/28`) • **AFTER:** (`10.140.0.0/24` dedicated sovereign spoke)

![WS4 BEFORE: Shared Pattern C Hub VPC Subnets tab showing 10.240.0.0/24 and 10.240.10.0/28 PSC NAT.](../screenshots/verified-cloud-console/ws4_before_shared_hub_vpc.png)
*WS4-BA-02 BEFORE: Shared Hub VPC `cymbal-pattern-c-hub-vpc` (`cymbal-hub-app-us-west1 10.240.0.0/24` + `/28` PSC NAT `10.240.10.0/28`).*

![WS4 AFTER: Dedicated Sovereign FinVault Spoke VPC Subnets tab showing isolated 10.140.0.0/24 in cymbal-ge-silo-2026.](../screenshots/verified-cloud-console/ws4_after_dedicated_finvault_spoke_vpc.png)
*WS4-BA-02 AFTER: Dedicated Sovereign FinVault Spoke VPC `cymbal-pattern-c-finvault-spoke-vpc` (`10.140.0.0/24`) isolated in separate project `cymbal-ge-silo-2026`.*

### WS5-BA-01 (BEFORE → AFTER): ThoughtSpot Cloud Unfiltered Liveboard → Governed Single-Domain Saved Answer
**Provider:** ThoughtSpot Cloud (`team2.thoughtspot.cloud`) • **BEFORE:** (`$735.3K` global rollup) • **AFTER:** (`Received Date = last 3 months` scoped answer)

![WS5 BEFORE: Unfiltered ThoughtSpot Cloud Executive Liveboard on team2.thoughtspot.cloud exposing global $735.3K sales KPIs.](../screenshots/verified-cloud-console/saas_01_thoughtspot_liveboard.png)
*WS5-BA-01 BEFORE: Unfiltered multi-region ThoughtSpot Cloud Liveboard with all 6 dimension filters unselected.*

![WS5 AFTER: Governed ThoughtSpot Cloud Saved Answer on team2.thoughtspot.cloud scoped to a single authorized dataset and 3-month window.](../screenshots/verified-cloud-console/saas_02_thoughtspot_saved_answer.png)
*WS5-BA-01 AFTER: Governed ThoughtSpot Cloud Saved Answer scoped to a single authorized domain dataset & explicit 3-month window.*

### WS5-BA-02 (BEFORE → AFTER): Standalone Integration Connectors → Unified Cloud Run A2A & OAuth 2.1 OBO Federation Hub
**Project:** `cymbal-ge-hub-2026` • **BEFORE:** (point-to-point connector wizard) • **AFTER:** (4 authenticated Cloud Run A2A/MCP services)

![WS5 BEFORE: Live Google Cloud Integration Connectors Create Connection wizard in cymbal-ge-hub-2026.](../screenshots/verified-cloud-console/ws5_before_connectors_baseline.png)
*WS5-BA-02 BEFORE: Standalone point-to-point Integration Connectors setup requiring static per-connection authentication without centralized A2A governance.*

![WS5 AFTER: Live Google Cloud Run Services table in cymbal-ge-hub-2026 showing 4 authenticated A2A and MCP OAuth 2.1 OBO services.](../screenshots/verified-cloud-console/ws5_after_a2a_gateway_federation.png)
*WS5-BA-02 AFTER: Unified Cloud Run A2A & MCP OAuth 2.1 OBO Federation Hub (`a2a-gateway`, `a2a-ge-orchestrator`, `cymbal-multi-tenant-patterns`, `mcp-oauth21-obo-gateway`, all enforcing `Require authentication`).*

<!-- GENUINE_3P_BEFORE_AFTER_END -->

---

## What's next

- **Return to the 5-Part Multi-Tenant Architecture Series:**
 - **Part 1 (`WS1`):** [Reference Architecture & 5-Hop Governance Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
 - **Part 2 (`WS2`):** [Pattern A: High-Density Pooled Multi-Tenant Architecture](ws2-pattern-a-pooled-architecture.md)
 - **Part 3 (`WS3`):** [Pattern B: Zero-Trust Sovereign Silos for Regulated Workloads](ws3-pattern-b-sovereign-silos.md)
 - **Part 4 (`WS4`):** [Pattern C: Dynamic Hybrid Routing & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
 - **Part 5 (`WS5`):** [Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- **Live Verification Playbook & Receipts:** [`10-SaaS 3-Pattern Manual Testing Playbook`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md) • [`Cloud Run → AWS Live Receipt`](../docs/cloudrun_to_aws_10_saas_live_receipt.json) • [`Cloud Console Verification Receipt`](../docs/cloud_console_verification_receipt.json)

## References

- [Multi-Tenant Agentic AI System on Google Cloud (Architecture Center)](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) — Canonical reference architecture for pooled, sovereign-silo, and hybrid multi-tenant AI agents.
- [Workload Identity Federation with AWS and OIDC Identity Providers](https://cloud.google.com/iam/docs/workload-identity-federation) — Keyless cross-cloud OIDC token exchange eliminating static service-account and IAM keys.
- [Cloud Run Service-to-Service Authentication & Ingress Controls](https://cloud.google.com/run/docs/securing/authenticating) — Enforcing `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` and IAM-authenticated A2A/MCP gateways.
- [Model Armor Overview & Regional Endpoint Reference](https://cloud.google.com/security-command-center/docs/model-armor-overview) — Inline prompt-injection and sensitive-data screening across multi-cloud MCP tool responses.
- [Cloud KMS Customer-Managed Encryption Keys (CMEK)](https://cloud.google.com/kms/docs/cmek) — Cryptographic tenant isolation and emergency key-version disable kill-switches.

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
