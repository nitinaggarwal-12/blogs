#!/usr/bin/env bash
# Zero-modification 1-command deployment for Blog 4 (WS4 — Pattern C Dynamic Hybrid & PSC Spokes)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
SPOKE_PROJECT_ID="${SPOKE_PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-cymbal-ge-examples}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "ERROR: No active GCP project found. Run: gcloud config set project <YOUR_PROJECT_ID>" >&2
  exit 1
fi

echo "==> [Blog 4 / WS4] Deploying Pattern C Dynamic Hybrid Hub-and-Spoke + Private Service Connect"
echo "    Hub Project   : ${PROJECT_ID}"
echo "    Spoke Project : ${SPOKE_PROJECT_ID:-${PROJECT_ID} (single-project mode)}"
echo "    Region        : ${REGION}"

echo "==> [1/4] Enabling required APIs (Compute/PSC, Firestore, Cloud Run, Artifact Registry, Cloud Build)..."
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
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
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/blog-04-hybrid:${IMAGE_TAG}"

echo "==> [3/4] Building shared Hub/Pool/Spoke container image via Cloud Build: ${IMAGE_URI}"
gcloud builds submit "${SCRIPT_DIR}/app" \
  --tag="${IMAGE_URI}" \
  --project="${PROJECT_ID}" --quiet

echo "==> [4/4] Applying Terraform stack (2 isolated VPCs + /28 PSC Bridge + Firestore Router + 3 Cloud Run services)..."
terraform -chdir="${SCRIPT_DIR}/terraform" init -input=false
terraform -chdir="${SCRIPT_DIR}/terraform" apply -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="spoke_project_id=${SPOKE_PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=${IMAGE_URI}"

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -n "${ACTIVE_ACCOUNT}" && "${ACTIVE_ACCOUNT}" != "(unset)" ]]; then
  if [[ "${ACTIVE_ACCOUNT}" == *"gserviceaccount.com" ]]; then
    CALLER_MEMBER="serviceAccount:${ACTIVE_ACCOUNT}"
  else
    CALLER_MEMBER="user:${ACTIVE_ACCOUNT}"
  fi
  for svc in $(gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" --filter="metadata.name~^cymbal-ws4-" --format="value(metadata.name)"); do
    gcloud run services add-iam-policy-binding "${svc}"       --project="${PROJECT_ID}" --region="${REGION}"       --member="${CALLER_MEMBER}" --role="roles/run.invoker" --quiet >/dev/null 2>&1 || true
  done
fi

echo ""
echo "✅ Blog 4 (WS4 — Pattern C Hybrid) deployed! Run ./verify.sh to prove zero-downtime Pool -> PSC Spoke cutover."
