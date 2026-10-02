/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arctic: {
          bg: '#F3F8FC',
          surface: '#FFFFFF',
          'surface-glass': 'rgba(255, 255, 255, 0.78)',
          'surface-card': 'rgba(255, 255, 255, 0.90)',
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          'soft-blue': '#60A5FA',
          cyan: '#06B6D4',
          'text-main': '#0F172A',
          'text-secondary': '#475569',
          'text-muted': '#94A3B8',
          border: '#DCE8F2',
          'border-light': 'rgba(220, 232, 242, 0.7)',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'arctic-sm': '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'arctic-card': '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'arctic-dropdown': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'arctic-glow': '0 0 20px -4px rgba(37, 99, 235, 0.25)',
      },
      backdropBlur: {
        'arctic': '12px',
        'arctic-heavy': '20px',
      }
    },
  },
  plugins: [],
};
