/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- Wajib untuk toggle mode gelap/terang manual
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wa-bg': 'var(--wa-bg)',
        'wa-panel': 'var(--wa-panel)',
        'wa-green': 'var(--wa-green)',
        'wa-incoming': 'var(--wa-incoming)',
        'wa-outgoing': 'var(--wa-outgoing)',
        'wa-text': 'var(--wa-text)',
        'wa-secondary': 'var(--wa-secondary)',
        'wa-chat-bg': 'var(--wa-chat-bg)',
        'wa-border': 'var(--wa-border)',
        'wa-input-bg': 'var(--wa-input-bg)',
        'wa-input-focus': 'var(--wa-input-focus)',
        'wa-quoted-bg': 'var(--wa-quoted-bg)',
        'wa-hover': 'var(--wa-hover)'
      }
    },
  },
  plugins: [],
}