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
    "cloudresourcemanager.googleapis.com",
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

# 1. Three Distinct Least-Privilege Service Accounts (Orchestrator -> Specialist -> MCP Gateway)
resource "google_service_account" "orchestrator_sa" {
  account_id   = "cymbal-a2a-orc-${local.suffix}"
  display_name = "Cymbal Blog 5 A2A Orchestrator SA"
  depends_on   = [google_project_service.required]
}

resource "google_service_account" "specialist_sa" {
  account_id   = "cymbal-a2a-spc-${local.suffix}"
  display_name = "Cymbal Blog 5 A2A Specialist SA"
  depends_on   = [google_project_service.required]
}

resource "google_service_account" "mcp_sa" {
  account_id   = "cymbal-mcp-gw-${local.suffix}"
  display_name = "Cymbal Blog 5 MCP OBO Tool Gateway SA"
  depends_on   = [google_project_service.required]
}

# 2. Zero-PII BigQuery FinOps & OTel Chargeback Dataset + Table
resource "google_bigquery_dataset" "finops_dataset" {
  dataset_id                 = "cymbal_triad_finops_${local.suffix}"
  location                   = "US"
  description                = "Zero-PII per-tenant token chargeback and A2A/MCP audit ledger"
  delete_contents_on_destroy = true
  depends_on                 = [google_project_service.required]
}

resource "google_bigquery_dataset_iam_member" "orc_bq_editor" {
  dataset_id = google_bigquery_dataset.finops_dataset.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.orchestrator_sa.email}"
}

resource "google_project_iam_member" "orc_bq_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.orchestrator_sa.email}"
}

resource "google_bigquery_table" "finops_chargeback" {
  dataset_id          = google_bigquery_dataset.finops_dataset.dataset_id
  table_id            = "otel_finops_chargeback"
  deletion_protection = false

  schema = jsonencode([
    { name = "trace_id", type = "STRING", mode = "REQUIRED" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "prompt_sha256", type = "STRING", mode = "REQUIRED" },
    { name = "cached_tokens", type = "INTEGER", mode = "REQUIRED" },
    { name = "dynamic_tokens", type = "INTEGER", mode = "REQUIRED" },
    { name = "estimated_usd", type = "FLOAT", mode = "REQUIRED" },
    { name = "mcp_tool", type = "STRING", mode = "REQUIRED" },
    { name = "http_status", type = "INTEGER", mode = "REQUIRED" },
    { name = "recorded_at", type = "TIMESTAMP", mode = "REQUIRED" },
  ])
}

# 3. Tier 3: MCP OAuth 2.1 OBO Tool Gateway
resource "google_cloud_run_v2_service" "mcp_gateway" {
  name                = "cymbal-ws5-mcp-gw-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_project_service.required]

  template {
    service_account       = google_service_account.mcp_sa.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    containers {
      image = var.image_uri
      env {
        name  = "TRIAD_ROLE"
        value = "mcp_tool_gateway"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
    }
  }
}

# 4. Tier 2: A2A Specialist Agent (Publishes /.well-known/agent.json & invokes MCP Gateway via OIDC)
resource "google_cloud_run_v2_service" "a2a_specialist" {
  name                = "cymbal-ws5-a2a-spec-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_cloud_run_v2_service.mcp_gateway]

  template {
    service_account       = google_service_account.specialist_sa.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    containers {
      image = var.image_uri
      env {
        name  = "TRIAD_ROLE"
        value = "a2a_specialist"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "MCP_GATEWAY_URL"
        value = google_cloud_run_v2_service.mcp_gateway.uri
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "specialist_invoke_mcp" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.mcp_gateway.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.specialist_sa.email}"
}

# 5. Tier 1: A2A Root Orchestrator (Discovers Specialist Agent Card, Delegates A2A, Writes Zero-PII BQ Chargeback)
resource "google_cloud_run_v2_service" "a2a_orchestrator" {
  name                = "cymbal-ws5-a2a-orch-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_cloud_run_v2_service.a2a_specialist, google_bigquery_table.finops_chargeback]

  template {
    service_account       = google_service_account.orchestrator_sa.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    containers {
      image = var.image_uri
      env {
        name  = "TRIAD_ROLE"
        value = "a2a_orchestrator"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "A2A_SPECIALIST_URL"
        value = google_cloud_run_v2_service.a2a_specialist.uri
      }
      env {
        name  = "BQ_DATASET"
        value = google_bigquery_dataset.finops_dataset.dataset_id
      }
      env {
        name  = "BQ_TABLE"
        value = google_bigquery_table.finops_chargeback.table_id
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "orchestrator_invoke_specialist" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.a2a_specialist.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.orchestrator_sa.email}"
}
