'use client';
import { useState } from 'react';
import type { OwnerOrder, OwnerAction } from '@/server/owner-orders/schema';
import { money, singaporeTime } from '@/app/customer/orders/presentation';

const labels: Record<OwnerOrder['state'], string> = { pending: 'New', accepted: 'Accepted', ready: 'Ready for pick up', collected: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const activeStates = new Set<OwnerOrder['state']>(['pending', 'accepted', 'ready']);
const events = [['placedAt', 'Placed'], ['pickupAt', 'Pickup'], ['acceptedAt', 'Accepted at'], ['readyAt', 'Ready at'], ['collectedAt', 'Collected at'], ['rejectedAt', 'Rejected at'], ['cancelledAt', 'Cancelled at']] as const;
const conflict = 'Order changed. Refresh to see its current state.';

export function QueueList({ initialOrders, active }: { initialOrders: OwnerOrder[]; active: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  // Reload the selected queue page after a conflict, keeping the announcement.
  async function reload() {
    try {
      const response = await fetch(`/api/owner/orders${window.location.search}`, { cache: 'no-store' });
      if (response.ok) setOrders((await response.json()).items);
    } catch { /* The conflict message already asks the owner to refresh. */ }
  }
  async function act(orderId: string, action: OwnerAction) {
    if (busy) return;
    setBusy(orderId); setMessage('');
    try {
      const response = await fetch(`/api/owner/orders/${encodeURIComponent(orderId)}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'reject' ? { reason } : {}),
      });
      const body = await response.json();
      if (response.ok) {
        const order: OwnerOrder = body.order;
        // Orders leaving the active view move to history.
        setOrders(current => active && !activeStates.has(order.state) ? current.filter(o => o.orderId !== orderId) : current.map(o => o.orderId === orderId ? order : o));
        setRejecting(null); setReason('');
      } else if (response.status === 409) { setMessage(conflict); await reload(); }
      else setMessage(typeof body.error?.message === 'string' ? body.error.message : 'Unable to update this order. Try again.');
    } catch { setMessage('Unable to confirm the update. Refresh to check the current order before trying again.'); }
    finally { setBusy(null); }
  }
  return <div className="space-y-6">{message && <p role="alert" className="rounded-lg border p-4">{message}</p>}
    {!orders.length && <p>No orders here.</p>}
    {orders.map(order => <article key={order.orderId} aria-label={`Order for ${order.customerName}`} className="space-y-4 rounded-xl border border-black/15 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{order.customerName}</h2><p className="break-all text-sm">Order {order.orderId}</p></div><p className="rounded border px-3 py-1">{labels[order.state]}</p></header>
      {order.cancellationReason && <p className="font-semibold">{order.cancellationReason}</p>}
      {order.state === 'rejected' && order.rejectionReason && <p className="whitespace-pre-wrap">Rejection reason: {order.rejectionReason}</p>}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{events.map(([key, label]) => order[key] && <div key={key}><dt className="font-semibold">{label}</dt><dd><time dateTime={order[key]!}>{singaporeTime(order[key]!)}</time></dd></div>)}</dl>
      <ul className="space-y-3">{order.items.map(item => <li key={item.itemId} className="border-t border-black/10 pt-3"><p className="font-semibold">{item.name}</p><p>{item.quantity} × {money(item.unitPriceCents)} each</p></li>)}</ul>
      <p className="text-lg font-semibold">Total: {money(order.totalCents)}</p><p className="text-sm">Payment at pickup.</p>
      <div className="flex flex-wrap gap-3">
        {order.state === 'pending' && <><button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null} onClick={() => act(order.orderId, 'accept')}>Accept order</button>
          <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null} onClick={() => { setRejecting(order.orderId); setReason(''); }}>Reject…</button></>}
        {order.state === 'accepted' && <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null} onClick={() => act(order.orderId, 'ready')}>Mark ready for pick up</button>}
        {order.state === 'ready' && <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null} onClick={() => act(order.orderId, 'collect')}>Mark collected</button>}
      </div>
      {rejecting === order.orderId && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void act(order.orderId, 'reject'); }}>
        <label className="block"><span className="font-semibold">Rejection reason</span> <span className="text-sm">(shown to the customer, up to 100 words)</span>
          <textarea required className="mt-1 block w-full rounded border p-2" value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className="flex gap-3"><button type="submit" className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null || !reason.trim()}>Confirm reject</button>
          <button type="button" className="rounded border px-4 py-2" onClick={() => setRejecting(null)}>Keep order</button></div>
      </form>}
    </article>)}
  </div>;
}
