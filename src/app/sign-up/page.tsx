import { AccountPage } from "@/app/_components/account-boundary";

export default function Page({ searchParams }: PageProps<"/sign-up">) { return <AccountPage mode="sign-up" searchParams={searchParams} />; }
