#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
cleanup() { trap - EXIT INT TERM; [[ -z "${FRONTEND_PID:-}" ]] || kill "$FRONTEND_PID" 2>/dev/null || true; [[ -z "${BACKEND_PID:-}" ]] || kill "$BACKEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
bash scripts/maven.sh package -DskipTests
java -jar backend/target/boundary-lab-1.0.0.jar > .tools/backend.log 2>&1 &
BACKEND_PID=$!
for attempt in {1..90}; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then cat .tools/backend.log; exit 1; fi
  if curl --fail --silent http://127.0.0.1:8080/api/session > /dev/null; then break; fi
  if [[ "$attempt" == 90 ]]; then echo 'Server startup timed out. See .tools/backend.log'; exit 1; fi
  sleep 1
done
VITE_SESSION_MODE=server "$ROOT/node_modules/.bin/vite" --host 127.0.0.1 &
FRONTEND_PID=$!
wait "$FRONTEND_PID"
