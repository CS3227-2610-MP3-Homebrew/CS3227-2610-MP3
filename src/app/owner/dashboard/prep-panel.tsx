'use client';
import { useEffect, useRef, useState } from 'react';
import { TopItemsTable, weekdayNames, type TopItem } from './sales-presentation';

type Suggestion = { itemId: string; weekday: number; direction: 'more' | 'less'; evidence: { aggregateId: string; quantity: number }[]; reason: string };
type Result =
  | { mode: 'ai'; source: 'provider' | 'cache'; data: { suggestions: Suggestion[] } }
  | { mode: 'fallback'; reason: 'disabled' | 'usage_limited' | 'unavailable' | 'no_source_data' };
type State = { kind: 'loading' } | { kind: 'result'; result: Result } | { kind: 'error'; message: string };

const explanations = {
  disabled: 'AI advice is disabled right now. Showing your top items instead.',
  usage_limited: 'AI advice has reached its usage limit for now. Showing your top items instead.',
  unavailable: 'AI advice is unavailable right now. Showing your top items instead.',
  no_source_data: 'Not enough completed sales yet for preparation advice. Showing your top items instead.',
};

/** OWN-07 advisory panel: nothing here changes menus, orders or café records. */
export function PrepPanel({ cafeId, topItems, itemNames }: { cafeId: string; topItems: TopItem[]; itemNames: Record<string, string> }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const busy = useRef(false);
  async function request(refresh: boolean): Promise<State> {
    try {
      const response = await fetch('/api/ai/prep-advisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cafeId, refresh }) });
      const body = await response.json();
      return response.ok && (body.mode === 'ai' || body.mode === 'fallback') ? { kind: 'result', result: body }
        : { kind: 'error', message: typeof body.error?.message === 'string' ? body.error.message : 'Prep Advisor is unavailable. Try again.' };
    } catch { return { kind: 'error', message: 'Prep Advisor is unavailable. Try again.' }; }
  }
  async function refresh() {
    if (busy.current) return;
    busy.current = true; setState({ kind: 'loading' });
    setState(await request(true)); busy.current = false;
  }
  useEffect(() => {
    let active = true; busy.current = true;
    request(false).then(next => { if (active) setState(next); busy.current = false; });
    return () => { active = false; };
  }, [cafeId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section aria-labelledby="prep-heading" className="space-y-4 rounded-xl border border-black/15 p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="prep-heading" className="text-xl font-semibold">Prep Advisor</h2>
      <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={state.kind === 'loading'} onClick={() => void refresh()}>Refresh advice</button></header>
    {state.kind === 'loading' && <p role="status">Loading preparation advice…</p>}
    {state.kind === 'error' && <p role="alert">{state.message}</p>}
    {state.kind === 'result' && state.result.mode === 'ai' && <div className="space-y-3">
      <p className="text-sm">AI-generated suggestions from your aggregated sales over the last 28 completed days. They are advice only; nothing changes automatically.</p>
      {!state.result.data.suggestions.length ? <p>No preparation changes suggested from your recent sales.</p>
        : <ul className="space-y-2">{state.result.data.suggestions.map(s => <li key={`${s.itemId}:${s.weekday}`} className="border-t border-black/10 pt-2">
          <p className="font-semibold"><span className="break-words">{itemNames[s.itemId] ?? 'Menu item'}</span>: prepare {s.direction} on {weekdayNames[s.weekday - 1]}</p>
          <p className="text-sm">{s.reason}</p></li>)}</ul>}
    </div>}
    {state.kind === 'result' && state.result.mode === 'fallback' && <div className="space-y-3">
      <p>{explanations[state.result.reason]}</p>
      <h3 className="font-semibold">Top items</h3><TopItemsTable items={topItems} emptyText="No sold items to show yet." />
    </div>}
  </section>;
}
