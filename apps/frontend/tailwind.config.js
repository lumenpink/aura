/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: '#fafafa',
          850: '#202023',
        },
        aura: {
          violet: '#8b5cf6',
          pink: '#ec4899',
          platinum: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['"Geist Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


