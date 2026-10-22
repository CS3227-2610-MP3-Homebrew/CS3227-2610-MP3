// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { localSql } from "../../e2e/accounts/local";
import { scenario, asActor, insert, q } from "../moderation/fixtures";
import { sql } from "../schema/local-database";

test("CUS-04.1 CUS-04.4 CUS-04.5 CUS-04.6: direct RLS retains own suspended orders and items but hides same-workspace and other-kit history", () => {
  const f = scenario(); const foreign = scenario(); const id = randomUUID(), item = randomUUID();
  insert("public.menu_items", { id: item, cafe_id: f.cafe, name: "Synthetic" });
  insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id });
  insert("public.order_items", { id: randomUUID(), order_id: id, cafe_id: f.cafe, menu_item_id: item });
  localSql(`update public.cafes set suspended=true where id=${q(f.cafe)};`);
  for (const [table, filter] of [["orders", `id=${q(id)}`], ["order_items", `order_id=${q(id)}`]]) {
    const query = `select count(*) from public.${table} where ${filter};`;
    expect(asActor(f.customer.id, query)).toBe("1");
    for (const actor of [f.reader, foreign.customer, foreign.owner, foreign.admin]) expect(asActor(actor.id, query)).toBe("0");
  }
  expect(asActor(f.customer.id, `select count(*) from public.cafes where id=${q(f.cafe)};`)).toBe("0");
});
test("CUS-03.4 CUS-03.5 CUS-04.3: raw Customer or Admin SQL cannot forge ownership, attach foreign items or perform fulfilment", () => {
  const f = scenario(); const id = randomUUID(); const item = randomUUID();
  insert("public.menu_items", { id: item, cafe_id: f.cafe, name: "Synthetic" });
  insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.reader.id });
  for (const actor of [f.customer, f.admin]) for (const statement of [
    `update public.orders set state='collected' where id=${q(id)}`,
    `update public.orders set customer_id=${q(f.customer.id)} where id=${q(id)}`,
    `insert into public.orders(id,cafe_id,customer_id,state) values (${q(randomUUID())},${q(f.cafe)},${q(f.reader.id)},'accepted')`,
    `insert into public.order_items(id,order_id,cafe_id,menu_item_id) values (${q(randomUUID())},${q(id)},${q(f.cafe)},${q(item)})`,
  ]) {
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor.id }))}; set local request.jwt.claim.sub=${q(actor.id)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501|P0001|23514/);
  }
  expect(localSql(`select state from public.orders where id=${q(id)};`)).toBe("pending");
});
