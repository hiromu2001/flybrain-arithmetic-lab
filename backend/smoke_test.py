import math

from simulation import FlyBrainSimulation


def main() -> None:
    sim = FlyBrainSimulation(seed=7)
    for _ in range(200):
        state = sim.run_trial()

    assert state["trial"] == 200
    assert len(state["nodes"]) == 39
    assert 0.0 <= state["accuracy"] <= 1.0
    assert 0.0 <= state["recent_accuracy"] <= 1.0
    assert all(math.isfinite(value) for row in state["association"] for value in row)

    print("FlyBrain smoke test passed")
    print(f"trial={state['trial']}")
    print(f"recent_accuracy={state['recent_accuracy']:.3f}")
    print(f"last_dopamine={state['dopamine']:.2f}")


if __name__ == "__main__":
    main()
