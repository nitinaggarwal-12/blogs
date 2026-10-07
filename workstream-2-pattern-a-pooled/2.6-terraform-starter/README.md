# Workstream 2.6: 1-Click Terraform Starter — Pattern A (Pooled Architecture)

Deploys the shared **Cymbal Multi-Tenant Pooled Architecture** on Google Cloud:
* **Hop 1**: Google Cloud Armor WAF (`cymbal-pooled-edge-waf`)
* **Hop 3**: Memorystore for Redis (`cymbal-tenant-bulkhead-redis`), Cloud KMS CMEK key ring (`cymbal-pooled-tenant-kr`), and Gen2 gVisor Cloud Run / GEAP Agent Gateway (`cymbal-pooled-agent-gateway`)
* **Hop 5**: BigQuery OpenTelemetry dataset (`cymbal_multi_tenant_otel`)

## Quickstart

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
