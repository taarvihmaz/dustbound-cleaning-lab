"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const Locations = require("../game/locations.js");
const LocationProps = require("../game/location-props.js");

function canonicalFootprint(map) {
  const forms = [];
  for (let transform = 0; transform < 8; transform++) {
    const cells = [];
    for (let i = 0; i < map.length; i++) {
      let x = i % 5, y = Math.floor(i / 5);
      if (transform & 1) x = 4 - x;
      if (transform & 2) y = 4 - y;
      if (transform & 4) [x, y] = [y, x];
      cells.push(map[y * 5 + x]);
    }
    forms.push(cells.join(""));
  }
  return forms.sort()[0];
}

function connectedFloor(map, size) {
  const openCount = map.length - map.reduce((sum, value) => sum + value, 0);
  const pending = [map.indexOf(0)];
  const seen = new Uint8Array(map.length);
  seen[pending[0]] = 1;
  function add(id) {
    if (!map[id] && !seen[id]) {
      seen[id] = 1;
      pending.push(id);
    }
  }
  for (let i = 0; i < pending.length; i++) {
    const id = pending[i];
    if (id % size > 0) add(id - 1);
    if (id % size + 1 < size) add(id + 1);
    if (id >= size) add(id - size);
    if (id + size < map.length) add(id + size);
  }
  return pending.length === openCount;
}

test("158 authored places have unique names, layouts and obstacle ensembles", () => {
  const designs = Locations.designs;
  assert.equal(designs.length, 158);
  for (const field of ["name", "layoutName"]) {
    assert.equal(new Set(designs.map(d => d[field])).size, designs.length);
  }
  const silhouettes = designs.map(d => d.fixtures.map(obj => obj.kind).sort().join("/"));
  assert.equal(new Set(silhouettes).size, 158);
  const symmetricLayouts = designs.map(d => canonicalFootprint(Locations.makeMap(5, d.id)));
  assert.equal(new Set(symmetricLayouts).size, 158);
  const drawable = new Set(LocationProps.kinds);
  for (const d of designs) for (const f of d.fixtures) {
    assert.ok(drawable.has(f.kind), f.kind);
    assert.ok(f.name.trim().length > 2);
  }
});

test("each place uses one of four drawn media and a complete local illustration palette", () => {
  const media = ["Storybook", "Pixel art", "Painted diorama", "Cut paper"];
  assert.deepEqual([...new Set(Locations.designs.map(d => d.style))], media);
  for (const d of Locations.designs) {
    assert.equal(d.style, media[d.mode]);
    assert.equal(d.colors.length, 6);
    assert.ok(d.colors.every(color => /^#[a-f0-9]{6}$/i.test(color)));
    assert.ok(!("photoKey" in d));
    assert.ok(!("photoGroup" in d));
  }
});

for (const size of [5, 10, 20, 50, 100]) {
  test(`every ${size}×${size} place has connected paths, distinct walls and fixtures matching collision cells`, () => {
    const fingerprints = new Set();
    for (const d of Locations.designs) {
      const map = Locations.makeMap(size, d.id);
      assert.equal(map.length, size * size);
      assert.ok(connectedFloor(map, size), d.name);
      fingerprints.add(createHash("sha256").update(map).digest("hex"));
      const kinds = new Set();
      for (let i = 0; i < map.length; i++) {
        const fixture = Locations.fixtureAt(d.id, i, size);
        assert.equal(Boolean(fixture), map[i] === 1, d.name);
        if (fixture) kinds.add(fixture.kind);
      }
      assert.equal(kinds.size, 3, d.name);
    }
    assert.equal(fingerprints.size, 158);
  });
}
