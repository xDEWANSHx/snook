/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        snooker: {
          bg: "#FAF8F5",
          bgDark: "#F4F1EA",
          bgCard: "#FFFFFF",
          felt: "#0f4c3a",
          feltDark: "#0a3427",
          feltLight: "#166534",
          gold: "#D4AF37",
          goldLight: "#F3E5AB",
          ballRed: "#DC2626",
          ballYellow: "#EAB308",
          ballGreen: "#16A34A",
          ballBrown: "#854D0E",
          ballBlue: "#2563EB",
          ballPink: "#EC4899",
          ballBlack: "#0F172A",
        },
      },
      boxShadow: {
        'ball': 'inset -4px -4px 10px rgba(0,0,0,0.5), inset 4px 4px 10px rgba(255,255,255,0.4), 0 6px 12px rgba(0,0,0,0.25)',
        'ball-active': 'inset -3px -3px 8px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,255,255,0.5), 0 2px 5px rgba(0,0,0,0.3)',
        'card-glow': '0 0 0 2px #0f4c3a, 0 10px 25px -5px rgba(15, 76, 58, 0.25)',
        'card-glow-active': '0 0 0 3px #16A34A, 0 12px 30px -4px rgba(22, 163, 74, 0.35)',
        'tactile': '0 4px 0 rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.08)',
        'tactile-pressed': '0 1px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
