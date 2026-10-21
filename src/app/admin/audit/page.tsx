import { Suspense } from "react";
import { connection } from "next/server";
import { getVerifiedActor } from "@/server/auth/session";
import { createSessionClient } from "@/server/supabase/session-client";
import { auditActions, auditRow, pageNumber, singaporeTime } from "@/server/reviews/moderation";

type Query = Promise<Record<string, string | string[] | undefined>>;
async function Audit({ searchParams }: { searchParams: Query }) {
  await connection();
  const actor = await getVerifiedActor();
  if (actor?.role !== "admin") return null;
  const query = await searchParams;
  const action = typeof query.action === "string" && auditActions.some(a => a === query.action) ? query.action : "all";
  const page = pageNumber(query.page);
  const href = (next: number) => `/admin/audit?action=${action}&page=${next}`;
  let rows: ReturnType<typeof auditRow.parse>[];
  try {
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc("admin_audit_page", { p_action: action, p_page: page });
    if (result.error) throw new Error("Audit unavailable.");
    rows = auditRow.array().parse(result.data);
  } catch { return <p role="alert">Unable to load audit entries. <a href="">Try again</a></p>; }
  return <section className="space-y-5"><h1 className="text-2xl font-semibold">Audit log</h1>
    <nav aria-label="Action filter" className="flex flex-wrap gap-4">{["all", ...auditActions].map(filter => <a key={filter} className="underline" aria-current={action === filter ? "page" : undefined} href={`/admin/audit?action=${filter}&page=1`}>{filter}</a>)}</nav>
    {!rows.length ? <p>No audit entries.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Time (Singapore)", "Admin", "Action", "Target", "Reason"].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.slice(0, 50).map(row => <tr className="border-t align-top" key={row.id}><td className="p-2">{singaporeTime(row.created_at)}</td><td className="p-2">{row.admin_email}</td><td className="p-2">{row.action}</td><td className="p-2">{row.cafe_name}<span className="block">{row.target_id}</span></td><td className="whitespace-pre-wrap p-2">{row.reason}</td></tr>)}</tbody></table></div>}
    <nav aria-label="Audit pages" className="flex gap-4">{page > 1 ? <a className="underline" href={href(page - 1)}>Previous</a> : <span aria-disabled="true">Previous</span>}{rows.length > 50 ? <a className="underline" href={href(page + 1)}>Next</a> : <span aria-disabled="true">Next</span>}</nav>
  </section>;
}
export default function Page(props: { searchParams: Query }) { return <Suspense fallback={<p role="status">Loading audit…</p>}><Audit {...props} /></Suspense>; }
