/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stranger: {
          red: '#E50914',
          neon: '#ff003c',
          bg: '#0a0a0c',
          dark: '#141414',
        }
      },
      fontFamily: {
        'orbitron': ['"Orbitron"', 'sans-serif'],
        'outfit': ['"Outfit"', 'sans-serif'],
        'retro': ['"Orbitron"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
