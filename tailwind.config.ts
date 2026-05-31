import type { Config } from "tailwindcss";

const themeColor = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: themeColor("--color-ink"),
        paper: themeColor("--color-paper"),
        meadow: themeColor("--color-meadow"),
        mist: themeColor("--color-mist"),
        clay: themeColor("--color-clay"),
        surface: themeColor("--color-surface"),
        elevated: themeColor("--color-elevated"),
        line: themeColor("--color-line"),
        "line-soft": themeColor("--color-line-soft"),
        secondary: themeColor("--color-secondary"),
        muted: themeColor("--color-muted"),
        disabled: themeColor("--color-disabled"),
        "planned-ring": themeColor("--color-planned-ring"),
        "planned-fill": themeColor("--color-planned-fill"),
        skipped: themeColor("--color-skipped"),
        "skipped-fill": themeColor("--color-skipped-fill"),
      },
      boxShadow: {
        soft: "0 18px 55px rgb(var(--color-shadow-soft) / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
