variable "project_id" {
  description = "Customer Hub GCP project ID (auto-populated by deploy.sh)."
  type        = string
}

variable "spoke_project_id" {
  description = "Optional separate GCP project ID for the Enterprise Spoke (defaults to project_id so single-project sandboxes work with zero edits)."
  type        = string
  default     = ""
}

variable "region" {
  description = "GCP region for Hub VPC, Spoke VPC, PSC, Firestore, and Cloud Run."
  type        = string
  default     = "us-central1"
}

variable "image_uri" {
  description = "Container image URI built in the customer's Artifact Registry."
  type        = string
}
