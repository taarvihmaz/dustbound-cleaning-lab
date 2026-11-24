# Mini Robot Vacuum

## 1. Mini Robot Vacuum

AI Fundamentals · Final project

Mini Robot Vacuum

Intelligent Cleaning Agent

Ernur, Sanzhar, Tahirkhan and Adilet

**Speaker notes**

The title of our course project is Mini Robot Vacuum — Intelligent Cleaning Agent. Dustbound is its playable version. The image shows the robot at the start of a real run in Lantern Library.

## 2. How the robot checks a tile

Breadth-first search (BFS)

Which route reaches the tile in the fewest moves?

Bayesian inference

After a sensor reading, how likely is dirt?

One-step MDP

Which action gives the higher expected reward?

In the campaign, a click sets the destination. The floor already contains the dirt.

**Speaker notes**

A Markov decision process (MDP) gives a reward for each action and state. Show the course demo in Streamlit. Step plans and follows the BFS route. Scan reports the observation and updates the belief. Decide compares both actions and changes the selected tile. In the campaign the player supplies a destination by clicking.

## 3. The shortest route

8 moves

The course room is 5 × 5. The robot starts at (0, 0) and inspects (0, 4).

Two walls block the direct route. BFS checks all cells one move away before checking cells two moves away.

Dashed line = route   ·   Striped cells = walls

**Speaker notes**

Rows and columns start at zero. Starting at (0, 0), the robot drops to row 2, moves across four columns, then climbs to (0, 4). Each step costs one. BFS uses a queue and saves the previous cell so it can rebuild the shortest route. Source: demo/console_transcript.txt.

## 4. What the sensor tells us

The course model starts with a 30% chance of dirt. It detects 80% of dirty tiles and gives a false alarm on 20% of clean tiles.

Positive reading

0.24 ÷ (0.24 + 0.14)

= 0.6315789

Negative reading

0.06 ÷ (0.06 + 0.56)

= 0.0967742

Each result is the chance that the tile is dirty after one reading.

**Speaker notes**

The fixed course demo and the optional noisy mode use the same model. The 0.30 prior is a teaching assumption. Bayes divides the probability of dirt and the reading by the probability of the reading. A positive result still leaves a chance that the tile is clean.

## 5. Clean or Move On?

The robot uses the chance of dirt to compare the rewards of its two actions.

Actual tile | Clean | Move On
Dirty | +10 | −8
Clean | −4 | +2

Chance above 25%

Clean gives the higher expected reward. The robot sweeps the tile.

Chance of 25% or less

The robot chooses Move On. The tile stays as it was.

Rewards are points for one action.

**Speaker notes**

Let p be the probability that the tile is dirty. Q(Clean) = 10p − 4(1 − p) = 14p − 4. Q(Move On) = −8p + 2(1 − p) = 2 − 10p. Clean wins for p above 0.25. At exactly 0.25, the policy uses Move On. Cleaning sets the state to clean. Skipping keeps the current state.

## 6. Cleaning a whole level

Sunken Bell Dock

Mirror Lake Boathouse

Click a patch to send the robot. The default sensor detects every patch. A new level opens only after the last patch is gone.

**Speaker notes**

In the default campaign sensor, a dirty tile always gives a positive reading. The optional noisy course sensor may miss the last patch. Inspect it again or switch sensors between inspections. The new level starts only after the last patch has been cleaned. Each level uses a new location from the catalogue of 158.

## 7. What the tests found

63 checks passed

38 Python tests and 25 JavaScript tests passed. They covered the route, the two sensor outcomes and the last-patch rule.

Noisy sensor experiment | Positive readings | Expected rate
1,000 dirty tiles | 793 (79.3%) | 80%
1,000 clean tiles | 180 (18.0%) | 20%

These are simulated sensor readings.

**Speaker notes**

The automated tests cover shortest paths, both Bayes results, action rewards, clicking bare floor, and waiting until the last real patch is removed. The noisy-sensor experiment drew 1,000 readings on dirty tiles and 1,000 on clean tiles. Its observed rates were 79.3% and 18.0%. These are results of a simulation, not measurements from a physical vacuum.

## 8. Team contribution statement

The team has yet to confirm each person’s completed work.

Suggested topics for the defense

Ernur

Show the BFS route around the walls.

Sanzhar

Explain the sensor and the Bayes calculation.

Tahirkhan

Compare the rewards for Clean and Move On.

Adilet

Run the demo and explain the test results.

AI helped with code, tests and writing. See the project’s AI usage declaration.

**Speaker notes**

The four team names were supplied for this project. The roles on this slide are suggestions for presenting the work. Each person should confirm their own completed work before submission. AI helped implement the code, prepare the tests and write the documents. The project includes an AI usage declaration and a contribution record.
