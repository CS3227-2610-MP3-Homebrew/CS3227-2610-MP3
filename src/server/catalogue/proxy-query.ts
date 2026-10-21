import 'server-only';
import { parseQuery } from './query';

export const catalogueQueryInvalidHeader = 'x-homebrew-catalogue-query-invalid';

/** Preserve validation before Next reconstructs route URLs from parsed objects. */
export function markCatalogueQuery(request: Request) {
  const url = new URL(request.url);
  const match = /^\/api\/customer\/cafes(?:\/[^/]+(\/reviews)?)?\/?$/.exec(url.pathname);
  if (request.method !== 'GET' || !match) return;

  // Never retain a caller's result or original-URL assertion. This flag carries
  // only our own raw-query validation; routes still authorize independently.
  request.headers.delete(catalogueQueryInvalidHeader);
  let invalid = false;
  try {
    if (url.pathname.replace(/\/$/, '') === '/api/customer/cafes') parseQuery(url.searchParams, 'browse');
    else parseQuery(url.searchParams, match[1] ? 'reviews' : 'detail');
  } catch { invalid = true; }
  request.headers.set(catalogueQueryInvalidHeader, invalid ? '1' : '0');
}
