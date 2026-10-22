// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import { demoModule } from "./contracts";
import { localAuthConfiguration } from "../../e2e/accounts/local";
import { rows, q } from "../moderation/fixtures";
import { rpcAs } from "../usage/local";
vi.mock("server-only", () => ({}));
function client() {
  const config = localAuthConfiguration();
  return createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function counts() {
  return rows(`select (select count(*) from public.workspaces) as workspaces,
    (select count(*) from public.profiles) as profiles,(select count(*) from auth.users) as accounts,
    (select count(*) from public.cafes) as cafes,(select count(*) from public.menu_items) as menu,
    (select count(*) from public.opening_hours) as hours,(select count(*) from public.orders) as orders,
    (select count(*) from public.order_items) as items,(select count(*) from public.reviews) as reviews`)[0];
}
// Vitest fileParallelism:false serializes all local database suites.
for (const failAt of [1, 2, 3, 4, "seed"] as const) describe(String(failAt), () => {
  test("SYS-12.6: failed Auth or seed creation leaves no workspace, published/unpublished account or domain rows", async () => {
    const api = await demoModule(); const admin = client().auth.admin;
    const created: string[] = []; const emails: string[] = []; let calls = 0;
    const auth = {
      createUser: vi.fn(async (input: Parameters<typeof admin.createUser>[0]) => {
        emails.push(input.email!); calls++;
        if (calls === failAt) return { data: { user: null }, error: new Error("synthetic fault") } as Awaited<ReturnType<typeof admin.createUser>>;
        const result = await admin.createUser(input); if (result.data.user) created.push(result.data.user.id); return result;
      }),
      deleteUser: admin.deleteUser.bind(admin),
    };
    const realRpc = rpcAs();
    const seedFault = vi.fn(async () => ({ data: null, error: { message: "synthetic seed failure" } }));
    const rpc: typeof realRpc = async (name, args) => failAt === "seed" && created.length === 4 ? seedFault() : realRpc(name, args);
    const before = counts();
    await expect(api.provisionDemoKit({ auth, rpc })).rejects.toBeDefined();
    if (failAt === "seed") { expect(created).toHaveLength(4); expect(seedFault).toHaveBeenCalled(); }
    for (const email of emails) expect(rows(`select id from auth.users where email=${q(email)}`)).toEqual([]);
    for (const id of created) expect(rows(`select id from public.profiles where id=${q(id)}`)).toEqual([]);
    // Every domain/account count must be unchanged after compensation.
    expect(counts()).toEqual(before);
  });
});
