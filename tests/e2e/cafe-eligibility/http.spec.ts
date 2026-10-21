import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { scenario, cafeRow, route, origin, reason, q, asActor, applicationStates, targetAudits, auditTable, ordersFor, order, orderStates, orderFields, cafeFields } from "../../integration/cafe-eligibility/fixtures";
import { localSql } from "../accounts/local";
import { failure, login } from "../moderation/helpers";
import { mutate } from "./helpers";

const operations = ["decision", "suspension"] as const;
type Operation = typeof operations[number];
const body = (op: Operation) => op === "decision" ? { decision: "approve", reason } : { suspended: true, reason };
const snapshot = (id: string) => ({ cafe: cafeRow(id), orders: ordersFor(id), audit: targetAudits(id) });

for (const kit of [false, true]) for (const decision of ["approve", "reject"] as const) test.describe(`${kit ? "kit" : "main"} ${decision}`, () => {
  test("ADM-01.2 ADM-01.3 ADM-01.7 ADM-01.9: pending decision commits exact response and one attributable audit; customer RLS changes", async ({ request }) => {
    const f = scenario(kit); await login(request, f.admin); const before = cafeRow(f.cafe); const start = Date.now();
    const response = await mutate(request, f.cafe, "decision", { decision, reason });
    expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["content-type"]).toMatch(/^application\/json/);
    const next = decision === "approve" ? "approved" : "rejected";
    expect(await response.json()).toEqual({ requestId: expect.any(String), applicationState: next });
    expect(cafeRow(f.cafe)).toMatchObject({ id: before.id, owner_id: before.owner_id, workspace_id: before.workspace_id, name: before.name, suspended: before.suspended, application_state: next });
    const t = auditTable(); const entries = targetAudits(f.cafe); expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ [t.actor]: f.admin.id, [t.workspace]: f.admin.workspaceId, [t.target]: f.cafe, [t.kind]: "cafe", action: decision, reason });
    expect(Date.parse(String(entries[0][t.time]))).toBeGreaterThanOrEqual(start - 1000);
    expect(Date.parse(String(entries[0][t.time]))).toBeLessThanOrEqual(Date.now() + 1000);
    expect(asActor(f.reader.id, `select count(*) from public.cafes where id=${q(f.cafe)};`)).toBe(decision === "approve" ? "1" : "0");
  });
});
for (const kit of [false, true]) test.describe(kit ? "kit" : "main", () => {
  test("ADM-02.2 ADM-02.3 ADM-02.8 ADM-02.10 ADM-02.11: suspend and un-suspend change eligibility and version with exact transactional audit", async ({ request }) => {
    const f = scenario(kit, "approved"); const fields = cafeFields(); const before = cafeRow(f.cafe); await login(request, f.admin);
    for (const [index, suspended] of [true, false].entries()) {
      const start = Date.now(); const response = await mutate(request, f.cafe, "suspension", { suspended, reason });
      expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
      expect(await response.json()).toEqual({ requestId: expect.any(String), suspended });
      expect(cafeRow(f.cafe)).toMatchObject({ application_state: "approved", suspended, [fields.version]: Number(before[fields.version]) + index + 1 });
      const entries = targetAudits(f.cafe); const t = auditTable(); expect(entries).toHaveLength(index + 1);
      expect(entries[index]).toMatchObject({ [t.actor]: f.admin.id, [t.workspace]: f.admin.workspaceId, [t.target]: f.cafe, [t.kind]: "cafe", action: suspended ? "suspend" : "un-suspend", reason });
      expect(Date.parse(String(entries[index][t.time]))).toBeGreaterThanOrEqual(start - 1000);
      expect(Date.parse(String(entries[index][t.time]))).toBeLessThanOrEqual(Date.now() + 1000);
      expect(asActor(f.reader.id, `select count(*) from public.cafes where id=${q(f.cafe)};`)).toBe(suspended ? "0" : "1");
    }
  });
});
for (const state of applicationStates) for (const decision of ["approve", "reject"]) {
  if (state === "pending") continue;
  test(`ADM-01.8: ${state} cannot ${decision}, preserving state and audit`, async ({ request }) => {
    const f = scenario(true, state); const before = snapshot(f.cafe); await login(request, f.admin);
    await failure(await mutate(request, f.cafe, "decision", { decision, reason }), 409, "STATE_CONFLICT"); expect(snapshot(f.cafe)).toEqual(before);
  });
}
for (const state of applicationStates) for (const suspended of [false, true]) for (const desired of [false, true]) {
  if (state === "approved" && suspended !== desired) continue;
  test(`ADM-02.4: ${state}/${suspended} to ${desired} conflicts without effects`, async ({ request }) => {
    const f = scenario(true, state, suspended); const before = snapshot(f.cafe); await login(request, f.admin);
    await failure(await mutate(request, f.cafe, "suspension", { suspended: desired, reason }), 409, "STATE_CONFLICT"); expect(snapshot(f.cafe)).toEqual(before);
  });
}
for (const op of operations) test.describe(op, () => {
  const setup = () => scenario(true, op === "decision" ? "pending" : "approved");
  for (const value of ["", " \n\t\u00a0\uFEFF", "😀".repeat(301), null, 1, {}, []]) test(`ADM-01.4 ADM-02.5: invalid reason ${JSON.stringify(value).slice(0, 15)} has no effects`, async ({ request }) => {
    const f = setup(); const before = snapshot(f.cafe); await login(request, f.admin);
    await failure(await mutate(request, f.cafe, op, { ...body(op), reason: value }), 400, "INVALID_REQUEST"); expect(snapshot(f.cafe)).toEqual(before);
  });
  for (const value of ["😀".repeat(300), "x", reason]) test(`ADM-01.4 ADM-02.5: preserves valid reason ${value.slice(0, 12)} exactly`, async ({ request }) => {
    const f = setup(); await login(request, f.admin); expect((await mutate(request, f.cafe, op, { ...body(op), reason: value })).status()).toBe(200);
    expect(targetAudits(f.cafe).map(r => r.reason)).toEqual([value]);
  });
  for (const role of ["anonymous", "customer", "owner"] as const) test(`ADM-01.5 ADM-02.6: ${role} is denied without state or audit effects`, async ({ request }) => {
    const f = setup(); const before = snapshot(f.cafe); if (role !== "anonymous") await login(request, f[role]);
    await failure(await mutate(request, f.cafe, op), role === "anonymous" ? 401 : 403, role === "anonymous" ? "UNAUTHENTICATED" : "FORBIDDEN"); expect(snapshot(f.cafe)).toEqual(before);
  });
  for (const kit of [false, true]) test(`ADM-01.6 ADM-02.7: ${kit ? "kit" : "main"} foreign and absent targets are indistinguishable`, async ({ request }) => {
    const f = scenario(kit); const foreign = scenario(!kit, "approved"); const before = snapshot(foreign.cafe); await login(request, f.admin); const responses = [];
    for (const id of [foreign.cafe, randomUUID(), "opaque-authorized-shape", "x".repeat(128)]) {
      const response = await mutate(request, id, op); await failure(response, 404, "NOT_FOUND"); const value = await response.json(); delete value.requestId; responses.push(value);
    }
    for (const value of responses) expect(value).toEqual(responses[0]); expect(snapshot(foreign.cafe)).toEqual(before);
  });
  test("ADM-01.8 ADM-02.4: concurrent identical transitions commit one state and audit only", async ({ request }) => {
    const f = setup(); await login(request, f.admin);
    const responses = await Promise.all([mutate(request, f.cafe, op), mutate(request, f.cafe, op)]);
    expect(responses.map(r => r.status()).sort()).toEqual([200, 409]); await failure(responses.find(r => r.status() === 409)!, 409, "STATE_CONFLICT");
    expect(targetAudits(f.cafe)).toHaveLength(1);
    expect(cafeRow(f.cafe)).toMatchObject(op === "decision" ? { application_state: "approved" } : { application_state: "approved", suspended: true });
  });
  test("ADM-01.9 ADM-02.11: audit failure rolls back cafe and every cancellation atomically", async ({ request }) => {
    const f = setup(); if (op === "suspension") for (const state of orderStates) order(f, state);
    const before = snapshot(f.cafe); const t = auditTable(); const trigger = `t58_fail_${randomUUID().replaceAll("-", "")}`;
    localSql(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if new.${t.target}::text=${q(f.cafe)} then raise exception 'Synthetic audit failure'; end if; return new; end $$; create trigger ${trigger} before insert on ${t.sql} for each row execute function private.${trigger}();`);
    try { await login(request, f.admin); await failure(await mutate(request, f.cafe, op), 500, "INTERNAL_ERROR"); expect(snapshot(f.cafe)).toEqual(before); }
    finally { localSql(`drop trigger ${trigger} on ${t.sql}; drop function private.${trigger}();`); }
  });
  const invalid: { name: string; method?: string; headers?: Record<string, string>; data?: string; target?: string; status: number; code: string }[] = [
    ...["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].map(method => ({ name: method, method, status: 405, code: "METHOD_NOT_ALLOWED" })),
    ...["", "null", "invalid", "https://evil.example", `${origin}/path`].map(value => ({ name: `origin ${value}`, headers: { origin: value }, status: 403, code: "FORBIDDEN" })),
    { name: "missing Origin", headers: { "content-type": "application/json" }, status: 403, code: "FORBIDDEN" },
    { name: "wrong media", headers: { origin, "content-type": "text/plain" }, status: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
    { name: "malformed JSON", data: "{", status: 400, code: "INVALID_REQUEST" },
    { name: "oversized body", data: JSON.stringify({ ...body(op), reason: "😀".repeat(16384) }), status: 413, code: "PAYLOAD_TOO_LARGE" },
    { name: "oversized Ref", target: "😀".repeat(129), status: 400, code: "INVALID_REQUEST" },
    ...[null, [], {}, { reason }, { ...body(op), cafeId: randomUUID() }, { ...body(op), workspaceId: randomUUID() }, { ...body(op), adminId: randomUUID() },
      ...(op === "decision" ? [{ decision: "approved", reason }, { decision: true, reason }, { decision: "approve" }] : [{ suspended: "true", reason }, { suspended: 1, reason }, { suspended: null, reason }, { suspended: false }])]
      .map((data, i) => ({ name: `strict body ${i}`, data: JSON.stringify(data), status: 400, code: "INVALID_REQUEST" })),
  ];
  for (const item of invalid) test(`ADM-01.12 ADM-02.12: ${item.name} returns shared HTTP error without effects`, async ({ request }) => {
    const f = setup(); const before = snapshot(f.cafe); await login(request, f.admin); const method = item.method ?? "POST";
    const response = await request.fetch(route(item.target ?? f.cafe, op), { method, headers: item.headers ?? { origin, "content-type": "application/json", "x-forwarded-host": "evil.example" },
      ...(["GET", "HEAD"].includes(method) ? {} : { data: item.data ?? JSON.stringify(body(op)) }) });
    if (method === "HEAD") { expect(response.status()).toBe(405); expect(response.headers()["cache-control"]).toBe("private, no-store"); }
    else await failure(response, item.status, item.code);
    if (item.status === 405) expect(response.headers().allow).toBe("POST"); expect(snapshot(f.cafe)).toEqual(before);
  });
});

test("ADM-01.8: competing approval and rejection have one winner and one attributable audit", async ({ request }) => {
  const f = scenario(); await login(request, f.admin);
  const responses = await Promise.all(["approve", "reject"].map(decision => mutate(request, f.cafe, "decision", { decision, reason })));
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
  const winner = await responses.find(r => r.status() === 200)!.json(); expect(cafeRow(f.cafe).application_state).toBe(winner.applicationState);
  const entries = targetAudits(f.cafe); expect(entries).toHaveLength(1); expect(entries[0].action).toBe(winner.applicationState === "approved" ? "approve" : "reject");
});

test("ADM-02.9 ADM-02.10: suspension cancels every outstanding order only, preserves terminal records and never revives", async ({ request }) => {
  const f = scenario(true, "approved"); for (const state of orderStates) order(f, state);
  const foreign = scenario(true, "approved"); for (const state of orderStates) order(foreign, state);
  const before = ordersFor(f.cafe); const foreignBefore = snapshot(foreign.cafe); const c = orderFields(); await login(request, f.admin); const started = Date.now();
  expect((await mutate(request, f.cafe, "suspension")).status()).toBe(200);
  const after = ordersFor(f.cafe); expect(after).toHaveLength(before.length);
  for (let i = 0; i < before.length; i++) {
    if (["pending", "accepted", "ready"].includes(String(before[i][c.state]))) {
      expect(after[i]).toEqual({ ...before[i], [c.state]: "cancelled", [c.reason]: "Cafe is suspended", [c.cancelled]: expect.any(String) });
      expect(Date.parse(String(after[i][c.cancelled]))).toBeGreaterThanOrEqual(started - 1000);
      expect(Date.parse(String(after[i][c.cancelled]))).toBeLessThanOrEqual(Date.now() + 1000);
    } else expect(after[i]).toEqual(before[i]);
  }
  expect(snapshot(foreign.cafe)).toEqual(foreignBefore);
  expect((await mutate(request, f.cafe, "suspension", { suspended: false, reason })).status()).toBe(200); expect(ordersFor(f.cafe)).toEqual(after);
});

test("ADM-02.9 ADM-02.11: failure updating one outstanding order rolls back cafe, other orders and audit", async ({ request }) => {
  const f = scenario(true, "approved"); order(f, "pending"); order(f, "accepted"); const id = order(f, "ready");
  const before = snapshot(f.cafe); const trigger = `t58_order_fail_${randomUUID().replaceAll("-", "")}`;
  localSql(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if new.id=${q(id)}::uuid then raise exception 'Synthetic cancellation failure'; end if; return new; end $$; create trigger ${trigger} before update on public.orders for each row execute function private.${trigger}();`);
  try { await login(request, f.admin); await failure(await mutate(request, f.cafe, "suspension"), 500, "INTERNAL_ERROR"); expect(snapshot(f.cafe)).toEqual(before); }
  finally { localSql(`drop trigger ${trigger} on public.orders; drop function private.${trigger}();`); }
});
