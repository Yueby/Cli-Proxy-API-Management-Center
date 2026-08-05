export function formatUtcOffsetLabel(offsetMinutes: number): string {
  if (!Number.isFinite(offsetMinutes) || offsetMinutes === 0) return 'GMT';
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(Math.trunc(offsetMinutes));
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

export function resolveTimeZoneLabel(date: Date = new Date()): string {
  return formatUtcOffsetLabel(-date.getTimezoneOffset());
}
