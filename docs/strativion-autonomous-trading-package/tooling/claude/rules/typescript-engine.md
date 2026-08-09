---
paths:
  - "implementations/pctt/engine/**/*.ts"
  - "implementations/pctt/engine/**/*.tsx"
---

# TypeScript PCTT Engine Rules (Strativion PCTT Platform)

## CRITICAL INVARIANT: Non-Repainting Guarantee
- Pipeline stages MUST NOT access data beyond the current bar index. This is the single most important rule.
- Every stage function receives a bounded data window. Accessing future bars is a fatal defect.
- Boundary re-estimation protocol: freeze trendline boundaries between pivot confirmations. Never recalculate mid-bar.
- Any PR that breaks the non-repainting guarantee is rejected regardless of other merits.

## Strict TypeScript
- `strict: true` in tsconfig. No exceptions.
- No `any` type anywhere. Use `unknown` with type guards when the type is genuinely uncertain.
- No `@ts-ignore` or `@ts-expect-error` directives.
- Use `readonly` on all fields that should not mutate after construction.

## Pipeline Stage Architecture
- All 12 pipeline stages are pure functions: `(input: StageInput) => StageOutput`. No side effects, no external state.
- Each stage receives only the data it needs. No global state, no singletons, no module-level mutable variables.
- Reference `SSOT-PCTT-XX` tags in JSDoc comments on every pipeline stage function.
- Export types separately from implementations: `export type { StageInput, StageOutput }` on dedicated lines.

## Type Definitions
- Interface definitions for ALL data shapes. No anonymous object types (`{ foo: string, bar: number }`).
- Discriminated unions for variant types (e.g., `type Signal = BuySignal | SellSignal | HoldSignal`).
- Use `as const` for literal objects that define configuration or lookup tables.
- Enums: prefer string literal unions over TypeScript `enum` keyword.

## Testing
- Use Vitest with `describe`/`it` blocks for all tests.
- Test every stage with known-answer vectors from the SSOT specification.
- Non-repainting regression suite: feed historical bars one at a time, verify signals match batch processing exactly.
- Edge case coverage: gaps, halt/resume, thin liquidity, single-bar data, empty input arrays.

## Package and Build
- Package name: `@strativion/pctt-engine`.
- No default exports. Use named exports exclusively.
- Barrel files (`index.ts`) at each module boundary for clean public API.
- Tree-shakeable output: avoid side effects in module scope.
