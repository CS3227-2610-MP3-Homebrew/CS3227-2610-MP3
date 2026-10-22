import Link from 'next/link';
import { connection } from 'next/server';
import { pageParams } from '@/lib/catalogue/query';
import { OrderError } from '@/server/orders/schema';
import { queueQuery, queueViews, type QueueQuery } from '@/server/owner-orders/query';
import { listQueue } from '@/server/owner-orders/source';
import { QueueList } from './queue-list';

const labels: Record<string, string> = { all: 'All', pending: 'New', accepted: 'Accepted', ready: 'Ready for pick up', collected: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const href = (query: Partial<QueueQuery>) => `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  let query: QueueQuery; let result;
  try { query = queueQuery(pageParams(await searchParams)); result = await listQueue(query); }
  catch (error) {
    return <section className="space-y-4"><h1 className="text-3xl font-semibold">Order queue</h1>
      <p role="alert">{error instanceof OrderError && error.code === 'INVALID_REQUEST' ? 'Invalid queue selection.' : 'Order queue is temporarily unavailable. Try again.'}</p></section>;
  }
  if (!result.hasCafe) return <section className="space-y-4"><h1 className="text-3xl font-semibold">Order queue</h1>
    <p>You do not have a café yet, so there are no orders to manage.</p>
    <Link className="inline-block rounded border px-4 py-2 underline" href="/owner/application">Apply for a café</Link></section>;
  return <section className="space-y-6"><header><h1 className="text-3xl font-semibold">Order queue</h1><p className="mt-2">Pre-orders for pickup. Customers pay at the counter. Times are shown in Singapore (SGT).</p></header>
    <nav aria-label="Queue views" className="flex flex-wrap gap-4">{(['active', 'history'] as const).map(view => <Link key={view} aria-current={query.view === view ? 'page' : undefined} className="underline aria-[current=page]:font-semibold" href={href({ view })}>{view === 'active' ? 'Active' : 'History'}</Link>)}</nav>
    <nav aria-label="Order state filters" className="flex flex-wrap gap-4">{queueViews[query.view].map(filter => <Link key={filter} aria-current={query.filter === filter ? 'page' : undefined} className="underline aria-[current=page]:font-semibold" href={href({ view: query.view, filter })}>{filter === 'all' && query.view === 'history' ? 'All history' : filter === 'all' ? 'Active' : labels[filter]}</Link>)}</nav>
    <QueueList key={`${query.view}-${query.filter}-${query.page}`} initialOrders={result.items} active={query.view === 'active'} />
    <nav aria-label="Queue pages" className="flex gap-5">{query.page > 1 && <Link className="underline" href={href({ ...query, page: query.page - 1 })}>Previous orders</Link>}{result.hasNextPage && <Link className="underline" href={href({ ...query, page: query.page + 1 })}>Next orders</Link>}</nav>
  </section>;
}
