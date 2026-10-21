"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CafeActions({ id, applications, suspended }: { id: string; applications: boolean; suspended: boolean }) {
  const router = useRouter();
  const [action, setAction] = useState<string>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const choices = applications ? ["Approve", "Reject"] : [suspended ? "Un-suspend" : "Suspend"];
  async function confirm() {
    if (!action || !reason.trim() || [...reason].length > 300) { setMessage("Enter a reason of 1–300 characters."); return; }
    setBusy(true); setMessage("");
    try {
      const operation = applications ? "decision" : "suspension";
      const body = applications ? { decision: action.toLowerCase(), reason } : { suspended: action === "Suspend", reason };
      const response = await fetch(`/api/admin/cafes/${encodeURIComponent(id)}/${operation}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (response.ok) { setAction(undefined); setReason(""); router.refresh(); }
      else if (result.error?.code === "STATE_CONFLICT") {
        setAction(undefined);
        const current = /Current state: (pending|approved|rejected|suspended|not suspended)\./.exec(result.error.message)?.[1];
        if (current) {
          const query = new URLSearchParams(window.location.search); query.set("changed", current);
          router.replace(`${applications ? "/admin/applications" : "/admin/cafes"}?${query}`);
        } else setMessage("Café record changed. Refresh to see its current state.");
        router.refresh();
      } else setMessage("Unable to save. Check your reason and try again.");
    } catch { setMessage("Unable to save. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{choices.map(choice => <button type="button" className="rounded border px-3 py-1" key={choice} disabled={busy} onClick={() => { setAction(choice); setMessage(""); }}>{choice}</button>)}</div>
    {action && <div className="space-y-2 rounded border p-3"><label className="block" htmlFor={`reason-${id}`}>{action} reason</label>
      <textarea className="w-full rounded border p-2" id={`reason-${id}`} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} aria-describedby={`reason-help-${id}`} />
      <p id={`reason-help-${id}`} className="text-sm">Enter a reason of 1–300 characters. Confirm to {action.toLowerCase()} this café.</p>
      <button type="button" className="rounded border px-3 py-1" disabled={busy} onClick={confirm}>{busy ? "Saving…" : `Confirm ${action}`}</button>{" "}
      <button type="button" disabled={busy} onClick={() => setAction(undefined)}>Cancel</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
