import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        domi: {
          black: "#0F172A",
          dark: "#1E293B",
          yellow: "#F59E0B",
          emerald: "#10B981",
          blue: "#2563EB",
          white: "#FFFFFF",
          bg: "#F8FAFC",
          muted: "#64748B",
        },
        surface: {
          DEFAULT: "#1E293B",
          hover: "rgba(30, 41, 59, 0.95)",
          elevated: "#1E293B",
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(16,185,129,0.15)',
        'glow': '0 0 16px rgba(16,185,129,0.2)',
        'glow-lg': '0 0 24px rgba(16,185,129,0.3)',
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-down': 'slide-down 0.3s ease-out both',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
