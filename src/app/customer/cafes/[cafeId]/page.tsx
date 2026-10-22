import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readCafe, paginate } from '@/server/catalogue/source';
import { CatalogueError, pageParams, parseQuery } from '@/server/catalogue/query';
import { customerAccess } from '../access';
type Props = { params: Promise<{ cafeId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default async function Page({ params, searchParams }: Props) {
  const access = await customerAccess(); if (access) return access;
  const { cafeId } = await params;
  let result, page;
  try {
    page = parseQuery(pageParams(await searchParams), 'reviews').page;
    result = await readCafe(cafeId);
  } catch (error) {
    if (error instanceof CatalogueError && error.code === 'NOT_FOUND') notFound();
    return <p role="alert">{error instanceof CatalogueError && error.code === 'INVALID_REQUEST' ? 'Invalid review page.' : 'Café information is temporarily unavailable. Try again.'}</p>;
  }
  const { cafe, reviews } = result;
  const reviewPage = paginate(reviews,page);
  return <article className="space-y-6"><Link href="/customer/cafes" className="underline">Browse cafés</Link>
    <header><h1 className="text-3xl font-semibold">{cafe.name}</h1><p>{cafe.area}</p><p className="mt-3">{cafe.description}</p><p className="mt-3">Pickup: {cafe.pickupAddress}</p><p className="mt-3">{cafe.rating.average === null ? 'No reviews yet' : `${cafe.rating.average.toFixed(1)} · ${cafe.rating.visibleReviewCount} reviews`}</p></header>
    <section><h2 className="text-xl font-semibold">Menu</h2>{cafe.menu.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-2">{cafe.menu.map(item=><li key={item.itemId} className="rounded-lg border border-black/15 p-4"><h3 className="font-semibold">{item.name}</h3><p>{item.drinkType}</p><p>{`S$${(item.priceCents/100).toFixed(2)}`}</p>{item.soldOut && <p className="font-semibold">Sold out</p>}</li>)}</ul> : <p>No menu items available.</p>}</section>
    <section><h2 className="text-xl font-semibold">Opening hours (SGT)</h2>{cafe.openingHours.length ? <ul className="mt-3 space-y-2">{cafe.openingHours.map((hours,index)=><li key={index}>{weekdays[hours.weekday-1]}: {hours.opensAt}–{hours.closesAt}{hours.closesNextDay ? ' (next day)' : ''} SGT</li>)}</ul> : <p>No opening hours scheduled</p>}</section>
    <section><h2 className="text-xl font-semibold">Reviews</h2>{reviewPage.items.length ? <ul className="mt-3 space-y-4">{reviewPage.items.map(review=><li key={review.reviewId} className="rounded-lg border border-black/15 p-4"><p className="font-semibold">{review.authorLabel} · {review.rating}/5</p><p className="whitespace-pre-wrap">{review.text}</p><time dateTime={review.submittedAt}>{new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(review.submittedAt))} SGT</time></li>)}</ul> : <p>No reviews yet</p>}<nav aria-label="Review pages" className="mt-4 flex gap-5">{page>1 && <Link href={`?page=${page-1}`}>Previous reviews</Link>}{reviewPage.hasNextPage && <Link href={`?page=${page+1}`}>Next reviews</Link>}</nav></section>
  </article>;
}
