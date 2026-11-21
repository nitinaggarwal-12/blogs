# Blog 4 (WS4) — Runnable Pattern C Dynamic Hybrid Hub-and-Spoke & Zero-Downtime PSC Cutover

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/cloud-ai-fde/ge-blogs&cloudshell_working_dir=examples/blog-04-pattern-c-hybrid)

Self-contained, **zero-modification** deployment for [Blog 4: Pattern C — Dynamic Hybrid Hub-and-Spoke](../../blogs/ws4-pattern-c-hybrid-dynamic-tiering.md).

## What Gets Deployed
- **Two Isolated VPCs (Zero VPC Peering):** Central Hub VPC (`10.10.0.0/20`) and Enterprise Spoke VPC (`10.140.0.0/24`) — runs in a **single** GCP project by default (or pass `SPOKE_PROJECT_ID=<other-project>` for cross-project spokes).
- **Real Unidirectional Private Service Connect (PSC):** Spoke Serverless NEG → Regional Internal Application Load Balancer → `/28` PSC NAT Subnet & Producer Service Attachment (`ACCEPT_MANUAL`) → Hub PSC Consumer Endpoint.
- **Zero-Downtime Firestore Routing Table:** Named Firestore DB (`cymbal-hybrid-router-<id>`) + 3 authenticated Cloud Run Gen2 services (`hub-router`, `shared-pool`, `enterprise-spoke`).

## Quickstart (Zero Code Edits)

```bash
./deploy.sh    # Auto-detects active gcloud project, builds image, provisions VPC/PSC + Cloud Run (~4 min)
./verify.sh    # Proves BEFORE (shared_pool) -> atomic Firestore CAS promotion -> AFTER (enterprise_spoke)
./destroy.sh   # Cleanly removes all billable resources
```
