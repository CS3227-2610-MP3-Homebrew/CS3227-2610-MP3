import { randomUUID } from "node:crypto";
import { insert, q, rows } from "../moderation/fixtures";
import { arrangeCafe, cafeRow } from "../owner-cafe/fixtures";
export { asActor, q, rows } from "../moderation/fixtures";
export { arrangeCafe, cafeRow, decide, suspend, workspace, type Workspace } from "../owner-cafe/fixtures";

/** T-56 owner menu fixtures: local synthetic workspaces, cafés and menu rows only.
 * Every arranged row stays inside the schema CHECK constraints: drink_type is a
 * shared DrinkType, price_cents is 1..1,000,000 and names are 2..100 code points,
 * unique per café after whitespace removal and Unicode lowercasing. */
export const origin = "http://127.0.0.1:3100";
export const routes = {
  menu: "/api/owner/menu",
  item: (id: string) => `/api/owner/menu/${encodeURIComponent(id)}`,
  remove: (id: string) => `/api/owner/menu/${encodeURIComponent(id)}/remove`,
} as const;
export const approvalConflict = "Menu changes are available once your café is approved.";
export const suspensionConflict = "Cafe suspension status changed. Review the application page.";
export const drinkTypes = ["coffee", "matcha", "tea", "chocolate", "juice", "other"] as const;
export type DrinkType = typeof drinkTypes[number];
export type MenuItem = { itemId: string; name: string; drinkType: DrinkType; priceCents: number; soldOut: boolean };
export const menuItemKeys = ["drinkType", "itemId", "name", "priceCents", "soldOut"];
export const pageKeys = ["hasNextPage", "items", "page", "pageSize", "requestId"];

/** Arrange one stored menu row as the authoritative result of an earlier owner save. */
export function arrangeItem(cafe: string, options: { name?: string; drinkType?: DrinkType; priceCents?: number; soldOut?: boolean } = {}) {
  const id = randomUUID();
  insert("public.menu_items", { id, cafe_id: cafe, name: options.name ?? `Item ${id.slice(0, 8)}`, drink_type: options.drinkType ?? "coffee",
    price_cents: options.priceCents ?? 450, sold_out: options.soldOut ?? false });
  return id;
}
/** An owner café in the requested application state, optionally suspended (approved only). */
export function cafeIn(owner: { id: string; workspaceId: string }, state: "pending" | "approved" | "rejected", suspended = false) {
  return arrangeCafe(owner, { state, suspended });
}
export const itemRow = (id: string) => rows(`select id,cafe_id,name,drink_type,price_cents,sold_out from public.menu_items where id=${q(id)}`)[0];
export const cafeItems = (cafe: string) => rows(`select id,cafe_id,name,drink_type,price_cents,sold_out from public.menu_items where cafe_id=${q(cafe)} order by id`);
/** Every stored effect a menu operation could have on one café: its menu rows and its approval/suspension state. */
export function menuSnapshot(cafe: string) {
  const c = cafeRow(cafe);
  return { items: cafeItems(cafe), cafe: { application_state: c.application_state, suspended: c.suspended, suspension_version: c.suspension_version } };
}
/** Unicode code point comparison, as specified for menu ordering. */
export function codePointCompare(a: string, b: string) {
  const x = Array.from(a); const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!; if (d) return d; }
  return x.length - y.length;
}
