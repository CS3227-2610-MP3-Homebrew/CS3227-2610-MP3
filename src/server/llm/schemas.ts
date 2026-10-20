import "server-only";
import { z } from "zod";

export type Feature = "brew_finder" | "prep_advisor" | "moderation";
const text = (max: number, nonblank = false) => z.string().refine((v) =>
  [...v].length >= 1 && [...v].length <= max && (!nonblank || v.trim().length > 0));
export const ref = text(128);
const label = text(200);
const reason = text(300);
const query = text(1000, true);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const weekday = z.number().int().min(1).max(7);
const direction = z.enum(["more", "less"]);
const unique = (values: readonly string[]) => new Set(values).size === values.length;
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
});
const item = z.strictObject({ itemId: ref, name: label, drinkType: label });
export const brewInput = z.strictObject({ query, candidates: z.array(z.strictObject({
  cafeId: ref, name: label, area: label,
  items: z.array(item).min(1).max(20).refine((v) => unique(v.map((i) => i.itemId))),
})).max(20).refine((v) => unique(v.map((i) => i.cafeId))) });
export const prepInput = z.strictObject({
  businessDate: date,
  period: z.strictObject({ from: date, through: date }).refine((v) => v.from <= v.through),
  aggregates: z.array(z.strictObject({ aggregateId: ref, itemId: ref, itemName: label, weekday, quantity: count }))
    .refine((v) => unique(v.map((i) => i.aggregateId))),
});
export const moderationInput = (max: number) => z.strictObject({ reviews: z.array(z.strictObject({
  reviewId: ref, text: text(1000, true),
})).min(1).max(max).refine((v) => unique(v.map((i) => i.reviewId))) });
export type BrewInput = z.infer<typeof brewInput>;
export type PrepInput = z.infer<typeof prepInput>;
export type ModerationInput = z.infer<ReturnType<typeof moderationInput>>;
export type Input = BrewInput | PrepInput | ModerationInput;

const brewResult = z.strictObject({ suggestions: z.array(z.strictObject({ cafeId: ref, itemId: ref, reason })).max(5) });
const prepSuggestion = { itemId: ref, weekday, direction };
const prepModelResult = z.strictObject({ suggestions: z.array(z.strictObject({ ...prepSuggestion,
  evidenceIds: z.array(ref).min(1).refine(unique),
})) });
const prepResult = z.strictObject({ suggestions: z.array(z.strictObject({ ...prepSuggestion,
  evidence: z.array(z.strictObject({ aggregateId: ref, quantity: count })).min(1), reason,
})) });
const moderationResult = z.strictObject({ classifications: z.array(z.strictObject({ reviewId: ref,
  label: z.enum(["ok", "spam", "abusive", "off-topic", "injection attempt"]), reason,
})) });
export type BrewResult = z.infer<typeof brewResult>;
export type PrepResult = z.infer<typeof prepResult>;
export type ModerationResult = z.infer<typeof moderationResult>;
export type FeatureData = { brew_finder: BrewResult; prep_advisor: PrepResult; moderation: ModerationResult };

/** Strict schema + authorized references. Any invalid member rejects the whole result. */
export function validateResult(feature: Feature, value: unknown, source: Input, cached: boolean): FeatureData[Feature] {
  if (feature === "brew_finder") {
    const input = source as BrewInput;
    const result = brewResult.parse(value);
    if (result.suggestions.length > input.candidates.length || !unique(result.suggestions.map((s) => s.cafeId)) ||
      result.suggestions.some((s) => !input.candidates.some((c) => c.cafeId === s.cafeId && c.items.some((i) => i.itemId === s.itemId)))) throw new Error("Invalid result.");
    return result;
  }
  if (feature === "moderation") {
    const input = source as ModerationInput;
    const result = moderationResult.parse(value);
    if (result.classifications.length !== input.reviews.length || !unique(result.classifications.map((c) => c.reviewId)) ||
      result.classifications.some((c) => !input.reviews.some((r) => r.reviewId === c.reviewId))) throw new Error("Invalid result.");
    return result;
  }
  const input = source as PrepInput;
  const model = cached ? (() => {
    const result = prepResult.parse(value);
    return { suggestions: result.suggestions.map((s) => ({ itemId: s.itemId, weekday: s.weekday, direction: s.direction, evidenceIds: s.evidence.map((e) => e.aggregateId) })) };
  })() : prepModelResult.parse(value);
  if (!unique(model.suggestions.map((s) => JSON.stringify([s.itemId, s.weekday])))) throw new Error("Invalid result.");
  const result = prepResult.parse({ suggestions: model.suggestions.map((s) => {
    if (!unique(s.evidenceIds)) throw new Error("Invalid result.");
    const evidence = s.evidenceIds.map((id) => {
      const aggregate = input.aggregates.find((a) => a.aggregateId === id && a.itemId === s.itemId);
      if (!aggregate) throw new Error("Invalid result.");
      return { aggregateId: id, quantity: aggregate.quantity };
    });
    return { itemId: s.itemId, weekday: s.weekday, direction: s.direction, evidence,
      reason: `Prepare ${s.direction} of this item on weekday ${s.weekday}; recorded quantities: ${evidence.map((e) => e.quantity.toString(10)).join(", ")}.` };
  }) });
  if (cached && canonical(result) !== canonical(prepResult.parse(value))) throw new Error("Invalid result.");
  return result;
}

/** Object-key order follows Unicode code points, preserving every array and string. */
export function compareCodePoints(a: string, b: string): number {
  const x = [...a], y = [...b];
  for (let n = 0; n < Math.min(x.length, y.length); n++) {
    const difference = x[n].codePointAt(0)! - y[n].codePointAt(0)!;
    if (difference) return difference;
  }
  return x.length - y.length;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => compareCodePoints(a, b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  const serialized = JSON.stringify(value);
  if (serialized === undefined || (typeof value === "number" && !Number.isFinite(value))) throw new Error("Invalid JSON.");
  return serialized;
}

const instant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/).refine((v) => {
  const d = new Date(v);
  return date.safeParse(v.slice(0, 10)).success && Number.isFinite(d.getTime()) && d.toISOString() === v.replace("Z", ".000Z");
});
const filters = z.strictObject({ timeMode: z.enum(["all", "now", "at"]), at: instant.nullable(),
  drinkType: z.enum(["coffee", "matcha", "tea", "chocolate", "juice", "other"]).nullable(),
  area: z.enum(["Central", "North", "South", "East", "West"]).nullable(),
}).refine((v) => v.timeMode === "at" ? v.at !== null : v.at === null);
export function requestSchema(feature: Feature, maxReviews: number) {
  if (feature === "brew_finder") return z.strictObject({ query, filters });
  if (feature === "prep_advisor") return z.strictObject({ cafeId: ref, refresh: z.boolean() });
  if (!Number.isInteger(maxReviews) || maxReviews < 0 || maxReviews > 20) throw new Error("Invalid policy.");
  return z.strictObject({ reviewIds: z.array(ref).min(1).max(maxReviews).refine(unique) });
}

// Provider metadata is intentionally ignored; only these capabilities are accepted.
const emptyCapability = z.unknown().refine((v) => v == null || v === "" || (Array.isArray(v) && v.length === 0));
export const providerEnvelope = z.object({ choices: z.array(z.object({ index: z.literal(0), finish_reason: z.literal("stop"),
  message: z.object({ role: z.literal("assistant"), content: z.string().min(1),
    tool_calls: emptyCapability.optional(), function_call: emptyCapability.optional(), refusal: emptyCapability.optional(),
  }),
})).length(1), usage: z.unknown().optional() });
export type TokenUsage = { input?: number; output?: number; total?: number };
export function parseTokenUsage(value: unknown): TokenUsage {
  const usage = z.object({ prompt_tokens: z.unknown().optional(), completion_tokens: z.unknown().optional(), total_tokens: z.unknown().optional() }).safeParse(value);
  if (!usage.success) return {};
  return Object.fromEntries(([['input', usage.data.prompt_tokens], ['output', usage.data.completion_tokens], ['total', usage.data.total_tokens]] as const)
    .filter((entry): entry is ["input" | "output" | "total", number] => count.safeParse(entry[1]).success));
}
