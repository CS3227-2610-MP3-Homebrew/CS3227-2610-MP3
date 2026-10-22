import { reviewGet, reviewPost, reviewMethodNotAllowed } from '@/server/reviews/customer-http';
type Context = { params: Promise<{ orderId: string }> };
export async function GET(request: Request, context: Context) { return reviewGet(request, (await context.params).orderId); }
export async function POST(request: Request, context: Context) { return reviewPost(request, (await context.params).orderId); }
export const PUT = reviewMethodNotAllowed;
export const PATCH = reviewMethodNotAllowed;
export const DELETE = reviewMethodNotAllowed;
export const OPTIONS = reviewMethodNotAllowed;
