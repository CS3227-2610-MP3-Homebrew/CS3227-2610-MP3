import { ReviewError } from './customer-schema';

export const reviewQueryInvalidHeader = 'x-homebrew-review-query-invalid';
export function checkReviewQuery(params: URLSearchParams) {
  if (params.size !== 0) throw new ReviewError('INVALID_REQUEST');
}
/** Preserve raw query rejection before Next can normalize reserved query keys.
 * Replace caller assertions; the route still checks inputs and authorization. */
export function markReviewQuery(request: Request) {
  if (!/^\/api\/customer\/orders\/[^/]+\/review\/?$/.test(new URL(request.url).pathname)) return;
  request.headers.set(reviewQueryInvalidHeader, new URL(request.url).searchParams.size ? '1' : '0');
}
