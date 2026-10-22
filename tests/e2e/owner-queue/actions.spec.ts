import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { act, base, customerName, failure, fixture, list, login, mutate, origin, ownerOrder, ownerWithoutCafe, page, q, reviewCount, seedReview, stored, unsafe, type Action } from "./fixtures";

const transitions: [Action, string, string, string][] = [
  ["accept", "pending", "accepted", "accepted_at"],
  ["reject", "pending", "rejected", "rejected_at"],
  ["ready", "accepted", "ready", "ready_at"],
  ["collect", "ready", "collected", "collected_at"],
];
const allStates = ["pending", "accepted", "ready", "collected", "rejected", "cancelled"] as const;

test("OWN-05.1: active queue defaults to pending/accepted/ready, 10 per page, ordered by pickup, placement then reference", async ({ request }) => {
  const f = fixture(); const foreign = fixture();
  const late = `${f.tomorrow.date}T03:00:00Z`; const early = `${f.tomorrow.date}T01:00:00Z`;
  const tied = Array.from({ length: 9 }, () => f.order("pending", early, "2026-01-01T00:00:00Z")).sort();
  const earlierPlaced = f.order("accepted", early, "2025-12-31T00:00:00Z");
  const later = f.order("ready", late);
  for (const state of ["collected", "rejected", "cancelled"] as const) f.order(state, early);
  foreign.order("pending", early);
  await login(request, f.owner);
  const first = await page(await list(request)); const second = await page(await list(request, "?page=2"));
  expect(first).toMatchObject({ page: 1, hasNextPage: true }); expect(second).toMatchObject({ page: 2, hasNextPage: false });
  expect([...first.items, ...second.items].map(o => o.orderId)).toEqual([earlierPlaced, ...tied, later]);
  expect(first.items.every(o => o.cafeId === f.cafe && o.customerName === customerName)).toBe(true);
  expect((await page(await list(request, "?view=active&filter=all"))).items.map(o => o.orderId)).toEqual(first.items.map(o => o.orderId));
  expect((await page(await list(request, "?page=99"))).items).toEqual([]);
});
test("OWN-05.1: state filters and the history view select exactly the specified states", async ({ request }) => {
  const f = fixture(); const ids = Object.fromEntries(allStates.map(state => [state, f.order(state)]));
  await login(request, f.owner);
  for (const filter of ["pending", "accepted", "ready"]) expect((await page(await list(request, `?view=active&filter=${filter}`))).items.map(o => o.orderId)).toEqual([ids[filter]]);
  expect((await page(await list(request, "?filter=pending"))).items.map(o => o.orderId)).toEqual([ids.pending]);
  for (const filter of ["cancelled", "rejected", "collected"]) expect((await page(await list(request, `?view=history&filter=${filter}`))).items.map(o => o.orderId)).toEqual([ids[filter]]);
  const history = (await page(await list(request, "?view=history"))).items.map(o => o.orderId).sort();
  expect(history).toEqual([ids.cancelled, ids.rejected, ids.collected].sort());
});
for (const query of ["?view=all", "?view=History", "?filter=collected", "?view=history&filter=pending", "?view=active&view=active", "?filter=all&filter=all", "?page=0", "?page=01", "?page=1.0", "?page=", "?state=pending", "?page=1&page=1"])
  test(`OWN-05.1: strict queue query ${query} is rejected with 400`, async ({ request }) => {
    const f = fixture(); await login(request, f.owner); await failure(await list(request, query), 400, "INVALID_REQUEST");
  });
test("OWN-05.1: projections keep retained snapshots, customer name and no private profile data after live menu and profile edits", async ({ request }) => {
  const f = fixture(); const id = f.order("pending"); await login(request, f.owner);
  const before = (await page(await list(request))).items[0];
  localSql(`update public.menu_items set name='Renamed live', price_cents=9999 where id=${q(f.item)}; update public.profiles set name='Renamed Customer' where id=${q(f.customer.id)};`);
  const after = (await page(await list(request))).items[0];
  expect(after).toEqual(before); expect(after.orderId).toBe(id); expect(after.customerName).toBe(customerName);
  expect(after.items).toEqual([{ itemId: f.item, name: unsafe, quantity: 2, unitPriceCents: 450, lineTotalCents: 900 }]);
  const raw = JSON.stringify(after); expect(raw).not.toContain(f.customer.email); expect(raw).not.toContain(f.customer.id);
});
test("OWN-05.2: accepting a pending order records one timestamp and preserves snapshots", async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner);
  const before = (await page(await list(request))).items[0];
  const accepted = await ownerOrder(await act(request, id, "accept"));
  expect(accepted).toEqual({ ...before, state: "accepted", acceptedAt: expect.any(String) });
  expect(Date.parse(accepted.acceptedAt!)).toBeGreaterThan(Date.parse(before.placedAt));
});
test("OWN-05.2: rejecting trims surrounding whitespace, preserves internal content and exposes the reason to the customer", async ({ request, playwright }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner);
  const reason = `  Out of  oat\tmilk ${unsafe}  `;
  const rejected = await ownerOrder(await act(request, id, "reject", { reason }));
  expect(rejected).toMatchObject({ state: "rejected", rejectionReason: reason.trim(), rejectedAt: expect.any(String), cancellationReason: null, acceptedAt: null });
  const customer = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(customer, f.customer);
    const own = await (await customer.get(`/api/customer/orders/${id}`)).json();
    expect(own.order.rejectionReason).toBe(reason.trim());
  } finally { await customer.dispose(); }
});
test("OWN-05.2: a reason of exactly 100 ECMAScript-whitespace words is accepted", async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner);
  const reason = Array.from({ length: 100 }, (_, i) => `w${i}`).join("  ");
  expect((await ownerOrder(await act(request, id, "reject", { reason }))).rejectionReason).toBe(reason);
});
for (const [label, data] of [
  ["blank reason", { reason: " 　\n\t " }], ["101 words", { reason: Array.from({ length: 101 }, () => "w").join(" ") }],
  ["missing reason", {}], ["non-string reason", { reason: 5 }], ["unknown key", { reason: "Late", extra: true }],
] as const) test(`OWN-05.2: rejection with ${label} gives 400 and changes nothing`, async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner); const before = stored(id);
  await failure(await act(request, id, "reject", data), 400, "INVALID_REQUEST"); expect(stored(id)).toEqual(before);
});
for (const action of ["accept", "ready", "collect"] as const) test(`OWN-05.2 OWN-05.3: ${action} cannot supply a rejection reason or other body`, async ({ request }) => {
  const f = fixture(); const id = f.order({ accept: "pending", ready: "accepted", collect: "ready" }[action] as "pending"); await login(request, f.owner);
  const before = stored(id);
  for (const data of [{ reason: "x" }, [], null, 5]) await failure(await act(request, id, action, data), 400, "INVALID_REQUEST");
  expect(stored(id)).toEqual(before);
});
test("OWN-05.3: accepted becomes ready, then ready becomes collected, retaining earlier timestamps and snapshots", async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner);
  const accepted = await ownerOrder(await act(request, id, "accept"));
  const ready = await ownerOrder(await act(request, id, "ready"));
  expect(ready).toEqual({ ...accepted, state: "ready", readyAt: expect.any(String) });
  const collected = await ownerOrder(await act(request, id, "collect"));
  expect(collected).toEqual({ ...ready, state: "collected", collectedAt: expect.any(String) });
  expect(Date.parse(collected.collectedAt!)).toBeGreaterThanOrEqual(Date.parse(ready.readyAt!));
});
for (const [action, allowed] of transitions) for (const state of allStates.filter(s => s !== allowed))
  test(`OWN-05.4: ${action} on a ${state} order gives 409 and changes nothing`, async ({ request }) => {
    const f = fixture(); const id = f.order(state); await login(request, f.owner); const before = stored(id);
    await failure(await act(request, id, action), 409, "STATE_CONFLICT"); expect(stored(id)).toEqual(before);
  });
test("OWN-05.4: repeated transitions conflict without moving the recorded timestamp", async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner);
  await ownerOrder(await act(request, id, "accept")); const after = stored(id);
  await failure(await act(request, id, "accept"), 409, "STATE_CONFLICT"); expect(stored(id)).toEqual(after);
});
test("OWN-05.5: concurrent customer cancellation and owner acceptance admit exactly one pending transition", async ({ request, playwright }) => {
  const f = fixture(); const customer = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.owner); await login(customer, f.customer);
    for (let round = 0; round < 3; round++) {
      const id = f.order();
      const [accepted, cancelled] = await Promise.all([act(request, id, "accept"), customer.post(`/api/customer/orders/${id}/cancel`, { headers: { origin }, data: {} })]);
      expect([accepted.status(), cancelled.status()].sort()).toEqual([200, 409]);
      await failure(accepted.status() === 409 ? accepted : cancelled, 409, "STATE_CONFLICT");
      const row = stored(id);
      expect(row.state).toBe(accepted.status() === 200 ? "accepted" : "cancelled");
      expect(row.accepted_at === null || row.cancelled_at === null).toBe(true);
    }
  } finally { await customer.dispose(); }
});
test("OWN-05.6: collection before suspension is preserved; un-suspension changes nothing", async ({ request, playwright }) => {
  const f = fixture(); const id = f.order("ready"); const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.owner); await login(admin, f.admin);
    await ownerOrder(await act(request, id, "collect"));
    expect((await mutate(admin, f.cafe, "suspension")).status()).toBe(200);
    expect(stored(id).state).toBe("collected"); const kept = stored(id);
    expect((await mutate(admin, f.cafe, "suspension", { suspended: false, reason: "Resolved" })).status()).toBe(200);
    expect(stored(id)).toEqual(kept);
  } finally { await admin.dispose(); }
});
test("OWN-05.6: suspension before collection cancels the order, collection conflicts and un-suspension never revives", async ({ request, playwright }) => {
  const f = fixture(); const id = f.order("ready"); const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.owner); await login(admin, f.admin);
    expect((await mutate(admin, f.cafe, "suspension")).status()).toBe(200);
    const cancelled = stored(id); expect(cancelled).toMatchObject({ state: "cancelled", cancellation_reason: "Cafe is suspended" });
    await failure(await act(request, id, "collect"), 409, "STATE_CONFLICT"); expect(stored(id)).toEqual(cancelled);
    // Suspension preserves owner read access to retained orders.
    expect((await page(await list(request, "?view=history&filter=cancelled"))).items.map(o => o.orderId)).toEqual([id]);
    expect((await mutate(admin, f.cafe, "suspension", { suspended: false, reason: "Resolved" })).status()).toBe(200);
    expect(stored(id)).toEqual(cancelled);
  } finally { await admin.dispose(); }
});
test("OWN-05.6: concurrent collection and suspension yield either collected or cancelled with a collection conflict", async ({ request, playwright }) => {
  const f = fixture(); const id = f.order("ready"); const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.owner); await login(admin, f.admin);
    const [collected, suspended] = await Promise.all([act(request, id, "collect"), mutate(admin, f.cafe, "suspension")]);
    expect(suspended.status()).toBe(200);
    if (collected.status() === 200) expect(stored(id).state).toBe("collected");
    else { await failure(collected, 409, "STATE_CONFLICT"); expect(stored(id)).toMatchObject({ state: "cancelled", collected_at: null }); }
  } finally { await admin.dispose(); }
});
test("OWN-05.8: no session gives 401 and wrong roles give 403 for reads and actions without change", async ({ request }) => {
  const f = fixture(); const id = f.order(); const before = stored(id);
  await failure(await list(request), 401, "UNAUTHENTICATED"); await failure(await act(request, id, "accept"), 401, "UNAUTHENTICATED");
  for (const actor of [f.customer, f.admin]) {
    await login(request, actor);
    await failure(await list(request), 403, "FORBIDDEN"); await failure(await act(request, id, "accept"), 403, "FORBIDDEN");
    expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
  }
  expect(stored(id)).toEqual(before);
});
test("OWN-05.8 OWN-05.10: missing, same-workspace other-café, main and other-kit orders share one 404 without change", async ({ request }) => {
  const f = fixture(); const otherOwnerCafe = fixture(); const main = fixture(true);
  // A second café in the same kit workspace, owned by a different owner.
  const sameWorkspace = randomUUID(); const peer = ownerWithoutCafe(f.owner.workspaceId);
  localSql(`insert into public.cafes(id,workspace_id,owner_id,name,application_state,suspended) values (${q(sameWorkspace)},${q(f.owner.workspaceId)},${q(peer.id)},'Peer café','approved',false);`);
  const peerOrder = randomUUID();
  localSql(`insert into public.orders(id,cafe_id,customer_id,state,cafe_name,customer_name,pickup_at,total_cents) values (${q(peerOrder)},${q(sameWorkspace)},${q(f.customer.id)},'pending','Peer café',${q(customerName)},${q(f.pickupAt)},0);`);
  const targets = [peerOrder, otherOwnerCafe.order(), main.order(), randomUUID()];
  await login(request, f.owner);
  for (const id of targets) for (const action of ["accept", "reject", "ready", "collect"] as const) {
    const before = localSql(`select coalesce((select row_to_json(o)::text from public.orders o where id::text=${q(id)}),'none');`);
    await failure(await act(request, id, action), 404, "NOT_FOUND");
    expect(localSql(`select coalesce((select row_to_json(o)::text from public.orders o where id::text=${q(id)}),'none');`)).toBe(before);
  }
  const queue = JSON.stringify((await page(await list(request))).items);
  for (const id of targets) expect(queue).not.toContain(id);
});
test("OWN-05.8: invalid references, foreign origins and non-JSON bodies fail before any change", async ({ request }) => {
  const f = fixture(); const id = f.order(); await login(request, f.owner); const before = stored(id);
  await failure(await act(request, "x".repeat(129), "accept"), 400, "INVALID_REQUEST");
  await failure(await request.post(`${base}/${id}/accept`, { headers: { origin: "https://evil.example" }, data: {} }), 403, "FORBIDDEN");
  await failure(await request.post(`${base}/${id}/accept`, { data: {} }), 403, "FORBIDDEN");
  await failure(await request.post(`${base}/${id}/accept`, { headers: { origin, "content-type": "text/plain" }, data: "{}" }), 415, "UNSUPPORTED_MEDIA_TYPE");
  await failure(await request.post(`${base}/${id}/accept`, { headers: { origin, "content-type": "application/json" }, data: "{" }), 400, "INVALID_REQUEST");
  const get = await request.get(`${base}/${id}/accept`); expect(get.status()).toBe(405); expect(get.headers().allow).toContain("POST");
  const post = await request.post(base, { headers: { origin }, data: {} }); expect(post.status()).toBe(405); expect(post.headers().allow).toContain("GET");
  expect(stored(id)).toEqual(before);
});
test("OWN-05.1 OWN-05.7: an owner without a café gets an empty successful page, not a failure", async ({ request }) => {
  const f = fixture(); const owner = ownerWithoutCafe(f.owner.workspaceId); await login(request, owner);
  expect(await page(await list(request))).toMatchObject({ items: [], page: 1, hasNextPage: false });
  await failure(await act(request, f.order(), "accept"), 404, "NOT_FOUND");
});
test("OWN-05.9: collecting neither creates nor alters a review, and the stored state is collected", async ({ request }) => {
  const f = fixture(); const id = f.order("ready"); const other = f.order("collected"); const review = seedReview(other, f.customer.id);
  const reviewBefore = localSql(`select row_to_json(r)::text from public.reviews r where id=${q(review)};`);
  await login(request, f.owner);
  await ownerOrder(await act(request, id, "collect"));
  expect(stored(id).state).toBe("collected"); expect(reviewCount(id)).toBe(0);
  expect(localSql(`select row_to_json(r)::text from public.reviews r where id=${q(review)};`)).toBe(reviewBefore);
});
test("OWN-05.10: a demo-kit owner acts only inside its kit and main owners cannot see kit orders", async ({ request }) => {
  const kit = fixture(); const main = fixture(true); const kitOrder = kit.order(); const mainOrder = main.order();
  await login(request, kit.owner);
  expect((await page(await list(request))).items.map(o => o.orderId)).toEqual([kitOrder]);
  await ownerOrder(await act(request, kitOrder, "accept"));
  await failure(await act(request, mainOrder, "accept"), 404, "NOT_FOUND");
  expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
  await login(request, main.owner);
  expect((await page(await list(request))).items.map(o => o.orderId)).toEqual([mainOrder]);
  expect(stored(mainOrder).state).toBe("pending");
});
test("OWN-05.8 OWN-05.10: a fresh demo-kit owner without a café sees no main-workspace or other-kit orders", async ({ request }) => {
  fixture(true).order(); fixture().order();
  await login(request, provisionAccount("owner", true));
  expect((await page(await list(request))).items).toEqual([]);
});
