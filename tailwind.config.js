/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  important: '#root',   // ensures Tailwind overrides MUI Emotion styles
  theme: { extend: {} },
  plugins: [],
};
