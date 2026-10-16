#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

web_port=${1:-3000}

sudo systemctl start --no-block docker

deadline=$((SECONDS + 30))

until sudo -n timeout 3s docker info >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    echo "Docker is not ready. Showing startup jobs, service status and logs."

    sudo systemctl list-jobs --no-pager || true

    sudo systemctl status docker containerd --no-pager -l || true

    sudo journalctl -u docker -u containerd -n 40 --no-pager || true

    exit 1
  fi

  sleep 1
done

sudo docker build -f apps/web/Dockerfile -t freshphones-web .

container_ids=$(sudo docker ps --quiet)

for container_id in $container_ids; do
  image=$(sudo docker inspect --format '{{.Config.Image}}' "$container_id")

  if [[ "$image" != "freshphones-web" && "$image" != "freshphones-web:latest" ]]; then
    continue
  fi

  bindings=$(sudo docker port "$container_id" 3000/tcp 2>/dev/null || true)

  while IFS= read -r binding; do
    if [[ "${binding##*:}" == "$web_port" ]]; then
      sudo docker stop "$container_id"

      break
    fi
  done <<< "$bindings"
done

echo "Starting Fresh Phones at http://localhost:$web_port"

sudo docker run --detach --rm --log-driver local \
  -p "127.0.0.1:$web_port:3000" freshphones-web

for attempt in {1..30}; do
  if curl --fail --silent "http://localhost:$web_port/login" >/dev/null; then
    echo "Ready: http://localhost:$web_port/login"

    exit 0
  fi

  sleep 1
done

echo "The container started, but the login page did not become ready."

exit 1
