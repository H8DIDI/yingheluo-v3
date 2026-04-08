import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/store/projectStore.ts';
import {
  buildQuickLaunchEffect,
  createQuickLaunchRandomShowRequests,
  createQuickLaunchSalvoRequests,
  createQuickLaunchRequest,
  getQuickLaunchLaunchPoint,
  getQuickLaunchWorldPoint,
} from '../src/components/stage/quickLaunch.ts';

test('createQuickLaunchRequest stores a stage quick-launch payload', () => {
  useProjectStore.getState().requestQuickLaunch({
    world: [12, 0, -8],
    source: 'stage-tap',
  });

  const request = useProjectStore.getState().quickLaunchQueue[0];
  assert.ok(request);
  assert.deepEqual(request?.world, [12, 0, -8]);
  assert.equal(request?.source, 'stage-tap');
});

test('getQuickLaunchWorldPoint clamps stage taps to ground plane', () => {
  const point = getQuickLaunchWorldPoint([5, 13, -9]);
  assert.deepEqual(point, [5, 0, -9]);
});

test('createQuickLaunchRequest returns normalized request payload', () => {
  const request = createQuickLaunchRequest([4, 0, 7], 'stage-tap');
  assert.deepEqual(request.world, [4, 0, 7]);
  assert.equal(request.source, 'stage-tap');
  assert.ok(typeof request.id === 'string');
});

test('buildQuickLaunchEffect maps presets to distinct firework effects', () => {
  const peony = buildQuickLaunchEffect('peony', 'quick-1');
  const willow = buildQuickLaunchEffect('willow', 'quick-2');
  const comet = buildQuickLaunchEffect('comet', 'quick-3');

  assert.equal(peony.type, 'peony');
  assert.equal(willow.type, 'willow');
  assert.equal(comet.type, 'comet');
  assert.ok(peony.particleCount !== willow.particleCount);
});

test('getQuickLaunchLaunchPoint offsets burst launch behind target', () => {
  const launch = getQuickLaunchLaunchPoint([20, 0, -10]);
  assert.deepEqual(launch, [20, 0, -40]);
});

test('createQuickLaunchSalvoRequests fans out multiple bursts around center', () => {
  const requests = createQuickLaunchSalvoRequests([0, 0, 0], 'willow');

  assert.equal(requests.length, 5);
  assert.ok(requests.every((request) => request.preset === 'willow'));
  assert.ok(new Set(requests.map((request) => request.world.join(','))).size > 1);
});

test('createQuickLaunchRandomShowRequests stays inside stage bounds', () => {
  const requests = createQuickLaunchRandomShowRequests('comet');

  assert.equal(requests.length, 8);
  assert.ok(requests.every((request) => request.world[0] >= -60 && request.world[0] <= 60));
  assert.ok(requests.every((request) => request.world[2] >= -60 && request.world[2] <= 20));
});
