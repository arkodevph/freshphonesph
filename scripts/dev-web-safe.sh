#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../apps/web"

if ! command -v systemd-run >/dev/null || ! systemctl --user show-environment >/dev/null 2>&1; then
  echo "The protected preview requires a running systemd user manager." >&2
  exit 1
fi

# Node's heap limit does not cover native compiler allocations or child processes.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=2048"
export RAYON_NUM_THREADS=2
export UV_THREADPOOL_SIZE=2
export NEXT_TELEMETRY_DISABLED=1

ulimit -c 0

exec systemd-run --user --scope --quiet --collect \
  --unit=freshphones-web-preview \
  --property=MemoryMax=3G \
  --property=MemorySwapMax=0 \
  --property=CPUQuota=150% \
  --property=CPUWeight=20 \
  --property=IOWeight=20 \
  --property=TasksMax=128 \
  "$(command -v node)" node_modules/next/dist/bin/next dev --webpack "$@"
