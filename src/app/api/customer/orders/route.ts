import { orderGet, orderPost, orderMethodNotAllowed } from '@/server/orders/http';
export const GET = (request: Request) => orderGet(request, 'list');
export const POST = (request: Request) => orderPost(request, 'create');
export const PUT = () => orderMethodNotAllowed('GET, HEAD, POST, OPTIONS');
export const PATCH = PUT;
export const DELETE = PUT;
