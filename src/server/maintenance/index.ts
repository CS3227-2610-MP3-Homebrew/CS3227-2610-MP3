import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { privateResponses } from "@/server/http/json";

type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
type ProvisionOptions = { auth: Pick<SupabaseClient["auth"]["admin"], "createUser">; rpc: Rpc; email?: string; password?: string };
const outcome = z.object({ outcome: z.enum(["success", "conflict", "failure"]), count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
type Outcome = z.infer<typeof outcome>;
const failure = (): Outcome => ({ outcome: "failure", count: 0 });
const prepared = z.array(z.object({ outcome: z.enum(["success", "conflict", "create"]), count: z.number().int().nonnegative(), token: z.uuid().nullable(), email: z.email().nullable(), user_id: z.uuid().nullable() })).length(1);
const finished = z.array(outcome).length(1);

/** Hash both credentials to equal-length buffers before the constant-time compare.
 * Authentication runs before configuration/client access or any injected work. */
export function createMaintenanceHandler(options: {
  secret?: string; cleanup(): Promise<Outcome>; ensureMainAdmin(): Promise<Outcome>; ensureShowcase(): Promise<Outcome>;
}) {
  const { secret, cleanup, ensureMainAdmin, ensureShowcase } = options;
  return async (request: Request): Promise<Response> => {
    const { json, error } = privateResponses();
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!secret || !timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
      return error(401, "UNAUTHENTICATED", "Maintenance authentication required.");
    }
    if (request.method !== "GET") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: "GET" });
    const steps = [];
    for (const [step, run] of [["cleanup", cleanup], ["main-admin", ensureMainAdmin], ["showcase-cafe", ensureShowcase]] as const) {
      let result: Outcome;
      try {
        const parsed = outcome.safeParse(await run());
        result = parsed.success ? parsed.data : failure();
      } catch { result = failure(); }
      // Project only validated counts and fixed labels; never serialize dependencies/errors.
      steps.push({ step, outcome: result.outcome, count: result.count });
    }
    return json({ steps });
  };
}

async function provision(step: "admin" | "showcase", options: ProvisionOptions): Promise<Outcome> {
  try {
    const response = await options.rpc("prepare_maintenance", { p_step: step, p_email: step === "admin" ? options.email : null });
    const parsed = prepared.safeParse(response.data);
    if (response.error || !parsed.success) return failure();
    const plan = parsed.data[0];
    if (plan.outcome !== "create") return { outcome: plan.outcome, count: plan.count };
    if (!plan.token || !plan.email) return failure();
    let id = plan.user_id;
    if (!id) {
      // No role metadata: the normal sign-up trigger must not provision a profile.
      // The protected app_metadata marker binds publication to this reservation.
      const created = await options.auth.createUser({ email: plan.email,
        password: step === "admin" ? options.password : randomBytes(24).toString("base64url"),
        email_confirm: true, app_metadata: { maintenance_token: plan.token },
      });
      if (created.error || !created.data.user) {
        // Showcase can reconcile a concurrent/lost Auth acknowledgement without a
        // reset or deletion. Main Admin never adopts any pre-existing account.
        if (step === "admin") return failure();
      } else id = created.data.user.id;
    }
    const published = await options.rpc("publish_maintenance", { p_step: step, p_token: plan.token, p_user: id });
    const result = finished.safeParse(published.data);
    return !published.error && result.success ? result.data[0] : failure();
  } catch { return failure(); }
}

export async function ensureMainAdmin(options: ProvisionOptions): Promise<Outcome> {
  const email = z.email().safeParse(options.email);
  if (!email.success || !options.password?.trim()) return failure();
  return provision("admin", { ...options, email: email.data.toLowerCase() });
}

export async function ensureShowcase(options: Pick<ProvisionOptions, "auth" | "rpc">): Promise<Outcome> {
  return provision("showcase", options);
}
