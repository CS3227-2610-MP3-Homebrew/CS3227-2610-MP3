import { Activity } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DemoKit } from "@/app/_components/demo-kit";
const accounts = ["customer", "owner", "admin"].map(role => ({ role, email: `${role}-lifetime@example.com`, password: `${role}-synthetic-lifetime-secret` }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function create() { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create demo kit" })); }); }
test("hidden and restored account pages discard credential state", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ kit: { accounts } }));
  const view = render(<Activity mode="visible"><DemoKit /></Activity>);
  await create(); expect(screen.getByText(accounts[0].password)).toBeDefined();
  view.rerender(<Activity mode="hidden"><DemoKit /></Activity>);
  view.rerender(<Activity mode="visible"><DemoKit /></Activity>);
  expect(screen.queryByText(accounts[0].password)).toBeNull();
});
test("late creation completion cannot restore credentials after navigation", async () => {
  let finish!: (response: Response) => void;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<Activity mode="visible"><DemoKit /></Activity>);
  await create(); view.rerender(<Activity mode="hidden"><DemoKit /></Activity>);
  await act(async () => { finish(Response.json({ kit: { accounts } })); });
  view.rerender(<Activity mode="visible"><DemoKit /></Activity>);
  expect(screen.queryByText(accounts[0].password)).toBeNull();
});
test("document pagehide removes credentials before browser history capture", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ kit: { accounts } }));
  render(<DemoKit />); await create();
  expect(screen.getByText(accounts[0].password)).toBeDefined();
  act(() => { window.dispatchEvent(new Event("pagehide")); });
  expect(screen.queryByText(accounts[0].password)).toBeNull();
});
