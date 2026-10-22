import 'server-only';
import { z } from 'zod';
import { createSessionClient } from '@/server/supabase/session-client';
import { ownReviewSchema, ReviewError, type CreateReview } from './customer-schema';

const failure = z.strictObject({ error: z.enum(['INVALID_REQUEST', 'NOT_FOUND', 'STATE_CONFLICT']) });
const success = z.strictObject({ review: ownReviewSchema });
async function operation(orderId: string, input?: CreateReview) {
  const mutation = input !== undefined;
  try {
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc(mutation ? 'create_customer_review' : 'customer_own_review', {
      p_order_ref: orderId, ...(mutation ? { p_review: input } : {}),
    });
    if (result.error) {
      if (result.status === 401) throw new ReviewError('UNAUTHENTICATED');
      if (result.status === 403 || result.error.code === '42501') throw new ReviewError('FORBIDDEN');
      if (mutation && result.error.code === '23505') throw new ReviewError('STATE_CONFLICT');
      throw new ReviewError(!mutation || result.status === 0 || [502, 503, 504].includes(result.status) ? 'SOURCE_UNAVAILABLE' : 'INTERNAL_ERROR');
    }
    const error = failure.safeParse(result.data);
    if (error.success) throw new ReviewError(error.data.error);
    const parsed = success.safeParse(result.data);
    if (!parsed.success || parsed.data.review.orderId !== orderId) throw new ReviewError(mutation ? 'INTERNAL_ERROR' : 'SOURCE_UNAVAILABLE');
    return parsed.data.review;
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(mutation ? 'INTERNAL_ERROR' : 'SOURCE_UNAVAILABLE');
  }
}
export const readOwnReview = (orderId: string) => operation(orderId);
export const createReview = (orderId: string, input: CreateReview) => operation(orderId, input);
