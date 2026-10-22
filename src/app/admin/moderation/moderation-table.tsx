"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ReviewActions } from "./review-actions";

const classification = z.strictObject({ reviewId: z.string(), label: z.enum(["ok", "spam", "abusive", "off-topic", "injection attempt"]),
  reason: z.string().refine(value => [...value].length >= 1 && [...value].length <= 300) });
const responseSchema = z.union([
  z.strictObject({ requestId: z.string(), feature: z.literal("moderation"), mode: z.literal("ai"), source: z.literal("provider"),
    data: z.strictObject({ classifications: classification.array() }) }),
  z.strictObject({ requestId: z.string(), feature: z.literal("moderation"), mode: z.literal("fallback"),
    reason: z.enum(["disabled", "usage_limited", "unavailable"]), fallback: z.literal("manual_queue") }),
]);
type Suggestion = z.infer<typeof classification>;
type Row = { id: string; cafe_name: string; rating: number; text: string; submittedDisplay: string; moderation_state: "pending" | "kept" | "hidden" };
const fallbackMessages = {
  disabled: "AI triage is disabled. You can still review each item manually.",
  usage_limited: "The AI usage limit was reached. You can still review each item manually.",
  unavailable: "AI triage is unavailable. You can still review each item manually.",
};

/** Keyed by tab/page in the server queue; never persists or reuses suggestions. */
export function ModerationTable({ rows, pending }: { rows: Row[]; pending: boolean }) {
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [changed, setChanged] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => {
    const leave = () => { inFlight.current?.abort(); };
    // A browser history restoration can reuse a frozen page without remounting.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) { setSuggestions({}); setMessage(""); setChanged(false); } };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    return () => { leave(); window.removeEventListener("pagehide", leave); window.removeEventListener("pageshow", restore); };
  }, []);

  function removeSuggestion(id: string) {
    setSuggestions(previous => { const next = { ...previous }; delete next[id]; return next; });
  }
  async function triage() {
    if (inFlight.current || !pending || !rows.length) return;
    const controller = new AbortController(); inFlight.current = controller;
    setLoading(true); setSuggestions({}); setMessage(""); setChanged(false);
    try {
      const reviewIds = rows.map(row => row.id);
      const response = await fetch("/api/ai/moderation", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewIds }), signal: controller.signal, cache: "no-store" });
      if (response.status === 400) { setChanged(true); setMessage("The queue changed. Reload before triaging."); return; }
      if (!response.ok) { setMessage("Unable to triage reviews. Reload and try again."); return; }
      const result = responseSchema.parse(await response.json());
      if (result.mode === "fallback") { setMessage(fallbackMessages[result.reason]); return; }
      const values = result.data.classifications;
      if (values.length !== reviewIds.length || new Set(values.map(value => value.reviewId)).size !== reviewIds.length ||
        values.some(value => !reviewIds.includes(value.reviewId))) throw new Error("Invalid advice.");
      setSuggestions(Object.fromEntries(values.map(value => [value.reviewId, value])));
    } catch { if (!controller.signal.aborted) setMessage(fallbackMessages.unavailable); }
    finally { inFlight.current = null; setLoading(false); }
  }
  return <>
    {pending && <div className="space-y-2">
      <button className="rounded border px-3 py-1" disabled={!rows.length || loading} onClick={triage}>Triage pending reviews</button>
      {loading && <p role="status">Triaging reviews…</p>}
    </div>}
    {message && <p role="status">{message} {changed && <button className="underline" onClick={() => window.location.reload()}>Reload queue</button>}</p>}
    {!rows.length ? <p>No reviews in this tab.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Café", "Rating", "Review", "Submitted (Singapore)", "State", "Actions"].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => {
      const suggestion = suggestions[row.id];
      return <tr className="border-t align-top" key={row.id}>
        <td className="p-2">{row.cafe_name}</td><td className="p-2">{row.rating}</td>
        <td className="whitespace-pre-wrap p-2">{row.text}{" "}{suggestion && <div id={`advice-${row.id}`} className="mt-2 rounded border p-2"><strong>AI suggestion</strong>: <span>{suggestion.label}</span><p>{suggestion.reason}</p></div>}</td>
        <td className="p-2">{row.submittedDisplay}</td><td className="p-2">{row.moderation_state}</td>
        <td className="p-2"><ReviewActions id={row.id} state={row.moderation_state}
          suggestedAction={suggestion ? suggestion.label === "ok" ? "Keep" : "Hide" : undefined}
          onComplete={() => removeSuggestion(row.id)} /></td>
      </tr>;
    })}</tbody></table></div>}
  </>;
}
