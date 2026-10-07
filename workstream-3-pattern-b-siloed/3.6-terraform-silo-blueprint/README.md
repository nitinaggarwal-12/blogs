# Workstream 3.6: Terraform Blueprint — Pattern B (Sovereign Silos & Air-Gapped GKE)

Provisions a dedicated **Zero-Trust Sovereign Tenant Silo** on Google Cloud:
* Dedicated **Cloud KMS CMEK** key ring & crypto key (`agent-memory-cmek`) with customer kill-switch support.
* **VPC Service Controls (VPC-SC)** service perimeter (`perimeter_<tenant>_sovereign`) locking down Vertex AI, GEAP Discovery Engine, Model Armor, AlloyDB, BigQuery, Cloud Storage, and GKE.
* Isolated Sovereign VPC and a **Private Air-Gapped GKE Autopilot Cluster** (`<tenant>-airgapped-gemma3-gke`) for local **Gemma 3 (27B IT)** serving.

## Quickstart

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
