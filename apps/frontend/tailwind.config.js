/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Courier New"', "Courier", "monospace"],
        body: ["system-ui", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000",
        brutalLg: "6px 6px 0px 0px #000",
      },
      colors: {
        yellow: {
          50: "#fffde7",
          100: "#fff9c4",
          200: "#fff59d",
          300: "#fff176",
          400: "#ffee58",
          500: "#ffeb3b",
          600: "#fdd835",
          700: "#fbc02d",
          800: "#f9a825",
          900: "#f57f17",
        },
      },
    },
  },
  plugins: [],
};
