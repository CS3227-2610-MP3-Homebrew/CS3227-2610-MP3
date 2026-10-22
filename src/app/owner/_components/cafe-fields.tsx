"use client";
import { useSyncExternalStore } from "react";
import { weekdayNames, type OpeningInterval } from "@/lib/owner/cafe-input";

const noSubscription = () => () => {};
/** False during server rendering and hydration; owner forms stay disabled until
 * React controls their inputs, so early typing cannot merge with server values. */
export function useHydrated() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

export type HoursRow = { key: number; weekday: string; opensAt: string; closesAt: string; closesNextDay: boolean };
let nextKey = 0;
export const toRows = (hours: OpeningInterval[]): HoursRow[] => hours.map(h => ({ key: ++nextKey, weekday: String(h.weekday), opensAt: h.opensAt, closesAt: h.closesAt, closesNextDay: h.closesNextDay }));
export const toIntervals = (rows: HoursRow[]): OpeningInterval[] => rows.map(r => ({ weekday: Number(r.weekday), opensAt: r.opensAt, closesAt: r.closesAt, closesNextDay: r.closesNextDay }));

/** Field named by a safe server message prefix, e.g. "openingHours[1]: …". */
export type FieldError = { field: string; index?: number; message: string } | null;
const labels: Record<string, string> = {
  name: "Café name", description: "Description", area: "Area", pickupAddress: "Public pickup address",
  pickupSettings: "Last pickup cutoff", openingHours: "Opening hours",
};
export function fieldError(message: string): FieldError {
  const match = /^([A-Za-z]+)(?:\[(\d+)\])?(?:\.[A-Za-z.[\]0-9]+)?: ([\s\S]*)$/.exec(message);
  if (!match || !labels[match[1]]) return { field: "form", message };
  const index = match[2] === undefined ? undefined : Number(match[2]);
  const label = index === undefined ? labels[match[1]] : `Opening interval ${index + 1}`;
  return { field: match[1], index, message: `${label}: ${match[3]}` };
}
export const invalid = (error: FieldError, field: string) => error?.field === field ? { "aria-invalid": true as const, "aria-describedby": "owner-cafe-error" } : {};

const input = "block w-full rounded border border-zinc-400 p-2 aria-[invalid=true]:border-red-700 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-700";

/** Singapore-local weekly intervals; values are stored and sent as HH:mm without timezone conversion. */
export function HoursEditor({ rows, onChange, error }: { rows: HoursRow[]; onChange: (rows: HoursRow[]) => void; error: FieldError }) {
  const update = (key: number, change: Partial<HoursRow>) => onChange(rows.map(r => r.key === key ? { ...r, ...change } : r));
  const groupInvalid = error?.field === "openingHours" && error.index === undefined;
  return <fieldset className="space-y-3" {...(groupInvalid ? { "aria-describedby": "owner-cafe-error" } : {})}>
    <legend className="text-lg font-semibold">Weekly opening hours (Singapore time)</legend>
    <p className="text-sm">Opening is inclusive and closing exclusive. Tick “closes next day” for overnight hours. Leave the list empty to stay closed.</p>
    {rows.length === 0 && <p>No opening hours scheduled.</p>}
    <ul className="space-y-3">{rows.map((row, index) => {
      const rowInvalid = error?.field === "openingHours" && error.index === index;
      const marks = rowInvalid ? { "aria-invalid": true as const, "aria-describedby": "owner-cafe-error" } : {};
      return <li key={row.key} className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end ${rowInvalid ? "border-red-700" : "border-black/15"}`}>
        <label className="space-y-1"><span className="block text-sm font-medium">Interval {index + 1} weekday</span>
          <select className={input} value={row.weekday} onChange={e => update(row.key, { weekday: e.target.value })} {...marks}>
            {weekdayNames.map((day, i) => <option key={day} value={String(i + 1)}>{day}</option>)}
          </select></label>
        <label className="space-y-1"><span className="block text-sm font-medium">Interval {index + 1} opens at</span>
          <input className={input} type="time" value={row.opensAt} onChange={e => update(row.key, { opensAt: e.target.value })} {...marks} /></label>
        <label className="space-y-1"><span className="block text-sm font-medium">Interval {index + 1} closes at</span>
          <input className={input} type="time" value={row.closesAt} onChange={e => update(row.key, { closesAt: e.target.value })} {...marks} /></label>
        <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={row.closesNextDay} onChange={e => update(row.key, { closesNextDay: e.target.checked })} {...marks} /><span className="text-sm">Interval {index + 1} closes next day</span></label>
        <button type="button" className="rounded border border-zinc-400 px-3 py-2" onClick={() => onChange(rows.filter(r => r.key !== row.key))}>Remove interval {index + 1}</button>
      </li>;
    })}</ul>
    <button type="button" className="rounded border border-zinc-400 px-3 py-2 disabled:opacity-50" disabled={rows.length >= 14}
      onClick={() => onChange([...rows, { key: ++nextKey, weekday: "1", opensAt: "09:00", closesAt: "17:00", closesNextDay: false }])}>Add opening interval</button>
  </fieldset>;
}

export function CutoffField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: FieldError }) {
  return <label className="block space-y-1"><span className="block font-semibold">Last pickup cutoff (minutes before closing)</span>
    <span id="owner-cutoff-hint" className="block text-sm">A whole number from 0 to 180. Pickups are offered up to this many minutes before each continuous closing time.</span>
    <input className={`${input} max-w-40`} type="number" inputMode="numeric" min={0} max={180} step={1} value={value}
      onChange={e => onChange(e.target.value)} aria-describedby={error?.field === "pickupSettings" ? "owner-cafe-error owner-cutoff-hint" : "owner-cutoff-hint"}
      {...(error?.field === "pickupSettings" ? { "aria-invalid": true as const } : {})} /></label>;
}

export function DescriptionField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: FieldError }) {
  return <label className="block space-y-1"><span className="block font-semibold">Description</span>
    <textarea className={input} rows={4} value={value} onChange={e => onChange(e.target.value)} {...invalid(error, "description")} /></label>;
}

export function ErrorAlert({ error }: { error: FieldError }) {
  return error ? <p id="owner-cafe-error" role="alert" className="rounded-lg border border-red-700 p-3 text-red-800">{error.message}</p> : null;
}
export const inputClass = input;
