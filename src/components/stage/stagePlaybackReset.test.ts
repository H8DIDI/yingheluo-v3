import test from 'node:test';
import assert from 'node:assert/strict';

import { getPlaybackResetKey } from './stagePlaybackReset.ts';

test('getPlaybackResetKey only depends on project identity and playback mode', () => {
  assert.equal(getPlaybackResetKey('project-1', 'event'), 'project-1:event');
  assert.equal(getPlaybackResetKey('project-1', 'cue'), 'project-1:cue');
  assert.equal(getPlaybackResetKey(null, 'event'), 'no-project:event');
});
