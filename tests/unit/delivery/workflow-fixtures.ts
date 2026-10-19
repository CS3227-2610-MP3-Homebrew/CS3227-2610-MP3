// @vitest-environment node
import { parseWorkflow, type Target, type Workflow } from "./workflow-contract";

// Synthetic, non-runnable examples. Commit SHAs and CLI version are fixture data,
// not a prescribed implementation dependency/version.
export function goodWorkflow(target: Target): Workflow {
  const prod = target === "production";
  return parseWorkflow(`synthetic-${target}.yml`, `
name: Synthetic ${target}
on:
  push:
    ${prod ? "tags: ['v*']" : "branches: [master]"}
permissions:
  contents: read
concurrency:
  group: delivery-${target}
  cancel-in-progress: false
jobs:
  deliver:
    environment: ${target}
    runs-on: ubuntu-latest
    env:
      VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: \${{ vars.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: \${{ vars.VERCEL_PROJECT_ID }}
      DATABASE_URL: \${{ secrets.SUPABASE_DB_URL }}
    steps:
      - uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      - uses: oven-sh/setup-bun@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
        with:
          bun-version-file: package.json
      - uses: actions/setup-node@cccccccccccccccccccccccccccccccccccccccc
        with:
          node-version: 24
      - run: bun add --global vercel@41.0.0
      ${prod ? "- run: git fetch origin master && git merge-base --is-ancestor HEAD origin/master" : ""}
      - run: supabase db push --db-url "$DATABASE_URL"
      - run: vercel pull --environment=${prod ? "production" : "preview"} --yes
      - run: vercel build${prod ? " --prod" : ""}
      - run: vercel deploy --prebuilt${prod ? " --prod" : ""}
      ${prod ? "" : "- run: vercel alias set deployment-url homebrew-cs3227-dev.vercel.app"}
`);
}

export function goodPair(): Workflow[] {
  return [goodWorkflow("development"), goodWorkflow("production")];
}
export const goodVercel = { regions: ["sin1"], git: { deploymentEnabled: false } };
