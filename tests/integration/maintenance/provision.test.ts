// @vitest-environment node
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import { localAuthConfiguration, localSql, provisionAccount } from "../../e2e/accounts/local";
import { rows, q } from "../moderation/fixtures";
import { rpcAs } from "../usage/local";
import { Fixture } from "../schema/local-database";
import { maintenanceModule, type ProvisionOptions } from "./contracts";
vi.mock("server-only", () => ({}));
function dependencies() {
  const config = localAuthConfiguration();
  const client = createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = { createUser: vi.fn(client.auth.admin.createUser.bind(client.auth.admin)) };
  return { auth, rpc: rpcAs() };
}
const main = () => String(rows("select id from public.workspaces where is_main")[0].id);
const admins = () => rows("select p.*,u.email,u.encrypted_password from public.profiles p join auth.users u on u.id=p.id where p.role='admin' and p.workspace_id=(select id from public.workspaces where is_main) order by p.id");
/** Temporarily change only main Admin fixture roles; preserve all FK identities.
 * Tests are serialized by the repository Vitest configuration. */
async function withoutMainAdmin(run: () => Promise<void>) {
  const saved = rows("select * from public.profiles where role='admin' and workspace_id=(select id from public.workspaces where is_main)");
  localSql("update public.profiles set role='customer' where role='admin' and workspace_id=(select id from public.workspaces where is_main);");
  try { await run(); }
  finally {
    for (const row of saved) localSql(`update public.profiles set role='admin' where id=${q(row.id)};`);
  }
}
test("SYS-13.1, SYS-13.5: maintenance creates one main Admin concurrently and preserves its changed password and identity after email changes", async () => {
  const api = await maintenanceModule(); const deps = dependencies();
  const email = `maintenance-${randomUUID()}@example.com`; const password = "synthetic-admin-initial-password";
  await withoutMainAdmin(async () => {
    try {
      const results = await Promise.all(Array.from({ length: 3 }, () => api.ensureMainAdmin({ ...deps, email, password })));
      expect(results.every(r => r.outcome !== "failure")).toBe(true);
      expect(admins()).toHaveLength(1); expect(admins()[0].email).toBe(email);
      const id = String(admins()[0].id);
      expect(rows(`select encrypted_password=extensions.crypt(${q(password)},encrypted_password) as matches from auth.users where id=${q(id)}`)[0].matches).toBe(true);
      localSql(`update auth.users set encrypted_password=extensions.crypt('synthetic-changed-password',extensions.gen_salt('bf')) where id=${q(id)};`);
      const before = admins(); deps.auth.createUser.mockClear();
      await api.ensureMainAdmin({ ...deps, email: `changed-${email}`, password: "synthetic-replacement-password" });
      expect(admins()).toEqual(before); expect(deps.auth.createUser).not.toHaveBeenCalled();
      expect(rows(`select id from auth.users where email=${q(`changed-${email}`)}`)).toEqual([]);
    } finally {
      localSql(`delete from public.profiles where id in(select id from auth.users where email=${q(email)}); delete from auth.users where email=${q(email)};`);
    }
  });
}, 120000);
for (const role of ["customer", "owner", "admin"] as const) for (const kit of [false, true]) {
  if (role === "admin" && !kit) continue;
  describe(`${role}/${kit ? "kit" : "main"}`, () => {
    test("SYS-13.1: existing configured-email account yields conflict without promotion reset or other changes", async () => {
      const api = await maintenanceModule(); const deps = dependencies();
      await withoutMainAdmin(async () => {
        const actor = provisionAccount(role, kit);
        try {
          const before = rows(`select p.*,u.email,u.encrypted_password from public.profiles p join auth.users u on u.id=p.id where p.id=${q(actor.id)}`);
          const result = await api.ensureMainAdmin({ ...deps, email: actor.email, password: "synthetic-unwanted-password" });
          expect(result).toEqual({ outcome: "conflict", count: 0 }); expect(admins()).toEqual([]);
          expect(rows(`select p.*,u.email,u.encrypted_password from public.profiles p join auth.users u on u.id=p.id where p.id=${q(actor.id)}`)).toEqual(before);
          expect(deps.auth.createUser).not.toHaveBeenCalled();
        } finally { actor.cleanup(); }
      });
    }, 120000);
  });
}
for (const missing of ["email", "password"] as const) describe(missing, () => {
  test("SYS-13.7: missing main Admin setting reports failure without creating or changing accounts", async () => {
    const api = await maintenanceModule(); const deps = dependencies(); const before = admins();
    const options: ProvisionOptions = { ...deps, email: "synthetic-admin@example.com", password: "synthetic-password" };
    delete options[missing];
    expect(await api.ensureMainAdmin(options)).toEqual({ outcome: "failure", count: 0 });
    expect(admins()).toEqual(before); expect(deps.auth.createUser).not.toHaveBeenCalled();
  });
});
test("SYS-13.2, SYS-13.5, SYS-13.8, SEC-10.5: showcase is approved main-only with menu hours and hidden random owner credentials while kits and existing domain rows are preserved", async () => {
  const api = await maintenanceModule(); const deps = dependencies();
  const fixture = new Fixture(); const kit = fixture.row("workspaces"); const owner = fixture.profile(kit, "owner");
  const cafe = fixture.row("cafes", [kit, owner], { application_state: "pending", suspended: false });
  fixture.row("menu_items", [cafe]); fixture.row("opening_hours", [cafe]);
  localSql(`begin; ${fixture.statements.join("\n")} commit;`);
  const snapshot = () => Object.fromEntries(["workspaces", "profiles", "cafes", "menu_items", "opening_hours", "orders", "order_items", "reviews"].map(table => [table, rows(`select * from public.${table} order by id`)]));
  const showcaseRows = () => rows(`select c.* from public.cafes c join public.profiles p on p.id=c.owner_id where c.workspace_id=${q(main())} and c.application_state='approved' and not c.suspended and p.role='owner' and exists(select 1 from public.menu_items m where m.cafe_id=c.id) and exists(select 1 from public.opening_hours h where h.cafe_id=c.id)`);
  const showcasesBefore = showcaseRows();
  const before = snapshot();
  const first = await api.ensureShowcase(deps); const after = snapshot();
  if (showcasesBefore.length === 0) {
    const firstShowcases = showcaseRows();
    expect(firstShowcases.filter(cafe => !before.cafes.some(existing => existing.id === cafe.id)).length).toBeGreaterThan(0);
    expect(deps.auth.createUser).toHaveBeenCalled();
  }
  const second = await api.ensureShowcase(deps);
  expect(first.outcome).not.toBe("failure"); expect(second.outcome).not.toBe("failure");
  expect(snapshot()).toEqual(after);
  for (const [table, records] of Object.entries(before)) for (const record of records) expect(after[table]).toContainEqual(record);
  const showcases = showcaseRows();
  expect(showcases.length).toBeGreaterThan(0);
  const credentials = deps.auth.createUser.mock.calls.map(([input]) => input.password).filter((v): v is string => typeof v === "string");
  if (showcasesBefore.length === 0) expect(credentials.length).toBeGreaterThan(0);
  for (const password of credentials) {
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(JSON.stringify([first, second, after])).not.toContain(password);
  }
  expect(new Set(credentials).size).toBe(credentials.length);
}, 120000);
