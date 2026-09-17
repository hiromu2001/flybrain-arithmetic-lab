from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Any

import numpy as np


@dataclass
class TrialResult:
    input_count: int
    choices: list[int]
    correct_answer: int
    selected_answer: int
    selected_index: int
    correct: bool
    dopamine: float
    reward: float


class FlyBrainSimulation:
    """Small biologically-inspired MVP.

    This is intentionally NOT a full FlyWire brain simulation.  It preserves the
    experiment loop and exposes stable interfaces so the internal network can be
    swapped for a connectome-backed implementation later.
    """

    REGION_LAYOUT = {
        "visual": (0.10, 0.50),
        "quantity": (0.28, 0.50),
        "kenyon": (0.48, 0.50),
        "mbon": (0.67, 0.42),
        "dan": (0.67, 0.72),
        "output": (0.87, 0.50),
    }

    def __init__(self, seed: int = 7) -> None:
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        self.learning_rate = 0.22
        self.noise = 0.22
        self.exploration = 0.12
        self.trial = 0
        self.correct_count = 0
        self.recent: list[bool] = []

        # Association strength: input quantity (1..4) -> represented answer (1..5).
        # Small random initialization means the fly starts close to chance.
        self.association = self.rng.normal(0.0, 0.05, size=(4, 5))
        self.eligibility = np.zeros((4, 5), dtype=float)

        # Fixed random projection used only to produce a compact KC population.
        self.q_to_kc = self.rng.normal(0.0, 0.65, size=(4, 18))
        self.last_nodes = self._quiet_nodes()
        self.last_result: TrialResult | None = None
        self.last_weight_change = 0.0

    def reset(self) -> None:
        self.__init__(self.seed)

    def set_learning_rate(self, value: float) -> None:
        self.learning_rate = float(np.clip(value, 0.0, 1.0))

    def set_noise(self, value: float) -> None:
        self.noise = float(np.clip(value, 0.0, 1.0))

    def _lif_activity(self, current: np.ndarray, steps: int = 14) -> np.ndarray:
        """Tiny LIF-style population update returning normalized spike activity."""
        v = np.full(current.shape, -65.0, dtype=float)
        spikes = np.zeros(current.shape, dtype=float)
        v_rest = -65.0
        v_reset = -68.0
        threshold = -54.0
        tau = 12.0
        dt = 1.0

        for _ in range(steps):
            dv = (-(v - v_rest) + current * 15.0) * (dt / tau)
            v += dv
            fired = v >= threshold
            spikes += fired.astype(float)
            v[fired] = v_reset

        peak = max(float(spikes.max()), 1.0)
        analog = 1.0 / (1.0 + np.exp(-(current - 0.45) * 5.0))
        return np.clip(0.65 * (spikes / peak) + 0.35 * analog, 0.0, 1.0)

    def _make_choices(self, correct: int) -> list[int]:
        candidates = [n for n in range(1, 6) if n != correct]
        wrong = int(self.rng.choice(candidates))
        choices = [correct, wrong]
        self.rng.shuffle(choices)
        return choices

    def run_trial(self) -> dict[str, Any]:
        input_count = int(self.rng.integers(1, 5))
        correct_answer = input_count + 1
        choices = self._make_choices(correct_answer)

        q = np.zeros(4, dtype=float)
        q[input_count - 1] = 1.0
        q += self.rng.normal(0.0, 0.04, size=4)
        q = np.clip(q, 0.0, 1.0)

        scores = np.array(
            [self.association[input_count - 1, choice - 1] for choice in choices],
            dtype=float,
        )
        scores += self.rng.normal(0.0, self.noise, size=2)

        if self.rng.random() < self.exploration:
            selected_index = int(self.rng.integers(0, 2))
        else:
            selected_index = int(np.argmax(scores))
        selected_answer = choices[selected_index]
        correct = selected_answer == correct_answer

        reward = 1.0 if correct else 0.0
        dopamine = reward

        # Eligibility decays, then the currently active input/selected output pair is tagged.
        self.eligibility *= exp(-1.0 / 4.0)
        self.eligibility[input_count - 1, selected_answer - 1] += 1.0

        before = float(self.association[input_count - 1, selected_answer - 1])
        if dopamine > 0.0:
            self.association += self.learning_rate * dopamine * self.eligibility
            self.association = np.clip(self.association, -1.5, 3.0)
        after = float(self.association[input_count - 1, selected_answer - 1])
        self.last_weight_change = after - before

        self.trial += 1
        if correct:
            self.correct_count += 1
        self.recent.append(correct)
        self.recent = self.recent[-100:]

        visual_current = np.linspace(0.22, 0.72, 8) * (0.55 + input_count / 6.0)
        visual_current += self.rng.normal(0.0, 0.06, size=8)
        visual = self._lif_activity(np.clip(visual_current, 0.0, 1.2))
        quantity = self._lif_activity(0.15 + q * 1.05)

        kc_current = np.maximum(0.0, q @ self.q_to_kc)
        kc_current = kc_current / max(float(kc_current.max()), 1e-6)
        kenyon = self._lif_activity(0.12 + kc_current * 0.95)

        mbon_current = np.array(
            [
                0.18 + 0.42 * max(scores[0], -0.2),
                0.18 + 0.42 * max(scores[1], -0.2),
                0.24 + 0.22 * float(correct),
                0.22 + 0.18 * float(not correct),
            ]
        )
        mbon = self._lif_activity(np.clip(mbon_current, 0.0, 1.2))
        dan = self._lif_activity(np.array([0.12 + dopamine, 0.08 + dopamine * 0.8, 0.10]))

        soft = np.exp(scores - np.max(scores))
        soft /= soft.sum()
        output = self._lif_activity(np.clip(0.12 + soft * 0.95, 0.0, 1.2))

        self.last_nodes = self._nodes_from_activity(
            visual=visual,
            quantity=quantity,
            kenyon=kenyon,
            mbon=mbon,
            dan=dan,
            output=output,
        )
        self.last_result = TrialResult(
            input_count=input_count,
            choices=choices,
            correct_answer=correct_answer,
            selected_answer=selected_answer,
            selected_index=selected_index,
            correct=correct,
            dopamine=dopamine,
            reward=reward,
        )
        return self.snapshot()

    def _quiet_nodes(self) -> list[dict[str, Any]]:
        return self._nodes_from_activity(
            visual=np.zeros(8),
            quantity=np.zeros(4),
            kenyon=np.zeros(18),
            mbon=np.zeros(4),
            dan=np.zeros(3),
            output=np.zeros(2),
        )

    def _nodes_from_activity(self, **groups: np.ndarray) -> list[dict[str, Any]]:
        nodes: list[dict[str, Any]] = []
        idx = 0
        for region, values in groups.items():
            cx, cy = self.REGION_LAYOUT[region]
            count = len(values)
            for local_i, activity in enumerate(values):
                angle = (2.0 * np.pi * local_i / max(count, 1)) + (0.35 if region == "dan" else 0.0)
                radius = 0.055 if count > 4 else 0.038
                nodes.append(
                    {
                        "id": f"{region}-{local_i}",
                        "region": region,
                        "activity": round(float(activity), 4),
                        "x": round(float(cx + np.cos(angle) * radius), 4),
                        "y": round(float(cy + np.sin(angle) * radius), 4),
                        "index": idx,
                    }
                )
                idx += 1
        return nodes

    def snapshot(self) -> dict[str, Any]:
        accuracy = self.correct_count / self.trial if self.trial else 0.0
        recent_accuracy = (
            sum(self.recent) / len(self.recent) if self.recent else 0.0
        )
        result = self.last_result

        return {
            "type": "state",
            "model": "functional-lif-mvp",
            "trial": self.trial,
            "accuracy": round(accuracy, 4),
            "recent_accuracy": round(recent_accuracy, 4),
            "learning_rate": self.learning_rate,
            "noise": self.noise,
            "dopamine": result.dopamine if result else 0.0,
            "reward": result.reward if result else 0.0,
            "correct": result.correct if result else None,
            "input_count": result.input_count if result else 2,
            "choices": result.choices if result else [3, 4],
            "correct_answer": result.correct_answer if result else 3,
            "selected_answer": result.selected_answer if result else None,
            "selected_index": result.selected_index if result else None,
            "weight_change": round(self.last_weight_change, 6),
            "nodes": self.last_nodes,
            "association": np.round(self.association, 3).tolist(),
        }
