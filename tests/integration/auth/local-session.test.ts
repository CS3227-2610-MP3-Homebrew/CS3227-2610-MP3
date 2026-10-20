// @vitest-environment node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { literal, sql } from "../schema/local-database";
import { proxyModule, sessionModule } from "../../unit/auth/contracts";

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  get: (name: string) => jar.has(name) ? { name, value: jar.get(name) } : undefined,
  set: (name: string, value: string) => { jar.set(name, value); },
}) }));

type LocalSession = { access_token: string; refresh_token: string; user: { id: string } };

function removeLocalUser(id: string) {
  return sql(`begin;
    delete from public.profiles where id=${literal(id)};
    delete from auth.users where id=${literal(id)};
    commit;`);
}

/** Captures local CLI output without printing generated credentials. No dotenv is read. */
function localConfiguration() {
  const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"], { encoding: "utf8", timeout: 30_000 });
  expect(result.status, "Local Supabase status unavailable; run bun run db:start").toBe(0);
  const configuration = JSON.parse(result.stdout) as Record<string, string>;
  const endpoint = new URL(configuration.API_URL);
  expect(["127.0.0.1", "localhost"]).toContain(endpoint.hostname);
  expect(endpoint.protocol).toBe("http:");
  const publishableKey = configuration.PUBLISHABLE_KEY;
  expect(typeof publishableKey, "Local publishable key is required").toBe("string");
  return { url: endpoint.origin, publishableKey };
}

test("SYS-05.2: genuine local Supabase session refresh reaches downstream session verification and preserves protected-profile authority", async () => {
  // Assert missing feature modules before provisioning any local fixture.
  const { proxy } = await proxyModule();
  const { getVerifiedActor } = await sessionModule();
  const { url, publishableKey } = localConfiguration();
  vi.stubEnv("APP_ENV", "local");
  vi.stubEnv("AI_PROVIDER", "disabled");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
  jar.clear();
  let userId: string | undefined;
  try {
    const email = `auth-t09-${randomUUID()}@example.com`;
    const password = `Local-test-${randomUUID()}`;
    const signup = await fetch(`${url}/auth/v1/signup`, {
      method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: { role: "customer" } }),
      signal: AbortSignal.timeout(15_000),
    });
    expect(signup.ok, "Local Auth signup must succeed; response body and credentials omitted").toBe(true);
    const session = await signup.json() as LocalSession;
    userId = session.user.id;
    expect(typeof session.access_token, "Local email confirmation must be disabled").toBe("string");
    // A refreshable but expired cookie must be renewed by the actual SSR client.
    const expired = { ...session, expires_at: Math.floor(Date.now() / 1000) - 60, expires_in: -60 };
    const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    const encoded = `base64-${Buffer.from(JSON.stringify(expired)).toString("base64url")}`;
    jar.set(storageKey, encoded);
    const request = new NextRequest("http://127.0.0.1:3100/fixture-private", {
      headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") },
    });
    const response = await proxy(request);
    const renewed = response.cookies.getAll().filter((cookie) => cookie.name.startsWith(storageKey));
    expect(renewed.length, "Real local Auth refresh must emit session cookies").toBeGreaterThan(0);
    for (const cookie of request.cookies.getAll()) jar.set(cookie.name, cookie.value);
    const verified = await getVerifiedActor();
    expect(verified?.id === userId, "Downstream session verification must retain the signed-in local user").toBe(true);
    expect(verified?.role).toBe("customer");
    expect(verified?.workspaceId).toMatch(/^[\da-f-]{36}$/);
    // Revoke locally, retaining the browser cookie: Auth verification must deny.
    const removed = removeLocalUser(userId);
    expect(removed.status, "Local test user cleanup must succeed").toBe(0);
    userId = undefined;
    expect(await getVerifiedActor(), "A locally revoked user cannot retain protected access").toBeNull();
  } finally {
    if (userId) {
      const removed = removeLocalUser(userId);
      expect(removed.status, "Local test user cleanup must succeed").toBe(0);
    }
    jar.clear();
    vi.unstubAllEnvs();
  }
}, 30_000);
