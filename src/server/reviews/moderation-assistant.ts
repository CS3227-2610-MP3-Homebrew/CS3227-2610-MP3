import "server-only";
import { z } from "zod";
import type { VerifiedActor } from "@/server/auth/workspace";
import { getVerifiedActor } from "@/server/auth/session";
import { trustedOrigin } from "@/server/auth/account-adapter";
import { createSessionClient } from "@/server/supabase/session-client";
import { privateResponses, checkOrigin } from "@/server/http/json";
import { readAiRequest, operationFallback } from "@/server/llm/operations";
import { createConfiguredAiState } from "@/server/llm/ai-state-client";
import { queueSize } from "./queue-config";

const sourceRow = z.strictObject({ id: z.string(), text: z.string(), moderation_state: z.enum(["pending", "kept", "hidden"]) });
type Review = z.infer<typeof sourceRow>;
type Input = { reviews: { reviewId: string; text: string }[] };
type Dependencies = {
  origin: string;
  actor: () => Promise<VerifiedActor | null>;
  maxReviews: () => number;
  readReviews: (actor: VerifiedActor, ids: string[]) => Promise<Review[]>;
  run: (actor: VerifiedActor, input: Input, requestId: string, signal: AbortSignal) => Promise<unknown>;
};

/** Trusted server construction only: no dependency or AI context comes from HTTP. */
export function createModerationHandler(deps: Dependencies) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    const { error } = privateResponses(requestId);
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: "POST" });
    const originError = checkOrigin(request.headers.get("origin"), deps.origin, error);
    if (originError) return originError;
    let maxReviews = 20;
    // Invalid AI policy still requires ordinary validation/authorized sources;
    // the shared operation then supplies its fail-closed configuration fallback.
    try { maxReviews = deps.maxReviews(); } catch { /* No AI policy bypass. */ }
    const parsed = await readAiRequest(request, "moderation", { maxReviews, requestId });
    if (!parsed.ok) return parsed.response;
    try {
      const actor = await deps.actor();
      if (!actor) return error(401, "UNAUTHENTICATED", "Sign in to continue.");
      if (actor.role !== "admin") return error(403, "FORBIDDEN", "Admin access required.");
      const { reviewIds } = parsed.data as { reviewIds: string[] };
      let rows: Review[];
      try { rows = sourceRow.array().parse(await deps.readReviews(actor, reviewIds)); }
      catch { return error(503, "SOURCE_UNAVAILABLE", "Unable to load review data. Try again."); }
      const selected = reviewIds.map(id => rows.find(row => row.id === id));
      if (selected.some(row => !row)) return error(404, "NOT_FOUND", "Review not found.");
      if (selected.some(row => row!.moderation_state !== "pending")) return error(400, "INVALID_REQUEST", "The queue changed. Reload before triaging.");
      const input = { reviews: selected.map(row => ({ reviewId: row!.id, text: row!.text })) };
      let result: unknown;
      try { result = await deps.run(actor, input, requestId, request.signal); }
      catch { result = operationFallback("moderation", requestId, "unavailable"); }
      return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
    } catch { return error(503, "SOURCE_UNAVAILABLE", "Unable to load review data. Try again."); }
  };
}

export async function handleModerationAssistant(request: Request) {
  try {
    return await createModerationHandler({
      origin: trustedOrigin(), actor: getVerifiedActor, maxReviews: queueSize,
      async readReviews(_actor, ids) {
        // Ref is opaque at HTTP. Non-UUID refs cannot match this UUID storage;
        // treat them identically to missing records without a database cast error.
        const storedIds = ids.filter(id => z.uuid().safeParse(id).success);
        if (!storedIds.length) return [];
        const client = await createSessionClient({ retry: false });
        // reviews_read independently derives role/workspace from this session.
        // No privileged client, order join, identity or queue display data.
        const response = await client.from("reviews").select("id,text,moderation_state").in("id", storedIds);
        if (response.error) throw new Error("Review source unavailable.");
        return sourceRow.array().parse(response.data);
      },
      async run(actor, input, requestId, signal) {
        return createConfiguredAiState().runOperation({ operationId: crypto.randomUUID(), actorId: actor.id,
          feature: "moderation", scope: { actorId: actor.id }, input }, { requestId, signal });
      },
    })(request);
  } catch { return privateResponses().error(503, "SOURCE_UNAVAILABLE", "Unable to load review data. Try again."); }
}
