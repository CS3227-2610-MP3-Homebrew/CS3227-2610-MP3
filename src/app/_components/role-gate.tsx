import "server-only";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getVerifiedActor } from "@/server/auth/session";
import type { VerifiedActor } from "@/server/auth/workspace";

type RoleGateProps = {
  role: VerifiedActor["role"];
  unauthenticatedRedirectTo: string;
  fallback: ReactNode;
  children: ReactNode;
};

async function AuthorizedContent({ role, unauthenticatedRedirectTo, children }: Omit<RoleGateProps, "fallback">) {
  const actor = await getVerifiedActor();
  if (!actor) redirect(unauthenticatedRedirectTo);
  if (actor.role !== role) return null;
  return children;
}

/** Callers supply a public fallback; protected children resolve after the gate. */
export function RoleGate({ fallback, ...props }: RoleGateProps) {
  return <Suspense fallback={fallback}><AuthorizedContent {...props} /></Suspense>;
}
