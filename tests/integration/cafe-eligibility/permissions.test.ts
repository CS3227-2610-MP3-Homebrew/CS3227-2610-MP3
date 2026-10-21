// @vitest-environment node
import { expect, test, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { scenario, asActor, q, rows, targetAudits, auditTable, cafeRow, reason } from "./fixtures";
import { auditFixture } from "../audit/fixtures";
import { sql } from "../schema/local-database";
import { rpcAs } from "../usage/local";
vi.mock("server-only", () => ({}));

test("ADM-01.9 ADM-02.11: cafe history is append-only for every actor, survives later actions and AI cleanup", async () => {
  const f = scenario(); auditFixture(f, "reject", f.cafe, "2000-01-01T00:00:00Z", reason); const before = targetAudits(f.cafe);
  auditFixture(f, "approve", f.cafe, "2000-01-02T00:00:00Z"); auditFixture(f, "suspend", f.cafe, "2000-01-03T00:00:00Z"); auditFixture(f, "un-suspend", f.cafe, "2000-01-04T00:00:00Z");
  expect(targetAudits(f.cafe).slice(0, 1)).toEqual(before); const all = targetAudits(f.cafe); const t = auditTable();
  for (const actor of [f.admin, f.owner, f.customer]) for (const statement of [
    `update ${t.sql} set reason='forged' where ${t.target}=${q(f.cafe)}`,
    `delete from ${t.sql} where ${t.target}=${q(f.cafe)}`,
    `insert into ${t.sql} select * from json_populate_record(null::${t.sql},${q(JSON.stringify({ ...all[0], [t.id]: randomUUID() }))}::json)`,
  ]) {
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor.id }))}; set local request.jwt.claim.sub=${q(actor.id)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501|P0001/);
    expect(targetAudits(f.cafe)).toEqual(all);
  }
  const result = await rpcAs()("ai_state", { p_environment: "local", p_action: "cleanup", p_request: {}, p_now: "2099-01-01T00:00:00Z" });
  expect(result.error).toBeNull(); expect(result.data).toEqual([{ result: { ok: true } }]); expect(targetAudits(f.cafe)).toEqual(all);
});

test("ADM-01.10 ADM-02.10: private decision and suspension audit reasons are workspace-Admin-only under direct RLS", () => {
  const f = scenario(); const foreign = scenario(); auditFixture(f, "approve", f.cafe, undefined, reason); auditFixture(f, "suspend", f.cafe, undefined, reason);
  const t = auditTable(); const query = `select count(*) from ${t.sql} where ${t.target}=${q(f.cafe)};`;
  expect(asActor(f.admin.id, query)).toBe("2");
  for (const actor of [f.owner, f.customer, foreign.admin, foreign.owner, foreign.customer]) {
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor.id }))}; set local request.jwt.claim.sub=${q(actor.id)}; ${query} rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501/);
  }
});

test("ADM-01.5 ADM-02.6 ADM-02.10: raw Customer and owner SQL cannot self-approve, clear suspension or forge audit", () => {
  const f = scenario(true, "pending", true); const before = cafeRow(f.cafe);
  for (const actor of [f.owner, f.customer]) {
    const statement = `update public.cafes set application_state='approved',suspended=false where id=${q(f.cafe)}`;
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor.id }))}; set local request.jwt.claim.sub=${q(actor.id)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501|P0001|23514/);
    expect(cafeRow(f.cafe)).toEqual(before); expect(targetAudits(f.cafe)).toEqual([]);
  }
  expect(rows(`select id from public.cafes where id=${q(f.cafe)}`)).toHaveLength(1);
});
