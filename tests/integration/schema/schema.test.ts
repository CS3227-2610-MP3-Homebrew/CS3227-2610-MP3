// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { catalogue, command, coreFixture, entities, Fixture, identifier, literal, qualified, successfulSql, type Entity } from "./local-database";

test("SYS-06.1 SYS-12.1: local migrations replay twice and preserve the core schema and main workspace", () => {
  let firstReplay = "";
  for (let replay = 0; replay < 2; replay++) {
    const result = command("db:reset", 180_000);
    expect(result.status, `Local migration replay ${replay + 1}: ${result.output}`).toBe(0);
    const fixture = new Fixture();
    expect(Object.keys(fixture.tables).sort()).toEqual([...entities].sort());
    const workspaces = fixture.tables.workspaces;
    const mainFlag = workspaces.columns.find((column) => column.name === "is_main" && column.type === "bool");
    const kind = workspaces.columns.find((column) => /^(kind|type|workspace_kind|workspace_type)$/.test(column.name));
    expect(mainFlag ?? kind, "Workspace fixture identity: is_main boolean or kind/type main-vs-demo discriminator").toBeDefined();
    const mainLabel = kind?.labels?.find((label) => /^main$/i.test(label)) ?? "main";
    const predicate = mainFlag ? `${identifier(mainFlag.name)}=true` : `${identifier(kind!.name)}=${literal(mainLabel)}`;
    const count = Number(successfulSql(`select count(*) from ${qualified(workspaces)} where ${predicate};`));
    expect(count, "Local migrations provide exactly one main workspace before any demo kit exists").toBe(1);
    const constraints = successfulSql(`select coalesce(json_agg(row(n.nspname,c.relname,p.contype,pg_get_constraintdef(p.oid)) order by n.nspname,c.relname,p.contype,pg_get_constraintdef(p.oid)), '[]'::json)
      from pg_constraint p join pg_class c on c.oid=p.conrelid join pg_namespace n on n.oid=c.relnamespace
      where ${Object.values(fixture.tables).map((table) => `(n.nspname=${literal(table.schema)} and c.relname=${literal(table.name)})`).join(" or ")};`);
    if (replay === 0) firstReplay = constraints;
    else expect(constraints).toBe(firstReplay);
  }
}, 400_000);

test("SYS-06.1 SYS-12.1: valid core relationships persist within one inherited workspace", () => {
  const { fixture, customer, cafe, menu, order } = coreFixture();
  fixture.row("order_items", [order, menu, cafe]);
  fixture.row("reviews", [order, customer, cafe]);
  fixture.run();
});

test("SYS-06.1: profiles reference Supabase Auth and reject an orphan Auth user", () => {
  const { fixture } = coreFixture();
  const auth = fixture.tables.profiles.foreignKeys.find((key) => key.targetSchema === "auth" && key.target === "users");
  expect(auth, "Profiles have a Supabase Auth user foreign key").toBeDefined();
  expect(auth!.columns).toHaveLength(1);
  fixture.reject(`update ${qualified(fixture.tables.profiles)} set ${identifier(auth!.columns[0])}='ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid;`);
});

const relationships: [Entity, Entity][] = [
  ["profiles", "workspaces"], ["cafes", "workspaces"], ["cafes", "profiles"],
  ["menu_items", "cafes"], ["opening_hours", "cafes"], ["orders", "profiles"],
  ["orders", "cafes"], ["order_items", "orders"], ["order_items", "menu_items"],
  ["reviews", "orders"], ["reviews", "profiles"],
];

test.each(relationships)("SYS-06.1: %s rejects an orphan %s reference", (entity, parent) => {
  const { fixture, customer, cafe, menu, order } = coreFixture();
  const item = fixture.row("order_items", [order, menu, cafe]);
  const review = fixture.row("reviews", [order, customer, cafe]);
  const foreignKey = fixture.reference(entity, parent);
  // Deleting a parent is not specified; changing a child to an absent parent is.
  const key = foreignKey.columns.find((column, index) => fixture.tables[parent].primary.includes(foreignKey.targets[index]));
  expect(key, "The relationship includes the parent's stable identity").toBeDefined();
  const row = entity === "order_items" ? item : entity === "reviews" ? review : undefined;
  const primary = fixture.tables[entity].primary;
  const predicate = row ? primary.map((column) => `${identifier(column)}=${literal(row.values[column])}`).join(" and ") : "true";
  // NULL is not used: a nullable optional FK still must reject a non-existent identity.
  const column = fixture.tables[entity].columns.find((entry) => entry.name === key)!;
  const sentinel = column.type === "uuid" ? "'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid" : ["int2", "int4", "int8"].includes(column.type) ? "-31000" : "'nonexistent-synthetic-parent'";
  fixture.reject(`update ${qualified(fixture.tables[entity])} set ${identifier(key!)}=${sentinel} where ${predicate};`);
});

test("SYS-06.1: a second review for the same order is rejected", () => {
  const { fixture, customer, cafe, order } = coreFixture();
  fixture.row("reviews", [order, customer, cafe]);
  const validSetup = fixture.statements.slice();
  fixture.row("reviews", [order, customer, cafe]);
  const duplicate = fixture.statements.slice(validSetup.length).join("\n");
  fixture.statements = validSetup;
  fixture.reject(duplicate);
});

test.each(["otherMenu", "kitMenu"] as const)("SYS-06.1 SYS-12.1: order items reject a menu item from %s", (source) => {
  const data = coreFixture();
  const { fixture, order, cafe } = data;
  const setup = fixture.statements.slice();
  fixture.row("order_items", [order, data[source], cafe]);
  const invalid = fixture.statements.slice(setup.length).join("\n");
  fixture.statements = setup;
  fixture.reject(invalid);
});

test("SYS-12.1: only profiles and cafes store workspace references and children inherit through cafes", () => {
  const fixture = new Fixture();
  for (const entity of entities.filter((entity) => entity !== "workspaces")) {
    const references = fixture.tables[entity].foreignKeys.filter((fk) => fk.target === fixture.tables.workspaces.name);
    if (entity === "profiles" || entity === "cafes") expect(references.length).toBeGreaterThan(0);
    else {
      expect(references, `${entity} must inherit its workspace`).toHaveLength(0);
      expect(fixture.tables[entity].columns.filter((col) => /workspace/i.test(col.name)), `${entity} must not duplicate a workspace field`).toHaveLength(0);
    }
  }
  for (const entity of ["menu_items", "opening_hours", "orders"] as const) fixture.reference(entity, "cafes");
  // Reviews may derive their cafe from their order rather than duplicate that FK.
  fixture.reference("reviews", "orders");
  fixture.reference("order_items", "orders");
});

test.each(["cafes", "orders", "reviews"] as const)("SYS-12.1: %s rejects a cross-workspace actor relationship", (entity) => {
  const { fixture, main, kitOwner, kitCustomer, customer, cafe, order } = coreFixture();
  const setup = fixture.statements.slice();
  if (entity === "cafes") fixture.row(entity, [kitOwner, main]);
  if (entity === "orders") fixture.row(entity, [kitCustomer, cafe]);
  if (entity === "reviews") fixture.row(entity, [order, customer, cafe, kitCustomer]);
  const invalid = fixture.statements.slice(setup.length).join("\n");
  fixture.statements = setup;
  fixture.reject(invalid);
});

test.each(["cafes", "orders", "reviews"] as const)("SYS-12.1: %s cannot reassign its actor to another workspace", (entity) => {
  const { fixture, kitOwner, kitCustomer, customer, cafe, order } = coreFixture();
  fixture.row("reviews", [order, customer, cafe]);
  const actor = entity === "cafes" ? kitOwner : kitCustomer;
  const fk = fixture.reference(entity, "profiles");
  const changes = fk.columns.map((column, index) => `${identifier(column)}=${literal(actor.values[fk.targets[index]])}`).join(",");
  fixture.reject(`update ${qualified(fixture.tables[entity])} set ${changes};`);
});

test("SYS-12.1: a review cannot join its order to a cafe in another workspace", () => {
  const { fixture, customer, kitCafe, order } = coreFixture();
  const directCafe = fixture.tables.reviews.foreignKeys.some((key) => key.target === fixture.tables.cafes.name);
  if (!directCafe) {
    // There is no independently writable review/cafe edge; the immutable FK path
    // reviews -> orders -> cafes provides that relationship without duplication.
    fixture.reference("reviews", "orders");
    fixture.reference("orders", "cafes");
    fixture.row("reviews", [order, customer]);
    fixture.run();
    return;
  }
  const setup = fixture.statements.slice();
  fixture.row("reviews", [order, customer, kitCafe]);
  const invalid = fixture.statements.slice(setup.length).join("\n");
  fixture.statements = setup;
  fixture.reject(invalid);
});

test("SYS-06.2: every application table has RLS and explicit table privileges", () => {
  const tables = catalogue();
  new Fixture(tables);
  expect(tables.filter((table) => !table.rls).map(qualified)).toEqual([]);
  expect(tables.filter((table) => table.acl === null).map(qualified), "Application table privileges must be explicit").toEqual([]);
  const result = command("db:check");
  expect(result.status, result.output).toBe(0);
});

test("SYS-06.2: migrations explicitly enable RLS and define schema, table and function grants", () => {
  const tables = catalogue();
  const source = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql"))
    .map((file) => readFileSync(join("supabase/migrations", file), "utf8")).join("\n")
    .replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replaceAll('"', "");
  for (const table of tables) {
    const name = table.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const schema = table.schema.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(source, `Explicit RLS migration for ${qualified(table)}`).toMatch(new RegExp(`alter\\s+table\\s+(?:only\\s+)?(?:${schema}\\.)?${name}\\s+enable\\s+row\\s+level\\s+security`, "i"));
    expect(source, `Explicit table privileges for ${qualified(table)}`).toMatch(new RegExp(`\\b(?:grant|revoke)\\b[^;]*\\bon\\s+(?:(?:table\\s+)?(?:${schema}\\.)?${name}\\b|all\\s+tables\\s+in\\s+schema\\s+${schema}\\b)`, "i"));
  }
  expect(source).toMatch(/\b(?:grant|revoke)\b[^;]*\bon\s+schema\b/i);
  expect(source).toMatch(/\b(?:grant|revoke)\b[^;]*\bon\s+(?:all\s+)?functions?\b/i);
});

test("SYS-06.2: catalogue checker rejects a new unexposed infrastructure table without RLS and accepts it after enabling RLS", () => {
  // A separate non-extension schema is absent from Data API's default public exposure.
  // Its random name prevents parallel invocations from sharing or dropping fixtures.
  const schema = `schema_rls_fixture_${process.pid}_${Date.now()}`;
  const table = `${identifier(schema)}.unexposed_infrastructure`;
  successfulSql(`create schema ${identifier(schema)}; create table ${table} (id bigint primary key); revoke all on schema ${identifier(schema)} from public; revoke all on ${table} from public,anon,authenticated;`);
  try {
    const fixture = catalogue().find((entry) => entry.schema === schema && entry.name === "unexposed_infrastructure");
    expect(fixture).toMatchObject({ rls: false });
    const denied = command("db:check");
    expect(denied.status, denied.output).not.toBe(0);
    expect(denied.output).toContain(schema);
    expect(denied.output).toContain("unexposed_infrastructure");
    successfulSql(`alter table ${table} enable row level security;`);
    const allowed = command("db:check");
    expect(allowed.status, allowed.output).toBe(0);
  } finally {
    successfulSql(`drop schema ${identifier(schema)} cascade;`);
  }
});
