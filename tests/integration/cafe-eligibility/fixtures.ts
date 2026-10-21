import { randomUUID } from "node:crypto";
import { scenario as sharedScenario, columns, column, insert, rows, q, ident } from "../moderation/fixtures";
import { localSql } from "../../e2e/accounts/local";
export { q, ident, rows, columns, column, insert, asActor, origin, reason, account } from "../moderation/fixtures";
export { auditTable, targetAudits } from "../audit/fixtures";

export const route = (id: string, operation: "decision" | "suspension") => `/api/admin/cafes/${encodeURIComponent(id)}/${operation}`;
export const applicationStates = ["pending", "approved", "rejected"] as const;
export type ApplicationState = typeof applicationStates[number];
export const orderStates = ["pending", "accepted", "ready", "collected", "rejected", "cancelled"] as const;
export const cafeRow = (id: string) => rows(`select * from public.cafes where id=${q(id)}`)[0];
export const ordersFor = (id: string) => rows(`select * from public.orders where cafe_id=${q(id)} order by id`);
export function scenario(kit = true, state: ApplicationState = "pending", suspended = false) {
  const f = sharedScenario(kit);
  localSql(`update public.cafes set application_state=${q(state)},suspended=${q(suspended)} where id=${q(f.cafe)};`);
  return f;
}
/** Product columns have no specified SQL spelling. Resolve known vocabulary aliases,
 * and fail explicitly when storage is absent rather than installing product schema. */
export function cafeFields() {
  return Object.fromEntries(Object.entries({ description: ["description"], area: ["area"], address: ["pickup_address"],
    submitted: ["submitted_at", "application_submitted_at"], cutoff: ["pickup_cutoff_minutes"], version: ["suspension_version"] })
    .map(([key, aliases]) => [key, column("public", "cafes", aliases)])) as Record<"description" | "area" | "address" | "submitted" | "cutoff" | "version", string>;
}
export function applicationDetails(id: string, submitted = "2026-01-01T00:00:00Z", name?: string) {
  const c = cafeFields();
  const record = { [c.description]: "Synthetic application description", [c.area]: "Central", [c.address]: "123 Synthetic Pickup Lane", [c.cutoff]: 15, [c.submitted]: submitted, ...(name ? { name } : {}) };
  localSql(`update public.cafes set ${Object.entries(record).map(([key, value]) => `${ident(key)}=${q(value)}`).join(",")} where id=${q(id)};`);
}
/** Arrange the result of an OWN-01 resubmission, without exercising its writer. */
export function resubmittedApplication(id: string, submitted: string) {
  const field = cafeFields().submitted;
  localSql(`update public.cafes set application_state='pending',${ident(field)}=${q(submitted)} where id=${q(id)};`);
}
export function orderFields() {
  return { state: column("public", "orders", ["state", "status", "order_state"]), reason: column("public", "orders", ["cancellation_reason"]),
    cancelled: column("public", "orders", ["cancelled_at"]) };
}
export function order(f: ReturnType<typeof scenario>, state: typeof orderStates[number]) {
  const c = orderFields(); const id = randomUUID();
  const available = columns("public", "orders");
  const optional: Record<string, unknown> = { placed_at: "2026-01-01T00:00:00Z", pickup_at: "2026-01-02T00:00:00Z", total_cents: 500,
    currency: "SGD", cafe_name: f.name, customer_name: "Synthetic customer", rejection_reason: state === "rejected" ? "Owner rejection" : null,
    accepted_at: ["accepted", "ready", "collected"].includes(state) ? "2026-01-01T01:00:00Z" : null,
    ready_at: ["ready", "collected"].includes(state) ? "2026-01-01T02:00:00Z" : null,
    collected_at: state === "collected" ? "2026-01-01T03:00:00Z" : null,
    rejected_at: state === "rejected" ? "2026-01-01T03:00:00Z" : null };
  insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id, [c.state]: state,
    [c.reason]: null, [c.cancelled]: state === "cancelled" ? "2026-01-01T03:00:00Z" : null,
    ...Object.fromEntries(Object.entries(optional).filter(([key]) => available.includes(key))) });
  return id;
}
