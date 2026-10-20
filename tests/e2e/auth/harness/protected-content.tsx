import { withAuthorizedActor } from "subject-guard";

export async function ProtectedContent({ role }: { role: "customer" | "owner" | "admin" }) {
  const identity = await withAuthorizedActor({ role, authorize: () => true, operation: (actor) => actor.id });
  return <section aria-label="Protected content"><h1>{role} private area</h1><p>{identity}</p></section>;
}
