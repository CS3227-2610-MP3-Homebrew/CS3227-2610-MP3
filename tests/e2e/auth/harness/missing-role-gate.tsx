import { Suspense } from "react";
import type { ReactNode } from "react";
import { connection } from "next/server";

async function Missing() {
  await connection();
  throw new Error("Missing implementation: src/app/_components/role-gate.tsx");
  return null;
}
/** Keeps the fixture buildable before the implementation exists; never grants access. */
export function RoleGate({ fallback }: { fallback: ReactNode }) {
  return <Suspense fallback={fallback}><Missing /></Suspense>;
}
