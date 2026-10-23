import { z } from "zod";
import { drinkTypes } from "@/lib/catalogue/query";
import { codePoints } from "./cafe-input";

export type DrinkType = typeof drinkTypes[number];
export type MenuItem = { itemId: string; name: string; drinkType: DrinkType; priceCents: number; soldOut: boolean };
export type MenuAction = "create" | "save" | "remove";
export const approvalConflictMessage = "Menu changes are available once your café is approved.";
export const MENU_PAGE_SIZE = 20;

const name = z.string().trim().refine(value => codePoints(value) >= 2 && codePoints(value) <= 100, "Item names must be 2 to 100 characters.");
const priceCents = z.number().int().min(1).max(1_000_000);
const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const schemas = {
  create: z.strictObject({ name, drinkType: z.enum(drinkTypes), priceCents, soldOut: z.boolean().optional(), expectedSuspensionVersion: version }),
  save: z.strictObject({ name, drinkType: z.enum(drinkTypes), priceCents, soldOut: z.boolean(), expectedSuspensionVersion: version }),
  remove: z.strictObject({ expectedSuspensionVersion: version }),
};
export type MenuInput = z.infer<typeof schemas[MenuAction]>;

/** Strict OWN-03 body validation; stored names are trimmed. */
export function validateMenuInput(action: MenuAction, body: unknown) {
  return schemas[action].safeParse(body);
}

/** Dollar text such as "4.5" or "4.50" to integer cents, without floating-point arithmetic. */
export function dollarsToCents(text: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents >= 1 && cents <= 1_000_000 ? cents : null;
}
export const centsToDollars = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
