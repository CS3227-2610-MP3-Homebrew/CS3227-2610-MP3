import { money } from "@/app/customer/orders/presentation";

export const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export type TopItem = { rank: number; itemId: string; itemName: string; quantity: number; revenueCents: number };

/** OWN-06 top items; also the OWN-07 fallback view. Names render as inert text. */
export function TopItemsTable({ items }: { items: TopItem[] }) {
  if (!items.length) return <p>No completed sales in the last 28 days.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-1 pr-4">Rank</th><th className="py-1 pr-4">Item</th><th className="py-1 pr-4">Quantity</th><th className="py-1">Revenue</th></tr></thead>
    <tbody>{items.map(item => <tr key={item.itemId} className="border-t border-black/10"><td className="py-1 pr-4">{item.rank}</td><td className="py-1 pr-4 break-words">{item.itemName}</td><td className="py-1 pr-4">{item.quantity}</td><td className="py-1">{money(item.revenueCents)}</td></tr>)}</tbody></table></div>;
}
