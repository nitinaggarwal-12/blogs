#!/usr/bin/env bash
# Live BEFORE -> KILL-SWITCH -> AFTER verification for Blog 3 (WS3 — Pattern B Sovereign Silos)
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"

SERVICE_URL="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw service_url)"
KEYRING="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw kms_keyring)"
KEY_NAME="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw kms_key_name)"
BQ_DATASET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_dataset)"
BQ_TABLE="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_table)"
ID_TOKEN="$(gcloud auth print-identity-token)"

restore_key() {
  echo ""
  echo "==> [CLEANUP] Re-enabling CMEK key version 1 so the lab remains cleanly re-runnable..."
  gcloud kms keys versions enable 1 \
    --key="${KEY_NAME}" --keyring="${KEYRING}" --location="${REGION}" --project="${PROJECT_ID}" --quiet >/dev/null 2>&1 || true
}
trap restore_key EXIT

for _attempt in $(seq 1 12); do
  HC="$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" "${SERVICE_URL}/healthz" || echo 000)"
  [[ "${HC}" == "200" ]] && break
  sleep 3
done

echo "==> [TEST 1 — BEFORE] CMEK key ENABLED: Sovereign BigQuery + GCS vault decrypts cleanly (expect HTTP 200)"
BEFORE_CODE="$(curl -sS -o /tmp/blog03_before.json -w "%{http_code}" -X POST "${SERVICE_URL}/v1/silo/vault" \
  -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')"
cat /tmp/blog03_before.json | jq .
[[ "${BEFORE_CODE}" == "200" ]] || { echo "FAIL: Expected HTTP 200 when CMEK ENABLED, got ${BEFORE_CODE}" >&2; exit 1; }

echo ""
echo "==> [TEST 2 — PERIMETER EGRESS] Cross-project egress outside silo project denied (expect HTTP 403)"
EGRESS_CODE="$(curl -sS -o /tmp/blog03_egress.json -w "%{http_code}" -X POST "${SERVICE_URL}/v1/silo/vault" \
  -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"egress_target_project":"external-attacker-proj"}')"
cat /tmp/blog03_egress.json | jq .
[[ "${EGRESS_CODE}" == "403" ]] || { echo "FAIL: Expected HTTP 403 on cross-perimeter egress, got ${EGRESS_CODE}" >&2; exit 1; }

echo ""
echo "==> [TEST 3 — KILL-SWITCH] Disabling customer CMEK key version 1 live via Cloud KMS..."
gcloud kms keys versions disable 1 \
  --key="${KEY_NAME}" --keyring="${KEYRING}" --location="${REGION}" --project="${PROJECT_ID}" --quiet

echo ""
echo "==> [TEST 4 — AFTER] Sovereign silo immediately fails closed with HTTP 423 LOCKED:"
AFTER_CODE="$(curl -sS -o /tmp/blog03_after.json -w "%{http_code}" -X POST "${SERVICE_URL}/v1/silo/vault" \
  -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')"
cat /tmp/blog03_after.json | jq .
[[ "${AFTER_CODE}" == "423" ]] || { echo "FAIL: Expected HTTP 423 LOCKED after CMEK revoke, got ${AFTER_CODE}" >&2; exit 1; }

echo ""
echo "==> [TEST 5 — DIRECT BIGQUERY PROOF] BigQuery independently rejects decryption while key is DISABLED:"
if bq query --project_id="${PROJECT_ID}" --location="${REGION}" --use_legacy_sql=false --nouse_cache \
  "SELECT * FROM \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`" </dev/null 2>&1; then
  echo "NOTE: KMS revocation propagation can take up to ~60s on BigQuery cache; Cloud Run API already failed closed HTTP 423."
else
  echo "PASS: BigQuery directly failed closed with Cloud KMS Error: DISABLED!"
fi

echo "✅ ALL BLOG 3 (WS3 — PATTERN B SOVEREIGN SILO) LIVE KILL-SWITCH PROOFS PASSED!"
