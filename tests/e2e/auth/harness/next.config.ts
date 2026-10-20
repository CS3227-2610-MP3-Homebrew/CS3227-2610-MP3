import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

const root = resolve(import.meta.dirname, "../../../..");
const session = resolve(root, "src/server/auth/session");
const fixtureSession = resolve(import.meta.dirname, "session.ts");
const subject = (path: string, missing: string) => existsSync(resolve(root, path)) ? resolve(root, path) : resolve(import.meta.dirname, missing);

const config: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  distDir: "../../../../.next/auth-harness",
  outputFileTracingRoot: root,
  webpack(config, { webpack }) {
    config.resolve.alias["subject-role-gate"] = subject("src/app/_components/role-gate.tsx", "missing-role-gate.tsx");
    config.resolve.alias["subject-guard"] = subject("src/server/auth/guard.ts", "missing-guard.ts");
    // Only the session source is controlled. Real RoleGate and guard code run
    // unchanged; actual SSR Auth/profile/refresh are covered in integration tests.
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/session(?:\.ts)?$/, (resource: { request: string; context: string }) => {
      const target = resolve(resource.context, resource.request).replace(/\.ts$/, "");
      if (resource.request === "@/server/auth/session" || target === session) resource.request = fixtureSession;
    }));
    return config;
  },
};
export default config;
