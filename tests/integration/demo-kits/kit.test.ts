// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { demoModule, type Kit } from "./contracts";
import { localAuthConfiguration, localSqlResult } from "../../e2e/accounts/local";
import { rows, q, column, scenario } from "../moderation/fixtures";
import { clock, rpcAs, request } from "../usage/local";
import { prepFixture } from "../ai-state/fixtures";
import { limits, usageModule } from "../../unit/usage/contracts";
vi.mock("server-only", () => ({}));
let kit: Kit;
let workspace: string;
let otherKit: Kit;
let creationLogs: string;
let outbound: string[];
let mainWorkspace: string;
let profiles: Record<string, unknown>[];
const now = new Date("2040-07-29T04:00:00Z");
beforeAll(async () => {
  const api = await demoModule(); const config = localAuthConfiguration();
  const client = createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const logs = [vi.spyOn(console, "log").mockImplementation(() => {}), vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
  outbound = []; const originalFetch = globalThis.fetch;
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input)); outbound.push(url.origin);
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Live outbound request blocked by demo-kit tests");
    return originalFetch(input, init);
  });
  try {
    kit = await api.provisionDemoKit({ auth: client.auth.admin, rpc: rpcAs(), now: () => now });
    otherKit = await api.provisionDemoKit({ auth: client.auth.admin, rpc: rpcAs(), now: () => new Date("2041-07-29T04:00:00Z") });
    creationLogs = JSON.stringify(logs.map(log => log.mock.calls));
  } finally { fetchSpy.mockRestore(); logs.forEach(log => log.mockRestore()); }
  profiles = rows(`select p.*,u.email from public.profiles p join auth.users u on u.id=p.id where p.workspace_id=(select p.workspace_id from public.profiles p join auth.users u on u.id=p.id where u.email=${q(kit.accounts[0].email)})`);
  workspace = String(profiles[0].workspace_id);
  const main = scenario(false); main.review(); mainWorkspace = main.admin.workspaceId;
});
afterAll(() => vi.restoreAllMocks());
const actor = (role: string) => String(profiles.find(p => p.role === role && kit.accounts.some(a => a.email === p.email))!.id);
const cafes = () => rows(`select * from public.cafes where workspace_id=${q(workspace)}`);
function asActor(id: string, statement: string) {
  return localSqlResult(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: id }))}; set local request.jwt.claim.sub=${q(id)}; ${statement} rollback;`);
}
function value(statement: string) {
  const result = asActor(actor("admin"), statement); expect(result.status, result.stderr).toBe(0); return JSON.parse(result.stdout);
}
test("SYS-12.4 SYS-12.5 SEC-10.2: three secure distinct random credentials share a code and sign in normally", async () => {
  expect(kit).toEqual({ accounts: expect.any(Array) }); expect(kit.accounts).toHaveLength(3);
  expect(kit.accounts.map(a => a.role).sort()).toEqual(["admin", "customer", "owner"]);
  const codes = kit.accounts.map(a => {
    expect(a).toEqual({ role: a.role, email: expect.any(String), password: expect.any(String) });
    const match = a.email.match(new RegExp(`^${a.role}-([a-zA-Z0-9_-]+)@example\\.com$`)); expect(match).not.toBeNull();
    expect(a.password.length).toBeGreaterThanOrEqual(16); return match![1];
  });
  expect(new Set(codes).size).toBe(1); expect(new Set(kit.accounts.map(a => a.password)).size).toBe(3);
  const config = localAuthConfiguration();
  for (const account of kit.accounts) {
    const client = createClient(config.url, config.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    expect(result.error).toBeNull(); expect(result.data.user?.id).toBe(actor(account.role));
  }
  expect(profiles.every(p => p.workspace_id === workspace)).toBe(true);
  expect(rows(`select is_main from public.workspaces where id=${q(workspace)}`)).toEqual([{ is_main: false }]);
});
test("SYS-12.5 SEC-10.2: plaintext passwords occur in no persisted application row, Auth metadata, cache or audit", () => {
  // Search all ordinary application tables, including private bookkeeping and any new kit table.
  const tables = rows(`select n.nspname as schema,c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','private')`);
  for (const table of tables) {
    const name = `"${String(table.schema).replaceAll('"','""')}"."${String(table.name).replaceAll('"','""')}"`;
    for (const account of kit.accounts) expect(rows(`select count(*)::int as count from ${name} t where position(${q(account.password)} in row_to_json(t)::text)>0`)).toEqual([{ count: 0 }]);
  }
  for (const account of kit.accounts) {
    expect(rows(`select id from auth.users where position(${q(account.password)} in coalesce(raw_user_meta_data::text,'')||coalesce(raw_app_meta_data::text,''))>0`)).toEqual([]);
    expect(rows(`select encrypted_password=${q(account.password)} as plaintext from auth.users where email=${q(account.email)}`)).toEqual([{ plaintext: false }]);
  }
});
test("SYS-12.9: approved owner café includes usable menu, sold-out item, opening hours and pickup rules", () => {
  const approved = cafes().filter(c => c.application_state === "approved"); expect(approved).toHaveLength(1);
  const cafe = approved[0]; expect(cafe.owner_id).toBe(actor("owner")); expect(cafe.suspended).toBe(false);
  expect(String(cafe.name).trim().length).toBeGreaterThan(0);
  expect(Number.isInteger(cafe.pickup_cutoff_minutes)).toBe(true); expect(Number(cafe.pickup_cutoff_minutes)).toBeGreaterThanOrEqual(0); expect(Number(cafe.pickup_cutoff_minutes)).toBeLessThanOrEqual(180);
  const menu = rows(`select * from public.menu_items where cafe_id=${q(cafe.id)}`);
  expect(menu.some(m => m.sold_out === true)).toBe(true); expect(menu.some(m => m.sold_out === false)).toBe(true);
  for (const item of menu) { expect(String(item.name).trim().length).toBeGreaterThan(0); expect(Number(item.price_cents)).toBeGreaterThan(0); }
  const hours = rows(`select * from public.opening_hours where cafe_id=${q(cafe.id)}`); expect(hours.length).toBeGreaterThan(0);
  for (const interval of hours) { expect(Number(interval.weekday)).toBeGreaterThanOrEqual(1); expect(Number(interval.weekday)).toBeLessThanOrEqual(7); expect(interval.opens_at).toBeTruthy(); expect(interval.closes_at).toBeTruthy(); }
});
test("SYS-12.9: review-eligible collected orders, other states and four weeks of item sales are relative to creation", () => {
  const cafe = cafes().find(c => c.application_state === "approved")!;
  const orders = rows(`select o.*,exists(select 1 from public.reviews r where r.order_id=o.id) as reviewed from public.orders o where cafe_id=${q(cafe.id)}`);
  expect(orders.filter(o => o.customer_id === actor("customer") && o.state === "collected" && !o.reviewed).length).toBeGreaterThanOrEqual(3);
  expect(orders.some(o => o.customer_id === actor("customer") && o.state !== "collected")).toBe(true);
  const collectedAt = column("public", "orders", ["collected_at"]);
  const history = orders.filter(o => o.state === "collected"); expect(history.length).toBeGreaterThan(3);
  const times = history.map(o => new Date(String(o[collectedAt])).getTime());
  expect(Math.min(...times)).toBeGreaterThanOrEqual(now.getTime() - 31 * 86400000);
  expect(Math.min(...times)).toBeLessThanOrEqual(now.getTime() - 25 * 86400000);
  expect(Math.max(...times)).toBeLessThanOrEqual(now.getTime()); expect(Math.max(...times)).toBeGreaterThanOrEqual(now.getTime() - 2 * 86400000);
  const quantity = column("public", "order_items", ["quantity"]); const price = column("public", "order_items", ["unit_price_cents", "price_cents"]);
  for (const order of history) {
    const items = rows(`select * from public.order_items where order_id=${q(order.id)}`); expect(items.length).toBeGreaterThan(0);
    for (const item of items) { expect(Number.isInteger(item[quantity])).toBe(true); expect(Number(item[quantity])).toBeGreaterThan(0); expect(Number.isInteger(item[price])).toBe(true); expect(Number(item[price])).toBeGreaterThan(0); }
  }
});
test("SYS-12.10 SEC-10.2: pending second café has a separate unpublished owner without returned credentials", () => {
  expect(cafes()).toHaveLength(2); const pending = cafes().filter(c => c.application_state === "pending"); expect(pending).toHaveLength(1);
  expect(pending[0].owner_id).not.toBe(actor("owner")); expect(profiles).toHaveLength(4);
  const unpublished = profiles.find(p => p.id === pending[0].owner_id)!;
  expect(unpublished.role).toBe("owner"); expect(kit.accounts.some(a => a.email === unpublished.email)).toBe(false);
});
test("SYS-12.11 SEC-10.3: synthetic spam, abuse and instruction injection remain pending untrusted review text", () => {
  const reviews = rows(`select r.* from public.reviews r join public.orders o on o.id=r.order_id join public.cafes c on c.id=o.cafe_id where c.workspace_id=${q(workspace)} and c.application_state='approved'`);
  const pending = reviews.filter(r => r.moderation_state === "pending"); expect(pending.length).toBeGreaterThanOrEqual(3);
  const text = pending.map(r => String(r.text)).join("\n"); expect(text).toMatch(/synthetic/i); expect(text).toMatch(/spam/i); expect(text).toMatch(/abus/i); expect(text).toMatch(/ignore|system|instruction/i);
  expect(rows(`select id from public.admin_audit_entries where workspace_id=${q(workspace)}`)).toEqual([]);
});
for (const action of ["keep", "hide", "restore"] as const) describe(action, () => {
  test("SYS-12.12 SEC-10.3: ordinary moderation requires reasons, preserves text and creates scoped audit", () => {
    const target = rows(`select r.* from public.reviews r join public.orders o on o.id=r.order_id join public.cafes c on c.id=o.cafe_id where c.workspace_id=${q(workspace)} limit 1`)[0];
    const setup = action === "restore" ? `select public.moderate_review(${q(target.id)},'hide','Spam');` : "";
    const result = asActor(actor("admin"), `${setup} select public.moderate_review(${q(target.id)},${q(action)},'Looks fine'); select json_build_object('text',(select text from public.reviews where id=${q(target.id)}),'audits',(select count(*) from public.admin_audit_entries where workspace_id=${q(workspace)}));`);
    expect(result.status, result.stderr).toBe(0);
    const last = JSON.parse(result.stdout.split("\n").at(-1)!); expect(last.text).toBe(target.text); expect(Number(last.audits)).toBe(action === "restore" ? 2 : 1);
    expect(value(`select public.moderate_review(${q(target.id)},'hide','');`)).toMatchObject({ error: "INVALID_REQUEST" });
  });
});
test("SYS-12.12 SEC-10.3: kit Admin cannot change roles or create Admin profiles", () => {
  const update = asActor(actor("admin"), `update public.profiles set role='admin' where id=${q(actor("customer"))};`);
  expect(update.status).not.toBe(0); expect(update.stderr).toMatch(/42501|permission denied/i);
  const insert = asActor(actor("admin"), `insert into public.profiles(id,workspace_id,role) values(gen_random_uuid(),${q(workspace)},'admin');`);
  expect(insert.status).not.toBe(0); expect(insert.stderr).toMatch(/42501|permission denied/i);
});
test("SYS-12.12: kit accounts retain separate AI user caps and share global provider caps with main", async () => {
  const api = await usageModule();
  const main = rows("select id from public.profiles where role='customer' and workspace_id=(select id from public.workspaces where is_main) limit 1")[0]; expect(main).toBeDefined();
  const policy = limits({ AI_USER_ACTIONS_PER_DAY: 1, AI_GLOBAL_CALLS_PER_DAY: 2 });
  const make = () => api.createUsageAdmission({ environment: "ci", limits: policy, rpc: rpcAs(), databaseClock: clock("2059-01-01T00:00:00Z") });
  for (const id of [actor("customer"), String(main.id)]) {
    expect(await make().reserve(request({ actorId: id, event: "action" }))).toMatchObject({ admitted: true });
    expect(await make().reserve(request({ actorId: id, event: "action" }))).toMatchObject({ admitted: false });
  }
  expect(await make().reserve(request({ actorId: actor("customer") }))).toMatchObject({ admitted: true });
  expect(await make().reserve(request({ actorId: String(main.id) }))).toMatchObject({ admitted: true });
  expect(await make().reserve(request({ actorId: actor("admin"), feature: "moderation-assistant" }))).toMatchObject({ admitted: false });
});

test("SYS-12.5 SYS-12.8 SEC-10.2: independent creations use fresh secrets without LLM traffic, logs or expiry", () => {
  expect(outbound.every(url => new URL(url).hostname === "127.0.0.1" || new URL(url).hostname === "localhost")).toBe(true);
  expect(new Set([...kit.accounts, ...otherKit.accounts].map(a => a.email)).size).toBe(6);
  expect(new Set([...kit.accounts, ...otherKit.accounts].map(a => a.password)).size).toBe(6);
  for (const account of [...kit.accounts, ...otherKit.accounts]) expect(creationLogs).not.toContain(account.password);
  // A later creation cannot expire/delete the older kit. Scheduler absence is also inspected at review.
  expect(rows(`select id from public.workspaces where id=${q(workspace)}`)).toHaveLength(1);
  expect(rows(`select id from public.profiles where workspace_id=${q(workspace)}`)).toHaveLength(4);
});
for (const target of ["main", "other-kit"] as const) describe(target, () => {
  test("SYS-12.12 SEC-10.3: provisioned kit Admin cannot read or moderate foreign domain records under RLS", () => {
    const foreignWorkspace = target === "main" ? mainWorkspace
      : rows(`select p.workspace_id as id from public.profiles p join auth.users u on u.id=p.id where u.email=${q(otherKit.accounts[0].email)}`)[0].id;
    for (const table of ["cafes", "menu_items", "opening_hours", "orders", "order_items", "reviews"]) {
      const joins = table === "cafes" ? `select t.id from public.cafes t where t.workspace_id=${q(foreignWorkspace)}`
        : table === "reviews" ? `select t.id from public.reviews t join public.orders o on o.id=t.order_id join public.cafes c on c.id=o.cafe_id where c.workspace_id=${q(foreignWorkspace)}`
        : `select t.id from public.${table} t join public.cafes c on c.id=t.cafe_id where c.workspace_id=${q(foreignWorkspace)}`;
      const result = asActor(actor("admin"), `select coalesce(json_agg(x),'[]'::json) from (${joins}) x;`);
      expect(result.status, result.stderr).toBe(0); expect(JSON.parse(result.stdout)).toEqual([]);
    }
    const foreignReviews = rows(`select r.id from public.reviews r join public.orders o on o.id=r.order_id join public.cafes c on c.id=o.cafe_id where c.workspace_id=${q(foreignWorkspace)} limit 1`);
    expect(foreignReviews.length).toBeGreaterThan(0);
    expect(value(`select public.moderate_review(${q(foreignReviews[0].id)},'hide','Spam');`)).toMatchObject({ error: "NOT_FOUND" });
    const foreignCafe = rows(`select id from public.cafes where workspace_id=${q(foreignWorkspace)} limit 1`)[0]; expect(foreignCafe).toBeDefined();
    expect(value(`select public.set_cafe_suspension(${q(foreignCafe.id)},true,'Safety');`)).toMatchObject({ error: "NOT_FOUND" });
    expect(value(`select public.decide_cafe(${q(foreignCafe.id)},'approve','Looks fine');`)).toMatchObject({ error: "NOT_FOUND" });
  });
});

for (const decision of ["approve", "reject"] as const) describe(decision, () => {
  test("SYS-12.10 SYS-12.12 SEC-10.3: kit Admin can decide the unpublished owner's application with reason and audit", () => {
    const pending = cafes().find(c => c.application_state === "pending")!;
    expect(value(`select public.decide_cafe(${q(pending.id)},${q(decision)},'Looks fine');`)).toEqual({ applicationState: decision === "approve" ? "approved" : "rejected" });
    expect(value(`select public.decide_cafe(${q(pending.id)},${q(decision)},'');`)).toMatchObject({ error: "INVALID_REQUEST" });
  });
});
test("SYS-12.12 SEC-10.3: kit Admin suspension and reversal preserve collected history and audit both actions", () => {
  const cafe = cafes().find(c => c.application_state === "approved")!;
  const result = asActor(actor("admin"), `select public.set_cafe_suspension(${q(cafe.id)},true,'Safety'); select public.set_cafe_suspension(${q(cafe.id)},false,'Resolved'); select json_build_object('suspended',(select suspended from public.cafes where id=${q(cafe.id)}),'collected',(select count(*) from public.orders where cafe_id=${q(cafe.id)} and state='collected'),'audits',(select count(*) from public.admin_audit_entries where workspace_id=${q(workspace)}));`);
  expect(result.status, result.stderr).toBe(0);
  const last = JSON.parse(result.stdout.split("\n").at(-1)!); expect(last.suspended).toBe(false); expect(Number(last.collected)).toBeGreaterThan(0); expect(Number(last.audits)).toBe(2);
});

test("SYS-12.12 SEC-10.3: forged foreign AI source/cache context cannot disclose data or dispatch a provider", async () => {
  const foreign = await prepFixture();
  expect(await foreign.state.writeCache(foreign.context, foreign.result)).toBe(true);
  const forged = foreign.next({ actorId: actor("admin") });
  expect(await foreign.state.readCache(forged)).toBeNull();
  const provider = vi.fn(async () => foreign.result);
  expect((await foreign.state.invoke(forged, { provider })).outcome).toBe("fallback");
  expect(provider).not.toHaveBeenCalled();
  const result = asActor(actor("admin"), "select * from private.ai_result_caches;");
  expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/42501|permission denied/i);
});
