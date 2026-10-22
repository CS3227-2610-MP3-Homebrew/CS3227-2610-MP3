import { orderGet, orderMethodNotAllowed } from '@/server/orders/http';
export async function GET(request: Request, context: { params: Promise<{ cafeId: string }> }) {
  return orderGet(request, 'slots', (await context.params).cafeId);
}
export const POST = () => orderMethodNotAllowed('GET, HEAD, OPTIONS');
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
