// @vitest-environment node
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { literal, successfulSql } from "../schema/local-database";

let publishableKey: string;
beforeAll(() => {
  // Local CLI output includes credentials. Capture it only in memory, never relay it.
  const result = spawnSync("bun", [resolve("node_modules/supabase/dist/supabase.js"), "status", "--output", "json"], { encoding: "utf8", timeout: 30_000 });
  if (result.error || result.status !== 0) throw new Error("Local Supabase status unavailable; run db:start.");
  let settings: Record<string, unknown>;
  try { settings = JSON.parse(result.stdout); }
  catch { throw new Error("Local Supabase status did not return JSON."); }
  if (typeof settings.PUBLISHABLE_KEY !== "string" || !settings.PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
    throw new Error("Local Supabase publishable key is unavailable.");
  }
  publishableKey = settings.PUBLISHABLE_KEY;
}, 45_000);

async function localSignup(data: Record<string, unknown>, assertion: (status: number, profiles: Array<{ role: string; workspaceId: string; main: boolean }>) => void) {
  const email = `t07-${randomUUID()}@example.com`;
  // Ephemeral, synthetic credential: never persisted by this test or printed.
  const password = randomBytes(24).toString("base64url");
  try {
    const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
      method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data }), signal: AbortSignal.timeout(15_000),
    });
    // Do not decode/print response bodies: successful bodies contain session tokens.
    await response.body?.cancel();
    const profiles = JSON.parse(successfulSql(`select coalesce(json_agg(json_build_object('role',p.role,'workspaceId',p.workspace_id,'main',w.is_main)),'[]'::json)
      from auth.users u join public.profiles p on p.id=u.id join public.workspaces w on w.id=p.workspace_id
      where u.email=${literal(email)};`));
    assertion(response.status, profiles);
  } finally {
    // Only the unique email created by this invocation is eligible for cleanup.
    successfulSql(`begin;
      delete from public.profiles where id in (select id from auth.users where email=${literal(email)});
      delete from auth.users where email=${literal(email)};
      commit;`);
  }
}

test.each(["customer", "owner"])("SYS-06.4 SYS-12.3: actual local Auth signup creates protected %s authority in main", async (role) => {
  await localSignup({ role }, (status, profiles) => {
    expect(status, "Valid Customer/owner signup remains available at the local Auth boundary").toBe(200);
    expect(profiles, "Auth provisioning must create exactly one protected role in main").toHaveLength(1);
    expect(profiles[0].role).toBe(role);
    expect(profiles[0].main).toBe(true);
  });
}, 60_000);

test.each(["customer", "owner"])("SYS-06.4 SYS-12.3: actual local Auth signup cannot forge Admin or kit authority for %s", async (role) => {
  const kit = randomUUID();
  successfulSql(`insert into public.workspaces(id,is_main) values (${literal(kit)},false);`);
  try {
    await localSignup({ role, app_role: "admin", is_admin: true, workspace_id: kit, workspaceId: kit }, (status, profiles) => {
      if (status >= 400 && status < 500) {
        expect(profiles, "Rejected forged metadata grants no profile authority").toHaveLength(0);
        return;
      }
      expect(status, "Unexpected Auth failures are not authorization evidence").toBe(200);
      expect(profiles, "Auth provisioning must create exactly one protected role in main; raw metadata grants no authority").toHaveLength(1);
      expect(profiles[0].role).toBe(role);
      expect(profiles[0].main).toBe(true);
      expect(profiles[0].workspaceId).not.toBe(kit);
    });
  } finally { successfulSql(`delete from public.workspaces where id=${literal(kit)};`); }
}, 60_000);

test.each(["role", "app_role"])("SYS-06.4 SYS-12.3: direct local Auth metadata field %s never provisions an Admin", async (field) => {
  await localSignup({ [field]: "admin", workspace_id: randomUUID(), is_admin: true }, (_status, profiles) => {
    // A rejected signup, an unprovisioned Auth identity, or a non-Admin profile
    // are all safe: the protected profile, never raw metadata, establishes role.
    for (const profile of profiles) {
      expect(profile.role).not.toBe("admin");
      expect(profile.main).toBe(true);
    }
  });
}, 60_000);
