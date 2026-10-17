# AI Security Specification Decisions

## Goal
Draft an AI security specification suited to Homebrew's three role-specific SoCLaaS features, then incorporate the user's policy decisions.

## Scope
Three user-assistant exchanges including this logging request, covering one focused specification task on October 17, 2026.

## Key prompts
- “Help me write an AI-SECURITY-SPEC.md suited for my project” — Requested a project-specific security contract grounded in Homebrew's product requirements and technical architecture.
- “ASM-02 do not add this” and “ASM-03 no need for a charging policy” — Rejected the proposed global daily provider-call cap and additional action/cache-hit/failure/refresh charging policy, requiring revisions to dependent criteria and technical passages.

## Decisions and corrections
- Drafted security controls for Brew Finder, Prep Advisor and Moderation Assistant, including prompt injection, role/ownership isolation, minimal model inputs, untrusted-output validation, human confirmation, kill-switch behavior, caches, audit and retention.
- Allocated SEC-01–SEC-09 with 19 acceptance criteria and 13 adversarial evaluation scenarios. Kept architecture/RLS ownership in TECHNICAL-SPEC and exact schemas/prompts in the future INTEGRATION-SPEC.
- User adopted ASM-01's proposed usage limits and feature caps as written.
- User rejected ASM-02's proposed global daily cap of 100 prod / 40 dev provider attempts. Removed that addition without claiming enforcement of the product's proposed dollar-equivalent quota budgets.
- User removed ASM-03's additional charging policy. Preserved the existing technical per-provider-attempt reservation mechanism and adopted usage limits; cache-hit/failed-refresh counting remains unspecified rather than receiving an invented replacement policy.
- User adopted ASM-04: zero automatic retries, a 30-second maximum provider attempt and 65,536-byte feature-context/response ceilings.
- User adopted ASM-05: 30-day AI audit retention, expired-cache deletion within 24 hours and closed usage/admission-window retention for 7 days.
- Retired all five assumption identifiers without reuse; aligned directly conflicting technical passages and SYS-09.4–SYS-09.5. Preserved the first handoff and added a second revision report. No merge or implementation was claimed.
- Structural checks passed: unique SEC IDs/criteria, nine resolved links/anchors, preserved SYS criterion IDs and clean whitespace. `bun run verify` stopped at lint with `eslint: command not found`; later verification stages did not run. Overall revision status remained incomplete because the mandatory gate could not pass.
- PLAN.md still reflects the earlier policy task and was left for a separate planning update. No code/tests, secrets, hosted services, commits or deployments changed.
- GitHub username lookup failed inside the sandbox and succeeded after approved escalation, identifying TaiaYovelaPang for this log.

## Files created or modified
- `workflow/specs/AI-SECURITY-SPEC.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/handoffs/spec-ai-security-spec/01-spec.md`
- `workflow/handoffs/spec-ai-security-spec/02-spec.md`
