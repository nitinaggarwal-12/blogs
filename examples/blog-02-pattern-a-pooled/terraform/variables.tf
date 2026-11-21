variable "project_id" {
  description = "Customer GCP project ID (auto-populated by deploy.sh)."
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run, BigQuery, and Firestore."
  type        = string
  default     = "us-central1"
}

variable "image_uri" {
  description = "Container image URI built in the customer's Artifact Registry."
  type        = string
}

variable "rpm_limit_per_tenant" {
  description = "Per-tenant requests-per-minute bulkhead limit (low default makes HTTP 429 easy to test in verify.sh)."
  type        = number
  default     = 5
}

variable "operator_member" {
  description = "Optional IAM member (user:<email> or serviceAccount:<email>) granted unscoped TRUE row-access policy to seed data and run BEFORE baseline comparison."
  type        = string
  default     = ""
}
