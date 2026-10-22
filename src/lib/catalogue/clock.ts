/** Recurring Singapore business hours; pure so browser date conversion can reuse it. */
export type OpeningInterval = { weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean };
const day = 86_400_000;
const week = 7 * day;
const singaporeOffset = 8 * 3_600_000;
const wire = (time: number) => new Date(time).toISOString().replace('.000Z', 'Z');
const minuteOffset = (time: string) => (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))) * 60_000;
export function singaporeMinuteToInstant(date: string, minute: string): string {
  return wire(Date.parse(`${date}T${minute}:00+08:00`));
}
export function openingState(hours: OpeningInterval[], now: string) {
  const instant = Date.parse(now);
  const local = new Date(instant + singaporeOffset);
  const weekday = (local.getUTCDay() + 6) % 7;
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - weekday * day - singaporeOffset;
  const intervals: [number, number][] = [];
  // Include the previous week for Sunday overnight, and two future weeks for
  // adjacent intervals that cross a week boundary or a continuously open week.
  for (let shift = -1; shift <= 2; shift++) for (const h of hours) {
    const startDay = monday + shift * week + (h.weekday - 1) * day;
    intervals.push([startDay + minuteOffset(h.opensAt), startDay + minuteOffset(h.closesAt) + (h.closesNextDay ? day : 0)]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  const current = merged.find(([start, end]) => start <= instant && instant < end);
  const next = merged.find(([start]) => start > instant);
  // A continuously open weekly schedule has no future closed-to-open transition.
  const continuous = current && current[1] - current[0] >= week;
  return {
    isOpen: Boolean(current),
    closingSoon: Boolean(current && !continuous && current[1] - instant <= 30 * 60_000),
    nextOpeningAt: next && !continuous ? wire(next[0]) : null,
  };
}
