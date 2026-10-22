import Link from "next/link";
import type { OwnerCafe } from "@/lib/owner/cafe-input";
import { readOwnerCafe } from "@/server/owner/source";
import { ownerAccess } from "../_components/owner-access";
import { CafeSummary } from "../_components/cafe-summary";
import { SettingsForm } from "./settings-form";

/** OWN-02/OWN-04 combined Café profile, weekly hours and pickup-rule settings. */
export default async function Page() {
  const denied = await ownerAccess(); if (denied) return denied;
  let cafe: OwnerCafe | null;
  try { cafe = await readOwnerCafe(); }
  catch { return <section className="space-y-4"><h1 className="text-2xl font-semibold">Café profile</h1><p role="alert">Café profile information is temporarily unavailable. Try again.</p></section>; }
  if (!cafe) return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">Café profile</h1>
    <p>You do not have a café yet. Apply to register one before managing its profile, hours and pickup rules.</p>
    <p><Link className="inline-block rounded bg-black px-5 py-3 text-white" href="/owner/application">Apply for a café</Link></p>
  </section>;
  if (cafe.applicationState !== "approved") return <section className="space-y-6">
    <h1 className="text-2xl font-semibold">Café profile</h1>
    <p>Your café application is {cafe.applicationState === "pending" ? "pending review" : "rejected"}, so these settings are read-only. {cafe.applicationState === "rejected" ? "Change any field by resubmitting the application." : "They can be edited after approval."}</p>
    <p><Link className="underline" href="/owner/application">View café application</Link></p>
    <CafeSummary cafe={cafe} />
  </section>;
  return <section className="space-y-6">
    <h1 className="text-2xl font-semibold">Café profile</h1>
    {cafe.suspended && <p role="status" className="rounded-lg border border-black/15 p-4">This café is suspended and hidden from customers. You can keep managing it; see the <Link className="underline" href="/owner/application">application page</Link> for details.</p>}
    <section aria-labelledby="fixed-heading" className="space-y-3">
      <h2 id="fixed-heading" className="text-xl font-semibold">Approved details</h2>
      <p className="text-sm">The approved name, area and pickup address cannot be changed.</p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
        <dt className="font-semibold">Café name</dt><dd>{cafe.name}</dd>
        <dt className="font-semibold">Area</dt><dd>{cafe.area}</dd>
        <dt className="font-semibold">Public pickup address</dt><dd>{cafe.pickupAddress}</dd>
      </dl>
    </section>
    <SettingsForm cafe={cafe} />
  </section>;
}
