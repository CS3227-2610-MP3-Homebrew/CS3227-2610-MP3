// @vitest-environment node
import { expect, test } from "vitest";
import { actorNames, matrixFixture, type Actor, type Workspace } from "./actors";
import { literal, qualified, type Row } from "../schema/local-database";

const targets = [
  { entity: "menu_items", key: "menu", label: "menu name" },
  { entity: "opening_hours", key: "hours", label: "opening time" },
] as const;
const directions: [Workspace, Workspace][] = [
  ["main", "kitA"], ["kitA", "main"], ["kitA", "kitB"], ["kitB", "kitA"],
];
const cases = targets.flatMap((target) => directions.flatMap(([source, destination]) =>
  actorNames.map((actorName) => ({ ...target, source, destination, actorName }))));

type SqlResult = { status: number | null; stdout: string; stderr: string };
type ChangedRow = { id: string; value: string };
type ObservedWrite = { result: SqlResult; changed: ChangedRow[]; stored: ChangedRow[] };

function assertDenied(write: ObservedWrite, before: ChangedRow[]) {
  if (write.result.status !== 0) {
    expect(write.result.stderr, "Only an authorization error counts as denial").toMatch(/42501/);
    return; // ON_ERROR_STOP aborts the transaction; no write can commit.
  }
  expect(write.changed, "A foreign actor must not update a permitted mutable column").toEqual([]);
  expect(write.stored, "The target's actual value must remain unchanged").toEqual(before);
}

test.each(cases)("SYS-06.3 SYS-12.2: $source $actorName cannot change $destination $label", ({ entity, key, source, destination, actorName }) => {
  const f = matrixFixture();
  const column = f.editableColumn(entity);
  const table = qualified(f.fixture.tables[entity]);
  const row = f.data[destination][key];
  const owner = f.data[destination].profiles.owner.actor;
  // OWN-03.9: only an approved café's owner may change its menu.
  if (entity === "menu_items") f.eligibility(f.data[destination].cafe, "approved", false);
  f.proveSetup();

  const observed = (target: Row) => `select coalesce(json_agg(json_build_object('id',id,'value',${column}::text)),'[]'::json)
    from ${table} where id=${literal(target.values.id)};`;
  const initial = f.query(owner, observed(row));
  expect(initial.status, initial.stderr).toBe(0);
  const before: ChangedRow[] = JSON.parse(initial.stdout);
  expect(before, "The positive control owns an existing readable target").toHaveLength(1);
  const value = entity === "menu_items"
    ? `${before[0].value}-t07-edited`
    : before[0].value === "10:00:00" ? "09:00:00" : "10:00:00";
  expect(value, "Exercise an actual field change rather than a no-op").not.toBe(before[0].value);

  function write(actor: Actor): ObservedWrite {
    const result = f.query(actor, `with changed as (
      update ${table} set ${column}=${literal(value)} where id=${literal(row.values.id)}
      returning id,${column}::text as value
    ) select coalesce(json_agg(changed),'[]'::json) from changed;
    reset role;
    ${observed(row)}`);
    if (result.status !== 0) return { result, changed: [], stored: [] };
    const lines = result.stdout.split("\n");
    expect(lines, "Both mutation result and privileged fixture observation are present").toHaveLength(2);
    return { result, changed: JSON.parse(lines[0]), stored: JSON.parse(lines[1]) };
  }

  // Both calls get identical fixture data in independent rolled-back transactions.
  // Only the verified subject changes; column grants/validity cannot explain denial.
  const permitted = write(owner);
  expect(permitted.result.status, permitted.result.stderr).toBe(0);
  const after = [{ id: String(row.values.id), value }];
  expect(permitted.changed).toEqual(after);
  expect(permitted.stored, "The owner's field change actually reaches the row").toEqual(after);
  expect(() => assertDenied(permitted, before), "The denial oracle detects a successful write").toThrow();

  const denied = write(f.data[source].profiles[actorName].actor);
  assertDenied(denied, before);
}, 120_000);
