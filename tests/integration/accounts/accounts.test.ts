// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { accountsModule, actor, fields, homes, origin, request, type AccountDependencies, type AccountHandlers, type Role } from "./contracts";

vi.mock("server-only", () => ({}));
let effects: AccountDependencies;
beforeEach(() => {
  effects = {
    trustedOrigin: origin, mainWorkspaceId: actor.workspaceId,
    currentIdentity: vi.fn(async () => null),
    createIdentity: vi.fn(async () => ({ data: { id: actor.id } })),
    createProfile: vi.fn(async (input) => ({ data: input })),
    deleteIdentity: vi.fn(async () => ({ data: null })),
    signIn: vi.fn(async () => ({ data: { id: actor.id } })),
    readProfile: vi.fn(async () => ({ data: actor })),
    persistSession: vi.fn(async () => {}), clearSession: vi.fn(async () => {}),
    revokeSession: vi.fn(async () => ({ data: null })),
  };
});
afterEach(() => vi.restoreAllMocks());
async function invoke(operation: keyof AccountHandlers, body: unknown, init?: RequestInit) {
  const subject = await accountsModule();
  const response = await subject.createAccountHandlers(effects)[operation](request(operation, body, init));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toMatch(/^application\/json/);
  return { response, json: await response.json() };
}
function error(result: Awaited<ReturnType<typeof invoke>>, status: number, code: string, message?: string) {
  expect(result.response.status).toBe(status);
  expect(result.json).toEqual({ requestId: expect.any(String), error: { code, message: message ?? expect.any(String) } });
  expect(result.json.requestId.length).toBeGreaterThan(0);
  expect(JSON.stringify(result.json)).not.toMatch(/fixture@example|example password|provider-private|access_token|refresh_token|ZodError/);
}
function success(result: Awaited<ReturnType<typeof invoke>>, redirectTo: string) {
  expect(result.response.status).toBe(200);
  expect(result.json).toEqual({ requestId: expect.any(String), redirectTo });
}
function noMutation() {
  for (const name of ["createIdentity", "createProfile", "deleteIdentity", "signIn", "persistSession", "clearSession", "revokeSession"] as const) expect(effects[name]).not.toHaveBeenCalled();
}

test.each(["customer", "owner"] as const)("SYS-01.3: %s registration normalizes email, preserves password and provisions only the main workspace", async (role) => {
  vi.mocked(effects.readProfile).mockResolvedValue({ data: { ...actor, role } });
  const result = await invoke("signUp", { ...fields, email: "  FIXTURE@EXAMPLE.COM  ", role });
  success(result, homes[role]);
  expect(effects.createIdentity).toHaveBeenCalledExactlyOnceWith(fields);
  expect(effects.createProfile).toHaveBeenCalledExactlyOnceWith({ ...actor, role });
  expect(effects.persistSession).toHaveBeenCalledTimes(1);
  expect(effects.deleteIdentity).not.toHaveBeenCalled();
});

const invalidSignup = [
  { ...fields }, { ...fields, role: "admin" }, { ...fields, role: "OWNER" }, { ...fields, role: null },
  { ...fields, role: "customer", email: "invalid" }, { ...fields, role: "customer", email: 123 },
  { ...fields, role: "customer", email: `${"a".repeat(250)}@example.com` },
  { ...fields, role: "customer", password: "1234567" },
  { ...fields, role: "customer", password: "😀".repeat(7) },
  { ...fields, role: "customer", password: "😀".repeat(19) },
  { ...fields, role: "customer", password: "a".repeat(73) },
  ...["workspaceId", "workspace_id", "id", "metadata", "returnTo", "redirectTo"].map((key) => ({ ...fields, role: "customer", [key]: "forged" })),
  null, [], "text",
];
test.each(invalidSignup)("SYS-01.2: strict sign-up fields reject invalid input %# before mutation", async (body) => {
  error(await invoke("signUp", body), 400, "INVALID_REQUEST", "Check the account fields and try again.");
  noMutation();
});
test.each(["        ", "😀".repeat(8), "😀".repeat(18), "a".repeat(72), "e\u0301".repeat(8)])("SYS-01.2: valid code-point/UTF-8 boundary password %# is preserved exactly", async (password) => {
  success(await invoke("signUp", { ...fields, password, role: "customer" }), homes.customer);
  expect(effects.createIdentity).toHaveBeenCalledWith({ ...fields, password });
});
test("SYS-01.4: duplicate identity cannot be linked, reassigned or deleted", async () => {
  vi.mocked(effects.createIdentity).mockResolvedValue({ error: { kind: "duplicate" } });
  error(await invoke("signUp", { ...fields, role: "owner" }), 409, "STATE_CONFLICT", "Unable to create account. Try signing in.");
  for (const name of ["createProfile", "deleteIdentity", "persistSession", "clearSession"] as const) expect(effects[name]).not.toHaveBeenCalled();
});
test("SYS-01.4: concurrent duplicate registration has one winner and never cleans up the winner", async () => {
  const subject = await accountsModule();
  let claimed = false;
  vi.mocked(effects.createIdentity).mockImplementation(async () => {
    if (claimed) return { error: { kind: "duplicate" } };
    claimed = true;
    return { data: { id: actor.id } };
  });
  const handler = subject.createAccountHandlers(effects);
  const responses = await Promise.all([handler.signUp(request("signUp", { ...fields, role: "customer" })), handler.signUp(request("signUp", { ...fields, role: "owner" }))]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(effects.createProfile).toHaveBeenCalledTimes(1);
  expect(effects.deleteIdentity).not.toHaveBeenCalled();
});
test.each([true, false])("SYS-01.5: profile failure performs bounded new-identity cleanup; cleanup success=%s", async (cleanupWorks) => {
  vi.mocked(effects.createProfile).mockResolvedValue({ error: { kind: "unavailable" } });
  if (!cleanupWorks) vi.mocked(effects.deleteIdentity).mockResolvedValue({ error: { kind: "unexpected" } });
  const result = await invoke("signUp", { ...fields, role: "customer" });
  error(result, cleanupWorks ? 503 : 500, cleanupWorks ? "SOURCE_UNAVAILABLE" : "INTERNAL_ERROR", cleanupWorks
    ? "Unable to complete account setup. Try again."
    : "Account setup could not be completed. Try signing in; account access is unavailable until setup is resolved.");
  expect(effects.deleteIdentity).toHaveBeenCalledExactlyOnceWith(actor.id);
  expect(effects.createIdentity).toHaveBeenCalledTimes(1);
  expect(effects.createProfile).toHaveBeenCalledTimes(1);
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
  expect(effects.persistSession).not.toHaveBeenCalled();
});
test("SYS-01.6: complete profile survives initial-session failure and routes to fixed account-created notice", async () => {
  vi.mocked(effects.signIn).mockResolvedValue({ error: { kind: "unavailable" } });
  success(await invoke("signUp", { ...fields, role: "customer" }), "/sign-in?notice=account-created");
  expect(effects.deleteIdentity).not.toHaveBeenCalled();
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
  expect(effects.persistSession).not.toHaveBeenCalled();
});
test.each(["signUp", "signIn"] as const)("SYS-01.8 SYS-02.10: %s active identity conflict preserves its session even without a valid profile", async (operation) => {
  vi.mocked(effects.currentIdentity).mockResolvedValue(actor.id);
  vi.mocked(effects.readProfile).mockResolvedValue({ data: null });
  error(await invoke(operation, operation === "signUp" ? { ...fields, role: "customer" } : fields), 409, "STATE_CONFLICT", "An account is already signed in.");
  noMutation();
});

test.each(["", "😀".repeat(19), "a".repeat(73), 123, null])("SYS-02.2: sign-in rejects invalid password %#", async (password) => {
  error(await invoke("signIn", { ...fields, password }), 400, "INVALID_REQUEST"); noMutation();
});
test.each(["role", "workspaceId", "metadata", "returnTo", "redirectTo"])("SYS-02.2 SYS-03.7: sign-in rejects unknown %s field", async (key) => {
  error(await invoke("signIn", { ...fields, [key]: "forged" }), 400, "INVALID_REQUEST"); noMutation();
});
test.each(["a", " ", "😀".repeat(18)])("SYS-02.2: existing short/whitespace password %# stays unchanged", async (password) => {
  success(await invoke("signIn", { ...fields, email: " FIXTURE@EXAMPLE.COM ", password }), homes.customer);
  expect(effects.signIn).toHaveBeenCalledExactlyOnceWith({ ...fields, password });
});
for (const workspace of [actor.workspaceId, "00000000-0000-4000-8000-000000000002"]) {
  test.each(["customer", "owner", "admin"] as Role[])(`SYS-02.3 SYS-03.1: ${workspace} %s credentials resolve protected role/home and persist session`, async (role) => {
    vi.mocked(effects.readProfile).mockResolvedValue({ data: { ...actor, workspaceId: workspace, role } });
    success(await invoke("signIn", fields), homes[role]);
    expect(effects.readProfile).toHaveBeenCalledWith(actor.id);
    expect(effects.persistSession).toHaveBeenCalledTimes(1);
    expect(effects.createProfile).not.toHaveBeenCalled();
  });
}
test.each(["unknown-email", "wrong-password"])("SYS-02.4: %s yields the same safe credential failure", async () => {
  vi.mocked(effects.signIn).mockResolvedValue({ error: { kind: "credentials" } });
  error(await invoke("signIn", fields), 401, "UNAUTHENTICATED", "Email or password is incorrect.");
  expect(effects.persistSession).not.toHaveBeenCalled();
});
test.each([null, { ...actor, role: "superuser" }, { ...actor, workspaceId: "bad" }, { ...actor, id: "another-user" }])("SYS-02.5: absent/invalid protected profile %# clears provisional session without repair", async (profile) => {
  vi.mocked(effects.readProfile).mockResolvedValue({ data: profile });
  error(await invoke("signIn", fields), 403, "FORBIDDEN", "Account access is unavailable. Sign out and try again.");
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
  expect(effects.persistSession).not.toHaveBeenCalled();
  expect(effects.createProfile).not.toHaveBeenCalled();
});
test("SYS-02.5: profile-source outage is distinct from missing profile and clears provisional cookies", async () => {
  vi.mocked(effects.readProfile).mockResolvedValue({ error: { kind: "unavailable" } });
  error(await invoke("signIn", fields), 503, "SOURCE_UNAVAILABLE", "Account service is temporarily unavailable. Try again.");
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
  expect(effects.persistSession).not.toHaveBeenCalled();
});
for (const operation of ["signUp", "signIn"] as const) {
  test.each([undefined, "12", "invalid", "-1"])(`SYS-01.7 SYS-02.4: ${operation} Auth throttle handles retry delay %# without retry/detail`, async (retryAfter) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const effect = operation === "signUp" ? effects.createIdentity : effects.signIn;
    vi.mocked(effect).mockResolvedValue({ error: { kind: "throttled", retryAfter } });
    const result = await invoke(operation, operation === "signUp" ? { ...fields, role: "customer" } : fields);
    error(result, 429, "RATE_LIMITED", "Too many attempts. Try again later.");
    expect(result.response.headers.get("retry-after")).toBe(retryAfter === "12" ? "12" : null);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/fixture@example|example password|provider-private/);
  });
  test(`SYS-01.7 SYS-02.4: ${operation} provider source/exception failures stay content-free`, async () => {
    const effect = operation === "signUp" ? effects.createIdentity : effects.signIn;
    vi.mocked(effect).mockResolvedValue({ error: { kind: "unavailable" } });
    error(await invoke(operation, operation === "signUp" ? { ...fields, role: "customer" } : fields), 503, "SOURCE_UNAVAILABLE", "Account service is temporarily unavailable. Try again.");
    vi.mocked(effect).mockRejectedValue(new Error(`provider-private ${fields.email} ${fields.password}`));
    error(await invoke(operation, operation === "signUp" ? { ...fields, role: "customer" } : fields), 500, "INTERNAL_ERROR", "Unable to complete the request. Try again.");
  });
}
test("SYS-02.8: sign-out revokes local scope only and clears browser session", async () => {
  vi.mocked(effects.currentIdentity).mockResolvedValue(actor.id);
  success(await invoke("signOut", {}), "/sign-in");
  expect(effects.revokeSession).toHaveBeenCalledExactlyOnceWith("local");
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
});
test("SYS-02.9: failed remote revocation still clears browser session with honest fixed notice", async () => {
  vi.mocked(effects.currentIdentity).mockResolvedValue(actor.id);
  vi.mocked(effects.revokeSession).mockResolvedValue({ error: { kind: "unavailable" } });
  success(await invoke("signOut", {}), "/sign-in?notice=sign-out-unconfirmed");
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
});
test("SYS-02.10: absent-session sign-out succeeds idempotently and clears residual cookies", async () => {
  success(await invoke("signOut", {}), "/sign-in");
  expect(effects.clearSession).toHaveBeenCalledTimes(1);
});

for (const operation of ["signUp", "signIn", "signOut"] as const) {
  const validBody = operation === "signUp" ? { ...fields, role: "customer" } : operation === "signIn" ? fields : {};
  for (const method of ["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    test(`SYS-01.9 SYS-02.11: ${operation} ${method} is private JSON 405 with Allow POST`, async () => {
      const result = await invoke(operation, validBody, { method, body: undefined });
      error(result, 405, "METHOD_NOT_ALLOWED"); expect(result.response.headers.get("allow")).toBe("POST"); noMutation();
    });
  }
  test.each([undefined, "null", "not-an-origin", "https://evil.example", `${origin}.evil.example`, `${origin}/path`])(`SYS-01.9 SYS-02.11: ${operation} rejects Origin %# despite forged host headers`, async (value) => {
    const headers: Record<string, string> = { "content-type": "application/json", host: "evil.example", "x-forwarded-host": "evil.example" };
    if (value !== undefined) headers.origin = value;
    error(await invoke(operation, validBody, { headers }), 403, "FORBIDDEN"); noMutation();
  });
  test.each(["text/plain", "application/x-www-form-urlencoded"])(`SYS-01.9 SYS-02.11: ${operation} rejects media %s`, async (media) => {
    error(await invoke(operation, validBody, { headers: { origin, "content-type": media } }), 415, "UNSUPPORTED_MEDIA_TYPE"); noMutation();
  });
  test(`SYS-01.9 SYS-02.11: ${operation} rejects malformed JSON and UTF-8 overflow without effects`, async () => {
    error(await invoke(operation, validBody, { body: "{" }), 400, "INVALID_REQUEST");
    error(await invoke(operation, validBody, { body: JSON.stringify({ content: "😀".repeat(16384) }) }), 413, "PAYLOAD_TOO_LARGE");
    noMutation();
  });
  test(`SYS-01.9 SYS-02.11: ${operation} body exactly 65536 bytes reaches validation, one more is oversized`, async () => {
    const base = JSON.stringify(validBody);
    error(await invoke(operation, validBody, { body: `${base}${" ".repeat(65537 - Buffer.byteLength(base))}` }), 413, "PAYLOAD_TOO_LARGE");
    noMutation();
    const result = await invoke(operation, validBody, { body: `${base}${" ".repeat(65536 - Buffer.byteLength(base))}` });
    expect(result.response.status).not.toBe(413);
    expect(result.response.status).toBe(200);
  });
}
test.each([null, [], { role: "admin" }, { returnTo: "https://evil.example" }])("SYS-02.11: sign-out requires exactly an empty object %#", async (body) => {
  error(await invoke("signOut", body), 400, "INVALID_REQUEST"); noMutation();
});
