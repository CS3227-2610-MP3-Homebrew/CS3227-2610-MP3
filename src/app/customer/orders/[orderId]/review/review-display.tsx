import type { OwnReview } from '@/lib/reviews/fields';
import { singaporeTime } from '../../presentation';

export function ReviewDisplay({ review }: { review: OwnReview }) {
  return <section aria-label="Your submitted review" className="space-y-4 rounded-xl border border-black/15 p-5">
    <h2 className="text-xl font-semibold">Your submitted review</h2>
    <dl className="flex flex-wrap gap-6 text-sm"><div><dt className="font-semibold">Rating</dt><dd>{review.rating} out of 5</dd></div>
      <div><dt className="font-semibold">Moderation state</dt><dd className="capitalize">{review.moderationState}</dd></div>
      <div><dt className="font-semibold">Submitted</dt><dd><time dateTime={review.submittedAt}>{singaporeTime(review.submittedAt)}</time></dd></div></dl>
    <p className="whitespace-pre-wrap break-words">{review.text}</p>
    <p className="text-sm">One review per order. Submitted reviews cannot be edited or deleted.</p>
  </section>;
}
