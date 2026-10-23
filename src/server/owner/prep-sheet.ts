import 'server-only';
import { z } from 'zod';
import { getVerifiedActor } from '@/server/auth/session';
import { privateResponses } from '@/server/http/json';
import { createSessionClient } from '@/server/supabase/session-client';
import { count, date, ref } from '@/server/llm/schemas';

const instant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
export const prepSheetSchema = z.strictObject({
  businessDate: date, generatedAt: instant,
  items: z.array(z.strictObject({ itemId: ref, itemName: z.string(), quantity: count, orderCount: count })),
  orders: z.array(z.strictObject({ orderId: ref, pickupAt: instant, customerName: z.string(),
    items: z.array(z.strictObject({ itemId: ref, name: z.string(), quantity: z.number().int().min(1).max(20) })) })),
  pendingTodayCount: count,
});
export type PrepSheet = z.infer<typeof prepSheetSchema>;

export class PrepSheetSourceError extends Error {}
/** Today's accepted own-café orders under session RLS; null only when the owner has no café. */
export async function readPrepSheet(): Promise<PrepSheet | null> {
  let data: unknown;
  try {
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc('owner_prep_sheet');
    if (result.error) throw new PrepSheetSourceError();
    data = result.data;
  } catch { throw new PrepSheetSourceError(); }
  const parsed = z.strictObject({ prepSheet: prepSheetSchema.nullable() }).safeParse(data);
  if (!parsed.success) throw new PrepSheetSourceError();
  return parsed.data.prepSheet;
}

export async function prepSheetGet(request: Request) {
  const { json, error } = privateResponses();
  try {
    const actor = await getVerifiedActor();
    if (!actor) return error(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    if (actor.role !== 'owner') return error(403, 'FORBIDDEN', 'Café owner access required.');
    if ([...new URL(request.url).searchParams].length || request.body) return error(400, 'INVALID_REQUEST', 'Prep sheet reads take no parameters.');
    return json({ prepSheet: await readPrepSheet() });
  } catch { return error(503, 'SOURCE_UNAVAILABLE', 'The prep sheet is temporarily unavailable. Try again.'); }
}
export const prepSheetMethodNotAllowed = () => privateResponses().error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: 'GET, HEAD, OPTIONS' });
