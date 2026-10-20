// @vitest-environment node
import { test } from "vitest";
import { matrixFixture } from "../roles-seeds/actors";

test.each(["suspended", "pending"] as const)("SYS-05.3: subsequent session-RLS cafe menu and hours reads hide %s cafe", state => {
  const f = matrixFixture(); const d = f.data.main;
  f.eligibility(d.cafe, "approved", false); f.proveSetup();
  for (const [entity, key] of [["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"]] as const) f.read(d.profiles.customer.actor, entity, d[key], true);
  f.eligibility(d.cafe, state === "pending" ? "pending" : "approved", state === "suspended"); f.proveSetup();
  for (const [entity, key] of [["cafes", "cafe"], ["menu_items", "menu"], ["opening_hours", "hours"]] as const) f.read(d.profiles.customer.actor, entity, d[key], false);
}, 120000);
