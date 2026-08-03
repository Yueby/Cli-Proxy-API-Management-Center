export type TimelineMode = 'weekly' | 'session';

export interface TimelineLane {
  name: string;
  displayName: string;
  provider: string;
  anchorMs: number | null;
  periodHours: number | null;
  remaining: number | null;
  limits: Array<{ label: string; remaining: number }>;
}

export interface TimelineWindow {
  startMs: number;
  endMs: number;
  leftPercent: number;
  widthPercent: number;
  state: 'past' | 'live' | 'next';
  remaining: number | null;
}

export function windowsIn(
  anchorMs: number,
  periodMs: number,
  fromMs: number,
  toMs: number
): Array<{ startMs: number; endMs: number }> {
  if (!Number.isFinite(anchorMs) || !(periodMs > 0) || !(toMs > fromMs)) return [];
  if (Math.ceil((toMs - fromMs) / periodMs) + 2 > 1000) return [];
  let endMs = anchorMs + Math.ceil((fromMs - anchorMs) / periodMs) * periodMs;
  const windows: Array<{ startMs: number; endMs: number }> = [];
  while (endMs - periodMs < toMs) {
    windows.push({ startMs: endMs - periodMs, endMs });
    endMs += periodMs;
  }
  return windows;
}

export function projectLane(
  lane: TimelineLane,
  spanStartMs: number,
  spanEndMs: number,
  now: number,
  mode: TimelineMode
): TimelineWindow[] {
  if (lane.anchorMs === null || !lane.periodHours) return [];
  if (mode === 'session' && lane.periodHours !== 5) return [];
  const span = spanEndMs - spanStartMs;
  if (span <= 0) return [];

  return windowsIn(lane.anchorMs, lane.periodHours * 3_600_000, spanStartMs, spanEndMs)
    .map((window): TimelineWindow | null => {
      const leftPercent = Math.max(0, ((window.startMs - spanStartMs) / span) * 100);
      const rightPercent = Math.min(100, ((window.endMs - spanStartMs) / span) * 100);
      if (rightPercent <= leftPercent) return null;
      const state: TimelineWindow['state'] =
        window.endMs <= now ? 'past' : window.startMs <= now ? 'live' : 'next';
      return {
        ...window,
        leftPercent,
        widthPercent: rightPercent - leftPercent,
        state,
        remaining: state === 'live' && window.endMs === lane.anchorMs ? lane.remaining : null,
      };
    })
    .filter((window): window is TimelineWindow => window !== null);
}
