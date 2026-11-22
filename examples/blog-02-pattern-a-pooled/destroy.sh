#!/usr/bin/env bash
# Clean teardown for Blog 2 (WS2 — Pattern A Pooled)
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"
export GOOGLE_OAUTH_ACCESS_TOKEN="${GOOGLE_OAUTH_ACCESS_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || true)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"

echo "==> Destroying Blog 2 (WS2) Terraform resources in project ${PROJECT_ID}..."
terraform -chdir="${SCRIPT_DIR}/terraform" destroy -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=placeholder"
echo "✅ Blog 2 (WS2) teardown complete."
