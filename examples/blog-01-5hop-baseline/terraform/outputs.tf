output "service_url" {
  description = "Authenticated Cloud Run URL for the 5-Hop Governance Gateway."
  value       = google_cloud_run_v2_service.five_hop_gateway.uri
}

output "model_armor_before_template" {
  description = "Unprotected BEFORE Model Armor template resource name."
  value       = google_model_armor_template.before_unprotected.name
}

output "model_armor_after_template" {
  description = "Hardened AFTER Model Armor template resource name."
  value       = google_model_armor_template.after_firewall.name
}

output "cloud_armor_before_policy" {
  description = "BEFORE open-edge Cloud Armor policy name."
  value       = google_compute_security_policy.before_open_edge.name
}

output "cloud_armor_after_policy" {
  description = "AFTER Hop 1 WAF Cloud Armor policy name."
  value       = google_compute_security_policy.after_hop1_waf.name
}

output "kms_signing_key" {
  description = "Cloud KMS EC-P256 signing key resource ID."
  value       = google_kms_crypto_key.hop1_ec_signer.id
}
