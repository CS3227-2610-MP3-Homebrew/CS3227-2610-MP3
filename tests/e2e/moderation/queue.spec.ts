import { expect, test, type Page } from "@playwright/test";
import { origin, q, quickReasons, reason, scenario, stored, submitted, text } from "../../integration/moderation/fixtures";
import { auditFixture } from "../../integration/audit/fixtures";
import { localSql } from "../accounts/local";
import { login, moderate } from "./helpers";

async function selectTab(page: Page, label: string) {
  const tab = page.getByRole("tab", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true }));
  await tab.click();
}
for (const state of ["pending", "kept", "hidden"] as const) test.describe(state, () => {
  test("ADM-03.2 ADM-03.3 ADM-03.10 ADM-03.11: URL tab scopes rows including suspended cafés and renders exact escaped fields with correct actions", async ({ page }) => {
    const f = scenario(); const target = f.review(state); const foreign = scenario(); foreign.review(state, { [foreign.reviewText]: "FOREIGN REVIEW SECRET" });
    localSql(`update public.cafes set suspended=true where id=${q(f.cafe)};`);
    await login(page.request, f.admin); await page.goto("/admin/moderation");
    for (const tab of ["Pending", "Kept", "Hidden"]) await expect(page.getByRole("tab", { name: tab, exact: true }).or(page.getByRole("link", { name: tab, exact: true }))).toBeVisible();
    await selectTab(page, state[0].toUpperCase() + state.slice(1));
    const query = new URL(page.url()).searchParams; expect([...query.values()]).toContain(state);
    await page.reload();
    const row = page.getByRole("row").filter({ hasText: text.trim() });
    await expect(row).toHaveCount(1); await expect(row).toContainText(f.name); await expect(row).toContainText("4");
    expect(await row.textContent()).toContain(text); await expect(row).toContainText(new RegExp(state, "i"));
    // 20:30 UTC on Jan 1 is Jan 2, 04:30 in Singapore, independent of browser zone.
    await expect(row).toContainText(/04:30|4:30/); await expect(row).toContainText(/2 Jan|Jan 2|02[/-]01|01[/-]02|2026-01-02/);
    await expect(page.getByText("FOREIGN REVIEW SECRET")).toHaveCount(0);
    expect(await page.evaluate(() => Boolean((window as unknown as { reviewExecuted?: boolean }).reviewExecuted))).toBe(false);
    expect(await row.locator("img").count()).toBe(0);
    const allowed = state === "pending" ? ["Keep", "Hide"] : state === "kept" ? ["Hide"] : ["Restore"];
    for (const label of ["Keep", "Hide", "Restore"]) await expect(row.getByRole("button", { name: label, exact: true })).toHaveCount(allowed.includes(label) ? 1 : 0);
    const before = stored(target); await row.getByRole("button", { name: allowed[0], exact: true }).click();
    const input = page.getByRole("textbox", { name: /reason/i }); await expect(input).toBeVisible();
    for (const quick of quickReasons) { await page.getByRole("button", { name: quick, exact: true }).click(); await expect(input).toHaveValue(quick); }
    await input.fill(reason); await expect(input).toHaveValue(reason); await expect(page.getByRole("button", { name: /confirm/i })).toBeVisible();
    expect(stored(target)).toEqual(before); // Opening/editing a dialog confers no mutation.
  });
});
for (const state of ["pending", "kept", "hidden"] as const) test.describe(`pagination ${state}`, () => {
test("ADM-03.2: configured seven-row queue uses oldest submission then reference ordering and URL previous/next", async ({ page }) => {
  const f = scenario(); const ids = Array.from({ length: 8 }, (_, i) => f.review(state, { [f.reviewText]: `ORDERED REVIEW ${String(i).padStart(2, "0")}`, [f.reviewTime]: i < 2 ? "2026-01-02T00:00:00Z" : submitted }));
  const expected = [...ids.slice(2)].sort().concat(ids.slice(0, 2).sort());
  await login(page.request, f.admin); await page.goto("/admin/moderation");
  await selectTab(page, state[0].toUpperCase() + state.slice(1));
  const bodyRows = page.getByRole("row").filter({ hasText: /ORDERED REVIEW/ }); await expect(bodyRows).toHaveCount(7);
  const expectedLabels = expected.slice(0, 7).map(id => `ORDERED REVIEW ${String(ids.indexOf(id)).padStart(2, "0")}`);
  const content = await bodyRows.allTextContents(); expect(content.map(t => t.match(/ORDERED REVIEW \d+/)![0])).toEqual(expectedLabels);
  await page.getByRole("link", { name: /next/i }).or(page.getByRole("button", { name: /next/i })).click();
  expect([...new URL(page.url()).searchParams.values()]).toContain("2"); await page.reload(); await expect(bodyRows).toHaveCount(1);
  await page.getByRole("link", { name: /previous/i }).or(page.getByRole("button", { name: /previous/i })).click(); await expect(bodyRows).toHaveCount(7);
});
});
test("ADM-03.2: empty tab retains tabs navigation and an empty-state message", async ({ page }) => {
  const f = scenario(); await login(page.request, f.admin); await page.goto("/admin/moderation");
  await selectTab(page, "Hidden"); await expect(page.getByText(/no .*reviews|no reviews|empty/i)).toBeVisible();
  for (const label of ["Pending", "Kept", "Hidden"]) await expect(page.getByRole("tab", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true }))).toBeVisible();
});
test("ADM-03.4 ADM-03.5 ADM-03.6: confirmed browser Keep Hide Restore actions move the unchanged review between tabs", async ({ page }) => {
  const f = scenario(); const id = f.review(); const before = stored(id); await login(page.request, f.admin); await page.goto("/admin/moderation");
  for (const [action, tab] of [["Keep", "Kept"], ["Hide", "Hidden"], ["Restore", "Kept"]]) {
    const row = page.getByRole("row").filter({ hasText: text.trim() }); await row.getByRole("button", { name: action, exact: true }).click();
    await page.getByRole("textbox", { name: /reason/i }).fill(reason);
    const response = page.waitForResponse(r => r.url().includes(`/reviews/${id}/moderation`)); await page.getByRole("button", { name: /confirm/i }).click(); expect((await response).status()).toBe(200);
    await selectTab(page, tab); await expect(page.getByRole("row").filter({ hasText: text.trim() })).toBeVisible();
    expect(stored(id)).toEqual({ ...before, moderation_state: tab.toLowerCase() });
  }
});
test("ADM-03.7: stale confirmation shows record-changed feedback and current state", async ({ page }) => {
  const f = scenario(); const id = f.review(); await login(page.request, f.admin); await page.goto("/admin/moderation");
  await page.getByRole("row").filter({ hasText: text.trim() }).getByRole("button", { name: "Keep", exact: true }).click();
  await page.getByRole("textbox", { name: /reason/i }).fill(reason); expect((await moderate(page.request, id, "hide")).status()).toBe(200);
  const response = page.waitForResponse(r => r.url().includes(`/reviews/${id}/moderation`)); await page.getByRole("button", { name: /confirm/i }).click(); expect((await response).status()).toBe(409);
  await expect(page.getByText(/record changed|review.*changed/i)).toBeVisible(); await expect(page.getByText(/hidden/i).last()).toBeVisible();
});
for (const path of ["/admin/moderation", "/admin/audit"]) test.describe(path, () => {
  test("ADM-03.17: anonymous redirect has no protected data or private loading-shell content", async ({ page, request }) => {
    const f = scenario(); const id = f.review(); auditFixture(f, "keep", id, submitted, "PRIVATE AUDIT REASON");
    const raw = await request.get(path); expect(await raw.text()).not.toContain(text); expect(await raw.text()).not.toContain("PRIVATE AUDIT REASON");
    await page.goto(path); await expect(page).toHaveURL(`${origin}/sign-in`); await expect(page.getByRole("table")).toHaveCount(0);
  });
  for (const role of ["customer", "owner"] as const) test.describe(role, () => {
    test("ADM-03.17: wrong-role rendering returns no queue or audit records", async ({ page }) => {
      const f = scenario(); f.review(); await login(page.request, f[role]); await page.goto(path);
      await expect(page.getByText(text.trim(), { exact: true })).toHaveCount(0); await expect(page.getByRole("table")).toHaveCount(0);
    });
  });
});

