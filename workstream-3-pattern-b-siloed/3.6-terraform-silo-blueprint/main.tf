# =============================================================================
# Workstream 3.6: Terraform Blueprint — Pattern B (Sovereign Silos)
# Provisions Dedicated Tenant Silo Project, VPC-SC Perimeter, Cloud KMS CMEK,
# and Private GKE Cluster for Air-Gapped Gemma 3 Serving
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
  project = var.tenant_silo_project_id
  region  = var.region
}

# 1. Dedicated Tenant Cloud KMS Key Ring & CMEK CryptoKey (Customer Kill-Switch)
resource "google_kms_key_ring" "tenant_silo_keyring" {
  name     = "${var.tenant_id}-sovereign-kr"
  location = var.region
}

resource "google_kms_crypto_key" "tenant_agent_cmek" {
  name            = "agent-memory-cmek"
  key_ring        = google_kms_key_ring.tenant_silo_keyring.id
  rotation_period = "7776000s" # 90 days
  purpose         = "ENCRYPT_DECRYPT"
}

# 2. VPC Service Controls (VPC-SC) Service Perimeter for Sovereign Tenant Silo
resource "google_access_context_manager_service_perimeter" "tenant_sovereign_perimeter" {
  parent = "accessPolicies/${var.access_context_policy_id}"
  name   = "accessPolicies/${var.access_context_policy_id}/servicePerimeters/perimeter_${var.tenant_id}_sovereign"
  title  = "Sovereign Silo Perimeter for ${var.tenant_id}"

  status {
    resources = [
      "projects/${var.tenant_silo_project_number}"
    ]
    restricted_services = [
      "aiplatform.googleapis.com",
      "discoveryengine.googleapis.com",
      "modelarmor.googleapis.com",
      "alloydb.googleapis.com",
      "bigquery.googleapis.com",
      "storage.googleapis.com",
      "cloudkms.googleapis.com",
      "container.googleapis.com"
    ]
  }
}

# 3. Private Sovereign VPC for Air-Gapped GKE & Dedicated GEAP Runtime
resource "google_compute_network" "tenant_silo_vpc" {
  name                    = "${var.tenant_id}-sovereign-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "tenant_silo_subnet" {
  name                     = "${var.tenant_id}-sovereign-subnet"
  ip_cidr_range            = "10.40.0.0/20"
  region                   = var.region
  network                  = google_compute_network.tenant_silo_vpc.id
  private_ip_google_access = true
}

# 4. Private Air-Gapped GKE Cluster for Local Gemma 3 (27B IT) Inference
resource "google_container_cluster" "airgapped_gemma3_cluster" {
  name     = "${var.tenant_id}-airgapped-gemma3-gke"
  location = var.region

  network    = google_compute_network.tenant_silo_vpc.id
  subnetwork = google_compute_subnetwork.tenant_silo_subnet.id

  enable_autopilot = true

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.tenant_agent_cmek.id
  }
}
