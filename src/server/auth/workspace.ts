import "server-only";
import { z } from "zod";

const actorSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.uuid(),
  role: z.enum(["customer", "owner", "admin"]),
});

/** Supplied only after server authentication and protected-profile resolution. */
export type VerifiedActor = z.infer<typeof actorSchema>;

/** Scope prerequisite only: callers must also enforce role and record ownership. */
export function authorizeWorkspace(actor: VerifiedActor | null, resourceWorkspaceId: string): boolean {
  const verified = actorSchema.safeParse(actor);
  const resource = z.uuid().safeParse(resourceWorkspaceId);
  return verified.success && resource.success && verified.data.workspaceId === resource.data;
}
