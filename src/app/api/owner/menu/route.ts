import { ownerMenuGet, ownerMenuMethodNotAllowed, ownerMenuPost } from "@/server/owner/menu-http";

export const GET = (request: Request) => ownerMenuGet(request);
export const POST = (request: Request) => ownerMenuPost(request, "create");
export const PUT = ownerMenuMethodNotAllowed("GET, HEAD, POST, OPTIONS");
export const PATCH = PUT;
export const DELETE = PUT;
