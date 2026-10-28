#!/usr/bin/env bash
# 1-Click Terraform Blueprint — Workstream 4.6: Pattern C (Dynamic Hybrid & PSC Spokes)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../../scripts/deploy_terraform_1click.sh" --pattern c "$@"
