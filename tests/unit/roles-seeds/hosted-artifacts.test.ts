// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { deployment, parseWorkflow } from "../delivery/workflow-contract";

test.each(["development", "production"] as const)("SYS-06.4: %s delivery excludes local seeds, resets and demo password artifacts", (target) => {
  const workflows = readdirSync(".github/workflows").filter((name) => /\.ya?ml$/.test(name))
    .map((name) => parseWorkflow(name, readFileSync(join(".github/workflows", name), "utf8")));
  const errors = deployment(workflows, target).filter((message) => /seeds|credentials|application secrets/.test(message));
  expect(errors).toEqual([]);
});
