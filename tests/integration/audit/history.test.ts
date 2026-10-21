// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { scenario, q, asActor } from "../moderation/fixtures";
import { auditFixture, auditTable, targetAudits } from "./fixtures";
import { sql } from "../schema/local-database";
import { rpcAs } from "../usage/local";
vi.mock("server-only", () => ({}));

test("ADM-03.15: old Admin audit records survive actual AI retention cleanup", async () => {
  const f = scenario(); const id = f.review(); auditFixture(f, "keep", id, "2000-01-01T00:00:00Z");
  const before = targetAudits(id);
  const response = await rpcAs()("ai_state", { p_environment: "local", p_action: "cleanup", p_request: {}, p_now: "2099-01-01T00:00:00Z" });
  expect(response.error).toBeNull(); expect(response.data).toEqual([{ result: { ok: true } }]);
  expect(targetAudits(id)).toEqual(before);
});
test("ADM-03.12 ADM-03.15: later actions preserve earlier history and ordinary Admin cannot rewrite or delete entries", () => {
  const f = scenario(); const id = f.review(); auditFixture(f, "keep", id); const before = targetAudits(id);
  auditFixture(f, "hide", id, "2000-01-02T00:00:00Z");
  expect(targetAudits(id).slice(0, 1)).toEqual(before);
  const table = auditTable();
  for (const statement of [`update ${table.sql} set reason='forged' where ${table.target}=${q(id)}`, `delete from ${table.sql} where ${table.target}=${q(id)}`]) {
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: f.admin.id }))}; set local request.jwt.claim.sub=${q(f.admin.id)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501|P0001/);
    expect(targetAudits(id)).toHaveLength(2); expect(targetAudits(id)[0]).toEqual(before[0]);
  }
});
test("ADM-03.10 ADM-03.14: unrelated profile emails and other-workspace profiles are not exposed by Admin audit permission", () => {
  const f = scenario(); const foreign = scenario();
  expect(asActor(f.admin.id, `select count(*) from public.profiles where id in (${q(f.reader.id)},${q(foreign.admin.id)});`)).toBe("0");
});

test("ADM-03.12 ADM-03.15: Admin cannot forge another successful action directly in append-only history", () => {
  const f = scenario(); const id = f.review(); auditFixture(f, "keep", id); const table = auditTable(); const before = targetAudits(id);
  const copy = { ...before[0], [table.id]: crypto.randomUUID() };
  const statement = `insert into ${table.sql} select * from json_populate_record(null::${table.sql},${q(JSON.stringify(copy))}::json);`;
  // Prove this is a valid insert, so permission failures cannot conceal broken fixtures.
  const control = sql(`begin; ${statement} rollback;`); expect(control.status, control.stderr).toBe(0);
  const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: f.admin.id }))}; set local request.jwt.claim.sub=${q(f.admin.id)}; ${statement} rollback;`);
  expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/42501|P0001/); expect(targetAudits(id)).toEqual(before);
});
for (const role of ["customer", "owner"] as const) describe(role, () => {
  test("ADM-03.10 ADM-03.14: ordinary non-Admin users cannot read protected Admin-action audit entries", () => {
    const f = scenario(); const id = f.review(); auditFixture(f, "keep", id); const table = auditTable();
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: f[role].id }))}; set local request.jwt.claim.sub=${q(f[role].id)}; select count(*) from ${table.sql} where ${table.target}=${q(id)}; rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501/);
  });
});
