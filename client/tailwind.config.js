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
          primary: '#2563eb',
          'primary-dark': '#1d4ed8',
          accent: '#7c3aed',
          success: '#059669',
          warning: '#f59e0b',
          danger: '#ef4444'
        },
        surface: {
          DEFAULT: '#f5f7fb',
          card: '#ffffff',
          border: '#e3e8f0',
          ink: '#16213a',
          muted: '#5a6580'
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
