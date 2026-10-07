# Workstream 3.8: Workshop Deck — Sovereign Silos & Air-Gapped Agentic AI (Pattern B)

> **Presentation Format**: 10-Slide Technical Workshop Deck (90-Min Session)  
> **Milestone**: Milestone 2 • Week 7 Release

---

## Slide 1: Title Slide
* **Title**: Pattern B: Sovereign Silos & Zero-Trust Air-Gapped Agentic AI
* **Subtitle**: Physical Project Isolation, VPC Service Controls, IAM PAB, CMEK Kill-Switches, and Gemma 3 on GKE

## Slide 2: Why Regulated Enterprises Demand Pattern B
* **Drivers**: OCC/FDIC banking mandates, HIPAA, DORA, and public-sector data residency.
* **Mandate**: Zero shared compute, zero shared storage, customer-revocable encryption keys, and hard network perimeters.

## Slide 3: 80% Code Reuse + 20% Sovereign Infrastructure Delta
* **Core Reuse**: Cymbal's 5-Hop Cryptographic Context Chain (`core-cymbal-agent/`) runs unchanged inside each silo.
* **20% Delta**: Dedicated GCP Project Factory + mTLS Ingress + IAM PAB + VPC-SC + Cloud KMS CMEK + Private GKE Gemma 3.

## Slide 4: Layer 1 — mTLS Ingress & IAM Principal Access Boundaries (PAB)
* **How PAB Works**: Unlike resource IAM policies ("who can read this bucket"), PAB defines "which project boundary this identity can ever access."
* **Result**: Eliminates cross-project lateral movement even if another project has overly permissive IAM bindings.

## Slide 5: Layer 2 — VPC Service Controls (VPC-SC) Perimeters
* **Protected APIs**: `aiplatform.googleapis.com`, `discoveryengine.googleapis.com`, `modelarmor.googleapis.com`, `alloydb.googleapis.com`, `bigquery.googleapis.com`.
* **Exfiltration Block**: Blocks compromised MCP tools from writing tenant context to external cloud storage or BigQuery datasets.

## Slide 6: Layer 3 — Cloud KMS / EKM CMEK Cryptographic Kill-Switch
* **Mechanism**: FinVault controls `finvault-kr/agent-memory-cmek`.
* **Live Kill-Switch**: Disabling the key version immediately returns `HTTP 423 KMS_KEY_DISABLED` across Hop 3 Memory Bank and Hop 5 AlloyDB.

## Slide 7: Layer 4 — Air-Gapped Gemma 3 (27B IT) on Private GKE
* **Architecture**: Private GKE Autopilot cluster with NVIDIA L4 GPUs serving `gemma-3-27b-it` via `vLLM` over an internal load balancer—zero external internet egress.

## Slide 8: Live Demo — Exfiltration Block & CMEK Revocation in Real Time
* **Walkthrough**: Execute `run_silo_security_tests.py` and verify all 5 Sovereign Silo gates pass.

## Slide 9: Operational Trade-Offs of Pattern B
* **Pros**: Zero blast radius, zero noisy neighbors, simplest per-project quota accounting, full regulatory compliance.
* **Cons**: Higher baseline infrastructure floor per tenant and multi-project lifecycle management.

## Slide 10: Preview of Pattern C (Dynamic Hybrid)
* **Next Step**: How to unify Pattern A's pooled unit economics with Pattern B's sovereign data/tool silos using **Private Service Connect (PSC) Spokes** and **Zero-Downtime Tier Migration**.
