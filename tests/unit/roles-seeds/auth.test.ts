// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";
import { signupModule, workspaceModule, type Role } from "./contracts";

vi.mock("server-only", () => ({}));
const main = "00000000-0000-4000-8000-000000000001";
const kitA = "00000000-0000-4000-8000-000000000002";
const kitB = "00000000-0000-4000-8000-000000000003";

test.each(["customer", "owner"])("SYS-06.4 SYS-12.3: signup accepts %s and always selects the main workspace", async (role) => {
  const subject = await signupModule();
  expect(subject.resolveSignup({ role }, main)).toEqual({ role, workspaceId: main });
});

test.each(["admin", "Admin", "administrator", "", null, undefined, 1, { role: "admin" }])("SYS-06.4 SYS-12.3: signup rejects forbidden role %j", async (role) => {
  const subject = await signupModule();
  expect(() => subject.resolveSignup({ role }, main)).toThrow();
});

const maliciousMetadata = [
  { role: "admin" }, { app_role: "admin" }, { is_admin: true },
  { workspaceId: kitA }, { workspace_id: kitA },
  { role: "admin", workspace_id: kitB, user_metadata: { role: "admin" } },
];
test.each(maliciousMetadata)("SYS-06.4 SYS-12.3: untrusted metadata %j cannot grant Admin or select a workspace", async (metadata) => {
  const subject = await signupModule();
  for (const role of ["customer", "owner"] as const) {
    // Either rejecting forged metadata or ignoring it meets the fixed contract.
    let result;
    try { result = subject.resolveSignup({ role, metadata }, main); }
    catch (error) { expect(error).toBeInstanceOf(Error); continue; }
    expect(result).toEqual({ role, workspaceId: main });
  }
});

test("SYS-06.4: explicit dev and prod declarations both disable email confirmation", async () => {
  const subject = await signupModule();
  expect(() => subject.validateAuthConfiguration({ dev: { emailConfirmationEnabled: false }, prod: { emailConfirmationEnabled: false } })).not.toThrow();
});
test.each(["dev", "prod"] as const)("SYS-06.4: confirmation-on declaration in %s is refused", async (target) => {
  const subject = await signupModule();
  const declaration = { dev: { emailConfirmationEnabled: false }, prod: { emailConfirmationEnabled: false } };
  declaration[target].emailConfirmationEnabled = true;
  expect(() => subject.validateAuthConfiguration(declaration)).toThrow();
});
test("SYS-06.4: local Supabase email confirmation is disabled", () => {
  const source = readFileSync("supabase/config.toml", "utf8");
  const email = source.split("[auth.email]")[1]?.split(/\n\[/)[0];
  expect(email).toMatch(/^enable_confirmations\s*=\s*false\s*$/m);
});

test.each(["customer", "owner", "admin"] as Role[])("SYS-12.2: server workspace boundary applies equally to %s including AI source and cache scopes", async (role) => {
  const subject = await workspaceModule();
  for (const [source, target] of [[main, kitA], [kitA, main], [kitA, kitB], [kitB, kitA]]) {
    const actor = { id: `${role}-verified`, role, workspaceId: source };
    // This is the shared scope prerequisite; it never grants a domain operation.
    expect(subject.authorizeWorkspace(actor, source)).toBe(true);
    expect(subject.authorizeWorkspace(actor, target)).toBe(false);
  }
});
test("SYS-06.3 SYS-12.2: server workspace boundary refuses absent authentication", async () => {
  const subject = await workspaceModule();
  for (const workspace of [main, kitA, kitB]) expect(subject.authorizeWorkspace(null, workspace)).toBe(false);
});
