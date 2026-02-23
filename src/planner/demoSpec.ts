import { normalizeFrontViewSpec } from './normalize';

export const DEMO_FRONT_VIEW_INPUT = {
  camera: {
    position: { x: 0, y: 22, z: 60 },
    lookAt: { x: 0, y: 18, z: 0 },
    fov: 45,
  },
  content: {
    type: 'text',
    text: 'ALEX',
    sampling_density: 'medium',
  },
  style: 'static',
  duration: 3,
  beat_interval: 0.12,
  seed: 2025,
  constraints: {
    height_range: [18, 26],
    flight_time_range: [1.2, 2.2],
    speed_max: 60,
    pitch_range: [20, 80],
    per_launcher: {
      cooldown: 0.22,
    },
    safety_spacing: {
      neighbor_radius: 8,
      max_simultaneous_neighbors: 2,
    },
    jitter_window: 0.08,
  },
  visuals: {
    pattern: 'chrysanthemum',
    color: '#F59E0B',
    intensity: 0.9,
    size: 1,
    hang_time_range: [1.5, 3.0],
  },
  layout: {
    pixel_size: 0.6,
    display: {
      center: { x: 0, y: 0, z: 22 },
    },
    board: {
      center: { x: 0, y: -5, z: 0 },
      pitch_deg: 25,
    },
    burst_time: 3.0,
  },
};

export const DEMO_FRONT_VIEW_SPEC = normalizeFrontViewSpec(DEMO_FRONT_VIEW_INPUT);
