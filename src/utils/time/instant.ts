/** Format a browser-local instant as the compact shape used by quota rows. */
export function isValidInstant(ms: number): boolean {
  return Number.isFinite(ms) && !Number.isNaN(new Date(ms).getTime());
}

export function formatInstantShort(ms: number): string {
  if (!isValidInstant(ms)) return '-';
  return new Date(ms).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
