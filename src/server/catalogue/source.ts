import 'server-only';
import { z } from 'zod';
import { createSessionClient } from '@/server/supabase/session-client';
import { openingState } from './clock';
import { areas, CatalogueError, drinkTypes, type CatalogueQuery } from './query';
const hours = z.object({ weekday: z.number().int().min(1).max(7), opensAt: z.string(), closesAt: z.string(), closesNextDay: z.boolean() });
// PostgreSQL timestamptz retains microseconds. Convert only the whole-second
// timezone component through Date; copy the original fraction without rounding.
// Fixed six-digit UTC fractions then compare chronologically as plain strings.
const reviewInstant = z.iso.datetime({ offset: true }).transform(value => {
  const fraction = /\.(\d+)/.exec(value)?.[1] ?? '';
  const wholeSecond = value.replace(/\.\d+(?=Z|[+-])/, '');
  const utcSecond = new Date(wholeSecond).toISOString().replace('.000Z', '');
  return `${utcSecond}.${fraction.padEnd(6, '0')}Z`;
});
const review = z.object({ reviewId: z.string(), rating: z.number().int().min(1).max(5), text: z.string(), submittedAt: reviewInstant, authorLabel: z.literal('Verified customer') });
const cafe = z.object({
  cafeId: z.string(), name: z.string(), description: z.string(), area: z.enum(areas), pickupAddress: z.string(),
  openingHours: z.array(hours),
  menu: z.array(z.object({ itemId: z.string(), name: z.string(), drinkType: z.enum(drinkTypes), priceCents: z.number().int().min(1).max(1000000), soldOut: z.boolean() })),
  reviews: z.array(review),
});
const snapshot = z.object({ now: z.string(), cafes: z.array(cafe) });
type SourceCafe = z.infer<typeof cafe>;
export type PublicReview = z.infer<typeof review>;
export type RatingSummary = { average: number | null; visibleReviewCount: number };
export type CafeCardData = Pick<SourceCafe, 'cafeId' | 'name' | 'area'> & ReturnType<typeof openingState> & { rating: RatingSummary };
// Unicode code point comparison, independent of host language/locale collation.
export function compareReferences(a: string, b: string): number {
  const left = Array.from(a, c => c.codePointAt(0)!); const right = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
}
const sum = (c: SourceCafe) => c.reviews.reduce((total, r) => total + r.rating, 0);
export function ratingSummary(c: SourceCafe): RatingSummary {
  const count = c.reviews.length;
  return { average: count ? Math.floor((sum(c) * 20 + count) / (2 * count)) / 10 : null, visibleReviewCount: count };
}
/** Canonical exact-ratio order shared by browse and later ordinary Brew fallback. */
export function compareCafeRatings(a: SourceCafe, b: SourceCafe) {
  const ac = a.reviews.length, bc = b.reviews.length;
  if (!ac || !bc) return bc - ac || compareReferences(a.cafeId, b.cafeId);
  // Integer cross multiplication avoids ranking by rounded display values.
  return sum(b) * ac - sum(a) * bc || bc - ac || compareReferences(a.cafeId, b.cafeId);
}
export async function readCatalogueSource() {
  try {
    const client = await createSessionClient({ retry: false });
    const { data, error } = await client.rpc('customer_catalogue_source');
    if (error) throw new Error('Source unavailable');
    const parsed = snapshot.parse(data);
    return parsed;
  } catch { throw new CatalogueError('SOURCE_UNAVAILABLE'); }
}
export function paginate<T>(items: T[], page: number) {
  const offset = (page - 1) * 20;
  return { items: items.slice(offset, offset + 20), page, pageSize: 20 as const, hasNextPage: offset + 20 < items.length };
}
export async function readCatalogue(query: CatalogueQuery) {
  const source = await readCatalogueSource();
  const selected = source.cafes.filter(c =>
    (!query.area || c.area === query.area) &&
    (!query.drinkType || c.menu.some(m => m.drinkType === query.drinkType)) &&
    (query.timeMode === 'all' || openingState(c.openingHours, query.timeMode === 'at' ? query.at! : source.now).isOpen)
  ).sort(compareCafeRatings).map(c => ({ cafeId: c.cafeId, name: c.name, area: c.area,
    rating: ratingSummary(c), ...openingState(c.openingHours, source.now) }));
  return paginate(selected, query.page);
}
export async function readCafe(cafeId: string) {
  const source = await readCatalogueSource();
  const selected = source.cafes.find(c => c.cafeId === cafeId);
  if (!selected) throw new CatalogueError('NOT_FOUND');
  const { reviews, ...publicCafe } = selected;
  return {
    cafe: { ...publicCafe, rating: ratingSummary(selected),
      openingHours: selected.openingHours.toSorted((a,b) => a.weekday-b.weekday || compareReferences(a.opensAt,b.opensAt)),
      menu: selected.menu.toSorted((a,b) => compareReferences(a.name,b.name) || compareReferences(a.itemId,b.itemId)),
    },
    reviews: reviews.toSorted((a,b) => compareReferences(b.submittedAt,a.submittedAt) || compareReferences(a.reviewId,b.reviewId)),
  };
}
