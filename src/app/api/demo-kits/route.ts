import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfiguration } from "@/server/config";
import { trustedOrigin } from "@/server/http/origin";
import { privateResponses } from "@/server/http/json";
import { createDemoKitAdmission, createDemoKitHandler, provisionDemoKit } from "@/server/demo-kits";

async function handle(request: Request) {
  try {
    const configuration = getConfiguration();
    // SDK creation is lazy so rejected transport requests never initialize privileged access.
    let client: SupabaseClient | undefined;
    const privileged = () => {
      if (!configuration.supabase.secretKey) throw new Error("Provisioning unavailable.");
      return client ??= createClient(configuration.public.NEXT_PUBLIC_SUPABASE_URL, configuration.supabase.secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, db: { retry: false } });
    };
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const result = await privileged().rpc(name, args); return { data: result.data, error: result.error };
    };
    const local = ["local", "ci"].includes(configuration.environment);
    const configuredCap = (name: string, fallback: number) => {
      const value = process.env[name];
      return value === undefined && local ? fallback : value !== undefined && /^\d+$/.test(value) ? Number(value) : NaN;
    };
    return createDemoKitHandler({ trustedOrigin: trustedOrigin(),
      admission: createDemoKitAdmission({ environment: configuration.environment, rpc, limits: { perTenMinutes: configuredCap("DEMO_KITS_PER_10_MINUTES", 5), perDay: configuredCap("DEMO_KITS_PER_DAY", 30) } }),
      createKit: () => provisionDemoKit({ auth: privileged().auth.admin, rpc }),
    })(request);
  } catch { return privateResponses().error(503, "SOURCE_UNAVAILABLE", "Demo kit service is temporarily unavailable. Try again."); }
}
export { handle as POST, handle as GET, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
