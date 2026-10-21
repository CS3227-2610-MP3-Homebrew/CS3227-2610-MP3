import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { applicationDetails, resubmittedApplication, cafeFields, cafeRow, scenario, q, ident, rows, origin, reason, asActor, targetAudits, ordersFor, order, orderFields, orderStates, columns, column, insert, account, auditTable } from "../../integration/cafe-eligibility/fixtures";
import { localSql, localSqlResult } from "../accounts/local";
import { login } from "../moderation/helpers";
import { mutate } from "./helpers";

const paths = ["/admin/applications", "/admin/cafes"] as const;
const rowFor = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name });
const control = (page: Page, name: RegExp) => page.getByRole("link", { name }).or(page.getByRole("button", { name })).or(page.locator('[aria-disabled="true"]').filter({ hasText: name }));
async function confirm(page: Page, name: string, action: string) {
  await rowFor(page, name).getByRole("button", { name: action, exact: true }).click();
  await page.getByRole("textbox", { name: /reason/i }).fill(reason);
  await page.getByRole("button", { name: /confirm/i }).click();
}

for (const path of paths) test.describe(path, () => {
  const application = path === "/admin/applications";
  test("ADM-01.1 ADM-01.7 ADM-02.1 ADM-02.8: only workspace rows in the required state with 20-row URL pagination and stable ties", async ({ page }) => {
    test.setTimeout(90_000);
    const f = scenario(); const fields = cafeFields();
    const foreign = scenario(); applicationDetails(foreign.cafe, undefined, "FOREIGN CAFE SECRET");
    // Each cafe has its own real owner identity; the queue shares only the verified kit workspace.
    const ids = [f.cafe];
    for (let i = 1; i < 22; i++) {
      const owner = account("owner", f.admin.workspaceId);
      const id = randomUUID(); ids.push(id);
      localSql(`insert into public.cafes(id,workspace_id,owner_id,name,application_state,suspended) values (${q(id)},${q(f.admin.workspaceId)},${q(owner.id)},'Synthetic',${q(application ? "pending" : "approved")},false);`);
    }
    for (const [i, id] of ids.entries()) {
      applicationDetails(id, i < 2 ? "2026-01-02T00:00:00Z" : "2026-01-01T00:00:00Z", application ? `QUEUE CAFE ${String(i).padStart(2, "0")}` : i < 2 ? "QUEUE CAFE Z" : "QUEUE CAFE A");
      localSql(`update public.cafes set application_state=${q(application ? "pending" : "approved")} where id=${q(id)};`);
    }
    // Two filtered controls use existing owners in this same workspace.
    for (const [i, state] of [application ? "approved" : "pending", "rejected"].entries()) {
      localSql(`update public.cafes set application_state=${q(state)} where id=${q(ids[20 + i])};`);
    }
    // 20 eligible rows, plus a 21st to prove the second page.
    localSql(`update public.cafes set application_state=${q(application ? "pending" : "approved")} where id=${q(ids[20])};`);
    const eligible = rows(`select id,name from public.cafes where workspace_id=${q(f.admin.workspaceId)} and application_state=${q(application ? "pending" : "approved")} order by ${application ? fields.submitted : "name"},id`);
    expect(eligible).toHaveLength(21);
    await login(page.request, f.admin); await page.goto(path);
    const visible = page.getByRole("row").filter({ hasText: "QUEUE CAFE" }); await expect(visible).toHaveCount(20);
    const first = await visible.allTextContents();
    // Café reference is already required in audit, but queue ordering can be observed via action URLs/row text.
    const names = eligible.slice(0, 20).map(r => String(r.name));
    for (let i = 0; i < names.length; i++) expect(first[i]).toContain(names[i]);
    if (!application) for (let i = 0; i < 20; i++) {
      // The tied cafe name alone is not evidence of reference tie-breaking. Open each
      // row's real action and observe the path target, cancelling before any write.
      await visible.nth(i).getByRole("button", { name: "Suspend", exact: true }).click();
      await page.getByRole("textbox", { name: /reason/i }).fill(reason);
      const sent = page.waitForRequest(r => r.method() === "POST" && r.url().includes("/suspension"));
      await page.route("**/api/admin/cafes/*/suspension", r => r.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ requestId: "synthetic-conflict", error: { code: "STATE_CONFLICT", message: "Cafe record changed. Current state: suspended." } }) }));
      await page.getByRole("button", { name: /confirm/i }).click();
      expect(new URL((await sent).url()).pathname).toBe(`/api/admin/cafes/${eligible[i].id}/suspension`);
      await page.unroute("**/api/admin/cafes/*/suspension"); await page.goto(path);
    }
    await expect(page.getByText("FOREIGN CAFE SECRET")).toHaveCount(0);
    await control(page, /next/i).click(); expect([...new URL(page.url()).searchParams.values()]).toContain("2"); await page.reload();
    await expect(visible).toHaveCount(1); await expect(visible).toContainText(String(eligible[20].name));
    await control(page, /previous/i).click(); await expect(visible).toHaveCount(20);
  });
  test("ADM-01.1 ADM-02.1: empty list shows an empty state and retains previous/next controls", async ({ page }) => {
    const f = scenario(true, application ? "approved" : "rejected"); await login(page.request, f.admin); await page.goto(path);
    await expect(page.getByText(/no .*applications|no .*cafés|no .*cafes|empty/i)).toBeVisible();
    await expect(control(page, /previous/i)).toBeVisible(); await expect(control(page, /next/i)).toBeVisible();
  });
  for (const role of ["anonymous", "customer", "owner"] as const) test.describe(role, () => {
  test("ADM-01.13 ADM-02.13: gets no protected server or loading content", async ({ page }) => {
    const f = scenario(true, application ? "pending" : "approved"); localSql(`update public.cafes set name='PRIVATE APPLICATION MARKER' where id=${q(f.cafe)};`);
    if (role !== "anonymous") await login(page.request, f[role]);
    const response = await page.request.get(path); const raw = await response.text();
    expect(raw).not.toContain("PRIVATE APPLICATION MARKER"); expect(raw).not.toContain("123 Synthetic Pickup Lane");
    await page.goto(path); await expect(page.getByRole("table")).toHaveCount(0);
    if (role === "anonymous") await expect(page).toHaveURL(`${origin}/sign-in`);
  });
  });
});

test("ADM-01.1 ADM-01.2 ADM-01.3: application details and reason confirmation decide and remove a row", async ({ page }) => {
  for (const decision of ["Approve", "Reject"]) {
    await page.context().clearCookies();
    const f = scenario(); applicationDetails(f.cafe); await login(page.request, f.admin); await page.goto("/admin/applications");
    const row = rowFor(page, f.name); await expect(row).toContainText("Synthetic application description"); await expect(row).toContainText("Central");
    await expect(row).toContainText("123 Synthetic Pickup Lane"); await expect(row).toContainText("15");
    const before = cafeRow(f.cafe); await row.getByRole("button", { name: decision, exact: true }).click();
    await page.getByRole("textbox", { name: /reason/i }).fill(reason); expect(cafeRow(f.cafe)).toEqual(before);
    await page.getByRole("button", { name: /confirm/i }).click(); await expect(row).toHaveCount(0);
    expect(cafeRow(f.cafe).application_state).toBe(decision === "Approve" ? "approved" : "rejected");
  }
});
test("ADM-02.1 ADM-02.2 ADM-02.3: confirmed Suspend and Un-suspend controls reflect current state", async ({ page }) => {
  const f = scenario(true, "approved"); applicationDetails(f.cafe); await login(page.request, f.admin); await page.goto("/admin/cafes");
  await confirm(page, f.name, "Suspend"); await expect(rowFor(page, f.name).getByRole("button", { name: "Un-suspend", exact: true })).toBeVisible();
  expect(cafeRow(f.cafe).suspended).toBe(true);
  await confirm(page, f.name, "Un-suspend"); await expect(rowFor(page, f.name).getByRole("button", { name: "Suspend", exact: true })).toBeVisible();
  expect(cafeRow(f.cafe).suspended).toBe(false);
});
for (const op of ["decision", "suspension"] as const) test(`ADM-01.8 ADM-02.4: stale ${op} confirmation reports record changed and current state`, async ({ page }) => {
  const f = scenario(true, op === "decision" ? "pending" : "approved"); applicationDetails(f.cafe); await login(page.request, f.admin);
  await page.goto(op === "decision" ? "/admin/applications" : "/admin/cafes");
  await rowFor(page, f.name).getByRole("button", { name: op === "decision" ? "Approve" : "Suspend", exact: true }).click();
  await page.getByRole("textbox", { name: /reason/i }).fill(reason);
  expect((await mutate(page.request, f.cafe, op, op === "decision" ? { decision: "reject", reason } : { suspended: true, reason })).status()).toBe(200);
  const response = page.waitForResponse(r => r.url().endsWith(`/${op}`)); await page.getByRole("button", { name: /confirm/i }).click(); expect((await response).status()).toBe(409);
  await expect(page.getByText(/record changed|café.*changed|cafe.*changed/i)).toBeVisible(); await expect(page.getByText(op === "decision" ? /rejected/i : /suspended/i).last()).toBeVisible();
});

for (const action of ["approve", "reject", "suspend", "un-suspend"] as const) test(`ADM-01.4 ADM-01.9 ADM-02.5 ADM-02.11: ${action} real audit displays acting Admin, target, escaped exact reason and timestamp`, async ({ page }) => {
  const f = scenario(true, ["approve", "reject"].includes(action) ? "pending" : "approved", action === "un-suspend");
  await login(page.request, f.admin); const decision = action === "approve" || action === "reject";
  expect((await mutate(page.request, f.cafe, decision ? "decision" : "suspension", decision ? { decision: action, reason } : { suspended: action === "suspend", reason })).status()).toBe(200);
  await page.goto(`/admin/audit?action=${encodeURIComponent(action)}`);
  const row = page.getByRole("row").filter({ hasText: reason.trim() }); await expect(row).toHaveCount(1);
  await expect(row).toContainText(f.admin.email); await expect(row).toContainText(action); await expect(row).toContainText(f.cafe);
  expect(await row.textContent()).toContain(reason); await expect(row.locator("b")).toHaveCount(0);
  const entries = targetAudits(f.cafe); expect(entries).toHaveLength(1);
  const timestamp = new Date(String(entries[0][auditTable().time]));
  await expect(row).toContainText(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(timestamp));
});

test("ADM-01.10 ADM-02.10: latest private reasons reach own owner and workspace Admin through RLS but no customer, unrelated owner or foreign Admin", async ({ request }) => {
  const f = scenario(); const foreign = scenario(); const outsider = account("owner", f.admin.workspaceId);
  await login(request, f.admin); expect((await mutate(request, f.cafe, "decision")).status()).toBe(200);
  expect((await mutate(request, f.cafe, "suspension")).status()).toBe(200);
  const decision = column("public", "cafe_admin_reasons", ["decision_reason"]);
  const suspension = column("public", "cafe_admin_reasons", ["suspension_reason"]);
  const read = `select coalesce(json_agg(t),'[]'::json) from (select ${ident(decision)} as decision_reason,${ident(suspension)} as suspension_reason from public.cafe_admin_reasons where cafe_id=${q(f.cafe)}) t;`;
  for (const actor of [f.owner, f.admin]) {
    expect(JSON.parse(asActor(actor.id, read))).toEqual([{ decision_reason: reason, suspension_reason: reason }]);
  }
  expect(columns("public", "cafes").filter(name => name.includes("reason"))).toEqual([]);
  for (const actor of [f.customer, outsider, foreign.admin, foreign.owner]) {
    // A zero-row RLS result or an explicit SQL permission denial both prevent
    // disclosure; syntax, connection and other failures do not count as denials.
    const result = localSqlResult(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor.id }))}; set local request.jwt.claim.sub=${q(actor.id)}; ${read} rollback;`);
    if (result.status === 0) expect(result.stdout).not.toContain(reason);
    else expect(result.stderr).toMatch(/42501/);
    for (const table of ["orders", "reviews", "admin_audit_entries"]) {
      expect(asActor(actor.id, `select coalesce(json_agg(t),'[]'::json) from public.${table} t;`)).not.toContain(reason);
    }
  }
});

test("ADM-01.11: resubmitted application fixture re-enters queue at new submission position with old reason/history retained", async ({ request, page }) => {
  const f = scenario(); applicationDetails(f.cafe); await login(request, f.admin);
  expect((await mutate(request, f.cafe, "decision", { decision: "reject", reason })).status()).toBe(200); const before = targetAudits(f.cafe);
  const peer = randomUUID(); const peerOwner = account("owner", f.admin.workspaceId);
  insert("public.cafes", { id: peer, workspace_id: f.admin.workspaceId, owner_id: peerOwner.id, name: "Earlier pending application", application_state: "pending", suspended: false });
  applicationDetails(peer, "2026-01-02T00:00:00Z");
  resubmittedApplication(f.cafe, "2026-01-03T00:00:00Z");
  expect(targetAudits(f.cafe)).toEqual(before);
  const decision = column("public", "cafe_admin_reasons", ["decision_reason"]);
  expect(JSON.parse(asActor(f.owner.id, `select to_json(${ident(decision)}) from public.cafe_admin_reasons where cafe_id=${q(f.cafe)};`))).toBe(reason);
  await login(page.request, f.admin); await page.goto("/admin/applications"); await expect(rowFor(page, f.name)).toBeVisible();
  const queue = await page.getByRole("row").allTextContents();
  expect(queue.findIndex(text => text.includes("Earlier pending application"))).toBeGreaterThanOrEqual(0);
  expect(queue.findIndex(text => text.includes("Earlier pending application"))).toBeLessThan(queue.findIndex(text => text.includes(f.name)));
});

test("ADM-02.9 ADM-02.10: suspension preserves menu, hours, reviews and owner RLS access with retained orders", async ({ request }) => {
  const f = scenario(true, "approved"); applicationDetails(f.cafe); for (const state of orderStates) order(f, state); f.review();
  for (const [table, values] of [["menu_items", { name: "Synthetic drink", drink_type: "coffee", price_cents: 500, sold_out: false, removed: false }],
    ["opening_hours", { weekday: 1, start_time: "09:00", end_time: "17:00", opens_at: "09:00", closes_at: "17:00" }]] as const) {
    const available = columns("public", table);
    insert(`public.${table}`, { id: randomUUID(), cafe_id: f.cafe, ...Object.fromEntries(Object.entries(values).filter(([key]) => available.includes(key))) });
  }
  const snapshot = () => Object.fromEntries(["menu_items", "opening_hours", "reviews"].map(table => [table, rows(table === "reviews" ? `select r.* from public.reviews r join public.orders o on o.id=r.order_id where o.cafe_id=${q(f.cafe)} order by r.id` : `select * from public.${table} where cafe_id=${q(f.cafe)} order by id`)]));
  const before = snapshot(); const orders = ordersFor(f.cafe); await login(request, f.admin); expect((await mutate(request, f.cafe, "suspension")).status()).toBe(200);
  for (const records of Object.values(before)) expect(records.length).toBeGreaterThan(0);
  expect(snapshot()).toEqual(before); expect(ordersFor(f.cafe)).toHaveLength(orders.length); expect(cafeRow(f.cafe).application_state).toBe("approved");
  expect(asActor(f.owner.id, `select count(*) from public.cafes where id=${q(f.cafe)};`)).toBe("1");
  for (const table of ["menu_items", "opening_hours", "orders"]) {
    expect(Number(asActor(f.owner.id, `select count(*) from public.${table} where cafe_id=${q(f.cafe)};`))).toBeGreaterThan(0);
  }
});

test("ADM-02.9: collected fixture survives suspension while ready fixture is cancelled and never revived", async ({ request }) => {
  const f = scenario(true, "approved"); const first = order(f, "collected"); const second = order(f, "ready"); const c = orderFields();
  const before = ordersFor(f.cafe).find(r => r.id === first); await login(request, f.admin);
  expect((await mutate(request, f.cafe, "suspension")).status()).toBe(200);
  expect(ordersFor(f.cafe).find(r => r.id === first)).toEqual(before);
  expect(ordersFor(f.cafe).find(r => r.id === second)).toMatchObject({ [c.state]: "cancelled", [c.reason]: "Cafe is suspended" });
  const suspendedOrders = ordersFor(f.cafe);
  expect((await mutate(request, f.cafe, "suspension", { suspended: false, reason })).status()).toBe(200);
  expect(ordersFor(f.cafe)).toEqual(suspendedOrders);
});
