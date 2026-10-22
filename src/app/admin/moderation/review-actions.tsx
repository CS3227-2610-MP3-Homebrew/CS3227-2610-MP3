"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const quickReasons = ["Looks fine", "Spam", "Abusive", "Off-topic", "Prompt-injection attempt"];
export function ReviewActions({ id, state, suggestedAction, onComplete }: { id: string; state: "pending" | "kept" | "hidden";
  suggestedAction?: "Keep" | "Hide"; onComplete?: () => void }) {
  const router = useRouter();
  const [action, setAction] = useState<string>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const choices = state === "pending" ? ["Keep", "Hide"] : state === "kept" ? ["Hide"] : ["Restore"];
  async function confirm() {
    if (!reason.trim() || [...reason].length > 300) { setMessage("Enter a reason of 1–300 characters."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}/moderation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action?.toLowerCase(), reason }) });
      const result = await response.json();
      if (response.ok) { onComplete?.(); setAction(undefined); setReason(""); router.refresh(); }
      else if (result.error?.code === "STATE_CONFLICT") {
        onComplete?.(); setMessage(result.error.message); setAction(undefined);
        const current = /Current state: (pending|kept|hidden)\./.exec(result.error.message)?.[1];
        if (current) {
          const query = new URLSearchParams(window.location.search);
          query.set("changed", current);
          router.replace(`/admin/moderation?${query}`);
        }
        router.refresh();
      }
      else setMessage("Unable to save. Check your reason and try again.");
    } catch { setMessage("Unable to save. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{choices.map(choice => <button className={`rounded border px-3 py-1${suggestedAction === choice ? " ring-2 ring-amber-600" : ""}`}
      aria-describedby={suggestedAction === choice ? `advice-${id}` : undefined}
      key={choice} disabled={busy} onClick={() => { setAction(choice); setMessage(""); }}>{choice}</button>)}</div>
    {action && <div className="space-y-2 rounded border p-3"><label className="block" htmlFor={`reason-${id}`}>{action} reason</label><textarea className="w-full rounded border p-2" id={`reason-${id}`} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
      <div className="flex flex-wrap gap-2">{quickReasons.map(quick => <button className="rounded border px-2 py-1" key={quick} disabled={busy} onClick={() => setReason(quick)}>{quick}</button>)}</div>
      <button className="rounded border px-3 py-1" disabled={busy} onClick={confirm}>{busy ? "Saving…" : `Confirm ${action}`}</button> <button disabled={busy} onClick={() => setAction(undefined)}>Cancel</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
