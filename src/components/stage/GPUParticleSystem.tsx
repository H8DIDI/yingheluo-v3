import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createParticleSprite } from '../../utils/particleSprite';
import vertexShader from '../../shaders/particle.vert.glsl?raw';
import fragmentShader from '../../shaders/particle.frag.glsl?raw';
import {
  getParticleCoolingColor,
  getParticleMaterialConfig,
} from './particleMaterialConfig';

const MAX_PARTICLES = 100000;

export interface GPUParticleEmitter {
  emit: (
    origin: THREE.Vector3 | [number, number, number],
    velocities: Array<[number, number, number]>,
    colors: Array<[number, number, number]>,
    lifespans: number[],
    sizes: number[]
  ) => void;
  emitShell: (
    origin: [number, number, number],
    velocity: [number, number, number],
    color: [number, number, number],
    lifespan: number,
    size: number
  ) => number;
  kill: (index: number) => void;
  getTime: () => number;
  setGravity: (g: number) => void;
  setDrag: (d: number) => void;
}

const GPUParticleSystem = forwardRef<GPUParticleEmitter>((_, ref) => {
  const pointsRef = useRef<THREE.Points>(null);
  const nextIndex = useRef(0);
  const timeRef = useRef(0);
  const { size } = useThree();

  const sprite = useMemo(() => createParticleSprite(), []);
  const materialConfig = useMemo(() => getParticleMaterialConfig(), []);
  const coolingColor = useMemo(() => getParticleCoolingColor(), []);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const velocities = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const bornTimes = new Float32Array(MAX_PARTICLES);
    const lifespans = new Float32Array(MAX_PARTICLES);
    const sizes = new Float32Array(MAX_PARTICLES);

    bornTimes.fill(-9999);
    lifespans.fill(0);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aBornTime', new THREE.BufferAttribute(bornTimes, 1));
    geo.setAttribute('aLifespan', new THREE.BufferAttribute(lifespans, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uGravity: { value: -9.8 },
          uDrag: { value: 0.98 },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uSprite: { value: sprite },
          uPointScale: { value: materialConfig.pointScale },
          uCoreBoost: { value: materialConfig.coreBoost },
          uFlashBoost: { value: materialConfig.flashBoost },
          uGlowFalloff: { value: materialConfig.glowFalloff },
          uCoreFalloff: { value: materialConfig.coreFalloff },
          uCoolingColor: { value: new THREE.Vector3(...coolingColor) },
          uCoolingStrength: { value: materialConfig.coolingStrength },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    return { geometry: geo, material: mat };
  }, [size.width, size.height, sprite, materialConfig, coolingColor]);

  useImperativeHandle(ref, () => ({
    emit(origin, velocities, colors, lifespans, sizes) {
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const velAttr = geometry.getAttribute('aVelocity') as THREE.BufferAttribute;
      const colAttr = geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const bornAttr = geometry.getAttribute('aBornTime') as THREE.BufferAttribute;
      const lifeAttr = geometry.getAttribute('aLifespan') as THREE.BufferAttribute;
      const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute;

      const ox = Array.isArray(origin) ? origin[0] : origin.x;
      const oy = Array.isArray(origin) ? origin[1] : origin.y;
      const oz = Array.isArray(origin) ? origin[2] : origin.z;
      const now = timeRef.current;

      for (let i = 0; i < velocities.length; i++) {
        const idx = nextIndex.current;
        nextIndex.current = (nextIndex.current + 1) % MAX_PARTICLES;

        posAttr.setXYZ(idx, ox, oy, oz);
        velAttr.setXYZ(idx, velocities[i][0], velocities[i][1], velocities[i][2]);
        colAttr.setXYZ(idx, colors[i][0], colors[i][1], colors[i][2]);
        bornAttr.setX(idx, now);
        lifeAttr.setX(idx, lifespans[i]);
        sizeAttr.setX(idx, sizes[i]);
      }

      posAttr.needsUpdate = true;
      velAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      bornAttr.needsUpdate = true;
      lifeAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    },

    emitShell(origin, velocity, color, lifespan, size) {
      const idx = nextIndex.current;
      nextIndex.current = (nextIndex.current + 1) % MAX_PARTICLES;

      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const velAttr = geometry.getAttribute('aVelocity') as THREE.BufferAttribute;
      const colAttr = geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const bornAttr = geometry.getAttribute('aBornTime') as THREE.BufferAttribute;
      const lifeAttr = geometry.getAttribute('aLifespan') as THREE.BufferAttribute;
      const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute;

      posAttr.setXYZ(idx, origin[0], origin[1], origin[2]);
      velAttr.setXYZ(idx, velocity[0], velocity[1], velocity[2]);
      colAttr.setXYZ(idx, color[0], color[1], color[2]);
      bornAttr.setX(idx, timeRef.current);
      lifeAttr.setX(idx, lifespan);
      sizeAttr.setX(idx, size);

      posAttr.needsUpdate = true;
      velAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      bornAttr.needsUpdate = true;
      lifeAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      return idx;
    },

    kill(index: number) {
      const lifeAttr = geometry.getAttribute('aLifespan') as THREE.BufferAttribute;
      const bornAttr = geometry.getAttribute('aBornTime') as THREE.BufferAttribute;
      lifeAttr.setX(index, 0);
      bornAttr.setX(index, -9999);
      lifeAttr.needsUpdate = true;
      bornAttr.needsUpdate = true;
    },

    getTime() {
      return timeRef.current;
    },

    setGravity(g: number) {
      material.uniforms.uGravity.value = g;
    },

    setDrag(d: number) {
      material.uniforms.uDrag.value = d;
    },
  }));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    if (material.uniforms) {
      material.uniforms.uTime.value = timeRef.current;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  );
});

GPUParticleSystem.displayName = 'GPUParticleSystem';
export default GPUParticleSystem;
