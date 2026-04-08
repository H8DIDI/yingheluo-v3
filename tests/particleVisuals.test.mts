import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getParticleSpriteConfig,
  getTrailSpriteConfig,
  getFlashSpriteConfig,
} from '../src/utils/particleSprite.ts';
import { buildQuickLaunchEffect } from '../src/components/stage/quickLaunch.ts';

test('particle sprite configs expose distinct visual profiles', () => {
  const spark = getParticleSpriteConfig();
  const trail = getTrailSpriteConfig();
  const flash = getFlashSpriteConfig();

  assert.equal(spark.size, 128);
  assert.equal(flash.size, 288);
  assert.ok(spark.size < flash.size);
  assert.ok(trail.height > trail.width);
  assert.ok(flash.coreStops.length > spark.coreStops.length);
});

test('quick launch presets expose distinct visual tuning inputs', () => {
  const peony = buildQuickLaunchEffect('peony', 'p');
  const willow = buildQuickLaunchEffect('willow', 'w');
  const comet = buildQuickLaunchEffect('comet', 'c');

  assert.ok(willow.trailLength > peony.trailLength);
  assert.ok(comet.spread < peony.spread);
  assert.ok(willow.duration > comet.duration);
});
