/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Tenor Sans"', 'sans-serif'],
        body: ['"Libre Franklin"', 'sans-serif'],
      },
      colors: {
        gold: {
          light: '#d3bc97',
          DEFAULT: '#cbb592',
          dark: '#8C7149',
        },
        'luxury-stone': '#ECE8E1',
        'luxury-chalk': '#F4F2EE',
      },
    },
  },
  plugins: [],
};