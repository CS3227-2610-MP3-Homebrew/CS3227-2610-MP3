import { CafeQueue, type CafeQuery } from "./cafe-queue";
export default function Page(props: CafeQuery) { return <CafeQueue {...props} applications={false} />; }
