import { expect, test, type APIRequestContext } from "@playwright/test";
import { localSql } from "../accounts/local";
import { origin, q } from "../../integration/moderation/fixtures";
import { base, failure, fixture, login } from "./fixtures";

const endpoints = ["browse", "detail", "reviews"] as const;
function route(endpoint: typeof endpoints[number], cafe: string) {
  return endpoint === "browse" ? base : `${base}/${cafe}${endpoint === "reviews" ? "/reviews" : ""}`;
}

for (const endpoint of endpoints) {
  const queries = ["unknown=x", "__proto__=x", "__proto__=x&__proto__=y",
    endpoint === "detail" ? "page=1" : "page=1&page=2"];
  for (const query of queries) test(`CUS-01.5 CUS-02.1 CUS-02.4: ${endpoint} rejects undeclared or duplicate URL keys ${query}`, async ({ request }) => {
    const f = fixture(); await login(request, f.customer);
    await failure(await request.get(`${route(endpoint, f.cafe)}?${query}`), 400, "INVALID_REQUEST");
  });
  for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) test(`CUS-01.5 CUS-02.1 CUS-02.4: ${endpoint} ${method} uses the shared unsupported-method JSON boundary`, async ({ request }) => {
    const f = fixture(); await login(request, f.customer);
    const marker = `SUBMITTED METHOD DATA ${f.cafe}`;
    const response = await request.fetch(route(endpoint, f.cafe), {
      method, headers: { origin }, data: { probe: marker },
    });
    await failure(response, 405, "METHOD_NOT_ALLOWED");
    // The contract requires advertising GET; it does not define a new
    // HEAD/OPTIONS policy or require an exact framework-generated Allow list.
    const allow = (response.headers().allow ?? "").split(",").map(value => value.trim());
    expect(allow).toContain("GET"); expect(allow).not.toContain(method);
    const body = await response.json();
    expect(body.error.message).not.toMatch(/[<>]/);
    for (const value of [marker, f.cafe, f.name, f.customer.id, f.customer.email]) expect(JSON.stringify(body)).not.toContain(value);
  });
}

/** Distinct PostgreSQL instants, deliberately reversed against reference order. */
function precisionFixture() {
  const f = fixture();
  const prefix = f.cafe.slice(0, 24);
  const earlier = `${prefix}000000000001`, later = `${prefix}000000000002`;
  const earlierAt = "2026-01-01T00:00:00.123001Z", laterAt = "2026-01-01T00:00:00.123999Z";
  const earlierText = `EARLIER ORIGINAL REVIEW ${f.cafe}`, laterText = `LATER ORIGINAL REVIEW ${f.cafe}`;
  f.review("pending", { id: earlier, [f.reviewTime]: earlierAt, [f.reviewText]: earlierText });
  f.review("kept", { id: later, [f.reviewTime]: laterAt, [f.reviewText]: laterText });
  const recent = Array.from({ length: 19 }, () => f.review("pending", { [f.reviewTime]: "2026-01-02T00:00:00Z" })).sort();
  // Prove setup retained both microsecond values before exercising application
  // reads. Do not pass them through JavaScript Date, which truncates precision.
  const stored = JSON.parse(localSql(`select json_agg(t order by id) from (
    select id,to_char(submitted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as instant
    from public.reviews where id in (${q(earlier)},${q(later)})
  ) t;`));
  expect(stored).toEqual([{ id: earlier, instant: earlierAt }, { id: later, instant: laterAt }]);
  return { ...f, earlier, later, recent, earlierText, laterText };
}
type ReviewPage = { items: { reviewId: string; submittedAt: string; text: string }[]; page: number; pageSize: number; hasNextPage: boolean };
async function reviews(request: APIRequestContext, cafe: string, page: number): Promise<ReviewPage> {
  const response = await request.get(`${base}/${cafe}/reviews?page=${page}`);
  expect(response.status()).toBe(200); return response.json();
}
test("CUS-02.4: original sub-millisecond submission order determines the 20-review page boundary before reference ties", async ({ request }) => {
  const f = precisionFixture(); await login(request, f.reader);
  const first = await reviews(request, f.cafe, 1), second = await reviews(request, f.cafe, 2);
  expect(first.items).toHaveLength(20); expect(first.hasNextPage).toBe(true);
  expect(second.items).toHaveLength(1); expect(second.hasNextPage).toBe(false);
  expect(first.items.map(r => r.reviewId)).toEqual([...f.recent, f.later]);
  expect(second.items.map(r => r.reviewId)).toEqual([f.earlier]);
});
test("CUS-02.4: public review UTC timestamps retain the original microsecond instants", async ({ request }) => {
  const f = precisionFixture(); await login(request, f.reader);
  const all = [...(await reviews(request, f.cafe, 1)).items, ...(await reviews(request, f.cafe, 2)).items];
  // Equivalent trailing fractional zeros are allowed; millisecond truncation is not.
  expect(all.find(r => r.reviewId === f.later)?.submittedAt).toMatch(/^2026-01-01T00:00:00\.1239990*Z$/);
  expect(all.find(r => r.reviewId === f.earlier)?.submittedAt).toMatch(/^2026-01-01T00:00:00\.1230010*Z$/);
});
test("CUS-02.4: café review navigation preserves original sub-millisecond ordering across pages", async ({ page }) => {
  const f = precisionFixture(); await login(page.request, f.reader);
  await page.goto(`/customer/cafes/${f.cafe}`);
  await expect(page.getByText(f.laterText, { exact: true })).toBeVisible();
  await expect(page.getByText(f.earlierText, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Next reviews", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/customer/cafes/${f.cafe}\\?page=2$`));
  await expect(page.getByText(f.earlierText, { exact: true })).toBeVisible();
  await expect(page.getByText(f.laterText, { exact: true })).toHaveCount(0);
});
