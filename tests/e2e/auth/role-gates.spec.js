import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:3101" });
const origin = "http://127.0.0.1:3101";
const roles = ["customer", "owner", "admin"];

for (const role of roles) {
  test(`SYS-05.1: ${role} streams private data only after request-time authorization`, async ({ page, context }) => {
    expect(existsSync("src/app/_components/role-gate.tsx"), "Missing implementation: RoleGate").toBe(true);
    await context.addCookies([{ name: "t09-session", value: role, url: origin }, { name: "t09-delay", value: "1000", url: origin }]);
    await page.goto(`/${role}`, { waitUntil: "commit" });
    await expect(page.getByRole("status")).toHaveText("Checking session");
    await expect(page.getByRole("region", { name: "Protected content" })).toHaveCount(0);
    await expect(page.getByText(`private-${role}-identity`)).toBeVisible();
  });

  test(`SYS-05.1: unauthenticated ${role} access redirects to the fixture-supplied destination`, async ({ page }) => {
    expect(existsSync("src/app/_components/role-gate.tsx"), "Missing implementation: RoleGate").toBe(true);
    await page.goto(`/${role}`);
    await expect(page).toHaveURL(`${origin}/signed-out`);
    await expect(page.getByRole("heading", { name: "Fixture signed-out destination" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Protected content" })).toHaveCount(0);
  });

  test(`SYS-05.1: wrong-role sessions receive no ${role} protected content`, async ({ page, context }) => {
    expect(existsSync("src/app/_components/role-gate.tsx"), "Missing implementation: RoleGate").toBe(true);
    for (const other of roles.filter((candidate) => candidate !== role)) {
      await context.addCookies([{ name: "t09-session", value: other, url: origin }]);
      await page.goto(`/${role}`);
      await expect(page.getByRole("region", { name: "Protected content" })).toHaveCount(0);
      expect(await page.content()).not.toContain(`private-${role}-identity`);
      // A server error must not satisfy the denial assertion.
      await expect(page.getByText(/Application error/)).toHaveCount(0);
    }
  });
}

test("SYS-05.1: all role prerendered shells contain fallback and no per-user data", () => {
  expect(existsSync("src/app/_components/role-gate.tsx"), "Missing implementation: RoleGate").toBe(true);
  const directory = ".next/auth-harness/server/app";
  const files = [];
  const visit = (path) => {
    for (const file of readdirSync(path, { withFileTypes: true })) {
      const target = join(path, file.name);
      if (file.isDirectory()) visit(target);
      else if (/\.html$/.test(file.name)) files.push(target);
    }
  };
  visit(directory);
  for (const role of roles) {
    const path = files.find((file) => file.endsWith(`/${role}.html`));
    expect(path, `A static ${role} shell must exist`).toBeDefined();
    const html = readFileSync(path, "utf8");
    expect(html).toContain("Checking session");
    expect(html).not.toContain("private-customer-identity");
    expect(html).not.toContain("private-owner-identity");
    expect(html).not.toContain("private-admin-identity");
  }
});

for (const invalid of ["expired", "invalid"]) {
  test(`SYS-05.2: a prefetched shell cannot authorize an ${invalid} session`, async ({ page, context }) => {
    expect(existsSync("src/app/_components/role-gate.tsx"), "Missing implementation: RoleGate").toBe(true);
    await context.addCookies([{ name: "t09-session", value: "customer", url: origin }]);
    const prefetch = page.waitForResponse((response) => response.url().includes("/customer") && response.request().headers()["next-router-prefetch"] === "1");
    await page.goto("/");
    await prefetch;
    await context.addCookies([{ name: "t09-session", value: invalid, url: origin }]);
    await page.getByRole("link", { name: "Open customer" }).click();
    await expect(page).toHaveURL(`${origin}/signed-out`);
    await expect(page.getByRole("region", { name: "Protected content" })).toHaveCount(0);
    expect(await page.content()).not.toContain("private-customer-identity");
  });
}

for (const method of ["GET", "POST"]) {
  test(`SYS-05.2: direct ${method} handler independently denies missing, wrong-role and foreign records`, async ({ request }) => {
    expect(existsSync("src/server/auth/guard.ts"), "Missing implementation: guarded operations").toBe(true);
    for (const cookie of ["", "t09-session=owner", "t09-session=expired", "t09-session=invalid"]) {
      const response = await request.fetch("/api/protected", { method, headers: { cookie } });
      expect(response.ok()).toBe(false);
      expect(await response.text()).not.toContain("privateIdentity");
    }
    const denied = await request.fetch("/api/protected?record=other", { method, headers: { cookie: "t09-session=customer" } });
    expect(denied.ok()).toBe(false);
    const allowed = await request.fetch("/api/protected", { method, headers: { cookie: "t09-session=customer" } });
    expect(allowed.ok()).toBe(true);
    expect(await allowed.json()).toEqual({ privateIdentity: "private-customer-identity" });
  });
}
