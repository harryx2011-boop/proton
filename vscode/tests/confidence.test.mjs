// Run: node --test tests/confidence.test.mjs   (reads ../../tests/golden/confidence.json, shared with the Python port)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../src/server/confidence.ts';

const G = JSON.parse(readFileSync(new URL('../../tests/golden/confidence.json', import.meta.url), 'utf8'));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test('norm', () => {
  for (const [p, k, want] of G.norm) close(C.norm(p, k), want);
});

test('margin and ratio', () => {
  for (const [probs, margin, ratio] of G.margin_ratio) {
    const [m, r] = C.marginRatio(probs);
    close(m, margin);
    close(r, ratio);
  }
});

test('temper keeps label order and sums to one', () => {
  for (const [probs, t, want] of G.temper) {
    const got = C.temper(probs, t);
    assert.deepEqual(Object.keys(got), Object.keys(want));
    for (const k of Object.keys(want)) close(got[k], want[k]);
  }
});

const TABLE = JSON.parse(readFileSync(new URL('../../src/proton/data/thresholds.json', import.meta.url), 'utf8'));

test('gate boundaries', () => {
  for (const [value, th, want] of G.gate) assert.equal(C.gate(value, th), want);
});

test('thresholds: risk row, override wins, bad input rejected', () => {
  for (const [risk, override, want] of G.thresholds_for) assert.deepEqual(C.thresholdsFor(risk, override, TABLE), want);
  for (const [risk, override] of G.thresholds_errors) assert.throws(() => C.thresholdsFor(risk, override, TABLE));
});

test('ordinal confidence', () => {
  for (const [probs, want] of G.ordinal) close(C.ordinalConfidence(probs), want);
});
