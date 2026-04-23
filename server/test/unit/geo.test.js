'use strict';

// Unit tests for src/services/geo.js (Haversine distance).
// Uses Node's built-in node:test runner + node:assert/strict. No external deps.

const test = require('node:test');
const assert = require('node:assert/strict');

const { getDistance, EARTH_RADIUS_M } = require('../../src/services/geo');

function withinRange(actual, min, max) {
  return actual >= min && actual <= max;
}

test('getDistance: same point → ~0 metres (float tolerance)', () => {
  const d = getDistance(55.75, 37.62, 55.75, 37.62);
  assert.ok(
    Math.abs(d) < 0.001,
    `expected ~0, got ${d}`,
  );
});

test('getDistance: Moscow → St Petersburg is ~633 km', () => {
  const d = getDistance(55.7558, 37.6173, 59.9343, 30.3351);
  assert.ok(
    withinRange(d, 630000, 640000),
    `expected ~633000 m, got ${d}`,
  );
});

test('getDistance: 1° longitude arc at equator ≈ 111.32 km', () => {
  const d = getDistance(0, 0, 0, 1);
  assert.ok(
    withinRange(d, 111000, 112000),
    `expected ~111320 m, got ${d}`,
  );
});

test('getDistance: antimeridian crossing (0.2° arc at equator) ≈ 22.24 km', () => {
  const d = getDistance(0, 179.9, 0, -179.9);
  assert.ok(
    withinRange(d, 22000, 23000),
    `expected ~22240 m, got ${d}`,
  );
});

test('getDistance: pole → equator ≈ quarter of Earth circumference', () => {
  const d = getDistance(90, 0, 0, 0);
  // π * R / 2 ≈ 10,007,543 m with R = 6_371_000
  const expected = (Math.PI * EARTH_RADIUS_M) / 2;
  assert.ok(
    withinRange(d, 10000000, 10020000),
    `expected ~${expected} m, got ${d}`,
  );
});

test('getDistance: symmetric — swapping endpoints yields same result', () => {
  const d1 = getDistance(55.7558, 37.6173, 59.9343, 30.3351);
  const d2 = getDistance(59.9343, 30.3351, 55.7558, 37.6173);
  assert.ok(
    Math.abs(d1 - d2) < 1e-6,
    `expected symmetry, got ${d1} vs ${d2}`,
  );
});
