// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { sql } from "../schema/local-database";
import { asActor, q } from "../moderation/fixtures";
import { arrangeCafe, decide, interval, snapshot, suspend, workspace } from "./fixtures";

/** Direct session-RLS attempt: denial is zero affected rows or a privilege/check error, never a write. */
function denied(actor: string, statement: string) {
  const result = sql(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: "authenticated", sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
  if (result.status === 0) expect(result.stdout, statement).toBe("0"); else expect(result.stderr, statement).toMatch(/42501|P0001|23514|23503|23505/);
}
const count = (actor: string, query: string) => asActor(actor, `select count(*) from (${query}) t;`);

test("OWN-01.1 OWN-01.6 OWN-02.8 OWN-04.8: direct reads expose a pending café, its hours and decision reason only to its owner, never other owners, Customers or other workspaces", () => {
  const f = workspace(); const outside = workspace(false);
  const cafe = arrangeCafe(f.owner, { state: "pending", hours: [interval(1, "09:00", "12:00")] }); decide(f, cafe, "reject", "Private rejection reason");
  const queries = [`select id from public.cafes where id=${q(cafe)}`, `select id from public.opening_hours where cafe_id=${q(cafe)}`, `select cafe_id from public.cafe_admin_reasons where cafe_id=${q(cafe)}`];
  for (const query of queries) {
    expect(count(f.owner.id, query), query).toBe("1");
    for (const actor of [f.other, f.customer, outside.owner, outside.customer, outside.admin]) expect(count(actor.id, query), query).toBe("0");
  }
}, 120_000);

test("OWN-01.4 OWN-02.7 OWN-04.7: owners cannot self-approve, clear suspension, change the suspension version or transfer their café through direct writes", () => {
  const f = workspace(); const other = workspace();
  const pending = arrangeCafe(f.owner, { state: "pending" });
  const suspended = arrangeCafe(f.other, { state: "pending" }); decide(f, suspended, "approve", "Approved"); suspend(f, suspended, true, "Suspended");
  for (const [actor, cafe] of [[f.owner, pending], [f.other, suspended]] as const) {
    const before = snapshot(cafe);
    for (const statement of [
      `update public.cafes set application_state='approved' where id=${q(cafe)}`,
      `update public.cafes set suspended=false where id=${q(cafe)}`,
      `update public.cafes set suspension_version=suspension_version+1 where id=${q(cafe)}`,
      `update public.cafes set owner_id=${q(f.customer.id)} where id=${q(cafe)}`,
      `update public.cafes set workspace_id=${q(other.workspaceId)} where id=${q(cafe)}`,
      `update public.cafes set submitted_at='2000-01-01T00:00:00Z' where id=${q(cafe)}`,
      `insert into public.cafe_admin_reasons(cafe_id,decision,decision_reason,decided_at) values (${q(cafe)},'approve','Forged',now()) on conflict (cafe_id) do update set decision='approve',decision_reason='Forged'`,
      `update public.cafe_admin_reasons set suspension_reason=null,decision='approve' where cafe_id=${q(cafe)}`,
      `delete from public.cafe_admin_reasons where cafe_id=${q(cafe)}`,
    ]) { denied(actor.id, statement); expect(snapshot(cafe)).toEqual(before); }
  }
  // A direct insert cannot create an approved or another owner's café.
  for (const statement of [
    `insert into public.cafes(id,workspace_id,owner_id,name,application_state,suspended) values (${q(randomUUID())},${q(f.workspaceId)},${q(f.customer.id)},'Forged owner','pending',false)`,
    `insert into public.cafes(id,workspace_id,owner_id,name,application_state,suspended) values (${q(randomUUID())},${q(f.workspaceId)},${q(f.owner.id)},'Self approved','approved',false)`,
    `insert into public.cafes(id,workspace_id,owner_id,name,application_state,suspended) values (${q(randomUUID())},${q(other.workspaceId)},${q(f.owner.id)},'Other workspace','pending',false)`,
  ]) denied(f.owner.id, statement);
  expect(asActor(f.owner.id, `select count(*) from public.cafes where owner_id=${q(f.owner.id)};`)).toBe("1");
}, 120_000);

test("OWN-01.6 OWN-02.8 OWN-04.8: foreign owners in the same workspace or another kit cannot change a café's profile, hours or cutoff directly", () => {
  const f = workspace(); const outside = workspace(false);
  const cafe = arrangeCafe(f.owner, { state: "approved", hours: [interval(2, "09:00", "12:00")] }); const before = snapshot(cafe);
  for (const actor of [f.other, f.customer, f.admin, outside.owner, outside.admin]) for (const statement of [
    `update public.cafes set description='Hijacked',pickup_cutoff_minutes=0 where id=${q(cafe)}`,
    `update public.opening_hours set opens_at='00:00',closes_at='23:59' where cafe_id=${q(cafe)}`,
    `delete from public.opening_hours where cafe_id=${q(cafe)}`,
    `insert into public.opening_hours(id,cafe_id,weekday,opens_at,closes_at,closes_next_day) values (${q(randomUUID())},${q(cafe)},3,'09:00','10:00',false)`,
  ]) { denied(actor.id, statement); expect(snapshot(cafe)).toEqual(before); }
}, 120_000);
