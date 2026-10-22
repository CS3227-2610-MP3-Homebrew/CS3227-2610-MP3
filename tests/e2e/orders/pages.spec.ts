import { expect, test } from "@playwright/test";
import { mutate } from "../cafe-eligibility/helpers";
import { localSql } from "../accounts/local";
import { base, fixture, history, login, origin, publicReason, q, unsafe } from "./fixtures";

test.use({ timezoneId: "America/Los_Angeles" });

test("CUS-03.1 CUS-03.2 CUS-03.6 CUS-04.1 CUS-04.2: customer selects drinks and Singapore pickup, pays at pickup and cancels from My orders", async ({ page }) => {
  const f = fixture(); const sold = f.menu("tea", true, "Sold out drink", 1);
  const external: string[] = [];
  page.on("request", r => { const url = new URL(r.url()); if (!new Set(["127.0.0.1", "localhost"]).has(url.hostname) || /\/api\/ai\//.test(url.pathname)) external.push(r.url()); });
  await login(page.request, f.customer); await page.goto(`/customer/cafes/${f.cafe}/pre-order`);
  await expect(page.getByRole("heading", { name: /pre-order/i })).toBeVisible();
  await expect(page.getByText(/pay(?:ment)?\s+(?:at|on)\s+pickup/i)).toBeVisible();
  // Controls use accessible item names; the sold-out item cannot be selected.
  await page.getByRole("spinbutton", { name: /Tea/ }).fill("2");
  const pickup = page.getByRole("combobox", { name: /pickup/i });
  await expect(pickup).toBeVisible();
  const nineAM = pickup.locator("option").filter({ hasText: /09:00|9:00\s*AM/i }).first();
  await expect(nineAM).toHaveCount(1);
  const value = await nineAM.getAttribute("value"); expect(value).toBeTruthy(); await pickup.selectOption(value!);
  await expect(page.getByText("S$2.50", { exact: false }).first()).toBeVisible();
  const submitted = page.waitForResponse(r => new URL(r.url()).pathname === base && r.request().method() === "POST");
  await page.getByRole("button", { name: /place.*(?:pre-)?order|submit.*order/i }).click();
  expect((await submitted).status()).toBe(201);
  await page.goto("/customer/orders");
  await expect(page.getByText("S$2.50", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/SGT|Singapore/).first()).toBeVisible();
  const orders = await (await page.request.get(base)).json(); expect(orders.items).toHaveLength(1);
  expect(Date.parse(orders.items[0].pickupAt)).toBe(Date.parse(f.pickupAt));
  expect(orders.items[0].items).toEqual([{ itemId: f.second, name: "Tea", quantity: 2, unitPriceCents: 125, lineTotalCents: 250 }]);
  expect(orders.items[0].items.map((i: { itemId: string }) => i.itemId)).not.toContain(sold);
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByText(/^cancelled$/i)).toBeVisible();
  expect(external).toEqual([]);
});
test("CUS-04.1 CUS-04.3 CUS-04.5: suspended history and owner rejection render inert reasons, exact dollars and retained timestamps", async ({ page, playwright }) => {
  const f = fixture(); const pending = history(f); const accepted = history(f, "accepted"); const collected = history(f, "collected"); const rejected = history(f, "rejected");
  const admin = await playwright.request.newContext({ baseURL: origin });
  const privateReason = "PRIVATE ADMIN EXPLANATION";
  try {
    await login(admin, f.admin); expect((await mutate(admin, f.cafe, "suspension", { suspended: true, reason: privateReason })).status()).toBe(200);
    await login(page.request, f.customer); await page.goto("/customer/orders");
    await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible();
    await expect(page.getByText(publicReason, { exact: true })).toHaveCount(2);
    expect(await page.locator("body").textContent()).toContain(unsafe);
    await expect(page.locator("img[src=x]")).toHaveCount(0);
    expect(await page.evaluate(() => Boolean((window as unknown as { orderExecuted?: boolean }).orderExecuted))).toBe(false);
    expect(await page.locator("body").textContent()).not.toContain(privateReason);
    await expect(page.getByText("S$9.00", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("S$4.50", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/1 Jan(?:uary)? 2026|01\/01\/2026/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toHaveCount(0);
    const response = await page.request.get(base); const body = await response.json();
    expect(body.items.map((o: { orderId: string }) => o.orderId).sort()).toEqual([pending, accepted, collected, rejected].sort());
    expect(body.items.find((o: { orderId: string }) => o.orderId === collected).collectedAt).not.toBeNull();
    // Check the rendered lifecycle against the authorized projection, including
    // retained acceptance timestamps after suspension. Same-page delivery is
    // exercised separately by the OrderList rerender regressions.
    for (const order of body.items) {
      const article = page.getByRole("article").filter({ has: page.getByText(`Order ${order.orderId}`, { exact: true }) });
      await expect(article.getByRole("heading", { name: f.name, exact: true })).toBeVisible();
      await expect(article.getByText(unsafe, { exact: true })).toBeVisible();
      await expect(article.getByText("2 × S$4.50 each", { exact: true })).toBeVisible();
      await expect(article.getByText("Total: S$9.00", { exact: true })).toBeVisible();
      await expect(article.getByText(order.state, { exact: true })).toBeVisible();
      const instants = [order.placedAt, order.pickupAt, order.acceptedAt, order.readyAt, order.collectedAt, order.rejectedAt, order.cancelledAt].filter(Boolean);
      expect(await article.locator("time").evaluateAll(nodes => nodes.map(node => node.getAttribute("datetime")))).toEqual(instants);
      await expect(article.getByRole("link", { name: "Review order" })).toHaveCount(order.orderId === collected ? 1 : 0);
      await expect(article.getByText(publicReason, { exact: true })).toHaveCount([pending, accepted].includes(order.orderId) ? 1 : 0);
      await expect(article.getByText(`Rejection reason: ${unsafe}`, { exact: true })).toHaveCount(order.orderId === rejected ? 1 : 0);
    }
  } finally { await admin.dispose(); }
});
test("CUS-03.2: no valid pickup slots prevents a purchase and explains unavailable choices", async ({ page }) => {
  const f = fixture(); localSql(`delete from public.opening_hours where cafe_id=${q(f.cafe)};`);
  await login(page.request, f.customer); await page.goto(`/customer/cafes/${f.cafe}/pre-order`);
  await expect(page.getByText(/no.*(?:pickup|slot)|(?:pickup|slot).*unavailable/i)).toBeVisible();
  const submit = page.getByRole("button", { name: /place.*(?:pre-)?order|submit.*order/i });
  if (await submit.count()) await expect(submit).toBeDisabled();
  expect((await (await page.request.get(base)).json()).items).toEqual([]);
});
test("CUS-04.1: empty My orders provides an explicit empty state", async ({ page }) => {
  const f = fixture(); await login(page.request, f.customer); await page.goto("/customer/orders");
  await expect(page.getByText(/no orders|no.*orders yet|haven.t.*orders/i)).toBeVisible();
});

test('CUS-04.1 CUS-04.2: All Active and Past filter full history before pagination and cancellation refreshes Active', async ({ page }) => {
  test.setTimeout(60_000);
  const f = fixture();
  const pending = history(f, 'pending'); const accepted = history(f, 'accepted'); const ready = history(f, 'ready');
  localSql(`insert into public.orders(id,cafe_id,customer_id,state,placed_at,pickup_at,cafe_name,customer_name,total_cents,currency)
    select gen_random_uuid(),${q(f.cafe)},${q(f.customer.id)},
      (case when g%3=0 then 'cancelled' when g%3=1 then 'collected' else 'rejected' end)::public.order_state,
      '2026-02-01T00:00:00Z'::timestamptz+g*interval '1 second',${q(f.pickupAt)},${q(f.name)},'Synthetic filter customer',0,'SGD'
    from generate_series(1,21) g;
    insert into public.orders(id,cafe_id,customer_id,state,cafe_name,customer_name)
    values(gen_random_uuid(),${q(f.cafe)},${q(f.reader.id)},'pending','OTHER CUSTOMER ORDER','Other customer');`);
  await login(page.request, f.customer); await page.goto('/customer/orders');
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.getByText(`Order ${pending}`, { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Active orders', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  for (const id of [pending, accepted, ready]) await expect(page.getByText(`Order ${id}`, { exact: true })).toBeVisible();
  await expect(page.getByText('OTHER CUSTOMER ORDER', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await expect(page.getByText(`Order ${pending}`, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('link', { name: 'Past orders', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  const states = await page.locator('article > header > p').allTextContents();
  expect(states.every(state => ['collected','rejected','cancelled'].includes(state))).toBe(true);
  await page.getByRole('link', { name: 'Next orders', exact: true }).click();
  await expect(page).toHaveURL(/view=past&page=2/); await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByText(`Order ${pending}`, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Active orders', exact: true }).click();
  await expect(page).toHaveURL(/view=active$/); await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('link', { name: 'All', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
});

test('CUS-04.1: empty Active and Past views and invalid browser filters are explicit', async ({ page }) => {
  const f = fixture(); await login(page.request, f.customer); await page.goto('/customer/orders');
  await page.getByRole('link', { name: 'Active orders', exact: true }).click(); await expect(page.getByText('No active orders.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Past orders', exact: true }).click(); await expect(page.getByText('No past orders.', { exact: true })).toBeVisible();
  for (const query of ['view=unknown', 'view=active&view=past', 'view=active&page=0']) {
    await page.goto(`/customer/orders?${query}`); await expect(page.getByRole('main').getByRole('alert')).toHaveText('Invalid orders page.');
  }
});
