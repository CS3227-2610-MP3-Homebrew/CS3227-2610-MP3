import "server-only";

/** Only the HTTP Retry-After vocabulary is admitted, never arbitrary headers. */
export function validRetryAfter(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))) return value;
  // IMF-fixdate: parsing plus round-trip validation rejects invalid dates and
  // arbitrary provider text without inventing a delay or consulting the clock.
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp) && new Date(timestamp).toUTCString() === value) return value;
  }
  return undefined;
}

/** Request-local capture, before Auth SDK error conversion discards headers. */
export function createAccountTransport(supabaseUrl: string, transport: typeof fetch = fetch) {
  const auth = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/`);
  let retryAfter: string | undefined;
  return {
    async fetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
      const response = await transport(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin === auth.origin && url.pathname.startsWith(auth.pathname)) {
        retryAfter = response.status === 429 ? validRetryAfter(response.headers.get("retry-after")) : undefined;
      }
      return response;
    },
    takeRetryAfter() { const value = retryAfter; retryAfter = undefined; return value; },
  };
}
