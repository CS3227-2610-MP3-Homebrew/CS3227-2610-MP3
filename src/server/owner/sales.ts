import 'server-only';
import { z } from 'zod';
import { getVerifiedActor } from '@/server/auth/session';
import { privateResponses } from '@/server/http/json';
import { createSessionClient } from '@/server/supabase/session-client';
import { count, date, prepInput, ref, type PrepInput } from '@/server/llm/schemas';

const weekday = z.number().int().min(1).max(7);
export const ownerSalesSchema = z.strictObject({
  cafeId: ref, businessDate: date, period: z.strictObject({ from: date, through: date }), currency: z.literal('SGD'),
  daily: z.array(z.strictObject({ date, orderCount: count, revenueCents: count })).length(28),
  topItems: z.array(z.strictObject({ rank: z.number().int().min(1).max(10), itemId: ref, itemName: z.string(), quantity: count, revenueCents: count })).max(10),
  weekdays: z.array(z.strictObject({ weekday, orderCount: count, quantity: count, revenueCents: count })).length(7),
});
export type OwnerSales = z.infer<typeof ownerSalesSchema>;

export class SalesSourceError extends Error {}
async function rpc(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  try {
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc(name, args);
    if (result.error) throw new SalesSourceError();
    return result.data;
  } catch { throw new SalesSourceError(); }
}
/** Owner's own café sales under session RLS; null only when the owner has no café. */
export async function readOwnerSales(): Promise<OwnerSales | null> {
  const parsed = z.strictObject({ sales: ownerSalesSchema.nullable() }).safeParse(await rpc('owner_sales'));
  if (!parsed.success) throw new SalesSourceError();
  return parsed.data.sales;
}
/** OWN-07.15 Prep input for one owned café; null input is insufficient source data. */
export async function readPrepSource(cafeId: string): Promise<{ found: false } | { found: true; input: PrepInput | null }> {
  const parsed = z.union([z.strictObject({ error: z.literal('NOT_FOUND') }), z.strictObject({ input: prepInput.nullable() })])
    .safeParse(await rpc('owner_prep_source', { p_cafe_ref: cafeId }));
  if (!parsed.success) throw new SalesSourceError();
  return 'error' in parsed.data ? { found: false } : { found: true, input: parsed.data.input };
}

export async function salesGet(request: Request) {
  const { json, error } = privateResponses();
  try {
    const actor = await getVerifiedActor();
    if (!actor) return error(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    if (actor.role !== 'owner') return error(403, 'FORBIDDEN', 'Café owner access required.');
    if ([...new URL(request.url).searchParams].length || request.body) return error(400, 'INVALID_REQUEST', 'Sales reads take no parameters.');
    return json({ sales: await readOwnerSales() });
  } catch { return error(503, 'SOURCE_UNAVAILABLE', 'Sales are temporarily unavailable. Try again.'); }
}
export const salesMethodNotAllowed = () => privateResponses().error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: 'GET, HEAD, OPTIONS' });
