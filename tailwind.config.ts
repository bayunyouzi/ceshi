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
          'glow-indigo': 'var(--theme-glow-indigo)',
          'glow-rose': 'var(--theme-glow-rose)',
          'glow-blend': 'var(--theme-glow-blend)',
          'hero-from': 'var(--theme-hero-from)',
          'hero-to': 'var(--theme-hero-to)',
          'shadow-btn': 'var(--theme-shadow-btn)',
          'scroll-thumb': 'var(--theme-scroll-thumb)',
          'code-bg': 'var(--theme-code-bg)',
          'prompt-positive': 'var(--theme-prompt-positive)',
          'prompt-negative': 'var(--theme-prompt-negative)',
        }
      }
    },
  },
  plugins: [],
};
export default config;
