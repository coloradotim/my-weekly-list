import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2f302b",
        paper: "#fffaf2",
        meadow: "#4d7c5a",
        mist: "#d8e7ef",
        clay: "#b86f52",
      },
      boxShadow: {
        soft: "0 18px 55px rgba(74, 57, 43, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
