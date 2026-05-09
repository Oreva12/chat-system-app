/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your existing colour palette as Tailwind tokens
        dark:    "#0D0F14",
        card:    "#141720",
        card2:   "#111318",
        border:  "#1E2130",
        muted:   "#6B7280",
        light:   "#C4C9D8",
        white:   "#E8EAF0",
        teal:    "#00C896",
        blue:    "#4F8EF7",
        amber:   "#F7A24F",
        pink:    "#E05C8A",
        input:   "#1E2130",
        darker:  "#0A0C10",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        bounce:  "bounce 1.2s ease-in-out infinite",
        pulse:   "pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};