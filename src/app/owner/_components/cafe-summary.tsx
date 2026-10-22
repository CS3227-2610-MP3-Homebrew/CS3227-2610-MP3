import { weekdayNames, type OpeningInterval, type OwnerCafe } from "@/lib/owner/cafe-input";

/** Singapore-local stored times are shown as stored; no browser timezone conversion. */
export function intervalText(h: OpeningInterval) {
  return `${weekdayNames[h.weekday - 1]} ${h.opensAt}–${h.closesAt}${h.closesNextDay ? " (next day)" : ""}`;
}
export const singaporeInstant = (instant: string) => `${new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(instant))} SGT`;

export function HoursList({ hours }: { hours: OpeningInterval[] }) {
  if (!hours.length) return <p>No opening hours scheduled. The café is closed and offers no pickup slots.</p>;
  return <ul className="space-y-1">{hours.map((h, index) => <li key={index}>{intervalText(h)}</li>)}</ul>;
}

/** Read-only own café details. All values render as escaped plain text. */
export function CafeSummary({ cafe }: { cafe: OwnerCafe }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
    <dt className="font-semibold">Café name</dt><dd>{cafe.name}</dd>
    <dt className="font-semibold">Area</dt><dd>{cafe.area}</dd>
    <dt className="font-semibold">Public pickup address</dt><dd>{cafe.pickupAddress}</dd>
    <dt className="font-semibold">About the café</dt><dd className="whitespace-pre-wrap">{cafe.description || "No description provided."}</dd>
    <dt className="font-semibold">Weekly opening hours (Singapore time)</dt><dd><HoursList hours={cafe.openingHours} /></dd>
    <dt className="font-semibold">Last pickup before closing</dt><dd>{cafe.pickupSettings.pickupCutoffMinutes} minutes</dd>
  </dl>;
}
