/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-primary-light-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-primary-light-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-primary-mid-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-primary-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-primary-darker-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-primary-darker-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-primary-darker-rgb) / <alpha-value>)',
        },
        dark: {
          50: 'rgb(var(--color-bg-card-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-bg-card-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-bg-mid-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-family)'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
