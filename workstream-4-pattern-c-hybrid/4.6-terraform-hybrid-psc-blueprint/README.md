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
```
