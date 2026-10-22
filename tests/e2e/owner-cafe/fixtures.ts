import { expect, type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs } from "@playwright/test";
import { login } from "../moderation/helpers";
import { asActor, origin, ownerCafeKeys, q, routes, type OwnerCafe } from "../../integration/owner-cafe/fixtures";
export * from "../../integration/owner-cafe/fixtures";
export { login, failure } from "../moderation/helpers";

export const read = (r: APIRequestContext) => r.get(routes.cafe);
export const post = (r: APIRequestContext, path: string, data: unknown) => r.post(path, { headers: { origin }, data });
export const submit = (r: APIRequestContext, data: unknown) => post(r, routes.applications, data);
export const resubmit = (r: APIRequestContext, data: unknown) => post(r, routes.resubmit, data);
export const save = (r: APIRequestContext, data: unknown) => post(r, routes.settings, data);

/** Asserts the shared private JSON success envelope with exactly {requestId, cafe}. */
export async function cafeBody(response: APIResponse, status: number): Promise<OwnerCafe | null> {
  expect(response.status()).toBe(status);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["content-type"]).toMatch(/^application\/json/);
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(["cafe", "requestId"]);
  expect(body.requestId).toEqual(expect.any(String)); expect(body.requestId.length).toBeGreaterThan(0);
  if (body.cafe !== null) {
    expect(Object.keys(body.cafe).sort()).toEqual(ownerCafeKeys);
    expect(Object.keys(body.cafe.pickupSettings)).toEqual(["pickupCutoffMinutes"]);
    expect(body.cafe.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    if (body.cafe.latestDecision) expect(Object.keys(body.cafe.latestDecision).sort()).toEqual(["decidedAt", "decision", "reason"]);
  }
  return body.cafe;
}
export async function current(r: APIRequestContext) { return cafeBody(await read(r), 200); }
/** Settings payload for an approved café, from the last owner read. */
export async function settings(r: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const cafe = (await current(r))!;
  return { description: cafe.description, openingHours: cafe.openingHours, pickupSettings: cafe.pickupSettings, expectedSuspensionVersion: cafe.suspensionVersion, ...overrides };
}

/** A separate signed-in API session, so owner and Customer cookies never mix. */
export async function session(playwright: PlaywrightWorkerArgs["playwright"], who: { email: string; password: string }) {
  const context = await playwright.request.newContext({ baseURL: origin });
  await login(context, who as never);
  return context;
}
export async function slots(r: APIRequestContext, cafe: string) {
  const response = await r.get(`/api/customer/cafes/${cafe}/pickup-slots`);
  expect(response.status()).toBe(200);
  return ((await response.json()).pickupSlots as string[]).map(Date.parse);
}
/** Customer catalogue sources: HTTP detail/list plus the session-RLS source used for Brew Finder eligibility. */
export async function customerVisible(r: APIRequestContext, customer: string, cafe: string) {
  const detail = (await r.get(`/api/customer/cafes/${cafe}`)).status();
  const listed = ((await (await r.get("/api/customer/cafes")).json()).items as { cafeId: string }[] | undefined ?? []).some(c => c.cafeId === cafe);
  const rls = asActor(customer, `select count(*) from public.cafes where id=${q(cafe)};`);
  const source = asActor(customer, "select public.customer_catalogue_source()::text;").includes(cafe);
  return { detail, listed, rls, source };
}
export const hidden = { detail: 404, listed: false, rls: "0", source: false };
export const visible = { detail: 200, listed: true, rls: "1", source: true };
