# Verification record

Run `python -m pytest -q` and `node --test tests/*.test.js` from the project directory. This run passed 38 Python tests and 25 Node tests. Both suites had zero failures and zero skips. The recorded outputs are the [Python JUnit file](test-results.xml) and the [Node test log](node-test-results.tap).

## Noisy sensor trial

The [seeded sensor test](../tests/sensor-trials.test.js) ran 2,000 separate inspections through the campaign engine. Every trial started a fresh 5 × 5 game in the same venue with the same cleaner and the noisy course sensor. Each seed produced one reading. The robot chose and executed an action before the test recorded the result.

| Ground at the time of inspection | Game seeds | Positive | Negative | Positive rate | Model rate |
|---|---|---:|---:|---:|---:|
| Dirty, first real patch | 1–1,000 | 793 | 207 | 79.3% | 80% |
| Clean, starting tile | 1,001–2,000 | 180 | 820 | 18.0% | 20% |

The test accepts each observed rate within five percentage points of the model value. It also checks that a positive signal led to Clean and a negative signal led to Move On in every trial. Run just this experiment with `node --test tests/sensor-trials.test.js`. Using the same seeds gives the same counts. The equal number of dirty and clean trials lets each rate be measured separately.

## Other checks

| Area | What was checked |
|---|---|
| Fixed course experiment | The 5 × 5, two-wall lab produces an eight-move shortest route and both required Bayes posteriors. The tests cover expected rewards, transitions and full Streamlit episodes. |
| Geometry | Each of the 158 venues has its own obstacle arrangement. On 5 × 5 boards these are distinct even under rotations and reflections. All walkable cells are connected at each supported size, covering 790 venue and size combinations. |
| Dirt placement | Dirt is placed once per level, on reachable tiles beyond the spawn point. The game draws each patch from that tile’s physical state. The tests compare the full array before and after a click on clean floor and through each stage of the inspection. |
| Sensors | Verified contact always reports the real tile state. The optional course sensor uses the 0.8/0.2 likelihoods. Tests cover true positives, true negatives, false alarms, missed patches and correction on a repeat inspection. |
| Execution | Cleaning a dirty tile removes exactly one patch. A decision that has yet to execute leaves the floor unchanged. Repeating an inspection on clean ground cannot advance the level. A missed patch stays visible, selectable and counted. |
| Campaign | The engine suite plays all 30 levels using each fixed size and the per-level random option. Every location requires the removal of all its patches. The tests cover fixed and rotating characters and a seeded level restart. |
| Browser interaction | The offline file was driven by mouse clicks on a blocked tile, bare floor, real dirt and a previously missed patch. The UI displayed the exact posteriors, respected pause and opened level two only after the final removal. The selected character carried over. |
| Large maps and art | At a 390-pixel viewport, the floor-plan picker selected a distant patch on a 100 × 100 board by its exact coordinates. The 158 playable fields and 158 gallery scenes rendered in four illustrated styles. A second check round-tripped 732 tile centres through screen coordinates and hit-testing. In all four styles, sampled pixels at a clean tile centre stayed the same after selection, and dirt stayed drawn after a missed inspection. Cleaning changed the patch pixels. |
| Offline and local launch | The offline browser check observed zero external HTTP requests and no uncaught JavaScript errors. In running Streamlit, navigation to the course demo, its BFS Step control and the return link worked. |

The 2 min 17 s campaign recording uses actual UI clicks and synthesized game audio. It shows a verified inspection on bare floor, removal of one patch with the verified sensor, a noisy miss on the final patch and a successful retry before level two. The recording uses seed 1. The final H.264 and AAC streams decoded through the end.

## Scope

The course probabilities and rewards are teaching assumptions. The verified contact sensor is an ideal detector used for campaign play. The noisy mode is a simulated instrument. Each inspection starts with the stated prior, including a repeat inspection of the same tile. Selection is controlled by the operator, so observed frequencies in a play session need not match the illustrative prior. Route length depends on the chosen destination. On small floors the available walking space caps the initial patch count.

## Browser course lab

The static course lab was also checked in a browser. Six complete episodes covered both sensor readings, all four actual rewards and a repeat of the same random seed. The fixed path took eight moves. Both posterior values matched the Python lab to seven decimal places. The controls blocked Scan and Decide when used out of order. The same page fit a 375-pixel-wide viewport.
