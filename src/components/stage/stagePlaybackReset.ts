export function getPlaybackResetKey(
  projectId: string | null | undefined,
  playbackMode: 'event' | 'cue'
) {
  return `${projectId ?? 'no-project'}:${playbackMode}`;
}
