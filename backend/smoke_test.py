from simulation import FlyBrainSimulation, TASKS


def main() -> None:
    sim = FlyBrainSimulation(seed=7)

    for task in TASKS:
        sim.set_task(task)
        for _ in range(40):
            state = sim.run_trial()

        assert state["task"] == task
        assert len(state["nodes"]) >= 250
        assert 0.0 <= state["recent_accuracy"] <= 1.0
        assert 0 <= state["correct_answer"] <= sim.ANSWER_MAX
        assert state["selected_answer"] in state["choices"]

    assert state["trial"] == 200
    assert state["flywire_ready"] is True
    assert state["simulated_neurons"] == len(state["nodes"])

    print("FlyBrain v2 smoke test passed")
    print(f"trial={state['trial']}")
    print(f"neurons={state['simulated_neurons']}")
    print(f"task={state['task']}")


if __name__ == "__main__":
    main()
