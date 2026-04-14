import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maple: {
          bg:        '#0C0E14',
          card:      '#13161F',
          cardHover: '#191D28',
          accent:    '#1A1E2A',
          border:    'rgba(255,255,255,0.06)',
          orange:    '#E8913A',
          orangeDim: 'rgba(232,145,58,0.15)',
          green:     '#5AC47E',
          greenDim:  'rgba(90,196,126,0.12)',
          blue:      '#5A9DE8',
          red:       '#E85A5A',
          purple:    '#9C7AE8',
          text:      '#E8E6E1',
          muted:     '#8B8A85',
          faint:     '#5C5B57',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
        serif: ['Instrument Serif', 'ui-serif', 'Georgia'],
      }
    }
  },
  plugins: []
} satisfies Config
