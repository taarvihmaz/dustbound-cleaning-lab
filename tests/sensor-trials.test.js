"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Engine = require("../game/engine.js");

test("the noisy sensor follows the two expected rates over 2,000 seeded inspections", t => {
  // Fix the layout and use a fresh seed for every real game episode.
  const trialsPerState = 1000;
  for (const [ground, startingSeed, expectedRate] of [
    ["Dirty", 1, 0.8],
    ["Clean", 1001, 0.2],
  ]) {
    let positives = 0;
    for (let i = 0; i < trialsPerState; i++) {
      const state = Engine.create({
        size: 5, character: 0, firstDesign: 0, seed: startingSeed + i, sensorMode: "simulated",
      });
      const tile = ground === "Dirty" ? state.truth.indexOf(1) : state.position;
      assert.equal(Engine.selectCell(state, tile), true);
      for (let step = 0; step < 40 && state.phase !== "result"; step++) {
        Engine.tick(state);
      }
      assert.equal(state.phase, "result");
      assert.equal(state.decision.before, ground);
      assert.equal(state.decision.action, state.signal ? "Clean" : "Move On");
      if (state.signal) positives++;
    }
    const rate = positives / trialsPerState;
    t.diagnostic(`${ground}: ${positives} positive and ${trialsPerState - positives} negative out of ${trialsPerState}.`);
    assert.ok(Math.abs(rate - expectedRate) <= 0.05, `${ground} positive rate was ${rate}`);
  }
});
