import type { OpeningInterval } from '@/lib/catalogue/clock';

const day = 86_400_000;
const offset = 8 * 3_600_000;
const grid = 15 * 60_000;
const minutes = (value: string) => (Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))) * 60_000;

/** The caller supplies the database clock. All calendar arithmetic is Singapore. */
export function pickupSlots(hours: OpeningInterval[], cutoffMinutes = 15, now: string): string[] {
  const instant = Date.parse(now);
  const local = new Date(instant + offset);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset;
  const weekday = (local.getUTCDay() + 6) % 7 + 1;
  const intervals: [number, number][] = [];
  // Include a full prior/following week to merge continuous week-boundary hours.
  for (let shift = -8; shift <= 14; shift++) for (const h of hours) {
    if (((weekday - 1 + shift) % 7 + 7) % 7 + 1 !== h.weekday) continue;
    const start = midnight + shift * day;
    intervals.push([start + minutes(h.opensAt), start + minutes(h.closesAt) + (h.closesNextDay ? day : 0)]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  const result: string[] = [];
  for (let slot = midnight; slot < midnight + 7 * day; slot += grid) {
    if (slot >= instant + grid && merged.some(([start, end]) => start <= slot && slot < end && slot <= end - cutoffMinutes * 60_000)) {
      result.push(new Date(slot).toISOString().replace('.000Z', 'Z'));
    }
  }
  return result;
}
