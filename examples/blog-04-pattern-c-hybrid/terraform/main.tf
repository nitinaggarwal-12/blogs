terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

locals {
  spoke_project = var.spoke_project_id != "" ? var.spoke_project_id : var.project_id
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google" {
  alias   = "spoke"
  project = local.spoke_project
  region  = var.region
}

resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  suffix = random_id.suffix.hex
  apis = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "compute.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
  ])
}

resource "google_project_service" "hub_apis" {
  for_each           = local.apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# 1. Least-Privilege Service Accounts (Hub Router, Shared Pool, Enterprise Spoke)
resource "google_service_account" "hub_router_sa" {
  account_id   = "cymbal-hub-rtr-${local.suffix}"
  display_name = "Cymbal Blog 4 Pattern C Hub Router SA"
  depends_on   = [google_project_service.hub_apis]
}

resource "google_service_account" "backend_sa" {
  account_id   = "cymbal-hyb-bkn-${local.suffix}"
  display_name = "Cymbal Blog 4 Pattern C Pool/Spoke Backend SA"
  depends_on   = [google_project_service.hub_apis]
}

resource "google_project_iam_member" "hub_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.hub_router_sa.email}"
}

# 2. Isolated Hub VPC (10.10.0.0/20) & Enterprise Spoke VPC (10.140.0.0/24) — Zero VPC Peering
resource "google_compute_network" "hub_vpc" {
  name                    = "cymbal-patc-hub-vpc-${local.suffix}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.hub_apis]
}

resource "google_compute_subnetwork" "hub_subnet" {
  name                     = "cymbal-patc-hub-sub-${local.suffix}"
  ip_cidr_range            = "10.10.0.0/20"
  region                   = var.region
  network                  = google_compute_network.hub_vpc.id
  private_ip_google_access = true
}

resource "google_compute_network" "spoke_vpc" {
  provider                = google.spoke
  name                    = "cymbal-patc-spoke-vpc-${local.suffix}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.hub_apis]
}

resource "google_compute_subnetwork" "spoke_app_subnet" {
  provider                 = google.spoke
  name                     = "cymbal-patc-spoke-app-${local.suffix}"
  ip_cidr_range            = "10.140.0.0/24"
  region                   = var.region
  network                  = google_compute_network.spoke_vpc.id
  private_ip_google_access = true
}

resource "google_compute_subnetwork" "spoke_proxy_only" {
  provider      = google.spoke
  name          = "cymbal-patc-spoke-proxy-${local.suffix}"
  ip_cidr_range = "10.140.2.0/24"
  region        = var.region
  network       = google_compute_network.spoke_vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

resource "google_compute_subnetwork" "spoke_psc_nat" {
  provider      = google.spoke
  name          = "cymbal-patc-spoke-psc-nat-${local.suffix}"
  ip_cidr_range = "10.140.10.0/28"
  region        = var.region
  network       = google_compute_network.spoke_vpc.id
  purpose       = "PRIVATE_SERVICE_CONNECT"
}

# 3. Shared Pool & Dedicated Enterprise Spoke Cloud Run Gen2 Backends
resource "google_cloud_run_v2_service" "shared_pool" {
  name                = "cymbal-ws4-pool-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_project_service.hub_apis]

  template {
    service_account       = google_service_account.backend_sa.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    containers {
      image = var.image_uri
      env {
        name  = "SERVICE_ROLE"
        value = "shared_pool"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
    }
  }
}

resource "google_cloud_run_v2_service" "enterprise_spoke" {
  provider            = google.spoke
  name                = "cymbal-ws4-spoke-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_project_service.hub_apis]

  template {
    service_account                  = google_service_account.backend_sa.email
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    max_instance_request_concurrency = 1
    containers {
      image = var.image_uri
      env {
        name  = "SERVICE_ROLE"
        value = "enterprise_spoke"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = local.spoke_project
      }
    }
  }
}

# Grant Hub Router SA least-privilege Cloud Run Invoker on Pool & Spoke backends
resource "google_cloud_run_v2_service_iam_member" "hub_invoke_pool" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.shared_pool.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.hub_router_sa.email}"
}

resource "google_cloud_run_v2_service_iam_member" "hub_invoke_spoke" {
  provider = google.spoke
  project  = local.spoke_project
  location = var.region
  name     = google_cloud_run_v2_service.enterprise_spoke.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.hub_router_sa.email}"
}

# 4. Real Unidirectional Private Service Connect (Spoke Serverless NEG -> Regional ILB -> PSC Attachment -> Hub Endpoint)
resource "google_compute_region_network_endpoint_group" "spoke_neg" {
  provider              = google.spoke
  name                  = "cymbal-patc-spoke-neg-${local.suffix}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.enterprise_spoke.name
  }
}

resource "google_compute_region_backend_service" "spoke_backend" {
  provider              = google.spoke
  name                  = "cymbal-patc-spoke-bs-${local.suffix}"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "INTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.spoke_neg.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
}

resource "google_compute_region_url_map" "spoke_url_map" {
  provider        = google.spoke
  name            = "cymbal-patc-spoke-um-${local.suffix}"
  region          = var.region
  default_service = google_compute_region_backend_service.spoke_backend.id
}

resource "google_compute_region_target_http_proxy" "spoke_proxy" {
  provider = google.spoke
  name     = "cymbal-patc-spoke-tp-${local.suffix}"
  region   = var.region
  url_map  = google_compute_region_url_map.spoke_url_map.id
}

resource "google_compute_forwarding_rule" "spoke_ilb_fr" {
  provider              = google.spoke
  name                  = "cymbal-patc-spoke-ilb-${local.suffix}"
  region                = var.region
  ip_protocol           = "TCP"
  port_range            = "80"
  load_balancing_scheme = "INTERNAL_MANAGED"
  network               = google_compute_network.spoke_vpc.id
  subnetwork            = google_compute_subnetwork.spoke_app_subnet.id
  target                = google_compute_region_target_http_proxy.spoke_proxy.id
  depends_on            = [google_compute_subnetwork.spoke_proxy_only]
}

resource "google_compute_service_attachment" "spoke_psc_attachment" {
  provider              = google.spoke
  name                  = "cymbal-patc-spoke-psc-${local.suffix}"
  region                = var.region
  description           = "Unidirectional PSC producer exposing Enterprise Spoke to Hub (zero VPC peering)"
  enable_proxy_protocol = false
  connection_preference = "ACCEPT_MANUAL"
  nat_subnets           = [google_compute_subnetwork.spoke_psc_nat.id]
  target_service        = google_compute_forwarding_rule.spoke_ilb_fr.id

  consumer_accept_lists {
    project_id_or_num = var.project_id
    connection_limit  = 10
  }
}

resource "google_compute_address" "hub_psc_ip" {
  name         = "cymbal-patc-hub-psc-ip-${local.suffix}"
  region       = var.region
  subnetwork   = google_compute_subnetwork.hub_subnet.id
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
}

resource "google_compute_forwarding_rule" "hub_psc_endpoint" {
  name                  = "cymbal-patc-hub-psc-ep-${local.suffix}"
  region                = var.region
  network               = google_compute_network.hub_vpc.id
  ip_address            = google_compute_address.hub_psc_ip.id
  load_balancing_scheme = ""
  target                = google_compute_service_attachment.spoke_psc_attachment.id
}

# 5. Named Firestore Dynamic Tenant Routing Table (Atomic 0ms Pool -> Spoke Cutover)
resource "google_firestore_database" "routing_db" {
  project                 = var.project_id
  name                    = "cymbal-hybrid-router-${local.suffix}"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  deletion_policy         = "DELETE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
  depends_on              = [google_project_service.hub_apis]
}

resource "google_firestore_document" "retailstream_initial_pool" {
  project     = var.project_id
  database    = google_firestore_database.routing_db.name
  collection  = "tenant_routes"
  document_id = "retailstream"
  fields = jsonencode({
    tenant_id      = { stringValue = "retailstream" }
    tier           = { stringValue = "STANDARD" }
    topology       = { stringValue = "PATTERN_A_POOLED" }
    target_url     = { stringValue = google_cloud_run_v2_service.shared_pool.uri }
    psc_endpoint   = { stringValue = "" }
    route_version  = { integerValue = "1" }
    cutover_status = { stringValue = "ACTIVE_POOL" }
  })
}

resource "google_firestore_document" "finvault_enterprise_spoke" {
  project     = var.project_id
  database    = google_firestore_database.routing_db.name
  collection  = "tenant_routes"
  document_id = "finvault"
  fields = jsonencode({
    tenant_id      = { stringValue = "finvault" }
    tier           = { stringValue = "ENTERPRISE" }
    topology       = { stringValue = "PATTERN_C_HYBRID_PSC_SPOKE" }
    target_url     = { stringValue = google_cloud_run_v2_service.enterprise_spoke.uri }
    psc_endpoint   = { stringValue = google_compute_address.hub_psc_ip.address }
    route_version  = { integerValue = "1" }
    cutover_status = { stringValue = "ACTIVE_SPOKE" }
  })
}

# 6. Central Hub Dynamic Router Cloud Run Gen2 Service
resource "google_cloud_run_v2_service" "hub_router" {
  name                = "cymbal-ws4-hub-router-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_firestore_document.retailstream_initial_pool, google_compute_forwarding_rule.hub_psc_endpoint]

  template {
    service_account       = google_service_account.hub_router_sa.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    containers {
      image = var.image_uri
      env {
        name  = "SERVICE_ROLE"
        value = "hub_router"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "FIRESTORE_DB"
        value = google_firestore_database.routing_db.name
      }
      env {
        name  = "POOL_SERVICE_URL"
        value = google_cloud_run_v2_service.shared_pool.uri
      }
      env {
        name  = "SPOKE_SERVICE_URL"
        value = google_cloud_run_v2_service.enterprise_spoke.uri
      }
      env {
        name  = "PSC_CONSUMER_IP"
        value = google_compute_address.hub_psc_ip.address
      }
      env {
        name  = "PSC_ATTACHMENT_URI"
        value = google_compute_service_attachment.spoke_psc_attachment.id
      }
    }
  }
}
