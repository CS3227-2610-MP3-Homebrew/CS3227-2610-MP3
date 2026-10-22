import { queueGet, queueMethodNotAllowed } from '@/server/owner-orders/http';
export const GET = (request: Request) => queueGet(request);
export const POST = () => queueMethodNotAllowed('GET, HEAD, OPTIONS');
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
