import { redirect } from "next/navigation";

/** Legacy path: OWN-02's combined settings page, linked as "Café profile", is /owner/cafe. */
export default function Page() { redirect("/owner/cafe"); }
