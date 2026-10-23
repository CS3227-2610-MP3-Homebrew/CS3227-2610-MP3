import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { checkingAccount } from '@/app/_components/account-boundary';
import { readPrepSheet, type PrepSheet } from '@/server/owner/prep-sheet';
import { PrintButton } from './print-button';

// Singapore business time regardless of host or browser timezone.
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const time = (instant: string) => clock.format(new Date(instant));
// The print layout hides the shell's navigation along with this page's actions.
const printStyle = <style href="owner-prep-sheet-print" precedence="default">{'@media print{nav{display:none!important}}'}</style>;
const title = <h1 className="text-3xl font-semibold">Prep sheet</h1>;

function Sheet({ sheet }: { sheet: PrepSheet }) {
  const pending = sheet.pendingTodayCount > 0 && <p role="status">{sheet.pendingTodayCount} new orders for today are not included until accepted.</p>;
  return <section className="space-y-6">
    <header className="space-y-2">{title}
      <p>Business date <time dateTime={sheet.businessDate}>{sheet.businessDate}</time> (SGT) · Generated <time dateTime={sheet.generatedAt}>{time(sheet.generatedAt)}</time> SGT</p>
      <p className="text-sm">Accepted orders for pickup today. Reload to include orders accepted since this sheet was generated.</p>
      <div className="flex flex-wrap gap-4 print:hidden"><PrintButton /><Link className="self-center underline" href="/owner/orders">Back to Order queue</Link></div>
    </header>
    {pending}
    {sheet.orders.length === 0 ? <p>No accepted orders for today.</p> : <>
      <section aria-labelledby="prep-items-heading" className="space-y-3"><h2 id="prep-items-heading" className="text-xl font-semibold">Item totals</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-1 pr-4">Item</th><th className="py-1 pr-4">Quantity</th><th className="py-1">Orders</th></tr></thead>
          <tbody>{sheet.items.map(item => <tr key={item.itemId} className="border-t border-black/10"><td className="py-1 pr-4">{item.itemName}</td><td className="py-1 pr-4">{item.quantity}</td><td className="py-1">{item.orderCount}</td></tr>)}</tbody></table></div>
      </section>
      <section aria-labelledby="prep-orders-heading" className="space-y-3"><h2 id="prep-orders-heading" className="text-xl font-semibold">Orders ({sheet.orders.length})</h2>
        <ol className="space-y-3">{sheet.orders.map(order => <li key={order.orderId} className="break-inside-avoid border-t border-black/10 pt-2">
          <p className="font-semibold"><time dateTime={order.pickupAt}>{time(order.pickupAt)}</time> · {order.customerName}</p>
          <ul className="ml-4 list-disc">{order.items.map(line => <li key={line.itemId}>{line.quantity} × {line.name}</li>)}</ul>
        </li>)}</ol>
      </section>
    </>}
  </section>;
}

async function PrepSheetEntry() {
  await connection();
  let sheet: PrepSheet | null;
  try { sheet = await readPrepSheet(); }
  catch { return <section className="space-y-4">{title}<p role="alert">The prep sheet is temporarily unavailable. Try again.</p></section>; }
  if (!sheet) return <section className="space-y-4">{title}<p>You do not have a café yet, so there is nothing to prepare.</p>
    <Link className="inline-block rounded border px-4 py-2 underline" href="/owner/application">Apply for a café</Link></section>;
  return <>{printStyle}<Sheet sheet={sheet} /></>;
}
export default function Page() { return <Suspense fallback={checkingAccount}><PrepSheetEntry /></Suspense>; }
