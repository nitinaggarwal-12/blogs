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

# Verify all 6 Pattern B Sovereign Silo & CMEK Kill-Switch Tests + 10 Third-Party SaaS Connectors (Both Sides: GCP + AWS AgentCore + 3P SaaS Target UIs)
python3 -B ../../workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py
python3 -B ../../scripts/verify_5_third_party_saas_products.py --pattern pattern-b --verbose
```

## Bidirectional 10 Non-Google Third-Party SaaS & CMEK Kill-Switch Verification
* **Manual Playbook**: [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](../../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
* **Live Third-Party SaaS Target Consoles (Side B • `HTTP 423 Locked` CMEK Kill-Switch)**: `http://13.220.94.209:3001..3010 (and https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>?format=json)`

