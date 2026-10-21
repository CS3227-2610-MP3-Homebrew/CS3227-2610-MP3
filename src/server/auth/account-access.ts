import "server-only";
import { z } from "zod";
import { cookies } from "next/headers";
import { createSessionClient } from "@/server/supabase/session-client";
import type { VerifiedActor } from "./workspace";

export type AccountAccess = { kind: "verified"; actor: VerifiedActor } | { kind: "anonymous" | "session-ended" | "unavailable" | "retry" };
const profileSchema = z.object({ id: z.uuid(), workspace_id: z.uuid(), role: z.enum(["customer", "owner", "admin"]) });
export const isAuthCookie = (name: string) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name);
export function isSourceFailure(error: { status?: number; name?: string }) {
  return !error.status || error.status >= 500 || error.status === 429 || error.name === "AuthRetryableFetchError";
}

/** Never turn an outage into an anonymous identity or a fabricated profile. */
export async function resolveAccountAccess(): Promise<AccountAccess> {
  try {
    const hasSession = (await cookies()).getAll().some((cookie) => isAuthCookie(cookie.name) && Boolean(cookie.value));
    const client = await createSessionClient({ retry: false });
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (error.name !== "AuthSessionMissingError" && isSourceFailure(error)) return { kind: "retry" };
      return { kind: hasSession ? "session-ended" : "anonymous" };
    }
    if (!data.user || !z.uuid().safeParse(data.user.id).success) return { kind: hasSession ? "session-ended" : "anonymous" };
    const profile = await client.from("profiles").select("id, workspace_id, role").eq("id", data.user.id).maybeSingle();
    if (profile.error) return { kind: "retry" };
    const parsed = profileSchema.safeParse(profile.data);
    if (!parsed.success || parsed.data.id !== data.user.id) return { kind: "unavailable" };
    return { kind: "verified", actor: { id: parsed.data.id, workspaceId: parsed.data.workspace_id, role: parsed.data.role } };
  } catch { return { kind: "retry" }; }
}
