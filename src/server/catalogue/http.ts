import 'server-only';
import { getVerifiedActor } from '@/server/auth/session';
import { CatalogueError, parseQuery } from './query';
import { paginate, readCafe, readCatalogue } from './source';
import { catalogueQueryInvalidHeader } from './proxy-query';
const statuses = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SOURCE_UNAVAILABLE: 503 };
const messages = { INVALID_REQUEST: 'Check the request and try again.', UNAUTHENTICATED: 'Sign in to continue.', FORBIDDEN: 'Customer access required.', NOT_FOUND: 'Café not found.', SOURCE_UNAVAILABLE: 'Cafés are temporarily unavailable. Try again.' };
export async function catalogueGet(request: Request, mode: 'browse' | 'detail' | 'reviews', cafeId?: string) {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const actor = await getVerifiedActor();
    if (!actor) throw new CatalogueError('UNAUTHENTICATED');
    if (actor.role !== 'customer') throw new CatalogueError('FORBIDDEN');
    // Proxy overwrites this flag from the original query on every catalogue GET.
    // Keep authorization before the safe malformed-query response.
    if (request.headers.get(catalogueQueryInvalidHeader) === '1') throw new CatalogueError('INVALID_REQUEST');
    const params = new URL(request.url).searchParams;
    if (mode === 'browse') return Response.json({ requestId, ...await readCatalogue(parseQuery(params, 'browse')) }, { headers });
    const query = parseQuery(params, mode);
    // References are opaque. Invalid/missing database references share the same
    // scope-safe NOT_FOUND boundary; no UUID parser leaks database diagnostics.
    if (!cafeId || Array.from(cafeId).length > 128) throw new CatalogueError('NOT_FOUND');
    const result = await readCafe(cafeId);
    return Response.json(mode === 'detail' ? { requestId, cafe: result.cafe } : { requestId, ...paginate(result.reviews, query.page) }, { headers });
  } catch (error) {
    const code = error instanceof CatalogueError ? error.code : 'SOURCE_UNAVAILABLE';
    return Response.json({ requestId, error: { code, message: messages[code] } }, { status: statuses[code], headers });
  }
}

/** Unsupported mutation methods never read a body, actor or domain record. */
export function catalogueMethodNotAllowed() {
  return Response.json({ requestId: crypto.randomUUID(), error: {
    code: 'METHOD_NOT_ALLOWED', message: 'Use GET to read café information.',
  } }, { status: 405, headers: { 'Cache-Control': 'private, no-store', Allow: 'GET, HEAD, OPTIONS' } });
}
