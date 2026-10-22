import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { mutate } from "../cafe-eligibility/helpers";
import { base, cancel, create, failure, fixture, history, login, orderCount, orderResponse, origin, ownOrder, publicReason, q, stored } from "./fixtures";

test("CUS-04.1: own snapshot history paginates 20 by placement descending then reference, with exact projection", async ({ request }) => {
  const f = fixture(); const foreign = fixture();
  const tied = Array.from({ length: 21 }, () => history(f)); const newest = history(f, "collected", "2026-02-01T00:00:00Z"); history(foreign);
  await login(request, f.customer);
  const a = await request.get(base); expect(a.status()).toBe(200); const first = await a.json();
  const b = await request.get(`${base}?page=2`); expect(b.status()).toBe(200); const second = await b.json();
  expect(first).toEqual({ requestId: expect.any(String), items: expect.any(Array), page: 1, pageSize: 20, hasNextPage: true });
  expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(2); expect(second.pageSize).toBe(20); expect(second.hasNextPage).toBe(false);
  expect([...first.items, ...second.items].map(o => o.orderId)).toEqual([newest, ...tied.sort()]);
  expect(first.items[0]).toEqual(await ownOrder(request, newest));
  expect((await (await request.get(`${base}?page=999`)).json()).items).toEqual([]);
});
test("CUS-04.1: an empty own collection is a successful empty page", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const response = await request.get(base); expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ requestId: expect.any(String), items: [], page: 1, pageSize: 20, hasNextPage: false });
});
test("CUS-04.2: pending cancellation retains items, sets one server timestamp and no suspension reason", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const initial = await orderResponse(await create(request, f.payload()));
  const cancelled = await orderResponse(await cancel(request, initial.orderId), 200);
  expect(cancelled).toEqual({ ...initial, state: "cancelled", cancellationReason: null, cancelledAt: expect.any(String) });
  expect(Date.parse(cancelled.cancelledAt!)).toBeGreaterThanOrEqual(Date.parse(initial.placedAt));
  expect(await ownOrder(request, initial.orderId)).toEqual(cancelled); expect(orderCount(f.customer.id)).toBe(1);
});
for (const state of ["accepted", "ready", "collected", "rejected", "cancelled"] as const) test(`CUS-04.3: ${state} cannot be manually cancelled, including a repeat`, async ({ request }) => {
  const f = fixture(); const id = history(f, state); await login(request, f.customer); const before = stored(id);
  await failure(await cancel(request, id), 409, "STATE_CONFLICT"); expect(stored(id)).toEqual(before);
  expect((await ownOrder(request, id)).state).toBe(state);
});
test("CUS-04.2: simultaneous duplicate cancellations admit exactly one pending transition", async ({ request }) => {
  const f = fixture(); const id = history(f); await login(request, f.customer);
  const responses = await Promise.all([cancel(request, id), cancel(request, id)]);
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
  await failure(responses.find(r => r.status() === 409)!, 409, "STATE_CONFLICT");
  expect((await ownOrder(request, id)).state).toBe("cancelled");
});
test("CUS-04.4 CUS-04.6: missing, same-workspace foreign, main and other-kit orders share the 404 boundary", async ({ request, playwright }) => {
  const f = fixture(); const own = history(f); const otherKit = fixture(); const kitOrder = history(otherKit); const main = fixture(true); const mainOrder = history(main);
  const peer = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(request, f.reader); await login(peer, f.customer);
    for (const id of [own, kitOrder, mainOrder, randomUUID()]) {
      const before = stored(id);
      await failure(await request.get(`${base}/${id}`), 404, "NOT_FOUND"); await failure(await cancel(request, id), 404, "NOT_FOUND");
      expect(stored(id)).toEqual(before);
    }
    expect((await ownOrder(peer, own)).orderId).toBe(own);
    await orderResponse(await cancel(peer, own), 200);
    // SYS-02's active-account conflict forbids replacing this reader session.
    expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
    await login(request, main.customer); await failure(await request.get(`${base}/${own}`), 404, "NOT_FOUND");
    await failure(await cancel(request, own), 404, "NOT_FOUND");
  } finally { await peer.dispose(); }
});
test("CUS-04.5: actual authorized suspension cancels outstanding own history, preserves terminal purchases and never revives", async ({ request, playwright }) => {
  const f = fixture(); const states = ["pending", "accepted", "ready", "collected", "rejected", "cancelled"] as const;
  const ids = states.map(state => history(f, state)); const before = ids.map(stored);
  const admin = await playwright.request.newContext({ baseURL: origin });
  const privateReason = `PRIVATE ADMIN ${randomUUID()}`;
  try {
    await login(request, f.customer); await login(admin, f.admin);
    expect((await mutate(admin, f.cafe, "suspension", { suspended: true, reason: privateReason })).status()).toBe(200);
    for (let i = 0; i < ids.length; i++) {
      const order = await ownOrder(request, ids[i]);
      if (i < 3) { expect(order.state).toBe("cancelled"); expect(order.cancellationReason).toBe(publicReason); expect(order.cancelledAt).not.toBeNull(); }
      else expect(stored(ids[i])).toEqual(before[i]);
      expect(JSON.stringify(order)).not.toContain(privateReason);
      await failure(await cancel(request, ids[i]), 409, "STATE_CONFLICT");
    }
    const list = await request.get(base); expect(list.status()).toBe(200); const body = await list.json();
    expect(body.items).toHaveLength(6); expect(JSON.stringify(body)).not.toContain(privateReason);
    const suspended = ids.map(stored);
    expect((await mutate(admin, f.cafe, "suspension", { suspended: false, reason: privateReason })).status()).toBe(200);
    expect(ids.map(stored)).toEqual(suspended);
    // No Customer/queue writer is granted by these administrator effects.
    expect((await ownOrder(request, ids[3])).state).toBe("collected");
  } finally { await admin.dispose(); }
});
test("CUS-03.1 CUS-03.3 CUS-04.5: concurrent creation and real suspension leave no outstanding order", async ({ request, playwright }) => {
  const f = fixture(); await login(request, f.customer); const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(admin, f.admin);
    const [created, suspended] = await Promise.all([create(request, f.payload()), mutate(admin, f.cafe, "suspension")]);
    expect(suspended.status()).toBe(200); expect([201, 404]).toContain(created.status());
    if (created.status() === 201) {
      const order = await orderResponse(created); expect(await ownOrder(request, order.orderId)).toMatchObject({ state: "cancelled", cancellationReason: publicReason });
    } else { await failure(created, 404, "NOT_FOUND"); expect(orderCount(f.customer.id)).toBe(0); }
    expect(localSql(`select count(*) from public.orders where cafe_id=${q(f.cafe)} and state in ('pending','accepted','ready');`)).toBe("0");
  } finally { await admin.dispose(); }
});
test("CUS-03.1: a submission key replay from another customer in the same workspace cannot disclose the order", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload(); const original = await orderResponse(await create(request, data));
  // Reader is a second verified customer, with its own independent key scope.
  const { profileName, customerName } = await import("./fixtures"); profileName(f.reader.id, customerName);
  // Start a new session before testing the second customer's independent key.
  expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
  await login(request, f.reader); const second = await orderResponse(await create(request, data));
  expect(second.orderId).not.toBe(original.orderId); expect(orderCount(f.customer.id)).toBe(1); expect(orderCount(f.reader.id)).toBe(1);
  await failure(await request.get(`${base}/${original.orderId}`), 404, "NOT_FOUND");
});
test("CUS-04.7: wrong-role callers cannot obtain order pages with protected snapshot content", async ({ page }) => {
  const f = fixture(); const id = history(f, "rejected"); const marker = `PROTECTED ORDER ${id}`;
  localSql(`update public.orders set cafe_name=${q(marker)} where id=${q(id)};`);
  for (const role of [null, "owner", "admin"] as const) {
    await page.context().clearCookies(); if (role) await login(page.request, provisionAccount(role, true));
    for (const path of ["/customer/orders", `/customer/cafes/${f.cafe}/pre-order`]) {
      const raw = await page.request.get(path); expect(await raw.text()).not.toContain(marker);
      await page.goto(path); await expect(page.getByText(marker)).toHaveCount(0);
    }
  }
});
