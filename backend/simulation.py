from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Any

import numpy as np


TASKS: dict[str, dict[str, str]] = {
    "compare": {"label": "数量比較", "short": "MORE?"},
    "plus1": {"label": "+1", "short": "+1"},
    "minus1": {"label": "-1", "short": "-1"},
    "addition": {"label": "加算", "short": "+"},
    "subtraction": {"label": "減算", "short": "-"},
}


@dataclass
class TrialResult:
    task: str
    operand_a: int
    operand_b: int
    operator: str
    choices: list[int]
    correct_answer: int
    selected_answer: int
    selected_index: int
    correct: bool
    dopamine: float
    reward: float


class FlyBrainSimulation:
    """Biologically inspired, FlyWire-ready teaching/research sandbox.

    The topology rendered by the UI is a denser functional proxy, not yet the
    139k-neuron FlyWire connectome.  The API deliberately exposes region, cell
    type, neurotransmitter and membrane-state fields so a FlyWire-backed engine
    can replace this class without changing the frontend protocol.
    """

    REGION_SPECS = {
        "optic_left": ((0.12, 0.51), (0.075, 0.19), 36, "Visual projection", "acetylcholine"),
        "optic_right": ((0.88, 0.51), (0.075, 0.19), 36, "Visual projection", "acetylcholine"),
        "antennal": ((0.50, 0.70), (0.10, 0.06), 22, "Sensory interneuron", "acetylcholine"),
        "mushroom_left": ((0.36, 0.35), (0.14, 0.08), 44, "Kenyon cell", "acetylcholine"),
        "mushroom_right": ((0.64, 0.35), (0.14, 0.08), 44, "Kenyon cell", "acetylcholine"),
        "central": ((0.50, 0.52), (0.16, 0.11), 42, "Central complex neuron", "acetylcholine"),
        "mbon": ((0.50, 0.40), (0.11, 0.055), 20, "MBON", "glutamate"),
        "dan": ((0.50, 0.22), (0.12, 0.05), 18, "Dopaminergic neuron", "dopamine"),
        "output": ((0.50, 0.82), (0.12, 0.055), 22, "Descending neuron", "acetylcholine"),
    }

    ANSWER_MAX = 8
    FEATURE_SIZE = 16

    def __init__(self, seed: int = 7) -> None:
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        self.learning_rate = 0.16
        self.noise = 0.18
        self.exploration = 0.10
        self.task = "plus1"
        self.trial = 0
        self.correct_count = 0
        self.recent: list[bool] = []
        self.task_stats = {key: {"trial": 0, "correct": 0, "recent": []} for key in TASKS}

        # Task-specific plastic readout.  This is a compact proxy for learned
        # KC/MBON associations and is intentionally swappable for connectome data.
        self.weights = {
            key: self.rng.normal(0.0, 0.045, size=(self.FEATURE_SIZE, self.ANSWER_MAX))
            for key in TASKS
        }
        self.eligibility = {
            key: np.zeros((self.FEATURE_SIZE, self.ANSWER_MAX), dtype=float)
            for key in TASKS
        }

        self.node_templates = self._build_node_templates()
        self.last_nodes = self._quiet_nodes()
        self.last_result: TrialResult | None = None
        self.last_weight_change = 0.0

    def reset(self) -> None:
        task = self.task
        self.__init__(self.seed)
        self.task = task

    def set_task(self, task: str) -> None:
        if task in TASKS:
            self.task = task
            self.last_result = None
            self.last_weight_change = 0.0
            self.last_nodes = self._quiet_nodes()

    def set_learning_rate(self, value: float) -> None:
        self.learning_rate = float(np.clip(value, 0.0, 0.6))

    def set_noise(self, value: float) -> None:
        self.noise = float(np.clip(value, 0.0, 1.0))

    def _build_node_templates(self) -> list[dict[str, Any]]:
        templates: list[dict[str, Any]] = []
        index = 0
        for region, (center, spread, count, cell_type, neurotransmitter) in self.REGION_SPECS.items():
            cx, cy = center
            sx, sy = spread
            for local_i in range(count):
                # Gaussian packing gives a much more organic brain-like cloud than rings.
                x = float(np.clip(self.rng.normal(cx, sx * 0.42), 0.025, 0.975))
                y = float(np.clip(self.rng.normal(cy, sy * 0.42), 0.05, 0.95))
                templates.append(
                    {
                        "id": f"{region}-{local_i}",
                        "region": region,
                        "cell_type": cell_type,
                        "neurotransmitter": neurotransmitter,
                        "x": round(x, 4),
                        "y": round(y, 4),
                        "index": index,
                    }
                )
                index += 1
        return templates

    def _lif_activity(self, current: np.ndarray, steps: int = 16) -> tuple[np.ndarray, np.ndarray]:
        v = np.full(current.shape, -65.0, dtype=float)
        spikes = np.zeros(current.shape, dtype=float)
        v_rest = -65.0
        v_reset = -68.0
        threshold = -54.0
        tau = 12.0

        for _ in range(steps):
            v += (-(v - v_rest) + current * 16.0) / tau
            fired = v >= threshold
            spikes += fired.astype(float)
            v[fired] = v_reset

        peak = max(float(spikes.max()), 1.0)
        analog = 1.0 / (1.0 + np.exp(-(current - 0.42) * 5.0))
        activity = np.clip(0.62 * (spikes / peak) + 0.38 * analog, 0.0, 1.0)
        return activity, v

    def _make_problem(self) -> tuple[int, int, str, int]:
        if self.task == "compare":
            a = int(self.rng.integers(1, 7))
            b = int(self.rng.integers(1, 7))
            while b == a:
                b = int(self.rng.integers(1, 7))
            return a, b, "MORE", max(a, b)
        if self.task == "plus1":
            a = int(self.rng.integers(1, 7))
            return a, 1, "+", a + 1
        if self.task == "minus1":
            a = int(self.rng.integers(2, 8))
            return a, 1, "-", a - 1
        if self.task == "addition":
            a = int(self.rng.integers(1, 5))
            b = int(self.rng.integers(1, 5))
            while a + b > self.ANSWER_MAX:
                b = int(self.rng.integers(1, 5))
            return a, b, "+", a + b
        a = int(self.rng.integers(2, 8))
        b = int(self.rng.integers(1, a + 1))
        return a, b, "-", a - b

    def _make_choices(self, correct: int) -> list[int]:
        if self.task == "compare" and self.last_result is None:
            pass
        candidates = [n for n in range(0, self.ANSWER_MAX + 1) if n != correct]
        wrong_pool = sorted(candidates, key=lambda n: abs(n - correct))[:4]
        wrong = int(self.rng.choice(wrong_pool))
        choices = [correct, wrong]
        self.rng.shuffle(choices)
        return choices

    def _features(self, a: int, b: int) -> np.ndarray:
        f = np.zeros(self.FEATURE_SIZE, dtype=float)
        f[min(max(a, 1), 6) - 1] = 1.0
        if b > 0:
            f[6 + min(b, 6) - 1] = 1.0
        f[12] = a / 8.0
        f[13] = b / 8.0
        f[14] = 1.0 if a > b else 0.0
        f[15] = 1.0
        return f

    def run_trial(self) -> dict[str, Any]:
        a, b, operator, correct_answer = self._make_problem()
        choices = [a, b] if self.task == "compare" else self._make_choices(correct_answer)
        if self.task == "compare":
            correct_answer = max(a, b)

        features = self._features(a, b)
        task_weights = self.weights[self.task]
        scores = np.array([features @ task_weights[:, choice - 1] for choice in choices], dtype=float)
        scores += self.rng.normal(0.0, self.noise, size=2)

        if self.rng.random() < self.exploration:
            selected_index = int(self.rng.integers(0, 2))
        else:
            selected_index = int(np.argmax(scores))
        selected_answer = choices[selected_index]
        correct = selected_answer == correct_answer
        reward = 1.0 if correct else 0.0
        dopamine = reward

        eligibility = self.eligibility[self.task]
        eligibility *= exp(-1.0 / 4.0)
        answer_col = max(selected_answer - 1, 0)
        eligibility[:, answer_col] += features

        before = float(task_weights[:, answer_col].sum())
        if dopamine > 0.0:
            task_weights += self.learning_rate * dopamine * eligibility
            np.clip(task_weights, -1.5, 3.0, out=task_weights)
        after = float(task_weights[:, answer_col].sum())
        self.last_weight_change = (after - before) / self.FEATURE_SIZE

        self.trial += 1
        self.correct_count += int(correct)
        self.recent.append(correct)
        self.recent = self.recent[-100:]
        stats = self.task_stats[self.task]
        stats["trial"] += 1
        stats["correct"] += int(correct)
        stats["recent"].append(correct)
        stats["recent"] = stats["recent"][-100:]

        self.last_result = TrialResult(
            task=self.task,
            operand_a=a,
            operand_b=b,
            operator=operator,
            choices=choices,
            correct_answer=correct_answer,
            selected_answer=selected_answer,
            selected_index=selected_index,
            correct=correct,
            dopamine=dopamine,
            reward=reward,
        )
        self.last_nodes = self._active_nodes(a, b, scores, dopamine, correct)
        return self.snapshot()

    def _active_nodes(
        self,
        a: int,
        b: int,
        scores: np.ndarray,
        dopamine: float,
        correct: bool,
    ) -> list[dict[str, Any]]:
        task_drive = {
            "compare": 0.74,
            "plus1": 0.62,
            "minus1": 0.65,
            "addition": 0.82,
            "subtraction": 0.84,
        }[self.task]
        region_drive = {
            "optic_left": 0.54 + a / 16.0,
            "optic_right": 0.54 + b / 16.0,
            "antennal": 0.18,
            "mushroom_left": task_drive,
            "mushroom_right": task_drive * 0.94,
            "central": 0.58 + 0.18 * min((a + b) / 10.0, 1.0),
            "mbon": 0.48 + 0.20 * float(correct),
            "dan": 0.10 + dopamine * 0.95,
            "output": 0.48 + 0.15 * float(np.max(scores) > 0.0),
        }

        result: list[dict[str, Any]] = []
        for template in self.node_templates:
            region = template["region"]
            base = region_drive[region]
            current = np.array([np.clip(base + self.rng.normal(0.0, 0.16), 0.0, 1.35)])
            activity, voltage = self._lif_activity(current)
            item = dict(template)
            item["activity"] = round(float(activity[0]), 4)
            item["membrane_potential"] = round(float(voltage[0]), 2)
            result.append(item)
        return result

    def _quiet_nodes(self) -> list[dict[str, Any]]:
        result = []
        for template in self.node_templates:
            item = dict(template)
            item["activity"] = 0.03
            item["membrane_potential"] = -65.0
            result.append(item)
        return result

    def _abilities(self) -> dict[str, dict[str, float | int | str]]:
        abilities: dict[str, dict[str, float | int | str]] = {}
        for key, meta in TASKS.items():
            stats = self.task_stats[key]
            recent = stats["recent"]
            accuracy = sum(recent) / len(recent) if recent else 0.0
            abilities[key] = {
                "label": meta["label"],
                "trials": int(stats["trial"]),
                "accuracy": round(float(accuracy), 4),
            }
        return abilities

    def snapshot(self) -> dict[str, Any]:
        accuracy = self.correct_count / self.trial if self.trial else 0.0
        recent_accuracy = sum(self.recent) / len(self.recent) if self.recent else 0.0
        result = self.last_result

        return {
            "type": "state",
            "model": "flywire-ready-functional-lif-v2",
            "connectome_mode": "functional-proxy",
            "flywire_ready": True,
            "simulated_neurons": len(self.node_templates),
            "task": self.task,
            "task_label": TASKS[self.task]["label"],
            "available_tasks": [{"id": key, **value} for key, value in TASKS.items()],
            "trial": self.trial,
            "accuracy": round(accuracy, 4),
            "recent_accuracy": round(recent_accuracy, 4),
            "learning_rate": self.learning_rate,
            "noise": self.noise,
            "dopamine": result.dopamine if result else 0.0,
            "reward": result.reward if result else 0.0,
            "correct": result.correct if result else None,
            "operand_a": result.operand_a if result else 2,
            "operand_b": result.operand_b if result else 1,
            "operator": result.operator if result else "+",
            "input_count": result.operand_a if result else 2,
            "choices": result.choices if result else [3, 4],
            "correct_answer": result.correct_answer if result else 3,
            "selected_answer": result.selected_answer if result else None,
            "selected_index": result.selected_index if result else None,
            "weight_change": round(self.last_weight_change, 6),
            "nodes": self.last_nodes,
            "abilities": self._abilities(),
        }
