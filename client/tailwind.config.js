/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-fg) / <alpha-value>)',
          50:  'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          500: 'rgb(var(--primary) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
        },
        sidebar: {
          bg:     'rgb(var(--sidebar-bg) / <alpha-value>)',
          text:   'rgb(var(--sidebar-text) / <alpha-value>)',
          hover:  'rgb(var(--sidebar-hover) / <alpha-value>)',
          active: 'rgb(var(--sidebar-active) / <alpha-value>)',
        },
        header: 'rgb(var(--header-bg) / <alpha-value>)',
        page: '#F4F6FA',
        card: '#FFFFFF',
        border: '#E2E8F0',
        success: '#22C55E',
        warning: '#F59E0B',
        info: '#3B82F6',
        lube: '#C2762A'
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Sora', 'sans-serif']
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: []
};
