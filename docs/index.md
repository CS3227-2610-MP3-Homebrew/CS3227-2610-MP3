---
layout: default
title: Homebrew
---

## Your neighbourhood, one cup at a time

Homebrew serves home cafés: small coffee setups run from someone's kitchen or
garage. Explore cafés, find a drink and pre-order for pickup. Pay at the counter
when you collect your drinks.

**[Open the app](https://homebrew-cs3227-prod.vercel.app)**

## Three roles, with AI advice where it helps

| Role | Available today | AI feature |
| --- | --- | --- |
| Customer | Browse and filter cafés; read menus, Singapore opening hours and public reviews; place pickup orders with a named account; view order history and cancel pending orders. | **Brew Finder** suggests cafés and drinks from an explicit natural-language search. The ordinary catalogue stays available when AI cannot help. |
| Café owner | Sign up, sign in and access owner navigation. Café application and management pages currently show entry headings. | **Prep Advisor** remains unavailable. |
| Admin | Approve or reject café applications, suspend or un-suspend approved cafés, moderate reviews and inspect the workspace audit log. | **Moderation Assistant** suggests classifications for pending reviews. Admins choose a reason and confirm each moderation action themselves. |

AI suggestions are advice and may be wrong. Searches never place orders, and
triage never moderates reviews automatically. Local AI checks use fake or
disabled responses; they do not measure live recommendation or classification quality.

## Try Homebrew with a demo kit

1. Open the app and choose **Try Homebrew** → **Create demo kit** on Sign in.
2. Save the Customer, Café owner and Admin credentials before leaving: they are
   displayed only once and cannot be retrieved later.
3. Sign in with one account. Sign out before trying another role.
4. As Customer, explore the sample café and menu, place a pickup order or cancel
   a pending order. As Admin, inspect the sample café application and synthetic
   reviews in your kit's separate workspace.

New demo-kit Customers have the protected account name needed to order.
Current sign-up and older unnamed accounts do not supply that name, and there
is no account-name repair control. Owner fulfilment tools remain unavailable;
collected-order examples come from sample purchases. Kit creation is rate limited
and makes no AI request.

See the [demo account instructions](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/docs/UserGuide.md#15-demo-accounts-for-testers)
for details.

## Built with specifications, tests and human review

Homebrew uses TypeScript, Next.js App Router and Supabase. Human-approved
specifications guide development. In the test-first multi-agent workflow, a
testing agent writes failing acceptance tests before implementation; review,
security review and documentation follow. Humans review changes and control
merges and production deployment. The workflow also supports a human-selected
single-agent mode with self-review.

AI security combines server-side authorization, workspace boundaries, validated
inputs and AI outputs, bounded provider attempts and usage limits. AI advice
leaves ordering and moderation decisions with the user. These controls are
checked locally with fake providers rather than live AI calls.

Read about the [development workflow](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/docs/DeveloperGuide.md#development-workflow)
and the [shared AI layer](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/docs/DeveloperGuide.md#ai-features-and-the-shared-llm-module).

## Documentation

- [User Guide](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/docs/UserGuide.md) — accounts, demo kits, role features and current limitations.
- [Developer Guide](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/docs/DeveloperGuide.md) — setup, architecture, workflow, testing and security.
- [Source and README](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/blob/master/README.md) — the project repository on GitHub.

## Team

Built for CS3227 MP3 by **TaiaYovelaPang**, **naa-siuuuu-ff** and **shawnnygoh**.
