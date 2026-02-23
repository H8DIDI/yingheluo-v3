export const GRAVITY = 9.8;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

export function radToDeg(value: number) {
  return (value * 180) / Math.PI;
}

export function length2d(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

export function length3d(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

export function makeSeededRng(seed: number) {
  let state = seed >>> 0;
  if (!state) state = 0x12345678;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function normalizeRange(
  value: [number, number] | undefined,
  fallback: [number, number]
): [number, number] {
  if (!value || value.length !== 2) return fallback;
  const min = Number(value[0]);
  const max = Number(value[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  return min <= max ? [min, max] : [max, min];
}

export function pickFromRange(range: [number, number], t: number) {
  return lerp(range[0], range[1], clamp(t, 0, 1));
}
