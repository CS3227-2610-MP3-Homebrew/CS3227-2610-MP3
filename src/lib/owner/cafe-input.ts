import { z } from "zod";

/** Owner café management vocabulary (INTEGRATION-SPEC owner café boundary). */
export const areas = ["Central", "North", "South", "East", "West"] as const;
export type Area = typeof areas[number];
export const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const suspensionConflictMessage = "Cafe suspension status changed. Review the application page.";

export type OpeningInterval = { weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean };
export type OwnerCafe = {
  cafeId: string; name: string; description: string; area: Area; pickupAddress: string;
  openingHours: OpeningInterval[]; pickupSettings: { pickupCutoffMinutes: number };
  applicationState: "pending" | "approved" | "rejected"; submittedAt: string;
  suspended: boolean; suspensionVersion: number;
  latestDecision: { decision: "approve" | "reject"; reason: string; decidedAt: string } | null;
  suspensionReason: string | null;
};

const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const interval = z.strictObject({ weekday: z.number().int().min(1).max(7), opensAt: localTime, closesAt: localTime, closesNextDay: z.boolean() });
// U+0000 cannot be stored as PostgreSQL text; reject it as ordinary invalid input.
const text = z.string().refine(value => !value.includes("\u0000"));
const cutoff = z.number().int().min(0).max(180);
const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const submissionKey = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const applicationFields = {
  submissionKey, name: text, description: text, area: z.enum(areas), pickupAddress: text,
  openingHours: z.array(interval), pickupSettings: z.strictObject({ pickupCutoffMinutes: cutoff.optional() }),
};
const schemas = {
  application: z.strictObject(applicationFields),
  resubmission: z.strictObject({ ...applicationFields, expectedSuspensionVersion: version }),
  settings: z.strictObject({ description: text, openingHours: z.array(interval), pickupSettings: z.strictObject({ pickupCutoffMinutes: cutoff }), expectedSuspensionVersion: version }),
};

export type ApplicationInput = { submissionKey: string; name: string; description: string; area: Area; pickupAddress: string; openingHours: OpeningInterval[]; pickupSettings: { pickupCutoffMinutes?: number } };
export type ResubmissionInput = ApplicationInput & { expectedSuspensionVersion: number };
export type SettingsInput = { description: string; openingHours: OpeningInterval[]; pickupSettings: { pickupCutoffMinutes: number }; expectedSuspensionVersion: number };
type Inputs = { application: ApplicationInput; resubmission: ResubmissionInput; settings: SettingsInput };
export type OwnerInputKind = keyof Inputs;
export type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

/** Counts Unicode code points, not UTF-16 units. */
export const codePoints = (value: string) => Array.from(value).length;

const fieldMessages: Record<string, string> = {
  submissionKey: "must be a lowercase UUID.",
  area: "must be one of Central, North, South, East or West.",
  weekday: "must be a whole number from 1 (Monday) to 7 (Sunday).",
  opensAt: "must be a 24-hour HH:mm time.",
  closesAt: "must be a 24-hour HH:mm time.",
  closesNextDay: "must be true or false.",
  pickupCutoffMinutes: "must be a whole number of minutes from 0 to 180.",
  expectedSuspensionVersion: "must be a nonnegative whole number.",
  openingHours: "must be a list of opening intervals.",
};

function pathText(path: PropertyKey[]) {
  return path.reduce<string>((text, part) => typeof part === "number" ? `${text}[${part}]` : text ? `${text}.${String(part)}` : String(part), "");
}

/** Safe field-named message: never reflects submitted values or unknown key names. */
function issueMessage(issue: z.core.$ZodIssue) {
  const path = pathText(issue.path);
  if (issue.code === "unrecognized_keys") return `${path || "request"}: contains an unsupported field.`;
  const last = [...issue.path].reverse().find(part => typeof part === "string");
  if (!path) return "request: must be a JSON object with the required fields.";
  return `${path}: ${(typeof last === "string" && fieldMessages[last]) || "is missing or invalid."}`;
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Shared weekly-interval rules; returns a message naming the first invalid interval. */
export function hoursProblem(hours: OpeningInterval[]): string | null {
  if (hours.length > 14) return "openingHours: at most fourteen intervals are allowed.";
  const spans: [number, number][] = [];
  const perDay = new Map<number, number>();
  for (const [index, h] of hours.entries()) {
    const opens = minutes(h.opensAt); const closes = minutes(h.closesAt);
    if (h.closesNextDay && closes > opens) return `openingHours[${index}]: an overnight interval must close at or before its opening time on the next day.`;
    if (!h.closesNextDay && closes <= opens) return `openingHours[${index}]: closing time must be after opening time.`;
    const count = (perDay.get(h.weekday) ?? 0) + 1; perDay.set(h.weekday, count);
    if (count > 2) return `openingHours[${index}]: at most two intervals may start on the same weekday.`;
    const start = (h.weekday - 1) * 1440 + opens;
    const end = start + (h.closesNextDay ? 1440 - opens + closes : closes - opens);
    for (const [other, otherEnd] of spans) {
      if ([-10080, 0, 10080].some(shift => other < end + shift && start + shift < otherEnd)) return `openingHours[${index}]: intervals must not overlap.`;
    }
    spans.push([start, end]);
  }
  return null;
}

export const sortHours = (hours: OpeningInterval[]) => [...hours].sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt) || a.closesAt.localeCompare(b.closesAt) || Number(a.closesNextDay) - Number(b.closesNextDay));

function bounded(field: string, value: string, min: number, max: number): string | null {
  const length = codePoints(value);
  if (length < min || length > max) return min ? `${field}: must be ${min}–${max} characters after trimming spaces.` : `${field}: must be at most ${max} characters after trimming spaces.`;
  return null;
}

/** Strict owner JSON validation and ECMAScript-trim normalization. */
export function validateOwnerInput<K extends OwnerInputKind>(kind: K, body: unknown): Validation<Inputs[K]> {
  const parsed = schemas[kind].safeParse(body);
  if (!parsed.success) return { ok: false, message: issueMessage(parsed.error.issues[0]) };
  const value = { ...parsed.data } as Record<string, unknown> & { description: string; openingHours: OpeningInterval[] };
  value.description = value.description.trim();
  const problems: (string | null)[] = [];
  if (kind !== "settings") {
    value.name = String(value.name).trim(); value.pickupAddress = String(value.pickupAddress).trim();
    problems.push(bounded("name", value.name as string, 2, 100));
  }
  problems.push(bounded("description", value.description, 0, 500));
  if (kind !== "settings") problems.push(bounded("pickupAddress", value.pickupAddress as string, 10, 200));
  problems.push(hoursProblem(value.openingHours));
  const message = problems.find(problem => problem !== null);
  if (message) return { ok: false, message };
  return { ok: true, value: value as Inputs[K] };
}
