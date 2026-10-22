import { queuePost, queueMethodNotAllowed } from '@/server/owner-orders/http';
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  return queuePost(request, 'accept', (await context.params).orderId);
}
export const GET = () => queueMethodNotAllowed('POST, OPTIONS');
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
