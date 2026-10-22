import Link from 'next/link';
import { notFound } from 'next/navigation';
import { customerAccess } from '../../access';
import { readCafe } from '@/server/catalogue/source';
import { CatalogueError } from '@/server/catalogue/query';
import { readPickupSlots } from '@/server/orders/source';
import { OrderError, ref } from '@/server/orders/schema';
import { OrderForm } from './order-form';

export default async function Page({ params }: { params: Promise<{ cafeId: string }> }) {
  const access = await customerAccess(); if (access) return access;
  const { cafeId } = await params;
  if (!ref.safeParse(cafeId).success) notFound();
  let result;
  try {
    const [source, slots] = await Promise.all([readCafe(cafeId), readPickupSlots(cafeId)]);
    result = { cafe: source.cafe, slots };
  } catch (error) {
    if ((error instanceof OrderError || error instanceof CatalogueError) && error.code === 'NOT_FOUND') notFound();
    return <p role="alert">Pre-order information is temporarily unavailable. Try again.</p>;
  }
  return <article className="space-y-6"><Link className="underline" href={`/customer/cafes/${encodeURIComponent(cafeId)}`}>Back to café</Link>
    <header><h1 className="text-3xl font-semibold">Pre-order at {result.cafe.name}</h1><p className="mt-2">Choose your drinks and a pickup time in Singapore.</p></header>
    <OrderForm cafeId={cafeId} menu={result.cafe.menu} slots={result.slots} />
  </article>;
}
