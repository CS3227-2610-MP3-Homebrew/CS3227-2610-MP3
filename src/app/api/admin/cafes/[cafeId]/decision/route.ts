import { handleCafeAction } from "@/server/cafes/admin";

const handle = async (request: Request, context: { params: Promise<{ cafeId: string }> }) => handleCafeAction(request, (await context.params).cafeId, "decision");
export { handle as POST, handle as GET, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
