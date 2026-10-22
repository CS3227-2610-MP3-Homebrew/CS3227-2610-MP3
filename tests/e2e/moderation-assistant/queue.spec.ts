import { expect, test, type Page } from "@playwright/test";
import { quickReasons, scenario, stored, text } from "../../integration/moderation/fixtures";
import { targetAudits } from "../../integration/audit/fixtures";
import { login, moderate } from "../moderation/helpers";

const triage = (page: Page) => page.getByRole("button", { name: "Triage pending reviews", exact: true });
const row = (page: Page, content: string) => page.getByRole("row").filter({ hasText: content });
const labels = ["ok", "spam", "abusive", "off-topic", "injection attempt"];
const modelReason = '<img src=x onerror="window.adviceExecuted=true"> [unsafe](https://evil.invalid)';
async function advice(page: Page, ids: string[]) {
  await page.route("**/api/ai/moderation", route => route.fulfill({ json: { requestId: "synthetic", feature: "moderation", mode: "ai", source: "provider", data: { classifications: ids.map((reviewId, i) => ({ reviewId, label: labels[i % 5], reason: modelReason })) } } }));
}
test("ADM-04.1: Pending-only control disables on empty page and sends exactly seven visible references once without pagination", async ({ page }) => {
  const f = scenario(); await login(page.request, f.admin); await page.goto("/admin/moderation"); await expect(triage(page)).toBeDisabled();
  const ids = Array.from({ length: 8 }, (_, i) => f.review("pending", { [f.reviewText]: `BATCH ${i}` }));
  await page.reload(); const calls: unknown[] = []; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/ai/moderation", async route => { calls.push(route.request().postDataJSON()); await gate; await route.fulfill({ json: { requestId: "batch", feature: "moderation", mode: "fallback", reason: "disabled", fallback: "manual_queue" } }); });
  await triage(page).click(); await expect.poll(() => calls.length).toBe(1); await expect(triage(page)).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: /triag|loading|progress/i })).toBeVisible();
  const selected = (calls[0] as { reviewIds: string[] }).reviewIds;
  expect(calls[0]).toEqual({ reviewIds: [...ids].sort().slice(0, 7) }); expect(new Set(selected).size).toBe(7);
  release(); await expect(triage(page)).toBeEnabled(); expect(calls).toHaveLength(1);
  for (const name of ["Kept", "Hidden"]) { await page.getByRole("link", { name, exact: true }).click(); await expect(triage(page)).toHaveCount(0); }
});
test("ADM-04.2 ADM-04.3 ADM-04.7 ADM-04.15 ADM-04.16: five inert suggestions highlight without selecting; ordinary editable per-review confirmation preserves remaining advice", async ({ page }) => {
  const f = scenario(); const ids = labels.map((_, i) => f.review("pending", { [f.reviewText]: `LABEL REVIEW ${i}` }));
  const before = ids.map(stored); await login(page.request, f.admin); await advice(page, ids); await page.goto("/admin/moderation"); await triage(page).click();
  for (let i = 0; i < ids.length; i++) {
    const r = row(page, `LABEL REVIEW ${i}`); await expect(r.getByText(/AI suggestion/i)).toBeVisible(); await expect(r.getByText(labels[i], { exact: true })).toBeVisible();
    await expect(r.getByText(modelReason, { exact: true })).toBeVisible(); expect(await r.locator("img,script").count()).toBe(0);
    const button = r.getByRole("button", { name: i === 0 ? "Keep" : "Hide", exact: true });
    const other = r.getByRole("button", { name: i === 0 ? "Hide" : "Keep", exact: true });
    // Assert a visual or accessible distinction without prescribing CSS tokens.
    const indication = async (target: typeof button) => Promise.all(["class", "aria-describedby", "title"].map(name => target.getAttribute(name)));
    expect(await indication(button)).not.toEqual(await indication(other));
    await expect(r.getByRole("textbox")).toHaveCount(0); expect(stored(ids[i])).toEqual(before[i]); expect(targetAudits(ids[i])).toHaveLength(0);
  }
  expect(await page.evaluate(() => Boolean((window as unknown as { adviceExecuted?: boolean }).adviceExecuted))).toBe(false);
  await expect(page.getByRole("button", { name: /apply all/i })).toHaveCount(0);
  const r = row(page, "LABEL REVIEW 0"); await r.getByRole("button", { name: "Keep", exact: true }).click(); const input = r.getByRole("textbox", { name: /reason/i }); await expect(input).toHaveValue("");
  for (const reason of quickReasons) { await r.getByRole("button", { name: reason, exact: true }).click(); await expect(input).toHaveValue(reason); }
  await input.fill("  My edited <b>reason</b> 😀  ");
  const waiting = page.waitForRequest(req => req.url().endsWith(`/reviews/${ids[0]}/moderation`)); await r.getByRole("button", { name: /confirm/i }).click();
  const req = await waiting; expect(req.postDataJSON()).toEqual({ action: "keep", reason: "  My edited <b>reason</b> 😀  " });
  await expect(r).toHaveCount(0); expect(targetAudits(ids[0]).map(a => a.reason)).toEqual(["  My edited <b>reason</b> 😀  "]);
  for (let i = 1; i < ids.length; i++) await expect(row(page, `LABEL REVIEW ${i}`).getByText(/AI suggestion/i)).toBeVisible();
  await page.reload(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
});
test("ADM-04.8: stale ordinary confirmation removes affected advice and shows current state without another mutation", async ({ page }) => {
  const f = scenario(); const id = f.review(); await login(page.request, f.admin); await advice(page, [id]); await page.goto("/admin/moderation"); await triage(page).click();
  const r = row(page, text.trim()); await expect(r.getByText(/AI suggestion/i)).toBeVisible(); await r.getByRole("button", { name: "Keep", exact: true }).click(); await r.getByRole("textbox", { name: /reason/i }).fill("Looks fine");
  expect((await moderate(page.request, id, "hide")).status()).toBe(200); const before = stored(id); const audits = targetAudits(id);
  const response = page.waitForResponse(r => r.url().endsWith(`/reviews/${id}/moderation`)); await r.getByRole("button", { name: /confirm/i }).click(); expect((await response).status()).toBe(409);
  await expect(page.getByText(/record changed|review.*changed/i)).toBeVisible(); await expect(page.getByText(/current state: hidden/i)).toBeVisible(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
  expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
});
for (const reason of ["disabled", "usage_limited", "unavailable"]) test.describe(reason, () => {
  test("ADM-04.11 ADM-04.12 ADM-04.13: explains safe fallback and leaves manual queue usable", async ({ page }) => {
    const f = scenario(); f.review(); await login(page.request, f.admin);
    await page.route("**/api/ai/moderation", route => route.fulfill({ json: { requestId: "fallback", feature: "moderation", mode: "fallback", reason, fallback: "manual_queue" } }));
    await page.goto("/admin/moderation"); await triage(page).click();
    await expect(page.getByRole("status").filter({ hasText: reason === "usage_limited" ? /limit/i : new RegExp(reason, "i") })).toBeVisible(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
    await row(page, text.trim()).getByRole("button", { name: "Keep", exact: true }).click(); await expect(page.getByRole("textbox", { name: /reason/i })).toBeVisible();
  });
});
test("ADM-04.14: changed queue selection reports reload and renders no advice", async ({ page }) => {
  const f = scenario(); f.review(); await login(page.request, f.admin);
  await page.route("**/api/ai/moderation", route => route.fulfill({ status: 400, json: { requestId: "changed", error: { code: "INVALID_REQUEST", message: "Queue changed." } } }));
  await page.goto("/admin/moderation"); await triage(page).click(); await expect(page.getByText(/queue.*changed/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /reload/i }).or(page.getByRole("link", { name: /reload/i }))).toBeVisible(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
});
test("ADM-04.15: page selection discards transient suggestions", async ({ page }) => {
  const f = scenario(); const ids = Array.from({ length: 8 }, (_, i) => f.review("pending", { [f.reviewText]: `PAGE REVIEW ${i}` }));
  await login(page.request, f.admin); await advice(page, [...ids].sort().slice(0, 7)); await page.goto("/admin/moderation"); await triage(page).click(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(7);
  await page.getByRole("link", { name: "Next", exact: true }).click(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
  await page.getByRole("link", { name: "Previous", exact: true }).click(); await expect(page.getByText(/AI suggestion/i)).toHaveCount(0);
});

