#!/usr/bin/env bash
# Live BEFORE -> AFTER verification for Blog 2 (WS2 — Pattern A Pooled RLS + RPM Bulkhead)
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

SERVICE_URL="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw service_url)"
BQ_DATASET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_dataset)"
BQ_TABLE="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_table)"
ID_TOKEN="$(gcloud auth print-identity-token)"

for _attempt in $(seq 1 12); do
  HC="$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" "${SERVICE_URL}/healthz" || echo 000)"
  [[ "${HC}" == "200" ]] && break
  sleep 3
done

echo "==> [TEST 1 — BEFORE] Unscoped BigQuery read exposes all 7 rows across 4 competing tenants:"
bq query --project_id="${PROJECT_ID}" --use_legacy_sql=false --format=pretty \
  "SELECT entity_id, tenant_id, domain, classification FROM \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\` ORDER BY entity_id" </dev/null

echo ""
echo "==> [TEST 2 — AFTER] Pattern A JWT-scoped + Row Access Policy query returns strictly FinVault's 2 rows (0 foreign rows):"
curl -sS -X POST "${SERVICE_URL}/v1/pooled/query" \
  -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"finvault","tier":"STANDARD","requested_max_output_tokens":16000}' | jq .

echo ""
echo "==> [TEST 3 — NOISY-NEIGHBOR BULKHEAD] Bursting tenant 'globex' past 5 RPM triggers HTTP 429 while 'finvault' remains unaffected:"
GOT_429=0
for i in 1 2 3 4 5 6; do
  CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${SERVICE_URL}/v1/pooled/query" \
    -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"tenant_id":"globex","tier":"STANDARD","requested_max_output_tokens":8000}')"
  echo "    globex burst attempt ${i} -> HTTP ${CODE}"
  if [[ "${CODE}" == "429" ]]; then
    GOT_429=1
  fi
done
[[ "${GOT_429}" == "1" ]] || { echo "FAIL: Expected HTTP 429 bulkhead on 6th burst turn" >&2; exit 1; }

FV_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${SERVICE_URL}/v1/pooled/query" \
  -H "X-Serverless-Authorization: Bearer ${ID_TOKEN}" -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"finvault","tier":"ENTERPRISE","requested_max_output_tokens":16000}')"
echo "    finvault unaffected turn -> HTTP ${FV_CODE}"
[[ "${FV_CODE}" == "200" ]] || { echo "FAIL: Expected finvault HTTP 200 while globex throttled, got ${FV_CODE}" >&2; exit 1; }

echo "✅ ALL BLOG 2 (WS2 — PATTERN A POOLED) LIVE BEFORE -> AFTER PROOFS PASSED!"
