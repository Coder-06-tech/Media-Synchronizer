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
          red: '#0056b3',
          neon: '#0056b3',
          bg: '#FFFFFF',
          dark: '#002b5c',
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
