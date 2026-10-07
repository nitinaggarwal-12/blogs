variable "project_id" {
  description = "Google Cloud Project ID hosting the Cymbal Pattern A (Pooled) environment"
  type        = string
}

variable "region" {
  description = "Primary Google Cloud region for GEAP Runtime, AlloyDB, and Memorystore"
  type        = string
  default     = "us-central1"
}

variable "gateway_container_image" {
  description = "Container image URI for the Cymbal 5-Hop Pooled Agent Gateway"
  type        = string
  default     = "us-central1-docker.pkg.dev/cymbal-pooled-saas-prod/containers/cymbal-agent-gateway:v2.0"
}

output "pooled_gateway_uri" {
  description = "Internal URL of the Cymbal Pooled Agent Gateway"
  value       = google_cloud_run_v2_service.cymbal_pooled_gateway.uri
}

output "redis_bulkhead_host" {
  description = "Memorystore for Redis host used for per-tenant token & rate bulkheads"
  value       = google_redis_instance.tenant_token_bulkhead.host
}
