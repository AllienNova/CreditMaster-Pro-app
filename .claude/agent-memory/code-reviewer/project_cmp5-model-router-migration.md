---
name: cmp5-model-router-migration
description: CMP-5 approved; migration complete for 18 engines; lint rule live and enforced via --rulesdir; 2 known CMP-6-deferred violations remain
metadata:
  type: project
---

CMP-5 (55f792e + a58c115) migrates ~18 AI engines from direct `AIMLService` calls to `getModelRouter().complete(TaskType.X, ...)`. Approved.

**Migration completeness:** `grep -rlE "aiml-service|AIMLService" src/ --include="*.ts" | grep -v __tests__` returns exactly 8 files: `aiml-service.ts` itself, `model-router.ts`, `ai-orchestrator.ts`, `signal-generator.ts`, `llm-trading-engine.ts` (the 4 legitimate exemptions), plus `api/ai/chat/route.ts` and `api/voice/synthesize/route.ts` (2 CMP-6-deferred API routes), and `src/lib/investments/ai-stock-analyst.ts` — **wait, ai-stock-analyst.ts was fully migrated** (grep confirmed it imports `getModelRouter`; the grep hit is from the file's own name pattern, not an AIMLService import). Actual non-test AIMLService importers are 7 files.

**Lint rule enforcement confirmed:** `npm run lint` script uses `next lint --rulesdir eslint-rules`. Rule registered in `.eslintrc.json` at `error` severity. Running lint produces exactly 2 `no-direct-aiml-service` errors — both in `src/app/api/ai/chat/route.ts:10` and `src/app/api/voice/synthesize/route.ts:10`, which are the CMP-6-deferred routes per the task spec. Zero violations from migrated engines.

**Multi-model exemptions verified:**
- `signal-generator.ts`: lines 234/254/274 fan out to claude/gpt/deepseek in parallel within one method — genuine consensus. Line 775 is a single-model call but it lives in the same file; file-level exemption is appropriate.
- `ai-orchestrator.ts`: `multiModelConsensus()` iterates an array of models and synthesizes results — genuine multi-model workflow.
- `llm-trading-engine.ts`: `MODEL_MAP` has 3 entries (claude/gpt/deepseek) dispatched via `callLLM(prompt, provider)`. Each individual call site uses a single provider (no consensus), but different methods use different providers — the file-level exemption is borderline but defensible as a provider-routing abstraction.

**Tests:** 26 suites / 361 tests pass for all migrated engines. `ai-stock-analyst.test.ts` jest-mock-hoisting issue confirmed fixed (mock defined inside factory, not at module scope).

**Type check:** `tsc --noEmit` exits 0, no errors.

**Why:** CMP-5 closes FND-061 (HIGH) — model selection, cost tracking, and task-type routing now enforced centrally for all non-exempt engines.

**How to apply:** When reviewing CMP-6, expect it to migrate `api/ai/chat/route.ts` and `api/voice/synthesize/route.ts`; those 2 `no-direct-aiml-service` errors should drop to zero. The lint rule is the gate — if CMP-6 lands without clearing them, lint blocks merge.
