import { CafeQueue, type CafeQuery } from "../cafes/cafe-queue";
export default function Page(props: CafeQuery) { return <CafeQueue {...props} applications />; }
