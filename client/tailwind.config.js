/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // Landing page only: headings and body copy.
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        landing: ['"DM Sans"', 'Inter', 'sans-serif'],
        body: ['"DM Sans"', 'Inter', 'sans-serif'], // dashboard body text
      },
      colors: {
        navy: { DEFAULT: '#070B14', 800: '#0A0F1E' },
        slate: { card: '#131A2B', border: '#232B45' },
        input: { DEFAULT: '#0C1220' },
        muted: '#8B95A7',
        // Logged-in app (dashboard) tokens. Same values as the app theme above (navy / slate / muted / teal-400),
        // so the dashboard matches login and landing. Change a colour here to retheme the dashboard only.
        dash: {
          bg: '#070B14', // = navy
          card: '#131A2B', // = slate.card
          inset: '#0A0F1E', // = navy.800: sidebar and nested cards
          border: '#232B45', // = slate.border
          track: '#1C2438', // progress bar track
          text: '#F5F7FA',
          muted: '#8B95A7', // = muted
          teal: '#2DD4BF', // = teal-400
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(45,212,191,0.25)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #2DD4BF 0%, #3B82F6 100%)',
        'dash-gradient': 'linear-gradient(90deg, #2DD4BF 0%, #3B82F6 100%)',
        'dash-bar': 'linear-gradient(135deg, #2DD4BF 0%, #3B82F6 100%)', // chart bars: teal top-left to blue bottom-right
        // Soft blue-teal glow across the top of a section, fading into the page background.
        'hero-glow': `radial-gradient(ellipse 70% 70% at 50% 0%, rgba(45,212,191,0.16) 0%, rgba(59,130,246,0.10) 40%, rgba(7,11,20,0) 75%)`,
        'cta-glow': `linear-gradient(180deg, rgba(45,212,191,0.14) 0%, rgba(59,130,246,0.06) 35%, rgba(10,15,30,0) 100%)`,
        'left-panel': `radial-gradient(ellipse 80% 60% at 20% 30%, rgba(20,120,110,0.35) 0%, rgba(10,20,35,0) 60%),
                       linear-gradient(160deg, #0B2A28 0%, #0A1626 45%, #070B14 100%)`,
      },
    },
  },
  plugins: [],
};