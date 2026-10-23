import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { failure, login } from "../moderation/helpers";
import { account, origin, q } from "../../integration/moderation/fixtures";
import { at, customerName, dateAhead, prepFixture, snapshot, type State } from "../../integration/owner-prep-sheet/fixtures";

const base = "/api/owner/prep-sheet";
const pagePath = "/owner/orders/prep-sheet";
type PrepSheet = { businessDate: string; generatedAt: string;
  items: { itemId: string; itemName: string; quantity: number; orderCount: number }[];
  orders: { orderId: string; pickupAt: string; customerName: string; items: { itemId: string; name: string; quantity: number }[] }[];
  pendingTodayCount: number };
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ids = (n: number) => Array.from({ length: n }, () => randomUUID()).sort();
const same = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();
const signOut = async (request: APIRequestContext) => expect((await request.post("/api/auth/sign-out", { headers: { origin }, data: {} })).status()).toBe(200);

async function read(request: APIRequestContext): Promise<PrepSheet | null> {
  const response = await request.get(base); expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const body = await response.json(); expect(Object.keys(body).sort()).toEqual(["prepSheet", "requestId"]);
  if (body.prepSheet) {
    expect(Object.keys(body.prepSheet).sort()).toEqual(["businessDate", "generatedAt", "items", "orders", "pendingTodayCount"]);
    for (const item of body.prepSheet.items) expect(Object.keys(item).sort()).toEqual(["itemId", "itemName", "orderCount", "quantity"]);
    for (const order of body.prepSheet.orders) {
      expect(Object.keys(order).sort()).toEqual(["customerName", "items", "orderId", "pickupAt"]);
      for (const line of order.items) expect(Object.keys(line).sort()).toEqual(["itemId", "name", "quantity"]);
    }
  }
  return body.prepSheet;
}

test("OWN-09.1: only accepted orders with a Singapore pickup date of today are included", async ({ request }) => {
  const f = prepFixture(); const latte = f.menu("Latte");
  const included = f.order([{ item: latte, name: "Latte", quantity: 2 }]);
  for (const state of ["pending", "ready", "collected", "rejected", "cancelled"] as State[]) f.order([{ item: latte, name: "Latte", quantity: 5 }], { state });
  f.order([{ item: latte, name: "Latte", quantity: 7 }], { pickupAt: at(-1, "12:00"), placedAt: at(-1, "07:00") });
  f.order([{ item: latte, name: "Latte", quantity: 9 }], { pickupAt: at(1, "12:00") });
  await login(request, f.owner); const sheet = (await read(request))!;
  expect(sheet.businessDate).toBe(dateAhead(0)); expect(sheet.generatedAt).toMatch(instant);
  expect(Math.abs(new Date(sheet.generatedAt).getTime() - Date.now())).toBeLessThan(5 * 60_000);
  expect(sheet.orders.map(o => o.orderId)).toEqual([included]);
  expect(sheet.items).toEqual([{ itemId: latte, itemName: "Latte", quantity: 2, orderCount: 1 }]);
});

test("OWN-09.1: item totals group by retained reference, keep the latest placed snapshot name and sort by quantity, code-point name, then reference", async ({ request }) => {
  const f = prepFixture(); const [a, b, c, d, e] = ids(5);
  // Renamed item: the older placement's name is replaced by the most recently placed included order's snapshot.
  f.order([{ item: a, name: "Old name", quantity: 3, live: false }], { placedAt: at(-1, "09:00") });
  f.order([{ item: a, name: "New name", quantity: 2, live: false }, { item: b, name: "apple", quantity: 2, live: false }], { placedAt: at(0, "06:00") });
  // Equal quantity: "Zebra" (U+005A) sorts before "apple" (U+0061) by code point; equal name: reference ascending.
  f.order([{ item: c, name: "Zebra", quantity: 2, live: false }, { item: e, name: "Same", quantity: 1, live: false }, { item: d, name: "Same", quantity: 1, live: false }]);
  await login(request, f.owner); const sheet = (await read(request))!;
  expect(sheet.items).toEqual([
    { itemId: a, itemName: "New name", quantity: 5, orderCount: 2 },
    { itemId: c, itemName: "Zebra", quantity: 2, orderCount: 1 },
    { itemId: b, itemName: "apple", quantity: 2, orderCount: 1 },
    { itemId: d, itemName: "Same", quantity: 1, orderCount: 1 },
    { itemId: e, itemName: "Same", quantity: 1, orderCount: 1 },
  ]);
});

test("OWN-09.2: orders sort by pickup instant, placement instant, then reference and carry only time, customer name and item lines", async ({ request }) => {
  const f = prepFixture(); const latte = f.menu("Latte", 650); const tea = f.menu("Tea", 300);
  const [r1, r2] = ids(2);
  const late = f.order([{ item: latte, name: "Latte", quantity: 1 }], { pickupAt: at(0, "15:30") });
  const tieB = f.order([{ item: latte, name: "Latte", quantity: 1 }], { id: r2, pickupAt: at(0, "10:15"), placedAt: at(0, "06:00") });
  const tieA = f.order([{ item: latte, name: "Latte", quantity: 1 }], { id: r1, pickupAt: at(0, "10:15"), placedAt: at(0, "06:00") });
  const earlyPlaced = f.order([{ item: tea, name: "Tea", quantity: 3 }, { item: latte, name: "Latte", quantity: 2 }], { pickupAt: at(0, "10:15"), placedAt: at(0, "05:00") });
  await login(request, f.owner); const sheet = (await read(request))!;
  expect(sheet.orders.map(o => o.orderId)).toEqual([earlyPlaced, tieA, tieB, late]);
  const first = sheet.orders[0];
  expect(same(first.pickupAt, at(0, "10:15"))).toBe(true); expect(first.customerName).toBe(customerName);
  expect(first.items).toEqual([{ itemId: latte, name: "Latte", quantity: 2 }, { itemId: tea, name: "Tea", quantity: 3 }].sort((x, y) => x.itemId < y.itemId ? -1 : 1));
  const raw = JSON.stringify(sheet);
  for (const secret of [f.customer.id, f.customer.email, "Cents", "price", "total", "email", "phone"]) expect(raw).not.toContain(secret);
});

test("OWN-09.3: pending orders for today are excluded and counted; pending orders on other dates are not", async ({ request }) => {
  const f = prepFixture(); const latte = f.menu("Latte"); const mocha = f.menu("PENDING ONLY MOCHA");
  f.order([{ item: latte, name: "Latte", quantity: 1 }]);
  f.order([{ item: mocha, name: "PENDING ONLY MOCHA", quantity: 4 }], { state: "pending" });
  f.order([{ item: mocha, name: "PENDING ONLY MOCHA", quantity: 4 }], { state: "pending", pickupAt: at(0, "18:00") });
  f.order([{ item: mocha, name: "PENDING ONLY MOCHA", quantity: 4 }], { state: "pending", pickupAt: at(1, "09:00") });
  await login(request, f.owner); const sheet = (await read(request))!;
  expect(sheet.pendingTodayCount).toBe(2);
  expect(sheet.items.map(i => i.itemId)).toEqual([latte]); expect(sheet.orders).toHaveLength(1);
});

test("OWN-09.4: an accepted order at 23:45 today is included and one at 00:00 tomorrow is excluded", async ({ request }) => {
  const f = prepFixture(); const latte = f.menu("Latte");
  const lastSlot = f.order([{ item: latte, name: "Latte", quantity: 1 }], { pickupAt: at(0, "23:45") });
  // An overnight pickup after midnight belongs to the next date.
  f.order([{ item: latte, name: "Latte", quantity: 6 }], { pickupAt: at(1, "00:00") });
  await login(request, f.owner); const sheet = (await read(request))!;
  expect(sheet.orders.map(o => o.orderId)).toEqual([lastSlot]);
  expect(sheet.items).toEqual([{ itemId: latte, itemName: "Latte", quantity: 1, orderCount: 1 }]);
});

test("OWN-09.6: no accepted orders gives an empty sheet with zero pending; no café gives null", async ({ request }) => {
  const f = prepFixture(); f.order([{ item: f.menu("Latte"), name: "Latte", quantity: 1 }], { state: "ready" });
  await login(request, f.owner);
  expect(await read(request)).toMatchObject({ businessDate: dateAhead(0), items: [], orders: [], pendingTodayCount: 0 });
  await signOut(request);
  await login(request, account("owner", f.owner.workspaceId)); expect(await read(request)).toBeNull();
});

test("OWN-09.7: no session is 401, wrong roles are 403, query keys are 400 and other methods are 405", async ({ request }) => {
  const f = prepFixture(); f.order([{ item: f.menu(customerName), name: customerName, quantity: 1 }]);
  const anonymous = await request.get(base); await failure(anonymous, 401, "UNAUTHENTICATED");
  for (const actor of [f.customer, f.admin]) {
    await login(request, actor); const response = await request.get(base);
    expect(await response.text()).not.toContain(customerName);
    await failure(await request.get(base), 403, "FORBIDDEN"); await signOut(request);
  }
  await login(request, f.owner);
  for (const query of ["?cafeId=" + f.cafe, "?workspaceId=main", "?date=" + dateAhead(1)]) await failure(await request.get(base + query), 400, "INVALID_REQUEST");
  const post = await request.post(base, { headers: { origin }, data: {} }); expect(post.status()).toBe(405);
});

test("OWN-09.7: main and kit owners each see only their own café's orders", async ({ request }) => {
  const kit = prepFixture(); const peer = prepFixture(); const main = prepFixture(true);
  const own = new Map<string, string>();
  for (const g of [kit, peer, main]) own.set(g.cafe, g.order([{ item: g.menu(`Item ${g.cafe}`), name: `Item ${g.cafe}`, quantity: 1 }]));
  for (const g of [kit, main]) {
    await login(request, g.owner); const sheet = (await read(request))!;
    expect(sheet.orders.map(o => o.orderId)).toEqual([own.get(g.cafe)]);
    expect(JSON.stringify(sheet)).not.toContain(g === kit ? main.cafe : kit.cafe); expect(JSON.stringify(sheet)).not.toContain(peer.cafe);
    await signOut(request);
  }
});

test("OWN-09.5: reading the sheet changes no order, menu or café record", async ({ request }) => {
  const f = prepFixture(); const latte = f.menu("Latte");
  f.order([{ item: latte, name: "Latte", quantity: 1 }]); f.order([{ item: latte, name: "Latte", quantity: 1 }], { state: "pending" });
  const before = snapshot(f.cafe);
  await login(request, f.owner); await read(request); await read(request);
  expect(snapshot(f.cafe)).toBe(before);
});

test.describe("prep sheet page", () => {
  // The browser runs far from Singapore; times and dates must still be Singapore time.
  test.use({ timezoneId: "America/Los_Angeles" });
  const unsafe = '<img src=x onerror="window.prepExecuted=true"> Oat';

  test("OWN-09.1 OWN-09.2 OWN-09.4: the page shows item totals and orders with Singapore HH:mm, names and quantities and no prices or contact data", async ({ page }) => {
    const f = prepFixture(); const latte = f.menu(unsafe, 650);
    f.order([{ item: latte, name: unsafe, quantity: 3 }], { pickupAt: at(0, "23:45") });
    f.order([{ item: latte, name: unsafe, quantity: 8 }], { pickupAt: at(1, "00:00"), customer: "TOMORROW CUSTOMER" });
    await login(page.request, f.owner); await page.goto(pagePath);
    await expect(page.getByRole("heading", { name: /prep sheet/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /item totals/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^orders/i })).toBeVisible();
    const main = page.locator("main");
    await expect(main).toContainText(dateAhead(0)); await expect(main).toContainText("23:45");
    await expect(main).toContainText(customerName); await expect(main).toContainText(unsafe);
    await expect(main).not.toContainText("TOMORROW CUSTOMER"); await expect(main).not.toContainText("00:00");
    await expect(main).not.toContainText(/S\$|\$\d/); await expect(main).not.toContainText(f.customer.email); await expect(main).not.toContainText(f.customer.id);
    expect(await page.evaluate(() => (window as unknown as { prepExecuted?: boolean }).prepExecuted)).toBeUndefined();
  });

  test("OWN-09.3: the page states how many pending orders for today are not included", async ({ page }) => {
    const f = prepFixture(); const latte = f.menu("Latte");
    f.order([{ item: latte, name: "Latte", quantity: 1 }]);
    for (const time of ["13:00", "14:00"]) f.order([{ item: f.menu("PENDING ONLY MOCHA"), name: "PENDING ONLY MOCHA", quantity: 1 }], { state: "pending", pickupAt: at(0, time) });
    await login(page.request, f.owner); await page.goto(pagePath);
    await expect(page.getByText("2 new orders for today are not included until accepted.")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("PENDING ONLY MOCHA");
  });

  test("OWN-09.5: Print opens the print dialog, the print layout hides navigation and actions, and nothing changes", async ({ page }) => {
    const f = prepFixture(); const latte = f.menu("Latte"); f.order([{ item: latte, name: "Latte", quantity: 2 }]);
    const before = snapshot(f.cafe);
    await page.addInitScript(() => { (window as unknown as { printed: number }).printed = 0; window.print = () => { (window as unknown as { printed: number }).printed += 1; }; });
    await login(page.request, f.owner); await page.goto(pagePath);
    const print = page.getByRole("button", { name: /print/i }); await print.click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
    await page.emulateMedia({ media: "print" });
    await expect(print).toBeHidden();
    for (const nav of await page.getByRole("navigation").all()) await expect(nav).toBeHidden();
    await expect(page.locator("main").getByRole("link", { name: /order queue/i })).toBeHidden();
    await expect(page.getByRole("heading", { name: /item totals/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^orders/i })).toBeVisible();
    await expect(page.locator("main")).toContainText(dateAhead(0)); await expect(page.locator("main")).toContainText(/generated/i);
    await expect(page.locator("main")).toContainText(customerName);
    expect(snapshot(f.cafe)).toBe(before);
  });

  test("OWN-09.5: Order queue links to the prep sheet without a navigation entry, and reload shows newly accepted orders", async ({ page }) => {
    const f = prepFixture(); const latte = f.menu("Latte"); const later = f.order([{ item: latte, name: "Latte", quantity: 1 }], { state: "pending", customer: "LATER CUSTOMER" });
    await login(page.request, f.owner); await page.goto("/owner/orders");
    for (const nav of await page.getByRole("navigation").all()) await expect(nav.getByRole("link", { name: /prep sheet/i })).toHaveCount(0);
    await page.locator("main").getByRole("link", { name: /prep sheet/i }).click();
    await expect(page).toHaveURL(new RegExp(`${pagePath}$`));
    await expect(page.getByText("No accepted orders for today.")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("LATER CUSTOMER");
    localSql(`update public.orders set state='accepted', accepted_at=now() where id=${q(later)};`);
    await page.reload(); await expect(page.locator("main")).toContainText("LATER CUSTOMER");
    await expect(page.locator("main").getByRole("link", { name: /order queue/i })).toHaveAttribute("href", "/owner/orders");
  });

  test("OWN-09.6: an owner without a café sees the no-café state with an Apply for a café link", async ({ page }) => {
    const f = prepFixture(); await login(page.request, account("owner", f.owner.workspaceId)); await page.goto(pagePath);
    await expect(page.locator("main").getByRole("link", { name: /apply for a café/i })).toHaveAttribute("href", /\/owner\/application/);
    await expect(page.getByText("No accepted orders for today.")).toHaveCount(0);
  });

  test("OWN-09.7: anonymous and wrong-role visits never render protected prep data", async ({ page }) => {
    const f = prepFixture(); f.order([{ item: f.menu("Latte"), name: "Latte", quantity: 1 }]);
    const raw = await page.request.get(pagePath); expect(await raw.text()).not.toContain(customerName);
    await login(page.request, provisionAccount("customer", true)); await page.goto(pagePath);
    await expect(page.getByText(customerName)).toHaveCount(0);
  });
});
