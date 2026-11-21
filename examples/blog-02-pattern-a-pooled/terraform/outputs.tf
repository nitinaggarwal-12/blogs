output "service_url" {
  description = "Authenticated Cloud Run URL for Pattern A Pooled service."
  value       = google_cloud_run_v2_service.pooled_service.uri
}

output "bq_dataset" {
  description = "Multi-tenant BigQuery dataset ID."
  value       = google_bigquery_dataset.pooled_dataset.dataset_id
}

output "bq_table" {
  description = "Multi-tenant BigQuery table ID."
  value       = google_bigquery_table.pooled_entities.table_id
}

output "firestore_db" {
  description = "Named Firestore database for per-tenant RPM rate limiting."
  value       = google_firestore_database.ratelimit_db.name
}
