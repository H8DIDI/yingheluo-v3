// Professional Pyrotechnics Domain Model
// Based on Finale 3D architecture: Position -> Rack -> Tube

/** 3D Coordinate in meters */
export interface Coordinate {
  x: number;
  y: number;
  z: number;
}

/** Firework effect types */
export type FireworkType =
  | 'peony'
  | 'chrysanthemum'
  | 'willow'
  | 'crossette'
  | 'burst'
  | 'fountain'
  | 'rocket'
  | 'sparkler'
  | 'comet'
  | 'mine';

/** Physical firework effect properties */
export interface FireworkEffect {
  id: string;
  name: string;
  type: FireworkType;
  color: string;
  height: number; // meters
  duration: number; // seconds
  intensity: number; // 0-1
  particleCount: number;
  spread: number; // degrees
  trailLength: number; // 0-1
  splitDelay?: number; // for crossette type
  soundFrequency?: number; // Hz for audio sync
}

/** Music asset metadata */
export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  duration?: number; // seconds
  url?: string;
  offset?: number; // seconds
  tags?: string[];
  notes?: string;
}

/** Firework type profile defaults */
export interface FireworkTypeProfile {
  id: string;
  name: string;
  type: FireworkType;
  description?: string;
  defaultHeight?: number;
  defaultDuration?: number;
  defaultIntensity?: number;
  defaultSpread?: number;
  defaultTrailLength?: number;
}

/** Rack template for hardware planning */
export interface RackTemplate {
  id: string;
  name: string;
  type: RackType;
  tubeCount: number;
  rotation: number;
  config: RackConfig;
  description?: string;
}

/** Global show control parameters */
export interface ShowControlSettings {
  gravity: number;
  airResistance: number;
  dragVariation: number;
  velocityScale: number;
  burstHeightScale: number;
  airBurstMin: number;
  airBurstMax: number;
  groundBurstMin: number;
  groundBurstMax: number;
  shellDrag: number;
  shellSize: number;
  shellTrail: number;
  shellMinFlightTime: number;
  shellFallDistance: number;
  shellFallTime: number;
  burstFallFadeTime: number;
}

/** Rack configuration types */
export type RackType =
  | 'fan'      // Tubes spread in a fan pattern (e.g., -30° to +30°)
  | 'straight' // All tubes parallel, vertical
  | 'matrix';  // Grid layout for pixel effects (e.g., 10x10)

/** Single mortar tube in a rack */
export interface Tube {
  id: string;
  index: number; // Position in rack (0-based)

  // Physical orientation
  angle: number; // Horizontal angle in degrees (0 = forward, relative to rack)
  tilt: number;  // Vertical tilt in degrees (90 = straight up)

  // Load status
  loaded: boolean;
  effect: FireworkEffect | null; // What's loaded in this tube
  isFired: boolean; // One-shot constraint
}

/** Physical rack holding multiple tubes */
export interface Rack {
  id: string;
  name: string;
  type: RackType;

  // Physical properties
  tubeCount: number;
  tubes: Tube[];

  // Orientation (for the entire rack)
  rotation: number; // Degrees, 0 = facing +Z

  // Type-specific configuration
  config: RackConfig;
}

/** Configuration specific to rack type */
export type RackConfig =
  | FanRackConfig
  | StraightRackConfig
  | MatrixRackConfig;

export interface FanRackConfig {
  type: 'fan';
  startAngle: number; // e.g., -30°
  endAngle: number;   // e.g., +30°
  tilt: number;       // Base tilt for all tubes
}

export interface StraightRackConfig {
  type: 'straight';
  tilt: number; // All tubes same tilt (usually 90°)
}

export interface MatrixRackConfig {
  type: 'matrix';
  rows: number;    // e.g., 10
  columns: number; // e.g., 10
  spacing: number; // meters between tubes
  tilt: number;    // Usually 90° for matrices
}

/** Launch Position (点位) - A physical location on the map */
export interface Position {
  id: string;
  name: string; // e.g., "Front Center", "Left Wing"

  // Physical location
  coordinate: Coordinate;

  // Hardware at this position
  racks: Rack[];

  // Visual properties
  color?: string; // For map display
  icon?: string;  // Icon type for map
}

/** Firing pattern for a sequence */
export type FiringPattern =
  | 'all'        // Fire all tubes simultaneously
  | 'sequential' // Fire left-to-right (or top-to-bottom for matrix)
  | 'reverse'    // Fire right-to-left
  | 'random'     // Random order
  | 'wave'       // Wave pattern (for matrix)
  | 'spiral';    // Spiral pattern (for matrix)

/** Show Event - A command to fire specific tubes at a specific time */
export interface ShowEvent {
  id: string;
  name: string;

  // Timing
  startTime: number; // seconds

  // Target
  positionId: string;
  rackId: string;
  tubeIndices: number[]; // Which tubes to fire (empty = all)

  // Firing behavior
  pattern: FiringPattern;
  interval?: number; // Delay between tubes in ms (for sequential patterns)

  // Effect hints (for AI/auto-generated shows)
  effectName?: string;
  effectColor?: string;
  effectHeight?: number;

  // Timeline display
  track: string; // Track identifier for timeline
}

/** Legacy Cue interface for backward compatibility */
export interface Cue {
  id: string;
  name: string;
  position: Coordinate;
  effect: FireworkEffect;
  startTime: number;
  track: string;
}

/** Choreography cue for front-view planner (z is height in cue space). */
export interface ChoreographyCue {
  id: string;
  launchTime: number;
  launcherId: string;
  launcherPos: Coordinate;
  burstTime: number;
  initVelocity: Coordinate;
  hangTime: number;
  pattern: string;
  color: string;
  intensity: number;
  size: number;
  debug?: {
    targetPoint?: Coordinate;
    cost?: number;
    constraintFlags?: string[];
  };
}

/** Complete fireworks show project */
export interface Project {
  id: string;
  name: string;

  // Activity metadata
  activityName?: string;
  activityDetail?: string;

  // Scene
  positions: Position[];
  events: ShowEvent[];

  // Metadata
  duration: number; // Total project duration in seconds
  createdAt: Date;
  updatedAt: Date;
  groundHeight?: number; // meters above sea level

  // Display settings
  mapBounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };

  // Legacy compatibility - computed from events
  cues?: Cue[];
  // Choreography cue list for ballistic playback
  cueList?: ChoreographyCue[];
}

/** Particle for 3D rendering */
export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  life: number; // 0-1
  size: number;
}
