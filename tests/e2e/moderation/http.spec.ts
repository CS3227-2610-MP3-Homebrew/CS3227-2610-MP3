import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { actions, origin, q, reason, route, scenario, states, stored } from "../../integration/moderation/fixtures";
import { auditTable, targetAudits } from "../../integration/audit/fixtures";
import { localSql } from "../accounts/local";
import { failure, login, moderate } from "./helpers";

for (const kit of [false, true]) for (const prior of states) for (const action of actions) test.describe(`${kit ? "kit" : "main"} ${prior} ${action}`, () => {
  const next = prior === "pending" && action === "keep" ? "kept" : (prior === "pending" || prior === "kept") && action === "hide" ? "hidden" : prior === "hidden" && action === "restore" ? "kept" : null;
  if (next) {
    test("ADM-03.4 ADM-03.5 ADM-03.6 ADM-03.11 ADM-03.12: allowed transition commits exactly one audit and preserves text/rating", async ({ request }) => {
      const f = scenario(kit); const id = f.review(prior); const before = stored(id); const auditBefore = targetAudits(id);
      await login(request, f.admin); const started = Date.now();
      const response = await moderate(request, id, action, reason);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      expect(response.headers()["content-type"]).toMatch(/^application\/json/);
      expect(await response.json()).toEqual({ requestId: expect.any(String), moderationState: next });
      expect(stored(id)).toEqual({ ...before, moderation_state: next });
      const entries = targetAudits(id); const table = auditTable();
      expect(entries).toHaveLength(auditBefore.length + 1);
      const entry = entries.at(-1)!;
      expect(entry).toMatchObject({ [table.actor]: f.admin.id, [table.workspace]: f.admin.workspaceId, [table.target]: id, action, reason });
      expect(Date.parse(String(entry[table.time]))).toBeGreaterThanOrEqual(started - 1000);
      expect(Date.parse(String(entry[table.time]))).toBeLessThanOrEqual(Date.now() + 1000);
      const { asActor } = await import("../../integration/moderation/fixtures");
      expect(asActor(f.reader.id, `select count(*) from public.reviews where id=${q(id)};`)).toBe(next === "hidden" ? "0" : "1");
    });
  } else {
    test("ADM-03.7 ADM-03.11 ADM-03.12: disallowed state/action is a conflict without review or audit effects", async ({ request }) => {
      const f = scenario(kit); const id = f.review(prior); const before = stored(id); const auditBefore = targetAudits(id);
      await login(request, f.admin); await failure(await moderate(request, id, action), 409, "STATE_CONFLICT");
      expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(auditBefore);
    });
  }
});
for (const value of ["", " \n\t\u00a0", "😀".repeat(301), null, 1, {}, []]) test.describe(`invalid reason ${JSON.stringify(value).slice(0, 30)}`, () => {
  test("ADM-03.8 ADM-03.12: rejects invalid reason without effects", async ({ request }) => {
    const f = scenario(); const id = f.review(); const before = stored(id); const audits = targetAudits(id);
    await login(request, f.admin); await failure(await moderate(request, id, "keep", value), 400, "INVALID_REQUEST");
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
  });
});
for (const value of ["😀".repeat(300), "x", " \nHuman 😀\t "]) test.describe(`valid reason ${value.slice(0, 20)}`, () => {
  test("ADM-03.8: stores valid Unicode reason exactly with no trimming or rewriting", async ({ request }) => {
    const f = scenario(); const id = f.review(); await login(request, f.admin);
    expect((await moderate(request, id, "keep", value)).status()).toBe(200);
    expect(targetAudits(id).map(r => r.reason)).toEqual([value]);
  });
});
for (const role of ["anonymous", "customer", "owner"] as const) test.describe(role, () => {
  test("ADM-03.9: denies absent or wrong-role session without protected data or mutations", async ({ request }) => {
    const f = scenario(); const id = f.review(); const before = stored(id); const audits = targetAudits(id);
    if (role !== "anonymous") await login(request, f[role]);
    await failure(await moderate(request, id, "hide"), role === "anonymous" ? 401 : 403, role === "anonymous" ? "UNAUTHENTICATED" : "FORBIDDEN");
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
  });
});
test("ADM-03.10: absent and foreign references yield indistinguishable not-found responses", async ({ request }) => {
  const f = scenario(); const foreign = scenario(); const id = foreign.review(); const before = stored(id); const audits = targetAudits(id);
  await login(request, f.admin); const responses = [];
  for (const target of [id, randomUUID(), "opaque-authorized-shape", "x".repeat(128)]) {
    const response = await moderate(request, target, "hide"); await failure(response, 404, "NOT_FOUND");
    const body = await response.json(); delete body.requestId; responses.push(body);
  }
  for (const body of responses) expect(body).toEqual(responses[0]);
  expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
});
test("ADM-03.7 ADM-03.12: simultaneous conflicting pending confirmations admit only one commit", async ({ request }) => {
  const f = scenario(); const id = f.review(); const before = stored(id); await login(request, f.admin);
  const results = await Promise.all([moderate(request, id, "keep"), moderate(request, id, "keep")]);
  expect(results.map(r => r.status()).sort()).toEqual([200, 409]);
  await failure(results.find(r => r.status() === 409)!, 409, "STATE_CONFLICT");
  const winner = await results.find(r => r.status() === 200)!.json();
  expect(stored(id)).toEqual({ ...before, moderation_state: winner.moderationState });
  expect(targetAudits(id)).toHaveLength(1);
});
test("ADM-03.12: an audit insert failure atomically rolls back moderation", async ({ request }) => {
  const f = scenario(); const id = f.review(); const before = stored(id); const audits = targetAudits(id); const table = auditTable();
  const trigger = `t60_fail_${randomUUID().replaceAll("-", "")}`;
  localSql(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if new.${table.target}::text=${q(id)} then raise exception 'Synthetic audit failure'; end if; return new; end $$; create trigger ${trigger} before insert on ${table.sql} for each row execute function private.${trigger}();`);
  try {
    await login(request, f.admin); await failure(await moderate(request, id, "keep"), 500, "INTERNAL_ERROR");
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
  } finally { localSql(`drop trigger ${trigger} on ${table.sql}; drop function private.${trigger}();`); }
});
const badRequests: { name: string; method?: string; headers?: Record<string, string>; data?: unknown; target?: string; status: number; code: string }[] = [
  ...["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].map(method => ({ name: method, method, status: 405, code: "METHOD_NOT_ALLOWED" })),
  ...["", "null", "invalid", "https://evil.example", `${origin}/path`].map(value => ({ name: `origin ${value}`, headers: { origin: value }, status: 403, code: "FORBIDDEN" })),
  { name: "missing origin", headers: { "content-type": "application/json" }, status: 403, code: "FORBIDDEN" },
  { name: "wrong media", headers: { origin, "content-type": "text/plain" }, status: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
  { name: "malformed JSON", data: "{", status: 400, code: "INVALID_REQUEST" },
  { name: "overflow", data: JSON.stringify({ action: "keep", reason: "😀".repeat(16384) }), status: 413, code: "PAYLOAD_TOO_LARGE" },
  ...[null, [], {}, { action: "approve", reason }, { action: 1, reason }, { action: "keep" }, { action: "keep", reason, label: "ok" }, { action: "keep", reason, reviewId: randomUUID() }, { action: "keep", reason, workspaceId: randomUUID() }].map((data, index) => ({ name: `invalid body ${index}`, data, status: 400, code: "INVALID_REQUEST" })),
  { name: "oversized Ref", target: "😀".repeat(129), status: 400, code: "INVALID_REQUEST" },
];
for (const item of badRequests) test.describe(item.name, () => {
  test("ADM-03.16: strict ordinary HTTP boundary rejects input without state or audit effects", async ({ request }) => {
    const f = scenario(); const id = f.review(); const before = stored(id); const audits = targetAudits(id); await login(request, f.admin);
    const method = item.method ?? "POST";
    const response = await request.fetch(route(item.target ?? id), { method,
      headers: item.headers ?? { origin, "content-type": "application/json", "x-forwarded-host": "evil.example" },
      ...(["GET", "HEAD"].includes(method) ? {} : { data: item.data === undefined ? JSON.stringify({ action: "keep", reason }) : typeof item.data === "string" ? item.data : JSON.stringify(item.data) }) });
    // HEAD retains status/headers but HTTP omits its body.
    if (method === "HEAD") { expect(response.status()).toBe(405); expect(response.headers()["cache-control"]).toBe("private, no-store"); }
    else await failure(response, item.status, item.code);
    if (item.status === 405) expect(response.headers().allow).toBe("POST");
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
  });
});
test("ADM-03.9 ADM-03.16: actual missing-session route returns shared private JSON", async ({ request }) => {
  await failure(await moderate(request, randomUUID(), "hide"), 401, "UNAUTHENTICATED");
});
