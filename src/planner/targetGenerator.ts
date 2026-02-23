import {
  FrontViewSpec,
  TargetEvent,
  CubeContentSpec,
  TiltBoardLayout,
  TiltBoardPlan,
  Vector3,
} from './types';
import {
  clamp,
  degToRad,
  lerp,
  makeSeededRng,
  normalizeRange,
  pickFromRange,
} from './utils';
import {
  MAX_TARGET_POINTS,
  SampledText,
  mapSampledTextToUv,
  resolveSamplingDensity,
  sampleTextPoints,
} from './patternSampling';
function mapTextPointsToWorld(
  sampled: SampledText,
  spec: FrontViewSpec,
  rng: () => number
): Vector3[] {
  const points = sampled.points;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const heightRange = normalizeRange(spec.constraints.heightRange, [18, 26]);
  const textWidth = clamp(spec.content.type === 'text' ? spec.content.text.length * 12 : 40, 30, 70);
  const thickness = Math.max(0, spec.content.type === 'text' ? spec.content.thickness ?? 1 : 1);

  return points.map((point) => {
    const nx = (point.x - minX) / spanX;
    const ny = 1 - (point.y - minY) / spanY;
    const xWorld = (nx - 0.5) * textWidth;
    const zWorld = lerp(heightRange[0], heightRange[1], ny);
    const yWorld = (rng() - 0.5) * thickness * 0.6;
    return {
      x: Number(xWorld.toFixed(3)),
      y: Number(yWorld.toFixed(3)),
      z: Number(zWorld.toFixed(3)),
    };
  });
}

const UP_HINT_FALLBACK: Vector3 = { x: 0, y: 0, z: 1 };

function addVector(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function subtractVector(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar,
  };
}

function normalizeVector(vector: Vector3): Vector3 {
  const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  if (length === 0) return { ...UP_HINT_FALLBACK };
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function dotProduct(a: Vector3, b: Vector3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function makePlaneBasis(normal: Vector3, upHint?: Vector3) {
  const norm = normalizeVector(normal);
  let up = upHint ? normalizeVector(upHint) : UP_HINT_FALLBACK;
  if (Math.abs(dotProduct(norm, up)) > 0.95) {
    up = { x: 0, y: 1, z: 0 };
  }
  const right = crossProduct(up, norm);
  const rightNorm = normalizeVector(right);
  const upDir = normalizeVector(crossProduct(norm, rightNorm));
  return {
    ex: rightNorm,
    ey: upDir,
    normal: norm,
  };
}

function buildTiltBoardMapping(
  uvPoints: Array<{ u: number; v: number }>,
  spec: FrontViewSpec,
  layout: TiltBoardLayout
): { points: Vector3[]; plan: TiltBoardPlan } {
  const sizeScale = Math.max(0.1, spec.visuals.size ?? 1);
  const scaledUv = uvPoints.map((entry) => ({
    u: entry.u * sizeScale,
    v: entry.v * sizeScale,
  }));

  const heightRange = normalizeRange(spec.constraints.heightRange, [18, 26]);
  const heightSpan = Math.max(0.1, heightRange[1] - heightRange[0]);
  const heightCenter = (heightRange[0] + heightRange[1]) / 2;

  const vValues = scaledUv.map((entry) => entry.v);
  const minV = Math.min(...vValues);
  const maxV = Math.max(...vValues);
  const vSpan = Math.max(0.1, maxV - minV);
  const vCenter = (minV + maxV) / 2;
  const verticalScale = heightSpan / vSpan;

  const displayFallback = spec.camera.lookAt;
  const displayCenter = {
    x: layout.display?.center?.x ?? displayFallback.x,
    y: layout.display?.center?.y ?? displayFallback.y,
    z: layout.display?.center?.z ?? heightCenter,
  };
  const displayNormal =
    layout.display?.normal ??
    normalizeVector({
      x: displayCenter.x - spec.camera.position.x,
      y: displayCenter.y - spec.camera.position.y,
      z: displayCenter.z - spec.camera.position.z,
    });
  const displayBasis = makePlaneBasis(displayNormal, layout.display?.upHint);

  const defaultBoardCenter = { x: 0, y: -5, z: 0 };
  const boardCenter = layout.board?.center ?? defaultBoardCenter;
  const pitchDeg = layout.board?.pitchDeg ?? 25;
  const boardNormal =
    layout.board?.normal ??
    normalizeVector({
      x: 0,
      y: Math.cos(degToRad(pitchDeg)),
      z: Math.sin(degToRad(pitchDeg)),
    });
  const boardBasis = makePlaneBasis(boardNormal, layout.board?.upHint);

  const burstTime = layout.burstTime ?? spec.duration ?? 3;

  const tubes = scaledUv.map((entry, index) => {
    const verticalOffset = (entry.v - vCenter) * verticalScale;
    const targetPoint = addVector(
      displayCenter,
      addVector(
        scaleVector(displayBasis.ex, entry.u),
        scaleVector(displayBasis.ey, verticalOffset)
      )
    );
    const boardPoint = addVector(
      boardCenter,
      addVector(
        scaleVector(boardBasis.ex, entry.u),
        scaleVector(boardBasis.ey, verticalOffset)
      )
    );
    const aimDir = normalizeVector(subtractVector(targetPoint, boardPoint));
    return {
      id: `tube-${index + 1}`,
      boardPos: boardPoint,
      aimDir,
      targetPos: targetPoint,
      u: Number(entry.u.toFixed(3)),
      v: Number(verticalOffset.toFixed(3)),
      burstTime,
    };
  });

  const plan: TiltBoardPlan = {
    count: tubes.length,
    pixelSize: layout.pixelSize,
    camera: spec.camera.position,
    displayCenter,
    displayNormal: displayBasis.normal,
    boardCenter,
    boardNormal: boardBasis.normal,
    boardPitchDeg: pitchDeg,
    burstTime,
    tubes,
  };

  return {
    points: tubes.map((tube) => tube.targetPos),
    plan,
  };
}

function generateCubePoints(
  cubeSpec: CubeContentSpec,
  spec: FrontViewSpec,
  rng: () => number
) {
  const heightRange = normalizeRange(spec.constraints.heightRange, [18, 26]);
  const heightCenter = (heightRange[0] + heightRange[1]) / 2;
  const span = Math.max(0.1, heightRange[1] - heightRange[0]);

  const density = resolveSamplingDensity('medium');
  const step = Math.max(1, Math.round(density));
  const maxHeight = cubeSpec.size.h;
  const scale = maxHeight > span ? span / maxHeight : 1;

  const w = cubeSpec.size.w * scale;
  const h = cubeSpec.size.h * scale;
  const d = cubeSpec.size.d * scale;

  const points: Vector3[] = [];
  const stepsX = Math.max(2, Math.floor(w / step));
  const stepsZ = Math.max(2, Math.floor(h / step));

  const addPoint = (x: number, y: number, z: number) => {
    points.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
    });
  };

  if (cubeSpec.mode === 'true3d') {
    const stepsY = Math.max(2, Math.floor(d / step));
    const halfW = w / 2;
    const halfH = h / 2;
    const halfD = d / 2;

    for (let ix = 0; ix <= stepsX; ix += 1) {
      for (let iz = 0; iz <= stepsZ; iz += 1) {
        const x = lerp(-halfW, halfW, ix / stepsX);
        const z = heightCenter + lerp(-halfH, halfH, iz / stepsZ);
        addPoint(x, -halfD, z);
        addPoint(x, halfD, z);
      }
    }

    for (let iy = 0; iy <= stepsY; iy += 1) {
      for (let iz = 0; iz <= stepsZ; iz += 1) {
        const y = lerp(-halfD, halfD, iy / stepsY);
        const z = heightCenter + lerp(-halfH, halfH, iz / stepsZ);
        addPoint(-halfW, y, z);
        addPoint(halfW, y, z);
      }
    }

    for (let ix = 0; ix <= stepsX; ix += 1) {
      for (let iy = 0; iy <= stepsY; iy += 1) {
        const x = lerp(-halfW, halfW, ix / stepsX);
        const y = lerp(-halfD, halfD, iy / stepsY);
        addPoint(x, y, heightCenter - halfH);
        addPoint(x, y, heightCenter + halfH);
      }
    }
  } else {
    const halfW = w / 2;
    const halfH = h / 2;

    for (let ix = 0; ix <= stepsX; ix += 1) {
      for (let iz = 0; iz <= stepsZ; iz += 1) {
        const x = lerp(-halfW, halfW, ix / stepsX);
        const z = heightCenter + lerp(-halfH, halfH, iz / stepsZ);
        const depthBias =
          (ix / stepsX - 0.5) * d * 0.35 +
          (iz / stepsZ - 0.5) * d * 0.2 +
          (rng() - 0.5) * d * 0.08;
        addPoint(x, depthBias, z);
        if (ix % 3 === 0 || iz % 3 === 0) {
          addPoint(x, depthBias + d * 0.4, z);
        }
      }
    }
  }

  if (points.length > MAX_TARGET_POINTS) {
    const stride = Math.ceil(points.length / MAX_TARGET_POINTS);
    return points.filter((_, index) => index % stride === 0);
  }

  return points;
}

function assignTargetTimes(points: Vector3[], spec: FrontViewSpec, rng: () => number) {
  const duration = Math.max(0.5, spec.duration);
  const beat = Math.max(0.04, spec.beatInterval);
  const batches = Math.max(1, Math.floor(duration / beat));
  const batchSize = Math.max(1, Math.ceil(points.length / batches));
  const baseTime = Math.max(0.1, spec.constraints.flightTimeRange[0] + 0.1);

  let ordered = points;
  if (spec.style === 'scan') {
    ordered = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  } else if (spec.style === 'writeOn') {
    ordered = [...points].sort((a, b) => a.x - b.x || b.z - a.z);
  }

  return ordered.map((point, index) => {
    const batchIndex = Math.floor(index / batchSize);
    const jitter = (rng() - 0.5) * beat * 0.35;
    const time = clamp(baseTime + batchIndex * beat + jitter, 0, duration);
    return { point, targetTime: Number(time.toFixed(3)) };
  });
}

export function generateTargets(spec: FrontViewSpec) {
  const warnings: string[] = [];
  const rng = makeSeededRng(spec.seed);
  let points: Vector3[] = [];
  let tiltBoardPlan: TiltBoardPlan | undefined;

  if (spec.content.type === 'text') {
    const sampled = sampleTextPoints(spec.content, rng);
    if (!sampled) {
      warnings.push('文字渲染失败，未生成点云。');
      return { targets: [], warnings };
    }

    if (spec.layout) {
      const uv = mapSampledTextToUv(sampled, spec.layout.pixelSize);
      const mapping = buildTiltBoardMapping(uv, spec, spec.layout);
      points = mapping.points;
      tiltBoardPlan = mapping.plan;
    } else {
      points = mapTextPointsToWorld(sampled, spec, rng);
    }
  } else if (spec.content.type === 'cube') {
    points = generateCubePoints(spec.content, spec, rng);
  } else {
    warnings.push('imageMask 暂未实现，已跳过。');
    return { targets: [], warnings };
  }

  if (points.length === 0) {
    warnings.push('未生成目标点。');
    return { targets: [], warnings };
  }

  const hangRange = normalizeRange(spec.visuals.hangTimeRange, [1.5, 3]);
  const pattern = spec.visuals.pattern ?? 'chrysanthemum';
  const color = spec.visuals.color ?? '#F59E0B';
  const intensity = clamp(spec.visuals.intensity ?? 0.9, 0.1, 1);
  const size = clamp(spec.visuals.size ?? 1, 0.5, 2);

  const timedPoints = assignTargetTimes(points, spec, rng);

  const targets: TargetEvent[] = timedPoints.map((entry, index) => ({
    id: `target-${index + 1}`,
    targetPos: entry.point,
    targetTime: entry.targetTime,
    hangTime: pickFromRange(hangRange, rng()),
    pattern,
    color,
    intensity,
    size,
    groupId: `${spec.content.type}-${Math.floor(index / 12)}`,
  }));

  return { targets, warnings, tiltBoardPlan };
}
