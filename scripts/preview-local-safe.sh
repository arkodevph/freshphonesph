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

preview_api_origin="http://localhost:4100"
if [[ "$preview_target" == "web" ]]; then
  if [[ -z "${FRESHPHONES_PREVIEW_API_ENV:-}" ]]; then
    export FRESHPHONES_PREVIEW_API_ENV="../api-ts/.env.preview"
    if [[ ! -f "$FRESHPHONES_PREVIEW_API_ENV" ]]; then
      export FRESHPHONES_PREVIEW_API_ENV="../api-ts/.env"
    fi
  fi
  preview_api_origin="$(node <<'JS'
const { readFileSync, existsSync } = require("node:fs");
const { parse } = require("../api-ts/node_modules/dotenv");
const api = parse(readFileSync(process.env.FRESHPHONES_PREVIEW_API_ENV || "../api-ts/.env"));
const web = parse(readFileSync(".env.local"));
const database = new URL(api.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
    !database.pathname.endsWith("_preview") || api.NODE_ENV === "production") {
  throw new Error("Local role previews require a local development database ending in _preview.");
}
if (!web.LOCAL_DEMO_PASSWORD || !existsSync("app/api/demo-login/route.ts")) {
  throw new Error("Restore the private local demo helper and its server-only credential before building this preview.");
}
const port = Number(api.PORT ?? 4100);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("The local API port is invalid.");
}
console.log(`http://localhost:${port}`);
JS
)"
  export NEXT_PUBLIC_LOCAL_PREVIEW=true
fi

export NODE_ENV=production
export FRESHPHONES_LOCAL_PREVIEW=true
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$preview_api_origin}"
export NEXT_PUBLIC_SYSTEM_URL="${NEXT_PUBLIC_SYSTEM_URL:-http://localhost:3000}"
export NEXT_PUBLIC_LANDING_URL="${NEXT_PUBLIC_LANDING_URL:-http://localhost:3001}"
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=2048"
export RAYON_NUM_THREADS=2
export UV_THREADPOOL_SIZE=2
export NEXT_TELEMETRY_DISABLED=1

ulimit -c 0

preview_dist=".next"
if [[ "$preview_target" == "web" ]]; then
  if [[ "$preview_action" == "build" ]]; then
    preview_active="$(cat .next-preview-active 2>/dev/null || true)"
    preview_dist=".next-preview-a"
    if [[ "$preview_active" == ".next-preview-a" ]]; then
      preview_dist=".next-preview-b"
    fi
  elif [[ -f .next-preview-ready ]]; then
    preview_dist="$(cat .next-preview-ready)"
  fi
  case "$preview_dist" in
    .next|.next-preview-a|.next-preview-b) ;;
    *) echo "Invalid local preview build directory." >&2; exit 1 ;;
  esac
  export FRESHPHONES_PREVIEW_DIST_DIR="$preview_dist"
fi

if [[ "$preview_action" == "build" ]]; then
  preview_unit="freshphones-$preview_target-build"
  preview_command=("$(command -v node)" node_modules/next/dist/bin/next build --webpack)
else
  if [[ ! -f "$preview_dist/BUILD_ID" || ! -f "$preview_dist/FRESHPHONES_LOCAL_PREVIEW" ]]; then
    echo "Build the preview first with pnpm --filter @fresh/$preview_target preview:build." >&2
    exit 1
  fi
  if [[ "$preview_target" == "web" ]]; then
    printf '%s\n' "$preview_dist" > .next-preview-active
  fi
  preview_port=3000
  if [[ "$preview_target" == "landing" ]]; then
    preview_port=3001
  fi
  preview_unit="freshphones-$preview_target-optimized-preview"
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
  touch "$preview_dist/FRESHPHONES_LOCAL_PREVIEW"
  if [[ "$preview_target" == "web" ]]; then
    printf '%s\n' "$preview_dist" > .next-preview-ready.tmp
    mv .next-preview-ready.tmp .next-preview-ready
  fi
fi
