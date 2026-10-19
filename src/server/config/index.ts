import "server-only";
import { parseConfiguration, redactSensitiveOutput } from "./runtime";

/** Lazy validation: never inspect credentials until a server operation needs them. */
export function getConfiguration() {
  return parseConfiguration(process.env);
}

/** All application error/audit serialization can share the same safe projection. */
export function sanitizeServerOutput(value: unknown): unknown {
  return redactSensitiveOutput(value, process.env);
}
