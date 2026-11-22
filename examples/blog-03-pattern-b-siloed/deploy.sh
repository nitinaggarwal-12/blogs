#!/usr/bin/env bash
# Zero-modification 1-command deployment for Blog 3 (WS3 — Pattern B Sovereign Silos & CMEK Kill-Switch)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-cymbal-ge-examples}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "ERROR: No active GCP project found. Run: gcloud config set project <YOUR_PROJECT_ID>" >&2
  exit 1
fi

echo "==> [Blog 3 / WS3] Deploying Pattern B Sovereign Silo & CMEK Kill-Switch"
echo "    Project : ${PROJECT_ID}"
echo "    Region  : ${REGION}"

echo "==> [1/5] Enabling required APIs & initializing BigQuery encryption service agent..."
gcloud services enable \
  artifactregistry.googleapis.com \
  bigquery.googleapis.com \
  cloudbuild.googleapis.com \
  cloudkms.googleapis.com \
  compute.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  serviceusage.googleapis.com \
  storage.googleapis.com \
  --project="${PROJECT_ID}" --quiet

# Ensure BigQuery encryption service account exists before Terraform binds KMS IAM
bq show --encryption_service_account --project_id="${PROJECT_ID}" </dev/null >/dev/null 2>&1 || true

echo "==> [2/5] Ensuring Artifact Registry repository '${AR_REPO}' exists..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Multi-Tenant Agentic AI runnable blog examples" \
    --project="${PROJECT_ID}" --quiet
fi

IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/blog-03-silo:${IMAGE_TAG}"

echo "==> [3/5] Building container image: ${IMAGE_URI}"
if ! gcloud builds submit "${SCRIPT_DIR}/app" --tag="${IMAGE_URI}" --project="${PROJECT_ID}" --quiet; then
  if command -v docker >/dev/null 2>&1; then
    echo "    Cloud Build unavailable; building and pushing directly to Artifact Registry via Docker..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    docker build --platform linux/amd64 -t "${IMAGE_URI}" "${SCRIPT_DIR}/app"
    docker push "${IMAGE_URI}"
  else
    echo "    Retrying Cloud Build once after API propagation (10s)..."
    sleep 10
    gcloud builds submit "${SCRIPT_DIR}/app" --tag="${IMAGE_URI}" --project="${PROJECT_ID}" --quiet
  fi
fi

export PATH="${HOME}/.local/bin:${PATH}"
if ! terraform version 2>/dev/null | grep -q '^Terraform v'; then
  echo "==> Installing official Terraform 1.9.8 into ${HOME}/.local/bin (Cloud Shell ships a stub)..."
  mkdir -p "${HOME}/.local/bin"
  ARCH="$(uname -m)"
  if [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]]; then
    TF_ARCH="arm64"
    TF_SHA="f85868798834558239f6148834884008f2722548f84034c9b0f62934b2d73ebb"
  else
    TF_ARCH="amd64"
    TF_SHA="186e0145f5e5f2eb97cbd785bc78f21bae4ef15119349f6ad4fa535b83b10df8"
  fi
  TF_ZIP="/tmp/terraform_1.9.8_linux_${TF_ARCH}.zip"
  curl -fsSL "https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_${TF_ARCH}.zip" -o "${TF_ZIP}"
  echo "${TF_SHA}  ${TF_ZIP}" | sha256sum -c -
  unzip -qo "${TF_ZIP}" -d "${HOME}/.local/bin"
  rm -f "${TF_ZIP}"
  chmod +x "${HOME}/.local/bin/terraform"
fi

export GOOGLE_OAUTH_ACCESS_TOKEN="${GOOGLE_OAUTH_ACCESS_TOKEN:-$(gcloud auth print-access-token)}"

echo "==> [4/5] Applying Terraform stack (KMS CMEK + Encrypted BQ + Encrypted GCS + Sovereign VPC + Cloud Run)..."
terraform -chdir="${SCRIPT_DIR}/terraform" init -input=false
terraform -chdir="${SCRIPT_DIR}/terraform" apply -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=${IMAGE_URI}"

BQ_DATASET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_dataset)"
BQ_TABLE="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_table)"
GCS_BUCKET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw gcs_bucket)"

echo "==> [5/5] Seeding CMEK-encrypted vault records in BigQuery & GCS..."
bq query --project_id="${PROJECT_ID}" --location="${REGION}" --use_legacy_sql=false --nouse_cache \
  "TRUNCATE TABLE \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`;
   INSERT INTO \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\` (record_id, tenant_id, regulatory_scope, payload_summary) VALUES
     ('VAULT-FV-9001', 'finvault', 'OCC_TIER1_LEDGER', 'Sovereign Tier-1 Liquidity Attestation'),
     ('VAULT-FV-9002', 'finvault', 'FEDWIRE_AUDIT', 'CMEK-Protected Fedwire Settlement Snapshot');" </dev/null

printf 'Sovereign CMEK-encrypted artifact for Pattern B kill-switch verification.\n' \
  | gcloud storage cp - "gs://${GCS_BUCKET}/vault_attestation.txt" --project="${PROJECT_ID}" --quiet

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -n "${ACTIVE_ACCOUNT}" && "${ACTIVE_ACCOUNT}" != "(unset)" ]]; then
  if [[ "${ACTIVE_ACCOUNT}" == *"gserviceaccount.com" ]]; then
    CALLER_MEMBER="serviceAccount:${ACTIVE_ACCOUNT}"
  else
    CALLER_MEMBER="user:${ACTIVE_ACCOUNT}"
  fi
  for svc in $(gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" --format="value(metadata.name)" 2>/dev/null | grep -E '^cymbal-ws3-' || true); do
    gcloud run services add-iam-policy-binding "${svc}"       --project="${PROJECT_ID}" --region="${REGION}"       --member="${CALLER_MEMBER}" --role="roles/run.invoker" --quiet >/dev/null 2>&1 || true
  done
fi

echo ""
echo "✅ Blog 3 (WS3 — Pattern B Sovereign Silo) deployed and seeded! Run ./verify.sh to test the live CMEK kill-switch."
