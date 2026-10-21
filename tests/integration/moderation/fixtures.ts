import { randomUUID } from "node:crypto";
import { localSql, provisionAccount } from "../../e2e/accounts/local";

export const q = (value: unknown) => value === null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
export const ident = (value: string) => `"${value.replaceAll('"', '""')}"`;
export const rows = (statement: string): Record<string, unknown>[] => JSON.parse(localSql(`select coalesce(json_agg(t),'[]'::json) from (${statement}) t;`));
export const states = ["pending", "kept", "hidden"] as const;
export type State = typeof states[number];
export const actions = ["keep", "hide", "restore"] as const;
export const quickReasons = ["Looks fine", "Spam", "Abusive", "Off-topic", "Prompt-injection attempt"];
export const text = '  Synthetic <img src=x onerror="window.reviewExecuted=true"> & café 😀  ';
export const reason = '  Human <b>reason</b> & 😀  ';
export const submitted = "2026-01-01T20:30:00.000Z";
export const origin = "http://127.0.0.1:3100";
export const route = (id: string) => `/api/admin/reviews/${encodeURIComponent(id)}/moderation`;

export function columns(schema: string, table: string) {
  return rows(`select column_name from information_schema.columns where table_schema=${q(schema)} and table_name=${q(table)}`).map(r => String(r.column_name));
}
export function column(schema: string, table: string, aliases: string[]) {
  const available = columns(schema, table); const found = aliases.find(name => available.includes(name));
  if (!found) throw new Error(`Missing implementation: ${schema}.${table} needs ${aliases.join("/")} for contract-derived fixtures`);
  return found;
}
export function insert(table: string, record: Record<string, unknown>) {
  localSql(`insert into ${table} (${Object.keys(record).map(ident).join(",")}) values (${Object.values(record).map(q).join(",")});`);
}
function account(role: "customer" | "owner", workspace: string) {
  const id = randomUUID(); const email = `t60-${id}@example.com`; const password = "synthetic-t60-password";
  localSql(`begin;
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
      values ('00000000-0000-0000-0000-000000000000',${q(id)},'authenticated','authenticated',${q(email)},extensions.crypt(${q(password)},extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
    insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
      values (${q(randomUUID())},${q(id)},${q(id)},${q(JSON.stringify({ sub: id, email }))},'email',now(),now());
    insert into public.profiles(id,workspace_id,role) values (${q(id)},${q(workspace)},${q(role)}); commit;`);
  return { id, email, password, workspaceId: workspace };
}
/** Persist isolated local synthetic workspaces. Never delete append-only audit history. */
export function scenario(kit = true) {
  // Check missing product fields before provisioning any accounts.
  const cafeName = column("public", "cafes", ["name"]);
  const reviewText = column("public", "reviews", ["text", "review_text"]);
  const reviewTime = column("public", "reviews", ["submitted_at", "created_at"]);
  column("public", "reviews", ["rating"]);
  const admin = provisionAccount("admin", kit);
  const owner = account("owner", admin.workspaceId); const customer = account("customer", admin.workspaceId);
  const reader = account("customer", admin.workspaceId); const cafe = randomUUID();
  const name = `T60 Café ${cafe}`;
  insert("public.cafes", { id: cafe, workspace_id: admin.workspaceId, owner_id: owner.id, [cafeName]: name, application_state: "approved", suspended: false });
  const review = (state: State | null = "pending", overrides: Record<string, unknown> = {}) => {
    const order = randomUUID(); const id = randomUUID();
    const orderColumns = columns("public", "orders"); const stateColumn = ["state", "status", "order_state"].find(c => orderColumns.includes(c));
    insert("public.orders", { id: order, cafe_id: cafe, customer_id: customer.id, ...(stateColumn ? { [stateColumn]: "collected" } : {}) });
    insert("public.reviews", { id, order_id: order, customer_id: customer.id, ...(state ? { moderation_state: state } : {}), rating: 4, [reviewText]: text, [reviewTime]: submitted, ...overrides });
    return id;
  };
  return { admin, owner, customer, reader, cafe, name, review, reviewText, reviewTime };
}
export type Scenario = ReturnType<typeof scenario>;
export const stored = (id: string) => rows(`select * from public.reviews where id=${q(id)}`)[0];
export function asActor(actor: string, statement: string) {
  return localSql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; ${statement} rollback;`);
}
