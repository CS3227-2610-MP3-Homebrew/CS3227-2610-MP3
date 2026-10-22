import 'server-only';
import { z } from 'zod';
import { createSessionClient } from '@/server/supabase/session-client';
import { pickupSlots } from './pickup';
import { OrderError, orderSchema, type CreateOrder } from './schema';
import type { CustomerOrderView } from '@/lib/orders/views';

const failure = z.strictObject({ error: z.enum(['INVALID_REQUEST', 'NOT_FOUND', 'STATE_CONFLICT']), accountName: z.literal(true).optional() });
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
    if (parsed.success) throw new OrderError(parsed.data.error, parsed.data.accountName);
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
export async function listOrders(page: number, view: CustomerOrderView = 'all') {
  const data = decode(z.strictObject({ items: z.array(orderSchema) }), view === 'all'
    ? await rpc('customer_order_history', { p_page: page })
    : await rpc('customer_order_history_filtered', { p_page: page, p_view: view }));
  return { items: data.items.slice(0, 20), page, pageSize: 20 as const, hasNextPage: data.items.length > 20 };
}
export async function readOrder(orderId: string) {
  return decode(z.strictObject({ order: orderSchema }), await rpc('customer_order_history', { p_page: 1, p_order_ref: orderId })).order;
}
export async function readPickupSlots(cafeId: string) {
  const data = decode(z.strictObject({ now: z.iso.datetime({ offset: true }), cutoffMinutes: z.number().int().min(0).max(180),
    hours: z.array(z.strictObject({ weekday: z.number().int().min(1).max(7), opensAt: z.string().regex(/^\d{2}:\d{2}$/), closesAt: z.string().regex(/^\d{2}:\d{2}$/), closesNextDay: z.boolean() })) }),
  await rpc('customer_pickup_source', { p_cafe_ref: cafeId }));
  return pickupSlots(data.hours, data.cutoffMinutes, data.now);
}
export async function submitOrder(input: CreateOrder) {
  return decode(z.strictObject({ order: orderSchema, replayed: z.boolean() }), await rpc('create_customer_order', { p_order: input }, true), true);
}
export async function cancelOrder(orderId: string) {
  return decode(z.strictObject({ order: orderSchema }), await rpc('cancel_customer_order', { p_order_ref: orderId }, true), true).order;
}
