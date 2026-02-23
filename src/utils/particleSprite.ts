import * as THREE from 'three';

/**
 * Generate a radial gradient sprite texture for particles
 * Creates a soft, glowing particle appearance
 */
export function createParticleSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to get 2D context for particle sprite');
  }

  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);

  return new THREE.CanvasTexture(canvas);
}
