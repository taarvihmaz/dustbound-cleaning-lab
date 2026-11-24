from dataclasses import dataclass, field
import random
from .environment import Grid
from .bfs import search
from .bayes import infer, sensor_read
from .mdp import decide, transition, REWARDS

@dataclass
class Simulation:
    grid: Grid = field(default_factory=Grid)
    start: tuple = (0, 0)
    goal: tuple = (0, 4)
    dirty: bool = True
    seed: int = 7
    mode: str = "Positive"
    phase: str = field(default="READY", init=False)
    path: list = field(default_factory=list, init=False)
    trace: list = field(default_factory=list, init=False)
    log: list = field(default_factory=list, init=False)
    index: int = field(default=0, init=False)
    belief: object = field(default=None, init=False)
    decision: object = field(default=None, init=False)
    realized_reward: object = field(default=None, init=False)

    def __post_init__(self):
        if self.mode not in ("Positive", "Negative", "Random"):
            raise ValueError("Unknown sensor mode")
        self.rng = random.Random(self.seed)

    @property
    def position(self):
        return self.path[self.index] if self.path else self.start

    def step(self):
        if self.phase == "READY":
            result = search(self.grid, self.start, self.goal)
            self.path, self.trace = result.path or [], result.trace
            self.phase = "SCANNING" if len(self.path) == 1 else "MOVING" if self.path else "BLOCKED"
            self.log.append(f"BFS: {len(self.path)-1} moves" if self.path else "BFS: no route")
        elif self.phase == "MOVING":
            self.index += 1
            self.log.append(f"Move to {self.position}")
            if self.position == self.goal:
                self.phase = "SCANNING"
        elif self.phase == "SCANNING":
            self.scan()
        elif self.phase == "DECIDING":
            self.decide()

    def scan(self):
        if self.phase != "SCANNING":
            raise ValueError("Scan is allowed once, at the goal")
        positive = sensor_read(self.dirty, self.rng) if self.mode == "Random" else self.mode == "Positive"
        self.belief = infer(positive=positive)
        self.log.append(f"Bayes: {'positive' if positive else 'negative'}; posterior={self.belief.posterior:.7f}")
        self.phase = "DECIDING"

    def decide(self):
        if self.phase != "DECIDING":
            raise ValueError("Decision requires one observation")
        self.decision = decide(self.belief.posterior)
        before = "Dirty" if self.dirty else "Clean"
        self.realized_reward = REWARDS[before][self.decision.action]
        self.dirty = transition(before, self.decision.action) == "Dirty"
        self.log.append(f"Decision: {self.decision.action}; Q(Clean)={self.decision.q_clean:.7f}; Q(Move On)={self.decision.q_move_on:.7f}")
        self.log.append(f"Environment: {before} -> {'Dirty' if self.dirty else 'Clean'}; realized reward={self.realized_reward}")
        self.phase = "FINISHED"
