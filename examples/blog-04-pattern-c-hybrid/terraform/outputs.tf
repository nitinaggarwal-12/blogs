output "hub_router_url" {
  description = "Single SaaS Hub Router URL (routes dynamically to Pool or Enterprise PSC Spoke)."
  value       = google_cloud_run_v2_service.hub_router.uri
}

output "psc_service_attachment" {
  description = "Enterprise Spoke Private Service Connect Producer Service Attachment."
  value       = google_compute_service_attachment.spoke_psc_attachment.id
}

output "hub_psc_consumer_ip" {
  description = "Private Service Connect Consumer IP inside Hub VPC."
  value       = google_compute_address.hub_psc_ip.address
}

output "firestore_routing_db" {
  description = "Named Firestore database holding live tenant routing documents."
  value       = google_firestore_database.routing_db.name
}
