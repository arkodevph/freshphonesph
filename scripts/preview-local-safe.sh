#!/usr/bin/env bash
set -euo pipefail

preview_target="${1:-web}"
preview_action="${2:-start}"

if [[ "$preview_target" != "web" && "$preview_target" != "landing" ]] ||
  [[ "$preview_action" != "build" && "$preview_action" != "start" ]]; then
  echo "Usage: preview-local-safe.sh web|landing build|start" >&2
  exit 1
fi

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../apps/$preview_target"

if ! command -v systemd-run >/dev/null || ! systemctl --user show-environment >/dev/null 2>&1; then
  echo "The protected preview requires a running systemd user manager." >&2
  exit 1
fi

if [[ "$preview_target" == "web" ]]; then
  node <<'JS'
const { readFileSync, existsSync } = require("node:fs");
const { parse } = require("../api-ts/node_modules/dotenv");
const api = parse(readFileSync("../api-ts/.env"));
const web = parse(readFileSync(".env.local"));
const database = new URL(api.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
    !database.pathname.endsWith("_preview") || api.NODE_ENV === "production") {
  throw new Error("Local role previews require a local development database ending in _preview.");
}
if (!web.LOCAL_DEMO_PASSWORD || !existsSync("app/api/demo-login/route.ts")) {
  throw new Error("Restore the private local demo helper and its server-only credential before building this preview.");
}
JS
  export NEXT_PUBLIC_LOCAL_PREVIEW=true
fi

export NODE_ENV=production
export FRESHPHONES_LOCAL_PREVIEW=true
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4100}"
export NEXT_PUBLIC_SYSTEM_URL="${NEXT_PUBLIC_SYSTEM_URL:-http://localhost:3000}"
export NEXT_PUBLIC_LANDING_URL="${NEXT_PUBLIC_LANDING_URL:-http://localhost:3001}"
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=2048"
export RAYON_NUM_THREADS=2
export UV_THREADPOOL_SIZE=2
export NEXT_TELEMETRY_DISABLED=1

ulimit -c 0

if [[ "$preview_action" == "build" ]]; then
  preview_unit="freshphones-$preview_target-build"
  preview_command=("$(command -v node)" node_modules/next/dist/bin/next build --webpack)
else
  if [[ ! -f .next/BUILD_ID || ! -f .next/FRESHPHONES_LOCAL_PREVIEW ]]; then
    echo "Build the preview first with pnpm --filter @fresh/$preview_target preview:build." >&2
    exit 1
  fi
  preview_port=3000
  if [[ "$preview_target" == "landing" ]]; then
    preview_port=3001
  fi
  preview_unit="freshphones-$preview_target-preview"
  preview_command=("$(command -v node)" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "$preview_port")
fi

systemd-run --user --scope --quiet --collect \
  --unit="$preview_unit" \
  --property=MemoryMax=3G \
  --property=MemorySwapMax=0 \
  --property=CPUQuota=150% \
  --property=CPUWeight=20 \
  --property=IOWeight=20 \
  --property=TasksMax=128 \
  "${preview_command[@]}"

if [[ "$preview_action" == "build" ]]; then
  touch .next/FRESHPHONES_LOCAL_PREVIEW
fi
