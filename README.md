# Homebrew

Homebrew is being built for home cafés: small coffee setups run from someone's kitchen or garage. The intended product supports pickup pre-orders, café management, review moderation and one SoCLaaS feature per role. The current build provides the core relational schema, workspace and role access controls, protected Customer/owner Auth provisioning, local demonstration data, local Supabase checks and reusable session refresh, authorization and streaming role gates. Shared Customer/owner sign-up, main/kit account sign-in, this-browser sign-out and role-only navigation are available. Admins can manually Keep, Hide and Restore workspace reviews with a reason and per-review confirmation, and inspect the read-only Admin audit log. Customers can browse and filter eligible workspace cafés, open closed café cards, and inspect menus with SGD prices, Singapore opening hours and public reviews. Pickup ordering, retained My orders history and pending-order cancellation are implemented; ordering requires a protected Customer name that current signup/demo provisioning does not yet populate. Customers can submit one immutable review per own collected order and read their submitted review, including hidden reviews. Brew Finder on Browse cafés accepts an explicit natural-language search and shows ranked AI-generated café/item advice, with the ordinary rating-sorted filtered catalogue retained for empty results and AI fallbacks. It uses current workspace access, same-account cache checks and separate café/order authorization. Other role domain pages contain entry headings and an owner no-café application link; Prep Advisor remains unavailable. See the [Customer guide](docs/UserGuide.md#4-customer-guide) for browsing, pickup, order history and collected-order reviews, [Brew Finder](docs/UserGuide.md#72-find-a-café-with-brew-finder) for advisory search, and the [Admin guide](docs/UserGuide.md#6-admin-guide) for the implemented controls. See the [Developer Guide](docs/DeveloperGuide.md#authentication-and-authorization) for the implemented authentication foundation and required local configuration.

The server infrastructure also provides durable AI usage admission with atomic
reservations, explicit configured limits and database-clock minute/Singapore-day
windows. It uses a restricted secret-key Supabase RPC. Shared server-only LLM
operations now validate feature inputs and provider/cache results, use fixed
prompts and one bounded provider attempt, and return typed fallbacks. Deterministic
fake and disabled modes support local checks. Admin triage consumes these controls
through `/api/ai/moderation`; other AI feature integrations remain pending. See the [shared LLM layer](docs/DeveloperGuide.md#ai-features-and-the-shared-llm-module)
for caller responsibilities and integration limits.

## User roles

Planned product roles:

| Role | What they do |
| --- | --- |
| **Customer** | Browse approved cafés, pre-order with a pickup slot, track and cancel orders, review collected orders |
| **Café owner** | Register a café, manage menu, prices and opening hours, run the order queue, view sales |
| **Admin** | Approve, suspend or un-suspend cafés, moderate reviews |

## Getting started

Requires [Bun](https://bun.sh) (package manager) and Node.js 24.

```bash
bun install
bun run dev
```

Then open <http://localhost:3000>.

Delivery workflows and human setup are documented in the [Developer Guide](docs/DeveloperGuide.md#deployment-and-environments).
