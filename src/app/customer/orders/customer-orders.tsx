'use client';
import { useRouter } from 'next/navigation';
import type { Order } from '@/server/orders/schema';
import type { CustomerOrderView } from '@/lib/orders/views';
import { OrderList } from './order-list';

export function CustomerOrders({ initialOrders, view }: { initialOrders: Order[]; view: CustomerOrderView }) {
  const router = useRouter();
  return <OrderList initialOrders={initialOrders} view={view} onOrderChanged={view === 'active' ? () => router.refresh() : undefined} />;
}
