/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gs: {
          bg: '#e8edf2',
          panel: '#f7f9fb',
          elevated: '#ffffff',
          inset: '#eef2f6',
          border: '#c9d4df',
          'border-soft': '#dce4ec',
          text: '#1a2332',
          muted: '#5c6b7a',
          faint: '#8a9aab',
          accent: '#0d7a6f',
          'accent-hover': '#0a635a',
          'accent-soft': '#d6f0ec',
          pass: '#1b7f4a',
          'pass-bg': '#e6f6ec',
          fail: '#b42318',
          'fail-bg': '#fdeceb',
          skip: '#8a6d1d',
          'skip-bg': '#faf3d9',
          running: '#1d6fb8',
          'running-bg': '#e6f1fb'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        gs: '0 1px 2px rgb(26 35 50 / 6%), 0 8px 24px rgb(26 35 50 / 6%)'
      },
      borderRadius: {
        gs: '10px'
      }
    }
  },
  plugins: []
}
