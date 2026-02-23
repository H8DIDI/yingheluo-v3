import {
  AssignmentResult,
  Launcher,
  PlannerConstraints,
  TargetEvent,
  Vector3,
} from './types';
import { clamp, length2d } from './utils';
import { solveBallistics } from './ballistics';

type AssignmentSummary = {
  assignments: AssignmentResult[];
  warnings: string[];
};

function computeCost(launcher: Launcher, target: TargetEvent, speed: number) {
  const dx = target.targetPos.x - launcher.position.x;
  const dy = target.targetPos.y - launcher.position.y;
  const distance = length2d(dx, dy);
  return distance * 0.6 + speed * 0.4;
}

function buildLauncherState(launchers: Launcher[]) {
  const lastLaunchTimes = new Map<string, number>();
  launchers.forEach((launcher) => lastLaunchTimes.set(launcher.id, -Infinity));
  return lastLaunchTimes;
}

export function assignLaunchers(
  targets: TargetEvent[],
  launchers: Launcher[],
  constraints: PlannerConstraints
): AssignmentSummary {
  const warnings: string[] = [];
  const assignments: AssignmentResult[] = [];
  const lastLaunchTimes = buildLauncherState(launchers);
  const cooldown = Math.max(0, constraints.perLauncher?.cooldown ?? 0.2);

  const orderedTargets = [...targets].sort((a, b) => a.targetTime - b.targetTime);

  for (const target of orderedTargets) {
    let best: AssignmentResult | null = null;

    for (const launcher of launchers) {
      const { solution, constraintFlags } = solveBallistics(
        launcher.position,
        target.targetPos,
        constraints,
        target.targetTime
      );
      if (!solution) continue;

      const launchTime = target.targetTime - solution.flightTime;
      if (launchTime < 0) continue;

      const lastLaunch = lastLaunchTimes.get(launcher.id) ?? -Infinity;
      if (launchTime - lastLaunch < cooldown) continue;

      const cost = computeCost(launcher, target, solution.speed);
      if (!best || cost < best.cost) {
        best = {
          target,
          launcher,
          launchTime,
          solution,
          cost,
          constraintFlags: [...constraintFlags],
        };
      }
    }

    if (!best) {
      warnings.push(`Target ${target.id} has no feasible launcher.`);
      continue;
    }

    lastLaunchTimes.set(best.launcher.id, best.launchTime);
    assignments.push(best);
  }

  return { assignments, warnings };
}

type ScheduleSummary = {
  scheduled: AssignmentResult[];
  warnings: string[];
};

function buildNeighborMap(launchers: Launcher[], radius: number) {
  const neighbors = new Map<string, string[]>();
  launchers.forEach((launcher) => neighbors.set(launcher.id, []));
  launchers.forEach((launcher, index) => {
    for (let i = index + 1; i < launchers.length; i += 1) {
      const other = launchers[i];
      const dx = launcher.position.x - other.position.x;
      const dy = launcher.position.y - other.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        neighbors.get(launcher.id)!.push(other.id);
        neighbors.get(other.id)!.push(launcher.id);
      }
    }
  });
  return neighbors;
}

function canSchedule(
  candidateTime: number,
  launcherId: string,
  scheduled: AssignmentResult[],
  neighbors: Map<string, string[]>,
  cooldown: number,
  maxNeighbors: number,
  capacityPerWindow: number,
  windowSize: number
) {
  let sameLauncherCount = 0;
  let neighborCount = 0;
  const neighborIds = neighbors.get(launcherId) ?? [];

  for (const entry of scheduled) {
    if (Math.abs(entry.launchTime - candidateTime) > windowSize) continue;
    if (entry.launcher.id === launcherId) {
      sameLauncherCount += 1;
      if (Math.abs(entry.launchTime - candidateTime) < cooldown) return false;
    }
    if (neighborIds.includes(entry.launcher.id)) {
      neighborCount += 1;
    }
  }

  if (maxNeighbors > 0 && neighborCount >= maxNeighbors) return false;
  if (capacityPerWindow > 0 && sameLauncherCount >= capacityPerWindow) return false;
  return true;
}

export function scheduleAndResolveConflicts(
  assignments: AssignmentResult[],
  launchers: Launcher[],
  constraints: PlannerConstraints
): ScheduleSummary {
  const warnings: string[] = [];
  const scheduled: AssignmentResult[] = [];

  const neighborRadius = Math.max(0, constraints.safetySpacing?.neighborRadius ?? 0);
  const maxNeighbors = Math.max(
    0,
    constraints.safetySpacing?.maxSimultaneousNeighbors ?? 0
  );
  const cooldown = Math.max(0, constraints.perLauncher?.cooldown ?? 0.2);
  const capacityPerWindow = Math.max(0, constraints.perLauncher?.capacityPerWindow ?? 0);
  const windowSize = Math.max(0.04, constraints.jitterWindow ?? 0.08);
  const neighbors = buildNeighborMap(launchers, neighborRadius);

  const ordered = [...assignments].sort((a, b) => a.launchTime - b.launchTime);
  const step = Math.max(0.02, windowSize / 4);
  const offsets: number[] = [0];
  for (let i = 1; i <= Math.floor(windowSize / step); i += 1) {
    offsets.push(i * step, -i * step);
  }

  for (const entry of ordered) {
    let scheduledEntry: AssignmentResult | null = null;

    for (const offset of offsets) {
      const candidate = clamp(entry.launchTime + offset, 0, Number.POSITIVE_INFINITY);
      if (
        canSchedule(
          candidate,
          entry.launcher.id,
          scheduled,
          neighbors,
          cooldown,
          maxNeighbors,
          capacityPerWindow,
          windowSize
        )
      ) {
        scheduledEntry = {
          ...entry,
          launchTime: Number(candidate.toFixed(3)),
          constraintFlags:
            offset === 0 ? entry.constraintFlags : [...entry.constraintFlags, 'jittered'],
        };
        break;
      }
    }

    if (!scheduledEntry) {
      warnings.push(
        `Launcher ${entry.launcher.id} conflict at ${entry.launchTime.toFixed(2)}s.`
      );
      scheduledEntry = {
        ...entry,
        constraintFlags: [...entry.constraintFlags, 'conflict-unresolved'],
      };
    }

    scheduled.push(scheduledEntry);
  }

  return { scheduled, warnings };
}

export function buildLaunchersFromPositions(
  positions: Array<{ id: string; coordinate: Vector3 }>,
  cooldown?: number
) {
  const safeCooldown = Math.max(0, cooldown ?? 0.2);
  return positions.map((pos) => ({
    id: pos.id,
    position: {
      x: pos.coordinate.x,
      y: pos.coordinate.z,
      z: 0,
    },
    cooldown: safeCooldown,
  }));
}

