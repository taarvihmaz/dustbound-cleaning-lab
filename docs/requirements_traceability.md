# Requirements traceability

Source review: original DOCX main-document text was extracted and read directly on 23 November 2026. Source file hashes are recorded in source_manifest.json. The previous conversation was used for the approved plan, not as a replacement for the originals.

| Source requirement | Implementation or evidence |
|---|---|
| Final Project / Objective and Algorithms: at least three methods from different topics, working together | BFS route, Bayesian posterior and one-step expected-reward action in one Simulation episode |
| Implementation: functional prototype or simulation | app.py and demo_cli.py |
| Explanation: mechanism, choice and contribution of each method | technical_report.docx and README.md |
| Results and improvements | report results, test evidence and limitations |
| Source code and brief documentation | src/, tests/, README.md |
| Live demo and oral defense with Q&A | runnable UI, defense_and_qa.md and demo/video_script.md; actual student defense remains pending |
| Individual or group up to four; active participation | team_contributions.md; identity and contribution verification remain pending |
| Detailed Guidelines / Implementation Note: two states, two actions, one-step reward or one Bellman update permitted | mdp.py uses explicit transition and reward tables with V0=0 |
| Topic 19: 5×5, two walls, Dirty/Clean, BFS/Bayes/MDP | fixed course demo room and documented models |
| Inputs, key steps, outputs and explanation visible | map, queue trace, Bayes expression, reward/transition models and log |
| At least one test | pytest suite, including full positive and negative UI episodes |
| Explain AI-assisted code and label assumptions | ai_usage.md, report and UI captions |

The general document requires integration; the detailed guidelines allow separate mini-demonstrations. This project satisfies the stronger integrated interpretation. Neither original DOCX mandates a repository, a video, a slide count or a specific report length. These are additional deliverables requested by the user. Neither DOCX contains the previously mentioned numerical grading weights, so none are claimed here.

The start page now opens the optional Dustbound campaign. Select **Open the course demo · 5 × 5** to reproduce the original assessed experiment and the screenshots in the report.

The campaign accepts a clicked cell as the BFS goal. Its speech bubble displays observation, posterior, action choice and execution. The default campaign sensor has ideal contact detection. For Topic 19, use the fixed course demo or the noisy course sensor in the campaign to reproduce the specified likelihoods. In the campaign, actions change actual dirt and the last removal opens the next location.
