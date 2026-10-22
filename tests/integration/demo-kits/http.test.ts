// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { demoModule, origin, request, type Admission, type Kit } from "./contracts";
vi.mock("server-only", () => ({}));
let admission: Admission;
let createKit: ReturnType<typeof vi.fn<() => Promise<Kit>>>;
beforeEach(() => {
  admission = { reserve: vi.fn(async () => ({ admitted: true })) };
  createKit = vi.fn(async () => ({ accounts: ["customer", "owner", "admin"].map(role => ({ role, email: `${role}-synthetic@example.com`, password: `synthetic-${role}-password` })) } as Kit));
});
afterEach(() => vi.restoreAllMocks());
async function invoke(init?: RequestInit) {
  const handler = (await demoModule()).createDemoKitHandler({ trustedOrigin: origin, admission, createKit });
  const response = await handler(request(init));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toMatch(/^application\/json/);
  return { response, body: await response.json() };
}
function noWork() { expect(admission.reserve).not.toHaveBeenCalled(); expect(createKit).not.toHaveBeenCalled(); }
function failure(result: Awaited<ReturnType<typeof invoke>>, status: number, code: string) {
  expect(result.response.status).toBe(status);
  expect(result.body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(result.body.requestId.length).toBeGreaterThan(0);
  expect(JSON.stringify(result.body)).not.toMatch(/synthetic|password|provider-private|SQL|stack|token/i);
}
test("SYS-12.4 SEC-10.2: anonymous creation returns only three credentials in private no-store JSON", async () => {
  const result = await invoke();
  expect(result.response.status).toBe(200);
  expect(result.body).toEqual({ requestId: expect.any(String), kit: await createKit.mock.results[0].value });
  expect(admission.reserve).toHaveBeenCalledTimes(1); expect(createKit).toHaveBeenCalledTimes(1);
});
for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) describe(method, () => {
  test("SYS-12.4 SEC-10.2: unsupported methods disclose no credentials and advertise POST", async () => {
    const result = await invoke({ method, body: undefined }); failure(result, 405, "METHOD_NOT_ALLOWED");
    expect(result.response.headers.get("allow")).toBe("POST"); noWork();
  });
});
for (const value of [undefined, "null", "not-an-origin", "https://evil.example", `${origin}/path`, `${origin}.evil.example`]) describe(String(value), () => {
  test("SYS-12.4: exact trusted Origin is required before anonymous admission", async () => {
    const headers: Record<string, string> = { "content-type": "application/json", host: "evil.example", "x-forwarded-host": "evil.example" };
    if (value !== undefined) headers.origin = value;
    failure(await invoke({ headers }), 403, "FORBIDDEN"); noWork();
  });
});
for (const body of ["{", "null", "[]", '{"workspaceId":"forged"}', '{"role":"admin"}', '{"password":"synthetic-secret"}']) describe(body, () => {
  test("SYS-12.4: invalid or caller-controlled creation fields perform no work", async () => {
    failure(await invoke({ body }), 400, "INVALID_REQUEST"); noWork();
  });
});
test("SYS-12.4: wrong media and oversized body are rejected before admission", async () => {
  failure(await invoke({ headers: { origin, "content-type": "text/plain" } }), 415, "UNSUPPORTED_MEDIA_TYPE");
  failure(await invoke({ body: `{}${" ".repeat(65535)}` }), 413, "PAYLOAD_TOO_LARGE"); noWork();
});
test("SYS-12.7 SEC-10.1: exhausted cap has safe retry message and Retry-After without provisioning", async () => {
  vi.mocked(admission.reserve).mockResolvedValue({ admitted: false, retryAfter: 123 });
  const result = await invoke(); failure(result, 429, "RATE_LIMITED");
  expect(result.response.headers.get("retry-after")).toBe("123");
  expect(result.body.error.message).toMatch(/try again/i);
  expect(result.body.error.message).toMatch(/123|second|minute|\d{1,2}:\d{2}/i);
  expect(createKit).not.toHaveBeenCalled();
});
test("SYS-12.7 SEC-10.1: unavailable admission fails closed", async () => {
  vi.mocked(admission.reserve).mockResolvedValue({ admitted: false, unavailable: true });
  failure(await invoke(), 503, "SOURCE_UNAVAILABLE"); expect(createKit).not.toHaveBeenCalled();
});
test("SYS-12.5 SYS-12.6 SEC-10.2: provisioning failure never discloses credentials or exception contents", async () => {
  const logs = [vi.spyOn(console, "error").mockImplementation(() => {}), vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "log").mockImplementation(() => {})];
  createKit.mockRejectedValue(new Error("provider-private synthetic-password customer-synthetic@example.com"));
  const result = await invoke(); expect([500, 503]).toContain(result.response.status);
  expect(result.body).toEqual({ requestId: expect.any(String), error: { code: expect.stringMatching(/INTERNAL_ERROR|SOURCE_UNAVAILABLE/), message: expect.any(String) } });
  expect(JSON.stringify([result.body, ...logs.map(log => log.mock.calls)])).not.toMatch(/provider-private|synthetic-password|customer-synthetic@example.com/);
});
