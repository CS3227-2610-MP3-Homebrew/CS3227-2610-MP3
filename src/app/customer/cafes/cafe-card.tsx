import Link from 'next/link';
import type { CafeCardData } from '@/server/catalogue/source';
import theme from '@/app/_components/homey-theme.module.css';
function openingLabel(instant: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod')?.toUpperCase()} SGT`;
}
export default function CafeCard({ cafe }: { cafe: CafeCardData }) {
  return <Link href={`/customer/cafes/${encodeURIComponent(cafe.cafeId)}`} prefetch={false} className={`${theme.cafeCard} flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 ${cafe.isOpen ? '' : theme.closed}`}>
    <h2 className="text-xl font-semibold">{cafe.name}</h2><p>{cafe.area}</p>
    <p className="mt-3">{cafe.rating.average === null ? 'No reviews yet' : `${cafe.rating.average.toFixed(1)} · ${cafe.rating.visibleReviewCount} reviews`}</p>
    <p className={`${theme.availability} mt-auto pt-4 text-sm`}>{cafe.isOpen ? (cafe.closingSoon ? 'closing soon' : 'Open now') : cafe.nextOpeningAt ? `Cafe opens at ${openingLabel(cafe.nextOpeningAt)}` : 'No opening hours scheduled'}</p>
  </Link>;
}
