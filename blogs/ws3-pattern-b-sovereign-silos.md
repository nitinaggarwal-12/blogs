---
title: "Multi-tenant agentic AI system: Pattern B sovereign silos for regulated workloads"
subtitle: "Isolate regulated banking, healthcare, and public-sector tenants inside dedicated Google Cloud projects with VPC Service Controls, IAM Principal Access Boundaries, Cloud KMS CMEK kill-switches, and air-gapped Gemma 3 on GKE"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 3 of 5"
workstream: "Workstream 3 • Pattern B — Sovereign Silos for Regulated Workloads"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Cloud Architects, CISOs, and Compliance Leads in FinTech, Healthcare, and Public Sector"
reading_time: "14 min read"
tags: ["Sovereign Cloud","VPC Service Controls","Principal Access Boundary","Cloud KMS CMEK","Gemma 3","GKE","Vertex AI Agent Engine","ADK 2.0","Zero Trust","Multi-Tenancy"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws3-pattern-b-sovereign-silos-architecture","ws3-multi-project-silo-and-cmek-setup-topology","ws3-terraform-silo-blueprint-resource-graph"]
editable_slides: "slides/ws3-pattern-b-siloed-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Multi-tenant agentic AI system: Pattern B sovereign silos for regulated workloads

This document describes **Pattern B (Sovereign Silos)** for deploying a multi-tenant agentic AI system on Google Cloud when regulatory mandates (such as OCC/FDIC banking rules, EU DORA, HIPAA, or FedRAMP) prohibit shared compute pools and shared databases. Pattern B wraps the unchanged **80% reusable 5-Hop Cymbal agent core** ([`core-cymbal-agent/`](../core-cymbal-agent/)) inside a dedicated Google Cloud project per corporate tenant (`cymbal-finvault-silo-prod` and `cymbal-retailstream-silo-prod`), protected by a dedicated [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) perimeter, an organization-level [IAM Principal Access Boundary (PAB)](https://cloud.google.com/iam/docs/principal-access-boundary-policies), a customer-controlled [Cloud KMS](https://cloud.google.com/kms/docs) encryption key (`HTTP 423 Locked` kill-switch), and optional air-gapped **Gemma 3 (27B)** inference on private [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs).

This document is part 3 of a 5-part series extending the official Google Cloud [Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) reference architecture (following [Part 1: Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md) and [Part 2: Pattern A Pooled Architecture](ws2-pattern-a-pooled-architecture.md)).

> **Key point:** Pattern B reuses the exact same 5-Hop agent governance code as Pattern A while adding a physical project and cryptographic boundary around each tenant. If a customer revokes or disables their Cloud KMS key version, every in-flight and queued agent turn, memory bank read, and AlloyDB query halts immediately with **`HTTP 423 Locked`**.

## Use cases

Pattern B is designed for regulated enterprise customers whose legal, compliance, or risk teams prohibit shared multi-tenant infrastructure ([3.1 Case Study & Solution Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)):

- **Regulated banking and capital markets (OCC/FDIC, EU DORA, PCI DSS Level 1):** Financial institutions such as **FinVault Bank** (`cymbal-finvault-silo-prod`) that require dedicated compute quotas, zero physical blast radius, and a customer-held Cloud KMS / Cloud EKM encryption kill-switch over all agent memory and audit logs.
- **Sovereign healthcare, retail, and life sciences (HIPAA, GxP):** Regulated healthcare and enterprise tenants (such as **MedCore Health** and **RetailStream Corp's** sovereign division in `cymbal-retailstream-silo-prod`) processing Protected Health Information (PHI) or regulated payment telemetry that mandate dedicated VPC Service Controls perimeters and dedicated CMEK-encrypted AlloyDB clusters.
- **Air-gapped defense, intelligence, and core ledger environments:** Workloads that prohibit sending prompts to shared multi-tenant model endpoints and require self-hosted open-weight models (**Gemma 3 27B IT**) running on private GKE GPU nodes with zero internet egress.

## Design alternatives

### Managed Vertex AI endpoints vs air-gapped Gemma 3 (27B) on private GKE inside a silo

Within a Pattern B sovereign silo, architects can choose between managed Vertex AI foundation models and self-hosted open-weight models on GKE:

| Criterion | Managed Vertex AI Gemini 2.5 Pro (Dedicated Provisioned Throughput + VPC-SC + CMEK) | Air-Gapped Gemma 3 (27B IT) on Private GKE GPU Nodes |
| :--- | :--- | :--- |
| **Network boundary** | Accessed via Private Google Access inside the tenant's VPC-SC perimeter | Runs 100% inside the tenant's private GKE subnet (`0.0.0.0/0` egress blocked) |
| **Model weights & residency** | Google-managed regional endpoints with Dedicated Provisioned Throughput (`gemini-2.5-pro-dedicated`) | Weights mirrored in tenant's CMEK-encrypted Artifact Registry |
| **Reasoning & context window** | Highest multimodal reasoning capacity + 1M–2M context window | High-throughput open-weight reasoning for air-gapped core-ledger runbooks |
| **Operational overhead** | Fully serverless managed endpoint | Tenant GKE GPU node pool lifecycle managed via Terraform |

### 6-point sovereign silo verification matrix

Every Pattern B silo is certified against six automated security assertions matching the exact execution order of [`run_silo_security_tests.py`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py):

| Test ID | Sovereign security assertion (`run_silo_security_tests.py`) | Enforcing layer | Verified runtime result |
| :--- | :--- | :--- | :--- |
| **Silo Test 1** | Spoofed mTLS SPIFFE certificate (`spiffe://retailstream.com/...` targeting FinVault silo) | **mTLS Ingress Pinning (Pre-Check 1)** | Blocked with **`HTTP 401 MTLS_SPIFFE_MISMATCH`** |
| **Silo Test 2** | Cross-silo identity replay (RetailStream principal targeting `cymbal-finvault-silo-prod`) | **IAM Principal Access Boundary (PAB Pre-Check 2)** | Blocked with **`HTTP 403 PAB_VIOLATION`** |
| **Silo Test 3** | Tool attempting cross-project data exfiltration to `external-attacker-proj` | **VPC Service Controls (VPC-SC Pre-Check 3)** | Blocked with **`HTTP 403 VPC_SC_PERIMETER_VIOLATION`** |
| **Silo Test 4A** | FinVault revokes/disables Cloud KMS key (`cmek_state = REVOKED_OR_DISABLED`) | **Cloud KMS CMEK Kill-Switch (Hop 3)** | Halts immediately with **`HTTP 423 Locked`** |
| **Silo Test 4B & 5** | FinVault restores Cloud KMS key and executes air-gapped GKE Gemma 3 (27B) turn | **All 5 Hops + Private GKE vLLM (`gemma-3-27b-it-vllm`)** | **`HTTP 200 ALLOW`** with `public_egress = False` |
| **Silo Test 6** | Dual-silo parity: RetailStream / MedCore silo turn + independent CMEK revocation | **Isolated Project `cymbal-retailstream-silo-prod`** | **`HTTP 200 ALLOW`** when enabled; **`HTTP 423 Locked`** on revoke |

## Architecture

The following diagram shows the Pattern B sovereign silo architecture, where each corporate tenant operates inside an isolated Google Cloud project and VPC Service Controls perimeter:

![Figure 1 — Pattern B: Sovereign silos with VPC Service Controls, IAM PAB, Cloud KMS CMEK, and air-gapped Gemma 3 on GKE](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.png)

*Figure 1. Official Google Cloud Architecture Center hub-and-spoke topology showing the Sovereign mTLS & PAB Ingress Hub, Organization VPC-SC & Cloud KMS Governance Hub, Sovereign Silo Project A (`cymbal-finvault-silo-prod` with air-gapped Gemma 3 27B on GKE), and Sovereign Silo Project B (`cymbal-retailstream-silo-prod`). Editable assets: [Draw.io source](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio) | [Google Slides (.pptx)](../slides/ws3-pattern-b-siloed-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws3-pattern-b-sovereign-silos-architecture.svg) | [Vision AST](../diagrams/vision_metadata/ws3-pattern-b-sovereign-silos-architecture.vision.json).*

Figure 1 organizes the Pattern B sovereign deployment into four security zones:

- **Sovereign mTLS and PAB Ingress Hub (Zone 1 — Blue container `#aecbfa`):** Verifies client mutual TLS (mTLS) SPIFFE certificates (`spiffe://finvault.com/ns/sre/sa/agent-client`) and evaluates the organization-level IAM Principal Access Boundary (`PAB`) before routing traffic into the tenant's dedicated project (`Hop 1`).
- **Organization VPC-SC, Cloud KMS CMEK, and SCC Governance Hub (Zone 2 — Green container `#ceead6`):** Enforces per-project VPC Service Controls perimeters (`perimeter_finvault_sovereign`), verifies live Cloud KMS / Cloud EKM key state (`agent-memory-cmek`), monitors compliance in Security Command Center, and exports per-silo audit logs (`Hops 2 & 5`).
- **Sovereign Silo Project A — FinVault Bank (`cymbal-finvault-silo-prod`) (Zone 3 — Left amber container `#feefc3`):** Dedicated Google Cloud project hosting FinVault's isolated Vertex AI Agent Engine runtime, private `Agent Alpha` (`gemini-2.5-pro-dedicated` on Dedicated Provisioned Throughput), air-gapped **Gemma 3 (27B IT)** on private GKE GPU nodes (zero public internet egress), and CMEK-encrypted AlloyDB and Memory Bank.
- **Sovereign Silo Project B — RetailStream Corp / MedCore Health (`cymbal-retailstream-silo-prod`) (Zone 4 — Right coral container `#fad2cf`):** Physically separate Google Cloud project inside `perimeter_retailstream_sovereign` with its own IAM PAB policy, dedicated Provisioned Throughput Gemini 2.5 Pro endpoint, dedicated CMEK AlloyDB cluster, and isolated Microsoft Entra ID 3LO MCP servers.

The numbered callouts in Figure 1 trace a sovereign agent turn and verify physical and cryptographic isolation:

1. **Mutual TLS (mTLS) and OIDC request:** The tenant client connects with a pinned mTLS SPIFFE client certificate and an upstream OIDC JWT.
2. **Sovereign pre-check 1 & 2 — mTLS SPIFFE and IAM PAB verification:** `PatternBSiloedService` verifies that the client certificate (`HTTP 401` on SPIFFE mismatch) and IAM principal (`HTTP 403` on PAB violation) are bound exclusively to the target silo project (`cymbal-finvault-silo-prod`).
3. **Hop 2 — Silo-local Agent Catalog and tool pruning:** The silo's dedicated Discovery Engine catalog exposes only the tenant's approved agents and local MCP connectors.
4. **Sovereign pre-check 3 & Hop 4 — VPC-SC perimeter and Model Armor scan:** VPC Service Controls blocks any egress attempt to external projects (`VPC_SC_PERIMETER_VIOLATION_403`), while Model Armor and Cloud DLP inspect the prompt inline.
5. **Hop 3 — Live Cloud KMS CMEK check and air-gapped Gemma 3 / Vertex AI inference:** The runtime verifies that `agent-memory-cmek` is `ENABLED` (halting immediately with `HTTP 423 Locked` if disabled) and executes inference on air-gapped Gemma 3 (27B) on private GKE or dedicated Vertex AI endpoints.
6. **Hop 4 (Post-inference) — Output DLP and silo-local 3LO MCP execution:** Tool calls execute against silo-local MCP servers using DPoP-bound 3LO tokens and pass post-inference semantic NLC compliance checks.
7. **Hop 5 — Dedicated CMEK AlloyDB persistence and silo BigQuery audit:** State is written to the silo's dedicated CMEK-encrypted AlloyDB cluster (`SET LOCAL app.current_tenant_id`) and BigQuery audit dataset.

### Multi-project silo and Cloud KMS CMEK setup topology (Figure 2)

![Figure 2 — Pattern B: 4-stage multi-project provisioning, VPC-SC perimeter, and CMEK kill-switch topology](../diagrams/ws3-multi-project-silo-and-cmek-setup-topology.drawio.png)

*Figure 2. Step-by-step multi-project setup topology (`workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md`) showing Organization Access Context Manager, IAM PAB binding, Cloud KMS CMEK key rings, and private GKE Gemma 3 node pools. Editable assets: [Draw.io source](../diagrams/ws3-multi-project-silo-and-cmek-setup-topology.drawio) | [Google Slides (.pptx)](../slides/ws3-pattern-b-siloed-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws3-multi-project-silo-and-cmek-setup-topology.svg) | [Vision AST](../diagrams/vision_metadata/ws3-multi-project-silo-and-cmek-setup-topology.vision.json).*

Figure 2 details the four provisioning stages documented in [3.2 Multi-Project Silo & CMEK Setup](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md):

- **Stage 1 — Identity, mTLS Certificate Authority, and IAM PAB (Zone 1 — Blue container `#aecbfa`):** Configures Certificate Authority Service for SPIFFE mTLS certificates and binds the IAM Principal Access Boundary policy to the tenant folder/project.
- **Stage 2 — Access Context Manager, VPC-SC, and Cloud KMS CMEK (Zone 2 — Green container `#ceead6`):** Creates the dry-run and enforced VPC-SC service perimeters covering `aiplatform.googleapis.com`, `alloydb.googleapis.com`, and `storage.googleapis.com`, and provisions customer-managed KMS keys.
- **Stage 3 — Air-Gapped GKE Gemma 3 (27B) and Silo Agent Runtime (Zone 3 — Left amber container `#feefc3`):** Deploys a private GKE cluster (`enable_private_nodes = true`, `enable_private_endpoint = true`) serving `gemma-3-27b-it-vllm` from a local Artifact Registry mirror alongside Vertex AI Agent Engine.
- **Stage 4 — CMEK Data Plane and Automated Kill-Switch Verification (Zone 4 — Right coral container `#fad2cf`):** Binds `agent-memory-cmek` to AlloyDB, Memorystore, Vertex AI Memory Bank, and BigQuery, and validates instant `HTTP 423` revocation.

The seven numbered steps in Figure 2 trace the provisioning and cryptographic revocation workflow:

1. **Create isolated tenant GCP project:** Provision `cymbal-{tenant}-silo-prod` under a dedicated Organization folder with billing and quota isolation.
2. **Attach IAM Principal Access Boundary (PAB):** Bind `{tenant}-sovereign-pab` so tenant credentials can never authenticate to resources outside the silo project.
3. **Provision Cloud KMS / Cloud EKM key ring:** Create `agent-memory-cmek` and grant the Vertex AI, AlloyDB, and Storage service agents `roles/cloudkms.cryptoKeyEncrypterDecrypter`.
4. **Enforce VPC Service Controls perimeter:** Lock restricted Google Cloud APIs inside `perimeter_{tenant}_sovereign` and block unauthorized egress.
5. **Deploy private GKE Gemma 3 (27B) and Agent Engine runtime:** Launch vLLM serving Gemma 3 on private A100/H100 GKE nodes with Private Google Access and zero internet egress.
6. **Verify 5-Hop turn execution inside the silo:** Execute end-to-end agent turns using the unchanged `core-cymbal-agent/` governance modules.
7. **Trigger CMEK kill-switch (`HTTP 423 Locked`):** Disable the KMS cryptoKeyVersion and confirm that all runtime, memory, and database operations halt immediately with `423 Locked`.

### Parameterized Terraform silo blueprint resource graph (Figure 3)

![Figure 3 — Pattern B: Parameterized Terraform sovereign silo module resource graph](../diagrams/ws3-terraform-silo-blueprint-resource-graph.drawio.png)

*Figure 3. Declarative Terraform resource dependency graph (`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/`) for stamping out repeatable sovereign tenant silos. Editable assets: [Draw.io source](../diagrams/ws3-terraform-silo-blueprint-resource-graph.drawio) | [Google Slides (.pptx)](../slides/ws3-pattern-b-siloed-editable-slides.pptx) | [Architecture Center SVG](../diagrams/ws3-terraform-silo-blueprint-resource-graph.svg) | [Vision AST](../diagrams/vision_metadata/ws3-terraform-silo-blueprint-resource-graph.vision.json).*

Figure 3 maps the Terraform resources in [`3.6-terraform-silo-blueprint/main.tf`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf):

- **Project Factory and mTLS Ingress Resources (Zone 1 — Blue container `#aecbfa`):** Provisions `google_project`, private VPC subnets, and mTLS load balancer certificates.
- **VPC-SC Perimeter, IAM PAB, and KMS Resources (Zone 2 — Green container `#ceead6`):** Provisions `google_access_context_manager_service_perimeter`, `google_iam_principal_access_boundary_policy`, and `google_kms_crypto_key`.
- **Private GKE Gemma 3 and Vertex AI Runtime Resources (Zone 3 — Left amber container `#feefc3`):** Provisions `google_container_cluster` (private GPU pool), Artifact Registry weights mirror, and Vertex AI Agent Engine runtime.
- **CMEK AlloyDB, Memorystore, and BigQuery Resources (Zone 4 — Right coral container `#fad2cf`):** Provisions `google_alloydb_cluster` and `google_bigquery_dataset` encrypted with `encryption_config { kms_key_name = ... }`.

The seven numbered steps in Figure 3 trace the automated Terraform stamp-out pipeline:

1. **Input `tenant_id` and compliance variables:** Pass `tenant_id = "finvault"`, `region = "us-central1"`, and `enable_airgapped_gemma3 = true` to the Terraform module.
2. **Create project and attach IAM PAB policy:** Terraform provisions the isolated project and binds the organization PAB policy.
3. **Create Cloud KMS CMEK key and IAM grants:** Provisions the customer-managed encryption key before any stateful service is created.
4. **Configure Access Context Manager VPC-SC perimeter:** Places the project inside a dedicated service perimeter with restricted Google APIs.
5. **Provision private GKE GPU cluster and Agent Engine:** Deploys the air-gapped Gemma 3 inference pool and ADK runtime.
6. **Provision CMEK-encrypted AlloyDB and Memory Bank:** Creates the relational and vector stores bound to the tenant's KMS key.
7. **Run 6-test sovereign verification suite:** Executes `run_silo_security_tests.py` to certify perimeter, PAB, and CMEK kill-switch enforcement before sign-off.

## Products used

Pattern B (Sovereign Silos) uses the following Google Cloud products inside each tenant's dedicated project (`cymbal-{tenant}-silo-prod`):

### Sovereign agent runtime and air-gapped foundation models

- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview) and [Agent Development Kit (ADK)](https://google.github.io/adk-docs/): Run a dedicated single-tenant instance of the 80% reusable 5-Hop agent core per project with CMEK-encrypted session and memory state.
- [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/docs) and [Artifact Registry](https://cloud.google.com/artifact-registry/docs): Host air-gapped **Gemma 3 (27B IT)** vLLM inference on private GPU node pools (`enable_private_nodes = true`, `enable_private_endpoint = true`) pulling weights over Private Google Access with zero public internet egress.
- [Gemini 2.5 Pro Dedicated Provisioned Throughput](https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput/overview) and [Vertex AI Model Garden](https://cloud.google.com/model-garden): Provide guaranteed, no-noisy-neighbor model capacity (`gemini-2.5-pro-dedicated`) inside the tenant's VPC Service Controls perimeter.

### Perimeter isolation, mTLS identity, and cryptographic kill-switch

- [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs) and [Access Context Manager](https://cloud.google.com/access-context-manager/docs): Enclose each tenant project inside a dedicated service perimeter (`perimeter_{tenant}_sovereign`) that blocks cross-project API exfiltration (`HTTP 403`).
- [IAM Principal Access Boundary (PAB)](https://cloud.google.com/iam/docs/principal-access-boundary-policies) and [Certificate Authority Service](https://cloud.google.com/certificate-authority-service/docs): Pin workload and user principals exclusively to their assigned silo project and validate SPIFFE mTLS client certificates (`HTTP 401` on mismatch).
- [Cloud Key Management Service (Cloud KMS)](https://cloud.google.com/kms/docs) and [Cloud External Key Manager (Cloud EKM)](https://cloud.google.com/kms/docs/ekm): Enforce customer-managed encryption keys (`agent-memory-cmek`) across memory, storage, and databases with an instant `HTTP 423 Locked` kill-switch.

### Dedicated data plane, AI safety guardrails, and compliance posture

- [AlloyDB for PostgreSQL](https://cloud.google.com/alloydb/docs) and [Memorystore for Valkey](https://cloud.google.com/memorystore/docs/valkey/overview): Provide physically isolated, CMEK-encrypted relational and in-memory state per tenant silo.
- [Model Armor](https://cloud.google.com/security-command-center/docs/model-armor-overview) and [Sensitive Data Protection (Cloud DLP)](https://cloud.google.com/sensitive-data-protection/docs): Enforce tenant-specific OCC/FDIC, HIPAA, and PCI guardrails inline (`Hop 4`).
- [Security Command Center](https://cloud.google.com/security-command-center/docs), [Cloud Logging](https://cloud.google.com/logging/docs), and [BigQuery](https://cloud.google.com/bigquery/docs): Deliver per-silo compliance posture monitoring and CMEK-encrypted OpenTelemetry audit trails.

## Design considerations

This section provides guidance for operating Pattern B according to the [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework).

### Security, privacy, and compliance

- **Protect APIs with VPC Service Controls, not just firewall rules:** Include `aiplatform.googleapis.com`, `discoveryengine.googleapis.com`, `modelarmor.googleapis.com`, `dlp.googleapis.com`, `alloydb.googleapis.com`, `storage.googleapis.com`, and `bigquery.googleapis.com` in the restricted service list of `perimeter_{tenant}_sovereign` ([3.4 VPC-SC & Security Sign-Off](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md)).
- **Bind IAM Principal Access Boundaries (PAB) at the organization root:** Pin each tenant's Workforce Identity Pool principals exclusively to `//cloudresourcemanager.googleapis.com/projects/cymbal-{tenant}-silo-prod` so compromised credentials cannot access any other project.
- **Wire Cloud KMS CMEK as a unified kill-switch with instant in-memory cache eviction:** Encrypt the Vertex AI Memory Bank, AlloyDB cluster, GKE persistent disks, and BigQuery datasets with the same tenant KMS key. Because long-lived worker pods could otherwise hold decrypted L1–L4 session state in RAM after a KMS key is disabled (`GAP-P1-04`), **Hop 3** performs a live sub-second Cloud KMS key-state probe before every turn and, upon detecting `DISABLED` or `DESTROY_SCHEDULED`, immediately executes `UNLINK {tenant_id}:*` on Memorystore for Valkey, recycles the gVisor worker sandbox within `< 5 seconds`, and returns `HTTP 423 Locked`.

### Reliability

- **Dedicated Provisioned Throughput (PT) or dedicated GPU nodes:** Because each silo has its own Google Cloud project, API quotas and model throughput are physically isolated—eliminating cross-tenant noisy-neighbor risk.

### Cost optimization

- **Understand the baseline cost floor (`600 RPM Silo/month` per dedicated tenant project):** Dedicated AlloyDB instances, Memorystore clusters, and private GKE GPU nodes carry a non-trivial idle cost floor. Reserve full Pattern B silos for Enterprise contracts that price in dedicated infrastructure, or use [Pattern C (Dynamic Hybrid)](ws4-pattern-c-hybrid-dynamic-tiering.md) to share a control plane while isolating only Enterprise data/runtime spokes.

### Operational excellence

- **Automate silo stamp-out with Terraform:** Never configure VPC-SC perimeters or CMEK bindings manually in the console. Use the parameterized [3.6 Terraform Silo Blueprint](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf) so every tenant silo is identical and auditable.

### Performance optimization

- **Localize vLLM model weights in Artifact Registry:** Store Gemma 3 container images and model weights in a regional Artifact Registry repository inside the silo perimeter so GKE GPU nodes pull weights over Private Google Access at line rate.



## Live Intra-Cloud (Google Cloud Console) & Inter-Cloud (10 Third-Party Enterprise Apps) Validation Proof — Pattern B (Sovereign Silos & CMEK Kill-Switch)

> **Dual-Plane Live Cloud & Stateful Execution Twin Verification (Pattern B (`Dedicated VPC-SC` • `mTLS SPIFFE` • `HTTP 423 CMEK Kill-Switch`)):** Every architectural claim in **WS3** is verified across three live Google Cloud project tiers (`cymbal-control-plane` `#248990048888`, `cymbal-pooled-prod` `#638420508320`, and `cymbal-build-sandbox` `#887605034827`) and a **Dual-Plane Inter-Cloud Verification Harness** on AWS (`us-east-1`, Account `393036065405`): (1) **Side A — Commercial Vendor Control-Plane & AWS Bedrock AgentCore MCP Gateway** (`kiu8omh4aq`, Targets `KD6Z3SV8PX`..`TXGJHVFBWP`), and (2) **Side B — 10 Stateful Open-Source Data/RLS Execution Twins on AWS EC2** (`i-04924523ac41ff132`, `http://13.220.94.209:3001..3010`) backed by immutable **Amazon S3 Audit Ledgers** (`s3://cymbal-multi-tenant-audit-ledger-393036065405-us-east-1/cymbal-10saas-ledger/<target>/finvault.json`) so destructive cross-tenant red-team tests execute safely without polluting shared commercial SaaS tenants.

### Part I — Intra-Cloud (Google Cloud Console) Live Validation Screenshots (WS3)

![Intra-Cloud Pattern B (Sovereign Silos) Stage 1 — Live BigQuery Studio (`pattern_b_silo_finvault_cmek_vault`) verifying dedicated per-tenant sovereign vault encryption under `finvault-silo-cmek`](../screenshots/cloud-console/gcp_console_04_bigquery_studio_pattern_b_cmek.png)

![Intra-Cloud Pattern B (Sovereign Silos) Stage 2 — Live Google Cloud KMS KeyRing (`cymbal-multi-tenant-kr` in `us-west1`) showing `finvault-silo-cmek` (`ENABLED`) and `medcore-revoked-cmek` (`DISABLED` kill-switch triggering `HTTP 423 Locked` in `< 5 s`)](../screenshots/cloud-console/gcp_console_05_cloud_kms_keyring_live.png)

![Intra-Cloud Pattern B (Sovereign Silos) Stage 3 — Live Cloud Logging Explorer certifying `6/6` Pattern B Sovereign Silo, VPC-SC, and CMEK Kill-Switch assertions (`PASS`)](../screenshots/cloud-console/gcp_console_07_logs_explorer_20_20_pass.png)

![Intra-Cloud Pattern B (Sovereign Silos) Stage 4 — Live Vertex AI Agent Builder & Air-Gapped Sovereign Runtime verification](../screenshots/cloud-console/gcp_console_09_vertex_ai_agent_builder_engines.png)

### Part II — Inter-Cloud Third-Party App Testing & Validation Matrix (WS3 • 10 Live AWS AgentCore MCP Targets + 10 Stateful Execution Twins on `13.220.94.209:3001..3010`)

- **Plane 1 — AWS Bedrock AgentCore MCP & Commercial SaaS Control Plane (`Side A`)**: Run `python3 -B scripts/deploy_10_saas_aws_agentcore_targets.py` and `python3 -B scripts/verify_5_third_party_saas_products.py` to mint a live Amazon Cognito RS256 OAuth2 token (`us-east-1_vqlzYM74B`) and execute `tools/call` across all 10 targets (`KD6Z3SV8PX`..`TXGJHVFBWP`) on `https://merck-a2a-mcp-gateway-kiu8omh4aq.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`.
- **Plane 2 — Stateful Open-Source Data/RLS Execution Twins (`Side B` on `http://13.220.94.209:3001..3010`)**: Inspect each live containerized execution twin (`Metabase v0.50.26`, `Grafana Enterprise 11.2.0`, `Redmine 5.1`, `NocoDB 0.255.2`, `Gitea 1.22.3`, `Trino 440`, `ClickHouse 24.8`, `Directus 11.1.0`, `Datalust Seq 2024.3`, and `HashiCorp Vault 1.13.3`) and its live Amazon S3 Audit Ledger JSON (`?format=json`). *(Note: Public review sandboxes expose read-accessible ports `:3001..3010` and reviewer credentials for instant auditability; production deployments enforce HTTPS ALB/WAF TLS 1.3 termination, private VPC-only listener bindings, and 5-minute DPoP-bound OAuth2 tokens.)*

| SaaS ID & Product (Vendor Control Plane) | AWS AgentCore Target ID & Pattern Config | Positive E2E Input & Verified Output (`200 ALLOW`) | Adversarial / Negative Input & Verified Block (`403 / 401 / 400 / 423`) | Live Execution Twin UI (`13.220.94.209:3001..3010`) & S3 Ledger JSON | Side-A (AgentCore MCP) & Side-B (Live Software UI) Screenshots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud (Spotter Agentic BI v2.0)** • [Vendor API (`try-everywhere.thoughtspot.cloud`)](https://try-everywhere.thoughtspot.cloud/api/rest/2.0/auth/token/custom) | Target **`KD6Z3SV8PX`** (`READY`) • `mcp://cymbal/thoughtspot-spotter-bi-3lo` • Silo `cymbal-finvault-silo-prod` + mTLS SPIFFE + `finvault-silo-cmek` | **In:** `tenant="finvault"`, `kms="finvault-silo-cmek"` (`ENABLED`) • **Out:** `HTTP 200` • `2` FinVault rows + S3 ledger | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` (`valkey_purged=True`) | [Live Metabase BI (`:3001`)](http://13.220.94.209:3001/question/27) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json) | [Side-A MCP (`saas_01`)](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_01`)](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png) |
| **`SAAS-02` Sigma Computing (Workbooks & Dataset API v2)** • [Vendor API (`api.sigmacomputing.com`)](https://api.sigmacomputing.com/v2/auth/token) | Target **`OZ0KTE8Z8M`** (`READY`) • `mcp://cymbal/sigma-computing-workbooks-3lo` • Silo `cymbal-finvault-silo-prod` + CMEK + `ua_tenant_id=finvault` | **In:** `tenant="finvault"`, `workbook="wb-sigma-finvault-liquidity-01"` • **Out:** `HTTP 200` • Silo CMEK verified (`2` rows) | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Grafana BI (`:3002`)](http://13.220.94.209:3002/d/finvault-sre-wb) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json) | [Side-A MCP (`saas_02`)](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_02`)](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png) |
| **`SAAS-03` ServiceNow ITSM & ITOM (`CHG0049218`)** • [Vendor Status (`status.servicenow.com`)](https://status.servicenow.com) | Target **`PLOLWRMI0I`** (`READY`) • `mcp://retailstream/servicenow-itom-3lo` • Silo VPC-SC egress allowlist -> AWS AgentCore `CHG0049218` | **In:** `tenant="finvault"`, `change="CHG0049218"` via Silo mTLS • **Out:** `HTTP 200` • Live AgentCore `CHG0049218` (`READY_FOR_CAB_APPROVAL`) | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Redmine ITSM (`:3003`)](http://13.220.94.209:3003/projects/finvault-itsm/issues) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json) | [Side-A MCP (`saas_03`)](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_03`)](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png) |
| **`SAAS-04` Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`)** • [Vendor Portal (`veevavault.com`)](https://login.veevavault.com) | Target **`1KZWKOFTWQ`** (`READY`) • `mcp://finvault/veeva-muse-clinical-3lo` • GxP Silo + Cloud KMS asymmetric P-256 `21 CFR Part 11` signature | **In:** `tenant="finvault"`, `study="FV-GXP-2026-04"`, `cohort="Cohort-B"` • **Out:** `HTTP 200` • Live AgentCore + KMS ECDSA P-256 signature | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live NocoDB EDC (`:3004`)](http://13.220.94.209:3004/#/nc/base) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json) | [Side-A MCP (`saas_04`)](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_04`)](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png) |
| **`SAAS-05` Salesforce CRM (`NA224`) & Atlassian Jira Cloud** • [Vendor API (`api.status.salesforce.com`)](https://api.status.salesforce.com/v1/instances/NA224/status) | Target **`W7BF0JRWEA`** (`READY`) • `mcp://finvault/salesforce-jira-escalation-3lo` • Silo VPC-SC + Hop 4 Cloud SDP IBAN/SWIFT redaction | **In:** `tenant="finvault"`, `instance="NA224"` with raw IBAN/SWIFT • **Out:** `HTTP 200` • `[REDACTED-FINVAULT-IBAN]` (`raw_pii_leaked=False`) | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Gitea Tracker (`:3005`)](http://13.220.94.209:3005/finvault/sre-escalations/issues/1) (`sre-lead` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json) | [Side-A MCP (`saas_05`)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_05`)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png) |
| **`SAAS-06` Databricks Data Intelligence Platform (Unity Catalog)** • [Vendor API (`community.cloud.databricks.com`)](https://community.cloud.databricks.com/api/2.0/clusters/list) | Target **`Z1RHXLBK6F`** (`READY`) • `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Silo VPC-SC -> Dedicated `cymbal_uc_prod.finvault_gold` catalog | **In:** `tenant="finvault"`, `schema="finvault_gold"` • **Out:** `HTTP 200` • `2` FinVault lakehouse rows + CMEK verified | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Trino UI (`:3006`)](http://13.220.94.209:3006/ui/) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json) | [Side-A MCP (`saas_06`)](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_06`)](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png) |
| **`SAAS-07` Snowflake AI Data Cloud (Cortex Analyst & SQL v2)** • [Vendor API (`snowflakecomputing.com`)](https://os37291.us-east-1.snowflakecomputing.com/api/v2/statements) | Target **`7PB1EK3NJO`** (`READY`) • `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Silo VPC-SC + Tri-Secret Secure CMEK + `ROLE_CYMBAL_FINVAULT` | **In:** `tenant="finvault"`, `role="ROLE_CYMBAL_FINVAULT"` • **Out:** `HTTP 200` • `SECONDARY_ROLES=NONE` + CMEK verified | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live ClickHouse UI (`:3007`)](http://13.220.94.209:3007/play) (`finvault_user` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json) | [Side-A MCP (`saas_07`)](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_07`)](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png) |
| **`SAAS-08` Workday Enterprise HCM & Financial Management** • [Vendor API (`wd5-services1.myworkday.com`)](https://wd5-services1.myworkday.com/ccx/oauth2/cymbal/token) | Target **`CXH8BK86IF`** (`READY`) • `mcp://finvault/workday-hcm-financials-raas-3lo` • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN Cloud SDP | **In:** `tenant="finvault"`, `user="alice@finvault.com"` in Silo • **Out:** `HTTP 200` • `[REDACTED_US_SSN]` & `[REDACTED_IBAN]` | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Directus HCM (`:3008`)](http://13.220.94.209:3008/admin/content/hcm_compensation) (`sre-lead@finvault.com` / `FinVault#2026!`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json) | [Side-A MCP (`saas_08`)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_08`)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png) |
| **`SAAS-09` Datadog Cloud Observability & Bits AI SRE** • [Vendor API (`api.datadoghq.com`)](https://api.datadoghq.com/api/v1/validate) | Target **`A2X7LPMPA7`** (`READY`) • `mcp://cymbal/datadog-observability-sre-3lo` • Silo VPC-SC + `@tenant_id:finvault` + Hop 4 Model Armor | **In:** `tenant="finvault"`, `query="service:agent-gateway @tenant_id:finvault"` • **Out:** `HTTP 200` • Silo logs verified (`0` injection) | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | [Live Seq APM (`:3009`)](http://13.220.94.209:3009/#/events) (`sre-lead@finvault.com`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json) | [Side-A MCP (`saas_09`)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_09`)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png) |
| **`SAAS-10` CrowdStrike Falcon Next-Gen SIEM & Okta Identity** • [Vendor API (`api.crowdstrike.com`)](https://api.crowdstrike.com/oauth2/token) | Target **`TXGJHVFBWP`** (`READY`) • `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Silo mTLS SPIFFE + Okta DPoP + `<5s` Valkey cache purge on CMEK revoke | **In:** `tenant="finvault"`, `dpop="dpop_jkt_fv_001"` in Silo • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200` | **In:** `tenant="medcore"`, `kms="medcore-revoked-cmek"` (`DISABLED`) • **Out:** **`HTTP 423`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` (`valkey_purged=True`) | [Live Vault UI (`:3010`)](http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault) (Token `fv-token-finvault-sre-2026`) • [Live S3 JSON](https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json) | [Side-A MCP (`saas_10`)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png) • [Side-B Live UI (`saas_ui_10`)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png) |

### Part III — Side-A (AgentCore MCP) & Side-B (Live Execution Twin UI on `13.220.94.209:3001..3010`) Visual Proof Gallery (WS3)

![SAAS-01 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target KD6Z3SV8PX (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_01_thoughtspot_spotter_agentcore_mcp.png)

![SAAS-01 Side B — WS3 Live Metabase BI (`metabase/metabase:v0.50.26`) Execution Twin UI on http://13.220.94.209:3001/question/27 (ThoughtSpot Cloud (Spotter Agentic BI v2.0))](../screenshots/cloud-console/saas_ui_01_thoughtspot_spotter_console.png)

![SAAS-02 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target OZ0KTE8Z8M (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_02_sigma_computing_agentcore_mcp.png)

![SAAS-02 Side B — WS3 Live Grafana Enterprise (`grafana/grafana-enterprise:11.2.0`) Execution Twin UI on http://13.220.94.209:3002/d/finvault-sre-wb (Sigma Computing (Workbooks & Dataset API v2))](../screenshots/cloud-console/saas_ui_02_sigma_computing_console.png)

![SAAS-03 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target PLOLWRMI0I (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_03_servicenow_itsm_agentcore_mcp.png)

![SAAS-03 Side B — WS3 Live Redmine ITSM (`redmine:5.1-alpine`) Execution Twin UI on http://13.220.94.209:3003/projects/finvault-itsm/issues (ServiceNow ITSM & ITOM (`CHG0049218`))](../screenshots/cloud-console/saas_ui_03_servicenow_itsm_console.png)

![SAAS-04 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 1KZWKOFTWQ (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_04_veeva_vault_muse_edc_agentcore_mcp.png)

![SAAS-04 Side B — WS3 Live NocoDB Clinical EDC (`nocodb/nocodb:0.255.2`) Execution Twin UI on http://13.220.94.209:3004/#/nc/base (Veeva Vault RIM & Muse Clinical EDC (`FV-GXP-2026-04`))](../screenshots/cloud-console/saas_ui_04_veeva_vault_muse_edc_console.png)

![SAAS-05 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target W7BF0JRWEA (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_05_salesforce_jira_agentcore_mcp.png)

![SAAS-05 Side B — WS3 Live Gitea Escalation Tracker (`gitea/gitea:1.22.3`) Execution Twin UI on http://13.220.94.209:3005/finvault/sre-escalations/issues/1 (Salesforce CRM (`NA224`) & Atlassian Jira Cloud)](../screenshots/cloud-console/saas_ui_05_salesforce_jira_console.png)

![SAAS-06 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target Z1RHXLBK6F (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_06_databricks_unity_catalog_agentcore_mcp.png)

![SAAS-06 Side B — WS3 Live Trino Distributed SQL Lakehouse (`trinodb/trino:440`) Execution Twin UI on http://13.220.94.209:3006/ui/ (Databricks Data Intelligence Platform (Unity Catalog))](../screenshots/cloud-console/saas_ui_06_databricks_unity_catalog_console.png)

![SAAS-07 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target 7PB1EK3NJO (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_07_snowflake_cortex_agentcore_mcp.png)

![SAAS-07 Side B — WS3 Live ClickHouse Analytics Play UI (`clickhouse/clickhouse-server:24.8`) Execution Twin UI on http://13.220.94.209:3007/play (Snowflake AI Data Cloud (Cortex Analyst & SQL v2))](../screenshots/cloud-console/saas_ui_07_snowflake_cortex_console.png)

![SAAS-08 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target CXH8BK86IF (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_08_workday_hcm_financials_agentcore_mcp.png)

![SAAS-08 Side B — WS3 Live Directus HCM Data Studio (`directus/directus:11.1.0`) Execution Twin UI on http://13.220.94.209:3008/admin/content/hcm_compensation (Workday Enterprise HCM & Financial Management)](../screenshots/cloud-console/saas_ui_08_workday_hcm_financials_console.png)

![SAAS-09 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target A2X7LPMPA7 (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_09_datadog_bits_ai_sre_agentcore_mcp.png)

![SAAS-09 Side B — WS3 Live Datalust Seq APM & Log Server (`datalust/seq:2024.3`) Execution Twin UI on http://13.220.94.209:3009/#/events (Datadog Cloud Observability & Bits AI SRE)](../screenshots/cloud-console/saas_ui_09_datadog_bits_ai_sre_console.png)

![SAAS-10 Side A — WS3 GCP 5-Hop Agent Orchestrator & AWS Bedrock AgentCore MCP Target TXGJHVFBWP (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_10_crowdstrike_okta_agentcore_mcp.png)

![SAAS-10 Side B — WS3 Live HashiCorp Vault UI (`hashicorp/vault:1.13.3`) Execution Twin UI on http://13.220.94.209:3010/ui/vault/secrets/secret/show/tenants/finvault (CrowdStrike Falcon Next-Gen SIEM & Okta Identity)](../screenshots/cloud-console/saas_ui_10_crowdstrike_okta_console.png)


## What's next

- Continue through the 5-part Multi-Tenant Agentic AI Architecture series:
  - [Part 1 (Workstream 1): Reference Architecture Taxonomy & 5-Hop Baseline](ws1-reference-architecture-taxonomy-and-5hop-baseline.md)
  - [Part 2 (Workstream 2): Pattern A — High-Density Pooled Architecture](ws2-pattern-a-pooled-architecture.md)
  - [Part 4 (Workstream 4): Pattern C — Dynamic Hybrid Hub-and-Spoke & Zero-Downtime Tier Upgrades](ws4-pattern-c-hybrid-dynamic-tiering.md)
  - [Part 5 (Workstream 5): Executive Decision Guide & The Multi-Tenant Agentic Triad](ws5-decision-guide-and-agentic-triad.md)
- Review the Workstream 3 engineering artifacts and regulated codelab:
  - [3.1 Pattern B Case Study & Sovereign Silo Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md)
  - [3.2 Multi-Project Silo, VPC-SC & CMEK Setup Guide](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md)
  - [3.3 Pattern B Sovereign Silo Runtime Implementation (`pattern_b_siloed_service.py`)](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py)
  - [3.4 VPC Service Controls & CISO Security Sign-Off Checklist](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md)
  - [3.5 6-Point Sovereign Security Verification Suite (`run_silo_security_tests.py`)](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py)
  - [3.6 Parameterized Terraform Silo Blueprint (`main.tf`)](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf)
  - [3.8 90-Minute Codelab: Regulated Sovereign Silos & CMEK Kill-Switch](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/codelab-90min-regulated-airgapped.md)
  - [10 Third-Party SaaS × 3-Pattern Manual Testing Playbook (`10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`)](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
- Download or open the editable slides:
  - [Workstream 3 Editable Google Slides Deck (`ws3-pattern-b-siloed-editable-slides.pptx`)](../slides/ws3-pattern-b-siloed-editable-slides.pptx)

---

<!-- E2E_FLOW_START -->
<!-- Canonical Step-by-Step Logical & Technical E2E Flows served dynamically from diagrams/diagram_e2e_flows.json via toggleInlineFigureFlow(diagId) -->
<!-- E2E_FLOW_END -->
