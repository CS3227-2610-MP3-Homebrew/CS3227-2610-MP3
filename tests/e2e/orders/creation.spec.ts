import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { customerName, base, cancel, create, failure, fixture, login, orderCount, orderResponse, origin, ownOrder, profileName, q, rows, stored, unsafe } from "./fixtures";

test("CUS-03.1 CUS-03.5 CUS-03.6: atomic own pending purchase uses verified identity and immutable SGD snapshots", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const payload = f.payload();
  const order = await orderResponse(await create(request, payload));
  expect(order).toEqual({ orderId: expect.any(String), cafeId: f.cafe, cafeName: f.name, placedAt: expect.any(String), pickupAt: expect.any(String), state: "pending",
    items: [{ itemId: f.item, name: unsafe, quantity: 2, unitPriceCents: 450, lineTotalCents: 900 }, { itemId: f.second, name: "Tea", quantity: 1, unitPriceCents: 125, lineTotalCents: 125 }].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    totalCents: 1025, currency: "SGD", cancellationReason: null, rejectionReason: null, acceptedAt: null, readyAt: null, collectedAt: null, rejectedAt: null, cancelledAt: null });
  expect(Date.parse(order.pickupAt)).toBe(Date.parse(payload.pickupAt)); expect(Number.isFinite(Date.parse(order.placedAt))).toBe(true);
  expect(orderCount(f.customer.id)).toBe(1);
  expect(stored(order.orderId)).toMatchObject({ customer_id: f.customer.id, customer_name: customerName });
  expect(rows(`select * from public.order_items where order_id=${q(order.orderId)}`)).toHaveLength(2);
  profileName(f.customer.id, "Changed live customer");
  localSql(`update public.menu_items set name='Changed',price_cents=999,sold_out=true where cafe_id=${q(f.cafe)}; update public.cafes set name='Changed cafe',pickup_cutoff_minutes=180 where id=${q(f.cafe)}; delete from public.opening_hours where cafe_id=${q(f.cafe)};`);
  expect(await ownOrder(request, order.orderId)).toEqual(order);
  expect(stored(order.orderId).customer_name).toBe(customerName);
});
test("CUS-03.1: normalized replays and concurrent identical submissions create exactly one purchase", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload();
  const responses = await Promise.all([create(request, data), create(request, data)]);
  expect(responses.map(r => r.status()).sort()).toEqual([200, 201]);
  const orders = await Promise.all(responses.map(r => orderResponse(r, r.status())));
  expect(orders[0]).toEqual(orders[1]); expect(orderCount(f.customer.id)).toBe(1);
  expect(await orderResponse(await create(request, { ...data, items: [...data.items].reverse(), pickupAt: data.pickupAt.replace("Z", ".000Z") }), 200)).toEqual(orders[0]);
  await failure(await create(request, { ...data, expectedTotalCents: 1026 }), 409, "STATE_CONFLICT");
  expect(orderCount(f.customer.id)).toBe(1);
});
test("CUS-03.1: concurrent different content with one key creates one order and returns one conflict", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload();
  const responses = await Promise.all([create(request, data), create(request, { ...data, items: [{ itemId: f.item, quantity: 1 }], expectedTotalCents: 450 })]);
  expect(responses.map(r => r.status()).sort()).toEqual([201, 409]); expect(orderCount(f.customer.id)).toBe(1);
});
test("CUS-03.1 CUS-04.2: replay after cancellation retains its state and never revives the order", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload(); const order = await orderResponse(await create(request, data));
  const cancelled = await orderResponse(await cancel(request, order.orderId), 200);
  localSql(`update public.cafes set suspended=true where id=${q(f.cafe)};`);
  expect(await orderResponse(await create(request, data), 200)).toEqual(cancelled); expect(orderCount(f.customer.id)).toBe(1);
});
test("CUS-03.2: slots come from current hours, use a strict chronological grid and become stale after rule changes", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  const url = `/api/customer/cafes/${f.cafe}/pickup-slots`;
  const response = await request.get(url); expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
  const result = await response.json(); expect(result).toEqual({ requestId: expect.any(String), pickupSlots: expect.any(Array) });
  const slots: string[] = result.pickupSlots;
  expect(slots).toHaveLength(12); expect(slots.map(Date.parse)).toContain(Date.parse(f.pickupAt));
  expect(slots.map(Date.parse)).toEqual([...slots.map(Date.parse)].sort((a, b) => a - b));
  expect(slots.every(s => Date.parse(s) % (15 * 60_000) === 0)).toBe(true);
  localSql(`delete from public.opening_hours where cafe_id=${q(f.cafe)};`);
  await failure(await create(request, f.payload()), 409, "STATE_CONFLICT");
  expect((await (await request.get(url)).json()).pickupSlots).toEqual([]); expect(orderCount(f.customer.id)).toBe(0);
});
for (const [label, change, code] of [
  ["off-grid", { pickupAt: "2026-10-23T01:07:00Z" }, "INVALID_REQUEST"],
  ["seconds", { pickupAt: "2026-10-23T01:00:01Z" }, "INVALID_REQUEST"],
  ["past", { pickupAt: "2020-01-01T01:00:00Z" }, "INVALID_REQUEST"],
  ["beyond horizon", { pickupAt: "2099-01-01T01:00:00Z" }, "INVALID_REQUEST"],
  ["invalid date", { pickupAt: "2026-02-30T01:00:00Z" }, "INVALID_REQUEST"],
  ["non-UTC", { pickupAt: "2026-10-23T09:00:00+08:00" }, "INVALID_REQUEST"],
  ["price mismatch", { expectedTotalCents: 1 }, "STATE_CONFLICT"],
] as const) test(`CUS-03.2 CUS-03.6: ${label} creates no order`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  await failure(await create(request, f.payload(change)), code === "STATE_CONFLICT" ? 409 : 400, code); expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.2: slot inside the 15-minute database lead is invalid", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  const now = localSql("select to_char(date_trunc('hour',now()) + (floor(extract(minute from now())/15)::int+1)*interval '15 minutes','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"');");
  await failure(await create(request, f.payload({ pickupAt: now })), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
for (const quantity of [0, 21, 1.5, "2", null]) test(`CUS-03.8: invalid quantity ${JSON.stringify(quantity)} is rejected without mutation`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  await failure(await create(request, { ...f.payload(), items: [{ itemId: f.item, quantity }] }), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
for (const count of [0, 21]) test(`CUS-03.8: ${count} item lines violates the 1 to 20 bound`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  await failure(await create(request, f.payload({ items: Array.from({ length: count }, () => ({ itemId: randomUUID(), quantity: 1 })) })), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.1: inclusive maximum 20 distinct lines and quantity 20 can be purchased", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  const items = Array.from({ length: 20 }, (_, i) => ({ itemId: f.menu("coffee", false, `Bulk ${i}`, 1), quantity: 20 }));
  const order = await orderResponse(await create(request, f.payload({ items, expectedTotalCents: 400 })));
  expect(order.items).toHaveLength(20); expect(order.totalCents).toBe(400);
});
test("CUS-03.8: duplicate item references are rejected rather than merged", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  await failure(await create(request, f.payload({ items: [{ itemId: f.item, quantity: 1 }, { itemId: f.item, quantity: 1 }] })), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.3: stale approval or suspension denies new work with indistinguishable 404", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  for (const [state, suspended] of [["pending", false], ["rejected", false], ["approved", true]] as const) {
    localSql(`update public.cafes set application_state=${q(state)},suspended=${q(suspended)} where id=${q(f.cafe)};`);
    await failure(await create(request, f.payload()), 404, "NOT_FOUND");
    await failure(await request.get(`/api/customer/cafes/${f.cafe}/pickup-slots`), 404, "NOT_FOUND");
  } expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.4: absent, other-cafe and other-workspace items disclose nothing and persist no partial lines", async ({ request }) => {
  const f = fixture(); const foreign = fixture(); const other = f.cafeRecord(); const alien = randomUUID();
  localSql(`insert into public.menu_items(id,cafe_id,name,price_cents,drink_type,sold_out) values (${q(alien)},${q(other)},'Other cafe',450,'coffee',false);`);
  await login(request, f.customer);
  for (const itemId of [randomUUID(), foreign.item, alien]) await failure(await create(request, f.payload({ items: [{ itemId: f.item, quantity: 1 }, { itemId, quantity: 1 }] })), 404, "NOT_FOUND");
  for (const cafeId of [foreign.cafe, randomUUID()]) await failure(await create(request, f.payload({ cafeId })), 404, "NOT_FOUND");
  expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.1 CUS-03.6: sold-out and removed selections fail without consuming the submission key", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload();
  localSql(`update public.menu_items set sold_out=true where id=${q(f.item)};`); await failure(await create(request, data), 409, "STATE_CONFLICT");
  localSql(`update public.menu_items set sold_out=false where id=${q(f.item)};`);
  const order = await orderResponse(await create(request, data)); expect(orderCount(f.customer.id)).toBe(1);
  const removed = f.menu(); localSql(`delete from public.menu_items where id=${q(removed)};`);
  await failure(await create(request, f.payload({ items: [{ itemId: removed, quantity: 1 }], expectedTotalCents: 450 })), 404, "NOT_FOUND");
  expect(await ownOrder(request, order.orderId)).toEqual(order);
});
for (const extra of ["customerId", "workspaceId", "orderId", "customerName", "unitPriceCents", "state"]) test(`CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied ${extra} cannot extend the strict contract`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  await failure(await create(request, { ...f.payload(), [extra]: "forged" }), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.5: missing or invalid protected profile name conflicts without persisting order or key", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload();
  for (const name of [null, "", " ", "A", "a".repeat(101)]) {
    profileName(f.customer.id, name);
    const response = await create(request, data); await failure(response, 409, "STATE_CONFLICT");
    expect((await response.json()).error.message).toBe("Customer name is unavailable. Account setup must be completed before ordering.");
    expect(orderCount(f.customer.id)).toBe(0);
  }
  profileName(f.customer.id, customerName); await orderResponse(await create(request, data));
});
async function protectedOrderAccess(request: APIRequestContext, role: null | "owner" | "admin") {
  const f = fixture(); if (role) await login(request, role === "owner" ? f.owner : f.admin);
  const status = role ? 403 : 401, code = role ? "FORBIDDEN" : "UNAUTHENTICATED";
  for (const response of [await create(request, f.payload()), await request.get(base), await request.get(`${base}/${randomUUID()}`), await cancel(request, randomUUID()), await request.get(`/api/customer/cafes/${f.cafe}/pickup-slots`)]) await failure(response, status, code);
  expect(orderCount(f.customer.id)).toBe(0);
}
// Literal titles keep the existing role assertions visible to static traceability.
test("CUS-03.7 CUS-04.7: anonymous cannot create/read/cancel orders or read pickup slots", async ({ request }) => protectedOrderAccess(request, null));
test("CUS-03.7 CUS-04.7: owner cannot create/read/cancel orders or read pickup slots", async ({ request }) => protectedOrderAccess(request, "owner"));
test("CUS-03.7 CUS-04.7: admin cannot create/read/cancel orders or read pickup slots", async ({ request }) => protectedOrderAccess(request, "admin"));
test("CUS-03.1 CUS-03.5: the same submission key belongs independently to each verified customer", async ({ request, playwright }) => {
  const f = fixture(); const other = provisionAccount("customer", true); const peer = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.customer); const data = f.payload(); const first = await orderResponse(await create(request, data));
    // A separate kit cannot replay or learn the original order using its key.
    await login(peer, other); await failure(await create(peer, data), 404, "NOT_FOUND");
    expect(orderCount(f.customer.id)).toBe(1); expect(orderCount(other.id)).toBe(0); expect(await ownOrder(request, first.orderId)).toEqual(first);
  } finally { await peer.dispose(); }
});
