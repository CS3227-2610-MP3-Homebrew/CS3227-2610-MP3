// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { sql } from "../schema/local-database";
import { arrangeItem, asActor, cafeIn, cafeItems, menuSnapshot, q, suspend, workspace } from "./fixtures";

/** Direct session-RLS attempt: denial is zero affected rows or a privilege/check error, never a write. */
function denied(actor: string, statement: string) {
  const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
  if (result.status === 0) expect(result.stdout, statement).toBe("0"); else expect(result.stderr, statement).toMatch(/42501|P0001|23514|23503|23505/);
}
const count = (actor: string, query: string) => asActor(actor, `select count(*) from (${query}) t;`);
/** Privileged local fixture write; a CHECK violation proves the value cannot be persisted. */
function rejectedByStorage(statement: string) {
  const result = sql(statement);
  expect(result.status, statement).not.toBe(0);
  expect(result.stderr, statement).toMatch(/23514|22P02|22003/);
}

test("OWN-03.1 OWN-03.8: direct menu reads expose a café's items to its owner in every application state, never to other owners or other workspaces", () => {
  const f = workspace(); const outside = workspace(false);
  const cafes = { pending: cafeIn(f.owner, "pending"), rejected: cafeIn(f.other, "rejected") };
  const approvedOwner = workspace(); const approved = cafeIn(approvedOwner.owner, "approved");
  const suspendedOwner = workspace(); const suspended = cafeIn(suspendedOwner.owner, "approved"); suspend(suspendedOwner, suspended, true, "Synthetic suspension");
  const cases = [[f.owner, cafes.pending, [f.other, f.customer]], [f.other, cafes.rejected, [f.owner, f.customer]],
    [approvedOwner.owner, approved, [approvedOwner.other]], [suspendedOwner.owner, suspended, [suspendedOwner.other, suspendedOwner.customer]]] as const;
  for (const [owner, cafe, strangers] of cases) {
    arrangeItem(cafe, { name: "Visible Latte" }); arrangeItem(cafe, { name: "Sold Out Mocha", soldOut: true });
    const query = `select id from public.menu_items where cafe_id=${q(cafe)}`;
    expect(count(owner.id, query), query).toBe("2");
    for (const actor of [...strangers, outside.owner, outside.customer, outside.admin]) expect(count(actor.id, query), query).toBe("0");
  }
}, 180_000);

test("OWN-03.8: other owners, Customers and Admins cannot create, change or remove a café's menu items through direct writes", () => {
  const f = workspace(); const outside = workspace(false);
  const cafe = cafeIn(f.owner, "approved"); const item = arrangeItem(cafe, { name: "Protected Flat White", priceCents: 520 });
  const before = menuSnapshot(cafe);
  for (const actor of [f.other, f.customer, f.admin, outside.owner, outside.customer, outside.admin]) for (const statement of [
    `update public.menu_items set name='Hijacked',price_cents=1,sold_out=true,drink_type='tea' where id=${q(item)}`,
    `delete from public.menu_items where id=${q(item)}`,
    `insert into public.menu_items(id,cafe_id,name,drink_type,price_cents,sold_out) values (${q(randomUUID())},${q(cafe)},'Injected Item','coffee',100,false)`,
  ]) { denied(actor.id, statement); expect(menuSnapshot(cafe)).toEqual(before); }
}, 180_000);

test("OWN-03.8: a forged item-parent relation is denied by RLS; owners cannot move items between cafés or insert into another café", () => {
  const f = workspace(); const outside = workspace(false);
  const own = cafeIn(f.owner, "approved"); const foreign = cafeIn(f.other, "approved"); const alien = cafeIn(outside.owner, "approved");
  const ownItem = arrangeItem(own, { name: "Own Cortado" }); const foreignItem = arrangeItem(foreign, { name: "Foreign Cortado" });
  const before = [menuSnapshot(own), menuSnapshot(foreign), menuSnapshot(alien)];
  for (const statement of [
    `update public.menu_items set cafe_id=${q(foreign)} where id=${q(ownItem)}`,
    `update public.menu_items set cafe_id=${q(alien)} where id=${q(ownItem)}`,
    `update public.menu_items set cafe_id=${q(own)} where id=${q(foreignItem)}`,
    `update public.menu_items set name='Taken Over' where id=${q(foreignItem)}`,
    `insert into public.menu_items(id,cafe_id,name,drink_type,price_cents,sold_out) values (${q(randomUUID())},${q(foreign)},'Forged Parent','coffee',100,false)`,
    `insert into public.menu_items(id,cafe_id,name,drink_type,price_cents,sold_out) values (${q(randomUUID())},${q(alien)},'Forged Workspace','coffee',100,false)`,
    `delete from public.menu_items where id=${q(foreignItem)}`,
  ]) {
    denied(f.owner.id, statement);
    expect([menuSnapshot(own), menuSnapshot(foreign), menuSnapshot(alien)]).toEqual(before);
  }
}, 180_000);

test("OWN-03.9: an owner whose café is pending or rejected cannot create, change or remove its own menu items through direct writes", () => {
  for (const state of ["pending", "rejected"] as const) {
    const f = workspace(); const cafe = cafeIn(f.owner, state);
    const item = arrangeItem(cafe, { name: `${state} Espresso`, priceCents: 300 });
    const before = menuSnapshot(cafe);
    for (const statement of [
      `update public.menu_items set name='Changed While Unapproved' where id=${q(item)}`,
      `update public.menu_items set price_cents=999,sold_out=true,drink_type='tea' where id=${q(item)}`,
      `delete from public.menu_items where id=${q(item)}`,
      `insert into public.menu_items(id,cafe_id,name,drink_type,price_cents,sold_out) values (${q(randomUUID())},${q(cafe)},'Created While Unapproved','coffee',100,false)`,
    ]) { denied(f.owner.id, statement); expect(menuSnapshot(cafe)).toEqual(before); }
  }
}, 180_000);

test("OWN-03.3 OWN-03.4: stored menu rows cannot hold an unknown drink type or a price outside 1 to 1,000,000 cents", () => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved");
  const item = arrangeItem(cafe, { name: "Bounded Item", priceCents: 450, drinkType: "matcha" });
  const before = cafeItems(cafe);
  for (const [column, value] of [["price_cents", "0"], ["price_cents", "1000001"], ["price_cents", "-1"], ["drink_type", "'Coffee'"], ["drink_type", "'smoothie'"], ["drink_type", "''"]] as const) {
    rejectedByStorage(`update public.menu_items set ${column}=${value} where id=${q(item)};`);
    rejectedByStorage(`insert into public.menu_items(id,cafe_id,name,drink_type,price_cents,sold_out) values (${q(randomUUID())},${q(cafe)},'Out Of Bounds',${column === "drink_type" ? value : "'coffee'"},${column === "price_cents" ? value : "100"},false);`);
    expect(cafeItems(cafe)).toEqual(before);
  }
  // Both inclusive bounds and every shared drink type are storable.
  for (const [cents, type] of [[1, "coffee"], [1_000_000, "chocolate"], [2, "juice"], [3, "tea"], [4, "other"], [5, "matcha"]] as const) arrangeItem(cafe, { name: `Bound ${cents} ${type}`, priceCents: cents, drinkType: type });
  expect(cafeItems(cafe)).toHaveLength(7);
}, 120_000);
