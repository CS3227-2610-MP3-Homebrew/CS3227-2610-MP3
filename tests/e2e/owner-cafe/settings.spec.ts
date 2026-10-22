import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import { localSql } from "../accounts/local";
import { create, fixture as orderFixture, history, orderResponse, ownOrder } from "../orders/fixtures";
import {
  arrangeCafe, cafeBody, cafeRow, current, customerVisible, decide, failure, hidden, interval, login, origin, q, read, routes, save, session, settings, sgDate, sgt,
  slots, snapshot, sortHours, storedHours, suspend, suspensionConflict, visible, workspace, type Interval, type Workspace,
} from "./fixtures";

const privateReason = "PRIVATE-ADMIN-APPROVAL-REASON";
/** An approved café with its arranged ADM-01 approval and private reason. */
function approved(f: Workspace, options: Parameters<typeof arrangeCafe>[1] = {}) {
  const cafe = arrangeCafe(f.owner, { ...options, state: "pending" }); decide(f, cafe, "approve", privateReason);
  if (options.suspended) suspend(f, cafe, true, "PRIVATE-SUSPENSION-REASON");
  return cafe;
}
/** Expected 15-minute Singapore slot instants from..to inclusive. */
function grid(fromDate: string, from: string, toDate: string, to: string) {
  const out: number[] = []; for (let t = sgt(fromDate, from); t <= sgt(toDate, to); t += 15 * 60_000) out.push(t); return out;
}
async function withCustomer<T>(playwright: PlaywrightWorkerArgs["playwright"], f: Workspace, run: (r: APIRequestContext) => Promise<T>) {
  const customer = await session(playwright, f.customer); try { return await run(customer); } finally { await customer.dispose(); }
}

test("OWN-02.1 OWN-04.1: own café read returns stored profile, sorted Singapore-local weekly hours and the stored or default cutoff", async ({ request }) => {
  const f = workspace();
  const hours = [interval(7, "22:00", "02:00", true), interval(1, "09:00", "12:00"), interval(1, "07:05", "08:59"), interval(3, "00:00", "00:00", true)];
  const cafe = approved(f, { hours, cutoff: 0, name: "Stored Café", address: "1 Stored Pickup Road", area: "South", description: "Stored\ndescription" });
  await login(request, f.owner);
  expect(await current(request)).toEqual({ cafeId: cafe, name: "Stored Café", description: "Stored\ndescription", area: "South", pickupAddress: "1 Stored Pickup Road",
    openingHours: sortHours(hours), pickupSettings: { pickupCutoffMinutes: 0 }, applicationState: "approved", submittedAt: expect.any(String),
    suspended: false, suspensionVersion: 0, latestDecision: { decision: "approve", reason: privateReason, decidedAt: expect.any(String) }, suspensionReason: null });
  localSql(`update public.cafes set pickup_cutoff_minutes=default where id=${q(cafe)};`);
  expect((await current(request))!.pickupSettings).toEqual({ pickupCutoffMinutes: 15 });
});

for (const kit of [false, true]) test(`OWN-02.2 OWN-04.2: ${kit ? "kit" : "main"} approved settings batch commits description, hours and cutoff together; owner and Customer reads observe it`, async ({ request, playwright }) => {
  const f = workspace(kit); const t = sgDate(1);
  const cafe = approved(f, { hours: [interval(t.weekday, "08:00", "09:00")], name: "Fixed Name Café", address: "1 Fixed Pickup Road", area: "North" });
  const neighbour = approved(f, { hours: [interval(t.weekday, "08:00", "09:00")] }); const neighbourBefore = snapshot(neighbour);
  await login(request, f.owner);
  const hours = [interval(t.weekday, "09:00", "12:00")];
  const saved = (await cafeBody(await save(request, await settings(request, { description: "  New line one\nNew line two  ", openingHours: hours, pickupSettings: { pickupCutoffMinutes: 45 } })), 200))!;
  expect(saved).toMatchObject({ cafeId: cafe, name: "Fixed Name Café", area: "North", pickupAddress: "1 Fixed Pickup Road", description: "New line one\nNew line two",
    openingHours: hours, pickupSettings: { pickupCutoffMinutes: 45 }, applicationState: "approved", suspended: false, suspensionVersion: 0 });
  expect(await current(request)).toEqual(saved);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: false, suspension_version: 0, pickup_cutoff_minutes: 45, name: "Fixed Name Café" });
  expect(snapshot(neighbour)).toEqual(neighbourBefore);
  await withCustomer(playwright, f, async customer => {
    const response = await customer.get(`/api/customer/cafes/${cafe}`); expect(response.status()).toBe(200);
    const raw = await response.text(); expect(raw).not.toContain(privateReason);
    expect(JSON.parse(raw).cafe).toMatchObject({ description: "New line one\nNew line two", openingHours: hours, name: "Fixed Name Café", pickupAddress: "1 Fixed Pickup Road" });
    // 12:00 minus 45 minutes: last permitted slot is 11:15 Singapore time.
    expect(await slots(customer, cafe)).toEqual(grid(t.date, "09:00", t.date, "11:15"));
  });
});

test("OWN-02.2: ordinary saves are last-committed-wins without stale-revision rejection, and concurrent batches never mix", async ({ request }) => {
  const f = workspace(); const cafe = approved(f); await login(request, f.owner);
  const base = await settings(request);
  const a = { ...base, description: "Batch A", openingHours: [interval(1, "09:00", "10:00")], pickupSettings: { pickupCutoffMinutes: 10 } };
  const b = { ...base, description: "Batch B", openingHours: [interval(2, "13:00", "14:00"), interval(2, "15:00", "16:00")], pickupSettings: { pickupCutoffMinutes: 20 } };
  await cafeBody(await save(request, a), 200); await cafeBody(await save(request, b), 200);
  expect(await current(request)).toMatchObject({ description: "Batch B", openingHours: b.openingHours, pickupSettings: b.pickupSettings });
  const responses = await Promise.all([save(request, a), save(request, b)]); expect(responses.map(r => r.status())).toEqual([200, 200]);
  const final = (await current(request))!;
  const winner = final.description === "Batch A" ? a : b;
  expect(final).toMatchObject({ openingHours: winner.openingHours, pickupSettings: winner.pickupSettings });
  expect(storedHours(cafe)).toEqual(winner.openingHours);
});

for (const [name, change] of [
  ["name", { name: "Renamed Café" }], ["area", { area: "West" }], ["pickupAddress", { pickupAddress: "2 Moved Pickup Road" }],
  ["applicationState", { applicationState: "approved" }], ["suspended", { suspended: false }], ["ownerId", { ownerId: randomUUID() }],
  ["workspaceId", { workspaceId: randomUUID() }], ["cafeId", { cafeId: randomUUID() }], ["latestDecision", { latestDecision: null }],
] as const) test(`OWN-02.2 OWN-02.7: settings reject fixed or Admin-controlled key ${name} without change`, async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { suspended: true }); await login(request, f.owner); const before = snapshot(cafe);
  await failure(await save(request, await settings(request, { description: "Should not save", ...change })), 400, "INVALID_REQUEST");
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-02.2 OWN-02.4: one invalid interval rejects the whole batch with a safe message naming the interval", async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { hours: [interval(1, "09:00", "10:00")] }); await login(request, f.owner); const before = snapshot(cafe);
  const response = await save(request, await settings(request, { description: "ECHO-MARKER description", pickupSettings: { pickupCutoffMinutes: 60 },
    openingHours: [interval(2, "09:00", "12:00"), interval(2, "11:00", "13:00")] }));
  await failure(response, 400, "INVALID_REQUEST");
  const message = (await response.json()).error.message as string;
  expect(message).toMatch(/openingHours\[[01]\]/); expect(message).not.toContain("ECHO-MARKER"); expect(message).not.toContain("11:00");
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-02.2: a transactional failure while replacing hours rolls back description, hours and cutoff", async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { hours: [interval(1, "09:00", "10:00")] }); await login(request, f.owner); const before = snapshot(cafe);
  const trigger = `t53_hours_${randomUUID().replaceAll("-", "")}`;
  localSql(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if new.cafe_id=${q(cafe)}::uuid then raise exception 'Synthetic private SQL failure'; end if; return new; end $$; create trigger ${trigger} before insert on public.opening_hours for each row execute function private.${trigger}();`);
  try {
    const response = await save(request, await settings(request, { description: "Rolled back", openingHours: [interval(4, "09:00", "10:00")], pickupSettings: { pickupCutoffMinutes: 90 } }));
    await failure(response, 500, "INTERNAL_ERROR"); expect(JSON.stringify(await response.json())).not.toContain("Synthetic private SQL");
    expect(snapshot(cafe)).toEqual(before);
  } finally { localSql(`drop trigger ${trigger} on public.opening_hours; drop function private.${trigger}();`); }
});

test("OWN-02.3: valid weekly hours round-trip with minute precision, explicit next-day closing, adjacency and the 24-hour overnight bound", async ({ request }) => {
  const f = workspace(); approved(f); await login(request, f.owner);
  const hours: Interval[] = [
    interval(1, "01:00", "02:00"), interval(2, "07:05", "07:59"), interval(2, "12:00", "15:00"), interval(3, "09:00", "12:00"),
    interval(3, "12:00", "13:00"), interval(5, "10:00", "10:00", true), interval(6, "10:00", "11:00"), interval(7, "22:00", "01:00", true),
  ];
  const saved = (await cafeBody(await save(request, await settings(request, { openingHours: [...hours].reverse() })), 200))!;
  expect(saved.openingHours).toEqual(sortHours(hours)); expect((await current(request))!.openingHours).toEqual(sortHours(hours));
  // Fourteen intervals, two per starting weekday, is the accepted maximum.
  const fourteen = [1, 2, 3, 4, 5, 6, 7].flatMap(d => [interval(d, "06:00", "07:00"), interval(d, "08:00", "09:00")]);
  expect((await cafeBody(await save(request, await settings(request, { openingHours: fourteen })), 200))!.openingHours).toEqual(fourteen);
});

const invalidHours: [string, unknown][] = [
  ["same-day overlap", [interval(1, "09:00", "12:00"), interval(1, "11:59", "13:00")]],
  ["duplicate interval", [interval(2, "09:00", "10:00"), interval(2, "09:00", "10:00")]],
  ["overnight overlap into the next weekday", [interval(2, "22:00", "02:00", true), interval(3, "01:00", "03:00")]],
  ["Sunday-to-Monday overlap", [interval(7, "23:00", "01:00", true), interval(1, "00:30", "02:00")]],
  ["zero same-day duration", [interval(1, "09:00", "09:00")]],
  ["negative same-day duration", [interval(1, "12:00", "09:00")]],
  ["overnight longer than 24 hours", [interval(1, "09:00", "09:01", true)]],
  ["three intervals starting the same weekday", [interval(4, "06:00", "07:00"), interval(4, "08:00", "09:00"), interval(4, "10:00", "11:00")]],
  ["weekday 0", [interval(0, "09:00", "10:00")]], ["weekday 8", [interval(8, "09:00", "10:00")]],
  ["string weekday", [{ weekday: "1", opensAt: "09:00", closesAt: "10:00", closesNextDay: false }]],
  ["24:00 closing", [interval(1, "09:00", "24:00")]], ["single-digit hour", [interval(1, "9:00", "10:00")]],
  ["seconds precision", [interval(1, "09:00:00", "10:00")]], ["minute 60", [interval(1, "09:60", "10:00")]],
  ["string closesNextDay", [{ weekday: 1, opensAt: "09:00", closesAt: "10:00", closesNextDay: "false" }]],
  ["missing closesNextDay", [{ weekday: 1, opensAt: "09:00", closesAt: "10:00" }]],
  ["extra interval key", [{ ...interval(1, "09:00", "10:00"), timezone: "UTC" }]], ["not an array", {}],
];
for (const [name, openingHours] of invalidHours) test(`OWN-02.4: ${name} rejects the entire settings batch without partial writes`, async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { hours: [interval(6, "09:00", "10:00")] }); await login(request, f.owner); const before = snapshot(cafe);
  await failure(await save(request, await settings(request, { description: "Partial description", pickupSettings: { pickupCutoffMinutes: 30 }, openingHours })), 400, "INVALID_REQUEST");
  expect(snapshot(cafe)).toEqual(before);
});

test("OWN-02.5: an empty weekly schedule is saved as closed with no next opening or pickup slots", async ({ request, playwright }) => {
  const f = workspace(); const t = sgDate(1); const cafe = approved(f, { hours: [interval(t.weekday, "09:00", "12:00")] }); await login(request, f.owner);
  expect((await cafeBody(await save(request, await settings(request, { openingHours: [] })), 200))!.openingHours).toEqual([]);
  expect(storedHours(cafe)).toEqual([]); expect((await current(request))!.openingHours).toEqual([]);
  await withCustomer(playwright, f, async customer => {
    expect((await (await customer.get(`/api/customer/cafes/${cafe}`)).json()).cafe.openingHours).toEqual([]);
    const card = ((await (await customer.get("/api/customer/cafes")).json()).items as { cafeId: string; isOpen: boolean; nextOpeningAt: string | null }[]).find(c => c.cafeId === cafe);
    expect(card).toMatchObject({ isOpen: false, nextOpeningAt: null });
    expect(await slots(customer, cafe)).toEqual([]);
  });
});

test("OWN-02.6 OWN-04.6: existing order snapshots and pickup instants survive profile, hour and cutoff changes; new orders and stale slots use current rules", async ({ request, playwright }) => {
  const f = orderFixture(); const existing = history(f, "pending"); const accepted = history(f, "accepted");
  const customer = await session(playwright, f.customer);
  try {
    const before = [await ownOrder(customer, existing), await ownOrder(customer, accepted)];
    const lastSlot = `${f.tomorrow.date}T03:45:00Z`; // 11:45 SGT, permitted at the default 15-minute cutoff.
    expect((await slots(customer, f.cafe))).toContain(Date.parse(lastSlot));
    await login(request, f.owner);
    await cafeBody(await save(request, await settings(request, { description: "Changed after ordering", pickupSettings: { pickupCutoffMinutes: 60 } })), 200);
    expect([await ownOrder(customer, existing), await ownOrder(customer, accepted)]).toEqual(before);
    // The previously displayed 11:45 slot is stale under the 60-minute cutoff; 11:00 is still permitted.
    await failure(await create(customer, f.payload({ pickupAt: lastSlot })), 409, "STATE_CONFLICT");
    const placed = await orderResponse(await create(customer, f.payload({ pickupAt: `${f.tomorrow.date}T03:00:00Z` })), 201);
    await cafeBody(await save(request, await settings(request, { openingHours: [] })), 200);
    expect([await ownOrder(customer, existing), await ownOrder(customer, accepted), await ownOrder(customer, placed.orderId)]).toEqual([...before, placed]);
    await failure(await create(customer, f.payload({ pickupAt: `${f.tomorrow.date}T02:00:00Z` })), 409, "STATE_CONFLICT");
  } finally { await customer.dispose(); }
});

for (const [cutoff, last] of [[0, "11:45"], [15, "11:45"], [20, "11:30"], [180, "09:00"]] as const) test(`OWN-04.4 OWN-04.2: cutoff ${cutoff} permits slots through ${last}, includes equality and always excludes closing`, async ({ request, playwright }) => {
  const f = workspace(); const t = sgDate(1); const cafe = approved(f, { hours: [interval(t.weekday, "09:00", "12:00")] }); await login(request, f.owner);
  await cafeBody(await save(request, await settings(request, { pickupSettings: { pickupCutoffMinutes: cutoff } })), 200);
  expect((await current(request))!.pickupSettings).toEqual({ pickupCutoffMinutes: cutoff });
  await withCustomer(playwright, f, async customer => {
    const result = await slots(customer, cafe);
    expect(result).toEqual(grid(t.date, "09:00", t.date, last)); expect(result).not.toContain(sgt(t.date, "12:00"));
  });
});

test("OWN-04.4: adjacent intervals use their continuous closing, and overnight cutoff uses the actual next Singapore date", async ({ request, playwright }) => {
  const f = workspace(); const t = sgDate(1); const next = sgDate(2);
  const cafe = approved(f); await login(request, f.owner);
  await cafeBody(await save(request, await settings(request, { pickupSettings: { pickupCutoffMinutes: 60 },
    openingHours: [interval(t.weekday, "09:00", "10:00"), interval(t.weekday, "10:00", "11:00")] })), 200);
  await withCustomer(playwright, f, async customer => {
    expect(await slots(customer, cafe)).toEqual(grid(t.date, "09:00", t.date, "10:00"));
    await cafeBody(await save(request, await settings(request, { pickupSettings: { pickupCutoffMinutes: 30 }, openingHours: [interval(t.weekday, "22:00", "01:00", true)] })), 200);
    expect(await slots(customer, cafe)).toEqual(grid(t.date, "22:00", next.date, "00:30"));
  });
});

test("OWN-04.5: a cutoff leaving no permitted time offers no slot from that interval without extending hours or relaxing the rule", async ({ request, playwright }) => {
  const f = workspace(); const t = sgDate(1); const cafe = approved(f); await login(request, f.owner);
  await cafeBody(await save(request, await settings(request, { pickupSettings: { pickupCutoffMinutes: 180 }, openingHours: [interval(t.weekday, "09:00", "11:45")] })), 200);
  await withCustomer(playwright, f, async customer => {
    expect(await slots(customer, cafe)).toEqual([]);
    await cafeBody(await save(request, await settings(request, { openingHours: [interval(t.weekday, "09:00", "11:45"), interval(t.weekday, "13:00", "16:15")] })), 200);
    expect(await slots(customer, cafe)).toEqual(grid(t.date, "13:00", t.date, "13:15"));
  });
});

for (const [name, value] of [["181", 181], ["-1", -1], ["fractional 15.5", 15.5], ["numeric string", "30"], ["null", null], ["boolean", true], ["1e3", 1e3]] as const)
  test(`OWN-04.3: cutoff ${name} is not persisted and rejects the whole batch`, async ({ request }) => {
    const f = workspace(); const cafe = approved(f, { cutoff: 25 }); await login(request, f.owner); const before = snapshot(cafe);
    await failure(await save(request, await settings(request, { description: "Not saved", pickupSettings: { pickupCutoffMinutes: value } })), 400, "INVALID_REQUEST");
    expect(snapshot(cafe)).toEqual(before);
  });
test("OWN-04.3: later settings saves require an explicit cutoff and do not reset it to the default", async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { cutoff: 25 }); await login(request, f.owner); const before = snapshot(cafe);
  for (const pickupSettings of [{}, { pickupCutoffMinutes: 25, leadMinutes: 15 }]) await failure(await save(request, await settings(request, { pickupSettings })), 400, "INVALID_REQUEST");
  expect(snapshot(cafe)).toEqual(before);
});
for (const cutoff of [0, 180]) test(`OWN-04.2: boundary cutoff ${cutoff} is saved for this café only`, async ({ request }) => {
  const f = workspace(); const cafe = approved(f); const other = approved(f); await login(request, f.owner);
  expect((await cafeBody(await save(request, await settings(request, { pickupSettings: { pickupCutoffMinutes: cutoff } })), 200))!.pickupSettings).toEqual({ pickupCutoffMinutes: cutoff });
  expect(cafeRow(cafe).pickup_cutoff_minutes).toBe(cutoff); expect(cafeRow(other).pickup_cutoff_minutes).toBe(15);
});

test("OWN-02.7 OWN-04.7: suspended owners keep management, which never clears suspension or restores Customer visibility", async ({ request, playwright }) => {
  const f = workspace(); const t = sgDate(1); const cafe = approved(f, { suspended: true, hours: [interval(t.weekday, "09:00", "12:00")] }); await login(request, f.owner);
  const saved = (await cafeBody(await save(request, await settings(request, { description: "Edited during suspension", pickupSettings: { pickupCutoffMinutes: 5 }, openingHours: [interval(t.weekday, "08:00", "12:00")] })), 200))!;
  expect(saved).toMatchObject({ applicationState: "approved", suspended: true, suspensionVersion: 1, suspensionReason: "PRIVATE-SUSPENSION-REASON", description: "Edited during suspension", pickupSettings: { pickupCutoffMinutes: 5 } });
  expect(cafeRow(cafe)).toMatchObject({ suspended: true, suspension_version: 1, application_state: "approved" });
  await withCustomer(playwright, f, async customer => {
    expect(await customerVisible(customer, f.customer.id, cafe)).toEqual(hidden);
    expect((await customer.get(`/api/customer/cafes/${cafe}/pickup-slots`)).status()).toBe(404);
  });
});

for (const state of ["pending", "rejected"] as const) test(`OWN-02.7 OWN-04.7: ${state} cafés cannot save settings or become approved by editing`, async ({ request, playwright }) => {
  const f = workspace(); const cafe = arrangeCafe(f.owner, { state }); await login(request, f.owner); const before = snapshot(cafe);
  await failure(await save(request, { description: "Edited", openingHours: [], pickupSettings: { pickupCutoffMinutes: 30 }, expectedSuspensionVersion: 0 }), 409, "STATE_CONFLICT");
  expect(snapshot(cafe)).toEqual(before);
  await withCustomer(playwright, f, async customer => expect(await customerVisible(customer, f.customer.id, cafe)).toEqual(hidden));
});

test("OWN-02.7 OWN-04.7: a save overtaken by an Admin suspension change returns the suspension conflict and writes nothing; the next explicit save succeeds", async ({ request, playwright }) => {
  const f = workspace(); const cafe = approved(f); await login(request, f.owner);
  const stale = await settings(request, { description: "In-flight edit", pickupSettings: { pickupCutoffMinutes: 40 } });
  suspend(f, cafe, true, "Overtaking suspension"); const before = snapshot(cafe);
  const response = await save(request, stale); await failure(response, 409, "STATE_CONFLICT");
  expect((await response.json()).error.message).toBe(suspensionConflict); expect(snapshot(cafe)).toEqual(before);
  const fresh = (await current(request))!; expect(fresh).toMatchObject({ suspended: true, suspensionVersion: 1, suspensionReason: "Overtaking suspension" });
  expect(await cafeBody(await save(request, { ...stale, expectedSuspensionVersion: 1 }), 200)).toMatchObject({ description: "In-flight edit", suspended: true, suspensionVersion: 1 });
  suspend(f, cafe, false, "Restored"); await failure(await save(request, { ...stale, expectedSuspensionVersion: 1 }), 409, "STATE_CONFLICT");
  await withCustomer(playwright, f, async customer => expect(await customerVisible(customer, f.customer.id, cafe)).toEqual(visible));
});

for (const value of [-1, 1.5, "0", null, Number.MAX_SAFE_INTEGER + 1]) test(`OWN-02.8: expectedSuspensionVersion ${String(value)} is strictly typed`, async ({ request }) => {
  const f = workspace(); const cafe = approved(f); await login(request, f.owner); const before = snapshot(cafe);
  await failure(await save(request, await settings(request, { expectedSuspensionVersion: value })), 400, "INVALID_REQUEST"); expect(snapshot(cafe)).toEqual(before);
});

for (const role of ["anonymous", "customer", "admin"] as const) test(`OWN-02.8 OWN-04.8: ${role} profile, hour and pickup-rule operations are refused without disclosure or mutation`, async ({ request }) => {
  const f = workspace(); const cafe = approved(f, { description: "PRIVATE-OWNER-MARKER" }); const before = snapshot(cafe);
  if (role !== "anonymous") await login(request, f[role]);
  const [status, code] = role === "anonymous" ? [401, "UNAUTHENTICATED"] : [403, "FORBIDDEN"];
  const responses = [await read(request), await save(request, { description: "x", openingHours: [], pickupSettings: { pickupCutoffMinutes: 0 }, expectedSuspensionVersion: 0 })];
  for (const response of responses) { await failure(response, status, code); }
  expect(await (await read(request)).text()).not.toContain("PRIVATE-OWNER-MARKER"); expect(snapshot(cafe)).toEqual(before);
});

for (const kit of [false, true]) test(`OWN-02.8 OWN-04.8: ${kit ? "kit" : "main"} owners only reach their own café; missing cafés give 404 and foreign cafés never change`, async ({ request, playwright }) => {
  const f = workspace(kit); const foreign = approved(f, { description: "FOREIGN-PRIVATE-MARKER" }); const elsewhere = workspace(!kit); const outside = approved(elsewhere);
  const before = [snapshot(foreign), snapshot(outside)];
  const owner = await session(playwright, f.other);
  try {
    const response = await read(owner); const raw = await response.text(); expect(response.status()).toBe(200); expect(JSON.parse(raw).cafe).toBeNull();
    expect(raw).not.toContain("FOREIGN-PRIVATE-MARKER");
    await failure(await save(owner, { description: "Hijack", openingHours: [], pickupSettings: { pickupCutoffMinutes: 0 }, expectedSuspensionVersion: 0 }), 404, "NOT_FOUND");
    await failure(await save(owner, { cafeId: foreign, description: "Hijack", openingHours: [], pickupSettings: { pickupCutoffMinutes: 0 }, expectedSuspensionVersion: 0 }), 400, "INVALID_REQUEST");
  } finally { await owner.dispose(); }
  await login(request, f.owner); expect((await current(request))!.cafeId).toBe(foreign);
  expect([snapshot(foreign), snapshot(outside)]).toEqual(before);
});

test("OWN-02.8 OWN-04.8: settings transport rejects cross-origin, wrong media, malformed JSON, oversize, unsupported methods and queries", async ({ request }) => {
  const f = workspace(); const cafe = approved(f); await login(request, f.owner); const data = await settings(request, { description: "Transport" }); const before = snapshot(cafe);
  for (const value of ["https://evil.example", "null"]) await failure(await request.post(routes.settings, { headers: { origin: value }, data }), 403, "FORBIDDEN");
  await failure(await request.post(routes.settings, { headers: { "content-type": "application/json" }, data: JSON.stringify(data) }), 403, "FORBIDDEN");
  await failure(await request.post(routes.settings, { headers: { origin, "content-type": "text/plain" }, data: JSON.stringify(data) }), 415, "UNSUPPORTED_MEDIA_TYPE");
  await failure(await request.post(routes.settings, { headers: { origin, "content-type": "application/json" }, data: "{" }), 400, "INVALID_REQUEST");
  await failure(await save(request, { ...data, description: "😀".repeat(16_400) }), 413, "PAYLOAD_TOO_LARGE");
  const method = await request.fetch(routes.settings, { method: "PATCH", headers: { origin }, data }); await failure(method, 405, "METHOD_NOT_ALLOWED");
  expect(method.headers().allow.split(/,\s*/)).toContain("POST");
  expect(snapshot(cafe)).toEqual(before);
});
