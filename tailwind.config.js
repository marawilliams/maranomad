/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        secondaryBrown: "#8A8475",
      },
      fontFamily: {
        'nightly': ['nightly', 'sans-serif'],
        'eskool':['eskool', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: ["@tailwindcss/forms"],
};
