import { Suspense } from "react";
import { connection } from "next/server";
import { getVerifiedActor } from "@/server/auth/session";
import { createSessionClient } from "@/server/supabase/session-client";
import { pageNumber, queueSize, reviewRow, singaporeTime } from "@/server/reviews/moderation";
import { ReviewActions } from "./review-actions";

type Query = Promise<Record<string, string | string[] | undefined>>;
async function Queue({ searchParams }: { searchParams: Query }) {
  await connection();
  const actor = await getVerifiedActor();
  if (actor?.role !== "admin") return null;
  const query = await searchParams;
  const state = query.state === "kept" || query.state === "hidden" ? query.state : "pending";
  const page = pageNumber(query.page);
  const href = (next: number) => `/admin/moderation?state=${state}&page=${next}`;
  let rows: ReturnType<typeof reviewRow.parse>[]; let size: number;
  try {
    size = queueSize();
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc("admin_review_queue", { p_state: state, p_page: page, p_size: size });
    if (result.error) throw new Error("Queue unavailable.");
    rows = reviewRow.array().parse(result.data);
  } catch { return <p role="alert">Unable to load reviews. <a href="">Try again</a></p>; }
  return <section className="space-y-5"><h1 className="text-2xl font-semibold">Moderation queue</h1>
    {(query.changed === "pending" || query.changed === "kept" || query.changed === "hidden") && <p role="status">Review record changed. Current state: {query.changed}.</p>}
    <nav aria-label="Review states" className="flex gap-4">{["pending", "kept", "hidden"].map(tab => <a key={tab} className="underline" aria-current={state === tab ? "page" : undefined} href={`/admin/moderation?state=${tab}&page=1`}>{tab[0].toUpperCase() + tab.slice(1)}</a>)}</nav>
    {!rows.length ? <p>No reviews in this tab.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Café", "Rating", "Review", "Submitted (Singapore)", "State", "Actions"].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.slice(0, size).map(row => <tr className="border-t align-top" key={row.id}><td className="p-2">{row.cafe_name}</td><td className="p-2">{row.rating}</td><td className="whitespace-pre-wrap p-2">{row.text}{" "}</td><td className="p-2">{singaporeTime(row.submitted_at)}</td><td className="p-2">{row.moderation_state}</td><td className="p-2"><ReviewActions id={row.id} state={row.moderation_state} /></td></tr>)}</tbody></table></div>}
    <nav aria-label="Queue pages" className="flex gap-4">{page > 1 ? <a className="underline" href={href(page - 1)}>Previous</a> : <span aria-disabled="true">Previous</span>}{rows.length > size ? <a className="underline" href={href(page + 1)}>Next</a> : <span aria-disabled="true">Next</span>}</nav>
  </section>;
}
export default function Page(props: { searchParams: Query }) { return <Suspense fallback={<p role="status">Loading reviews…</p>}><Queue {...props} /></Suspense>; }
