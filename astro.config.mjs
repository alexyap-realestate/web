import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.xlsx'],
    server: {
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  },
});