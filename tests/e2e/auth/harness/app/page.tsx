import Link from "next/link";

export default function Home() {
  return <main><h1>Role gate fixture</h1>{["customer", "owner", "admin"].map((role) => <Link key={role} href={`/${role}`}>Open {role}</Link>)}</main>;
}
