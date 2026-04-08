export type QuickLaunchSource = 'stage-tap' | 'quick-button';

export type QuickLaunchPreset = 'peony' | 'willow' | 'comet';

export type QuickLaunchRequest = {
  id: string;
  world: [number, number, number];
  source: QuickLaunchSource;
  preset: QuickLaunchPreset;
};

export type QuickLaunchEffect = {
  id: string;
  name: string;
  type: 'peony' | 'willow' | 'comet';
  color: string;
  height: number;
  duration: number;
  intensity: number;
  particleCount: number;
  spread: number;
  trailLength: number;
};

const QUICK_LAUNCH_PRESET_COLORS: Record<QuickLaunchPreset, string[]> = {
  peony: ['#F59E0B', '#EF4444', '#FDE047'],
  willow: ['#FDE68A', '#FBBF24', '#F59E0B'],
  comet: ['#60A5FA', '#C084FC', '#F472B6'],
};

function createOffsetWorld(
  center: [number, number, number],
  offsetX: number,
  offsetZ: number
): [number, number, number] {
  return [center[0] + offsetX, 0, center[2] + offsetZ];
}

export function getQuickLaunchWorldPoint(point: [number, number, number]): [number, number, number] {
  return [point[0], 0, point[2]];
}

export function getQuickLaunchLaunchPoint(point: [number, number, number]): [number, number, number] {
  return [point[0], 0, point[2] - 30];
}

export function createQuickLaunchRequest(
  world: [number, number, number],
  source: QuickLaunchSource,
  preset: QuickLaunchPreset = 'peony'
): QuickLaunchRequest {
  return {
    id: `quick-launch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    world,
    source,
    preset,
  };
}

export function buildQuickLaunchEffect(
  preset: QuickLaunchPreset,
  id: string
): QuickLaunchEffect {
  const colors = QUICK_LAUNCH_PRESET_COLORS[preset];
  const color = colors[Math.floor(Math.random() * colors.length)];

  if (preset === 'willow') {
    return {
      id,
      name: 'Quick Willow',
      type: 'willow',
      color,
      height: 110,
      duration: 2.6,
      intensity: 1,
      particleCount: 240,
      spread: 360,
      trailLength: 0.9,
    };
  }

  if (preset === 'comet') {
    return {
      id,
      name: 'Quick Comet',
      type: 'comet',
      color,
      height: 95,
      duration: 1.5,
      intensity: 0.95,
      particleCount: 120,
      spread: 120,
      trailLength: 0.75,
    };
  }

  return {
    id,
    name: 'Quick Peony',
    type: 'peony',
    color,
    height: 90,
    duration: 1.8,
    intensity: 1,
    particleCount: 180,
    spread: 360,
    trailLength: 0.5,
  };
}

export function createQuickLaunchSalvoRequests(
  center: [number, number, number],
  preset: QuickLaunchPreset
) {
  const offsets: Array<[number, number]> = [
    [-16, -6],
    [-8, -2],
    [0, 0],
    [8, -2],
    [16, -6],
  ];

  return offsets.map(([offsetX, offsetZ]) =>
    createQuickLaunchRequest(createOffsetWorld(center, offsetX, offsetZ), 'quick-button', preset)
  );
}

export function createQuickLaunchRandomShowRequests(preset: QuickLaunchPreset) {
  return Array.from({ length: 8 }, (_, index) => {
    const x = -60 + ((index * 17) % 120);
    const z = -60 + ((index * 11) % 80);
    return createQuickLaunchRequest([x, 0, z], 'quick-button', preset);
  });
}
