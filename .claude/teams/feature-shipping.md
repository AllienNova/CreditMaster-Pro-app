---
name: feature-shipping
description: "Ships a new user-facing feature end-to-end: web + mobile + DB policy + tests + a11y."
lead: nextjs-route-builder
agents: [nextjs-route-builder, supabase-rls-architect, expo-mobile-builder, a11y-implementer, rls-policy-tester]
---

# Feature Shipping Team

## Mission
Take a feature spec from "approved" to "shipped on web + mobile."

## Workflow
1. **nextjs-route-builder** sketches the data + API surface (pages, API routes, server actions)
2. **supabase-rls-architect** designs the schema delta + RLS policy + any atomic RPC
3. **rls-policy-tester** writes the negative test suite for the new policy
4. **nextjs-route-builder** implements web UI + API + integrates with Supabase
5. **expo-mobile-builder** implements the mirroring mobile screen + zustand store + chart
6. **a11y-implementer** audits both surfaces — WCAG 2.1 AA per `.claude/agents/a11y-implementer.md`
7. Verify: lint + types + unit + Playwright/Cypress E2E + Expo screenshots (Android + iOS)

## Exit criteria
- Web feature live in dev
- Mobile feature live in Expo dev client (both platforms)
- RLS policy + negative tests in CI
- a11y violations = 0
- Feature documented in `docs/features/`

## Hard rules
- Wave 7 status: if ship is BLOCKED, only Wave 7 work merges. New features queue.
- Web and mobile must ship together (no web-only features that mobile users will see "coming soon" boxes for)
- No new third-party dependency without security review
- Every server action / API handler validates input with `zod`

## Common pitfalls (refuse to do these)
- Skip mobile because "we'll do it next sprint"
- Ship without a11y review
- Add a feature flag instead of an RLS policy
- Cache responses without verifying RLS enforcement still works
