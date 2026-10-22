# Homey Theme and Customer Flow Fixes

## Goal
Give Homebrew a warmer light/dark appearance, then improve customer filtering, café navigation, menu availability and order browsing.

## Scope
Eight user-assistant exchanges, including two clarification replies and logging, covering one evolving UI task.

## Key prompts
- “For background: 8a5d3b” fixed the background palette, alongside cards `e0d2b7` and text `340100`.
- “Do the changes in a fix branch” required isolated, reviewable changes.
- “Just run tests that test out the UI” restricted verification after an initial broader run.
- “Apply this UI style throughout the application.” expanded the sign-in/catalogue pilot to all roles.
- “For this fix, waive the spec-first gates and implement directly, including updating the affected UI tests” authorized changes conflicting with existing specs and browser expectations.

## Decisions and corrections
- Created `fix/homey-sign-in-cafe-theme`; implemented warm surfaces, serif headings, coordinated dark mode and responsive controls across the application.
- Stopped broad verification after the UI-only correction. Bundled Node 24 resolved Bun/jsdom errors. Corrected retained-route theme activation and narrow table headings; reran isolated timeout cases successfully.
- Customer filters now apply selected values together. Brew Finder uses applied filters. Café profiles show details, hours, then reviews; separate menu/profile/pre-order links replace duplicate local browsing links.
- Sold-out items are greyed and quantities disabled. Order views group pending/accepted/ready as Active and collected/rejected/cancelled as Past, filtering before pagination through an authenticated, RLS-bound RPC.
- Specs remained unchanged under the explicit waiver. Applied the new migration locally after correcting its timestamp collision. Scoped a new error locator to avoid matching Next's route announcer.
- Final customer verification covered 40 UI cases across runs and 84 production layout checks across light/dark and mobile/desktop. Changes remain uncommitted; no hosted database changes or PR.

## Files created or modified
- `src/app/_components/account-boundary.tsx`
- `src/app/_components/homey-theme.module.css`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/customer/cafes/page.tsx`
- `src/app/customer/cafes/filters.tsx`
- `src/app/customer/cafes/cafe-card.tsx`
- `src/app/customer/cafes/brew-finder.tsx`
- `src/app/customer/cafes/[cafeId]/page.tsx`
- `src/app/customer/cafes/[cafeId]/cafe-actions.tsx`
- `src/app/customer/cafes/[cafeId]/menu/page.tsx`
- `src/app/customer/cafes/[cafeId]/pre-order/page.tsx`
- `src/app/customer/cafes/[cafeId]/pre-order/order-form.tsx`
- `src/app/customer/orders/page.tsx`
- `src/app/customer/orders/order-list.tsx`
- `src/app/customer/orders/customer-orders.tsx`
- `src/lib/orders/views.ts`
- `src/server/orders/query.ts`
- `src/server/orders/source.ts`
- `supabase/migrations/20261023000300_customer_order_views.sql`
- `tests/e2e/catalogue/pages.spec.ts`
- `tests/e2e/brew-finder/search.spec.ts`
- `tests/e2e/orders/pages.spec.ts`
- `workflow/handoffs/implementation-homey-sign-in-cafe-theme/01-implementation.md`
- `workflow/handoffs/implementation-homey-sign-in-cafe-theme/02-implementation.md`
- `workflow/handoffs/implementation-homey-sign-in-cafe-theme/03-implementation.md`
