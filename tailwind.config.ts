import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* ─── Typography ─── */
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        /* Major Third scale (1.25) anchored at 16px */
        xs: [
          "0.64rem",
          { lineHeight: "1.5" },
        ] /* 10.24px — badges, fine print */,
        sm: ["0.8rem", { lineHeight: "1.5" }] /* 12.8px  — captions, labels */,
        base: ["1rem", { lineHeight: "1.5" }] /* 16px    — body */,
        md: ["1.25rem", { lineHeight: "1.4" }] /* 20px    — card titles */,
        lg: ["1.563rem", { lineHeight: "1.3" }] /* 25px    — h3 */,
        xl: ["1.953rem", { lineHeight: "1.25" }] /* 31.25px — h2 */,
        "2xl": ["2.441rem", { lineHeight: "1.2" }] /* 39px    — h1 */,
        "3xl": [
          "3.052rem",
          { lineHeight: "1.15" },
        ] /* 48.8px  — hero display */,
        "4xl": ["3.815rem", { lineHeight: "1.1" }] /* 61px    — hero xl */,
        "5xl": ["4.768rem", { lineHeight: "1.05" }] /* 76.3px  — hero 2xl */,
      },

      /* ─── Semantic Colors (HSL CSS variables) ─── */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /* ─── Fynvita Brand Colors ─── */
        "vital-green": {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        "trust-blue": {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        surface: {
          light: "#ffffff",
          dark: "#1e293b",
        },
        "surface-elevated": {
          light: "#f8fafc",
          dark: "#334155",
        },
      },

      /* ─── Border Radius Scale ─── */
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },

      /* ─── Elevation (Shadows) ─── */
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "card-hover":
          "0 8px 16px -4px rgb(0 0 0 / 0.12), 0 4px 6px -2px rgb(0 0 0 / 0.08)",
        float:
          "0 16px 32px -8px rgb(0 0 0 / 0.16), 0 6px 12px -4px rgb(0 0 0 / 0.08)",
      },

      /* ─── Background Gradients ─── */
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, #10b981, #3b82f6)",
        "gradient-brand-hover": "linear-gradient(135deg, #059669, #2563eb)",
      },

      /* ─── Motion ─── */
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-in-out-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        instant: "50ms",
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },

      /* ─── Animations ─── */
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0, 0, 0.2, 1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0, 0, 0.2, 1)",
        "slide-down": "slideDown 0.3s cubic-bezier(0, 0, 0.2, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scale-in": "scaleIn 0.25s cubic-bezier(0, 0, 0.2, 1)",
        float: "float 6s ease-in-out infinite",
        "float-slow": "floatSlow 8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
