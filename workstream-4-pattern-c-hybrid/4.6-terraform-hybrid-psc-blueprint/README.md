# Workstream 4.6: Terraform Blueprint — Pattern C (Dynamic Hybrid & Private Service Connect Spokes)

Provisions the **Cymbal Hub-and-Spoke Private Service Connect (PSC) Bridge**:
* **Central Ingress Hub VPC** (`cymbal-hybrid-hub-vpc`) and consumer PSC endpoint (`psc-consumer-<tenant>`).
* **Enterprise Tenant Spoke VPC**, producer PSC NAT subnet (`purpose = PRIVATE_SERVICE_CONNECT`), and **PSC Service Attachment** (`<tenant>-agent-spoke-psc`) explicitly allowlisting only the Cymbal Hub project.

## Quickstart

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
