import type { APIRequestContext } from "@playwright/test";
import { route, origin, reason } from "../../integration/cafe-eligibility/fixtures";
export const mutate = (request: APIRequestContext, id: string, op: "decision" | "suspension", data: unknown = op === "decision" ? { decision: "approve", reason } : { suspended: true, reason }) =>
  request.post(route(id, op), { headers: { origin }, data });
