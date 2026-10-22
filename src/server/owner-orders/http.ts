import 'server-only';
import { getVerifiedActor } from '@/server/auth/session';
import { trustedOrigin } from '@/server/auth/account-adapter';
import { BodyOverflow, checkJsonContentType, checkOrigin, privateResponses, readBounded } from '@/server/http/json';
import { OrderError, ref } from '@/server/orders/schema';
import { queueQuery, queueQueryInvalidHeader } from './query';
import { emptySchema, rejectSchema, type OwnerAction } from './schema';
import { actOnOrder, listQueue } from './source';

const status = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, STATE_CONFLICT: 409, SOURCE_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
export const conflictMessage = 'Order changed. Refresh to see its current state.';
const messages = {
  INVALID_REQUEST: 'Check the request and try again.',
  UNAUTHENTICATED: 'Sign in to continue.', FORBIDDEN: 'Café owner access required.', NOT_FOUND: 'Requested record not found.',
  STATE_CONFLICT: conflictMessage,
  SOURCE_UNAVAILABLE: 'Order queue is temporarily unavailable. Try again.', INTERNAL_ERROR: 'Unable to update this order. Try again.',
};
async function requireOwner() {
  const actor = await getVerifiedActor();
  if (!actor) throw new OrderError('UNAUTHENTICATED');
  if (actor.role !== 'owner') throw new OrderError('FORBIDDEN');
}
function safeFailure(failure: unknown, responses: ReturnType<typeof privateResponses>) {
  const error = failure instanceof OrderError ? failure : new OrderError('SOURCE_UNAVAILABLE');
  return responses.error(status[error.code], error.code, messages[error.code]);
}
export async function queueGet(request: Request) {
  const responses = privateResponses();
  try {
    await requireOwner();
    if (request.headers.get(queueQueryInvalidHeader) === '1' || request.body) throw new OrderError('INVALID_REQUEST');
    const { items, page, pageSize, hasNextPage } = await listQueue(queueQuery(new URL(request.url).searchParams));
    return responses.json({ items, page, pageSize, hasNextPage });
  } catch (error) { return safeFailure(error, responses); }
}
export async function queuePost(request: Request, action: OwnerAction, orderId: string) {
  const responses = privateResponses();
  try {
    const originError = checkOrigin(request.headers.get('origin'), trustedOrigin(), responses.error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, responses.error);
    if (mediaError) return mediaError;
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (error) { return error instanceof BodyOverflow ? responses.error(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.') : responses.error(400, 'INVALID_REQUEST', messages.INVALID_REQUEST); }
    if ([...new URL(request.url).searchParams].length) throw new OrderError('INVALID_REQUEST');
    // Strict transport validation precedes any source admission or mutation.
    const parsed = action === 'reject' ? rejectSchema.safeParse(body) : emptySchema.safeParse(body);
    if (!parsed.success || !ref.safeParse(orderId).success) throw new OrderError('INVALID_REQUEST');
    await requireOwner();
    const reason = 'reason' in parsed.data ? parsed.data.reason : null;
    return responses.json({ order: await actOnOrder(orderId, action, reason) });
  } catch (error) { return safeFailure(error, responses); }
}
export function queueMethodNotAllowed(allow: string) {
  return privateResponses().error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: allow });
}
