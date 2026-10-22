import 'server-only';
import { getVerifiedActor } from '@/server/auth/session';
import { trustedOrigin } from '@/server/auth/account-adapter';
import { BodyOverflow, checkJsonContentType, checkOrigin, privateResponses, readBounded } from '@/server/http/json';
import { createReviewSchema, reviewFieldRules, ReviewError, reviewRef } from './customer-schema';
import { checkReviewQuery, reviewQueryInvalidHeader } from './customer-query';
import { createReview, readOwnReview } from './customer-source';

const status = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, STATE_CONFLICT: 409, SOURCE_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
const messages = {
  INVALID_REQUEST: reviewFieldRules, UNAUTHENTICATED: 'Sign in to continue.', FORBIDDEN: 'Customer access required.',
  NOT_FOUND: 'Requested record not found.', STATE_CONFLICT: 'This order is not collected or already has a review. Check My orders and your submitted review.',
  SOURCE_UNAVAILABLE: 'Review information is temporarily unavailable. Try again.', INTERNAL_ERROR: 'Unable to confirm this review submission. Check your submitted review before trying again.',
};
async function requireCustomer() {
  const actor = await getVerifiedActor();
  if (!actor) throw new ReviewError('UNAUTHENTICATED');
  if (actor.role !== 'customer') throw new ReviewError('FORBIDDEN');
}
function safeFailure(error: unknown, responses: ReturnType<typeof privateResponses>) {
  const failure = error instanceof ReviewError ? error : new ReviewError('SOURCE_UNAVAILABLE');
  return responses.error(status[failure.code], failure.code, messages[failure.code]);
}
function checkTarget(request: Request, orderId: string) {
  if (request.headers.get(reviewQueryInvalidHeader) === '1' || !reviewRef.safeParse(orderId).success) throw new ReviewError('INVALID_REQUEST');
  checkReviewQuery(new URL(request.url).searchParams);
}
export async function reviewGet(request: Request, orderId: string) {
  const responses = privateResponses();
  try {
    await requireCustomer(); checkTarget(request, orderId);
    if (request.body) throw new ReviewError('INVALID_REQUEST');
    return responses.json({ review: await readOwnReview(orderId) });
  } catch (error) { return safeFailure(error, responses); }
}
export async function reviewPost(request: Request, orderId: string) {
  const responses = privateResponses();
  try {
    const originError = checkOrigin(request.headers.get('origin'), trustedOrigin(), responses.error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, responses.error);
    if (mediaError) return mediaError;
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (error) { return error instanceof BodyOverflow ? responses.error(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.') : responses.error(400, 'INVALID_REQUEST', reviewFieldRules); }
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) throw new ReviewError('INVALID_REQUEST');
    checkTarget(request, orderId); await requireCustomer();
    return responses.json({ review: await createReview(orderId, parsed.data) }, 201);
  } catch (error) { return safeFailure(error, responses); }
}
export const reviewMethodNotAllowed = () => privateResponses().error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: 'GET, POST' });
