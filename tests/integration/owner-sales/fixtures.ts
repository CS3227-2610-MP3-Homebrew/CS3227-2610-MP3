import { randomUUID } from "node:crypto";
import { localSql } from "../../e2e/accounts/local";
import { asActor, insert, q, scenario } from "../moderation/fixtures";

export const customerName = "PRIVATE CUSTOMER CANARY";
export type Line = { item: string; name: string; quantity: number; unitCents: number; live?: boolean };
type State = "pending" | "accepted" | "ready" | "collected" | "rejected" | "cancelled";

/** Singapore business date offset from today's, as YYYY-MM-DD. */
export const businessDate = (daysAgo = 0) => localSql(`select to_char((now() at time zone 'Asia/Singapore')::date - ${Number(daysAgo)},'YYYY-MM-DD');`);
/** ISO weekday (Monday 1) of a Singapore business date offset. */
export const weekdayOf = (daysAgo = 0) => Number(localSql(`select extract(isodow from (now() at time zone 'Asia/Singapore')::date - ${Number(daysAgo)});`));
/** Instant at the given Singapore wall-clock time on a business date offset. */
export const singaporeInstant = (daysAgo: number, time = "12:00") =>
  localSql(`select to_char((((now() at time zone 'Asia/Singapore')::date - ${Number(daysAgo)}) + ${q(time)}::time) at time zone 'Asia/Singapore' at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');`);

/** Owner café with retained purchases. Defaults to an isolated demo-kit workspace. */
export function salesFixture(main = false) {
  const f = scenario(!main);
  function menu(name: string, cents = 450) {
    const id = randomUUID(); insert("public.menu_items", { id, cafe_id: f.cafe, name, price_cents: cents }); return id;
  }
  /** A retained order whose lines keep their snapshots; `live: false` lines reference a removed menu row. */
  function order(lines: Line[], state: State = "collected", collectedDaysAgo = 1, time = "12:00", placedDaysAgo = collectedDaysAgo) {
    const id = randomUUID(); const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCents, 0);
    const collected = state === "collected" ? singaporeInstant(collectedDaysAgo, time) : null;
    insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id, state, cafe_name: f.name, customer_name: customerName,
      placed_at: singaporeInstant(placedDaysAgo, "08:00"), pickup_at: singaporeInstant(placedDaysAgo, "09:00"), total_cents: total, currency: "SGD",
      accepted_at: ["accepted", "ready", "collected"].includes(state) ?singaporeInstant(placedDaysAgo, "08:05") : null,
      ready_at: ["ready", "collected"].includes(state) ? singaporeInstant(placedDaysAgo, "08:10") : null, collected_at: collected,
      rejected_at: state === "rejected" ? singaporeInstant(placedDaysAgo, "08:05") : null, rejection_reason: state === "rejected" ? "Synthetic" : null,
      cancelled_at: state === "cancelled" ? singaporeInstant(placedDaysAgo, "08:05") : null });
    for (const l of lines) insert("public.order_items", { id: randomUUID(), order_id: id, cafe_id: f.cafe, menu_item_id: l.live === false ? null : l.item,
      item_ref: l.item, name: l.name, quantity: l.quantity, unit_price_cents: l.unitCents, line_total_cents: l.quantity * l.unitCents });
    return id;
  }
  return { ...f, menu, order };
}
export type SalesFixture = ReturnType<typeof salesFixture>;
export const snapshot = (cafe: string) => localSql(`select md5(coalesce((select json_agg(t order by t.id)::text from (
  select o.*, (select json_agg(i order by i.id) from public.order_items i where i.order_id=o.id) items from public.orders o where o.cafe_id=${q(cafe)}) t),'')
  ||coalesce((select json_agg(m order by m.id)::text from public.menu_items m where m.cafe_id=${q(cafe)}),'')||(select row_to_json(c)::text from public.cafes c where c.id=${q(cafe)}));`);
/** Call a session-scoped source RPC as an authenticated actor; returns parsed JSON. */
export const rpcAsActor = (actor: string, call: string) => JSON.parse(asActor(actor, `select ${call}::text;`));
