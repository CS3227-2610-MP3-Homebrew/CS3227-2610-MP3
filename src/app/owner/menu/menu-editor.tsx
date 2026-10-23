"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { drinkTypes } from "@/lib/catalogue/query";
import { suspensionConflictMessage } from "@/lib/owner/cafe-input";
import { centsToDollars, dollarsToCents, type DrinkType, type MenuItem } from "@/lib/owner/menu-input";
import { money } from "@/app/customer/orders/presentation";
import { inputClass, useHydrated } from "../_components/cafe-fields";

type Draft = { name: string; drinkType: string; price: string; soldOut: boolean };
const draftKey = (itemId: string) => `owner-menu-draft:${itemId}`;
const priceProblem = "Enter a price from S$0.01 to S$10000.00, with at most two decimal places.";

/** POSTs one menu mutation; a suspension conflict keeps the draft and opens the application page. */
function useMenuAction(version: number) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(path: string, body: Record<string, unknown>, draft?: { key: string; value: Draft }) {
    setBusy(true); setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedSuspensionVersion: version }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result?.error?.message === "string" ? result.error.message : "Unable to save menu changes. Try again.";
        if (response.status === 409 && message === suspensionConflictMessage) {
          if (draft) window.sessionStorage.setItem(draft.key, JSON.stringify(draft.value));
          router.push("/owner/application");
          return false;
        }
        setError(message);
        return false;
      }
      router.refresh();
      return true;
    } catch { setError("Unable to confirm the change. Check the menu and try again."); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, setError, send };
}

function ItemRow({ item, version }: { item: MenuItem; version: number }) {
  const hydrated = useHydrated();
  const { busy, error, setError, send } = useMenuAction(version);
  const [draft, setDraft] = useState<Draft>({ name: item.name, drinkType: item.drinkType, price: centsToDollars(item.priceCents), soldOut: item.soldOut });
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const id = `menu-item-${item.itemId}`;

  // Restore input preserved when an Admin suspension change overtook a save.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(draftKey(item.itemId));
    if (!stored) return;
    window.sessionStorage.removeItem(draftKey(item.itemId));
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser-storage restore after hydration
      setDraft(JSON.parse(stored) as Draft);
      setNotice("Your unsaved changes were restored. Review them and save again.");
    } catch { /* An unreadable draft is discarded. */ }
  }, [item.itemId]);

  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const priceCents = dollarsToCents(draft.price);
    if (priceCents === null) { setError(priceProblem); return; }
    setNotice("");
    const saved = await send(`/api/owner/menu/${encodeURIComponent(item.itemId)}`, { name: draft.name, drinkType: draft.drinkType, priceCents, soldOut: draft.soldOut }, { key: draftKey(item.itemId), value: draft });
    if (saved) setNotice("Item saved.");
  }

  return <li className="space-y-3 rounded-lg border border-black/15 p-4">
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <strong className="text-lg">{item.name}</strong>
      <span className="capitalize">{item.drinkType}</span>
      <span>{money(item.priceCents)}</span>
      {item.soldOut && <span className="rounded bg-black/10 px-2 py-0.5 text-sm">Sold out</span>}
    </p>
    <form noValidate onSubmit={save} aria-label={`Edit ${item.name}`} className="space-y-3">
      {error && <p role="alert" className="rounded-lg border border-red-700 p-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <fieldset disabled={busy || !hydrated} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="grid gap-1" htmlFor={`${id}-name`}>Name
          <input id={`${id}-name`} className={inputClass} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} maxLength={200} />
        </label>
        <label className="grid gap-1" htmlFor={`${id}-type`}>Drink type
          <select id={`${id}-type`} className={inputClass} value={draft.drinkType} onChange={e => setDraft({ ...draft, drinkType: e.target.value as DrinkType })}>
            {drinkTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-1" htmlFor={`${id}-price`}>Price (S$)
          <input id={`${id}-price`} className={inputClass} inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.soldOut} onChange={e => setDraft({ ...draft, soldOut: e.target.checked })} /> Sold out
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !hydrated} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        {confirming
          ? <>
            <button type="button" disabled={busy} className="rounded border border-red-700 px-4 py-2 text-red-800" onClick={async () => { if (!busy) await send(`/api/owner/menu/${encodeURIComponent(item.itemId)}/remove`, {}); setConfirming(false); }}>Confirm removal</button>
            <button type="button" disabled={busy} className="rounded border px-4 py-2" onClick={() => setConfirming(false)}>Keep item</button>
          </>
          : <button type="button" disabled={busy || !hydrated} className="rounded border px-4 py-2" onClick={() => setConfirming(true)}>Remove</button>}
      </div>
    </form>
  </li>;
}

function AddItemForm({ version }: { version: number }) {
  const hydrated = useHydrated();
  const { busy, error, setError, send } = useMenuAction(version);
  const [name, setName] = useState("");
  const [drinkType, setDrinkType] = useState<DrinkType>("coffee");
  const [price, setPrice] = useState("");
  const [notice, setNotice] = useState("");

  async function add(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const priceCents = dollarsToCents(price);
    if (priceCents === null) { setError(priceProblem); return; }
    setNotice("");
    if (await send("/api/owner/menu", { name, drinkType, priceCents })) { setName(""); setPrice(""); setNotice("Item added."); }
  }

  return <form noValidate onSubmit={add} aria-labelledby="add-item-heading" className="space-y-3 rounded-lg border border-black/15 p-4">
    <h2 id="add-item-heading" className="text-xl font-semibold">Add an item</h2>
    {error && <p role="alert" className="rounded-lg border border-red-700 p-3 text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <fieldset disabled={busy || !hydrated} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <label className="grid gap-1" htmlFor="new-item-name">Name
        <input id="new-item-name" className={inputClass} value={name} onChange={e => setName(e.target.value)} maxLength={200} />
      </label>
      <label className="grid gap-1" htmlFor="new-item-type">Drink type
        <select id="new-item-type" className={inputClass} value={drinkType} onChange={e => setDrinkType(e.target.value as DrinkType)}>
          {drinkTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className="grid gap-1" htmlFor="new-item-price">Price (S$)
        <input id="new-item-price" className={inputClass} inputMode="decimal" placeholder="4.50" value={price} onChange={e => setPrice(e.target.value)} />
      </label>
    </fieldset>
    <button type="submit" disabled={busy || !hydrated} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">{busy ? "Adding…" : "Add item"}</button>
  </form>;
}

export function MenuEditor({ items, suspensionVersion }: { items: MenuItem[]; suspensionVersion: number }) {
  return <>
    {items.length === 0
      ? <p>Your menu has no items yet. Add your first drink below.</p>
      : <ul aria-label="Menu items" className="space-y-4">
        {items.map(item => <ItemRow key={`${item.itemId}:${item.name}:${item.drinkType}:${item.priceCents}:${item.soldOut}`} item={item} version={suspensionVersion} />)}
      </ul>}
    <AddItemForm version={suspensionVersion} />
  </>;
}
