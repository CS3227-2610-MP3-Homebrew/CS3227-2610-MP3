import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const action = process.argv[2];
if (process.argv.length !== 3 || !["start", "reset", "check"].includes(action)) {
  console.error("Use db:start, db:reset or db:check without additional arguments. These commands only target local Supabase.");
  process.exit(1);
}

const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
const project = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m)?.[1];
if (!project) throw new Error("Local Supabase config requires a project_id.");

if (action === "check") {
  // Include unexposed/new schemas; exclude only Supabase/platform and extension objects.
  const query = `
    select format('%I.%I', n.nspname, c.relname)
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and not c.relrowsecurity
      and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
      and n.nspname not in ('auth', 'storage', 'realtime', '_realtime',
        'supabase_functions', 'supabase_migrations', 'extensions', 'graphql',
        'graphql_public', 'vault', 'net', 'cron', 'pgsodium', 'pgsodium_masks')
      and not exists (select 1 from pg_catalog.pg_depend d
        where d.classid = 'pg_catalog.pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
    order by n.nspname, c.relname;
  `;
  const result = spawnSync("docker", ["exec", "-i", `supabase_db_${project}`,
    "psql", "-X", "-q", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    cwd: root, input: query, encoding: "utf8", timeout: 30_000,
  });
  if (result.error || result.status !== 0) {
    console.error("Local database catalogue unavailable. Check Docker and run bun run db:start first.");
    process.exit(1);
  }
  const missing = result.stdout.trim();
  if (missing) {
    console.error(`Application tables without RLS:\n${missing}`);
    process.exit(1);
  }
  console.log("Local catalogue check passed: every application table has RLS.");
} else {
  const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
  // Fixed commands, explicit workdir and --local prevent linked-project or URL targets.
  const args = action === "start" ? ["start"] : ["db", "reset", "--local", "--no-seed"];
  console.log(`${action === "start" ? "Starting" : "Resetting"} local Supabase (${project}).`);
  const result = spawnSync(process.execPath, [cli, ...args, "--workdir", root, "--yes"], {
    cwd: root, encoding: "utf8", timeout: 900_000, maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Supabase's successful status output contains generated credentials; never relay it.
  if (result.error || result.status !== 0) {
    console.error(`Local Supabase ${action} failed${result.error ? ` (${result.error.name})` : ` (exit ${result.status})`}.`);
    const errors = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.split("\n")
      .filter((line) => /error|failed|invalid|cannot|could not|denied|not found|timed out|unhealthy/i.test(line))
      .filter((line) => !/secret|password|api.?key|authorization|token/i.test(line))
      .map((line) => line.replace(/https?:\/\/[^\s]+/g, "[URL omitted]").replace(/[A-Za-z0-9_./+-]{40,}/g, "[opaque value omitted]"));
    console.error(errors.slice(-8).join("\n"));
    process.exit(1);
  }
  console.log(`Local Supabase ${action} succeeded. Generated credentials are omitted.`);
}
