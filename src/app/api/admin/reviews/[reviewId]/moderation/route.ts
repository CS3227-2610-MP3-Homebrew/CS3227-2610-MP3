import { handleModeration } from "@/server/reviews/moderation";

const handle = async (request: Request, context: { params: Promise<{ reviewId: string }> }) => handleModeration(request, (await context.params).reviewId);
export { handle as POST, handle as GET, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
