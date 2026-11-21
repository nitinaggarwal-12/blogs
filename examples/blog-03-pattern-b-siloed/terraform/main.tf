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

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  suffix = random_id.suffix.hex
  bq_sa  = "serviceAccount:bq-${data.google_project.current.number}@bigquery-encryption.iam.gserviceaccount.com"
  apis = toset([
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each           = local.apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

data "google_storage_project_service_account" "gcs_sa" {
  project    = var.project_id
  depends_on = [google_project_service.required]
}

# 1. Dedicated Sovereign Service Account (Least Privilege)
resource "google_service_account" "silo_sa" {
  account_id   = "cymbal-silo-sa-${local.suffix}"
  display_name = "Cymbal Blog 3 Pattern B Sovereign Silo SA"
  depends_on   = [google_project_service.required]
}

resource "google_project_iam_member" "silo_bq_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.silo_sa.email}"
}

# 2. Dedicated Sovereign VPC (Private Google Access, zero public subnets required)
resource "google_compute_network" "sovereign_vpc" {
  name                    = "cymbal-silo-vpc-${local.suffix}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required]
}

resource "google_compute_subnetwork" "sovereign_subnet" {
  name                     = "cymbal-silo-subnet-${local.suffix}"
  ip_cidr_range            = "10.40.0.0/24"
  region                   = var.region
  network                  = google_compute_network.sovereign_vpc.id
  private_ip_google_access = true
}

# 3. Cloud KMS Keyring + Sovereign Tenant CMEK Key (Customer Kill-Switch)
resource "google_kms_key_ring" "silo_kr" {
  name       = "cymbal-silo-cmek-kr-${local.suffix}"
  location   = var.region
  depends_on = [google_project_service.required]
}

resource "google_kms_crypto_key" "tenant_cmek" {
  name            = "sovereign-vault-cmek"
  key_ring        = google_kms_key_ring.silo_kr.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s"
}

resource "google_kms_crypto_key_iam_member" "bq_cmek_user" {
  crypto_key_id = google_kms_crypto_key.tenant_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = local.bq_sa
}

resource "google_kms_crypto_key_iam_member" "gcs_cmek_user" {
  crypto_key_id = google_kms_crypto_key.tenant_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

resource "google_kms_crypto_key_iam_member" "silo_sa_kms_viewer" {
  crypto_key_id = google_kms_crypto_key.tenant_cmek.id
  role          = "roles/cloudkms.viewer"
  member        = "serviceAccount:${google_service_account.silo_sa.email}"
}

# 4. CMEK-Encrypted BigQuery Sovereign Vault Dataset & Table
resource "google_bigquery_dataset" "sovereign_vault" {
  dataset_id                 = "cymbal_silo_vault_${local.suffix}"
  location                   = var.region
  description                = "Pattern B Sovereign Silo CMEK-encrypted vault"
  delete_contents_on_destroy = true

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.tenant_cmek.id
  }

  depends_on = [google_kms_crypto_key_iam_member.bq_cmek_user]
}

resource "google_bigquery_dataset_iam_member" "silo_sa_bq_viewer" {
  dataset_id = google_bigquery_dataset.sovereign_vault.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.silo_sa.email}"
}

resource "google_bigquery_table" "vault_records" {
  dataset_id          = google_bigquery_dataset.sovereign_vault.dataset_id
  table_id            = "sovereign_cmek_records"
  deletion_protection = false

  encryption_configuration {
    kms_key_name = google_kms_crypto_key.tenant_cmek.id
  }

  schema = jsonencode([
    { name = "record_id", type = "STRING", mode = "REQUIRED" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "regulatory_scope", type = "STRING", mode = "REQUIRED" },
    { name = "payload_summary", type = "STRING", mode = "REQUIRED" },
  ])
}

# 5. CMEK-Encrypted Sovereign GCS Bucket (Uniform Bucket-Level Access + No Public Access)
resource "google_storage_bucket" "sovereign_gcs" {
  name                        = "${var.project_id}-silo-vault-${local.suffix}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.tenant_cmek.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek_user]
}

resource "google_storage_bucket_iam_member" "silo_sa_gcs_viewer" {
  bucket = google_storage_bucket.sovereign_gcs.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.silo_sa.email}"
}

# 6. Optional Org-Level VPC Service Controls Perimeter (Opt-In: enable_vpc_sc = true)
resource "google_access_context_manager_service_perimeter" "sovereign_perimeter" {
  count  = var.enable_vpc_sc ? 1 : 0
  parent = "accessPolicies/${var.access_context_policy_id}"
  name   = "accessPolicies/${var.access_context_policy_id}/servicePerimeters/cymbal_silo_${local.suffix}"
  title  = "Cymbal Sovereign Silo Perimeter (${local.suffix})"

  status {
    resources = ["projects/${data.google_project.current.number}"]
    restricted_services = [
      "aiplatform.googleapis.com",
      "bigquery.googleapis.com",
      "cloudkms.googleapis.com",
      "storage.googleapis.com",
    ]
  }
}

# 7. Authenticated Cloud Run Gen2 Sovereign Silo Agent
resource "google_cloud_run_v2_service" "silo_service" {
  name                = "cymbal-ws3-silo-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_bigquery_table.vault_records, google_storage_bucket.sovereign_gcs]

  template {
    service_account                  = google_service_account.silo_sa.email
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    max_instance_request_concurrency = 1

    containers {
      image = var.image_uri

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "BQ_DATASET"
        value = google_bigquery_dataset.sovereign_vault.dataset_id
      }
      env {
        name  = "BQ_TABLE"
        value = google_bigquery_table.vault_records.table_id
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.sovereign_gcs.name
      }
      env {
        name  = "CMEK_KEY_VERSION"
        value = "${google_kms_crypto_key.tenant_cmek.id}/cryptoKeyVersions/1"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}
