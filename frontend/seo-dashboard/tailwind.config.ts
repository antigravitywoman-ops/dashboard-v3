import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border:        'hsl(var(--border))',
        input:         'hsl(var(--input))',
        ring:          'hsl(var(--ring))',
        background:    'hsl(var(--background))',
        foreground:    'hsl(var(--foreground))',
        primary: {
          DEFAULT:      'hsl(var(--primary))',
          foreground:   'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:      'hsl(var(--secondary))',
          foreground:   'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:      'hsl(var(--destructive))',
          foreground:   'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:      'hsl(var(--muted))',
          foreground:   'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:      'hsl(var(--accent))',
          foreground:   'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:      'hsl(var(--card))',
          foreground:   'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:      'hsl(var(--popover))',
          foreground:   'hsl(var(--popover-foreground))',
        },

        // OpenClaw design tokens
        oc: {
          bg: {
            primary:   '#0A0A0B',
            surface:   '#111113',
            card:      '#18181B',
            elevated:  '#222225',
            hover:     '#27272A',
          },
          border: {
            subtle:    '#27272A',
            DEFAULT:   '#3F3F46',
            strong:    '#52525B',
          },
          text: {
            primary:   '#FAFAFA',
            secondary: '#A1A1AA',
            muted:     '#71717A',
            disabled:  '#52525B',
          },
          accent: {
            purple:       '#A78BFA',
            'purple-dim': '#7C3AED',
            teal:         '#2DD4BF',
          },
          status: {
            success: '#22C55E',
            warning: '#F59E0B',
            error:   '#EF4444',
            info:    '#3B82F6',
            purple:  '#A78BFA',
            teal:    '#2DD4BF',
          },
        },
      },

      borderRadius: {
        sm:   '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl': '20px',
        full: '9999px',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'Fira Code', 'monospace'],
      },

      boxShadow: {
        'sm':   '0 1px 2px rgba(0,0,0,0.4)',
        'md':   '0 4px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
        'lg':   '0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.3)',
        'xl':   '0 20px 25px rgba(0,0,0,0.4), 0 8px 10px rgba(0,0,0,0.3)',
        'glow':         '0 0 24px rgba(167, 139, 250, 0.25)',
        'glow-sm':      '0 0 12px rgba(167, 139, 250, 0.25)',
        'glow-teal':    '0 0 24px rgba(45, 212, 191, 0.25)',
        'glow-purple':  '0 0 24px rgba(167, 139, 250, 0.25)',
      },

      animation: {
        'fade-in':        'fadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up':       'slideUp 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer':        'shimmer 1.5s infinite linear',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'ring-fill':      'ring-fill 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'toast-progress': 'toast-progress linear forwards',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition:  '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(167, 139, 250, 0.25)' },
          '50%':       { boxShadow: '0 0 24px rgba(167, 139, 250, 0.4)' },
        },
        'ring-fill': {
          from: { strokeDashoffset: '251' },
          to:   { strokeDashoffset: 'var(--ring-target-offset, 75)' },
        },
        'toast-progress': {
          from: { transform: 'scaleX(1)' },
          to:   { transform: 'scaleX(0)' },
        },
      },

      transitionDuration: {
        fast:   '150ms',
        normal: '200ms',
        slow:   '300ms',
      },

      transitionTimingFunction: {
        'ease-out':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      spacing: {
        'sidebar':  'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed)',
      },
    },
  },
  plugins: [],
}

export default config
