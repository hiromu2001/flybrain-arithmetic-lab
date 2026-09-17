#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

command -v python3 >/dev/null || { echo "Python 3.11+ is required."; exit 1; }
command -v node >/dev/null || { echo "Node.js 20+ is required."; exit 1; }

if [ ! -x backend/.venv/bin/python ]; then
  python3 -m venv backend/.venv
fi

backend/.venv/bin/python -m pip install -q -r backend/requirements.txt

if [ ! -d frontend/node_modules ]; then
  npm --prefix frontend install
fi

cleanup() {
  kill ${BACK_PID:-0} ${FRONT_PID:-0} 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(
  cd backend
  .venv/bin/python -m uvicorn main:app --reload --port 8000
) &
BACK_PID=$!

(
  cd frontend
  npm run dev
) &
FRONT_PID=$!

echo "FlyBrain Lab: http://localhost:5173"
wait
