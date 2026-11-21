output "orchestrator_url" {
  description = "Authenticated Cloud Run URL for the A2A Root Orchestrator."
  value       = google_cloud_run_v2_service.a2a_orchestrator.uri
}

output "specialist_url" {
  description = "Authenticated Cloud Run URL for the A2A Specialist publishing /.well-known/agent.json."
  value       = google_cloud_run_v2_service.a2a_specialist.uri
}

output "mcp_gateway_url" {
  description = "Authenticated Cloud Run URL for the MCP OAuth 2.1 OBO Tool Gateway."
  value       = google_cloud_run_v2_service.mcp_gateway.uri
}

output "bq_dataset" {
  description = "Zero-PII BigQuery FinOps dataset ID."
  value       = google_bigquery_dataset.finops_dataset.dataset_id
}

output "bq_table" {
  description = "Zero-PII BigQuery FinOps chargeback table ID."
  value       = google_bigquery_table.finops_chargeback.table_id
}
