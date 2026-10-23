import { prepSheetGet, prepSheetMethodNotAllowed } from '@/server/owner/prep-sheet';
export const GET = (request: Request) => prepSheetGet(request);
export const POST = () => prepSheetMethodNotAllowed();
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
