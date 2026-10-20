import "server-only";
import { z } from "zod";
import type { VerifiedActor } from "@/server/auth/workspace";
import { createSessionClient } from "@/server/supabase/session-client";

const identitySchema = z.uuid();
const profileSchema = z.object({
  id: identitySchema,
  workspace_id: z.uuid(),
  role: z.enum(["customer", "owner", "admin"]),
});

/** Reverify Auth and protected profile on every call, including direct access. */
export async function getVerifiedActor(): Promise<VerifiedActor | null> {
  const client = await createSessionClient();
  // getUser consults Auth, including revocation; cached getSession metadata
  // is never an authorization source.
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  const identity = identitySchema.safeParse(data.user?.id);
  if (!identity.success) return null;

  const profile = await client.from("profiles")
    .select("id, workspace_id, role")
    .eq("id", identity.data)
    .maybeSingle();
  if (profile.error) return null;
  const parsed = profileSchema.safeParse(profile.data);
  if (!parsed.success || parsed.data.id !== identity.data) return null;
  return {
    id: parsed.data.id,
    workspaceId: parsed.data.workspace_id,
    role: parsed.data.role,
  };
}
