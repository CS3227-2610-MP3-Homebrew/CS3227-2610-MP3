import { OrderError } from './schema';

export function orderPage(params: URLSearchParams, collection: boolean): number {
  let page = 1;
  let seen = false;
  for (const [key, value] of params) {
    if (!collection || key !== 'page' || seen || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new OrderError('INVALID_REQUEST');
    seen = true; page = Number(value);
  }
  return page;
}

export const orderQueryInvalidHeader = 'x-homebrew-order-query-invalid';
/** Next can normalize duplicate/reserved query keys. Validate the original URL,
 * overwrite caller assertions, then validate again in each authorized handler. */
export function markOrderQuery(request: Request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || !/^\/api\/customer\/(?:orders(?:\/[^/]+)?|cafes\/[^/]+\/pickup-slots)\/?$/.test(url.pathname)) return;
  request.headers.delete(orderQueryInvalidHeader);
  let invalid = false;
  try { orderPage(url.searchParams, url.pathname.replace(/\/$/, '') === '/api/customer/orders'); }
  catch { invalid = true; }
  request.headers.set(orderQueryInvalidHeader, invalid ? '1' : '0');
}
