import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANE_X,
  MAX_HEARTS,
  SAMOSA_CHARGE_MAX,
  SAFE_OPENING_SECONDS,
  TARGET_DISTANCE,
  createInitialGameState,
  spawnWave,
  stepGame,
} from './engine';
import type { InputIntents } from './types';

const IDLE: InputIntents = {
  moveLeft: false,
  moveRight: false,
  jumpPressed: false,
  jumpHeld: false,
  slidePressed: false,
  powerPressed: false,
  switchRunnerPressed: false,
};

test('survives opening safe seconds without input and collects welcoming samosas', () => {
  const state = createInitialGameState(0, 42, 'playing');
  let collectedEvents = 0;

  for (let i = 0; i < 80; i++) {
    const events = stepGame(state, 0.04, IDLE); // 3.2s total
    collectedEvents += events.filter((e) => e.type === 'samosa').length;
  }

  assert.equal(state.phase, 'playing');
  assert.equal(state.hearts, MAX_HEARTS);
  assert.ok(state.distance > 40, 'should run forward automatically');
  assert.ok(collectedEvents >= 3, 'should collect opening center-lane samosas');
});

test('lane switching clamps to valid lanes [0..2]', () => {
  const state = createInitialGameState(0, 10, 'playing');
  assert.equal(state.lane, 1);

  stepGame(state, 0.016, { ...IDLE, moveLeft: true });
  assert.equal(state.lane, 0);

  stepGame(state, 0.016, { ...IDLE, moveLeft: true });
  assert.equal(state.lane, 0);

  stepGame(state, 0.016, { ...IDLE, moveRight: true });
  stepGame(state, 0.016, { ...IDLE, moveRight: true });
  stepGame(state, 0.016, { ...IDLE, moveRight: true });
  assert.equal(state.lane, 2);
});

test('Motu single-jumps while Patlu can double-jump in midair', () => {
  const state = createInitialGameState(0, 11, 'playing');
  // Motu jump
  const e1 = stepGame(state, 0.016, { ...IDLE, jumpPressed: true, jumpHeld: true });
  assert.ok(e1.some((e) => e.type === 'jump'));
  assert.equal(state.grounded, false);

  // Motu cannot double jump
  const e2 = stepGame(state, 0.05, { ...IDLE, jumpPressed: true, jumpHeld: true });
  assert.equal(e2.some((e) => e.type === 'double_jump'), false);

  // Switch to Patlu while airborne -> Patlu can double jump!
  stepGame(state, 0.016, { ...IDLE, switchRunnerPressed: true });
  assert.equal(state.runner, 'patlu');

  const e3 = stepGame(state, 0.016, { ...IDLE, jumpPressed: true, jumpHeld: true });
  assert.ok(e3.some((e) => e.type === 'double_jump'));
  assert.ok(state.playerVy > 10);
});

test('sliding avoids high marigold arches while jumping avoids low crates', () => {
  const state = createInitialGameState(0, 12, 'playing');
  state.obstacles.push({
    id: 900,
    kind: 'arch',
    lane: 1,
    targetLane: 1,
    x: LANE_X[1],
    z: -0.5,
    speed: 0,
    telegraphTimer: 0,
    telegraphMax: 0.5,
    hasLunged: false,
    smashed: false,
    koTimer: 0,
    koVx: 0,
    koVy: 0,
    koVz: 0,
    hitFlash: 0,
  });

  // Slide right before passing under arch
  stepGame(state, 0.03, { ...IDLE, slidePressed: true });
  stepGame(state, 0.04, IDLE);
  assert.equal(state.hearts, MAX_HEARTS, 'sliding passes safely under hanging arch');
});

test('Samosa Power smashes obstacles for bonus points and hitstop', () => {
  const state = createInitialGameState(0, 13, 'playing');
  state.samosaCharge = SAMOSA_CHARGE_MAX;

  state.obstacles.push({
    id: 901,
    kind: 'goon',
    lane: 1,
    targetLane: 1,
    x: LANE_X[1],
    z: -0.8,
    speed: 0,
    telegraphTimer: 0,
    telegraphMax: 0.5,
    hasLunged: false,
    smashed: false,
    koTimer: 0,
    koVx: 0,
    koVy: 0,
    koVz: 0,
    hitFlash: 0,
  });

  const events = stepGame(state, 0.04, { ...IDLE, powerPressed: true });
  assert.ok(events.some((e) => e.type === 'power_start'));
  assert.ok(events.some((e) => e.type === 'smash'));
  assert.equal(state.hearts, MAX_HEARTS);
  assert.equal(state.goonsSmashed, 1);
  assert.ok(state.hitstopTimer > 0, 'heavy smash triggers sim hitstop');
});

test('spawnWave always guarantees at least 1 passable lane across 100 waves', () => {
  const state = createInitialGameState(0, 99, 'playing');
  state.distance = 450;
  for (let w = 0; w < 100; w++) {
    state.obstacles = [];
    spawnWave(state, -90);
    const blockedLanes = new Set(state.obstacles.map((o) => o.lane));
    assert.ok(
      blockedLanes.size <= 2,
      `wave ${w} blocked ${blockedLanes.size} lanes (must leave >= 1 open)`,
    );
  }
});

test('losing all 3 hearts triggers ko_beat then gameover cleanly', () => {
  const state = createInitialGameState(0, 77, 'playing');
  state.hearts = 1;
  state.invulnTimer = 0;

  state.obstacles.push({
    id: 902,
    kind: 'rickshaw',
    lane: 1,
    targetLane: 1,
    x: LANE_X[1],
    z: -0.5,
    speed: 10,
    telegraphTimer: 0,
    telegraphMax: 0.5,
    hasLunged: false,
    smashed: false,
    koTimer: 0,
    koVx: 0,
    koVy: 0,
    koVz: 0,
    hitFlash: 0,
  });

  const hitEvents = stepGame(state, 0.03, IDLE);
  assert.ok(hitEvents.some((e) => e.type === 'hurt'));
  assert.equal(state.hearts, 0);
  assert.equal(state.phase, 'ko_beat');

  // Advance past KO beat duration
  let over = false;
  for (let i = 0; i < 20; i++) {
    const ev = stepGame(state, 0.04, IDLE);
    if (ev.some((e) => e.type === 'gameover')) over = true;
  }
  assert.equal(over, true);
  assert.equal(state.phase, 'gameover');
});

test('reaching TARGET_DISTANCE triggers victory and updates best score', () => {
  const state = createInitialGameState(100, 88, 'playing');
  state.distance = TARGET_DISTANCE - 0.5;
  state.elapsedSec = SAFE_OPENING_SECONDS + 10;

  const events = stepGame(state, 0.04, IDLE);
  assert.ok(events.some((e) => e.type === 'victory'));
  assert.equal(state.phase, 'victory');
  assert.ok(state.bestScore > 100);
});
