import { z } from 'zod';
export const areas = ['Central', 'North', 'South', 'East', 'West'] as const;
export const drinkTypes = ['coffee', 'matcha', 'tea', 'chocolate', 'juice', 'other'] as const;
const instant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/).refine(value => {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value.replace('Z', '.000Z');
});
const page = z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value))).transform(Number);
const browse = z.object({
  timeMode: z.enum(['all', 'now', 'at']).default('all'), at: instant.optional(),
  area: z.enum(areas).optional(), drinkType: z.enum(drinkTypes).optional(), page: page.default(1),
}).strict().refine(value => value.timeMode === 'at' ? value.at !== undefined : value.at === undefined);
const reviews = z.object({ page: page.default(1) }).strict();
export type CatalogueQuery = z.infer<typeof browse>;
export class CatalogueError extends Error {
  constructor(public code: 'INVALID_REQUEST' | 'NOT_FOUND' | 'SOURCE_UNAVAILABLE' | 'UNAUTHENTICATED' | 'FORBIDDEN') { super(code); }
}
export function parseQuery(params: URLSearchParams, mode: 'browse'): CatalogueQuery;
export function parseQuery(params: URLSearchParams, mode: 'reviews' | 'detail'): { page: number };
export function parseQuery(params: URLSearchParams, mode: 'browse' | 'reviews' | 'detail') {
  const allowed = new Set(mode === 'browse' ? ['timeMode', 'at', 'drinkType', 'area', 'page'] : mode === 'reviews' ? ['page'] : []);
  const input: Record<string, string> = {};
  for (const [key, value] of params) {
    // Reject before assignment so inherited setters cannot erase unknown keys.
    if (!allowed.has(key) || Object.hasOwn(input, key)) throw new CatalogueError('INVALID_REQUEST');
    input[key] = value;
  }
  if (mode === 'detail') {
    if (params.size) throw new CatalogueError('INVALID_REQUEST');
    return { page: 1 };
  }
  const parsed = (mode === 'browse' ? browse : reviews).safeParse(input);
  if (!parsed.success) throw new CatalogueError('INVALID_REQUEST');
  return parsed.data;
}
export function pageParams(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}
