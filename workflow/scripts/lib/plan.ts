// Parser for workflow/PLAN.md tasks, following .agents/skills/plan-create/SKILL.md.
import { slugify } from "./markdown";

export const criterionPattern = /\b(?:SYS|CUS|OWN|ADM|SEC)-\d+\.\d+\b/g;
export const requirementPattern = /\b(?:SYS|CUS|OWN|ADM|SEC)-\d+\b(?!\.\d)/g;

export const taskFields = [
  "Depends on",
  "Owner role",
  "Requirements",
  "Description",
  "Work",
  "File scope",
  "Acceptance criteria",
  "Status",
  "Issue",
] as const;
export const ownerRoles = ["testing", "implementation", "spec"] as const;
export const taskStatuses = ["todo", "blocked", "awaiting-decision", "in-progress", "done"] as const;
export const planSections = ["Foundations", "Customer", "Café owner", "Admin"] as const;

export interface PlanTask {
  id: string;
  title: string;
  section: string;
  line: number;
  /** Field name → raw value, with continuation lines joined by newlines. */
  fields: Map<string, string>;
  /** Field name → 1-based line of the field. */
  fieldLines: Map<string, number>;
  removed: boolean;
}

export function parsePlan(text: string): PlanTask[] {
  const tasks: PlanTask[] = [];
  let section = "";
  let task: PlanTask | undefined;
  let field: string | undefined;
  text.split(/\r?\n/).forEach((line, index) => {
    const heading = line.match(/^(#{2,3})\s+(.*?)\s*$/);
    if (heading) {
      field = undefined;
      if (heading[1] === "##") {
        section = heading[2];
        task = undefined;
        return;
      }
      const taskHeading = heading[2].match(/^(T-\d+):\s*(.*)$/);
      task = taskHeading
        ? {
            id: taskHeading[1],
            title: taskHeading[2],
            section,
            line: index + 1,
            fields: new Map(),
            fieldLines: new Map(),
            removed: /\bremoved\b/i.test(taskHeading[2]),
          }
        : undefined;
      if (task) tasks.push(task);
      return;
    }
    if (!task) return;
    const start = line.match(/^- \*\*([^*]+?):\*\*\s?(.*)$/);
    if (start) {
      field = start[1];
      task.fields.set(field, start[2]);
      task.fieldLines.set(field, index + 1);
    } else if (field && line.trim()) {
      task.fields.set(field, `${task.fields.get(field)}\n${line}`);
    }
  });
  return tasks;
}

export function taskDependencies(task: PlanTask): string[] {
  return [...new Set(task.fields.get("Depends on")?.match(/\bT-\d+\b/g) ?? [])];
}

export function taskCriteria(task: PlanTask): string[] {
  return [...new Set(task.fields.get("Requirements")?.match(criterionPattern) ?? [])];
}

export function taskStatus(task: PlanTask): string {
  return task.fields.get("Status")?.trim() ?? "";
}

export function taskOwner(task: PlanTask): string {
  return task.fields.get("Owner role")?.trim() ?? "";
}

/** GitHub anchor for a task heading, e.g. "T-03: Test runtime" → "t-03-test-runtime". */
export function taskAnchor(task: PlanTask): string {
  return slugify(`${task.id}: ${task.title}`);
}
