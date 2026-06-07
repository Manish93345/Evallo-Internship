/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // We drive theme via the `data-theme` attribute on <html> rather than a
  // `class` toggle. This keeps the existing dark-by-default styling
  // intact and lets us layer light overrides through CSS selectors in
  // `src/index.css`. If we ever want to start using `dark:` variants
  // in components, they'll activate when data-theme is "dark".
  darkMode: ['selector', '[data-theme="dark"]'],
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
