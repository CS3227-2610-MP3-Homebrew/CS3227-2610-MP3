/** Synthetic inputs only. These helpers never inspect process.env or dotenv files. */
export type EnvironmentInput = Record<string, string | undefined>;

export const secretNames = [
  "SUPABASE_SECRET_KEY",
  "SOCLAAS_API_KEY",
  "SUPABASE_DB_URL",
  "VERCEL_TOKEN",
  "CRON_SECRET",
  "MAIN_ADMIN_PASSWORD",
] as const;

export const secretCanaries = Object.fromEntries(
  secretNames.map((name) => [name, `synthetic-private-${name.toLowerCase()}-canary`]),
);

export function configuration(overrides: EnvironmentInput = {}): EnvironmentInput {
  const environment = overrides.APP_ENV;
  const supabaseUrl = environment === "dev" || environment === "prod"
    ? `https://homebrew-${environment}.synthetic.invalid`
    : "http://127.0.0.1:54321";
  return {
    APP_ENV: "local",
    AI_PROVIDER: "fake",
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-local-key",
    SOCLAAS_BASE_URL: "https://soclaas.invalid/v1",
    SOCLAAS_MODEL: "qwen3.5:9b",
    SOCLAAS_REASONING_EFFORT: "none",
    AI_GLOBAL_CALLS_PER_MINUTE: "30",
    AI_GLOBAL_CALLS_PER_DAY: "40",
    AI_USER_ACTIONS_PER_MINUTE: "5",
    AI_USER_ACTIONS_PER_DAY: "30",
    AI_BREW_FINDER_CALLS_PER_MINUTE: "20",
    AI_PREP_ADVISOR_CALLS_PER_MINUTE: "5",
    AI_MODERATION_CALLS_PER_MINUTE: "5",
    AI_BREW_FINDER_CALLS_PER_ACTION: "2",
    AI_PREP_ADVISOR_CALLS_PER_ACTION: "1",
    AI_MODERATION_CALLS_PER_ACTION: "1",
    AI_PREP_REFRESHES_PER_DAY: "3",
    AI_MODERATION_RUNS_PER_DAY: "10",
    AI_MODERATION_REVIEWS_PER_CALL: "20",
    DEMO_KITS_PER_10_MINUTES: "5",
    DEMO_KITS_PER_DAY: "30",
    ...overrides,
  };
}

/** Identifiers of separate deployment settings, never API key contents. */
export function deploymentBindings() {
  return {
    dev: {
      supabaseUrl: "https://homebrew-dev.synthetic.invalid",
      publishableKeyBinding: "development/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      secretKeyBinding: "development/SUPABASE_SECRET_KEY",
      soclaasKeyBinding: "development/SOCLAAS_API_KEY",
    },
    prod: {
      supabaseUrl: "https://homebrew-prod.synthetic.invalid",
      publishableKeyBinding: "production/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      secretKeyBinding: "production/SUPABASE_SECRET_KEY",
      soclaasKeyBinding: "production/SOCLAAS_API_KEY",
    },
  };
}
