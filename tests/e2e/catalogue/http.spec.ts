import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { localSql, provisionAccount } from "../accounts/local";
import { insert, q, stored } from "../../integration/moderation/fixtures";
import { base, detail, failure, fixture, list, login } from "./fixtures";

test("CUS-01.7: main and kit customers cannot read each other's catalogue", async ({ request, playwright }) => {
  const f = fixture(); await login(request, f.customer); const kit = await list(request);
  const main = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    await login(main, provisionAccount("customer")); const showcase = await list(main);
    expect(showcase.items.map(c => c.cafeId)).not.toContain(f.cafe);
    for (const cafe of showcase.items) expect(kit.items.map(c => c.cafeId)).not.toContain(cafe.cafeId);
    await failure(await main.get(`${base}/${f.cafe}`), 404, "NOT_FOUND");
  } finally { await main.dispose(); }
});

test("CUS-01.1: exact mean sorting precedes displayed rounding, count and reference ties, with half-up precision", async ({ request }) => {
  const f = fixture();
  function rated(ratings: number[]) {
    const id = f.cafeRecord();
    for (const rating of ratings) {
      const order = randomUUID(); insert("public.orders", { id: order, cafe_id: id, customer_id: f.customer.id });
      insert("public.reviews", { id: randomUUID(), order_id: order, customer_id: f.customer.id, rating, text: "Synthetic rating", moderation_state: "kept" });
    } return id;
  }
  const half = rated([4, 4, 4, 5]); // 4.25 -> 4.3, half-up.
  const higher = rated([4, 4, 4, 4, 4, 4, 4, 5, 5, 5]); // 4.3 beats 4.25 despite equal display.
  const many = rated([4, 4]); const tied = [rated([4]), rated([4])].sort();
  await login(request, f.customer); const result = await list(request);
  expect(result.items.map(c => c.cafeId)).toEqual([higher, half, many, ...tied, f.cafe]);
  expect(result.items.find(c => c.cafeId === half)?.rating).toEqual({ average: 4.3, visibleReviewCount: 4 });
});

test("CUS-01.1 CUS-01.7: all eligible open/closed cafes paginate 20 with strict public projection and workspace isolation", async ({ request }) => {
  const f = fixture(); const foreign = fixture();
  const ids = [f.cafe, ...Array.from({ length: 21 }, () => f.cafeRecord())].sort();
  const denied = [f.cafeRecord("pending"), f.cafeRecord("rejected"), f.cafeRecord("approved", true), foreign.cafe];
  await login(request, f.customer);
  const first = await list(request); const second = await list(request, "?page=2");
  expect(first).toEqual({ requestId: expect.any(String), items: expect.any(Array), page: 1, pageSize: 20, hasNextPage: true });
  expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(2); expect(second.hasNextPage).toBe(false);
  const cards = [...first.items, ...second.items]; expect(cards.map(c => c.cafeId)).toEqual(ids);
  for (const c of cards) { expect(Object.keys(c).sort()).toEqual(["cafeId", "name", "area", "rating", "isOpen", "closingSoon", "nextOpeningAt"].sort()); expect(c.rating).toEqual({ average: null, visibleReviewCount: 0 }); expect(c.isOpen).toBe(false); }
  for (const id of denied) expect(cards.map(c => c.cafeId)).not.toContain(id);
  expect((await list(request, "?page=999")).items).toEqual([]);
});
test("CUS-01.1 CUS-02.4 CUS-02.5: visible ratings and public reviews reflect hide/restore without rewriting originals", async ({ request }) => {
  const f = fixture(); const pending = f.review("pending", { rating: 5 }); const kept = f.review("kept", { rating: 4 }); const hidden = f.review("hidden", { rating: 1 });
  await login(request, f.reader);
  const before = stored(pending);
  async function read(expected: string[], average: number) {
    const r = await request.get(`${base}/${f.cafe}/reviews`); expect(r.status()).toBe(200); const body = await r.json();
    expect(body.pageSize).toBe(20); expect(body.items.map((r: { reviewId: string }) => r.reviewId)).toEqual(expected.sort());
    for (const row of body.items) { expect(Object.keys(row).sort()).toEqual(["reviewId", "rating", "text", "submittedAt", "authorLabel"].sort()); expect(row.authorLabel).toBe("Verified customer"); }
    expect((await detail(request, f.cafe)).rating).toEqual({ average, visibleReviewCount: expected.length });
    expect((await list(request)).items[0].rating).toEqual({ average, visibleReviewCount: expected.length });
  }
  await read([pending, kept], 4.5);
  localSql(`update public.reviews set moderation_state='hidden' where id=${q(pending)};`); await read([kept], 4);
  localSql(`update public.reviews set moderation_state='kept' where id=${q(pending)};`); await read([pending, kept], 4.5);
  expect(stored(pending)).toEqual({ ...before, moderation_state: "kept" }); expect(stored(hidden).rating).toBe(1);
});
test("CUS-02.4: reviews paginate newest first then reference, hidden and foreign rows excluded", async ({ request }) => {
  const f = fixture(); const ids = Array.from({ length: 21 }, () => f.review("pending")); const newest = f.review("kept", { submitted_at: "2026-02-01T00:00:00Z" }); f.review("hidden"); fixture().review("kept");
  await login(request, f.reader);
  const a = await request.get(`${base}/${f.cafe}/reviews`); expect(a.status()).toBe(200); const b = await request.get(`${base}/${f.cafe}/reviews?page=2`); expect(b.status()).toBe(200);
  const first = await a.json(), second = await b.json(); expect(first.items).toHaveLength(20); expect(first.hasNextPage).toBe(true); expect(second.hasNextPage).toBe(false);
  expect([...first.items, ...second.items].map(r => r.reviewId)).toEqual([newest, ...ids.sort()]);
});
for (const query of ["area=central", "area=Central%20", "drinkType=Coffee", "drinkType=null", "timeMode=at", "timeMode=now&at=2026-10-19T01:00:00Z", "timeMode=at&at=2026-10-19T01:00:01Z", "timeMode=at&at=2026-02-30T01:00:00Z", "page=0", "page=01", "page=-1", "page=1.5", "page=9007199254740992", "page=+1", "unknown=x", "area=East&area=West", "page=1&page=2"]) test(`CUS-01.5: strict filter/query rejects ${query}`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer); await failure(await request.get(`${base}?${query}`), 400, "INVALID_REQUEST");
});
for (const role of [null, "owner", "admin"] as const) test(`CUS-01.8 CUS-02.9: ${role ?? "anonymous"} cannot read protected JSON`, async ({ request }) => {
  if (role) await login(request, provisionAccount(role, true));
  for (const url of [base, `${base}/${randomUUID()}`, `${base}/${randomUUID()}/reviews`]) await failure(await request.get(url), role ? 403 : 401, role ? "FORBIDDEN" : "UNAUTHENTICATED");
});
test("CUS-01.6 CUS-02.6 CUS-02.7: direct and stale reads repeat indistinguishable current eligibility checks", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); expect((await list(request)).items.map(c => c.cafeId)).toContain(f.cafe); await detail(request, f.cafe);
  localSql(`update public.cafes set suspended=true where id=${q(f.cafe)};`);
  const ids = [f.cafe, randomUUID(), f.cafeRecord("pending"), f.cafeRecord("rejected"), fixture().cafe];
  for (const id of ids) for (const suffix of ["", "/reviews"]) await failure(await request.get(`${base}/${id}${suffix}`), 404, "NOT_FOUND");
  expect((await list(request)).items).toEqual([]);
});
for (const type of ["coffee", "matcha", "tea", "chocolate", "juice", "other"]) test(`CUS-01.4 CUS-01.5: exact ${type} sold-out match combines with area/time by AND`, async ({ request }) => {
  const f = fixture(); f.fields(); f.menu(type, true); await login(request, f.customer);
  expect((await list(request, `?drinkType=${type}&area=Central`)).items.map(c => c.cafeId)).toEqual([f.cafe]);
  expect((await list(request, `?drinkType=${type}&area=West`)).items).toEqual([]);
  expect((await list(request, `?drinkType=${type}&timeMode=now`)).items).toEqual([]);
  expect((await list(request, `?drinkType=${type === "coffee" ? "tea" : "coffee"}`)).items).toEqual([]);
});
for (const area of ["Central", "North", "South", "East", "West"]) test(`CUS-01.5: exact area ${area} matches only its workspace records`, async ({ request }) => {
  const f = fixture(); f.fields(f.cafe, area); await login(request, f.customer); expect((await list(request, `?area=${area}`)).items.map(c => c.cafeId)).toEqual([f.cafe]);
});
