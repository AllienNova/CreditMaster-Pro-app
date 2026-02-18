/**
 * Fynvita Mobile Theme Constants
 *
 * This file re-exports from the canonical source at src/constants/theme.ts.
 * Import from here OR from src/constants/theme — they resolve to the same module.
 */

export {
  lightTheme,
  darkTheme,
  colors,
  typography,
  withOpacity,
  getScoreColor,
  getScoreLabel,
} from "../src/constants/theme";

export type { Theme, ThemeColors, ThemeShadow } from "../src/types";

// Re-export lightTheme as default for backward compatibility
export { default } from "../src/constants/theme";
