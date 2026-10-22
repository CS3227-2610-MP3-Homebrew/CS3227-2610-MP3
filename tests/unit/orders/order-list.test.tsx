import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrderList } from "@/app/customer/orders/order-list";
import type { Order } from "@/server/orders/schema";

const placedAt = "2026-01-01T00:00:00Z";
const acceptedAt = "2026-01-01T01:00:00Z";
const readyAt = "2026-01-01T02:00:00Z";
const endedAt = "2026-01-01T03:00:00Z";
const unsafe = '<img src=x onerror="window.orderExecuted=true">';

function order(overrides: Partial<Order> = {}): Order {
  return {
    orderId: "order-one", cafeId: "cafe-one", cafeName: "Retained cafe name",
    placedAt, pickupAt: "2026-01-02T01:00:00Z", state: "pending",
    items: [{ itemId: "item-one", name: "Retained drink", quantity: 2, unitPriceCents: 450, lineTotalCents: 900 }],
    totalCents: 900, currency: "SGD", cancellationReason: null, rejectionReason: null,
    acceptedAt: null, readyAt: null, collectedAt: null, rejectedAt: null, cancelledAt: null,
    ...overrides,
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function cards() { return screen.queryAllByRole("article"); }
function card(id: string) {
  const article = screen.getByText(`Order ${id}`).closest("article");
  expect(article).not.toBeNull();
  return article!;
}
function event(article: HTMLElement, label: string, value: string | null, display?: string) {
  const scope = within(article);
  if (value === null) { expect(scope.queryByText(label, { exact: true })).toBeNull(); return; }
  const time = scope.getByText(label, { exact: true }).parentElement!.querySelector("time");
  expect(time?.getAttribute("datetime")).toBe(value);
  if (display) expect(time?.textContent).toBe(display);
}
function snapshots(article: HTMLElement, expected: Order) {
  const scope = within(article);
  expect(scope.getByRole("heading", { name: expected.cafeName })).toBeDefined();
  expect(scope.getByText("Retained drink", { exact: true })).toBeDefined();
  expect(scope.getByText("2 × S$4.50 each", { exact: true })).toBeDefined();
  expect(scope.getByText("S$9.00", { exact: true })).toBeDefined();
  expect(scope.getByText("Total: S$9.00", { exact: true })).toBeDefined();
  event(article, "Placed", expected.placedAt, "1 Jan 2026, 08:00 SGT");
  event(article, "Pickup", expected.pickupAt, "2 Jan 2026, 09:00 SGT");
}

test("CUS-04.1: a fresh same-page payload adds a newly placed order to an already mounted empty view", () => {
  const view = render(<OrderList initialOrders={[]} />);
  expect(screen.getByText("No orders yet.")).toBeDefined();
  const fresh = order();
  view.rerender(<OrderList initialOrders={[fresh]} />);
  expect(screen.queryByText("No orders yet.")).toBeNull();
  snapshots(card(fresh.orderId), fresh);
  expect(screen.getByRole("button", { name: "Cancel order" })).toBeDefined();
});

test("CUS-04.1: a fresh same-page 20-order collection replaces membership in newest-first and tied-reference order", () => {
  const old = Array.from({ length: 20 }, (_, index) => order({ orderId: `order-${String(index).padStart(2, "0")}` }));
  const view = render(<OrderList initialOrders={old} />);
  const newest = order({ orderId: "new-order", placedAt: "2026-01-02T00:00:00Z" });
  const fresh = [newest, ...old.slice(0, 19)];
  view.rerender(<OrderList initialOrders={fresh} />);
  expect(cards()).toHaveLength(20);
  expect(cards().map(article => within(article).getByText(/^Order /).textContent)).toEqual(fresh.map(item => `Order ${item.orderId}`));
  expect(screen.queryByText("Order order-19")).toBeNull();
  // A later delivered empty page must also replace the current collection.
  view.rerender(<OrderList initialOrders={[]} />);
  expect(cards()).toHaveLength(0);
  expect(screen.getByText("No orders yet.")).toBeDefined();
});

test("CUS-04.1: a fresh same-page payload can reorder existing records without changing page number", () => {
  const first = order({ orderId: "older", placedAt: "2025-12-31T00:00:00Z" });
  const second = order({ orderId: "newer" });
  const view = render(<OrderList initialOrders={[first]} />);
  view.rerender(<OrderList initialOrders={[second, first]} />);
  expect(cards().map(article => within(article).getByText(/^Order /).textContent)).toEqual(["Order newer", "Order older"]);
});

const transitions: { from: Partial<Order>; to: Partial<Order> }[] = [
  { from: {}, to: { state: "accepted", acceptedAt } },
  { from: { state: "accepted", acceptedAt }, to: { state: "ready", acceptedAt, readyAt } },
  { from: { state: "ready", acceptedAt, readyAt }, to: { state: "collected", acceptedAt, readyAt, collectedAt: endedAt } },
  { from: {}, to: { state: "rejected", rejectedAt: endedAt, rejectionReason: unsafe } },
];
for (const { from, to } of transitions) {
  test(`CUS-04.1: delivered ${from.state ?? "pending"} to ${to.state} updates the mounted state, feedback, controls and retained lifecycle snapshots`, () => {
    const before = order(from); const fresh = order(to);
    const view = render(<OrderList initialOrders={[before]} />);
    view.rerender(<OrderList initialOrders={[fresh]} />);
    const article = card(fresh.orderId); const scope = within(article);
    // Assert new feedback/timestamps first so failing-first evidence identifies
    // those stale fields as well as the state and membership regressions.
    if (fresh.state === "rejected") expect(scope.getByText(`Rejection reason: ${unsafe}`, { exact: true })).toBeDefined();
    if (fresh.state === "ready") event(article, "Ready at", fresh.readyAt, "1 Jan 2026, 10:00 SGT");
    if (fresh.state === "collected") event(article, "Collected at", fresh.collectedAt, "1 Jan 2026, 11:00 SGT");
    event(article, "Accepted at", fresh.acceptedAt, fresh.acceptedAt ? "1 Jan 2026, 09:00 SGT" : undefined);
    event(article, "Ready at", fresh.readyAt, fresh.readyAt ? "1 Jan 2026, 10:00 SGT" : undefined);
    event(article, "Collected at", fresh.collectedAt, fresh.collectedAt ? "1 Jan 2026, 11:00 SGT" : undefined);
    event(article, "Rejected at", fresh.rejectedAt, fresh.rejectedAt ? "1 Jan 2026, 11:00 SGT" : undefined);
    event(article, "Cancelled at", null);
    expect(scope.getByText(fresh.state, { exact: true })).toBeDefined();
    expect(scope.queryByText(before.state, { exact: true })).toBeNull();
    snapshots(article, fresh);
    expect(scope.queryByRole("button", { name: "Cancel order" })).toBeNull();
    const review = scope.queryByRole("link", { name: "Review order" });
    if (fresh.state === "collected") expect(review?.getAttribute("href")).toBe(`/customer/orders/${fresh.orderId}/review`);
    else expect(review).toBeNull();
    if (fresh.state === "rejected") expect(scope.getByText(`Rejection reason: ${unsafe}`, { exact: true })).toBeDefined();
    else expect(scope.queryByText(/Rejection reason:/)).toBeNull();
    expect(scope.queryByText("Cafe is suspended")).toBeNull();
    expect(article.querySelector("img")).toBeNull();
    expect(Reflect.get(window, "orderExecuted")).toBeUndefined();
  });
}

test("CUS-04.1: fresh suspension cancellations keep prior timestamps, public reason and retained terminal purchases separate from owner feedback", () => {
  const active = [order(), order({ orderId: "accepted-order", state: "accepted", acceptedAt }), order({ orderId: "ready-order", state: "ready", acceptedAt, readyAt })];
  const collected = order({ orderId: "collected-order", state: "collected", acceptedAt, readyAt, collectedAt: endedAt });
  const rejected = order({ orderId: "rejected-order", state: "rejected", rejectedAt: endedAt, rejectionReason: unsafe });
  const view = render(<OrderList initialOrders={[...active, collected, rejected]} />);
  const cancelled = active.map(item => ({ ...item, state: "cancelled" as const, cancelledAt: endedAt, cancellationReason: "Cafe is suspended" as const }));
  view.rerender(<OrderList initialOrders={[...cancelled, collected, rejected]} />);
  expect(screen.getAllByText("Cafe is suspended", { exact: true })).toHaveLength(3);
  for (const fresh of cancelled) {
    const article = card(fresh.orderId); const scope = within(article);
    expect(scope.getByText("cancelled", { exact: true })).toBeDefined();
    snapshots(article, fresh);
    event(article, "Accepted at", fresh.acceptedAt);
    event(article, "Ready at", fresh.readyAt);
    event(article, "Cancelled at", fresh.cancelledAt, "1 Jan 2026, 11:00 SGT");
    expect(scope.queryByText(/Rejection reason:/)).toBeNull();
    expect(scope.queryByRole("button")).toBeNull();
    expect(scope.queryByRole("link", { name: "Review order" })).toBeNull();
  }
  expect(within(card(collected.orderId)).getByText("collected", { exact: true })).toBeDefined();
  expect(within(card(collected.orderId)).getByRole("link", { name: "Review order" })).toBeDefined();
  snapshots(card(collected.orderId), collected);
  event(card(collected.orderId), "Collected at", endedAt);
  expect(within(card(rejected.orderId)).getByText(`Rejection reason: ${unsafe}`, { exact: true })).toBeDefined();
  expect(within(card(rejected.orderId)).queryByText("Cafe is suspended")).toBeNull();
  expect(document.querySelector("img")).toBeNull();
});

test("CUS-04.2: confirmed cancellation updates immediately without another server payload", async () => {
  const before = order(); const confirmed = order({ state: "cancelled", cancelledAt: endedAt });
  const fetch = vi.fn().mockResolvedValue(Response.json({ requestId: "cancel-confirmed", order: confirmed }));
  vi.stubGlobal("fetch", fetch);
  render(<OrderList initialOrders={[before]} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
  await screen.findByText("cancelled", { exact: true });
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/customer/orders/order-one/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  expect(screen.queryByText("Cafe is suspended")).toBeNull();
  snapshots(card(before.orderId), confirmed);
  event(card(before.orderId), "Cancelled at", endedAt);
});

test("CUS-04.1 CUS-04.2: a new delivered owner state stays current while an outstanding cancellation loses with a conflict", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  const view = render(<OrderList initialOrders={[order()]} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
  view.rerender(<OrderList initialOrders={[order({ state: "accepted", acceptedAt })]} />);
  finish(Response.json({ error: { code: "STATE_CONFLICT", message: "The order state has changed." } }, { status: 409 }));
  await screen.findByRole("alert");
  expect(screen.getByText("accepted", { exact: true })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  expect(screen.queryByText("cancelled", { exact: true })).toBeNull();
});

test("CUS-04.2 CUS-04.3: pending cancellation prevents duplicate requests and conflict leaves the last confirmed state intact", async () => {
  let finish!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetch);
  render(<OrderList initialOrders={[order(), order({ orderId: "second-order" })]} />);
  fireEvent.click(within(card("order-one")).getByRole("button", { name: "Cancel order" }));
  expect(screen.getByRole("button", { name: "Updating…" }).hasAttribute("disabled")).toBe(true);
  const other = within(card("second-order")).getByRole("button", { name: "Cancel order" });
  expect(other.hasAttribute("disabled")).toBe(true);
  fireEvent.click(other);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("cancelled", { exact: true })).toBeNull();
  finish(Response.json({ error: { code: "STATE_CONFLICT", message: "The order state has changed." } }, { status: 409 }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toBe("The order state has changed.");
  expect(screen.getAllByText("pending", { exact: true })).toHaveLength(2);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Cancel order" }).every(button => !button.hasAttribute("disabled"))).toBe(true));
});

test("CUS-04.2: an unconfirmed network failure reports safely without pretending cancellation succeeded", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Synthetic network failure")));
  render(<OrderList initialOrders={[order()]} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toBe("Unable to confirm cancellation. Refresh to check the current order before trying again.");
  expect(screen.getByText("pending", { exact: true })).toBeDefined();
  expect(screen.queryByText("cancelled", { exact: true })).toBeNull();
  expect(screen.getByRole("button", { name: "Cancel order" }).hasAttribute("disabled")).toBe(false);
});
