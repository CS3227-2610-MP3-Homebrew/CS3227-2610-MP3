// @vitest-environment node
import { expect, test } from "vitest";
import { actorNames, matrixFixture, workspaces, type ActorName, type Workspace } from "./actors";
import { literal, qualified, type Entity } from "../schema/local-database";

test.each(workspaces)("SYS-06.3 SYS-12.2: %s actors read only their own protected profiles", (workspace) => {
  const f = matrixFixture();
  f.proveSetup();
  for (const name of actorNames) {
    const subject = f.data[workspace].profiles[name];
    f.read(subject.actor, "profiles", subject.row, true);
    for (const targetWorkspace of workspaces) {
      for (const targetName of actorNames) {
        if (targetWorkspace !== workspace || targetName !== name) f.read(subject.actor, "profiles", f.data[targetWorkspace].profiles[targetName].row, false);
      }
    }
  }
}, 120_000);

const localReads: [ActorName, Entity, "cafe" | "menu" | "hours" | "order" | "item" | "review", boolean][] = [
  ["owner", "cafes", "cafe", true], ["owner2", "cafes", "cafe", false], ["admin", "cafes", "cafe", true],
  ["owner", "menu_items", "menu", true], ["owner2", "menu_items", "menu", false], ["admin", "menu_items", "menu", false],
  ["owner", "opening_hours", "hours", true], ["owner2", "opening_hours", "hours", false], ["admin", "opening_hours", "hours", false],
  ["customer", "orders", "order", true], ["customer2", "orders", "order", false], ["owner", "orders", "order", true],
  ["owner2", "orders", "order", false], ["admin", "orders", "order", false],
  ["customer", "order_items", "item", true], ["customer2", "order_items", "item", false],
  ["owner", "order_items", "item", true], ["owner2", "order_items", "item", false], ["admin", "order_items", "item", false],
  ["customer", "reviews", "review", true], ["admin", "reviews", "review", true], ["owner", "reviews", "review", false],
];
test.each(localReads)("SYS-06.3: %s reading %s through %s has allow=%s", (name, entity, key, allowed) => {
  const f = matrixFixture(); f.proveSetup();
  for (const workspace of workspaces) f.read(f.data[workspace].profiles[name].actor, entity, f.data[workspace][key], allowed);
}, 120_000);

const directions: [Workspace, Workspace][] = [["main", "kitA"], ["kitA", "main"], ["kitA", "kitB"], ["kitB", "kitA"]];
test.each(directions)("SYS-06.3 SYS-12.2: every %s role is denied reads and writes in %s", (source, target) => {
  const f = matrixFixture(); f.proveSetup();
  const targets = [ ["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"], ["orders", "order"], ["order_items", "item"], ["reviews", "review"]] as const;
  for (const name of actorNames) for (const [entity, key] of targets) {
    const actor = f.data[source].profiles[name].actor;
    f.read(actor, entity, f.data[target][key], false);
    f.mutation(actor, entity, f.data[target][key], "id=id");
    f.mutation(actor, entity, f.data[target][key], "", false, "delete");
  }
}, 120_000);

test("SYS-06.3: unauthenticated callers cannot read or change any role record", () => {
  const f = matrixFixture(); f.proveSetup();
  for (const workspace of workspaces) {
    for (const [entity, key] of [["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"], ["orders", "order"], ["order_items", "item"], ["reviews", "review"]] as const) {
      f.read(null, entity, f.data[workspace][key], false);
      f.mutation(null, entity, f.data[workspace][key], "id=id");
    }
    f.read(null, "profiles", f.data[workspace].profiles.admin.row, false);
  }
}, 120_000);

test.each(["pending", "rejected", "approved", "suspended"] as const)("SYS-06.3: customer cafe/menu/hour access follows %s parent eligibility", (state) => {
  const f = matrixFixture();
  for (const workspace of workspaces) f.eligibility(f.data[workspace].cafe, state === "suspended" ? "approved" : state, state === "suspended");
  f.proveSetup();
  for (const workspace of workspaces) for (const name of ["customer", "customer2"] as const) {
    const actor = f.data[workspace].profiles[name].actor;
    for (const [entity, key] of [["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"]] as const) f.read(actor, entity, f.data[workspace][key], state === "approved");
  }
}, 120_000);

test("SYS-06.3: owner retains cafe/menu/hour access to their suspended cafe", () => {
  const f = matrixFixture();
  for (const workspace of workspaces) f.eligibility(f.data[workspace].cafe, "approved", true);
  f.proveSetup();
  for (const workspace of workspaces) for (const [entity, key] of [["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"]] as const) f.read(f.data[workspace].profiles.owner.actor, entity, f.data[workspace][key], true);
}, 120_000);

test.each(["menu_items", "opening_hours"] as const)("SYS-06.3: only the cafe owner can update their %s", (entity) => {
  const f = matrixFixture();
  const column = f.editableColumn(entity); f.proveSetup();
  const key = entity === "menu_items" ? "menu" : "hours";
  for (const workspace of workspaces) for (const name of actorNames) f.mutation(f.data[workspace].profiles[name].actor, entity, f.data[workspace][key], `${column}=${column}`, name === "owner");
}, 120_000);

test.each(["pending", "kept", "hidden"] as const)("SYS-06.3: %s review visibility requires own authorship or a visible review on an eligible cafe", (state) => {
  const f = matrixFixture();
  for (const workspace of workspaces) {
    f.eligibility(f.data[workspace].cafe, "approved", false);
    f.reviewState(f.data[workspace].review, state);
  }
  f.proveSetup();
  for (const workspace of workspaces) {
    const d = f.data[workspace];
    f.read(d.profiles.customer.actor, "reviews", d.review, true);
    f.read(d.profiles.customer2.actor, "reviews", d.review, state !== "hidden");
  }
}, 120_000);

test.each(["pending", "rejected", "suspended"] as const)("SYS-06.3: another customer's visible review stays hidden under a %s cafe", (state) => {
  const f = matrixFixture();
  for (const workspace of workspaces) {
    f.eligibility(f.data[workspace].cafe, state === "suspended" ? "approved" : state, state === "suspended");
    f.reviewState(f.data[workspace].review, "kept");
  }
  f.proveSetup();
  for (const workspace of workspaces) {
    const d = f.data[workspace];
    f.read(d.profiles.customer.actor, "reviews", d.review, true);
    f.read(d.profiles.customer2.actor, "reviews", d.review, false);
    f.read(d.profiles.admin.actor, "reviews", d.review, true);
  }
}, 120_000);

test("SYS-06.3: owners cannot self-approve or clear suspension", () => {
  const f = matrixFixture();
  const columns = f.eligibility(f.data.main.cafe, "pending", true); f.proveSetup();
  const actor = f.data.main.profiles.owner.actor;
  f.mutation(actor, "cafes", f.data.main.cafe, `${columns.application}='approved'`);
  f.mutation(actor, "cafes", f.data.main.cafe, `${columns.suspension}=false`);
}, 120_000);

test("SYS-06.3 SYS-12.3: every role is denied role escalation and profile workspace reassignment", () => {
  const f = matrixFixture(); f.proveSetup();
  for (const workspace of workspaces) for (const name of actorNames) {
    const { actor, row } = f.data[workspace].profiles[name];
    f.mutation(actor, "profiles", row, `role=${literal(actor.role === "admin" ? "owner" : "admin")}`);
    f.mutation(actor, "profiles", row, `workspace_id=${literal(f.spaces[workspace === "main" ? "kitA" : "main"].values.id)}`);
  }
}, 120_000);

test("SYS-06.3: cafe, order and review ownership cannot be reassigned by the current owner", () => {
  const f = matrixFixture(); f.proveSetup();
  for (const workspace of workspaces) {
    const d = f.data[workspace];
    f.mutation(d.profiles.owner.actor, "cafes", d.cafe, `owner_id=${literal(d.profiles.owner2.row.values.id)}`);
    f.mutation(d.profiles.customer.actor, "orders", d.order, `customer_id=${literal(d.profiles.customer2.row.values.id)}`);
    f.mutation(d.profiles.customer.actor, "reviews", d.review, `customer_id=${literal(d.profiles.customer2.row.values.id)}`);
    f.mutation(d.profiles.owner.actor, "menu_items", d.menu, `cafe_id=${literal(d.otherCafe.values.id)}`);
    f.mutation(d.profiles.owner.actor, "opening_hours", d.hours, `cafe_id=${literal(d.otherCafe.values.id)}`);
  }
}, 120_000);

test("SYS-06.3: customers and Admins cannot edit or delete reviews", () => {
  const f = matrixFixture(); f.proveSetup();
  for (const workspace of workspaces) for (const name of ["customer", "admin"] as const) {
    f.mutation(f.data[workspace].profiles[name].actor, "reviews", f.data[workspace].review, "id=id");
    f.mutation(f.data[workspace].profiles[name].actor, "reviews", f.data[workspace].review, "", false, "delete");
  }
}, 120_000);

test("SYS-06.3 SYS-06.4: authenticated callers cannot insert a new Admin profile", () => {
  for (const name of actorNames) {
    const f = matrixFixture();
    const profile = f.fixture.row("profiles", [f.spaces.main], { role: "admin" });
    const insert = f.fixture.statements.pop()!; // Auth dependency remains privileged fixture setup.
    f.proveSetup();
    const result = f.query(f.data.main.profiles[name].actor, insert);
    expect(result.status, "An ordinary session must not seed an Admin").not.toBe(0);
    expect(result.stderr).toMatch(/42501|23514|P0001/);
    expect(profile.values.role).toBe("admin");
  }
}, 120_000);

test("SYS-06.3: a customer cannot attach an item to another customer's order", () => {
  const f = matrixFixture();
  const d = f.data.main;
  const row = f.fixture.row("order_items", [d.otherOrder, d.otherMenu, d.otherCafe]);
  const insert = f.fixture.statements.pop()!;
  f.proveSetup();
  const result = f.query(d.profiles.customer.actor, insert);
  expect(result.status, "A foreign parent cannot authorize an order-item insert").not.toBe(0);
  expect(result.stderr).toMatch(/42501|23514|P0001/);
  expect(row.values.order_id).toBe(d.otherOrder.values.id);
}, 120_000);

test("SYS-06.3: absence of a target never exposes another record", () => {
  const f = matrixFixture(); f.proveSetup();
  const result = f.query(f.data.main.profiles.admin.actor, `select coalesce(json_agg(id),'[]'::json) from ${qualified(f.fixture.tables.cafes)} where id=${literal(f.absentId)};`);
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual([]);
}, 120_000);
