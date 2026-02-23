import type { ChoreographyCue } from '../types/domain';

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type TextContentSpec = {
  type: 'text';
  text: string;
  font?: string;
  thickness?: number;
  samplingDensity?: number | 'low' | 'medium' | 'high';
};

export type CubeContentSpec = {
  type: 'cube';
  size: { w: number; h: number; d: number };
  mode?: 'true3d' | 'cameraTrick';
};

export type ImageMaskSpec = {
  type: 'imageMask';
  maskUrl: string;
  samplingDensity?: number | 'low' | 'medium' | 'high';
};

export type FrontViewContentSpec = TextContentSpec | CubeContentSpec | ImageMaskSpec;

export type FrontViewCameraSpec = {
  position: Vector3;
  lookAt: Vector3;
  fov: number;
};

export type FrontViewStyle = 'static' | 'writeOn' | 'scan';

export type VisualParams = {
  pattern?: string;
  color?: string;
  intensity?: number;
  size?: number;
  hangTimeRange?: [number, number];
};

export type TiltBoardPlaneSpec = {
  center?: Vector3;
  normal?: Vector3;
  upHint?: Vector3;
};

export type TiltBoardBoardSpec = TiltBoardPlaneSpec & {
  pitchDeg?: number;
};

export type TiltBoardLayout = {
  pixelSize: number;
  burstTime: number;
  display?: TiltBoardPlaneSpec;
  board?: TiltBoardBoardSpec;
};

export type PlannerConstraints = {
  heightRange: [number, number];
  flightTimeRange: [number, number];
  speedMax: number;
  pitchRange: [number, number];
  perLauncher?: {
    cooldown?: number;
    capacityPerWindow?: number;
  };
  safetySpacing?: {
    neighborRadius?: number;
    maxSimultaneousNeighbors?: number;
  };
  jitterWindow?: number;
};

export type FrontViewSpec = {
  camera: FrontViewCameraSpec;
  content: FrontViewContentSpec;
  style: FrontViewStyle;
  duration: number;
  beatInterval: number;
  seed: number;
  constraints: PlannerConstraints;
  visuals: VisualParams;
  layout?: TiltBoardLayout;
};

export type Launcher = {
  id: string;
  position: Vector3;
  cooldown: number;
};

export type LaunchFieldConfig = {
  launchers: Launcher[];
  neighborRadius: number;
  maxSimultaneousNeighbors: number;
};

export type TargetEvent = {
  id: string;
  targetPos: Vector3;
  targetTime: number;
  hangTime: number;
  pattern: string;
  color: string;
  intensity: number;
  size: number;
  groupId?: string;
};

export type TiltBoardTube = {
  id: string;
  boardPos: Vector3;
  aimDir: Vector3;
  targetPos: Vector3;
  u: number;
  v: number;
  burstTime: number;
};

export type TiltBoardPlan = {
  count: number;
  pixelSize: number;
  camera: Vector3;
  displayCenter: Vector3;
  displayNormal: Vector3;
  boardCenter: Vector3;
  boardNormal: Vector3;
  boardPitchDeg: number;
  burstTime: number;
  tubes: TiltBoardTube[];
};

export type BallisticSolution = {
  flightTime: number;
  velocity: Vector3;
  speed: number;
  pitch: number;
  yaw: number;
  constraintFlags: string[];
};

export type AssignmentResult = {
  target: TargetEvent;
  launcher: Launcher;
  launchTime: number;
  solution: BallisticSolution;
  cost: number;
  constraintFlags: string[];
};

export type PlannerResult = {
  cues: ChoreographyCue[];
  warnings: string[];
  stats: {
    targets: number;
    assigned: number;
    failures: number;
  };
  tiltBoardPlan?: TiltBoardPlan;
};
