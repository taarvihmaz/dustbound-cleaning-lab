/* Campaign simulation. The same file runs in a browser and in Node's test runner. */
(function (root) {
  "use strict";

  const SIZES = Object.freeze([5, 10, 20, 50, 100]);
  const LEVELS = 30;
  const Locations = typeof module === "object" && module.exports ? require("./locations.js") : root.Locations;
  const DESIGNS = Locations.designs.length;
  const CHARACTERS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]);
  const PRIOR = 0.3;
  const SENSITIVITY = 0.8;
  const FALSE_POSITIVE = 0.2;
  const SENSOR_MODES = Object.freeze(["verified", "simulated", "positive", "negative"]);

  function mix(bits) {
    bits = Math.imul(bits ^ (bits >>> 16), 0x21f0aaad);
    bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
    return (bits ^ (bits >>> 15)) >>> 0;
  }

  function roll(stream) {
    stream.rng = (stream.rng + 0x9e3779b9) >>> 0;
    return mix(stream.rng) / 4294967296;
  }

  function int(stream, count) {
    return Math.floor(roll(stream) * count);
  }

  function shuffled(items, stream) {
    const order = items.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = int(stream, i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function different(stream, items, previous) {
    const choices = items.filter(item => item !== previous);
    return choices[int(stream, choices.length)];
  }

  // Visit each accessible tile at most once. Stop when the chosen cell is reached.
  function explore(walls, size, start, goal) {
    const parent = new Int32Array(walls.length).fill(-1);
    const queue = new Int32Array(walls.length);
    let head = 0;
    let tail = 1;
    queue[0] = start;
    parent[start] = start;
    function visit(cell, from) {
      if (!walls[cell] && parent[cell] === -1) {
        parent[cell] = from;
        queue[tail++] = cell;
      }
    }
    while (head < tail) {
      const cell = queue[head++];
      if (cell === goal) break;
      const col = cell % size;
      if (col + 1 < size) visit(cell + 1, cell);
      if (cell + size < walls.length) visit(cell + size, cell);
      if (col > 0) visit(cell - 1, cell);
      if (cell >= size) visit(cell - size, cell);
    }
    return parent;
  }

  function bfs(walls, size, start, goal) {
    const valid = cell => Number.isInteger(cell) && cell >= 0 && cell < walls.length && !walls[cell];
    if (!valid(start) || !valid(goal)) return [];
    const parent = explore(walls, size, start, goal);
    if (parent[goal] === -1) return [];
    const reversed = [goal];
    while (reversed[reversed.length - 1] !== start) {
      reversed.push(parent[reversed[reversed.length - 1]]);
    }
    return reversed.reverse();
  }

  // The classroom model is also the default for standalone numerical examples.
  // Verified inspections use ideal contact detection, so their likelihoods differ.
  function infer(positive, mode = "simulated") {
    const sensitivity = mode === "verified" ? 1 : SENSITIVITY;
    const falsePositive = mode === "verified" ? 0 : FALSE_POSITIVE;
    const numerator = PRIOR * (positive ? sensitivity : 1 - sensitivity);
    const evidence = numerator + (1 - PRIOR) * (positive ? falsePositive : 1 - falsePositive);
    return { positive, prior: PRIOR, sensitivity, falsePositive,
      numerator, evidence, posterior: numerator / evidence };
  }

  function choose(belief) {
    const cleanQ = 10 * belief - 4 * (1 - belief);
    const moveQ = -8 * belief + 2 * (1 - belief);
    return { cleanQ, moveQ, action: cleanQ > moveQ ? "Clean" : "Move On" };
  }

  function transition(action, dirty) {
    if (action === "Clean") return { reward: dirty ? 10 : -4, before: dirty ? "Dirty" : "Clean", after: "Clean" };
    return { reward: dirty ? -8 : 2, before: dirty ? "Dirty" : "Clean", after: dirty ? "Dirty" : "Clean" };
  }

  function distance(first, second, size) {
    return Math.abs(first % size - second % size)
      + Math.abs(Math.floor(first / size) - Math.floor(second / size));
  }

  function chooseLocation(state, level, stream) {
    if (level === 1 && state.firstDesign !== null) return state.firstDesign;
    const previous = Locations.designs[state.designIndex];
    if (!previous) return state.designPool[int(stream, state.designPool.length)];
    const candidates = state.designPool.filter(id => {
      const next = Locations.designs[id];
      return next.mode !== previous.mode && next.category !== previous.category
        && next.fixtures[0].kind !== previous.fixtures[0].kind;
    });
    // Each venue is removed from the pool on entry. Even a very uneven future
    // catalogue can finish a run after it runs out of contrasting environments.
    const pool = candidates.length ? candidates : state.designPool;
    return pool[int(stream, pool.length)];
  }

  function placeDirt(state) {
    const reachable = explore(state.walls, state.size, state.position, -1);
    const floor = [];
    for (let cell = 0; cell < reachable.length; cell++) {
      if (cell !== state.position && reachable[cell] !== -1) floor.push(cell);
    }
    if (!floor.length) throw new Error("A campaign map needs reachable floor beyond the starting cell.");
    const dust = {rng: mix(state.levelSeed ^ 0x5bd1e995)};
    const candidates = shuffled(floor, dust);
    // Keep one patch within the opening camera view, even on a 100 × 100 floor.
    const first = candidates.find(cell => distance(cell, state.position, state.size) <= 3);
    state.truth[first] = 1;
    const count = Math.min(state.level + 1, candidates.length);
    let placed = 1;
    for (const cell of candidates) {
      if (placed === count) break;
      if (cell === first) continue;
      state.truth[cell] = 1;
      placed++;
    }
    state.dirtTotal = count;
    state.dirtRemaining = count;
  }

  function beginLevel(state, level) {
    state.levelEntry = {
      size: state.size, designIndex: state.designIndex, characterIndex: state.characterIndex,
      designPool: state.designPool.slice(), score: state.score,
      totalMoves: state.totalMoves, totalInspected: state.totalInspected, totalCleaned: state.totalCleaned
    };
    const levelSeed = mix(state.seed ^ Math.imul(level, 0x1b873593));
    const stream = {rng: levelSeed};
    const size = state.sizeChoice === "random" ? different(stream, SIZES, state.size) : state.sizeChoice;
    const designIndex = chooseLocation(state, level, stream);
    state.designPool.splice(state.designPool.indexOf(designIndex), 1);
    const place = Locations.designs[designIndex];
    const walls = Locations.makeMap(size, designIndex, level);
    const entry = int(stream, walls.length);
    let position = entry;
    while (walls[position]) position = (position + 1) % walls.length;
    // Cosmetic choices use a separate stream, so changing character doesn't
    // change a floor plan, a dust deposit or a sensor reading for the same seed.
    const cast = {rng: mix(levelSeed ^ 0x9e3779b9)};
    const characterIndex = state.characterChoice === "random"
      ? different(cast, CHARACTERS, state.characterIndex) : state.characterChoice;
    Object.assign(state, {
      level, levelSeed, size, designIndex, themeIndex: place.mode, characterIndex,
      difficulty: level, type: place.layoutName, walls, position,
      truth: new Uint8Array(walls.length),
      checked: new Uint8Array(walls.length),
      inspected: 0, moves: 0, targetCell: null, route: [], routeIndex: 0,
      phase: "select", signal: null, reading: null, decision: null, rng: mix(levelSeed ^ 0xc2b2ae35)
    });
    placeDirt(state);
  }

  function fixedOrRandom(value, choices, label) {
    if (value === undefined || value === "random") return "random";
    if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) {
      throw new RangeError("Unsupported " + label + ".");
    }
    const number = Number(value);
    if (!choices.includes(number)) throw new RangeError("Unsupported " + label + ".");
    return number;
  }

  function create(options = {}) {
    const sizeChoice = fixedOrRandom(options.size, SIZES, "map size");
    const characterChoice = fixedOrRandom(options.character, CHARACTERS, "character");
    const sensorMode = options.sensorMode ?? "verified";
    if (!SENSOR_MODES.includes(sensorMode)) throw new RangeError("Unsupported sensor mode.");
    const designPool = Locations.designs.map(place => place.id);
    const first = fixedOrRandom(options.firstDesign ?? "random", designPool, "location");
    const seed = options.seed === undefined ? Math.floor(Math.random() * 4294967296) : Number(options.seed) >>> 0;
    const state = {seed, sizeChoice, characterChoice, sensorMode, firstDesign: first === "random" ? null : first,
      designPool, paused: false, score: 0, totalMoves: 0, totalInspected: 0, totalCleaned: 0};
    beginLevel(state, 1);
    return state;
  }

  function restartLevel(state) {
    Object.assign(state, state.levelEntry);
    beginLevel(state, state.level);
    return state;
  }

  function setSensorMode(state, mode) {
    if (state.phase !== "select" || !SENSOR_MODES.includes(mode)) return false;
    state.sensorMode = mode;
    return true;
  }

  function canSelect(state, cell) {
    return !state.paused && state.phase === "select" && Number.isInteger(cell)
      && cell >= 0 && cell < state.walls.length && !state.walls[cell];
  }

  function selectCell(state, cell) {
    if (!canSelect(state, cell)) return false;
    const route = bfs(state.walls, state.size, state.position, cell);
    if (!route.length) return false;
    Object.assign(state, {targetCell: cell, route, routeIndex: 0,
      phase: "plan", signal: null, reading: null, decision: null});
    return true;
  }

  function tick(state) {
    if (state.paused || state.phase === "select" || state.phase === "complete") return state;
    const cell = state.targetCell;
    switch (state.phase) {
      case "plan":
        state.phase = state.route.length > 1 ? "move" : "scan";
        break;
      case "move":
        state.position = state.route[++state.routeIndex];
        state.moves++;
        state.totalMoves++;
        if (state.position === cell) state.phase = "scan";
        break;
      case "scan":
        if (state.sensorMode === "verified") state.signal = Boolean(state.truth[cell]);
        else if (state.sensorMode === "simulated") {
          state.signal = roll(state) < (state.truth[cell] ? SENSITIVITY : FALSE_POSITIVE);
        } else state.signal = state.sensorMode === "positive";
        state.phase = "sensor";
        break;
      case "sensor":
        state.reading = infer(state.signal, state.sensorMode);
        state.phase = "bayes";
        break;
      case "bayes":
        state.decision = choose(state.reading.posterior);
        state.phase = "decision";
        break;
      case "decision": {
        const dirty = Boolean(state.truth[cell]);
        const outcome = transition(state.decision.action, dirty);
        // The reward table describes the action. Re-inspecting already resolved
        // floor has no campaign score value, even if the sensor is forced.
        const scoreDelta = state.checked[cell] && !dirty ? 0 : outcome.reward;
        Object.assign(state.decision, outcome, {scoreDelta});
        if (dirty && state.decision.action === "Clean") {
          state.truth[cell] = 0;
          state.dirtRemaining--;
          state.totalCleaned++;
        }
        state.checked[cell] = 1;
        state.score += scoreDelta;
        state.inspected++;
        state.totalInspected++;
        state.phase = "result";
        break;
      }
      case "result":
        if (state.dirtRemaining === 0) {
          state.phase = state.level === LEVELS ? "complete" : "between";
        } else {
          state.targetCell = null;
          state.route = [];
          state.routeIndex = 0;
          state.phase = "select";
        }
        break;
      case "between":
        beginLevel(state, state.level + 1);
        break;
    }
    return state;
  }

  const Engine = Object.freeze({SIZES, LEVELS, DESIGNS, create, tick, restartLevel, setSensorMode, canSelect, selectCell,
    bfs, infer, choose, transition,
    pause(state) { state.paused = true; return state; },
    resume(state) { state.paused = false; return state; }
  });
  if (typeof module === "object" && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(globalThis);
