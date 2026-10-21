// @vitest-environment node
import { describe, expect, test } from "vitest";
import { asActor, q, scenario, stored } from "./fixtures";
import { coreFixture, identifier as ident } from "../schema/local-database";

test("ADM-03.1: eligible café customer RLS returns pending and kept but excludes hidden", () => {
  const f = coreFixture(); const reviewIds = [];
  for (const state of ["pending", "kept", "hidden"]) {
    const order = f.fixture.row("orders", [f.customer, f.cafe]);
    const review = f.fixture.row("reviews", [order, f.customer], state === "pending" ? {} : { moderation_state: state });
    reviewIds.push(String(review.values.id));
  }
  const scope = reviewIds.map(q).join(",");
  const reader = String(f.kitCustomer.values.id); // Other-workspace control, separate from the author.
  const peer = f.fixture.profile(f.main, "customer");
  const claims = (id: string) => `set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: id }))}; set local request.jwt.claim.sub=${q(id)};`;
  const output = f.fixture.run(`update public.cafes set application_state='approved',suspended=false where id=${q(f.cafe.values.id)};
    select moderation_state from public.reviews where id=${q(reviewIds[0])};
    ${claims(String(peer.values.id))} select id from public.reviews where id in (${scope}) order by id;
    reset role; update public.cafes set suspended=true where id=${q(f.cafe.values.id)};
    ${claims(String(peer.values.id))} select count(*) from public.reviews where id in (${scope});
    reset role; ${claims(reader)} select count(*) from public.reviews where id in (${scope});`);
  expect(output.split("\n")).toEqual(["pending", ...reviewIds.slice(0, 2).sort(), "0", "0"]);
});
for (const role of ["customer", "admin"] as const) describe(role, () => {
  test("ADM-03.18: review text/rating edits and deletion are denied without changing the stored review", () => {
    const f = scenario(); const id = f.review(); const before = stored(id);
    for (const statement of [`update public.reviews set ${ident(f.reviewText)}='forged',rating=1 where id=${q(id)}`, `delete from public.reviews where id=${q(id)}`]) {
      // A denied SQL permission or zero affected rows both mean denied. A syntax/tooling error is not accepted.
      try { expect(asActor(f[role].id, `with changed as (${statement} returning 1) select count(*) from changed;`)).toBe("0"); }
      catch (error) {
        // localSql deliberately redacts SQL failures; verify via the verbose foundation harness below instead.
        if (!(error instanceof Error) || error.message !== "Local account fixture SQL failed; details omitted.") throw error;
        const { status, stderr } = sqlMutation(f[role].id, statement);
        expect(status).not.toBe(0); expect(stderr).toMatch(/42501|23514|P0001/);
      }
      expect(stored(id)).toEqual(before);
    }
  });
});
import { sql } from "../schema/local-database";
function sqlMutation(actor: string, statement: string) { return sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; ${statement}; rollback;`); }
