import { z } from 'zod';

export const reviewRef = z.string().refine(value => [...value].length >= 1 && [...value].length <= 128);
export const reviewFieldRules = 'Choose an integer rating from 1 to 5 and enter nonblank review text of 1–1,000 Unicode code points.';
export const createReviewSchema = z.strictObject({
  rating: z.number().int().min(1).max(5),
  text: z.string().refine(value => value.trim().length > 0 && [...value].length <= 1000),
});
const instant = z.iso.datetime({ offset: true }).transform(value => {
  const fraction = /\.(\d+)/.exec(value)?.[1];
  const whole = value.replace(/\.\d+(?=Z|[+-])/, '');
  return new Date(whole).toISOString().replace('.000Z', '') + (fraction ? `.${fraction}` : '') + 'Z';
});
export const ownReviewSchema = z.strictObject({
  reviewId: reviewRef, orderId: reviewRef, rating: z.number().int().min(1).max(5),
  text: z.string(), submittedAt: instant, moderationState: z.enum(['pending', 'kept', 'hidden']),
});
export type OwnReview = z.infer<typeof ownReviewSchema>;
export type CreateReview = z.infer<typeof createReviewSchema>;
