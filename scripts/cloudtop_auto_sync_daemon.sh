#!/usr/bin/env bash
# ==============================================================================
# scripts/cloudtop_auto_sync_daemon.sh — Autonomous Cloudtop Sync Daemon
#
# Eliminates manual dependencies by running autonomously on Cloudtop:
# 1. Periodically polls origin/main for new commits touching blogs/, docs/, or slides/.
# 2. Automatically compiles and syncs all 6 Google Docs in-place via internal `gdocs`.
# 3. Automatically refreshes Microsoft Word (.docx) exports under docs/word/.
# 4. Automatically updates slides/cloud_viewer_manifest.json with new SHA-256 hashes.
# 5. Automatically commits Word exports under Law 13 and pushes to both origin & fde.
#
# Usage:
#   ./scripts/cloudtop_auto_sync_daemon.sh --once            # Single-pass execution (ideal for cron)
#   ./scripts/cloudtop_auto_sync_daemon.sh --daemon [SEC]    # Continuous loop (default: 180s)
#   ./scripts/cloudtop_auto_sync_daemon.sh --install-cron   # Installs a 5-minute crontab on Cloudtop
#   ./scripts/cloudtop_auto_sync_daemon.sh --install-systemd# Installs & enables a user systemd service
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="/tmp/ge_blogs_cloudtop_sync.lock"
LOG_DIR="${HOME}/.local/state/ge-blogs"
LOG_FILE="${LOG_DIR}/sync_daemon.log"
POLL_INTERVAL=180
MODE="daemon"

mkdir -p "${LOG_DIR}"

log() {
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "[$ts] $*" | tee -a "${LOG_FILE}"
}

run_sync_cycle() {
  cd "${ROOT_DIR}"

  # Acquire non-blocking lock to prevent overlapping runs
  exec 200>"${LOCK_FILE}"
  if ! flock -n 200; then
    log "INFO: Another sync cycle is currently active. Skipping."
    return 0
  fi

  # Check git working tree cleanliness
  if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
    # If only docs/word or manifest are modified, allow them to be committed
    local dirty_files
    dirty_files="$(git status --porcelain --untracked-files=no | awk '{print $2}')"
    local non_doc_dirty=0
    for f in ${dirty_files}; do
      if [[ "${f}" != docs/word/* && "${f}" != "slides/cloud_viewer_manifest.json" && "${f}" != "data/cloudrun_deploy_receipt.json" ]]; then
        non_doc_dirty=1
        break
      fi
    done

    if [[ ${non_doc_dirty} -eq 1 ]]; then
      log "WARN: Uncommitted changes detected outside doc exports. Stashing or skipping."
      return 0
    fi
  fi

  # Fetch latest remote state
  git fetch origin main --quiet || {
    log "WARN: git fetch origin main failed. Will retry."
    return 0
  }

  local local_head remote_head
  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse origin/main)"

  local needs_build=0

  # If remote has new commits, check diff and fast-forward
  if [[ "${local_head}" != "${remote_head}" ]]; then
    log "INFO: Remote origin/main has new commits (${local_head:0:7} -> ${remote_head:0:7}). Fast-forwarding..."
    local changed_files
    changed_files="$(git diff --name-only "${local_head}" "${remote_head}")"

    # Fast-forward to origin/main
    git merge --ff-only origin/main --quiet || {
      log "WARN: Fast-forward merge failed. Resetting working tree receipt..."
      git checkout HEAD -- data/cloudrun_deploy_receipt.json 2>/dev/null || true
      git merge --ff-only origin/main --quiet
    }

    # Detect if any documentation or slide files changed
    for cf in ${changed_files}; do
      if [[ "${cf}" == blogs/* || "${cf}" == docs/* || "${cf}" == diagrams/* || "${cf}" == slides/* || "${cf}" == scripts/build_gcp_branded_blog_docs.py ]]; then
        needs_build=1
        log "INFO: Detected documentation change in: ${cf}"
        break
      fi
    done
  fi

  # Check if local word exports or manifest are missing or stale
  if [[ ! -f "${ROOT_DIR}/slides/cloud_viewer_manifest.json" ]]; then
    needs_build=1
  fi

  if [[ ${needs_build} -eq 1 ]]; then
    log "🚀 Executing build_gcp_branded_blog_docs.py via internal gdocs binary..."
    if python3 "${ROOT_DIR}/scripts/build_gcp_branded_blog_docs.py" --refresh-manifest >> "${LOG_FILE}" 2>&1; then
      log "✅ Successfully compiled and synced Google Docs + Word exports."
    else
      log "ERROR: build_gcp_branded_blog_docs.py failed. Inspect ${LOG_FILE}."
      return 1
    fi

    # Check if there are updated Word exports or manifest to commit
    local word_changes
    word_changes="$(git status --porcelain docs/word/ slides/cloud_viewer_manifest.json || true)"
    if [[ -n "${word_changes}" ]]; then
      log "📦 Staging and committing updated Word exports & cloud manifest..."
      git add docs/word/*.docx slides/cloud_viewer_manifest.json
      # Atomic Law 13: co-stage AGENTS.md
      git add AGENTS.md 2>/dev/null || true
      git checkout HEAD -- data/cloudrun_deploy_receipt.json 2>/dev/null || true

      git commit -m "chore(sync): automated cloudtop word and manifest update [skip ci]" >> "${LOG_FILE}" 2>&1 || true

      log "🔄 Pushing updated exports to origin/main..."
      git push origin main >> "${LOG_FILE}" 2>&1 || log "WARN: Failed to push to origin/main"

      log "🔄 Pushing updated exports to fde/main..."
      git push fde main >> "${LOG_FILE}" 2>&1 || log "WARN: Failed to push to fde/main"
      log "🎉 Dual-remote synchronization complete."
    else
      log "INFO: No Word export or manifest diff detected after build."
    fi
  else
    log "✓ Repository documentation is already synchronized with Google Drive."
  fi
}

install_cron() {
  local cron_cmd="*/5 * * * * /bin/bash ${ROOT_DIR}/scripts/cloudtop_auto_sync_daemon.sh --once >> ${LOG_FILE} 2>&1"
  local existing_cron
  existing_cron="$(crontab -l 2>/dev/null || true)"

  if echo "${existing_cron}" | grep -q "cloudtop_auto_sync_daemon.sh"; then
    echo "✅ Crontab entry already exists:"
    echo "${existing_cron}" | grep "cloudtop_auto_sync_daemon.sh"
  else
    (echo "${existing_cron}"; echo "${cron_cmd}") | crontab -
    echo "🎉 Successfully installed 5-minute crontab entry on Cloudtop:"
    echo "   ${cron_cmd}"
    echo "   Logs will append to: ${LOG_FILE}"
  fi
}

install_systemd() {
  local unit_dir="${HOME}/.config/systemd/user"
  local service_file="${unit_dir}/ge-blogs-syncd.service"
  mkdir -p "${unit_dir}"

  cat <<EOF > "${service_file}"
[Unit]
Description=GEAP Architecture Blogs & Google Workspace Auto-Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=${ROOT_DIR}
ExecStart=/bin/bash ${ROOT_DIR}/scripts/cloudtop_auto_sync_daemon.sh --daemon 180
Restart=always
RestartSec=30
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

[Install]
WantedBy=default.target
EOF

  echo "🎉 Written systemd user service to: ${service_file}"
  systemctl --user daemon-reload
  systemctl --user enable --now ge-blogs-syncd.service
  echo "✅ Enabled and started ge-blogs-syncd.service"
  systemctl --user status ge-blogs-syncd.service --no-pager || true
}

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --once)
      MODE="once"
      shift
      ;;
    --daemon)
      MODE="daemon"
      if [[ $# -gt 1 && "$2" =~ ^[0-9]+$ ]]; then
        POLL_INTERVAL="$2"
        shift 2
      else
        shift
      fi
      ;;
    --install-cron)
      install_cron
      exit 0
      ;;
    --install-systemd)
      install_systemd
      exit 0
      ;;
    -h|--help)
      echo "Usage: $0 [--once | --daemon [SEC] | --install-cron | --install-systemd]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "${MODE}" == "once" ]]; then
  run_sync_cycle
elif [[ "${MODE}" == "daemon" ]]; then
  log "Starting GEAP Cloudtop Sync Daemon (polling every ${POLL_INTERVAL}s)..."
  log "Target repository: ${ROOT_DIR}"
  log "Log file: ${LOG_FILE}"
  while true; do
    run_sync_cycle || log "WARN: Sync cycle encountered error; will retry in ${POLL_INTERVAL}s"
    sleep "${POLL_INTERVAL}"
  done
fi
