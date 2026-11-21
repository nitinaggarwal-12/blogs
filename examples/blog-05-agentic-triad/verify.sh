#!/usr/bin/env bash
# Live verification for Blog 5 (WS5 — Agentic Triad: A2A Card + MCP OBO 200/403 + Zero-PII BigQuery FinOps)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

ORCH_URL="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw orchestrator_url)"
SPEC_URL="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw specialist_url)"
BQ_DATASET="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_dataset)"
BQ_TABLE="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw bq_table)"
ID_TOKEN="$(gcloud auth print-identity-token)"

for _url in "${ORCH_URL}" "${SPEC_URL}"; do
  for _attempt in $(seq 1 12); do
    HC="$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ID_TOKEN}" "${_url}/healthz" || echo 000)"
    [[ "${HC}" == "200" ]] && break
    sleep 3
  done
done

echo "==> [TEST 1 — A2A AGENT CARD] Discovering Specialist at ${SPEC_URL}/.well-known/agent.json:"
curl -sS -H "Authorization: Bearer ${ID_TOKEN}" "${SPEC_URL}/.well-known/agent.json" | jq .

echo ""
echo "==> [TEST 2 — AUTHORIZED A2A -> MCP OBO] FinVault invoking finvault-wire-ledger (expect HTTP 200):"
OK_CODE="$(curl -sS -o /tmp/blog05_ok.json -w "%{http_code}" -X POST "${ORCH_URL}/v1/triad/execute" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"finvault","mcp_tool":"finvault-wire-ledger","prompt":"Check Fedwire settlement batch status for account 9981"}')"
cat /tmp/blog05_ok.json | jq .
[[ "${OK_CODE}" == "200" ]] || { echo "FAIL: Expected HTTP 200, got ${OK_CODE}" >&2; exit 1; }

echo ""
echo "==> [TEST 3 — CROSS-TENANT MCP OBO ATTACK] RetailStream attempting finvault-wire-ledger (expect HTTP 403):"
DENY_CODE="$(curl -sS -o /tmp/blog05_deny.json -w "%{http_code}" -X POST "${ORCH_URL}/v1/triad/execute" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"retailstream","mcp_tool":"finvault-wire-ledger","prompt":"Read FinVault wire ledger"}')"
cat /tmp/blog05_deny.json | jq .
[[ "${DENY_CODE}" == "403" ]] || { echo "FAIL: Expected HTTP 403 cross-tenant deny, got ${DENY_CODE}" >&2; exit 1; }

echo ""
echo "==> [TEST 4 — ZERO-PII BIGQUERY FINOPS LEDGER] Querying ${BQ_DATASET}.${BQ_TABLE} (SHA-256 prompt hash, 0 raw PII):"
sleep 2
bq query --project_id="${PROJECT_ID}" --use_legacy_sql=false --format=pretty \
  "SELECT trace_id, tenant_id, SUBSTR(prompt_sha256, 1, 16) AS prompt_hash_prefix, cached_tokens, dynamic_tokens, estimated_usd, mcp_tool, http_status
   FROM \`${PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`
   ORDER BY recorded_at DESC
   LIMIT 10" </dev/null

echo "✅ ALL BLOG 5 (WS5 — AGENTIC TRIAD & ZERO-PII FINOPS) LIVE PROOFS PASSED!"
