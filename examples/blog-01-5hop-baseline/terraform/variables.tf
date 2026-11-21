variable "project_id" {
  description = "Customer GCP project ID (auto-populated by deploy.sh from active gcloud config)."
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run, Cloud KMS, Artifact Registry, and Vertex AI Model Armor."
  type        = string
  default     = "us-central1"
}

variable "image_uri" {
  description = "Container image URI built in the customer's Artifact Registry by deploy.sh."
  type        = string
}

variable "model_name" {
  description = "Vertex AI Gemini model ID invoked at Hop 3."
  type        = string
  default     = "gemini-2.5-flash"
}
