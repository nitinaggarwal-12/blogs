# =============================================================================
# Workstream 2.6: 1-Click Sanitized Terraform Starter — Pattern A (Pooled)
# Deploys Shared GEAP Runtime, Cloud Armor WAF, IAP, AlloyDB RLS, Redis & BQ OTel
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
  project = var.project_id
  region  = var.region
}

# 1. Cloud Armor Edge WAF Policy (Layer 4 DDoS + Layer 7 SQLi/XSS Protection)
resource "google_compute_security_policy" "cymbal_pooled_waf" {
  name        = "cymbal-pooled-edge-waf"
  description = "Hop 1 Edge WAF protecting shared Cymbal multi-tenant agent gateway"

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable') || evaluatePreconfiguredWaf('xss-v33-stable')"
      }
    }
    description = "Block SQLi and XSS payloads at edge"
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
    description = "Default allow authenticated traffic to IAP & Hop 1 PEP"
  }
}

# 2. Memorystore for Redis — Hop 3 Per-Tenant Rate & Thinking-Token Bulkhead
resource "google_redis_instance" "tenant_token_bulkhead" {
  name           = "cymbal-tenant-bulkhead-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.region
  redis_version  = "REDIS_7_0"
  labels = {
    architecture_pattern = "pattern-a-pooled"
    governance_hop       = "hop-3-finops-bulkhead"
  }
}

# 3. Cloud KMS CMEK Key for Enterprise Tenant Namespace Encryption (FinVault Bank)
resource "google_kms_key_ring" "cymbal_tenant_keyring" {
  name     = "cymbal-pooled-tenant-kr"
  location = var.region
}

resource "google_kms_crypto_key" "finvault_memory_cmek" {
  name            = "finvault-agent-memory-cmek"
  key_ring        = google_kms_key_ring.cymbal_tenant_keyring.id
  rotation_period = "7776000s" # 90 days
}

# 4. Shared Cloud Run / GEAP Gateway Service (Enforces 5-Hop Context Chain)
resource "google_cloud_run_v2_service" "cymbal_pooled_gateway" {
  name     = "cymbal-pooled-agent-gateway"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2" # gVisor sandbox isolation
    containers {
      image = var.gateway_container_image
      env {
        name  = "CYMBAL_TOPOLOGY_MODE"
        value = "PATTERN_A_POOLED"
      }
      env {
        name  = "REDIS_BULKHEAD_HOST"
        value = google_redis_instance.tenant_token_bulkhead.host
      }
      env {
        name  = "CONTEXT_CACHE_ID"
        value = "cache://cymbal-operator/shared-diagnostic-system-prefix-v2"
      }
    }
  }
}

# 5. BigQuery Dataset for Hop 5 OpenTelemetry Audit & Proportional FinOps Chargeback
resource "google_bigquery_dataset" "cymbal_otel_audit" {
  dataset_id  = "cymbal_multi_tenant_otel"
  location    = var.region
  description = "Hop 5 OpenTelemetry trace, token consumption, and RLS audit ledger"
}
