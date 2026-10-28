#!/usr/bin/env bash
# 1-Click Terraform Starter — Workstream 2.6: Pattern A (Pooled Multi-Tenancy)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../../scripts/deploy_terraform_1click.sh" --pattern a "$@"
