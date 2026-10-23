import Link from "next/link";
import { pageParams } from "@/lib/catalogue/query";
import type { OwnerCafe } from "@/lib/owner/cafe-input";
import { menuPage } from "@/server/owner/menu-query";
import { readOwnerMenu } from "@/server/owner/menu";
import { readOwnerCafe } from "@/server/owner/source";
import { ownerAccess } from "../_components/owner-access";
import { MenuEditor } from "./menu-editor";

/** OWN-03 owner Menu: own items, prices and sold-out state, 20 per page. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const denied = await ownerAccess(); if (denied) return denied;
  const page = menuPage(pageParams(await searchParams));
  if (page === null) return <section className="space-y-4"><h1 className="text-2xl font-semibold">Menu</h1><p role="alert">Invalid menu page.</p></section>;
  let cafe: OwnerCafe | null; let menu: Awaited<ReturnType<typeof readOwnerMenu>>;
  try { cafe = await readOwnerCafe(); menu = await readOwnerMenu(page); }
  catch { return <section className="space-y-4"><h1 className="text-2xl font-semibold">Menu</h1><p role="alert">Menu information is temporarily unavailable. Try again.</p></section>; }
  if (!cafe) return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">Menu</h1>
    <p>You do not have a café yet. Apply to register one before adding menu items.</p>
    <p><Link className="inline-block rounded bg-black px-5 py-3 text-white" href="/owner/application">Apply for a café</Link></p>
  </section>;
  return <section className="space-y-6">
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">Menu</h1>
      <p>Prices are in Singapore dollars. Customers pay at the counter. Sold-out items stay visible to customers but cannot be ordered.</p>
      {cafe.suspended && <p role="status" className="rounded-lg border border-black/15 p-4">This café is suspended and hidden from customers. You can keep managing its menu; see the <Link className="underline" href="/owner/application">application page</Link> for details.</p>}
    </header>
    <MenuEditor key={page} items={menu.items} suspensionVersion={cafe.suspensionVersion} />
    <nav aria-label="Menu pages" className="flex gap-5">
      {page > 1 && <Link className="underline" href={`?page=${page - 1}`}>Previous items</Link>}
      {menu.hasNextPage && <Link className="underline" href={`?page=${page + 1}`}>Next items</Link>}
    </nav>
  </section>;
}
