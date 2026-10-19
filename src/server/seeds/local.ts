import "server-only";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";

const targetSchema = z.object({
  environment: z.enum(["local", "ci"]),
  supabaseUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  }),
  provider: z.enum(["fake", "disabled"]),
});
const credentialsSchema = z.array(z.object({ email: z.email(), password: z.string().min(1) }));

/** Explicit local-only administration. Never follows a linked project or a DB URL. */
export async function seedLocalDemonstration(input: {
  environment: "local" | "ci" | "dev" | "prod";
  supabaseUrl: string;
  provider: "fake" | "disabled";
}): Promise<{ createdAccounts: Array<{ email: string; password: string }> }> {
  const target = targetSchema.safeParse(input);
  if (!target.success) throw new Error("Demonstration seeds require local Supabase and fake or disabled AI.");
  const config = readFileSync(new URL("../../../supabase/config.toml", import.meta.url), "utf8");
  const project = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m)?.[1];
  const api = config.split("[api]")[1]?.split(/\n\[/)[0];
  const port = api?.match(/^port\s*=\s*(\d+)\s*$/m)?.[1];
  if (!project || !port || new URL(target.data.supabaseUrl).port !== port) {
    throw new Error("Demonstration seed target must match the configured local stack.");
  }
  const statement = readFileSync(new URL("../../../supabase/local-demonstration.sql", import.meta.url), "utf8");
  const result = spawnSync("docker", ["exec", "-i", `supabase_db_${project}`,
    "psql", "-X", "-q", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: statement, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  // Errors and stdout may contain credentials; never forward either to logs/errors.
  if (result.error || result.status !== 0) throw new Error("Local demonstration seed failed.");
  let decoded: unknown;
  try { decoded = JSON.parse(result.stdout); }
  catch { throw new Error("Local demonstration seed returned invalid data."); }
  const created = credentialsSchema.safeParse(decoded);
  if (!created.success) throw new Error("Local demonstration seed returned invalid data.");
  // Credentials exist only for newly created local accounts; replay never rotates them.
  return { createdAccounts: created.data };
}
