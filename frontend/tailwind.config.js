/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F3A",
        risk: {
          low: "#1E9E6A",
          mid: "#D98A1E",
          high: "#D6483C",
        },
      },
    },
  },
  plugins: [],
};