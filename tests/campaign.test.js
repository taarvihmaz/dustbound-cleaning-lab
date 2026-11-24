"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../game/engine.js");
const Locations = require("../game/locations.js");

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} differs from ${expected}`);
}

function adjacent(first, second, size) {
  return Math.abs(first % size - second % size)
    + Math.abs(Math.floor(first / size) - Math.floor(second / size)) === 1;
}

test("Bayes applies each likelihood and its complement", () => {
  const plus = Engine.infer(true), minus = Engine.infer(false);
  near(plus.numerator, 0.24);
  near(plus.evidence, 0.38);
  near(plus.posterior, 0.6315789);
  near(minus.numerator, 0.06);
  near(minus.evidence, 0.62);
  near(minus.posterior, 0.0967742);
  for (const signal of [true, false]) {
    const ideal = Engine.infer(signal, "verified");
    assert.equal(ideal.sensitivity, 1);
    assert.equal(ideal.falsePositive, 0);
    near(ideal.evidence, signal ? 0.3 : 0.7);
    assert.equal(ideal.posterior, Number(signal));
  }
});

test("both one-step utilities use the posterior and all four real transitions use pre-action truth", () => {
  near(Engine.choose(0.5).cleanQ, 3);
  near(Engine.choose(0.5).moveQ, -3);
  assert.equal(Engine.choose(Engine.infer(true).posterior).action, "Clean");
  assert.equal(Engine.choose(Engine.infer(false).posterior).action, "Move On");
  assert.equal(Engine.choose(0.25).action, "Move On");
  for (const [action, dirty, reward, before, after] of [
    ["Clean", true, 10, "Dirty", "Clean"], ["Clean", false, -4, "Clean", "Clean"],
    ["Move On", true, -8, "Dirty", "Dirty"], ["Move On", false, 2, "Clean", "Clean"]
  ]) assert.deepEqual(Engine.transition(action, dirty), {reward, before, after});
});

test("BFS returns the shortest four-neighbour detour and rejects unreachable cells", () => {
  const walls = new Uint8Array(25);
  for (const cell of [1, 6, 11, 16]) walls[cell] = 1;
  assert.deepEqual(Engine.bfs(walls, 5, 0, 2), [0, 5, 10, 15, 20, 21, 22, 17, 12, 7, 2]);
  assert.deepEqual(Engine.bfs(walls, 5, 0, 0), [0]);
  assert.deepEqual(Engine.bfs(walls, 5, 0, 1), []);
  walls[21] = 1;
  assert.deepEqual(Engine.bfs(walls, 5, 0, 2), []);
});

function countDirt(s) {
  return s.truth.reduce((total, dirty) => total + dirty, 0);
}

function observe(s, phase) {
  for (let step = 0; step < s.walls.length + 20; step++) {
    if (s.phase === phase) return;
    assert.ok(!["select", "between", "complete"].includes(s.phase), `Unexpected ${s.phase} before ${phase}`);
    Engine.tick(s);
  }
  assert.fail(`An inspection never reached ${phase}`);
}

function stepAsPlayer(s) {
  if (s.phase === "select") {
    assert.equal(Engine.selectCell(s, s.truth.indexOf(1)), true);
  } else {
    Engine.tick(s);
  }
}

function until(s, predicate) {
  for (let tick = 0; tick < 200000; tick++) {
    if (predicate(s)) return;
    stepAsPlayer(s);
  }
  assert.fail("Did not reach the expected state");
}

function flood(s) {
  const stack = [s.position], seen = new Set(stack);
  while (stack.length) {
    const cell = stack.pop();
    for (const next of [cell - 1, cell + 1, cell + s.size, cell - s.size]) {
      if (next < 0 || next >= s.walls.length || !adjacent(cell, next, s.size)) continue;
      if (!s.walls[next] && !seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  return seen.size;
}

test("only a player's click dispatches the robot; an empty tile never becomes dirty", () => {
  const s = Engine.create({size: 20, seed: 17});
  const initial = structuredClone(s);
  for (let i = 0; i < 300; i++) Engine.tick(s);
  for (const invalid of [s.walls.indexOf(1), -1, s.walls.length, 2.5, NaN, null, "3"]) {
    assert.equal(Engine.selectCell(s, invalid), false);
  }
  assert.deepEqual(s, initial);
  const empty = s.walls.findIndex((wall, id) => !wall && !s.truth[id] && id !== s.position);
  assert.ok(Engine.selectCell(s, empty));
  assert.equal(s.targetCell, empty);
  assert.deepEqual(s.route, Engine.bfs(s.walls, s.size, s.position, empty));
  const frozen = structuredClone(s);
  assert.equal(Engine.selectCell(s, s.position), false);
  assert.equal(Engine.setSensorMode(s, "positive"), false);
  assert.deepEqual(s, frozen);
  for (let step = 0; step < s.walls.length + 20 && s.phase !== "result"; step++) {
    assert.deepEqual(s.truth, initial.truth);
    Engine.tick(s);
  }
  assert.equal(s.phase, "result");
  assert.deepEqual(s.truth, initial.truth);
  assert.equal(s.dirtRemaining, initial.dirtTotal);
  assert.equal(s.signal, false);
  assert.equal(s.decision.action, "Move On");
  assert.equal(s.score, 2);
  Engine.tick(s);
  for (let i = 0; i < 8; i++) {
    assert.ok(Engine.selectCell(s, empty));
    observe(s, "result");
    assert.equal(s.decision.reward, 2);
    assert.equal(s.decision.scoreDelta, 0);
    assert.equal(s.score, 2);
    Engine.tick(s);
    assert.equal(s.phase, "select");
    assert.equal(s.level, 1);
    assert.equal(s.dirtRemaining, initial.dirtTotal);
  }
  assert.deepEqual(s.truth, initial.truth);
  const isolated = structuredClone(initial);
  const destination = isolated.walls.findIndex((wall, id) => !wall
    && id !== isolated.position && !adjacent(isolated.position, id, isolated.size));
  isolated.walls.fill(1);
  isolated.walls[isolated.position] = isolated.walls[destination] = 0;
  assert.equal(Engine.selectCell(isolated, destination), false);
});

test("classroom simulation exposes all four truth/signal cases and keeps separate observable stages", () => {
  const seen = new Set();
  for (let seed = 0; seed < 120 && seen.size < 4; seed++) {
    for (const dirty of [false, true]) {
      const s = Engine.create({size: 5, seed, sensorMode: "simulated"});
      const cell = dirty ? s.truth.indexOf(1) : s.position;
      assert.ok(Engine.selectCell(s, cell));
      observe(s, "scan");
      Engine.tick(s);
      assert.equal(s.phase, "sensor");
      assert.equal(s.reading, null);
      assert.equal(typeof s.signal, "boolean");
      const signal = s.signal;
      seen.add(dirty + "/" + signal);
      Engine.tick(s);
      assert.equal(s.phase, "bayes");
      assert.deepEqual(s.reading, Engine.infer(signal));
      assert.equal(s.decision, null);
      Engine.tick(s);
      assert.equal(s.phase, "decision");
      const choice = Engine.choose(s.reading.posterior);
      assert.deepEqual(s.decision, choice);
      assert.equal(s.truth[cell], Number(dirty));
      assert.equal(s.checked[cell], 0);
      assert.equal(s.score, 0);
      Engine.tick(s);
      assert.equal(s.phase, "result");
      const outcome = Engine.transition(choice.action, dirty);
      assert.deepEqual(s.decision, {...choice, ...outcome, scoreDelta: outcome.reward});
      assert.equal(s.score, outcome.reward);
      assert.equal(s.truth[cell], Number(outcome.after === "Dirty"));
      assert.equal(s.dirtRemaining, countDirt(s));
      assert.equal(s.totalCleaned, Number(dirty && signal));
      assert.equal(s.checked[cell], 1);
      assert.equal(s.inspected, 1);
      if (dirty && !signal) {
        Engine.tick(s);
        assert.ok(Engine.setSensorMode(s, "verified"));
        assert.ok(Engine.selectCell(s, cell));
        observe(s, "result");
        assert.equal(s.decision.action, "Clean");
        assert.equal(s.decision.scoreDelta, 10);
        assert.equal(s.truth[cell], 0);
        assert.equal(s.dirtRemaining, s.dirtTotal - 1);
      }
    }
  }
  assert.equal(seen.size, 4);
});

test("pause freezes selection, motion, every explanation and inter-level transitions", () => {
  const s = Engine.create({size: 5, seed: 57});
  for (const phase of ["select", "plan", "move", "scan", "sensor", "bayes", "decision", "result", "between"]) {
    if (phase === "plan") assert.ok(Engine.selectCell(s, s.walls.findIndex((v,id) => !v && id !== s.position)));
    until(s, x => x.phase === phase);
    Engine.pause(s);
    const before = structuredClone(s);
    assert.equal(Engine.selectCell(s, s.position), false);
    for (let n = 0; n < 5; n++) Engine.tick(s);
    assert.deepEqual(s, before);
    Engine.resume(s);
  }
  Engine.tick(s);
  assert.equal(s.level, 2);
});

test("forced observations leave physical truth alone, the sensor can be switched and skips do not pass a level", () => {
  const s = Engine.create({size: 5, seed: 8, sensorMode: "positive"});
  const clean = s.position;
  const allDirt = s.truth.slice();
  assert.ok(Engine.selectCell(s, clean));
  observe(s, "result");
  assert.deepEqual(s.reading, Engine.infer(true));
  assert.equal(s.decision.reward, -4);
  assert.deepEqual(s.truth, allDirt);
  Engine.tick(s);
  assert.ok(Engine.setSensorMode(s, "negative"));
  const dirty = s.truth.indexOf(1);
  for (let n = 0; n < 5; n++) {
    assert.ok(Engine.selectCell(s, dirty));
    observe(s, "result");
    assert.deepEqual(s.reading, Engine.infer(false));
    assert.equal(s.decision.action, "Move On");
    assert.equal(s.decision.reward, -8);
    assert.deepEqual(s.truth, allDirt);
    assert.equal(s.dirtRemaining, s.dirtTotal);
    Engine.tick(s);
    assert.equal(s.phase, "select");
    assert.equal(s.level, 1);
  }
  assert.equal(Engine.setSensorMode(s, "typo"), false);
  assert.ok(Engine.setSensorMode(s, "verified"));
  assert.ok(Engine.selectCell(s, dirty));
  observe(s, "result");
  assert.equal(s.truth[dirty], 0);
  assert.equal(s.totalCleaned, 1);
  assert.equal(s.dirtRemaining, s.dirtTotal - 1);
  Engine.tick(s);
  // A cleared tile is also a valid new inspection, but cannot farm score.
  assert.ok(Engine.selectCell(s, dirty));
  observe(s, "result");
  assert.equal(s.decision.action, "Move On");
  assert.equal(s.decision.scoreDelta, 0);
  assert.equal(s.totalCleaned, 1);
  assert.equal(s.dirtRemaining, s.dirtTotal - 1);
  assert.throws(() => Engine.create({sensorMode: "unknown"}), RangeError);
  assert.equal(Engine.create({size: 5}).sensorMode, "verified");
});

test("restart replays physical state, choices, reward, sensor stream and random level draw", () => {
  const s = Engine.create({size: "random", seed: 17, character: 4, firstDesign: 103, sensorMode: "simulated"});
  assert.equal(s.designIndex, 103);
  until(s, x => x.level === 2);
  const entry = structuredClone(s);
  until(s, x => x.phase === "result");
  Engine.pause(s);
  Engine.restartLevel(s);
  assert.deepEqual(s, {...entry, paused: true});
  Engine.resume(s);
  until(s, x => x.level === 3);
  until(entry, x => x.level === 3);
  assert.deepEqual(s, entry);
});

test("invalid menu choices are rejected; fixed avatars leave the simulation reproducible", () => {
  for (const invalid of [{size: 7}, {character: 8}, {character: null}, {firstDesign: 158}]) {
    assert.throws(() => Engine.create(invalid), RangeError);
  }
  const rover = Engine.create({size: 10, character: "0", seed: 13});
  const fox = Engine.create({size: 10, character: "1", seed: 13});
  for (let i = 0; i < 200; i++) {
    assert.equal(rover.phase, fox.phase);
    assert.equal(rover.designIndex, fox.designIndex);
    assert.equal(rover.position, fox.position);
    assert.equal(rover.signal, fox.signal);
    assert.equal(rover.score, fox.score);
    assert.equal(rover.characterIndex, 0);
    assert.equal(fox.characterIndex, 1);
    stepAsPlayer(rover); stepAsPlayer(fox);
  }
});

test("all sizes start with actual reachable patches, a clear spawn and nearby dirt", () => {
  for (const size of Engine.SIZES) {
    for (let seed = 0; seed < 20; seed++) {
      const s = Engine.create({size, seed});
      assert.equal(s.truth[s.position], 0);
      assert.equal(countDirt(s), s.dirtRemaining);
      assert.equal(s.dirtTotal, s.dirtRemaining);
      let nearby = false;
      for (let cell = 0; cell < s.truth.length; cell++) {
        if (!s.truth[cell]) continue;
        assert.equal(s.walls[cell], 0);
        assert.ok(Engine.bfs(s.walls, size, s.position, cell).length >= 2);
        const dist = Math.abs(cell % size - s.position % size) + Math.abs(Math.floor(cell/size) - Math.floor(s.position/size));
        if (dist <= 3) nearby = true;
      }
      assert.ok(nearby);
    }
  }
});

function floorShape(walls, size) {
  let rows = Array.from({length:size}, (_, y) => Array.from(walls.slice(y * size, (y + 1) * size)));
  const orientations = [];
  for (let turn = 0; turn < 4; turn++) {
    orientations.push(rows.flat().join(""), rows.flatMap(row => [...row].reverse()).join(""));
    rows = rows[0].map((_, col) => rows.map(row => row[col]).reverse());
  }
  return orientations.sort()[0];
}

test("158 compact plans are reachable and geometrically unique, even under rotation or reflection", () => {
  const names = new Set(), plans = new Set();
  for (const place of Locations.designs) {
    const s = Engine.create({size: 5, firstDesign: place.id, seed: 1});
    names.add(place.name);
    plans.add(floorShape(s.walls, s.size));
    assert.equal(s.designIndex, place.id);
    assert.equal(s.type, place.layoutName);
    assert.equal(s.themeIndex, place.mode);
    assert.ok(flood(s) >= 3);
    assert.equal(flood(s), s.walls.filter(v => !v).length, place.name);
  }
  assert.equal(names.size, 158);
  assert.equal(plans.size, 158);
});

for (const size of [...Engine.SIZES, "random"]) {
  test(`the player must physically clean every level of a 30-level ${size} campaign`, () => {
    const fixed = size === 5 || size === 100;
    const s = Engine.create({size, seed: 19, character: fixed ? 3 : "random"});
    const designs = new Set();
    let previous, steps = 0, passes = 0, patches = 0;
    while (s.phase !== "complete") {
      assert.ok(++steps < 180000, "user-dispatched run must finish");
      if (previous?.level !== s.level) {
        const d = Locations.designs[s.designIndex];
        assert.equal(s.walls.length, s.size ** 2);
        assert.equal(s.phase, "select");
        assert.equal(s.targetCell, null);
        const floorCount = flood(s);
        assert.equal(floorCount, s.walls.filter(v => !v).length);
        assert.equal(s.dirtTotal, Math.min(s.level + 1, floorCount - 1));
        assert.equal(s.dirtRemaining, countDirt(s));
        assert.equal(s.dirtRemaining, s.dirtTotal);
        assert.ok(s.dirtRemaining > 0);
        assert.equal(s.truth[s.position], 0);
        patches += s.dirtTotal;
        if (previous) {
          assert.notEqual(s.themeIndex, previous.themeIndex);
          assert.notEqual(d.fixtures[0].kind, previous.kind);
          assert.notEqual(d.category, previous.category);
          if (!fixed) assert.notEqual(s.characterIndex, previous.characterIndex);
          if (size === "random") assert.notEqual(s.size, previous.size);
        }
        if (fixed) assert.equal(s.characterIndex, 3);
        if (size !== "random") assert.equal(s.size, size);
        assert.ok(!designs.has(s.designIndex));
        designs.add(s.designIndex);
        previous = {level: s.level, size: s.size, characterIndex: s.characterIndex,
          themeIndex: s.themeIndex, kind: d.fixtures[0].kind, category: d.category};
      }
      const phase = s.phase, from = s.position, cell = s.targetCell, remaining = s.dirtRemaining;
      stepAsPlayer(s);
      if (phase === "move") {
        assert.ok(adjacent(from, s.position, s.size));
        assert.equal(s.walls[s.position], 0);
      }
      if (phase === "decision") {
        assert.equal(s.position, cell);
        assert.equal(s.decision.action, "Clean");
        assert.equal(s.decision.scoreDelta, 10);
        assert.equal(s.dirtRemaining, remaining - 1);
        assert.equal(s.dirtRemaining, countDirt(s));
        passes++;
      } else if (phase !== "between") {
        assert.equal(s.dirtRemaining, remaining);
      }
      if (phase === "result") {
        assert.equal(s.phase, remaining ? "select" : (s.level === 30 ? "complete" : "between"));
      }
    }
    assert.equal(designs.size, 30);
    assert.equal(passes, patches);
    assert.equal(s.score, patches * 10);
    assert.equal(s.totalCleaned, patches);
    assert.equal(s.totalInspected, patches);
    const frozen = structuredClone(s);
    Engine.tick(s);
    assert.deepEqual(s, frozen);
  });
}
