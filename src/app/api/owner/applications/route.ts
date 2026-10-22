import { ownerCafePost, ownerMethodNotAllowed } from "@/server/owner/http";

export const POST = (request: Request) => ownerCafePost(request, "application");
export const GET = ownerMethodNotAllowed("POST");
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
