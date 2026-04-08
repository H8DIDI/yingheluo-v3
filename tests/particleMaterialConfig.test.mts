import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getParticleMaterialConfig,
  getParticleCoolingColor,
} from '../src/components/stage/particleMaterialConfig.ts';

test('particle material config exposes stronger flash and glow tuning', () => {
  const config = getParticleMaterialConfig();

  assert.equal(config.pointScale, 250);
  assert.ok(config.coreBoost > 2);
  assert.ok(config.flashBoost > config.coreBoost);
  assert.ok(config.coolingStrength > 0.4);
});

test('particle cooling color stays ember-toned', () => {
  const color = getParticleCoolingColor();

  assert.deepEqual(color, [0.88, 0.22, 0.04]);
});
