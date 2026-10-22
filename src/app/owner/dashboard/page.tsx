import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { resolveAccountAccess } from "@/server/auth/account-access";
import { createSessionClient } from "@/server/supabase/session-client";
import { AccountFailure, checkingAccount } from "@/app/_components/account-boundary";
import { readOwnerSales, type OwnerSales } from "@/server/owner/sales";
import { money } from "@/app/customer/orders/presentation";
import { PrepPanel } from "./prep-panel";
import { TopItemsTable, weekdayNames } from "./sales-presentation";

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));

function SalesViews({ sales }: { sales: OwnerSales }) {
  return <>
    <section aria-labelledby="daily-heading" className="space-y-3"><h2 id="daily-heading" className="text-xl font-semibold">Daily totals</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-1 pr-4">Date (SGT)</th><th className="py-1 pr-4">Orders</th><th className="py-1">Revenue</th></tr></thead>
        <tbody>{sales.daily.map(d => <tr key={d.date} className="border-t border-black/10"><td className="py-1 pr-4"><time dateTime={d.date}>{dateLabel(d.date)}</time></td><td className="py-1 pr-4">{d.orderCount}</td><td className="py-1">{money(d.revenueCents)}</td></tr>)}</tbody></table></div>
    </section>
    <section aria-labelledby="top-heading" className="space-y-3"><h2 id="top-heading" className="text-xl font-semibold">Top items</h2><TopItemsTable items={sales.topItems} /></section>
    <section aria-labelledby="weekday-heading" className="space-y-3"><h2 id="weekday-heading" className="text-xl font-semibold">Sales by day of week</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-1 pr-4">Day</th><th className="py-1 pr-4">Orders</th><th className="py-1 pr-4">Items</th><th className="py-1">Revenue</th></tr></thead>
        <tbody>{sales.weekdays.map(w => <tr key={w.weekday} className="border-t border-black/10"><td className="py-1 pr-4">{weekdayNames[w.weekday - 1]}</td><td className="py-1 pr-4">{w.orderCount}</td><td className="py-1 pr-4">{w.quantity}</td><td className="py-1">{money(w.revenueCents)}</td></tr>)}</tbody></table></div>
    </section>
  </>;
}

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
  if (!hasCafe) return <section className="space-y-4"><h1 className="text-2xl font-semibold">Dashboard</h1><p>You do not have a café yet.</p><Link href="/owner/application" className="underline">Café application</Link></section>;
  let sales: OwnerSales | null = null;
  let itemNames: Record<string, string> = {};
  try {
    sales = await readOwnerSales();
    if (sales) {
      const client = await createSessionClient();
      const menu = await client.from("menu_items").select("id,name").eq("cafe_id", sales.cafeId);
      if (!menu.error) itemNames = Object.fromEntries((menu.data ?? []).map(row => [String(row.id), String(row.name)]));
    }
  } catch { sales = null; unavailable = true; }
  if (unavailable || !sales) return <section className="space-y-4"><h1 className="text-2xl font-semibold">Dashboard</h1><p role="alert">Sales are temporarily unavailable. Try again.</p></section>;
  const empty = sales.daily.every(d => d.orderCount === 0);
  return <section className="space-y-8"><header><h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2">Completed (collected) orders for the last 28 days, in Singapore time. Customers pay at pickup.</p></header>
    {empty ? <p>No completed sales in the last 28 days.</p> : <SalesViews sales={sales} />}
    <PrepPanel cafeId={sales.cafeId} topItems={sales.topItems} itemNames={itemNames} />
  </section>;
}
export default function Page() { return <Suspense fallback={checkingAccount}><DashboardEntry /></Suspense>; }
