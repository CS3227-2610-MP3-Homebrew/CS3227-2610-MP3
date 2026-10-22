import { OrderError } from '@/server/orders/schema';

export const queueViews = { active: ['all', 'pending', 'accepted', 'ready'], history: ['all', 'cancelled', 'rejected', 'collected'] } as const;
export type QueueView = keyof typeof queueViews;
export type QueueQuery = { view: QueueView; filter: string; page: number };

/** Strict owner queue query: view/filter/page at most once, exact enum spelling. */
export function queueQuery(params: URLSearchParams): QueueQuery {
  const seen = new Set<string>();
  const query: QueueQuery = { view: 'active', filter: 'all', page: 1 };
  for (const [key, value] of params) {
    if (seen.has(key)) throw new OrderError('INVALID_REQUEST');
    seen.add(key);
    if (key === 'view' && (value === 'active' || value === 'history')) query.view = value;
    else if (key === 'filter') query.filter = value;
    else if (key === 'page' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) query.page = Number(value);
    else throw new OrderError('INVALID_REQUEST');
  }
  if (!(queueViews[query.view] as readonly string[]).includes(query.filter)) throw new OrderError('INVALID_REQUEST');
  return query;
}

export const queueQueryInvalidHeader = 'x-homebrew-owner-queue-query-invalid';
/** Next can normalize duplicate query keys. Validate the original URL in the
 * proxy, overwrite caller assertions, then validate again in the handler. */
export function markQueueQuery(request: Request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || !/^\/api\/owner\/orders\/?$/.test(url.pathname)) return;
  request.headers.delete(queueQueryInvalidHeader);
  let invalid = false;
  try { queueQuery(url.searchParams); }
  catch { invalid = true; }
  request.headers.set(queueQueryInvalidHeader, invalid ? '1' : '0');
}
