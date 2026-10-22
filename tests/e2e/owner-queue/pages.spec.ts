import { expect, test } from "@playwright/test";
import { localSql } from "../accounts/local";
import { base, conflictMessage, customerName, fixture, login, ownerWithoutCafe, q, stored, unsafe } from "./fixtures";

test("OWN-05.1 OWN-05.2 OWN-05.3: owner sees labelled active orders and moves one through accept, ready and collect", async ({ page }) => {
  const f = fixture(); const id = f.order();
  await login(page.request, f.owner); await page.goto("/owner/orders");
  await expect(page.getByRole("heading", { name: /order queue/i })).toBeVisible();
  const card = page.getByRole("article").filter({ hasText: customerName });
  await expect(card.getByText(/^New$/)).toBeVisible();
  await expect(card.getByText("S$9.00", { exact: false })).toBeVisible();
  // Retained item names render as inert text.
  await expect(card.getByText(unsafe)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { orderExecuted?: boolean }).orderExecuted)).toBeUndefined();
  await card.getByRole("button", { name: /^accept/i }).click();
  await expect(card.getByText(/^Accepted$/)).toBeVisible();
  await card.getByRole("button", { name: /mark.*ready/i }).click();
  await expect(card.getByText(/^Ready for pick up$/)).toBeVisible();
  await card.getByRole("button", { name: /mark.*collected/i }).click();
  await expect(page.getByRole("article").filter({ hasText: customerName })).toHaveCount(0);
  expect(stored(id).state).toBe("collected");
  await page.goto("/owner/orders?view=history");
  await expect(page.getByRole("article").filter({ hasText: customerName }).getByText(/^Completed$/)).toBeVisible();
});
test("OWN-05.2: rejecting from the queue requires a reason and shows it as inert text in history", async ({ page }) => {
  const f = fixture(); const id = f.order();
  await login(page.request, f.owner); await page.goto("/owner/orders");
  const card = page.getByRole("article").filter({ hasText: customerName });
  await card.getByRole("button", { name: /^reject/i }).click();
  const reason = page.getByRole("textbox", { name: /reason/i }); await expect(reason).toBeVisible();
  await reason.fill(`Out of beans ${unsafe}`);
  await page.getByRole("button", { name: /confirm reject|reject order/i }).click();
  await expect.poll(() => stored(id).state).toBe("rejected");
  await page.goto("/owner/orders?view=history&filter=rejected");
  await expect(page.getByText(`Out of beans ${unsafe}`)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { orderExecuted?: boolean }).orderExecuted)).toBeUndefined();
});
test("OWN-05.4: a stale action announces the conflict message and reloads the current state", async ({ page }) => {
  const f = fixture(); const id = f.order();
  await login(page.request, f.owner); await page.goto("/owner/orders");
  localSql(`update public.orders set state='cancelled', cancelled_at=now() where id=${q(id)};`);
  await page.getByRole("article").filter({ hasText: customerName }).getByRole("button", { name: /^accept/i }).click();
  await expect(page.getByText(conflictMessage)).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: customerName })).toHaveCount(0);
  expect(stored(id).state).toBe("cancelled");
});
test("OWN-05.1: an owner without a café gets an empty state with an application call to action", async ({ page }) => {
  const f = fixture(); await login(page.request, ownerWithoutCafe(f.owner.workspaceId));
  await page.goto("/owner/orders");
  await expect(page.getByRole("main").getByRole("link", { name: /appl/i })).toHaveAttribute("href", /\/owner\/application/);
});
test("OWN-05.1: history filters are exposed for each terminal state", async ({ page }) => {
  const f = fixture(); for (const state of ["collected", "rejected", "cancelled"] as const) f.order(state);
  await login(page.request, f.owner); await page.goto("/owner/orders?view=history");
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.goto("/owner/orders?view=history&filter=cancelled");
  await expect(page.getByRole("article")).toHaveCount(1);
  expect((await page.request.get(`${base}?view=history`)).status()).toBe(200);
});
