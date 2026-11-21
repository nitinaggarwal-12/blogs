# Blog 1 (WS1) — Runnable 5-Hop Governance Baseline on Google Cloud

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/cloud-ai-fde/ge-blogs&cloudshell_working_dir=examples/blog-01-5hop-baseline)

Self-contained, **zero-modification** deployment for [Blog 1: Reference Architecture, Taxonomy & 5-Hop Baseline](../../blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md).

## What Gets Deployed
- **Hop 1 Edge WAF:** 2 live Cloud Armor policies (`before-open-edge` vs. `after-hop1-waf` with Priority `1000` `X-Tenant-ID` anti-spoofing `Deny-403` + OWASP SQLi/XSS).
- **Hop 1 Cryptographic Identity:** Cloud KMS asymmetric `EC_SIGN_P256_SHA256` key signing short-lived `TenantContext` JWTs.
- **Hop 4 AI Firewall:** 2 live Vertex AI Model Armor templates (`before-unprotected` vs. `after-firewall` blocking Prompt Injection, Malicious URIs, Dangerous content, and SDP PII).
- **Hop 1–5 Gateway:** Authenticated Cloud Run Gen2 FastAPI service (`--no-allow-unauthenticated`) invoking live Vertex AI `gemini-2.5-flash` with a dedicated least-privilege Service Account.

## Quickstart (Zero Code Edits)

```bash
./deploy.sh    # Auto-detects active gcloud project, builds image, applies Terraform (~3 min)
./verify.sh    # Runs live BEFORE -> AFTER Model Armor, Hop 1 spoof 403, and KMS + Vertex AI 200 proofs
./destroy.sh   # Cleanly removes billable resources
```
