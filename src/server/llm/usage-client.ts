import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getConfiguration } from "@/server/config";
import { createUsageAdmission, parseUsageLimits, type UsageRpc } from "./usage";

/** AI infrastructure only. Never use this client for ordinary user queries. */
export function createUsageRpc(): UsageRpc {
  const configuration = getConfiguration();
  const key = configuration.supabase.secretKey;
  if (!key?.trim()) throw new Error("Usage admission unavailable.");
  const client = createClient(configuration.public.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public", retry: false },
  });
  return async (fn, args) => {
    // Limit this privileged adapter to the single infrastructure operation.
    if (fn !== "reserve_ai_usage") return { data: null, error: { message: "Usage operation unavailable." } };
    const { data, error } = await client.rpc(fn, args);
    return { data, error: error ? { message: "Usage admission unavailable." } : null };
  };
}

/** Lazy production composition: no browser-supplied policy, scope or clock. */
export function createConfiguredUsageAdmission() {
  const configuration = getConfiguration();
  return createUsageAdmission({
    environment: configuration.environment,
    limits: parseUsageLimits(process.env),
    rpc: createUsageRpc(),
  });
}
