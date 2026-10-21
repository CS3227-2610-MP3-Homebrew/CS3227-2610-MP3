import { z } from "zod";

const email = z.string().transform((value) => value.trim().toLowerCase())
  .pipe(z.email().refine((value) => [...value].length <= 254));
const password = z.string().refine((value) => new TextEncoder().encode(value).length <= 72);
export const signInFields = z.strictObject({ email, password: password.refine((value) => value.length > 0) });
export const signUpFields = z.strictObject({ email, password: password.refine((value) => [...value].length >= 8), role: z.enum(["customer", "owner"]) });
export const roleHomes = { customer: "/customer/cafes", owner: "/owner/dashboard", admin: "/admin/moderation" } as const;
export const notices = {
  "account-created": "Account created. Sign in to continue.",
  "session-ended": "Your session ended. Sign in again.",
  "sign-out-unconfirmed": "Signed out of this browser; session revocation could not be confirmed.",
} as const;
export const accountMessages = {
  unavailable: "Account access is unavailable. Sign out and try again.",
  retry: "Account service is temporarily unavailable. Try again.",
  unexpected: "Unable to complete the request. Try again.",
} as const;
