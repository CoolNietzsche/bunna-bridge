/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        espresso:   "#1A0F07",
        mahogany:   "#4A2515",
        terracotta: "#C1440E",
        amber:      "#D4824A",
        gold:       "#C9952A",
        forest:     "#1E3A2F",
        sage:       "#4A7C59",
        mist:       "#A8C5A0",
        cream:      "#F5EDD8",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        mono:    ["DM Mono", "monospace"],
        body:    ["Instrument Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
}
