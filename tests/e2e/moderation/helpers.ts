import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { origin, route, type Scenario } from "../../integration/moderation/fixtures";
export async function login(request: APIRequestContext, account: Scenario["admin"] | Scenario["customer"]) {
  const response = await request.post("/api/auth/sign-in", { headers: { origin }, data: { email: account.email, password: account.password } });
  expect(response.status(), "Synthetic local account sign-in").toBe(200);
}
export async function failure(response: APIResponse, status: number, code: string) {
  expect(response.status()).toBe(status);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["content-type"]).toMatch(/^application\/json/);
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(body.requestId.length).toBeGreaterThan(0);
  expect(body.error.message).not.toMatch(/SQL|stack|supabase|Synthetic|Human <|t60-|provider|secret/i);
}
export async function moderate(request: APIRequestContext, id: string, action: string, reason: unknown = "Looks fine") {
  return request.post(route(id), { headers: { origin }, data: { action, reason } });
}
