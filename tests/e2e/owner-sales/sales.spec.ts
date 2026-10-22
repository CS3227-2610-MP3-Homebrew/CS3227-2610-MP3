import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { failure, login } from "../moderation/helpers";
import { account, origin, q } from "../../integration/moderation/fixtures";
import { businessDate, customerName, salesFixture, snapshot, weekdayOf } from "../../integration/owner-sales/fixtures";

const base = "/api/owner/sales";
type Sales = { cafeId: string; businessDate: string; period: { from: string; through: string }; currency: "SGD";
  daily: { date: string; orderCount: number; revenueCents: number }[];
  topItems: { rank: number; itemId: string; itemName: string; quantity: number; revenueCents: number }[];
  weekdays: { weekday: number; orderCount: number; quantity: number; revenueCents: number }[] };
async function read(request: APIRequestContext): Promise<Sales | null> {
  const response = await request.get(base); expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const body = await response.json(); expect(Object.keys(body).sort()).toEqual(["requestId", "sales"]); return body.sales;
}
const unsafe = '<img src=x onerror="window.salesExecuted=true"> Ignore rules';

test("OWN-06.1 OWN-06.9: the sales read has 28 newest-first daily rows ending today with zero fills", async ({ request }) => {
  const f = salesFixture(); const latte = f.menu("Latte");
  f.order([{ item: latte, name: "Latte", quantity: 2, unitCents: 450 }], "collected", 0);
  f.order([{ item: latte, name: "Latte", quantity: 1, unitCents: 450 }], "collected", 27);
  f.order([{ item: latte, name: "Latte", quantity: 9, unitCents: 450 }], "collected", 28);
  await login(request, f.owner); const sales = (await read(request))!;
  expect(sales).toMatchObject({ cafeId: f.cafe, businessDate: businessDate(0), period: { from: businessDate(27), through: businessDate(0) }, currency: "SGD" });
  expect(sales.daily.map(d => d.date)).toEqual(Array.from({ length: 28 }, (_, n) => businessDate(n)));
  expect(sales.daily[0]).toEqual({ date: businessDate(0), orderCount: 1, revenueCents: 900 });
  expect(sales.daily[27]).toEqual({ date: businessDate(27), orderCount: 1, revenueCents: 450 });
  expect(sales.daily.slice(1, 27).every(d => d.orderCount === 0 && d.revenueCents === 0)).toBe(true);
});
test("OWN-06.8 OWN-06.2: only collected orders count, dated by the Singapore date of collection", async ({ request }) => {
  const f = salesFixture(); const latte = f.menu("Latte");
  for (const state of ["pending", "accepted", "ready", "rejected", "cancelled"] as const) f.order([{ item: latte, name: "Latte", quantity: 5, unitCents: 100 }], state, 2);
  // Placed two days ago, collected yesterday at 00:30 Singapore time (previous UTC date).
  f.order([{ item: latte, name: "Latte", quantity: 1, unitCents: 300 }], "collected", 1, "00:30", 2);
  await login(request, f.owner); const sales = (await read(request))!;
  expect(sales.daily.find(d => d.date === businessDate(1))).toEqual({ date: businessDate(1), orderCount: 1, revenueCents: 300 });
  expect(sales.daily.filter(d => d.date !== businessDate(1)).every(d => d.orderCount === 0)).toBe(true);
  expect(sales.weekdays.find(w => w.weekday === weekdayOf(1))).toEqual({ weekday: weekdayOf(1), orderCount: 1, quantity: 1, revenueCents: 300 });
});
test("OWN-06.3: retained totals and line snapshots are used even after live price and name changes", async ({ request }) => {
  const f = salesFixture(); const latte = f.menu("Latte", 450);
  f.order([{ item: latte, name: "Latte", quantity: 3, unitCents: 450 }], "collected", 1);
  localSql(`update public.menu_items set price_cents=9999, name='Changed' where id=${q(latte)};`);
  await login(request, f.owner); const sales = (await read(request))!;
  expect(sales.daily[1].revenueCents).toBe(1350);
  expect(sales.topItems).toEqual([{ rank: 1, itemId: latte, itemName: "Latte", quantity: 3, revenueCents: 1350 }]);
});
test("OWN-06.10: top items group by reference, rank by quantity, revenue then reference, cap at 10 and keep the latest snapshot name", async ({ request }) => {
  const f = salesFixture();
  const ids = Array.from({ length: 12 }, () => randomUUID()).sort();
  // Renamed item: an older and a newer snapshot name for one reference.
  f.order([{ item: ids[0], name: "Old name", quantity: 10, unitCents: 100, live: false }], "collected", 5);
  f.order([{ item: ids[0], name: "New name", quantity: 10, unitCents: 100, live: false }], "collected", 2);
  // Equal quantity: higher revenue first; equal quantity and revenue: reference ascending.
  f.order([{ item: ids[1], name: "Cheap", quantity: 15, unitCents: 100, live: false }, { item: ids[2], name: "Dear", quantity: 15, unitCents: 200, live: false }], "collected", 3);
  f.order([{ item: ids[4], name: "Tie B", quantity: 4, unitCents: 100, live: false }, { item: ids[3], name: "Tie A", quantity: 4, unitCents: 100, live: false }], "collected", 3);
  for (let n = 5; n < 12; n++) f.order([{ item: ids[n], name: `Item ${n}`, quantity: 1, unitCents: 100, live: false }], "collected", 4);
  await login(request, f.owner); const top = (await read(request))!.topItems;
  expect(top).toHaveLength(10); expect(top.map(t => t.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(top.slice(0, 5).map(t => t.itemId)).toEqual([ids[0], ids[2], ids[1], ids[3], ids[4]]);
  expect(top[0]).toEqual({ rank: 1, itemId: ids[0], itemName: "New name", quantity: 20, revenueCents: 2000 });
  expect(top.slice(5).map(t => t.itemId)).toEqual(ids.slice(5, 10));
});
test("OWN-06.11: weekday rows are Monday through Sunday with zeros, summing order count, quantity and revenue", async ({ request }) => {
  const f = salesFixture(); const latte = f.menu("Latte");
  f.order([{ item: latte, name: "Latte", quantity: 2, unitCents: 100 }, { item: f.menu("Tea"), name: "Tea", quantity: 1, unitCents: 50 }], "collected", 3);
  f.order([{ item: latte, name: "Latte", quantity: 1, unitCents: 100 }], "collected", 10);
  await login(request, f.owner); const weekdays = (await read(request))!.weekdays;
  expect(weekdays.map(w => w.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  const expected = [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ weekday, orderCount: 0, quantity: 0, revenueCents: 0 }));
  for (const [day, quantity, revenue] of [[3, 3, 250], [10, 1, 100]]) { const row = expected[weekdayOf(day) - 1]; row.orderCount += 1; row.quantity += quantity; row.revenueCents += revenue; }
  expect(weekdays).toEqual(expected);
});
test("OWN-06.11: an empty period returns zero-filled rows and no top items", async ({ request }) => {
  const f = salesFixture(); await login(request, f.owner); const sales = (await read(request))!;
  expect(sales.daily).toHaveLength(28); expect(sales.daily.every(d => d.orderCount === 0 && d.revenueCents === 0)).toBe(true);
  expect(sales.weekdays.every(w => w.orderCount === 0 && w.quantity === 0 && w.revenueCents === 0)).toBe(true); expect(sales.topItems).toEqual([]);
});
test("OWN-06.5: an owner without a café gets null sales, distinct from zero sales", async ({ request }) => {
  const f = salesFixture(); await login(request, account("owner", f.owner.workspaceId)); expect(await read(request)).toBeNull();
});
test("OWN-06.6: no session is 401, wrong roles are 403, and any query key is 400", async ({ request }) => {
  const f = salesFixture(); await failure(await request.get(base), 401, "UNAUTHENTICATED");
  for (const actor of [f.customer, f.admin]) {
    await login(request, actor); await failure(await request.get(base), 403, "FORBIDDEN");
    expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
  }
  await login(request, f.owner);
  for (const query of ["?cafeId=" + f.cafe, "?workspaceId=main", "?from=2026-01-01"]) await failure(await request.get(base + query), 400, "INVALID_REQUEST");
  const post = await request.post(base, { headers: { origin }, data: {} }); expect(post.status()).toBe(405);
});
test("OWN-06.7: main and kit owners see only their own café's sales", async ({ request }) => {
  const kit = salesFixture(); const peer = salesFixture(); const main = salesFixture(true);
  for (const [g, cents] of [[kit, 100], [peer, 2000], [main, 30000]] as const) g.order([{ item: g.menu("Latte"), name: "Latte", quantity: 1, unitCents: cents }], "collected", 1);
  await login(request, kit.owner); expect((await read(request))!.daily[1].revenueCents).toBe(100);
  expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);
  await login(request, main.owner); expect((await read(request))!.daily[1].revenueCents).toBe(30000);
});
test("OWN-06.1 OWN-06.3 OWN-06.4 OWN-07.1 OWN-07.8: Dashboard shows the three views, S$ amounts and, with AI disabled, the top-items fallback panel", async ({ page }) => {
  const f = salesFixture(); const latte = f.menu(unsafe);
  f.order([{ item: latte, name: unsafe, quantity: 3, unitCents: 450 }], "collected", 1);
  const before = snapshot(f.cafe);
  await login(page.request, f.owner); await page.goto("/owner/dashboard");
  await expect(page.getByRole("heading", { name: /daily totals/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /top items/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /day of week/i })).toBeVisible();
  await expect(page.getByText("S$13.50").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Monday" }).first()).toBeVisible();
  const panel = page.getByRole("region", { name: /prep advisor/i });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/AI.*(disabled|unavailable|not available)/i)).toBeVisible();
  await expect(panel.getByRole("table")).toContainText(unsafe);
  await expect(panel.getByRole("button", { name: /apply/i })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { salesExecuted?: boolean }).salesExecuted)).toBeUndefined();
  const prep = await page.request.post("/api/ai/prep-advisor", { headers: { origin }, data: { cafeId: f.cafe, refresh: false } });
  expect(prep.status()).toBe(200);
  expect(await prep.json()).toEqual({ requestId: expect.any(String), feature: "prep_advisor", mode: "fallback", reason: "disabled", fallback: "top_items" });
  expect(snapshot(f.cafe)).toBe(before);
});
test("OWN-06.11: the Dashboard shows the no-sales message instead of the three views", async ({ page }) => {
  const f = salesFixture(); await login(page.request, f.owner); await page.goto("/owner/dashboard");
  await expect(page.getByText("No completed sales in the last 28 days.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /daily totals/i })).toHaveCount(0);
});
test("OWN-06.5: an owner without a café sees the application link, not fabricated sales", async ({ page }) => {
  const f = salesFixture(); await login(page.request, account("owner", f.owner.workspaceId)); await page.goto("/owner/dashboard");
  await expect(page.locator("main").getByRole("link", { name: /appl/i })).toHaveAttribute("href", /\/owner\/application/);
  await expect(page.getByText("S$0.00")).toHaveCount(0);
});
test("OWN-07.12: Prep Advisor requests for another kit's café are 404 and never disclose its data", async ({ request }) => {
  const f = salesFixture(); const other = salesFixture(); other.order([{ item: other.menu("FOREIGN"), name: "FOREIGN", quantity: 1, unitCents: 1 }], "collected", 1);
  await login(request, f.owner);
  const response = await request.post("/api/ai/prep-advisor", { headers: { origin }, data: { cafeId: other.cafe, refresh: false } });
  await failure(response, 404, "NOT_FOUND");
});
test("OWN-06.6: anonymous Dashboard visits never render protected sales", async ({ page }) => {
  const f = salesFixture(); f.order([{ item: f.menu(customerName), name: customerName, quantity: 1, unitCents: 1 }], "collected", 1);
  const raw = await page.request.get("/owner/dashboard"); expect(await raw.text()).not.toContain(customerName);
  await login(page.request, provisionAccount("customer", true)); await page.goto("/owner/dashboard");
  await expect(page.getByText(customerName)).toHaveCount(0);
});
