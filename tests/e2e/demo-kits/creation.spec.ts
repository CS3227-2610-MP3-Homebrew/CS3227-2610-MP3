import { expect, test } from "@playwright/test";
import { scenario } from "../../integration/moderation/fixtures";
import { homes } from "../accounts/local";
const origin = "http://127.0.0.1:3100";

// Browser-only mocks exercise display lifetime; real creation/sign-in is separate below.
test("SYS-12.4 SYS-12.5 SEC-10.2: anonymous sign-in offers creation and shows credentials only until navigation/reload", async ({ page }) => {
  const accounts = ["customer", "owner", "admin"].map(role => ({ role, email: `${role}-synthetic-code@example.com`, password: `synthetic-${role}-password` }));
  let calls = 0;
  await page.route("**/api/demo-kits", async route => { calls++; await route.fulfill({ contentType: "application/json", headers: { "cache-control": "private, no-store" }, body: JSON.stringify({ requestId: "synthetic-request", kit: { accounts } }) }); });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create demo kit", exact: true }).click();
  for (const account of accounts) {
    await expect(page.getByText(account.email, { exact: true })).toBeVisible();
    await expect(page.getByText(account.password, { exact: true })).toBeVisible();
  }
  expect(calls).toBe(1);
  const storage = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), cookie: document.cookie }));
  for (const account of accounts) expect(JSON.stringify(storage)).not.toContain(account.password);
  await page.reload();
  for (const account of accounts) { await expect(page.getByText(account.email, { exact: true })).toHaveCount(0); await expect(page.getByText(account.password, { exact: true })).toHaveCount(0); }
  expect(calls).toBe(1);
});
test("SYS-12.4 SYS-12.5 SYS-12.12 SEC-10.2 SEC-10.3: real credentials sign in normally and kit Admin cannot access foreign domain or AI sources", async ({ page, request }) => {
  const response = await request.post("/api/demo-kits", { headers: { origin }, data: {} });
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), kit: { accounts: expect.any(Array) } });
  expect(body.kit.accounts).toHaveLength(3);
  expect(body.kit.accounts.map((a: { role: string }) => a.role).sort()).toEqual(["admin", "customer", "owner"]);
  for (const account of body.kit.accounts as { role: keyof typeof homes; email: string; password: string }[]) {
    await page.context().clearCookies(); await page.goto("/sign-in");
    await page.getByLabel(/^email$/i).fill(account.email); await page.getByLabel(/^password$/i).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(homes[account.role]);
    expect(await page.locator("body").innerText()).not.toContain(account.password);
    if (account.role === "admin") {
      for (const main of [true, false]) {
        const foreign = scenario(!main); const review = foreign.review();
        for (const [path, data] of [
          [`/api/admin/reviews/${review}/moderation`, { action: "hide", reason: "Spam" }],
          [`/api/admin/cafes/${foreign.cafe}/suspension`, { suspended: true, reason: "Safety" }],
          ["/api/ai/moderation", { reviewIds: [review] }],
        ] as const) {
          const denied = await page.request.post(path, { headers: { origin }, data });
          expect(denied.status()).toBe(404);
          expect(await denied.json()).toEqual({ requestId: expect.any(String), error: { code: "NOT_FOUND", message: expect.any(String) } });
        }
      }
    }
  }
});
test("SYS-12.7 SEC-10.1: cap refusal displays when to retry without credentials", async ({ page }) => {
  await page.route("**/api/demo-kits", route => route.fulfill({ status: 429, contentType: "application/json", headers: { "retry-after": "120" }, body: JSON.stringify({ requestId: "synthetic-request", error: { code: "RATE_LIMITED", message: "Demo kit limit reached. Try again in 2 minutes." } }) }));
  await page.goto("/sign-in"); await page.getByRole("button", { name: "Create demo kit", exact: true }).click();
  await expect(page.getByText("Demo kit limit reached. Try again in 2 minutes.", { exact: true })).toBeVisible();
  await expect(page.getByText(/customer-.*@example.com/)).toHaveCount(0);
});
