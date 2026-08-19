/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        aura: {
          cyan: "#00B7FF",
          sky: "#38BDF8",
          teal: "#7EDBE8",
          pink: "#F45AA8",
          purple: "#9B6CFF",
          violet: "#8B5CF6",
          dark: "#0b101b",
          cardDark: "rgba(15, 23, 42, 0.72)",
          glassLight: "rgba(255, 255, 255, 0.65)",
          glassBorder: "rgba(255, 255, 255, 0.75)",
        },
        primary: "#00B7FF",
        accent: "#F45AA8",
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'glass': '0 20px 50px -12px rgba(0, 183, 255, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.04)',
        'glass-hover': '0 25px 60px -10px rgba(0, 183, 255, 0.22), 0 8px 24px -4px rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 20px 50px -12px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.3)',
        'glow-cyan': '0 0 25px -4px rgba(0, 183, 255, 0.45)',
        'glow-pink': '0 0 25px -4px rgba(244, 90, 168, 0.45)',
        'glow-purple': '0 0 25px -4px rgba(155, 108, 255, 0.45)',
        'subtle': '0 8px 24px -6px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'heart-pop': 'heartPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'float-slow': 'floatSlow 14s infinite ease-in-out',
        'float-reverse': 'floatReverse 16s infinite ease-in-out',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0.8' },
          '45%': { transform: 'scale(1.35)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(25px, 20px) scale(1.08)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-20px, -25px) scale(1.06)' },
        },
      },
    },
  },
  plugins: [],
};
