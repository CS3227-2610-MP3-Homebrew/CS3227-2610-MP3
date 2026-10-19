// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deployment, discover, hygiene, object, parseWorkflow, vercelConfiguration, type Mapping, type Target, type Workflow } from "./workflow-contract";
import { apiAliasCommand, goodApiWorkflow, goodPair, goodVercel, goodWorkflow } from "./workflow-fixtures";

const root = resolve(import.meta.dirname, "../../..");
const workflows = readdirSync(resolve(root, ".github/workflows"))
  .filter(file => file.endsWith(".yml"))
  .map(file => parseWorkflow(`.github/workflows/${file}`, readFileSync(resolve(root, ".github/workflows", file), "utf8")));
const job = (workflow: Workflow) => object(object(workflow.document.jobs).deliver);
const steps = (workflow: Workflow) => job(workflow).steps as Mapping[];
const editCommand = (workflow: Workflow, needle: string, replacement: string) => {
  const step = steps(workflow).find(step => typeof step.run === "string" && step.run.includes(needle));
  if (!step) throw new Error(`Synthetic fixture has no command ${needle}`);
  step.run = String(step.run).replace(needle, replacement);
};

// Contract tests read repository configuration only; fixtures below prove that
// validators recognize real content rather than passing empty matches.
describe("SYS-07.1: static repository delivery configuration", () => {
  it.each(["development", "production"] as const)("SYS-07.1: %s has one environment-bound Actions migration and deployment job", target => {
    expect(deployment(workflows, target)).toEqual([]);
  });
  it("SYS-07.1: all workflows preserve credential boundaries, SHA actions, read-only contents and deploy-free CI", () => {
    expect(workflows.some(workflow => workflow.file === ".github/workflows/ci.yml")).toBe(true);
    expect(hygiene(workflows)).toEqual([]);
  });
  it("SYS-07.1: vercel.json selects sin1 and disables Git deployments", () => {
    expect(existsSync(resolve(root, "vercel.json")), "missing implementation: vercel.json").toBe(true);
    expect(vercelConfiguration(JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8")))).toEqual([]);
  });
});

describe("SYS-07.1: synthetic validator fixtures", () => {
  it("SYS-07.1: accepts complete synthetic workflows, independent names, object environments and omitted non-cancellation default", () => {
    const pair = goodPair();
    pair[0].file = "arbitrary-name.yml";
    job(pair[0]).environment = { name: "development" };
    delete object(pair[0].document.concurrency)["cancel-in-progress"];
    expect(hygiene(pair)).toEqual([]);
    expect(discover(pair, "development")).toHaveLength(1);
    for (const target of ["development", "production"] as const) expect(deployment(pair, target)).toEqual([]);
    expect(vercelConfiguration(goodVercel)).toEqual([]);
  });
  it("SYS-07.1: rejects absent and duplicate environment jobs without relying on filenames", () => {
    expect(deployment([], "development")).toEqual(["development: expected exactly one environment-bound migration/deploy job; found 0"]);
    const workflow = goodWorkflow("production");
    workflow.file = "deploy-production.yml";
    job(workflow).environment = "unrelated";
    expect(deployment([workflow], "production")[0]).toContain("found 0");
    expect(deployment([goodWorkflow("production"), goodWorkflow("production")], "production")[0]).toContain("found 2");
  });
  const invalidCases: { name: string; target?: Target; error: string; change: (workflow: Workflow, pair: Workflow[]) => void }[] = [
    { name: "wrong branch", error: "only pushes", change: wf => { object(object(wf.document.on).push).branches = ["other"]; } },
    { name: "extra PR trigger", error: "only pushes", change: wf => { object(wf.document.on).pull_request = {}; } },
    { name: "production branch trigger", target: "production", error: "only pushes", change: wf => { object(object(wf.document.on).push).branches = ["master"]; } },
    { name: "production approval binding missing", target: "production", error: "found 0", change: wf => { delete job(wf).environment; } },
    { name: "cancelling concurrency", error: "non-cancelling", change: wf => { object(wf.document.concurrency)["cancel-in-progress"] = true; } },
    { name: "shared environment concurrency", error: "distinct concurrency", change: (wf, pair) => { object(wf.document.concurrency).group = object(pair[1].document.concurrency).group; } },
    { name: "per-commit concurrency", error: "serializes the environment", change: wf => { object(wf.document.concurrency).group = "delivery-${{ github.sha }}"; } },
    { name: "per-tag concurrency", target: "production", error: "serializes the environment", change: wf => { object(wf.document.concurrency).group = "delivery-${{ github.ref }}"; } },
    { name: "missing required secret", error: "secret SUPABASE_DB_URL", change: wf => { object(job(wf).env).DATABASE_URL = "unbound"; } },
    { name: "application secret in build", error: "application secrets", change: wf => { object(job(wf).env).KEY = "${{ secrets.SOCLAAS_API_KEY }}"; } },
    { name: "literal database URL", error: "literal/constructed", change: wf => { object(job(wf).env).DATABASE_URL = "postgresql://synthetic:fake@pooler.invalid:5432/postgres"; } },
    { name: "constructed direct host", error: "literal/constructed", change: wf => { object(job(wf).env).HOST = "db.${PROJECT_REF}.supabase.co"; } },
    { name: "assembled database URL", error: "literal/constructed", change: wf => { object(job(wf).env).DATABASE_URL = '"postgresql" + "://" + "$DB_HOST"'; } },
    { name: "transaction port", error: "transaction port", change: wf => { object(job(wf).env).PORT = "6543"; } },
    { name: "seed inclusion", error: "seeds/reset", change: wf => editCommand(wf, "supabase db push", "supabase db push --include-seed") },
    { name: "seed path", error: "seeds/reset", change: wf => editCommand(wf, "supabase db push", "cat supabase/seed.sql; supabase db push") },
    { name: "db reset", error: "seeds/reset", change: wf => editCommand(wf, "supabase db push", "supabase db reset; supabase db push") },
    { name: "demo credential", error: "seeds/reset", change: wf => { object(job(wf).env).DEMO_KITS_PASSWORD = "synthetic"; } },
    { name: "local credential", error: "seeds/reset", change: wf => { object(job(wf).env).DATABASE_URL = "postgres:postgres@localhost"; } },
    { name: "db URL not secret", error: "--db-url uses", change: wf => editCommand(wf, "$DATABASE_URL", "$OTHER_URL") },
    { name: "missing migration", error: "same environment job", change: wf => editCommand(wf, "supabase db push", "echo migration missing") },
    { name: "migration after deployment", error: "migration before deploy", change: wf => { const list = steps(wf); const index = list.findIndex(step => String(step.run).includes("supabase db push")); list.push(...list.splice(index, 1)); } },
    { name: "swallowed migration failure", error: "failure is not swallowed", change: wf => editCommand(wf, "$DATABASE_URL\"", "$DATABASE_URL\" || true") },
    { name: "continue migration on error", error: "failure-gated", change: wf => { steps(wf).find(step => String(step.run).includes("supabase db push"))!["continue-on-error"] = true; } },
    { name: "always deploy despite failure", error: "failure-gated", change: wf => { steps(wf).find(step => String(step.run).includes("vercel deploy"))!.if = "${{ always() }}"; } },
    { name: "wrong pull target", error: "pulls own target", change: wf => editCommand(wf, "--environment=preview", "--environment=production") },
    { name: "build before pull", error: "pull then build", change: wf => { const list = steps(wf); const a = list.findIndex(step => String(step.run).includes("vercel pull")); [list[a], list[a + 1]] = [list[a + 1], list[a]]; } },
    { name: "missing prebuilt", error: "deploy --prebuilt", change: wf => editCommand(wf, "--prebuilt", "") },
    { name: "development prod flag", error: "no --prod", change: wf => editCommand(wf, "vercel build", "vercel build --prod") },
    { name: "production missing prod build", target: "production", error: "--prod on build", change: wf => editCommand(wf, "vercel build --prod", "vercel build") },
    { name: "production missing prod deploy", target: "production", error: "--prod on build", change: wf => editCommand(wf, "vercel deploy --prebuilt --prod", "vercel deploy --prebuilt") },
    { name: "missing dev alias", error: "development alias", change: wf => editCommand(wf, "homebrew-cs3227-dev.vercel.app", "different.invalid") },
    { name: "production dev alias", target: "production", error: "no development alias", change: wf => { steps(wf).push({ run: "vercel alias set synthetic homebrew-cs3227-dev.vercel.app" }); } },
    { name: "missing ancestry check", target: "production", error: "ancestry check", change: wf => editCommand(wf, "git merge-base --is-ancestor HEAD origin/master", "true") },
    { name: "ancestry after migrations", target: "production", error: "ancestry check", change: wf => { const list = steps(wf); const index = list.findIndex(step => String(step.run).includes("merge-base")); list.push(...list.splice(index, 1)); } },
    { name: "reversed ancestry operands", target: "production", error: "tag-to-master direction", change: wf => editCommand(wf, "--is-ancestor HEAD origin/master", "--is-ancestor origin/master HEAD") },
    { name: "unrelated ancestry commit", target: "production", error: "tag-to-master direction", change: wf => editCommand(wf, "--is-ancestor HEAD origin/master", "--is-ancestor unrelated-commit origin/master") },
    { name: "ignored ancestry failure", target: "production", error: "ancestry failure", change: wf => editCommand(wf, "origin/master", "origin/master || true") },
    { name: "unversioned Vercel CLI", error: "exact Vercel", change: wf => editCommand(wf, "vercel@41.0.0", "vercel") },
    { name: "latest Vercel CLI", error: "exact Vercel", change: wf => editCommand(wf, "vercel@41.0.0", "vercel@latest") },
    { name: "Vercel CLI range", error: "exact Vercel", change: wf => editCommand(wf, "vercel@41.0.0", "vercel@^41.0.0") },
    { name: "hard-coded Bun", error: "Bun from package.json", change: wf => { steps(wf).find(step => String(step.uses).includes("setup-bun"))!.with = { "bun-version": "1.4.3" }; } },
    { name: "wrong Node version", error: "Node 24", change: wf => { steps(wf).find(step => String(step.uses).includes("setup-node"))!.with = { "node-version": 22 }; } },
  ];
  it.each(invalidCases)("SYS-07.1: rejects $name fixture", ({ target = "development", error, change }) => {
    const pair = goodPair();
    const workflow = pair[target === "development" ? 0 : 1];
    change(workflow, pair);
    expect(deployment(pair, target).some(message => message.includes(error)), `expected ${error}`).toBe(true);
  });
  it.each([
    ["root credential", (pair: Workflow[]) => { pair[0].document.env = { TOKEN: "${{ secrets.VERCEL_TOKEN }}" }; }, "outside environment"],
    ["CI delivery credentials", (pair: Workflow[]) => { pair.push({ file: "ci.yml", document: { permissions: { contents: "read" }, jobs: { verify: { env: { TOKEN: "${{ secrets.VERCEL_TOKEN }}" }, steps: [] } } } }); }, "non-deploy job"],
    ["unbound deploy command", (pair: Workflow[]) => { job(pair[0]).environment = "unrelated"; }, "non-deploy job"],
    ["CI deploy command", (pair: Workflow[]) => { pair[0].file = "ci.yml"; }, "ci.yml stays deploy-free"],
    ["development cron secret", (pair: Workflow[]) => { object(job(pair[0]).env).CRON = "${{ secrets.CRON_SECRET }}"; }, "production-only"],
    ["secret read as variable", (pair: Workflow[]) => { object(job(pair[0]).env).DATABASE_URL = "${{ vars.SUPABASE_DB_URL }}"; }, "wrong credential type"],
    ["variable read as secret", (pair: Workflow[]) => { object(job(pair[0]).env).VERCEL_PROJECT_ID = "${{ secrets.VERCEL_PROJECT_ID }}"; }, "wrong credential type"],
    ["write contents permission", (pair: Workflow[]) => { pair[0].document.permissions = { contents: "write" }; }, "contents: read"],
    ["unpinned action", (pair: Workflow[]) => { steps(pair[0])[0].uses = "actions/checkout@v4"; }, "SHA-pinned"],
  ] as const)("SYS-07.1: hygiene rejects %s fixture", (_name, change, error) => {
    const pair = goodPair();
    change(pair);
    expect(hygiene(pair).some(message => message.includes(error))).toBe(true);
  });
  it("SYS-07.1: production CRON_SECRET is optional and allowed only as a secret", () => {
    const pair = goodPair();
    object(job(pair[1]).env).CRON = "${{ secrets.CRON_SECRET }}";
    expect(hygiene(pair)).toEqual([]);
    expect(deployment(pair, "production")).toEqual([]);
    object(job(pair[1]).env).CRON = "${{ vars.CRON_SECRET }}";
    expect(hygiene(pair).some(message => message.includes("wrong credential type"))).toBe(true);
  });
  it("SYS-07.1: accepts zero-migration guards, direct secret arguments, inline commands, alias shorthand and implicit Bun packageManager", () => {
    const pair = goodPair();
    editCommand(pair[0], 'supabase db push --db-url "$DATABASE_URL"', "if find supabase/migrations -name '*.sql' -print -quit | grep -q .; then supabase db push --db-url '${{ secrets.SUPABASE_DB_URL }}'; fi");
    editCommand(pair[0], "vercel alias set", "vercel alias");
    delete steps(pair[0]).find(step => String(step.uses).includes("setup-bun"))!.with;
    const list = steps(pair[1]);
    const pullIndex = list.findIndex(step => String(step.run).includes("vercel pull"));
    list.splice(pullIndex, 3, { run: list.slice(pullIndex, pullIndex + 3).map(step => step.run).join(" && ") });
    editCommand(pair[1], "git merge-base --is-ancestor HEAD origin/master", "git branch --remotes --contains HEAD | grep -Fx origin/master");
    for (const target of ["development", "production"] as const) expect(deployment(pair, target)).toEqual([]);
  });
  it.each([
    { regions: ["iad1"], git: { deploymentEnabled: false } },
    { regions: ["sin1", "iad1"], git: { deploymentEnabled: false } },
    { regions: ["sin1"], git: { deploymentEnabled: true } },
    {},
  ])("SYS-07.1: rejects invalid region/Git-deployment fixture %#", value => {
    expect(vercelConfiguration(value).length).toBeGreaterThan(0);
  });
});


describe("SYS-07.1: development alias REST fixtures", () => {
  it("SYS-07.1: accepts the API alias with a captured host, org query, fixed JSON and stdin authorization", () => {
    const pair = [goodApiWorkflow(), goodWorkflow("production")];
    expect(hygiene(pair)).toEqual([]);
    expect(deployment(pair, "development")).toEqual([]);
    expect(deployment(pair, "production")).toEqual([]);
  });
  it("SYS-07.1: accepts an authorization header file as curl stdin", () => {
    const workflow = goodApiWorkflow();
    editCommand(workflow, '--config -', '--header @-');
    editCommand(workflow, 'header = "Authorization: Bearer $VERCEL_TOKEN"', 'Authorization: Bearer $VERCEL_TOKEN');
    expect(deployment([workflow], "development")).toEqual([]);
  });
  it("SYS-07.1: accepts builtin printf piping authorization to curl config stdin", () => {
    const workflow = goodApiWorkflow();
    editCommand(workflow, 'curl -sS', `printf 'header = "Authorization: Bearer %s"\\n' "$VERCEL_TOKEN" | curl -sS`);
    editCommand(workflow, ' <<CURL_CONFIG\nheader = "Authorization: Bearer $VERCEL_TOKEN"\nCURL_CONFIG', '');
    expect(deployment([workflow], "development")).toEqual([]);
  });
  it("SYS-07.1: accepts authorization from a fixed curl config file", () => {
    const workflow = goodApiWorkflow();
    editCommand(workflow, 'curl -sS', `printf 'header = "Authorization: Bearer %s"\\n' "$VERCEL_TOKEN" > headers.conf\ncurl -sS`);
    editCommand(workflow, '--config -', '--config headers.conf');
    editCommand(workflow, ' <<CURL_CONFIG\nheader = "Authorization: Bearer $VERCEL_TOKEN"\nCURL_CONFIG', '');
    expect(deployment([workflow], "development")).toEqual([]);
  });
  const invalidCases = [
    { name: "token passed in curl argv", from: '--config -', to: '-H "Authorization: Bearer $VERCEL_TOKEN"', error: "absent from process arguments" },
    { name: "token passed in deployment argv", from: 'vercel deploy --prebuilt', to: 'vercel deploy --prebuilt --token "$VERCEL_TOKEN"', error: "absent from process arguments" },
    { name: "token passed to an external header writer", from: 'url=$(vercel deploy --prebuilt)', to: 'node header-writer.js "$VERCEL_TOKEN"\nurl=$(vercel deploy --prebuilt)', error: "absent from process arguments" },
    { name: "missing HTTP failure flag", from: '--fail-with-body', to: '', error: "fails on HTTP error" },
    { name: "swallowed HTTP failure", from: '<<CURL_CONFIG', to: '<<CURL_CONFIG || true', error: "fails on HTTP error" },
    { name: "missing teamId", from: '?teamId=$VERCEL_ORG_ID', to: '', error: "captured deployment host and teamId" },
    { name: "unrelated teamId", from: '?teamId=$VERCEL_ORG_ID', to: '?teamId=$OTHER_ORG_ID', error: "captured deployment host and teamId" },
    { name: "wrong alias domain", from: 'homebrew-cs3227-dev.vercel.app', to: 'other.vercel.app', error: "JSON body has development alias" },
    { name: "quoted non-expanding header heredoc", from: '<<CURL_CONFIG', to: "<<'CURL_CONFIG'", error: "header from stdin or file" },
    { name: "missing POST", from: '--request POST', to: '--request GET', error: "API POST" },
    { name: "uncaptured deployment host", from: '/$host/aliases', to: '/unrelated.vercel.app/aliases', error: "captured deployment host and teamId" },
    { name: "wrong authorization input", from: '--config -', to: '--config unrelated.conf', error: "header from stdin or file" },
    { name: "direct secret expression in request", from: '$VERCEL_TOKEN', to: '${{ secrets.VERCEL_TOKEN }}', error: "token secret only in step env" },
  ];
  it.each(invalidCases)("SYS-07.1: rejects API $name fixture", ({ from, to, error }) => {
    const workflow = goodApiWorkflow();
    editCommand(workflow, from, to);
    expect(deployment([workflow], "development").some(message => message.includes(error)), `expected ${error}`).toBe(true);
  });
  it("SYS-07.1: rejects an API token secret at job scope", () => {
    const workflow = goodApiWorkflow();
    object(job(workflow).env).VERCEL_TOKEN = "${{ secrets.VERCEL_TOKEN }}";
    expect(deployment([workflow], "development")).toContain("development: alias API token secret only in step env");
  });
  it("SYS-07.1: rejects an API step overriding the selected org variable", () => {
    const workflow = goodApiWorkflow();
    object(steps(workflow).find(step => String(step.run).includes("api.vercel.com"))!.env).VERCEL_ORG_ID = "unrelated-team";
    expect(deployment([workflow], "development")).toContain("development: alias API uses captured deployment host and teamId from VERCEL_ORG_ID");
  });
  it("SYS-07.1: rejects an API step without its token env binding", () => {
    const workflow = goodApiWorkflow();
    delete steps(workflow).find(step => String(step.run).includes("api.vercel.com"))!.env;
    expect(deployment([workflow], "development")).toContain("development: alias API token secret only in step env");
  });
  it("SYS-07.1: rejects an API alias call in production", () => {
    const workflow = goodWorkflow("production");
    steps(workflow).push({ env: { VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}" }, run: apiAliasCommand });
    expect(deployment([workflow], "production")).toContain("production: no development alias");
  });
  it("SYS-07.1: rejects a production API alias even when its body hides the dev domain", () => {
    const workflow = goodWorkflow("production");
    steps(workflow).push({ run: apiAliasCommand.replace('homebrew-cs3227-dev.vercel.app', '$ALIAS') });
    expect(deployment([workflow], "production")).toContain("production: no development alias");
  });
});
