import type { Order } from '@/server/orders/schema';

export const customerOrderViews = ['all', 'active', 'past'] as const;
export type CustomerOrderView = typeof customerOrderViews[number];
const activeStates: readonly Order['state'][] = ['pending', 'accepted', 'ready'];
export function matchesOrderView(state: Order['state'], view: CustomerOrderView) {
  return view === 'all' || (view === 'active' ? activeStates.includes(state) : !activeStates.includes(state));
}
