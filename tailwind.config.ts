import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B1220',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
          500: '#4B5563',
          400: '#6B7280',
          300: '#9CA3AF',
          200: '#D1D5DB',
          100: '#E5E7EB',
          50: '#F3F4F6',
        },
        primary: {
          600: '#5D5FEF',
          500: '#6366F1',
          400: '#818CF8',
        },
        success: {
          500: '#10B981',
        },
        danger: {
          500: '#EF4444',
        },
        warning: {
          500: '#F59E0B',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config
