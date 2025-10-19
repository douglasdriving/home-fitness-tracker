/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        background: {
          DEFAULT: '#1a0b2e', // Deep purple background
          light: '#271447',   // Lighter purple for cards
          lighter: '#3d2563', // Even lighter for hover states
        },
        primary: {
          DEFAULT: '#a78bfa', // Bright purple
          dark: '#8b5cf6',    // Deeper purple
          light: '#c4b5fd',   // Lighter purple
        },
        secondary: {
          DEFAULT: '#fbbf24', // Bright amber/gold
          dark: '#f59e0b',
          light: '#fcd34d',
        },
        accent: {
          DEFAULT: '#34d399', // Bright emerald green for contrast
          dark: '#10b981',
          light: '#6ee7b7',
        },
        text: {
          DEFAULT: '#f3f4f6',  // Light gray text
          muted: '#9ca3af',    // Muted gray
          bright: '#ffffff',   // Pure white
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        confetti: 'confetti 3s ease-in-out forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
