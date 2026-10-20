# Homebrew

Homebrew is being built for home cafés: small coffee setups run from someone's kitchen or garage. The intended product supports pickup pre-orders, café management, review moderation and one SoCLaaS feature per role. The current build provides the core relational schema, workspace and role access controls, protected Customer/owner Auth provisioning, local demonstration data, local Supabase checks and reusable session refresh, authorization and streaming role gates. Account, customer, owner, admin and AI screens are still to come. See the [Developer Guide](docs/DeveloperGuide.md#authentication-and-authorization) for the implemented authentication foundation and required local configuration.

The server infrastructure also provides durable AI usage admission with atomic
reservations, explicit configured limits and database-clock minute/Singapore-day
windows. It uses a restricted secret-key Supabase RPC; AI features and provider
transport are still to come. See the [usage foundation](docs/DeveloperGuide.md#ai-features-and-the-shared-llm-module).

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
