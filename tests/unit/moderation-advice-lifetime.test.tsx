import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ModerationTable } from "@/app/admin/moderation/moderation-table";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const rows = [{ id: "review-one", text: "Coffee", cafe_name: "Cafe", rating: 4, submittedDisplay: "12:00", moderation_state: "pending" as const }];
test("history restoration discards advice and leaving aborts an outstanding triage request", async () => {
  let signal: AbortSignal | undefined;
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    signal = init.signal as AbortSignal;
    return Response.json({ requestId: "synthetic", feature: "moderation", mode: "ai", source: "provider",
      data: { classifications: [{ reviewId: "review-one", label: "ok", reason: "Relevant" }] } });
  });
  vi.stubGlobal("fetch", fetch);
  render(<ModerationTable rows={rows} pending />);
  fireEvent.click(screen.getByRole("button", { name: "Triage pending reviews" }));
  await screen.findByText("AI suggestion");
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
  expect(screen.queryByText("AI suggestion")).toBeNull();
  fetch.mockImplementation(async (_url, init) => { signal = init.signal as AbortSignal; return new Promise<Response>(() => {}); });
  fireEvent.click(screen.getByRole("button", { name: "Triage pending reviews" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  fireEvent(window, new PageTransitionEvent("pagehide"));
  expect(signal?.aborted).toBe(true);
});
