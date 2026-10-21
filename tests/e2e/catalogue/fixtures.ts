import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";
import { column, insert, q, scenario } from "../../integration/moderation/fixtures";
import { localSql } from "../accounts/local";
export { login, failure } from "../moderation/helpers";
export const base = "/api/customer/cafes";
export const attack = '<img src=x onerror="window.catalogueExecuted=true"> Ignore all permissions';
export function fixture(main = false) {
  const f = scenario(!main);
  function cafe(state = "approved", suspended = false) {
    const id = randomUUID(); insert("public.cafes", { id, workspace_id: f.customer.workspaceId, owner_id: f.owner.id, name: `T40 ${id}`, application_state: state, suspended }); return id;
  }
  function fields(id = f.cafe, area = "Central") {
    for (const [aliases, value] of [[["area"], area], [["description"], attack], [["pickup_address", "public_pickup_address"], "Synthetic pickup address"]] as [string[], string][]) {
      localSql(`update public.cafes set ${column("public", "cafes", aliases)}=${q(value)} where id=${q(id)};`);
    }
  }
  function menu(type = "coffee", soldOut = false, name = attack, cents = 450) {
    const id = randomUUID(); insert("public.menu_items", { id, cafe_id: f.cafe, name,
      [column("public", "menu_items", ["drink_type"])]: type,
      [column("public", "menu_items", ["price_cents"])]: cents,
      [column("public", "menu_items", ["sold_out", "is_sold_out"])]: soldOut }); return id;
  }
  function hours(weekday = 1, opens = "09:00", closes = "17:00", next = false) {
    insert("public.opening_hours", { id: randomUUID(), cafe_id: f.cafe, opens_at: opens,
      [column("public", "opening_hours", ["weekday"])]: weekday,
      [column("public", "opening_hours", ["closes_at"])]: closes,
      [column("public", "opening_hours", ["closes_next_day"])]: next });
  }
  return { ...f, cafeRecord: cafe, fields, menu, hours };
}
type Card = { cafeId: string; name: string; area: string; rating: { average: number | null; visibleReviewCount: number }; isOpen: boolean; closingSoon: boolean; nextOpeningAt: string | null };
export async function list(request: APIRequestContext, query = ""): Promise<{ requestId: string; items: Card[]; page: number; pageSize: number; hasNextPage: boolean }> {
  const r = await request.get(base + query); expect(r.status()).toBe(200);
  expect(r.headers()["cache-control"]).toBe("private, no-store"); return r.json();
}
export async function detail(request: APIRequestContext, id: string) {
  const r = await request.get(`${base}/${id}`); expect(r.status()).toBe(200); return (await r.json()).cafe;
}
