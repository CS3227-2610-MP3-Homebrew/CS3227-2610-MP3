import { expect, test } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { stored } from "../../integration/moderation/fixtures";
import { attack, base, detail, fixture, list, login } from "./fixtures";

test.use({ timezoneId: "America/Los_Angeles" });

test("CUS-01.9 CUS-01.11: closed unscheduled card remains clickable, Open now removes it, removal and Reset restore all", async ({ page }) => {
  const aiRequests: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/ai/")) aiRequests.push(request.url()); });
  const f = fixture(); f.fields(); await login(page.request, f.customer); await page.goto("/customer/cafes");
  const card = page.getByRole("link").filter({ hasText: f.name }); await expect(card).toBeVisible(); await expect(card).toContainText("No opening hours scheduled");
  await expect(card).toBeEnabled();
  // Accept common visual implementations of greying without prescribing classes.
  expect(await card.evaluate(el => {
    for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
      const s = getComputedStyle(node); if (/grayscale\(1\)|grayscale\(100%\)/.test(s.filter) || Number(s.opacity) < 1) return true;
    } return false;
  }), "Closed card is visibly greyed through grayscale or dimming").toBe(true);
  await page.getByRole("combobox", { name: /opening time|time filter/i }).selectOption("now"); await expect(card).toHaveCount(0);
  await page.getByRole("combobox", { name: /opening time|time filter/i }).selectOption("all"); await expect(card).toBeVisible();
  await page.getByRole("combobox", { name: /area/i }).selectOption("West"); await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /reset/i }).click(); await expect(card).toBeVisible();
  await card.click(); await expect(page).toHaveURL(new RegExp(`/customer/cafes/${f.cafe}$`)); await expect(page.getByRole("heading", { name: f.name })).toBeVisible();
  expect(aiRequests).toEqual([]);
});
test("CUS-01.3 CUS-01.9 CUS-02.3: Open at converts Singapore minute while closed card describes now and next-opening text is Singapore", async ({ page }) => {
  // The database clock chooses a future minute; browser clock never determines server now.
  const f = fixture(); f.fields();
  const next = JSON.parse(localSql("select json_build_object('weekday',extract(isodow from (now() at time zone 'Asia/Singapore') + interval '2 days')::int,'date',to_char((now() at time zone 'Asia/Singapore') + interval '2 days','YYYY-MM-DD'))"));
  f.hours(next.weekday, "09:00", "10:00");
  await login(page.request, f.customer); await page.goto("/customer/cafes");
  await page.getByRole("combobox", { name: /opening time|time filter/i }).selectOption("at");
  await page.getByLabel(/date/i).fill(next.date); await page.getByLabel(/^time$|chosen time/i).fill("09:00");
  await page.getByRole("button", { name: /apply/i }).click();
  const card = page.getByRole("link").filter({ hasText: f.name }); await expect(card).toBeVisible();
  const wire = `${next.date}T01:00:00Z`;
  const result = await list(page.request, `?timeMode=at&at=${wire}`); expect(result.items.map(c => c.cafeId)).toEqual([f.cafe]); expect(result.items[0].isOpen).toBe(false);
  const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(wire));
  const parts = formatted.match(/(\d+ \w+ \d+),? (\d+:\d+)\s*(am|pm)/i)!;
  await expect(card).toContainText(`Cafe opens at ${parts[1]}, ${parts[2]} ${parts[3].toUpperCase()} SGT`);
  await expect(card).not.toContainText("closing soon");
  const end = await list(page.request, `?timeMode=at&at=${next.date}T02:00:00Z`); expect(end.items).toEqual([]);
});
test("CUS-02.1 CUS-02.2 CUS-02.3 CUS-02.8: public detail shows cents, sold-out items, Singapore hours and inert unchanged text", async ({ page }) => {
  const f = fixture(); f.fields(); const z = f.menu("tea", true, "Zed", 1); const a = f.menu("coffee", false, attack, 450); f.hours(7, "23:00", "01:00", true); f.hours(1, "09:00", "17:00");
  const review = f.review("pending", { text: attack }); const before = stored(review);
  await login(page.request, f.reader); const cafe = await detail(page.request, f.cafe);
  expect(Object.keys(cafe).sort()).toEqual(["cafeId", "name", "description", "area", "pickupAddress", "rating", "openingHours", "menu"].sort());
  expect(cafe.menu).toEqual([
    { itemId: a, name: attack, drinkType: "coffee", priceCents: 450, soldOut: false },
    { itemId: z, name: "Zed", drinkType: "tea", priceCents: 1, soldOut: true },
  ]);
  expect(cafe.openingHours).toEqual([{ weekday: 1, opensAt: "09:00", closesAt: "17:00", closesNextDay: false }, { weekday: 7, opensAt: "23:00", closesAt: "01:00", closesNextDay: true }]);
  await page.goto(`/customer/cafes/${f.cafe}`); await expect(page.getByText("S$4.50", { exact: true })).toBeVisible(); await expect(page.getByText("S$0.01", { exact: true })).toBeVisible(); await expect(page.getByText(/sold out/i)).toBeVisible();
  expect(await page.locator("body").textContent()).toContain(attack); await expect(page.locator("img[src=x]")).toHaveCount(0); expect(await page.evaluate(() => Boolean((window as unknown as { catalogueExecuted?: boolean }).catalogueExecuted))).toBe(false);
  await expect(page.locator("body")).toContainText(/09:00|9:00\s*AM/i); await expect(page.locator("body")).toContainText(/23:00|11:00\s*PM/i); expect(stored(review)).toEqual(before);
});
test("CUS-02.1 CUS-02.4: empty menu/review collections stay empty on a closed eligible cafe", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const cafe = await detail(request, f.cafe); expect(cafe.menu).toEqual([]); expect(cafe.openingHours).toEqual([]); expect(cafe.rating).toEqual({ average: null, visibleReviewCount: 0 });
  const r = await request.get(`${base}/${f.cafe}/reviews`); expect(r.status()).toBe(200); expect((await r.json()).items).toEqual([]);
});
for (const role of [null, "owner", "admin"] as const) test(`CUS-01.8 CUS-02.9: ${role ?? "anonymous"} receives no protected page or static shell data`, async ({ page }) => {
  const f = fixture(); if (role) await login(page.request, provisionAccount(role, true));
  for (const path of ["/customer/cafes", `/customer/cafes/${f.cafe}`]) {
    const response = await page.goto(path); const html = await response!.text(); expect(html).not.toContain(f.name); expect(html).not.toContain(f.cafe); await expect(page.getByText(f.name)).toHaveCount(0);
  }
});
