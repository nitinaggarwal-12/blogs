variable "project_id" {
  description = "Customer GCP project ID (auto-populated by deploy.sh)."
  type        = string
}

variable "region" {
  description = "GCP region for Cloud KMS, BigQuery, GCS, VPC, and Cloud Run (must match KMS + BQ/GCS region)."
  type        = string
  default     = "us-central1"
}

variable "image_uri" {
  description = "Container image URI built in the customer's Artifact Registry."
  type        = string
}

variable "enable_vpc_sc" {
  description = "Set true only if you hold Org-level Access Context Manager permissions and supply access_context_policy_id."
  type        = bool
  default     = false
}

variable "access_context_policy_id" {
  description = "Optional Organization Access Context Policy ID (required only when enable_vpc_sc = true)."
  type        = string
  default     = ""
}
