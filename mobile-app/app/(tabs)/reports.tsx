/**
 * Reports tab entry point.
 *
 * Re-exports the real screen rather than defining a second one. This file and
 * app/reports/index.tsx both resolve to /reports — a route group "(x)" is not
 * part of the URL — and this one was winning, so the 874-line implementation
 * over there could never render. Anything added to it was invisible, including
 * the "Your Credit Reports" list that is the only way to reach /reports/[id].
 *
 * What was here instead: a 348-line screen whose bureau comparison and
 * "Experian_Report_Nov2024.pdf, 2.3 MB" row are hardcoded, shown to a user
 * whose real credit_reports row said something else entirely.
 *
 * A `<Redirect href="/reports" />` shim was tried first — the pattern
 * (tabs)/student-loans.tsx uses — and loops: expo-router resolves that href
 * straight back to this file, and the screen dies with "Maximum update depth
 * exceeded". Verified on a simulator. Re-exporting has no such problem: both
 * routes now render the same component, so which one wins stops mattering.
 */

export { default } from "../reports/index";
