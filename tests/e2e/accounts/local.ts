import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

/** Local CLI configuration only; captured credentials are never printed or read from dotenv. */
export function localAuthConfiguration() {
  const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"], { encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) throw new Error("Local Supabase unavailable; run bun run db:start.");
  const value = JSON.parse(result.stdout) as Record<string, string>;
  const endpoint = new URL(value.API_URL);
  if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(endpoint.hostname)) throw new Error("Account fixtures require loopback Supabase.");
  if (!value.PUBLISHABLE_KEY || !value.SECRET_KEY) throw new Error("Local account fixture keys unavailable.");
  return { url: endpoint.origin, publicKey: value.PUBLISHABLE_KEY, secretKey: value.SECRET_KEY };
}
export function localSql(statement: string) {
  const result = localSqlResult(statement);
  if (result.status !== 0) throw new Error("Local account fixture SQL failed; details omitted.");
  return result.stdout;
}
/** Raw local result lets permission tests distinguish SQLSTATE 42501 from broken tooling. */
export function localSqlResult(statement: string) {
  const project = readFileSync("supabase/config.toml", "utf8").match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m)?.[1];
  if (!project) throw new Error("Local project ID unavailable.");
  const result = spawnSync("docker", ["exec", "-i", `supabase_db_${project}`, "psql", "-X", "-q", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], { input: statement, encoding: "utf8", timeout: 30_000 });
  return { status: result.status, stdout: result.stdout?.trim() ?? "", stderr: result.stderr?.trim() ?? "" };
}
export type Role = "customer" | "owner" | "admin";
export const homes: Record<Role, string> = { customer: "/customer/cafes", owner: "/owner/dashboard", admin: "/admin/moderation" };
/** SQL fixture identities avoid Auth account-creation rate limits and bypass no app permissions. */
export function provisionAccount(role: Role, kit = false) {
  const id = randomUUID(); const workspace = randomUUID();
  const email = `t50-${id}@example.com`; const password = "synthetic-t50-password";
  const workspaceId = kit ? workspace : localSql("select id from public.workspaces where is_main;");
  if (!/^[\da-f-]{36}$/.test(workspaceId)) throw new Error("Main workspace missing.");
  localSql(`begin;
    ${kit ? `insert into public.workspaces(id,is_main) values ('${workspace}',false);` : ""}
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
      values ('00000000-0000-0000-0000-000000000000','${id}','authenticated','authenticated','${email}',extensions.crypt('${password}',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
    insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
      values ('${randomUUID()}','${id}','${id}','{"sub":"${id}","email":"${email}"}','email',now(),now());
    insert into public.profiles(id,workspace_id,role) values ('${id}','${workspaceId}','${role}'); commit;`);
  return { id, email, password, workspaceId,
    cleanup() { localSql(`begin; delete from public.profiles where id='${id}'; delete from auth.users where id='${id}'; ${kit ? `delete from public.workspaces where id='${workspace}';` : ""} commit;`); },
  };
}
