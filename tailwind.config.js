/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#000000',
        'secondary': '#6b7280',
        'background': '#ffffff',
        'foreground': '#000000',
      },
    },
  },
}