/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      /**
       * Design tokens from ICT304 Assessment 1, Tables 4 and 5.
       *
       * Every value resolves to a CSS custom property declared in
       * src/styles/index.css, so the palette has exactly one definition.
       * Adopting the shadcn/ui convention of semantic token names over raw
       * hex values means a component never hard-codes a colour.
       */
      colors: {
        surface: {
          base: "hsl(var(--surface-base) / <alpha-value>)",
          card: "hsl(var(--surface-card) / <alpha-value>)",
          raised: "hsl(var(--surface-raised) / <alpha-value>)",
          sunken: "hsl(var(--surface-sunken) / <alpha-value>)",
        },
        line: "hsl(var(--line) / <alpha-value>)",
        ink: {
          primary: "hsl(var(--ink-primary) / <alpha-value>)",
          secondary: "hsl(var(--ink-secondary) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          strong: "hsl(var(--brand-strong) / <alpha-value>)",
        },
        metric: {
          temperature: "hsl(var(--metric-temperature) / <alpha-value>)",
          humidity: "hsl(var(--metric-humidity) / <alpha-value>)",
          air: "hsl(var(--metric-air) / <alpha-value>)",
        },
        state: {
          good: "hsl(var(--state-good) / <alpha-value>)",
          warning: "hsl(var(--state-warning) / <alpha-value>)",
          critical: "hsl(var(--state-critical) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Typographic scale from A1 Table 5
        metric: ["32px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700" }],
        page: ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        section: ["18px", { lineHeight: "24px", fontWeight: "600" }],
      },
      borderRadius: { xl: "12px", lg: "8px", md: "6px" },
      keyframes: {
        "fade-in-0": { from: { opacity: "0" }, to: { opacity: "1" } },
        "zoom-in-95": { from: { transform: "scale(0.96)" }, to: { transform: "scale(1)" } },
        "slide-in-right": {
          from: { transform: "translateX(1.5rem)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        pulse: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        shimmer: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-dot": "pulse 2s ease-in-out infinite",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
