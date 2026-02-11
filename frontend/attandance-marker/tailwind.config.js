/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'light-orange': {
          50: '#FFF8F0',
          100: '#FFEED6',
          200: '#FFDCAD',
          300: '#FFC884',
          400: '#FFB45B',
          500: '#FF9500',
          600: '#FF8500',
          700: '#E67300',
          800: '#CC6600',
          900: '#B35900',
        },
        cream: {
          50: '#FFF8F0',
          100: '#FFF5E6',
          200: '#FFEED6',
          300: '#FFE6C6',
          400: '#FFDEB6',
          500: '#FFD6A6',
          600: '#E6C195',
          700: '#CCAD84',
          800: '#B39973',
          900: '#998562',
        },
      },
    },
  },
  plugins: [],
}
  