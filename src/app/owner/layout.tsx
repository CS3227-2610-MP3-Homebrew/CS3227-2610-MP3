import { AccountRoleShell } from "@/app/_components/account-boundary";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) { return <AccountRoleShell role="owner">{children}</AccountRoleShell>; }
