import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sudanese cultural palette
        sand: {
          50:  '#fdf8f0',
          100: '#faefd8',
          200: '#f4ddb0',
          300: '#ecc680',
          400: '#e2aa4e',
          500: '#d4922d',
          600: '#b87424',
          700: '#8f5420',
          800: '#6b3d1e',
          900: '#4d2c16',
        },
        nile: {
          50:  '#eff8ff',
          100: '#dbeffe',
          200: '#bce1fd',
          300: '#8ecdfc',
          400: '#59b3f8',
          500: '#2f94f3',
          600: '#1a75e8',
          700: '#155ed5',
          800: '#174dad',
          900: '#184287',
        },
        sahara: {
          50:  '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6ba77',
          400: '#f1933f',
          500: '#ed751a',
          600: '#de5d10',
          700: '#b8460f',
          800: '#933814',
          900: '#762f14',
        },
        acacia: {
          50:  '#f3faf0',
          100: '#e4f4de',
          200: '#c9e8bf',
          300: '#a0d696',
          400: '#70bc66',
          500: '#4ea146',
          600: '#3a8234',
          700: '#30672c',
          800: '#285226',
          900: '#214422',
        },
        khartoum: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'Cairo', 'Amiri', 'sans-serif'],
        latin: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'pattern-arabesque': "url('/assets/arabesque-pattern.svg')",
        'gradient-heritage': 'linear-gradient(135deg, #d4922d 0%, #8f5420 50%, #4d2c16 100%)',
        'gradient-nile': 'linear-gradient(135deg, #155ed5 0%, #1a75e8 50%, #59b3f8 100%)',
        'gradient-desert': 'linear-gradient(135deg, #fdf8f0 0%, #faefd8 50%, #f4ddb0 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-rtl': 'slideInRTL 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRTL: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'heritage': '0 4px 20px -2px rgba(212, 146, 45, 0.3)',
        'nile': '0 4px 20px -2px rgba(21, 94, 213, 0.3)',
        'card': '0 2px 15px -3px rgba(0, 0, 0, 0.1), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
