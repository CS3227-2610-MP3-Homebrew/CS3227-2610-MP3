import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { Fixture, catalogue, identifier, literal, qualified, sql, type Entity, type Row } from "../schema/local-database";

export type Role = "customer" | "owner" | "admin";
export type Actor = { id: string; workspaceId: string; role: Role };
export const workspaces = ["main", "kitA", "kitB"] as const;
export type Workspace = typeof workspaces[number];
export const actorNames = ["customer", "customer2", "owner", "owner2", "admin"] as const;
export type ActorName = typeof actorNames[number];

/** Privileged fixture setup only; neither kit nor maintenance provisioning is called. */
export function matrixFixture() {
  const fixture = new Fixture(catalogue());
  const mainId = sql("select id from public.workspaces where is_main;");
  expect(mainId.status, mainId.stderr).toBe(0);
  expect(mainId.stdout).toMatch(/^[\da-f-]{36}$/);
  const spaces = {
    main: { table: "workspaces", values: { id: mainId.stdout } } as Row,
    kitA: fixture.row("workspaces"),
    kitB: fixture.row("workspaces"),
  };
  const data = Object.fromEntries(workspaces.map((workspace) => {
    const space = spaces[workspace];
    const profiles = Object.fromEntries(actorNames.map((name) => {
      const role: Role = name.startsWith("customer") ? "customer" : name.startsWith("owner") ? "owner" : "admin";
      const row = fixture.row("profiles", [space], { role });
      return [name, { row, actor: { id: String(row.values.id), workspaceId: String(space.values.id), role } }];
    })) as Record<ActorName, { row: Row; actor: Actor }>;
    const cafe = fixture.row("cafes", [space, profiles.owner.row]);
    const otherCafe = fixture.row("cafes", [space, profiles.owner2.row]);
    const menu = fixture.row("menu_items", [cafe]);
    const otherMenu = fixture.row("menu_items", [otherCafe]);
    const hours = fixture.row("opening_hours", [cafe]);
    const orderState = fixture.tables.orders.columns.find((column) => column.labels?.includes("collected"));
    const collected = orderState ? { [orderState.name]: "collected" } : {};
    const order = fixture.row("orders", [cafe, profiles.customer.row], collected);
    const otherOrder = fixture.row("orders", [otherCafe, profiles.customer2.row], collected);
    const item = fixture.row("order_items", [order, menu, cafe]);
    const otherItem = fixture.row("order_items", [otherOrder, otherMenu, otherCafe]);
    const review = fixture.row("reviews", [order, profiles.customer.row]);
    return [workspace, { profiles, cafe, otherCafe, menu, otherMenu, hours, order, otherOrder, item, otherItem, review }];
  })) as Record<Workspace, {
    profiles: Record<ActorName, { row: Row; actor: Actor }>;
    cafe: Row; otherCafe: Row; menu: Row; otherMenu: Row; hours: Row;
    order: Row; otherOrder: Row; item: Row; otherItem: Row; review: Row;
  }>;

  function query(actor: Actor | null, statement: string) {
    const claims = actor ? { sub: actor.id, role: "authenticated" } : { role: "anon" };
    return sql(`begin;\n${fixture.statements.join("\n")}\nset local role ${actor ? "authenticated" : "anon"};
      do $$ begin
        perform set_config('request.jwt.claims',${literal(JSON.stringify(claims))},true);
        perform set_config('request.jwt.claim.sub',${literal(actor?.id ?? "")},true);
      end $$;
      ${statement}\nrollback;`);
  }
  function read(actor: Actor | null, entity: Entity, row: Row, allowed: boolean) {
    const result = query(actor, `select coalesce(json_agg(id), '[]'::json) from ${qualified(fixture.tables[entity])} where id=${literal(row.values.id)};`);
    if (allowed) {
      expect(result.status, `Expected permitted ${entity} read: ${result.stderr}`).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([row.values.id]);
    } else if (result.status === 0) expect(JSON.parse(result.stdout)).toEqual([]);
    else expect(result.stderr, "Denial must be authorization, not SQL/fixture failure").toMatch(/42501/);
  }
  function mutation(actor: Actor | null, entity: Entity, row: Row, changes: string, allowed = false, operation: "update" | "delete" = "update") {
    const table = qualified(fixture.tables[entity]);
    const action = operation === "update" ? `update ${table} set ${changes}` : `delete from ${table}`;
    const statement = `with changed as (${action} where id=${literal(row.values.id)} returning id) select coalesce(json_agg(id), '[]'::json) from changed;`;
    const result = query(actor, statement);
    if (allowed) {
      expect(result.status, `Expected permitted ${entity} mutation: ${result.stderr}`).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([row.values.id]);
    } else if (result.status === 0) expect(JSON.parse(result.stdout)).toEqual([]);
    else expect(result.stderr, "Denial must be authorization/constraint enforcement").toMatch(/42501|23514|P0001/);
  }
  function eligibility(row: Row, state: "pending" | "approved" | "rejected", suspended: boolean) {
    const columns = fixture.tables.cafes.columns;
    const application = columns.find((column) => /^(application_state|application_status|approval_state|approval_status|status)$/.test(column.name));
    const suspension = columns.find((column) => /^(suspended|is_suspended)$/.test(column.name) && column.type === "bool");
    expect(application, "Missing implementation: cafes application state supporting pending/approved/rejected").toBeDefined();
    expect(suspension, "Missing implementation: independent cafe suspension boolean").toBeDefined();
    fixture.statements.push(`update ${qualified(fixture.tables.cafes)} set ${identifier(application!.name)}=${literal(state)},${identifier(suspension!.name)}=${literal(suspended)} where id=${literal(row.values.id)};`);
    return { application: identifier(application!.name), suspension: identifier(suspension!.name) };
  }
  function reviewState(row: Row, state: "pending" | "kept" | "hidden") {
    const column = fixture.tables.reviews.columns.find((column) => /^(moderation_state|moderation_status|state|status)$/.test(column.name));
    expect(column, "Missing implementation: review moderation state pending/kept/hidden").toBeDefined();
    fixture.statements.push(`update ${qualified(fixture.tables.reviews)} set ${identifier(column!.name)}=${literal(state)} where id=${literal(row.values.id)};`);
  }
  function editableColumn(entity: "menu_items" | "opening_hours") {
    const column = fixture.tables[entity].columns.find((column) => entity === "menu_items"
      ? /^(name|item_name)$/.test(column.name)
      : /^(opens_at|opening_time|open_time|start_time)$/.test(column.name));
    expect(column, `Missing implementation: logical ${entity === "menu_items" ? "menu item name" : "opening time"} field`).toBeDefined();
    return identifier(column!.name);
  }
  /** Prove setup succeeds as postgres before any denial can count as evidence. */
  function proveSetup() { fixture.run(); }
  return { fixture, spaces, data, query, read, mutation, eligibility, reviewState, editableColumn, proveSetup, absentId: randomUUID() };
}
