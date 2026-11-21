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

resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  suffix = random_id.suffix.hex
  apis = toset([
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each           = local.apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# 1. Least-Privilege Service Account for Pattern A Pooled Cloud Run Service
resource "google_service_account" "pooled_sa" {
  account_id   = "cymbal-pool-sa-${local.suffix}"
  display_name = "Cymbal Blog 2 Pattern A Pooled Runtime SA"
  depends_on   = [google_project_service.required]
}

resource "google_project_iam_member" "pooled_bq_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.pooled_sa.email}"
}

resource "google_project_iam_member" "pooled_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.pooled_sa.email}"
}

# 2. Shared Multi-Tenant BigQuery Dataset + Table + Native Row-Level Access Policy
resource "google_bigquery_dataset" "pooled_dataset" {
  dataset_id                 = "cymbal_pattern_a_pooled_${local.suffix}"
  location                   = "US"
  description                = "Pattern A High-Density Pooled multi-tenant store with Row-Level Access Policy"
  delete_contents_on_destroy = true
  depends_on                 = [google_project_service.required]
}

resource "google_bigquery_dataset_iam_member" "pooled_sa_viewer" {
  dataset_id = google_bigquery_dataset.pooled_dataset.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.pooled_sa.email}"
}

resource "google_bigquery_table" "pooled_entities" {
  dataset_id          = google_bigquery_dataset.pooled_dataset.dataset_id
  table_id            = "pooled_rls_entities"
  deletion_protection = false

  schema = jsonencode([
    { name = "entity_id", type = "STRING", mode = "REQUIRED" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "domain", type = "STRING", mode = "REQUIRED" },
    { name = "record_summary", type = "STRING", mode = "REQUIRED" },
    { name = "classification", type = "STRING", mode = "REQUIRED" },
  ])
}

resource "google_bigquery_row_access_policy" "finvault_rls" {
  dataset_id       = google_bigquery_dataset.pooled_dataset.dataset_id
  table_id         = google_bigquery_table.pooled_entities.table_id
  policy_id        = "finvault_tenant_rls_policy"
  filter_predicate = "tenant_id = 'finvault'"
  grantees         = ["serviceAccount:${google_service_account.pooled_sa.email}"]
}

# 3. Named Firestore Database for Per-Tenant RPM Noisy-Neighbor Bulkheads (Collision-Free)
resource "google_firestore_database" "ratelimit_db" {
  project                 = var.project_id
  name                    = "cymbal-pool-limiter-${local.suffix}"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  deletion_policy         = "DELETE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
  depends_on              = [google_project_service.required]
}

# 4. Authenticated Cloud Run Gen2 Pooled Runtime (concurrency=1 gVisor Mode A)
resource "google_cloud_run_v2_service" "pooled_service" {
  name                = "cymbal-ws2-pooled-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_project_service.required, google_bigquery_row_access_policy.finvault_rls]

  template {
    service_account                  = google_service_account.pooled_sa.email
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
        value = google_bigquery_dataset.pooled_dataset.dataset_id
      }
      env {
        name  = "BQ_TABLE"
        value = google_bigquery_table.pooled_entities.table_id
      }
      env {
        name  = "FIRESTORE_DB"
        value = google_firestore_database.ratelimit_db.name
      }
      env {
        name  = "RPM_LIMIT_PER_TENANT"
        value = tostring(var.rpm_limit_per_tenant)
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
