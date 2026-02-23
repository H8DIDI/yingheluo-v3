import { TextContentSpec } from './types';
import { clamp } from './utils';

const TEXT_ALPHA_THRESHOLD = 64;
export const MAX_TARGET_POINTS = 1800;

export type SampledText = {
  points: Array<{ x: number; y: number }>;
  width: number;
  height: number;
};

export function resolveSamplingDensity(value: TextContentSpec['samplingDensity'] | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.round(value), 1, 6);
  }
  switch (value) {
    case 'low':
      return 4;
    case 'high':
      return 1;
    case 'medium':
    default:
      return 2;
  }
}

export function sampleTextPoints(textSpec: TextContentSpec, rng: () => number): SampledText | null {
  if (typeof document === 'undefined') return null;
  const safeText = textSpec.text.trim();
  if (!safeText) return null;

  const fontSize = clamp(54 - safeText.length * 3, 18, 44);
  const padding = 6;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const fontFamily =
    textSpec.font ??
    '"Bebas Neue", "Poppins", "Microsoft YaHei", "SimHei", "Noto Sans CJK SC", sans-serif';
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(safeText);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize * 1.35 + padding * 2);
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(safeText, width / 2, height / 2);

  const data = ctx.getImageData(0, 0, width, height).data;
  const isOn = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const idx = (y * width + x) * 4;
    return data[idx + 3] > TEXT_ALPHA_THRESHOLD;
  };

  const density = resolveSamplingDensity(textSpec.samplingDensity);
  const outlineStep = Math.max(1, Math.round(density * 0.8));
  const fillStep = Math.max(1, Math.round(density * 1.4));
  const points: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isOn(x, y)) continue;
      const isEdge =
        !isOn(x - 1, y) || !isOn(x + 1, y) || !isOn(x, y - 1) || !isOn(x, y + 1);
      if (isEdge && x % outlineStep === 0 && y % outlineStep === 0) {
        points.push({ x, y });
      } else if (!isEdge && x % fillStep === 0 && y % fillStep === 0) {
        const jitter = density * 0.35;
        points.push({
          x: x + (rng() - 0.5) * jitter,
          y: y + (rng() - 0.5) * jitter,
        });
      }
    }
  }

  if (points.length === 0) return null;

  if (points.length > MAX_TARGET_POINTS) {
    const stride = Math.ceil(points.length / MAX_TARGET_POINTS);
    return {
      points: points.filter((_, index) => index % stride === 0),
      width,
      height,
    };
  }

  return { points, width, height };
}

export function mapSampledTextToUv(
  sampled: SampledText,
  pixelSize: number
): Array<{ u: number; v: number }> {
  const centerX = (sampled.width - 1) / 2;
  const centerY = (sampled.height - 1) / 2;
  return sampled.points.map(({ x, y }) => ({
    u: (x - centerX) * pixelSize,
    v: (centerY - y) * pixelSize,
  }));
}
