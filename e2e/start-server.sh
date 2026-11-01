#!/usr/bin/env bash
# (Re)starts the local e2e test server in the background. PID in /tmp/fgg-e2e.pid
cd "$(dirname "$0")/.."
[ -f /tmp/fgg-e2e.pid ] && kill "$(cat /tmp/fgg-e2e.pid)" 2>/dev/null && sleep 0.3 || true
nohup node e2e/server.mjs --port "${E2E_PORT:-4400}" --dist dist-e2e --db "${E2E_DB:-fgg_e2e}" > /tmp/fgg-e2e.log 2>&1 &
echo $! > /tmp/fgg-e2e.pid
sleep 0.8
