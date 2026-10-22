// @vitest-environment node
import { PassThrough } from "node:stream";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
// The real shared layout renders SignOut, which needs App Router context even
// though this server-stream probe never performs client navigation.
vi.mock("next/navigation", async importOriginal => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/auth/account-access", () => ({ resolveAccountAccess: async () => ({ kind: "verified", actor: { id: "synthetic-customer", workspaceId: "synthetic-workspace", role: "customer" } }) }));
const source = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: source.client }));

test("CUS-01.8 CUS-02.9: authorized catalogue source suspends while a public shell streams without catalogue content", async () => {
  let readStarted!: () => void;
  const sourceRead = new Promise<void>(resolve => { readStarted = resolve; });
  source.client.mockImplementation(() => { readStarted(); return new Promise(() => {}); });
  const { default: Page } = await import("../../../src/app/customer/cafes/page");
  const { default: Layout } = await import("../../../src/app/customer/layout");
  let allReady = false; let html = ""; let aborting = false;
  const renderErrors: unknown[] = [];
  let ready!: () => void;
  const shell = new Promise<void>(resolve => { ready = resolve; });
  let received!: () => void;
  const firstChunk = new Promise<void>(resolve => { received = resolve; });
  const sink = new PassThrough(); sink.on("data", chunk => { html += chunk.toString(); received(); });
  const content = createElement(Layout, { children: createElement(Page as ComponentType<{ searchParams: Promise<Record<string, string>> }>, { searchParams: Promise.resolve({}) }) } as { children: ReactNode });
  // Match the document container supplied by Next's root layout. React can
  // retain a root-only Suspense fallback until completion without this shell.
  const output = renderToPipeableStream(createElement("html", null, createElement("body", null, content)), {
    onShellReady() { output.pipe(sink); ready(); },
    onAllReady() { allReady = true; },
    onError(error) { if (!aborting) { renderErrors.push(error); received(); readStarted(); } },
    onShellError(error) { renderErrors.push(error); ready(); received(); readStarted(); },
  });
  try {
    await shell;
    await firstChunk;
    await sourceRead;
    expect(renderErrors, "Rendering must not fail before the catalogue source suspends").toEqual([]);
    expect(source.client, "Catalogue performs its request-scoped RLS read").toHaveBeenCalled();
    expect(allReady, "Protected catalogue source stays pending after shell emission").toBe(false);
    expect(html).toContain("Checking account");
    expect(html).not.toContain("synthetic-workspace"); expect(html).not.toContain("synthetic-customer");
  } finally { aborting = true; output.abort(); sink.destroy(); }
});
