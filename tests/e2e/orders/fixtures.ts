import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { fixture as catalogue } from "../catalogue/fixtures";
import { columns, column, insert, q, rows } from "../../integration/moderation/fixtures";
import { localSql } from "../accounts/local";
export { login, failure } from "../moderation/helpers";
export { origin, q, rows, asActor } from "../../integration/moderation/fixtures";
export const base = "/api/customer/orders";
export const publicReason = "Cafe is suspended";
export const customerName = "Synthetic Customer 😀";
export const unsafe = '<img src=x onerror="window.orderExecuted=true">';
export type Order = {
  orderId: string; cafeId: string; cafeName: string; placedAt: string; pickupAt: string;
  state: "pending" | "accepted" | "ready" | "collected" | "rejected" | "cancelled";
  items: { itemId: string; name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  totalCents: number; currency: "SGD"; cancellationReason: string | null; rejectionReason: string | null;
  acceptedAt: string | null; readyAt: string | null; collectedAt: string | null; rejectedAt: string | null; cancelledAt: string | null;
};
export type CreateOrder = { cafeId: string; pickupAt: string; items: { itemId: string; quantity: number }[]; expectedTotalCents: number; submissionKey: string };
export function profileName(id: string, value: string | null) {
  const name = column("public", "profiles", ["name", "display_name", "customer_name"]);
  localSql(`update public.profiles set ${name}=${q(value)} where id=${q(id)};`);
}
export function fixture(main = false) {
  const f = catalogue(main); f.fields();
  // Existing foundation fixtures predate profile-name storage. Leave absent
  // storage for failing-first evidence; when present, arrange the specified name.
  if (["name", "display_name", "customer_name"].some(c => columns("public", "profiles").includes(c))) profileName(f.customer.id, customerName);
  const item = f.menu("coffee", false, unsafe, 450); const second = f.menu("tea", false, "Tea", 125);
  const tomorrow = JSON.parse(localSql("select json_build_object('date',to_char((now() at time zone 'Asia/Singapore') + interval '1 day','YYYY-MM-DD'),'weekday',extract(isodow from (now() at time zone 'Asia/Singapore') + interval '1 day')::int)")) as { date: string; weekday: number };
  f.hours(tomorrow.weekday, "09:00", "12:00");
  const pickupAt = `${tomorrow.date}T01:00:00Z`;
  function payload(overrides: Partial<CreateOrder> = {}): CreateOrder {
    return { cafeId: f.cafe, pickupAt, items: [{ itemId: item, quantity: 2 }, { itemId: second, quantity: 1 }], expectedTotalCents: 1025, submissionKey: randomUUID(), ...overrides };
  }
  return { ...f, item, second, pickupAt, tomorrow, payload };
}
export const create = (request: APIRequestContext, data: unknown) => request.post(base, { headers: { origin: "http://127.0.0.1:3100" }, data });
export const cancel = (request: APIRequestContext, id: string, data: unknown = {}) => request.post(`${base}/${encodeURIComponent(id)}/cancel`, { headers: { origin: "http://127.0.0.1:3100" }, data });
export async function orderResponse(response: APIResponse, status = 201): Promise<Order> {
  expect(response.status()).toBe(status); expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["content-type"]).toMatch(/^application\/json/);
  const body = await response.json(); expect(Object.keys(body).sort()).toEqual(["order", "requestId"]);
  expect(body.requestId).toEqual(expect.any(String));
  expect(Object.keys(body.order).sort()).toEqual(["orderId", "cafeId", "cafeName", "placedAt", "pickupAt", "state", "items", "totalCents", "currency", "cancellationReason", "rejectionReason", "acceptedAt", "readyAt", "collectedAt", "rejectedAt", "cancelledAt"].sort());
  return body.order;
}
export const ownOrder = async (request: APIRequestContext, id: string) => orderResponse(await request.get(`${base}/${id}`), 200);
export const stored = (id: string) => rows(`select * from public.orders where id=${q(id)}`)[0];
export const orderCount = (customer: string) => Number(localSql(`select count(*) from public.orders where customer_id=${q(customer)};`));
export function lifecycle(id: string, state: Order["state"]) {
  const record: Record<string, unknown> = { state, accepted_at: ["accepted", "ready", "collected"].includes(state) ? "2026-01-01T01:00:00Z" : null,
    ready_at: ["ready", "collected"].includes(state) ? "2026-01-01T02:00:00Z" : null, collected_at: state === "collected" ? "2026-01-01T03:00:00Z" : null,
    rejected_at: state === "rejected" ? "2026-01-01T03:00:00Z" : null, rejection_reason: state === "rejected" ? unsafe : null,
    cancelled_at: state === "cancelled" ? "2026-01-01T03:00:00Z" : null, cancellation_reason: null };
  localSql(`update public.orders set ${Object.entries(record).map(([key, value]) => `${key}=${q(value)}`).join(",")} where id=${q(id)};`);
}
/** Terminal/history fixture, independent of future owner HTTP writers. */
export function history(f: ReturnType<typeof fixture>, state: Order["state"] = "pending", placedAt = "2026-01-01T00:00:00Z") {
  const id = randomUUID();
  insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id, state: "pending", placed_at: placedAt, pickup_at: f.pickupAt, cafe_name: f.name, customer_name: customerName, total_cents: 900, currency: "SGD" });
  insert("public.order_items", { id: randomUUID(), order_id: id, cafe_id: f.cafe, menu_item_id: f.item,
    [column("public", "order_items", ["name", "item_name"])]: unsafe, quantity: 2, unit_price_cents: 450, line_total_cents: 900 });
  lifecycle(id, state); return id;
}
