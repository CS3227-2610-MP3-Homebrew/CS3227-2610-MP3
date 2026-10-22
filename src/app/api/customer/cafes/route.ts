import { catalogueGet, catalogueMethodNotAllowed } from '@/server/catalogue/http';
export async function GET(request: Request) { return catalogueGet(request, 'browse'); }

export const POST = catalogueMethodNotAllowed;
export const PUT = catalogueMethodNotAllowed;
export const PATCH = catalogueMethodNotAllowed;
export const DELETE = catalogueMethodNotAllowed;
