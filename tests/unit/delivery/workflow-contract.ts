// @vitest-environment node
// Static inspection only: none of the workflow commands are executed.
import { parse } from "yaml";

export type Mapping = Record<string, unknown>;
export type Workflow = { file: string; document: Mapping };
export type Target = "development" | "production";
const credentials = ["VERCEL_TOKEN", "SUPABASE_DB_URL", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "CRON_SECRET"];
const secrets = ["VERCEL_TOKEN", "SUPABASE_DB_URL", "CRON_SECRET"];
const applicationSecrets = /SUPABASE_SECRET_KEY|SOCLAAS_API_KEY|MAIN_ADMIN_PASSWORD/;
export const object = (value: unknown): Mapping => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Mapping : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const stringify = (value: unknown) => JSON.stringify(value);
const stepsOf = (job: Mapping): Mapping[] => array(job.steps).map(object);
const environment = (job: Mapping) => typeof job.environment === "string" ? job.environment : object(job.environment).name;
const jobsOf = (workflow: Workflow) => Object.entries(object(workflow.document.jobs)).map(([id, value]) => ({ id, job: object(value) }));
export const parseWorkflow = (file: string, source: string): Workflow => ({ file, document: object(parse(source)) });
export const discover = (workflows: Workflow[], target: Target) => workflows.flatMap(workflow => jobsOf(workflow).filter(({ job }) => environment(job) === target).map(({ id, job }) => ({ workflow, id, job })));
const add = (errors: string[], condition: unknown, message: string) => { if (!condition) errors.push(message); };
const hasTool = (text: string) => /\bvercel(?:@|\s)|\bsupabase\s+db\s+push\b/i.test(text);

export function hygiene(workflows: Workflow[]): string[] {
  const errors: string[] = [];
  for (const workflow of workflows) {
    const root = workflow.document;
    const rootWithoutJobs = { ...root, jobs: undefined };
    add(errors, !credentials.some(name => stringify(rootWithoutJobs).includes(name)), `${workflow.file}: credentials outside environment-bound jobs`);
    for (const { id, job } of jobsOf(workflow)) {
      const env = environment(job);
      const text = stringify(job);
      const deploy = env === "development" || env === "production";
      add(errors, object(job.permissions ?? root.permissions).contents === "read", `${workflow.file}/${id}: contents: read`);
      for (const step of stepsOf(job)) {
        if (typeof step.uses === "string" && !step.uses.startsWith("./")) {
          add(errors, /^[^@]+@[a-f\d]{40}$/i.test(step.uses), `${workflow.file}/${id}: SHA-pinned action ${step.uses}`);
        }
      }
      add(errors, deploy || (!hasTool(text) && !credentials.some(name => text.includes(name))), `${workflow.file}/${id}: non-deploy job references delivery tools/credentials`);
      add(errors, env === "production" || !text.includes("CRON_SECRET"), `${workflow.file}/${id}: CRON_SECRET production-only`);
      for (const match of text.matchAll(/\b(secrets|vars)(?:\.([A-Z_]+)|\[['"]([A-Z_]+)['"]\])/g)) {
        const name = match[2] ?? match[3];
        if (credentials.includes(name)) add(errors, match[1] === (secrets.includes(name) ? "secrets" : "vars"), `${workflow.file}/${id}: ${name} has wrong credential type`);
      }
      if (workflow.file.endsWith("/ci.yml") || workflow.file === "ci.yml") add(errors, !deploy && !hasTool(text) && !credentials.some(name => text.includes(name)), "ci.yml stays deploy-free");
    }
    // Also disallow tools in global defaults/env, where no environment is selected.
    add(errors, !hasTool(stringify(rootWithoutJobs)), `${workflow.file}: delivery tool outside jobs`);
  }
  return errors;
}

function runLines(job: Mapping): { step: Mapping; command: string; index: number }[] {
  return stepsOf(job).flatMap((step, index) => typeof step.run === "string" ? step.run.replace(/\\\r?\n\s*/g, " ").split(/\s*(?:&&|;|\r?\n)\s*/).map(command => ({ step, command, index })) : []);
}
function expand(command: string, variables: Mapping): string {
  let expanded = command;
  for (const [key, value] of Object.entries(variables)) {
    expanded = expanded.replaceAll(`\${${key}}`, String(value)).replace(new RegExp(`\\$${key}\\b`, "g"), String(value));
  }
  return expanded.replaceAll('"', "").replaceAll("'", "");
}
const secretReference = (name: string) => new RegExp(`\\$\\{\\{\\s*secrets(?:\\.${name}|\\[['\"]${name}['\"]\\])\\s*\\}\\}`);
const variableReference = (name: string) => new RegExp(`\\$\\{\\{\\s*vars(?:\\.${name}|\\[['\"]${name}['\"]\\])\\s*\\}\\}`);
function ancestryIsEnforced(command: string): boolean {
  const normalized = command.replace(/\$\{\{\s*github\.(?:sha|ref)\s*\}\}|\$\{GITHUB_(?:SHA|REF)\}|\$GITHUB_(?:SHA|REF)\b/g, "HEAD");
  const master = "(?:refs/remotes/)?(?:origin/|upstream/)?master";
  const mergeBase = normalized.match(/(?:^|\bthen\s+)git\s+merge-base\s+--is-ancestor\s+(\S+)\s+(\S+)/);
  if (mergeBase) return mergeBase[1] === "HEAD" && new RegExp(`^${master}$`).test(mergeBase[2]) && !/\|\|\s*(?:true|:|echo)\b/.test(normalized);
  // Alternative containment proof: list branches containing the tag, then fail
  // unless the fetched master branch is among those branches.
  return /git\s+branch\b[^|;]*--contains\s+HEAD[^|;]*\|\s*grep\b/.test(normalized) && new RegExp(`\\bgrep\\b[^;]*${master}`).test(normalized);
}
const invokes = (command: string, operation: string) => new RegExp(`\\bvercel(?:@\\d+\\.\\d+\\.\\d+)?\\s+${operation}\\b`).test(command);

export function deployment(workflows: Workflow[], target: Target): string[] {
  const matches = discover(workflows, target);
  if (matches.length !== 1) return [`${target}: expected exactly one environment-bound migration/deploy job; found ${matches.length}`];
  const { workflow, job, id } = matches[0];
  const errors: string[] = [];
  const root = workflow.document;
  const prod = target === "production";
  const push = object(object(root.on).push);
  const filter = prod ? "tags" : "branches";
  const expected = prod ? "v*" : "master";
  add(errors, Object.keys(object(root.on)).length === 1 && array(push[filter]).length === 1 && array(push[filter])[0] === expected && !push[prod ? "branches" : "tags"] && !push[`${filter}-ignore`] && !push.paths && !push["paths-ignore"], `${target}: only pushes of ${expected}`);
  const concurrency = object(job.concurrency ?? root.concurrency);
  add(errors, typeof concurrency.group === "string" && concurrency.group.length > 0 && (concurrency["cancel-in-progress"] === false || concurrency["cancel-in-progress"] === undefined), `${target}: non-cancelling concurrency group`);
  add(errors, typeof concurrency.group === "string" && !/\$\{\{(?!\s*github\.(?:workflow|job)\s*\}\})/.test(concurrency.group), `${target}: concurrency serializes the environment across commits and tags`);
  add(errors, job["continue-on-error"] !== true, `${target}: job cannot ignore failures`);
  const runs = runLines(job);
  const allText = stringify(job);
  const commands = runs.map(({ command, step }) => expand(command, { ...object(job.env), ...object(step.env) }));
  for (const name of ["VERCEL_TOKEN", "SUPABASE_DB_URL"]) add(errors, secretReference(name).test(allText), `${target}: secret ${name}`);
  for (const name of ["VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) add(errors, variableReference(name).test(allText), `${target}: variable ${name}`);
  add(errors, !applicationSecrets.test(allText), `${target}: application secrets are not workflow/build inputs`);
  add(errors, !/postgres(?:ql)?[^}]{0,80}:\/\/|db\..{0,120}\.supabase\.co|\b6543\b/i.test(allText), `${target}: no literal/constructed database URL, direct host or transaction port`);
  add(errors, !/--include-seed|\bseeds?\.(?:sql|ts|js)|(?:^|[ /])seeds?\/|\bdb\s+reset\b|DEMO_KITS_|MAIN_ADMIN_|(?:anon|service_role|postgres)_?key|SUPABASE_(?:ANON_KEY|SERVICE_ROLE_KEY)|(?:localhost|127\.0\.0\.1|host\.docker\.internal)|\bpostgres:postgres\b/i.test(allText), `${target}: no seeds/reset/demo/local credentials`);
  const migration = commands.findIndex(command => /\bsupabase\s+db\s+push\b/.test(command));
  const pull = commands.findIndex(command => invokes(command, "pull"));
  const build = commands.findIndex(command => invokes(command, "build"));
  const deploy = commands.findIndex(command => invokes(command, "deploy"));
  add(errors, migration >= 0 && pull >= 0 && build >= 0 && deploy >= 0, `${target}: migration, pull, build and deploy in same environment job`);
  const position = (index: number, expression: RegExp) => index < 0 ? -1 : commands[index].search(expression);
  const ordered = (first: number, second: number, a: RegExp, b: RegExp) => first >= 0 && second >= 0 && (first < second || first === second && position(first, a) < position(second, b));
  add(errors, ordered(migration, deploy, /supabase\s+db\s+push/, /vercel(?:@\S+)?\s+deploy/), `${target}: migration before deploy`);
  add(errors, ordered(pull, build, /vercel(?:@\S+)?\s+pull/, /vercel(?:@\S+)?\s+build/) && ordered(build, deploy, /vercel(?:@\S+)?\s+build/, /vercel(?:@\S+)?\s+deploy/), `${target}: pull then build then deploy`);
  if (migration >= 0) {
    add(errors, /--db-url(?:\s+|=)\$\{\{\s*secrets(?:\.SUPABASE_DB_URL|\[SUPABASE_DB_URL\])\s*\}\}/.test(commands[migration]), `${target}: --db-url uses secrets.SUPABASE_DB_URL`);
    const migrationCommand = commands[migration];
    add(errors, !/\|\|\s*(?:true|:|echo)\b|set\s+\+e/.test(migrationCommand), `${target}: migration failure is not swallowed`);
  }
  for (const index of [migration, pull, build, deploy].filter(index => index >= 0)) {
    add(errors, runs[index].step["continue-on-error"] !== true && !/always\s*\(|failure\s*\(|cancelled\s*\(/.test(String(runs[index].step.if ?? "")), `${target}: failure-gated delivery step`);
  }
  if (pull >= 0) add(errors, new RegExp(`--environment(?:=|\\s+)${prod ? "production" : "preview"}\\b`).test(commands[pull]), `${target}: pulls own target`);
  if (deploy >= 0) add(errors, /--prebuilt\b/.test(commands[deploy]), `${target}: deploy --prebuilt`);
  if (prod) {
    for (const index of [build, deploy]) if (index >= 0) add(errors, /--prod\b/.test(commands[index]), `${target}: --prod on build and deploy`);
    const ancestry = commands.findIndex(command => /git\s+(?:merge-base\s+--is-ancestor|branch\b[^\n]*--contains)/.test(command) && /(?:\b|\/)master\b/.test(command));
    add(errors, ancestry >= 0 && ordered(ancestry, migration, /git\s/, /supabase\s+db\s+push/), `${target}: master ancestry check before migration`);
    if (ancestry >= 0) {
      const command = commands[ancestry];
      add(errors, ancestryIsEnforced(command), `${target}: ancestry result is enforced in the tag-to-master direction`);
      add(errors, runs[ancestry].step["continue-on-error"] !== true && !/\|\|\s*(?:true|:|echo)\b/.test(command), `${target}: ancestry failure stops migrations`);
    }
    add(errors, !allText.includes("homebrew-cs3227-dev.vercel.app") && !commands.some(command => invokes(command, "alias")), `${target}: no development alias`);
  } else {
    add(errors, !/--prod\b/.test(allText), `${target}: no --prod`);
    add(errors, commands.some(command => invokes(command, "alias(?:\\s+set)?") && command.includes("homebrew-cs3227-dev.vercel.app")), `${target}: development alias`);
  }
  add(errors, /\bvercel@\d+\.\d+\.\d+(?:\s|["\\]|$)/.test(allText) && !/vercel@(?:latest|[~^*><])/.test(allText), `${target}: exact Vercel CLI version pin`);
  const steps = stepsOf(job);
  if (build >= 0) add(errors, steps.findIndex(step => /(?:^|\/)setup-bun@/.test(String(step.uses))) < runs[build].index && steps.findIndex(step => /(?:^|\/)setup-node@/.test(String(step.uses))) < runs[build].index, `${target}: toolchain setup before build`);
  add(errors, steps.some(step => /(?:^|\/)setup-bun@/.test(String(step.uses)) && (!object(step.with)["bun-version"] && (!object(step.with)["bun-version-file"] || object(step.with)["bun-version-file"] === "package.json") || String(object(step.with)["bun-version"]).includes("packageManager"))), `${target}: Bun from package.json packageManager`);
  add(errors, steps.some(step => /(?:^|\/)setup-node@/.test(String(step.uses)) && String(object(step.with)["node-version"]) === "24"), `${target}: Node 24`);
  const signature = (group: unknown, wf: Workflow, jobId: string) => String(group).replace(/\$\{\{\s*github.workflow\s*\}\}/g, String(wf.document.name ?? wf.file)).replace(/\$\{\{\s*github.job\s*\}\}/g, jobId);
  const other = discover(workflows, prod ? "development" : "production");
  for (const match of other) add(errors, signature(concurrency.group, workflow, id) !== signature(object(match.job.concurrency ?? match.workflow.document.concurrency).group, match.workflow, match.id), `${target}: distinct concurrency group per environment`);
  return errors;
}

export function vercelConfiguration(value: unknown): string[] {
  const config = object(value);
  const errors: string[] = [];
  add(errors, JSON.stringify(config.regions) === '["sin1"]', "vercel.json: regions [sin1]");
  add(errors, object(config.git).deploymentEnabled === false || object(config.github).enabled === false, "vercel.json: Git deployments disabled");
  return errors;
}
