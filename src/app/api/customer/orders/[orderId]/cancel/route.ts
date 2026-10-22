import { orderPost, orderMethodNotAllowed } from '@/server/orders/http';
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  return orderPost(request, 'cancel', (await context.params).orderId);
}
export const GET = () => orderMethodNotAllowed('POST, OPTIONS');
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
