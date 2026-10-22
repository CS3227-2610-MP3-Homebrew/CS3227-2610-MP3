import "server-only";
import { getConfiguration } from "@/server/config";

/** Server deployment setting only; request host/forwarding headers never supply trust. */
export function trustedOrigin() {
  const configured = process.env.APP_ORIGIN ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const environment = getConfiguration().environment;
  const value = configured ?? (["local", "ci"].includes(environment) ? `http://127.0.0.1:${process.env.PORT ?? "3000"}` : "");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password) throw new Error("Account origin unavailable.");
  return value;
}
