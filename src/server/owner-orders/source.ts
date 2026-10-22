import 'server-only';
import { z } from 'zod';
import { createSessionClient } from '@/server/supabase/session-client';
import { OrderError } from '@/server/orders/schema';
import { ownerOrderSchema, type OwnerAction } from './schema';
import type { QueueQuery } from './query';

const failure = z.strictObject({ error: z.enum(['INVALID_REQUEST', 'NOT_FOUND', 'STATE_CONFLICT']) });
async function rpc(name: string, args: Record<string, unknown>, mutation = false): Promise<unknown> {
  let client: Awaited<ReturnType<typeof createSessionClient>>;
  try { client = await createSessionClient({ retry: false }); }
  catch { throw new OrderError('SOURCE_UNAVAILABLE'); }
  try {
    const result = await client.rpc(name, args);
    if (result.error) {
      if (result.status === 401) throw new OrderError('UNAUTHENTICATED');
      if (result.error.code === '42501' || result.status === 403) throw new OrderError('FORBIDDEN');
      throw new OrderError(!mutation || result.status === 0 || [502, 503, 504].includes(result.status) ? 'SOURCE_UNAVAILABLE' : 'INTERNAL_ERROR');
    }
    const parsed = failure.safeParse(result.data);
    if (parsed.success) throw new OrderError(parsed.data.error);
    return result.data;
  } catch (error) {
    if (error instanceof OrderError) throw error;
    throw new OrderError(mutation ? 'INTERNAL_ERROR' : 'SOURCE_UNAVAILABLE');
  }
}
function decode<T>(schema: z.ZodType<T>, value: unknown, mutation = false): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new OrderError(mutation ? 'INTERNAL_ERROR' : 'SOURCE_UNAVAILABLE');
  return result.data;
}
export async function listQueue(query: QueueQuery) {
  const data = decode(z.strictObject({ items: z.array(ownerOrderSchema), hasCafe: z.boolean() }), await rpc('owner_order_queue', { p_view: query.view, p_filter: query.filter, p_page: query.page }));
  return { items: data.items.slice(0, 10), page: query.page, pageSize: 10 as const, hasNextPage: data.items.length > 10, hasCafe: data.hasCafe };
}
export async function actOnOrder(orderId: string, action: OwnerAction, reason: string | null) {
  return decode(z.strictObject({ order: ownerOrderSchema }), await rpc('owner_order_action', { p_order_ref: orderId, p_action: action, p_reason: reason }, true), true).order;
}
