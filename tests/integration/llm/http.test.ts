// @vitest-environment node
import { expect, test, vi } from "vitest";
import { features, operations, type Feature } from "./contracts";

vi.mock("server-only", () => ({}));
const filters = { timeMode: "all", at: null, drinkType: null, area: null };
const valid = { brew_finder: { query: "  iced coffee  ", filters }, prep_advisor: { cafeId: "c1", refresh: false }, moderation: { reviewIds: ["r1", "r2"] } };
const paths = { brew_finder: "brew-finder", prep_advisor: "prep-advisor", moderation: "moderation" };
function request(feature: Feature, body: unknown, init: RequestInit = {}) {
  return new Request(`https://homebrew.invalid/api/ai/${paths[feature]}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), ...init });
}
async function rejects(req: Request, feature: Feature, status = 400, code = "INVALID_REQUEST", maxReviews = 20) {
  const api = await operations(); const result = await api.readAiRequest(req, feature, { maxReviews, requestId: "request-synthetic" });
  expect(result.ok).toBe(false); if (result.ok) throw new Error("Unexpected validation success");
  expect(result.response.status).toBe(status);
  expect(result.response.headers.get("content-type")).toContain("application/json"); expect(result.response.headers.get("cache-control")).toBe("private, no-store");
  const error = await result.response.json();
  expect(error).toEqual({ requestId: "request-synthetic", error: { code, message: expect.any(String) } });
  expect(error.error.message.length).toBeGreaterThan(0); expect(JSON.stringify(error)).not.toMatch(/CANARY|ZodError|stack|synthetic-test-key/);
  return result.response;
}
for (const feature of features) {
  test(`SYS-04.2: ${feature} HTTP JSON request accepts exact declared fields and preserves decoded content`, async () => {
    const api = await operations(); expect(await api.readAiRequest(request(feature, valid[feature]), feature, { maxReviews: 20, requestId: "request-synthetic" })).toEqual({ ok: true, data: valid[feature] });
  });
  test(`SYS-04.2: ${feature} rejects malformed/non-object JSON, unknown keys and missing required fields`, async () => {
    for (const invalid of [null, [], "CANARY", {}, { ...valid[feature], actorId: "CANARY" }, { ...valid[feature], prompt: "CANARY" }, { ...valid[feature], model: "CANARY" }]) await rejects(request(feature, invalid), feature);
    await rejects(request(feature, null, { body: "{CANARY invalid" }), feature);
  });
  test(`SYS-04.2: ${feature} HTTP method and media type use exact error mappings`, async () => {
    const res = await rejects(request(feature, null, { method: "PUT" }), feature, 405, "METHOD_NOT_ALLOWED"); expect(res.headers.get("allow")).toBe("POST");
    await rejects(request(feature, valid[feature], { headers: { "content-type": "text/plain" } }), feature, 415, "UNSUPPORTED_MEDIA_TYPE");
  });
  test(`SYS-04.2: ${feature} request UTF-8 size ceiling is inclusive and checked without Content-Length`, async () => {
    const api = await operations(); const json = JSON.stringify(valid[feature]);
    const exact = json + " ".repeat(65_536 - Buffer.byteLength(json));
    expect((await api.readAiRequest(request(feature, null, { body: exact }), feature, { maxReviews: 20, requestId: "request-synthetic" })).ok).toBe(true);
    await rejects(request(feature, null, { body: exact + " " }), feature, 413, "PAYLOAD_TOO_LARGE");
  });
  test(`SYS-04.2, SEC-08.2: ${feature} unbounded chunked request reader stops at overflow`, async () => {
    const cancel = vi.fn(); let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(8192).fill(32)); }, cancel });
    const init: RequestInit & { duplex: "half" } = { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" };
    await rejects(new Request(`https://homebrew.invalid/api/ai/${paths[feature]}`, init), feature, 413, "PAYLOAD_TOO_LARGE");
    expect(pulls).toBeLessThanOrEqual(10); expect(cancel).toHaveBeenCalled();
  });
}
for (const query of ["", " \n\t", "😀".repeat(1001), 5, null]) test(`SYS-04.2: Brew rejects invalid query ${String(query).slice(0, 12)}`, async () => {
  await rejects(request("brew_finder", { query, filters }), "brew_finder");
});
test("SYS-04.2: Brew accepts 1000 Unicode code points without trimming or normalization", async () => {
  const api = await operations(); const data = { query: "😀".repeat(1000), filters };
  expect(await api.readAiRequest(request("brew_finder", data), "brew_finder", { maxReviews: 20, requestId: "request-synthetic" })).toEqual({ ok: true, data });
});
for (const invalid of [
  { ...filters, extra: "CANARY" }, { timeMode: "all", at: null, area: null }, { ...filters, timeMode: "ALL" },
  { ...filters, timeMode: "at", at: null }, { ...filters, at: "2026-10-20T01:00:00Z" },
  { ...filters, timeMode: "at", at: "2026-10-20T01:00:01Z" },
  { ...filters, timeMode: "at", at: "2026-10-20T01:00:00.000Z" },
  { ...filters, timeMode: "at", at: "2026-10-20T09:00:00+08:00" },
  { ...filters, timeMode: "at", at: "2026-02-30T01:00:00Z" },
  { ...filters, area: "east" }, { ...filters, drinkType: "Coffee" },
]) test(`SYS-04.2: Brew strict filter schema rejects ${JSON.stringify(invalid)}`, async () => {
  await rejects(request("brew_finder", { query: "coffee", filters: invalid }), "brew_finder");
});
test("SYS-04.2: Brew accepts exact time/drink/area filter vocabulary", async () => {
  const api = await operations();
  for (const timeMode of ["all", "now", "at"]) for (const area of [null, "Central", "North", "South", "East", "West"]) for (const drinkType of [null, "coffee", "matcha", "tea", "chocolate", "juice", "other"]) {
    const data = { query: "coffee", filters: { timeMode, at: timeMode === "at" ? "2026-10-20T01:00:00Z" : null, area, drinkType } };
    expect((await api.readAiRequest(request("brew_finder", data), "brew_finder", { maxReviews: 20, requestId: "request-synthetic" }))).toEqual({ ok: true, data });
  }
});
for (const invalid of [{ cafeId: "", refresh: false }, { cafeId: "😀".repeat(129), refresh: false }, { cafeId: "c1", refresh: "false" }, { cafeId: "c1" }, { cafeId: 1, refresh: false }]) test(`SYS-04.2: Prep rejects request ${JSON.stringify(invalid).slice(0, 65)}`, async () => {
  await rejects(request("prep_advisor", invalid), "prep_advisor");
});
for (const reviewIds of [[], ["r1", "r1"], [""], ["x".repeat(129)], [1], "r1", Array.from({ length: 21 }, (_, i) => `r${i}`)]) test(`SYS-04.2: Moderation rejects invalid review selection ${JSON.stringify(reviewIds).slice(0, 45)}`, async () => {
  await rejects(request("moderation", { reviewIds }), "moderation");
});
test("SYS-04.2: Moderation honors configured batch cap before operation admission and accepts exactly 20 at ceiling", async () => {
  await rejects(request("moderation", { reviewIds: ["r1", "r2"] }), "moderation", 400, "INVALID_REQUEST", 1);
  const api = await operations(); const data = { reviewIds: Array.from({ length: 20 }, (_, i) => `r${i}`) };
  expect(await api.readAiRequest(request("moderation", data), "moderation", { maxReviews: 20, requestId: "request-synthetic" })).toEqual({ ok: true, data });
});
