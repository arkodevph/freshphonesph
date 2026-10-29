#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if [[ "${1:-}" != "--run" ]]; then
  if ! command -v systemd-run >/dev/null || ! systemctl --user show-environment >/dev/null 2>&1; then
    echo "The protected preview requires a running systemd user manager." >&2
    exit 1
  fi

  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=1536"
  export RAYON_NUM_THREADS=2
  export UV_THREADPOOL_SIZE=2
  export NEXT_TELEMETRY_DISABLED=1
  export NEXT_PUBLIC_PRESENTATION_MODE=true

  ulimit -c 0

  exec systemd-run --user --scope --quiet --collect \
    --unit=freshphones-web-presentation \
    --property=MemoryMax=4G \
    --property=MemorySwapMax=0 \
    --property=CPUQuota=200% \
    --property=CPUWeight=20 \
    --property=IOWeight=20 \
    --property=TasksMax=128 \
    bash "$PWD/scripts/preview-web-safe.sh" --run "$@"
fi

shift

preview_port=${1:-3000}

if [[ ! "$preview_port" =~ ^[0-9]+$ ]] || ((preview_port < 1 || preview_port > 65535)); then
  echo "Usage: pnpm --filter @fresh/web preview [port]" >&2
  exit 1
fi

echo "Building the local presentation once; pages will not compile while browsing."

pnpm --filter @freshphones/contracts build

pnpm --filter @fresh/web exec next build --webpack

runtime_root="$PWD/apps/web/.next/standalone/apps/web"

mkdir -p "$runtime_root/public" "$runtime_root/.next/static"

cp -R apps/web/public/. "$runtime_root/public/"

cp -R apps/web/.next/static/. "$runtime_root/.next/static/"

echo "Fresh Phones presentation: http://localhost:$preview_port"

export HOSTNAME=127.0.0.1
export PORT="$preview_port"
export NODE_ENV=production

exec node "$runtime_root/server.js"
