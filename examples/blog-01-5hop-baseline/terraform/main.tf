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
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "modelarmor.googleapis.com",
    "run.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each           = local.apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# 1. Least-Privilege Service Account for Hop 1-5 Cloud Run Gateway
resource "google_service_account" "gateway_sa" {
  account_id   = "cymbal-5hop-gw-${local.suffix}"
  display_name = "Cymbal Blog 1 5-Hop Governance Gateway SA"
  depends_on   = [google_project_service.required]
}

resource "google_project_iam_member" "gateway_vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.gateway_sa.email}"
}

resource "google_project_iam_member" "gateway_model_armor_user" {
  project = var.project_id
  role    = "roles/modelarmor.user"
  member  = "serviceAccount:${google_service_account.gateway_sa.email}"
}

# 2. Cloud KMS Asymmetric EC-P256 Signing Key for Hop 1 TenantContext JWT Minting
resource "google_kms_key_ring" "hop1_signing_kr" {
  name       = "cymbal-5hop-jwt-kr-${local.suffix}"
  location   = var.region
  depends_on = [google_project_service.required]
}

resource "google_kms_crypto_key" "hop1_ec_signer" {
  name     = "tenant-context-ec-p256"
  key_ring = google_kms_key_ring.hop1_signing_kr.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "SOFTWARE"
  }
}

resource "google_kms_crypto_key_iam_member" "gateway_kms_signer" {
  crypto_key_id = google_kms_crypto_key.hop1_ec_signer.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${google_service_account.gateway_sa.email}"
}

# 3. Hop 1 Cloud Armor Policies — BEFORE (Open Edge) vs. AFTER (Header-Spoof + OWASP WAF)
resource "google_compute_security_policy" "before_open_edge" {
  name        = "cymbal-ws1-before-open-edge-${local.suffix}"
  description = "BEFORE baseline: default-allow edge with zero X-Tenant-ID header anti-spoofing"
  depends_on  = [google_project_service.required]

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Unprotected default allow"
  }
}

resource "google_compute_security_policy" "after_hop1_waf" {
  name        = "cymbal-ws1-after-hop1-waf-${local.suffix}"
  description = "AFTER hardened Hop 1 WAF: blocks unauthenticated X-Tenant-ID spoofing & OWASP SQLi/XSS"
  depends_on  = [google_project_service.required]

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "has(request.headers['x-tenant-id']) && !has(request.headers['authorization'])"
      }
    }
    description = "Hop 1: Reject unauthenticated X-Tenant-ID header smuggling"
  }

  rule {
    action   = "deny(403)"
    priority = 1100
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable') || evaluatePreconfiguredWaf('xss-v33-stable')"
      }
    }
    description = "Hop 1: Block OWASP SQLi and XSS at Google Cloud edge"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Allow authenticated traffic to Hop 1 Identity PEP"
  }
}

# 4. Hop 4 Vertex AI Model Armor Templates — BEFORE (Unprotected) vs. AFTER (Zero-Trust Firewall)
resource "google_model_armor_template" "before_unprotected" {
  location    = var.region
  template_id = "cymbal-ws1-before-unprotected-${local.suffix}"
  depends_on  = [google_project_service.required]

  filter_config {
    pi_and_jailbreak_filter_settings {
      filter_enforcement = "DISABLED"
    }
    malicious_uri_filter_settings {
      filter_enforcement = "DISABLED"
    }
    sdp_settings {
      basic_config {
        filter_enforcement = "DISABLED"
      }
    }
  }
}

resource "google_model_armor_template" "after_firewall" {
  location    = var.region
  template_id = "cymbal-ws1-after-firewall-${local.suffix}"
  depends_on  = [google_project_service.required]

  filter_config {
    pi_and_jailbreak_filter_settings {
      filter_enforcement = "ENABLED"
      confidence_level   = "LOW_AND_ABOVE"
    }
    malicious_uri_filter_settings {
      filter_enforcement = "ENABLED"
    }
    sdp_settings {
      basic_config {
        filter_enforcement = "ENABLED"
      }
    }
    rai_settings {
      rai_filters {
        filter_type      = "DANGEROUS"
        confidence_level = "LOW_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "HARASSMENT"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
      rai_filters {
        filter_type      = "HATE_SPEECH"
        confidence_level = "MEDIUM_AND_ABOVE"
      }
    }
  }
}

# 5. Authenticated Cloud Run Gen2 5-Hop Governance Gateway (IAM-authenticated; zero public invoker)
resource "google_cloud_run_v2_service" "five_hop_gateway" {
  name                = "cymbal-ws1-5hop-gw-${local.suffix}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false
  depends_on          = [google_project_service.required, google_kms_crypto_key_iam_member.gateway_kms_signer]

  template {
    service_account                  = google_service_account.gateway_sa.email
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    max_instance_request_concurrency = 10

    containers {
      image = var.image_uri

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "KMS_SIGNING_KEY_VERSION"
        value = "${google_kms_crypto_key.hop1_ec_signer.id}/cryptoKeyVersions/1"
      }
      env {
        name  = "MODEL_ARMOR_BEFORE_TEMPLATE"
        value = google_model_armor_template.before_unprotected.name
      }
      env {
        name  = "MODEL_ARMOR_AFTER_TEMPLATE"
        value = google_model_armor_template.after_firewall.name
      }
      env {
        name  = "VERTEX_MODEL"
        value = var.model_name
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
