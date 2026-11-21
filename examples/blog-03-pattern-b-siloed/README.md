# Blog 3 (WS3) — Runnable Pattern B Sovereign Silos & Live CMEK Kill-Switch on Google Cloud

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/cloud-ai-fde/ge-blogs&cloudshell_working_dir=examples/blog-03-pattern-b-siloed)

Self-contained, **zero-modification** deployment for [Blog 3: Pattern B — Zero-Trust Sovereign Silos](../../blogs/ws3-pattern-b-sovereign-silos.md).

## What Gets Deployed
- **Customer-Managed Encryption Key (CMEK) Kill-Switch:** Dedicated Cloud KMS keyring + symmetric CMEK key with automatic IAM grants to BigQuery and Cloud Storage encryption service agents.
- **CMEK-Encrypted Data Plane:** Encrypted BigQuery vault table + Uniform Bucket-Level Access GCS bucket (public access prevention enforced).
- **Dedicated Sovereign VPC + Cloud Run Gen2 Agent:** Enforces fail-closed `HTTP 423 LOCKED` whenever the CMEK key version is disabled and `HTTP 403` on cross-perimeter egress.
- **Optional Org-Level VPC-SC Perimeter:** Pass `-var="enable_vpc_sc=true" -var="access_context_policy_id=<ID>"` if deploying with Org Access Context Manager permissions.

## Quickstart (Zero Code Edits)

```bash
./deploy.sh    # Auto-detects active gcloud project, builds image, applies Terraform & seeds CMEK vault (~3 min)
./verify.sh    # Proves BEFORE (200 decrypt) -> live KMS disable -> AFTER (423 fail-closed) -> auto re-enable
./destroy.sh   # Cleanly removes billable resources
```
