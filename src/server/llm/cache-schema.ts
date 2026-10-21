import "server-only";
import { z } from "zod";
import { prepInput, validateResult as validateFeatureResult, text, ref, label, count, weekday, filters, query, date as businessDate, type BrewResult, type PrepResult } from "./schemas";
export { ref, businessDate };

export const instant = z.iso.datetime({ precision: undefined });
const area = z.enum(["Central", "North", "South", "East", "West"]);
const drink = z.enum(["coffee", "matcha", "tea", "chocolate", "juice", "other"]);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const distinct = <T>(rows: T[], key: (row: T) => string) => new Set(rows.map(key)).size === rows.length;
const item = z.object({ itemId: ref, name: label, drinkType: drink }).strict();
const candidate = z.object({ cafeId: ref, name: label, area, items: z.array(item).max(20).refine(rows => distinct(rows, r => r.itemId)) }).strict();
export const brewSourceSchema = z.object({
  catalogue: z.array(z.object({ cafeId: ref, name: z.string(), area, eligible: z.boolean(),
    weeklyIntervals: z.array(z.object({ weekday, opensAt: time, closesAt: time, closesNextDay: z.boolean() }).strict()),
    openNow: z.boolean(), nextStateChangeAt: instant.nullable(), ratingSum: count, ratingCount: count,
    items: z.array(item.extend({ name: z.string(), soldOut: z.boolean() })).refine(rows => distinct(rows, r => r.itemId)),
  }).strict()).refine(rows => distinct(rows, r => r.cafeId)),
  candidates: z.array(candidate).max(20).refine(rows => distinct(rows, r => r.cafeId)),
  candidateOrder: z.array(ref).refine(rows => new Set(rows).size === rows.length),
  itemOrders: z.array(z.object({ cafeId: ref, itemIds: z.array(ref).refine(rows => new Set(rows).size === rows.length) }).strict()).refine(rows => distinct(rows, r => r.cafeId)),
}).strict();
export const prepSourceSchema = prepInput;
export const contextSchema = z.object({
  operationId: z.uuid(), actorId: z.uuid(), cafeId: z.uuid().optional(), feature: z.enum(["brew_finder", "prep_advisor"]),
  scope: z.union([z.object({ actorId: z.uuid() }).strict(), z.object({ cafeId: z.uuid(), businessDate }).strict()]),
  input: z.record(z.string(), z.unknown()), source: z.record(z.string(), z.unknown()),
  model: z.object({ provider: z.enum(["fake", "soclaas"]), baseUrl: z.url().refine(s => { const u = new URL(s); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password; }), model: text(200), reasoningEffort: text(200) }).strict(),
  contract: z.object({ feature: z.enum(["brew_finder", "prep_advisor"]), version: text(128), systemPrompt: z.string().min(1) }).strict(),
}).strict().superRefine((c, ctx) => {
  let valid = c.contract.feature === c.feature;
  if (c.feature === "brew_finder") valid &&= "actorId" in c.scope && c.scope.actorId === c.actorId && c.cafeId === undefined && z.object({ query, filters }).strict().safeParse(c.input).success && brewSourceSchema.safeParse(c.source).success;
  else valid &&= "cafeId" in c.scope && c.scope.cafeId === c.cafeId && z.object({ cafeId: z.uuid(), businessDate }).strict().safeParse(c.input).success && c.input.cafeId === c.cafeId && c.input.businessDate === (c.scope as { businessDate: string }).businessDate && prepSourceSchema.safeParse(c.source).success && c.source.businessDate === c.input.businessDate;
  if (!valid) ctx.addIssue({ code: "custom", message: "Invalid cache context." });
});
export type CacheContext = z.infer<typeof contextSchema>;
export type CacheResult = BrewResult | PrepResult;
export function validateResult(context: CacheContext, input: unknown): CacheResult | null {
  try {
    if (context.feature === "prep_advisor") {
      return validateFeatureResult("prep_advisor", input, prepSourceSchema.parse(context.source), true) as PrepResult;
    }
    const source = brewSourceSchema.parse(context.source);
    const result = validateFeatureResult("brew_finder", input, { query: context.input.query as string, candidates: source.candidates }, true) as BrewResult;
    // Cache-only catalogue predicates supplement the shared feature-result gate.
    for (const s of result.suggestions) {
      const cat = source.catalogue.find(c => c.cafeId === s.cafeId);
      const menu = cat?.items.find(i => i.itemId === s.itemId);
      if (!cat?.eligible || !menu || menu.soldOut) return null;
      const f = context.input.filters as z.infer<typeof filters>;
      if ((f.area && cat.area !== f.area) || (f.drinkType && menu.drinkType !== f.drinkType) || (f.timeMode === "now" && !cat.openNow)) return null;
    }
    return result;
  } catch { return null; }
}
const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const envelopeSchema = z.object({ version: z.literal("1"), feature: z.enum(["brew_finder", "prep_advisor"]), environment: z.enum(["local", "ci", "dev", "prod"]),
  scope: contextSchema.shape.scope, inputFingerprint: hash, sourceRevision: hash, modelIdentity: hash, contractIdentity: hash,
  createdAt: instant, expiresAt: instant, data: z.unknown(),
}).strict();
