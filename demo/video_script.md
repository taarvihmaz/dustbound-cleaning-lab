# Video demonstration script

Target duration: 2 minutes 40 seconds. English narration. Record the actual local Streamlit window, with the terminal available for the test result. The times include short pauses for clicks and reading the screen. This script is not evidence that a video was recorded.

## 0:00–0:20 — Introduction

Open **Open the course demo · 5 × 5** from the Streamlit campaign page. Show the course application in READY state.

“This is Mini Robot Vacuum, an educational cleaning agent. It combines breadth-first search, Bayesian inference and a one-step decision model in one connected episode. The room has five rows, five columns and two walls.”

## 0:20–0:45 — Route

Press Step once, show the route and briefly open Calculations and model to show the BFS trace. Press Step eight more times.

“The robot starts at zero, zero and targets zero, four. BFS explores neighboring cells in distance order using a queue. The walls force a detour through row two. The shortest route takes eight moves. The robot now follows that route to the target.”

## 0:45–1:15 — Positive observation

Press Scan. Point to the explicit expression.

“The sensor is imperfect. The assumed prior is thirty percent, sensitivity is eighty percent and the false-positive rate is twenty percent. For a positive reading, Bayes gives zero point two four divided by zero point three eight. The resulting probability of dirt is approximately sixty-three point sixteen percent.”

## 1:15–1:45 — Decision and transition

Open the reward model and press Decide.

“The decision compares expected immediate rewards. Cleaning gives fourteen p minus four. Moving on gives two minus ten p. Here the values are about four point eight four and minus four point three two, so the agent cleans. Cleaning changes the target to Clean. The actual reward in this dirty episode is plus ten, which differs from the expected reward.”

## 1:45–2:15 — Negative comparison

Open Scenario settings, select Negative, press Reset and advance to Scan. Press Decide.

“After reset, a negative reading produces zero point zero six divided by zero point six two, approximately nine point six eight percent. Move On now has the greater expected reward. It skips the cell and ends this episode. The action depends on the Bayesian belief, not direct access to the true dirt state.”

## 2:15–2:40 — Evidence and limits

Show `python -m pytest -q`, then return to the UI.

“The automated suite checks shortest paths, Bayes calculations, decision boundaries, state transitions and complete user interface episodes. This is a small hypothetical model with one observation and one decision, not a full POMDP or a real robot controller. AI assisted with implementation and documentation, as disclosed in the project.”

## Recorded campaign walkthrough

The bundled film, `Dustbound_Showcase.mp4`, demonstrates the campaign. Its English captions follow this sequence.

| Time | On screen |
|---|---|
| 0:00 | Lantern Library. Choose Pip and a 5 × 5 map. Two real patches are already present. |
| 0:12 | Click bare floor. BFS routes to the selected tile. Verified contact reports no dirt. Both patches remain. |
| 0:34 | Click the first patch. The verified reading is positive, the posterior is 1 and Clean earns +10. One patch remains. |
| 0:58 | Switch to the noisy course sensor. A negative observation on the last patch gives posterior 0.0967742 and Move On earns −8. The level stays open. |
| 1:36 | Inspect the same patch again. A positive observation gives posterior 0.6315789. The robot chooses Clean. |
| 2:01 | The last patch disappears on execution. The new floor opens with three patches and the same character. |
| 2:12–2:17 | Pause on the next level. |

Both noisy observations were sampled during the seeded recording. During a live presentation, forcing the signs will reproduce the two calculations on demand.
