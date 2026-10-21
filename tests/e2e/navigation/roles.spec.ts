import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { homes, localAuthConfiguration, localSql, provisionAccount, type Role } from "../accounts/local";

test.setTimeout(30_000);
test.beforeEach(() => {
  expect(existsSync("src/app/sign-in/page.tsx"), "Missing implementation: shared sign-in page").toBe(true);
});
const origin = "http://127.0.0.1:3100";
const links: Record<Role, string[]> = {
  customer: ["Browse cafés", "My orders"],
  owner: ["Café application", "Dashboard", "Order queue", "Menu", "Café profile"],
  admin: ["Moderation queue", "Café applications", "Cafés", "Audit log"],
};
for (const kit of [false, true]) for (const role of ["customer", "owner", "admin"] as const) test.describe(`${kit ? "kit" : "main"} ${role}`, () => {
  test(`SYS-02.3 SYS-02.7 SYS-03.1 SYS-03.2 SYS-03.3 SYS-03.4 SYS-03.5 SYS-03.6 SYS-03.7: uses persistent own-role homes/navigation`, async ({ page, context, browser }) => {
    const fixture = provisionAccount(role, kit);
    try {
      await page.goto("/sign-in?returnTo=https://evil.example&next=/admin/applications");
      await page.getByLabel(/^email$/i).fill(fixture.email);
      await page.getByLabel(/^password$/i).fill(fixture.password);
      const responseWait = page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in"));
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const response = await responseWait;
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ requestId: expect.any(String), redirectTo: homes[role] });
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      await expect(page).toHaveURL(`${origin}${homes[role]}`);
      const nav = page.getByRole("navigation");
      for (const label of links[role]) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      for (const other of (["customer", "owner", "admin"] as const).filter((r) => r !== role)) {
        for (const label of links[other]) await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
      }
      await expect(nav.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
      await expect(nav.getByText(/favourites|favorites|switch role|switch workspace|subscription/i)).toHaveCount(0);
      if (role === "customer") {
        await expect(nav.getByRole("link", { name: "Browse cafés", exact: true })).toHaveAttribute("href", "/customer/cafes");
        await expect(nav.getByRole("link", { name: "My orders", exact: true })).toHaveAttribute("href", "/customer/orders");
        await expect(nav.getByRole("link", { name: /pre-order|review form/i })).toHaveCount(0);
      }
      if (role === "admin") for (const [label, path] of [["Moderation queue", "/admin/moderation"], ["Café applications", "/admin/applications"], ["Cafés", "/admin/cafes"], ["Audit log", "/admin/audit"]]) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", path);
      }
      if (role === "owner") {
        await expect(page.getByRole("link", { name: "Café application", exact: true }).first()).toHaveAttribute("href", "/owner/application");
        await expect(page.getByText(/no café|no cafe|do not have a café|don't have a café|haven.t.*café/i)).toBeVisible();
        await expect(page.getByText(/\$\d|\d+ orders|sample café|demo sales/i)).toHaveCount(0);
      }
      for (const path of ["/", "/sign-in", "/sign-up", ...Object.entries(homes).filter(([candidate]) => candidate !== role).map(([, path]) => path)]) {
        await page.goto(path); await expect(page).toHaveURL(`${origin}${homes[role]}`);
      }
      expect(localSql(`select role || ':' || workspace_id from public.profiles where id='${fixture.id}';`)).toBe(`${role}:${fixture.workspaceId}`);
      const cookies = (await context.cookies()).filter((cookie) => /^sb-.*auth-token/.test(cookie.name));
      expect(cookies.length).toBeGreaterThan(0);
      for (const cookie of cookies.filter((c) => c.value)) expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
      const restored = await browser.newContext({ storageState: await context.storageState() });
      try { const reopened = await restored.newPage(); await reopened.goto(`${origin}/`); await expect(reopened).toHaveURL(`${origin}${homes[role]}`); }
      finally { await restored.close(); }
      const out = page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-out"));
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      expect((await out).status()).toBe(200);
      await expect(page).toHaveURL(`${origin}/sign-in`);
      await page.goto(homes[role]); await expect(page).toHaveURL(`${origin}/sign-in`);
    } finally { fixture.cleanup(); }
  });
});
test("SYS-03.2 SYS-02.6: anonymous root/role navigation reaches ordinary sign-in without role shell", async ({ page }) => {
  for (const path of ["/", ...Object.values(homes)]) {
    await page.goto(path); await expect(page).toHaveURL(`${origin}/sign-in`);
    await expect(page.getByRole("navigation")).toHaveCount(0);
  }
});
test("SYS-02.5 SYS-03.8: established identity missing profile has account-unavailable and usable Sign out without redirect loop", async ({ page }) => {
  const fixture = provisionAccount("customer");
  try {
    const signedIn = await page.request.post("/api/auth/sign-in", { headers: { origin }, data: { email: fixture.email, password: fixture.password } });
    expect(signedIn.status()).toBe(200);
    localSql(`delete from public.profiles where id='${fixture.id}';`);
    for (const path of ["/", "/sign-in", "/sign-up", "/customer/cafes"]) {
      await page.goto(path);
      await expect(page.getByText("Account access is unavailable. Sign out and try again.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(page.getByRole("radio")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/sign-in`);
  } finally { fixture.cleanup(); }
});
test("SYS-02.6: revoked local Auth identity with retained cookies reaches session-ended notice", async ({ page }) => {
  const fixture = provisionAccount("customer");
  try {
    const signedIn = await page.request.post("/api/auth/sign-in", { headers: { origin }, data: { email: fixture.email, password: fixture.password } });
    expect(signedIn.status()).toBe(200);
    localSql(`delete from public.profiles where id='${fixture.id}'; delete from auth.users where id='${fixture.id}';`);
    await page.goto("/customer/cafes");
    await expect(page).toHaveURL(`${origin}/sign-in?notice=session-ended`);
    await expect(page.getByText("Your session ended. Sign in again.", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  } finally { fixture.cleanup(); }
});
test("SYS-02.8: signing out one browser preserves a separately signed-in browser", async ({ browser, request }) => {
  const fixture = provisionAccount("customer");
  const first = await browser.newContext(); const second = await browser.newContext();
  try {
    for (const context of [first, second]) {
      const result = await context.request.post(`${origin}/api/auth/sign-in`, { headers: { origin }, data: { email: fixture.email, password: fixture.password } });
      expect(result.status()).toBe(200);
    }
    const result = await first.request.post(`${origin}/api/auth/sign-out`, { headers: { origin }, data: {} });
    expect(await result.json()).toEqual({ requestId: expect.any(String), redirectTo: "/sign-in" });
    const page = await second.newPage(); await page.goto(`${origin}/`); await expect(page).toHaveURL(`${origin}/customer/cafes`);
    const absent = await request.post("/api/auth/sign-out", { headers: { origin }, data: {} });
    expect(await absent.json()).toEqual({ requestId: expect.any(String), redirectTo: "/sign-in" });
  } finally { await first.close(); await second.close(); fixture.cleanup(); }
});
test("SYS-02.7: actual local Supabase expired cookie refresh retains own-role access", async ({ context, page }) => {
  const fixture = provisionAccount("customer");
  try {
    const configuration = localAuthConfiguration();
    const login = await fetch(`${configuration.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: configuration.publicKey, "content-type": "application/json" }, body: JSON.stringify({ email: fixture.email, password: fixture.password }) });
    expect(login.ok, "Local Auth fixture login failed; secrets omitted").toBe(true);
    const session = await login.json();
    const storageKey = `sb-${new URL(configuration.url).hostname.split(".")[0]}-auth-token`;
    const encoded = `base64-${Buffer.from(JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) - 60, expires_in: -60 })).toString("base64url")}`;
    await context.addCookies([{ name: storageKey, value: encoded, url: origin, expires: Math.floor(Date.now() / 1000) + 3600 }]);
    await page.goto("/"); await expect(page).toHaveURL(`${origin}/customer/cafes`);
    const renewed = (await context.cookies()).find((cookie) => cookie.name === storageKey);
    expect(renewed?.value).not.toBe(encoded);
    expect(renewed?.value.length).toBeGreaterThan(0);
  } finally { fixture.cleanup(); }
});
