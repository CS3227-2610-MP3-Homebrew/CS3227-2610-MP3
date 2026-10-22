import 'server-only';
import type { VerifiedActor } from '@/server/auth/workspace';
import { getConfiguration } from '@/server/config';
import { getVerifiedActor } from '@/server/auth/session';
import { trustedOrigin } from '@/server/auth/account-adapter';
import { privateResponses, checkOrigin } from '@/server/http/json';
import { readAiRequest, operationFallback } from '@/server/llm/operations';
import { createConfiguredAiState } from '@/server/llm/ai-state-client';
import type { PrepInput } from '@/server/llm/schemas';
import { readPrepSource } from './sales';

type Source = { found: false } | { found: true; input: PrepInput | null };
type Dependencies = {
  origin: string;
  actor: () => Promise<VerifiedActor | null>;
  readSource: (actor: VerifiedActor, cafeId: string) => Promise<Source>;
  run: (actor: VerifiedActor, context: { cafeId: string; input: PrepInput; refresh: boolean }, requestId: string, signal: AbortSignal) => Promise<unknown>;
  /** Disabled AI outranks insufficient source, as in the shared operation. */
  aiEnabled?: () => boolean;
};

/** Trusted server construction only: no dependency or AI context comes from HTTP. */
export function createPrepHandler(deps: Dependencies) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    const { error, json } = privateResponses(requestId);
    if (request.method !== 'POST') return error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: 'POST' });
    const originError = checkOrigin(request.headers.get('origin'), deps.origin, error);
    if (originError) return originError;
    const parsed = await readAiRequest(request, 'prep_advisor', { maxReviews: 0, requestId });
    if (!parsed.ok) return parsed.response;
    const { cafeId, refresh } = parsed.data as { cafeId: string; refresh: boolean };
    try {
      const actor = await deps.actor();
      if (!actor) return error(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      if (actor.role !== 'owner') return error(403, 'FORBIDDEN', 'Café owner access required.');
      let source: Source;
      try { source = await deps.readSource(actor, cafeId); }
      catch { return error(503, 'SOURCE_UNAVAILABLE', 'Sales are temporarily unavailable. Try again.'); }
      if (!source.found) return error(404, 'NOT_FOUND', 'Requested record not found.');
      if (!source.input) {
        let enabled = false;
        try { enabled = deps.aiEnabled?.() ?? true; } catch { /* Invalid configuration never authorizes AI. */ }
        return json(operationFallback('prep_advisor', requestId, enabled ? 'no_source_data' : 'disabled'));
      }
      let result: unknown;
      try { result = await deps.run(actor, { cafeId, input: source.input, refresh }, requestId, request.signal); }
      catch { result = operationFallback('prep_advisor', requestId, 'unavailable'); }
      return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch { return error(503, 'SOURCE_UNAVAILABLE', 'Sales are temporarily unavailable. Try again.'); }
  };
}

export async function handlePrepAdvisor(request: Request) {
  try {
    return await createPrepHandler({
      origin: trustedOrigin(), actor: getVerifiedActor, aiEnabled: () => getConfiguration().ai.enabled,
      readSource: (_actor, cafeId) => readPrepSource(cafeId),
      async run(actor, { cafeId, input, refresh }, requestId, signal) {
        // The café/date scope binds cache identity; the source snapshot is the only provider context.
        const scope = { cafeId, businessDate: input.businessDate };
        return createConfiguredAiState().runOperation({ operationId: crypto.randomUUID(), actorId: actor.id, cafeId,
          feature: 'prep_advisor', scope, input: scope, source: input }, { requestId, signal, refresh });
      },
    })(request);
  } catch { return privateResponses().error(503, 'SOURCE_UNAVAILABLE', 'Sales are temporarily unavailable. Try again.'); }
}
