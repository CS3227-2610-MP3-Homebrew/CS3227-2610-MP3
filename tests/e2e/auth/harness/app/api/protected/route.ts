import { withAuthorizedActor } from "subject-guard";

async function perform(request: Request) {
  const ownRecord = new URL(request.url).searchParams.get("record") !== "other";
  try {
    const result = await withAuthorizedActor({ role: "customer", authorize: () => ownRecord, operation: (actor) => ({ privateIdentity: actor.id }) });
    return Response.json(result);
  } catch {
    // Fixture HTTP statuses are not a public application contract.
    return new Response(null, { status: 403 });
  }
}
export const GET = perform;
export const POST = perform;
