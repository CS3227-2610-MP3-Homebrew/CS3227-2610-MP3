import "server-only";
import { createHash } from "node:crypto";
import { brewSourceSchema, prepSourceSchema } from "./cache-schema";

import { compareCodePoints } from "./schemas";
export { compareCodePoints } from "./schemas";

/** JSON identities preserve decoded strings exactly; unsupported JS values fail closed. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  const encode = (v: unknown): string => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number" && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== "object" || !v || ancestors.has(v)) throw new Error("Invalid cache identity.");
    ancestors.add(v);
    try {
      if (Array.isArray(v)) {
        if (Object.keys(v).length !== v.length) throw new Error("Invalid cache identity.");
        return `[${Array.from(v, encode).join(",")}]`;
      }
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error("Invalid cache identity.");
      if (Object.getOwnPropertySymbols(v).length) throw new Error("Invalid cache identity.");
      return `{${Object.keys(v).sort(compareCodePoints).map(key => `${JSON.stringify(key)}:${encode((v as Record<string, unknown>)[key])}`).join(",")}}`;
    } finally { ancestors.delete(v); }
  };
  return encode(value);
}
export function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
export const cacheKey = (preimage: Record<string, unknown>): string => digest(preimage);
export function brewSourceRevision(input: Record<string, unknown>): string {
  const source = brewSourceSchema.parse(input);
  return digest({ ...source,
    catalogue: source.catalogue.map(c => ({ ...c, items: [...c.items].sort((a,b) => compareCodePoints(a.itemId,b.itemId)) })).sort((a,b) => compareCodePoints(a.cafeId,b.cafeId)),
    candidates: source.candidates.map(c => ({ ...c, items: [...c.items].sort((a,b) => compareCodePoints(a.itemId,b.itemId)) })).sort((a,b) => compareCodePoints(a.cafeId,b.cafeId)),
    itemOrders: [...source.itemOrders].sort((a,b) => compareCodePoints(a.cafeId,b.cafeId)),
  });
}
export function prepSourceRevision(input: Record<string, unknown>): string {
  const source = prepSourceSchema.parse(input);
  return digest({ ...source, aggregates: [...source.aggregates].sort((a,b) => compareCodePoints(a.aggregateId,b.aggregateId)) });
}
