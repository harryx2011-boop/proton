// Run: node --test tests/paths.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { offFlag, skillCatalog, stateDir } from '../src/server/paths.ts';

const home = 'H';

test('state dir: LOCALAPPDATA, else under the home folder, PROTON_STATE_DIR first', () => {
  assert.equal(stateDir({ LOCALAPPDATA: 'L' }, home), join('L', 'Proton', 'state'));
  assert.equal(stateDir({}, home), join(home, '.proton', 'state'));
  assert.equal(stateDir({ PROTON_STATE_DIR: 'S', LOCALAPPDATA: 'L' }, home), 'S');
  assert.equal(stateDir({ PROTON_STATE_DIR: '', LOCALAPPDATA: 'L' }, home), join('L', 'Proton', 'state'));
});

test('skill catalog: inside the state dir unless PROTON_SKILL_CATALOG is set', () => {
  assert.equal(skillCatalog({ PROTON_STATE_DIR: 'S' }, home), join('S', 'skill-catalog.json'));
  assert.equal(skillCatalog({ PROTON_STATE_DIR: 'S', PROTON_SKILL_CATALOG: 'C.json' }, home), 'C.json');
});

test('off flag: a file named off in the state dir', () => {
  assert.equal(offFlag({ PROTON_STATE_DIR: 'S' }, home), join('S', 'off'));
});
