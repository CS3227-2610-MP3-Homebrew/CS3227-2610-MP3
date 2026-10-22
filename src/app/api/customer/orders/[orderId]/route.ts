import { orderGet, orderMethodNotAllowed } from '@/server/orders/http';
export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  return orderGet(request, 'detail', (await context.params).orderId);
}
export const POST = () => orderMethodNotAllowed('GET, HEAD, OPTIONS');
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
