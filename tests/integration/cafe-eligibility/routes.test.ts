// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({ actor: null as null | { id: string; workspaceId: string; role: "customer" | "owner" | "admin" } }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => auth.actor }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: () => { throw new Error("Unauthorized request reached domain source"); } }));
afterEach(() => { auth.actor = null; });

type Handler = (request: Request, context: { params: Promise<{ cafeId: string }> }) => Promise<Response>;
async function post(operation: "decision" | "suspension", init: { origin?: string; data?: unknown } = {}) {
  const path = resolve(`src/app/api/admin/cafes/[cafeId]/${operation}/route.ts`);
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const api = await import(/* @vite-ignore */ path) as { POST: Handler };
  const request = new Request(`https://homebrew.invalid/api/admin/cafes/cafe-ref/${operation}`, { method: "POST", headers: {
    origin: init.origin ?? "https://homebrew.invalid", "content-type": "application/json",
  }, body: JSON.stringify(init.data ?? (operation === "decision" ? { decision: "approve", reason: "Synthetic valid reason" } : { suspended: true, reason: "Synthetic valid reason" })) });
  return api.POST(request, { params: Promise.resolve({ cafeId: "cafe-ref" }) });
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
}
for (const op of ["decision", "suspension"] as const) {
  test(`ADM-01.5 ADM-02.6: actual ${op} handler refuses an absent session before reading domain data`, async () => {
    await error(await post(op), 401, "UNAUTHENTICATED");
  });
  for (const role of ["customer", "owner"] as const) test(`ADM-01.5 ADM-02.6: actual ${op} handler refuses ${role} before reading domain data`, async () => {
    auth.actor = { id: "actor-ref", workspaceId: "workspace-ref", role };
    await error(await post(op), 403, "FORBIDDEN");
  });
  test(`ADM-01.12 ADM-02.12: actual ${op} handler rejects a mismatched Origin`, async () => {
    auth.actor = { id: "admin-ref", workspaceId: "workspace-ref", role: "admin" };
    await error(await post(op, { origin: "https://evil.invalid" }), 403, "FORBIDDEN");
  });
}
