#!/usr/bin/env bash
# Start local dev: Postgres (+ MinIO/MailHog) via Docker, then the web dev server.
set -euo pipefail

cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running."
  echo "Start it, then re-run this script:"
  echo "    sudo systemctl start docker"
  exit 1
fi

echo "==> Starting local infra (Postgres:5435, MinIO:9000/9001, MailHog:1025/8025)"
docker compose up -d

echo "==> Waiting for Postgres to be ready"
for i in $(seq 1 30); do
  if docker exec fresh-postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "    Postgres is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Postgres did not become ready in 30s. Check: docker compose logs postgres"
    exit 1
  fi
  sleep 1
done

echo "==> Starting web dev server (http://localhost:3000)"
exec pnpm --filter @fresh/web dev
