# Blog 2 (WS2) — Runnable Pattern A High-Density Pooled Architecture on Google Cloud

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/cloud-ai-fde/ge-blogs&cloudshell_working_dir=examples/blog-02-pattern-a-pooled)

Self-contained, **zero-modification** deployment for [Blog 2: Pattern A — High-Density Pooled Architecture](../../blogs/ws2-pattern-a-pooled-architecture.md).

## What Gets Deployed
- **Shared Multi-Tenant BigQuery Table + Native Row-Level Access Policy:** Seeded with 7 rows across 4 competing tenants (`finvault`, `retailstream`, `globex`, `medcore`) and guarded by `google_bigquery_row_access_policy` + parameterized queries.
- **Distributed Per-Tenant Noisy-Neighbor Bulkhead:** Dedicated named Firestore database (`cymbal-pool-limiter-<id>`) enforcing atomic per-tenant RPM caps (`HTTP 429` with `Retry-After`) without colliding with any existing `(default)` database.
- **gVisor Turn-Isolated Cloud Run Gen2 Pooled Runtime:** `max_instance_request_concurrency = 1` with deterministic `maxOutputTokens` clamping (`STANDARD -> 4,000`, `ENTERPRISE -> 16,000`).

## Quickstart (Zero Code Edits)

```bash
./deploy.sh    # Auto-detects active gcloud project, builds image, applies Terraform & seeds BigQuery (~3 min)
./verify.sh    # Proves BEFORE (7-row bleed) -> AFTER (2 FinVault rows) + HTTP 429 bulkhead isolation
./destroy.sh   # Cleanly removes all billable resources
```
