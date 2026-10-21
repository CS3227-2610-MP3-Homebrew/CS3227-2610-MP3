import { AccountPage } from "@/app/_components/account-boundary";

export default function Page({ searchParams }: PageProps<"/sign-in">) { return <AccountPage mode="sign-in" searchParams={searchParams} />; }
