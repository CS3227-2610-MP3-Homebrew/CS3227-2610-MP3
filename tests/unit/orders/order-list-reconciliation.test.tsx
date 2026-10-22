import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrderList } from "@/app/customer/orders/order-list";
import type { Order } from "@/server/orders/schema";

const cancelledAt = "2026-01-01T01:00:00Z";
function pending(orderId: string): Order {
  return {
    orderId, cafeId: "cafe", cafeName: "Retained cafe", state: "pending",
    placedAt: "2026-01-01T00:00:00Z", pickupAt: "2026-01-02T01:00:00Z",
    items: [{ itemId: "drink", name: "Coffee", quantity: 1, unitPriceCents: 450, lineTotalCents: 450 }],
    totalCents: 450, currency: "SGD", cancellationReason: null, rejectionReason: null,
    acceptedAt: null, readyAt: null, collectedAt: null, rejectedAt: null, cancelledAt: null,
  };
}
function article(orderId: string) { return screen.getByText(`Order ${orderId}`).closest("article")!; }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("multiple confirmed cancellations survive parent rerenders until a new server collection arrives", async () => {
  const first = pending("first"); const second = pending("second"); const source = [first, second];
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ order: { ...first, state: "cancelled", cancelledAt } }))
    .mockResolvedValueOnce(Response.json({ order: { ...second, state: "cancelled", cancelledAt } }));
  vi.stubGlobal("fetch", fetch);
  const view = render(<OrderList initialOrders={source} />);
  for (const order of source) {
    fireEvent.click(within(article(order.orderId)).getByRole("button", { name: "Cancel order" }));
    await within(article(order.orderId)).findByText("cancelled", { exact: true });
    view.rerender(<OrderList initialOrders={source} />);
  }
  expect(screen.getAllByText("cancelled", { exact: true })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  view.rerender(<OrderList initialOrders={[pending("newest")]} />);
  expect(screen.queryByText("Order first")).toBeNull();
  expect(screen.queryByText("Order second")).toBeNull();
  expect(within(article("newest")).getByRole("button", { name: "Cancel order" })).toBeDefined();
});

test("a late cancellation confirmation cannot restore an order removed by a fresh server collection", async () => {
  const first = pending("first"); const second = pending("second");
  let confirm!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { confirm = resolve; })));
  const view = render(<OrderList initialOrders={[first]} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
  view.rerender(<OrderList initialOrders={[second]} />);
  confirm(Response.json({ order: { ...first, state: "cancelled", cancelledAt } }));
  const button = await screen.findByRole("button", { name: "Cancel order" });
  // The response settles the existing busy state, but never appends the old row.
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  expect(screen.queryByText("Order first")).toBeNull();
  expect(screen.queryByText("cancelled", { exact: true })).toBeNull();
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(within(article("second")).getByText("pending", { exact: true })).toBeDefined();
});
