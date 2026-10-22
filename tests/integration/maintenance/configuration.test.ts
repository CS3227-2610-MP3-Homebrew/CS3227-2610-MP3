// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { parse } from "yaml";

function featureSource() {
  const root = "src/server/maintenance";
  expect(existsSync(root), "Missing implementation: maintenance feature").toBe(true);
  const walk = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(path, entry.name)) : entry.name.endsWith(".ts") ? [readFileSync(join(path, entry.name), "utf8")] : []);
  return walk(root).join("\n");
}
test("SYS-13.3, SEC-10.4: server-only maintenance uses the constant-time crypto comparison primitive", () => {
  const source = featureSource();
  expect(source).toMatch(/import\s+["']server-only["']/);
  expect(source).toMatch(/node:crypto/);
  expect(source).toMatch(/timingSafeEqual\s*\(/);
});
test("SYS-13.3, SYS-13.8: production GET route composes maintenance with shared HTTP primitives and retention without generation", () => {
  const path = "src/app/api/internal/maintenance/route.ts";
  expect(existsSync(path), "Missing implementation: maintenance GET route").toBe(true);
  const route = readFileSync(path, "utf8"); const feature = featureSource();
  expect(route).toMatch(/\bGET\b/);
  expect(route).toMatch(/@\/server\/http\//);
  expect(route).toMatch(/@\/server\/maintenance/);
  expect([route, feature].join("\n")).toMatch(/cleanup/);
  expect([route, feature].join("\n")).toMatch(/CRON_SECRET/);
  expect([route, feature].join("\n")).toMatch(/MAIN_ADMIN_EMAIL/);
  expect([route, feature].join("\n")).toMatch(/MAIN_ADMIN_PASSWORD/);
  expect([route, feature].join("\n")).not.toMatch(/NEXT_PUBLIC_(?:CRON_SECRET|MAIN_ADMIN_PASSWORD)/);
  expect([route, feature].join("\n")).toMatch(/import\s+[^;]*?\sfrom\s*["']@\/server\/llm\/ai-state["']/);
  expect([route, feature].join("\n")).toMatch(/\.cleanup\s*\(/);
  expect([route, feature].join("\n")).not.toMatch(/@\/server\/llm\/(?:operations|transport|prompts)/);
});
test("SYS-13.4: production cron schedules the maintenance endpoint at 19:00 UTC daily", () => {
  expect(existsSync("vercel.json"), "Missing implementation: Vercel cron configuration").toBe(true);
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect((config.crons ?? []).filter((cron: { path: string }) => cron.path === "/api/internal/maintenance")).toEqual([{ path: "/api/internal/maintenance", schedule: "0 19 * * *" }]);
});
test("SYS-13.4, SEC-10.4: production workflow calls maintenance exactly once after successful deploy with its environment secret", () => {
  const workflow = parse(readFileSync(".github/workflows/deploy-prod.yml", "utf8"));
  const jobs = Object.values(workflow.jobs) as { environment: string | { name: string }; steps: { run?: string; if?: string; env?: Record<string, string>; continueOnError?: boolean }[] }[];
  const calls = jobs.flatMap(job => job.steps.filter(step => step.run?.includes("/api/internal/maintenance")).map(step => ({ job, step })));
  expect(calls).toHaveLength(1);
  const { job, step } = calls[0];
  expect(typeof job.environment === "string" ? job.environment : job.environment.name).toBe("production");
  const index = job.steps.indexOf(step);
  expect(job.steps.slice(0, index).some(previous => /vercel deploy[^\n]*--prod/.test(previous.run ?? ""))).toBe(true);
  expect(step.if ?? "success()").toMatch(/success\(\)/);
  expect(step.run).not.toMatch(/--retry|\bwhile\b|\bfor\b/);
  expect(step.run).toMatch(/Bearer/); expect(step.run).toMatch(/curl[^\n]*(?:--fail|-f)/);
  expect(step.run).not.toMatch(/set -x|curl[^\n]*(?:--verbose| -v\b)/);
  expect(JSON.stringify(step.env)).toContain("secrets.CRON_SECRET");
  const dev = readFileSync(".github/workflows/deploy-dev.yml", "utf8");
  expect(dev).not.toContain("/api/internal/maintenance");
});
