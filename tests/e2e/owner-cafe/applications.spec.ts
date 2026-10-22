import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { localSql } from "../accounts/local";
import {
  account, application, arrangeCafe, asActor, cafeBody, cafeRow, current, customerVisible, decide, failure, hidden, interval, login, ownedCafes,
  ownerSnapshot, q, read, resubmit, routes, save, session, snapshot, submit, suspend, suspensionConflict, targetAudits, unsafe, visible, workspace, post,
} from "./fixtures";

const omit = (d: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== key));
/** Return a decided café to its pending queue state, as an arranged later attempt. */
const toPending = (cafe: string) => localSql(`update public.cafes set application_state='pending' where id=${q(cafe)};`);

const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

for (const kit of [false, true]) test.describe(kit ? "kit" : "main", () => {
  test("OWN-01.1 OWN-01.2 OWN-01.8: submission commits normalized fields atomically as the verified owner's pending café, hidden from Customer sources", async ({ request, playwright }) => {
    const f = workspace(kit); await login(request, f.owner);
    expect(await current(request)).toBeNull();
    const data = application({
      name: "  Ünïcode Café  ", description: "  First line\nSecond line  ", area: "East", pickupAddress: `  ${randomUUID()} Pickup Lane  `,
      openingHours: [interval(7, "22:00", "02:00", true), interval(2, "09:05", "11:59")], pickupSettings: {},
    });
    const started = Date.now();
    const cafe = (await cafeBody(await submit(request, data), 201))!;
    expect(cafe).toEqual({
      cafeId: expect.any(String), name: "Ünïcode Café", description: "First line\nSecond line", area: "East", pickupAddress: data.pickupAddress.trim(),
      openingHours: [interval(2, "09:05", "11:59"), interval(7, "22:00", "02:00", true)], pickupSettings: { pickupCutoffMinutes: 15 },
      applicationState: "pending", submittedAt: expect.stringMatching(instant), suspended: false, suspensionVersion: 0, latestDecision: null, suspensionReason: null,
    });
    expect(Date.parse(cafe.submittedAt)).toBeGreaterThanOrEqual(started - 5000); expect(Date.parse(cafe.submittedAt)).toBeLessThanOrEqual(Date.now() + 5000);
    const stored = ownedCafes(f.owner.id); expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: cafe.cafeId, owner_id: f.owner.id, workspace_id: f.workspaceId, application_state: "pending", suspended: false, pickup_cutoff_minutes: 15 });
    // Reading the screen source again does not approve it.
    expect(await current(request)).toEqual(cafe); expect(await current(request)).toEqual(cafe);
    expect(cafeRow(cafe.cafeId).application_state).toBe("pending");
    const customer = await session(playwright, f.customer);
    try { expect(await customerVisible(customer, f.customer.id, cafe.cafeId)).toEqual(hidden); } finally { await customer.dispose(); }
    // Workspace isolation: another workspace's Admin/owner cannot see it.
    const outside = workspace(!kit);
    for (const actor of [outside.admin, outside.owner, outside.customer]) expect(asActor(actor.id, `select count(*) from public.cafes where id=${q(cafe.cafeId)};`)).toBe("0");
  });

  test("OWN-01.3: approved and rejected outcomes show the latest private decision reason only to the owning owner", async ({ request, playwright }) => {
    const f = workspace(kit); const cafe = arrangeCafe(f.owner, { state: "pending" }); await login(request, f.owner);
    decide(f, cafe, "reject", unsafe, "2026-02-01T00:00:00Z");
    expect(await current(request)).toMatchObject({ cafeId: cafe, applicationState: "rejected", latestDecision: { decision: "reject", reason: unsafe, decidedAt: expect.stringMatching(instant) } });
    expect(Date.parse((await current(request))!.latestDecision!.decidedAt)).toBe(Date.parse("2026-02-01T00:00:00Z"));
    toPending(cafe); decide(f, cafe, "approve", "Approved synthetic reason", "2026-02-02T00:00:00Z");
    expect(await current(request)).toMatchObject({ applicationState: "approved", latestDecision: { decision: "approve", reason: "Approved synthetic reason" } });
    for (const who of [f.other, workspace(kit).owner]) {
      const other = await session(playwright, who);
      try {
        const response = await read(other); const raw = await response.text();
        expect(response.status()).toBe(200); expect(JSON.parse(raw).cafe).toBeNull();
        expect(raw).not.toContain("Approved synthetic reason"); expect(raw).not.toContain("ownerCafeExecuted");
      } finally { await other.dispose(); }
    }
  });

  test("OWN-01.5: rejected resubmission returns to pending on the retained identity with a fresh attempt, unchanged fields and intact audit", async ({ request, playwright }) => {
    const f = workspace(kit); await login(request, f.owner);
    const data = application(); const first = (await cafeBody(await submit(request, data), 201))!;
    decide(f, first.cafeId, "reject", unsafe, "2000-01-02T00:00:00Z"); const audit = targetAudits(first.cafeId); expect(audit).toHaveLength(1);
    const rejected = (await current(request))!;
    const body = { ...data, submissionKey: randomUUID(), expectedSuspensionVersion: rejected.suspensionVersion };
    const again = (await cafeBody(await resubmit(request, body), 200))!;
    expect(again).toMatchObject({ cafeId: first.cafeId, name: first.name, pickupAddress: first.pickupAddress, applicationState: "pending",
      latestDecision: { decision: "reject", reason: unsafe } });
    expect(Date.parse(again.submittedAt)).toBeGreaterThan(Date.parse(first.submittedAt));
    expect(ownedCafes(f.owner.id)).toHaveLength(1); expect(targetAudits(first.cafeId)).toEqual(audit);
    // Same key/content replay creates nothing and does not move the queue position.
    expect(await cafeBody(await resubmit(request, body), 200)).toEqual(again);
    // Once pending, identical content returns it; different content conflicts.
    expect(await cafeBody(await resubmit(request, { ...body, submissionKey: randomUUID() }), 200)).toEqual(again);
    await failure(await resubmit(request, { ...body, submissionKey: randomUUID(), description: "Changed while pending" }), 409, "STATE_CONFLICT");
    expect(await current(request)).toEqual(again);
    const customer = await session(playwright, f.customer);
    try { expect(await customerVisible(customer, f.customer.id, first.cafeId)).toEqual(hidden); } finally { await customer.dispose(); }
  });
});

test("OWN-01.5: a rejected resubmission may change every application field", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const first = (await cafeBody(await submit(request, application()), 201))!; decide(f, first.cafeId, "reject", "Needs changes");
  const changed = application({ area: "West", description: "", openingHours: [], pickupSettings: { pickupCutoffMinutes: 0 } });
  const again = (await cafeBody(await resubmit(request, { ...changed, expectedSuspensionVersion: 0 }), 200))!;
  expect(again).toMatchObject({ cafeId: first.cafeId, name: changed.name, area: "West", pickupAddress: changed.pickupAddress, description: "",
    openingHours: [], pickupSettings: { pickupCutoffMinutes: 0 }, applicationState: "pending" });
});

test("OWN-01.5: concurrent identical resubmissions produce one attempt; a mismatched suspension version writes nothing", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const data = application(); const first = (await cafeBody(await submit(request, data), 201))!; decide(f, first.cafeId, "reject", "Needs changes");
  const before = snapshot(first.cafeId);
  const stale = await resubmit(request, { ...data, submissionKey: randomUUID(), expectedSuspensionVersion: 1 });
  await failure(stale, 409, "STATE_CONFLICT"); expect((await stale.json()).error.message).toBe(suspensionConflict); expect(snapshot(first.cafeId)).toEqual(before);
  const responses = await Promise.all([1, 2].map(() => resubmit(request, { ...data, submissionKey: randomUUID(), expectedSuspensionVersion: 0 })));
  expect(responses.map(r => r.status())).toEqual([200, 200]);
  const bodies = await Promise.all(responses.map(r => cafeBody(r, 200))); expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).toMatchObject({ applicationState: "pending", suspensionVersion: 0 });
});

test("OWN-01.5: identical first-submission replays return the existing application; different content or a reused key conflicts", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const data = application({ openingHours: [interval(3, "09:00", "10:00"), interval(1, "09:00", "10:00")], pickupSettings: {} });
  const created = (await cafeBody(await submit(request, data), 201))!;
  expect(await cafeBody(await submit(request, data), 200)).toEqual(created);
  // Normalized content: trimmed strings, sorted hours and the defaulted cutoff.
  const equivalent = { ...data, submissionKey: randomUUID(), name: `  ${data.name} `, openingHours: [...data.openingHours].reverse(), pickupSettings: { pickupCutoffMinutes: 15 } };
  expect(await cafeBody(await submit(request, equivalent), 200)).toEqual(created);
  await failure(await submit(request, { ...data, description: "Different content, reused key" }), 409, "STATE_CONFLICT");
  await failure(await submit(request, application()), 409, "STATE_CONFLICT");
  // A rejected owner uses explicit resubmission, not another creation.
  decide(f, created.cafeId, "reject", "Synthetic rejection");
  const rejected = ownerSnapshot(f.owner.id);
  await failure(await submit(request, application()), 409, "STATE_CONFLICT");
  expect(ownerSnapshot(f.owner.id)).toEqual(rejected);
});

test("OWN-01.5: approved owners cannot create a second café or resubmit; identical replay never resurrects or changes state", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const data = application(); const created = (await cafeBody(await submit(request, data), 201))!;
  decide(f, created.cafeId, "approve", "Approved");
  const before = ownerSnapshot(f.owner.id);
  expect(await cafeBody(await submit(request, data), 200)).toMatchObject({ cafeId: created.cafeId, applicationState: "approved" });
  await failure(await submit(request, application()), 409, "STATE_CONFLICT");
  await failure(await resubmit(request, { ...application(), expectedSuspensionVersion: 0 }), 409, "STATE_CONFLICT");
  expect(ownerSnapshot(f.owner.id)).toEqual(before);
});

test("OWN-01.5: concurrent distinct first submissions admit one winner and one conflict", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const responses = await Promise.all([submit(request, application()), submit(request, application())]);
  expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
  await failure(responses.find(r => r.status() === 409)!, 409, "STATE_CONFLICT"); expect(ownedCafes(f.owner.id)).toHaveLength(1);
});

test("OWN-01.5: concurrent identical first submissions create exactly one café", async ({ playwright }) => {
  const f = workspace(); const owner = await session(playwright, f.owner);
  try {
    const data = application();
    const responses = await Promise.all([submit(owner, data), submit(owner, data)]);
    expect(responses.map(r => r.status()).sort()).toEqual([200, 201]); expect(ownedCafes(f.owner.id)).toHaveLength(1);
  } finally { await owner.dispose(); }
});

test("OWN-01.1: duplicate trimmed case-insensitive name/address pairs conflict generically within the workspace, including rejected identities", async ({ playwright }) => {
  const f = workspace(); const base = randomUUID().slice(0, 8);
  arrangeCafe(f.other, { state: "rejected", name: `Dup CAFÉ ${base}`, address: `${base} Duplicate Street` });
  const owner = await session(playwright, f.owner);
  try {
    const response = await submit(owner, application({ name: `  dup café ${base} `, pickupAddress: ` ${base} DUPLICATE street`, area: "North", description: "Other" }));
    await failure(response, 409, "STATE_CONFLICT");
    const raw = JSON.stringify(await response.json()); expect(raw).not.toContain(base); expect(raw).not.toContain(f.other.id);
    expect(ownedCafes(f.owner.id)).toHaveLength(0);
    // Duplicate names alone are valid.
    await cafeBody(await submit(owner, application({ name: `Dup CAFÉ ${base}` })), 201);
  } finally { await owner.dispose(); }
  // Another workspace never sees or collides with this pair.
  const g = workspace(); const outside = await session(playwright, g.owner);
  try { await cafeBody(await submit(outside, application({ name: `Dup CAFÉ ${base}`, pickupAddress: `${base} Duplicate Street` })), 201); } finally { await outside.dispose(); }
});

test("OWN-01.1: own resubmission is exempt from its own name/address duplicate match", async ({ request }) => {
  const f = workspace(); await login(request, f.owner);
  const data = application(); const created = (await cafeBody(await submit(request, data), 201))!; decide(f, created.cafeId, "reject", "Fix");
  await cafeBody(await resubmit(request, { ...data, submissionKey: randomUUID(), name: data.name.toUpperCase(), expectedSuspensionVersion: 0 }), 200);
});

test("OWN-01.1: Unicode code-point length boundaries are accepted after trimming", async ({ playwright }) => {
  const f = workspace();
  for (const [name, pickupAddress, description] of [
    [` ${"😀".repeat(99)}${randomUUID().slice(0, 1)} `, ` ${randomUUID()}${"😀".repeat(164)} `, "😀".repeat(500)],
    ["é" + randomUUID().slice(0, 1), randomUUID().slice(0, 10), ""],
  ]) {
    const owner = account("owner", f.workspaceId); const context = await session(playwright, owner);
    try {
      const cafe = (await cafeBody(await submit(context, application({ name, pickupAddress, description })), 201))!;
      expect(cafe).toMatchObject({ name: name.trim(), pickupAddress: pickupAddress.trim(), description });
    } finally { await context.dispose(); }
  }
});

const invalidApplications: [string, (d: ReturnType<typeof application>) => unknown][] = [
  ["missing description", d => omit(d, "description")],
  ["missing pickupSettings", d => omit(d, "pickupSettings")],
  ["missing submissionKey", d => omit(d, "submissionKey")],
  ["uppercase submissionKey", d => ({ ...d, submissionKey: randomUUID().toUpperCase() })],
  ["non-UUID submissionKey", d => ({ ...d, submissionKey: "not-a-uuid" })],
  ["blank name", d => ({ ...d, name: "   " })],
  ["one code point name", d => ({ ...d, name: " 😀 " })],
  ["101 code point name", d => ({ ...d, name: "😀".repeat(101) })],
  ["9 code point address", d => ({ ...d, pickupAddress: "  123456789  " })],
  ["201 code point address", d => ({ ...d, pickupAddress: "😀".repeat(201) })],
  ["501 code point description", d => ({ ...d, description: "😀".repeat(501) })],
  ["lowercase area", d => ({ ...d, area: "central" })],
  ["unknown area", d => ({ ...d, area: "Northeast" })],
  ["numeric name", d => ({ ...d, name: 12345 })],
  ["cutoff string", d => ({ ...d, pickupSettings: { pickupCutoffMinutes: "15" } })],
  ["cutoff 181", d => ({ ...d, pickupSettings: { pickupCutoffMinutes: 181 } })],
  ["cutoff -1", d => ({ ...d, pickupSettings: { pickupCutoffMinutes: -1 } })],
  ["cutoff fractional", d => ({ ...d, pickupSettings: { pickupCutoffMinutes: 1.5 } })],
  ["pickupSettings extra key", d => ({ ...d, pickupSettings: { leadMinutes: 15 } })],
  ["overlapping hours", d => ({ ...d, openingHours: [interval(1, "09:00", "12:00"), interval(1, "11:00", "13:00")] })],
  ["interval extra key", d => ({ ...d, openingHours: [{ ...interval(1, "09:00", "12:00"), label: "x" }] })],
  ["ownerId", d => ({ ...d, ownerId: randomUUID() })],
  ["workspaceId", d => ({ ...d, workspaceId: randomUUID() })],
  ["applicationState", d => ({ ...d, applicationState: "approved" })],
  ["suspended", d => ({ ...d, suspended: false })],
  ["suspensionVersion", d => ({ ...d, suspensionVersion: 0 })],
  ["latestDecision", d => ({ ...d, latestDecision: null })],
  ["submittedAt", d => ({ ...d, submittedAt: "2000-01-01T00:00:00Z" })],
  ["cafeId", d => ({ ...d, cafeId: randomUUID() })],
];
for (const [name, change] of invalidApplications) test(`OWN-01.1 OWN-01.8: ${name} is rejected whole without a café, hours or persisted key`, async ({ request }) => {
  const f = workspace(); await login(request, f.owner); const data = application({ description: "SECRET-ECHO-MARKER" });
  const response = await submit(request, change(data)); await failure(response, 400, "INVALID_REQUEST");
  expect(JSON.stringify(await response.json())).not.toContain("SECRET-ECHO-MARKER");
  expect(ownedCafes(f.owner.id)).toHaveLength(0);
  // A failed submission persists no key: the same key then succeeds.
  if (name !== "uppercase submissionKey" && name !== "non-UUID submissionKey" && name !== "missing submissionKey") await cafeBody(await submit(request, data), 201);
});

test("OWN-01.8: a kit owner's application belongs to its kit, and request data cannot choose the main workspace", async ({ request }) => {
  const f = workspace(true); await login(request, f.owner);
  const main = workspace(false);
  await failure(await submit(request, { ...application(), workspaceId: main.workspaceId }), 400, "INVALID_REQUEST");
  const cafe = (await cafeBody(await submit(request, application()), 201))!;
  expect(cafeRow(cafe.cafeId).workspace_id).toBe(f.workspaceId);
  for (const actor of [main.admin, main.owner]) expect(asActor(actor.id, `select count(*) from public.cafes where id=${q(cafe.cafeId)};`)).toBe("0");
});

test("OWN-01.4 OWN-01.2: pending, approved and suspended state is Admin-controlled; owner writes and elapsed reads never change it", async ({ request, playwright }) => {
  const f = workspace(); await login(request, f.owner);
  const created = (await cafeBody(await submit(request, application()), 201))!;
  // Pending cannot be edited.
  const pending = snapshot(created.cafeId);
  await failure(await save(request, { description: "x", openingHours: [], pickupSettings: { pickupCutoffMinutes: 15 }, expectedSuspensionVersion: 0 }), 409, "STATE_CONFLICT");
  await failure(await resubmit(request, { ...application(), expectedSuspensionVersion: 0 }), 409, "STATE_CONFLICT");
  expect(snapshot(created.cafeId)).toEqual(pending);
  decide(f, created.cafeId, "approve", "Approved"); suspend(f, created.cafeId, true, "Suspended reason");
  const customer = await session(playwright, f.customer);
  try {
    expect(await customerVisible(customer, f.customer.id, created.cafeId)).toEqual(hidden);
    const saved = (await cafeBody(await save(request, { description: "Edited while suspended", openingHours: [], pickupSettings: { pickupCutoffMinutes: 15 }, expectedSuspensionVersion: 1 }), 200))!;
    expect(saved).toMatchObject({ applicationState: "approved", suspended: true, suspensionVersion: 1, suspensionReason: "Suspended reason" });
    expect(cafeRow(created.cafeId)).toMatchObject({ application_state: "approved", suspended: true, suspension_version: 1 });
    expect(await customerVisible(customer, f.customer.id, created.cafeId)).toEqual(hidden);
    suspend(f, created.cafeId, false, "Restored");
    expect(await customerVisible(customer, f.customer.id, created.cafeId)).toEqual(visible);
  } finally { await customer.dispose(); }
});

test("OWN-01.6: missing café targets give the shared 404, and a supplied café reference cannot address another owner's application", async ({ request }) => {
  const f = workspace(); const foreign = arrangeCafe(f.other, { state: "rejected" }); decide(f, foreign, "reject", "Foreign private reason");
  const before = snapshot(foreign); await login(request, f.owner);
  const bodies = [];
  for (const response of [
    await resubmit(request, { ...application(), expectedSuspensionVersion: 0 }),
    await save(request, { description: "x", openingHours: [], pickupSettings: { pickupCutoffMinutes: 15 }, expectedSuspensionVersion: 0 }),
  ]) { await failure(response, 404, "NOT_FOUND"); const b = await response.json(); delete b.requestId; bodies.push(b); }
  expect(bodies[1]).toEqual(bodies[0]);
  await failure(await resubmit(request, { ...application(), cafeId: foreign, expectedSuspensionVersion: 0 }), 400, "INVALID_REQUEST");
  const own = await read(request); expect((await own.json()).cafe).toBeNull();
  expect(snapshot(foreign)).toEqual(before);
});

for (const role of ["anonymous", "customer", "admin"] as const) test(`OWN-01.7: ${role} owner application operations are refused without disclosure or change`, async ({ request }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state: "rejected" }); decide(f, cafe, "reject", "PRIVATE-DECISION-MARKER");
  const before = snapshot(cafe); if (role !== "anonymous") await login(request, f[role]);
  const [status, code] = role === "anonymous" ? [401, "UNAUTHENTICATED"] : [403, "FORBIDDEN"];
  for (const response of [await read(request), await submit(request, application()), await resubmit(request, { ...application(), expectedSuspensionVersion: 0 })]) {
    await failure(response, status, code);
  }
  const raw = await (await read(request)).text(); expect(raw).not.toContain("PRIVATE-DECISION-MARKER");
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-01.7: cross-origin, wrong media type, malformed JSON, oversize and unsupported methods use the shared errors without writes", async ({ request }) => {
  const f = workspace(); await login(request, f.owner); const data = application();
  for (const path of [routes.applications, routes.resubmit]) {
    for (const value of ["https://evil.example", "null", `${"http://127.0.0.1:3100"}/path`]) await failure(await request.post(path, { headers: { origin: value }, data }), 403, "FORBIDDEN");
    await failure(await request.post(path, { headers: { "content-type": "application/json" }, data: JSON.stringify(data) }), 403, "FORBIDDEN");
    await failure(await request.post(path, { headers: { origin: "http://127.0.0.1:3100", "content-type": "text/plain" }, data: JSON.stringify(data) }), 415, "UNSUPPORTED_MEDIA_TYPE");
    await failure(await request.post(path, { headers: { origin: "http://127.0.0.1:3100", "content-type": "application/json" }, data: "{" }), 400, "INVALID_REQUEST");
    await failure(await post(request, path, { ...data, description: "😀".repeat(16_400) }), 413, "PAYLOAD_TOO_LARGE");
    const method = await request.fetch(path, { method: "PUT", headers: { origin: "http://127.0.0.1:3100" }, data });
    await failure(method, 405, "METHOD_NOT_ALLOWED"); expect(method.headers().allow.split(/,\s*/)).toContain("POST");
  }
  const get = await request.fetch(routes.cafe, { method: "DELETE", headers: { origin: "http://127.0.0.1:3100" } });
  await failure(get, 405, "METHOD_NOT_ALLOWED"); expect(get.headers().allow.split(/,\s*/)).toContain("GET");
  await failure(await request.get(`${routes.cafe}?ownerId=${f.other.id}`), 400, "INVALID_REQUEST");
  expect(ownedCafes(f.owner.id)).toHaveLength(0);
});

test("OWN-01.1: a transactional failure while saving hours rolls back the application and its key", async ({ request }) => {
  const f = workspace(); await login(request, f.owner); const data = application();
  const trigger = `t53_fail_${randomUUID().replaceAll("-", "")}`;
  localSql(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if exists (select 1 from public.cafes c where c.id=new.cafe_id and c.owner_id=${q(f.owner.id)}::uuid) then raise exception 'Synthetic private SQL failure'; end if; return new; end $$; create trigger ${trigger} before insert on public.opening_hours for each row execute function private.${trigger}();`);
  try {
    const response = await submit(request, data); await failure(response, 500, "INTERNAL_ERROR");
    expect(JSON.stringify(await response.json())).not.toMatch(/Synthetic private SQL/);
    expect(ownedCafes(f.owner.id)).toHaveLength(0);
  } finally { localSql(`drop trigger ${trigger} on public.opening_hours; drop function private.${trigger}();`); }
  await cafeBody(await submit(request, data), 201);
});
