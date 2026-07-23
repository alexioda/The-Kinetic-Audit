import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-cormorant)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        stone: { 50:'#fafaf9', 100:'#f5f5f4', 200:'#e7e5e4', 300:'#d6d3d1', 400:'#a8a29e', 500:'#78716c', 600:'#57534e', 700:'#44403c', 800:'#292524', 900:'#1c1917', 950:'#0c0a09' },
        gold: { 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706' }
      }
    },
  },
  plugins: [],
};
export default config;
