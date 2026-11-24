"""A restrained English interface for the cleaning-agent simulation."""
from html import escape
from pathlib import Path

import streamlit as st

from src.simulation import Simulation
from src.mdp import REWARDS, TRANSITIONS, decide

st.set_page_config(page_title="Mini Robot Vacuum", page_icon=":material/cleaning_services:", layout="wide")
st.markdown(f"<style>{(Path(__file__).parent / 'assets/styles.css').read_text()}</style>", unsafe_allow_html=True)


def html(content):
    st.markdown(content, unsafe_allow_html=True)


def room_svg(sim):
    """Draw the map directly from simulation state; never reveal unobserved truth."""
    origin, size = 32, 80
    parts = ['<svg class="floorplan" viewBox="0 0 464 464" role="img" aria-label="Room map">',
             f'<title>Robot at {sim.position}; target at {sim.goal}</title>',
             '<desc>A five by five room. Two walls at row zero, column two and row one, column two. Blue lines mark the planned route. A dark disc marks the robot.</desc>',
             '<defs><pattern id="wall-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#deded8"/><path d="M0 0V7" stroke="#a9aaa3" stroke-width="2"/></pattern></defs>']
    for n in range(5):
        center = origin + n * size + size / 2
        parts.append(f'<text class="axis" x="{center}" y="19" text-anchor="middle">{n}</text>')
        parts.append(f'<text class="axis" x="17" y="{center+4}" text-anchor="middle">{n}</text>')
    for r in range(5):
        for c in range(5):
            x, y = origin + c * size, origin + r * size
            fill = 'url(#wall-hatch)' if (r, c) in sim.grid.walls else '#ffffff'
            parts.append(f'<rect x="{x}" y="{y}" width="{size}" height="{size}" fill="{fill}" stroke="#cecec7"/>')
    if sim.path:
        points = ' '.join(f'{origin+c*size+40},{origin+r*size+40}' for r,c in sim.path)
        parts.append(f'<polyline points="{points}" fill="none" stroke="#2455d6" stroke-width="3" stroke-dasharray="5 7" stroke-linecap="round" stroke-linejoin="round"/>')
    gr, gc = sim.goal
    gx, gy = origin + gc * size + 40, origin + gr * size + 40
    target_label = ('DIRTY' if sim.dirty else 'CLEAN') if sim.decision else 'TARGET'
    color = ('#95620c' if sim.dirty else '#27684f') if sim.decision else '#2455d6'
    parts.append(f'<rect x="{gx-32}" y="{gy-32}" width="64" height="64" fill="none" stroke="{color}" stroke-width="2"/>')
    parts.append(f'<text x="{gx}" y="{gy+28}" text-anchor="middle" font-size="8" fill="{color}" font-family="monospace">{target_label}</text>')
    rr, rc = sim.position
    rx, ry = origin + rc * size + 40, origin + rr * size + 40
    parts.append(f'<circle cx="{rx}" cy="{ry}" r="20" fill="#25282c" stroke="#ffffff" stroke-width="3"/><circle cx="{rx}" cy="{ry}" r="13" fill="none" stroke="#888d95"/><path d="M{rx+9} {ry-3}v6" stroke="white" stroke-width="2"/>')
    parts.append('</svg>')
    return ''.join(parts)


if "sim" not in st.session_state:
    st.session_state.sim = Simulation()
if "episode_settings" not in st.session_state:
    st.session_state.episode_settings = ("Positive", "Dirty", 7)
s = st.session_state.sim
# Widgets below are keyed so their current values are available before controls render.
mode = st.session_state.get("sensor_mode", "Positive")
truth = st.session_state.get("target_state", "Dirty")
seed = int(st.session_state.get("sensor_seed", 7))
settings = (mode, truth, seed)

phase = {"READY": "Ready", "MOVING": "Moving", "SCANNING": "At target", "DECIDING": "Observation received", "FINISHED": "Finished", "BLOCKED": "No route"}[s.phase]
html(f'<header class="project-header"><div><h1>Mini Robot Vacuum</h1><p>Navigation, uncertainty and a cleaning decision.</p></div><span class="phase">{phase}</span></header>')

buttons = st.columns([1, 1, 1, 1])
if buttons[0].button("Step", type="primary" if s.phase in ("READY", "MOVING") else "secondary",
                     disabled=s.phase in ("FINISHED", "BLOCKED"), use_container_width=True,
                     help="Advance one operation: plan, move, scan or decide."):
    s.step()
    st.rerun()
if buttons[1].button("Scan", type="primary" if s.phase == "SCANNING" else "secondary",
                     disabled=s.phase != "SCANNING", use_container_width=True,
                     help="Take one sensor reading at the target."):
    s.scan()
    st.rerun()
if buttons[2].button("Decide", type="primary" if s.phase == "DECIDING" else "secondary",
                     disabled=s.phase != "DECIDING", use_container_width=True,
                     help="Execute the action with the highest expected reward."):
    s.decide()
    st.rerun()
if buttons[3].button("Reset", use_container_width=True,
                     help="Clear this episode and apply the scenario settings below."):
    st.session_state.sim = Simulation(dirty=truth == "Dirty", seed=seed, mode=mode)
    st.session_state.episode_settings = settings
    st.rerun()

instructions = {
    "READY": "Press Step to find a route. Then advance one cell at a time.",
    "MOVING": f"{s.index} of {max(0, len(s.path)-1)} moves completed. Press Step to continue.",
    "SCANNING": "The robot has reached the target. Press Scan to take a reading.",
    "DECIDING": "Compare the expected rewards, then press Decide to apply the recommended action.",
    "FINISHED": "Episode finished. Change the scenario below, or press Reset to repeat it.",
    "BLOCKED": "The target is unreachable. Press Reset to start a new episode.",
}
html(f'<p class="instruction" role="status">{instructions[s.phase]}</p>')
if settings != st.session_state.episode_settings:
    st.info("Settings changed. Press Reset to apply them; the current episode has not changed.")

left, right = st.columns([1.2, 1], gap="large")
with left:
    html('<div class="section-heading"><h2>Room</h2><span>5 × 5 · two walls</span></div>')
    html(room_svg(s))
    html('<div class="legend"><span><i class="key robot-key"></i>Robot</span><span><i class="key target-key"></i>Target</span><span><i class="key wall-key"></i>Wall</span><span><i class="key route-key"></i>Route</span></div>')
    route = f'{len(s.path)-1} moves' if s.path else 'Not planned'
    html(f'<div class="map-facts"><span>Position <b>{s.position}</b></span><span>Target <b>{s.goal}</b></span><span>Shortest route <b>{route}</b></span></div>')

with right:
    p = s.belief.posterior if s.belief else .3
    signal = ('Positive reading' if s.belief.positive else 'Negative reading') if s.belief else 'Prior · no observation yet'
    html(f'<div class="section-heading"><h2>Dirt probability</h2></div><div class="probability">{p:.2%}</div><p class="reading-label">{signal}</p>')
    if s.belief:
        b = s.belief
        html(f'<div class="calculation">({b.dirty_likelihood:.1f} × 0.3) / ({b.dirty_likelihood:.1f} × 0.3 + {b.clean_likelihood:.1f} × 0.7)<br>= {b.numerator:.2f} / {b.evidence:.2f}<br>= <strong>{p:.7f}</strong></div>')
    else:
        html('<p class="note">The assumed chance of dirt is 30%. A sensor reading will update this estimate.</p>')
    html('<div class="section-heading decision-heading"><h2>Action comparison</h2><span>Expected reward</span></div>')
    d = s.decision or (decide(p) if s.belief else None)
    rows = ''
    for action in ('Clean', 'Move On'):
        value = f'{(d.q_clean if action == "Clean" else d.q_move_on):+.4f}' if d else '—'
        cls = 'preferred' if d and d.action == action else ''
        marker = '←' if cls else ''
        rows += f'<tr class="{cls}"><th scope="row">{action}</th><td>{value}</td><td aria-label="{"Higher expected reward" if cls else ""}">{marker}</td></tr>'
    html(f'<table class="action-table" aria-label="Expected action rewards"><tbody>{rows}</tbody></table>')
    if s.decision:
        outcome = 'The target was cleaned.' if d.action == 'Clean' else 'The target was skipped. Its state is unchanged.'
        html(f'<p class="decision-summary"><strong>{d.action}</strong> executed. {outcome}</p><dl class="outcome"><div><dt>Revealed state</dt><dd>{"Dirty" if s.dirty else "Clean"}</dd></div><div><dt>Actual reward</dt><dd>{s.realized_reward:+d}</dd></div></dl><p class="note">Expected reward accounts for uncertainty. Actual reward comes from the true state.</p>')
    elif d:
        html(f'<p class="decision-summary">Recommended: <strong>{d.action}</strong>.<br>Press Decide to execute. The target has not changed yet.</p>')
    else:
        html('<p class="note">Available after scanning. The action with the higher expected reward is selected.</p>')
    html(f'<p class="active-scenario">Active sensor mode: <strong>{s.mode}</strong></p>')

with st.expander("Scenario settings", expanded=False):
    setup = st.columns([1.15, 1.15, 1])
    setup[0].selectbox("Sensor mode", ["Positive", "Negative", "Random"], key="sensor_mode",
                       help="Positive and Negative force a reading. Random samples the sensor model.")
    setup[1].selectbox("Actual target state", ["Dirty", "Clean"], key="target_state",
                       help="Simulator setup only. The agent decides from the observation, not this state.")
    setup[2].number_input("Random seed", min_value=0, value=7, step=1, key="sensor_seed",
                         help="Used in Random mode. Reusing a seed repeats the same observation.")
    st.caption("Press Reset to apply these settings. Only the target cell can be dirty.")

with st.expander("Calculations and model", expanded=False):
    st.markdown("#### Navigation · BFS")
    st.write("BFS explores nearby cells first. With equal movement costs, it finds a shortest route around the walls.")
    if s.path:
        st.code(" → ".join(map(str, s.path)), wrap_lines=True)
        st.dataframe([{"Expanded cell": str(t["expanded"]), "Queue after removal": str(t["queue_after_pop"]), "Cells discovered": t["discovered"]} for t in s.trace], hide_index=True, use_container_width=True)
    else:
        st.caption("Plan a route to see the search steps.")
    st.markdown("#### Uncertainty · Bayesian inference")
    st.write("Assumed prior: 0.3 · Sensitivity: 0.8 · False positive rate: 0.2.")
    st.code("Positive: (0.8 × 0.3) / (0.8 × 0.3 + 0.2 × 0.7) = 0.6315789\nNegative: (0.2 × 0.3) / (0.2 × 0.3 + 0.8 × 0.7) = 0.0967742", wrap_lines=True)
    st.markdown("#### Action · one-step decision model")
    st.table([{"Actual state": state, **rewards} for state, rewards in REWARDS.items()])
    st.code("Q(Clean) = 14p − 4\nQ(Move On) = 2 − 10p\nChoose Clean if p > 0.25. At a tie, choose Move On.", wrap_lines=True)
    if d:
        st.write(f"For this observation: Q(Clean) = {d.q_clean:.7f}; Q(Move On) = {d.q_move_on:.7f}.")
    st.table([{"Action": action, "Before": state, "After": nxt, "Probability": prob} for action, states in TRANSITIONS.items() for state, outcomes in states.items() for nxt, prob in outcomes.items() if prob])
    st.caption("One-step horizon; terminal value is zero. Clean always cleans. Move On leaves the target unchanged and ends the episode. The decision uses only the Bayesian belief.")

html(f'<div class="section-heading log-heading"><h2>Activity log</h2><span>{len(s.log)} events</span></div>')
if s.log:
    events = ''.join(f'<tr><td class="event-number">{i+1:02d}</td><td>{escape(line)}</td></tr>' for i, line in enumerate(s.log))
    html(f'<div class="log-scroll" role="log" aria-label="Episode activity"><table class="log-table"><tbody>{events}</tbody></table></div>')
else:
    html('<p class="empty-log">No events yet.</p>')
html('<footer class="project-footer">AI Fundamentals · BFS / Bayes / one-step decision model<span>Educational simulation. Probabilities and rewards are assumptions.</span></footer>')
