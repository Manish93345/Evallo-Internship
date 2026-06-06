/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f1ff',
          100: '#ebe5ff',
          200: '#d9ceff',
          300: '#bda7ff',
          400: '#9b78ff',
          500: '#7c5cff',
          600: '#6a3df5',
          700: '#5a2de0',
          800: '#4a26b5',
          900: '#3e2392',
        },
      },
    },
  },
  plugins: [],
};
