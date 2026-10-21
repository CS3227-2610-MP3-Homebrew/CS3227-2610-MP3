import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getConfiguration } from "@/server/config";

/** A fresh, publishable-key client: ordinary queries retain the caller's RLS. */
export async function createSessionClient(options?: { retry: boolean }) {
  const cookieStore = await cookies();
  const configuration = getConfiguration().public;
  return createServerClient(
    configuration.NEXT_PUBLIC_SUPABASE_URL,
    configuration.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      ...(options ? { db: { retry: options.retry } } : {}),
      // Server Components cannot write cookies. Proxy persists any refresh
      // before rendering; do not share this client between requests.
      cookies: { getAll: () => cookieStore.getAll() },
    },
  );
}
