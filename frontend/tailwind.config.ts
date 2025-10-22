import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      boxShadow: {
        glow: "0 20px 60px -25px hsla(var(--shadow-soft))",
        elevated: "0 10px 35px -15px hsla(var(--shadow-soft))",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 20% 20%, hsla(var(--primary),0.15), transparent 55%), radial-gradient(circle at 80% 0%, hsla(var(--accent),0.18), transparent 55%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        wave: {
          "0%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
          "100%": { transform: "scaleY(0.3)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        wave: "wave 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
