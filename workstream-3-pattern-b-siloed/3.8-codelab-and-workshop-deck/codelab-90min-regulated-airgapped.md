# 90-Minute Hands-On Codelab: Regulated Air-Gapped Sovereign Silos on GEAP (Pattern B)

> **Workstream 3.8 • Codelab Guide**  
> **Duration**: 90 Minutes  
> **Level**: Advanced Security & Infrastructure (L300–L400)  
> **Scenario**: Cymbal SaaS Platform — Provisioning Air-Gapped Sovereign Silos for FinVault Bank & RetailStream Corp

---

## Lab Overview & Schedule

In this 90-minute hands-on lab, you will take Cymbal's 80% reusable core agent runtime and deploy it into **Pattern B: Dedicated Sovereign Silos** protected by **mTLS Client Certificate Pinning**, **IAM Principal Access Boundaries (PAB)**, **VPC Service Controls (VPC-SC)**, **Cloud KMS CMEK Kill-Switches**, and **Air-Gapped Gemma 3 (27B) on Private GKE**.

| Module | Time | Focus Area | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Module 1** | `00:00–00:20` | Provision Multi-Project Silos & Cloud KMS CMEK Keys | Terraform blueprint review (`3.6-terraform-silo-blueprint/`) |
| **Module 2** | `00:20–00:40` | Configure mTLS SPIFFE Pinning & IAM Principal Access Boundaries (PAB) | Verify `401` on spoofed SPIFFE cert & `403` on cross-project PAB |
| **Module 3** | `00:40–01:00` | Enforce VPC-SC Perimeters & Test Exfiltration Denial | Verify `403 VPC_SERVICE_CONTROLS_PERMISSION_DENIED` |
| **Module 4** | `01:00–01:15` | Execute Live Cloud KMS CMEK Revocation Kill-Switch | Verify instant `423 KMS_KEY_DISABLED` halt & restoration |
| **Module 5** | `01:15–01:30` | Deploy Air-Gapped Gemma 3 (27B) on Private GKE | Verify sovereign local inference inside FinVault's perimeter |

---

## Step-by-Step Lab Execution

### Step 1: Inspect the Sovereign Silo Terraform Blueprint
Open [`workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf`](../3.6-terraform-silo-blueprint/main.tf) and review:
* `google_kms_crypto_key.tenant_agent_cmek` (Customer-managed encryption key).
* `google_access_context_manager_service_perimeter.tenant_sovereign_perimeter` (VPC-SC perimeter locking down Vertex AI, GEAP Discovery Engine, Model Armor, AlloyDB, and BigQuery).
* `google_container_cluster.airgapped_gemma3_cluster` (Private GKE cluster with CMEK-encrypted etcd/disks and zero public node IPs).

### Step 2: Test mTLS Pinning & IAM Principal Access Boundaries (PAB)
Inspect [`pattern_b_siloed_service.py`](../3.3-solution-implementation/pattern_b_siloed_service.py):
* When a client presents RetailStream's SPIFFE ID (`spiffe://retailstream.com/...`) against FinVault's silo, ingress rejects the handshake with HTTP `401 MTLS_CERTIFICATE_MISMATCH`.
* When a FinVault principal attempts to target `cymbal-retailstream-silo-prod`, the IAM Principal Access Boundary blocks the request with HTTP `403 PAB_BOUNDARY_VIOLATION`.

### Step 3: Trigger VPC-SC Perimeter Exfiltration Defense & CMEK Kill-Switch
Run the automated Sovereign Silo test suite to verify VPC-SC exfiltration prevention, CMEK revocation (`423 KMS_KEY_DISABLED`), CMEK restoration, and air-gapped Gemma 3 inference on GKE:

```bash
python3 workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py
```
