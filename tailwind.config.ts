import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        teal: {
          950: '#050f10',
          900: '#0B2428',
          800: '#113338',
          700: '#1A4D53',
          600: '#236068',
          500: '#2D7A84',
          400: '#3E9AA6',
          300: '#62B8C2',
          200: '#A0D8DE',
          100: '#D6F0F3',
          50:  '#EEF9FA',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#F0D080',
          dark: '#9A7A2A',
        },
      },
      fontFamily: {
        display: ['Lalezar', 'Oi', 'serif'],
        'display-en': ['Oi', 'serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        ruqaa: ['Aref Ruqaa Ink', 'serif'],
        body: ['Open Sans', 'IBM Plex Sans Arabic', 'sans-serif'],
        sans: ['Open Sans', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.35s ease-out forwards',
        'scale-in': 'scale-in 0.25s ease-out forwards',
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(135deg, #0B2428 0%, #1A4D53 50%, #2D7A84 100%)',
        'teal-gradient-light': 'linear-gradient(135deg, #EEF9FA 0%, #D6F0F3 100%)',
        'gold-gradient': 'linear-gradient(90deg, #C9A84C, #F0D080)',
      },
      boxShadow: {
        teal: '0 4px 24px -4px rgba(26,77,83,0.4)',
        'teal-lg': '0 8px 40px -6px rgba(11,36,40,0.6)',
        'teal-glow': '0 0 20px rgba(62,154,166,0.35)',
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
