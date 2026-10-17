---
trigger: always_on
description: Canonical Verified Working google.com BeyondCorp (*.cr.gclb.goog) URLs in project ramp-portal-dev (248990048888, us-west1) & Mandatory Synchronous 2-Project Cloud Run Deployment Gate
---

# Canonical Verified Working google.com BeyondCorp (`*.cr.gclb.goog`) URLs & Synchronous 2-Project Deployment Gate (`Rule 56`)

- **GCP Runtime Project ID**: `ramp-portal-dev` (`248990048888`, `us-west1`)
- **GCP Image Build Project ID**: `nitina-ggarwal-sandbox-647724` (`us-central1-docker.pkg.dev/nitina-ggarwal-sandbox-647724/cloud-run-source-deploy`)
- **Domain Pattern**: `https://<service>-248990048888.cr.gclb.goog`

| Service | Verified Working `google.com` BeyondCorp URL | Baseline / Active Revision |
| :--- | :--- | :--- |
| `ge-demos` | [https://ge-demos-248990048888.cr.gclb.goog](https://ge-demos-248990048888.cr.gclb.goog/) | `ge-demos-00074-ctb` (`ge-demos-00003-w5f`) |
| `askaioce` | [https://askaioce-248990048888.cr.gclb.goog](https://askaioce-248990048888.cr.gclb.goog/) | `askaioce-00002-79g` |
| `gantrypulse` | [https://gantrypulse-248990048888.cr.gclb.goog](https://gantrypulse-248990048888.cr.gclb.goog/) | `gantrypulse-00066-xqr` (`gantrypulse-00001-mww`) |
| `merck-a2a-shield` | [https://merck-a2a-shield-248990048888.cr.gclb.goog](https://merck-a2a-shield-248990048888.cr.gclb.goog/) | `merck-a2a-shield-00004-pfs` |
| `a2a-gateway` | [https://a2a-gateway-248990048888.cr.gclb.goog](https://a2a-gateway-248990048888.cr.gclb.goog/) | `a2a-gateway-00008-g7f` |
| `pharma-dossier-harmonizer` | [https://pharma-dossier-harmonizer-248990048888.cr.gclb.goog](https://pharma-dossier-harmonizer-248990048888.cr.gclb.goog/) | `pharma-dossier-harmonizer-00001-vhk` |
| `pharma-real-world-evidence` | [https://pharma-real-world-evidence-248990048888.cr.gclb.goog](https://pharma-real-world-evidence-248990048888.cr.gclb.goog/) | `pharma-real-world-evidence-00001-bvn` |
| `dashboard` | [https://dashboard-248990048888.cr.gclb.goog](https://dashboard-248990048888.cr.gclb.goog/) | `dashboard-00002-hjr` |
| `promptcanvas` | [https://promptcanvas-248990048888.cr.gclb.goog](https://promptcanvas-248990048888.cr.gclb.goog/) | `promptcanvas-00046-2h7` (`promptcanvas-00002-d44`) |
| `scorex` | [https://scorex-248990048888.cr.gclb.goog](https://scorex-248990048888.cr.gclb.goog/) | `scorex-00026-vd4` (`scorex-00002-2v7`) |
| `zyvoriq` | [https://zyvoriq-248990048888.cr.gclb.goog](https://zyvoriq-248990048888.cr.gclb.goog/) | `zyvoriq-00002-ss6` (`zyvoriq-00001-252`) |
| `a2a-ge-orchestrator` | [https://a2a-ge-orchestrator-248990048888.cr.gclb.goog](https://a2a-ge-orchestrator-248990048888.cr.gclb.goog/) | `a2a-ge-orchestrator-00008-vgv` |
| `a2a-remote-peer` | [https://a2a-remote-peer-248990048888.cr.gclb.goog](https://a2a-remote-peer-248990048888.cr.gclb.goog/) | `a2a-remote-peer-00010-4t2` |
| `ge-blogs` | [https://ge-blogs-248990048888.cr.gclb.goog](https://ge-blogs-248990048888.cr.gclb.goog/) | `ge-blogs-00009-vmt` (`ge-blogs-00003-lmh`) |

## Mandatory Synchronous 2-Project Cloud Run Deployment & Post-Deploy Readiness Verification Gate (`Rule 56`)

Whenever deploying or updating **any** Cloud Run service in `ramp-portal-dev` (`248990048888`, `us-west1`):

1. **Strict Ban on `gcloud run deploy --source . --project=ramp-portal-dev`**:
   - Never invoke `gcloud run deploy <service> --source .` directly against `ramp-portal-dev`. Corporate IAM in `ramp-portal-dev` denies `storage.buckets.create` (`HTTPError 403` on `gs://run-sources-*`).
   - Always execute the **2-Project Build + Image Update Pipeline** (e.g., `scripts/deploy_ge_demos_cloudrun.sh`):
     1. **Step 1 (Build Image in Sandbox)**: `gcloud builds submit --project=nitina-ggarwal-sandbox-647724` pushing `us-central1-docker.pkg.dev/nitina-ggarwal-sandbox-647724/cloud-run-source-deploy/<service>:<TAG>`.
     2. **Step 2 (Update Cloud Run by Image URI)**: `gcloud run services update <service> --project=ramp-portal-dev --region=us-west1 --image=us-central1-docker.pkg.dev/nitina-ggarwal-sandbox-647724/cloud-run-source-deploy/<service>:<TAG>`.

2. **Strict Ban on Fire-and-Forget Background (`nohup ... &`) Cloud Run Deploys**:
   - Never launch a Cloud Run build or deploy in a detached background `nohup ... &` shell and end the turn before completion.
   - Every Cloud Run deployment must execute **synchronously to completion** within the active turn and verify all 4 post-deploy readiness gates before reporting success:
     1. `status.latestReadyRevisionName === status.latestCreatedRevisionName`
     2. `status.conditions[Ready].status === 'True'`
     3. `status.traffic[0].percent === 100`
     4. Container startup probe verified in Cloud Logging (`Default STARTUP TCP/HTTP probe succeeded`) and persisted to `data/cloudrun_deploy_receipt.json`.
