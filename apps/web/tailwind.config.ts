import type { Config } from 'tailwindcss';

// Color tokens point at the Aurum CSS variables defined in app/globals.css,
// so every page that uses bg-bg-base / text-ink-primary / text-accent / etc.
// repaints automatically when the user toggles Light/Dark on the landing.
// The whole site shares one palette source of truth.
//
// Mapping rationale:
//   bg.base       → --bg            (page background, dark: #07070a, light: #f6f4ee)
//   bg.surface    → --bg-2          (cards, table headers, elevated)
//   bg.elevated   → --bg-2          (alias — same role as surface today)
//   bg.border     → --line-strong   (visible 1px lines)
//   bg.line       → --line          (faint 1px lines)
//   ink.primary   → --ink           (default body text)
//   ink.secondary → --ink-dim       (secondary text)
//   ink.muted     → --ink-mute      (timestamps, labels)
//   ink.dim       → --ink-mute      (alias)
//   accent        → --accent        (gold in dark Aurum, deeper gold in light)
//   signal.pos    → --pos
//   signal.neg    → --neg
//   signal.warn   → --warn
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg)',
          surface: 'var(--bg-2)',
          elevated: 'var(--bg-2)',
          border: 'var(--line-strong)',
          line: 'var(--line)',
        },
        ink: {
          primary: 'var(--ink)',
          secondary: 'var(--ink-dim)',
          muted: 'var(--ink-mute)',
          dim: 'var(--ink-mute)',
        },
        signal: {
          pos: 'var(--pos)',
          neg: 'var(--neg)',
          warn: 'var(--warn)',
          info: 'var(--accent)',
        },
        accent: { DEFAULT: 'var(--accent)' },
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
