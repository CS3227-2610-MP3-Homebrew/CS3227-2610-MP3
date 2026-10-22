import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { BodyOverflow, readBounded, privateResponses, checkOrigin, checkJsonContentType } from "@/server/http/json";

type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
type Account = { role: "customer" | "owner" | "admin"; email: string; password: string };
type Kit = { accounts: Account[] };
type Admission = { reserve(): Promise<{ admitted: boolean; retryAfter?: number; unavailable?: boolean }> };
const policy = z.strictObject({ perTenMinutes: z.number().int().min(0).max(5), perDay: z.number().int().min(0).max(30) });
const reservation = z.array(z.object({ admitted: z.boolean(), retry_after: z.number().int().nonnegative() })).length(1);

export function createDemoKitAdmission(options: { environment: "local" | "ci" | "dev" | "prod"; rpc: Rpc; limits: { perTenMinutes: number; perDay: number }; databaseClock?: () => Promise<string> }): Admission {
  const limits = policy.safeParse(options.limits);
  return { async reserve() {
    try {
      if (!limits.success) return { admitted: false, unavailable: true };
      const result = await options.rpc("reserve_demo_kit", { p_environment: options.environment, p_limits: limits.data, ...(options.databaseClock ? { p_now: await options.databaseClock() } : {}) });
      const parsed = reservation.safeParse(result.data);
      if (result.error || !parsed.success) return { admitted: false, unavailable: true };
      const value = parsed.data[0];
      return { admitted: value.admitted, ...(!value.admitted ? { retryAfter: Math.max(1, value.retry_after) } : {}) };
    } catch { return { admitted: false, unavailable: true }; }
  } };
}

/** Passwords exist only in this request and Supabase Auth, never in the RPC payload. */
export async function provisionDemoKit(options: { auth: Pick<SupabaseClient["auth"]["admin"], "createUser" | "deleteUser">; rpc: Rpc; now?: () => Date }): Promise<Kit> {
  const code = randomBytes(16).toString("hex");
  const accounts: Account[] = [];
  const identities: { id: string; role: string }[] = [];
  const workspaceId = randomUUID();
  const createdAt = (options.now?.() ?? new Date()).toISOString();
  try {
    for (const role of ["customer", "owner", "admin", "unpublished-owner"] as const) {
      const email = `${role}-${code}@example.com`;
      const password = randomBytes(24).toString("base64url");
      const result = await options.auth.createUser({ email, password, email_confirm: true });
      if (result.error || !result.data.user) throw new Error("Kit identity unavailable.");
      identities.push({ id: result.data.user.id, role });
      if (role !== "unpublished-owner") accounts.push({ role, email, password });
    }
    // The seed RPC is transactional and idempotent for this unguessable workspace/identity tuple.
    // Reconcile a lost acknowledgement once without making a second kit.
    let committed = false;
    for (let attempt = 0; attempt < 2 && !committed; attempt++) {
      try {
        const result = await options.rpc("publish_demo_kit", { p_workspace: workspaceId, p_code: code, p_identities: identities, p_created_at: createdAt });
        committed = !result.error && z.array(z.object({ published: z.literal(true) })).length(1).safeParse(result.data).success;
      } catch { /* Reconcile using the same identity tuple. */ }
    }
    if (!committed) throw new Error("Kit setup unavailable.");
    return { accounts };
  } catch {
    // Domain creation is one SQL transaction; failed seeding leaves no profiles/FKs.
    // Only identities returned by this request's createUser are eligible for compensation.
    for (const identity of identities.reverse()) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try { if (!(await options.auth.deleteUser(identity.id)).error) break; } catch { /* Bounded retry, no credential-bearing telemetry. */ }
      }
    }
    // Also reconcile an Auth create whose response was lost before its ID returned.
    // SQL excludes every profiled identity, so a complete published kit is retained.
    for (let attempt = 0; attempt < 2; attempt++) {
      try { if (!(await options.rpc("discard_demo_identities", { p_code: code })).error) break; } catch { /* Safe failure, never log the provider exception. */ }
    }
    throw new Error("Unable to create demo kit.");
  }
}

export function createDemoKitHandler(options: { trustedOrigin: string; admission: Admission; createKit(): Promise<Kit> }) {
  return async (request: Request): Promise<Response> => {
    const { json, error } = privateResponses();
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: "POST" });
    const originError = checkOrigin(request.headers.get("origin"), options.trustedOrigin, error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, error); if (mediaError) return mediaError;
    try {
      if (!z.strictObject({}).safeParse(JSON.parse(await readBounded(request.body, request.signal))).success) return error(400, "INVALID_REQUEST", "Use an empty JSON object.");
    } catch (failure) {
      return failure instanceof BodyOverflow ? error(413, "PAYLOAD_TOO_LARGE", "Request body is too large.") : error(400, "INVALID_REQUEST", "Use an empty JSON object.");
    }
    try {
      const admission = await options.admission.reserve();
      if (admission.unavailable) return error(503, "SOURCE_UNAVAILABLE", "Demo kit service is temporarily unavailable. Try again.");
      if (!admission.admitted) {
        const seconds = Math.max(1, Math.ceil(admission.retryAfter ?? 600));
        return error(429, "RATE_LIMITED", `Demo kit limit reached. Try again in ${seconds} seconds.`, { "Retry-After": String(seconds) });
      }
      return json({ kit: await options.createKit() });
    } catch { return error(503, "SOURCE_UNAVAILABLE", "Demo kit service is temporarily unavailable. Try again."); }
  };
}
