/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: 'rgb(var(--mp-bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--mp-surface-rgb) / <alpha-value>)',
        teal: {
          deep: 'rgb(var(--mp-teal-deep-rgb) / <alpha-value>)',
          forest: 'rgb(var(--mp-teal-forest-rgb) / <alpha-value>)',
          mist: 'rgb(var(--mp-teal-mist-rgb) / <alpha-value>)',
        },
        champagne: {
          DEFAULT: 'rgb(var(--mp-champagne-rgb) / <alpha-value>)',
          soft: 'rgb(var(--mp-champagne-soft-rgb) / <alpha-value>)',
          border: 'rgb(var(--mp-border-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--mp-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--mp-text-rgb) / <alpha-value>)',
          stone: 'rgb(var(--mp-text-rgb) / <alpha-value>)',
        },
        emergency: {
          DEFAULT: 'rgb(var(--mp-emergency-rgb) / <alpha-value>)',
          soft: 'rgb(var(--mp-emergency-soft-rgb) / <alpha-value>)',
        },
        architectural: 'rgb(var(--mp-architectural-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Manrope"', '"Noto Sans Tamil"', 'sans-serif'],
        sans: ['"Inter"', '"Noto Sans Tamil"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        architectural: '6px',
      },
      maxWidth: {
        editorial: '1320px',
      },
    },
  },
  plugins: [],
};
