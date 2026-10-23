import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import { create as createOrder, fixture as orderFixture, history, orderResponse, ownOrder } from "../orders/fixtures";
import {
  approvalConflict, arrangeItem, cafeIn, cafeItems, cafeRow, codePointCompare, conflict, create, decide, drinkTypes, failure, itemBody, itemRow,
  list, login, menu, menuSnapshot, origin, pageBody, q, remove, removedBody, rows, save, session, suspend, suspensionConflict, version, workspace,
  type MenuItem, type Workspace,
} from "./fixtures";

/** Owner session for a fresh synthetic workspace whose owner has a café in the given state. */
async function owner(request: APIRequestContext, state: "pending" | "approved" | "rejected" = "approved", kit = true) {
  const f = workspace(kit); const cafe = cafeIn(f.owner, state); await login(request, f.owner); return { f, cafe };
}
async function customerMenu(playwright: PlaywrightWorkerArgs["playwright"], f: Pick<Workspace, "customer">, cafe: string) {
  const customer = await session(playwright, f.customer);
  try {
    const response = await customer.get(`/api/customer/cafes/${cafe}`);
    return { status: response.status(), menu: response.status() === 200 ? (await response.json()).cafe.menu as MenuItem[] : null };
  } finally { await customer.dispose(); }
}
const stripRequestId = (body: { requestId?: string }) => { const { requestId: _ignored, ...rest } = body; void _ignored; return rest; };
const createBody = (overrides: Record<string, unknown> = {}) => ({ name: "House Latte", drinkType: "coffee", priceCents: 450, expectedSuspensionVersion: 0, ...overrides });
const saveBody = (overrides: Record<string, unknown> = {}) => ({ name: "House Latte", drinkType: "coffee", priceCents: 450, soldOut: false, expectedSuspensionVersion: 0, ...overrides });

// OWN-03.1: own menu reads

for (const kit of [false, true]) test(`OWN-03.1: ${kit ? "kit" : "main"} own-menu read returns only the owner's café items, including sold-out items, in code-point name order`, async ({ request }) => {
  const { f, cafe } = await owner(request, "approved", kit); const outside = workspace(!kit);
  const foreign = cafeIn(f.other, "approved"); const alien = cafeIn(outside.owner, "approved");
  arrangeItem(foreign, { name: "Foreign Mocha" }); arrangeItem(alien, { name: "Alien Mocha" });
  const arranged = [
    { name: "apple Tea", drinkType: "tea", priceCents: 380, soldOut: false }, { name: "Zebra Juice", drinkType: "juice", priceCents: 1, soldOut: true },
    { name: "Éclair Chocolate", drinkType: "chocolate", priceCents: 1_000_000, soldOut: false }, { name: "Mocha", drinkType: "coffee", priceCents: 450, soldOut: true },
    { name: "Usucha", drinkType: "matcha", priceCents: 600, soldOut: false }, { name: "Mystery", drinkType: "other", priceCents: 99_999, soldOut: false },
  ] as const;
  const ids = new Map(arranged.map(a => [a.name as string, arrangeItem(cafe, a)]));
  const body = await pageBody(await list(request));
  expect(body).toMatchObject({ page: 1, pageSize: 20, hasNextPage: false });
  const expected = [...arranged].sort((a, b) => codePointCompare(a.name, b.name)).map(a => ({ itemId: ids.get(a.name), ...a }));
  expect(body.items).toEqual(expected);
  expect(body.items.map(i => i.name)).toEqual(["Mocha", "Mystery", "Usucha", "Zebra Juice", "apple Tea", "Éclair Chocolate"]);
});

test("OWN-03.1: menu pages hold 20 items with hasNextPage, and a valid out-of-range page is an empty page", async ({ request }) => {
  const { cafe } = await owner(request);
  const names = Array.from({ length: 21 }, (_, i) => `Page Item ${String(i + 1).padStart(2, "0")}`);
  for (const name of [...names].reverse()) arrangeItem(cafe, { name });
  const first = await pageBody(await list(request, "?page=1"));
  expect(first).toMatchObject({ page: 1, pageSize: 20, hasNextPage: true }); expect(first.items.map(i => i.name)).toEqual(names.slice(0, 20));
  expect((await pageBody(await list(request))).items.map(i => i.name)).toEqual(names.slice(0, 20));
  const second = await pageBody(await list(request, "?page=2"));
  expect(second).toMatchObject({ page: 2, hasNextPage: false }); expect(second.items.map(i => i.name)).toEqual(names.slice(20));
  const beyond = await pageBody(await list(request, "?page=3"));
  expect(beyond).toMatchObject({ page: 3, hasNextPage: false, items: [] });
});

test("OWN-03.1: malformed, duplicate or unknown menu query keys give 400 INVALID_REQUEST", async ({ request }) => {
  const { cafe } = await owner(request); arrangeItem(cafe, { name: "Query Latte" });
  for (const query of ["?page=0", "?page=01", "?page=-1", "?page=%2B1", "?page=1.0", "?page=%201", "?page=abc", "?page=", "?page=9007199254740992",
    "?page=1&page=1", "?pageSize=20", "?page=1&cafeId=x", "?drinkType=coffee"]) await failure(await list(request, query), 400, "INVALID_REQUEST");
});

test("OWN-03.1 OWN-03.8: an owner without a café reads an empty menu page, and an approved café with no items is an empty page rather than a failure", async ({ request, browser }) => {
  const f = workspace(); await login(request, f.owner);
  expect(await pageBody(await list(request))).toMatchObject({ items: [], page: 1, hasNextPage: false });
  const empty = workspace(); cafeIn(empty.owner, "approved");
  const context = await browser.newContext({ baseURL: origin });
  try { await login(context.request, empty.owner); expect(await pageBody(await list(context.request))).toMatchObject({ items: [], page: 1, hasNextPage: false }); }
  finally { await context.close(); }
});

test("OWN-03.1 OWN-03.9: owners of pending and rejected cafés still read their own menu items unchanged", async ({ browser }) => {
  for (const state of ["pending", "rejected"] as const) {
    const f = workspace(); const cafe = cafeIn(f.owner, state);
    const id = arrangeItem(cafe, { name: `${state} Cold Brew`, drinkType: "coffee", priceCents: 520, soldOut: true });
    const context = await browser.newContext({ baseURL: origin });
    try {
      await login(context.request, f.owner);
      expect(await menu(context.request)).toEqual([{ itemId: id, name: `${state} Cold Brew`, drinkType: "coffee", priceCents: 520, soldOut: true }]);
    } finally { await context.close(); }
  }
});

// OWN-03.2: add, edit, remove, duplicates and last committed outcome

for (const kit of [false, true]) test(`OWN-03.2: ${kit ? "kit" : "main"} create trims the name, defaults soldOut to false, and later owner and Customer reads return the item`, async ({ request, playwright }) => {
  const { f, cafe } = await owner(request, "approved", kit); const neighbour = cafeIn(f.other, "approved"); arrangeItem(neighbour, { name: "Neighbour Latte" });
  const neighbourBefore = menuSnapshot(neighbour);
  const item = await itemBody(await create(request, createBody({ name: "\t Iced Latte  ", priceCents: 650, expectedSuspensionVersion: await version(request) })), 201);
  expect(item).toEqual({ itemId: expect.any(String), name: "Iced Latte", drinkType: "coffee", priceCents: 650, soldOut: false });
  expect(itemRow(item.itemId)).toMatchObject({ cafe_id: cafe, name: "Iced Latte", drink_type: "coffee", price_cents: 650, sold_out: false });
  expect(await menu(request)).toEqual([item]);
  const sold = await itemBody(await create(request, createBody({ name: "Sold Tea", drinkType: "tea", soldOut: true, expectedSuspensionVersion: await version(request) })), 201);
  expect(sold).toMatchObject({ name: "Sold Tea", soldOut: true });
  const customer = await customerMenu(playwright, f, cafe);
  expect(customer.status).toBe(200); expect(customer.menu).toEqual([item, sold]);
  expect(menuSnapshot(neighbour)).toEqual(neighbourBefore);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: false });
});

test("OWN-03.2: saving an item changes every editable field, preserves its identity and leaves other items and cafés unchanged", async ({ request, playwright }) => {
  const { f, cafe } = await owner(request); const neighbour = cafeIn(f.other, "approved");
  const id = arrangeItem(cafe, { name: "Old Name", drinkType: "coffee", priceCents: 450 }); const sibling = arrangeItem(cafe, { name: "Sibling Tea", drinkType: "tea" });
  const foreign = arrangeItem(neighbour, { name: "Old Name" }); const siblingBefore = itemRow(sibling); const foreignBefore = menuSnapshot(neighbour);
  const saved = await itemBody(await save(request, id, saveBody({ name: "  New Name  ", drinkType: "matcha", priceCents: 725, soldOut: true, expectedSuspensionVersion: await version(request) })), 200);
  expect(saved).toEqual({ itemId: id, name: "New Name", drinkType: "matcha", priceCents: 725, soldOut: true });
  expect(itemRow(id)).toMatchObject({ id, cafe_id: cafe, name: "New Name", drink_type: "matcha", price_cents: 725, sold_out: true });
  expect((await menu(request)).find(i => i.itemId === id)).toEqual(saved);
  expect(itemRow(sibling)).toEqual(siblingBefore); expect(menuSnapshot(neighbour)).toEqual(foreignBefore); expect(itemRow(foreign)).toBeDefined();
  expect((await customerMenu(playwright, f, cafe)).menu).toContainEqual(saved);
  // Saving an item with its own unchanged name is not a duplicate of itself.
  expect(await itemBody(await save(request, id, saveBody({ name: "New Name", drinkType: "matcha", priceCents: 725, soldOut: false, expectedSuspensionVersion: await version(request) })), 200)).toMatchObject({ itemId: id, soldOut: false });
});

test("OWN-03.2: removal permanently deletes the row from owner and Customer reads; repeat removal or a later save gives 404 without upsert; re-creating the name makes a new identity", async ({ request, playwright }) => {
  const { f, cafe } = await owner(request);
  const id = arrangeItem(cafe, { name: "Removed Brew" }); const kept = arrangeItem(cafe, { name: "Kept Brew" }); const keptBefore = itemRow(kept);
  await removedBody(await remove(request, id, { expectedSuspensionVersion: await version(request) }));
  expect(itemRow(id)).toBeUndefined(); expect(itemRow(kept)).toEqual(keptBefore);
  expect((await menu(request)).map(i => i.itemId)).toEqual([kept]);
  expect((await customerMenu(playwright, f, cafe)).menu!.map(i => i.itemId)).toEqual([kept]);
  await failure(await remove(request, id, { expectedSuspensionVersion: await version(request) }), 404, "NOT_FOUND");
  await failure(await save(request, id, saveBody({ name: "Resurrected Brew", expectedSuspensionVersion: await version(request) })), 404, "NOT_FOUND");
  expect(itemRow(id)).toBeUndefined(); expect(cafeItems(cafe)).toHaveLength(1);
  const again = await itemBody(await create(request, createBody({ name: "Removed Brew", expectedSuspensionVersion: await version(request) })), 201);
  expect(again.itemId).not.toBe(id); expect(again.name).toBe("Removed Brew");
});

test("OWN-03.2: duplicate names within one café give 409 with no write, comparing after removing all whitespace and Unicode lowercasing", async ({ request }) => {
  const { cafe } = await owner(request);
  arrangeItem(cafe, { name: "Flat White" }); arrangeItem(cafe, { name: "Éclair Latte" }); const other = arrangeItem(cafe, { name: "Long Black" });
  const before = menuSnapshot(cafe); const v = await version(request);
  for (const name of ["Flat White", "flat white", "FLATWHITE", " Flat White ", "Flat\tWhite", "F l a t W h i t e", "Flat　White", "ÉCLAIR LATTE", "éclairlatte"]) {
    const created = await create(request, createBody({ name, drinkType: "tea", priceCents: 999, expectedSuspensionVersion: v }));
    await failure(created, 409, "STATE_CONFLICT");
    await failure(await save(request, other, saveBody({ name, expectedSuspensionVersion: v })), 409, "STATE_CONFLICT");
    expect(menuSnapshot(cafe)).toEqual(before);
  }
  // Uniqueness is per café: another café may use the same name, and description/type/price do not participate.
  const elsewhere = workspace(); const foreignCafe = cafeIn(elsewhere.owner, "approved");
  arrangeItem(foreignCafe, { name: "Unique Elsewhere" });
  expect(await itemBody(await create(request, createBody({ name: "Unique Elsewhere", expectedSuspensionVersion: v })), 201)).toMatchObject({ name: "Unique Elsewhere" });
});

test("OWN-03.2: stored names are 2 to 100 Unicode code points after trimming; shorter, longer or blank names give 400 without a write", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Name Bound Item" }); const v = await version(request);
  for (const name of ["Ab", "😀😀", "a".repeat(100), "😀".repeat(99) + "x"]) {
    const item = await itemBody(await create(request, createBody({ name, expectedSuspensionVersion: v })), 201);
    expect(item.name).toBe(name); expect(Array.from(item.name)).toHaveLength(Array.from(name).length);
  }
  const before = menuSnapshot(cafe);
  for (const name of ["", " ", " \t\n", "A", "  A  ", "😀", "a".repeat(101), "😀".repeat(101)]) {
    await failure(await create(request, createBody({ name, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    await failure(await save(request, id, saveBody({ name, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    expect(menuSnapshot(cafe)).toEqual(before);
  }
});

test("OWN-03.2 OWN-03.8: strict create, save and remove bodies reject missing, unknown or wrongly typed fields with 400 and no write", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Strict Item" }); const v = await version(request);
  const before = menuSnapshot(cafe);
  const creates: unknown[] = [{}, [], "text", null, createBody({ expectedSuspensionVersion: undefined }), { name: "Strict New", drinkType: "coffee", expectedSuspensionVersion: v },
    createBody({ cafeId: cafe, expectedSuspensionVersion: v }), createBody({ itemId: id, expectedSuspensionVersion: v }), createBody({ workspaceId: randomUUID(), expectedSuspensionVersion: v }),
    createBody({ ownerId: randomUUID(), expectedSuspensionVersion: v }), createBody({ description: "Not a menu field", expectedSuspensionVersion: v }),
    createBody({ soldOut: "false", expectedSuspensionVersion: v }), createBody({ name: 12345, expectedSuspensionVersion: v }),
    createBody({ expectedSuspensionVersion: -1 }), createBody({ expectedSuspensionVersion: 0.5 }), createBody({ expectedSuspensionVersion: "0" }), createBody({ expectedSuspensionVersion: null })];
  for (const body of creates) { await failure(await create(request, body), 400, "INVALID_REQUEST"); expect(menuSnapshot(cafe)).toEqual(before); }
  const saves: unknown[] = [{}, createBody({ expectedSuspensionVersion: v }), saveBody({ soldOut: undefined, expectedSuspensionVersion: v }), saveBody({ name: undefined, expectedSuspensionVersion: v }),
    saveBody({ drinkType: undefined, expectedSuspensionVersion: v }), saveBody({ priceCents: undefined, expectedSuspensionVersion: v }), saveBody({ expectedSuspensionVersion: undefined }),
    saveBody({ cafeId: randomUUID(), expectedSuspensionVersion: v }), saveBody({ itemId: id, expectedSuspensionVersion: v }), saveBody({ soldOut: 1, expectedSuspensionVersion: v }),
    saveBody({ soldOut: null, expectedSuspensionVersion: v })];
  for (const body of saves) { await failure(await save(request, id, body), 400, "INVALID_REQUEST"); expect(menuSnapshot(cafe)).toEqual(before); }
  for (const body of [{}, { expectedSuspensionVersion: v, itemId: id }, { expectedSuspensionVersion: v, cafeId: cafe }, { expectedSuspensionVersion: String(v) }, { expectedSuspensionVersion: -1 }, []]) {
    await failure(await remove(request, id, body), 400, "INVALID_REQUEST"); expect(menuSnapshot(cafe)).toEqual(before);
  }
});

test("OWN-03.2: concurrent ordinary saves of one item are last-committed-wins and never mix fields", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Race Item" }); const v = await version(request);
  const a = saveBody({ name: "Race Item A", drinkType: "tea", priceCents: 111, soldOut: true, expectedSuspensionVersion: v });
  const b = saveBody({ name: "Race Item B", drinkType: "juice", priceCents: 222, soldOut: false, expectedSuspensionVersion: v });
  await itemBody(await save(request, id, a), 200); await itemBody(await save(request, id, b), 200);
  expect(itemRow(id)).toMatchObject({ name: "Race Item B", drink_type: "juice", price_cents: 222, sold_out: false });
  const responses = await Promise.all([save(request, id, a), save(request, id, b)]); expect(responses.map(r => r.status())).toEqual([200, 200]);
  const final = (await menu(request)).find(i => i.itemId === id)!;
  const winner = final.name === "Race Item A" ? a : b;
  expect(final).toEqual({ itemId: id, name: winner.name, drinkType: winner.drinkType, priceCents: winner.priceCents, soldOut: winner.soldOut });
});

test("OWN-03.2: concurrent creates of one name admit exactly one winner and a 409 loser", async ({ request }) => {
  const { cafe } = await owner(request); const v = await version(request);
  const responses = await Promise.all([create(request, createBody({ name: "Race Brew", expectedSuspensionVersion: v })), create(request, createBody({ name: "race  brew", drinkType: "tea", expectedSuspensionVersion: v }))]);
  expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
  expect(cafeItems(cafe)).toHaveLength(1);
});

test("OWN-03.2: an update racing a removal cannot recreate the removed item", async ({ request }) => {
  const { cafe } = await owner(request); const v = await version(request);
  for (let round = 0; round < 3; round++) {
    const id = arrangeItem(cafe, { name: `Racing Removal ${round}` });
    const [saved, removed] = await Promise.all([save(request, id, saveBody({ name: `Racing Save ${round}`, expectedSuspensionVersion: v })), remove(request, id, { expectedSuspensionVersion: v })]);
    expect(removed.status()).toBe(200); expect([200, 404]).toContain(saved.status());
    expect(itemRow(id)).toBeUndefined();
  }
  expect(cafeItems(cafe)).toEqual([]); expect(await menu(request)).toEqual([]);
});

// OWN-03.3 and OWN-03.4: money and drink type

test("OWN-03.3: prices are integer SGD cents from 1 to 1,000,000 inclusive in storage and JSON; other values give 400 and are not persisted", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Priced Item", priceCents: 450 }); const v = await version(request);
  for (const cents of [1, 1_000_000]) {
    const saved = await itemBody(await save(request, id, saveBody({ name: "Priced Item", priceCents: cents, expectedSuspensionVersion: v })), 200);
    expect(saved.priceCents).toBe(cents); expect(itemRow(id).price_cents).toBe(cents);
    const raw = await (await list(request)).text(); expect(raw).toContain(`"priceCents":${cents}`);
  }
  const created = await itemBody(await create(request, createBody({ name: "Cheapest", priceCents: 1, expectedSuspensionVersion: v })), 201); expect(created.priceCents).toBe(1);
  const before = menuSnapshot(cafe);
  for (const cents of [0, -1, 1_000_001, 4.5, 450.25, "450", null, true, 1e21]) {
    await failure(await save(request, id, saveBody({ name: "Priced Item", priceCents: cents, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    await failure(await create(request, createBody({ name: `Bad Price ${String(cents)}`, priceCents: cents, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    expect(menuSnapshot(cafe)).toEqual(before);
  }
});

test("OWN-03.4: every shared DrinkType value saves and reads back; unknown, differently cased or blank types give 400 and are not persisted", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Typed Item", drinkType: "coffee" }); const v = await version(request);
  for (const drinkType of drinkTypes) {
    expect(await itemBody(await save(request, id, saveBody({ name: "Typed Item", drinkType, expectedSuspensionVersion: v })), 200)).toMatchObject({ itemId: id, drinkType });
    expect(itemRow(id).drink_type).toBe(drinkType); expect((await menu(request))[0].drinkType).toBe(drinkType);
  }
  const before = menuSnapshot(cafe);
  for (const drinkType of ["Coffee", "COFFEE", " coffee", "smoothie", "", null, 1]) {
    await failure(await save(request, id, saveBody({ name: "Typed Item", drinkType, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    await failure(await create(request, createBody({ name: "Typed New", drinkType, expectedSuspensionVersion: v })), 400, "INVALID_REQUEST");
    expect(menuSnapshot(cafe)).toEqual(before);
  }
});

// OWN-03.5 and OWN-03.6: availability, Customer ordering and retained snapshots

test("OWN-03.5: toggling sold out keeps the item visible to Customers, refuses new orders containing it, and toggling off restores ordering", async ({ request, playwright }) => {
  const f = orderFixture(); await login(request, f.owner); const v = await version(request);
  const original = (await menu(request)).find(i => i.itemId === f.item)!;
  const soldOut = await itemBody(await save(request, f.item, saveBody({ name: original.name, drinkType: original.drinkType, priceCents: original.priceCents, soldOut: true, expectedSuspensionVersion: v })), 200);
  expect(soldOut.soldOut).toBe(true);
  const customer = await session(playwright, f.customer);
  try {
    const detail = (await (await customer.get(`/api/customer/cafes/${f.cafe}`)).json()).cafe;
    expect(detail.menu).toContainEqual({ ...original, soldOut: true });
    await failure(await createOrder(customer, f.payload()), 409, "STATE_CONFLICT");
    expect(Number(rows(`select count(*) as n from public.orders where customer_id=${q(f.customer.id)}`)[0].n)).toBe(0);
    await itemBody(await save(request, f.item, saveBody({ name: original.name, drinkType: original.drinkType, priceCents: original.priceCents, soldOut: false, expectedSuspensionVersion: v })), 200);
    expect((await (await customer.get(`/api/customer/cafes/${f.cafe}`)).json()).cafe.menu).toContainEqual(original);
    await orderResponse(await createOrder(customer, f.payload()), 201);
  } finally { await customer.dispose(); }
});

test("OWN-03.5 OWN-03.7: toggling sold out off on a suspended café does not make it orderable or visible; an all-sold-out menu stays visible without an orderable item", async ({ request, playwright }) => {
  const f = orderFixture(); await login(request, f.owner);
  for (const id of [f.item, f.second]) {
    const current = (await menu(request)).find(i => i.itemId === id)!;
    await itemBody(await save(request, id, saveBody({ name: current.name, drinkType: current.drinkType, priceCents: current.priceCents, soldOut: true, expectedSuspensionVersion: await version(request) })), 200);
  }
  const customer = await session(playwright, f.customer);
  try {
    const detail = await customer.get(`/api/customer/cafes/${f.cafe}`); expect(detail.status()).toBe(200);
    const visible = (await detail.json()).cafe.menu as MenuItem[]; expect(visible.map(i => i.itemId).sort()).toEqual([f.item, f.second].sort()); expect(visible.every(i => i.soldOut)).toBe(true);
    await failure(await createOrder(customer, f.payload({ items: [{ itemId: f.second, quantity: 1 }], expectedTotalCents: 125 })), 409, "STATE_CONFLICT");
    suspend({ admin: f.admin } as unknown as Workspace, f.cafe, true, "Synthetic suspension for menu test");
    const current = (await menu(request)).find(i => i.itemId === f.second)!;
    await itemBody(await save(request, f.second, saveBody({ name: current.name, drinkType: current.drinkType, priceCents: current.priceCents, soldOut: false, expectedSuspensionVersion: await version(request) })), 200);
    await failure(await customer.get(`/api/customer/cafes/${f.cafe}`), 404, "NOT_FOUND");
    await failure(await createOrder(customer, f.payload({ items: [{ itemId: f.second, quantity: 1 }], expectedTotalCents: 125 })), 404, "NOT_FOUND");
    expect(cafeRow(f.cafe)).toMatchObject({ application_state: "approved", suspended: true });
  } finally { await customer.dispose(); }
});

test("OWN-03.6: renaming, repricing, selling out or removing an ordered item leaves existing order snapshots unchanged; new orders use current prices", async ({ request, playwright }) => {
  const f = orderFixture(); const past = history(f, "collected");
  const pastLines = rows(`select item_ref,name,quantity,unit_price_cents,line_total_cents from public.order_items where order_id=${q(past)}`);
  const pastOrder = rows(`select total_cents,cafe_name,state from public.orders where id=${q(past)}`);
  const customer = await session(playwright, f.customer);
  try {
    const order = await orderResponse(await createOrder(customer, f.payload()), 201);
    await login(request, f.owner); const v = await version(request);
    await itemBody(await save(request, f.item, saveBody({ name: "Renamed Snapshot Item", drinkType: "tea", priceCents: 999, soldOut: true, expectedSuspensionVersion: v })), 200);
    expect(await ownOrder(customer, order.orderId)).toEqual(order);
    await itemBody(await save(request, f.item, saveBody({ name: "Renamed Snapshot Item", drinkType: "tea", priceCents: 999, soldOut: false, expectedSuspensionVersion: v })), 200);
    // The displayed total from the old price is refused; the current server price applies.
    await failure(await createOrder(customer, f.payload()), 409, "STATE_CONFLICT");
    const next = await orderResponse(await createOrder(customer, f.payload({ expectedTotalCents: 999 * 2 + 125 })), 201);
    expect(next.items.find(i => i.itemId === f.item)).toEqual({ itemId: f.item, name: "Renamed Snapshot Item", quantity: 2, unitPriceCents: 999, lineTotalCents: 1998 });
    await removedBody(await remove(request, f.second, { expectedSuspensionVersion: v }));
    await removedBody(await remove(request, f.item, { expectedSuspensionVersion: v }));
    expect(await ownOrder(customer, order.orderId)).toEqual(order); expect(await ownOrder(customer, next.orderId)).toEqual(next);
    expect(order.items.map(i => i.itemId).sort()).toEqual([f.item, f.second].sort());
    expect(rows(`select item_ref,name,quantity,unit_price_cents,line_total_cents from public.order_items where order_id=${q(past)}`)).toEqual(pastLines);
    expect(rows(`select total_cents,cafe_name,state from public.orders where id=${q(past)}`)).toEqual(pastOrder);
  } finally { await customer.dispose(); }
});

// OWN-03.7: suspension

test("OWN-03.7: an approved suspended café's owner can create, save and remove items with the current version; the café stays suspended and hidden", async ({ request, playwright }) => {
  const { f, cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Suspended Brew" }); const gone = arrangeItem(cafe, { name: "Suspended Gone" });
  suspend(f, cafe, true, "Synthetic suspension reason");
  const v = await version(request); expect(v).toBe(1);
  const created = await itemBody(await create(request, createBody({ name: "Added While Suspended", expectedSuspensionVersion: v })), 201);
  expect(await itemBody(await save(request, id, saveBody({ name: "Edited While Suspended", soldOut: true, expectedSuspensionVersion: v })), 200)).toMatchObject({ itemId: id, name: "Edited While Suspended", soldOut: true });
  await removedBody(await remove(request, gone, { expectedSuspensionVersion: v }));
  expect((await menu(request)).map(i => i.itemId).sort()).toEqual([created.itemId, id].sort());
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: true, suspension_version: 1 });
  expect((await customerMenu(playwright, f, cafe)).status).toBe(404);
});

test("OWN-03.7: a menu mutation overtaken by suspension or un-suspension gives 409 with the suspension message and writes nothing; a later edit with the new version succeeds", async ({ request }) => {
  const { f, cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Overtaken Item" });
  const stale = await version(request); suspend(f, cafe, true, "Overtaking suspension");
  let before = menuSnapshot(cafe);
  await conflict(await create(request, createBody({ name: "Stale Create", expectedSuspensionVersion: stale })), suspensionConflict);
  await conflict(await save(request, id, saveBody({ name: "Stale Save", expectedSuspensionVersion: stale })), suspensionConflict);
  await conflict(await remove(request, id, { expectedSuspensionVersion: stale }), suspensionConflict);
  expect(menuSnapshot(cafe)).toEqual(before);
  const suspendedVersion = await version(request);
  await itemBody(await save(request, id, saveBody({ name: "Edited After Suspension", expectedSuspensionVersion: suspendedVersion })), 200);
  suspend(f, cafe, false, "Overtaking un-suspension"); before = menuSnapshot(cafe);
  await conflict(await save(request, id, saveBody({ name: "Stale After Unsuspend", expectedSuspensionVersion: suspendedVersion })), suspensionConflict);
  expect(menuSnapshot(cafe)).toEqual(before);
  await itemBody(await save(request, id, saveBody({ name: "Edited After Unsuspension", expectedSuspensionVersion: await version(request) })), 200);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: false, suspension_version: 2 });
});

// OWN-03.8: session, role, record scope and check order

test("OWN-03.8: live owner menu routes give 401 without a session and 403 to Customer and Admin sessions, without disclosure or writes", async ({ browser }) => {
  const f = workspace(); const cafe = cafeIn(f.owner, "approved"); const id = arrangeItem(cafe, { name: "PRIVATE-MENU-MARKER" }); const before = menuSnapshot(cafe);
  for (const who of [null, f.customer, f.admin] as const) {
    const context = await browser.newContext({ baseURL: origin });
    try {
      if (who) await login(context.request, who);
      const [status, code] = who ? [403, "FORBIDDEN"] : [401, "UNAUTHENTICATED"];
      const read = await list(context.request); expect(await read.text()).not.toContain("PRIVATE-MENU-MARKER"); await failure(await list(context.request), status, code);
      await failure(await create(context.request, createBody()), status, code);
      await failure(await save(context.request, id, saveBody()), status, code);
      await failure(await remove(context.request, id, { expectedSuspensionVersion: 0 }), status, code);
    } finally { await context.close(); }
  }
  expect(menuSnapshot(cafe)).toEqual(before);
});

test("OWN-03.8: an owner mutation without a trusted Origin gives 403 and writes nothing", async ({ request }) => {
  const { cafe } = await owner(request); const id = arrangeItem(cafe, { name: "Origin Item" }); const before = menuSnapshot(cafe); const v = await version(request);
  for (const headers of [{}, { origin: "https://evil.invalid" }] as Record<string, string>[]) {
    await failure(await request.post("/api/owner/menu", { headers, data: createBody({ expectedSuspensionVersion: v }) }), 403, "FORBIDDEN");
    await failure(await request.post(`/api/owner/menu/${id}`, { headers, data: saveBody({ expectedSuspensionVersion: v }) }), 403, "FORBIDDEN");
    await failure(await request.post(`/api/owner/menu/${id}/remove`, { headers, data: { expectedSuspensionVersion: v } }), 403, "FORBIDDEN");
  }
  expect(menuSnapshot(cafe)).toEqual(before);
});

test("OWN-03.8: an owner without a café gets 404 for every schema-valid mutation, after 400 for invalid input", async ({ request }) => {
  const f = workspace(); await login(request, f.owner); const stranger = cafeIn(f.other, "approved"); const foreign = arrangeItem(stranger, { name: "Stranger Item" });
  const before = menuSnapshot(stranger);
  await failure(await create(request, createBody()), 404, "NOT_FOUND");
  for (const id of [randomUUID(), foreign]) {
    await failure(await save(request, id, saveBody()), 404, "NOT_FOUND");
    await failure(await remove(request, id, { expectedSuspensionVersion: 0 }), 404, "NOT_FOUND");
    await failure(await save(request, id, saveBody({ priceCents: 0 })), 400, "INVALID_REQUEST");
  }
  await failure(await create(request, createBody({ drinkType: "smoothie" })), 400, "INVALID_REQUEST");
  expect(menuSnapshot(stranger)).toEqual(before); expect(rows(`select id from public.cafes where owner_id=${q(f.owner.id)}`)).toEqual([]);
});

test("OWN-03.8: missing, same-workspace foreign and other-workspace items give indistinguishable 404 with no change", async ({ request }) => {
  const { f, cafe } = await owner(request); const outside = workspace(false);
  const own = arrangeItem(cafe, { name: "Own Scope Item" });
  const foreignCafe = cafeIn(f.other, "approved"); const foreign = arrangeItem(foreignCafe, { name: "PRIVATE-FOREIGN-ITEM" });
  const alienCafe = cafeIn(outside.owner, "approved"); const alien = arrangeItem(alienCafe, { name: "PRIVATE-ALIEN-ITEM" });
  const before = [menuSnapshot(cafe), menuSnapshot(foreignCafe), menuSnapshot(alienCafe)]; const v = await version(request);
  const bodies: unknown[] = [];
  for (const id of [randomUUID(), "not-a-server-reference", foreign, alien]) {
    for (const response of [await save(request, id, saveBody({ name: "Hijack", expectedSuspensionVersion: v })), await remove(request, id, { expectedSuspensionVersion: v })]) {
      const raw = await response.text(); expect(raw).not.toMatch(/PRIVATE-|Hijack/);
      await failure(response, 404, "NOT_FOUND"); bodies.push(stripRequestId(JSON.parse(raw)));
    }
  }
  expect(new Set(bodies.map(b => JSON.stringify(b))).size).toBe(1);
  expect([menuSnapshot(cafe), menuSnapshot(foreignCafe), menuSnapshot(alienCafe)]).toEqual(before);
  expect((await menu(request)).map(i => i.itemId)).toEqual([own]);
});

test("OWN-03.8: approved-café mutation checks apply validation, then item scope, then the suspension guard, then duplicate names", async ({ request }) => {
  const { f, cafe } = await owner(request); const foreignCafe = cafeIn(f.other, "approved"); const foreign = arrangeItem(foreignCafe, { name: "Order Foreign" });
  const own = arrangeItem(cafe, { name: "Order Own" }); arrangeItem(cafe, { name: "Order Taken" });
  const stale = await version(request); suspend(f, cafe, true, "Ordering suspension");
  const before = [menuSnapshot(cafe), menuSnapshot(foreignCafe)];
  // Invalid input decides before the foreign item or stale version.
  await failure(await save(request, foreign, saveBody({ priceCents: 0, expectedSuspensionVersion: stale })), 400, "INVALID_REQUEST");
  // A foreign or missing item decides before the stale version.
  await failure(await save(request, foreign, saveBody({ expectedSuspensionVersion: stale })), 404, "NOT_FOUND");
  await failure(await remove(request, randomUUID(), { expectedSuspensionVersion: stale }), 404, "NOT_FOUND");
  // The suspension guard decides before a duplicate name.
  await conflict(await save(request, own, saveBody({ name: "order taken", expectedSuspensionVersion: stale })), suspensionConflict);
  await conflict(await create(request, createBody({ name: "ORDER TAKEN", expectedSuspensionVersion: stale })), suspensionConflict);
  expect([menuSnapshot(cafe), menuSnapshot(foreignCafe)]).toEqual(before);
  // With the current version, the duplicate name is the deciding conflict and is not the approval message.
  const duplicate = await save(request, own, saveBody({ name: "order taken", expectedSuspensionVersion: await version(request) }));
  await failure(duplicate, 409, "STATE_CONFLICT");
  expect((await duplicate.json()).error.message).not.toBe(approvalConflict);
  expect([menuSnapshot(cafe), menuSnapshot(foreignCafe)]).toEqual(before);
});

// OWN-03.9: approved-only menu mutations

test("OWN-03.9: a pending café's create, save and remove give 409 with the approval message for own, foreign and missing items, writing nothing", async ({ request }) => {
  const { f, cafe } = await owner(request, "pending"); const outside = workspace(false);
  const own = arrangeItem(cafe, { name: "Pending Own" }); const foreignCafe = cafeIn(f.other, "approved"); const foreign = arrangeItem(foreignCafe, { name: "Pending Foreign" });
  const alienCafe = cafeIn(outside.owner, "approved"); const alien = arrangeItem(alienCafe, { name: "Pending Alien" });
  const before = [menuSnapshot(cafe), menuSnapshot(foreignCafe), menuSnapshot(alienCafe)]; const v = await version(request);
  await conflict(await create(request, createBody({ name: "Pending New", expectedSuspensionVersion: v })), approvalConflict);
  await conflict(await create(request, createBody({ name: "Pending New Sold", soldOut: true, expectedSuspensionVersion: v })), approvalConflict);
  for (const id of [own, foreign, alien, randomUUID()]) {
    await conflict(await save(request, id, saveBody({ name: "Pending Save", expectedSuspensionVersion: v })), approvalConflict);
    await conflict(await remove(request, id, { expectedSuspensionVersion: v }), approvalConflict);
  }
  expect([menuSnapshot(cafe), menuSnapshot(foreignCafe), menuSnapshot(alienCafe)]).toEqual(before);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "pending", suspended: false });
});

test("OWN-03.9: a rejected café's create, save and remove give 409 with the approval message for own, foreign and missing items, writing nothing", async ({ request }) => {
  const { f, cafe } = await owner(request, "rejected");
  const own = arrangeItem(cafe, { name: "Rejected Own" }); const foreignCafe = cafeIn(f.other, "approved"); const foreign = arrangeItem(foreignCafe, { name: "Rejected Foreign" });
  const before = [menuSnapshot(cafe), menuSnapshot(foreignCafe)]; const v = await version(request);
  await conflict(await create(request, createBody({ name: "Rejected New", expectedSuspensionVersion: v })), approvalConflict);
  for (const id of [own, foreign, randomUUID()]) {
    await conflict(await save(request, id, saveBody({ name: "Rejected Save", soldOut: true, expectedSuspensionVersion: v })), approvalConflict);
    await conflict(await remove(request, id, { expectedSuspensionVersion: v }), approvalConflict);
  }
  expect([menuSnapshot(cafe), menuSnapshot(foreignCafe)]).toEqual(before);
  expect(cafeRow(cafe)).toMatchObject({ application_state: "rejected" });
});

test("OWN-03.9: for an unapproved café, validation still decides first, then the approval conflict precedes stale-version and duplicate-name conflicts", async ({ request }) => {
  const { cafe } = await owner(request, "pending"); const own = arrangeItem(cafe, { name: "Pending Taken" }); const other = arrangeItem(cafe, { name: "Pending Other" });
  const before = menuSnapshot(cafe);
  await failure(await create(request, createBody({ priceCents: 0 })), 400, "INVALID_REQUEST");
  await failure(await save(request, own, saveBody({ drinkType: "smoothie" })), 400, "INVALID_REQUEST");
  await failure(await remove(request, own, {}), 400, "INVALID_REQUEST");
  await conflict(await create(request, createBody({ name: "pending taken", expectedSuspensionVersion: 0 })), approvalConflict);
  await conflict(await create(request, createBody({ name: "Stale Pending", expectedSuspensionVersion: 7 })), approvalConflict);
  await conflict(await save(request, other, saveBody({ name: "PENDING TAKEN", expectedSuspensionVersion: 7 })), approvalConflict);
  await conflict(await remove(request, own, { expectedSuspensionVersion: 7 }), approvalConflict);
  expect(menuSnapshot(cafe)).toEqual(before);
});

test("OWN-03.9: once the café is approved, suspended or not, the same mutations proceed under OWN-03.2 and OWN-03.7", async ({ request }) => {
  const { f, cafe } = await owner(request, "pending"); const id = arrangeItem(cafe, { name: "Approval Item" });
  await conflict(await create(request, createBody({ name: "After Approval", expectedSuspensionVersion: 0 })), approvalConflict);
  decide(f, cafe, "approve", "Synthetic approval reason");
  const created = await itemBody(await create(request, createBody({ name: "After Approval", expectedSuspensionVersion: await version(request) })), 201);
  expect(created.name).toBe("After Approval");
  suspend(f, cafe, true, "Synthetic suspension after approval");
  expect(await itemBody(await save(request, id, saveBody({ name: "Saved While Suspended", expectedSuspensionVersion: await version(request) })), 200)).toMatchObject({ itemId: id, name: "Saved While Suspended" });
  await removedBody(await remove(request, created.itemId, { expectedSuspensionVersion: await version(request) }));
  expect(cafeRow(cafe)).toMatchObject({ application_state: "approved", suspended: true });
});
