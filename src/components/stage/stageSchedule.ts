import type { ChoreographyCue, FireworkEffect, FireworkType, MatrixRackConfig, Position, Project, Rack } from '../../types/domain';

export type ScheduledFire = {
  key: string;
  time: number;
  positionId: string;
  rackId: string;
  tubeIndex: number;
  tubeId: string;
  effect: FireworkEffect;
};

export type ScheduledCue = {
  key: string;
  time: number;
  launchPos: [number, number, number];
  velocity: [number, number, number];
  effect: FireworkEffect;
  burstDelay: number;
  hangTime: number;
};

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

function specToSceneArray(value: { x: number; y: number; z: number }): [number, number, number] {
  return [value.x, value.z, value.y];
}

function buildEffectFromCue(cue: ChoreographyCue): FireworkEffect {
  const type = mapCuePatternToType(cue.pattern ?? 'burst');
  const intensity = clamp(cue.intensity ?? 0.9, 0.1, 1);
  const size = clamp(cue.size ?? 1, 0.5, 2);
  const particleCount = Math.max(30, Math.round(120 * intensity * size));
  const duration = Math.max(0.6, cue.hangTime ?? 2.2);
  const height = Math.min(cue.debug?.targetPoint?.z ?? 90, 500);
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

export function buildFiringSchedule(project: Project | null): ScheduledFire[] {
  if (!project) return [];

  const schedule: ScheduledFire[] = [];
  const events = project.events ?? [];
  const positions = project.positions ?? [];
  const uniquePositionIds = new Set(events.map((event) => event.positionId));
  const shouldSpreadPositions = positions.length > 1 && uniquePositionIds.size <= 1;
  const orderedPositions = shouldSpreadPositions
    ? [...positions].sort((a, b) => a.coordinate.x - b.coordinate.x || a.coordinate.z - b.coordinate.z)
    : [];

  events.forEach((event) => {
    const basePosition = positions.find((p) => p.id === event.positionId);
    const targetPositions = shouldSpreadPositions ? orderedPositions : basePosition ? [basePosition] : [];
    if (targetPositions.length === 0) return;

    const targets = targetPositions
      .map((position, index) => {
        const rack = position.racks.find((r) => r.id === event.rackId) ?? position.racks[0];
        if (!rack) return null;
        return { position, rack, index };
      })
      .filter((target): target is { position: Position; rack: Rack; index: number } => !!target);

    if (targets.length === 0) return;

    const maxOffset = Math.max(0, (project.duration ?? event.startTime) - event.startTime - 0.1);
    const spreadStep = targets.length > 1 ? Math.min(0.18, maxOffset / (targets.length - 1)) : 0;
    const intervalSec = Math.max(0.05, (event.interval ?? 200) / 1000);
    const rng = makeDeterministicRandom(event.id);

    targets.forEach((target) => {
      const { position, rack, index } = target;
      const positionOffset = index * spreadStep;
      const tubesToFire = event.tubeIndices.length > 0 ? event.tubeIndices : rack.tubes.map((_, idx) => idx);

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

      const sequential = (order: number[]) => order.forEach((tubeIdx, orderIdx) => enqueue(tubeIdx, orderIdx * intervalSec));

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
                const rowOffset = (entry.row / Math.max(1, config.rows - 1)) * intervalSec * 0.4;
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
              .sort((a, b) => (a.radius === b.radius ? a.angle - b.angle : a.radius - b.radius))
              .forEach((entry, orderIdx) => enqueue(entry.idx, orderIdx * intervalSec * 0.6));
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

export function buildCueSchedule(project: Project | null): ScheduledCue[] {
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
