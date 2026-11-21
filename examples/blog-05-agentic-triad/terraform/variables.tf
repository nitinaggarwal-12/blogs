variable "project_id" {
  description = "Customer GCP project ID (auto-populated by deploy.sh)."
  type        = string
}

variable "region" {
  description = "GCP region for the 3 Agentic Triad Cloud Run services and BigQuery FinOps ledger."
  type        = string
  default     = "us-central1"
}

variable "image_uri" {
  description = "Container image URI built in the customer's Artifact Registry."
  type        = string
}
