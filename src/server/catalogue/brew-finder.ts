import 'server-only';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getVerifiedActor } from '@/server/auth/session';
import { trustedOrigin } from '@/server/http/origin';
import { checkOrigin, privateResponses } from '@/server/http/json';
import { createConfiguredAiState } from '@/server/llm/ai-state-client';
import { brewSourceRevision } from '@/server/llm/cache-identity';
import { readAiRequest, operationFallback, type Result } from '@/server/llm/operations';
import { filters, validateResult } from '@/server/llm/schemas';
import { nextStateChangeAt, openingState } from '@/lib/catalogue/clock';
import { compareReferences, readCatalogueSource, selectCatalogueCafes, type CatalogueSource } from './source';

type BrewFilters = z.infer<typeof filters>;
type AiResult = Extract<Result, { mode: 'ai' }>;
/** Only the session-RLS source enters this adapter. No HTTP-supplied records. */
export function brewSource(source: CatalogueSource, selectedFilters: BrewFilters) {
  const selected = selectCatalogueCafes(source, { timeMode: selectedFilters.timeMode,
    at: selectedFilters.at ?? undefined, area: selectedFilters.area ?? undefined, drinkType: selectedFilters.drinkType ?? undefined });
  const candidates = selected.map(c => ({ cafeId: c.cafeId, name: c.name, area: c.area,
    items: c.menu.filter(m => !m.soldOut && (!selectedFilters.drinkType || m.drinkType === selectedFilters.drinkType))
      .sort((a,b) => compareReferences(a.name,b.name) || compareReferences(a.itemId,b.itemId)).slice(0,20)
      .map(m => ({ itemId: m.itemId, name: m.name, drinkType: m.drinkType })) }))
    .filter(c => c.items.length > 0).slice(0,20);
  return {
    catalogue: source.cafes.map(c => ({ cafeId: c.cafeId, name: c.name, area: c.area, eligible: true,
      weeklyIntervals: c.openingHours.toSorted((a,b) => a.weekday-b.weekday || compareReferences(a.opensAt,b.opensAt) || compareReferences(a.closesAt,b.closesAt)),
      openNow: openingState(c.openingHours, source.now).isOpen, nextStateChangeAt: nextStateChangeAt(c.openingHours, source.now),
      ratingSum: c.reviews.reduce((sum,r) => sum+r.rating,0), ratingCount: c.reviews.length,
      items: c.menu.map(m => ({ itemId: m.itemId, name: m.name, drinkType: m.drinkType, soldOut: m.soldOut })) })),
    candidates, candidateOrder: candidates.map(c => c.cafeId),
    itemOrders: candidates.map(c => ({ cafeId: c.cafeId, itemIds: c.items.map(m => m.itemId) })),
  };
}

export async function handleBrewFinder(request: Request) {
  const requestId = randomUUID();
  const { error } = privateResponses(requestId);
  const unavailable = () => operationFallback('brew_finder', requestId, 'unavailable');
  const sourceError = () => error(503, 'SOURCE_UNAVAILABLE', 'Cafés are temporarily unavailable. Try again.');
  if (request.method !== 'POST') return error(405, 'METHOD_NOT_ALLOWED', 'Use POST for this operation.', { Allow: 'POST' });
  try {
    const originError = checkOrigin(request.headers.get('origin'), trustedOrigin(), error);
    if (originError) return originError;
    const parsed = await readAiRequest(request, 'brew_finder', { maxReviews: 20, requestId });
    if (!parsed.ok) return parsed.response;
    const actor = await getVerifiedActor();
    if (!actor) return error(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    if (actor.role !== 'customer') return error(403, 'FORBIDDEN', 'Customer access required.');
    const input = parsed.data as { query: string; filters: BrewFilters };
    const source = await readCatalogueSource();
    const initialSource = brewSource(source,input.filters);
    let sourceUnavailable = false;
    const revalidate = async (result: AiResult) => {
      const currentActor = await getVerifiedActor();
      if (!currentActor || currentActor.role !== 'customer' || currentActor.id !== actor.id || currentActor.workspaceId !== actor.workspaceId) throw new Error('Advice unavailable.');
      let current: CatalogueSource;
      try { current = await readCatalogueSource(); }
      catch { sourceUnavailable = true; throw new Error('Advice unavailable.'); }
      if (result.feature !== 'brew_finder') throw new Error('Advice unavailable.');
      const currentSource = brewSource(current,input.filters);
      if (result.source === 'cache' && brewSourceRevision(currentSource) !== brewSourceRevision(initialSource)) throw new Error('Advice unavailable.');
      validateResult('brew_finder', result.data, { query: input.query, candidates: currentSource.candidates }, result.source === 'cache');
    };
    let result: Result;
    try {
      result = await createConfiguredAiState().runOperation({ operationId: randomUUID(), actorId: actor.id,
        feature: 'brew_finder', scope: { actorId: actor.id }, input, source: initialSource },
      { requestId, signal: request.signal, revalidate });
      // Also guard the final HTTP delivery, including alternative operation seams.
      if (result.mode === 'ai') await revalidate(result);
    } catch { result = unavailable(); }
    if (sourceUnavailable) return sourceError();
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    // Authentication/source infrastructure failures never become an empty source.
    return sourceError();
  }
}
