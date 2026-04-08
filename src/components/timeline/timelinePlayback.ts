import { useEffect } from 'react';

type AdvancePlaybackParams = {
  currentTime: number;
  duration: number;
  deltaSeconds: number;
};

type AdvancePlaybackResult = {
  time: number;
  reachedEnd: boolean;
};

type UseTimelinePlaybackParams = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
};

export function advancePlaybackTime({
  currentTime,
  duration,
  deltaSeconds,
}: AdvancePlaybackParams): AdvancePlaybackResult {
  const time = Math.min(duration, currentTime + deltaSeconds);
  return {
    time,
    reachedEnd: time >= duration,
  };
}

export function useTimelinePlayback({
  currentTime,
  duration,
  isPlaying,
  setCurrentTime,
  setIsPlaying,
}: UseTimelinePlaybackParams) {
  useEffect(() => {
    if (!isPlaying) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = (now - last) / 1000;
      last = now;
      const next = advancePlaybackTime({ currentTime, duration, deltaSeconds });
      setCurrentTime(next.time);

      if (next.reachedEnd) {
        setIsPlaying(false);
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [currentTime, duration, isPlaying, setCurrentTime, setIsPlaying]);
}
