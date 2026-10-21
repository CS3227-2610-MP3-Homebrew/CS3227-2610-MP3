import "server-only";
import { z } from "zod";

const queueSizeSetting = z.string().regex(/^\d+$/).transform(Number)
  .pipe(z.number().int().min(1).max(20));

/** Reject invalid policy without exposing configuration or validation details. */
export function queueSize() {
  const parsed = queueSizeSetting.safeParse(process.env.AI_MODERATION_REVIEWS_PER_CALL);
  if (!parsed.success) throw new Error("Queue configuration unavailable.");
  return parsed.data;
}
