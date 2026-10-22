import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { origin, scenario, stored, route } from "../../integration/moderation/fixtures";
import { targetAudits } from "../../integration/audit/fixtures";
import { failure, login, moderate } from "../moderation/helpers";

for (const kit of [false, true]) test.describe(kit ? "kit" : "main", () => {
  test("ADM-04.2 ADM-04.6 ADM-04.11 ADM-04.18: authorized disabled triage leaves reviews/Admin audit unchanged and internal AI events out of Admin audit", async ({ request }) => {
    const f = scenario(kit); const id = f.review(); const before = stored(id); const audits = targetAudits(id); await login(request, f.admin);
    const response = await request.post("/api/ai/moderation", { headers: { origin }, data: { reviewIds: [id] } });
    expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(await response.json()).toEqual({ requestId: expect.any(String), feature: "moderation", mode: "fallback", reason: "disabled", fallback: "manual_queue" });
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toEqual(audits);
    const auditPage = await request.get("/admin/audit"); const html = await auditPage.text(); expect(html).not.toContain("moderation_assistant"); expect(html).not.toContain("provider_attempt");
  });
});
for (const role of ["anonymous", "customer", "owner"] as const) test.describe(role, () => {
  test("ADM-04.4: actual route independently rejects absent or wrong-role sessions for triage and confirmation", async ({ request }) => {
    const f = scenario(); const id = f.review(); const before = stored(id); if (role !== "anonymous") await login(request, f[role]);
    for (const response of [await request.post("/api/ai/moderation", { headers: { origin }, data: { reviewIds: [id] } }), await moderate(request, id, "keep")]) await failure(response, role === "anonymous" ? 401 : 403, role === "anonymous" ? "UNAUTHENTICATED" : "FORBIDDEN");
    expect(stored(id)).toEqual(before); expect(targetAudits(id)).toHaveLength(0);
  });
});
test("ADM-04.5 ADM-04.6: kit cannot triage main, other-kit or missing records, including mixed selections", async ({ request }) => {
  const own = scenario(); const main = scenario(false); const other = scenario(); const ownId = own.review(); const mainId = main.review(); const otherId = other.review(); await login(request, own.admin);
  const bodies = [];
  for (const id of [mainId, otherId, randomUUID()]) for (const reviewIds of [[id], [ownId, id]]) {
    const response = await request.post("/api/ai/moderation", { headers: { origin }, data: { reviewIds } }); await failure(response, 404, "NOT_FOUND");
    const body = await response.json(); delete body.requestId; bodies.push(body);
  }
  for (const body of bodies) expect(body).toEqual(bodies[0]);
  for (const id of [ownId, mainId, otherId]) { expect(stored(id).moderation_state).toBe("pending"); expect(targetAudits(id)).toHaveLength(0); }
});
for (const reason of ["", " \n\t", "😀".repeat(301)]) test.describe(`reason length: ${reason.length}`, () => {
  test("ADM-04.7: ordinary confirmation rejects invalid reason after advice without effects", async ({ request }) => {
    const f = scenario(); const id = f.review(); const before = stored(id); await login(request, f.admin);
    await failure(await moderate(request, id, "keep", reason), 400, "INVALID_REQUEST"); expect(stored(id)).toEqual(before); expect(targetAudits(id)).toHaveLength(0);
  });
});
test("ADM-04.9: forged label cannot enter ordinary confirmation; a plain body still repeats workspace/state/reason checks", async ({ request }) => {
  const f = scenario(); const id = f.review(); const before = stored(id); await login(request, f.admin);
  await failure(await request.post(route(id), { headers: { origin }, data: { action: "keep", reason: "Looks fine", label: "ok" } }), 400, "INVALID_REQUEST");
  expect(stored(id)).toEqual(before); expect(targetAudits(id)).toHaveLength(0);
  expect((await moderate(request, id, "hide", " My own reason ")).status()).toBe(200);
  await failure(await moderate(request, id, "keep"), 409, "STATE_CONFLICT");
  expect(targetAudits(id).map(r => r.reason)).toEqual([" My own reason "]);
  const foreign = scenario().review(); await failure(await moderate(request, foreign, "hide"), 404, "NOT_FOUND");
});
test("ADM-04.14: actual route rejects stale, empty, duplicate and configured oversized selections before disabled fallback", async ({ request }) => {
  const f = scenario(); const pending = f.review(); const kept = f.review("kept"); await login(request, f.admin);
  const oversized = Array.from({ length: 8 }, () => f.review());
  for (const reviewIds of [[], [pending, pending], [pending, kept], oversized]) await failure(await request.post("/api/ai/moderation", { headers: { origin }, data: { reviewIds } }), 400, "INVALID_REQUEST");
  expect(stored(pending).moderation_state).toBe("pending"); expect(stored(kept).moderation_state).toBe("kept"); expect(targetAudits(pending)).toHaveLength(0);
});
test("ADM-04.17: actual route exports shared private method/origin/media/body boundaries", async ({ request }) => {
  const f = scenario(); const id = f.review(); const before = stored(id); await login(request, f.admin);
  for (const method of ["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    const response = await request.fetch("/api/ai/moderation", { method, headers: { origin } });
    expect(response.headers().allow).toBe("POST");
    if (method === "HEAD") { expect(response.status()).toBe(405); expect(response.headers()["cache-control"]).toBe("private, no-store"); }
    else await failure(response, 405, "METHOD_NOT_ALLOWED");
  }
  for (const value of [undefined, "null", "broken", "https://evil.invalid", `${origin}/path`]) {
    await failure(await request.post("/api/ai/moderation", { headers: value === undefined ? {} : { origin: value }, data: { reviewIds: [id] } }), 403, "FORBIDDEN");
  }
  await failure(await request.post("/api/ai/moderation", { headers: { origin, "content-type": "text/plain" }, data: JSON.stringify({ reviewIds: [id] }) }), 415, "UNSUPPORTED_MEDIA_TYPE");
  for (const data of ["{", JSON.stringify({ reviewIds: [id], label: "ok" })]) await failure(await request.post("/api/ai/moderation", { headers: { origin, "content-type": "application/json" }, data }), 400, "INVALID_REQUEST");
  await failure(await request.post("/api/ai/moderation", { headers: { origin, "content-type": "application/json" }, data: " ".repeat(65537) }), 413, "PAYLOAD_TOO_LARGE");
  expect(stored(id)).toEqual(before); expect(targetAudits(id)).toHaveLength(0);
});
