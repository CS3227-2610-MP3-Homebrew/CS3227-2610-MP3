import 'server-only';
export { createReviewSchema, ownReviewSchema, reviewRef, reviewFieldRules, type CreateReview, type OwnReview } from '@/lib/reviews/fields';

export const reviewCodes = ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'STATE_CONFLICT', 'SOURCE_UNAVAILABLE', 'INTERNAL_ERROR'] as const;
export class ReviewError extends Error {
  constructor(public code: typeof reviewCodes[number]) { super(code); }
}
