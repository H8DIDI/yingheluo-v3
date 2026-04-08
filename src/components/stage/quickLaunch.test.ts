import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQuickLaunchEffect,
  createQuickLaunchFinaleRequests,
  createQuickLaunchRandomShowRequests,
} from './quickLaunch.ts';

test('buildQuickLaunchEffect maps text presets to burst metadata', () => {
  const effect = buildQuickLaunchEffect('text-love', 'fx-1');

  assert.equal(effect.type, 'burst');
  assert.equal(effect.burstPattern, 'text-love');
  assert.equal(effect.burstLabel, 'LOVE');
  assert.ok(effect.particleCount >= 180);
});

test('createQuickLaunchRandomShowRequests staggers positions and presets', () => {
  const requests = createQuickLaunchRandomShowRequests('diamond');

  assert.equal(requests.length, 8);
  assert.equal(new Set(requests.map((request) => request.id)).size, 8);
  assert.ok(new Set(requests.map((request) => request.world.join(','))).size > 3);
  assert.ok(requests.some((request) => request.preset === 'diamond'));
});

test('createQuickLaunchFinaleRequests creates layered finale presets', () => {
  const requests = createQuickLaunchFinaleRequests([0, 0, -8]);
  const presetSet = new Set(requests.map((request) => request.preset));

  assert.equal(requests.length, 9);
  assert.ok(presetSet.has('ring'));
  assert.ok(presetSet.has('text-520'));
  assert.ok(presetSet.has('willow'));
});
