/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Emare design tokens — mirrors ThemeContext so Tailwind utilities
      // and inline token styles stay visually identical.
      colors: {
        brand: {
          primary: '#15803d',
          'primary-dark': '#166534',
          'primary-light': '#22c55e',
          accent: '#16a34a',
          success: '#15803d',
          warning: '#f59e0b',
          danger: '#ef4444'
        },
        surface: {
          DEFAULT: '#f6f8f7',
          card: '#ffffff',
          border: '#e2e8e5',
          ink: '#14201a',
          muted: '#57655d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        card: '16px',
        control: '12px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.05), 0 10px 30px -8px rgba(16,24,40,0.16)',
        'card-sm': '0 1px 3px rgba(16,24,40,0.08)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
