variable "hub_project_id" {
  description = "Google Cloud Project ID for the Cymbal Unified Control Plane & Ingress Hub"
  type        = string
}

variable "enterprise_spoke_project_id" {
  description = "Dedicated Google Cloud Project ID for the Enterprise Tenant Spoke (e.g., cymbal-finvault-silo-prod)"
  type        = string
}

variable "enterprise_tenant_id" {
  description = "Tenant identifier for the Enterprise Spoke"
  type        = string
  default     = "finvault"
}

variable "spoke_ilb_forwarding_rule_uri" {
  description = "SelfLink/URI of the Internal Application Load Balancer forwarding rule in the Tenant Spoke"
  type        = string
}

variable "region" {
  description = "Primary Google Cloud region"
  type        = string
  default     = "us-central1"
}

output "psc_service_attachment_uri" {
  description = "Producer Private Service Connect Service Attachment URI"
  value       = google_compute_service_attachment.enterprise_spoke_psc_attachment.id
}

output "hub_psc_consumer_ip" {
  description = "Internal IP address in the Central Hub VPC routing to the Enterprise Tenant Spoke"
  value       = google_compute_address.hub_psc_consumer_ip.address
}
