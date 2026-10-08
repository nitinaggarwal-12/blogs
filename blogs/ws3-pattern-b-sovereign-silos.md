---
title: "Sovereign Silos for Regulated Agentic AI: One Project, One Perimeter, One Key per Tenant"
subtitle: "How Pattern B wraps the reusable 5-Hop Cymbal agent core in VPC Service Controls, IAM Principal Access Boundaries, a Cloud KMS CMEK kill-switch, and air-gapped Gemma 3 on GKE"
series: "Multi-Tenant Agentic AI on Google Cloud — Workstream 3 of 5"
workstream: "Workstream 3 • Milestone 2 (Weeks 4–7) • Pattern B — Sovereign Silos"
authors: "Google Cloud Forward Deployed Engineering (FDE) & AI Platform Architecture Team"
target_audience: "Principal Architects, CISOs, and Compliance Leads in FinTech, Healthcare, and other regulated industries"
reading_time: "14 min read"
tags: ["Sovereign Cloud", "VPC Service Controls", "Principal Access Boundary", "Cloud KMS CMEK", "Gemma 3", "GKE", "GEAP", "ADK 2.0", "Zero Trust", "Multi-Tenancy"]
canonical_architecture: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system"
diagrams: ["ws3-pattern-b-sovereign-silos-architecture"]
editable_slides: "slides/ws3-pattern-b-siloed-editable-slides.pptx"
status: "PUBLISH_READY"
---

# Sovereign Silos for Regulated Agentic AI: One Project, One Perimeter, One Key per Tenant

> **Executive TL;DR**
> - **The mandate**: Pooled multi-tenancy (Pattern A) satisfies most B2B SaaS tiers, but OCC/FDIC/DORA-regulated banks, HIPAA healthcare providers, and public-sector buyers frequently prohibit shared compute pools and shared database clusters outright. They want a dedicated blast radius, a hard network perimeter, and an encryption key *they* can revoke.
> - **The pattern**: **Pattern B (Sovereign Silos)** keeps the **80% reusable 5-Hop core** (`core-cymbal-agent/`) unchanged and adds a **20% sovereign infrastructure delta** per tenant project — `cymbal-finvault-silo-prod` and `cymbal-retailstream-silo-prod` — consisting of mTLS SPIFFE pinning, an organization **IAM Principal Access Boundary (PAB)**, a **VPC Service Controls (VPC-SC)** perimeter, a **Cloud KMS CMEK** kill-switch that returns `HTTP 423 KMS_KEY_DISABLED`, and optional air-gapped **Gemma 3 (27B IT)** on private GKE.
> - **The evidence**: All **6 automated Sovereign Silo security tests** in [`run_silo_security_tests.py`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py) pass — `401`, `403`, `403`, `423`, `200` (air-gapped), and RetailStream parity — and the four control domains carry a formal VPC-SC sign-off from GCP Security and GEAP Product Engineering.
> - **The trade**: Zero noisy neighbours and simple per-project quota accounting in exchange for a higher per-tenant infrastructure floor and multi-project lifecycle management. Workstream 4 shows how to blend both worlds.

---

## 1. When Pooled Isolation Is Not Enough: The Regulatory Drivers

In Workstream 2 we showed how Pattern A serves competing tenants from one shared GEAP Agent Runtime using the **5-Hop Cryptographic Context Chain** — logical isolation (RLS, tenant-prefixed memory, `before_agent_callback` tool pruning) backed by envelope CMEK for Enterprise namespaces. For most SaaS workloads, that is the right economic answer: shared `ContextCacheConfig` prefix caching alone yields up to **90% COGS savings**.

But the Cymbal anchor case study includes two tenants whose auditors ask a different question — not *"is my data logically separated?"* but *"can you prove that no other customer's workload could ever touch my compute, my storage, or my key?"* As documented in [3.1 Case Study & Solution Architecture](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md), those mandates fall into four buckets:

| Regulatory Driver | Typical Source | What It Rules Out | Pattern B Answer |
| :--- | :--- | :--- | :--- |
| **Zero physical blast radius & dedicated quotas** | OCC/FDIC, DORA, PCI Level-1 | Shared runtime, shared AlloyDB cluster, shared API quotas | Dedicated GCP project per tenant inside its own VPC-SC perimeter |
| **Customer-controlled cryptographic kill-switch** | Data-residency and right-to-erasure clauses | Platform-owned encryption keys | Tenant-owned Cloud KMS (or Cloud EKM) key; revocation halts everything with `HTTP 423` |
| **Hard identity boundary** | Insider-threat and credential-replay controls | Cross-project IAM drift | Organization-level IAM Principal Access Boundary pinned to one project |
| **No calls to multi-tenant model endpoints** | Core-banking / wire-settlement log policies | Shared regional Gemini endpoints | Air-gapped Gemma 3 (27B IT) on private GKE, zero public egress |

For **FinVault Bank** (Enterprise tier, Google Workspace + Jira, Google OIDC) and **RetailStream Corp** (Standard tier, Microsoft 365 + ServiceNow, Microsoft Entra ID), Cymbal therefore provisions a *sovereign silo* each — without forking the agent codebase.

---

## 2. The Sovereign Silo Model

Pattern B is best understood as a thin infrastructure shell around an unchanged core. The [`PatternBSiloedService`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py) wraps `CymbalMultiTenantRuntime` and evaluates three sovereign checks *before* the core 5-Hop pipeline runs, while Hop 3 picks up the fourth (CMEK state) from the tenant profile's `silo_cmek_key_uri`.

| Building Block | FinVault Bank (Tenant A) | RetailStream Corp (Tenant B) |
| :--- | :--- | :--- |
| **Dedicated project** | `cymbal-finvault-silo-prod` | `cymbal-retailstream-silo-prod` |
| **VPC-SC perimeter** | `perimeter_finvault_sovereign` | `perimeter_retailstream_sovereign` |
| **mTLS SPIFFE ID pinned at ingress** | `spiffe://finvault.com/ns/sre/sa/agent-client` | `spiffe://retailstream.com/ns/itom/sa/agent-client` |
| **IAM PAB policy** | `finvault-sovereign-pab` → `//cloudresourcemanager.googleapis.com/projects/cymbal-finvault-silo-prod` | Equivalent PAB scoped to `cymbal-retailstream-silo-prod` |
| **CMEK key (kill-switch)** | `projects/cymbal-finvault-silo-prod/locations/us-central1/keyRings/finvault-kr/cryptoKeys/agent-memory-cmek` | `projects/cymbal-retailstream-silo-prod/locations/us-central1/keyRings/retailstream-kr/cryptoKeys/agent-memory-cmek` |
| **Data & memory plane** | Dedicated CMEK AlloyDB + 5-Level Memory Bank + BigQuery audit | Dedicated CMEK AlloyDB + 5-Level Memory Bank + BigQuery audit |
| **Runtime & model** | Dedicated GEAP Runtime + Agent Alpha; air-gapped `gemma-3-27b-it-vllm` on private GKE | Dedicated GEAP Runtime running Gemini 2.5 Pro with Provisioned Throughput |
| **Tool plane** | Local silo MCP: Google Workspace / Jira (3LO Google OIDC) | Local silo MCP: SharePoint / ServiceNow (3LO Microsoft Entra ID) |

Two design decisions matter here. First, the **perimeter protects the APIs, not just the network**: `aiplatform.googleapis.com`, `discoveryengine.googleapis.com`, `modelarmor.googleapis.com`, `alloydb.googleapis.com`, `storage.googleapis.com`, and `bigquery.googleapis.com` are all restricted services, so even a compromised MCP tool with valid credentials cannot write to a project outside the perimeter. Second, the **key is the kill-switch**: because the GEAP Memory Bank, AlloyDB, GKE persistent disks, and BigQuery tables all depend on the tenant's `agent-memory-cmek`, disabling one key version is sufficient to stop every in-flight and queued agent turn.

---

## 3. Figure 1 — Pattern B Architecture Walkthrough

![Figure 1 — Pattern B: Zero-Trust Sovereign Silos (VPC-SC, IAM PAB, CMEK Kill-Switch & Air-Gapped Gemma 3 on GKE)](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.png)

*Figure 1 — Multi-project sovereign topology: a central mTLS routing and governance hub fronting two dedicated tenant silos, each wrapped in its own PAB + VPC-SC perimeter with a CMEK kill-switch. Editable: [Draw.io](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio) • [Slides (.pptx)](../slides/ws3-pattern-b-siloed-editable-slides.pptx) • [Cloud Architecture Center SVG](../diagrams/ws3-pattern-b-sovereign-silos-architecture.svg) • [Vision AST](../diagrams/vision_metadata/ws3-pattern-b-sovereign-silos-architecture.vision.json)*

### Reading Figure 1

Read the diagram top-down, following the numbered step badges **1 → 7**.

1. **Outer Google Cloud frame and actors.** Above the frame sit the **mTLS SPIFFE Clients FinVault & RetailStream**. Badge **1 — mTLS Request** enters the platform; badge **7 — Silo Response** returns alongside it. Everything below lives inside the **Multi-Project Sovereign Topology (80% Core 5-Hop Pipeline + 20% Sovereign VPC-SC / PAB / CMEK Delta)** wrapper, which in turn contains the **Central mTLS Routing & Governance Hub VPC**.
2. **Routing hub (left, blue).** The **Central mTLS & SPIFFE Routing Hub** holds three stacked edge cards — **Cloud Armor & mTLS X.509 SPIFFE Cert Pinning** (*Verify client SPIFFE SAN*), **Model Armor Edge Prompt & DDoS Filter** (*Sanitize prompt*), and **IAM PAB Verifier** (*Enforce org PAB policy*) — feeding the **External Application Load Balancer** and the **Sovereign Hub Router Routes to Dedicated Silo** card. Badge **2 — mTLS Valid** marks a successful handshake; the paired badge **7 — 200 / 423** shows the two legitimate outcomes a silo can return.
3. **Central governance hub (right, green).** The **Cloud KMS CMEK & Sovereign Security Hub** stacks **Security Command Center**, the **Cloud KMS / EKM Key**, and the **Silo Security Suite 6/6 Sovereign Tests PASS** card. A dashed governance line labelled **CMEK state & VPC-SC audit monitoring** drops from this hub into both silos — this is the control-plane signal that lets Hop 3 refuse work the instant a key is disabled.
4. **Trunk.** Badge **3 — Route to isolated VPC-SC tenant project** carries the request from the hub router down into the correct silo; the return trunk carries badge **7 — Sovereign response (or HTTP 423 Locked)**.
5. **Left spoke (yellow) — FinVault.** The **PAB + VPC-SC Perimeter Alpha • Project: cymbal-finvault-silo-prod** wrapper encloses **Tenant A Silo (FinVault Bank)**. Inside, **Model Armor** runs badge **4 — Sanitize request** and badge **6 — Sanitize response**; the **Agent Runtime** is annotated **Private GKE Zero Egress**; **Local Silo MCP** carries **CMEK Kill-Switch HTTP 423 Ready**; **Gemma 3 (27B) GKE** performs badge **5 — Air-gapped inference**; and the **CMEK Datastore Dedicated AlloyDB & Memory** card anchors the data plane.
6. **Right spoke (red) — RetailStream.** The **PAB + VPC-SC Perimeter Beta • Project: cymbal-retailstream-silo-prod** wrapper encloses **Tenant B Silo (RetailStream)**. The same five-card layout appears, with two deliberate differences: the model card reads **Gemini 2.5 Pro PT** (dedicated Provisioned Throughput rather than air-gapped GKE) and the tool card reads **Local Silo MCP Entra SharePoint & SNOW**. The runtime is annotated **VPC-SC Bound Secure RAG**, and the datastore is again **CMEK Datastore Dedicated AlloyDB & Memory** with its own **CMEK Kill-Switch HTTP 423 Ready** label.

The visual takeaway for a CISO: the two spokes are structurally identical (same core code, same card layout), while the wrappers around them are the only thing that differs per tenant — and nothing in one wrapper can be addressed from the other.

---

## 4. The 5-Hop Chain as Applied in Pattern B

The 5-Hop pipeline in `core-cymbal-agent/governance/` runs unchanged inside each silo; Pattern B only changes *where* it runs and *which* key and identity it is bound to.

### Hop 1 — Edge Identity & Token Exchange PEP

[`hop1_edge_identity_pep.py`](../core-cymbal-agent/governance/hop1_edge_identity_pep.py) still strips forged `X-Tenant-ID` / `X-Cymbal-Tier` headers, verifies the upstream IdP JWT (Google Workspace OIDC for FinVault, Microsoft Entra ID for RetailStream), and performs an RFC 8693 On-Behalf-Of exchange bound to a DPoP (RFC 9449) `jkt` thumbprint. In Pattern B this runs *after* mTLS SPIFFE pinning at the silo ingress and mints the context with `IsolationTopology.PATTERN_B_SILOED`, so every downstream hop knows it is in sovereign mode.

### Hop 2 — Registry PDP & ADK `before_agent_callback` Tool Pruning

[`hop2_registry_pdp_callbacks.py`](../core-cymbal-agent/governance/hop2_registry_pdp_callbacks.py) filters the GEAP Agent Registry and ARD catalog by cryptographic tenant label and blocks direct cross-tenant invocations with `403 Forbidden`. Inside a silo this becomes defence-in-depth: even if the PDP allowed RetailStream to see FinVault's private Agent Alpha, the IAM PAB and VPC-SC perimeter would still make the call physically unreachable.

### Hop 3 — Compute Plane, 5-Level Memory Bank & the CMEK Kill-Switch

[`hop3_compute_finops_bulkhead.py`](../core-cymbal-agent/governance/hop3_compute_finops_bulkhead.py) binds the immutable `temp:tenant_id` inside the gVisor sandbox, loads per-tenant prompts and thinking budgets (8,000 tokens for FinVault, 4,000 for RetailStream), and keys the 5-Level Memory Bank by `{tenant}:{user}:{session}`. The Pattern B delta is a single resolution step: when the topology is `PATTERN_B_SILOED`, the effective key is the profile's `silo_cmek_key_uri`. If that key is in the disabled set, `enforce_compute_and_finops` returns a `DENY` with `status_code=423` and the detail `KMS_KEY_DISABLED` *before* any Memory Bank read, write, or model invocation.

### Hop 4 — Vertex AI Model Armor & Semantic NLCs

[`hop4_model_armor_guardrails.py`](../core-cymbal-agent/governance/hop4_model_armor_guardrails.py) screens ingress prompts for injection, jailbreaks, cache-extraction, and RLS-bypass payloads; enforces tenant NLCs (for example, blocking attempts to suppress FinVault's OCC/FDIC escalation); and redacts egress with tenant-specific Sensitive Data Protection detectors (IBAN/SWIFT for FinVault, PAN for RetailStream). In Figure 1 this is the per-silo **Model Armor** card running steps **4** and **6**, and `modelarmor.googleapis.com` is itself a VPC-SC restricted service.

### Hop 5 — AlloyDB RLS, 2LO/3LO Tool Auth & BigQuery OTel Audit

[`hop5_data_rls_and_otel.py`](../core-cymbal-agent/governance/hop5_data_rls_and_otel.py) sets `SET LOCAL app.current_tenant` on every AlloyDB transaction, brokers 2LO telemetry and 3LO Workspace/Jira or Entra ID SharePoint/ServiceNow tokens through `CymbalMCPHub`, and emits OpenTelemetry audit traces to BigQuery. In Pattern B the AlloyDB cluster and BigQuery dataset are dedicated and CMEK-encrypted, so RLS becomes belt-and-braces rather than the primary isolation control — and the OTel traces land inside the tenant's own perimeter.

---

## 5. The Exfiltration & CMEK Revocation Test Suite (3.5)

Every sovereign claim above is exercised by [`run_silo_security_tests.py`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py), which drives `PatternBSiloedService` through both tenants:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py
```

| Test | Sovereign Control | Scenario | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 1** | mTLS SPIFFE pinning | RetailStream SPIFFE ID presented to `cymbal-finvault-silo-prod` | `401 MTLS_CERTIFICATE_MISMATCH` | `PASS` |
| **TEST 2** | IAM Principal Access Boundary | FinVault principal targets `cymbal-retailstream-silo-prod` | `403 PAB_BOUNDARY_VIOLATION` | `PASS` |
| **TEST 3** | VPC-SC perimeter | Agent attempts to export wire-settlement logs to `external-attacker-exfil-proj` | `403 VPC_SERVICE_CONTROLS_PERMISSION_DENIED` from `perimeter_finvault_sovereign` | `PASS` |
| **TEST 4A** | Cloud KMS CMEK kill-switch | `revoke_tenant_cmek("finvault")`, then query the Memory Bank | `423 Locked`, reason contains `KMS_KEY_DISABLED` | `PASS` |
| **TEST 4B & 5** | CMEK restore + air-gapped Gemma 3 | `restore_tenant_cmek("finvault")`, run with `use_airgapped_gemma3_on_gke=True` | `200 ALLOW`; response prefixed `[AirGapped-GKE-Gemma3-27B • Perimeter=perimeter_finvault_sovereign]` | `PASS` |
| **TEST 6** | RetailStream silo parity | Revoke and restore `retailstream-kr/agent-memory-cmek` on the shared diagnostic agent | `423` halt, then `200` with `runtime_config.cmek_key_uri` matching the restored key | `PASS` |

The suite ends with `ALL 6 PATTERN B (SOVEREIGN SILOS) SECURITY TESTS PASSED (100% VERIFIED)` — the same result shown on the **Silo Security Suite 6/6 Sovereign Tests PASS** card in Figure 1. Note that the order is deliberate: the three perimeter tests fail *fast* at ingress, while the CMEK tests prove that revocation also stops a request that has already passed mTLS, PAB, and VPC-SC checks.

---

## 6. Standing Up the Silos: Multi-Project & CMEK Setup (3.2) and VPC-SC Sign-Off (3.4)

[3.2 Multi-Project Silo & CMEK Setup](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md) is the runbook for the 20% delta. Its sequence is short enough to hold in your head:

1. **Create the two projects** under the organization, link billing, and enable `aiplatform`, `discoveryengine`, `modelarmor`, `container`, `cloudkms`, `alloydb`, and `accesscontextmanager` APIs in each.
2. **Create a per-tenant key ring and key** — `finvault-kr/agent-memory-cmek` in `us-central1` with a `7776000s` (90-day) rotation period — and grant the Vertex AI service agent `roles/cloudkms.cryptoKeyEncrypterDecrypter` on it.
3. **Bind the IAM Principal Access Boundary** — `finvault-sovereign-pab` at the organization level, with a single `ALLOW` rule whose only resource is `//cloudresourcemanager.googleapis.com/projects/cymbal-finvault-silo-prod`.
4. **Run the 3.5 suite** to confirm the controls behave before any customer traffic arrives.

The organization PAB is the control most architects have not used yet. Resource IAM answers *"who may read this bucket?"*; a PAB answers *"which projects may this principal ever reach?"* Binding it to each tenant's Workload Identity Pool and Agent Runtime service account means a misconfigured IAM policy in the *other* tenant's project cannot be exploited — the denial happens at the IAM evaluation plane, before resource policy is consulted.

[3.4 Product Collaboration — VPC-SC Sign-Off](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md) records the Milestone 2 output: a four-row verification matrix, each row **SIGNED OFF** by GCP Security and GEAP Product Engineering.

| Control Domain | Threat Vector | Verification Mechanism |
| :--- | :--- | :--- |
| VPC-SC service perimeter | Compromised tool exfiltrating to an external bucket or BigQuery project | `perimeter_finvault_sovereign` returns `VPC_SERVICE_CONTROLS_PERMISSION_DENIED` (`403`) |
| IAM Principal Access Boundary | Stolen or replayed FinVault credential used against `cymbal-retailstream-silo-prod` | `finvault-sovereign-pab` restricts eligibility to the FinVault project |
| Cloud KMS CMEK kill-switch | Customer demands immediate cryptographic revocation of agent memory and RAG stores | Disabling `finvault-kr/agent-memory-cmek` halts Hop 3 Memory Bank and Hop 5 AlloyDB with `423 KMS_KEY_DISABLED` |
| mTLS pinning & air-gapped Gemma 3 | MITM spoofing; prohibition on multi-tenant model APIs for wire-settlement logs | Envoy/ALB verifies `spiffe://finvault.com/ns/sre/sa/agent-client`; sensitive prompts route to internal GKE `gemma-3-27b-it-vllm` |

---

## 7. Terraform Silo Blueprint and the 90-Minute Codelab

The [3.6 Terraform Silo Blueprint](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/README.md) packages the whole topology as a repeatable tenant factory. One `terraform apply` per tenant provisions:

- A dedicated **Cloud KMS CMEK** key ring and crypto key (`agent-memory-cmek`) with customer kill-switch support (`google_kms_crypto_key.tenant_agent_cmek`).
- A **VPC-SC service perimeter** (`perimeter_<tenant>_sovereign`) locking down Vertex AI, GEAP Discovery Engine, Model Armor, AlloyDB, BigQuery, Cloud Storage, and GKE (`google_access_context_manager_service_perimeter.tenant_sovereign_perimeter`).
- An isolated sovereign VPC and a **private air-gapped GKE Autopilot cluster** (`<tenant>-airgapped-gemma3-gke`) with CMEK-encrypted etcd and disks and zero public node IPs (`google_container_cluster.airgapped_gemma3_cluster`).

The air-gapped model itself ships as [`gke_gemma3_airgapped_manifest.yaml`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/gke_gemma3_airgapped_manifest.yaml): a two-replica `vLLM` Deployment of `gemma-3-27b-it` in the `finvault-sovereign-agents` namespace, pinned to `nvidia-l4` nodes with `--tensor-parallel-size=2` and a 32,768-token context, loading weights read-only from the CMEK-backed `finvault-cmek-model-pvc`, and exposed only through an **Internal** load balancer (`gemma3-internal-svc`, port 8000). Nothing in that manifest can reach the public internet.

For hands-on enablement, the [90-Minute Codelab: Regulated Air-Gapped Sovereign Silos](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/codelab-90min-regulated-airgapped.md) walks five modules — project and CMEK provisioning, mTLS + PAB, VPC-SC exfiltration denial, live CMEK revocation, and air-gapped Gemma 3 — each closed by one of the verification gates above. The companion [10-slide workshop deck](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/workshop-deck-pattern-b.md) and the [`go/demos` five-minute video script](../workstream-3-pattern-b-siloed/3.9-go-demos-and-video-script.md) (slug `geap-multi-tenant-pattern-b-siloed`) reuse the same run-of-show.

---

## 8. Cost & Operational Trade-Offs vs. Pattern A

Pattern B is not "Pattern A but safer." It is a different economic contract, and architects should present it to the business as such.

| Dimension | Pattern A — Pooled | Pattern B — Sovereign Silos |
| :--- | :--- | :--- |
| **Isolation** | Logical + cryptographic within a shared runtime (5-Hop chain, RLS, tenant-prefixed memory) | Physical: dedicated project, VPC-SC perimeter, PAB, and CMEK per tenant |
| **Compute & model** | Shared GEAP Runtime; shared Gemini 2.5 Pro with `ContextCacheConfig` | Dedicated GEAP Runtime; Provisioned Throughput or air-gapped Gemma 3 on GKE GPU node pools |
| **Unit economics** | Lowest unit cost; prefix caching yields up to 90% COGS savings | Higher baseline infrastructure floor per tenant; no cross-tenant cache amortisation |
| **Noisy neighbours & quotas** | Mitigated by Redis RPM/token bulkheads | Eliminated by construction; simplest per-project quota accounting |
| **Encryption control** | Envelope CMEK on Enterprise namespaces | Project-wide CMEK on runtime, Memory Bank, AlloyDB, GKE disks, and BigQuery; instant revocation |
| **Operational load** | One control plane, one deployment | Multi-project lifecycle: project factory, per-tenant perimeters, key rotation, and GKE fleet operations |
| **Best fit** | Standard B2B SaaS tiers and high-volume tasks | Healthcare, FinTech, and sovereign public-sector workloads with contractual isolation mandates |

Three practical notes from the field. First, the **80/20 split is what keeps Pattern B affordable**: because the governance code is identical, you pay for infrastructure, not for a second engineering team. Second, the **GKE GPU floor dominates per-tenant cost** when air-gapped inference is mandated; offer it as an explicit option (as RetailStream's Provisioned Throughput path shows) rather than a default. Third, **the CMEK kill-switch is also an availability risk** — document with each customer's SOC that revocation is immediate and total, and rehearse restoration (TEST 4B) as part of onboarding.

---

## 9. Next Steps → Workstream 4: Dynamic Hybrid (Pattern C)

Most tiered SaaS businesses do not want to choose. SMB and Standard tenants belong in the pooled tier; a handful of Enterprise accounts need sovereign data and tool spokes. Workstream 4 introduces **Pattern C (Dynamic Hybrid)**: a unified control plane and tenant-aware gateway that routes Standard tenants to the shared pool and Enterprise tenants to dedicated CMEK data spokes over **Private Service Connect (PSC)**, with **zero-downtime live tier migration** between them. See the Milestone 3 case study at [`4.1-case-study-and-solution-architecture.md`](../workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md) and the companion blog [`4.7-blog-dynamic-tiering-and-migration.md`](../workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md).

If you are evaluating which pattern fits a given customer today, start with the three questions from Section 1 — *dedicated blast radius? customer-revocable key? no multi-tenant model endpoints?* — and reach for Pattern B only when at least one answer is a contractual "yes."

---

## 10. Assets & Editable Diagrams

| Asset | Path |
| :--- | :--- |
| **Figure 1 — Draw.io render (PNG)** | [`ws3-pattern-b-sovereign-silos-architecture.drawio.png`](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.png) |
| **Figure 1 — Editable Draw.io** | [`.drawio`](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio) • [`.drawio.xml`](../diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio.xml) |
| **Figure 1 — Cloud Architecture Center exports** | [`SVG`](../diagrams/ws3-pattern-b-sovereign-silos-architecture.svg) • [`PNG`](../diagrams/ws3-pattern-b-sovereign-silos-architecture.png) |
| **Figure 1 — Vision AST (labels & coordinates)** | [`ws3-pattern-b-sovereign-silos-architecture.vision.json`](../diagrams/vision_metadata/ws3-pattern-b-sovereign-silos-architecture.vision.json) |
| **Editable slide deck** | [`ws3-pattern-b-siloed-editable-slides.pptx`](../slides/ws3-pattern-b-siloed-editable-slides.pptx) |
| **Flagship deep-dive blog (3.7)** | [`3.7-blog-sovereign-silos.md`](../workstream-3-pattern-b-siloed/3.7-blog-sovereign-silos.md) |
| **Case study & architecture (3.1)** | [`3.1-case-study-and-solution-architecture.md`](../workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md) |
| **Multi-project & CMEK runbook (3.2)** | [`3.2-multi-project-silo-and-cmek-setup.md`](../workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md) |
| **Reference implementation (3.3)** | [`pattern_b_siloed_service.py`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/pattern_b_siloed_service.py) • [`gke_gemma3_airgapped_manifest.yaml`](../workstream-3-pattern-b-siloed/3.3-solution-implementation/gke_gemma3_airgapped_manifest.yaml) |
| **VPC-SC sign-off matrix (3.4)** | [`3.4-product-collaboration-vpc-sc-signoff.md`](../workstream-3-pattern-b-siloed/3.4-product-collaboration-vpc-sc-signoff.md) |
| **Security test suite (3.5)** | [`run_silo_security_tests.py`](../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py) |
| **Terraform silo blueprint (3.6)** | [`3.6-terraform-silo-blueprint/README.md`](../workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/README.md) |
| **Codelab & workshop deck (3.8)** | [`codelab-90min-regulated-airgapped.md`](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/codelab-90min-regulated-airgapped.md) • [`workshop-deck-pattern-b.md`](../workstream-3-pattern-b-siloed/3.8-codelab-and-workshop-deck/workshop-deck-pattern-b.md) |
| **`go/demos` package & video script (3.9)** | [`3.9-go-demos-and-video-script.md`](../workstream-3-pattern-b-siloed/3.9-go-demos-and-video-script.md) |
| **Reusable 5-Hop core** | [`core-cymbal-agent/governance/`](../core-cymbal-agent/governance/) |
| **Program overview** | [`README.md`](../README.md) • [Cloud Architecture Center: Multi-tenant agentic AI system](https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system) |

*Workstream 3 of 5 — Multi-Tenant Agentic AI on Google Cloud. Previous: Workstream 2, Pattern A (Pooled). Next: Workstream 4, Pattern C (Dynamic Hybrid).*
