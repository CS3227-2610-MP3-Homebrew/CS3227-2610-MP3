import { expect, test, type Page } from "@playwright/test";
import { fixture, login, list } from "../catalogue/fixtures";
import { localSql } from "../accounts/local";
import { q } from "../../integration/moderation/fixtures";

const path = "/api/ai/brew-finder";
const filters = { timeMode: "all", at: null, drinkType: null, area: null };
const unsafe = '<img src=x onerror="window.brewExecuted=true"> [link](https://evil.invalid)';
const advice = (suggestions: unknown[]) => ({ requestId: "synthetic-browser-request", feature: "brew_finder", mode: "ai", source: "provider", data: { suggestions } });
const input = (page: Page) => page.getByRole("textbox", { name: /brew finder|describe.*(drink|want|preferences)|what.*(drink|want)/i });
const search = (page: Page) => page.getByRole("button", { name: /^(search|searching[.…]*|find cafés|find cafes)$/i });

test("CUS-06.1: typing makes no call; Enter explicitly submits exact filters with loading and duplicate protection", async ({ page }) => {
  const f = fixture(); f.fields(); const item = f.menu("coffee", false, "Iced coffee"); await login(page.request, f.customer);
  const bodies: unknown[] = []; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${path}`, async route => { bodies.push(route.request().postDataJSON()); await gate; await route.fulfill({ json: advice([{ cafeId: f.cafe, itemId: item, reason: "Coffee matches" }]) }); });
  await page.goto("/customer/cafes"); await input(page).fill("  iced coffee  "); expect(bodies).toEqual([]);
  await input(page).press("Enter"); await expect.poll(() => bodies.length).toBe(1);
  await expect(search(page)).toBeDisabled(); await expect(page.getByText(/searching|finding.*caf|loading/i).first()).toBeVisible();
  if (await input(page).isEnabled()) await input(page).press("Enter"); expect(bodies).toHaveLength(1);
  expect(bodies[0]).toEqual({ query: "  iced coffee  ", filters }); release();
  await expect(page.getByText(/AI.generated advice/i)).toBeVisible(); await expect(search(page)).toBeEnabled();
});
test("CUS-06.1: filter edits clear earlier advice without calling AI again", async ({ page }) => {
  const f = fixture(); f.fields(); const item = f.menu(); await login(page.request, f.customer);
  let calls = 0; await page.route(`**${path}`, async route => { calls++; await route.fulfill({ json: advice([{ cafeId: f.cafe, itemId: item, reason: "UNIQUE BREW ADVICE" }]) }); });
  await page.goto("/customer/cafes"); await input(page).fill("coffee"); await search(page).click();
  await expect(page.getByText("UNIQUE BREW ADVICE", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: /area/i }).selectOption("West");
  await expect(page.getByText("UNIQUE BREW ADVICE", { exact: true })).toHaveCount(0); expect(calls).toBe(1);
});
test("CUS-06.1: filter edit during pending search prevents old-filter response from reappearing", async ({ page }) => {
  const f = fixture(); f.fields(); const item = f.menu(); await login(page.request, f.customer);
  let release!: () => void; let started = false; const gate = new Promise<void>(r => { release = r; });
  await page.route(`**${path}`, async route => { started = true; await gate; await route.fulfill({ json: advice([{ cafeId: f.cafe, itemId: item, reason: "STALE FILTER ADVICE" }]) }); });
  await page.goto("/customer/cafes"); await input(page).fill("coffee"); await search(page).click(); await expect.poll(() => started).toBe(true);
  await page.getByRole("combobox", { name: /area/i }).selectOption("West"); await expect(page).toHaveURL(/area=West/); release();
  // A fresh form and settled loading state ensure the late response has been ignored.
  await expect(search(page)).toBeEnabled(); await expect(page.getByText("STALE FILTER ADVICE", { exact: true })).toHaveCount(0);
});
test("CUS-06.2 CUS-06.14: E01/E08 ranked suggestions resolve names/items and render unsafe reason as inert text", async ({ page }) => {
  const f = fixture(); f.fields(); const item = f.menu("coffee", false, "Iced coffee");
  const second = f.cafeRecord(); f.fields(second); localSql(`update public.cafes set name='Second recommendation' where id=${q(second)};`);
  // Use a real second menu record; names are read from catalogue/detail, never model output.
  const secondItem = f.menu("tea", false, "Tea"); localSql(`update public.menu_items set cafe_id=${q(second)} where id=${q(secondItem)};`);
  await login(page.request, f.customer);
  await page.route(`**${path}`, route => route.fulfill({ json: advice([
    { cafeId: second, itemId: secondItem, reason: "FIRST RANK" }, { cafeId: f.cafe, itemId: item, reason: unsafe },
  ]) }));
  const external: string[] = []; page.on("request", r => { if (r.url().startsWith("https://evil.invalid")) external.push(r.url()); });
  await page.goto("/customer/cafes"); await input(page).fill("coffee or tea"); await search(page).click();
  await expect(page.getByText(/AI.generated advice/i)).toBeVisible();
  await expect(page.getByText(unsafe, { exact: true })).toBeVisible(); await expect(page.locator("img[src=x],a[href^='https://evil.invalid']")).toHaveCount(0);
  expect(await page.evaluate(() => Boolean((window as unknown as { brewExecuted?: boolean }).brewExecuted))).toBe(false); expect(external).toEqual([]);
  const order = await page.getByText("FIRST RANK", { exact: true }).evaluate(el => {
    const first = Array.from(document.querySelectorAll("body *")).find(node => node.textContent === el.textContent);
    const last = Array.from(document.querySelectorAll("body *")).find(node => node.textContent === '<img src=x onerror="window.brewExecuted=true"> [link](https://evil.invalid)');
    return Boolean(first && last && (first.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING));
  }); expect(order).toBe(true);
  await expect(page.getByText("Iced coffee", { exact: true })).toBeVisible(); await expect(page.getByText("Tea", { exact: true })).toBeVisible();
  expect(Number(localSql(`select count(*) from public.orders where customer_id=${q(f.customer.id)};`))).toBe(0);
});
test("CUS-06.2: E14 empty AI success shows no-close-match and retains ordinary catalogue without another call", async ({ page }) => {
  const f = fixture(); f.fields(); f.menu(); await login(page.request, f.customer); let calls = 0;
  await page.route(`**${path}`, async route => { calls++; await route.fulfill({ json: advice([]) }); });
  await page.goto("/customer/cafes"); await input(page).fill("rare drink"); await search(page).click();
  await expect(page.getByText("No close match found", { exact: false })).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: f.name })).toBeVisible(); expect(calls).toBe(1);
});
for (const reason of ["disabled", "usage_limited", "unavailable", "no_source_data"]) test(`CUS-06.6 CUS-06.9 CUS-06.10 CUS-06.11: ${reason} gives safe feedback and ordinary filtered catalogue`, async ({ page }) => {
  const f = fixture(); f.fields(); f.menu(); await login(page.request, f.customer);
  await page.route(`**${path}`, route => route.fulfill({ json: { requestId: "synthetic", feature: "brew_finder", mode: "fallback", reason, fallback: "rating_sorted_catalogue" } }));
  await page.goto("/customer/cafes"); await input(page).fill("coffee"); await search(page).click();
  await expect(page.getByText(reason === "usage_limited" ? /usage limit|search limit|limit reached/i : reason === "disabled" ? /AI.*disabled|Brew Finder.*disabled/i : reason === "no_source_data" ? /no.*(recommend|available|match|source)/i : /AI.*unavailable|Brew Finder.*unavailable/i)).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: f.name })).toBeVisible();
  expect(await list(page.request)).toMatchObject({ items: [expect.objectContaining({ cafeId: f.cafe })] });
});
