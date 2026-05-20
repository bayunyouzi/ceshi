import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        theme: {
          bg: 'var(--theme-bg)',
          'bg-card': 'var(--theme-bg-card)',
          'bg-card-hover': 'var(--theme-bg-card-hover)',
          'bg-input': 'var(--theme-bg-input)',
          'bg-input-hover': 'var(--theme-bg-input-hover)',
          'text-primary': 'var(--theme-text-primary)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-muted': 'var(--theme-text-muted)',
          'text-placeholder': 'var(--theme-text-placeholder)',
          border: 'var(--theme-border)',
          'border-strong': 'var(--theme-border-strong)',
          'border-accent': 'var(--theme-border-accent)',
          overlay: 'var(--theme-overlay)',
          'grid-line': 'var(--theme-grid-line)',
        }
      }
    },
  },
  plugins: [],
};
export default config;
