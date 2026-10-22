import { ownerCafeGet, ownerMethodNotAllowed } from "@/server/owner/http";

export const GET = (request: Request) => ownerCafeGet(request);
export const POST = ownerMethodNotAllowed("GET, HEAD");
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
