import { expect, test } from "@playwright/test";

test.setTimeout(20_000);
test("SYS-01.1: sign-up contains only labelled credentials and unselected Customer/owner choices", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  await expect(page.getByLabel(/^password$/i)).toHaveAttribute("type", "password");
  await expect(page.getByRole("radio", { name: "Customer", exact: true })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: "Café owner", exact: true })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/sign-in");
  await expect(page.getByLabel(/name|confirm|workspace|admin/i)).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(2);
});
test("SYS-02.1: sign-in minimal fields and sign-up entry", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  await expect(page.getByLabel(/^password$/i)).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up", exact: true })).toHaveAttribute("href", "/sign-up");
  await expect(page.getByLabel(/role|workspace|remember/i)).toHaveCount(0);
});
test("SYS-02.1: owning demo-control integration is present on shared sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  // Presence only: demo creation and credential display belong to T-24/T-25.
  await expect(page.getByRole("button", { name: "Create demo kit", exact: true })).toBeVisible();
});
for (const kind of ["sign-up", "sign-in"] as const) {
  test(`SYS-01.2 SYS-02.2: ${kind} invalid local fields show feedback before a network submission`, async ({ page }) => {
    let requests = 0;
    await page.route(`**/api/auth/${kind}`, async (route) => { requests++; await route.abort(); });
    await page.goto(`/${kind}`);
    await page.getByLabel(/^email$/i).fill("not-an-email");
    await page.getByLabel(/^password$/i).fill(kind === "sign-up" ? "short" : "");
    await page.getByRole("button", { name: kind === "sign-up" ? "Sign up" : "Sign in", exact: true }).click();
    expect(requests).toBe(0);
    expect(await page.locator("input:invalid, [aria-invalid='true'], [role='alert']").count()).toBeGreaterThan(0);
  });
  test(`SYS-01.7 SYS-02.4: ${kind} disables pending repeats and retains email/role but clears failed password`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    await page.route(`**/api/auth/${kind}`, async (route) => {
      calls++; await pending;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ requestId: "synthetic-reference", error: { code: "SOURCE_UNAVAILABLE", message: "Account service is temporarily unavailable. Try again." } }) });
    });
    await page.goto(`/${kind}`);
    await page.getByLabel(/^email$/i).fill("fixture@example.com");
    await page.getByLabel(/^password$/i).fill("synthetic-password");
    if (kind === "sign-up") await page.getByRole("radio", { name: "Café owner", exact: true }).check();
    const form = page.locator("form").filter({ has: page.getByLabel(/^password$/i) });
    await form.locator("button[type=submit]").click();
    await expect(form.locator("button[type=submit]")).toBeDisabled();
    expect(calls).toBe(1); release();
    await expect(page.getByText("Account service is temporarily unavailable. Try again.", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toHaveValue("fixture@example.com");
    await expect(page.getByLabel(/^password$/i)).toHaveValue("");
    if (kind === "sign-up") await expect(page.getByRole("radio", { name: "Café owner", exact: true })).toBeChecked();
    expect(calls).toBe(1);
  });
  test(`SYS-01.7 SYS-02.4: ${kind} network failure gives safe feedback and no automatic retry`, async ({ page }) => {
    let calls = 0;
    await page.route(`**/api/auth/${kind}`, async (route) => { calls++; await route.abort("failed"); });
    await page.goto(`/${kind}`);
    await page.getByLabel(/^email$/i).fill("fixture@example.com");
    await page.getByLabel(/^password$/i).fill("synthetic-password");
    if (kind === "sign-up") await page.getByRole("radio", { name: "Customer", exact: true }).check();
    await page.getByRole("button", { name: kind === "sign-up" ? "Sign up" : "Sign in", exact: true }).click();
    await expect(page.getByText("Unable to complete the request. Try again.", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toHaveValue("");
    expect(calls).toBe(1);
    await expect(page).toHaveURL(new RegExp(`/${kind}$`));
  });
}
const notices = {
  "account-created": "Account created. Sign in to continue.",
  "session-ended": "Your session ended. Sign in again.",
  "sign-out-unconfirmed": "Signed out of this browser; session revocation could not be confirmed.",
};
for (const [notice, text] of Object.entries(notices)) {
  test(`SYS-01.6 SYS-02.6 SYS-02.9 SYS-03.7: fixed ${notice} notice is plain text with ordinary form`, async ({ page }) => {
    await page.goto(`/sign-in?notice=${notice}`);
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });
}
test("SYS-03.7: unknown notice/external return destination cannot execute or redirect", async ({ page }) => {
  const payload = "<img src=x onerror=alert(1)>";
  let dialog = false; page.on("dialog", async (event) => { dialog = true; await event.dismiss(); });
  await page.goto(`/sign-in?notice=${encodeURIComponent(payload)}&returnTo=https://evil.example&redirectTo=/admin/moderation`);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText(payload, { exact: true })).toHaveCount(0);
  expect(await page.locator("img[onerror]").count()).toBe(0);
  expect(dialog).toBe(false);
  for (const text of Object.values(notices)) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
});
