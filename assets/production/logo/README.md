# Fynvita Logo System — Production Assets

Official PNG and SVG logo files for the Fynvita brand. These files represent the approved logo system and are ready for deployment across web, mobile, email, and print contexts.

## Brand Colors

The Fynvita logo uses three core brand colors:

- **Vital Green** — `#10B981` (health, growth, vitality)
- **Trust Blue** — `#3B82F6` (intelligence, stability, trust)
- **Deep Navy** — `#1E40AF` (professional, trustworthy)

## Typography

- **Wordmark:** "Fynvita" set in **Inter Bold** (700 weight)

## PNG Files (2K Raster)

| File | Dimensions | Primary Use Cases |
|------|-----------|------------------|
| `fynvita-horizontal.png` | 2816×1536 | Web headers, email signatures, letterheads, landscape layouts |
| `fynvita-vertical.png` | 2048×2048 | Social avatars, marketing posters, splash screens, portrait layouts |
| `fynvita-mark.png` | 2048×2048 | Standalone icon, light backgrounds, PWA icon source, favicon |
| `fynvita-mark-mono-navy.png` | 2048×2048 | Print contexts, single-color applications, watermarks, embossing |
| `fynvita-reversed.png` | 2816×1536 | Dark UI backgrounds, promotional banners, green/dark backgrounds |
| `fynvita-wordmark.png` | 2048×2048 | Letterhead, minimalist contexts, text-only layouts |
| `fynvita-app-icon.png` | 2048×2048 | iOS/Android app icon source (may be scaled down to 1024×1024 for stores) |

## SVG Files (Vector)

| File | Use |
|------|-----|
| `horizontal.svg` | Full lockup (mark + wordmark), primary use |
| `vertical.svg` | Stacked lockup for square contexts |
| `mark.svg` | Icon only — app icons, favicons, small spaces |
| `wordmark.svg` | Text only — headers, minimal contexts |
| `*-reversed.svg` | White-on-dark variants |
| `*-mono.svg` | Single-color variants |

## Raster Assets (Retina/High-DPI)

| File | Use |
|------|-----|
| `favicon.ico` | Multi-layer favicon (16/32/48/64 px) |
| `*@2x.png` | 2× raster for screens (retina) |
| `*@3x.png` | 3× raster for high-DPI |

## Minimum Sizes

Maintain these minimum dimensions when scaling:

- **Full logo** (horizontal/vertical): 120px width minimum
- **Mark only** (icon): 32×32px minimum
- **Wordmark**: 80px width minimum

Scaling below these sizes reduces clarity and legibility.

## Clear Space Rule

Always maintain clear space (padding) around the logo equal to the height of the "F" in Fynvita. This prevents the logo from feeling cramped and ensures proper visual hierarchy.

## Logo Don'ts

Do not:

- Distort, stretch, or squeeze the logo
- Change logo colors outside the approved brand palette
- Add effects (shadows, gradients, glows, outlines, or 3D effects)
- Rotate the logo
- Place the logo on busy or low-contrast backgrounds without proper contrast verification
- Combine with competing logos or branding elements

For detailed logo guidelines, refer to `docs/brand/GUIDELINES.md`.

## Format Notes

- **PNG files:** Raster format (2K resolution, RGB color mode with transparency where applicable). Recommended for web, email, and digital contexts requiring flexibility in sizing.
- **SVG files:** Vector format (infinitely scalable). Recommended for web, print, and contexts requiring crisp edges at any size.

## Regeneration

The PNG production files were generated from the approved logo system specification using:

```bash
npm run assets:gen -- --spec logo-system
```

Raw source files are archived in `assets/raw/logo-system/v*.png` for audit and historical reference. To regenerate all logos from the spec, use the command above.

## Asset Manifest

For detailed metadata (dimensions, file sizes, color information, and regeneration timestamp), see `MANIFEST.json` in this directory.

---

**Last Updated:** April 16, 2026
**Status:** Production Ready
**Brand Version:** 1.0

For complete brand guidelines and usage context, see `docs/brand/GUIDELINES.md`.
