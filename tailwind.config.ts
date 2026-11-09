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
        // ── Brand ──────────────────────────────────────────────
        'flame':          '#FF5F15',
        'flame-light':    '#FF7A3D',
        'flame-dim':      'rgba(255,95,21,0.15)',

        // Legacy aliases (keep for compatibility)
        'safety-orange':  '#FF5F15',
        'blueprint-blue': '#080D18',
        'success-green':  '#10B981',
        'warning-amber':  '#F59E0B',
        'fail-red':       '#EF4444',

        // ── Dark surfaces ───────────────────────────────────────
        'void':     '#05080F',   // deepest bg
        'surface':  '#07101C',   // page bg
        'panel':    '#0E1727',   // card bg
        'raised':   '#162133',   // elevated card
        'hover':    '#1C2940',   // hover state
        'rim':      '#475569',   // prominent border

        // ── Accent ─────────────────────────────────────────────
        'electric': '#38BDF8',   // sky blue accent
        'plasma':   '#A78BFA',   // purple accent (optional)

        // ── Text ───────────────────────────────────────────────
        'ink':      '#FFFFFF',   // primary text
        'muted':    '#D1D5DB',   // secondary text
        'subtle':   '#94A3B8',   // tertiary / disabled
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      backgroundImage: {
        'dot-grid':   'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        'line-grid':  'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'flame-glow': 'radial-gradient(ellipse at center, rgba(255,95,21,0.2) 0%, transparent 70%)',
        'hero-glow':  'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,95,21,0.15) 0%, transparent 60%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
      },

      backgroundSize: {
        'dot-sm':   '20px 20px',
        'dot-md':   '32px 32px',
        'line-sm':  '40px 40px',
      },

      boxShadow: {
        'flame':    '0 0 40px rgba(255,95,21,0.25), 0 0 80px rgba(255,95,21,0.1)',
        'flame-sm': '0 0 20px rgba(255,95,21,0.2)',
        'glow-sm':  '0 0 0 1px rgba(255,255,255,0.06)',
        'card':     '0 1px 1px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.4)',
        'card-lg':  '0 2px 4px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.5)',
        'inset-top':'inset 0 1px 0 rgba(255,255,255,0.07)',
      },

      animation: {
        'ring-fill':   'ring-fill 1s ease-in-out forwards',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':    'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':     'fadeIn 0.3s ease-out',
        'shimmer':     'shimmer 2.5s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'scan':        'scan 3s linear infinite',
      },

      keyframes: {
        'ring-fill': {
          from: { 'stroke-dashoffset': '251' },
          to:   { 'stroke-dashoffset': 'var(--dash-offset)' },
        },
        slideUp: {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },

      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
        'xl4': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
