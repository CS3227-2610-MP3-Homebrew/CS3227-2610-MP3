import "server-only";
import { cookies } from "next/headers";

/** Deliberately test-only identities; this file is never imported by production src. */
export async function getVerifiedActor() {
  const jar = await cookies();
  const delay = Number(jar.get("t09-delay")?.value ?? "0");
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 1500)));
  const role = jar.get("t09-session")?.value;
  if (role !== "customer" && role !== "owner" && role !== "admin") return null;
  return { id: `private-${role}-identity`, workspaceId: "00000000-0000-4000-8000-000000000042", role };
}
