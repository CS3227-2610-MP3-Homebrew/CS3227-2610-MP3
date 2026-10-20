// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { actor, guardModule, type Role } from "./contracts";

const { getVerifiedActor } = vi.hoisted(() => ({ getVerifiedActor: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor }));

beforeEach(() => { vi.clearAllMocks(); getVerifiedActor.mockResolvedValue(actor); });

for (const operationName of ["read", "mutation"]) {
  test.each(["customer", "owner", "admin"] as Role[])(`SYS-05.2: direct ${operationName} independently authenticates %s and checks record permission`, async (role) => {
    const current = { ...actor, role };
    getVerifiedActor.mockResolvedValue(current);
    const { withAuthorizedActor } = await guardModule();
    const authorize = vi.fn().mockResolvedValue(true);
    const operation = vi.fn().mockResolvedValue("private-result");
    expect(await withAuthorizedActor({ role, authorize, operation })).toBe("private-result");
    expect(getVerifiedActor).toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith(current);
    expect(operation).toHaveBeenCalledWith(current);
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(operation.mock.invocationCallOrder[0]);
  });

  test.each([null, { ...actor, role: "owner" }])(`SYS-05.2: direct ${operationName} denies absent or wrong-role sessions before private work (%j)`, async (session) => {
    getVerifiedActor.mockResolvedValue(session);
    const { withAuthorizedActor } = await guardModule();
    const authorize = vi.fn().mockResolvedValue(true);
    const operation = vi.fn().mockResolvedValue("private-result");
    await expect(withAuthorizedActor({ role: "customer", authorize, operation })).rejects.toBeDefined();
    expect(getVerifiedActor).toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });

  test(`SYS-05.2: direct ${operationName} denies another owner's or workspace's record`, async () => {
    const { withAuthorizedActor } = await guardModule();
    for (const record of [
      { ownerId: "another-user", workspaceId: actor.workspaceId },
      { ownerId: actor.id, workspaceId: "00000000-0000-4000-8000-000000000043" },
    ]) {
      const authorize = vi.fn((current) => current.id === record.ownerId && current.workspaceId === record.workspaceId);
      const operation = vi.fn().mockResolvedValue("private-result");
      await expect(withAuthorizedActor({ role: "customer", authorize, operation })).rejects.toBeDefined();
      expect(authorize).toHaveBeenCalledWith(actor);
      expect(operation).not.toHaveBeenCalled();
    }
  });

  test(`SYS-05.2: direct ${operationName} fails closed when session or record verification fails`, async () => {
    const { withAuthorizedActor } = await guardModule();
    const operation = vi.fn();
    getVerifiedActor.mockRejectedValueOnce(new Error("verification unavailable"));
    await expect(withAuthorizedActor({ role: "customer", authorize: () => true, operation })).rejects.toBeDefined();
    await expect(withAuthorizedActor({ role: "customer", authorize: () => { throw new Error("record lookup unavailable"); }, operation })).rejects.toBeDefined();
    expect(operation).not.toHaveBeenCalled();
  });
}

test("SYS-05.2: a successful earlier UI/proxy check does not authorize a later expired-session mutation", async () => {
  const { withAuthorizedActor } = await guardModule();
  const operation = vi.fn().mockResolvedValue("private-result");
  await withAuthorizedActor({ role: "customer", authorize: () => true, operation });
  getVerifiedActor.mockResolvedValue(null);
  await expect(withAuthorizedActor({ role: "customer", authorize: () => true, operation })).rejects.toBeDefined();
  expect(operation).toHaveBeenCalledTimes(1);
  expect(getVerifiedActor).toHaveBeenCalledTimes(2);
});
