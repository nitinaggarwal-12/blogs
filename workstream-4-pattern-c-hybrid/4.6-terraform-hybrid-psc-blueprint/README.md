# Workstream 4.6: Terraform Blueprint — Pattern C (Dynamic Hybrid & Private Service Connect Spokes)

Provisions the **Cymbal Hub-and-Spoke Private Service Connect (PSC) Bridge**:
* **Central Ingress Hub VPC** (`cymbal-hybrid-hub-vpc`), consumer PSC endpoint (`psc-consumer-<tenant>`), and **Firestore Dynamic Tenant Routing Rule** (`cymbal_tenant_routing_rules`).
* **Enterprise Tenant Spoke VPC**, `/28` producer PSC NAT subnet (`10.240.0.0/28`, `purpose = PRIVATE_SERVICE_CONNECT`), and **PSC Service Attachment** (`<tenant>-agent-spoke-psc`) explicitly allowlisting only the Cymbal Hub project.

## Quickstart

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply

# Verify all 4 Pattern C Hybrid PSC & Zero-Downtime Tier Migration Tests + 10 Third-Party SaaS Connectors (Both Sides: GCP + AWS AgentCore + 3P SaaS Target UIs)
python3 -B ../../workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py
python3 -B ../../scripts/verify_5_third_party_saas_products.py --pattern pattern-c --verbose
```

## Bidirectional 10 Non-Google Third-Party SaaS & Zero-Downtime Tier Upgrade Verification
* **Manual Playbook**: [`docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md`](../../docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md)
* **Live Third-Party SaaS Target Consoles (Side B • `route=DEDICATED_PSC_SPOKE` & `dropped_turns=0`)**: `http://13.220.94.209:3001..3010 (and https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/<target>?format=json)`

