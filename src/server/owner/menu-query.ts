/** Strict owner menu query: only `page`, at most once, as a positive safe integer without signs or leading zeroes. */
export function menuPage(params: URLSearchParams): number | null {
  const entries = [...params];
  if (entries.length === 0) return 1;
  if (entries.length !== 1 || entries[0][0] !== "page" || !/^[1-9]\d*$/.test(entries[0][1])) return null;
  const page = Number(entries[0][1]);
  return Number.isSafeInteger(page) ? page : null;
}

export const menuQueryInvalidHeader = "x-homebrew-owner-menu-query-invalid";
/** Next can normalize duplicate query keys. Validate the original URL in the
 * proxy, overwrite caller assertions, then validate again in the handler. */
export function markMenuQuery(request: Request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || !/^\/api\/owner\/menu\/?$/.test(url.pathname)) return;
  request.headers.set(menuQueryInvalidHeader, menuPage(url.searchParams) === null ? "1" : "0");
}
