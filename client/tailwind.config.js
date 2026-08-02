/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        navy: { DEFAULT: '#070B14', 800: '#0A0F1E' },
        slate: { card: '#131A2B', border: '#232B45' },
        input: { DEFAULT: '#0C1220' },
        muted: '#8B95A7',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(45,212,191,0.25)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #2DD4BF 0%, #3B82F6 100%)',
        'left-panel': `radial-gradient(ellipse 80% 60% at 20% 30%, rgba(20,120,110,0.35) 0%, rgba(10,20,35,0) 60%),
                       linear-gradient(160deg, #0B2A28 0%, #0A1626 45%, #070B14 100%)`,
      },
    },
  },
  plugins: [],
};