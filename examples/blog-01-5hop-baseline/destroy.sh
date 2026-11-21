#!/usr/bin/env bash
# Clean teardown for Blog 1 (WS1 — 5-Hop Governance Baseline)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"

echo "==> Destroying Blog 1 (WS1) Terraform resources in project ${PROJECT_ID}..."
terraform -chdir="${SCRIPT_DIR}/terraform" destroy -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_uri=placeholder"
echo "✅ Blog 1 (WS1) teardown complete."
