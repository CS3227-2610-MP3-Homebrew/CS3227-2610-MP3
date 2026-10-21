// @vitest-environment node
import { PassThrough } from "node:stream";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/server/auth/account-access", () => ({ resolveAccountAccess: async () => ({ kind: "verified", actor: { id: "synthetic-customer", workspaceId: "synthetic-workspace", role: "customer" } }) }));
const source = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: source.client }));

test("CUS-01.8 CUS-02.9: authorized catalogue source suspends while a public shell streams without catalogue content", async () => {
  source.client.mockImplementation(() => new Promise(() => {}));
  const { default: Page } = await import("../../../src/app/customer/cafes/page");
  const { default: Layout } = await import("../../../src/app/customer/layout");
  let allReady = false; let html = "";
  let ready!: () => void;
  const shell = new Promise<void>(resolve => { ready = resolve; });
  const sink = new PassThrough(); sink.on("data", chunk => { html += chunk.toString(); });
  const output = renderToPipeableStream(createElement(Layout, { children: createElement(Page as ComponentType<{ searchParams: Promise<Record<string, string>> }>, { searchParams: Promise.resolve({}) }) } as { children: ReactNode }), {
    onShellReady() { output.pipe(sink); ready(); },
    onAllReady() { allReady = true; },
    onError() { /* Aborting the intentionally pending synthetic source is expected. */ },
  });
  try {
    await shell;
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(source.client, "Catalogue performs its request-scoped RLS read").toHaveBeenCalled();
    expect(allReady, "Protected catalogue source stays pending after shell emission").toBe(false);
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain("synthetic-workspace"); expect(html).not.toContain("synthetic-customer");
  } finally { output.abort(); sink.destroy(); }
});
