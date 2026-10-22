import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfiguration } from "@/server/config";
import { privateResponses } from "@/server/http/json";
import { createAiState } from "@/server/llm/ai-state";
import { createMaintenanceHandler, ensureMainAdmin, ensureShowcase } from "@/server/maintenance";

async function handle(request: Request) {
  // All privileged initialization is lazy and happens only after bearer validation.
  let client: SupabaseClient | undefined;
  const privileged = () => {
    const config = getConfiguration();
    if (!config.supabase.secretKey) throw new Error("Maintenance unavailable.");
    return client ??= createClient(config.public.NEXT_PUBLIC_SUPABASE_URL, config.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, db: { retry: false },
    });
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    if (!["prepare_maintenance", "publish_maintenance", "ai_state"].includes(name)) throw new Error("Maintenance unavailable.");
    const result = await privileged().rpc(name, args);
    return { data: result.data, error: result.error ? { message: "Maintenance unavailable." } : null };
  };
  try {
    return await createMaintenanceHandler({
      secret: process.env.CRON_SECRET,
      cleanup: async () => {
        const state = createAiState({ environment: getConfiguration().environment, rpc,
          admission: { reserve: async () => ({ admitted: false }) }, eligibleCafeIds: async () => [],
        });
        await state.cleanup();
        // T-16 cleanup returns void; count completed invocations, not deleted rows.
        return { outcome: "success", count: 1 };
      },
      ensureMainAdmin: () => ensureMainAdmin({ auth: privileged().auth.admin, rpc, email: process.env.MAIN_ADMIN_EMAIL, password: process.env.MAIN_ADMIN_PASSWORD }),
      ensureShowcase: () => ensureShowcase({ auth: privileged().auth.admin, rpc }),
    })(request);
  } catch { return privateResponses().error(500, "INTERNAL_ERROR", "Maintenance unavailable."); }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
