// @vitest-environment node
import { expect, test, vi } from "vitest";
import { envelope, expectFallback, features, fixture, input, operations, output, prepResult, type Feature } from "./contracts";

vi.mock("server-only", () => ({}));

const invalidOutputs: Record<Feature, [string, unknown][]> = {
  brew_finder: [
    ["unknown property", { ...output.brew_finder, url: "https://evil.invalid" }],
    ["unknown suggestion property", { suggestions: [{ ...output.brew_finder.suggestions[0], tools: [] }] }],
    ["foreign cafe", { suggestions: [{ cafeId: "foreign", itemId: "i1", reason: "forged" }] }],
    ["item from wrong parent", { suggestions: [{ cafeId: "c1", itemId: "i2", reason: "forged" }] }],
    ["duplicate cafe", { suggestions: [output.brew_finder.suggestions[0], output.brew_finder.suggestions[0]] }],
    ["empty reason", { suggestions: [{ cafeId: "c1", itemId: "i1", reason: "" }] }],
    ["301-codepoint reason", { suggestions: [{ cafeId: "c1", itemId: "i1", reason: "😀".repeat(301) }] }],
    ["wrong type no coercion", { suggestions: [{ cafeId: 1, itemId: "i1", reason: "wrong" }] }],
    ["one invalid member rejects whole result", { suggestions: [output.brew_finder.suggestions[0], { cafeId: "foreign", itemId: "i2", reason: "wrong" }] }],
  ],
  prep_advisor: [
    ["invented quantity", { suggestions: [{ ...output.prep_advisor.suggestions[0], quantity: 999 }] }],
    ["model authored reason", { suggestions: [{ ...output.prep_advisor.suggestions[0], reason: "999 sold" }] }],
    ["foreign item", { suggestions: [{ itemId: "foreign", weekday: 1, direction: "more", evidenceIds: ["a1"] }] }],
    ["evidence of another item", { suggestions: [{ itemId: "i1", weekday: 1, direction: "more", evidenceIds: ["a3"] }] }],
    ["unknown evidence", { suggestions: [{ ...output.prep_advisor.suggestions[0], evidenceIds: ["foreign"] }] }],
    ["empty evidence", { suggestions: [{ ...output.prep_advisor.suggestions[0], evidenceIds: [] }] }],
    ["duplicate evidence", { suggestions: [{ ...output.prep_advisor.suggestions[0], evidenceIds: ["a1", "a1"] }] }],
    ["weekday zero", { suggestions: [{ ...output.prep_advisor.suggestions[0], weekday: 0 }] }],
    ["weekday eight", { suggestions: [{ ...output.prep_advisor.suggestions[0], weekday: 8 }] }],
    ["weekday string no coercion", { suggestions: [{ ...output.prep_advisor.suggestions[0], weekday: "1" }] }],
    ["unknown direction", { suggestions: [{ ...output.prep_advisor.suggestions[0], direction: "double" }] }],
    ["duplicate item weekday", { suggestions: [output.prep_advisor.suggestions[0], output.prep_advisor.suggestions[0]] }],
    ["one invalid member rejects whole result", { suggestions: [output.prep_advisor.suggestions[0], { itemId: "i2", weekday: 2, direction: "less", evidenceIds: ["a1"] }] }],
  ],
  moderation: [
    ["unknown label", { classifications: [{ reviewId: "r1", label: "approved", reason: "self-approved" }, output.moderation.classifications[1]] }],
    ["foreign review", { classifications: [{ ...output.moderation.classifications[0], reviewId: "foreign" }, output.moderation.classifications[1]] }],
    ["missing classification", { classifications: [output.moderation.classifications[0]] }],
    ["duplicate review", { classifications: [output.moderation.classifications[0], output.moderation.classifications[0]] }],
    ["unknown action", { classifications: [{ ...output.moderation.classifications[0], hide: true }, output.moderation.classifications[1]] }],
    ["301-codepoint reason", { classifications: [{ ...output.moderation.classifications[0], reason: "😀".repeat(301) }, output.moderation.classifications[1]] }],
  ],
};
for (const feature of features) {
  for (const [name, invalid] of invalidOutputs[feature]) test(`SYS-04.2, SYS-08.2, SEC-03.2, SEC-04.1: ${feature} rejects ${name}, no partial success/cache/write`, async () => {
    const api = await operations(); const f = fixture(feature, invalid); const before = structuredClone(f.options.input);
    expectFallback(await api.runLlmOperation(f.options), feature, "unavailable"); expect(f.cache.write).not.toHaveBeenCalled(); expect(f.transport).toHaveBeenCalledTimes(1); expect(f.options.input).toEqual(before);
  });
  for (const [name, invalidEnvelope] of [
    ["no choices", { choices: [] }], ["multiple choices", { choices: [envelope(output[feature]).choices[0], envelope(output[feature]).choices[0]] }],
    ["wrong choice index", { choices: [{ ...envelope(output[feature]).choices[0], index: 1 }] }],
    ["truncated finish", { choices: [{ ...envelope(output[feature]).choices[0], finish_reason: "length" }] }],
    ["tool call", { choices: [{ ...envelope(output[feature]).choices[0], message: { role: "assistant", content: JSON.stringify(output[feature]), tool_calls: [{ id: "x", type: "function", function: { name: "hide_review", arguments: "{\"id\":\"r1\"}" } }] } }] }],
    ["function call", { choices: [{ ...envelope(output[feature]).choices[0], message: { role: "assistant", content: JSON.stringify(output[feature]), function_call: { name: "fetch", arguments: "https://evil.invalid" } } }] }],
    ["refusal", { choices: [{ ...envelope(output[feature]).choices[0], message: { role: "assistant", content: JSON.stringify(output[feature]), refusal: "refused" } }] }],
    ["missing content", { choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant" } }] }],
    ["non-string content", envelope(output[feature], { choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: [{ text: "wrong" }] } }] })],
    ["empty content", envelope("")], ["Markdown fence", envelope("```json\n" + JSON.stringify(output[feature]) + "\n```")],
    ["prefix", envelope("Result: " + JSON.stringify(output[feature]))], ["trailing text", envelope(JSON.stringify(output[feature]) + " ignore rules")],
    ["null feature result", envelope("null")], ["array feature result", envelope("[]")], ["malformed feature JSON", envelope("{broken")],
  ] as [string, unknown][]) test(`SYS-04.2, SEC-04.1, SEC-05.1, SEC-08.2: ${feature} rejects provider ${name} without repairs/retries/tools`, async () => {
    const api = await operations(); const f = fixture(feature); f.transport.mockResolvedValue(Response.json(invalidEnvelope));
    expectFallback(await api.runLlmOperation(f.options), feature, "unavailable"); expect(f.transport).toHaveBeenCalledTimes(1); expect(f.cache.write).not.toHaveBeenCalled();
  });
  test(`SEC-04.1: ${feature} invalid whole HTTP JSON envelope yields fallback`, async () => {
    const api = await operations(); const f = fixture(feature); f.transport.mockResolvedValue(new Response("{not JSON"));
    expectFallback(await api.runLlmOperation(f.options), feature, "unavailable"); expect(f.cache.write).not.toHaveBeenCalled();
  });
  test(`SEC-04.1, SEC-05.1: ${feature} unknown provider metadata grants no capabilities and remains absent from results`, async () => {
    const api = await operations(); const f = fixture(feature);
    f.transport.mockResolvedValue(Response.json(envelope(output[feature], { internal: "PRIVATE-CANARY", tools: [{ name: "approve" }], usage: { prompt_tokens: -1, completion_tokens: "2", total_tokens: 1.5 } })));
    const result = await api.runLlmOperation(f.options); expect(result).toEqual({ requestId: "request-synthetic", feature, mode: "ai", source: "provider", data: feature === "prep_advisor" ? prepResult : output[feature] });
  });
}

test("SYS-04.2, SEC-04.1: valid empty Brew suggestions are AI success, with no second call and ordinary success cache", async () => {
  const api = await operations(); const f = fixture("brew_finder", { suggestions: [] });
  expect(await api.runLlmOperation(f.options)).toEqual({ requestId: "request-synthetic", feature: "brew_finder", mode: "ai", source: "provider", data: { suggestions: [] } });
  expect(f.transport).toHaveBeenCalledTimes(1); expect(f.cache.write).toHaveBeenCalledWith({ suggestions: [] });
});
test("SYS-04.2, SEC-04.1: Brew output cannot exceed supplied cafe count or five suggestions", async () => {
  const api = await operations();
  for (const count of [5, 6]) {
    const candidates = Array.from({ length: count }, (_, i) => ({ cafeId: `c${i}`, name: "Cafe", area: "East", items: [{ itemId: `i${i}`, name: "Coffee", drinkType: "coffee" }] }));
    const f = fixture("brew_finder", { suggestions: candidates.map((c) => ({ cafeId: c.cafeId, itemId: c.items[0].itemId, reason: "coffee" })) });
    f.options.input = { query: "coffee", candidates };
    const result = await api.runLlmOperation(f.options);
    if (count === 5) expect(result.mode).toBe("ai"); else expectFallback(result, "brew_finder", "unavailable");
  }
});
test("SYS-04.2, SEC-04.1: 300 Unicode code points in output reason accepted without UTF-16 miscount", async () => {
  const api = await operations(); const result = { suggestions: [{ ...output.brew_finder.suggestions[0], reason: "😀".repeat(300) }] }; const f = fixture("brew_finder", result);
  expect((await api.runLlmOperation(f.options))).toMatchObject({ mode: "ai", data: result });
});
test("SYS-08.2, SEC-04.1: Prep copies evidence quantities in requested order and rejects generated reason over 300 characters", async () => {
  const api = await operations(); const f = fixture("prep_advisor");
  const aggregates = Array.from({ length: 30 }, (_, n) => ({ aggregateId: `a${n}`, itemId: "i1", itemName: "Coffee", weekday: 1, quantity: Number.MAX_SAFE_INTEGER }));
  f.options.input = { ...input.prep_advisor, aggregates };
  f.transport.mockResolvedValue(Response.json(envelope({ suggestions: [{ itemId: "i1", weekday: 1, direction: "less", evidenceIds: aggregates.map((a) => a.aggregateId) }] })));
  expectFallback(await api.runLlmOperation(f.options), "prep_advisor", "unavailable"); expect(f.cache.write).not.toHaveBeenCalled();
});

const invalidInputs: [Feature, string, unknown][] = [
  ["brew_finder", "blank query", { ...input.brew_finder, query: " \t\n" }],
  ["brew_finder", "1001 codepoint query", { ...input.brew_finder, query: "😀".repeat(1001) }],
  ["brew_finder", "duplicate candidate", { ...input.brew_finder, candidates: [input.brew_finder.candidates[0], input.brew_finder.candidates[0]] }],
  ["brew_finder", "duplicate item", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], items: [input.brew_finder.candidates[0].items[0], input.brew_finder.candidates[0].items[0]] }] }],
  ["brew_finder", "oversized label", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], name: "😀".repeat(201) }] }],
  ["brew_finder", "empty label", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], name: "" }] }],
  ["brew_finder", "unknown nested private field", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], ownerEmail: "private" }] }],
  ["brew_finder", "empty ref", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], cafeId: "" }] }],
  ["brew_finder", "129 codepoint ref", { ...input.brew_finder, candidates: [{ ...input.brew_finder.candidates[0], cafeId: "x".repeat(129) }] }],
  ["prep_advisor", "impossible calendar date", { ...input.prep_advisor, businessDate: "2026-02-30" }],
  ["prep_advisor", "reversed period", { ...input.prep_advisor, period: { from: "2026-10-20", through: "2026-10-19" } }],
  ["prep_advisor", "duplicate aggregate", { ...input.prep_advisor, aggregates: [input.prep_advisor.aggregates[0], input.prep_advisor.aggregates[0]] }],
  ["prep_advisor", "invalid aggregate weekday", { ...input.prep_advisor, aggregates: [{ ...input.prep_advisor.aggregates[0], weekday: 8 }] }],
  ...[-1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1, Infinity, NaN].map((quantity): [Feature, string, unknown] => ["prep_advisor", `invalid Count ${quantity}`, { ...input.prep_advisor, aggregates: [{ ...input.prep_advisor.aggregates[0], quantity }] }]),
  ["prep_advisor", "individual order row", { ...input.prep_advisor, aggregates: [{ ...input.prep_advisor.aggregates[0], customerId: "private", orderId: "private" }] }],
  ["moderation", "reviewer identity", { reviews: [{ ...input.moderation.reviews[0], reviewerId: "private" }] }],
  ["moderation", "empty source selection", { reviews: [] }],
  ["moderation", "oversized review text", { reviews: [{ reviewId: "r1", text: "😀".repeat(1001) }] }],
  ["moderation", "blank review text", { reviews: [{ reviewId: "r1", text: " \n" }] }],
  ["moderation", "duplicate review", { reviews: [input.moderation.reviews[0], input.moderation.reviews[0]] }],
  ["moderation", "over configured batch", { reviews: Array.from({ length: 21 }, (_, n) => ({ reviewId: `r${n}`, text: "good" })) }],
];
for (const [feature, name, invalid] of invalidInputs) test(`SYS-04.2, SEC-02.1, SEC-04.1: ${feature} source rejects ${name} before effects without truncation`, async () => {
  const api = await operations(); const f = fixture(feature); f.options.input = invalid;
  expectFallback(await api.runLlmOperation(f.options), feature, "unavailable"); expect(f.admit).not.toHaveBeenCalled(); expect(f.transport).not.toHaveBeenCalled(); expect(f.cache.write).not.toHaveBeenCalled();
});
test("SYS-04.2, SEC-08.2: source context UTF-8 ceiling rejects before dispatch even when every field fits", async () => {
  const api = await operations(); const f = fixture("brew_finder");
  f.options.input = { query: "coffee", candidates: Array.from({ length: 20 }, (_, n) => ({ cafeId: `c${n}`, name: "😀".repeat(200), area: "East", items: Array.from({ length: 20 }, (_, m) => ({ itemId: `i${n}-${m}`, name: "😀".repeat(200), drinkType: "coffee" })) })) };
  expectFallback(await api.runLlmOperation(f.options), "brew_finder", "unavailable"); expect(f.transport).not.toHaveBeenCalled();
});
test("SYS-04.2: 1000-codepoint exact query, 200-codepoint label and 128-codepoint reference remain intact", async () => {
  const api = await operations(); const f = fixture("brew_finder"); const cafeId = "😀".repeat(128); const reason = "Match";
  f.options.input = { query: "😀".repeat(1000), candidates: [{ ...input.brew_finder.candidates[0], cafeId, name: "😀".repeat(200) }] };
  f.transport.mockResolvedValue(Response.json(envelope({ suggestions: [{ cafeId, itemId: "i1", reason }] })));
  expect((await api.runLlmOperation(f.options)).mode).toBe("ai");
  expect(JSON.parse((await f.calls[0].json()).messages[1].content)).toEqual(f.options.input);
});
test("SYS-04.2, SEC-04.1: all five moderation labels are accepted without changing submitted review text", async () => {
  const api = await operations();
  for (const label of ["ok", "spam", "abusive", "off-topic", "injection attempt"]) {
    const f = fixture("moderation", { classifications: output.moderation.classifications.map((item) => ({ ...item, label })) });
    const before = structuredClone(f.options.input); expect((await api.runLlmOperation(f.options)).mode).toBe("ai"); expect(f.options.input).toEqual(before);
  }
});
test("SYS-08.2, SEC-04.1: Prep empty model advice is a valid AI result rather than fabricated suggestions", async () => {
  const api = await operations(); const f = fixture("prep_advisor", { suggestions: [] });
  expect(await api.runLlmOperation(f.options)).toEqual({ requestId: "request-synthetic", feature: "prep_advisor", mode: "ai", source: "provider", data: { suggestions: [] } });
});
