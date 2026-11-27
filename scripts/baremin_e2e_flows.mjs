// Auto-maintained 12 Bare-Min 16:9 + 7 Extended WS1 E2E Flows
export const EXTRA_BAREMIN_AND_EXTENDED_FLOWS = [
  {
    "index": 15,
    "id": "ws1-5hop-governance-baseline",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WORKSTREAM 1 • FIGURE 1 (EXEC OVERVIEW)",
    "patternBadge": "SHARED 5-HOP CORE • 80/20 SPLIT",
    "title": "Shared 5-Hop Cryptographic Governance Control Plane & Pattern A/B/C Matrix",
    "subtitle": "How one 80% reusable ADK/Cloud Run core enforces edge, catalog, bulkhead, guardrail, and RLS contracts across all three isolation patterns",
    "questionAnswered": "How can one multi-tenant agentic platform serve high-density pooled SaaS tenants, sovereign CMEK silos, and hybrid PSC customers from a single codebase?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "Cloud Armor • Cloud KMS • ARD Catalog • Memorystore Valkey • gVisor • Model Armor • AlloyDB FORCE RLS • BigQuery OTel",
    "execTechSummary": "Separates the invariant 5-Hop ADK security core (80% shared code) from the swappable infrastructure perimeter (20% Terraform/IAM), routing requests into Pattern A, B, or C with fail-closed enforcement.",
    "outcomeTitle": "Single Codebase, Three Compliance Tiers",
    "outcomeBody": "Platform teams maintain one ADK pipeline while offering low-COGS pooled tenancy, air-gapped sovereign CMEK silos, and zero-downtime live upgrades.",
    "outcomeTech": "Verified across 5/5 core governance hops and 3/3 tenant topologies",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Edge Identity PEP (Hop 1)",
        "role": "Cloud Armor strips forged tenant headers and IAP/STS mints ECDSA P-256 + RFC 9449 DPoP context tokens.",
        "nodes": [
          "Cloud Armor strips forged tenant headers and IAP/STS mints ECDSA P-256 + RFC 9449 DPoP context tokens."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Catalog PDP & Observability (Hop 2 / OTel)",
        "role": "ARD Catalog prunes unauthorized tools via before_agent_callback while SCC and BigQuery log zero-PII spans.",
        "nodes": [
          "ARD Catalog prunes unauthorized tools via before_agent_callback while SCC and BigQuery log zero-PII spans."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Pooled Pattern A & Bulkhead (Hop 3)",
        "role": "Cloud Run Gen2 / Agent Engine enforces gVisor CoW, Valkey RPM/TPM buckets, and 32,768-token prefix caching.",
        "nodes": [
          "Cloud Run Gen2 / Agent Engine enforces gVisor CoW, Valkey RPM/TPM buckets, and 32,768-token prefix caching."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Pattern B Silo / Pattern C PSC & Hops 4–5",
        "role": "Inline Model Armor NLC/SDP, AlloyDB FORCE RLS, and <60s KMS CMEK HTTP 423 locks protect regulated tenants.",
        "nodes": [
          "Inline Model Armor NLC/SDP, AlloyDB FORCE RLS, and <60s KMS CMEK HTTP 423 locks protect regulated tenants."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Caller → Blue Zone",
        "title": "Untrusted Ingress & Header Strip",
        "logicalNarrative": "External callers arrive at External ALB where Cloud Armor strips any client-supplied X-Tenant-Id header before code runs.",
        "components": "Cloud Armor WAF • Edge PEP"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Cryptographic STS & DPoP Mint",
        "logicalNarrative": "Hop 1 validates OIDC/Entra claims and signs a TenantContext token with Cloud KMS ECDSA P-256 plus RFC 9449 DPoP proof.",
        "components": "Cloud KMS • IAM STS"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone",
        "title": "Tenant-Scoped Catalog Filtering",
        "logicalNarrative": "Hop 2 queries ARD Catalog inside ADK before_agent_callback to prune cross-tenant agents and unauthorized MCP servers.",
        "components": "ARD Catalog • before_agent_callback"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Routing Layer",
        "title": "20% Perimeter Selection (A / B / C)",
        "logicalNarrative": "Tenant tier metadata routes execution to Pattern A Shared Pool, Pattern B Sovereign Silo, or Pattern C Hybrid PSC.",
        "components": "Tier Router • IAM PAB"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Yellow / Red Zone",
        "title": "Compute Bulkhead & Prefix Reuse",
        "logicalNarrative": "Hop 3 isolates memory via CoW gVisor sandboxes, enforces Valkey rate quotas, and reuses the 32,768-token cached prefix.",
        "components": "Agent Engine • Valkey 8.0"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Red Zone",
        "title": "Bidirectional Model Armor & SDP",
        "logicalNarrative": "Hop 4 screens prompts before Gemini 2.5 Flash (~<8ms) and redacts regulated PII/PCI tokens from egress text.",
        "components": "Model Armor • Cloud SDP"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Data Tier",
        "title": "AlloyDB FORCE RLS & CMEK Lock",
        "logicalNarrative": "Hop 5 sets app.current_tenant_id per transaction for Pooled RLS or binds Silo storage to revocable KMS CMEK keys.",
        "components": "AlloyDB Omni • Cloud KMS CMEK"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Green Zone",
        "title": "Unified Telemetry & Cost Chargeback",
        "logicalNarrative": "BigQuery OTel captures per-tenant token metrics without storing PII prompts, powering accurate B2B FinOps chargeback.",
        "components": "BigQuery OTel • SCC"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Hop 1a: Edge Strip",
        "route": "External ALB & Cloud Armor",
        "protocolAndMechanism": "Removes spoofed X-Tenant-Id/X-User-Id headers; terminates TLS 1.3.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Zero header spoofing"
      },
      {
        "step": "Step ②",
        "hopName": "Hop 1b: OBO + DPoP",
        "route": "Cloud KMS & STS Exchange",
        "protocolAndMechanism": "Mints ECDSA P-256 signed TenantContext (~8-14ms mint, <0.15ms JWKS verify).",
        "codeAndResource": "TenantContext • RFC 8693/9449",
        "verifiedOutcome": "Non-replayable proof"
      },
      {
        "step": "Step ③",
        "hopName": "Hop 2: Registry PDP",
        "route": "ADK before_agent_callback",
        "protocolAndMechanism": "Prunes disallowed MCP/RAG descriptors via ARD Catalog (<1.2ms).",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "HTTP 403 on cross-tenant tool"
      },
      {
        "step": "Step ④",
        "hopName": "Pattern Switch",
        "route": "Cloud Run / VPC-SC Router",
        "protocolAndMechanism": "Routes by tier metadata to shared pool or dedicated PSC/VPC-SC spoke.",
        "codeAndResource": "runtime_pipeline.py",
        "verifiedOutcome": "80% shared runtime parity"
      },
      {
        "step": "Step ⑤",
        "hopName": "Hop 3: Bulkhead",
        "route": "Valkey 8.0 & gVisor Sandbox",
        "protocolAndMechanism": "Token-bucket RPM/TPM limits + 32,768 prefix cache on Gemini 2.5 Flash.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "89.1% net input token reduction"
      },
      {
        "step": "Step ⑥",
        "hopName": "Hop 4: Inference PEP",
        "route": "Vertex AI Model Armor",
        "protocolAndMechanism": "Blocks prompt injection (HTTP 400/422) and redacts IBAN/PAN on output.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "Zero unredacted egress"
      },
      {
        "step": "Step ⑦",
        "hopName": "Hop 5: Storage RLS",
        "route": "AlloyDB Omni + KMS CMEK",
        "protocolAndMechanism": "Executes SET LOCAL app.current_tenant_id; KMS disable triggers HTTP 423.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Zero cross-tenant SQL rows"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Zero-PII OTel",
        "route": "BigQuery & SCC",
        "protocolAndMechanism": "Logs SHA-256 prompt digest, cache hit ratio, and HTTP circuit-breaker codes.",
        "codeAndResource": "cymbal_agentic_finops_otel",
        "verifiedOutcome": "Audit-ready FinOps ledger"
      }
    ]
  },
  {
    "index": 16,
    "id": "s01-master-series-taxonomy-map",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "COMPENDIUM SLIDE 04 • SERIES MAP",
    "patternBadge": "PATTERN A/B/C COGS SPECTRUM",
    "title": "5-Part Multi-Tenant Architecture Series & Pattern A/B/C COGS Spectrum",
    "subtitle": "Mapping WS1 Reference Taxonomy, WS2 Pool, WS3 Silo, WS4 Hybrid PSC, and WS5 Cross-Cloud across density and compliance",
    "questionAnswered": "How do the 5 architectural workstreams map onto real B2B SaaS unit economics, tenant density targets, and regulatory isolation levels?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "Cloud Run Gen2 • AlloyDB FORCE RLS • Private Service Connect • Cloud KMS CMEK • VPC-SC • Vertex AI Gemini 2.5 Flash",
    "execTechSummary": "Aligns unit economics (1.0x Pooled Baseline vs ~15x Silo vs 1.8x Hybrid PSC) with the five architectural deep-dives so executives pick the lowest-COGS compliant tier.",
    "outcomeTitle": "Prescriptive Multi-Workstream Blueprint Selection",
    "outcomeBody": "Architects avoid over-building sovereign silos for commercial accounts while maintaining a seamless upgrade path when deals close regulated enterprises.",
    "outcomeTech": "950 pooled + 50 hybrid/silo canonical capacity split anchored across WS1-WS5",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. WS1 Baseline & WS5 Selector",
        "role": "Establishes shared 5-Hop control plane (WS1) and quantitative MCDA tier assignment across patterns (WS5).",
        "nodes": [
          "Establishes shared 5-Hop control plane (WS1) and quantitative MCDA tier assignment across patterns (WS5)."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Pattern A: Pooled Runtime (WS2)",
        "role": "Optimizes unit economics (1.0x baseline COGS) via Valkey bulkheads, 32,768 prefix cache, and AlloyDB FORCE RLS.",
        "nodes": [
          "Optimizes unit economics (1.0x baseline COGS) via Valkey bulkheads, 32,768 prefix cache, and AlloyDB FORCE RLS."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Pattern C: Hybrid PSC (WS4)",
        "role": "Keeps shared SaaS orchestration while isolating high-value enterprise data via Private Service Connect.",
        "nodes": [
          "Keeps shared SaaS orchestration while isolating high-value enterprise data via Private Service Connect."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Pattern B: Sovereign Silo (WS3)",
        "role": "Enforces per-tenant GCP projects, VPC Service Controls, and customer-controlled KMS/HSM CMEK.",
        "nodes": [
          "Enforces per-tenant GCP projects, VPC Service Controls, and customer-controlled KMS/HSM CMEK."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Evaluate Multi-Criteria Scorecard",
        "logicalNarrative": "Architects score compliance mandate, noisy-neighbor sensitivity, and FinOps density to select Pattern A, B, or C.",
        "components": "WS5 Decision Tree • MCDA"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Deploy Invariant 5-Hop Core",
        "logicalNarrative": "Every tenant inherits WS1 Hops 1–5 (ALB strip, OBO/DPoP, ARD Catalog, Model Armor, RLS) regardless of tier.",
        "components": "WS1 Shared Control Plane"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone",
        "title": "Onboard Commercial Tier to Pattern A",
        "logicalNarrative": "950 commercial accounts share gVisor Cloud Run pools, 32,768-token prompt caches (89.1% reduction), and FORCE RLS.",
        "components": "WS2 Pooled Pool • AlloyDB RLS"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Yellow Zone",
        "title": "Attach Regulated Tools via Pattern C",
        "logicalNarrative": "50 growing enterprise tenants mount customer-hosted RAG/MCP endpoints over unidirectional Private Service Connect.",
        "components": "WS4 Hybrid PSC • 1.8x COGS"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Red Zone",
        "title": "Isolate Air-Gapped Silos in Pattern B",
        "logicalNarrative": "Strict healthcare/banking tenants receive dedicated VPC-SC perimeters, KMS CMEK kill-switches, and private GKE/PT.",
        "components": "WS3 Sovereign Silo • ~15x COGS"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Control Plane",
        "title": "Upgrade Pattern A → C Without Downtime",
        "logicalNarrative": "Dynamic tier upgrades flip Valkey routing metadata and provision PSC without rewriting agent application code.",
        "components": "WS4 Zero-Downtime Migration"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Green Zone",
        "title": "Unify Multi-Cloud Identity (AWS/Azure)",
        "logicalNarrative": "WIF + OIDC CAB downscoping bridges cross-cloud SaaS APIs without exporting long-lived service-account keys.",
        "components": "MC2 Federation • WIF CAB"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Series Compass",
        "title": "Balanced Security & SaaS Margin",
        "logicalNarrative": "The 5-part series keeps engineering velocity high (80% shared core) while eliminating structural tenant bleed.",
        "components": "WS1–WS5 Canonical Atlas"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "MCDA Rubric",
        "route": "WS5 Tier Classifier",
        "protocolAndMechanism": "Computes Pattern A/B/C weights across 12 compliance and cost criteria.",
        "codeAndResource": "ws5-decision-tree-and-agentic-triad",
        "verifiedOutcome": "Deterministic tier placement"
      },
      {
        "step": "Step ②",
        "hopName": "Core Controls",
        "route": "WS1 5-Hop Pipeline",
        "protocolAndMechanism": "Provisions Edge PEP, KMS DPoP, ARD Catalog, Valkey, Model Armor, and RLS.",
        "codeAndResource": "core-cymbal-agent/",
        "verifiedOutcome": "5/5 security hops active"
      },
      {
        "step": "Step ③",
        "hopName": "Pooled Tier",
        "route": "WS2 Shared Pool (950 Tenants)",
        "protocolAndMechanism": "Runs 32,768 shared prefix cache; 36,468 -> 3,969 tokens/turn (89.1%).",
        "codeAndResource": "Gemini 2.5 Flash • Valkey 8.0",
        "verifiedOutcome": "1.0x baseline COGS"
      },
      {
        "step": "Step ④",
        "hopName": "Hybrid Bridge",
        "route": "WS4 PSC Service Attachment",
        "protocolAndMechanism": "Routes cross-project MCP traffic across Private Service Connect endpoints.",
        "codeAndResource": "Pattern C Router • PSC",
        "verifiedOutcome": "Zero public internet egress"
      },
      {
        "step": "Step ⑤",
        "hopName": "Sovereign Tier",
        "route": "WS3 Dedicated VPC-SC (50 Tenants)",
        "protocolAndMechanism": "Isolates Cloud KMS CMEK rings + dedicated storage per regulated tenant.",
        "codeAndResource": "VPC-SC • KMS CMEK",
        "verifiedOutcome": "HTTP 423 <60s key revoke"
      },
      {
        "step": "Step ⑥",
        "hopName": "Live Upgrade",
        "route": "Dual-Write Drain & Cutover",
        "protocolAndMechanism": "Migrates Pattern A rows to Pattern C spoke with sub-1s cutover lock.",
        "codeAndResource": "WS4 Migration Runbook",
        "verifiedOutcome": "Zero dropped sessions"
      },
      {
        "step": "Step ⑦",
        "hopName": "Cross-Cloud",
        "route": "WIF + STS CAB Token Broker",
        "protocolAndMechanism": "Exchanges OIDC/Entra assertions for downscoped GCS/BigQuery access.",
        "codeAndResource": "RFC 8693 STS • AWS Cognito",
        "verifiedOutcome": "Zero static JSON keys"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Series Parity",
        "route": "BigQuery OTel FinOps",
        "protocolAndMechanism": "Aggregates unit COGS per tier and validates 0 cross-tenant leak assertions.",
        "codeAndResource": "Cloud Logging • BQ OTel",
        "verifiedOutcome": "Full fleet visibility"
      }
    ]
  },
  {
    "index": 17,
    "id": "ws1-5hop-cryptographic-perimeter-pipeline",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "EXT BLUEPRINT #03 (SLIDE 57/83)",
    "patternBadge": "5-HOP FAIL-CLOSED PIPELINE",
    "title": "5-Hop Cryptographic Perimeter Pipeline & Deterministic Circuit Breakers",
    "subtitle": "Hop-by-hop enforcement contracts across Edge PEP, ARD Catalog PDP, gVisor/Valkey Bulkhead, Model Armor, and AlloyDB RLS/CMEK",
    "questionAnswered": "What exact cryptographic checks, callback hooks, and fail-closed HTTP status codes isolate each microservice hop from caller to database?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "External ALB • Cloud Armor • Cloud KMS • ARD Catalog • gVisor • Memorystore Valkey • Model Armor • AlloyDB FORCE RLS",
    "execTechSummary": "Details every hop's cryptographic input, runtime enforcement hook (before_agent_callback, SET LOCAL), and exact HTTP circuit-breaker contract (401, 403, 429, 400/422, 423).",
    "outcomeTitle": "End-to-End Fail-Closed Security Contract",
    "outcomeBody": "Every stage validates signed tenant identity independently so no compromised upstream component or prompt can escalate across tenant boundaries.",
    "outcomeTech": "5 deterministic HTTP fail-closed contracts verified across live red-team probes",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Hop 1: Edge Identity & Signing PEP",
        "role": "Strips X-Tenant-Id, validates OIDC + DPoP thumbprint, and signs ECDSA P-256 TenantContext.",
        "nodes": [
          "Strips X-Tenant-Id, validates OIDC + DPoP thumbprint, and signs ECDSA P-256 TenantContext."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Hop 2: ARD Catalog & before_agent_callback",
        "role": "Evaluates tenant entitlement before agent execution and prunes unauthorized MCP/RAG descriptors.",
        "nodes": [
          "Evaluates tenant entitlement before agent execution and prunes unauthorized MCP/RAG descriptors."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Hop 3 & 4: Valkey Bulkhead & Model Armor",
        "role": "Bounds noisy neighbors (Valkey RPM/TPM + gVisor CoW) and blocks prompt/NLC/PII policy breaches.",
        "nodes": [
          "Bounds noisy neighbors (Valkey RPM/TPM + gVisor CoW) and blocks prompt/NLC/PII policy breaches."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Hop 5: AlloyDB FORCE RLS & CMEK Kill-Switch",
        "role": "Enforces PostgreSQL FORCE ROW LEVEL SECURITY and revocable KMS CMEK locks (HTTP 423).",
        "nodes": [
          "Enforces PostgreSQL FORCE ROW LEVEL SECURITY and revocable KMS CMEK locks (HTTP 423)."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Caller → Hop 1",
        "title": "Edge Header Sanitization",
        "logicalNarrative": "Cloud Armor and ALB strip spoofed X-Tenant-Id headers before ingress reaches application containers.",
        "components": "Cloud Armor • External ALB"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Hop 1",
        "title": "OBO Exchange & DPoP Proof Binding",
        "logicalNarrative": "STS validates OIDC/Entra identity, binds jkt public key thumbprint, and mints short-lived TenantContext JWT.",
        "components": "IAM STS • Cloud KMS P-256"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Hop 2",
        "title": "ADK Registry Catalog Pruning",
        "logicalNarrative": "ADK before_agent_callback queries ARD Catalog PDP to strip unapproved tools from model visibility.",
        "components": "ARD Catalog • ADK Hooks"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Hop 3",
        "title": "CoW Sandbox & Valkey Quota Gate",
        "logicalNarrative": "gVisor runs turn execution in a clean process while Valkey enforces per-tenant RPM/TPM token buckets.",
        "components": "gVisor • Valkey 8.0"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Hop 3 FinOps",
        "title": "32,768-Token Shared Prefix Hit",
        "logicalNarrative": "Static instructions and pruned tool schemas hit Vertex AI Context Cache for 89.1% net input savings.",
        "components": "Gemini 2.5 Flash • Context Cache"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Hop 4",
        "title": "Pre-LLM Prompt & NLC Inspection",
        "logicalNarrative": "Model Armor blocks jailbreak patterns (HTTP 400) and tenant compliance policy violations (HTTP 422).",
        "components": "Model Armor • NLC Guard"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Hop 5",
        "title": "Transaction-Scoped RLS & CMEK Check",
        "logicalNarrative": "Middleware executes SET LOCAL app.current_tenant_id while storage checks active KMS DEK unwrap rights.",
        "components": "AlloyDB Omni • KMS CMEK"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Hops 4b & 5b",
        "title": "Redacted Egress & Immutable Audit",
        "logicalNarrative": "Model Armor SDP redacts outbound PII/PCI tokens and streams hashed FinOps audit events to BigQuery.",
        "components": "Cloud SDP • BigQuery OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Hop 1: Edge PEP",
        "route": "ALB + Cloud Armor",
        "protocolAndMechanism": "Strips untrusted headers; rejects invalid bearer/DPoP signatures with HTTP 401.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Spoofed identity -> 401"
      },
      {
        "step": "Step ②",
        "hopName": "Hop 1b: JWKS Verify",
        "route": "In-Memory ECDSA Cache",
        "protocolAndMechanism": "Verifies P-256 signature locally in <0.15ms without per-request KMS calls.",
        "codeAndResource": "jwks_cache.py",
        "verifiedOutcome": "Zero KMS RPC bottleneck"
      },
      {
        "step": "Step ③",
        "hopName": "Hop 2: ARD PDP",
        "route": "before_agent_callback",
        "protocolAndMechanism": "Prunes tools by tenant_id entitlement; denies unlisted tool calls with HTTP 403.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "Unauthorized tool -> 403"
      },
      {
        "step": "Step ④",
        "hopName": "Hop 3a: Bulkhead",
        "route": "Valkey Atomic Lua",
        "protocolAndMechanism": "Enforces 120/600 RPM token-bucket and CoW --max-requests=1 heap wipe.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "Quota flood -> HTTP 429"
      },
      {
        "step": "Step ⑤",
        "hopName": "Hop 3b: Prefix Cache",
        "route": "Vertex AI ContextCacheConfig",
        "protocolAndMechanism": "32,768 shared prefix + ARD pruning cuts 36,468 -> 3,969 billed tokens/turn.",
        "codeAndResource": "Gemini 2.5 Flash",
        "verifiedOutcome": "89.1% prod net reduction"
      },
      {
        "step": "Step ⑥",
        "hopName": "Hop 4: Model Armor",
        "route": "screen_ingress_prompt",
        "protocolAndMechanism": "Detects prompt injection / jailbreaks (400) and regulatory NLC failures (422).",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "Adversarial prompt -> 400/422"
      },
      {
        "step": "Step ⑦",
        "hopName": "Hop 5: AlloyDB RLS",
        "route": "FORCE ROW LEVEL SECURITY",
        "protocolAndMechanism": "Issues SET LOCAL app.current_tenant_id + DISCARD ALL on pool return.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "0 cross-tenant rows; 423 CMEK"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Response Egress",
        "route": "Model Armor SDP + BQ",
        "protocolAndMechanism": "Masks IBAN/SWIFT/PAN on output; writes SHA-256 prompt digest to BigQuery.",
        "codeAndResource": "sanitize_egress_response",
        "verifiedOutcome": "Zero raw PII leakage"
      }
    ]
  },
  {
    "index": 18,
    "id": "ws1-c4-l3-process-sequence-swimlane",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 • FIGURE 6 (5-ACTOR UML)",
    "patternBadge": "UML SEQUENCE • 5 HOPS & STAMPEDE LOCK",
    "title": "5-Actor UML Process Sequence: End-to-End Request, Circuit Breakers & Stampede Recovery",
    "subtitle": "Lifeline trace across Tenant Caller, Edge/KMS/ARD Control Plane, Cloud Run ADK Worker, Valkey/AlloyDB State, and Model Armor/Gemini",
    "questionAnswered": "In what exact chronological sequence do components exchange tokens, acquire stampede locks, enforce guardrails, and roll back on failure?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "External ALB • Cloud KMS • ARD Catalog • Cloud Run ADK • Valkey SET NX PX • Model Armor • Gemini 2.5 Flash • AlloyDB RLS",
    "execTechSummary": "Visualizes synchronous request lifelines, local <0.15ms JWKS verification, Valkey single-flight leader election, fail-closed circuit-breaker aborts, and post-inference SDP redaction.",
    "outcomeTitle": "Deterministic Chronological Isolation Across 5 Actors",
    "outcomeBody": "Eliminates race conditions, stale pooled DB connections, and cache-invalidation stampedes under concurrent multi-tenant bursts.",
    "outcomeTech": "Every request follows a non-bypassable 5-actor cryptographic handshake",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Tenant Caller & Untrusted Edge",
        "role": "Submits OIDC + DPoP-bound request carrying zero trusted tenant headers.",
        "nodes": [
          "Submits OIDC + DPoP-bound request carrying zero trusted tenant headers."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Control Plane (STS, KMS & ARD)",
        "role": "Exchanges token (~8-14ms mint), exposes JWKS, and provides tenant tool ACLs.",
        "nodes": [
          "Exchanges token (~8-14ms mint), exposes JWKS, and provides tenant tool ACLs."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Compute Runtime (ADK & Valkey)",
        "role": "Runs before_agent_callback, atomic Valkey quotas, and SET NX PX 5000 single-flight lock.",
        "nodes": [
          "Runs before_agent_callback, atomic Valkey quotas, and SET NX PX 5000 single-flight lock."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Model & Data Plane (Armor, Gemini, AlloyDB)",
        "role": "Executes Model Armor screening, cached Gemini 2.5 Flash inference, and transaction-scoped RLS.",
        "nodes": [
          "Executes Model Armor screening, cached Gemini 2.5 Flash inference, and transaction-scoped RLS."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Actor 1 → Actor 2",
        "title": "HTTPS Request Hits External ALB",
        "logicalNarrative": "Caller transmits OIDC JWT plus client DPoP header; Cloud Armor strips spoofed X-Tenant-Id.",
        "components": "Actor 1 (Caller) → ALB"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Actor 2 (Control)",
        "title": "KMS Signs TenantContext JWT",
        "logicalNarrative": "Edge PEP exchanges identity for an ECDSA P-256 signed TenantContext containing tenant_id and rls_tag.",
        "components": "Cloud KMS • STS Exchange"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Actor 2 → Actor 3",
        "title": "Local JWKS Verify & Catalog Prune",
        "logicalNarrative": "ADK worker verifies P-256 signature in memory (<0.15ms) and prunes MCP tools via ARD Catalog.",
        "components": "JWKS Cache • ARD Catalog"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Actor 3 → Actor 4",
        "title": "Valkey Quota & Stampede Lock",
        "logicalNarrative": "Worker checks jti replay bit, consumes token-bucket token quota, or acquires SET NX PX 5000 warm-up lock.",
        "components": "Memorystore Valkey 8.0"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Actor 3 → Actor 5",
        "title": "Pre-Inference Model Armor Screen",
        "logicalNarrative": "Prompt payload passes through inline Model Armor jailbreak and NLC policy enforcement.",
        "components": "Vertex AI Model Armor"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Actor 5 (Inference)",
        "title": "Prefix-Cached Gemini 2.5 Flash Turn",
        "logicalNarrative": "Gemini reads the 32,768-token cached prefix plus pruned tool subset and emits tool calls or text.",
        "components": "Gemini 2.5 Flash"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Actor 3 → Actor 4",
        "title": "SET LOCAL Transaction SQL Query",
        "logicalNarrative": "Worker opens transaction, sets SET LOCAL app.current_tenant_id, fetches tenant rows only, and commits.",
        "components": "AlloyDB FORCE RLS"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Actor 5 → Actor 1",
        "title": "SDP Redaction, Pool Reset & Audit",
        "logicalNarrative": "Response is redacted via Cloud SDP, pooled DB runs DISCARD ALL, and zero-PII OTel lands in BigQuery.",
        "components": "Cloud SDP • BigQuery OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Lifeline 1->2",
        "route": "Ingress Strip & OIDC Verify",
        "protocolAndMechanism": "Strips caller X-Tenant-Id; validates issuer/aud and DPoP proof.",
        "codeAndResource": "External ALB • Cloud Armor",
        "verifiedOutcome": "Untrusted claims dropped"
      },
      {
        "step": "Step ②",
        "hopName": "Lifeline 2 Mint",
        "route": "KMS ECDSA P-256 Sign",
        "protocolAndMechanism": "Signs TenantContext with 60s expiry and unique jti nonce.",
        "codeAndResource": "projects/.../cryptoKeys/...",
        "verifiedOutcome": "Tamper-proof JWT"
      },
      {
        "step": "Step ③",
        "hopName": "Lifeline 3 Auth",
        "route": "In-Memory JWKS + ARD Prune",
        "protocolAndMechanism": "Verifies P-256 (<0.15ms) and filters MCP descriptors via before_agent_callback.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "Zero unlisted tool access"
      },
      {
        "step": "Step ④",
        "hopName": "Lifeline 3->4",
        "route": "Valkey Atomic Quota + Stampede",
        "protocolAndMechanism": "Runs Lua token-bucket; SET lock:{t} NX PX 5000 serializes cache reload.",
        "codeAndResource": "Valkey Pub/Sub Coalescing",
        "verifiedOutcome": "No DB thundering herd"
      },
      {
        "step": "Step ⑤",
        "hopName": "Lifeline 3->5",
        "route": "Model Armor Ingress Gate",
        "protocolAndMechanism": "Screens prompt injection (<8ms SLA in prod; <8ms in CI mock).",
        "codeAndResource": "Vertex AI Model Armor",
        "verifiedOutcome": "400/422 fail closed"
      },
      {
        "step": "Step ⑥",
        "hopName": "Lifeline 5 Tool/LLM",
        "route": "Scoped Gemini 2.5 Flash + MCP",
        "protocolAndMechanism": "Executes turn against cached 32,768-token prefix and DPoP 2LO/3LO MCP.",
        "codeAndResource": "ContextCacheConfig",
        "verifiedOutcome": "89.1% net token savings"
      },
      {
        "step": "Step ⑦",
        "hopName": "Lifeline 4 Data",
        "route": "SET LOCAL + Engine RLS",
        "protocolAndMechanism": "Binds transaction GUC; pgvector / SQL returns strictly current tenant_id rows.",
        "codeAndResource": "SET LOCAL app.current_tenant_id",
        "verifiedOutcome": "0 rows cross-tenant leak"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Teardown & Log",
        "route": "DISCARD ALL + BQ Span",
        "protocolAndMechanism": "Resets connection state on check-in and records token chargeback span.",
        "codeAndResource": "DISCARD ALL • OTel",
        "verifiedOutcome": "No pool context bleed"
      }
    ]
  },
  {
    "index": 19,
    "id": "s03-ws1-5hop-sequence-swimlane",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 + MC2 PROTOCOL ANATOMY",
    "patternBadge": "5 WIRE PACKETS & CROSS-CLOUD WIF",
    "title": "5-Hop Cryptographic Request & Token Exchange (5-Actor UML Sequence)",
    "subtitle": "End-to-end chronological lifecycle across Tenant Caller, Hop 1 Cloud Armor/IAP, Hop 2 Gateway/ARD, Hop 3 ADK/Valkey, and Hops 4–5 Model Armor/AlloyDB RLS",
    "questionAnswered": "How do cryptographic tokens, catalog policies, cache locks, guardrails, and database RLS predicates hand off sequentially across Hops 1–5?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "External ALB • IAM STS (RFC 8693) • RFC 9449 DPoP • Workload Identity Federation • Valkey Lua • Model Armor • AlloyDB",
    "execTechSummary": "Decomposes the 5 exact wire packets transmitted per turn, demonstrating how TenantContext claims, jkt thumbprints, and WIF/CAB downscoped tokens move without raw credentials.",
    "outcomeTitle": "Zero-Trust End-to-End 5-Hop Sequence Without Static Keys",
    "outcomeBody": "Caller OIDC+DPoP proofs are stripped and upgraded at Hop 1, pruned at Hop 2, bulkhead-capped at Hop 3, screened at Hop 4, and kernel-enforced via AlloyDB FORCE RLS at Hop 5.",
    "outcomeTech": "HTTP 401/403/429/422/423 fail-closed at every hop + Zero-PII BigQuery OTel",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Packet 1–2: Edge OIDC → Signed STS + DPoP",
        "role": "Transforms untrusted Authorization + forged headers into verified TenantContext with cnf.jkt.",
        "nodes": [
          "Transforms untrusted Authorization + forged headers into verified TenantContext with cnf.jkt."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Packet 3: Cross-Cloud WIF & CAB Token",
        "role": "Exchanges GCP/Entra/AWS assertions via Workload Identity Federation with Credential Access Boundaries.",
        "nodes": [
          "Exchanges GCP/Entra/AWS assertions via Workload Identity Federation with Credential Access Boundaries."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Packet 4: Valkey Keyspace & Model Armor",
        "role": "Keys memory strictly by {tenant}:{user} namespace while inspecting serialized Model Armor JSON.",
        "nodes": [
          "Keys memory strictly by {tenant}:{user} namespace while inspecting serialized Model Armor JSON."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Packet 5: Transaction SQL & Egress Audit",
        "role": "Binds SET LOCAL GUC on DB wire protocol and emits SHA-256 hashed OTel packets.",
        "nodes": [
          "Binds SET LOCAL GUC on DB wire protocol and emits SHA-256 hashed OTel packets."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Packet 1 (Ingress)",
        "title": "Raw HTTP Request With Forged Header",
        "logicalNarrative": "Attacker sends X-Tenant-Id: tenant-a alongside Tenant B OIDC token to External ALB.",
        "components": "POST /v1/agent/run"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Packet 2 (Edge PEP)",
        "title": "Sanitized Header & STS JWT Mint",
        "logicalNarrative": "ALB strips X-Tenant-Id; STS returns ES256 JWT encoding sub, tenant_id='tenant-b', tier, and jkt.",
        "components": "RFC 8693 + RFC 9449"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Packet 3 (WIF/CAB)",
        "title": "Cross-Cloud Downscoped Token",
        "logicalNarrative": "When calling external AWS/Azure/GCS resources, WIF applies a Credential Access Boundary scoped to /tenants/tenant-b/.",
        "components": "STS WIF • IAM CAB"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Packet 3b (Catalog)",
        "title": "Pruned MCP Tool Declaration Array",
        "logicalNarrative": "Only tenant-b entitled MCP function schemas enter the Gemini API request payload (~192 tokens vs 3,200).",
        "components": "ARD Catalog Filter"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Packet 4 (State)",
        "title": "Namespaced Valkey Key Evaluation",
        "logicalNarrative": "Lua script operates strictly on ratelimit:{tenant}:{window} and cache:{tenant}:* prefixes.",
        "components": "Valkey Lua Keyspace"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Packet 4b (Armor)",
        "title": "Model Armor Verdict Envelope",
        "logicalNarrative": "Model Armor returns sanitizeUserPrompt disposition (ALLOW / BLOCK_INJECTION / BLOCK_NLC).",
        "components": "Model Armor v1 API"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Packet 5 (AlloyDB)",
        "title": "PostgreSQL Wire Parameterized SET LOCAL",
        "logicalNarrative": "Transaction begins, executes SET LOCAL app.current_tenant_id = 'tenant-b', then runs parameterized SELECT.",
        "components": "AlloyDB Wire Protocol"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Egress Wire",
        "title": "SDP-Masked JSON & OTel Span",
        "logicalNarrative": "Caller receives clean answer while BigQuery ingests hashed OTel trace without raw prompt text.",
        "components": "SDP Redact • BQ OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Wire Packet 1",
        "route": "HTTP/2 Ingress Payload",
        "protocolAndMechanism": "Carries OIDC Bearer + DPoP JWT; Cloud Armor scrubs client X-Tenant-Id headers.",
        "codeAndResource": "TLS 1.3 • Cloud Armor",
        "verifiedOutcome": "Forged header stripped"
      },
      {
        "step": "Step ②",
        "hopName": "Wire Packet 2",
        "route": "Signed TenantContext JWT",
        "protocolAndMechanism": "Contains claims {tenant_id, tier, dpop_jkt, memory_ns, rls_tag, jti}.",
        "codeAndResource": "ECDSA P-256 JWS",
        "verifiedOutcome": "Cryptographically bound"
      },
      {
        "step": "Step ③",
        "hopName": "Wire Packet 3",
        "route": "WIF + IAM CAB Assertion",
        "protocolAndMechanism": "Exchanges OIDC for short-lived federated token restricted to tenant prefix.",
        "codeAndResource": "STS WIF + CAB Policy",
        "verifiedOutcome": "Zero JSON key files"
      },
      {
        "step": "Step ④",
        "hopName": "Wire Packet 3b",
        "route": "ADK Tools Payload",
        "protocolAndMechanism": "ARD strips unauthorized tools before LLM call (-94% schema bloat: 3,200->192).",
        "codeAndResource": "Gemini API Request",
        "verifiedOutcome": "Lowest attack surface"
      },
      {
        "step": "Step ⑤",
        "hopName": "Wire Packet 4",
        "route": "Valkey Key Prefix Contract",
        "protocolAndMechanism": "Keys prefixed tenant-b:*; emergency revoke executes SCAN+UNLINK in <5s.",
        "codeAndResource": "Memorystore Valkey",
        "verifiedOutcome": "Zero keyspace collision"
      },
      {
        "step": "Step ⑥",
        "hopName": "Wire Packet 4b",
        "route": "Model Armor Sanitization",
        "protocolAndMechanism": "Inspects prompt and output payloads against tenant policy templates.",
        "codeAndResource": "Model Armor REST/gRPC",
        "verifiedOutcome": "Policy verdict enforced"
      },
      {
        "step": "Step ⑦",
        "hopName": "Wire Packet 5",
        "route": "PgBouncer -> AlloyDB Wire",
        "protocolAndMechanism": "Transaction pool executes SET LOCAL then parameterized query; DISCARD ALL on exit.",
        "codeAndResource": "PostgreSQL v3 Wire",
        "verifiedOutcome": "Row predicate forced"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Wire Packet OTel",
        "route": "Cloud Trace & BigQuery",
        "protocolAndMechanism": "Exports latency histograms, status codes, and sha256(prompt) span attributes.",
        "codeAndResource": "OpenTelemetry Exporter",
        "verifiedOutcome": "End-to-end auditability"
      }
    ]
  },
  {
    "index": 20,
    "id": "ws1-c4-l4-wire-protocol-transformation",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 • FIGURE 8 (HOP 1 WIRE SPEC)",
    "patternBadge": "L4 WIRE TRANSFORMATION",
    "title": "Hop 1 Spoofed Header Stripping & Signed STS JWT Context Transformation",
    "subtitle": "Side-by-side wire transformation from untrusted caller HTTP payload through Stage 01-03 Hop 1 Gate to verified TenantContext",
    "questionAnswered": "Exactly how does Hop 1 convert an untrusted caller payload carrying spoofed headers into a verified, memory-verifiable STS JWT?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "External ALB • Cloud Armor • Cloud KMS (ECDSA P-256) • RFC 8693 STS • RFC 9449 DPoP • In-Memory JWKS",
    "execTechSummary": "Shows exact JSON transformations across Stage 01 (ALB Header Strip), Stage 02 (RFC 8693 OBO + DPoP JKT), and Stage 03 (STS P-256 Sign + <0.15ms Cached JWKS verify).",
    "outcomeTitle": "Confused-Deputy & Spoofing Blocked Before Compute",
    "outcomeBody": "Forged headers and replay attacks never reach ADK Python code because TenantContext is rebuilt solely from validated IdP assertions.",
    "outcomeTech": "Stage 01–03 transforms untrusted input in ~8–14ms with <0.15ms downstream verification",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Stage 01: External ALB Header Strip",
        "role": "Deletes caller-supplied X-Tenant-Id and override claims at edge L7 load balancer.",
        "nodes": [
          "Deletes caller-supplied X-Tenant-Id and override claims at edge L7 load balancer."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Stage 02: RFC 8693 OBO + DPoP JKT",
        "role": "Hashes client public key thumbprint (dpop_jkt) and binds IdP verified tenant_id.",
        "nodes": [
          "Hashes client public key thumbprint (dpop_jkt) and binds IdP verified tenant_id."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Stage 03: KMS P-256 Sign & JWKS Cache",
        "role": "Signs output TenantContext with Cloud KMS and caches public JWKS in worker RAM.",
        "nodes": [
          "Signs output TenantContext with Cloud KMS and caches public JWKS in worker RAM."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Signed Downstream Binding Claims",
        "role": "Embeds immutable memory_ns and rls_tag claims consumed by Hops 2 through 5.",
        "nodes": [
          "Embeds immutable memory_ns and rls_tag claims consumed by Hops 2 through 5."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Untrusted Caller",
        "title": "Client Submits Bearer + Forged Claim",
        "logicalNarrative": "Tenant B caller attempts privilege escalation by sending X-Tenant-Id: tenant-a.",
        "components": "External Client HTTP"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Stage 01 (ALB)",
        "title": "Edge Load Balancer Strips Overrides",
        "logicalNarrative": "External ALB and Cloud Armor drop all untrusted tenant and override headers immediately.",
        "components": "Cloud Load Balancing"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Stage 02 (IdP)",
        "title": "Verify Upstream OIDC / Entra Assertion",
        "logicalNarrative": "IAP / OIDC validator checks issuer signature and extracts authoritative tenant_id='tenant-b'.",
        "components": "Google IdP / Entra ID"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Stage 02 (DPoP)",
        "title": "Compute RFC 9449 JWK Thumbprint",
        "logicalNarrative": "Computes SHA-256 thumbprint of caller proof-of-possession key to block stolen bearer replay.",
        "components": "RFC 9449 DPoP Verify"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Stage 03 (STS)",
        "title": "Assemble Authoritative Claims",
        "logicalNarrative": "Mints JSON claims mapping tenant-b to memory_ns='/tenants/retail' and rls_tag.",
        "components": "IAM STS Claims Mapper"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Stage 03 (KMS)",
        "title": "Sign TenantContext via ECDSA P-256",
        "logicalNarrative": "Cloud KMS asymmetricSign creates non-forgeable jwt_sig bound to 60s TTL and unique jti.",
        "components": "Cloud KMS asymmetricSign"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Hops 2–5",
        "title": "Verify Downstream in <0.15ms",
        "logicalNarrative": "Internal microservices validate TenantContext solely from in-memory cached JWKS (0 KMS RPCs).",
        "components": "/.well-known/jwks.json"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Signed Context",
        "title": "Immutable Identity Across 5 Hops",
        "logicalNarrative": "Downstream ADK, Valkey, Model Armor, and AlloyDB read only the verified signed claims.",
        "components": "TenantContext Pydantic Model"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Input JSON",
        "route": "Untrusted Header Inspection",
        "protocolAndMechanism": "Incoming client_headers=['X-Tenant-Id: tenant-a'] flagged as untrusted.",
        "codeAndResource": "Ingress Wire Parser",
        "verifiedOutcome": "Never trusted by backend"
      },
      {
        "step": "Step ②",
        "hopName": "Stage 01",
        "route": "Header Strip Policy",
        "protocolAndMechanism": "ALB header mutation rule removes X-Tenant-* and spoofed override headers.",
        "codeAndResource": "Cloud Armor / URL Map",
        "verifiedOutcome": "Clean ingress transport"
      },
      {
        "step": "Step ③",
        "hopName": "Stage 02a",
        "route": "OIDC / Entra Signature Check",
        "protocolAndMechanism": "Validates external IdP token against JWKS; rejects forged JWTs with HTTP 401.",
        "codeAndResource": "OIDC Verifier",
        "verifiedOutcome": "401 on invalid token"
      },
      {
        "step": "Step ④",
        "hopName": "Stage 02b",
        "route": "DPoP Proof Thumbprint (jkt)",
        "protocolAndMechanism": "Extracts htm/htu/iat and binds cnf.jkt = sha256(JWK) to prevent replay.",
        "codeAndResource": "RFC 9449 Handler",
        "verifiedOutcome": "Token non-transferable"
      },
      {
        "step": "Step ⑤",
        "hopName": "Stage 03a",
        "route": "Policy Claim Synthesis",
        "protocolAndMechanism": "Maps validated org_id -> {tenant_id, tier, memory_ns, rls_tag}.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Authoritative context"
      },
      {
        "step": "Step ⑥",
        "hopName": "Stage 03b",
        "route": "Cloud KMS ECDSA Sign",
        "protocolAndMechanism": "Calls KMS cryptoKeyVersions.asymmetricSign (~8-14ms ingress overhead).",
        "codeAndResource": "Cloud KMS HSM",
        "verifiedOutcome": "Cryptographic integrity"
      },
      {
        "step": "Step ⑦",
        "hopName": "Local Verify",
        "route": "In-Memory JWKS Cache (60m TTL)",
        "protocolAndMechanism": "Hops 2-5 check signature in RAM (<0.15ms) with zero KMS network calls.",
        "codeAndResource": "PyJWT + Background Refresh",
        "verifiedOutcome": "Zero KMS quota pressure"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Output Struct",
        "route": "Signed TenantContext Propagated",
        "protocolAndMechanism": "Only verified signed claims cross internal gRPC/HTTP boundaries.",
        "codeAndResource": "Verified Claims Packet",
        "verifiedOutcome": "Full lineage trace"
      }
    ]
  },
  {
    "index": 21,
    "id": "ws1-hop3-valkey-finops-bulkhead",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 • FIGURE 9 (HOP 3 FINOPS)",
    "patternBadge": "VALKEY BULKHEAD & 89.1% CACHE",
    "title": "Hop 3 gVisor Sandbox, Valkey Token-Bucket Bulkhead & 32,768 Prefix Cache",
    "subtitle": "Combining CoW ephemeral sandboxing, atomic Valkey quotas, ARD schema pruning, and Vertex AI >=32,768 prefix caching",
    "questionAnswered": "How does Hop 3 prevent noisy neighbors and memory bleed while cutting pooled production input token costs by 89.1%?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "Cloud Run Gen2 gVisor • Memorystore for Valkey 8.0 • ARD Catalog Pruning • Vertex AI Context Caching • Gemini 2.5 Flash",
    "execTechSummary": "Demonstrates CoW --max-requests=1 heap wiping, Redis/Valkey atomic RPM/TPM bulkheads, SET NX PX 5000 single-flight lock, and exact math from 36,468 to 3,969 billed tokens per turn (89.1%).",
    "outcomeTitle": "89.1% Net Input Token Reduction With Zero Memory Bleed",
    "outcomeBody": "Caching a 32,768-token static system prefix (well above Vertex AI's 4,096-token Context Cache API floor) unlocks 0.10x cached prefix pricing while ARD catalog pruning cuts dynamic MCP schema bloat by 94%.",
    "outcomeTech": "36,468 uncached tokens -> 3,969 equivalent tokens/turn (hop5 unit fixture: 18k/1.2k -> 84.7%)",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. CoW Ephemeral gVisor Execution",
        "role": "Serves each turn in a fresh gVisor sandbox with --max-requests=1 so heap memory never leaks.",
        "nodes": [
          "Serves each turn in a fresh gVisor sandbox with --max-requests=1 so heap memory never leaks."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Valkey 8.0 Atomic Quota & Lock",
        "role": "Enforces 120/600 RPM token-buckets plus single-flight SET NX PX 5000 leader locks.",
        "nodes": [
          "Enforces 120/600 RPM token-buckets plus single-flight SET NX PX 5000 leader locks."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Prefix Cache + ARD Schema Prune",
        "role": "Caches >=32,768 static system tokens at 0.10x while ARD prunes 3,200 MCP tokens to 192.",
        "nodes": [
          "Caches >=32,768 static system tokens at 0.10x while ARD prunes 3,200 MCP tokens to 192."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Fail-Closed 429 & <5s Unlink",
        "role": "Throttles bursts deterministically (HTTP 429) and evicts tenant cache prefixes without FLUSHALL.",
        "nodes": [
          "Throttles bursts deterministically (HTTP 429) and evicts tenant cache prefixes without FLUSHALL."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Routing → Hop 3",
        "title": "Receive Signed TenantContext & Tier",
        "logicalNarrative": "Hop 3 inspects tier to assign Standard (120 RPM / 40k TPM) or Enterprise (600 RPM / 200k TPM).",
        "components": "Cloud Run • Tier Metadata"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Green Zone",
        "title": "Atomic Valkey Token-Bucket Check",
        "logicalNarrative": "Lua script atomically debits tenant rate bucket and checks jti replay status in ~0.4ms.",
        "components": "Memorystore Valkey 8.0"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Red Zone",
        "title": "Fail Closed With HTTP 429 + Backoff",
        "logicalNarrative": "If a runaway reasoning loop exhausts quota, Hop 3 immediately returns HTTP 429 with Retry-After.",
        "components": "HTTP 429 Circuit Breaker"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "Acquire Single-Flight Cache Lock",
        "logicalNarrative": "Cold prefix warm-up uses SET lock:{tenant} NX PX 5000 so peers wait on Pub/Sub cleanly.",
        "components": "Stampede Protection Lock"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Yellow Zone",
        "title": "Prune Dynamic MCP Schemas (-94%)",
        "logicalNarrative": "ARD Catalog replaces 3,200 unpruned MCP tool schemas with just 192 relevant tokens.",
        "components": "ARD Catalog Filter"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Yellow Zone",
        "title": "Hit 32,768-Token Vertex Context Cache",
        "logicalNarrative": "Static 32,768-token architectural prefix (>= 4,096-token API floor) bills at 0.10x (32,768 -> 3,277 equiv).",
        "components": "Vertex AI ContextCacheConfig"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Blue Zone",
        "title": "Execute Reasoning Inside gVisor CoW",
        "logicalNarrative": "Gemini 2.5 Flash runs inside ephemeral gVisor memory; --max-requests=1 wipes heap after turn.",
        "components": "gVisor • Gemini 2.5 Flash"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "FinOps Result",
        "title": "36,468 → 3,969 Tokens (89.1% Net)",
        "logicalNarrative": "Net input cost drops 89.1% in production (CI harness also asserts 84.7% on compact 18k fixture).",
        "components": "BigQuery FinOps OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Hop 3 Ingress",
        "route": "Read Tenant Quotas & Cache Key",
        "protocolAndMechanism": "Extracts tenant_id & tier from STS JWT; constructs valkey keys tenant:*.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "Zero shared mutable state"
      },
      {
        "step": "Step ②",
        "hopName": "Valkey Lua",
        "route": "Atomic Token-Bucket Eval",
        "protocolAndMechanism": "Executes token/RPM refill and check in a single Redis transaction (~0.4ms).",
        "codeAndResource": "Memorystore for Valkey",
        "verifiedOutcome": "Race-free quota tracking"
      },
      {
        "step": "Step ③",
        "hopName": "Threshold Gate",
        "route": "HTTP 429 Retry-After Enforcement",
        "protocolAndMechanism": "Rejects over-quota turns prior to expensive LLM token consumption.",
        "codeAndResource": "Rate Limit Breaker",
        "verifiedOutcome": "Zero noisy-neighbor bleed"
      },
      {
        "step": "Step ④",
        "hopName": "Cache Hydration",
        "route": "SET lock:{t} leader NX PX 5000",
        "protocolAndMechanism": "Elects one worker to populate cache; followers subscribe via Pub/Sub.",
        "codeAndResource": "Single-Flight Pattern",
        "verifiedOutcome": "Eliminates DB stampede"
      },
      {
        "step": "Step ⑤",
        "hopName": "ARD Pruning",
        "route": "Filter Dynamic Tool Definitions",
        "protocolAndMechanism": "Cuts 3,200 full MCP schemas down to 192 tenant-entitled tool tokens.",
        "codeAndResource": "ARD Schema Pruner",
        "verifiedOutcome": "-94% schema token waste"
      },
      {
        "step": "Step ⑥",
        "hopName": "Context Cache",
        "route": "Vertex AI 32,768 Prefix Cache (>= 4,096 API Floor)",
        "protocolAndMechanism": "32,768 static prefix billed at 0.10x (3,277 eq) + 192 MCP + 500 user = 3,969.",
        "codeAndResource": "Gemini 2.5 Flash Cache",
        "verifiedOutcome": "89.1% net token reduction"
      },
      {
        "step": "Step ⑦",
        "hopName": "Memory Hygiene",
        "route": "gVisor + Emergency SCAN+UNLINK",
        "protocolAndMechanism": "Worker exits after turn (--max-requests=1); kill-switch runs <5s UNLINK.",
        "codeAndResource": "Cloud Run gVisor Sandbox",
        "verifiedOutcome": "Zero heap/cache retention"
      },
      {
        "step": "Cost & Audit",
        "hopName": "FinOps Metric",
        "route": "Reconcile Prod vs CI Harness",
        "protocolAndMechanism": "Reports 89.1% production net reduction and documents CI 18k->84.7% test.",
        "codeAndResource": "cymbal_agentic_finops_otel",
        "verifiedOutcome": "Transparent audit trail"
      }
    ]
  },
  {
    "index": 22,
    "id": "ws1-hop5-alloydb-rls-partitioning",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 • FIGURE 10 (HOP 5 DATA)",
    "patternBadge": "ALLOYDB FORCE RLS & PGBOUNCER",
    "title": "Hop 5 Data Partitioning: AlloyDB PostgreSQL FORCE RLS, PgBouncer DISCARD ALL & BigQuery OTel",
    "subtitle": "Engine-enforced multi-tenant row filtering inside AlloyDB PostgreSQL, ADK/Memory Bank scoping, and zero-PII BigQuery OTel logging",
    "questionAnswered": "How does Hop 5 guarantee mathematically zero cross-tenant database reads—even under LLM SQL injection or connection pooling?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "AlloyDB for PostgreSQL (FORCE RLS) • PgBouncer (DISCARD ALL) • ADK / Memory Bank • Vertex Vector Search • BigQuery OTel",
    "execTechSummary": "Traces STEP 1–4 from pool checkout and transaction-scoped SET LOCAL app.current_tenant_id through pgvector/SQL predicate injection and zero-PII BigQuery audit output.",
    "outcomeTitle": "Mathematical Engine-Level Multi-Tenant Data Isolation",
    "outcomeBody": "AlloyDB evaluates current_setting('app.current_tenant_id', true) at the database engine layer before disk pages or vector neighbors ever enter agent memory.",
    "outcomeTech": "4-step FORCE RLS lifecycle + PgBouncer DISCARD ALL prevents session bleed across 950 tenants",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Step 1–2: Clean Checkout & SET LOCAL",
        "role": "Checks out clean pool connection and binds app.current_tenant_id for current transaction only.",
        "nodes": [
          "Checks out clean pool connection and binds app.current_tenant_id for current transaction only."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Step 3: FORCE ROW LEVEL SECURITY",
        "role": "PostgreSQL engine injects tenant_id = current_setting(...) on every table and pgvector query.",
        "nodes": [
          "PostgreSQL engine injects tenant_id = current_setting(...) on every table and pgvector query."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. ADK Memory Bank & Pool Hygiene",
        "role": "Namespaces ADK / Memory Bank sessions per tenant and mandates DISCARD ALL in session mode.",
        "nodes": [
          "Namespaces ADK / Memory Bank sessions per tenant and mandates DISCARD ALL in session mode."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Step 4: Filtered Engine Output & BQ OTel",
        "role": "Drops non-matching rows pre-memory and logs immutable zero-PII telemetry to BigQuery.",
        "nodes": [
          "Drops non-matching rows pre-memory and logs immutable zero-PII telemetry to BigQuery."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone (Step 1)",
        "title": "Pristine Connection Checkout",
        "logicalNarrative": "Worker pulls a DB socket from AlloyDB / PgBouncer pool with zero residual session variables.",
        "components": "PgBouncer Pool"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone (Step 2)",
        "title": "Bind SET LOCAL Tenant Context",
        "logicalNarrative": "Middleware writes verified TenantContext.tenant_id into SET LOCAL app.current_tenant_id.",
        "components": "Middleware GUC Setter"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Yellow Zone",
        "title": "Guard Against Session-Mode Bleed",
        "logicalNarrative": "If PgBouncer uses session pooling instead of transaction pooling, checkin triggers DISCARD ALL.",
        "components": "PgBouncer Reset Hook"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone (Step 3)",
        "title": "Database Injects FORCE RLS Predicate",
        "logicalNarrative": "AlloyDB automatically rewrites every SELECT/UPDATE/Vector query with WHERE tenant_id = GUC.",
        "components": "PostgreSQL FORCE RLS"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Yellow Zone",
        "title": "Isolate ADK & Memory Bank Keys",
        "logicalNarrative": "Short-term ADK sessions and Vertex Memory Bank entries scope reads/writes to memory_ns claim.",
        "components": "ADK / Memory Bank"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Red Zone (Step 4)",
        "title": "Sub-15ms Engine Filtering Before RAM",
        "logicalNarrative": "Cross-tenant rows (e.g., Row 103 RetailStream vs FinVault) never enter Python worker memory.",
        "components": "AlloyDB Engine Filter"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Fail Closed on Unbound GUC",
        "logicalNarrative": "If app.current_tenant_id is empty/unset, current_setting(..., true) returns NULL -> 0 rows.",
        "components": "Fail-Closed Null Guard"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Green Zone",
        "title": "Commit Auto-Reset & Zero-PII OTel",
        "logicalNarrative": "COMMIT clears SET LOCAL automatically while BigQuery records hashed FinOps telemetry.",
        "components": "BigQuery OTel Ledger"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Checkout",
        "route": "PgBouncer Transaction Pooling",
        "protocolAndMechanism": "Uses transaction-mode pooling so SET LOCAL dies cleanly on COMMIT/ROLLBACK.",
        "codeAndResource": "PgBouncer Config",
        "verifiedOutcome": "No cross-request state"
      },
      {
        "step": "Step ②",
        "hopName": "GUC Binding",
        "route": "SET LOCAL app.current_tenant_id",
        "protocolAndMechanism": "Populated exclusively from KMS-verified TenantContext JWT (never user prompt).",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Zero prompt SQL injection"
      },
      {
        "step": "Step ③",
        "hopName": "Pool Safeguard",
        "route": "DISCARD ALL on Return",
        "protocolAndMechanism": "Explicit cleanup hook clears temp tables, GUCs, and prepared plans in session mode.",
        "codeAndResource": "connection_pool_hook.py",
        "verifiedOutcome": "Zero session context leak"
      },
      {
        "step": "Step ④",
        "hopName": "Engine Policy",
        "route": "CREATE POLICY ... FORCE RLS",
        "protocolAndMechanism": "Applies even to table owner roles unless BYPASSRLS is absent; blocks pgvector leaks.",
        "codeAndResource": "AlloyDB DDL Policy",
        "verifiedOutcome": "Mandatory predicate pushdown"
      },
      {
        "step": "Step ⑤",
        "hopName": "Agent Memory",
        "route": "Scoped ADK & Memory Bank",
        "protocolAndMechanism": "Constrains memory recall by validated JWT memory_ns (/tenants/<id>).",
        "codeAndResource": "ADK Session Service",
        "verifiedOutcome": "Zero memory cross-talk"
      },
      {
        "step": "Step ⑥",
        "hopName": "Storage Exec",
        "route": "Row & Vector Index Filtering",
        "protocolAndMechanism": "Returns only matching rows (<1.8ms overhead, sub-15ms total filtering).",
        "codeAndResource": "AlloyDB pgvector",
        "verifiedOutcome": "100% row-level isolation"
      },
      {
        "step": "Step ⑦",
        "hopName": "Unset Guard",
        "route": "current_setting(..., true)",
        "protocolAndMechanism": "Returns 0 rows safely when GUC missing instead of throwing fatal SQL exception.",
        "codeAndResource": "RLS Null Safety",
        "verifiedOutcome": "Fail-closed empty set"
      },
      {
        "step": "Cost & Audit",
        "hopName": "BQ OTel Sink",
        "route": "Zero-PII Telemetry Export",
        "protocolAndMechanism": "Writes SHA-256 prompt digest, tokens, latency, and RLS pass state to BigQuery.",
        "codeAndResource": "record_bigquery_otel_span",
        "verifiedOutcome": "Full FinOps & CISO audit"
      }
    ]
  },
  {
    "index": 23,
    "id": "ws1-l3-fail-closed-circuit-breakers",
    "workstream": "WS1",
    "workstreamLabel": "Workstream 1 • Multi-Tenant Reference Architecture & 5-Hop Baseline",
    "badge": "WS1 • FIGURE 11 (CIRCUIT BREAKERS)",
    "patternBadge": "401 • 403 • 429 • 422 • 423",
    "title": "L3 Fail-Closed Security Circuit Breakers (HTTP 401 / 403 / 429 / 422 / 423)",
    "subtitle": "Mapping all five deterministic security and compliance failure modes—from edge spoofing and rogue tools to CMEK key revocation",
    "questionAnswered": "How does every layer fail closed with a specific, testable HTTP code rather than failing open or leaking cross-tenant data during an attack or outage?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888) & cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (Cloud Run Gen2 / Agent Engine us-central1)",
    "codeModules": "workstream-1-reference-architecture/1.2-product-team-review-pack.md",
    "execCloudServices": "Cloud Armor (401) • ARD Catalog PDP (403) • Valkey Token-Bucket (429) • Model Armor (422) • Cloud KMS CMEK (423) • SCC",
    "execTechSummary": "Defines the exact trigger condition, enforcement hook, HTTP error code, SLA, and recovery path across all 5 defense-in-depth circuit breakers.",
    "outcomeTitle": "Zero Silent Fail-Open States Across All 5 Hops",
    "outcomeBody": "Every identity, entitlement, quota, prompt safety, and key custody violation fails deterministically with structured SCC audit logging.",
    "outcomeTech": "All 5 circuit breakers (401, 403, 429, 422, 423) verified end-to-end in CI & live sandbox",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#aecbfa",
        "borderHex": "#174ea6",
        "name": "1. Hop 1: HTTP 401 Unauthorized Identity",
        "role": "Cloud Armor & STS drop forged OIDC/DPoP tokens and spoofed X-Tenant-Id before compute.",
        "nodes": [
          "Cloud Armor & STS drop forged OIDC/DPoP tokens and spoofed X-Tenant-Id before compute."
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ceead6",
        "borderHex": "#137333",
        "name": "2. Hop 2: HTTP 403 Forbidden Tool Resolution",
        "role": "ARD Catalog PDP aborts unauthorized MCP/agent calls inside ADK before_agent_callback.",
        "nodes": [
          "ARD Catalog PDP aborts unauthorized MCP/agent calls inside ADK before_agent_callback."
        ]
      },
      {
        "zoneId": "Yellow Zone",
        "colorHex": "#feefc3",
        "borderHex": "#b06000",
        "name": "3. Hop 3 & 4: HTTP 429 Quota & 422 Safety",
        "role": "Valkey throttles noisy neighbors (429) and Model Armor blocks jailbreaks/NLC breaches (422).",
        "nodes": [
          "Valkey throttles noisy neighbors (429) and Model Armor blocks jailbreaks/NLC breaches (422)."
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#fad2cf",
        "borderHex": "#c5221f",
        "name": "4. Hop 5: HTTP 423 CMEK Revocation Lock",
        "role": "Disabling customer Cloud KMS key halts DB reads (<60s) and purges Valkey cache (<5s).",
        "nodes": [
          "Disabling customer Cloud KMS key halts DB reads (<60s) and purges Valkey cache (<5s)."
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone (Hop 1)",
        "title": "Detect Invalid Token or Spoofed Header",
        "logicalNarrative": "Caller supplies an expired/forged JWT, missing DPoP proof, or forged X-Tenant-Id override.",
        "components": "Cloud Armor • Hop 1 PEP"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone (401)",
        "title": "Drop Session With HTTP 401",
        "logicalNarrative": "Edge PEP rejects request before any ADK agent, model, or database resource is touched.",
        "components": "HTTP 401 Unauthorized"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone (Hop 2)",
        "title": "Intercept Unauthorized Tool Call",
        "logicalNarrative": "Confused-deputy prompt asks ADK to invoke another tenant's private MCP tool or A2A agent.",
        "components": "ARD Catalog PDP"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone (403)",
        "title": "Abort via before_agent_callback (403)",
        "logicalNarrative": "ADK callback checks TenantContext against ARD Catalog and fails closed with HTTP 403.",
        "components": "before_agent_callback -> 403"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Yellow Zone (Hop 3)",
        "title": "Trip Valkey Token-Bucket → HTTP 429",
        "logicalNarrative": "Burst loop exceeds 120/600 RPM quota; Valkey rejects turn immediately with Retry-After header.",
        "components": "Memorystore Valkey -> 429"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Yellow Zone (Hop 4)",
        "title": "Trip Model Armor NLC → HTTP 422",
        "logicalNarrative": "Inline Model Armor catches prompt injection (400) or unpermitted regulatory topic (422).",
        "components": "Vertex AI Model Armor -> 422"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone (Hop 5)",
        "title": "Customer Revokes Cloud KMS CMEK",
        "logicalNarrative": "Enterprise CISO disables cryptoKeyVersion, revoking AlloyDB DEK unwrap permissions.",
        "components": "Cloud KMS CMEK Lock"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Red Zone (423)",
        "title": "Evict Cache <5s & Lock Data → HTTP 423",
        "logicalNarrative": "Hop 3 runs Valkey SCAN+UNLINK (<5s) while AlloyDB returns HTTP 423 Locked within <60s SLA.",
        "components": "HTTP 423 + SCC Alert"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Circuit 1 (Hop 1)",
        "route": "Invalid OIDC / Bad DPoP / Spoof",
        "protocolAndMechanism": "Signature check or DPoP thumbprint mismatch detected at Ingress PEP.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "HTTP 401 (0 compute cost)"
      },
      {
        "step": "Step ②",
        "hopName": "Circuit 2 (Hop 2)",
        "route": "Disallowed MCP Tool Execution",
        "protocolAndMechanism": "ARD Catalog denies cross-tenant descriptor via ADK before_agent_callback.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "HTTP 403 Forbidden"
      },
      {
        "step": "Step ③",
        "hopName": "Circuit 3 (Hop 3)",
        "route": "Noisy-Neighbor Quota Exhaustion",
        "protocolAndMechanism": "Valkey Lua token-bucket rejects burst above tenant RPM/TPM ceiling.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "HTTP 429 + Retry-After"
      },
      {
        "step": "Step ④",
        "hopName": "Circuit 4a (Hop 4)",
        "route": "Prompt Injection / Jailbreak",
        "protocolAndMechanism": "Model Armor ingress screen blocks adversarial instruction override.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "HTTP 400 Bad Request"
      },
      {
        "step": "Step ⑤",
        "hopName": "Circuit 4b (Hop 4)",
        "route": "Regulatory NLC Breach",
        "protocolAndMechanism": "Tenant-specific Natural Language Constraint forbids unsafe financial/clinical advice.",
        "codeAndResource": "Model Armor NLC Template",
        "verifiedOutcome": "HTTP 422 Unprocessable"
      },
      {
        "step": "Step ⑥",
        "hopName": "Circuit 5 (Hop 5)",
        "route": "Customer KMS CMEK Disabled",
        "protocolAndMechanism": "AlloyDB storage fails KMS DEK unwrap probe upon tenant key revocation.",
        "codeAndResource": "Cloud KMS + AlloyDB",
        "verifiedOutcome": "HTTP 423 Locked (<60s SLA)"
      },
      {
        "step": "Step ⑦",
        "hopName": "Cache Kill (<5s)",
        "route": "Targeted Tenant SCAN + UNLINK",
        "protocolAndMechanism": "Purges cache:{tenant}:* in <5s without disturbing the other 949 tenants.",
        "codeAndResource": "Valkey SCAN + UNLINK",
        "verifiedOutcome": "0 stale cached answers"
      },
      {
        "step": "Cost & Audit",
        "hopName": "Forensic Trail",
        "route": "Security Command Center + BQ",
        "protocolAndMechanism": "Every circuit trip emits severity finding to SCC and hashed span to BigQuery.",
        "codeAndResource": "SCC • BigQuery Audit",
        "verifiedOutcome": "100% deterministic rejection"
      }
    ]
  },
  {
    "index": 24,
    "id": "ws2-pattern-a-pooled",
    "workstream": "WS2",
    "workstreamLabel": "Workstream 2 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 2 • SLIDE 03 (PATTERN A: POOL)",
    "patternBadge": "PATTERN A: POOL • 1.0x BASELINE COGS",
    "title": "Pooled Multi-Tenant Agent Platform Architecture (Pattern A: Pool)",
    "subtitle": "Shared compute, dual Agent Gateways, Valkey rate bulkheads, and AlloyDB FORCE RLS state isolation",
    "questionAnswered": "How does a single pooled Cloud Run / Agent Engine stack safely serve hundreds of tenants at 1.0x COGS?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888)",
    "runtimeTarget": "cymbal-multi-tenant-patterns (us-central1)",
    "codeModules": "workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md • core-cymbal-agent/runtime_pipeline.py",
    "execCloudServices": "Google Identity Platform • Pooled Ingress API Gateway • Client-to-Agent Gateway • ADK Pooled Runtime • Memorystore Valkey • AlloyDB FORCE RLS • BigQuery OTel",
    "execTechSummary": "Routes Tenant A/B/C through Google Identity Platform (OIDC + RFC 9449 DPoP), validates JWTs in the Client-to-Agent Gateway, runs ephemeral CoW/sandboxed ADK agents with 32,768-token prefix caching (89.1% net token savings), and enforces AlloyDB FORCE RLS.",
    "outcomeTitle": "Zero-Trust Pooled Multi-Tenancy at 1.0x COGS",
    "outcomeBody": "One shared runtime pool scales elastically across Tenant A, B, and C while enforcing per-transaction SQL row isolation and per-tenant token budgets.",
    "outcomeTech": "100% SQL isolation verified with 0 cross-tenant rows across FinVault and RetailStream",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EBF2FE",
        "borderHex": "#1967D2",
        "name": "CONTROL PLANE (Identity, Ingress & Dual Gateways)",
        "role": "Google Identity Platform, Pooled Ingress API Gateway, Client-to-Agent & Agent-to-Anywhere Gateways, Registry & Auth Manager.",
        "nodes": [
          "Google Identity Platform",
          "Pooled Ingress API Gateway",
          "Client-to-Agent Gateway",
          "Agent-to-Anywhere Gateway"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE PLANE (Pooled Front End, ADK & Targets)",
        "role": "Shared ADK Agent Orchestrator, gVisor CoW sandboxes, pooled MCP servers, pooled A2A agents, and Gemini 2.5 Flash.",
        "nodes": [
          "Pooled Front End (Cloud Run / GKE)",
          "ADK Agent Orchestrator (gVisor CoW)",
          "Pooled MCP / A2A Targets"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA PLANE (Valkey Sessions & AlloyDB FORCE RLS)",
        "role": "Key-namespaced Valkey sessions and shared AlloyDB tables partitioned by tenant_id via FORCE ROW LEVEL SECURITY.",
        "nodes": [
          "Valkey 8.0 Sessions ({tenant}:{user})",
          "AlloyDB Omni (FORCE RLS Tenant A/B/C)"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "FINOPS, SECURITY & OBSERVABILITY PLANE",
        "role": "Model Armor prompt/output screening, Valkey 120/600 RPM token-bucket bulkhead, 32k prefix cache, and zero-PII BigQuery OTel.",
        "nodes": [
          "Model Armor + Cloud DLP",
          "Valkey FinOps Bulkhead",
          "Cloud Logging + Cloud Trace + BigQuery OTel"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "OIDC + RFC 9449 DPoP Auth",
        "logicalNarrative": "Tenants A, B, and C authenticate via Google Identity Platform using short-lived OIDC tokens bound with RFC 9449 DPoP.",
        "components": "Google Identity Platform • Ingress"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Ingress Strip & Client Gateway PEP",
        "logicalNarrative": "Pooled Ingress strips spoofed client headers; Client-to-Agent Gateway validates KMS-signed TenantContext (<0.15ms JWKS).",
        "components": "Pooled Ingress • Client-to-Agent GW"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Blue Zone",
        "title": "ARD Registry MCP Schema Pruning",
        "logicalNarrative": "ADK before_agent_callback queries Agent Registry to prune cross-tenant MCP descriptors (~94% schema token overhead reduction).",
        "components": "Agent Registry • before_agent_callback"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "Valkey Bulkhead & CoW gVisor Exec",
        "logicalNarrative": "ADK orchestrator enforces 120/600 RPM Valkey token-bucket quotas and executes inside an ephemeral CoW --max-requests=1 sandbox.",
        "components": "Valkey 8.0 • ADK gVisor Runtime"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Red Zone",
        "title": "Model Armor Screening & 32k Cache",
        "logicalNarrative": "Inline Model Armor inspects prompts (<8ms) before Gemini 2.5 Flash executes against the shared 32,768-token cached system prefix.",
        "components": "Model Armor • Vertex Prefix Cache"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Green Zone",
        "title": "Agent-to-Anywhere Gateway OBO",
        "logicalNarrative": "Outbound calls to pooled MCP servers, pooled A2A agents, and SaaS APIs exchange user-scoped 3LO/OBO tokens at the second gateway.",
        "components": "Agent-to-Anywhere GW • SaaS APIs"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Amber Zone",
        "title": "AlloyDB FORCE RLS & <5s Session UNLINK",
        "logicalNarrative": "Every SQL query runs SET LOCAL app.current_tenant_id under FORCE ROW LEVEL SECURITY while Valkey keys UNLINK within <5s.",
        "components": "AlloyDB Omni • Valkey UNLINK"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Red Zone",
        "title": "Zero-PII OTel FinOps Ledger (1.0x COGS)",
        "logicalNarrative": "BigQuery OTel logs SHA-256 prompt hashes, cached token ratios (89.1% net savings), and deterministic 401/403/429 alerts.",
        "components": "BigQuery OTel • Cloud Trace"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Edge & Identity PEP",
        "route": "Tenants -> Identity Platform -> Ingress GW",
        "protocolAndMechanism": "Short-lived OIDC + RFC 9449 DPoP verification; strips forged headers.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "0 header spoofs"
      },
      {
        "step": "Step ②",
        "hopName": "Client-to-Agent GW",
        "route": "Ingress -> Client-to-Agent Gateway",
        "protocolAndMechanism": "Verifies KMS ES256 TenantContext JWT (<0.15ms JWKS) & context propagation.",
        "codeAndResource": "pattern_a_pooled_service.py",
        "verifiedOutcome": "Verified tenant_id claim"
      },
      {
        "step": "Step ③",
        "hopName": "Registry PDP",
        "route": "ADK Callback -> Agent Registry",
        "protocolAndMechanism": "Filters tenant-allowed MCP tools in before_agent_callback (~94% pruned).",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "HTTP 403 unauthorized tool"
      },
      {
        "step": "Step ④",
        "hopName": "Quota & CoW Fork",
        "route": "ADK Orchestrator <-> Valkey 8.0",
        "protocolAndMechanism": "Checks 120/600 RPM Valkey token bucket; spawns CoW --max-requests=1 gVisor worker.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "No noisy-neighbor starvation"
      },
      {
        "step": "Step ⑤",
        "hopName": "Model Armor In/Out",
        "route": "ADK -> Model Armor -> Gemini 2.5 Flash",
        "protocolAndMechanism": "Blocks jailbreaks pre-inference (<8ms); reuses 32k prefix cache (36,468 -> 3,969).",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "89.1% net token reduction"
      },
      {
        "step": "Step ⑥",
        "hopName": "Outbound A2A/MCP",
        "route": "ADK -> Agent-to-Anywhere GW -> Targets",
        "protocolAndMechanism": "Binds 3LO/OBO tokens and runs output DLP redaction across SaaS/MCP targets.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "Zero unredacted egress"
      },
      {
        "step": "Step ⑦",
        "hopName": "Pooled RLS Data",
        "route": "ADK -> AlloyDB + Valkey Session Store",
        "protocolAndMechanism": "Executes SET LOCAL app.current_tenant_id + FORCE RLS; Valkey UNLINK <5s.",
        "codeAndResource": "pooled_gateway_and_rls.sql",
        "verifiedOutcome": "0 peer rows across tenants"
      },
      {
        "step": "Audit",
        "hopName": "Zero-PII OTel",
        "route": "Runtime -> Cloud Trace / BigQuery",
        "protocolAndMechanism": "Exports SHA-256 prompt digest, latency, and per-tenant token attribution.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "1.0x COGS verified"
      }
    ]
  },
  {
    "index": 25,
    "id": "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane",
    "workstream": "WS2",
    "workstreamLabel": "Workstream 2 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 2 • SLIDE 04 (MODE A: STATELESS)",
    "patternBadge": "MODE A • COW PRE-FORK + HEAP WIPE",
    "title": "WS2 - PART 2 (Mode A) - Stateless Pool CoW Pre-Fork & 1-Shot gVisor",
    "subtitle": "5-Actor temporal sequence showing zygote pre-forked CoW containers, single-turn execution, and immediate SIGKILL teardown",
    "questionAnswered": "How does Mode A eliminate cold starts while guaranteeing zero cross-tenant RAM residue in pooled execution?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888)",
    "runtimeTarget": "Cloud Run Gen2 / Agent Engine (gVisor)",
    "codeModules": "workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py • core-cymbal-agent/runtime_pipeline.py",
    "execCloudServices": "Client/Gateway • Cloud Run Warm Zygote • gVisor CoW Fork • Memorystore Valkey • Gemini 2.5 Flash • BigQuery OTel",
    "execTechSummary": "Maintains pre-initialized CoW zygote workers, clones an isolated gVisor memory page per request, enforces single-request lifetime (--max-requests=1), wipes heap + unlinks tmpfs on exit, and persists zero secrets.",
    "outcomeTitle": "Zero-Residue Stateless Execution",
    "outcomeBody": "Memory pages modified by Tenant A are immediately destroyed by gVisor SIGKILL after the single turn, preventing dirty-page side channels without Python interpreter cold starts.",
    "outcomeTech": "Verified 0ms cross-turn RAM carryover via CoW --max-requests=1",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EFF6FF",
        "borderHex": "#2563EB",
        "name": "CONTROL (Ingress Gateway & Identity/Quota Gate)",
        "role": "Strips raw client headers, verifies KMS TenantContext JWT, and checks Valkey token bucket before dispatch.",
        "nodes": [
          "Client Gateway",
          "Identity/DPoP PEP",
          "Valkey Token Bucket"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#059669",
        "name": "COMPUTE (Warm Zygote Pool & 1-Shot gVisor)",
        "role": "Clones copy-on-write memory pages (<15ms) for 1 turn (--max-requests=1) then destroys child worker.",
        "nodes": [
          "Cloud Run Warm Zygote",
          "1-Shot gVisor Child Worker"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#D97706",
        "name": "DATA (Ephemeral tmpfs & Zero-Residue Externalization)",
        "role": "Restricts durable tenant writes solely to AlloyDB FORCE RLS; zeroes tmpfs and child RAM on exit.",
        "nodes": [
          "Scoped /tmpfs Scratch",
          "AlloyDB FORCE RLS"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "FAIL-CLOSED SANITIZATION & OTEL TEARDOWN",
        "role": "Runs Model Armor screening pre/post Gemini 2.5 Flash and emits zero-PII BigQuery OTel spans before SIGKILL.",
        "nodes": [
          "Model Armor PEP",
          "Heap Wipe + SIGKILL",
          "BigQuery OTel"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Ingress Strip & JWT Verification",
        "logicalNarrative": "Client Gateway strips spoofed headers and validates DPoP-bound TenantContext JWT claims (<0.15ms).",
        "components": "Client Gateway • Hop 1 PEP"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Valkey Token-Bucket Admission",
        "logicalNarrative": "Gateway decrements per-tenant Valkey 120/600 RPM quota and prunes disallowed MCP schemas before compute.",
        "components": "Valkey 8.0 • Hop 2 PDP"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone",
        "title": "Copy-on-Write Zygote Page Fork",
        "logicalNarrative": "Cloud Run warm zygote forks private copy-on-write memory pages inside gVisor with Python/ADK pre-loaded (<15ms).",
        "components": "Cloud Run Zygote • gVisor"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Red Zone",
        "title": "Model Armor Pre-Inference Scan",
        "logicalNarrative": "Mode A worker runs inline Model Armor prompt-injection screening prior to constructing the model payload.",
        "components": "Model Armor • Hop 4 PEP"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Single-Turn Gemini 2.5 Flash Call",
        "logicalNarrative": "Executes 1 turn (--max-requests=1) using the shared 32,768-token cached system prefix and scoped OBO tools.",
        "components": "Gemini 2.5 Flash • 32k Cache"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "RLS State Flush & DLP Output Scan",
        "logicalNarrative": "Persists durable turn state strictly to AlloyDB under SET LOCAL app.current_tenant_id and scrubs egress DLP tokens.",
        "components": "AlloyDB FORCE RLS • Cloud DLP"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Heap Scrub, tmpfs Unlink & SIGKILL",
        "logicalNarrative": "Worker returns response, zeroes ephemeral heap/tmpfs credential buffers, and terminates immediately after 1 request.",
        "components": "gVisor Teardown • SIGKILL"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Green Zone",
        "title": "Pristine Zygote Ready for Next Tenant",
        "logicalNarrative": "BigQuery OTel logs token/cost attribution while the read-only zygote forks fresh clean pages for Tenant B.",
        "components": "BigQuery OTel • Zero RAM Bleed"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Gateway Auth",
        "route": "Client -> Gateway -> Hop 1",
        "protocolAndMechanism": "Verifies ES256 TenantContext + RFC 9449 jkt thumbprint.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "0 forged tenant headers"
      },
      {
        "step": "Step ②",
        "hopName": "Quota & Tools",
        "route": "Gateway -> Valkey + ARD",
        "protocolAndMechanism": "Token-bucket quota gate + before_agent_callback tool whitelist.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "Bounded noisy-neighbor burst"
      },
      {
        "step": "Step ③",
        "hopName": "CoW Zygote Fork",
        "route": "Warm Zygote -> gVisor Child",
        "protocolAndMechanism": "Forks private writable memory pages (<15ms) with clean tenant context.",
        "codeAndResource": "pattern_a_pooled_service.py",
        "verifiedOutcome": "Sub-20ms cold avoidance"
      },
      {
        "step": "Step ④",
        "hopName": "Prompt Guard",
        "route": "gVisor Child -> Model Armor",
        "protocolAndMechanism": "Screens prompt injection & blocks banned substrings (<8ms, HTTP 400).",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "Injection halted pre-LLM"
      },
      {
        "step": "Step ⑤",
        "hopName": "Prefix Cached LLM",
        "route": "gVisor Child -> Gemini 2.5 Flash",
        "protocolAndMechanism": "Binds 32k cached context; cuts effective turn tokens 36,468 -> 3,969.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "89.1% net token saving"
      },
      {
        "step": "Step ⑥",
        "hopName": "RLS & Egress SDP",
        "route": "Child -> AlloyDB + DLP",
        "protocolAndMechanism": "Executes transactional SET LOCAL RLS and masks IBAN/SSN/API keys.",
        "codeAndResource": "pooled_gateway_and_rls.sql",
        "verifiedOutcome": "0 leaked PII or peer rows"
      },
      {
        "step": "Step ⑦",
        "hopName": "Heap Wipe & Kill",
        "route": "Worker Exit -> SIGKILL",
        "protocolAndMechanism": "Enforces --max-requests=1, scrubs tmpfs, destroys writable CoW pages.",
        "codeAndResource": "runtime_pipeline.py",
        "verifiedOutcome": "0 cross-turn RAM carryover"
      },
      {
        "step": "Audit",
        "hopName": "Zero-PII OTel",
        "route": "Child -> BigQuery OTel",
        "protocolAndMechanism": "Flushes SHA-256 turn hash and FinOps attribution prior to termination.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Audit-verified statelessness"
      }
    ]
  },
  {
    "index": 26,
    "id": "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane",
    "workstream": "WS2",
    "workstreamLabel": "Workstream 2 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 2 • SLIDE 05 (MODE B: STATEFUL)",
    "patternBadge": "MODE B • WARMPOOL + HTTP 403 LATCH",
    "title": "WS2 - PART 2 (Mode B) - Stateful Session Pod WarmPool & 403 Latch",
    "subtitle": "5-Actor temporal sequence showing deterministic session-to-pod ownership, WarmPool binding, and HTTP 403 tenant latch enforcement",
    "questionAnswered": "When agents need stateful in-pod interpreters or WarmPools, how do we prevent Session B from latching onto Tenant A's pod?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888)",
    "runtimeTarget": "GKE Autopilot WarmPool / Stateful ADK",
    "codeModules": "workstream-2-pattern-a-pooled/2.3-solution-implementation/pattern_a_pooled_service.py • core-cymbal-agent/governance/hop1_edge_identity_pep.py",
    "execCloudServices": "Client Gateway • Stateful Router • WarmPool Sandbox Pod • Memorystore Valkey • Fail-Closed 403 Latch",
    "execTechSummary": "Binds each WarmPool sandbox pod to {tenant_id}:{user_id}:{session_id} via cryptographic Pod Ownership Latch on first turn, failing closed with HTTP 403 TENANT_LATCH_VIOLATION on mismatched callers and unlinking within <5s at turn/TTL end.",
    "outcomeTitle": "Cryptographic WarmPod Ownership Latch",
    "outcomeBody": "Stateful code-execution or browser sandboxes preserve sub-second multi-turn continuity while making cross-tenant pod hijacking mathematically impossible.",
    "outcomeTech": "100% HTTP 403 rejection on mismatched tenant_id pod routing tests",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EFF6FF",
        "borderHex": "#2563EB",
        "name": "CONTROL (Stateful Router & Affinity Authority)",
        "role": "Validates TenantContext JWT and resolves {tenant}:{user}:{session} affinity in Valkey before sticky pod forwarding.",
        "nodes": [
          "Client Gateway",
          "Stateful Session Router",
          "Valkey Affinity Map"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#059669",
        "name": "COMPUTE (GKE WarmPool Agent Sandbox Pod)",
        "role": "Pre-warmed GKE Agent Sandbox CR atomically latches one tenant_id for multi-turn interpreter/browser execution.",
        "nodes": [
          "WarmPool Agent Sandbox Pod",
          "Stateful ADK Code Runtime"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#D97706",
        "name": "DATA (Scoped /tmpfs, Valkey Sessions & AlloyDB RLS)",
        "role": "Holds single-tenant session memory in Key-namespaced Valkey + AlloyDB FORCE RLS during active turns.",
        "nodes": [
          "Scoped Pod Scratch",
          "Valkey UNLINK Scrubber",
          "AlloyDB FORCE RLS"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "FAIL-CLOSED 403 LATCH GUARD & REIMAGE",
        "role": "Rejects mismatched caller JWT.tenant_id != pod.latched_tenant_id with HTTP 403 TENANT_LATCH_VIOLATION and reimages post-TTL.",
        "nodes": [
          "Pod Ownership Latch Guard",
          "SCC 403 Alert",
          "Pod Reimage / Scrub"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Validate OIDC/DPoP TenantContext",
        "logicalNarrative": "Client Gateway verifies TenantContext signature, strips client headers, and passes tenant_id + session_id to Stateful Router.",
        "components": "Client Gateway • Hop 1 PEP"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Lookup or Allocate Valkey Affinity",
        "logicalNarrative": "Router queries `{tenant}:{user}:{session}` in Valkey (<0.4ms) to find the owning WarmPool pod IP or claim an unbound pod.",
        "components": "Stateful Router • Valkey"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone",
        "title": "Atomic First-Turn Pod Ownership Latch",
        "logicalNarrative": "Unbound GKE WarmPool Sandbox latches `pod.latched_tenant_id = JWT.tenant_id` in immutable enclave memory on Turn 1.",
        "components": "GKE WarmPool • Latch Init"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Red Zone",
        "title": "Per-Hop 403 Hijack Verification",
        "logicalNarrative": "On every turn, Pod Latch asserts `JWT.tenant_id == pod.latched_tenant_id`; any mismatch fails closed with HTTP 403 + SCC alert.",
        "components": "403 Latch Guard • SCC"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Multi-Turn Stateful Execution",
        "logicalNarrative": "Latched pod runs Python interpreter/browser workspace with Gemini 2.5 Flash + Model Armor screening across Turn 2..N.",
        "components": "ADK Sandbox • Gemini 2.5 Flash"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "Scoped Data Persistence Under RLS",
        "logicalNarrative": "Turn artifacts commit to AlloyDB under SET LOCAL app.current_tenant_id without exposing peer tenant rows.",
        "components": "AlloyDB Omni • FORCE RLS"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Amber Zone",
        "title": "Non-Blocking UNLINK (<5s) on Close",
        "logicalNarrative": "At explicit close or idle TTL expiration, Valkey executes non-blocking UNLINK on session keys within <5s.",
        "components": "Valkey UNLINK • TTL Scrubber"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Red Zone",
        "title": "Zero-Residue Sandbox Reimage",
        "logicalNarrative": "Ephemeral sandbox disk/RAM is wiped and pod latch cleared before returning to WarmPool, eliminating cross-session hijacking.",
        "components": "Pod Wipe • BigQuery OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "JWT & DPoP PEP",
        "route": "Client -> Gateway -> Router",
        "protocolAndMechanism": "Validates KMS ES256 signature and extracts immutable tenant_id + session_id.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "0 client claim spoofing"
      },
      {
        "step": "Step ②",
        "hopName": "Affinity Lookup",
        "route": "Router -> Valkey 8.0",
        "protocolAndMechanism": "Reads/claims `{tenant}:{user}:{session}` -> `pod_ip` sticky mapping.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "<0.4ms sticky lookup"
      },
      {
        "step": "Step ③",
        "hopName": "Atomic Latch",
        "route": "Router -> WarmPool CR",
        "protocolAndMechanism": "Sets write-once `latched_tenant_id` in sandbox pod memory on Turn 1.",
        "codeAndResource": "pattern_a_pooled_service.py",
        "verifiedOutcome": "Single-tenant pod ownership"
      },
      {
        "step": "Step ④",
        "hopName": "403 Hijack Test",
        "route": "Peer Tenant -> Latched Pod",
        "protocolAndMechanism": "Compares incoming JWT tenant_id vs pod latch; mismatch aborts before code run.",
        "codeAndResource": "Pod Latch Guard",
        "verifiedOutcome": "HTTP 403 TENANT_LATCH_VIOLATION"
      },
      {
        "step": "Step ⑤",
        "hopName": "Stateful Turns",
        "route": "Latched Pod -> Gemini + Tools",
        "protocolAndMechanism": "Keeps warm interpreter/file context across turns with 32k prefix cache.",
        "codeAndResource": "runtime_pipeline.py",
        "verifiedOutcome": "Sub-second multi-turn state"
      },
      {
        "step": "Step ⑥",
        "hopName": "Model Armor & RLS",
        "route": "Pod -> Model Armor + AlloyDB",
        "protocolAndMechanism": "Redacts egress DLP PII and isolates Postgres writes via FORCE RLS.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "0 peer SQL/PII leaks"
      },
      {
        "step": "Step ⑦",
        "hopName": "Valkey UNLINK",
        "route": "TTL Timer -> Valkey + Pod",
        "protocolAndMechanism": "Non-blocking key UNLINK (<5s) + sandbox workspace scrub.",
        "codeAndResource": "TTL Scrubber",
        "verifiedOutcome": "<5s session eviction"
      },
      {
        "step": "Audit",
        "hopName": "Pod Reimage + OTel",
        "route": "Sandbox CR -> BigQuery + SCC",
        "protocolAndMechanism": "Logs session lifecycle + any 403 violation attempts to SCC/BigQuery.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Verified clean re-pool"
      }
    ]
  },
  {
    "index": 27,
    "id": "ws3-pattern-b-silo",
    "workstream": "WS3",
    "workstreamLabel": "Workstream 3 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 3 • SLIDE 06 (PATTERN B: SILO)",
    "patternBadge": "PATTERN B: SILO • ZERO SHARED INFRASTRUCTURE",
    "title": "Dedicated Silo Agent Platform Architecture (Pattern B: Silo)",
    "subtitle": "1:1 Reference Twin per regulated tenant with dedicated GCP project, VPC-SC, Air-Gapped GKE/PT, AlloyDB & Cloud HSM CMEK",
    "questionAnswered": "How do banking, defense, and healthcare tenants achieve physical blast-radius isolation and customer-held KMS kill-switches?",
    "gcpProject": "cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "Dedicated Single-Tenant Silo Projects (project-silo-tenant-a/b/c)",
    "codeModules": "workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md • workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/",
    "execCloudServices": "Dedicated Tenant IdP/WIF • Per-Silo Ingress Gateway • VPC-SC Perimeter • Confidential GKE / Dedicated ADK • Customer Cloud HSM CMEK • Dedicated AlloyDB & HNSW Vector Index",
    "execTechSummary": "Stamps out one isolated GCP project per regulated tenant (`project-silo-tenant-a`, `-b`, `-c`) via Terraform: dedicated IdP/WIF pool, VPC Service Controls perimeter, Confidential GKE (AMD SEV-SNP), dedicated AlloyDB/HNSW index, and FIPS 140-3 Level 3 Cloud HSM CMEK.",
    "outcomeTitle": "Zero Shared Data Plane & Sovereign Customer Key Control",
    "outcomeBody": "Tenant A, B, and C operate in completely separate GCP projects with zero shared compute, zero shared vector indexes, and independent customer-controlled Cloud HSM CMEK revocation.",
    "outcomeTech": "41.2s verified CMEK kill-switch lockout across live KMS + BigQuery vault tests",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EBF2FE",
        "borderHex": "#1967D2",
        "name": "CONTROL PLANE (Per-Tenant Project, VPC-SC & IAM PAB)",
        "role": "Dedicated WIF IdP pool, Principal Access Boundary (PAB), per-silo Gateways, Agent Registry, and Model Armor.",
        "nodes": [
          "Dedicated Tenant IdP/WIF",
          "IAM PAB + VPC-SC Perimeter",
          "Silo Client & Outbound Gateways"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE PLANE (Confidential GKE & Air-Gapped PT)",
        "role": "Dedicated single-tenant ADK runtime (Confidential GKE AMD SEV-SNP), dedicated MCP/A2A, and Provisioned Throughput / Gemma.",
        "nodes": [
          "Confidential GKE (AMD SEV-SNP)",
          "Dedicated ADK Agent",
          "Provisioned Throughput / Gemma"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA PLANE (Single-Tenant AlloyDB & HNSW Vector Index)",
        "role": "Physically isolated AlloyDB cluster, Valkey, and HNSW vector index encrypted solely with that tenant’s Cloud HSM CMEK.",
        "nodes": [
          "Single-Tenant AlloyDB + HNSW",
          "Per-Silo Valkey Session Store"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "SOVEREIGNTY, KMS CMEK KILL-SWITCH & SCC AUDIT",
        "role": "Customer-controlled FIPS 140-3 Level 3 Cloud HSM CMEK, Access Approval (CAA), and <60s HTTP 423 Locked circuit breaker.",
        "nodes": [
          "Cloud HSM CMEK + CAA",
          "60s KMS Ping Circuit Breaker",
          "Immutable Silo SCC + BQ Audit"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "1:1 Silo Provisioning & WIF Auth",
        "logicalNarrative": "Terraform stamps dedicated project-silo-tenant-a/b/c; users authenticate via dedicated WIF/OIDC pool and mTLS ingress.",
        "components": "Terraform Silo • WIF Pool"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "VPC-SC & IAM PAB Boundary Check",
        "logicalNarrative": "VPC Service Controls perimeter and IAM Principal Access Boundary mathematically forbid cross-project data egress.",
        "components": "VPC-SC • IAM PAB"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Red Zone",
        "title": "Cloud HSM CMEK & Access Approval",
        "logicalNarrative": "Before compute or data decrypts, runtime verifies tenant Cloud HSM key state (<60s ping) and Access Approval (CAA) policy.",
        "components": "Cloud HSM CMEK • CAA"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Blue Zone",
        "title": "Silo Client Gateway & Registry PDP",
        "logicalNarrative": "Per-silo Client-to-Agent Gateway verifies token claims and loads strictly single-tenant MCP/RAG connectors from ARD.",
        "components": "Silo Gateway • Agent Registry"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Confidential GKE & Air-Gapped PT",
        "logicalNarrative": "ADK executes inside Confidential GKE (AMD SEV-SNP encrypted RAM) calling dedicated Provisioned Throughput Gemini 2.5 or Gemma.",
        "components": "Confidential GKE • PT Endpoint"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "Dedicated HNSW Vector & AlloyDB I/O",
        "logicalNarrative": "Queries physically isolated AlloyDB and HNSW vector indexes wrapped in tenant CMEK (zero peer-tenant rows exist).",
        "components": "Silo AlloyDB • HNSW Index"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Inline Model Armor & Egress Audit",
        "logicalNarrative": "Outbound tools pass through Silo Agent-to-Anywhere Gateway with Model Armor/DLP inspection inside the VPC-SC bridge.",
        "components": "Model Armor • Outbound GW"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Green Zone",
        "title": "Physical Zero-Blast-Radius Isolation",
        "logicalNarrative": "Revoking Tenant A’s Cloud HSM key locks Silo A with HTTP 423 in 41.2s while Tenants B and C operate completely unaffected.",
        "components": "HTTP 423/403 • Zero Shared Infra"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "1:1 Project Twin",
        "route": "Terraform -> project-silo-tenant-{a,b,c}",
        "protocolAndMechanism": "Dedicated GCP project, VPC, subnet, and private ingress per tenant.",
        "codeAndResource": "3.6-terraform-silo-blueprint/main.tf",
        "verifiedOutcome": "0 shared infrastructure"
      },
      {
        "step": "Step ②",
        "hopName": "WIF & IAM PAB",
        "route": "Tenant IdP -> WIF Pool -> IAM PAB",
        "protocolAndMechanism": "Downscoped WIF identity pinned by Principal Access Boundary to one silo.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "0 ambient cross-project perms"
      },
      {
        "step": "Step ③",
        "hopName": "VPC-SC Perimeter",
        "route": "Silo Network -> VPC-SC Enclave",
        "protocolAndMechanism": "Blocks unauthorized BigQuery/GCS/Vertex API exfiltration outside perimeter.",
        "codeAndResource": "3.4-product-collaboration-vpc-sc-signoff.md",
        "verifiedOutcome": "VPC_SC_DENIED on exfil"
      },
      {
        "step": "Step ④",
        "hopName": "CMEK + CAA Check",
        "route": "Silo Gateway -> Cloud HSM + CAA",
        "protocolAndMechanism": "FIPS 140-3 Level 3 HSM DEK unwrap + 60s `kms.encrypt(ping)` liveness check.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "41.2s verified HTTP 423 lock"
      },
      {
        "step": "Step ⑤",
        "hopName": "Confidential Compute",
        "route": "ADK -> Confidential GKE (AMD SEV-SNP)",
        "protocolAndMechanism": "Hardware-encrypted node RAM; calls dedicated PT Gemini 2.5 or Gemma YAML.",
        "codeAndResource": "gke_gemma3_airgapped_manifest.yaml",
        "verifiedOutcome": "0 noisy neighbor contention"
      },
      {
        "step": "Step ⑥",
        "hopName": "Silo Data & RAG",
        "route": "ADK -> Silo AlloyDB + HNSW",
        "protocolAndMechanism": "Single-tenant pgvector HNSW index + DB encrypted exclusively by tenant KMS key.",
        "codeAndResource": "pattern_b_siloed_service.py",
        "verifiedOutcome": "Physical vector separation"
      },
      {
        "step": "Step ⑦",
        "hopName": "Model Armor & MCP",
        "route": "ADK -> Model Armor -> Silo MCP/A2A",
        "protocolAndMechanism": "Validates prompt/tool args (<8ms) and logs egress spans inside silo project.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "0 unapproved external calls"
      },
      {
        "step": "Audit",
        "hopName": "Silo OTel & SCC",
        "route": "Silo -> BQ Vault + SCC Compliance",
        "protocolAndMechanism": "Passes `run_silo_security_tests.py` + CMEK revocation without impacting Silo B/C.",
        "codeAndResource": "run_silo_security_tests.py",
        "verifiedOutcome": "~15x COGS sovereign tier"
      }
    ]
  },
  {
    "index": 28,
    "id": "ws3-c4-l3-cmek-killswitch-swimlane",
    "workstream": "WS3",
    "workstreamLabel": "Workstream 3 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 3 • SLIDE 07 (WS3 CMEK KILL-SWITCH)",
    "patternBadge": "CMEK REVOCATION • <60S HALT",
    "title": "WS3 - PART 3 - Sovereign Silo CMEK Revocation & Air-Gapped GKE",
    "subtitle": "5-Actor temporal sequence proving <60s cryptographic lockout when a tenant CISO disables Cloud KMS / EKM",
    "questionAnswered": "If a regulated tenant CISO revokes their Cloud KMS key, how quickly do cached tokens, ADK pods, and storage fail closed?",
    "gcpProject": "cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "Confidential GKE + Sovereign Agent Engine",
    "codeModules": "core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py • workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py",
    "execCloudServices": "Tenant A CISO Admin • Cloud KMS (Tenant Key) • VPC-SC & Silo Gateway • Sovereign Agent Engine • Silo AlloyDB & SCC",
    "execTechSummary": "CISO disables `cryptoKeyVersion`, KMS Audit emits revocation event to VPC-SC Gateway, ADK 60s `kms.encrypt(ping)` heartbeat fails closed, L1 memory cache purges, AlloyDB halts I/O, and SCC logs immutable `CMEK_DENIED` (`HTTP 423/403`) audit.",
    "outcomeTitle": "Provable <60s Customer-Held Cryptographic Kill-Switch",
    "outcomeBody": "Guarantees 0 cached tokens served post-revoke and immutable Security Command Center compliance logging.",
    "outcomeTech": "Measured live lockout on MedCore revoked vault (`medcore_silo_locked_423: True`, 41.2s propagation)",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EFF6FF",
        "borderHex": "#1D4ED8",
        "name": "CONTROL (Tenant CISO, Cloud KMS & VPC-SC Gateway)",
        "role": "Tenant CISO disables Cloud KMS / EKM cryptoKeyVersion and revokes cryptoKeyDecrypter IAM grant.",
        "nodes": [
          "Tenant A CISO Admin",
          "Cloud KMS (Tenant Key)",
          "VPC-SC & Silo Gateway"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE (Sovereign Agent Engine 60s Heartbeat)",
        "role": "60s kms.encrypt(ping) liveness probe detects revocation, purges L1 RAM cache, and locks ADK workers.",
        "nodes": [
          "Sovereign Agent Engine",
          "60s KMS Ping Probe",
          "L1 Memory Cache Purge"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA (Silo AlloyDB & HNSW I/O Halt)",
        "role": "DEK unwrap denial halts disk, backup, and HNSW vector I/O across Silo AlloyDB.",
        "nodes": [
          "Silo AlloyDB Cluster",
          "Encrypted DEK Storage"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "FAIL-CLOSED CIRCUIT BREAKER & IMMUTABLE SCC AUDIT",
        "role": "Enforces HTTP 423 Locked (Runtime) / HTTP 403 CMEK_DENIED (Gateway/SCC) with 0 cached tokens served.",
        "nodes": [
          "HTTP 423/403 Fail-Closed Response",
          "Immutable SCC Compliance Log"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "CISO Disables Cloud KMS / EKM Version",
        "logicalNarrative": "Tenant A CISO calls `Disable cryptoKeyVersion` (or External Key Manager revoke) on `tenant-a-silo-cmek`.",
        "components": "Tenant A CISO • Cloud KMS"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "IAM Grant Revoke & Audit Event",
        "logicalNarrative": "Control plane strips `roles/cloudkms.cryptoKeyDecrypter` and Cloud Audit emits an immediate KMS revocation event.",
        "components": "Cloud KMS IAM • Cloud Audit"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Blue Zone",
        "title": "VPC-SC Silo Gateway Blocks New Calls",
        "logicalNarrative": "VPC-SC & Silo Gateway intercepts KMS revocation signal and denies new inbound DEK-backed sessions (`403 CMEK_DENIED`).",
        "components": "VPC-SC • Silo Gateway"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "60s KMS Liveness Heartbeat Fails Closed",
        "logicalNarrative": "Inside Sovereign Agent Engine, the 60-second `kms.encrypt(ping)` heartbeat fails closed (`41.2s` measured worst case).",
        "components": "KMS Heartbeat Probe"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Hard Enclave Lock & L1 Cache Wipe",
        "logicalNarrative": "Sovereign Agent Engine enters hard cryptographic lock, flushing in-memory L1 token/session caches to 0 cached tokens.",
        "components": "Sovereign ADK • L1 Purge"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "Silo AlloyDB & Vector I/O Halt",
        "logicalNarrative": "AlloyDB loses Cloud HSM DEK unwrap capability, immediately blocking new SQL/vector reads and writes.",
        "components": "Silo AlloyDB • HNSW Halt"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Deterministic HTTP 423 / 403 Response",
        "logicalNarrative": "Subsequent user or agent probes fail closed deterministically with `HTTP 423 Locked` (runtime) / `HTTP 403 CMEK_DENIED` (SCC).",
        "components": "Fail-Closed Breaker"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Red Zone",
        "title": "Immutable SCC Compliance & Silo Isolation",
        "logicalNarrative": "Security Command Center records immutable CMEK lockout telemetry while Peer Tenant B/C silos remain untouched.",
        "components": "SCC Audit • 0 Cached Tokens"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Key Disable",
        "route": "CISO Admin -> Cloud KMS API",
        "protocolAndMechanism": "Disables `cryptoKeyVersion` on tenant-owned FIPS 140-3 key ring.",
        "codeAndResource": "gcp_live_bridge.py",
        "verifiedOutcome": "DEK unwrap denied"
      },
      {
        "step": "Step ②",
        "hopName": "IAM Strip",
        "route": "Cloud KMS -> IAM + Audit Log",
        "protocolAndMechanism": "Revokes `cryptoKeyDecrypter` grant and emits Cloud Audit revocation log.",
        "codeAndResource": "3.2-multi-project-silo-and-cmek-setup.md",
        "verifiedOutcome": "Audit event published"
      },
      {
        "step": "Step ③",
        "hopName": "Gateway Intercept",
        "route": "KMS Event -> VPC-SC Gateway",
        "protocolAndMechanism": "Marks tenant enclave revoked at Silo Gateway PEP prior to pod entry.",
        "codeAndResource": "pattern_b_siloed_service.py",
        "verifiedOutcome": "New ingress rejected"
      },
      {
        "step": "Step ④",
        "hopName": "60s Ping Probe",
        "route": "Gateway -> Sovereign Agent Engine",
        "protocolAndMechanism": "Periodic `kms.encrypt(ping)` liveness check fails inside <60s SLA.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "41.2s measured propagation"
      },
      {
        "step": "Step ⑤",
        "hopName": "L1 RAM Purge",
        "route": "Agent Engine -> L1 Token Cache",
        "protocolAndMechanism": "Invalidates cached DEKs and in-memory prompt/context caches immediately.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "0 cached tokens served"
      },
      {
        "step": "Step ⑥",
        "hopName": "Storage Halt",
        "route": "Agent Engine -> Silo AlloyDB",
        "protocolAndMechanism": "Prevents cached buffer reuse and halts AlloyDB + BigQuery CMEK table I/O.",
        "codeAndResource": "medcore_silo_vault (live GCP)",
        "verifiedOutcome": "Zero post-revoke DB read"
      },
      {
        "step": "Step ⑦",
        "hopName": "Breaker Code",
        "route": "Runtime -> Caller Client",
        "protocolAndMechanism": "Returns HTTP 423 Locked from ADK runtime / HTTP 403 CMEK_DENIED at gateway.",
        "codeAndResource": "test_five_hop_pipeline.py",
        "verifiedOutcome": "medcore_silo_locked_423: True"
      },
      {
        "step": "Audit",
        "hopName": "SCC Compliance",
        "route": "Silo -> SCC + BigQuery Ledger",
        "protocolAndMechanism": "Records non-repudiable CMEK_DENIED evidence via `run_silo_security_tests.py`.",
        "codeAndResource": "run_silo_security_tests.py",
        "verifiedOutcome": "<60s SLA proven"
      }
    ]
  },
  {
    "index": 29,
    "id": "ws4-pattern-c-hybrid",
    "workstream": "WS4",
    "workstreamLabel": "Workstream 4 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 4 • SLIDE 08 (PATTERN C: HYBRID PSC)",
    "patternBadge": "PATTERN C: HYBRID • 80% CODE REUSE + /28 PSC",
    "title": "Governed Hub-and-Spoke Architecture (Pattern C: Hybrid PSC)",
    "subtitle": "Shared Governance Hub dynamically routing Standard tenants to Pool A and Regulated tenants to dedicated /28 Private Service Connect spokes",
    "questionAnswered": "How do platforms graduate growing enterprise tenants from Pooled SaaS to Dedicated VPC-SC spokes with 0ms live cutover?",
    "gcpProject": "cymbal-control-plane (#248990048888) ↔ cymbal-ge-silo-2026 (#495457819919)",
    "runtimeTarget": "Hub Cloud Run + Dedicated Spoke /28 PSC",
    "codeModules": "workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md • workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/",
    "execCloudServices": "Shared Ingress & Hub Gateway • Firestore Tier Lookup (<1ms) • Pooled Spoke A • Private Service Connect /28 Spoke (Enterprise) • Hub OTel & IAM PAB",
    "execTechSummary": "Combines a shared central Governance Hub (Auth, Agent Registry, Model Armor, Hub Gateways, 80% shared code) with per-tenant routing (`Firestore Tier Lookup <1ms`) across Pooled Spoke A and Private Service Connect `/28` unidirectional consumer-to-producer spokes.",
    "outcomeTitle": "One Platform Codebase, Blended Unit Economics & Live Tier Graduation",
    "outcomeBody": "Standard tenants run at 1.0x Pooled COGS while Enterprise tenants attach private VPC-SC/CMEK spokes over unidirectional PSC with zero public internet exposure.",
    "outcomeTech": "20/20 security & zero-downtime migration assertions verified on live GCP projects",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EBF2FE",
        "borderHex": "#1967D2",
        "name": "CONTROL PLANE (Shared Governance Hub & Firestore Lookup)",
        "role": "Central Hub Ingress, Identity Platform, Auth Manager, Agent Registry, Model Armor & <1ms Firestore Tier Lookup (80% shared).",
        "nodes": [
          "Shared Ingress & Hub Gateway",
          "Firestore Tier Lookup (<1ms)",
          "Registry + Model Armor Hub"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE PLANE (Identical ADK Image -> Spoke A or Spoke B)",
        "role": "Same ADK runtime executes Standard tenants in Pooled Spoke A and Enterprise tenants toward dedicated PSC spokes.",
        "nodes": [
          "Pooled Spoke A ADK Runtime",
          "Enterprise Dedicated Spoke ADK"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA PLANE (AlloyDB RLS vs /28 PSC Sovereign Spoke)",
        "role": "Standard accounts hit shared AlloyDB FORCE RLS; Enterprise tenants isolate data behind /28 Private Service Connect + CMEK.",
        "nodes": [
          "Pooled AlloyDB FORCE RLS",
          "/28 PSC Service Attachment -> Tenant CMEK DB"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "PSC NETWORK BOUNDARY, IAM PAB & HUB FINOPS",
        "role": "Unidirectional /28 NAT PSC forbids spoke-to-hub lateral traversal while Hub OTel meters blended SaaS/Enterprise COGS.",
        "nodes": [
          "/28 Unidirectional PSC NAT",
          "IAM PAB Cross-Project Guard",
          "Hub BigQuery OTel"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Unified Hub Ingress & Edge Strip",
        "logicalNarrative": "Both Commercial and Enterprise callers enter the shared Hub External ALB where Cloud Armor strips spoofed tenant headers.",
        "components": "Hub ALB • Cloud Armor"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Hub Identity & Model Armor PEP",
        "logicalNarrative": "Hub Client-to-Agent Gateway mints ECDSA + DPoP TenantContext, prunes ARD Catalog tools, and runs Model Armor screening.",
        "components": "Hub Gateway • Model Armor"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Blue Zone",
        "title": "Firestore Dynamic Tier Lookup (<1ms)",
        "logicalNarrative": "Hybrid router reads `tenants/{id}` tier pointer (`POOLED_A` vs `PSC_SPOKE_B`) in <1ms without redeploying containers.",
        "components": "Firestore Tier Pointer"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "80% Shared ADK Branch Execution",
        "logicalNarrative": "Standard tier runs in Pooled Spoke A (1.0x COGS); Enterprise tier dispatches from the identical ADK image across PSC.",
        "components": "pattern_c_hybrid_router_and_migrator.py"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Red Zone",
        "title": "Unidirectional /28 PSC NAT Transit",
        "logicalNarrative": "Enterprise spoke traffic crosses Cloud ILB -> `/28` Private Service Connect subnet with 0 public IPs and non-overlapping CIDRs.",
        "components": "PSC /28 NAT Subnet"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "Tenant CMEK Data & Vector Access",
        "logicalNarrative": "Service Attachment accepts consumer Hub traffic into Tenant B’s VPC-SC spoke, querying Cloud HSM CMEK AlloyDB/RAG.",
        "components": "PSC Attachment • Tenant CMEK DB"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "IAM PAB Cross-Spoke Isolation",
        "logicalNarrative": "Principal Access Boundary prevents Spoke B credentials from traversing backward into Hub or peer Tenant A pooled stores.",
        "components": "IAM PAB • VPC-SC"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Blue Zone",
        "title": "Blended Economics & Unified OTel",
        "logicalNarrative": "Hub BigQuery OTel captures pooled + enterprise token/PSC telemetry under 80% shared governance at 1.8x blended COGS.",
        "components": "Hub BigQuery OTel • 1.8x COGS"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Hub Edge PEP",
        "route": "Caller -> Hub ALB -> Cloud Armor",
        "protocolAndMechanism": "Strips raw client headers and enforces TLS 1.3 + OIDC/DPoP validation.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Unified edge perimeter"
      },
      {
        "step": "Step ②",
        "hopName": "Hub Registry & Armor",
        "route": "Hub GW -> ARD + Model Armor",
        "protocolAndMechanism": "Applies shared Hop 2 catalog PDP and Hop 4 prompt/output guardrails.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "80% shared code parity"
      },
      {
        "step": "Step ③",
        "hopName": "Firestore Route",
        "route": "Router -> Firestore `tenant_routing`",
        "protocolAndMechanism": "Resolves `POOLED_A` vs `PSC_SPOKE` route descriptor in <1ms.",
        "codeAndResource": "pattern_c_hybrid_router_and_migrator.py",
        "verifiedOutcome": "<1ms dynamic dispatch"
      },
      {
        "step": "Step ④",
        "hopName": "Spoke A Pooled",
        "route": "Hub -> Spoke A + AlloyDB RLS",
        "protocolAndMechanism": "High-density shared pool with 32k prefix cache + FORCE RLS.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "89.1% token reduction"
      },
      {
        "step": "Step ⑤",
        "hopName": "PSC /28 Bridge",
        "route": "Hub ILB -> /28 PSC NAT -> Producer VPC",
        "protocolAndMechanism": "Consumer-to-producer PSC Service Attachment avoiding VPC CIDR conflicts.",
        "codeAndResource": "4.6-terraform-hybrid-psc-blueprint/main.tf",
        "verifiedOutcome": "Zero public internet egress"
      },
      {
        "step": "Step ⑥",
        "hopName": "Sovereign Spoke I/O",
        "route": "PSC Attachment -> Tenant CMEK Vault",
        "protocolAndMechanism": "Isolates Enterprise data & vectors inside tenant-owned KMS CMEK project.",
        "codeAndResource": "4.4-product-collaboration-psc-and-registry.md",
        "verifiedOutcome": "Cross-project VPC-SC intact"
      },
      {
        "step": "Step ⑦",
        "hopName": "PAB Non-Traversal",
        "route": "Spoke B -> Denied Backward Path",
        "protocolAndMechanism": "Unidirectional PSC + IAM PAB rejects any reverse Hub/peer database call.",
        "codeAndResource": "4.1-case-study-and-solution-architecture.md",
        "verifiedOutcome": "20/20 security assertions PASS"
      },
      {
        "step": "Audit",
        "hopName": "Blended FinOps",
        "route": "Spoke A + B -> Hub BigQuery OTel",
        "protocolAndMechanism": "Single OTel pipeline attributes pooled and PSC token costs per tenant.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "1.8x blended COGS"
      }
    ]
  },
  {
    "index": 30,
    "id": "ws4-c4-l3-live-tier-promotion-swimlane",
    "workstream": "WS4",
    "workstreamLabel": "Workstream 4 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 4 • SLIDE 09 (WS4 LIVE TIER PROMOTION)",
    "patternBadge": "0MS CUTOVER • <5M TERRAFORM",
    "title": "WS4 - PART 4 - Pattern C /28 PSC & 0ms Live Tier Promotion",
    "subtitle": "5-Actor temporal sequence executing live tenant graduation from Pooled Spoke to Dedicated /28 PSC Spoke with 0 dropped turns",
    "questionAnswered": "How does an enterprise customer upgrade from Pattern A (Pooled) to Pattern B/C (Dedicated Spoke) live without maintenance windows?",
    "gcpProject": "cymbal-control-plane ↔ cymbal-ge-silo-2026",
    "runtimeTarget": "Zero-Downtime PSC Cutover Controller",
    "codeModules": "workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py • workstream-4-pattern-c-hybrid/4.3-solution-implementation/pattern_c_hybrid_router_and_migrator.py",
    "execCloudServices": "Platform Admin CLI • Terraform Spoke Engine • Tenant Data Sync (CDC) • Firestore Atomic Pointer • Gateway Tier Router",
    "execTechSummary": "Terraform provisions dedicated spoke project + `/28` PSC attachment (<5m), CDC drains AlloyDB RLS rows into dedicated CMEK vault, Valkey state hydrates, and Firestore atomic pointer flip (`POOLED_A -> PSC_SPOKE`) cuts traffic in <1ms.",
    "outcomeTitle": "Zero-Downtime Tier Graduation (0 Dropped Turns)",
    "outcomeBody": "Existing in-flight user turns complete safely against the old epoch while every subsequent turn switches cleanly in <1ms over PSC.",
    "outcomeTech": "Verified 0ms traffic interruption during live tier upgrade test suite",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EFF6FF",
        "borderHex": "#1D4ED8",
        "name": "CONTROL (Terraform Spoke Engine & Firestore Atomic Flip)",
        "role": "Provisions dedicated PSC spoke offline (<5m) and executes <1ms atomic Firestore pointer swap.",
        "nodes": [
          "Platform Admin CLI",
          "Terraform Spoke Engine",
          "Firestore Atomic Pointer"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE (Gateway Tier Router & Epoch Drainer)",
        "role": "Drains in-flight Epoch v1 turns gracefully while immediately routing Epoch v2 turns over /28 PSC.",
        "nodes": [
          "Gateway Tier Router",
          "Epoch v1/v2 Switch"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA (Dual-Write CDC -> CMEK AlloyDB Vault)",
        "role": "Streams only WHERE tenant_id = T rows into dedicated CMEK AlloyDB with row-checksum verification.",
        "nodes": [
          "Pooled AlloyDB RLS",
          "Tenant CDC Dual-Write",
          "Dedicated CMEK Spoke DB"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "CHECKSUM PARITY, ROLLBACK & CRYPTO-ERASURE",
        "role": "Blocks cutover unless CDC lag=0 & SHA-256 checksum matches 100%; retains rollback window before pooled crypto-scrub.",
        "nodes": [
          "Checksum Gate (100% Parity)",
          "Instant Pointer Rollback",
          "Pooled Row Purge"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Offline Spoke & /28 PSC Provision (<5m)",
        "logicalNarrative": "Terraform provisions dedicated spoke project, VPC-SC, Cloud HSM CMEK, and `/28` PSC Service Attachment with zero pooled impact.",
        "components": "Terraform Dual-Provider"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Amber Zone",
        "title": "Tenant-Scoped CDC Backfill & Dual-Write",
        "logicalNarrative": "Migrator copies strictly `WHERE tenant_id = T` rows from Pooled AlloyDB into dedicated CMEK AlloyDB + activates dual-write sync.",
        "components": "Tenant CDC • Dual-Write"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Red Zone",
        "title": "Checksum Parity & Hydrate Valkey State",
        "logicalNarrative": "Verifier waits for CDC replication lag = 0, proves 100% row-hash parity, and pre-warms Valkey session state in the target tier.",
        "components": "Checksum Gate • Valkey"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Blue Zone",
        "title": "Atomic Firestore Pointer Flip (<1ms)",
        "logicalNarrative": "Control plane transactionally commits `tenants/{id}.route_mode = \"PSC_SPOKE\"` with monotonic `epoch = v2` in <1ms.",
        "components": "Firestore Atomic Pointer"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Graceful Epoch v1 Turn Draining",
        "logicalNarrative": "Gateway Tier Router allows any in-flight Epoch v1 ADK turns to finish cleanly against Pool A with 0 dropped connections.",
        "components": "Gateway Epoch Drainer"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Green Zone",
        "title": "Zero-Interrupt Epoch v2 Traffic on /28 PSC",
        "logicalNarrative": "Every subsequent turn switches immediately across `/28` PSC NAT into the tenant’s CMEK spoke with zero container restarts.",
        "components": "/28 PSC • Epoch v2"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Reversible Rollback Verification Window",
        "logicalNarrative": "Readiness monitor keeps reversible rollback pointer valid during soak test while dual-audit verifies 0 HTTP 5xx errors.",
        "components": "Rollback Guard • OTel"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Amber Zone",
        "title": "Pooled Row Crypto-Erasure & Completion",
        "logicalNarrative": "Once verified, `run_tier_migration_suite.py` purges legacy pooled rows, sealing Pattern C sovereignty with 0ms user downtime.",
        "components": "run_tier_migration_suite.py"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Terraform Provision",
        "route": "Admin CLI -> GCP Spoke Project",
        "protocolAndMechanism": "Deploys VPC-SC, Cloud HSM CMEK, AlloyDB & PSC Attachment (<5m offline).",
        "codeAndResource": "4.6-terraform-hybrid-psc-blueprint/main.tf",
        "verifiedOutcome": "Ready standby PSC spoke"
      },
      {
        "step": "Step ②",
        "hopName": "Scoped CDC Stream",
        "route": "Pooled DB -> Migrator -> Silo DB",
        "protocolAndMechanism": "Filters exclusively `WHERE tenant_id = T` under FORCE RLS; starts dual-write.",
        "codeAndResource": "pattern_c_hybrid_router_and_migrator.py",
        "verifiedOutcome": "0 peer rows touched"
      },
      {
        "step": "Step ③",
        "hopName": "Parity Assertion",
        "route": "Migrator -> Source vs Target DB",
        "protocolAndMechanism": "Requires `cdc_lag == 0` and cryptographic row-count/checksum match.",
        "codeAndResource": "run_tier_migration_suite.py",
        "verifiedOutcome": "100% row parity before flip"
      },
      {
        "step": "Step ④",
        "hopName": "Atomic Swap (<1ms)",
        "route": "Migrator -> Firestore `tenants/{id}`",
        "protocolAndMechanism": "Single-document transaction flips route_mode -> `PSC_SPOKE` & increments epoch.",
        "codeAndResource": "pattern_c_hybrid_router_and_migrator.py",
        "verifiedOutcome": "<1ms cutover commit"
      },
      {
        "step": "Step ⑤",
        "hopName": "Epoch v1 Drain",
        "route": "Router -> Active Pool A Turns",
        "protocolAndMechanism": "Preserves epoch tag on active requests until turn completion.",
        "codeAndResource": "runtime_pipeline.py",
        "verifiedOutcome": "0 dropped in-flight turns"
      },
      {
        "step": "Step ⑥",
        "hopName": "/28 PSC Traffic",
        "route": "Router -> /28 PSC -> Sovereign DB",
        "protocolAndMechanism": "New turns immediately hit Tenant CMEK endpoint via Private Service Connect.",
        "codeAndResource": "4.2-hub-and-spoke-demo-env-setup.md",
        "verifiedOutcome": "0ms maintenance downtime"
      },
      {
        "step": "Step ⑦",
        "hopName": "Soak & Rollback Guard",
        "route": "Monitor -> Hub BigQuery OTel",
        "protocolAndMechanism": "Confirms zero 403/500 regressions with 1-click Firestore pointer revert ready.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Reversible cutover safety"
      },
      {
        "step": "Audit",
        "hopName": "Pooled Cleanup",
        "route": "Migrator -> Pooled AlloyDB Delete",
        "protocolAndMechanism": "Removes legacy tenant rows from Pool A post-soak verification.",
        "codeAndResource": "run_tier_migration_suite.py",
        "verifiedOutcome": "Full sovereign graduation"
      }
    ]
  },
  {
    "index": 31,
    "id": "ws5-decision-tree-and-triad",
    "workstream": "WS5",
    "workstreamLabel": "Workstream 5 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 5 • SLIDE 10 (DECISION TREE)",
    "patternBadge": "80/20 PLATFORM MATRIX • 2-QUESTION TREE",
    "title": "WS5 - PART 5 - Architecture Pattern Selector: Pool (A) vs. Hybrid (C) vs. Silo (B)",
    "subtitle": "CISO/Architect 2-Question Decision Tree mapping compliance, blast-radius, and COGS requirements to Pattern A, C, or B",
    "questionAnswered": "Which isolation pattern should an enterprise choose — and when do we graduate from Pooled A to Hybrid C or Sovereign Silo B?",
    "gcpProject": "cymbal-control-plane & cymbal-ge-silo-2026",
    "runtimeTarget": "Platform Decision Governance Matrix",
    "codeModules": "workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md",
    "execCloudServices": "CISO Decision Matrix • Pattern A Pooled • Pattern C Hybrid PSC • Pattern B Sovereign Silo • 80% Reusable 5-Hop Core",
    "execTechSummary": "Two deterministic executive questions: Q1 Physical KMS CMEK / VPC-SC Enclave Required? (No -> Pattern A Pool @ 1.0x COGS); Q2 Shared Hub OTel & Codebase Acceptable Alongside Dedicated /28 Data Spokes? (Yes -> Pattern C Hybrid; No/Zero-Shared -> Pattern B Silo).",
    "outcomeTitle": "Deterministic Pattern Selection Without Re-Architecting",
    "outcomeBody": "Because 80% of the ADK + 5-Hop security codebase stays invariant across all three leaves, platforms adopt Pattern A today and graduate regulated deals cleanly to C or B.",
    "outcomeTech": "Backed by 100% pass across Pattern A, B, and C verification gates",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EBF2FE",
        "borderHex": "#1967D2",
        "name": "DECISION HUB (Q1 Physical Isolation & Q2 Hub Gate)",
        "role": "Evaluates customer-held KMS CMEK / VPC-SC requirements (Q1) and shared Hub tolerance (Q2).",
        "nodes": [
          "Q1 KMS/VPC-SC Mandate Gate",
          "Q2 Shared Hub Control Gate"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "LEAF A & LEAF C (Pooled 1.0x vs Hybrid PSC 1.8x)",
        "role": "Pattern A maximizes SaaS margin via shared pool; Pattern C retains 80% Hub while attaching /28 PSC data spokes.",
        "nodes": [
          "Pattern A: Pooled (1.0x COGS)",
          "Pattern C: Hybrid PSC (1.8x COGS)"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "LEAF B (Dedicated Sovereign Silo ~15x COGS)",
        "role": "Zero shared infrastructure (1:1 project, Confidential GKE, Cloud HSM CMEK) for strict banking/healthcare mandates.",
        "nodes": [
          "Pattern B: Sovereign Silo (~15x COGS)"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "80/20 SHARED GOVERNANCE CORE & ZERO-DOWNTIME BRIDGE",
        "role": "All 3 leaves execute the identical 5-Hop ADK security engine (core-cymbal-agent), enabling live A -> C promotion.",
        "nodes": [
          "80% Reusable 5-Hop Core",
          "Live A -> C Migration Path"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Red Zone",
        "title": "Anchor Invariant 5-Hop Core (80%)",
        "logicalNarrative": "Confirm that Edge PEP, ARD Catalog, Valkey Bulkhead, Model Armor, and OTel remain invariant across all 3 leaves.",
        "components": "WS1 5-Hop Core (80%)"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Evaluate Q1: Physical CMEK / VPC-SC?",
        "logicalNarrative": "Determine whether regulatory/customer contracts prohibit logical AlloyDB RLS and mandate customer-held KMS kill-switches.",
        "components": "Q1 Regulatory Gate"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Green Zone",
        "title": "If No -> Select Pattern A (Pool 1.0x)",
        "logicalNarrative": "Assign commercial tenants (950/1000 default fleet) to Pattern A Pool with CoW gVisor, 32k cache (89.1%), and FORCE RLS.",
        "components": "Pattern A Pooled • 1.0x COGS"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Blue Zone",
        "title": "If Yes -> Evaluate Q2: Shared Hub OK?",
        "logicalNarrative": "Assess whether CISO accepts a shared Governance Hub (Model Armor/OTel) paired with isolated `/28` PSC tenant data spokes.",
        "components": "Q2 Hub Tolerance Gate"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "If Yes -> Select Pattern C (Hybrid PSC)",
        "logicalNarrative": "Deploy Pattern C: keep 80% shared Hub efficiency (1.8x COGS) while mounting dedicated `/28` PSC + CMEK enterprise spokes.",
        "components": "Pattern C Hybrid • /28 PSC"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Amber Zone",
        "title": "If No -> Select Pattern B (Sovereign Silo)",
        "logicalNarrative": "Assign zero-shared defense/banking/healthcare deals to Pattern B: 1:1 GCP project, Confidential GKE, Cloud HSM & HNSW isolation.",
        "components": "Pattern B Silo • ~15x COGS"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Enable Zero-Downtime A -> C Promotion",
        "logicalNarrative": "Configure Firestore `tenant_routing` pointer so accounts starting in Pattern A graduate cleanly to PSC without re-architecting.",
        "components": "run_tier_migration_suite.py"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Blue Zone",
        "title": "Deterministic FinOps & Audit Compliance",
        "logicalNarrative": "Architects eliminate silo over-provisioning while meeting strict enterprise security checklists across every deal tier.",
        "components": "WS5 Decision Matrix"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "80% Core Check",
        "route": "All Patterns -> core-cymbal-agent",
        "protocolAndMechanism": "Verifies Hops 1-5 execute identical Python/ADK modules regardless of leaf.",
        "codeAndResource": "runtime_pipeline.py",
        "verifiedOutcome": "80% codebase reuse"
      },
      {
        "step": "Step ②",
        "hopName": "Q1 Blast-Radius",
        "route": "MCDA Rubric -> Isolation Gate",
        "protocolAndMechanism": "Checks AlloyDB RLS sufficiency vs FIPS 140-3 customer-held CMEK revocation.",
        "codeAndResource": "5.1-pattern-comparison-and-decision-guide.md",
        "verifiedOutcome": "Objective tier boundary"
      },
      {
        "step": "Step ③",
        "hopName": "Leaf A Profile",
        "route": "Pool A -> Cloud Run + AlloyDB RLS",
        "protocolAndMechanism": "Maximizes multi-tenant bin-packing with 32k prompt cache + Valkey bulkheads.",
        "codeAndResource": "pattern_a_pooled_service.py",
        "verifiedOutcome": "1.0x baseline unit COGS"
      },
      {
        "step": "Step ④",
        "hopName": "Q2 Hub Boundary",
        "route": "MCDA Rubric -> Shared Control Gate",
        "protocolAndMechanism": "Checks whether central ALB/Model Armor/OTel meets tenant InfoSec review.",
        "codeAndResource": "5.1-pattern-comparison-and-decision-guide.md",
        "verifiedOutcome": "Clear C vs B split"
      },
      {
        "step": "Step ⑤",
        "hopName": "Leaf C Profile",
        "route": "Hub -> /28 PSC -> Spoke DB",
        "protocolAndMechanism": "Connects shared Hub ADK to dedicated customer CMEK spokes via PSC.",
        "codeAndResource": "pattern_c_hybrid_router_and_migrator.py",
        "verifiedOutcome": "1.8x blended enterprise COGS"
      },
      {
        "step": "Step ⑥",
        "hopName": "Leaf B Profile",
        "route": "Silo -> 1:1 Project + VPC-SC + HSM",
        "protocolAndMechanism": "Stamps dedicated single-tenant VPC-SC, Confidential GKE, and 41.2s kill-switch.",
        "codeAndResource": "pattern_b_siloed_service.py",
        "verifiedOutcome": "~15x full physical silo"
      },
      {
        "step": "Step ⑦",
        "hopName": "Live A->C Bridge",
        "route": "Pool A -> Firestore Flip -> PSC",
        "protocolAndMechanism": "Tenant-scoped CDC + <1ms Firestore pointer swap without container rebuild.",
        "codeAndResource": "run_tier_migration_suite.py",
        "verifiedOutcome": "0ms upgrade downtime"
      },
      {
        "step": "Audit",
        "hopName": "Fleet Scorecard",
        "route": "WS1-WS5 -> BigQuery FinOps",
        "protocolAndMechanism": "Validates GA readiness backlog and 100% security test parity across A/B/C.",
        "codeAndResource": "5.2-capstone-backlog-and-ga-roadmap.md",
        "verifiedOutcome": "GA architectural sign-off"
      }
    ]
  },
  {
    "index": 32,
    "id": "saas10-multicloud-a2a-mcp-bridge",
    "workstream": "WS5",
    "workstreamLabel": "Workstream 5 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 5 • SLIDE 11 (10-SAAS MULTI-CLOUD)",
    "patternBadge": "30/30 LIVE CROSS-CLOUD • GCP ↔ AWS",
    "title": "Multi-Cloud Federation: Google Cloud Plane ↔ AWS & 10 SaaS",
    "subtitle": "5-Hop Governed Hub bridging 3 enterprise authentication patterns across 10 live SaaS targets and AWS AgentCore MCP Gateway",
    "questionAnswered": "How does the GCP 5-Hop Control Plane enforce OBO/DPoP/Model Armor across AWS AgentCore MCP Gateways and 10 disparate SaaS systems?",
    "gcpProject": "cymbal-ge-hub-2026 (#252968359259) ↔ AWS 393036065405 (us-east-1)",
    "runtimeTarget": "Cloud Run (ge-blogs) ↔ AWS AgentCore MCP + S3",
    "codeModules": "core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py • server.py (/api/saas-5-live-verify)",
    "execCloudServices": "Cloud Armor + IAP • ADK 5-Hop Gateway • Workload WIF / Entra OBO / DPoP • Model Armor Egress SDP • AWS AgentCore MCP Gateway • 10 SaaS Targets",
    "execTechSummary": "Executes live 30/30 cross-cloud verified tool calls (10 SaaS × 3 patterns: Pooled A, Hybrid C, Sovereign Silo B) bridging Cloud Run ADK agents across WIF/DPoP/OBO into AWS Bedrock AgentCore MCP Gateway (`cymbal-a2a-mcp-gateway-suyxm3caof`) & S3 (`cymbal-aws-federation-393036065405-us-east-1`).",
    "outcomeTitle": "Zero-Trust Multi-Cloud Agentic Federation (30/30 Live)",
    "outcomeBody": "Enforces identical Model Armor, 3LO user-delegation, and CMEK kill-switch rules whether a tool lives on GCP, AWS AgentCore, or 3P SaaS APIs.",
    "outcomeTech": "30/30 live cross-cloud flows verified across 10/10 SaaS systems & distinct S3 ETags",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EBF2FE",
        "borderHex": "#1967D2",
        "name": "GCP 5-HOP CONTROL & RUNTIME PLANE",
        "role": "Cloud Run / ge-blogs ADK gateway enforces WIF/DPoP, Registry pruning, Valkey quotas, and Model Armor screening.",
        "nodes": [
          "Cloud Armor + IAP",
          "ADK 5-Hop Gateway (Cloud Run)",
          "Model Armor Egress SDP"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "CROSS-CLOUD WIF / 3LO / OBO FEDERATION BRIDGE",
        "role": "Short-lived OIDC/Entra WIF, OBO, and 3LO token exchanges authenticate cleanly into AWS & 3P SaaS with 0 static keys.",
        "nodes": [
          "Workload WIF + SigV4 STS",
          "RFC 8693 OBO + 3LO Exchange",
          "RFC 9449 DPoP Sender Proof"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "AWS AGENTCORE MCP GATEWAY & REMOTE PEER",
        "role": "AWS Bedrock AgentCore MCP Gateway (`cymbal-a2a-mcp-gateway-suyxm3caof`) routes JSON-RPC to `cymbal-a2a-mcp-remote-peer`.",
        "nodes": [
          "AgentCore MCP Gateway",
          "cymbal-a2a-mcp-remote-peer",
          "S3 Federation Bucket"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "10 ENTERPRISE SAAS TARGETS & CMEK FAIL-CLOSED PARITY",
        "role": "Enforces Pattern A/C/B auth + MedCore HTTP 423 KMS lock across all 10 live SaaS integrations (30/30 flows).",
        "nodes": [
          "BI/ITSM: ThoughtSpot, Sigma, ServiceNow, Muse",
          "CRM/Data/SecOps: Salesforce+Jira, Databricks, Snowflake, Workday, Datadog, CrowdStrike",
          "MedCore 423 CMEK Guard"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Enterprise User OIDC / Entra Auth",
        "logicalNarrative": "Caller signs into Cloud Run ADK via Google OIDC or Microsoft Entra ID WIF bound with RFC 9449 DPoP proof.",
        "components": "Hop 1 Edge PEP • WIF"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "ARD Registry & SaaS Scope Pruning",
        "logicalNarrative": "Hop 2 prunes disallowed 3P SaaS MCP tools per tenant before the ADK planner sees them.",
        "components": "Hop 2 Registry PDP"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Blue Zone",
        "title": "Pre-Dispatch Model Armor & 423 Guard",
        "logicalNarrative": "Hop 4 blocks injection inputs while Hop 3 verifies Silo CMEK liveness (MedCore revoked vault -> immediate HTTP 423).",
        "components": "Model Armor • CMEK Guard"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "OBO / 3LO / SigV4 WIF Federation",
        "logicalNarrative": "Cross-cloud broker mints short-lived AWS SigV4 / 3LO tokens across zero static secrets to bridge GCP -> AWS.",
        "components": "STS / WIF • SigV4 Bridge"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Amber Zone",
        "title": "AWS AgentCore MCP Gateway Dispatch",
        "logicalNarrative": "Invokes `cymbal-a2a-mcp-gateway-suyxm3caof` -> `cymbal-a2a-mcp-remote-peer` over authenticated MCP JSON-RPC.",
        "components": "AWS AgentCore Gateway"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Red Zone",
        "title": "Execute 4 BI/ITSM & 3 Data/CRM SaaS",
        "logicalNarrative": "Runs verified live queries across ThoughtSpot, Sigma, ServiceNow, Muse, Salesforce+Jira, Databricks, and Snowflake.",
        "components": "SaaS Targets 1–7"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Execute 3 HR/SecOps SaaS + Output SDP",
        "logicalNarrative": "Queries Workday, Datadog, and CrowdStrike/Okta while Cloud DLP/Model Armor masks any sensitive egress fields.",
        "components": "SaaS Targets 8–10 • SDP"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Amber Zone",
        "title": "30/30 Live Proof + S3 & BQ Audit",
        "logicalNarrative": "Writes distinct S3 ETag federation receipts + zero-PII BigQuery OTel proving 10 SaaS x 3 Patterns pass live.",
        "components": "30/30 PASS • S3 + BQ OTel"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Cross-Cloud Ingress",
        "route": "User -> Cloud Run -> Hop 1",
        "protocolAndMechanism": "Validates OIDC/Entra WIF + DPoP thumbprint with zero exported JSON keys.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Verified cross-cloud caller"
      },
      {
        "step": "Step ②",
        "hopName": "SaaS Tool PDP",
        "route": "ADK -> ARD Registry",
        "protocolAndMechanism": "Restricts each tenant to contracted SaaS connectors out of the 10-SaaS fleet.",
        "codeAndResource": "hop2_registry_pdp_callbacks.py",
        "verifiedOutcome": "0 unauthorized SaaS access"
      },
      {
        "step": "Step ③",
        "hopName": "MedCore 423 Lockout",
        "route": "ADK -> KMS CMEK Ping",
        "protocolAndMechanism": "Aborts SaaS tool execution with HTTP 423 when Silo CMEK is disabled.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "10/10 SaaS respect CMEK halt"
      },
      {
        "step": "Step ④",
        "hopName": "WIF / 3LO Exchange",
        "route": "GCP Broker -> AWS STS / 3LO IdP",
        "protocolAndMechanism": "Obtains short-lived OAuth 3LO / SigV4 credentials for AgentCore Gateway.",
        "codeAndResource": "google_workspace_jira_3lo_mcp.py",
        "verifiedOutcome": "0 static AWS/SaaS secrets"
      },
      {
        "step": "Step ⑤",
        "hopName": "AgentCore MCP",
        "route": "GCP -> Gateway `suyxm3caof`",
        "protocolAndMechanism": "Calls AWS Bedrock AgentCore MCP Gateway -> `cymbal-a2a-mcp-remote-peer`.",
        "codeAndResource": "microsoft_servicenow_3lo_mcp.py",
        "verifiedOutcome": "READY live AWS peer"
      },
      {
        "step": "Step ⑥",
        "hopName": "BI & Data SaaS (1–7)",
        "route": "AgentCore -> SaaS APIs",
        "protocolAndMechanism": "Verifies ThoughtSpot, Sigma, ServiceNow, Muse, Salesforce+Jira, Databricks, Snowflake.",
        "codeAndResource": "enterprise_5_saas_bi_mcp.py",
        "verifiedOutcome": "21/21 pattern flows PASS"
      },
      {
        "step": "Step ⑦",
        "hopName": "HR & SecOps (8–10)",
        "route": "AgentCore -> Workday/Datadog/CrowdStrike",
        "protocolAndMechanism": "Applies output SDP redaction across HR, observability, and XDR payloads.",
        "codeAndResource": "server.py (/api/saas-5-live-verify)",
        "verifiedOutcome": "9/9 pattern flows PASS"
      },
      {
        "step": "Audit",
        "hopName": "S3 ETag + BQ OTel",
        "route": "Remote Peer -> S3 Bucket + BQ",
        "protocolAndMechanism": "Persists federation proof to `cymbal-aws-federation-393036065405-us-east-1`.",
        "codeAndResource": "cymbal_telemetry_2lo_mcp.py",
        "verifiedOutcome": "30/30 live cross-cloud PASS"
      }
    ]
  },
  {
    "index": 33,
    "id": "ws5-c4-l3-dynamic-skill-delegation-swimlane",
    "workstream": "WS5",
    "workstreamLabel": "Workstream 5 • Approved 16:9 Unified Blueprint",
    "badge": "WORKSTREAM 5 • SLIDE 12 (WS5 DYNAMIC SKILLS)",
    "patternBadge": "GCS SKILL BUNDLES • ZERO REDEPLOY",
    "title": "WS5 - PART 5 - Shared+Private Agents, Dynamic GCS Skills & FinOps OTel",
    "subtitle": "5-Actor temporal sequence demonstrating zero-redeploy runtime customization via Firestore config, GCS SKILL.md bundles, and Gemini 2.5 Flash",
    "questionAnswered": "How do 1,000+ tenants customize prompts, private agents, and GCS Skills on one shared ADK codebase without per-tenant container builds?",
    "gcpProject": "cymbal-pooled-saas-prod (#248990048888)",
    "runtimeTarget": "Shared ADK Orchestrator + Private Agent Alpha",
    "codeModules": "core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py • core-cymbal-agent/agents/finvault_agent_alpha.py",
    "execCloudServices": "Tenant Caller • Firestore Runtime Config • Signed GCS Skill Bucket • Shared/Private ADK Agent • Vertex Gemini 2.5 Flash + OTel",
    "execTechSummary": "Hydrates tenant prompt templates, thinkingConfig, and tenant-scoped `gs://cymbal-skills-{tenant}/SKILL.md` manifests at turn start via HMAC/IAM Condition checks, delegating seamlessly across Shared and Private Agent Alpha with zero image rebuilds.",
    "outcomeTitle": "Zero-Redeploy Enterprise Customization & Deterministic FinOps",
    "outcomeBody": "SaaS vendors ship one immutable container image globally while every customer configures isolated Skills, private models (`dedicated` PT vs PayGo), and OTel cost tags in seconds.",
    "outcomeTech": "Verified dynamic GCS SKILL.md loading and Private Agent Alpha hot-swap isolation",
    "zonesSummary": [
      {
        "zoneId": "Blue Zone",
        "colorHex": "#EFF6FF",
        "borderHex": "#1D4ED8",
        "name": "CONTROL (Firestore Config & Private Agent ACL)",
        "role": "Loads tenant prompt, thinking level, and private agent ACL (<1ms); rejects cross-tenant delegation.",
        "nodes": [
          "Tenant Caller",
          "Firestore Runtime Config",
          "Private Agent ACL"
        ]
      },
      {
        "zoneId": "Green Zone",
        "colorHex": "#ECFDF5",
        "borderHex": "#047857",
        "name": "COMPUTE (Shared ADK & Private Agent Alpha)",
        "role": "Executes modular Skills and delegates cleanly to Private Agent Alpha without rebuilding Cloud Run images.",
        "nodes": [
          "Shared ADK Agent",
          "Private Agent Alpha (PT/PayGo)"
        ]
      },
      {
        "zoneId": "Amber Zone",
        "colorHex": "#FFFBEB",
        "borderHex": "#B45309",
        "name": "DATA (Tenant-Scoped GCS Skill Bucket)",
        "role": "Reads `gs://cymbal-skills-{tenant}/SKILL.md` guarded by IAM Condition `resource.name.startsWith`.",
        "nodes": [
          "Signed GCS Skill Bucket",
          "Dynamic SKILL.md Bundles"
        ]
      },
      {
        "zoneId": "Red Zone",
        "colorHex": "#FEF2F2",
        "borderHex": "#B91C1C",
        "name": "GEMINI 2.5 FLASH PREFIX CACHE & FINOPS OTEL",
        "role": "Binds hydrated skill into 32k prefix cache (89.1% reduction) and logs `(tenant_id, skill_id, cached_tokens)` to BQ.",
        "nodes": [
          "Gemini 2.5 Flash 32k Cache",
          "BigQuery FinOps OTel"
        ]
      }
    ],
    "logicalSteps": [
      {
        "step": "Step ①",
        "badgeNum": "01",
        "zone": "Blue Zone",
        "title": "Authenticate Caller & Enter ADK",
        "logicalNarrative": "Tenant caller presents verified TenantContext JWT (`finvault` or `retailstream`) to the single shared ADK orchestrator.",
        "components": "Tenant Caller • Shared ADK"
      },
      {
        "step": "Step ②",
        "badgeNum": "02",
        "zone": "Blue Zone",
        "title": "Hydrate Firestore Runtime Config",
        "logicalNarrative": "Orchestrator loads tenant prompt template, `thinkingConfig`, allowed model (`gemini-3.8-flash`), and private agent IDs (<1ms).",
        "components": "Firestore Config (<1ms)"
      },
      {
        "step": "Step ③",
        "badgeNum": "03",
        "zone": "Amber Zone",
        "title": "Verify GCS IAM Condition & HMAC",
        "logicalNarrative": "Runtime reads `gs://cymbal-skills-{tenant}/SKILL.md` only after IAM resource-prefix Condition and HMAC signature pass.",
        "components": "GCS Skill Bucket • IAM Cond"
      },
      {
        "step": "Step ④",
        "badgeNum": "04",
        "zone": "Green Zone",
        "title": "Delegate: Shared vs Private Agent Alpha",
        "logicalNarrative": "Authorized `finvault` requests delegate to `FinVaultPrivateAgentAlpha`; peer `retailstream` calls fail closed (HTTP 403).",
        "components": "FinVaultPrivateAgentAlpha"
      },
      {
        "step": "Step ⑤",
        "badgeNum": "05",
        "zone": "Green Zone",
        "title": "Zero-Redeploy Skill Injection",
        "logicalNarrative": "Hydrated SKILL.md instructions mount into ADK session state in-memory with zero container rebuilds or image proliferation.",
        "components": "Dynamic Skill Loader"
      },
      {
        "step": "Step ⑥",
        "badgeNum": "06",
        "zone": "Red Zone",
        "title": "Gemini 2.5 Flash 32k Prefix Execution",
        "logicalNarrative": "Model executes against shared 32,768-token prefix cache achieving 89.1% net input token reduction (36,468 -> 3,969).",
        "components": "Gemini 2.5 Flash • 32k Cache"
      },
      {
        "step": "Step ⑦",
        "badgeNum": "07",
        "zone": "Red Zone",
        "title": "Model Armor Screening & OTel Tag",
        "logicalNarrative": "Output passes Model Armor DLP check while BigQuery OTel tags exact `(tenant_id, skill_id, agent_id, cached_tokens)`.",
        "components": "Model Armor • FinOps Tag"
      },
      {
        "step": "Outcome",
        "badgeNum": "08",
        "zone": "Blue Zone",
        "title": "Single-Image Enterprise Customization",
        "logicalNarrative": "Platforms operate one container globally while delivering bespoke private agents, skills, and per-feature chargeback.",
        "components": "Zero Container Redeploys"
      }
    ],
    "technicalSteps": [
      {
        "step": "Step ①",
        "hopName": "Context Verify",
        "route": "Caller -> Shared ADK Ingress",
        "protocolAndMechanism": "Validates cryptographic TenantContext prior to config/skill resolution.",
        "codeAndResource": "hop1_edge_identity_pep.py",
        "verifiedOutcome": "Verified tenant namespace"
      },
      {
        "step": "Step ②",
        "hopName": "Firestore Config",
        "route": "ADK -> Firestore `tenant_configs`",
        "protocolAndMechanism": "Fetches dynamic system_prompt & thinkingLevel (`HIGH`/`MEDIUM`/`LOW`).",
        "codeAndResource": "load_dynamic_runtime_config()",
        "verifiedOutcome": "<1ms zero-redeploy config"
      },
      {
        "step": "Step ③",
        "hopName": "GCS IAM Prefix",
        "route": "ADK -> `gs://cymbal-skills-{tenant}/`",
        "protocolAndMechanism": "IAM Condition `resource.name.startsWith` + HMAC digest verification.",
        "codeAndResource": "cymbal_agents.py",
        "verifiedOutcome": "0 cross-tenant skill reads"
      },
      {
        "step": "Step ④",
        "hopName": "Private Agent ACL",
        "route": "Orchestrator -> FinVaultAgentAlpha",
        "protocolAndMechanism": "Checks tenant allowlist on private Provisioned Throughput agent endpoints.",
        "codeAndResource": "finvault_agent_alpha.py",
        "verifiedOutcome": "RetailStream blocked (403)"
      },
      {
        "step": "Step ⑤",
        "hopName": "Skill Injection",
        "route": "Skill Loader -> ADK Context",
        "protocolAndMechanism": "Injects tenant SKILL.md into runtime instructions without container restart.",
        "codeAndResource": "shared_diagnostic_agent.py",
        "verifiedOutcome": "1 image across 1,000 tenants"
      },
      {
        "step": "Step ⑥",
        "hopName": "32k Prefix Cache",
        "route": "ADK -> Gemini 2.5 Flash",
        "protocolAndMechanism": "Co-schedules shared static prefix with dynamic skill prompt overlay.",
        "codeAndResource": "hop3_compute_finops_bulkhead.py",
        "verifiedOutcome": "89.1% net token reduction"
      },
      {
        "step": "Step ⑦",
        "hopName": "Egress Guard",
        "route": "Gemini -> Model Armor + DLP",
        "protocolAndMechanism": "Scrubs sensitive credentials/PII before returning skill output to caller.",
        "codeAndResource": "hop4_model_armor_guardrails.py",
        "verifiedOutcome": "Clean compliant output"
      },
      {
        "step": "Audit",
        "hopName": "Per-Skill OTel",
        "route": "ADK -> BigQuery `agentic_finops`",
        "protocolAndMechanism": "Records `cached_tokens`, `skill_id`, and PayGo vs PT cost attribution.",
        "codeAndResource": "hop5_data_rls_and_otel.py",
        "verifiedOutcome": "Feature-level SaaS FinOps"
      }
    ]
  }
];
