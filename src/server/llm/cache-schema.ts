import "server-only";
import { z } from "zod";

const text = (max: number) => z.string().refine(s => Array.from(s).length >= 1 && Array.from(s).length <= max);
export const ref = text(128);
const label = text(200);
const reason = text(300);
export const instant = z.iso.datetime({ precision: undefined });
export const businessDate = z.iso.date();
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const weekday = z.number().int().min(1).max(7);
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
export const prepSourceSchema = z.object({ businessDate,
  period: z.object({ from: businessDate, through: businessDate }).strict().refine(p => p.from <= p.through),
  aggregates: z.array(z.object({ aggregateId: ref, itemId: ref, itemName: label, weekday, quantity: count }).strict()).refine(rows => distinct(rows, r => r.aggregateId)),
}).strict();
const filters = z.object({ timeMode: z.enum(["all", "now", "at"]), at: instant.nullable(), drinkType: drink.nullable(), area: area.nullable() }).strict().refine(f => f.timeMode === "at" ? f.at !== null && /:00Z$/.test(f.at) : f.at === null);
export const contextSchema = z.object({
  operationId: z.uuid(), actorId: z.uuid(), cafeId: z.uuid().optional(), feature: z.enum(["brew_finder", "prep_advisor"]),
  scope: z.union([z.object({ actorId: z.uuid() }).strict(), z.object({ cafeId: z.uuid(), businessDate }).strict()]),
  input: z.record(z.string(), z.unknown()), source: z.record(z.string(), z.unknown()),
  model: z.object({ provider: z.enum(["fake", "soclaas"]), baseUrl: z.url().refine(s => { const u = new URL(s); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password; }), model: text(200), reasoningEffort: text(200) }).strict(),
  contract: z.object({ feature: z.enum(["brew_finder", "prep_advisor"]), version: text(128), systemPrompt: z.string().min(1) }).strict(),
}).strict().superRefine((c, ctx) => {
  let valid = c.contract.feature === c.feature;
  if (c.feature === "brew_finder") valid &&= "actorId" in c.scope && c.scope.actorId === c.actorId && c.cafeId === undefined && z.object({ query: text(1000).refine(s => s.trim().length > 0), filters }).strict().safeParse(c.input).success && brewSourceSchema.safeParse(c.source).success;
  else valid &&= "cafeId" in c.scope && c.scope.cafeId === c.cafeId && z.object({ cafeId: z.uuid(), businessDate }).strict().safeParse(c.input).success && c.input.cafeId === c.cafeId && c.input.businessDate === (c.scope as { businessDate: string }).businessDate && prepSourceSchema.safeParse(c.source).success && c.source.businessDate === c.input.businessDate;
  if (!valid) ctx.addIssue({ code: "custom", message: "Invalid cache context." });
});
export type CacheContext = z.infer<typeof contextSchema>;
const brewResult = z.object({ suggestions: z.array(z.object({ cafeId: ref, itemId: ref, reason }).strict()).max(5) }).strict();
const prepResult = z.object({ suggestions: z.array(z.object({ itemId: ref, weekday, direction: z.enum(["more", "less"]), evidence: z.array(z.object({ aggregateId: ref, quantity: count }).strict()).min(1), reason }).strict()) }).strict();
export type CacheResult = z.infer<typeof brewResult> | z.infer<typeof prepResult>;
export function validateResult(context: CacheContext, input: unknown): CacheResult | null {
  if (context.feature === "brew_finder") {
    const parsed = brewResult.safeParse(input); if (!parsed.success) return null;
    const source = brewSourceSchema.parse(context.source);
    if (!distinct(parsed.data.suggestions, s => s.cafeId) || parsed.data.suggestions.length > source.candidates.length) return null;
    for (const s of parsed.data.suggestions) {
      const c = source.candidates.find(c => c.cafeId === s.cafeId);
      const cat = source.catalogue.find(c => c.cafeId === s.cafeId);
      const menu = cat?.items.find(i => i.itemId === s.itemId);
      if (!c?.items.some(i => i.itemId === s.itemId) || !cat?.eligible || !menu || menu.soldOut) return null;
      const f = context.input.filters as z.infer<typeof filters>;
      if ((f.area && cat.area !== f.area) || (f.drinkType && menu.drinkType !== f.drinkType) || (f.timeMode === "now" && !cat.openNow)) return null;
    }
    return parsed.data;
  }
  const parsed = prepResult.safeParse(input); if (!parsed.success) return null;
  const source = prepSourceSchema.parse(context.source);
  if (!distinct(parsed.data.suggestions, s => JSON.stringify([s.itemId,s.weekday]))) return null;
  for (const s of parsed.data.suggestions) {
    if (!distinct(s.evidence, e => e.aggregateId)) return null;
    for (const e of s.evidence) if (!source.aggregates.some(a => a.aggregateId === e.aggregateId && a.itemId === s.itemId && a.quantity === e.quantity)) return null;
    if (s.reason !== `Prepare ${s.direction} of this item on weekday ${s.weekday}; recorded quantities: ${s.evidence.map(e => e.quantity).join(", ")}.`) return null;
  }
  return parsed.data;
}
const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const envelopeSchema = z.object({ version: z.literal("1"), feature: z.enum(["brew_finder", "prep_advisor"]), environment: z.enum(["local", "ci", "dev", "prod"]),
  scope: contextSchema.shape.scope, inputFingerprint: hash, sourceRevision: hash, modelIdentity: hash, contractIdentity: hash,
  createdAt: instant, expiresAt: instant, data: z.unknown(),
}).strict();
