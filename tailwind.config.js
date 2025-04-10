/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        'price-up': 'rgba(22, 163, 74, 0.1)', // Light green for price increases
        'price-down': 'rgba(220, 38, 38, 0.1)', // Light red for price decreases
        'background': '#000000', // Black background
        'text': '#ffffff', // White text
      },
      keyframes: {
        'price-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '25%': { transform: 'translateY(-8px)', opacity: '0.8', backgroundColor: 'rgba(22, 163, 74, 0.1)' },
          '50%': { transform: 'translateY(0)', opacity: '1' },
          '75%': { backgroundColor: 'rgba(22, 163, 74, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'price-down': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '25%': { transform: 'translateY(8px)', opacity: '0.8', backgroundColor: 'rgba(220, 38, 38, 0.1)' },
          '50%': { transform: 'translateY(0)', opacity: '1' },
          '75%': { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'pulse-green': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(22, 163, 74, 0.1)' },
        },
        'pulse-red': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
        },
      },
      animation: {
        'price-up': 'price-up 1s ease-in-out',
        'price-down': 'price-down 1s ease-in-out',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
      },
      transitionProperty: {
        'price': 'transform, opacity, background-color',
      },
      transitionDuration: {
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'price-bounce': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [],
}
