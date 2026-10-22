import { notFound } from 'next/navigation';
import { readCafe } from '@/server/catalogue/source';
import { CatalogueError, pageParams, parseQuery } from '@/server/catalogue/query';
import { customerAccess } from '../../access';
import { money } from '@/app/customer/orders/presentation';
import { CafeActions } from '../cafe-actions';
import theme from '@/app/_components/homey-theme.module.css';

type Props = { params: Promise<{ cafeId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function Page({ params, searchParams }: Props) {
  const access = await customerAccess(); if (access) return access;
  const { cafeId } = await params;
  let cafe;
  try {
    parseQuery(pageParams(await searchParams), 'detail');
    cafe = (await readCafe(cafeId)).cafe;
  } catch (error) {
    if (error instanceof CatalogueError && error.code === 'NOT_FOUND') notFound();
    return <p role="alert">{error instanceof CatalogueError && error.code === 'INVALID_REQUEST' ? 'Invalid menu page.' : 'Menu information is temporarily unavailable. Try again.'}</p>;
  }
  return <article className="space-y-6">
    <CafeActions cafeId={cafeId} screen="menu" />
    <header><h1 className="text-3xl font-semibold">Menu at {cafe.name}</h1><p className="mt-2">Choose your drinks. Payment is at pickup.</p></header>
    {cafe.menu.length ? <ul className="grid gap-3 sm:grid-cols-2">{cafe.menu.map(item =>
      <li key={item.itemId} className={`rounded-lg border border-black/15 p-4 ${item.soldOut ? theme.soldOut : ''}`}>
        <h2 className="text-xl font-semibold">{item.name}</h2><p>{item.drinkType}</p><p>{money(item.priceCents)}</p>
        {item.soldOut && <p className="font-semibold">Sold out</p>}
      </li>
    )}</ul> : <p>No menu items available.</p>}
  </article>;
}
