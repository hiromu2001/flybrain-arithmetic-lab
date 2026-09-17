#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! pgrep -f "uvicorn main:app.*--port 8000" >/dev/null 2>&1; then
  (
    cd backend
    nohup .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/flybrain-backend.log 2>&1 &
  )
fi

if ! pgrep -f "vite.*5173" >/dev/null 2>&1; then
  (
    cd frontend
    nohup npm run dev -- --host 0.0.0.0 > /tmp/flybrain-frontend.log 2>&1 &
  )
fi

echo "FlyBrain Arithmetic Lab を起動しました。"
echo "Frontend: http://localhost:5173"
echo "Backend : http://localhost:8000"
