import "server-only";
import { getConfiguration } from "@/server/config";
import { getVerifiedActor } from "@/server/auth/session";
import { createSessionClient } from "@/server/supabase/session-client";
import { z } from "zod";
import { createAiState } from "./ai-state";
import { createAiAudit } from "./ai-audit";
import { createUsageRpc } from "./usage-client";
import { createUsageAdmission, parseUsageLimits } from "./usage";

/** Production composition retains session RLS for eligibility; the infrastructure
 * RPC independently checks the protected role/workspace/ownership records. */
export function createConfiguredAiState() {
  const configuration = getConfiguration();
  const rpc = createUsageRpc();
  return createAiState({
    environment: configuration.environment, rpc,
    admission: createUsageAdmission({ environment: configuration.environment, rpc, limits: parseUsageLimits(process.env), throwOnUnavailable: true }),
    enabled: () => getConfiguration().ai.enabled,
    eligibleCafeIds: async actorId => {
      const actor = await getVerifiedActor();
      if (!actor || actor.id !== actorId) throw new Error("AI eligibility unavailable.");
      const client = await createSessionClient();
      const response = await client.from("cafes").select("id").eq("workspace_id", actor.workspaceId).eq("application_state", "approved").eq("suspended", false);
      const parsed = z.array(z.object({ id: z.uuid() }).strict()).safeParse(response.data);
      if (response.error || !parsed.success) throw new Error("AI eligibility unavailable.");
      return parsed.data.map(c => c.id);
    },
  });
}

/** No result cache is created for Moderation Assistant. */
export function createConfiguredAiAudit() {
  return createAiAudit({ environment: getConfiguration().environment, rpc: createUsageRpc() });
}
