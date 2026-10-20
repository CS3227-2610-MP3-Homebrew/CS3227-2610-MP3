import "server-only";
import { getVerifiedActor } from "@/server/auth/session";
import type { VerifiedActor } from "@/server/auth/workspace";

type AuthorizedOperation<T> = {
  role: VerifiedActor["role"];
  authorize: (actor: VerifiedActor) => boolean | Promise<boolean>;
  operation: (actor: VerifiedActor) => T | Promise<T>;
};

/** Domain callers supply record permissions; this boundary never replaces RLS. */
export async function withAuthorizedActor<T>({ role, authorize, operation }: AuthorizedOperation<T>): Promise<T> {
  const actor = await getVerifiedActor();
  if (!actor || actor.role !== role) throw new Error("Access denied.");
  if (await authorize(actor) !== true) throw new Error("Access denied.");
  return operation(actor);
}
