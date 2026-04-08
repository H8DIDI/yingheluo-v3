import test from 'node:test';
import assert from 'node:assert/strict';

import { advancePlaybackTime } from './timelinePlayback.ts';

test('advancePlaybackTime moves forward by delta and keeps playback active', () => {
  const next = advancePlaybackTime({ currentTime: 10, duration: 30, deltaSeconds: 0.5 });

  assert.equal(next.time, 10.5);
  assert.equal(next.reachedEnd, false);
});

test('advancePlaybackTime clamps to duration and stops at end', () => {
  const next = advancePlaybackTime({ currentTime: 29.8, duration: 30, deltaSeconds: 0.5 });

  assert.equal(next.time, 30);
  assert.equal(next.reachedEnd, true);
});
