import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfiguration } from "@/server/config";
import { markCatalogueQuery } from "@/server/catalogue/proxy-query";

/** Refresh transport and preserve strict catalogue query validation; never authorize. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Account routes own their cookie buffer; anonymous demo creation owns admission.
  // Transport denials and active-account conflicts must have no refresh effects.
  if (request.nextUrl.pathname.startsWith("/api/auth/") || request.nextUrl.pathname === "/api/demo-kits") return NextResponse.next();
  markCatalogueQuery(request);
  const configuration = getConfiguration().public;
  const updates = new Map<string, { value: string; options: CookieOptions }>();
  const responseHeaders = new Headers();
  const client = createServerClient(
    configuration.NEXT_PUBLIC_SUPABASE_URL,
    configuration.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers) {
          for (const { name, value, options } of cookies) {
            request.cookies.set(name, value);
            updates.set(name, { value, options });
          }
          for (const [name, value] of Object.entries(headers ?? {})) {
            responseHeaders.set(name, value);
          }
        },
      },
    },
  );
  const originalCookies = request.headers.get("cookie");
  try {
    const result = await client.auth.getUser();
    // Retain expired-session evidence for the request-time account gate even
    // when Auth schedules browser cookie deletion. Outages resolve at that gate.
    if (!result.data.user || result.error) {
      if (originalCookies === null) request.headers.delete("cookie");
      else request.headers.set("cookie", originalCookies);
    }
  } catch {
    if (originalCookies === null) request.headers.delete("cookie");
    else request.headers.set("cookie", originalCookies);
  }

  // Forward the changed Cookie header, retaining unrelated request headers and
  // cookies. Browser Set-Cookie alone would leave this render on the old token.
  const response = NextResponse.next({ request: { headers: request.headers } });
  for (const [name, { value, options }] of updates) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of responseHeaders) response.headers.set(name, value);
  return response;
}

export const config = {
  // Explicit coverage includes opaque café references ending in asset suffixes.
  matcher: ["/api/customer/cafes/:path*", "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
