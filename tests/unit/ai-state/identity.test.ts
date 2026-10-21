// @vitest-environment node
import { createHash } from "node:crypto";
import { expect, test, vi } from "vitest";
import { identityModule } from "./contracts";
import { brewSource } from "../../integration/ai-state/fixtures";
vi.mock("server-only", () => ({}));
const sha = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

test("SYS-10.1: canonical JSON sorts recursively by code point and hashes exact UTF-8", async () => {
  const api = await identityModule();
  const value = { "😀": 3, "\ue000": 2, z: [{ b: 2, a: " é\n" }], a: -0 };
  const serialized = '{"a":0,"z":[{"a":" é\\n","b":2}],"":2,"😀":3}';
  expect(api.canonicalJson(value)).toBe(serialized);
  expect(api.digest(value)).toBe(sha(serialized));
});
test("SYS-10.1: exact query whitespace case Unicode and ranking order never merge", async () => {
  const api = await identityModule();
  const queries = ["coffee", " coffee", "coffee ", "Coffee", "café", "cafe\u0301", "a  b", "a b"];
  expect(new Set(queries.map(query => api.digest({ query, filters: {} }))).size).toBe(queries.length);
  expect(api.digest(["a", "b"])).not.toBe(api.digest(["b", "a"]));
});
test("SYS-10.1: canonical identities reject nonfinite JSON numbers", async () => {
  const api = await identityModule();
  for (const value of [NaN, Infinity, -Infinity]) expect(() => api.canonicalJson({ value })).toThrow();
});
test("SYS-10.1, SEC-07.1: cache key hashes precisely the specified identity preimage", async () => {
  const api = await identityModule();
  const key = { environment: "ci", feature: "brew_finder", scope: { actorId: "a" }, inputFingerprint: "1".repeat(64), sourceRevision: "2".repeat(64), modelIdentity: "3".repeat(64), contractIdentity: "4".repeat(64) };
  expect(api.cacheKey(key)).toBe(sha('{"contractIdentity":"' + "4".repeat(64) + '","environment":"ci","feature":"brew_finder","inputFingerprint":"' + "1".repeat(64) + '","modelIdentity":"' + "3".repeat(64) + '","scope":{"actorId":"a"},"sourceRevision":"' + "2".repeat(64) + '"}'));
});
test("SYS-10.1, SEC-07.1: source sets sort by reference but selection order and every catalogue field invalidate", async () => {
  const api = await identityModule(); const source = brewSource("cafe-a", "item-a");
  const second = structuredClone(source.catalogue[0]); second.cafeId = "cafe-b"; second.items = second.items.map(item => ({ ...item, itemId: `${item.itemId}-b` }));
  source.catalogue.push(second);
  const original = api.brewSourceRevision(source);
  expect(original).toBe(api.digest(source));
  const reorderedItems = structuredClone(source); reorderedItems.catalogue[0].items.reverse(); reorderedItems.candidates[0].items.reverse();
  expect(api.brewSourceRevision(reorderedItems)).toBe(original);
  expect(api.brewSourceRevision({ ...source, catalogue: [...source.catalogue].reverse() })).toBe(original);
  const mutations = [
    (s: typeof source) => { s.catalogue[0].name = "changed"; },
    (s: typeof source) => { s.catalogue[0].area = "North"; },
    (s: typeof source) => { s.catalogue[0].eligible = false; },
    (s: typeof source) => { s.catalogue[0].weeklyIntervals[0].opensAt = "10:00"; },
    (s: typeof source) => { s.catalogue[0].openNow = false; },
    (s: typeof source) => { s.catalogue[0].nextStateChangeAt = "2040-01-01T11:00:00Z"; },
    (s: typeof source) => { s.catalogue[0].items[0].soldOut = true; },
    (s: typeof source) => { s.catalogue[0].items[0].name = "changed"; },
    (s: typeof source) => { s.catalogue[0].items[0].drinkType = "matcha"; },
    (s: typeof source) => { s.catalogue[0].ratingSum++; },
    (s: typeof source) => { s.catalogue[0].ratingCount++; },
    (s: typeof source) => { s.candidates[0].name = "changed"; },
    (s: typeof source) => { s.candidateOrder.push("cafe-b"); },
    (s: typeof source) => { s.itemOrders[0].itemIds.reverse(); },
  ];
  for (const change of mutations) { const changed = structuredClone(source); change(changed); expect(api.brewSourceRevision(changed)).not.toBe(original); }
  expect(() => api.brewSourceRevision({ ...source, catalogue: [source.catalogue[0], source.catalogue[0]] })).toThrow();
  expect(() => api.brewSourceRevision({ ...source, candidates: [source.candidates[0], source.candidates[0]] })).toThrow();
  const missing = { ...source } as Record<string, unknown>; delete missing.catalogue;
  expect(() => api.brewSourceRevision(missing)).toThrow();
});
