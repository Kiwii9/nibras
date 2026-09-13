import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand primitives (emerald-teal family)
        emerald: {
          950:'#050F10', 900:'#0B2428', 800:'#113338', 700:'#1A4D53',
          600:'#236068', 500:'#2D7A84', 400:'#3E9AA6', 300:'#62B8C2',
          200:'#A0D8DE', 100:'#D6F0F3', 50:'#EEF9FA',
        },
        gold:   { DEFAULT:'#C9A84C', light:'#F0D080', dark:'#9A7A2A' },
        violet: { DEFAULT:'#6D5EF8', 400:'#8F7BFA', foreground:'#FFFFFF' },

        // Semantic aliases — CSS variable backed
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        surface:     'var(--surface)',
        card:        { DEFAULT:'var(--card)', foreground:'var(--card-foreground)' },
        popover:     { DEFAULT:'var(--popover)', foreground:'var(--popover-foreground)' },
        primary:     { DEFAULT:'var(--primary)', foreground:'var(--primary-foreground)' },
        secondary:   { DEFAULT:'var(--secondary)', foreground:'var(--secondary-foreground)' },
        accent:      { DEFAULT:'var(--accent)', foreground:'var(--accent-foreground)' },
        muted:       { DEFAULT:'var(--muted)', foreground:'var(--muted-foreground)' },
        border:      'var(--border)',
        input:       'var(--input)',
        ring:        'var(--ring)',
        destructive: { DEFAULT:'var(--destructive)', foreground:'var(--destructive-foreground)' },
      },
      fontFamily: {
        'display':  ['"Reem Kufi"', 'sans-serif'],
        'ar-ui':    ['"IBM Plex Sans Arabic"', 'sans-serif'],
        sans:       ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', 'sans-serif'],
        mono:       ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm:'6px', md:'10px', DEFAULT:'10px', lg:'16px', xl:'22px',
        '2xl':'22px', '3xl':'22px', full:'999px',
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        DEFAULT:'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
    },
  },
  plugins: [],
} satisfies Config
