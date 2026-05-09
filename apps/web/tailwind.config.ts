import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0b',
          surface: '#111114',
          elevated: '#16161a',
          border: '#26262d',
        },
        ink: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
          dim: '#52525b',
        },
        signal: {
          pos: '#4ade80',
          neg: '#f87171',
          warn: '#fbbf24',
          info: '#60a5fa',
        },
        accent: { DEFAULT: '#fde68a' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Instrument Serif', 'ui-serif', 'Georgia'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
export default config;
