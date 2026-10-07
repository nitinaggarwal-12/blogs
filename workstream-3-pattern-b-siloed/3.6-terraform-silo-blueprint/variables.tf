variable "tenant_id" {
  description = "Short identifier for the regulated corporate tenant (e.g., finvault)"
  type        = string
  default     = "finvault"
}

variable "tenant_silo_project_id" {
  description = "Dedicated Google Cloud Project ID for the tenant's Sovereign Silo"
  type        = string
}

variable "tenant_silo_project_number" {
  description = "Numeric Google Cloud Project Number for VPC-SC perimeter binding"
  type        = string
}

variable "access_context_policy_id" {
  description = "Organization Access Context Manager Policy ID"
  type        = string
}

variable "region" {
  description = "Primary region for the Sovereign Silo"
  type        = string
  default     = "us-central1"
}

output "cmek_crypto_key_id" {
  description = "Cloud KMS CMEK key URI governing the tenant's cryptographic kill-switch"
  value       = google_kms_crypto_key.tenant_agent_cmek.id
}

output "vpc_sc_perimeter_name" {
  description = "Enforced VPC Service Controls perimeter name"
  value       = google_access_context_manager_service_perimeter.tenant_sovereign_perimeter.name
}
