/* UI for the live campaign and the field-guide gallery. */
(() => {
  "use strict";

  const el = id => document.getElementById(id);
  const write = (id, value) => { el(id).textContent = value; };
  const pad = value => String(value).padStart(2, "0");
  const signed = value => value > 0 ? "+" + value : String(value);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const soundButtons = ["menu-sound", "play-sound", "pause-sound"].map(el);
  const tiers = ["Easy", "Moderate", "Challenging", "Hard", "Expert"];
  const durations = {plan:520, move:240, scan:550, sensor:1700, bayes:4200, decision:1900, result:1700, between:1500};
  const phases = {
    select:"Choose a tile", plan:"Planning the route", move:"On the way", scan:"Taking a sample",
    sensor:"Sensor reading", bayes:"Updating the belief", decision:"Choosing an action", result:"Inspection complete",
    between:"Location complete", complete:"Campaign complete"
  };
  let hoverCell = null;
  let keyboardCell = null;
  let lastBubblePosition = "";
  let state = null;
  let gallery = 0;
  let journal = [];
  let speed = Number(el("speed").value);
  let elapsed = 0;
  let lastTime = 0;
  let artTime = 0;
  let galleryTime = 0;
  let lastDraw = -Infinity;
  let redraw = true;
  let moveFrom = null;
  let moveAt = 0;
  let audio;
  let master;
  let lastFootstep = -Infinity;
  let soundOn = true;
  try { soundOn = localStorage.getItem("dustbound-sound") !== "off"; } catch { /* Local files may disallow storage. */ }

  const sensorHelp = {
    verified: "Reads the floor exactly. A dirty tile always gives a positive reading.",
    simulated: "Course model. It detects 80% of dirty tiles and signals on 20% of clean tiles. You can recheck a missed patch.",
    positive: "Classroom demo. Every sample gives a positive reading for the course formula.",
    negative: "Classroom demo. Every sample gives a negative reading. Switch modes to remove dirt."
  };
  function sensorName(mode) {
    return Array.from(el("sensor-mode").options).find(option => option.value === mode).text;
  }

  function syncSound() {
    for (const button of soundButtons) {
      button.setAttribute("aria-pressed", String(soundOn));
      button.textContent = soundOn ? "Sound on" : "Sound off";
    }
    if (master) master.gain.setTargetAtTime(soundOn ? 0.23 : 0, audio.currentTime, 0.015);
  }

  function unlockAudio() {
    if (!soundOn) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!audio) {
        audio = new Audio();
        master = audio.createGain();
        master.gain.value = 0.23;
        master.connect(audio.destination);
      }
      if (audio.state !== "running") audio.resume().catch(() => {});
    } catch { /* Silent play remains available if the device has no audio output. */ }
  }

  function note(start, length, from, to, wave, volume) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(length / 4, 0.012));
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain);
    gain.connect(master);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(start);
    osc.stop(start + length + 0.005);
  }

  function brush(start) {
    const length = 0.23;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1750, start);
    filter.frequency.exponentialRampToValueAtTime(430, start + length);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.57, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(start);
  }

  function sound(cue) {
    if (!soundOn || !audio || audio.state === "closed") return;
    const now = audio.currentTime + 0.015;
    const color = ["triangle", "square", "sine", "triangle"][state?.themeIndex ?? 0];
    if (cue === "step") {
      if (now - lastFootstep < 0.14) return;
      lastFootstep = now;
      note(now, 0.035, (state.moves % 2 ? 154 : 138), 78, "triangle", 0.14);
    } else if (cue === "scan") {
      note(now, 0.09, 470, 680, "sine", 0.42);
      note(now + 0.11, 0.12, 680, 820, "sine", 0.31);
    } else if (cue === "clean") {
      brush(now);
      note(now + 0.12, 0.14, 390, 440, color, 0.20);
    } else if (cue === "skip") {
      note(now, 0.14, 340, 210, "triangle", 0.30);
    } else if (cue === "level" || cue === "finish") {
      const pitches = cue === "finish" ? [392, 494, 587, 784] : [330, 415, 494];
      pitches.forEach((pitch, i) => note(now + i * 0.085, 0.18, pitch, pitch, color, 0.23));
    } else {
      note(now, 0.065, 330, 440, "sine", 0.28);
    }
  }

  for (const button of soundButtons) button.addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("dustbound-sound", soundOn ? "on" : "off"); } catch {}
    unlockAudio();
    syncSound();
    sound("menu");
  });

  function prepareMenu() {
    for (const option of el("sensor-mode").options) el("live-sensor-mode").add(option.cloneNode(true));
    el("sensor-mode").onchange = () => write("sensor-hint", sensorHelp[el("sensor-mode").value]);
    el("sensor-mode").onchange();
    const cast = el("character-choice");
    cast.add(new Option("Random each level", "random"));
    GameArt.characters.forEach((c, i) => cast.add(new Option(c.name + " · " + c.kind, String(i))));
    try { cast.value = localStorage.getItem("dustbound-character") || "0"; } catch { cast.value = "0"; }
    if (!cast.value) cast.value = "0";
    cast.onchange = () => {
      try { localStorage.setItem("dustbound-character", cast.value); } catch {}
      redraw = true;
    };
    const list = el("first-location");
    list.add(new Option("Random location", "random"));
    for (const style of new Set(GameArt.designs.map(d => d.style))) {
      const group = document.createElement("optgroup");
      group.label = style;
      for (const d of GameArt.designs.filter(d => d.style === style)) group.append(new Option(d.name, d.id));
      list.append(group);
    }
    list.onchange = () => {
      if (list.value !== "random") gallery = Number(list.value);
      updateGallery();
    };
  }

  function updateGallery() {
    const design = GameArt.designs[gallery];
    write("plate-index", "Location " + String(gallery + 1).padStart(3, "0") + " / " + GameArt.designs.length);
    write("plate-name", design.name);
    write("plate-style", design.style);
    el("preview-canvas").setAttribute("aria-label", design.name + ", " + design.style);
    redraw = true;
  }

  function turnPlate(direction) {
    gallery = (gallery + direction + GameArt.designs.length) % GameArt.designs.length;
    el("first-location").value = String(gallery);
    unlockAudio();
    sound("menu");
    updateGallery();
  }

  function coord(cell) {
    return "(" + Math.floor(cell / state.size) + ", " + cell % state.size + ")";
  }

  function tileName(cell) {
    if (state.walls[cell]) return Locations.fixtureAt(state.designIndex, cell, state.size).name + " · obstacle";
    return state.truth[cell] ? "Dust patch" : "Clear floor";
  }

  function patches(count) {
    return count + (count === 1 ? " dust patch" : " dust patches");
  }

  function addEvent(text) {
    journal.unshift(text);
    if (journal.length > 8) journal.pop();
    el("journal").replaceChildren(...journal.map(event => {
      const item = document.createElement("li");
      item.textContent = event;
      return item;
    }));
  }

  function beginJournal() {
    journal = [];
    addEvent("Level " + state.level + " opened with " + patches(state.dirtTotal) + ".");
    hoverCell = keyboardCell = null;
    addEvent(sensorName(state.sensorMode) + ".");
  }

  function calculation(r) {
    const first = r.positive ? r.sensitivity : 1 - r.sensitivity;
    const second = r.positive ? r.falsePositive : 1 - r.falsePositive;
    return "(" + first.toFixed(1) + " × " + r.prior.toFixed(1) + ") / (" + first.toFixed(1) + " × " +
      r.prior.toFixed(1) + " + " + second.toFixed(1) + " × " + (1-r.prior).toFixed(1) + ")\n= " +
      r.numerator.toFixed(2) + " / " + r.evidence.toFixed(2) + " = " + r.posterior.toFixed(7);
  }

  function setBubble() {
    const {phase, signal, reading, decision} = state;
    const box = el("robot-bubble");
    box.hidden = !["scan","sensor","bayes","decision","result"].includes(phase);
    if (box.hidden) return;
    let label, title, detail = "";
    if (phase === "scan") {
      label = "Dirt sensor"; title = "Scanning…";
    } else if (phase === "sensor") {
      label = sensorName(state.sensorMode);
      title = signal ? "Dirt detected" : "No dirt detected";
      detail = (signal ? "Positive" : "Negative") + " reading at " + coord(state.position);
    } else if (phase === "bayes") {
      label = "Bayesian update"; title = "P(dirt | " + (signal ? "positive" : "negative") + ")";
      detail = calculation(reading);
    } else {
      const clean = decision.action === "Clean";
      label = phase === "decision" ? "One-step MDP" : "Action complete";
      title = phase === "decision" ? (clean ? "✓ Clean" : "✕ Move On")
        : (clean ? (decision.before === "Dirty" ? "✓ Dust removed" : "✓ Already clean")
          : (decision.before === "Dirty" ? "✕ Dust remains" : "✕ Left clean"));
      detail = phase === "decision"
        ? "Q(Clean) " + signed(decision.cleanQ.toFixed(2)) + " · Q(Move On) " + signed(decision.moveQ.toFixed(2))
        : decision.before + " → " + decision.after + "  ·  reward " + signed(decision.reward);
    }
    box.dataset.tone = decision && (phase === "result" || phase === "decision")
      ? (decision.action === "Clean" ? "clean" : "skip") : phase;
    write("bubble-label", label); write("bubble-title", title); write("bubble-math", detail);
    lastBubblePosition = "";
  }

  function positionBubble(anchor) {
    const box = el("robot-bubble");
    if (box.hidden || !anchor) return;
    const field = el("game-canvas");
    const width = box.offsetWidth, height = box.offsetHeight, leftMargin = 5;
    const x = Math.max(leftMargin, Math.min(field.clientWidth-width-leftMargin, anchor.x-width/2));
    const below = anchor.y < height + 13;
    const y = Math.max(3, Math.min(field.clientHeight-height-4, below ? anchor.y+15 : anchor.y-height-10));
    const key = [Math.round(x),Math.round(y),Math.round(anchor.x-x),below].join("/");
    if (lastBubblePosition === key) return;
    lastBubblePosition = key;
    box.style.left = Math.round(x) + "px"; box.style.top = Math.round(y) + "px";
    box.style.setProperty("--pointer", Math.min(width-12,Math.max(10,anchor.x-x)) + "px");
    box.classList.toggle("below", below);
  }

  function updateInfo() {
    const s = state, d = GameArt.designs[s.designIndex], c = GameArt.characters[s.characterIndex];
    const tier = tiers[Math.floor((s.level - 1) / 6)], finish = s.phase === "complete";
    write("level-number", pad(s.level)); write("stage-title", d.name);
    write("stage-description", [tier, s.type, s.size+" × "+s.size, d.style].join(" · "));
    write("character-name", c.name+" · "+c.kind);
    if (el("dirt-remaining").textContent !== String(s.dirtRemaining)) write("dirt-remaining", s.dirtRemaining);
    if (el("dirt-total").textContent !== String(s.dirtTotal)) write("dirt-total", s.dirtTotal);
    el("clean-progress").max = s.dirtTotal;
    el("clean-progress").value = s.dirtTotal - s.dirtRemaining;
    write("checked", s.inspected); write("moves", s.moves); write("score", signed(s.score));
    write("task", phases[s.phase]);
    let detail = s.targetCell === null ? "Point to a patch to send " + c.name + " there. You can check clear floor, too."
      : "Inspecting tile " + coord(s.targetCell) + ".";
    if (s.phase === "move") detail += " · "+(s.route.length-1-s.routeIndex)+" moves left.";
    if (s.phase === "result" && s.decision.before === "Dirty" && s.decision.after === "Dirty")
      detail = "The dust is still here. Inspect this tile again or switch inspection modes.";
    if (s.phase === "between") detail = "The floor is clean. Preparing the next location.";
    if (finish) detail = patches(s.totalCleaned) + " removed across 30 locations.";
    write("task-detail", detail);
    write("map-directions", s.phase === "select" ? "Tap a tile to inspect it." : s.targetCell !== null && !finish && s.phase !== "between" ? "Selected tile " + coord(s.targetCell) : "Floor cleared");
    const board = el("game-canvas");
    board.dataset.phase = s.phase;
    board.setAttribute("aria-label",c.name+" at "+coord(s.position)+". "+phases[s.phase]+". "+detail+" Use arrow keys and Enter to select.");
    el("open-map").disabled = s.phase !== "select";
    el("live-sensor-mode").value = s.sensorMode;
    el("live-sensor-mode").disabled = s.phase !== "select";
    write("live-sensor-hint", sensorHelp[s.sensorMode]);
    write("path-note", s.route.length ? coord(s.route[0])+" → "+coord(s.route.at(-1))+" · "+(s.route.length-1)+" moves on a shortest four-neighbour path." : "Select a cell to calculate a route.");
    const observed = s.reading;
    const sensitivity = observed ? observed.sensitivity : s.sensorMode === "verified" ? 1 : 0.8;
    const falsePositive = observed ? observed.falsePositive : s.sensorMode === "verified" ? 0 : 0.2;
    const model = "Prior 0.30 · sensitivity " + sensitivity.toFixed(2) + " · false-positive rate " + falsePositive.toFixed(2) + ".";
    write("bayes-note", (observed ? "Last sample · " : "") + model + (observed ? "\n" + (observed.positive?"Positive":"Negative")+" reading.\n"+calculation(observed) : ""));
    let policy = "Dirty: Clean +10, Move On −8.\nClean: Clean −4, Move On +2.";
    if (s.decision) {
      policy += "\nQ(Clean) = "+s.decision.cleanQ.toFixed(4)+"; Q(Move On) = "+s.decision.moveQ.toFixed(4)+". "+s.decision.action+".";
      if (s.decision.after) policy += " "+s.decision.before+" → "+s.decision.after+" ("+signed(s.decision.reward)+").";
    }
    write("policy-note", policy);
    el("arrival").hidden = !finish && s.phase !== "between";
    if (!el("arrival").hidden) {
      write("arrival-kicker",finish?"Campaign complete":"Location complete");
      write("arrival-title",finish?"All 30 floors clean":"On to level "+pad(s.level+1));
      write("arrival-note",finish?patches(s.totalCleaned)+" removed · Score "+signed(s.score):patches(s.dirtTotal)+" removed.");
    }
    el("pause-game").disabled = finish; el("finish-menu").hidden = !finish;
    setBubble(); redraw = true;
  }

  function advance() {
    const before = state.phase, from = state.position;
    Engine.tick(state);
    switch (state.phase) {
      case "move":
      case "scan":
        if (before === "move") { moveFrom = from; moveAt = artTime; sound("step"); }
        break;
      case "sensor":
        addEvent((state.signal?"Positive":"Negative")+" sensor reading at "+coord(state.position)+".");
        sound("scan"); break;
      case "bayes":
        addEvent("Bayes: P(dirt | reading) = "+state.reading.posterior.toFixed(7)+"."); break;
      case "decision":
        addEvent("MDP chose "+state.decision.action+" after comparing the two expected rewards."); break;
      case "result": {
        const q = state.decision;
        const scoring = q.scoreDelta === q.reward ? "" : " Rechecking clear floor adds no points.";
        addEvent(q.action+" at "+coord(state.position)+" · "+q.before+" → "+q.after+" · reward "+signed(q.reward)+"."+scoring);
        sound(q.action==="Clean"?"clean":"skip"); break;
      }
      case "select":
        moveFrom = null;
        if (before === "between") { beginJournal(); sound("level"); }
        break;
      case "complete": sound("finish"); break;
    }
    updateInfo();
  }

  function dispatch(cell) {
    if (!state || state.paused || state.phase !== "select") return;
    if (!Engine.selectCell(state,cell)) {
      write("task-detail",cell==null?"Choose a floor tile inside the map.":state.walls[cell]?"An obstacle blocks that tile. Choose open ground.":"This tile cannot be reached.");
      return;
    }
    unlockAudio(); elapsed = 0; moveFrom = null; hoverCell = keyboardCell = null;
    board.title = ""; board.style.cursor = "default";
    addEvent("You selected "+tileName(cell).toLowerCase()+" at "+coord(cell)+". BFS found a shortest route of "+(state.route.length-1)+" moves.");
    updateInfo();
  }

  const board = el("game-canvas");
  function pointedCell(event) {
    const rect = board.getBoundingClientRect();
    return GameArt.cellAt(board,state,event.clientX-rect.left,event.clientY-rect.top);
  }
  board.addEventListener("pointermove",e=>{
    if (!state || state.phase!=="select" || state.paused) return;
    const id = pointedCell(e);
    hoverCell = Engine.canSelect(state,id)?id:null;
    let tip = "";
    if (id !== null && Number.isInteger(id)) {
      tip = tileName(id) + " " + coord(id) + (state.walls[id] ? "" : " · click to inspect");
    }
    board.title = tip;
    board.style.cursor = hoverCell===null?"default":"crosshair"; redraw = true;
  });
  board.addEventListener("pointerleave",()=>{hoverCell=null; board.title=""; redraw=true;});
  board.addEventListener("click",e=>{if (state) dispatch(pointedCell(e));});
  board.addEventListener("keydown",e=>{
    if (!state || state.paused || state.phase!=="select") return;
    const direction = {ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[e.key];
    if (direction) {
      e.preventDefault();
      const n=state.size, current=keyboardCell??state.position;
      const clamp=v=>Math.max(0,Math.min(n-1,v));
      keyboardCell=clamp(Math.floor(current/n)+direction[0])*n+clamp(current%n+direction[1]);
      hoverCell=keyboardCell; write("task-detail",tileName(keyboardCell)+" "+coord(keyboardCell)+" · Enter to inspect."); redraw=true;
    } else if(e.key==="Enter"){e.preventDefault();dispatch(keyboardCell??state.position);}
  });

  const floorDialog = el("floor-dialog");
  const plan = el("plan-canvas");
  const rowInput = el("plan-row"), colInput = el("plan-col");

  function selectedCoordinate() {
    const row = rowInput.valueAsNumber, col = colInput.valueAsNumber;
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= state.size || col >= state.size) return null;
    return row * state.size + col;
  }

  function drawFloorPlan(cell) {
    const n = state.size;
    const side = Math.max(n, Math.round(plan.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
    plan.width = plan.height = side;
    const ctx = plan.getContext("2d");
    const tile = side / n;
    ctx.fillStyle = "#f1e9d2";
    ctx.fillRect(0, 0, side, side);
    ctx.fillStyle = "#747e67";
    for (let id = 0; id < state.walls.length; id++) {
      if (state.walls[id]) ctx.fillRect(Math.floor(id % n * tile), Math.floor(Math.floor(id / n) * tile), Math.ceil(tile), Math.ceil(tile));
    }
    if (n <= 20) {
      ctx.strokeStyle = "#81786042";
      ctx.lineWidth = Math.max(1, side / 650);
      ctx.beginPath();
      for (let k = 1; k < n; k++) {
        ctx.moveTo(k * tile, 0); ctx.lineTo(k * tile, side);
        ctx.moveTo(0, k * tile); ctx.lineTo(side, k * tile);
      }
      ctx.stroke();
    }
    function mark(id, kind) {
      const x = (id % n + 0.5) * tile, y = (Math.floor(id / n) + 0.5) * tile;
      const radius = Math.max(side / 150, tile * 0.25);
      ctx.beginPath();
      if (kind === "dust") {
        ctx.fillStyle = "#a3421a";
        ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath(); ctx.fill();
      } else if (kind === "robot") {
        ctx.strokeStyle = "#175762"; ctx.lineWidth = Math.max(side / 220, tile * 0.09);
        ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2); ctx.stroke();
      } else {
        const half = Math.max(side / 100, tile * 0.45);
        ctx.lineWidth = Math.max(2, side / 200); ctx.strokeStyle = "#fffefa";
        ctx.rect(x - half, y - half, half * 2, half * 2); ctx.stroke();
        ctx.lineWidth = Math.max(1, side / 470); ctx.strokeStyle = "#282f28"; ctx.stroke();
      }
    }
    for (let id = 0; id < state.truth.length; id++) if (state.truth[id]) mark(id, "dust");
    mark(state.position, "robot");
    if (cell !== null) mark(cell, "selection");
  }

  function updatePlan() {
    const cell = selectedCoordinate();
    write("plan-cell", cell === null ? "Choose a row and column from 0 to " + (state.size - 1) + "." :
      tileName(cell) + " " + coord(cell) + (state.checked[cell] ? " · previously inspected" : ""));
    el("inspect-coordinate").disabled = !Engine.canSelect(state, cell);
    el("plan-patches").value = cell !== null && state.truth[cell] ? String(cell) : "";
    drawFloorPlan(cell);
  }

  function pointOnPlan(cell) {
    rowInput.value = Math.floor(cell / state.size);
    colInput.value = cell % state.size;
    updatePlan();
  }

  el("open-map").onclick = () => {
    if (state.phase !== "select" || state.paused) return;
    rowInput.max = colInput.max = state.size - 1;
    write("floor-place", GameArt.designs[state.designIndex].name + " · " + state.size + " × " + state.size);
    const choices = el("plan-patches");
    choices.replaceChildren(new Option("Choose a patch…", ""));
    for (let cell = 0; cell < state.truth.length; cell++) {
      if (state.truth[cell]) choices.add(new Option("Row " + Math.floor(cell / state.size) + ", column " + cell % state.size, String(cell)));
    }
    floorDialog.showModal();
    pointOnPlan(keyboardCell ?? state.position);
  };
  plan.addEventListener("click", event => {
    const rect = plan.getBoundingClientRect();
    const row = Math.floor((event.clientY - rect.top) / rect.height * state.size);
    const col = Math.floor((event.clientX - rect.left) / rect.width * state.size);
    if (row >= 0 && col >= 0 && row < state.size && col < state.size) pointOnPlan(row * state.size + col);
  });
  rowInput.oninput = colInput.oninput = updatePlan;
  el("plan-patches").onchange = event => { if (event.target.value !== "") pointOnPlan(Number(event.target.value)); };
  el("close-map").onclick = () => floorDialog.close();
  el("plan-form").onsubmit = event => {
    event.preventDefault();
    const cell = selectedCoordinate();
    if (!Engine.canSelect(state, cell)) return;
    floorDialog.close();
    dispatch(cell);
    board.focus({preventScroll:true});
  };

  function view(showGame) {
    el("menu").hidden = showGame;
    el("play").hidden = !showGame;
    el("continue-run").hidden = !state || state.phase === "complete";
    el("start-run").firstChild.textContent = state && state.phase !== "complete" ? "Start new campaign " : "Start campaign ";
    redraw = true;
    window.scrollTo(0, 0);
  }

  function newRun() {
    if (el("new-dialog").open) el("new-dialog").close();
    unlockAudio();
    state = Engine.create({size: el("map-size").value, character: el("character-choice").value, firstDesign: el("first-location").value, sensorMode: el("sensor-mode").value});
    elapsed = 0;
    moveFrom = null;
    beginJournal();
    view(true);
    updateInfo();
    sound("level");
    el("pause-game").focus({preventScroll:true});
  }

  function pause() {
    if (!state || state.paused || state.phase === "complete" || el("play").hidden) return;
    Engine.pause(state);
    if (master) master.gain.setTargetAtTime(0, audio.currentTime, 0.015);
    write("pause-level", "Level " + pad(state.level));
    write("pause-line", GameArt.designs[state.designIndex].name + " · " + patches(state.dirtRemaining) + " left.");
    el("pause-dialog").showModal();
    redraw = true;
  }

  function resume() {
    if (el("pause-dialog").open) el("pause-dialog").close();
    unlockAudio();
    syncSound();
    Engine.resume(state);
    view(true);
    updateInfo();
    el("pause-game").focus({preventScroll:true});
  }

  el("prev-design").onclick = () => turnPlate(-1);
  el("next-design").onclick = () => turnPlate(1);
  el("map-size").onchange = () => {
    const size = el("map-size").value;
    write("size-hint", size === "random" ? "Each level draws a new size from 5 × 5 to 100 × 100." : "Every level uses a " + size + " × " + size + " map. The layout changes each time.");
  };
  el("start-run").onclick = () => {
    if (state && state.phase !== "complete") el("new-dialog").showModal();
    else newRun();
  };
  el("confirm-new").onclick = newRun;
  el("cancel-new").onclick = () => el("new-dialog").close();
  el("pause-game").onclick = pause;
  el("resume-game").onclick = resume;
  el("continue-run").onclick = resume;
  el("pause-dialog").oncancel = event => { event.preventDefault(); resume(); };
  el("restart-level").onclick = () => {
    Engine.restartLevel(state);
    elapsed = 0;
    moveFrom = null;
    beginJournal();
    resume();
  };
  el("to-menu").onclick = () => {
    el("pause-dialog").close();
    view(false);
    syncSound();
    el("continue-run").focus({preventScroll:true});
  };
  el("finish-menu").onclick = () => { view(false); el("start-run").focus({preventScroll:true}); };
  el("speed").onchange = () => { speed = Number(el("speed").value); };
  el("live-sensor-mode").onchange = event => {
    if (Engine.setSensorMode(state, event.target.value)) addEvent("Inspection mode changed to " + sensorName(state.sensorMode) + ".");
    updateInfo();
  };
  document.addEventListener("keydown", event => {
    if (event.repeat || el("play").hidden || el("pause-dialog").open || floorDialog.open || !state || state.phase === "complete") return;
    if (event.key === "Escape" || (event.code === "Space" && !event.target.closest("select, button, summary, input"))) {
      event.preventDefault();
      pause();
    }
  });
  window.addEventListener("resize", () => {
    redraw = true;
    if (floorDialog.open) updatePlan();
  });
  reduceMotion.addEventListener("change", () => { redraw = true; });

  function frame(time) {
    const delta = lastTime ? Math.min(100, time - lastTime) : 0;
    lastTime = time;
    const inGame = !el("play").hidden;
    const active = inGame && !state.paused && state.phase !== "complete";
    if (!document.hidden) {
      if (!inGame) galleryTime += delta;
      if (active) artTime += delta;
      if (active && state.phase !== "select") {
        const educational = ["sensor","bayes","decision","result"].includes(state.phase);
        elapsed += delta * (educational ? Math.min(speed,1.5) : speed);
        if (elapsed >= durations[state.phase]) {
          elapsed = 0;
          advance();
        }
      }
      const animated = !reduceMotion.matches && (!inGame || active);
      if (redraw || (animated && time - lastDraw >= 1000 / 30)) {
        if (inGame) {
          const frameInfo = GameArt.draw(el("game-canvas"), state, {
            time: artTime, motion: !reduceMotion.matches, moveFrom, hoverCell,
            moveProgress: Math.min(1, (artTime - moveAt) / Math.max(32, 190 / speed))
          });
          positionBubble(frameInfo?.robot);
        } else {
          GameArt.draw(el("preview-canvas"), null, {
            time: galleryTime, motion: !reduceMotion.matches, preview: true,
            designIndex: gallery, characterIndex: el("character-choice").value === "random" ? gallery % GameArt.characters.length : Number(el("character-choice").value)
          });
        }
        redraw = false;
        lastDraw = time;
      }
    }
    requestAnimationFrame(frame);
  }

  prepareMenu();
  syncSound();
  updateGallery();
  requestAnimationFrame(frame);
})();
