// Choreography planner for virtual fireworks (simulation only).
import { assignLaunchers, buildLaunchersFromPositions, scheduleAndResolveConflicts } from './assignment';
import { buildCueList } from './cueBuilder';
import { normalizeFrontViewSpec } from './normalize';
import { generateTargets } from './targetGenerator';
import { FrontViewSpec, PlannerResult, Vector3 } from './types';

export { buildCueExport, parseCueExport } from './cueBuilder';
export { normalizeFrontViewSpec } from './normalize';
export type { FrontViewSpec, PlannerResult, TiltBoardPlan } from './types';
export { generateTargets } from './targetGenerator';
export { DEMO_FRONT_VIEW_INPUT } from './demoSpec';

type PositionLike = { id: string; coordinate: Vector3 };

export function planChoreography(
  input: FrontViewSpec | unknown,
  positions: PositionLike[]
): PlannerResult {
  const spec = normalizeFrontViewSpec(input);
  const warnings: string[] = [];

  const { targets, warnings: targetWarnings, tiltBoardPlan } = generateTargets(spec);
  warnings.push(...targetWarnings);

  const launchers = buildLaunchersFromPositions(
    positions,
    spec.constraints.perLauncher?.cooldown
  );

  if (launchers.length === 0) {
    return {
      cues: [],
      warnings: [...warnings, '发射阵地为空，无法编排。'],
      stats: { targets: targets.length, assigned: 0, failures: targets.length },
    };
  }

  const { assignments, warnings: assignWarnings } = assignLaunchers(
    targets,
    launchers,
    spec.constraints
  );
  warnings.push(...assignWarnings);

  const { scheduled, warnings: scheduleWarnings } = scheduleAndResolveConflicts(
    assignments,
    launchers,
    spec.constraints
  );
  warnings.push(...scheduleWarnings);

  const cues = buildCueList(scheduled);
  const failures = targets.length - cues.length;

  return {
    cues,
    warnings,
    stats: {
      targets: targets.length,
      assigned: cues.length,
      failures: Math.max(0, failures),
    },
    tiltBoardPlan,
  };
}
