// GPU Particle vertex shader — firework sparks
// Analytical integration with tuned drag + gravity for beautiful arcs

uniform float uTime;
uniform float uGravity;   // e.g. -9.8
uniform float uDrag;      // e.g. 0.98 (per-frame at 60fps)
uniform vec2 uResolution;
uniform float uPointScale;
uniform vec3 uCoolingColor;
uniform float uCoolingStrength;

attribute float aSize;
attribute vec3 aVelocity;
attribute vec3 aColor;
attribute float aBornTime;
attribute float aLifespan;

varying float vLife;
varying vec3 vColor;
varying float vAge;

void main() {
  float age = uTime - aBornTime;
  float life = clamp(1.0 - age / aLifespan, 0.0, 1.0);
  vLife = life;
  vAge = age;

  // --- Physics ---
  // Drag: continuous exponential decay factor
  // Convert per-frame drag (0.98 at 60fps) to continuous: k = -ln(drag)*fps
  // dragFactor(t) = exp(-k*t) where k ≈ 1.212 for drag=0.98
  float k = -log(uDrag) * 60.0;  // continuous drag constant
  float expKt = exp(-k * age);    // velocity multiplier at time t

  // Analytical position with exponential drag:
  // x(t) = v0/k * (1 - e^(-kt))  for horizontal
  // y(t) = (v0y + g/k)/k * (1 - e^(-kt)) - g/k * t  for vertical
  float invK = 1.0 / max(k, 0.01);

  vec3 displacement;
  float oneMinusExpKt = 1.0 - expKt;

  // Horizontal: drag only
  displacement.x = aVelocity.x * invK * oneMinusExpKt;
  displacement.z = aVelocity.z * invK * oneMinusExpKt;

  // Vertical: drag + gravity
  // Integrated: y(t) = (v0y - g/k) * (1 - e^(-kt))/k + g*t/k
  // Simplified with correct sign (gravity is negative):
  float gOverK = uGravity * invK;
  displacement.y = (aVelocity.y - gOverK) * invK * oneMinusExpKt + gOverK * age;

  vec3 worldPos = position + displacement;

  // Don't let particles go below ground
  worldPos.y = max(worldPos.y, 0.0);

  // --- Color temperature decay ---
  vec3 warmColor = aColor;
  if (life > 0.85) {
    // White-hot flash at birth
    float flash = (life - 0.85) / 0.15;
    warmColor = mix(aColor, vec3(1.0, 0.95, 0.85), flash * 0.5);
  } else if (life < 0.3) {
    // Cooling: shift to ember red and dim
    float cool = 1.0 - life / 0.3;
    warmColor = mix(aColor, uCoolingColor, cool * uCoolingStrength);
    warmColor *= 0.3 + 0.7 * (life / 0.3);
  }
  vColor = warmColor;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);

  // --- Size with life fade + perspective ---
  float birthFade = smoothstep(0.0, 0.03, 1.0 - life); // fade in
  float deathFade = smoothstep(0.0, 0.15, life);        // fade out
  float sizeMult = birthFade * deathFade;
  sizeMult = max(sizeMult, life * 0.5); // keep visible while alive

  gl_PointSize = aSize * sizeMult * (uPointScale / max(-mvPosition.z, 1.0));
  gl_PointSize = clamp(gl_PointSize, 0.5, 96.0);

  gl_Position = projectionMatrix * mvPosition;

  // Hide dead particles
  if (life <= 0.0 || age < 0.0) {
    gl_Position = vec4(9999.0, 9999.0, 9999.0, 1.0);
    gl_PointSize = 0.0;
  }
}
