"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountMessages, roleHomes, signInFields, signUpFields } from "@/lib/accounts/fields";
import { SignOut } from "./sign-out";

const inputStyle = "w-full rounded border border-zinc-400 bg-white px-3 py-2 text-zinc-950 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-800";
const buttonStyle = "rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900";
const safeMessages = new Set<string>([...Object.values(accountMessages), "Email or password is incorrect.", "Unable to create account. Try signing in.", "Unable to complete account setup. Try again.", "Account setup could not be completed. Try signing in; account access is unavailable until setup is resolved.", "Too many attempts. Try again later.", "An account is already signed in.", "Check the account fields and try again."]);

export function AccountForm({ mode }: { mode: "sign-up" | "sign-in" }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "owner" | "">("");
  const [pending, setPending] = useState(false); const submitting = useRef(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({}); const [message, setMessage] = useState("");
  const label = mode === "sign-up" ? "Sign up" : "Sign in";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const values = mode === "sign-up" ? { email, password, role } : { email, password };
    const parsed = (mode === "sign-up" ? signUpFields : signInFields).safeParse(values);
    setMessage("");
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), true])));
      return;
    }
    setErrors({}); submitting.current = true; setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = await response.json();
      const destinations: readonly string[] = [...Object.values(roleHomes), "/sign-in?notice=account-created"];
      if (response.ok && destinations.includes(body.redirectTo)) { router.replace(body.redirectTo); router.refresh(); return; }
      setMessage(safeMessages.has(body.error?.message) ? body.error.message : accountMessages.unexpected);
    } catch { setMessage(accountMessages.unexpected); }
    setPassword(""); submitting.current = false; setPending(false);
  }
  return <section className="mx-auto w-full max-w-md space-y-6 p-6">
    <h1 className="text-2xl font-semibold">{label}</h1>
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset disabled={pending} className="space-y-5">
        <div className="space-y-1"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className={inputStyle} />{errors.email && <p id="email-error" role="alert">Enter a valid email address.</p>}</div>
        <div className="space-y-1"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className={inputStyle} />{errors.password && <p id="password-error" role="alert">{mode === "sign-up" ? "Use at least 8 characters and at most 72 UTF-8 bytes." : "Enter your password (at most 72 UTF-8 bytes)."}</p>}</div>
        {mode === "sign-up" && <fieldset aria-describedby={errors.role ? "role-error" : undefined} className="space-y-2"><legend>Choose your role</legend>{([ ["customer", "Customer"], ["owner", "Café owner"] ] as const).map(([value, text]) => <label className="mr-5 inline-flex items-center gap-2" key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} required />{text}</label>)}{errors.role && <p id="role-error" role="alert">Choose Customer or Café owner.</p>}</fieldset>}
        <button type="submit" disabled={pending} className={buttonStyle}>{label}</button>
        {pending && <p role="status">Please wait…</p>}
      </fieldset>
    </form>
    {message && <div className="space-y-3"><p role="alert">{message}</p>{message === accountMessages.unavailable && <SignOut />}</div>}
    <Link className="underline" href={mode === "sign-up" ? "/sign-in" : "/sign-up"}>{mode === "sign-up" ? "Sign in" : "Sign up"}</Link>
  </section>;
}
