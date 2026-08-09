# Image Generation — MUST use Nano Banana (Gemini)

**Hard rule:** ALL image generation in Fynvita uses Nano Banana via the Gemini API. No exceptions.

## Forbidden generators
- Imagen 4 (Google) — do NOT use
- DALL-E (any version) — do NOT use
- Midjourney — do NOT use
- Flux — do NOT use
- Stable Diffusion — do NOT use

## Why
This is a deliberate engine choice for the Fynvita asset pipeline. Mixed-engine output destroys visual consistency across the brand and breaks downstream optimization assumptions (color profile, palette, prompt-style fingerprint).

## API key location
Stored in `~/.claude/projects/-Users-kimalhonourdjam/memory/fynvita-gemini-key.md`. Never commit the key to the repo.

## Scope
This applies to:
- All `scripts/assets/*` code
- All runtime image generation
- All design/preview/prototype generation
- All test fixtures using generated images

If you find an existing reference to a forbidden generator anywhere in the codebase, replace it with the Nano Banana path. Note the replacement in the PR.

## Reference
See user memory: `fynvita-image-gen-engine.md` for the full reasoning.
