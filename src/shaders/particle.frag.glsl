// GPU Particle fragment shader — soft glow with additive blending

varying float vLife;
varying vec3 vColor;
varying float vAge;

uniform sampler2D uSprite;
uniform float uCoreBoost;
uniform float uFlashBoost;
uniform float uGlowFalloff;
uniform float uCoreFalloff;

void main() {
  vec4 sprite = texture2D(uSprite, gl_PointCoord);
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float glow = exp(-dist * dist * uGlowFalloff);
  float core = exp(-dist * dist * uCoreFalloff);
  float alpha = sprite.a * mix(glow, core, 0.7);

  // Life-based fade
  float lifeFade = smoothstep(0.0, 0.08, vLife);
  alpha *= lifeFade;

  // Sparkle: random brightness variation based on age
  float sparkle = 0.85 + 0.15 * fract(sin(vAge * 127.1 + gl_PointCoord.x * 311.7) * 43758.5453);
  alpha *= sparkle;

  float flash = smoothstep(0.82, 1.0, vLife);
  float boost = mix(uCoreBoost, uFlashBoost, flash);
  vec3 finalColor = vColor * sprite.rgb * (1.0 + core * boost + glow * 0.35);

  gl_FragColor = vec4(finalColor * alpha, alpha);
}
