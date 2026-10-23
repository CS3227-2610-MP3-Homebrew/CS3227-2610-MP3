[![CI](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/actions/workflows/ci.yml/badge.svg)](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/actions/workflows/ci.yml)

# Homebrew

**Homebrew is a web app for home cafés**: small coffee setups run from someone's
kitchen or garage. Customers find a café and pre-order drinks for pickup, café
owners run their café, and Admins keep the catalogue and reviews trustworthy.
Each role has one advisory AI feature, and every AI suggestion leaves the
decision with a person.

- **Customers** browse and filter cafés; read menus, Singapore opening hours and
  public reviews; pre-order for pickup and pay at the counter; view and cancel
  orders; and review collected orders. **Brew Finder** suggests cafés and drinks
  from a natural-language search.
- **Café owners** apply to register a café; manage its profile, opening hours,
  pickup cutoff and menu; run the order queue and print today's prep sheet; and
  view sales. **Prep Advisor** suggests what to prepare more or less of on each
  weekday from the café's own sales.
- **Admins** approve or reject café applications, suspend or un-suspend cafés,
  moderate reviews and inspect the audit log. The **Moderation Assistant**
  suggests a label for each pending review; the Admin confirms every action.

## Try it

Open the production app at <https://homebrew-cs3227-prod.vercel.app> and choose
**Try Homebrew** → **Create demo kit** on Sign in. A kit creates a separate
workspace with Customer, Café owner and Admin accounts, so you can test every
role without help from the team. Save the credentials when they are shown: they
appear only once. See the [User Guide](docs/UserGuide.md#15-demo-accounts-for-testers)
for details.

## Getting started

Requires Node.js 24, [Bun](https://bun.sh) 1.4.3 and a running Docker engine for
the local Supabase stack. From the repository root:

```bash
bun install --frozen-lockfile
bun run db:start
bun run db:reset
bun run dev
```

Then open <http://127.0.0.1:3000>. The app needs local configuration values
before it starts; see the Developer Guide's
[setup section](docs/DeveloperGuide.md#setting-up-getting-started). Run
`bun run verify` for lint, type checks, unit and integration tests, the spec and
traceability checks, and a production build.

## Documentation

- **[User Guide](docs/UserGuide.md)**: accounts, demo kits and each role's
  features.
- **[Developer Guide](docs/DeveloperGuide.md)**: architecture, the spec-driven
  multi-agent workflow, security, testing and deployment.
- **[Product website](https://cs3227-2610-mp3-homebrew.github.io/CS3227-2610-MP3/)**
- **Specifications and plan:** [`workflow/specs/`](workflow/specs/) and
  [`workflow/PLAN.md`](workflow/PLAN.md).
- **Reflections:** [`docs/Reflections.md`](docs/Reflections.md).

**Team:** [TaiaYovelaPang](https://github.com/TaiaYovelaPang) (Customer
features), [naa-siuuuu-ff](https://github.com/naa-siuuuu-ff) (Café owner
features) and [shawnnygoh](https://github.com/shawnnygoh) (Admin features).

## Acknowledgements

Built with [Next.js](https://nextjs.org/), [React](https://react.dev/),
[Supabase](https://supabase.com/), [Zod](https://zod.dev/),
[Tailwind CSS](https://tailwindcss.com/), [Vitest](https://vitest.dev/),
[Playwright](https://playwright.dev/) and [Bun](https://bun.sh/), hosted on
[Vercel](https://vercel.com/). AI features use the SoC LLM service. See the
Developer Guide's [Acknowledgements](docs/DeveloperGuide.md#acknowledgements)
for reuse from MP2 and other sources.
