import { randomUUID } from "node:crypto";
import { account, insert, q, rows, type Scenario } from "../moderation/fixtures";
import { auditFixture, targetAudits } from "../audit/fixtures";
import { localSql, provisionAccount } from "../../e2e/accounts/local";
export { account, asActor, q, rows } from "../moderation/fixtures";
export { targetAudits } from "../audit/fixtures";

/** T-53 owner café fixtures: local synthetic workspaces and authoritative stored
 * application/decision/suspension state. Admin decisions are arranged, never mutated
 * through T-29 routes; Customer orders are arranged, never created through T-43. */
export const origin = "http://127.0.0.1:3100";
export const unsafe = '<img src=x onerror="window.ownerCafeExecuted=true"> & café 😀';
export const routes = { cafe: "/api/owner/cafe", applications: "/api/owner/applications", resubmit: "/api/owner/cafe/resubmit", settings: "/api/owner/cafe/settings" } as const;
export const suspensionConflict = "Cafe suspension status changed. Review the application page.";
export type Area = "Central" | "North" | "South" | "East" | "West";
export type Interval = { weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean };
export type OwnerCafe = {
  cafeId: string; name: string; description: string; area: Area; pickupAddress: string; openingHours: Interval[];
  pickupSettings: { pickupCutoffMinutes: number }; applicationState: "pending" | "approved" | "rejected";
  submittedAt: string; suspended: boolean; suspensionVersion: number;
  latestDecision: { decision: "approve" | "reject"; reason: string; decidedAt: string } | null; suspensionReason: string | null;
};
export const ownerCafeKeys = ["cafeId", "name", "description", "area", "pickupAddress", "openingHours", "pickupSettings", "applicationState", "submittedAt", "suspended", "suspensionVersion", "latestDecision", "suspensionReason"].sort();

/** One synthetic workspace: main (shared seeded main workspace) or a fresh kit workspace. */
export function workspace(kit = true) {
  const admin = provisionAccount("admin", kit);
  const ws = admin.workspaceId;
  return { kit, admin, workspaceId: ws, owner: account("owner", ws), other: account("owner", ws), customer: account("customer", ws) };
}
export type Workspace = ReturnType<typeof workspace>;

/** Singapore calendar dates relative to the database clock. */
export function sgDate(offsetDays: number) {
  return JSON.parse(localSql(`select json_build_object('date',to_char((now() at time zone 'Asia/Singapore') + interval '${offsetDays} day','YYYY-MM-DD'),'weekday',extract(isodow from (now() at time zone 'Asia/Singapore') + interval '${offsetDays} day')::int)`)) as { date: string; weekday: number };
}
/** Instant (ms) for a Singapore local date/time. */
export const sgt = (date: string, time: string) => Date.parse(`${date}T${time}:00+08:00`);
export const interval = (weekday: number, opensAt: string, closesAt: string, closesNextDay = false): Interval => ({ weekday, opensAt, closesAt, closesNextDay });
export const sortHours = (hours: Interval[]) => [...hours].sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt));

let counter = 0;
/** A valid CafeApplicationInput with unique name/address pair. */
export function application(overrides: Record<string, unknown> = {}) {
  const tag = `${randomUUID().slice(0, 8)}-${++counter}`;
  return { submissionKey: randomUUID(), name: `T53 Café ${tag}`, description: "Synthetic description", area: "Central",
    pickupAddress: `${tag} Synthetic Pickup Road`, openingHours: [interval(1, "09:00", "12:00")], pickupSettings: {}, ...overrides };
}

/** Arrange a stored café as the authoritative result of an earlier submission/decision. */
export function arrangeCafe(owner: { id: string; workspaceId: string }, options: {
  state?: "pending" | "approved" | "rejected"; suspended?: boolean; cutoff?: number; hours?: Interval[]; name?: string; address?: string;
  description?: string; area?: Area; submittedAt?: string; version?: number;
} = {}) {
  const id = randomUUID(); const tag = id.slice(0, 8);
  const record = { id, workspace_id: owner.workspaceId, owner_id: owner.id, name: options.name ?? `T53 Arranged ${tag}`,
    description: options.description ?? "Arranged description", area: options.area ?? "Central",
    pickup_address: options.address ?? `${tag} Arranged Pickup Street`, application_state: options.state ?? "approved",
    suspended: options.suspended ?? false, pickup_cutoff_minutes: options.cutoff ?? 15,
    submitted_at: options.submittedAt ?? "2026-01-01T00:00:00Z", suspension_version: options.version ?? 0 };
  insert("public.cafes", record);
  for (const h of options.hours ?? []) insert("public.opening_hours", { id: randomUUID(), cafe_id: id, weekday: h.weekday, opens_at: h.opensAt, closes_at: h.closesAt, closes_next_day: h.closesNextDay });
  return id;
}
/** Arrange an ADM-01 decision outcome with its private reason and append-only audit entry. */
export function decide(f: Workspace, cafe: string, decision: "approve" | "reject", reason: string, decidedAt = "2026-02-01T00:00:00Z") {
  localSql(`update public.cafes set application_state=${q(decision === "approve" ? "approved" : "rejected")} where id=${q(cafe)};
    insert into public.cafe_admin_reasons(cafe_id,decision,decision_reason,decided_at) values (${q(cafe)},${q(decision)},${q(reason)},${q(decidedAt)})
    on conflict (cafe_id) do update set decision=excluded.decision,decision_reason=excluded.decision_reason,decided_at=excluded.decided_at;`);
  auditFixture({ admin: f.admin } as unknown as Scenario, decision, cafe, decidedAt, reason);
}
/** Arrange an ADM-02 suspend/un-suspend outcome, including its version increment. */
export function suspend(f: Workspace, cafe: string, suspended: boolean, reason: string, at = "2026-03-01T00:00:00Z") {
  localSql(`update public.cafes set suspended=${q(suspended)},suspension_version=suspension_version+1 where id=${q(cafe)};
    insert into public.cafe_admin_reasons(cafe_id,suspension_reason,suspension_changed_at) values (${q(cafe)},${q(reason)},${q(at)})
    on conflict (cafe_id) do update set suspension_reason=excluded.suspension_reason,suspension_changed_at=excluded.suspension_changed_at;`);
  auditFixture({ admin: f.admin } as unknown as Scenario, suspended ? "suspend" : "un-suspend", cafe, at, reason);
}

export const cafeRow = (id: string) => rows(`select * from public.cafes where id=${q(id)}`)[0];
export const ownedCafes = (owner: string) => rows(`select * from public.cafes where owner_id=${q(owner)} order by id`);
export const storedHours = (id: string) => rows(`select weekday,to_char(opens_at,'HH24:MI') as "opensAt",to_char(closes_at,'HH24:MI') as "closesAt",closes_next_day as "closesNextDay" from public.opening_hours where cafe_id=${q(id)} order by weekday,opens_at,closes_at`);
export const reasons = (id: string) => rows(`select * from public.cafe_admin_reasons where cafe_id=${q(id)}`);
/** Every observable stored effect of an owner operation on one café. */
export const snapshot = (id: string) => ({ cafe: cafeRow(id), hours: storedHours(id), reasons: reasons(id), audit: targetAudits(id) });
export const ownerSnapshot = (owner: string) => ownedCafes(owner).map(c => snapshot(String(c.id)));

