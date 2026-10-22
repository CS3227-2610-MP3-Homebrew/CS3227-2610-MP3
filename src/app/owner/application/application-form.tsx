"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { areas, type OwnerCafe } from "@/lib/owner/cafe-input";
import { CutoffField, DescriptionField, ErrorAlert, fieldError, HoursEditor, inputClass, invalid, toIntervals, toRows, useHydrated, type FieldError, type HoursRow } from "../_components/cafe-fields";

type Mode = { kind: "apply" } | { kind: "resubmit"; cafe: OwnerCafe };

/** Café registration form: a new application, or explicit resubmission of a rejected one. */
function ApplicationForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const initial = mode.kind === "resubmit" ? mode.cafe : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [area, setArea] = useState<string>(initial?.area ?? "");
  const [pickupAddress, setPickupAddress] = useState(initial?.pickupAddress ?? "");
  const [rows, setRows] = useState<HoursRow[]>(() => toRows(initial?.openingHours ?? []));
  const [cutoff, setCutoff] = useState(String(initial?.pickupSettings.pickupCutoffMinutes ?? 15));
  const [error, setError] = useState<FieldError>(null);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  const submission = useRef<{ content: string; key: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const content = {
      name, description, area, pickupAddress, openingHours: toIntervals(rows),
      pickupSettings: cutoff.trim() === "" && mode.kind === "apply" ? {} : { pickupCutoffMinutes: cutoff.trim() === "" ? null : Number(cutoff) },
      ...(mode.kind === "resubmit" ? { expectedSuspensionVersion: mode.cafe.suspensionVersion } : {}),
    };
    // A retry of unchanged content reuses its key, so it can never create a second attempt.
    const serialized = JSON.stringify(content);
    if (submission.current?.content !== serialized) submission.current = { content: serialized, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      const response = await fetch(mode.kind === "apply" ? "/api/owner/applications" : "/api/owner/cafe/resubmit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionKey: submission.current.key, ...content }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof body?.error?.message === "string" ? body.error.message : "Unable to submit this application. Try again.";
        setError(response.status === 400 ? fieldError(message) : { field: "form", message });
        if (response.status === 409 || response.status === 404) router.refresh();
        return;
      }
      router.refresh();
    } catch { setError({ field: "form", message: "Unable to confirm the submission. Try again; an unchanged retry will not create a duplicate." }); }
    finally { setBusy(false); }
  }

  return <form noValidate onSubmit={submit} className="space-y-5">
    <ErrorAlert error={error} />
    <fieldset disabled={busy || !hydrated} className="space-y-5">
      <label className="block space-y-1"><span className="block font-semibold">Café name</span>
        <input className={inputClass} value={name} onChange={e => setName(e.target.value)} autoComplete="off" {...invalid(error, "name")} /></label>
      <DescriptionField value={description} onChange={setDescription} error={error} />
      <label className="block space-y-1"><span className="block font-semibold">Area</span>
        <select className={inputClass} value={area} onChange={e => setArea(e.target.value)} {...invalid(error, "area")}>
          <option value="">Select an area</option>{areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select></label>
      <label className="block space-y-1"><span className="block font-semibold">Public pickup address</span>
        <span className="block text-sm">Shown to customers once the café is approved.</span>
        <input className={inputClass} value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} {...invalid(error, "pickupAddress")} /></label>
      <HoursEditor rows={rows} onChange={setRows} error={error} />
      <CutoffField value={cutoff} onChange={setCutoff} error={error} />
    </fieldset>
    <button type="submit" disabled={busy || !hydrated} className="rounded bg-black px-5 py-3 text-white disabled:opacity-50">
      {busy ? "Submitting…" : mode.kind === "apply" ? "Submit application" : "Confirm resubmission"}
    </button>
  </form>;
}

export function NewApplication() { return <ApplicationForm mode={{ kind: "apply" }} />; }

/** Rejected applications are resubmitted explicitly; fields may stay unchanged. */
export function Resubmission({ cafe }: { cafe: OwnerCafe }) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  if (!open) return <button type="button" disabled={!hydrated} onClick={() => setOpen(true)} className="rounded bg-black px-5 py-3 text-white disabled:opacity-50">Resubmit application</button>;
  return <section className="space-y-4" aria-labelledby="resubmit-heading">
    <h2 id="resubmit-heading" className="text-xl font-semibold">Resubmit your application</h2>
    <p>Review or change any field. Resubmitting returns the application to pending review; it does not approve the café.</p>
    <ApplicationForm mode={{ kind: "resubmit", cafe }} />
  </section>;
}
