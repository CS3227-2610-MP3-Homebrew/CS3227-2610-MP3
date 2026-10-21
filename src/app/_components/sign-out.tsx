"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accountMessages } from "@/lib/accounts/fields";

export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const submitting = useRef(false);
  async function signOut() {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (response.ok && ["/sign-in", "/sign-in?notice=sign-out-unconfirmed"].includes(result.redirectTo)) { router.replace(result.redirectTo); router.refresh(); return; }
    } catch { /* A network failure cannot confirm cookie clearance. */ }
    setMessage(accountMessages.unexpected); submitting.current = false; setPending(false);
  }
  return <div><button type="button" onClick={signOut} disabled={pending} className="rounded border border-zinc-400 px-4 py-2 disabled:opacity-50">Sign out</button>{message && <p role="alert">{message}</p>}</div>;
}
