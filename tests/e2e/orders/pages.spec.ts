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
