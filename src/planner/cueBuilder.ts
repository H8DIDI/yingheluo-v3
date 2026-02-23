import { AssignmentResult } from './types';
import type { ChoreographyCue } from '../types/domain';

export type CueExportRow = {
  id: string;
  launch_time: number;
  launcher_id: string;
  launcher_pos: { x: number; y: number; z: number };
  burst_time: number;
  init_velocity: { x: number; y: number; z: number };
  hang_time: number;
  pattern: string;
  color: string;
  intensity: number;
  size: number;
  debug?: {
    target_point?: { x: number; y: number; z: number };
    cost?: number;
    constraint_flags?: string[];
  };
};

export function buildCueList(assignments: AssignmentResult[]): ChoreographyCue[] {
  return assignments.map((entry, index) => ({
    id: `${entry.target.id}-${index + 1}`,
    launchTime: entry.launchTime,
    launcherId: entry.launcher.id,
    launcherPos: entry.launcher.position,
    burstTime: entry.solution.flightTime,
    initVelocity: entry.solution.velocity,
    hangTime: entry.target.hangTime,
    pattern: entry.target.pattern,
    color: entry.target.color,
    intensity: entry.target.intensity,
    size: entry.target.size,
    debug: {
      targetPoint: entry.target.targetPos,
      cost: Number(entry.cost.toFixed(3)),
      constraintFlags: [...entry.constraintFlags, ...entry.solution.constraintFlags],
    },
  }));
}

export function buildCueExport(cues: ChoreographyCue[]): CueExportRow[] {
  return cues.map((cue) => ({
    id: cue.id,
    launch_time: Number(cue.launchTime.toFixed(3)),
    launcher_id: cue.launcherId,
    launcher_pos: { ...cue.launcherPos },
    burst_time: Number(cue.burstTime.toFixed(3)),
    init_velocity: { ...cue.initVelocity },
    hang_time: Number(cue.hangTime.toFixed(3)),
    pattern: cue.pattern,
    color: cue.color,
    intensity: Number(cue.intensity.toFixed(3)),
    size: Number(cue.size.toFixed(3)),
    debug: cue.debug?.targetPoint
      ? {
          target_point: { ...cue.debug.targetPoint },
          cost:
            typeof cue.debug.cost === 'number'
              ? Number(cue.debug.cost.toFixed(3))
              : undefined,
          constraint_flags: cue.debug.constraintFlags,
        }
      : undefined,
  }));
}

export function parseCueExport(payload: unknown): ChoreographyCue[] {
  if (!Array.isArray(payload)) return [];
  const result: ChoreographyCue[] = [];
  payload.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const entry = row as CueExportRow & {
      launchTime?: number;
      launcherId?: string;
      launcherPos?: { x: number; y: number; z: number };
      burstTime?: number;
      initVelocity?: { x: number; y: number; z: number };
      hangTime?: number;
      debug?: {
        target_point?: { x: number; y: number; z: number };
        targetPoint?: { x: number; y: number; z: number };
        cost?: number;
        constraint_flags?: string[];
        constraintFlags?: string[];
      };
    };
    const launcherPos = entry.launcher_pos ?? entry.launcherPos ?? { x: 0, y: 0, z: 0 };
    const initVelocity = entry.init_velocity ?? entry.initVelocity ?? { x: 0, y: 0, z: 0 };
    const targetPoint = entry.debug?.target_point ?? entry.debug?.targetPoint;
    const debug = targetPoint
      ? {
          targetPoint,
          cost: entry.debug?.cost,
          constraintFlags: entry.debug?.constraint_flags ?? entry.debug?.constraintFlags,
        }
      : undefined;

    result.push({
      id: entry.id ?? `cue-${index + 1}`,
      launchTime: entry.launch_time ?? entry.launchTime ?? 0,
      launcherId: entry.launcher_id ?? entry.launcherId ?? 'launcher-0',
      launcherPos,
      burstTime: entry.burst_time ?? entry.burstTime ?? 1.2,
      initVelocity,
      hangTime: entry.hang_time ?? entry.hangTime ?? 2,
      pattern: entry.pattern ?? 'burst',
      color: entry.color ?? '#F59E0B',
      intensity: entry.intensity ?? 0.9,
      size: entry.size ?? 1,
      debug,
    });
  });
  return result;
}
