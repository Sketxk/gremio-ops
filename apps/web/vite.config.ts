import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // En desarrollo, /api va al Worker publicado (el navegador nunca llama al Data Project).
    proxy: { '/api': { target: 'https://gremio-ops.gremio-api.workers.dev', changeOrigin: true } },
  },
});
