import { resolve } from "node:path";
import { checkRepository } from "./lib/spec-checks";

// Optional root lets the self-check exercise the CLI against isolated fixtures.
const root = resolve(process.argv[2] ?? ".");

function main(): number {
  const findings = checkRepository(root);
  const errors = findings.filter((finding) => finding.level === "error");
  for (const finding of findings) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    (finding.level === "error" ? console.error : console.warn)(`${finding.level}: ${location}: ${finding.message}`);
  }
  if (errors.length) {
    console.error(`Spec check failed with ${errors.length} error(s).`);
    return 1;
  }
  console.log(`Spec check passed (${findings.length} warning(s)).`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`Spec check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
