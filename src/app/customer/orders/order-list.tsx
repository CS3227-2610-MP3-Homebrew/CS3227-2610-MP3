'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Order } from '@/server/orders/schema';
import { money, singaporeTime } from './presentation';

const events = [['placedAt', 'Placed'], ['pickupAt', 'Pickup'], ['acceptedAt', 'Accepted at'], ['readyAt', 'Ready at'], ['collectedAt', 'Collected at'], ['rejectedAt', 'Rejected at'], ['cancelledAt', 'Cancelled at']] as const;
export function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function cancel(orderId: string) {
    if (busy) return;
    setBusy(orderId); setMessage('');
    try {
      const response = await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json();
      if (response.ok) setOrders(current => current.map(order => order.orderId === orderId ? body.order : order));
      else setMessage(typeof body.error?.message === 'string' ? body.error.message : 'Unable to cancel this order. Refresh to check its current state.');
    } catch { setMessage('Unable to confirm cancellation. Refresh to check the current order before trying again.'); }
    finally { setBusy(null); }
  }
  return <div className="space-y-6">{message && <p role="alert" className="rounded-lg border p-4">{message}</p>}
    {!orders.length && <p>No orders yet.</p>}
    {orders.map(order => <article key={order.orderId} className="space-y-4 rounded-xl border border-black/15 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{order.cafeName}</h2><p className="break-all text-sm">Order {order.orderId}</p></div><p className="rounded border px-3 py-1 capitalize">{order.state}</p></header>
      {order.cancellationReason && <p className="font-semibold">{order.cancellationReason}</p>}
      {order.state === 'rejected' && order.rejectionReason && <p className="whitespace-pre-wrap">Rejection reason: {order.rejectionReason}</p>}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{events.map(([key, label]) => order[key] && <div key={key}><dt className="font-semibold">{label}</dt><dd><time dateTime={order[key]!}>{singaporeTime(order[key]!)}</time></dd></div>)}</dl>
      <ul className="space-y-3">{order.items.map(item => <li key={item.itemId} className="flex flex-wrap justify-between gap-2 border-t border-black/10 pt-3"><div><p className="font-semibold">{item.name}</p><p>{item.quantity} × {money(item.unitPriceCents)} each</p></div><p>{money(item.lineTotalCents)}</p></li>)}</ul>
      <p className="text-lg font-semibold">Total: {money(order.totalCents)}</p><p className="text-sm">Payment at pickup.</p>
      {order.state === 'collected' && <Link className="inline-block rounded border px-4 py-2 underline" href={`/customer/orders/${encodeURIComponent(order.orderId)}/review`}>Review order</Link>}
      {order.state === 'pending' && <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy !== null} onClick={() => cancel(order.orderId)}>{busy === order.orderId ? 'Updating…' : 'Cancel order'}</button>}
    </article>)}
  </div>;
}
