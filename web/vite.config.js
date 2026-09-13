import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, o Vite faz proxy para o backend — assim o frontend usa URLs
// relativas (mesma origem) e funciona de qualquer dispositivo na LAN
// (localhost OU IP da máquina) sem depender de CORS.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3333';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/brand': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/brand': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
  define: {
    // Se VITE_API_URL não for definida no shell, compila como string vazia:
    // os fetches viram relativos (/api/..., /brand/..., /uploads/...) e o
    // proxy acima resolve. Em produção o backend serve o dist na mesma origem.
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '')
  }
});