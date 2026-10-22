"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { suspensionConflictMessage, type OwnerCafe } from "@/lib/owner/cafe-input";
import { CutoffField, DescriptionField, ErrorAlert, fieldError, HoursEditor, toIntervals, toRows, useHydrated, type FieldError, type HoursRow } from "../_components/cafe-fields";

type Draft = { description: string; hours: ReturnType<typeof toIntervals>; cutoff: string };
const draftKey = (cafeId: string) => `owner-cafe-draft:${cafeId}`;

/** Approved-café settings batch: description, weekly hours and cutoff save together. */
export function SettingsForm({ cafe }: { cafe: OwnerCafe }) {
  const router = useRouter();
  const [description, setDescription] = useState(cafe.description);
  const [rows, setRows] = useState<HoursRow[]>(() => toRows(cafe.openingHours));
  const [cutoff, setCutoff] = useState(String(cafe.pickupSettings.pickupCutoffMinutes));
  const [version, setVersion] = useState(cafe.suspensionVersion);
  const [error, setError] = useState<FieldError>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  // Restore input preserved when an Admin suspension change overtook a save.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(draftKey(cafe.cafeId));
    if (!stored) return;
    window.sessionStorage.removeItem(draftKey(cafe.cafeId));
    try {
      const draft = JSON.parse(stored) as Draft;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser-storage restore after hydration
      setDescription(draft.description); setRows(toRows(draft.hours)); setCutoff(draft.cutoff);
      setNotice("Your unsaved changes were restored. Review them and save again.");
    } catch { /* An unreadable draft is discarded. */ }
  }, [cafe.cafeId]);

  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const trimmed = cutoff.trim();
    const payload = { description, openingHours: toIntervals(rows), pickupSettings: { pickupCutoffMinutes: trimmed === "" ? null : Number(trimmed) }, expectedSuspensionVersion: version };
    setBusy(true); setError(null); setNotice("");
    try {
      const response = await fetch("/api/owner/cafe/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof body?.error?.message === "string" ? body.error.message : "Unable to save café changes. Try again.";
        if (response.status === 409 && message === suspensionConflictMessage) {
          const draft: Draft = { description, hours: toIntervals(rows), cutoff };
          window.sessionStorage.setItem(draftKey(cafe.cafeId), JSON.stringify(draft));
          router.push("/owner/application");
          return;
        }
        setError(response.status === 400 ? fieldError(message) : { field: "form", message });
        return;
      }
      const saved = body.cafe as OwnerCafe;
      setDescription(saved.description); setRows(toRows(saved.openingHours));
      setCutoff(String(saved.pickupSettings.pickupCutoffMinutes)); setVersion(saved.suspensionVersion);
      setNotice("Café settings saved.");
      router.refresh();
    } catch { setError({ field: "form", message: "Unable to confirm the save. Check the current settings and try again." }); }
    finally { setBusy(false); }
  }

  return <form noValidate onSubmit={save} className="space-y-5">
    <h2 className="text-xl font-semibold">Profile, hours and pickup rules</h2>
    <ErrorAlert error={error} />
    {notice && <p role="status" className="rounded-lg border border-black/15 p-3">{notice}</p>}
    <fieldset disabled={busy || !hydrated} className="space-y-5">
      <DescriptionField value={description} onChange={setDescription} error={error} />
      <HoursEditor rows={rows} onChange={setRows} error={error} />
      <section aria-labelledby="pickup-rules-heading" className="space-y-2">
        <h3 id="pickup-rules-heading" className="text-lg font-semibold">Pickup rules</h3>
        <CutoffField value={cutoff} onChange={setCutoff} error={error} />
      </section>
    </fieldset>
    <button type="submit" disabled={busy || !hydrated} className="rounded bg-black px-5 py-3 text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
  </form>;
}
