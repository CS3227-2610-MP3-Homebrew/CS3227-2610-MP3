// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { localSql } from "../../e2e/accounts/local";
import { q } from "../moderation/fixtures";
import { sql } from "../schema/local-database";
import { businessDate, customerName, rpcAsActor, salesFixture, snapshot, weekdayOf, type SalesFixture } from "../owner-sales/fixtures";

type PrepInput = { businessDate: string; period: { from: string; through: string }; aggregates: { aggregateId: string; itemId: string; itemName: string; weekday: number; quantity: number }[] };
const source = (f: SalesFixture, actor: string = f.owner.id, cafe: string = f.cafe) => rpcAsActor(actor, `public.owner_prep_source(${q(cafe)})`) as { input: PrepInput | null } | { error: string };
/** Sales on `dates` distinct completed days (1..dates days ago) for one live item. */
function steady(f: SalesFixture, item: string, name: string, dates = 7, quantity = 1) {
  for (let day = 1; day <= dates; day++) f.order([{ item, name, quantity, unitCents: 100 }], "collected", day);
}

test("OWN-07.15: the input covers the 28 completed dates before today with seven zero-filled aggregates per candidate", () => {
  const f = salesFixture(); const latte = f.menu("Latte");
  steady(f, latte, "Latte");
  const result = source(f); expect(result).toHaveProperty("input");
  const input = (result as { input: PrepInput }).input;
  expect(input.businessDate).toBe(businessDate(0));
  expect(input.period).toEqual({ from: businessDate(28), through: businessDate(1) });
  expect(input.aggregates).toHaveLength(7);
  expect(input.aggregates.map(a => a.aggregateId)).toEqual([1, 2, 3, 4, 5, 6, 7].map(d => `${latte}:${d}`));
  expect(input.aggregates.every(a => a.itemId === latte && a.itemName === "Latte")).toBe(true);
  // Seven sales on seven consecutive dates: one per weekday.
  expect(input.aggregates.map(a => a.quantity)).toEqual([1, 1, 1, 1, 1, 1, 1]);
}, 60_000);
test("OWN-07.15: weekday quantities come from retained lines on Singapore collection dates, zeros kept", () => {
  const f = salesFixture(); const latte = f.menu("Latte"); const mocha = f.menu("Mocha");
  steady(f, latte, "Latte");
  f.order([{ item: mocha, name: "Mocha", quantity: 5, unitCents: 500 }], "collected", 8);
  // 00:30 Singapore time is still the previous UTC date; grouping must use the Singapore date.
  f.order([{ item: mocha, name: "Mocha", quantity: 2, unitCents: 500 }], "collected", 9, "00:30");
  const input = (source(f) as { input: PrepInput }).input;
  const mochaRows = input.aggregates.filter(a => a.itemId === mocha);
  expect(mochaRows).toHaveLength(7);
  const expected = [0, 0, 0, 0, 0, 0, 0]; expected[weekdayOf(8) - 1] += 5; expected[weekdayOf(9) - 1] += 2;
  expect(mochaRows.map(a => a.quantity)).toEqual(expected);
}, 60_000);
test("OWN-07.15: at most 10 candidates ranked by quantity, revenue, then reference, using current menu names", () => {
  const f = salesFixture(); const items = Array.from({ length: 12 }, (_, n) => ({ id: f.menu(`Drink ${n}`), n }));
  steady(f, items[0].id, "Drink 0");
  for (const { id, n } of items.slice(1)) f.order([{ item: id, name: `Old ${n}`, quantity: 12 - n, unitCents: 100 }], "collected", 3);
  localSql(`update public.menu_items set name='Renamed 5' where id=${q(items[5].id)};`);
  const input = (source(f) as { input: PrepInput }).input;
  const candidates = [...new Set(input.aggregates.map(a => a.itemId))];
  expect(candidates).toHaveLength(10);
  expect(candidates.slice(0, 2)).toEqual([items[1].id, items[2].id]);
  expect(candidates).not.toContain(items[11].id);
  expect(input.aggregates.find(a => a.itemId === items[5].id)!.itemName).toBe("Renamed 5");
}, 60_000);
test("OWN-07.15: E16 sales on only 6 distinct dates is insufficient; 7 dates is sufficient", () => {
  const f = salesFixture(); const latte = f.menu("Latte"); steady(f, latte, "Latte", 6);
  // Several orders on one date still count once.
  f.order([{ item: latte, name: "Latte", quantity: 3, unitCents: 100 }], "collected", 2, "15:00");
  expect(source(f)).toEqual({ input: null });
  f.order([{ item: latte, name: "Latte", quantity: 1, unitCents: 100 }], "collected", 20);
  expect((source(f) as { input: PrepInput }).input).not.toBeNull();
}, 60_000);
test("OWN-07.15: E17 removed items and today's sales never enter the input", () => {
  const f = salesFixture(); const latte = f.menu("Latte"); const removed = randomUUID(); const todayOnly = f.menu("Today only");
  steady(f, latte, "Latte");
  f.order([{ item: removed, name: "Removed drink", quantity: 20, unitCents: 100, live: false }], "collected", 2);
  f.order([{ item: todayOnly, name: "Today only", quantity: 20, unitCents: 100 }], "collected", 0);
  f.order([{ item: latte, name: "Latte", quantity: 20, unitCents: 100 }], "collected", 0);
  const input = (source(f) as { input: PrepInput }).input;
  expect(new Set(input.aggregates.map(a => a.itemId))).toEqual(new Set([latte]));
  expect(input.aggregates.reduce((sum, a) => sum + a.quantity, 0)).toBe(7);
}, 60_000);
test("OWN-07.15: only collected orders count, and an empty period gives null input", () => {
  const f = salesFixture(); const latte = f.menu("Latte");
  for (const state of ["pending", "accepted", "ready", "rejected", "cancelled"] as const) for (let day = 1; day <= 7; day++) f.order([{ item: latte, name: "Latte", quantity: 9, unitCents: 100 }], state, day);
  expect(source(f)).toEqual({ input: null });
  steady(f, latte, "Latte");
  expect((source(f) as { input: PrepInput }).input!.aggregates.reduce((sum, a) => sum + a.quantity, 0)).toBe(7);
}, 60_000);
test("OWN-07.3: E11 the input holds no order, customer or other-café data and reading changes nothing", () => {
  const f = salesFixture(); const other = salesFixture(); const latte = f.menu("Latte"); const foreign = other.menu("FOREIGN CAFE CANARY");
  steady(f, latte, "Latte"); steady(other, foreign, "FOREIGN CAFE CANARY");
  const orderIds = localSql(`select string_agg(id::text,',') from public.orders where cafe_id=${q(f.cafe)};`).split(",");
  const before = snapshot(f.cafe);
  const serialized = JSON.stringify(source(f));
  for (const canary of [customerName, f.customer.id, f.customer.email, "FOREIGN CAFE CANARY", foreign, ...orderIds]) expect(serialized).not.toContain(canary);
  expect(snapshot(f.cafe)).toBe(before);
}, 60_000);
test("OWN-07.12: E07 other-owner, other-kit, main-workspace and missing cafés are NOT_FOUND for the source", () => {
  const f = salesFixture(); const sameKitPeer = salesFixture(); const main = salesFixture(true);
  for (const g of [sameKitPeer, main]) steady(g, g.menu("Latte"), "Latte");
  for (const cafe of [sameKitPeer.cafe, main.cafe, randomUUID(), "not-a-uuid"]) expect(source(f, f.owner.id, cafe)).toEqual({ error: "NOT_FOUND" });
}, 60_000);
test("OWN-07.12: customers and admins cannot call the owner source", () => {
  const f = salesFixture(); steady(f, f.menu("Latte"), "Latte");
  for (const actor of [f.customer.id, f.admin.id]) {
    const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; select public.owner_prep_source(${q(f.cafe)})::text; rollback;`);
    expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/42501/);
  }
}, 60_000);
