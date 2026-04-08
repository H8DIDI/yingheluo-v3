import test from 'node:test';
import assert from 'node:assert/strict';

import { buildQuickLaunchEffect, getQuickLaunchBurstProfile } from './quickLaunch.ts';
import { clampBurstHeight, normalizeTubeDirection } from './stageTuning.ts';

test('quick launch presets use taller and larger burst profiles', () => {
  const peony = buildQuickLaunchEffect('peony', 'fx-peony');
  const willow = buildQuickLaunchEffect('willow', 'fx-willow');
  const profile = getQuickLaunchBurstProfile('peony');

  assert.ok(peony.height >= 125);
  assert.ok(peony.particleCount >= 320);
  assert.ok(willow.height >= 145);
  assert.ok(willow.particleCount >= 340);
  assert.ok(profile.burstHeight >= 34);
});

test('clampBurstHeight keeps show bursts away from floor and ceiling extremes', () => {
  assert.equal(clampBurstHeight(40, false), 72);
  assert.equal(clampBurstHeight(260, false), 168);
  assert.equal(clampBurstHeight(28, true), 28);
  assert.equal(clampBurstHeight(80, true), 52);
});

test('normalizeTubeDirection prevents near-horizontal launch vectors', () => {
  const normalized = normalizeTubeDirection([0.96, 0.08, 0.24]);

  assert.ok(normalized[1] >= 0.45);
  const length = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2 + normalized[2] ** 2);
  assert.ok(Math.abs(length - 1) < 0.0001);
});
