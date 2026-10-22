import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { localSql } from "../accounts/local";
import { account, insert } from "../../integration/moderation/fixtures";
import { customerName, fixture as orderFixture, history, q, type Order } from "../orders/fixtures";
export { failure, login, origin, q, rows, stored, history, lifecycle, unsafe, customerName } from "../orders/fixtures";
export { mutate } from "../cafe-eligibility/helpers";

export const base = "/api/owner/orders";
export type OwnerOrder = Order & { customerName: string };
export type Action = "accept" | "reject" | "ready" | "collect";
export const conflictMessage = "Order changed. Refresh to see its current state.";
export const ownerOrderKeys = ["orderId", "cafeId", "cafeName", "placedAt", "pickupAt", "state", "items", "totalCents", "currency", "cancellationReason", "rejectionReason", "acceptedAt", "readyAt", "collectedAt", "rejectedAt", "cancelledAt", "customerName"].sort();

/** Owner café with retained purchases; defaults to an isolated demo-kit workspace. */
export function fixture(main = false) {
  const f = orderFixture(main);
  /** Retained purchase with explicit pickup/placement for ordering assertions. */
  function order(state: Order["state"] = "pending", pickupAt = f.pickupAt, placedAt = "2026-01-01T00:00:00Z") {
    const id = history(f, state, placedAt);
    localSql(`update public.orders set pickup_at=${q(pickupAt)} where id=${q(id)};`);
    return id;
  }
  return { ...f, order };
}
/** An owner account in the same workspace without any café. */
export const ownerWithoutCafe = (workspace: string) => account("owner", workspace);

export const list = (request: APIRequestContext, query = "") => request.get(base + query);
export function act(request: APIRequestContext, id: string, action: Action, data: unknown = action === "reject" ? { reason: "Out of oat milk" } : {}) {
  return request.post(`${base}/${encodeURIComponent(id)}/${action}`, { headers: { origin: "http://127.0.0.1:3100" }, data });
}
export async function page(response: APIResponse) {
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(["hasNextPage", "items", "page", "pageSize", "requestId"]);
  expect(body.pageSize).toBe(10);
  for (const item of body.items) expect(Object.keys(item).sort()).toEqual(ownerOrderKeys);
  return body as { requestId: string; items: OwnerOrder[]; page: number; pageSize: 10; hasNextPage: boolean };
}
export async function ownerOrder(response: APIResponse): Promise<OwnerOrder> {
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("private, no-store");
  const body = await response.json(); expect(Object.keys(body).sort()).toEqual(["order", "requestId"]);
  expect(Object.keys(body.order).sort()).toEqual(ownerOrderKeys);
  expect(body.order.customerName).toBe(customerName);
  return body.order;
}
export const reviewCount = (orderId: string) => Number(localSql(`select count(*) from public.reviews where order_id=${q(orderId)};`));
export function seedReview(orderId: string, customerId: string, text = "Synthetic retained review") {
  const id = randomUUID();
  insert("public.reviews", { id, order_id: orderId, customer_id: customerId, rating: 5, text, moderation_state: "kept" });
  return id;
}
