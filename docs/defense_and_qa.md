# Defense guide and questions

## Five minute demonstration

| Time | Suggested speaker | What to do and say |
|---|---|---|
| 0:00–1:10 | Ernur | Open the 5 × 5 course demo. Point out the start, target and two walls. Press **Step** once to plan and eight more times to move. The route needs four horizontal moves and a detour of two rows down and back up. |
| 1:10–2:05 | Sanzhar | With **Positive** and **Dirty** selected for this episode, press **Scan**. Out of 100 example tiles, expect 24 positive readings from dirty tiles and 14 from clean tiles. The share of positive readings from dirty tiles is 0.24 / 0.38. |
| 2:05–3:00 | Tahirkhan | Press **Decide**. Clean scores 4.84 in expectation and Move On scores −4.32. The actual tile is dirty, so cleaning it earns +10. Switch to a negative signal, reset and repeat. This time Move On wins. |
| 3:00–4:15 | Adilet | Open Dustbound on a 5 × 5 board. Point at bare floor first. The number of patches stays the same. Inspect the patches with the verified sensor. Watch the counter reach zero before the next level opens. |
| 4:15–5:00 | Team | Show the automated test results. Explain the ideal sensor used for ordinary play and the noisy sensor used for class. Finish with the AI declaration and each member’s actual contribution. |

## Questions

**What does the click do?** It selects one tile for inspection. Dirt is already on the floor when the level starts.

**Why is the route shortest?** BFS checks reachable tiles in order of distance. All four possible moves cost one step. The first route to the target has the fewest steps.

**What is the difference between 0.8 and 0.6315789?** The first is the chance that the course sensor gives a positive reading on a dirty tile. The second is the chance that the tile is dirty after a positive reading, given the 0.3 prior.

**Where does 0.0967742 come from?** A negative reading on dirty ground has joint probability 0.3 × 0.2 = 0.06. A negative reading on clean ground contributes 0.7 × 0.8 = 0.56. Divide 0.06 by their sum, 0.62.

**Why can the robot skip a dirty tile?** The policy receives only the updated probability. A noisy sensor can miss real dirt. After such a reading, skipping has the higher expected reward even though the actual outcome costs eight points.

**When are the actions tied?** Let p be the chance of dirt. Solve 14p − 4 = 2 − 10p. At p = 0.25, the code chooses Move On.

**What does one step mean here?** The policy scores one cleaning choice at the target. It counts the reward for that action only. The BFS route to reach the target can take several moves.

**Can a missed patch be removed later?** Yes. It stays visible and counted. Select it again for a fresh inspection. Each new inspection starts with the 0.3 teaching prior.

**How can we show the same result twice?** Use a forced positive or negative reading in class. A forced reading fixes the observation. Bayes and the action calculation still run. In noisy mode, the random seed lets a test repeat its run.

**What would improve the model?** Keep a belief for each tile across scans. Then compare the cost of scanning again with the cost of choosing the wrong action. A physical robot would also need measured sensor rates.
