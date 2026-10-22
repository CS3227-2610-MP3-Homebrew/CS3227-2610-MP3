import { expect, test } from "@playwright/test";
import { fixture, login, failure, base } from "../catalogue/fixtures";
import { localSql, provisionAccount } from "../accounts/local";
import { fixture as orderFixture, create, orderCount } from "../orders/fixtures";
import { q } from "../../integration/moderation/fixtures";
const path = "/api/ai/brew-finder";
const body = { query: "iced coffee", filters: { timeMode: "all", at: null, drinkType: null, area: null } };
const headers = { origin: "http://127.0.0.1:3100" };

for (const main of [false, true]) test(`CUS-06.4 CUS-06.9: E13 ${main ? "main" : "kit"} real disabled route preserves independent scoped catalogue`, async ({ request }) => {
  const f = fixture(main); f.fields(); f.menu(); const other = fixture(!main); other.fields(); other.menu();
  await login(request, f.customer);
  const r = await request.post(path, { headers, data: body }); expect(r.status()).toBe(200); expect(r.headers()["cache-control"]).toBe("private, no-store");
  expect(await r.json()).toEqual({ requestId: expect.any(String), feature: "brew_finder", mode: "fallback", reason: "disabled", fallback: "rating_sorted_catalogue" });
  const own = await (await request.get(base)).json(); expect((await request.get(`${base}/${f.cafe}`)).status()).toBe(200);
  expect(own.items.some((c: { cafeId: string }) => c.cafeId === other.cafe)).toBe(false);
  await failure(await request.post(path, { headers, data: { ...body, workspaceId: other.customer.workspaceId } }), 400, "INVALID_REQUEST");
  await failure(await request.get(`${base}/${other.cafe}`), 404, "NOT_FOUND");
});
for (const role of [null, "owner", "admin"] as const) test(`CUS-06.3: real HTTP ${role ?? "anonymous"} denied without protected fallback`, async ({ request }) => {
  if (role) await login(request, provisionAccount(role, true));
  await failure(await request.post(path, { headers, data: body }), role ? 403 : 401, role ? "FORBIDDEN" : "UNAUTHENTICATED");
});
test("CUS-06.14: E13 real cross-site and missing-origin cookie POST denied", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  for (const h of [{ origin: "https://evil.invalid" }, {}] as Record<string, string>[]) await failure(await request.post(path, { headers: h, data: body }), 403, "FORBIDDEN");
});
test("CUS-06.15: E10 advice references grant neither stale cafe access nor an order write", async ({ request }) => {
  const f = orderFixture(); await login(request, f.customer);
  const search = await request.post(path, { headers, data: body }); expect(search.status()).toBe(200); expect(orderCount(f.customer.id)).toBe(0);
  localSql(`update public.cafes set suspended=true where id=${q(f.cafe)};`);
  await failure(await request.get(`${base}/${f.cafe}`), 404, "NOT_FOUND");
  await failure(await create(request, f.payload()), 404, "NOT_FOUND"); expect(orderCount(f.customer.id)).toBe(0);
  const other = orderFixture(); await failure(await create(request, other.payload()), 404, "NOT_FOUND"); expect(orderCount(f.customer.id)).toBe(0);
});
