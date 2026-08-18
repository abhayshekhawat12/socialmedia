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
          primary: '#00B7FF',
          secondary: '#36C4FF',
          bg: '#F5F7FA',
          text: '#1E293B',
          card: '#FFFFFF',
          border: '#E5E7EB',
        },
      },
      borderRadius: {
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',
      },
      boxShadow: {
        'aura': '0 20px 40px -15px rgba(0, 183, 255, 0.15)',
        'container': '0 25px 60px -15px rgba(15, 23, 42, 0.12)',
        'nav': '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
