import { z } from "zod";

// The pure parser accepts explicit inputs so tooling can validate synthetic
// configuration without loading credentials. Live access uses the poisoned
// server entry point in index.ts; the import check also excludes this entire
// directory from client graphs.
if (typeof window !== "undefined") {
  throw new Error("Server configuration is unavailable in the browser.");
}

export type EnvironmentInput = Record<string, string | undefined>;

export const publicConfigurationNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export const sensitiveConfigurationNames = [
  "SUPABASE_SECRET_KEY",
  "SOCLAAS_API_KEY",
  "SUPABASE_DB_URL",
  "VERCEL_TOKEN",
  "CRON_SECRET",
  "MAIN_ADMIN_PASSWORD",
] as const;

const httpUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
});

const configurationSchema = z.object({
  APP_ENV: z.enum(["local", "ci", "dev", "prod"]),
  AI_PROVIDER: z.enum(["soclaas", "fake", "disabled"]),
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).refine((value) =>
    !value.startsWith("sb_secret_") && !/^[\w-]+\.[\w-]+\.[\w-]*$/.test(value)),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SOCLAAS_API_KEY: z.string().trim().optional(),
  SOCLAAS_BASE_URL: httpUrl.optional(),
  SOCLAAS_MODEL: z.string().trim().min(1).optional(),
  SOCLAAS_REASONING_EFFORT: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
  const reject = (message: string) => context.addIssue({ code: "custom", message });
  if ([value.SUPABASE_SECRET_KEY, value.SOCLAAS_API_KEY].filter(Boolean)
    .includes(value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    reject("A private credential cannot be used as a publishable key.");
  }
  if (value.APP_ENV === "prod" && value.AI_PROVIDER === "fake") {
    reject("Fake provider is unavailable in production.");
  }
  if (value.APP_ENV === "ci" && value.SOCLAAS_API_KEY) {
    reject("CI must not hold a live provider key.");
  }
  if (value.APP_ENV === "local" || value.APP_ENV === "ci") {
    if (!URL.canParse(value.NEXT_PUBLIC_SUPABASE_URL)) return;
    const hostname = new URL(value.NEXT_PUBLIC_SUPABASE_URL).hostname;
    if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
      reject("Local and CI databases must use a loopback address.");
    }
  }
  if (value.AI_PROVIDER === "soclaas" && value.SOCLAAS_API_KEY &&
      (!value.SOCLAAS_BASE_URL || !value.SOCLAAS_MODEL || !value.SOCLAAS_REASONING_EFFORT)) {
    reject("Enabled provider configuration is incomplete.");
  }
});

export function parseConfiguration(input: EnvironmentInput) {
  const result = configurationSchema.safeParse(input);
  // Never expose Zod issues, the untrusted input, or a chained provider error.
  if (!result.success) throw new Error("Invalid application configuration.");
  const value = result.data;
  const enabled = value.AI_PROVIDER === "fake" ||
    (value.AI_PROVIDER === "soclaas" && Boolean(value.SOCLAAS_API_KEY));
  return {
    environment: value.APP_ENV,
    ai: {
      provider: value.AI_PROVIDER,
      enabled,
      // Capability only: feature code still authorizes every fallback read.
      fallbackAvailable: true,
      baseUrl: value.SOCLAAS_BASE_URL,
      model: value.SOCLAAS_MODEL,
      reasoningEffort: value.SOCLAAS_REASONING_EFFORT,
      apiKey: enabled && value.AI_PROVIDER === "soclaas" ? value.SOCLAAS_API_KEY : undefined,
    },
    supabase: { secretKey: value.SUPABASE_SECRET_KEY },
    public: {
      NEXT_PUBLIC_SUPABASE_URL: value.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  };
}

const deploymentBindingSchema = z.object({
  supabaseUrl: httpUrl,
  publishableKeyBinding: z.string().trim().min(1),
  secretKeyBinding: z.string().trim().min(1),
  soclaasKeyBinding: z.string().trim().min(1),
});

export type DeploymentBinding = z.infer<typeof deploymentBindingSchema>;

export function validateDeploymentBindings(input: { dev: DeploymentBinding; prod: DeploymentBinding }): void {
  const result = z.object({ dev: deploymentBindingSchema, prod: deploymentBindingSchema }).safeParse(input);
  if (!result.success) throw new Error("Invalid deployment bindings.");
  const { dev, prod } = result.data;
  const sameDatabase = new URL(dev.supabaseUrl).origin === new URL(prod.supabaseUrl).origin;
  if (sameDatabase || (["publishableKeyBinding", "secretKeyBinding", "soclaasKeyBinding"] as const)
    .some((field) => dev[field] === prod[field])) {
    throw new Error("Development and production require distinct deployment bindings.");
  }
}

/** Keep the supplied value and the effective value produced by credential trimming. */
export function secretValueVariants(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0)
    .flatMap((value) => [value, value.trim()]))]
    .sort((a, b) => b.length - a.length);
}

export function configuredSecretValues(input: EnvironmentInput): string[] {
  return secretValueVariants(Object.entries(input)
    .filter(([name, value]) => value && (sensitiveConfigurationNames.some((secret) => name.includes(secret)) ||
      /(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|DATABASE_URL|DB_URL)/i.test(name)))
    .map(([, value]) => value as string));
}

/** Produce a JSON-safe copy; neither nested errors nor object keys can leak. */
export function redactSensitiveOutput(value: unknown, input: EnvironmentInput): unknown {
  const secrets = configuredSecretValues(input);
  const redact = (text: string) => secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), text);
  const seen = new WeakSet<object>();
  function visit(item: unknown): unknown {
    if (typeof item === "string") return redact(item);
    if (typeof item === "bigint") return item.toString();
    if (typeof item !== "object" || item === null) return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    if (Array.isArray(item)) return item.map(visit);
    const properties = item instanceof Error
      ? { ...item, name: item.name, message: item.message, stack: item.stack, cause: item.cause }
      : item;
    return Object.fromEntries(Object.entries(properties).map(([key, child]) => [redact(key), visit(child)]));
  }
  return visit(value);
}
