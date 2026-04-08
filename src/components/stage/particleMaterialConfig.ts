export type ParticleMaterialConfig = {
  pointScale: number;
  coreBoost: number;
  flashBoost: number;
  glowFalloff: number;
  coreFalloff: number;
  coolingStrength: number;
};

export function getParticleMaterialConfig(): ParticleMaterialConfig {
  return {
    pointScale: 250,
    coreBoost: 2.6,
    flashBoost: 3.8,
    glowFalloff: 7.5,
    coreFalloff: 46,
    coolingStrength: 0.52,
  };
}

export function getParticleCoolingColor(): [number, number, number] {
  return [0.88, 0.22, 0.04];
}
