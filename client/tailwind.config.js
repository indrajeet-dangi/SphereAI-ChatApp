/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 10px 30px rgba(18, 69, 89, 0.2)",
      },
    },
  },
  plugins: [],
};
