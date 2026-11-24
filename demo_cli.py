from src.simulation import Simulation
for mode in ("Positive", "Negative"):
    sim = Simulation(mode=mode)
    while sim.phase not in ("FINISHED", "BLOCKED"):
        sim.step()
    print(f"\n{mode} episode")
    print("\n".join(sim.log))
