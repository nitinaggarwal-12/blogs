# Workstream 2.6: 1-Click Terraform Starter — Pattern A (Pooled Architecture)

Deploys the shared **Cymbal Multi-Tenant Pooled Architecture** on Google Cloud:
* **Hop 1**: Google Cloud Armor WAF (`cymbal-pooled-edge-waf`)
* **Hop 3**: Memorystore for Redis (`cymbal-tenant-bulkhead-redis`), Cloud KMS CMEK key ring (`cymbal-pooled-tenant-kr`), and Gen2 gVisor Cloud Run / GEAP Agent Gateway (`cymbal-pooled-agent-gateway`)
* **Hop 5**: BigQuery OpenTelemetry dataset (`cymbal_agentic_finops_otel`)

## Quickstart (1-Click Automated Script or Manual CLI)

```bash
# Option 1: 1-Click Automated Deployment + 10/10 Breach & 10-SaaS Verification
./deploy_1click.sh --apply

# Option 2: Step-by-Step Terraform CLI
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply

# Verify all 10 Pattern A Cross-Tenant Breach Defenses + 10 Third-Party SaaS Connectors (Both Sides: GCP + AWS AgentCore + 3P SaaS Target UIs)
python3 -B ../../workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py
python3 -B ../../scripts/verify_5_third_party_saas_products.py --pattern pattern-a --verbose
```

## Bidirectional 10 Non-Google Third-Party SaaS Verification
* **Manual Playbook**: [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](../../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
* **Live Third-Party SaaS Target Consoles (Side B)**: `https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>` (`thoughtspot-spotter`, `sigma-computing`, `servicenow-itsm`, `muse-poc`, `salesforce-jira`, `databricks-unity`, `snowflake-cortex`, `workday-raas`, `datadog-sre`, `crowdstrike-okta`)

