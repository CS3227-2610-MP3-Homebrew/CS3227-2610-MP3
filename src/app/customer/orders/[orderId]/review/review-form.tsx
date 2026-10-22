'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createReviewSchema, ownReviewSchema, reviewFieldRules, type OwnReview } from '@/lib/reviews/fields';
import { ReviewDisplay } from './review-display';

const responseSchema = z.strictObject({ requestId: z.string(), review: ownReviewSchema });
export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [message, setMessage] = useState('');
  const [review, setReview] = useState<OwnReview | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending.current) return;
    const input = createReviewSchema.safeParse({ rating: rating === '' ? null : Number(rating), text });
    if (!input.success) { setMessage(reviewFieldRules); return; }
    sending.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.data),
      });
      const body: unknown = await response.json();
      if (response.ok) {
        const result = responseSchema.safeParse(body);
        if (!result.success || result.data.review.orderId !== orderId) throw new Error('Unconfirmed response');
        setReview(result.data.review);
      } else if (response.status === 400) setMessage(reviewFieldRules);
      else if (response.status === 409) setMessage('This order is not collected or already has a review. Refresh to check your order and submitted review.');
      else if (response.status === 401 || response.status === 403) setMessage('Customer access is required. Sign in with the account that owns this order.');
      else if (response.status === 404) setMessage('Requested record not found.');
      else setMessage('Unable to confirm submission. Refresh to check your submitted review before trying again.');
    } catch { setMessage('Unable to confirm submission. Refresh to check your submitted review before trying again.'); }
    finally { sending.current = false; setBusy(false); }
  }
  if (review) return <ReviewDisplay review={review} />;
  return <form onSubmit={submit} noValidate className="space-y-5" aria-busy={busy}>
    <p>Share feedback about your collected purchase. You can submit one review per order; it cannot be edited or deleted afterward.</p>
    <fieldset disabled={busy} className="space-y-5">
      <legend className="sr-only">Review details</legend>
      <div className="space-y-2"><label htmlFor="review-rating" className="block font-semibold">Rating</label>
        <select id="review-rating" value={rating} onChange={event => setRating(event.target.value)} required aria-describedby="review-rules" className="w-full rounded border border-black/25 bg-white p-3 sm:w-48">
          <option value="">Choose a rating</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} out of 5</option>)}
        </select></div>
      <div className="space-y-2"><label htmlFor="review-text" className="block font-semibold">Review text</label>
        <textarea id="review-text" value={text} onChange={event => setText(event.target.value)} required rows={7} aria-describedby="review-rules review-count" className="w-full rounded border border-black/25 p-3" />
        <p id="review-count" className="text-sm">{[...text].length} / 1,000 Unicode code points</p></div>
      <p id="review-rules" className="text-sm">{reviewFieldRules} Valid text is preserved exactly, including whitespace and newlines.</p>
      <button className="rounded bg-black px-5 py-3 font-semibold text-white disabled:opacity-50" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
    </fieldset>
    {message && <div className="space-y-3 rounded-lg border p-4"><p role="alert">{message}</p><button type="button" className="underline" onClick={() => router.refresh()}>Refresh review status</button></div>}
  </form>;
}
