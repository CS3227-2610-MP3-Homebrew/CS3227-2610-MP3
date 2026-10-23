"use client";
import { useState, useSyncExternalStore } from "react";
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

const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const presets = [["Weekdays", [1, 2, 3, 4, 5]], ["Weekends", [6, 7]], ["Every day", [1, 2, 3, 4, 5, 6, 7]]] as const;
const minutesOf = (time: string) => /^\d{2}:\d{2}$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
/** Mirrors the shared contract: an interval closes next day exactly when closing is not after opening. */
const overnight = (opensAt: string, closesAt: string, current: boolean) => {
  const opens = minutesOf(opensAt), closes = minutesOf(closesAt);
  return opens === null || closes === null ? current : closes <= opens;
};
const clock = (time: string) => {
  const m = minutesOf(time); if (m === null) return "--:--";
  const hour = Math.floor(m / 60);
  return `${hour % 12 || 12}:${String(m % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};
const byDay = (a: HoursRow, b: HoursRow) => Number(a.weekday) - Number(b.weekday) || a.opensAt.localeCompare(b.opensAt);
const chip = "rounded-full border px-3 py-1 text-sm";

/** Singapore-local weekly intervals; values are stored and sent as HH:mm without timezone conversion. */
export function HoursEditor({ rows, onChange, error }: { rows: HoursRow[]; onChange: (rows: HoursRow[]) => void; error: FieldError }) {
  const [days, setDays] = useState<number[]>([]);
  const [fill, setFill] = useState({ opensAt: "09:00", closesAt: "18:00" });
  const update = (key: number, change: Partial<HoursRow>) => onChange(rows.map(r => r.key === key ? { ...r, ...change } : r));
  // Editing either time keeps the next-day box consistent; the owner can still change it explicitly.
  const setTime = (row: HoursRow, change: Pick<HoursRow, "opensAt"> | Pick<HoursRow, "closesAt">) => {
    const next = { ...row, ...change };
    update(row.key, { ...change, closesNextDay: overnight(next.opensAt, next.closesAt, row.closesNextDay) });
  };
  const toggleDay = (day: number) => setDays(days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b));
  const kept = rows.filter(r => !days.includes(Number(r.weekday)));
  const canFill = days.length > 0 && kept.length + days.length <= 14 && minutesOf(fill.opensAt) !== null && minutesOf(fill.closesAt) !== null;
  const fillDays = () => onChange([...kept, ...days.map(day => ({ key: ++nextKey, weekday: String(day), ...fill,
    closesNextDay: overnight(fill.opensAt, fill.closesAt, false) }))].sort(byDay));
  const last = rows.at(-1);
  // A new interval continues the week: the day after the last interval, with its hours.
  const addInterval = () => onChange([...rows, last
    ? { key: ++nextKey, weekday: String(Number(last.weekday) % 7 + 1), opensAt: last.opensAt, closesAt: last.closesAt, closesNextDay: last.closesNextDay }
    : { key: ++nextKey, weekday: "1", opensAt: "09:00", closesAt: "17:00", closesNextDay: false }]);
  const groupInvalid = error?.field === "openingHours" && error.index === undefined;
  return <fieldset className="space-y-4" {...(groupInvalid ? { "aria-describedby": "owner-cafe-error" } : {})}>
    <legend className="text-lg font-semibold">Weekly opening hours (Singapore time)</legend>
    <p className="text-sm">Opening is inclusive and closing exclusive. Overnight hours close the next day; that box is ticked for you when closing is not after opening. Leave the list empty to stay closed.</p>
    <ul aria-label="Week at a glance" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">{weekdayNames.map((day, i) => {
      const list = rows.filter(r => Number(r.weekday) === i + 1).sort(byDay);
      return <li key={day} className={`rounded-lg border p-2 ${list.length ? "border-black/15" : "border-dashed border-black/15 opacity-70"}`}>
        <span className="block font-semibold"><abbr title={day} className="no-underline">{dayShort[i]}</abbr></span>
        {list.length ? list.map(r => <span key={r.key} className="block">{clock(r.opensAt)} – {clock(r.closesAt)}{r.closesNextDay ? " (next day)" : ""}</span>)
          : <span className="block">Closed</span>}
      </li>;
    })}</ul>
    <div className="space-y-3 rounded-lg border border-black/15 p-3">
      <p className="font-medium">Quick fill</p>
      <p className="text-sm">Pick days and hours to fill them at once. This replaces any intervals already listed for those days.</p>
      <div className="flex flex-wrap gap-2">{presets.map(([name, set]) =>
        <button key={name} type="button" className={`${chip} border-zinc-400`} onClick={() => setDays([...set])}>{name}</button>)}
        <button type="button" className={`${chip} border-zinc-400`} onClick={() => setDays([])}>Clear days</button></div>
      <div className="flex flex-wrap gap-2">{weekdayNames.map((day, i) => <label key={day} className={`${chip} flex items-center gap-2 ${days.includes(i + 1) ? "border-black bg-black/10 font-semibold" : "border-zinc-400"}`}>
        <input type="checkbox" checked={days.includes(i + 1)} onChange={() => toggleDay(i + 1)} /><span><span className="sr-only">Quick fill</span> {day}</span></label>)}</div>
      <div className="grid gap-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(8rem,12rem)_auto] sm:items-end">
        <label className="space-y-1"><span className="block text-sm font-medium"><span className="sr-only">Quick fill</span> Opens at</span>
          <input className={input} type="time" value={fill.opensAt} onChange={e => setFill({ ...fill, opensAt: e.target.value })} /></label>
        <label className="space-y-1"><span className="block text-sm font-medium"><span className="sr-only">Quick fill</span> Closes at</span>
          <input className={input} type="time" value={fill.closesAt} onChange={e => setFill({ ...fill, closesAt: e.target.value })} /></label>
        <button type="button" className="rounded border border-zinc-400 px-3 py-2 disabled:opacity-50" disabled={!canFill} onClick={fillDays}>
          {days.length ? `Set hours for ${days.length} ${days.length === 1 ? "day" : "days"}` : "Choose days to fill"}</button>
      </div>
      {overnight(fill.opensAt, fill.closesAt, false) && <p className="text-sm">These hours run past midnight and will close the next day.</p>}
      {days.length > 0 && kept.length + days.length > 14 && <p className="text-sm">That would make more than fourteen intervals. Remove some first.</p>}
    </div>
    {rows.length === 0 && <p>No opening hours scheduled.</p>}
    <ul className="space-y-3">{rows.map((row, index) => {
      const rowInvalid = error?.field === "openingHours" && error.index === index;
      const marks = rowInvalid ? { "aria-invalid": true as const, "aria-describedby": "owner-cafe-error" } : {};
      return <li key={row.key} className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto_auto] sm:items-end ${rowInvalid ? "border-red-700" : "border-black/15"}`}>
        <label className="space-y-1"><span className="block text-sm font-medium"><span className="sr-only">Interval {index + 1}</span> Weekday</span>
          <select className={input} value={row.weekday} onChange={e => update(row.key, { weekday: e.target.value })} {...marks}>
            {weekdayNames.map((day, i) => <option key={day} value={String(i + 1)}>{day}</option>)}
          </select></label>
        <label className="space-y-1"><span className="block text-sm font-medium"><span className="sr-only">Interval {index + 1}</span> Opens at</span>
          <input className={input} type="time" value={row.opensAt} onChange={e => setTime(row, { opensAt: e.target.value })} {...marks} /></label>
        <label className="space-y-1"><span className="block text-sm font-medium"><span className="sr-only">Interval {index + 1}</span> Closes at</span>
          <input className={input} type="time" value={row.closesAt} onChange={e => setTime(row, { closesAt: e.target.value })} {...marks} /></label>
        <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={row.closesNextDay} onChange={e => update(row.key, { closesNextDay: e.target.checked })} {...marks} /><span className="text-sm"><span className="sr-only">Interval {index + 1}</span> Closes next day</span></label>
        <button type="button" className="rounded border border-zinc-400 px-3 py-2" onClick={() => onChange(rows.filter(r => r.key !== row.key))}>Remove <span className="sr-only">interval {index + 1}</span></button>
      </li>;
    })}</ul>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="rounded border border-zinc-400 px-3 py-2 disabled:opacity-50" disabled={rows.length >= 14} onClick={addInterval}>Add opening interval</button>
      <span className="text-sm">{last ? "Copies the last interval's hours onto the following day." : "Starts on Monday."} {rows.length}/14 intervals.</span>
    </div>
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
