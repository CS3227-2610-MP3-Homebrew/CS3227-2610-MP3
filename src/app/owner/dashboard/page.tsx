import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { resolveAccountAccess } from "@/server/auth/account-access";
import { createSessionClient } from "@/server/supabase/session-client";
import { AccountFailure, checkingAccount } from "@/app/_components/account-boundary";

async function DashboardEntry() {
  await connection();
  const access = await resolveAccountAccess();
  if (access.kind !== "verified" || access.actor.role !== "owner") return null;
  let hasCafe = false;
  let unavailable = false;
  try {
    const client = await createSessionClient();
    const result = await client.from("cafes").select("id").eq("owner_id", access.actor.id).eq("workspace_id", access.actor.workspaceId).limit(1).maybeSingle();
    unavailable = Boolean(result.error);
    hasCafe = Boolean(result.data);
  } catch { unavailable = true; }
  if (unavailable) return <AccountFailure kind="retry" />;
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">Dashboard</h1>{!hasCafe && <><p>You do not have a café yet.</p><Link href="/owner/application" className="underline">Café application</Link></>}</section>;
}
export default function Page() { return <Suspense fallback={checkingAccount}><DashboardEntry /></Suspense>; }
