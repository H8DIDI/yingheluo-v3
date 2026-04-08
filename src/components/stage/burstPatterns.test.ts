import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBurstPattern, resolveBurstPatternMeta } from './burstPatterns.ts';

test('buildBurstPattern creates a stable text glyph pattern', () => {
  const points = buildBurstPattern('text-love', 120, 10);

  assert.equal(points.length, 120);
  assert.ok(points.some((point) => point[0] < -1));
  assert.ok(points.some((point) => point[0] > 1));
  assert.ok(points.some((point) => point[1] > 1));
  assert.ok(points.every((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]) && Number.isFinite(point[2])));
});

test('resolveBurstPatternMeta exposes label text for text presets', () => {
  const meta = resolveBurstPatternMeta('text-520');

  assert.equal(meta.label, '520');
  assert.equal(meta.kind, 'text');
});

test('buildBurstPattern keeps ring presets on a near-flat plane', () => {
  const points = buildBurstPattern('ring', 48, 8);
  const ySpread = points.reduce((max, point) => Math.max(max, Math.abs(point[1])), 0);

  assert.equal(points.length, 48);
  assert.ok(ySpread < 0.001);
});
