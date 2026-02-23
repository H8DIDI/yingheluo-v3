import {
  FrontViewSpec,
  FrontViewContentSpec,
  PlannerConstraints,
  TiltBoardLayout,
  TiltBoardPlaneSpec,
  VisualParams,
  Vector3,
} from './types';
import { clamp, normalizeRange } from './utils';

type RawSpec = Record<string, any>;

function toNumber(value: any, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: any, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function toVector3(value: any, fallback: Vector3): Vector3 {
  if (!value || typeof value !== 'object') return fallback;
  return {
    x: toNumber(value.x, fallback.x),
    y: toNumber(value.y, fallback.y),
    z: toNumber(value.z, fallback.z),
  };
}

function resolveConstraints(raw: RawSpec): PlannerConstraints {
  const heightRange = normalizeRange(
    raw.height_range ?? raw.heightRange,
    [18, 26]
  );
  const flightTimeRange = normalizeRange(
    raw.flight_time_range ?? raw.flightTimeRange,
    [1.2, 2.2]
  );
  const pitchRange = normalizeRange(
    raw.pitch_range ?? raw.pitchRange,
    [20, 80]
  );

  return {
    heightRange,
    flightTimeRange,
    speedMax: toNumber(raw.speed_max ?? raw.speedMax, 60),
    pitchRange,
    perLauncher: {
      cooldown: toNumber(raw?.per_launcher?.cooldown ?? raw?.perLauncher?.cooldown, 0.22),
      capacityPerWindow: toNumber(
        raw?.per_launcher?.capacity_per_window ?? raw?.perLauncher?.capacityPerWindow,
        0
      ),
    },
    safetySpacing: {
      neighborRadius: toNumber(
        raw?.safety_spacing?.neighbor_radius ?? raw?.safetySpacing?.neighborRadius,
        8
      ),
      maxSimultaneousNeighbors: toNumber(
        raw?.safety_spacing?.max_simultaneous_neighbors ??
          raw?.safetySpacing?.maxSimultaneousNeighbors,
        2
      ),
    },
    jitterWindow: toNumber(raw.jitter_window ?? raw.jitterWindow, 0.08),
  };
}

function resolveVisuals(raw: RawSpec): VisualParams {
  return {
    pattern: toString(raw.pattern, 'chrysanthemum'),
    color: toString(raw.color, '#F59E0B'),
    intensity: clamp(toNumber(raw.intensity, 0.9), 0.1, 1),
    size: clamp(toNumber(raw.size, 1), 0.5, 2),
    hangTimeRange: normalizeRange(raw.hang_time_range ?? raw.hangTimeRange, [1.5, 3]),
  };
}

function parseOptionalNumber(value: any): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalVector3(value: any): Vector3 | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const x = toNumber(value.x ?? value[0], NaN);
  const y = toNumber(value.y ?? value[1], NaN);
  const z = toNumber(value.z ?? value[2], NaN);
  if (!Number.isFinite(x) && !Number.isFinite(y) && !Number.isFinite(z)) return undefined;
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0,
  };
}

function buildPlaneSpec(primary?: RawSpec, secondary?: RawSpec): TiltBoardPlaneSpec | undefined {
  const center = parseOptionalVector3(
    primary?.center ?? primary?.position ?? secondary?.center ?? secondary?.position
  );
  const normal = parseOptionalVector3(
    primary?.normal ?? primary?.direction ?? secondary?.normal ?? secondary?.direction
  );
  const upHint = parseOptionalVector3(
    primary?.up_hint ?? primary?.upHint ?? secondary?.up_hint ?? secondary?.upHint
  );
  if (center || normal || upHint) {
    return { center, normal, upHint };
  }
  return undefined;
}

function resolveLayout(raw: RawSpec): TiltBoardLayout | undefined {
  const layoutRaw =
    raw.layout ??
    raw.tilt_layout ??
    raw.tiltLayout ??
    raw.front_view_layout ??
    raw.layoutSpec ??
    raw.geometry;
  if (!layoutRaw || typeof layoutRaw !== 'object') return undefined;

  const pixelSize = clamp(
    toNumber(
      layoutRaw.pixel_size ??
        layoutRaw.pixelSize ??
        layoutRaw.pixel_spacing ??
        layoutRaw.pixelSpacing ??
        0.6,
      0.6
    ),
    0.1,
    2
  );

  const layout: TiltBoardLayout = {
    pixelSize,
    burstTime: toNumber(
      layoutRaw.burst_time ?? layoutRaw.burstTime ?? raw.duration ?? 3,
      raw.duration ?? 3
    ),
  };

  const displaySpec = buildPlaneSpec(
    layoutRaw.display ?? layoutRaw.display_plane ?? layoutRaw.displayPlane,
    {
      center: layoutRaw.display_center ?? layoutRaw.displayCenter,
      normal: layoutRaw.display_normal ?? layoutRaw.displayNormal,
      up_hint: layoutRaw.display_up_hint ?? layoutRaw.displayUpHint,
    }
  );
  if (displaySpec) {
    layout.display = displaySpec;
  }

  const boardSpec = buildPlaneSpec(
    layoutRaw.board ?? layoutRaw.board_plane ?? layoutRaw.boardPlane,
    {
      center: layoutRaw.board_center ?? layoutRaw.boardCenter,
      normal: layoutRaw.board_normal ?? layoutRaw.boardNormal,
      up_hint: layoutRaw.board_up_hint ?? layoutRaw.boardUpHint,
    }
  );
  const pitchDeg =
    parseOptionalNumber(
      layoutRaw.board?.pitch_deg ??
        layoutRaw.board?.pitchDeg ??
        layoutRaw.board_pitch_deg ??
        layoutRaw.boardPitchDeg
    ) ?? parseOptionalNumber(layoutRaw.boardPitch);
  if (boardSpec || pitchDeg !== undefined) {
    layout.board = {
      ...(boardSpec ?? {}),
      pitchDeg,
    };
  }

  return layout;
}

function resolveContent(raw: RawSpec): FrontViewContentSpec {
  const type = toString(raw.type, 'text');
  if (type === 'cube') {
    const cube = raw.cube ?? raw;
    return {
      type: 'cube',
      size: {
        w: toNumber(cube?.size?.w ?? cube?.size?.x ?? cube?.w, 16),
        h: toNumber(cube?.size?.h ?? cube?.size?.y ?? cube?.h, 16),
        d: toNumber(cube?.size?.d ?? cube?.size?.z ?? cube?.d, 10),
      },
      mode: cube?.mode === 'true3d' ? 'true3d' : 'cameraTrick',
    };
  }

  if (type === 'imagemask' || type === 'imageMask') {
    return {
      type: 'imageMask',
      maskUrl: toString(raw.maskUrl ?? raw.mask_url, ''),
      samplingDensity: raw.sampling_density ?? raw.samplingDensity,
    };
  }

  return {
    type: 'text',
    text: toString(raw.text, 'ALEX'),
    font: typeof raw.font === 'string' ? raw.font : undefined,
    thickness: toNumber(raw.thickness, 1),
    samplingDensity: raw.sampling_density ?? raw.samplingDensity ?? 'medium',
  };
}

export function normalizeFrontViewSpec(input: unknown): FrontViewSpec {
  const raw = (input ?? {}) as RawSpec;
  const cameraRaw = raw.camera ?? {};
  const contentRaw = raw.content ?? raw.target ?? raw;
  const constraintsRaw = raw.constraints ?? raw.physics ?? raw;
  const visualsRaw = raw.visuals ?? raw.effect ?? raw;

  return {
    camera: {
      position: toVector3(cameraRaw.position, { x: 0, y: 22, z: 60 }),
      lookAt: toVector3(cameraRaw.lookAt, { x: 0, y: 18, z: 0 }),
      fov: toNumber(cameraRaw.fov, 45),
    },
    content: resolveContent(contentRaw),
    style: raw.style === 'writeOn' || raw.style === 'scan' ? raw.style : 'static',
    duration: toNumber(raw.duration, 3),
    beatInterval: toNumber(raw.beat_interval ?? raw.beatInterval, 0.12),
    seed: toNumber(raw.seed, 2025),
    constraints: resolveConstraints(constraintsRaw),
  visuals: resolveVisuals(visualsRaw),
  layout: resolveLayout(raw),
};
}
