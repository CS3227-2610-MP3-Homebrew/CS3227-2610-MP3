import "server-only";
import { z } from "zod";

const signupSchema = z.object({ role: z.enum(["customer", "owner"]) });
const configurationSchema = z.object({
  dev: z.object({ emailConfirmationEnabled: z.literal(false) }),
  prod: z.object({ emailConfirmationEnabled: z.literal(false) }),
});

/** Application declarations; hosted Auth project settings are configured separately. */
export const authConfiguration = configurationSchema.parse({
  dev: { emailConfirmationEnabled: false },
  prod: { emailConfirmationEnabled: false },
});

export function resolveSignup(
  input: { role: unknown; metadata?: Record<string, unknown> },
  mainWorkspaceId: string,
): { role: "customer" | "owner"; workspaceId: string } {
  const selection = signupSchema.safeParse(input);
  const workspace = z.uuid().safeParse(mainWorkspaceId);
  if (!selection.success || !workspace.success) throw new Error("Invalid signup selection.");
  // Metadata is deliberately excluded from the protected result.
  return { role: selection.data.role, workspaceId: workspace.data };
}

export function validateAuthConfiguration(input: {
  dev: { emailConfirmationEnabled: boolean };
  prod: { emailConfirmationEnabled: boolean };
}): void {
  if (!configurationSchema.safeParse(input).success) throw new Error("Email confirmation must be disabled.");
}
