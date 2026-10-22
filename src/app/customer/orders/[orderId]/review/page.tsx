import Link from 'next/link';
import { notFound } from 'next/navigation';
import { customerAccess } from '../../../cafes/access';
import { readOrder } from '@/server/orders/source';
import { OrderError } from '@/server/orders/schema';
import { readOwnReview } from '@/server/reviews/customer-source';
import { ReviewError, reviewRef, type OwnReview } from '@/server/reviews/customer-schema';
import { singaporeTime } from '../../presentation';
import { ReviewForm } from './review-form';
import { ReviewDisplay } from './review-display';

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const access = await customerAccess(); if (access) return access;
  const { orderId } = await params;
  if (!reviewRef.safeParse(orderId).success) notFound();
  let order; let review: OwnReview | null = null;
  try {
    order = await readOrder(orderId);
    try { review = await readOwnReview(orderId); }
    catch (error) { if (!(error instanceof ReviewError) || error.code !== 'NOT_FOUND') throw error; }
  } catch (error) {
    if ((error instanceof OrderError || error instanceof ReviewError) && error.code === 'NOT_FOUND') notFound();
    return <p role="alert">Review information is temporarily unavailable. Try again.</p>;
  }
  return <article className="space-y-6"><Link href="/customer/orders" className="underline">Back to My orders</Link>
    <header className="space-y-2"><h1 className="text-3xl font-semibold">Review your order</h1>
      <p className="text-xl">{order.cafeName}</p><p className="break-all text-sm">Order {order.orderId}</p>
      <p className="capitalize">{order.state}</p>{order.collectedAt && <p className="text-sm">Collected {singaporeTime(order.collectedAt)}</p>}</header>
    {review ? <ReviewDisplay review={review} /> : order.state === 'collected' ? <ReviewForm orderId={orderId} /> : <p>This order must be collected before you can submit a review.</p>}
  </article>;
}
