---
name: cmp4-model-router-execution
description: CMP-4 approved; ModelRouter.complete() uses lazy dynamic import to avoid AIMLService constructor throw on missing AIML_API_KEY at module load
metadata:
  type: project
---

CMP-4 (da6f8a5) adds `ModelRouter.complete(taskType, messages, options?)` — approved, no changes required.

**Key design fact:** `AIMLService` constructor throws immediately if `AIML_API_KEY` is absent. `model-router.ts` uses `import type` at the top (erased at emit) and a lazy `await import("./aiml-service")` inside `complete()` so the module is import-safe. Constructor injection (for tests) bypasses lazy construction entirely.

**Why:** If the dynamic import were hoisted to a static value import, every importer of `model-router.ts` in test/CI environments without the env var would throw at module-eval time.

**How to apply:** CMP-5 migrates ~20 engine callers to `ModelRouter.complete()` — confirm each caller drops its direct `AIMLService` construction and passes a `TaskType`, not a raw model string. Multi-model consensus callers (signal-generator, ai-orchestrator.multiModelConsensus) are intentionally exempt from CMP-5.
