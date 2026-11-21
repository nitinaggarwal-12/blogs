#!/usr/bin/env bash
# Zero-modification 1-command deployment for Blog 2 (WS2 — Pattern A High-Density Pooled)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-cymbal-ge-examples}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "ERROR: No active GCP project found. Run: gcloud config set project <YOUR_PROJECT_ID>" >&2
  exit 1
fi

echo "==> [Blog 2 / WS2] Deploying Pattern A High-Density Pooled Architecture"
echo "    Project : ${PROJECT_ID}"
echo "    Region  : ${REGION}"

echo "==> [1/5] Enabling required APIs (BigQuery, Firestore, Cloud Run, Artifact Registry, Cloud Build)..."
gcloud services enable \
  artifactregistry.googleapis.com \
  bigquery.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  --project="${PROJECT_ID}" --quiet

echo "==> [2/5] Ensuring Artifact Registry repository '${AR_REPO}' exists..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Multi-Tenant Agentic AI runnable blog examples" \
    --project="${PROJECT_ID}" --quiet
fi

IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/blog-02-pooled:${IMAGE_TAG}"

echo "==> [3/5] Building container image via Cloud Build: ${IMAGE_URI}"
gcloud builds submit "${SCRIPT_DIR}/app" \
  --tag="${IMAGE_URI}" \
  --project="${PROJECT_ID}" --quiet

echo "==> [4/5] Applying Terraform stack..."
terraform -chdir="${SCRIPT_DIR}/terraform" init -input=false
terraform -chdir="${SCRIPT_DIR}/terraform" apply -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=${IMAGE_URI}"

BQ_DATASET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_dataset)"
BQ_TABLE="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_table)"

echo "==> [5/5] Seeding 7 realistic multi-tenant rows across 4 competing tenants into ${BQ_DATASET}.${BQ_TABLE}..."
bq query --project_id="${PROJECT_ID}" --use_legacy_sql=false --nouse_cache \
  "TRUNCATE TABLE \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`;
   INSERT INTO \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\` (entity_id, tenant_id, domain, record_summary, classification) VALUES
     ('ENT-FV-1001', 'finvault', 'Banking', 'OCC Tier-1 Wire Liquidity Ledger', 'CONFIDENTIAL'),
     ('ENT-FV-1003', 'finvault', 'Banking', 'Fedwire Settlement Audit Batch', 'CONFIDENTIAL'),
     ('ENT-RS-2001', 'retailstream', 'Retail', 'Peak Holiday Checkout Latency Trace', 'INTERNAL'),
     ('ENT-RS-2002', 'retailstream', 'Retail', 'POS Inventory Replenishment Feed', 'INTERNAL'),
     ('ENT-GX-3001', 'globex', 'Logistics', 'EMEA Freight Routing Manifest', 'CONFIDENTIAL'),
     ('ENT-MC-4001', 'medcore', 'Healthcare', 'Phase-III Clinical Trial Biomarker Index', 'RESTRICTED'),
     ('ENT-MC-4002', 'medcore', 'Healthcare', 'GxP Batch Release Signoff Log', 'RESTRICTED');"

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -n "${ACTIVE_ACCOUNT}" && "${ACTIVE_ACCOUNT}" != "(unset)" ]]; then
  if [[ "${ACTIVE_ACCOUNT}" == *"gserviceaccount.com" ]]; then
    CALLER_MEMBER="serviceAccount:${ACTIVE_ACCOUNT}"
  else
    CALLER_MEMBER="user:${ACTIVE_ACCOUNT}"
  fi
  for svc in $(gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" --filter="metadata.name~^cymbal-ws2-" --format="value(metadata.name)"); do
    gcloud run services add-iam-policy-binding "${svc}"       --project="${PROJECT_ID}" --region="${REGION}"       --member="${CALLER_MEMBER}" --role="roles/run.invoker" --quiet >/dev/null 2>&1 || true
  done
fi

echo ""
echo "✅ Blog 2 (WS2 — Pattern A Pooled) deployed and seeded! Run ./verify.sh to prove BEFORE -> AFTER RLS & 429 bulkheads."
