# Fynvita Asset Pipeline

Generation pipeline for Fynvita brand assets (logos, icons, illustrations, marketing).

## Directories

### specs/
TOML specs defining what to generate. This is the source-of-truth for all asset specifications and is version controlled.

### raw/
Raster outputs from Gemini API generation. These are gitignored and can be regenerated at any time by running the generation pipeline.

### production/
Optimized vectors and rasters ready for deployment. Post-processed output (via VTracer and Sharp/SVGO) is version controlled for distribution to app directories.

## Commands

- `npm run assets:gen -- <wave>` — generate raster assets via Gemini API
- `npm run assets:vectorize` — convert raster PNGs to SVG via VTracer
- `npm run assets:optimize` — Sharp/SVGO post-processing for optimization
- `npm run assets:wave -- <N>` — run full pipeline for wave N
- `npm run assets:deploy` — copy production assets into app directories

## Documentation

See docs/superpowers/plans/2026-04-16-fynvita-asset-system-regen.md for the full plan.
