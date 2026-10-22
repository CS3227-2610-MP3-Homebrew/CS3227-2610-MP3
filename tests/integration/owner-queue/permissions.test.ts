// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { localSql } from "../../e2e/accounts/local";
import { asActor, insert, q, scenario } from "../moderation/fixtures";
import { sql } from "../schema/local-database";

function order(f: ReturnType<typeof scenario>, state = "pending") {
  const id = randomUUID(); insert("public.orders", { id, cafe_id: f.cafe, customer_id: f.customer.id, state }); return id;
}
function asOwner(actor: string, statement: string) {
  return sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
}

test("OWN-05.8 OWN-05.10: direct RLS discloses only the owner's own café orders inside its workspace", () => {
  const f = scenario(); const foreign = scenario(); const main = scenario(false);
  const own = order(f); const other = order(foreign); const mainOrder = order(main);
  const count = (id: string) => `select count(*) from public.orders where id=${q(id)};`;
  expect(asActor(f.owner.id, count(own))).toBe("1");
  for (const id of [other, mainOrder]) expect(asActor(f.owner.id, count(id))).toBe("0");
  expect(asActor(main.owner.id, count(own))).toBe("0");
});
test("OWN-05.4 OWN-05.8: raw owner SQL cannot perform transitions, rewrite snapshots or revive terminal orders", () => {
  const f = scenario(); const pending = order(f); const cancelled = order(f, "cancelled");
  for (const statement of [
    `update public.orders set state='accepted' where id=${q(pending)}`,
    `update public.orders set state='pending' where id=${q(cancelled)}`,
    `update public.orders set total_cents=1 where id=${q(pending)}`,
    `delete from public.orders where id=${q(pending)}`,
  ]) {
    const result = asOwner(f.owner.id, statement);
    if (result.status === 0) expect(result.stdout).toBe("0"); else expect(result.stderr).toMatch(/42501|P0001|23514/);
  }
  expect(localSql(`select state from public.orders where id=${q(pending)};`)).toBe("pending");
  expect(localSql(`select state from public.orders where id=${q(cancelled)};`)).toBe("cancelled");
});
