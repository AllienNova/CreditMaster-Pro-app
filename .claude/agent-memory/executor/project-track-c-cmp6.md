---
name: track-c-cmp6-shipping-pattern
description: CMP-6 done (commit 7ea417c); client model removal in ai/chat + TTS model whitelist in voice/synthesize + lint-exempt pattern
metadata:
  type: project
---

CMP-6 fully done — commit `7ea417c` on `remediation/wave-7-foundation`.

**Why:** FND-059 (ai/chat accepted client-supplied model string — arbitrary cost burn) and FND-060 (voice/synthesize accepted unbounded TTS model string).

**How to apply:** Reference for Phase 5 compliance/AI hygiene task completions.

## ai/chat route (FND-059)

- Removed `model` from destructured request body; body now only reads `messages`, `temperature`, `max_tokens`
- Replaced `getAIMLService().chat(model, messages, options)` with `getModelRouter().complete(TaskType.GENERAL_CHAT, messages, options)`
- Import changed: `@/lib/aiml-service` → `@/lib/model-router` (+ type-only `ChatMessage` from `@/lib/aiml-service`)
- `deductCredits` model arg now uses `response.model` (server-selected, not client-supplied)
- Error message simplified: "Missing required field: messages" (model no longer required)
- This clears one of the 2 `no-direct-aiml-service` lint violations on API routes

## voice/synthesize route (FND-060)

- Added `const VALID_TTS_MODELS = ["tts-1", "tts-1-hd"] as const` and `type TTSModel = (typeof VALID_TTS_MODELS)[number]`
- Validation block: rejects non-whitelisted model with 400 `{ error: "Invalid model. Must be one of: tts-1, tts-1-hd" }`
- Kept `getAIMLService()` import — this is audio.speech (TTS), not chat completions; no `ModelRouter.complete()` path exists for speech
- Added `/src/app/api/voice/synthesize/route.ts` to `EXEMPT_SUFFIXES` in `eslint-rules/no-direct-aiml-service.js` with comment: "CMP-6 exemption: voice/synthesize uses audio.speech (TTS), not chat completions. ModelRouter.complete() is chat-only; there is no speech execution path in ModelRouter."

## Mock pattern for tests with resetMocks:true

The jest config has `resetMocks: true` + `clearMocks: true` + `restoreMocks: true` — this wipes `jest.fn()` implementations between each test, including implementations set inside `jest.mock(...)` factory functions.

Two fixes required:
1. **Lambda wrapper (not jest.fn) in factory** — `getModelRouter: () => ({ complete: (...args: unknown[]) => mockModelRouterComplete(...args) })`. The outer arrow function is a plain function (not jest.fn), so resetMocks leaves it alone. It always delegates to the current `mockModelRouterComplete`.
2. **Re-apply mock implementations in beforeEach** — named top-level mocks (`const mockCheckSufficientCredits = jest.fn()`) need `.mockResolvedValue(true)` re-applied in `beforeEach` because `resetMocks` clears them.

## MockNextResponse pattern for new NextResponse(buffer, ...) in jest

`new NextResponse(buffer, { status, headers })` fails in jest because `next/server` resolves to a CommonJS bundle where NextResponse is not a proper constructor. Pattern from `src/app/api/financial/export/__tests__/route.test.ts`:

```typescript
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  function MockNextResponse(_body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return { status: init?.status ?? 200, headers: new Headers(init?.headers) };
  }
  MockNextResponse.json = mockJsonStatic; // top-level jest.fn(), re-applied in beforeEach
  return { ...actual, NextResponse: MockNextResponse };
});
```

## Test results

- ai/chat: 6/6 green (tests: ignores client model, routes via ModelRouter with GENERAL_CHAT, 402 on insufficient credits, etc.)
- voice/synthesize: 6/6 green (tests: 401 negative-auth ×2, reject non-whitelisted model, accept tts-1, accept tts-1-hd, default tts-1-hd)
- Full suite: 16,088 passing, 0 failures (baseline 16,080 — net +8 from 12 new tests minus accounting)
- type-check: 0 errors
- lint: 0 errors, 0 `no-direct-aiml-service` violations
