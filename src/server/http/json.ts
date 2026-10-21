import "server-only";

type ResponseHeaders = Record<string, string>;
type ErrorResponse = (status: number, code: string, message: string, headers?: ResponseHeaders) => Response;

export function privateResponses(requestId = crypto.randomUUID()) {
  const json = (body: object, status = 200, headers: ResponseHeaders = {}) => Response.json({ requestId, ...body }, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
  const error: ErrorResponse = (status, code, message, headers) => json({ error: { code, message } }, status, headers);
  return { json, error };
}

export function checkOrigin(origin: string | null, trustedOrigin: string, error: ErrorResponse) {
  if (origin !== trustedOrigin) return error(403, "FORBIDDEN", "Request origin is not allowed.");
}

export function checkJsonContentType(request: Request, error: ErrorResponse) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
}

export const BYTE_LIMIT = 65_536;
export class BodyOverflow extends Error {}

/** Bounds actual UTF-8 bytes. Default cleanup never waits for a remote stream.
 * overflow-only preserves account requests' existing awaited overflow cancellation.
 */
export async function readBounded(body: ReadableStream<Uint8Array> | null, signal?: AbortSignal, cleanup: "cancel-and-release" | "overflow-only" = "cancel-and-release"): Promise<string> {
  if (!body) throw new Error("Missing body.");
  const reader = body.getReader();
  const overflowOnly = cleanup === "overflow-only";
  let size = 0;
  const chunks: Uint8Array[] = [];
  const cancel = () => { void reader.cancel().catch(() => {}); };
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => { cancel(); reject(new Error("Cancelled.")); };
    if (!overflowOnly) signal?.addEventListener("abort", onAbort, { once: true });
  });
  try {
    if (!overflowOnly && signal?.aborted) throw new Error("Cancelled.");
    while (true) {
      const { done, value } = await (overflowOnly ? reader.read() : Promise.race([reader.read(), aborted]));
      if (done) break;
      size += value.byteLength;
      if (size > BYTE_LIMIT) {
        if (overflowOnly) await reader.cancel();
        throw new BodyOverflow();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    if (!overflowOnly) cancel();
    throw error;
  } finally {
    if (!overflowOnly) {
      signal?.removeEventListener("abort", onAbort);
      reader.releaseLock();
    }
  }
}

