from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulation import FlyBrainSimulation

app = FastAPI(title="FlyBrain Arithmetic Lab API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulation = FlyBrainSimulation()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "FlyBrain Arithmetic Lab API",
        "status": "ok",
        "model": "flywire-ready-functional-lif-v2",
    }


@app.get("/state")
def state() -> dict[str, Any]:
    return simulation.snapshot()


def _handle_command(payload: dict[str, Any]) -> dict[str, Any] | None:
    command = payload.get("type")

    if command == "step":
        return simulation.run_trial()
    if command == "reset":
        simulation.reset()
        return simulation.snapshot()
    if command == "set_task":
        simulation.set_task(str(payload.get("value", "plus1")))
        return simulation.snapshot()
    if command == "set_learning_rate":
        simulation.set_learning_rate(float(payload.get("value", 0.16)))
        return simulation.snapshot()
    if command == "set_noise":
        simulation.set_noise(float(payload.get("value", 0.18)))
        return simulation.snapshot()
    return None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    auto = False
    speed = 1.0
    await websocket.send_json({**simulation.snapshot(), "auto": auto, "speed": speed})

    try:
        while True:
            timeout = max(0.05, 1.0 / max(speed, 0.1)) if auto else 3600.0
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
                payload = json.loads(raw)
                command = payload.get("type")

                if command == "set_auto":
                    auto = bool(payload.get("value", False))
                    await websocket.send_json({**simulation.snapshot(), "auto": auto, "speed": speed})
                    continue

                if command == "set_speed":
                    speed = float(payload.get("value", 1.0))
                    speed = min(max(speed, 0.25), 20.0)
                    await websocket.send_json({**simulation.snapshot(), "auto": auto, "speed": speed})
                    continue

                state = _handle_command(payload)
                if state is not None:
                    await websocket.send_json({**state, "auto": auto, "speed": speed})
            except asyncio.TimeoutError:
                if auto:
                    state = simulation.run_trial()
                    await websocket.send_json({**state, "auto": auto, "speed": speed})
    except WebSocketDisconnect:
        return
