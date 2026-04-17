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
        tarkov: {
          bg: '#0a0a0a',
          surface: '#141414',
          card: '#1e1e1e',
          border: '#2e2e2e',
          yellow: '#c8a96e',
          'yellow-dark': '#9d7c3d',
          'yellow-light': '#e8c98e',
          text: '#d4c9b8',
          muted: '#7a7265',
          green: '#4a8c5c',
          'green-dark': '#2d5438',
          red: '#8c4a4a',
          'red-dark': '#5c2d2d',
          blue: '#4a6a8c',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
