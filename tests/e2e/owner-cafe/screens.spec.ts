import { expect, test, type Page } from "@playwright/test";
import { localSql } from "../accounts/local";
import { arrangeCafe, cafeRow, decide, interval, login, ownedCafes, q, snapshot, suspend, unsafe, workspace } from "./fixtures";

const ownerPages = ["/owner/application", "/owner/cafe"] as const;
/** All visible text plus form-control values, so assertions do not depend on the control type chosen. */
async function rendered(page: Page) {
  return page.evaluate(() => [document.body.innerText, ...Array.from(document.querySelectorAll("input,textarea,select"), e => (e as HTMLInputElement).value)].join("\n"));
}
async function expectInert(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { ownerCafeExecuted?: boolean }).ownerCafeExecuted)).toBeUndefined();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
}

test("OWN-01.1 OWN-01.2: a no-café owner applies from /owner/application and then reads the pending state", async ({ page }) => {
  const f = workspace(); await login(page.request, f.owner); await page.goto("/owner/application");
  await page.getByLabel(/café name|cafe name|^name/i).fill("Browser Applied Café");
  await page.getByLabel(/description/i).fill("Applied through the form");
  await page.getByLabel(/area/i).selectOption("East");
  await page.getByLabel(/pickup address/i).fill(`${f.owner.id.slice(0, 8)} Browser Pickup Road`);
  await page.getByRole("button", { name: /submit|apply/i }).click();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
  const stored = ownedCafes(f.owner.id); expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ application_state: "pending", name: "Browser Applied Café", area: "East", workspace_id: f.workspaceId, pickup_cutoff_minutes: 15 });
});

test("OWN-01.1: the application area is a dropdown of exactly the shared areas", async ({ page }) => {
  const f = workspace(); await login(page.request, f.owner); await page.goto("/owner/application");
  const area = page.getByLabel(/area/i); await expect(area).toBeVisible();
  const options = (await area.locator("option").allTextContents()).map(o => o.trim()).filter(o => ["Central", "North", "South", "East", "West"].includes(o));
  expect(options).toEqual(["Central", "North", "South", "East", "West"]);
});

test("OWN-01.2: a pending application is shown read-only and viewing it never approves it", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "pending", name: "Pending Browser Café" }); const before = snapshot(cafe);
  await login(page.request, f.owner);
  for (let i = 0; i < 2; i++) {
    await page.goto("/owner/application");
    await expect(page.getByText(/pending/i).first()).toBeVisible(); await expect(page.getByText("Pending Browser Café").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit|resubmit|save|apply/i })).toHaveCount(0);
  }
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-01.3: rejected state and latest decision reason render as inert private text, hidden from another owner", async ({ page, browser }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "pending" }); decide(f, cafe, "reject", unsafe);
  await login(page.request, f.owner); await page.goto("/owner/application");
  await expect(page.getByText(/rejected/i).first()).toBeVisible(); await expect(page.getByText(unsafe)).toBeVisible(); await expectInert(page);
  const other = await browser.newContext(); const otherPage = await other.newPage();
  try {
    await login(otherPage.request, f.other); await otherPage.goto("/owner/application");
    expect(await rendered(otherPage)).not.toContain("ownerCafeExecuted");
    expect(await (await otherPage.request.get("/owner/application")).text()).not.toContain("ownerCafeExecuted");
  } finally { await other.close(); }
});

test("OWN-01.3 OWN-01.4: approved suspended cafés show the approval reason and the current suspension reason as inert text", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "pending" }); decide(f, cafe, "approve", "Approved browser reason");
  suspend(f, cafe, true, unsafe); await login(page.request, f.owner); await page.goto("/owner/application");
  await expect(page.getByText(/approved/i).first()).toBeVisible(); await expect(page.getByText("Approved browser reason")).toBeVisible();
  await expect(page.getByText(/suspended/i).first()).toBeVisible(); await expect(page.getByText(unsafe)).toBeVisible(); await expectInert(page);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: true });
});

test("OWN-01.5: a rejected application can be resubmitted unchanged and keeps the previous rejection reason visible while pending", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "pending", hours: [interval(1, "09:00", "12:00")] }); decide(f, cafe, "reject", "Previous rejection reason");
  await login(page.request, f.owner); await page.goto("/owner/application");
  await page.getByRole("button", { name: /resubmit/i }).first().click();
  const confirm = page.getByRole("button", { name: /submit|resubmit|confirm/i });
  if (await confirm.count() && cafeRow(cafe).application_state === "rejected") await confirm.last().click();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
  await expect(page.getByText("Previous rejection reason")).toBeVisible();
  expect(cafeRow(cafe).application_state).toBe("pending"); expect(ownedCafes(f.owner.id)).toHaveLength(1);
});

for (const path of ownerPages) test(`OWN-01.2 OWN-02.1: ${path} without a café shows an empty state with an Apply for a café CTA`, async ({ page }) => {
  const f = workspace(); await login(page.request, f.owner); await page.goto(path);
  if (path === "/owner/cafe") {
    const cta = page.getByRole("link", { name: /apply for a caf[eé]/i }); await expect(cta).toBeVisible();
    expect(new URL(await cta.getAttribute("href") ?? "", page.url()).pathname).toBe("/owner/application");
  } else {
    await expect(page.getByLabel(/café name|cafe name|^name/i)).toBeVisible();
  }
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

test("OWN-02.1 OWN-04.1: Café profile shows stored profile, fixed fields, Singapore-local hours under a foreign browser timezone, and the cutoff", async ({ browser }) => {
  const f = workspace(); arrangeCafe(f.owner, { state: "approved", name: "Profile Browser Café", address: "9 Fixed Browser Road", area: "West", description: "Stored browser description", cutoff: 0,
    hours: [interval(1, "22:00", "02:00", true), interval(3, "07:05", "08:55")] });
  const context = await browser.newContext({ timezoneId: "America/Los_Angeles" }); const page = await context.newPage();
  try {
    await login(page.request, f.owner); await page.goto("/owner/cafe");
    await expect(page.getByText("Profile Browser Café").first()).toBeVisible();
    const text = await rendered(page);
    for (const value of ["9 Fixed Browser Road", "West", "Stored browser description"]) expect(text).toContain(value);
    for (const time of [/22:00|10:00\s?PM/i, /02:00|2:00\s?AM/i, /07:05|7:05\s?AM/i, /08:55|8:55\s?AM/i]) expect(text).toMatch(time);
    expect(text).not.toMatch(/(^|\D)0?[67]:00(\D|$)/); // 22:00 SGT rendered in Los Angeles time would be 06:00 or 07:00.
    await expect(page.getByRole("textbox", { name: /café name|cafe name|^name/i })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: /pickup address/i })).toHaveCount(0);
    await expect(page.getByLabel(/cutoff|last pickup/i)).toHaveValue("0");
  } finally { await context.close(); }
});

test("OWN-02.2 OWN-04.2: saving description and cutoff from Café profile persists after reload", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "approved", hours: [interval(2, "09:00", "12:00")] });
  await login(page.request, f.owner); await page.goto("/owner/cafe");
  await page.getByLabel(/description/i).fill("Saved from the browser"); await page.getByLabel(/cutoff|last pickup/i).fill("30");
  await page.getByRole("button", { name: /save/i }).click();
  await expect.poll(() => cafeRow(cafe).description).toBe("Saved from the browser");
  expect(cafeRow(cafe)).toMatchObject({ pickup_cutoff_minutes: 30, application_state: "approved", suspended: false });
  await page.reload(); await expect(page.getByLabel(/description/i)).toHaveValue("Saved from the browser"); await expect(page.getByLabel(/cutoff|last pickup/i)).toHaveValue("30");
});

test("OWN-02.4 OWN-04.3: an invalid cutoff is kept, highlighted and announced without saving any part of the batch", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "approved", cutoff: 15 }); const before = snapshot(cafe);
  await login(page.request, f.owner); await page.goto("/owner/cafe");
  await page.getByLabel(/description/i).fill("Must not save"); const cutoff = page.getByLabel(/cutoff|last pickup/i); await cutoff.fill("181");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /cutoff|pickup/i }).first()).toBeVisible();
  await expect(cutoff).toHaveValue("181"); await expect(cutoff).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/description/i)).toHaveValue("Must not save");
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-02.7 OWN-04.7: a save overtaken by suspension opens /owner/application with the current suspension status and saves nothing", async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "approved" });
  await login(page.request, f.owner); await page.goto("/owner/cafe");
  await page.getByLabel(/description/i).fill("Overtaken edit");
  suspend(f, cafe, true, "Overtaking browser suspension"); const before = snapshot(cafe);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page).toHaveURL(/\/owner\/application/); await expect(page.getByText(/suspended/i).first()).toBeVisible();
  await expect(page.getByText("Overtaking browser suspension")).toBeVisible();
  expect(snapshot(cafe)).toEqual(before);
});

for (const role of ["anonymous", "customer", "admin"] as const) for (const path of ownerPages) test(`OWN-01.7 OWN-02.8: ${role} browser at ${path} receives no owner café content`, async ({ page }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "approved", name: "PRIVATE-OWNER-PAGE-MARKER" }); decide(f, cafe, "approve", "PRIVATE-REASON-MARKER");
  localSql(`update public.cafes set description='PRIVATE-DESCRIPTION-MARKER' where id=${q(cafe)};`);
  if (role !== "anonymous") await login(page.request, f[role]);
  const raw = await (await page.request.get(path)).text();
  for (const marker of ["PRIVATE-OWNER-PAGE-MARKER", "PRIVATE-REASON-MARKER", "PRIVATE-DESCRIPTION-MARKER"]) expect(raw).not.toContain(marker);
  await page.goto(path);
  await expect(page).toHaveURL(role === "anonymous" ? /\/sign-in/ : role === "customer" ? /\/customer\/cafes/ : /\/admin\/moderation/);
});
