import "server-only";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { accountMessages, notices, roleHomes } from "@/lib/accounts/fields";
import { resolveAccountAccess, type AccountAccess } from "@/server/auth/account-access";
import { AccountForm } from "./account-form";
import { SignOut } from "./sign-out";

export const checkingAccount = <p role="status" className="p-6">Checking account…</p>;
export function AccountFailure({ kind }: { kind: "unavailable" | "retry" }) {
  return <section className="mx-auto max-w-lg space-y-4 p-6"><p role="alert">{accountMessages[kind]}</p>{kind === "unavailable" ? <SignOut /> : <a href="" className="underline">Try again</a>}</section>;
}
function failedAccess(access: Exclude<AccountAccess, { kind: "verified" }>) {
  if (access.kind === "unavailable" || access.kind === "retry") return <AccountFailure kind={access.kind} />;
  redirect(access.kind === "session-ended" ? "/sign-in?notice=session-ended" : "/sign-in");
}
async function HomeDestination() {
  await connection();
  const access = await resolveAccountAccess();
  if (access.kind !== "verified") return failedAccess(access);
  redirect(roleHomes[access.actor.role]);
}
export function AccountHome() { return <Suspense fallback={checkingAccount}><HomeDestination /></Suspense>; }

async function AccountEntry({ mode, searchParams }: { mode: "sign-up" | "sign-in"; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const access = await resolveAccountAccess();
  if (access.kind === "verified") redirect(roleHomes[access.actor.role]);
  if (access.kind === "retry" || access.kind === "unavailable") return <AccountFailure kind={access.kind} />;
  const query = await searchParams;
  const notice = typeof query.notice === "string" && Object.hasOwn(notices, query.notice) ? notices[query.notice as keyof typeof notices] : undefined;
  return <main>{mode === "sign-in" && notice && <p className="mx-auto max-w-md px-6 pt-6" role="status">{notice}</p>}<AccountForm mode={mode} /></main>;
}
export function AccountPage(props: { mode: "sign-up" | "sign-in"; searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <Suspense fallback={checkingAccount}><AccountEntry {...props} /></Suspense>; }

const navigation = {
  customer: [["Browse cafés", "/customer/cafes"], ["My orders", "/customer/orders"]],
  owner: [["Café application", "/owner/application"], ["Dashboard", "/owner/dashboard"], ["Order queue", "/owner/orders"], ["Menu", "/owner/menu"], ["Café profile", "/owner/profile"]],
  admin: [["Moderation queue", "/admin/moderation"], ["Café applications", "/admin/applications"], ["Cafés", "/admin/cafes"], ["Audit log", "/admin/audit"]],
} as const;
async function VerifiedRoleShell({ role, children }: { role: keyof typeof roleHomes; children: ReactNode }) {
  await connection();
  const access = await resolveAccountAccess();
  if (access.kind !== "verified") return failedAccess(access);
  if (access.actor.role !== role) redirect(roleHomes[access.actor.role]);
  return <div className="mx-auto w-full max-w-5xl p-6"><nav aria-label="Main navigation" className="mb-8 flex flex-wrap items-center gap-5">{navigation[role].map(([text, path]) => <Link key={path} className="underline" href={path}>{text}</Link>)}<SignOut /></nav><main>{children}</main></div>;
}
export function AccountRoleShell(props: { role: keyof typeof roleHomes; children: ReactNode }) { return <Suspense fallback={checkingAccount}><VerifiedRoleShell {...props} /></Suspense>; }
