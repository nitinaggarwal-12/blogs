output "service_url" {
  description = "Authenticated Cloud Run URL for Pattern B Sovereign Silo service."
  value       = google_cloud_run_v2_service.silo_service.uri
}

output "kms_keyring" {
  description = "Cloud KMS Keyring name."
  value       = google_kms_key_ring.silo_kr.name
}

output "kms_key_name" {
  description = "Cloud KMS CMEK CryptoKey name."
  value       = google_kms_crypto_key.tenant_cmek.name
}

output "bq_dataset" {
  description = "CMEK-encrypted BigQuery vault dataset ID."
  value       = google_bigquery_dataset.sovereign_vault.dataset_id
}

output "bq_table" {
  description = "CMEK-encrypted BigQuery vault table ID."
  value       = google_bigquery_table.vault_records.table_id
}

output "gcs_bucket" {
  description = "CMEK-encrypted sovereign GCS bucket name."
  value       = google_storage_bucket.sovereign_gcs.name
}
