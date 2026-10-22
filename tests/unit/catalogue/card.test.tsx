import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { ComponentType } from "react";

type Card = { cafeId: string; name: string; area: "Central"; rating: { average: number | null; visibleReviewCount: number }; isOpen: boolean; closingSoon: boolean; nextOpeningAt: string | null };
const cafe: Card = { cafeId: "synthetic-cafe", name: "Synthetic closed cafe", area: "Central", rating: { average: null, visibleReviewCount: 0 }, isOpen: false, closingSoon: false, nextOpeningAt: null };
afterEach(cleanup);
async function show(overrides: Partial<Card> = {}) {
  const path = resolve("src/app/customer/cafes/cafe-card.tsx");
  expect(existsSync(path), "Missing implementation: synchronous public CafeCard").toBe(true);
  const { default: CafeCard } = await import(/* @vite-ignore */ path) as { default: ComponentType<{ cafe: Card }> };
  render(<CafeCard cafe={{ ...cafe, ...overrides }} />);
}
test("CUS-01.9: closed card has canonical Singapore next-opening text and an enabled detail link", async () => {
  await show({ nextOpeningAt: "2026-10-18T16:15:00Z" });
  const link = screen.getByRole("link", { name: /Synthetic closed cafe/ });
  expect(link.getAttribute("href")).toBe("/customer/cafes/synthetic-cafe"); expect(link.getAttribute("aria-disabled")).not.toBe("true");
  expect(link.textContent).toContain("Cafe opens at 19 Oct 2026, 12:15 AM SGT");
  expect(screen.getByText("No reviews yet")).toBeDefined(); expect(screen.queryByText("closing soon")).toBeNull();
});
test("CUS-01.9: unscheduled closed card has no fabricated opening time", async () => {
  await show(); expect(screen.getByText("No opening hours scheduled")).toBeDefined(); expect(screen.queryByText(/Cafe opens at/)).toBeNull();
});
test("CUS-01.10: open final-30-minute card renders exact closing-soon bottom text", async () => {
  await show({ isOpen: true, closingSoon: true }); expect(screen.getByText("closing soon")).toBeDefined(); expect(screen.queryByText(/Cafe opens at|No opening hours scheduled/)).toBeNull();
});
test("CUS-01.10: open card above 30 minutes has no closing-soon label", async () => {
  await show({ isOpen: true }); expect(screen.queryByText("closing soon")).toBeNull(); expect(screen.queryByText(/Cafe opens at|No opening hours scheduled/)).toBeNull();
});
