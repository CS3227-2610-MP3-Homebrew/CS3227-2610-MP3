import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { Fixture, sql } from "../schema/local-database";
import type { Rpc, Request } from "../../unit/usage/contracts";

const project = readFileSync("supabase/config.toml", "utf8").match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!project) throw new Error("Local database project_id missing");
const literal = (value: unknown): string => value == null ? "null" :
  typeof value === "number" || typeof value === "boolean" ? String(value) :
  `'${(typeof value === "object" ? JSON.stringify(value) : String(value)).replaceAll("'", "''")}'`;

type ClockQuery = (statement: string, values?: unknown[]) => Promise<Record<string, unknown>[]>;

/** Local fixture SQL/clock helper only; never supplied to application admission construction. */
export function queryAs(role: "service_role" | "anon" | "authenticated" = "service_role", actorId?: string): ClockQuery {
  return async (statement, values = []) => {
    const bound = statement.replace(/\$(\d+)\b/g, (_, index: string) => literal(values[Number(index) - 1]));
    return new Promise((resolve, reject) => {
      const child = spawn("docker", ["exec", "-i", `supabase_db_${project}`, "psql", "-X", "-q", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"]);
      let output = "", errors = "";
      const timer = setTimeout(() => { child.kill(); reject(new Error("Local database query timeout")); }, 30000);
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { errors += chunk; });
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("close", (status) => {
        clearTimeout(timer);
        if (status !== 0) { reject(new Error(`Local database query failed (${status}): ${errors}`)); return; }
        try { resolve(JSON.parse(output.trim())); } catch { reject(new Error(`Expected JSON database rows: ${output}`)); }
      });
      // The adapter accepts SELECT/CTE statements returning rows, with positional values.
      const claims = role === "authenticated" ? { role, sub: actorId } : { role };
      child.stdin.end(`begin; set local role ${role}; set local request.jwt.claims = ${literal(JSON.stringify(claims))}; set local request.jwt.claim.sub = ${literal(role === "authenticated" ? actorId ?? "" : "")}; select coalesce(json_agg(q), '[]'::json) from (${bound.replace(/;\s*$/, "")}) q; commit;`);
    });
  };
}

/** Model the Data API's public-schema, table-returning RPC surface under the real execution role. */
export function rpcAs(role: "service_role" | "anon" | "authenticated" = "service_role", actorId?: string): Rpc {
  const query = queryAs(role, actorId);
  const identifier = (value: string) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error("RPC names must be unqualified public-schema identifiers");
    return `"${value}"`;
  };
  return async (fn, args) => {
    // No caller-controlled schema or arbitrary SQL enters the admission seam.
    const target = `public.${identifier(fn)}`;
    const named = Object.entries(args).map(([key, value]) => `${identifier(key)} => ${literal(value)}`).join(", ");
    try {
      const data = await query(`select * from ${target}(${named})`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: String(error) } };
    }
  };
}

// Each process owns separate synthetic closed/future windows. No fixture deletes or resets usage state.
// The random run namespace is constant throughout the process; boundary offsets remain exact.
const runDays = 36600 + Number.parseInt(randomUUID().slice(0, 8), 16) % 50_000_000;
export function clock(timestamp: string) {
  const isolated = new Date(new Date(timestamp).getTime() + runDays * 86_400_000).toISOString().replace(/^\+/, "");
  return async () => String((await queryAs()("select $1::timestamptz::text as now", [isolated]))[0].now);
}
export function request(changes: Partial<Request> = {}): Request {
  return { admissionId: randomUUID(), operationId: randomUUID(), actorId: randomUUID(), feature: "brew-finder", event: "provider_attempt", ...changes };
}

/** Persist only synthetic domain fixtures as postgres; usage operations still run as service_role. */
export function verifiedActors() {
  const fixture = new Fixture();
  const workspace = fixture.row("workspaces");
  const customer = fixture.profile(workspace, "customer");
  const customer2 = fixture.profile(workspace, "customer");
  const owner = fixture.profile(workspace, "owner");
  const admin = fixture.row("profiles", [workspace], { role: "admin" });
  const cafe = fixture.row("cafes", [workspace, owner], { application_state: "approved", suspended: false });
  const result = sql(`begin; ${fixture.statements.join("\n")} commit;`);
  expect(result.status, result.stderr).toBe(0);
  return { customer: String(customer.values.id), customer2: String(customer2.values.id), owner: String(owner.values.id), admin: String(admin.values.id), cafe: String(cafe.values.id) };
}
