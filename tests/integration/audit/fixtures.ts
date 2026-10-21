import { randomUUID } from "node:crypto";
import { column, ident, insert, q, rows, type Scenario } from "../moderation/fixtures";

export const auditActions = ["approve", "reject", "suspend", "un-suspend", "keep", "hide", "restore"] as const;
let discovered: ReturnType<typeof discoverAuditTable> | undefined;
export function auditTable() { return discovered ??= discoverAuditTable(); }
/** Discover the domain audit table by its required content, excluding AI metadata. */
function discoverAuditTable() {
  const candidates = rows(`select table_schema,table_name from information_schema.columns where table_schema in ('public','private') group by table_schema,table_name having bool_or(column_name='action') and bool_or(column_name='reason')`);
  if (candidates.length !== 1) throw new Error("Missing implementation: exactly one Admin-action audit table with action and reason");
  const schema = String(candidates[0].table_schema); const name = String(candidates[0].table_name);
  return { schema, name, sql: `${ident(schema)}.${ident(name)}`, actor: column(schema, name, ["admin_id", "actor_id", "acting_admin_id"]),
    time: column(schema, name, ["created_at", "occurred_at"]), id: column(schema, name, ["id"]),
    workspace: column(schema, name, ["workspace_id"]), target: column(schema, name, ["target_id", "target_ref"]),
    kind: column(schema, name, ["target_type", "target_kind"]) };
}
export function auditRows() { return rows(`select * from ${auditTable().sql}`); }
export function targetAudits(id: string) { const table = auditTable(); return rows(`select * from ${table.sql} where ${ident(table.target)}=${q(id)} order by ${ident(table.time)},${ident(table.id)}`); }
/** Café actions are synthetic stored audit records, never café mutation calls. */
export function auditFixture(f: Scenario, action: typeof auditActions[number], target: string, time = "2000-01-01T20:30:00Z", reason = "Synthetic historical reason") {
  const table = auditTable(); const id = randomUUID();
  insert(table.sql, { [table.id]: id, [table.actor]: f.admin.id, [table.workspace]: f.admin.workspaceId,
    action, [table.target]: target, [table.kind]: ["keep", "hide", "restore"].includes(action) ? "review" : "cafe", reason, [table.time]: time });
  return id;
}
