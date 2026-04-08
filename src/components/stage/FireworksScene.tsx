import { useRef, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { useManagerStore } from '../../store/managerStore';
import {
  Particle,
  FireworkEffect,
  FireworkType,
  Position,
  Rack,
  Tube,
  MatrixRackConfig,
  Project,
  ChoreographyCue,
} from '../../types/domain';
import type { Coordinate } from '../../types/domain';

/** Convert spec coords (x/y on field, z is height) to scene coords (x/z ground, y up). */
function specToSceneArray(value: Coordinate): [number, number, number] {
  return [value.x, value.z, value.y];
}
import { createParticleSprite } from '../../utils/particleSprite';
import GPUParticleSystem, { GPUParticleEmitter } from './GPUParticleSystem';
import { deepAudioEngine } from '../../utils/deepAudioEngine';
import {
  buildQuickLaunchEffect,
  getQuickLaunchLaunchPoint,
  type QuickLaunchRequest,
} from './quickLaunch';
import { buildBurstPattern, resolveBurstPatternMeta } from './burstPatterns';
import {
  shouldTriggerScheduledItem,
  updateCueShellParticle,
  type PendingExplosion,
} from './stagePlayback';
import { playScheduledEventFire } from './stageEventPlayback';

const PARTICLE_COUNT = 500; // Reduced: only shells tracked on CPU now
let GRAVITY = -9.8; // m/s²
let AIR_RESISTANCE = 0.98;
let DRAG_VARIATION = 0.03;
const TUBE_LAUNCH_HEIGHT = 1.5;
const TUBE_RENDER_SCALE = 3;
const TUBE_RENDER_HEIGHT = TUBE_LAUNCH_HEIGHT * TUBE_RENDER_SCALE;
const TUBE_RADIUS = 0.08 * TUBE_RENDER_SCALE;
const TUBE_SPACING = TUBE_RADIUS * 3;
const TUBE_MOUTH_OFFSET = TUBE_RENDER_HEIGHT * 0.95;
const TUBE_OUTLINE_SCALE = 1.08;
let BURST_HEIGHT_SCALE = 0.45;
let GROUND_BURST_MIN = 6;
let GROUND_BURST_MAX = 20;
let VELOCITY_SCALE = 0.75;
let SHELL_DRAG = 0.992;
let SHELL_SIZE = 0.75;
let SHELL_TRAIL = 0.98;
let SHELL_MIN_FLIGHT_TIME = 0.6;
let SHELL_FALL_DISTANCE = 2;
let SHELL_FALL_TIME = 0.25;
const SHELL_BRIGHTNESS = 1.6;
let BURST_FALL_FADE_TIME = 2;
let HEIGHT_LIMIT = Number.POSITIVE_INFINITY;
const MAX_EXPLOSION_HEIGHT = 500; // 与场景空间大小一致
const CONST_SAFE_HEIGHT = 500;
const MAX_PHYSICS_HEIGHT = 500; // 物理极限高度，防止AI参数过大
const MAX_VELOCITY = Math.sqrt(2 * 9.8 * MAX_PHYSICS_HEIGHT); // 最大允许速度 ~54 m/s

interface EnhancedParticle extends Particle {
  type: FireworkType;
  age: number;
  splitTime?: number;
  hasSplit?: boolean;
  trailLength: number;
  baseVelocity: [number, number, number];
  dragCoefficient: number;
  mass: number;
  stage: 'shell' | 'burst';
  effect?: FireworkEffect;
  apexY?: number;
  fallTime?: number;
  scheduledBurstTime?: number;
  hangTime?: number;
  hoverDuration?: number;
  baseColor?: THREE.Color;
  launchPosition?: [number, number, number];
}



interface ScheduledFire {
  key: string;
  time: number;
  positionId: string;
  rackId: string;
  tubeIndex: number;
  tubeId: string;
  effect: FireworkEffect;
}

interface ScheduledCue {
  key: string;
  time: number;
  launchPos: [number, number, number];
  velocity: [number, number, number];
  effect: FireworkEffect;
  burstDelay: number;
  hangTime: number;
}

// Deterministic pseudo random (keeps patterns stable between renders)
function makeDeterministicRandom(seed: string) {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function shuffle<T>(items: T[], rng: () => number) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function capEffectHeight(value: number) {
  return Math.min(value, MAX_EXPLOSION_HEIGHT);
}

function withCappedHeight(effect: FireworkEffect) {
  // 只受场景空间限制
  const height = capEffectHeight(effect.height);
  return height === effect.height ? effect : { ...effect, height };
}

function clampVerticalVelocity(startY: number, velocityY: number) {
  if (!Number.isFinite(HEIGHT_LIMIT)) return velocityY;
  const maxRise = HEIGHT_LIMIT - startY;
  if (maxRise <= 0) return Math.min(velocityY, 0);
  if (GRAVITY < 0 && velocityY > 0) {
    const maxVelocity = Math.sqrt(2 * Math.abs(GRAVITY) * maxRise);
    return Math.min(velocityY, maxVelocity);
  }
  if (GRAVITY >= 0 && velocityY > 0) {
    return 0;
  }
  return velocityY;
}

function clampLaunchSpeed(launchSpeed: number, launchY: number, verticalDir: number) {
  if (!Number.isFinite(HEIGHT_LIMIT)) return launchSpeed;
  if (GRAVITY >= 0 || verticalDir <= 0) return launchSpeed;
  const maxRise = HEIGHT_LIMIT - launchY;
  if (maxRise <= 0) return 0;
  const maxVelocity = Math.sqrt(2 * Math.abs(GRAVITY) * maxRise);
  const maxSpeed = maxVelocity / verticalDir;
  return Math.min(launchSpeed, maxSpeed);
}

function clampTravelDistance(travelDistance: number, launchY: number, verticalDir: number) {
  if (!Number.isFinite(HEIGHT_LIMIT)) return travelDistance;
  if (verticalDir <= 0) return travelDistance;
  const maxRise = HEIGHT_LIMIT - launchY;
  if (maxRise <= 0) return 0;
  const maxDistance = maxRise / verticalDir;
  return Math.min(travelDistance, maxDistance);
}

function clampHeightPosition(particle: EnhancedParticle) {
  if (!Number.isFinite(HEIGHT_LIMIT)) return;
  if (particle.position[1] > HEIGHT_LIMIT) {
    particle.position[1] = HEIGHT_LIMIT;
    if (particle.velocity[1] > 0) {
      particle.velocity[1] = 0;
    }
  }
}

function getBurstHeight(effect: FireworkEffect, isGroundEffect: boolean) {
  // 地面效果保持低空限制
  if (isGroundEffect) {
    const baseHeight = effect.height * BURST_HEIGHT_SCALE;
    return clamp(baseHeight, GROUND_BURST_MIN, GROUND_BURST_MAX);
  }
  // 空中效果：直接使用缩放后的高度，不做额外限制
  // 让效果参数决定高度，物理引擎会自然限制
  return effect.height * BURST_HEIGHT_SCALE;
}

function mapCuePatternToType(pattern: string): FireworkType {
  const key = pattern.trim().toLowerCase();
  if (key.includes('willow')) return 'willow';
  if (key.includes('chrysanthemum') || key.includes('mum')) return 'chrysanthemum';
  if (key.includes('crossette') || key.includes('spark')) return 'crossette';
  if (key.includes('peony') || key.includes('ring')) return 'peony';
  if (key.includes('fountain')) return 'fountain';
  if (key.includes('comet')) return 'comet';
  if (key.includes('mine')) return 'mine';
  return 'burst';
}

function buildEffectFromCue(cue: ChoreographyCue): FireworkEffect {
  const type = mapCuePatternToType(cue.pattern ?? 'burst');
  const intensity = clamp(cue.intensity ?? 0.9, 0.1, 1);
  const size = clamp(cue.size ?? 1, 0.5, 2);
  const particleCount = Math.max(30, Math.round(120 * intensity * size));
  const duration = Math.max(0.6, cue.hangTime ?? 2.2);
  const height = capEffectHeight(cue.debug?.targetPoint?.z ?? 90);
  const trailLength = type === 'willow' ? 0.9 : type === 'chrysanthemum' ? 0.75 : type === 'crossette' ? 0.55 : 0.4;
  const spread = type === 'comet' ? 120 : 360;

  return {
    id: `cue-${cue.id}`,
    name: cue.pattern || 'Cue Burst',
    type,
    color: cue.color || '#F59E0B',
    height,
    duration,
    intensity,
    particleCount,
    spread,
    trailLength,
  };
}

/**
 * Generate multi-color schemes for fireworks
 * Returns 1-3 colors based on random selection:
 * - Mono: Single color
 * - Dual: Complementary colors
 * - Tri: Triad colors
 */
function generateColorScheme(baseColor: string): THREE.Color[] {
  const rand = Math.random();
  const baseHue = new THREE.Color(baseColor).getHSL({ h: 0, s: 0, l: 0 }).h;
  const colors: THREE.Color[] = [];

  if (rand < 0.33) {
    // MONO (1 Color)
    colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
  } else if (rand < 0.66) {
    // DUAL (2 Colors - Complementary)
    colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
    colors.push(new THREE.Color().setHSL((baseHue + 0.5) % 1.0, 1.0, 0.5));
  } else {
    // TRI (3 Colors - Triad)
    colors.push(new THREE.Color().setHSL(baseHue, 1.0, 0.6));
    colors.push(new THREE.Color().setHSL((baseHue + 0.33) % 1.0, 1.0, 0.6));
    colors.push(new THREE.Color().setHSL((baseHue + 0.66) % 1.0, 1.0, 0.6));
  }

  return colors;
}

// Initialize deep audio engine on first user interaction
let audioInitialized = false;
function ensureAudioInitialized() {
  if (!audioInitialized) {
    deepAudioEngine.init();
    audioInitialized = true;
  }
}
// Calculate tube world position and direction (tilt: 0 = 水平, 90 = 垂直向上)
function getTubeTransform(position: Position, rack: Rack, tube: Tube) {
  const baseX = position.coordinate.x;
  const baseY = position.coordinate.y;
  const baseZ = position.coordinate.z;

  let tubeX = baseX;
  let tubeY = baseY;
  let tubeZ = baseZ;
  let directionX = 0;
  let directionY = 1;
  let directionZ = 0;

  if (rack.type === 'fan') {
    // 扇形架：炮筒呈扇形展开，每个炮筒有不同的角度
    const spacing = TUBE_SPACING;
    const offset = (tube.index - (rack.tubeCount - 1) / 2) * spacing;

    // 根据炮筒的角度调整位置，形成扇形
    const tubeAngleRad = (tube.angle + rack.rotation) * (Math.PI / 180);
    const fanRadius = spacing * 0.5;  // 扇形半径

    tubeX += offset * Math.cos((rack.rotation * Math.PI) / 180) + fanRadius * Math.sin(tubeAngleRad);
    tubeZ += offset * Math.sin((rack.rotation * Math.PI) / 180) + fanRadius * Math.cos(tubeAngleRad);
  } else if (rack.type === 'straight') {
    // 直排架：炮筒沿直线排列
    const spacing = TUBE_SPACING;
    const offset = (tube.index - (rack.tubeCount - 1) / 2) * spacing;
    tubeX += offset * Math.cos((rack.rotation * Math.PI) / 180);
    tubeZ += offset * Math.sin((rack.rotation * Math.PI) / 180);
  } else if (rack.type === 'matrix') {
    const config = rack.config as MatrixRackConfig;
    const row = Math.floor(tube.index / config.columns);
    const col = tube.index % config.columns;
    const spacing = Math.max(config.spacing, TUBE_SPACING);

    const offsetX = (col - (config.columns - 1) / 2) * spacing;
    const offsetZ = (row - (config.rows - 1) / 2) * spacing;

    tubeX += offsetX * Math.cos((rack.rotation * Math.PI) / 180) - offsetZ * Math.sin((rack.rotation * Math.PI) / 180);
    tubeZ += offsetX * Math.sin((rack.rotation * Math.PI) / 180) + offsetZ * Math.cos((rack.rotation * Math.PI) / 180);
  }

  const tiltRad = Math.min(Math.max(tube.tilt, 0), 90) * (Math.PI / 180);
  const angleRad = (tube.angle + rack.rotation) * (Math.PI / 180);

  // 以水平面为基准：90° = 直指天空
  directionX = Math.cos(tiltRad) * Math.sin(angleRad);
  directionY = Math.sin(tiltRad);
  directionZ = Math.cos(tiltRad) * Math.cos(angleRad);

  const length = Math.sqrt(directionX ** 2 + directionY ** 2 + directionZ ** 2);
  directionX /= length || 1;
  directionY /= length || 1;
  directionZ /= length || 1;

  return {
    position: [tubeX, tubeY, tubeZ] as [number, number, number],
    direction: [directionX, directionY, directionZ] as [number, number, number],
    angle: angleRad,
    tilt: tiltRad,
  };
}

function buildFiringSchedule(project: Project | null): ScheduledFire[] {
  if (!project) return [];

  const schedule: ScheduledFire[] = [];
  const events = project.events ?? [];
  const positions = project.positions ?? [];
  const uniquePositionIds = new Set(events.map((event) => event.positionId));
  const shouldSpreadPositions = positions.length > 1 && uniquePositionIds.size <= 1;
  const orderedPositions = shouldSpreadPositions
    ? [...positions].sort(
        (a, b) => a.coordinate.x - b.coordinate.x || a.coordinate.z - b.coordinate.z
      )
    : [];

  events.forEach((event) => {
    const basePosition = positions.find((p) => p.id === event.positionId);
    const targetPositions = shouldSpreadPositions
      ? orderedPositions
      : basePosition
        ? [basePosition]
        : [];
    if (targetPositions.length === 0) return;

    const targets = targetPositions
      .map((position, index) => {
        const rack = position.racks.find((r) => r.id === event.rackId) ?? position.racks[0];
        if (!rack) return null;
        return { position, rack, index };
      })
      .filter((target): target is { position: Position; rack: Rack; index: number } => !!target);

    if (targets.length === 0) return;

    const maxOffset =
      Math.max(0, (project.duration ?? event.startTime) - event.startTime - 0.1);
    const spreadStep =
      targets.length > 1 ? Math.min(0.18, maxOffset / (targets.length - 1)) : 0;
    const intervalSec = Math.max(0.05, (event.interval ?? 200) / 1000);
    const rng = makeDeterministicRandom(event.id);

    targets.forEach((target) => {
      const { position, rack, index } = target;
      const positionOffset = index * spreadStep;
      const tubesToFire =
        event.tubeIndices.length > 0 ? event.tubeIndices : rack.tubes.map((_, idx) => idx);

      const enqueue = (tubeIdx: number, offset: number) => {
        const tube = rack.tubes[tubeIdx];
        if (!tube || !tube.loaded || !tube.effect) return;
        schedule.push({
          key: `${event.id}-${position.id}-${tubeIdx}-${offset.toFixed(3)}`,
          time: event.startTime + positionOffset + offset,
          positionId: position.id,
          rackId: rack.id,
          tubeIndex: tubeIdx,
          tubeId: tube.id,
          effect: tube.effect,
        });
      };

      const sequential = (order: number[]) =>
        order.forEach((tubeIdx, orderIdx) => enqueue(tubeIdx, orderIdx * intervalSec));

      switch (event.pattern) {
        case 'all':
          tubesToFire.forEach((tubeIdx) => enqueue(tubeIdx, 0));
          break;
        case 'reverse':
          sequential([...tubesToFire].reverse());
          break;
        case 'random':
          sequential(shuffle(tubesToFire, rng));
          break;
        case 'wave':
          if (rack.type === 'matrix') {
            const config = rack.config as MatrixRackConfig;
            const entries = tubesToFire.map((idx) => {
              const row = Math.floor(idx / config.columns);
              const col = idx % config.columns;
              return { idx, row, col };
            });
            entries
              .sort((a, b) => a.col - b.col || a.row - b.row)
              .forEach((entry) => {
                const colOffset = entry.col * intervalSec;
                const rowOffset =
                  (entry.row / Math.max(1, config.rows - 1)) * intervalSec * 0.4;
                enqueue(entry.idx, colOffset + rowOffset);
              });
          } else {
            sequential(tubesToFire);
          }
          break;
        case 'spiral':
          if (rack.type === 'matrix') {
            const config = rack.config as MatrixRackConfig;
            const centerX = (config.columns - 1) / 2;
            const centerZ = (config.rows - 1) / 2;
            const entries = tubesToFire.map((idx) => {
              const row = Math.floor(idx / config.columns);
              const col = idx % config.columns;
              const dx = col - centerX;
              const dz = row - centerZ;
              return { idx, angle: Math.atan2(dz, dx), radius: Math.sqrt(dx * dx + dz * dz) };
            });
            entries
              .sort((a, b) =>
                a.radius === b.radius ? a.angle - b.angle : a.radius - b.radius
              )
              .forEach((entry, orderIdx) =>
                enqueue(entry.idx, orderIdx * intervalSec * 0.6)
              );
          } else {
            sequential(tubesToFire);
          }
          break;
        case 'sequential':
        default:
          sequential(tubesToFire);
      }
    });
  });

  return schedule.sort((a, b) => a.time - b.time);
}

function buildCueSchedule(project: Project | null): ScheduledCue[] {
  const cues = project?.cueList ?? [];
  if (cues.length === 0) return [];

  return cues
    .map((cue, index) => ({
      key: `cue-${cue.id}-${index}`,
      time: Math.max(0, cue.launchTime),
      launchPos: specToSceneArray(cue.launcherPos),
      velocity: specToSceneArray(cue.initVelocity),
      effect: buildEffectFromCue(cue),
      burstDelay: Math.max(0.1, cue.burstTime),
      hangTime: Math.max(0.4, cue.hangTime ?? 2),
    }))
    .sort((a, b) => a.time - b.time);
}

export function FireworksScene({ heightLimit }: { heightLimit?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gpuParticlesRef = useRef<GPUParticleEmitter>(null);
  const {
    project,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    selectedPosition,
    fireTube,
    replayToken,
    quickLaunchQueue,
    shiftQuickLaunch,
  } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      setCurrentTime: state.setCurrentTime,
      setIsPlaying: state.setIsPlaying,
      selectedPosition: state.selectedPosition,
      fireTube: state.fireTube,
      replayToken: state.replayToken,
      quickLaunchQueue: state.quickLaunchQueue,
      shiftQuickLaunch: state.shiftQuickLaunch,
    }))
  );
  const showSettings = useManagerStore(
    useShallow((state) => state.showSettings)
  );

  GRAVITY = showSettings.gravity;
  AIR_RESISTANCE = showSettings.airResistance;
  DRAG_VARIATION = showSettings.dragVariation;
  BURST_HEIGHT_SCALE = showSettings.burstHeightScale;
  GROUND_BURST_MIN = showSettings.groundBurstMin;
  GROUND_BURST_MAX = showSettings.groundBurstMax;
  VELOCITY_SCALE = showSettings.velocityScale;
  SHELL_DRAG = showSettings.shellDrag;
  SHELL_SIZE = showSettings.shellSize;
  SHELL_TRAIL = showSettings.shellTrail;
  SHELL_MIN_FLIGHT_TIME = showSettings.shellMinFlightTime;
  SHELL_FALL_DISTANCE = showSettings.shellFallDistance;
  SHELL_FALL_TIME = showSettings.shellFallTime;
  BURST_FALL_FADE_TIME = showSettings.burstFallFadeTime;
  const SCENE_TOP_LIMIT =
    typeof heightLimit === 'number' && Number.isFinite(heightLimit)
      ? heightLimit
      : CONST_SAFE_HEIGHT;
  HEIGHT_LIMIT = SCENE_TOP_LIMIT;
  const groundHeight = project?.groundHeight ?? 0;

  const particles = useRef<EnhancedParticle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const particleSprite = useMemo(() => createParticleSprite(), []);
  const firedEvents = useRef<Set<string>>(new Set());
  const firedTubes = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef(0);
  const lastReplayRef = useRef(0);
  const ammoWarningLogged = useRef(false);

  const firingSchedule = useMemo(() => buildFiringSchedule(project), [project]);
  const cueSchedule = useMemo(() => buildCueSchedule(project), [project]);
  const useCueSchedule = cueSchedule.length > 0;
  const playbackMode = useCueSchedule ? 'cue' : 'event';

  const resetSceneState = () => {
    if (!meshRef.current) return;

    firedEvents.current.clear();
    firedTubes.current.clear();
    ammoWarningLogged.current = false;
    lastTimeRef.current = 0;

    particles.current.forEach((particle, index) => {
      particle.life = 0;
      particle.age = 0;
      particle.position = [0, -100, 0];
      particle.velocity = [0, 0, 0];
      particle.baseVelocity = [0, 0, 0];
      particle.effect = undefined;
      particle.stage = 'burst';
      particle.apexY = undefined;
      particle.fallTime = undefined;
      particle.scheduledBurstTime = undefined;
      particle.hangTime = undefined;
      particle.launchPosition = undefined;

      dummy.position.set(0, -100, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  };

  const reportAmmoExhausted = () => {
    if (ammoWarningLogged.current) return;
    ammoWarningLogged.current = true;
    console.warn('弹药耗尽：所有炮筒均已发射');
  };

  // Initialize particles
  useEffect(() => {
    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      position: [0, -100, 0] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      baseVelocity: [0, 0, 0] as [number, number, number],
      color: '#000000',
      life: 0,
      size: 0,
      type: 'burst' as FireworkType,
      age: 0,
      trailLength: 0,
      dragCoefficient: AIR_RESISTANCE + (Math.random() - 0.5) * DRAG_VARIATION,
      mass: 0.8 + Math.random() * 0.4,
      stage: 'burst',
      effect: undefined,
      apexY: undefined,
      fallTime: undefined,
      scheduledBurstTime: undefined,
      hangTime: undefined,
      launchPosition: undefined,
    }));
  }, []);

  // Reset when回放重头开始或切换工程
  useEffect(() => {
    if (currentTime === 0) {
      firedEvents.current.clear();
    }
  }, [currentTime]);

  useEffect(() => {
    firedEvents.current.clear();
  }, [project]);

  useEffect(() => {
    resetSceneState();
    setCurrentTime(0);
  }, [project, playbackMode, setCurrentTime]);

  useEffect(() => {
    if (replayToken === lastReplayRef.current) return;
    lastReplayRef.current = replayToken;
    resetSceneState();
    setCurrentTime(0);
  }, [replayToken, setCurrentTime]);

  useEffect(() => {
    if (playbackMode !== 'event') {
      firedTubes.current = new Set();
      return;
    }
    const next = new Set<string>();
    project?.positions.forEach((position) => {
      position.racks.forEach((rack) => {
        rack.tubes.forEach((tube) => {
          if (tube.isFired) {
            next.add(tube.id);
          }
        });
      });
    });
    firedTubes.current = next;
  }, [playbackMode, project]);

  useEffect(() => {
    const nextRequest = quickLaunchQueue[0];
    if (!nextRequest) return;
    spawnQuickLaunch(nextRequest);
    shiftQuickLaunch();
  }, [quickLaunchQueue, shiftQuickLaunch]);

  useEffect(() => {
    if (currentTime < lastTimeRef.current) {
      firedEvents.current.clear();
    }
    lastTimeRef.current = currentTime;
  }, [currentTime]);

  const spawnBurstAt = (
    burstPos: [number, number, number],
    effect: FireworkEffect,
    hangTime?: number
  ) => {
    ensureAudioInitialized();
    const particleCount = Math.max(10, Math.floor(effect.particleCount * effect.intensity));
    const resolvedHangTime = Math.max(0.4, hangTime ?? effect.duration);

    // Generate multi-color scheme for this burst
    const colorScheme = generateColorScheme(effect.color);

    // Play deep bass explosion sound
    deepAudioEngine.playDeepExplosion();

    // Build GPU particle arrays
    const velocities: Array<[number, number, number]> = [];
    const colors: Array<[number, number, number]> = [];
    const lifespans: number[] = [];
    const sizes: number[] = [];
    const shapePattern = effect.burstPattern
      ? buildBurstPattern(effect.burstPattern, particleCount, effect.burstLabel ? 6.8 : 10)
      : null;

    for (let i = 0; i < particleCount; i++) {
      let angle: number;
      let elevation: number;
      let speed: number;

        if (shapePattern) {
          const point = shapePattern[i % shapePattern.length];
          const patternMeta = effect.burstPattern ? resolveBurstPatternMeta(effect.burstPattern) : null;
          const duration = Math.max(resolvedHangTime * (patternMeta?.kind === 'text' ? 0.72 : 0.55), 0.9);
          velocities.push([
            point[0] / duration,
            point[1] / duration,
            point[2] / duration,
          ]);

        const targetColor = colorScheme[Math.floor(Math.random() * colorScheme.length)];
        const brightness = 0.7 + Math.random() * 0.5;
        colors.push([
          targetColor.r * brightness,
          targetColor.g * brightness,
          targetColor.b * brightness,
        ]);

        lifespans.push(resolvedHangTime);
        sizes.push((effect.burstLabel ? 3.8 : 4.2) + Math.random() * 2.5);
        continue;
      }

      switch (effect.type) {
        case 'peony':
          angle = Math.random() * Math.PI * 2;
          elevation = Math.acos(2 * Math.random() - 1) - Math.PI / 2;
          speed = (10 + Math.random() * 18) * VELOCITY_SCALE;
          break;
        case 'chrysanthemum':
          angle = Math.random() * Math.PI * 2;
          elevation = Math.acos(2 * Math.random() - 1) - Math.PI / 2;
          speed = (11 + Math.random() * 19.8) * VELOCITY_SCALE;
          break;
        case 'willow':
          angle = Math.random() * Math.PI * 2;
          elevation = Math.random() * Math.PI * 0.3 + Math.PI * 0.1;
          speed = (5 + Math.random() * 10) * VELOCITY_SCALE;
          break;
        case 'crossette': {
          const direction = Math.floor(Math.random() * 4);
          angle = direction * (Math.PI / 2) + (Math.random() - 0.5) * 0.3;
          elevation = (Math.random() - 0.5) * 0.4;
          speed = (12 + Math.random() * 12) * VELOCITY_SCALE;
          break;
        }
        default:
          angle = Math.random() * Math.PI * 2;
          elevation = Math.random() * Math.PI * 0.5;
          speed = (10 + Math.random() * 16) * VELOCITY_SCALE;
      }

      const vx = Math.cos(angle) * Math.cos(elevation) * speed;
      const vyRaw = Math.sin(elevation) * speed;
      const maxRiseHeight = HEIGHT_LIMIT - burstPos[1];
      const maxVerticalSpeed = maxRiseHeight > 0
        ? Math.sqrt(2 * Math.abs(GRAVITY) * maxRiseHeight)
        : 0;
      const vy = vyRaw > 0 ? Math.min(vyRaw, maxVerticalSpeed) : vyRaw;
      const vz = Math.sin(angle) * Math.cos(elevation) * speed;

      velocities.push([vx, vy, vz]);

      const targetColor = colorScheme[Math.floor(Math.random() * colorScheme.length)];
      const brightness = 0.5 + Math.random() * 0.8;
      colors.push([
        targetColor.r * brightness,
        targetColor.g * brightness,
        targetColor.b * brightness,
      ]);

      lifespans.push(resolvedHangTime);
      sizes.push(effect.type === 'chrysanthemum' ? 3.0 + Math.random() * 4.0 : 4.0 + Math.random() * 6.0);
    }

    // Emit to GPU particle system
    if (gpuParticlesRef.current) {
      gpuParticlesRef.current.emit(burstPos, velocities, colors, lifespans, sizes);
    }
  };

  const spawnQuickLaunch = (request: QuickLaunchRequest) => {
    const effect = buildQuickLaunchEffect(request.preset, `quick-${request.id}`);
    const launchPos = getQuickLaunchLaunchPoint(request.world);
    const burstHeight = request.preset === 'willow' ? 30 : request.preset === 'comet' ? 18 : 24;
    const burstPos: [number, number, number] = [request.world[0], burstHeight, request.world[2]];
    const burstDelay = request.preset === 'comet' ? 0.8 : request.preset === 'willow' ? 1.35 : 1.15;
    const velocity: [number, number, number] = [
      (burstPos[0] - launchPos[0]) / burstDelay,
      (burstPos[1] - launchPos[1] - 0.5 * GRAVITY * burstDelay * burstDelay) / burstDelay,
      (burstPos[2] - launchPos[2]) / burstDelay,
    ];

    spawnCueShell(launchPos, velocity, effect, burstDelay, effect.duration);
  };

  const spawnLaunchShell = (
    launchPos: [number, number, number],
    tubeDir: [number, number, number],
    effect: FireworkEffect
  ) => {
    const [launchX, launchY, launchZ] = launchPos;

    const flightHeight = getBurstHeight(effect, false);
    const baseSpeed = Math.sqrt(2 * Math.abs(GRAVITY) * flightHeight);
    const randomSpeed = baseSpeed * (0.9 + Math.random() * 0.15);
    // 应用速度硬顶限制，防止AI参数过大
    const cappedSpeed = Math.min(randomSpeed, MAX_VELOCITY);
    const launchSpeed = clampLaunchSpeed(cappedSpeed, launchY, tubeDir[1]);
    const vx = tubeDir[0] * launchSpeed;
    const vy = clampVerticalVelocity(launchY, tubeDir[1] * launchSpeed);
    const vz = tubeDir[2] * launchSpeed;

    for (let i = 0; i < particles.current.length; i++) {
      const particle = particles.current[i];
      if (particle.life <= 0) {
        particle.position = [launchX, launchY, launchZ];
        particle.velocity = [vx, vy, vz];
        particle.baseVelocity = [vx, vy, vz];
        particle.color = effect.color;
        particle.life = 1;
        particle.size = SHELL_SIZE + Math.random() * 0.15;
        particle.type = 'rocket';
        particle.stage = 'shell';
        particle.trailLength = Math.max(SHELL_TRAIL, effect.trailLength);
        particle.age = 0;
        particle.splitTime = undefined;
        particle.hasSplit = undefined;
        particle.dragCoefficient = SHELL_DRAG + (Math.random() - 0.5) * DRAG_VARIATION;
        particle.mass = 1.2;
        particle.effect = effect;
        particle.apexY = launchY;
        particle.fallTime = 0;
        particle.scheduledBurstTime = undefined;
        particle.hangTime = undefined;
        particle.launchPosition = [launchX, launchY, launchZ];
        break;
      }
    }
  };

  const spawnCueShell = (
    launchPos: [number, number, number],
    velocity: [number, number, number],
    effect: FireworkEffect,
    burstDelay: number,
    hangTime: number
  ) => {
    const [launchX, launchY, launchZ] = launchPos;
    // 应用速度硬顶限制，防止AI参数过大
    const speed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
    const speedScale = speed > MAX_VELOCITY ? MAX_VELOCITY / speed : 1;
    const cappedVelocity: [number, number, number] = [
      velocity[0] * speedScale,
      clampVerticalVelocity(launchY, velocity[1] * speedScale),
      velocity[2] * speedScale,
    ];
    const cappedEffect = withCappedHeight(effect);

    for (let i = 0; i < particles.current.length; i++) {
      const particle = particles.current[i];
      if (particle.life <= 0) {
        particle.position = [launchX, launchY, launchZ];
        particle.velocity = [...cappedVelocity];
        particle.baseVelocity = [...cappedVelocity];
        particle.color = effect.color;
        particle.life = 1;
        particle.size = effect.type === 'comet' ? SHELL_SIZE * 0.9 : effect.type === 'willow' ? SHELL_SIZE * 1.15 : SHELL_SIZE;
        particle.type = 'rocket';
        particle.stage = 'shell';
        particle.trailLength = Math.max(SHELL_TRAIL, effect.trailLength);
        particle.age = 0;
        particle.splitTime = undefined;
        particle.hasSplit = undefined;
        particle.dragCoefficient = 1;
        particle.mass = 1;
        particle.effect = cappedEffect;
        particle.apexY = launchY;
        particle.fallTime = 0;
        particle.scheduledBurstTime = burstDelay;
        particle.hangTime = hangTime;
        particle.launchPosition = [launchX, launchY, launchZ];
        break;
      }
    }
  };

  const spawnFireworkFromTube = (
    tubePos: [number, number, number],
    tubeDir: [number, number, number],
    effect: FireworkEffect
  ) => {
    const cappedEffect = withCappedHeight(effect);
    const launchPos: [number, number, number] = [
      tubePos[0] + tubeDir[0] * TUBE_MOUTH_OFFSET,
      tubePos[1] + tubeDir[1] * TUBE_MOUTH_OFFSET + groundHeight,
      tubePos[2] + tubeDir[2] * TUBE_MOUTH_OFFSET,
    ];

    const isGroundEffect = cappedEffect.type === 'fountain' || cappedEffect.type === 'sparkler';
    if (isGroundEffect) {
      const burstHeight = clampTravelDistance(
        getBurstHeight(cappedEffect, true),
        launchPos[1],
        tubeDir[1]
      );
      const burstPos: [number, number, number] = [
        launchPos[0] + tubeDir[0] * burstHeight,
        launchPos[1] + tubeDir[1] * burstHeight,
        launchPos[2] + tubeDir[2] * burstHeight,
      ];
      spawnBurstAt(burstPos, cappedEffect);
      return;
    }

    spawnLaunchShell(launchPos, tubeDir, cappedEffect);
  };

  const spawnSplit = (particle: EnhancedParticle) => {
    if (!gpuParticlesRef.current) return;
    const splitCount = 4;
    const velocities: Array<[number, number, number]> = [];
    const colors: Array<[number, number, number]> = [];
    const lifespans: number[] = [];
    const sizes: number[] = [];
    const pColor = new THREE.Color(particle.color);

    for (let s = 0; s < splitCount; s++) {
      const angle = s * (Math.PI / 2) + Math.random() * 0.2;
      const speed = (6 + Math.random() * 4) * VELOCITY_SCALE;
      const cappedVy = clampVerticalVelocity(
        particle.position[1],
        (Math.random() - 0.5) * 2
      );
      velocities.push([Math.cos(angle) * speed, cappedVy, Math.sin(angle) * speed]);
      colors.push([pColor.r, pColor.g, pColor.b]);
      lifespans.push(particle.hangTime ?? 1.5);
      sizes.push(3.0 + Math.random() * 3.0);
    }
    gpuParticlesRef.current.emit(
      particle.position as [number, number, number],
      velocities, colors, lifespans, sizes
    );
  };

  // Animation loop
  useFrame((_, delta) => {
    if (!meshRef.current || !project) return;

    // Sync physics params to GPU particle system
    if (gpuParticlesRef.current) {
      gpuParticlesRef.current.setGravity(GRAVITY);
      gpuParticlesRef.current.setDrag(AIR_RESISTANCE);
    }

    const clampedDelta = Math.min(delta, 0.05);
    const windowStart = currentTime;
    let windowEnd = currentTime;

    if (isPlaying) {
      const duration = project?.duration ?? Infinity;
      windowEnd = Math.min(duration, currentTime + clampedDelta);

      if (windowEnd >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
      } else {
        setCurrentTime(windowEnd);
      }
    }

    // Trigger schedule inside the current frame window
    const activeSchedule = useCueSchedule ? cueSchedule : firingSchedule;
    activeSchedule.forEach((item) => {
      if (
        !firedEvents.current.has(item.key) &&
        shouldTriggerScheduledItem(item.time, windowStart, windowEnd)
      ) {
        firedEvents.current.add(item.key);
        if (useCueSchedule) {
          const cueItem = item as ScheduledCue;
          spawnCueShell(
            cueItem.launchPos,
            cueItem.velocity,
            cueItem.effect,
            cueItem.burstDelay,
            cueItem.hangTime
          );
        } else {
          const fireItem = item as ScheduledFire;
          playScheduledEventFire({
            fireItem,
            positions: project.positions,
            firedTubeIds: firedTubes.current,
            findTransform: getTubeTransform,
            fireTube,
            spawnFireworkFromTube,
            reportAmmoExhausted,
          });
        }
      }
    });

    const pendingExplosions: PendingExplosion[] = [];

    // Update particles with physics
    particles.current.forEach((particle, i) => {
      if (particle.life <= 0) {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        return;
      }

      particle.age += clampedDelta;

      if (particle.stage === 'shell') {
        // Realistic shell ballistics: quadratic drag + gravity
        const shellDrag = particle.dragCoefficient;
        // const shellMass = particle.mass;
        const shellSpeed = Math.sqrt(
          particle.velocity[0] ** 2 + particle.velocity[1] ** 2 + particle.velocity[2] ** 2
        );

        if (shellSpeed > 0.01) {
          // Exponential drag: v *= drag^dt  (drag ~0.998 per 1/60s)
          // Convert to continuous: factor = drag^(dt*60)
          const dragFactor = Math.pow(shellDrag, clampedDelta * 60);
          particle.velocity[0] *= dragFactor;
          particle.velocity[1] *= dragFactor;
          particle.velocity[2] *= dragFactor;
        }

        // Gravity (GRAVITY is negative)
        particle.velocity[1] += GRAVITY * clampedDelta;

        if (particle.scheduledBurstTime !== undefined) {
          const pending = updateCueShellParticle(particle, GRAVITY, (shellParticle) => {
            clampHeightPosition(shellParticle as EnhancedParticle);
          });
          if (pending) {
            pendingExplosions.push(pending);
          }
        } else {
          // Light wind effect on non-planned shells only
          particle.velocity[0] += 0.15 * clampedDelta;
          particle.velocity[2] += 0.08 * clampedDelta;

          particle.position[0] += particle.velocity[0] * clampedDelta;
          particle.position[1] += particle.velocity[1] * clampedDelta;
          particle.position[2] += particle.velocity[2] * clampedDelta;
        }
        clampHeightPosition(particle);

        const previousApex = particle.apexY ?? particle.position[1];
        const apexY = Math.max(previousApex, particle.position[1]);
        particle.apexY = apexY;
        if (particle.velocity[1] < 0) {
          particle.fallTime = (particle.fallTime ?? 0) + clampedDelta;
        } else {
          particle.fallTime = 0;
        }

        const hasFallenDistance = apexY - particle.position[1] >= SHELL_FALL_DISTANCE;
        const hasFallenTime = (particle.fallTime ?? 0) >= SHELL_FALL_TIME;

        let shouldExplode = false;
        if (particle.effect && particle.scheduledBurstTime !== undefined) {
          shouldExplode = particle.age >= particle.scheduledBurstTime;
        } else if (
          particle.effect &&
          particle.age >= SHELL_MIN_FLIGHT_TIME &&
          (hasFallenDistance || hasFallenTime)
        ) {
          pendingExplosions.push({
            position: [...particle.position] as [number, number, number],
            effect: particle.effect,
          });
          shouldExplode = true;
        }

        if (shouldExplode) {
          particle.life = 0;
          particle.effect = undefined;
          particle.apexY = undefined;
          particle.fallTime = undefined;
          particle.scheduledBurstTime = undefined;
          particle.launchPosition = undefined;

          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
          return;
        }

        dummy.position.set(...particle.position);
        dummy.scale.setScalar(particle.size);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);

        tempColor.set(particle.color);
        const shellGlow = particle.effect?.type === 'comet' ? SHELL_BRIGHTNESS * 1.4 : particle.effect?.type === 'willow' ? SHELL_BRIGHTNESS * 1.15 : SHELL_BRIGHTNESS;
        meshRef.current!.setColorAt(i, tempColor.multiplyScalar(shellGlow));
        return;
      }

      if (
        particle.type === 'crossette' &&
        !particle.hasSplit &&
        particle.splitTime &&
        particle.age >= particle.splitTime
      ) {
        spawnSplit(particle);
        particle.hasSplit = true;
        deepAudioEngine.playSplitSound();
      }

      particle.position[0] += particle.velocity[0] * clampedDelta;
      particle.position[1] += particle.velocity[1] * clampedDelta;
      particle.position[2] += particle.velocity[2] * clampedDelta;
      clampHeightPosition(particle);

      // Realistic burst particle physics: quadratic drag + gravity
      const burstDrag = particle.dragCoefficient;
      // const burstMass = particle.mass;
      const burstSpeed = Math.sqrt(
        particle.velocity[0] ** 2 + particle.velocity[1] ** 2 + particle.velocity[2] ** 2
      );

      if (burstSpeed > 0.01) {
        // Exponential drag matching GPU shader model
        const dragFactor = Math.pow(burstDrag, clampedDelta * 60);
        particle.velocity[0] *= dragFactor;
        particle.velocity[1] *= dragFactor;
        particle.velocity[2] *= dragFactor;
      }

      // Gravity
      particle.velocity[1] += GRAVITY * clampedDelta;

      // Wind effect
      particle.velocity[0] += 0.3 * clampedDelta;
      particle.velocity[2] += 0.15 * clampedDelta;

      // Life decay based on age vs duration — no artificial hover
      const maxDuration = particle.hangTime ?? BURST_FALL_FADE_TIME;
      const ageRatio = particle.age / Math.max(maxDuration, 0.5);
      particle.life = Math.max(0, 1 - ageRatio);

      // Ground collision kills particle
      if (particle.position[1] <= 0.1 && particle.velocity[1] < 0) {
        particle.life = 0;
      }

      dummy.position.set(...particle.position);
      const scale = particle.size * (0.3 + 0.7 * Math.pow(Math.max(particle.life, 0), 0.4));
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      tempColor.set(particle.color);
      // Metal salt cooling color model:
      // Phase 1 (life>0.8): white-hot flash
      // Phase 2 (0.3-0.8): vivid color
      // Phase 3 (<0.3): red shift + dim
      const life = Math.max(particle.life, 0);
      let brightness: number;
      if (life > 0.8) {
        // Flash: extra bright, mix with white
        const flash = (life - 0.8) / 0.2;
        tempColor.lerp(new THREE.Color(1, 1, 1), flash * 0.4);
        brightness = particle.type === 'willow' ? 1.4 : 1.2;
      } else if (life > 0.3) {
        brightness = particle.type === 'comet' ? 0.75 + life * 0.85 : 0.5 + life * 0.7;
      } else {
        // Cooling: shift red, dim
        const cool = 1 - life / 0.3;
        tempColor.lerp(new THREE.Color(0.8, 0.2, 0.05), cool * 0.4);
        brightness = particle.type === 'willow' ? life / 0.3 * 0.55 : life / 0.3 * 0.4;
      }
      const trailFade = Math.pow(life, 1 - (0.3 + particle.trailLength * 0.7));
      meshRef.current!.setColorAt(i, tempColor.multiplyScalar(brightness * trailFade));
    });

    if (pendingExplosions.length > 0) {
      pendingExplosions.forEach((entry) => {
        spawnBurstAt(entry.position, entry.effect, entry.hangTime);
      });
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  // Render physical mortar tubes
  const tubeGeometry = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_RENDER_HEIGHT, 12),
    []
  );
  const tubeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        metalness: 0.4,
        roughness: 0.35,
      }),
    []
  );
  const loadedTubeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: '#F59E0B',
        emissiveIntensity: 0.25,
        metalness: 0.4,
        roughness: 0.32,
      }),
    []
  );
  const firedTubeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6B7280',
        metalness: 0.2,
        roughness: 0.6,
      }),
    []
  );
  const tubeOutlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#1A0A0A',
        side: THREE.BackSide,
      }),
    []
  );

  const tubes = useMemo(() => {
    if (!project) return null;

    return project.positions.map((position) =>
      position.racks.map((rack) =>
        rack.tubes.map((tube) => {
          const transform = getTubeTransform(position, rack, tube);
          const [x, y, z] = transform.position;

          const quaternion = new THREE.Quaternion();
          const up = new THREE.Vector3(0, 1, 0);
          const direction = new THREE.Vector3(...transform.direction);
          quaternion.setFromUnitVectors(up, direction);

          return (
            <group
              key={`${position.id}-${rack.id}-${tube.id}`}
              position={[x, y + TUBE_RENDER_HEIGHT / 2, z]}
              quaternion={quaternion}
              frustumCulled={false}
            >
              <mesh
                geometry={tubeGeometry}
                material={
                  tube.isFired ? firedTubeMaterial : tube.loaded ? loadedTubeMaterial : tubeMaterial
                }
              />
              <mesh
                geometry={tubeGeometry}
                material={tubeOutlineMaterial}
                scale={[TUBE_OUTLINE_SCALE, TUBE_OUTLINE_SCALE, TUBE_OUTLINE_SCALE]}
              />
            </group>
          );
        })
      )
    );
  }, [
    project,
    tubeGeometry,
    tubeMaterial,
    loadedTubeMaterial,
    firedTubeMaterial,
    tubeOutlineMaterial,
  ]);

  const positionMarkers = useMemo(() => {
    return project?.positions.map((position) => (
      <mesh
        key={position.id}
        position={[position.coordinate.x, 0.1, position.coordinate.z]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
        <meshStandardMaterial
          color={position.color ?? '#DC2626'}
          emissive={position.color ?? '#DC2626'}
          emissiveIntensity={selectedPosition?.id === position.id ? 0.7 : 0.3}
        />
      </mesh>
    ));
  }, [project?.positions, selectedPosition]);

  return (
    <>
      <GPUParticleSystem ref={gpuParticlesRef} />
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          map={particleSprite}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {tubes}
      {positionMarkers}
    </>
  );
}
