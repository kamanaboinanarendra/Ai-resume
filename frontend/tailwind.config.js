/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D62828',
          dark: '#A61B1B',
          light: '#FFF7F7',
          main: '#222222',
          secondary: '#6B7280',
          border: '#E5E7EB',
          success: '#15803D',
          error: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
