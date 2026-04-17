/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wa-bg': '#111b21',
        'wa-panel': '#202c33',
        'wa-green': '#00a884',
        'wa-incoming': '#202c33',
        'wa-outgoing': '#005c4b',
        'wa-text': '#e9edef',
        'wa-secondary': '#8696a0',
        'wa-chat-bg': '#0b141a',
        'wa-border': '#222d34'
      }
    },
  },
  plugins: [],
}