// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { featureRequest } from "../../unit/ai-state/contracts";
import { fixture, matchingRows, tableRows } from "./fixtures";
import { identifier, literal, qualified, sql, successfulSql } from "../schema/local-database";
vi.mock("server-only", () => ({}));

// Seed with permitted repository operations first; denied writes cannot pass merely
// because a table is missing, a constraint fails, or fixture SQL is invalid.
test("SYS-10.3, SEC-07.1, SEC-09.2: all ordinary roles cannot forge read or mutate AI infrastructure", async () => {
  const f = await fixture(); await f.state.writeCache(f.context, f.result);
  await f.state.invoke(f.context, { provider: async () => f.result });
  const records = matchingRows(f.actors.customer).filter(({ table }) => !["profiles", "cafes", "workspaces"].includes(table.name));
  expect(records.some(({ row }) => JSON.stringify(row).includes("suggestions"))).toBe(true);
  expect(records.some(({ row }) => Object.keys(row).some(key => /outcome/.test(key)))).toBe(true);
  expect(records.some(({ table }) => /counter|admission/.test(table.name))).toBe(true);
  for (const role of ["anon", "customer", "owner", "admin"] as const) {
    const actor = role === "anon" ? undefined : f.actors[role];
    for (const { table, row } of records) {
      expect(table.rls).toBe(true);
      const target = qualified(table);
      const where = table.primary.map(key => `${identifier(key)}=${literal(row[key] as string | number | boolean)}`).join(" and ");
      expect(where).not.toBe("");
      const claims = JSON.stringify({ role: role === "anon" ? "anon" : "authenticated", sub: actor });
      const prefix = `begin; set local role ${role === "anon" ? "anon" : "authenticated"}; set local request.jwt.claims=${literal(claims)}; set local request.jwt.claim.sub=${literal(actor ?? "")};`;
      for (const statement of [
        `select count(*) from ${target} where ${where};`,
        `with changed as (update ${target} set ${identifier(table.primary[0])}=${identifier(table.primary[0])} where ${where} returning 1) select count(*) from changed;`,
        `with changed as (delete from ${target} where ${where} returning 1) select count(*) from changed;`,
      ]) {
        const result = sql(`${prefix} ${statement} rollback;`);
        if (result.status === 0) expect(result.stdout).toBe("0");
        else expect(result.stderr).toMatch(/42501/);
      }
      // Positive control proves the insert shape is valid under the privileged fixture role.
      const columns = Object.keys(row).map(identifier).join(",");
      const insert = `insert into ${target} (${columns}) select ${columns} from json_populate_record(null::${target},${literal(JSON.stringify(row))}::json);`;
      successfulSql(`begin; ${insert.replace(/;$/, " on conflict do nothing;")} rollback;`);
      const denied = sql(`${prefix} ${insert} rollback;`);
      expect(denied.status).not.toBe(0); expect(denied.stderr).toMatch(/42501/);
    }
  }
}, 120000);

test("SEC-09.2: first due maintenance deletes expired caches 30-day audits and 7-day closed usage while preserving active reservations", async () => {
  const f = await fixture("2041-01-01T00:00:00.000Z");
  const cacheContext = f.next(); await f.state.writeCache(cacheContext, f.result);
  const old = f.next(); await f.state.invoke(old, { provider: async () => f.result });
  const oldRows = matchingRows(old.operationId);
  const closedCounters = tableRows("private", "ai_usage_counters").filter(row => row.scope_id === f.actors.customer);
  expect(closedCounters.length).toBeGreaterThan(0);
  expect(oldRows.some(({ row }) => Object.keys(row).includes("outcome"))).toBe(true);
  expect(oldRows.some(({ table }) => /admission/.test(table.name))).toBe(true);
  // Closed day ends Jan 1 at 16:00 UTC; retain it until seven days after that end.
  f.advance("2041-01-08T15:59:59.999Z"); await f.state.cleanup();
  expect(matchingRows(old.operationId).some(({ table }) => /admission/.test(table.name))).toBe(true);
  for (const row of closedCounters.filter(row => Date.parse(String(row.window_end)) === Date.parse("2041-01-01T16:00:00Z"))) expect(tableRows("private", "ai_usage_counters")).toContainEqual(row);
  expect(await f.state.readCache(cacheContext)).toBeNull();
  f.advance("2041-01-08T16:00:00.001Z"); await f.state.cleanup();
  expect(matchingRows(old.operationId).filter(({ table }) => /admission|operation/.test(table.name))).toEqual([]);
  for (const row of closedCounters) expect(tableRows("private", "ai_usage_counters")).not.toContainEqual(row);
  expect(matchingRows(old.operationId).some(({ row }) => Object.keys(row).includes("outcome"))).toBe(true);
  f.advance("2041-01-30T23:59:59.999Z"); await f.state.cleanup();
  expect(matchingRows(old.operationId).some(({ row }) => Object.keys(row).includes("outcome"))).toBe(true);
  // Create active state at the cleanup instant. Capture complete physical rows so
  // cleanup cannot reset count or single-use admission identities behind a read API.
  f.advance("2041-01-31T00:00:00.001Z");
  const active = f.next(); const admissionRequest = featureRequest(active, "provider_attempt");
  expect(await f.admission.reserve(admissionRequest)).toEqual({ admitted: true });
  const activeRows = matchingRows(active.operationId);
  expect(activeRows.some(({ table }) => /operation/.test(table.name))).toBe(true);
  expect(activeRows.some(({ table }) => /admission/.test(table.name))).toBe(true);
  const counters = tableRows("private", "ai_usage_counters").filter(row => Date.parse(String(row.window_end)) > Date.parse(f.now()));
  expect(counters.length).toBeGreaterThan(0);
  await f.state.cleanup();
  expect(matchingRows(old.operationId)).toEqual([]);
  for (const entry of activeRows) expect(tableRows(entry.table.schema, entry.table.name)).toContainEqual(entry.row);
  for (const row of counters) expect(tableRows("private", "ai_usage_counters")).toContainEqual(row);
  expect(await f.admission.reserve(admissionRequest)).toEqual({ admitted: false });
  expect(await f.admission.reserve({ ...admissionRequest, admissionId: randomUUID() })).toEqual({ admitted: true });
  expect(await f.admission.reserve({ ...admissionRequest, admissionId: randomUUID() })).toEqual({ admitted: false });
  // Expired cache physically disappears on the first daily maintenance after expiry.
  const stale = f.next(); await f.state.writeCache(stale, f.result);
  const before = matchingRows(f.actors.customer).filter(({ row }) => JSON.stringify(row).includes("suggestions")); expect(before.length).toBeGreaterThan(0);
  f.advance("2041-02-01T00:00:00.001Z"); await f.state.cleanup();
  for (const entry of before) expect(tableRows(entry.table.schema, entry.table.name)).not.toContainEqual(entry.row);
}, 120000);

test("SEC-09.2: AI cleanup preserves separate moderation audit rows", async () => {
  const f = await fixture("2042-01-01T00:00:00.000Z");
  // The moderation domain audit table does not exist in the merged foundation.
  // A private synthetic domain-owned table proves AI cleanup does not use blanket age/schema deletion.
  const table = `moderation_audit_${randomUUID().replaceAll("-", "")}`;
  successfulSql(`create table private.${identifier(table)} (id uuid primary key, action text not null, reason text not null, created_at timestamptz not null); alter table private.${identifier(table)} enable row level security; insert into private.${identifier(table)} values (${literal(randomUUID())},'hide','synthetic human reason','2000-01-01T00:00:00Z');`);
  try { const before = tableRows("private", table); await f.state.cleanup(); expect(tableRows("private", table)).toEqual(before); }
  finally { successfulSql(`drop table private.${identifier(table)};`); }
}, 120000);
