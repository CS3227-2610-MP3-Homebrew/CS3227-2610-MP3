import { expect, test, type Locator, type Page } from "@playwright/test";
import { approvalConflict, arrangeItem, cafeIn, codePointCompare, itemRow, login, menuSnapshot, suspend, workspace } from "./fixtures";

// Assertions are scoped to the page's main landmark: the owner layout navigation repeats "Menu".
const main = (page: Page) => page.getByRole("main");
/** One presented menu item: a list item or table row whose text includes the item name. */
const presented = (page: Page, name: string) => main(page).getByRole("listitem").or(main(page).getByRole("row")).filter({ hasText: name }).first();
async function soldOutShown(row: Locator) {
  const control = row.getByRole("checkbox", { name: /sold out/i }).or(row.getByRole("switch", { name: /sold out/i }));
  if (await control.count()) return control.first().isChecked();
  return /sold out/i.test(await row.innerText());
}
/** The editable text field currently holding an item's name, after opening its editor when one is offered. */
async function nameField(page: Page, name: string) {
  const edit = presented(page, name).getByRole("button", { name: /edit/i });
  if (await edit.count()) await edit.first().click();
  const fields = main(page).getByRole("textbox");
  await expect.poll(async () => (await fields.evaluateAll((els, value) => els.findIndex(e => (e as HTMLInputElement).value === value), name))).toBeGreaterThanOrEqual(0);
  const index = await fields.evaluateAll((els, value) => els.findIndex(e => (e as HTMLInputElement).value === value), name);
  return fields.nth(index);
}
async function saveFrom(page: Page, field: Locator) {
  const form = field.locator("xpath=ancestor::form[1]");
  const button = (await form.count()) ? form.getByRole("button", { name: /save/i }) : main(page).getByRole("button", { name: /save/i });
  await button.first().click();
}

test("OWN-03.1 OWN-03.3: Menu lists only the owner's items with names, drink types, S$ two-decimal prices and sold-out state in name order", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); const foreign = cafeIn(f.other, "approved");
  arrangeItem(foreign, { name: "PRIVATE-FOREIGN-ITEM", priceCents: 777 });
  const items = [
    { name: "Mocha", drinkType: "coffee", priceCents: 450, soldOut: false }, { name: "Zebra Juice", drinkType: "juice", priceCents: 1, soldOut: true },
    { name: "apple Tea", drinkType: "tea", priceCents: 99_999, soldOut: false }, { name: "Éclair Chocolate", drinkType: "chocolate", priceCents: 100, soldOut: false },
  ] as const;
  for (const item of items) arrangeItem(cafe, item);
  await login(page.request, f.owner); await page.goto("/owner/menu");
  await expect(main(page).getByText("Mocha", { exact: true }).first()).toBeVisible();
  const text = await main(page).innerText();
  for (const price of ["S$4.50", "S$0.01", "S$999.99", "S$1.00"]) expect(text).toContain(price);
  expect(text).not.toMatch(/S\$4\.5(?!0)|S\$999\.990|S\$1(?!\.00)/);
  for (const type of ["coffee", "juice", "tea", "chocolate"]) expect(text.toLowerCase()).toContain(type);
  expect(text).not.toContain("PRIVATE-FOREIGN-ITEM"); expect(text).not.toContain("S$7.77");
  const order = [...items].sort((a, b) => codePointCompare(a.name, b.name)).map(i => i.name);
  const positions = order.map(name => text.indexOf(name)); expect(positions.every(p => p >= 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  expect(await soldOutShown(presented(page, "Zebra Juice"))).toBe(true);
  expect(await soldOutShown(presented(page, "Mocha"))).toBe(false);
});

test("OWN-03.1: Menu shows 20 items per page in name order", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved");
  for (let i = 21; i >= 1; i--) arrangeItem(cafe, { name: `Page Item ${String(i).padStart(2, "0")}` });
  await login(page.request, f.owner); await page.goto("/owner/menu");
  await expect(main(page).getByText("Page Item 01").first()).toBeVisible();
  const text = await main(page).innerText();
  for (let i = 1; i <= 20; i++) expect(text).toContain(`Page Item ${String(i).padStart(2, "0")}`);
  expect(text).not.toContain("Page Item 21");
});

test("OWN-03.1 OWN-03.8: Menu without a café shows an empty state with an Apply for a café CTA", async ({ page }) => {
  const f = workspace(); await login(page.request, f.owner); await page.goto("/owner/menu");
  const cta = main(page).getByRole("link", { name: /apply for a caf[eé]/i }); await expect(cta).toBeVisible();
  expect(new URL(await cta.getAttribute("href") ?? "", page.url()).pathname).toBe("/owner/application");
  await expect(page).toHaveURL(/\/owner\/menu$/);
});

test("OWN-03.2: editing an item's name on the Menu page saves it and the saved name persists after reload", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); const id = arrangeItem(cafe, { name: "Browser Old Name", priceCents: 450 });
  await login(page.request, f.owner); await page.goto("/owner/menu");
  const field = await nameField(page, "Browser Old Name"); await field.fill("Browser New Name"); await saveFrom(page, field);
  await expect.poll(() => itemRow(id).name).toBe("Browser New Name");
  expect(itemRow(id)).toMatchObject({ cafe_id: cafe, price_cents: 450 });
  await page.reload(); await expect(main(page).getByText("Browser New Name").first()).toBeVisible();
  expect(await main(page).innerText()).not.toContain("Browser Old Name");
});

test("OWN-03.5: turning the sold-out toggle on from the Menu page saves the item as sold out", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); const id = arrangeItem(cafe, { name: "Toggle Latte" });
  await login(page.request, f.owner); await page.goto("/owner/menu");
  const row = presented(page, "Toggle Latte"); await expect(row).toBeVisible();
  const edit = row.getByRole("button", { name: /edit/i }); if (await edit.count()) await edit.first().click();
  const toggle = main(page).getByRole("checkbox", { name: /sold out/i }).or(main(page).getByRole("switch", { name: /sold out/i })).first();
  await toggle.click();
  const form = toggle.locator("xpath=ancestor::form[1]");
  if (await form.count() && await form.getByRole("button", { name: /save/i }).count()) await form.getByRole("button", { name: /save/i }).first().click();
  await expect.poll(() => itemRow(id).sold_out).toBe(true);
  await page.reload(); expect(await soldOutShown(presented(page, "Toggle Latte"))).toBe(true);
});

async function unapprovedEdit(page: Page, state: "pending" | "rejected") {
  const f = workspace(); const cafe = cafeIn(f.owner, state); arrangeItem(cafe, { name: `Unapproved ${state} Item` });
  const before = menuSnapshot(cafe);
  await login(page.request, f.owner); await page.goto("/owner/menu");
  const field = await nameField(page, `Unapproved ${state} Item`); await field.fill("Unsaved Owner Input"); await saveFrom(page, field);
  await expect(main(page).getByText(approvalConflict)).toBeVisible();
  await expect(field).toHaveValue("Unsaved Owner Input");
  expect(menuSnapshot(cafe)).toEqual(before);
}
test("OWN-03.9: a pending café's Menu edit shows the approval message, keeps the unsaved input and writes nothing", async ({ page }) => {
  await unapprovedEdit(page, "pending");
});
test("OWN-03.9: a rejected café's Menu edit shows the approval message, keeps the unsaved input and writes nothing", async ({ page }) => {
  await unapprovedEdit(page, "rejected");
});

test("OWN-03.7: a Menu edit overtaken by suspension opens /owner/application with the current suspension status and saves nothing", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); arrangeItem(cafe, { name: "Overtaken Browser Item" });
  await login(page.request, f.owner); await page.goto("/owner/menu");
  const field = await nameField(page, "Overtaken Browser Item"); await field.fill("Overtaken Browser Edit");
  suspend(f, cafe, true, "Overtaking menu suspension"); const before = menuSnapshot(cafe);
  await saveFrom(page, field);
  await expect(page).toHaveURL(/\/owner\/application/);
  await expect(main(page).getByText(/suspended/i).first()).toBeVisible();
  await expect(main(page).getByText("Overtaking menu suspension")).toBeVisible();
  expect(menuSnapshot(cafe)).toEqual(before);
});

for (const role of ["anonymous", "customer", "admin"] as const) test(`OWN-03.8: ${role} browser at /owner/menu receives no owner menu content`, async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); arrangeItem(cafe, { name: "PRIVATE-OWNER-MENU-MARKER" });
  if (role !== "anonymous") await login(page.request, f[role]);
  expect(await (await page.request.get("/owner/menu")).text()).not.toContain("PRIVATE-OWNER-MENU-MARKER");
  await page.goto("/owner/menu");
  await expect(page).toHaveURL(role === "anonymous" ? /\/sign-in/ : role === "customer" ? /\/customer\/cafes/ : /\/admin\/moderation/);
});
test("OWN-03.8: another owner's Menu page never shows a café's items", async ({ page }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); arrangeItem(cafe, { name: "PRIVATE-OTHER-OWNER-ITEM" }); cafeIn(f.other, "approved");
  await login(page.request, f.other); await page.goto("/owner/menu");
  await expect(main(page)).toBeVisible();
  expect(await (await page.request.get("/owner/menu")).text()).not.toContain("PRIVATE-OTHER-OWNER-ITEM");
  expect(await main(page).innerText()).not.toContain("PRIVATE-OTHER-OWNER-ITEM");
});
