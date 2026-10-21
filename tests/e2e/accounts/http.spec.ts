import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { homes, localSql } from "./local";

const origin = "http://127.0.0.1:3100";
test.beforeEach(() => {
  expect(existsSync("src/app/api/auth/sign-in/route.ts"), "Missing implementation: public account route handlers").toBe(true);
});
for (const role of ["customer", "owner"] as const) {
  test(`SYS-01.3 SYS-01.4 SYS-01.8 SYS-02.10: real ${role} signup sets cookies and cannot replace the active account`, async ({ request, browser }) => {
    const email = `t50-signup-${randomUUID()}@example.com`;
    const body = { email, password: "synthetic-t50-password", role };
    try {
      const response = await request.post("/api/auth/sign-up", { headers: { origin }, data: body });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ requestId: expect.any(String), redirectTo: homes[role] });
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      const cookies = (await request.storageState()).cookies.filter((c) => /^sb-.*auth-token/.test(c.name));
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.every((c) => c.expires > Date.now() / 1000)).toBe(true);
      const record = localSql(`select p.role || ':' || w.is_main from public.profiles p join auth.users u on u.id=p.id join public.workspaces w on w.id=p.workspace_id where u.email='${email}';`);
      expect(record).toBe(`${role}:true`);
      for (const route of ["sign-up", "sign-in"]) {
        const before = (await request.storageState()).cookies;
        const conflict = await request.post(`/api/auth/${route}`, { headers: { origin }, data: route === "sign-up" ? body : { email, password: body.password } });
        expect(conflict.status()).toBe(409);
        expect(await conflict.json()).toEqual({ requestId: expect.any(String), error: { code: "STATE_CONFLICT", message: "An account is already signed in." } });
        expect((await request.storageState()).cookies).toEqual(before);
      }
      const separate = await browser.newContext();
      try {
        const duplicate = await separate.request.post(`${origin}/api/auth/sign-up`, { headers: { origin }, data: { ...body, role: role === "owner" ? "customer" : "owner" } });
        expect(duplicate.status()).toBe(409);
        expect(await duplicate.json()).toEqual({ requestId: expect.any(String), error: { code: "STATE_CONFLICT", message: "Unable to create account. Try signing in." } });
        expect(localSql(`select p.role || ':' || w.is_main from public.profiles p join auth.users u on u.id=p.id join public.workspaces w on w.id=p.workspace_id where u.email='${email}';`)).toBe(record);
      } finally { await separate.close(); }
    } finally {
      localSql(`begin; delete from public.profiles where id in (select id from auth.users where email='${email}'); delete from auth.users where email='${email}'; commit;`);
    }
  });
}
for (const route of ["sign-up", "sign-in", "sign-out"]) {
  test(`SYS-01.9 SYS-02.11: actual ${route} route rejects invalid transport without session cookies`, async ({ request }) => {
    const path = `/api/auth/${route}`;
    const cases: { method: string; headers: Record<string, string>; data?: string; status: number; code: string }[] = [
      { method: "GET", headers: { origin }, status: 405, code: "METHOD_NOT_ALLOWED" },
      { method: "POST", headers: { "content-type": "application/json" }, data: "{}", status: 403, code: "FORBIDDEN" },
      { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json", "x-forwarded-host": "evil.example" }, data: "{}", status: 403, code: "FORBIDDEN" },
      { method: "POST", headers: { origin, "content-type": "text/plain" }, data: "{}", status: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
      { method: "POST", headers: { origin, "content-type": "application/json" }, data: "{", status: 400, code: "INVALID_REQUEST" },
      { method: "POST", headers: { origin, "content-type": "application/json" }, data: JSON.stringify({ content: "a".repeat(65537) }), status: 413, code: "PAYLOAD_TOO_LARGE" },
      { method: "POST", headers: { origin, "content-type": "application/json" }, data: JSON.stringify({ returnTo: "https://evil.example" }), status: 400, code: "INVALID_REQUEST" },
    ];
    for (const item of cases) {
      const response = await request.fetch(path, item);
      expect(response.status()).toBe(item.status);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      expect(response.headers()["content-type"]).toMatch(/^application\/json/);
      if (item.status === 405) expect(response.headers().allow).toBe("POST");
      expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: item.code, message: expect.any(String) } });
      expect(response.headers()["set-cookie"]).toBeUndefined();
    }
  });
}
