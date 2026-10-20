import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    // The schema integration suite resets the shared local Supabase database.
    // Serialize files so actor and seed fixtures cannot race those resets.
    fileParallelism: false,
    include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs}"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
