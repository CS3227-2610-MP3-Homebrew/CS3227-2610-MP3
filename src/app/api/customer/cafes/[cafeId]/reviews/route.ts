import { catalogueGet, catalogueMethodNotAllowed } from '@/server/catalogue/http';
export async function GET(request: Request, context: { params: Promise<{ cafeId: string }> }) {
  return catalogueGet(request, 'reviews', (await context.params).cafeId);
}

export const POST = catalogueMethodNotAllowed;
export const PUT = catalogueMethodNotAllowed;
export const PATCH = catalogueMethodNotAllowed;
export const DELETE = catalogueMethodNotAllowed;
