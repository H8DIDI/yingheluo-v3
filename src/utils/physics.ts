/**
 * Fireworks Physics Engine
 * 
 * Realistic ballistic simulation for firework shells and burst particles.
 * Based on real pyrotechnic physics:
 * - Shell launch: mortar impulse → parabolic trajectory with drag
 * - Burst: radial particle dispersion with gravity + quadratic drag
 * - Visual decay: metal salt cooling emission model
 */

// ─── Physical Constants ─────────────────────────────────────────────────────

export const GRAVITY = 9.8; // m/s² (positive, applied downward)
export const DEFAULT_WIND = { x: 0.3, y: 0, z: 0.15 } as const; // gentle breeze

// ─── Effect Physics Profiles ────────────────────────────────────────────────

export interface EffectPhysics {
  /** Speed multiplier relative to base burst speed */
  speedMult: number;
  /** Min/max elevation angle for particle emission (radians) */
  elevationRange: [number, number];
  /** Drag coefficient (higher = more air resistance) */
  drag: number;
  /** Trail brightness retention (0=instant fade, 1=long trail) */
  trailRetention: number;
  /** Whether particles are emitted in full sphere or hemisphere */
  fullSphere: boolean;
  /** Particle size multiplier */
  sizeMult: number;
  /** Duration multiplier */
  durationMult: number;
}

const HALF_PI = Math.PI / 2;

export const EFFECT_PROFILES: Record<string, EffectPhysics> = {
  // 牡丹: 球形均匀扩散, 中等速度, 饱满圆润
  peony: {
    speedMult: 1.0,
    elevationRange: [-HALF_PI, HALF_PI],
    drag: 0.04,
    trailRetention: 0.3,
    fullSphere: true,
    sizeMult: 1.0,
    durationMult: 1.0,
  },
  // 菊花: 类似牡丹但拖尾更长, 燃烧到末端才消失
  chrysanthemum: {
    speedMult: 1.1,
    elevationRange: [-HALF_PI, HALF_PI],
    drag: 0.025,
    trailRetention: 0.75,
    fullSphere: true,
    sizeMult: 0.85,
    durationMult: 1.4,
  },
  // 柳: 初速度高但阻力大, 长拖尾, 明显下垂
  willow: {
    speedMult: 0.7,
    elevationRange: [0.1, HALF_PI * 0.6],
    drag: 0.015,
    trailRetention: 0.92,
    fullSphere: false,
    sizeMult: 0.7,
    durationMult: 2.0,
  },
  // 十字: 4方向分裂
  crossette: {
    speedMult: 1.2,
    elevationRange: [-0.3, 0.3],
    drag: 0.05,
    trailRetention: 0.4,
    fullSphere: false,
    sizeMult: 0.9,
    durationMult: 0.8,
  },
  // 彗星: 单颗大粒子上升拖尾
  comet: {
    speedMult: 0.6,
    elevationRange: [HALF_PI * 0.5, HALF_PI],
    drag: 0.02,
    trailRetention: 0.85,
    fullSphere: false,
    sizeMult: 1.8,
    durationMult: 1.5,
  },
  // 地雷: 从地面向上喷射
  mine: {
    speedMult: 1.3,
    elevationRange: [HALF_PI * 0.3, HALF_PI],
    drag: 0.06,
    trailRetention: 0.2,
    fullSphere: false,
    sizeMult: 0.8,
    durationMult: 0.7,
  },
  // 喷泉: 持续喷射, 小粒子
  fountain: {
    speedMult: 0.5,
    elevationRange: [HALF_PI * 0.4, HALF_PI * 0.9],
    drag: 0.08,
    trailRetention: 0.15,
    fullSphere: false,
    sizeMult: 0.5,
    durationMult: 0.6,
  },
  // 默认 burst
  burst: {
    speedMult: 1.0,
    elevationRange: [-HALF_PI, HALF_PI],
    drag: 0.045,
    trailRetention: 0.35,
    fullSphere: true,
    sizeMult: 1.0,
    durationMult: 1.0,
  },
  // rocket (shell stage, not a burst type)
  rocket: {
    speedMult: 1.0,
    elevationRange: [0, 0],
    drag: 0.003,
    trailRetention: 0.9,
    fullSphere: false,
    sizeMult: 0.8,
    durationMult: 1.0,
  },
};

export function getEffectProfile(type: string): EffectPhysics {
  return EFFECT_PROFILES[type] ?? EFFECT_PROFILES.burst;
}

// ─── Shell Ballistics ───────────────────────────────────────────────────────

/**
 * Calculate launch speed needed to reach a target burst height.
 * v = sqrt(2 * g * h) — simplified (ignoring drag for launch calc)
 * With drag compensation factor.
 */
export function launchSpeedForHeight(burstHeight: number): number {
  // Add ~15% to compensate for drag during ascent
  const dragCompensation = 1.15;
  return Math.sqrt(2 * GRAVITY * Math.max(burstHeight, 5)) * dragCompensation;
}

/**
 * Estimate time to reach apex for a vertically launched shell.
 */
export function timeToApex(launchSpeed: number): number {
  return launchSpeed / GRAVITY;
}

// ─── Particle Velocity Generation ───────────────────────────────────────────

/**
 * Generate a random direction vector for a burst particle.
 * Uses the effect profile to determine spread pattern.
 */
export function randomBurstVelocity(
  profile: EffectPhysics,
  baseSpeed: number,
  directionBias?: number // for crossette: 0, PI/2, PI, 3PI/2
): [number, number, number] {
  const speed = baseSpeed * profile.speedMult * (0.7 + Math.random() * 0.6);

  let azimuth: number; // horizontal angle
  let elevation: number; // vertical angle

  if (directionBias !== undefined) {
    // Crossette: emit in a specific direction with small spread
    azimuth = directionBias + (Math.random() - 0.5) * 0.4;
    elevation = (Math.random() - 0.5) * 0.5;
  } else if (profile.fullSphere) {
    // Full spherical distribution (uniform on sphere)
    azimuth = Math.random() * Math.PI * 2;
    elevation = Math.acos(2 * Math.random() - 1) - HALF_PI;
  } else {
    // Hemisphere / cone distribution
    azimuth = Math.random() * Math.PI * 2;
    const [minEl, maxEl] = profile.elevationRange;
    elevation = minEl + Math.random() * (maxEl - minEl);
  }

  const cosEl = Math.cos(elevation);
  return [
    cosEl * Math.cos(azimuth) * speed,
    Math.sin(elevation) * speed,
    cosEl * Math.sin(azimuth) * speed,
  ];
}

// ─── Physics Step ───────────────────────────────────────────────────────────

/**
 * Update position and velocity for one physics step.
 * Uses semi-implicit Euler with quadratic drag:
 *   F_drag = -drag * |v|² * v_hat
 *   a = gravity + F_drag/m + wind
 *   v' = v + a * dt
 *   x' = x + v' * dt
 */
export function physicsStep(
  pos: [number, number, number],
  vel: [number, number, number],
  dt: number,
  drag: number,
  mass: number,
  wind: { x: number; y: number; z: number } = DEFAULT_WIND
): void {
  const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);

  if (speed > 0.001) {
    // Quadratic drag: F = -c * |v|² * v_hat / m
    const dragForce = (drag * speed * speed) / mass;
    const dragAccel = dragForce / speed; // per component: dragForce * (v_i/speed) = dragAccel * v_i

    vel[0] += (-dragAccel * vel[0] + wind.x * 0.5) * dt;
    vel[1] += (-GRAVITY - dragAccel * vel[1] + wind.y * 0.1) * dt;
    vel[2] += (-dragAccel * vel[2] + wind.z * 0.5) * dt;
  } else {
    vel[1] -= GRAVITY * dt;
  }

  pos[0] += vel[0] * dt;
  pos[1] += vel[1] * dt;
  pos[2] += vel[2] * dt;

  // Ground clamp
  if (pos[1] < 0) {
    pos[1] = 0;
    vel[0] = 0;
    vel[1] = 0;
    vel[2] = 0;
  }
}

// ─── Color Decay Model ──────────────────────────────────────────────────────

/**
 * Simulate metal salt cooling color shift.
 * As particles cool: bright white → vivid color → red shift → dim
 * 
 * @param baseColor RGB [0-1] of the intended color
 * @param life Remaining life [0-1] where 1=just born, 0=dead
 * @param trailRetention How long the trail glows (0-1)
 * @returns Modified RGB values [r, g, b] and brightness [0-1]
 */
export function colorDecay(
  baseR: number, baseG: number, baseB: number,
  life: number,
  trailRetention: number
): { r: number; g: number; b: number; brightness: number } {
  // Phase 1 (life > 0.7): White-hot flash → base color emerges
  // Phase 2 (life 0.3-0.7): Full color, peak beauty
  // Phase 3 (life < 0.3): Red shift + dimming (cooling metal)

  let r: number, g: number, b: number, brightness: number;

  if (life > 0.8) {
    // Flash phase: mix with white
    const flash = (life - 0.8) / 0.2; // 0→1 as life goes 0.8→1.0
    r = baseR + (1 - baseR) * flash * 0.6;
    g = baseG + (1 - baseG) * flash * 0.6;
    b = baseB + (1 - baseB) * flash * 0.6;
    brightness = 1.0;
  } else if (life > 0.25) {
    // Full color phase
    r = baseR;
    g = baseG;
    b = baseB;
    brightness = 0.6 + life * 0.5;
  } else {
    // Cooling phase: shift toward red/orange, dim
    const cool = 1 - life / 0.25; // 0→1 as life goes 0.25→0
    r = baseR + (0.8 - baseR) * cool * 0.5;
    g = baseG * (1 - cool * 0.7);
    b = baseB * (1 - cool * 0.9);
    brightness = life / 0.25 * 0.5;
  }

  // Trail retention affects how fast brightness decays
  const trailFactor = 0.3 + trailRetention * 0.7;
  brightness *= Math.pow(Math.max(life, 0), 1 - trailFactor);

  return { r, g, b, brightness: Math.max(brightness, 0) };
}

// ─── Burst Height Calculation ───────────────────────────────────────────────

/**
 * Calculate realistic burst height from effect parameters.
 * Maps effect.height (in meters) to scene-space burst height.
 * No artificial caps — physics determines the limit.
 */
export function getBurstHeight(effectHeight: number, isGroundEffect: boolean): number {
  if (isGroundEffect) {
    return Math.max(3, Math.min(effectHeight * 0.15, 25));
  }
  // Scale factor for scene space (the scene coordinate system)
  return effectHeight * 0.5;
}
