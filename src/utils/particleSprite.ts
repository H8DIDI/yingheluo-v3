import * as THREE from 'three';

type GradientStop = {
  offset: number;
  color: string;
};

type CircularSpriteConfig = {
  size: number;
  coreStops: GradientStop[];
};

type TrailSpriteConfig = {
  width: number;
  height: number;
  stops: GradientStop[];
};

export function getParticleSpriteConfig(): CircularSpriteConfig {
  return {
    size: 128,
    coreStops: [
      { offset: 0, color: 'rgba(255,255,255,1)' },
      { offset: 0.08, color: 'rgba(255,255,255,0.95)' },
      { offset: 0.15, color: 'rgba(255,240,220,0.8)' },
      { offset: 0.3, color: 'rgba(255,200,150,0.45)' },
      { offset: 0.5, color: 'rgba(255,150,80,0.15)' },
      { offset: 0.7, color: 'rgba(255,100,40,0.04)' },
      { offset: 1, color: 'rgba(0,0,0,0)' },
    ],
  };
}

export function getTrailSpriteConfig(): TrailSpriteConfig {
  return {
    width: 32,
    height: 128,
    stops: [
      { offset: 0, color: 'rgba(255,255,255,0)' },
      { offset: 0.2, color: 'rgba(255,190,120,0.12)' },
      { offset: 0.35, color: 'rgba(255,220,160,0.55)' },
      { offset: 0.55, color: 'rgba(255,255,255,1)' },
      { offset: 0.78, color: 'rgba(255,220,160,0.45)' },
      { offset: 1, color: 'rgba(255,255,255,0)' },
    ],
  };
}

export function getFlashSpriteConfig(): CircularSpriteConfig {
  return {
    size: 288,
    coreStops: [
      { offset: 0, color: 'rgba(255,255,255,1)' },
      { offset: 0.015, color: 'rgba(255,255,250,1)' },
      { offset: 0.03, color: 'rgba(255,255,245,0.98)' },
      { offset: 0.08, color: 'rgba(255,245,220,0.9)' },
      { offset: 0.18, color: 'rgba(255,220,150,0.45)' },
      { offset: 0.35, color: 'rgba(255,170,80,0.12)' },
      { offset: 0.6, color: 'rgba(255,120,30,0.02)' },
      { offset: 1, color: 'rgba(0,0,0,0)' },
    ],
  };
}

function fillCircularGradient(
  ctx: CanvasRenderingContext2D,
  size: number,
  stops: GradientStop[]
) {
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

/**
 * High-quality radial gradient particle sprite (128x128)
 * Bright core + soft glow halo for realistic firework sparks
 */
export function createParticleSprite(): THREE.CanvasTexture {
  const config = getParticleSpriteConfig();
  const size = config.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  fillCircularGradient(ctx, size, config.coreStops);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Elliptical trail sprite for rising shell tails and spark trails
 */
export function createTrailSprite(): THREE.CanvasTexture {
  const config = getTrailSpriteConfig();
  const w = config.width;
  const h = config.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  config.stops.forEach((stop) => grad.addColorStop(stop.offset, stop.color));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bright flash sprite for explosion moment — intense center, rapid falloff
 */
export function createFlashSprite(): THREE.CanvasTexture {
  const config = getFlashSpriteConfig();
  const size = config.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  fillCircularGradient(ctx, size, config.coreStops);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
