import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect } from "vitest";

export const entities = ["workspaces", "profiles", "cafes", "menu_items", "opening_hours", "orders", "order_items", "reviews"] as const;
export type Entity = typeof entities[number];
type Value = string | number | boolean;
export type Row = { table: string; values: Record<string, Value> };
type Column = { name: string; type: string; required: boolean; defaulted: boolean; labels: string[] | null };
type ForeignKey = { targetSchema: string; target: string; columns: string[]; targets: string[] };
export type Table = { schema: string; name: string; rls: boolean; acl: string | null; primary: string[]; columns: Column[]; foreignKeys: ForeignKey[] };

export const identifier = (name: string) => `"${name.replaceAll('"', '""')}"`;
export const literal = (value: Value) => typeof value === "string" ? `'${value.replaceAll("'", "''")}'` : String(value);
export const qualified = (table: Pick<Table, "schema" | "name">) => `${identifier(table.schema)}.${identifier(table.name)}`;

function container() {
  expect(existsSync("supabase/config.toml"), "Missing implementation: local supabase/config.toml").toBe(true);
  const config = readFileSync("supabase/config.toml", "utf8");
  const project = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m)?.[1];
  expect(project, "Local Supabase config needs a project_id").toBeTruthy();
  return `supabase_db_${project}`;
}

/** No URL, environment file, hosted target or network credential is consulted. */
export function sql(statement: string) {
  const result = spawnSync("docker", ["exec", "-i", container(), "psql", "-X", "-q", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], {
    input: statement, encoding: "utf8", timeout: 30_000,
  });
  if (result.error) throw new Error(`Local PostgreSQL tooling unavailable: ${result.error.message}`);
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export function successfulSql(statement: string) {
  const result = sql(statement);
  expect(result.status, `Local PostgreSQL query failed: ${result.stderr}`).toBe(0);
  return result.stdout;
}

export function command(name: "db:reset" | "db:check", timeout = 30_000) {
  const result = spawnSync("bun", ["run", name], { encoding: "utf8", timeout });
  if (result.error) throw new Error(`Local ${name} tooling unavailable: ${result.error.message}`);
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

/** Supabase-managed schemas and extension-owned tables are not application tables. */
export const catalogueSql = `
select coalesce(json_agg(t), '[]'::json) from (
  select n.nspname as schema, c.relname as name, c.relrowsecurity as rls,
    c.relacl::text as acl,
    coalesce((select array_agg(a.attname order by k.ord)
      from pg_constraint p, unnest(p.conkey) with ordinality k(num,ord)
      join pg_attribute a on a.attrelid=c.oid and a.attnum=k.num
      where p.conrelid=c.oid and p.contype='p'), '{}') as primary,
    (select json_agg(json_build_object('name',a.attname,'type',ty.typname,
      'required',a.attnotnull,'defaulted',a.atthasdef or a.attidentity<>'',
      'labels',(select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=ty.oid)) order by a.attnum)
      from pg_attribute a join pg_type ty on ty.oid=a.atttypid
      where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns,
    coalesce((select json_agg(json_build_object('targetSchema',tn.nspname,'target',tc.relname,
      'columns',(select array_agg(a.attname order by k.ord) from unnest(p.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.oid and a.attnum=k.num),
      'targets',(select array_agg(a.attname order by k.ord) from unnest(p.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=tc.oid and a.attnum=k.num)))
      from pg_constraint p join pg_class tc on tc.oid=p.confrelid join pg_namespace tn on tn.oid=tc.relnamespace
      where p.conrelid=c.oid and p.contype='f'), '[]'::json) as "foreignKeys"
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
    and n.nspname not in ('auth','storage','realtime','_realtime','supabase_functions','supabase_migrations','extensions','graphql','graphql_public','vault','net','cron','pgsodium','pgsodium_masks')
    and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
  order by n.nspname,c.relname
) t;`;

export function catalogue(): Table[] {
  return JSON.parse(successfulSql(catalogueSql));
}

/** Table-name aliases are fixture setup, not an application HTTP/module API. */
const aliases: Record<Entity, string[]> = {
  workspaces: ["workspaces"], profiles: ["profiles"], cafes: ["cafes", "cafés"],
  menu_items: ["menu_items"], opening_hours: ["opening_hours", "cafe_opening_hours"],
  orders: ["orders"], order_items: ["order_items"], reviews: ["reviews"],
};

let sequence = 70_000;
export class Fixture {
  readonly tables: Record<Entity, Table>;
  statements: string[] = [];
  constructor(tables = catalogue()) {
    this.tables = Object.fromEntries(entities.map((entity) => {
      const matches = tables.filter((table) => aliases[entity].includes(table.name));
      expect(matches, `Core entity ${entity} must resolve to one application table`).toHaveLength(1);
      return [entity, matches[0]];
    })) as Record<Entity, Table>;
  }

  private value(column: Column): Value {
    if (column.labels?.length) return column.labels[0];
    if (column.type === "uuid") return randomUUID();
    if (["int2", "int4", "int8", "numeric", "float4", "float8"].includes(column.type)) return 1;
    if (column.type === "bool") return false;
    if (["timestamptz", "timestamp", "date"].includes(column.type)) return "2026-10-19";
    if (["time", "timetz"].includes(column.type)) return "09:00:00";
    if (["json", "jsonb"].includes(column.type)) return "{}";
    return `synthetic-${++sequence}`;
  }

  /** References come from actual FKs; composite keys are supported. */
  row(entity: Entity, parents: Row[] = [], overrides: Record<string, Value> = {}): Row {
    const table = this.tables[entity];
    const values: Record<string, Value> = {};
    for (const column of table.columns) {
      if ((column.required && !column.defaulted) || table.primary.includes(column.name)) {
        values[column.name] = table.primary.includes(column.name) && ["int2", "int4", "int8"].includes(column.type) ? ++sequence : this.value(column);
        if (entity === "workspaces" && column.labels?.some((label) => /demo|kit/i.test(label))) values[column.name] = column.labels.find((label) => /demo|kit/i.test(label))!;
      }
      if (entity === "workspaces" && column.name === "is_main") values[column.name] = false;
      if (entity === "workspaces" && /^(kind|type|workspace_kind|workspace_type)$/.test(column.name)) {
        values[column.name] = column.labels?.find((label) => /demo|kit/i.test(label)) ?? "demo";
      }
    }
    for (const parent of parents) {
      for (const fk of table.foreignKeys.filter((key) => key.target === parent.table)) {
        fk.columns.forEach((column, index) => { values[column] = parent.values[fk.targets[index]]; });
      }
    }
    // Supabase Auth is an external FK dependency, never an application table.
    for (const fk of table.foreignKeys.filter((key) => key.targetSchema === "auth" && key.target === "users")) {
      const userId = randomUUID();
      this.statements.push(`insert into auth.users (id,aud,role,email) values (${literal(userId)},'authenticated','authenticated',${literal(`${userId}@example.com`)});`);
      fk.columns.forEach((column) => { values[column] = userId; });
    }
    Object.assign(values, overrides);
    const row = { table: table.name, values };
    this.statements.push(this.insert(entity, row));
    return row;
  }

  insert(entity: Entity, row: Row) {
    return `insert into ${qualified(this.tables[entity])} (${Object.keys(row.values).map(identifier).join(",")}) overriding system value values (${Object.values(row.values).map(literal).join(",")});`;
  }

  /** Fill only a specified protected role, using its stored representation. */
  profile(workspace: Row, role: "owner" | "customer") {
    const column = this.tables.profiles.columns.find((col) => /^(role|app_role)$/.test(col.name));
    expect(column, "Profiles contain their protected application role").toBeDefined();
    const stored = column!.labels?.find((value) => role === "owner" ? /owner/i.test(value) : /customer/i.test(value)) ?? role;
    return this.row("profiles", [workspace], { [column!.name]: stored });
  }

  run(extra = "") { return successfulSql(`begin;\n${this.statements.join("\n")}\n${extra}\nrollback;`); }

  reject(statement: string) {
    // Prove the setup succeeds separately so a broken fixture cannot satisfy a rejection.
    this.run();
    const result = sql(`begin;\n${this.statements.join("\n")}\n${statement}\nrollback;`);
    expect(result.status, "Expected authorized database integrity enforcement to reject the mutation").not.toBe(0);
    expect(result.stderr, "Expected a constraint/authorization error, not tooling or SQL syntax failure").toMatch(/23503|23505|23514|42501|P0001/);
  }

  reference(entity: Entity, parent: Entity) {
    const fk = this.tables[entity].foreignKeys.find((key) => key.target === this.tables[parent].name);
    expect(fk, `${entity} has a foreign key to ${parent}`).toBeDefined();
    return fk!;
  }
}

export function coreFixture() {
  const fixture = new Fixture();
  const main = fixture.row("workspaces");
  const kit = fixture.row("workspaces");
  const owner = fixture.profile(main, "owner");
  const otherOwner = fixture.profile(main, "owner");
  const kitOwner = fixture.profile(kit, "owner");
  const customer = fixture.profile(main, "customer");
  const kitCustomer = fixture.profile(kit, "customer");
  const cafe = fixture.row("cafes", [owner, main]);
  const otherCafe = fixture.row("cafes", [otherOwner, main]);
  const kitCafe = fixture.row("cafes", [kitOwner, kit]);
  const menu = fixture.row("menu_items", [cafe]);
  const otherMenu = fixture.row("menu_items", [otherCafe]);
  const kitMenu = fixture.row("menu_items", [kitCafe]);
  fixture.row("opening_hours", [cafe]);
  const order = fixture.row("orders", [customer, cafe]);
  return { fixture, main, kit, owner, kitOwner, customer, kitCustomer, cafe, otherCafe, kitCafe, menu, otherMenu, kitMenu, order };
}
