import { expect, type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs } from "@playwright/test";
import { login } from "../moderation/helpers";
import { current } from "../owner-cafe/fixtures";
import { menuItemKeys, origin, pageKeys, routes, type MenuItem } from "../../integration/owner-menu/fixtures";
export * from "../../integration/owner-menu/fixtures";
export { login, failure } from "../moderation/helpers";
export { current } from "../owner-cafe/fixtures";

export const list = (r: APIRequestContext, query = "") => r.get(routes.menu + query);
// Always JSON: Playwright sends a bare string or null as application/octet-stream, which the shared transport refuses with 415.
export const post = (r: APIRequestContext, path: string, data: unknown) => r.post(path, { headers: { origin, "content-type": "application/json" }, data: JSON.stringify(data) });
export const create = (r: APIRequestContext, data: unknown) => post(r, routes.menu, data);
export const save = (r: APIRequestContext, id: string, data: unknown) => post(r, routes.item(id), data);
export const remove = (r: APIRequestContext, id: string, data: unknown) => post(r, routes.remove(id), data);

/** Current suspension version from the owner's last café read, as the boundary requires. */
export async function version(r: APIRequestContext) { return (await current(r))!.suspensionVersion; }

function privateJson(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["content-type"]).toMatch(/^application\/json/);
}
export function expectMenuItem(item: MenuItem) {
  expect(Object.keys(item).sort()).toEqual(menuItemKeys);
  expect(item.itemId).toEqual(expect.any(String)); expect(item.itemId.length).toBeGreaterThan(0);
  expect(Number.isSafeInteger(item.priceCents)).toBe(true);
}
/** Asserts the private Page<MenuItem> envelope. */
export async function pageBody(response: APIResponse) {
  privateJson(response, 200);
  const body = await response.json() as { requestId: string; items: MenuItem[]; page: number; pageSize: number; hasNextPage: boolean };
  expect(Object.keys(body).sort()).toEqual(pageKeys);
  expect(body.requestId.length).toBeGreaterThan(0); expect(body.pageSize).toBe(20);
  body.items.forEach(expectMenuItem);
  return body;
}
export async function menu(r: APIRequestContext, query = "") { return (await pageBody(await list(r, query))).items; }
/** Asserts {requestId, item} with the given status. */
export async function itemBody(response: APIResponse, status: number) {
  privateJson(response, status);
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(["item", "requestId"]);
  expect(body.requestId.length).toBeGreaterThan(0); expectMenuItem(body.item);
  return body.item as MenuItem;
}
export async function removedBody(response: APIResponse) {
  privateJson(response, 200);
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), removed: true });
}
/** Error envelope plus the exact specified message. */
export async function conflict(response: APIResponse, message: string) {
  privateJson(response, 409);
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "STATE_CONFLICT", message } });
}

/** A separate signed-in API session, so owner and Customer cookies never mix. */
export async function session(playwright: PlaywrightWorkerArgs["playwright"], who: { email: string; password: string }) {
  const context = await playwright.request.newContext({ baseURL: origin });
  await login(context, who as never);
  return context;
}
