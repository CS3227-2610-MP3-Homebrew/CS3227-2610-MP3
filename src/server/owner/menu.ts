import "server-only";
import { z } from "zod";
import { drinkTypes } from "@/lib/catalogue/query";
import { MENU_PAGE_SIZE, type MenuAction, type MenuInput, type MenuItem } from "@/lib/owner/menu-input";
import { createSessionClient } from "@/server/supabase/session-client";
import { OwnerCafeError } from "./source";

/** OWN-03 menu failures: approval and suspension 409s carry their own messages. */
export class OwnerMenuError extends OwnerCafeError {
  constructor(code: OwnerCafeError["code"], readonly conflict: "approval" | "suspension" | null = null) { super(code, conflict === "suspension"); }
}

const menuItem: z.ZodType<MenuItem> = z.strictObject({
  itemId: z.string().min(1).max(128), name: z.string(), drinkType: z.enum(drinkTypes),
  priceCents: z.number().int().min(1).max(1_000_000), soldOut: z.boolean(),
});
const failure = z.strictObject({ error: z.enum(["INVALID_REQUEST", "NOT_FOUND", "STATE_CONFLICT"]), approval: z.literal(true).optional(), suspension: z.literal(true).optional() });

/** Session-bound RPC: the database derives owner/workspace and applies RLS. */
async function rpc(name: string, args: Record<string, unknown>, mutation: boolean): Promise<unknown> {
  let client: Awaited<ReturnType<typeof createSessionClient>>;
  try { client = await createSessionClient({ retry: false }); }
  catch { throw new OwnerMenuError("SOURCE_UNAVAILABLE"); }
  try {
    const result = await client.rpc(name, args);
    if (result.error) {
      if (result.status === 401) throw new OwnerMenuError("UNAUTHENTICATED");
      if (result.error.code === "42501" || result.status === 403) throw new OwnerMenuError("FORBIDDEN");
      throw new OwnerMenuError(!mutation || result.status === 0 || [502, 503, 504].includes(result.status) ? "SOURCE_UNAVAILABLE" : "INTERNAL_ERROR");
    }
    const parsed = failure.safeParse(result.data);
    if (parsed.success) throw new OwnerMenuError(parsed.data.error, parsed.data.approval ? "approval" : parsed.data.suspension ? "suspension" : null);
    return result.data;
  } catch (error) {
    if (error instanceof OwnerMenuError) throw error;
    throw new OwnerMenuError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  }
}
function decode<T>(schema: z.ZodType<T>, value: unknown, mutation: boolean): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new OwnerMenuError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  return result.data;
}

/** One page of the owner's own menu; an owner without a café reads an empty page. */
export async function readOwnerMenu(page: number) {
  const items = decode(z.strictObject({ items: z.array(menuItem).max(MENU_PAGE_SIZE + 1) }), await rpc("owner_menu", { p_page: page }, false), false).items;
  return { items: items.slice(0, MENU_PAGE_SIZE), page, pageSize: MENU_PAGE_SIZE, hasNextPage: items.length > MENU_PAGE_SIZE };
}

export async function writeOwnerMenu(action: MenuAction, itemId: string | null, input: MenuInput) {
  const data = await rpc("owner_menu_write", { p_action: action, p_item_ref: itemId, p_input: input }, true);
  if (action === "remove") return decode(z.strictObject({ removed: z.literal(true) }), data, true);
  return decode(z.strictObject({ item: menuItem }), data, true);
}
