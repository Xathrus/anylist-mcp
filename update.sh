#!/usr/bin/env bash
# Update anylist-mcp: pull latest code, rebuild, restart, verify health.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Pulling latest code"
git pull --ff-only
git submodule update --init --recursive

echo "== Rebuilding and restarting"
docker compose up -d --build

echo "== Waiting for health check"
for _ in $(seq 1 30); do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "Healthy. Running: $(git log -1 --format='%h %s')"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "Server did not become healthy. Recent logs:"
docker compose logs --tail 50 anylist-mcp
exit 1
