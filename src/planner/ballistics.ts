import { BallisticSolution, PlannerConstraints, Vector3 } from './types';
import { clamp, GRAVITY, length2d, length3d, normalizeRange, radToDeg } from './utils';

type SolveResult = {
  solution: BallisticSolution | null;
  constraintFlags: string[];
};

export function solveBallistics(
  launcherPos: Vector3,
  targetPos: Vector3,
  constraints: PlannerConstraints,
  maxFlightTime?: number
): SolveResult {
  const constraintFlags: string[] = [];
  const flightRange = normalizeRange(constraints.flightTimeRange, [1.2, 2.2]);
  const pitchRange = normalizeRange(constraints.pitchRange, [20, 80]);
  const heightRange = normalizeRange(constraints.heightRange, [18, 26]);

  let targetZ = targetPos.z;
  if (targetZ < heightRange[0] || targetZ > heightRange[1]) {
    constraintFlags.push('height-clamped');
    targetZ = clamp(targetZ, heightRange[0], heightRange[1]);
  }

  const minT = Math.max(0.2, flightRange[0]);
  const maxLimit = typeof maxFlightTime === 'number' ? maxFlightTime : flightRange[1];
  const maxT = Math.max(minT + 0.05, Math.min(flightRange[1], maxLimit));
  const samples = 12;
  const candidateTimes = Array.from({ length: samples }, (_, i) =>
    minT + (i / (samples - 1)) * (maxT - minT)
  );

  let best: BallisticSolution | null = null;

  for (const time of candidateTimes) {
    const dx = targetPos.x - launcherPos.x;
    const dy = targetPos.y - launcherPos.y;
    const dz = targetZ - launcherPos.z;

    const vx = dx / time;
    const vy = dy / time;
    const vz = (dz + 0.5 * GRAVITY * time * time) / time;

    const speed = length3d(vx, vy, vz);
    const pitch = radToDeg(Math.atan2(vz, length2d(vx, vy)));
    const yaw = radToDeg(Math.atan2(vx, vy));

    if (speed > constraints.speedMax) continue;
    if (pitch < pitchRange[0] || pitch > pitchRange[1]) continue;

    if (!best || speed < best.speed) {
      best = {
        flightTime: time,
        velocity: { x: vx, y: vy, z: vz },
        speed,
        pitch,
        yaw,
        constraintFlags: [],
      };
    }
  }

  if (!best) {
    return { solution: null, constraintFlags: [...constraintFlags, 'no-solution'] };
  }

  const resolvedBest: BallisticSolution = { ...best, constraintFlags };
  return { solution: resolvedBest, constraintFlags };
}
