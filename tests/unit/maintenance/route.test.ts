// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ configuration: vi.fn(() => { throw new Error("Configuration must stay lazy"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/config", () => ({ getConfiguration: mocks.configuration }));
import { GET } from "@/app/api/internal/maintenance/route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
test("route rejects bearer before configuration or database initialization", async () => {
  vi.stubEnv("CRON_SECRET", "synthetic-route-bearer");
  const response = await GET(new Request("http://localhost/api/internal/maintenance", { headers: { authorization: "Bearer synthetic-wrong-bearer" } }));
  expect(response.status).toBe(401);
  expect(mocks.configuration).not.toHaveBeenCalled();
});
test("route keeps failures independent when privileged configuration is unavailable", async () => {
  vi.stubEnv("CRON_SECRET", "synthetic-route-bearer");
  const response = await GET(new Request("http://localhost/api/internal/maintenance", { headers: { authorization: "Bearer synthetic-route-bearer" } }));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.steps.map((step: { outcome: string }) => step.outcome)).toEqual(["failure", "failure", "failure"]);
  expect(JSON.stringify(body)).not.toContain("Configuration must stay lazy");
  expect(mocks.configuration).toHaveBeenCalledTimes(3);
});
