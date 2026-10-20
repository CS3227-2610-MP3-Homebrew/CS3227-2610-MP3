declare module "subject-role-gate" {
  import type { ReactNode } from "react";
  export function RoleGate(props: {
    role: "customer" | "owner" | "admin";
    unauthenticatedRedirectTo: string;
    fallback: ReactNode;
    children: ReactNode;
  }): ReactNode;
}
declare module "subject-guard" {
  type Actor = { id: string; workspaceId: string; role: "customer" | "owner" | "admin" };
  export function withAuthorizedActor<T>(input: {
    role: Actor["role"];
    authorize: (actor: Actor) => boolean | Promise<boolean>;
    operation: (actor: Actor) => T | Promise<T>;
  }): Promise<T>;
}
