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
          bg: '#E8FAFC',
          softCyan: '#CDEFF4',
          primary: '#7EDBE8',
          cyan: '#00B7FF',
          pink: '#F45AA8',
          purple: '#9B6CFF',
          orange: '#FF8A5B',
          text: '#101820',
          textMuted: 'rgba(16, 24, 32, 0.58)',
          glass: 'rgba(255, 255, 255, 0.38)',
          glassStrong: 'rgba(255, 255, 255, 0.60)',
          glassBorder: 'rgba(255, 255, 255, 0.65)',
        },
      },
      borderRadius: {
        '2.5xl': '1.375rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        'glass': '0 20px 45px -15px rgba(0, 183, 255, 0.12), 0 8px 20px -6px rgba(0, 0, 0, 0.04)',
        'glass-strong': '0 25px 50px -12px rgba(126, 219, 232, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.6)',
        'glass-glow': '0 0 35px rgba(126, 219, 232, 0.35)',
        'floating': '0 20px 40px -10px rgba(16, 24, 32, 0.08), 0 1px 3px rgba(255, 255, 255, 0.8) inset',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '24px',
        'glass-strong': '36px',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-reverse': 'floatReverse 10s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 4s ease-in-out infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
        'heart-bounce': 'heartBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-12px) scale(1.03)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(12px) scale(0.97)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.75' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        heartBounce: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
