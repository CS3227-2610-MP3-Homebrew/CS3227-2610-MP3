"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";

const accountsSchema = z.array(z.strictObject({ role: z.enum(["customer", "owner", "admin"]), email: z.email(), password: z.string().min(16) })).length(3);
type Accounts = z.infer<typeof accountsSchema>;
const labels = { customer: "Customer", owner: "Café owner", admin: "Admin" };
export function DemoKit() {
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const active = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    // A restored browser-history document must not restore once-shown credentials.
    const clear = () => setAccounts([]);
    const pageHide = () => { active.current?.abort(); flushSync(clear); };
    window.addEventListener("pagehide", pageHide);
    return () => { window.removeEventListener("pagehide", pageHide); active.current?.abort(); active.current = null; busy.current = false; setPending(false); clear(); };
  }, []);
  async function create() {
    if (busy.current) return;
    const controller = new AbortController(); active.current = controller;
    busy.current = true; setPending(true); setAccounts([]); setMessage("");
    try {
      const response = await fetch("/api/demo-kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store", signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      const parsed = accountsSchema.safeParse(body.kit?.accounts);
      if (response.ok && parsed.success && new Set(parsed.data.map(a => a.role)).size === 3) setAccounts(parsed.data);
      else if (response.status === 429 && body.error?.code === "RATE_LIMITED" && typeof body.error.message === "string" && /^Demo kit limit reached\. Try again in \d+ (seconds?|minutes?)\.$/.test(body.error.message)) setMessage(body.error.message);
      else setMessage("Demo kit service is temporarily unavailable. Try again.");
    } catch { if (!controller.signal.aborted) setMessage("Demo kit service is temporarily unavailable. Try again."); }
    finally { if (active.current === controller) { busy.current = false; setPending(false); active.current = null; } }
  }
  return <section aria-label="Demo kit" className="mx-auto w-full max-w-md space-y-4 px-6 pb-8">
    <h2 className="text-xl font-semibold">Try Homebrew</h2>
    <p>Create a separate demo café workspace with Customer, Café owner and Admin accounts.</p>
    <button type="button" disabled={pending} onClick={create} className="rounded border border-zinc-500 px-4 py-2 focus:outline-2 focus:outline-offset-2 disabled:opacity-50">Create demo kit</button>
    {pending && <p role="status">Creating your demo kit…</p>}
    {message && <p role="alert">{message}</p>}
    {accounts.length > 0 && <div aria-live="polite" className="space-y-4">
      <p>Save these credentials now. They are shown only here, once. Use the sign-in form above for each account.</p>
      {accounts.map(account => <section key={account.role} className="space-y-2 rounded border border-zinc-300 p-3"><h3 className="font-semibold">{labels[account.role]}</h3><dl className="space-y-1"><dt>Email</dt><dd className="break-all select-all">{account.email}</dd><dt>Password</dt><dd className="break-all select-all font-mono">{account.password}</dd></dl></section>)}
    </div>}
  </section>;
}
