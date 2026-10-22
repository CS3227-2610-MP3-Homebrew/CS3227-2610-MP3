import 'server-only';
import { z } from 'zod';
import { getVerifiedActor } from '@/server/auth/session';
import { trustedOrigin } from '@/server/auth/account-adapter';
import { BodyOverflow, checkJsonContentType, checkOrigin, privateResponses, readBounded } from '@/server/http/json';
import { OrderError, createOrderSchema, ref } from './schema';
import { orderPage, orderQueryInvalidHeader } from './query';
import { cancelOrder, listOrders, readOrder, readPickupSlots, submitOrder } from './source';

const status = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, STATE_CONFLICT: 409, SOURCE_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
const messages = {
  INVALID_REQUEST: 'Check the order and pickup selection, then try again.',
  UNAUTHENTICATED: 'Sign in to continue.', FORBIDDEN: 'Customer access required.', NOT_FOUND: 'Requested record not found.',
  STATE_CONFLICT: 'The order, menu prices or pickup availability changed. Review the current details before submitting again.',
  SOURCE_UNAVAILABLE: 'Order information is temporarily unavailable. Try again.', INTERNAL_ERROR: 'Unable to save this order. Try again.',
};
export const accountNameMessage = 'Customer name is unavailable. Account setup must be completed before ordering.';
async function requireCustomer() {
  const actor = await getVerifiedActor();
  if (!actor) throw new OrderError('UNAUTHENTICATED');
  if (actor.role !== 'customer') throw new OrderError('FORBIDDEN');
}
function safeFailure(failure: unknown, responses: ReturnType<typeof privateResponses>) {
  const error = failure instanceof OrderError ? failure : new OrderError('SOURCE_UNAVAILABLE');
  return responses.error(status[error.code], error.code, error.accountName ? accountNameMessage : messages[error.code]);
}
export async function orderGet(request: Request, mode: 'list' | 'detail' | 'slots', reference?: string) {
  const responses = privateResponses();
  try {
    await requireCustomer();
    if (request.headers.get(orderQueryInvalidHeader) === '1' || request.body) throw new OrderError('INVALID_REQUEST');
    const page = orderPage(new URL(request.url).searchParams, mode === 'list');
    if (mode !== 'list' && !ref.safeParse(reference).success) throw new OrderError('INVALID_REQUEST');
    if (mode === 'list') return responses.json(await listOrders(page));
    if (mode === 'slots') return responses.json({ pickupSlots: await readPickupSlots(reference!) });
    return responses.json({ order: await readOrder(reference!) });
  } catch (error) { return safeFailure(error, responses); }
}
export async function orderPost(request: Request, mode: 'create' | 'cancel', orderId?: string) {
  const responses = privateResponses();
  try {
    const originError = checkOrigin(request.headers.get('origin'), trustedOrigin(), responses.error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, responses.error);
    if (mediaError) return mediaError;
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (error) { return error instanceof BodyOverflow ? responses.error(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.') : responses.error(400, 'INVALID_REQUEST', messages.INVALID_REQUEST); }
    orderPage(new URL(request.url).searchParams, false);
    // Strict transport validation precedes any source admission or mutation.
    if (mode === 'create') {
      const parsed = createOrderSchema.safeParse(body);
      if (!parsed.success) throw new OrderError('INVALID_REQUEST');
      await requireCustomer();
      const result = await submitOrder(parsed.data);
      return responses.json({ order: result.order }, result.replayed ? 200 : 201);
    }
    if (!z.strictObject({}).safeParse(body).success || !ref.safeParse(orderId).success) throw new OrderError('INVALID_REQUEST');
    await requireCustomer();
    return responses.json({ order: await cancelOrder(orderId!) });
  } catch (error) { return safeFailure(error, responses); }
}
export function orderMethodNotAllowed(allow: string) {
  return privateResponses().error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: allow });
}
