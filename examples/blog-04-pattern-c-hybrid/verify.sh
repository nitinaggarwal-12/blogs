#!/usr/bin/env bash
# Live BEFORE -> ATOMIC CUTOVER -> AFTER verification for Blog 4 (WS4 — Pattern C Dynamic Hybrid)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUB_URL="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw hub_router_url)"
PSC_ATTACHMENT="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw psc_service_attachment)"
PSC_IP="$(terraform -chdir="${SCRIPT_DIR}/terraform" output -raw hub_psc_consumer_ip)"
ID_TOKEN="$(gcloud auth print-identity-token)"

echo "==> Hub Router URL     : ${HUB_URL}"
echo "==> PSC Attachment     : ${PSC_ATTACHMENT}"
echo "==> Hub PSC Endpoint IP: ${PSC_IP}"

echo ""
echo "==> [TEST 1 — BEFORE] Standard tenant 'retailstream' hits single Hub URL -> routed to shared_pool:"
BEFORE_JSON="$(curl -sS -X POST "${HUB_URL}/v1/hybrid/turn" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"retailstream","prompt":"Analyze checkout conversion drop"}')"
echo "${BEFORE_JSON}" | jq .
echo "${BEFORE_JSON}" | jq -e '.backend_response.executed_by_role == "shared_pool"' >/dev/null

echo ""
echo "==> [TEST 2 — LIVE ATOMIC PROMOTION] Promoting 'retailstream' (Standard Pool -> Enterprise PSC Spoke) in Firestore:"
curl -sS -X POST "${HUB_URL}/v1/admin/promote" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"retailstream"}' | jq .

echo ""
echo "==> [TEST 3 — AFTER] Exact same Hub URL immediately routes 'retailstream' to enterprise_spoke (0 dropped turns):"
AFTER_JSON="$(curl -sS -X POST "${HUB_URL}/v1/hybrid/turn" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"retailstream","prompt":"Analyze checkout conversion drop post-cutover"}')"
echo "${AFTER_JSON}" | jq .
echo "${AFTER_JSON}" | jq -e '.backend_response.executed_by_role == "enterprise_spoke" and .hub_route.topology == "PATTERN_C_HYBRID_PSC_SPOKE"' >/dev/null

echo "✅ ALL BLOG 4 (WS4 — PATTERN C HYBRID PSC CUTOVER) LIVE PROOFS PASSED!"
