/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde7ff',
          200: '#c3d3ff',
          300: '#9db5ff',
          400: '#748dff',
          500: '#5065f8',
          600: '#3d4eee',
          700: '#3139d4',
          800: '#2a31aa',
          900: '#283087',
          950: '#1a1d52',
        },
        dark: {
          900: '#0a0b14',
          800: '#10121f',
          700: '#161829',
          600: '#1e2035',
          500: '#252844',
          400: '#2e3252',
        },
        accent: {
          purple: '#8b5cf6',
          cyan:   '#06b6d4',
          green:  '#10b981',
          amber:  '#f59e0b',
          red:    '#ef4444',
          pink:   '#ec4899',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
