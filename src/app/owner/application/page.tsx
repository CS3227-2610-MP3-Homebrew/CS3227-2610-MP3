import Link from "next/link";
import type { OwnerCafe } from "@/lib/owner/cafe-input";
import { readOwnerCafe } from "@/server/owner/source";
import { ownerAccess } from "../_components/owner-access";
import { CafeSummary, singaporeInstant } from "../_components/cafe-summary";
import { NewApplication, Resubmission } from "./application-form";

const stateLabels = { pending: "Pending review", approved: "Approved", rejected: "Rejected" } as const;

/** Application, latest private Admin decision and current suspension context. */
function Status({ cafe }: { cafe: OwnerCafe }) {
  return <section aria-labelledby="status-heading" className="space-y-4 rounded-lg border border-black/15 p-4">
    <h2 id="status-heading" className="text-xl font-semibold">Application status</h2>
    <p>Application state: <strong>{stateLabels[cafe.applicationState]}</strong></p>
    <p>Last submitted: {singaporeInstant(cafe.submittedAt)}</p>
    {cafe.applicationState === "pending" && <p>An Admin reviews pending applications. Your café stays hidden from customers until it is approved.</p>}
    {cafe.applicationState === "rejected" && <p>Your café is hidden from customers. You can resubmit the application for another review.</p>}
    {cafe.applicationState === "approved" && <p>Customer visibility: {cafe.suspended ? "hidden from customers while suspended" : "visible to customers"}</p>}
    {cafe.latestDecision && <div className="space-y-1">
      <h3 className="font-semibold">Latest Admin decision</h3>
      <p>{cafe.latestDecision.decision === "approve" ? "Approval" : "Rejection"} recorded {singaporeInstant(cafe.latestDecision.decidedAt)}</p>
      <p className="whitespace-pre-wrap rounded bg-zinc-100 p-3">{cafe.latestDecision.reason}</p>
    </div>}
    {cafe.suspended && <div className="space-y-1">
      <h3 className="font-semibold">Suspended by an Admin</h3>
      {cafe.suspensionReason !== null && <p className="whitespace-pre-wrap rounded bg-zinc-100 p-3">{cafe.suspensionReason}</p>}
      <p>You can still manage the café profile while it is suspended.</p>
    </div>}
  </section>;
}

export default async function Page() {
  const denied = await ownerAccess(); if (denied) return denied;
  let cafe: OwnerCafe | null;
  try { cafe = await readOwnerCafe(); }
  catch { return <section className="space-y-4"><h1 className="text-2xl font-semibold">Café application</h1><p role="alert">Café application information is temporarily unavailable. Try again.</p></section>; }
  if (!cafe) return <section className="space-y-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Café application</h1>
      <p>Apply to register your home café. An Admin reviews each application; your café stays hidden from customers until it is approved.</p></header>
    <NewApplication />
  </section>;
  return <section className="space-y-6">
    <h1 className="text-2xl font-semibold">Café application</h1>
    <Status cafe={cafe} />
    <section aria-labelledby="details-heading" className="space-y-3">
      <h2 id="details-heading" className="text-xl font-semibold">Submitted details</h2>
      <CafeSummary cafe={cafe} />
    </section>
    {cafe.applicationState === "rejected" && <Resubmission cafe={cafe} />}
    {cafe.applicationState === "approved" && <p><Link className="underline" href="/owner/cafe">Manage café profile, hours and pickup rules</Link></p>}
  </section>;
}
