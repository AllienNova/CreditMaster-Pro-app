---
name: cmp6-chat-voice-model-lock
description: CMP-6 approved; ai/chat client model ignored, voice whitelist enforced; one LOW gap (voice test missing not-called assertion on rejected path)
metadata:
  type: project
---

Commit 7ea417c approved. FND-059 (ai/chat client model) and FND-060 (voice TTS whitelist) both correctly fixed.

**Key facts:**
- `ai/chat/route.ts`: `model` is not destructured from body; all completions go via `getModelRouter().complete(TaskType.GENERAL_CHAT, ...)`. Credit deduction passes `response.model` (server-selected). `withAuth` intact.
- `voice/synthesize/route.ts`: `VALID_TTS_MODELS = ['tts-1', 'tts-1-hd']` checked at line 49, BEFORE the `getAIMLService()` call at line 75. `withAuth` intact. Default is `tts-1-hd`.
- Lint rule exemption is legitimate: `ModelRouter.complete()` calls only `aiml.chat()` (line 478) — no `generateSpeech` / `audio.speech` path exists in ModelRouter. `VOICE_SYNTHESIS` is in the taskType enum and modelMap but has no `complete()` execution branch.
- `ai/chat` correctly NOT in exempt list.

**LOW gap (not blocking):** voice test "rejects a non-whitelisted model" doesn't assert `expect(mockGenerateSpeech).not.toHaveBeenCalled()`. The guard fires at line 49 before line 75 so it can't reach the service call — but the negative assertion would document the cost boundary explicitly.

**Why:** Cost-control hardening. ModelRouter.complete is chat-completion-only; audio.speech TTS is a distinct API call that cannot be routed through it without adding a new execution method.

**How to apply:** When reviewing future voice/TTS changes, verify whitelist check position (must be before service instantiation). If ModelRouter ever gains a `generateSpeech` method, the voice route exemption should be removed and the route migrated.
