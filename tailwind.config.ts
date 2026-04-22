import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E2A35",
          50: "#E8EEF0",
          100: "#C6D4D9",
          500: "#1E4553",
          900: "#0B1F27",
        },
        brand: {
          DEFAULT: "#0E2A35",
          accent: "#E4B43C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(14,42,53,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
