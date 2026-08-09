---
name: asset-generation
description: "Generate, optimize, and deploy visual assets via the Nano Banana pipeline."
lead: asset-pipeline-engineer
agents: [asset-pipeline-engineer, a11y-implementer]
---

# Asset Generation Team

## Mission
Produce optimized, accessible image assets for web + mobile + marketing — using only Nano Banana (Gemini).

## Workflow
1. **asset-pipeline-engineer** reads the prompt manifest, generates via Nano Banana
2. Auto-optimize: `npm run assets:optimize` then vectorize where appropriate
3. For app-level: `npm run assets:derive-icons` + `npm run assets:derive-splash`
4. **a11y-implementer** verifies:
   - Alt text written + meaningful (not "image1.png")
   - Dimensions in metadata
   - Sufficient contrast where used as background
   - No flashing / strobing content
5. Deploy: `npm run assets:deploy` (S3)

## Absolute constraint
**Nano Banana (Gemini) only.** No Imagen, DALL-E, Midjourney, Flux, Stable Diffusion. Replace any existing references found.

## Exit criteria
- Assets generated + optimized + vectorized as needed
- Metadata (alt + dims + license) attached
- Deployed to S3
- Existing forbidden-generator references replaced (if found)

## Hard rules
- API key never enters the repo
- No raster > 200KB ships without vectorization or resize
- One commit per asset batch with clear scope ("hero-image: financial wellness illustrations")
- Reference: `~/.claude/projects/-Users-kimalhonourdjam/memory/fynvita-gemini-key.md`
