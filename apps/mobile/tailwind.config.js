/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F7F4EE",
        surface: "#FFFFFF",
        primary: "#2F3A32",
        secondary: "#8A6A4A",
        accent: "#C96F4A",
        text: "#20221F",
        muted: "#74766F",
      },
    },
  },
  plugins: [],
};
