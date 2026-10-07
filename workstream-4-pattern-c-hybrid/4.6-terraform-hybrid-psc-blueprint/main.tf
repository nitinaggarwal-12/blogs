# =============================================================================
# Workstream 4.6: Terraform Blueprint — Pattern C (Dynamic Hybrid & PSC Spokes)
# Provisions Central Ingress Hub, Firestore Routing Table, Producer PSC Service
# Attachment in Tenant Spoke, and Consumer PSC Endpoint in Central Hub
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.30.0"
    }
  }
}

provider "google" {
  alias   = "hub"
  project = var.hub_project_id
  region  = var.region
}

provider "google" {
  alias   = "spoke"
  project = var.enterprise_spoke_project_id
  region  = var.region
}

# 1. Central Ingress Hub VPC & Subnet
resource "google_compute_network" "cymbal_hub_vpc" {
  provider                = google.hub
  name                    = "cymbal-hybrid-hub-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "cymbal_hub_subnet" {
  provider                 = google.hub
  name                     = "cymbal-hybrid-hub-subnet"
  ip_cidr_range            = "10.10.0.0/20"
  region                   = var.region
  network                  = google_compute_network.cymbal_hub_vpc.id
  private_ip_google_access = true
}

# 2. Producer Private Service Connect (PSC) NAT Subnet & Service Attachment in Enterprise Spoke
resource "google_compute_network" "enterprise_spoke_vpc" {
  provider                = google.spoke
  name                    = "${var.enterprise_tenant_id}-spoke-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "enterprise_spoke_psc_nat" {
  provider      = google.spoke
  name          = "${var.enterprise_tenant_id}-psc-nat-subnet"
  ip_cidr_range = "10.40.240.0/24"
  region        = var.region
  network       = google_compute_network.enterprise_spoke_vpc.id
  purpose       = "PRIVATE_SERVICE_CONNECT"
}

resource "google_compute_service_attachment" "enterprise_spoke_psc_attachment" {
  provider              = google.spoke
  name                  = "${var.enterprise_tenant_id}-agent-spoke-psc"
  region                = var.region
  description           = "PSC Producer Attachment exposing ${var.enterprise_tenant_id} GEAP Spoke to Cymbal Hub"
  enable_proxy_protocol = false
  connection_preference = "ACCEPT_MANUAL"
  nat_subnets           = [google_compute_subnetwork.enterprise_spoke_psc_nat.id]
  target_service        = var.spoke_ilb_forwarding_rule_uri

  consumer_accept_lists {
    project_id_or_num = var.hub_project_id
    connection_limit  = 20
  }
}

# 3. Consumer PSC Endpoint in Central Ingress Hub VPC
resource "google_compute_address" "hub_psc_consumer_ip" {
  provider     = google.hub
  name         = "psc-endpoint-${var.enterprise_tenant_id}-ip"
  region       = var.region
  subnetwork   = google_compute_subnetwork.cymbal_hub_subnet.id
  address_type = "INTERNAL"
  address      = "10.10.0.50"
}

resource "google_compute_forwarding_rule" "hub_psc_consumer_endpoint" {
  provider              = google.hub
  name                  = "psc-consumer-${var.enterprise_tenant_id}"
  region                = var.region
  network               = google_compute_network.cymbal_hub_vpc.id
  ip_address            = google_compute_address.hub_psc_consumer_ip.id
  load_balancing_scheme = ""
  target                = google_compute_service_attachment.enterprise_spoke_psc_attachment.id
}
