import { expect, test } from "@playwright/test";
import { q, reason, scenario, submitted, text } from "../../integration/moderation/fixtures";
import { auditActions, auditFixture, auditTable, targetAudits } from "../../integration/audit/fixtures";
import { localSql } from "../accounts/local";
import { login, moderate } from "../moderation/helpers";

for (const action of auditActions) test.describe(action, () => {
  test("ADM-03.13 ADM-03.14: each action filter renders exact Singapore-time columns target labels Admin email and escaped reason", async ({ page }) => {
    const f = scenario(); const review = f.review(); const reviewTarget = ["keep", "hide", "restore"].includes(action); const target = reviewTarget ? review : f.cafe;
    auditFixture(f, action, target, submitted, reason);
    const foreign = scenario(); auditFixture(foreign, action, foreign.cafe, submitted, "FOREIGN AUDIT SECRET");
    await login(page.request, f.admin); await page.goto("/admin/audit");
    // Accept either accessible native select or named links; markup is not a public contract.
    const filter = page.getByRole("combobox", { name: /action|filter/i });
    if (await filter.count()) await filter.selectOption(action); else await page.getByRole("link", { name: action, exact: true }).click();
    expect([...new URL(page.url()).searchParams.values()]).toContain(action); await page.reload();
    for (const header of [/time/i, /admin/i, /action/i, /target/i, /reason/i]) await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: reason.trim() }); await expect(row).toHaveCount(1);
    await expect(row).toContainText(f.admin.email); await expect(row).toContainText(action); await expect(row).toContainText(f.name);
    if (reviewTarget) await expect(row).toContainText(review);
    expect(await row.textContent()).toContain(reason); await expect(row.locator("b")).toHaveCount(0);
    await expect(row).toContainText(/04:30|4:30/); await expect(row).toContainText(/2 Jan|Jan 2|02[/-]01|01[/-]02|2026-01-02/);
    await expect(page.getByText("FOREIGN AUDIT SECRET")).toHaveCount(0);
    await expect(page.getByText(text.trim(), { exact: true })).toHaveCount(0);
    const response = await page.request.get("/admin/audit"); const raw = await response.text();
    expect(raw).not.toContain("FOREIGN AUDIT SECRET"); expect(raw).not.toContain(f.customer.email); expect(raw).not.toContain(foreign.admin.email);
  });
});
test("ADM-03.13: audit orders newest first then entry reference and pages exactly 50 rows using URL state", async ({ page }) => {
  const f = scenario(); const review = f.review();
  const entries = Array.from({ length: 52 }, (_, i) => {
    const time = i < 2 ? "2026-01-02T00:00:00Z" : "2026-01-01T00:00:00Z";
    const label = `AUDIT ORDER ${String(i).padStart(2, "0")}`;
    return { id: auditFixture(f, "keep", review, time, label), time, label };
  }).sort((a, b) => b.time.localeCompare(a.time) || a.id.localeCompare(b.id));
  await login(page.request, f.admin); await page.goto("/admin/audit");
  const dataRows = page.getByRole("row").filter({ hasText: /AUDIT ORDER/ }); await expect(dataRows).toHaveCount(50);
  expect((await dataRows.allTextContents()).map(t => t.match(/AUDIT ORDER \d+/)![0])).toEqual(entries.slice(0, 50).map(e => e.label));
  await page.getByRole("link", { name: /next/i }).or(page.getByRole("button", { name: /next/i })).click();
  expect([...new URL(page.url()).searchParams.values()]).toContain("2"); await page.reload(); await expect(dataRows).toHaveCount(2);
  expect((await dataRows.allTextContents()).map(t => t.match(/AUDIT ORDER \d+/)![0])).toEqual(entries.slice(50).map(e => e.label));
  await page.getByRole("link", { name: /previous/i }).or(page.getByRole("button", { name: /previous/i })).click(); await expect(dataRows).toHaveCount(50);
});
test("ADM-03.13: empty audit filter retains filter navigation and a safe empty state", async ({ page }) => {
  const f = scenario(); await login(page.request, f.admin); await page.goto("/admin/audit");
  await expect(page.getByText(/no .*actions|no .*entries|no audit|empty/i)).toBeVisible();
  const filter = page.getByRole("combobox", { name: /action|filter/i });
  if (await filter.count()) {
    for (const action of auditActions) await expect(filter.locator(`option[value="${action}"]`)).toHaveCount(1);
    await expect(filter.getByRole("option", { name: /^all/i })).toHaveCount(1);
  } else for (const action of [...auditActions, "all"]) await expect(page.getByRole("link", { name: action, exact: true })).toBeVisible();
});
test("ADM-03.10 ADM-03.11 ADM-03.14: audit excludes other workspaces review text and internal AI events", async ({ page }) => {
  const f = scenario(); const review = f.review(); auditFixture(f, "keep", review);
  const foreign = scenario(); const target = foreign.review(); auditFixture(foreign, "hide", target, submitted, "FOREIGN AUDIT SECRET");
  localSql(`insert into private.ai_audit_events(environment,operation_id,actor_id,feature,outcome,created_at) values ('local',gen_random_uuid(),${q(f.admin.id)},'moderation_assistant','fallback',now());`);
  await login(page.request, f.admin); await page.goto("/admin/audit");
  const content = await page.locator("body").innerText(); expect(content).not.toContain(text); expect(content).not.toContain("FOREIGN AUDIT SECRET"); expect(content).not.toMatch(/moderation_assistant|provider_attempt|ai_audit_events/);
  expect(content).toContain(f.admin.email); expect(content).not.toContain(foreign.admin.email);
  await page.goto("/admin/moderation"); expect(await page.locator("body").innerText()).not.toContain(foreign.name);
});
test("ADM-03.12 ADM-03.15: later successful actions retain every previous immutable audit entry", async ({ request }) => {
  const f = scenario(); const id = f.review(); await login(request, f.admin);
  const previous: Record<string, unknown>[] = [];
  for (const action of ["keep", "hide", "restore", "hide"]) {
    expect((await moderate(request, id, action, reason)).status()).toBe(200);
    const current = targetAudits(id); for (const old of previous) expect(current).toContainEqual(old);
    expect(current).toHaveLength(previous.length + 1); previous.push(current.find(entry => !previous.some(old => old[auditTable().id] === entry[auditTable().id]))!);
  }
});
