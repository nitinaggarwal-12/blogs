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
- **End-to-end Pattern B (Sovereign Silos) verification across 10 third-party SaaS products (`10/10 Flows • 20/20 Test Cases PASS`):** Every third-party SaaS, BI, Lakehouse, ERP, Observability, and SecOps connector in [`enterprise_5_saas_bi_mcp.py`](../core-cymbal-agent/mcp_servers/enterprise_5_saas_bi_mcp.py) is verified inside **Pattern B's Sovereign Silo Shell** (`cymbal-finvault-silo-prod`, `mTLS SPIFFE spiffe://cymbal.internal/ns/silo-finvault/sa/agent-runner`, `IAM PAB pab-silo-finvault`, `VPC-SC perimeter_cymbal_finvault_silo`, `600 RPM Silo`, `8,192` token budget, and `Cloud KMS CMEK Kill-Switch HTTP 423 Locked` with `< 5s` Valkey purge). See complete setup, configuration JSON, `curl` probes, and Input/Output test payloads in [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md):

| SaaS ID & Product | Pattern B Sovereign Silo Shell & VPC-SC/CMEK Config | Positive E2E Input & Verified Output (`TC-B-POS`) | Sovereign Silo Breach / CMEK Input & Verified Block (`TC-B-NEG`) | Manual CLI Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **`SAAS-01` ThoughtSpot Cloud** (*Spotter Agentic BI v2.0*) | `mcp://cymbal/thoughtspot-spotter-bi-3lo` • Silo `cymbal-finvault-silo-prod` + VPC-SC egress rule | **In:** `silo="cymbal-finvault-silo-prod"`, `spiffe=True`, `org="finvault-org-01"` • **Out:** `HTTP 200` • `Server: ThoughtSpot`, `row_count=2` FinVault rows | **In:** Silo KMS CMEK key revoked (`projects/cymbal-medcore-silo-prod/.../medcore-revoked-cmek`) • **Out:** **`HTTP 423 Locked`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` + `valkey_purged=True` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas thoughtspot --pattern pattern-b --verbose` |
| **`SAAS-02` Sigma Computing** (*Workbooks & Dataset API v2*) | `mcp://cymbal/sigma-computing-workbooks-3lo` • Silo CMEK + `ua_tenant_id=finvault` BigQuery pushdown | **In:** `silo="cymbal-finvault-silo-prod"`, `cmek="finvault-active-cmek"` • **Out:** `HTTP 200` • Live Sigma `requestId` + `2` FinVault rows | **In:** Customer revokes Cloud KMS CMEK key mid-session (`medcore-revoked-cmek`) • **Out:** **`HTTP 423 Locked`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas sigma --pattern pattern-b --verbose` |
| **`SAAS-03` ServiceNow ITSM** (*Live AWS Bedrock AgentCore MCP*) | `mcp://retailstream/servicenow-itom-3lo` • Silo VPC-SC egress -> AWS Bedrock AgentCore MCP | **In:** `silo="cymbal-retailstream-silo-prod"`, `change="CHG0049218"`, `3lo=True` • **Out:** `HTTP 200` • Live AWS AgentCore `CHG0049218` returned | **In:** Revoke Silo KMS CMEK key or omit 3LO grant • **Out:** **`HTTP 423 Locked`** / **`HTTP 401 CHALLENGE_3LO_OAUTH`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas servicenow --pattern pattern-b --verbose` |
| **`SAAS-04` Veeva Vault & Muse EDC** (*Regulated Life Sciences GxP*) | `mcp://finvault/veeva-muse-clinical-3lo` • Regulated GxP Silo + FDA 21 CFR Part 11 HMAC-SHA256 | **In:** `silo="cymbal-finvault-silo-prod"`, `study="MK-3475-087"`, `doc="VV-DOC-004819"` • **Out:** `HTTP 200` • Live AWS AgentCore biomarkers + 21 CFR Part 11 sig | **In:** Cross-silo principal or revoked Silo CMEK key • **Out:** **`HTTP 423 Locked`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas veeva-muse --pattern pattern-b --verbose` |
| **`SAAS-05` Salesforce & Jira Cloud** (*Multi-SaaS Case Escalation*) | `mcp://finvault/salesforce-jira-escalation-3lo` • Silo VPC-SC egress + Hop 4 Egress Cloud SDP | **In:** `silo="cymbal-finvault-silo-prod"`, `instance="NA224"`, raw IBAN/SWIFT • **Out:** `HTTP 200` • Live `NA224` (`Winter '27 Patch 8.6`) + `[REDACTED_IBAN_CODE]` | **In:** Silo KMS CMEK revocation + egress PII inspection • **Out:** **`HTTP 423 Locked`** & `raw_pii_leaked=False` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas salesforce-jira --pattern pattern-b --verbose` |
| **`SAAS-06` Databricks Platform** (*Unity Catalog & Genie API 2.0*) | `mcp://cymbal/databricks-unity-catalog-genie-3lo` • Silo VPC-SC -> `cymbal_uc_prod.finvault_gold` | **In:** `silo="cymbal-finvault-silo-prod"`, `schema="finvault_gold"` • **Out:** `HTTP 200` • `Server: databricks`, `row_count=2` FinVault rows | **In:** Revoke Silo KMS CMEK key before Unity Catalog federation • **Out:** **`HTTP 423 Locked`** `KMS_CMEK_KEY_REVOKED_KILL_SWITCH` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas databricks --pattern pattern-b --verbose` |
| **`SAAS-07` Snowflake AI Data Cloud** (*Cortex Analyst & SQL API v2*) | `mcp://cymbal/snowflake-cortex-analyst-sql-3lo` • Silo VPC-SC -> Snowflake `SF-LB-T1` (`SECONDARY_ROLES=NONE`) | **In:** `silo="cymbal-finvault-silo-prod"`, `role="ROLE_CYMBAL_FINVAULT"` • **Out:** `HTTP 200` • `Server: SF-LB-T1`, `row_count=2` FinVault rows | **In:** Revoke Silo KMS CMEK key or attempt `USE SECONDARY ROLES ALL` • **Out:** **`HTTP 423 Locked`** / **`HTTP 403`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas snowflake --pattern pattern-b --verbose` |
| **`SAAS-08` Workday HCM & Financials** (*CCX OAuth2 & RaaS API*) | `mcp://finvault/workday-hcm-financials-raas-3lo` • Silo VPC-SC -> Workday CCX + Hop 4 SSN/IBAN SDP | **In:** `silo="cymbal-finvault-silo-prod"`, `user="alice@finvault.com"` • **Out:** `HTTP 200` • Live Workday CCX probe + `[REDACTED_US_SSN]` | **In:** Revoke Silo KMS CMEK key or cross-principal 3LO token reuse • **Out:** **`HTTP 423 Locked`** / **`HTTP 401`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas workday --pattern pattern-b --verbose` |
| **`SAAS-09` Datadog & Bits AI SRE** (*Logs API v2 & Log Injection Guard*) | `mcp://cymbal/datadog-observability-sre-3lo` • Silo Log Index `@tenant_id:finvault` + Hop 4 Model Armor | **In:** `silo="cymbal-finvault-silo-prod"`, `query="@tenant_id:finvault"` • **Out:** `HTTP 200` • Live Datadog US1 API + `2` sanitized log spans | **In:** Revoked Silo CMEK (`423`) or poisoned log stack trace (`400`) • **Out:** **`HTTP 423 Locked`** / **`HTTP 400`** | `python3 -B scripts/verify_5_third_party_saas_products.py --saas datadog --pattern pattern-b --verbose` |
| **`SAAS-10` CrowdStrike Falcon & Okta** (*OAuth2 XDR & OIDC/DPoP Graph*) | `mcp://cymbal/crowdstrike-falcon-okta-xdr-3lo` • Silo mTLS SPIFFE + Okta DPoP + Silo CMEK Kill-Switch | **In:** `silo="cymbal-finvault-silo-prod"`, `dpop="dpop_jkt_fv_001"` • **Out:** `HTTP 200` • Live Falcon `trace_id` + Okta OIDC `200` | **In:** Revoke Silo KMS CMEK key (`medcore-revoked-cmek`) • **Out:** **`HTTP 423 Locked`** + Valkey session cache purged in `< 5s` | `python3 -B scripts/verify_5_third_party_saas_products.py --saas crowdstrike-okta --pattern pattern-b --verbose` |

### Performance optimization

- **Localize vLLM model weights in Artifact Registry:** Store Gemma 3 container images and model weights in a regional Artifact Registry repository inside the silo perimeter so GKE GPU nodes pull weights over Private Google Access at line rate.

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
## Step-by-Step End-to-End Agentic & Technical Flows (WS3 Architecture Diagrams)

> **Reader Reference Guide (Standalone Guide & Companion Architecture Deck):** The step-by-step walkthroughs below document every Official Google Cloud Architecture Center (`#78`) diagram in **WS3**. Each diagram is self-contained in this guide (`Figure 1` above plus the supporting topology blueprints in `diagrams/`), and also corresponds 1:1 to **Act II (Slides 4–7)** of the companion 12-slide editable presentation deck (`presentations/ws3-*.pptx`, viewable in **Tab 2: Editable Architecture Decks** of the interactive portal): **(1) Slide 4 (`L1` Conceptual 3-Zone Trust Boundary Overview)** → **(2) Slide 5 (`L2` Authoritative `Figure 1` Official `#78` Physical Blueprint + 4-Zone Reference Sidebar)** → **(3) Slide 6 (`L3` 5-Actor Chronological Request Sequence)** → **(4) Slide 7 (`L4` 3-Stage Wire-Level JSON & Cryptographic Context Transformation)**.

### Diagram 7: Pattern B: Zero-Trust Sovereign Silos (VPC-SC, IAM PAB, CMEK Kill-Switch & Air-Gapped Gemma 3 on GKE) (`ws3-pattern-b-sovereign-silos-architecture`)
* **Workstream & Focus**: Workstream 3 • Pattern B: Zero-Trust Sovereign Silos Architecture (WS 3.1) (`PATTERN B • SOVEREIGN SILOS`)
* **Question Answered**: *How do we satisfy strict banking (OCC/FDIC), healthcare (HIPAA), and public-sector regulators that prohibit shared compute, shared storage, or provider-owned keys—while reusing 80% of our core ADK 2.0 agent codebase?*
* **Architectural & Business Outcome (Dedicated Single-Tenant GCP Project + Sub-60s Customer CMEK Kill-Switch (`HTTP 423`))**: Each regulated enterprise (FinVault Bank and RetailStream/MedCore) operates inside a physically isolated GCP project with its own VPC-SC perimeter and Cloud KMS key—where disabling the customer key halts all AI memory, DB reads, and inference with `HTTP 423 Locked`.

#### 4-Zone Hub-and-Spoke Architecture Summary (Rule 53G `hub-2-spoke`)
* **Blue Zone — 1. mTLS Ingress & IAM Principal Access Boundary**: Verifies client mTLS X.509 certificates at Hop 1, enforces IAM Principal Access Boundaries (PAB), and routes to the tenant’s dedicated silo project.
* **Green Zone — 2. VPC-SC Perimeter & CMEK Kill-Switch Monitor**: Enforces VPC Service Controls across 8 Google Cloud APIs, checks real-time Cloud KMS CMEK state at Hop 3, and logs Access Transparency events.
* **Yellow Zone — 3. FinVault Sovereign Silo Project (CMEK ENABLED)**: Dedicated project running air-gapped Gemma 3 (27B) on private GKE + Gemini 2.5 Pro (Dedicated PT) and CMEK-encrypted AlloyDB/BigQuery vault (`2 rows` returned).
* **Red Zone — 4. RetailStream / MedCore Silo (CMEK Kill-Switch)**: Demonstrates dual-silo parity and instant customer CMEK revocation: disabling the cryptoKeyVersion immediately locks the silo with `HTTP 423 Locked`.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Mutual TLS (mTLS) Certificate & OIDC Handshake** (*Enterprise Caller → Blue Zone*): Regulated enterprise callers connect over mutual TLS. Hop 1 verifies both the pinned client X.509 certificate fingerprint and the corporate OIDC token (`HTTP 401` on certificate mismatch). **(mTLS X.509 Client Certificate • Hop 1 Edge PEP)**
1. **Step ② — IAM Principal Access Boundary (PAB) Enforcement** (*Blue Zone (IAM PAB Gate)*): Google Cloud IAM evaluates the tenant’s Principal Access Boundary policy (`pab-finvault-silo-only`), mathematically preventing the principal from accessing any resource outside `cymbal-finvault-silo-prod` (`HTTP 403`). **(IAM Principal Access Boundary (PAB) • Zero Cross-Project Access)**
1. **Step ③ — Real-Time Cloud KMS CMEK State Verification** (*Green Zone (CMEK Heartbeat)*): At Hop 3, the runtime queries Cloud KMS (`finvault-silo-cmek` vs `medcore-revoked-cmek`) to verify that the customer’s encryption key is `ENABLED`. If the customer revoked their key, execution halts immediately with `HTTP 423 Locked`. **(Cloud KMS CMEK Heartbeat • Instant Kill-Switch (`HTTP 423`))**
1. **Step ④ — VPC Service Controls Perimeter & Silo Model Armor** (*Yellow / Red Zone (VPC-SC Fence)*): The request enters the tenant’s dedicated VPC Service Controls (VPC-SC) perimeter—which blocks all unauthorized egress to external GCP projects—and passes through dedicated OCC/HIPAA Model Armor filters. **(VPC Service Controls (VPC-SC) • Dedicated Model Armor)**
1. **Step ⑤ — Air-Gapped Gemma 3 on GKE or Provisioned Gemini** (*Yellow Zone (Dedicated Inference)*): FinVault runs inference inside its perimeter using either air-gapped Gemma 3 (27B) on private GKE (`--internal-ip`, CMEK boot disks) or dedicated Provisioned Throughput Gemini 2.5 Pro (`gemini-2.5-pro-dedicated`). **(Air-Gapped Gemma 3 27B on Private GKE • Provisioned Throughput)**
1. **Step ⑥ — CMEK Vault Decryption vs. Kill-Switch Lockout** (*Yellow (Open) vs Red (423 Locked)*): FinVault’s enabled CMEK decrypts `pattern_b_silo_finvault_cmek_vault` (returning 2 rows). In contrast, MedCore’s disabled CMEK key (`DESTROY_SCHEDULED` / `DISABLED`) blocks all storage and memory access with `HTTP 423 Locked`. **(CMEK BigQuery/AlloyDB Vault • Verified 6/6 Silo Security Suite)**
1. **Step ⑦ — In-Perimeter Response & Access Transparency Log** (*Silo Projects → Caller & Auditor*): Egress SDP scrubs the final payload inside the tenant project, returns the response over mTLS, and writes immutable Cloud KMS key-usage and VPC-SC audit logs for the customer’s SOC. **(Cloud Audit Logs • Access Transparency • SOC Attestation)**

> **Verified Architectural & Business Outcome (Dedicated Single-Tenant GCP Project + Sub-60s Customer CMEK Kill-Switch (`HTTP 423`)):** Each regulated enterprise (FinVault Bank and RetailStream/MedCore) operates inside a physically isolated GCP project with its own VPC-SC perimeter and Cloud KMS key—where disabling the customer key halts all AI memory, DB reads, and inference with `HTTP 423 Locked`. **(PATTERN B • SOVEREIGN SILOS)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: mTLS Ingress • IAM Principal Access Boundary (PAB) • VPC Service Controls (VPC-SC) • Cloud KMS CMEK • Vertex AI / Air-Gapped Gemma 3 on GKE • Dedicated AlloyDB & BigQuery
* **Architecture Summary**: Deploys the same 5-Hop governance engine inside a dedicated single-tenant Google Cloud project wrapped in a VPC Service Controls perimeter, IAM Principal Access Boundary, and customer-revocable Cloud KMS CMEK key.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Test 1: mTLS & OIDC Gate | External ALB mTLS & Hop 1 PEP (Blue Zone) | Validates the client’s X.509 mTLS certificate SHA-256 fingerprint against the tenant’s pinned certificate registry before minting the silo context. | verify_mtls_and_pab() • Client Cert Fingerprint Pinning | Verified Test 1: Spoofed or missing mTLS certs rejected with HTTP 401 |
| **Step ②** • Test 2: IAM PAB Isolation | Google Cloud IAM Principal Access Boundary (Blue Zone) | Binds an IAM v3 Principal Access Boundary policy restricting the workload identity principal strictly to resources inside `projects/cymbal-{tenant}-silo-prod`. | IAM PAB Policy (`pab-{tenant}-silo-only`) | Verified Test 2: Cross-project credential use blocked with HTTP 403 |
| **Step ③** • Test 3: VPC-SC Perimeter | Access Context Manager VPC-SC (Green Zone) | Wraps `aiplatform`, `alloydb`, `bigquery`, `storage`, `run`, `cloudkms`, `dlp`, and `logging` APIs inside a hard per-tenant VPC Service Controls perimeter. | google_access_context_manager_service_perimeter | Verified Test 3: Cross-project data exfiltration blocked by VPC-SC (403) |
| **Step ④** • Tests 4 & 5: CMEK Kill-Switch | Cloud KMS CryptoKey (`finvault-silo-cmek` / `medcore-revoked-cmek`) (Green Zone) | Performs a live Cloud KMS key-state check at Hop 3; disabling the key version immediately halts Memory Bank, AlloyDB, and Vertex AI with `HTTP 423 Locked`. | verify_cmek_key_active() • Cloud KMS Live Key Check | Verified Tests 4 & 5: Revocation triggers HTTP 423; re-enable restores 200 OK |
| **Step ⑤** • Air-Gapped GKE Inference | Private GKE (Gemma 3 27B) & Dedicated Vertex AI (Yellow Zone) | Executes open-weight Gemma 3 (27B) on private-node GKE (`enable_private_nodes = true`, no internet egress) with CMEK-encrypted node boot disks and L4/A100 GPUs. | Private Air-Gapped GKE Cluster & Dedicated PT Endpoints | Zero shared model weights or noisy-neighbor latency variance |
| **Step ⑥** • Test 6: Dual-Silo Parity | CMEK BigQuery & AlloyDB Vaults (Yellow & Red Zones) | Encrypts all customer tables (`pattern_b_silo_finvault_cmek_vault`) and agent memory under the tenant’s Cloud KMS key across both FinVault and RetailStream silos. | run_silo_security_tests.py (6/6 PASS — F-08 Certified) | Verified F-08: Both FinVault and RetailStream silos & kill-switches proven |
| **Step ⑦** • In-Silo Egress Redaction | Dedicated Model Armor & Cloud SDP (Yellow Zone) | Runs dedicated Model Armor and Sensitive Data Protection templates inside the tenant project so unredacted prompts never cross project boundaries. | In-Project Model Armor & SDP Inspection | 100% data residency within the customer’s dedicated GCP project |
| **Cost & Audit** • Silo Billing & KMS Audit | Cloud Billing, Cloud Audit Logs & BigQuery (Green Zone) | Exports project-level Cloud Billing records and immutable KMS `Decrypt` audit logs directly to the tenant’s compliance sink (600 RPM Silo baseline tier). | Per-Project Billing Attribution & KMS Audit Trail | Complete physical, cryptographic, and financial isolation for auditors |

### Diagram 8: Pattern B Provisioning Topology: Org → Per-Tenant Silo Projects, VPC-SC Perimeters, IAM PAB & Cloud KMS CMEK Keys (`ws3-multi-project-silo-and-cmek-setup-topology`)
* **Workstream & Focus**: Workstream 3 • Pattern B: Automated Multi-Project Silo & CMEK Provisioning Pipeline (WS 3.2) (`PATTERN B • SILO FACTORY PIPELINE`)
* **Question Answered**: *How do we automate the 4-stage onboarding of regulated Pattern B customers—provisioning a dedicated GCP project, Cloud KMS CMEK key ring, IAM Principal Access Boundary, and VPC Service Controls perimeter—without manual toil?*
* **Architectural & Business Outcome (Automated 4-Stage Silo Onboarding Factory with Built-In Kill-Switch Certification)**: When a regulated enterprise signs a Pattern B contract, the Silo Factory automatically creates their dedicated GCP project, provisions their 90-day rotating CMEK key, locks the VPC-SC perimeter, and runs the 6-point kill-switch drill.

#### 4-Zone Hub-and-Spoke Architecture Summary (Rule 53G `hub-2-spoke`)
* **Blue Zone — 1. Stage 1: Project Creation & API Enablement**: Creates `cymbal-{tenant}-silo-prod` under the enterprise folder and enables Vertex AI, AlloyDB, BigQuery, Cloud KMS, and VPC-SC APIs.
* **Green Zone — 2. Stage 2: Cloud KMS Key Ring & CMEK Binding**: Provisions the tenant’s dedicated Cloud KMS key ring and 90-day rotating cryptoKey, granting `cryptoKeyEncrypterDecrypter` strictly to silo service agents.
* **Yellow Zone — 3. Stage 3: IAM PAB & VPC-SC Perimeter Lock**: Attaches the IAM Principal Access Boundary policy and wraps the project inside an enforced VPC Service Controls service perimeter.
* **Red Zone — 4. Stage 4: 6-Point Compliance & Kill-Switch Gate**: Executes `run_silo_security_tests.py` (Tests 1–6) to verify mTLS, PAB, VPC-SC exfiltration blocking, and sub-60s CMEK revocation (`HTTP 423`).

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Dedicated GCP Project & Service Account Creation** (*Platform Admin → Blue Zone (Stage 1)*): Stage 1 invokes Cloud Resource Manager to create a dedicated single-tenant GCP project (`cymbal-finvault-silo-prod`), links the enterprise billing account, and creates isolated workload identity service accounts. **(Stage 1 • Cloud Resource Manager & Isolated IAM)**
1. **Step ② — Enabling Core AI, Data & Security APIs** (*Blue Zone (Stage 1 APIs)*): The pipeline enables the required Google Cloud APIs (`aiplatform`, `alloydb`, `bigquery`, `cloudkms`, `accesscontextmanager`, `modelarmor`, `dlp`, `container`) inside the newly created tenant project. **(Stage 1 • Automated Google Cloud Service Enablement)**
1. **Step ③ — Provisioning 90-Day Rotating Cloud KMS CMEK** (*Green Zone (Stage 2 CMEK)*): Stage 2 creates the tenant’s dedicated key ring and `agent-memory-cmek` cryptoKey with automatic 90-day rotation, binding IAM so only that tenant’s Vertex AI, AlloyDB, and BigQuery service agents can decrypt. **(Stage 2 • Cloud KMS (`finvault-silo-cmek`, 90d rotation))**
1. **Step ④ — Binding IAM Principal Access Boundary (PAB)** (*Yellow Zone (Stage 3 PAB)*): Stage 3 creates and binds an Organization IAM Principal Access Boundary policy that restricts all credentials issued in the silo strictly to resources owned by `cymbal-finvault-silo-prod`. **(Stage 3a • IAM Principal Access Boundary Policy)**
1. **Step ⑤ — Enforcing the VPC Service Controls Perimeter** (*Yellow Zone (Stage 3 VPC-SC)*): Stage 3 wraps the project in a VPC Service Controls perimeter (`restrictedServices`: Vertex AI, BigQuery, AlloyDB, GCS, KMS) with context-aware ingress rules requiring mTLS and verified corporate IPs. **(Stage 3b • Access Context Manager VPC-SC Perimeter)**
1. **Step ⑥ — Deploying CMEK-Encrypted Data & AI Workloads** (*Red Zone (Stage 4 Workloads)*): The pipeline provisions the CMEK-encrypted BigQuery/AlloyDB vault (`pattern_b_silo_finvault_cmek_vault`) and deploys the private GKE / Vertex AI Agent Engine runtime bound to the customer’s key. **(Stage 4a • CMEK-Bound BigQuery, AlloyDB & Private GKE)**
1. **Step ⑦ — Executing the 6-Point Kill-Switch Certification** (*Red Zone → CISO Attestation*): Finally, Stage 4 runs `run_silo_security_tests.py`—testing mTLS rejection (`401`), PAB isolation (`403`), VPC-SC exfiltration block (`403`), and live CMEK disable/re-enable (`423` → `200`) before issuing the CISO readiness receipt. **(Stage 4b • 6/6 Sovereign Security Certification Gate)**

> **Verified Architectural & Business Outcome (Automated 4-Stage Silo Onboarding Factory with Built-In Kill-Switch Certification):** When a regulated enterprise signs a Pattern B contract, the Silo Factory automatically creates their dedicated GCP project, provisions their 90-day rotating CMEK key, locks the VPC-SC perimeter, and runs the 6-point kill-switch drill. **(PATTERN B • SILO FACTORY PIPELINE)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Cloud Resource Manager • Cloud KMS (90-Day Rotation) • IAM Principal Access Boundary • Access Context Manager (VPC-SC) • Vertex AI • BigQuery CMEK
* **Architecture Summary**: Automates tenant silo onboarding across 4 deterministic stages: (1) Project & API Activation, (2) Cloud KMS CMEK Provisioning, (3) IAM PAB & VPC-SC Perimeter Binding, and (4) 6-Test Live Compliance Certification.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Stage 1a: Project Factory | Cloud Resource Manager API (Blue Zone) | Creates a dedicated GCP project per regulated tenant (`cymbal-{tenant}-silo-prod`) under the isolated Sovereign Silos organizational folder. | gcloud projects create & Dedicated Billing Link | 100% physical project, quota, and IAM blast-radius separation |
| **Step ②** • Stage 1b: Service Agents | Service Usage & IAM Service Identities (Blue Zone) | Enables the 8 core Google Cloud APIs and materializes per-project Google-managed service agents (`service-{project_number}@...`) for CMEK binding. | Automated Service Identity Provisioning | Zero shared service accounts across regulated customer silos |
| **Step ③** • Stage 2: KMS CMEK Setup | Cloud KMS (`cymbal-multi-tenant-kr`) (Green Zone) | Creates `finvault-silo-cmek` (ENABLED) and `medcore-revoked-cmek` (DISABLED) with 90-day rotation and binds `roles/cloudkms.cryptoKeyEncrypterDecrypter`. | workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md | Customer retains cryptographic custody and instant revocation control |
| **Step ④** • Stage 3a: IAM PAB Binding | IAM v3 Principal Access Boundary (Yellow Zone) | Creates an eligible-resources PAB rule scoping the tenant’s Workload Identity Pool strictly to their dedicated silo project number. | gcloud iam principal-access-boundary-policies | Mathematically neutralizes stolen-credential lateral movement |
| **Step ⑤** • Stage 3b: VPC-SC Perimeter | Access Context Manager (`ServicePerimeter`) (Yellow Zone) | Locks down restricted Google Cloud APIs inside the tenant perimeter and blocks `gsutil cp` or `bq cp` to any external project. | VPC-SC Perimeter Policy & Ingress/Egress Rules | Prevents data exfiltration even by an insider with project access |
| **Step ⑥** • Stage 4a: CMEK Data Vault | BigQuery CMEK (`pattern_b_silo_finvault_cmek_vault`) (Red Zone) | Provisions the tenant’s dedicated BigQuery and AlloyDB tables with `kms_key_name` pinned to the tenant’s Cloud KMS key. | CMEK-Bound BigQuery & AlloyDB Storage Engine | Every byte at rest is encrypted under the tenant’s specific KMS key |
| **Step ⑦** • Stage 4b: 6-Test Gate | Sovereign Security Test Suite (Red & Blue Zones) | Runs all 6 automated sovereign compliance assertions (mTLS, PAB, VPC-SC, FinVault CMEK kill-switch, recovery, and RetailStream silo parity). | run_silo_security_tests.py (6/6 PASS) | Hands enterprise CISOs a verifiable, timestamped compliance receipt |
| **Cost & Audit** • Access Transparency Log | Cloud Audit Logs & BigQuery FinOps (Green Zone) | Streams all KMS key-state transitions (`ENABLED` ↔ `DISABLED`) and VPC-SC audit events into the tenant’s dedicated compliance ledger. | Immutable Silo Audit & FinOps Ledger | Full OCC, FDIC, HIPAA, and GDPR audit readiness from day one |

### Diagram 9: Terraform Blueprint Resource Graph: Provider → Cloud KMS CMEK → VPC-SC Perimeter → Sovereign VPC → Private Air-Gapped GKE (Gemma 3) (`ws3-terraform-silo-blueprint-resource-graph`)
* **Workstream & Focus**: Workstream 3 • Pattern B: 1-Click Terraform Sovereign Silo Blueprint Graph (WS 3.6) (`PATTERN B • TERRAFORM SILO DAG`)
* **Question Answered**: *How do we codify the entire Pattern B Sovereign Silo—Cloud KMS CMEK, VPC Service Controls perimeter, isolated VPC, and private air-gapped GKE cluster running Gemma 3—into a single reusable Terraform module?*
* **Architectural & Business Outcome (Auditor-Certified Terraform DAG for Air-Gapped Sovereign Silos)**: Parameterized by just five input variables (`tenant_id`, `tenant_project_id`, `org_id`, `access_policy_id`, `region`), one `terraform apply` builds a complete CMEK-encrypted, VPC-SC-fenced sovereign silo with private GKE compute.

#### 4-Zone Hub-and-Spoke Architecture Summary (Rule 53G `hub-2-spoke`)
* **Blue Zone — 1. Tier 1 DAG: Provider & Cloud KMS CMEK**: Configures the Google provider for `tenant_project_id` and creates `google_kms_key_ring` + 90-day rotating `google_kms_crypto_key`.
* **Green Zone — 2. Tier 2 DAG: VPC Service Controls Perimeter**: Provisions `google_access_context_manager_service_perimeter`, fencing 8 core Google Cloud APIs inside the tenant project.
* **Yellow Zone — 3. Tier 3 DAG: Sovereign VPC & Private Subnet**: Creates `google_compute_network` and `10.20.0.0/20` subnet with `private_ip_google_access = true` and zero public internet routes.
* **Red Zone — 4. Tier 4 DAG: Air-Gapped Private GKE (Gemma 3)**: Deploys `google_container_cluster` (`enable_private_nodes = true`, `enable_private_endpoint = true`) with boot disks encrypted by the tenant CMEK.

#### Part A — Agentic Flow: Step-by-Step Architectural Walkthrough (Steps ①–⑦)
1. **Step ① — Parameterizing the 5-Variable Silo Module** (*Terraform CLI → Blue Zone*): Engineers populate `tenant_id`, `tenant_project_id`, `org_id`, `access_policy_id`, and `region` in `terraform.tfvars` to instantiate an auditor-certified Pattern B silo. **(3.6-terraform-silo-blueprint/variables.tf & tfvars)**
1. **Step ② — Provisioning the Tenant Cloud KMS Key Ring & CMEK** (*Blue Zone (Cryptographic Root)*): Terraform first creates `google_kms_key_ring.silo_keyring` and `google_kms_crypto_key.agent_cmek` (`rotation_period = "7776000s"`), establishing the customer’s cryptographic root of trust before any storage or compute is created. **(google_kms_key_ring & google_kms_crypto_key (CMEK Root))**
1. **Step ③ — Locking the VPC Service Controls Perimeter** (*Green Zone (Data Perimeter)*): Next, Terraform provisions `google_access_context_manager_service_perimeter.silo_perimeter`, locking `aiplatform`, `alloydb`, `bigquery`, `storage`, `run`, `cloudkms`, `dlp`, and `logging` inside the tenant project. **(google_access_context_manager_service_perimeter (VPC-SC))**
1. **Step ④ — Building the Zero-Internet Sovereign VPC** (*Yellow Zone (Isolated Network)*): Terraform creates `google_compute_network.silo_vpc` (`auto_create_subnetworks = false`) and `google_compute_subnetwork.silo_subnet` (`10.20.0.0/20`) with Private Google Access enabled so traffic never traverses the public internet. **(google_compute_network & subnetwork (`10.20.0.0/20`))**
1. **Step ⑤ — Deploying Private GKE Cluster with CMEK Disks** (*Red Zone (Air-Gapped Compute)*): With the KMS key and VPC ready, Terraform provisions `google_container_cluster.gemma3_airgapped_cluster` with private nodes, private master endpoint (`172.16.0.0/28`), Workload Identity, and CMEK-encrypted PD-SSD boot disks. **(google_container_cluster (Air-Gapped Gemma 3 27B))**
1. **Step ⑥ — Binding CMEK to BigQuery & AlloyDB Storage** (*Red Zone (CMEK Data Vault)*): Every tenant dataset and table (`pattern_b_silo_finvault_cmek_vault`) is provisioned with `default_encryption_configuration` bound to `google_kms_crypto_key.agent_cmek.id`. **(CMEK-Encrypted BigQuery & AlloyDB Vaults)**
1. **Step ⑦ — Verifying Zero Drift & Kill-Switch Readiness** (*All Zones → Compliance Gate*): Terraform outputs the CMEK key URI and VPC-SC perimeter name, and runs the 6-test sovereign security suite to prove that disabling the CMEK key halts the entire silo with `HTTP 423 Locked`. **(Terraform Outputs • 6/6 Sovereign Kill-Switch Verification)**

> **Verified Architectural & Business Outcome (Auditor-Certified Terraform DAG for Air-Gapped Sovereign Silos):** Parameterized by just five input variables (`tenant_id`, `tenant_project_id`, `org_id`, `access_policy_id`, `region`), one `terraform apply` builds a complete CMEK-encrypted, VPC-SC-fenced sovereign silo with private GKE compute. **(PATTERN B • TERRAFORM SILO DAG)**

#### Part B — Component Architecture & Technical Flow Specification
* **Google Cloud Services Used**: Terraform Google Provider • Cloud KMS CMEK • Access Context Manager (VPC-SC) • Sovereign VPC (`Private Google Access`) • Private GKE (`Gemma 3 27B`)
* **Architecture Summary**: Codifies the Pattern B sovereign enclave as a 5-variable Terraform module that provisions the Cloud KMS CMEK key, VPC-SC service perimeter, isolated VPC, and air-gapped private GKE cluster in strict dependency order.

| Step & Stage | Google Cloud Service (Zone) | Architectural Mechanism & Protocol | Security & Isolation Control | Verified Production Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Step ①** • Tier 0: Module Inputs | Terraform Silo Blueprint (`variables.tf`) (Blue Zone) | Accepts 5 strongly-typed variables (`tenant_id`, `tenant_project_id`, `org_id`, `access_policy_id`, `region`) to stamp out identical sovereign enclaves. | workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/variables.tf | 100% deterministic, repeatable sovereign project deployments |
| **Step ②** • Tier 1: Cloud KMS CMEK | Cloud KMS (`google_kms_crypto_key.agent_cmek`) (Blue Zone) | Provisions the tenant’s dedicated encryption key with a 90-day rotation schedule (`7776000s`) and outputs `cmek_key_uri` for downstream resources. | main.tf • google_kms_crypto_key.agent_cmek | Establishes the customer-controlled cryptographic kill-switch first |
| **Step ③** • Tier 2: VPC-SC Perimeter | Access Context Manager (`silo_perimeter`) (Green Zone) | Enforces a hard project boundary around 8 restricted Google Cloud APIs so data cannot be exfiltrated to external buckets or datasets. | main.tf • google_access_context_manager_service_perimeter | Blocks cross-project API data movement at the organization policy layer |
| **Step ④** • Tier 3: Sovereign VPC | Cloud VPC (`silo_vpc` / `10.20.0.0/20`) (Yellow Zone) | Creates a custom-mode VPC network and regional subnet with `private_ip_google_access = true` so all Google API traffic stays on Google’s internal backbone. | main.tf • google_compute_network & google_compute_subnetwork | Zero public IP exposure for internal agent and model traffic |
| **Step ⑤** • Tier 4: Air-Gapped GKE | Google Kubernetes Engine (`gemma3_airgapped_cluster`) (Red Zone) | Provisions a private GKE cluster (`enable_private_nodes = true`, `enable_private_endpoint = true`) with `boot_disk_kms_key` bound to the tenant’s CMEK. | main.tf • google_container_cluster.gemma3_airgapped_cluster | Hosts air-gapped Gemma 3 (27B) on CMEK-encrypted GPU node pools |
| **Step ⑥** • Tier 5: CMEK Data Binding | BigQuery & AlloyDB CMEK Vaults (Red Zone) | Attaches the tenant’s KMS key URI to BigQuery datasets (`pattern_b_silo_finvault_cmek_vault`), AlloyDB clusters, and Vertex AI Memory Bank. | Mandatory CMEK Storage Encryption Binding | Disabling the KMS key immediately renders all silo storage unreadable (423) |
| **Step ⑦** • Post-Apply Silo Audit | 6-Test Sovereign Security Suite (Blue & Green Zones) | Executes `run_silo_security_tests.py` to validate mTLS, PAB, VPC-SC, and live CMEK revocation/restoration across FinVault and RetailStream. | run_silo_security_tests.py (6/6 PASS) | Zero configuration drift; verified ready for regulated workloads |
| **Cost & Audit** • Regulatory Evidence Pack | Terraform State & Cloud Audit Logs (Green Zone) | Provides immutable Infrastructure-as-Code lineage and Cloud Audit Logs proving to OCC, HIPAA, and SOC2 auditors that every control is enforced. | workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/README.md | Accelerates enterprise security sign-off from months to days |

<!-- E2E_FLOW_END -->
