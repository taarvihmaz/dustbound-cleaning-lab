from dataclasses import dataclass
from .bayes import probability

STATES = ("Dirty", "Clean")
ACTIONS = ("Clean", "Move On")
REWARDS = {"Dirty": {"Clean": 10, "Move On": -8}, "Clean": {"Clean": -4, "Move On": 2}}
TRANSITIONS = {
    "Clean": {"Dirty": {"Dirty": 0., "Clean": 1.}, "Clean": {"Dirty": 0., "Clean": 1.}},
    "Move On": {"Dirty": {"Dirty": 1., "Clean": 0.}, "Clean": {"Dirty": 0., "Clean": 1.}}
}

@dataclass(frozen=True)
class Decision:
    action: str
    q_clean: float
    q_move_on: float
    next_dirty_probability: float

def decide(p_dirty):
    probability(p_dirty)
    belief = {"Dirty": p_dirty, "Clean": 1-p_dirty}
    # Horizon one: future value V_0 = 0. Transitions normalize the reward sum.
    q = {a: sum(belief[s] * sum(TRANSITIONS[a][s][n] * REWARDS[s][a]
             for n in STATES) for s in STATES) for a in ACTIONS}
    action = "Clean" if q["Clean"] > q["Move On"] else "Move On"
    next_p = sum(belief[s] * TRANSITIONS[action][s]["Dirty"] for s in STATES)
    return Decision(action, q["Clean"], q["Move On"], next_p)

def transition(state, action):
    if state not in STATES or action not in ACTIONS:
        raise ValueError("Unknown state or action")
    return max(TRANSITIONS[action][state], key=TRANSITIONS[action][state].get)
