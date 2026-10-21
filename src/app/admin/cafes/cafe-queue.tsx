import { Suspense } from "react";
import { connection } from "next/server";
import { getVerifiedActor } from "@/server/auth/session";
import { createSessionClient } from "@/server/supabase/session-client";
import { cafeQueueRow } from "@/server/cafes/admin";
import { pageNumber, singaporeTime } from "@/server/reviews/moderation";
import { CafeActions } from "./cafe-actions";

export type CafeQuery = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
async function Queue({ searchParams, applications }: CafeQuery & { applications: boolean }) {
  await connection();
  const actor = await getVerifiedActor();
  if (actor?.role !== "admin") return null;
  const query = await searchParams; const page = pageNumber(query.page);
  const path = applications ? "/admin/applications" : "/admin/cafes";
  const href = (next: number) => `${path}?page=${next}`;
  const changed = typeof query.changed === "string" && ["pending", "approved", "rejected", "suspended", "not suspended"].includes(query.changed) ? query.changed : null;
  let rows: ReturnType<typeof cafeQueueRow.parse>[];
  try {
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc("admin_cafe_queue", { p_applications: applications, p_page: page });
    if (result.error) throw new Error("Cafe queue unavailable");
    rows = cafeQueueRow.array().parse(result.data);
  } catch { return <p role="alert">Unable to load cafés. <a href="">Try again</a></p>; }
  return <section className="space-y-5"><h1 className="text-2xl font-semibold">{applications ? "Café applications" : "Approved cafés"}</h1>
    {changed && <p role="status">Café record changed. Current state: {changed}.</p>}
    {!rows.length ? <p>{applications ? "No pending applications." : "No approved cafés."}</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>
      {(applications ? ["Café", "Application details", "Submitted (Singapore)", "Actions"] : ["Café", "Suspension state", "Actions"]).map(label => <th className="p-2" key={label}>{label}</th>)}
    </tr></thead><tbody>{rows.slice(0, 20).map(row => <tr className="border-t align-top" key={row.id}>
      <td className="p-2">{row.name}</td>
      {applications ? <><td className="p-2"><p className="whitespace-pre-wrap">{row.description}</p><p>{row.area}</p><p>{row.pickup_address}</p>
        <p>Pickup cutoff: {row.pickup_cutoff_minutes} minutes before closing.</p><p>Weekly hours (Singapore):</p>
        {row.opening_hours.length ? <ul>{row.opening_hours.map((hours, index) => <li key={index}>{weekdays[hours.weekday - 1]} {hours.opensAt}–{hours.closesAt}{hours.closesNextDay ? " (next day)" : ""}</li>)}</ul> : <p>No opening hours.</p>}
      </td><td className="p-2">{singaporeTime(row.submitted_at)}</td></> : <td className="p-2">{row.suspended ? "Suspended" : "Not suspended"}</td>}
      <td className="p-2"><CafeActions id={row.id} applications={applications} suspended={row.suspended} /></td>
    </tr>)}</tbody></table></div>}
    <nav aria-label="Café pages" className="flex gap-4">{page > 1 ? <a className="underline" href={href(page - 1)}>Previous</a> : <span aria-disabled="true">Previous</span>}{rows.length > 20 ? <a className="underline" href={href(page + 1)}>Next</a> : <span aria-disabled="true">Next</span>}</nav>
  </section>;
}
export function CafeQueue(props: CafeQuery & { applications: boolean }) {
  return <Suspense fallback={<p role="status">Loading cafés…</p>}><Queue {...props} /></Suspense>;
}
