// Mechanical drift checks for specs, PLAN.md, test titles and workflow docs.
// Each rule restates a written convention; see workflow/specs/README.md,
// .agents/skills/plan-create/SKILL.md and docs/DeveloperGuide.md.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { headingSlugs, markdownLinks, proseLines } from "./markdown";
import {
  criterionPattern,
  ownerRoles,
  parsePlan,
  planSections,
  requirementPattern,
  taskCriteria,
  taskDependencies,
  taskFields,
  taskOwner,
  taskStatus,
  taskStatuses,
  type PlanTask,
} from "./plan";
import { testFiles, testTitles } from "./test-titles";

export interface Finding {
  level: "error" | "warning";
  file: string;
  line?: number;
  message: string;
}

const specsDir = "workflow/specs";
const storiesDir = `${specsDir}/stories`;
const technicalSpec = `${specsDir}/TECHNICAL-SPEC.md`;
const securitySpec = `${specsDir}/AI-SECURITY-SPEC.md`;
const productSpec = `${specsDir}/PRODUCT-SPEC.md`;
const planPath = "workflow/PLAN.md";
const developerGuide = "docs/DeveloperGuide.md";
const storyFilePattern = /^((?:SYS|CUS|OWN|ADM)-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const criterionDefinition = /^\s*[-*]\s+\*\*`?((?:SYS|CUS|OWN|ADM|SEC)-\d+\.\d+)`?:\*\*/;
const requirementHeading = /^#{2,4}\s+`?((?:SYS|CUS|OWN|ADM|SEC)-\d+)\b/;

/** Markdown whose relative links must resolve. Handoffs and logs are immutable history. */
const linkedRoots = ["AGENTS.md", "README.md", "docs", "workflow", ".agents/skills"];
const linkExcludes = ["workflow/handoffs/", "logs/"];

/** Workflow files that docs/DeveloperGuide.md must list in its inventory. */
const inventoryRoots = ["workflow/agents", "workflow/scripts", "workflow/templates", ".agents/skills", ".codex", ".github"];
const inventoryFiles = ["AGENTS.md", "workflow/specs/README.md", "workflow/handoffs/README.md"];

export function checkRepository(root: string): Finding[] {
  const findings: Finding[] = [];
  const read = (path: string) => readFileSync(join(root, path), "utf8");
  const exists = (path: string) => existsSync(join(root, path));
  const error = (file: string, message: string, line?: number) =>
    findings.push({ level: "error", file, line, message });
  const warning = (file: string, message: string, line?: number) =>
    findings.push({ level: "warning", file, line, message });

  // Story IDs come only from PRODUCT-SPEC.md's "User stories" section.
  const stories = new Map<string, number>();
  if (exists(productSpec)) {
    let inStories = false;
    read(productSpec).split(/\r?\n/).forEach((line, index) => {
      if (/^## /.test(line)) inStories = /^## User stories\s*$/.test(line);
      const id = inStories ? line.match(/^\|\s*((?:SYS|CUS|OWN|ADM)-\d{2})\s*\|/)?.[1] : undefined;
      if (!id) return;
      if (stories.has(id)) error(productSpec, `Story ${id} is listed twice in User stories.`, index + 1);
      stories.set(id, index + 1);
    });
  } else {
    error(productSpec, "Missing product spec; story IDs cannot be checked.");
  }

  // SYS-04+ requirements belong to TECHNICAL-SPEC.md and SEC to AI-SECURITY-SPEC.md.
  const requirements = new Set(stories.keys());
  for (const [file, prefix] of [[technicalSpec, "SYS"], [securitySpec, "SEC"]] as const) {
    if (!exists(file)) continue;
    proseLines(read(file)).forEach((line, index) => {
      const id = line.match(requirementHeading)?.[1];
      if (!id) return;
      if (!id.startsWith(`${prefix}-`)) error(file, `${id} is defined in the wrong spec.`, index + 1);
      else if (prefix === "SYS" && Number(id.slice(4)) < 4) error(file, `${id} is a product story ID; SYS requirements here start at SYS-04.`, index + 1);
      requirements.add(id);
    });
  }

  // Story files: one per product story, named <ID>-<slug>.md.
  const storyFiles = exists(storiesDir)
    ? readdirSync(join(root, storiesDir)).filter((name) => name.endsWith(".md")).sort()
    : [];
  const storyOwners = new Map<string, string>();
  const placeholders = templatePlaceholders(root);
  for (const name of storyFiles) {
    const file = `${storiesDir}/${name}`;
    const id = name.match(storyFilePattern)?.[1];
    if (!id) {
      error(file, "Story files are named <ID>-<lowercase-slug>.md.");
      continue;
    }
    if (!stories.has(id)) error(file, `${id} is not a story in PRODUCT-SPEC.md's User stories section.`);
    if (storyOwners.has(id)) error(file, `${id} already has a story file: ${storyOwners.get(id)}.`);
    storyOwners.set(id, file);
    const text = read(file);
    if (!proseLines(text).some((line) => line.match(requirementHeading)?.[1] === id)) {
      error(file, `Missing the requirement heading for ${id}.`);
    }
    proseLines(text).forEach((line, index) => {
      for (const placeholder of placeholders) {
        if (line.includes(placeholder)) error(file, `Template placeholder ${placeholder} remains.`, index + 1);
      }
    });
  }

  // Each criterion has exactly one definition, in the spec that owns its requirement.
  const criteria = new Map<string, string>();
  const specFiles = [
    ...listMarkdown(root, specsDir).filter((file) => dirname(file) === specsDir && basename(file) !== "README.md"),
    ...storyFiles.map((name) => `${storiesDir}/${name}`),
  ];
  for (const file of specFiles) {
    proseLines(read(file)).forEach((line, index) => {
      const id = line.match(criterionDefinition)?.[1];
      if (!id) return;
      const requirement = id.replace(/\.\d+$/, "");
      const owner = criterionOwner(requirement, storyOwners);
      if (criteria.has(id)) error(file, `${id} is already defined in ${criteria.get(id)}.`, index + 1);
      else criteria.set(id, file);
      if (owner && owner !== file) error(file, `${id} must be defined in ${owner}.`, index + 1);
      if (!owner) error(file, `${id} has no owning spec; its requirement ${requirement} is undefined.`, index + 1);
    });
  }

  // Requirement and criterion references must point at existing definitions.
  const referenceFiles = [planPath, ...specFiles].filter(exists);
  for (const file of referenceFiles) {
    proseLines(read(file)).forEach((line, index) => {
      for (const id of line.match(requirementPattern) ?? []) {
        if (!requirements.has(id)) error(file, `Reference to undefined requirement ${id}.`, index + 1);
      }
    });
  }
  for (const file of storyFiles.map((name) => `${storiesDir}/${name}`)) {
    proseLines(read(file)).forEach((line, index) => {
      for (const id of line.match(criterionPattern) ?? []) {
        if (!criteria.has(id)) error(file, `Reference to undefined criterion ${id}.`, index + 1);
      }
    });
  }
  for (const path of testFiles(join(root, "tests"))) {
    const file = relative(root, path).split(sep).join("/");
    for (const { title } of testTitles(readFileSync(path, "utf8"))) {
      for (const id of title.match(criterionPattern) ?? []) {
        if (!criteria.has(id)) error(file, `Test title "${title}" names undefined criterion ${id}.`);
      }
    }
  }

  if (exists(planPath)) checkPlan(parsePlan(read(planPath)), criteria, error, warning);
  else error(planPath, "Missing PLAN.md.");

  checkRegistry(root, error, warning);
  checkLinks(root, error);
  checkInventory(root, error);
  return findings;
}

function criterionOwner(requirement: string, storyOwners: Map<string, string>): string | undefined {
  if (requirement.startsWith("SEC-")) return securitySpec;
  if (requirement.startsWith("SYS-") && Number(requirement.slice(4)) >= 4) return technicalSpec;
  return storyOwners.get(requirement);
}

type Report = (file: string, message: string, line?: number) => void;

function checkPlan(tasks: PlanTask[], criteria: Map<string, string>, error: Report, warning: Report) {
  const byId = new Map<string, PlanTask>();
  for (const task of tasks) {
    if (byId.has(task.id)) error(planPath, `Task ${task.id} is defined twice.`, task.line);
    byId.set(task.id, task);
  }
  const owners = new Map<string, { testing: PlanTask[]; implementation: PlanTask[] }>();
  for (const task of tasks) {
    if (!(planSections as readonly string[]).includes(task.section)) {
      warning(planPath, `${task.id} is under "${task.section}", not one of ${planSections.join(", ")}.`, task.line);
    }
    for (const field of taskFields) {
      if (!task.fields.has(field)) error(planPath, `${task.id} is missing the ${field} field.`, task.line);
    }
    const owner = taskOwner(task);
    const status = taskStatus(task);
    const line = (field: string) => task.fieldLines.get(field) ?? task.line;
    if (task.fields.has("Owner role") && !(ownerRoles as readonly string[]).includes(owner)) {
      error(planPath, `${task.id} has unknown owner role "${owner}".`, line("Owner role"));
    }
    if (task.fields.has("Status") && !(taskStatuses as readonly string[]).includes(status)) {
      error(planPath, `${task.id} has unknown status "${status}".`, line("Status"));
    }
    for (const dependency of taskDependencies(task)) {
      if (dependency === task.id) error(planPath, `${task.id} depends on itself.`, line("Depends on"));
      else if (!byId.has(dependency)) error(planPath, `${task.id} depends on unknown task ${dependency}.`, line("Depends on"));
      else if (status === "done" && taskStatus(byId.get(dependency)!) !== "done") {
        error(planPath, `${task.id} is done but its dependency ${dependency} is not.`, line("Status"));
      }
    }
    if (["in-progress", "done"].includes(status) && /^\s*unassigned\s*$/.test(task.fields.get("Issue") ?? "")) {
      error(planPath, `${task.id} is ${status} without an issue.`, line("Issue"));
    }
    if (task.removed) continue;
    for (const criterion of taskCriteria(task)) {
      if (!criteria.has(criterion)) error(planPath, `${task.id} lists undefined criterion ${criterion}.`, line("Requirements"));
      if (owner === "spec") {
        error(planPath, `${task.id} is a spec task; spec tasks own no criteria (${criterion}).`, line("Requirements"));
      }
      if (owner === "testing" || owner === "implementation") {
        const entry = owners.get(criterion) ?? { testing: [], implementation: [] };
        entry[owner].push(task);
        owners.set(criterion, entry);
      }
    }
  }
  for (const [criterion, { testing, implementation }] of owners) {
    for (const [role, list] of [["testing", testing], ["implementation", implementation]] as const) {
      if (list.length > 1) {
        error(planPath, `${criterion} has ${list.length} ${role} tasks: ${list.map((task) => task.id).join(", ")}.`, list[1].line);
      }
      if (list.length === 0) {
        const other = role === "testing" ? implementation[0] : testing[0];
        error(planPath, `${criterion} has no ${role} task (listed by ${other.id}).`, other.line);
      }
    }
    for (const task of implementation) {
      for (const test of testing) {
        if (!taskDependencies(task).includes(test.id)) {
          error(planPath, `${task.id} implements ${criterion} but does not depend on its test task ${test.id}.`, task.line);
        }
      }
    }
  }
  const unplanned = new Map<string, { file: string; ids: string[] }>();
  for (const [criterion, file] of criteria) {
    if (owners.has(criterion)) continue;
    const requirement = criterion.replace(/\.\d+$/, "");
    const entry = unplanned.get(requirement) ?? { file, ids: [] };
    entry.ids.push(criterion);
    unplanned.set(requirement, entry);
  }
  for (const [requirement, { file, ids }] of unplanned) {
    warning(file, `${requirement} has ${ids.length} criteria not planned in any PLAN.md task yet: ${ids.join(", ")}.`);
  }
  const cycle = findCycle(tasks.map((task) => [task.id, taskDependencies(task)]));
  if (cycle) error(planPath, `Dependency cycle: ${cycle.join(" → ")}.`);
}

function findCycle(graph: [string, string[]][]): string[] | undefined {
  const edges = new Map(graph);
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (node: string): string[] | undefined => {
    if (state.get(node) === "done") return undefined;
    if (state.get(node) === "visiting") return [...stack.slice(stack.indexOf(node)), node];
    state.set(node, "visiting");
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(node, "done");
    return undefined;
  };
  for (const [node] of graph) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return undefined;
}

/** workflow/specs/README.md's registry Status column must match the files on disk. */
function checkRegistry(root: string, error: Report, warning: Report) {
  const registry = `${specsDir}/README.md`;
  if (!existsSync(join(root, registry))) return;
  readFileSync(join(root, registry), "utf8").split(/\r?\n/).forEach((line, index) => {
    const row = line.match(/^\|\s*`([^`]+\.md)`\s*\|.*\|\s*(Written|Planned)\s*\|\s*$/);
    if (!row || row[1].includes("<")) return;
    const present = existsSync(join(root, specsDir, row[1]));
    if (row[2] === "Written" && !present) error(registry, `${row[1]} is marked Written but does not exist.`, index + 1);
    if (row[2] === "Planned" && present) warning(registry, `${row[1]} exists but is still marked Planned.`, index + 1);
  });
}

function checkLinks(root: string, error: Report) {
  const files = linkedRoots
    .flatMap((path) => (path.endsWith(".md") ? (existsSync(join(root, path)) ? [path] : []) : listMarkdown(root, path)))
    .filter((file) => !linkExcludes.some((prefix) => file.startsWith(prefix)));
  const slugCache = new Map<string, Set<string>>();
  const slugs = (file: string) => {
    if (!slugCache.has(file)) slugCache.set(file, headingSlugs(readFileSync(join(root, file), "utf8")));
    return slugCache.get(file)!;
  };
  for (const file of files) {
    for (const { target, line } of markdownLinks(readFileSync(join(root, file), "utf8"))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [rawPath, rawAnchor] = target.split("#", 2);
      let path: string;
      try {
        path = rawPath ? relative(root, resolve(root, dirname(file), decodeURIComponent(rawPath))).split(sep).join("/") : file;
      } catch {
        error(file, `Malformed link target ${target}.`, line);
        continue;
      }
      if (path.startsWith("..")) {
        error(file, `Link ${target} leaves the repository.`, line);
      } else if (!existsSync(join(root, path))) {
        error(file, `Broken link ${target}.`, line);
      } else if (rawAnchor && path.endsWith(".md") && !slugs(path).has(decodeURIComponent(rawAnchor))) {
        error(file, `Link ${target} names a missing heading #${rawAnchor}.`, line);
      }
    }
  }
}

/** docs/DeveloperGuide.md says: "Add every new workflow file to this table." */
function checkInventory(root: string, error: Report) {
  if (!existsSync(join(root, developerGuide))) return;
  const guide = readFileSync(join(root, developerGuide), "utf8");
  const files = [
    ...inventoryFiles.filter((path) => existsSync(join(root, path))),
    ...inventoryRoots.flatMap((path) => listFiles(root, path)),
  ];
  for (const file of files) {
    if (!guide.includes(`\`${file}\``)) error(developerGuide, `Workflow file ${file} is missing from the workflow files table.`);
  }
}

function templatePlaceholders(root: string): string[] {
  const found = new Set<string>();
  for (const name of ["story-spec.md", "ai-feature-spec.md"]) {
    const path = join(root, "workflow/templates", name);
    if (!existsSync(path)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(/\[[^\]\n]+\](?!\()/g)) found.add(match[0]);
  }
  return [...found];
}

function listFiles(root: string, directory: string): string[] {
  const path = join(root, directory);
  if (!existsSync(path) || !statSync(path).isDirectory()) return [];
  return readdirSync(path, { withFileTypes: true })
    .flatMap((entry) => {
      const child = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return listFiles(root, child);
      return entry.isFile() && entry.name !== ".DS_Store" ? [child] : [];
    })
    .sort();
}

function listMarkdown(root: string, directory: string): string[] {
  return listFiles(root, directory).filter((file) => file.endsWith(".md"));
}
