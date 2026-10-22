import Link from 'next/link';
import { customerAccess } from '../cafes/access';
import { pageParams } from '@/server/catalogue/query';
import { customerOrdersPage } from '@/server/orders/query';
import { OrderError } from '@/server/orders/schema';
import { listOrders } from '@/server/orders/source';
import { CustomerOrders } from './customer-orders';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await customerAccess(); if (access) return access;
  let result, view;
  try { const query = customerOrdersPage(pageParams(await searchParams)); view = query.view; result = await listOrders(query.page, view); }
  catch (error) {
    return <p role="alert">{error instanceof OrderError && error.code === 'INVALID_REQUEST' ? 'Invalid orders page.' : 'Order information is temporarily unavailable. Try again.'}</p>;
  }
  return <section className="space-y-6"><header><h1 className="text-3xl font-semibold">My orders</h1><p className="mt-2">Your pickup plans and purchase history. Times are shown in Singapore (SGT).</p></header>
    <nav aria-label="Order filters" className="flex flex-wrap gap-4">{([['all', 'All'], ['active', 'Active orders'], ['past', 'Past orders']] as const).map(([value, label]) => <Link key={value} href={`?view=${value}`} aria-current={view === value ? 'page' : undefined}>{label}</Link>)}</nav>
    <CustomerOrders key={`${view}:${result.page}`} initialOrders={result.items} view={view} />
    <nav aria-label="Order pages" className="flex gap-5">{result.page > 1 && <Link className="underline" href={`?view=${view}&page=${result.page - 1}`}>Previous orders</Link>}{result.hasNextPage && <Link className="underline" href={`?view=${view}&page=${result.page + 1}`}>Next orders</Link>}</nav>
  </section>;
}
