import type {
  GameEvent,
  GamePhase,
  HudSnapshot,
  InputIntents,
  JohnBossState,
  ObstacleEntity,
  ObstacleKind,
  PickupEntity,
  RunnerId,
} from './types';

export const LANE_X = [-3.2, 0, 3.2] as const;
export const LANE_COUNT = 3;
export const MAX_HEARTS = 3;
export const SAMOSA_CHARGE_MAX = 10;
export const SAMOSA_POWER_DURATION = 6.5;
export const TARGET_DISTANCE = 1000; // meters to Furfuri Clocktower Finish
export const SAFE_OPENING_SECONDS = 3.5;

const BASE_SPEED = 16.5;
const MAX_SPEED = 27.5;
const GRAVITY = -36;
const JUMP_VELOCITY_MOTU = 13.6;
const JUMP_VELOCITY_PATLU = 14.8;
const DOUBLE_JUMP_VELOCITY = 12.6;
const SLIDE_DURATION = 0.65;
const JUMP_BUFFER_WINDOW = 0.13;
const COYOTE_WINDOW = 0.1;
const INVULN_DURATION = 1.35;
const KO_BEAT_DURATION = 0.55;
const MAX_CONCURRENT_TELEGRAPHS = 2; // attack token pool

export interface GameState {
  phase: GamePhase;
  runner: RunnerId;
  lane: number;
  playerX: number;
  playerY: number;
  playerVy: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpsUsed: number;
  slideTimer: number;
  squashX: number;
  squashY: number;
  leanAngle: number;
  runCycleDist: number;
  switchFlash: number;

  hearts: number;
  lastDamagedHeart: number;
  invulnTimer: number;
  hitFlashTimer: number;
  koBeatTimer: number;

  score: number;
  bestScore: number;
  isNewBest: boolean;
  distance: number;
  elapsedSec: number;
  speed: number;
  combo: number;
  comboTimer: number;
  goonsSmashed: number;

  samosas: number;
  samosaCharge: number;
  powerTimer: number;

  hitstopTimer: number;
  cameraTrauma: number;

  obstacles: ObstacleEntity[];
  pickups: PickupEntity[];
  john: JohnBossState;

  nextEntityId: number;
  nextSpawnDistance: number;
  rngState: number;
}

/** Deterministic Mulberry32 PRNG for reproducible tests and fair waves. */
export function nextRandom(state: GameState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createInitialGameState(
  bestScore = 0,
  seed = 1337,
  initialPhase: GamePhase = 'title',
): GameState {
  const state: GameState = {
    phase: initialPhase,
    runner: 'motu',
    lane: 1,
    playerX: LANE_X[1],
    playerY: 0,
    playerVy: 0,
    grounded: true,
    coyoteTimer: COYOTE_WINDOW,
    jumpBufferTimer: 0,
    jumpsUsed: 0,
    slideTimer: 0,
    squashX: 1,
    squashY: 1,
    leanAngle: 0,
    runCycleDist: 0,
    switchFlash: 0,

    hearts: MAX_HEARTS,
    lastDamagedHeart: -1,
    invulnTimer: 0,
    hitFlashTimer: 0,
    koBeatTimer: 0,

    score: 0,
    bestScore,
    isNewBest: false,
    distance: 0,
    elapsedSec: 0,
    speed: BASE_SPEED,
    combo: 0,
    comboTimer: 0,
    goonsSmashed: 0,

    samosas: 0,
    samosaCharge: 0,
    powerTimer: 0,

    hitstopTimer: 0,
    cameraTrauma: 0,

    obstacles: [],
    pickups: [],
    john: {
      active: false,
      z: -32,
      x: 0,
      lane: 1,
      targetLane: 1,
      dropCooldown: 1.8,
      telegraphTimer: 0,
      telegraphLane: 1,
      strikesTaken: 0,
      maxStrikes: 3,
      hitFlash: 0,
      spinTimer: 0,
      nextAppearanceDist: 220,
    },

    nextEntityId: 1,
    nextSpawnDistance: 62, // Safe opening straightaway for first ~3.5s
    rngState: seed >>> 0,
  };

  seedOpeningSamosas(state);
  return state;
}

/** Place welcoming golden samosas along the center lane during the safe opening. */
function seedOpeningSamosas(state: GameState): void {
  for (let i = 0; i < 6; i++) {
    const z = -(14 + i * 6.5);
    state.pickups.push({
      id: state.nextEntityId++,
      lane: 1,
      x: LANE_X[1],
      y: 0.95,
      z,
      collected: false,
      isGolden: i === 5,
    });
  }
}

export function startNewRun(state: GameState, seed?: number): GameState {
  const nextSeed = seed ?? ((Date.now() ^ 0x9e3779b9) >>> 0);
  return createInitialGameState(state.bestScore, nextSeed, 'playing');
}

export function getDifficultyFactor(distance: number): number {
  return Math.max(0, Math.min(1, distance / TARGET_DISTANCE));
}

export function computeTargetSpeed(distance: number, powerActive: boolean): number {
  const diff = getDifficultyFactor(distance);
  const base = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * diff;
  return powerActive ? base * 1.24 : base;
}

/**
 * Spawn a single fair wave ahead of the player.
 * Guarantees at least 1 unobstructed or clearly passable lane on every wave!
 */
export function spawnWave(state: GameState, spawnZ = -88): void {
  const diff = getDifficultyFactor(state.distance);

  // Pick a guaranteed safe lane (either completely open or a simple jump/slide with samosas)
  const safeLane = Math.floor(nextRandom(state) * LANE_COUNT);

  // Decide how many lanes receive obstacles (1 early, 1-2 mid/late; NEVER 3 impassable)
  const blockTwoLanes = nextRandom(state) < 0.25 + diff * 0.48;
  const candidateLanes = [0, 1, 2].filter((l) => l !== safeLane);
  const blockedLanes: number[] = [];

  if (blockTwoLanes) {
    blockedLanes.push(candidateLanes[0], candidateLanes[1]);
  } else {
    const pick = candidateLanes[Math.floor(nextRandom(state) * candidateLanes.length)];
    blockedLanes.push(pick);
  }

  for (const lane of blockedLanes) {
    const kind = pickObstacleKind(state, diff);
    const extraSpeed = kind === 'rickshaw' ? 9.5 + diff * 4.5 : 0;
    const zOffset = kind === 'rickshaw' ? -16 : 0;
    state.obstacles.push({
      id: state.nextEntityId++,
      kind,
      lane,
      targetLane: lane,
      x: LANE_X[lane],
      z: spawnZ + zOffset,
      speed: extraSpeed,
      telegraphTimer: 0,
      telegraphMax: 0.55,
      hasLunged: false,
      smashed: false,
      koTimer: 0,
      koVx: 0,
      koVy: 0,
      koVz: 0,
      hitFlash: 0,
    });
  }

  // Optionally put a jumpable crate or slideable arch in safeLane ONLY if at least 1 other lane is completely open
  const hasCompletelyOpenLane = blockedLanes.length < 2;
  const trailLane = hasCompletelyOpenLane
    ? [0, 1, 2].find((l) => !blockedLanes.includes(l)) ?? safeLane
    : safeLane;

  // Spawn samosa trail in the passable lane (or arcing over a crate)
  const samosaCount = 3 + Math.floor(nextRandom(state) * 3);
  const arcOverCrate =
    !blockTwoLanes &&
    blockedLanes.length === 1 &&
    state.obstacles[state.obstacles.length - 1]?.kind === 'crate' &&
    nextRandom(state) < 0.45;

  if (arcOverCrate) {
    const crateLane = blockedLanes[0];
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 3.4;
      const height = i === 1 ? 2.55 : 1.35;
      state.pickups.push({
        id: state.nextEntityId++,
        lane: crateLane,
        x: LANE_X[crateLane],
        y: height,
        z: spawnZ + offset,
        collected: false,
        isGolden: i === 1,
      });
    }
  } else {
    for (let i = 0; i < samosaCount; i++) {
      state.pickups.push({
        id: state.nextEntityId++,
        lane: trailLane,
        x: LANE_X[trailLane],
        y: 0.95,
        z: spawnZ - 6 + i * 3.8,
        collected: false,
        isGolden: i === samosaCount - 1 && nextRandom(state) < 0.3,
      });
    }
  }
}

function pickObstacleKind(state: GameState, diff: number): ObstacleKind {
  const r = nextRandom(state);
  if (state.distance < 130) {
    // Opening bazaar stretch: crates, arches, and first goons
    if (r < 0.48) return 'crate';
    if (r < 0.82) return 'arch';
    return 'goon';
  }
  // Full archetype mix: crate, arch, lunging goon, fast charging rickshaw
  const rickshawThreshold = 0.16 + diff * 0.14;
  const goonThreshold = rickshawThreshold + 0.24 + diff * 0.08;
  const archThreshold = goonThreshold + 0.26;
  if (r < rickshawThreshold) return 'rickshaw';
  if (r < goonThreshold) return 'goon';
  if (r < archThreshold) return 'arch';
  return 'crate';
}

export function stepGame(
  state: GameState,
  rawDt: number,
  intents: InputIntents,
): GameEvent[] {
  const events: GameEvent[] = [];
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  // Decay camera trauma & hit flashes in real time even during hitstop
  state.cameraTrauma = Math.max(0, state.cameraTrauma - dt * 1.9);
  state.hitFlashTimer = Math.max(0, state.hitFlashTimer - dt);
  state.switchFlash = Math.max(0, state.switchFlash - dt * 3.5);

  if (state.phase === 'ko_beat') {
    state.koBeatTimer -= dt;
    state.playerVy += GRAVITY * dt;
    state.playerY = Math.max(0, state.playerY + state.playerVy * dt);
    if (state.koBeatTimer <= 0) {
      state.phase = 'gameover';
      events.push({ type: 'gameover' });
    }
    return events;
  }

  if (state.phase !== 'playing') {
    return events;
  }

  // Hitstop freeze pauses simulation physics briefly for heavy smash punch feel
  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    // Still animate smashed obstacles flying off slightly during hitstop? Keep crisp freeze.
    return events;
  }

  state.elapsedSec += dt;

  // Runner switch (Motu <-> Patlu)
  if (intents.switchRunnerPressed) {
    state.runner = state.runner === 'motu' ? 'patlu' : 'motu';
    state.jumpBufferTimer = 0;
    state.switchFlash = 1;
    state.squashX = 1.24;
    state.squashY = 0.82;
    events.push({
      type: 'switch_runner',
      x: state.playerX,
      y: state.playerY + 1,
      z: 0,
    });
  }

  // Samosa Power activation
  if (
    intents.powerPressed &&
    state.powerTimer <= 0 &&
    state.samosaCharge >= SAMOSA_CHARGE_MAX
  ) {
    state.samosaCharge = 0;
    state.powerTimer = SAMOSA_POWER_DURATION;
    state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.55);
    state.squashX = 1.28;
    state.squashY = 1.22;
    events.push({
      type: 'power_start',
      x: state.playerX,
      y: state.playerY + 1.2,
      z: 0,
    });
  }

  const wasPowerActive = state.powerTimer > 0;
  if (state.powerTimer > 0) {
    state.powerTimer = Math.max(0, state.powerTimer - dt);
    if (state.powerTimer === 0 && wasPowerActive) {
      events.push({ type: 'power_end' });
    }
  }
  const powerActive = state.powerTimer > 0;

  // Smooth target speed ramp
  const targetSpeed = computeTargetSpeed(state.distance, powerActive);
  state.speed += (targetSpeed - state.speed) * (1 - Math.exp(-5 * dt));

  // Advance distance & passive distance score
  const deltaDist = state.speed * dt;
  state.distance += deltaDist;
  state.runCycleDist += deltaDist;
  state.score += deltaDist * (powerActive ? 3.2 : 1.5);

  // Combo decay
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }
  }

  // Invulnerability decay
  if (state.invulnTimer > 0) {
    state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  }

  // Lane switching
  if (intents.moveLeft && state.lane > 0) {
    state.lane -= 1;
    state.leanAngle = 0.28;
    events.push({ type: 'lane_switch', x: state.playerX, y: state.playerY + 0.3, z: 0 });
  } else if (intents.moveRight && state.lane < LANE_COUNT - 1) {
    state.lane += 1;
    state.leanAngle = -0.28;
    events.push({ type: 'lane_switch', x: state.playerX, y: state.playerY + 0.3, z: 0 });
  }

  const laneSpring = state.runner === 'patlu' ? 18 : 14.5;
  const targetX = LANE_X[state.lane];
  state.playerX += (targetX - state.playerX) * (1 - Math.exp(-laneSpring * dt));
  state.leanAngle *= Math.exp(-10 * dt);

  // Jump buffering & coyote time
  if (intents.jumpPressed) {
    state.jumpBufferTimer = JUMP_BUFFER_WINDOW;
  } else {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }

  if (state.grounded) {
    state.coyoteTimer = COYOTE_WINDOW;
  } else {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  const maxJumps = state.runner === 'patlu' ? 2 : 1;
  if (state.jumpBufferTimer > 0) {
    if (state.coyoteTimer > 0) {
      // Primary jump
      state.playerVy =
        state.runner === 'patlu' ? JUMP_VELOCITY_PATLU : JUMP_VELOCITY_MOTU;
      state.grounded = false;
      state.coyoteTimer = 0;
      state.jumpBufferTimer = 0;
      state.jumpsUsed = 1;
      state.slideTimer = 0;
      state.squashX = 0.84;
      state.squashY = 1.2;
      events.push({ type: 'jump', x: state.playerX, y: 0.1, z: 0 });
    } else if (state.jumpsUsed < maxJumps) {
      // Patlu's Double Jump ("Idea Bulb!")
      state.playerVy = DOUBLE_JUMP_VELOCITY;
      state.jumpBufferTimer = 0;
      state.jumpsUsed += 1;
      state.slideTimer = 0;
      state.squashX = 0.82;
      state.squashY = 1.24;
      events.push({
        type: 'double_jump',
        x: state.playerX,
        y: state.playerY + 0.4,
        z: 0,
      });
    }
  }

  // Variable jump height cut when jump key released early while rising
  if (!intents.jumpHeld && state.playerVy > 5.5) {
    state.playerVy *= 0.65;
  }

  // Slide / fast-drop stomp
  if (intents.slidePressed) {
    if (state.grounded) {
      state.slideTimer = SLIDE_DURATION;
      state.squashX = 1.24;
      state.squashY = 0.68;
      events.push({ type: 'slide', x: state.playerX, y: 0.2, z: 0 });
    } else {
      // Fast-drop stomp!
      state.playerVy = Math.min(state.playerVy, -22);
      state.slideTimer = SLIDE_DURATION * 0.75;
    }
  }

  if (state.slideTimer > 0) {
    state.slideTimer = Math.max(0, state.slideTimer - dt);
  }

  // Vertical integration
  if (!state.grounded) {
    state.playerVy += GRAVITY * dt;
    state.playerY += state.playerVy * dt;
    if (state.playerY <= 0) {
      state.playerY = 0;
      state.playerVy = 0;
      state.grounded = true;
      state.jumpsUsed = 0;
      state.squashX = 1.22;
      state.squashY = 0.78;
      events.push({ type: 'land', x: state.playerX, y: 0, z: 0 });
    }
  }

  // Damp squash-and-stretch back toward (1, 1)
  const damp = 1 - Math.exp(-12 * dt);
  state.squashX += (1 - state.squashX) * damp;
  state.squashY += (1 - state.squashY) * damp;

  // Spawn new waves after safe opening distance
  if (
    state.elapsedSec >= SAFE_OPENING_SECONDS - 1.2 &&
    state.distance >= state.nextSpawnDistance &&
    state.distance < TARGET_DISTANCE - 55
  ) {
    spawnWave(state, -90);
    const diff = getDifficultyFactor(state.distance);
    const waveGap = 24 - diff * 7.5; // 24m early -> 16.5m late
    state.nextSpawnDistance = state.distance + waveGap;
  }

  // Update John the Don boss getaway encounters
  updateJohnBoss(state, dt, powerActive, events);

  // Count active telegraphing goons for attack token pool
  let activeTelegraphs = 0;
  for (const obs of state.obstacles) {
    if (!obs.smashed && obs.telegraphTimer > 0) activeTelegraphs++;
  }

  // Update obstacles & collisions
  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    const obs = state.obstacles[i];
    obs.hitFlash = Math.max(0, obs.hitFlash - dt);

    if (obs.smashed) {
      obs.koTimer -= dt;
      obs.x += obs.koVx * dt;
      obs.z += obs.koVz * dt;
      obs.koVy += GRAVITY * 0.7 * dt;
      if (obs.koTimer <= 0) {
        state.obstacles.splice(i, 1);
      }
      continue;
    }

    const prevZ = obs.z;
    obs.z += (state.speed + obs.speed) * dt;

    // Archetype Policy 1: Rickshaw Honk Telegraph when entering 56m range
    if (obs.kind === 'rickshaw' && prevZ < -54 && obs.z >= -54) {
      obs.telegraphTimer = 0.65;
      obs.telegraphMax = 0.65;
      events.push({ type: 'rickshaw_honk', x: obs.x, y: 1.5, z: obs.z });
    }

    // Archetype Policy 2: Goon Lane-Lunge Telegraph (with attack token cap!)
    if (
      obs.kind === 'goon' &&
      !obs.hasLunged &&
      obs.telegraphTimer === 0 &&
      obs.z >= -34 &&
      obs.z <= -22 &&
      obs.lane !== state.lane &&
      Math.abs(obs.lane - state.lane) === 1 &&
      activeTelegraphs < MAX_CONCURRENT_TELEGRAPHS
    ) {
      // Check that target lane doesn't already have another obstacle nearby so we never create a 3-lane wall
      const laneBusy = state.obstacles.some(
        (other) =>
          other !== obs &&
          !other.smashed &&
          other.targetLane === state.lane &&
          Math.abs(other.z - obs.z) < 9,
      );
      if (!laneBusy) {
        obs.targetLane = state.lane;
        obs.telegraphTimer = 0.52;
        obs.telegraphMax = 0.52;
        activeTelegraphs++;
        events.push({ type: 'goon_telegraph', x: obs.x, y: 1.4, z: obs.z });
      }
    }

    if (obs.telegraphTimer > 0) {
      obs.telegraphTimer = Math.max(0, obs.telegraphTimer - dt);
      if (obs.kind === 'goon' && obs.telegraphTimer === 0 && !obs.hasLunged) {
        obs.hasLunged = true;
        obs.lane = obs.targetLane;
      }
    }

    // Smoothly interpolate goon X toward committed lane
    if (obs.kind === 'goon') {
      const targetObsX = LANE_X[obs.lane];
      obs.x += (targetObsX - obs.x) * (1 - Math.exp(-10 * dt));
    }

    // Remove passed obstacles behind camera
    if (obs.z > 14) {
      state.obstacles.splice(i, 1);
      continue;
    }

    // Collision detection with player
    if (checkObstacleCollision(state, obs)) {
      if (powerActive) {
        // SAMOSA POWER SMASH!
        obs.smashed = true;
        obs.koTimer = 0.48;
        obs.hitFlash = 0.14;
        obs.koVx = (obs.x >= state.playerX ? 1 : -1) * (10 + nextRandom(state) * 6);
        obs.koVy = 13 + nextRandom(state) * 4;
        obs.koVz = -16;

        state.combo += 1;
        state.comboTimer = 3.2;
        state.goonsSmashed += 1;
        const bonus = 150 + Math.min(state.combo, 8) * 25;
        state.score += bonus;
        state.hitstopTimer = 0.045;
        state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.55);

        events.push({
          type: 'smash',
          x: obs.x,
          y: 1.2,
          z: obs.z,
          value: bonus,
        });
      } else if (state.invulnTimer <= 0) {
        // Player takes 1 Heart of damage
        state.hearts = Math.max(0, state.hearts - 1);
        state.lastDamagedHeart = state.hearts;
        state.invulnTimer = INVULN_DURATION;
        state.hitFlashTimer = 0.18;
        state.combo = 0;
        state.hitstopTimer = 0.055;
        state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.78);
        obs.smashed = true;
        obs.koTimer = 0.32;
        obs.koVx = (obs.x >= state.playerX ? 1 : -1) * 7;
        obs.koVy = 6;
        obs.koVz = 4;

        events.push({ type: 'hurt', x: state.playerX, y: state.playerY + 1, z: 0 });

        if (state.hearts <= 0) {
          state.phase = 'ko_beat';
          state.koBeatTimer = KO_BEAT_DURATION;
          state.playerVy = 8.5;
          finalizeBestScore(state);
          return events;
        }
      }
    }
  }

  // Update Samosa pickups & magnet collection
  const magnetRadius = powerActive ? 4.8 : state.runner === 'patlu' ? 2.6 : 1.7;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    p.z += state.speed * dt;

    if (p.z > 10) {
      state.pickups.splice(i, 1);
      continue;
    }

    const dx = state.playerX - p.x;
    const dy = state.playerY + 0.9 - p.y;
    const dz = -p.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    // Gentle magnetic pull when close (stronger for Patlu or during Samosa Power)
    if (distSq < magnetRadius * magnetRadius && distSq > 0.01) {
      const pull = 1 - Math.exp(-(powerActive ? 14 : 9) * dt);
      p.x += dx * pull;
      p.y += dy * pull;
      p.z += dz * pull;
    }

    const collectDist = powerActive ? 1.85 : 1.35;
    if (distSq < collectDist * collectDist) {
      p.collected = true;
      state.samosas += 1;
      const chargeGain = p.isGolden ? 2 : 1;
      if (!powerActive) {
        state.samosaCharge = Math.min(
          SAMOSA_CHARGE_MAX,
          state.samosaCharge + chargeGain,
        );
      }
      state.combo += 1;
      state.comboTimer = 2.6;
      const pts = (p.isGolden ? 75 : 35) + Math.min(state.combo, 10) * 5;
      state.score += pts;

      events.push({
        type: 'samosa',
        x: p.x,
        y: p.y,
        z: p.z,
        value: pts,
      });
      state.pickups.splice(i, 1);
    }
  }

  // Check Victory condition (Reached Furfuri Clocktower at 1000m or 3 Strikes on John!)
  if (
    state.distance >= TARGET_DISTANCE ||
    state.john.strikesTaken >= state.john.maxStrikes
  ) {
    state.score += 500 + state.hearts * 150;
    finalizeBestScore(state);
    state.phase = 'victory';
    events.push({ type: 'victory' });
  }

  return events;
}

function updateJohnBoss(
  state: GameState,
  dt: number,
  powerActive: boolean,
  events: GameEvent[],
): void {
  const john = state.john;
  john.hitFlash = Math.max(0, john.hitFlash - dt);
  if (john.spinTimer > 0) {
    john.spinTimer = Math.max(0, john.spinTimer - dt);
  }

  if (!john.active && state.distance >= john.nextAppearanceDist && state.distance < TARGET_DISTANCE - 40) {
    john.active = true;
    john.z = -38;
    john.lane = 1;
    john.targetLane = 1;
    john.x = LANE_X[1];
    john.dropCooldown = 1.9;
    john.telegraphTimer = 0;
  }

  if (!john.active) return;

  // Cruise 21m ahead of player (or retreat if spinning from a Samosa Strike)
  const targetZ = john.spinTimer > 0 ? -36 : -21;
  john.z += (targetZ - john.z) * (1 - Math.exp(-3.5 * dt));

  // If Samosa Power is active and John isn't already stunned, Motu lands a Samosa Strike!
  if (powerActive && john.spinTimer <= 0 && john.z > -26) {
    john.strikesTaken += 1;
    john.hitFlash = 0.25;
    john.spinTimer = 2.4;
    state.score += 400;
    state.goonsSmashed += 1;
    state.hitstopTimer = 0.06;
    state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.72);
    events.push({ type: 'john_strike', x: john.x, y: 1.5, z: john.z, value: 400 });

    if (john.strikesTaken < john.maxStrikes) {
      john.active = false;
      john.nextAppearanceDist = state.distance + 240;
    }
    return;
  }

  // Archetype Policy 3: Ranged Kiter / Hazard Dropper
  // John tracks player's lane with delay, telegraphs, then drops a banana-bomb!
  if (john.telegraphTimer > 0) {
    john.telegraphTimer -= dt;
    if (john.telegraphTimer <= 0) {
      // Drop banana/smoke hazard in telegraphed lane
      state.obstacles.push({
        id: state.nextEntityId++,
        kind: 'banana',
        lane: john.telegraphLane,
        targetLane: john.telegraphLane,
        x: LANE_X[john.telegraphLane],
        z: john.z + 2,
        speed: 0,
        telegraphTimer: 0,
        telegraphMax: 0.5,
        hasLunged: true,
        smashed: false,
        koTimer: 0,
        koVx: 0,
        koVy: 0,
        koVz: 0,
        hitFlash: 0,
      });
      john.dropCooldown = 2.5 - getDifficultyFactor(state.distance) * 0.6;
      // Pick a new flanking lane
      const choices = [0, 1, 2].filter((l) => l !== john.lane);
      john.targetLane = choices[Math.floor(nextRandom(state) * choices.length)];
    }
  } else {
    john.dropCooldown -= dt;
    if (john.dropCooldown <= 0) {
      john.targetLane = state.lane;
      john.telegraphLane = state.lane;
      john.telegraphTimer = 0.62;
    }
  }

  john.x += (LANE_X[john.targetLane] - john.x) * (1 - Math.exp(-5.5 * dt));
  john.lane = john.targetLane;
}

export function checkObstacleCollision(
  state: GameState,
  obs: ObstacleEntity,
): boolean {
  const zHalf = obs.kind === 'rickshaw' ? 1.85 : obs.kind === 'arch' ? 0.65 : 0.85;
  if (Math.abs(obs.z) > zHalf) return false;

  const xHalf = obs.kind === 'rickshaw' ? 1.15 : 0.95;
  if (Math.abs(obs.x - state.playerX) > xHalf) return false;

  // Height clearance checks
  const isSliding = state.slideTimer > 0;
  const playerBottom = state.playerY;
  const playerTop = state.playerY + (isSliding ? 0.9 : 1.95);

  if (obs.kind === 'crate' || obs.kind === 'banana') {
    const obsTop = obs.kind === 'banana' ? 0.65 : 1.2;
    // Jump cleanly over crates & bananas
    return playerBottom < obsTop;
  }

  if (obs.kind === 'arch') {
    // High banner bar sits between y=1.15 and y=2.6: slide underneath!
    const archBottom = 1.15;
    return playerTop > archBottom;
  }

  if (obs.kind === 'goon') {
    // Can jump over goon's head (especially with Patlu's jump!) or dodge lane
    return playerBottom < 1.65;
  }

  if (obs.kind === 'rickshaw') {
    // Tall auto-rickshaw: dodge lane (or Patlu double-jump over roof > 2.3m)
    return playerBottom < 2.25;
  }

  return true;
}

function finalizeBestScore(state: GameState): void {
  const rounded = Math.round(state.score);
  if (rounded > state.bestScore) {
    state.bestScore = rounded;
    state.isNewBest = true;
  }
}

export function buildHudSnapshot(state: GameState): HudSnapshot {
  return {
    phase: state.phase,
    runner: state.runner,
    hearts: state.hearts,
    maxHearts: MAX_HEARTS,
    lastDamagedHeart: state.lastDamagedHeart,
    score: Math.round(state.score),
    bestScore: Math.max(state.bestScore, Math.round(state.score)),
    distance: Math.min(TARGET_DISTANCE, Math.round(state.distance)),
    targetDistance: TARGET_DISTANCE,
    samosas: state.samosas,
    samosaCharge: state.samosaCharge,
    samosaChargeMax: SAMOSA_CHARGE_MAX,
    powerActive: state.powerTimer > 0,
    powerRemaining: Number(state.powerTimer.toFixed(1)),
    powerDuration: SAMOSA_POWER_DURATION,
    combo: state.combo,
    goonsSmashed: state.goonsSmashed,
    johnActive: state.john.active,
    johnStrikes: state.john.strikesTaken,
    johnMaxStrikes: state.john.maxStrikes,
    speedKmh: Math.round(state.speed * 2.2),
    invulnerable: state.invulnTimer > 0,
    isNewBest: state.isNewBest,
    elapsedSec: Math.round(state.elapsedSec),
  };
}
