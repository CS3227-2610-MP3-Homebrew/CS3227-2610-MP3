// @vitest-environment node
import { expect, test, vi } from "vitest";
import { seedModule } from "../../unit/roles-seeds/contracts";
import { catalogue, identifier, qualified, successfulSql, type Table } from "../schema/local-database";

vi.mock("server-only", () => ({}));
const local = { environment: "local", supabaseUrl: "http://127.0.0.1:54321", provider: "disabled" } as const;

function domainSnapshot() {
  const tables = catalogue();
  const records = tables.filter((table) => ["workspaces", "profiles", "cafes", "menu_items", "opening_hours", "orders", "order_items", "reviews"].includes(table.name));
  return Object.fromEntries(records.map((table) => [table.name, JSON.parse(successfulSql(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from ${qualified(table)} t;`))]));
}

function column(table: Table, pattern: RegExp, logical: string) {
  const found = table.columns.find((column) => pattern.test(column.name));
  expect(found, `Missing implementation: ${logical}`).toBeDefined();
  return identifier(found!.name);
}

test("SYS-06.3 SYS-06.4: local demonstration seeds replay with all roles, approved cafes, menus, hours and past orders", async () => {
  const subject = await seedModule();
  await subject.seedLocalDemonstration(local);
  const first = domainSnapshot();
  for (const role of ["customer", "owner", "admin"]) {
    expect(Number(successfulSql(`select count(*) from public.profiles where role='${role}';`)), `Local ${role} account`).toBeGreaterThan(0);
  }
  const tables = catalogue();
  const cafes = tables.find((table) => table.name === "cafes")!;
  const orders = tables.find((table) => table.name === "orders")!;
  const application = column(cafes, /^(application_state|application_status|approval_state|approval_status|status)$/, "approved cafe application state");
  const timestamp = orders.columns.find((column) => ["timestamptz", "timestamp", "date"].includes(column.type) && /created|ordered|placed|pickup/.test(column.name));
  expect(timestamp, "Missing implementation: persisted timing for seeded past orders").toBeDefined();
  expect(Number(successfulSql(`select count(*) from public.cafes c
    join public.profiles p on p.id=c.owner_id and p.workspace_id=c.workspace_id
    where c.${application}='approved' and p.role='owner'
      and exists(select 1 from public.menu_items m where m.cafe_id=c.id)
      and exists(select 1 from public.opening_hours h where h.cafe_id=c.id);`)), "An approved seeded cafe has its owner, menu and hours").toBeGreaterThan(0);
  expect(Number(successfulSql(`select count(*) from public.orders o
    join public.cafes c on c.id=o.cafe_id
    join public.profiles p on p.id=o.customer_id and p.workspace_id=c.workspace_id
    where p.role='customer' and o.${identifier(timestamp!.name)}::timestamptz < now()
      and exists(select 1 from public.order_items i where i.order_id=o.id);`)), "Seeded orders contain purchases dated in the past").toBeGreaterThan(0);
  await subject.seedLocalDemonstration(local);
  expect(domainSnapshot(), "Replay preserves seeded identities/data and creates no duplicate accounts or records").toEqual(first);
}, 120_000);

test.each([
  { ...local, environment: "dev" as const },
  { ...local, environment: "prod" as const },
  { ...local, supabaseUrl: "https://synthetic-project.supabase.invalid" },
  { ...local, supabaseUrl: "https://127.0.0.1.attacker.invalid" },
])("SYS-06.4: local demonstration seeding rejects hosted/environment target %j before any database mutation", async (input) => {
  const subject = await seedModule();
  const before = domainSnapshot();
  const network = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("Network dispatch is forbidden for rejected seed targets."); });
  try {
    await expect(subject.seedLocalDemonstration(input)).rejects.toThrow();
    expect(network, "Target validation rejects before any HTTP dispatch").not.toHaveBeenCalled();
    expect(domainSnapshot()).toEqual(before);
  } finally { network.mockRestore(); }
}, 120_000);
