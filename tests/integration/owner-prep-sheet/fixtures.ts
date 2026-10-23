import { randomUUID } from "node:crypto";
import { insert, scenario } from "../moderation/fixtures";
import { businessDate, singaporeInstant } from "../owner-sales/fixtures";
export { businessDate, singaporeInstant, snapshot } from "../owner-sales/fixtures";

export const customerName = "PREP CUSTOMER CANARY";
export type Line = { item: string; name: string; quantity: number; unitCents?: number; live?: boolean };
export type State = "pending" | "accepted" | "ready" | "collected" | "rejected" | "cancelled";
type Order = { state?: State; pickupAt?: string; placedAt?: string; id?: string; customer?: string };

/** Singapore business date offset forwards from today, as YYYY-MM-DD. */
export const dateAhead = (days = 0) => businessDate(-days);
/** Instant at a Singapore wall-clock time, `days` business dates after today. */
export const at = (days: number, time: string) => singaporeInstant(-days, time);

/** Owner café with retained orders at chosen pickup/placement instants. Defaults to an isolated demo-kit workspace. */
export function prepFixture(main = false) {
  const f = scenario(!main);
  function menu(name: string, cents = 450) {
    const id = randomUUID(); insert("public.menu_items", { id, cafe_id: f.cafe, name, price_cents: cents }); return id;
  }
  /** A retained order whose lines keep their snapshots; `live: false` lines reference a removed menu row. */
  function order(lines: Line[], { state = "accepted", pickupAt = at(0, "12:00"), placedAt = at(0, "07:00"), id = randomUUID(), customer = customerName }: Order = {}) {
    const total = lines.reduce((sum, l) => sum + l.quantity * (l.unitCents ?? 450), 0);
    const event = ["accepted", "ready", "collected", "rejected", "cancelled"].includes(state) ? placedAt : null;
    insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id, state, cafe_name: f.name, customer_name: customer,
      placed_at: placedAt, pickup_at: pickupAt, total_cents: total, currency: "SGD",
      accepted_at: ["accepted", "ready", "collected"].includes(state) ? event : null,
      ready_at: ["ready", "collected"].includes(state) ? event : null, collected_at: state === "collected" ? event : null,
      rejected_at: state === "rejected" ? event : null, rejection_reason: state === "rejected" ? "Synthetic" : null,
      cancelled_at: state === "cancelled" ? event : null });
    for (const l of lines) insert("public.order_items", { id: randomUUID(), order_id: id, cafe_id: f.cafe, menu_item_id: l.live === false ? null : l.item,
      item_ref: l.item, name: l.name, quantity: l.quantity, unit_price_cents: l.unitCents ?? 450, line_total_cents: l.quantity * (l.unitCents ?? 450) });
    return id;
  }
  return { ...f, menu, order };
}
export type PrepFixture = ReturnType<typeof prepFixture>;
