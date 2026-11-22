#!/usr/bin/env bash
# Zero-modification 1-command deployment for Blog 5 (WS5 — Agentic Triad A2A + MCP OBO + Zero-PII FinOps)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-cymbal-ge-examples}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "ERROR: No active GCP project found. Run: gcloud config set project <YOUR_PROJECT_ID>" >&2
  exit 1
fi

echo "==> [Blog 5 / WS5] Deploying Agentic Triad (A2A Orchestrator -> A2A Specialist -> MCP OBO Gateway + BQ FinOps)"
echo "    Project : ${PROJECT_ID}"
echo "    Region  : ${REGION}"

echo "==> [1/4] Enabling required APIs (Cloud Run, BigQuery, Artifact Registry, Cloud Build, IAM)..."
gcloud services enable \
  artifactregistry.googleapis.com \
  bigquery.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  serviceusage.googleapis.com \
  storage.googleapis.com \
  --project="${PROJECT_ID}" --quiet

echo "==> [2/4] Ensuring Artifact Registry repository '${AR_REPO}' exists..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Multi-Tenant Agentic AI runnable blog examples" \
    --project="${PROJECT_ID}" --quiet
fi

IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/blog-05-triad:${IMAGE_TAG}"

echo "==> [3/4] Building Agentic Triad container image: ${IMAGE_URI}"
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

echo "==> [4/4] Applying Terraform stack (3 authenticated Cloud Run services + Zero-PII BigQuery FinOps ledger)..."
terraform -chdir="${SCRIPT_DIR}/terraform" init -input=false
terraform -chdir="${SCRIPT_DIR}/terraform" apply -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=${IMAGE_URI}"

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -n "${ACTIVE_ACCOUNT}" && "${ACTIVE_ACCOUNT}" != "(unset)" ]]; then
  if [[ "${ACTIVE_ACCOUNT}" == *"gserviceaccount.com" ]]; then
    CALLER_MEMBER="serviceAccount:${ACTIVE_ACCOUNT}"
  else
    CALLER_MEMBER="user:${ACTIVE_ACCOUNT}"
  fi
  for svc in $(gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" --format="value(metadata.name)" 2>/dev/null | grep -E '^cymbal-ws5-' || true); do
    gcloud run services add-iam-policy-binding "${svc}"       --project="${PROJECT_ID}" --region="${REGION}"       --member="${CALLER_MEMBER}" --role="roles/run.invoker" --quiet >/dev/null 2>&1 || true
  done
fi

echo ""
echo "✅ Blog 5 (WS5 — Agentic Triad) deployed! Run ./verify.sh to prove A2A discovery, MCP OBO 200/403, and Zero-PII BQ FinOps."
