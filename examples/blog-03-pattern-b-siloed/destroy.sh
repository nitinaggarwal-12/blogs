#!/usr/bin/env bash
# Clean teardown for Blog 3 (WS3 — Pattern B Sovereign Silos)
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"
export GOOGLE_OAUTH_ACCESS_TOKEN="${GOOGLE_OAUTH_ACCESS_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || true)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"

echo "==> Destroying Blog 3 (WS3) Terraform resources in project ${PROJECT_ID}..."
terraform -chdir="${SCRIPT_DIR}/terraform" destroy -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=placeholder"
echo "✅ Blog 3 (WS3) teardown complete (note: GCP retains KMS keyrings in disabled state with zero billing)."
