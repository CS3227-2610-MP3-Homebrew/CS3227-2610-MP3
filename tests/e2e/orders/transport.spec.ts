import { expect, test } from "@playwright/test";
import { base, create, failure, fixture, history, login, orderCount, origin, q, stored } from "./fixtures";
import { localSql } from "../accounts/local";

for (const attack of [
  { name: "missing origin", headers: { "content-type": "application/json" }, data: "{}", status: 403, code: "FORBIDDEN" },
  { name: "foreign origin", headers: { origin: "https://example.invalid", "content-type": "application/json" }, data: "{}", status: 403, code: "FORBIDDEN" },
  { name: "malformed origin", headers: { origin: origin + "/", "content-type": "application/json" }, data: "{}", status: 403, code: "FORBIDDEN" },
  { name: "non-JSON", headers: { origin, "content-type": "text/plain" }, data: "{}", status: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
  { name: "malformed JSON", headers: { origin, "content-type": "application/json" }, data: "{", status: 400, code: "INVALID_REQUEST" },
  { name: "oversized UTF-8", headers: { origin, "content-type": "application/json" }, data: JSON.stringify({ x: "😀".repeat(17000) }), status: 413, code: "PAYLOAD_TOO_LARGE" },
  { name: "array", headers: { origin, "content-type": "application/json" }, data: "[]", status: 400, code: "INVALID_REQUEST" },
] as const) test(`CUS-03.8 CUS-04.8: ${attack.name} gives exact transport error without mutations`, async ({ request }) => {
  const f = fixture(); const id = history(f); const before = stored(id); await login(request, f.customer);
  const headers = Object.fromEntries(Object.entries(attack.headers).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const url of [base, `${base}/${id}/cancel`]) await failure(await request.post(url, { headers, data: attack.data }), attack.status, attack.code);
  expect(stored(id)).toEqual(before); expect(orderCount(f.customer.id)).toBe(1);
});
for (const data of [{ state: "cancelled" }, { cancellationReason: "Cafe is suspended" }, { customerId: "forged" }]) test(`CUS-04.8: cancellation requires exactly empty object, rejects ${Object.keys(data)[0]}`, async ({ request }) => {
  const f = fixture(); const id = history(f); const before = stored(id); await login(request, f.customer);
  await failure(await request.post(`${base}/${id}/cancel`, { headers: { origin }, data }), 400, "INVALID_REQUEST"); expect(stored(id)).toEqual(before);
});
for (const key of ["cafeId", "pickupAt", "items", "expectedTotalCents", "submissionKey"]) test(`CUS-03.8: missing required ${key} is invalid`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data: Record<string, unknown> = f.payload(); delete data[key];
  await failure(await create(request, data), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
});
for (const [key, value] of [["cafeId", ""], ["cafeId", "😀".repeat(129)], ["expectedTotalCents", -1], ["expectedTotalCents", 1.5], ["expectedTotalCents", "1025"], ["expectedTotalCents", Number.MAX_SAFE_INTEGER + 1], ["submissionKey", "not-a-uuid"], ["submissionKey", "ABCDEFAB-1234-4234-8234-ABCDEFABCDEF"]] as const)
  test(`CUS-03.8: strict ${key} rejects ${String(value).slice(0, 20)}`, async ({ request }) => {
    const f = fixture(); await login(request, f.customer);
    await failure(await create(request, { ...f.payload(), [key]: value }), 400, "INVALID_REQUEST"); expect(orderCount(f.customer.id)).toBe(0);
  });
test("CUS-03.8: nested item objects reject unknown fields and non-string references", async ({ request }) => {
  const f = fixture(); await login(request, f.customer);
  for (const item of [{ itemId: f.item, quantity: 1, price: 0 }, { itemId: 1, quantity: 1 }]) await failure(await create(request, { ...f.payload(), items: [item] }), 400, "INVALID_REQUEST");
  expect(orderCount(f.customer.id)).toBe(0);
});
test("CUS-03.8 CUS-04.8: unsupported methods advertise allowed methods with exact JSON errors", async ({ request }) => {
  const f = fixture(); const id = history(f); await login(request, f.customer); const before = stored(id);
  for (const [url, method, allowed] of [[base, "PUT", "GET"], [`${base}/${id}`, "POST", "GET"], [`${base}/${id}/cancel`, "GET", "POST"], [`/api/customer/cafes/${f.cafe}/pickup-slots`, "POST", "GET"]] as const) {
    const response = await request.fetch(url, { method, headers: { origin }, data: {} });
    await failure(response, 405, "METHOD_NOT_ALLOWED"); expect(response.headers().allow.split(/,\s*/)).toContain(allowed);
  } expect(stored(id)).toEqual(before);
});
for (const query of ["page=0", "page=01", "page=-1", "page=1.5", "page=9007199254740992", "page=1&page=2", "unknown=x"]) test(`CUS-04.1: strict order-list query rejects ${query}`, async ({ request }) => {
  const f = fixture(); await login(request, f.customer); await failure(await request.get(`${base}?${query}`), 400, "INVALID_REQUEST");
});
test("CUS-03.2 CUS-04.1: detail and pickup reads accept no query, and paths enforce Ref bounds", async ({ request }) => {
  const f = fixture(); const id = history(f); await login(request, f.customer);
  for (const url of [`${base}/${id}?extra=x`, `/api/customer/cafes/${f.cafe}/pickup-slots?extra=x`, `${base}/${"x".repeat(129)}`, `/api/customer/cafes/${"x".repeat(129)}/pickup-slots`]) await failure(await request.get(url), 400, "INVALID_REQUEST");
});
test("CUS-03.1: transactional item failure returns safe 500 and rolls back order, lines and successful-key admission", async ({ request }) => {
  const f = fixture(); await login(request, f.customer); const data = f.payload();
  // A cafe-specific local fault cannot affect parallel synthetic workspaces.
  const suffix = f.cafe.replaceAll("-", ""); const name = `t42_fail_${suffix}`;
  localSql(`create function private.${name}() returns trigger language plpgsql as $$ begin if new.cafe_id=${q(f.cafe)}::uuid then raise exception 'Synthetic private SQL failure'; end if; return new; end; $$; create trigger ${name} before insert on public.order_items for each row execute function private.${name}();`);
  try {
    await failure(await create(request, data), 500, "INTERNAL_ERROR"); expect(orderCount(f.customer.id)).toBe(0);
    expect(localSql(`select count(*) from public.order_items where cafe_id=${q(f.cafe)};`)).toBe("0");
  } finally { localSql(`drop trigger ${name} on public.order_items; drop function private.${name}();`); }
  expect((await create(request, data)).status()).toBe(201); expect(orderCount(f.customer.id)).toBe(1);
});
