export type GamePhase = 'title' | 'playing' | 'paused' | 'ko_beat' | 'victory' | 'gameover';

export type RunnerId = 'motu' | 'patlu';

export type ObstacleKind = 'crate' | 'arch' | 'goon' | 'rickshaw' | 'banana';

export interface ObstacleEntity {
  id: number;
  kind: ObstacleKind;
  lane: number; // 0, 1, 2
  targetLane: number;
  x: number;
  z: number; // distance ahead of player (0 = player z, negative = ahead, positive = behind)
  speed: number; // extra relative approach speed (e.g. rickshaw)
  telegraphTimer: number; // > 0 when telegraphing a lunge or drop
  telegraphMax: number;
  hasLunged: boolean;
  smashed: boolean;
  koTimer: number;
  koVx: number;
  koVy: number;
  koVz: number;
  hitFlash: number;
}

export interface PickupEntity {
  id: number;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  isGolden: boolean; // golden mega samosa worth 2 charge
}

export interface JohnBossState {
  active: boolean;
  z: number; // position ahead of player (negative Z)
  x: number;
  lane: number;
  targetLane: number;
  dropCooldown: number;
  telegraphTimer: number;
  telegraphLane: number;
  strikesTaken: number;
  maxStrikes: number;
  hitFlash: number;
  spinTimer: number;
  nextAppearanceDist: number;
}

export interface GameEvent {
  type:
    | 'samosa'
    | 'jump'
    | 'double_jump'
    | 'land'
    | 'lane_switch'
    | 'slide'
    | 'power_start'
    | 'power_end'
    | 'smash'
    | 'john_strike'
    | 'hurt'
    | 'rickshaw_honk'
    | 'goon_telegraph'
    | 'switch_runner'
    | 'victory'
    | 'gameover';
  x?: number;
  y?: number;
  z?: number;
  value?: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  runner: RunnerId;
  hearts: number;
  maxHearts: number;
  lastDamagedHeart: number;
  score: number;
  bestScore: number;
  distance: number;
  targetDistance: number;
  samosas: number;
  samosaCharge: number; // 0 .. SAMOSA_CHARGE_MAX
  samosaChargeMax: number;
  powerActive: boolean;
  powerRemaining: number;
  powerDuration: number;
  combo: number;
  goonsSmashed: number;
  johnActive: boolean;
  johnStrikes: number;
  johnMaxStrikes: number;
  speedKmh: number;
  invulnerable: boolean;
  isNewBest: boolean;
  elapsedSec: number;
}

export interface InputIntents {
  moveLeft: boolean;
  moveRight: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  slidePressed: boolean;
  powerPressed: boolean;
  switchRunnerPressed: boolean;
}
