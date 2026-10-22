import { salesGet, salesMethodNotAllowed } from '@/server/owner/sales';
export const GET = (request: Request) => salesGet(request);
export const POST = () => salesMethodNotAllowed();
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
