'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { money, singaporeTime } from '@/app/customer/orders/presentation';
import theme from '@/app/_components/homey-theme.module.css';

type Item = { itemId: string; name: string; priceCents: number; soldOut: boolean };
export function OrderForm({ cafeId, menu, slots }: { cafeId: string; menu: Item[]; slots: string[] }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickupAt, setPickupAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submission = useRef<{ content: string; key: string } | null>(null);
  const selected = menu.filter(item => !item.soldOut && (quantities[item.itemId] ?? 0) > 0);
  const total = selected.reduce((sum, item) => sum + item.priceCents * quantities[item.itemId], 0);
  async function placeOrder(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (!selected.length || selected.length > 20 || !pickupAt || selected.some(item => !Number.isInteger(quantities[item.itemId]) || quantities[item.itemId] > 20)) {
      setMessage('Choose 1–20 drinks, quantities from 1–20, and a pickup slot.'); return;
    }
    const input = { cafeId, pickupAt, items: selected.map(item => ({ itemId: item.itemId, quantity: quantities[item.itemId] })).sort((a, b) => a.itemId.localeCompare(b.itemId)), expectedTotalCents: total };
    const content = JSON.stringify(input);
    if (submission.current?.content !== content) submission.current = { content, key: crypto.randomUUID() };
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, submissionKey: submission.current.key }) });
      const body = await response.json();
      if (!response.ok) { setMessage(typeof body.error?.message === 'string' ? body.error.message : 'Unable to place this order. Try again.'); return; }
      router.push('/customer/orders'); router.refresh();
    } catch { setMessage('Unable to confirm this order. Try again with the same selection; a retry will not create a duplicate.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={placeOrder} className="space-y-6">
    <p>Payment at pickup. Pay at the counter when you collect your drinks.</p>
    <fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-xl font-semibold">Choose drinks</legend>
      {menu.length ? menu.map(item => <div key={item.itemId} className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border border-black/15 p-4 ${item.soldOut ? theme.soldOut : ''}`}>
        <div><p className="font-semibold">{item.name}</p><p>{money(item.priceCents)} each{item.soldOut ? ' · Sold out' : ''}</p></div>
        <label className="flex items-center gap-3">Quantity <span className="sr-only">for {item.name}</span><input aria-label={`${item.name} quantity`} className="w-20 rounded border p-2" type="number" min={0} max={20} step={1} value={quantities[item.itemId] ?? 0} disabled={item.soldOut} onChange={event => setQuantities(current => ({ ...current, [item.itemId]: Number(event.target.value) }))} /></label>
      </div>) : <p>No drinks available.</p>}
      <label className="block space-y-2"><span className="font-semibold">Pickup time (Singapore)</span><select required aria-label="Pickup time (Singapore)" className="block w-full rounded border p-3" value={pickupAt} onChange={event => setPickupAt(event.target.value)} disabled={!slots.length}>
        <option value="">Select a pickup slot</option>{slots.map(slot => <option value={slot} key={slot}>{singaporeTime(slot)}</option>)}
      </select></label>
    </fieldset>
    {!slots.length && <p role="status">No valid pickup slots are available within the next seven dates.</p>}
    <p className="text-xl font-semibold">Total: {money(total)}</p>
    {message && <div role="alert" className="space-y-2 rounded-lg border p-4"><p>{message}</p><Link className="underline" href={`/customer/cafes/${encodeURIComponent(cafeId)}/pre-order`} onClick={() => router.refresh()}>Review current menu and pickup choices</Link></div>}
    <button className="rounded bg-black px-5 py-3 text-white disabled:opacity-50" disabled={busy || !slots.length || !menu.some(i => !i.soldOut)} type="submit">{busy ? 'Placing order…' : 'Place pre-order'}</button>
  </form>;
}
