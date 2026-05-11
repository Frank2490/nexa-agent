import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFBA49",
        secondary: "#20A39E",
        bg: "#FFFFFF",
        surface: "#F7F7F7",
        border: "#E5E5E5",
        text: {
          DEFAULT: "#111111",
          muted: "#888888",
        },
      },
    },
  },
  plugins: [],
};
export default config;
