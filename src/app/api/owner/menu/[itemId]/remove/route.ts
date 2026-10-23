import { ownerMenuMethodNotAllowed, ownerMenuPost } from "@/server/owner/menu-http";

export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  return ownerMenuPost(request, "remove", (await context.params).itemId);
}
export const GET = ownerMenuMethodNotAllowed("POST, OPTIONS");
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
