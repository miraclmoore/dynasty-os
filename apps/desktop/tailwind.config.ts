import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../packages/ui-components/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        heading: ['Oswald', 'system-ui', 'sans-serif'],
      },
      colors: {
        sport: {
          primary: 'rgb(var(--sport-primary) / <alpha-value>)',
          accent:  'rgb(var(--sport-accent)  / <alpha-value>)',
        },
      },
      boxShadow: {
        'sport-glow': '0 4px 24px 0 rgb(var(--sport-primary) / 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
