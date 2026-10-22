'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { z } from 'zod';
import type { CatalogueQuery } from '@/lib/catalogue/query';
import Filters from './filters';

const suggestion = z.object({ cafeId: z.string().min(1), itemId: z.string().min(1), reason: z.string().min(1).refine(s => Array.from(s).length <= 300) }).strict();
const envelope = z.discriminatedUnion('mode', [
  z.object({ requestId: z.string(), feature: z.literal('brew_finder'), mode: z.literal('ai'), source: z.enum(['provider','cache']),
    data: z.object({ suggestions: z.array(suggestion).max(5).refine(rows => new Set(rows.map(s => s.cafeId)).size === rows.length) }).strict() }).strict(),
  z.object({ requestId: z.string(), feature: z.literal('brew_finder'), mode: z.literal('fallback'),
    reason: z.enum(['disabled','usage_limited','unavailable','no_source_data']), fallback: z.literal('rating_sorted_catalogue') }).strict(),
]);
const cafeDetail = z.object({ cafe: z.object({ cafeId: z.string(), name: z.string(),
  menu: z.array(z.object({ itemId: z.string(), name: z.string(), soldOut: z.boolean(), drinkType: z.string() })), area: z.string() }) });
type Advice = z.infer<typeof suggestion> & { cafeName: string; itemName: string };
const messages = {
  disabled: 'Brew Finder AI is disabled. Browse the cafés below, sorted by rating.',
  usage_limited: 'Brew Finder has reached a usage limit. Browse the cafés below, sorted by rating.',
  unavailable: 'Brew Finder AI is temporarily unavailable. Browse the cafés below, sorted by rating.',
  no_source_data: 'No available matching items to recommend. Browse the cafés below, sorted by rating.',
};

export default function BrewFinder({ query, children }: { query: CatalogueQuery; children: ReactNode }) {
  const [text,setText] = useState('');
  const [pending,setPending] = useState(false);
  const [advice,setAdvice] = useState<Advice[] | null>(null);
  const [message,setMessage] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  function clear() {
    active.current?.abort(); active.current = null;
    setPending(false); setAdvice(null); setMessage(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !text.trim()) return;
    if (Array.from(text).length > 1000) { setMessage('Describe your preferences in 1,000 characters or fewer.'); return; }
    const controller = new AbortController(); active.current = controller;
    setPending(true); setAdvice(null); setMessage(null);
    const filters = { timeMode: query.timeMode, at: query.at ?? null, area: query.area ?? null, drinkType: query.drinkType ?? null };
    try {
      const response = await fetch('/api/ai/brew-finder', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, filters }), cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Advice unavailable.');
      const result = envelope.parse(await response.json());
      if (result.mode === 'fallback') { if (!controller.signal.aborted) setMessage(messages[result.reason]); return; }
      // Names and navigation come from independently authorized current records.
      // Reject the complete advice set if any record/item is no longer available.
      const resolved = await Promise.all(result.data.suggestions.map(async row => {
        const detail = await fetch(`/api/customer/cafes/${encodeURIComponent(row.cafeId)}`, { cache: 'no-store', signal: controller.signal });
        if (!detail.ok) throw new Error('Advice unavailable.');
        const { cafe } = cafeDetail.parse(await detail.json());
        const item = cafe.menu.find(m => m.itemId === row.itemId && !m.soldOut && (!filters.drinkType || filters.drinkType === m.drinkType));
        if (cafe.cafeId !== row.cafeId || !item || (filters.area && cafe.area !== filters.area)) throw new Error('Advice unavailable.');
        return { ...row, cafeName: cafe.name, itemName: item.name };
      }));
      if (!controller.signal.aborted) setAdvice(resolved);
    } catch {
      if (!controller.signal.aborted) setMessage(messages.unavailable);
    } finally {
      if (active.current === controller) { active.current = null; setPending(false); }
    }
  }
  return <>
    <Filters query={query} onChange={clear} />
    <section aria-labelledby="brew-finder-heading" className="my-6 rounded-xl border border-black/15 bg-white p-5 text-black">
      <h2 id="brew-finder-heading" className="text-xl font-semibold">Brew Finder</h2>
      <p className="mt-1 text-sm">Describe your next drink and find a café for pickup.</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3" aria-busy={pending}>
        <label className="grid min-w-0 flex-1 gap-1" htmlFor="brew-query">Brew Finder preferences
          <input id="brew-query" value={text} onChange={e => { clear(); setText(e.target.value); }} required
            placeholder="An iced coffee in the East…" className="w-full rounded border border-black/30 p-2" aria-describedby="brew-query-help" />
        </label>
        <button type="submit" disabled={pending} className="rounded bg-black px-5 py-2 text-white disabled:opacity-50">Search</button>
      </form>
      <p id="brew-query-help" className="mt-2 text-sm">Up to 1,000 characters. Search uses your applied café filters. Click Apply to use changed filters.</p>
      <div aria-live="polite" className="mt-3">
        {pending && <p role="status">Searching for cafés…</p>}
        {message && <p role="status">{message}</p>}
        {advice !== null && <><h3 className="font-semibold">AI-generated advice</h3>
          {advice.length === 0 ? <p role="status">No close match found</p> : <ol className="mt-3 grid gap-3">{advice.map(row => <li key={row.cafeId} className="rounded border border-black/15 p-4">
            <Link className="font-semibold underline" href={`/customer/cafes/${encodeURIComponent(row.cafeId)}`}>{row.cafeName}</Link>
            <p className="mt-1">{row.itemName}</p><p className="mt-1 whitespace-pre-wrap">{row.reason}</p>
          </li>)}</ol>}</>}
      </div>
    </section>
    {children}
  </>;
}
